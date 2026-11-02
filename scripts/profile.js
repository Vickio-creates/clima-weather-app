// Find all profile tab buttons: Personal Info, Preferences, Notifications, Security.
const tabs = document.querySelectorAll("[data-profile-tab]");

// Find all profile panels/sections that belong to the tabs.
const panels = document.querySelectorAll("[data-profile-panel]");

// Find all selectable preference buttons, such as Student, Sensitive to Cold, Warm Clothing.
const preferenceButtons = document.querySelectorAll("button.profile-pill");

// Find the Save Changes button and the paragraph used to show save status messages.
const savePreferencesButton = document.querySelector("button.save-preferences-btn");
const savePreferencesStatus = document.querySelector(".save-preferences-status");

// Find the summary text elements on the right side of the Preferences page.
const summaryActivities = document.querySelector("[data-summary-activities]");
const summarySensitivities = document.querySelector("[data-summary-sensitivities]");
const summaryClothing = document.querySelector("[data-summary-clothing]");
const summaryAssistant = document.querySelector("[data-summary-assistant]");

// Find the notification controls. Keeping the selector map in one place makes
// the frontend payload and the PHP endpoint easy to compare while learning.
const notificationControls = {
    email: document.querySelector("#notify-channel-email"),
    push: document.querySelector("#notify-channel-push"),
    weatherAlerts: document.querySelector("#notify-types-weather-alerts"),
    dailySummary: document.querySelector("#notify-types-daily-weather-summary"),
    activityReminders: document.querySelector("#notify-types-activity-reminder"),
    clothingRecommendations: document.querySelector("#notify-types-clothing"),
    generalUpdates: document.querySelector("#notify-types-info"),
    quietHoursFrom: document.querySelector("#quiet-hours-from"),
    quietHoursTo: document.querySelector("#quiet-hours-to"),
};
const weatherAlertTypeControls = Array.from(
    document.querySelectorAll("[data-weather-alert-type]")
);
const weatherAlertSubtypeGroup = document.querySelector("#weather-alert-subtypes");

const notificationSaveStatus = document.querySelector("[data-notification-save-status]");
const changePasswordButton = document.querySelector(".security-update-button");
const passwordChangeStatus = document.querySelector("[data-password-change-status]");
let notificationSaveTimer;
let notificationRequestInProgress = false;
let notificationSavePending = false;
let isSavingPreferences = false;


function setPreferencesSaveStatus(message, state = "") {
    if (!savePreferencesStatus) {
        return;
    }

    savePreferencesStatus.textContent = message;
    savePreferencesStatus.classList.toggle("is-error", state === "error");
    savePreferencesStatus.classList.toggle("is-success", state === "success");
    savePreferencesStatus.classList.toggle("is-pending", state === "pending");
}


// Send the password change to the backend for the currently logged-in user.
if (changePasswordButton && passwordChangeStatus) {
    changePasswordButton.addEventListener("click", async () => {
        const currentPassword = document.querySelector("#security-current-password")?.value ?? "";
        const newPassword = document.querySelector("#security-new-password")?.value ?? "";
        const confirmPassword = document.querySelector("#security-confirm-password")?.value ?? "";

        passwordChangeStatus.classList.remove("is-error");

        if (Array.from(newPassword).length < 15) {
            passwordChangeStatus.textContent = "The new password must be at least 15 characters.";
            passwordChangeStatus.classList.add("is-error");
            return;
        }

        passwordChangeStatus.textContent = "Updating password...";
        changePasswordButton.disabled = true;

        try {
            const response = await fetch("backend/security/change_password.php", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(result.error || "Could not update password.");
            }

            passwordChangeStatus.textContent = result.message || "Password updated successfully.";
            document.querySelector("#security-current-password").value = "";
            document.querySelector("#security-new-password").value = "";
            document.querySelector("#security-confirm-password").value = "";
        } catch (error) {
            passwordChangeStatus.textContent = error.message || "Could not update password. Please try again.";
            passwordChangeStatus.classList.add("is-error");
        } finally {
            changePasswordButton.disabled = false;
        }
    });
}


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
        setPreferencesSaveStatus("");
    });
});


