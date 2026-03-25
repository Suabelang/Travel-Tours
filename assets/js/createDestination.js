// Create Destination - COMPLETE WORKING VERSION
const CreateDestination = {
  modalContainer: null,
  currentSaveFunction: null,

  init: function () {
    if (!document.getElementById("modal-container")) {
      this.modalContainer = document.createElement("div");
      this.modalContainer.id = "modal-container";
      document.body.appendChild(this.modalContainer);
      console.log("✅ Modal container created");
    }
  },

  showModal: function (title, content, onSaveFunction) {
    this.init();
    this.currentSaveFunction = onSaveFunction;

    const modalHtml = `
            <div class="fixed inset-0 z-50 overflow-y-auto">
                <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    <div class="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity backdrop-blur-sm" onclick="CreateDestination.closeModal()"></div>
                    <div class="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
                        <div class="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                            <div class="flex items-center justify-between">
                                <h3 class="text-lg font-semibold text-white">
                                    <i class="fas fa-plus-circle mr-2"></i>${title}
                                </h3>
                                <button onclick="CreateDestination.closeModal()" class="text-white hover:text-primary-100">
                                    <i class="fas fa-times text-xl"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="px-6 py-4 max-h-[70vh] overflow-y-auto bg-gray-50" id="modal-content">
                            ${content}
                        </div>

                        <div class="bg-white px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                            <button onclick="CreateDestination.closeModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onclick="CreateDestination.executeSave()" class="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 border border-transparent rounded-lg text-sm font-medium text-white hover:from-primary-700 hover:to-primary-800 shadow-md hover:shadow-lg">
                                <i class="fas fa-save mr-2"></i>Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.getElementById("modal-container").innerHTML = modalHtml;
  },

  executeSave: function () {
    if (this.currentSaveFunction) {
      this.currentSaveFunction();
    } else {
      console.error("No save function defined");
    }
  },

  closeModal: function () {
    const container = document.getElementById("modal-container");
    if (container) container.innerHTML = "";
    this.currentSaveFunction = null;

    if (window.toursToDelete) {
      window.toursToDelete = [];
    }
  },

  showDestinationModal: async function (destination) {
    const isEdit = !!destination;
    const title = isEdit
      ? "Edit Destination Package"
      : "Create New Destination Package";
    console.log("Opening modal:", title);

    if (window.toursToDelete) {
      window.toursToDelete = [];
    }

    let destinationImages = [];
    let destinationPackages = [];
    let destinationHotelCategories = [];
    let destinationHotels = [];
    let destinationPackageRates = [];
    let destinationInclusions = [];
    let destinationExclusions = [];
    let destinationItineraries = [];
    let destinationOptionalTours = [];
    let packageOptionalTours = [];

    if (isEdit && destination && destination.id) {
      console.log(
        "Loading destination data for edit. Destination ID:",
        destination.id,
      );

      if (destination.images) destinationImages = destination.images;
      if (destination.packages) destinationPackages = destination.packages;
      if (destination.hotelCategories)
        destinationHotelCategories = destination.hotelCategories;
      if (destination.hotels) destinationHotels = destination.hotels;

      // Load optional tours for THIS destination ONLY
      console.log(
        `Loading optional tours for destination ID: ${destination.id}`,
      );

      const toursResult = await SupabaseService.query(
        "optional_tour_categories",
        {
          eq: { column: "destination_id", value: destination.id },
          orderBy: { column: "display_order", ascending: true },
        },
      );

      if (toursResult.success) {
        destinationOptionalTours = toursResult.data;
        console.log(
          `✅ Loaded ${destinationOptionalTours.length} optional tours for destination ${destination.id}`,
        );

        // Load rates for each optional tour
        for (let tour of destinationOptionalTours) {
          const ratesResult = await SupabaseService.query(
            "optional_tour_rates",
            {
              eq: { column: "tour_id", value: tour.id },
            },
          );
          if (
            ratesResult.success &&
            ratesResult.data &&
            ratesResult.data.length > 0
          ) {
            tour.rates = ratesResult.data[0];
            console.log(`✅ Loaded rates for tour: ${tour.name}`);
          } else {
            tour.rates = null;
            console.log(`⚠️ No rates found for tour: ${tour.name}`);
          }
        }
      } else {
        console.error("Failed to load optional tours:", toursResult.error);
      }

      // Load package-optional tour links
      if (destinationPackages && destinationPackages.length > 0) {
        console.log(
          `Found ${destinationPackages.length} packages to load links for`,
        );

        for (let pkg of destinationPackages) {
          if (pkg.id) {
            const linksResult = await SupabaseService.query(
              "package_optional_tours",
              {
                eq: { column: "package_id", value: pkg.id },
              },
            );
            if (linksResult.success && linksResult.data) {
              packageOptionalTours.push(...linksResult.data);
              console.log(
                `  → Found ${linksResult.data.length} links for package ${pkg.id}`,
              );
            }
          }
        }
        console.log(
          `Total package-optional tour links loaded: ${packageOptionalTours.length}`,
        );
      }

      // Process other package data
      if (destinationPackages) {
        for (let pkg of destinationPackages) {
          if (pkg.rates)
            destinationPackageRates = [
              ...destinationPackageRates,
              ...pkg.rates,
            ];
          if (pkg.inclusions)
            destinationInclusions = [
              ...destinationInclusions,
              ...pkg.inclusions,
            ];
          if (pkg.exclusions)
            destinationExclusions = [
              ...destinationExclusions,
              ...pkg.exclusions,
            ];
          if (pkg.itineraries)
            destinationItineraries = [
              ...destinationItineraries,
              ...pkg.itineraries,
            ];
        }
      }
    } else {
      console.log("Creating new destination");
      destinationOptionalTours = [];
    }

    const content = this.generateModalContent(destination, isEdit, {
      destinationImages,
      destinationPackages,
      destinationHotelCategories,
      destinationHotels,
      destinationPackageRates,
      destinationInclusions,
      destinationExclusions,
      destinationItineraries,
      destinationOptionalTours,
      packageOptionalTours,
    });

    const saveFunction = async () => {
      await this.saveDestinationData(isEdit, destination);
    };

    this.showModal(title, content, saveFunction);
  },

  deleteOptionalTour: function (tourId, tourName, tourSection) {
    if (!confirm(`⚠️ Delete "${tourName}"? This cannot be undone!`)) return;

    if (tourId && tourId !== "new" && tourId !== null && !isNaN(tourId)) {
      if (!window.toursToDelete) window.toursToDelete = [];
      if (!window.toursToDelete.includes(tourId)) {
        window.toursToDelete.push(tourId);
        console.log(`Tour "${tourName}" (ID: ${tourId}) marked for deletion`);
      }
    }

    if (tourSection) tourSection.remove();
  },

  deleteTourRate: function (rateContainer) {
    if (confirm("Remove this rate?")) rateContainer.remove();
  },

  saveDestinationData: async function (isEdit, destination) {
    console.log("=== START SAVING DESTINATION DATA ===");
    console.log("isEdit:", isEdit);

    const form = document.getElementById("entity-form");
    if (!form) {
      alert("Form not found");
      return;
    }

    const formData = new FormData(form);

    try {
      // STEP 1: SAVE DESTINATION
      const destinationData = {
        name: formData.get("destination_name"),
        description: formData.get("destination_description"),
        airport_name: formData.get("airport_name") || null,
        country: formData.get("country") || "Philippines",
        is_active: formData.get("destination_is_active") === "on",
        updated_at: new Date().toISOString(),
      };

      if (!isEdit) destinationData.created_at = new Date().toISOString();

      let destinationResult;
      let destinationId;

      if (isEdit) {
        destinationResult = await SupabaseService.update(
          "destinations",
          destination.id,
          destinationData,
        );
        destinationId = destination.id;
      } else {
        destinationResult = await SupabaseService.insert(
          "destinations",
          destinationData,
        );
        if (!destinationResult.success || !destinationResult.data) {
          alert("Error creating destination");
          return;
        }
        destinationId = destinationResult.data[0].id;
      }

      if (!destinationResult.success) {
        alert("Error saving destination: " + destinationResult.error);
        return;
      }

      console.log("✅ Destination saved ID:", destinationId);

      // STEP 2: SAVE IMAGES
      if (isEdit) {
        await SupabaseService.delete("destination_images", {
          destination_id: destinationId,
        });
      }

      const imageContainers = document.querySelectorAll(
        "#images-container > .flex",
      );
      for (let i = 0; i < imageContainers.length; i++) {
        const container = imageContainers[i];
        const urlInput = container.querySelector('input[name="image_url[]"]');
        if (urlInput && urlInput.value && urlInput.value.trim()) {
          await SupabaseService.insert("destination_images", {
            destination_id: destinationId,
            url: urlInput.value.trim(),
            alt_text: "",
            is_primary: i === 0,
            created_at: new Date().toISOString(),
          });
        }
      }
      console.log("✅ Images saved");

      // STEP 3: SAVE HOTEL CATEGORIES
      const categoryIdMap = new Map();
      const categorySections = document.querySelectorAll(
        "#hotel-categories-container > .bg-purple-50",
      );

      let existingCategories = [];
      const existingResult = await SupabaseService.query("hotel_categories", {
        eq: { column: "destination_id", value: destinationId },
      });
      if (existingResult.success) {
        existingCategories = existingResult.data;
        console.log(`Found ${existingCategories.length} existing categories`);
      }

      const keptCategoryIds = [];

      for (let i = 0; i < categorySections.length; i++) {
        const section = categorySections[i];
        const nameInput = section.querySelector(
          'input[name="hotel_category_name[]"]',
        );

        if (nameInput && nameInput.value.trim()) {
          const orderInput = section.querySelector(
            'input[name="hotel_category_display_order[]"]',
          );
          const breakfastNoteInput = section.querySelector(
            'input[name="hotel_category_breakfast_note[]"]',
          );
          const hasBreakfastCheck = section.querySelector(
            'input[name="hotel_category_has_breakfast[]"]',
          );

          const existingIdAttr = section.getAttribute("data-category-id");
          let existingId = null;
          if (
            existingIdAttr &&
            existingIdAttr !== "" &&
            !isNaN(parseInt(existingIdAttr))
          ) {
            existingId = parseInt(existingIdAttr);
          }

          let categoryId = existingId;
          const categoryData = {
            destination_id: destinationId,
            category_name: nameInput.value.trim(),
            display_order: orderInput ? parseInt(orderInput.value) || 0 : 0,
            breakfast_note: breakfastNoteInput
              ? breakfastNoteInput.value
              : null,
            has_breakfast: hasBreakfastCheck ? hasBreakfastCheck.checked : true,
            updated_at: new Date().toISOString(),
          };

          if (categoryId) {
            await SupabaseService.update(
              "hotel_categories",
              categoryId,
              categoryData,
            );
            console.log(
              `✏️ Updated category: ${nameInput.value.trim()} (ID: ${categoryId})`,
            );
            keptCategoryIds.push(categoryId);
          } else {
            categoryData.created_at = new Date().toISOString();
            const result = await SupabaseService.insert(
              "hotel_categories",
              categoryData,
            );
            if (result.success && result.data && result.data[0]) {
              categoryId = result.data[0].id;
              section.setAttribute("data-category-id", categoryId);
              console.log(
                `➕ Created new category: ${nameInput.value.trim()} (ID: ${categoryId})`,
              );
              keptCategoryIds.push(categoryId);
            }
          }
          categoryIdMap.set(i, categoryId);
        }
      }

      const categoriesToDelete = existingCategories.filter(
        (cat) => !keptCategoryIds.includes(cat.id),
      );
      for (let cat of categoriesToDelete) {
        await SupabaseService.delete("hotels", { category_id: cat.id });
        await SupabaseService.delete("hotel_categories", cat.id);
        console.log(
          `🗑️ Deleted category: ${cat.category_name} (ID: ${cat.id})`,
        );
      }

      // STEP 4: SAVE HOTELS
      const hotelSections = document.querySelectorAll(
        "#hotels-container > .bg-amber-50",
      );

      let existingHotels = [];
      const hotelsResult = await SupabaseService.query("hotels", {});
      if (hotelsResult.success) {
        const categoryIds = keptCategoryIds;
        existingHotels = hotelsResult.data.filter((h) =>
          categoryIds.includes(h.category_id),
        );
      }

      const keptHotelIds = [];

      for (let i = 0; i < hotelSections.length; i++) {
        const section = hotelSections[i];
        const nameInput = section.querySelector('input[name="hotel_name[]"]');
        const categoryRefSelect = section.querySelector(
          'select[name="hotel_category_ref[]"]',
        );
        const existingId = section.getAttribute("data-hotel-id")
          ? parseInt(section.getAttribute("data-hotel-id"))
          : null;

        if (nameInput && nameInput.value.trim() && categoryRefSelect) {
          const categoryIndex = parseInt(categoryRefSelect.value);
          const categoryId = categoryIdMap.get(categoryIndex);

          if (categoryId) {
            const imageUrlInput = section.querySelector(
              'input[name="hotel_image_url[]"]',
            );
            const descriptionTextarea = section.querySelector(
              'textarea[name="hotel_description[]"]',
            );
            const notesTextarea = section.querySelector(
              'textarea[name="hotel_notes[]"]',
            );
            const isActiveCheck = section.querySelector(
              'input[name="hotel_is_active[]"]',
            );

            const hotelData = {
              category_id: categoryId,
              name: nameInput.value.trim(),
              image_url: imageUrlInput ? imageUrlInput.value || null : null,
              description: descriptionTextarea
                ? descriptionTextarea.value || null
                : null,
              notes: notesTextarea ? notesTextarea.value || null : null,
              is_active: isActiveCheck ? isActiveCheck.checked : true,
              updated_at: new Date().toISOString(),
            };

            if (existingId) {
              await SupabaseService.update("hotels", existingId, hotelData);
              console.log(
                `✏️ Updated hotel: ${nameInput.value.trim()} (ID: ${existingId})`,
              );
              keptHotelIds.push(existingId);
            } else {
              hotelData.created_at = new Date().toISOString();
              const result = await SupabaseService.insert("hotels", hotelData);
              if (result.success && result.data && result.data[0]) {
                section.setAttribute("data-hotel-id", result.data[0].id);
                console.log(`➕ Created new hotel: ${nameInput.value.trim()}`);
                keptHotelIds.push(result.data[0].id);
              }
            }
          }
        }
      }

      const hotelsToDelete = existingHotels.filter(
        (hotel) => !keptHotelIds.includes(hotel.id),
      );
      for (let hotel of hotelsToDelete) {
        await SupabaseService.delete("hotels", hotel.id);
        console.log(`🗑️ Deleted hotel: ${hotel.name} (ID: ${hotel.id})`);
      }

      // STEP 5: SAVE PACKAGES
      const packageSections = document.querySelectorAll(
        "#packages-container > .bg-blue-50",
      );
      console.log(`Found ${packageSections.length} packages in form`);

      let existingPackages = [];
      const packagesResult = await SupabaseService.query(
        "destination_packages",
        {
          eq: { column: "destination_id", value: destinationId },
        },
      );
      if (packagesResult.success) {
        existingPackages = packagesResult.data;
        console.log(`Found ${existingPackages.length} existing packages`);
      }

      const keptPackageIds = [];

      for (let pkgIdx = 0; pkgIdx < packageSections.length; pkgIdx++) {
        const section = packageSections[pkgIdx];
        const uniqueId = section.getAttribute("data-unique-id");
        const existingId = section.getAttribute("data-package-id")
          ? parseInt(section.getAttribute("data-package-id"))
          : null;

        const nameInput = section.querySelector('input[name="package_name[]"]');
        const codeInput = section.querySelector('input[name="package_code[]"]');
        const activeSelect = section.querySelector(
          'select[name="package_is_active[]"]',
        );
        const priceInput = section.querySelector(
          'input[name="package_base_price[]"]',
        );

        if (!nameInput || !nameInput.value.trim()) continue;

        let packageId = existingId;

        let packageCode = codeInput ? codeInput.value || null : null;
        if (packageCode && packageCode.length > 50) {
          packageCode = packageCode.substring(0, 47) + "...";
        }

        const packageData = {
          destination_id: destinationId,
          package_name: nameInput.value.trim(),
          package_code: packageCode,
          is_active: activeSelect ? activeSelect.value === "true" : true,
          base_price: priceInput ? parseFloat(priceInput.value) || 0 : 0,
          updated_at: new Date().toISOString(),
        };

        if (packageId) {
          await SupabaseService.update(
            "destination_packages",
            packageId,
            packageData,
          );
          console.log(
            `✏️ Updated package: ${nameInput.value.trim()} (ID: ${packageId})`,
          );
          keptPackageIds.push(packageId);
        } else {
          if (packageData.package_code) {
            const existingCodeCheck = await SupabaseService.query(
              "destination_packages",
              {
                eq: { column: "package_code", value: packageData.package_code },
              },
            );
            if (
              existingCodeCheck.success &&
              existingCodeCheck.data.length > 0
            ) {
              const shortSuffix = Date.now().toString().slice(-6);
              packageData.package_code =
                packageData.package_code.substring(0, 43) + "-" + shortSuffix;
            }
          }
          packageData.created_at = new Date().toISOString();
          const result = await SupabaseService.insert(
            "destination_packages",
            packageData,
          );
          if (result.success && result.data && result.data[0]) {
            packageId = result.data[0].id;
            section.setAttribute("data-package-id", packageId);
            console.log(
              `➕ Created new package: ${nameInput.value.trim()} (ID: ${packageId})`,
            );
            keptPackageIds.push(packageId);
          } else {
            console.error("Failed to insert package:", result.error);
            continue;
          }
        }

        if (packageId) {
          // SAVE PACKAGE HOTEL RATES - Delete all existing rates first
          await SupabaseService.delete("package_hotel_rates", {
            package_id: packageId,
          });
          console.log(`🗑️ Deleted existing rates for package ${packageId}`);

          // Get all rate sets
          const rateSets = section.querySelectorAll(
            ".border.border-blue-200.rounded-lg.p-4.bg-white",
          );
          console.log(
            `Processing ${rateSets.length} rate sets for package ${packageId}`,
          );

          let insertedCount = 0;

          for (let rateSet of rateSets) {
            const categorySelect = rateSet.querySelector(
              'select[name^="rate_hotel_category_"]',
            );
            const categoryIndex = categorySelect
              ? parseInt(categorySelect.value)
              : null;
            let hotelCategoryId = null;

            if (
              categoryIndex !== null &&
              !isNaN(categoryIndex) &&
              categoryIndex >= 0
            ) {
              hotelCategoryId = categoryIdMap.get(categoryIndex);
              console.log(
                `Rate set ${insertedCount + 1}: Category index ${categoryIndex} -> Category ID ${hotelCategoryId}`,
              );
            } else {
              console.log(
                `⚠️ Rate set ${insertedCount + 1}: No valid category selected, skipping`,
              );
              continue;
            }

            const rateData = {
              package_id: packageId,
              hotel_category_id: hotelCategoryId,
              season:
                this.getInputValue(rateSet, 'input[name^="rate_season_"]') ||
                "Regular",
              duration:
                this.getInputValue(rateSet, 'input[name^="rate_duration_"]') ||
                null,
              validity_date:
                this.getInputValue(rateSet, 'input[name^="rate_validity_"]') ||
                null,
              rate_solo: this.getInputNumber(
                rateSet,
                'input[name^="rate_solo_"]',
              ),
              rate_2pax: this.getInputNumber(
                rateSet,
                'input[name^="rate_2pax_"]',
              ),
              rate_3pax: this.getInputNumber(
                rateSet,
                'input[name^="rate_3pax_"]',
              ),
              rate_4pax: this.getInputNumber(
                rateSet,
                'input[name^="rate_4pax_"]',
              ),
              rate_5pax: this.getInputNumber(
                rateSet,
                'input[name^="rate_5pax_"]',
              ),
              rate_6pax: this.getInputNumber(
                rateSet,
                'input[name^="rate_6pax_"]',
              ),
              rate_7pax: this.getInputNumber(
                rateSet,
                'input[name^="rate_7pax_"]',
              ),
              rate_8pax: this.getInputNumber(
                rateSet,
                'input[name^="rate_8pax_"]',
              ),
              rate_9pax: this.getInputNumber(
                rateSet,
                'input[name^="rate_9pax_"]',
              ),
              rate_10pax: this.getInputNumber(
                rateSet,
                'input[name^="rate_10pax_"]',
              ),
              rate_11pax: this.getInputNumber(
                rateSet,
                'input[name^="rate_11pax_"]',
              ),
              rate_12pax: this.getInputNumber(
                rateSet,
                'input[name^="rate_12pax_"]',
              ),
              rate_child_no_breakfast: this.getInputNumber(
                rateSet,
                'input[name^="rate_child_no_breakfast_"]',
              ),
              extra_night_solo: this.getInputNumber(
                rateSet,
                'input[name^="extra_night_solo_"]',
              ),
              extra_night_2pax: this.getInputNumber(
                rateSet,
                'input[name^="extra_night_2pax_"]',
              ),
              extra_night_3pax: this.getInputNumber(
                rateSet,
                'input[name^="extra_night_3pax_"]',
              ),
              extra_night_4pax: this.getInputNumber(
                rateSet,
                'input[name^="extra_night_4pax_"]',
              ),
              extra_night_5pax: this.getInputNumber(
                rateSet,
                'input[name^="extra_night_5pax_"]',
              ),
              extra_night_6pax: this.getInputNumber(
                rateSet,
                'input[name^="extra_night_6pax_"]',
              ),
              extra_night_7pax: this.getInputNumber(
                rateSet,
                'input[name^="extra_night_7pax_"]',
              ),
              extra_night_8pax: this.getInputNumber(
                rateSet,
                'input[name^="extra_night_8pax_"]',
              ),
              extra_night_9pax: this.getInputNumber(
                rateSet,
                'input[name^="extra_night_9pax_"]',
              ),
              extra_night_10pax: this.getInputNumber(
                rateSet,
                'input[name^="extra_night_10pax_"]',
              ),
              extra_night_11pax: this.getInputNumber(
                rateSet,
                'input[name^="extra_night_11pax_"]',
              ),
              extra_night_12pax: this.getInputNumber(
                rateSet,
                'input[name^="extra_night_12pax_"]',
              ),
              extra_night_child_no_breakfast: this.getInputNumber(
                rateSet,
                'input[name^="extra_night_child_no_breakfast_"]',
              ),
              additional_info:
                this.getInputValue(
                  rateSet,
                  'textarea[name^="rate_additional_info_"]',
                ) || null,
              breakfast_included: this.getCheckboxValue(
                rateSet,
                'input[name^="rate_breakfast_included_"]',
              ),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            const result = await SupabaseService.insert(
              "package_hotel_rates",
              rateData,
            );
            if (result.success) {
              insertedCount++;
              console.log(
                `✅ Inserted rate set ${insertedCount} for package ${packageId}, category ${hotelCategoryId}`,
              );
            } else {
              console.error(`❌ Failed to insert rate set:`, result.error);
            }
          }

          console.log(
            `✅ Successfully saved ${insertedCount} rate sets for package ${packageId}`,
          );

          // SAVE PACKAGE INCLUSIONS
          let existingInclusions = [];
          const incResult = await SupabaseService.query("package_inclusions", {
            eq: { column: "package_id", value: packageId },
          });
          if (incResult.success) existingInclusions = incResult.data;

          const inclusionDiv = section.querySelector(
            `.inclusions-container-${uniqueId}`,
          );
          const currentInclusions = [];

          if (inclusionDiv) {
            const inclusionItems = inclusionDiv.querySelectorAll(".flex");
            for (let item of inclusionItems) {
              const textInput = item.querySelector(
                'input[name^="inclusion_text_"]',
              );
              if (textInput && textInput.value.trim()) {
                const orderInput = item.querySelector(
                  'input[name^="inclusion_order_"]',
                );
                const existingIncId = item.getAttribute("data-inclusion-id")
                  ? parseInt(item.getAttribute("data-inclusion-id"))
                  : null;
                currentInclusions.push({
                  id: existingIncId,
                  text: textInput.value.trim(),
                  order: orderInput ? parseInt(orderInput.value) || 0 : 0,
                  element: item,
                });
              }
            }
          }

          const keptInclusionIds = [];
          for (let inc of currentInclusions) {
            const incData = {
              package_id: packageId,
              inclusion_text: inc.text,
              display_order: inc.order,
            };

            if (inc.id) {
              await SupabaseService.update(
                "package_inclusions",
                inc.id,
                incData,
              );
              keptInclusionIds.push(inc.id);
            } else {
              incData.created_at = new Date().toISOString();
              const result = await SupabaseService.insert(
                "package_inclusions",
                incData,
              );
              if (result.success && result.data && result.data[0]) {
                inc.element.setAttribute(
                  "data-inclusion-id",
                  result.data[0].id,
                );
                keptInclusionIds.push(result.data[0].id);
              }
            }
          }

          const incToDelete = existingInclusions.filter(
            (inc) => !keptInclusionIds.includes(inc.id),
          );
          for (let inc of incToDelete) {
            await SupabaseService.delete("package_inclusions", inc.id);
          }
          console.log(`✅ Inclusions saved for package ${packageId}`);

          // SAVE PACKAGE EXCLUSIONS
          let existingExclusions = [];
          const excResult = await SupabaseService.query("package_exclusions", {
            eq: { column: "package_id", value: packageId },
          });
          if (excResult.success) existingExclusions = excResult.data;

          const exclusionDiv = section.querySelector(
            `.exclusions-container-${uniqueId}`,
          );
          const currentExclusions = [];

          if (exclusionDiv) {
            const exclusionItems = exclusionDiv.querySelectorAll(".flex");
            for (let item of exclusionItems) {
              const textInput = item.querySelector(
                'input[name^="exclusion_text_"]',
              );
              if (textInput && textInput.value.trim()) {
                const orderInput = item.querySelector(
                  'input[name^="exclusion_order_"]',
                );
                const existingExcId = item.getAttribute("data-exclusion-id")
                  ? parseInt(item.getAttribute("data-exclusion-id"))
                  : null;
                currentExclusions.push({
                  id: existingExcId,
                  text: textInput.value.trim(),
                  order: orderInput ? parseInt(orderInput.value) || 0 : 0,
                  element: item,
                });
              }
            }
          }

          const keptExclusionIds = [];
          for (let exc of currentExclusions) {
            const excData = {
              package_id: packageId,
              exclusion_text: exc.text,
              display_order: exc.order,
            };

            if (exc.id) {
              await SupabaseService.update(
                "package_exclusions",
                exc.id,
                excData,
              );
              keptExclusionIds.push(exc.id);
            } else {
              excData.created_at = new Date().toISOString();
              const result = await SupabaseService.insert(
                "package_exclusions",
                excData,
              );
              if (result.success && result.data && result.data[0]) {
                exc.element.setAttribute(
                  "data-exclusion-id",
                  result.data[0].id,
                );
                keptExclusionIds.push(result.data[0].id);
              }
            }
          }

          const excToDelete = existingExclusions.filter(
            (exc) => !keptExclusionIds.includes(exc.id),
          );
          for (let exc of excToDelete) {
            await SupabaseService.delete("package_exclusions", exc.id);
          }
          console.log(`✅ Exclusions saved for package ${packageId}`);

          // SAVE PACKAGE ITINERARIES
          let existingItineraries = [];
          const itiResult = await SupabaseService.query("package_itineraries", {
            eq: { column: "package_id", value: packageId },
          });
          if (itiResult.success) existingItineraries = itiResult.data;

          const itineraryDiv = section.querySelector(
            `.itineraries-container-${uniqueId}`,
          );
          const currentItineraries = [];

          if (itineraryDiv) {
            const itineraryItems = itineraryDiv.querySelectorAll(".border");
            for (let item of itineraryItems) {
              const dayInput = item.querySelector('input[name^="iti_day_"]');
              if (dayInput && dayInput.value) {
                const orderInput = item.querySelector(
                  'input[name^="iti_order_"]',
                );
                const titleInput = item.querySelector(
                  'input[name^="iti_title_"]',
                );
                const descTextarea = item.querySelector(
                  'textarea[name^="iti_description_"]',
                );
                const descriptionText = descTextarea ? descTextarea.value : "";
                const existingItiId = item.getAttribute("data-itinerary-id")
                  ? parseInt(item.getAttribute("data-itinerary-id"))
                  : null;

                currentItineraries.push({
                  id: existingItiId,
                  day: parseInt(dayInput.value),
                  order: orderInput ? parseInt(orderInput.value) || 0 : 0,
                  title: titleInput ? titleInput.value || null : null,
                  description: descriptionText
                    .split("\n")
                    .filter((l) => l.trim()),
                  element: item,
                });
              }
            }
          }

          const keptItineraryIds = [];
          for (let iti of currentItineraries) {
            const itiData = {
              package_id: packageId,
              day_number: iti.day,
              display_order: iti.order,
              day_title: iti.title,
              day_description: iti.description,
              updated_at: new Date().toISOString(),
            };

            if (iti.id) {
              await SupabaseService.update(
                "package_itineraries",
                iti.id,
                itiData,
              );
              keptItineraryIds.push(iti.id);
            } else {
              itiData.created_at = new Date().toISOString();
              const result = await SupabaseService.insert(
                "package_itineraries",
                itiData,
              );
              if (result.success && result.data && result.data[0]) {
                iti.element.setAttribute(
                  "data-itinerary-id",
                  result.data[0].id,
                );
                keptItineraryIds.push(result.data[0].id);
              }
            }
          }

          const itiToDelete = existingItineraries.filter(
            (iti) => !keptItineraryIds.includes(iti.id),
          );
          for (let iti of itiToDelete) {
            await SupabaseService.delete("package_itineraries", iti.id);
          }
          console.log(`✅ Itineraries saved for package ${packageId}`);

          // SAVE PACKAGE OPTIONAL TOURS
          const tourCheckboxes = section.querySelectorAll(
            `input[name^="package_optional_tours_${uniqueId}"]:checked`,
          );
          const selectedTourIds = Array.from(tourCheckboxes).map((cb) =>
            parseInt(cb.value),
          );

          await SupabaseService.delete("package_optional_tours", {
            package_id: packageId,
          });

          let displayOrder = 0;
          for (let tourId of selectedTourIds) {
            if (tourId && !isNaN(tourId)) {
              await SupabaseService.insert("package_optional_tours", {
                package_id: packageId,
                optional_tour_id: tourId,
                display_order: displayOrder++,
                created_at: new Date().toISOString(),
              });
              console.log(
                `✅ Linked optional tour ${tourId} to package ${packageId}`,
              );
            }
          }
        }
      }

      // Delete packages removed from form
      const packagesToDelete = existingPackages.filter(
        (pkg) => !keptPackageIds.includes(pkg.id),
      );
      for (let pkg of packagesToDelete) {
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
        await SupabaseService.delete("package_optional_tours", {
          package_id: pkg.id,
        });
        await SupabaseService.delete("destination_packages", pkg.id);
        console.log(`🗑️ Deleted package: ${pkg.package_name} (ID: ${pkg.id})`);
      }

      // STEP 6: DELETE MARKED OPTIONAL TOURS
      if (window.toursToDelete && window.toursToDelete.length > 0) {
        console.log("Deleting marked optional tours:", window.toursToDelete);
        for (let tourId of window.toursToDelete) {
          await SupabaseService.delete("optional_tour_rates", {
            tour_id: tourId,
          });
          await SupabaseService.delete("optional_tour_categories", tourId);
          await SupabaseService.delete("package_optional_tours", {
            optional_tour_id: tourId,
          });
        }
        window.toursToDelete = [];
      }

      // STEP 7: SAVE OPTIONAL TOURS
      const tourSections = document.querySelectorAll(
        "#optional-tours-container > .bg-pink-50",
      );
      console.log(
        `Processing ${tourSections.length} optional tours for destination ${destinationId}`,
      );

      let existingTours = [];
      const toursResult = await SupabaseService.query(
        "optional_tour_categories",
        {
          eq: { column: "destination_id", value: destinationId },
        },
      );
      if (toursResult.success) existingTours = toursResult.data;

      const keptTourIds = [];

      for (let tourSection of tourSections) {
        const nameInput = tourSection.querySelector(
          'input[name="tour_name[]"]',
        );
        const descInput = tourSection.querySelector(
          'textarea[name="tour_description[]"]',
        );
        const orderInput = tourSection.querySelector(
          'input[name="tour_display_order[]"]',
        );
        const activeCheck = tourSection.querySelector(
          'input[name="tour_is_active[]"]',
        );
        const existingTourId = tourSection.getAttribute("data-tour-id")
          ? parseInt(tourSection.getAttribute("data-tour-id"))
          : null;

        if (!nameInput || !nameInput.value.trim()) continue;

        let tourId = existingTourId;
        const tourData = {
          name: nameInput.value.trim(),
          description: descInput ? descInput.value || null : null,
          display_order: orderInput ? parseInt(orderInput.value) || 0 : 0,
          is_active: activeCheck ? activeCheck.checked : true,
          destination_id: destinationId,
          updated_at: new Date().toISOString(),
        };

        if (tourId) {
          await SupabaseService.update(
            "optional_tour_categories",
            tourId,
            tourData,
          );
          console.log(
            `✏️ Updated tour: ${nameInput.value.trim()} (ID: ${tourId}) for destination ${destinationId}`,
          );
          keptTourIds.push(tourId);
        } else {
          tourData.created_at = new Date().toISOString();
          const result = await SupabaseService.insert(
            "optional_tour_categories",
            tourData,
          );
          if (result.success && result.data && result.data[0]) {
            tourId = result.data[0].id;
            tourSection.setAttribute("data-tour-id", tourId);
            console.log(
              `➕ Created new tour: ${nameInput.value.trim()} (ID: ${tourId}) for destination ${destinationId}`,
            );
            keptTourIds.push(tourId);
          } else {
            console.error("Failed to insert optional tour:", result.error);
            continue;
          }
        }

        if (tourId) {
          const tourIdx =
            tourSection.getAttribute("data-tour-index") ||
            Array.from(tourSections).indexOf(tourSection);
          const rateContainers = tourSection.querySelectorAll(
            `.tour-rates-container-${tourIdx} .grid`,
          );

          await SupabaseService.delete("optional_tour_rates", {
            tour_id: tourId,
          });

          for (let rateContainer of rateContainers) {
            const rateData = {
              tour_id: tourId,
              rate_solo: this.getInputNumber(
                rateContainer,
                'input[name^="tour_rate_solo_"]',
              ),
              rate_2pax: this.getInputNumber(
                rateContainer,
                'input[name^="tour_rate_2pax_"]',
              ),
              rate_3pax: this.getInputNumber(
                rateContainer,
                'input[name^="tour_rate_3pax_"]',
              ),
              rate_4pax: this.getInputNumber(
                rateContainer,
                'input[name^="tour_rate_4pax_"]',
              ),
              rate_5pax: this.getInputNumber(
                rateContainer,
                'input[name^="tour_rate_5pax_"]',
              ),
              rate_6pax: this.getInputNumber(
                rateContainer,
                'input[name^="tour_rate_6pax_"]',
              ),
              rate_7pax: this.getInputNumber(
                rateContainer,
                'input[name^="tour_rate_7pax_"]',
              ),
              rate_8pax: this.getInputNumber(
                rateContainer,
                'input[name^="tour_rate_8pax_"]',
              ),
              rate_9pax: this.getInputNumber(
                rateContainer,
                'input[name^="tour_rate_9pax_"]',
              ),
              rate_10pax: this.getInputNumber(
                rateContainer,
                'input[name^="tour_rate_10pax_"]',
              ),
              rate_11pax: this.getInputNumber(
                rateContainer,
                'input[name^="tour_rate_11pax_"]',
              ),
              rate_12pax: this.getInputNumber(
                rateContainer,
                'input[name^="tour_rate_12pax_"]',
              ),
              rate_child_4_9: this.getInputNumber(
                rateContainer,
                'input[name^="tour_rate_child_"]',
              ),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            await SupabaseService.insert("optional_tour_rates", rateData);
          }
          console.log(`✅ Saved rates for tour ${tourId}`);
        }
      }

      const toursToDelete = existingTours.filter(
        (tour) => !keptTourIds.includes(tour.id),
      );
      for (let tour of toursToDelete) {
        await SupabaseService.delete("optional_tour_rates", {
          tour_id: tour.id,
        });
        await SupabaseService.delete("optional_tour_categories", tour.id);
        await SupabaseService.delete("package_optional_tours", {
          optional_tour_id: tour.id,
        });
        console.log(
          `🗑️ Deleted tour: ${tour.name} (ID: ${tour.id}) from destination ${destinationId}`,
        );
      }

      console.log("🎉 ALL DATA SAVED SUCCESSFULLY!");
      this.closeModal();
      if (typeof Destinations !== "undefined") Destinations.loadDestinations();
    } catch (error) {
      console.error("❌ ERROR:", error);
      alert("Error saving data: " + error.message);
    }
  },

  getInputValue: function (container, selector) {
    const input = container.querySelector(selector);
    return input ? input.value : null;
  },

  getInputNumber: function (container, selector) {
    const input = container.querySelector(selector);
    return input && input.value && input.value.trim() !== ""
      ? parseFloat(input.value)
      : null;
  },

  getCheckboxValue: function (container, selector) {
    const input = container.querySelector(selector);
    return input ? input.checked : false;
  },

  generateModalContent: function (destination, isEdit, data) {
    const dest = destination || {};
    const images = data.destinationImages || [];
    const packages = data.destinationPackages || [];
    const hotelCategories = data.destinationHotelCategories || [];
    const hotels = data.destinationHotels || [];
    const packageRates = data.destinationPackageRates || [];
    const inclusions = data.destinationInclusions || [];
    const exclusions = data.destinationExclusions || [];
    const itineraries = data.destinationItineraries || [];
    const destinationOptionalTours = data.destinationOptionalTours || [];
    const packageOptionalTours = data.packageOptionalTours || [];

    const packageFieldsHtml = this.generatePackageFields(
      packages,
      packageRates,
      inclusions,
      exclusions,
      itineraries,
      hotelCategories,
      destinationOptionalTours,
      packageOptionalTours,
    );

    const hasTours =
      destinationOptionalTours && destinationOptionalTours.length > 0;
    const toursWarningHtml =
      !hasTours && isEdit
        ? `
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div class="flex items-center">
                    <i class="fas fa-exclamation-triangle text-yellow-600 mr-3"></i>
                    <div>
                        <p class="text-sm text-yellow-800 font-medium">No optional tours found for this destination</p>
                        <p class="text-xs text-yellow-600">You can create optional tours for this destination in the "Optional Tours for this Destination" section below.</p>
                    </div>
                </div>
            </div>
        `
        : "";

    return `
            <form id="entity-form" class="space-y-6">
                <!-- Destination Information -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div class="flex items-center mb-4">
                        <div class="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                            <i class="fas fa-map-marker-alt text-primary-600"></i>
                        </div>
                        <h4 class="text-lg font-semibold text-gray-800">Destination Information</h4>
                    </div>
                    <div class="space-y-4">
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Destination Name <span class="text-red-500">*</span></label><input type="text" name="destination_name" value="${this.escapeHtml(dest.name || "")}" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g., Palawan, Boracay, Cebu"></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Category</label><div class="grid grid-cols-2 gap-4"><div><select name="category_type" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"><option value="local">Local</option><option value="international">International</option></select></div><div><select name="tour_category" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"><option value="Land Tours">Land Tours</option><option value="Domestic">Domestic</option><option value="Promo">Promo</option></select></div></div></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Destination Images</label><div id="images-container" class="space-y-3">${this.generateImageFields(images)}</div><button type="button" onclick="CreateDestination.addImageField()" class="mt-2 px-3 py-1 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 text-sm"><i class="fas fa-plus mr-1"></i>Add Another Image</button></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Destination Description</label><textarea name="destination_description" rows="4" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Describe the destination...">${this.escapeHtml(dest.description || "")}</textarea></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Airport Name</label><input type="text" name="airport_name" value="${this.escapeHtml(dest.airport_name || "")}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g., Ninoy Aquino International Airport"></div>
                        <div><label class="block text-sm font-medium text-gray-700 mb-2">Country</label><input type="text" name="country" value="${this.escapeHtml(dest.country || "Philippines")}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"></div>
                        <div class="flex items-center"><label class="flex items-center cursor-pointer"><input type="checkbox" name="destination_is_active" ${dest.is_active !== false ? "checked" : ""} class="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"><span class="ml-2 text-sm text-gray-700">Active</span></label></div>
                    </div>
                </div>

                <!-- Hotel Categories -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div class="flex items-center mb-4"><div class="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3"><i class="fas fa-layer-group text-primary-600"></i></div><h4 class="text-lg font-semibold text-gray-800">Hotel Categories</h4></div>
                    <div id="hotel-categories-container" class="space-y-4">${this.generateHotelCategoryFields(hotelCategories)}</div>
                    <button type="button" onclick="CreateDestination.addHotelCategoryField()" class="mt-4 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 text-sm font-medium"><i class="fas fa-plus mr-2"></i>Add Hotel Category</button>
                </div>

                <!-- Hotels -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div class="flex items-center mb-4"><div class="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3"><i class="fas fa-hotel text-primary-600"></i></div><h4 class="text-lg font-semibold text-gray-800">Hotels</h4><p class="text-sm text-gray-500 ml-2">(Assign to a hotel category above)</p></div>
                    <div id="hotels-container" class="space-y-4">${this.generateHotelFields(hotels, hotelCategories)}</div>
                    <button type="button" onclick="CreateDestination.addHotelField()" class="mt-4 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 text-sm font-medium"><i class="fas fa-plus mr-2"></i>Add Hotel</button>
                </div>

                <!-- Packages -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div class="flex items-center mb-4"><div class="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3"><i class="fas fa-box text-primary-600"></i></div><h4 class="text-lg font-semibold text-gray-800">Packages</h4></div>
                    ${toursWarningHtml}
                    <div id="packages-container" class="space-y-6">${packageFieldsHtml}</div>
                    <button type="button" onclick="CreateDestination.addPackageField()" class="mt-4 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 text-sm font-medium"><i class="fas fa-plus mr-2"></i>Add Package</button>
                </div>

                <!-- Optional Tours Management (Destination Specific) -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div class="flex items-center mb-4">
                        <div class="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                            <i class="fas fa-umbrella-beach text-primary-600"></i>
                        </div>
                        <h4 class="text-lg font-semibold text-gray-800">Optional Tours for this Destination</h4>
                        <p class="text-sm text-gray-500 ml-2">(Tours that can be assigned to packages in this destination)</p>
                    </div>
                    <div id="optional-tours-container" class="space-y-6">${this.generateOptionalTourFields(destinationOptionalTours, [])}</div>
                    <button type="button" onclick="CreateDestination.addOptionalTourField()" class="mt-4 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 text-sm font-medium"><i class="fas fa-plus mr-2"></i>Add Optional Tour</button>
                </div>

                <input type="hidden" name="destination_id" value="${dest.id || ""}">
            </form>
        `;
  },

  generateImageFields: function (images) {
    let html = "";
    images.forEach(function (img) {
      html += `<div class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg"><input type="file" name="image_file[]" accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"><input type="url" name="image_url[]" value="${CreateDestination.escapeHtml(img.url || "")}" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Or Image URL"><button type="button" onclick="this.closest('.flex').remove()" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button></div>`;
    });
    html += `<div class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border-2 border-dashed border-gray-300"><input type="file" name="image_file[]" accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"><input type="url" name="image_url[]" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Or Image URL"><button type="button" onclick="this.closest('.flex').remove()" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button></div>`;
    return html;
  },

  addImageField: function () {
    const container = document.getElementById("images-container");
    const div = document.createElement("div");
    div.className =
      "flex items-center gap-3 bg-gray-50 p-3 rounded-lg border-2 border-dashed border-gray-300";
    div.innerHTML = `<input type="file" name="image_file[]" accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"><input type="url" name="image_url[]" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Or Image URL"><button type="button" onclick="this.closest('.flex').remove()" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>`;
    container.appendChild(div);
  },

  generateHotelCategoryFields: function (categories) {
    let html = "";
    categories.forEach(function (cat, idx) {
      html += `<div class="bg-purple-50 p-4 rounded-lg border border-purple-200" data-category-id="${cat.id || ""}" data-category-index="${idx}">
                        <div class="flex justify-between items-center mb-3">
                            <h5 class="font-medium text-purple-800">Category ${idx + 1}</h5>
                            <button type="button" onclick="this.closest('.bg-purple-50').remove()" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
                        </div>
                        <div class="space-y-3">
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Category Name</label><input type="text" name="hotel_category_name[]" value="${CreateDestination.escapeHtml(cat.category_name)}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g., Deluxe, Standard, Suite" required></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Display Order</label><input type="number" name="hotel_category_display_order[]" value="${cat.display_order || 0}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Display Order"></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Breakfast Note</label><input type="text" name="hotel_category_breakfast_note[]" value="${CreateDestination.escapeHtml(cat.breakfast_note || "")}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g., Buffet breakfast included"></div>
                            <div class="flex items-center"><label class="flex items-center cursor-pointer"><input type="checkbox" name="hotel_category_has_breakfast[]" ${cat.has_breakfast ? "checked" : ""} class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"><span class="ml-2 text-sm text-gray-700">Has Breakfast</span></label></div>
                        </div>
                    </div>`;
    });
    return html;
  },

  addHotelCategoryField: function () {
    const container = document.getElementById("hotel-categories-container");
    const idx = Date.now();
    const div = document.createElement("div");
    div.className = "bg-purple-50 p-4 rounded-lg border border-purple-200";
    div.setAttribute("data-category-id", "");
    div.setAttribute("data-category-index", idx);
    div.innerHTML = `<div class="flex justify-between items-center mb-3"><h5 class="font-medium text-purple-800">New Category</h5><button type="button" onclick="this.closest('.bg-purple-50').remove()" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button></div>
                        <div class="space-y-3">
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Category Name</label><input type="text" name="hotel_category_name[]" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g., Deluxe, Standard, Suite" required></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Display Order</label><input type="number" name="hotel_category_display_order[]" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Display Order" value="0"></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Breakfast Note</label><input type="text" name="hotel_category_breakfast_note[]" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g., Buffet breakfast included"></div>
                            <div class="flex items-center"><label class="flex items-center"><input type="checkbox" name="hotel_category_has_breakfast[]" class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" checked><span class="ml-2 text-sm text-gray-700">Has Breakfast</span></label></div>
                        </div>`;
    container.appendChild(div);
  },

  generateHotelFields: function (hotels, hotelCategories) {
    let categoryOptions = '<option value="">Select a Category</option>';
    hotelCategories.forEach(function (cat, idx) {
      categoryOptions += `<option value="${idx}">${CreateDestination.escapeHtml(cat.category_name)}</option>`;
    });
    let html = "";
    hotels.forEach(function (hotel, idx) {
      let selectedIndex = -1;
      if (hotel.category_id) {
        const categoryIndex = hotelCategories.findIndex(
          (cat) => cat.id === hotel.category_id,
        );
        if (categoryIndex !== -1) selectedIndex = categoryIndex;
      }
      html += `<div class="bg-amber-50 p-4 rounded-lg border border-amber-200">
                        <div class="flex justify-between items-center mb-3">
                            <h5 class="font-medium text-amber-800">Hotel ${idx + 1}</h5>
                            <button type="button" onclick="this.closest('.bg-amber-50').remove()" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
                        </div>
                        <div class="space-y-3">
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Hotel Name</label><input type="text" name="hotel_name[]" value="${CreateDestination.escapeHtml(hotel.name)}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Hotel Name" required></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Hotel Category</label><select name="hotel_category_ref[]" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">${categoryOptions.replace(`value="${selectedIndex}"`, `value="${selectedIndex}" selected`)}</select></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Hotel Image</label><div class="flex items-center gap-3"><input type="file" name="hotel_image_file[]" accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"><input type="url" name="hotel_image_url[]" value="${CreateDestination.escapeHtml(hotel.image_url || "")}" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Or Image URL"></div></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Description</label><textarea name="hotel_description[]" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Hotel description">${CreateDestination.escapeHtml(hotel.description || "")}</textarea></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Notes</label><textarea name="hotel_notes[]" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Additional notes">${CreateDestination.escapeHtml(hotel.notes || "")}</textarea></div>
                            <div class="flex items-center"><label class="flex items-center cursor-pointer"><input type="checkbox" name="hotel_is_active[]" ${hotel.is_active ? "checked" : ""} class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"><span class="ml-2 text-sm text-gray-700">Active</span></label></div>
                        </div>
                    </div>`;
    });
    return html;
  },

  addHotelField: function () {
    const container = document.getElementById("hotels-container");
    const div = document.createElement("div");
    div.className = "bg-amber-50 p-4 rounded-lg border border-amber-200";
    const categorySections = document.querySelectorAll(
      "#hotel-categories-container > .bg-purple-50",
    );
    let categoryOptions = '<option value="">Select a Category</option>';
    categorySections.forEach(function (cat, idx) {
      const catName =
        cat.querySelector('input[name="hotel_category_name[]"]')?.value ||
        `Category ${idx + 1}`;
      categoryOptions += `<option value="${idx}">${CreateDestination.escapeHtml(catName)}</option>`;
    });
    div.innerHTML = `<div class="flex justify-between items-center mb-3"><h5 class="font-medium text-amber-800">New Hotel</h5><button type="button" onclick="this.closest('.bg-amber-50').remove()" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button></div>
                        <div class="space-y-3">
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Hotel Name</label><input type="text" name="hotel_name[]" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Hotel Name" required></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Hotel Category</label><select name="hotel_category_ref[]" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">${categoryOptions}</select></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Hotel Image</label><div class="flex items-center gap-3"><input type="file" name="hotel_image_file[]" accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"><input type="url" name="hotel_image_url[]" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Or Image URL"></div></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Description</label><textarea name="hotel_description[]" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Hotel description"></textarea></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Notes</label><textarea name="hotel_notes[]" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Additional notes"></textarea></div>
                            <div class="flex items-center"><label class="flex items-center"><input type="checkbox" name="hotel_is_active[]" class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" checked><span class="ml-2 text-sm text-gray-700">Active</span></label></div>
                        </div>`;
    container.appendChild(div);
  },

  generatePackageFields: function (
    packages,
    packageRates,
    inclusions,
    exclusions,
    itineraries,
    hotelCategories,
    allOptionalTours,
    packageOptionalTours,
  ) {
    const tours = allOptionalTours || [];
    const links = packageOptionalTours || [];

    console.log(
      "🔍 generatePackageFields - All tours available:",
      tours.length,
    );

    let html = "";
    const self = this;

    const packagesToRender = packages.length > 0 ? packages : [{}];

    packagesToRender.forEach(function (pkg, pkgIdx) {
      const uniqueId = pkg.id ? pkg.id : Date.now() + pkgIdx;

      const linkedTourIds = [];
      if (pkg.id && links && links.length > 0) {
        const linked = links.filter((link) => link.package_id === pkg.id);
        linked.forEach((link) => {
          if (link.optional_tour_id) {
            linkedTourIds.push(link.optional_tour_id);
          }
        });
      }

      const pkgInclusions = inclusions.filter(function (inc) {
        return inc.package_id === pkg.id;
      });
      const pkgExclusions = exclusions.filter(function (exc) {
        return exc.package_id === pkg.id;
      });
      const pkgItineraries = itineraries.filter(function (iti) {
        return iti.package_id === pkg.id;
      });
      const pkgRates = packageRates.filter(function (rate) {
        return rate.package_id === pkg.id;
      });

      const optionalTourSelectorHtml = self.generateOptionalTourSelector(
        uniqueId,
        tours,
        linkedTourIds,
        pkg.id,
      );

      html += `<div class="bg-blue-50 p-4 rounded-lg border border-blue-200" data-unique-id="${uniqueId}" data-package-index="${pkgIdx}" data-package-id="${pkg.id || ""}">
                        <div class="flex justify-between items-center mb-3">
                            <h5 class="font-medium text-blue-800">Package ${pkgIdx + 1}: ${self.escapeHtml(pkg.package_name || "")}</h5>
                            <button type="button" onclick="this.closest('.bg-blue-50').remove()" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
                        </div>
                        <div class="space-y-4">
                            <div class="grid grid-cols-2 gap-4">
                                <div><label class="block text-xs font-medium text-gray-500 mb-1">Package Name</label><input type="text" name="package_name[]" value="${self.escapeHtml(pkg.package_name || "")}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Package Name" required></div>
                                <div><label class="block text-xs font-medium text-gray-500 mb-1">Package Code</label><input type="text" name="package_code[]" value="${self.escapeHtml(pkg.package_code || "")}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Package Code"></div>
                                <div><label class="block text-xs font-medium text-gray-500 mb-1">Status</label><select name="package_is_active[]" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"><option value="true" ${pkg.is_active !== false ? "selected" : ""}>Active</option><option value="false" ${pkg.is_active === false ? "selected" : ""}>Inactive</option></select></div>
                                <div><label class="block text-xs font-medium text-gray-500 mb-1">Base Price (₱)</label><input type="number" name="package_base_price[]" value="${pkg.base_price || 0}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Base Price"></div>
                            </div>
                            
                            <div class="border-t border-blue-200 pt-4">
                                <h6 class="font-medium text-blue-700 mb-3">🏖️ Optional Tours for This Package</h6>
                                <div class="bg-white p-3 rounded-lg border border-blue-100">
                                    ${optionalTourSelectorHtml}
                                    <p class="text-xs text-gray-400 mt-1">Select optional tours that are available with this package</p>
                                </div>
                            </div>
                            
                            <div class="border-t border-blue-200 pt-4">
                                <h6 class="font-medium text-blue-700 mb-3">💰 Package Hotel Rates</h6>
                                <div class="rates-container-${uniqueId} space-y-4">${self.generateRateFields(uniqueId, pkgRates, hotelCategories)}</div>
                                <button type="button" onclick="CreateDestination.addRateField(${uniqueId})" class="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs"><i class="fas fa-plus mr-1"></i> Add Rate Set</button>
                            </div>
                            <div class="border-t border-blue-200 pt-4">
                                <h6 class="font-medium text-blue-700 mb-3">📅 Package Itineraries</h6>
                                <div class="itineraries-container-${uniqueId} space-y-3">${self.generateItineraryFields(uniqueId, pkgItineraries)}</div>
                                <button type="button" onclick="CreateDestination.addItineraryField(${uniqueId})" class="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs"><i class="fas fa-plus mr-1"></i> Add Itinerary Day</button>
                            </div>
                            <div class="border-t border-blue-200 pt-4">
                                <h6 class="font-medium text-blue-700 mb-3">✅ Package Inclusions</h6>
                                <div class="inclusions-container-${uniqueId} space-y-2">${self.generateInclusionFields(uniqueId, pkgInclusions)}</div>
                                <button type="button" onclick="CreateDestination.addInclusionField(${uniqueId})" class="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs"><i class="fas fa-plus mr-1"></i> Add Inclusion</button>
                            </div>
                            <div class="border-t border-blue-200 pt-4">
                                <h6 class="font-medium text-blue-700 mb-3">❌ Package Exclusions</h6>
                                <div class="exclusions-container-${uniqueId} space-y-2">${self.generateExclusionFields(uniqueId, pkgExclusions)}</div>
                                <button type="button" onclick="CreateDestination.addExclusionField(${uniqueId})" class="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs"><i class="fas fa-plus mr-1"></i> Add Exclusion</button>
                            </div>
                        </div>
                    </div>`;
    });
    return html;
  },

  generateOptionalTourSelector: function (
    uniqueId,
    optionalTours,
    linkedTourIds,
  ) {
    if (!optionalTours || optionalTours.length === 0) {
      return `<div class="text-center py-4 text-gray-500">
                        <i class="fas fa-info-circle mr-2"></i>
                        No optional tours available. Create optional tours first.
                    </div>`;
    }

    let html = `<div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Select Optional Tours:</label>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">`;

    optionalTours.forEach(function (tour) {
      const isChecked = linkedTourIds.includes(tour.id) ? "checked" : "";
      html += `<label class="flex items-start p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" name="package_optional_tours_${uniqueId}[]" value="${tour.id}" ${isChecked} class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded">
                        <div class="ml-3">
                            <span class="text-sm font-medium text-gray-700">${CreateDestination.escapeHtml(tour.name)}</span>
                            ${tour.description ? `<p class="text-xs text-gray-500">${CreateDestination.escapeHtml(tour.description.substring(0, 100))}</p>` : ""}
                        </div>
                    </label>`;
    });

    html += `</div>
                </div>`;

    return html;
  },

  addPackageField: function () {
    const container = document.getElementById("packages-container");
    const uniqueId = Date.now();
    const div = document.createElement("div");
    div.className = "bg-blue-50 p-4 rounded-lg border border-blue-200";
    div.setAttribute("data-unique-id", uniqueId);

    const optionalTourSections = document.querySelectorAll(
      "#optional-tours-container > .bg-pink-50",
    );
    let optionalToursHtml = "";

    if (optionalTourSections.length === 0) {
      optionalToursHtml = `<div class="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                                    <i class="fas fa-info-circle mr-2"></i>
                                    No optional tours available for this destination. 
                                    <a href="#" onclick="document.getElementById('optional-tours-container').scrollIntoView({behavior: 'smooth'}); return false;" class="text-primary-600 underline">Create optional tours first</a>.
                                </div>`;
    } else {
      optionalToursHtml = `<div class="space-y-2">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Select Optional Tours:</label>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-white">`;

      optionalTourSections.forEach((tourSection, idx) => {
        const tourName =
          tourSection.querySelector('input[name="tour_name[]"]')?.value ||
          `Tour ${idx + 1}`;
        const tourId = tourSection.getAttribute("data-tour-id");
        const tourDescription =
          tourSection.querySelector('textarea[name="tour_description[]"]')
            ?.value || "";

        if (tourId && tourId !== "new") {
          optionalToursHtml += `<label class="flex items-start p-2 hover:bg-gray-50 rounded cursor-pointer border border-transparent hover:border-gray-200">
                                            <input type="checkbox" name="package_optional_tours_${uniqueId}[]" value="${tourId}" class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded">
                                            <div class="ml-3">
                                                <span class="text-sm font-medium text-gray-700">${CreateDestination.escapeHtml(tourName)}</span>
                                                ${tourDescription ? `<p class="text-xs text-gray-500">${CreateDestination.escapeHtml(tourDescription.substring(0, 100))}</p>` : ""}
                                            </div>
                                        </label>`;
        } else {
          optionalToursHtml += `<label class="flex items-start p-2 hover:bg-gray-50 rounded cursor-pointer border border-yellow-200 bg-yellow-50">
                                            <input type="checkbox" name="package_optional_tours_${uniqueId}[]" value="temp_${idx}" class="mt-1 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded" disabled>
                                            <div class="ml-3">
                                                <span class="text-sm font-medium text-gray-700">${CreateDestination.escapeHtml(tourName)}</span>
                                                <span class="text-xs text-yellow-600 block">⚠️ Save this tour first before assigning to packages</span>
                                            </div>
                                        </label>`;
        }
      });

      optionalToursHtml += `</div>
                                <p class="text-xs text-gray-400 mt-2">Select optional tours that are available with this package</p>
                                </div>`;
    }

    div.innerHTML = `<div class="flex justify-between items-center mb-3">
                            <h5 class="font-medium text-blue-800">New Package</h5>
                            <button type="button" onclick="this.closest('.bg-blue-50').remove()" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
                        </div>
                        <div class="space-y-4">
                            <div class="grid grid-cols-2 gap-4">
                                <div><input type="text" name="package_name[]" class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Package Name" required></div>
                                <div><input type="text" name="package_code[]" class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Package Code"></div>
                                <div><select name="package_is_active[]" class="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="true">Active</option><option value="false">Inactive</option></select></div>
                                <div><input type="number" name="package_base_price[]" class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Base Price" value="0"></div>
                            </div>
                            
                            <div class="border-t border-blue-200 pt-4">
                                <h6 class="font-medium text-blue-700 mb-3">🏖️ Optional Tours for This Package</h6>
                                <div class="bg-white p-3 rounded-lg border border-blue-100">
                                    ${optionalToursHtml}
                                </div>
                            </div>
                            
                            <div class="border-t border-blue-200 pt-4">
                                <h6 class="font-medium text-blue-700 mb-3">💰 Package Hotel Rates</h6>
                                <div class="rates-container-${uniqueId} space-y-4"></div>
                                <button type="button" onclick="CreateDestination.addRateField(${uniqueId})" class="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs">+ Add Rate Set</button>
                            </div>
                            <div class="border-t border-blue-200 pt-4">
                                <h6 class="font-medium text-blue-700 mb-3">📅 Package Itineraries</h6>
                                <div class="itineraries-container-${uniqueId} space-y-3"></div>
                                <button type="button" onclick="CreateDestination.addItineraryField(${uniqueId})" class="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs">+ Add Itinerary Day</button>
                            </div>
                            <div class="border-t border-blue-200 pt-4">
                                <h6 class="font-medium text-blue-700 mb-3">✅ Package Inclusions</h6>
                                <div class="inclusions-container-${uniqueId} space-y-2"></div>
                                <button type="button" onclick="CreateDestination.addInclusionField(${uniqueId})" class="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs">+ Add Inclusion</button>
                            </div>
                            <div class="border-t border-blue-200 pt-4">
                                <h6 class="font-medium text-blue-700 mb-3">❌ Package Exclusions</h6>
                                <div class="exclusions-container-${uniqueId} space-y-2"></div>
                                <button type="button" onclick="CreateDestination.addExclusionField(${uniqueId})" class="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs">+ Add Exclusion</button>
                            </div>
                        </div>`;
    container.appendChild(div);
  },

  generateRateFields: function (uniqueId, rates, hotelCategories) {
    let html = "";
    const self = this;

    rates.forEach(function (rate, rateIdx) {
      let selectedCategoryIndex = -1;
      if (rate.hotel_category_id && hotelCategories.length > 0) {
        const foundIndex = hotelCategories.findIndex(
          (cat) => cat.id === rate.hotel_category_id,
        );
        if (foundIndex !== -1) selectedCategoryIndex = foundIndex;
      }

      html += `<div class="border border-blue-200 rounded-lg p-4 bg-white mb-3">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-sm font-medium text-blue-800">Rate Set ${rateIdx + 1}</span>
                            <button type="button" onclick="this.closest('.border').remove()" class="text-red-500 hover:text-red-700">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-semibold text-gray-700 mb-1">Hotel Category <span class="text-red-500">*</span></label>
                                <select name="rate_hotel_category_${uniqueId}_${rateIdx}" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    <option value="">Select Hotel Category</option>`;

      hotelCategories.forEach((cat, idx) => {
        html += `<option value="${idx}" ${selectedCategoryIndex === idx ? "selected" : ""}>${self.escapeHtml(cat.category_name)}</option>`;
      });

      html += `</select>
                            <p class="text-xs text-gray-400 mt-1">Select which hotel category this rate applies to</p>
                        </div>
                        <div>
                            <h6 class="text-xs font-semibold text-gray-600 mb-2">REGULAR RATES</h6>
                            <div class="grid grid-cols-4 gap-2">
                                <div><label class="block text-xs text-gray-500 mb-1">Season</label><input type="text" name="rate_season_${uniqueId}_${rateIdx}" value="${rate.season || "Regular"}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">Duration</label><input type="text" name="rate_duration_${uniqueId}_${rateIdx}" value="${rate.duration || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">Validity Date</label><input type="date" name="rate_validity_${uniqueId}_${rateIdx}" value="${rate.validity_date || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                            </div>
                            <div class="grid grid-cols-4 gap-2 mt-2">
                                <div><label class="block text-xs text-gray-500 mb-1">Solo</label><input type="number" name="rate_solo_${uniqueId}_${rateIdx}" value="${rate.rate_solo || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">2 Pax</label><input type="number" name="rate_2pax_${uniqueId}_${rateIdx}" value="${rate.rate_2pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">3 Pax</label><input type="number" name="rate_3pax_${uniqueId}_${rateIdx}" value="${rate.rate_3pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">4 Pax</label><input type="number" name="rate_4pax_${uniqueId}_${rateIdx}" value="${rate.rate_4pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">5 Pax</label><input type="number" name="rate_5pax_${uniqueId}_${rateIdx}" value="${rate.rate_5pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">6 Pax</label><input type="number" name="rate_6pax_${uniqueId}_${rateIdx}" value="${rate.rate_6pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">7 Pax</label><input type="number" name="rate_7pax_${uniqueId}_${rateIdx}" value="${rate.rate_7pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">8 Pax</label><input type="number" name="rate_8pax_${uniqueId}_${rateIdx}" value="${rate.rate_8pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">9 Pax</label><input type="number" name="rate_9pax_${uniqueId}_${rateIdx}" value="${rate.rate_9pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">10 Pax</label><input type="number" name="rate_10pax_${uniqueId}_${rateIdx}" value="${rate.rate_10pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">11 Pax</label><input type="number" name="rate_11pax_${uniqueId}_${rateIdx}" value="${rate.rate_11pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">12 Pax</label><input type="number" name="rate_12pax_${uniqueId}_${rateIdx}" value="${rate.rate_12pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">Child (No Breakfast)</label><input type="number" name="rate_child_no_breakfast_${uniqueId}_${rateIdx}" value="${rate.rate_child_no_breakfast || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                            </div>
                        </div>
                        <div class="border-t border-gray-200 pt-3">
                            <h6 class="text-xs font-semibold text-gray-600 mb-2">EXTRA NIGHTS</h6>
                            <div class="grid grid-cols-4 gap-2">
                                <div><label class="block text-xs text-gray-500 mb-1">Solo</label><input type="number" name="extra_night_solo_${uniqueId}_${rateIdx}" value="${rate.extra_night_solo || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">2 Pax</label><input type="number" name="extra_night_2pax_${uniqueId}_${rateIdx}" value="${rate.extra_night_2pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">3 Pax</label><input type="number" name="extra_night_3pax_${uniqueId}_${rateIdx}" value="${rate.extra_night_3pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">4 Pax</label><input type="number" name="extra_night_4pax_${uniqueId}_${rateIdx}" value="${rate.extra_night_4pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">5 Pax</label><input type="number" name="extra_night_5pax_${uniqueId}_${rateIdx}" value="${rate.extra_night_5pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">6 Pax</label><input type="number" name="extra_night_6pax_${uniqueId}_${rateIdx}" value="${rate.extra_night_6pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">7 Pax</label><input type="number" name="extra_night_7pax_${uniqueId}_${rateIdx}" value="${rate.extra_night_7pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">8 Pax</label><input type="number" name="extra_night_8pax_${uniqueId}_${rateIdx}" value="${rate.extra_night_8pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">9 Pax</label><input type="number" name="extra_night_9pax_${uniqueId}_${rateIdx}" value="${rate.extra_night_9pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">10 Pax</label><input type="number" name="extra_night_10pax_${uniqueId}_${rateIdx}" value="${rate.extra_night_10pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">11 Pax</label><input type="number" name="extra_night_11pax_${uniqueId}_${rateIdx}" value="${rate.extra_night_11pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">12 Pax</label><input type="number" name="extra_night_12pax_${uniqueId}_${rateIdx}" value="${rate.extra_night_12pax || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">Child (No Breakfast)</label><input type="number" name="extra_night_child_no_breakfast_${uniqueId}_${rateIdx}" value="${rate.extra_night_child_no_breakfast || ""}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Additional Info</label>
                            <textarea name="rate_additional_info_${uniqueId}_${rateIdx}" rows="2" class="w-full px-2 py-1 border rounded-lg text-sm">${rate.additional_info || ""}</textarea>
                        </div>
                        <div class="flex items-center space-x-4">
                            <label class="flex items-center">
                                <input type="checkbox" name="rate_breakfast_included_${uniqueId}_${rateIdx}" ${rate.breakfast_included !== false ? "checked" : ""} class="h-3 w-3 text-primary-600 focus:ring-primary-500 border-gray-300 rounded">
                                <span class="ml-1 text-xs text-gray-600">Breakfast Included</span>
                            </label>
                        </div>
                    </div>
                </div>`;
    });
    return html;
  },

  addRateField: function (uniqueId) {
    const container = document.querySelector(`.rates-container-${uniqueId}`);
    const rateIdx = Date.now();

    const categorySections = document.querySelectorAll(
      "#hotel-categories-container > .bg-purple-50",
    );
    let categoryOptions = '<option value="">Select Hotel Category</option>';
    categorySections.forEach((cat, idx) => {
      const catName =
        cat.querySelector('input[name="hotel_category_name[]"]')?.value ||
        `Category ${idx + 1}`;
      categoryOptions += `<option value="${idx}">${CreateDestination.escapeHtml(catName)}</option>`;
    });

    const div = document.createElement("div");
    div.className = "border border-blue-200 rounded-lg p-4 bg-white mb-3";
    div.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <span class="text-sm font-medium text-blue-800">New Rate Set</span>
                <button type="button" onclick="this.closest('.border').remove()" class="text-red-500 hover:text-red-700">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Hotel Category <span class="text-red-500">*</span></label>
                    <select name="rate_hotel_category_${uniqueId}_${rateIdx}" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                        ${categoryOptions}
                    </select>
                    <p class="text-xs text-gray-400 mt-1">Select which hotel category this rate applies to</p>
                </div>
                <div>
                    <h6 class="text-xs font-semibold text-gray-600 mb-2">REGULAR RATES</h6>
                    <div class="grid grid-cols-4 gap-2">
                        <div><label class="block text-xs text-gray-500 mb-1">Season</label><input type="text" name="rate_season_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm" value="Regular"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">Duration</label><input type="text" name="rate_duration_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">Validity Date</label><input type="date" name="rate_validity_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                    </div>
                    <div class="grid grid-cols-4 gap-2 mt-2">
                        <div><label class="block text-xs text-gray-500 mb-1">Solo</label><input type="number" name="rate_solo_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">2 Pax</label><input type="number" name="rate_2pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">3 Pax</label><input type="number" name="rate_3pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">4 Pax</label><input type="number" name="rate_4pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">5 Pax</label><input type="number" name="rate_5pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">6 Pax</label><input type="number" name="rate_6pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">7 Pax</label><input type="number" name="rate_7pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">8 Pax</label><input type="number" name="rate_8pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">9 Pax</label><input type="number" name="rate_9pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">10 Pax</label><input type="number" name="rate_10pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">11 Pax</label><input type="number" name="rate_11pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">12 Pax</label><input type="number" name="rate_12pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">Child (No Breakfast)</label><input type="number" name="rate_child_no_breakfast_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                    </div>
                </div>
                <div class="border-t border-gray-200 pt-3">
                    <h6 class="text-xs font-semibold text-gray-600 mb-2">EXTRA NIGHTS</h6>
                    <div class="grid grid-cols-4 gap-2">
                        <div><label class="block text-xs text-gray-500 mb-1">Solo</label><input type="number" name="extra_night_solo_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">2 Pax</label><input type="number" name="extra_night_2pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">3 Pax</label><input type="number" name="extra_night_3pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">4 Pax</label><input type="number" name="extra_night_4pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">5 Pax</label><input type="number" name="extra_night_5pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">6 Pax</label><input type="number" name="extra_night_6pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">7 Pax</label><input type="number" name="extra_night_7pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">8 Pax</label><input type="number" name="extra_night_8pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">9 Pax</label><input type="number" name="extra_night_9pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">10 Pax</label><input type="number" name="extra_night_10pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">11 Pax</label><input type="number" name="extra_night_11pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">12 Pax</label><input type="number" name="extra_night_12pax_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">Child (No Breakfast)</label><input type="number" name="extra_night_child_no_breakfast_${uniqueId}_${rateIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Additional Info</label>
                    <textarea name="rate_additional_info_${uniqueId}_${rateIdx}" rows="2" class="w-full px-2 py-1 border rounded-lg text-sm"></textarea>
                </div>
                <div class="flex items-center space-x-4">
                    <label class="flex items-center">
                        <input type="checkbox" name="rate_breakfast_included_${uniqueId}_${rateIdx}" class="h-3 w-3 rounded" checked>
                        <span class="ml-1 text-xs">Breakfast Included</span>
                    </label>
                </div>
            </div>
        `;
    if (container) container.appendChild(div);
  },

  generateItineraryFields: function (uniqueId, itineraries) {
    let html = "";
    itineraries.forEach(function (iti, itiIdx) {
      let descriptionText = "";
      if (iti.day_description) {
        if (Array.isArray(iti.day_description)) {
          descriptionText = iti.day_description.join("\n");
        } else {
          descriptionText = iti.day_description;
        }
      }
      html += `<div class="border border-blue-200 rounded-lg p-3 bg-white">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm font-medium text-blue-800">Day ${iti.day_number}</span>
                            <button type="button" onclick="this.closest('.border').remove()" class="text-red-500"><i class="fas fa-trash"></i></button>
                        </div>
                        <div class="space-y-2">
                            <div class="grid grid-cols-2 gap-2">
                                <div><label class="block text-xs text-gray-500 mb-1">Day Number</label><input type="number" name="iti_day_${uniqueId}_${itiIdx}" value="${iti.day_number}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">Display Order</label><input type="number" name="iti_order_${uniqueId}_${itiIdx}" value="${iti.display_order || 0}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                            </div>
                            <div><label class="block text-xs text-gray-500 mb-1">Title</label><input type="text" name="iti_title_${uniqueId}_${itiIdx}" value="${CreateDestination.escapeHtml(iti.day_title || "")}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                            <div><label class="block text-xs text-gray-500 mb-1">Description</label><textarea name="iti_description_${uniqueId}_${itiIdx}" rows="3" class="w-full px-2 py-1 border rounded-lg text-sm">${CreateDestination.escapeHtml(descriptionText)}</textarea><p class="text-xs text-gray-400 mt-1">Use line breaks for better formatting</p></div>
                        </div>
                    </div>`;
    });
    return html;
  },

  addItineraryField: function (uniqueId) {
    const container = document.querySelector(
      `.itineraries-container-${uniqueId}`,
    );
    const itiIdx = Date.now();
    const div = document.createElement("div");
    div.className = "border border-blue-200 rounded-lg p-3 bg-white";
    div.innerHTML = `<div class="flex justify-between items-center mb-2"><span class="text-sm font-medium text-blue-800">New Day</span><button type="button" onclick="this.closest('.border').remove()" class="text-red-500"><i class="fas fa-trash"></i></button></div>
                        <div class="space-y-2">
                            <div class="grid grid-cols-2 gap-2">
                                <div><label class="block text-xs text-gray-500 mb-1">Day Number</label><input type="number" name="iti_day_${uniqueId}_${itiIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                                <div><label class="block text-xs text-gray-500 mb-1">Display Order</label><input type="number" name="iti_order_${uniqueId}_${itiIdx}" class="w-full px-2 py-1 border rounded-lg text-sm" value="0"></div>
                            </div>
                            <div><label class="block text-xs text-gray-500 mb-1">Title</label><input type="text" name="iti_title_${uniqueId}_${itiIdx}" class="w-full px-2 py-1 border rounded-lg text-sm"></div>
                            <div><label class="block text-xs text-gray-500 mb-1">Description</label><textarea name="iti_description_${uniqueId}_${itiIdx}" rows="3" class="w-full px-2 py-1 border rounded-lg text-sm"></textarea><p class="text-xs text-gray-400 mt-1">Use line breaks for better formatting</p></div>
                        </div>`;
    if (container) container.appendChild(div);
  },

  generateInclusionFields: function (uniqueId, inclusions) {
    let html = "";
    inclusions.forEach(function (inc, incIdx) {
      html += `<div class="flex items-center gap-2 bg-green-50 p-2 rounded-lg">
                        <div class="flex-1"><label class="block text-xs text-gray-500 mb-1">Inclusion Text</label><input type="text" name="inclusion_text_${uniqueId}[]" value="${CreateDestination.escapeHtml(inc.inclusion_text)}" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="What's included"></div>
                        <div class="w-24"><label class="block text-xs text-gray-500 mb-1">Display Order</label><input type="number" name="inclusion_order_${uniqueId}[]" value="${inc.display_order || incIdx}" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Order"></div>
                        <button type="button" onclick="this.parentElement.remove()" class="mt-6 text-red-500"><i class="fas fa-trash"></i></button>
                    </div>`;
    });
    if (inclusions.length === 0) {
      html += `<div class="flex items-center gap-2 bg-green-50 p-2 rounded-lg">
                        <div class="flex-1"><input type="text" name="inclusion_text_${uniqueId}[]" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="What's included"></div>
                        <div class="w-24"><input type="number" name="inclusion_order_${uniqueId}[]" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Order" value="0"></div>
                        <button type="button" onclick="this.parentElement.remove()" class="mt-6 text-red-500"><i class="fas fa-trash"></i></button>
                    </div>`;
    }
    return html;
  },

  addInclusionField: function (uniqueId) {
    const container = document.querySelector(
      `.inclusions-container-${uniqueId}`,
    );
    const div = document.createElement("div");
    div.className = "flex items-center gap-2 bg-green-50 p-2 rounded-lg";
    div.innerHTML = `<div class="flex-1"><label class="block text-xs text-gray-500 mb-1">Inclusion Text</label><input type="text" name="inclusion_text_${uniqueId}[]" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="What's included"></div>
                        <div class="w-24"><label class="block text-xs text-gray-500 mb-1">Display Order</label><input type="number" name="inclusion_order_${uniqueId}[]" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Order" value="0"></div>
                        <button type="button" onclick="this.parentElement.remove()" class="mt-6 text-red-500"><i class="fas fa-trash"></i></button>`;
    if (container) container.appendChild(div);
  },

  generateExclusionFields: function (uniqueId, exclusions) {
    let html = "";
    exclusions.forEach(function (exc, excIdx) {
      html += `<div class="flex items-center gap-2 bg-red-50 p-2 rounded-lg">
                        <div class="flex-1"><label class="block text-xs text-gray-500 mb-1">Exclusion Text</label><input type="text" name="exclusion_text_${uniqueId}[]" value="${CreateDestination.escapeHtml(exc.exclusion_text)}" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="What's not included"></div>
                        <div class="w-24"><label class="block text-xs text-gray-500 mb-1">Display Order</label><input type="number" name="exclusion_order_${uniqueId}[]" value="${exc.display_order || excIdx}" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Order"></div>
                        <button type="button" onclick="this.parentElement.remove()" class="mt-6 text-red-500"><i class="fas fa-trash"></i></button>
                    </div>`;
    });
    if (exclusions.length === 0) {
      html += `<div class="flex items-center gap-2 bg-red-50 p-2 rounded-lg">
                        <div class="flex-1"><input type="text" name="exclusion_text_${uniqueId}[]" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="What's not included"></div>
                        <div class="w-24"><input type="number" name="exclusion_order_${uniqueId}[]" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Order" value="0"></div>
                        <button type="button" onclick="this.parentElement.remove()" class="mt-6 text-red-500"><i class="fas fa-trash"></i></button>
                    </div>`;
    }
    return html;
  },

  addExclusionField: function (uniqueId) {
    const container = document.querySelector(
      `.exclusions-container-${uniqueId}`,
    );
    const div = document.createElement("div");
    div.className = "flex items-center gap-2 bg-red-50 p-2 rounded-lg";
    div.innerHTML = `<div class="flex-1"><label class="block text-xs text-gray-500 mb-1">Exclusion Text</label><input type="text" name="exclusion_text_${uniqueId}[]" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="What's not included"></div>
                        <div class="w-24"><label class="block text-xs text-gray-500 mb-1">Display Order</label><input type="number" name="exclusion_order_${uniqueId}[]" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Order" value="0"></div>
                        <button type="button" onclick="this.parentElement.remove()" class="mt-6 text-red-500"><i class="fas fa-trash"></i></button>`;
    if (container) container.appendChild(div);
  },

  generateOptionalTourFields: function (tours, rates) {
    let html = "";

    if (!tours || tours.length === 0) {
      return `<div class="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                        <i class="fas fa-info-circle text-4xl mb-2"></i>
                        <p>No optional tours created for this destination yet.</p>
                        <p class="text-sm">Click "Add Optional Tour" to create tours that can be assigned to packages.</p>
                    </div>`;
    }

    tours.forEach(function (tour, tourIdx) {
      const tourId = tour.id || "new";
      const tourName = tour.name || "";
      const tourRates = tour.rates || {};

      html += `<div class="bg-pink-50 p-4 rounded-lg border border-pink-200 optional-tour-section" data-tour-id="${tourId}" data-tour-index="${tourIdx}">
                        <div class="flex justify-between items-center mb-3">
                            <h5 class="font-medium text-pink-800">Tour ${tourIdx + 1}: ${CreateDestination.escapeHtml(tourName)}</h5>
                            <div class="flex gap-2">
                                <button type="button" onclick="CreateDestination.deleteOptionalTour(${typeof tourId === "number" ? tourId : "null"}, '${CreateDestination.escapeHtml(tourName)}', this.closest('.optional-tour-section'))" class="text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors" title="Delete this tour"><i class="fas fa-trash"></i></button>
                                <button type="button" onclick="this.closest('.bg-pink-50').remove()" class="text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors" title="Remove from form"><i class="fas fa-times"></i></button>
                            </div>
                        </div>
                        <div class="space-y-3">
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Tour Name</label><input type="text" name="tour_name[]" value="${CreateDestination.escapeHtml(tourName)}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Tour Name" required></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Description</label><textarea name="tour_description[]" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Tour description">${CreateDestination.escapeHtml(tour.description || "")}</textarea></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Display Order</label><input type="number" name="tour_display_order[]" value="${tour.display_order || 0}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Display Order"></div>
                            <div class="flex items-center"><label class="flex items-center"><input type="checkbox" name="tour_is_active[]" ${tour.is_active !== false ? "checked" : ""} class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"><span class="ml-2 text-sm text-gray-700">Active</span></label></div>
                            <div class="border-t border-pink-200 pt-3">
                                <h6 class="font-medium text-pink-700 mb-2">💰 Tour Rates</h6>
                                <div class="tour-rates-container-${tourIdx} space-y-2">
                                    ${CreateDestination.generateTourRateFields(tourIdx, tourRates ? [tourRates] : [])}
                                </div>
                                <button type="button" onclick="CreateDestination.addTourRateField(${tourIdx})" class="mt-2 px-3 py-1 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 text-xs"><i class="fas fa-plus mr-1"></i> Add Rate</button>
                            </div>
                        </div>
                    </div>`;
    });
    return html;
  },

  addOptionalTourField: function () {
    const container = document.getElementById("optional-tours-container");
    const tourIdx = Date.now();
    const div = document.createElement("div");
    div.className =
      "bg-pink-50 p-4 rounded-lg border border-pink-200 optional-tour-section";
    div.setAttribute("data-tour-id", "new");
    div.setAttribute("data-tour-index", tourIdx);

    div.innerHTML = `<div class="flex justify-between items-center mb-3">
                            <h5 class="font-medium text-pink-800">New Optional Tour</h5>
                            <div class="flex gap-2">
                                <button type="button" onclick="CreateDestination.deleteOptionalTour(null, 'this tour', this.closest('.optional-tour-section'))" class="text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors" title="Delete this tour"><i class="fas fa-trash"></i></button>
                                <button type="button" onclick="this.closest('.bg-pink-50').remove()" class="text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors" title="Remove from form"><i class="fas fa-times"></i></button>
                            </div>
                        </div>
                        <div class="space-y-3">
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Tour Name</label><input type="text" name="tour_name[]" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Tour Name" required></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Description</label><textarea name="tour_description[]" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Tour description"></textarea></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Display Order</label><input type="number" name="tour_display_order[]" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Display Order" value="0"></div>
                            <div class="flex items-center"><label class="flex items-center"><input type="checkbox" name="tour_is_active[]" class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" checked><span class="ml-2 text-sm text-gray-700">Active</span></label></div>
                            <div class="border-t border-pink-200 pt-3">
                                <h6 class="font-medium text-pink-700 mb-2">💰 Tour Rates</h6>
                                <div class="tour-rates-container-${tourIdx} space-y-2"></div>
                                <button type="button" onclick="CreateDestination.addTourRateField(${tourIdx})" class="mt-2 px-3 py-1 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 text-xs"><i class="fas fa-plus mr-1"></i> Add Rate</button>
                            </div>
                        </div>`;
    container.appendChild(div);
  },

  generateTourRateFields: function (tourIdx, rates) {
    let html = "";
    const ratesArray = Array.isArray(rates) ? rates : [rates];

    ratesArray.forEach(function (rate, rateIdx) {
      if (!rate) return;

      html += `<div class="grid grid-cols-5 gap-2 items-center bg-white p-2 rounded-lg">
                        <div><label class="block text-xs text-gray-500 mb-1">Solo</label><input type="number" name="tour_rate_solo_${tourIdx}[]" value="${rate.rate_solo || ""}" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">2 Pax</label><input type="number" name="tour_rate_2pax_${tourIdx}[]" value="${rate.rate_2pax || ""}" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">3 Pax</label><input type="number" name="tour_rate_3pax_${tourIdx}[]" value="${rate.rate_3pax || ""}" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">4 Pax</label><input type="number" name="tour_rate_4pax_${tourIdx}[]" value="${rate.rate_4pax || ""}" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">5 Pax</label><input type="number" name="tour_rate_5pax_${tourIdx}[]" value="${rate.rate_5pax || ""}" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">6 Pax</label><input type="number" name="tour_rate_6pax_${tourIdx}[]" value="${rate.rate_6pax || ""}" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">7 Pax</label><input type="number" name="tour_rate_7pax_${tourIdx}[]" value="${rate.rate_7pax || ""}" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">8 Pax</label><input type="number" name="tour_rate_8pax_${tourIdx}[]" value="${rate.rate_8pax || ""}" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">9 Pax</label><input type="number" name="tour_rate_9pax_${tourIdx}[]" value="${rate.rate_9pax || ""}" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">10 Pax</label><input type="number" name="tour_rate_10pax_${tourIdx}[]" value="${rate.rate_10pax || ""}" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">11 Pax</label><input type="number" name="tour_rate_11pax_${tourIdx}[]" value="${rate.rate_11pax || ""}" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">12 Pax</label><input type="number" name="tour_rate_12pax_${tourIdx}[]" value="${rate.rate_12pax || ""}" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">Child (4-9)</label><input type="number" name="tour_rate_child_${tourIdx}[]" value="${rate.rate_child_4_9 || ""}" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <button type="button" onclick="CreateDestination.deleteTourRate(this.parentElement)" class="text-red-500 hover:text-red-700 col-span-1 p-2"><i class="fas fa-trash"></i></button>
                    </div>`;
    });

    if (
      ratesArray.length === 0 ||
      (ratesArray.length === 1 && !ratesArray[0])
    ) {
      html += `<div class="grid grid-cols-5 gap-2 items-center bg-white p-2 rounded-lg">
                        <div><input type="number" name="tour_rate_solo_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm" placeholder="Solo"></div>
                        <div><input type="number" name="tour_rate_2pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm" placeholder="2 Pax"></div>
                        <div><input type="number" name="tour_rate_3pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm" placeholder="3 Pax"></div>
                        <div><input type="number" name="tour_rate_4pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm" placeholder="4 Pax"></div>
                        <div><input type="number" name="tour_rate_5pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm" placeholder="5 Pax"></div>
                        <div><input type="number" name="tour_rate_6pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm" placeholder="6 Pax"></div>
                        <div><input type="number" name="tour_rate_7pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm" placeholder="7 Pax"></div>
                        <div><input type="number" name="tour_rate_8pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm" placeholder="8 Pax"></div>
                        <div><input type="number" name="tour_rate_9pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm" placeholder="9 Pax"></div>
                        <div><input type="number" name="tour_rate_10pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm" placeholder="10 Pax"></div>
                        <div><input type="number" name="tour_rate_11pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm" placeholder="11 Pax"></div>
                        <div><input type="number" name="tour_rate_12pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm" placeholder="12 Pax"></div>
                        <div><input type="number" name="tour_rate_child_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm" placeholder="Child"></div>
                        <button type="button" onclick="CreateDestination.deleteTourRate(this.parentElement)" class="text-red-500 hover:text-red-700 col-span-1 p-2"><i class="fas fa-trash"></i></button>
                    </div>`;
    }

    return html;
  },

  addTourRateField: function (tourIdx) {
    const container = document.querySelector(
      `.tour-rates-container-${tourIdx}`,
    );
    const div = document.createElement("div");
    div.className =
      "grid grid-cols-5 gap-2 items-center bg-white p-2 rounded-lg";
    div.innerHTML = `<div><label class="block text-xs text-gray-500 mb-1">Solo</label><input type="number" name="tour_rate_solo_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">2 Pax</label><input type="number" name="tour_rate_2pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">3 Pax</label><input type="number" name="tour_rate_3pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">4 Pax</label><input type="number" name="tour_rate_4pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">5 Pax</label><input type="number" name="tour_rate_5pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">6 Pax</label><input type="number" name="tour_rate_6pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">7 Pax</label><input type="number" name="tour_rate_7pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">8 Pax</label><input type="number" name="tour_rate_8pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">9 Pax</label><input type="number" name="tour_rate_9pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">10 Pax</label><input type="number" name="tour_rate_10pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">11 Pax</label><input type="number" name="tour_rate_11pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">12 Pax</label><input type="number" name="tour_rate_12pax_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">Child (4-9)</label><input type="number" name="tour_rate_child_${tourIdx}[]" class="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm"></div>
                        <button type="button" onclick="CreateDestination.deleteTourRate(this.parentElement)" class="text-red-500 hover:text-red-700 col-span-1 p-2"><i class="fas fa-trash"></i></button>`;
    if (container) container.appendChild(div);
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

CreateDestination.init();
