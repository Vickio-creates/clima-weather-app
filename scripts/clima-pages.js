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
  if (!form) return;

  // Find personal information inputs.
  const nameInput = document.querySelector("#edit-name");
  const emailInput = document.querySelector("#edit-email");
  const locationInput = document.querySelector("#edit-location");
  const activityInput = document.querySelector("#edit-activity");

  // Find the new About You fields.
  const bioInput = document.querySelector("#edit-bio");
  const personalTagInputs = document.querySelectorAll('input[name="personal-tags"]');

  // Find the profile photo input and photo trigger button.
  const photoInput = document.querySelector("#edit-photo");
  const photoButtons = document.querySelectorAll("[data-photo-trigger]");
  const photoAvatar = document.querySelector(".profile-avatar-editable");

  // Stop if the required personal information fields are missing.
  if (!nameInput || !emailInput || !locationInput || !activityInput) return;

  // Keep a local copy of the current user.
  let currentUser = user;

  // Fill the form fields with the current user data.
  nameInput.value = currentUser.name || "";
  emailInput.value = currentUser.email || "";
  locationInput.value = currentUser.location || "Klaipėda, Lithuania";
  activityInput.value = currentUser.activity || "Walking";

  // Fill the short bio field.
  if (bioInput) {
    bioInput.value = currentUser.bio || "";
  }

  // Select the saved About You tags.
  setSelectedPersonalTags(currentUser.personalTags || []);

  // Show or remove the loading state on the profile photo button.
  const setPhotoUploadState = (isUploading) => {
    photoAvatar?.classList.toggle("is-uploading", isUploading);

    photoButtons.forEach((button) => {
      button.disabled = isUploading;
      button.setAttribute("aria-busy", String(isUploading));
    });
  };

  // Profile photo preview logic.
  // The selected photo is previewed only. It is not saved to the database yet.
  if (photoInput) {
    photoButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (!button.disabled) {
          photoInput.click();
        }
      });
    });

    photoInput.addEventListener("change", () => {
      const file = photoInput.files?.[0];

      if (!file) return;

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedTypes.includes(file.type)) {
        showPageToast("Please choose a JPG, PNG, or WebP image.");
        photoInput.value = "";
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        showPageToast("Profile photos must be 2MB or smaller.");
        photoInput.value = "";
        return;
      }

      setPhotoUploadState(true);

      const previewUrl = URL.createObjectURL(file);

      document.querySelectorAll("[data-user-avatar-image]").forEach((img) => {
        img.src = previewUrl;
        img.hidden = false;
      });

      document.querySelectorAll("[data-user-avatar-fallback]").forEach((fallback) => {
        fallback.hidden = true;
      });

      photoInput.value = "";
      setPhotoUploadState(false);

      showPageToast("Profile photo preview updated. Saving photo will be added later.");
    });
  }

  // Save the edited personal information.
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Collect the updated personal information.
    const updated = {
      ...currentUser,
      name: nameInput.value.trim(),
      email: emailInput.value.trim().toLowerCase(),
      location: locationInput.value.trim() || "Klaipėda, Lithuania",
      activity: activityInput.value,
      bio: bioInput ? bioInput.value.trim() : "",
      personalTags: getSelectedPersonalTags(),
    };

    try {
      // Save the updated profile information to the backend.
      const savedUser =
        typeof saveClimaProfile === "function"
          ? await saveClimaProfile(updated)
          : updated;

      // Store the saved user data locally.
      currentUser = savedUser;

      // Refresh all user interface data on the page.
      updateUserInterface(savedUser);

      // Keep the saved tags selected after saving.
      setSelectedPersonalTags(savedUser.personalTags || []);

      // Show success message.
      showPageToast("Personal information updated successfully.");
    } catch (error) {
      showPageToast(error.message || "Could not update personal information.");
    }
  });


  // Get selected About You tags from the checkboxes.
  function getSelectedPersonalTags() {
    return Array.from(personalTagInputs)
      .filter((input) => input.checked)
      .map((input) => input.value);
  }


  // Mark saved About You tags as selected.
  function setSelectedPersonalTags(savedTags) {
    personalTagInputs.forEach((input) => {
      input.checked = savedTags.includes(input.value);
    });
  }
}


// Show a small toast message.
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