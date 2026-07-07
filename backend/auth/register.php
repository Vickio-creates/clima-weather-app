<?php

declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/user.php';
require_once __DIR__ . '/../config/dbconnection.php';


try {
    requirePost();
    startClimaSession();
    $data = readJsonBody();

    $name = trim((string) ($data['name'] ?? ''));
    $email = strtolower(trim((string) ($data['email'] ?? '')));
    $password = (string) ($data['password'] ?? '');

    if (mb_strlen($name) < 2) {
        jsonResponse(['error' => 'Please enter your full name.'], 422);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['error' => 'Please enter a valid email address.'], 422);
    }

    if (mb_strlen($password) < 6) {
        jsonResponse(['error' => 'Password should be at least 6 characters.'], 422);
    }

    $pdo = getPDO();

    $check = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $check->execute([$email]);
    if ($check->fetch()) {
        jsonResponse(['error' => 'An account with this email already exists.'], 409);
    }

    $pdo->beginTransaction();

    $insertUser = $pdo->prepare('INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)');
    $insertUser->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
    $userId = (int) $pdo->lastInsertId();

    $insertProfile = $pdo->prepare('INSERT INTO user_profiles (user_id, default_location, main_activity, health_sensitivity) VALUES (?, ?, ?, ?)');
    $insertProfile->execute([$userId, 'Klaipėda, Lithuania', 'Walking', 'None selected']);

    $insertPreferences = $pdo->prepare('INSERT INTO user_preferences (user_id, unit_system, theme) VALUES (?, ?, ?)');
    $insertPreferences->execute([$userId, 'Metric', 'light']);

    $pdo->commit();

    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;

    jsonResponse([
        'message' => 'Account created successfully.',
        'user' => fetchUserPayload($pdo, $userId),
    ], 201);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(['error' => $error->getMessage()], 500);
}