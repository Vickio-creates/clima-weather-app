<?php

declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/user.php';
require_once __DIR__ . '/../helpers/login_attempts.php';
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
    $accountHash = hash('sha256', 'login-account:' . $email);

    if (climaLoginIsBlocked($pdo, $accountHash)) {
        jsonResponse([
            'error' => 'Too many unsuccessful sign-in attempts. Please wait 15 minutes and try again.'
        ], 429);
    }

    $stmt = $pdo->prepare(
        'SELECT id, password_hash
         FROM users
         WHERE email = ?
         LIMIT 1'
    );
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        if (climaRecordFailedLogin($pdo, $accountHash)) {
            jsonResponse([
                'error' => 'Too many unsuccessful sign-in attempts. Please wait 15 minutes and try again.'
            ], 429);
        }

        jsonResponse(['error' => 'Email or password is incorrect.'], 401);
    }

    climaClearFailedLogins($pdo, $accountHash);
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];

    jsonResponse([
        'message' => 'Login successful.',
        'user' => fetchUserPayload($pdo, (int) $user['id']),
    ]);
} catch (Throwable $error) {
    error_log($error->getMessage());
    jsonResponse(['error' => 'Could not sign in. Please try again.'], 500);
}
