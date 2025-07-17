/**
 * Notification Component
 * Displays notifications from the app state manager
 */
import { useEffect } from "../meact.js";
import { appStateManager } from "../states/index.js";

export default class NotificationComponent {
  constructor() {
    this.element = null;

    // Set up effect to watch for notification changes
    useEffect(() => {
      this.render();
    }, [appStateManager.getState().notifications]);
  }

  /**
   * Create the notification container element
   */
  createContainer() {
    if (this.element) return this.element;

    const container = document.createElement("div");
    container.id = "notification-container";
    container.className = "notification-container";
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    `;

    document.body.appendChild(container);
    this.element = container;
    return container;
  }

  /**
   * Render all active notifications
   */
  render() {
    const container = this.createContainer();
    const notifications = appStateManager.getNotifications();

    // Clear existing notifications
    container.innerHTML = "";

    // Render each notification
    notifications.forEach((notification) => {
      const notificationEl = this.createNotificationElement(notification);
      container.appendChild(notificationEl);
    });
  }

  /**
   * Create a single notification element
   */
  createNotificationElement(notification) {
    const { id, type, message, title } = notification;

    const element = document.createElement("div");
    element.className = `notification notification-${type}`;
    element.dataset.notificationId = id;

    // Get appropriate colors for notification type
    const colors = this.getNotificationColors(type);

    element.style.cssText = `
      background: ${colors.background};
      color: ${colors.text};
      border: 1px solid ${colors.border};
      border-left: 4px solid ${colors.accent};
      padding: 12px 16px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: flex-start;
      gap: 8px;
      animation: slideIn 0.3s ease-out;
      max-width: 100%;
      word-wrap: break-word;
    `;

    // Add CSS animation
    if (!document.querySelector("#notification-styles")) {
      const style = document.createElement("style");
      style.id = "notification-styles";
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        .notification-exit {
          animation: slideOut 0.3s ease-in;
        }
      `;
      document.head.appendChild(style);
    }

    // Icon
    const icon = this.getNotificationIcon(type);
    if (icon) {
      const iconEl = document.createElement("span");
      iconEl.innerHTML = icon;
      iconEl.style.flexShrink = "0";
      element.appendChild(iconEl);
    }

    // Content
    const content = document.createElement("div");
    content.style.flex = "1";

    if (title) {
      const titleEl = document.createElement("div");
      titleEl.style.fontWeight = "bold";
      titleEl.style.marginBottom = "4px";
      titleEl.textContent = title;
      content.appendChild(titleEl);
    }

    const messageEl = document.createElement("div");
    messageEl.textContent = message;
    content.appendChild(messageEl);

    element.appendChild(content);

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "×";
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: inherit;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      margin-left: 8px;
      opacity: 0.7;
      flex-shrink: 0;
    `;
    closeBtn.addEventListener("click", () => {
      this.removeNotification(id);
    });

    element.appendChild(closeBtn);

    return element;
  }

  /**
   * Get colors for notification type
   */
  getNotificationColors(type) {
    const colors = {
      success: {
        background: "#f0f9ff",
        text: "#166534",
        border: "#bbf7d0",
        accent: "#22c55e",
      },
      error: {
        background: "#fef2f2",
        text: "#dc2626",
        border: "#fecaca",
        accent: "#ef4444",
      },
      warning: {
        background: "#fffbeb",
        text: "#d97706",
        border: "#fed7aa",
        accent: "#f59e0b",
      },
      info: {
        background: "#eff6ff",
        text: "#2563eb",
        border: "#bfdbfe",
        accent: "#3b82f6",
      },
    };

    return colors[type] || colors.info;
  }

  /**
   * Get icon for notification type
   */
  getNotificationIcon(type) {
    const icons = {
      success: "✓",
      error: "✕",
      warning: "⚠",
      info: "ℹ",
    };

    return icons[type] || icons.info;
  }

  /**
   * Remove a notification with animation
   */
  removeNotification(id) {
    const element = this.element?.querySelector(
      `[data-notification-id="${id}"]`,
    );
    if (element) {
      element.classList.add("notification-exit");
      setTimeout(() => {
        appStateManager.removeNotification(id);
      }, 300);
    }
  }

  /**
   * Initialize the notification system
   */
  init() {
    this.render();
  }

  /**
   * Clean up the notification component
   */
  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
