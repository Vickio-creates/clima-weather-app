document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();

  const cityInput = document.querySelector("#city-input");
  const searchIcon = document.querySelector(".input-box .lucide-search");

  cityInput.addEventListener("keydown", handleEnter);
  if (searchIcon) searchIcon.addEventListener("click", updateCity);
});

// Function to press Enter on the keyboard
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

    document.querySelector("#city-name").textContent = data.city;
    document.querySelector("#country").textContent = data.country;
    document.querySelector("#temperature").textContent = `${data.temperature}°C`;
    document.querySelector("#description").textContent = data.condition;

    const iconName = getWeatherIcon(data.condition);
    const wrapper = document.querySelector("#weather-icon-wrapper");
    wrapper.innerHTML = `<i class="location-icon-big" data-lucide="${iconName}"></i>`;      
    lucide.createIcons();

    addRecentSearch(data.city, data.country, data.temperature, data.condition);

  } catch (error) {
    console.log("Error fetching the data:", error);
    alert("Could not connect to the weather API.");
  }
}

function getWeatherIcon(condition) {
  const icons = {
    "Sunny": "sun",
    "Cloudy": "cloud",
    "Partly Cloudy": "cloud-sun",
    "Overcast": "cloudy",
    "Rainy": "cloud-rain",
    "Stormy": "cloud-lightning",
    "Snowy": "cloud-snow",
    "Windy": "wind",
    "Clear": "star",
    "Unknown": "cloud"
  };
  return icons[condition] || "cloud";
}

function addRecentSearch(city, country, temperature, condition){
    const iconName = getWeatherIcon(condition);
    const recentList = document.querySelector("#recent-list");
    const newElement = document.createElement("div");
    newElement.className = "location-item";
    newElement.innerHTML = `<div class="location-info">
    <span class="location-icon">
                <i data-lucide="${iconName}"></i>
              </span>
              <div>
                <div class="location-city">${city.toUpperCase()}</div>
                <div class="location-country">${country}</div>
              </div>
            </div>
            <div class="location-temp">${temperature}°C</div>
          </div>`;

          recentList.prepend(newElement);
          lucide.createIcons();
}