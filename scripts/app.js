document.addEventListener("DOMContentLoaded", async () => {
  const currentUser = typeof requireClimaAuth === "function" ? await requireClimaAuth() : null;
  if (!currentUser) return;
  if (typeof updateUserInterface === "function") updateUserInterface(currentUser);
  if(window.lucide) lucide.createIcons();
  displayDate();

  const cityInput = document.querySelector("#city-input");
  const searchIcon = document.querySelector("#search-icon") || document.querySelector(".input-box .lucide-search");

  if (cityInput) {
    cityInput.addEventListener("keydown", handleEnter);
  }
  if (searchIcon){
    searchIcon.addEventListener("click", updateCity);
  } 

  loadRecentSearches();
});

function handleEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    updateCity();
  }
}

function updateCity() {
  const input = document.querySelector("#city-input");
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

    const conditionText = formatCondition(data.description || data.condition);
    const humidity = data.humidity ?? 70;
    const windSpeed = data.windSpeed ?? 2.8;
    const feelsLike = data.feelsLike ?? data.temperature;

    document.querySelector("#city-name").textContent = data.city;
    document.querySelector("#country").textContent = data.country;
    document.querySelector("#temperature").textContent = `${data.temperature}°C`;
    document.querySelector("#description").textContent = conditionText;
    document.querySelector("#feels-like").textContent = `Feels like ${feelsLike}°C`;
    document.querySelector("#weather-summary").textContent = `Humidity ${humidity}% • Wind ${windSpeed} m/s`;
    document.querySelector("#humidity-value").textContent = `${humidity}%`;
    document.querySelector("#wind-value").textContent = `${windSpeed} m/s`;
    document.querySelector("#high-temp").textContent = `${data.highTemp ?? data.temperature}°C`;
    document.querySelector("#low-temp").textContent = `${data.lowTemp ?? data.temperature}°C`;


    updateDashboardRecommendations(data.temperature, data.condition, windSpeed, humidity);

    const nowTemp = document.querySelector(".hourly-item:first-child strong");
    if (nowTemp) nowTemp.textContent = `${data.temperature}°C`;

    const iconName = getWeatherIcon(data.condition);
    const wrapper = document.querySelector("#weather-icon-wrapper");
    wrapper.innerHTML = `<i class="location-icon-big" data-lucide="${iconName}"></i>`;
    if(window.lucide) lucide.createIcons();


    saveToLocalStorage(data.city, data.country, data.temperature, data.condition);
    refreshRecentSearches();
  } catch (error) {
    console.log("Error fetching the data:", error);
    alert("Could not connect to the weather API.");
  }
}

function getWeatherIcon(condition) {
  const normalized = String(condition || "").toLowerCase();
  const icons = {
    sunny: "sun",
    clear: "sun",
    cloudy: "cloud",
    clouds: "cloud",
    "partly cloudy": "cloud-sun",
    overcast: "cloudy",
    rainy: "cloud-rain",
    rain: "cloud-rain",
    drizzle: "cloud-drizzle",
    stormy: "cloud-lightning",
    thunderstorm: "cloud-lightning",
    snowy: "cloud-snow",
    snow: "cloud-snow",
    windy: "wind",
    mist: "droplets",
    fog: "cloud-fog",
    haze: "cloud-fog",
    unknown: "cloud"
  };

  return icons[normalized] || "cloud";
}

function addRecentSearch(city, country, temperature, condition) {
  const iconName = getWeatherIcon(condition);
  const recentList = document.querySelector("#recent-list");
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
    if(window.lucide) lucide.createIcons();
}

function displayDate() {
  const today = new Date();
  const dateString = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  document.querySelector("#city-date").textContent = dateString;
}

function saveToLocalStorage(city, country, temperature, condition) {
  const searches = getSavedSearches();
  const newSearch = { city, country, temperature, condition };

  const filtered = searches.filter(function(search) {
    return search.city.toLowerCase() !== city.toLowerCase();
  });

  filtered.unshift(newSearch);
  filtered.splice(2);
  localStorage.setItem("recentSearches", JSON.stringify(filtered));
}

function loadRecentSearches() {
  const searches = getSavedSearches();
  searches.slice(0, 2).reverse().forEach(function(search) {
    addRecentSearch(search.city, search.country, search.temperature, search.condition);
  });
}

function refreshRecentSearches() {
  const recentList = document.querySelector("#recent-list");
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


function updateDashboardRecommendations(temperature, condition, windSpeed, humidity) {
  const wear = document.querySelector("#wear-recommendation");
  const umbrella = document.querySelector("#umbrella-recommendation");
  const outdoor = document.querySelector("#outdoor-recommendation");

  const conditionLower = String(condition || "").toLowerCase();
  const rainy = ["rain", "drizzle", "thunderstorm", "snow", "mist"].some((word) => conditionLower.includes(word));

  if (wear) {
    if (temperature <= 0) wear.textContent = "Warm coat & layers";
    else if (temperature <= 10) wear.textContent = "Warm jacket";
    else if (temperature <= 18) wear.textContent = "Light jacket";
    else if (temperature <= 26) wear.textContent = "Light layers";
    else wear.textContent = "Light breathable clothes";
  }

  if (umbrella) umbrella.textContent = rainy ? "Recommended" : "Not needed now";

  if (outdoor) {
    if (rainy) outdoor.textContent = "Better before rain";
    else if (windSpeed >= 10) outdoor.textContent = "Careful, windy";
    else if (humidity >= 85 && temperature >= 25) outdoor.textContent = "Keep it light";
    else outdoor.textContent = "Good conditions";
  }
}
