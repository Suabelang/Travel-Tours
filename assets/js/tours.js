// ============================================
// TOURS.JS - COMPLETE WITH PAX TYPE RADIO BUTTONS & ITINERARIES
// FULLY MATCHING YOUR ACTUAL DATABASE SCHEMA
// ============================================

console.log("✅ tours.js loading...");

// Wait for DOM and Supabase client
(async function initDestinations() {
  if (document.readyState === "loading") {
    await new Promise((resolve) =>
      document.addEventListener("DOMContentLoaded", resolve),
    );
  }

  let retries = 0;
  while (!window.sns_supabase_client && retries < 50) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    retries++;
  }

  if (!window.sns_supabase_client) {
    console.error("❌ Supabase client not found");
    const grid = document.getElementById("destinationsGrid");
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-12">
          <div class="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <i class="fas fa-exclamation-triangle text-3xl text-red-500"></i>
          </div>
          <h3 class="text-xl font-bold text-gray-700 mb-2">Connection Error</h3>
          <p class="text-gray-500">Unable to connect to server. Please refresh the page.</p>
          <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg">Refresh Page</button>
        </div>
      `;
    }
    return;
  }

  console.log("✅ Supabase client found, initializing...");

  if (!window.destinationsManager) {
    window.destinationsManager = new DestinationsManager();
    await window.destinationsManager.loadDestinations();
    window.destinationsManager.startAutoRefresh();
    window.destinationsManager.setupRealtimeSubscriptions();
  }
})();

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
    this.currentPackageData = null;
    this.currentImageIndex = 0;
    this.carouselInterval = null;
    this.currentDestination = null;
    this.currentFilter = "all";
    this.hotelCategories = [];
    this.isLoading = false;
    this.autoRefreshInterval = null;
    this.realtimeSubscription = null;
    this.dataCache = new Map();
    this.lastFetchTime = null;
    this.optionalTourCategories = [];
    this.optionalTourRates = [];
    this.packageOptionalTours = [];

    if (this.grid) {
      this.grid.innerHTML =
        '<div class="text-center py-12">Loading destinations...</div>';
    }
  }

  // ============================================
  // FETCH ALL DATA IN PARALLEL
  // ============================================
  async fetchAllData() {
    if (
      this.dataCache.has("allData") &&
      this.lastFetchTime &&
      Date.now() - this.lastFetchTime < 300000
    ) {
      console.log("📦 Using cached data");
      return this.dataCache.get("allData");
    }

    console.log("🔄 Fetching all travel data from Supabase...");

    const [
      destinationsPromise,
      imagesPromise,
      packagesPromise,
      hotelRatesPromise,
      inclusionsPromise,
      exclusionsPromise,
      itinerariesPromise,
      hotelCategoriesPromise,
      hotelsPromise,
      optionalTourCategoriesPromise,
      optionalTourRatesPromise,
      packageOptionalToursPromise,
    ] = [
      window.sns_supabase_client
        .from("destinations")
        .select("*")
        .eq("is_active", true)
        .order("name"),
      window.sns_supabase_client.from("destination_images").select("*"),
      window.sns_supabase_client
        .from("destination_packages")
        .select("*")
        .eq("is_active", true),
      window.sns_supabase_client.from("package_hotel_rates").select("*"),
      window.sns_supabase_client.from("package_inclusions").select("*"),
      window.sns_supabase_client.from("package_exclusions").select("*"),
      window.sns_supabase_client.from("package_itineraries").select("*"),
      window.sns_supabase_client.from("hotel_categories").select("*"),
      window.sns_supabase_client.from("hotels").select("*"),
      window.sns_supabase_client
        .from("optional_tour_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order"),
      window.sns_supabase_client.from("optional_tour_rates").select("*"),
      window.sns_supabase_client.from("package_optional_tours").select("*"),
    ];

    const results = await Promise.allSettled([
      destinationsPromise,
      imagesPromise,
      packagesPromise,
      hotelRatesPromise,
      inclusionsPromise,
      exclusionsPromise,
      itinerariesPromise,
      hotelCategoriesPromise,
      hotelsPromise,
      optionalTourCategoriesPromise,
      optionalTourRatesPromise,
      packageOptionalToursPromise,
    ]);

    const [
      destResult,
      imgResult,
      pkgResult,
      ratesResult,
      incResult,
      excResult,
      itiResult,
      catResult,
      hotelResult,
      optCatResult,
      optRateResult,
      pkgOptResult,
    ] = results;

    const destinationsData =
      destResult.status === "fulfilled" ? destResult.value.data : [];
    const imagesData =
      imgResult.status === "fulfilled" ? imgResult.value.data : [];
    const packagesData =
      pkgResult.status === "fulfilled" ? pkgResult.value.data : [];
    const hotelRatesData =
      ratesResult.status === "fulfilled" ? ratesResult.value.data : [];
    const inclusionsData =
      incResult.status === "fulfilled" ? incResult.value.data : [];
    const exclusionsData =
      excResult.status === "fulfilled" ? excResult.value.data : [];
    const itinerariesData =
      itiResult.status === "fulfilled" ? itiResult.value.data : [];
    const hotelCategoriesData =
      catResult.status === "fulfilled" ? catResult.value.data : [];
    const hotelsData =
      hotelResult.status === "fulfilled" ? hotelResult.value.data : [];
    const optionalTourCategoriesData =
      optCatResult.status === "fulfilled" ? optCatResult.value.data : [];
    const optionalTourRatesData =
      optRateResult.status === "fulfilled" ? optRateResult.value.data : [];
    const packageOptionalToursData =
      pkgOptResult.status === "fulfilled" ? pkgOptResult.value.data : [];

    // Create maps for faster lookups
    const imagesMap = new Map();
    imagesData.forEach((img) => {
      if (!imagesMap.has(img.destination_id))
        imagesMap.set(img.destination_id, []);
      imagesMap.get(img.destination_id).push(img);
    });

    const packagesMap = new Map();
    packagesData.forEach((pkg) => {
      if (!packagesMap.has(pkg.destination_id))
        packagesMap.set(pkg.destination_id, []);
      packagesMap.get(pkg.destination_id).push(pkg);
    });

    const hotelRatesMap = new Map();
    hotelRatesData.forEach((rate) => {
      if (!hotelRatesMap.has(rate.package_id))
        hotelRatesMap.set(rate.package_id, []);
      hotelRatesMap.get(rate.package_id).push(rate);
    });

    const inclusionsMap = new Map();
    inclusionsData.forEach((inc) => {
      if (!inclusionsMap.has(inc.package_id))
        inclusionsMap.set(inc.package_id, []);
      inclusionsMap.get(inc.package_id).push(inc);
    });

    const exclusionsMap = new Map();
    exclusionsData.forEach((exc) => {
      if (!exclusionsMap.has(exc.package_id))
        exclusionsMap.set(exc.package_id, []);
      exclusionsMap.get(exc.package_id).push(exc);
    });

    const itinerariesMap = new Map();
    itinerariesData.forEach((iti) => {
      if (!itinerariesMap.has(iti.package_id))
        itinerariesMap.set(iti.package_id, []);
      itinerariesMap.get(iti.package_id).push(iti);
    });

    const hotelCategoriesMap = new Map();
    hotelCategoriesData.forEach((cat) => {
      if (!hotelCategoriesMap.has(cat.destination_id))
        hotelCategoriesMap.set(cat.destination_id, []);
      hotelCategoriesMap.get(cat.destination_id).push(cat);
    });

    const hotelsByCategoryMap = new Map();
    hotelsData.forEach((hotel) => {
      if (!hotelsByCategoryMap.has(hotel.category_id))
        hotelsByCategoryMap.set(hotel.category_id, []);
      hotelsByCategoryMap.get(hotel.category_id).push(hotel);
    });

    const optionalTourRatesMap = new Map();
    optionalTourRatesData.forEach((rate) => {
      optionalTourRatesMap.set(rate.tour_id, rate);
    });

    const packageOptionalToursMap = new Map();
    packageOptionalToursData.forEach((item) => {
      if (!packageOptionalToursMap.has(item.package_id))
        packageOptionalToursMap.set(item.package_id, []);
      packageOptionalToursMap.get(item.package_id).push(item.optional_tour_id);
    });

    this.optionalTourCategories = optionalTourCategoriesData;
    this.optionalTourRates = optionalTourRatesData;
    this.packageOptionalTours = packageOptionalToursData;

    const destinations = destinationsData.map((dest) => {
      dest.destination_images = imagesMap.get(dest.id) || [];
      dest.destination_packages = (packagesMap.get(dest.id) || []).map(
        (pkg) => {
          pkg.package_hotel_rates = hotelRatesMap.get(pkg.id) || [];
          pkg.package_inclusions = inclusionsMap.get(pkg.id) || [];
          pkg.package_exclusions = exclusionsMap.get(pkg.id) || [];
          pkg.package_itineraries = itinerariesMap.get(pkg.id) || [];
          const tourIds = packageOptionalToursMap.get(pkg.id) || [];
          pkg.optional_tours = optionalTourCategoriesData
            .filter((tour) => tourIds.includes(tour.id))
            .map((tour) => ({
              ...tour,
              rates: optionalTourRatesMap.get(tour.id),
            }));
          return pkg;
        },
      );
      dest.hotel_categories = (hotelCategoriesMap.get(dest.id) || []).map(
        (cat) => ({
          ...cat,
          hotels: hotelsByCategoryMap.get(cat.id) || [],
        }),
      );
      return dest;
    });

    const allData = {
      destinations,
      optionalTourCategories: optionalTourCategoriesData,
      optionalTourRates: optionalTourRatesData,
      packageOptionalTours: packageOptionalToursData,
      timestamp: Date.now(),
    };

    this.dataCache.set("allData", allData);
    this.lastFetchTime = Date.now();

    return allData;
  }

  // ============================================
  // LOAD DESTINATIONS
  // ============================================
  async loadDestinations(silent = false) {
    if (this.isLoading) {
      console.log("⚠️ Already loading destinations, skipping...");
      return;
    }

    try {
      this.isLoading = true;
      if (!silent) this.showLoading();

      const allData = await this.fetchAllData();

      this.destinations = allData.destinations;
      this.filteredDestinations = [...this.destinations];

      if (!silent) {
        console.log(
          `✅ FINAL: ${this.destinations.length} destinations loaded`,
        );
      }

      this.renderFilterButtons();
      this.renderDestinations(this.filteredDestinations);
      if (!silent) this.hideLoading();
    } catch (error) {
      console.error("❌ Error loading destinations:", error);
      this.destinations = [];
      this.filteredDestinations = [];
      if (this.renderFilterButtons) this.renderFilterButtons();
      if (this.renderDestinations) this.renderDestinations([]);
      if (!silent) this.hideLoading();
      if (!silent) this.showError(error.message);
    } finally {
      this.isLoading = false;
    }
  }

  // ============================================
  // RENDER FILTER BUTTONS
  // ============================================
  renderFilterButtons() {
    const filterContainer = document.getElementById("filterButtons");
    if (!filterContainer) return;

    const localCount = this.destinations.filter(
      (d) => d.country === "Philippines",
    ).length;
    const intlCount = this.destinations.filter(
      (d) => d.country !== "Philippines",
    ).length;

    filterContainer.innerHTML = `
      <div class="flex flex-wrap gap-3 mb-6 justify-center">
        <button class="filter-btn px-5 py-2.5 rounded-full text-sm transition-all ${this.currentFilter === "all" ? "bg-gradient-to-r from-[#076653] to-[#0a8a6e] text-white shadow-md" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"}" data-filter="all">
          <i class="fas fa-globe-asia mr-1"></i> All (${this.destinations.length})
        </button>
        <button class="filter-btn px-5 py-2.5 rounded-full text-sm transition-all ${this.currentFilter === "local" ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"}" data-filter="local">
          <i class="fas fa-map-pin mr-1"></i> Local (${localCount})
        </button>
        <button class="filter-btn px-5 py-2.5 rounded-full text-sm transition-all ${this.currentFilter === "international" ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"}" data-filter="international">
          <i class="fas fa-plane mr-1"></i> International (${intlCount})
        </button>
      </div>
      <div class="text-center mt-2">
        <button onclick="window.destinationsManager.forceRefresh()" class="text-xs text-gray-400 hover:text-teal-600 transition">
          <i class="fas fa-sync-alt mr-1"></i> Refresh Data
        </button>
      </div>
    `;

    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.applyFilter(btn.dataset.filter),
      );
    });
  }

  applyFilter(filter) {
    this.currentFilter = filter;
    if (filter === "all") {
      this.filteredDestinations = [...this.destinations];
    } else if (filter === "local") {
      this.filteredDestinations = this.destinations.filter(
        (d) => d.country === "Philippines",
      );
    } else if (filter === "international") {
      this.filteredDestinations = this.destinations.filter(
        (d) => d.country !== "Philippines",
      );
    }
    this.renderFilterButtons();
    this.renderDestinations(this.filteredDestinations);
  }

  // ============================================
  // RENDER DESTINATIONS GRID
  // ============================================
  renderDestinations(destinations) {
    const grid = document.getElementById("destinationsGrid");
    if (!grid) return;

    if (!destinations || destinations.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-12">
          <div class="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
            <i class="fas fa-map-pin text-3xl text-gray-400"></i>
          </div>
          <h3 class="text-xl font-bold text-gray-700 mb-2">No destinations found</h3>
          <p class="text-gray-500">Please check back later</p>
        </div>
      `;
      return;
    }

    let html = "";
    destinations.forEach((dest) => {
      const imageUrl = dest.destination_images?.[0]?.url || "";
      const badgeClass =
        dest.country === "Philippines" ? "bg-green-600" : "bg-blue-600";
      const badgeIcon = dest.country === "Philippines" ? "🇵🇭" : "🌍";
      const hasPackages =
        dest.destination_packages && dest.destination_packages.length > 0;
      const description = dest.description || "No description available";

      html += `
        <div class="destination-card group cursor-pointer bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden" 
             onclick="window.destinationsManager.showDestinationModal(${dest.id})">
          <div class="relative h-56 overflow-hidden">
            ${imageUrl ? `<img src="${imageUrl}" alt="${this.escapeHtml(dest.name)}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">` : `<div class="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center"><i class="fas fa-image text-gray-400 text-5xl"></i></div>`}
            <div class="absolute top-3 right-3">
              <span class="px-3 py-1 rounded-full text-xs font-semibold shadow-lg ${badgeClass} text-white">
                ${badgeIcon} ${dest.country === "Philippines" ? "Local" : "International"}
              </span>
            </div>
            ${!hasPackages ? `<div class="absolute inset-0 bg-black/50 flex items-center justify-center"><span class="bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold">Coming Soon</span></div>` : ""}
          </div>
          <div class="p-5">
            <h3 class="text-xl font-bold text-gray-800 mb-1 group-hover:text-teal-700 transition">${this.escapeHtml(dest.name)}</h3>
            <p class="text-gray-500 text-sm flex items-center gap-1"><i class="fas fa-map-marker-alt text-teal-500 text-xs"></i> ${this.escapeHtml(dest.country || "Philippines")}</p>
            <p class="text-gray-600 text-sm mt-2 line-clamp-2">${this.escapeHtml(description.substring(0, 100))}${description.length > 100 ? "..." : ""}</p>
            <div class="mt-4 flex justify-between items-center">
              <span class="text-teal-700 font-semibold text-sm">${hasPackages ? `${dest.destination_packages.length} Package${dest.destination_packages.length > 1 ? "s" : ""}` : "Coming Soon"}</span>
              <span class="text-gray-400 text-xs"><i class="fas fa-arrow-right group-hover:translate-x-1 transition"></i></span>
            </div>
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;
  }

  // ============================================
  // SHOW DESTINATION MODAL
  // ============================================
  async showDestinationModal(destinationId) {
    const destination = this.destinations.find((d) => d.id === destinationId);
    if (!destination) return;

    this.stopAutoCarousel();

    if (this.modal) {
      this.modal.classList.add("active");
      document.body.style.overflow = "hidden";
    }

    this.currentDestination = destination;
    this.images = destination.destination_images || [];
    this.currentImageIndex = 0;
    this.hotelCategories = destination.hotel_categories || [];
    const packages = destination.destination_packages || [];

    if (!packages.length) {
      this.renderDestinationOnly(destination);
      return;
    }

    this.renderCompleteModal(destination, packages);
    this.startAutoCarousel();
  }

  // ============================================
  // RENDER COMPLETE MODAL - WITH ITINERARIES
  // ============================================
  renderCompleteModal(destination, packages) {
    if (!this.detailContent) return;

    const primaryImage = destination.destination_images?.[0]?.url || "";
    const hasGallery = this.images && this.images.length > 0;

    const galleryHtml = hasGallery
      ? `
      <div class="bg-white p-5 rounded-xl border border-gray-200 mb-6">
        <h3 class="text-xl font-bold mb-4 flex items-center gap-2"><i class="fas fa-images text-teal-600"></i> Photo Gallery</h3>
        <div class="relative rounded-xl overflow-hidden" style="height: 450px;" onmouseenter="window.destinationsManager.pauseAutoCarousel()" onmouseleave="window.destinationsManager.resumeAutoCarousel()">
          <img id="carouselMainImage" src="${this.images[0]?.url}" class="w-full h-full object-cover">
          ${
            this.images.length > 1
              ? `
            <button class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-lg" onclick="window.destinationsManager.prevCarouselImage()"><i class="fas fa-chevron-left"></i></button>
            <button class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-lg" onclick="window.destinationsManager.nextCarouselImage()"><i class="fas fa-chevron-right"></i></button>
            <div class="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm"><span id="carouselCurrentIndex">1</span>/${this.images.length}</div>
          `
              : ""
          }
        </div>
        ${
          this.images.length > 1
            ? `
          <div class="flex gap-2 mt-4 overflow-x-auto pb-2">
            ${this.images
              .map(
                (img, i) => `
              <div class="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 ${i === 0 ? "border-teal-600" : "border-transparent"} hover:opacity-100 transition" onclick="window.destinationsManager.goToCarouselImage(${i})">
                <img src="${img.url}" class="w-full h-full object-cover">
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
      : "";

    const packageTabs =
      packages.length > 1
        ? `
      <div class="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
        ${packages
          .map(
            (p, i) => `
          <button class="package-tab px-4 py-2 rounded-lg font-medium text-sm transition-all ${i === 0 ? "bg-teal-700 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}" onclick="window.destinationsManager.showPackage(${i})">
            ${this.escapeHtml(p.package_name)}
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
        <div class="bg-white p-5 rounded-xl border border-gray-200 mb-6">
          <div class="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <h3 class="text-2xl font-bold text-teal-700">${this.escapeHtml(pkg.package_name)}</h3>
              <p class="text-sm text-gray-500 mt-1">${this.escapeHtml(pkg.package_code || "")} • ${this.escapeHtml(pkg.tour_category || "Standard")}</p>
              ${pkg.has_extra_night ? '<span class="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"><i class="fas fa-moon mr-1"></i> Extra Night Available</span>' : ""}
            </div>
            <button class="book-now-btn px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:shadow-lg transition" data-package-name="${this.escapeHtml(pkg.package_name)}" data-package-id="${pkg.id}">
              <i class="fas fa-calendar-check mr-2"></i> BOOK NOW
            </button>
          </div>
        </div>
        
        ${this.renderHotelsSection(pkg)}
        ${this.renderOptionalToursSection(pkg)}
        
        <div class="grid md:grid-cols-2 gap-6 mb-6">
          ${
            pkg.package_inclusions && pkg.package_inclusions.length
              ? `
            <div class="bg-green-50 p-5 rounded-xl border border-green-200">
              <h4 class="font-bold text-green-800 mb-3 flex items-center gap-2"><i class="fas fa-check-circle"></i> Inclusions</h4>
              <ul class="space-y-2">
                ${pkg.package_inclusions.map((inc) => `<li class="flex items-start gap-2"><i class="fas fa-circle text-[8px] mt-1.5 text-green-600"></i><span class="text-sm">${this.escapeHtml(inc.inclusion_text)}</span></li>`).join("")}
              </ul>
            </div>
          `
              : '<div class="bg-gray-50 p-5 rounded-xl text-center"><p class="text-gray-500">No inclusions listed</p></div>'
          }
          
          ${
            pkg.package_exclusions && pkg.package_exclusions.length
              ? `
            <div class="bg-red-50 p-5 rounded-xl border border-red-200">
              <h4 class="font-bold text-red-800 mb-3 flex items-center gap-2"><i class="fas fa-times-circle"></i> Exclusions</h4>
              <ul class="space-y-2">
                ${pkg.package_exclusions.map((exc) => `<li class="flex items-start gap-2"><i class="fas fa-circle text-[8px] mt-1.5 text-red-500"></i><span class="text-sm">${this.escapeHtml(exc.exclusion_text)}</span></li>`).join("")}
              </ul>
            </div>
          `
              : '<div class="bg-gray-50 p-5 rounded-xl text-center"><p class="text-gray-500">No exclusions listed</p></div>'
          }
        </div>
        
        ${
          pkg.package_itineraries && pkg.package_itineraries.length
            ? `
          <div class="bg-white p-5 rounded-xl border border-gray-200">
            <h4 class="text-lg font-bold mb-4 flex items-center gap-2"><i class="fas fa-map-signs"></i> Itinerary</h4>
            <div class="space-y-4">
              ${[...pkg.package_itineraries]
                .sort((a, b) => (a.day_number || 0) - (b.day_number || 0))
                .map((iti) => {
                  let desc = [];
                  if (iti.day_description) {
                    if (Array.isArray(iti.day_description))
                      desc = iti.day_description;
                    else if (typeof iti.day_description === "string") {
                      try {
                        desc = JSON.parse(iti.day_description);
                      } catch (e) {
                        desc = [iti.day_description];
                      }
                    }
                  }
                  return `
                  <div class="border-l-4 border-orange-500 pl-4 py-2">
                    <h5 class="font-bold text-teal-700">Day ${iti.day_number}: ${this.escapeHtml(iti.day_title || `Day ${iti.day_number}`)}</h5>
                    ${
                      desc.length
                        ? `
                      <ul class="mt-2 space-y-1">
                        ${desc.map((d) => `<li class="text-sm text-gray-600 flex gap-2"><span class="text-orange-500">•</span> ${this.escapeHtml(d)}</li>`).join("")}
                      </ul>
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
            : '<div class="bg-gray-50 p-5 rounded-xl text-center"><p class="text-gray-500">No itinerary available</p></div>'
        }
      </div>
    `,
      )
      .join("");

    this.detailContent.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 py-8 relative">
        <button onclick="window.destinationsManager.closeModal()" class="exit-btn fixed top-4 right-4 z-50 w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center group">
          <i class="fas fa-sign-out-alt text-xl group-hover:rotate-180 transition-transform duration-300"></i>
          <span class="absolute -top-8 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Exit</span>
        </button>
        
        <div class="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl border border-indigo-100 mb-6">
          <div class="flex flex-col md:flex-row gap-6">
            ${primaryImage ? `<div class="md:w-1/3"><img src="${primaryImage}" class="w-full h-48 object-cover rounded-lg shadow"></div>` : ""}
            <div class="${primaryImage ? "md:w-2/3" : "w-full"}">
              <h1 class="text-3xl font-bold text-teal-700 mb-2">${this.escapeHtml(destination.name)}</h1>
              <p class="text-gray-600 mb-4">${this.escapeHtml(destination.description || "No description available.")}</p>
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-white p-3 rounded-lg shadow-sm"><p class="text-xs text-gray-500">Country</p><p class="font-bold">${this.escapeHtml(destination.country || "Philippines")}</p></div>
                <div class="bg-white p-3 rounded-lg shadow-sm"><p class="text-xs text-gray-500">Status</p><span class="px-2 py-1 text-xs rounded-full ${destination.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}">${destination.is_active ? "Active" : "Inactive"}</span></div>
              </div>
            </div>
          </div>
        </div>
        
        ${galleryHtml}
        
        <div class="bg-white p-5 rounded-xl border border-gray-200">
          <h3 class="text-2xl font-bold mb-4 text-teal-700">Tour Packages</h3>
          ${packageTabs}
          ${packageContents}
        </div>
      </div>
    `;

    setTimeout(() => {
      document.querySelectorAll(".book-now-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const packageId = parseInt(btn.dataset.packageId);
          const packageName = btn.dataset.packageName;
          this.openBookingModal(packageName, packageId);
        });
      });
    }, 100);
  }

  // ============================================
  // RENDER OPTIONAL TOURS SECTION
  // ============================================
  renderOptionalToursSection(pkg) {
    if (!pkg.optional_tours || pkg.optional_tours.length === 0) return "";

    return `
      <div class="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl border-2 border-purple-200 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-xl font-bold text-purple-700 flex items-center gap-2"><i class="fas fa-compass"></i> Optional Tours</h4>
          <span class="bg-purple-700 text-white px-3 py-1 rounded-full text-xs font-bold">${pkg.optional_tours.length} Tours Available</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${pkg.optional_tours
            .map((tour) => {
              const rates = tour.rates || {};
              const rateItems = [
                { label: "Solo", value: rates.rate_solo },
                { label: "2 Pax", value: rates.rate_2pax },
                { label: "3 Pax", value: rates.rate_3pax },
                { label: "4 Pax", value: rates.rate_4pax },
                { label: "5 Pax", value: rates.rate_5pax },
                { label: "6 Pax", value: rates.rate_6pax },
              ].filter((r) => r.value && parseFloat(r.value) > 0);
              return `<div class="bg-white rounded-xl overflow-hidden border-2 border-purple-100 hover:shadow-lg transition-all"><div class="bg-gradient-to-r from-purple-600 to-purple-800 p-3"><h5 class="font-bold text-white text-lg">${this.escapeHtml(tour.name)}</h5></div><div class="p-4">${tour.description ? `<p class="text-sm text-gray-600 mb-3">${this.escapeHtml(tour.description)}</p>` : ""}${rateItems.length ? `<div class="bg-purple-50 rounded-lg p-3"><p class="text-xs font-semibold text-purple-600 mb-2"><i class="fas fa-tag"></i> Rates:</p><div class="grid grid-cols-2 gap-2 text-xs">${rateItems.map((r) => `<div class="bg-white p-1.5 rounded text-center"><span class="text-gray-600">${r.label}:</span><span class="font-bold text-purple-700 block">₱${Number(r.value).toLocaleString()}</span></div>`).join("")}</div></div>` : '<p class="text-xs text-gray-400">Contact us for rates</p>'}</div></div>`;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  // ============================================
  // RENDER HOTELS SECTION
  // ============================================
  renderHotelsSection(pkg) {
    if (!pkg.package_hotel_rates || pkg.package_hotel_rates.length === 0) {
      return '<div class="bg-yellow-50 p-5 rounded-xl mb-6 text-center"><p class="text-yellow-700">Hotel rates coming soon. Please contact us for more information.</p></div>';
    }

    let html = `<div class="bg-white p-5 rounded-xl border mb-6"><h4 class="text-lg font-bold mb-4 flex items-center gap-2 text-teal-700"><i class="fas fa-hotel"></i> Hotels & Accommodations</h4><div class="space-y-4">`;

    const ratesByCategory = {};
    pkg.package_hotel_rates.forEach((rate) => {
      if (!ratesByCategory[rate.hotel_category_id])
        ratesByCategory[rate.hotel_category_id] = [];
      ratesByCategory[rate.hotel_category_id].push(rate);
    });

    for (const catId of Object.keys(ratesByCategory)) {
      const category = this.hotelCategories.find(
        (c) => c.id == parseInt(catId),
      );
      const rates = ratesByCategory[catId][0];
      if (!category) continue;

      const allRates = [
        { label: "Solo", value: rates.rate_solo },
        { label: "2 Pax", value: rates.rate_2pax },
        { label: "3 Pax", value: rates.rate_3pax },
        { label: "4 Pax", value: rates.rate_4pax },
        { label: "5 Pax", value: rates.rate_5pax },
        { label: "6 Pax", value: rates.rate_6pax },
        { label: "7 Pax", value: rates.rate_7pax },
        { label: "8 Pax", value: rates.rate_8pax },
        { label: "9 Pax", value: rates.rate_9pax },
        { label: "10 Pax", value: rates.rate_10pax },
        { label: "11 Pax", value: rates.rate_11pax },
        { label: "12 Pax", value: rates.rate_12pax },
      ].filter((r) => r.value && parseFloat(r.value) > 0);

      const extraNightRates = [
        { label: "Solo", value: rates.extra_night_solo },
        { label: "2 Pax", value: rates.extra_night_2pax },
        { label: "3 Pax", value: rates.extra_night_3pax },
        { label: "4 Pax", value: rates.extra_night_4pax },
        { label: "5 Pax", value: rates.extra_night_5pax },
        { label: "6 Pax", value: rates.extra_night_6pax },
        { label: "7 Pax", value: rates.extra_night_7pax },
        { label: "8 Pax", value: rates.extra_night_8pax },
        { label: "9 Pax", value: rates.extra_night_9pax },
        { label: "10 Pax", value: rates.extra_night_10pax },
        { label: "11 Pax", value: rates.extra_night_11pax },
        { label: "12 Pax", value: rates.extra_night_12pax },
      ].filter((r) => r.value && parseFloat(r.value) > 0);

      html += `
        <div class="border rounded-lg overflow-hidden">
          <div class="bg-gradient-to-r from-teal-600 to-teal-700 px-4 py-3">
            <h5 class="font-bold text-white text-lg">${this.escapeHtml(category.category_name)}</h5>
            <div class="flex flex-wrap gap-2 mt-1">
              <span class="text-xs text-white/80"><i class="fas fa-users mr-1"></i>Max: ${category.max_room_capacity || 4} pax</span>
              ${category.has_breakfast ? '<span class="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full"><i class="fas fa-coffee mr-1"></i>Breakfast Included</span>' : ""}
            </div>
          </div>
          
          ${
            allRates.length
              ? `
            <div class="p-4 bg-white border-b">
              <p class="text-sm font-semibold text-orange-600 mb-3"><i class="fas fa-tag"></i> Regular Rates (per person):</p>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                ${allRates.map((r) => `<div class="bg-orange-50 p-2 rounded-lg text-center border border-orange-200"><div class="text-xs text-gray-600">${r.label}</div><div class="font-bold text-teal-700 text-base">₱${Number(r.value).toLocaleString()}</div></div>`).join("")}
              </div>
            </div>
          `
              : ""
          }
          
          ${
            extraNightRates.length
              ? `
            <div class="p-4 bg-yellow-50 border-b">
              <p class="text-sm font-semibold text-yellow-700 mb-3"><i class="fas fa-moon"></i> Extra Night Rates (per night):</p>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                ${extraNightRates.map((r) => `<div class="bg-yellow-100 p-2 rounded-lg text-center border border-yellow-200"><div class="text-xs text-gray-600">${r.label}</div><div class="font-bold text-orange-600 text-base">₱${Number(r.value).toLocaleString()}</div></div>`).join("")}
              </div>
            </div>
          `
              : ""
          }
          
          ${
            category.hotels && category.hotels.length
              ? `
            <div class="p-4 bg-gray-50">
              <p class="text-sm font-semibold text-gray-700 mb-3"><i class="fas fa-hotel mr-1"></i> Available Hotels:</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${category.hotels
                  .map(
                    (hotel) => `
                  <div class="border rounded-lg p-3 hover:shadow-md transition bg-white">
                    <div class="flex gap-3">
                      ${hotel.image_url ? `<div class="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"><img src="${hotel.image_url}" class="w-full h-full object-cover"></div>` : `<div class="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center"><i class="fas fa-hotel text-gray-400 text-2xl"></i></div>`}
                      <div class="flex-1">
                        <h6 class="font-bold text-gray-800 text-sm">${this.escapeHtml(hotel.name)}</h6>
                        <p class="text-xs text-gray-500">Max: ${hotel.max_capacity || "N/A"} guests</p>
                        ${hotel.description ? `<p class="text-xs text-gray-600 mt-1 line-clamp-2">${this.escapeHtml(hotel.description)}</p>` : ""}
                      </div>
                    </div>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>
          `
              : '<div class="p-4 text-center text-gray-500 text-sm">No hotels available for this category</div>'
          }
        </div>
      `;
    }

    html += `</div></div>`;
    return html;
  }

  // ============================================
  // OPEN BOOKING MODAL - WITH PAX TYPE RADIO BUTTONS
  // ============================================
  async openBookingModal(packageName, packageId) {
    console.log("🟢 Opening booking modal for:", { packageName, packageId });

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

    const hotelCategories = destination.hotel_categories || [];
    const packageRates = pkg.package_hotel_rates || [];

    const existingModal = document.getElementById("bookingModal");
    if (existingModal) existingModal.remove();

    const today = new Date().toISOString().split("T")[0];
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    const maxDateStr = maxDate.toISOString().split("T")[0];

    this.currentPackageData = {
      id: pkg.id,
      name: pkg.package_name,
      code: pkg.package_code,
      destination: destination.name,
      destinationId: destination.id,
      hotelCategories: hotelCategories,
      packageRates: packageRates,
    };

    const modal = document.createElement("div");
    modal.id = "bookingModal";
    modal.className =
      "fixed inset-0 bg-black/80 flex items-center justify-center z-[999999] overflow-y-auto p-4";
    modal.innerHTML = this.buildBookingModalHTML(
      destination,
      pkg,
      hotelCategories,
      packageRates,
      today,
      maxDateStr,
    );
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) this.closeBookingModal();
    });

    this.attachBookingFormEvents();
  }

  // ============================================
  // BUILD BOOKING MODAL HTML - WITH PAX TYPE RADIO BUTTONS
  // ============================================
  buildBookingModalHTML(
    destination,
    pkg,
    hotelCategories,
    packageRates,
    today,
    maxDateStr,
  ) {
    // Build hotel categories with PAX TYPE radio buttons
    const hotelOptionsHtml = hotelCategories
      .map((cat, index) => {
        const rate = packageRates.find((r) => r.hotel_category_id === cat.id);
        if (!rate) return "";

        const hotels = cat.hotels?.filter((h) => h.is_active) || [];

        // Define pax types based on available rates
        const paxTypes = [
          { label: "Solo", value: "solo", paxCount: 1, rate: rate.rate_solo },
          { label: "2 Pax", value: "2pax", paxCount: 2, rate: rate.rate_2pax },
          { label: "3 Pax", value: "3pax", paxCount: 3, rate: rate.rate_3pax },
          { label: "4 Pax", value: "4pax", paxCount: 4, rate: rate.rate_4pax },
          { label: "5 Pax", value: "5pax", paxCount: 5, rate: rate.rate_5pax },
          { label: "6 Pax", value: "6pax", paxCount: 6, rate: rate.rate_6pax },
          { label: "7 Pax", value: "7pax", paxCount: 7, rate: rate.rate_7pax },
          { label: "8 Pax", value: "8pax", paxCount: 8, rate: rate.rate_8pax },
          { label: "9 Pax", value: "9pax", paxCount: 9, rate: rate.rate_9pax },
          {
            label: "10 Pax",
            value: "10pax",
            paxCount: 10,
            rate: rate.rate_10pax,
          },
          {
            label: "11 Pax",
            value: "11pax",
            paxCount: 11,
            rate: rate.rate_11pax,
          },
          {
            label: "12 Pax",
            value: "12pax",
            paxCount: 12,
            rate: rate.rate_12pax,
          },
          {
            label: "Child",
            value: "child",
            paxCount: 1,
            rate: rate.rate_child_no_breakfast || rate.rate_child_4_9,
          },
        ].filter((p) => p.rate && parseFloat(p.rate) > 0);

        // Extra night rates
        const extraNightTypes = [
          { label: "Solo", value: "solo", rate: rate.extra_night_solo },
          { label: "2 Pax", value: "2pax", rate: rate.extra_night_2pax },
          { label: "3 Pax", value: "3pax", rate: rate.extra_night_3pax },
          { label: "4 Pax", value: "4pax", rate: rate.extra_night_4pax },
          { label: "5 Pax", value: "5pax", rate: rate.extra_night_5pax },
          { label: "6 Pax", value: "6pax", rate: rate.extra_night_6pax },
          { label: "7 Pax", value: "7pax", rate: rate.extra_night_7pax },
          { label: "8 Pax", value: "8pax", rate: rate.extra_night_8pax },
          { label: "9 Pax", value: "9pax", rate: rate.extra_night_9pax },
          { label: "10 Pax", value: "10pax", rate: rate.extra_night_10pax },
          { label: "11 Pax", value: "11pax", rate: rate.extra_night_11pax },
          { label: "12 Pax", value: "12pax", rate: rate.extra_night_12pax },
        ].filter((p) => p.rate && parseFloat(p.rate) > 0);

        // Generate radio buttons for PAX TYPES
        const paxTypeRadios = paxTypes
          .map(
            (p, idx) => `
        <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-orange-50 cursor-pointer transition ${idx === 0 ? "bg-orange-50 border border-orange-200" : ""}">
          <input type="radio" name="paxType_${cat.id}" value="${p.value}" data-pax-count="${p.paxCount}" data-rate="${p.rate}" data-pax-label="${p.label}" data-category="${cat.id}" class="w-4 h-4 accent-orange-500" ${idx === 0 ? "checked" : ""}>
          <span class="text-sm font-medium text-gray-700">${p.label}</span>
          <span class="text-xs text-orange-600 ml-auto">₱${Number(p.rate).toLocaleString()}</span>
        </label>
      `,
          )
          .join("");

        // Generate radio buttons for EXTRA NIGHT RATES
        const extraNightRadios =
          extraNightTypes.length > 0
            ? `
        <div class="mt-3 pt-2 border-t border-dashed">
          <p class="text-xs font-semibold text-yellow-600 mb-2"><i class="fas fa-moon"></i> Extra Night Rate (per night):</p>
          <div class="grid grid-cols-2 gap-2">
            ${extraNightTypes
              .map(
                (p, idx) => `
              <label class="flex items-center gap-2 p-1 rounded hover:bg-yellow-50 cursor-pointer">
                <input type="radio" name="extraNight_${cat.id}" value="${p.value}" data-extra-rate="${p.rate}" data-extra-label="${p.label}" class="w-3 h-3 accent-yellow-500">
                <span class="text-xs text-gray-600">${p.label}</span>
                <span class="text-xs text-yellow-600 ml-auto">₱${Number(p.rate).toLocaleString()}</span>
              </label>
            `,
              )
              .join("")}
          </div>
        </div>
      `
            : "";

        // Hotels selection
        const hotelsHtml =
          hotels.length > 0
            ? `
        <div class="mt-4 pt-3 border-t">
          <p class="text-sm font-semibold text-teal-700 mb-2"><i class="fas fa-hotel"></i> Select Hotel:</p>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            ${hotels
              .map(
                (hotel) => `
              <label class="flex items-start gap-3 p-3 bg-white rounded-lg border hover:bg-gray-50 cursor-pointer">
                <input type="radio" name="hotel_${cat.id}" value="${hotel.id}" data-hotel-name="${hotel.name}" data-category="${cat.id}" class="mt-1 w-4 h-4">
                <div class="flex-1">
                  <div class="flex gap-2">
                    ${hotel.image_url ? `<img src="${hotel.image_url}" class="w-12 h-12 rounded object-cover">` : `<div class="w-12 h-12 bg-gray-200 rounded flex items-center justify-center"><i class="fas fa-hotel text-gray-400"></i></div>`}
                    <div>
                      <p class="font-medium text-sm">${this.escapeHtml(hotel.name)}</p>
                      <p class="text-xs text-gray-500">Max: ${hotel.max_capacity || "N/A"} guests</p>
                    </div>
                  </div>
                </div>
              </label>
            `,
              )
              .join("")}
          </div>
        </div>
      `
            : '<p class="text-gray-500 text-sm mt-2">No specific hotels available</p>';

        return `
        <div class="border rounded-lg mb-4 overflow-hidden" data-category-id="${cat.id}">
          <div class="bg-gradient-to-r from-teal-600 to-teal-700 p-3">
            <div class="flex justify-between items-center">
              <div>
                <h4 class="font-bold text-white text-lg">${this.escapeHtml(cat.category_name)}</h4>
                <p class="text-xs text-white/80">Max: ${cat.max_room_capacity || 4} pax</p>
                ${cat.has_breakfast ? '<p class="text-xs text-white/80"><i class="fas fa-coffee"></i> Breakfast Included</p>' : ""}
              </div>
              <input type="radio" name="hotelCategory" value="${cat.id}" data-category-name="${cat.category_name}" class="w-5 h-5 accent-orange-500" ${index === 0 ? "checked" : ""}>
            </div>
          </div>
          
          <div class="p-4">
            <!-- Pax Type Selection -->
            <p class="text-sm font-semibold text-teal-700 mb-2"><i class="fas fa-users"></i> Select Pax Type:</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
              ${paxTypeRadios}
            </div>
            
            ${extraNightRadios}
            
            ${hotelsHtml}
          </div>
        </div>
      `;
      })
      .join("");

    return `
      <div class="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative">
        <!-- Exit Button -->
        <button onclick="window.destinationsManager.closeBookingModal()" class="absolute top-4 right-4 w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg z-10 flex items-center justify-center">
          <i class="fas fa-sign-out-alt text-lg"></i>
        </button>
        
        <div class="bg-gradient-to-r from-teal-700 to-orange-600 text-white p-5 rounded-t-2xl sticky top-0">
          <h2 class="text-2xl font-bold">${this.escapeHtml(destination.name)}</h2>
          <p>${this.escapeHtml(pkg.package_name)}</p>
          <p class="text-xs">${this.escapeHtml(pkg.package_code || "")}</p>
        </div>
        
        <div class="p-6">
          <!-- Package Summary -->
          <div class="bg-teal-50 p-4 rounded-lg mb-6">
            <h3 class="font-bold text-teal-800">Package Summary</h3>
            <div class="grid grid-cols-2 gap-2 text-sm mt-2">
              <div><span class="text-gray-600">Package:</span> ${this.escapeHtml(pkg.package_name)}</div>
              <div><span class="text-gray-600">Code:</span> ${this.escapeHtml(pkg.package_code || "N/A")}</div>
              <div><span class="text-gray-600">Category:</span> ${this.escapeHtml(pkg.tour_category || "Standard")}</div>
              <div><span class="text-gray-600">Destination:</span> ${this.escapeHtml(destination.name)}</div>
            </div>
            ${pkg.has_extra_night ? '<p class="mt-2 text-xs text-blue-600"><i class="fas fa-moon"></i> Extra Night Available</p>' : ""}
          </div>
          
          <h3 class="text-xl font-bold text-teal-700 mb-4">Select Accommodation</h3>
          <div id="hotelSelection">
            ${hotelOptionsHtml || '<p class="text-gray-500">No hotel options available.</p>'}
          </div>
          
          <div class="mt-6">
            <h3 class="text-xl font-bold text-teal-700 mb-4">Traveler Information</h3>
            <div class="grid md:grid-cols-2 gap-4">
              <div><input type="text" id="fullName" class="w-full p-3 border rounded-lg" placeholder="Full Name *"></div>
              <div><input type="email" id="email" class="w-full p-3 border rounded-lg" placeholder="Email *"></div>
              <div><input type="tel" id="phone" class="w-full p-3 border rounded-lg" placeholder="Phone *"></div>
              <div><input type="date" id="travelDate" min="${today}" max="${maxDateStr}" class="w-full p-3 border rounded-lg"></div>
            </div>
            <div class="mt-4">
              <textarea id="requests" rows="2" class="w-full p-3 border rounded-lg" placeholder="Special requests (dietary, room preferences, etc.)"></textarea>
            </div>
          </div>
          
          <div class="mt-6 flex gap-3 bg-gray-50 p-4 rounded-lg">
            <input type="checkbox" id="terms" class="mt-1">
            <label>I agree to the <button type="button" onclick="window.showTermsModal()" class="text-teal-700 font-semibold">terms and conditions</button></label>
          </div>
          
          <div class="flex gap-4 mt-6">
            <button onclick="window.destinationsManager.closeBookingModal()" class="flex-1 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 transition">Cancel</button>
            <button onclick="window.destinationsManager.submitBooking()" class="flex-1 py-3 bg-gradient-to-r from-teal-600 to-orange-600 text-white rounded-lg font-semibold hover:shadow-lg transition">
              <i class="fas fa-check-circle mr-2"></i> Confirm Booking
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================
  // ATTACH BOOKING FORM EVENTS
  // ============================================
  attachBookingFormEvents() {
    // Handle hotel category selection
    document
      .querySelectorAll('input[name="hotelCategory"]')
      .forEach((radio) => {
        radio.addEventListener("change", (e) => {
          // No need to hide anything
        });
      });
  }

  // ============================================
  // SUBMIT BOOKING - FIXED ERROR
  // ============================================
  async submitBooking() {
    const fullName = document.getElementById("fullName")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const phone = document.getElementById("phone")?.value.trim();
    const travelDate = document.getElementById("travelDate")?.value;
    const requests = document.getElementById("requests")?.value.trim();
    const terms = document.getElementById("terms")?.checked;

    // Get selected hotel category
    const selectedCategory = document.querySelector(
      'input[name="hotelCategory"]:checked',
    );

    if (!selectedCategory) {
      alert("Please select a hotel category");
      return;
    }

    const categoryId = selectedCategory.value;
    const categoryName = selectedCategory.dataset.categoryName;

    // Get selected pax type for this category
    const selectedPaxType = document.querySelector(
      `input[name="paxType_${categoryId}"]:checked`,
    );
    if (!selectedPaxType) {
      alert("Please select a pax type (Solo, 2 Pax, etc.)");
      return;
    }

    const paxCount = parseInt(selectedPaxType.dataset.paxCount);
    const selectedRate = parseFloat(selectedPaxType.dataset.rate);
    const paxTypeValue = selectedPaxType.value;
    const paxLabel = selectedPaxType.dataset.paxLabel || paxTypeValue;

    // Get selected hotel
    const selectedHotel = document.querySelector(
      `input[name="hotel_${categoryId}"]:checked`,
    );
    if (!selectedHotel) {
      alert("Please select a hotel");
      return;
    }

    const hotelId = selectedHotel.value;
    const hotelName = selectedHotel.dataset.hotelName;

    // Get extra night selection if any
    const selectedExtraNight = document.querySelector(
      `input[name="extraNight_${categoryId}"]:checked`,
    );
    let hotelExtraNightRate = null;
    let extraNightLabel = null;
    let extraNightInfo = "";
    let hotelNights = 0;

    if (selectedExtraNight) {
      hotelExtraNightRate = parseFloat(selectedExtraNight.dataset.extraRate);
      extraNightLabel =
        selectedExtraNight.dataset.extraLabel || selectedExtraNight.value;
      extraNightInfo = `\nExtra Night: ${extraNightLabel} - ₱${Number(hotelExtraNightRate).toLocaleString()}`;
      hotelNights = 1; // Default to 1 night
    }

    // Calculate total amount (base rate * pax count)
    const totalAmount = selectedRate * paxCount;

    // Combine special requests with extra night info
    let fullSpecialRequests = requests || "";
    if (extraNightInfo) {
      fullSpecialRequests = fullSpecialRequests
        ? `${fullSpecialRequests}${extraNightInfo}`
        : extraNightInfo;
    }

    // Validation
    const errors = [];
    if (!fullName) errors.push("Full Name is required");
    if (!email) errors.push("Email is required");
    if (!phone) errors.push("Phone number is required");
    if (!travelDate) errors.push("Travel date is required");
    if (!terms) errors.push("You must agree to the terms");

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push("Invalid email");

    if (errors.length > 0) {
      alert("Please fix:\n\n" + errors.join("\n"));
      return;
    }

    // Generate unique booking reference
    const bookingRef = `SNS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Match exactly with your database schema columns
    const bookingData = {
      booking_reference: bookingRef,
      destination_id: this.currentPackageData.destinationId,
      package_id: this.currentPackageId,
      hotel_category_id: parseInt(categoryId),
      travel_dates: [travelDate],
      total_amount: totalAmount,
      client_name: fullName,
      client_email: email.toLowerCase(),
      client_mobile: phone,
      nationality: "Filipino",
      status: "pending",
      payment_status: "unpaid",
      created_at: new Date().toISOString(),
      category_name: categoryName,
      hotel_Name: hotelName,
      package_Name: this.currentPackage,
      hotel_Rates_Selected: selectedRate,
      special_requests: fullSpecialRequests || null,
      booking_source: "website",
      hotel_extra_night_rate: hotelExtraNightRate,
      hotel_pax_count: paxCount,
      hotel_nights: hotelNights,
      base_rate: selectedRate,
      extra_nights_total: hotelExtraNightRate
        ? hotelExtraNightRate * hotelNights
        : null,
      selected_rate_details: `${paxLabel} - ₱${selectedRate.toLocaleString()}`,
      selected_pax_type: paxTypeValue,
    };

    console.log("Submitting booking with schema-matched data:", bookingData);

    const btn = document.querySelector("#bookingModal button:last-child");
    const originalText = btn?.innerHTML;
    if (btn) {
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
      btn.disabled = true;
    }

    try {
      const { data, error } = await window.sns_supabase_client
        .from("b2b_bookings")
        .insert([bookingData])
        .select();

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(error.message);
      }

      console.log("Booking successful:", data);

      let extraNightMsg = "";
      if (hotelExtraNightRate) {
        extraNightMsg = `\nExtra Night: ${extraNightLabel} - ₱${Number(hotelExtraNightRate).toLocaleString()}`;
      }

      alert(
        `✅ BOOKING CONFIRMED!\n\n` +
          `Reference: ${bookingRef}\n` +
          `Package: ${this.currentPackage}\n` +
          `Destination: ${this.currentPackageData.destination}\n` +
          `Travel Date: ${travelDate}\n` +
          `Pax Type: ${paxLabel}\n` +
          `Travelers: ${paxCount}\n` +
          `Rate: ₱${Number(selectedRate).toLocaleString()} per person${extraNightMsg}\n` +
          `Total Amount: ₱${totalAmount.toLocaleString()}\n` +
          `Hotel: ${hotelName}\n\n` +
          `We will contact you within 24 hours to confirm your booking.`,
      );

      this.closeBookingModal();
    } catch (error) {
      console.error("Booking error:", error);
      alert("Booking failed: " + error.message);
      if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
  }

  // ============================================
  // CAROUSEL FUNCTIONS
  // ============================================
  startAutoCarousel() {
    this.stopAutoCarousel();
    if (this.images?.length > 1) {
      this.carouselInterval = setInterval(() => this.nextCarouselImage(), 3000);
    }
  }

  stopAutoCarousel() {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
      this.carouselInterval = null;
    }
  }

  pauseAutoCarousel() {
    this.stopAutoCarousel();
  }

  resumeAutoCarousel() {
    if (
      this.modal?.classList.contains("active") &&
      this.images?.length > 1 &&
      !this.carouselInterval
    ) {
      this.startAutoCarousel();
    }
  }

  prevCarouselImage() {
    if (!this.images?.length) return;
    this.currentImageIndex =
      (this.currentImageIndex - 1 + this.images.length) % this.images.length;
    this.updateCarouselImage();
    this.pauseAutoCarousel();
    setTimeout(() => this.resumeAutoCarousel(), 5000);
  }

  nextCarouselImage() {
    if (!this.images?.length) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
    this.updateCarouselImage();
  }

  goToCarouselImage(i) {
    if (!this.images?.length) return;
    this.currentImageIndex = i;
    this.updateCarouselImage();
    this.pauseAutoCarousel();
    setTimeout(() => this.resumeAutoCarousel(), 5000);
  }

  updateCarouselImage() {
    const main = document.getElementById("carouselMainImage");
    const span = document.getElementById("carouselCurrentIndex");
    if (main && this.images[this.currentImageIndex])
      main.src = this.images[this.currentImageIndex].url;
    if (span) span.textContent = this.currentImageIndex + 1;
  }

  showPackage(i) {
    document
      .querySelectorAll('[id^="modalPackage"]')
      .forEach((p) => p.classList.add("hidden"));
    document.getElementById(`modalPackage${i}`)?.classList.remove("hidden");
    document.querySelectorAll(".package-tab").forEach((t, idx) => {
      if (idx === i) t.classList.add("bg-teal-700", "text-white");
      else t.classList.remove("bg-teal-700", "text-white");
    });
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  closeModal() {
    this.stopAutoCarousel();
    if (this.modal) {
      this.modal.classList.remove("active");
      document.body.style.overflow = "";
    }
    this.currentImageIndex = 0;
    this.images = [];
  }

  closeBookingModal() {
    const modal = document.getElementById("bookingModal");
    if (modal) modal.remove();
    this.currentPackageData = null;
  }

  renderDestinationOnly(dest) {
    if (!this.detailContent) return;
    this.detailContent.innerHTML = `
      <div class="max-w-4xl mx-auto px-4 py-8 relative">
        <button onclick="window.destinationsManager.closeModal()" class="fixed top-4 right-4 w-12 h-12 bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center">
          <i class="fas fa-sign-out-alt text-xl"></i>
        </button>
        <div class="bg-white rounded-xl p-8 text-center">
          <i class="fas fa-clock text-5xl text-amber-500 mb-4"></i>
          <h2 class="text-2xl font-bold text-amber-800">Coming Soon!</h2>
          <p>Packages for ${this.escapeHtml(dest.name)} are being prepared.</p>
          <button onclick="window.destinationsManager.closeModal()" class="mt-6 px-6 py-2 bg-gray-200 rounded-lg">Close</button>
        </div>
      </div>
    `;
  }

  showLoading() {
    if (this.spinner) this.spinner.style.display = "block";
    if (this.grid) this.grid.style.display = "none";
  }

  hideLoading() {
    if (this.spinner) this.spinner.style.display = "none";
    if (this.grid) this.grid.style.display = "grid";
  }

  showError(msg) {
    this.hideLoading();
    if (this.errorMsg) {
      this.errorMsg.style.display = "block";
      this.errorMsg.innerHTML = `<div class="bg-red-50 text-red-700 p-3 rounded-lg">${this.escapeHtml(msg)}</div>`;
    }
  }

  escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  startAutoRefresh() {
    if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
    this.autoRefreshInterval = setInterval(() => {
      console.log("🔄 Auto-refreshing...");
      this.loadDestinations(true);
    }, 30000);
  }

  clearCache() {
    this.dataCache.clear();
    this.lastFetchTime = null;
  }

  async forceRefresh() {
    this.clearCache();
    await this.loadDestinations(false);
  }

  setupRealtimeSubscriptions() {
    if (this.realtimeSubscription) {
      window.sns_supabase_client.removeChannel(this.realtimeSubscription);
    }

    this.realtimeSubscription = window.sns_supabase_client.channel(
      "destinations-changes",
    );

    ["destinations", "destination_packages", "package_hotel_rates"].forEach(
      (table) => {
        this.realtimeSubscription = this.realtimeSubscription.on(
          "postgres_changes",
          { event: "*", schema: "public", table: table },
          () => this.handleRealtimeChange(),
        );
      },
    );

    this.realtimeSubscription.subscribe();
  }

  async handleRealtimeChange() {
    console.log("🔄 Realtime change detected");
    this.clearCache();
    await this.loadDestinations(true);
  }
}

// Global helper functions
window.showTermsModal = () => {
  alert(
    "📋 TERMS & CONDITIONS\n\n" +
      "1. 50% down payment required\n" +
      "2. Balance due 7 days before travel\n" +
      "3. Cancellation: 30+ days = full refund, 15-29 days = 50%, <15 days = no refund\n" +
      "4. Travel insurance recommended\n" +
      "5. Itinerary may change due to weather\n\n" +
      "By booking, you agree to these terms.",
  );
};

console.log(
  "✅ tours.js loaded - COMPLETE WITH PAX TYPE RADIO BUTTONS & FIXED ERROR!",
);
