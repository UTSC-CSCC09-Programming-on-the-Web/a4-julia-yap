/* copilot: Design app.js for SPA */

import Router from "./router.js";

import Header from "./components/header.js";
import HomeView from "./views/home-view.js";
import SigninView from "./views/signin-view.js";
import GalleryView from "./views/gallery-view.js";
import CreditView from "./views/credit-view.js";
import { apiService } from "./services/api-service.js";

document.addEventListener("DOMContentLoaded", () => {
  initHeader()
    .then(() => {
      const appContainer = document.querySelector("#app");
      if (!appContainer) return;

      const routes = [
        { path: "/", view: HomeView },
        { path: "/signin", view: SigninView },
        { path: "/galleries/:galleryId", view: GalleryView },
        { path: "/credits", view: CreditView },
      ];

      const router = new Router(routes, appContainer);

      // Make router globally available
      window.router = router;

      // Set up auth state change listener
      subscribeToAuthChanges();
    })
    .catch((error) => {
      console.error("Failed to initialize header:", error);
    });
});

/**
 * Initialize the fixed header component
 */
function initHeader() {
  const headerContainer = document.getElementById("header");
  if (!headerContainer) {
    console.error("Header not found");
    return Promise.reject(new Error("Header container not found"));
  }

  // Create and render the header
  const header = new Header({
    onNavigate: (path) => {
      if (window.router) {
        window.router.navigateTo(path);
      }
    },
  });

  return header.render().then((headerElement) => {
    headerContainer.appendChild(headerElement);

    // Store header instance globally for easy access
    window.appHeader = header;
  });
}

/**
 * Subscribe to authentication state changes
 */
function subscribeToAuthChanges() {
  // This is a simple implementation using a custom event
  // You could also use a more sophisticated event system or state management

  document.addEventListener("auth-state-changed", () => {
    // Update header when auth state changes
    if (window.appHeader) {
      window.appHeader.updateUI().catch((error) => {
        console.error("Failed to update header:", error);
      });
    } else {
      console.warn("No appHeader available for update");
    }
  });

  // Example of dispatching the event when auth state changes
  const originalSignIn = apiService.signIn;
  apiService.signIn = async function (...args) {
    const result = await originalSignIn.apply(this, args);

    if (result.success) {
      // Dispatch auth state change event
      document.dispatchEvent(new CustomEvent("auth-state-changed"));
    }

    return result;
  };

  const originalSignOut = apiService.signOut;
  apiService.signOut = async function (...args) {
    const result = await originalSignOut.apply(this, args);

    // Dispatch auth state change event
    document.dispatchEvent(new CustomEvent("auth-state-changed"));

    return result;
  };
}
