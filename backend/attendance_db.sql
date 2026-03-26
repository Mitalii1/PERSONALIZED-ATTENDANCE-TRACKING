CREATE TABLE IF NOT EXISTS timetable_schedule (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  subject_id  INT NOT NULL,
  day_of_week VARCHAR(20) NOT NULL,
  time_slot   VARCHAR(50) NOT NULL,
  FOREIGN KEY (user_id)    REFERENCES users(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);