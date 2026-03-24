// ============================================
// CONFIG-ADMIN.JS - COMPLETE VERSION (NO NEED CONFIG.JS)
// ============================================

console.log("✅ config-admin.js loading...");

// Supabase Configuration
const SUPABASE_URL = "https://rpapduavenpzwtptgopm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYXBkdWF2ZW5wend0cHRnb3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NTI5NDUsImV4cCI6MjA4NjMyODk0NX0.IVTVByGm8LuykvYQ5wRzK4WBT1mA9Ew5fy6uTjokMbg";

// ============================================
// INITIALIZE SUPABASE CLIENT - DITO NA!
// ============================================

// Check if supabase library is loaded
if (typeof supabase === "undefined") {
  console.error(
    "❌ Supabase library not loaded! Add: <script src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'></script>",
  );
} else {
  // Initialize global supabase client
  if (!window.supabaseClient) {
    console.log("🚀 Initializing Supabase client from config-admin...");
    window.supabaseClient = supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      },
    );
    window.sns_supabase_client = window.supabaseClient;
    console.log("✅ Supabase client ready!");
  }
}

// ============================================
// CONFIG OBJECT
// ============================================

const Config = {
  appName: "TravelB2B Admin",
  version: "1.0.0",

  supabase: {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    client: window.supabaseClient,
  },

  theme: {
    primary: "#22c55e",
    secondary: "#16a34a",
    accent: "#15803d",
  },

  navigation: [
    { id: "dashboard", name: "Dashboard", icon: "chart-pie" },
    { id: "destinations", name: "Destinations", icon: "map-marked-alt" },
    { id: "bookings", name: "Bookings", icon: "calendar-check" },
  ],

  bookingStatuses: ["pending", "confirmed", "paid", "cancelled"],
  paymentStatuses: ["unpaid", "partial", "paid", "refunded"],

  tables: {
    bookings: { tableName: "b2b_bookings" },
    destinations: { tableName: "destinations" },
    packages: { tableName: "destination_packages" },
    hotels: { tableName: "hotels" },
    hotelCategories: { tableName: "hotel_categories" },
    packageRates: { tableName: "package_hotel_rates" },
    optionalTourCategories: { tableName: "optional_tour_categories" },
    optionalTourRates: { tableName: "optional_tour_rates" },
  },

  init: function () {
    console.log(`${this.appName} v${this.version} initializing...`);
    this.supabase.client = window.supabaseClient;
    this.loadUserSession();
    this.setupGlobalFunctions();
  },

  loadUserSession: function () {
    const userStr = sessionStorage.getItem("user");
    if (userStr) {
      try {
        window.currentUser = JSON.parse(userStr);
      } catch (e) {
        window.currentUser = {
          id: 1,
          name: "Admin User",
          email: "admin@travelb2b.com",
          role: "super_admin",
        };
      }
    } else {
      window.currentUser = {
        id: 1,
        name: "Admin User",
        email: "admin@travelb2b.com",
        role: "super_admin",
      };
    }
  },

  setupGlobalFunctions: function () {
    window.formatCurrency = this.formatCurrency.bind(this);
    window.formatDate = this.formatDate.bind(this);
    window.showToast = this.showToast.bind(this);
    window.showLoading = this.showLoading.bind(this);
    window.hideLoading = this.hideLoading.bind(this);
    window.showConfirmDialog = this.showConfirmDialog.bind(this);
    window.showSuccessModal = this.showSuccessModal.bind(this);
  },

  formatCurrency: function (amount) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  },

  formatDate: function (date) {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  },

  showToast: function (message, type = "success") {
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      toastContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement("div");
    let bgGradient, icon, borderColor;

    switch (type) {
      case "success":
        bgGradient = "from-green-500 to-green-600";
        icon = "fa-check-circle";
        borderColor = "#10b981";
        break;
      case "error":
        bgGradient = "from-red-500 to-red-600";
        icon = "fa-exclamation-circle";
        borderColor = "#ef4444";
        break;
      case "warning":
        bgGradient = "from-yellow-500 to-yellow-600";
        icon = "fa-exclamation-triangle";
        borderColor = "#f59e0b";
        break;
      default:
        bgGradient = "from-blue-500 to-blue-600";
        icon = "fa-info-circle";
        borderColor = "#3b82f6";
    }

    toast.style.cssText = `
      min-width: 280px;
      max-width: 380px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
      pointer-events: auto;
      overflow: hidden;
      border-left: 4px solid ${borderColor};
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s ease;
    `;

    toast.innerHTML = `
      <div class="flex items-start p-4">
        <div class="flex-shrink-0">
          <div class="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r ${bgGradient} text-white">
            <i class="fas ${icon} text-sm"></i>
          </div>
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium text-gray-800 leading-relaxed">${message}</p>
        </div>
        <button class="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors toast-close-btn">
          <i class="fas fa-times text-xs"></i>
        </button>
      </div>
      <div class="h-1 bg-gray-100 w-full">
        <div class="h-full ${type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : type === "warning" ? "bg-yellow-500" : "bg-blue-500"}" style="width: 100%; animation: progressBar 3s linear forwards;"></div>
      </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.transform = "translateX(0)";
      toast.style.opacity = "1";
    }, 10);

    const closeBtn = toast.querySelector(".toast-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        toast.style.transform = "translateX(100%)";
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
      });
    }

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.transform = "translateX(100%)";
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
      }
    }, 3000);
  },

  showLoading: function (show, message = "Loading...") {
    let loader = document.getElementById("global-loader");

    if (show && !loader) {
      loader = document.createElement("div");
      loader.id = "global-loader";
      loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 16px;
      `;
      loader.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
          <p class="text-gray-700 font-medium">${message}</p>
        </div>
      `;
      document.body.appendChild(loader);
    } else if (!show && loader) {
      loader.remove();
    } else if (show && loader) {
      const msgEl = loader.querySelector("p");
      if (msgEl) msgEl.textContent = message;
    }
  },

  hideLoading: function () {
    const loader = document.getElementById("global-loader");
    if (loader) loader.remove();
  },

  showConfirmDialog: function (
    message,
    onConfirm,
    confirmText = "Yes",
    cancelText = "Cancel",
  ) {
    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm";
    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl transform transition-all">
        <div class="text-center">
          <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-exclamation-triangle text-amber-600 text-2xl"></i>
          </div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">Confirm Action</h3>
          <p class="text-sm text-gray-600 mb-6">${message}</p>
          <div class="flex gap-3">
            <button class="confirm-btn flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
              ${confirmText}
            </button>
            <button class="cancel-btn flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
              ${cancelText}
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector(".confirm-btn").addEventListener("click", () => {
      modal.remove();
      if (onConfirm) onConfirm();
    });
    modal
      .querySelector(".cancel-btn")
      .addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
  },

  showSuccessModal: function (message, title = "Success!") {
    const existingModal = document.getElementById("custom-success-modal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "custom-success-modal";
    modal.className =
      "fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm";
    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl transform transition-all animate-fade-in-up">
        <div class="text-center">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-check-circle text-green-600 text-3xl"></i>
          </div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">${title}</h3>
          <p class="text-gray-600 mb-6">${message}</p>
          <button onclick="this.closest('#custom-success-modal').remove()" 
                  class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
            Close
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    setTimeout(() => {
      if (modal.parentNode) modal.remove();
    }, 3000);
  },
};

// ============================================
// SUPABASE SERVICE (DEPENDE SA window.supabaseClient)
// ============================================

const SupabaseService = {
  client: window.supabaseClient,
  isInitialized: !!window.supabaseClient,

  init: async function (url, anonKey) {
    if (this.client) {
      console.log("SupabaseService already initialized");
      return true;
    }

    try {
      if (!window.supabaseClient) {
        window.supabaseClient = supabase.createClient(url, anonKey, {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
          },
        });
      }
      this.client = window.supabaseClient;
      this.isInitialized = true;
      Config.supabase.client = this.client;
      Config.init();
      console.log("✅ SupabaseService initialized");
      return true;
    } catch (error) {
      console.error("Failed to initialize SupabaseService:", error);
      return false;
    }
  },

  async checkSession() {
    if (!this.client) return false;
    const {
      data: { session },
      error,
    } = await this.client.auth.getSession();
    if (error || !session) {
      Config.showToast(
        "Your session has expired. Please login again.",
        "error",
      );
      setTimeout(() => (window.location.href = "login.html"), 2000);
      return false;
    }
    return true;
  },

  async query(table, options = {}) {
    if (!this.isInitialized)
      return { success: false, error: "Not initialized" };
    if (!(await this.checkSession()))
      return { success: false, error: "No active session" };

    try {
      let query = this.client.from(table).select(options.select || "*");
      if (options.eq) query = query.eq(options.eq.column, options.eq.value);
      if (options.order)
        query = query.order(options.order.column, {
          ascending: options.order.ascending !== false,
        });
      if (options.limit) query = query.limit(options.limit);
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error(`Supabase query error (${table}):`, error);
      return { success: false, error: error.message };
    }
  },

  async insert(table, data) {
    if (!this.isInitialized)
      return { success: false, error: "Supabase not initialized" };
    if (!(await this.checkSession()))
      return { success: false, error: "No active session" };

    try {
      const cleanData = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) cleanData[key] = value;
      }
      const { data: result, error } = await this.client
        .from(table)
        .insert([cleanData])
        .select();
      if (error) throw error;
      return { success: true, data: result };
    } catch (error) {
      console.error(`Supabase insert error (${table}):`, error);
      return { success: false, error: error.message };
    }
  },

  async update(table, id, data) {
    if (!this.isInitialized)
      return { success: false, error: "Supabase not initialized" };
    if (!(await this.checkSession()))
      return { success: false, error: "No active session" };

    try {
      const cleanData = {};
      const exclude = ["updated_at", "created_at", "createdAt", "updatedAt"];
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null && !exclude.includes(key)) {
          cleanData[key] = value;
        }
      }
      const { data: result, error } = await this.client
        .from(table)
        .update(cleanData)
        .eq("id", id)
        .select();
      if (error) throw error;
      return { success: true, data: result };
    } catch (error) {
      console.error(`Supabase update error (${table}):`, error);
      return { success: false, error: error.message };
    }
  },

  async delete(table, filter) {
    if (!this.isInitialized)
      return { success: false, error: "Supabase not initialized" };
    if (!(await this.checkSession()))
      return { success: false, error: "No active session" };

    try {
      let query = this.client.from(table).delete();
      if (typeof filter === "number") {
        query = query.eq("id", filter);
      } else if (typeof filter === "object" && filter !== null) {
        const entries = Object.entries(filter);
        if (entries.length === 0) throw new Error("Empty filter object");
        for (const [key, value] of entries) query = query.eq(key, value);
      } else if (typeof filter === "string") {
        const idNum = parseInt(filter);
        if (!isNaN(idNum)) query = query.eq("id", idNum);
        else throw new Error("Invalid string filter");
      } else {
        throw new Error("Invalid filter for delete operation");
      }
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error(`Supabase delete error (${table}):`, error);
      return { success: false, error: error.message };
    }
  },
};

// Add animation styles
if (!document.querySelector("#toast-styles")) {
  const style = document.createElement("style");
  style.id = "toast-styles";
  style.textContent = `
    @keyframes progressBar {
      0% { width: 100%; }
      100% { width: 0%; }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.3s ease-out;
    }
  `;
  document.head.appendChild(style);
}

// Auto-initialize if supabase client is ready
if (window.supabaseClient) {
  SupabaseService.client = window.supabaseClient;
  SupabaseService.isInitialized = true;
  Config.init();
  console.log("✅ config-admin.js loaded and initialized");
} else {
  console.log("⏳ config-admin.js loaded, waiting for Supabase client...");
}

// Export for debugging
window.Config = Config;
window.SupabaseService = SupabaseService;
