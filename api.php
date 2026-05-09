<?php
require_once 'config.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$city = isset($_GET["city"]) ? trim($_GET["city"]) : "";

if ($city === "") {
    http_response_code(422);
    echo json_encode(["error" => "City is required."]);
    exit;
}

$apiKey = OPENWEATHER_API_KEY;
$url = "https://api.openweathermap.org/data/2.5/weather?q={$city}&appid={$apiKey}&units=metric";
$response = file_get_contents($url);
$data = json_decode($response, true);

if(!$data || $data["cod"] !== 200){
    http_response_code(404);
    echo json_encode(["error" => "City not found."]);
    exit;
}

echo json_encode([
    "city" => $data["name"],
    "country" => $data["sys"]["country"],
    "temperature" => round($data["main"]["temp"]),
    "condition" => $data["weather"][0]["main"]
]);