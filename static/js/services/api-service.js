/**
 * API Services Index
 * Exports all API service modules for easy importing
 */
import httpClient from "./http-client.js";
import authService from "./auth-service.js";
import galleryService from "./gallery-service.js";
import imageService from "./image-service.js";
import commentService from "./comment-service.js";

// Export individual services
export {
  httpClient,
  authService,
  galleryService,
  imageService,
  commentService,
};

// Export a combined API service
const apiService = {
  // Core HTTP functionality
  request: httpClient.request,
  refreshAccessToken: httpClient.refreshAccessToken,

  // Auth operations
  signUp: authService.signUp,
  signIn: authService.signIn,
  signOut: authService.signOut,
  getCurrentUser: authService.getCurrentUser,
  isAuthenticated: authService.isAuthenticated,

  // Gallery operations
  createGallery: galleryService.createGallery,
  getGalleries: galleryService.getGalleries,
  getGallery: galleryService.getGallery,
  deleteGallery: galleryService.deleteGallery,

  // Image operations
  addImage: imageService.addImage,
  deleteImage: imageService.deleteImage,
  getImages: imageService.getImages,
  resetImagePagination: imageService.resetImagePagination,
  hasMoreImages: imageService.hasMoreImages,
  getImageById: imageService.getImageById,
  getImageCount: imageService.getImageCount,
  resetImageCount: imageService.resetImageCount,

  // Comment operations
  addComment: commentService.addComment,
  deleteComment: commentService.deleteComment,
  getComments: commentService.getComments,
  getCommentCount: commentService.getCommentCount,
  getCommentTotalPages: commentService.getCommentTotalPages,
  resetCommentCache: commentService.resetCommentCache,
};

// Export the combined API service as default
export { apiService };
export default apiService;