// Add save behavior only if the Save button and status paragraph exist.
if (savePreferencesButton && savePreferencesStatus) {
    savePreferencesButton.addEventListener("click", async () => {
        if (isSavingPreferences) {
            return;
        }

        // Collect selected preference values from each preference group.
        const preferencesPayload = {
            activities: getSelectedPreferenceValues("activities"),
            weatherSensitivities: getSelectedPreferenceValues("weatherSensitivities"),
            clothingStyle: getSelectedPreferenceValues("clothing"),
            assistantTone: getSelectedPreferenceValues("assistant"),
        };

        isSavingPreferences = true;
        savePreferencesButton.disabled = true;
        savePreferencesButton.setAttribute("aria-busy", "true");
        preferenceButtons.forEach((button) => {
            button.disabled = true;
        });

        try {
            setPreferencesSaveStatus("Saving preferences...", "pending");

            // Send the selected preferences to the PHP backend.
            const response = await fetch("backend/profile/update_preferences.php", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(preferencesPayload),
            });

            // Read the JSON response from PHP.
            const result = await response.json().catch(() => ({}));

            // If the backend returns an error, show the error message.
            if (!response.ok) {
                throw new Error(result.error || `Could not save preferences (HTTP ${response.status}).`);
            }

            if (result.success !== true) {
                throw new Error(result.error || "The server did not confirm that preferences were saved.");
            }

            // Announce success only after the server confirms the save.
            setPreferencesSaveStatus(
                result.message || "Preferences saved successfully.",
                "success"
            );
            updatePreferencesSummary();
        } catch (error) {
            const message = error instanceof TypeError
                ? "Could not connect to save preferences. Check your connection and try again."
                : error.message || "Could not save preferences. Please try again.";
            setPreferencesSaveStatus(message, "error");
        } finally {
            isSavingPreferences = false;
            savePreferencesButton.disabled = false;
            savePreferencesButton.removeAttribute("aria-busy");
            preferenceButtons.forEach((button) => {
                button.disabled = false;
            });
        }
    });
}


// Update the Preferences Summary based on the selected active buttons.
function updatePreferencesSummary() {
    // Get selected activities and show them in the Activities summary.
    const activityText = getSelectedPreferenceValues("activities");
    const activitySummary = activityText.join(", ");

    summaryActivities.textContent = activitySummary || "None selected";

    // Get selected sensitivities and show them in the matching summary.
    const sensitivityText = getSelectedPreferenceValues("weatherSensitivities");
    const sensitivitySummary = sensitivityText.join(", ");

    summarySensitivities.textContent = sensitivitySummary || "None selected";

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

    // Apply saved activities, sensitivities, clothing style, and assistant tone.
    setActivePreferenceButtons("activities", preferences.activities || []);
    setActivePreferenceButtons(
        "weatherSensitivities",
        preferences.weatherSensitivities || []
    );
    setActivePreferenceButtons("clothing", preferences.clothingStyle || []);
    setActivePreferenceButtons("assistant", preferences.assistantTone || []);

    // Update the summary after activating the saved buttons.
    updatePreferencesSummary();
}


function readLegacyOnboardingSensitivities() {
    try {
        const raw = sessionStorage.getItem("climaWeatherSensitivities");
        if (raw === null) return null;

        const savedValues = JSON.parse(raw);
        if (!Array.isArray(savedValues)) return null;
        if (savedValues.includes("none")) return [];

        const labels = {
            cold: "Sensitive to Cold",
            heat: "Sensitive to Heat",
            rain: "Sensitive to Rain",
            wind: "Sensitive to Wind",
            snow: "Sensitive to Snow",
            pollen: "Sensitive to Pollen",
            air_quality: "Sensitive to Poor Air Quality",
            "Sensitive to Cold": "Sensitive to Cold",
            "Sensitive to Heat": "Sensitive to Heat",
            "Sensitive to Rain": "Sensitive to Rain",
            "Sensitive to Wind": "Sensitive to Wind",
            "Sensitive to Snow": "Sensitive to Snow",
            "Sensitive to Pollen": "Sensitive to Pollen",
            "Sensitive to Poor Air Quality": "Sensitive to Poor Air Quality",
        };

        if (savedValues.some((value) => !Object.prototype.hasOwnProperty.call(labels, value))) {
            return null;
        }

        return Array.from(new Set(savedValues.map((value) => labels[value])));
    } catch {
        return null;
    }
}


// Load saved preferences from the logged-in user's session data.
async function loadSavedPreferences() {
    // requireClimaAuth checks if the user is logged in and returns the user data.
    if (typeof requireClimaAuth !== "function") {
        return;
    }

    const user = await requireClimaAuth();

    // Migrate onboarding-only values only when the database has no value yet.
    if (user && user.preferences) {
        let preferences = user.preferences;

        if (!Array.isArray(preferences.weatherSensitivities)) {
            const legacySensitivities = readLegacyOnboardingSensitivities();

            if (legacySensitivities !== null) {
                preferences = {
                    ...preferences,
                    weatherSensitivities: legacySensitivities,
                };

                try {
                    const response = await fetch("backend/profile/update_preferences.php", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ weatherSensitivities: legacySensitivities }),
                    });
                    const result = await response.json().catch(() => ({}));

                    if (response.ok && result.success === true) {
                        sessionStorage.removeItem("climaWeatherSensitivities");
                    }
                } catch (error) {
                    console.error("Could not migrate onboarding weather preferences:", error);
                }
            }
        }

        // The authenticated session response remains the source of saved values.
        applySavedPreferences(preferences);
    }
}


