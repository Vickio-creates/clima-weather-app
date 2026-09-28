// Key used to store the logged-in user data in the browser localStorage.
// This is only a small UI cache. Real authentication is handled by the PHP session.
const CLIMA_USER_KEY = "climaUser";

// Key used to store the user's email as a simple session cache.
// This is not real authentication. The PHP session is the real login source.
const CLIMA_SESSION_KEY = "climaSession";

// Backend endpoint paths used by the authentication system.
const AUTH_ENDPOINTS = {
  register: "backend/auth/register.php",
  login: "backend/auth/login.php",
  verifyTwoFactor: "backend/auth/verify_two_factor.php",
  logout: "backend/auth/logout.php",
  session: "backend/auth/session.php",
  profileUpdate: "backend/profile/update.php",
};


// Get the cached user from localStorage.
function getClimaUser() {
  try {
    // Read the saved user string and convert it back to a JavaScript object.
    return JSON.parse(localStorage.getItem(CLIMA_USER_KEY)) || null;
  } catch (error) {
    // If the stored data is broken or invalid JSON, return no user.
    return null;
  }
}


// Save safe user data in localStorage.
// This helps the interface update quickly, but the PHP session remains the real login check.
function saveClimaUser(user) {
  // Stop if there is no user data.
  if (!user) return;

  // Copy the user object so we do not modify the original one directly.
  const safeUser = { ...user };

  // Never store a password in localStorage.
  delete safeUser.password;

  // Save the safe user data as JSON text.
  localStorage.setItem(CLIMA_USER_KEY, JSON.stringify(safeUser));

  // Save the user's email as a small UI session cache.
  if (safeUser.email) {
    localStorage.setItem(CLIMA_SESSION_KEY, safeUser.email);
  }
}


// Clear all locally cached Clima session data.
function clearClimaSession() {
  localStorage.removeItem(CLIMA_USER_KEY);
  localStorage.removeItem(CLIMA_SESSION_KEY);
}


// Send a request to a backend PHP endpoint and return JSON.
// This function is reused for login, signup, logout, session check, and profile update.
async function requestJson(url, options = {}) {
  // Send the request to the backend.
  const response = await fetch(url, {
    // Include PHP session cookies with the request.
    credentials: "include",

    // Send and receive JSON by default.
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },

    // Add method, body, or other options passed to this function.
    ...options,
  });

  // Try to read the JSON response.
  // If the response is empty or invalid, use an empty object instead.
  const data = await response.json().catch(() => ({}));

  // If the backend returns an error status, throw the error message.
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }

  // Return the successful JSON response.
  return data;
}


// Ask the backend if there is currently a logged-in PHP session.
async function getCurrentUserFromServer() {
  // Call the session endpoint.
  const data = await requestJson(AUTH_ENDPOINTS.session, { method: "GET" });

  // Save the returned user in localStorage as a UI cache.
  saveClimaUser(data.user);

  // Return the user object.
  return data.user;
}


// If the user is already logged in and opens login/signup,
// redirect them to the main app page.
async function redirectIfLoggedIn() {
  try {
    // Check whether a valid PHP session exists.
    const user = await getCurrentUserFromServer();

    // If a user is found, send them to the dashboard.
    if (user) window.location.href = "app.html";
  } catch (error) {
    // No active PHP session.
    // This is normal on login/signup pages, so the user stays there.
  }
}


// Protect pages that require login.
async function requireClimaAuth() {
  try {
    // Ask the backend for the current logged-in user.
    return await getCurrentUserFromServer();
  } catch (error) {
    // If there is no valid PHP session, clear local cache.
    clearClimaSession();

    // Redirect the user back to login.
    window.location.href = "login.html";

    // Return null so other page logic can stop.
    return null;
  }
}


