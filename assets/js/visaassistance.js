// ============================================
// VISA ASSISTANCE MODULE - MODAL POPUP VERSION
// ============================================

class VisaAssistanceManager {
  constructor() {
    // Store inquiries in localStorage
    this.visaInquiries = [];

    // Country requirements database
    this.countryRequirements = {
      usa: {
        name: "USA",
        flag: "🇺🇸",
        requirements: [
          "Valid Philippine passport (at least 6 months validity beyond intended stay)",
          "DS-160 confirmation page (online application)",
          "Passport-sized photo (2x2 inches, white background)",
          "Bank certificate and bank statement (last 3 months)",
          "Certificate of Employment with Leave Benefits",
          "Income Tax Return (ITR) for the last year",
          "Travel itinerary and flight bookings",
          "Hotel reservations",
          "Proof of ties to Philippines (family, property, business)",
        ],
        processingTime: "3-5 working days",
        fee: "$160 USD",
        validity: "Up to 10 years",
      },
      canada: {
        name: "Canada",
        flag: "🇨🇦",
        requirements: [
          "Valid Philippine passport",
          "Completed visa application form",
          "Passport-sized photos (35mm x 45mm)",
          "Proof of financial support (bank statements, ITR)",
          "Certificate of Employment",
          "Travel itinerary",
          "Letter of explanation for travel purpose",
          "Hotel bookings",
          "Flight reservations",
        ],
        processingTime: "15-20 working days",
        fee: "CAD $100",
        validity: "Up to 10 years or until passport expiry",
      },
      japan: {
        name: "Japan",
        flag: "🇯🇵",
        requirements: [
          "Valid Philippine passport",
          "Visa application form (with 2x2 photo)",
          "Passport photo (4.5cm x 4.5cm)",
          "Bank certificate (original)",
          "Bank statement (last 3 months)",
          "Certificate of Employment",
          "Flight itinerary",
          "Hotel bookings",
          "Daily itinerary in Japan",
        ],
        processingTime: "5-7 working days",
        fee: "PHP 1,500",
        validity: "Single entry, 90 days",
      },
      korea: {
        name: "South Korea",
        flag: "🇰🇷",
        requirements: [
          "Valid Philippine passport",
          "Visa application form",
          "Passport photo (3.5cm x 4.5cm)",
          "Bank certificate",
          "Bank statement (last 3 months)",
          "Certificate of Employment",
          "ITR or business documents",
          "Flight itinerary",
          "Hotel bookings",
          "Travel insurance",
        ],
        processingTime: "7-10 working days",
        fee: "PHP 2,500",
        validity: "Single entry, 90 days",
      },
      australia: {
        name: "Australia",
        flag: "🇦🇺",
        requirements: [
          "Valid Philippine passport",
          "Online application form",
          "Passport photo",
          "Proof of funds (bank statements, ITR)",
          "Certificate of Employment",
          "Travel history",
          "Health insurance",
          "Letter of invitation (if applicable)",
          "Flight itinerary",
          "Accommodation details",
        ],
        processingTime: "15-25 working days",
        fee: "AUD $145",
        validity: "Up to 12 months",
      },
      uk: {
        name: "United Kingdom",
        flag: "🇬🇧",
        requirements: [
          "Valid Philippine passport",
          "Online application form",
          "Passport photo",
          "Bank statements (last 6 months)",
          "Certificate of Employment",
          "ITR or business documents",
          "Proof of accommodation",
          "Flight itinerary",
          "Travel insurance",
          "Biometrics appointment",
        ],
        processingTime: "15-20 working days",
        fee: "GBP £100",
        validity: "Up to 6 months",
      },
      schengen: {
        name: "Schengen (Europe)",
        flag: "🇪🇺",
        requirements: [
          "Valid Philippine passport",
          "Schengen visa application form",
          "Passport photos (35mm x 45mm)",
          "Travel insurance (minimum €30,000 coverage)",
          "Flight itinerary",
          "Hotel bookings",
          "Bank certificate and statements",
          "Certificate of Employment",
          "ITR",
          "Cover letter explaining purpose of travel",
        ],
        processingTime: "15 working days",
        fee: "EUR €80",
        validity: "Up to 90 days",
      },
      china: {
        name: "China",
        flag: "🇨🇳",
        requirements: [
          "Valid Philippine passport",
          "Visa application form",
          "Passport photo",
          "Bank certificate",
          "Certificate of Employment",
          "Flight itinerary",
          "Hotel bookings",
          "Invitation letter (if applicable)",
          "Travel itinerary",
        ],
        processingTime: "7-10 working days",
        fee: "PHP 3,500",
        validity: "Single/Double entry, 30-90 days",
      },
      thailand: {
        name: "Thailand",
        flag: "🇹🇭",
        requirements: [
          "Valid Philippine passport",
          "Visa application form",
          "Passport photo",
          "Bank certificate",
          "Flight itinerary",
          "Hotel bookings",
          "Certificate of Employment (optional)",
        ],
        processingTime: "3-5 working days",
        fee: "PHP 1,500",
        validity: "Single entry, 60 days",
      },
      vietnam: {
        name: "Vietnam",
        flag: "🇻🇳",
        requirements: [
          "Valid Philippine passport",
          "Visa application form",
          "Passport photo",
          "Bank certificate",
          "Flight itinerary",
          "Hotel bookings",
        ],
        processingTime: "5-7 working days",
        fee: "PHP 2,000",
        validity: "Single entry, 30 days",
      },
      singapore: {
        name: "Singapore",
        flag: "🇸🇬",
        requirements: [
          "Valid Philippine passport",
          "Online application form",
          "Passport photo",
          "Bank certificate",
          "Flight itinerary",
          "Hotel bookings",
          "Certificate of Employment",
        ],
        processingTime: "3-5 working days",
        fee: "SGD $30",
        validity: "Up to 2 years",
      },
      malaysia: {
        name: "Malaysia",
        flag: "🇲🇾",
        requirements: [
          "Valid Philippine passport",
          "Visa application form",
          "Passport photo",
          "Bank certificate",
          "Flight itinerary",
          "Hotel bookings",
        ],
        processingTime: "3-5 working days",
        fee: "PHP 1,200",
        validity: "Single entry, 30 days",
      },
    };

    this.init();
  }

