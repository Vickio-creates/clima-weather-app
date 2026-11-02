<?php

declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../config/dbconnection.php';

try {
    requirePost();

    // The account ID comes only from the authenticated PHP session.
    $userId = requireLoggedInUserId();
    $data = readJsonBody();

    $expectedKeys = ['city', 'country'];
    $receivedKeys = array_keys($data);

    if (
        array_diff($receivedKeys, $expectedKeys) ||
        array_diff($expectedKeys, $receivedKeys)
    ) {
        jsonResponse(['error' => 'Send only a city and country.'], 422);
    }

    if (!is_string($data['city']) || !is_string($data['country'])) {
        jsonResponse(['error' => 'City and country must be text values.'], 422);
    }

    $city = trim($data['city']);
    $country = trim($data['country']);

    $cityPattern = "/^[\\p{L}\\p{M}\\p{N} .'’()\\-]+$/u";
    $countryPattern = "/^[\\p{L}\\p{M}\\p{N} .,\\'’()\\-]+$/u";

    if (
        $city === '' ||
        $country === '' ||
        mb_strlen($city) > 80 ||
        mb_strlen($country) > 80 ||
        preg_match($cityPattern, $city) !== 1 ||
        preg_match($countryPattern, $country) !== 1
    ) {
        jsonResponse(['error' => 'Enter a valid city and country.'], 422);
    }

    $location = $city . ', ' . $country;

    if (mb_strlen($location) > 120) {
        jsonResponse(['error' => 'The selected location is too long.'], 422);
    }

    $pdo = getPDO();
    $statement = $pdo->prepare(
        'UPDATE user_profiles
         SET default_location = ?
         WHERE user_id = ?'
    );
    $statement->execute([$location, $userId]);

    // A zero row count can mean the value was already the same, so check
    // whether the authenticated user's profile row exists before reporting success.
    if ($statement->rowCount() === 0) {
        $profileCheck = $pdo->prepare(
            'SELECT user_id FROM user_profiles WHERE user_id = ? LIMIT 1'
        );
        $profileCheck->execute([$userId]);

        if (!$profileCheck->fetchColumn()) {
            jsonResponse(['error' => 'Your profile could not be found.'], 404);
        }
    }

    jsonResponse([
        'success' => true,
        'message' => 'Location saved successfully.',
    ]);
} catch (Throwable $error) {
    jsonResponse([
        'error' => 'Could not save your location. Please try again.',
    ], 500);
}