// Update all visible user information on authenticated pages.
// This function updates profile name, email, location, activity, timezone, bio, tags, and avatar.
function updateUserInterface(user) {
  // Stop if no user data is available.
  if (!user) return;

  // Prepare safe display values with fallback defaults.
  const displayName = user.name || "Clima User";
  const displayEmail = user.email || "";
  const displayLocation = user.location || "Klaipėda, Lithuania";
  const displayActivity = user.activity || "Walking";
  const displayTimezone = resolveUserTimeZone(user);
  const displayBio = user.bio || "No short bio added yet.";

  // Update all elements that display the user's name.
  document.querySelectorAll("[data-user-name]").forEach((el) => {
    el.textContent = displayName;
  });

  // Update all elements that display the user's email.
  document.querySelectorAll("[data-user-email]").forEach((el) => {
    el.textContent = displayEmail;
  });

  // Update all elements that display the user's default location.
  document.querySelectorAll("[data-user-location]").forEach((el) => {
    el.textContent = displayLocation;
  });

  // Update all elements that display the user's main activity.
  document.querySelectorAll("[data-user-activity]").forEach((el) => {
    el.textContent = displayActivity;
  });

  // Update all elements that display the user's timezone.
  document.querySelectorAll("[data-user-timezone]").forEach((el) => {
    el.textContent = displayTimezone;
  });

  // Update the short bio on the profile page.
  document.querySelectorAll("[data-user-bio]").forEach((el) => {
    el.textContent = displayBio;
  });

  // Update About You tags on the profile page.
  // Only the tags selected in Edit Personal Info will appear here.
  document.querySelectorAll("[data-user-personal-tags]").forEach((container) => {
    // Make sure personalTags is an array before using it.
    const tags = Array.isArray(user.personalTags) ? user.personalTags : [];

    // If the user has not selected any tags, show a default message.
    if (tags.length === 0) {
      container.innerHTML =
        '<span class="profile-pill">No personal tags selected yet.</span>';
      return;
    }

    // Create one pill for each selected tag.
    container.innerHTML = tags
      .map((tag) => `<span class="profile-pill">${tag}</span>`)
      .join("");
  });

  // Update the profile avatar photo or fallback initial.
  updateUserAvatar(user, displayName);
}


// Update the user's avatar.
// If a photo URL exists, show the image. Otherwise, show the first letter of the user's name.
function updateUserAvatar(user, displayName) {
  // Try different possible avatar/photo property names.
  const avatarUrl =
    user.avatarUrl || user.photoUrl || user.photo || user.image || "";

  // Use the first letter of the user's name as fallback.
  const initial = (displayName.trim().charAt(0) || "C").toUpperCase();

  // Update all fallback initials.
  document.querySelectorAll("[data-user-avatar-initial]").forEach((el) => {
    el.textContent = initial;
  });

  // Update all avatar image elements.
  document.querySelectorAll("[data-user-avatar-image]").forEach((img) => {
    // Find the fallback initial element inside the same avatar container.
    const fallback = img.parentElement?.querySelector("[data-user-avatar-fallback]");

    // If an avatar URL exists, show the image.
    if (avatarUrl) {
      img.src = avatarUrl;
      img.alt = `${displayName} profile photo`;
      img.hidden = false;

      // Hide fallback initial when image is shown.
      if (fallback) fallback.hidden = true;

      // If the image fails to load, hide image and show fallback initial again.
      img.onerror = () => {
        img.hidden = true;
        img.removeAttribute("src");

        if (fallback) fallback.hidden = false;
      };

      return;
    }

    // If there is no avatar URL, hide the image and show fallback initial.
    img.hidden = true;
    img.removeAttribute("src");

    if (fallback) fallback.hidden = false;
  });
}


// Resolve the user's timezone.
// If the backend provides a timezone, use it. Otherwise, detect it from the browser.
function resolveUserTimeZone(user) {
  // Use saved timezone if it exists.
  if (user.timezone) return user.timezone;

  // Detect browser timezone, with Europe/Vilnius as fallback.
  const zone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Vilnius";

  try {
    // Get a short timezone label such as GMT+3 or EEST.
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "short",
    }).formatToParts(new Date());

    // Find the timezone short name from the formatted parts.
    const shortName = parts.find((part) => part.type === "timeZoneName")?.value;

    // Return a readable timezone string.
    return shortName ? `${zone} (${shortName})` : zone;
  } catch (error) {
    // If timezone formatting fails, return the timezone name only.
    return zone;
  }
}


// Check whether an email address has a valid basic format.
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


// NIST's password-only minimum is 15 characters, without character-mix rules.
function validatePasswordLength(password) {
  return Array.from(password).length >= 15;
}


