/**
 * HTTP Client Module
 * Handles base request functionality and authentication
 */
const httpClient = (function () {
  const module = {};

  // Base API URL
  const API_URL = "/api";

  /**
   * Make an authenticated API request
   * @param {string} path - API endpoint path
   * @param {object} options - Fetch options
   * @param {boolean} retry - Whether to retry with token refresh if unauthorized
   * @returns {Promise} - Response promise
   */
  module.request = function (path, options = {}, retry = true) {
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    };
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    return fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers,
    }).then((res) => {
      if ((res.status === 401 || res.status === 403) && retry) {
        // If unauthorized, try to refresh the token
        return module
          .refreshAccessToken()
          .then(() => {
            // Retry the request after refreshing the token
            return module.request(path, options, false);
          })
          .catch((error) => {
            // module.signOut();
            throw new Error("Unauthorized access. Please sign in again.");
          });
      } else {
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status} ${res.statusText}`);
        }
        if (res.status === 204) {
          return true;
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || res.headers.get("content-length") === "0") {
          return true;
        }
        return res.json();
      }
    });
  };

  /**
   * Refresh the access token using the refresh token
   * @returns {Promise<boolean>} - Whether token refresh was successful
   */
  module.refreshAccessToken = function () {
    return fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) return false;
        return res.json();
      })
      .then((data) => {
        if (!data || !data.accessToken) return false;
        localStorage.setItem("accessToken", data.accessToken);
        return true;
      })
      .catch(() => false);
  };

  return module;
})();

// Export the module
export default httpClient;
