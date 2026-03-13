// =====================================================
// DASHBOARD MODULE - COMPLETE FIXED VERSION (NO AGENCY)
// =====================================================

import {
  supabase,
  state,
  formatCurrency,
  formatDate,
  showToast,
} from "../js/config_admin.js";

// =====================================================
// FETCH DASHBOARD STATS - USING CENTRAL STATE
// =====================================================
export async function fetchDashboardStats() {
  try {
    console.log("📊 Fetching dashboard stats...");

    // Try to get bookings from central state
    if (!state.bookings || state.bookings.length === 0) {
      try {
        const { fetchBookings } = await import("./bookings.js");
        await fetchBookings();
      } catch (e) {
        console.log("Could not fetch bookings");
      }
    }

    // Use central state bookings for accurate counts
    const bookings = state.bookings || [];

    // Calculate stats from central state
    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter(
      (b) => b.status === "pending",
    ).length;
    const confirmedBookings = bookings.filter(
      (b) => b.status === "confirmed",
    ).length;
    const cancelledBookings = bookings.filter(
      (b) => b.status === "cancelled",
    ).length;
    const paidBookings = bookings.filter(
      (b) => b.payment_status === "paid",
    ).length;

    const totalRevenue = bookings
      .filter((b) => b.status === "confirmed" && b.payment_status === "paid")
      .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

    // Get other stats from direct queries (REMOVED AGENCIES)
    const [
      { count: totalDestinations },
      { count: totalPackages },
      { count: totalOptionalTours },
    ] = await Promise.all([
      supabase
        .from("destinations")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("destination_packages")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("optional_tours")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
    ]);

    // Get recent bookings with related data (REMOVED AGENCIES)
    const { data: recentBookings } = await supabase
      .from("b2b_bookings")
      .select(
        `
                *,
                destinations ( name ),
                destination_packages ( package_name )
            `,
      )
      .order("created_at", { ascending: false })
      .limit(5);

    // Update state with all stats
    state.stats = {
      totalDestinations: totalDestinations || 0,
      totalPackages: totalPackages || 0,
      totalBookings,
      totalRevenue,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
      paidBookings,
      totalOptionalTours: totalOptionalTours || 0,
    };

    state.recentBookings = recentBookings || [];

    console.log("✅ Dashboard stats updated:", state.stats);
    return true;
  } catch (error) {
    console.error("❌ Error fetching dashboard stats:", error);
    showToast("Failed to load dashboard data", "error");
    return false;
  }
}

