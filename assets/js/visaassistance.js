// ============================================
// VISA ASSISTANCE MODULE - WITH SUCCESS MODAL
// ============================================

class VisaAssistanceManager {
  constructor() {
    this.visaInquiries = [];
    this.countryRequirements = {
      usa: {
        name: "USA",
        flag: "🇺🇸",
        requirements: [
          "Valid Philippine passport (at least 6 months validity)",
          "DS-160 confirmation page",
          "Passport-sized photo (2x2 inches)",
          "Bank certificate and bank statement (last 3 months)",
          "Certificate of Employment with Leave Benefits",
          "Income Tax Return (ITR)",
          "Travel itinerary and flight bookings",
          "Hotel reservations",
          "Proof of ties to Philippines",
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
          "Proof of financial support",
          "Certificate of Employment",
          "Travel itinerary",
          "Letter of explanation",
          "Hotel bookings",
          "Flight reservations",
        ],
        processingTime: "15-20 working days",
        fee: "CAD $100",
        validity: "Up to 10 years",
      },
      japan: {
        name: "Japan",
        flag: "🇯🇵",
        requirements: [
          "Valid Philippine passport",
          "Visa application form",
          "Passport photo (4.5cm x 4.5cm)",
          "Bank certificate",
          "Bank statement (last 3 months)",
          "Certificate of Employment",
          "Flight itinerary",
          "Hotel bookings",
          "Daily itinerary",
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
          "ITR",
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
          "Proof of funds",
          "Certificate of Employment",
          "Travel history",
          "Health insurance",
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
          "ITR",
          "Proof of accommodation",
          "Flight itinerary",
          "Travel insurance",
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
          "Travel insurance (€30,000 coverage)",
          "Flight itinerary",
          "Hotel bookings",
          "Bank certificate",
          "Certificate of Employment",
          "ITR",
          "Cover letter",
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
  }

  async saveToSupabase(inquiry) {
    try {
      if (!window.sns_supabase_client) {
        console.error("Supabase client not available");
        return false;
      }

      const { data, error } = await window.sns_supabase_client
        .from("visa_inquiries")
        .insert([
          {
            reference: inquiry.reference,
            full_name: inquiry.fullName,
            email: inquiry.email,
            phone: inquiry.phone,
            country: inquiry.country,
            details: {
              country_name: inquiry.countryName,
              submitted_at: inquiry.submissionTime,
            },
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;
      console.log("✅ Saved to Supabase:", data);
      return true;
    } catch (error) {
      console.error("❌ Supabase save error:", error);
      return false;
    }
  }

  showSuccessModal(inquiry) {
    // Create success modal HTML
    const modalHtml = `
      <div id="customSuccessModal" class="fixed inset-0 bg-black/70 flex items-center justify-center z-[100000] p-4" style="backdrop-filter: blur(8px);">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl transform transition-all animate-fadeInUp">
          <div class="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <i class="fas fa-check-circle text-green-500 text-4xl"></i>
          </div>
          <h3 class="text-2xl font-bold text-green-600 mb-2">Successfully Submitted!</h3>
          <p class="text-gray-600 mb-3">Your visa inquiry has been received.</p>
          <div class="bg-gray-100 rounded-lg p-3 mb-4">
            <p class="text-xs text-gray-500 mb-1">Reference Number</p>
            <p class="text-sm font-mono font-bold text-[#076653]">${inquiry.reference}</p>
          </div>
          <div class="text-left mb-4">
            <p class="text-sm text-gray-600 mb-2"><i class="fas fa-user mr-2 text-[#f97316]"></i> ${inquiry.fullName}</p>
            <p class="text-sm text-gray-600 mb-2"><i class="fas fa-envelope mr-2 text-[#f97316]"></i> ${inquiry.email}</p>
            <p class="text-sm text-gray-600 mb-2"><i class="fas fa-phone mr-2 text-[#f97316]"></i> ${inquiry.phone}</p>
            <p class="text-sm text-gray-600"><i class="fas fa-globe mr-2 text-[#f97316]"></i> ${inquiry.countryName}</p>
          </div>
          <div class="bg-blue-50 rounded-lg p-3 mb-5">
            <p class="text-xs text-blue-600"><i class="fas fa-clock mr-1"></i> Our team will contact you within 24 hours.</p>
          </div>
          <button onclick="closeSuccessModal()" class="w-full py-3 bg-gradient-to-r from-[#076653] to-[#0a8a6e] text-white rounded-xl font-semibold hover:shadow-lg transition">
            Close
          </button>
        </div>
      </div>
      <style>
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.4s ease-out;
        }
      </style>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById("customSuccessModal");
    if (existingModal) existingModal.remove();

    // Add modal to body
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Auto close after 5 seconds
    setTimeout(() => {
      const modal = document.getElementById("customSuccessModal");
      if (modal) modal.remove();
    }, 5000);
  }

  openVisaModal() {
    console.log("🛂 Opening visa modal");
    const modal = document.getElementById("visaModal");
    if (!modal) return;
    const modalContent = modal.querySelector(".modal-popup-content");
    if (!modalContent) return;

    const welcomeScreen = document.getElementById("serviceWelcomeScreen");
    const serviceButtons = document.getElementById("serviceButtons");
    if (welcomeScreen) welcomeScreen.style.display = "none";
    if (serviceButtons) serviceButtons.style.display = "none";

    modalContent.innerHTML = this.getVisaModalHTML();
    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    setTimeout(() => {
      this.initCountryButtons();
      this.initVisaForm();
    }, 100);
  }

  closeVisaModal() {
    console.log("🛂 Closing visa modal");
    const modal = document.getElementById("visaModal");
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    }

    const welcomeScreen = document.getElementById("serviceWelcomeScreen");
    const serviceButtons = document.getElementById("serviceButtons");
    if (welcomeScreen) welcomeScreen.style.display = "block";
    if (serviceButtons) serviceButtons.style.display = "grid";
  }

  getVisaModalHTML() {
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
    return `
      <div class="modal-popup-header">
        <button onclick="window.visaAssistanceManager.closeVisaModal()" class="absolute top-4 right-4 px-4 py-2 bg-gray-800 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center gap-2 border border-white/20">
          <i class="fas fa-times-circle text-sm"></i><span class="text-sm">Close</span>
        </button>
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl">🛂</div>
          <div><h3 class="text-2xl font-bold">Visa Assistance</h3><p class="text-white/80 text-sm">Select your destination country</p></div>
        </div>
      </div>
      <div class="modal-popup-body">
        <p class="text-gray-600 mb-4 text-center">Choose a country to see visa requirements</p>
        <div class="country-grid-popup" id="visaCountryGrid">
          ${countries.map((c) => `<div class="country-popup-btn" data-country="${c.code}"><span class="text-2xl block mb-1">${c.flag}</span><span class="text-xs font-medium">${c.name}</span></div>`).join("")}
        </div>
        <div id="visaRequirementsBox" class="requirements-popup" style="display:none;">
          <h4 id="visaSelectedCountry" class="font-bold text-[#076653] mb-2"><i class="fas fa-clipboard-list"></i> <span>Requirements</span></h4>
          <div id="visaRequirementsList" class="text-sm space-y-2 max-h-60 overflow-y-auto pr-2"></div>
        </div>
        <form id="visaModalForm">
          <input type="text" name="fullName" placeholder="Full Name *" class="input-popup" required>
          <input type="email" name="email" placeholder="Email Address *" class="input-popup" required>
          <input type="tel" name="phone" placeholder="Phone Number *" class="input-popup" required>
          <div class="btn-group-popup">
            <button type="button" class="btn-popup btn-outline-popup" onclick="window.visaAssistanceManager.closeVisaModal()">Cancel</button>
            <button type="submit" class="btn-popup btn-primary-popup">Submit Inquiry</button>
          </div>
        </form>
      </div>
    `;
  }

  initCountryButtons() {
    const btns = document.querySelectorAll("#visaModal .country-popup-btn");
    const reqBox = document.getElementById("visaRequirementsBox");
    const reqList = document.getElementById("visaRequirementsList");
    const selectedSpan = document.querySelector("#visaSelectedCountry span");

    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        btns.forEach((b) =>
          b.classList.remove("selected", "border-[#076653]", "bg-[#f0fdf4]"),
        );
        btn.classList.add("selected", "border-[#076653]", "bg-[#f0fdf4]");
        const country = this.countryRequirements[btn.dataset.country];
        if (country) {
          if (selectedSpan)
            selectedSpan.textContent = `${country.flag} ${country.name} Visa Requirements`;
          let html = "";
          country.requirements.forEach((r) => {
            html += `<li class="flex items-start gap-2 py-1 border-b"><i class="fas fa-check-circle text-green-500 mt-1"></i><span>${r}</span></li>`;
          });
          html += `<li class="flex items-start gap-2 pt-2 mt-2 border-t"><i class="fas fa-clock text-blue-600 mt-1"></i><span><strong>Processing:</strong> ${country.processingTime}</span></li>`;
          html += `<li class="flex items-start gap-2"><i class="fas fa-money-bill-wave text-yellow-600 mt-1"></i><span><strong>Fee:</strong> ${country.fee}</span></li>`;
          html += `<li class="flex items-start gap-2"><i class="fas fa-calendar-check text-purple-600 mt-1"></i><span><strong>Validity:</strong> ${country.validity}</span></li>`;
          reqList.innerHTML = html;
          reqBox.style.display = "block";
        }
      });
    });
  }

  initVisaForm() {
    const form = document.getElementById("visaModalForm");
    if (!form) return;
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    newForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.submitVisaForm();
    });
  }

  async submitVisaForm() {
    const form = document.getElementById("visaModalForm");
    if (!form) return;
    const fd = new FormData(form);
    const selected = document.querySelector(
      "#visaModal .country-popup-btn.selected",
    );

    if (!selected) {
      this.showNotif("Please select a destination country", "error");
      return;
    }

    const countryCode = selected.dataset.country;
    const country = this.countryRequirements[countryCode];

    const inquiry = {
      reference: `VISA-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: fd.get("fullName") || "",
      email: fd.get("email") || "",
      phone: fd.get("phone") || "",
      country: countryCode,
      countryName: country?.name || "Not specified",
      submissionTime: new Date().toISOString(),
      status: "pending",
    };

    if (
      !inquiry.fullName ||
      !inquiry.email ||
      !inquiry.phone ||
      !/^\S+@\S+\.\S+$/.test(inquiry.email)
    ) {
      this.showNotif("Please fill all fields with valid email", "error");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;

    try {
      const saved = await this.saveToSupabase(inquiry);

      if (saved) {
        // Close the visa modal first
        this.closeVisaModal();

        // Show success modal with details
        this.showSuccessModal(inquiry);

        // Reset form
        form.reset();
        document.getElementById("visaRequirementsBox").style.display = "none";
        document
          .querySelectorAll("#visaModal .country-popup-btn")
          .forEach((b) => b.classList.remove("selected"));
      } else {
        this.showNotif("Failed to save inquiry. Please try again.", "error");
      }
    } catch (error) {
      console.error("Submission error:", error);
      this.showNotif("Error submitting inquiry. Please try again.", "error");
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }

  showNotif(msg, type) {
    const notif = document.getElementById("notification");
    if (notif) {
      notif.innerHTML = msg;
      notif.className = `notification ${type}`;
      notif.style.display = "block";
      setTimeout(() => (notif.style.display = "none"), 4000);
    } else {
      alert(msg);
    }
  }
}

// Initialize
if (!window.visaAssistanceManager) {
  window.visaAssistanceManager = new VisaAssistanceManager();
}
console.log("🛂 Visa Assistance Manager ready with Supabase!");
