// ============================================
// NOTIFICATION SYSTEM - PRODUCTION (NO CONSOLE)
// ============================================

class NotificationManager {
  constructor() {
    this.notification = document.getElementById("notification");
    this.timeout = null;
  }

  show(type, message, duration = 3000) {
    if (!this.notification) return;

    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.notification.className = `notification ${type}`;
    this.notification.textContent = message;
    this.notification.style.display = "block";

    this.timeout = setTimeout(() => {
      this.hide();
    }, duration);
  }

  hide() {
    if (this.notification) {
      this.notification.style.display = "none";
    }
  }

  success(message) {
    this.show("success", message);
  }

  error(message) {
    this.show("error", message);
  }

  info(message) {
    this.show("info", message);
  }

  warning(message) {
    this.show("warning", message);
  }
}

const notificationManager = new NotificationManager();
window.notificationManager = notificationManager;

function showNotification(type, message) {
  notificationManager.show(type, message);
}

window.showNotification = showNotification;
