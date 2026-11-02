<?php

header("Content-Type: application/json; charset=UTF-8");

function locationSearchError(int $status, string $message): void
{
    http_response_code($status);
    echo json_encode([
        "success" => false,
        "message" => $message,
    ]);
    exit;
}

function locationSearchNoResults(): void
{
    echo json_encode([
        "success" => true,
        "locations" => [],
    ]);
    exit;
}

$configPath = __DIR__ . "/config.php";

if (!is_file($configPath)) {
    locationSearchError(500, "OpenWeather is not configured.");
}

require_once $configPath;

// Make sure the API key exists.
if (
    !defined("OPENWEATHER_API_KEY") ||
    empty(OPENWEATHER_API_KEY) ||
    OPENWEATHER_API_KEY === "your_api_key_here"
) {
    locationSearchError(500, "OpenWeather is not configured.");
}

// Get the city and country code sent by JavaScript.
$cityValue = $_GET["city"] ?? "";
$countryValue = $_GET["country"] ?? "";

if (!is_string($cityValue) || !is_string($countryValue)) {
    locationSearchError(400, "City and country must be single text values.");
}

// Validate the original input before trim() can remove control characters.
if (
    preg_match('//u', $cityValue) !== 1 ||
    preg_match('/\p{Cc}/u', $cityValue) === 1
) {
    locationSearchError(400, "Please enter a valid city name.");
}

$city = trim($cityValue);

// Validate the city name.
if (
    mb_strlen($city) > 100 ||
    ($city !== "" && preg_match('/^[\p{L}\p{M}\p{Zs}.\'’‘\p{Pd}]+$/u', $city) !== 1) ||
    ($city !== "" && preg_match('/\p{L}/u', $city) !== 1)
) {
    locationSearchError(400, "Please enter a valid city name.");
}

// Short terms are normal while typing and need no upstream request.
if ($city === "" || mb_strlen($city) < 2) {
    locationSearchNoResults();
}

// Validate the country code after short autocomplete terms have been handled.
$countryCode = strtoupper(trim($countryValue));

if (!preg_match('/^[A-Z]{2}$/', $countryCode)) {
    locationSearchError(400, "A valid country code is required.");
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
    locationSearchError(502, "Could not connect to the location service right now.");
}

$upstreamStatus = 0;
foreach ($http_response_header ?? [] as $headerLine) {
    if (preg_match('/^HTTP\/\S+\s+(\d{3})\b/i', $headerLine, $matches)) {
        $upstreamStatus = (int) $matches[1];
    }
}

// Decode both forms so an empty JSON list can be distinguished from an object.
$decodedResponse = json_decode($response);
$locations = json_decode($response, true);
$isEmptyLocationList = is_array($decodedResponse) && $decodedResponse === [];

$providerCode = is_array($locations) && isset($locations["cod"])
    ? (int) $locations["cod"]
    : 0;

if ($upstreamStatus === 404) {
    if ($isEmptyLocationList) {
        locationSearchNoResults();
    }

    locationSearchError(502, "Location service rejected the search.");
}

if (in_array($upstreamStatus, [401, 403], true) || in_array($providerCode, [401, 403], true)) {
    locationSearchError(502, "Location service authentication failed.");
}

if ($upstreamStatus === 429 || $providerCode === 429) {
    locationSearchError(503, "Location service quota is temporarily unavailable.");
}

if ($upstreamStatus >= 500 || $providerCode >= 500) {
    locationSearchError(502, "Location service is temporarily unavailable.");
}

if ($upstreamStatus < 200 || $upstreamStatus >= 300) {
    locationSearchError(502, "Location service rejected the search.");
}

// Handle an invalid response from the API.
if (!is_array($locations)) {
    locationSearchError(502, "Location service returned an invalid response.");
}

if (!is_array($decodedResponse)) {
    locationSearchError(502, "Location service returned an invalid response.");
}

// OpenWeather returns an object with a message when the API key or request is rejected.
if (isset($locations["message"]) || isset($locations["cod"])) {
    locationSearchError(502, "Location service rejected the search.");
}

// Prepare only the information our frontend needs.
$results = [];

foreach ($locations as $location) {
    if (!is_array($location)) {
        continue;
    }

    if (
        !isset($location["name"], $location["country"], $location["lat"], $location["lon"])
        || !is_string($location["name"])
        || trim($location["name"]) === ""
        || !is_string($location["country"])
        || trim($location["country"]) === ""
        || (array_key_exists("state", $location) && !is_string($location["state"]))
        || !is_numeric($location["lat"])
        || !is_numeric($location["lon"])
    ) {
        continue;
    }

    $latitude = (float) $location["lat"];
    $longitude = (float) $location["lon"];

    if (
        !is_finite($latitude) ||
        !is_finite($longitude) ||
        $latitude < -90 ||
        $latitude > 90 ||
        $longitude < -180 ||
        $longitude > 180
    ) {
        continue;
    }

    $locationCountry = strtoupper(trim($location["country"]));

    // Only return results matching the selected country.
    if ($locationCountry !== $countryCode) {
        continue;
    }

    $results[] = [
        "name" => $location["name"],
        "country" => $locationCountry,
        "state" => $location["state"] ?? "",
        "latitude" => $latitude,
        "longitude" => $longitude
    ];
}

// Send the suggestions back to JavaScript.
echo json_encode([
    "success" => true,
    "locations" => $results
], JSON_UNESCAPED_UNICODE);
