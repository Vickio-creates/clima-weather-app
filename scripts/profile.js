// Find all profile tab buttons: Personal Info, Preferences, Notifications, Security.
const tabs = document.querySelectorAll("[data-profile-tab]");

// Find all profile panels/sections that belong to the tabs.
const panels = document.querySelectorAll("[data-profile-panel]");

// Find all selectable preference buttons, such as Student, Rain Alerts, Warm Clothing.
const preferenceButtons = document.querySelectorAll("button.profile-pill");

// Find the Save Changes button and the paragraph used to show save status messages.
const savePreferencesButton = document.querySelector("button.save-preferences-btn");
const savePreferencesStatus = document.querySelector(".save-preferences-status");

// Find the summary text elements on the right side of the Preferences page.
const summaryActivities = document.querySelector("[data-summary-activities]");
const summaryWeather = document.querySelector("[data-summary-weather]");
const summaryClothing = document.querySelector("[data-summary-clothing]");
const summaryAssistant = document.querySelector("[data-summary-assistant]");


// Go through each tab button one by one.
tabs.forEach((tab) => {
    // Add a click event to each tab.
    tab.addEventListener("click", () => {
        // Get the value of the clicked tab, for example: personal or preferences.
        const selectedTab = tab.dataset.profileTab;

        // Remove the active class from all tabs.
        tabs.forEach((singleTab) => {
            singleTab.classList.remove("active");
        });

        // Add the active class to the tab that was clicked.
        tab.classList.add("active");

        // Hide all profile panels before showing the selected one.
        panels.forEach((singlePanel) => {
            singlePanel.hidden = true;
            singlePanel.classList.remove("active");
        });

        // Find the panel that matches the clicked tab.
        // Example: if selectedTab is "preferences", this finds data-profile-panel="preferences".
        const activePanel = document.querySelector(`[data-profile-panel="${selectedTab}"]`);

        // If the matching panel exists, show it.
        if (activePanel) {
            activePanel.hidden = false;
            activePanel.classList.add("active");
        }
    });
});


// Go through each preference button one by one.
preferenceButtons.forEach((button) => {
    // Add a click event to each preference button.
    button.addEventListener("click", () => {
        // Toggle the active class on or off when the button is clicked.
        button.classList.toggle("active");

        // Update the Preferences Summary after the selected buttons change.
        updatePreferencesSummary();

        // Clear the save message because the user changed preferences after saving.
        if (savePreferencesStatus) {
            savePreferencesStatus.textContent = "";
        }
    });
});


// Add save behavior only if the Save button and status paragraph exist.
if (savePreferencesButton && savePreferencesStatus) {
    savePreferencesButton.addEventListener("click", async () => {
        // Collect selected preference values from each preference group.
        const preferencesPayload = {
            activities: getSelectedPreferenceValues("activities"),
            weatherFocus: getSelectedPreferenceValues("weather"),
            clothingStyle: getSelectedPreferenceValues("clothing"),
            assistantTone: getSelectedPreferenceValues("assistant"),
        };

        try {
            // Show feedback while the request is being sent to the backend.
            savePreferencesStatus.textContent = "Saving preferences...";
            savePreferencesButton.disabled = true;

            // Send the selected preferences to the PHP backend.
            const response = await fetch("backend/profile/update_preferences.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(preferencesPayload),
            });

            // Read the JSON response from PHP.
            const result = await response.json();

            // If the backend returns an error, show the error message.
            if (!response.ok) {
                savePreferencesStatus.textContent = result.error || "Could not save preferences.";
                return;
            }

            // Show the success message returned by the backend.
            savePreferencesStatus.textContent = result.message || "Preferences saved successfully.";
        } catch (error) {
            // Show a general error message if the request fails.
            savePreferencesStatus.textContent = "Could not save preferences. Please try again.";
        } finally {
            // Enable the Save button again after the request finishes.
            savePreferencesButton.disabled = false;
        }
    });
}


// Update the Preferences Summary based on the selected active buttons.
function updatePreferencesSummary() {
    // Get selected activities and show them in the Activities summary.
    const activityText = getSelectedPreferenceValues("activities");
    const activitySummary = activityText.join(", ");

    summaryActivities.textContent = activitySummary || "None selected";

    // Get selected weather preferences and show them in the Weather focus summary.
    const weatherText = getSelectedPreferenceValues("weather");
    const weatherSummary = weatherText.join(", ");

    summaryWeather.textContent = weatherSummary || "None selected";

    // Get selected clothing preferences and show them in the Clothing style summary.
    const clothingText = getSelectedPreferenceValues("clothing");
    const clothingSummary = clothingText.join(", ");

    summaryClothing.textContent = clothingSummary || "None selected";

    // Get selected assistant preferences and show them in the Assistant tone summary.
    const assistantText = getSelectedPreferenceValues("assistant");
    const assistantSummary = assistantText.join(", ");

    summaryAssistant.textContent = assistantSummary || "None selected";
}


// Get the selected button texts from one preference group.
function getSelectedPreferenceValues(groupName) {
    // Find all active buttons inside the selected group.
    const selectedButtons = document.querySelectorAll(
        `[data-preference-group="${groupName}"] button.profile-pill.active`
    );

    // Convert the selected buttons into an array of clean text values.
    const selectedText = Array.from(selectedButtons).map((button) => {
        return button.textContent.trim();
    });

    // Return the selected values so other functions can use them.
    return selectedText;
}

// Activate the correct preference buttons using values loaded from the database.
function setActivePreferenceButtons(groupName, savedValues) {
    // Find all buttons inside the selected preference group.
    const groupButtons = document.querySelectorAll(
        `[data-preference-group="${groupName}"] button.profile-pill`
    );

    // Go through each button and check if it exists in the saved database values.
    groupButtons.forEach((button) => {
        const buttonText = button.textContent.trim();

        // If the saved values contain this button text, make it active.
        // Otherwise, remove the active class.
        button.classList.toggle("active", savedValues.includes(buttonText));
    });
}


// Apply all saved preference groups to the Profile page.
function applySavedPreferences(preferences) {
    // Stop the function if there are no saved preferences.
    if (!preferences) {
        return;
    }

    // Apply saved activities, weather focus, clothing style, and assistant tone.
    setActivePreferenceButtons("activities", preferences.activities || []);
    setActivePreferenceButtons("weather", preferences.weatherFocus || []);
    setActivePreferenceButtons("clothing", preferences.clothingStyle || []);
    setActivePreferenceButtons("assistant", preferences.assistantTone || []);

    // Update the summary after activating the saved buttons.
    updatePreferencesSummary();
}


// Load saved preferences from the logged-in user's session data.
async function loadSavedPreferences() {
    // requireClimaAuth checks if the user is logged in and returns the user data.
    if (typeof requireClimaAuth !== "function") {
        return;
    }

    const user = await requireClimaAuth();

    // If the backend returned saved preferences, apply them to the page.
    if (user && user.preferences) {
        applySavedPreferences(user.preferences);
    }
}


// First update the summary using the default active buttons in HTML.
updatePreferencesSummary();

// Then load saved preferences from the database and replace the defaults.
loadSavedPreferences();