// =====================================================
// RENDER DASHBOARD - WITH ACCURATE STATUS DISPLAY
// =====================================================
export async function renderDashboard() {
  await fetchDashboardStats();

  const confirmedBookings = state.stats.confirmedBookings || 0;
  const pendingBookings = state.stats.pendingBookings || 0;
  const cancelledBookings = state.stats.cancelledBookings || 0;
  const paidBookings = state.stats.paidBookings || 0;
  const totalOptionalTours = state.stats.totalOptionalTours || 0;

  return `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-800">
                        Welcome back, <span class="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">Admin</span>
                    </h1>
                    <p class="text-sm text-gray-500 mt-1">
                        Dashboard overview - ${state.stats.totalDestinations} destinations, ${state.stats.totalBookings} bookings, ${totalOptionalTours} tours
                    </p>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.refreshDashboard()" class="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-1 hover:bg-emerald-200 transition">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>
            
            <!-- Stats Cards - 4 cards layout -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <!-- Destinations Card -->
                <div class="dashboard-card bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-500 mb-1">Total Destinations</p>
                            <h3 class="text-3xl font-bold text-gray-800">${state.stats.totalDestinations}</h3>
                            <p class="text-xs text-emerald-600 mt-2">Active destinations</p>
                        </div>
                        <div class="h-14 w-14 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                            <i class="fas fa-map-pin text-2xl"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Packages Card -->
                <div class="dashboard-card bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-500 mb-1">Active Packages</p>
                            <h3 class="text-3xl font-bold text-gray-800">${state.stats.totalPackages}</h3>
                            <p class="text-xs text-emerald-600 mt-2">Across all destinations</p>
                        </div>
                        <div class="h-14 w-14 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                            <i class="fas fa-box text-2xl"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Tours Card (Replaces Agencies) -->
                <div class="dashboard-card bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-500 mb-1">Optional Tours</p>
                            <h3 class="text-3xl font-bold text-gray-800">${totalOptionalTours}</h3>
                            <p class="text-xs text-emerald-600 mt-2">Activities & excursions</p>
                        </div>
                        <div class="h-14 w-14 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                            <i class="fas fa-umbrella-beach text-2xl"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Bookings Card -->
                <div class="dashboard-card bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-500 mb-1">Total Bookings</p>
                            <h3 class="text-3xl font-bold text-gray-800">${state.stats.totalBookings}</h3>
                            <div class="flex flex-wrap items-center gap-2 mt-2">
                                <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                    ${confirmedBookings} Confirmed
                                </span>
                                <span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                                    ${pendingBookings} Pending
                                </span>
                                <span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                    ${cancelledBookings} Cancelled
                                </span>
                            </div>
                        </div>
                        <div class="h-14 w-14 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                            <i class="fas fa-calendar-check text-2xl"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Revenue & Paid Stats Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <!-- Revenue Card -->
                <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-500 mb-1">Total Revenue</p>
                            <h3 class="text-3xl font-bold text-gray-800">${formatCurrency(state.stats.totalRevenue)}</h3>
                            <div class="flex items-center gap-2 mt-2">
                                <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                    <i class="fas fa-check-circle mr-1"></i> ${paidBookings} Paid Bookings
                                </span>
                            </div>
                        </div>
                        <div class="h-14 w-14 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                            <i class="fas fa-peso-sign text-2xl"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Quick Actions Card -->
                <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <p class="text-sm text-gray-500 mb-3">Quick Actions</p>
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="window.openCreateDestinationModal()" class="p-3 bg-emerald-50 rounded-lg text-emerald-700 hover:bg-emerald-100 transition flex flex-col items-center gap-1">
                            <i class="fas fa-plus-circle"></i>
                            <span class="text-xs">New Destination</span>
                        </button>
                        <button onclick="window.openCreateBookingModal()" class="p-3 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100 transition flex flex-col items-center gap-1">
                            <i class="fas fa-calendar-plus"></i>
                            <span class="text-xs">New Booking</span>
                        </button>
                        <button onclick="window.navigateTo('destinations')" class="p-3 bg-purple-50 rounded-lg text-purple-700 hover:bg-purple-100 transition flex flex-col items-center gap-1">
                            <i class="fas fa-map-pin"></i>
                            <span class="text-xs">View Destinations</span>
                        </button>
                        <button onclick="window.navigateTo('bookings')" class="p-3 bg-amber-50 rounded-lg text-amber-700 hover:bg-amber-100 transition flex flex-col items-center gap-1">
                            <i class="fas fa-list"></i>
                            <span class="text-xs">All Bookings</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Recent Bookings Table -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                        <i class="fas fa-calendar-alt text-emerald-500"></i>
                        Recent Bookings
                    </h3>
                    <button onclick="window.navigateTo('bookings')" class="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                        View All <i class="fas fa-arrow-right ml-1"></i>
                    </button>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50 text-left text-xs text-gray-500">
                            <tr>
                                <th class="px-6 py-3">Booking Ref</th>
                                <th class="px-6 py-3">Customer</th>
                                <th class="px-6 py-3">Destination</th>
                                <th class="px-6 py-3">Package</th>
                                <th class="px-6 py-3">Travel Date</th>
                                <th class="px-6 py-3">Status</th>
                                <th class="px-6 py-3">Payment</th>
                                <th class="px-6 py-3">Amount</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${
                              state.recentBookings.length > 0
                                ? state.recentBookings
                                    .map((booking) => {
                                      const travelDate =
                                        booking.travel_dates?.[0] || null;
                                      const customerName =
                                        booking.agent_name || "Direct Customer";
                                      return `
                                        <tr class="hover:bg-gray-50 transition cursor-pointer" onclick="window.viewBookingDetails(${booking.id})">
                                            <td class="px-6 py-4 font-mono text-sm text-gray-900">${booking.booking_reference || "N/A"}</td>
                                            <td class="px-6 py-4 text-sm text-gray-900">${customerName}</td>
                                            <td class="px-6 py-4 text-sm text-gray-600">${booking.destinations?.name || "N/A"}</td>
                                            <td class="px-6 py-4 text-sm text-gray-600">${booking.destination_packages?.package_name || "N/A"}</td>
                                            <td class="px-6 py-4 text-sm text-gray-600">${formatDate(travelDate)}</td>
                                            <td class="px-6 py-4">
                                                <span class="px-2 py-1 text-xs font-medium rounded-full 
                                                    ${
                                                      booking.status ===
                                                      "confirmed"
                                                        ? "bg-green-100 text-green-700"
                                                        : booking.status ===
                                                            "pending"
                                                          ? "bg-yellow-100 text-yellow-700"
                                                          : "bg-red-100 text-red-700"
                                                    }">
                                                    ${(booking.status || "pending").toUpperCase()}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4">
                                                <span class="px-2 py-1 text-xs font-medium rounded-full 
                                                    ${
                                                      booking.payment_status ===
                                                      "paid"
                                                        ? "bg-green-100 text-green-700"
                                                        : booking.payment_status ===
                                                            "partial"
                                                          ? "bg-blue-100 text-blue-700"
                                                          : "bg-gray-100 text-gray-700"
                                                    }">
                                                    ${(booking.payment_status || "unpaid").toUpperCase()}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 text-sm font-medium text-gray-900">${formatCurrency(booking.total_amount)}</td>
                                        </tr>
                                    `;
                                    })
                                    .join("")
                                : `
                                <tr>
                                    <td colspan="8" class="px-6 py-8 text-center text-gray-500">
                                        <i class="fas fa-inbox text-3xl mb-2 opacity-50"></i>
                                        <p>No recent bookings</p>
                                    </td>
                                </tr>
                            `
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// =====================================================
// REFRESH DASHBOARD - UPDATED FUNCTION
// =====================================================
export async function refreshDashboard() {
  console.log("🔄 Refreshing dashboard...");
  showToast("Refreshing dashboard...", "info");

  // Refresh bookings first
  try {
    const { fetchBookings } = await import("./bookings.js");
    await fetchBookings();
  } catch (e) {
    console.log("Could not fetch bookings");
  }

  // Then refresh dashboard stats
  await fetchDashboardStats();

  // Update the UI
  const mainContent = document.getElementById("mainContent");
  if (mainContent) {
    mainContent.innerHTML = await renderDashboard();
  }

  showToast("✅ Dashboard updated!", "success");
  console.log("✅ Dashboard refreshed");
}

// Make refresh function available globally
window.refreshDashboard = refreshDashboard;

// =====================================================
// INITIALIZE DASHBOARD
// =====================================================
export async function initDashboard() {
  await refreshDashboard();
}
