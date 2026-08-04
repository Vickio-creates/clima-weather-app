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
  updateDashboardGreeting(currentUser);

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
  await loadInitialDashboardWeather(currentUser);
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

async function loadInitialDashboardWeather(currentUser) {
  setText("#country", "Current location");
  setText("#city-name", "LOCATING...");

  const currentLocationWeather = await getWeatherForCurrentLocation({
    saveSearch: false,
    showErrors: false
  });

  if (currentLocationWeather) return;

  const savedCity = getCityFromLocation(currentUser?.location);

  if (savedCity) {
    const savedWeather = await getWeather(savedCity, {
      saveSearch: false,
      showErrors: false
    });

    if (savedWeather) return;
  }

  const fallbackWeather = await getWeather("Vilnius", {
    saveSearch: false,
    showErrors: false
  });

  if (!fallbackWeather) {
    setText("#country", "Weather unavailable");
    setText("#city-name", "TRY SEARCH");
    setText("#description", "Could not load live weather");
  }
}

async function getWeatherForCurrentLocation(options = {}) {
  if (!navigator.geolocation) {
    return null;
  }

  try {
    const position = await getBrowserPosition();
    const { latitude, longitude } = position.coords;
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude)
    });

    const data = await fetchWeather(`api.php?${params.toString()}`);
    renderWeather(data, options);
    return data;
  } catch (error) {
    console.log("Current location weather unavailable:", error);
    return null;
  }
}

function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 7000,
      maximumAge: 300000
    });
  });
}

async function getWeather(city, options = {}) {
  const settings = {
    saveSearch: true,
    showErrors: true,
    ...options
  };

  try {
    const data = await fetchWeather(`api.php?city=${encodeURIComponent(city)}`);

    renderWeather(data, settings);
    return data;
  } catch (error) {
    console.log("Error fetching the data:", error);

    if (settings.showErrors) {
      alert(error.message || "Could not connect to the weather API.");
    }

    return null;
  }
}

async function fetchWeather(url) {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not load weather.");
  }

  return data;
}

function renderWeather(data, options = {}) {
  const saveSearch = options.saveSearch !== false;
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
  updateHourlyGlance(data);
  updateDashboardRecommendations(data.temperature, condition, windSpeed, humidity);
  updateAiGuidance(data, condition, windSpeed, humidity);

  const iconName = getWeatherIcon(condition);
  const wrapper = document.querySelector("#weather-icon-wrapper");

  if (wrapper) {
    wrapper.innerHTML = `<i class="location-icon-big" data-lucide="${iconName}"></i>`;
  }

  if (window.lucide) lucide.createIcons();

  if (saveSearch) {
    saveToLocalStorage(data.city, data.country, data.temperature, condition);
    refreshRecentSearches();
  }
}

function setText(selector, text) {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
}

function getCityFromLocation(location) {
  return String(location || "")
    .split(",")[0]
    .trim();
}

function updateDashboardGreeting(user) {
  const greeting = document.querySelector(".dashboard-greeting");
  if (!greeting) return;

  const name = user?.name || "Clima User";
  const nameElement = document.createElement("span");

  nameElement.dataset.userName = "";
  nameElement.textContent = name;

  greeting.textContent = `${getTimeGreeting()}, `;
  greeting.appendChild(nameElement);
  greeting.append(" 👋");
}