  init() {
    // Load existing inquiries from localStorage
    this.loadInquiriesFromStorage();
  }

  // Open visa modal
  openVisaModal() {
    console.log("🛂 Opening visa assistance modal...");

    const modal = document.getElementById("visaModal");
    const welcomeScreen = document.getElementById("serviceWelcomeScreen");
    const serviceButtons = document.getElementById("serviceButtons");

    if (!modal) {
      console.error("🛂 Visa modal not found!");
      return;
    }

    // Set modal content
    const modalContent = modal.querySelector(".modal-popup-content");
    if (modalContent) {
      modalContent.innerHTML = this.getVisaModalHTML();
    }

    // Show modal
    modal.classList.add("active");
    if (welcomeScreen) welcomeScreen.style.display = "none";
    if (serviceButtons) serviceButtons.style.display = "none";
    document.body.style.overflow = "hidden";

    // Initialize country buttons after modal is shown
    setTimeout(() => {
      this.initCountryButtons();
      this.initVisaForm();
    }, 100);
  }

  // Close visa modal
  closeVisaModal() {
    const modal = document.getElementById("visaModal");
    const welcomeScreen = document.getElementById("serviceWelcomeScreen");
    const serviceButtons = document.getElementById("serviceButtons");

    if (modal) {
      modal.classList.remove("active");
      if (welcomeScreen) welcomeScreen.style.display = "block";
      if (serviceButtons) serviceButtons.style.display = "grid";
      document.body.style.overflow = "";
    }
  }

