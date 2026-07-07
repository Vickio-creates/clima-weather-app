const CLIMA_USER_KEY = "climaUser";
const CLIMA_SESSION_KEY = "climaSession"; // kept only as a small UI cache, not real authentication

const AUTH_ENDPOINTS = {
  register: "backend/auth/register.php",
  login: "backend/auth/login.php",
  logout: "backend/auth/logout.php",
  session: "backend/auth/session.php",
  profileUpdate: "backend/profile/update.php"
};

function getClimaUser() {
  try {
    return JSON.parse(localStorage.getItem(CLIMA_USER_KEY)) || null;
  } catch (error) {
    return null;
  }
}

function saveClimaUser(user) {
  if (!user) return;
  const safeUser = { ...user };
  delete safeUser.password;
  localStorage.setItem(CLIMA_USER_KEY, JSON.stringify(safeUser));
  if (safeUser.email) localStorage.setItem(CLIMA_SESSION_KEY, safeUser.email);
}

function clearClimaSession() {
  localStorage.removeItem(CLIMA_USER_KEY);
  localStorage.removeItem(CLIMA_SESSION_KEY);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }

  return data;
}

async function getCurrentUserFromServer() {
  const data = await requestJson(AUTH_ENDPOINTS.session, { method: "GET" });
  saveClimaUser(data.user);
  return data.user;
}

async function redirectIfLoggedIn() {
  try {
    const user = await getCurrentUserFromServer();
    if (user) window.location.href = "app.html";
  } catch (error) {
    // No active PHP session. Stay on login/signup page.
  }
}

async function requireClimaAuth() {
  try {
    return await getCurrentUserFromServer();
  } catch (error) {
    clearClimaSession();
    window.location.href = "login.html";
    return null;
  }
}

function updateUserInterface(user) {
  if (!user) return;
  document.querySelectorAll("[data-user-name]").forEach((el) => {
    el.textContent = user.name || "Clima User";
  });
  document.querySelectorAll("[data-user-email]").forEach((el) => {
    el.textContent = user.email || "";
  });
  document.querySelectorAll("[data-user-location]").forEach((el) => {
    el.textContent = user.location || "Klaipėda, Lithuania";
  });
  document.querySelectorAll("[data-user-activity]").forEach((el) => {
    el.textContent = user.activity || "Walking";
  });
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setButtonLoading(button, isLoading, loadingText) {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

function initRegisterForm() {
  const form = document.querySelector("#register-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.querySelector("#signup-name").value.trim();
    const email = document.querySelector("#signup-email").value.trim().toLowerCase();
    const password = document.querySelector("#signup-password").value;
    const confirm = document.querySelector("#signup-confirm").value;
    const terms = document.querySelector("#terms").checked;
    const message = document.querySelector("#auth-message");
    const submitButton = form.querySelector("button[type='submit']");

    if (name.length < 2) return showAuthMessage(message, "Please enter your full name.", true);
    if (!validateEmail(email)) return showAuthMessage(message, "Please enter a valid email address.", true);
    if (password.length < 6) return showAuthMessage(message, "Password should be at least 6 characters.", true);
    if (password !== confirm) return showAuthMessage(message, "Passwords do not match.", true);
    if (!terms) return showAuthMessage(message, "Please accept the terms to continue.", true);

    try {
      setButtonLoading(submitButton, true, "Creating account...");
      const data = await requestJson(AUTH_ENDPOINTS.register, {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      });
      saveClimaUser(data.user);
      showAuthMessage(message, "Account created. Opening your dashboard...", false);
      setTimeout(() => window.location.href = "app.html", 650);
    } catch (error) {
      showAuthMessage(message, error.message, true);
    } finally {
      setButtonLoading(submitButton, false);
    }
  });
}

function initLoginForm() {
  const form = document.querySelector("#login-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.querySelector("#login-email").value.trim().toLowerCase();
    const password = document.querySelector("#login-password").value;
    const message = document.querySelector("#auth-message");
    const submitButton = form.querySelector("button[type='submit']");

    if (!validateEmail(email)) return showAuthMessage(message, "Please enter a valid email address.", true);
    if (!password) return showAuthMessage(message, "Please enter your password.", true);

    try {
      setButtonLoading(submitButton, true, "Logging in...");
      const data = await requestJson(AUTH_ENDPOINTS.login, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      saveClimaUser(data.user);
      showAuthMessage(message, "Welcome back. Opening your dashboard...", false);
      setTimeout(() => window.location.href = "app.html", 650);
    } catch (error) {
      showAuthMessage(message, error.message, true);
    } finally {
      setButtonLoading(submitButton, false);
    }
  });
}

async function saveClimaProfile(user) {
  const data = await requestJson(AUTH_ENDPOINTS.profileUpdate, {
    method: "POST",
    body: JSON.stringify(user)
  });
  saveClimaUser(data.user);
  return data.user;
}

function showAuthMessage(message, text, isError) {
  if (!message) return;
  message.textContent = text;
  message.classList.toggle("is-error", Boolean(isError));
  message.classList.toggle("is-success", !isError);
}

function initPasswordToggles() {
  document.querySelectorAll("[data-toggle-password]").forEach((toggle) => {
    const input = toggle.closest(".field")?.querySelector("input");
    if (!input) return;

    toggle.addEventListener("click", () => {
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      toggle.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
      toggle.innerHTML = `<i data-lucide="${isHidden ? "eye" : "eye-off"}"></i>`;
      if (window.lucide) lucide.createIcons();
    });
  });
}

function initLogoutButtons() {
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      try {
        await requestJson(AUTH_ENDPOINTS.logout, { method: "POST", body: JSON.stringify({}) });
      } catch (error) {
        // Even if server logout fails, clear local UI cache.
      }
      clearClimaSession();
      window.location.href = "login.html";
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();
  initPasswordToggles();
  initRegisterForm();
  initLoginForm();
  initLogoutButtons();
});
