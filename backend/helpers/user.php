<?php

declare(strict_types=1);

function fetchUserPayload(PDO $pdo, int $userId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT
            u.id,
            u.full_name,
            u.email,
            u.created_at,
            p.default_location,
            p.main_activity,
            p.health_sensitivity,
            pr.unit_system,
            pr.theme,
            pr.notify_severe,
            pr.notify_rain,
            pr.notify_air_quality,
            pr.notify_daily_summary,
            pr.privacy_location,
            pr.profile_personalization,
            pr.activity_history
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        LEFT JOIN user_preferences pr ON pr.user_id = u.id
        WHERE u.id = ?
        LIMIT 1'
    );
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    if (!$row) {
        return null;
    }

    return [
        'id' => (int) $row['id'],
        'name' => $row['full_name'],
        'email' => $row['email'],
        'location' => $row['default_location'] ?: 'Klaipėda, Lithuania',
        'activity' => $row['main_activity'] ?: 'Walking',
        'healthSensitivity' => $row['health_sensitivity'] ?: 'None selected',
        'units' => $row['unit_system'] ?: 'Metric',
        'theme' => $row['theme'] ?: 'light',
        'notifications' => [
            'severe' => (bool) $row['notify_severe'],
            'rain' => (bool) $row['notify_rain'],
            'airQuality' => (bool) $row['notify_air_quality'],
            'dailySummary' => (bool) $row['notify_daily_summary'],
        ],
        'privacy' => [
            'location' => $row['privacy_location'] ?: 'While using the app',
            'profilePersonalization' => (bool) $row['profile_personalization'],
            'activityHistory' => (bool) $row['activity_history'],
        ],
        'createdAt' => $row['created_at'],
    ];
}