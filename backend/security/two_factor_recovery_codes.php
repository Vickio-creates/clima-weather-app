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

    if ($currentPassword === '' || $code === '') {
        jsonResponse(['error' => 'Enter your current password and authenticator code.'], 422);
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

    $pdo->beginTransaction();

    if (!climaAcceptActiveTotp($pdo, $userId, $code)) {
        $pdo->rollBack();
        $isLocked = climaRecordFailedTwoFactorAttempt($pdo, $userId);
        jsonResponse([
            'error' => $isLocked
                ? 'Too many incorrect codes. Please wait 15 minutes and try again.'
                : 'The authenticator code is incorrect.'
        ], $isLocked ? 429 : 422);
    }

    $recoveryCodes = climaGenerateRecoveryCodes();
    climaStoreRecoveryCodes($pdo, $userId, $recoveryCodes);
    $pdo->commit();

    jsonResponse([
        'message' => 'New recovery codes created. Previous codes are no longer valid.',
        'recoveryCodes' => $recoveryCodes,
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log($error->getMessage());
    jsonResponse(['error' => 'Could not create new recovery codes. Please try again.'], 500);
}
