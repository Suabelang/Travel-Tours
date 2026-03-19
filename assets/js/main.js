// ============================================
// MAIN INITIALIZATION - COMPLETE VERSION
// ============================================

// ✅ SIGURADUHING ISA LANG ANG DECLARATION
if (typeof window.destinationsManager === "undefined") {
  var destinationsManager;
}

// ✅ TANGGALIN ANG carouselManager DECLARATION - nasa carousel.js na yan!

function initAOS() {
  if (typeof AOS !== "undefined") {
    AOS.init({ duration: 1000, once: true, offset: 100 });
    console.log("✅ AOS initialized");
  }
}

// Check if user is logged in - BUT ONLY FOR ADMIN DASHBOARD
async function checkUserSession() {
  try {
    const {
      data: { user },
    } = await sns_supabase_client.auth.getUser();

    if (user) {
      console.log("✅ User logged in:", user.email);

      // FIX: Only show user info on dashboard pages, not on main site
      const isDashboardPage =
        window.location.pathname.includes("dashboard.html");

      if (isDashboardPage) {
        updateUIForLoggedInUser(user);
      } else {
        resetToLoginButtons();
      }
    } else {
      console.log("👤 No user logged in");
      resetToLoginButtons();
    }
  } catch (error) {
    console.log("⚠️ Session check failed:", error.message);
    resetToLoginButtons();
  }
}

// Reset buttons to login state (for main site)
function resetToLoginButtons() {
  const loginBtn = document.getElementById("loginButton");
  if (loginBtn) {
    loginBtn.innerHTML =
      '<i class="fas fa-sign-in-alt"></i> <span>Login</span>';
    loginBtn.href = "login.html";
    loginBtn.onclick = null;
  }

  const mobileLogin = document.getElementById("mobileLoginButton");
  if (mobileLogin) {
    mobileLogin.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    mobileLogin.href = "login.html";
    mobileLogin.onclick = null;
  }
}

// Update UI for logged in user (ONLY FOR DASHBOARD)
function updateUIForLoggedInUser(user) {
  const userName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Account";

  const loginBtn = document.getElementById("loginButton");
  if (loginBtn) {
    loginBtn.innerHTML = `<i class="fas fa-user-circle"></i><span>${userName}</span>`;
    loginBtn.href = "#";
    loginBtn.onclick = (e) => {
      e.preventDefault();
      showUserMenu(e.currentTarget, user);
    };
  }

  const mobileLogin = document.getElementById("mobileLoginButton");
  if (mobileLogin) {
    mobileLogin.innerHTML = `<i class="fas fa-user-circle"></i> ${userName}`;
    mobileLogin.href = "#";
    mobileLogin.onclick = (e) => {
      e.preventDefault();
      showUserMenu(e.currentTarget, user);
    };
  }
}

// Show user dropdown menu (ONLY FOR DASHBOARD)
function showUserMenu(element, user) {
  const existingMenu = document.querySelector(".user-menu");
  if (existingMenu) existingMenu.remove();

  const menu = document.createElement("div");
  menu.className = "user-menu";
  menu.innerHTML = `
        <div class="user-menu-header">
            <div class="user-menu-name">${user.user_metadata?.full_name || "User"}</div>
            <div class="user-menu-email">${user.email}</div>
        </div>
        <button class="user-menu-item logout-btn" id="logoutBtn">
            <i class="fas fa-sign-out-alt"></i> Logout
        </button>
    `;

  const rect = element.getBoundingClientRect();
  menu.style.position = "absolute";
  menu.style.top = rect.bottom + window.scrollY + 5 + "px";
  menu.style.right = window.innerWidth - rect.right + "px";

  document.body.appendChild(menu);

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
      const { error } = await sns_supabase_client.auth.signOut();
      if (error) throw error;

      if (
        typeof notificationManager !== "undefined" &&
        notificationManager.success
      ) {
        notificationManager.success("Logged out successfully!");
      } else {
        alert("Logged out successfully!");
      }

      menu.remove();
      location.reload();
    } catch (error) {
      if (
        typeof notificationManager !== "undefined" &&
        notificationManager.error
      ) {
        notificationManager.error("Logout failed: " + error.message);
      } else {
        alert("Logout failed: " + error.message);
      }
    }
  });

  setTimeout(() => {
    document.addEventListener("click", function closeMenu(e) {
      if (!menu.contains(e.target) && !element.contains(e.target)) {
        menu.remove();
        document.removeEventListener("click", closeMenu);
      }
    });
  }, 100);
}

// ✅ MAIN INITIALIZATION
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Initializing application...");
  initAOS();
  await checkUserSession();

  // ✅ CHECK KUNG MAY DESTINATIONS GRID
  const hasDestinationsGrid = document.getElementById("destinationsGrid");

  if (hasDestinationsGrid) {
    // Wait for tours.js to load
    setTimeout(() => {
      if (window.destinationsManager) {
        destinationsManager = window.destinationsManager;
        console.log("✅ Using existing destinationsManager from window");

        if (destinationsManager.loadDestinations) {
          destinationsManager.loadDestinations();
        }
      } else {
        console.log("⚠️ destinationsManager not available yet");
      }
    }, 1000);
  } else {
    console.log("⏭️ No destinations grid on this page");
  }

  console.log("✅ Application ready!");
});

// ✅ VISIBILITY CHANGE - GAMITIN ANG window.carouselManager
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (window.carouselManager && window.carouselManager.stopAutoPlay) {
      window.carouselManager.stopAutoPlay();
    }
  } else {
    if (window.carouselManager && window.carouselManager.startAutoPlay) {
      window.carouselManager.startAutoPlay();
    }
  }
});

console.log("✅ Main loaded");
