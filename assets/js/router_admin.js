// Simple Router for Admin Dashboard
console.log("✅ router-admin.js loaded");

const Router = {
  currentPage: "dashboard",

  // Initialize router
  init: function () {
    console.log("Router initializing...");
    this.bindNavigation();
    this.loadPage("dashboard");
  },

  // Bind navigation clicks
  bindNavigation: function () {
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const page = e.currentTarget.dataset.page;
        this.goTo(page);
      });
    });
  },

  // Navigate to page
  goTo: function (page) {
    this.loadPage(page);
  },

  // Load page component
  loadPage: function (page) {
    this.currentPage = page;

    // Update active state in navigation
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("bg-primary-700/50", "text-white");
      link.classList.add("text-primary-100");

      if (link.dataset.page === page) {
        link.classList.remove("text-primary-100");
        link.classList.add("bg-primary-700/50", "text-white");
      }
    });

    // Update page title
    const titles = {
      dashboard: "Dashboard",
      bookings: "Bookings Management",
      destinations: "Destinations & Packages",
      packages: "Package Management",
      hotels: "Hotel Management",
      config: "System Settings",
    };

    const titleElement = document.getElementById("page-title");
    if (titleElement) {
      titleElement.textContent = titles[page] || "Dashboard";
    }

    // Load component
    this.loadComponent(page);
  },

  // Load specific component
  loadComponent: function (page) {
    if (!SupabaseService.isInitialized) {
      console.warn("Supabase not initialized, using mock data");
    }

    switch (page) {
      case "dashboard":
        if (typeof Dashboard !== "undefined") {
          Dashboard.load();
        } else {
          this.showError("Dashboard module not loaded");
        }
        break;
      case "destinations":
        if (typeof Destinations !== "undefined") {
          Destinations.load();
        } else {
          this.showError("Destinations module not loaded");
        }
        break;
      case "bookings":
        this.showPlaceholder("Bookings");
        break;
      case "packages":
        this.showPlaceholder("Packages");
        break;
      case "hotels":
        this.showPlaceholder("Hotels");
        break;
      case "config":
        this.showPlaceholder("Settings");
        break;
      default:
        if (typeof Dashboard !== "undefined") {
          Dashboard.load();
        }
    }
  },

  // Placeholder for unimplemented pages
  showPlaceholder: function (pageName) {
    const content = document.getElementById("main-content");
    content.innerHTML = `
            <div class="flex items-center justify-center min-h-[400px]">
                <div class="text-center">
                    <i class="fas fa-tools text-6xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">${pageName} Module</h3>
                    <p class="text-gray-500">This section is under construction</p>
                    <button onclick="Router.goTo('dashboard')" class="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        `;
  },

  // Show error message
  showError: function (message) {
    const content = document.getElementById("main-content");
    content.innerHTML = `
            <div class="flex items-center justify-center min-h-[400px]">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-6xl text-red-400 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">Error</h3>
                    <p class="text-gray-500">${message}</p>
                    <button onclick="Router.goTo('dashboard')" class="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        `;
  },

  // Get current page
  getCurrentPage: function () {
    return this.currentPage;
  },
};
