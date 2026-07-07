<?php

declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/user.php';
require_once __DIR__ . '/../config/dbconnection.php';

try {
    requirePost();
    startClimaSession();
    $data = readJsonBody();

    $email = strtolower(trim((string) ($data['email'] ?? '')));
    $password = (string) ($data['password'] ?? '');

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
        jsonResponse(['error' => 'Email or password is incorrect.'], 422);
    }

    $pdo = getPDO();
    $stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        jsonResponse(['error' => 'Email or password is incorrect.'], 401);
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];

    jsonResponse([
        'message' => 'Login successful.',
        'user' => fetchUserPayload($pdo, (int) $user['id']),
    ]);
} catch (Throwable $error) {
    jsonResponse(['error' => $error->getMessage()], 500);
}