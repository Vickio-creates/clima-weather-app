ALTER TABLE user_preferences
    ADD COLUMN weather_alert_types JSON NULL AFTER notify_weather_alerts,
    ADD COLUMN weather_sensitivities JSON NULL AFTER weather_focus;
