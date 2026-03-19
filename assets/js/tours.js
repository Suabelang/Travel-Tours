// ============================================
// DESTINATIONS GRID AND MODALS - COMPLETE FIXED VERSION
// WITH PROPER OPTIONAL TOUR RATES FETCHING
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
      this.isLoading = false;

      // Clear grid sa simula pa lang
      if (this.grid) {
        this.grid.innerHTML = "";
      }
    }

    // ============================================
    // LOAD DESTINATIONS - OPTIMIZED VERSION
    // ============================================
    async loadDestinations() {
      if (this.isLoading) {
        console.log("⚠️ Already loading destinations, skipping...");
        return;
      }

      try {
        this.isLoading = true;
        this.showLoading();

        console.log("🔄 Fetching destinations with optional tour rates...");

        this.destinations = [];
        this.filteredDestinations = [];

        // STEP 1: Get all destinations with their relations
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
                optional_tour_id,
                optional_tours (
                  id,
                  tour_name,
                  duration_hours,
                  itinerary,
                  inclusions,
                  exclusions,
                  image_url,
                  is_active
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

        if (error) {
          console.error("❌ Supabase error:", error);
          throw error;
        }

        console.log("✅ Raw data from Supabase:", destinations);

        // STEP 2: Collect ALL tour IDs that need rates
        const allTourIds = [];
        destinations?.forEach((dest) => {
          dest.destination_packages?.forEach((pkg) => {
            pkg.package_optional_tours?.forEach((item) => {
              if (item.optional_tours) {
                allTourIds.push(item.optional_tour_id);
              }
            });
          });
        });

        console.log(`📊 Found ${allTourIds.length} unique tours needing rates`);

        // STEP 3: SINGLE QUERY to get ALL rates at once
        let ratesByTourId = {};

        if (allTourIds.length > 0) {
          const { data: allRates, error: ratesError } =
            await window.sns_supabase_client
              .from("optional_tour_rates")
              .select("*")
              .in("tour_id", allTourIds);

          if (ratesError) {
            console.error("❌ Error fetching bulk rates:", ratesError);
          }

          console.log(
            `💰 Fetched ${allRates?.length || 0} rates in a single query`,
          );

          // STEP 4: Organize rates by tour_id for quick access
          ratesByTourId = {};
          (allRates || []).forEach((rate) => {
            if (!ratesByTourId[rate.tour_id]) {
              ratesByTourId[rate.tour_id] = [];
            }
            ratesByTourId[rate.tour_id].push(rate);
          });
        }

        // STEP 5: Attach rates to their respective tours
        for (const dest of destinations || []) {
          const processedDest = { ...dest };

          if (processedDest.destination_packages) {
            for (const pkg of processedDest.destination_packages) {
              if (pkg.package_optional_tours) {
                for (const item of pkg.package_optional_tours) {
                  if (item.optional_tours) {
                    const tourId = item.optional_tour_id;
                    item.optional_tours.optional_tour_rates =
                      ratesByTourId[tourId] || [];
                  }
                }
              }
            }
          }

          this.destinations.push(processedDest);
        }

        this.filteredDestinations = [...this.destinations];

        console.log(`✅ Destinations loaded: ${this.destinations.length}`);

        this.debugData();
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
      } finally {
        this.isLoading = false;
      }
    }

    // ============================================
    // DEBUG FUNCTION
    // ============================================
    debugData() {
      console.log("🔍 Debugging data structure...");

      this.destinations.forEach((dest, dIdx) => {
        console.log(`📍 Destination ${dIdx + 1}: ${dest.name}`);

        dest.destination_packages?.forEach((pkg, pIdx) => {
          console.log(`  📦 Package ${pIdx + 1}: ${pkg.package_name}`);

          pkg.package_optional_tours?.forEach((item, tIdx) => {
            const tour = item.optional_tours;
            if (tour) {
              console.log(`    🎯 Tour ${tIdx + 1}: ${tour.tour_name}`);
              console.log(`       Rates:`, tour.optional_tour_rates || []);
              console.log(`       Itinerary:`, tour.itinerary || []);
              console.log(`       Inclusions:`, tour.inclusions || []);
              console.log(`       Exclusions:`, tour.exclusions || []);
            }
          });
        });
      });
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
        const destination = this.destinations.find(
          (d) => d.id === destinationId,
        );

        if (!destination) {
          throw new Error("Destination not found");
        }

        console.log("✅ Destination loaded:", destination.name);
        console.log("📦 Package data:", destination.destination_packages);

        this.currentDestination = destination;
        this.images = destination.destination_images || [];
        this.currentImageIndex = 0;
        this.hotelCategories = destination.hotel_categories || [];

        const packages = destination.destination_packages || [];

        if (!packages.length) {
          console.log("❌ No packages found, showing destination only");
          this.renderDestinationOnly(destination);
          this.startAutoCarousel();
          return;
        }

        this.renderCompleteModal(destination, packages);
        this.startAutoCarousel();
      } catch (error) {
        console.error("❌ Modal error:", error);
        this.showErrorInModal(error.message);
      }
    }

    // ============================================
    // RENDER COMPLETE MODAL
    // ============================================
    renderCompleteModal(destination, packages) {
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
      
      <!-- Carousel Container -->
      <div class="relative rounded-xl overflow-hidden" style="height: 500px;" 
           onmouseenter="destinationsManager.pauseAutoCarousel()" 
           onmouseleave="destinationsManager.resumeAutoCarousel()">
        
        <!-- Main Image -->
        <img id="carouselMainImage" src="${destination.destination_images[0]?.url}" 
             alt="${destination.name}" class="w-full h-full object-cover transition-opacity duration-500" />
        
        <!-- Navigation Buttons -->
        ${
          destination.destination_images.length > 1
            ? `
          <button class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full shadow-lg transition z-10 hover:scale-110" 
                  onclick="destinationsManager.prevCarouselImage()"
                  onmouseenter="destinationsManager.pauseAutoCarousel()"
                  onmouseleave="destinationsManager.resumeAutoCarousel()">
            <i class="fas fa-chevron-left text-teal-700 text-xl"></i>
          </button>
          <button class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full shadow-lg transition z-10 hover:scale-110" 
                  onclick="destinationsManager.nextCarouselImage()"
                  onmouseenter="destinationsManager.pauseAutoCarousel()"
                  onmouseleave="destinationsManager.resumeAutoCarousel()">
            <i class="fas fa-chevron-right text-teal-700 text-xl"></i>
          </button>
          
          <!-- Image Counter -->
          <div class="absolute bottom-4 right-4 bg-black/50 text-white px-4 py-2 rounded-full text-sm z-10 backdrop-blur-sm">
            <span id="carouselCurrentIndex">1</span> / <span id="carouselTotalImages">${destination.destination_images.length}</span>
          </div>
        `
            : ""
        }
      </div>
      
      <!-- Thumbnail Navigation -->
      ${
        destination.destination_images.length > 1
          ? `
        <div class="flex gap-2 mt-4 overflow-x-auto pb-2 carousel-thumbnails"
             onmouseenter="destinationsManager.pauseAutoCarousel()"
             onmouseleave="destinationsManager.resumeAutoCarousel()">
          ${destination.destination_images
            .map(
              (img, idx) => `
            <div class="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-300 hover:scale-105
                        ${idx === 0 ? "border-teal-600 opacity-100 scale-105" : "border-transparent opacity-60 hover:opacity-100"}"
                 onclick="destinationsManager.goToCarouselImage(${idx})">
              <img src="${img.url}" alt="Thumbnail ${idx + 1}" class="w-full h-full object-cover">
            </div>
          `,
            )
            .join("")}
        </div>
      `
          : ""
      }
    </div>
  `
          : '<div class="text-center py-8 bg-gray-50 rounded-lg border-2 border-gray-200 mb-6"><p class="text-gray-500">No images available</p></div>';

      const overviewHtml = `
        <div class="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl border-2 border-indigo-100 mb-6">
          <div class="flex flex-col md:flex-row gap-6">
            <div class="md:w-1/3">
              <div class="aspect-video rounded-xl overflow-hidden shadow-lg bg-gray-100 flex items-center justify-center">
                ${
                  primaryImage?.url
                    ? `<img src="${primaryImage.url}" alt="${destination.name}" class="w-full h-full object-cover">`
                    : `<i class="fas fa-image text-gray-400 text-4xl"></i>`
                }
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

            ${this.renderHotelsSection(pkg)}

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

            ${this.renderOptionalTours(pkg)}

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

      // UPDATED: Tinanggal ang close button sa itaas
      this.detailContent.innerHTML = `
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

    // ============================================
    // RENDER HOTELS SECTION
    // ============================================
    renderHotelsSection(pkg) {
      if (!this.hotelCategories || this.hotelCategories.length === 0) {
        return '<div class="text-center py-6 bg-gray-50 rounded-lg"><p class="text-sm text-gray-500">No hotel categories available</p></div>';
      }

      return `
        <div class="bg-white p-5 rounded-xl border-2 border-gray-200">
          <h4 class="text-lg font-bold mb-4 flex items-center gap-2 text-teal-700">
            <i class="fas fa-hotel"></i>
            Hotels & Accommodations
          </h4>
          <div class="space-y-4">
            ${this.hotelCategories
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
                  
                  ${
                    categoryRates.rate_solo || categoryRates.rate_2pax
                      ? `
                    <div class="p-3 bg-white border-b border-gray-200">
                      <p class="text-xs font-semibold text-orange-600 mb-2">Rates per person:</p>
                      <div class="grid grid-cols-3 gap-2 text-xs">
                        ${categoryRates.rate_solo ? `<div><span class="text-gray-500">Solo:</span> <span class="font-bold">₱${Number(categoryRates.rate_solo).toLocaleString()}</span></div>` : ""}
                        ${categoryRates.rate_2pax ? `<div><span class="text-gray-500">2 Pax:</span> <span class="font-bold">₱${Number(categoryRates.rate_2pax).toLocaleString()}</span></div>` : ""}
                        ${categoryRates.rate_3pax ? `<div><span class="text-gray-500">3 Pax:</span> <span class="font-bold">₱${Number(categoryRates.rate_3pax).toLocaleString()}</span></div>` : ""}
                        ${categoryRates.rate_4pax ? `<div><span class="text-gray-500">4 Pax:</span> <span class="font-bold">₱${Number(categoryRates.rate_4pax).toLocaleString()}</span></div>` : ""}
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
      `;
    }

    // ============================================
    // RENDER OPTIONAL TOURS - IMPROVED VERSION
    // ============================================
    renderOptionalTours(pkg) {
      if (
        !pkg.package_optional_tours ||
        pkg.package_optional_tours.length === 0
      ) {
        return "";
      }

      console.log("🎯 Rendering optional tours for package:", pkg.package_name);

      const validTours = pkg.package_optional_tours.filter(
        (item) =>
          item.optional_tours && item.optional_tours.is_active !== false,
      );

      if (validTours.length === 0) {
        return "";
      }

      return `
        <div class="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border-2 border-purple-200 shadow-lg">
          <div class="flex items-center justify-between mb-6">
            <h4 class="text-2xl font-bold text-purple-700 flex items-center gap-3">
              <i class="fas fa-compass bg-purple-700 text-white p-2 rounded-lg"></i>
              Optional Tours
            </h4>
            <span class="bg-purple-700 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md">
              ${validTours.length} Tour${validTours.length > 1 ? "s" : ""} Available
            </span>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${validTours
              .map((item) => {
                const tour = item.optional_tours;
                const rates = tour.optional_tour_rates || [];
                const firstRate = rates.length > 0 ? rates[0] : null;

                // Generate rate display
                let rateDisplay = "";
                if (firstRate) {
                  const rateItems = [];
                  if (
                    firstRate.rate_solo &&
                    parseFloat(firstRate.rate_solo) > 0
                  ) {
                    rateItems.push({
                      label: "Solo",
                      value: firstRate.rate_solo,
                      icon: "fa-user",
                    });
                  }
                  if (
                    firstRate.rate_2pax &&
                    parseFloat(firstRate.rate_2pax) > 0
                  ) {
                    rateItems.push({
                      label: "2 Pax",
                      value: firstRate.rate_2pax,
                      icon: "fa-users",
                    });
                  }
                  if (
                    firstRate.rate_3pax &&
                    parseFloat(firstRate.rate_3pax) > 0
                  ) {
                    rateItems.push({
                      label: "3 Pax",
                      value: firstRate.rate_3pax,
                      icon: "fa-users",
                    });
                  }
                  if (
                    firstRate.rate_4pax &&
                    parseFloat(firstRate.rate_4pax) > 0
                  ) {
                    rateItems.push({
                      label: "4 Pax",
                      value: firstRate.rate_4pax,
                      icon: "fa-users",
                    });
                  }
                  if (
                    firstRate.rate_5pax &&
                    parseFloat(firstRate.rate_5pax) > 0
                  ) {
                    rateItems.push({
                      label: "5 Pax",
                      value: firstRate.rate_5pax,
                      icon: "fa-users",
                    });
                  }
                  if (
                    firstRate.rate_child_4_9 &&
                    parseFloat(firstRate.rate_child_4_9) > 0
                  ) {
                    rateItems.push({
                      label: "Child (4-9)",
                      value: firstRate.rate_child_4_9,
                      icon: "fa-child",
                    });
                  }

                  if (rateItems.length > 0) {
                    rateDisplay = `
                      <div class="bg-white rounded-lg p-3 border border-purple-100 mt-3">
                        <p class="text-xs font-semibold text-purple-600 mb-2 flex items-center gap-1">
                          <i class="fas fa-tag"></i> Rates:
                        </p>
                        <div class="grid grid-cols-2 gap-2">
                          ${rateItems
                            .slice(0, 4)
                            .map(
                              (item) => `
                            <div class="flex items-center gap-1 text-xs bg-purple-50 p-1.5 rounded">
                              <i class="fas ${item.icon} text-purple-500 w-4"></i>
                              <span class="text-gray-600">${item.label}:</span>
                              <span class="font-bold text-orange-500">₱${Number(item.value).toLocaleString()}</span>
                            </div>
                          `,
                            )
                            .join("")}
                        </div>
                        ${rateItems.length > 4 ? '<p class="text-xs text-gray-400 mt-1">+ more rates available...</p>' : ""}
                      </div>
                    `;
                  }
                }

                // Generate preview text
                let previewText = "";
                if (tour.itinerary && tour.itinerary.length > 0) {
                  previewText =
                    tour.itinerary[0].substring(0, 100) +
                    (tour.itinerary[0].length > 100 ? "..." : "");
                } else if (tour.inclusions && tour.inclusions.length > 0) {
                  previewText = `✓ Includes: ${tour.inclusions.slice(0, 2).join(", ")}`;
                }

                return `
                  <div class="bg-white rounded-xl overflow-hidden border-2 border-purple-100 hover:border-purple-300 hover:shadow-xl transition-all duration-300 group">
                    <!-- Tour Image/Header -->
                    <div class="relative h-40 bg-gradient-to-r from-purple-600 to-purple-800 overflow-hidden">
                      ${
                        tour.image_url
                          ? `<img src="${tour.image_url}" alt="${tour.tour_name}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">`
                          : `<div class="w-full h-full flex items-center justify-center">
                             <i class="fas fa-map-marked-alt text-5xl text-white/30"></i>
                           </div>`
                      }
                      <div class="absolute top-3 right-3">
                        <span class="bg-white/90 backdrop-blur-sm text-purple-700 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                          <i class="far fa-clock"></i>
                          ${tour.duration_hours || "N/A"}h
                        </span>
                      </div>
                      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4">
                        <h5 class="font-bold text-white text-lg group-hover:text-purple-200 transition">${tour.tour_name}</h5>
                      </div>
                    </div>
                    
                    <!-- Tour Content -->
                    <div class="p-4">
                      ${
                        previewText
                          ? `
                        <div class="mb-3 text-sm text-gray-600 line-clamp-2 flex items-start gap-2">
                          <i class="fas fa-info-circle text-purple-500 mt-0.5 flex-shrink-0"></i>
                          <span>${previewText}</span>
                        </div>
                      `
                          : ""
                      }
                      
                      ${rateDisplay}
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      `;
    }

    // ============================================
    // OPEN BOOKING MODAL
    // ============================================
    async openBookingModal(packageName, packageId) {
      console.log("🟢 OPEN BOOKING MODAL CLICKED!", { packageName, packageId });
      this.currentPackage = packageName;
      this.currentPackageId = packageId;

      const destination = this.destinations.find((d) =>
        d.destination_packages?.some((p) => p.id == packageId),
      );

      if (!destination) {
        alert("Package not found");
        return;
      }

      const pkg = destination.destination_packages?.find(
        (p) => p.id == packageId,
      );

      if (!pkg) {
        alert("Package not found");
        return;
      }

      console.log("✅ Package found:", pkg.package_name);

      // GET DATA DIRECTLY FROM DATABASE
      const hotelCategories = destination.hotel_categories || [];
      const packageRates = pkg.package_hotel_rates || [];

      const optionalTours = (pkg.package_optional_tours || [])
        .filter(
          (item) =>
            item.optional_tours && item.optional_tours.is_active !== false,
        )
        .map((item) => ({
          ...item,
          optional_tours: {
            ...item.optional_tours,
            optional_tour_rates: item.optional_tours?.optional_tour_rates || [],
          },
        }));

      const existingModal = document.getElementById("bookingModal");
      if (existingModal) existingModal.remove();

      const modal = document.createElement("div");
      modal.id = "bookingModal";
      modal.className =
        "fixed inset-0 bg-black/90 flex items-center justify-center z-[999999] overflow-y-auto p-5";

      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.closeBookingModal();
      });

      const today = new Date().toISOString().split("T")[0];

      // Hotel Selection HTML
      const hotelSelectionHtml = hotelCategories
        .map((cat, index) => {
          const rate = packageRates.find((r) => r.hotel_category_id === cat.id);
          if (!rate) return "";

          const categoryHotels = cat.hotels?.filter((h) => h.is_active) || [];

          return `
            <div class="hotel-category-card mb-6 border-2 border-gray-200 rounded-xl overflow-hidden">
              <div class="bg-gradient-to-r from-orange-500 to-orange-600 p-4 cursor-pointer hover:opacity-90 transition category-header" 
                   data-category-id="${cat.id}">
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
              
              <div class="hotels-section bg-white border-b border-gray-200" 
                   data-category-id="${cat.id}" 
                   style="display: ${index === 0 ? "block" : "none"};">
                
                ${
                  categoryHotels.length > 0
                    ? `
                  <div class="p-4">
                    <h5 class="font-semibold text-gray-700 mb-3 flex items-center gap-1">
                      <i class="fas fa-hotel text-blue-500"></i>
                      Available Hotels in ${cat.category_name}
                    </h5>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                      ${categoryHotels
                        .map(
                          (hotel) => `
                        <div class="hotel-card border rounded-lg p-3 bg-white hover:shadow-md transition">
                          <div class="flex gap-3">
                            <div class="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                              ${
                                hotel.image_url
                                  ? `<img src="${hotel.image_url}" alt="${hotel.name}" class="w-full h-full object-cover">`
                                  : `<div class="w-full h-full flex items-center justify-center"><i class="fas fa-hotel text-gray-400 text-xl"></i></div>`
                              }
                            </div>
                            <div class="flex-1">
                              <div class="flex items-start justify-between">
                                <div>
                                  <h6 class="font-bold text-sm text-gray-800">${hotel.name}</h6>
                                  <p class="text-xs text-gray-500">Max: ${hotel.max_capacity || "N/A"} guests</p>
                                  ${
                                    hotel.description
                                      ? `<p class="text-xs text-gray-600 mt-1 line-clamp-2">${hotel.description}</p>`
                                      : ""
                                  }
                                </div>
                                <div class="ml-2">
                                  <input type="radio" 
                                         name="selectedHotel" 
                                         value="${hotel.id}" 
                                         data-hotel-name="${hotel.name}"
                                         data-hotel-category="${cat.id}"
                                         class="w-4 h-4 accent-blue-600 cursor-pointer">
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      `,
                        )
                        .join("")}
                    </div>
                  </div>
                  `
                    : '<div class="p-4 text-center"><p class="text-sm text-gray-400 italic">No hotels available in this category</p></div>'
                }
              </div>
              
              <div class="pax-options-section p-5 bg-white" data-category-id="${cat.id}" style="display: none;">
                <div class="mb-3 text-sm text-gray-500 italic">
                  <i class="fas fa-info-circle mr-1"></i> Select a hotel above to view rates
                </div>
                
                <table class="w-full border-collapse">
                  <thead>
                    <tr class="bg-orange-500 text-white">
                      <th class="p-3 text-left">Pax Type</th>
                      <th class="p-3 text-center">Rate per person</th>
                      <th class="p-3 text-center">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.renderPaxRows(rate, cat.id)}
                  </tbody>
                </table>

                ${this.renderExtraNights(rate, cat.id)}
              </div>
            </div>
          `;
        })
        .join("");

      // Optional Tours HTML
      let optionalToursHtml = this.renderOptionalToursBooking(optionalTours);

      // Complete Modal HTML
      modal.innerHTML = this.buildBookingModalHTML(
        destination,
        packageName,
        pkg,
        hotelCategories,
        hotelSelectionHtml,
        optionalToursHtml,
        today,
      );

      document.body.appendChild(modal);
      this.attachBookingEvents();
    }

    // Helper methods for booking modal
    renderPaxRows(rate, categoryId) {
      let rows = "";

      if (rate.rate_solo && parseFloat(rate.rate_solo) > 0) {
        rows += `
          <tr class="border-b">
            <td class="p-3">Solo (1 person)</td>
            <td class="p-3 text-center font-semibold text-orange-500">₱${Number(rate.rate_solo).toLocaleString()}</td>
            <td class="p-3 text-center">
              <input type="radio" name="paxType" class="pax-radio" 
                     data-pax="solo" value="1" data-rate="${rate.rate_solo}"
                     data-category="${categoryId}" disabled>
            </td>
          </tr>
        `;
      }

      if (rate.rate_2pax && parseFloat(rate.rate_2pax) > 0) {
        rows += `
          <tr class="border-b">
            <td class="p-3">2 Persons</td>
            <td class="p-3 text-center font-semibold text-orange-500">₱${Number(rate.rate_2pax).toLocaleString()}</td>
            <td class="p-3 text-center">
              <input type="radio" name="paxType" class="pax-radio"
                     data-pax="2pax" value="2" data-rate="${rate.rate_2pax}"
                     data-category="${categoryId}" disabled>
            </td>
          </tr>
        `;
      }

      if (rate.rate_3pax && parseFloat(rate.rate_3pax) > 0) {
        rows += `
          <tr class="border-b">
            <td class="p-3">3 Persons</td>
            <td class="p-3 text-center font-semibold text-orange-500">₱${Number(rate.rate_3pax).toLocaleString()}</td>
            <td class="p-3 text-center">
              <input type="radio" name="paxType" class="pax-radio"
                     data-pax="3pax" value="3" data-rate="${rate.rate_3pax}"
                     data-category="${categoryId}" disabled>
            </td>
          </tr>
        `;
      }

      if (rate.rate_4pax && parseFloat(rate.rate_4pax) > 0) {
        rows += `
          <tr class="border-b">
            <td class="p-3">4 Persons</td>
            <td class="p-3 text-center font-semibold text-orange-500">₱${Number(rate.rate_4pax).toLocaleString()}</td>
            <td class="p-3 text-center">
              <input type="radio" name="paxType" class="pax-radio"
                     data-pax="4pax" value="4" data-rate="${rate.rate_4pax}"
                     data-category="${categoryId}" disabled>
            </td>
          </tr>
        `;
      }

      if (rate.rate_5pax && parseFloat(rate.rate_5pax) > 0) {
        rows += `
          <tr class="border-b">
            <td class="p-3">5 Persons</td>
            <td class="p-3 text-center font-semibold text-orange-500">₱${Number(rate.rate_5pax).toLocaleString()}</td>
            <td class="p-3 text-center">
              <input type="radio" name="paxType" class="pax-radio"
                     data-pax="5pax" value="5" data-rate="${rate.rate_5pax}"
                     data-category="${categoryId}" disabled>
            </td>
          </tr>
        `;
      }

      if (
        rate.rate_child_no_breakfast &&
        parseFloat(rate.rate_child_no_breakfast) > 0
      ) {
        rows += `
          <tr>
            <td class="p-3">Child (No Breakfast)</td>
            <td class="p-3 text-center font-semibold text-orange-500">₱${Number(rate.rate_child_no_breakfast).toLocaleString()}</td>
            <td class="p-3 text-center">
              <input type="radio" name="paxType" class="pax-radio"
                     data-pax="child" value="1" data-rate="${rate.rate_child_no_breakfast}"
                     data-category="${categoryId}" disabled>
            </td>
          </tr>
        `;
      }

      return rows;
    }

    renderExtraNights(rate, categoryId) {
      if (
        (rate.extra_night_solo && parseFloat(rate.extra_night_solo) > 0) ||
        (rate.extra_night_2pax && parseFloat(rate.extra_night_2pax) > 0) ||
        (rate.extra_night_3pax && parseFloat(rate.extra_night_3pax) > 0) ||
        (rate.extra_night_4pax && parseFloat(rate.extra_night_4pax) > 0) ||
        (rate.extra_night_5pax && parseFloat(rate.extra_night_5pax) > 0)
      ) {
        let rows = "";

        if (rate.extra_night_solo && parseFloat(rate.extra_night_solo) > 0) {
          rows += `
            <tr>
              <td class="p-2">Solo</td>
              <td class="p-2 text-right font-semibold text-orange-500">₱${Number(rate.extra_night_solo).toLocaleString()}</td>
              <td class="p-2 text-center">
                <input type="radio" name="extraNight" class="extra-night-radio" 
                       data-category="${categoryId}" data-pax="solo" value="${rate.extra_night_solo}" disabled>
              </td>
            </tr>
          `;
        }

        if (rate.extra_night_2pax && parseFloat(rate.extra_night_2pax) > 0) {
          rows += `
            <tr>
              <td class="p-2">2 Persons</td>
              <td class="p-2 text-right font-semibold text-orange-500">₱${Number(rate.extra_night_2pax).toLocaleString()}</td>
              <td class="p-2 text-center">
                <input type="radio" name="extraNight" class="extra-night-radio"
                       data-category="${categoryId}" data-pax="2pax" value="${rate.extra_night_2pax}" disabled>
              </td>
            </tr>
          `;
        }

        if (rate.extra_night_3pax && parseFloat(rate.extra_night_3pax) > 0) {
          rows += `
            <tr>
              <td class="p-2">3 Persons</td>
              <td class="p-2 text-right font-semibold text-orange-500">₱${Number(rate.extra_night_3pax).toLocaleString()}</td>
              <td class="p-2 text-center">
                <input type="radio" name="extraNight" class="extra-night-radio"
                       data-category="${categoryId}" data-pax="3pax" value="${rate.extra_night_3pax}" disabled>
              </td>
            </tr>
          `;
        }

        if (rate.extra_night_4pax && parseFloat(rate.extra_night_4pax) > 0) {
          rows += `
            <tr>
              <td class="p-2">4 Persons</td>
              <td class="p-2 text-right font-semibold text-orange-500">₱${Number(rate.extra_night_4pax).toLocaleString()}</td>
              <td class="p-2 text-center">
                <input type="radio" name="extraNight" class="extra-night-radio"
                       data-category="${categoryId}" data-pax="4pax" value="${rate.extra_night_4pax}" disabled>
              </td>
            </tr>
          `;
        }

        if (rate.extra_night_5pax && parseFloat(rate.extra_night_5pax) > 0) {
          rows += `
            <tr>
              <td class="p-2">5 Persons</td>
              <td class="p-2 text-right font-semibold text-orange-500">₱${Number(rate.extra_night_5pax).toLocaleString()}</td>
              <td class="p-2 text-center">
                <input type="radio" name="extraNight" class="extra-night-radio"
                       data-category="${categoryId}" data-pax="5pax" value="${rate.extra_night_5pax}" disabled>
              </td>
            </tr>
          `;
        }

        return `
          <div class="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h5 class="font-semibold text-orange-600 mb-3">Extra Night Rates</h5>
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-orange-100">
                  <th class="p-2 text-left">Pax Type</th>
                  <th class="p-2 text-right">Rate per night</th>
                  <th class="p-2 text-center">Select</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        `;
      }

      return "";
    }

    renderOptionalToursBooking(optionalTours) {
      if (!optionalTours || optionalTours.length === 0) {
        return "";
      }

      let html = '<div class="space-y-4 mt-4">';

      optionalTours.forEach((item) => {
        const tour = item.optional_tours;
        if (!tour) return;

        const rates = tour.optional_tour_rates || [];
        const firstRate = rates.length > 0 ? rates[0] : {};

        const hasRates = Object.values(firstRate).some(
          (val) => val && parseFloat(val) > 0,
        );
        if (!hasRates) return;

        const rateFields = [
          { key: "rate_solo", label: "Solo (1 person)", pax: "solo" },
          { key: "rate_2pax", label: "2 Persons", pax: "2pax" },
          { key: "rate_3pax", label: "3 Persons", pax: "3pax" },
          { key: "rate_4pax", label: "4 Persons", pax: "4pax" },
          { key: "rate_5pax", label: "5 Persons", pax: "5pax" },
          { key: "rate_child_4_9", label: "Child (4-9 years)", pax: "child" },
        ];

        const availableRates = rateFields.filter(
          (field) =>
            firstRate[field.key] && parseFloat(firstRate[field.key]) > 0,
        );

        if (availableRates.length === 0) return;

        const tourRadioName = `tour_${tour.id}`;

        const rateItemsHtml = availableRates
          .map(
            (field) => `
            <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-purple-50 transition-colors border border-gray-200">
              <div class="flex items-center gap-3">
                <input type="radio" 
                       name="${tourRadioName}" 
                       class="tour-radio w-4 h-4 accent-purple-600 cursor-pointer" 
                       data-tour-id="${tour.id}" 
                       data-tour-name="${tour.tour_name}" 
                       data-pax="${field.pax}" 
                       data-rate="${firstRate[field.key]}" 
                       data-label="${field.label}">
                <span class="text-sm text-gray-700">${field.label}</span>
              </div>
              <span class="font-bold text-purple-600">₱${Number(firstRate[field.key]).toLocaleString()}</span>
            </div>
          `,
          )
          .join("");

        let previewText = "";
        if (tour.itinerary && tour.itinerary.length > 0) {
          previewText = tour.itinerary[0];
        } else if (tour.inclusions && tour.inclusions.length > 0) {
          previewText = `Includes: ${tour.inclusions.slice(0, 2).join(", ")}`;
        }

        html += `
          <div class="tour-card border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all">
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
            
            ${
              previewText
                ? `
              <div class="px-4 pt-4 pb-2 bg-purple-50 border-b border-purple-100">
                <p class="text-sm text-gray-600 line-clamp-2">${previewText}</p>
              </div>
            `
                : ""
            }
            
            <div class="p-4">
              <h6 class="font-semibold text-purple-700 mb-3 flex items-center gap-2">
                <i class="fas fa-tag"></i>
                Select Rate Type
              </h6>
              <div class="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                ${rateItemsHtml}
              </div>
            </div>
          </div>
        `;
      });

      html += "</div>";

      html += `
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

      return html;
    }

    buildBookingModalHTML(
      destination,
      packageName,
      pkg,
      hotelCategories,
      hotelSelectionHtml,
      optionalToursHtml,
      today,
    ) {
      return `
        <div class="bg-white w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
          <div class="bg-gradient-to-r from-orange-500 to-teal-700 text-white p-5 sticky top-0 z-10 rounded-t-2xl">
            <div class="flex justify-between items-center">
              <div>
                <h2 class="text-2xl font-bold">${destination.name}</h2>
                <p class="mt-1">${packageName}</p>
              </div>
              <button onclick="destinationsManager.closeBookingModal()" class="text-3xl hover:text-white/80">&times;</button>
            </div>
          </div>

          <div class="p-6">
            <div class="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 class="text-teal-700 font-semibold mb-2 flex items-center gap-2">
                <i class="fas fa-box"></i>
                Package Summary
              </h3>
              <p><span class="font-medium">${pkg.package_name}</span> ${pkg.package_code ? `(${pkg.package_code})` : ""}</p>
            </div>

            <h3 class="text-teal-700 font-bold text-xl mb-4 flex items-center gap-2">
              <i class="fas fa-hotel"></i>
              Select Hotel Category
            </h3>
            ${hotelSelectionHtml}

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

            <!-- SELECTION SUMMARY CARDS -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
              <div id="selectedCategorySummary" class="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h4 class="font-semibold text-orange-600 mb-2 flex items-center gap-1">
                  <i class="fas fa-layer-group text-sm"></i>
                  Selected Category
                </h4>
                <div id="selectedCategoryDisplay" class="font-medium">${hotelCategories[0]?.category_name || "None"}</div>
              </div>
              
              <div id="selectedHotelSummary" class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 class="font-semibold text-blue-600 mb-2 flex items-center gap-1">
                  <i class="fas fa-hotel text-sm"></i>
                  Selected Hotel
                </h4>
                <div id="selectedHotelDisplay" class="font-medium">None</div>
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

            <!-- YOUR INFORMATION SECTION -->
            <div class="mb-6">
              <h4 class="text-teal-700 font-semibold mb-4 flex items-center gap-2">
                <i class="fas fa-user"></i>
                Your Information
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input type="text" id="fullName" placeholder="Enter your full name" 
                         class="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" id="email" placeholder="your@email.com" 
                         class="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200">
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input type="tel" id="phone" placeholder="09XXXXXXXXX" 
                         class="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Travel Date *</label>
                  <input type="date" id="travelDate" min="${today}" 
                         class="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200">
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                <textarea id="requests" rows="2" placeholder="Any special requirements?" 
                          class="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200"></textarea>
              </div>
            </div>

            <!-- PRICE SUMMARY SECTION -->
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

            <!-- TERMS AND CONDITIONS -->
            <div class="flex items-start gap-3 mb-6 bg-gray-50 p-4 rounded-lg">
              <input type="checkbox" id="terms" class="w-5 h-5 accent-teal-700 mt-0.5 cursor-pointer">
              <div class="flex-1">
                <label for="terms" class="text-sm text-gray-600">
                  I agree to the 
                  <button type="button" onclick="destinationsManager.openTermsModal()" class="text-teal-700 font-semibold hover:underline focus:outline-none">
                    terms and conditions
                  </button>
                </label>
                <div id="termsError" class="text-red-500 text-xs mt-1 hidden">You must agree to the terms and conditions</div>
              </div>
            </div>

            <!-- BUTTONS -->
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
    }

    // ============================================
    // ATTACH BOOKING EVENTS
    // ============================================
    attachBookingEvents() {
      document
        .querySelectorAll('input[name="hotelCategory"]')
        .forEach((radio) => {
          radio.addEventListener("change", () => {
            const newCategoryId = radio.value;

            document
              .querySelectorAll('input[name="selectedHotel"]')
              .forEach((r) => {
                r.checked = false;
              });

            document.querySelectorAll(".pax-radio").forEach((r) => {
              r.checked = false;
            });

            document.querySelectorAll(".extra-night-radio").forEach((r) => {
              r.checked = false;
            });

            document.querySelectorAll(".tour-radio").forEach((r) => {
              r.checked = false;
            });

            document.querySelectorAll(".hotels-section").forEach((section) => {
              section.style.display = "none";
            });

            document
              .querySelectorAll(".pax-options-section")
              .forEach((section) => {
                section.style.display = "none";
                section
                  .querySelectorAll('input[type="radio"]')
                  .forEach((input) => {
                    input.disabled = true;
                    input.checked = false;
                  });
              });

            const selectedHotels = document.querySelector(
              `.hotels-section[data-category-id="${newCategoryId}"]`,
            );
            if (selectedHotels) {
              selectedHotels.style.display = "block";
            }

            this.updateHotelSelection();
            this.updatePaxSelection();
            this.updateExtraNightsSelection();
            this.updateTourSelection();
            this.updatePriceSummary();
          });
        });

      document
        .querySelectorAll('input[name="selectedHotel"]')
        .forEach((radio) => {
          radio.addEventListener("change", () => {
            console.log("✅ Hotel selected:", radio.dataset.hotelName);

            this.updateHotelSelection();

            const categoryId = radio.dataset.hotelCategory;

            document
              .querySelectorAll(".pax-options-section")
              .forEach((section) => {
                section.style.display = "none";
                section
                  .querySelectorAll('input[type="radio"]')
                  .forEach((input) => {
                    input.disabled = true;
                  });
              });

            const paxSection = document.querySelector(
              `.pax-options-section[data-category-id="${categoryId}"]`,
            );
            if (paxSection) {
              paxSection.style.display = "block";
              paxSection
                .querySelectorAll('input[type="radio"]')
                .forEach((input) => {
                  input.disabled = false;
                });
            }
          });
        });

      const initialChecked = document.querySelector(
        'input[name="hotelCategory"]:checked',
      );
      if (initialChecked) {
        initialChecked.dispatchEvent(new Event("change"));
      }

      document.querySelectorAll(".pax-radio").forEach((radio) => {
        radio.addEventListener("change", () => {
          this.updatePaxSelection();
          this.updatePriceSummary();
        });
      });

      document.querySelectorAll(".extra-night-radio").forEach((radio) => {
        radio.addEventListener("change", () => {
          this.updateExtraNightsSelection();
          this.updatePriceSummary();
        });
      });

      document.querySelectorAll(".tour-radio").forEach((radio) => {
        radio.addEventListener("change", () => {
          this.updateTourSelection();
          this.updatePriceSummary();
        });
      });

      this.updateHotelSelection();
      this.updatePaxSelection();
      this.updateExtraNightsSelection();
      this.updateTourSelection();
      this.updatePriceSummary();
    }

    // ============================================
    // UPDATE METHODS
    // ============================================
    updateHotelSelection() {
      const selectedCategory = document.querySelector(
        'input[name="hotelCategory"]:checked',
      );
      const categoryDisplay = document.getElementById(
        "selectedCategoryDisplay",
      );
      if (selectedCategory && categoryDisplay) {
        categoryDisplay.textContent = selectedCategory.dataset.category;
      }

      const selectedHotel = document.querySelector(
        'input[name="selectedHotel"]:checked',
      );
      const hotelDisplay = document.getElementById("selectedHotelDisplay");

      if (selectedHotel && hotelDisplay) {
        const hotelSummaryCard = document.getElementById(
          "selectedHotelSummary",
        );
        if (hotelSummaryCard) {
          hotelSummaryCard.classList.remove("hidden");
        }
        hotelDisplay.textContent = selectedHotel.dataset.hotelName;
      } else if (hotelDisplay) {
        const hotelSummaryCard = document.getElementById(
          "selectedHotelSummary",
        );
        if (hotelSummaryCard) {
          hotelSummaryCard.classList.add("hidden");
        }
        hotelDisplay.textContent = "None";
      }
    }

    updatePaxSelection() {
      const selected = document.querySelector(".pax-radio:checked");
      const display = document.getElementById("selectedPaxDisplay");

      if (selected && display) {
        const paxType = selected.dataset.pax;
        const count = selected.value;

        let displayText = "";
        if (paxType === "solo") displayText = "Solo (1 person)";
        else if (paxType === "child") displayText = "Child";
        else displayText = `${count} Persons`;

        display.textContent = displayText;
      } else if (display) {
        display.textContent = "None";
      }
    }

    updateExtraNightsSelection() {
      const selected = document.querySelector(".extra-night-radio:checked");
      const summaryDiv = document.getElementById("selectedExtraNightsSummary");
      const displayDiv = document.getElementById("selectedExtraNightsDisplay");

      if (summaryDiv && displayDiv) {
        if (selected) {
          const paxType = selected.dataset.pax;
          const value = parseFloat(selected.value);
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

          summaryDiv.classList.remove("hidden");
          displayDiv.innerHTML = `<div class="text-sm">• ${paxLabel} (+₱${value.toLocaleString()})</div>`;
        } else {
          summaryDiv.classList.add("hidden");
        }
      }
    }

    updateTourSelection() {
      const selectedTours = [];
      const selectedRadios = document.querySelectorAll(".tour-radio:checked");

      selectedRadios.forEach((radio) => {
        const tourId = radio.dataset.tourId;
        const tourName = radio.dataset.tourName;
        const paxLabel = radio.dataset.label;
        const rate = parseFloat(radio.dataset.rate);

        selectedTours.push(`
          <div class="mb-2">
            <span class="font-medium text-purple-700">${tourName}:</span>
            <div class="ml-4 text-sm">• ${paxLabel} (+₱${rate.toLocaleString()})</div>
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
      const selectedPax = document.querySelector(".pax-radio:checked");
      if (selectedPax) {
        basePrice = parseFloat(selectedPax.dataset.rate || 0);
      }

      let extraPrice = 0;
      const selectedExtra = document.querySelector(
        ".extra-night-radio:checked",
      );
      if (selectedExtra) {
        extraPrice = parseFloat(selectedExtra.value || 0);
      }

      let toursPrice = 0;
      document.querySelectorAll(".tour-radio:checked").forEach((radio) => {
        toursPrice += parseFloat(radio.dataset.rate || 0);
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

    // ============================================
    // SUBMIT BOOKING - WITH TERMS VALIDATION
    // ============================================
    async submitBooking() {
      console.log("🚀 Submitting booking...");

      const fullName = document.getElementById("fullName")?.value.trim();
      const email = document.getElementById("email")?.value.trim();
      const phone = document.getElementById("phone")?.value.trim();
      const travelDate = document.getElementById("travelDate")?.value;
      const requests = document.getElementById("requests")?.value.trim();

      // Validate terms first
      if (!this.validateTerms()) {
        alert("Please agree to the terms and conditions to proceed.");
        return;
      }

      if (!fullName || !email || !phone || !travelDate) {
        alert("Please fill in all required fields");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        alert("Please enter a valid email address");
        return;
      }

      const category = document.querySelector(
        'input[name="hotelCategory"]:checked',
      );
      if (!category) {
        alert("Please select a hotel category");
        return;
      }

      const selectedHotel = document.querySelector(
        'input[name="selectedHotel"]:checked',
      );
      if (!selectedHotel) {
        alert("Please select a hotel");
        return;
      }

      const selectedPax = document.querySelector(".pax-radio:checked");
      if (!selectedPax) {
        alert("Please select a pax type");
        return;
      }

      let adults = 0;
      let children = 0;
      const paxDetails = [];
      let basePrice = 0;

      const type = selectedPax.dataset.pax;
      const count = parseInt(selectedPax.value);
      const rate = parseFloat(selectedPax.dataset.rate || 0);

      if (type === "child") {
        children += count;
        basePrice += rate * count;
        paxDetails.push({ type: "child", count, rate });
      } else {
        adults += count;
        basePrice += rate * count;
        paxDetails.push({ type, count, rate });
      }

      const extraNightsDetails = [];
      let totalExtraNights = 0;

      const selectedExtra = document.querySelector(
        ".extra-night-radio:checked",
      );
      if (selectedExtra) {
        const paxType = selectedExtra.dataset.pax;
        const rate = parseFloat(selectedExtra.value || 0);
        const categoryId = selectedExtra.dataset.category;

        extraNightsDetails.push({ hotelCategoryId: categoryId, paxType, rate });
        totalExtraNights = rate;
      }

      const selectedTours = [];
      let toursPrice = 0;

      document.querySelectorAll(".tour-radio:checked").forEach((radio) => {
        const rate = parseFloat(radio.dataset.rate || 0);
        selectedTours.push({
          tourId: radio.dataset.tourId,
          tourName: radio.dataset.tourName,
          paxType: radio.dataset.pax,
          paxLabel: radio.dataset.label,
          rate,
        });
        toursPrice += rate;
      });

      const grandTotal = basePrice + totalExtraNights + toursPrice;

      const bookingData = {
        destination_id: this.destinations.find((d) =>
          d.destination_packages?.some((p) => p.id == this.currentPackageId),
        )?.id,
        package_id: this.currentPackageId,
        package_name: this.currentPackage,
        customer: {
          full_name: fullName,
          email,
          phone,
          special_requests: requests,
        },
        travel_date: travelDate,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        booking_details: {
          hotel_category_id: category.value,
          hotel_category_name: category.dataset.category,
          hotel_id: selectedHotel.value,
          hotel_name: selectedHotel.dataset.hotelName,
          adults,
          children,
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

      // Here you would typically send this to your backend
      // For now, show success message
      alert(
        "Booking submitted successfully! We'll contact you within 24 hours.",
      );
      this.closeBookingModal();
    }

    // ============================================
    // CAROUSEL FUNCTIONS - PURE AUTO-PLAY (NO BUTTONS)
    // ============================================

    // Auto-play controls
    startAutoCarousel() {
      this.stopAutoCarousel();
      if (this.images?.length > 1) {
        console.log("▶️ Starting auto-play carousel");
        this.carouselInterval = setInterval(() => {
          this.nextCarouselImage();
        }, 3000);
      }
    }

    stopAutoCarousel() {
      if (this.carouselInterval) {
        console.log("⏹️ Stopping auto-play carousel");
        clearInterval(this.carouselInterval);
        this.carouselInterval = null;
      }
    }

    pauseAutoCarousel() {
      if (this.carouselInterval) {
        console.log("⏸️ Pausing auto-play carousel");
        clearInterval(this.carouselInterval);
        this.carouselInterval = null;
      }
    }

    resumeAutoCarousel() {
      if (
        this.modal?.classList.contains("active") &&
        this.images?.length > 1 &&
        !this.carouselInterval
      ) {
        console.log("▶️ Resuming auto-play carousel");
        this.carouselInterval = setInterval(() => {
          this.nextCarouselImage();
        }, 3000);
      }
    }

    // Navigation functions
    prevCarouselImage() {
      if (!this.images || this.images.length === 0) return;

      this.currentImageIndex =
        (this.currentImageIndex - 1 + this.images.length) % this.images.length;
      this.updateCarouselImage();

      this.pauseAutoCarousel();
      setTimeout(() => this.resumeAutoCarousel(), 5000);
    }

    nextCarouselImage() {
      if (!this.images || this.images.length === 0) return;

      this.currentImageIndex =
        (this.currentImageIndex + 1) % this.images.length;
      this.updateCarouselImage();
    }

    goToCarouselImage(index) {
      if (
        !this.images ||
        this.images.length === 0 ||
        index < 0 ||
        index >= this.images.length
      )
        return;

      this.currentImageIndex = index;
      this.updateCarouselImage();

      this.pauseAutoCarousel();
      setTimeout(() => this.resumeAutoCarousel(), 5000);
    }

    updateCarouselImage() {
      const mainImage = document.getElementById("carouselMainImage");
      const currentIndexSpan = document.getElementById("carouselCurrentIndex");

      if (mainImage && this.images[this.currentImageIndex]) {
        mainImage.style.opacity = "0.5";
        setTimeout(() => {
          mainImage.src = this.images[this.currentImageIndex].url;
          mainImage.style.opacity = "1";
        }, 150);
      }

      if (currentIndexSpan) {
        currentIndexSpan.textContent = this.currentImageIndex + 1;
      }

      const thumbnails = document.querySelectorAll(
        ".carousel-thumbnails .flex-shrink-0",
      );
      thumbnails.forEach((thumb, idx) => {
        if (idx === this.currentImageIndex) {
          thumb.classList.add("border-teal-600", "opacity-100", "scale-105");
          thumb.classList.remove("border-transparent", "opacity-60");
        } else {
          thumb.classList.remove("border-teal-600", "opacity-100", "scale-105");
          thumb.classList.add("border-transparent", "opacity-60");
        }
      });
    }

    // ============================================
    // TERMS AND CONDITIONS FUNCTIONS
    // ============================================

    // Open Terms Modal
    openTermsModal() {
      // Remove existing modal if any
      const existingModal = document.getElementById("termsModal");
      if (existingModal) existingModal.remove();

      const modal = document.createElement("div");
      modal.id = "termsModal";
      modal.className =
        "fixed inset-0 bg-black/90 flex items-center justify-center z-[999999] p-4 overflow-y-auto";

      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.closeTermsModal();
      });

      modal.innerHTML = `
        <div class="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
          <!-- Header -->
          <div class="bg-gradient-to-r from-teal-700 to-orange-500 text-white p-6 sticky top-0 z-10 rounded-t-2xl">
            <div class="flex justify-between items-center">
              <h2 class="text-2xl font-bold flex items-center gap-2">
                <i class="fas fa-file-contract"></i>
                Terms and Conditions
              </h2>
              <button onclick="destinationsManager.closeTermsModal()" class="text-3xl hover:text-white/80 transition">&times;</button>
            </div>
          </div>
          
          <!-- Content -->
          <div class="p-8">
            <div class="space-y-6 text-gray-700">
              <div>
                <h3 class="text-lg font-bold text-teal-700 mb-3">1. Booking and Payment</h3>
                <p class="text-sm leading-relaxed">A 50% down payment is required to confirm your booking. The remaining balance must be settled at least 7 days before your travel date. Payments can be made via bank transfer, GCash, or credit card.</p>
              </div>
              
              <div>
                <h3 class="text-lg font-bold text-teal-700 mb-3">2. Cancellation Policy</h3>
                <ul class="list-disc pl-5 space-y-2 text-sm">
                  <li>Cancellations made 30 days or more before travel: Full refund minus processing fees</li>
                  <li>Cancellations made 15-29 days before travel: 50% refund</li>
                  <li>Cancellations made less than 15 days before travel: No refund</li>
                  <li>No-shows: No refund</li>
                </ul>
              </div>
              
              <div>
                <h3 class="text-lg font-bold text-teal-700 mb-3">3. Travel Insurance</h3>
                <p class="text-sm leading-relaxed">Travel insurance is highly recommended but not included in the package price. We are not responsible for any unforeseen circumstances including but not limited to flight cancellations, natural disasters, personal accidents, or lost belongings.</p>
              </div>
              
              <div>
                <h3 class="text-lg font-bold text-teal-700 mb-3">4. Itinerary Changes</h3>
                <p class="text-sm leading-relaxed">We reserve the right to modify itineraries due to weather conditions, local events, or situations beyond our control. We will always strive to provide the best alternative arrangements.</p>
              </div>
              
              <div>
                <h3 class="text-lg font-bold text-teal-700 mb-3">5. Passenger Responsibility</h3>
                <p class="text-sm leading-relaxed">All passengers are responsible for having valid travel documents (passport, visas, etc.) and arriving at meeting points on time. We are not liable for missed tours due to passenger delays.</p>
              </div>
              
              <div>
                <h3 class="text-lg font-bold text-teal-700 mb-3">6. Privacy Policy</h3>
                <p class="text-sm leading-relaxed">Your personal information will only be used for booking purposes and will not be shared with third parties without your consent.</p>
              </div>
            </div>
            
            <div class="border-t border-gray-200 mt-8 pt-6 flex justify-end">
              <button onclick="destinationsManager.closeTermsModal()" 
                      class="px-6 py-2 bg-gradient-to-r from-teal-700 to-orange-500 text-white rounded-lg font-semibold hover:opacity-90 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
    }

    // Close Terms Modal
    closeTermsModal() {
      const modal = document.getElementById("termsModal");
      if (modal) modal.remove();
    }

    // Validate Terms
    validateTerms() {
      const termsCheckbox = document.getElementById("terms");
      const termsError = document.getElementById("termsError");

      if (!termsCheckbox || !termsCheckbox.checked) {
        if (termsError) {
          termsError.classList.remove("hidden");
          termsCheckbox.classList.add(
            "border-red-500",
            "ring-1",
            "ring-red-500",
          );

          // Scroll to terms section
          termsCheckbox.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return false;
      }

      // Clear error if checked
      if (termsError) {
        termsError.classList.add("hidden");
        termsCheckbox.classList.remove(
          "border-red-500",
          "ring-1",
          "ring-red-500",
        );
      }
      return true;
    }

    // ============================================
    // FORMAT INCLUSIONS - WITH ARRAY INDEXING
    // ============================================
    formatInclusions(inclusions) {
      if (!inclusions || inclusions.length === 0) {
        return '<p class="text-gray-500 italic">No inclusions specified</p>';
      }

      // Ensure we're working with an array
      const items = Array.isArray(inclusions) ? inclusions : [inclusions];

      return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      ${items
        .map(
          (item, index) => `
        <div class="flex items-start gap-2 bg-green-50 p-3 rounded-lg border border-green-200 hover:bg-green-100 transition-colors group">
          <div class="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-1">
            ${index + 1}
          </div>
          <i class="fas fa-check-circle text-green-500 mt-1 flex-shrink-0"></i>
          <div class="flex-1">
            <span class="text-sm text-gray-700">${item}</span>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
    }

    // ============================================
    // FORMAT EXCLUSIONS - WITH ARRAY INDEXING
    // ============================================
    formatExclusions(exclusions) {
      if (!exclusions || exclusions.length === 0) {
        return '<p class="text-gray-500 italic">No exclusions specified</p>';
      }

      // Ensure we're working with an array
      const items = Array.isArray(exclusions) ? exclusions : [exclusions];

      return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      ${items
        .map(
          (item, index) => `
        <div class="flex items-start gap-2 bg-red-50 p-3 rounded-lg border border-red-200 hover:bg-red-100 transition-colors group">
          <div class="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-1">
            ${index + 1}
          </div>
          <i class="fas fa-times-circle text-red-500 mt-1 flex-shrink-0"></i>
          <div class="flex-1">
            <span class="text-sm text-gray-700">${item}</span>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
    }
    // ============================================
    // FORMAT EXCLUSIONS - WITH ARRAY INDEXING
    // ============================================
    formatExclusions(exclusions) {
      if (!exclusions || exclusions.length === 0) {
        return '<p class="text-gray-500 italic">No exclusions specified</p>';
      }

      // Ensure we're working with an array
      const items = Array.isArray(exclusions) ? exclusions : [exclusions];

      return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      ${items
        .map(
          (item, index) => `
        <div class="flex items-start gap-2 bg-red-50 p-3 rounded-lg border border-red-200 hover:bg-red-100 transition-colors group">
          <i class="fas fa-times-circle text-red-500 mt-1 flex-shrink-0"></i>
          <div class="flex-1">
            <span class="text-sm text-gray-700">${item}</span>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
    }
    // ============================================
    // FORMAT TOUR ITINERARY - WITH ARRAY INDEXING
    // ============================================
    formatTourItinerary(itinerary) {
      if (!itinerary || itinerary.length === 0) {
        return '<p class="text-gray-500 italic">No itinerary available</p>';
      }

      // Ensure we're working with an array
      const items = Array.isArray(itinerary) ? itinerary : [itinerary];

      return `
    <div class="space-y-4">
      ${items
        .map((item, index) => {
          // Check if item has time format (e.g., "07:00 AM - Breakfast")
          const timeMatch = item.match(
            /^(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[-–]\s*(.*)/i,
          );

          if (timeMatch) {
            const time = timeMatch[1];
            const activity = timeMatch[2];
            return `
            <div class="flex items-start gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:bg-orange-50 transition-colors">
              <div class="flex-shrink-0 w-20 text-sm font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full text-center border border-orange-200">
                ${time}
              </div>
              <div class="flex-1">
                <p class="text-sm text-gray-700">${activity}</p>
              </div>
            </div>
          `;
          } else {
            // Regular itinerary item without time - show index number
            return `
            <div class="flex items-start gap-3 bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:bg-orange-50 transition-colors group">
              <div class="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
                ${index + 1}
              </div>
              <div class="flex-1">
                <p class="text-sm text-gray-700 leading-relaxed">${item}</p>
              </div>
            </div>
          `;
          }
        })
        .join("")}
    </div>
  `;
    }
    // ============================================
    // FORMAT PACKAGE ITINERARY - FIXED WITH PROPER SORTING
    // ============================================
    formatPackageItinerary(itineraries) {
      if (!itineraries || itineraries.length === 0) {
        return '<p class="text-gray-500 italic">No itinerary available</p>';
      }

      // SIGURADUHING SORTED BY DAY NUMBER
      const sortedItineraries = [...itineraries].sort((a, b) => {
        const dayA = a.day_number || 0;
        const dayB = b.day_number || 0;
        return dayA - dayB;
      });

      console.log("📅 Original itineraries:", itineraries);
      console.log("📅 Sorted itineraries:", sortedItineraries);

      return `
    <div class="relative">
      <!-- Vertical timeline line -->
      <div class="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-500 to-teal-600"></div>
      
      <div class="space-y-8">
        ${sortedItineraries
          .map((iti, index) => {
            const dayNumber = iti.day_number || index + 1;
            const title = iti.day_title || `Day ${dayNumber}`;

            // Log para makita kung ano ang actual na day_number
            console.log(`📍 Day ${dayNumber}:`, iti);

            // Ensure day_description is an array
            let description = [];
            if (iti.day_description) {
              if (Array.isArray(iti.day_description)) {
                description = iti.day_description;
              } else if (typeof iti.day_description === "string") {
                // Try to parse if it's a JSON string
                try {
                  const parsed = JSON.parse(iti.day_description);
                  description = Array.isArray(parsed)
                    ? parsed
                    : [iti.day_description];
                } catch (e) {
                  // Split by newlines if present
                  if (iti.day_description.includes("\n")) {
                    description = iti.day_description
                      .split("\n")
                      .filter((line) => line.trim() !== "");
                  } else {
                    description = [iti.day_description];
                  }
                }
              } else {
                description = [String(iti.day_description)];
              }
            }

            return `
            <div class="relative pl-16">
              <!-- Day number circle -->
              <div class="absolute left-0 top-0 w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg border-4 border-white">
                ${dayNumber}
              </div>
              
              <div class="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                <h5 class="text-xl font-bold text-teal-700 mb-4 flex items-center gap-2">
                  <i class="fas fa-sun text-orange-500"></i>
                  ${title}
                </h5>
                
                ${
                  description.length > 0
                    ? `
                  <div class="space-y-3">
                    ${description
                      .map(
                        (desc, descIndex) => `
                      <div class="flex items-start gap-3 bg-gray-50 p-4 rounded-lg hover:bg-orange-50 transition-colors group">
                        <!-- Index number badge -->
                        <div class="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
                          ${descIndex + 1}
                        </div>
                        <!-- Description text with proper formatting -->
                        <div class="flex-1">
                          <p class="text-sm text-gray-700 leading-relaxed">
                            ${String(desc).replace(/➢/g, '<span class="text-orange-500 font-bold mr-2">➢</span>')}
                          </p>
                        </div>
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
                  <div class="mt-4 flex items-center gap-3 text-sm bg-green-50 p-3 rounded-lg border border-green-200">
                    <i class="fas fa-utensils text-green-600"></i>
                    <span class="text-green-700 font-medium">${iti.meals_included}</span>
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
    formatTransportation(transportation) {
      if (!transportation || transportation.length === 0) return "";

      return `
        <div class="space-y-3">
          ${transportation
            .map((item) => {
              const mode = item.transportation_mode || {};
              const icon = this.getTransportIcon(mode.name);

              return `
              <div class="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <div class="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  <i class="fas ${icon} text-lg"></i>
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-1">
                    <h6 class="font-semibold text-gray-800">${mode.name || "Transportation"}</h6>
                    <span class="px-3 py-1 text-xs rounded-full ${item.is_included ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}">
                      ${item.is_included ? "✓ Included" : "✗ Optional"}
                    </span>
                  </div>
                  ${
                    item.description
                      ? `<p class="text-sm text-gray-600">${item.description}</p>`
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
    // SHOW TOUR DETAILS
    // ============================================
    showTourDetails(tour, rates) {
      console.log("🎯 Showing tour details:", tour);
      console.log("💰 Tour rates:", rates);

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
          rateItems.push({ label: field.label, value: rates[field.key] });
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
          : '<p class="text-gray-500 italic">No rates available for this tour</p>';

      modal.innerHTML = `
        <div class="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden">
          <div class="bg-gradient-to-r from-orange-500 to-teal-700 p-6 text-white">
            <div class="flex justify-between items-start">
              <div>
                <h2 class="text-3xl font-bold mb-2">${tour.tour_name || "Tour Details"}</h2>
                <div class="flex items-center gap-4 text-sm">
                  ${
                    tour.duration_hours
                      ? `<span class="flex items-center gap-1"><i class="far fa-clock"></i> ${tour.duration_hours} hours</span>`
                      : ""
                  }
                </div>
              </div>
              <button onclick="destinationsManager.closeTourDetailsModal()" class="text-3xl hover:text-white/80 transition">&times;</button>
            </div>
          </div>
          
          <div class="p-8 max-h-[80vh] overflow-y-auto">
            ${
              tour.image_url
                ? `<div class="mb-8 rounded-xl overflow-hidden shadow-lg"><img src="${tour.image_url}" alt="${tour.tour_name}" class="w-full h-96 object-cover"></div>`
                : ""
            }
            
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
            
            <button onclick="destinationsManager.closeTourDetailsModal()" 
                    class="w-full py-4 bg-gradient-to-r from-orange-500 to-teal-700 text-white rounded-xl font-bold text-lg hover:opacity-90 transition">
              CLOSE
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
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

    closeTourDetailsModal() {
      const modal = document.getElementById("tourDetailsModal");
      if (modal) modal.remove();
    }

    closeBookingModal() {
      const modal = document.getElementById("bookingModal");
      if (modal) modal.remove();
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

    // ============================================
    // FILTER FUNCTIONS
    // ============================================
    renderFilterButtons() {
      const filterContainer = document.getElementById("filterButtons");
      if (!filterContainer) return;

      filterContainer.innerHTML = "";

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

    renderDestinations(destinations) {
      if (!this.grid) return;

      this.grid.innerHTML = "";

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
    // REAL-TIME SUBSCRIPTIONS
    // ============================================
    setupRealtimeSubscriptions() {
      console.log("🔄 Setting up real-time subscriptions...");

      if (this.realtimeSubscription) {
        window.sns_supabase_client.removeChannel(this.realtimeSubscription);
      }

      this.realtimeSubscription = window.sns_supabase_client
        .channel("destinations-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "destinations" },
          (payload) => {
            console.log("🔄 Destination changed:", payload);
            this.refreshDestinations();
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "destination_packages" },
          (payload) => {
            console.log("🔄 Package changed:", payload);
            this.refreshDestinations();
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "optional_tours" },
          (payload) => {
            console.log("🔄 Optional tour changed:", payload);
            this.refreshDestinations();
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "optional_tour_rates" },
          (payload) => {
            console.log("💰 Optional tour rate changed:", payload);
            this.refreshDestinations();
          },
        )
        .subscribe((status) => {
          console.log("📡 Subscription status:", status);
        });
    }

    // ============================================
    // REFRESH DESTINATIONS
    // ============================================
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
                optional_tour_id,
                optional_tours (
                  id,
                  tour_name,
                  duration_hours,
                  itinerary,
                  inclusions,
                  exclusions,
                  image_url,
                  is_active
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

        this.destinations = [];

        for (const dest of destinations || []) {
          const processedDest = { ...dest };

          if (processedDest.destination_packages) {
            for (const pkg of processedDest.destination_packages) {
              if (pkg.package_optional_tours) {
                for (const item of pkg.package_optional_tours) {
                  if (item.optional_tours) {
                    const tourId = item.optional_tour_id;

                    const { data: rates, error: ratesError } =
                      await window.sns_supabase_client
                        .from("optional_tour_rates")
                        .select("*")
                        .eq("tour_id", tourId);

                    if (ratesError) {
                      console.error(
                        `❌ Error fetching rates for tour ${tourId}:`,
                        ratesError,
                      );
                    }

                    item.optional_tours.optional_tour_rates = rates || [];
                  }
                }
              }
            }
          }

          this.destinations.push(processedDest);
        }

        this.filteredDestinations = [...this.destinations];

        console.log(`✅ Destinations refreshed: ${this.destinations.length}`);

        this.renderFilterButtons();
        this.renderDestinations(this.filteredDestinations);

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

    // ============================================
    // LOADING/ERROR UTILITIES
    // ============================================
    showLoading() {
      if (this.spinner) this.spinner.style.display = "block";
      if (this.grid) this.grid.style.display = "none";
      if (this.errorMsg) this.errorMsg.style.display = "none";
    }

    hideLoading() {
      if (this.spinner) this.spinner.style.display = "none";
      if (this.grid) this.grid.style.display = "grid";
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
    const hasDestinationsGrid = document.getElementById("destinationsGrid");

    if (hasDestinationsGrid) {
      document.addEventListener("DOMContentLoaded", function () {
        if (!window.destinationsManager) {
          window.destinationsManager = new DestinationsManager();
          setTimeout(() => {
            window.destinationsManager.loadDestinations();
          }, 500);
        }
      });
    } else {
      console.log("⏭️ Not on destinations page, skipping initialization");
    }
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

console.log(
  "✅ Tours.js loaded - COMPLETE FIXED VERSION WITH UPDATED BOOKING FLOW AND IMPROVED OPTIONAL TOURS!",
);
