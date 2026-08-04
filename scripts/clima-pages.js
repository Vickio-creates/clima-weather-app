const PROFILE_COUNTRIES = [
  "Lithuania",
  "Cameroon",
  "United States",
  "United Kingdom",
  "Canada",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
  "Belgium",
  "Poland",
  "Latvia",
  "Estonia",
  "Finland",
  "Sweden",
  "Norway",
  "Denmark",
  "Portugal",
  "Ireland",
  "Ukraine",
  "Czechia",
  "Austria",
  "Switzerland",
  "Greece",
  "Turkey",
  "Romania",
  "Bulgaria",
  "Hungary",
  "Croatia",
  "Serbia",
  "Slovakia",
  "Slovenia",
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "Egypt",
  "Morocco",
  "Algeria",
  "Tunisia",
  "Ethiopia",
  "Uganda",
  "Rwanda",
  "Tanzania",
  "United Arab Emirates",
  "India",
  "China",
  "Japan",
  "South Korea",
  "Singapore",
  "Malaysia",
  "Indonesia",
  "Philippines",
  "Thailand",
  "Vietnam",
  "Australia",
  "New Zealand",
  "Brazil",
  "Argentina",
  "Mexico",
  "Colombia",
  "Chile",
  "Peru"
];

// Run this code only after the HTML page has fully loaded.
document.addEventListener("DOMContentLoaded", async () => {
  // Check if the user is logged in.
  // requireClimaAuth comes from auth.js and redirects to login if there is no session.
  const user = typeof requireClimaAuth === "function" ? await requireClimaAuth() : null;

  // Stop the page logic if there is no logged-in user.
  if (!user) return;

  // Fill all user interface elements with the logged-in user's data.
  updateUserInterface(user);

  // Start the Edit Personal Info page logic.
  initProfileEdit(user);

  // Render Lucide icons after the page content is ready.
  if (window.lucide) lucide.createIcons();
});


