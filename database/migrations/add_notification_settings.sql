--This migration is to adds notification fields.

ALTER TABLE user_preferences
    ADD COLUMN notify_email TINYINT(1) NOT NULL DEFAULT 1 AFTER theme,
    ADD COLUMN notify_push TINYINT(1) NOT NULL DEFAULT 0 AFTER notify_email,
    ADD COLUMN notify_weather_alerts TINYINT(1) NOT NULL DEFAULT 1 AFTER notify_push,
    ADD COLUMN notify_activity_reminders TINYINT(1) NOT NULL DEFAULT 1 AFTER notify_daily_summary,
    ADD COLUMN notify_clothing_recommendations TINYINT(1) NOT NULL DEFAULT 1 AFTER notify_activity_reminders,
    ADD COLUMN notify_general_updates TINYINT(1) NOT NULL DEFAULT 0 AFTER notify_clothing_recommendations,
    ADD COLUMN quiet_hours_from TIME NOT NULL DEFAULT '22:00:00' AFTER notify_general_updates,
    ADD COLUMN quiet_hours_to TIME NOT NULL DEFAULT '07:00:00' AFTER quiet_hours_from;
