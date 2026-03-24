// ============================================
// TOURS.JS - FINAL COMPLETE VERSION
// FULLY WORKING WITH ALL DATA (HOTEL RATES, INCLUSIONS, EXCLUSIONS, ITINERARIES, OPTIONAL TOURS)
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
    this.currentImageIndex = 0;
    this.carouselInterval = null;
    this.currentDestination = null;
    this.currentFilter = "all";
    this.hotelCategories = [];
    this.isLoading = false;
    this.autoRefreshInterval = null;

    if (this.grid)
      this.grid.innerHTML =
        '<div class="text-center py-12">Loading destinations...</div>';
  }

  // ============================================
  // LOAD DESTINATIONS - COMPLETE WITH ALL TABLES
  // ============================================
  async loadDestinations() {
    if (this.isLoading) {
      console.log("⚠️ Already loading, skipping...");
      return;
    }

    try {
      this.isLoading = true;
      this.showLoading();

      console.log("🔄 Fetching ALL destinations data...");

      // 1. Fetch destinations
      const { data: destinations, error: destError } =
        await window.sns_supabase_client
          .from("destinations")
          .select("*")
          .eq("is_active", true)
          .order("name");

      if (destError)
        throw new Error(`Destinations error: ${destError.message}`);
      if (!destinations || destinations.length === 0) {
        this.destinations = [];
        this.filteredDestinations = [];
        this.renderDestinations([]);
        this.hideLoading();
        return;
      }

      console.log(`✅ Found ${destinations.length} destinations`);

      const destinationIds = destinations.map((d) => d.id);

      // 2. Fetch all related data in parallel
      console.log("📸 Fetching images...");
      const { data: images } = await window.sns_supabase_client
        .from("destination_images")
        .select("*")
        .in("destination_id", destinationIds);

      console.log("📦 Fetching packages...");
      const { data: packages } = await window.sns_supabase_client
        .from("destination_packages")
        .select("*")
        .eq("is_active", true)
        .in("destination_id", destinationIds);

      let packageIds = [];
      let hotelRates = [],
        inclusions = [],
        exclusions = [],
        itineraries = [],
        packageOptionalTours = [];

      if (packages && packages.length > 0) {
        packageIds = packages.map((p) => p.id);

        console.log("💰 Fetching hotel rates...");
        const { data: rates } = await window.sns_supabase_client
          .from("package_hotel_rates")
          .select("*")
          .in("package_id", packageIds);
        hotelRates = rates || [];

        console.log("✅ Fetching inclusions...");
        const { data: inc } = await window.sns_supabase_client
          .from("package_inclusions")
          .select("*")
          .in("package_id", packageIds);
        inclusions = inc || [];

        console.log("❌ Fetching exclusions...");
        const { data: exc } = await window.sns_supabase_client
          .from("package_exclusions")
          .select("*")
          .in("package_id", packageIds);
        exclusions = exc || [];

        console.log("📅 Fetching itineraries...");
        const { data: iti } = await window.sns_supabase_client
          .from("package_itineraries")
          .select("*")
          .in("package_id", packageIds);
        itineraries = iti || [];

        console.log("🎯 Fetching package optional tours...");
        const { data: pkgOpt } = await window.sns_supabase_client
          .from("package_optional_tours")
          .select("*")
          .in("package_id", packageIds);
        packageOptionalTours = pkgOpt || [];

        console.log(
          `📊 Package data: rates=${hotelRates.length}, inclusions=${inclusions.length}, exclusions=${exclusions.length}, itineraries=${itineraries.length}, pkgOpt=${packageOptionalTours.length}`,
        );
      }

      console.log("🏨 Fetching hotel categories...");
      const { data: hotelCategories } = await window.sns_supabase_client
        .from("hotel_categories")
        .select("*")
        .in("destination_id", destinationIds);

      console.log("🏢 Fetching hotels...");
      const { data: hotels } = await window.sns_supabase_client
        .from("hotels")
        .select("*")
        .eq("is_active", true);

      console.log("🎪 Fetching optional tour categories...");
      const { data: optionalTourCategories } = await window.sns_supabase_client
        .from("optional_tour_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      console.log("💵 Fetching optional tour rates...");
      const { data: optionalTourRates } = await window.sns_supabase_client
        .from("optional_tour_rates")
        .select("*");

      // Create maps for faster lookups
      const imagesMap = new Map();
      (images || []).forEach((img) => {
        if (!imagesMap.has(img.destination_id))
          imagesMap.set(img.destination_id, []);
        imagesMap.get(img.destination_id).push(img);
      });

      const packagesMap = new Map();
      (packages || []).forEach((pkg) => {
        if (!packagesMap.has(pkg.destination_id))
          packagesMap.set(pkg.destination_id, []);
        packagesMap.get(pkg.destination_id).push(pkg);
      });

      const hotelRatesMap = new Map();
      hotelRates.forEach((rate) => {
        if (!hotelRatesMap.has(rate.package_id))
          hotelRatesMap.set(rate.package_id, []);
        hotelRatesMap.get(rate.package_id).push(rate);
      });

      const inclusionsMap = new Map();
      inclusions.forEach((inc) => {
        if (!inclusionsMap.has(inc.package_id))
          inclusionsMap.set(inc.package_id, []);
        inclusionsMap.get(inc.package_id).push(inc);
      });

      const exclusionsMap = new Map();
      exclusions.forEach((exc) => {
        if (!exclusionsMap.has(exc.package_id))
          exclusionsMap.set(exc.package_id, []);
        exclusionsMap.get(exc.package_id).push(exc);
      });

      const itinerariesMap = new Map();
      itineraries.forEach((iti) => {
        if (!itinerariesMap.has(iti.package_id))
          itinerariesMap.set(iti.package_id, []);
        itinerariesMap.get(iti.package_id).push(iti);
      });

      const hotelCategoriesMap = new Map();
      (hotelCategories || []).forEach((cat) => {
        if (!hotelCategoriesMap.has(cat.destination_id))
          hotelCategoriesMap.set(cat.destination_id, []);
        hotelCategoriesMap.get(cat.destination_id).push(cat);
      });

      const hotelsByCategoryMap = new Map();
      (hotels || []).forEach((hotel) => {
        if (!hotelsByCategoryMap.has(hotel.category_id))
          hotelsByCategoryMap.set(hotel.category_id, []);
        hotelsByCategoryMap.get(hotel.category_id).push(hotel);
      });

      const optionalTourRatesMap = new Map();
      (optionalTourRates || []).forEach((rate) => {
        optionalTourRatesMap.set(rate.tour_id, rate);
      });

      const packageOptionalToursMap = new Map();
      packageOptionalTours.forEach((item) => {
        if (!packageOptionalToursMap.has(item.package_id))
          packageOptionalToursMap.set(item.package_id, []);
        packageOptionalToursMap
          .get(item.package_id)
          .push(item.optional_tour_id);
      });

      // Build complete destinations
      this.destinations = destinations.map((dest) => {
        dest.destination_images = imagesMap.get(dest.id) || [];

        dest.destination_packages = (packagesMap.get(dest.id) || []).map(
          (pkg) => {
            pkg.package_hotel_rates = hotelRatesMap.get(pkg.id) || [];
            pkg.package_inclusions = inclusionsMap.get(pkg.id) || [];
            pkg.package_exclusions = exclusionsMap.get(pkg.id) || [];
            pkg.package_itineraries = itinerariesMap.get(pkg.id) || [];

            const tourIds = packageOptionalToursMap.get(pkg.id) || [];
            pkg.optional_tours = (optionalTourCategories || [])
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

      this.filteredDestinations = [...this.destinations];
      this.hotelCategories = this.destinations.flatMap(
        (d) => d.hotel_categories,
      );

      // Log verification
      if (this.destinations.length > 0) {
        const firstDest = this.destinations[0];
        const firstPkg = firstDest.destination_packages[0];
        console.log(`✅ ${firstDest.name}:`, {
          images: firstDest.destination_images.length,
          packages: firstDest.destination_packages.length,
          hotelRates: firstPkg?.package_hotel_rates.length || 0,
          inclusions: firstPkg?.package_inclusions.length || 0,
          exclusions: firstPkg?.package_exclusions.length || 0,
          itineraries: firstPkg?.package_itineraries.length || 0,
          optionalTours: firstPkg?.optional_tours.length || 0,
          hotelCategories: firstDest.hotel_categories.length,
        });
      }

      this.renderFilterButtons();
      this.renderDestinations(this.filteredDestinations);
    } catch (error) {
      console.error("❌ Error:", error);
      this.showError(error.message);
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  }

  // ============================================
  // RENDER DESTINATIONS
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
            ${
              imageUrl
                ? `<img src="${imageUrl}" alt="${this.escapeHtml(dest.name)}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">`
                : `<div class="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <i class="fas fa-image text-gray-400 text-5xl"></i>
              </div>`
            }
            <div class="absolute top-3 right-3">
              <span class="px-3 py-1 rounded-full text-xs font-semibold shadow-lg ${badgeClass} text-white">
                ${badgeIcon} ${dest.country === "Philippines" ? "Local" : "International"}
              </span>
            </div>
            ${
              !hasPackages
                ? `
              <div class="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span class="bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold">Coming Soon</span>
              </div>
            `
                : ""
            }
          </div>
          <div class="p-5">
            <h3 class="text-xl font-bold text-gray-800 mb-1 group-hover:text-teal-700 transition">
              ${this.escapeHtml(dest.name)}
            </h3>
            <p class="text-gray-500 text-sm flex items-center gap-1">
              <i class="fas fa-map-marker-alt text-teal-500 text-xs"></i> 
              ${this.escapeHtml(dest.country || "Philippines")}
            </p>
            <p class="text-gray-600 text-sm mt-2 line-clamp-2">
              ${this.escapeHtml(description.substring(0, 100))}
              ${description.length > 100 ? "..." : ""}
            </p>
            <div class="mt-4 flex justify-between items-center">
              <span class="text-teal-700 font-semibold text-sm">
                ${hasPackages ? `${dest.destination_packages.length} Package${dest.destination_packages.length > 1 ? "s" : ""}` : "Coming Soon"}
              </span>
              <span class="text-gray-400 text-xs"><i class="fas fa-arrow-right group-hover:translate-x-1 transition"></i></span>
            </div>
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;
    console.log(`✅ Rendered ${destinations.length} cards`);
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
        <button onclick="window.destinationsManager.refreshData()" class="text-xs text-gray-400 hover:text-teal-600 transition">
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
  // SHOW DESTINATION MODAL
  // ============================================
  async showDestinationModal(destinationId) {
    const destination = this.destinations.find((d) => d.id === destinationId);
    if (!destination) {
      console.error("Destination not found:", destinationId);
      return;
    }

    console.log("Showing destination:", destination.name);
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
  // RENDER COMPLETE MODAL
  // ============================================
  renderCompleteModal(destination, packages) {
    if (!this.detailContent) return;

    const primaryImage = destination.destination_images?.[0]?.url || "";
    const hasGallery = this.images && this.images.length > 0;

    // Gallery HTML
    const galleryHtml = hasGallery
      ? `
      <div class="bg-white p-5 rounded-xl border border-gray-200 mb-6">
        <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
          <i class="fas fa-images text-teal-600"></i> Photo Gallery
        </h3>
        <div class="relative rounded-xl overflow-hidden" style="height: 450px;">
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

    // Package tabs
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

    // Package contents
    const packageContents = packages
      .map(
        (pkg, idx) => `
      <div class="package-content ${idx === 0 ? "block" : "hidden"}" id="modalPackage${idx}">
        <div class="bg-white p-5 rounded-xl border border-gray-200 mb-6">
          <div class="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <h3 class="text-2xl font-bold text-teal-700">${this.escapeHtml(pkg.package_name)}</h3>
              <p class="text-sm text-gray-500 mt-1">
                ${this.escapeHtml(pkg.package_code || "")} • ${this.escapeHtml(pkg.tour_category || "Standard")}
              </p>
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
                ${pkg.package_inclusions
                  .map(
                    (inc) => `
                  <li class="flex items-start gap-2">
                    <i class="fas fa-circle text-[8px] mt-1.5 text-green-600"></i>
                    <span class="text-sm">${this.escapeHtml(inc.inclusion_text)}</span>
                  </li>
                `,
                  )
                  .join("")}
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
                ${pkg.package_exclusions
                  .map(
                    (exc) => `
                  <li class="flex items-start gap-2">
                    <i class="fas fa-circle text-[8px] mt-1.5 text-red-500"></i>
                    <span class="text-sm">${this.escapeHtml(exc.exclusion_text)}</span>
                  </li>
                `,
                  )
                  .join("")}
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
              ${pkg.package_itineraries
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
      <div class="max-w-7xl mx-auto px-4 py-8">
        <div class="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl border border-indigo-100 mb-6">
          <div class="flex flex-col md:flex-row gap-6">
            ${
              primaryImage
                ? `
              <div class="md:w-1/3">
                <img src="${primaryImage}" class="w-full h-48 object-cover rounded-lg shadow">
              </div>
            `
                : ""
            }
            <div class="${primaryImage ? "md:w-2/3" : "w-full"}">
              <h1 class="text-3xl font-bold text-teal-700 mb-2">${this.escapeHtml(destination.name)}</h1>
              <p class="text-gray-600 mb-4">${this.escapeHtml(destination.description || "No description available.")}</p>
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-white p-3 rounded-lg shadow-sm">
                  <p class="text-xs text-gray-500">Country</p>
                  <p class="font-bold">${this.escapeHtml(destination.country || "Philippines")}</p>
                </div>
                <div class="bg-white p-3 rounded-lg shadow-sm">
                  <p class="text-xs text-gray-500">Status</p>
                  <span class="px-2 py-1 text-xs rounded-full ${destination.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}">
                    ${destination.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
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
        
        <div class="flex justify-center mt-8">
          <button onclick="window.destinationsManager.closeModal()" class="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
            Close
          </button>
        </div>
      </div>
    `;

    setTimeout(() => {
      document.querySelectorAll(".book-now-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.openBookingModal(
            btn.dataset.packageName,
            parseInt(btn.dataset.packageId),
          );
        });
      });
    }, 100);
  }

  // ============================================
  // RENDER HOTELS SECTION - COMPLETE
  // ============================================
  renderHotelsSection(pkg) {
    if (!pkg.package_hotel_rates || pkg.package_hotel_rates.length === 0) {
      return '<div class="bg-yellow-50 p-5 rounded-xl mb-6 text-center"><p class="text-yellow-700">Hotel rates coming soon. Please contact us for more information.</p></div>';
    }

    let html = `<div class="bg-white p-5 rounded-xl border mb-6">
      <h4 class="text-lg font-bold mb-4 flex items-center gap-2 text-teal-700">
        <i class="fas fa-hotel"></i> Hotels & Accommodations
      </h4>
      <div class="space-y-4">`;

    const ratesByCategory = {};
    pkg.package_hotel_rates.forEach((rate) => {
      if (!ratesByCategory[rate.hotel_category_id]) {
        ratesByCategory[rate.hotel_category_id] = [];
      }
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
                ${allRates
                  .map(
                    (r) => `
                  <div class="bg-orange-50 p-2 rounded-lg text-center border border-orange-200">
                    <div class="text-xs text-gray-600">${r.label}</div>
                    <div class="font-bold text-teal-700 text-base">₱${Number(r.value).toLocaleString()}</div>
                  </div>
                `,
                  )
                  .join("")}
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
                ${extraNightRates
                  .map(
                    (r) => `
                  <div class="bg-yellow-100 p-2 rounded-lg text-center border border-yellow-200">
                    <div class="text-xs text-gray-600">${r.label}</div>
                    <div class="font-bold text-orange-600 text-base">₱${Number(r.value).toLocaleString()}</div>
                  </div>
                `,
                  )
                  .join("")}
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
                      ${
                        hotel.image_url
                          ? `
                        <div class="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <img src="${hotel.image_url}" class="w-full h-full object-cover">
                        </div>
                      `
                          : `
                        <div class="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                          <i class="fas fa-hotel text-gray-400 text-2xl"></i>
                        </div>
                      `
                      }
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
  // RENDER OPTIONAL TOURS SECTION
  // ============================================
  renderOptionalToursSection(pkg) {
    if (!pkg.optional_tours || pkg.optional_tours.length === 0) return "";

    return `
      <div class="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl border-2 border-purple-200 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-xl font-bold text-purple-700 flex items-center gap-2">
            <i class="fas fa-compass"></i> Optional Tours
          </h4>
          <span class="bg-purple-700 text-white px-3 py-1 rounded-full text-xs font-bold">
            ${pkg.optional_tours.length} Tours Available
          </span>
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

              return `
              <div class="bg-white rounded-xl overflow-hidden border-2 border-purple-100 hover:shadow-lg transition-all">
                <div class="bg-gradient-to-r from-purple-600 to-purple-800 p-3">
                  <h5 class="font-bold text-white text-lg">${this.escapeHtml(tour.name)}</h5>
                </div>
                <div class="p-4">
                  ${tour.description ? `<p class="text-sm text-gray-600 mb-3">${this.escapeHtml(tour.description)}</p>` : ""}
                  ${
                    rateItems.length
                      ? `
                    <div class="bg-purple-50 rounded-lg p-3">
                      <p class="text-xs font-semibold text-purple-600 mb-2"><i class="fas fa-tag"></i> Rates:</p>
                      <div class="grid grid-cols-2 gap-2 text-xs">
                        ${rateItems
                          .map(
                            (r) => `
                          <div class="bg-white p-1.5 rounded text-center">
                            <span class="text-gray-600">${r.label}:</span>
                            <span class="font-bold text-purple-700 block">₱${Number(r.value).toLocaleString()}</span>
                          </div>
                        `,
                          )
                          .join("")}
                      </div>
                    </div>
                  `
                      : '<p class="text-xs text-gray-400">Contact us for rates</p>'
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

  // ============================================
  // OPEN BOOKING MODAL
  // ============================================
  async openBookingModal(packageName, packageId) {
    console.log("Opening booking modal for:", packageName);
    this.currentPackage = packageName;
    this.currentPackageId = packageId;

    const destination = this.destinations.find((d) =>
      d.destination_packages?.some((p) => p.id == packageId),
    );
    if (!destination) return alert("Package not found");

    const pkg = destination.destination_packages?.find(
      (p) => p.id == packageId,
    );
    if (!pkg) return alert("Package not found");

    const existingModal = document.getElementById("bookingModal");
    if (existingModal) existingModal.remove();

    const today = new Date().toISOString().split("T")[0];

    const modal = document.createElement("div");
    modal.id = "bookingModal";
    modal.className =
      "fixed inset-0 bg-black/80 flex items-center justify-center z-[999999] overflow-y-auto p-4";
    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="bg-gradient-to-r from-teal-700 to-orange-600 text-white p-5 rounded-t-2xl sticky top-0">
          <div class="flex justify-between">
            <div>
              <h2 class="text-2xl font-bold">${this.escapeHtml(destination.name)}</h2>
              <p>${this.escapeHtml(pkg.package_name)}</p>
            </div>
            <button onclick="window.destinationsManager.closeBookingModal()" class="text-2xl">&times;</button>
          </div>
        </div>
        <div class="p-6">
          <div class="bg-gray-50 p-4 rounded-lg mb-6">
            <p><span class="font-semibold">Package Code:</span> ${this.escapeHtml(pkg.package_code || "N/A")}</p>
            <p><span class="font-semibold">Category:</span> ${this.escapeHtml(pkg.tour_category || "Standard")}</p>
          </div>
          
          <h3 class="text-xl font-bold text-teal-700 mb-4">Travelers Information</h3>
          <div class="grid md:grid-cols-2 gap-4">
            <div><input type="text" id="fullName" class="w-full p-3 border rounded-lg" placeholder="Full Name *" required></div>
            <div><input type="email" id="email" class="w-full p-3 border rounded-lg" placeholder="Email *" required></div>
            <div><input type="tel" id="phone" class="w-full p-3 border rounded-lg" placeholder="Phone *" required></div>
            <div><input type="date" id="travelDate" min="${today}" class="w-full p-3 border rounded-lg" required></div>
          </div>
          
          <div class="mt-4">
            <select id="paxCount" class="w-full p-3 border rounded-lg">
              <option value="1">1 Traveler</option>
              <option value="2">2 Travelers</option>
              <option value="3">3 Travelers</option>
              <option value="4">4 Travelers</option>
              <option value="5">5 Travelers</option>
              <option value="6">6 Travelers</option>
            </select>
          </div>
          
          <div class="mt-4">
            <textarea id="requests" rows="2" class="w-full p-3 border rounded-lg" placeholder="Special requests (optional)"></textarea>
          </div>
          
          <div class="mt-6 flex gap-3 bg-gray-50 p-4 rounded-lg">
            <input type="checkbox" id="terms" class="mt-1">
            <label>I agree to the terms and conditions</label>
          </div>
          
          <div class="flex gap-4 mt-6">
            <button onclick="window.destinationsManager.closeBookingModal()" class="flex-1 py-3 bg-gray-200 rounded-lg">Cancel</button>
            <button onclick="window.destinationsManager.submitBooking()" class="flex-1 py-3 bg-gradient-to-r from-teal-600 to-orange-600 text-white rounded-lg font-semibold">Confirm Booking</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) this.closeBookingModal();
    });
  }

  async submitBooking() {
    const fullName = document.getElementById("fullName")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const phone = document.getElementById("phone")?.value.trim();
    const travelDate = document.getElementById("travelDate")?.value;
    const paxCount = document.getElementById("paxCount")?.value;
    const requests = document.getElementById("requests")?.value.trim();
    const terms = document.getElementById("terms")?.checked;

    if (!fullName || !email || !phone || !travelDate || !terms) {
      alert("Please fill all fields and agree to terms");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email address");
      return;
    }

    const bookingData = {
      booking_reference: `SNS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      package_id: this.currentPackageId,
      package_Name: this.currentPackage,
      client_name: fullName,
      client_email: email,
      client_mobile: phone,
      travel_dates: [travelDate],
      pax_count: parseInt(paxCount),
      special_requests: requests || null,
      status: "pending",
      payment_status: "unpaid",
      created_at: new Date().toISOString(),
    };

    const btn = document.querySelector("#bookingModal button:last-child");
    const original = btn?.innerHTML;
    if (btn) {
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
      btn.disabled = true;
    }

    try {
      const { error } = await window.sns_supabase_client
        .from("b2b_bookings")
        .insert([bookingData]);
      if (error) throw error;
      alert(
        `✅ Booking Confirmed!\nReference: ${bookingData.booking_reference}\nWe will contact you within 24 hours.`,
      );
      this.closeBookingModal();
    } catch (error) {
      console.error("Booking error:", error);
      alert("Booking failed: " + error.message);
      if (btn) {
        btn.innerHTML = original;
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

  prevCarouselImage() {
    if (!this.images?.length) return;
    this.currentImageIndex =
      (this.currentImageIndex - 1 + this.images.length) % this.images.length;
    this.updateCarouselImage();
  }

  nextCarouselImage() {
    if (!this.images?.length) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
    this.updateCarouselImage();
  }

  goToCarouselImage(i) {
    if (!this.images?.length || i < 0 || i >= this.images.length) return;
    this.currentImageIndex = i;
    this.updateCarouselImage();
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
  }

  renderDestinationOnly(dest) {
    if (!this.detailContent) return;
    this.detailContent.innerHTML = `
      <div class="max-w-4xl mx-auto px-4 py-8">
        <div class="bg-white rounded-xl p-8 text-center">
          <i class="fas fa-clock text-5xl text-amber-500 mb-4"></i>
          <h2 class="text-2xl font-bold text-amber-800">Coming Soon!</h2>
          <p class="mt-2">Packages for ${this.escapeHtml(dest.name)} are being prepared.</p>
          <p class="text-sm text-gray-500 mt-1">Please check back later or contact us for inquiries.</p>
          <button onclick="window.destinationsManager.closeModal()" class="mt-6 px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition">Close</button>
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
      this.errorMsg.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">${this.escapeHtml(msg)}</div>`;
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
      this.loadDestinations();
    }, 30000);
  }

  refreshData() {
    console.log("🔄 Manual refresh...");
    this.loadDestinations();
  }
}

console.log("✅ tours.js loaded - FINAL COMPLETE VERSION");
