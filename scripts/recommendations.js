function getWearRecommendation(temperature, condition) {
  if (temperature <= -10) return "Heavy coat & layers";
  if (temperature <= 0) return "Warm jacket";
  if (temperature <= 10) return "Light jacket";
  if (temperature <= 20) return "Light layers";
  if (temperature <= 28) return "T-shirt";
  return "Light & breathable clothing";
}

function getUmbrellaRecommendation(condition) {
  const rainyConditions = ["Rain", "Drizzle", "Thunderstorm", "Snow", "Mist"];
  return rainyConditions.includes(condition) ? "Recommended" : "Not needed";
}

function getWeatherIcon(condition) {
  const icons = {
    Sunny: "sun",
    Clouds: "cloud",
    Cloudy: "cloud",
    "Partly Cloudy": "cloud-sun",
    Overcast: "cloudy",
    Rain: "cloud-rain",
    Rainy: "cloud-rain",
    Thunderstorm: "cloud-lightning",
    Stormy: "cloud-lightning",
    Snow: "cloud-snow",
    Snowy: "cloud-snow",
    Windy: "wind",
    Clear: "sun",
    Mist: "cloud-fog",
    Drizzle: "cloud-drizzle",
    Unknown: "cloud",
  };
  return icons[condition] || "cloud";
}

function formatConditionLabel(condition, description) {
  if (description) {
    return description.charAt(0).toUpperCase() + description.slice(1);
  }
  return condition || "Unknown";
}
