<?php

declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/user.php';
require_once __DIR__ . '/../helpers/totp.php';
require_once __DIR__ . '/../config/dbconnection.php';

try {
    requirePost();
    $userId = requireLoggedInUserId();
    $data = readJsonBody();
    $currentPassword = (string) ($data['currentPassword'] ?? '');
    $code = trim((string) ($data['code'] ?? ''));
    $method = (string) ($data['method'] ?? 'totp');

    if ($currentPassword === '' || $code === '') {
        jsonResponse(['error' => 'Enter your current password and an authenticator or recovery code.'], 422);
    }

    $pdo = getPDO();
    $passwordQuery = $pdo->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
    $passwordQuery->execute([$userId]);
    $passwordHash = $passwordQuery->fetchColumn();

    if (!is_string($passwordHash) || !password_verify($currentPassword, $passwordHash)) {
        jsonResponse(['error' => 'The current password is incorrect.'], 422);
    }

    if (climaIsTwoFactorLocked($pdo, $userId)) {
        jsonResponse(['error' => 'Too many incorrect codes. Please wait 15 minutes and try again.'], 429);
    }

    $accepted = $method === 'recovery'
        ? climaConsumeRecoveryCode($pdo, $userId, $code)
        : climaAcceptActiveTotp($pdo, $userId, $code);

    if (!$accepted) {
        $isLocked = climaRecordFailedTwoFactorAttempt($pdo, $userId);
        jsonResponse([
            'error' => $isLocked
                ? 'Too many incorrect codes. Please wait 15 minutes and try again.'
                : 'The authenticator or recovery code is incorrect.'
        ], $isLocked ? 429 : 422);
    }

    $delete = $pdo->prepare('DELETE FROM user_two_factor_auth WHERE user_id = ? AND enabled_at IS NOT NULL');
    $delete->execute([$userId]);

    if ($delete->rowCount() !== 1) {
        jsonResponse(['error' => 'Two-factor authentication is not enabled.'], 409);
    }

    jsonResponse(['message' => 'Two-factor authentication has been disabled.']);
} catch (Throwable $error) {
    error_log($error->getMessage());
    jsonResponse(['error' => 'Could not disable two-factor authentication. Please try again.'], 500);
}
