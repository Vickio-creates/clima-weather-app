<?php

declare(strict_types=1);

// Load helper functions for JSON responses, user session checks, and database connection.
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/user.php';
require_once __DIR__ . '/../config/dbconnection.php';

try {
    // Allow only POST requests for saving preferences.
    requirePost();

    // Get the ID of the currently logged-in user.
    $userId = requireLoggedInUserId();

    // Read the JSON data sent from profile.js.
    $data = readJsonBody();

    // Get preference groups from the request body.
    // If a group is missing, use an empty array as the default value.
    $activities = $data['activities'] ?? [];
    $weatherFocus = $data['weatherFocus'] ?? [];
    $clothingStyle = $data['clothingStyle'] ?? [];
    $assistantTone = $data['assistantTone'] ?? [];

    // Make sure each preference group is an array before saving.
    // This protects the backend if wrong data is sent from the frontend.
    if (!is_array($activities)) {
        $activities = [];
    }

    if (!is_array($weatherFocus)) {
        $weatherFocus = [];
    }

    if (!is_array($clothingStyle)) {
        $clothingStyle = [];
    }

    if (!is_array($assistantTone)) {
        $assistantTone = [];
    }

    // Convert PHP arrays into JSON text so they can be stored in MySQL.
    $activitiesJson = json_encode($activities, JSON_UNESCAPED_UNICODE);
    $weatherFocusJson = json_encode($weatherFocus, JSON_UNESCAPED_UNICODE);
    $clothingStyleJson = json_encode($clothingStyle, JSON_UNESCAPED_UNICODE);
    $assistantToneJson = json_encode($assistantTone, JSON_UNESCAPED_UNICODE);

    // Open the database connection.
    $pdo = getPDO();

    // Prepare the SQL update for the logged-in user's preferences.
    // profile_personalization is enabled when the user saves preferences.
    $stmt = $pdo->prepare(
        'UPDATE user_preferences
        SET activities = ?,
            weather_focus = ?,
            clothing_style = ?,
            assistant_tone = ?,
            profile_personalization = 1,
            updated_at = NOW()
        WHERE user_id = ?'
    );

    // Execute the update using the JSON values and current user ID.
    $stmt->execute([
        $activitiesJson,
        $weatherFocusJson,
        $clothingStyleJson,
        $assistantToneJson,
        $userId
    ]);

    // Send a success response back to JavaScript.
    jsonResponse([
        'message' => 'Preferences saved successfully.',
        'preferences' => [
            'activities' => $activities,
            'weatherFocus' => $weatherFocus,
            'clothingStyle' => $clothingStyle,
            'assistantTone' => $assistantTone,
            'profilePersonalization' => true,
        ],
    ]);

} catch (Throwable $error) {
    // If something goes wrong, return the error as JSON.
    jsonResponse(['error' => $error->getMessage()], 500);
}