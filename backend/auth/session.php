<?php

declare(strict_types=1);

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/user.php';
require_once __DIR__ . '/../config/dbconnection.php';


try {
    startClimaSession();

    if (empty($_SESSION['user_id'])) {
        jsonResponse(['authenticated' => false, 'error' => 'No active session.'], 401);
    }

    $pdo = getPDO();
    $user = fetchUserPayload($pdo, (int) $_SESSION['user_id']);

    if (!$user) {
        session_destroy();
        jsonResponse(['authenticated' => false, 'error' => 'User not found.'], 401);
    }

    jsonResponse(['authenticated' => true, 'user' => $user]);
} catch (Throwable $error) {
    jsonResponse(['error' => $error->getMessage()], 500);
}