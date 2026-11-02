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

    $allowedGroups = ['channels', 'types', 'quietHours', 'weatherAlertTypes'];
    $unexpectedGroups = array_diff(array_keys($data), $allowedGroups);

    if ($unexpectedGroups || !$data) {
        jsonResponse(['error' => 'Send supported notification settings to save.'], 422);
    }

    $changes = [];
    $channelColumns = [
        'email' => 'notify_email',
        'push' => 'notify_push',
    ];
    $typeColumns = [
        'weatherAlerts' => 'notify_weather_alerts',
        'dailySummary' => 'notify_daily_summary',
        'activityReminders' => 'notify_activity_reminders',
        'clothingRecommendations' => 'notify_clothing_recommendations',
        'generalUpdates' => 'notify_general_updates',
    ];

    if (array_key_exists('channels', $data)) {
        if (!is_array($data['channels'])) {
            jsonResponse(['error' => 'Channels must be an object.'], 422);
        }

        if (array_diff(array_keys($data['channels']), array_keys($channelColumns))) {
            jsonResponse(['error' => 'An unsupported notification channel was supplied.'], 422);
        }

        foreach ($channelColumns as $key => $column) {
            if (array_key_exists($key, $data['channels'])) {
                $changes[$column] = (int) notificationBoolean($data['channels'], $key);
            }
        }
    }

    if (array_key_exists('types', $data)) {
        if (!is_array($data['types'])) {
            jsonResponse(['error' => 'Notification types must be an object.'], 422);
        }

        if (array_diff(array_keys($data['types']), array_keys($typeColumns))) {
            jsonResponse(['error' => 'An unsupported notification type was supplied.'], 422);
        }

        foreach ($typeColumns as $key => $column) {
            if (!array_key_exists($key, $data['types'])) {
                continue;
            }

            $enabled = (int) notificationBoolean($data['types'], $key);
            $changes[$column] = $enabled;

            // Keep the legacy severe-alert preference aligned with the master.
            if ($key === 'weatherAlerts') {
                $changes['notify_severe'] = $enabled;
            }
        }
    }

    if (array_key_exists('quietHours', $data)) {
        if (!is_array($data['quietHours'])) {
            jsonResponse(['error' => 'Quiet hours must be an object.'], 422);
        }

        $quietHourColumns = [
            'from' => 'quiet_hours_from',
            'to' => 'quiet_hours_to',
        ];

        if (array_diff(array_keys($data['quietHours']), array_keys($quietHourColumns))) {
            jsonResponse(['error' => 'An unsupported quiet-hours value was supplied.'], 422);
        }

        foreach ($quietHourColumns as $key => $column) {
            if (array_key_exists($key, $data['quietHours'])) {
                $changes[$column] = notificationTime($data['quietHours'], $key);
            }
        }
    }

    if (array_key_exists('weatherAlertTypes', $data)) {
        $allowedAlertTypes = ['heavy_rain', 'strong_wind', 'cold_warning', 'extreme_heat'];
        $alertTypes = $data['weatherAlertTypes'];

        if (!is_array($alertTypes) || !array_is_list($alertTypes)) {
            jsonResponse(['error' => 'Weather alert selections must be a list.'], 422);
        }

        foreach ($alertTypes as $alertType) {
            if (!is_string($alertType) || !in_array($alertType, $allowedAlertTypes, true)) {
                jsonResponse(['error' => 'An unsupported weather alert was selected.'], 422);
            }
        }

        $changes['weather_alert_types'] = json_encode(
            array_values(array_unique($alertTypes)),
            JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
        );
    }

    if (!$changes) {
        jsonResponse(['error' => 'No notification settings were supplied.'], 422);
    }

    $insertColumns = ['user_id'];
    $insertValues = ['?'];
    $updateAssignments = [];
    $parameters = [$userId];

    foreach ($changes as $column => $value) {
        $insertColumns[] = $column;
        $insertValues[] = '?';
        $updateAssignments[] = $column . ' = VALUES(' . $column . ')';
        $parameters[] = $value;
    }

    $updateAssignments[] = 'updated_at = NOW()';
    $pdo = getPDO();
    $statement = $pdo->prepare(
        'INSERT INTO user_preferences (' . implode(', ', $insertColumns) . ')
         VALUES (' . implode(', ', $insertValues) . ')
         ON DUPLICATE KEY UPDATE ' . implode(', ', $updateAssignments)
    );
    $statement->execute($parameters);

    $user = fetchUserPayload($pdo, $userId);

    jsonResponse([
        'success' => true,
        'message' => 'Notification settings saved.',
        'notifications' => $user['notifications'],
    ]);
} catch (Throwable $error) {
    error_log('Could not save notification settings: ' . $error->getMessage());
    jsonResponse(['error' => 'Could not save notification settings. Please try again.'], 500);
}
