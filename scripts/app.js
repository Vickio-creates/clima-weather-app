const RECENT_SEARCH_LIMIT = 10;
const DASHBOARD_RECENT_LIMIT = 2;

document.addEventListener("DOMContentLoaded", async () => {
  const currentUser = typeof requireClimaAuth === "function" ? await requireClimaAuth() : null;
  if (!currentUser) return;

  if (typeof updateUserInterface === "function") {
    updateUserInterface(currentUser);
  }

  if (window.lucide) lucide.createIcons();

  displayDate();

  const cityInput = document.querySelector("#city-input");
  const searchIcon = document.querySelector("#search-icon") || document.querySelector(".input-box .lucide-search");

  if (cityInput) {
    cityInput.addEventListener("keydown", handleEnter);
  }

  if (searchIcon) {
    searchIcon.addEventListener("click", updateCity);
  }

  loadRecentSearches();
  initSearchHistoryModal();
});

function handleEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    updateCity();
  }
}

function updateCity() {
  const input = document.querySelector("#city-input");
  if (!input) return;

  const city = input.value.trim();

  if (!city) {
    alert("Please enter a city name.");
    input.focus();
    return;
  }

  getWeather(city);
  input.value = "";
}

async function getWeather(city) {
  try {
    const response = await fetch(`api.php?city=${encodeURIComponent(city)}`);
    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Could not validate city input.");
      return;
    }

    const condition = data.condition || data.description || "Unknown";
    const conditionText = formatCondition(data.description || condition);
    const humidity = data.humidity ?? 70;
    const windSpeed = data.windSpeed ?? 2.8;
    const feelsLike = data.feelsLike ?? data.temperature;

    setText("#city-name", data.city);
    setText("#country", data.country);
    setText("#temperature", `${data.temperature}°C`);
    setText("#description", conditionText);
    setText("#feels-like", `Feels like ${feelsLike}°C`);
    setText("#feels-like-value", `${feelsLike}°C`);
    setText("#weather-summary", `Humidity ${humidity}% • Wind ${windSpeed} m/s`);
    setText("#humidity-value", `${humidity}%`);
    setText("#wind-value", `${windSpeed} m/s`);
    setText("#high-temp", `${data.highTemp ?? data.temperature}°C`);
    setText("#low-temp", `${data.lowTemp ?? data.temperature}°C`);

    updateRightPanel(data);
    updateDashboardRecommendations(data.temperature, condition, windSpeed, humidity);

    const nowTemp = document.querySelector(".hourly-item:first-child strong");
    if (nowTemp) nowTemp.textContent = `${data.temperature}°C`;

    const iconName = getWeatherIcon(condition);
    const wrapper = document.querySelector("#weather-icon-wrapper");

    if (wrapper) {
      wrapper.innerHTML = `<i class="location-icon-big" data-lucide="${iconName}"></i>`;
    }

    if (window.lucide) lucide.createIcons();

    saveToLocalStorage(data.city, data.country, data.temperature, condition);
    refreshRecentSearches();
  } catch (error) {
    console.log("Error fetching the data:", error);
    alert("Could not connect to the weather API.");
  }
}

function setText(selector, text) {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
}

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

