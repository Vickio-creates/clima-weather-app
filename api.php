<?php
header("Content-Type: application/json; charset=utf-8");

function apiJsonError(int $status, string $message): void
{
    http_response_code($status);

    $encodedError = json_encode(["error" => $message]);

    if ($encodedError === false) {
        $encodedError = '{"error":"The request could not be completed."}';
    }

    echo $encodedError;
    exit;
}

function requestOpenWeather(string $url): array
{
    if (!function_exists('curl_init')) {
        return ["status" => 0, "data" => null, "failure" => "transport"];
    }

    $handle = curl_init($url);

    if ($handle === false) {
        return ["status" => 0, "data" => null, "failure" => "transport"];
    }

    curl_setopt_array($handle, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_HTTPHEADER => ["Accept: application/json"],
    ]);

    $body = curl_exec($handle);
    $curlError = curl_errno($handle);
    $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    curl_close($handle);

    if ($body === false) {
        return [
            "status" => $status,
            "data" => null,
            "failure" => $curlError === CURLE_OPERATION_TIMEDOUT
                ? "timeout"
                : "transport",
        ];
    }

    $data = json_decode($body, true);

    if (!is_array($data)) {
        return ["status" => $status, "data" => null, "failure" => "invalid_json"];
    }

    return ["status" => $status, "data" => $data, "failure" => null];
}

function sendOpenWeatherError(array $response): void
{
    $failure = $response["failure"] ?? null;
    $status = (int) ($response["status"] ?? 0);
    $data = is_array($response["data"] ?? null) ? $response["data"] : [];
    $providerCode = isset($data["cod"]) ? apiOpenWeatherCode($data["cod"]) : 0;

    if ($failure === "timeout") {
        apiJsonError(504, "The weather service timed out. Please try again.");
    }

    if ($failure === "transport") {
        apiJsonError(502, "Could not connect to OpenWeather right now.");
    }

    if ($status === 404 || $providerCode === 404) {
        apiJsonError(404, "City not found.");
    }

    if (in_array($status, [401, 403], true) || in_array($providerCode, [401, 403], true)) {
        apiJsonError(502, "Weather service authentication failed.");
    }

    if ($status === 429 || $providerCode === 429) {
        apiJsonError(503, "Weather service quota is temporarily unavailable.");
    }

    if ($status >= 500 || $providerCode >= 500) {
        apiJsonError(502, "Weather service is temporarily unavailable.");
    }

    if ($failure === "invalid_json") {
        apiJsonError(502, "OpenWeather returned an invalid response.");
    }

    apiJsonError(502, "Weather service rejected the request.");
}

function validateOpenWeatherStatus(array $response): array
{
    $status = (int) ($response["status"] ?? 0);
    $data = $response["data"] ?? null;

    if (
        ($response["failure"] ?? null) !== null ||
        $status < 200 ||
        $status >= 300
    ) {
        sendOpenWeatherError($response);
    }

    if (!is_array($data)) {
        apiJsonError(502, "OpenWeather returned an invalid response.");
    }

    if (array_key_exists("cod", $data)) {
        $providerCode = apiOpenWeatherCode($data["cod"]);

        if ($providerCode === 0) {
            apiJsonError(502, "OpenWeather returned an invalid response.");
        }

        if ($providerCode !== 200) {
            sendOpenWeatherError($response);
        }
    }

    return $data;
}

function apiIsFiniteNumeric($value): bool
{
    if (
        !is_int($value) &&
        !is_float($value) &&
        !(is_string($value) && is_numeric($value))
    ) {
        return false;
    }

    return is_finite((float) $value);
}

function apiOpenWeatherCode($value): int
{
    if (is_int($value)) {
        return $value;
    }

    if (is_string($value) && preg_match('/^\d{3}$/D', $value)) {
        return (int) $value;
    }

    return 0;
}

function apiOptionalNumericIsValid(array $data, string $key): bool
{
    return !array_key_exists($key, $data) ||
        $data[$key] === null ||
        apiIsFiniteNumeric($data[$key]);
}

function apiOptionalIntegerInRangeIsValid(array $data, string $key, int $minimum, int $maximum): bool
{
    if (!array_key_exists($key, $data) || $data[$key] === null) {
        return true;
    }

    if (!apiIsFiniteNumeric($data[$key])) {
        return false;
    }

    $value = (float) $data[$key];

    return $value >= $minimum &&
        $value <= $maximum &&
        floor($value) === $value;
}

