<?php

header("Content-Type: application/json; charset=UTF-8");

$configPath = __DIR__ . "/config.php";

if (!is_file($configPath)) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "OpenWeather is not configured. Add config.php with an API key."
    ]);
    exit;
}

require_once $configPath;

// Make sure the API key exists.
if (
    !defined("OPENWEATHER_API_KEY") ||
    empty(OPENWEATHER_API_KEY) ||
    OPENWEATHER_API_KEY === "your_api_key_here"
) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "OpenWeather API key is missing from config.php."
    ]);

    exit;
}

// Get the city and country code sent by JavaScript.
$city = trim($_GET["city"] ?? "");
$countryCode = strtoupper(trim($_GET["country"] ?? ""));

// Validate the city name.
if ($city === "" || mb_strlen($city) < 2 || mb_strlen($city) > 100) {
    echo json_encode([
        "success" => true,
        "locations" => []
    ]);

    exit;
}

// Validate the two-letter country code.
if (!preg_match('/^[A-Z]{2}$/', $countryCode)) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "A valid country code is required."
    ]);

    exit;
}

// Build the OpenWeather Geocoding API request.
$query = urlencode($city . "," . $countryCode);

$url = "https://api.openweathermap.org/geo/1.0/direct"
     . "?q=" . $query
     . "&limit=5"
     . "&appid=" . urlencode(OPENWEATHER_API_KEY);

// Set a timeout so the request does not wait indefinitely.
$options = [
    "http" => [
        "method" => "GET",
        "timeout" => 10,
        "ignore_errors" => true
    ]
];

$context = stream_context_create($options);

// Request matching locations from OpenWeather.
$response = @file_get_contents($url, false, $context);

if ($response === false) {
    http_response_code(502);

    echo json_encode([
        "success" => false,
        "message" => "The server could not reach OpenWeather. Check server network access and PHP URL access settings."
    ]);

    exit;
}

// Convert the response into a PHP array.
$locations = json_decode($response, true);

// Handle an invalid response from the API.
if (!is_array($locations)) {
    http_response_code(502);

    echo json_encode([
        "success" => false,
        "message" => "Invalid response from the location service."
    ]);

    exit;
}

// OpenWeather returns an object with a message when the API key or request is rejected.
if (isset($locations["message"]) || isset($locations["cod"])) {
    http_response_code(502);

    echo json_encode([
        "success" => false,
        "message" => "The location service rejected the search. Check the OpenWeather API key and quota."
    ]);

    exit;
}

// Prepare only the information our frontend needs.
$results = [];

foreach ($locations as $location) {
    if (
        !isset($location["name"], $location["lat"], $location["lon"])
        || !isset($location["country"])
    ) {
        continue;
    }

    // Only return results matching the selected country.
    if (strtoupper($location["country"]) !== $countryCode) {
        continue;
    }

    $results[] = [
        "name" => $location["name"],
        "country" => $location["country"],
        "state" => $location["state"] ?? "",
        "latitude" => $location["lat"],
        "longitude" => $location["lon"]
    ];
}

// Send the suggestions back to JavaScript.
echo json_encode([
    "success" => true,
    "locations" => $results
], JSON_UNESCAPED_UNICODE);
