// ============================================
// SERVICES MODULE - COMPLETE FIXED VERSION
// ============================================

const Services = {
  // Initialize
  init() {
    console.log("🚀 SERVICES: Initializing...");
    this.removeAllConflicts();
    this.setupButtons();
    this.setupGlobalFunctions();
  },

  // Remove all conflicting event handlers
  removeAllConflicts() {
    console.log("🧹 SERVICES: Removing conflicts...");

    // Remove all onclick attributes from service cards and buttons
    document
      .querySelectorAll(
        '.group, .group button, [onclick*="Visa"], [onclick*="Ferry"]',
      )
      .forEach((el) => {
        el.removeAttribute("onclick");
        el.removeAttribute("onclick"); // Twice to be sure
      });
  },

  // Setup buttons with proper handlers
  setupButtons() {
    console.log("🔧 SERVICES: Setting up buttons...");

    // Find all service cards
    const cards = document.querySelectorAll(".group");

    cards.forEach((card) => {
      const text = card.textContent || "";
      const html = card.innerHTML || "";

      // Visa Assistance Card
      if (text.includes("Visa Assistance") || html.includes("🛂")) {
        this.setupVisaCard(card);
      }

      // Ferry Assistance Card
      if (text.includes("Ferry Assistance") || html.includes("⛴️")) {
        this.setupFerryCard(card);
      }
    });
  },

  // Setup Visa card
  setupVisaCard(card) {
    console.log("🛂 SERVICES: Setting up Visa card");

    // Card click
    card.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openVisaModal();
    };

    // Button inside card
    const button = card.querySelector("button");
    if (button) {
      button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.openVisaModal();
      };
    }
  },

  // Setup Ferry card
  setupFerryCard(card) {
    console.log("⛴️ SERVICES: Setting up Ferry card");

    // Card click
    card.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openFerryModal();
    };

    // Button inside card
    const button = card.querySelector("button");
    if (button) {
      button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.openFerryModal();
      };
    }
  },

  // Setup global functions
  setupGlobalFunctions() {
    console.log("🌍 SERVICES: Setting up global functions");

    // Override global functions
    window.openVisaModal = () => this.openVisaModal();
    window.closeVisaModal = () => this.closeVisaModal();
    window.openFerryModal = () => this.openFerryModal();
    window.closeFerryModal = () => this.closeFerryModal();

    // Add utility functions
    window.fixServices = () => this.init();
  },

  // Open Visa Modal
  openVisaModal() {
    console.log("🛂 Opening Visa Modal");

    // Hide welcome screen and buttons
    const welcomeScreen = document.getElementById("serviceWelcomeScreen");
    const serviceButtons = document.getElementById("serviceButtons");

    if (welcomeScreen) welcomeScreen.style.display = "none";
    if (serviceButtons) serviceButtons.style.display = "none";

    // Try all possible methods
    if (window.visaAssistanceManager?.openVisaModal) {
      console.log("✅ Using visaAssistanceManager");
      window.visaAssistanceManager.openVisaModal();
    } else if (window.VisaAssistanceManager) {
      console.log("✅ Creating new VisaAssistanceManager");
      const manager = new window.VisaAssistanceManager();
      window.visaAssistanceManager = manager;
      manager.openVisaModal();
    } else {
      console.log("⚠️ Using fallback method");
      this.showVisaModalFallback();
    }
  },

  // Close Visa Modal
  closeVisaModal() {
    console.log("🛂 Closing Visa Modal");

    const modal = document.getElementById("visaModal");
    const welcomeScreen = document.getElementById("serviceWelcomeScreen");
    const serviceButtons = document.getElementById("serviceButtons");

    if (modal) {
      modal.style.display = "none";
      modal.classList.remove("active");
    }

    if (welcomeScreen) welcomeScreen.style.display = "block";
    if (serviceButtons) serviceButtons.style.display = "grid";
    document.body.style.overflow = "";

    // Try using manager
    if (window.visaAssistanceManager?.closeVisaModal) {
      window.visaAssistanceManager.closeVisaModal();
    }
  },

  // Open Ferry Modal
  openFerryModal() {
    console.log("⛴️ Opening Ferry Modal");

    // Hide welcome screen and buttons
    const welcomeScreen = document.getElementById("serviceWelcomeScreen");
    const serviceButtons = document.getElementById("serviceButtons");

    if (welcomeScreen) welcomeScreen.style.display = "none";
    if (serviceButtons) serviceButtons.style.display = "none";

    // Try all possible methods
    if (window.ferryAssistanceManager?.openFerryModal) {
      console.log("✅ Using ferryAssistanceManager");
      window.ferryAssistanceManager.openFerryModal();
    } else if (window.FerryAssistanceManager) {
      console.log("✅ Creating new FerryAssistanceManager");
      const manager = new window.FerryAssistanceManager();
      window.ferryAssistanceManager = manager;
      manager.openFerryModal();
    } else {
      console.log("⚠️ Using fallback method");
      this.showFerryModalFallback();
    }
  },

  // Close Ferry Modal
  closeFerryModal() {
    console.log("⛴️ Closing Ferry Modal");

    const modal = document.getElementById("ferryModal");
    const welcomeScreen = document.getElementById("serviceWelcomeScreen");
    const serviceButtons = document.getElementById("serviceButtons");

    if (modal) {
      modal.style.display = "none";
      modal.classList.remove("active");
    }

    if (welcomeScreen) welcomeScreen.style.display = "block";
    if (serviceButtons) serviceButtons.style.display = "grid";
    document.body.style.overflow = "";

    // Try using manager
    if (window.ferryAssistanceManager?.closeFerryModal) {
      window.ferryAssistanceManager.closeFerryModal();
    }
  },

  // Fallback for Visa Modal
  showVisaModalFallback() {
    console.log("⚠️ Using Visa fallback");

    const modal = document.getElementById("visaModal");
    if (!modal) {
      console.error("❌ Visa modal not found");
      return;
    }

    modal.style.display = "flex";
    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    // Create country buttons if needed
    const grid = document.getElementById("visaCountryGrid");
    if (grid && grid.children.length === 0) {
      this.createCountryButtons(grid);
    }
  },

  // Fallback for Ferry Modal
  showFerryModalFallback() {
    console.log("⚠️ Using Ferry fallback");

    const modal = document.getElementById("ferryModal");
    if (!modal) {
      console.error("❌ Ferry modal not found");
      return;
    }

    modal.style.display = "flex";
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  },

  // Create country buttons (fallback)
  createCountryButtons(grid) {
    const countries = [
      { code: "usa", flag: "🇺🇸", name: "USA" },
      { code: "canada", flag: "🇨🇦", name: "Canada" },
      { code: "japan", flag: "🇯🇵", name: "Japan" },
      { code: "korea", flag: "🇰🇷", name: "Korea" },
      { code: "australia", flag: "🇦🇺", name: "Australia" },
      { code: "uk", flag: "🇬🇧", name: "UK" },
    ];

    grid.innerHTML = countries
      .map(
        (c) => `
      <div class="country-popup-btn" onclick="selectCountry(this)" data-country="${c.code}">
        <span class="text-2xl block mb-1">${c.flag}</span>
        <span class="text-xs font-medium">${c.name}</span>
      </div>
    `,
      )
      .join("");
  },

  // Debug function
  debug() {
    console.log("🔍 SERVICES DEBUG:");
    console.log("- visaAssistanceManager:", !!window.visaAssistanceManager);
    console.log("- ferryAssistanceManager:", !!window.ferryAssistanceManager);
    console.log("- visaModal:", !!document.getElementById("visaModal"));
    console.log("- ferryModal:", !!document.getElementById("ferryModal"));
    console.log(
      "- welcomeScreen:",
      !!document.getElementById("serviceWelcomeScreen"),
    );
    console.log(
      "- serviceButtons:",
      !!document.getElementById("serviceButtons"),
    );

    const cards = document.querySelectorAll(".group");
    console.log(`- Service cards found: ${cards.length}`);

    return "Debug complete";
  },
};

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Small delay to ensure other scripts load first
  setTimeout(() => {
    Services.init();
    Services.debug();
  }, 300);
});

// Make available globally
window.Services = Services;
