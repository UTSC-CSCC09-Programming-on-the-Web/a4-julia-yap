export default class ErrorView {
  constructor(params) {
    console.log("❌ ErrorView: Constructor called with params:", params);
    this.errorCode = params?.errorCode || "404";
    this.errorMessage = params?.errorMessage || "Page not found";
    this.element = null;
  }

  init() {
    console.log("🚀 ErrorView: init() called");
    // Nothing special to initialize for error view
  }

  render() {
    console.log("🎨 ErrorView: render() called");

    const element = document.createElement("div");
    element.className = "error-view";

    let errorContent;

    switch (this.errorCode) {
      case "403":
        errorContent = {
          title: "403 - Access Forbidden",
          message: "You don't have permission to access this resource.",
          suggestion:
            "Please sign in or contact an administrator if you believe this is an error.",
        };
        break;
      case "500":
        errorContent = {
          title: "500 - Internal Server Error",
          message: "Something went wrong on our end.",
          suggestion:
            "Please try again later or contact support if the problem persists.",
        };
        break;
      case "404":
      default:
        errorContent = {
          title: "404 - Page Not Found",
          message:
            this.errorMessage || "The page you're looking for doesn't exist.",
          suggestion: "Check the URL or navigate back to the home page.",
        };
        break;
    }

    element.innerHTML = `
      <div class="error-container">
        <div class="error-content">
          <h1 class="error-title">${errorContent.title}</h1>
          <p class="error-message">${errorContent.message}</p>
          <p class="error-suggestion">${errorContent.suggestion}</p>
          <div class="error-actions">
            <button class="btn btn-primary" id="goHome">Go to Home</button>
            <button class="btn btn-secondary" id="goBack">Go Back</button>
          </div>
        </div>
      </div>
    `;

    this.element = element;
    this._addEventListeners();

    console.log("✅ ErrorView: render() completed");
    return element;
  }

  _addEventListeners() {
    if (!this.element) return;

    // Go to home page
    const homeBtn = this.element.querySelector("#goHome");
    if (homeBtn) {
      homeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (window.router) {
          window.router.navigateTo("/");
        } else {
          window.location.href = "/";
        }
      });
    }

    // Go back in history
    const backBtn = this.element.querySelector("#goBack");
    if (backBtn) {
      backBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (window.history.length > 1) {
          window.history.back();
        } else {
          // If no history, go to home instead
          if (window.router) {
            window.router.navigateTo("/");
          } else {
            window.location.href = "/";
          }
        }
      });
    }
  }
}
