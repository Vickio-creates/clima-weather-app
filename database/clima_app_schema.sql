CREATE DATABASE IF NOT EXISTS clima_app
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE clima_mvp;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    default_location VARCHAR(120) NOT NULL DEFAULT 'Klaipėda, Lithuania',
    main_activity VARCHAR(80) NOT NULL DEFAULT 'Walking',
    health_sensitivity VARCHAR(120) NOT NULL DEFAULT 'None selected',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    unit_system VARCHAR(20) NOT NULL DEFAULT 'Metric',
    theme VARCHAR(20) NOT NULL DEFAULT 'light',
    notify_severe TINYINT(1) NOT NULL DEFAULT 1,
    notify_rain TINYINT(1) NOT NULL DEFAULT 1,
    notify_air_quality TINYINT(1) NOT NULL DEFAULT 1,
    notify_daily_summary TINYINT(1) NOT NULL DEFAULT 0,
    privacy_location VARCHAR(80) NOT NULL DEFAULT 'While using the app',
    profile_personalization TINYINT(1) NOT NULL DEFAULT 1,
    activity_history TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_preferences_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_prompt TEXT NOT NULL,
    weather_context JSON NULL,
    ai_response TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