function formatDayName(dateText) {
  const date = new Date(dateText);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function formatTimeFromUnix(unixTime) {
  const date = new Date(unixTime * 1000);
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function updateRightPanel(data) {
  if (!data) return;

  setText("#humidity-value", `${data.humidity ?? 70}%`);
  setText("#wind-value", `${data.windSpeed ?? 2.8} m/s`);
  setText("#uv-value", data.uvIndex || "2 Low");
  setText("#air-quality-value", data.airQuality || "--");

  if (data.sunrise) {
    setText("#sunrise-value", formatTimeFromUnix(data.sunrise));
  }

  if (data.sunset) {
    setText("#sunset-value", formatTimeFromUnix(data.sunset));
  }

  const forecast = Array.isArray(data.forecast) ? data.forecast : [];

  for (let i = 1; i <= 7; i++) {
    const dayName = document.querySelector(`#day-${i}-name`);
    const dayIcon = document.querySelector(`#day-${i}-icon`);
    const dayTemp = document.querySelector(`#day-${i}-temp`);

    if (!dayName || !dayTemp) continue;

    const forecastItem = dayName.closest(".forecast-item");
    const divider = forecastItem?.nextElementSibling?.classList.contains("day-divider")
      ? forecastItem.nextElementSibling
      : null;

    const day = forecast[i - 1];

    if (!day) {
      if (forecastItem) forecastItem.style.display = "none";
      if (divider) divider.style.display = "none";
      continue;
    }

    if (forecastItem) forecastItem.style.display = "";
    if (divider) divider.style.display = "";

    dayName.textContent = formatDayName(day.date);
    dayTemp.textContent = `${Math.round(day.temp)}°C`;

    if (dayIcon) {
      dayIcon.setAttribute("data-lucide", getWeatherIcon(day.condition));
    }
  }

  if (window.lucide) lucide.createIcons();
}

function addRecentSearch(city, country, temperature, condition) {
  const recentList = document.querySelector("#recent-list");
  if (!recentList) return;

  const iconName = getWeatherIcon(condition);
  const newElement = document.createElement("div");
  newElement.className = "location-item";

  newElement.innerHTML = `
    <div class="location-info">
      <span class="location-icon">
        <i data-lucide="${iconName}"></i>
      </span>
      <div>
        <div class="location-city">${city.toUpperCase()}</div>
        <div class="location-country">${country}</div>
      </div>
    </div>
    <div class="location-temp">${temperature}°C</div>
  `;

  recentList.prepend(newElement);

  if (window.lucide) lucide.createIcons();
}

function displayDate() {
  const today = new Date();
  const dateString = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  setText("#city-date", dateString);
}

function saveToLocalStorage(city, country, temperature, condition) {
  const searches = getSavedSearches();
  const newSearch = { city, country, temperature, condition };

  const filtered = searches.filter(function(search) {
    return search.city.toLowerCase() !== city.toLowerCase();
  });

  filtered.unshift(newSearch);
  filtered.splice(RECENT_SEARCH_LIMIT);

  localStorage.setItem("recentSearches", JSON.stringify(filtered));
}

function loadRecentSearches() {
  const searches = getSavedSearches();

  searches
    .slice(0, DASHBOARD_RECENT_LIMIT)
    .reverse()
    .forEach(function(search) {
      addRecentSearch(search.city, search.country, search.temperature, search.condition);
    });
}

function refreshRecentSearches() {
  const recentList = document.querySelector("#recent-list");
  if (!recentList) return;

  recentList.innerHTML = "";
  loadRecentSearches();
}

function getSavedSearches() {
  const saved = localStorage.getItem("recentSearches");

  if (!saved) {
    return getDefaultSearches();
  }

  try {
    const searches = JSON.parse(saved);
    return Array.isArray(searches) && searches.length ? searches : getDefaultSearches();
  } catch (error) {
    return getDefaultSearches();
  }
}

function getDefaultSearches() {
  return [
    {
      city: "Klaipeda",
      country: "Lithuania",
      temperature: 16,
      condition: "Clouds"
    },
    {
      city: "Berlin",
      country: "Germany",
      temperature: 15,
      condition: "Clear"
    }
  ];
}

function formatCondition(condition) {
  return String(condition || "Unknown")
    .split(" ")
    .map(function(word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function initSearchHistoryModal() {
  const seeAll = document.querySelector("#see-all-searches") || document.querySelector(".see-all a");
  const modal = document.querySelector("#search-history-modal");
  const closeButton = document.querySelector("#close-search-history");

  if (!seeAll || !modal || !closeButton) return;

  seeAll.addEventListener("click", function(event) {
    event.preventDefault();
    renderSearchHistory();
    modal.hidden = false;

    if (window.lucide) lucide.createIcons();
  });

  closeButton.addEventListener("click", function() {
    modal.hidden = true;
  });

  modal.addEventListener("click", function(event) {
    if (event.target === modal) {
      modal.hidden = true;
    }
  });
}

function renderSearchHistory() {
  const historyList = document.querySelector("#search-history-list");
  if (!historyList) return;

  const searches = getSavedSearches();
  historyList.innerHTML = "";

  searches.forEach(function(search) {
    const iconName = getWeatherIcon(search.condition);

    const item = document.createElement("button");
    item.type = "button";
    item.className = "history-item";

    item.innerHTML = `
      <div class="location-info">
        <span class="location-icon">
          <i data-lucide="${iconName}"></i>
        </span>
        <div>
          <div class="location-city">${search.city.toUpperCase()}</div>
          <div class="location-country">${search.country}</div>
        </div>
      </div>
      <div class="location-temp">${search.temperature}°C</div>
    `;

    item.addEventListener("click", function() {
      getWeather(search.city);

      const modal = document.querySelector("#search-history-modal");
      if (modal) modal.hidden = true;
    });

    historyList.appendChild(item);
  });

  if (window.lucide) lucide.createIcons();
}

function updateDashboardRecommendations(temperature, condition, windSpeed, humidity) {
  const wear = document.querySelector("#wear-recommendation");
  const umbrella = document.querySelector("#umbrella-recommendation");
  const outdoor = document.querySelector("#outdoor-recommendation");

  const conditionLower = String(condition || "").toLowerCase();
  const rainy = ["rain", "drizzle", "thunderstorm", "snow", "mist"].some((word) =>
    conditionLower.includes(word)
  );

  if (wear) {
    if (temperature <= 0) wear.textContent = "Warm coat & layers";
    else if (temperature <= 10) wear.textContent = "Warm jacket";
    else if (temperature <= 18) wear.textContent = "Light jacket";
    else if (temperature <= 26) wear.textContent = "Light layers";
    else wear.textContent = "Light breathable clothes";
  }

  if (umbrella) {
    umbrella.textContent = rainy ? "Recommended" : "Not needed now";
  }

  if (outdoor) {
    if (rainy) outdoor.textContent = "Better before rain";
    else if (windSpeed >= 10) outdoor.textContent = "Careful, windy";
    else if (humidity >= 85 && temperature >= 25) outdoor.textContent = "Keep it light";
    else outdoor.textContent = "Good conditions";
  }
}