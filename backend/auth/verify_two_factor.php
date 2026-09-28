<?php

declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/user.php';
require_once __DIR__ . '/../helpers/totp.php';
require_once __DIR__ . '/../config/dbconnection.php';

try {
    requirePost();
    startClimaSession();

    $userId = (int) ($_SESSION['pending_two_factor_user_id'] ?? 0);
    $challengeStartedAt = (int) ($_SESSION['pending_two_factor_started_at'] ?? 0);

    if ($userId <= 0 || $challengeStartedAt <= 0 || time() - $challengeStartedAt > 300) {
        unset($_SESSION['pending_two_factor_user_id'], $_SESSION['pending_two_factor_started_at']);
        jsonResponse(['error' => 'The verification session expired. Sign in again.'], 401);
    }

    $data = readJsonBody();
    $code = trim((string) ($data['code'] ?? ''));
    $method = (string) ($data['method'] ?? 'totp');

    if ($code === '') {
        jsonResponse(['error' => 'Enter an authenticator or recovery code.'], 422);
    }

    $pdo = getPDO();

    if (climaIsTwoFactorLocked($pdo, $userId)) {
        jsonResponse(['error' => 'Too many incorrect verification codes. Please wait 15 minutes and try again.'], 429);
    }

    $accepted = $method === 'recovery'
        ? climaConsumeRecoveryCode($pdo, $userId, $code)
        : climaAcceptActiveTotp($pdo, $userId, $code);

    if (!$accepted) {
        $isLocked = climaRecordFailedTwoFactorAttempt($pdo, $userId);
        jsonResponse([
            'error' => $isLocked
                ? 'Too many incorrect verification codes. Please wait 15 minutes and try again.'
                : 'The verification code is incorrect.'
        ], $isLocked ? 429 : 401);
    }

    $user = fetchUserPayload($pdo, $userId);

    if (!$user) {
        unset($_SESSION['pending_two_factor_user_id'], $_SESSION['pending_two_factor_started_at']);
        jsonResponse(['error' => 'Your account could not be found. Please sign in again.'], 401);
    }

    session_regenerate_id(true);
    unset($_SESSION['pending_two_factor_user_id'], $_SESSION['pending_two_factor_started_at']);
    $_SESSION['user_id'] = $userId;

    jsonResponse([
        'message' => 'Login successful.',
        'user' => $user,
    ]);
} catch (Throwable $error) {
    error_log($error->getMessage());
    jsonResponse(['error' => 'Could not verify your sign-in. Please try again.'], 500);
}
