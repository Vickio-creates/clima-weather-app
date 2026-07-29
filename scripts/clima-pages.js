// Run this code only after the HTML page has fully loaded.
document.addEventListener("DOMContentLoaded", async () => {
  // Check if the user is logged in.
  // requireClimaAuth comes from auth.js and redirects to login if there is no session.
  const user = typeof requireClimaAuth === "function" ? await requireClimaAuth() : null;

  // Stop the page logic if there is no logged-in user.
  if (!user) return;

  // Fill all user interface elements with the logged-in user's data.
  updateUserInterface(user);

  // Start the Edit Personal Info page logic.
  initProfileEdit(user);

  // Render Lucide icons after the page content is ready.
  if (window.lucide) lucide.createIcons();
});


// Handle the Edit Personal Info page.
function initProfileEdit(user) {
  // Find the edit personal info form.
  const form = document.querySelector("#profile-edit-form");

  // If the current page does not have this form, stop this function.
  // This allows the same script to be loaded on other authenticated pages safely.
  if (!form) return;

  // Find all personal information inputs.
  const nameInput = document.querySelector("#edit-name");
  const emailInput = document.querySelector("#edit-email");
  const locationInput = document.querySelector("#edit-location");
  const activityInput = document.querySelector("#edit-activity");

  // Find the profile photo input and photo trigger button.
  const photoInput = document.querySelector("#edit-photo");
  const photoButtons = document.querySelectorAll("[data-photo-trigger]");
  const photoAvatar = document.querySelector(".profile-avatar-editable");

  // Stop if the required personal information fields are missing.
  if (!nameInput || !emailInput || !locationInput || !activityInput) return;

  // Keep a local copy of the current user.
  // This is updated after a successful profile save.
  let currentUser = user;

  // Fill the form fields with the current user data.
  nameInput.value = currentUser.name || "";
  emailInput.value = currentUser.email || "";
  locationInput.value = currentUser.location || "Klaipėda, Lithuania";
  activityInput.value = currentUser.activity || "Walking";

  // Show or remove the loading state on the profile photo button.
  const setPhotoUploadState = (isUploading) => {
    // Add a loading class to the avatar area.
    photoAvatar?.classList.toggle("is-uploading", isUploading);

    // Disable photo buttons while the image is being processed.
    photoButtons.forEach((button) => {
      button.disabled = isUploading;
      button.setAttribute("aria-busy", String(isUploading));
    });
  };

  // Profile photo preview logic.
  // This opens the phone gallery or computer file picker and previews the image.
  // The selected photo is NOT saved to the database yet.
  if (photoInput) {
    // Open the file picker when the camera button is clicked.
    photoButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (!button.disabled) {
          photoInput.click();
        }
      });
    });

    // When the user chooses a photo, validate and preview it.
    photoInput.addEventListener("change", () => {
      const file = photoInput.files?.[0];

      // Stop if no file was selected.
      if (!file) return;

      // Allow only common web image formats.
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedTypes.includes(file.type)) {
        showPageToast("Please choose a JPG, PNG, or WebP image.");
        photoInput.value = "";
        return;
      }

      // Limit photo size to 2MB.
      if (file.size > 2 * 1024 * 1024) {
        showPageToast("Profile photos must be 2MB or smaller.");
        photoInput.value = "";
        return;
      }

      // Show a temporary loading state while preparing the preview.
      setPhotoUploadState(true);

      // Create a temporary browser URL for the selected image.
      const previewUrl = URL.createObjectURL(file);

      // Show the selected photo in all avatar image elements on the page.
      document.querySelectorAll("[data-user-avatar-image]").forEach((img) => {
        img.src = previewUrl;
        img.hidden = false;
      });

      // Hide fallback initials because the selected photo is now visible.
      document.querySelectorAll("[data-user-avatar-fallback]").forEach((fallback) => {
        fallback.hidden = true;
      });

      // Clear the file input so the same image can be selected again if needed.
      photoInput.value = "";

      // Remove the temporary loading state.
      setPhotoUploadState(false);

      // Inform the user that the photo is only previewed for now.
      showPageToast("Profile photo preview updated. Saving photo will be added later.");
    });
  }

  // Save the edited personal information.
  form.addEventListener("submit", async (event) => {
    // Prevent the browser from refreshing the page.
    event.preventDefault();

    // Collect the updated personal information from the form.
    const updated = {
      ...currentUser,
      name: nameInput.value.trim(),
      email: emailInput.value.trim().toLowerCase(),
      location: locationInput.value.trim() || "Klaipėda, Lithuania",
      activity: activityInput.value,
    };

    try {
      // Send the updated profile information to the backend.
      const savedUser =
        typeof saveClimaProfile === "function"
          ? await saveClimaProfile(updated)
          : updated;

      // Store the saved user data locally in this function.
      currentUser = savedUser;

      // Show a success message.
      showPageToast("Personal information updated successfully.");

      // Refresh all profile text on the page with the saved data.
      updateUserInterface(savedUser);
    } catch (error) {
      // Show an error message if saving fails.
      showPageToast(error.message || "Could not update personal information.");
    }
  });
}


// Show a small toast message.
// If the toast element does not exist, use a normal alert instead.
function showPageToast(text) {
  const toast = document.querySelector("#page-toast");

  if (!toast) {
    return alert(text);
  }

  toast.textContent = text;
  toast.classList.add("is-visible");

  setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}