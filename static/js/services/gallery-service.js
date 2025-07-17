import httpClient from "./http-client.js";

const galleryService = (function () {
  const module = {};

  let nextGalleryCursor = null;

  module.createGallery = function (name) {
    return httpClient
      .request("/galleries", {
        method: "POST",
        body: JSON.stringify({ name }),
      })
      .then((data) => {
        return { success: true, gallery: data };
      })
      .catch((error) => {
        console.error("Error creating gallery:", error);
        return {
          success: false,
          message: error.message || "Error creating gallery. Please try again.",
        };
      });
  };

  module.getGalleries = function (limit = 10) {
    let url = `/galleries?limit=${limit}`;
    if (nextGalleryCursor) {
      url += `&cursor=${nextGalleryCursor}`;
    }
    return httpClient
      .request(url, {
        method: "GET",
      })
      .then((data) => {
        nextGalleryCursor = data.nextCursor;
        const galleries = data.galleries || [];
        return {
          success: true,
          galleries: galleries,
          nextCursor: data.nextCursor,
          total: data.total,
        };
      })
      .catch((error) => {
        console.error("Error fetching galleries:", error);
        return {
          success: false,
          message:
            error.message || "Error loading galleries. Please try again.",
          galleries: [],
          nextCursor: null,
          total: 0,
        };
      });
  };

  module.getGallery = function (galleryId) {
    return httpClient
      .request(`/galleries/${galleryId}`, {
        method: "GET",
      })
      .then((data) => {
        return { success: true, gallery: data };
      })
      .catch((error) => {
        console.error("Error fetching gallery:", error);
        return {
          success: false,
          message: error.message || "Error loading gallery. Please try again.",
        };
      });
  };

  //   module.updateGallery = function (galleryId, name, description) {
  //     return httpClient.request(`/galleries/${galleryId}`, {
  //       method: "PATCH",
  //       body: JSON.stringify({ name, description }),
  //     }).then((data) => {
  //       return { success: true, gallery: data };
  //     }).catch((error) => {
  //       console.error("Error updating gallery:", error);
  //       return {
  //         success: false,
  //         message: error.message || "Error updating gallery. Please try again.",
  //       };
  //     });
  //   };

  module.deleteGallery = function (galleryId) {
    return httpClient
      .request(`/galleries/${galleryId}`, {
        method: "DELETE",
      })
      .then(() => {
        return { success: true };
      })
      .catch((error) => {
        console.error("Error deleting gallery:", error);
        return {
          success: false,
          message: error.message || "Error deleting gallery. Please try again.",
        };
      });
  };

  /**
   * Navigate to a specific page of galleries
   * @param {number} page - The page number to navigate to
   * @param {number} limit - Number of items per page
   * @returns {Promise} - Galleries with pagination metadata
   */
  module.navigateToPage = function (page, limit = 10) {
    // Ensure page is at least 1
    const safePage = Math.max(1, page);
    return module.getGalleries(safePage, limit);
  };

  /**
   * Get user galleries with pagination
   * @param {number} page - The page number
   * @param {number} limit - Number of items per page
   * @returns {Promise} - User's galleries with pagination metadata
   */
  module.getUserGalleries = function (page = 1, limit = 10) {
    return httpClient
      .request(`/galleries/user?page=${page}&limit=${limit}`, {
        method: "GET",
      })
      .then((data) => {
        return {
          success: true,
          galleries: data.items || data.galleries || [],
          pagination: data.meta ||
            data.pagination || {
              currentPage: page,
              limit: limit,
              totalPages: 1,
              totalItems: data.items?.length || data.galleries?.length || 0,
              hasNextPage: false,
              hasPreviousPage: false,
            },
        };
      })
      .catch((error) => {
        console.error("Error fetching user galleries:", error);
        return {
          success: false,
          message:
            error.message || "Error loading your galleries. Please try again.",
          galleries: [],
          pagination: {
            currentPage: page,
            limit: limit,
            totalPages: 0,
            totalItems: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };
      });
  };

  return module;
})();

export default galleryService;
