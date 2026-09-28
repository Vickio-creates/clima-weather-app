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

    if ($currentPassword === '') {
        jsonResponse(['error' => 'Enter your current password to set up two-factor authentication.'], 422);
    }

    $pdo = getPDO();
    $userQuery = $pdo->prepare('SELECT email, password_hash FROM users WHERE id = ? LIMIT 1');
    $userQuery->execute([$userId]);
    $user = $userQuery->fetch();

    if (!$user || !password_verify($currentPassword, (string) $user['password_hash'])) {
        jsonResponse(['error' => 'The current password is incorrect.'], 422);
    }

    $status = $pdo->prepare(
        'SELECT enabled_at FROM user_two_factor_auth WHERE user_id = ? LIMIT 1'
    );
    $status->execute([$userId]);
    $authRow = $status->fetch();

    if ($authRow && $authRow['enabled_at'] !== null) {
        jsonResponse(['error' => 'Two-factor authentication is already enabled.'], 409);
    }

    $secret = climaBase32Encode(random_bytes(20));
    $encryptedSecret = climaEncryptTotpSecret($secret);

    if ($authRow) {
        $savePending = $pdo->prepare(
            'UPDATE user_two_factor_auth
             SET pending_secret_ciphertext = ?,
                 pending_expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE),
                 failed_attempts = 0,
                 window_started_at = NULL,
                 locked_until = NULL
             WHERE user_id = ? AND enabled_at IS NULL'
        );
        $savePending->execute([$encryptedSecret, $userId]);

        if ($savePending->rowCount() !== 1) {
            jsonResponse(['error' => 'Could not start two-factor setup. Please try again.'], 409);
        }
    } else {
        $savePending = $pdo->prepare(
            'INSERT INTO user_two_factor_auth
                (user_id, pending_secret_ciphertext, pending_expires_at)
             VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE))'
        );
        $savePending->execute([$userId, $encryptedSecret]);
    }

    jsonResponse([
        'message' => 'Scan the setup key with an authenticator app, then enter its current code.',
        'secret' => $secret,
        'provisioningUri' => climaTotpProvisioningUri((string) $user['email'], $secret),
    ]);
} catch (Throwable $error) {
    error_log($error->getMessage());
    jsonResponse(['error' => 'Could not start two-factor setup. Please try again.'], 500);
}