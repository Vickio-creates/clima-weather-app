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

const notificationSaveStatus = document.querySelector("[data-notification-save-status]");
const changePasswordButton = document.querySelector(".security-update-button");
const passwordChangeStatus = document.querySelector("[data-password-change-status]");
let notificationSaveTimer;
let notificationRequestInProgress = false;
let notificationSavePending = false;


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


// Keep the two-factor card connected to the authenticated PHP endpoints.
const twoFactorAction = document.querySelector("[data-two-factor-action]");
const twoFactorPanel = document.querySelector("[data-two-factor-panel]");
const twoFactorBadge = document.querySelector("[data-two-factor-badge]");
const twoFactorDescription = document.querySelector("[data-two-factor-description]");
const twoFactorStatus = document.querySelector("[data-two-factor-status]");
const twoFactorSetup = document.querySelector("[data-two-factor-setup]");
const twoFactorEnrollment = document.querySelector("[data-two-factor-enrollment]");
const twoFactorDisable = document.querySelector("[data-two-factor-disable]");
const twoFactorRecovery = document.querySelector("[data-two-factor-recovery]");
const twoFactorRecoveryList = document.querySelector("[data-two-factor-recovery-list]");
let twoFactorEnabled = false;

function setTwoFactorMessage(message, isError = false) {
    if (!twoFactorStatus) return;
    twoFactorStatus.textContent = message;
    twoFactorStatus.classList.toggle("is-error", isError);
}

async function requestTwoFactorJson(url, method = "POST", payload = {}) {
    const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...(method === "GET" ? {} : { body: JSON.stringify(payload) }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result.error || "Could not update two-factor authentication.");
    }

    return result;
}

function updateTwoFactorStatus(enabled, recoveryCodesRemaining = 0) {
    twoFactorEnabled = enabled;
    twoFactorBadge.textContent = enabled ? "Enabled" : "Not enabled";
    twoFactorAction.textContent = enabled ? "Manage" : "Set up";
    twoFactorAction.disabled = false;
    twoFactorDescription.textContent = enabled
        ? `Authenticator sign-in is active. ${recoveryCodesRemaining} recovery codes remain.`
        : "Use an authenticator app to require a code at sign-in.";
}

function displayRecoveryCodes(codes) {
    twoFactorRecoveryList.replaceChildren();
    codes.forEach((value) => {
        const item = document.createElement("li");
        const code = document.createElement("code");
        code.textContent = value;
        item.append(code);
        twoFactorRecoveryList.append(item);
    });
    twoFactorRecovery.hidden = false;
}

async function loadTwoFactorStatus() {
    if (!twoFactorAction || !twoFactorPanel) return;

    try {
        const result = await requestTwoFactorJson("backend/security/two_factor_status.php", "GET");
        updateTwoFactorStatus(Boolean(result.enabled), Number(result.recoveryCodesRemaining || 0));
    } catch (error) {
        twoFactorAction.disabled = true;
        twoFactorAction.textContent = "Unavailable";
        setTwoFactorMessage(error.message, true);
    }
}

