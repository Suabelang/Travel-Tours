// ============================================
// FERRY ASSISTANCE MODULE - MODAL POPUP VERSION
// ============================================

class FerryAssistanceManager {
  constructor() {
    // Store inquiries in localStorage
    this.ferryInquiries = [];

    this.init();
  }

  init() {
    // Load existing inquiries from localStorage
    this.loadInquiriesFromStorage();
  }

  // Open ferry modal
  openFerryModal() {
    console.log("⛴️ Opening ferry assistance modal...");

    const modal = document.getElementById("ferryModal");
    const welcomeScreen = document.getElementById("serviceWelcomeScreen");
    const serviceButtons = document.getElementById("serviceButtons");

    if (!modal) {
      console.error("⛴️ Ferry modal not found!");
      return;
    }

    // Set modal content
    const modalContent = modal.querySelector(".modal-popup-content");
    if (modalContent) {
      modalContent.innerHTML = this.getFerryModalHTML();
    }

    // Show modal
    modal.classList.add("active");
    if (welcomeScreen) welcomeScreen.style.display = "none";
    if (serviceButtons) serviceButtons.style.display = "none";
    document.body.style.overflow = "hidden";

    // Initialize form after modal is shown
    setTimeout(() => {
      this.initFerryForm();
    }, 100);
  }

  // Close ferry modal
  closeFerryModal() {
    const modal = document.getElementById("ferryModal");
    const welcomeScreen = document.getElementById("serviceWelcomeScreen");
    const serviceButtons = document.getElementById("serviceButtons");

    if (modal) {
      modal.classList.remove("active");
      if (welcomeScreen) welcomeScreen.style.display = "block";
      if (serviceButtons) serviceButtons.style.display = "grid";
      document.body.style.overflow = "";
    }
  }

  // Get ferry modal HTML
  getFerryModalHTML() {
    return `
      <div class="modal-popup-header" style="background: linear-gradient(135deg, #0e7a5c, #0a8a6e);">
        <button class="modal-popup-close" onclick="window.ferryAssistanceManager.closeFerryModal()">✕</button>
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-4xl">
            ⛴️
          </div>
          <div>
            <h3 class="text-2xl font-bold">Ferry Assistance</h3>
            <p class="text-white/80 text-sm">Need help with ferry travel?</p>
          </div>
        </div>
      </div>

      <div class="modal-popup-body">
        <!-- Ferry Route Information -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border-l-4 border-[#076653]">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 bg-[#076653] rounded-lg flex items-center justify-center text-white flex-shrink-0">
              <i class="fas fa-ship"></i>
            </div>
            <div>
              <h4 class="font-bold text-gray-800 mb-1">🚢 Boracay Ferry Route</h4>
              <p class="text-xs text-gray-600 mb-1">
                <span class="font-semibold">Route:</span> Batangas Pier → Caticlan Jetty Port
              </p>
              <p class="text-xs text-gray-600">
                <span class="font-semibold">Duration:</span> Approx. 9 hours
              </p>
            </div>
          </div>
        </div>

        <form id="ferryModalForm">
          <input type="text" name="fullName" placeholder="Full Name *" class="input-popup" required />
          <input type="email" name="email" placeholder="Email Address *" class="input-popup" required />
          <input type="tel" name="phone" placeholder="Phone Number *" class="input-popup" required />
          
          <select name="route" class="input-popup" required>
            <option value="">Select Ferry Route *</option>
            <option value="boracay">🏖️ Boracay - Batangas to Caticlan</option>
            <option value="palawan">🏝️ Palawan - Manila to Puerto Princesa</option>
            <option value="cebu">🌊 Cebu - Manila to Cebu City</option>
            <option value="mindoro">⛰️ Mindoro - Batangas to Puerto Galera</option>
          </select>

          <textarea name="inquiry" rows="3" class="input-popup" placeholder="Your Inquiry *" required></textarea>

          <div class="btn-group-popup">
            <button type="button" class="btn-popup btn-outline-popup" onclick="window.ferryAssistanceManager.closeFerryModal()">
              Cancel
            </button>
            <button type="submit" class="btn-popup btn-primary-popup">
              Submit Inquiry
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // Initialize ferry form
  initFerryForm() {
    const form = document.getElementById("ferryModalForm");
    if (!form) return;

    // Remove existing listener
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    // Add new listener
    newForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.submitFerryForm();
    });
  }

  // Submit ferry form
  submitFerryForm() {
    console.log("⛴️ Submitting ferry form...");

    const form = document.getElementById("ferryModalForm");
    if (!form) return;

    // Get form data
    const formData = new FormData(form);

    // Create inquiry object
    const inquiry = {
      reference: `FA-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: formData.get("fullName") || "",
      email: formData.get("email") || "",
      phone: formData.get("phone") || "",
      route: formData.get("route") || "",
      inquiry: formData.get("inquiry") || "",
      submissionTime: new Date().toISOString(),
      status: "pending",
      service: "ferry_assistance",
      source: "website",
    };

