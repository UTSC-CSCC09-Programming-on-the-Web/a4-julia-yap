// By default, home displays all existing galleries

import { useState, useEffect } from "../meact.js";
import { apiService } from "../services/api-service.js";
import GalleryCard from "../components/gallery-card.js";

export default class HomeView {
  constructor() {
    try {
      this._initializeStates();
      this._setupEffects();
      // Listen for gallery-updated event to refresh gallery cards
      window.addEventListener("gallery-updated", () => {
        this.loadGalleries(true);
      });
    } catch (error) {
      throw error;
    }
  }

  _initializeStates() {
    const [userKey, getCurrentUser, setCurrentUser] = useState(null);
    this.userState = { key: userKey, get: getCurrentUser, set: setCurrentUser };

    const [galleriesKey, getGalleries, setGalleries] = useState([]);
    this.galleriesState = {
      key: galleriesKey,
      get: getGalleries,
      set: setGalleries,
    };

    const [loadingKey, getIsLoading, setIsLoading] = useState(false);
    this.loadingState = {
      key: loadingKey,
      get: getIsLoading,
      set: setIsLoading,
    };

    const [nextCursorKey, getNextCursor, setNextCursor] = useState(null);
    this.nextCursorState = {
      key: nextCursorKey,
      get: getNextCursor,
      set: setNextCursor,
    };

    const [deletingGalleryKey, getDeletingGalleryId, setDeletingGalleryId] =
      useState(null);
    this.deletingGalleryState = {
      key: deletingGalleryKey,
      get: getDeletingGalleryId,
      set: setDeletingGalleryId,
    };
  }

  _setupEffects() {
    useEffect(() => {
      this.loadGalleries();
    }, [this.userState.key]);

    useEffect(() => {
      this.updateUI();
    }, [this.galleriesState.key]);

    useEffect(() => {
      this.updateUI();
    }, [this.loadingState.key]);
  }

  get isLoading() {
    return this.loadingState.get();
  }
  get currentUser() {
    return this.userState.get();
  }
  get galleries() {
    return this.galleriesState.get();
  }
  get nextCursor() {
    return this.nextCursorState.get();
  }
  get deletingGalleryId() {
    return this.deletingGalleryState.get();
  }

  loadGalleries(replace = false) {
    this.loadingState.set(true);

    const cursor = replace ? null : this.nextCursor;

    apiService
      .getGalleries()
      .then((res) => {
        if (replace) {
          this.galleriesState.set(res.galleries || []);
        } else {
          this.galleriesState.set([
            ...(this.galleries || []),
            ...(res.galleries || []),
          ]);
        }
        this.nextCursorState.set(res.nextCursor || null);
        this.loadingState.set(false);
      })
      .catch((error) => {
        console.error("Failed to load galleries:", error);
        if (replace) this.galleriesState.set([]);
        this.loadingState.set(false);
      });
  }

  init() {
    const isAuth = apiService.isAuthenticated();
    if (isAuth) {
      apiService.getCurrentUser().then((user) => {
        this.userState.set(user);
      });
    } else {
      this.userState.set(null);
    }
  }

  _renderGalleries() {
    const galleryContainer = this.element?.querySelector("#galleryContainer");
    if (!galleryContainer) return;
    const galleries = this.galleries;
    if (galleries.length === 0) {
      galleryContainer.innerHTML = `
        <p>No galleries found. Create one to get started!</p>
      `;
      return;
    }
    galleryContainer.innerHTML = "";
    galleries.forEach((gallery) => {
      const galleryCard = new GalleryCard(
        gallery,
        this._handleGalleryClick.bind(this),
        this._handleGalleryDelete.bind(this),
        this.currentUser,
      );
      // Disable click if this gallery is being deleted
      galleryContainer.appendChild(
        galleryCard.render(this.deletingGalleryId === gallery.id),
      );
    });
    // Add loader at the bottom if loading more
    if (this.isLoading && this.nextCursor) {
      const loader = document.createElement("div");
      loader.className = "loader";
      loader.textContent = "Loading more galleries...";
      galleryContainer.appendChild(loader);
    }
  }

  _addEventListeners() {
    // Infinite scroll
    this.element.addEventListener("scroll", () => {
      const container = this.element;
      if (!container) return;
      if (this.isLoading || !this.nextCursor) return;
      // If scrolled to within 200px of bottom, load more
      if (
        container.scrollHeight - container.scrollTop - container.clientHeight <
        200
      ) {
        this.loadGalleries(false);
      }
    });
  }

  updateUI() {
    const galleryViewer = this.element;
    if (!galleryViewer) return;

    const galleryContainer = galleryViewer.querySelector("#galleryContainer");
    if (!galleryContainer) return;

    const loaderOverlay = document.querySelector("#galleryLoader");
    if (this.isLoading) {
      loaderOverlay.classList.remove("hidden");
    } else {
      loaderOverlay.classList.add("hidden");
    }
    this._renderGalleries();
  }

  render() {
    const element = document.createElement("div");
    element.className = "gallery-view";
    element.style.overflowY = "auto";
    element.style.height = "100vh";
    element.innerHTML = `
      <div id="galleryContainer">
      </div>
    `;
    this.element = element;
    this._addEventListeners();
    return element;
  }

  destroy() {}

  _handleGalleryClick(galleryId) {
    if (window.router) {
      window.router.navigateTo(`/galleries/${galleryId}`);
    } else {
      window.location.href = `/galleries/${galleryId}`;
    }
  }

  _handleGalleryDelete(galleryId) {
    this.deletingGalleryState.set(galleryId);
    this.loadingState.set(true);
    return apiService
      .deleteGallery(galleryId)
      .then(() => {
        this.deletingGalleryState.set(null);
        this.loadGalleries(true);
        // No redirect here; just reload galleries
      })
      .catch((error) => {
        alert("Failed to delete gallery. Please try again.");
        this.deletingGalleryState.set(null);
        this.loadingState.set(false);
        return Promise.reject(error);
      });
  }
}