// First update the summary using the default active buttons in HTML.
updatePreferencesSummary();

// Then load saved preferences from the database and replace the defaults.
loadSavedPreferences();


// Return true only on pages that include the complete notification form.
function hasNotificationControls() {
    return Object.values(notificationControls).every((control) => control) &&
        weatherAlertTypeControls.length === 4;
}


function syncWeatherAlertSubtypeVisibility() {
    if (weatherAlertSubtypeGroup && notificationControls.weatherAlerts) {
        // Hiding the options never clears their checked values.
        weatherAlertSubtypeGroup.hidden = !notificationControls.weatherAlerts.checked;
    }
}


// Put saved notification values into the matching checkboxes and time selects.
function applyNotificationSettings(settings) {
    if (!settings || !hasNotificationControls()) {
        return;
    }

    const channels = settings.channels || {};
    const types = settings.types || {};
    const quietHours = settings.quietHours || {};

    if (typeof channels.email === "boolean") {
        notificationControls.email.checked = channels.email;
    }

    if (typeof channels.push === "boolean") {
        notificationControls.push.checked = channels.push;
    }

    if (typeof types.weatherAlerts === "boolean") {
        notificationControls.weatherAlerts.checked = types.weatherAlerts;
    }

    if (Array.isArray(types.weatherAlertTypes)) {
        weatherAlertTypeControls.forEach((control) => {
            control.checked = types.weatherAlertTypes.includes(control.value);
        });
    }

    if (typeof types.dailySummary === "boolean") {
        notificationControls.dailySummary.checked = types.dailySummary;
    }

    if (typeof types.activityReminders === "boolean") {
        notificationControls.activityReminders.checked = types.activityReminders;
    }

    if (typeof types.clothingRecommendations === "boolean") {
        notificationControls.clothingRecommendations.checked = types.clothingRecommendations;
    }

    if (typeof types.generalUpdates === "boolean") {
        notificationControls.generalUpdates.checked = types.generalUpdates;
    }

    if (quietHours.from) {
        notificationControls.quietHoursFrom.value = quietHours.from;
    }

    if (quietHours.to) {
        notificationControls.quietHoursTo.value = quietHours.to;
    }

    syncWeatherAlertSubtypeVisibility();
}


// Convert the current control values into the exact JSON shape expected by PHP.
function getNotificationPayload() {
    return {
        channels: {
            email: notificationControls.email.checked,
            push: notificationControls.push.checked,
        },
        types: {
            weatherAlerts: notificationControls.weatherAlerts.checked,
            dailySummary: notificationControls.dailySummary.checked,
            activityReminders: notificationControls.activityReminders.checked,
            clothingRecommendations: notificationControls.clothingRecommendations.checked,
            generalUpdates: notificationControls.generalUpdates.checked,
        },
        weatherAlertTypes: weatherAlertTypeControls
            .filter((control) => control.checked)
            .map((control) => control.value),
        quietHours: {
            from: notificationControls.quietHoursFrom.value,
            to: notificationControls.quietHoursTo.value,
        },
    };
}


// Give the user short, accessible feedback without adding a separate Save button.
function showNotificationSaveStatus(message, isError = false) {
    if (!notificationSaveStatus) {
        return;
    }

    notificationSaveStatus.textContent = message;
    notificationSaveStatus.classList.toggle("is-error", isError);
}


// Wait briefly so several quick changes are saved as one request.
function queueNotificationSave() {
    window.clearTimeout(notificationSaveTimer);
    showNotificationSaveStatus("Saving notification settings...");

    notificationSaveTimer = window.setTimeout(() => {
        saveNotificationSettings();
    }, 350);
}


// Save the notification JSON for the user identified by the PHP session cookie.
async function saveNotificationSettings() {
    // If a request is already running, save once more immediately afterwards.
    // This prevents a quick second change from being lost.
    if (notificationRequestInProgress) {
        notificationSavePending = true;
        return;
    }

    notificationRequestInProgress = true;

    try {
        const response = await fetch("backend/profile/update_notifications.php", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(getNotificationPayload()),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(result.error || "Could not save notification settings.");
        }

        if (result.success !== true || !result.notifications) {
            throw new Error(result.error || "Could not confirm saved notification settings.");
        }

        applyNotificationSettings(result.notifications);

        showNotificationSaveStatus(result.message || "Notification settings saved.");
    } catch (error) {
        showNotificationSaveStatus(
            error.message || "Could not save notification settings. Please try again.",
            true
        );
    } finally {
        notificationRequestInProgress = false;

        if (notificationSavePending) {
            notificationSavePending = false;
            saveNotificationSettings();
        }
    }
}


