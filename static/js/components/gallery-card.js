export default class GalleryCard {
  constructor(gallery, onClick, onDelete, currentUser) {
    this.gallery = gallery;
    this.currentUser = currentUser;

    this.onClick = onClick;
    this.onDelete = onDelete;
  }

  _addEventListeners(card) {
    card
      .querySelector(".gallery-card-content")
      .addEventListener("click", (e) => {
        e.preventDefault();
        this.onClick(this.gallery.id);
      });

    this.deleteButton = card
      .querySelector("#deleteGallery")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onDelete(this.gallery.id);
      });
  }

  render() {
    const card = document.createElement("div");
    card.className = "gallery-card";

    const isOwner =
      this.currentUser && this.currentUser.userId === this.gallery.userId;

    card.innerHTML = `
      <div class="gallery-card-content">
        ${
          this.gallery.coverImage
            ? `
            <div class="gallery-cover">
              <img src="${this.gallery.coverImage.url}" alt="${this.gallery.coverImage.title}" class="cover-image" />
            </div>
          `
            : ``
        }
        <div class="gallery-info">
          <div class="gallery-info-left">
            <h3 class="gallery-title">${this.gallery.name}</h3>
            <span class="gallery-card-author">By ${this.gallery.owner}</span>
          </div>
          <div class="gallery-info-right">
            <div class="row">
              ${isOwner ? `<button class="btn" id="deleteGallery">Delete</button>` : ""}
              <span class="gallery-card-count">${this.gallery.imageCount}</span>
            </div>
            <span class="gallery-card-updated">${new Date(this.gallery.updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
        </div>
      </div>
      <div class="gallery-actions">
        ${
          isOwner
            ? `
          <!--button class="btn" id="editGallery">Edit</button-->
        `
            : ""
        }
      </div>
    `;

    this._addEventListeners(card);
    this.element = card;

    return card;
  }

  destroy() {
    if (this.element) {
      this.element.removeEventListener("click", this.onClick);
      this.deleteButton?.removeEventListener("click", this.onDelete);
    }
  }
}
