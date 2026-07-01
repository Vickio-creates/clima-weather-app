document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();

  const toggle = document.querySelector("[data-toggle-password]");
  const passwordInput = document.querySelector("#signup-password");

  if (!toggle || !passwordInput) return;

  toggle.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    toggle.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    toggle.innerHTML = `<i data-lucide="${isHidden ? "eye" : "eye-off"}"></i>`;
    if (window.lucide) lucide.createIcons();
  });
});
