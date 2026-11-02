
document.addEventListener("DOMContentLoaded", () => {
  // ==================================================
  // 0. INITIALIZE LUCIDE ICONS
  // ==================================================

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // ==================================================
  // 1. GET THE LOCATION FORM ELEMENTS
  // ==================================================

  const locationForm = document.getElementById("location-form");
  const activityForm = document.getElementById("activity-form");
  const activityStatus = document.getElementById("activity-status");
  const countryInput = document.getElementById("country");
  const cityInput = document.getElementById("city");
  const countryToggle = document.getElementById("country-toggle");
  const countryOptions = document.getElementById("country-options");
  const cityOptions = document.getElementById("city-options");
  const locationDetailsInput = document.getElementById("location-details");
  const detectLocationButton = document.getElementById("detect-location");
  const locationStatus = document.getElementById("location-status");

  // Get the weather-sensitivity form independently.
  // This form exists on weather-sensitive.html, not location.html.
const weatherSensitivityForm = document.getElementById(
    "weather-sensitivity-form",
);
const weatherSensitivityStatus = document.getElementById(
    "weather-sensitivity-status",
);

const notificationsForm = document.getElementById("notifications-form");
const notificationsStatus = document.getElementById("notifications-status");

// Stop only when this is not an onboarding form page.
if (
  !locationForm &&
  !activityForm &&
  !weatherSensitivityForm &&
  !notificationsForm
) {
  return;
}

  // Check that the country dropdown elements exist.
  const hasCountryDropdown =
    Boolean(countryInput && countryToggle && countryOptions);

  // ==================================================
  // 1A. ACTIVITY ONBOARDING
  // Save the selected activities before continuing.
  // ==================================================

  if (activityForm) {
    const activityCheckboxes = activityForm.querySelectorAll(
      'input[name="activities"]',
    );
    const activityLabels = {
      student: "Student",
      office_worker: "Office Worker",
      athlete: "Athlete",
      construction_worker: "Construction Worker",
      traveller: "Traveler",
      outdoor_worker: "Outdoor Worker",
    };
    const submitButton = activityForm.querySelector('button[type="submit"]');
    let isSavingActivities = false;

    activityForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (isSavingActivities) {
        return;
      }

      const selectedValues = Array.from(activityCheckboxes)
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);

      if (
        selectedValues.some(
          (value) => !Object.prototype.hasOwnProperty.call(activityLabels, value),
        )
      ) {
        if (activityStatus) {
          activityStatus.textContent =
            "One of the selected activities is invalid. Please review your choices.";
        }
        return;
      }

      const activities = selectedValues.map((value) => activityLabels[value]);
      isSavingActivities = true;

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
      }

      if (activityStatus) {
        activityStatus.textContent = "Saving your activities...";
      }

      try {
        const response = await fetch(
          "../backend/profile/update_preferences.php",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ activities }),
          },
        );
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
              result?.error ||
                `Could not save your activities (HTTP ${response.status}).`,
          );
        }

        if (
          !result ||
          result.success !== true ||
          !Array.isArray(result.preferences?.activities)
        ) {
          throw new Error(
            result?.error || "The activities were not confirmed as saved.",
          );
        }

        window.location.href = "location.html";
      } catch (error) {
        console.error("Onboarding activity save failed:", error);

        if (activityStatus) {
          activityStatus.textContent =
            error instanceof TypeError
              ? "Could not connect to save your activities. Check your connection and try again."
              : error.message || "Could not save your activities. Please try again.";
        }
      } finally {
        isSavingActivities = false;

        if (submitButton) {
          submitButton.disabled = false;
          submitButton.removeAttribute("aria-busy");
        }
      }
    });
  }

  // ==================================================
  // 2. LOCATION ONBOARDING
  // Everything in this section runs only on location.html.
  // ==================================================

  if (locationForm) {
    // --------------------------------------------------
    // 2A. COUNTRY DROPDOWN
    // --------------------------------------------------

    if (hasCountryDropdown) {
      const countryCodes = [
        "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR",
        "AS", "AT", "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE",
        "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ",
        "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD",
        "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR",
        "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM",
        "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI",
        "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
        "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS",
        "GT", "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU",
        "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT",
        "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN",
        "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK",
        "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME",
        "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ",
        "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
        "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU",
        "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM",
        "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS",
        "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI",
        "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV",
        "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK",
        "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA",
        "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
        "VN", "VU", "WF", "WS", "XK", "YE", "YT", "ZA", "ZM", "ZW",
      ];

      // Convert country codes into readable English names.
      const countryNameFormatter = new Intl.DisplayNames(["en"], {
        type: "region",
      });

      const countries = countryCodes
        .map((code) => ({
          code,
          name: countryNameFormatter.of(code),
        }))
        .filter(
          (country) =>
            country.name && country.name !== country.code,
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      // Keep track of the country selected from the dropdown.
      let selectedCountryCode = "";

      function closeCountryDropdown() {
        countryOptions.classList.add("hidden");
        countryInput.setAttribute("aria-expanded", "false");
        countryToggle.setAttribute("aria-expanded", "false");
      }

      function renderCountries(searchText = "") {
        const search = searchText.trim().toLowerCase();

        const matches = countries.filter((country) =>
          country.name.toLowerCase().includes(search),
        );

        countryOptions.replaceChildren();

        if (matches.length === 0) {
          const message = document.createElement("li");

          message.textContent = "No matching countries found.";
          message.className = "px-4 py-3 text-sm text-gray-500";

          countryOptions.appendChild(message);
        } else {
          matches.forEach((country) => {
            const option = document.createElement("li");

            option.textContent = country.name;
            option.setAttribute("role", "option");
            option.setAttribute("aria-selected", "false");

            option.className =
              "cursor-pointer px-4 py-3 text-sm text-[#202938] hover:bg-blue-50";

            option.addEventListener("click", () => {
              countryInput.value = country.name;
              selectedCountryCode = country.code;

              closeCountryDropdown();

              // Enable city searching after a country is selected.
              if (cityInput) {
                cityInput.disabled = false;
                cityInput.placeholder = "Type your city name";
                cityInput.value = "";
              }

              // Clear the previously selected city and coordinates.
              sessionStorage.removeItem("climaSelectedCity");
              sessionStorage.removeItem("climaLatitude");
              sessionStorage.removeItem("climaLongitude");

              if (locationStatus) {
                locationStatus.textContent = "";
              }
            });

            countryOptions.appendChild(option);
          });
        }

        countryOptions.classList.remove("hidden");
        countryInput.setAttribute("aria-expanded", "true");
        countryToggle.setAttribute("aria-expanded", "true");
      }

      // Filter countries as the user types.
      countryInput.addEventListener("input", () => {
        selectedCountryCode = "";

        if (cityInput) {
          cityInput.value = "";
          cityInput.disabled = true;
          cityInput.placeholder = "Select a country first";
        }

        sessionStorage.removeItem("climaSelectedCity");
        sessionStorage.removeItem("climaLatitude");
        sessionStorage.removeItem("climaLongitude");

        renderCountries(countryInput.value);
      });

      // Open or close the country dropdown.
      countryToggle.addEventListener("click", () => {
        if (countryOptions.classList.contains("hidden")) {
          renderCountries(countryInput.value);
          countryInput.focus();
        } else {
          closeCountryDropdown();
        }
      });

      // Close the dropdown when clicking elsewhere.
      document.addEventListener("click", (event) => {
        const clickedInsideCountryField =
          countryInput.contains(event.target) ||
          countryOptions.contains(event.target) ||
          countryToggle.contains(event.target);

        if (!clickedInsideCountryField) {
          closeCountryDropdown();
        }
      });

      // Close the dropdown using Escape.
      countryInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeCountryDropdown();
        }
      });

      countryInput.addEventListener("change", () => {
        if (countryInput.value.trim() === "") {
          selectedCountryCode = "";
        }
      });

      // Make the selected country code available to city search
      // and form validation.
      countryInput.getSelectedCountryCode = () => selectedCountryCode;
    }

    // --------------------------------------------------
    // 2B. CITY AUTOCOMPLETE
    // --------------------------------------------------

    if (cityInput && cityOptions && hasCountryDropdown) {
      let selectedCity = null;
      let citySearchTimer = null;
      let citySearchRequest = 0;
      let citySearchController = null;

      function cancelCitySearch() {
        citySearchRequest += 1;
        clearTimeout(citySearchTimer);

        if (citySearchController) {
          citySearchController.abort();
          citySearchController = null;
        }
      }

      function closeCityDropdown() {
        cityOptions.classList.add("hidden");
        cityInput.setAttribute("aria-expanded", "false");
      }

      function showCityMessage(message) {
        cityOptions.replaceChildren();

        const item = document.createElement("li");

        item.textContent = message;
        item.className = "px-4 py-3 text-sm text-gray-500";

        cityOptions.appendChild(item);
        cityOptions.classList.remove("hidden");
        cityInput.setAttribute("aria-expanded", "true");
      }

      function clearSelectedCity() {
        selectedCity = null;
        sessionStorage.removeItem("climaSelectedCity");
      }

      function selectCity(city) {
        selectedCity = city;
        cityInput.value = city.name;

        // Save the selected city temporarily.
        sessionStorage.setItem(
          "climaSelectedCity",
          JSON.stringify(city),
        );

        closeCityDropdown();

        if (locationStatus) {
          locationStatus.textContent = `Selected ${city.name}.`;
        }
      }

      function renderCitySuggestions(locations) {
        cityOptions.replaceChildren();

        // Remove duplicate results.
        const uniqueLocations = locations.filter((city, index, list) => {
          return (
            list.findIndex(
              (other) =>
                other.name === city.name &&
                other.state === city.state &&
                other.latitude === city.latitude &&
                other.longitude === city.longitude,
            ) === index
          );
        });

        if (uniqueLocations.length === 0) {
          showCityMessage("No matching cities found.");
          return;
        }

        uniqueLocations.forEach((city) => {
          const option = document.createElement("li");

          option.setAttribute("role", "option");
          option.setAttribute("aria-selected", "false");

          option.className =
            "cursor-pointer px-4 py-3 text-sm text-[#202938] hover:bg-blue-50";

          const cityName = document.createElement("div");

          cityName.textContent = city.name;
          cityName.className = "font-medium";

          option.appendChild(cityName);

          if (city.state) {
            const region = document.createElement("div");

            region.textContent = city.state;
            region.className = "mt-1 text-xs text-gray-500";

            option.appendChild(region);
          }

          option.addEventListener("click", () => {
            selectCity(city);
          });

          cityOptions.appendChild(option);
        });

        cityOptions.classList.remove("hidden");
        cityInput.setAttribute("aria-expanded", "true");
      }

      async function searchCities(searchText) {
        const requestNumber = ++citySearchRequest;

        if (citySearchController) {
          citySearchController.abort();
          citySearchController = null;
        }

        const countryCode = countryInput.getSelectedCountryCode();

        if (!countryCode) {
          closeCityDropdown();
          return;
        }

        const search = searchText.trim();

        // Require at least two characters before searching.
        if (search.length < 2) {
          closeCityDropdown();
          return;
        }

        const controller = new AbortController();
        citySearchController = controller;

        showCityMessage("Searching for cities...");

        try {
          // The PHP endpoint is in the project root.
          // Test this page through localhost, not file://.
          const url =
            `/location-search.php?city=${encodeURIComponent(search)}` +
            `&country=${encodeURIComponent(countryCode)}`;

          const response = await fetch(url, {
            signal: controller.signal,
          });

          const data = await response.json().catch(() => null);

          // Ignore results from an older search.
          if (requestNumber !== citySearchRequest) {
            return;
          }

          if (!response.ok) {
            throw new Error(
              data?.message ||
                `City search failed (HTTP ${response.status}).`,
            );
          }

          if (!data || typeof data !== "object") {
            throw new Error(
              "The city search endpoint did not return JSON. " +
                "Check that the app is running through PHP/Apache.",
            );
          }

          if (!data.success) {
            throw new Error(
              data.message || "Unable to search for cities.",
            );
          }

          renderCitySuggestions(data.locations || []);
        } catch (error) {
          // Ignore outdated requests and intentionally cancelled searches.
          if (
            requestNumber !== citySearchRequest ||
            error.name === "AbortError"
          ) {
            return;
          }

          console.error("City search error:", error);

          const message =
            error instanceof TypeError
              ? "Cannot reach the city search endpoint. Check that PHP/Apache is running."
              : error.message ||
                "Unable to load suggestions. Please try again.";

          showCityMessage(message);
        }
      }

      // Search as the user types, with a short delay.
      cityInput.addEventListener("input", () => {
        cancelCitySearch();
        clearSelectedCity();

        if (locationStatus) {
          locationStatus.textContent = "";
        }

        citySearchTimer = setTimeout(() => {
          searchCities(cityInput.value);
        }, 300);
      });

      // Changing the country invalidates previous city results.
      countryInput.addEventListener("input", () => {
        cancelCitySearch();
        clearSelectedCity();
        closeCityDropdown();
      });

      cityInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeCityDropdown();
        }
      });

      document.addEventListener("click", (event) => {
        const clickedInsideCityField =
          cityInput.contains(event.target) ||
          cityOptions.contains(event.target);

        if (!clickedInsideCityField) {
          closeCityDropdown();
        }
      });

      cityInput.getSelectedCity = () => selectedCity;
    }

    // --------------------------------------------------
    // 2C. CURRENT LOCATION DETECTION
    // --------------------------------------------------

    if (detectLocationButton) {
      detectLocationButton.addEventListener("click", () => {
        if (!navigator.geolocation) {
          if (locationStatus) {
            locationStatus.textContent =
              "Your browser does not support location detection.";
          }

          return;
        }

        if (locationStatus) {
          locationStatus.textContent = "Detecting your location...";
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            // Save detected coordinates temporarily.
            sessionStorage.setItem("climaLatitude", latitude);
            sessionStorage.setItem("climaLongitude", longitude);

            if (locationStatus) {
              locationStatus.textContent =
                "Location detected. You can also enter your city " +
                "and country manually.";
            }
          },
          () => {
            if (locationStatus) {
              locationStatus.textContent =
                "Location access was unavailable. " +
                "Please enter your city and country manually.";
            }
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000,
          },
        );
      });
    }

    // --------------------------------------------------
    // 2D. LOCATION FORM SUBMISSION
    // --------------------------------------------------

    let isSavingOnboardingLocation = false;

    locationForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (isSavingOnboardingLocation) {
        return;
      }

      const locationData = {
        country: countryInput ? countryInput.value.trim() : "",
        city: cityInput ? cityInput.value.trim() : "",
        details: locationDetailsInput
          ? locationDetailsInput.value.trim()
          : "",
      };

      // Both country and city are required.
      if (!locationData.country || !locationData.city) {
        if (locationStatus) {
          locationStatus.textContent =
            "Please enter both your country and city.";
        }

        return;
      }

      // Require a country selected from the dropdown.
      if (
        hasCountryDropdown &&
        typeof countryInput.getSelectedCountryCode === "function" &&
        !countryInput.getSelectedCountryCode()
      ) {
        if (locationStatus) {
          locationStatus.textContent =
            "Please select your country from the dropdown list.";
        }

        countryInput.focus();
        return;
      }

      // Require a city selected from the autocomplete suggestions.
      const selectedCity =
        cityInput &&
        typeof cityInput.getSelectedCity === "function"
          ? cityInput.getSelectedCity()
          : null;

      if (!selectedCity) {
        if (locationStatus) {
          locationStatus.textContent =
            "Please choose a city from the suggestions.";
        }

        if (cityInput) {
          cityInput.focus();
        }

        return;
      }

      // Add the selected country code and city coordinates.
      locationData.countryCode =
        countryInput.getSelectedCountryCode();

      locationData.city = selectedCity.name;
      locationData.latitude = selectedCity.latitude;
      locationData.longitude = selectedCity.longitude;
      locationData.state = selectedCity.state || "";

      const submitButton = locationForm.querySelector(
        'button[type="submit"]',
      );

      isSavingOnboardingLocation = true;

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
      }

      if (locationStatus) {
        locationStatus.textContent = "Saving your location...";
      }

      try {
        const response = await fetch(
          "../backend/profile/save_onboarding_location.php",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              city: locationData.city,
              country: locationData.country,
            }),
          },
        );

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            result?.error ||
              `Could not save your location (HTTP ${response.status}).`,
          );
        }

        if (!result || result.success !== true) {
          throw new Error(
            result?.error || "The location was not confirmed as saved.",
          );
        }

        // Keep the full selection for the remaining onboarding flow.
        sessionStorage.setItem(
          "climaOnboardingLocation",
          JSON.stringify(locationData),
        );

        // Continue only after the authenticated profile save succeeds.
        window.location.href = "weather-sensitive.html";
      } catch (error) {
        console.error("Onboarding location save failed:", error);

        if (locationStatus) {
          locationStatus.textContent =
            error instanceof TypeError
              ? "Could not connect to save your location. Check your connection and try again."
              : error.message || "Could not save your location. Please try again.";
        }
      } finally {
        isSavingOnboardingLocation = false;

        if (submitButton) {
          submitButton.disabled = false;
          submitButton.removeAttribute("aria-busy");
        }
      }
    });
  }

  // ==================================================
  // 3. WEATHER SENSITIVITY CHECKBOXES
  // This section runs independently on weather-sensitive.html.
  // ==================================================

  if (weatherSensitivityForm) {
    const sensitivityCheckboxes =
      weatherSensitivityForm.querySelectorAll(
        'input[name="weather_sensitivities"]',
      );

    const noneCheckbox = weatherSensitivityForm.querySelector(
      "#no-weather-sensitivity",
    );
    const sensitivityLabels = {
      heat: "Sensitive to Heat",
      cold: "Sensitive to Cold",
      rain: "Sensitive to Rain",
      wind: "Sensitive to Wind",
      snow: "Sensitive to Snow",
      pollen: "Sensitive to Pollen",
      air_quality: "Sensitive to Poor Air Quality",
    };
    const submitButton = weatherSensitivityForm.querySelector(
      'button[type="submit"]',
    );
    let userChangedSensitivities = false;
    let isSavingSensitivities = false;

    function syncNoneSensitivity() {
      if (!noneCheckbox) return;

      const selectedCount = Array.from(sensitivityCheckboxes).filter(
        (checkbox) => checkbox !== noneCheckbox && checkbox.checked,
      ).length;
      noneCheckbox.checked = selectedCount === 0;
    }

    function normalizeSensitivities(values) {
      if (!Array.isArray(values)) return null;
      if (values.includes("none")) return [];

      const labels = {
        ...sensitivityLabels,
        ...Object.fromEntries(
          Object.values(sensitivityLabels).map((label) => [label, label]),
        ),
      };

      if (
        values.some(
          (value) => !Object.prototype.hasOwnProperty.call(labels, value),
        )
      ) {
        return null;
      }

      return Array.from(new Set(values.map((value) => labels[value])));
    }

    async function restoreSensitivitySelections() {
      let savedValues = null;

      try {
        const response = await fetch("../backend/auth/session.php", {
          credentials: "include",
        });
        const result = await response.json().catch(() => ({}));
        const databaseValues = result?.user?.preferences?.weatherSensitivities;

        if (response.ok && Array.isArray(databaseValues)) {
          savedValues = normalizeSensitivities(databaseValues);
        }
      } catch {
        // The onboarding page can still restore local in-progress selections.
      }

      if (savedValues === null) {
        try {
          savedValues = normalizeSensitivities(
            JSON.parse(sessionStorage.getItem("climaWeatherSensitivities") || "null"),
          );
        } catch {
          savedValues = null;
        }
      }

      if (savedValues !== null && !userChangedSensitivities) {
        const selectedValues = new Set(savedValues);
        sensitivityCheckboxes.forEach((checkbox) => {
          if (checkbox === noneCheckbox) {
            checkbox.checked = selectedValues.size === 0;
          } else {
            checkbox.checked = selectedValues.has(
              sensitivityLabels[checkbox.value] || checkbox.value,
            );
          }
        });
      }

      syncNoneSensitivity();
    }

    const sensitivityRestorePromise = restoreSensitivitySelections();

    sensitivityCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        userChangedSensitivities = true;

        if (checkbox === noneCheckbox && checkbox.checked) {
          sensitivityCheckboxes.forEach((otherCheckbox) => {
            if (otherCheckbox !== noneCheckbox) {
              otherCheckbox.checked = false;
            }
          });
        } else if (checkbox.checked && noneCheckbox) {
          noneCheckbox.checked = false;
        }

        syncNoneSensitivity();
      });
    });

    weatherSensitivityForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (isSavingSensitivities) return;
      await sensitivityRestorePromise;

      const selectedSensitivityValues = Array.from(sensitivityCheckboxes)
        .filter((checkbox) => checkbox !== noneCheckbox && checkbox.checked)
        .map((checkbox) => checkbox.value);
      const selectedSensitivities = selectedSensitivityValues.map(
        (value) => sensitivityLabels[value],
      );

      sessionStorage.setItem(
        "climaWeatherSensitivities",
        JSON.stringify(selectedSensitivityValues),
      );

      isSavingSensitivities = true;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
      }
      if (weatherSensitivityStatus) {
        weatherSensitivityStatus.textContent = "Saving your weather preferences...";
      }

      try {
        const response = await fetch("../backend/profile/update_preferences.php", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weatherSensitivities: selectedSensitivities }),
        });
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.error || `Could not save weather preferences (HTTP ${response.status}).`);
        }

        if (
          result?.success !== true ||
          !Array.isArray(result.preferences?.weatherSensitivities)
        ) {
          throw new Error(result?.error || "The weather preferences were not confirmed as saved.");
        }

        sessionStorage.removeItem("climaWeatherSensitivities");
        window.location.href = "notifications.html";
      } catch (error) {
        console.error("Onboarding weather preference save failed:", error);
        if (weatherSensitivityStatus) {
          weatherSensitivityStatus.textContent =
            error instanceof TypeError
              ? "Could not connect to save your weather preferences. Check your connection and try again."
              : error.message || "Could not save your weather preferences. Please try again.";
        }
      } finally {
        isSavingSensitivities = false;
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.removeAttribute("aria-busy");
        }
      }
    });
  }

   // ==================================================
  // 4. WEATHER NOTIFICATION OPTIONS AND WELCOME POPUP
  // ==================================================

  if (notificationsForm) {
    const notificationCheckboxes =
      notificationsForm.querySelectorAll(
        'input[name="weather_notifications"]',
      );
    const selectAllNotifications = notificationsForm.querySelector(
      "#notifications-select-all",
    );
    const noNotifications = notificationsForm.querySelector(
      "#notifications-none",
    );

    let selectingAllNotifications = false;
    let userChangedNotifications = false;
    let isSavingNotifications = false;
    const submitButton = notificationsForm.querySelector('button[type="submit"]');

    function syncNotificationControls() {
      const selectedCount = Array.from(notificationCheckboxes).filter(
        (checkbox) => checkbox.checked,
      ).length;
      const allSelected =
        notificationCheckboxes.length > 0 &&
        selectedCount === notificationCheckboxes.length;

      if (selectAllNotifications) {
        selectAllNotifications.checked = allSelected;
      }

      if (noNotifications) {
        noNotifications.checked =
          selectedCount === 0 && !selectingAllNotifications;
      }
    }

    // Get the welcome popup elements.
    const welcomeModal = document.getElementById("welcome-modal");
    const welcomeCard = document.getElementById("welcome-card");
    const welcomeTitle = document.getElementById("welcome-title");
    const welcomeDashboardButton = document.getElementById(
      "welcome-dashboard-button",
    );

    async function restoreNotificationSelections() {
      let savedNotifications = null;

      try {
        const response = await fetch("../backend/auth/session.php", {
          credentials: "include",
        });
        const result = await response.json().catch(() => ({}));
        const databaseValues =
          result?.user?.notifications?.types?.weatherAlertTypes;

        if (response.ok && Array.isArray(databaseValues)) {
          savedNotifications = databaseValues;
        }
      } catch {
        // Keep any in-progress onboarding selections available for retry.
      }

      if (savedNotifications === null) {
        try {
          const savedValues = JSON.parse(
            sessionStorage.getItem("climaNotificationPreferences") || "null",
          );
          if (Array.isArray(savedValues)) {
            savedNotifications = savedValues;
          }
        } catch {
          savedNotifications = null;
        }
      }

      if (savedNotifications !== null && !userChangedNotifications) {
        const savedValues = new Set(savedNotifications);
        notificationCheckboxes.forEach((checkbox) => {
          checkbox.checked = savedValues.has(checkbox.value);
        });
      }

      syncNotificationControls();
    }

    const notificationRestorePromise = restoreNotificationSelections();

    // Selecting the master checkbox selects or clears all alert options.
    selectAllNotifications?.addEventListener("change", () => {
      userChangedNotifications = true;
      selectingAllNotifications = selectAllNotifications.checked;
      notificationCheckboxes.forEach((checkbox) => {
        checkbox.checked = selectingAllNotifications;
      });
      selectingAllNotifications = false;
      syncNotificationControls();
    });

    // None is mutually exclusive with every individual alert.
    noNotifications?.addEventListener("change", () => {
      userChangedNotifications = true;
      if (noNotifications.checked) {
        notificationCheckboxes.forEach((checkbox) => {
          checkbox.checked = false;
        });
      }
      syncNotificationControls();
    });

    // Keep both summary controls in sync when an individual alert changes.
    notificationCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        userChangedNotifications = true;
        syncNotificationControls();
      });
    });

    // Handle the Finish Setup button.
    notificationsForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (isSavingNotifications) return;
      await notificationRestorePromise;

      // Collect the selected notification options.
      const selectedNotifications = Array.from(notificationCheckboxes)
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);

      sessionStorage.setItem(
        "climaNotificationPreferences",
        JSON.stringify(selectedNotifications),
      );

      isSavingNotifications = true;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
      }
      if (notificationsStatus) {
        notificationsStatus.textContent = "Saving your notification preferences...";
      }

      try {
        const response = await fetch(
          "../backend/profile/update_notifications.php",
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              weatherAlertTypes: selectedNotifications,
              types: { weatherAlerts: selectedNotifications.length > 0 },
            }),
          },
        );
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.error || `Could not save notification preferences (HTTP ${response.status}).`,
          );
        }

        if (
          result.success !== true ||
          !Array.isArray(result.notifications?.types?.weatherAlertTypes)
        ) {
          throw new Error(
            result.error || "The notification preferences were not confirmed as saved.",
          );
        }

        sessionStorage.removeItem("climaNotificationPreferences");
        sessionStorage.setItem("climaOnboardingComplete", "true");

        const userName =
          localStorage.getItem("climaUserName") ||
          sessionStorage.getItem("climaUserName");

        if (userName && welcomeTitle) {
          welcomeTitle.textContent = `Welcome to Clima, ${userName}!`;
        }

        if (welcomeModal && welcomeCard) {
          welcomeModal.classList.remove("hidden");
          welcomeModal.classList.add("flex");

          requestAnimationFrame(() => {
            welcomeCard.classList.remove("scale-95", "opacity-0");
            welcomeCard.classList.add("scale-100", "opacity-100");
          });

          welcomeDashboardButton?.focus();
        } else {
          console.error(
            "Welcome popup not found. Check the IDs in notifications.html.",
          );
        }
      } catch (error) {
        console.error("Onboarding notification save failed:", error);
        if (notificationsStatus) {
          notificationsStatus.textContent =
            error instanceof TypeError
              ? "Could not connect to save your notification preferences. Check your connection and try again."
              : error.message || "Could not save your notification preferences. Please try again.";
        }
      } finally {
        isSavingNotifications = false;
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.removeAttribute("aria-busy");
        }
      }
    });

    // Open the app only when the user clicks the welcome button.
    if (welcomeDashboardButton) {
      welcomeDashboardButton.addEventListener("click", () => {
        window.location.href = "../app.html";
      });
    }
  }
});
