<?php

declare(strict_types=1);

// Load helper files.
// response.php contains functions for JSON responses and session handling.
// user.php contains fetchUserPayload(), which returns clean user data.
// dbconnection.php contains getPDO(), which connects to the database.
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/user.php';
require_once __DIR__ . '/../helpers/password_blocklist.php';
require_once __DIR__ . '/../config/dbconnection.php';

try {
    // Allow only POST requests for registration.
    requirePost();

    // Start the PHP session so the new user can be logged in after registration.
    startClimaSession();

    // Read the JSON data sent from signup.js.
    $data = readJsonBody();

    // Get and clean the submitted form values.
    $name = trim((string) ($data['name'] ?? ''));
    $email = strtolower(trim((string) ($data['email'] ?? '')));
    $password = (string) ($data['password'] ?? '');

    // Validate the user's full name.
    if (mb_strlen($name) < 2) {
        jsonResponse(['error' => 'Please enter your full name.'], 422);
    }

    // Validate the email format.
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['error' => 'Please enter a valid email address.'], 422);
    }

    // Password-only sign-in requires a minimum of 15 characters.
    if (mb_strlen($password, 'UTF-8') < 15) {
        jsonResponse([
            'error' => 'Password must be at least 15 characters.'
        ], 422);
    }

    // Reject passwords already found in known data breaches.
    if (climaPasswordIsCompromised($password)) {
        jsonResponse([
            'error' => 'Choose a password that has not appeared in a known data breach.'
        ], 422);
    }

    // Open the database connection.
    $pdo = getPDO();

    // Check if the email is already registered.
    $check = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $check->execute([$email]);

    if ($check->fetch()) {
        jsonResponse(['error' => 'An account with this email already exists.'], 409);
    }

    // Start a transaction because registration inserts data into multiple tables.
    // If one insert fails, all changes will be rolled back.
    $pdo->beginTransaction();

    // Insert the main user account into the users table.
    $insertUser = $pdo->prepare(
        'INSERT INTO users (full_name, email, password_hash)
         VALUES (?, ?, ?)'
    );

    $insertUser->execute([
        $name,
        $email,
        password_hash($password, PASSWORD_ARGON2ID),
    ]);

    // Get the ID of the newly created user.
    $userId = (int) $pdo->lastInsertId();

    // Insert default profile information for the new user.
    $insertProfile = $pdo->prepare(
        'INSERT INTO user_profiles (user_id, default_location, main_activity)
         VALUES (?, ?, ?)'
    );

    $insertProfile->execute([
        $userId,
        'Klaipėda, Lithuania',
        'Walking',
    ]);

    // Insert default preference settings for the new user.
    // This creates the user's preference row immediately after registration.
    $insertPreferences = $pdo->prepare(
        'INSERT INTO user_preferences (user_id, unit_system, theme)
         VALUES (?, ?, ?)'
    );

    $insertPreferences->execute([
        $userId,
        'Metric',
        'light',
    ]);

    // Save all inserts permanently.
    $pdo->commit();

    // Regenerate the session ID for security after successful registration.
    session_regenerate_id(true);

    // Store the new user's ID in the PHP session.
    $_SESSION['user_id'] = $userId;

    // Return a success response and the new user's full payload.
    jsonResponse([
        'message' => 'Account created successfully.',
        'user' => fetchUserPayload($pdo, $userId),
    ], 201);

} catch (ClimaPasswordBlocklistUnavailable $error) {
    error_log('Password blocklist check failed: ' . $error->getMessage());
    jsonResponse([
        'error' => 'Password security check is temporarily unavailable. Please try again shortly.'
    ], 503);

} catch (Throwable $error) {
    // If an error happens during the transaction, undo all database changes.
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    // Keep internal database or server details out of the response.
    error_log($error->getMessage());
    jsonResponse(['error' => 'Could not create your account. Please try again.'], 500);
}