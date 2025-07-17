import { useState, useEffect } from "../meact.js";
import { apiService } from "../services/api-service.js";

export default class SigninView {
  constructor() {
    this._initializeStates();
    this._setupEffects();
  }

  _initializeStates() {
    const [loadingKey, getIsLoading, setIsLoading] = useState(false);
    this.loadingState = {
      key: loadingKey,
      get: getIsLoading,
      set: setIsLoading,
    };

    const [errorKey, getError, setError] = useState(null);
    this.errorState = { key: errorKey, get: getError, set: setError };
  }

  _setupEffects() {
    useEffect(() => {
      const isLoading = this.loadingState.get();
      if (this.signinBtn && this.signupBtn) {
        this.signinBtn.disabled = isLoading;
        this.signupBtn.disabled = isLoading;
        this.signinBtn.textContent = isLoading ? "Signing In..." : "Sign In";
        this.signupBtn.textContent = isLoading ? "Signing Up..." : "Sign Up";
      }
    }, [this.loadingState.key]);

    useEffect(() => {
      const error = this.errorState.get();
      let errorElement = this.element?.querySelector(".error-message");

      if (error) {
        if (!errorElement) {
          errorElement = document.createElement("div");
          errorElement.className = "error-message";
          errorElement.style.color = "red";
          errorElement.style.marginBottom = "10px";
          this.element?.insertBefore(errorElement, this.element.firstChild);
        }
        errorElement.textContent = error;
      } else if (errorElement) {
        errorElement.remove();
      }
    }, [this.errorState.key]);
  }

  render() {
    const element = document.createElement("div");
    element.className = "form-generic";
    element.innerHTML = `
      <form id="signinForm">
        <input 
          type="text"
          name="username"
          placeholder="username"
          class="form-input"
        />
        <input 
          type="password"
          name="password"
          placeholder="password"
          class="form-input"
        />
        <button class="btn" id="signin">Sign In</button>
        <button class="btn" id="signup">Sign Up</button>
      </form>
    `;

    this.element = element.querySelector("#signinForm");
    this.signinBtn = element.querySelector("#signin");
    this.signupBtn = element.querySelector("#signup");

    this.signinBtn.addEventListener("click", this.signIn);
    this.signupBtn.addEventListener("click", this.signUp);

    this.element.reset();

    // Trigger effects to update UI based on current state
    this.loadingState.set(this.loadingState.get());
    this.errorState.set(this.errorState.get());

    return element;
  }

  signUp = (e) => {
    e.preventDefault();
    this.errorState.set(null);

    const username = this.element
      .querySelector("input[name='username']")
      .value.trim();
    const password = this.element.querySelector("input[name='password']").value;

    if (!username || !password) {
      this.errorState.set("Please enter both username and password");
      return;
    }

    this.loadingState.set(true);
    apiService
      .signUp(username, password)
      .then((res) => {
        console.log("Sign up successful");
        document.dispatchEvent(new CustomEvent("auth-state-changed"));
        if (window.router) {
          window.router.navigateTo("/");
        }
      })
      .catch((error) => {
        console.error("Sign up failed");
        this.errorState.set(
          error.message || "Sign up failed. Please try again.",
        );
      })
      .finally(() => {
        this.loadingState.set(false);
      });
  };

  signIn = (e) => {
    e.preventDefault();
    this.errorState.set(null);

    const username = this.element
      .querySelector("input[name='username']")
      .value.trim();
    const password = this.element.querySelector("input[name='password']").value;

    if (!username || !password) {
      this.errorState.set("Please enter both username and password");
      return;
    }

    this.loadingState.set(true);
    apiService
      .signIn(username, password)
      .then((res) => {
        console.log("Sign in successful");
        document.dispatchEvent(new CustomEvent("auth-state-changed"));
        if (window.router) {
          window.router.navigateTo("/");
        }
      })
      .catch((error) => {
        console.error("Sign in failed");
        this.errorState.set(
          error.message || "Sign in failed. Please try again.",
        );
      })
      .finally(() => {
        this.loadingState.set(false);
      });
  };

  destroy() {
    if (this.signinBtn) {
      this.signinBtn.removeEventListener("click", this.signIn);
    }
    if (this.signupBtn) {
      this.signupBtn.removeEventListener("click", this.signUp);
    }

    this.element.reset();
    this.element = null;
    this.signinBtn = null;
    this.signupBtn = null;
  }
}