function apiIsValidForecastDateTime(string $value): bool
{
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/D', $value, $parts)) {
        return false;
    }

    $year = (int) $parts[1];
    $month = (int) $parts[2];
    $day = (int) $parts[3];
    $hour = (int) $parts[4];
    $minute = (int) $parts[5];
    $second = (int) $parts[6];

    return checkdate($month, $day, $year) &&
        $hour >= 0 && $hour <= 23 &&
        $minute >= 0 && $minute <= 59 &&
        $second >= 0 && $second <= 59;
}

function apiIsReasonableForecastTimestamp($value, int $now): bool
{
    if (!apiIsFiniteNumeric($value)) {
        return false;
    }

    $timestamp = (float) $value;
    $earliestAllowed = $now - 86400;
    // The endpoint covers five days; the extra day allows for clock skew and forecast-boundary rounding.
    $latestAllowed = $now + (6 * 86400);

    return $timestamp >= $earliestAllowed &&
        $timestamp <= $latestAllowed &&
        floor($timestamp) === $timestamp;
}

function apiOptionalStringIsValid(array $data, string $key): bool
{
    return !array_key_exists($key, $data) ||
        $data[$key] === null ||
        is_string($data[$key]);
}

function apiOptionalNumericValue(array $data, string $key, $fallback)
{
    if (!array_key_exists($key, $data) || $data[$key] === null) {
        return $fallback;
    }

    return $data[$key] + 0;
}

function apiOptionalStringValue(array $data, string $key, string $fallback): string
{
    if (!array_key_exists($key, $data) || $data[$key] === null) {
        return $fallback;
    }

    return $data[$key];
}

$configPath = __DIR__ . '/config.php';

if (!file_exists($configPath)) {
    apiJsonError(500, "OpenWeather is not configured.");
}

require_once $configPath;

if (!defined('OPENWEATHER_API_KEY') || OPENWEATHER_API_KEY === '' || OPENWEATHER_API_KEY === 'your_api_key_here') {
    apiJsonError(500, "OpenWeather is not configured.");
}

foreach (["city", "lat", "lon"] as $parameter) {
    if (array_key_exists($parameter, $_GET) && !is_string($_GET[$parameter])) {
        apiJsonError(400, "Query parameters must be single text values.");
    }
}

$city = trim($_GET["city"] ?? "");
$lat = trim($_GET["lat"] ?? "");
$lon = trim($_GET["lon"] ?? "");
$hasCoordinates = $lat !== "" || $lon !== "";

if ($hasCoordinates) {
    $latitude = filter_var($lat, FILTER_VALIDATE_FLOAT);
    $longitude = filter_var($lon, FILTER_VALIDATE_FLOAT);

    if (
        $latitude === false ||
        $longitude === false ||
        $latitude < -90 ||
        $latitude > 90 ||
        $longitude < -180 ||
        $longitude > 180
    ) {
        apiJsonError(400, "Please provide a valid latitude and longitude.");
    }

    $weatherQuery = "lat=" . urlencode((string) $latitude) . "&lon=" . urlencode((string) $longitude);
} else {
    if ($city === "") {
        apiJsonError(400, "City is required.");
    }

    if (mb_strlen($city) > 60 || !preg_match("/^[\p{L}\p{M}\p{Zs}.'’-]+$/u", $city)) {
        apiJsonError(400, "Please enter a valid city name.");
    }

    $weatherQuery = "q=" . urlencode($city);
}

$apiKey = OPENWEATHER_API_KEY;

/*
  1. Current weather request
*/
$currentUrl = "https://api.openweathermap.org/data/2.5/weather?" . $weatherQuery . "&appid=" . urlencode($apiKey) . "&units=metric";

$currentResponse = requestOpenWeather($currentUrl);
$currentData = validateOpenWeatherStatus($currentResponse);

$currentMain = $currentData["main"] ?? null;
$currentWeather = $currentData["weather"] ?? null;
$currentWeatherEntry = is_array($currentWeather) && isset($currentWeather[0])
    ? $currentWeather[0]
    : null;
$currentSystem = $currentData["sys"] ?? null;
$currentWind = $currentData["wind"] ?? [];
$currentClouds = $currentData["clouds"] ?? [];
$currentCity = $currentData["name"] ?? $city;