// Load settings after authentication, then listen for future toggle/select changes.
async function initializeNotificationSettings() {
    if (!hasNotificationControls() || typeof requireClimaAuth !== "function") {
        return;
    }

    const user = await requireClimaAuth();

    if (!user) {
        return;
    }

    applyNotificationSettings(user.notifications);

    await migrateLegacyOnboardingAlertSelections(user.notifications);

    Object.values(notificationControls).forEach((control) => {
        control.addEventListener("change", queueNotificationSave);
    });

    weatherAlertTypeControls.forEach((control) => {
        control.addEventListener("change", queueNotificationSave);
    });

    notificationControls.weatherAlerts.addEventListener(
        "change",
        syncWeatherAlertSubtypeVisibility
    );
}


async function migrateLegacyOnboardingAlertSelections(settings) {
    if (Array.isArray(settings?.types?.weatherAlertTypes)) {
        return;
    }

    try {
        const raw = sessionStorage.getItem("climaNotificationPreferences");
        if (raw === null) return;

        const savedValues = JSON.parse(raw);
        const allowedTypes = ["heavy_rain", "strong_wind", "cold_warning", "extreme_heat"];

        if (
            !Array.isArray(savedValues) ||
            savedValues.some((value) => !allowedTypes.includes(value))
        ) {
            return;
        }

        weatherAlertTypeControls.forEach((control) => {
            control.checked = savedValues.includes(control.value);
        });

        const response = await fetch("backend/profile/update_notifications.php", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ weatherAlertTypes: savedValues }),
        });
        const result = await response.json().catch(() => ({}));

        if (
            response.ok &&
            result.success === true &&
            Array.isArray(result.notifications?.types?.weatherAlertTypes)
        ) {
            if (result.notifications) {
                applyNotificationSettings(result.notifications);
            }
            sessionStorage.removeItem("climaNotificationPreferences");
        } else {
            showNotificationSaveStatus(
                result.error || "Could not migrate saved onboarding alerts.",
                true
            );
        }
    } catch (error) {
        showNotificationSaveStatus(
            error.message || "Could not migrate saved onboarding alerts.",
            true
        );
    }
}


initializeNotificationSettings();

function formatProfileWeatherTime(unixTime, timezoneOffset) {
    if (!unixTime) return "--:--";

    const date = new Date(
        (Number(unixTime) + Number(timezoneOffset || 0)) * 1000
    );

    return `${String(date.getUTCHours()).padStart(2, "0")}:${String(
        date.getUTCMinutes()
    ).padStart(2, "0")}`;
}

async function loadProfileWeather() {
    try {
        const response = await fetch("api.php?city=Klaipeda");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Could not load weather.");
        }

        document.querySelectorAll(".current-weather-summary strong").forEach((element) => {
            element.textContent = `${data.temperature ?? "--"}°C`;
        });

        document.querySelectorAll(".current-weather-summary p").forEach((element) => {
            const description = data.description || data.condition || "Unknown";
            element.textContent = description.replace(/\b\w/g, (letter) => letter.toUpperCase());
        });

        document.querySelectorAll(".current-weather-summary span").forEach((element) => {
            element.textContent = `Feels like ${data.feelsLike ?? "--"}°C`;
        });

        document.querySelectorAll(".weather-details-list").forEach((list) => {
            const values = [
                `${data.humidity ?? "--"}%`,
                `${data.windSpeed ?? "--"} m/s`,
                `${data.feelsLike ?? "--"}°C`,
                formatProfileWeatherTime(data.sunrise, data.timezoneOffset),
                formatProfileWeatherTime(data.sunset, data.timezoneOffset),
            ];

            list.querySelectorAll("dd").forEach((element, index) => {
                element.textContent = values[index] ?? "--";
            });
        });

        document.querySelectorAll(".today-glance-list").forEach((list) => {
            list.querySelectorAll(":scope > div").forEach((row) => {
                const period = row.querySelector("span")?.textContent.trim().toLowerCase();
                const forecast = data.todayGlance?.find(
                    (item) => item.period.toLowerCase() === period
                );
                const temperature = row.querySelector("strong");

                if (temperature) {
                    temperature.textContent =
                        forecast?.temperature == null ? "—" : `${forecast.temperature}°C`;
                }
            });
        });
    } catch (error) {
        console.error("Could not load profile weather:", error);
    }
}

loadProfileWeather();
