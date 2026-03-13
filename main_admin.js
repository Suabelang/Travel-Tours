// =====================================================
// SNS TRAVEL - MAIN ENTRY POINT
// =====================================================

import {
  supabase,
  showToast,
  showLoading,
  hideLoading,
} from "../js/config_admin.js";
import { initNavigation, navigateTo } from "../js/router_admin.js";

async function initApp() {
  console.log("🚀 SNS Travel Admin Dashboard Starting...");

  try {
    // Double-check auth before initializing
    const isLoggedIn = localStorage.getItem("sns_admin_logged_in") === "true";
    const userEmail = localStorage.getItem("sns_admin_email");
    const expires = localStorage.getItem("session_expires");

    // Check expiration
    if (expires && Date.now() > parseInt(expires)) {
      console.warn("Session expired");
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "login.html";
      return;
    }

    if (!isLoggedIn || !userEmail) {
      window.location.href = "login.html";
      return;
    }

    initNavigation();
    await navigateTo("dashboard");
    console.log("✅ Admin Dashboard Ready!");
    showToast("✨ SNS Travel Admin is ready!", "success");
  } catch (error) {
    console.error("❌ Failed to initialize app:", error);
    showToast("Failed to initialize application", "error");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
