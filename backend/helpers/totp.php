<?php

declare(strict_types=1);

function climaTotpEncryptionKey(): string
{
    $configFile = __DIR__ . '/../config/security.php';

    if (!is_file($configFile)) {
        throw new RuntimeException('Missing local two-factor encryption configuration.');
    }

    $config = require $configFile;
    $encodedKey = is_array($config) ? ($config['totp_encryption_key_hex'] ?? '') : '';

    if (!is_string($encodedKey) || !preg_match('/\A[a-f0-9]{64}\z/i', $encodedKey)) {
        throw new RuntimeException('The two-factor encryption key must contain 64 hexadecimal characters.');
    }

    $key = hex2bin($encodedKey);

    if ($key === false || strlen($key) !== SODIUM_CRYPTO_SECRETBOX_KEYBYTES) {
        throw new RuntimeException('The two-factor encryption key is invalid.');
    }

    return $key;
}

function climaEncryptTotpSecret(string $secret): string
{
    $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
    $ciphertext = sodium_crypto_secretbox($secret, $nonce, climaTotpEncryptionKey());

    return $nonce . $ciphertext;
}

function climaDecryptTotpSecret(string $encryptedSecret): string
{
    $nonceLength = SODIUM_CRYPTO_SECRETBOX_NONCEBYTES;

    if (strlen($encryptedSecret) <= $nonceLength) {
        throw new RuntimeException('The stored two-factor secret is invalid.');
    }

    $nonce = substr($encryptedSecret, 0, $nonceLength);
    $ciphertext = substr($encryptedSecret, $nonceLength);
    $secret = sodium_crypto_secretbox_open($ciphertext, $nonce, climaTotpEncryptionKey());

    if ($secret === false) {
        throw new RuntimeException('Could not decrypt the stored two-factor secret.');
    }

    return $secret;
}

function climaBase32Encode(string $bytes): string
{
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $encoded = '';
    $buffer = 0;
    $bitCount = 0;

    for ($index = 0, $length = strlen($bytes); $index < $length; $index++) {
        $buffer = ($buffer << 8) | ord($bytes[$index]);
        $bitCount += 8;

        while ($bitCount >= 5) {
            $bitCount -= 5;
            $encoded .= $alphabet[($buffer >> $bitCount) & 31];
            $buffer &= (1 << $bitCount) - 1;
        }
    }

    if ($bitCount > 0) {
        $encoded .= $alphabet[($buffer << (5 - $bitCount)) & 31];
    }

    return $encoded;
}

function climaBase32Decode(string $encoded): string
{
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $encoded = strtoupper(rtrim(str_replace('=', '', trim($encoded)), '='));
    $decoded = '';
    $buffer = 0;
    $bitCount = 0;

    for ($index = 0, $length = strlen($encoded); $index < $length; $index++) {
        $value = strpos($alphabet, $encoded[$index]);

        if ($value === false) {
            throw new InvalidArgumentException('The authenticator secret is not valid Base32.');
        }

        $buffer = ($buffer << 5) | $value;
        $bitCount += 5;

        if ($bitCount >= 8) {
            $bitCount -= 8;
            $decoded .= chr(($buffer >> $bitCount) & 255);
            $buffer &= (1 << $bitCount) - 1;
        }
    }

    return $decoded;
}

function climaTotpAtStep(string $base32Secret, int $step): string
{
    if ($step < 0) {
        throw new InvalidArgumentException('The TOTP time step cannot be negative.');
    }

    $key = climaBase32Decode($base32Secret);
    $high = intdiv($step, 4_294_967_296);
    $low = $step % 4_294_967_296;
    $counter = pack('N2', $high, $low);
    $hash = hash_hmac('sha1', $counter, $key, true);
    $offset = ord($hash[strlen($hash) - 1]) & 0x0f;
    $binary = unpack('Ncode', substr($hash, $offset, 4));
    $truncated = $binary['code'] & 0x7fffffff;

    return str_pad((string) ($truncated % 1_000_000), 6, '0', STR_PAD_LEFT);
}

/** Returns the matching time step, or null when the submitted code is invalid. */
function climaVerifyTotpCode(string $base32Secret, string $submittedCode, ?int $timestamp = null): ?int
{
    if (!preg_match('/\A\d{6}\z/', $submittedCode)) {
        return null;
    }

    $currentStep = intdiv($timestamp ?? time(), 30);

    // Check the current interval first, then allow one adjacent 30-second step for clock drift.
    foreach ([0, -1, 1] as $offset) {
        $candidateStep = $currentStep + $offset;

        if ($candidateStep >= 0 && hash_equals(climaTotpAtStep($base32Secret, $candidateStep), $submittedCode)) {
            return $candidateStep;
        }
    }

    return null;
}

function climaTotpProvisioningUri(string $accountName, string $base32Secret): string
{
    $label = rawurlencode('Clima:' . $accountName);

    return 'otpauth://totp/' . $label
        . '?secret=' . rawurlencode($base32Secret)
        . '&issuer=' . rawurlencode('Clima')
        . '&algorithm=SHA1&digits=6&period=30';
}

