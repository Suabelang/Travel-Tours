// ============================================
// DESTINATIONS GRID AND MODALS - WITH REAL-TIME AUTO-FETCH
// ============================================

if (typeof window.DestinationsManager !== "undefined") {
  console.log(
    "⚠️ DestinationsManager already loaded, skipping redefinition...",
  );
} else {
  class DestinationsManager {
    constructor() {
      this.spinner = document.getElementById("loadingSpinner");
      this.grid = document.getElementById("destinationsGrid");
      this.errorMsg = document.getElementById("errorMessage");
      this.modal = document.getElementById("detailModal");
      this.detailContent = document.getElementById("detailContent");
      this.destinations = [];
      this.filteredDestinations = [];
      this.images = [];
      this.currentPackage = "";
      this.currentPackageId = null;
      this.currentImageIndex = 0;
      this.carouselInterval = null;
      this.currentDestination = null;
      this.currentPackageIndex = 0;
      this.currentFilter = "all";
      this.currentSubFilter = "all";
      this.hotelCategories = [];
      this.realtimeSubscription = null;
    }

    // ============================================
    // HELPER FUNCTIONS FOR FORMATTING
    // ============================================

    formatItinerary(itinerary) {
      if (!itinerary)
        return '<p class="text-gray-500 italic">No itinerary available</p>';

      const items = Array.isArray(itinerary) ? itinerary : [itinerary];

      return `
        <div class="space-y-4">
          ${items
            .map(
              (item, index) => `
            <div class="flex items-start gap-3 bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500">
              <div class="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                ${index + 1}
              </div>
              <div class="flex-1">
                <p class="text-gray-700 leading-relaxed">${item}</p>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      `;
    }

    formatInclusions(inclusions) {
      if (!inclusions || inclusions.length === 0) {
        return '<p class="text-gray-500 italic">No inclusions specified</p>';
      }

      const items = Array.isArray(inclusions) ? inclusions : [inclusions];

      return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${items
            .map(
              (item) => `
            <div class="flex items-start gap-2 bg-green-50 p-3 rounded-lg border border-green-200">
              <i class="fas fa-check-circle text-green-500 mt-1 flex-shrink-0"></i>
              <span class="text-sm text-gray-700">${item}</span>
            </div>
          `,
            )
            .join("")}
        </div>
      `;
    }

    formatExclusions(exclusions) {
      if (!exclusions || exclusions.length === 0) {
        return '<p class="text-gray-500 italic">No exclusions specified</p>';
      }

      const items = Array.isArray(exclusions) ? exclusions : [exclusions];

      return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${items
            .map(
              (item) => `
            <div class="flex items-start gap-2 bg-red-50 p-3 rounded-lg border border-red-200">
              <i class="fas fa-times-circle text-red-500 mt-1 flex-shrink-0"></i>
              <span class="text-sm text-gray-700">${item}</span>
            </div>
          `,
            )
            .join("")}
        </div>
      `;
    }

    formatHighlights(highlights) {
      if (!highlights) return "";

      const items = Array.isArray(highlights)
        ? highlights
        : highlights.split("\n").filter((h) => h.trim());

      return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${items
            .map(
              (item) => `
            <div class="flex items-start gap-2 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <i class="fas fa-star text-yellow-500 mt-1 flex-shrink-0"></i>
              <span class="text-sm text-gray-700">${item}</span>
            </div>
          `,
            )
            .join("")}
        </div>
      `;
    }

    formatAmenities(amenities) {
      if (!amenities || amenities.length === 0) return "";

      const items = Array.isArray(amenities)
        ? amenities
        : amenities.split(",").map((a) => a.trim());

      return `
        <div class="flex flex-wrap gap-2">
          ${items
            .map(
              (item) => `
            <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
              <i class="fas fa-check-circle"></i>
              ${item}
            </span>
          `,
            )
            .join("")}
        </div>
      `;
    }

    formatPackageItinerary(itineraries) {
      if (!itineraries || itineraries.length === 0) {
        return '<p class="text-gray-500 italic">No itinerary available</p>';
      }

      return `
        <div class="relative">
          <!-- Timeline line -->
          <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-500 to-teal-600"></div>
          
          <div class="space-y-6">
            ${itineraries
              .map((iti, index) => {
                const dayNumber = iti.day_number || index + 1;
                const title = iti.day_title || `Day ${dayNumber}`;
                const description = iti.day_description
                  ? Array.isArray(iti.day_description)
                    ? iti.day_description
                    : [iti.day_description]
                  : [];

                return `
                <div class="relative pl-12">
                  <!-- Day marker -->
                  <div class="absolute left-0 top-0 w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    ${dayNumber}
                  </div>
                  
                  <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <h5 class="font-bold text-teal-700 mb-3 flex items-center gap-2">
                      <i class="fas fa-sun"></i>
                      ${title}
                    </h5>
                    
                    ${
                      description.length > 0
                        ? `
                      <div class="space-y-3 mb-3">
                        ${description
                          .map(
                            (desc) => `
                          <div class="flex items-start gap-2">
                            <i class="fas fa-clock text-orange-500 mt-1 text-sm"></i>
                            <p class="text-sm text-gray-600">${desc}</p>
                          </div>
                        `,
                          )
                          .join("")}
                      </div>
                    `
                        : ""
                    }
                    
                    ${
                      iti.meals_included
                        ? `
                      <div class="mt-3 flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                        <i class="fas fa-utensils"></i>
                        <span>${iti.meals_included}</span>
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
      `;
    }

    formatTourItinerary(itinerary) {
      if (!itinerary || itinerary.length === 0) {
        return '<p class="text-gray-500 italic">No itinerary available</p>';
      }

      const items = Array.isArray(itinerary)
        ? itinerary
        : itinerary.split("\n").filter((i) => i.trim());

      return `
        <div class="space-y-3">
          ${items
            .map((item, index) => {
              // Try to extract time if present (e.g., "08:00 AM - Activity")
              const timeMatch = item.match(
                /(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[-–]\s*(.*)/i,
              );

              if (timeMatch) {
                const time = timeMatch[1];
                const activity = timeMatch[2];
                return `
                <div class="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
                  <div class="flex-shrink-0 w-16 text-sm font-bold text-orange-600">
                    ${time}
                  </div>
                  <div class="flex-1">
                    <p class="text-sm text-gray-700">${activity}</p>
                  </div>
                </div>
              `;
              } else {
                return `
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                    <span class="text-xs font-bold text-orange-600">${index + 1}</span>
                  </div>
                  <p class="text-sm text-gray-700">${item}</p>
                </div>
              `;
              }
            })
            .join("")}
        </div>
      `;
    }

    formatRatesTable(rates, type = "hotel") {
      if (!rates || rates.length === 0) return "";

      if (type === "hotel") {
        return `
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                  <th class="p-3 text-left rounded-tl-lg">Room Type</th>
                  <th class="p-3 text-center">Solo</th>
                  <th class="p-3 text-center">2 Pax</th>
                  <th class="p-3 text-center">3 Pax</th>
                  <th class="p-3 text-center">4 Pax</th>
                  <th class="p-3 text-center">5 Pax</th>
                  <th class="p-3 text-center rounded-tr-lg">Child</th>
                </tr>
              </thead>
              <tbody>
                ${rates
                  .map((rate) => {
                    const category = this.hotelCategories?.find(
                      (c) => c.id === rate.hotel_category_id,
                    );
                    return `
                    <tr class="border-b border-gray-200 hover:bg-orange-50">
                      <td class="p-3 font-medium">${category?.category_name || "Standard"}</td>
                      <td class="p-3 text-center">${this.formatCurrency(rate.rate_solo)}</td>
                      <td class="p-3 text-center">${this.formatCurrency(rate.rate_2pax)}</td>
                      <td class="p-3 text-center">${this.formatCurrency(rate.rate_3pax)}</td>
                      <td class="p-3 text-center">${this.formatCurrency(rate.rate_4pax)}</td>
                      <td class="p-3 text-center">${this.formatCurrency(rate.rate_5pax)}</td>
                      <td class="p-3 text-center">${this.formatCurrency(rate.rate_child_no_breakfast)}</td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        `;
      }

      return "";
    }

    formatTransportation(transportation) {
      if (!transportation || transportation.length === 0) return "";

      return `
        <div class="space-y-3">
          ${transportation
            .map((item) => {
              const mode = item.transportation_mode || {};
              const icon = mode.icon || this.getTransportIcon(mode.name);

              return `
              <div class="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <div class="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  <i class="fas ${icon} text-lg"></i>
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-1">
                    <h6 class="font-semibold text-gray-800">${mode.name || "Transportation"}</h6>
                    <span class="px-3 py-1 text-xs rounded-full ${
                      item.is_included
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }">
                      ${item.is_included ? "✓ Included" : "✗ Optional"}
                    </span>
                  </div>
                  ${
                    item.description
                      ? `
                    <p class="text-sm text-gray-600">${item.description}</p>
                  `
                      : ""
                  }
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      `;
    }

    getTransportIcon(modeName) {
      const icons = {
        van: "fa-shuttle-van",
        bus: "fa-bus",
        car: "fa-car",
        taxi: "fa-taxi",
        boat: "fa-ship",
        ferry: "fa-ferry",
        plane: "fa-plane",
        walk: "fa-walking",
        default: "fa-truck",
      };

      const lowerName = modeName?.toLowerCase() || "";
      for (const [key, icon] of Object.entries(icons)) {
        if (lowerName.includes(key)) return icon;
      }
      return icons.default;
    }

    // ============================================
    // TOUR DETAILS MODAL
    // ============================================
    showTourDetails(tour, rates) {
      console.log("🎯 Showing tour details:", tour);
      if (!tour) {
        alert("No tour data available");
        return;
      }

      const existingModal = document.getElementById("tourDetailsModal");
      if (existingModal) existingModal.remove();

      const modal = document.createElement("div");
      modal.id = "tourDetailsModal";
      modal.className =
        "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[999999] overflow-y-auto";

      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.closeTourDetailsModal();
      });

      // Build rate items
      const rateItems = [];
      const rateFields = [
        { key: "rate_solo", label: "Solo (1 person)" },
        { key: "rate_2pax", label: "2 Persons" },
        { key: "rate_3pax", label: "3 Persons" },
        { key: "rate_4pax", label: "4 Persons" },
        { key: "rate_5pax", label: "5 Persons" },
        { key: "rate_6pax", label: "6 Persons" },
        { key: "rate_7pax", label: "7 Persons" },
        { key: "rate_8pax", label: "8 Persons" },
        { key: "rate_9pax", label: "9 Persons" },
        { key: "rate_10pax", label: "10 Persons" },
        { key: "rate_11pax", label: "11 Persons" },
        { key: "rate_12pax", label: "12 Persons" },
        { key: "rate_child_4_9", label: "Child (4-9 years)" },
      ];

      rateFields.forEach((field) => {
        if (rates?.[field.key] && parseFloat(rates[field.key]) > 0) {
          rateItems.push({
            label: field.label,
            value: rates[field.key],
          });
        }
      });

      const ratesHtml =
        rateItems.length > 0
          ? `
        <div class="bg-orange-50 p-6 rounded-xl border-2 border-orange-200">
          <h3 class="text-xl font-bold text-orange-800 mb-4 flex items-center gap-2">
            <i class="fas fa-tag"></i>
            Tour Rates
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${rateItems
              .map(
                (item) => `
              <div class="bg-white p-4 rounded-lg shadow-sm border border-orange-100">
                <p class="text-xs text-gray-500 mb-1">${item.label}</p>
                <p class="text-xl font-bold text-orange-600">₱${Number(item.value).toLocaleString()}</p>
                <p class="text-xs text-gray-400">per person</p>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `
          : "";

      modal.innerHTML = `
        <div class="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden">
          <!-- Header -->
          <div class="bg-gradient-to-r from-orange-500 to-teal-700 p-6 text-white">
            <div class="flex justify-between items-start">
              <div>
                <h2 class="text-3xl font-bold mb-2">${tour.tour_name || "Tour Details"}</h2>
                <div class="flex items-center gap-4 text-sm">
                  ${
                    tour.duration_hours
                      ? `
                    <span class="flex items-center gap-1">
                      <i class="far fa-clock"></i> ${tour.duration_hours}
                    </span>
                  `
                      : ""
                  }
                  ${
                    tour.location
                      ? `
                    <span class="flex items-center gap-1">
                      <i class="fas fa-map-marker-alt"></i> ${tour.location}
                    </span>
                  `
                      : ""
                  }
                </div>
              </div>
              <button onclick="destinationsManager.closeTourDetailsModal()" class="text-3xl hover:text-white/80 transition">&times;</button>
            </div>
          </div>
          
          <!-- Content -->
          <div class="p-8 max-h-[80vh] overflow-y-auto">
            ${
              tour.image_url
                ? `
              <div class="mb-8 rounded-xl overflow-hidden shadow-lg">
                <img src="${tour.image_url}" alt="${tour.tour_name}" class="w-full h-96 object-cover">
              </div>
            `
                : ""
            }
            
            ${
              tour.description
                ? `
              <div class="mb-8">
                <h3 class="text-xl font-bold text-teal-700 mb-4 flex items-center gap-2">
                  <i class="fas fa-info-circle"></i>
                  Description
                </h3>
                <div class="bg-blue-50 p-6 rounded-xl border border-blue-200">
                  <p class="text-gray-700 leading-relaxed">${tour.description}</p>
                </div>
              </div>
            `
                : ""
            }
            
            ${
              tour.highlights
                ? `
              <div class="mb-8">
                <h3 class="text-xl font-bold text-teal-700 mb-4 flex items-center gap-2">
                  <i class="fas fa-star"></i>
                  Highlights
                </h3>
                ${this.formatHighlights(tour.highlights)}
              </div>
            `
                : ""
            }
            
            <div class="mb-8">
              <h3 class="text-xl font-bold text-teal-700 mb-4 flex items-center gap-2">
                <i class="fas fa-clipboard-list"></i>
                Tour Information
              </h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                ${
                  tour.min_pax
                    ? `
                  <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p class="text-xs text-gray-500 mb-1">Minimum Pax</p>
                    <p class="font-bold text-lg text-gray-800">${tour.min_pax}</p>
                  </div>
                `
                    : ""
                }
                ${
                  tour.max_pax
                    ? `
                  <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p class="text-xs text-gray-500 mb-1">Maximum Pax</p>
                    <p class="font-bold text-lg text-gray-800">${tour.max_pax}</p>
                  </div>
                `
                    : ""
                }
                ${
                  tour.difficulty_level
                    ? `
                  <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p class="text-xs text-gray-500 mb-1">Difficulty</p>
                    <p class="font-bold text-lg text-gray-800">${tour.difficulty_level}</p>
                  </div>
                `
                    : ""
                }
                ${
                  tour.location
                    ? `
                  <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p class="text-xs text-gray-500 mb-1">Location</p>
                    <p class="font-bold text-lg text-gray-800">${tour.location}</p>
                  </div>
                `
                    : ""
                }
              </div>
            </div>
            
            ${
              tour.itinerary && tour.itinerary.length > 0
                ? `
              <div class="mb-8">
                <h3 class="text-xl font-bold text-teal-700 mb-4 flex items-center gap-2">
                  <i class="fas fa-map-signs"></i>
                  Tour Itinerary
                </h3>
                <div class="bg-indigo-50 p-6 rounded-xl border border-indigo-200">
                  ${this.formatTourItinerary(tour.itinerary)}
                </div>
              </div>
            `
                : ""
            }
            
            ${
              tour.inclusions && tour.inclusions.length > 0
                ? `
              <div class="mb-8">
                <h3 class="text-xl font-bold text-teal-700 mb-4 flex items-center gap-2">
                  <i class="fas fa-check-circle text-green-600"></i>
                  Inclusions
                </h3>
                <div class="bg-green-50 p-6 rounded-xl border border-green-200">
                  ${this.formatInclusions(tour.inclusions)}
                </div>
              </div>
            `
                : ""
            }
            
            ${
              tour.exclusions && tour.exclusions.length > 0
                ? `
              <div class="mb-8">
                <h3 class="text-xl font-bold text-teal-700 mb-4 flex items-center gap-2">
                  <i class="fas fa-times-circle text-red-600"></i>
                  Exclusions
                </h3>
                <div class="bg-red-50 p-6 rounded-xl border border-red-200">
                  ${this.formatExclusions(tour.exclusions)}
                </div>
              </div>
            `
                : ""
            }
            
            ${ratesHtml}
            
            ${
              tour.terms_conditions
                ? `
              <div class="mb-8">
                <h3 class="text-xl font-bold text-teal-700 mb-4 flex items-center gap-2">
                  <i class="fas fa-file-contract"></i>
                  Terms & Conditions
                </h3>
                <div class="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <p class="text-gray-600 leading-relaxed">${tour.terms_conditions}</p>
                </div>
              </div>
            `
                : ""
            }
            
            ${
              tour.important_notes
                ? `
              <div class="mb-8">
                <h3 class="text-xl font-bold text-teal-700 mb-4 flex items-center gap-2">
                  <i class="fas fa-exclamation-triangle text-red-600"></i>
                  Important Notes
                </h3>
                <div class="bg-red-50 p-6 rounded-xl border border-red-200">
                  <p class="text-gray-700">${tour.important_notes}</p>
                </div>
              </div>
            `
                : ""
            }
            
            <button onclick="destinationsManager.closeTourDetailsModal()" 
                    class="w-full py-4 bg-gradient-to-r from-orange-500 to-teal-700 text-white rounded-xl font-bold text-lg hover:opacity-90 transition">
              CLOSE
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
    }

    closeTourDetailsModal() {
      const modal = document.getElementById("tourDetailsModal");
      if (modal) modal.remove();
    }

    // ============================================
    // REAL-TIME SUBSCRIPTIONS
    // ============================================
    setupRealtimeSubscriptions() {
      console.log("🔄 Setting up real-time subscriptions...");

      // Cancel existing subscription
      if (this.realtimeSubscription) {
        window.sns_supabase_client.removeChannel(this.realtimeSubscription);
      }

      // Listen for changes sa mga relevant tables
      this.realtimeSubscription = window.sns_supabase_client
        .channel("destinations-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "destinations",
          },
          (payload) => {
            console.log("🔄 Destination changed:", payload);
            this.refreshDestinations();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "destination_packages",
          },
          (payload) => {
            console.log("🔄 Package changed:", payload);
            this.refreshDestinations();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "optional_tours",
          },
          (payload) => {
            console.log("🔄 Optional tour changed:", payload);
            this.refreshDestinations();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "optional_tour_rates",
          },
          (payload) => {
            console.log("💰 Optional tour rate changed:", payload);
            this.refreshDestinations();

            // If booking modal is open, refresh current package
            if (document.getElementById("bookingModal")) {
              this.refreshCurrentPackage();
            }
          },
        )
        .subscribe((status) => {
          console.log("📡 Subscription status:", status);
        });
    }

    async refreshDestinations() {
      console.log("🔄 Refreshing destinations due to change...");

      try {
        const { data: destinations, error } = await window.sns_supabase_client
          .from("destinations")
          .select(
            `
            *,
            destination_images (*),
            destination_packages (
              *,
              package_hotel_rates (*),
              package_inclusions (*),
              package_exclusions (*),
              package_itineraries (*),
              package_optional_tours (
                *,
                optional_tours (
                  *,
                  optional_tour_rates (*)
                )
              ),
              package_transportation (
                *,
                transportation_mode:transportation_mode_id (*)
              )
            ),
            hotel_categories (
              *,
              hotels (*)
            )
          `,
          )
          .order("name");

        if (error) throw error;

        this.destinations = Array.isArray(destinations) ? destinations : [];
        this.filteredDestinations = [...this.destinations];

        console.log(`✅ Destinations refreshed: ${this.destinations.length}`);

        // Re-render lahat
        this.renderFilterButtons();
        this.renderDestinations(this.filteredDestinations);

        // If modal is open, refresh it
        if (
          this.modal?.classList.contains("active") &&
          this.currentDestination
        ) {
          this.showDestinationModal(this.currentDestination.id);
        }
      } catch (error) {
        console.error("❌ Error refreshing destinations:", error);
      }
    }

    async refreshCurrentPackage() {
      if (!this.currentPackageId) return;

      try {
        const { data, error } = await window.sns_supabase_client
          .from("destination_packages")
          .select(
            `
            *,
            package_optional_tours (
              *,
              optional_tours (
                *,
                optional_tour_rates (*)
              )
            )
          `,
          )
          .eq("id", this.currentPackageId)
          .single();

        if (!error && data) {
          console.log("✅ Refreshed current package:", data);
          this.currentPackageData = data;

          // Show notification
          this.showToast("🔄 Package rates updated!");
        }
      } catch (error) {
        console.error("❌ Error refreshing package:", error);
      }
    }

    showToast(message) {
      const toast = document.createElement("div");
      toast.className =
        "fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-[999999] animate-fade-in";
      toast.innerHTML = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    // ============================================
    // LOAD DESTINATIONS
    // ============================================
    async loadDestinations() {
      try {
        this.showLoading();

        const { data: destinations, error } = await window.sns_supabase_client
          .from("destinations")
          .select(
            `
            *,
            destination_images (*),
            destination_packages (
              *,
              package_hotel_rates (*),
              package_inclusions (*),
              package_exclusions (*),
              package_itineraries (*),
              package_optional_tours (
                *,
                optional_tours (
                  *,
                  optional_tour_rates (*)
                )
              ),
              package_transportation (
                *,
                transportation_mode:transportation_mode_id (*)
              )
            ),
            hotel_categories (
              *,
              hotels (*)
            )
          `,
          )
          .order("name");

        if (error) throw error;

        this.destinations = Array.isArray(destinations) ? destinations : [];
        this.filteredDestinations = [...this.destinations];

        console.log(`✅ Destinations loaded: ${this.destinations.length}`);

        // Setup real-time subscriptions
        this.setupRealtimeSubscriptions();

        this.renderFilterButtons();
        this.renderDestinations(this.filteredDestinations);
        this.hideLoading();
      } catch (error) {
        console.error("❌ Error loading destinations:", error);
        this.destinations = [];
        this.filteredDestinations = [];
        this.renderFilterButtons();
        this.renderDestinations([]);
        this.hideLoading();
        this.showError(error.message);
      }
    }

    // ============================================
    // RENDER FILTER BUTTONS
    // ============================================
    renderFilterButtons() {
      const filterContainer = document.getElementById("filterButtons");
      if (!filterContainer) return;

      const destinations = Array.isArray(this.destinations)
        ? this.destinations
        : [];

      const localCount = destinations.filter(
        (d) => d.country === "Philippines",
      ).length;

      const intlCount = destinations.filter(
        (d) => d.country !== "Philippines",
      ).length;

      const domesticCount = destinations.filter((dest) =>
        dest.destination_packages?.some(
          (pkg) => pkg.tour_category === "Domestic",
        ),
      ).length;

      const landCount = destinations.filter((dest) =>
        dest.destination_packages?.some(
          (pkg) => pkg.tour_category === "Land Tours",
        ),
      ).length;

      const promoCount = destinations.filter((d) => {
        return d.destination_packages?.some((pkg) => {
          const category = (pkg.tour_category || "").toUpperCase().trim();
          return category === "PROMO";
        });
      }).length;

      filterContainer.innerHTML = `
        <div class="flex flex-wrap gap-3 mb-6 justify-center">
          <button class="filter-btn px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2
            ${this.currentFilter === "all" ? "bg-gradient-to-r from-[#076653] to-[#0a8a6e] text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"}"
            data-filter="all">
            <i class="fas fa-globe-asia"></i> All Destinations 
            <span class="ml-1 text-xs ${this.currentFilter === "all" ? "text-white/80" : "text-gray-500"}">(${destinations.length})</span>
          </button>
          
          <button class="filter-btn px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2
            ${this.currentFilter === "local" ? "bg-gradient-to-r from-green-600 to-green-700 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"}"
            data-filter="local">
            <i class="fas fa-map-pin"></i> Local 
            <span class="ml-1 text-xs ${this.currentFilter === "local" ? "text-white/80" : "text-gray-500"}">(${localCount})</span>
          </button>
          
          <button class="filter-btn px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2
            ${this.currentFilter === "international" ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"}"
            data-filter="international">
            <i class="fas fa-plane"></i> International 
            <span class="ml-1 text-xs ${this.currentFilter === "international" ? "text-white/80" : "text-gray-500"}">(${intlCount})</span>
          </button>
          
          <button class="filter-btn px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2
            ${this.currentFilter === "promo" ? "bg-gradient-to-r from-red-500 to-red-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"}"
            data-filter="promo">
            <i class="fas fa-tag"></i> Promo 
            <span class="ml-1 text-xs ${this.currentFilter === "promo" ? "text-white/80" : "text-gray-500"}">(${promoCount})</span>
          </button>
        </div>
        
        <div id="subFilterContainer" class="flex flex-wrap gap-2 mb-6 justify-center ${this.currentFilter === "all" || this.currentFilter === "promo" ? "hidden" : ""}">
          <button class="sub-filter-btn px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 flex items-center gap-1
            ${this.currentSubFilter === "all" ? "bg-[#f97316] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}"
            data-subfilter="all">
            <i class="fas fa-th-large"></i> All
          </button>
          
          <button class="sub-filter-btn px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 flex items-center gap-1
            ${this.currentSubFilter === "domestic" ? "bg-[#f97316] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}"
            data-subfilter="domestic">
            <i class="fas fa-home"></i> Domestic Tours 
            <span class="ml-1 text-xs ${this.currentSubFilter === "domestic" ? "text-white/80" : "text-gray-500"}">(${domesticCount})</span>
          </button>
          
          <button class="sub-filter-btn px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 flex items-center gap-1
            ${this.currentSubFilter === "land" ? "bg-[#f97316] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}"
            data-subfilter="land">
            <i class="fas fa-mountain"></i> Land Tours 
            <span class="ml-1 text-xs ${this.currentSubFilter === "land" ? "text-white/80" : "text-gray-500"}">(${landCount})</span>
          </button>
        </div>
      `;

      document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          this.applyFilter(btn.dataset.filter);
        });
      });

      document.querySelectorAll(".sub-filter-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          this.applySubFilter(btn.dataset.subfilter);
        });
      });
    }

    // ============================================
    // APPLY FILTER
    // ============================================
    applyFilter(filter) {
      console.log(`🔍 Applying filter: ${filter}`);
      this.currentFilter = filter;
      this.currentSubFilter = "all";

      const destinations = Array.isArray(this.destinations)
        ? this.destinations
        : [];

      if (filter === "all") {
        this.filteredDestinations = [...destinations];
      } else if (filter === "local") {
        this.filteredDestinations = destinations.filter(
          (d) => d.country === "Philippines",
        );
      } else if (filter === "international") {
        this.filteredDestinations = destinations.filter(
          (d) => d.country !== "Philippines",
        );
      } else if (filter === "promo") {
        this.filteredDestinations = destinations.filter((d) => {
          const hasPromo = d.destination_packages?.some((pkg) => {
            const category = (pkg.tour_category || "").toUpperCase().trim();
            return category === "PROMO";
          });
          return hasPromo;
        });
      }

      this.renderFilterButtons();
      this.renderDestinations(this.filteredDestinations);
    }

    applySubFilter(subFilter) {
      console.log(`🔍 Applying sub-filter: ${subFilter}`);
      this.currentSubFilter = subFilter;

      let baseFiltered = [];

      if (this.currentFilter === "local") {
        baseFiltered = this.destinations.filter(
          (d) => d.country === "Philippines",
        );
      } else if (this.currentFilter === "international") {
        baseFiltered = this.destinations.filter(
          (d) => d.country !== "Philippines",
        );
      } else {
        return;
      }

      if (subFilter === "all") {
        this.filteredDestinations = baseFiltered;
      } else if (subFilter === "domestic") {
        this.filteredDestinations = baseFiltered.filter((dest) => {
          return dest.destination_packages?.some((pkg) => {
            const category = (pkg.tour_category || "").toLowerCase().trim();
            return (
              category === "domestic" ||
              category.includes("domestic") ||
              category === "domestic tour"
            );
          });
        });
      } else if (subFilter === "land") {
        this.filteredDestinations = baseFiltered.filter((dest) => {
          return dest.destination_packages?.some((pkg) => {
            const category = (pkg.tour_category || "").toLowerCase().trim();
            return (
              category === "land tours" ||
              category.includes("land") ||
              category === "land tour"
            );
          });
        });
      }

      this.renderFilterButtons();
      this.renderDestinations(this.filteredDestinations);
    }

    // ============================================
    // RENDER DESTINATIONS
    // ============================================
    renderDestinations(destinations) {
      if (!this.grid) return;

      if (destinations.length === 0) {
        this.grid.innerHTML = `
          <div class="col-span-full text-center py-12">
            <div class="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <i class="fas fa-map-pin text-3xl text-gray-400"></i>
            </div>
            <h3 class="text-xl font-bold text-gray-700 mb-2">No destinations found</h3>
            <p class="text-gray-500">Try selecting a different filter</p>
          </div>
        `;
        return;
      }

      this.grid.innerHTML = destinations
        .map((dest) => {
          const imageUrl =
            dest.destination_images && dest.destination_images.length > 0
              ? dest.destination_images[0].url
              : "";

          let badgeClass = "",
            badgeText = "",
            badgeIcon = "";
          if (dest.country === "Philippines") {
            badgeClass = "bg-green-600 text-white";
            badgeText = "Local";
            badgeIcon = "🇵🇭";
          } else {
            badgeClass = "bg-blue-600 text-white";
            badgeText = "International";
            badgeIcon = "🌍";
          }

          const hasPromo = dest.destination_packages?.some((pkg) => {
            const category = (pkg.tour_category || "").toUpperCase().trim();
            return category === "PROMO";
          });

          const tourCategories =
            dest.destination_packages
              ?.map((pkg) => pkg.tour_category)
              .filter((value, index, self) => {
                return (
                  value &&
                  self.indexOf(value) === index &&
                  value.toUpperCase() !== "PROMO"
                );
              }) || [];

          const categoryBadges = tourCategories
            .map((cat) => {
              let bgColor = "bg-gray-100 text-gray-700";
              let icon = "fa-tag";

              if (cat === "Domestic") {
                bgColor = "bg-purple-100 text-purple-700";
                icon = "fa-home";
              } else if (cat === "Land Tours") {
                bgColor = "bg-amber-100 text-amber-700";
                icon = "fa-mountain";
              }

              return `<span class="inline-flex items-center gap-1 px-2 py-0.5 ${bgColor} rounded-full text-[0.6rem] font-medium">
                <i class="fas ${icon}"></i> ${cat}
              </span>`;
            })
            .join("");

          return `
            <div class="destination-card group cursor-pointer" onclick='destinationsManager.showDestinationModal(${dest.id})'>
              <div class="relative overflow-hidden rounded-t-lg h-48">
                ${
                  imageUrl
                    ? `<img src="${imageUrl}" alt="${dest.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />`
                    : `<div class="w-full h-full bg-gray-100 flex items-center justify-center"><i class="fas fa-image text-gray-400 text-4xl"></i></div>`
                }
                <div class="absolute top-2 right-2 flex flex-col gap-1 items-end">
                  <span class="badge ${badgeClass} px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
                    <span>${badgeIcon}</span> ${badgeText}
                  </span>
                  
                  ${categoryBadges}
                  
                  ${
                    hasPromo
                      ? `
                    <span class="badge bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1 animate-pulse">
                      <i class="fas fa-tag"></i> PROMO
                    </span>
                  `
                      : ""
                  }
                </div>
              </div>
              <div class="p-4">
                <h3 class="text-xl font-bold text-gray-800 mb-2 group-hover:text-[#076653] transition">${dest.name}</h3>
                <p class="text-gray-600 text-sm mb-3 line-clamp-2">${dest.description?.substring(0, 100) || ""}...</p>
                <div class="flex justify-between items-center text-sm">
                  <span class="text-[#076653] font-semibold">${dest.airport_code || ""}</span>
                  <span class="text-gray-500">${dest.country || ""}</span>
                </div>
              </div>
            </div>
          `;
        })
        .join("");
    }

    // ============================================
    // SHOW DESTINATION MODAL
    // ============================================
    async showDestinationModal(destinationId) {
      console.log(`🎯 Loading destination ID: ${destinationId}`);

      if (!this.modal || !this.detailContent) {
        console.error("Modal elements not found!");
        return;
      }

      this.stopAutoCarousel();
      this.modal.classList.add("active");
      document.body.style.overflow = "hidden";

      this.detailContent.innerHTML = `
        <div class="flex items-center justify-center min-h-screen">
          <div class="text-center">
            <div class="loading-spinner mx-auto"></div>
            <p class="mt-4 text-gray-600">Loading destination details...</p>
          </div>
        </div>
      `;

      try {
        const { data: destination, error: destError } =
          await window.sns_supabase_client
            .from("destinations")
            .select(
              `
              *,
              destination_images (*),
              destination_packages (
                *,
                package_hotel_rates (*),
                package_inclusions (*),
                package_exclusions (*),
                package_itineraries (*),
                package_optional_tours (
                  *,
                  optional_tours (
                    *,
                    optional_tour_rates (*)
                  )
                ),
                package_transportation (
                  *,
                  transportation_mode:transportation_mode_id (*)
                )
              ),
              hotel_categories (
                *,
                hotels (*)
              )
            `,
            )
            .eq("id", destinationId)
            .single();

        if (destError) throw destError;
        if (!destination) throw new Error("Destination not found");

        console.log("✅ Destination loaded:", destination.name);

        this.currentDestination = destination;
        this.images = destination.destination_images || [];
        this.currentImageIndex = 0;
        this.hotelCategories = destination.hotel_categories || [];

        const packages = destination.destination_packages || [];
        const hotelCategories = this.hotelCategories;

        if (!packages.length) {
          console.log("❌ No packages found, showing destination only");
          this.renderDestinationOnly(destination);
          this.startAutoCarousel();
          return;
        }

        this.renderCompleteModal(destination, packages, hotelCategories);
        this.startAutoCarousel();
      } catch (error) {
        console.error("❌ Modal error:", error);
        this.showErrorInModal(error.message);
      }
    }

    renderCompleteModal(destination, packages, hotelCategories) {
      this.hotelCategories = hotelCategories;

      const primaryImage =
        destination.destination_images?.find((img) => img.is_primary) ||
        destination.destination_images?.[0];

      const galleryHtml =
        destination.destination_images?.length > 0
          ? `
            <div class="bg-white p-5 rounded-xl border-2 border-gray-200 mb-6">
              <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
                <i class="fas fa-images text-teal-600"></i>
                Photo Gallery
              </h3>
              <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                ${destination.destination_images
                  .map(
                    (img) => `
                  <div class="relative group rounded-lg overflow-hidden aspect-square cursor-pointer" onclick="destinationsManager.openImagePreview('${img.url}')">
                    <img src="${img.url}" alt="${img.alt_text || destination.name}" class="w-full h-full object-cover hover:scale-110 transition duration-300">
                    ${img.is_primary ? '<span class="absolute top-1 left-1 px-1.5 py-0.5 bg-emerald-500 text-white text-xs rounded">Primary</span>' : ""}
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>
          `
          : "";

      const overviewHtml = `
        <div class="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl border-2 border-indigo-100 mb-6">
          <div class="flex flex-col md:flex-row gap-6">
            <div class="md:w-1/3">
              <div class="aspect-video rounded-xl overflow-hidden shadow-lg">
                <img src="${primaryImage?.url || this.getDestinationImage(destination.name)}" 
                     alt="${destination.name}" class="w-full h-full object-cover">
              </div>
            </div>
            <div class="md:w-2/3">
              <h2 class="text-2xl font-bold text-teal-700 mb-2">${destination.name}</h2>
              <p class="text-gray-600 mb-4">${destination.description || "No description available."}</p>
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-white p-3 rounded-lg shadow-sm border">
                  <p class="text-xs text-gray-500">Country</p>
                  <p class="font-bold">${destination.country || "N/A"}</p>
                </div>
                <div class="bg-white p-3 rounded-lg shadow-sm border">
                  <p class="text-xs text-gray-500">Airport Code</p>
                  <p class="font-bold">${destination.airport_code || "N/A"}</p>
                </div>
                <div class="bg-white p-3 rounded-lg shadow-sm border">
                  <p class="text-xs text-gray-500">Status</p>
                  <span class="px-2 py-1 text-xs rounded-full ${destination.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}">
                    ${destination.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div class="bg-white p-3 rounded-lg shadow-sm border">
                  <p class="text-xs text-gray-500">Packages</p>
                  <p class="font-bold">${packages.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      const packageTabs =
        packages.length > 1
          ? `
            <div class="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
              ${packages
                .map(
                  (pkg, i) => `
                <button class="package-tab px-4 py-2 rounded-lg font-medium transition-all text-sm
                           ${i === 0 ? "bg-teal-700 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}"
                        onclick="destinationsManager.showPackage(${i})">
                  ${pkg.package_name || `Package ${i + 1}`}
                </button>
              `,
                )
                .join("")}
            </div>
          `
          : "";

      const packageContents = packages
        .map(
          (pkg, idx) => `
            <div class="package-content ${idx === 0 ? "block" : "hidden"}" id="modalPackage${idx}">
              <div class="space-y-6">
                <!-- Package Header -->
                <div class="bg-white p-5 rounded-xl border-2 border-gray-200">
                  <div class="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                      <h3 class="text-2xl font-bold text-teal-700">${pkg.package_name}</h3>
                      <p class="text-sm text-gray-600 mt-1">${pkg.package_code || ""} • ${pkg.tour_category || "Standard"}</p>
                      <div class="flex flex-wrap gap-2 mt-3">
                        <span class="px-3 py-1 text-xs rounded-full ${pkg.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}">
                          ${pkg.is_active ? "✓ Active" : "✗ Inactive"}
                        </span>
                        ${pkg.has_extra_night ? '<span class="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-700"><i class="fas fa-moon mr-1"></i>Extra Night Available</span>' : ""}
                      </div>
                    </div>
                    <button class="book-now-btn px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all hover:scale-105"
                            data-package-name="${pkg.package_name}" 
                            data-package-id="${pkg.id}">
                      <i class="fas fa-calendar-check mr-2"></i> BOOK NOW
                    </button>
                  </div>
                </div>

                <!-- Hotels Section -->
                ${
                  hotelCategories.length > 0
                    ? `
                  <div class="bg-white p-5 rounded-xl border-2 border-gray-200">
                    <h4 class="text-lg font-bold mb-4 flex items-center gap-2 text-teal-700">
                      <i class="fas fa-hotel"></i>
                      Hotels & Accommodations
                    </h4>
                    <div class="space-y-4">
                      ${hotelCategories
                        .map((cat) => {
                          const categoryHotels =
                            cat.hotels?.filter((h) => h.is_active) || [];

                          const categoryRates =
                            pkg.package_hotel_rates?.find(
                              (r) => r.hotel_category_id === cat.id,
                            ) || {};

                          return `
                          <div class="border rounded-lg overflow-hidden">
                            <div class="bg-blue-50 px-4 py-3">
                              <div class="flex items-center justify-between">
                                <div>
                                  <h5 class="font-bold text-blue-800">${cat.category_name}</h5>
                                  <p class="text-xs text-gray-600 mt-1 flex items-center gap-3">
                                    <span><i class="fas fa-users mr-1"></i>Max: ${cat.max_room_capacity || 4} pax</span>
                                    <span class="${cat.has_breakfast ? "text-green-600" : "text-gray-400"}">
                                      <i class="fas fa-${cat.has_breakfast ? "check" : "times"} mr-1"></i>
                                      ${cat.has_breakfast ? "Breakfast Included" : "No Breakfast"}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <!-- Hotel Rates Preview -->
                            ${
                              categoryRates.rate_solo || categoryRates.rate_2pax
                                ? `
                              <div class="p-3 bg-white border-b border-gray-200">
                                <p class="text-xs font-semibold text-orange-600 mb-2">Rates per person:</p>
                                <div class="grid grid-cols-3 gap-2 text-xs">
                                  ${categoryRates.rate_solo ? `<div><span class="text-gray-500">Solo:</span> <span class="font-bold">₱${categoryRates.rate_solo.toLocaleString()}</span></div>` : ""}
                                  ${categoryRates.rate_2pax ? `<div><span class="text-gray-500">2 Pax:</span> <span class="font-bold">₱${categoryRates.rate_2pax.toLocaleString()}</span></div>` : ""}
                                  ${categoryRates.rate_3pax ? `<div><span class="text-gray-500">3 Pax:</span> <span class="font-bold">₱${categoryRates.rate_3pax.toLocaleString()}</span></div>` : ""}
                                  ${categoryRates.rate_4pax ? `<div><span class="text-gray-500">4 Pax:</span> <span class="font-bold">₱${categoryRates.rate_4pax.toLocaleString()}</span></div>` : ""}
                                </div>
                              </div>
                            `
                                : ""
                            }
                            
                            ${
                              categoryHotels.length > 0
                                ? `
                              <div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                ${categoryHotels
                                  .map(
                                    (hotel) => `
                                  <div class="border rounded-lg p-4 hover:shadow-md transition bg-white">
                                    <div class="flex gap-4">
                                      <div class="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                        ${
                                          hotel.image_url
                                            ? `<img src="${hotel.image_url}" alt="${hotel.name}" class="w-full h-full object-cover">`
                                            : `<div class="w-full h-full flex items-center justify-center"><i class="fas fa-hotel text-gray-400 text-2xl"></i></div>`
                                        }
                                      </div>
                                      <div class="flex-1">
                                        <h6 class="font-bold text-gray-800">${hotel.name}</h6>
                                        <p class="text-xs text-gray-500 mt-1">Max: ${hotel.max_capacity || "N/A"} guests</p>
                                        ${hotel.description ? `<p class="text-xs text-gray-600 mt-2 line-clamp-2">${hotel.description}</p>` : ""}
                                        ${hotel.notes ? `<p class="text-xs text-gray-400 italic mt-1">${hotel.notes}</p>` : ""}
                                      </div>
                                    </div>
                                  </div>
                                `,
                                  )
                                  .join("")}
                              </div>
                            `
                                : `
                              <div class="text-center py-6 bg-gray-50">
                                <p class="text-sm text-gray-500">No hotels in this category yet</p>
                              </div>
                            `
                            }
                          </div>
                        `;
                        })
                        .join("")}
                    </div>
                  </div>
                `
                    : ""
                }

                <!-- Hotel Rates Table -->
                ${
                  pkg.package_hotel_rates?.length > 0
                    ? `
                  <div class="bg-white p-5 rounded-xl border-2 border-gray-200">
                    <h4 class="text-lg font-bold mb-4 flex items-center gap-2 text-teal-700">
                      <i class="fas fa-tag"></i>
                      Complete Hotel Rates
                    </h4>
                    ${this.formatRatesTable(pkg.package_hotel_rates, "hotel")}
                  </div>
                `
                    : ""
                }

                <!-- Inclusions & Exclusions -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  ${
                    pkg.package_inclusions?.length > 0
                      ? `
                    <div class="bg-green-50 p-5 rounded-xl border border-green-200">
                      <h4 class="font-bold text-green-800 mb-3 flex items-center gap-2">
                        <i class="fas fa-check-circle"></i>
                        Inclusions
                      </h4>
                      ${this.formatInclusions(pkg.package_inclusions.map((inc) => inc.inclusion_text))}
                    </div>
                  `
                      : ""
                  }

                  ${
                    pkg.package_exclusions?.length > 0
                      ? `
                    <div class="bg-red-50 p-5 rounded-xl border border-red-200">
                      <h4 class="font-bold text-red-800 mb-3 flex items-center gap-2">
                        <i class="fas fa-times-circle"></i>
                        Exclusions
                      </h4>
                      ${this.formatExclusions(pkg.package_exclusions.map((exc) => exc.exclusion_text))}
                    </div>
                  `
                      : ""
                  }
                </div>

                <!-- Itinerary -->
                ${
                  pkg.package_itineraries?.length > 0
                    ? `
                  <div class="bg-white p-5 rounded-xl border-2 border-gray-200">
                    <h4 class="text-lg font-bold mb-4 flex items-center gap-2 text-teal-700">
                      <i class="fas fa-map-signs"></i>
                      Itinerary
                    </h4>
                    ${this.formatPackageItinerary(pkg.package_itineraries)}
                  </div>
                `
                    : ""
                }

                <!-- Optional Tours -->
                ${
                  pkg.package_optional_tours?.length > 0
                    ? `
                  <div class="bg-white p-6 rounded-xl border-2 border-gray-200">
                    <div class="flex items-center justify-between mb-4">
                      <h4 class="text-xl font-bold text-teal-700 flex items-center gap-2">
                        <i class="fas fa-compass"></i>
                        Optional Tours
                      </h4>
                      <span class="bg-teal-700 text-white px-3 py-1 rounded-full text-sm font-medium">
                        ${pkg.package_optional_tours.length} tour(s)
                      </span>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      ${pkg.package_optional_tours
                        .map((ot) => {
                          const tour = ot.optional_tours;
                          if (!tour || !tour.is_active) return "";
                          const rates = tour.optional_tour_rates?.[0] || {};

                          return `
                          <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition">
                            <div class="flex items-start justify-between mb-3">
                              <h5 class="font-bold text-gray-800 text-base">${tour.tour_name}</h5>
                              ${
                                tour.duration_hours
                                  ? `
                                <span class="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                                  <i class="far fa-clock mr-1"></i>${tour.duration_hours}h
                                </span>
                              `
                                  : ""
                              }
                            </div>
                            ${
                              tour.description
                                ? `
                              <p class="text-xs text-gray-600 mb-3 line-clamp-2">${tour.description}</p>
                            `
                                : ""
                            }
                            <button onclick='destinationsManager.showTourDetails(${JSON.stringify(tour).replace(/'/g, "\\'")}, ${JSON.stringify(rates).replace(/'/g, "\\'")})' 
                                    class="w-full mt-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 rounded-lg text-sm font-medium hover:shadow-md transition">
                              <i class="fas fa-eye mr-2"></i> VIEW FULL DETAILS
                            </button>
                          </div>
                        `;
                        })
                        .join("")}
                    </div>
                  </div>
                `
                    : ""
                }

                <!-- Transportation -->
                ${
                  pkg.package_transportation?.length > 0
                    ? `
                  <div class="bg-blue-50 p-5 rounded-xl border border-blue-200">
                    <h4 class="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
                      <i class="fas fa-truck"></i>
                      Transportation
                    </h4>
                    ${this.formatTransportation(pkg.package_transportation)}
                  </div>
                `
                    : ""
                }
              </div>
            </div>
          `,
        )
        .join("");

      this.detailContent.innerHTML = `
        <button class="modal-close-btn fixed top-4 right-4 w-12 h-12 bg-white rounded-full shadow-lg hover:bg-gray-100 transition z-50" onclick="destinationsManager.closeModal()">
          <i class="fas fa-times text-teal-700 text-xl"></i>
        </button>
        <div class="max-w-7xl mx-auto px-4 py-8">
          ${overviewHtml}
          ${galleryHtml}
          
          <div class="bg-white p-5 rounded-xl border-2 border-gray-200">
            <h3 class="text-2xl font-bold mb-4 text-teal-700">Tour Packages</h3>
            ${packageTabs}
            ${packageContents}
          </div>
          
          <div class="flex justify-center mt-8">
            <button onclick="destinationsManager.closeModal()" class="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
              Close
            </button>
          </div>
        </div>
      `;

      setTimeout(() => {
        document.querySelectorAll(".book-now-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            const packageName = btn.dataset.packageName;
            const packageId = parseInt(btn.dataset.packageId);
            this.openBookingModal(packageName, packageId);
          });
        });
      }, 100);
    }

    renderDestinationOnly(destination) {
      const primaryImage =
        destination.destination_images?.find((img) => img.is_primary) ||
        destination.destination_images?.[0];

      const imageHtml =
        destination.destination_images?.length > 0
          ? `
            <div class="mb-8">
              <div class="relative rounded-xl overflow-hidden" style="height: 400px;">
                <img id="currentMainImage" src="${primaryImage?.url}" 
                     alt="${destination.name}" class="w-full h-full object-cover" />
                ${
                  destination.destination_images.length > 1
                    ? `
                  <button class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-lg" onclick="destinationsManager.prevImage()">
                    <i class="fas fa-chevron-left text-teal-700"></i>
                  </button>
                  <button class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-lg" onclick="destinationsManager.nextImage()">
                    <i class="fas fa-chevron-right text-teal-700"></i>
                  </button>
                  <div class="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    <span id="currentImageIndex">${this.currentImageIndex + 1}</span> / <span id="totalImages">${this.images.length}</span>
                  </div>
                `
                    : ""
                }
              </div>
            </div>
          `
          : '<div class="h-64 bg-gray-100 rounded-xl flex items-center justify-center mb-8"><i class="fas fa-image text-gray-400 text-5xl"></i></div>';

      this.detailContent.innerHTML = `
        <button class="modal-close-btn fixed top-4 right-4 w-12 h-12 bg-white rounded-full shadow-lg hover:bg-gray-100 transition z-50" onclick="destinationsManager.closeModal()">
          <i class="fas fa-times text-teal-700 text-xl"></i>
        </button>
        <div class="max-w-4xl mx-auto px-4 py-8">
          ${imageHtml}
          <div class="bg-white rounded-xl shadow-lg p-8">
            <h1 class="text-4xl font-bold text-teal-700 mb-4">${destination.name}</h1>
            
            <div class="bg-amber-50 border border-amber-200 rounded-lg p-8 text-center mb-6">
              <i class="fas fa-clock text-5xl text-amber-500 mb-4"></i>
              <h2 class="text-2xl font-bold text-amber-800 mb-2">Coming Soon!</h2>
              <p class="text-amber-700">Tour packages for ${destination.name} are currently being prepared.</p>
            </div>

            <div class="prose max-w-none">
              <h3 class="text-xl font-bold text-teal-700 mb-3">About ${destination.name}</h3>
              <p class="text-gray-700 leading-relaxed">${destination.description || "No description available."}</p>
              <div class="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                ${destination.country ? `<span class="flex items-center gap-2"><i class="fas fa-map-marker-alt text-orange-500"></i> ${destination.country}</span>` : ""}
                ${destination.airport_code ? `<span class="flex items-center gap-2"><i class="fas fa-plane text-orange-500"></i> ${destination.airport_code}</span>` : ""}
              </div>
            </div>
            
            <div class="mt-8 text-center">
              <button onclick="destinationsManager.openInquiryModal('${destination.name}')" 
                      class="px-8 py-3 bg-gradient-to-r from-orange-500 to-teal-700 text-white rounded-lg font-semibold hover:shadow-lg transition inline-flex items-center gap-2">
                <i class="fas fa-envelope"></i> INQUIRE NOW
              </button>
            </div>
          </div>
        </div>
      `;
    }

    openImagePreview(url) {
      const previewModal = document.createElement("div");
      previewModal.className =
        "fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4";
      previewModal.innerHTML = `
        <div class="relative max-w-5xl w-full">
          <img src="${url}" class="w-full h-auto max-h-[90vh] object-contain">
          <button onclick="this.closest('.fixed').remove()" class="absolute top-4 right-4 text-white text-4xl">&times;</button>
        </div>
      `;
      document.body.appendChild(previewModal);
    }

    // ============================================
    // OPEN BOOKING MODAL - WITH REAL-TIME DATA
    // ============================================
    async openBookingModal(packageName, packageId) {
      console.log("🟢 OPEN BOOKING MODAL CLICKED!", { packageName, packageId });
      this.currentPackage = packageName;
      this.currentPackageId = packageId;

      // Find the destination
      const destination = this.destinations.find((d) =>
        d.destination_packages?.some((p) => p.id == packageId),
      );

      if (!destination) {
        alert("Package not found");
        return;
      }

      // ALWAYS FETCH FRESH DATA from database
      console.log("🔄 Fetching fresh package data...");

      try {
        const { data: freshPkg, error } = await window.sns_supabase_client
          .from("destination_packages")
          .select(
            `
            *,
            package_hotel_rates (*),
            package_optional_tours (
              *,
              optional_tours (
                *,
                optional_tour_rates (*)
              )
            )
          `,
          )
          .eq("id", packageId)
          .single();

        if (error) throw error;

        console.log("✅ Fresh package data:", freshPkg);

        const pkg = freshPkg;
        const hotelCategories = destination.hotel_categories || [];
        const packageRates = pkg.package_hotel_rates || [];
        const optionalTours = pkg.package_optional_tours || [];

        // Remove existing modal if any
        const existingModal = document.getElementById("bookingModal");
        if (existingModal) existingModal.remove();

        // Create modal
        const modal = document.createElement("div");
        modal.id = "bookingModal";
        modal.className =
          "fixed inset-0 bg-black/90 flex items-center justify-center z-[999999] overflow-y-auto p-5";

        modal.addEventListener("click", (e) => {
          if (e.target === modal) this.closeBookingModal();
        });

        const today = new Date().toISOString().split("T")[0];

        // ============================================
        // HOTEL SELECTION HTML
        // ============================================
        const hotelSelectionHtml = hotelCategories
          .map((cat, index) => {
            const rate = packageRates.find(
              (r) => r.hotel_category_id === cat.id,
            );
            if (!rate) return "";

            return `
              <div class="hotel-category-card mb-6 border-2 border-gray-200 rounded-xl overflow-hidden">
                <div class="bg-gradient-to-r from-orange-500 to-orange-600 p-4">
                  <div class="flex justify-between items-center">
                    <div>
                      <h4 class="font-bold text-white text-lg">${cat.category_name}</h4>
                      <p class="text-sm text-white/90 mt-1">
                        <i class="fas fa-users mr-1"></i>Max: ${cat.max_room_capacity || 4} pax
                      </p>
                    </div>
                    <div>
                      <input type="radio" name="hotelCategory" value="${cat.id}" 
                             data-category="${cat.category_name}"
                             ${index === 0 ? "checked" : ""}
                             class="w-5 h-5 accent-orange-500 cursor-pointer">
                    </div>
                  </div>
                </div>
                
                <div class="p-5 bg-white">
                  <table class="w-full border-collapse">
                    <thead>
                      <tr class="bg-orange-500 text-white">
                        <th class="p-3 text-left">Pax Type</th>
                        <th class="p-3 text-center">Rate per person</th>
                        <th class="p-3 text-center">Select</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${
                        rate.rate_solo
                          ? `
                      <tr class="border-b">
                        <td class="p-3">Solo (1 person)</td>
                        <td class="p-3 text-center font-semibold text-orange-500">₱${rate.rate_solo.toLocaleString()}</td>
                        <td class="p-3 text-center">
                          <input type="checkbox" class="pax-checkbox" data-pax="solo" value="1" data-rate="${rate.rate_solo}">
                        </td>
                      </tr>
                      `
                          : ""
                      }
                      ${
                        rate.rate_2pax
                          ? `
                      <tr class="border-b">
                        <td class="p-3">2 Persons</td>
                        <td class="p-3 text-center font-semibold text-orange-500">₱${rate.rate_2pax.toLocaleString()}</td>
                        <td class="p-3 text-center">
                          <input type="checkbox" class="pax-checkbox" data-pax="2pax" value="2" data-rate="${rate.rate_2pax}">
                        </td>
                      </tr>
                      `
                          : ""
                      }
                      ${
                        rate.rate_3pax
                          ? `
                      <tr class="border-b">
                        <td class="p-3">3 Persons</td>
                        <td class="p-3 text-center font-semibold text-orange-500">₱${rate.rate_3pax.toLocaleString()}</td>
                        <td class="p-3 text-center">
                          <input type="checkbox" class="pax-checkbox" data-pax="3pax" value="3" data-rate="${rate.rate_3pax}">
                        </td>
                      </tr>
                      `
                          : ""
                      }
                      ${
                        rate.rate_4pax
                          ? `
                      <tr class="border-b">
                        <td class="p-3">4 Persons</td>
                        <td class="p-3 text-center font-semibold text-orange-500">₱${rate.rate_4pax.toLocaleString()}</td>
                        <td class="p-3 text-center">
                          <input type="checkbox" class="pax-checkbox" data-pax="4pax" value="4" data-rate="${rate.rate_4pax}">
                        </td>
                      </tr>
                      `
                          : ""
                      }
                      ${
                        rate.rate_5pax
                          ? `
                      <tr class="border-b">
                        <td class="p-3">5 Persons</td>
                        <td class="p-3 text-center font-semibold text-orange-500">₱${rate.rate_5pax.toLocaleString()}</td>
                        <td class="p-3 text-center">
                          <input type="checkbox" class="pax-checkbox" data-pax="5pax" value="5" data-rate="${rate.rate_5pax}">
                        </td>
                      </tr>
                      `
                          : ""
                      }
                      ${
                        rate.rate_child_no_breakfast
                          ? `
                      <tr>
                        <td class="p-3">Child (No Breakfast)</td>
                        <td class="p-3 text-center font-semibold text-orange-500">₱${rate.rate_child_no_breakfast.toLocaleString()}</td>
                        <td class="p-3 text-center">
                          <input type="checkbox" class="pax-checkbox" data-pax="child" value="1" data-rate="${rate.rate_child_no_breakfast}">
                        </td>
                      </tr>
                      `
                          : ""
                      }
                    </tbody>
                  </table>

                  ${
                    rate.extra_night_solo ||
                    rate.extra_night_2pax ||
                    rate.extra_night_3pax ||
                    rate.extra_night_4pax ||
                    rate.extra_night_5pax
                      ? `
                    <div class="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <h5 class="font-semibold text-orange-600 mb-3">Extra Night Rates</h5>
                      <table class="w-full text-sm">
                        <thead>
                          <tr class="bg-orange-100">
                            <th class="p-2 text-left">Pax Type</th>
                            <th class="p-2 text-right">Rate per night</th>
                            <th class="p-2 text-center">Add</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${
                            rate.extra_night_solo
                              ? `
                            <tr>
                              <td class="p-2">Solo</td>
                              <td class="p-2 text-right font-semibold text-orange-500">₱${rate.extra_night_solo.toLocaleString()}</td>
                              <td class="p-2 text-center">
                                <input type="checkbox" class="extra-nights-checkbox" data-category="${cat.id}" data-pax="solo" value="${rate.extra_night_solo}">
                              </td>
                            </tr>
                          `
                              : ""
                          }
                          ${
                            rate.extra_night_2pax
                              ? `
                            <tr>
                              <td class="p-2">2 Persons</td>
                              <td class="p-2 text-right font-semibold text-orange-500">₱${rate.extra_night_2pax.toLocaleString()}</td>
                              <td class="p-2 text-center">
                                <input type="checkbox" class="extra-nights-checkbox" data-category="${cat.id}" data-pax="2pax" value="${rate.extra_night_2pax}">
                              </td>
                            </tr>
                          `
                              : ""
                          }
                          ${
                            rate.extra_night_3pax
                              ? `
                            <tr>
                              <td class="p-2">3 Persons</td>
                              <td class="p-2 text-right font-semibold text-orange-500">₱${rate.extra_night_3pax.toLocaleString()}</td>
                              <td class="p-2 text-center">
                                <input type="checkbox" class="extra-nights-checkbox" data-category="${cat.id}" data-pax="3pax" value="${rate.extra_night_3pax}">
                              </td>
                            </tr>
                          `
                              : ""
                          }
                          ${
                            rate.extra_night_4pax
                              ? `
                            <tr>
                              <td class="p-2">4 Persons</td>
                              <td class="p-2 text-right font-semibold text-orange-500">₱${rate.extra_night_4pax.toLocaleString()}</td>
                              <td class="p-2 text-center">
                                <input type="checkbox" class="extra-nights-checkbox" data-category="${cat.id}" data-pax="4pax" value="${rate.extra_night_4pax}">
                              </td>
                            </tr>
                          `
                              : ""
                          }
                          ${
                            rate.extra_night_5pax
                              ? `
                            <tr>
                              <td class="p-2">5 Persons</td>
                              <td class="p-2 text-right font-semibold text-orange-500">₱${rate.extra_night_5pax.toLocaleString()}</td>
                              <td class="p-2 text-center">
                                <input type="checkbox" class="extra-nights-checkbox" data-category="${cat.id}" data-pax="5pax" value="${rate.extra_night_5pax}">
                              </td>
                            </tr>
                          `
                              : ""
                          }
                        </tbody>
                      </table>
                    </div>
                  `
                      : ""
                  }
                </div>
              </div>
            `;
          })
          .join("");

        // ============================================
        // OPTIONAL TOURS HTML
        // ============================================
        let optionalToursHtml = "";

        if (optionalTours && optionalTours.length > 0) {
          optionalToursHtml =
            '<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">';

          optionalTours.forEach((ot) => {
            const tour = ot.optional_tours;
            if (!tour || !tour.is_active) return;

            const rates = tour.optional_tour_rates?.[0] || {};

            // Check if rates exist
            const hasRates = Object.values(rates).some(
              (val) => val && parseFloat(val) > 0,
            );
            if (!hasRates) return;

            // Build rate rows
            const rateFields = [
              { key: "rate_solo", label: "Solo (1 person)", pax: "solo" },
              { key: "rate_2pax", label: "2 Persons", pax: "2pax" },
              { key: "rate_3pax", label: "3 Persons", pax: "3pax" },
              { key: "rate_4pax", label: "4 Persons", pax: "4pax" },
              { key: "rate_5pax", label: "5 Persons", pax: "5pax" },
              { key: "rate_6pax", label: "6 Persons", pax: "6pax" },
              { key: "rate_7pax", label: "7 Persons", pax: "7pax" },
              { key: "rate_8pax", label: "8 Persons", pax: "8pax" },
              { key: "rate_9pax", label: "9 Persons", pax: "9pax" },
              { key: "rate_10pax", label: "10 Persons", pax: "10pax" },
              { key: "rate_11pax", label: "11 Persons", pax: "11pax" },
              { key: "rate_12pax", label: "12 Persons", pax: "12pax" },
              {
                key: "rate_child_4_9",
                label: "Child (4-9 years)",
                pax: "child",
              },
            ];

            const availableRates = rateFields.filter(
              (field) => rates[field.key] && parseFloat(rates[field.key]) > 0,
            );

            if (availableRates.length === 0) return;

            const rateItemsHtml = availableRates
              .map(
                (field) => `
                  <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-purple-50 transition-colors border border-gray-200">
                    <div class="flex items-center gap-3">
                      <input type="checkbox" 
                             class="tour-pax-checkbox w-4 h-4 accent-purple-600 cursor-pointer" 
                             data-tour-id="${tour.id}" 
                             data-tour-name="${tour.tour_name}" 
                             data-pax="${field.pax}" 
                             data-rate="${rates[field.key]}" 
                             data-label="${field.label}">
                      <span class="text-sm text-gray-700">${field.label}</span>
                    </div>
                    <span class="font-bold text-purple-600">₱${Number(rates[field.key]).toLocaleString()}</span>
                  </div>
                `,
              )
              .join("");

            optionalToursHtml += `
              <div class="tour-card border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all">
                <!-- Tour Header with Image -->
                <div class="relative h-44 bg-gradient-to-r from-purple-600 to-purple-800">
                  ${
                    tour.image_url
                      ? `<img src="${tour.image_url}" alt="${tour.tour_name}" class="w-full h-full object-cover opacity-90">`
                      : `<div class="w-full h-full flex items-center justify-center">
                           <i class="fas fa-map-marked-alt text-5xl text-white/50"></i>
                         </div>`
                  }
                  <div class="absolute top-3 right-3">
                    <span class="bg-white/90 backdrop-blur-sm text-purple-700 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                      <i class="far fa-clock mr-1"></i>${tour.duration_hours || "N/A"}h
                    </span>
                  </div>
                  <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
                    <h5 class="font-bold text-white text-lg">${tour.tour_name}</h5>
                  </div>
                </div>
                
                <!-- Tour Description -->
                ${
                  tour.description
                    ? `
                  <div class="px-4 pt-4 pb-2 bg-purple-50 border-b border-purple-100">
                    <p class="text-sm text-gray-600">${tour.description}</p>
                  </div>
                `
                    : ""
                }
                
                <!-- Tour Rates -->
                <div class="p-4">
                  <h6 class="font-semibold text-purple-700 mb-3 flex items-center gap-2">
                    <i class="fas fa-tag"></i>
                    Select Rate Type
                  </h6>
                  <div class="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    ${rateItemsHtml}
                  </div>
                  
                  <!-- View Details Button -->
                  <button onclick='destinationsManager.showTourDetails(${JSON.stringify(tour).replace(/'/g, "\\'")}, ${JSON.stringify(rates).replace(/'/g, "\\'")})' 
                          class="w-full mt-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2.5 rounded-lg text-sm font-medium hover:shadow-md transition-all hover:scale-[1.02] flex items-center justify-center gap-2">
                    <i class="fas fa-info-circle"></i>
                    VIEW FULL DETAILS
                  </button>
                </div>
              </div>
            `;
          });

          optionalToursHtml += "</div>";

          // Add custom scrollbar styles
          optionalToursHtml += `
            <style>
              .custom-scrollbar::-webkit-scrollbar {
                width: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 10px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #888;
                border-radius: 10px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #555;
              }
            </style>
          `;
        }

        // ============================================
        // COMPLETE MODAL HTML
        // ============================================
        modal.innerHTML = `
          <div class="bg-white w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
            <!-- Fixed Header -->
            <div class="bg-gradient-to-r from-orange-500 to-teal-700 text-white p-5 sticky top-0 z-10 rounded-t-2xl">
              <div class="flex justify-between items-center">
                <div>
                  <h2 class="text-2xl font-bold">${destination.name}</h2>
                  <p class="mt-1">${packageName}</p>
                </div>
                <button onclick="destinationsManager.closeBookingModal()" class="text-3xl hover:text-white/80">&times;</button>
              </div>
            </div>

            <!-- Scrollable Content -->
            <div class="p-6">
              <!-- Package Summary -->
              <div class="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 class="text-teal-700 font-semibold mb-2 flex items-center gap-2">
                  <i class="fas fa-box"></i>
                  Package Summary
                </h3>
                <p><span class="font-medium">${pkg.package_name}</span> ${pkg.package_code ? `(${pkg.package_code})` : ""}</p>
              </div>

              <!-- Hotel Selection -->
              <h3 class="text-teal-700 font-bold text-xl mb-4 flex items-center gap-2">
                <i class="fas fa-hotel"></i>
                Select Hotel Category
              </h3>
              ${hotelSelectionHtml}

              <!-- Optional Tours -->
              ${
                optionalToursHtml
                  ? `
                <h3 class="text-teal-700 font-bold text-xl mt-8 mb-4 flex items-center gap-2">
                  <i class="fas fa-compass"></i>
                  Optional Tours
                </h3>
                ${optionalToursHtml}
              `
                  : '<p class="text-gray-500 italic mt-4">No optional tours available for this package.</p>'
              }

              <!-- Selection Summary Cards -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
                <div id="selectedCategorySummary" class="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 class="font-semibold text-orange-600 mb-2 flex items-center gap-1">
                    <i class="fas fa-hotel text-sm"></i>
                    Selected Hotel
                  </h4>
                  <div id="selectedCategoryDisplay" class="font-medium">${hotelCategories[0]?.category_name || "None"}</div>
                </div>
                <div id="selectedPaxSummary" class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 class="font-semibold text-blue-600 mb-2 flex items-center gap-1">
                    <i class="fas fa-users text-sm"></i>
                    Selected Pax
                  </h4>
                  <div id="selectedPaxDisplay" class="font-medium">None</div>
                </div>
                <div id="selectedExtraNightsSummary" class="bg-yellow-50 p-4 rounded-lg border border-yellow-200 hidden">
                  <h4 class="font-semibold text-yellow-700 mb-2 flex items-center gap-1">
                    <i class="fas fa-moon text-sm"></i>
                    Extra Nights
                  </h4>
                  <div id="selectedExtraNightsDisplay"></div>
                </div>
                <div id="selectedToursSummary" class="bg-purple-50 p-4 rounded-lg border border-purple-200 hidden">
                  <h4 class="font-semibold text-purple-700 mb-2 flex items-center gap-1">
                    <i class="fas fa-compass text-sm"></i>
                    Optional Tours
                  </h4>
                  <div id="selectedToursDisplay"></div>
                </div>
              </div>

              <!-- Price Summary -->
              <div class="bg-green-50 p-5 rounded-xl border-2 border-green-200 mb-6">
                <h4 class="text-green-700 font-bold text-lg mb-4 flex items-center gap-2">
                  <i class="fas fa-calculator"></i>
                  Price Summary
                </h4>
                <div class="space-y-2">
                  <div class="flex justify-between items-center py-1">
                    <span class="text-gray-600">Hotel Base Price:</span>
                    <span id="basePrice" class="font-semibold">₱0</span>
                  </div>
                  <div class="flex justify-between items-center py-1">
                    <span class="text-gray-600">Extra Nights:</span>
                    <span id="extraNightsPrice" class="font-semibold">₱0</span>
                  </div>
                  <div class="flex justify-between items-center py-1">
                    <span class="text-gray-600">Optional Tours:</span>
                    <span id="toursPrice" class="font-semibold">₱0</span>
                  </div>
                  <div class="border-t-2 border-green-300 my-2 pt-2 flex justify-between items-center font-bold text-lg">
                    <span class="text-green-800">Total:</span>
                    <span id="totalPrice" class="text-orange-600">₱0</span>
                  </div>
                </div>
              </div>

              <!-- Customer Information Form -->
              <div class="mb-6">
                <h4 class="text-teal-700 font-semibold mb-4 flex items-center gap-2">
                  <i class="fas fa-user"></i>
                  Your Information
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input type="text" id="fullName" placeholder="Enter your full name" class="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" id="email" placeholder="your@email.com" class="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200">
                  </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <input type="tel" id="phone" placeholder="09XXXXXXXXX" class="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Travel Date *</label>
                    <input type="date" id="travelDate" min="${today}" class="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200">
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                  <textarea id="requests" rows="2" placeholder="Any special requirements?" class="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200"></textarea>
                </div>
              </div>

              <!-- Terms and Conditions -->
              <div class="flex items-center gap-3 mb-6 bg-gray-50 p-4 rounded-lg">
                <input type="checkbox" id="terms" class="w-5 h-5 accent-teal-700">
                <label for="terms" class="text-sm text-gray-600">I agree to the <a href="#" class="text-teal-700 font-semibold hover:underline">terms and conditions</a></label>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-4">
                <button onclick="destinationsManager.closeBookingModal()" class="flex-1 py-4 bg-white border-2 border-gray-200 rounded-lg font-semibold hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button onclick="destinationsManager.submitBooking()" class="flex-1 py-4 bg-gradient-to-r from-orange-500 to-teal-700 text-white rounded-lg font-semibold hover:opacity-90 transition">
                  Confirm Booking
                </button>
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(modal);
        this.attachBookingEvents();
      } catch (error) {
        console.error("❌ Error fetching fresh package:", error);
        alert("Error loading package data. Please try again.");
      }
    }

    closeBookingModal() {
      const modal = document.getElementById("bookingModal");
      if (modal) modal.remove();
    }

    // ============================================
    // SUBMIT BOOKING
    // ============================================
    async submitBooking() {
      console.log("🚀 Submitting booking...");

      const fullName = document.getElementById("fullName")?.value.trim();
      const email = document.getElementById("email")?.value.trim();
      const phone = document.getElementById("phone")?.value.trim();
      const travelDate = document.getElementById("travelDate")?.value;
      const requests = document.getElementById("requests")?.value.trim();
      const terms = document.getElementById("terms")?.checked;

      // Validation
      if (!fullName || !email || !phone || !travelDate) {
        return this.showBookingError("Please fill in all required fields");
      }

      if (!terms) {
        return this.showBookingError("Please agree to terms and conditions");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return this.showBookingError("Please enter a valid email address");
      }

      const phoneRegex = /^(09|\+639)\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return this.showBookingError(
          "Please enter a valid Philippine mobile number",
        );
      }

      const category = document.querySelector(
        'input[name="hotelCategory"]:checked',
      );
      if (!category) {
        return this.showBookingError("Please select a hotel category");
      }

      // Calculate pax and prices
      let adults = 0;
      let children = 0;
      const paxDetails = [];
      let basePrice = 0;

      document.querySelectorAll(".pax-checkbox:checked").forEach((cb) => {
        const type = cb.dataset.pax;
        const count = parseInt(cb.value);
        const rate = parseFloat(cb.dataset.rate || 0);

        if (type === "child") {
          children += count;
          basePrice += rate * count;
          paxDetails.push({
            type: "child",
            count: count,
            rate: rate,
          });
        } else {
          adults += count;
          basePrice += rate * count;
          paxDetails.push({
            type: type,
            count: count,
            rate: rate,
          });
        }
      });

      if (adults + children === 0) {
        return this.showBookingError("Please select at least one guest");
      }

      // Calculate extra nights
      const extraNightsDetails = [];
      let totalExtraNights = 0;

      document
        .querySelectorAll(".extra-nights-checkbox:checked")
        .forEach((cb) => {
          const paxType = cb.dataset.pax;
          const rate = parseFloat(cb.value || 0);
          const categoryId = cb.dataset.category;

          extraNightsDetails.push({
            hotelCategoryId: categoryId,
            paxType: paxType,
            rate: rate,
          });
          totalExtraNights += rate;
        });

      // Calculate optional tours
      const selectedTours = [];
      let toursPrice = 0;

      document.querySelectorAll(".tour-pax-checkbox:checked").forEach((cb) => {
        const rate = parseFloat(cb.dataset.rate || 0);
        selectedTours.push({
          tourId: cb.dataset.tourId,
          tourName: cb.dataset.tourName,
          paxType: cb.dataset.pax,
          paxLabel: cb.dataset.label,
          rate: rate,
        });
        toursPrice += rate;
      });

      const grandTotal = basePrice + totalExtraNights + toursPrice;

      // Prepare booking data
      const bookingData = {
        destination_id: this.destinations.find((d) =>
          d.destination_packages?.some((p) => p.id == this.currentPackageId),
        )?.id,
        package_id: this.currentPackageId,
        package_name: this.currentPackage,
        customer: {
          full_name: fullName,
          email: email,
          phone: phone,
          special_requests: requests,
        },
        travel_date: travelDate,
        booking_details: {
          hotel_category_id: category.value,
          hotel_category_name: category.dataset.category,
          adults: adults,
          children: children,
          pax_details: paxDetails,
          extra_nights: extraNightsDetails,
          extra_nights_total: totalExtraNights,
          optional_tours: selectedTours,
          tours_total: toursPrice,
        },
        pricing: {
          base_price: basePrice,
          extra_nights_price: totalExtraNights,
          tours_price: toursPrice,
          grand_total: grandTotal,
          currency: "PHP",
        },
        status: "pending",
        created_at: new Date().toISOString(),
      };

      console.log("📦 Complete Booking Data:", bookingData);
      this.showBookingConfirmation(bookingData);
    }

    showBookingConfirmation(bookingData) {
      const existingModal = document.getElementById("bookingConfirmationModal");
      if (existingModal) existingModal.remove();

      const toursList =
        bookingData.booking_details.optional_tours.length > 0
          ? bookingData.booking_details.optional_tours
              .map(
                (t) =>
                  `<li class="flex items-start gap-2 text-sm text-gray-600">
                    <i class="fas fa-check-circle text-green-500 mt-1 flex-shrink-0"></i>
                    <span>${t.tourName} (${t.paxLabel}) - ₱${t.rate.toLocaleString()}</span>
                  </li>`,
              )
              .join("")
          : '<li class="text-sm text-gray-400 italic">No optional tours selected</li>';

      const modal = document.createElement("div");
      modal.id = "bookingConfirmationModal";
      modal.className =
        "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[999999]";

      modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div class="bg-gradient-to-r from-green-500 to-teal-600 p-6 text-white rounded-t-2xl">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <i class="fas fa-check-circle text-2xl"></i>
              </div>
              <div>
                <h2 class="text-2xl font-bold">Booking Summary</h2>
                <p class="text-white/80">Please review your booking details</p>
              </div>
            </div>
          </div>

          <div class="p-6 space-y-6">
            <!-- Package Info -->
            <div class="bg-gray-50 p-4 rounded-xl">
              <h3 class="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <i class="fas fa-box text-teal-600"></i>
                Package
              </h3>
              <p class="text-gray-600 font-medium">${bookingData.package_name}</p>
              <p class="text-sm text-gray-500 mt-1">
                <i class="far fa-calendar-alt mr-1"></i> Travel Date: ${new Date(bookingData.travel_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            <!-- Customer Info -->
            <div class="bg-blue-50 p-4 rounded-xl">
              <h3 class="font-bold text-blue-800 mb-2 flex items-center gap-2">
                <i class="fas fa-user"></i>
                Customer Information
              </h3>
              <div class="space-y-1">
                <p class="text-gray-700"><span class="font-medium">Name:</span> ${bookingData.customer.full_name}</p>
                <p class="text-gray-700"><span class="font-medium">Email:</span> ${bookingData.customer.email}</p>
                <p class="text-gray-700"><span class="font-medium">Phone:</span> ${bookingData.customer.phone}</p>
                ${bookingData.customer.special_requests ? `<p class="text-gray-700"><span class="font-medium">Requests:</span> ${bookingData.customer.special_requests}</p>` : ""}
              </div>
            </div>

            <!-- Booking Details -->
            <div class="bg-orange-50 p-4 rounded-xl">
              <h3 class="font-bold text-orange-800 mb-2 flex items-center gap-2">
                <i class="fas fa-hotel"></i>
                Booking Details
              </h3>
              <div class="space-y-1">
                <p class="text-gray-700"><span class="font-medium">Hotel:</span> ${bookingData.booking_details.hotel_category_name}</p>
                <p class="text-gray-700"><span class="font-medium">Adults:</span> ${bookingData.booking_details.adults}</p>
                <p class="text-gray-700"><span class="font-medium">Children:</span> ${bookingData.booking_details.children}</p>
                ${bookingData.booking_details.extra_nights.length > 0 ? `<p class="text-gray-700"><span class="font-medium">Extra Nights:</span> ₱${bookingData.booking_details.extra_nights_total.toLocaleString()}</p>` : ""}
              </div>
            </div>

            <!-- Optional Tours -->
            <div class="bg-purple-50 p-4 rounded-xl">
              <h3 class="font-bold text-purple-800 mb-2 flex items-center gap-2">
                <i class="fas fa-compass"></i>
                Optional Tours
              </h3>
              <ul class="space-y-1">
                ${toursList}
              </ul>
            </div>

            <!-- Price Summary -->
            <div class="bg-green-50 p-4 rounded-xl border-2 border-green-200">
              <h3 class="font-bold text-green-800 mb-3 flex items-center gap-2">
                <i class="fas fa-calculator"></i>
                Price Summary
              </h3>
              <div class="space-y-2">
                <div class="flex justify-between items-center py-1">
                  <span class="text-gray-600">Base Price:</span>
                  <span class="font-semibold">₱${bookingData.pricing.base_price.toLocaleString()}</span>
                </div>
                ${
                  bookingData.pricing.extra_nights_price > 0
                    ? `
                  <div class="flex justify-between items-center py-1">
                    <span class="text-gray-600">Extra Nights:</span>
                    <span class="font-semibold">₱${bookingData.pricing.extra_nights_price.toLocaleString()}</span>
                  </div>
                `
                    : ""
                }
                ${
                  bookingData.pricing.tours_price > 0
                    ? `
                  <div class="flex justify-between items-center py-1">
                    <span class="text-gray-600">Optional Tours:</span>
                    <span class="font-semibold">₱${bookingData.pricing.tours_price.toLocaleString()}</span>
                  </div>
                `
                    : ""
                }
                <div class="border-t border-green-300 my-2 pt-2 flex justify-between items-center text-lg font-bold">
                  <span class="text-green-800">Total:</span>
                  <span class="text-orange-600">₱${bookingData.pricing.grand_total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div class="flex gap-3">
              <button onclick="destinationsManager.closeBookingConfirmation()"
                  class="flex-1 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition">
                Edit Booking
              </button>
              <button onclick="destinationsManager.confirmAndSubmitBooking()"
                  class="flex-1 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-semibold hover:opacity-90 transition">
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      this.pendingBookingData = bookingData;
    }

    closeBookingConfirmation() {
      const modal = document.getElementById("bookingConfirmationModal");
      if (modal) modal.remove();
      this.pendingBookingData = null;
    }

    async confirmAndSubmitBooking() {
      if (!this.pendingBookingData) {
        return this.showBookingError("No booking data to submit");
      }

      const confirmBtn = event.target;
      const originalText = confirmBtn.innerHTML;
      confirmBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Submitting...';
      confirmBtn.disabled = true;

      try {
        const { data, error } = await window.sns_supabase_client
          .from("bookings")
          .insert([this.pendingBookingData]);

        if (error) throw error;

        this.showBookingSuccess(this.pendingBookingData);
      } catch (error) {
        console.error("Booking submission error:", error);
        this.showBookingError(
          "Failed to submit booking. Please try again or contact support.",
        );
      } finally {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
      }
    }

    showBookingSuccess(bookingData) {
      this.closeBookingConfirmation();
      this.closeBookingModal();

      const successModal = document.createElement("div");
      successModal.className =
        "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[999999]";
      successModal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-check-circle text-4xl text-green-600"></i>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">Booking Submitted!</h2>
          <p class="text-gray-600 mb-6">Thank you ${bookingData.customer.full_name}! We'll contact you at ${bookingData.customer.email} within 24 hours.</p>
          <div class="bg-gray-50 p-4 rounded-xl mb-6">
            <p class="text-sm text-gray-500 mb-1">Booking Reference</p>
            <p class="text-2xl font-bold text-teal-700">#BK${Date.now().toString().slice(-6)}</p>
          </div>
          <button onclick="this.closest('.fixed').remove()"
              class="w-full py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-semibold hover:opacity-90 transition">
            Close
          </button>
        </div>
      `;

      document.body.appendChild(successModal);
      this.pendingBookingData = null;
    }

    showBookingError(message) {
      const errorModal = document.createElement("div");
      errorModal.className =
        "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[999999]";
      errorModal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-exclamation-triangle text-2xl text-red-600"></i>
          </div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">Booking Error</h3>
          <p class="text-gray-600 mb-6">${message}</p>
          <button onclick="this.closest('.fixed').remove()" 
                  class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
            Close
          </button>
        </div>
      `;
      document.body.appendChild(errorModal);
      setTimeout(() => errorModal.remove(), 5000);
    }

    // ============================================
    // ATTACH BOOKING EVENTS
    // ============================================
    attachBookingEvents() {
      // Hotel category change
      document
        .querySelectorAll('input[name="hotelCategory"]')
        .forEach((radio) => {
          radio.addEventListener("change", () => {
            this.updateHotelSelection();
            this.updatePriceSummary();
          });
        });

      // Pax checkboxes
      document.querySelectorAll(".pax-checkbox").forEach((cb) => {
        cb.addEventListener("change", () => {
          this.updatePaxSelection();
          this.updatePriceSummary();
        });
      });

      // Extra nights checkboxes
      document.querySelectorAll(".extra-nights-checkbox").forEach((cb) => {
        cb.addEventListener("change", () => {
          this.updateExtraNightsSelection();
          this.updatePriceSummary();
        });
      });

      // Tour pax checkboxes
      document.querySelectorAll(".tour-pax-checkbox").forEach((cb) => {
        cb.addEventListener("change", () => {
          this.updateTourSelection();
          this.updatePriceSummary();
        });
      });

      // Initialize displays
      this.updateHotelSelection();
      this.updatePaxSelection();
      this.updateExtraNightsSelection();
      this.updateTourSelection();
      this.updatePriceSummary();
    }

    updateHotelSelection() {
      const selected = document.querySelector(
        'input[name="hotelCategory"]:checked',
      );
      const display = document.getElementById("selectedCategoryDisplay");
      if (selected && display) {
        display.textContent = selected.dataset.category;
      }
    }

    updatePaxSelection() {
      const selected = [];
      let total = 0;

      document.querySelectorAll(".pax-checkbox:checked").forEach((cb) => {
        const type = cb.dataset.pax;
        const count = parseInt(cb.value);

        if (type === "child") {
          selected.push("Child");
          total += count;
        } else {
          const paxNum =
            type === "solo" ? 1 : parseInt(type.replace("pax", ""));
          selected.push(`${paxNum} Pax`);
          total += count;
        }
      });

      const display = document.getElementById("selectedPaxDisplay");
      if (display) {
        display.textContent =
          selected.length > 0
            ? `${selected.join(", ")} (Total: ${total})`
            : "None";
      }
    }

    updateExtraNightsSelection() {
      const selected = [];

      document
        .querySelectorAll(".extra-nights-checkbox:checked")
        .forEach((cb) => {
          const paxType = cb.dataset.pax;
          const value = parseFloat(cb.value);
          const paxLabel =
            paxType === "solo"
              ? "Solo"
              : paxType === "2pax"
                ? "2 Persons"
                : paxType === "3pax"
                  ? "3 Persons"
                  : paxType === "4pax"
                    ? "4 Persons"
                    : paxType === "5pax"
                      ? "5 Persons"
                      : paxType;
          selected.push(`${paxLabel} (+₱${value.toLocaleString()})`);
        });

      const summaryDiv = document.getElementById("selectedExtraNightsSummary");
      const displayDiv = document.getElementById("selectedExtraNightsDisplay");

      if (summaryDiv && displayDiv) {
        if (selected.length > 0) {
          summaryDiv.classList.remove("hidden");
          displayDiv.innerHTML = selected
            .map((s) => `<div class="text-sm">• ${s}</div>`)
            .join("");
        } else {
          summaryDiv.classList.add("hidden");
        }
      }
    }

    updateTourSelection() {
      const selectedTours = [];
      const toursMap = new Map();

      document.querySelectorAll(".tour-pax-checkbox:checked").forEach((cb) => {
        const tourId = cb.dataset.tourId;
        const tourName = cb.dataset.tourName;
        const paxLabel = cb.dataset.label;
        const rate = parseFloat(cb.dataset.rate);

        if (!toursMap.has(tourId)) {
          toursMap.set(tourId, { name: tourName, selections: [] });
        }
        toursMap
          .get(tourId)
          .selections.push(`${paxLabel} (+₱${rate.toLocaleString()})`);
      });

      toursMap.forEach((tour) => {
        selectedTours.push(`
          <div class="mb-2">
            <span class="font-medium text-purple-700">${tour.name}:</span>
            <div class="ml-4 text-sm">${tour.selections.map((s) => `• ${s}`).join("<br>")}</div>
          </div>
        `);
      });

      const summaryDiv = document.getElementById("selectedToursSummary");
      const displayDiv = document.getElementById("selectedToursDisplay");

      if (summaryDiv && displayDiv) {
        if (selectedTours.length > 0) {
          summaryDiv.classList.remove("hidden");
          displayDiv.innerHTML = selectedTours.join("");
        } else {
          summaryDiv.classList.add("hidden");
        }
      }
    }

    updatePriceSummary() {
      let basePrice = 0;
      document.querySelectorAll(".pax-checkbox:checked").forEach((cb) => {
        const rate = parseFloat(cb.dataset.rate || 0);
        basePrice += rate;
      });

      let extraPrice = 0;
      document
        .querySelectorAll(".extra-nights-checkbox:checked")
        .forEach((cb) => {
          extraPrice += parseFloat(cb.value || 0);
        });

      let toursPrice = 0;
      document.querySelectorAll(".tour-pax-checkbox:checked").forEach((cb) => {
        toursPrice += parseFloat(cb.dataset.rate || 0);
      });

      document.getElementById("basePrice").textContent =
        `₱${basePrice.toLocaleString()}`;
      document.getElementById("extraNightsPrice").textContent =
        `₱${extraPrice.toLocaleString()}`;
      document.getElementById("toursPrice").textContent =
        `₱${toursPrice.toLocaleString()}`;
      document.getElementById("totalPrice").textContent =
        `₱${(basePrice + extraPrice + toursPrice).toLocaleString()}`;
    }

    openInquiryModal(destinationName) {
      const inquiryModal = document.createElement("div");
      inquiryModal.className =
        "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[999999]";
      inquiryModal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-envelope text-2xl text-blue-600"></i>
          </div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">Inquiry Sent!</h3>
          <p class="text-gray-600 mb-6">We'll respond to your inquiry about ${destinationName} within 24 hours.</p>
          <button onclick="this.closest('.fixed').remove()" 
                  class="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:opacity-90 transition">
            Close
          </button>
        </div>
      `;
      document.body.appendChild(inquiryModal);
      setTimeout(() => inquiryModal.remove(), 3000);
    }

    showPackage(index) {
      document
        .querySelectorAll('[id^="modalPackage"]')
        .forEach((p) => p.classList.add("hidden"));
      document
        .getElementById(`modalPackage${index}`)
        ?.classList.remove("hidden");

      document.querySelectorAll(".package-tab").forEach((t, i) => {
        if (i === index) {
          t.classList.add("bg-teal-700", "text-white");
          t.classList.remove("bg-gray-100", "text-gray-700");
        } else {
          t.classList.add("bg-gray-100", "text-gray-700");
          t.classList.remove("bg-teal-700", "text-white");
        }
      });
    }

    getDestinationImage(name) {
      const images = {
        Bacolod:
          "https://images.unsplash.com/photo-1625034902529-1e6bd3b2921e?w=800",
        Palawan:
          "https://images.unsplash.com/photo-1717992012486-b46c0e7c7bd2?w=800",
        Boracay:
          "https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?w=800",
        Siargao:
          "https://images.unsplash.com/photo-1590075894056-317510db35a6?w=800",
        Bohol:
          "https://images.unsplash.com/photo-1518709766635-a24c6dfa6f4a?w=800",
        Cebu: "https://images.unsplash.com/photo-1565967511849-76a60a516170?w=800",
        Balabac:
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      };

      for (const [key, url] of Object.entries(images)) {
        if (name?.toLowerCase().includes(key.toLowerCase())) return url;
      }
      return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800";
    }

    prevImage() {
      if (this.images.length === 0) return;
      this.currentImageIndex =
        (this.currentImageIndex - 1 + this.images.length) % this.images.length;
      this.updateMainImage();
    }

    nextImage() {
      if (this.images.length === 0) return;
      this.currentImageIndex =
        (this.currentImageIndex + 1) % this.images.length;
      this.updateMainImage();
    }

    updateMainImage() {
      const mainImage = document.getElementById("currentMainImage");
      const counter = document.getElementById("currentImageIndex");
      if (mainImage && this.images[this.currentImageIndex]) {
        mainImage.src = this.images[this.currentImageIndex].url;
      }
      if (counter) counter.textContent = this.currentImageIndex + 1;
    }

    startAutoCarousel() {
      this.stopAutoCarousel();
      if (this.images?.length > 1) {
        this.carouselInterval = setInterval(() => this.nextImage(), 3000);
      }
    }

    stopAutoCarousel() {
      if (this.carouselInterval) {
        clearInterval(this.carouselInterval);
        this.carouselInterval = null;
      }
    }

    closeModal() {
      this.stopAutoCarousel();
      if (this.modal) {
        this.modal.classList.remove("active");
        document.body.style.overflow = "";
        this.currentImageIndex = 0;
        this.images = [];
        this.currentDestination = null;
      }
    }

    showErrorInModal(message) {
      this.detailContent.innerHTML = `
        <button class="modal-close-btn fixed top-4 right-4 w-12 h-12 bg-white rounded-full shadow-lg" onclick="destinationsManager.closeModal()">
          <i class="fas fa-times text-teal-700 text-xl"></i>
        </button>
        <div class="max-w-4xl mx-auto px-4 py-8 text-center">
          <div class="bg-white rounded-xl shadow-lg p-12">
            <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-exclamation-triangle text-3xl text-red-600"></i>
            </div>
            <h3 class="text-2xl font-bold text-gray-700 mb-2">Error Loading Details</h3>
            <p class="text-gray-500 mb-6">${message}</p>
            <button onclick="destinationsManager.closeModal()" class="px-8 py-3 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition">
              Close
            </button>
          </div>
        </div>
      `;
    }

    formatCurrency(val) {
      if (!val && val !== 0) return "—";
      return `₱${Number(val).toLocaleString()}`;
    }

    showLoading() {
      if (this.spinner) this.spinner.style.display = "block";
      if (this.grid) this.grid.style.display = "none";
      if (this.errorMsg) this.errorMsg.style.display = "none";
    }

    hideLoading() {
      if (this.spinner) this.spinner.style.display = "none";
      if (this.grid) this.grid.style.display = "grid";
    }

    showEmpty() {
      this.hideLoading();
      if (this.grid) {
        this.grid.innerHTML =
          '<p class="text-center text-gray-600 col-span-4 py-12">No destinations found.</p>';
        this.grid.style.display = "grid";
      }
    }

    showError(message) {
      this.hideLoading();
      if (this.errorMsg) {
        this.errorMsg.style.display = "block";
        this.errorMsg.innerHTML = `Error: ${message}`;
      }
    }
  }

  // Initialize
  if (!window.destinationsManager) {
    document.addEventListener("DOMContentLoaded", function () {
      window.destinationsManager = new DestinationsManager();
      setTimeout(() => {
        window.destinationsManager.loadDestinations();
      }, 500);
    });
  }

  window.showDestinationDetails = (id) => {
    if (window.destinationsManager) {
      window.destinationsManager.showDestinationModal(id);
    }
  };

  window.closeDetailModal = () => {
    if (window.destinationsManager) {
      window.destinationsManager.closeModal();
    }
  };
}

console.log("✅ Tours.js loaded - with REAL-TIME AUTO-FETCH!");
