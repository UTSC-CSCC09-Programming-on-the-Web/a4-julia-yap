/**
 * Comment Service
 * Handles operations related to comments
 */
import httpClient from "./http-client.js";

const commentService = (function () {
  const module = {};

  // Cache for comment counts and pagination
  const commentCounts = {};
  const commentTotalPages = {};

  /**
   * Add a comment to an image
   * @param {string} imageId - Image ID
   * @param {string} userId - User ID
   * @param {string} content - Comment content
   * @returns {Promise} - Comment creation response
   */
  module.addComment = function (imageId, userId, content) {
    return httpClient
      .request(`/comments/${imageId}`, {
        method: "POST",
        body: JSON.stringify({ userId, content }),
      })
      .then((data) => {
        // Reset the comment cache for this image
        module.resetCommentCache(imageId);
        return { success: true };
      })
      .catch((error) => {
        if (error.message.includes("404")) {
          return {
            success: false,
            status: 404,
            message:
              "Cannot add comment to non-existent image. The image may have been deleted.",
          };
        }
        console.error("Network error adding comment:", error);
        return {
          success: false,
          message:
            error.message || "Network error. Please check your connection.",
        };
      });
  };

  /**
   * Delete a comment
   * @param {string} commentId - Comment ID
   * @returns {Promise} - Deletion response
   */
  module.deleteComment = function (commentId) {
    return httpClient
      .request(`/comments/${commentId}`, {
        method: "DELETE",
      })
      .then((data) => {
        // Reset all comment-related caches since we don't know which image this belonged to
        module.resetCommentCache();
        return { success: true };
      })
      .catch((error) => {
        if (error.message.includes("404")) {
          return {
            success: false,
            status: 404,
            message:
              "Cannot delete non-existent comment. It may have been already deleted.",
          };
        }
        console.error("Network error deleting comment:", error);
        return {
          success: false,
          message:
            error.message || "Network error. Please check your connection.",
        };
      });
  };

  /**
   * Get comments for a specific image with pagination
   * @param {string} imageId - Image ID
   * @param {number} page - Page number
   * @param {number} limit - Comments per page
   * @returns {Promise} - Comments response
   */
  module.getComments = function (imageId, page = 1, limit = 10) {
    return httpClient
      .request(`/comments/${imageId}?page=${page}&limit=${limit}`)
      .then((data) => {
        // Update comment count and pagination information based on response
        commentCounts[imageId] = data.pagination.total;
        commentTotalPages[imageId] = data.pagination.totalPages;

        // Map the server response to match the expected object structure
        const mappedComments = data.comments.map((comment) => ({
          commentId: comment.id.toString(),
          imageId: comment.imageId || imageId, // Use provided imageId if not in response
          author: comment.author,
          userId: comment.userId,
          content: comment.content,
          date: new Date(comment.createdAt),
        }));

        return {
          success: true,
          comments: mappedComments,
          pagination: data.pagination,
        };
      })
      .catch((error) => {
        if (error.message.includes("404")) {
          return {
            success: false,
            status: 404,
            message: "Image not found",
            comments: [],
          };
        }
        console.error("Network error getting comments:", error);
        return {
          success: false,
          message:
            error.message || "Network error. Please check your connection.",
          comments: [],
        };
      });
  };

  /**
   * Get comment count for a specific image
   * @param {string} imageId - Image ID
   * @returns {Promise} - Comment count response
   */
  module.getCommentCount = function (imageId) {
    if (commentCounts[imageId] !== undefined) {
      return Promise.resolve({ success: true, count: commentCounts[imageId] });
    }

    // If we don't have the count cached, fetch the first page to get count info
    return module
      .getComments(imageId, 1, 1)
      .then((result) => {
        if (!result.success) {
          return { success: false, message: result.message, count: 0 };
        }
        // The getComments function updates the commentCounts object
        return { success: true, count: commentCounts[imageId] || 0 };
      })
      .catch((error) => {
        console.error("Error getting comment count:", error);
        return {
          success: false,
          message: "Error getting comment count",
          count: 0,
        };
      });
  };

  /**
   * Get total pages for comments on a specific image
   * @param {string} imageId - Image ID
   * @returns {number} - Total pages
   */
  module.getCommentTotalPages = function (imageId) {
    return commentTotalPages[imageId] || 1;
  };

  /**
   * Reset the comment cache
   * @param {string} imageId - Optional image ID to reset cache for specific image
   */
  module.resetCommentCache = function (imageId) {
    if (imageId) {
      delete commentCounts[imageId];
      delete commentTotalPages[imageId];
    } else {
      Object.keys(commentCounts).forEach((key) => delete commentCounts[key]);
      Object.keys(commentTotalPages).forEach(
        (key) => delete commentTotalPages[key],
      );
    }
  };

  return module;
})();

// Export the module
export default commentService;
