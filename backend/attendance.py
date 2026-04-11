# backend/attendance.py

from datetime import date
import calendar
from db import get_connection

# Slot key to time label mapping — matches frontend exactly
SLOT_TIMES = {
    "s1": "8:15-10:15",
    "s2": "10:30-11:30",
    "s3": "11:30-12:30",
    "a1": "1:15-2:15",
    "a2": "2:15-3:15",
}

DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]


def get_timetable_week_with_details(user_id: int) -> list:
    """
    Returns full week with subject details including type and subject_id.
    Format:
    [
      {
        "day": "Monday",
        "s1": { "subject_name": "Java", "type": "Theory", "subject_id": 1, "time_slot": "8:15-10:15" },
        "s2": { ... },
        ...
      }
    ]
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                ts.day_of_week,
                ts.slot_key,
                ts.time_slot,
                s.id AS subject_id,
                s.subject_name,
                s.type
            FROM timetable_schedule ts
            JOIN subjects s ON ts.subject_id = s.id
            WHERE ts.user_id = %s
        """, (user_id,))

        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        # Build week structure with full details
        week = {}
        for day in DAYS_ORDER:
            week[day] = {
                'day':  day,
                's1':   None, 's2': None, 's3': None,
                'a1':   None, 'a2': None
            }

        for row in rows:
            day      = row['day_of_week']
            slot_key = row['slot_key']
            if day in week and slot_key in week[day]:
                week[day][slot_key] = {
                    'subject_name': row['subject_name'],
                    'type':         row['type'],
                    'subject_id':   row['subject_id'],
                    'time_slot':    row['time_slot'],
                    'slot_key':     slot_key,
                }

        return list(week.values())

    except Exception as e:
        raise Exception(f"Error fetching detailed timetable: {str(e)}")


def get_timetable_week(user_id: int) -> list:
    """
    Returns the full week timetable in the exact format the frontend expects:
    [
      { "day": "Monday", "s1": "Java", "s2": "Math", ... },
      ...
    ]
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT 
                ts.day_of_week,
                ts.slot_key,
                s.subject_name
            FROM timetable_schedule ts
            JOIN subjects s ON ts.subject_id = s.id
            WHERE ts.user_id = %s
        """,
            (user_id,),
        )

        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        # Build the week structure
        week = {}
        for day in DAYS_ORDER:
            week[day] = {"day": day, "s1": "", "s2": "", "s3": "", "a1": "", "a2": ""}

        for row in rows:
            day = row["day_of_week"]
            slot_key = row["slot_key"]
            subject = row["subject_name"]
            if day in week and slot_key in week[day]:
                week[day][slot_key] = subject

        return list(week.values())

    except Exception as e:
        raise Exception(f"Error fetching timetable: {str(e)}")


def get_todays_schedule(user_id: int) -> dict:
    """
    Returns only today's row from the timetable.
    """
    today = date.today()
    day_name = calendar.day_name[today.weekday()]

    week = get_timetable_week(user_id)
    for row in week:
        if row["day"] == day_name:
            return {"day": day_name, "date": str(today), "row": row}

    return {"day": day_name, "date": str(today), "row": None}


def mark_attendance(user_id: int, records: list) -> int:
    """
    Saves attendance records.
    records = [
      { "subject_id": 1, "slot_key": "s1", "time_slot": "8:15-10:15", "status": "Present" },
      ...
    ]
    """
    today = date.today()

    try:
        conn = get_connection()
        cursor = conn.cursor()

        saved = 0
        for record in records:
            subject_id = record.get("subject_id")
            slot_key = record.get("slot_key")
            time_slot = record.get("time_slot", SLOT_TIMES.get(slot_key, ""))
            status = record.get("status")

            if not all([subject_id, time_slot, status]):
                continue

            # Check if already marked
            cursor.execute(
                """
                SELECT id FROM attendance
                WHERE user_id = %s 
                AND subject_id = %s 
                AND date = %s 
                AND time_slot = %s
            """,
                (user_id, subject_id, today, time_slot),
            )

            existing = cursor.fetchone()

            if existing:
                # Update
                cursor.execute(
                    """
                    UPDATE attendance 
                    SET status = %s
                    WHERE user_id = %s 
                    AND subject_id = %s 
                    AND date = %s 
                    AND time_slot = %s
                """,
                    (status, user_id, subject_id, today, time_slot),
                )
            else:
                # Insert
                cursor.execute(
                    """
                    INSERT INTO attendance 
                        (user_id, subject_id, date, time_slot, status)
                    VALUES (%s, %s, %s, %s, %s)
                """,
                    (user_id, subject_id, today, time_slot, status),
                )

                # Update totals in subjects table
                cursor.execute(
                    """
                    UPDATE subjects 
                    SET total_classes = total_classes + 1
                    WHERE id = %s AND user_id = %s
                """,
                    (subject_id, user_id),
                )

                if status == "Present":
                    cursor.execute(
                        """
                        UPDATE subjects
                        SET attended_classes = attended_classes + 1
                        WHERE id = %s AND user_id = %s
                    """,
                        (subject_id, user_id),
                    )

            saved += 1

        conn.commit()
        cursor.close()
        conn.close()

        return saved

    except Exception as e:
        raise Exception(f"Error marking attendance: {str(e)}")


def get_attendance_summary(user_id: int) -> list:
    """
    Returns attendance percentage per subject.
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT 
                s.id,
                s.subject_name,
                s.type,
                s.total_classes,
                s.attended_classes,
                CASE 
                    WHEN s.total_classes = 0 THEN 0
                    ELSE ROUND((s.attended_classes / s.total_classes) * 100, 2)
                END AS percentage
            FROM subjects s
            WHERE s.user_id = %s
            ORDER BY s.subject_name
        """,
            (user_id,),
        )

        summary = cursor.fetchall()
        cursor.close()
        conn.close()

        return summary

    except Exception as e:
        raise Exception(f"Error fetching summary: {str(e)}")
