<?php

declare(strict_types=1);

function climaLoginIsBlocked(PDO $pdo, string $accountHash): bool
{
    $stmt = $pdo->prepare(
        'SELECT locked_until FROM login_attempt_limits WHERE account_hash = ? LIMIT 1'
    );
    $stmt->execute([$accountHash]);
    $row = $stmt->fetch();

    if (!$row || empty($row['locked_until'])) {
        return false;
    }

    $lockedUntil = strtotime((string) $row['locked_until'] . ' UTC');

    return $lockedUntil !== false && $lockedUntil > time();
}

function climaRecordFailedLogin(PDO $pdo, string $accountHash): bool
{
    $maximumFailures = 10;
    $windowSeconds = 900;
    $lockSeconds = 900;

    $pdo->beginTransaction();

    try {
        $createBucket = $pdo->prepare(
            'INSERT IGNORE INTO login_attempt_limits
                (account_hash, failed_attempts, window_started_at)
             VALUES (?, 0, UTC_TIMESTAMP())'
        );
        $createBucket->execute([$accountHash]);

        $getBucket = $pdo->prepare(
            'SELECT failed_attempts, window_started_at, locked_until
             FROM login_attempt_limits
             WHERE account_hash = ?
             FOR UPDATE'
        );
        $getBucket->execute([$accountHash]);
        $row = $getBucket->fetch();

        if (!$row) {
            throw new RuntimeException('Could not load the login-attempt counter.');
        }

        $now = time();
        $windowStartedAt = strtotime((string) $row['window_started_at'] . ' UTC');
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

        if ($windowExpired) {
            $failedAttempts = 1;
            $windowStartedAtText = gmdate('Y-m-d H:i:s', $now);
        } else {
            $failedAttempts = (int) $row['failed_attempts'] + 1;
            $windowStartedAtText = (string) $row['window_started_at'];
        }

        $lockedUntilText = $failedAttempts >= $maximumFailures
            ? gmdate('Y-m-d H:i:s', $now + $lockSeconds)
            : null;

        $updateBucket = $pdo->prepare(
            'UPDATE login_attempt_limits
             SET failed_attempts = ?, window_started_at = ?, locked_until = ?
             WHERE account_hash = ?'
        );
        $updateBucket->execute([
            $failedAttempts,
            $windowStartedAtText,
            $lockedUntilText,
            $accountHash,
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

function climaClearFailedLogins(PDO $pdo, string $accountHash): void
{
    $stmt = $pdo->prepare('DELETE FROM login_attempt_limits WHERE account_hash = ?');
    $stmt->execute([$accountHash]);
}
