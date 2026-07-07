<?php

// Enable strict type checking.
// This helps PHP detect type-related mistakes more easily.
declare(strict_types=1);

/**
 * Create and return a PDO database connection.
 *
 * PDO is used to connect PHP to the MySQL database.
 * The function uses a static variable so the connection is created only once
 * and reused whenever getPDO() is called again.
 */
function getPDO(): PDO
{
    // Store the PDO connection after it is created.
    // The value stays available during the current request.
    static $pdo = null;

    // If the PDO connection already exists, return it immediately.
    // This prevents creating multiple database connections unnecessarily.
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    // Path to the local database configuration file.
    // This file contains host, database name, username, password, and charset.
    $configFile = __DIR__ . '/database.php';

    // Check if the database configuration file exists.
    // If it does not exist, stop the program and show a clear error message.
    if (!file_exists($configFile)) {
        throw new RuntimeException(
            'Missing backend/config/database.php. Copy database.example.php to database.php and add your MySQL details.'
        );
    }

    // Load the database configuration array from database.php.
    $config = require $configFile;

    // Use the charset from the configuration file.
    // If it is not defined, use utf8mb4 by default.
    $charset = $config['charset'] ?? 'utf8mb4';

    // Build the Data Source Name (DSN).
    // This tells PDO which database server, database name, and charset to use.
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $config['host'],
        $config['database'],
        $charset
    );

    // Create the PDO connection using the DSN, username, and password.
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        // Throw exceptions when a database error happens.
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,

        // Return database rows as associative arrays.
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,

        // Use real prepared statements from MySQL for better security.
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    // Return the database connection.
    return $pdo;
}