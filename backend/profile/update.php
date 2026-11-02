<?php

declare(strict_types=1);

// Load helper files.
// response.php contains functions for JSON responses and request handling.
// user.php contains user session helpers and fetchUserPayload().
// dbconnection.php contains getPDO(), which connects to the database.
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/user.php';
require_once __DIR__ . '/../config/dbconnection.php';

try {
    // Allow only POST requests for profile updates.
    requirePost();

    // Get the logged-in user's ID from the session.
    $userId = requireLoggedInUserId();

    // Read the JSON data sent from JavaScript.
    $data = readJsonBody();

    // Read and clean basic account/profile data.
    $name = trim((string) ($data['name'] ?? ''));
    $email = strtolower(trim((string) ($data['email'] ?? '')));
    $location = trim((string) ($data['location'] ?? 'Klaipėda, Lithuania'));
    $activity = trim((string) ($data['activity'] ?? 'Walking'));

    // Read and clean the new About You fields.
    $bio = trim((string) ($data['bio'] ?? ''));
    $personalTags = $data['personalTags'] ?? [];

    // Read user preference values.
    // These are kept here because this update file also supports profile settings.
    $units = trim((string) ($data['units'] ?? 'Metric'));
    $theme = trim((string) ($data['theme'] ?? 'light'));

    // Read notification and privacy settings.
    $notifications = $data['notifications'] ?? [];
    $privacy = $data['privacy'] ?? [];

    // Validate full name.
    if (mb_strlen($name) < 2) {
        jsonResponse(['error' => 'Please enter your full name.'], 422);
    }

    // Validate email format.
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['error' => 'Please enter a valid email address.'], 422);
    }

    // Accept only the personal tags offered by the Edit Personal Info form.
    $allowedPersonalTags = [
        'Student',
        'Morning Person',
        'Outdoor Activities',
        'Walking',
        'Photography',
    ];

    if (!is_array($personalTags) || !array_is_list($personalTags)) {
        jsonResponse(['error' => 'Personal tags must be a list.'], 422);
    }

    foreach ($personalTags as $tag) {
        if (!is_string($tag) || !in_array($tag, $allowedPersonalTags, true)) {
            jsonResponse(['error' => 'One or more personal tags are not supported.'], 422);
        }
    }

    // Convert personal tags to JSON before saving them in MySQL.
    $personalTagsJson = json_encode($personalTags, JSON_UNESCAPED_UNICODE);

    if ($personalTagsJson === false) {
        jsonResponse(['error' => 'Could not save personal tags.'], 500);
    }

    // Connect to the database.
    $pdo = getPDO();

    // Check if another user already uses the submitted email.
    $check = $pdo->prepare(
        'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1'
    );

    $check->execute([$email, $userId]);

    if ($check->fetch()) {
        jsonResponse(['error' => 'This email is already used by another account.'], 409);
    }

    // Start a transaction because we are updating more than one table.
    // If one update fails, all updates will be rolled back.
    $pdo->beginTransaction();

    // Update the main users table.
    $updateUser = $pdo->prepare(
        'UPDATE users
         SET full_name = ?, email = ?, updated_at = NOW()
         WHERE id = ?'
    );

    $updateUser->execute([
        $name,
        $email,
        $userId,
    ]);

    // Update the user profile table.
    // This includes the new About You fields: bio and personal_tags.
    $updateProfile = $pdo->prepare(
        'UPDATE user_profiles
         SET default_location = ?, main_activity = ?, bio = ?, personal_tags = ?
         WHERE user_id = ?'
    );

    $updateProfile->execute([
        $location,
        $activity,
        $bio,
        $personalTagsJson,
        $userId,
    ]);

    // Update user preferences, notification settings, and privacy settings.
    $updatePreferences = $pdo->prepare(
        'UPDATE user_preferences
         SET unit_system = ?,
             theme = ?,
             notify_severe = ?,
             notify_rain = ?,
             notify_air_quality = ?,
             notify_daily_summary = ?,
             privacy_location = ?,
             profile_personalization = ?,
             activity_history = ?,
             updated_at = NOW()
         WHERE user_id = ?'
    );

    $updatePreferences->execute([
        $units ?: 'Metric',
        $theme ?: 'light',
        !empty($notifications['severe']) ? 1 : 0,
        !empty($notifications['rain']) ? 1 : 0,
        !empty($notifications['airQuality']) ? 1 : 0,
        !empty($notifications['dailySummary']) ? 1 : 0,
        (string) ($privacy['location'] ?? 'While using the app'),
        array_key_exists('profilePersonalization', $privacy)
            ? (!empty($privacy['profilePersonalization']) ? 1 : 0)
            : 1,
        array_key_exists('activityHistory', $privacy)
            ? (!empty($privacy['activityHistory']) ? 1 : 0)
            : 1,
        $userId,
    ]);

    // Save all database changes.
    $pdo->commit();

    // Return the updated user data to JavaScript.
    jsonResponse([
        'message' => 'Profile updated successfully.',
        'user' => fetchUserPayload($pdo, $userId),
    ]);

} catch (Throwable $error) {
    // If an error happens during the transaction, undo the database changes.
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    // Return the error as JSON.
    jsonResponse(['error' => $error->getMessage()], 500);
}
