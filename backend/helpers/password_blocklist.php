<?php

declare(strict_types=1);

final class ClimaPasswordBlocklistUnavailable extends RuntimeException
{
}

/**
 * Checks a password against Have I Been Pwned's Pwned Passwords corpus.
 * Only the first five characters of the locally-created SHA-1 hash are sent.
 * The full password and full hash remain on this server.
 */
function climaPasswordIsCompromised(string $password): bool
{
    $passwordHash = strtoupper(sha1($password));
    $hashPrefix = substr($passwordHash, 0, 5);
    $hashSuffix = substr($passwordHash, 5);

    $handle = curl_init('https://api.pwnedpasswords.com/range/' . $hashPrefix);

    if ($handle === false) {
        throw new ClimaPasswordBlocklistUnavailable('Could not initialize the password blocklist request.');
    }

    curl_setopt_array($handle, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => 6,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_HTTPHEADER => [
            'Add-Padding: true',
            'Accept: text/plain',
            'User-Agent: ClimaApp-PasswordSecurity/1.0',
        ],
    ]);

    $responseBody = curl_exec($handle);
    $curlError = curl_error($handle);
    $httpStatus = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    unset($handle);

    if ($responseBody === false || $httpStatus !== 200) {
        $reason = $responseBody === false
            ? $curlError
            : 'The password blocklist returned HTTP ' . $httpStatus . '.';

        throw new ClimaPasswordBlocklistUnavailable($reason);
    }

    foreach (preg_split('/\r\n|\r|\n/', $responseBody) ?: [] as $line) {
        $parts = explode(':', trim($line), 2);

        if (count($parts) !== 2) {
            continue;
        }

        $returnedSuffix = strtoupper(trim($parts[0]));
        $occurrenceCount = (int) trim($parts[1]);

        if ($occurrenceCount > 0 && hash_equals($hashSuffix, $returnedSuffix)) {
            return true;
        }
    }

    return false;
}
