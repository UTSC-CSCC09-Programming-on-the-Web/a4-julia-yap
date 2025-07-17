import { apiService } from "../services/api-service.js";
import { useState, useEffect } from "../meact.js";

const LIMIT = 10;

export default class GalleryView {
  constructor(params) {
    this.galleryId = params?.galleryId;
    this.element = null;

    const [userKey, getCurrentUser, setCurrentUser] = useState(null);
    this.userState = { key: userKey, get: getCurrentUser, set: setCurrentUser };

    apiService.getCurrentUser().then((user) => {
      this.userState.set(user);
    });

    const [imageState, getImageState, setImageState] = useState({
      currentImage: null,
      currentIndex: 0,
      currentPage: 1,
      totalPages: 1,
      images: [],
      cursor: null,
    });

    // Initialize comment state
    const [commentState, getCommentState, setCommentState] = useState({
      comments: [],
      currentPage: 1,
      totalPages: 1,
    });

    // Store state functions as instance properties
    this.getImageState = getImageState;
    this.setImageState = setImageState;
    this.getCommentState = getCommentState;
    this.setCommentState = setCommentState;

    // Set up effects
    useEffect(() => {
      this.renderGallery();
    }, [imageState]);

    useEffect(() => {
      this.updateCommentPagination();
    }, [commentState]);

    useEffect(() => {
      this.renderGallery();
    }, [this.userState.key]);
  }

  get currentUser() {
    return this.userState.get();
  }

  // Helpers to access and update state properties
  getCurrentImage() {
    return this.getImageState().currentImage;
  }

  getCurrentImageIndex() {
    return this.getImageState().currentIndex;
  }

  getCurrentImagePage() {
    return this.getImageState().currentPage;
  }

  getImageTotalPages() {
    return this.getImageState().totalPages;
  }

  getImages() {
    return this.getImageState().images;
  }

  setImages(images) {
    return this.setImageState({
      ...this.getImageState(),
      images: images,
    });
  }

  getCursor() {
    return this.getImageState().cursor;
  }

  setCurrentImageIndex(index) {
    this.setImageState({
      ...this.getImageState(),
      currentIndex: index,
    });
  }

  setCurrentImagePage(page) {
    this.setImageState({
      ...this.getImageState(),
      currentPage: page,
    });
  }

  getCurrentCommentPage() {
    return this.getCommentState().currentPage;
  }

  getTotalPages() {
    return this.getCommentState().totalPages;
  }

  updateImageView() {
    // Use proper pagination - limit images loaded at once
    const page = this.getCurrentImagePage();
    const cursor = this.getCursor();

    // Show image loading indicator
    const imgContainer = this.element?.querySelector(".img-container");
    if (imgContainer) {
      let imgLoader = imgContainer.querySelector(".loader.img-loader");
      if (!imgLoader) {
        imgLoader = document.createElement("div");
        imgLoader.className = "loader img-loader";
        imgLoader.innerHTML = '<div class="loader-wheel"></div>';
        imgContainer.appendChild(imgLoader);
      } else {
        imgLoader.classList.remove("hidden");
      }

      // Hide image content
      const imgContent = imgContainer.querySelector(".content-container");
      if (imgContent) {
        imgContent.classList.remove("visible");
      }
    }

    // Get images for this gallery with cursor-based pagination
    return apiService
      .getImages(this.galleryId, LIMIT)
      .then((response) => {
        if (!response.success) {
          alert(`Error loading images: ${response.message}`);
          return Promise.reject(new Error(response.message));
        }

        const images = response.images || [];
        const totalImages = images.length || 0;
        const nextCursor = response.nextCursor;
        const totalPages = Math.ceil(totalImages / LIMIT);

        // Calculate the absolute index based on page and current relative index
        const currentRelativeIndex = this.getCurrentImageIndex();

        // If current index is out of bounds of the loaded images, adjust it
        let adjustedIndex = currentRelativeIndex;
        if (currentRelativeIndex >= images.length && images.length > 0) {
          adjustedIndex = 0;
        }

        // Update current image based on the loaded images
        const imageAtIndex = images[adjustedIndex];

        // Update all image-related state at once
        this.setImageState({
          ...this.getImageState(),
          totalPages: totalPages,
          images: images,
          currentImage: imageAtIndex,
          currentIndex: adjustedIndex,
          cursor: nextCursor,
        });

        return Promise.resolve();
      })
      .catch((error) => {
        console.log("Error updating image view:", error);

        // Hide loading indicators in case of error
        const imgContainer = this.element?.querySelector(".img-container");
        if (imgContainer) {
          const imgLoader = imgContainer.querySelector(".loader.img-loader");
          if (imgLoader) {
            imgLoader.classList.add("hidden");
          }
        }

        return Promise.reject(error);
      });
  }

