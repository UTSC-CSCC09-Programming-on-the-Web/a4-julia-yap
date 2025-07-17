import { apiService } from "../services/api-service.js";
import { formOverlay } from "./form-overlay.js";

export default class Header {
  /**
   * Create a new header component
   * @param {Object} options - Configuration options
   * @param {Function} options.onNavigate - Callback for navigation links
   */
  constructor(options = {}) {
    this.onNavigate =
      options.onNavigate ||
      ((path) => {
        if (window.router) {
          window.router.navigateTo(path);
        } else {
          window.location.href = path;
        }
      });

    this.element = null;
    this.isAuthenticated = false;
    this.currentUser = null;

    // Bind methods
    this.render = this.render.bind(this);
    this.updateUI = this.updateUI.bind(this);
    this._handleSignOut = this._handleSignOut.bind(this);
    this._handleNavClick = this._handleNavClick.bind(this);
    this._handleNewImage = this._handleNewImage.bind(this);
    this._handleNewGallery = this._handleNewGallery.bind(this);
  }

  init() {
    // Check authentication status
    this.isAuthenticated = apiService.isAuthenticated();

    if (this.isAuthenticated) {
      return apiService
        .getCurrentUser()
        .then((currentUser) => {
          this.currentUser = currentUser;
        })
        .catch((error) => {
          console.error("Failed to get current user:", error);
          this.currentUser = null;
          this.isAuthenticated = false;
        });
    } else {
      this.currentUser = null;
      return Promise.resolve();
    }
  }

  render() {
    return this.init().then(() => {
      const header = document.createElement("header");
      header.className = "app-header";

      header.innerHTML = `
        <div class="header-container">
          <div class="header-logo">
            <a href="/" class="logo-link">The Web Gallery</a>
          </div>
          
          <div class="header-auth">
            ${
              this.isAuthenticated
                ? `
              <span class="user-greeting">Hello, ${this.currentUser?.username || "User"}</span>
              <button class="btn btn-secondary sign-out-btn">Sign Out</button>
              <button class="btn btn-secondary new-image-btn">New Image</button>
              <button class="btn btn-secondary new-gallery-btn">New Gallery</button>
            `
                : `
              <button class="btn btn-primary sign-in-btn">Sign In</button>
            `
            }
          </div>
        </div>
      `;

      this._addEventListeners(header);
      this.element = header;

      return header;
    });
  }

  /**
   * UpdateUI the header UI based on current state
   */
  updateUI() {
    // Check authentication state
    this.isAuthenticated = apiService.isAuthenticated();

    const updateUIPromise = this.isAuthenticated
      ? apiService
          .getCurrentUser()
          .then((currentUser) => {
            this.currentUser = currentUser;
          })
          .catch((error) => {
            console.error("Failed to get current user:", error);
            this.currentUser = null;
            this.isAuthenticated = false;
          })
      : Promise.resolve();

    return updateUIPromise.then(() => {
      if (!this.element || !this.element.isConnected) return;

      const authContainer = this.element.querySelector(".header-auth");
      if (authContainer) {
        if (this.isAuthenticated) {
          authContainer.innerHTML = `
            <span class="user-greeting">Hello, ${this.currentUser?.username || "User"}</span>
            <button class="btn btn-secondary sign-out-btn">Sign Out</button>
            <button class="btn btn-secondary new-image-btn">New Image</button>
            <button class="btn btn-secondary new-gallery-btn">New Gallery</button>
          `;

          // Add event listeners for all buttons
          const signOutBtn = authContainer.querySelector(".sign-out-btn");
          if (signOutBtn) {
            signOutBtn.addEventListener("click", this._handleSignOut);
          }

          const newImageBtn = authContainer.querySelector(".new-image-btn");
          if (newImageBtn) {
            newImageBtn.addEventListener("click", this._handleNewImage);
          }

          const newGalleryBtn = authContainer.querySelector(".new-gallery-btn");
          if (newGalleryBtn) {
            newGalleryBtn.addEventListener("click", this._handleNewGallery);
          }
        } else {
          authContainer.innerHTML = `
            <button class="btn btn-primary sign-in-btn">Sign In</button>
          `;

          // Add event listeners to auth buttons
          const signInBtn = authContainer.querySelector(".sign-in-btn");
          if (signInBtn) {
            signInBtn.addEventListener("click", () =>
              this.onNavigate("/signin"),
            );
          }

          const signUpBtn = authContainer.querySelector(".sign-up-btn");
          if (signUpBtn) {
            signUpBtn.addEventListener("click", () =>
              this.onNavigate("/signup"),
            );
          }
        }
      }
    });
  }

  _addEventListeners(header) {
    // Add click listeners to all navigation links
    const navLinks = header.querySelectorAll(".nav-link, .logo-link");
    navLinks.forEach((link) => {
      link.addEventListener("click", this._handleNavClick);
    });

    // Add listeners to auth buttons
    if (this.isAuthenticated) {
      const signOutBtn = header.querySelector(".sign-out-btn");
      signOutBtn?.addEventListener("click", this._handleSignOut);

      const newImageBtn = header.querySelector(".new-image-btn");
      newImageBtn?.addEventListener("click", this._handleNewImage);

      const newGalleryBtn = header.querySelector(".new-gallery-btn");
      newGalleryBtn?.addEventListener("click", this._handleNewGallery);
    } else {
      const signInBtn = header.querySelector(".sign-in-btn");
      signInBtn?.addEventListener("click", () => this.onNavigate("/signin"));
    }
  }

  _handleNavClick(e) {
    e.preventDefault();
    const path = e.currentTarget.getAttribute("href");
    this.onNavigate(path);
  }

  _handleSignOut() {
    apiService
      .signOut()
      .then(() => {
        return this.updateUI();
      })
      .then(() => {
        this.onNavigate("/");
      })
      .catch((error) => {
        console.error("Sign out failed:", error);
        alert("Failed to sign out. Please try again.");
      });
  }

  /**
   * Handle new image button click
   * @private
   */
  _handleNewImage() {
    formOverlay.show("image").catch((error) => {
      console.error("Failed to show image form:", error);
      alert("Failed to open image upload form. Please try again.");
    });
  }

  /**
   * Handle new gallery button click
   * @private
   */
  _handleNewGallery() {
    formOverlay.show("gallery").catch((error) => {
      console.error("Failed to show gallery form:", error);
      alert("Failed to open gallery creation form. Please try again.");
    });
  }

  /**
   * Clean up event listeners
   */
  destroy() {
    if (!this.element) return;

    // Remove navigation link listeners
    const navLinks = this.element.querySelectorAll(".nav-link, .logo-link");
    navLinks.forEach((link) => {
      link.removeEventListener("click", this._handleNavClick);
    });

    // Remove auth button listeners
    const signOutBtn = this.element.querySelector(".sign-out-btn");
    if (signOutBtn) {
      signOutBtn.removeEventListener("click", this._handleSignOut);
    }

    const signInBtn = this.element.querySelector(".sign-in-btn");
    if (signInBtn) {
      signInBtn.removeEventListener("click", () => this.onNavigate("/signin"));
    }

    const signUpBtn = this.element.querySelector(".sign-up-btn");
    if (signUpBtn) {
      signUpBtn.removeEventListener("click", () => this.onNavigate("/signup"));
    }
  }
}
