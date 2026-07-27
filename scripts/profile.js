// Find all the tab buttons: Personal Info, Preferences, Notifications, Security
const tabs = document.querySelectorAll("[data-profile-tab]");

// Find all the profile sections/panels: personal section, preferences section, etc.
const panels = document.querySelectorAll("[data-profile-panel]");

// Go through each tab button one by one
tabs.forEach((tab) => {
    // Add a click event to each tab
    tab.addEventListener("click", () => {
        // Get the value of the clicked tab
        // Example: "personal" or "preferences"
        const selectedTab = tab.dataset.profileTab;

        // Remove the active class from all tabs
        // This clears the previous selected tab
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

        // Find the panel that matches the clicked tab
        // Example: if selectedTab is "preferences",
        // this finds data-profile-panel="preferences"
        const activePanel = document.querySelector(`[data-profile-panel="${selectedTab}"]`);

        // If the matching panel exists, show it
        if (activePanel) {
            activePanel.hidden = false;
            activePanel.classList.add("active");
        }
    });
});