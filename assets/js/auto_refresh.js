// =====================================================
// COMPREHENSIVE AUTO-REFRESH SYSTEM
// =====================================================

// Import statements - adjust paths based on your structure
import { supabase, state, showToast } from "./config_admin.js";

// Configuration
const REFRESH_INTERVAL = 5000; // Check every 5 seconds
let refreshInterval = null;
let lastRefreshTime = Date.now();
let isRefreshing = false;
let activeModalId = null;

// Track all tables that need monitoring
const TABLES_TO_MONITOR = [
  "destinations",
  "destination_images",
  "destination_packages",
  "hotel_categories",
  "hotels",
  "optional_tours",
  "optional_tour_rates",
  "optional_tour_categories",
  "package_inclusions",
  "package_exclusions",
  "package_itineraries",
  "package_hotel_rates",
  "package_optional_tours",
  "package_transportation",
  "transportation_modes",
  "transportation_categories",
];

// Store last update timestamps for each table
const tableTimestamps = {};

// Initialize timestamps
TABLES_TO_MONITOR.forEach((table) => {
  tableTimestamps[table] = lastRefreshTime;
});

// Start auto-refresh
export function startAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  refreshInterval = setInterval(checkForUpdates, REFRESH_INTERVAL);
  console.log("🔄 Auto-refresh started - monitoring all tables");

  // Add refresh indicator to UI
  addRefreshIndicator();
}

// Stop auto-refresh
export function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log("🔄 Auto-refresh stopped");
  }
}

