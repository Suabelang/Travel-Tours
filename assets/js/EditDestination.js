// Edit Destination Module - Full CRUD Operations
const EditDestination = {
  edit: function (type, id) {
    switch (type) {
      case "destination":
        this.editDestination(id);
        break;
      case "package":
        this.editPackage(id);
        break;
      case "hotel":
        this.editHotel(id);
        break;
      case "hotel-category":
        this.editHotelCategory(id);
        break;
      case "package-rate":
        this.editPackageRate(id);
        break;
      case "inclusion":
        this.editInclusion(id);
        break;
      case "exclusion":
        this.editExclusion(id);
        break;
      case "itinerary":
        this.editItinerary(id);
        break;
      case "optional-tour":
        this.editOptionalTour(id);
        break;
      default:
        console.warn("Unknown edit type:", type);
    }
  },

  // ==================== EDIT DESTINATION ====================
  async editDestination(id) {
    try {
      const result = await SupabaseService.query("destinations", {
        eq: { column: "id", value: id },
      });

      if (!result.success || !result.data || result.data.length === 0) {
        alert("Destination not found");
        return;
      }

      const destination = result.data[0];

      // Fetch images
      const imagesResult = await SupabaseService.query("destination_images", {
        eq: { column: "destination_id", value: id },
      });
      destination.images = imagesResult.success ? imagesResult.data : [];

      // Fetch packages
      const packagesResult = await SupabaseService.query(
        "destination_packages",
        {
          eq: { column: "destination_id", value: id },
        },
      );

      const packages = packagesResult.success ? packagesResult.data : [];
      for (let pkg of packages) {
        const ratesResult = await SupabaseService.query("package_hotel_rates", {
          eq: { column: "package_id", value: pkg.id },
        });
        pkg.rates = ratesResult.success ? ratesResult.data : [];

        const inclusionsResult = await SupabaseService.query(
          "package_inclusions",
          {
            eq: { column: "package_id", value: pkg.id },
            order: { column: "display_order", ascending: true },
          },
        );
        pkg.inclusions = inclusionsResult.success ? inclusionsResult.data : [];

        const exclusionsResult = await SupabaseService.query(
          "package_exclusions",
          {
            eq: { column: "package_id", value: pkg.id },
            order: { column: "display_order", ascending: true },
          },
        );
        pkg.exclusions = exclusionsResult.success ? exclusionsResult.data : [];

        const itinerariesResult = await SupabaseService.query(
          "package_itineraries",
          {
            eq: { column: "package_id", value: pkg.id },
            order: { column: "day_number", ascending: true },
          },
        );
        pkg.itineraries = itinerariesResult.success
          ? itinerariesResult.data
          : [];
      }
      destination.packages = packages;

      // Fetch hotel categories
      const categoriesResult = await SupabaseService.query("hotel_categories", {
        eq: { column: "destination_id", value: id },
        order: { column: "display_order", ascending: true },
      });
      const hotelCategories = categoriesResult.success
        ? categoriesResult.data
        : [];

      for (let cat of hotelCategories) {
        const hotelsResult = await SupabaseService.query("hotels", {
          eq: { column: "category_id", value: cat.id },
        });
        cat.hotels = hotelsResult.success ? hotelsResult.data : [];
      }
      destination.hotelCategories = hotelCategories;

      // Build hotels array
      destination.hotels = [];
      for (let cat of hotelCategories) {
        for (let hotel of cat.hotels) {
          destination.hotels.push({
            ...hotel,
            category_id: cat.id,
            category_name: cat.category_name,
          });
        }
      }

      // Fetch optional tours
      const optionalToursResult = await SupabaseService.query(
        "optional_tour_categories",
        {
          order: { column: "display_order", ascending: true },
        },
      );
      const optionalTours = optionalToursResult.success
        ? optionalToursResult.data
        : [];

      for (let tour of optionalTours) {
        const ratesResult = await SupabaseService.query("optional_tour_rates", {
          eq: { column: "tour_id", value: tour.id },
        });
        tour.rates = ratesResult.success ? ratesResult.data : [];
      }
      destination.optionalTours = optionalTours;

      if (typeof CreateDestination !== "undefined") {
        if (window.toursToDelete) {
          window.toursToDelete = [];
        }
        CreateDestination.showDestinationModal(destination);
      } else {
        alert("CreateDestination module not loaded");
      }
    } catch (error) {
      if (typeof Config !== "undefined") {
        Config.showToast(
          "Error loading destination data: " + error.message,
          "error",
        );
      } else {
        alert("Error loading destination data: " + error.message);
      }
    }
  },

  // ==================== EDIT PACKAGE ====================
  async editPackage(id) {
    try {
      const result = await SupabaseService.query("destination_packages", {
        eq: { column: "id", value: id },
      });

      if (!result.success || !result.data || result.data.length === 0) {
        alert("Package not found");
        return;
      }

      const pkg = result.data[0];

      // Fetch related data
      const [rates, inclusions, exclusions, itineraries] = await Promise.all([
        SupabaseService.query("package_hotel_rates", {
          eq: { column: "package_id", value: id },
        }),
        SupabaseService.query("package_inclusions", {
          eq: { column: "package_id", value: id },
        }),
        SupabaseService.query("package_exclusions", {
          eq: { column: "package_id", value: id },
        }),
        SupabaseService.query("package_itineraries", {
          eq: { column: "package_id", value: id },
        }),
      ]);

      pkg.rates = rates.success ? rates.data : [];
      pkg.inclusions = inclusions.success ? inclusions.data : [];
      pkg.exclusions = exclusions.success ? exclusions.data : [];
      pkg.itineraries = itineraries.success ? itineraries.data : [];

      // Fetch destination for context
      const destResult = await SupabaseService.query("destinations", {
        eq: { column: "id", value: pkg.destination_id },
      });
      pkg.destination = destResult.success ? destResult.data[0] : null;

      if (typeof CreateDestination !== "undefined") {
        // Show package edit modal
        this.showPackageEditModal(pkg);
      }
    } catch (error) {
      console.warn("Error editing package:", error);
      Config.showToast("Error loading package data", "error");
    }
  },

  // ==================== EDIT HOTEL ====================
  async editHotel(id) {
    try {
      const result = await SupabaseService.query("hotels", {
        eq: { column: "id", value: id },
      });

      if (!result.success || !result.data || result.data.length === 0) {
        alert("Hotel not found");
        return;
      }

      const hotel = result.data[0];

      // Fetch categories for dropdown
      const categoriesResult = await SupabaseService.query("hotel_categories", {
        select: "id, category_name",
      });
      hotel.categories = categoriesResult.success ? categoriesResult.data : [];

      if (typeof CreateDestination !== "undefined") {
        this.showHotelEditModal(hotel);
      }
    } catch (error) {
      console.warn("Error editing hotel:", error);
      Config.showToast("Error loading hotel data", "error");
    }
  },

  // ==================== EDIT HOTEL CATEGORY ====================
  async editHotelCategory(id) {
    try {
      const result = await SupabaseService.query("hotel_categories", {
        eq: { column: "id", value: id },
      });

      if (!result.success || !result.data || result.data.length === 0) {
        alert("Hotel category not found");
        return;
      }

      const category = result.data[0];

      // Fetch hotels in this category
      const hotelsResult = await SupabaseService.query("hotels", {
        eq: { column: "category_id", value: id },
      });
      category.hotels = hotelsResult.success ? hotelsResult.data : [];

      if (typeof CreateDestination !== "undefined") {
        this.showHotelCategoryEditModal(category);
      }
    } catch (error) {
      console.warn("Error editing hotel category:", error);
      Config.showToast("Error loading hotel category data", "error");
    }
  },

  // ==================== EDIT PACKAGE RATE ====================
  async editPackageRate(id) {
    try {
      const result = await SupabaseService.query("package_hotel_rates", {
        eq: { column: "id", value: id },
      });

      if (!result.success || !result.data || result.data.length === 0) {
        alert("Package rate not found");
        return;
      }

      const rate = result.data[0];

      // Fetch package and category info
      const [pkgResult, categoryResult] = await Promise.all([
        SupabaseService.query("destination_packages", {
          eq: { column: "id", value: rate.package_id },
        }),
        SupabaseService.query("hotel_categories", {
          eq: { column: "id", value: rate.hotel_category_id },
        }),
      ]);

      rate.package = pkgResult.success ? pkgResult.data[0] : null;
      rate.category = categoryResult.success ? categoryResult.data[0] : null;

      if (typeof CreateDestination !== "undefined") {
        this.showPackageRateEditModal(rate);
      }
    } catch (error) {
      console.warn("Error editing package rate:", error);
      Config.showToast("Error loading package rate data", "error");
    }
  },

  // ==================== EDIT INCLUSION ====================
  async editInclusion(id) {
    try {
      const result = await SupabaseService.query("package_inclusions", {
        eq: { column: "id", value: id },
      });

      if (!result.success || !result.data || result.data.length === 0) {
        alert("Inclusion not found");
        return;
      }

      const inclusion = result.data[0];
      this.showInclusionEditModal(inclusion);
    } catch (error) {
      console.warn("Error editing inclusion:", error);
      Config.showToast("Error loading inclusion data", "error");
    }
  },

  // ==================== EDIT EXCLUSION ====================
  async editExclusion(id) {
    try {
      const result = await SupabaseService.query("package_exclusions", {
        eq: { column: "id", value: id },
      });

      if (!result.success || !result.data || result.data.length === 0) {
        alert("Exclusion not found");
        return;
      }

      const exclusion = result.data[0];
      this.showExclusionEditModal(exclusion);
    } catch (error) {
      console.warn("Error editing exclusion:", error);
      Config.showToast("Error loading exclusion data", "error");
    }
  },

  // ==================== EDIT ITINERARY ====================
  async editItinerary(id) {
    try {
      const result = await SupabaseService.query("package_itineraries", {
        eq: { column: "id", value: id },
      });

      if (!result.success || !result.data || result.data.length === 0) {
        alert("Itinerary not found");
        return;
      }

      const itinerary = result.data[0];
      this.showItineraryEditModal(itinerary);
    } catch (error) {
      console.warn("Error editing itinerary:", error);
      Config.showToast("Error loading itinerary data", "error");
    }
  },

  // ==================== EDIT OPTIONAL TOUR ====================
  async editOptionalTour(id) {
    try {
      const result = await SupabaseService.query("optional_tour_categories", {
        eq: { column: "id", value: id },
      });

      if (!result.success || !result.data || result.data.length === 0) {
        alert("Optional tour not found");
        return;
      }

      const tour = result.data[0];

      // Fetch rates for this tour
      const ratesResult = await SupabaseService.query("optional_tour_rates", {
        eq: { column: "tour_id", value: id },
      });
      tour.rates = ratesResult.success ? ratesResult.data : [];

      this.showOptionalTourEditModal(tour);
    } catch (error) {
      console.warn("Error editing optional tour:", error);
      Config.showToast("Error loading tour data", "error");
    }
  },

  // ==================== DELETE OPERATIONS ====================
  async delete(type, id) {
    if (
      !confirm(
        `Are you sure you want to delete this ${type}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    let table = "";
    switch (type) {
      case "destination":
        table = "destinations";
        break;
      case "package":
        table = "destination_packages";
        break;
      case "hotel":
        table = "hotels";
        break;
      case "hotel-category":
        table = "hotel_categories";
        break;
      case "package-rate":
        table = "package_hotel_rates";
        break;
      case "inclusion":
        table = "package_inclusions";
        break;
      case "exclusion":
        table = "package_exclusions";
        break;
      case "itinerary":
        table = "package_itineraries";
        break;
      case "optional-tour":
        // First delete related rates
        await SupabaseService.delete("optional_tour_rates", { tour_id: id });
        table = "optional_tour_categories";
        break;
      default:
        alert("Invalid type");
        return;
    }

    const result = await SupabaseService.delete(table, id);

    if (result.success) {
      Config.showToast(`${type} deleted successfully!`, "success");
      if (typeof Destinations !== "undefined") {
        Destinations.loadDestinations();
      }
    } else {
      Config.showToast(`Error deleting: ${result.error}`, "error");
    }
  },

  // ==================== MODAL FUNCTIONS (Placeholders) ====================
  showPackageEditModal: function (pkg) {
    alert(`Edit package: ${pkg.package_name}\n\nThis feature is coming soon!`);
  },

  showHotelEditModal: function (hotel) {
    alert(`Edit hotel: ${hotel.name}\n\nThis feature is coming soon!`);
  },

  showHotelCategoryEditModal: function (category) {
    alert(
      `Edit hotel category: ${category.category_name}\n\nThis feature is coming soon!`,
    );
  },

  showPackageRateEditModal: function (rate) {
    alert(
      `Edit rate for: ${rate.package?.package_name || "Package"}\n\nThis feature is coming soon!`,
    );
  },

  showInclusionEditModal: function (inclusion) {
    alert(
      `Edit inclusion: ${inclusion.inclusion_text}\n\nThis feature is coming soon!`,
    );
  },

  showExclusionEditModal: function (exclusion) {
    alert(
      `Edit exclusion: ${exclusion.exclusion_text}\n\nThis feature is coming soon!`,
    );
  },

  showItineraryEditModal: function (itinerary) {
    alert(
      `Edit itinerary day ${itinerary.day_number}\n\nThis feature is coming soon!`,
    );
  },

  showOptionalTourEditModal: function (tour) {
    alert(`Edit optional tour: ${tour.name}\n\nThis feature is coming soon!`);
  },

  // ==================== UTILITY ====================
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
