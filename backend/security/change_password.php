<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/user.php';
require_once __DIR__ . '/../helpers/password_blocklist.php';
require_once __DIR__ . '/../config/dbconnection.php';

try {
    requirePost();

    $userId = requireLoggedInUserId();

    $data = readJsonBody();

    $currentPassword = (string) ($data['currentPassword'] ?? '');
    $newPassword = (string) ($data['newPassword'] ?? '');
    $confirmPassword = (string) ($data['confirmPassword'] ?? '');

    if ($currentPassword === '' || $newPassword === '' || $confirmPassword === '') {
        jsonResponse(['error' => 'Please complete all password fields.'], 422);
    }

    if ($newPassword !== $confirmPassword) {
        jsonResponse(['error' => 'The new passwords do not match.'], 422);
    }

    if (mb_strlen($newPassword, 'UTF-8') < 15) {
        jsonResponse([
            'error' => 'The new password must be at least 15 characters.'
        ], 422);
    }

    $pdo = getPDO();
    $findUser = $pdo->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
    $findUser->execute([$userId]);
    $user = $findUser->fetch();

    if (!$user) {
        jsonResponse(['error' => 'Your account could not be found. Please sign in again.'], 401);
    }

    $currentPasswordHash = (string) $user['password_hash'];

    if (!password_verify($currentPassword, $currentPasswordHash)) {
        jsonResponse(['error' => 'The current password is incorrect.'], 422);
    }

    if (password_verify($newPassword, $currentPasswordHash)) {
        jsonResponse(['error' => 'Choose a new password different from your current password.'], 422);
    }

    // Reject passwords already found in known data breaches.
    if (climaPasswordIsCompromised($newPassword)) {
        jsonResponse([
            'error' => 'Choose a password that has not appeared in a known data breach.'
        ], 422);
    }

    $newPasswordHash = password_hash($newPassword, PASSWORD_ARGON2ID);
    $updatePassword = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $updatePassword->execute([$newPasswordHash, $userId]);

    // Rotate this browser's session identifier after changing a credential.
    session_regenerate_id(true);

    jsonResponse(['message' => 'Password updated successfully.']);

} catch (ClimaPasswordBlocklistUnavailable $error) {
    error_log('Password blocklist check failed: ' . $error->getMessage());
    jsonResponse([
        'error' => 'Password security check is temporarily unavailable. Please try again shortly.'
    ], 503);

} catch (Throwable $error) {
    error_log($error->getMessage());
    jsonResponse(['error' => 'Could not change password.'], 500);
}