// Handle the Edit Personal Info page.
function initProfileEdit(user) {
  // Find the edit personal info form.
  const form = document.querySelector("#profile-edit-form");

  // If the current page does not have this form, stop this function.
  if (!form) return;

  // Find personal information inputs.
  const nameInput = document.querySelector("#edit-name");
  const emailInput = document.querySelector("#edit-email");
  const locationInput = document.querySelector("#edit-location");
  const locationCityInput = document.querySelector("#edit-location-city");
  const locationCountryInput = document.querySelector("#edit-location-country");
  const activityInput = document.querySelector("#edit-activity");

  // Find the new About You fields.
  const bioInput = document.querySelector("#edit-bio");
  const personalTagInputs = document.querySelectorAll('input[name="personal-tags"]');

  // Find the profile photo input and photo trigger button.
  const photoInput = document.querySelector("#edit-photo");
  const photoButtons = document.querySelectorAll("[data-photo-trigger]");
  const photoAvatar = document.querySelector(".profile-avatar-editable");

  // Stop if the required personal information fields are missing.
  const hasLocationField = locationInput || (locationCityInput && locationCountryInput);

  if (!nameInput || !emailInput || !hasLocationField || !activityInput) return;

  // Keep a local copy of the current user.
  let currentUser = user;

  if (locationCountryInput) {
    populateCountrySelect(locationCountryInput);
  }

  const currentLocation = parseProfileLocation(currentUser.location);

  // Fill the form fields with the current user data.
  nameInput.value = currentUser.name || "";
  emailInput.value = currentUser.email || "";
  if (locationInput) {
    locationInput.value = currentUser.location || "Klaipėda, Lithuania";
  }
  if (locationCityInput) {
    locationCityInput.value = currentLocation.city;
  }
  if (locationCountryInput) {
    setCountrySelectValue(locationCountryInput, currentLocation.country);
  }
  activityInput.value = currentUser.activity || "Walking";

  // Fill the short bio field.
  if (bioInput) {
    bioInput.value = currentUser.bio || "";
  }

  // Select the saved About You tags.
  setSelectedPersonalTags(currentUser.personalTags || []);

  // Show or remove the loading state on the profile photo button.
  const setPhotoUploadState = (isUploading) => {
    photoAvatar?.classList.toggle("is-uploading", isUploading);

    photoButtons.forEach((button) => {
      button.disabled = isUploading;
      button.setAttribute("aria-busy", String(isUploading));
    });
  };

  // Profile photo preview logic.
  // The selected photo is previewed only. It is not saved to the database yet.
  if (photoInput) {
    photoButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (!button.disabled) {
          photoInput.click();
        }
      });
    });

    photoInput.addEventListener("change", () => {
      const file = photoInput.files?.[0];

      if (!file) return;

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedTypes.includes(file.type)) {
        showPageToast("Please choose a JPG, PNG, or WebP image.");
        photoInput.value = "";
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        showPageToast("Profile photos must be 2MB or smaller.");
        photoInput.value = "";
        return;
      }

      setPhotoUploadState(true);

      const previewUrl = URL.createObjectURL(file);

      document.querySelectorAll("[data-user-avatar-image]").forEach((img) => {
        img.src = previewUrl;
        img.hidden = false;
      });

      document.querySelectorAll("[data-user-avatar-fallback]").forEach((fallback) => {
        fallback.hidden = true;
      });

      photoInput.value = "";
      setPhotoUploadState(false);

      showPageToast("Profile photo preview updated. Saving photo will be added later.");
    });
  }

  // Save the edited personal information.
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Collect the updated personal information.
    const updated = {
      ...currentUser,
      name: nameInput.value.trim(),
      email: emailInput.value.trim().toLowerCase(),
      location: getProfileLocationValue(locationCityInput, locationCountryInput, locationInput),
      activity: activityInput.value,
      bio: bioInput ? bioInput.value.trim() : "",
      personalTags: getSelectedPersonalTags(),
    };

    try {
      // Save the updated profile information to the backend.
      const savedUser =
        typeof saveClimaProfile === "function"
          ? await saveClimaProfile(updated)
          : updated;

      // Store the saved user data locally.
      currentUser = savedUser;

      const savedLocation = parseProfileLocation(savedUser.location);

      if (locationInput) {
        locationInput.value = savedUser.location || "Klaipėda, Lithuania";
      }
      if (locationCityInput) {
        locationCityInput.value = savedLocation.city;
      }
      if (locationCountryInput) {
        setCountrySelectValue(locationCountryInput, savedLocation.country);
      }

      // Refresh all user interface data on the page.
      updateUserInterface(savedUser);

      // Keep the saved tags selected after saving.
      setSelectedPersonalTags(savedUser.personalTags || []);

      // Show success message.
      showPageToast("Personal information updated successfully.");
    } catch (error) {
      showPageToast(error.message || "Could not update personal information.");
    }
  });


  // Get selected About You tags from the checkboxes.
  function getSelectedPersonalTags() {
    return Array.from(personalTagInputs)
      .filter((input) => input.checked)
      .map((input) => input.value);
  }


  // Mark saved About You tags as selected.
  function setSelectedPersonalTags(savedTags) {
    personalTagInputs.forEach((input) => {
      input.checked = savedTags.includes(input.value);
    });
  }
}


function populateCountrySelect(select) {
  const existingValue = select.value;

  if (select.options.length <= 1) {
    PROFILE_COUNTRIES.forEach((country) => {
      const option = document.createElement("option");

      option.value = country;
      option.textContent = country;
      select.appendChild(option);
    });
  }

  if (existingValue) {
    setCountrySelectValue(select, existingValue);
  }
}


function parseProfileLocation(location) {
  const text = String(location || "Klaipėda, Lithuania").trim();
  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    city: parts[0] || "Klaipėda",
    country: parts.slice(1).join(", ") || "Lithuania",
  };
}


function setCountrySelectValue(select, country) {
  const selectedCountry = String(country || "Lithuania").trim();
  const existingOption = Array.from(select.options).find(
    (option) => option.value.toLowerCase() === selectedCountry.toLowerCase()
  );

  if (existingOption) {
    select.value = existingOption.value;
    return;
  }

  const option = document.createElement("option");

  option.value = selectedCountry;
  option.textContent = selectedCountry;
  select.appendChild(option);
  select.value = selectedCountry;
}


function getProfileLocationValue(cityInput, countrySelect, fallbackInput) {
  if (fallbackInput) {
    return fallbackInput.value.trim() || "Klaipėda, Lithuania";
  }

  const city = cityInput?.value.trim() || "Klaipėda";
  const country = countrySelect?.value.trim() || "Lithuania";

  return `${city}, ${country}`;
}


// Show a small toast message.
function showPageToast(text) {
  const toast = document.querySelector("#page-toast");

  if (!toast) {
    return alert(text);
  }

  toast.textContent = text;
  toast.classList.add("is-visible");

  setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}
