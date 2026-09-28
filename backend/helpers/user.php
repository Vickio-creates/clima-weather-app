<?php

declare(strict_types=1);

// Convert a JSON value from the database into a PHP array.
// This is used for saved profile preference groups such as activities and weather focus.
// If the value is empty, missing, or invalid, an empty array is returned.
function decodePreferenceList(?string $value): array
{
    // Return an empty array when there is no saved JSON value.
    if ($value === null || $value === '') {
        return [];
    }

    // Decode the JSON text from the database into a PHP array.
    $decoded = json_decode($value, true);

    // If decoding fails or the result is not an array, return an empty array.
    if (!is_array($decoded)) {
        return [];
    }

    // Return the decoded preference list.
    return $decoded;
}


// Fetch all important user data needed by the frontend after login.
// This includes account details, profile information, notification settings,
// privacy settings, and saved preference groups.
function fetchUserPayload(PDO $pdo, int $userId): ?array
{
    // Prepare a query that gets data from the main users table,
    // user profile table, and user preferences table.
    $stmt = $pdo->prepare(
        'SELECT
        u.id,
        u.full_name,
        u.email,
        u.created_at,
        p.default_location,
        p.main_activity,
        p.bio,
        p.personal_tags,
        pr.unit_system,
        pr.theme,
        pr.notify_email,
        pr.notify_push,
        pr.notify_weather_alerts,
        pr.notify_severe,
        pr.notify_rain,
        pr.notify_air_quality,
        pr.notify_daily_summary,
        pr.notify_activity_reminders,
        pr.notify_clothing_recommendations,
        pr.notify_general_updates,
        pr.quiet_hours_from,
        pr.quiet_hours_to,
        pr.privacy_location,
        pr.profile_personalization,
        pr.activity_history,
        pr.activities,
        pr.weather_focus,
        pr.clothing_style,
        pr.assistant_tone
    FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
    LEFT JOIN user_preferences pr ON pr.user_id = u.id
    WHERE u.id = ?
    LIMIT 1'
    );

    // Execute the query for the currently logged-in user.
    $stmt->execute([$userId]);

    // Fetch one user record from the database.
    $row = $stmt->fetch();

    // If no user is found, return null.
    if (!$row) {
        return null;
    }

    // Return a clean user payload that can be safely sent to JavaScript as JSON.
    return [
        // Basic account information.
        'id' => (int) $row['id'],
        'name' => $row['full_name'],
        'email' => $row['email'],

        // Profile information.
        // Default values are used when the database fields are empty.
        'location' => $row['default_location'] ?: 'Klaipėda, Lithuania',
        'activity' => $row['main_activity'] ?: 'Walking',
        'bio' => $row['bio'] ?? '',
        'personalTags' => decodePreferenceList($row['personal_tags'] ?? null),

        // User display and measurement preferences.
        'units' => $row['unit_system'] ?: 'Metric',
        'theme' => $row['theme'] ?: 'light',

        // Notification settings.
        'notifications' => [
            // Existing settings retained for other parts of the app.
            'severe' => (bool) ($row['notify_severe'] ?? true),
            'rain' => (bool) ($row['notify_rain'] ?? true),
            'airQuality' => (bool) ($row['notify_air_quality'] ?? true),
            'dailySummary' => (bool) ($row['notify_daily_summary'] ?? false),

            // Settings used by the Notification tab.
            'channels' => [
                'email' => (bool) ($row['notify_email'] ?? true),
                'push' => (bool) ($row['notify_push'] ?? false),
            ],
            'types' => [
                'weatherAlerts' => (bool) ($row['notify_weather_alerts'] ?? true),
                'dailySummary' => (bool) ($row['notify_daily_summary'] ?? true),
                'activityReminders' => (bool) ($row['notify_activity_reminders'] ?? true),
                'clothingRecommendations' => (bool) ($row['notify_clothing_recommendations'] ?? true),
                'generalUpdates' => (bool) ($row['notify_general_updates'] ?? false),
            ],
            'quietHours' => [
                'from' => substr((string) ($row['quiet_hours_from'] ?: '22:00:00'), 0, 5),
                'to' => substr((string) ($row['quiet_hours_to'] ?: '07:00:00'), 0, 5),
            ],
        ],

        // Privacy and personalization settings.
        'privacy' => [
            'location' => $row['privacy_location'] ?: 'While using the app',
            'profilePersonalization' => (bool) ($row['profile_personalization'] ?? true),
            'activityHistory' => (bool) ($row['activity_history'] ?? true),
        ],

        // Saved preference groups used by the Profile page and later by the recommendation system.
        // These values are stored in the database as JSON, so they are decoded into PHP arrays.
        'preferences' => [
            'activities' => decodePreferenceList($row['activities'] ?? null),
            'weatherFocus' => decodePreferenceList($row['weather_focus'] ?? null),
            'clothingStyle' => decodePreferenceList($row['clothing_style'] ?? null),
            'assistantTone' => decodePreferenceList($row['assistant_tone'] ?? null),
        ],

        // Account creation date.
        'createdAt' => $row['created_at'],
    ];
}