  // Get visa modal HTML
  getVisaModalHTML() {
    return `
      <div class="modal-popup-header">
        <button class="modal-popup-close" onclick="window.visaAssistanceManager.closeVisaModal()">✕</button>
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-4xl">
            🛂
          </div>
          <div>
            <h3 class="text-2xl font-bold">Visa Assistance</h3>
            <p class="text-white/80 text-sm">Select your destination country</p>
          </div>
        </div>
      </div>

      <div class="modal-popup-body">
        <p class="text-gray-600 mb-4 text-center">
          Choose a country to see visa requirements
        </p>

        <div class="country-grid-popup" id="visaCountryGrid">
          ${this.getCountryButtonsHTML()}
        </div>

        <div id="visaRequirementsBox" class="requirements-popup" style="display: none;">
          <h4 id="visaSelectedCountry" class="font-bold text-[#076653] mb-2 flex items-center gap-2">
            <i class="fas fa-clipboard-list"></i>
            <span>Requirements</span>
          </h4>
          <div id="visaRequirementsList" class="text-sm space-y-2 max-h-60 overflow-y-auto pr-2"></div>
        </div>

        <form id="visaModalForm">
          <input type="text" name="fullName" placeholder="Full Name *" class="input-popup" required />
          <input type="email" name="email" placeholder="Email Address *" class="input-popup" required />
          <input type="tel" name="phone" placeholder="Phone Number *" class="input-popup" required />
          
          <div class="btn-group-popup">
            <button type="button" class="btn-popup btn-outline-popup" onclick="window.visaAssistanceManager.closeVisaModal()">
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

  // Get country buttons HTML
  getCountryButtonsHTML() {
    const countries = [
      { code: "usa", flag: "🇺🇸", name: "USA" },
      { code: "canada", flag: "🇨🇦", name: "Canada" },
      { code: "japan", flag: "🇯🇵", name: "Japan" },
      { code: "korea", flag: "🇰🇷", name: "Korea" },
      { code: "australia", flag: "🇦🇺", name: "Australia" },
      { code: "uk", flag: "🇬🇧", name: "UK" },
      { code: "schengen", flag: "🇪🇺", name: "Schengen" },
      { code: "china", flag: "🇨🇳", name: "China" },
      { code: "thailand", flag: "🇹🇭", name: "Thailand" },
      { code: "vietnam", flag: "🇻🇳", name: "Vietnam" },
      { code: "singapore", flag: "🇸🇬", name: "Singapore" },
      { code: "malaysia", flag: "🇲🇾", name: "Malaysia" },
    ];

    return countries
      .map(
        (country) => `
      <div class="country-popup-btn" data-country="${country.code}">
        <span class="text-2xl block mb-1">${country.flag}</span>
        <span class="text-xs font-medium">${country.name}</span>
      </div>
    `,
      )
      .join("");
  }

  // Initialize country buttons
  initCountryButtons() {
    const countryBtns = document.querySelectorAll(
      "#visaModal .country-popup-btn",
    );
    const requirementsBox = document.getElementById("visaRequirementsBox");
    const selectedCountry = document.getElementById("visaSelectedCountry");
    const requirementsList = document.getElementById("visaRequirementsList");

    if (!countryBtns.length) return;

    countryBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        // Remove selection from all
        countryBtns.forEach((b) => {
          b.classList.remove("selected", "border-[#076653]", "bg-[#f0fdf4]");
        });

        // Add selection to clicked
        btn.classList.add("selected", "border-[#076653]", "bg-[#f0fdf4]");

        // Get country code
        const countryCode = btn.dataset.country;
        const country = this.countryRequirements[countryCode];

        if (country) {
          // Update selected country text
          const countrySpan = selectedCountry.querySelector("span");
          if (countrySpan) {
            countrySpan.textContent = `${country.flag} ${country.name} Visa Requirements`;
          }

          // Generate requirements list
          let html = "";

          // Add requirements
          country.requirements.forEach((req) => {
            html += `
              <li class="flex items-start gap-2 py-1 border-b border-gray-100 last:border-0">
                <i class="fas fa-check-circle text-green-500 mt-1 flex-shrink-0"></i>
                <span class="text-sm">${req}</span>
              </li>
            `;
          });

          // Add processing time, fee, validity
          html += `
            <li class="flex items-start gap-2 pt-2 mt-2 border-t border-gray-200">
              <i class="fas fa-clock text-blue-600 mt-1 flex-shrink-0"></i>
              <span class="text-sm"><strong>Processing Time:</strong> ${country.processingTime}</span>
            </li>
            <li class="flex items-start gap-2">
              <i class="fas fa-money-bill-wave text-yellow-600 mt-1 flex-shrink-0"></i>
              <span class="text-sm"><strong>Visa Fee:</strong> ${country.fee}</span>
            </li>
            <li class="flex items-start gap-2">
              <i class="fas fa-calendar-check text-purple-600 mt-1 flex-shrink-0"></i>
              <span class="text-sm"><strong>Validity:</strong> ${country.validity}</span>
            </li>
          `;

          requirementsList.innerHTML = html;
          requirementsBox.style.display = "block";
        }
      });
    });
  }

  // Initialize visa form
  initVisaForm() {
    const form = document.getElementById("visaModalForm");
    if (!form) return;

    // Remove existing listener
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    // Add new listener
    newForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.submitVisaForm();
    });
  }

  // Submit visa form
  submitVisaForm() {
    console.log("🛂 Submitting visa form...");

    const form = document.getElementById("visaModalForm");
    if (!form) return;

    // Get form data
    const formData = new FormData(form);

    // Get selected country
    const selectedCountryBtn = document.querySelector(
      "#visaModal .country-popup-btn.selected",
    );
    const selectedCountry = selectedCountryBtn
      ? selectedCountryBtn.dataset.country
      : null;
    const selectedCountryName = selectedCountry
      ? this.countryRequirements[selectedCountry]?.name || "Not specified"
      : "Not specified";

    // Validate country selection
    if (!selectedCountry) {
      this.showNotification("Please select a destination country", "error");
      return;
    }

    // Create inquiry object
    const inquiry = {
      reference: `VISA-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: formData.get("fullName") || "",
      email: formData.get("email") || "",
      phone: formData.get("phone") || "",
      country: selectedCountry,
      countryName: selectedCountryName,
      submissionTime: new Date().toISOString(),
      status: "pending",
      service: "visa_assistance",
      source: "website",
    };

