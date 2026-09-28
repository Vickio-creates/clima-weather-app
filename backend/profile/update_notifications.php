<?php

declare(strict_types=1);

// This endpoint saves only the notification controls from profile.html.
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/user.php';
require_once __DIR__ . '/../config/dbconnection.php';

/**
 * Read one required JSON boolean without accepting truthy strings such as "yes".
 * Keeping this strict prevents malformed requests from silently changing settings.
 */
function notificationBoolean(array $settings, string $key): bool
{
    if (!array_key_exists($key, $settings) || !is_bool($settings[$key])) {
        jsonResponse(['error' => "Notification setting '{$key}' must be true or false."], 422);
    }

    return $settings[$key];
}

/**
 * Validate a 24-hour time value such as 22:00 before it is stored as MySQL TIME.
 */
function notificationTime(array $settings, string $key): string
{
    $value = $settings[$key] ?? null;

    if (!is_string($value) || !preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/', $value)) {
        jsonResponse(['error' => "Quiet-hours '{$key}' must use HH:MM format."], 422);
    }

    return $value;
}

try {
    // Accept only authenticated POST requests.
    requirePost();
    $userId = requireLoggedInUserId();
    $data = readJsonBody();

    $channels = $data['channels'] ?? null;
    $types = $data['types'] ?? null;
    $quietHours = $data['quietHours'] ?? null;

    if (!is_array($channels) || !is_array($types) || !is_array($quietHours)) {
        jsonResponse(['error' => 'Channels, types, and quietHours are required.'], 422);
    }

    $emailEnabled = notificationBoolean($channels, 'email');
    $pushEnabled = notificationBoolean($channels, 'push');
    $weatherAlertsEnabled = notificationBoolean($types, 'weatherAlerts');
    $dailySummaryEnabled = notificationBoolean($types, 'dailySummary');
    $activityRemindersEnabled = notificationBoolean($types, 'activityReminders');
    $clothingRecommendationsEnabled = notificationBoolean($types, 'clothingRecommendations');
    $generalUpdatesEnabled = notificationBoolean($types, 'generalUpdates');
    $quietHoursFrom = notificationTime($quietHours, 'from');
    $quietHoursTo = notificationTime($quietHours, 'to');

    $pdo = getPDO();

    // A preference row is created at registration. The UPSERT also repairs an
    // older account that does not have one yet, without trusting a user ID from JS.
    $statement = $pdo->prepare(
        'INSERT INTO user_preferences (
            user_id,
            notify_email,
            notify_push,
            notify_weather_alerts,
            notify_severe,
            notify_daily_summary,
            notify_activity_reminders,
            notify_clothing_recommendations,
            notify_general_updates,
            quiet_hours_from,
            quiet_hours_to
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            notify_email = VALUES(notify_email),
            notify_push = VALUES(notify_push),
            notify_weather_alerts = VALUES(notify_weather_alerts),
            notify_severe = VALUES(notify_severe),
            notify_daily_summary = VALUES(notify_daily_summary),
            notify_activity_reminders = VALUES(notify_activity_reminders),
            notify_clothing_recommendations = VALUES(notify_clothing_recommendations),
            notify_general_updates = VALUES(notify_general_updates),
            quiet_hours_from = VALUES(quiet_hours_from),
            quiet_hours_to = VALUES(quiet_hours_to),
            updated_at = NOW()'
    );

    $statement->execute([
        $userId,
        (int) $emailEnabled,
        (int) $pushEnabled,
        (int) $weatherAlertsEnabled,
        // Keep the existing severe-alert setting in sync with the new UI label.
        (int) $weatherAlertsEnabled,
        (int) $dailySummaryEnabled,
        (int) $activityRemindersEnabled,
        (int) $clothingRecommendationsEnabled,
        (int) $generalUpdatesEnabled,
        $quietHoursFrom,
        $quietHoursTo,
    ]);

    $user = fetchUserPayload($pdo, $userId);

    jsonResponse([
        'message' => 'Notification settings saved.',
        'notifications' => $user['notifications'],
    ]);
} catch (Throwable $error) {
    jsonResponse(['error' => $error->getMessage()], 500);
}