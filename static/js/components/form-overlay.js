/**
 * Form Overlay Manager
 * Handles showing/hiding overlay forms and managing their state
 */
import { apiService } from "../services/api-service.js";
import { useState, useEffect } from "../meact.js";

export default class FormOverlay {
  constructor() {
    const [userKey, getUser, setUser] = useState(null);
    this.userState = { key: userKey, get: getUser, set: setUser };

    apiService.getCurrentUser().then((user) => {
      this.userState.set(user);
    });

    this.setupEventListeners();
  }

  /**
   * Show a specific form overlay
   * @param {string} formType - Type of form to show ('image' or 'gallery')
   */
  show(formType) {
    const overlay = document.querySelector(`.${formType}-form-overlay`);
    if (!overlay) {
      console.error(`Form overlay not found: ${formType}`);
      return Promise.reject(new Error(`Form overlay not found: ${formType}`));
    }

    // For image form, populate galleries dropdown
    if (formType === "image") {
      return this.populateGalleryDropdown()
        .then(() => {
          this._showOverlay(overlay);
        })
        .catch((error) => {
          console.error("Failed to populate gallery dropdown:", error);
          // Show form anyway, but with error message
          this._showOverlay(overlay);
          this._showGalleryLoadError();
        });
    } else {
      this._showOverlay(overlay);
      return Promise.resolve();
    }
  }

  /**
   * Hide a specific form overlay
   * @param {string} formType - Type of form to hide ('image' or 'gallery')
   */
  hide(formType) {
    const overlay = document.querySelector(`.${formType}-form-overlay`);
    if (!overlay) return;

    const form = overlay.querySelector(".submit-form");
    if (form) form.classList.remove("slide-in");
    overlay.classList.remove("active");

    setTimeout(() => {
      overlay.classList.add("hidden");
      // Reset form
      const formElement = overlay.querySelector("form");
      if (formElement) formElement.reset();
      // Clear any error messages
      this._clearErrors(overlay);
    }, 300);
  }

  populateGalleryDropdown() {
    const select = document.querySelector('.img-form select[name="galleryId"]');
    if (!select) {
      return Promise.reject(new Error("Gallery dropdown not found"));
    }

    // Show loading state
    select.innerHTML = '<option value="">Loading galleries...</option>';
    select.disabled = true;

    // Get user's galleries
    return apiService
      .getGalleries()
      .then((response) => {
        if (response.success) {
          const galleries = response.galleries || [];
          // Clear and populate dropdown
          select.innerHTML = '<option value="">Select a gallery...</option>';

          if (galleries.length === 0) {
            select.innerHTML =
              '<option value="">No galleries found - create one first</option>';
          } else {
            const currentUser = this.userState.get();
            galleries.forEach((gallery) => {
              if (currentUser && currentUser.userId === gallery.userId) {
                const option = document.createElement("option");
                option.value = gallery.id;
                option.textContent = gallery.name;
                select.appendChild(option);
              }
            });
          }

          select.disabled = false;
          console.log(select);
        } else {
          throw new Error(response.message || "Failed to load galleries");
        }
      })
      .catch((error) => {
        console.error("Error loading galleries:", error);
        select.innerHTML = '<option value="">Error loading galleries</option>';
        select.disabled = false;
        throw error;
      });
  }

  /**
   * Show the overlay with animation
   * @private
   */
  _showOverlay(overlay) {
    overlay.classList.remove("hidden");
    setTimeout(() => {
      const form = overlay.querySelector(".submit-form");
      if (form) form.classList.add("slide-in");
      overlay.classList.add("active");
    }, 10);
  }

  /**
   * Show error message for gallery loading failure
   * @private
   */
  _showGalleryLoadError() {
    const select = document.querySelector('.img-form select[name="galleryId"]');
    if (select) {
      const errorMsg = document.createElement("div");
      errorMsg.className = "form-error";
      errorMsg.textContent =
        "Failed to load galleries. Please refresh and try again.";
      select.parentNode.insertBefore(errorMsg, select.nextSibling);
    }
  }

  /**
   * Clear error messages from form
   * @private
   */
  _clearErrors(overlay) {
    const errors = overlay.querySelectorAll(".form-error");
    errors.forEach((error) => error.remove());
  }

  /**
   * Set up global event listeners for form overlays
   */
  setupEventListeners() {
    // Close form when clicking overlay background
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("form-overlay")) {
        const formType = e.target.classList.contains("image-form-overlay")
          ? "image"
          : "gallery";
        this.hide(formType);
      }
    });

    // Close form when clicking close button
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("close-form")) {
        const formType = e.target.dataset.form;
        if (formType) {
          this.hide(formType);
        }
      }
    });

    // Handle form submissions
    this.setupFormSubmissions();
  }

  /**
   * Set up form submission handlers
   */
  setupFormSubmissions() {
    // Image form submission
    const imageForm = document.querySelector(".img-form");
    if (imageForm) {
      imageForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleImageSubmission(e.target);
      });
    }

    // Gallery form submission
    const galleryForm = document.querySelector(".gallery-form");
    if (galleryForm) {
      galleryForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleGallerySubmission(e.target);
      });
    }
  }

  /**
   * Handle image form submission
   */
  handleImageSubmission(form) {
    const formData = new FormData(form);
    const galleryId = formData.get("galleryId");
    const title = formData.get("title");
    const file = formData.get("file");

    if (!galleryId) {
      alert("Please select a gallery");
      return;
    }

    // Disable submit button
    const submitBtn = form.querySelector('input[type="submit"]');
    const originalValue = submitBtn.value;
    submitBtn.value = "Uploading...";
    submitBtn.disabled = true;

    apiService
      .addImage(galleryId, title, file)
      .then((result) => {
        if (result.success) {
          console.log("Image uploaded successfully");
          this.hide("image");

          // Refresh current view if it's a gallery view
          if (window.location.pathname.includes("/galleries/")) {
            window.location.reload();
          }
        } else {
          alert(`Failed to upload image: ${result.message || "Unknown error"}`);
        }
      })
      .catch((error) => {
        console.error("Error uploading image:", error);
        alert("An error occurred while uploading the image. Please try again.");
      })
      .finally(() => {
        // Re-enable submit button
        submitBtn.value = originalValue;
        submitBtn.disabled = false;
      });
  }

  /**
   * Handle gallery form submission
   */
  handleGallerySubmission(form) {
    const formData = new FormData(form);
    const name = formData.get("galleryName");
    const description = formData.get("galleryDescription") || "";

    // Disable submit button
    const submitBtn = form.querySelector('input[type="submit"]');
    const originalValue = submitBtn.value;
    submitBtn.value = "Creating...";
    submitBtn.disabled = true;

    apiService
      .createGallery(name, description)
      .then((result) => {
        if (result.success) {
          console.log("Gallery created successfully");
          this.hide("gallery");

          // Navigate to home page to see the new gallery
          if (window.router) {
            window.router.navigateTo("/");
          }
        } else {
          alert(
            `Failed to create gallery: ${result.message || "Unknown error"}`,
          );
        }
      })
      .catch((error) => {
        console.error("Error creating gallery:", error);
        alert(
          "An error occurred while creating the gallery. Please try again.",
        );
      })
      .finally(() => {
        // Re-enable submit button
        submitBtn.value = originalValue;
        submitBtn.disabled = false;
      });
  }
}

// Create and export a singleton instance
const formOverlay = new FormOverlay();
export { formOverlay };