    // Validate required fields
    if (
      !inquiry.fullName ||
      !inquiry.email ||
      !inquiry.phone ||
      !inquiry.route ||
      !inquiry.inquiry
    ) {
      this.showNotification("Please fill in all required fields", "error");
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inquiry.email)) {
      this.showNotification("Please enter a valid email address", "error");
      return;
    }

    console.log("⛴️ Ferry inquiry:", inquiry);

    // Save to localStorage
    this.saveInquiryToStorage(inquiry);

    // Reset form
    form.reset();

    // Show success message
    this.showSuccessMessage(inquiry);

    // Close modal after 2 seconds
    setTimeout(() => {
      this.closeFerryModal();
    }, 2000);
  }

  // Save inquiry to localStorage
  saveInquiryToStorage(inquiry) {
    try {
      // Get existing inquiries
      let inquiries = [];
      const stored = localStorage.getItem("sns_ferry_inquiries");

      if (stored) {
        try {
          inquiries = JSON.parse(stored);
          if (!Array.isArray(inquiries)) inquiries = [];
        } catch {
          inquiries = [];
        }
      }

      // Add new inquiry at the beginning
      inquiries.unshift(inquiry);

      // Keep only last 50 inquiries
      if (inquiries.length > 50) {
        inquiries = inquiries.slice(0, 50);
      }

      // Save back to localStorage
      localStorage.setItem("sns_ferry_inquiries", JSON.stringify(inquiries));

      // Update local array
      this.ferryInquiries = inquiries;

      console.log(
        "⛴️ Saved to localStorage. Total inquiries:",
        inquiries.length,
      );
    } catch (e) {
      console.error("⛴️ localStorage error:", e);
    }
  }

  // Load inquiries from localStorage
  loadInquiriesFromStorage() {
    try {
      const stored = localStorage.getItem("sns_ferry_inquiries");
      if (stored) {
        this.ferryInquiries = JSON.parse(stored) || [];
        console.log(
          "⛴️ Loaded",
          this.ferryInquiries.length,
          "inquiries from localStorage",
        );
      }
    } catch (e) {
      console.error("⛴️ Error loading from localStorage:", e);
      this.ferryInquiries = [];
    }
  }

  // Show success message
  showSuccessMessage(inquiry) {
    const routeNames = {
      boracay: "Boracay 🏖️",
      palawan: "Palawan 🏝️",
      cebu: "Cebu 🌊",
      mindoro: "Mindoro ⛰️",
    };

    const routeName = routeNames[inquiry.route] || inquiry.route;

    const message = `
      <div class="font-bold mb-1">✅ Ferry Inquiry Submitted!</div>
      <div class="text-sm">Reference: ${inquiry.reference}</div>
      <div class="text-sm">Route: ${routeName}</div>
      <div class="text-sm mt-1">We'll contact you at ${inquiry.email} within 24 hours.</div>
    `;

    this.showNotification(message, "success");
  }

  // Show notification
  showNotification(message, type = "info") {
    // Check if notificationManager exists
    if (window.notificationManager) {
      if (type === "success") window.notificationManager.success(message);
      else if (type === "error") window.notificationManager.error(message);
      else if (type === "warning") window.notificationManager.warning(message);
      else window.notificationManager.info(message);
      return;
    }

    // Fallback notification
    const notification = document.getElementById("notification");
    if (notification) {
      notification.className = `notification ${type}`;
      notification.innerHTML = message;
      notification.style.display = "block";

      setTimeout(() => {
        notification.style.display = "none";
      }, 5000);
    } else {
      if (type === "error") alert("Error: " + message);
      else alert(message);
    }
  }

  // Get all stored inquiries
  getInquiries() {
    return this.ferryInquiries;
  }

  // Clear all inquiries (for admin use)
  clearAllInquiries() {
    if (confirm("Are you sure you want to delete all ferry inquiries?")) {
      localStorage.removeItem("sns_ferry_inquiries");
      this.ferryInquiries = [];
      this.showNotification("All ferry inquiries cleared", "info");
    }
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  // Check if ferry manager already exists
  if (!window.ferryAssistanceManager) {
    window.ferryAssistanceManager = new FerryAssistanceManager();
    console.log("⛴️ Ferry Assistance Manager initialized (Modal Version)");
  }
});

// For debugging - expose to window
window.getFerryInquiries = function () {
  if (window.ferryAssistanceManager) {
    return window.ferryAssistanceManager.getInquiries();
  }
  return [];
};

window.clearFerryInquiries = function () {
  if (window.ferryAssistanceManager) {
    window.ferryAssistanceManager.clearAllInquiries();
  }
};

console.log("⛴️ Ferry Assistance script loaded - Modal Version");
