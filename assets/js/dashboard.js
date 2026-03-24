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
                            <p class="text-primary-100">Here's what's happening with your B2B business today.</p>
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
                        <h3 class="font-semibold text-gray-800 mb-4">Recent Bookings</h3>
                        <div id="recent-bookings-list" class="space-y-4">
                            <div class="text-center text-gray-500 py-4">Loading bookings...</div>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <h3 class="font-semibold text-gray-800 mb-4">Quick Actions</h3>
                        <div class="grid grid-cols-2 gap-4">
                            <button onclick="Navigation.loadPage('destinations')" class="p-4 bg-primary-50 rounded-xl text-center hover:bg-primary-100 transition-colors">
                                <i class="fas fa-map-marked-alt text-2xl text-primary-600 mb-2"></i>
                                <p class="text-sm font-medium text-gray-700">Manage Destinations</p>
                            </button>
                            <button class="p-4 bg-blue-50 rounded-xl text-center hover:bg-blue-100 transition-colors">
                                <i class="fas fa-calendar-plus text-2xl text-blue-600 mb-2"></i>
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
      const bookingsResult = await SupabaseService.query("b2b_bookings", {
        select: "id,total_amount",
      });
      const packagesResult = await SupabaseService.query(
        "destination_packages",
        {
          select: "id",
          eq: { column: "is_active", value: true },
        },
      );
      const destinationsResult = await SupabaseService.query("destinations", {
        select: "id",
      });

      const totalBookings = bookingsResult.success
        ? bookingsResult.data.length
        : 0;
      const totalRevenue = bookingsResult.success
        ? bookingsResult.data.reduce((sum, b) => sum + (b.total_amount || 0), 0)
        : 0;
      const activePackages = packagesResult.success
        ? packagesResult.data.length
        : 0;
      const totalDestinations = destinationsResult.success
        ? destinationsResult.data.length
        : 0;

      document.getElementById("total-bookings").textContent = totalBookings;
      document.getElementById("total-revenue").textContent =
        "₱" + (totalRevenue / 1000).toFixed(1) + "K";
      document.getElementById("active-packages").textContent = activePackages;
      document.getElementById("total-destinations").textContent =
        totalDestinations;
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  },

  async fetchRecentBookings() {
    try {
      const result = await SupabaseService.query("b2b_bookings", {
        select: "*",
        order: { column: "created_at", ascending: false },
        limit: 5,
      });

      const listElement = document.getElementById("recent-bookings-list");

      if (!result.success || !result.data || result.data.length === 0) {
        listElement.innerHTML =
          '<div class="text-center text-gray-500 py-4">No recent bookings</div>';
        return;
      }

      listElement.innerHTML = result.data
        .map(
          (booking) => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                        <p class="text-sm font-medium text-gray-800">${booking.agent_name || "Guest"}</p>
                        <p class="text-xs text-gray-500">${booking.booking_reference || "REF-" + booking.id}</p>
                    </div>
                    <div class="text-right">
                        <span class="text-sm font-semibold text-gray-800">₱${(booking.total_amount || 0).toLocaleString()}</span>
                    </div>
                </div>
            `,
        )
        .join("");
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  },
};
