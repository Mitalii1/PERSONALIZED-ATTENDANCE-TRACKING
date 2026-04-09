-- ─────────────────────────────────────────────────────────────
-- Complete Attendance Tracking Database Schema
-- ─────────────────────────────────────────────────────────────

-- Users Table
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,
  year          INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subjects Table
DROP TABLE IF EXISTS subjects;
CREATE TABLE subjects (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  user_id             INT NOT NULL,
  subject_name        VARCHAR(255) NOT NULL,
  type                ENUM('Theory', 'Practical', 'Both') DEFAULT 'Theory',
  total_classes       INT DEFAULT 0,
  attended_classes    INT DEFAULT 0,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Timetable Schedule Table
DROP TABLE IF EXISTS timetable_schedule;
CREATE TABLE timetable_schedule (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  subject_id  INT NOT NULL,
  day_of_week VARCHAR(20) NOT NULL,
  slot_key    VARCHAR(5)  NOT NULL,
  time_slot   VARCHAR(50) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- Attendance Table
DROP TABLE IF EXISTS attendance;
CREATE TABLE attendance (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  subject_id  INT,
  date        DATE NOT NULL,
  time_slot   VARCHAR(50),
  status      ENUM('Present', 'Absent', 'Leave') DEFAULT 'Absent',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  UNIQUE KEY unique_attendance (user_id, subject_id, date, time_slot)
);