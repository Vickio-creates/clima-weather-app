document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();
  initMobileNav();
  initContactDialog();
  loadPreviewWeather("Vilnius");
});

function initMobileNav() {
  const nav = document.querySelector(".landing-nav");
  const toggle = document.querySelector(".nav-toggle");
  if (!nav || !toggle) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.innerHTML = isOpen
      ? '<i data-lucide="x"></i>'
      : '<i data-lucide="menu"></i>';
    if (window.lucide) lucide.createIcons();
  });

  nav.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.innerHTML = '<i data-lucide="menu"></i>';
      if (window.lucide) lucide.createIcons();
    });
  });
}

function initContactDialog() {
  const dialog = document.querySelector("#contact-dialog");
  const openButtons = document.querySelectorAll("[data-open-contact]");
  const closeButton = document.querySelector("[data-close-contact]");
  const form = document.querySelector(".contact-form");

  if (!dialog) return;

  openButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      dialog.showModal();
      if (window.lucide) lucide.createIcons();
    });
  });

  closeButton?.addEventListener("click", () => {
    dialog.close();
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  form?.addEventListener("submit", () => {
    alert("Thank you. Your message is ready for the next contact setup step.");
  });
}

async function loadPreviewWeather(city) {
  const locationEl = document.querySelector("#preview-location");
  const tempEl = document.querySelector("#preview-temp");
  const detailEl = document.querySelector("#preview-detail");
  const wearEl = document.querySelector("#preview-wear");
  const umbrellaEl = document.querySelector("#preview-umbrella");
  const iconWrapper = document.querySelector("#preview-icon-wrapper");

  try {
    const response = await fetch(`api.php?city=${encodeURIComponent(city)}`);
    const data = await response.json();

    if (!response.ok) {
      detailEl.textContent = data.error || "Could not load weather.";
      return;
    }

    locationEl.textContent = `${data.city}, ${data.country}`;
    tempEl.textContent = `${data.temperature}°C`;

    const conditionLabel = formatConditionLabel(data.condition, data.description);
    detailEl.textContent = `${conditionLabel} · Feels like ${data.feelsLike}°C`;

    wearEl.textContent = window.getWearRecommendation
      ? getWearRecommendation(data.temperature, data.condition)
      : "Light layers";
    umbrellaEl.textContent = window.getUmbrellaRecommendation
      ? getUmbrellaRecommendation(data.condition)
      : "Check the forecast";

    const iconName = window.getWeatherIcon ? getWeatherIcon(data.condition) : "cloud";
    iconWrapper.innerHTML = `<i data-lucide="${iconName}"></i>`;
    if (window.lucide) lucide.createIcons();
  } catch (error) {
    console.error("Preview weather error:", error);
    detailEl.textContent = "Live preview available when the app server is running.";
  }
}
