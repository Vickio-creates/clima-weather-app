<?php

declare(strict_types=1);

// Copy this file to security.php and set a private 64-character hex key.
// Generate one with: php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'
return [
    'totp_encryption_key_hex' => '',
];