if (
    !is_string($currentCity) ||
    trim($currentCity) === "" ||
    !is_array($currentMain) ||
    !apiIsFiniteNumeric($currentMain["temp"] ?? null) ||
    !is_array($currentWeather) ||
    !isset($currentWeather[0]) ||
    !is_array($currentWeatherEntry) ||
    !is_string($currentWeatherEntry["main"] ?? null) ||
    trim($currentWeatherEntry["main"]) === "" ||
    !is_array($currentSystem) ||
    !is_string($currentSystem["country"] ?? null) ||
    !preg_match('/^[A-Za-z]{2}$/D', $currentSystem["country"]) ||
    !is_array($currentWind) ||
    !is_array($currentClouds) ||
    !apiOptionalNumericIsValid($currentMain, "temp_max") ||
    !apiOptionalNumericIsValid($currentMain, "temp_min") ||
    !apiOptionalNumericIsValid($currentMain, "feels_like") ||
    !apiOptionalNumericIsValid($currentMain, "humidity") ||
    !apiOptionalNumericIsValid($currentWind, "speed") ||
    !apiOptionalStringIsValid($currentWeatherEntry, "description") ||
    !apiOptionalNumericIsValid($currentClouds, "all") ||
    !apiOptionalNumericIsValid($currentData, "visibility") ||
    !apiOptionalNumericIsValid($currentSystem, "sunrise") ||
    !apiOptionalNumericIsValid($currentSystem, "sunset") ||
    // OpenWeather reports timezone as seconds from UTC; this broad bound allows a full day either side.
    !apiOptionalIntegerInRangeIsValid($currentData, "timezone", -86400, 86400)
) {
    apiJsonError(502, "OpenWeather returned incomplete current weather data.");
}

$timezoneOffset = (int) apiOptionalNumericValue($currentData, "timezone", 0);

/*
2. Forecast request
*/
$forecastUrl = "https://api.openweathermap.org/data/2.5/forecast?" . $weatherQuery . "&appid=" . urlencode($apiKey) . "&units=metric";

$forecastResponse = requestOpenWeather($forecastUrl);
$forecastData = validateOpenWeatherStatus($forecastResponse);

if (!isset($forecastData["list"]) || !is_array($forecastData["list"]) || !$forecastData["list"]) {
    apiJsonError(502, "OpenWeather returned incomplete forecast data.");
}

$forecastItems = $forecastData["list"];
$forecastValidationTime = time();

foreach ($forecastItems as $forecastIndex => $forecastItem) {
    if (!is_array($forecastItem)) {
        apiJsonError(502, "OpenWeather returned incomplete forecast data.");
    }

    $forecastMain = $forecastItem["main"] ?? null;
    $forecastWeather = $forecastItem["weather"] ?? null;
    $forecastWeatherEntry = is_array($forecastWeather) && isset($forecastWeather[0])
        ? $forecastWeather[0]
        : null;

    if (
        !is_string($forecastItem["dt_txt"] ?? null) ||
        !apiIsValidForecastDateTime($forecastItem["dt_txt"]) ||
        !apiIsReasonableForecastTimestamp($forecastItem["dt"] ?? null, $forecastValidationTime) ||
        !is_array($forecastMain) ||
        !apiIsFiniteNumeric($forecastMain["temp"] ?? null) ||
        !is_array($forecastWeather) ||
        !isset($forecastWeather[0]) ||
        !is_array($forecastWeatherEntry) ||
        !is_string($forecastWeatherEntry["main"] ?? null) ||
        trim($forecastWeatherEntry["main"]) === "" ||
        !apiOptionalNumericIsValid($forecastMain, "temp_max") ||
        !apiOptionalNumericIsValid($forecastMain, "temp_min") ||
        !apiOptionalStringIsValid($forecastWeatherEntry, "description")
    ) {
        apiJsonError(502, "OpenWeather returned incomplete forecast data.");
    }

    $forecastTimestamp = (int) ($forecastItem["dt"] + 0);

    if (gmdate('Y-m-d H:i:s', $forecastTimestamp) !== $forecastItem["dt_txt"]) {
        apiJsonError(502, "OpenWeather returned incomplete forecast data.");
    }

    // Normalize accepted numeric strings before the builders use or serialize them.
    $forecastItems[$forecastIndex]["dt"] = $forecastTimestamp;
    $forecastItems[$forecastIndex]["main"]["temp"] = $forecastMain["temp"] + 0;

    foreach (["temp_max", "temp_min"] as $temperatureKey) {
        if (array_key_exists($temperatureKey, $forecastMain) && $forecastMain[$temperatureKey] !== null) {
            $forecastItems[$forecastIndex]["main"][$temperatureKey] = $forecastMain[$temperatureKey] + 0;
        }
    }
}

