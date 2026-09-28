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
    $code = trim((string) ($data['code'] ?? ''));
    $pdo = getPDO();

    if (!preg_match('/\A\d{6}\z/', $code)) {
        jsonResponse(['error' => 'Enter the six-digit code from your authenticator app.'], 422);
    }

    if (climaIsTwoFactorLocked($pdo, $userId)) {
        jsonResponse(['error' => 'Too many incorrect codes. Please wait 15 minutes and try again.'], 429);
    }

    $pdo->beginTransaction();
    $lookup = $pdo->prepare(
        'SELECT pending_secret_ciphertext, pending_expires_at, enabled_at
         FROM user_two_factor_auth
         WHERE user_id = ?
         FOR UPDATE'
    );
    $lookup->execute([$userId]);
    $row = $lookup->fetch();

    if (!$row || $row['enabled_at'] !== null || $row['pending_secret_ciphertext'] === null) {
        $pdo->rollBack();
        jsonResponse(['error' => 'Start two-factor setup before confirming a code.'], 409);
    }

    $expiresAt = strtotime((string) $row['pending_expires_at'] . ' UTC');

    if ($expiresAt === false || $expiresAt <= time()) {
        $clearPending = $pdo->prepare(
            'UPDATE user_two_factor_auth
             SET pending_secret_ciphertext = NULL, pending_expires_at = NULL
             WHERE user_id = ?'
        );
        $clearPending->execute([$userId]);
        $pdo->commit();
        jsonResponse(['error' => 'The setup expired. Start two-factor setup again.'], 410);
    }

    $secret = climaDecryptTotpSecret((string) $row['pending_secret_ciphertext']);
    $matchingStep = climaVerifyTotpCode($secret, $code);

    if ($matchingStep === null) {
        $pdo->rollBack();
        $isLocked = climaRecordFailedTwoFactorAttempt($pdo, $userId);
        jsonResponse([
            'error' => $isLocked
                ? 'Too many incorrect codes. Please wait 15 minutes and try again.'
                : 'That code is incorrect. Check your authenticator app and try again.'
        ], $isLocked ? 429 : 422);
    }

    $recoveryCodes = climaGenerateRecoveryCodes();
    $activate = $pdo->prepare(
        'UPDATE user_two_factor_auth
         SET secret_ciphertext = pending_secret_ciphertext,
             pending_secret_ciphertext = NULL,
             pending_expires_at = NULL,
             enabled_at = UTC_TIMESTAMP(),
             last_totp_step = ?,
             failed_attempts = 0,
             window_started_at = NULL,
             locked_until = NULL
         WHERE user_id = ? AND enabled_at IS NULL'
    );
    $activate->execute([$matchingStep, $userId]);

    if ($activate->rowCount() !== 1) {
        $pdo->rollBack();
        jsonResponse(['error' => 'Could not enable two-factor authentication. Please try again.'], 409);
    }

    climaStoreRecoveryCodes($pdo, $userId, $recoveryCodes);
    $pdo->commit();

    jsonResponse([
        'message' => 'Two-factor authentication is enabled. Save these recovery codes somewhere safe; they will only be shown once.',
        'recoveryCodes' => $recoveryCodes,
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log($error->getMessage());
    jsonResponse(['error' => 'Could not confirm two-factor setup. Please try again.'], 500);
}
