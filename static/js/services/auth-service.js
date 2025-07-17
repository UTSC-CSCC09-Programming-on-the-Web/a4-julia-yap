/**
 * Authentication Service
 * Handles user authentication operations
 */
import httpClient from "./http-client.js";

const authService = (function () {
  const module = {};

  /**
   * Register a new user
   * @param {string} username - User's username
   * @param {string} password - User's password
   * @returns {Promise} - Registration response
   */
  module.signUp = function (username, password) {
    return httpClient
      .request("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      })
      .then((data) => {
        localStorage.setItem("accessToken", data.accessToken);
        return data;
      });
  };

  /**
   * Sign in an existing user
   * @param {string} username - User's username
   * @param {string} password - User's password
   * @returns {Promise} - Sign in response
   */
  module.signIn = function (username, password) {
    return httpClient
      .request("/auth/signin", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      })
      .then((data) => {
        localStorage.setItem("accessToken", data.accessToken);
        return data;
      });
  };

  /**
   * Sign out the current user
   * @returns {Promise} - Sign out response
   */
  module.signOut = function () {
    localStorage.removeItem("accessToken");
    return httpClient.request("/auth/signout", {
      method: "GET",
    });
  };

  /**
   * Get the current authenticated user
   * @returns {Promise} - Current user data
   */
  module.getCurrentUser = function () {
    return httpClient.request("/auth/me", {
      method: "GET",
    });
  };

  /**
   * Check if a user is currently authenticated
   * @returns {boolean} - Whether user is authenticated
   */
  module.isAuthenticated = function () {
    return localStorage.getItem("accessToken") !== null;
  };

  return module;
})();

// Export the module
export default authService;
