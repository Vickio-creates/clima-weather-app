<?php

declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/user.php';
require_once __DIR__ . '/../config/dbconnection.php';

try {
    $userId = requireLoggedInUserId();
    $pdo = getPDO();

    $auth = $pdo->prepare(
        'SELECT enabled_at FROM user_two_factor_auth WHERE user_id = ? LIMIT 1'
    );
    $auth->execute([$userId]);
    $enabledAt = $auth->fetchColumn();
    $enabled = $enabledAt !== false && $enabledAt !== null;

    $recovery = $pdo->prepare(
        'SELECT COUNT(*) FROM user_two_factor_recovery_codes WHERE user_id = ? AND used_at IS NULL'
    );
    $recovery->execute([$userId]);

    jsonResponse([
        'enabled' => $enabled,
        'recoveryCodesRemaining' => (int) $recovery->fetchColumn(),
    ]);
} catch (Throwable $error) {
    error_log($error->getMessage());
    jsonResponse(['error' => 'Could not load two-factor status.'], 500);
}
