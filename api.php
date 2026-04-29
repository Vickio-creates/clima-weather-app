<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$city = isset($_GET["city"]) ? trim($_GET["city"]) : "";

if ($city === "") {
    http_response_code(422);
    echo json_encode(["error" => "City is required."]);
    exit;
}

if (mb_strlen($city) > 60) {
    http_response_code(422);
    echo json_encode(["error" => "City name is too long."]);
    exit;
}

if (!preg_match("/^[\p{L}\s'-]+$/u", $city)) {
    http_response_code(422);
    echo json_encode(["error" => "City can contain only letters, spaces, apostrophes, and hyphens."]);
    exit;
}

$cityMap = [
    "london" => "United Kingdom",
    "paris" => "France",
    "klaipeda" => "Lithuania",
    "vilnius" => "Lithuania",
    "nantes" => "France",
    "douala" => "Cameroon",
    "new york" => "United States",
    "los angeles" => "United States",
    "chicago" => "United States",
    "tokyo" => "Japan",
    "osaka" => "Japan",
    "berlin" => "Germany",
    "munich" => "Germany",
    "madrid" => "Spain",
    "barcelona" => "Spain",
    "rome" => "Italy",
    "milan" => "Italy",
    "toronto" => "Canada",
    "dubai" => "United Arab Emirates",
    "sydney" => "Australia",
    "beijing" => "China",
    "shanghai" => "China",
    "moscow" => "Russia",
    "amsterdam" => "Netherlands",
    "brussels" => "Belgium",
    "stockholm" => "Sweden",
    "oslo" => "Norway",
    "copenhagen" => "Denmark",
    "warsaw" => "Poland",
    "lisbon" => "Portugal"
];

$cityLower = strtolower($city);
if(array_key_exists($cityLower, $cityMap)){
    $country = $cityMap[$cityLower];
} else{
    $country = "city not found";
}

$temperatureMap = [
    "london" => 14,
    "paris" => 17,
    "klaipeda" => 8,
    "vilnius" => 7,
    "nantes" => 16,
    "douala" => 32,
    "new york" => 22,
    "los angeles" => 28,
    "chicago" => 18,
    "tokyo" => 25,
    "osaka" => 24,
    "berlin" => 11,
    "munich" => 10,
    "madrid" => 26,
    "barcelona" => 24,
    "rome" => 23,
    "milan" => 19,
    "toronto" => 9,
    "dubai" => 38,
    "sydney" => 19,
    "beijing" => 20,
    "shanghai" => 22,
    "moscow" => 4,
    "amsterdam" => 13,
    "brussels" => 12,
    "stockholm" => 8,
    "oslo" => 6,
    "copenhagen" => 9,
    "warsaw" => 10,
    "lisbon" => 21
];
if(array_key_exists($cityLower, $temperatureMap)){
    $temperature = $temperatureMap[$cityLower];
}else{
    $temperature = null;
}

$conditionMap = [
    "london" => "Cloudy",
    "paris" => "Sunny",
    "klaipeda" => "Windy",
    "vilnius" => "Partly Cloudy",
    "nantes" => "Rainy",
    "douala" => "Stormy",
    "new york" => "Partly Cloudy",
    "los angeles" => "Sunny",
    "chicago" => "Windy",
    "tokyo" => "Clear",
    "osaka" => "Sunny",
    "berlin" => "Overcast",
    "munich" => "Cloudy",
    "madrid" => "Sunny",
    "barcelona" => "Sunny",
    "rome" => "Sunny",
    "milan" => "Partly Cloudy",
    "toronto" => "Rainy",
    "dubai" => "Sunny",
    "sydney" => "Windy",
    "beijing" => "Partly Cloudy",
    "shanghai" => "Cloudy",
    "moscow" => "Snowy",
    "amsterdam" => "Rainy",
    "brussels" => "Overcast",
    "stockholm" => "Snowy",
    "oslo" => "Snowy",
    "copenhagen" => "Cloudy",
    "warsaw" => "Overcast",
    "lisbon" => "Sunny"
];
if(array_key_exists($cityLower, $conditionMap)){
    $condition = $conditionMap[$cityLower];
}else{
    $condition = "Unknown";
}

$data = [
    "city" => $city,
    "country" => $country,
    "temperature" => $temperature,
    "condition" => $condition
];

echo json_encode($data);