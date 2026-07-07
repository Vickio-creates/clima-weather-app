document.addEventListener("DOMContentLoaded", async () => {
  const user = typeof requireClimaAuth === "function" ? await requireClimaAuth() : null;
  if (!user) return;

  updateUserInterface(user);
  initProfileEdit(user);
  initPreferenceForms(user);
  initDeviceMenus();
  if (window.lucide) lucide.createIcons();
});

function initProfileEdit(user) {
  const form = document.querySelector("#profile-edit-form");
  if (!form) return;

  document.querySelector("#edit-name").value = user.name || "";
  document.querySelector("#edit-email").value = user.email || "";
  document.querySelector("#edit-location").value = user.location || "Klaipėda, Lithuania";
  document.querySelector("#edit-activity").value = user.activity || "Walking";
  document.querySelector("#edit-health").value = user.healthSensitivity || "None selected";
  document.querySelector("#edit-units").value = user.units || "Metric";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const updated = {
      ...user,
      name: document.querySelector("#edit-name").value.trim(),
      email: document.querySelector("#edit-email").value.trim().toLowerCase(),
      location: document.querySelector("#edit-location").value.trim(),
      activity: document.querySelector("#edit-activity").value,
      healthSensitivity: document.querySelector("#edit-health").value,
      units: document.querySelector("#edit-units").value
    };

    try {
      const savedUser = typeof saveClimaProfile === "function" ? await saveClimaProfile(updated) : updated;
      showPageToast("Profile updated successfully.");
      updateUserInterface(savedUser);
    } catch (error) {
      showPageToast(error.message || "Could not update profile.");
    }
  });
}

function initPreferenceForms(user) {
  const notificationForm = document.querySelector("#notification-form");
  if (notificationForm) {
    const n = user.notifications || {};
    setChecked("#notify-severe", n.severe !== false);
    setChecked("#notify-rain", n.rain !== false);
    setChecked("#notify-air", n.airQuality !== false);
    setChecked("#notify-summary", Boolean(n.dailySummary));

    notificationForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const updated = {
        ...user,
        notifications: {
          severe: getChecked("#notify-severe"),
          rain: getChecked("#notify-rain"),
          airQuality: getChecked("#notify-air"),
          dailySummary: getChecked("#notify-summary")
        }
      };

      try {
        const savedUser = typeof saveClimaProfile === "function" ? await saveClimaProfile(updated) : updated;
        user = savedUser;
        showPageToast("Notification preferences saved.");
      } catch (error) {
        showPageToast(error.message || "Could not save notification preferences.");
      }
    });
  }

  const privacyForm = document.querySelector("#privacy-form");
  if (privacyForm) {
    const p = user.privacy || {};
    document.querySelector("#privacy-location").value = p.location || "While using the app";
    setChecked("#privacy-personalization", p.profilePersonalization !== false);
    setChecked("#privacy-history", p.activityHistory !== false);

    privacyForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const updated = {
        ...user,
        privacy: {
          location: document.querySelector("#privacy-location").value,
          profilePersonalization: getChecked("#privacy-personalization"),
          activityHistory: getChecked("#privacy-history")
        }
      };

      try {
        const savedUser = typeof saveClimaProfile === "function" ? await saveClimaProfile(updated) : updated;
        user = savedUser;
        showPageToast("Privacy controls saved.");
      } catch (error) {
        showPageToast(error.message || "Could not save privacy controls.");
      }
    });
  }
}

function initDeviceMenus() {
  document.querySelectorAll("[data-device-menu]").forEach((button) => {
    button.addEventListener("click", () => {
      const menu = button.nextElementSibling;
      if (!menu) return;
      document.querySelectorAll(".device-menu.is-open").forEach((openMenu) => {
        if (openMenu !== menu) openMenu.classList.remove("is-open");
      });
      menu.classList.toggle("is-open");
    });
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest(".device-actions")) return;
    document.querySelectorAll(".device-menu.is-open").forEach((menu) => menu.classList.remove("is-open"));
  });

  document.querySelectorAll("[data-demo-action]").forEach((button) => {
    button.addEventListener("click", () => showPageToast(button.dataset.demoAction));
  });
}

function setChecked(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.checked = Boolean(value);
}

function getChecked(selector) {
  return Boolean(document.querySelector(selector)?.checked);
}

function showPageToast(text) {
  const toast = document.querySelector("#page-toast");
  if (!toast) return alert(text);
  toast.textContent = text;
  toast.classList.add("is-visible");
  setTimeout(() => toast.classList.remove("is-visible"), 2600);
}
