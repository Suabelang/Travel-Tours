// ============================================
// FERRY ASSISTANCE MODULE - WITH SUCCESS MODAL
// ============================================

class FerryAssistanceManager {
  constructor() {
    this.ferryInquiries = [];
  }

  async saveToSupabase(inquiry) {
    try {
      if (!window.sns_supabase_client) {
        console.error("Supabase client not available");
        return false;
      }

      const { data, error } = await window.sns_supabase_client
        .from("ferry_inquiries")
        .insert([
          {
            reference: inquiry.reference,
            full_name: inquiry.fullName,
            email: inquiry.email,
            phone: inquiry.phone,
            route: inquiry.route,
            inquiry_text: inquiry.inquiryText,
            details: {
              route_name: this.getRouteName(inquiry.route),
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

  getRouteName(route) {
    const routes = {
      boracay: "Boracay - Batangas to Caticlan",
      palawan: "Palawan - Manila to Puerto Princesa",
      cebu: "Cebu - Manila to Cebu City",
      mindoro: "Mindoro - Batangas to Puerto Galera",
    };
    return routes[route] || route;
  }

  showSuccessModal(inquiry) {
    const routeNames = {
      boracay: "Boracay 🏖️",
      palawan: "Palawan 🏝️",
      cebu: "Cebu 🌊",
      mindoro: "Mindoro ⛰️",
    };

    const modalHtml = `
      <div id="customSuccessModal" class="fixed inset-0 bg-black/70 flex items-center justify-center z-[100000] p-4" style="backdrop-filter: blur(8px);">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl transform transition-all animate-fadeInUp">
          <div class="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <i class="fas fa-check-circle text-green-500 text-4xl"></i>
          </div>
          <h3 class="text-2xl font-bold text-green-600 mb-2">Successfully Submitted!</h3>
          <p class="text-gray-600 mb-3">Your ferry inquiry has been received.</p>
          <div class="bg-gray-100 rounded-lg p-3 mb-4">
            <p class="text-xs text-gray-500 mb-1">Reference Number</p>
            <p class="text-sm font-mono font-bold text-[#076653]">${inquiry.reference}</p>
          </div>
          <div class="text-left mb-4">
            <p class="text-sm text-gray-600 mb-2"><i class="fas fa-user mr-2 text-[#f97316]"></i> ${inquiry.fullName}</p>
            <p class="text-sm text-gray-600 mb-2"><i class="fas fa-envelope mr-2 text-[#f97316]"></i> ${inquiry.email}</p>
            <p class="text-sm text-gray-600 mb-2"><i class="fas fa-phone mr-2 text-[#f97316]"></i> ${inquiry.phone}</p>
            <p class="text-sm text-gray-600"><i class="fas fa-ship mr-2 text-[#f97316]"></i> ${routeNames[inquiry.route] || inquiry.route}</p>
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

    const existingModal = document.getElementById("customSuccessModal");
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    setTimeout(() => {
      const modal = document.getElementById("customSuccessModal");
      if (modal) modal.remove();
    }, 5000);
  }

  openFerryModal() {
    console.log("⛴️ Opening ferry modal");
    const modal = document.getElementById("ferryModal");
    if (!modal) return;
    const modalContent = modal.querySelector(".modal-popup-content");
    if (!modalContent) return;

    const welcomeScreen = document.getElementById("serviceWelcomeScreen");
    const serviceButtons = document.getElementById("serviceButtons");
    if (welcomeScreen) welcomeScreen.style.display = "none";
    if (serviceButtons) serviceButtons.style.display = "none";

    modalContent.innerHTML = this.getFerryModalHTML();
    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    setTimeout(() => {
      this.initFerryForm();
    }, 100);
  }

  closeFerryModal() {
    console.log("⛴️ Closing ferry modal");
    const modal = document.getElementById("ferryModal");
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    }

    const welcomeScreen = document.getElementById("serviceWelcomeScreen");
    const serviceButtons = document.getElementById("serviceButtons");
    if (welcomeScreen) welcomeScreen.style.display = "block";
    if (serviceButtons) serviceButtons.style.display = "grid";
  }

  getFerryModalHTML() {
    return `
      <div class="modal-popup-header" style="background: linear-gradient(135deg, #0e7a5c, #0a8a6e);">
        <button onclick="window.ferryAssistanceManager.closeFerryModal()" class="absolute top-4 right-4 px-4 py-2 bg-gray-800 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center gap-2 border border-white/20">
          <i class="fas fa-times-circle text-sm"></i><span class="text-sm">Close</span>
        </button>
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl">⛴️</div>
          <div><h3 class="text-2xl font-bold">Ferry Assistance</h3><p class="text-white/80 text-sm">Need help with ferry travel?</p></div>
        </div>
      </div>
      <div class="modal-popup-body">
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border-l-4 border-[#076653]">
          <div class="flex gap-3">
            <div class="w-10 h-10 bg-[#076653] rounded-lg flex items-center justify-center text-white"><i class="fas fa-ship"></i></div>
            <div><h4 class="font-bold">🚢 Popular Ferry Routes</h4><p class="text-xs text-gray-600">Boracay: Batangas → Caticlan (≈9hrs) | Palawan: Manila → Puerto Princesa (≈20hrs) | Cebu: Manila → Cebu City (≈24hrs) | Mindoro: Batangas → Puerto Galera (≈1hr)</p></div>
          </div>
        </div>
        <form id="ferryModalForm">
          <input type="text" name="fullName" placeholder="Full Name *" class="input-popup" required>
          <input type="email" name="email" placeholder="Email Address *" class="input-popup" required>
          <input type="tel" name="phone" placeholder="Phone Number *" class="input-popup" required>
          <select name="route" class="input-popup" required>
            <option value="">Select Ferry Route *</option>
            <option value="boracay">🏖️ Boracay - Batangas to Caticlan</option>
            <option value="palawan">🏝️ Palawan - Manila to Puerto Princesa</option>
            <option value="cebu">🌊 Cebu - Manila to Cebu City</option>
            <option value="mindoro">⛰️ Mindoro - Batangas to Puerto Galera</option>
          </select>
          <textarea name="inquiry" rows="3" class="input-popup" placeholder="Your Inquiry *" required></textarea>
          <div class="btn-group-popup">
            <button type="button" class="btn-popup btn-outline-popup" onclick="window.ferryAssistanceManager.closeFerryModal()">Cancel</button>
            <button type="submit" class="btn-popup btn-primary-popup">Submit Inquiry</button>
          </div>
        </form>
      </div>
    `;
  }

  initFerryForm() {
    const form = document.getElementById("ferryModalForm");
    if (!form) return;
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    newForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.submitFerryForm();
    });
  }

  async submitFerryForm() {
    const form = document.getElementById("ferryModalForm");
    if (!form) return;
    const fd = new FormData(form);

    const inquiry = {
      reference: `FA-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: fd.get("fullName") || "",
      email: fd.get("email") || "",
      phone: fd.get("phone") || "",
      route: fd.get("route") || "",
      inquiryText: fd.get("inquiry") || "",
      submissionTime: new Date().toISOString(),
      status: "pending",
    };

    if (
      !inquiry.fullName ||
      !inquiry.email ||
      !inquiry.phone ||
      !inquiry.route ||
      !inquiry.inquiryText ||
      !/^\S+@\S+\.\S+$/.test(inquiry.email)
    ) {
      this.showNotif("Please fill all fields correctly", "error");
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
        this.closeFerryModal();
        this.showSuccessModal(inquiry);
        form.reset();
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
if (!window.ferryAssistanceManager) {
  window.ferryAssistanceManager = new FerryAssistanceManager();
}
console.log("⛴️ Ferry Assistance Manager ready with Supabase!");
