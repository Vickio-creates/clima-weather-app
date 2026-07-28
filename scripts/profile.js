// Find all the tab buttons: Personal Info, Preferences, Notifications, Security
const tabs = document.querySelectorAll("[data-profile-tab]");

// Find all the profile sections/panels: personal section, preferences section, etc.
const panels = document.querySelectorAll("[data-profile-panel]");

// Go through each tab button one by one
tabs.forEach((tab) => {
  // Add a click event to each tab
  tab.addEventListener("click", () => {
    // Get the value of the clicked tab for example: personal or preferences
    const selectedTab = tab.dataset.profileTab;

    // Remove the active class from all tabs. This clears the previous selected tab
    tabs.forEach((singleTab) => {
      singleTab.classList.remove("active");
    });

    // Add the active class to the tab that was clicked
    tab.classList.add("active");

    // Hide all profile panels first
    panels.forEach((singlePanel) => {
      singlePanel.hidden = true;
      singlePanel.classList.remove("active");
    });

    // Find the panel that matches the clicked tab for example the if selectedTab is preferences,
    // this finds data-profile-panel="preferences"
    const activePanel = document.querySelector(
      `[data-profile-panel="${selectedTab}"]`,
    );

    // If the matching panel exists, show it
    if (activePanel) {
      activePanel.hidden = false;
      activePanel.classList.add("active");
    }
  });
});

// Find all the small selectable buttons like Student, Rain Alerts, Warm Clothing.
const preferenceButtons = document.querySelectorAll("button.profile-pill");

// Go through each preference button one by one.
preferenceButtons.forEach((button) => {
  // Add a click event to each button
  button.addEventListener("click", () => {
    // Toggle the active class on or off when the button is clicked
    button.classList.toggle("active");
    updatePreferencesSummary();
    savePreferencesStatus.textContent = "";
  });
});

const savePreferencesButton = document.querySelector(
  "button.save-preferences-btn",
);
const savePreferencesStatus = document.querySelector(
  ".save-preferences-status",
);

if (savePreferencesButton && savePreferencesStatus) {
  savePreferencesButton.addEventListener("click", () => {
    savePreferencesStatus.textContent = "Preferences saved successfully.";
  });
}

const summaryActivities = document.querySelector("[data-summary-activities]");
const summaryWeather = document.querySelector("[data-summary-weather]");
const summaryClothing = document.querySelector("[data-summary-clothing]");
const summaryAssistant = document.querySelector("[data-summary-assistant]");

// Update the Preferences Summary based on the selected active buttons.
function updatePreferencesSummary() {
    const activeActivityButtons = document.querySelectorAll('[data-preference-group="activities"] button.profile-pill.active');
    const activityText = Array.from(activeActivityButtons).map((button) => {
        return button.textContent.trim();
    });
    const activitySummary = activityText.join(", ");
    if (activitySummary) {
        summaryActivities.textContent = activitySummary;
    } else {
        summaryActivities.textContent = "None selected";
    }

    const activeWeatherButtons = document.querySelectorAll('[data-preference-group="weather"] button.profile-pill.active');
    const weatherText = Array.from(activeWeatherButtons).map((button) => {
        return button.textContent.trim();
    });
    const weatherSummary = weatherText.join(", ");
    if (weatherSummary) {
        summaryWeather.textContent = weatherSummary;
    } else {
        summaryWeather.textContent = "None selected";
    }
    
    const activeClothingButtons = document.querySelectorAll('[data-preference-group="clothing"] button.profile-pill.active');
    const clothingText = Array.from(activeClothingButtons).map((button) => {
        return button.textContent.trim();
    });
    const clothingSummary = clothingText.join(", ");
    if (clothingSummary) {
        summaryClothing.textContent = clothingSummary;
    } else {
        summaryClothing.textContent = "None selected";
    }
    
    const activeAssistantButtons = document.querySelectorAll('[data-preference-group="assistant"] button.profile-pill.active');
    const assistantText = Array.from(activeAssistantButtons).map((button) => {
        return button.textContent.trim();
    });
    const assistantSummary = assistantText.join(", ");
    if (assistantSummary) {
        summaryAssistant.textContent = assistantSummary;
    } else {
        summaryAssistant.textContent = "None selected";
    }
}