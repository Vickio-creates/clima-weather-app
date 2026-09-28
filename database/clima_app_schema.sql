CREATE DATABASE IF NOT EXISTS clima_app
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE clima_app;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_two_factor_auth (
    user_id INT NOT NULL PRIMARY KEY,
    secret_ciphertext VARBINARY(255) NULL,
    pending_secret_ciphertext VARBINARY(255) NULL,
    pending_expires_at DATETIME NULL,
    enabled_at DATETIME NULL,
    last_totp_step BIGINT UNSIGNED NULL,
    failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    window_started_at DATETIME NULL,
    locked_until DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_two_factor_auth_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_two_factor_recovery_codes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_two_factor_recovery_code (user_id, code_hash),
    KEY idx_two_factor_recovery_user_used (user_id, used_at),
    CONSTRAINT fk_two_factor_recovery_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_attempt_limits (
    account_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    window_started_at DATETIME NOT NULL,
    locked_until DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    default_location VARCHAR(120) NOT NULL DEFAULT 'Klaipėda, Lithuania',
    main_activity VARCHAR(80) NOT NULL DEFAULT 'Walking',
    bio TEXT NULL,
    personal_tags JSON NULL,
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
    notify_email TINYINT(1) NOT NULL DEFAULT 1,
    notify_push TINYINT(1) NOT NULL DEFAULT 0,
    notify_weather_alerts TINYINT(1) NOT NULL DEFAULT 1,
    notify_severe TINYINT(1) NOT NULL DEFAULT 1,
    notify_rain TINYINT(1) NOT NULL DEFAULT 1,
    notify_air_quality TINYINT(1) NOT NULL DEFAULT 1,
    notify_daily_summary TINYINT(1) NOT NULL DEFAULT 0,
    notify_activity_reminders TINYINT(1) NOT NULL DEFAULT 1,
    notify_clothing_recommendations TINYINT(1) NOT NULL DEFAULT 1,
    notify_general_updates TINYINT(1) NOT NULL DEFAULT 0,
    quiet_hours_from TIME NOT NULL DEFAULT '22:00:00',
    quiet_hours_to TIME NOT NULL DEFAULT '07:00:00',
    privacy_location VARCHAR(80) NOT NULL DEFAULT 'While using the app',
    profile_personalization TINYINT(1) NOT NULL DEFAULT 1,
    activity_history TINYINT(1) NOT NULL DEFAULT 1,
    activities JSON NULL,
    weather_focus JSON NULL,
    clothing_style JSON NULL, 
    assistant_tone JSON NULL,
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
    assistant_response TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
