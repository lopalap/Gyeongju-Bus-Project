-- 1. 기존 DB 삭제 및 새로 생성
DROP DATABASE IF EXISTS gyeongju_bus_db;
CREATE DATABASE gyeongju_bus_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gyeongju_bus_db;

-- 2. 사용자 테이블 (로그인용)
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. [중요] 경주 전체 정류장 마스터 테이블
CREATE TABLE All_Gyeongju_Stations (
    station_id VARCHAR(50) PRIMARY KEY,
    station_name VARCHAR(100) NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    short_id VARCHAR(20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 즐겨찾는 정류장 테이블
CREATE TABLE Favorite_Stations (
    fav_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    station_id VARCHAR(50) NOT NULL,
    station_name VARCHAR(100) NOT NULL,
    latitude DOUBLE,
    longitude DOUBLE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. 테스트 유저 생성
INSERT INTO Users (user_id, email, password, nickname) 
VALUES (1, 'test@naver.com', '1234', '테스트유저');



-- 1. 테이블 비우기
TRUNCATE TABLE All_Gyeongju_Stations;

-- 2. 데이터 밀어넣기 (쉼표와 골뱅이 개수를 정확히 맞췄습니다)
LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/gj_bus.csv'
INTO TABLE All_Gyeongju_Stations
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 ROWS
(station_id, station_name, latitude, longitude, @d1, @d2, @d3, @d4, @d5);

SELECT COUNT(*) FROM All_Gyeongju_Stations;