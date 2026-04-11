SELECT 
    ts.day_of_week,
    ts.slot_key,
    ts.time_slot,
    s.subject_name
FROM timetable_schedule ts
JOIN subjects s ON ts.subject_id = s.id
WHERE ts.user_id = 1
ORDER BY ts.day_of_week, ts.slot_key