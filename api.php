<?php
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");

$configPath = __DIR__ . '/config.php';

if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode([
        "error" => "Missing config.php. Copy config.example.php to config.php and add your OpenWeather API key."
    ]);
    exit;
}

require_once $configPath;

if (!defined('OPENWEATHER_API_KEY') || OPENWEATHER_API_KEY === '' || OPENWEATHER_API_KEY === 'your_api_key_here') {
    http_response_code(500);
    echo json_encode(["error" => "OpenWeather API key is not configured."]);
    exit;
}

$city = isset($_GET["city"]) ? trim($_GET["city"]) : "";

if ($city === "") {
    http_response_code(422);
    echo json_encode(["error" => "City is required."]);
    exit;
}

if (mb_strlen($city) > 60 || !preg_match("/^[\p{L}\s.'-]+$/u", $city)) {
    http_response_code(422);
    echo json_encode(["error" => "Please enter a valid city name."]);
    exit;
}

$apiKey = OPENWEATHER_API_KEY;

/*
  1. Current weather request
*/
$currentUrl = "https://api.openweathermap.org/data/2.5/weather?q=" . urlencode($city) . "&appid=" . urlencode($apiKey) . "&units=metric";

$currentResponse = @file_get_contents($currentUrl);

if ($currentResponse === false) {
    http_response_code(502);
    echo json_encode(["error" => "Could not connect to OpenWeather right now."]);
    exit;
}

$currentData = json_decode($currentResponse, true);
$currentCode = isset($currentData["cod"]) ? (int) $currentData["cod"] : 0;

if (!$currentData || $currentCode !== 200) {
    http_response_code(404);
    echo json_encode(["error" => "City not found."]);
    exit;
}

/*
2. Forecast request
*/
$forecastUrl = "https://api.openweathermap.org/data/2.5/forecast?q=" . urlencode($city) . "&appid=" . urlencode($apiKey) . "&units=metric";

$forecastResponse = @file_get_contents($forecastUrl);
$forecastData = json_decode($forecastResponse, true);

$forecast = [];

if ($forecastResponse !== false && isset($forecastData["list"]) && is_array($forecastData["list"])) {
    $forecast = buildDailyForecast($forecastData["list"]);
}

/*
3. Final response sent to JavaScript
*/
echo json_encode([
    "city" => $currentData["name"] ?? $city,
    "country" => getCountryName($currentData["sys"]["country"] ?? ""),
    "temperature" => round($currentData["main"]["temp"] ?? 0),
    "highTemp" => round($currentData["main"]["temp_max"] ?? 0),
    "lowTemp" => round($currentData["main"]["temp_min"] ?? 0),
    "feelsLike" => round($currentData["main"]["feels_like"] ?? 0),
    "humidity" => $currentData["main"]["humidity"] ?? null,
    "windSpeed" => round($currentData["wind"]["speed"] ?? 0, 1),
    "condition" => $currentData["weather"][0]["main"] ?? "Unknown",
    "description" => $currentData["weather"][0]["description"] ?? "Unknown",
    "clouds" => $currentData["clouds"]["all"] ?? null,
    "visibility" => $currentData["visibility"] ?? null,
    "sunrise" => $currentData["sys"]["sunrise"] ?? null,
    "sunset" => $currentData["sys"]["sunset"] ?? null,
    "forecast" => $forecast
]);

function buildDailyForecast(array $items): array
{
    $daily = [];

    foreach ($items as $item) {
        if (!isset($item["dt_txt"])) {
            continue;
        }

        $date = substr($item["dt_txt"], 0, 10);
        $hour = substr($item["dt_txt"], 11, 8);

        if (!isset($daily[$date])) {
            $daily[$date] = [
                "date" => $date,
                "temp" => round($item["main"]["temp"] ?? 0),
                "highTemp" => round($item["main"]["temp_max"] ?? 0),
                "lowTemp" => round($item["main"]["temp_min"] ?? 0),
                "condition" => $item["weather"][0]["main"] ?? "Unknown",
                "description" => $item["weather"][0]["description"] ?? "Unknown",
                "priority" => 99
            ];
        }

        /*
          Prefer forecast around 12:00 because it represents daytime better.
          If 12:00 is not available for that day, keep the first available value.
        */
        $priority = abs((int) substr($hour, 0, 2) - 12);

        if ($priority < $daily[$date]["priority"]) {
            $daily[$date] = [
                "date" => $date,
                "temp" => round($item["main"]["temp"] ?? 0),
                "highTemp" => round($item["main"]["temp_max"] ?? 0),
                "lowTemp" => round($item["main"]["temp_min"] ?? 0),
                "condition" => $item["weather"][0]["main"] ?? "Unknown",
                "description" => $item["weather"][0]["description"] ?? "Unknown",
                "priority" => $priority
            ];
        }
    }

    $result = array_values($daily);

    foreach ($result as &$day) {
        unset($day["priority"]);
    }

    return array_slice($result, 0, 7);
}

function getCountryName(string $code): string
{
    $code = strtoupper($code);

    $countries = [
        "LT" => "Lithuania",
        "FR" => "France",
        "GB" => "United Kingdom",
        "US" => "United States",
        "DE" => "Germany",
        "JP" => "Japan",
        "RU" => "Russia",
        "NL" => "Netherlands",
        "BE" => "Belgium",
        "PL" => "Poland",
        "CM" => "Cameroon",
        "AU" => "Australia",
        "CN" => "China",
        "ES" => "Spain",
        "IT" => "Italy",
        "CA" => "Canada",
        "AE" => "United Arab Emirates",
        "SE" => "Sweden",
        "NO" => "Norway",
        "DK" => "Denmark",
        "PT" => "Portugal",
        "LV" => "Latvia",
        "EE" => "Estonia",
        "FI" => "Finland"
    ];

    return $countries[$code] ?? $code;
}