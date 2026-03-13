// ============================================
// MAIN INITIALIZATION - COMPLETE VERSION
// ============================================

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
      // Check if we're on the admin dashboard page
      const isDashboardPage =
        window.location.pathname.includes("dashboard.html");

      if (isDashboardPage) {
        updateUIForLoggedInUser(user);
      } else {
        // On main site, ALWAYS show login button, never user info
        resetToLoginButtons();
      }
    } else {
      console.log("👤 No user logged in");
      // Make sure login buttons are visible on main site
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
    loginBtn.onclick = null; // Remove any custom onclick
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
      notificationManager.success("Logged out successfully!");
      menu.remove();
      location.reload();
    } catch (error) {
      notificationManager.error("Logout failed: " + error.message);
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

// Initialize everything
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Initializing application...");
  initAOS();
  await checkUserSession();

  if (destinationsManager) {
    await destinationsManager.loadDestinations();
  }

  console.log("✅ Application ready!");
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    carouselManager?.stopAutoPlay();
  } else {
    carouselManager?.startAutoPlay();
  }
});

console.log("✅ Main loaded");
