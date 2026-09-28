CREATE TABLE IF NOT EXISTS login_attempt_limits (
    account_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    window_started_at DATETIME NOT NULL,
    locked_until DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
