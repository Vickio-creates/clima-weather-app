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

  } catch (error) {
    console.log("Error fetching the data:", error);
    alert("Could not connect to the weather API.");
  }
}
