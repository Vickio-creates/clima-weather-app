<?php

declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/user.php';
require_once __DIR__ . '/../config/db.php';

try {
    requirePost();
    $userId = requireLoggedInUserId();
    $data = readJsonBody();

    $name = trim((string) ($data['name'] ?? ''));
    $email = strtolower(trim((string) ($data['email'] ?? '')));
    $location = trim((string) ($data['location'] ?? 'Klaipėda, Lithuania'));
    $activity = trim((string) ($data['activity'] ?? 'Walking'));
    $health = trim((string) ($data['healthSensitivity'] ?? 'None selected'));
    $units = trim((string) ($data['units'] ?? 'Metric'));
    $notifications = $data['notifications'] ?? [];
    $privacy = $data['privacy'] ?? [];

    if (mb_strlen($name) < 2) {
        jsonResponse(['error' => 'Please enter your full name.'], 422);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['error' => 'Please enter a valid email address.'], 422);
    }

    $pdo = getPDO();

    $check = $pdo->prepare('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1');
    $check->execute([$email, $userId]);
    if ($check->fetch()) {
        jsonResponse(['error' => 'This email is already used by another account.'], 409);
    }

    $pdo->beginTransaction();

    $pdo->prepare('UPDATE users SET full_name = ?, email = ?, updated_at = NOW() WHERE id = ?')
        ->execute([$name, $email, $userId]);

    $pdo->prepare('UPDATE user_profiles SET default_location = ?, main_activity = ?, health_sensitivity = ?, updated_at = NOW() WHERE user_id = ?')
        ->execute([$location ?: 'Klaipėda, Lithuania', $activity ?: 'Walking', $health ?: 'None selected', $userId]);

    $pdo->prepare(
        'UPDATE user_preferences
        SET unit_system = ?,
            notify_severe = ?,
            notify_rain = ?,
            notify_air_quality = ?,
            notify_daily_summary = ?,
            privacy_location = ?,
            profile_personalization = ?,
            activity_history = ?,
            updated_at = NOW()
        WHERE user_id = ?'
    )->execute([
        $units ?: 'Metric',
        !empty($notifications['severe']) ? 1 : 0,
        !empty($notifications['rain']) ? 1 : 0,
        !empty($notifications['airQuality']) ? 1 : 0,
        !empty($notifications['dailySummary']) ? 1 : 0,
        (string) ($privacy['location'] ?? 'While using the app'),
        array_key_exists('profilePersonalization', $privacy) ? (!empty($privacy['profilePersonalization']) ? 1 : 0) : 1,
        array_key_exists('activityHistory', $privacy) ? (!empty($privacy['activityHistory']) ? 1 : 0) : 1,
        $userId,
    ]);

    $pdo->commit();

    jsonResponse([
        'message' => 'Profile updated successfully.',
        'user' => fetchUserPayload($pdo, $userId),
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(['error' => $error->getMessage()], 500);
}