// Check for updates in all tables
async function checkForUpdates() {
  if (isRefreshing) return;

  isRefreshing = true;

  try {
    let hasUpdates = false;
    const updatedTables = [];

    // Check each table for updates
    for (const table of TABLES_TO_MONITOR) {
      const { data, error } = await supabase
        .from(table)
        .select("id, updated_at")
        .gt("updated_at", new Date(tableTimestamps[table]).toISOString())
        .limit(1);

      if (error) {
        console.warn(`Error checking ${table}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        hasUpdates = true;
        updatedTables.push(table);
        tableTimestamps[table] = Date.now();
      }
    }

    // If updates found, refresh everything
    if (hasUpdates) {
      console.log("📦 Updates detected in:", updatedTables.join(", "));

      // Show notification
      showRefreshNotification(updatedTables);

      // Refresh all data
      await refreshAllData();

      // Update UI based on current view
      await updateCurrentView();
    }

    lastRefreshTime = Date.now();
  } catch (error) {
    console.error("Auto-refresh error:", error);
  } finally {
    isRefreshing = false;
  }
}

// Refresh all data
async function refreshAllData() {
  try {
    // Import dynamically to avoid circular dependencies
    const { fetchDestinations } = await import("../js/destinations.js");

    // Fetch fresh data for all destinations (includes all related data)
    await fetchDestinations(true);

    console.log("✅ All data refreshed");
  } catch (error) {
    console.error("Error refreshing data:", error);
  }
}

// Update current view based on what's open
async function updateCurrentView() {
  try {
    const { renderDestinations, viewDestinationDetails } =
      await import("../js/destinations.js");

    // Check if main destinations page is open
    const mainContent = document.getElementById("mainContent");
    if (mainContent && mainContent.innerHTML.includes("Destinations")) {
      mainContent.innerHTML = await renderDestinations();
      return;
    }

    // Check if there's an open modal
    const openModal = document.querySelector(".fixed.inset-0.z-[100]");
    if (!openModal) return;

    // Get destination ID from modal if it's a destination view
    const destId = openModal.dataset.currentDestinationId;
    if (destId) {
      await viewDestinationDetails(destId, true);
    }
  } catch (error) {
    console.error("Error updating current view:", error);
  }
}

// Show refresh notification
function showRefreshNotification(updatedTables) {
  let notif = document.getElementById("auto-refresh-notification");

  if (!notif) {
    notif = document.createElement("div");
    notif.id = "auto-refresh-notification";
    notif.className =
      "fixed bottom-4 right-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-lg shadow-xl z-[10000] transition-all duration-500 transform translate-y-0";
    document.body.appendChild(notif);
  }

  // Create table icons based on what updated
  const icons = updatedTables
    .map((table) => {
      const iconMap = {
        destinations: "🌍",
        destination_images: "🖼️",
        destination_packages: "📦",
        hotel_categories: "🏨",
        hotels: "🏢",
        optional_tours: "🧭",
        optional_tour_rates: "💰",
        package_inclusions: "✅",
        package_exclusions: "❌",
        package_itineraries: "📅",
        package_hotel_rates: "🏷️",
        package_optional_tours: "➕",
        package_transportation: "🚌",
      };
      return iconMap[table] || "📊";
    })
    .join(" ");

  notif.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="flex -space-x-1">
        ${icons
          .split(" ")
          .map(
            (icon) =>
              `<span class="w-6 h-6 flex items-center justify-center bg-white/20 rounded-full backdrop-blur-sm">${icon}</span>`,
          )
          .join("")}
      </div>
      <div class="flex-1">
        <p class="text-sm font-semibold">Data Updated</p>
        <p class="text-xs opacity-90">${updatedTables.length} table(s) changed • Refreshing...</p>
      </div>
      <i class="fas fa-sync-alt fa-spin text-white/80"></i>
    </div>
  `;

  notif.style.opacity = "1";

  // Auto hide after 3 seconds
  setTimeout(() => {
    notif.style.opacity = "0";
    notif.style.transform = "translateY(100%)";
    setTimeout(() => {
      if (notif.parentNode) notif.remove();
    }, 500);
  }, 3000);
}

// Add refresh indicator to UI
function addRefreshIndicator() {
  const indicator = document.createElement("div");
  indicator.id = "refresh-indicator";
  indicator.className =
    "fixed top-4 right-4 bg-indigo-600 text-white px-3 py-1.5 rounded-full text-xs shadow-lg z-[1000] flex items-center gap-2 opacity-0 transition-opacity";
  indicator.innerHTML = `
    <i class="fas fa-sync-alt fa-spin"></i>
    <span>Live updates active</span>
  `;

  document.body.appendChild(indicator);

  // Fade in
  setTimeout(() => {
    indicator.style.opacity = "1";
  }, 100);

  // Fade out after 3 seconds
  setTimeout(() => {
    indicator.style.opacity = "0";
    setTimeout(() => {
      if (indicator.parentNode) indicator.remove();
    }, 500);
  }, 3000);
}

// Manual refresh button
export function addManualRefreshButton() {
  // Check if button already exists
  if (document.getElementById("manual-refresh-btn")) return;

  const btn = document.createElement("button");
  btn.id = "manual-refresh-btn";
  btn.className =
    "fixed bottom-4 left-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-indigo-700 transition-all z-[1000] flex items-center gap-2";
  btn.innerHTML = `
    <i class="fas fa-sync-alt"></i>
    <span>Refresh Now</span>
  `;

  btn.onclick = async () => {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';

    await manualRefreshAll();

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Now';
  };

  document.body.appendChild(btn);
}

// Manual refresh all
export async function manualRefreshAll() {
  showToast("🔄 Manual refresh initiated...", "info");

  await refreshAllData();
  await updateCurrentView();

  showToast("✅ All data refreshed!", "success");
}

// Initialize the auto-refresh system
export function initAutoRefresh() {
  startAutoRefresh();
  addManualRefreshButton();

  // Track when modals open/close to handle refresh appropriately
  document.addEventListener("modalOpened", (e) => {
    activeModalId = e.detail?.modalId;
  });

  document.addEventListener("modalClosed", () => {
    activeModalId = null;
  });

  // Stop refresh when page is hidden
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoRefresh();
    } else {
      startAutoRefresh();
      // Refresh immediately when page becomes visible
      manualRefreshAll();
    }
  });

  console.log("✅ Auto-refresh system initialized");
}

// Export default
export default {
  startAutoRefresh,
  stopAutoRefresh,
  initAutoRefresh,
  manualRefreshAll,
};
