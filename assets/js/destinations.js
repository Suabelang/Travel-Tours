// Destinations Management Module
console.log("✅ destinations.js loaded");

const Destinations = {
  currentTab: "destinations",
  currentDestinationId: null,

  load: function () {
    const content = document.getElementById("main-content");
    content.innerHTML = `
            <div class="space-y-6">
                <!-- Header with Actions -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h2 class="text-2xl font-bold text-gray-800">Destinations Management</h2>
                    <div class="flex gap-2">
                        <button onclick="Destinations.showAddDestinationModal()" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center">
                            <i class="fas fa-plus mr-2"></i>Add Destination
                        </button>
                        <button onclick="Destinations.showAllDataModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center">
                            <i class="fas fa-database mr-2"></i>View All Data
                        </button>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4" id="destinations-stats">
                    <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                        <div class="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                        <div class="h-6 bg-gray-300 rounded w-12"></div>
                    </div>
                    <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                        <div class="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                        <div class="h-6 bg-gray-300 rounded w-12"></div>
                    </div>
                    <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                        <div class="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                        <div class="h-6 bg-gray-300 rounded w-12"></div>
                    </div>
                    <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                        <div class="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                        <div class="h-6 bg-gray-300 rounded w-12"></div>
                    </div>
                </div>

                <!-- Search and Filter -->
                <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
                    <div class="flex flex-col md:flex-row gap-4">
                        <div class="flex-1">
                            <input type="text" id="search-destinations" placeholder="Search destinations..." 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>
                        <div class="w-full md:w-48">
                            <select id="filter-status" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="all">All Status</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Destinations Table -->
                <div id="destinations-table-container">
                    <div class="text-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700 mx-auto"></div>
                        <p class="mt-2 text-gray-500">Loading destinations...</p>
                    </div>
                </div>
            </div>
        `;

    this.loadStats();
    this.loadDestinations();
    this.bindSearchEvents();
  },

  bindSearchEvents: function () {
    setTimeout(() => {
      const searchInput = document.getElementById("search-destinations");
      const filterSelect = document.getElementById("filter-status");

      if (searchInput) {
        searchInput.addEventListener("input", () => this.loadDestinations());
      }
      if (filterSelect) {
        filterSelect.addEventListener("change", () => this.loadDestinations());
      }
    }, 500);
  },

  async loadStats() {
    try {
      const [destinations, packages, hotels, bookings] = await Promise.all([
        SupabaseService.query("destinations", { select: "id" }),
        SupabaseService.query("destination_packages", { select: "id" }),
        SupabaseService.query("hotels", { select: "id" }),
        SupabaseService.query("b2b_bookings", { select: "id" }),
      ]);

      const statsHtml = `
                <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <p class="text-sm text-gray-500">Total Destinations</p>
                    <h4 class="text-xl font-bold text-gray-800">${destinations.success ? destinations.data.length : 0}</h4>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <p class="text-sm text-gray-500">Total Packages</p>
                    <h4 class="text-xl font-bold text-gray-800">${packages.success ? packages.data.length : 0}</h4>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <p class="text-sm text-gray-500">Total Hotels</p>
                    <h4 class="text-xl font-bold text-gray-800">${hotels.success ? hotels.data.length : 0}</h4>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <p class="text-sm text-gray-500">Total Bookings</p>
                    <h4 class="text-xl font-bold text-gray-800">${bookings.success ? bookings.data.length : 0}</h4>
                </div>
            `;

      document.getElementById("destinations-stats").innerHTML = statsHtml;
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  },

  async loadDestinations() {
    const searchInput = document.getElementById("search-destinations");
    const filterSelect = document.getElementById("filter-status");

    let query = SupabaseService.query("destinations", {
      order: { column: "name", ascending: true },
    });

    const result = await query;

    const container = document.getElementById("destinations-table-container");

    if (!result.success) {
      container.innerHTML = `<div class="text-center text-red-600 py-4">Error loading destinations</div>`;
      return;
    }

    let filteredData = result.data;

    if (searchInput && searchInput.value) {
      const searchTerm = searchInput.value.toLowerCase();
      filteredData = filteredData.filter(
        (dest) =>
          dest.name?.toLowerCase().includes(searchTerm) ||
          dest.airport_name?.toLowerCase().includes(searchTerm) ||
          dest.country?.toLowerCase().includes(searchTerm),
      );
    }

    if (filterSelect && filterSelect.value === "active") {
      filteredData = filteredData.filter((dest) => dest.is_active === true);
    } else if (filterSelect && filterSelect.value === "inactive") {
      filteredData = filteredData.filter((dest) => dest.is_active === false);
    }

    if (filteredData.length === 0) {
      container.innerHTML = `
                <div class="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <i class="fas fa-map-marked-alt text-5xl text-gray-300 mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-600">No destinations found</h3>
                    <p class="text-sm text-gray-500 mb-4">Click the "Add Destination" button to create your first destination</p>
                </div>
            `;
      return;
    }

    container.innerHTML = `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                             <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Airport</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                             </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${filteredData
                              .map(
                                (dest) => `
                                <tr class="hover:bg-gray-50 cursor-pointer" onclick="Destinations.viewDestinationDetails(${dest.id})">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dest.id}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm font-medium text-gray-900">${this.escapeHtml(dest.name)}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${this.escapeHtml(dest.airport_name || "—")}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${this.escapeHtml(dest.country || "Philippines")}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${dest.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}">
                                            ${dest.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onclick="event.stopPropagation(); Destinations.viewDestinationDetails(${dest.id})" class="text-blue-600 hover:text-blue-900 mr-3">
                                            <i class="fas fa-eye"></i> View
                                        </button>
                                        <button onclick="event.stopPropagation(); EditDestination.edit('destination', ${dest.id})" class="text-primary-600 hover:text-primary-900 mr-3">
                                            <i class="fas fa-edit"></i> Edit
                                        </button>
                                        <button onclick="event.stopPropagation(); Destinations.showDeleteConfirmation(${dest.id}, '${this.escapeHtml(dest.name)}')" class="text-red-600 hover:text-red-900">
                                            <i class="fas fa-trash"></i> Delete
                                        </button>
                                    </td>
                                </tr>
                            `,
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
  },

  async viewDestinationDetails(id) {
    this.currentDestinationId = id;

    try {
      const destination = await SupabaseService.query("destinations", {
        eq: { column: "id", value: id },
      });

      const destData = destination.success ? destination.data[0] : null;
      if (!destData) {
        alert("Destination not found");
        return;
      }

      const images = await SupabaseService.query("destination_images", {
        eq: { column: "destination_id", value: id },
      });

      const packages = await SupabaseService.query("destination_packages", {
        eq: { column: "destination_id", value: id },
      });

      const hotelCategories = await SupabaseService.query("hotel_categories", {
        eq: { column: "destination_id", value: id },
      });

      let allHotels = [];
      const categories = hotelCategories.success ? hotelCategories.data : [];
      for (let cat of categories) {
        const hotelsResult = await SupabaseService.query("hotels", {
          eq: { column: "category_id", value: cat.id },
        });
        if (hotelsResult.success) {
          allHotels = [...allHotels, ...hotelsResult.data];
        }
      }

      let allPackageRates = [];
      let allInclusions = [];
      let allExclusions = [];
      let allItineraries = [];

      const packagesList = packages.success ? packages.data : [];
      for (let pkg of packagesList) {
        const [rates, inclusions, exclusions, itineraries] = await Promise.all([
          SupabaseService.query("package_hotel_rates", {
            eq: { column: "package_id", value: pkg.id },
          }),
          SupabaseService.query("package_inclusions", {
            eq: { column: "package_id", value: pkg.id },
          }),
          SupabaseService.query("package_exclusions", {
            eq: { column: "package_id", value: pkg.id },
          }),
          SupabaseService.query("package_itineraries", {
            eq: { column: "package_id", value: pkg.id },
          }),
        ]);

        if (rates.success)
          allPackageRates = [...allPackageRates, ...rates.data];
        if (inclusions.success)
          allInclusions = [...allInclusions, ...inclusions.data];
        if (exclusions.success)
          allExclusions = [...allExclusions, ...exclusions.data];
        if (itineraries.success)
          allItineraries = [...allItineraries, ...itineraries.data];
      }

      const optionalTours = await SupabaseService.query(
        "optional_tour_categories",
        {
          eq: { column: "destination_id", value: id },
          order: { column: "display_order", ascending: true },
        },
      );

      let allOptionalTourRates = [];
      const toursList = optionalTours.success ? optionalTours.data : [];
      for (let tour of toursList) {
        const ratesResult = await SupabaseService.query("optional_tour_rates", {
          eq: { column: "tour_id", value: tour.id },
        });
        if (ratesResult.success) {
          allOptionalTourRates = [...allOptionalTourRates, ...ratesResult.data];
        }
      }

      console.log(
        `Loaded ${toursList.length} optional tours for destination ${id}`,
      );

      this.showDestinationDetailsModal(destData, {
        images: images.success ? images.data : [],
        packages: packagesList,
        hotelCategories: categories,
        hotels: allHotels,
        packageRates: allPackageRates,
        inclusions: allInclusions,
        exclusions: allExclusions,
        itineraries: allItineraries,
        optionalTours: toursList,
        optionalTourRates: allOptionalTourRates,
      });
    } catch (error) {
      console.error("Error loading destination details:", error);
      if (typeof Config !== "undefined")
        Config.showToast("Error loading destination details", "error");
    }
  },

  showDestinationDetailsModal: function (destination, relatedData) {
    const modalHtml = `
            <div class="fixed inset-0 z-50 overflow-y-auto">
                <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    <div class="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onclick="Destinations.closeViewModal()"></div>
                    <div class="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
                        <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                            <div class="flex items-center justify-between">
                                <h3 class="text-lg font-semibold text-white">
                                    <i class="fas fa-info-circle mr-2"></i>Destination Details: ${this.escapeHtml(destination.name)}
                                </h3>
                                <button onclick="Destinations.closeViewModal()" class="text-white hover:text-blue-100">
                                    <i class="fas fa-times text-xl"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="px-6 py-4 max-h-[80vh] overflow-y-auto bg-gray-50">
                            ${this.generateDetailsView(destination, relatedData)}
                        </div>

                        <div class="bg-white px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                            <button onclick="Destinations.closeViewModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Close
                            </button>
                            <button onclick="EditDestination.edit('destination', ${destination.id}); Destinations.closeViewModal();" class="px-4 py-2 bg-primary-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-primary-700">
                                <i class="fas fa-edit mr-2"></i>Edit Destination
                            </button>
                            <button onclick="Destinations.showDeleteConfirmation(${destination.id}, '${this.escapeHtml(destination.name)}'); Destinations.closeViewModal();" class="px-4 py-2 bg-red-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-red-700">
                                <i class="fas fa-trash mr-2"></i>Delete Destination
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    let modalContainer = document.getElementById("view-modal-container");
    if (!modalContainer) {
      modalContainer = document.createElement("div");
      modalContainer.id = "view-modal-container";
      document.body.appendChild(modalContainer);
    }
    modalContainer.innerHTML = modalHtml;
  },

  showDeleteConfirmation: function (id, name) {
    const modalHtml = `
            <div class="fixed inset-0 z-50 overflow-y-auto">
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onclick="Destinations.closeDeleteModal()"></div>
                    <div class="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fadeInUp">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-2">Delete Destination</h3>
                            <p class="text-sm text-gray-600 mb-4">
                                Are you sure you want to delete <strong class="text-red-600">"${this.escapeHtml(name)}"</strong>?
                            </p>
                            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                                <p class="text-xs text-yellow-800">
                                    <i class="fas fa-info-circle mr-1"></i>
                                    This will permanently delete:
                                </p>
                                <ul class="text-xs text-yellow-700 mt-1 space-y-1 list-disc list-inside">
                                    <li>The destination</li>
                                    <li>All packages and their rates</li>
                                    <li>All hotel categories and hotels</li>
                                    <li>All inclusions, exclusions, and itineraries</li>
                                    <li>All destination images</li>
                                </ul>
                                <p class="text-xs text-red-600 mt-2 font-semibold">This action CANNOT be undone!</p>
                            </div>
                            <div class="flex gap-3">
                                <button onclick="Destinations.closeDeleteModal()" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                                    Cancel
                                </button>
                                <button onclick="Destinations.deleteDestination(${id}, '${this.escapeHtml(name)}')" class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                                    <i class="fas fa-trash mr-2"></i>Delete Forever
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    let modalContainer = document.getElementById("delete-modal-container");
    if (!modalContainer) {
      modalContainer = document.createElement("div");
      modalContainer.id = "delete-modal-container";
      document.body.appendChild(modalContainer);
    }
    modalContainer.innerHTML = modalHtml;
  },

  closeDeleteModal: function () {
    const container = document.getElementById("delete-modal-container");
    if (container) container.innerHTML = "";
  },

  deleteDestination: async function (id, name) {
    this.closeDeleteModal();

    if (typeof Config !== "undefined")
      Config.showToast("Deleting destination and all related data...", "info");

    try {
      const packagesResult = await SupabaseService.query(
        "destination_packages",
        {
          eq: { column: "destination_id", value: id },
        },
      );

      if (packagesResult.success && packagesResult.data.length > 0) {
        for (let pkg of packagesResult.data) {
          await SupabaseService.delete("package_hotel_rates", {
            package_id: pkg.id,
          });
          await SupabaseService.delete("package_inclusions", {
            package_id: pkg.id,
          });
          await SupabaseService.delete("package_exclusions", {
            package_id: pkg.id,
          });
          await SupabaseService.delete("package_itineraries", {
            package_id: pkg.id,
          });
        }

        for (let pkg of packagesResult.data) {
          await SupabaseService.delete("destination_packages", pkg.id);
        }
        console.log(
          `Deleted ${packagesResult.data.length} packages and their data`,
        );
      }

      const categoriesResult = await SupabaseService.query("hotel_categories", {
        eq: { column: "destination_id", value: id },
      });

      if (categoriesResult.success && categoriesResult.data.length > 0) {
        for (let cat of categoriesResult.data) {
          await SupabaseService.delete("hotels", { category_id: cat.id });
        }

        for (let cat of categoriesResult.data) {
          await SupabaseService.delete("hotel_categories", cat.id);
        }
        console.log(
          `Deleted ${categoriesResult.data.length} hotel categories and their hotels`,
        );
      }

      await SupabaseService.delete("destination_images", {
        destination_id: id,
      });
      console.log("Deleted destination images");

      const result = await SupabaseService.delete("destinations", id);

      if (result.success) {
        if (typeof Config !== "undefined")
          Config.showToast(
            `✅ "${name}" and all related data deleted successfully!`,
            "success",
          );
        this.loadDestinations();
        this.loadStats();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error deleting destination:", error);
      if (typeof Config !== "undefined")
        Config.showToast(
          `❌ Error deleting destination: ${error.message}`,
          "error",
        );
    }
  },

  generateDetailsView: function (destination, data) {
    return `
        <div class="space-y-6">
            <!-- Basic Information -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <i class="fas fa-info-circle text-blue-600 mr-2"></i>Basic Information
                </h4>
                <div class="grid grid-cols-2 gap-4">
                    <div><p class="text-sm text-gray-500">Destination Name</p><p class="text-base font-medium">${this.escapeHtml(destination.name)}</p></div>
                    <div><p class="text-sm text-gray-500">Country</p><p class="text-base font-medium">${this.escapeHtml(destination.country || "Philippines")}</p></div>
                    <div><p class="text-sm text-gray-500">Airport Name</p><p class="text-base font-medium">${this.escapeHtml(destination.airport_name || "—")}</p></div>
                    <div><p class="text-sm text-gray-500">Status</p><span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${destination.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}">${destination.is_active ? "Active" : "Inactive"}</span></div>
                    <div class="col-span-2"><p class="text-sm text-gray-500">Description</p><p class="text-base">${this.escapeHtml(destination.description || "No description")}</p></div>
                </div>
            </div>

            <!-- Images -->
            ${
              data.images && data.images.length > 0
                ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center"><i class="fas fa-images text-green-600 mr-2"></i>Images (${data.images.length})</h4>
                <div class="grid grid-cols-3 gap-4">
                    ${data.images.map((img) => `<div class="relative group"><img src="${this.escapeHtml(img.url)}" class="w-full h-32 object-cover rounded-lg">${img.is_primary ? '<span class="absolute top-2 left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded">Primary</span>' : ""}</div>`).join("")}
                </div>
            </div>
            `
                : ""
            }

            <!-- Hotel Categories -->
            ${
              data.hotelCategories && data.hotelCategories.length > 0
                ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center"><i class="fas fa-layer-group text-purple-600 mr-2"></i>Hotel Categories (${data.hotelCategories.length})</h4>
                <div class="flex flex-wrap gap-2">
                    ${data.hotelCategories.map((cat) => `<span class="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">${this.escapeHtml(cat.category_name)}</span>`).join("")}
                </div>
            </div>
            `
                : ""
            }

            <!-- Hotels -->
            ${
              data.hotels && data.hotels.length > 0
                ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center"><i class="fas fa-hotel text-amber-600 mr-2"></i>Hotels (${data.hotels.length})</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${data.hotels
                      .map(
                        (hotel) => `
                        <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="flex items-start gap-3">
                                ${hotel.image_url ? `<img src="${this.escapeHtml(hotel.image_url)}" class="w-16 h-16 object-cover rounded-lg">` : `<div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center"><i class="fas fa-hotel text-gray-400 text-2xl"></i></div>`}
                                <div class="flex-1">
                                    <h5 class="font-semibold text-gray-800">${this.escapeHtml(hotel.name)}</h5>
                                    <div class="flex items-center gap-2 mt-1">
                                        <span class="text-xs ${hotel.is_active ? "text-green-600" : "text-gray-500"}">${hotel.is_active ? "Active" : "Inactive"}</span>
                                    </div>
                                    ${hotel.description ? `<p class="text-xs text-gray-500 mt-2">${this.escapeHtml(hotel.description.substring(0, 100))}${hotel.description.length > 100 ? "..." : ""}</p>` : ""}
                                </div>
                            </div>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
            </div>
            `
                : ""
            }

            <!-- Packages -->
            ${
              data.packages && data.packages.length > 0
                ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center"><i class="fas fa-box text-blue-600 mr-2"></i>Packages (${data.packages.length})</h4>
                <div class="space-y-6">
                    ${data.packages
                      .map((pkg) => {
                        const packageRates = data.packageRates.filter(
                          (r) => r.package_id === pkg.id,
                        );
                        const ratesByCategory = {};

                        packageRates.forEach((rate) => {
                          const category = data.hotelCategories.find(
                            (cat) => cat.id === rate.hotel_category_id,
                          );
                          const categoryName = category
                            ? category.category_name
                            : "Uncategorized";
                          if (!ratesByCategory[categoryName])
                            ratesByCategory[categoryName] = [];
                          ratesByCategory[categoryName].push(rate);
                        });

                        return `
                        <div class="border rounded-lg overflow-hidden">
                            <div class="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b">
                                <div class="flex justify-between items-center">
                                    <h5 class="font-bold text-blue-800 text-lg">${this.escapeHtml(pkg.package_name)}</h5>
                                    <span class="px-2 py-1 text-xs rounded-full ${pkg.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}">${pkg.is_active ? "Active" : "Inactive"}</span>
                                </div>
                                <div class="flex gap-4 mt-1 text-sm">
                                    <span><span class="text-gray-500">Code:</span> ${this.escapeHtml(pkg.package_code || "—")}</span>
                                    <span><span class="text-gray-500">Base Price:</span> ₱${pkg.base_price || 0}</span>
                                </div>
                            </div>
                            
                            <div class="p-4">
                                ${
                                  packageRates.length > 0
                                    ? `
                                <div class="space-y-6">
                                    ${Object.entries(ratesByCategory)
                                      .map(([categoryName, rates]) => {
                                        // Group rates by season/duration
                                        const groupedRates = {};
                                        rates.forEach((rate) => {
                                          const key = `${rate.season || "Regular"}|${rate.duration || ""}`;
                                          const label = rate.duration
                                            ? `${rate.season || "Regular"} (${rate.duration})`
                                            : rate.season || "Regular";
                                          if (!groupedRates[key]) {
                                            groupedRates[key] = {
                                              label: label,
                                              rates: [],
                                            };
                                          }
                                          groupedRates[key].rates.push(rate);
                                        });

                                        return `
                                        <div class="border rounded-lg overflow-hidden">
                                            <div class="bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                                                ${this.escapeHtml(categoryName)}
                                            </div>
                                            <div class="p-4 space-y-4">
                                                ${Object.values(groupedRates)
                                                  .map(
                                                    (group) => `
                                                    <div>
                                                        <div class="text-sm font-medium text-gray-600 mb-2">${this.escapeHtml(group.label)}</div>
                                                        <div class="overflow-x-auto">
                                                            <table class="min-w-full text-sm">
                                                                <thead>
                                                                    <tr class="bg-gray-50">
                                                                        <th class="px-3 py-2 text-left">Pax Type</th>
                                                                        ${group.rates[0]?.rate_solo ? '<th class="px-3 py-2 text-right">Solo</th>' : ""}
                                                                        ${group.rates[0]?.rate_2pax ? '<th class="px-3 py-2 text-right">2 Pax</th>' : ""}
                                                                        ${group.rates[0]?.rate_3pax ? '<th class="px-3 py-2 text-right">3 Pax</th>' : ""}
                                                                        ${group.rates[0]?.rate_4pax ? '<th class="px-3 py-2 text-right">4 Pax</th>' : ""}
                                                                        ${group.rates[0]?.rate_5pax ? '<th class="px-3 py-2 text-right">5 Pax</th>' : ""}
                                                                        ${group.rates[0]?.rate_6pax ? '<th class="px-3 py-2 text-right">6 Pax</th>' : ""}
                                                                        ${group.rates[0]?.rate_7pax ? '<th class="px-3 py-2 text-right">7 Pax</th>' : ""}
                                                                        ${group.rates[0]?.rate_8pax ? '<th class="px-3 py-2 text-right">8 Pax</th>' : ""}
                                                                        ${group.rates[0]?.rate_9pax ? '<th class="px-3 py-2 text-right">9 Pax</th>' : ""}
                                                                        ${group.rates[0]?.rate_10pax ? '<th class="px-3 py-2 text-right">10 Pax</th>' : ""}
                                                                        ${group.rates[0]?.rate_11pax ? '<th class="px-3 py-2 text-right">11 Pax</th>' : ""}
                                                                        ${group.rates[0]?.rate_12pax ? '<th class="px-3 py-2 text-right">12 Pax</th>' : ""}
                                                                        ${group.rates[0]?.rate_child_no_breakfast ? '<th class="px-3 py-2 text-right">Child</th>' : ""}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    ${group.rates
                                                                      .map(
                                                                        (
                                                                          rate,
                                                                        ) => `
                                                                        <tr class="border-t hover:bg-gray-50">
                                                                            <td class="px-3 py-2 font-medium">Regular Rate</td>
                                                                            ${rate.rate_solo ? `<td class="px-3 py-2 text-right">₱${Number(rate.rate_solo).toLocaleString()}</td>` : ""}
                                                                            ${rate.rate_2pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.rate_2pax).toLocaleString()}</td>` : ""}
                                                                            ${rate.rate_3pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.rate_3pax).toLocaleString()}</td>` : ""}
                                                                            ${rate.rate_4pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.rate_4pax).toLocaleString()}</td>` : ""}
                                                                            ${rate.rate_5pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.rate_5pax).toLocaleString()}</td>` : ""}
                                                                            ${rate.rate_6pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.rate_6pax).toLocaleString()}</td>` : ""}
                                                                            ${rate.rate_7pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.rate_7pax).toLocaleString()}</td>` : ""}
                                                                            ${rate.rate_8pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.rate_8pax).toLocaleString()}</td>` : ""}
                                                                            ${rate.rate_9pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.rate_9pax).toLocaleString()}</td>` : ""}
                                                                            ${rate.rate_10pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.rate_10pax).toLocaleString()}</td>` : ""}
                                                                            ${rate.rate_11pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.rate_11pax).toLocaleString()}</td>` : ""}
                                                                            ${rate.rate_12pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.rate_12pax).toLocaleString()}</td>` : ""}
                                                                            ${rate.rate_child_no_breakfast ? `<td class="px-3 py-2 text-right">₱${Number(rate.rate_child_no_breakfast).toLocaleString()}</td>` : ""}
                                                                        </tr>
                                                                    `,
                                                                      )
                                                                      .join("")}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        
                                                        ${
                                                          group.rates.some(
                                                            (r) =>
                                                              r.extra_night_solo ||
                                                              r.extra_night_2pax ||
                                                              r.extra_night_3pax ||
                                                              r.extra_night_4pax ||
                                                              r.extra_night_5pax ||
                                                              r.extra_night_6pax,
                                                          )
                                                            ? `
                                                        <div class="mt-3">
                                                            <div class="text-sm font-medium text-gray-600 mb-2">🌙 Extra Night Rates</div>
                                                            <div class="overflow-x-auto">
                                                                <table class="min-w-full text-sm">
                                                                    <thead>
                                                                        <tr class="bg-gray-50">
                                                                            <th class="px-3 py-2 text-left">Pax Type</th>
                                                                            ${group.rates.some((r) => r.extra_night_solo) ? '<th class="px-3 py-2 text-right">Solo</th>' : ""}
                                                                            ${group.rates.some((r) => r.extra_night_2pax) ? '<th class="px-3 py-2 text-right">2 Pax</th>' : ""}
                                                                            ${group.rates.some((r) => r.extra_night_3pax) ? '<th class="px-3 py-2 text-right">3 Pax</th>' : ""}
                                                                            ${group.rates.some((r) => r.extra_night_4pax) ? '<th class="px-3 py-2 text-right">4 Pax</th>' : ""}
                                                                            ${group.rates.some((r) => r.extra_night_5pax) ? '<th class="px-3 py-2 text-right">5 Pax</th>' : ""}
                                                                            ${group.rates.some((r) => r.extra_night_6pax) ? '<th class="px-3 py-2 text-right">6 Pax</th>' : ""}
                                                                            ${group.rates.some((r) => r.extra_night_7pax) ? '<th class="px-3 py-2 text-right">7 Pax</th>' : ""}
                                                                            ${group.rates.some((r) => r.extra_night_8pax) ? '<th class="px-3 py-2 text-right">8 Pax</th>' : ""}
                                                                            ${group.rates.some((r) => r.extra_night_9pax) ? '<th class="px-3 py-2 text-right">9 Pax</th>' : ""}
                                                                            ${group.rates.some((r) => r.extra_night_10pax) ? '<th class="px-3 py-2 text-right">10 Pax</th>' : ""}
                                                                            ${group.rates.some((r) => r.extra_night_11pax) ? '<th class="px-3 py-2 text-right">11 Pax</th>' : ""}
                                                                            ${group.rates.some((r) => r.extra_night_12pax) ? '<th class="px-3 py-2 text-right">12 Pax</th>' : ""}
                                                                            ${group.rates.some((r) => r.extra_night_child_no_breakfast) ? '<th class="px-3 py-2 text-right">Child</th>' : ""}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        ${group.rates
                                                                          .map(
                                                                            (
                                                                              rate,
                                                                            ) => `
                                                                            <tr class="border-t hover:bg-gray-50">
                                                                                <td class="px-3 py-2 font-medium">Extra Night</td>
                                                                                ${rate.extra_night_solo ? `<td class="px-3 py-2 text-right">₱${Number(rate.extra_night_solo).toLocaleString()}</td>` : ""}
                                                                                ${rate.extra_night_2pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.extra_night_2pax).toLocaleString()}</td>` : ""}
                                                                                ${rate.extra_night_3pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.extra_night_3pax).toLocaleString()}</td>` : ""}
                                                                                ${rate.extra_night_4pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.extra_night_4pax).toLocaleString()}</td>` : ""}
                                                                                ${rate.extra_night_5pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.extra_night_5pax).toLocaleString()}</td>` : ""}
                                                                                ${rate.extra_night_6pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.extra_night_6pax).toLocaleString()}</td>` : ""}
                                                                                ${rate.extra_night_7pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.extra_night_7pax).toLocaleString()}</td>` : ""}
                                                                                ${rate.extra_night_8pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.extra_night_8pax).toLocaleString()}</td>` : ""}
                                                                                ${rate.extra_night_9pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.extra_night_9pax).toLocaleString()}</td>` : ""}
                                                                                ${rate.extra_night_10pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.extra_night_10pax).toLocaleString()}</td>` : ""}
                                                                                ${rate.extra_night_11pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.extra_night_11pax).toLocaleString()}</td>` : ""}
                                                                                ${rate.extra_night_12pax ? `<td class="px-3 py-2 text-right">₱${Number(rate.extra_night_12pax).toLocaleString()}</td>` : ""}
                                                                                ${rate.extra_night_child_no_breakfast ? `<td class="px-3 py-2 text-right">₱${Number(rate.extra_night_child_no_breakfast).toLocaleString()}</td>` : ""}
                                                                            </tr>
                                                                        `,
                                                                          )
                                                                          .join(
                                                                            "",
                                                                          )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                        `
                                                            : ""
                                                        }
                                                        
                                                        ${
                                                          group.rates.some(
                                                            (r) =>
                                                              r.breakfast_included,
                                                          )
                                                            ? `
                                                        <div class="mt-2">
                                                            <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">🍳 Breakfast Included</span>
                                                        </div>
                                                        `
                                                            : ""
                                                        }
                                                        
                                                        ${
                                                          group.rates.some(
                                                            (r) =>
                                                              r.additional_info,
                                                          )
                                                            ? `
                                                        <div class="mt-2 text-sm text-gray-600">
                                                            <strong>ℹ️ Additional Info:</strong> ${this.escapeHtml(group.rates[0].additional_info)}
                                                        </div>
                                                        `
                                                            : ""
                                                        }
                                                    </div>
                                                `,
                                                  )
                                                  .join("")}
                                            </div>
                                        </div>
                                        `;
                                      })
                                      .join("")}
                                </div>
                                `
                                    : '<div class="text-center text-gray-500 py-4">No rates configured for this package</div>'
                                }
                                
                                ${
                                  data.inclusions.filter(
                                    (i) => i.package_id === pkg.id,
                                  ).length > 0
                                    ? `
                                <div class="mt-4 pt-4 border-t">
                                    <h6 class="font-medium text-sm text-green-700 mb-2">✅ Inclusions</h6>
                                    <div class="flex flex-wrap gap-2">
                                        ${data.inclusions
                                          .filter(
                                            (i) => i.package_id === pkg.id,
                                          )
                                          .map(
                                            (inc) =>
                                              `<span class="text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full">${this.escapeHtml(inc.inclusion_text)}</span>`,
                                          )
                                          .join("")}
                                    </div>
                                </div>
                                `
                                    : ""
                                }
                                
                                ${
                                  data.exclusions.filter(
                                    (e) => e.package_id === pkg.id,
                                  ).length > 0
                                    ? `
                                <div class="mt-4">
                                    <h6 class="font-medium text-sm text-red-700 mb-2">❌ Exclusions</h6>
                                    <div class="flex flex-wrap gap-2">
                                        ${data.exclusions
                                          .filter(
                                            (e) => e.package_id === pkg.id,
                                          )
                                          .map(
                                            (exc) =>
                                              `<span class="text-sm bg-red-50 text-red-700 px-3 py-1 rounded-full">${this.escapeHtml(exc.exclusion_text)}</span>`,
                                          )
                                          .join("")}
                                    </div>
                                </div>
                                `
                                    : ""
                                }
                                
                                ${
                                  data.itineraries.filter(
                                    (i) => i.package_id === pkg.id,
                                  ).length > 0
                                    ? `
                                <div class="mt-4">
                                    <h6 class="font-medium text-sm text-indigo-700 mb-2">📅 Itineraries</h6>
                                    <div class="space-y-2">
                                        ${data.itineraries
                                          .filter(
                                            (i) => i.package_id === pkg.id,
                                          )
                                          .sort(
                                            (a, b) =>
                                              a.day_number - b.day_number,
                                          )
                                          .map(
                                            (iti) => `
                                            <div class="bg-indigo-50 rounded-lg p-3">
                                                <div class="font-semibold text-indigo-800">Day ${iti.day_number}: ${iti.day_title || ""}</div>
                                                <div class="text-sm text-gray-700 mt-1 whitespace-pre-line">${iti.day_description ? (Array.isArray(iti.day_description) ? iti.day_description.join("\n") : iti.day_description) : ""}</div>
                                            </div>
                                        `,
                                          )
                                          .join("")}
                                    </div>
                                </div>
                                `
                                    : ""
                                }
                            </div>
                        </div>
                        `;
                      })
                      .join("")}
                </div>
            </div>
            `
                : ""
            }

            <!-- Optional Tours -->
            ${
              data.optionalTours && data.optionalTours.length > 0
                ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center"><i class="fas fa-umbrella-beach text-pink-600 mr-2"></i>Optional Tours (${data.optionalTours.length})</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${data.optionalTours
                      .map((tour) => {
                        const tourRates = data.optionalTourRates.filter(
                          (r) => r.tour_id === tour.id,
                        );
                        return `
                        <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <h5 class="font-semibold text-gray-800">${this.escapeHtml(tour.name)}</h5>
                            ${tour.description ? `<p class="text-sm text-gray-500 mt-1">${this.escapeHtml(tour.description)}</p>` : ""}
                            ${
                              tourRates.length > 0
                                ? `
                            <div class="mt-3 pt-3 border-t">
                                <div class="text-xs font-medium text-gray-500 mb-2">Rates (per person)</div>
                                <div class="grid grid-cols-2 gap-2 text-sm">
                                    ${tourRates
                                      .map(
                                        (rate) => `
                                        ${rate.rate_solo ? `<div class="flex justify-between"><span class="text-gray-600">Solo:</span><span class="font-medium">₱${Number(rate.rate_solo).toLocaleString()}</span></div>` : ""}
                                        ${rate.rate_2pax ? `<div class="flex justify-between"><span class="text-gray-600">2 Pax:</span><span class="font-medium">₱${Number(rate.rate_2pax).toLocaleString()}</span></div>` : ""}
                                        ${rate.rate_3pax ? `<div class="flex justify-between"><span class="text-gray-600">3 Pax:</span><span class="font-medium">₱${Number(rate.rate_3pax).toLocaleString()}</span></div>` : ""}
                                        ${rate.rate_4pax ? `<div class="flex justify-between"><span class="text-gray-600">4 Pax:</span><span class="font-medium">₱${Number(rate.rate_4pax).toLocaleString()}</span></div>` : ""}
                                        ${rate.rate_5pax ? `<div class="flex justify-between"><span class="text-gray-600">5 Pax:</span><span class="font-medium">₱${Number(rate.rate_5pax).toLocaleString()}</span></div>` : ""}
                                        ${rate.rate_6pax ? `<div class="flex justify-between"><span class="text-gray-600">6 Pax:</span><span class="font-medium">₱${Number(rate.rate_6pax).toLocaleString()}</span></div>` : ""}
                                        ${rate.rate_child_4_9 ? `<div class="flex justify-between"><span class="text-gray-600">Child (4-9):</span><span class="font-medium">₱${Number(rate.rate_child_4_9).toLocaleString()}</span></div>` : ""}
                                    `,
                                      )
                                      .join("")}
                                </div>
                            </div>
                            `
                                : ""
                            }
                        </div>
                    `;
                      })
                      .join("")}
                </div>
            </div>
            `
                : `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center"><i class="fas fa-umbrella-beach text-pink-600 mr-2"></i>Optional Tours</h4>
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-info-circle text-4xl mb-2"></i>
                    <p>No optional tours available for this destination.</p>
                    <p class="text-sm">Optional tours can be added when editing the destination.</p>
                </div>
            </div>
            `
            }
        </div>
    `;
  },
  showAddDestinationModal: function () {
    if (typeof CreateDestination !== "undefined") {
      CreateDestination.showDestinationModal();
    }
  },

  showAllDataModal: async function () {
    alert("Summary view coming soon!");
  },

  closeViewModal: function () {
    const container = document.getElementById("view-modal-container");
    if (container) container.innerHTML = "";
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