  hideImageForm() {
    // Reset the form and animate the overlay out
    this.element.querySelector(".img-form")?.reset();

    // Slide out and deactivate overlay
    const submitForm = this.element.querySelector(".submit-img");
    const overlay = this.element.querySelector(".form-overlay");

    if (submitForm && overlay) {
      // Remove classes to trigger animations
      submitForm.classList.remove("slide-in");
      overlay.classList.remove("active");

      // Reinstate the elements after sliding out the form
      setTimeout(() => {
        overlay.classList.add("hidden");
        const addBtn = this.element.querySelector(".add-img");
        if (addBtn) {
          addBtn.classList.remove("hidden");
        }
      }, 300);
    }
  }

  // Set up listeners for static elements in the DOM
  attachEventListeners() {
    if (!this.element) return;

    // Event listener for "New Image" button: Slide in the image form
    this.element.querySelectorAll(".add-img").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        // Elements to slide in
        const overlay = this.element.querySelector(".form-overlay");
        if (overlay) {
          overlay.classList.remove("hidden");
          const submitForm = this.element.querySelector(".submit-img");

          // Add sliding animation for the image form
          setTimeout(() => {
            if (submitForm) submitForm.classList.add("slide-in");
            overlay.classList.add("active");
          }, 10);
        }
      });
    });

    // Event listener for the image form submission
    const imgForm = this.element.querySelector(".img-form");
    if (imgForm) {
      imgForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const title = e.target.querySelector('[name="imgTitle"]').value;
        const file = e.target.querySelector('[name="imgFile"]').files[0];

        // Store the initial state - whether gallery was empty before adding
        const emptyGallery = this.getImages().length === 0;

        // Add the new image and wait for the result
        apiService
          .addImage(this.galleryId, title, file)
          .then((result) => {
            if (result.success) {
              // Show success notification
              console.log(
                `"${title}" has been successfully added to the gallery.`,
              );

              // Always reset to the first page when adding a new image
              this.setImageState({
                ...this.getImageState(),
                currentPage: 1,
                currentIndex: 0,
                cursor: null, // Reset cursor to get fresh data from the beginning
              });

              // Notify parent to refresh gallery card
              window.dispatchEvent(
                new CustomEvent("gallery-updated", {
                  detail: { galleryId: this.galleryId },
                }),
              );

              return this.updateImageView();
            } else {
              console.log(
                `Failed to add image: ${result.message || "Unknown error"}`,
              );
            }
          })
          .catch((error) => {
            console.log("Error adding image:", error);
            console.log(
              "An error occurred while adding the image. Please check your network connection and try again.",
            );
          })
          .finally(() => {
            this.hideImageForm();
          });
      });
    }

    // Event listener for overlay click to close form
    const overlay = this.element.querySelector(".form-overlay");
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          this.hideImageForm();
        }
      });
    }

    // Event listener for close button on the image form
    const closeBtn = this.element.querySelector(".close-form");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.hideImageForm();
      });
    }
  }

  // Set up listeners for image navigation controls
  attachControllerListeners() {
    if (!this.element) return;

    // previous page button
    const prevPageBtn = this.element.querySelector(".prev-page");
    if (prevPageBtn) {
      prevPageBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // Skip if the button is disabled
        if (e.target.classList.contains("disabled")) return;

        const currentPage = this.getCurrentImagePage();
        if (currentPage > 1) {
          // Go to previous page - for cursor-based pagination, we need to reset and fetch from start
          this.setImageState({
            ...this.getImageState(),
            currentPage: currentPage - 1,
            currentIndex: 0,
            cursor: null, // Reset cursor to start from the beginning
          });
          this.updateImageView();
        }
      });
    }

    // next page button
    const nextPageBtn = this.element.querySelector(".next-page");
    if (nextPageBtn) {
      nextPageBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // Skip if the button is disabled
        if (e.target.classList.contains("disabled")) return;

        const currentPage = this.getCurrentImagePage();
        const totalPages = this.getImageTotalPages();

        if (currentPage < totalPages) {
          // Go to next page - use the current cursor
          this.setImageState({
            ...this.getImageState(),
            currentPage: currentPage + 1,
            currentIndex: 0,
            // The cursor is already updated in state from the previous view
          });
          this.updateImageView();
        }
      });
    }

    // previous image button - With page navigation if at first image
    const prevImageBtn = this.element.querySelector(".prev-image");
    if (prevImageBtn) {
      prevImageBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // Skip if the button is disabled
        if (e.target.classList.contains("disabled")) return;

        const currImgIdx = this.getCurrentImageIndex();
        const currentPage = this.getCurrentImagePage();
        const images = this.getImages();

        if (currImgIdx > 0) {
          // If not at the first image of the page, just go to previous image
          const newIndex = currImgIdx - 1;
          // Update only the currentIndex and currentImage directly, without making new API call
          this.setImageState({
            ...this.getImageState(),
            currentIndex: newIndex,
            currentImage: images[newIndex],
          });
        } else if (currentPage > 1) {
          // If at the first image of the page but not on first page, go to previous page
          this.setCurrentImagePage(currentPage - 1);
          this.setCurrentImageIndex(9);
          this.updateImageView();
        }
      });
    }

    // next image button - With page navigation if at last image
    const nextImageBtn = this.element.querySelector(".next-image");
    if (nextImageBtn) {
      nextImageBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // Skip if the button is disabled
        if (e.target.classList.contains("disabled")) return;

        const images = this.getImages();
        const currImgIdx = this.getCurrentImageIndex();
        const currentPage = this.getCurrentImagePage();
        const totalPages = this.getImageTotalPages();

        if (currImgIdx < images.length - 1) {
          // If not at the last image of the page, just go to next image
          const newIndex = currImgIdx + 1;
          // Update only the currentIndex and currentImage directly, without making new API call
          this.setImageState({
            ...this.getImageState(),
            currentIndex: newIndex,
            currentImage: images[newIndex],
          });
        } else if (currentPage < totalPages) {
          // If at the last image of the page and not on the last page,
          // go to the first image of the next page
          this.setCurrentImagePage(currentPage + 1);
          this.setCurrentImageIndex(0); // Set to first image of next page
          this.updateImageView();
        }
      });
    }

    // delete image button
    const deleteBtn = this.element.querySelector(".delete-image");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const currImg = this.getCurrentImage();
        if (!currImg) return;

        // Show confirmation alert with the image title
        const confirmDelete = confirm(
          `This action will delete "${currImg.title}"`,
        );

        if (confirmDelete) {
          // Delete the image and check if successful
          apiService
            .deleteImage(currImg.imageId)
            .then((result) => {
              if (result.success) {
                let newIdx = this.getCurrentImageIndex() - 1;
                if (newIdx < 0) newIdx = 0; // Ensure index doesn't go below 0
                this.setImageState({
                  ...this.getImageState(),
                  currentIndex: newIdx,
                  cursor: null, // Reset cursor to fetch fresh data
                });
                return this.updateImageView();
              } else {
                // Check for constraint error (image has comments)
                if (
                  result.status === 409 &&
                  result.message.includes("associated comments")
                ) {
                  console.warn(
                    "Cannot delete this image because it has comments. Please delete all comments first.",
                  );
                } else {
                  console.log(
                    `Failed to delete image: ${result.message || "Unknown error"}`,
                  );
                }
              }
            })
            .catch((error) => {
              console.log("Error deleting image:", error);
              console.log(
                "An error occurred while deleting the image. Please check your network connection and try again.",
              );
            });
        }
      });
    }
  }

  renderImageControllers(currImgIdx) {
    const navigation = this.element?.querySelector(".img-nav"); // the controls (count/prev/next/delete)
    if (!navigation) return Promise.resolve();

    const images = this.getImages();
    const totalImageCount = images.length;
    const currentPage = this.getCurrentImagePage();
    const totalPages = this.getTotalPages();

    if (totalImageCount === 0) {
      navigation.innerHTML = ""; // Clear the navigation controls
      return;
    }

    // Determine if prev/next navigation is possible
    const hasPrevImage = currImgIdx > 0;
    const hasNextImage = currImgIdx < images.length - 1;
    const hasPrevPage = currentPage > 1;
    const hasNextPage = currentPage < totalPages;

    // Calculate absolute position for display (across all pages)
    const absolutePosition = (currentPage - 1) * LIMIT + currImgIdx + 1;

    // Get prev/next image titles for tooltips
    let prevImageTitle = "";
    let nextImageTitle = "";

    if (currImgIdx > 0 && images[currImgIdx - 1]) {
      prevImageTitle = images[currImgIdx - 1].title;
    }

    if (currImgIdx < images.length - 1 && images[currImgIdx + 1]) {
      nextImageTitle = images[currImgIdx + 1].title;
    }

    // For prev-image button: enable if either there's a previous image OR a previous page
    const canGoPrev = hasPrevImage || hasPrevPage;

    // For next-image button: enable if either there's a next image OR a next page
    const canGoNext = hasNextImage || hasNextPage;

    const currentUser = this.userState.get();
    const canAction = currentUser && this.gallery.isOwner;

    // Add page navigation controls
    navigation.innerHTML = `
      <span class="col-2 img-nav-meta">&lt Image ${absolutePosition} of ${totalImageCount} &gt</span>
      <button class="col-1 btn nav prev-page ${!hasPrevPage ? "disabled" : ""}" 
              title="Previous page">&laquo;</button>
      <button class="col-1 btn nav prev-image ${!canGoPrev ? "disabled" : ""}" 
              title="${prevImageTitle ? prevImageTitle : "Previous image"}">&lsaquo;</button>
      <span class="col-5 img-nav-meta"><b>${this.gallery.name}</b> (Page ${currentPage} of ${totalPages})</span>
      <button class="col-1 btn nav next-image ${!canGoNext ? "disabled" : ""}" 
              title="${nextImageTitle ? nextImageTitle : "Next image"}">&rsaquo;</button>
      <button class="col-1 btn nav next-page ${!hasNextPage ? "disabled" : ""}" 
              title="Next page">&raquo;</button>
      ${canAction ? `<button class="col-1 btn nav delete-image" title="Delete this image"></button>` : ""}
    `;

    this.attachControllerListeners();
  }

  renderImageViewer(image) {
    const container = this.element?.querySelector(".img-viewer");
    if (!container) return;

    container.innerHTML = ""; // Clear the container of any previous content

    // Case 1. Empty gallery
    if (!image) {
      container.innerHTML = `
            <div class="col-3 col-sm-0"></div>
            <div class="col-9 col-sm-12 no-img">
            <span class="no-img-text">Empty gallery.</span>
            </div>
        `;
      return;
    }

    // Case 2. There are images. Display the image, metadata, and comments.
    // Img metadata area
    const imgMeta = document.createElement("div");
    imgMeta.className = "col-3 col-sm-12 meta-area";
    imgMeta.innerHTML = `
        <div class="img-meta-wrapper" data-image-id="${image.imageId}">
            <div class="row img-meta-content">
            <span class="col-sm-7 head-title">${image.title}</span>
            <div class="col-sm-5 head-author-date">
                <span class="head-author">By ${image.author}.</span>
                <span class="head-date">On ${new Date(image.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}.</span>
            </div>
            </div>
        </div>
    `;
    container.append(imgMeta);

    // imgContainer displays the head image with loading state
    const imgContainer = document.createElement("div");
    imgContainer.className = "col-6 col-sm-12 img-container";
    imgContainer.style.position = "relative"; // For absolute positioning of loader

    // Add loader that will be shown until the image loads
    const imgLoader = document.createElement("div");
    imgLoader.className = "loader img-loader";
    imgLoader.innerHTML = '<div class="loader-wheel"></div>';
    imgContainer.appendChild(imgLoader);

    // Add image in a content container for fade-in transition
    const imgContent = document.createElement("div");
    imgContent.className = "content-container";
    imgContent.innerHTML = `
            <img src="${image.imageUrl}" alt="${image.title} by ${image.author}" class="head-img">
    `;
    imgContainer.appendChild(imgContent);

    // Once the image is loaded, hide the loader and show the image
    const img = imgContent.querySelector("img");
    img.onload = () => {
      imgLoader.classList.add("hidden");
      setTimeout(() => imgContent.classList.add("visible"), 100);
    };

    // If the image fails to load, still hide the loader
    img.onerror = () => {
      imgLoader.classList.add("hidden");
      imgContent.innerHTML = `<p class="img-error">Failed to load image</p>`;
      setTimeout(() => imgContent.classList.add("visible"), 100);
    };

    container.append(imgContainer);

    // Comment section
    const commentWrapper = document.createElement("div");
    commentWrapper.className = "col-3 col-sm-12 comment-wrapper";
    container.append(commentWrapper);

    // Comment display area with initial loader
    const imgComments = document.createElement("div");
    imgComments.className = "img-comments";

    // Add a loader for comments
    const commentLoader = document.createElement("div");
    commentLoader.className = "loader comment-loader";
    commentLoader.innerHTML = '<div class="loader-wheel small"></div>';
    imgComments.appendChild(commentLoader);

    commentWrapper.append(imgComments);

    const currentUser = this.userState.get();

    // Create comment form container
    if (currentUser) {
      const commentPagination = document.createElement("div");
      commentPagination.className = "comment-pagination";
      commentPagination.innerHTML = `
              <button class="btn prev-comment-pg">&larr;</button>
              <span class="comment-page-info">${this.getCurrentCommentPage()}/${this.getTotalPages()}</span>
              <button class="btn next-comment-pg">&rarr;</button>
          `;
      commentWrapper.appendChild(commentPagination);

      const commentForm = document.createElement("div");
      commentForm.className = "post-comment";
      commentForm.innerHTML = `
              <form class="form-generic comment-form">
                  <textarea class="comment-textarea" placeholder="Post your comment" name="comment" required></textarea>
                  <input type="submit" class="btn submit-comment" value="Post"/>
              </form>`;
      commentWrapper.append(commentForm);

      this.attachCommentListeners(image.imageId);
    }
  }

  renderGallery() {
    const currImgIdx = this.getCurrentImageIndex();
    const currImg = this.getCurrentImage();

    this.renderImageControllers(currImgIdx);
    this.renderImageViewer(currImg);
    if (this.gallery && currImg) {
      return this.loadComments(currImg.imageId);
    }
  }

  renderComments(comments) {
    const imgComments = this.element?.querySelector(".img-comments");
    if (!imgComments) return;

    // Find the existing loader or create one if it doesn't exist
    let commentLoader = imgComments.querySelector(".loader.comment-loader");
    if (!commentLoader) {
      // Clear previous comments first
      imgComments.innerHTML = "";

      // Create loader
      commentLoader = document.createElement("div");
      commentLoader.className = "loader comment-loader";
      commentLoader.innerHTML = '<div class="loader-wheel small"></div>';
      imgComments.appendChild(commentLoader);

      // Create a content container for the comments
      const commentsContent = document.createElement("div");
      commentsContent.className = "content-container comments-content";
      imgComments.appendChild(commentsContent);
    }

    // Get the content container
    const commentsContent =
      imgComments.querySelector(".comments-content") ||
      document.createElement("div");
    if (!commentsContent.classList.contains("content-container")) {
      commentsContent.className = "content-container comments-content";
      imgComments.appendChild(commentsContent);
    }

    // Prepare the comments HTML
    let commentsHTML = "";

    const currentUser = this.userState.get();

    if (comments.length === 0) {
      commentsHTML = `<p>Be the first to comment.</p>`;
    } else {
      // Container for each comment
      commentsHTML = comments
        .map(
          (comment) => `
              <div class="comment" data-comment-id="${comment.commentId}">
                  <div class="comment-header">
                      <span class="comment-author">${comment.author}</span>
                      <span class="comment-date">${new Date(comment.date).toLocaleString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
                      ${
                        currentUser &&
                        (this.gallery.isOwner ||
                          comment.userId === currentUser.userId)
                          ? `<button class="btn delete-comment">Delete</button>`
                          : ""
                      }
                  </div>
                  <span class="comment-content">${comment.content}</span>
              </div>
          `,
        )
        .join("");
    }

    // Hide the loader and show the comments with transition
    setTimeout(() => {
      commentLoader.classList.add("hidden");

      // Update the content and make it visible
      commentsContent.innerHTML = commentsHTML;
      setTimeout(() => {
        commentsContent.classList.add("visible");

        // Add event listeners for delete buttons
        const deleteButtons =
          commentsContent.querySelectorAll(".delete-comment");
        const self = this; // capture GalleryView instance
        deleteButtons.forEach((button) => {
          button.addEventListener("click", function (e) {
            e.preventDefault();
            // Get the comment ID from the parent element's data attribute
            const commentElement = this.parentElement.parentElement;
            const commentId = commentElement.dataset.commentId;
            if (!commentId) return;

            // Immediately hide the comment and show loader
            commentElement.style.display = "none"; // Hide immediately without animation
            commentLoader.classList.remove("hidden");

            // Delete the comment and update the UI
            apiService
              .deleteComment(commentId)
              .then((result) => {
                if (result.success) {
                  // Hide all comments
                  commentsContent.classList.remove("visible");

                  // Reload comments after deletion
                  const image = self.getCurrentImage();
                  if (image) {
                    self.loadComments(image.imageId);
                  }
                } else {
                  // Restore the comment visibility on error
                  commentElement.style.display = "";
                  alert(
                    `Failed to delete comment: ${result.message || "Unknown error"}`,
                  );
                  // Hide loader on error
                  commentLoader.classList.add("hidden");
                }
              })
              .catch((error) => {
                // Restore the comment visibility on error
                commentElement.style.display = "";
                console.log("Error deleting comment:", error);
                alert(
                  "An error occurred while deleting the comment. Please check your network connection and try again.",
                );
                // Hide loader on error
                commentLoader.classList.add("hidden");
              });
          });
        });
      }, 100);
    }, 300); // Slight delay for a more natural transition
  }

  updateCommentPagination() {
    const commentPageInfo = this.element?.querySelector(".comment-page-info");
    if (!commentPageInfo) return;
    const currPage = this.getCurrentCommentPage();
    const totalPages = this.getTotalPages();
    commentPageInfo.innerHTML = `${Math.min(currPage, totalPages)}/${totalPages}`;

    // Code automatically generated/suggested by Copilot (no prompt).
    const prevButton = this.element?.querySelector(".prev-comment-pg");
    const nextButton = this.element?.querySelector(".next-comment-pg");

    if (prevButton) {
      prevButton.disabled = currPage === 1;
      if (currPage === 1) {
        prevButton.classList.add("disabled");
      } else {
        prevButton.classList.remove("disabled");
      }
    }

    if (nextButton) {
      nextButton.disabled = currPage >= totalPages;
      if (currPage >= totalPages) {
        nextButton.classList.add("disabled");
      } else {
        nextButton.classList.remove("disabled");
      }
    }
  }

  loadComments(imageId) {
    // Reset pagination to first page
    const page = 1;

    // Get the comments container and ensure it has a loader
    const imgComments = this.element?.querySelector(".img-comments");
    let commentLoader = imgComments?.querySelector(".loader.comment-loader");

    // If there's no loader yet, create one
    if (!commentLoader) {
      // Clear the container first
      imgComments.innerHTML = "";

      // Add loader
      commentLoader = document.createElement("div");
      commentLoader.className = "loader comment-loader";
      commentLoader.innerHTML = '<div class="loader-wheel small"></div>';
      imgComments.appendChild(commentLoader);

      // Add content container
      const commentsContent = document.createElement("div");
      commentsContent.className = "content-container comments-content";
      imgComments.appendChild(commentsContent);
    } else {
      // Make sure the loader is visible and content is hidden
      commentLoader.classList.remove("hidden");
      const commentsContent = imgComments.querySelector(".comments-content");
      if (commentsContent) {
        commentsContent.classList.remove("visible");
      }
    }

    // Get comments for the first page, which will also populate the count and totalPages
    return apiService
      .getComments(imageId, page, LIMIT)
      .then((result) => {
        if (result.success) {
          // Get total comment count and pages from the API service
          return apiService.getCommentCount(imageId).then((countResult) => {
            if (countResult.success) {
              const totalPages = apiService.getCommentTotalPages(imageId);

              // Update all comment state at once
              this.setCommentState({
                comments: result.comments,
                currentPage: page,
                totalPages: totalPages,
              });

              // Render the comments with loaders and transitions
              this.renderComments(result.comments);

              // Update comment pagination info
              this.updateCommentPagination();
            } else {
              console.log("Error getting comment count:", countResult.message);
              alert(
                `Failed to get comment count: ${countResult.message || "Unknown error"}`,
              );

              // Hide loader on error
              if (commentLoader) {
                commentLoader.classList.add("hidden");
              }
            }
          });
        } else {
          console.log("Error loading comments:", result.message);
          // alert(
          //   `Failed to load comments: ${result.message || "Unknown error"}`,
          // );
          if (imgComments)
            imgComments.innerHTML = "<p>Sign in to post or view comments.</p>";
          // Hide loader on error
          if (commentLoader) {
            commentLoader.classList.add("hidden");
          }
        }
      })
      .catch((error) => {
        console.log("Error loading comments:", error);
        // alert("An error occurred while loading comments. Please try again.");

        // Hide loader on error
        if (commentLoader) {
          commentLoader.classList.add("hidden");
        }
      });
  }

  attachCommentListeners(imageId) {
    // Add event listener for comment form submission
    const commentForm = this.element?.querySelector(".comment-form");
    if (commentForm) {
      commentForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const content = e.target.querySelector('[name="comment"]').value;

        // Show loading state
        const imgComments = this.element?.querySelector(".img-comments");
        let commentLoader = imgComments?.querySelector(
          ".loader.comment-loader",
        );

        if (!commentLoader) {
          // Create loader if it doesn't exist
          commentLoader = document.createElement("div");
          commentLoader.className = "loader comment-loader";
          commentLoader.innerHTML = '<div class="loader-wheel small"></div>';
          imgComments.appendChild(commentLoader);
        } else {
          commentLoader.classList.remove("hidden");
        }

        // Hide previous comments content during submission
        const commentsContent = imgComments?.querySelector(".comments-content");
        if (commentsContent) {
          commentsContent.classList.remove("visible");
        }

        // Disable the submit button while processing
        const submitButton = e.target.querySelector(".submit-comment");
        if (submitButton) {
          submitButton.disabled = true;
        }

        apiService
          .addComment(imageId, this.currentUser.userId, content)
          .then((result) => {
            if (result.success) {
              e.target.reset();
              // Re-enable the submit button
              if (submitButton) {
                submitButton.disabled = false;
              }
              return this.loadComments(imageId); // Reload comments after adding
            } else {
              alert(
                `Failed to add comment: ${result.message || "Unknown error"}`,
              );
              // Hide loader on error
              if (commentLoader) {
                commentLoader.classList.add("hidden");
              }
              // Re-enable the submit button
              if (submitButton) {
                submitButton.disabled = false;
              }
            }
          })
          .catch((error) => {
            console.log("Error adding comment:", error);
            alert(
              "An error occurred while adding the comment. Please try again.",
            );
            // Hide loader on error
            if (commentLoader) {
              commentLoader.classList.add("hidden");
            }
            // Re-enable the submit button
            if (submitButton) {
              submitButton.disabled = false;
            }
          });
      });
    }

    // Previous comment page button event listener
    const prevCommentBtn = this.element?.querySelector(".prev-comment-pg");
    if (prevCommentBtn) {
      prevCommentBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // Skip if the button is disabled
        if (e.target.disabled || e.target.classList.contains("disabled"))
          return;

        const currPage = this.getCurrentCommentPage();
        if (currPage > 1) {
          const newPage = currPage - 1;
          const image = this.getCurrentImage();

          // Show loader before loading new comments
          const imgComments = this.element?.querySelector(".img-comments");
          let commentLoader = imgComments?.querySelector(
            ".loader.comment-loader",
          );

          if (!commentLoader) {
            // Create loader if it doesn't exist
            commentLoader = document.createElement("div");
            commentLoader.className = "loader comment-loader";
            commentLoader.innerHTML = '<div class="loader-wheel small"></div>';
            imgComments?.appendChild(commentLoader);
          } else {
            commentLoader.classList.remove("hidden");
          }

          // Hide previous comments content
          const commentsContent =
            imgComments?.querySelector(".comments-content");
          if (commentsContent) {
            commentsContent.classList.remove("visible");
          }

          apiService
            .getComments(image.imageId, newPage, LIMIT)
            .then((result) => {
              if (result.success) {
                // Update state in one operation
                this.setCommentState({
                  ...this.getCommentState(),
                  currentPage: newPage,
                  comments: result.comments,
                });

                this.renderComments(result.comments);
                this.updateCommentPagination();
              } else {
                // alert(
                //   `Failed to load comments: ${result.message || "Unknown error"}`,
                // );
                // Hide loader on error
                if (commentLoader) {
                  commentLoader.classList.add("hidden");
                }
              }
            })
            .catch((error) => {
              console.log("Error navigating to previous comment page:", error);
              // alert(
              //   "An error occurred while loading comments. Please try again.",
              // );
              // Hide loader on error
              if (commentLoader) {
                commentLoader.classList.add("hidden");
              }
            });
        }
      });
    }

    // Next comment page button event listener
    const nextCommentBtn = this.element?.querySelector(".next-comment-pg");
    if (nextCommentBtn) {
      nextCommentBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // Skip if the button is disabled
        if (e.target.disabled || e.target.classList.contains("disabled"))
          return;

        const currentPage = this.getCurrentCommentPage();
        const totalPages = this.getTotalPages();

        if (currentPage < totalPages) {
          const newPage = currentPage + 1;

          // Show loader before loading new comments
          const imgComments = this.element?.querySelector(".img-comments");
          let commentLoader = imgComments?.querySelector(
            ".loader.comment-loader",
          );

          if (!commentLoader) {
            // Create loader if it doesn't exist
            commentLoader = document.createElement("div");
            commentLoader.className = "loader comment-loader";
            commentLoader.innerHTML = '<div class="loader-wheel small"></div>';
            imgComments?.appendChild(commentLoader);
          } else {
            commentLoader.classList.remove("hidden");
          }

          // Hide previous comments content
          const commentsContent =
            imgComments?.querySelector(".comments-content");
          if (commentsContent) {
            commentsContent.classList.remove("visible");
          }

          // Load comments for the new page
          const image = this.getCurrentImage();

          apiService
            .getComments(image.imageId, newPage, LIMIT)
            .then((result) => {
              if (result.success) {
                // Update state in one operation
                this.setCommentState({
                  ...this.getCommentState(),
                  currentPage: newPage,
                  comments: result.comments,
                });

                this.renderComments(result.comments);
                this.updateCommentPagination();
              } else {
                // alert(
                //   `Failed to load comments: ${result.message || "Unknown error"}`,
                // );
                // // Hide loader on error
                if (commentLoader) {
                  commentLoader.classList.add("hidden");
                }
              }
            })
            .catch((error) => {
              console.log("Error navigating to next comment page:", error);
              // alert(
              //   "An error occurred while loading comments. Please try again.",
              // );
              // Hide loader on error
              if (commentLoader) {
                commentLoader.classList.add("hidden");
              }
            });
        }
      });
    }
  }

  init() {
    // Load gallery information
    apiService
      .getGallery(this.galleryId)
      .then((res) => {
        this.gallery = res.gallery;
        this.gallery.userId = res.gallery.userId;
        console.log(`init Gallery View ${res.gallery.images}`);
        this.attachEventListeners();
        this.updateImageView()
          .then(() => this.renderGallery())
          .catch((error) => {
            console.log("Error initializing gallery:", error);
          });
      })
      .catch((error) => {
        console.log("Error loading gallery:", error);
        console.log("Failed to load gallery");
      });
  }

  render() {
    const element = document.createElement("div");
    element.className = "gallery-view";
    element.innerHTML = `      
      <div class="row img-viewer">
        <!-- Image viewer content will be rendered here -->
      </div>
      <div class="row img-nav">
        <!-- Navigation controls will be rendered here -->
      </div>
    `;

    this.element = element;
    return element;
  }
}
