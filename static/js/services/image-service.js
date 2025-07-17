/**
 * Image Service
 * Handles operations related to images
 */
import httpClient from "./http-client.js";

const imageService = (function () {
  const module = {};

  // Cache for image-related data
  let nextImageCursor = null;
  let cachedImageCount = null;

  /**
   * Add an image to a specific gallery
   * @param {string} galleryId - Gallery ID that this image belongs to
   * @param {string} title - Image title
   * @param {File} file - Image file
   * @returns {Promise} - Upload response
   */
  module.addImage = function (galleryId, title, file) {
    if (!galleryId) {
      return Promise.resolve({
        success: false,
        message: "Gallery ID is required",
      });
    }

    // Create a FormData object for file upload
    const formData = new FormData();

    // Add the file and metadata to FormData
    formData.append("file", file);
    formData.append("title", title);
    formData.append("galleryId", galleryId);

    // Send the request
    return httpClient
      .request(`/galleries/${galleryId}/images`, {
        method: "POST",
        body: formData,
      })
      .then((data) => {
        // Reset cache and pagination after adding a new image
        module.resetImageCount();
        module.resetImagePagination();

        return {
          success: true,
          image: data,
        };
      })
      .catch((error) => {
        console.error("Error adding image:", error);
        return {
          success: false,
          message: error.message || "Error adding image. Please try again.",
        };
      });
  };

  /**
   * Delete an image from a gallery
   * @param {string} galleryId - Gallery ID
   * @param {string} imageId - Image ID
   * @returns {Promise} - Deletion response
   */
  module.deleteImage = function (galleryId, imageId) {
    if (!galleryId || !imageId) {
      return Promise.resolve({
        success: false,
        message: "Gallery ID and Image ID are required",
      });
    }

    return httpClient
      .request(`/galleries/${galleryId}/images/${imageId}`, {
        method: "DELETE",
      })
      .then(() => {
        // Reset cache and pagination after deleting an image
        module.resetImageCount();
        module.resetImagePagination();
        return { success: true };
      })
      .catch((error) => {
        console.error("Error deleting image:", error);
        return {
          success: false,
          message: error.message || "Error deleting image. Please try again.",
        };
      });
  };

  /**
   * Get images from a gallery with cursor-based pagination
   * @param {string} galleryId - Gallery ID
   * @param {number} limit - Number of images per page
   * @returns {Promise} - Images response
   */
  module.getImages = function (galleryId, limit = 10) {
    if (!galleryId) {
      return Promise.resolve({
        success: false,
        message: "Gallery ID is required",
        images: [],
      });
    }

    let url = `/galleries/${galleryId}/images?limit=${limit}`;

    // If we have a cursor from a previous request, use it
    if (nextImageCursor) {
      url += `&cursor=${nextImageCursor}`;
    }

    return httpClient
      .request(url)
      .then((data) => {
        // Update the cursor for the next page of results
        nextImageCursor = data.nextCursor;

        // Map the server response to match the expected object structure
        const mappedImages = data.images.map((img) => ({
          imageId: img.id.toString(),
          title: img.title,
          author: img.author,
          imageUrl: img.imageUrl,
          date: new Date(img.createdAt),
        }));

        return {
          success: true,
          images: mappedImages,
          nextCursor: data.nextCursor,
        };
      })
      .catch((error) => {
        console.error("Network error getting images:", error);
        return {
          success: false,
          message:
            error.message || "Network error. Please check your connection.",
          images: [],
          nextCursor: null,
        };
      });
  };

  /**
   * Reset the pagination cursor
   */
  module.resetImagePagination = function () {
    nextImageCursor = null;
  };

  /**
   * Check if there are more images to load
   * @returns {boolean} - Whether more images exist
   */
  module.hasMoreImages = function () {
    return nextImageCursor !== null;
  };

  /**
   * Get a specific image by ID
   * @param {string} galleryId - Gallery ID
   * @param {string} imageId - Image ID
   * @returns {Promise} - Image data
   */
  module.getImageById = function (galleryId, imageId) {
    if (!galleryId || !imageId) {
      return Promise.resolve({
        success: false,
        message: "Gallery ID and Image ID are required",
        image: null,
      });
    }

    return httpClient
      .request(`/galleries/${galleryId}/images/${imageId}`)
      .then((img) => {
        // Map the server response to match the expected object structure
        return {
          success: true,
          image: {
            imageId: img.id.toString(),
            title: img.title,
            author: img.author,
            imageUrl: img.imageUrl,
            date: new Date(img.createdAt),
            galleryId: img.galleryId || galleryId,
          },
        };
      })
      .catch((error) => {
        if (error.message.includes("404")) {
          return {
            success: false,
            status: 404,
            message: "Image not found",
            image: null,
          };
        }
        console.error("Network error getting image:", error);
        return {
          success: false,
          message:
            error.message || "Network error. Please check your connection.",
          image: null,
        };
      });
  };

  /**
   * Get the total count of images in a gallery
   * @param {string} galleryId - Gallery ID
   * @returns {Promise} - Count response
   */
  module.getImageCount = function (galleryId) {
    if (!galleryId) {
      return Promise.resolve({
        success: false,
        message: "Gallery ID is required",
        count: 0,
      });
    }

    if (cachedImageCount !== null) {
      return Promise.resolve({ success: true, count: cachedImageCount });
    }

    // Request images with metadata to get the count
    return httpClient
      .request(`/galleries/${galleryId}/images?limit=100`)
      .then((data) => {
        cachedImageCount = data.images.length;
        return { success: true, count: cachedImageCount };
      })
      .catch((error) => {
        console.error("Network error getting image count:", error);
        return {
          success: false,
          message:
            error.message || "Network error. Please check your connection.",
          count: 0,
        };
      });
  };

  /**
   * Reset the cached count
   */
  module.resetImageCount = function () {
    cachedImageCount = null;
  };

  return module;
})();

// Export the module
export default imageService;
