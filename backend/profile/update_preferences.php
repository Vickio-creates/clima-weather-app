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

    $preferenceColumns = [
        'activities' => 'activities',
        'weatherFocus' => 'weather_focus',
        'weatherSensitivities' => 'weather_sensitivities',
        'clothingStyle' => 'clothing_style',
        'assistantTone' => 'assistant_tone',
    ];
    $unexpectedKeys = array_diff(
        array_keys($data),
        array_keys($preferenceColumns)
    );

    if ($unexpectedKeys) {
        jsonResponse(['error' => 'Send only supported preference groups.'], 422);
    }

    if (!$data) {
        jsonResponse(['error' => 'Select at least one preference group to save.'], 422);
    }

    $allowedPreferenceValues = [
        'activities' => [
            'Student',
            'Office Worker',
            'Athlete',
            'Construction Worker',
            'Traveler',
            'Outdoor Worker',
        ],
        // Kept for older clients and previously saved recommendation behavior.
        'weatherFocus' => [
            'Sensitive to Cold',
            'Sensitive to Heat',
            'Rain Alerts',
            'Strong Wind Alerts',
            'Air Quality Alerts',
        ],
        'weatherSensitivities' => [
            'Sensitive to Cold',
            'Sensitive to Heat',
            'Sensitive to Rain',
            'Sensitive to Wind',
            'Sensitive to Snow',
            'Sensitive to Pollen',
            'Sensitive to Poor Air Quality',
        ],
        'clothingStyle' => [
            'Light Clothing',
            'Warm Clothing',
            'Waterproof',
            'Casual',
            'Formal',
        ],
        'assistantTone' => [
            'Concise Responses',
            'Detailed Responses',
            'Friendly Tone',
            'Formal Tone',
        ],
    ];
    $preferencesToSave = [];

    foreach ($preferenceColumns as $requestKey => $databaseColumn) {
        if (!array_key_exists($requestKey, $data)) {
            continue;
        }

        if (!is_array($data[$requestKey]) || !array_is_list($data[$requestKey])) {
            jsonResponse(['error' => 'Preference groups must be lists.'], 422);
        }

        $values = array_values($data[$requestKey]);

        if (isset($allowedPreferenceValues[$requestKey])) {
            foreach ($values as $value) {
                if (
                    !is_string($value) ||
                    !in_array($value, $allowedPreferenceValues[$requestKey], true)
                ) {
                    jsonResponse(['error' => "One or more {$requestKey} values are not supported."], 422);
                }
            }

            $values = array_values(array_unique($values));
        }

        $preferencesToSave[$requestKey] = [
            'column' => $databaseColumn,
            'values' => $values,
            'json' => json_encode(
                $values,
                JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
            ),
        ];
    }

    // Build an upsert from a fixed column allowlist. Omitted groups stay unchanged.
    $insertColumns = ['user_id', 'profile_personalization'];
    $insertValues = ['?', '1'];
    $updateAssignments = ['profile_personalization = 1', 'updated_at = NOW()'];
    $parameters = [$userId];

    foreach ($preferencesToSave as $preference) {
        $insertColumns[] = $preference['column'];
        $insertValues[] = '?';
        $column = $preference['column'];
        $updateAssignments[] = $column . ' = VALUES(' . $column . ')';
        $parameters[] = $preference['json'];
    }

    $pdo = getPDO();
    $stmt = $pdo->prepare(
        'INSERT INTO user_preferences (' . implode(', ', $insertColumns) . ')
         VALUES (' . implode(', ', $insertValues) . ')
         ON DUPLICATE KEY UPDATE ' . implode(', ', $updateAssignments)
    );
    $stmt->execute($parameters);

    // Send a success response back to JavaScript.
    jsonResponse([
        'success' => true,
        'message' => 'Preferences saved successfully.',
        'preferences' => [
            'activities' => $preferencesToSave['activities']['values'] ?? null,
            'weatherFocus' => $preferencesToSave['weatherFocus']['values'] ?? null,
            'weatherSensitivities' => $preferencesToSave['weatherSensitivities']['values'] ?? null,
            'clothingStyle' => $preferencesToSave['clothingStyle']['values'] ?? null,
            'assistantTone' => $preferencesToSave['assistantTone']['values'] ?? null,
            'profilePersonalization' => true,
        ],
    ]);

} catch (Throwable $error) {
    error_log('Could not save profile preferences: ' . $error->getMessage());
    jsonResponse(['error' => 'Could not save preferences. Please try again.'], 500);
}