if (twoFactorAction && twoFactorPanel) {
    loadTwoFactorStatus();

    twoFactorAction.addEventListener("click", () => {
        twoFactorPanel.hidden = !twoFactorPanel.hidden;
        if (twoFactorPanel.hidden) return;

        setTwoFactorMessage("");
        // Keep one-time recovery codes visible if the panel was closed before
        // the user confirmed that they had saved them.
        if (!twoFactorRecovery.hidden) return;

        if (twoFactorEnabled) {
            twoFactorSetup.hidden = true;
            twoFactorDisable.hidden = false;
            document.querySelector("#two-factor-disable-password").value = "";
            document.querySelector("#two-factor-disable-code").value = "";
        } else {
            twoFactorSetup.hidden = false;
            twoFactorDisable.hidden = true;
            twoFactorEnrollment.hidden = true;
            document.querySelector("[data-two-factor-secret]").textContent = "";
            document.querySelector("[data-two-factor-start]").textContent = "Start setup";
            document.querySelector("#two-factor-setup-password").value = "";
            document.querySelector("#two-factor-setup-code").value = "";
        }
    });

    document.querySelector("[data-two-factor-start]")?.addEventListener("click", async (event) => {
        const button = event.currentTarget;
        const password = document.querySelector("#two-factor-setup-password").value;
        if (!password) {
            setTwoFactorMessage("Enter your current password first.", true);
            return;
        }

        button.disabled = true;
        setTwoFactorMessage("Preparing authenticator setup...");
        try {
            const result = await requestTwoFactorJson("backend/security/two_factor_setup.php", "POST", {
                currentPassword: password,
            });
            document.querySelector("#two-factor-setup-password").value = "";
            document.querySelector("[data-two-factor-secret]").textContent = result.secret;
            button.textContent = "Generate a new setup key";
            twoFactorEnrollment.hidden = false;
            setTwoFactorMessage(result.message || "Setup key created.");
            document.querySelector("#two-factor-setup-code").focus();
        } catch (error) {
            setTwoFactorMessage(error.message, true);
        } finally {
            button.disabled = false;
        }
    });

    document.querySelector("[data-two-factor-confirm]")?.addEventListener("click", async (event) => {
        const button = event.currentTarget;
        const code = document.querySelector("#two-factor-setup-code").value.trim();
        if (!/^\d{6}$/.test(code)) {
            setTwoFactorMessage("Enter the six-digit code shown in your authenticator app.", true);
            return;
        }

        button.disabled = true;
        setTwoFactorMessage("Verifying the authenticator...");
        try {
            const result = await requestTwoFactorJson("backend/security/two_factor_confirm.php", "POST", { code });
            document.querySelector("#two-factor-setup-code").value = "";
            document.querySelector("[data-two-factor-secret]").textContent = "";
            twoFactorSetup.hidden = true;
            twoFactorDisable.hidden = false;
            updateTwoFactorStatus(true, result.recoveryCodes.length);
            setTwoFactorMessage(result.message);
            displayRecoveryCodes(result.recoveryCodes);
        } catch (error) {
            setTwoFactorMessage(error.message, true);
        } finally {
            button.disabled = false;
        }
    });

    document.querySelector("[data-two-factor-disable-button]")?.addEventListener("click", async (event) => {
        const button = event.currentTarget;
        const currentPassword = document.querySelector("#two-factor-disable-password").value;
        const code = document.querySelector("#two-factor-disable-code").value.trim();
        const method = document.querySelector("[data-two-factor-use-recovery]").checked ? "recovery" : "totp";

        if (!currentPassword || !code) {
            setTwoFactorMessage("Enter your current password and verification code.", true);
            return;
        }

        button.disabled = true;
        setTwoFactorMessage("Disabling two-factor authentication...");
        try {
            const result = await requestTwoFactorJson("backend/security/two_factor_disable.php", "POST", {
                currentPassword,
                code,
                method,
            });
            document.querySelector("#two-factor-disable-password").value = "";
            document.querySelector("#two-factor-disable-code").value = "";
            document.querySelector("[data-two-factor-use-recovery]").checked = false;
            twoFactorDisable.hidden = true;
            twoFactorSetup.hidden = false;
            twoFactorEnrollment.hidden = true;
            updateTwoFactorStatus(false, 0);
            setTwoFactorMessage(result.message);
        } catch (error) {
            setTwoFactorMessage(error.message, true);
        } finally {
            button.disabled = false;
        }
    });

    document.querySelector("[data-two-factor-reissue]")?.addEventListener("click", async (event) => {
        const button = event.currentTarget;
        const currentPassword = document.querySelector("#two-factor-disable-password").value;
        const code = document.querySelector("#two-factor-disable-code").value.trim();

        if (!currentPassword || !/^\d{6}$/.test(code)) {
            setTwoFactorMessage("Enter your current password and a six-digit authenticator code.", true);
            return;
        }

        button.disabled = true;
        setTwoFactorMessage("Creating replacement recovery codes...");
        try {
            const result = await requestTwoFactorJson("backend/security/two_factor_recovery_codes.php", "POST", {
                currentPassword,
                code,
            });
            document.querySelector("#two-factor-disable-password").value = "";
            document.querySelector("#two-factor-disable-code").value = "";
            updateTwoFactorStatus(true, result.recoveryCodes.length);
            setTwoFactorMessage(result.message);
            displayRecoveryCodes(result.recoveryCodes);
        } catch (error) {
            setTwoFactorMessage(error.message, true);
        } finally {
            button.disabled = false;
        }
    });

    document.querySelector("[data-two-factor-recovery-dismiss]")?.addEventListener("click", () => {
        twoFactorRecovery.hidden = true;
        twoFactorRecoveryList.replaceChildren();
        loadTwoFactorStatus();
        setTwoFactorMessage("Authenticator sign-in is active.");
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


// Return true only on pages that include the complete notification form.
function hasNotificationControls() {
    return Object.values(notificationControls).every((control) => control);
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

    Object.values(notificationControls).forEach((control) => {
        control.addEventListener("change", queueNotificationSave);
    });
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
