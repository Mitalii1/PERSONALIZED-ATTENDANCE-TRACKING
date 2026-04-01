-- Drop and recreate with slot_key column
DROP TABLE IF EXISTS timetable_schedule;

CREATE TABLE timetable_schedule (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  subject_id  INT NOT NULL,
  day_of_week VARCHAR(20) NOT NULL,
  slot_key    VARCHAR(5)  NOT NULL,
  time_slot   VARCHAR(50) NOT NULL
);