// Show or remove a loading state on a submit button.
function setButtonLoading(button, isLoading, loadingText) {
  // Stop if the button does not exist.
  if (!button) return;

  if (isLoading) {
    // Save the original button text before changing it.
    button.dataset.originalText = button.textContent;

    // Show loading text and disable the button.
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    // Restore original button text and enable the button again.
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}


// Initialize the registration form.
function initRegisterForm() {
  // Find the registration form.
  const form = document.querySelector("#register-form");

  // Stop if this page does not have a registration form.
  if (!form) return;

  // Handle form submission.
  form.addEventListener("submit", async (event) => {
    // Prevent the browser from refreshing the page.
    event.preventDefault();

    // Read form input values.
    const name = document.querySelector("#signup-name").value.trim();

    const email = document
      .querySelector("#signup-email")
      .value.trim()
      .toLowerCase();

    const password = document.querySelector("#signup-password").value;
    const confirm = document.querySelector("#signup-confirm").value;
    const terms = document.querySelector("#terms").checked;

    // Get message area and submit button.
    const message = document.querySelector("#auth-message");
    const submitButton = form.querySelector("button[type='submit']");

    // Validate name.
    if (name.length < 2) {
      return showAuthMessage(message, "Please enter your full name.", true);
    }

    // Validate email.
    if (!validateEmail(email)) {
      return showAuthMessage(
        message,
        "Please enter a valid email address.",
        true,
      );
    }

    // Validate the NIST-aligned minimum password length.
    if (!validatePasswordLength(password)) {
      return showAuthMessage(
        message,
        "Password must be at least 15 characters.",
        true,
      );
    }

    // Check password confirmation.
    if (password !== confirm) {
      return showAuthMessage(message, "Passwords do not match.", true);
    }

    // Check that the user accepted the terms.
    if (!terms) {
      return showAuthMessage(
        message,
        "Please accept the terms to continue.",
        true,
      );
    }

    try {
      // Show loading state on the button.
      setButtonLoading(submitButton, true, "Creating account...");

      // Send registration data to the backend.
      const data = await requestJson(AUTH_ENDPOINTS.register, {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });

      // Save returned user data in localStorage as UI cache.
      saveClimaUser(data.user);

      // Show success message.
      showAuthMessage(
        message,
        "Account created. Opening your dashboard...",
        false,
      );

      // Redirect to the app dashboard after a short delay.
      setTimeout(() => {
        window.location.href = "app.html";
      }, 650);
    } catch (error) {
      // Show backend or network error.
      showAuthMessage(message, error.message, true);
    } finally {
      // Always remove loading state.
      setButtonLoading(submitButton, false);
    }
  });
}


// Initialize the login form.
function initLoginForm() {
  // Find the login form.
  const form = document.querySelector("#login-form");

  // Stop if this page does not have a login form.
  if (!form) return;

  const credentialsFields = document.querySelector("#login-credentials-fields");
  const twoFactorFields = document.querySelector("#login-two-factor-fields");
  const twoFactorCode = document.querySelector("#login-two-factor-code");
  const useRecoveryCode = document.querySelector("#login-use-recovery-code");
  const backToPasswordButton = document.querySelector("#login-back-to-password");
  let awaitingTwoFactor = false;

  useRecoveryCode?.addEventListener("change", () => {
    if (!twoFactorCode) return;
    twoFactorCode.maxLength = useRecoveryCode.checked ? 39 : 6;
    twoFactorCode.inputMode = useRecoveryCode.checked ? "text" : "numeric";
    document.querySelector("#login-two-factor-hint").textContent = useRecoveryCode.checked
      ? "Enter one unused recovery code."
      : "Enter the six-digit code from your authenticator app.";
  });

  backToPasswordButton?.addEventListener("click", () => {
    awaitingTwoFactor = false;
    twoFactorFields.hidden = true;
    credentialsFields.hidden = false;
    twoFactorCode.value = "";
    useRecoveryCode.checked = false;
    twoFactorCode.maxLength = 6;
    twoFactorCode.inputMode = "numeric";
    const submitButton = form.querySelector("button[type='submit']");
    submitButton.textContent = "Log in";
    submitButton.dataset.originalText = "Log in";
    document.querySelector("#auth-message").textContent = "";
  });

  // Handle form submission.
  form.addEventListener("submit", async (event) => {
    // Prevent page refresh.
    event.preventDefault();

    // Get message area and submit button.
    const message = document.querySelector("#auth-message");
    const submitButton = form.querySelector("button[type='submit']");

    const finishLogin = (data) => {
      saveClimaUser(data.user);
      showAuthMessage(message, "Welcome back. Opening your dashboard...", false);
      setTimeout(() => {
        window.location.href = "app.html";
      }, 650);
    };

    if (awaitingTwoFactor) {
      const code = twoFactorCode.value.trim();
      const recovery = useRecoveryCode.checked;

      if (!code || (!recovery && !/^\d{6}$/.test(code))) {
        return showAuthMessage(
          message,
          recovery ? "Enter one of your recovery codes." : "Enter the six-digit authenticator code.",
          true,
        );
      }

      try {
        setButtonLoading(submitButton, true, "Verifying code...");
        const data = await requestJson(AUTH_ENDPOINTS.verifyTwoFactor, {
          method: "POST",
          body: JSON.stringify({ code, method: recovery ? "recovery" : "totp" }),
        });
        finishLogin(data);
      } catch (error) {
        showAuthMessage(message, error.message, true);
      } finally {
        setButtonLoading(submitButton, false);
      }
      return;
    }

    // Read login input values.
    const email = document.querySelector("#login-email").value.trim().toLowerCase();
    const password = document.querySelector("#login-password").value;

    // Validate email format.
    if (!validateEmail(email)) {
      return showAuthMessage(
        message,
        "Please enter a valid email address.",
        true,
      );
    }

    // Make sure password is not empty.
    if (!password) {
      return showAuthMessage(message, "Please enter your password.", true);
    }

    try {
      // Show loading state.
      setButtonLoading(submitButton, true, "Logging in...");

      // Send login data to the backend.
      const data = await requestJson(AUTH_ENDPOINTS.login, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (data.requiresTwoFactor) {
        awaitingTwoFactor = true;
        credentialsFields.hidden = true;
        twoFactorFields.hidden = false;
        document.querySelector("#login-password").value = "";
        submitButton.dataset.originalText = "Verify code";
        twoFactorCode.focus();
        showAuthMessage(message, data.message, false);
        return;
      }

      finishLogin(data);
    } catch (error) {
      // Show login error.
      showAuthMessage(message, error.message, true);
    } finally {
      // Restore button state.
      setButtonLoading(submitButton, false);
    }
  });
}


// Save updated profile information.
// This is used by the Edit Personal Info page.
async function saveClimaProfile(user) {
  // Send updated user data to backend/profile/update.php.
  const data = await requestJson(AUTH_ENDPOINTS.profileUpdate, {
    method: "POST",
    body: JSON.stringify(user),
  });

  // Save the updated user returned by the backend.
  saveClimaUser(data.user);

  // Return updated user to the page script.
  return data.user;
}


// Show an authentication message on login or signup pages.
function showAuthMessage(message, text, isError) {
  // Stop if the message element does not exist.
  if (!message) return;

  // Set the message text.
  message.textContent = text;

  // Add error or success class for styling.
  message.classList.toggle("is-error", Boolean(isError));
  message.classList.toggle("is-success", !isError);
}


// Initialize password visibility toggle buttons.
function initPasswordToggles() {
  // Find all buttons that show/hide passwords.
  document.querySelectorAll("[data-toggle-password]").forEach((toggle) => {
    // Password fields appear in both the login form and the profile Security tab.
    const input = toggle.closest(".field, .security-password-input")?.querySelector("input");

    // Stop if no input exists.
    if (!input) return;

    // Toggle password visibility when the button is clicked.
    toggle.addEventListener("click", () => {
      const isHidden = input.type === "password";

      // Switch between password and text input type.
      input.type = isHidden ? "text" : "password";

      // Update accessibility label.
      toggle.setAttribute(
        "aria-label",
        `${isHidden ? "Hide" : "Show"} ${input.dataset.passwordLabel || "password"}`,
      );
      toggle.setAttribute("aria-pressed", String(isHidden));

      // Update the icon.
      toggle.innerHTML = `<i data-lucide="${isHidden ? "eye" : "eye-off"}"></i>`;

      // Re-render Lucide icons.
      if (window.lucide) lucide.createIcons();
    });
  });
}


// Initialize logout buttons.
function initLogoutButtons() {
  // Find all logout buttons.
  document.querySelectorAll("[data-logout]").forEach((button) => {
    // Add logout click event.
    button.addEventListener("click", async (event) => {
      // Prevent default button or link behavior.
      event.preventDefault();

      try {
        // Ask backend to destroy the PHP session.
        await requestJson(AUTH_ENDPOINTS.logout, {
          method: "POST",
          body: JSON.stringify({}),
        });
      } catch (error) {
        // Even if server logout fails, the local UI cache will still be cleared.
      }

      // Clear local cache.
      clearClimaSession();

      // Redirect user to login page.
      window.location.href = "login.html";
    });
  });
}


// Run this code after the page has fully loaded.
document.addEventListener("DOMContentLoaded", () => {
  // Render Lucide icons if the library is available.
  if (window.lucide) lucide.createIcons();

  // Initialize password show/hide buttons.
  initPasswordToggles();

  // Initialize register form if the current page has one.
  initRegisterForm();

  // Initialize login form if the current page has one.
  initLoginForm();

  // Initialize logout buttons if the current page has them.
  initLogoutButtons();

  // Check if the current page is login or signup.
  const isAuthPage = document.querySelector("#login-form, #register-form");

  // Check if the current page requires authentication.
  const isProtectedPage = document.body.dataset.requireAuth === "true";

  // If the user is already logged in and opens login/signup,
  // redirect them to the app dashboard.
  if (isAuthPage) {
    redirectIfLoggedIn();
  }

  // If the page is protected, require a valid PHP session.
  if (isProtectedPage) {
    requireClimaAuth().then((user) => {
      // If the user is logged in, update the page interface.
      if (user) updateUserInterface(user);
    });
  }
});
