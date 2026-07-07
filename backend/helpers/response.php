<?php

declare(strict_types=1);

function startClimaSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_name('CLIMA_SESSION');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    ]);
    session_start();
}

function jsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload);
    exit;
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);

    if (!is_array($data)) {
        jsonResponse(['error' => 'Invalid JSON request body.'], 400);
    }

    return $data;
}

function requirePost(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['error' => 'Only POST requests are allowed.'], 405);
    }
}

function requireLoggedInUserId(): int
{
    startClimaSession();

    if (empty($_SESSION['user_id'])) {
        jsonResponse(['error' => 'You must be logged in.'], 401);
    }

    return (int) $_SESSION['user_id'];
}