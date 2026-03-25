// Dashboard Module
const Dashboard = {
  load: function () {
    const content = document.getElementById("main-content");
    content.innerHTML = `
            <div class="space-y-6">
                <!-- Welcome banner -->
                <div class="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl shadow-lg p-6 text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-2xl font-bold mb-2">Welcome back, Admin! 👋</h2>
                            <p class="text-primary-100">Here's what's happening with your travel business today.</p>
                        </div>
                        <div class="hidden md:block">
                            <i class="fas fa-chart-line text-6xl text-primary-300 opacity-50"></i>
                        </div>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div class="stat-card bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-500 mb-1">Total Bookings</p>
                                <h3 class="text-2xl font-bold text-gray-800" id="total-bookings">0</h3>
                            </div>
                            <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-calendar-check text-2xl text-primary-600"></i>
                            </div>
                        </div>
                    </div>

                    <div class="stat-card bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-500 mb-1">Revenue</p>
                                <h3 class="text-2xl font-bold text-gray-800" id="total-revenue">₱0</h3>
                            </div>
                            <div class="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-peso-sign text-2xl text-emerald-600"></i>
                            </div>
                        </div>
                    </div>

                    <div class="stat-card bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-500 mb-1">Active Packages</p>
                                <h3 class="text-2xl font-bold text-gray-800" id="active-packages">0</h3>
                            </div>
                            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-box text-2xl text-blue-600"></i>
                            </div>
                        </div>
                    </div>

                    <div class="stat-card bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-500 mb-1">Destinations</p>
                                <h3 class="text-2xl font-bold text-gray-800" id="total-destinations">0</h3>
                            </div>
                            <div class="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-map-marked-alt text-2xl text-amber-600"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-semibold text-gray-800">Recent Bookings</h3>
                            <button onclick="Navigation.loadPage('bookings')" class="text-sm text-primary-600 hover:text-primary-700 transition-colors">
                                View All <i class="fas fa-arrow-right ml-1"></i>
                            </button>
                        </div>
                        <div id="recent-bookings-list" class="space-y-4">
                            <div class="text-center text-gray-500 py-4">
                                <i class="fas fa-spinner fa-spin mr-2"></i>Loading bookings...
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <h3 class="font-semibold text-gray-800 mb-4">Quick Actions</h3>
                        <div class="grid grid-cols-2 gap-4">
                            <button onclick="Navigation.loadPage('destinations')" class="p-4 bg-primary-50 rounded-xl text-center hover:bg-primary-100 transition-colors group">
                                <i class="fas fa-map-marked-alt text-2xl text-primary-600 mb-2 group-hover:scale-110 transition-transform"></i>
                                <p class="text-sm font-medium text-gray-700">Manage Destinations</p>
                            </button>
                            <button onclick="if(window.openCreateBookingModal) window.openCreateBookingModal(); else alert('Booking module loading...')" class="p-4 bg-blue-50 rounded-xl text-center hover:bg-blue-100 transition-colors group">
                                <i class="fas fa-calendar-plus text-2xl text-blue-600 mb-2 group-hover:scale-110 transition-transform"></i>
                                <p class="text-sm font-medium text-gray-700">New Booking</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    this.fetchStats();
    this.fetchRecentBookings();
  },

  async fetchStats() {
    try {
      // Fetch all bookings
      const bookingsResult = await SupabaseService.query("b2b_bookings", {
        select: "id, total_amount, status, payment_status",
      });

      // Fetch active packages
      const packagesResult = await SupabaseService.query(
        "destination_packages",
        {
          select: "id",
          eq: { column: "is_active", value: true },
        },
      );

      // Fetch destinations
      const destinationsResult = await SupabaseService.query("destinations", {
        select: "id",
      });

      const totalBookings = bookingsResult.success
        ? bookingsResult.data.length
        : 0;

      // Calculate total revenue from paid bookings only
      const totalRevenue = bookingsResult.success
        ? bookingsResult.data
            .filter((b) => b.payment_status === "paid")
            .reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0)
        : 0;

      // Calculate pending bookings count
      const pendingBookings = bookingsResult.success
        ? bookingsResult.data.filter((b) => b.status === "pending").length
        : 0;

      const activePackages = packagesResult.success
        ? packagesResult.data.length
        : 0;
      const totalDestinations = destinationsResult.success
        ? destinationsResult.data.length
        : 0;

      // Update stats display
      const totalBookingsEl = document.getElementById("total-bookings");
      if (totalBookingsEl) totalBookingsEl.textContent = totalBookings;

      // Format revenue nicely
      const revenueEl = document.getElementById("total-revenue");
      if (revenueEl) {
        if (totalRevenue >= 1000000) {
          revenueEl.textContent =
            "₱" + (totalRevenue / 1000000).toFixed(1) + "M";
        } else if (totalRevenue >= 1000) {
          revenueEl.textContent = "₱" + (totalRevenue / 1000).toFixed(1) + "K";
        } else {
          revenueEl.textContent = "₱" + totalRevenue.toLocaleString();
        }
      }

      const activePackagesEl = document.getElementById("active-packages");
      if (activePackagesEl) activePackagesEl.textContent = activePackages;

      const totalDestinationsEl = document.getElementById("total-destinations");
      if (totalDestinationsEl)
        totalDestinationsEl.textContent = totalDestinations;

      // Add pending badge if there are pending bookings
      if (pendingBookings > 0) {
        const statsContainer = document.querySelector(".stat-card:first-child");
        if (statsContainer && !statsContainer.querySelector(".pending-badge")) {
          statsContainer.style.position = "relative";
          const badge = document.createElement("div");
          badge.className =
            "pending-badge absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg";
          badge.textContent = pendingBookings;
          statsContainer.appendChild(badge);
        }
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  },

  async fetchRecentBookings() {
    try {
      const result = await SupabaseService.query("b2b_bookings", {
        select:
          "id, booking_reference, client_name, total_amount, status, created_at",
        order: { column: "created_at", ascending: false },
        limit: 5,
      });

      const listElement = document.getElementById("recent-bookings-list");

      if (!result.success || !result.data || result.data.length === 0) {
        if (listElement) {
          listElement.innerHTML = `
                        <div class="text-center text-gray-500 py-8">
                            <i class="fas fa-calendar-alt text-4xl mb-2 opacity-30"></i>
                            <p>No recent bookings</p>
                            <p class="text-xs mt-1">Create a new booking to get started</p>
                        </div>
                    `;
        }
        return;
      }

      if (listElement) {
        listElement.innerHTML = result.data
          .map((booking) => {
            const statusColors = {
              confirmed: "bg-green-100 text-green-800",
              pending: "bg-yellow-100 text-yellow-800",
              cancelled: "bg-red-100 text-red-800",
            };
            const statusClass =
              statusColors[booking.status] || "bg-gray-100 text-gray-800";
            const statusText = (booking.status || "pending").toUpperCase();

            return `
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" onclick="if(window.viewBookingDetails) window.viewBookingDetails(${booking.id})">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <p class="text-sm font-medium text-gray-800">${this.escapeHtml(booking.client_name || "Guest")}</p>
                                    <span class="px-2 py-0.5 text-xs rounded-full ${statusClass}">
                                        ${statusText}
                                    </span>
                                </div>
                                <p class="text-xs text-gray-500 font-mono">${booking.booking_reference || "REF-" + booking.id}</p>
                            </div>
                            <div class="text-right">
                                <span class="text-sm font-semibold text-gray-800">₱${(Number(booking.total_amount) || 0).toLocaleString()}</span>
                                <p class="text-xs text-gray-400 mt-1">${this.formatDate(booking.created_at)}</p>
                            </div>
                        </div>
                    `;
          })
          .join("");
      }
    } catch (error) {
      console.error("Error fetching recent bookings:", error);
      const listElement = document.getElementById("recent-bookings-list");
      if (listElement) {
        listElement.innerHTML = `
                    <div class="text-center text-red-500 py-4">
                        <i class="fas fa-exclamation-circle mr-2"></i>
                        Failed to load recent bookings
                    </div>
                `;
      }
    }
  },

  formatDate: function (dateString) {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) {
        return "Just now";
      } else if (diffMins < 60) {
        return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      } else {
        return date.toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    } catch {
      return "N/A";
    }
  },

  // Refresh dashboard data
  refresh: async function () {
    await this.fetchStats();
    await this.fetchRecentBookings();
  },

  escapeHtml: function (text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },
};

// Make Dashboard available globally
window.Dashboard = Dashboard;
