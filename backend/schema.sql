-- schema.sql — the full application schema, safe to run repeatedly.
--
-- This replaces "the backend creates `users` automatically and the rest must
-- already exist". A project that cannot be stood up from a single file on a
-- fresh machine is a project nobody else can run.
--
--   mysql -u root -p < backend/schema.sql

CREATE DATABASE IF NOT EXISTS attendance_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE attendance_db;

-- ---------------------------------------------------------------- users
CREATE TABLE IF NOT EXISTS users (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  name                 VARCHAR(120)  NOT NULL,
  email                VARCHAR(190)  NOT NULL,
  password_hash        VARCHAR(255)  NOT NULL,
  batch                ENUM('S1','S2','S3') NOT NULL,
  -- Colleges differ. Do not hard-code 75 in the application.
  threshold_percent    TINYINT UNSIGNED NOT NULL DEFAULT 75,
  term_start           DATE          NULL,
  term_end             DATE          NULL,
  created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- ------------------------------------------------------------- subjects
CREATE TABLE IF NOT EXISTS subjects (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT           NOT NULL,
  code          VARCHAR(24)   NOT NULL,   -- DCCN, AMCS, PROGG ...
  name          VARCHAR(160)  NOT NULL,
  is_practical  BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_subject_per_user (user_id, code),
  CONSTRAINT fk_subjects_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------- timetable_schedule
-- One row per recurring weekly slot. day_of_week follows ISO: 1 = Monday.
CREATE TABLE IF NOT EXISTS timetable_schedule (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  day_of_week  TINYINT UNSIGNED NOT NULL,
  slot         ENUM('s1','s2','s3','a1','a2') NOT NULL,
  subject_id   INT NULL,                  -- NULL = free period
  kind         ENUM('lecture','practical','free') NOT NULL DEFAULT 'lecture',
  UNIQUE KEY uq_slot_per_user (user_id, day_of_week, slot),
  CONSTRAINT ck_day_of_week CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT fk_schedule_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_schedule_subject FOREIGN KEY (subject_id)
    REFERENCES subjects(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------- attendance
-- 'cancelled' and 'holiday' rows exist so a class the lecturer skipped does not
-- count against the student. They are stored, then excluded from "held".
CREATE TABLE IF NOT EXISTS attendance (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT  NOT NULL,
  subject_id  INT  NULL,
  schedule_id INT  NULL,
  class_date  DATE NOT NULL,
  slot        ENUM('s1','s2','s3','a1','a2') NOT NULL,
  status      ENUM('present','absent','cancelled','holiday') NOT NULL,
  note        VARCHAR(255) NULL,
  marked_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
  -- Marking the same slot twice updates instead of duplicating.
  UNIQUE KEY uq_attendance_slot (user_id, class_date, slot),
  KEY ix_attendance_subject (user_id, subject_id, status),
  KEY ix_attendance_date (user_id, class_date),
  CONSTRAINT fk_attendance_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_subject FOREIGN KEY (subject_id)
    REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_schedule FOREIGN KEY (schedule_id)
    REFERENCES timetable_schedule(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------- holidays
-- user_id NULL = applies to everyone (national holidays, college fest).
CREATE TABLE IF NOT EXISTS holidays (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NULL,
  holiday_date DATE NOT NULL,
  reason       VARCHAR(160) NOT NULL,
  UNIQUE KEY uq_holiday (user_id, holiday_date),
  CONSTRAINT fk_holiday_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------- schema_migrations
-- Lets you tell, on any machine, which migrations have run.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    VARCHAR(64) PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO schema_migrations (version) VALUES ('0001_baseline');

-- --------------------------------------------------------------- views
-- Held classes exclude cancellations. Every percentage in the app should read
-- from here so the rule is defined once.
CREATE OR REPLACE VIEW v_subject_totals AS
SELECT
  a.user_id,
  a.subject_id,
  SUM(a.status = 'present')                     AS attended,
  SUM(a.status IN ('present','absent'))         AS held,
  SUM(a.status = 'cancelled')                   AS cancelled
FROM attendance a
GROUP BY a.user_id, a.subject_id;