function getTimeGreeting() {
  const hour = new Date().getHours();

  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";

  return "Good night";
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

function formatTimeFromUnix(unixTime, timezoneOffset = null) {
  const offset = Number(timezoneOffset);
  const useLocationTime = timezoneOffset !== null && timezoneOffset !== undefined && Number.isFinite(offset);
  const date = new Date((Number(unixTime) + (useLocationTime ? offset : 0)) * 1000);

  if (useLocationTime) {
    return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
  }

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
    setText("#sunrise-value", formatTimeFromUnix(data.sunrise, data.timezoneOffset));
  }

  if (data.sunset) {
    setText("#sunset-value", formatTimeFromUnix(data.sunset, data.timezoneOffset));
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

function updateHourlyGlance(data) {
  const hourlyList = document.querySelector(".hourly-list");
  if (!hourlyList) return;

  const forecastItems = Array.isArray(data.hourly) ? data.hourly.slice(0, 5) : [];
  const items = [
    {
      label: "Now",
      temp: data.temperature,
      condition: data.condition || data.description
    },
    ...forecastItems.map((item) => ({
      label: formatHourlyLabel(item, data.timezoneOffset),
      temp: item.temp,
      condition: item.condition || item.description
    }))
  ];

  hourlyList.innerHTML = items.map(createHourlyItemMarkup).join("");

  if (window.lucide) lucide.createIcons();
}

function formatHourlyLabel(item, timezoneOffset) {
  if (item.dt) {
    return formatTimeFromUnix(item.dt, timezoneOffset);
  }

  if (item.time) {
    return item.time.slice(11, 16);
  }

  return "--:--";
}

function createHourlyItemMarkup(item) {
  const iconName = getWeatherIcon(item.condition);
  const temperature = Number.isFinite(Number(item.temp)) ? `${Math.round(Number(item.temp))}°C` : "--°C";

  return `
    <article class="hourly-item">
      <span>${item.label}</span>
      <i data-lucide="${iconName}"></i>
      <strong>${temperature}</strong>
    </article>
  `;
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

  const rainy = isWetCondition(condition);

  if (wear) {
    wear.textContent = getWearAdvice(temperature);
  }

  if (umbrella) {
    umbrella.textContent = rainy ? "Recommended" : "Not needed now";
  }

  if (outdoor) {
    outdoor.textContent = getOutdoorAdvice(temperature, windSpeed, humidity, rainy);
  }
}

function updateAiGuidance(data, condition, windSpeed, humidity) {
  const aiList = document.querySelector(".ai-list");
  if (!aiList) return;

  const temperature = Number(data.temperature);
  const feelsLike = data.feelsLike ?? data.temperature;
  const conditionText = formatCondition(data.description || condition);
  const rainy = isWetCondition(condition);
  const items = [
    {
      label: "Now",
      text: `${conditionText} now, ${data.temperature}°C and feels like ${feelsLike}°C.`
    },
    {
      label: "Wear",
      text: `${getWearAdvice(temperature)}.`
    },
    {
      label: "Rain",
      text: rainy ? "Carry an umbrella." : "Umbrella not needed right now."
    },
    {
      label: "Plan",
      text: `${getOutdoorAdvice(temperature, windSpeed, humidity, rainy)}.`
    }
  ];

  aiList.innerHTML = "";

  items.forEach((item) => {
    const listItem = document.createElement("li");
    const label = document.createElement("span");

    label.textContent = item.label;
    listItem.append(label, ` ${item.text}`);
    aiList.appendChild(listItem);
  });
}

function isWetCondition(condition) {
  const conditionLower = String(condition || "").toLowerCase();

  return ["rain", "drizzle", "thunderstorm", "snow", "mist"].some((word) =>
    conditionLower.includes(word)
  );
}

function getWearAdvice(temperature) {
  const value = Number(temperature);

  if (!Number.isFinite(value)) return "Check current conditions";
  if (value <= 0) return "Warm coat & layers";
  if (value <= 10) return "Warm jacket";
  if (value <= 18) return "Light jacket";
  if (value <= 26) return "Light layers";

  return "Light breathable clothes";
}

function getOutdoorAdvice(temperature, windSpeed, humidity, rainy) {
  const temperatureValue = Number(temperature);
  const windValue = Number(windSpeed);
  const humidityValue = Number(humidity);

  if (rainy) return "Better before rain";
  if (windValue >= 10) return "Careful, windy";
  if (humidityValue >= 85 && temperatureValue >= 25) return "Keep it light";

  return "Good conditions";
}
