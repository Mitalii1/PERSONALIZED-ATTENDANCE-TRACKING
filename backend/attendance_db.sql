CREATE DATABASE attendance_db;

USE attendance_db;

CREATE TABLE users (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100),
 email VARCHAR(255) UNIQUE,
 password VARCHAR(255),
 year INT
);

CREATE TABLE subjects (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT,
 subject_name VARCHAR(100),
 total_classes INT DEFAULT 0,
 attended_classes INT DEFAULT 0
);

CREATE TABLE attendance (
 id INT AUTO_INCREMENT PRIMARY KEY,
 subject_id INT,
 date DATE,
 status ENUM('Present','Absent')
);