function climaIsTwoFactorLocked(PDO $pdo, int $userId): bool
{
    $stmt = $pdo->prepare('SELECT locked_until FROM user_two_factor_auth WHERE user_id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $lockedUntilValue = $stmt->fetchColumn();

    if (!$lockedUntilValue) {
        return false;
    }

    $lockedUntil = strtotime((string) $lockedUntilValue . ' UTC');

    return $lockedUntil !== false && $lockedUntil > time();
}

function climaRecordFailedTwoFactorAttempt(PDO $pdo, int $userId): bool
{
    $maximumFailures = 10;
    $windowSeconds = 900;
    $lockSeconds = 900;

    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare(
            'SELECT failed_attempts, window_started_at, locked_until
             FROM user_two_factor_auth
             WHERE user_id = ?
             FOR UPDATE'
        );
        $stmt->execute([$userId]);
        $row = $stmt->fetch();

        if (!$row) {
            $pdo->commit();
            return false;
        }

        $now = time();
        $windowStartedAt = empty($row['window_started_at'])
            ? false
            : strtotime((string) $row['window_started_at'] . ' UTC');
        $existingLock = empty($row['locked_until'])
            ? false
            : strtotime((string) $row['locked_until'] . ' UTC');

        if ($existingLock !== false && $existingLock > $now) {
            $pdo->commit();
            return true;
        }

        $windowExpired = $windowStartedAt === false
            || ($now - $windowStartedAt) >= $windowSeconds
            || ($existingLock !== false && $existingLock <= $now);
        $failedAttempts = $windowExpired ? 1 : (int) $row['failed_attempts'] + 1;
        $windowStartedAtText = $windowExpired
            ? gmdate('Y-m-d H:i:s', $now)
            : (string) $row['window_started_at'];
        $lockedUntilText = $failedAttempts >= $maximumFailures
            ? gmdate('Y-m-d H:i:s', $now + $lockSeconds)
            : null;

        $update = $pdo->prepare(
            'UPDATE user_two_factor_auth
             SET failed_attempts = ?, window_started_at = ?, locked_until = ?
             WHERE user_id = ?'
        );
        $update->execute([
            $failedAttempts,
            $windowStartedAtText,
            $lockedUntilText,
            $userId,
        ]);

        $pdo->commit();

        return $lockedUntilText !== null;
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $error;
    }
}

function climaClearTwoFactorFailures(PDO $pdo, int $userId): void
{
    $stmt = $pdo->prepare(
        'UPDATE user_two_factor_auth
         SET failed_attempts = 0, window_started_at = NULL, locked_until = NULL
         WHERE user_id = ?'
    );
    $stmt->execute([$userId]);
}

function climaAcceptActiveTotp(PDO $pdo, int $userId, string $submittedCode): bool
{
    $stmt = $pdo->prepare(
        'SELECT secret_ciphertext, last_totp_step
         FROM user_two_factor_auth
         WHERE user_id = ? AND enabled_at IS NOT NULL
         LIMIT 1'
    );
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    if (!$row || $row['secret_ciphertext'] === null) {
        return false;
    }

    $secret = climaDecryptTotpSecret((string) $row['secret_ciphertext']);
    $matchingStep = climaVerifyTotpCode($secret, $submittedCode);
    $lastAcceptedStep = $row['last_totp_step'] === null ? null : (int) $row['last_totp_step'];

    if ($matchingStep === null || ($lastAcceptedStep !== null && $matchingStep <= $lastAcceptedStep)) {
        return false;
    }

    // The conditional update makes a code from the same time step single-use,
    // including when two requests arrive at nearly the same time.
    $update = $pdo->prepare(
        'UPDATE user_two_factor_auth
         SET last_totp_step = ?, failed_attempts = 0, window_started_at = NULL, locked_until = NULL
         WHERE user_id = ? AND (last_totp_step IS NULL OR last_totp_step < ?)'
    );
    $update->execute([$matchingStep, $userId, $matchingStep]);

    return $update->rowCount() === 1;
}

function climaGenerateRecoveryCodes(int $count = 10): array
{
    $codes = [];

    for ($index = 0; $index < $count; $index++) {
        $rawCode = climaBase32Encode(random_bytes(15));
        $codes[] = implode('-', str_split($rawCode, 4));
    }

    return $codes;
}

function climaNormalizeRecoveryCode(string $code): ?string
{
    $normalized = strtoupper(preg_replace('/[\s-]+/', '', trim($code)) ?? '');

    if (!preg_match('/\A[A-Z2-7]{24}\z/', $normalized)) {
        return null;
    }

    return $normalized;
}

function climaStoreRecoveryCodes(PDO $pdo, int $userId, array $codes): void
{
    $delete = $pdo->prepare('DELETE FROM user_two_factor_recovery_codes WHERE user_id = ?');
    $delete->execute([$userId]);

    $insert = $pdo->prepare(
        'INSERT INTO user_two_factor_recovery_codes (user_id, code_hash)
         VALUES (?, ?)'
    );

    foreach ($codes as $code) {
        $normalized = climaNormalizeRecoveryCode((string) $code);

        if ($normalized === null) {
            throw new RuntimeException('Generated an invalid recovery code.');
        }

        $insert->execute([$userId, hash('sha256', $normalized)]);
    }
}

function climaConsumeRecoveryCode(PDO $pdo, int $userId, string $submittedCode): bool
{
    $normalized = climaNormalizeRecoveryCode($submittedCode);

    if ($normalized === null) {
        return false;
    }

    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare(
            'SELECT id
             FROM user_two_factor_recovery_codes
             WHERE user_id = ? AND code_hash = ? AND used_at IS NULL
             LIMIT 1
             FOR UPDATE'
        );
        $stmt->execute([$userId, hash('sha256', $normalized)]);
        $codeId = $stmt->fetchColumn();

        if (!$codeId) {
            $pdo->commit();
            return false;
        }

        $markUsed = $pdo->prepare(
            'UPDATE user_two_factor_recovery_codes
             SET used_at = UTC_TIMESTAMP()
             WHERE id = ? AND user_id = ? AND used_at IS NULL'
        );
        $markUsed->execute([(int) $codeId, $userId]);
        $accepted = $markUsed->rowCount() === 1;

        if ($accepted) {
            climaClearTwoFactorFailures($pdo, $userId);
        }

        $pdo->commit();

        return $accepted;
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $error;
    }
}
