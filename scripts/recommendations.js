// Run this code after the recommendations page has fully loaded.
document.addEventListener("DOMContentLoaded", () => {
  // Find the Refresh recommendations button.
  const loadButton = document.querySelector("#load-recommendations-btn");

  // Stop if this page does not have the recommendations button.
  if (!loadButton) return;

  // Load recommendations when the button is clicked.
  loadButton.addEventListener("click", async () => {
    await loadRecommendationsFromPython();
  });

  // Render Lucide icons.
  if (window.lucide) lucide.createIcons();
});


// Main function: get weather, send it to Python through PHP, and display the result.
async function loadRecommendationsFromPython() {
  const loadButton = document.querySelector("#load-recommendations-btn");

  try {
    // Disable button while loading.
    loadButton.disabled = true;

    // Show loading message.
    setRecommendationStatus("Loading Python-based recommendations...");

    // Get the logged-in user from the current PHP session.
    const user =
      typeof requireClimaAuth === "function" ? await requireClimaAuth() : null;

    // Stop if no user is found.
    if (!user) return;

    // Use the saved profile location, or use Klaipėda as default.
    const userLocation = user.location || "Klaipėda, Lithuania";

    // api.php expects only the city name.
    const city = getCityFromLocation(userLocation);

    // Step 1: Get weather data from the existing Clima weather API.
    const weatherResponse = await fetch(`api.php?city=${encodeURIComponent(city)}`);
    const weatherData = await weatherResponse.json();

    if (!weatherResponse.ok) {
      throw new Error(weatherData.error || "Could not load weather data.");
    }

    // Step 2: Update the top weather card.
    updateRecommendationWeatherCard(weatherData, userLocation);

    // Step 3: Send weather data to PHP.
    // PHP will send it to Python and return Python's recommendation result.
    const recommendationResponse = await fetch("backend/recommendations/generate.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        weather: weatherData,
      }),
    });

    const recommendationResult = await recommendationResponse.json();

    if (!recommendationResponse.ok) {
      throw new Error(
        recommendationResult.error || "Could not generate recommendations."
      );
    }

    // Step 4: Display the recommendation result returned by Python.
    updateRecommendationCards(recommendationResult.recommendations);

    // Show success message.
    setRecommendationStatus("Python recommendations updated successfully.");
  } catch (error) {
    // Show error message if something fails.
    setRecommendationStatus(error.message || "Could not load recommendations.");

    // Show full error in console for debugging.
    console.error("Recommendation error:", error);
  } finally {
    // Enable button again after loading.
    loadButton.disabled = false;

    // Re-render icons because the weather icon may have changed.
    if (window.lucide) lucide.createIcons();
  }
}


// Update the top weather summary card using data from api.php.
function updateRecommendationWeatherCard(data, userLocation) {
  const condition = data.condition || data.description || "Unknown";
  const conditionLabel = formatConditionLabel(condition, data.description);

  const temperature = Math.round(data.temperature);
  const feelsLike = Math.round(data.feelsLike ?? data.temperature);
  const humidity = data.humidity ?? "--";
  const windSpeed = data.windSpeed ?? "--";

  // Build a clean location label.
  const locationLabel = data.country
    ? `${data.city || getCityFromLocation(userLocation)}, ${data.country}`
    : userLocation;

  // Update location, temperature, and condition.
  setText("#recommendation-location", locationLabel);
  setText("#recommendation-temperature", `${temperature}°C`);
  setText("#recommendation-condition", conditionLabel);

  // Update weather detail sentence.
  setText(
    "#recommendation-weather-detail",
    `Feels like ${feelsLike}°C • Humidity ${humidity}% • Wind ${windSpeed} m/s`
  );

  // Update weather metrics.
  setText("#recommendation-humidity", `${humidity}%`);
  setText("#recommendation-wind", `${windSpeed} m/s`);
  setText("#recommendation-feels-like", `${feelsLike}°C`);

  // Update weather icon.
  const iconWrapper = document.querySelector("#recommendation-weather-icon");

  if (iconWrapper) {
    iconWrapper.innerHTML = `<i data-lucide="${getWeatherIcon(condition)}"></i>`;
  }
}


// Display Python recommendation result on the page.
function updateRecommendationCards(recommendations) {
  if (!recommendations) {
    setRecommendationStatus("No recommendation result was returned.");
    return;
  }

  const cards = recommendations.cards || {};
  const reasons = recommendations.reasons || {};

  const clothing = cards.clothing || {};
  const rain = cards.rain || {};
  const outdoor = cards.outdoor || {};
  const focus = cards.focus || {};

  // Assistant summary.
  setText(
    "#assistant-recommendation-text",
    recommendations.assistant || "Clima generated your daily recommendation."
  );

  // Clothing card.
  setText("#wear-recommendation-page", clothing.title || "Clothing advice");
  setText("#wear-recommendation-detail", clothing.detail || "No clothing detail available.");
  setText("#wear-recommendation-reason", clothing.reason || "No clothing reason available.");

  // Rain preparation card.
  setText("#umbrella-recommendation-page", rain.title || "Rain preparation");
  setText("#umbrella-recommendation-detail", rain.detail || "No rain detail available.");
  setText("#umbrella-recommendation-reason", rain.reason || "No rain reason available.");

  // Outdoor activity card.
  setText("#outdoor-recommendation-page", outdoor.title || "Outdoor activity");
  setText("#outdoor-recommendation-detail", outdoor.detail || "No outdoor detail available.");
  setText("#outdoor-recommendation-reason", outdoor.reason || "No outdoor reason available.");

  // Profile-based weather guidance card.
  setText("#focus-recommendation-page", focus.title || "Personal weather guidance");
  setText("#focus-recommendation-detail", focus.detail || "No profile-based weather guidance available.");
  setText("#focus-recommendation-reason", focus.reason || "No profile-based weather explanation available.");

  // Bottom explanation section.
  setText("#reason-temperature", reasons.temperature || clothing.reason || "Temperature checked.");
  setText("#reason-rain", reasons.rain || rain.reason || "Rain condition checked.");
  setText("#reason-profile", reasons.profile || outdoor.profileReason || "Profile preferences checked.");
  setText("#reason-humidity", reasons.humidity || "Humidity checked.");

  // Final explanation paragraph.
  setText(
    "#personalized-explanation",
    recommendations.explanation ||
      "Clima used your saved profile and current weather data to generate these recommendations."
  );
}


// Get only the city name from a saved location like "Klaipėda, Lithuania".
function getCityFromLocation(location) {
  return String(location || "Klaipėda")
    .split(",")[0]
    .trim();
}


// Choose a Lucide icon based on the weather condition.
function getWeatherIcon(condition) {
  const normalized = String(condition || "").toLowerCase();

  if (normalized.includes("thunder")) return "cloud-lightning";
  if (normalized.includes("drizzle")) return "cloud-drizzle";
  if (normalized.includes("rain")) return "cloud-rain";
  if (normalized.includes("snow")) return "cloud-snow";
  if (normalized.includes("wind")) return "wind";
  if (normalized.includes("mist")) return "droplets";
  if (normalized.includes("fog") || normalized.includes("haze")) return "cloud-fog";
  if (normalized.includes("cloud")) return "cloud";
  if (normalized.includes("clear") || normalized.includes("sun")) return "sun";

  return "cloud";
}


// Format condition text nicely.
function formatConditionLabel(condition, description = "") {
  const text = description || condition || "Unknown";

  return String(text)
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}


// Safely update text content on the page.
function setText(selector, value) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = value;
  }
}


// Show a message under the weather card.
function setRecommendationStatus(message) {
  setText("#recommendations-status", message);
}