    // Validate required fields
    if (!inquiry.fullName || !inquiry.email || !inquiry.phone) {
      this.showNotification("Please fill in all required fields", "error");
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inquiry.email)) {
      this.showNotification("Please enter a valid email address", "error");
      return;
    }

    console.log("🛂 Visa inquiry:", inquiry);

    // Save to localStorage
    this.saveInquiryToStorage(inquiry);

    // Reset form
    form.reset();

    // Hide requirements box
    const requirementsBox = document.getElementById("visaRequirementsBox");
    if (requirementsBox) {
      requirementsBox.style.display = "none";
    }

    // Remove selected class from country buttons
    document
      .querySelectorAll("#visaModal .country-popup-btn")
      .forEach((btn) => {
        btn.classList.remove("selected", "border-[#076653]", "bg-[#f0fdf4]");
      });

    // Show success message
    this.showSuccessMessage(inquiry);

    // Close modal after 2 seconds
    setTimeout(() => {
      this.closeVisaModal();
    }, 2000);
  }

  // Save inquiry to localStorage
  saveInquiryToStorage(inquiry) {
    try {
      // Get existing inquiries
      let inquiries = [];
      const stored = localStorage.getItem("sns_visa_inquiries");

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
      localStorage.setItem("sns_visa_inquiries", JSON.stringify(inquiries));

      // Update local array
      this.visaInquiries = inquiries;

      console.log(
        "🛂 Saved to localStorage. Total inquiries:",
        inquiries.length,
      );
    } catch (e) {
      console.error("🛂 localStorage error:", e);
    }
  }

  // Load inquiries from localStorage
  loadInquiriesFromStorage() {
    try {
      const stored = localStorage.getItem("sns_visa_inquiries");
      if (stored) {
        this.visaInquiries = JSON.parse(stored) || [];
        console.log(
          "🛂 Loaded",
          this.visaInquiries.length,
          "inquiries from localStorage",
        );
      }
    } catch (e) {
      console.error("🛂 Error loading from localStorage:", e);
      this.visaInquiries = [];
    }
  }

  // Show success message
  showSuccessMessage(inquiry) {
    const message = `
      <div class="font-bold mb-1">✅ Visa Inquiry Submitted!</div>
      <div class="text-sm">Reference: ${inquiry.reference}</div>
      <div class="text-sm">Country: ${inquiry.countryName}</div>
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
    return this.visaInquiries;
  }

  // Clear all inquiries (for admin use)
  clearAllInquiries() {
    if (confirm("Are you sure you want to delete all visa inquiries?")) {
      localStorage.removeItem("sns_visa_inquiries");
      this.visaInquiries = [];
      this.showNotification("All visa inquiries cleared", "info");
    }
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  // Check if visa manager already exists
  if (!window.visaAssistanceManager) {
    window.visaAssistanceManager = new VisaAssistanceManager();
    console.log("🛂 Visa Assistance Manager initialized (Modal Version)");
  }
});

// For debugging - expose to window
window.getVisaInquiries = function () {
  if (window.visaAssistanceManager) {
    return window.visaAssistanceManager.getInquiries();
  }
  return [];
};

window.clearVisaInquiries = function () {
  if (window.visaAssistanceManager) {
    window.visaAssistanceManager.clearAllInquiries();
  }
};

console.log("🛂 Visa Assistance script loaded - Modal Version");
