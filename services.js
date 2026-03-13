// ============================================
// SERVICES MODULE - Connects ferry and visa assistance
// ============================================

const services = {
  init() {
    this.setupServiceButtons();
  },

  setupServiceButtons() {
    // Visa Assistance button
    const visaBtn = document.querySelector('[onclick="openVisaModal()"]');
    if (visaBtn) {
      visaBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (window.visaAssistanceManager) {
          window.visaAssistanceManager.openVisaModal();
        } else {
          console.error("Visa Assistance Manager not initialized");
        }
      });
    }

    // Ferry Assistance button
    const ferryBtn = document.querySelector('[onclick="openFerryModal()"]');
    if (ferryBtn) {
      ferryBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (window.ferryAssistanceManager) {
          window.ferryAssistanceManager.openFerryModal();
        } else {
          console.error("Ferry Assistance Manager not initialized");
        }
      });
    }
  },

  // Open visa modal (global function)
  openVisaModal() {
    if (window.visaAssistanceManager) {
      window.visaAssistanceManager.openVisaModal();
    }
  },

  // Close visa modal
  closeVisaModal() {
    if (window.visaAssistanceManager) {
      window.visaAssistanceManager.closeVisaModal();
    }
  },

  // Open ferry modal
  openFerryModal() {
    if (window.ferryAssistanceManager) {
      window.ferryAssistanceManager.openFerryModal();
    }
  },

  // Close ferry modal
  closeFerryModal() {
    if (window.ferryAssistanceManager) {
      window.ferryAssistanceManager.closeFerryModal();
    }
  },
};

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  services.init();
});

// Make functions globally available
window.services = services;
window.openVisaModal = () => services.openVisaModal();
window.closeVisaModal = () => services.closeVisaModal();
window.openFerryModal = () => services.openFerryModal();
window.closeFerryModal = () => services.closeFerryModal();

console.log(
  "✅ Services module loaded - Connected to visa and ferry assistance",
);
