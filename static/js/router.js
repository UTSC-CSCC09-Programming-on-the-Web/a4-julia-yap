/*Copilot: Design a router for SPA*/

/**
 * Simple SPA Router
 * Handles client-side routing for a single page application
 */
export class Router {
  /**
   * Initialize the router
   * @param {Array} routes - Array of route objects with path and view
   * @param {HTMLElement} rootElement - DOM element where views will be rendered
   */
  constructor(routes, rootElement) {
    this.routes = routes;
    this.rootElement = rootElement;
    this.currentView = null;

    // Set up event listeners for navigation
    this._setupEventListeners();

    // Handle initial route
    this._loadInitialRoute();
  }

  /**
   * Set up event listeners for navigation
   */
  _setupEventListeners() {
    // Handle browser back/forward buttons
    window.addEventListener("popstate", () => this._handleRouteChange());

    // Intercept link clicks to use pushState
    document.addEventListener("click", (e) => {
      // Only handle clicks on links
      const link = e.target.closest("a");
      if (!link) return;

      // Only handle internal links (same origin)
      const href = link.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("//")) return;

      // Prevent default link behavior
      e.preventDefault();
      this.navigateTo(href);
    });
  }

  /**
   * Get the current URL path
   * @returns {string} Current URL path
   */
  _getCurrentUrl() {
    return window.location.pathname;
  }

  /**
   * Match URL to a route definition
   * @param {string} url - URL path to match
   * @returns {Object|null} Matching route object or null
   */
  _matchUrlToRoute(url) {
    // Try direct path match first
    let matchedRoute = this.routes.find((route) => route.path === url);

    // If no direct match, try pattern matching (for routes with parameters)
    if (!matchedRoute) {
      // Convert route patterns to RegExp and check for matches
      matchedRoute = this.routes.find((route) => {
        // Skip if it's not a pattern route
        if (!route.path.includes(":")) return false;

        // Convert route pattern to regex
        const pattern = route.path.replace(/:\w+/g, "([^/]+)");
        const regex = new RegExp(`^${pattern}$`);

        // Check if URL matches pattern
        const match = url.match(regex);
        if (match) {
          // Extract parameters
          const params = {};
          const paramNames = route.path.match(/:\w+/g) || [];
          paramNames.forEach((param, index) => {
            params[param.substring(1)] = match[index + 1];
          });

          // Store params in route object
          route.params = params;
          return true;
        }
        return false;
      });
    }

    if (!matchedRoute) {
      const errorRoute = this.routes.find(
        (route) => route.view.name === "ErrorView",
      );
      if (errorRoute) return errorRoute;
    }
    return matchedRoute;
  }

  /**
   * Load the initial route based on current URL
   */
  _loadInitialRoute() {
    const url = this._getCurrentUrl();
    this._handleRouteChange(url);
  }

  _handleRouteChange(url = this._getCurrentUrl()) {
    const matchedRoute = this._matchUrlToRoute(url);

    if (!matchedRoute) {
      const notFoundRoute = this.routes.find(
        (route) => route.path === "/404" || route.path === "*",
      );

      if (notFoundRoute) {
        this._renderView(notFoundRoute);
      } else {
        this.rootElement.innerHTML = "<h1>Page Not Found</h1>";
      }
      return;
    }

    // Render the matched route's view
    this._renderView(matchedRoute);
  }

  _renderView(route) {
    console.log("🎬 Router: Starting to render view", route);
    console.log("🎬 Router: Route view constructor:", route.view);
    console.log("🎬 Router: Route view name:", route.view?.name);

    // Clean up previous view if it exists
    if (this.currentView && typeof this.currentView.destroy === "function") {
      this.currentView.destroy();
    }

    // Initialize the new view
    try {
      this.currentView =
        typeof route.view === "function"
          ? new route.view(route.params)
          : route.view;
    } catch (error) {
      console.error("❌ Router: Error creating view instance:", error);
      this.rootElement.innerHTML = "<h1>Error loading page</h1>";
      return;
    }

    this.rootElement.innerHTML = "";
    // Render the view
    if (typeof this.currentView.render === "function") {
      try {
        const viewElement = this.currentView.render();

        if (viewElement instanceof HTMLElement) {
          this.rootElement.appendChild(viewElement);
        } else {
          this.rootElement.innerHTML = viewElement;
        }

        if (typeof this.currentView.init === "function") {
          try {
            this.currentView.init();
          } catch (initError) {}
        }
      } catch (renderError) {
        this.rootElement.innerHTML = "<h1>Error rendering page</h1>";
      }
    } else {
      this.rootElement.innerHTML = this.currentView;
    }
  }

  navigateTo(path) {
    window.history.pushState({}, "", path);
    this._handleRouteChange(path);
  }
}

export default Router;
