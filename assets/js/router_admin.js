// =====================================================
// SNS TRAVEL - ROUTER (PRODUCTION VERSION - NO TESTING)
// =====================================================

import {
  state,
  showLoading,
  hideLoading,
  showToast,
  supabase,
} from "./config_admin.js";

const titleMap = {
  dashboard: "Dashboard",
  destinations: "Destinations",
  bookings: "Bookings",
};

const modulePaths = {
  dashboard: "./dashboard.js",
  destinations: "./destinations.js",
  bookings: "./bookings.js",
};

const moduleCache = new Map();
let currentNavigationPromise = null;
let lastNavigatedPage = null;
let lastNavigatedTime = 0;

function updateActiveNav(page) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("nav-active", "text-white", "bg-emerald-600");
    item.classList.add("text-gray-600");

    if (item.dataset.page === page) {
      item.classList.add("nav-active", "text-white", "bg-emerald-600");
      item.classList.remove("text-gray-600");
    }
  });
}

// ===== SESSION CHECK =====
function checkSession() {
  const isLoggedIn = localStorage.getItem("sns_admin_logged_in") === "true";
  const expires = localStorage.getItem("session_expires");

  if (!isLoggedIn || (expires && Date.now() > parseInt(expires))) {
    console.warn("Session expired or not logged in");
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// ===== PARSE HASH WITH TOKEN DETECTION =====
function parseHash() {
  let hash = window.location.hash.slice(1); // remove '#'

  // If hash is empty, go to dashboard
  if (!hash) return { page: "dashboard", action: null, id: null };

  // Check if hash looks like a token (long random string with no slashes)
  if (hash.length > 30 && !hash.includes("/")) {
    console.log("🔑 Detected token in hash, redirecting to dashboard");

    // Clear the hash to prevent future issues
    history.replaceState(null, null, window.location.pathname);

    return { page: "dashboard", action: null, id: null };
  }

  const parts = hash.split("/");
  const page = parts[0] || "dashboard";
  const action = parts[1] || null;
  const id = parts[2] ? parseInt(parts[2]) : null;

  // Validate that page is one of the valid pages
  if (!titleMap[page]) {
    console.warn(`⚠️ Invalid page in hash: ${page}, redirecting to dashboard`);
    return { page: "dashboard", action: null, id: null };
  }

  return { page, action, id };
}

export async function navigateTo(page, action = null, id = null) {
  // Check session first
  if (!checkSession()) return;

  // PREVENT DUPLICATE NAVIGATION - same page within 2 seconds
  const now = Date.now();
  if (page === lastNavigatedPage && now - lastNavigatedTime < 2000) {
    console.log(`⏭️ Skipping duplicate navigation to ${page}`);
    return;
  }

  // Cancel previous navigation if still pending
  if (currentNavigationPromise) {
    console.log("Cancelling previous navigation");
  }

  console.log(`Navigating to: ${page}`, action || "", id || "");

  // Update last navigation tracking
  lastNavigatedPage = page;
  lastNavigatedTime = now;

  state.currentPage = page;
  state.currentAction = action;
  state.currentId = id;

  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) pageTitle.textContent = titleMap[page] || "Dashboard";

  updateActiveNav(page);

  const mainContent = document.getElementById("mainContent");
  if (!mainContent) return;

  // Show loading
  showLoading(true, `Loading ${titleMap[page] || page}...`);

  // Clear content immediately to show loading state
  mainContent.innerHTML = `
    <div class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mb-4"></div>
        <p class="text-gray-500">Loading ${titleMap[page] || page}...</p>
      </div>
    </div>
  `;

  // Create navigation promise
  const navigationPromise = (async () => {
    try {
      const modulePath = modulePaths[page];
      if (!modulePath) throw new Error(`No module found for page: ${page}`);

      let module = moduleCache.get(modulePath);
      if (!module) {
        module = await import(modulePath);
        moduleCache.set(modulePath, module);
      }

      let html;
      const renderFunc =
        module[`render${page.charAt(0).toUpperCase() + page.slice(1)}`];

      if (!renderFunc) throw new Error(`No render function for ${page}`);

      html = await renderFunc();

      // Check if this is still the current navigation
      if (currentNavigationPromise === navigationPromise) {
        mainContent.innerHTML = html;

        // Update URL hash only for valid pages
        let hash = page;
        if (action) hash += `/${action}`;
        if (id) hash += `/${id}`;

        // Only update hash if it's different and valid
        const currentHash = window.location.hash.slice(1);
        if (currentHash !== hash && page !== "dashboard") {
          window.location.hash = hash;
        } else if (page === "dashboard" && window.location.hash) {
          // Clear hash for dashboard
          history.replaceState(null, null, window.location.pathname);
        }

        hideLoading();
        console.log(`✅ Page loaded: ${page}`);
      } else {
        console.log(`⏭️ Navigation to ${page} was superseded`);
      }
    } catch (error) {
      console.error(`Error rendering ${page}:`, error);

      // Check if this is still the current navigation
      if (currentNavigationPromise === navigationPromise) {
        hideLoading();

        mainContent.innerHTML = `
          <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 mt-12">
            <div class="text-center">
              <div class="inline-flex items-center justify-center h-20 w-20 bg-red-100 rounded-full mb-4">
                <i class="fas fa-exclamation-triangle text-3xl text-red-600"></i>
              </div>
              <h3 class="text-xl font-bold text-gray-800 mb-2">Error Loading Page</h3>
              <p class="text-gray-600 mb-4">${error.message}</p>
              <button onclick="window.location.reload()" class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                <i class="fas fa-sync-alt mr-2"></i> Reload
              </button>
            </div>
          </div>
        `;
      }
    }
  })();

  currentNavigationPromise = navigationPromise;
  return navigationPromise;
}

// ===== LOGOUT FUNCTION =====
export async function logout() {
  try {
    showLoading(true, "Logging out...");

    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Clear ALL session data
    sessionStorage.clear();

    localStorage.removeItem("sns_admin_logged_in");
    localStorage.removeItem("sns_admin_email");
    localStorage.removeItem("sns_admin_name");
    localStorage.removeItem("sns_admin_token");
    localStorage.removeItem("session_expires");
    localStorage.removeItem("last_activity");
    localStorage.removeItem("rememberedEmail");
    localStorage.removeItem("supabase_session");

    showLoading(false);
    showToast("Logged out successfully!", "success");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
  } catch (error) {
    console.error("Logout error:", error);
    showLoading(false);
    showToast("Error logging out", "error");
  }
}

// Flag para maiwasan ang double init
let navigationInitialized = false;

export function initNavigation() {
  // Prevent double initialization
  if (navigationInitialized) {
    console.log("Navigation already initialized, skipping...");
    return;
  }

  console.log("Initializing navigation...");
  navigationInitialized = true;

  // Check for dashboard token in sessionStorage (optional)
  const dashboardToken = sessionStorage.getItem("dashboard_token");
  if (dashboardToken) {
    console.log("✅ Dashboard token found in sessionStorage");
    // You can validate the token here if needed
  }

  // Read initial page from hash with token detection
  const { page: initialPage, action, id } = parseHash();

  // Navigation links
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      if (page && page !== state.currentPage) {
        navigateTo(page);
      }
    });
  });

  // Browser back/forward buttons - debounced
  let hashChangeTimeout;
  window.addEventListener("hashchange", () => {
    clearTimeout(hashChangeTimeout);
    hashChangeTimeout = setTimeout(() => {
      const { page, action, id } = parseHash();
      if (page !== state.currentPage) {
        navigateTo(page, action, id);
      }
    }, 100);
  });

  // Refresh button
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      if (state.currentPage) {
        navigateTo(state.currentPage);
      }
    });
  }

  // Logout buttons
  const logoutBtn = document.getElementById("logoutBtn");
  const dropdownLogout = document.getElementById("dropdownLogout");

  [logoutBtn, dropdownLogout].forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (confirm("Are you sure you want to logout?")) {
          logout();
        }
      });
    }
  });

  // User menu dropdown toggle
  const userMenuBtn = document.getElementById("userMenuBtn");
  if (userMenuBtn) {
    userMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const dropdown = document.getElementById("userDropdown");
      if (dropdown) {
        dropdown.classList.toggle("hidden");
      }
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    const btn = document.getElementById("userMenuBtn");
    const dropdown = document.getElementById("userDropdown");
    if (
      btn &&
      dropdown &&
      !btn.contains(e.target) &&
      !dropdown.contains(e.target)
    ) {
      dropdown.classList.add("hidden");
    }
  });

  // Notification button
  const notificationBtn = document.getElementById("notificationBtn");
  if (notificationBtn) {
    notificationBtn.addEventListener("click", () => {
      showToast("No new notifications", "info");
    });
  }

  // Quick upload button
  const quickUploadBtn = document.getElementById("quickUploadBtn");
  if (quickUploadBtn) {
    quickUploadBtn.addEventListener("click", () => {
      navigateTo("destinations").then(() => {
        setTimeout(() => {
          showToast("Click on any destination card to upload photos!", "info");
        }, 500);
      });
    });
  }

  // Update user display name from localStorage
  const userName = localStorage.getItem("sns_admin_name") || "Admin";

  const userMenuText = document.querySelector(
    "#userMenuBtn span.text-sm.font-medium",
  );
  if (userMenuText) {
    userMenuText.textContent = userName;
  }

  const userAvatar = document.querySelector("#userMenuBtn div.h-8.w-8 span");
  if (userAvatar) {
    userAvatar.textContent = userName.charAt(0).toUpperCase();
  }

  // Navigate to initial page
  setTimeout(() => {
    navigateTo(initialPage, action, id);
  }, 150);
}

// Make functions globally available
window.navigateTo = navigateTo;
window.logout = logout;