$forecast = buildDailyForecast($forecastItems);
$hourly = buildHourlyForecast($forecastItems);

/*
3. Final response sent to JavaScript
*/
$responsePayload = [
    "city" => $currentCity,
    "country" => getCountryName($currentSystem["country"]),
    "temperature" => round((float) $currentMain["temp"]),
    "highTemp" => round((float) apiOptionalNumericValue($currentMain, "temp_max", 0)),
    "lowTemp" => round((float) apiOptionalNumericValue($currentMain, "temp_min", 0)),
    "feelsLike" => round((float) apiOptionalNumericValue($currentMain, "feels_like", 0)),
    "humidity" => apiOptionalNumericValue($currentMain, "humidity", null),
    "windSpeed" => round((float) apiOptionalNumericValue($currentWind, "speed", 0), 1),
    "condition" => $currentWeatherEntry["main"],
    "description" => apiOptionalStringValue($currentWeatherEntry, "description", "Unknown"),
    "clouds" => apiOptionalNumericValue($currentClouds, "all", null),
    "visibility" => apiOptionalNumericValue($currentData, "visibility", null),
    "sunrise" => apiOptionalNumericValue($currentSystem, "sunrise", null),
    "sunset" => apiOptionalNumericValue($currentSystem, "sunset", null),
    "timezoneOffset" => $timezoneOffset,
    "todayGlance" => buildTodayGlance($forecastItems, $timezoneOffset),
    "forecast" => $forecast,
    "hourly" => $hourly
];

$encodedResponse = json_encode($responsePayload);

if ($encodedResponse === false) {
    apiJsonError(502, "OpenWeather returned an invalid response.");
}

echo $encodedResponse;

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

function buildHourlyForecast(array $items): array
{
    $hourly = [];

    foreach (array_slice($items, 0, 6) as $item) {
        $hourly[] = [
            "dt" => $item["dt"] ?? null,
            "time" => $item["dt_txt"] ?? "",
            "temp" => round($item["main"]["temp"] ?? 0),
            "condition" => $item["weather"][0]["main"] ?? "Unknown",
            "description" => $item["weather"][0]["description"] ?? "Unknown"
        ];
    }

    return $hourly;
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
function buildTodayGlance(array $items, int $timezoneOffset): array
{
    $today = gmdate('Y-m-d', time() + $timezoneOffset);
    $currentHour = (int) gmdate('G', time() + $timezoneOffset);

    $periods = [
        ['period' => 'Morning', 'start' => 6, 'end' => 12, 'target' => 9],
        ['period' => 'Afternoon', 'start' => 12, 'end' => 18, 'target' => 15],
        ['period' => 'Evening', 'start' => 18, 'end' => 21, 'target' => 19.5],
        ['period' => 'Night', 'start' => 21, 'end' => 24, 'target' => 22.5],
    ];

    $result = [];

    foreach ($periods as $period) {
        $bestItem = null;
        $bestDistance = INF;

        foreach ($items as $item) {
            $timestamp = (int) ($item['dt'] ?? 0);

            if ($timestamp <= 0 || !isset($item['main']['temp'])) {
                continue;
            }

            $localTimestamp = $timestamp + $timezoneOffset;
            $forecastDate = gmdate('Y-m-d', $localTimestamp);
            $hour = (int) gmdate('G', $localTimestamp);
            $minute = (int) gmdate('i', $localTimestamp);
            $forecastHour = $hour + ($minute / 60);
            $targetHour = $period['target'];

            if ($forecastDate === $today) {
                if ($forecastHour < $period['start'] || $forecastHour >= $period['end']) {
                    continue;
                }
            } elseif (
                $period['period'] === 'Night'
                && $currentHour >= 21
                && $forecastDate === gmdate('Y-m-d', time() + $timezoneOffset + 86400)
                && $hour < 6
            ) {
                // After 9 PM, early tomorrow morning is part of tonight.
                $forecastHour += 24;
                $targetHour = 27;
            } else {
                continue;
            }

            $distance = abs($forecastHour - $targetHour);

            if ($distance < $bestDistance) {
                $bestItem = $item;
                $bestDistance = $distance;
            }
        }

        $result[] = [
            'period' => $period['period'],
            'temperature' => $bestItem === null
                ? null
                : round((float) $bestItem['main']['temp']),
            'condition' => $bestItem['weather'][0]['main'] ?? null,
            'description' => $bestItem['weather'][0]['description'] ?? null,
        ];
    }

    return $result;
}
