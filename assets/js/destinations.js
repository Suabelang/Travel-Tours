// =====================================================
// DESTINATIONS MODULE - COMPLETE CRUD OPERATIONS
// =====================================================

import {
  supabase,
  state,
  formatCurrency,
  formatDate,
  showToast,
  showConfirmDialog,
  showLoading,
} from "../js/config_admin.js";

// ADD THIS IMPORT - Table format functions from modules folder
import {
  fetchTableFormatByName,
  openTableFormatBuilderModal,
  openTableFormatSelectorModal,
  deleteTableFormat,
  fetchRateRows,
} from "../js/table_formats.js";

// =====================================================
// HELPER FUNCTIONS
// =====================================================
// Helper function to get format description
async function getFormatDescription(destinationId, formatName) {
  try {
    const { data } = await supabase
      .from("rate_column_definitions")
      .select("format_description")
      .eq("destination_id", destinationId)
      .eq("format_name", formatName)
      .eq("is_active", true)
      .limit(1)
      .single();

    return data?.format_description || "";
  } catch (error) {
    return "";
  }
}

// Helper function to get format column count
async function getFormatColumnCount(destinationId, formatName) {
  try {
    const { count } = await supabase
      .from("rate_column_definitions")
      .select("*", { count: "exact", head: true })
      .eq("destination_id", destinationId)
      .eq("format_name", formatName)
      .eq("is_active", true);

    return count || 0;
  } catch (error) {
    return 0;
  }
}

// Helper function to get total rate rows across all categories
async function getTotalRateRows(packageId) {
  try {
    const { count } = await supabase
      .from("package_rate_values")
      .select("*", { count: "exact", head: true })
      .eq("package_id", packageId);

    // Group by season/sneak/duration to get unique rows
    const { data } = await supabase
      .from("package_rate_values")
      .select("season, sneak, duration")
      .eq("package_id", packageId);

    if (!data) return 0;

    // Count unique combinations
    const uniqueRows = new Set();
    data.forEach((row) => {
      uniqueRows.add(
        `${row.season || ""}_${row.sneak || ""}_${row.duration || ""}`,
      );
    });

    return uniqueRows.size;
  } catch (error) {
    return 0;
  }
}
async function getCategoryIdByName(categoryName, destinationType) {
  if (!categoryName) return null;
  const { data } = await supabase
    .from("optional_tour_categories")
    .select("id")
    .eq("name", categoryName)
    .eq("destination_type", destinationType)
    .maybeSingle();
  return data?.id || null;
}

function parseTextareaToArray(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

// =====================================================
// DESTINATION CRUD OPERATIONS
// =====================================================

export async function fetchDestinations() {
  try {
    console.log("🔄 Fetching all destinations with related data...");

    const { data: destinations, error: destError } = await supabase
      .from("destinations")
      .select("*")
      .order("name");

    if (destError) throw destError;
    const destinationIds = destinations?.map((d) => d.id) || [];

    if (destinationIds.length === 0) {
      state.destinations = [];
      return [];
    }

    const [
      { data: images },
      { data: packages },
      { data: inclusions },
      { data: exclusions },
      { data: itineraries },
      { data: hotelCategories },
      { data: hotels },
      { data: optionalTours },
      { data: optionalTourRates },
      { data: optionalTourCategories },
      { data: packageHotelRates },
      { data: packageOptionalTours },
      { data: packageTransportation },
      { data: transportationModes },
    ] = await Promise.all([
      supabase.from("destination_images").select("*"),
      supabase
        .from("destination_packages")
        .select("*")
        .in("destination_id", destinationIds),
      supabase.from("package_inclusions").select("*"),
      supabase.from("package_exclusions").select("*"),
      supabase.from("package_itineraries").select("*"),
      supabase
        .from("hotel_categories")
        .select("*")
        .in("destination_id", destinationIds),
      supabase.from("hotels").select("*"),
      supabase
        .from("optional_tours")
        .select("*")
        .in("destination_id", destinationIds),
      supabase.from("optional_tour_rates").select("*"),
      supabase.from("optional_tour_categories").select("*"),
      supabase.from("package_hotel_rates").select("*"),
      supabase.from("package_optional_tours").select("*"),
      supabase.from("package_transportation").select(`
        *,
        transportation_mode:transportation_mode_id (*)
      `),
      supabase.from("transportation_modes").select("*"),
    ]);

    state.destinations = (destinations || []).map((dest) => ({
      ...dest,
      images: (images || []).filter((img) => img.destination_id === dest.id),
      packages: (packages || [])
        .filter((p) => p.destination_id === dest.id)
        .map((pkg) => ({
          ...pkg,
          inclusions: (inclusions || [])
            .filter((inc) => inc.package_id === pkg.id)
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
          exclusions: (exclusions || [])
            .filter((exc) => exc.package_id === pkg.id)
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
          itineraries: (itineraries || [])
            .filter((iti) => iti.package_id === pkg.id)
            .sort((a, b) => (a.day_number || 0) - (b.day_number || 0)),
          package_hotel_rates: (packageHotelRates || []).filter(
            (rate) => rate.package_id === pkg.id,
          ),
          optional_tours: (optionalTours || [])
            .filter((ot) =>
              (packageOptionalTours || [])
                .filter((pot) => pot.package_id === pkg.id)
                .map((pot) => pot.optional_tour_id)
                .includes(ot.id),
            )
            .map((ot) => ({
              ...ot,
              rates: (optionalTourRates || []).filter(
                (r) => r.tour_id === ot.id,
              ),
              category: (optionalTourCategories || []).find(
                (c) => c.id === ot.category_id,
              ),
            })),
          transportation: (packageTransportation || [])
            .filter((t) => t.package_id === pkg.id)
            .map((t) => ({
              ...t,
              mode: transportationModes?.find(
                (m) => m.id === t.transportation_mode_id,
              ),
            })),
        })),
      hotel_categories: (hotelCategories || [])
        .filter((hc) => hc.destination_id === dest.id)
        .map((hc) => ({
          ...hc,
          hotels: (hotels || []).filter((h) => h.category_id === hc.id),
        }))
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
      optional_tours: (optionalTours || [])
        .filter((ot) => ot.destination_id === dest.id)
        .map((ot) => ({
          ...ot,
          rates: (optionalTourRates || []).filter((r) => r.tour_id === ot.id),
          category: (optionalTourCategories || []).find(
            (c) => c.id === ot.category_id,
          ),
        })),
    }));

    console.log("✅ Destinations fetched:", state.destinations.length);
    return state.destinations;
  } catch (error) {
    console.error("❌ Error fetching destinations:", error);
    showToast("Failed to load destinations", "error");
    return [];
  }
}

export async function fetchDestinationById(id) {
  try {
    const { data: destination, error: destError } = await supabase
      .from("destinations")
      .select("*")
      .eq("id", id)
      .single();
    if (destError) throw destError;

    const [
      { data: images },
      { data: packages },
      { data: inclusions },
      { data: exclusions },
      { data: itineraries },
      { data: hotelCategories },
      { data: hotels },
      { data: optionalTours },
      { data: optionalTourRates },
      { data: optionalTourCategories },
      { data: packageHotelRates },
      { data: packageOptionalTours },
      { data: packageTransportation },
      { data: transportationModes },
    ] = await Promise.all([
      supabase.from("destination_images").select("*").eq("destination_id", id),
      supabase
        .from("destination_packages")
        .select("*")
        .eq("destination_id", id),
      supabase.from("package_inclusions").select("*"),
      supabase.from("package_exclusions").select("*"),
      supabase.from("package_itineraries").select("*"),
      supabase.from("hotel_categories").select("*").eq("destination_id", id),
      supabase.from("hotels").select("*"),
      supabase.from("optional_tours").select("*").eq("destination_id", id),
      supabase.from("optional_tour_rates").select("*"),
      supabase.from("optional_tour_categories").select("*"),
      supabase.from("package_hotel_rates").select("*"),
      supabase.from("package_optional_tours").select("*"),
      supabase.from("package_transportation").select(`
        *,
        transportation_mode:transportation_mode_id (*)
      `),
      supabase.from("transportation_modes").select("*"),
    ]);

    return {
      ...destination,
      images: images || [],
      packages: (packages || []).map((pkg) => ({
        ...pkg,
        inclusions: (inclusions || [])
          .filter((inc) => inc.package_id === pkg.id)
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
        exclusions: (exclusions || [])
          .filter((exc) => exc.package_id === pkg.id)
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
        itineraries: (itineraries || [])
          .filter((iti) => iti.package_id === pkg.id)
          .sort((a, b) => (a.day_number || 0) - (b.day_number || 0)),
        package_hotel_rates: (packageHotelRates || []).filter(
          (rate) => rate.package_id === pkg.id,
        ),
        optional_tours: (optionalTours || [])
          .filter((ot) =>
            (packageOptionalTours || [])
              .filter((pot) => pot.package_id === pkg.id)
              .map((pot) => pot.optional_tour_id)
              .includes(ot.id),
          )
          .map((ot) => ({
            ...ot,
            rates: (optionalTourRates || []).filter((r) => r.tour_id === ot.id),
            category: (optionalTourCategories || []).find(
              (c) => c.id === ot.category_id,
            ),
          })),
        transportation: (packageTransportation || [])
          .filter((t) => t.package_id === pkg.id)
          .map((t) => ({
            ...t,
            mode: transportationModes?.find(
              (m) => m.id === t.transportation_mode_id,
            ),
          })),
      })),
      hotel_categories: (hotelCategories || [])
        .map((hc) => ({
          ...hc,
          hotels: (hotels || []).filter((h) => h.category_id === hc.id),
        }))
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
      optional_tours: (optionalTours || []).map((ot) => ({
        ...ot,
        rates: (optionalTourRates || []).filter((r) => r.tour_id === ot.id),
        category: (optionalTourCategories || []).find(
          (c) => c.id === ot.category_id,
        ),
      })),
    };
  } catch (error) {
    console.error("Error fetching destination by ID:", error);
    showToast("Failed to load destination details", "error");
    return null;
  }
}

export async function createDestination(formData) {
  try {
    showLoading(true, "Creating destination...");
    const { data, error } = await supabase
      .from("destinations")
      .insert([
        {
          name: formData.name,
          description: formData.description || null,
          airport_code: formData.airport_code || null,
          airport_name: formData.airport_name || null,
          country: formData.country || "Philippines",
          is_active: true,
        },
      ])
      .select();
    if (error) throw error;

    if (formData.image_file) {
      await uploadDestinationImage(
        data[0].id,
        formData.image_file,
        formData.name,
      );
    }
    await fetchDestinations();
    showToast(
      `✅ Destination "${formData.name}" created successfully!`,
      "success",
    );
    return data[0];
  } catch (error) {
    console.error("Error creating destination:", error);
    showToast("❌ Failed to create destination: " + error.message, "error");
    return null;
  } finally {
    showLoading(false);
  }
}
export async function updateDestination(id, formData) {
  try {
    showLoading(true, "Updating destination...");
    const { data, error } = await supabase
      .from("destinations")
      .update({
        name: formData.name,
        description: formData.description,
        airport_code: formData.airport_code,
        airport_name: formData.airport_name,
        country: formData.country || "Philippines",
        is_active: formData.is_active,
        updated_at: new Date(),
      })
      .eq("id", id)
      .select();
    if (error) throw error;

    await fetchDestinations();
    showToast(
      `✅ Destination "${formData.name}" updated successfully!`,
      "success",
    );
    return data[0];
  } catch (error) {
    console.error("Error updating destination:", error);
    showToast("❌ Failed to update destination: " + error.message, "error");
    return null;
  } finally {
    showLoading(false);
  }
}

export async function deleteDestination(id) {
  showConfirmDialog(
    "⚠️ Are you sure you want to delete this destination? All related data will also be deleted.",
    async () => {
      try {
        showLoading(true, "Deleting destination...");
        const { error } = await supabase
          .from("destinations")
          .delete()
          .eq("id", id);
        if (error) throw error;
        await fetchDestinations();
        showToast("✅ Destination deleted successfully!", "success");
        await refreshDestinationsPage();
      } catch (error) {
        console.error("Error deleting destination:", error);
        showToast("❌ Failed to delete destination: " + error.message, "error");
      } finally {
        showLoading(false);
      }
    },
  );
}

export async function createPackage(formData) {
  try {
    showLoading(true, "Creating package...");

    // Get destination to validate if needed
    const { data: destination, error: destError } = await supabase
      .from("destinations")
      .select("country")
      .eq("id", parseInt(formData.destination_id))
      .single();

    if (destError) throw destError;

    // Get the selected subcategory from form
    let tourCategory = formData.tour_category || "Land Tours";

    // Optional: Validate that Domestic is only for Philippines
    if (tourCategory === "Domestic" && destination.country !== "Philippines") {
      showToast(
        "Domestic packages can only be created for Philippines destinations",
        "error",
      );
      showLoading(false);
      return null;
    }

    // Insert package
    const { data, error } = await supabase
      .from("destination_packages")
      .insert([
        {
          destination_id: parseInt(formData.destination_id),
          package_code: formData.package_code,
          package_name: formData.package_name,
          tour_category: tourCategory,
          has_extra_night: formData.has_extra_night || false,
          base_price: formData.base_price ? parseFloat(formData.base_price) : 0,
          markup_percent: formData.markup_percent
            ? parseFloat(formData.markup_percent)
            : 0,
          tax_included: formData.tax_included === "true",
          transportation_notes: formData.transportation_notes || null,
          is_active: true,
        },
      ])
      .select();
    if (error) throw error;

    const newPackage = data[0];

    // Create inclusions
    if (formData.inclusions && formData.inclusions.trim()) {
      const inclusions = parseTextareaToArray(formData.inclusions);
      for (let i = 0; i < inclusions.length; i++) {
        await supabase.from("package_inclusions").insert([
          {
            package_id: newPackage.id,
            inclusion_text: inclusions[i],
            display_order: i,
          },
        ]);
      }
    }

    // Create exclusions
    if (formData.exclusions && formData.exclusions.trim()) {
      const exclusions = parseTextareaToArray(formData.exclusions);
      for (let i = 0; i < exclusions.length; i++) {
        await supabase.from("package_exclusions").insert([
          {
            package_id: newPackage.id,
            exclusion_text: exclusions[i],
            display_order: i,
          },
        ]);
      }
    }

    // Create itineraries
    if (formData.itineraries && formData.itineraries.length > 0) {
      for (let i = 0; i < formData.itineraries.length; i++) {
        if (formData.itineraries[i].trim()) {
          const insertData = {
            package_id: newPackage.id,
            day_number: i + 1,
            day_title: formData.itineraries[i],
            display_order: i + 1,
          };

          await supabase.from("package_itineraries").insert([insertData]);
        }
      }
    }

    // Create hotel rates if provided - UPDATED WITH ALL PAX COLUMNS
    if (formData.hotel_rates && Object.keys(formData.hotel_rates).length > 0) {
      for (const [categoryId, rates] of Object.entries(formData.hotel_rates)) {
        if (Object.values(rates).some((val) => val)) {
          await supabase.from("package_hotel_rates").insert([
            {
              package_id: newPackage.id,
              hotel_category_id: parseInt(categoryId),
              rate_solo: rates.rate_solo ? parseFloat(rates.rate_solo) : null,
              rate_2pax: rates.rate_2pax ? parseFloat(rates.rate_2pax) : null,
              rate_3pax: rates.rate_3pax ? parseFloat(rates.rate_3pax) : null,
              rate_4pax: rates.rate_4pax ? parseFloat(rates.rate_4pax) : null,
              rate_5pax: rates.rate_5pax ? parseFloat(rates.rate_5pax) : null,
              rate_6pax: rates.rate_6pax ? parseFloat(rates.rate_6pax) : null,
              rate_7pax: rates.rate_7pax ? parseFloat(rates.rate_7pax) : null,
              rate_8pax: rates.rate_8pax ? parseFloat(rates.rate_8pax) : null,
              rate_9pax: rates.rate_9pax ? parseFloat(rates.rate_9pax) : null,
              rate_10pax: rates.rate_10pax
                ? parseFloat(rates.rate_10pax)
                : null,
              rate_11pax: rates.rate_11pax
                ? parseFloat(rates.rate_11pax)
                : null,
              rate_12pax: rates.rate_12pax
                ? parseFloat(rates.rate_12pax)
                : null,
              rate_13pax: rates.rate_13pax
                ? parseFloat(rates.rate_13pax)
                : null,
              rate_14pax: rates.rate_14pax
                ? parseFloat(rates.rate_14pax)
                : null,
              rate_15pax: rates.rate_15pax
                ? parseFloat(rates.rate_15pax)
                : null,
              rate_child_no_breakfast: rates.rate_child_no_breakfast
                ? parseFloat(rates.rate_child_no_breakfast)
                : null,
              extra_night_solo: rates.extra_night_solo
                ? parseFloat(rates.extra_night_solo)
                : null,
              extra_night_2pax: rates.extra_night_2pax
                ? parseFloat(rates.extra_night_2pax)
                : null,
              extra_night_3pax: rates.extra_night_3pax
                ? parseFloat(rates.extra_night_3pax)
                : null,
              extra_night_4pax: rates.extra_night_4pax
                ? parseFloat(rates.extra_night_4pax)
                : null,
              extra_night_5pax: rates.extra_night_5pax
                ? parseFloat(rates.extra_night_5pax)
                : null,
              extra_night_6pax: rates.extra_night_6pax
                ? parseFloat(rates.extra_night_6pax)
                : null,
              extra_night_7pax: rates.extra_night_7pax
                ? parseFloat(rates.extra_night_7pax)
                : null,
              extra_night_8pax: rates.extra_night_8pax
                ? parseFloat(rates.extra_night_8pax)
                : null,
              extra_night_9pax: rates.extra_night_9pax
                ? parseFloat(rates.extra_night_9pax)
                : null,
              extra_night_10pax: rates.extra_night_10pax
                ? parseFloat(rates.extra_night_10pax)
                : null,
              extra_night_11pax: rates.extra_night_11pax
                ? parseFloat(rates.extra_night_11pax)
                : null,
              extra_night_12pax: rates.extra_night_12pax
                ? parseFloat(rates.extra_night_12pax)
                : null,
              extra_night_13pax: rates.extra_night_13pax
                ? parseFloat(rates.extra_night_13pax)
                : null,
              extra_night_14pax: rates.extra_night_14pax
                ? parseFloat(rates.extra_night_14pax)
                : null,
              extra_night_15pax: rates.extra_night_15pax
                ? parseFloat(rates.extra_night_15pax)
                : null,
              extra_night_child_no_breakfast:
                rates.extra_night_child_no_breakfast
                  ? parseFloat(rates.extra_night_child_no_breakfast)
                  : null,
              breakfast_included: rates.breakfast_included === "true",
            },
          ]);
        }
      }
    }

    // Link selected optional tours
    if (formData.selected_tours && formData.selected_tours.length > 0) {
      for (let i = 0; i < formData.selected_tours.length; i++) {
        await supabase.from("package_optional_tours").insert([
          {
            package_id: newPackage.id,
            optional_tour_id: parseInt(formData.selected_tours[i]),
            display_order: i,
          },
        ]);
      }
    }

    // Create transportation
    if (formData.transportation && formData.transportation.length > 0) {
      for (let i = 0; i < formData.transportation.length; i++) {
        const trans = formData.transportation[i];
        await supabase.from("package_transportation").insert([
          {
            package_id: newPackage.id,
            transportation_mode_id: trans.mode_id,
            description: trans.description,
            is_included: trans.included === "true",
            display_order: i,
          },
        ]);
      }
    }

    await fetchDestinations();
    showToast(
      `✅ Package "${formData.package_name}" created successfully!`,
      "success",
    );
    return newPackage;
  } catch (error) {
    console.error("Error creating package:", error);
    showToast("❌ Failed to create package: " + error.message, "error");
    return null;
  } finally {
    showLoading(false);
  }
}
export async function updatePackage(id, formData) {
  try {
    showLoading(true, "Updating package...");

    console.log("📥 Received update data:", formData);

    // Get package and destination info
    const { data: packageData, error: packageFetchError } = await supabase
      .from("destination_packages")
      .select("destination_id")
      .eq("id", id)
      .single();

    if (packageFetchError) throw packageFetchError;

    const destinationId = packageData?.destination_id;

    const { data: destData } = await supabase
      .from("destinations")
      .select("country")
      .eq("id", destinationId)
      .single();

    const destinationType =
      destData?.country === "Philippines" ? "local" : "international";

    // ========== 1. UPDATE MAIN PACKAGE INFO ==========
    const { data: updatedData, error: packageError } = await supabase
      .from("destination_packages")
      .update({
        package_code: formData.package_code,
        package_name: formData.package_name,
        tour_category: formData.tour_category,
        has_extra_night: String(formData.has_extra_night) === "true",
        base_price: formData.base_price ? parseFloat(formData.base_price) : 0,
        markup_percent: formData.markup_percent
          ? parseFloat(formData.markup_percent)
          : 0,
        tax_included: String(formData.tax_included) === "true",
        is_active: String(formData.is_active) === "true",
        updated_at: new Date(),
      })
      .eq("id", id)
      .select();

    console.log("📦 UPDATE RESPONSE - Full response:", {
      updatedData,
      error: packageError,
    });

    if (packageError) {
      console.error("❌ PACKAGE UPDATE ERROR:", packageError);
      throw packageError;
    }

    console.log("✅ Package basic info updated");
    console.log("📊 UPDATED DATA FROM DB:", updatedData);

    // ========== 2. HANDLE INCLUSIONS DELETION ==========
    if (formData.delete_inclusions) {
      const idsToDelete = JSON.parse(formData.delete_inclusions);
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("package_inclusions")
          .delete()
          .in("id", idsToDelete);

        if (deleteError) throw deleteError;
        console.log(`✅ Deleted ${idsToDelete.length} inclusions`);
      }
    }

    // ========== 3. HANDLE INCLUSIONS UPDATES ==========
    if (formData.update_inclusions) {
      const updates = JSON.parse(formData.update_inclusions);
      console.log("🔄 Updating inclusions:", updates);

      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("package_inclusions")
          .update({
            inclusion_text: update.text,
          })
          .eq("id", update.id);

        if (updateError) {
          console.error(
            `❌ Error updating inclusion ${update.id}:`,
            updateError,
          );
          throw updateError;
        }
        console.log(`✅ Updated inclusion ${update.id}`);
      }
    }

    // ========== 4. HANDLE EXCLUSIONS DELETION ==========
    if (formData.delete_exclusions) {
      const idsToDelete = JSON.parse(formData.delete_exclusions);
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("package_exclusions")
          .delete()
          .in("id", idsToDelete);

        if (deleteError) throw deleteError;
        console.log(`✅ Deleted ${idsToDelete.length} exclusions`);
      }
    }

    // ========== 5. HANDLE EXCLUSIONS UPDATES ==========
    if (formData.update_exclusions) {
      const updates = JSON.parse(formData.update_exclusions);
      console.log("🔄 Updating exclusions:", updates);

      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("package_exclusions")
          .update({
            exclusion_text: update.text,
          })
          .eq("id", update.id);

        if (updateError) {
          console.error(
            `❌ Error updating exclusion ${update.id}:`,
            updateError,
          );
          throw updateError;
        }
        console.log(`✅ Updated exclusion ${update.id}`);
      }
    }

    // ========== 6. HANDLE EDITED TOURS ==========
    if (formData.edited_tours) {
      const editedTours = JSON.parse(formData.edited_tours);
      for (const tour of editedTours) {
        await supabase
          .from("optional_tours")
          .update({
            tour_name: tour.name,
            duration_hours: tour.duration,
            itinerary: tour.itinerary
              ? tour.itinerary.split(",").map((i) => i.trim())
              : [],
            category_id: await getCategoryIdByName(
              tour.category,
              destinationType,
            ),
            updated_at: new Date(),
          })
          .eq("id", tour.id);

        await supabase
          .from("optional_tour_rates")
          .update({
            rate_solo: tour.rate_solo || null,
            rate_2pax: tour.rate_2pax || null,
            rate_4pax: tour.rate_4pax || null,
            rate_8pax: tour.rate_8pax || null,
            updated_at: new Date(),
          })
          .eq("tour_id", tour.id);
      }
    }

    // ========== 7. HANDLE NEW TOURS ==========
    if (formData.new_tours) {
      const newTours = JSON.parse(formData.new_tours);
      for (const tour of newTours) {
        const { data: newTour } = await supabase
          .from("optional_tours")
          .insert([
            {
              destination_id: destinationId,
              tour_name: tour.name,
              duration_hours: tour.duration,
              itinerary: tour.itinerary
                ? tour.itinerary.split(",").map((i) => i.trim())
                : [],
              category_id: await getCategoryIdByName(
                tour.category,
                destinationType,
              ),
              is_active: true,
            },
          ])
          .select()
          .single();

        if (newTour) {
          await supabase.from("optional_tour_rates").insert([
            {
              tour_id: newTour.id,
              rate_solo: tour.rate_solo || null,
              rate_2pax: tour.rate_2pax || null,
              rate_4pax: tour.rate_4pax || null,
              rate_8pax: tour.rate_8pax || null,
            },
          ]);

          await supabase.from("package_optional_tours").insert([
            {
              package_id: id,
              optional_tour_id: newTour.id,
              display_order: 999,
            },
          ]);
        }
      }
    }

    // ========== 8. HANDLE TRANSPORTATION ==========
    if (formData.transportation) {
      await supabase
        .from("package_transportation")
        .delete()
        .eq("package_id", id);

      const transportation = JSON.parse(formData.transportation);
      for (const trans of transportation) {
        await supabase.from("package_transportation").insert([
          {
            package_id: id,
            transportation_mode_id: trans.mode_id,
            description: trans.description,
            is_included: trans.included === "true",
            display_order: trans.display_order,
          },
        ]);
      }
      console.log("✅ Transportation updated");
    }

    // ========== 9. HANDLE ITINERARIES - FIXED TO REPLACE NOT APPEND ==========
    if (formData.update_itineraries === "true") {
      console.log("🔄 Updating itineraries - replacing all existing");

      // Delete ALL existing itineraries for this package
      const { error: deleteError } = await supabase
        .from("package_itineraries")
        .delete()
        .eq("package_id", id);

      if (deleteError) {
        console.error("❌ Error deleting existing itineraries:", deleteError);
        throw deleteError;
      }

      console.log("✅ Deleted existing itineraries");

      // Parse the new itineraries
      let itineraries = {};
      try {
        itineraries = JSON.parse(formData.itineraries || "{}");
        console.log("📦 Parsed itineraries:", itineraries);
      } catch (e) {
        console.error("❌ Error parsing itineraries:", e);
      }

      // Insert new itineraries if there are any
      if (Object.keys(itineraries).length > 0) {
        const itineraryInserts = [];

        for (const [dayNumStr, itiData] of Object.entries(itineraries)) {
          const dayNum = parseInt(dayNumStr);

          // Prepare insert data
          const insertData = {
            package_id: id,
            day_number: dayNum,
            day_title: itiData.day_title || `Day ${dayNum}`,
            display_order: dayNum,
          };

          // Add day_description if it exists and is not empty
          if (
            itiData.day_description &&
            Array.isArray(itiData.day_description) &&
            itiData.day_description.length > 0
          ) {
            insertData.day_description = itiData.day_description;
          }

          // Add meals_included if needed (from your existing structure)
          if (itiData.meals_included) {
            insertData.meals_included = itiData.meals_included;
          }

          itineraryInserts.push(insertData);
        }

        if (itineraryInserts.length > 0) {
          console.log("📝 Inserting new itineraries:", itineraryInserts);

          const { error: insertError } = await supabase
            .from("package_itineraries")
            .insert(itineraryInserts);

          if (insertError) {
            console.error("❌ Error inserting new itineraries:", insertError);
            throw insertError;
          }

          console.log(`✅ Inserted ${itineraryInserts.length} new itineraries`);
        }
      } else {
        console.log(
          "📝 No itineraries to insert - package will have no itinerary",
        );
      }

      console.log("✅ Itineraries updated successfully (replaced)");
    }
    // ========== 10. HANDLE HOTEL RATES WITH ADDITIONAL INFO ==========
    if (formData.hotel_rates_data) {
      const hotelRatesData = JSON.parse(formData.hotel_rates_data);

      for (const rateData of hotelRatesData) {
        const { data: existing } = await supabase
          .from("package_hotel_rates")
          .select("id")
          .eq("package_id", id)
          .eq("hotel_category_id", rateData.hotel_category_id)
          .maybeSingle();

        if (existing) {
          // UPDATE existing rate - INCLUDING ADDITIONAL INFO
          const { error } = await supabase
            .from("package_hotel_rates")
            .update({
              season: rateData.season || null,
              sneak: rateData.sneak || null,
              duration: rateData.duration || null,
              rate_solo: rateData.rate_solo || null,
              rate_2pax: rateData.rate_2pax || null,
              rate_3pax: rateData.rate_3pax || null,
              rate_4pax: rateData.rate_4pax || null,
              rate_5pax: rateData.rate_5pax || null,
              rate_6pax: rateData.rate_6pax || null,
              rate_7pax: rateData.rate_7pax || null,
              rate_8pax: rateData.rate_8pax || null,
              rate_9pax: rateData.rate_9pax || null,
              rate_10pax: rateData.rate_10pax || null,
              rate_11pax: rateData.rate_11pax || null,
              rate_12pax: rateData.rate_12pax || null,
              rate_13pax: rateData.rate_13pax || null,
              rate_14pax: rateData.rate_14pax || null,
              rate_15pax: rateData.rate_15pax || null,
              rate_child_no_breakfast: rateData.rate_child_no_breakfast || null,
              extra_night_solo: rateData.extra_night_solo || null,
              extra_night_2pax: rateData.extra_night_2pax || null,
              extra_night_3pax: rateData.extra_night_3pax || null,
              extra_night_4pax: rateData.extra_night_4pax || null,
              extra_night_5pax: rateData.extra_night_5pax || null,
              extra_night_6pax: rateData.extra_night_6pax || null,
              extra_night_7pax: rateData.extra_night_7pax || null,
              extra_night_8pax: rateData.extra_night_8pax || null,
              extra_night_9pax: rateData.extra_night_9pax || null,
              extra_night_10pax: rateData.extra_night_10pax || null,
              extra_night_11pax: rateData.extra_night_11pax || null,
              extra_night_12pax: rateData.extra_night_12pax || null,
              extra_night_13pax: rateData.extra_night_13pax || null,
              extra_night_14pax: rateData.extra_night_14pax || null,
              extra_night_15pax: rateData.extra_night_15pax || null,
              extra_night_child_no_breakfast:
                rateData.extra_night_child_no_breakfast || null,
              breakfast_included: rateData.breakfast_included === true,
              breakfast_notes: rateData.breakfast_notes || null,
              additional_info: rateData.additional_info || null, // <-- ADDITIONAL INFO
              updated_at: new Date(),
            })
            .eq("id", existing.id);

          if (error) throw error;
          console.log(
            `✅ Updated hotel rate for category ${rateData.hotel_category_id} (with additional info)`,
          );
        } else {
          // INSERT new rate - INCLUDING ADDITIONAL INFO
          const { error } = await supabase.from("package_hotel_rates").insert([
            {
              package_id: id,
              hotel_category_id: rateData.hotel_category_id,
              season: rateData.season || null,
              sneak: rateData.sneak || null,
              duration: rateData.duration || null,
              rate_solo: rateData.rate_solo || null,
              rate_2pax: rateData.rate_2pax || null,
              rate_3pax: rateData.rate_3pax || null,
              rate_4pax: rateData.rate_4pax || null,
              rate_5pax: rateData.rate_5pax || null,
              rate_6pax: rateData.rate_6pax || null,
              rate_7pax: rateData.rate_7pax || null,
              rate_8pax: rateData.rate_8pax || null,
              rate_9pax: rateData.rate_9pax || null,
              rate_10pax: rateData.rate_10pax || null,
              rate_11pax: rateData.rate_11pax || null,
              rate_12pax: rateData.rate_12pax || null,
              rate_13pax: rateData.rate_13pax || null,
              rate_14pax: rateData.rate_14pax || null,
              rate_15pax: rateData.rate_15pax || null,
              rate_child_no_breakfast: rateData.rate_child_no_breakfast || null,
              extra_night_solo: rateData.extra_night_solo || null,
              extra_night_2pax: rateData.extra_night_2pax || null,
              extra_night_3pax: rateData.extra_night_3pax || null,
              extra_night_4pax: rateData.extra_night_4pax || null,
              extra_night_5pax: rateData.extra_night_5pax || null,
              extra_night_6pax: rateData.extra_night_6pax || null,
              extra_night_7pax: rateData.extra_night_7pax || null,
              extra_night_8pax: rateData.extra_night_8pax || null,
              extra_night_9pax: rateData.extra_night_9pax || null,
              extra_night_10pax: rateData.extra_night_10pax || null,
              extra_night_11pax: rateData.extra_night_11pax || null,
              extra_night_12pax: rateData.extra_night_12pax || null,
              extra_night_13pax: rateData.extra_night_13pax || null,
              extra_night_14pax: rateData.extra_night_14pax || null,
              extra_night_15pax: rateData.extra_night_15pax || null,
              extra_night_child_no_breakfast:
                rateData.extra_night_child_no_breakfast || null,
              breakfast_included: rateData.breakfast_included === true,
              breakfast_notes: rateData.breakfast_notes || null,
              additional_info: rateData.additional_info || null, // <-- ADDITIONAL INFO
            },
          ]);

          if (error) throw error;
          console.log(
            `✅ Inserted new hotel rate for category ${rateData.hotel_category_id} (with additional info)`,
          );
        }
      }
    }

    await fetchDestinations();
    showToast("✅ Package updated successfully!", "success");
    return true;
  } catch (error) {
    console.error("❌ Error updating package:", error);
    showToast("❌ Failed to update package: " + error.message, "error");
    return null;
  } finally {
    showLoading(false);
  }
}

export async function confirmDeletePackage(id) {
  showConfirmDialog("⚠️ Delete this package?", async () => {
    try {
      showLoading(true, "Deleting package...");
      const { error } = await supabase
        .from("destination_packages")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await fetchDestinations();
      showToast("✅ Package deleted successfully!", "success");
      await refreshDestinationsPage();
    } catch (error) {
      console.error("Error deleting package:", error);
      showToast("❌ Failed to delete package: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  });
}

// =====================================================
// HOTEL CATEGORY CRUD OPERATIONS
// =====================================================

export async function createHotelCategory(formData) {
  try {
    showLoading(true, "Creating hotel category...");
    const { data, error } = await supabase
      .from("hotel_categories")
      .insert([
        {
          destination_id: parseInt(formData.destination_id),
          category_name: formData.category_name,
          display_order: parseInt(formData.display_order) || 99,
          has_breakfast: formData.has_breakfast === "true",
          breakfast_note: formData.breakfast_note || null,
          max_room_capacity: parseInt(formData.max_room_capacity) || 4,
        },
      ])
      .select();
    if (error) throw error;
    await fetchDestinations();
    showToast(
      `✅ Hotel category "${formData.category_name}" created!`,
      "success",
    );
    return data[0];
  } catch (error) {
    console.error("Error creating hotel category:", error);
    showToast("❌ Failed to create hotel category: " + error.message, "error");
    return null;
  } finally {
    showLoading(false);
  }
}

export async function updateHotelCategory(id, formData) {
  try {
    showLoading(true, "Updating hotel category...");
    const { error } = await supabase
      .from("hotel_categories")
      .update({
        category_name: formData.category_name,
        display_order: parseInt(formData.display_order) || 99,
        has_breakfast: formData.has_breakfast === "true",
        breakfast_note: formData.breakfast_note || null,
        max_room_capacity: parseInt(formData.max_room_capacity) || 4,
        updated_at: new Date(),
      })
      .eq("id", id);
    if (error) throw error;
    await fetchDestinations();
    showToast("✅ Hotel category updated!", "success");
    return true;
  } catch (error) {
    console.error("Error updating hotel category:", error);
    showToast("❌ Failed to update hotel category: " + error.message, "error");
    return null;
  } finally {
    showLoading(false);
  }
}

export async function deleteHotelCategory(id) {
  showConfirmDialog("Delete this hotel category?", async () => {
    try {
      showLoading(true, "Deleting hotel category...");
      const { error } = await supabase
        .from("hotel_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await fetchDestinations();
      showToast("✅ Hotel category deleted!", "success");
      await refreshDestinationsPage();
    } catch (error) {
      console.error("Error deleting hotel category:", error);
      showToast(
        "❌ Failed to delete hotel category: " + error.message,
        "error",
      );
    } finally {
      showLoading(false);
    }
  });
}

// =====================================================
// HOTEL CRUD OPERATIONS
// =====================================================

// =====================================================
// HOTEL CRUD OPERATIONS
// =====================================================

// Create hotel
export async function createHotel(formData) {
  try {
    showLoading(true, "Adding hotel...");
    const { data, error } = await supabase
      .from("hotels")
      .insert([
        {
          category_id: parseInt(formData.category_id),
          name: formData.name,
          description: formData.description || null,
          max_capacity: formData.max_capacity
            ? parseInt(formData.max_capacity)
            : null,
          is_active: true,
          notes: formData.notes || null,
          image_url: formData.image_url || null,
        },
      ])
      .select();
    if (error) throw error;
    await fetchDestinations();
    showToast(`✅ Hotel "${formData.name}" added!`, "success");
    return data[0];
  } catch (error) {
    console.error("Error creating hotel:", error);
    showToast("❌ Failed to add hotel: " + error.message, "error");
    return null;
  } finally {
    showLoading(false);
  }
}

// Update hotel
export async function updateHotel(id, formData) {
  try {
    showLoading(true, "Updating hotel...");
    const updateData = {
      name: formData.name,
      description: formData.description || null,
      max_capacity: formData.max_capacity
        ? parseInt(formData.max_capacity)
        : null,
      is_active: formData.is_active === "true",
      notes: formData.notes || null,
      updated_at: new Date(),
    };
    if (formData.image_url) updateData.image_url = formData.image_url;
    const { error } = await supabase
      .from("hotels")
      .update(updateData)
      .eq("id", id);
    if (error) throw error;
    await fetchDestinations();
    showToast("✅ Hotel updated!", "success");
    return true;
  } catch (error) {
    console.error("Error updating hotel:", error);
    showToast("❌ Failed to update hotel: " + error.message, "error");
    return null;
  } finally {
    showLoading(false);
  }
}

// Delete hotel
export async function deleteHotel(id) {
  showConfirmDialog("Delete this hotel?", async () => {
    try {
      showLoading(true, "Deleting hotel...");
      const { error } = await supabase.from("hotels").delete().eq("id", id);
      if (error) throw error;
      await fetchDestinations();
      showToast("✅ Hotel deleted!", "success");
      await refreshDestinationsPage();
    } catch (error) {
      console.error("Error deleting hotel:", error);
      showToast("❌ Failed to delete hotel: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  });
}

export async function savePackageHotelRate(formData) {
  try {
    showLoading(true, "Saving rate...");

    const rateData = {
      package_id: parseInt(formData.package_id),
      hotel_category_id: parseInt(formData.hotel_category_id),
      season: formData.season || null,
      sneak: formData.sneak || null,
      duration: formData.duration || null,
      // Regular rates 1-15 pax
      rate_solo: formData.rate_solo ? parseFloat(formData.rate_solo) : null,
      rate_2pax: formData.rate_2pax ? parseFloat(formData.rate_2pax) : null,
      rate_3pax: formData.rate_3pax ? parseFloat(formData.rate_3pax) : null,
      rate_4pax: formData.rate_4pax ? parseFloat(formData.rate_4pax) : null,
      rate_5pax: formData.rate_5pax ? parseFloat(formData.rate_5pax) : null,
      rate_6pax: formData.rate_6pax ? parseFloat(formData.rate_6pax) : null,
      rate_7pax: formData.rate_7pax ? parseFloat(formData.rate_7pax) : null,
      rate_8pax: formData.rate_8pax ? parseFloat(formData.rate_8pax) : null,
      rate_9pax: formData.rate_9pax ? parseFloat(formData.rate_9pax) : null,
      rate_10pax: formData.rate_10pax ? parseFloat(formData.rate_10pax) : null,
      rate_11pax: formData.rate_11pax ? parseFloat(formData.rate_11pax) : null,
      rate_12pax: formData.rate_12pax ? parseFloat(formData.rate_12pax) : null,
      rate_13pax: formData.rate_13pax ? parseFloat(formData.rate_13pax) : null,
      rate_14pax: formData.rate_14pax ? parseFloat(formData.rate_14pax) : null,
      rate_15pax: formData.rate_15pax ? parseFloat(formData.rate_15pax) : null,
      rate_child_no_breakfast: formData.rate_child_no_breakfast
        ? parseFloat(formData.rate_child_no_breakfast)
        : null,
      // Extra night rates 1-15 pax
      extra_night_solo: formData.extra_night_solo
        ? parseFloat(formData.extra_night_solo)
        : null,
      extra_night_2pax: formData.extra_night_2pax
        ? parseFloat(formData.extra_night_2pax)
        : null,
      extra_night_3pax: formData.extra_night_3pax
        ? parseFloat(formData.extra_night_3pax)
        : null,
      extra_night_4pax: formData.extra_night_4pax
        ? parseFloat(formData.extra_night_4pax)
        : null,
      extra_night_5pax: formData.extra_night_5pax
        ? parseFloat(formData.extra_night_5pax)
        : null,
      extra_night_6pax: formData.extra_night_6pax
        ? parseFloat(formData.extra_night_6pax)
        : null,
      extra_night_7pax: formData.extra_night_7pax
        ? parseFloat(formData.extra_night_7pax)
        : null,
      extra_night_8pax: formData.extra_night_8pax
        ? parseFloat(formData.extra_night_8pax)
        : null,
      extra_night_9pax: formData.extra_night_9pax
        ? parseFloat(formData.extra_night_9pax)
        : null,
      extra_night_10pax: formData.extra_night_10pax
        ? parseFloat(formData.extra_night_10pax)
        : null,
      extra_night_11pax: formData.extra_night_11pax
        ? parseFloat(formData.extra_night_11pax)
        : null,
      extra_night_12pax: formData.extra_night_12pax
        ? parseFloat(formData.extra_night_12pax)
        : null,
      extra_night_13pax: formData.extra_night_13pax
        ? parseFloat(formData.extra_night_13pax)
        : null,
      extra_night_14pax: formData.extra_night_14pax
        ? parseFloat(formData.extra_night_14pax)
        : null,
      extra_night_15pax: formData.extra_night_15pax
        ? parseFloat(formData.extra_night_15pax)
        : null,
      extra_night_child_no_breakfast: formData.extra_night_child_no_breakfast
        ? parseFloat(formData.extra_night_child_no_breakfast)
        : null,
      breakfast_included: formData.breakfast_included === "true",
      breakfast_notes: formData.breakfast_notes || null,
      additional_info: formData.additional_info || null, // <-- ADDITIONAL INFO
      is_promo: formData.is_promo === "true",
      promo_name: formData.promo_name || null,
      validity_date: formData.validity_date || null,
    };

    // Check if rate already exists
    const { data: existing } = await supabase
      .from("package_hotel_rates")
      .select("id")
      .eq("package_id", rateData.package_id)
      .eq("hotel_category_id", rateData.hotel_category_id)
      .maybeSingle();

    if (existing) {
      // Update existing rate
      const { error } = await supabase
        .from("package_hotel_rates")
        .update({ ...rateData, updated_at: new Date() })
        .eq("id", existing.id);
      if (error) throw error;
      showToast("✅ Rate updated successfully!", "success");
    } else {
      // Insert new rate
      const { error } = await supabase
        .from("package_hotel_rates")
        .insert([rateData]);
      if (error) throw error;
      showToast("✅ Rate created successfully!", "success");
    }

    await fetchDestinations();
    return true;
  } catch (error) {
    console.error("Error saving package rate:", error);
    showToast("❌ Failed to save rate: " + error.message, "error");
    return null;
  } finally {
    showLoading(false);
  }
}

export async function deletePackageHotelRate(id) {
  showConfirmDialog("Delete this rate?", async () => {
    try {
      showLoading(true, "Deleting rate...");
      const { error } = await supabase
        .from("package_hotel_rates")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await fetchDestinations();
      showToast("✅ Rate deleted successfully!", "success");
      await refreshDestinationsPage();
    } catch (error) {
      console.error("Error deleting rate:", error);
      showToast("❌ Failed to delete rate: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  });
}

// =====================================================
// OPTIONAL TOUR CATEGORY CRUD OPERATIONS
// =====================================================

export async function fetchOptionalTourCategories(type = "all") {
  try {
    let query = supabase
      .from("optional_tour_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    if (type !== "all") query = query.eq("category_type", type);
    const { data, error } = await query;
    if (error) throw error;
    state.optionalTourCategories = data || [];
    state.localTourCategories = (data || []).filter(
      (c) => c.category_type === "local",
    );
    state.internationalTourCategories = (data || []).filter(
      (c) => c.category_type === "international",
    );
    return data || [];
  } catch (error) {
    console.error("Error fetching tour categories:", error);
    return [];
  }
}

export async function createOptionalTourCategory(formData) {
  try {
    const { data, error } = await supabase
      .from("optional_tour_categories")
      .insert([
        {
          name: formData.name,
          description: formData.description || null,
          display_order: parseInt(formData.display_order) || 0,
          category_type: formData.category_type || "local",
          destination_type: formData.destination_type || "all",
          is_active: true,
        },
      ])
      .select();
    if (error) throw error;
    await fetchOptionalTourCategories();
    showToast(`✅ Category "${formData.name}" created!`, "success");
    return data[0];
  } catch (error) {
    console.error("Error creating category:", error);
    showToast("❌ Failed to create category: " + error.message, "error");
    return null;
  }
}

export async function createOptionalTour(formData) {
  try {
    showLoading(true, "Creating optional tour...");

    // Parse itinerary from textarea (one per line)
    const itinerary = formData.itinerary
      ? formData.itinerary
          .split("\n")
          .map((i) => i.trim())
          .filter((i) => i)
      : [];

    // Parse inclusions from textarea (one per line)
    const inclusions = formData.inclusions
      ? formData.inclusions
          .split("\n")
          .map((i) => i.trim())
          .filter((i) => i)
      : [];

    // Parse exclusions from textarea (one per line)
    const exclusions = formData.exclusions
      ? formData.exclusions
          .split("\n")
          .map((i) => i.trim())
          .filter((i) => i)
      : [];

    const { data: tourData, error: tourError } = await supabase
      .from("optional_tours")
      .insert([
        {
          destination_id: parseInt(formData.destination_id),
          tour_name: formData.tour_name,
          duration_hours: formData.duration_hours,
          image_url: formData.image_url || null,
          itinerary: itinerary,
          inclusions: inclusions,
          exclusions: exclusions,
          is_active: true,
        },
      ])
      .select();
    if (tourError) throw tourError;

    // Insert rates if provided (rest of the code remains the same)
    if (tourData && tourData[0]) {
      const rateData = {
        tour_id: tourData[0].id,
        rate_solo: formData.rate_solo ? parseFloat(formData.rate_solo) : null,
        rate_2pax: formData.rate_2pax ? parseFloat(formData.rate_2pax) : null,
        rate_3pax: formData.rate_3pax ? parseFloat(formData.rate_3pax) : null,
        rate_4pax: formData.rate_4pax ? parseFloat(formData.rate_4pax) : null,
        rate_5pax: formData.rate_5pax ? parseFloat(formData.rate_5pax) : null,
        rate_6pax: formData.rate_6pax ? parseFloat(formData.rate_6pax) : null,
        rate_7pax: formData.rate_7pax ? parseFloat(formData.rate_7pax) : null,
        rate_8pax: formData.rate_8pax ? parseFloat(formData.rate_8pax) : null,
        rate_9pax: formData.rate_9pax ? parseFloat(formData.rate_9pax) : null,
        rate_10pax: formData.rate_10pax
          ? parseFloat(formData.rate_10pax)
          : null,
        rate_11pax: formData.rate_11pax
          ? parseFloat(formData.rate_11pax)
          : null,
        rate_12pax: formData.rate_12pax
          ? parseFloat(formData.rate_12pax)
          : null,
        rate_child_4_9: formData.rate_child_4_9
          ? parseFloat(formData.rate_child_4_9)
          : null,
      };

      // Only insert if at least one rate is provided
      if (
        Object.values(rateData).some((val) => val !== null && val !== undefined)
      ) {
        await supabase.from("optional_tour_rates").insert([rateData]);
      }
    }

    await fetchDestinations();
    showToast(
      `✅ Optional tour "${formData.tour_name}" created successfully!`,
      "success",
    );
    return tourData[0];
  } catch (error) {
    console.error("Error creating optional tour:", error);
    showToast("❌ Failed to create optional tour: " + error.message, "error");
    return null;
  } finally {
    showLoading(false);
  }
}

export async function fetchOptionalTourById(id) {
  try {
    console.log("🔍 Fetching optional tour by ID:", id);

    // Fetch tour with its rates in a single query
    const { data: tour, error } = await supabase
      .from("optional_tours")
      .select(
        `
        *,
        rates:optional_tour_rates(*)
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching tour:", error);
      throw error;
    }

    console.log("✅ Tour fetched:", tour);
    console.log("💰 Rates fetched:", tour?.rates);

    return tour;
  } catch (error) {
    console.error("Error in fetchOptionalTourById:", error);
    showToast("Failed to load optional tour", "error");
    return null;
  }
}
// DELETE Optional Tour
export async function deleteOptionalTour(id) {
  showConfirmDialog(
    "Delete this optional tour? This action cannot be undone.",
    async () => {
      try {
        showLoading(true, "Deleting optional tour...");

        // Delete rates first (foreign key constraint)
        await supabase.from("optional_tour_rates").delete().eq("tour_id", id);

        // Delete package associations
        await supabase
          .from("package_optional_tours")
          .delete()
          .eq("optional_tour_id", id);

        // Delete the tour
        const { error } = await supabase
          .from("optional_tours")
          .delete()
          .eq("id", id);
        if (error) throw error;

        await fetchDestinations();
        showToast("✅ Optional tour deleted successfully!", "success");
        await refreshDestinationsPage();
      } catch (error) {
        console.error("Error deleting optional tour:", error);
        showToast(
          "❌ Failed to delete optional tour: " + error.message,
          "error",
        );
      } finally {
        showLoading(false);
      }
    },
  );
}

// Link Tour to Package
export async function linkTourToPackage(packageId, tourId, displayOrder = 999) {
  try {
    // Check if already linked
    const { data: existing } = await supabase
      .from("package_optional_tours")
      .select("id")
      .eq("package_id", packageId)
      .eq("optional_tour_id", tourId)
      .maybeSingle();

    if (existing) {
      showToast("Tour already linked to this package", "warning");
      return false;
    }

    const { error } = await supabase.from("package_optional_tours").insert([
      {
        package_id: parseInt(packageId),
        optional_tour_id: parseInt(tourId),
        display_order: displayOrder,
      },
    ]);

    if (error) throw error;
    showToast("✅ Tour linked to package successfully!", "success");
    await fetchDestinations();
    return true;
  } catch (error) {
    console.error("Error linking tour to package:", error);
    showToast("❌ Failed to link tour: " + error.message, "error");
    return false;
  }
}

// Unlink Tour from Package
export async function unlinkTourFromPackage(packageId, tourId) {
  showConfirmDialog("Remove this tour from the package?", async () => {
    try {
      const { error } = await supabase
        .from("package_optional_tours")
        .delete()
        .eq("package_id", packageId)
        .eq("optional_tour_id", tourId);

      if (error) throw error;
      showToast("✅ Tour removed from package successfully!", "success");
      await fetchDestinations();
    } catch (error) {
      console.error("Error unlinking tour from package:", error);
      showToast("❌ Failed to remove tour: " + error.message, "error");
    }
  });
}
// =====================================================
// UPDATED getAvailableToursForPackage - WITHOUT category
// =====================================================

export async function getAvailableToursForPackage(packageId, destinationId) {
  try {
    // Get tours already linked to this package
    const { data: linkedTours } = await supabase
      .from("package_optional_tours")
      .select("optional_tour_id")
      .eq("package_id", packageId);

    const linkedIds = linkedTours?.map((t) => t.optional_tour_id) || [];

    // Get all active tours for this destination not already linked
    const { data: availableTours, error } = await supabase
      .from("optional_tours")
      .select(
        `
        *,
        rates:optional_tour_rates(*)
        // ❌ Removed category
      `,
      )
      .eq("destination_id", destinationId)
      .eq("is_active", true)
      .not("id", "in", `(${linkedIds.join(",")})`);

    if (error) throw error;
    return availableTours || [];
  } catch (error) {
    console.error("Error fetching available tours:", error);
    return [];
  }
}

// =====================================================
// PACKAGE ITINERARY CRUD OPERATIONS
// =====================================================

export async function addPackageItinerary(formData) {
  try {
    showLoading(true, "Adding itinerary...");

    // Prepare insert data
    const insertData = {
      package_id: parseInt(formData.package_id),
      day_number: parseInt(formData.day_number),
      day_title: formData.day_title,
      display_order:
        parseInt(formData.display_order) || parseInt(formData.day_number),
    };

    // Only add day_description if it has value
    if (formData.day_description && formData.day_description.trim()) {
      const descArray = formData.day_description
        .split("\n")
        .map((d) => d.trim())
        .filter((d) => d.length > 0);

      if (descArray.length > 0) {
        insertData.day_description = descArray;
      }
    }

    // Only add meals_included if it has value
    if (formData.meals_included && formData.meals_included.trim()) {
      insertData.meals_included = formData.meals_included;
    }

    const { data, error } = await supabase
      .from("package_itineraries")
      .insert([insertData])
      .select();

    if (error) throw error;

    await fetchDestinations();
    showToast("✅ Itinerary added successfully!", "success");
    return data[0];
  } catch (error) {
    console.error("Error adding itinerary:", error);
    showToast("❌ Failed to add itinerary: " + error.message, "error");
    return null;
  } finally {
    showLoading(false);
  }
}

export async function updatePackageItinerary(id, formData) {
  try {
    showLoading(true, "Updating itinerary...");

    // Prepare update data
    const updateData = {
      day_number: parseInt(formData.day_number),
      day_title: formData.day_title,
      display_order:
        parseInt(formData.display_order) || parseInt(formData.day_number),
      updated_at: new Date(),
    };

    // Only add day_description if it has value
    if (formData.day_description && formData.day_description.trim()) {
      const descArray = formData.day_description
        .split("\n")
        .map((d) => d.trim())
        .filter((d) => d.length > 0);

      if (descArray.length > 0) {
        updateData.day_description = descArray;
      }
    }

    // Only add meals_included if it has value
    if (formData.meals_included && formData.meals_included.trim()) {
      updateData.meals_included = formData.meals_included;
    }

    const { error } = await supabase
      .from("package_itineraries")
      .update(updateData)
      .eq("id", id);

    if (error) throw error;

    await fetchDestinations();
    showToast("✅ Itinerary updated successfully!", "success");
    return true;
  } catch (error) {
    console.error("Error updating itinerary:", error);
    showToast("❌ Failed to update itinerary: " + error.message, "error");
    return null;
  } finally {
    showLoading(false);
  }
}
// =====================================================
// PACKAGE INCLUSIONS/EXCLUSIONS DELETE FUNCTIONS
// =====================================================

// Toggle all inclusion checkboxes
window.toggleAllInclusions = function (selectAllCheckbox) {
  const checkboxes = document.querySelectorAll(".inclusion-checkbox");
  checkboxes.forEach((cb) => (cb.checked = selectAllCheckbox.checked));
};
window.toggleAllExclusions = function (selectAllCheckbox) {
  const checkboxes = document.querySelectorAll(".exclusion-checkbox");
  checkboxes.forEach((cb) => (cb.checked = selectAllCheckbox.checked));
};
// Delete selected inclusions
window.deleteSelectedInclusions = async function (packageId) {
  const selectedCheckboxes = document.querySelectorAll(
    ".inclusion-checkbox:checked",
  );
  const selectedIds = Array.from(selectedCheckboxes).map((cb) =>
    parseInt(cb.value),
  );

  if (selectedIds.length === 0) {
    showToast("No inclusions selected", "warning");
    return;
  }

  showConfirmDialog(
    `Delete ${selectedIds.length} selected inclusion(s)?`,
    async () => {
      try {
        showLoading(true, "Deleting selected inclusions...");

        const { error } = await supabase
          .from("package_inclusions")
          .delete()
          .in("id", selectedIds);

        if (error) throw error;

        await fetchDestinations();
        showToast(
          `✅ ${selectedIds.length} inclusion(s) deleted successfully!`,
          "success",
        );

        // Refresh the modal
        const modal = document.getElementById("editPackageModal");
        if (modal) {
          modal.remove();
          await openEditPackageModal(packageId);
        }
      } catch (error) {
        console.error("Error deleting inclusions:", error);
        showToast("❌ Failed to delete inclusions: " + error.message, "error");
      } finally {
        showLoading(false);
      }
    },
  );
};

// Delete selected exclusions
window.deleteSelectedExclusions = async function (packageId) {
  const selectedCheckboxes = document.querySelectorAll(
    ".exclusion-checkbox:checked",
  );
  const selectedIds = Array.from(selectedCheckboxes).map((cb) =>
    parseInt(cb.value),
  );

  if (selectedIds.length === 0) {
    showToast("No exclusions selected", "warning");
    return;
  }

  showConfirmDialog(
    `Delete ${selectedIds.length} selected exclusion(s)?`,
    async () => {
      try {
        showLoading(true, "Deleting selected exclusions...");

        const { error } = await supabase
          .from("package_exclusions")
          .delete()
          .in("id", selectedIds);

        if (error) throw error;

        await fetchDestinations();
        showToast(
          `✅ ${selectedIds.length} exclusion(s) deleted successfully!`,
          "success",
        );

        // Refresh the modal
        const modal = document.getElementById("editPackageModal");
        if (modal) {
          modal.remove();
          await openEditPackageModal(packageId);
        }
      } catch (error) {
        console.error("Error deleting exclusions:", error);
        showToast("❌ Failed to delete exclusions: " + error.message, "error");
      } finally {
        showLoading(false);
      }
    },
  );
};

window.deletePackageInclusion = async function (id) {
  showConfirmDialog("Delete this inclusion?", async () => {
    try {
      showLoading(true, "Deleting inclusion...");
      const { error } = await supabase
        .from("package_inclusions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await fetchDestinations();
      showToast("✅ Inclusion deleted successfully!", "success");
      const modal = document.getElementById("editPackageModal");
      if (modal) {
        const packageId = modal.querySelector('[name="package_id"]')?.value;
        if (packageId) {
          modal.remove();
          await openEditPackageModal(parseInt(packageId));
        }
      }
    } catch (error) {
      console.error("Error deleting inclusion:", error);
      showToast("❌ Failed to delete inclusion: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  });
};

window.deletePackageExclusion = async function (id) {
  showConfirmDialog("Delete this exclusion?", async () => {
    try {
      showLoading(true, "Deleting exclusion...");
      const { error } = await supabase
        .from("package_exclusions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await fetchDestinations();
      showToast("✅ Exclusion deleted successfully!", "success");
      const modal = document.getElementById("editPackageModal");
      if (modal) {
        const packageId = modal.querySelector('[name="package_id"]')?.value;
        if (packageId) {
          modal.remove();
          await openEditPackageModal(parseInt(packageId));
        }
      }
    } catch (error) {
      console.error("Error deleting exclusion:", error);
      showToast("❌ Failed to delete exclusion: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  });
};

window.deletePackageItinerary = async function (id) {
  showConfirmDialog("Delete this itinerary day?", async () => {
    try {
      showLoading(true, "Deleting itinerary...");
      const { error } = await supabase
        .from("package_itineraries")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await fetchDestinations();
      showToast("✅ Itinerary deleted successfully!", "success");
      const modal = document.getElementById("editPackageModal");
      if (modal) {
        const packageId = modal.querySelector('[name="package_id"]')?.value;
        if (packageId) {
          modal.remove();
          await openEditPackageModal(parseInt(packageId));
        }
      }
    } catch (error) {
      console.error("Error deleting itinerary:", error);
      showToast("❌ Failed to delete itinerary: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  });
};

export function openBulkRateEditModal(packageId) {
  let pkg = null;
  let destination = null;
  for (const dest of state.destinations) {
    const found = dest.packages?.find((p) => p.id === packageId);
    if (found) {
      pkg = found;
      destination = dest;
      break;
    }
  }
  if (!pkg || !destination) {
    showToast("Package not found", "error");
    return;
  }

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";
  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-7xl w-full shadow-2xl transform transition-all flex flex-col" style="max-height: 90vh;">
      <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 flex-shrink-0">
        <div class="absolute inset-0 bg-black/10"></div>
        <div class="relative px-6 py-5">
          <div class="flex items-center gap-4">
            <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/30">
              <i class="fas fa-tags text-2xl text-white"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-white tracking-tight">Bulk Edit Hotel Rates</h3>
              <p class="text-indigo-100 text-sm mt-1">${pkg.package_name}</p>
            </div>
            <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl">&times;</button>
          </div>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-6">
        <form id="bulkRateEditForm" class="space-y-6">
          <input type="hidden" name="package_id" value="${packageId}">
          <div class="space-y-4">
            ${destination.hotel_categories
              ?.map((cat) => {
                const rate =
                  pkg.package_hotel_rates?.find(
                    (r) => r.hotel_category_id === cat.id,
                  ) || {};
                return `
                <div class="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border-2 border-gray-200">
                  <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <div class="h-6 w-6 bg-indigo-100 rounded flex items-center justify-center">
                      <i class="fas fa-hotel text-indigo-600 text-xs"></i>
                    </div>
                    ${cat.category_name}
                  </h4>
                  
                  <!-- Season and Sneak Fields -->
                  <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">Season</label>
                      <input type="text" name="rates[${cat.id}][season]" value="${rate.season || ""}" 
                             class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                             placeholder="e.g., Peak Season 2024">
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">Sneak</label>
                      <input type="text" name="rates[${cat.id}][sneak]" value="${rate.sneak || ""}" 
                             class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                             placeholder="e.g., SNK001">
                    </div>
                  </div>
                  
                  <!-- Regular Rates 1-15 Pax -->
                  <div class="mb-4">
                    <h5 class="text-sm font-semibold text-gray-600 mb-2">Regular Rates (per person)</h5>
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">Solo</label>
                        <input type="number" name="rates[${cat.id}][rate_solo]" value="${rate.rate_solo || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">2 Pax</label>
                        <input type="number" name="rates[${cat.id}][rate_2pax]" value="${rate.rate_2pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">3 Pax</label>
                        <input type="number" name="rates[${cat.id}][rate_3pax]" value="${rate.rate_3pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">4 Pax</label>
                        <input type="number" name="rates[${cat.id}][rate_4pax]" value="${rate.rate_4pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">5 Pax</label>
                        <input type="number" name="rates[${cat.id}][rate_5pax]" value="${rate.rate_5pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">6 Pax</label>
                        <input type="number" name="rates[${cat.id}][rate_6pax]" value="${rate.rate_6pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">7 Pax</label>
                        <input type="number" name="rates[${cat.id}][rate_7pax]" value="${rate.rate_7pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">8 Pax</label>
                        <input type="number" name="rates[${cat.id}][rate_8pax]" value="${rate.rate_8pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">9 Pax</label>
                        <input type="number" name="rates[${cat.id}][rate_9pax]" value="${rate.rate_9pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">10 Pax</label>
                        <input type="number" name="rates[${cat.id}][rate_10pax]" value="${rate.rate_10pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">11 Pax</label>
                        <input type="number" name="rates[${cat.id}][rate_11pax]" value="${rate.rate_11pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">12 Pax</label>
                        <input type="number" name="rates[${cat.id}][rate_12pax]" value="${rate.rate_12pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">13 Pax</label>
                        <input type="number" name="rates[${cat.id}][rate_13pax]" value="${rate.rate_13pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">14 Pax</label>
                        <input type="number" name="rates[${cat.id}][rate_14pax]" value="${rate.rate_14pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">15 Pax</label>
                        <input type="number" name="rates[${cat.id}][rate_15pax]" value="${rate.rate_15pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">Child</label>
                        <input type="number" name="rates[${cat.id}][rate_child_no_breakfast]" value="${rate.rate_child_no_breakfast || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                    </div>
                  </div>
                  
                  <!-- Extra Night Rates 1-15 Pax -->
                  <div class="border-t pt-4">
                    <h5 class="text-sm font-semibold text-gray-600 mb-2">Extra Night Rates</h5>
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">Solo</label>
                        <input type="number" name="rates[${cat.id}][extra_night_solo]" value="${rate.extra_night_solo || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">2P</label>
                        <input type="number" name="rates[${cat.id}][extra_night_2pax]" value="${rate.extra_night_2pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">3P</label>
                        <input type="number" name="rates[${cat.id}][extra_night_3pax]" value="${rate.extra_night_3pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">4P</label>
                        <input type="number" name="rates[${cat.id}][extra_night_4pax]" value="${rate.extra_night_4pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">5P</label>
                        <input type="number" name="rates[${cat.id}][extra_night_5pax]" value="${rate.extra_night_5pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">6P</label>
                        <input type="number" name="rates[${cat.id}][extra_night_6pax]" value="${rate.extra_night_6pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">7P</label>
                        <input type="number" name="rates[${cat.id}][extra_night_7pax]" value="${rate.extra_night_7pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">8P</label>
                        <input type="number" name="rates[${cat.id}][extra_night_8pax]" value="${rate.extra_night_8pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">9P</label>
                        <input type="number" name="rates[${cat.id}][extra_night_9pax]" value="${rate.extra_night_9pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">10P</label>
                        <input type="number" name="rates[${cat.id}][extra_night_10pax]" value="${rate.extra_night_10pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">11P</label>
                        <input type="number" name="rates[${cat.id}][extra_night_11pax]" value="${rate.extra_night_11pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">12P</label>
                        <input type="number" name="rates[${cat.id}][extra_night_12pax]" value="${rate.extra_night_12pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">13P</label>
                        <input type="number" name="rates[${cat.id}][extra_night_13pax]" value="${rate.extra_night_13pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">14P</label>
                        <input type="number" name="rates[${cat.id}][extra_night_14pax]" value="${rate.extra_night_14pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">15P</label>
                        <input type="number" name="rates[${cat.id}][extra_night_15pax]" value="${rate.extra_night_15pax || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                      <div><label class="block text-xs font-medium text-gray-500 mb-1">Child</label>
                        <input type="number" name="rates[${cat.id}][extra_night_child_no_breakfast]" value="${rate.extra_night_child_no_breakfast || ""}" step="0.01"
                               class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
                    </div>
                  </div>
                  
                  <!-- Breakfast Options -->
                  <div class="mt-4 pt-3 border-t border-gray-200">
                    <label class="flex items-center gap-2">
                      <input type="checkbox" name="rates[${cat.id}][breakfast_included]" value="true" ${rate.breakfast_included ? "checked" : ""}
                             class="h-4 w-4 text-indigo-600 rounded">
                      <span class="text-sm text-gray-700">Breakfast Included</span>
                    </label>
                    <input type="text" name="rates[${cat.id}][breakfast_notes]" value="${rate.breakfast_notes || ""}" 
                           placeholder="Breakfast notes" 
                           class="mt-2 w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
                            <!-- ADD THIS - Additional Information field -->
  <div class="mt-3">
    <label class="block text-sm font-medium text-gray-700 mb-1">
      <i class="fas fa-info-circle text-indigo-500 mr-1"></i>
      Additional Information (Check-in/out times, policies, etc.)
    </label>
    <textarea name="rates[${cat.id}][additional_info]" rows="3"
              class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
              placeholder="Check-in: 2:00 PM
Check-out: 12:00 PM
Free WiFi
Pool access
Parking available">${rate.additional_info || ""}</textarea>
    <p class="text-xs text-gray-400 mt-1">One item per line for better formatting</p>
  </div>
                  </div>
                </div>
              `;
              })
              .join("")}
          </div>
          <div class="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
            <button type="button" onclick="this.closest('.fixed').remove()" class="px-5 py-2.5 border-2 border-gray-200 rounded-xl text-sm">Cancel</button>
            <button type="submit" class="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm">Save All Rates</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const form = document.getElementById("bulkRateEditForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const packageId = formData.get("package_id");
    const rates = [];

    destination.hotel_categories?.forEach((cat) => {
      rates.push({
        package_id: parseInt(packageId),
        hotel_category_id: cat.id,
        season: formData.get(`rates[${cat.id}][season]`) || null,
        sneak: formData.get(`rates[${cat.id}][sneak]`) || null,
        // Regular rates 1-15 pax
        rate_solo: formData.get(`rates[${cat.id}][rate_solo]`)
          ? parseFloat(formData.get(`rates[${cat.id}][rate_solo]`))
          : null,
        rate_2pax: formData.get(`rates[${cat.id}][rate_2pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][rate_2pax]`))
          : null,
        rate_3pax: formData.get(`rates[${cat.id}][rate_3pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][rate_3pax]`))
          : null,
        rate_4pax: formData.get(`rates[${cat.id}][rate_4pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][rate_4pax]`))
          : null,
        rate_5pax: formData.get(`rates[${cat.id}][rate_5pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][rate_5pax]`))
          : null,
        rate_6pax: formData.get(`rates[${cat.id}][rate_6pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][rate_6pax]`))
          : null,
        rate_7pax: formData.get(`rates[${cat.id}][rate_7pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][rate_7pax]`))
          : null,
        rate_8pax: formData.get(`rates[${cat.id}][rate_8pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][rate_8pax]`))
          : null,
        rate_9pax: formData.get(`rates[${cat.id}][rate_9pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][rate_9pax]`))
          : null,
        rate_10pax: formData.get(`rates[${cat.id}][rate_10pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][rate_10pax]`))
          : null,
        rate_11pax: formData.get(`rates[${cat.id}][rate_11pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][rate_11pax]`))
          : null,
        rate_12pax: formData.get(`rates[${cat.id}][rate_12pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][rate_12pax]`))
          : null,
        rate_13pax: formData.get(`rates[${cat.id}][rate_13pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][rate_13pax]`))
          : null,
        rate_14pax: formData.get(`rates[${cat.id}][rate_14pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][rate_14pax]`))
          : null,
        rate_15pax: formData.get(`rates[${cat.id}][rate_15pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][rate_15pax]`))
          : null,
        rate_child_no_breakfast: formData.get(
          `rates[${cat.id}][rate_child_no_breakfast]`,
        )
          ? parseFloat(
              formData.get(`rates[${cat.id}][rate_child_no_breakfast]`),
            )
          : null,
        // Extra night rates 1-15 pax
        extra_night_solo: formData.get(`rates[${cat.id}][extra_night_solo]`)
          ? parseFloat(formData.get(`rates[${cat.id}][extra_night_solo]`))
          : null,
        extra_night_2pax: formData.get(`rates[${cat.id}][extra_night_2pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][extra_night_2pax]`))
          : null,
        extra_night_3pax: formData.get(`rates[${cat.id}][extra_night_3pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][extra_night_3pax]`))
          : null,
        extra_night_4pax: formData.get(`rates[${cat.id}][extra_night_4pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][extra_night_4pax]`))
          : null,
        extra_night_5pax: formData.get(`rates[${cat.id}][extra_night_5pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][extra_night_5pax]`))
          : null,
        extra_night_6pax: formData.get(`rates[${cat.id}][extra_night_6pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][extra_night_6pax]`))
          : null,
        extra_night_7pax: formData.get(`rates[${cat.id}][extra_night_7pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][extra_night_7pax]`))
          : null,
        extra_night_8pax: formData.get(`rates[${cat.id}][extra_night_8pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][extra_night_8pax]`))
          : null,
        extra_night_9pax: formData.get(`rates[${cat.id}][extra_night_9pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][extra_night_9pax]`))
          : null,
        extra_night_10pax: formData.get(`rates[${cat.id}][extra_night_10pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][extra_night_10pax]`))
          : null,
        extra_night_11pax: formData.get(`rates[${cat.id}][extra_night_11pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][extra_night_11pax]`))
          : null,
        extra_night_12pax: formData.get(`rates[${cat.id}][extra_night_12pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][extra_night_12pax]`))
          : null,
        extra_night_13pax: formData.get(`rates[${cat.id}][extra_night_13pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][extra_night_13pax]`))
          : null,
        extra_night_14pax: formData.get(`rates[${cat.id}][extra_night_14pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][extra_night_14pax]`))
          : null,
        extra_night_15pax: formData.get(`rates[${cat.id}][extra_night_15pax]`)
          ? parseFloat(formData.get(`rates[${cat.id}][extra_night_15pax]`))
          : null,
        extra_night_child_no_breakfast: formData.get(
          `rates[${cat.id}][extra_night_child_no_breakfast]`,
        )
          ? parseFloat(
              formData.get(`rates[${cat.id}][extra_night_child_no_breakfast]`),
            )
          : null,
        breakfast_included:
          formData.get(`rates[${cat.id}][breakfast_included]`) === "true",
        breakfast_notes:
          formData.get(`rates[${cat.id}][breakfast_notes]`) || null,
      });
    });

    try {
      showLoading(true, "Saving all rates...");
      for (const rateData of rates) {
        const { data: existing } = await supabase
          .from("package_hotel_rates")
          .select("id")
          .eq("package_id", rateData.package_id)
          .eq("hotel_category_id", rateData.hotel_category_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("package_hotel_rates")
            .update({ ...rateData, updated_at: new Date() })
            .eq("id", existing.id);
        } else {
          await supabase.from("package_hotel_rates").insert([rateData]);
        }
      }
      await fetchDestinations();
      showToast("✅ All rates saved successfully!", "success");
      modal.remove();
      await viewDestinationDetails(destination.id);
    } catch (error) {
      console.error("Error saving rates:", error);
      showToast("❌ Failed to save rates: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  });
}

export async function viewDestinationDetails(id) {
  try {
    showLoading(true, "Loading destination details...");

    const destination = await fetchDestinationById(id);
    if (!destination) {
      showToast("Destination not found", "error");
      showLoading(false);
      return;
    }

    const images = destination.images || [];

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto";

    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-7xl w-full my-8 shadow-2xl transform transition-all flex flex-col" style="max-height: 90vh;">
        <!-- FIXED HEADER - Hindi nag-soscroll -->
        <div class="sticky top-0 z-50 rounded-t-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 flex-shrink-0">
          <div class="absolute inset-0 bg-black/10"></div>
          <div class="relative px-6 py-5">
            <div class="flex items-center gap-4">
              <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/30">
                <i class="fas fa-map-pin text-2xl text-white"></i>
              </div>
              <div class="flex-1">
                <h2 class="text-2xl font-bold text-white tracking-tight">${destination.name}</h2>
                <p class="text-indigo-100 text-sm mt-1">${destination.airport_code || "N/A"} • ${destination.country === "Philippines" ? "🇵🇭 Local" : "🌏 International"}</p>
              </div>
              <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
            </div>
          </div>
        </div>
        
        <!-- SCROLLABLE CONTENT - Dito lang nag-soscroll -->
        <div class="flex-1 overflow-y-auto p-6">
          <div class="space-y-6">
            
            <!-- ========== DESTINATION OVERVIEW ========== -->
            <div class="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl border-2 border-indigo-100">
              <div class="flex flex-col md:flex-row gap-6">
                <div class="md:w-1/3">
                  <div class="aspect-video rounded-xl overflow-hidden shadow-lg">
                    <img src="${images.find((img) => img.is_primary)?.url || getDestinationImage(destination.name)}" 
                         alt="${destination.name}" class="w-full h-full object-cover">
                  </div>
                </div>
                <div class="md:w-2/3">
                  <p class="text-gray-600 mb-4">${destination.description || "No description available."}</p>
                  <div class="grid grid-cols-2 gap-3">
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
                  </div>
                </div>
              </div>
            </div>

            <!-- ========== IMAGE GALLERY ========== -->
            <div class="bg-white p-5 rounded-xl border-2 border-gray-200">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-bold flex items-center gap-2">
                  <i class="fas fa-images text-emerald-500"></i>
                  Photo Gallery
                </h3>
                <button onclick="window.showImageUploadModal(${destination.id}, '${destination.name}')" 
                        class="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-all">
                  <i class="fas fa-plus-circle mr-1"></i> Add Photo
                </button>
              </div>
              
              ${
                images.length === 0
                  ? `
                <div class="text-center py-8 bg-gray-50 rounded-lg">
                  <i class="fas fa-images text-4xl text-gray-400 mb-3"></i>
                  <p class="text-gray-500">No images yet</p>
                </div>
              `
                  : `
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  ${images
                    .map(
                      (img) => `
                    <div class="relative group rounded-lg overflow-hidden aspect-square">
                      <img src="${img.url}" alt="${img.alt_text || destination.name}" class="w-full h-full object-cover">
                      <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        ${
                          !img.is_primary
                            ? `
                          <button onclick="window.setPrimaryImage(${img.id}, ${destination.id})" 
                                  class="p-1.5 bg-white rounded-full hover:bg-emerald-500 hover:text-white transition-all">
                            <i class="fas fa-star text-xs"></i>
                          </button>
                        `
                            : ""
                        }
                        <button onclick="window.deleteImage(${img.id})" 
                                class="p-1.5 bg-white rounded-full hover:bg-red-500 hover:text-white transition-all">
                          <i class="fas fa-trash text-xs"></i>
                        </button>
                      </div>
                      ${img.is_primary ? `<span class="absolute top-1 left-1 px-1.5 py-0.5 bg-emerald-500 text-white text-xs rounded">Primary</span>` : ""}
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              `
              }
            </div>

            <!-- ========== TABLE FORMATS ========== -->
            <div class="bg-white p-5 rounded-xl border-2 border-gray-200">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-bold flex items-center gap-2">
                  <i class="fas fa-table text-emerald-500"></i>
                  Rate Table Formats
                </h3>
                <button onclick="window.openTableFormatBuilderModal(${destination.id})" 
                        class="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                  <i class="fas fa-plus-circle mr-1"></i> Create Format
                </button>
              </div>
              
              <div id="tableFormatsContainer-${destination.id}" class="space-y-3">
                <div class="text-center py-4" id="tableFormatsLoading-${destination.id}">
                  <i class="fas fa-spinner fa-spin text-gray-400 text-2xl"></i>
                  <p class="text-sm text-gray-500 mt-2">Loading table formats...</p>
                </div>
              </div>
            </div>

            <!-- ========== HOTELS & ACCOMMODATIONS ========== -->
            <div class="bg-white p-5 rounded-xl border-2 border-gray-200">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-bold flex items-center gap-2">
                  <i class="fas fa-hotel text-blue-500"></i>
                  Hotels & Accommodations
                </h3>
                <div class="flex gap-2">
                  <button onclick="window.openCreateHotelCategoryModal(${destination.id})" 
                          class="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                    <i class="fas fa-plus-circle mr-1"></i> Add Category
                  </button>
                </div>
              </div>
              
              ${
                destination.hotel_categories &&
                destination.hotel_categories.length > 0
                  ? `
                <div class="space-y-4">
                  ${destination.hotel_categories
                    .map((cat) => {
                      const categoryHotels =
                        cat.hotels?.filter((h) => h.is_active) || [];

                      return `
                    <div class="border rounded-lg overflow-hidden">
                      <div class="bg-blue-50 px-4 py-3 flex justify-between items-center">
                        <div>
                          <h4 class="font-bold text-blue-800">${cat.category_name}</h4>
                          <p class="text-xs text-gray-600 mt-1">
                            <span class="mr-3">Max Capacity: ${cat.max_room_capacity || "N/A"} pax</span>
                            <span class="${cat.has_breakfast ? "text-green-600" : "text-gray-400"}">
                              ${cat.has_breakfast ? "✓ Breakfast Included" : "✗ No Breakfast"}
                            </span>
                            ${cat.breakfast_note ? `<span class="ml-2 text-gray-500">(${cat.breakfast_note})</span>` : ""}
                          </p>
                        </div>
                        <button onclick="window.openCreateHotelModalWithCategory(${cat.id})" 
                                class="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600">
                          <i class="fas fa-plus-circle mr-1"></i> Add Hotel
                        </button>
                      </div>
                      
                      ${
                        categoryHotels.length > 0
                          ? `
                        <div class="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          ${categoryHotels
                            .map(
                              (hotel) => `
                            <div class="border rounded-lg p-3 hover:shadow-md transition bg-white">
                              <div class="flex gap-3">
                                <div class="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                  ${
                                    hotel.image_url
                                      ? `
                                    <img src="${hotel.image_url}" alt="${hotel.name}" class="w-full h-full object-cover">
                                  `
                                      : `
                                    <div class="w-full h-full flex items-center justify-center">
                                      <i class="fas fa-hotel text-gray-400 text-2xl"></i>
                                    </div>
                                  `
                                  }
                                </div>
                                <div class="flex-1">
                                  <h5 class="font-bold text-gray-800">${hotel.name}</h5>
                                  <p class="text-xs text-gray-500">Max: ${hotel.max_capacity || "N/A"} guests</p>
                                  ${
                                    hotel.description
                                      ? `
                                    <p class="text-xs text-gray-600 mt-1 line-clamp-2">${hotel.description}</p>
                                  `
                                      : ""
                                  }
                                  <div class="mt-2 flex items-center gap-2">
                                    <span class="text-xs px-2 py-0.5 rounded-full ${hotel.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}">
                                      ${hotel.is_active ? "Active" : "Inactive"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div class="mt-3 pt-2 border-t border-gray-100 flex justify-end gap-2">
                                <button onclick="window.openEditHotelModal(${hotel.id})" 
                                        class="text-xs text-amber-600 hover:text-amber-800 px-2 py-1 rounded hover:bg-amber-50">
                                  <i class="fas fa-edit mr-1"></i> Edit
                                </button>
                                <button onclick="window.confirmDeleteHotel(${hotel.id})" 
                                        class="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50">
                                  <i class="fas fa-trash mr-1"></i> Delete
                                </button>
                              </div>
                            </div>
                          `,
                            )
                            .join("")}
                        </div>
                      `
                          : `
                        <div class="text-center py-6 bg-gray-50">
                          <i class="fas fa-hotel text-3xl text-gray-400 mb-2"></i>
                          <p class="text-sm text-gray-500">No hotels in this category yet</p>
                          <button onclick="window.openCreateHotelModalWithCategory(${cat.id})" 
                                  class="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                            <i class="fas fa-plus-circle mr-1"></i> Add your first hotel
                          </button>
                        </div>
                      `
                      }
                    </div>
                  `;
                    })
                    .join("")}
                </div>
              `
                  : `
                <div class="text-center py-8 bg-gray-50 rounded-lg">
                  <i class="fas fa-hotel text-4xl text-gray-400 mb-3"></i>
                  <p class="text-gray-500 mb-3">No hotel categories yet</p>
                  <button onclick="window.openCreateHotelCategoryModal(${destination.id})" 
                          class="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                    <i class="fas fa-plus-circle mr-1"></i> Create First Category
                  </button>
                </div>
              `
              }
            </div>

            <!-- ========== PACKAGES SECTION ========== -->
            <div class="bg-white p-5 rounded-xl border-2 border-gray-200">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-bold flex items-center gap-2">
                  <i class="fas fa-box text-emerald-500"></i>
                  Tour Packages
                </h3>
                <button onclick="window.openCreatePackageModal(${destination.id})" 
                        class="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                  <i class="fas fa-plus-circle mr-1"></i> Add Package
                </button>
              </div>
              
              ${
                !destination.packages || destination.packages.length === 0
                  ? `
                <div class="text-center py-8 bg-gray-50 rounded-lg">
                  <i class="fas fa-box-open text-4xl text-gray-400 mb-3"></i>
                  <p class="text-gray-500">No packages available</p>
                </div>
              `
                  : destination.packages
                      .map(
                        (pkg) => `
                <div class="border-2 border-gray-200 rounded-xl p-4 mb-4 hover:shadow-md transition">
                  <div class="flex justify-between items-start mb-3">
                    <div>
                      <h4 class="font-bold text-lg">${pkg.package_name}</h4>
                      <p class="text-sm text-gray-600">${pkg.package_code || "N/A"} • ${pkg.tour_category || "N/A"}</p>
                      
                      <!-- TABLE FORMAT DISPLAY -->
                      ${
                        pkg.table_format
                          ? `
                        <div class="flex items-center gap-2 mt-2 flex-wrap">
                          <span class="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full flex items-center gap-1">
                            <i class="fas fa-table text-xs"></i>
                            Format: ${pkg.table_format}
                          </span>
                          ${destination.hotel_categories
                            .map(
                              (cat) => `
                            <button onclick="window.openRateInputModal(${pkg.id}, ${cat.id}, '${pkg.table_format}')" 
                                    class="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition flex items-center gap-1">
                              <i class="fas fa-edit"></i> ${cat.category_name}
                            </button>
                          `,
                            )
                            .join("")}
                          <button onclick="window.viewRatesModal(${pkg.id}, '${pkg.table_format}')" 
                                  class="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200 transition flex items-center gap-1">
                            <i class="fas fa-eye"></i> View All
                          </button>
                          <button onclick="window.selectTableFormatForPackage(${pkg.id}, ${destination.id})" 
                                  class="text-xs text-blue-600 hover:text-blue-800">
                            <i class="fas fa-sync-alt mr-1"></i> Change
                          </button>
                          <button onclick="window.editFormatFromDestination(${destination.id}, '${pkg.table_format}')" 
                                  class="text-xs text-amber-600 hover:text-amber-800">
                            <i class="fas fa-edit mr-1"></i> Edit Format
                          </button>
                        </div>
                      `
                          : `
                        <div class="mt-2">
                          <button onclick="window.selectTableFormatForPackage(${pkg.id}, ${destination.id})" 
                                  class="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition">
                            <i class="fas fa-table mr-1"></i> Select Table Format
                          </button>
                        </div>
                      `
                      }
                      
                      <div class="flex flex-wrap gap-2 mt-2">
                        <span class="px-2 py-0.5 text-xs rounded-full ${pkg.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}">
                          ${pkg.is_active ? "Active" : "Inactive"}
                        </span>
                        ${pkg.has_extra_night ? '<span class="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">Has Extra Night</span>' : ""}
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button onclick="window.openBulkRateEditModal(${pkg.id})" class="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition" title="Bulk Edit Rates">
                        <i class="fas fa-tags"></i>
                      </button>
                      <button onclick="window.openEditPackageModal(${pkg.id})" class="text-amber-600 hover:text-amber-700 p-2 hover:bg-amber-50 rounded-lg transition" title="Edit Package">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button onclick="window.confirmDeletePackage(${pkg.id})" class="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition" title="Delete Package">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                  
                  <!-- Package Details -->
                  <div class="mt-3 space-y-3">
                    
                    <!-- HOTEL RATES DISPLAY -->
                    <div class="mt-3 space-y-3">
                      <!-- STATIC TABLE -->
                      ${
                        pkg.package_hotel_rates &&
                        pkg.package_hotel_rates.length > 0
                          ? `
                        <div class="border rounded-lg p-3 bg-gray-50">
                          <div class="flex items-center justify-between mb-2">
                            <h5 class="font-semibold text-sm flex items-center gap-1">
                              <i class="fas fa-hotel text-blue-500"></i>
                              Hotel Rates
                            </h5>
                            <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              ${pkg.package_hotel_rates.length} rate(s)
                            </span>
                          </div>
                          
                          ${pkg.package_hotel_rates
                            .map((rate) => {
                              const category =
                                destination.hotel_categories?.find(
                                  (c) => c.id === rate.hotel_category_id,
                                );
                              const categoryName =
                                category?.category_name || "Unknown Category";

                              return `
                              <div class="mb-4 border-b border-gray-200 pb-3 last:border-0">
                                <h6 class="font-semibold text-sm text-indigo-700 mb-2">${categoryName}</h6>
                                
                                <!-- Regular Rates -->
                                <div class="mb-3">
                                  <p class="text-xs font-medium text-gray-600 mb-1">Regular Rates:</p>
                                  <div class="overflow-x-auto">
                                    <table class="min-w-full text-xs">
                                      <thead>
                                        <tr class="bg-gray-100">
                                          <th class="px-2 py-1 text-left">Season</th>
                                          <th class="px-2 py-1 text-left">Sneak</th>
                                          <th class="px-2 py-1 text-left">Duration/Travel-Date</th>
                                          <th class="px-2 py-1 text-right">Solo</th>
                                          <th class="px-2 py-1 text-right">2P</th>
                                          <th class="px-2 py-1 text-right">3P</th>
                                          <th class="px-2 py-1 text-right">4P</th>
                                          <th class="px-2 py-1 text-right">5P</th>
                                          <th class="px-2 py-1 text-right">6P</th>
                                          <th class="px-2 py-1 text-right">7P</th>
                                          <th class="px-2 py-1 text-right">8P</th>
                                          <th class="px-2 py-1 text-right">9P</th>
                                          <th class="px-2 py-1 text-right">10P</th>
                                          <th class="px-2 py-1 text-right">11P</th>
                                          <th class="px-2 py-1 text-right">12P</th>
                                          <th class="px-2 py-1 text-right">13P</th>
                                          <th class="px-2 py-1 text-right">14P</th>
                                          <th class="px-2 py-1 text-right">15P</th>
                                          <th class="px-2 py-1 text-right">Child</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr class="border-b">
                                          <td class="px-2 py-1">${rate.season || "N/A"}</td>
                                          <td class="px-2 py-1">${rate.sneak || "N/A"}</td>
                                          <td class="px-2 py-1">${rate.duration || "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.rate_solo ? "₱" + Number(rate.rate_solo).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.rate_2pax ? "₱" + Number(rate.rate_2pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.rate_3pax ? "₱" + Number(rate.rate_3pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.rate_4pax ? "₱" + Number(rate.rate_4pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.rate_5pax ? "₱" + Number(rate.rate_5pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.rate_6pax ? "₱" + Number(rate.rate_6pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.rate_7pax ? "₱" + Number(rate.rate_7pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.rate_8pax ? "₱" + Number(rate.rate_8pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.rate_9pax ? "₱" + Number(rate.rate_9pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.rate_10pax ? "₱" + Number(rate.rate_10pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.rate_11pax ? "₱" + Number(rate.rate_11pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.rate_12pax ? "₱" + Number(rate.rate_12pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.rate_13pax ? "₱" + Number(rate.rate_13pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.rate_14pax ? "₱" + Number(rate.rate_14pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.rate_15pax ? "₱" + Number(rate.rate_15pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.rate_child_no_breakfast ? "₱" + Number(rate.rate_child_no_breakfast).toLocaleString() : "N/A"}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                
                                <!-- Extra Night Rates -->
                                <div class="mt-3">
                                  <p class="text-xs font-medium text-gray-600 mb-1">Extra Night Rates:</p>
                                  <div class="overflow-x-auto">
                                    <table class="min-w-full text-xs">
                                      <thead>
                                        <tr class="bg-gray-100">
                                          <th class="px-2 py-1 text-left">Season</th>
                                          <th class="px-2 py-1 text-left">Sneak</th>
                                          <th class="px-2 py-1 text-left">Duration/TravelDate</th>
                                          <th class="px-2 py-1 text-right">Solo</th>
                                          <th class="px-2 py-1 text-right">2P</th>
                                          <th class="px-2 py-1 text-right">3P</th>
                                          <th class="px-2 py-1 text-right">4P</th>
                                          <th class="px-2 py-1 text-right">5P</th>
                                          <th class="px-2 py-1 text-right">6P</th>
                                          <th class="px-2 py-1 text-right">7P</th>
                                          <th class="px-2 py-1 text-right">8P</th>
                                          <th class="px-2 py-1 text-right">9P</th>
                                          <th class="px-2 py-1 text-right">10P</th>
                                          <th class="px-2 py-1 text-right">11P</th>
                                          <th class="px-2 py-1 text-right">12P</th>
                                          <th class="px-2 py-1 text-right">13P</th>
                                          <th class="px-2 py-1 text-right">14P</th>
                                          <th class="px-2 py-1 text-right">15P</th>
                                          <th class="px-2 py-1 text-right">Child</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr class="border-b">
                                          <td class="px-2 py-1">${rate.season || "N/A"}</td>
                                          <td class="px-2 py-1">${rate.sneak || "N/A"}</td>
                                          <td class="px-2 py-1">${rate.duration || "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.extra_night_solo ? "₱" + Number(rate.extra_night_solo).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.extra_night_2pax ? "₱" + Number(rate.extra_night_2pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.extra_night_3pax ? "₱" + Number(rate.extra_night_3pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.extra_night_4pax ? "₱" + Number(rate.extra_night_4pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.extra_night_5pax ? "₱" + Number(rate.extra_night_5pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.extra_night_6pax ? "₱" + Number(rate.extra_night_6pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.extra_night_7pax ? "₱" + Number(rate.extra_night_7pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.extra_night_8pax ? "₱" + Number(rate.extra_night_8pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.extra_night_9pax ? "₱" + Number(rate.extra_night_9pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.extra_night_10pax ? "₱" + Number(rate.extra_night_10pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.extra_night_11pax ? "₱" + Number(rate.extra_night_11pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.extra_night_12pax ? "₱" + Number(rate.extra_night_12pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.extra_night_13pax ? "₱" + Number(rate.extra_night_13pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.extra_night_14pax ? "₱" + Number(rate.extra_night_14pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.extra_night_15pax ? "₱" + Number(rate.extra_night_15pax).toLocaleString() : "N/A"}</td>
                                          <td class="px-2 py-1 text-right">${rate.extra_night_child_no_breakfast ? "₱" + Number(rate.extra_night_child_no_breakfast).toLocaleString() : "N/A"}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                
                                <!-- Breakfast Info -->
                                ${
                                  rate.breakfast_included ||
                                  rate.breakfast_notes
                                    ? `
                                  <div class="mt-2 text-xs text-gray-600">
                                    ${rate.breakfast_included ? '<span class="text-green-600 mr-2">✓ Breakfast Included</span>' : ""}
                                    ${rate.breakfast_notes ? `<span class="text-gray-500">Note: ${rate.breakfast_notes}</span>` : ""}
                                  </div>
                                `
                                    : ""
                                }

                               <!-- ADDITIONAL INFO -->
                               ${
                                 rate.additional_info
                                   ? `
                                 <div class="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                   <div class="flex items-center gap-2 mb-2">
                                     <i class="fas fa-info-circle text-indigo-500"></i>
                                     <span class="font-semibold text-sm text-indigo-700">Additional Information:</span>
                                   </div>
                                   <div class="space-y-1 text-xs text-gray-700 whitespace-pre-line">
                                     ${rate.additional_info}
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
                        `
                          : ""
                      }

                      <!-- DYNAMIC TABLE -->
                      <div id="package-rates-${pkg.id}">
                        ${
                          pkg.table_format
                            ? `
                          <div class="text-center py-4">
                            <i class="fas fa-spinner fa-spin text-gray-400 text-2xl"></i>
                            <p class="text-xs text-gray-500 mt-2">Loading dynamic rates...</p>
                          </div>
                        `
                            : ""
                        }
                      </div>
                    </div>
                    
                    <!-- Inclusions -->
                    ${
                      pkg.inclusions && pkg.inclusions.length > 0
                        ? `
                      <div class="border rounded-lg p-3 bg-green-50">
                        <h5 class="font-semibold text-sm mb-1 flex items-center gap-1 text-green-700">
                          <i class="fas fa-check-circle"></i> Inclusions
                        </h5>
                        <ul class="list-disc list-inside text-xs space-y-0.5">
                          ${pkg.inclusions.map((inc) => `<li>${inc.inclusion_text}</li>`).join("")}
                        </ul>
                      </div>
                    `
                        : `
                      <div class="border rounded-lg p-3 bg-gray-50">
                        <h5 class="font-semibold text-sm mb-1 flex items-center gap-1 text-gray-500">
                          <i class="fas fa-check-circle"></i> Inclusions
                        </h5>
                        <p class="text-xs text-gray-400 italic">N/A - No inclusions specified</p>
                      </div>
                    `
                    }
                    
                    <!-- Exclusions -->
                    ${
                      pkg.exclusions && pkg.exclusions.length > 0
                        ? `
                      <div class="border rounded-lg p-3 bg-red-50">
                        <h5 class="font-semibold text-sm mb-1 flex items-center gap-1 text-red-700">
                          <i class="fas fa-times-circle"></i> Exclusions
                        </h5>
                        <ul class="list-disc list-inside text-xs space-y-0.5">
                          ${pkg.exclusions.map((exc) => `<li>${exc.exclusion_text}</li>`).join("")}
                        </ul>
                      </div>
                    `
                        : `
                      <div class="border rounded-lg p-3 bg-gray-50">
                        <h5 class="font-semibold text-sm mb-1 flex items-center gap-1 text-gray-500">
                          <i class="fas fa-times-circle"></i> Exclusions
                        </h5>
                        <p class="text-xs text-gray-400 italic">N/A - No exclusions specified</p>
                      </div>
                    `
                    }
                    
                    <!-- Itinerary -->
                    ${
                      pkg.itineraries && pkg.itineraries.length > 0
                        ? `
                      <div class="border rounded-lg p-3 bg-indigo-50">
                        <h5 class="font-semibold text-sm mb-2 flex items-center gap-1 text-indigo-700">
                          <i class="fas fa-map-signs"></i> Itinerary
                        </h5>
                        <div class="space-y-3 text-xs">
                          ${pkg.itineraries
                            .map((iti) => {
                              let fullItinerary = iti.day_title || "";
                              if (
                                iti.day_description &&
                                iti.day_description.length > 0
                              ) {
                                fullItinerary +=
                                  "\n" + iti.day_description.join("\n");
                              }
                              const lines = fullItinerary
                                .split("\n")
                                .filter((line) => line.trim());

                              return `
                              <div class="border-l-2 border-indigo-300 pl-3">
                                <div class="font-medium text-indigo-800 mb-1">Day ${iti.day_number}:</div>
                                <div class="space-y-1 text-gray-700 whitespace-pre-wrap">
                                  ${lines.map((line) => `<div>${line || "N/A"}</div>`).join("")}
                                </div>
                              </div>
                            `;
                            })
                            .join("")} 
                        </div>
                      </div>
                    `
                        : `
                      <div class="border rounded-lg p-3 bg-gray-50">
                        <h5 class="font-semibold text-sm mb-2 flex items-center gap-1 text-gray-500">
                          <i class="fas fa-map-signs"></i> Itinerary
                        </h5>
                        <p class="text-xs text-gray-400 italic">N/A - No itinerary specified</p>
                      </div>
                    `
                    }
                    
                    <!-- Optional Tours -->
                    ${
                      pkg.optional_tours && pkg.optional_tours.length > 0
                        ? `
                      <div class="border rounded-lg p-3 bg-purple-50">
                        <div class="flex items-center justify-between mb-2">
                          <h5 class="font-semibold text-sm flex items-center gap-1 text-purple-700">
                            <i class="fas fa-compass"></i> Optional Tours
                          </h5>
                          <span class="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">
                            ${pkg.optional_tours.length} tour(s)
                          </span>
                        </div>
                        
                        <div class="space-y-2">
                          ${pkg.optional_tours
                            .map(
                              (tour) => `
                            <div class="flex items-center justify-between bg-white p-2 rounded-lg border border-purple-200 hover:bg-purple-50 transition">
                              <div class="flex items-center gap-2 flex-1">
                                ${
                                  tour.image_url
                                    ? `
                                  <img src="${tour.image_url}" alt="${tour.tour_name}" class="w-8 h-8 rounded-lg object-cover">
                                `
                                    : `
                                  <i class="fas fa-compass text-purple-400 text-sm"></i>
                                `
                                }
                                <div>
                                  <span class="text-sm font-medium">${tour.tour_name}</span>
                                  ${
                                    tour.duration_hours
                                      ? `
                                    <span class="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded ml-2">
                                      ${tour.duration_hours}h
                                    </span>
                                  `
                                      : ""
                                  }
                                </div>
                              </div>
                              <div class="flex gap-1">
                                <button onclick="window.viewOptionalTourDetails(${tour.id})" 
                                        class="text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-100 px-2 py-1 rounded transition flex items-center gap-1"
                                        title="View Full Details">
                                  <i class="fas fa-eye"></i>
                                </button>
                                <button onclick="window.confirmDeleteOptionalTour(${tour.id})" 
                                        class="text-xs text-red-600 hover:text-red-800 hover:bg-red-100 px-2 py-1 rounded transition flex items-center gap-1"
                                        title="Delete Tour">
                                  <i class="fas fa-trash"></i>
                                </button>
                              </div>
                            </div>
                          `,
                            )
                            .join("")}
                        </div>
                        
                        <div class="mt-3 pt-2 border-t-2 border-dashed border-gray-200">
                          <button onclick="openAddMultipleToursToPackageModal(${pkg.id}, ${destination.id})" 
                                    class="w-full px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition flex items-center justify-center gap-2">
                              <i class="fas fa-plus-circle"></i>
                              <span class="font-medium">Add Optional Tours to this Package</span>
                          </button>
                        </div>
                      </div>
                    `
                        : `
                      <div class="border rounded-lg p-3 bg-gray-50">
                        <div class="text-center py-2">
                          <i class="fas fa-compass text-2xl text-gray-400 mb-1"></i>
                          <h5 class="font-semibold text-sm text-gray-500 mb-1">Optional Tours</h5>
                          <p class="text-xs text-gray-400 italic">N/A - No optional tours in this package</p>
                          <button onclick="openAddMultipleToursToPackageModal(${pkg.id}, ${destination.id})" 
                                    class="mt-2 px-3 py-1 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-600">
                              <i class="fas fa-plus-circle mr-1"></i> Add Optional Tours
                          </button>
                        </div>
                      </div>
                    `
                    }
                  </div>
                </div>
              `,
                      )
                      .join("")
              }
            </div>

            <!-- ========== OPTIONAL TOURS SECTION ========== -->
            <div class="bg-white p-5 rounded-xl border-2 border-gray-200">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-bold flex items-center gap-2">
                  <i class="fas fa-compass text-purple-500"></i>
                  Optional Tours
                </h3>
                <button onclick="window.openCreateOptionalTourModal(${destination.id})" 
                        class="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600">
                  <i class="fas fa-plus-circle mr-1"></i> Add Tour
                </button>
              </div>
              
              ${
                destination.optional_tours &&
                destination.optional_tours.length > 0
                  ? `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  ${destination.optional_tours
                    .map(
                      (tour) => `
                    <div class="border rounded-lg p-3 hover:shadow-md transition bg-white">
                      <div class="flex gap-3">
                        <div class="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          ${
                            tour.image_url
                              ? `
                            <img src="${tour.image_url}" alt="${tour.tour_name}" class="w-full h-full object-cover">
                          `
                              : `
                            <div class="w-full h-full flex items-center justify-center">
                              <i class="fas fa-compass text-gray-400 text-2xl"></i>
                            </div>
                          `
                          }
                        </div>
                        <div class="flex-1">
                          <h4 class="font-bold text-gray-800">${tour.tour_name}</h4>
                          <p class="text-xs text-gray-500">${tour.duration_hours ? tour.duration_hours + " hours" : "N/A"}</p>
                          <div class="mt-2 flex items-center gap-2">
                            <span class="text-xs px-2 py-0.5 rounded-full ${tour.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}">
                              ${tour.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div class="mt-3 pt-2 border-t border-gray-100 flex justify-end gap-2">
                        <button onclick="window.viewOptionalTourDetails(${tour.id})" 
                                class="text-xs text-purple-600 hover:text-purple-800 px-2 py-1 rounded hover:bg-purple-50">
                          <i class="fas fa-eye mr-1"></i> View
                        </button>
                        <button onclick="window.openEditOptionalTourModal(${tour.id})" 
                                class="text-xs text-amber-600 hover:text-amber-800 px-2 py-1 rounded hover:bg-amber-50">
                          <i class="fas fa-edit mr-1"></i> Edit
                        </button>
                        <button onclick="window.confirmDeleteOptionalTour(${tour.id})" 
                                class="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50">
                          <i class="fas fa-trash mr-1"></i> Delete
                        </button>
                      </div>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              `
                  : `
                <div class="text-center py-8 bg-gray-50 rounded-lg">
                  <i class="fas fa-compass text-4xl text-gray-400 mb-3"></i>
                  <p class="text-gray-500 mb-3">No optional tours yet</p>
                  <button onclick="window.openCreateOptionalTourModal(${destination.id})" 
                          class="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600">
                    <i class="fas fa-plus-circle mr-1"></i> Create First Tour
                  </button>
                </div>
              `
              }
            </div>

            <!-- ========== ACTION BUTTONS ========== -->
            <div class="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
              <button onclick="this.closest('.fixed').remove()" 
                      class="px-5 py-2.5 border-2 border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-all">
                <i class="fas fa-times mr-2"></i> Close
              </button>
              <button onclick="window.openEditDestinationModal(${destination.id}); this.closest('.fixed').remove()" 
                      class="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg text-sm hover:from-amber-700 hover:to-orange-700 transition-all shadow-lg shadow-amber-200 flex items-center gap-2">
                <i class="fas fa-edit"></i>
                Edit Destination
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // =====================================================
    // LOAD TABLE FORMATS
    // =====================================================
    (async function loadTableFormats() {
      try {
        const formats = await window.fetchTableFormats(destination.id);

        const formatsByName = {};
        formats.forEach((format) => {
          if (!formatsByName[format.format_name]) {
            formatsByName[format.format_name] = {
              name: format.format_name,
              description: format.format_description,
              columns: [],
            };
          }
          formatsByName[format.format_name].columns.push(format);
        });

        const container = document.getElementById(
          `tableFormatsContainer-${destination.id}`,
        );

        if (Object.keys(formatsByName).length === 0) {
          container.innerHTML = `
            <div class="text-center py-6 bg-gray-50 rounded-lg">
              <i class="fas fa-table text-4xl text-gray-400 mb-3"></i>
              <p class="text-gray-500 mb-3">No table formats yet</p>
              <button onclick="window.openTableFormatBuilderModal(${destination.id})" 
                      class="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm">
                Create Your First Format
              </button>
            </div>
          `;
        } else {
          let html = "";
          for (const [formatName, format] of Object.entries(formatsByName)) {
            const regularColumns = format.columns.filter(
              (col) => !col.is_extra_night,
            );
            const extraColumns = format.columns.filter(
              (col) => col.is_extra_night,
            );

            html += `
              <div class="border-2 border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <h4 class="font-bold text-lg">${formatName}</h4>
                    ${format.description ? `<p class="text-sm text-gray-500">${format.description}</p>` : ""}
                    <p class="text-xs text-gray-400 mt-1">${format.columns.length} columns</p>
                  </div>
                  <div class="flex gap-2">
                    <button onclick="window.editFormatFromDestination(${destination.id}, '${formatName}')" 
                            class="text-amber-600 hover:text-amber-800 p-2" title="Edit Format">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="window.deleteFormatFromDestination(${destination.id}, '${formatName}')" 
                            class="text-red-600 hover:text-red-800 p-2" title="Delete Format">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                
                <div class="overflow-x-auto">
                  <table class="w-full text-xs border-collapse">
                    <thead>
                      <tr class="bg-gray-100">
                        <th class="border px-2 py-1">Season</th>
                        <th class="border px-2 py-1">Sneak</th>
                        <th class="border px-2 py-1">Duration/Travel-Date</th>
                        ${regularColumns
                          .map(
                            (col) =>
                              `<th class="border px-2 py-1 bg-emerald-50 text-emerald-700">${col.column_label}</th>`,
                          )
                          .join("")}
                        ${extraColumns
                          .map(
                            (col) =>
                              `<th class="border px-2 py-1 bg-purple-50 text-purple-700">${col.column_label} (Extra)</th>`,
                          )
                          .join("")}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="border px-2 py-1 text-gray-400">Peak</td>
                        <td class="border px-2 py-1 text-gray-400">SNK001</td>
                        <td class="border px-2 py-1 text-gray-400">3D2N</td>
                        ${regularColumns.map(() => '<td class="border px-2 py-1 text-right text-gray-400">₱0.00</td>').join("")}
                        ${extraColumns.map(() => '<td class="border px-2 py-1 text-right text-gray-400">₱0.00</td>').join("")}
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div class="mt-2 text-xs text-gray-500">
                  <i class="fas fa-info-circle mr-1"></i>
                  Used in: <span id="formatUsage-${formatName.replace(/\s/g, "-")}">Loading...</span>
                </div>
              </div>
            `;
          }
          container.innerHTML = html;

          for (const formatName of Object.keys(formatsByName)) {
            const packagesUsing =
              destination.packages?.filter(
                (pkg) => pkg.table_format === formatName,
              ) || [];

            const usageSpan = document.getElementById(
              `formatUsage-${formatName.replace(/\s/g, "-")}`,
            );
            if (usageSpan) {
              if (packagesUsing.length === 0) {
                usageSpan.innerHTML = "No packages yet";
              } else {
                usageSpan.innerHTML = packagesUsing
                  .map(
                    (p) =>
                      `<span class="inline-block bg-gray-100 px-2 py-0.5 rounded mr-1 mb-1">${p.package_name}</span>`,
                  )
                  .join("");
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading table formats:", error);
        const container = document.getElementById(
          `tableFormatsContainer-${destination.id}`,
        );
        if (container) {
          container.innerHTML = `
            <div class="text-center py-4 bg-red-50 rounded-lg">
              <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-2"></i>
              <p class="text-sm text-red-600">Failed to load table formats</p>
            </div>
          `;
        }
      }
    })();

    // =====================================================
    // LOAD PACKAGE RATES
    // =====================================================
    (async function loadPackageRates() {
      if (!destination.packages) return;

      for (const pkg of destination.packages) {
        if (!pkg.table_format) {
          const container = document.getElementById(`package-rates-${pkg.id}`);
          if (container) container.innerHTML = "";
          continue;
        }

        const container = document.getElementById(`package-rates-${pkg.id}`);
        if (!container) continue;

        try {
          const formatDescription = await getFormatDescription(
            destination.id,
            pkg.table_format,
          );
          const columnCount = await getFormatColumnCount(
            destination.id,
            pkg.table_format,
          );
          const totalRateRows = await getTotalRateRows(pkg.id);
          const columns =
            (await fetchTableFormatByName(destination.id, pkg.table_format)) ||
            [];
          const regularColumns = columns.filter((col) => !col.is_extra_night);
          const extraColumns = columns.filter((col) => col.is_extra_night);

          let categoriesHtml = "";
          let hasAnyRates = false;

          for (const cat of destination.hotel_categories || []) {
            const rates = await fetchRateRows(pkg.id, cat.id);

            if (!rates || rates.length === 0) {
              categoriesHtml += `
                <div class="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-sm transition mb-3">
                  <div class="flex justify-between items-center">
                    <div>
                      <h6 class="font-semibold text-gray-700 flex items-center gap-2">
                        <i class="fas fa-hotel text-blue-500 text-sm"></i>
                        ${cat.category_name}
                      </h6>
                      <p class="text-xs text-gray-400 mt-1">No rates entered yet</p>
                    </div>
                    <button onclick="window.openRateInputModal(${pkg.id}, ${cat.id}, '${pkg.table_format}')" 
                            class="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition flex items-center gap-1">
                      <i class="fas fa-plus-circle"></i> Add Rates
                    </button>
                  </div>
                </div>
              `;
              continue;
            }

            hasAnyRates = true;
            let tableRows = "";
            rates.forEach((row) => {
              let regularCells = "";
              regularColumns.forEach((col) => {
                const value = row.values[col.column_key]?.value;
                regularCells += `<td class="border border-gray-300 px-3 py-2 text-right font-mono">${value ? "₱" + Number(value).toLocaleString() : "-"}</td>`;
              });

              let extraCells = "";
              extraColumns.forEach((col) => {
                const value = row.values[col.column_key]?.value;
                extraCells += `<td class="border border-gray-300 px-3 py-2 text-right font-mono bg-purple-50">${value ? "₱" + Number(value).toLocaleString() : "-"}</td>`;
              });

              tableRows += `
                <tr class="hover:bg-gray-50">
                  <td class="border border-gray-300 px-3 py-2 font-medium">${row.season || "-"}</td>
                  <td class="border border-gray-300 px-3 py-2">${row.sneak || "-"}</td>
                  <td class="border border-gray-300 px-3 py-2">${row.duration || "-"}</td>
                  ${regularCells}
                  ${extraCells}
                </tr>
              `;
            });

            categoriesHtml += `
              <div class="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-sm transition mb-3">
                <div class="flex justify-between items-center mb-3">
                  <div>
                    <h6 class="font-semibold text-gray-700 flex items-center gap-2">
                      <i class="fas fa-hotel text-blue-500 text-sm"></i>
                      ${cat.category_name}
                    </h6>
                    <p class="text-xs text-gray-400">${rates.length} rate row(s)</p>
                  </div>
                  <button onclick="window.openRateInputModal(${pkg.id}, ${cat.id}, '${pkg.table_format}')" 
                          class="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition flex items-center gap-1">
                    <i class="fas fa-edit"></i> Edit Rates
                  </button>
                </div>
                
                <div class="overflow-x-auto">
                  <table class="w-full text-xs border-collapse">
                    <thead>
                      <tr class="bg-gray-100">
                        <th class="border border-gray-300 px-3 py-2 text-left">Season</th>
                        <th class="border border-gray-300 px-3 py-2 text-left">Sneak</th>
                        <th class="border border-gray-300 px-3 py-2 text-left">Duration/Travel-Date</th>
                        ${regularColumns
                          .map(
                            (col) =>
                              `<th class="border border-gray-300 px-3 py-2 bg-emerald-50 text-emerald-800" title="${col.column_type}">
                            ${col.column_label}
                            ${col.pax_count ? `<span class="text-xs text-gray-500 block">${col.pax_count} pax</span>` : ""}
                          </th>`,
                          )
                          .join("")}
                        ${extraColumns
                          .map(
                            (col) =>
                              `<th class="border border-gray-300 px-3 py-2 bg-purple-50 text-purple-800">
                            ${col.column_label}
                            <span class="text-xs text-purple-500 block">Extra Night</span>
                          </th>`,
                          )
                          .join("")}
                      </tr>
                    </thead>
                    <tbody>
                      ${tableRows}
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          }

          if (!hasAnyRates) {
            container.innerHTML = `
              <div class="border rounded-lg p-4 bg-gradient-to-br from-indigo-50 to-white mb-4">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <div class="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <i class="fas fa-table text-indigo-600"></i>
                    </div>
                    <div>
                      <h5 class="font-bold text-lg text-indigo-800">${pkg.table_format}</h5>
                      ${formatDescription ? `<p class="text-xs text-gray-600">${formatDescription}</p>` : ""}
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button onclick="window.openAssignFormatModal(${pkg.id}, ${destination.id})" 
                            class="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition flex items-center gap-1">
                      <i class="fas fa-sync-alt"></i> Change
                    </button>
                  </div>
                </div>
                
                <div class="grid grid-cols-3 gap-3 mb-4">
                  <div class="bg-white p-2 rounded-lg border border-indigo-200 text-center">
                    <span class="text-xs text-gray-500">Categories</span>
                    <p class="font-bold text-indigo-700">${destination.hotel_categories?.length || 0}</p>
                  </div>
                  <div class="bg-white p-2 rounded-lg border border-indigo-200 text-center">
                    <span class="text-xs text-gray-500">Columns</span>
                    <p class="font-bold text-indigo-700">${columnCount}</p>
                  </div>
                  <div class="bg-white p-2 rounded-lg border border-indigo-200 text-center">
                    <span class="text-xs text-gray-500">Rate Rows</span>
                    <p class="font-bold text-indigo-700">${totalRateRows}</p>
                  </div>
                </div>
                
                <div class="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <i class="fas fa-table text-4xl text-gray-400 mb-3"></i>
                  <p class="text-gray-500 mb-3">No rates entered for this format yet</p>
                  <div class="flex flex-wrap justify-center gap-2">
                    ${destination.hotel_categories
                      ?.map(
                        (cat) => `
                      <button onclick="window.openRateInputModal(${pkg.id}, ${cat.id}, '${pkg.table_format}')" 
                              class="inline-block mx-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 transition">
                        <i class="fas fa-plus-circle mr-1"></i> Add ${cat.category_name} Rates
                      </button>
                    `,
                      )
                      .join("")}
                  </div>
                </div>
              </div>
            `;
          } else {
            container.innerHTML = `
              <div class="border rounded-lg p-4 bg-gradient-to-br from-indigo-50 to-white mb-4">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <div class="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <i class="fas fa-table text-indigo-600"></i>
                    </div>
                    <div>
                      <h5 class="font-bold text-lg text-indigo-800">${pkg.table_format}</h5>
                      ${formatDescription ? `<p class="text-xs text-gray-600">${formatDescription}</p>` : ""}
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button onclick="window.viewRatesModal(${pkg.id}, '${pkg.table_format}')" 
                            class="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200 transition flex items-center gap-1">
                      <i class="fas fa-eye"></i> View All
                    </button>
                    <button onclick="window.openAssignFormatModal(${pkg.id}, ${destination.id})" 
                            class="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition flex items-center gap-1">
                      <i class="fas fa-sync-alt"></i> Change
                    </button>
                  </div>
                </div>
                
                <div class="grid grid-cols-3 gap-3 mb-4">
                  <div class="bg-white p-2 rounded-lg border border-indigo-200 text-center">
                    <span class="text-xs text-gray-500">Categories</span>
                    <p class="font-bold text-indigo-700">${destination.hotel_categories?.length || 0}</p>
                  </div>
                  <div class="bg-white p-2 rounded-lg border border-indigo-200 text-center">
                    <span class="text-xs text-gray-500">Columns</span>
                    <p class="font-bold text-indigo-700">${columnCount}</p>
                  </div>
                  <div class="bg-white p-2 rounded-lg border border-indigo-200 text-center">
                    <span class="text-xs text-gray-500">Rate Rows</span>
                    <p class="font-bold text-indigo-700">${totalRateRows}</p>
                  </div>
                </div>
                
                <div class="space-y-4 mt-3">
                  ${categoriesHtml}
                </div>
              </div>
            `;
          }
        } catch (error) {
          console.error(`Error loading rates for package ${pkg.id}:`, error);
          container.innerHTML = `
            <div class="border rounded-lg p-4 bg-red-50 text-red-700">
              Error loading dynamic rates for this package
            </div>
          `;
        }
      }
    })();

    showLoading(false);
  } catch (error) {
    console.error("Error viewing destination details:", error);
    showToast("Failed to load destination details", "error");
    showLoading(false);
  }
}
export async function renderDestinations() {
  await fetchDestinations();

  const localDestinations = state.destinations.filter(
    (d) => d.country === "Philippines",
  );
  const internationalDestinations = state.destinations.filter(
    (d) => d.country !== "Philippines",
  );

  return `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold">Destinations</h1>
          <p class="text-sm text-gray-500 mt-1">${state.destinations.length} total • ${localDestinations.length} local • ${internationalDestinations.length} international</p>
        </div>
        <button onclick="window.openCreateDestinationModal()" 
                class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2">
          <i class="fas fa-plus"></i> Add Destination
        </button>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${state.destinations
          .map((dest) => {
            const primaryImage =
              dest.images?.find((img) => img.is_primary) || dest.images?.[0];
            const imageUrl =
              primaryImage?.url || getDestinationImage(dest.name);
            // Limit description to 100 characters
            const shortDescription = dest.description
              ? dest.description.length > 100
                ? dest.description.substring(0, 100) + "..."
                : dest.description
              : "No description available.";

            return `
            <div class="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition flex flex-col h-full">
              <div class="h-40 bg-gray-100 relative">
                <img src="${imageUrl}" alt="${dest.name}" class="w-full h-full object-cover">
                <div class="absolute top-2 right-2">
                  <span class="px-2 py-1 text-xs rounded-full ${dest.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}">
                    ${dest.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div class="p-4 flex-1 flex flex-col">
                <h3 class="font-bold text-lg">${dest.name}</h3>
                <p class="text-sm text-gray-500 mb-2">${dest.country === "Philippines" ? "🇵🇭 Local" : "🌏 International"}</p>
                
                <!-- Destination Description -->
                <p class="text-xs text-gray-600 mb-3 line-clamp-2" title="${dest.description || "No description"}">
                  ${shortDescription}
                </p>
                
                <div class="flex gap-2 mt-auto">
                  <button onclick="window.viewDestinationDetails(${dest.id})" 
                          class="flex-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition flex items-center justify-center gap-1">
                    <i class="fas fa-eye text-xs"></i> View
                  </button>
                 
                  <button onclick="window.confirmDeleteDestination(${dest.id})" 
                          class="flex-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition flex items-center justify-center gap-1">
                    <i class="fas fa-trash text-xs"></i> Delete
                  </button>
                </div>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    </div>
  `;
}

export async function refreshDestinationsPage() {
  console.log("🔄 Refreshing destinations page...");
  showToast("Refreshing data...", "info");

  await fetchDestinations();

  const mainContent = document.getElementById("mainContent");
  if (mainContent) {
    mainContent.innerHTML = await renderDestinations();
  }

  showToast("✅ Data refreshed!", "success");
}

export function openCreateDestinationModal() {
  const modal = document.createElement("div");
  modal.id = "createDestinationModal";
  modal.className =
    "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";

  modal.innerHTML = `
    <div class="bg-white rounded-2xl w-full h-full max-w-[98vw] max-h-[95vh] shadow-2xl transform transition-all flex flex-col">
      <!-- Fixed Header -->
      <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 flex-shrink-0 sticky top-0 z-20">
        <div class="absolute inset-0 bg-black/10"></div>
        <div class="relative px-6 py-4">
          <div class="flex items-center gap-4">
            <div class="h-12 w-12 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/30">
              <i class="fas fa-map-pin text-2xl text-white"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-white tracking-tight">Create New Destination</h3>
              <p class="text-indigo-100 text-sm mt-1">Add a new destination with multiple packages</p>
            </div>
            <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
        </div>
      </div>
      
      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <form id="createDestinationForm" class="space-y-6">
          
          <!-- ========================================= -->
          <!-- SECTION 1: BASIC DESTINATION INFORMATION -->
          <!-- ========================================= -->
          <div class="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border-2 border-gray-100">
            <h4 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i class="fas fa-info-circle text-indigo-500"></i>
              Destination Information
            </h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-600 mb-2">Destination Name <span class="text-red-500">*</span></label>
                <input type="text" name="name" required
                       class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
                       placeholder="e.g., Boracay, Tokyo">
              </div>
              
              <div>
                <label class="block text-sm font-semibold text-gray-600 mb-2">Destination Type <span class="text-red-500">*</span></label>
                <select name="country" id="destinationCountry" required
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm">
                  <option value="">Select Type</option>
                  <option value="Philippines" selected>🇵🇭 Local (Philippines)</option>
                  <option value="International">🌏 International</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-semibold text-gray-600 mb-2">Subcategory <span class="text-red-500">*</span></label>
                <select name="subcategory" id="destinationSubcategory" required
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm bg-white">
                  <option value="">Select Subcategory</option>
                  <option value="Land Tours">🏞️ Land Tours</option>
                  <option value="Domestic">🇵🇭 Domestic</option>
                  <option value="Promo">🏷️ Promo</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-semibold text-gray-600 mb-2">Airport Code</label>
                <input type="text" name="airport_code"
                       class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
                       placeholder="e.g., MPH">
              </div>
              
              <div>
                <label class="block text-sm font-semibold text-gray-600 mb-2">Airport Name</label>
                <input type="text" name="airport_name"
                       class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
                       placeholder="e.g., Ninoy Aquino International Airport">
              </div>
              
              <div class="md:col-span-2 lg:col-span-3">
                <label class="block text-sm font-semibold text-gray-600 mb-2">Description</label>
                <textarea name="description" rows="2"
                          class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
                          placeholder="Describe this destination..."></textarea>
              </div>
             
              <!-- ========================================= -->
              <!-- COVER IMAGE WITH BOTH UPLOAD AND URL OPTIONS -->
              <!-- ========================================= -->
              <div class="md:col-span-2 lg:col-span-3">
                <label class="block text-sm font-semibold text-gray-600 mb-2">Cover Image</label>
                
                <!-- Image Source Tabs -->
                <div class="flex border-b border-gray-200 mb-4">
                  <button type="button" id="uploadTabBtn" class="px-4 py-2 text-sm font-medium text-indigo-600 border-b-2 border-indigo-600">Upload File</button>
                  <button type="button" id="urlTabBtn" class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Image URL</button>
                </div>
                
                <!-- Upload Method (Default) -->
                <div id="uploadMethod" class="space-y-3">
                  <div id="imageUploadArea" 
                       class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition cursor-pointer relative">
                    
                    <!-- Hidden file input -->
                    <input type="file" id="imageFileInput" name="image_file" 
                           accept="image/png,image/jpeg,image/jpg,image/webp" 
                           class="hidden">
                    
                    <!-- Default Upload Icon -->
                    <div id="uploadPlaceholder" class="space-y-2">
                      <i class="fas fa-cloud-upload-alt text-3xl text-gray-400"></i>
                      <p class="text-sm text-gray-600">Click to select an image or drag and drop</p>
                      <p class="text-xs text-gray-400">PNG, JPG, WEBP up to 5MB</p>
                    </div>
                    
                    <!-- Image Preview (hidden by default) -->
                    <div id="imagePreview" class="hidden space-y-3">
                      <img id="previewImg" src="#" alt="Preview" class="max-h-40 mx-auto rounded-lg shadow-md">
                      <div class="flex items-center justify-center gap-2 text-sm">
                        <i class="fas fa-check-circle text-green-500"></i>
                        <span id="fileName" class="font-medium text-gray-700"></span>
                        <span id="fileSize" class="text-xs text-gray-500"></span>
                      </div>
                      <button type="button" onclick="window.clearSelectedImage(event)" 
                              class="text-xs text-red-600 hover:text-red-800 bg-red-50 px-3 py-1 rounded-full">
                        <i class="fas fa-times mr-1"></i> Remove
                      </button>
                    </div>
                  </div>
                </div>
                
                <!-- URL Method (Hidden by Default) -->
                <div id="urlMethod" class="hidden space-y-3">
                  <div class="border-2 border-gray-300 rounded-lg p-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                    <input type="url" name="image_url" id="imageUrlInput"
                           class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
                           placeholder="https://example.com/image.jpg">
                    <p class="text-xs text-gray-500 mt-2">
                      <i class="fas fa-info-circle"></i>
                      Enter a publicly accessible image URL
                    </p>
                    
                    <!-- URL Preview -->
                    <div id="urlPreviewContainer" class="mt-3 hidden">
                      <img id="urlPreviewImg" src="#" alt="URL Preview" class="max-h-40 mx-auto rounded-lg shadow-md">
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ========================================= -->
          <!-- SECTION 2: HOTEL CATEGORIES (Global for Destination) -->
          <!-- ========================================= -->
          <div class="bg-gradient-to-br from-blue-50 to-white p-5 rounded-xl border-2 border-blue-100">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                <i class="fas fa-layer-group text-blue-500"></i>
                Hotel Categories (Global for Destination)
              </h4>
              <button type="button" onclick="addHotelCategoryRow()" 
                      class="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                <i class="fas fa-plus-circle mr-1"></i> Add Category
              </button>
            </div>
            <p class="text-xs text-gray-500 mb-3">These categories will be available for all packages</p>
            
            <div id="hotelCategoriesContainer" class="space-y-3">
              <!-- Default first category -->
              <div class="hotel-category-row grid grid-cols-1 md:grid-cols-5 gap-3 items-end bg-blue-50 p-3 rounded-lg">
                <div class="md:col-span-2">
                  <label class="block text-xs font-semibold text-gray-600 mb-1">Category Name</label>
                  <input type="text" name="hotel_categories[0][name]" placeholder="e.g., Budget, Standard, Deluxe"
                         class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">Display Order</label>
                  <input type="number" name="hotel_categories[0][display_order]" value="1"
                         class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">Max Capacity</label>
                  <input type="number" name="hotel_categories[0][max_capacity]" value="4"
                         class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
                </div>
                <div>
                  <label class="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="hotel_categories[0][has_breakfast]" value="true" class="h-4 w-4 text-blue-600 rounded">
                    <span class="text-xs">Has Breakfast</span>
                  </label>
                </div>
                <div class="md:col-span-5 mt-2">
                  <label class="block text-xs font-semibold text-gray-600 mb-1">Breakfast Note</label>
                  <input type="text" name="hotel_categories[0][breakfast_note]" 
                         placeholder="e.g., Breakfast at hotel restaurant"
                         class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
                </div>
              </div>
            </div>
          </div>

          <!-- ========================================= -->
          <!-- SECTION 3: HOTELS (Per Category) -->
          <!-- ========================================= -->
          <div class="bg-gradient-to-br from-cyan-50 to-white p-5 rounded-xl border-2 border-cyan-100">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                <i class="fas fa-hotel text-cyan-500"></i>
                Hotels (Add to Categories)
              </h4>
              <button type="button" onclick="addHotelRow()" 
                      class="px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600">
                <i class="fas fa-plus-circle mr-1"></i> Add Hotel
              </button>
            </div>
            <p class="text-xs text-gray-500 mb-3">Add hotels that will belong to the categories above</p>
            
            <div id="hotelsContainer" class="space-y-3">
              <!-- Hotels will be added dynamically -->
            </div>
          </div>

          <!-- ========================================= -->
          <!-- SECTION 4: PACKAGES - MULTIPLE PACKAGES SUPPORT -->
          <!-- ========================================= -->
          <div class="bg-gradient-to-br from-emerald-50 to-white p-5 rounded-xl border-2 border-emerald-100">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                <i class="fas fa-boxes text-emerald-500"></i>
                Tour Packages
              </h4>
              <button type="button" onclick="addPackageSection()" 
                      class="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                <i class="fas fa-plus-circle mr-1"></i> Add Package
              </button>
            </div>
            <p class="text-xs text-gray-500 mb-3">Create multiple packages for this destination</p>
            
            <div id="packagesContainer" class="space-y-8">
              <!-- First package will be added by default -->
            </div>
          </div>

          <!-- ========================================= -->
          <!-- SECTION 5: OPTIONAL TOURS -->
          <!-- ========================================= -->
          <div class="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl border-2 border-purple-100">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                <i class="fas fa-compass text-purple-500"></i>
                Optional Tours
              </h4>
              <button type="button" onclick="addOptionalTourRow()" 
                      class="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 flex items-center gap-1">
                <i class="fas fa-plus-circle"></i> Add Optional Tour
              </button>
            </div>
            <p class="text-xs text-gray-500 mb-3">Add optional tours that can be added to packages</p>
            
            <div id="optionalToursContainer" class="space-y-4">
              <!-- Optional tours will be added here dynamically -->
            </div>
          </div>

          <!-- ========================================= -->
          <!-- ACTION BUTTONS -->
          <!-- ========================================= -->
          <div class="flex justify-end gap-3 pt-6 border-t-2 border-gray-100 sticky bottom-0 bg-white pb-2">
            <button type="button" onclick="this.closest('.fixed').remove()"
                    class="px-5 py-2.5 border-2 border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit"
                    class="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm hover:from-indigo-700 hover:to-purple-700">
              Create Destination with All Packages
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // =====================================================
  // DEFINE GLOBAL FUNCTIONS
  // =====================================================

  // Clear selected image
  window.clearSelectedImage = function (event) {
    if (event) event.stopPropagation();

    const fileInput = document.getElementById("imageFileInput");
    const uploadPlaceholder = document.getElementById("uploadPlaceholder");
    const imagePreview = document.getElementById("imagePreview");
    const previewImg = document.getElementById("previewImg");
    const uploadArea = document.getElementById("imageUploadArea");

    if (fileInput) fileInput.value = "";
    if (uploadPlaceholder) uploadPlaceholder.classList.remove("hidden");
    if (imagePreview) imagePreview.classList.add("hidden");
    if (previewImg) previewImg.src = "#";
    if (uploadArea)
      uploadArea.classList.remove("border-indigo-500", "bg-indigo-50");

    const urlInput = document.getElementById("imageUrlInput");
    const urlPreviewContainer = document.getElementById("urlPreviewContainer");
    if (urlInput) urlInput.value = "";
    if (urlPreviewContainer) urlPreviewContainer.classList.add("hidden");
  };

  // =====================================================
  // IMAGE UPLOAD/URL TAB FUNCTIONALITY
  // =====================================================
  const uploadTabBtn = document.getElementById("uploadTabBtn");
  const urlTabBtn = document.getElementById("urlTabBtn");
  const uploadMethod = document.getElementById("uploadMethod");
  const urlMethod = document.getElementById("urlMethod");
  const urlInput = document.getElementById("imageUrlInput");
  const urlPreviewContainer = document.getElementById("urlPreviewContainer");
  const urlPreviewImg = document.getElementById("urlPreviewImg");
  const fileInput = document.getElementById("imageFileInput");

  if (uploadTabBtn && urlTabBtn) {
    uploadTabBtn.addEventListener("click", () => {
      uploadTabBtn.classList.add(
        "text-indigo-600",
        "border-b-2",
        "border-indigo-600",
      );
      uploadTabBtn.classList.remove("text-gray-500");
      urlTabBtn.classList.remove(
        "text-indigo-600",
        "border-b-2",
        "border-indigo-600",
      );
      urlTabBtn.classList.add("text-gray-500");

      if (uploadMethod) uploadMethod.classList.remove("hidden");
      if (urlMethod) urlMethod.classList.add("hidden");

      if (urlInput) {
        urlInput.disabled = true;
        urlInput.required = false;
      }
      if (fileInput) fileInput.disabled = false;
    });

    urlTabBtn.addEventListener("click", () => {
      urlTabBtn.classList.add(
        "text-indigo-600",
        "border-b-2",
        "border-indigo-600",
      );
      urlTabBtn.classList.remove("text-gray-500");
      uploadTabBtn.classList.remove(
        "text-indigo-600",
        "border-b-2",
        "border-indigo-600",
      );
      uploadTabBtn.classList.add("text-gray-500");

      if (urlMethod) urlMethod.classList.remove("hidden");
      if (uploadMethod) uploadMethod.classList.add("hidden");

      if (urlInput) {
        urlInput.disabled = false;
        urlInput.required = false;
      }
      if (fileInput) {
        fileInput.disabled = true;
        fileInput.value = "";
        window.clearSelectedImage();
      }
    });
  }

  // URL preview on input
  if (urlInput) {
    urlInput.addEventListener("input", function () {
      const url = this.value.trim();
      if (url && urlPreviewContainer && urlPreviewImg) {
        urlPreviewImg.src = url;
        urlPreviewContainer.classList.remove("hidden");

        urlPreviewImg.onerror = function () {
          urlPreviewContainer.classList.add("hidden");
          showToast("Invalid image URL or image cannot be loaded", "warning");
        };

        urlPreviewImg.onload = function () {
          urlPreviewContainer.classList.remove("hidden");
        };
      } else if (urlPreviewContainer) {
        urlPreviewContainer.classList.add("hidden");
      }
    });
  }

  // =====================================================
  // IMAGE PREVIEW FUNCTIONALITY
  // =====================================================
  const uploadArea = document.getElementById("imageUploadArea");
  const uploadPlaceholder = document.getElementById("uploadPlaceholder");
  const imagePreview = document.getElementById("imagePreview");
  const previewImg = document.getElementById("previewImg");
  const fileName = document.getElementById("fileName");
  const fileSize = document.getElementById("fileSize");

  if (uploadArea && fileInput) {
    uploadArea.addEventListener("click", function (e) {
      if (e.target.closest("button")) return;
      fileInput.click();
    });

    fileInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        const validTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
        ];
        if (!validTypes.includes(file.type)) {
          showToast(
            "Please select a valid image file (PNG, JPG, JPEG, WEBP)",
            "error",
          );
          fileInput.value = "";
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          showToast("File size must be less than 5MB", "error");
          fileInput.value = "";
          return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
          if (previewImg) previewImg.src = e.target.result;
          if (uploadPlaceholder) uploadPlaceholder.classList.add("hidden");
          if (imagePreview) imagePreview.classList.remove("hidden");

          const fileSizeKB = (file.size / 1024).toFixed(1);
          const fileSizeDisplay =
            fileSizeKB > 1024
              ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
              : `${fileSizeKB} KB`;

          if (fileName) fileName.textContent = file.name;
          if (fileSize) fileSize.textContent = `(${fileSizeDisplay})`;

          showToast(`✅ Image selected: ${file.name}`, "success");
        };
        reader.readAsDataURL(file);
      }
    });

    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.classList.add("border-indigo-500", "bg-indigo-50");
    });

    uploadArea.addEventListener("dragleave", () => {
      uploadArea.classList.remove("border-indigo-500", "bg-indigo-50");
    });

    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.classList.remove("border-indigo-500", "bg-indigo-50");

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        fileInput.files = e.dataTransfer.files;
        const event = new Event("change", { bubbles: true });
        fileInput.dispatchEvent(event);
      } else {
        showToast("Please drop an image file", "error");
      }
    });
  }

  // =====================================================
  // HOTEL CATEGORY FUNCTIONS
  // =====================================================
  window.addHotelCategoryRow = function () {
    const container = document.getElementById("hotelCategoriesContainer");
    const rowCount = container.children.length;
    const rowHtml = `
      <div class="hotel-category-row grid grid-cols-1 md:grid-cols-5 gap-3 items-end bg-blue-50 p-3 rounded-lg">
        <div class="md:col-span-2">
          <label class="block text-xs font-semibold text-gray-600 mb-1">Category Name</label>
          <input type="text" name="hotel_categories[${rowCount}][name]" placeholder="e.g., Budget, Standard, Deluxe"
                 class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Display Order</label>
          <input type="number" name="hotel_categories[${rowCount}][display_order]" value="${rowCount + 1}"
                 class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Max Capacity</label>
          <input type="number" name="hotel_categories[${rowCount}][max_capacity]" value="4"
                 class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
        </div>
        <div>
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" name="hotel_categories[${rowCount}][has_breakfast]" value="true" class="h-4 w-4 text-blue-600 rounded">
            <span class="text-xs">Has Breakfast</span>
          </label>
        </div>
        <div class="md:col-span-5 mt-2">
          <label class="block text-xs font-semibold text-gray-600 mb-1">Breakfast Note</label>
          <div class="flex gap-2">
            <input type="text" name="hotel_categories[${rowCount}][breakfast_note]" 
                   placeholder="e.g., Breakfast at hotel restaurant"
                   class="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
            <button type="button" onclick="this.closest('.hotel-category-row').remove(); setTimeout(() => updateAllPackagesHotelRates(), 100)" 
                    class="px-2 py-1 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", rowHtml);
    updateHotelCategorySelects();
    // Update all package hotel rates when a new category is added
    setTimeout(() => updateAllPackagesHotelRates(), 100);
  };

  // Update all hotel category selects when categories change
  function updateHotelCategorySelects() {
    const categories = document.querySelectorAll(
      '.hotel-category-row input[name*="[name]"]',
    );
    const categoryNames = Array.from(categories)
      .map((input) => input.value)
      .filter((name) => name);

    // Update all hotel rows with category selects
    document
      .querySelectorAll('.hotel-row select[name*="[category_id]"]')
      .forEach((select) => {
        const currentValue = select.value;
        let options = '<option value="">Select Category</option>';
        document
          .querySelectorAll(".hotel-category-row")
          .forEach((row, index) => {
            const catNameInput = row.querySelector('input[name*="[name]"]');
            const catName = catNameInput?.value || `Category ${index + 1}`;
            options += `<option value="${index}" ${currentValue == index ? "selected" : ""}>${catName}</option>`;
          });
        select.innerHTML = options;
      });
  }

  // =====================================================
  // OPTIONAL TOUR FUNCTIONS FOR CREATE DESTINATION
  // =====================================================
  window.addOptionalTourRow = function () {
    const container = document.getElementById("optionalToursContainer");
    const tourCount = container.children.length;

    const tourHtml = `
      <div class="optional-tour-row bg-purple-50 p-4 rounded-lg border-2 border-purple-200 relative">
        <div class="flex justify-between items-start mb-3">
          <h5 class="font-semibold text-sm text-purple-700">Optional Tour #${tourCount + 1}</h5>
          <button type="button" onclick="this.closest('.optional-tour-row').remove()" 
                  class="text-red-500 hover:text-red-700 p-1">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-gray-600 mb-1">Tour Name</label>
            <input type="text" name="optional_tours[${tourCount}][name]" 
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="e.g., Island Hopping Tour">
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Duration/Travel-Date (hours)</label>
            <input type="number" name="optional_tours[${tourCount}][duration]" step="0.5"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="e.g., 4">
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Image URL</label>
            <input type="url" name="optional_tours[${tourCount}][image_url]" 
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="https://example.com/image.jpg">
          </div>
          
          <!-- Rates -->
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Rate Solo</label>
            <input type="number" name="optional_tours[${tourCount}][rate_solo]" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="0.00">
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Rate 2 Pax</label>
            <input type="number" name="optional_tours[${tourCount}][rate_2pax]" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="0.00">
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Rate 3 Pax</label>
            <input type="number" name="optional_tours[${tourCount}][rate_3pax]" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="0.00">
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Rate 4 Pax</label>
            <input type="number" name="optional_tours[${tourCount}][rate_4pax]" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="0.00">
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Rate 5 Pax</label>
            <input type="number" name="optional_tours[${tourCount}][rate_5pax]" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="0.00">
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Rate 6 Pax</label>
            <input type="number" name="optional_tours[${tourCount}][rate_6pax]" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="0.00">
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Rate 7 Pax</label>
            <input type="number" name="optional_tours[${tourCount}][rate_7pax]" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="0.00">
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Rate 8 Pax</label>
            <input type="number" name="optional_tours[${tourCount}][rate_8pax]" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="0.00">
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Rate 9 Pax</label>
            <input type="number" name="optional_tours[${tourCount}][rate_9pax]" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="0.00">
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Rate 10 Pax</label>
            <input type="number" name="optional_tours[${tourCount}][rate_10pax]" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="0.00">
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Rate 11 Pax</label>
            <input type="number" name="optional_tours[${tourCount}][rate_11pax]" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="0.00">
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Rate 12 Pax</label>
            <input type="number" name="optional_tours[${tourCount}][rate_12pax]" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="0.00">
          </div>
          
          <div class="col-span-2">
            <label class="block text-xs font-semibold text-gray-600 mb-1">Itinerary (one per line)</label>
            <textarea name="optional_tours[${tourCount}][itinerary]" rows="3"
                      class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                      placeholder="08:00 AM - Pick up from hotel&#10;09:00 AM - Visit attraction 1&#10;12:00 PM - Lunch"></textarea>
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Inclusions (one per line)</label>
            <textarea name="optional_tours[${tourCount}][inclusions]" rows="3"
                      class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                      placeholder="Hotel pick up&#10;Tour guide&#10;Lunch"></textarea>
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Exclusions (one per line)</label>
            <textarea name="optional_tours[${tourCount}][exclusions]" rows="3"
                      class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                      placeholder="Personal expenses&#10;Gratuities"></textarea>
          </div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", tourHtml);
  };

  // Add one default optional tour row
  setTimeout(() => {
    if (document.getElementById("optionalToursContainer")) {
      window.addOptionalTourRow();
    }
  }, 100);

  // =====================================================
  // HOTEL FUNCTIONS
  // =====================================================
  window.addHotelRow = function () {
    const container = document.getElementById("hotelsContainer");
    const rowCount = container.children.length;

    // Get categories for select
    let categoryOptions = '<option value="">Select Category</option>';
    document.querySelectorAll(".hotel-category-row").forEach((row, index) => {
      const catNameInput = row.querySelector('input[name*="[name]"]');
      const catName = catNameInput?.value || `Category ${index + 1}`;
      categoryOptions += `<option value="${index}">${catName}</option>`;
    });

    const rowHtml = `
      <div class="hotel-row bg-cyan-50 p-4 rounded-lg border-2 border-cyan-200">
        <div class="flex justify-between items-start mb-3">
          <h5 class="font-semibold text-sm text-cyan-700">Hotel #${rowCount + 1}</h5>
          <button type="button" onclick="this.closest('.hotel-row').remove()" 
                  class="px-2 py-1 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Category</label>
            <select name="hotels[${rowCount}][category_id]" required class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
              ${categoryOptions}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Hotel Name</label>
            <input type="text" name="hotels[${rowCount}][name]" required
                   placeholder="e.g., Boracay Beach Resort"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Max Capacity</label>
            <input type="number" name="hotels[${rowCount}][max_capacity]" 
                   placeholder="e.g., 4"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Image URL</label>
            <input type="url" name="hotels[${rowCount}][image_url]" 
                   placeholder="https://example.com/hotel.jpg"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <textarea name="hotels[${rowCount}][description]" rows="2"
                      class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                      placeholder="Hotel description..."></textarea>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <input type="text" name="hotels[${rowCount}][notes]" 
                   placeholder="Any special notes"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", rowHtml);
  };

  // =====================================================
  // PACKAGE FUNCTIONS
  // =====================================================

  // Add new package section
  window.addPackageSection = function () {
    const container = document.getElementById("packagesContainer");
    const packageCount = container.children.length;
    addPackageSectionWithIndex(packageCount);
  };

  function addPackageSectionWithIndex(packageIndex) {
    const container = document.getElementById("packagesContainer");

    const packageHtml = `
      <div class="package-section bg-emerald-50 p-5 rounded-xl border-2 border-emerald-200" data-package-index="${packageIndex}">
        <div class="flex justify-between items-center mb-4">
          <h4 class="text-lg font-bold text-emerald-800 flex items-center gap-2">
            <i class="fas fa-box text-emerald-600"></i>
            Package #${packageIndex + 1}
          </h4>
          ${
            packageIndex > 0
              ? `
            <button type="button" onclick="this.closest('.package-section').remove()" 
                    class="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
              <i class="fas fa-trash mr-1"></i> Remove Package
            </button>
          `
              : ""
          }
        </div>

        <!-- Package Basic Info -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label class="block text-sm font-semibold text-gray-600 mb-2">Package Code</label>
            <input type="text" name="packages[${packageIndex}][code]" 
                   class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="e.g., BCD-FE-3D2N">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-600 mb-2">Package Name</label>
            <input type="text" name="packages[${packageIndex}][name]" required
                   class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="e.g., 3D2N Free and Easy">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-600 mb-2">Has Extra Night?</label>
            <div class="flex items-center h-full">
              <label class="flex items-center gap-2">
                <input type="checkbox" name="packages[${packageIndex}][has_extra_night]" value="true" class="h-4 w-4 text-emerald-600 rounded">
                <span class="text-sm text-gray-700">Yes, allow extra night option</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Hotel Rates for this Package - TABLE FORMAT WITH SEASON, SNEAK AND DURATION -->
        <div class="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4">
          <h5 class="font-semibold text-sm mb-3 text-purple-700">Hotel Rates for Package #${packageIndex + 1} (₱ per person)</h5>
          <div id="package-${packageIndex}-hotel-rates" class="space-y-4">
            <!-- Rates will be added based on categories -->
          </div>
        </div>

        <!-- Itinerary for this Package -->
        <div class="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4">
          <div class="flex items-center justify-between mb-3">
            <h5 class="font-semibold text-sm text-amber-700">Itinerary for Package #${packageIndex + 1}</h5>
            <button type="button" onclick="addPackageItineraryDay(${packageIndex})" 
                    class="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs hover:bg-amber-600">
              <i class="fas fa-plus-circle mr-1"></i> Add Day
            </button>
          </div>
          <div id="package-${packageIndex}-itinerary" class="space-y-3">
            <!-- Default 3 days -->
          </div>
        </div>

        <!-- Inclusions for this Package -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="bg-white p-4 rounded-lg border-2 border-gray-200">
            <h5 class="font-semibold text-sm mb-2 text-green-700">Inclusions</h5>
            <textarea name="packages[${packageIndex}][inclusions]" rows="3" 
                      class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                      placeholder="Hotel accommodation&#10;Daily breakfast&#10;Airport transfers"></textarea>
            <p class="text-xs text-gray-500 mt-1">One per line</p>
          </div>
          
          <div class="bg-white p-4 rounded-lg border-2 border-gray-200">
            <h5 class="font-semibold text-sm mb-2 text-red-700">Exclusions</h5>
            <textarea name="packages[${packageIndex}][exclusions]" rows="3" 
                      class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                      placeholder="Airfare&#10;Personal expenses&#10;Optional tours"></textarea>
            <p class="text-xs text-gray-500 mt-1">One per line</p>
          </div>
        </div>

        <!-- Transportation for this Package -->
        <div class="bg-white p-4 rounded-lg border-2 border-gray-200">
          <div class="flex items-center justify-between mb-3">
            <h5 class="font-semibold text-sm text-cyan-700">Transportation</h5>
            <button type="button" onclick="addPackageTransportation(${packageIndex})" 
                    class="px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-xs hover:bg-cyan-600">
              <i class="fas fa-plus-circle mr-1"></i> Add Transport
            </button>
          </div>
          <div id="package-${packageIndex}-transportation" class="space-y-2">
            <!-- Transportation rows will be added here -->
          </div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", packageHtml);

    // Initialize hotel rates for this package
    setTimeout(() => updatePackageHotelRates(packageIndex), 100);
    // Initialize itinerary with default 3 days
    initializePackageItinerary(packageIndex);
  }

  // Initialize package itinerary with 3 default days
  function initializePackageItinerary(packageIndex) {
    const container = document.getElementById(
      `package-${packageIndex}-itinerary`,
    );
    if (!container) return;

    container.innerHTML = "";
    for (let i = 1; i <= 3; i++) {
      addPackageItineraryDay(packageIndex, i);
    }
  }

  // Add itinerary day for a specific package
  window.addPackageItineraryDay = function (packageIndex, dayNum = null) {
    const container = document.getElementById(
      `package-${packageIndex}-itinerary`,
    );
    if (!container) return;

    const dayCount = dayNum || container.children.length + 1;
    const dayHtml = `
      <div class="flex items-start gap-2 bg-white p-3 rounded-lg border-2 border-gray-200" data-day="${dayCount}">
        <span class="text-xs font-bold text-gray-600 w-12 pt-2 flex-shrink-0">Day ${dayCount}:</span>
        <textarea name="packages[${packageIndex}][itineraries][${dayCount}]" rows="3" 
                  class="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm resize-y"
                  placeholder="Enter itinerary for day ${dayCount}..."></textarea>
        <button type="button" onclick="this.closest('[data-day]').remove()" 
                class="text-red-500 hover:text-red-700 p-2 flex-shrink-0">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", dayHtml);
  };

  // Add transportation for a specific package
  window.addPackageTransportation = function (packageIndex) {
    const container = document.getElementById(
      `package-${packageIndex}-transportation`,
    );
    const rowCount = container.children.length;
    const rowHtml = `
      <div class="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border-2 border-gray-200">
        <select name="packages[${packageIndex}][transportation][${rowCount}][mode]" class="flex-1 px-2 py-1.5 border-2 border-gray-200 rounded-lg text-xs">
          <option value="private_van">Private Van</option>
          <option value="private_car">Private Car</option>
          <option value="coaster">Coaster Bus</option>
          <option value="shuttle">Shuttle</option>
        </select>
        <input type="text" name="packages[${packageIndex}][transportation][${rowCount}][description]" 
               placeholder="Description" class="flex-1 px-2 py-1.5 border-2 border-gray-200 rounded-lg text-xs">
        <label class="flex items-center gap-1 text-xs">
          <input type="checkbox" name="packages[${packageIndex}][transportation][${rowCount}][included]" value="true" checked class="h-4 w-4 text-cyan-600 rounded">
          <span>Included</span>
        </label>
        <button type="button" onclick="this.closest('.flex').remove()" class="text-red-500 hover:text-red-700 p-1">
          <i class="fas fa-times text-xs"></i>
        </button>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", rowHtml);
  };

  // Update hotel rates for a package based on categories - FIXED VERSION
  function updatePackageHotelRates(packageIndex) {
    const container = document.getElementById(
      `package-${packageIndex}-hotel-rates`,
    );
    if (!container) return;

    const categories = document.querySelectorAll(".hotel-category-row");

    if (categories.length === 0) {
      container.innerHTML =
        '<p class="text-sm text-gray-500 italic">Add hotel categories first</p>';
      return;
    }

    let ratesHtml = "";

    categories.forEach((cat, catIndex) => {
      const catNameInput = cat.querySelector('input[name*="[name]"]');
      const catName = catNameInput?.value || `Category ${catIndex + 1}`;

      ratesHtml += `
        <div class="border-2 border-gray-200 rounded-xl p-6 mb-8 bg-white shadow-sm" data-category-index="${catIndex}">
          <div class="flex items-center justify-between mb-4">
            <h6 class="font-semibold text-lg text-indigo-700">${catName}</h6>
          </div>
          
          <!-- Regular Rates Table -->
          <div class="mb-8">
            <div class="flex items-center justify-between mb-3">
              <h6 class="text-base font-semibold text-gray-600">Regular Rates</h6>
              <button type="button" onclick="addRateRow(${packageIndex}, ${catIndex}, 'regular')" 
                      class="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs hover:bg-indigo-600 transition flex items-center gap-1">
                <i class="fas fa-plus-circle"></i> Add Regular Rate Row
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full border-collapse text-sm min-w-[1400px]">
                <thead>
                  <tr class="bg-gray-100">
                    <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[180px]">Season</th>
                    <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[150px]">Sneak In</th>
                    <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[120px]">Duration/Travel-Date</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">Solo</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">2P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">3P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">4P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">5P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">6P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">7P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">8P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">9P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">10P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">11P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">12P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">13P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">14P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">15P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">Child</th>
                    <th class="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 min-w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody id="package-${packageIndex}-cat-${catIndex}-regular-rates">
                  <!-- Regular rate rows will be added here -->
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Extra Night Rates Table -->
          <div class="mt-6">
            <div class="flex items-center justify-between mb-3">
              <h6 class="text-base font-semibold text-gray-600">Extra Night Rates</h6>
              <button type="button" onclick="addRateRow(${packageIndex}, ${catIndex}, 'extra')" 
                      class="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs hover:bg-indigo-600 transition flex items-center gap-1">
                <i class="fas fa-plus-circle"></i> Add Extra Night Rate Row
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full border-collapse text-sm min-w-[1400px]">
                <thead>
                  <tr class="bg-gray-50">
                    <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[180px]">Season</th>
                    <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[150px]">Sneak In</th>
                    <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[120px]">Duration/Travel-Date</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">Solo</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">2P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">3P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">4P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">5P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">6P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">7P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">8P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">9P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">10P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">11P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">12P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">13P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">14P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">15P</th>
                    <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">Child</th>
                    <th class="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 min-w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody id="package-${packageIndex}-cat-${catIndex}-extra-rates">
                  <!-- Extra night rate rows will be added here -->
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Breakfast Options -->
          <div class="mt-4 pt-3 border-t border-gray-200 grid grid-cols-2 gap-4">
            <div>
              <label class="flex items-center gap-2">
                <input type="checkbox" name="packages[${packageIndex}][hotel_rates][${catIndex}][breakfast_included]" value="true" checked class="h-4 w-4 text-indigo-600 rounded">
                <span class="text-sm text-gray-700">Breakfast Included</span>
              </label>
            </div>
            <div>
              <input type="text" name="packages[${packageIndex}][hotel_rates][${catIndex}][breakfast_notes]" 
                     placeholder="Breakfast notes (optional)" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            </div>
          </div>
          
          <!-- Additional Information Field -->
          <div class="mt-4 pt-3 border-t border-gray-200">
            <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <i class="fas fa-info-circle text-indigo-500"></i>
              Additional Information (Check-in/out times, policies, etc.)
            </label>
            <textarea name="packages[${packageIndex}][hotel_rates][${catIndex}][additional_info]" rows="4"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="Check-in: 2:00 PM
Check-out: 12:00 PM
Free WiFi
Pool access
Parking available"></textarea>
            <p class="text-xs text-gray-500 mt-1">One item per line for better formatting</p>
          </div>
        </div>
      `;
    });

    container.innerHTML = ratesHtml;

    // Add default rows for each category
    categories.forEach((_, catIndex) => {
      // Add one default regular rate row
      addRateRow(packageIndex, catIndex, "regular");
      // Add one default extra night rate row
      addRateRow(packageIndex, catIndex, "extra");
    });
  }

  // Function to add a new rate row with Season, Sneak, and Duration - FIXED VERSION
  window.addRateRow = function (packageIndex, catIndex, type) {
    const tbodyId =
      type === "regular"
        ? `package-${packageIndex}-cat-${catIndex}-regular-rates`
        : `package-${packageIndex}-cat-${catIndex}-extra-rates`;

    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const rowCount = tbody.children.length;
    const rateType = type === "regular" ? "rates" : "extra";

    const rowHtml = `
      <tr class="hover:bg-gray-50">
        <td class="border border-gray-300 px-3 py-2 min-w-[180px]">
          <input type="text" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][season]" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                 placeholder="e.g., Peak Season 2024">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[150px]">
          <input type="text" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][sneak]" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                 placeholder="e.g., SNK001">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[120px]">
          <input type="text" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][duration]" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                 placeholder="e.g., 3D2N">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][rate_solo]" step="0.01" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][rate_2pax]" step="0.01" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][rate_3pax]" step="0.01" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][rate_4pax]" step="0.01" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][rate_5pax]" step="0.01" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][rate_6pax]" step="0.01" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][rate_7pax]" step="0.01" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][rate_8pax]" step="0.01" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][rate_9pax]" step="0.01" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][rate_10pax]" step="0.01" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][rate_11pax]" step="0.01" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][rate_12pax]" step="0.01" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][rate_13pax]" step="0.01" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][rate_14pax]" step="0.01" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][rate_15pax]" step="0.01" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="packages[${packageIndex}][hotel_rates][${catIndex}][${rateType}][${rowCount}][rate_child]" step="0.01" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 text-center min-w-[80px]">
          <button type="button" onclick="this.closest('tr').remove()" 
                  class="text-red-500 hover:text-red-700 p-2 bg-red-50 hover:bg-red-100 rounded-lg transition" 
                  title="Delete Row">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;

    tbody.insertAdjacentHTML("beforeend", rowHtml);
  };

  // Watch for changes in hotel categories to update rates in all packages
  function updateAllPackagesHotelRates() {
    const packageSections = document.querySelectorAll(".package-section");
    packageSections.forEach((section, index) => {
      updatePackageHotelRates(index);
    });
  }

  // Initialize with first package
  setTimeout(() => addPackageSectionWithIndex(0), 100);

  // =====================================================
  // FORM SUBMIT HANDLER - FIXED VERSION
  // =====================================================
  const form = document.getElementById("createDestinationForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Show loading immediately
    showLoading(true, "Creating destination with all packages...");

    try {
      const formData = new FormData(form);

      // Determine image source
      const useUrl = urlMethod && !urlMethod.classList.contains("hidden");
      const imageUrl = useUrl && urlInput ? urlInput.value.trim() : null;
      const imageFile = !useUrl && fileInput ? fileInput.files[0] : null;

      // Validate image
      if (useUrl && !imageUrl) {
        throw new Error("Please provide an image URL");
      } else if (!useUrl && !imageFile) {
        throw new Error("Please select an image file");
      }

      // Validate subcategory
      const subcategory = formData.get("subcategory");
      if (!subcategory) {
        throw new Error(
          "Please select a subcategory (Land Tours, Domestic, or Promo)",
        );
      }

      // 1. Create Destination
      const destinationData = {
        name: formData.get("name"),
        description: formData.get("description"),
        airport_code: formData.get("airport_code") || null,
        airport_name: formData.get("airport_name") || null,
        country: formData.get("country") || "Philippines",
        subcategory: subcategory,
      };

      console.log("Creating destination:", destinationData);
      const destination = await createDestination(destinationData);
      if (!destination) throw new Error("Failed to create destination");
      console.log("Destination created:", destination);

      // 2. Handle Image
      if (destination.id) {
        if (imageFile) {
          try {
            const fileName = `destinations/${destination.id}-${Date.now()}.${imageFile.name.split(".").pop()}`;

            const { error: uploadError } = await supabase.storage
              .from("destination-images")
              .upload(fileName, imageFile, {
                cacheControl: "3600",
                upsert: false,
              });

            if (uploadError) throw uploadError;

            const {
              data: { publicUrl },
            } = supabase.storage
              .from("destination-images")
              .getPublicUrl(fileName);

            await supabase.from("destination_images").insert([
              {
                destination_id: destination.id,
                url: publicUrl,
                alt_text: destinationData.name,
                is_primary: true,
              },
            ]);
            console.log("Image uploaded successfully");
          } catch (uploadError) {
            console.error("Image upload failed:", uploadError);
            showToast(
              "⚠️ Destination created but image upload failed.",
              "warning",
            );
          }
        } else if (imageUrl) {
          await supabase.from("destination_images").insert([
            {
              destination_id: destination.id,
              url: imageUrl,
              alt_text: destinationData.name,
              is_primary: true,
            },
          ]);
          console.log("Image URL saved successfully");
        }
      }

      // 3. Create Hotel Categories
      const categoryRows = document.querySelectorAll(".hotel-category-row");
      const categoryMap = new Map(); // Map temporary index to actual category ID

      for (let i = 0; i < categoryRows.length; i++) {
        const catData = {
          destination_id: destination.id,
          category_name: formData.get(`hotel_categories[${i}][name]`),
          display_order:
            formData.get(`hotel_categories[${i}][display_order]`) || i + 1,
          max_room_capacity:
            formData.get(`hotel_categories[${i}][max_capacity]`) || 4,
          has_breakfast:
            formData.get(`hotel_categories[${i}][has_breakfast]`) === "true",
          breakfast_note:
            formData.get(`hotel_categories[${i}][breakfast_note]`) || null,
        };

        if (catData.category_name) {
          console.log("Creating hotel category:", catData);
          const result = await createHotelCategory(catData);
          if (result) {
            categoryMap.set(i, result.id);
            console.log("Category created with ID:", result.id);
          }
        }
      }

      // 4. Create Hotels
      const hotelRows = document.querySelectorAll(".hotel-row");
      for (let i = 0; i < hotelRows.length; i++) {
        const categoryIndex = formData.get(`hotels[${i}][category_id]`);
        const categoryId = categoryMap.get(parseInt(categoryIndex));

        if (categoryId) {
          const hotelData = {
            category_id: categoryId,
            name: formData.get(`hotels[${i}][name]`),
            max_capacity: formData.get(`hotels[${i}][max_capacity]`),
            description: formData.get(`hotels[${i}][description]`),
            notes: formData.get(`hotels[${i}][notes]`),
            image_url: formData.get(`hotels[${i}][image_url]`),
          };
          console.log("Creating hotel:", hotelData);
          await createHotel(hotelData);
        }
      }

      // 5. Create Optional Tours
      const optionalTourRows = document.querySelectorAll(".optional-tour-row");

      for (let i = 0; i < optionalTourRows.length; i++) {
        const tourName = formData.get(`optional_tours[${i}][name]`);
        if (!tourName) continue;

        const tourData = {
          destination_id: destination.id,
          tour_name: tourName,
          duration_hours:
            formData.get(`optional_tours[${i}][duration]`) || null,
          image_url: formData.get(`optional_tours[${i}][image_url]`) || null,
          itinerary: formData.get(`optional_tours[${i}][itinerary]`) || null,
          inclusions: formData.get(`optional_tours[${i}][inclusions]`) || null,
          exclusions: formData.get(`optional_tours[${i}][exclusions]`) || null,
          rate_solo: formData.get(`optional_tours[${i}][rate_solo]`),
          rate_2pax: formData.get(`optional_tours[${i}][rate_2pax]`),
          rate_3pax: formData.get(`optional_tours[${i}][rate_3pax]`),
          rate_4pax: formData.get(`optional_tours[${i}][rate_4pax]`),
          rate_5pax: formData.get(`optional_tours[${i}][rate_5pax]`),
          rate_6pax: formData.get(`optional_tours[${i}][rate_6pax]`),
          rate_7pax: formData.get(`optional_tours[${i}][rate_7pax]`),
          rate_8pax: formData.get(`optional_tours[${i}][rate_8pax]`),
          rate_9pax: formData.get(`optional_tours[${i}][rate_9pax]`),
          rate_10pax: formData.get(`optional_tours[${i}][rate_10pax]`),
          rate_11pax: formData.get(`optional_tours[${i}][rate_11pax]`),
          rate_12pax: formData.get(`optional_tours[${i}][rate_12pax]`),
          rate_child_4_9: null,
        };

        console.log("Creating optional tour:", tourData);
        await createOptionalTour(tourData);
      }

      // 6. Create Packages
      const packageSections = document.querySelectorAll(".package-section");
      console.log(`Found ${packageSections.length} package sections to create`);

      for (let p = 0; p < packageSections.length; p++) {
        console.log(`Creating package #${p + 1}`);

        // Create package
        const packageData = {
          destination_id: destination.id,
          package_code: formData.get(`packages[${p}][code]`),
          package_name: formData.get(`packages[${p}][name]`),
          tour_category: subcategory,
          has_extra_night:
            formData.get(`packages[${p}][has_extra_night]`) === "true",
          base_price: 0,
          markup_percent: 0,
          tax_included: false,
          inclusions: formData.get(`packages[${p}][inclusions]`),
          exclusions: formData.get(`packages[${p}][exclusions]`),
        };

        console.log("Package data:", packageData);
        const newPackage = await createPackage(packageData);
        if (!newPackage) {
          console.error(`Failed to create package #${p + 1}`);
          continue;
        }
        console.log(`Package #${p + 1} created with ID:`, newPackage.id);

        // Create itineraries for this package
        const itineraryInputs = document.querySelectorAll(
          `[name^="packages[${p}][itineraries]"]`,
        );
        const itineraries = [];
        itineraryInputs.forEach((input) => {
          if (input.value?.trim()) {
            const match = input.name.match(/\[(\d+)\]$/);
            if (match) {
              itineraries.push({
                day_number: parseInt(match[1]),
                text: input.value.trim(),
              });
            }
          }
        });

        for (const iti of itineraries) {
          console.log(
            `Adding itinerary day ${iti.day_number} for package ${newPackage.id}`,
          );
          await supabase.from("package_itineraries").insert([
            {
              package_id: newPackage.id,
              day_number: iti.day_number,
              day_title: iti.text.split("\n")[0],
              day_description: iti.text
                .split("\n")
                .slice(1)
                .filter((l) => l.trim()),
              display_order: iti.day_number,
            },
          ]);
        }

        // Create hotel rates for this package
        const categoryCount = categoryMap.size;
        for (let c = 0; c < categoryCount; c++) {
          const categoryId = categoryMap.get(c);
          if (!categoryId) continue;

          // Process regular rates
          let regularRowIndex = 0;
          while (
            formData.get(
              `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][season]`,
            ) !== undefined
          ) {
            const season = formData.get(
              `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][season]`,
            );
            const sneak = formData.get(
              `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][sneak]`,
            );
            const duration = formData.get(
              `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][duration]`,
            );

            // Check if any field has value
            const hasValue =
              season ||
              sneak ||
              duration ||
              formData.get(
                `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_solo]`,
              ) ||
              formData.get(
                `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_2pax]`,
              );

            if (hasValue) {
              const rateData = {
                package_id: newPackage.id,
                hotel_category_id: categoryId,
                season: season || null,
                sneak: sneak || null,
                duration: duration || null,
                rate_solo: formData.get(
                  `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_solo]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_solo]`,
                      ),
                    )
                  : null,
                rate_2pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_2pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_2pax]`,
                      ),
                    )
                  : null,
                rate_3pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_3pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_3pax]`,
                      ),
                    )
                  : null,
                rate_4pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_4pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_4pax]`,
                      ),
                    )
                  : null,
                rate_5pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_5pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_5pax]`,
                      ),
                    )
                  : null,
                rate_6pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_6pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_6pax]`,
                      ),
                    )
                  : null,
                rate_7pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_7pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_7pax]`,
                      ),
                    )
                  : null,
                rate_8pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_8pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_8pax]`,
                      ),
                    )
                  : null,
                rate_9pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_9pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_9pax]`,
                      ),
                    )
                  : null,
                rate_10pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_10pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_10pax]`,
                      ),
                    )
                  : null,
                rate_11pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_11pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_11pax]`,
                      ),
                    )
                  : null,
                rate_12pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_12pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_12pax]`,
                      ),
                    )
                  : null,
                rate_13pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_13pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_13pax]`,
                      ),
                    )
                  : null,
                rate_14pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_14pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_14pax]`,
                      ),
                    )
                  : null,
                rate_15pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_15pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_15pax]`,
                      ),
                    )
                  : null,
                rate_child_no_breakfast: formData.get(
                  `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_child]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][rates][${regularRowIndex}][rate_child]`,
                      ),
                    )
                  : null,
                breakfast_included:
                  formData.get(
                    `packages[${p}][hotel_rates][${c}][breakfast_included]`,
                  ) === "true",
                breakfast_notes:
                  formData.get(
                    `packages[${p}][hotel_rates][${c}][breakfast_notes]`,
                  ) || null,
                additional_info:
                  formData.get(
                    `packages[${p}][hotel_rates][${c}][additional_info]`,
                  ) || null,
              };

              console.log(
                `Saving regular rate for category ${categoryId}:`,
                rateData,
              );
              await savePackageHotelRate(rateData);
            }
            regularRowIndex++;
          }

          // Process extra night rates
          let extraRowIndex = 0;
          while (
            formData.get(
              `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][season]`,
            ) !== undefined
          ) {
            const season = formData.get(
              `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][season]`,
            );
            const sneak = formData.get(
              `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][sneak]`,
            );
            const duration = formData.get(
              `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][duration]`,
            );

            const hasValue =
              season ||
              sneak ||
              duration ||
              formData.get(
                `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_solo]`,
              ) ||
              formData.get(
                `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_2pax]`,
              );

            if (hasValue) {
              const extraRateData = {
                package_id: newPackage.id,
                hotel_category_id: categoryId,
                season: season || null,
                sneak: sneak || null,
                duration: duration || null,
                extra_night_solo: formData.get(
                  `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_solo]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_solo]`,
                      ),
                    )
                  : null,
                extra_night_2pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_2pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_2pax]`,
                      ),
                    )
                  : null,
                extra_night_3pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_3pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_3pax]`,
                      ),
                    )
                  : null,
                extra_night_4pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_4pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_4pax]`,
                      ),
                    )
                  : null,
                extra_night_5pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_5pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_5pax]`,
                      ),
                    )
                  : null,
                extra_night_6pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_6pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_6pax]`,
                      ),
                    )
                  : null,
                extra_night_7pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_7pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_7pax]`,
                      ),
                    )
                  : null,
                extra_night_8pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_8pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_8pax]`,
                      ),
                    )
                  : null,
                extra_night_9pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_9pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_9pax]`,
                      ),
                    )
                  : null,
                extra_night_10pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_10pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_10pax]`,
                      ),
                    )
                  : null,
                extra_night_11pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_11pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_11pax]`,
                      ),
                    )
                  : null,
                extra_night_12pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_12pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_12pax]`,
                      ),
                    )
                  : null,
                extra_night_13pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_13pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_13pax]`,
                      ),
                    )
                  : null,
                extra_night_14pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_14pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_14pax]`,
                      ),
                    )
                  : null,
                extra_night_15pax: formData.get(
                  `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_15pax]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_15pax]`,
                      ),
                    )
                  : null,
                extra_night_child_no_breakfast: formData.get(
                  `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_child]`,
                )
                  ? parseFloat(
                      formData.get(
                        `packages[${p}][hotel_rates][${c}][extra][${extraRowIndex}][rate_child]`,
                      ),
                    )
                  : null,
                breakfast_included:
                  formData.get(
                    `packages[${p}][hotel_rates][${c}][breakfast_included]`,
                  ) === "true",
                breakfast_notes:
                  formData.get(
                    `packages[${p}][hotel_rates][${c}][breakfast_notes]`,
                  ) || null,
                additional_info:
                  formData.get(
                    `packages[${p}][hotel_rates][${c}][additional_info]`,
                  ) || null,
              };

              console.log(
                `Saving extra night rate for category ${categoryId}:`,
                extraRateData,
              );
              await savePackageHotelRate(extraRateData);
            }
            extraRowIndex++;
          }
        }

        // Create transportation for this package
        const modeMap = {
          private_van: 1,
          private_car: 2,
          coaster: 3,
          shuttle: 4,
        };
        let transIndex = 0;
        while (
          formData.get(`packages[${p}][transportation][${transIndex}][mode]`)
        ) {
          const mode = formData.get(
            `packages[${p}][transportation][${transIndex}][mode]`,
          );
          const transportData = {
            package_id: newPackage.id,
            transportation_mode_id: modeMap[mode] || 1,
            description: formData.get(
              `packages[${p}][transportation][${transIndex}][description]`,
            ),
            is_included:
              formData.get(
                `packages[${p}][transportation][${transIndex}][included]`,
              ) === "true",
            display_order: transIndex,
          };
          console.log("Adding transportation:", transportData);
          await supabase.from("package_transportation").insert([transportData]);
          transIndex++;
        }
      }

      modal.remove();
      showToast(
        `✅ Destination created successfully with ${packageSections.length} package(s)!`,
        "success",
      );
      await refreshDestinationsPage();
    } catch (error) {
      console.error("Error creating destination:", error);
      showToast("❌ Failed to create destination: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  });
}
export async function openEditDestinationModal(id) {
  console.log("🔄 Opening edit destination modal for ID:", id);

  try {
    showLoading(true, "Loading destination data...");

    const destination = await fetchDestinationById(id);
    if (!destination) {
      showToast("Destination not found", "error");
      showLoading(false);
      return;
    }

    showLoading(false);

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";

    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl transform transition-all">
        <!-- Fixed Header with Gradient -->
        <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-amber-600 via-orange-500 to-red-500">
          <div class="absolute inset-0 bg-black/10"></div>
          <div class="relative px-6 py-5">
            <div class="flex items-center gap-4">
              <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/30">
                <i class="fas fa-edit text-2xl text-white"></i>
              </div>
              <div class="flex-1">
                <h3 class="text-2xl font-bold text-white tracking-tight">Edit Destination</h3>
                <p class="text-amber-100 text-sm mt-1">${destination.name}</p>
              </div>
              <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
            </div>
          </div>
        </div>
        
        <form id="editDestinationForm" class="p-6 space-y-5 max-h-[calc(90vh-120px)] overflow-y-auto">
          <input type="hidden" name="id" value="${destination.id}">
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Destination Name <span class="text-red-500">*</span></label>
              <input type="text" name="name" value="${destination.name}" required
                     class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-sm">
            </div>
            
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Destination Type</label>
              <select name="country" required
                      class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-sm">
                <option value="Philippines" ${destination.country === "Philippines" ? "selected" : ""}>🇵🇭 Local (Philippines)</option>
                <option value="International" ${destination.country !== "Philippines" ? "selected" : ""}>🌏 International</option>
              </select>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Airport Code</label>
                <input type="text" name="airport_code" value="${destination.airport_code || ""}"
                       class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-sm">
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Airport Name</label>
                <input type="text" name="airport_name" value="${destination.airport_name || ""}"
                       class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-sm">
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea name="description" rows="3"
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-sm">${destination.description || ""}</textarea>
            </div>
            
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select name="is_active" 
                      class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-sm">
                <option value="true" ${destination.is_active ? "selected" : ""}>Active</option>
                <option value="false" ${!destination.is_active ? "selected" : ""}>Inactive</option>
              </select>
            </div>
          </div>
          
          <div class="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button type="button" onclick="this.closest('.fixed').remove()"
                    class="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit"
                    class="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg text-sm hover:from-amber-700 hover:to-orange-700">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const form = document.getElementById("editDestinationForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const destinationData = {
        name: formData.get("name"),
        description: formData.get("description"),
        airport_code: formData.get("airport_code") || null,
        airport_name: formData.get("airport_name") || null,
        country: formData.get("country") || "Philippines",
        is_active:
          formData.get("is_active") === "true" ||
          formData.get("is_active") === true,
      };

      const result = await updateDestination(destination.id, destinationData);
      if (result) {
        modal.remove();
        showToast("✅ Destination updated successfully!", "success");
        await refreshDestinationsPage();
      }
    });
  } catch (error) {
    console.error("Error in openEditDestinationModal:", error);
    showToast("Failed to load destination data", "error");
    showLoading(false);
  }
}

export function openCreatePackageModal(destinationId) {
  console.log(
    "📦 Opening create package modal for destination:",
    destinationId,
  );

  // Find the destination to get its hotel categories and optional tours
  const destination = state.destinations.find((d) => d.id === destinationId);
  const hotelCategories = destination?.hotel_categories || [];
  const availableTours =
    destination?.optional_tours?.filter((t) => t.is_active) || [];

  // Determine destination type for display
  const destinationType =
    destination?.country === "Philippines" ? "Local" : "International";

  // Default category based on destination type
  const suggestedCategory =
    destination?.country === "Philippines" ? "Domestic" : "Land Tours";

  const modal = document.createElement("div");
  modal.id = "createPackageModal";
  modal.className =
    "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto";

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-7xl w-full my-8 shadow-2xl transform transition-all flex flex-col" style="max-height: 95vh;">
      <!-- Fixed Header -->
      <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 flex-shrink-0 sticky top-0 z-10">
        <div class="absolute inset-0 bg-black/10"></div>
        <div class="relative px-6 py-5">
          <div class="flex items-center gap-4">
            <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/30">
              <i class="fas fa-box text-2xl text-white"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-white tracking-tight">Create New Package</h3>
              <p class="text-emerald-100 text-sm mt-1">${destination?.name || "Destination"} • ${destinationType}</p>
            </div>
            <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
        </div>
      </div>
      
      <div class="flex-1 overflow-y-auto p-6">
        <form id="createPackageForm" class="space-y-6">
          <input type="hidden" name="destination_id" value="${destinationId}">
          
          <!-- ========================================= -->
          <!-- SECTION 1: BASIC INFORMATION -->
          <!-- ========================================= -->
          <div class="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border-2 border-gray-100">
            <h4 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i class="fas fa-info-circle text-emerald-500"></i>
              Basic Information
            </h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-600 mb-2">Package Code</label>
                <input type="text" name="package_code" 
                       class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm"
                       placeholder="e.g., BCD-FE-3D2N">
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-600 mb-2">Package Name <span class="text-red-500">*</span></label>
                <input type="text" name="package_name" required
                       class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm"
                       placeholder="e.g., 3D2N Free and Easy">
              </div>
            </div>
            
            <!-- Category Selection - UPDATED with only 3 options -->
            <div class="mt-4">
              <label class="block text-sm font-semibold text-gray-600 mb-2">Tour Category <span class="text-red-500">*</span></label>
              <select name="tour_category" required
                      class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm bg-white">
                <option value="">Select Category</option>
                <option value="Land Tours" ${suggestedCategory === "Land Tours" ? "selected" : ""}>Land Tours</option>
                <option value="Domestic" ${suggestedCategory === "Domestic" ? "selected" : ""}>Domestic</option>
                <option value="Promo">Promo</option>
              </select>
              <p class="text-xs text-gray-500 mt-1">
                <i class="fas fa-info-circle"></i> 
                Available categories for ${destinationType} destinations
              </p>
            </div>
            
            <div class="flex items-center gap-4 mt-4">
              <label class="flex items-center gap-2">
                <input type="checkbox" name="has_extra_night" value="true" class="h-4 w-4 text-emerald-600 rounded">
                <span class="text-sm text-gray-700">Has Extra Night Option</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="checkbox" name="is_promo" value="true" class="h-4 w-4 text-pink-600 rounded">
                <span class="text-sm text-pink-600 font-medium">Mark as Promo</span>
              </label>
            </div>
          </div>

          <!-- ========================================= -->
          <!-- SECTION 2: PRICE INFORMATION -->
          <!-- ========================================= -->
          <div class="bg-gradient-to-br from-emerald-50 to-white p-5 rounded-xl border-2 border-emerald-100">
            <h4 class="text-lg font-bold text-emerald-800 mb-4 flex items-center gap-2">
              <i class="fas fa-tag text-emerald-500"></i>
              Price Information
            </h4>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-600 mb-2">Base Price (₱)</label>
                <input type="number" name="base_price" step="0.01" value="0"
                       class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm">
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-600 mb-2">Markup %</label>
                <input type="number" name="markup_percent" step="0.1" value="0"
                       class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm">
              </div>
              <div class="flex items-center">
                <label class="flex items-center gap-2">
                  <input type="checkbox" name="tax_included" value="true" class="h-4 w-4 text-emerald-600 rounded">
                  <span class="text-sm text-gray-700">Tax Included</span>
                </label>
              </div>
            </div>
          </div>
          
          <!-- ========================================= -->
          <!-- HOTELS SECTION - CREATE PACKAGE MODAL -->
          <!-- ========================================= -->
          ${
            hotelCategories.length > 0
              ? `
          <div class="bg-gradient-to-br from-blue-50 to-white p-5 rounded-xl border-2 border-blue-100">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-lg font-bold text-blue-800 flex items-center gap-2">
                <div class="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i class="fas fa-building text-blue-600 text-sm"></i>
                </div>
                Hotels by Category
              </h4>
              <button type="button" onclick="window.openCreateHotelCategoryModal(${destinationId})" 
                      class="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                <i class="fas fa-plus-circle mr-1"></i> Add Category
              </button>
            </div>
            
            <div class="space-y-4">
              ${hotelCategories
                .map((cat) => {
                  const categoryHotels =
                    cat.hotels?.filter((h) => h.is_active) || [];

                  return `
                <div class="bg-white p-4 rounded-lg border-2 border-blue-200">
                  <div class="flex items-center justify-between mb-3">
                    <div>
                      <h5 class="font-semibold text-md text-blue-700">${cat.category_name}</h5>
                      <p class="text-xs text-gray-500 mt-1">
                        <span class="mr-3">Max: ${cat.max_room_capacity || 4} pax</span>
                        <span class="${cat.has_breakfast ? "text-green-600" : "text-gray-400"}">
                          ${cat.has_breakfast ? "✓ Breakfast Included" : "✗ No Breakfast"}
                        </span>
                      </p>
                    </div>
                    <div class="flex gap-2">
                      <button type="button" onclick="window.openEditHotelCategoryModal(${cat.id})" 
                              class="text-amber-600 hover:text-amber-800 p-1.5 bg-white rounded-lg shadow-sm hover:shadow" title="Edit Category">
                        <i class="fas fa-edit text-xs"></i>
                      </button>
                      <button type="button" onclick="window.openCreateHotelModalWithCategory(${cat.id})" 
                              class="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600">
                        <i class="fas fa-plus-circle mr-1"></i> Add Hotel
                      </button>
                    </div>
                  </div>
                  
                  <!-- Hotels List -->
                  ${
                    categoryHotels.length > 0
                      ? `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      ${categoryHotels
                        .map(
                          (hotel) => `
                        <div class="border rounded-lg p-3 bg-gray-50">
                          <div class="flex gap-3">
                            <!-- Hotel Image -->
                            <div class="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                              ${
                                hotel.image_url
                                  ? `
                                <img src="${hotel.image_url}" alt="${hotel.name}" class="w-full h-full object-cover">
                              `
                                  : `
                                <div class="w-full h-full flex items-center justify-center">
                                  <i class="fas fa-hotel text-gray-400 text-xl"></i>
                                </div>
                              `
                              }
                            </div>
                            
                            <!-- Hotel Details -->
                            <div class="flex-1">
                              <div class="flex items-start justify-between">
                                <div>
                                  <h6 class="font-bold text-sm text-gray-800">${hotel.name}</h6>
                                  <p class="text-xs text-gray-500">Max: ${hotel.max_capacity || "N/A"} guests</p>
                                  ${
                                    hotel.description
                                      ? `
                                    <p class="text-xs text-gray-600 mt-1 line-clamp-1">${hotel.description}</p>
                                  `
                                      : ""
                                  }
                                </div>
                                <div class="flex gap-1">
                                  <button type="button" onclick="window.openEditHotelModal(${hotel.id})" 
                                          class="text-amber-600 hover:text-amber-800 p-1" title="Edit Hotel">
                                    <i class="fas fa-edit text-xs"></i>
                                  </button>
                                </div>
                              </div>
                              <span class="inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${hotel.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}">
                                ${hotel.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                        </div>
                      `,
                        )
                        .join("")}
                    </div>
                  `
                      : `
                    <p class="text-sm text-gray-500 italic text-center py-4">No hotels in this category yet</p>
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
          
          <!-- ========================================= -->
          <!-- SECTION 3: HOTEL RATES - TABLE FORMAT WITH SEASON AND SNEAK -->
          <!-- ========================================= -->
          ${
            hotelCategories.length > 0
              ? `
          <div class="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl border-2 border-indigo-100">
            <h4 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i class="fas fa-hotel text-indigo-500"></i>
              Hotel Rates (₱ per person)
            </h4>
            <div id="hotelRatesContainer" class="space-y-6">
              ${hotelCategories
                .map(
                  (cat, catIndex) => `
                <div class="bg-white p-4 rounded-lg border-2 border-indigo-200" data-category-id="${cat.id}" data-category-index="${catIndex}">
                  <h5 class="font-semibold text-md mb-3 text-indigo-700">${cat.category_name}</h5>
                  
                  <!-- Regular Rates Table -->
                  <div class="mb-6">
                    <div class="flex items-center justify-between mb-2">
                      <h6 class="text-sm font-semibold text-gray-600">Regular Rates</h6>
                      <button type="button" onclick="addRateRow(${catIndex}, 'regular')" 
                              class="px-3 py-1 bg-indigo-500 text-white rounded-lg text-xs hover:bg-indigo-600 transition flex items-center gap-1">
                        <i class="fas fa-plus-circle"></i> Add Regular Rate Row
                      </button>
                    </div>
                    <div class="overflow-x-auto">
                      <table class="w-full border-collapse text-xs min-w-[1200px]">
                        <thead>
                          <tr class="bg-gray-100">
                            <th class="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 w-40">Season (Text)</th>
                            <th class="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 w-40">Sneak (Text)</th>
                             <th class="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 w-40">Duration/Travel-Date</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">Solo</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">2P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">3P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">4P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">5P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">6P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">7P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">8P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">9P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">10P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">11P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">12P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">13P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">14P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">15P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">Child</th>
                            <th class="border border-gray-300 px-2 py-2 text-center font-semibold text-gray-700 w-16">Actions</th>
                          </tr>
                        </thead>
                        <tbody id="category-${catIndex}-regular-rates">
                          <!-- Regular rate rows will be added here -->
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <!-- Extra Night Rates Table -->
                  <div class="mt-4">
                    <div class="flex items-center justify-between mb-2">
                      <h6 class="text-sm font-semibold text-gray-600">Extra Night Rates</h6>
                      <button type="button" onclick="addRateRow(${catIndex}, 'extra')" 
                              class="px-3 py-1 bg-indigo-500 text-white rounded-lg text-xs hover:bg-indigo-600 transition flex items-center gap-1">
                        <i class="fas fa-plus-circle"></i> Add Extra Night Rate Row
                      </button>
                    </div>
                    <div class="overflow-x-auto">
                      <table class="w-full border-collapse text-xs min-w-[1200px]">
                        <thead>
                          <tr class="bg-gray-50">
                            <th class="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 w-40">Season (Text)</th>
                            <th class="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 w-40">Sneak (Text)</th>
                            <th class="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 w-40">/Travel-Date</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">Solo</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">2P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">3P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">4P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">5P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">6P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">7P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">8P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">9P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">10P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">11P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">12P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">13P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">14P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">15P</th>
                            <th class="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">Child</th>
                            <th class="border border-gray-300 px-2 py-2 text-center font-semibold text-gray-700 w-16">Actions</th>
                          </tr>
                        </thead>
                        <tbody id="category-${catIndex}-extra-rates">
                          <!-- Extra night rate rows will be added here -->
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <!-- Breakfast Options -->
                  <div class="mt-4 pt-3 border-t border-gray-200 grid grid-cols-2 gap-4">
                    <div>
                      <label class="flex items-center gap-2">
                        <input type="checkbox" name="hotel_rates[${cat.id}][breakfast_included]" value="true" checked class="h-4 w-4 text-indigo-600 rounded">
                        <span class="text-sm text-gray-700">Breakfast Included</span>
                      </label>
                    </div>
                    <div>
                      <input type="text" name="hotel_rates[${cat.id}][breakfast_notes]" 
                             placeholder="Breakfast notes (optional)" 
                             class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
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

          <!-- ========================================= -->
          <!-- ITINERARY BUILDER - WITH LINE BREAKS -->
          <!-- ========================================= -->
          <div class="bg-gradient-to-br from-amber-50 to-white p-5 rounded-xl border-2 border-amber-100">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                <i class="fas fa-map-signs text-amber-500"></i>
                Itinerary <span class="text-xs font-normal text-gray-500 ml-2">(Determines package duration)</span>
              </h4>
              <button type="button" onclick="addItineraryDay()" 
                      class="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 transition-colors flex items-center gap-2">
                <i class="fas fa-plus-circle"></i> Add Day
              </button>
            </div>
            
            <div id="itineraryContainer" class="space-y-3 max-h-80 overflow-y-auto p-2">
              <div class="flex items-start gap-2 bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-amber-300 transition-colors" data-day="1">
                <span class="text-xs font-bold text-gray-600 w-12 pt-2 flex-shrink-0">Day 1:</span>
                <textarea name="itineraries[1]" rows="6" 
                          class="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 resize-y min-h-[150px] whitespace-pre-wrap font-mono leading-relaxed"
                          placeholder="Enter detailed itinerary for day 1...&#10;08:00 AM - Arrival at airport&#10;09:00 AM - Transfer to hotel&#10;10:00 AM - Check-in and rest&#10;12:00 PM - Lunch at hotel"></textarea>
                <button type="button" onclick="removeItineraryDay(this)" class="text-red-500 hover:text-red-700 p-2 flex-shrink-0">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <div class="flex items-start gap-2 bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-amber-300 transition-colors" data-day="2">
                <span class="text-xs font-bold text-gray-600 w-12 pt-2 flex-shrink-0">Day 2:</span>
                <textarea name="itineraries[2]" rows="6"
                          class="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 resize-y min-h-[150px] whitespace-pre-wrap font-mono leading-relaxed"
                          placeholder="Enter detailed itinerary for day 2...&#10;08:00 AM - Breakfast&#10;09:00 AM - Island hopping&#10;12:00 PM - Lunch on beach&#10;04:00 PM - Return to hotel"></textarea>
                <button type="button" onclick="removeItineraryDay(this)" class="text-red-500 hover:text-red-700 p-2 flex-shrink-0">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <div class="flex items-start gap-2 bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-amber-300 transition-colors" data-day="3">
                <span class="text-xs font-bold text-gray-600 w-12 pt-2 flex-shrink-0">Day 3:</span>
                <textarea name="itineraries[3]" rows="6"
                          class="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 resize-y min-h-[150px] whitespace-pre-wrap font-mono leading-relaxed"
                          placeholder="Enter detailed itinerary for day 3...&#10;08:00 AM - Breakfast&#10;09:00 AM - Free time&#10;12:00 PM - Check out&#10;02:00 PM - Transfer to airport"></textarea>
                <button type="button" onclick="removeItineraryDay(this)" class="text-red-500 hover:text-red-700 p-2 flex-shrink-0">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
            
            <div class="flex items-center gap-2 mt-3 text-xs text-gray-500">
              <i class="fas fa-info-circle"></i>
              <span>Total: <span id="totalDays">3</span> day(s) / <span id="totalNights">2</span> night(s)</span>
            </div>
          </div>

          <!-- ========================================= -->
          <!-- SECTION 5: INCLUSIONS & EXCLUSIONS -->
          <!-- ========================================= -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gradient-to-br from-green-50 to-white p-5 rounded-xl border-2 border-green-100">
              <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i class="fas fa-check-circle text-green-500"></i>
                Inclusions
              </h4>
              <textarea name="inclusions" rows="4" 
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm"
                        placeholder="Hotel accommodation&#10;Daily breakfast&#10;Airport transfers"></textarea>
              <p class="text-xs text-gray-500 mt-1">One per line</p>
            </div>
            
            <div class="bg-gradient-to-br from-red-50 to-white p-5 rounded-xl border-2 border-red-100">
              <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i class="fas fa-times-circle text-red-500"></i>
                Exclusions
              </h4>
              <textarea name="exclusions" rows="4" 
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm"
                        placeholder="Airfare&#10;Personal expenses&#10;Optional tours"></textarea>
              <p class="text-xs text-gray-500 mt-1">One per line</p>
            </div>
          </div>

          <!-- ========================================= -->
          <!-- SECTION 6: OPTIONAL TOURS -->
          <!-- ========================================= -->
          <div class="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl border-2 border-purple-100">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                <i class="fas fa-compass text-purple-500"></i>
                Optional Tours
              </h4>
              <button type="button" onclick="window.openCreateOptionalTourModal(${destinationId})" 
                      class="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 flex items-center gap-1">
                <i class="fas fa-plus-circle"></i> Add New Tour
              </button>
            </div>
            
            ${
              availableTours.length > 0
                ? `
              <div class="space-y-3 max-h-60 overflow-y-auto p-2 border border-purple-200 rounded-lg">
                ${availableTours
                  .map(
                    (tour) => `
                  <div class="flex items-center justify-between bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-purple-300 transition">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <input type="checkbox" name="selected_tours[]" value="${tour.id}" 
                               class="h-4 w-4 text-purple-600 rounded">
                        <span class="font-medium text-sm">${tour.tour_name}</span>
                      </div>
                      <div class="ml-6 text-xs text-gray-500">
                        ${tour.duration_hours ? `Duration: ${tour.duration_hours}h | ` : ""}
                        ${tour.rates && tour.rates[0] ? `From ₱${tour.rates[0].rate_solo || tour.rates[0].rate_2pax || "0"}` : ""}
                      </div>
                    </div>
                    <button type="button" onclick="viewOptionalTourDetails(${tour.id})" 
                            class="text-purple-600 hover:text-purple-800 p-1.5 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
                            title="View Details">
                      <i class="fas fa-eye text-sm"></i>
                    </button>
                  </div>
                `,
                  )
                  .join("")}
              </div>
              <div class="flex items-center justify-between mt-3">
                <p class="text-xs text-gray-500">
                  <i class="fas fa-info-circle mr-1"></i>
                  Select optional tours to include in this package
                </p>
                <button type="button" onclick="window.openCreateOptionalTourModal(${destinationId})" 
                        class="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1">
                  <i class="fas fa-external-link-alt"></i> Create New Tour
                </button>
              </div>
            `
                : `
              <div class="text-center py-6 bg-purple-50 rounded-lg border-2 border-dashed border-purple-200">
                <i class="fas fa-compass text-4xl text-purple-300 mb-2"></i>
                <p class="text-gray-600 mb-3">No optional tours available for this destination</p>
                <button type="button" onclick="window.openCreateOptionalTourModal(${destinationId})" 
                        class="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 inline-flex items-center gap-2">
                  <i class="fas fa-plus-circle"></i> Create New Tour
                </button>
              </div>
            `
            }
          </div>

          <!-- ========================================= -->
          <!-- SECTION 7: TRANSPORTATION -->
          <!-- ========================================= -->
          <div class="bg-gradient-to-br from-cyan-50 to-white p-5 rounded-xl border-2 border-cyan-100">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                <i class="fas fa-truck text-cyan-500"></i>
                Transportation
              </h4>
              <button type="button" onclick="addTransportationRow()" 
                      class="px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600">
                <i class="fas fa-plus-circle mr-1"></i> Add Transport
              </button>
            </div>
            
            <div id="transportationContainer" class="space-y-3">
              <!-- Transportation rows will be added here dynamically -->
            </div>
            
            <p class="text-xs text-gray-500 mt-2">
              <i class="fas fa-info-circle"></i> 
              Transportation modes: Private Van, Private Car, Coaster Bus, Shuttle
            </p>
          </div>

          <!-- ========================================= -->
          <!-- ACTION BUTTONS -->
          <!-- ========================================= -->
          <div class="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
            <button type="button" onclick="this.closest('.fixed').remove()"
                    class="px-5 py-2.5 border-2 border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit"
                    class="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-sm hover:from-emerald-700 hover:to-teal-700">
              Create Package
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================

  // Add rate row function for hotel rates tables - WITH DURATION FOR BOTH TYPES
  window.addRateRow = function (categoryIndex, type) {
    const tbodyId =
      type === "regular"
        ? `category-${categoryIndex}-regular-rates`
        : `category-${categoryIndex}-extra-rates`;

    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const rowCount = tbody.children.length;
    const category = hotelCategories[categoryIndex];
    const categoryId = category.id;
    const rateType = type === "regular" ? "rates" : "extra";

    const rowHtml = `
    <tr class="hover:bg-gray-50">
      <td class="border border-gray-300 px-3 py-2 min-w-[180px]">
        <input type="text" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][season]" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
               placeholder="e.g., Peak Season 2024">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[150px]">
        <input type="text" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][sneak]" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
               placeholder="e.g., SNK001">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[120px]">
        <input type="text" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][duration]" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
               placeholder="e.g., 3D2N">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
        <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_solo]" step="0.01" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
               placeholder="0.00">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
        <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_2pax]" step="0.01" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
               placeholder="0.00">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
        <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_3pax]" step="0.01" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
               placeholder="0.00">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
        <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_4pax]" step="0.01" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
               placeholder="0.00">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
        <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_5pax]" step="0.01" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
               placeholder="0.00">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
        <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_6pax]" step="0.01" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
               placeholder="0.00">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
        <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_7pax]" step="0.01" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
               placeholder="0.00">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
        <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_8pax]" step="0.01" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
               placeholder="0.00">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
        <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_9pax]" step="0.01" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
               placeholder="0.00">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
        <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_10pax]" step="0.01" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
               placeholder="0.00">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
        <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_11pax]" step="0.01" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
               placeholder="0.00">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
        <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_12pax]" step="0.01" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
               placeholder="0.00">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
        <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_13pax]" step="0.01" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
               placeholder="0.00">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
        <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_14pax]" step="0.01" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
               placeholder="0.00">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
        <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_15pax]" step="0.01" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
               placeholder="0.00">
      </td>
      <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
        <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_child]" step="0.01" 
               class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
               placeholder="0.00">
      </td>
      <td class="border border-gray-300 px-3 py-2 text-center min-w-[80px]">
        <button type="button" onclick="this.closest('tr').remove()" 
                class="text-red-500 hover:text-red-700 p-2 bg-red-50 hover:bg-red-100 rounded-lg transition" 
                title="Delete Row">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `;

    tbody.insertAdjacentHTML("beforeend", rowHtml);
  };
  window.updateDayCount = function () {
    const container = document.getElementById("itineraryContainer");
    const days = container.children.length;
    const nights = days > 0 ? days - 1 : 0;
    document.getElementById("totalDays").textContent = days;
    document.getElementById("totalNights").textContent = nights;
  };

  window.addItineraryDay = function () {
    const container = document.getElementById("itineraryContainer");
    const dayCount = container.children.length + 1;
    const dayHtml = `
      <div class="flex items-start gap-2 bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-amber-300 transition-colors" data-day="${dayCount}">
        <span class="text-xs font-bold text-gray-600 w-12 pt-2 flex-shrink-0">Day ${dayCount}:</span>
        <textarea name="itineraries[${dayCount}]" rows="6" 
                  class="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 resize-y min-h-[150px] whitespace-pre-wrap font-mono leading-relaxed"
                  placeholder="Enter detailed itinerary for day ${dayCount}..."></textarea>
        <button type="button" onclick="removeItineraryDay(this)" class="text-red-500 hover:text-red-700 p-2 flex-shrink-0">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", dayHtml);
    updateDayCount();
  };

  window.removeItineraryDay = function (button) {
    const dayDiv = button.closest("[data-day]");
    if (dayDiv) {
      dayDiv.remove();
      // Renumber remaining days
      const container = document.getElementById("itineraryContainer");
      const days = container.children;
      for (let i = 0; i < days.length; i++) {
        const daySpan = days[i].querySelector("span:first-child");
        const textarea = days[i].querySelector("textarea");
        if (daySpan && textarea) {
          const newDayNum = i + 1;
          daySpan.textContent = `Day ${newDayNum}:`;
          textarea.name = `itineraries[${newDayNum}]`;
          textarea.placeholder = `Enter detailed itinerary for day ${newDayNum}...`;
          days[i].setAttribute("data-day", newDayNum);
        }
      }
      updateDayCount();
    }
  };

  window.addTransportationRow = function () {
    const container = document.getElementById("transportationContainer");
    const rowCount = container.children.length;
    const rowHtml = `
      <div class="transportation-row grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-cyan-50 p-3 rounded-lg">
        <div class="md:col-span-2">
          <label class="block text-xs font-semibold text-gray-600 mb-1">Transport Mode</label>
          <select name="transportation[${rowCount}][mode]" class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm bg-white">
            <option value="private_van">Private Van</option>
            <option value="private_car">Private Car</option>
            <option value="coaster">Coaster Bus</option>
            <option value="shuttle">Shuttle</option>
          </select>
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs font-semibold text-gray-600 mb-1">Description</label>
          <div class="flex gap-2">
            <input type="text" name="transportation[${rowCount}][description]" 
                   placeholder="e.g., Round-trip airport transfers"
                   class="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
            <label class="flex items-center gap-1 text-xs whitespace-nowrap">
              <input type="checkbox" name="transportation[${rowCount}][included]" value="true" checked class="h-4 w-4 text-cyan-600 rounded">
              <span>Included</span>
            </label>
            <button type="button" onclick="this.closest('.transportation-row').remove()" 
                    class="px-2 py-1 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", rowHtml);
  };

  // Add default rate rows for each category
  if (hotelCategories.length > 0) {
    hotelCategories.forEach((_, index) => {
      // Add one default regular rate row
      setTimeout(() => {
        addRateRow(index, "regular");
        // Add one default extra night rate row
        addRateRow(index, "extra");
      }, 100);
    });
  }

  // =====================================================
  // FORM SUBMIT HANDLER - UPDATED WITH TABLE DATA PROCESSING
  // =====================================================
  const form = document.getElementById("createPackageForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    showLoading(true, "Creating package...");

    try {
      const formData = new FormData(form);

      // Validate category
      const selectedCategory = formData.get("tour_category");
      if (!selectedCategory) {
        showToast("Please select a tour category", "error");
        showLoading(false);
        return;
      }

      // Validate Domestic only for Philippines
      if (
        selectedCategory === "Domestic" &&
        destination?.country !== "Philippines"
      ) {
        showToast(
          "Domestic packages can only be created for Philippines destinations",
          "error",
        );
        showLoading(false);
        return;
      }

      // Collect itineraries properly
      const itineraries = [];
      const itineraryInputs = document.querySelectorAll(
        '[name^="itineraries["]',
      );
      const itineraryMap = new Map();

      itineraryInputs.forEach((input) => {
        if (input.value && input.value.trim() !== "") {
          const match = input.name.match(/\[(\d+)\]/);
          if (match && match[1]) {
            const dayNum = parseInt(match[1]);
            itineraryMap.set(dayNum, input.value.trim());
          }
        }
      });

      const sortedDays = Array.from(itineraryMap.keys()).sort((a, b) => a - b);
      sortedDays.forEach((dayNum) => {
        itineraries.push(itineraryMap.get(dayNum));
      });

      console.log("📝 Collected itineraries:", itineraries);

      // Collect hotel rates from table rows
      const hotelRates = {};

      hotelCategories.forEach((cat) => {
        const categoryId = cat.id;
        hotelRates[categoryId] = {
          breakfast_included: formData.get(
            `hotel_rates[${categoryId}][breakfast_included]`,
          ),
          breakfast_notes: formData.get(
            `hotel_rates[${categoryId}][breakfast_notes]`,
          ),
        };

        // Process regular rate rows
        const regularRows = [];
        let regularIndex = 0;
        while (
          formData.get(
            `hotel_rates[${categoryId}][rates][${regularIndex}][season]`,
          ) !== undefined
        ) {
          const season = formData.get(
            `hotel_rates[${categoryId}][rates][${regularIndex}][season]`,
          );
          const sneak = formData.get(
            `hotel_rates[${categoryId}][rates][${regularIndex}][sneak]`,
          );

          // Only include if at least one field has value
          if (
            season ||
            sneak ||
            formData.get(
              `hotel_rates[${categoryId}][rates][${regularIndex}][rate_solo]`,
            ) ||
            formData.get(
              `hotel_rates[${categoryId}][rates][${regularIndex}][rate_2pax]`,
            )
          ) {
            regularRows.push({
              season: season || null,
              sneak: sneak || null,
              rate_solo: formData.get(
                `hotel_rates[${categoryId}][rates][${regularIndex}][rate_solo]`,
              ),
              rate_2pax: formData.get(
                `hotel_rates[${categoryId}][rates][${regularIndex}][rate_2pax]`,
              ),
              rate_3pax: formData.get(
                `hotel_rates[${categoryId}][rates][${regularIndex}][rate_3pax]`,
              ),
              rate_4pax: formData.get(
                `hotel_rates[${categoryId}][rates][${regularIndex}][rate_4pax]`,
              ),
              rate_5pax: formData.get(
                `hotel_rates[${categoryId}][rates][${regularIndex}][rate_5pax]`,
              ),
              rate_6pax: formData.get(
                `hotel_rates[${categoryId}][rates][${regularIndex}][rate_6pax]`,
              ),
              rate_7pax: formData.get(
                `hotel_rates[${categoryId}][rates][${regularIndex}][rate_7pax]`,
              ),
              rate_8pax: formData.get(
                `hotel_rates[${categoryId}][rates][${regularIndex}][rate_8pax]`,
              ),
              rate_9pax: formData.get(
                `hotel_rates[${categoryId}][rates][${regularIndex}][rate_9pax]`,
              ),
              rate_10pax: formData.get(
                `hotel_rates[${categoryId}][rates][${regularIndex}][rate_10pax]`,
              ),
              rate_11pax: formData.get(
                `hotel_rates[${categoryId}][rates][${regularIndex}][rate_11pax]`,
              ),
              rate_12pax: formData.get(
                `hotel_rates[${categoryId}][rates][${regularIndex}][rate_12pax]`,
              ),
              rate_13pax: formData.get(
                `hotel_rates[${categoryId}][rates][${regularIndex}][rate_13pax]`,
              ),
              rate_14pax: formData.get(
                `hotel_rates[${categoryId}][rates][${regularIndex}][rate_14pax]`,
              ),
              rate_15pax: formData.get(
                `hotel_rates[${categoryId}][rates][${regularIndex}][rate_15pax]`,
              ),
              rate_child_no_breakfast: formData.get(
                `hotel_rates[${categoryId}][rates][${regularIndex}][rate_child]`,
              ),
            });
          }
          regularIndex++;
        }

        // Process extra night rate rows
        const extraRows = [];
        let extraIndex = 0;
        while (
          formData.get(
            `hotel_rates[${categoryId}][extra][${extraIndex}][season]`,
          ) !== undefined
        ) {
          const season = formData.get(
            `hotel_rates[${categoryId}][extra][${extraIndex}][season]`,
          );
          const sneak = formData.get(
            `hotel_rates[${categoryId}][extra][${extraIndex}][sneak]`,
          );

          // Only include if at least one field has value
          if (
            season ||
            sneak ||
            formData.get(
              `hotel_rates[${categoryId}][extra][${extraIndex}][rate_solo]`,
            ) ||
            formData.get(
              `hotel_rates[${categoryId}][extra][${extraIndex}][rate_2pax]`,
            )
          ) {
            extraRows.push({
              season: season || null,
              sneak: sneak || null,
              extra_night_solo: formData.get(
                `hotel_rates[${categoryId}][extra][${extraIndex}][rate_solo]`,
              ),
              extra_night_2pax: formData.get(
                `hotel_rates[${categoryId}][extra][${extraIndex}][rate_2pax]`,
              ),
              extra_night_3pax: formData.get(
                `hotel_rates[${categoryId}][extra][${extraIndex}][rate_3pax]`,
              ),
              extra_night_4pax: formData.get(
                `hotel_rates[${categoryId}][extra][${extraIndex}][rate_4pax]`,
              ),
              extra_night_5pax: formData.get(
                `hotel_rates[${categoryId}][extra][${extraIndex}][rate_5pax]`,
              ),
              extra_night_6pax: formData.get(
                `hotel_rates[${categoryId}][extra][${extraIndex}][rate_6pax]`,
              ),
              extra_night_7pax: formData.get(
                `hotel_rates[${categoryId}][extra][${extraIndex}][rate_7pax]`,
              ),
              extra_night_8pax: formData.get(
                `hotel_rates[${categoryId}][extra][${extraIndex}][rate_8pax]`,
              ),
              extra_night_9pax: formData.get(
                `hotel_rates[${categoryId}][extra][${extraIndex}][rate_9pax]`,
              ),
              extra_night_10pax: formData.get(
                `hotel_rates[${categoryId}][extra][${extraIndex}][rate_10pax]`,
              ),
              extra_night_11pax: formData.get(
                `hotel_rates[${categoryId}][extra][${extraIndex}][rate_11pax]`,
              ),
              extra_night_12pax: formData.get(
                `hotel_rates[${categoryId}][extra][${extraIndex}][rate_12pax]`,
              ),
              extra_night_13pax: formData.get(
                `hotel_rates[${categoryId}][extra][${extraIndex}][rate_13pax]`,
              ),
              extra_night_14pax: formData.get(
                `hotel_rates[${categoryId}][extra][${extraIndex}][rate_14pax]`,
              ),
              extra_night_15pax: formData.get(
                `hotel_rates[${categoryId}][extra][${extraIndex}][rate_15pax]`,
              ),
              extra_night_child_no_breakfast: formData.get(
                `hotel_rates[${categoryId}][extra][${extraIndex}][rate_child]`,
              ),
            });
          }
          extraIndex++;
        }

        // Store all rows
        hotelRates[categoryId].regularRows = regularRows;
        hotelRates[categoryId].extraRows = extraRows;
      });

      // Collect transportation
      const transportRows = document.querySelectorAll(".transportation-row");
      const transportation = [];
      transportRows.forEach((row, index) => {
        const mode = formData.get(`transportation[${index}][mode]`);
        const modeMap = {
          private_van: 1,
          private_car: 2,
          coaster: 3,
          shuttle: 4,
        };
        transportation.push({
          mode_id: modeMap[mode] || 1,
          description: formData.get(`transportation[${index}][description]`),
          included: formData.get(`transportation[${index}][included]`),
        });
      });

      // Collect selected tours
      const selectedTours = formData.getAll("selected_tours[]");

      // Create package data object
      const packageData = {
        destination_id: formData.get("destination_id"),
        package_code: formData.get("package_code"),
        package_name: formData.get("package_name"),
        tour_category: selectedCategory,
        has_extra_night: formData.get("has_extra_night") === "true",
        base_price: formData.get("base_price"),
        markup_percent: formData.get("markup_percent"),
        tax_included: formData.get("tax_included") === "true",
        is_promo: formData.get("is_promo") === "true",
        inclusions: formData.get("inclusions"),
        exclusions: formData.get("exclusions"),
        itineraries: itineraries,
        hotel_rates: hotelRates,
        selected_tours: selectedTours,
        transportation: transportation,
        transportation_notes: formData.get("transportation_notes"),
      };

      console.log("📦 Sending package data:", packageData);

      const newPackage = await createPackage(packageData);

      if (newPackage) {
        modal.remove();
        showToast("✅ Package created successfully!", "success");
        await viewDestinationDetails(parseInt(destinationId));
      }
    } catch (error) {
      console.error("Error creating package:", error);
      showToast("❌ Failed to create package: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  });
}
export async function openEditPackageModal(packageId) {
  console.log("🔄 Opening edit package modal for ID:", packageId);

  try {
    showLoading(true, "Loading package data...");

    // Find the package and its destination
    let pkg = null;
    let destination = null;
    for (const dest of state.destinations) {
      const found = dest.packages?.find((p) => p.id === packageId);
      if (found) {
        pkg = JSON.parse(JSON.stringify(found));
        destination = dest;
        break;
      }
    }

    if (!pkg) {
      showToast("Package not found", "error");
      showLoading(false);
      return;
    }

    const inclusions = pkg.inclusions || [];
    const exclusions = pkg.exclusions || [];
    const itineraries = pkg.itineraries || [];
    const optionalTours = pkg.optional_tours || [];
    const transportation = pkg.transportation || [];

    const destinationType =
      destination?.country === "Philippines" ? "local" : "international";

    const { data: transportCategories } = await supabase
      .from("transportation_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    const { data: transportModes } = await supabase
      .from("transportation_modes")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    showLoading(false);

    const modal = document.createElement("div");
    modal.id = "editPackageModal";
    modal.className =
      "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto";

    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-7xl w-full my-8 shadow-2xl transform transition-all flex flex-col" style="max-height: 95vh;">
        <!-- Fixed Header -->
        <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 flex-shrink-0 sticky top-0 z-20">
          <div class="absolute inset-0 bg-black/10"></div>
          <div class="relative px-6 py-5">
            <div class="flex items-center gap-4">
              <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/30">
                <i class="fas fa-edit text-2xl text-white"></i>
              </div>
              <div class="flex-1">
                <h3 class="text-2xl font-bold text-white tracking-tight">Edit Package</h3>
                <p class="text-amber-100 text-sm mt-1">${pkg.package_name}</p>
              </div>
              <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
            </div>
          </div>
        </div>
        
        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto p-6">
          <form id="editPackageForm" class="space-y-6">
            <input type="hidden" name="package_id" value="${pkg.id}">
            <input type="hidden" name="destination_type" value="${destinationType}">
            
            <!-- SECTION 1: PACKAGE BASIC INFORMATION -->
            <div class="bg-gradient-to-br from-blue-50 to-white p-5 rounded-xl border-2 border-blue-100">
              <h4 class="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
                <div class="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i class="fas fa-info-circle text-blue-600 text-sm"></i>
                </div>
                Basic Information
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-gray-600 mb-2">Package Code</label>
                  <input type="text" name="package_code" value="${pkg.package_code || ""}" 
                         class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm"
                         placeholder="Enter package code">
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-600 mb-2">Package Name</label>
                  <input type="text" name="package_name" value="${pkg.package_name || ""}" 
                         class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm"
                         placeholder="Enter package name">
                </div>
              </div>
              
              <div class="mt-4">
                <label class="block text-sm font-semibold text-gray-600 mb-2">Tour Category</label>
                <select name="tour_category" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm">
                  <option value="Land Tours" ${pkg.tour_category === "Land Tours" ? "selected" : ""}>Land Tours</option>
                  <option value="Domestic" ${pkg.tour_category === "Domestic" ? "selected" : ""}>Domestic</option>
                  <option value="Promo" ${pkg.tour_category === "Promo" ? "selected" : ""}>Promo</option>
                </select>
              </div>
              
              <div class="flex items-center gap-4 mt-4">
                <label class="flex items-center gap-2">
                  <input type="checkbox" name="has_extra_night" value="true" ${pkg.has_extra_night === true ? "checked" : ""} 
                         class="h-4 w-4 text-blue-600 rounded focus:ring-blue-500">
                  <span class="text-sm text-gray-700">Has Extra Night</span>
                </label>
                <label class="flex items-center gap-2">
                  <input type="checkbox" name="is_active" value="true" ${pkg.is_active === true ? "checked" : ""} 
                         class="h-4 w-4 text-blue-600 rounded focus:ring-blue-500">
                  <span class="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <!-- SECTION 2: PACKAGE BASE PRICE -->
            <div class="bg-gradient-to-br from-emerald-50 to-white p-5 rounded-xl border-2 border-emerald-100">
              <h4 class="text-lg font-bold text-emerald-800 mb-4 flex items-center gap-2">
                <div class="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <i class="fas fa-tag text-emerald-600 text-sm"></i>
                </div>
                Package Base Price
              </h4>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-gray-600 mb-2">Base Price (₱)</label>
                  <input type="number" name="base_price" value="${pkg.base_price || ""}" step="0.01"
                         class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all text-sm">
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-600 mb-2">Markup %</label>
                  <input type="number" name="markup_percent" value="${pkg.markup_percent || 0}" step="0.1"
                         class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all text-sm">
                </div>
                <div class="flex items-end">
                  <label class="flex items-center gap-2">
                    <input type="checkbox" name="tax_included" value="true" ${pkg.tax_included === true ? "checked" : ""} 
                           class="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500">
                    <span class="text-sm text-gray-700">Tax Included</span>
                  </label>
                </div>
              </div>
            </div>
            
            <!-- SECTION 3: HOTEL CATEGORIES -->
            <div class="bg-gradient-to-br from-blue-50 to-white p-5 rounded-xl border-2 border-blue-100">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-lg font-bold text-blue-800 flex items-center gap-2">
                  <div class="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i class="fas fa-layer-group text-blue-600 text-sm"></i>
                  </div>
                  Hotel Categories
                </h4>
                <div class="flex gap-2">
                  <button type="button" onclick="window.openCreateHotelCategoryModal(${destination.id})" 
                          class="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 flex items-center gap-1">
                    <i class="fas fa-plus-circle"></i> Add Category
                  </button>
                </div>
              </div>
              
              <div id="hotelCategoriesContainer" class="space-y-4">
                ${
                  destination?.hotel_categories &&
                  destination.hotel_categories.length > 0
                    ? destination.hotel_categories
                        .map(
                          (cat) => `
                          <div class="bg-white p-4 rounded-lg border-2 border-blue-200" data-category-id="${cat.id}">
                            <div class="flex items-center justify-between mb-3">
                              <div>
                                <h5 class="font-semibold text-md text-blue-700">${cat.category_name}</h5>
                                <p class="text-xs text-gray-500 mt-1">
                                  <span class="mr-3">Max: ${cat.max_room_capacity || 4} pax</span>
                                  <span class="${cat.has_breakfast ? "text-green-600" : "text-gray-400"}">
                                    ${cat.has_breakfast ? "✓ Breakfast Included" : "✗ No Breakfast"}
                                  </span>
                                </p>
                              </div>
                              <div class="flex gap-2">
                                <button type="button" onclick="window.openEditHotelCategoryModal(${cat.id})" 
                                        class="text-amber-600 hover:text-amber-800 p-2 bg-white rounded-lg shadow-sm hover:shadow transition" title="Edit Category">
                                  <i class="fas fa-edit"></i>
                                </button>
                                <button type="button" onclick="window.confirmDeleteHotelCategory(${cat.id})" 
                                        class="text-red-600 hover:text-red-800 p-2 bg-white rounded-lg shadow-sm hover:shadow transition" title="Delete Category">
                                  <i class="fas fa-trash"></i>
                                </button>
                              </div>
                            </div>
                            
                            <!-- Hotels in this category -->
                            <div class="mt-3 border-t pt-3">
                              <div class="flex items-center justify-between mb-2">
                                <h6 class="text-sm font-semibold text-gray-600">Hotels</h6>
                                <button type="button" onclick="window.openCreateHotelModalWithCategory(${cat.id})" 
                                        class="px-2 py-1 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 flex items-center gap-1">
                                  <i class="fas fa-plus-circle"></i> Add Hotel
                                </button>
                              </div>
                              
                              <div class="space-y-2 max-h-48 overflow-y-auto">
                                ${
                                  cat.hotels && cat.hotels.length > 0
                                    ? cat.hotels
                                        .map(
                                          (hotel) => `
                                    <div class="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
                                      <div class="flex items-center gap-2">
                                        ${
                                          hotel.image_url
                                            ? `
                                          <img src="${hotel.image_url}" alt="${hotel.name}" class="w-8 h-8 rounded-lg object-cover">
                                        `
                                            : `
                                          <div class="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                                            <i class="fas fa-hotel text-gray-400 text-xs"></i>
                                          </div>
                                        `
                                        }
                                        <div>
                                          <span class="text-sm font-medium">${hotel.name}</span>
                                          <p class="text-xs text-gray-500">Max: ${hotel.max_capacity || "N/A"} pax</p>
                                        </div>
                                      </div>
                                      <div class="flex gap-1">
                                        <button type="button" onclick="window.openEditHotelModal(${hotel.id})" 
                                                class="text-amber-600 hover:text-amber-800 p-1" title="Edit Hotel">
                                          <i class="fas fa-edit text-xs"></i>
                                        </button>
                                        <button type="button" onclick="window.confirmDeleteHotel(${hotel.id})" 
                                                class="text-red-600 hover:text-red-800 p-1" title="Delete Hotel">
                                          <i class="fas fa-trash text-xs"></i>
                                        </button>
                                      </div>
                                    </div>
                                  `,
                                        )
                                        .join("")
                                    : '<p class="text-sm text-gray-400 italic text-center py-2">No hotels in this category</p>'
                                }
                              </div>
                            </div>
                          </div>
                        `,
                        )
                        .join("")
                    : '<p class="text-sm text-gray-500 italic text-center py-8">No hotel categories yet</p>'
                }
              </div>
            </div>
            
            <!-- SECTION 4: HOTEL RATES - WITH ADDITIONAL INFO -->
            <div class="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl border-2 border-indigo-100">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <div class="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <i class="fas fa-hotel text-indigo-600 text-sm"></i>
                  </div>
                  Hotel Rates (₱ per person)
                </h4>
              </div>

              <div id="hotelRatesContainer" class="space-y-6">
                ${
                  destination?.hotel_categories &&
                  destination.hotel_categories.length > 0
                    ? destination.hotel_categories
                        .map((cat, catIndex) => {
                          const rates =
                            pkg.package_hotel_rates?.filter(
                              (r) => r.hotel_category_id === cat.id,
                            ) || [];

                          return `
                          <div class="bg-white p-4 rounded-lg border-2 border-indigo-200" data-category-id="${cat.id}" data-category-index="${catIndex}">
                            <h5 class="font-semibold text-md mb-3 text-indigo-700">${cat.category_name}</h5>
                            
                            <!-- Regular Rates Table -->
                            <div class="mb-6">
                              <div class="flex items-center justify-between mb-2">
                                <h6 class="text-sm font-semibold text-gray-600">Regular Rates</h6>
                                <button type="button" onclick="addRateRow(${catIndex}, 'regular')" 
                                        class="px-3 py-1 bg-indigo-500 text-white rounded-lg text-xs hover:bg-indigo-600 transition flex items-center gap-1">
                                  <i class="fas fa-plus-circle"></i> Add Regular Rate Row
                                </button>
                              </div>
                              <div class="overflow-x-auto">
                                <table class="w-full border-collapse text-xs min-w-[1200px]">
                                  <thead>
                                    <tr class="bg-gray-100">
                                      <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[180px]">Season</th>
                                      <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[150px]">Sneak</th>
                                      <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[120px]">/Travel-Date</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">Solo</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">2P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">3P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">4P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">5P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">6P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">7P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">8P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">9P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">10P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">11P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">12P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">13P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">14P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">15P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">Child</th>
                                      <th class="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 min-w-[80px]">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody id="category-${catIndex}-regular-rates">
                                    <!-- Regular rate rows will be populated from existing data -->
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            
                            <!-- Extra Night Rates Table -->
                            <div class="mt-4">
                              <div class="flex items-center justify-between mb-2">
                                <h6 class="text-sm font-semibold text-gray-600">Extra Night Rates</h6>
                                <button type="button" onclick="addRateRow(${catIndex}, 'extra')" 
                                        class="px-3 py-1 bg-indigo-500 text-white rounded-lg text-xs hover:bg-indigo-600 transition flex items-center gap-1">
                                  <i class="fas fa-plus-circle"></i> Add Extra Night Rate Row
                                </button>
                              </div>
                              <div class="overflow-x-auto">
                                <table class="w-full border-collapse text-xs min-w-[1200px]">
                                  <thead>
                                    <tr class="bg-gray-50">
                                      <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[180px]">Season</th>
                                      <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[150px]">Sneak</th>
                                      <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[120px]"><Duration/Travel-Date/th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">Solo</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">2P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">3P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">4P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">5P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">6P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">7P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">8P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">9P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">10P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">11P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">12P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">13P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">14P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">15P</th>
                                      <th class="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 min-w-[100px]">Child</th>
                                      <th class="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 min-w-[80px]">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody id="category-${catIndex}-extra-rates">
                                    <!-- Extra night rate rows will be populated from existing data -->
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            
                            <!-- Breakfast Options -->
                            <div class="mt-4 pt-3 border-t border-gray-200 grid grid-cols-2 gap-4">
                              <div>
                                <label class="flex items-center gap-2">
                                  <input type="checkbox" name="hotel_rates[${cat.id}][breakfast_included]" value="true" ${rates[0]?.breakfast_included ? "checked" : ""} 
                                         class="h-4 w-4 text-indigo-600 rounded breakfast-checkbox">
                                  <span class="text-sm text-gray-700">Breakfast Included</span>
                                </label>
                              </div>
                              <div>
                                <input type="text" name="hotel_rates[${cat.id}][breakfast_notes]" value="${rates[0]?.breakfast_notes || ""}" 
                                       placeholder="Breakfast notes (optional)" 
                                       class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                              </div>
                            </div>
                            
                            <!-- ===== ADDITIONAL INFORMATION FIELD ===== -->
                            <div class="mt-4 pt-3 border-t border-gray-200">
                              <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                <i class="fas fa-info-circle text-indigo-500"></i>
                                Additional Information (Check-in/out times, policies, etc.)
                              </label>
                              <textarea name="hotel_rates[${cat.id}][additional_info]" rows="4"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        placeholder="Check-in: 2:00 PM
Check-out: 12:00 PM
Free WiFi
Pool access
Parking available
Children policy
Pets policy">${rates[0]?.additional_info || ""}</textarea>
                              <p class="text-xs text-gray-500 mt-1">One item per line for better formatting</p>
                            </div>
                            <!-- ======================================== -->
                          </div>
                        `;
                        })
                        .join("")
                    : '<p class="text-sm text-gray-500 italic text-center py-8">No hotel categories available</p>'
                }
              </div>
            </div>
            
            

<!-- ========================================= -->
<!-- SECTION 5: ITINERARY - FIXED VERSION -->
<!-- ========================================= -->
<div class="bg-gradient-to-br from-amber-50 to-white p-5 rounded-xl border-2 border-amber-100">
  <div class="flex items-center justify-between mb-4">
    <h4 class="text-lg font-bold text-gray-800 flex items-center gap-2">
      <i class="fas fa-map-signs text-amber-500"></i>
      Itinerary
    </h4>
    <button type="button" onclick="addItineraryDayEdit()" 
            class="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 transition-colors flex items-center gap-2">
      <i class="fas fa-plus-circle"></i> Add Day
    </button>
  </div>
  
  <div id="itineraryContainer" class="space-y-3 max-h-80 overflow-y-auto p-2">
    ${
      itineraries && itineraries.length > 0
        ? itineraries
            .map((iti) => {
              // Combine day_title and day_description for display
              let fullText = iti.day_title || "";
              if (
                iti.day_description &&
                Array.isArray(iti.day_description) &&
                iti.day_description.length > 0
              ) {
                fullText += "\n" + iti.day_description.join("\n");
              }

              return `
            <div class="flex items-start gap-2 bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-amber-300 transition-colors" data-day="${iti.day_number}">
              <span class="text-xs font-bold text-gray-600 w-12 pt-2 flex-shrink-0">Day ${iti.day_number}:</span>
              <textarea name="itineraries[${iti.day_number}]" rows="6" 
                        class="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 resize-y min-h-[150px] whitespace-pre-wrap font-mono leading-relaxed">${fullText}</textarea>
              <button type="button" onclick="removeItineraryDay(this)" class="text-red-500 hover:text-red-700 p-2 flex-shrink-0">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `;
            })
            .join("")
        : `
        <!-- Only show this if NO itineraries exist -->
        <div class="flex items-start gap-2 bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-amber-300 transition-colors" data-day="1">
          <span class="text-xs font-bold text-gray-600 w-12 pt-2 flex-shrink-0">Day 1:</span>
          <textarea name="itineraries[1]" rows="6" 
                    class="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 resize-y min-h-[150px] whitespace-pre-wrap font-mono leading-relaxed"
                    placeholder="Enter detailed itinerary for day 1..."></textarea>
          <button type="button" onclick="removeItineraryDay(this)" class="text-red-500 hover:text-red-700 p-2 flex-shrink-0">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="flex items-start gap-2 bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-amber-300 transition-colors" data-day="2">
          <span class="text-xs font-bold text-gray-600 w-12 pt-2 flex-shrink-0">Day 2:</span>
          <textarea name="itineraries[2]" rows="6"
                    class="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 resize-y min-h-[150px] whitespace-pre-wrap font-mono leading-relaxed"
                    placeholder="Enter detailed itinerary for day 2..."></textarea>
          <button type="button" onclick="removeItineraryDay(this)" class="text-red-500 hover:text-red-700 p-2 flex-shrink-0">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="flex items-start gap-2 bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-amber-300 transition-colors" data-day="3">
          <span class="text-xs font-bold text-gray-600 w-12 pt-2 flex-shrink-0">Day 3:</span>
          <textarea name="itineraries[3]" rows="6"
                    class="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 resize-y min-h-[150px] whitespace-pre-wrap font-mono leading-relaxed"
                    placeholder="Enter detailed itinerary for day 3..."></textarea>
          <button type="button" onclick="removeItineraryDay(this)" class="text-red-500 hover:text-red-700 p-2 flex-shrink-0">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `
    }
  </div>
  
  <div class="flex items-center gap-2 mt-3 text-xs text-gray-500">
    <i class="fas fa-info-circle"></i>
    <span>Total: <span id="totalDays">${itineraries?.length || 3}</span> day(s)</span>
  </div>
</div>

<!-- ========================================= -->
<!-- SECTION 6: INCLUSIONS -->
<!-- ========================================= -->
<div class="bg-gradient-to-br from-green-50 to-white p-5 rounded-xl border-2 border-green-100">
  <div class="flex items-center justify-between mb-4">
    <h4 class="text-lg font-bold text-gray-800 flex items-center gap-2">
      <i class="fas fa-check-circle text-green-500"></i>
      Inclusions
    </h4>
    <button type="button" onclick="addNewInclusion()" 
            class="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors flex items-center gap-2">
      <i class="fas fa-plus-circle"></i> Add Inclusion
    </button>
  </div>
  
  <!-- Bulk Delete Checkbox -->
  <div class="mb-3 flex items-center justify-between bg-green-100 p-2 rounded-lg">
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" onclick="toggleAllInclusions(this)" class="h-4 w-4 text-green-600 rounded">
      <span class="font-medium">Select All</span>
    </label>
    <button type="button" onclick="deleteSelectedInclusions(${pkg.id})" 
            class="px-3 py-1 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600">
      <i class="fas fa-trash mr-1"></i> Delete Selected
    </button>
  </div>
  
  <div id="inclusions-list" class="space-y-2 max-h-60 overflow-y-auto p-2">
    ${
      inclusions.length > 0
        ? inclusions
            .map(
              (inc) => `
        <div class="flex items-center gap-2 bg-white p-2 rounded-lg border border-green-200 hover:shadow-sm transition">
          <input type="checkbox" class="inclusion-checkbox checkbox-inclusions-${pkg.id}" value="${inc.id}" 
                 class="h-4 w-4 text-green-600 rounded flex-shrink-0">
          <textarea data-inclusion-id="${inc.id}" class="flex-1 px-2 py-1 border border-gray-200 rounded text-sm" 
                    rows="2">${inc.inclusion_text}</textarea>
          <button type="button" onclick="deletePackageInclusion(${inc.id})" 
                  class="text-red-500 hover:text-red-700 p-1" title="Delete">
            <i class="fas fa-trash text-xs"></i>
          </button>
        </div>
      `,
            )
            .join("")
        : '<p class="text-gray-500 italic text-sm py-4 text-center">No inclusions yet</p>'
    }
  </div>
  
  <!-- New Inclusion Input (Hidden by default) -->
  <div id="new-inclusion-input" class="mt-3 hidden">
    <div class="flex items-center gap-2">
      <textarea id="new-inclusion-text" rows="2" 
                class="flex-1 px-3 py-2 border-2 border-green-300 rounded-lg text-sm"
                placeholder="Enter new inclusion..."></textarea>
      <div class="flex flex-col gap-1">
        <button type="button" onclick="saveNewInclusion(${pkg.id})" 
                class="px-3 py-1 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600">
          <i class="fas fa-check"></i>
        </button>
        <button type="button" onclick="cancelNewInclusion()" 
                class="px-3 py-1 bg-gray-500 text-white rounded-lg text-xs hover:bg-gray-600">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  </div>
</div>

<!-- ========================================= -->
<!-- SECTION 7: EXCLUSIONS -->
<!-- ========================================= -->
<div class="bg-gradient-to-br from-red-50 to-white p-5 rounded-xl border-2 border-red-100">
  <div class="flex items-center justify-between mb-4">
    <h4 class="text-lg font-bold text-gray-800 flex items-center gap-2">
      <i class="fas fa-times-circle text-red-500"></i>
      Exclusions
    </h4>
    <button type="button" onclick="addNewExclusion()" 
            class="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors flex items-center gap-2">
      <i class="fas fa-plus-circle"></i> Add Exclusion
    </button>
  </div>
  
  <!-- Bulk Delete Checkbox -->
  <div class="mb-3 flex items-center justify-between bg-red-100 p-2 rounded-lg">
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" onclick="toggleAllExclusions(this)" class="h-4 w-4 text-red-600 rounded">
      <span class="font-medium">Select All</span>
    </label>
    <button type="button" onclick="deleteSelectedExclusions(${pkg.id})" 
            class="px-3 py-1 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600">
      <i class="fas fa-trash mr-1"></i> Delete Selected
    </button>
  </div>
  
  <div id="exclusions-list" class="space-y-2 max-h-60 overflow-y-auto p-2">
    ${
      exclusions.length > 0
        ? exclusions
            .map(
              (exc) => `
        <div class="flex items-center gap-2 bg-white p-2 rounded-lg border border-red-200 hover:shadow-sm transition">
          <input type="checkbox" class="exclusion-checkbox checkbox-exclusions-${pkg.id}" value="${exc.id}" 
                 class="h-4 w-4 text-red-600 rounded flex-shrink-0">
          <textarea data-exclusion-id="${exc.id}" class="flex-1 px-2 py-1 border border-gray-200 rounded text-sm" 
                    rows="2">${exc.exclusion_text}</textarea>
          <button type="button" onclick="deletePackageExclusion(${exc.id})" 
                  class="text-red-500 hover:text-red-700 p-1" title="Delete">
            <i class="fas fa-trash text-xs"></i>
          </button>
        </div>
      `,
            )
            .join("")
        : '<p class="text-gray-500 italic text-sm py-4 text-center">No exclusions yet</p>'
    }
  </div>
  
  <!-- New Exclusion Input (Hidden by default) -->
  <div id="new-exclusion-input" class="mt-3 hidden">
    <div class="flex items-center gap-2">
      <textarea id="new-exclusion-text" rows="2" 
                class="flex-1 px-3 py-2 border-2 border-red-300 rounded-lg text-sm"
                placeholder="Enter new exclusion..."></textarea>
      <div class="flex flex-col gap-1">
        <button type="button" onclick="saveNewExclusion(${pkg.id})" 
                class="px-3 py-1 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600">
          <i class="fas fa-check"></i>
        </button>
        <button type="button" onclick="cancelNewExclusion()" 
                class="px-3 py-1 bg-gray-500 text-white rounded-lg text-xs hover:bg-gray-600">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  </div>
</div>
            
            <!-- Action Buttons -->
            <div class="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
              <button type="button" onclick="this.closest('.fixed').remove()"
                      class="px-5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit"
                      class="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl text-sm font-semibold hover:from-amber-700 hover:to-orange-700">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // =====================================================
    // POPULATE EXISTING RATE ROWS
    // =====================================================

    console.log(
      "🔍 Package hotel rates details:",
      pkg.package_hotel_rates?.map((rate) => ({
        id: rate.id,
        category_id: rate.hotel_category_id,
        season: rate.season,
        sneak: rate.sneak,
        duration: rate.duration,
        rate_solo: rate.rate_solo,
        extra_night_solo: rate.extra_night_solo,
        additional_info: rate.additional_info,
      })),
    );

    setTimeout(() => {
      console.log("🔄 Starting to populate rate rows...");

      if (
        !destination?.hotel_categories ||
        destination.hotel_categories.length === 0
      ) {
        console.log("❌ No hotel categories found");
        return;
      }

      destination.hotel_categories.forEach((cat, catIndex) => {
        console.log(
          `Processing category ${catIndex}: ${cat.category_name} (ID: ${cat.id})`,
        );

        const categoryRates =
          pkg.package_hotel_rates?.filter((r) => {
            const match = r.hotel_category_id === cat.id;
            if (match) {
              console.log(`  Found rate for category ${cat.id}:`, {
                id: r.id,
                season: r.season,
                sneak: r.sneak,
                duration: r.duration,
                additional_info: r.additional_info
                  ? "Has additional info"
                  : "No additional info",
              });
            }
            return match;
          }) || [];

        console.log(`  Found ${categoryRates.length} rates for this category`);

        const regularTbody = document.getElementById(
          `category-${catIndex}-regular-rates`,
        );
        const extraTbody = document.getElementById(
          `category-${catIndex}-extra-rates`,
        );

        if (regularTbody) {
          regularTbody.innerHTML = "";
        }

        if (extraTbody) {
          extraTbody.innerHTML = "";
        }

        if (categoryRates.length > 0) {
          categoryRates.forEach((rate, rateIndex) => {
            const hasRegularRates =
              rate.rate_solo ||
              rate.rate_2pax ||
              rate.rate_3pax ||
              rate.rate_4pax ||
              rate.rate_5pax ||
              rate.rate_6pax ||
              rate.rate_7pax ||
              rate.rate_8pax ||
              rate.rate_9pax ||
              rate.rate_10pax ||
              rate.rate_11pax ||
              rate.rate_12pax ||
              rate.rate_13pax ||
              rate.rate_14pax ||
              rate.rate_15pax ||
              rate.rate_child_no_breakfast;

            if (hasRegularRates && regularTbody) {
              const regularRowHtml = createRateRowHtml(
                cat.id,
                catIndex,
                rateIndex,
                "regular",
                rate,
              );
              regularTbody.insertAdjacentHTML("beforeend", regularRowHtml);
            }

            const hasExtraRates =
              rate.extra_night_solo ||
              rate.extra_night_2pax ||
              rate.extra_night_3pax ||
              rate.extra_night_4pax ||
              rate.extra_night_5pax ||
              rate.extra_night_6pax ||
              rate.extra_night_7pax ||
              rate.extra_night_8pax ||
              rate.extra_night_9pax ||
              rate.extra_night_10pax ||
              rate.extra_night_11pax ||
              rate.extra_night_12pax ||
              rate.extra_night_13pax ||
              rate.extra_night_14pax ||
              rate.extra_night_15pax ||
              rate.extra_night_child_no_breakfast;

            if (hasExtraRates && extraTbody) {
              const extraRowHtml = createRateRowHtml(
                cat.id,
                catIndex,
                rateIndex,
                "extra",
                rate,
              );
              extraTbody.insertAdjacentHTML("beforeend", extraRowHtml);
            }
          });
        }

        if (regularTbody && regularTbody.children.length === 0) {
          addRateRow(catIndex, "regular");
        }

        if (extraTbody && extraTbody.children.length === 0) {
          addRateRow(catIndex, "extra");
        }
      });

      console.log("✅ Rate population complete");
    }, 500);

    // Helper function to create rate row HTML
    function createRateRowHtml(categoryId, catIndex, rowIndex, type, rate) {
      rate = rate || {};

      const seasonValue =
        rate.season !== null && rate.season !== undefined ? rate.season : "";
      const sneakValue =
        rate.sneak !== null && rate.sneak !== undefined ? rate.sneak : "";
      const durationValue =
        rate.duration !== null && rate.duration !== undefined
          ? rate.duration
          : "";

      if (type === "regular") {
        return `
      <tr class="hover:bg-gray-50" data-rate-id="${rate.id || ""}">
        <td class="border border-gray-300 px-3 py-2 min-w-[180px]">
          <input type="text" name="hotel_rates[${categoryId}][rates][${rowIndex}][season]" 
                 value="${seasonValue}" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                 placeholder="e.g., Peak Season 2024">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[150px]">
          <input type="text" name="hotel_rates[${categoryId}][rates][${rowIndex}][sneak]" 
                 value="${sneakValue}" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                 placeholder="e.g., SNK001">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[120px]">
          <input type="text" name="hotel_rates[${categoryId}][rates][${rowIndex}][duration]" 
                 value="${durationValue}" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                 placeholder="e.g., 3D2N">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][rates][${rowIndex}][rate_solo]" step="0.01" 
                 value="${rate.rate_solo || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][rates][${rowIndex}][rate_2pax]" step="0.01" 
                 value="${rate.rate_2pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][rates][${rowIndex}][rate_3pax]" step="0.01" 
                 value="${rate.rate_3pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][rates][${rowIndex}][rate_4pax]" step="0.01" 
                 value="${rate.rate_4pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][rates][${rowIndex}][rate_5pax]" step="0.01" 
                 value="${rate.rate_5pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][rates][${rowIndex}][rate_6pax]" step="0.01" 
                 value="${rate.rate_6pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][rates][${rowIndex}][rate_7pax]" step="0.01" 
                 value="${rate.rate_7pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][rates][${rowIndex}][rate_8pax]" step="0.01" 
                 value="${rate.rate_8pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][rates][${rowIndex}][rate_9pax]" step="0.01" 
                 value="${rate.rate_9pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][rates][${rowIndex}][rate_10pax]" step="0.01" 
                 value="${rate.rate_10pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][rates][${rowIndex}][rate_11pax]" step="0.01" 
                 value="${rate.rate_11pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][rates][${rowIndex}][rate_12pax]" step="0.01" 
                 value="${rate.rate_12pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][rates][${rowIndex}][rate_13pax]" step="0.01" 
                 value="${rate.rate_13pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][rates][${rowIndex}][rate_14pax]" step="0.01" 
                 value="${rate.rate_14pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][rates][${rowIndex}][rate_15pax]" step="0.01" 
                 value="${rate.rate_15pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][rates][${rowIndex}][rate_child]" step="0.01" 
                 value="${rate.rate_child_no_breakfast || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 text-center min-w-[80px]">
          <button type="button" onclick="this.closest('tr').remove()" 
                  class="text-red-500 hover:text-red-700 p-2 bg-red-50 hover:bg-red-100 rounded-lg transition" 
                  title="Delete Row">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
      } else {
        return `
      <tr class="hover:bg-gray-50" data-rate-id="${rate.id || ""}">
        <td class="border border-gray-300 px-3 py-2 min-w-[180px]">
          <input type="text" name="hotel_rates[${categoryId}][extra][${rowIndex}][season]" 
                 value="${seasonValue}" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                 placeholder="e.g., Peak Season 2024">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[150px]">
          <input type="text" name="hotel_rates[${categoryId}][extra][${rowIndex}][sneak]" 
                 value="${sneakValue}" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                 placeholder="e.g., SNK001">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[120px]">
          <input type="text" name="hotel_rates[${categoryId}][extra][${rowIndex}][duration]" 
                 value="${durationValue}" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                 placeholder="e.g., 3D2N">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][extra][${rowIndex}][rate_solo]" step="0.01" 
                 value="${rate.extra_night_solo || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][extra][${rowIndex}][rate_2pax]" step="0.01" 
                 value="${rate.extra_night_2pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][extra][${rowIndex}][rate_3pax]" step="0.01" 
                 value="${rate.extra_night_3pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][extra][${rowIndex}][rate_4pax]" step="0.01" 
                 value="${rate.extra_night_4pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][extra][${rowIndex}][rate_5pax]" step="0.01" 
                 value="${rate.extra_night_5pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][extra][${rowIndex}][rate_6pax]" step="0.01" 
                 value="${rate.extra_night_6pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][extra][${rowIndex}][rate_7pax]" step="0.01" 
                 value="${rate.extra_night_7pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][extra][${rowIndex}][rate_8pax]" step="0.01" 
                 value="${rate.extra_night_8pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][extra][${rowIndex}][rate_9pax]" step="0.01" 
                 value="${rate.extra_night_9pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][extra][${rowIndex}][rate_10pax]" step="0.01" 
                 value="${rate.extra_night_10pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][extra][${rowIndex}][rate_11pax]" step="0.01" 
                 value="${rate.extra_night_11pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][extra][${rowIndex}][rate_12pax]" step="0.01" 
                 value="${rate.extra_night_12pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][extra][${rowIndex}][rate_13pax]" step="0.01" 
                 value="${rate.extra_night_13pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][extra][${rowIndex}][rate_14pax]" step="0.01" 
                 value="${rate.extra_night_14pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][extra][${rowIndex}][rate_15pax]" step="0.01" 
                 value="${rate.extra_night_15pax || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
          <input type="number" name="hotel_rates[${categoryId}][extra][${rowIndex}][rate_child]" step="0.01" 
                 value="${rate.extra_night_child_no_breakfast || ""}" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                 placeholder="0.00">
        </td>
        <td class="border border-gray-300 px-3 py-2 text-center min-w-[80px]">
          <button type="button" onclick="this.closest('tr').remove()" 
                  class="text-red-500 hover:text-red-700 p-2 bg-red-50 hover:bg-red-100 rounded-lg transition" 
                  title="Delete Row">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
      }
    }

    // =====================================================
    // DEFINE ALL HELPER FUNCTIONS
    // =====================================================

    window.addRateRow = function (categoryIndex, type) {
      const tbodyId =
        type === "regular"
          ? `category-${categoryIndex}-regular-rates`
          : `category-${categoryIndex}-extra-rates`;

      const tbody = document.getElementById(tbodyId);
      if (!tbody) return;

      const rowCount = tbody.children.length;
      const category = destination.hotel_categories[categoryIndex];
      const categoryId = category.id;
      const rateType = type === "regular" ? "rates" : "extra";

      const rowHtml =
        type === "regular"
          ? `
          <tr class="hover:bg-gray-50">
            <td class="border border-gray-300 px-3 py-2 min-w-[180px]">
              <input type="text" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][season]" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                     placeholder="e.g., Peak Season 2024">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[150px]">
              <input type="text" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][sneak]" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                     placeholder="e.g., SNK001">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[120px]">
              <input type="text" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][duration]" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                     placeholder="e.g., 3D2N">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_solo]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_2pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_3pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_4pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_5pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_6pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_7pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_8pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_9pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_10pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_11pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_12pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_13pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_14pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_15pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_child]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 text-center min-w-[80px]">
              <button type="button" onclick="this.closest('tr').remove()" 
                      class="text-red-500 hover:text-red-700 p-2 bg-red-50 hover:bg-red-100 rounded-lg transition" 
                      title="Delete Row">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `
          : `
          <tr class="hover:bg-gray-50">
            <td class="border border-gray-300 px-3 py-2 min-w-[180px]">
              <input type="text" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][season]" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                     placeholder="e.g., Peak Season 2024">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[150px]">
              <input type="text" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][sneak]" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                     placeholder="e.g., SNK001">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[120px]">
              <input type="text" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][duration]" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
                     placeholder="e.g., 3D2N">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_solo]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_2pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_3pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_4pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_5pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_6pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_7pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_8pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_9pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_10pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_11pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_12pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_13pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_14pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_15pax]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 min-w-[100px]">
              <input type="number" name="hotel_rates[${categoryId}][${rateType}][${rowCount}][rate_child]" step="0.01" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-right" 
                     placeholder="0.00">
            </td>
            <td class="border border-gray-300 px-3 py-2 text-center min-w-[80px]">
              <button type="button" onclick="this.closest('tr').remove()" 
                      class="text-red-500 hover:text-red-700 p-2 bg-red-50 hover:bg-red-100 rounded-lg transition" 
                      title="Delete Row">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `;

      tbody.insertAdjacentHTML("beforeend", rowHtml);
    };

    // =====================================================
    // FORM SUBMIT HANDLER - FIXED WITH PROPER CRUD OPERATIONS
    // =====================================================
    const form = document.getElementById("editPackageForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      showLoading(true, "Saving changes...");

      try {
        const formData = new FormData(form);

        // ========== 1. BASIC PACKAGE DATA ==========
        const isActiveValue = formData.get("is_active");
        const hasExtraNightValue = formData.get("has_extra_night");
        const taxIncludedValue = formData.get("tax_included");

        const updateData = {
          package_code:
            formData.get("package_code") || pkg.package_code || null,
          package_name:
            formData.get("package_name") || pkg.package_name || null,
          tour_category:
            formData.get("tour_category") || pkg.tour_category || null,
          has_extra_night: String(hasExtraNightValue) === "true",
          is_active: String(isActiveValue) === "true",
          base_price: formData.get("base_price")
            ? parseFloat(formData.get("base_price"))
            : pkg.base_price || null,
          markup_percent: formData.get("markup_percent")
            ? parseFloat(formData.get("markup_percent"))
            : pkg.markup_percent || 0,
          tax_included: String(taxIncludedValue) === "true",
        };

        console.log("📤 UPDATE VALUES SENT:", {
          is_active_raw: isActiveValue,
          is_active_converted: String(isActiveValue) === "true",
          has_extra_night: String(hasExtraNightValue) === "true",
          tax_included: String(taxIncludedValue) === "true",
        });

        // ========== 2. ITINERARIES - FIXED TO PREVENT DUPLICATION ==========
        const itineraries = {};
        let hasItineraryData = false;

        // Get ALL itinerary textareas
        const itineraryTextareas = document.querySelectorAll(
          '[name^="itineraries["]',
        );
        console.log(
          `📝 Found ${itineraryTextareas.length} itinerary textareas`,
        );

        itineraryTextareas.forEach((textarea) => {
          const match = textarea.name.match(/\[(\d+)\]/);
          if (match) {
            const dayNum = parseInt(match[1]);
            const value = textarea.value?.trim();

            if (value) {
              hasItineraryData = true;
              // Split by lines, first line is title, rest are description
              const lines = value.split("\n").filter((line) => line.trim());
              const dayTitle = lines[0] || `Day ${dayNum}`;
              const dayDescription = lines
                .slice(1)
                .filter((line) => line.trim());

              itineraries[dayNum] = {
                day_number: dayNum,
                day_title: dayTitle,
                day_description:
                  dayDescription.length > 0 ? dayDescription : null,
              };
              console.log(`📝 Day ${dayNum}:`, {
                title: dayTitle,
                descriptionCount: dayDescription.length,
              });
            }
          }
        });

        // ALWAYS send itineraries data, even if empty (to clear existing ones)
        if (hasItineraryData) {
          updateData.itineraries = JSON.stringify(itineraries);
          updateData.update_itineraries = "true";
          console.log(
            "📤 Sending itineraries:",
            Object.keys(itineraries).length,
            "days",
          );
        } else {
          // If no itineraries, send empty object to clear them
          updateData.itineraries = JSON.stringify({});
          updateData.update_itineraries = "true";
          console.log("📤 Sending empty itineraries (to clear existing)");
        }

        // ========== 3. INCLUSIONS - FIXED ==========
        // Get selected inclusions for deletion - using correct class name
        const selectedInclusions = Array.from(
          document.querySelectorAll(".inclusion-checkbox:checked"),
        ).map((cb) => parseInt(cb.value));

        if (selectedInclusions.length > 0) {
          updateData.delete_inclusions = JSON.stringify(selectedInclusions);
        }

        // Get updated inclusion text
        const inclusionUpdates = [];
        document
          .querySelectorAll("textarea[data-inclusion-id]")
          .forEach((textarea) => {
            const inclusionId = parseInt(textarea.dataset.inclusionId);
            const newText = textarea.value.trim();
            const existingInclusion = pkg.inclusions?.find(
              (i) => i.id === inclusionId,
            );

            if (
              newText &&
              (!existingInclusion ||
                existingInclusion.inclusion_text !== newText)
            ) {
              inclusionUpdates.push({ id: inclusionId, text: newText });
            }
          });

        if (inclusionUpdates.length > 0) {
          updateData.update_inclusions = JSON.stringify(inclusionUpdates);
        }

        // ========== 4. EXCLUSIONS - FIXED ==========
        // Get selected exclusions for deletion - using correct class name
        const selectedExclusions = Array.from(
          document.querySelectorAll(".exclusion-checkbox:checked"),
        ).map((cb) => parseInt(cb.value));

        if (selectedExclusions.length > 0) {
          updateData.delete_exclusions = JSON.stringify(selectedExclusions);
        }

        // Get updated exclusion text
        const exclusionUpdates = [];
        document
          .querySelectorAll("textarea[data-exclusion-id]")
          .forEach((textarea) => {
            const exclusionId = parseInt(textarea.dataset.exclusionId);
            const newText = textarea.value.trim();
            const existingExclusion = pkg.exclusions?.find(
              (e) => e.id === exclusionId,
            );

            if (
              newText &&
              (!existingExclusion ||
                existingExclusion.exclusion_text !== newText)
            ) {
              exclusionUpdates.push({ id: exclusionId, text: newText });
            }
          });

        if (exclusionUpdates.length > 0) {
          updateData.update_exclusions = JSON.stringify(exclusionUpdates);
        }

        // ========== 5. NEW INCLUSIONS/EXCLUSIONS ==========
        const newInclusionText =
          document.getElementById("new-inclusion-text")?.value;
        if (newInclusionText?.trim()) {
          updateData.new_inclusions = JSON.stringify([newInclusionText.trim()]);
        }

        const newExclusionText =
          document.getElementById("new-exclusion-text")?.value;
        if (newExclusionText?.trim()) {
          updateData.new_exclusions = JSON.stringify([newExclusionText.trim()]);
        }

        // ========== 6. TRANSPORTATION ==========
        const transportationData = [];
        let transportIndex = 0;

        document.querySelectorAll(".transportation-row").forEach((row) => {
          const modeSelect = row.querySelector(
            'select[name^="transportation"]',
          );
          const descInput = row.querySelector(
            'input[name^="transportation"][name*="[description]"]',
          );
          const includedCheck = row.querySelector(
            'input[name^="transportation"][name*="[included]"]',
          );

          if (modeSelect && modeSelect.value) {
            const modeMap = {
              private_van: 1,
              private_car: 2,
              coaster: 3,
              shuttle: 4,
            };
            transportationData.push({
              mode_id: modeMap[modeSelect.value] || 1,
              description: descInput?.value || null,
              included: includedCheck?.checked ? "true" : "false",
              display_order: transportIndex++,
            });
          }
        });

        if (transportationData.length > 0) {
          updateData.transportation = JSON.stringify(transportationData);
        }

        // ========== 7. HOTEL RATES - WITH ADDITIONAL INFO ==========
        const hotelRatesToSave = [];

        destination?.hotel_categories?.forEach((cat, catIndex) => {
          const categoryId = cat.id;

          const breakfastIncluded =
            formData.get(`hotel_rates[${categoryId}][breakfast_included]`) ===
            "true";
          const breakfastNotes =
            formData.get(`hotel_rates[${categoryId}][breakfast_notes]`) || null;
          const additionalInfo =
            formData.get(`hotel_rates[${categoryId}][additional_info]`) || null;

          // Process regular rate rows
          const regularTbody = document.getElementById(
            `category-${catIndex}-regular-rates`,
          );
          if (regularTbody) {
            const rows = regularTbody.querySelectorAll("tr");
            rows.forEach((row, rowIndex) => {
              const season = row.querySelector(
                `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][season]"]`,
              )?.value;
              const sneak = row.querySelector(
                `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][sneak]"]`,
              )?.value;
              const duration = row.querySelector(
                `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][duration]"]`,
              )?.value;

              const rateData = {
                package_id: pkg.id,
                hotel_category_id: categoryId,
                season: season?.trim() || null,
                sneak: sneak?.trim() || null,
                duration: duration?.trim() || null,
                rate_solo:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][rate_solo]"]`,
                    )?.value,
                  ) || null,
                rate_2pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][rate_2pax]"]`,
                    )?.value,
                  ) || null,
                rate_3pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][rate_3pax]"]`,
                    )?.value,
                  ) || null,
                rate_4pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][rate_4pax]"]`,
                    )?.value,
                  ) || null,
                rate_5pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][rate_5pax]"]`,
                    )?.value,
                  ) || null,
                rate_6pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][rate_6pax]"]`,
                    )?.value,
                  ) || null,
                rate_7pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][rate_7pax]"]`,
                    )?.value,
                  ) || null,
                rate_8pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][rate_8pax]"]`,
                    )?.value,
                  ) || null,
                rate_9pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][rate_9pax]"]`,
                    )?.value,
                  ) || null,
                rate_10pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][rate_10pax]"]`,
                    )?.value,
                  ) || null,
                rate_11pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][rate_11pax]"]`,
                    )?.value,
                  ) || null,
                rate_12pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][rate_12pax]"]`,
                    )?.value,
                  ) || null,
                rate_13pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][rate_13pax]"]`,
                    )?.value,
                  ) || null,
                rate_14pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][rate_14pax]"]`,
                    )?.value,
                  ) || null,
                rate_15pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][rate_15pax]"]`,
                    )?.value,
                  ) || null,
                rate_child_no_breakfast:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][rates][${rowIndex}][rate_child]"]`,
                    )?.value,
                  ) || null,
                extra_night_solo: null,
                extra_night_2pax: null,
                extra_night_3pax: null,
                extra_night_4pax: null,
                extra_night_5pax: null,
                extra_night_6pax: null,
                extra_night_7pax: null,
                extra_night_8pax: null,
                extra_night_9pax: null,
                extra_night_10pax: null,
                extra_night_11pax: null,
                extra_night_12pax: null,
                extra_night_13pax: null,
                extra_night_14pax: null,
                extra_night_15pax: null,
                extra_night_child_no_breakfast: null,
                breakfast_included: breakfastIncluded,
                breakfast_notes: breakfastNotes,
                additional_info: additionalInfo,
              };

              // Only add if at least one rate field has value
              if (
                rateData.rate_solo ||
                rateData.rate_2pax ||
                rateData.rate_3pax ||
                rateData.rate_4pax ||
                rateData.rate_5pax ||
                rateData.rate_6pax ||
                rateData.rate_7pax ||
                rateData.rate_8pax ||
                rateData.rate_9pax ||
                rateData.rate_10pax ||
                rateData.rate_11pax ||
                rateData.rate_12pax ||
                rateData.rate_13pax ||
                rateData.rate_14pax ||
                rateData.rate_15pax ||
                rateData.rate_child_no_breakfast ||
                rateData.season ||
                rateData.sneak ||
                rateData.duration
              ) {
                hotelRatesToSave.push(rateData);
              }
            });
          }

          // Process extra night rate rows
          const extraTbody = document.getElementById(
            `category-${catIndex}-extra-rates`,
          );
          if (extraTbody) {
            const rows = extraTbody.querySelectorAll("tr");
            rows.forEach((row, rowIndex) => {
              const season = row.querySelector(
                `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][season]"]`,
              )?.value;
              const sneak = row.querySelector(
                `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][sneak]"]`,
              )?.value;
              const duration = row.querySelector(
                `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][duration]"]`,
              )?.value;

              const rateData = {
                package_id: pkg.id,
                hotel_category_id: categoryId,
                season: season?.trim() || null,
                sneak: sneak?.trim() || null,
                duration: duration?.trim() || null,
                extra_night_solo:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][rate_solo]"]`,
                    )?.value,
                  ) || null,
                extra_night_2pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][rate_2pax]"]`,
                    )?.value,
                  ) || null,
                extra_night_3pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][rate_3pax]"]`,
                    )?.value,
                  ) || null,
                extra_night_4pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][rate_4pax]"]`,
                    )?.value,
                  ) || null,
                extra_night_5pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][rate_5pax]"]`,
                    )?.value,
                  ) || null,
                extra_night_6pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][rate_6pax]"]`,
                    )?.value,
                  ) || null,
                extra_night_7pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][rate_7pax]"]`,
                    )?.value,
                  ) || null,
                extra_night_8pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][rate_8pax]"]`,
                    )?.value,
                  ) || null,
                extra_night_9pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][rate_9pax]"]`,
                    )?.value,
                  ) || null,
                extra_night_10pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][rate_10pax]"]`,
                    )?.value,
                  ) || null,
                extra_night_11pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][rate_11pax]"]`,
                    )?.value,
                  ) || null,
                extra_night_12pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][rate_12pax]"]`,
                    )?.value,
                  ) || null,
                extra_night_13pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][rate_13pax]"]`,
                    )?.value,
                  ) || null,
                extra_night_14pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][rate_14pax]"]`,
                    )?.value,
                  ) || null,
                extra_night_15pax:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][rate_15pax]"]`,
                    )?.value,
                  ) || null,
                extra_night_child_no_breakfast:
                  parseFloat(
                    row.querySelector(
                      `[name^="hotel_rates[${categoryId}][extra][${rowIndex}][rate_child]"]`,
                    )?.value,
                  ) || null,
                rate_solo: null,
                rate_2pax: null,
                rate_3pax: null,
                rate_4pax: null,
                rate_5pax: null,
                rate_6pax: null,
                rate_7pax: null,
                rate_8pax: null,
                rate_9pax: null,
                rate_10pax: null,
                rate_11pax: null,
                rate_12pax: null,
                rate_13pax: null,
                rate_14pax: null,
                rate_15pax: null,
                rate_child_no_breakfast: null,
                breakfast_included: breakfastIncluded,
                breakfast_notes: breakfastNotes,
                additional_info: additionalInfo,
              };

              // Only add if at least one rate field has value
              if (
                rateData.extra_night_solo ||
                rateData.extra_night_2pax ||
                rateData.extra_night_3pax ||
                rateData.extra_night_4pax ||
                rateData.extra_night_5pax ||
                rateData.extra_night_6pax ||
                rateData.extra_night_7pax ||
                rateData.extra_night_8pax ||
                rateData.extra_night_9pax ||
                rateData.extra_night_10pax ||
                rateData.extra_night_11pax ||
                rateData.extra_night_12pax ||
                rateData.extra_night_13pax ||
                rateData.extra_night_14pax ||
                rateData.extra_night_15pax ||
                rateData.extra_night_child_no_breakfast ||
                rateData.season ||
                rateData.sneak ||
                rateData.duration
              ) {
                hotelRatesToSave.push(rateData);
              }
            });
          }
        });

        if (hotelRatesToSave.length > 0) {
          updateData.hotel_rates_data = JSON.stringify(hotelRatesToSave);
          console.log(
            "📊 Hotel rates data saved:",
            hotelRatesToSave.length,
            "rows",
          );
        }

        // ========== 8. OPTIONAL TOURS ==========
        const newToursToAdd = formData
          .getAll("new_tours_to_add[]")
          .map((id) => parseInt(id));
        if (newToursToAdd.length > 0) {
          updateData.add_tours = newToursToAdd;
        }

        console.log("📦 Sending update data:", updateData);

        const result = await updatePackage(pkg.id, updateData);

        if (result) {
          modal.remove();
          showToast("✅ Package updated successfully!", "success");
          if (destination) await viewDestinationDetails(destination.id);
        }
      } catch (error) {
        console.error("Error updating package:", error);
        showToast("Failed to update package: " + error.message, "error");
      } finally {
        showLoading(false);
      }
    });

    // Load available tours
    async function loadAvailableTours() {
      try {
        const { data: allTours } = await supabase
          .from("optional_tours")
          .select("*, optional_tour_rates(*)")
          .eq("destination_id", destination.id)
          .eq("is_active", true);

        const linkedTourIds = new Set(
          (pkg.optional_tours || []).map((t) => t.id),
        );
        const availableTours = (allTours || []).filter(
          (tour) => !linkedTourIds.has(tour.id),
        );
        const container = document.getElementById("availableToursContainer");

        if (!container) return;

        if (availableTours.length === 0) {
          container.innerHTML =
            '<p class="text-gray-500 text-sm italic py-2">No additional tours available</p>';
          return;
        }

        container.innerHTML = availableTours
          .map(
            (tour) => `
          <div class="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <input type="checkbox" name="new_tours_to_add[]" value="${tour.id}" class="h-4 w-4 text-purple-600 rounded">
                <span class="text-sm">${tour.tour_name}</span>
              </div>
              <div class="ml-6 text-xs text-gray-500">
                ${tour.duration_hours ? `${tour.duration_hours}h | ` : ""}
                From ₱${tour.optional_tour_rates?.[0]?.rate_solo || tour.optional_tour_rates?.[0]?.rate_2pax || "0"}/pax
              </div>
            </div>
            <button type="button" onclick="window.viewOptionalTourDetails(${tour.id})" class="text-purple-600 hover:text-purple-800 text-xs">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        `,
          )
          .join("");
      } catch (error) {
        console.error("Error loading available tours:", error);
      }
    }

    loadAvailableTours();
  } catch (error) {
    console.error("Error in openEditPackageModal:", error);
    showLoading(false);
    showToast("Failed to open edit modal: " + error.message, "error");
  }
}
// =====================================================
// HOTEL CATEGORY MODALS
// =====================================================

export function openCreateHotelCategoryModal(destinationId) {
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
      <!-- Fixed Header -->
      <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">
        <div class="absolute inset-0 bg-black/10"></div>
        <div class="relative px-6 py-5">
          <div class="flex items-center gap-4">
            <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/30">
              <i class="fas fa-layer-group text-2xl text-white"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-white tracking-tight">Create Hotel Category</h3>
              <p class="text-indigo-100 text-sm mt-1">Add a new hotel category for this destination</p>
            </div>
            <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
        </div>
      </div>
      
      <form id="createHotelCategoryForm" class="p-6 space-y-5">
        <input type="hidden" name="destination_id" value="${destinationId}">
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-tag text-indigo-500 mr-2 text-xs"></i>
              Category Name <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <i class="fas fa-building absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input type="text" name="category_name" required
                     class="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
                     placeholder="e.g., Budget, Standard, Deluxe">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                <i class="fas fa-sort-numeric-down text-indigo-500 mr-2 text-xs"></i>
                Display Order
              </label>
              <input type="number" name="display_order" value="99"
                     class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm">
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                <i class="fas fa-users text-indigo-500 mr-2 text-xs"></i>
                Max Capacity
              </label>
              <input type="number" name="max_room_capacity" value="4"
                     class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-utensils text-indigo-500 mr-2 text-xs"></i>
              Has Breakfast?
            </label>
            <select name="has_breakfast" 
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm appearance-none bg-white">
              <option value="true">Yes - Breakfast Included</option>
              <option value="false">No - No Breakfast</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-pen text-indigo-500 mr-2 text-xs"></i>
              Breakfast Note
            </label>
            <input type="text" name="breakfast_note"
                   class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
                   placeholder="e.g., Breakfast at hotel restaurant">
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 pt-6 border-t border-gray-100">
          <button type="button" onclick="this.closest('.fixed').remove()"
                  class="px-5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
            <i class="fas fa-times mr-2"></i>Cancel
          </button>
          <button type="submit"
                  class="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2">
            <i class="fas fa-save"></i>
            Create Category
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const form = document.getElementById("createHotelCategoryForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const result = await createHotelCategory({
      destination_id: formData.get("destination_id"),
      category_name: formData.get("category_name"),
      display_order: formData.get("display_order"),
      max_room_capacity: formData.get("max_room_capacity"),
      has_breakfast: formData.get("has_breakfast"),
      breakfast_note: formData.get("breakfast_note"),
    });

    if (result) {
      modal.remove();
      showToast("✅ Hotel category created successfully!", "success");
    }
  });
}

export function openEditHotelCategoryModal(categoryId) {
  // Find the category
  let category = null;
  let destination = null;
  for (const dest of state.destinations) {
    const found = dest.hotel_categories?.find((c) => c.id === categoryId);
    if (found) {
      category = found;
      destination = dest;
      break;
    }
  }

  if (!category) {
    showToast("Category not found", "error");
    return;
  }

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl transform transition-all">
      <!-- Fixed Header with Gradient -->
      <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-amber-600 via-orange-500 to-red-500">
        <div class="absolute inset-0 bg-black/10"></div>
        <div class="relative px-6 py-5">
          <div class="flex items-center gap-4">
            <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/30">
              <i class="fas fa-edit text-2xl text-white"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-white tracking-tight">Edit Hotel Category</h3>
              <p class="text-amber-100 text-sm mt-1">${category.category_name}</p>
            </div>
            <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
        </div>
      </div>
      
      <form id="editHotelCategoryForm" class="p-6 space-y-5 max-h-[calc(90vh-120px)] overflow-y-auto">
        <input type="hidden" name="id" value="${category.id}">
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-tag text-amber-500 mr-2 text-xs"></i>
              Category Name <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <i class="fas fa-building absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input type="text" name="category_name" value="${category.category_name}" required
                     class="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-sm">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                <i class="fas fa-sort-numeric-down text-amber-500 mr-2 text-xs"></i>
                Display Order
              </label>
              <input type="number" name="display_order" value="${category.display_order || 99}"
                     class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-sm">
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                <i class="fas fa-users text-amber-500 mr-2 text-xs"></i>
                Max Capacity
              </label>
              <input type="number" name="max_room_capacity" value="${category.max_room_capacity || 4}"
                     class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-sm">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-utensils text-amber-500 mr-2 text-xs"></i>
              Has Breakfast?
            </label>
            <select name="has_breakfast" 
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-sm appearance-none bg-white">
              <option value="true" ${category.has_breakfast ? "selected" : ""}>Yes - Breakfast Included</option>
              <option value="false" ${!category.has_breakfast ? "selected" : ""}>No - No Breakfast</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-pen text-amber-500 mr-2 text-xs"></i>
              Breakfast Note
            </label>
            <input type="text" name="breakfast_note" value="${category.breakfast_note || ""}"
                   class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-sm"
                   placeholder="e.g., Breakfast at hotel restaurant">
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 pt-6 border-t border-gray-100">
          <button type="button" onclick="this.closest('.fixed').remove()"
                  class="px-5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
            <i class="fas fa-times mr-2"></i>Cancel
          </button>
          <button type="submit"
                  class="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl text-sm font-semibold hover:from-amber-700 hover:to-orange-700 transition-all shadow-lg shadow-amber-200 flex items-center gap-2">
            <i class="fas fa-save"></i>
            Save Changes
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const form = document.getElementById("editHotelCategoryForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const result = await updateHotelCategory(category.id, {
      category_name: formData.get("category_name"),
      display_order: formData.get("display_order"),
      max_room_capacity: formData.get("max_room_capacity"),
      has_breakfast: formData.get("has_breakfast"),
      breakfast_note: formData.get("breakfast_note"),
    });

    if (result) {
      modal.remove();
      showToast("✅ Hotel category updated successfully!", "success");
    }
  });
}

// =====================================================
// HOTEL MODALS
// =====================================================

export function openCreateHotelModalWithCategory(categoryId) {
  // Find the category
  let category = null;
  for (const dest of state.destinations) {
    const found = dest.hotel_categories?.find((c) => c.id === categoryId);
    if (found) {
      category = found;
      break;
    }
  }

  if (!category) {
    showToast("Category not found", "error");
    return;
  }

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl transform transition-all">
      <!-- Fixed Header -->
      <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">
        <div class="absolute inset-0 bg-black/10"></div>
        <div class="relative px-6 py-5">
          <div class="flex items-center gap-4">
            <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/30">
              <i class="fas fa-hotel text-2xl text-white"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-white tracking-tight">Add Hotel to ${category.category_name}</h3>
              <p class="text-indigo-100 text-sm mt-1">Create a new hotel in this category</p>
            </div>
            <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
        </div>
      </div>
      
      <form id="createHotelForm" class="p-6 space-y-5 max-h-[calc(90vh-120px)] overflow-y-auto">
        <input type="hidden" name="category_id" value="${category.id}">
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-building text-indigo-500 mr-2 text-xs"></i>
              Hotel Name <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <i class="fas fa-hotel absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input type="text" name="name" required
                     class="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
                     placeholder="e.g., Boracay Beach Resort">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-users text-indigo-500 mr-2 text-xs"></i>
              Max Capacity
            </label>
            <input type="number" name="max_capacity"
                   class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
                   placeholder="e.g., 4">
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-sticky-note text-indigo-500 mr-2 text-xs"></i>
              Notes
            </label>
            <textarea name="notes" rows="2"
                      class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
                      placeholder="Any special notes about this hotel"></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-image text-indigo-500 mr-2 text-xs"></i>
              Image URL (optional)
            </label>
            <input type="url" name="image_url"
                   class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
                   placeholder="https://example.com/hotel-image.jpg">
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 pt-6 border-t border-gray-100">
          <button type="button" onclick="this.closest('.fixed').remove()"
                  class="px-5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
            <i class="fas fa-times mr-2"></i>Cancel
          </button>
          <button type="submit"
                  class="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2">
            <i class="fas fa-plus-circle"></i>
            Add Hotel
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const form = document.getElementById("createHotelForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const result = await createHotel({
      category_id: formData.get("category_id"),
      name: formData.get("name"),
      max_capacity: formData.get("max_capacity"),
      notes: formData.get("notes"),
      image_url: formData.get("image_url"),
    });

    if (result) {
      modal.remove();
      showToast("✅ Hotel added successfully!", "success");
    }
  });
}

export function openEditHotelModal(hotelId) {
  // Find the hotel
  let hotel = null;
  let category = null;
  for (const dest of state.destinations) {
    for (const cat of dest.hotel_categories || []) {
      const found = cat.hotels?.find((h) => h.id === hotelId);
      if (found) {
        hotel = found;
        category = cat;
        break;
      }
    }
  }

  if (!hotel) {
    showToast("Hotel not found", "error");
    return;
  }

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl transform transition-all">
      <!-- Fixed Header -->
      <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-amber-600 via-orange-500 to-red-500">
        <div class="absolute inset-0 bg-black/10"></div>
        <div class="relative px-6 py-5">
          <div class="flex items-center gap-4">
            <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/30">
              <i class="fas fa-edit text-2xl text-white"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-white tracking-tight">Edit Hotel</h3>
              <p class="text-amber-100 text-sm mt-1">${hotel.name}</p>
            </div>
            <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
        </div>
      </div>
      
      <form id="editHotelForm" class="p-6 space-y-5 max-h-[calc(90vh-120px)] overflow-y-auto">
        <input type="hidden" name="id" value="${hotel.id}">
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-building text-amber-500 mr-2 text-xs"></i>
              Hotel Name <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <i class="fas fa-hotel absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input type="text" name="name" value="${hotel.name}" required
                     class="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-sm">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-users text-amber-500 mr-2 text-xs"></i>
              Max Capacity
            </label>
            <input type="number" name="max_capacity" value="${hotel.max_capacity || ""}"
                   class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-sm">
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-power-off text-amber-500 mr-2 text-xs"></i>
              Status
            </label>
            <select name="is_active" 
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-sm appearance-none bg-white">
              <option value="true" ${hotel.is_active ? "selected" : ""}>Active</option>
              <option value="false" ${!hotel.is_active ? "selected" : ""}>Inactive</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-sticky-note text-amber-500 mr-2 text-xs"></i>
              Notes
            </label>
            <textarea name="notes" rows="2"
                      class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-sm">${hotel.notes || ""}</textarea>
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-image text-amber-500 mr-2 text-xs"></i>
              Image URL
            </label>
            <input type="url" name="image_url" value="${hotel.image_url || ""}"
                   class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-sm"
                   placeholder="https://example.com/hotel-image.jpg">
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 pt-6 border-t border-gray-100">
          <button type="button" onclick="this.closest('.fixed').remove()"
                  class="px-5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
            <i class="fas fa-times mr-2"></i>Cancel
          </button>
          <button type="submit"
                  class="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl text-sm font-semibold hover:from-amber-700 hover:to-orange-700 transition-all shadow-lg shadow-amber-200 flex items-center gap-2">
            <i class="fas fa-save"></i>
            Save Changes
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const form = document.getElementById("editHotelForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const result = await updateHotel(hotel.id, {
      name: formData.get("name"),
      max_capacity: formData.get("max_capacity"),
      is_active: formData.get("is_active"),
      notes: formData.get("notes"),
      image_url: formData.get("image_url"),
    });

    if (result) {
      modal.remove();
      showToast("✅ Hotel updated successfully!", "success");
    }
  });
}

// =====================================================
// UPDATED CREATE OPTIONAL TOUR MODAL - WITH FILE UPLOAD
// =====================================================

export function openCreateOptionalTourModal(destinationId) {
  const destination = state.destinations.find((d) => d.id === destinationId);

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto";

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl transform transition-all flex flex-col" style="max-height: 90vh;">
      <!-- Fixed Header -->
      <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 flex-shrink-0">
        <div class="absolute inset-0 bg-black/10"></div>
        <div class="relative px-6 py-5">
          <div class="flex items-center gap-4">
            <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/30">
              <i class="fas fa-compass text-2xl text-white"></i>
            </div>
            
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-white tracking-tight">Create Optional Tour</h3>
              <p class="text-emerald-100 text-sm mt-1">${destination?.name || "Destination"}</p>
            </div>
            <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6">
        <form id="createOptionalTourForm" class="space-y-6">
          <input type="hidden" name="destination_id" value="${destinationId}">
          
          <!-- ========================================= -->
          <!-- IMAGE UPLOAD SECTION - WITH FILE UPLOAD -->
          <!-- ========================================= -->
          <div class="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl border-2 border-purple-100">
            <h4 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i class="fas fa-image text-purple-500"></i>
              Tour Image
            </h4>
            
            <!-- Image Source Tabs -->
            <div class="flex border-b border-gray-200 mb-4">
              <button type="button" id="createUploadTabBtn" class="px-4 py-2 text-sm font-medium text-purple-600 border-b-2 border-purple-600">Upload File</button>
              <button type="button" id="createUrlTabBtn" class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Image URL</button>
            </div>
            
            <!-- Upload Method (Default) -->
            <div id="createUploadMethod" class="space-y-3">
              <div id="createImageUploadArea" 
                   class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-500 transition cursor-pointer relative">
                
                <!-- Hidden file input -->
                <input type="file" id="createImageFileInput" name="image_file" 
                       accept="image/png,image/jpeg,image/jpg,image/webp" 
                       class="hidden">
                
                <!-- Default Upload Icon -->
                <div id="createUploadPlaceholder" class="space-y-2">
                  <i class="fas fa-cloud-upload-alt text-3xl text-gray-400"></i>
                  <p class="text-sm text-gray-600">Click to select an image or drag and drop</p>
                  <p class="text-xs text-gray-400">PNG, JPG, WEBP up to 5MB</p>
                </div>
                
                <!-- Image Preview (hidden by default) -->
                <div id="createImagePreview" class="hidden space-y-3">
                  <img id="createPreviewImg" src="#" alt="Preview" class="max-h-40 mx-auto rounded-lg shadow-md">
                  <div class="flex items-center justify-center gap-2 text-sm">
                    <i class="fas fa-check-circle text-green-500"></i>
                    <span id="createFileName" class="font-medium text-gray-700"></span>
                    <span id="createFileSize" class="text-xs text-gray-500"></span>
                  </div>
                  <button type="button" onclick="clearCreateSelectedImage(event)" 
                          class="text-xs text-red-600 hover:text-red-800 bg-red-50 px-3 py-1 rounded-full">
                    <i class="fas fa-times mr-1"></i> Remove
                  </button>
                </div>
              </div>
            </div>
            
            <!-- URL Method (Hidden by Default) -->
            <div id="createUrlMethod" class="hidden space-y-3">
              <div class="border-2 border-gray-300 rounded-lg p-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                <input type="url" name="image_url" id="createImageUrlInput"
                       class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-sm"
                       placeholder="https://example.com/image.jpg">
                <p class="text-xs text-gray-500 mt-2">
                  <i class="fas fa-info-circle"></i>
                  Enter a publicly accessible image URL
                </p>
                
                <!-- URL Preview -->
                <div id="createUrlPreviewContainer" class="mt-3 hidden">
                  <img id="createUrlPreviewImg" src="#" alt="URL Preview" class="max-h-40 mx-auto rounded-lg shadow-md">
                </div>
              </div>
            </div>
          </div>
          
          <!-- ========================================= -->
          <!-- BASIC INFO -->
          <!-- ========================================= -->
          <div class="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border-2 border-gray-100">
            <h4 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i class="fas fa-info-circle text-emerald-500"></i>
              Tour Information
            </h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm font-semibold text-gray-600 mb-2">Tour Name <span class="text-red-500">*</span></label>
                <input type="text" name="tour_name" required
                       class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm"
                       placeholder="e.g., Island Hopping Tour, City Tour, etc.">
              </div>
              
              <div>
                <label class="block text-sm font-semibold text-gray-600 mb-2">Duration/Travel-Date (hours)</label>
                <input type="number" name="duration_hours" step="0.5" min="0.5"
                       class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm"
                       placeholder="e.g., 4">
              </div>
            </div>
          </div>
          
          <!-- ========================================= -->
          <!-- TOUR ITINERARY -->
          <!-- ========================================= -->
          <div class="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl border-2 border-indigo-100">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i class="fas fa-map-signs text-indigo-500"></i>
              Tour Itinerary (Schedule)
            </h4>
            <textarea name="itinerary" rows="6"
                      class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm"
                      placeholder="08:00 AM - Pick up from hotel&#10;09:00 AM - Visit attraction 1&#10;12:00 PM - Lunch at local restaurant&#10;02:00 PM - Visit attraction 2&#10;04:00 PM - Shopping time&#10;05:00 PM - Return to hotel"></textarea>
            <p class="text-xs text-gray-500 mt-1">One activity per line - this will be the tour's schedule</p>
          </div>
          
          <!-- ========================================= -->
          <!-- TOUR INCLUSIONS -->
          <!-- ========================================= -->
          <div class="bg-gradient-to-br from-green-50 to-white p-5 rounded-xl border-2 border-green-100">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i class="fas fa-check-circle text-green-500"></i>
              Tour Inclusions (What's included)
            </h4>
            <textarea name="inclusions" rows="5"
                      class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 text-sm"
                      placeholder="Hotel pick up and drop off&#10;Professional tour guide&#10;Entrance fees to attractions&#10;Bottled water and snacks&#10;Lunch at local restaurant"></textarea>
            <p class="text-xs text-gray-500 mt-1">One inclusion per line - what guests will get</p>
          </div>
          
          <!-- ========================================= -->
          <!-- TOUR EXCLUSIONS -->
          <!-- ========================================= -->
          <div class="bg-gradient-to-br from-red-50 to-white p-5 rounded-xl border-2 border-red-100">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i class="fas fa-times-circle text-red-500"></i>
              Tour Exclusions (What's NOT included)
            </h4>
            <textarea name="exclusions" rows="4"
                      class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 text-sm"
                      placeholder="Personal expenses&#10;Gratuities for guide&#10;Optional activities not mentioned&#10;Hotel pickup/drop-off (if not specified)"></textarea>
            <p class="text-xs text-gray-500 mt-1">One exclusion per line - what guests need to pay separately</p>
          </div>
          
          <!-- ========================================= -->
          <!-- TOUR RATES -->
          <!-- ========================================= -->
          <div class="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl border-2 border-purple-100">
            <h4 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i class="fas fa-tag text-purple-500"></i>
              Tour Rates (₱ per person)
            </h4>
            
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">Solo</label>
                <input type="number" name="rate_solo" step="0.01" min="0"
                       class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                       placeholder="0.00">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">2 Pax</label>
                <input type="number" name="rate_2pax" step="0.01" min="0"
                       class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                       placeholder="0.00">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">3 Pax</label>
                <input type="number" name="rate_3pax" step="0.01" min="0"
                       class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                       placeholder="0.00">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">4 Pax</label>
                <input type="number" name="rate_4pax" step="0.01" min="0"
                       class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                       placeholder="0.00">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">5 Pax</label>
                <input type="number" name="rate_5pax" step="0.01" min="0"
                       class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                       placeholder="0.00">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">6 Pax</label>
                <input type="number" name="rate_6pax" step="0.01" min="0"
                       class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                       placeholder="0.00">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">7 Pax</label>
                <input type="number" name="rate_7pax" step="0.01" min="0"
                       class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                       placeholder="0.00">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">8 Pax</label>
                <input type="number" name="rate_8pax" step="0.01" min="0"
                       class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                       placeholder="0.00">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">9 Pax</label>
                <input type="number" name="rate_9pax" step="0.01" min="0"
                       class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                       placeholder="0.00">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">10 Pax</label>
                <input type="number" name="rate_10pax" step="0.01" min="0"
                       class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                       placeholder="0.00">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">11 Pax</label>
                <input type="number" name="rate_11pax" step="0.01" min="0"
                       class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                       placeholder="0.00">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">12 Pax</label>
                <input type="number" name="rate_12pax" step="0.01" min="0"
                       class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                       placeholder="0.00">
              </div>
              <div class="col-span-2 md:col-span-3 lg:col-span-4">
                <label class="block text-xs font-semibold text-gray-600 mb-1">Child Rate (4-9 years)</label>
                <input type="number" name="rate_child_4_9" step="0.01" min="0"
                       class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                       placeholder="0.00">
              </div>
            </div>
          </div>
          
          <!-- ========================================= -->
          <!-- ACTION BUTTONS -->
          <!-- ========================================= -->
          <div class="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
            <button type="button" onclick="this.closest('.fixed').remove()"
                    class="px-5 py-2.5 border-2 border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit"
                    class="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-sm hover:from-emerald-700 hover:to-teal-700">
              Create Optional Tour
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // =====================================================
  // IMAGE UPLOAD/URL TAB FUNCTIONALITY
  // =====================================================
  const uploadTabBtn = document.getElementById("createUploadTabBtn");
  const urlTabBtn = document.getElementById("createUrlTabBtn");
  const uploadMethod = document.getElementById("createUploadMethod");
  const urlMethod = document.getElementById("createUrlMethod");
  const urlInput = document.getElementById("createImageUrlInput");
  const urlPreviewContainer = document.getElementById(
    "createUrlPreviewContainer",
  );
  const urlPreviewImg = document.getElementById("createUrlPreviewImg");
  const fileInput = document.getElementById("createImageFileInput");

  if (uploadTabBtn && urlTabBtn) {
    uploadTabBtn.addEventListener("click", () => {
      uploadTabBtn.classList.add(
        "text-purple-600",
        "border-b-2",
        "border-purple-600",
      );
      uploadTabBtn.classList.remove("text-gray-500");
      urlTabBtn.classList.remove(
        "text-purple-600",
        "border-b-2",
        "border-purple-600",
      );
      urlTabBtn.classList.add("text-gray-500");

      if (uploadMethod) uploadMethod.classList.remove("hidden");
      if (urlMethod) urlMethod.classList.add("hidden");

      if (urlInput) {
        urlInput.disabled = true;
        urlInput.required = false;
      }
      if (fileInput) fileInput.disabled = false;
    });

    urlTabBtn.addEventListener("click", () => {
      urlTabBtn.classList.add(
        "text-purple-600",
        "border-b-2",
        "border-purple-600",
      );
      urlTabBtn.classList.remove("text-gray-500");
      uploadTabBtn.classList.remove(
        "text-purple-600",
        "border-b-2",
        "border-purple-600",
      );
      uploadTabBtn.classList.add("text-gray-500");

      if (urlMethod) urlMethod.classList.remove("hidden");
      if (uploadMethod) uploadMethod.classList.add("hidden");

      if (urlInput) {
        urlInput.disabled = false;
        urlInput.required = false;
      }
      if (fileInput) {
        fileInput.disabled = true;
        fileInput.value = "";
        clearCreateSelectedImage();
      }
    });
  }

  // URL preview on input
  if (urlInput) {
    urlInput.addEventListener("input", function () {
      const url = this.value.trim();
      if (url && urlPreviewContainer && urlPreviewImg) {
        urlPreviewImg.src = url;
        urlPreviewContainer.classList.remove("hidden");

        urlPreviewImg.onerror = function () {
          urlPreviewContainer.classList.add("hidden");
          showToast("Invalid image URL or image cannot be loaded", "warning");
        };

        urlPreviewImg.onload = function () {
          urlPreviewContainer.classList.remove("hidden");
        };
      } else if (urlPreviewContainer) {
        urlPreviewContainer.classList.add("hidden");
      }
    });
  }

  // =====================================================
  // IMAGE PREVIEW FUNCTIONALITY
  // =====================================================
  const uploadArea = document.getElementById("createImageUploadArea");
  const uploadPlaceholder = document.getElementById("createUploadPlaceholder");
  const imagePreview = document.getElementById("createImagePreview");
  const previewImg = document.getElementById("createPreviewImg");
  const fileName = document.getElementById("createFileName");
  const fileSize = document.getElementById("createFileSize");

  window.clearCreateSelectedImage = function (event) {
    if (event) event.stopPropagation();

    if (fileInput) fileInput.value = "";
    if (uploadPlaceholder) uploadPlaceholder.classList.remove("hidden");
    if (imagePreview) imagePreview.classList.add("hidden");
    if (previewImg) previewImg.src = "#";
    if (uploadArea)
      uploadArea.classList.remove("border-purple-500", "bg-purple-50");

    if (urlInput) urlInput.value = "";
    if (urlPreviewContainer) urlPreviewContainer.classList.add("hidden");
  };

  if (uploadArea && fileInput) {
    uploadArea.addEventListener("click", function (e) {
      if (e.target.closest("button")) return;
      fileInput.click();
    });

    fileInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        const validTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
        ];
        if (!validTypes.includes(file.type)) {
          showToast(
            "Please select a valid image file (PNG, JPG, JPEG, WEBP)",
            "error",
          );
          fileInput.value = "";
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          showToast("File size must be less than 5MB", "error");
          fileInput.value = "";
          return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
          if (previewImg) previewImg.src = e.target.result;
          if (uploadPlaceholder) uploadPlaceholder.classList.add("hidden");
          if (imagePreview) imagePreview.classList.remove("hidden");

          const fileSizeKB = (file.size / 1024).toFixed(1);
          const fileSizeDisplay =
            fileSizeKB > 1024
              ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
              : `${fileSizeKB} KB`;

          if (fileName) fileName.textContent = file.name;
          if (fileSize) fileSize.textContent = `(${fileSizeDisplay})`;

          showToast(`✅ Image selected: ${file.name}`, "success");
        };
        reader.readAsDataURL(file);
      }
    });

    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.classList.add("border-purple-500", "bg-purple-50");
    });

    uploadArea.addEventListener("dragleave", () => {
      uploadArea.classList.remove("border-purple-500", "bg-purple-50");
    });

    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.classList.remove("border-purple-500", "bg-purple-50");

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        fileInput.files = e.dataTransfer.files;
        const event = new Event("change", { bubbles: true });
        fileInput.dispatchEvent(event);
      } else {
        showToast("Please drop an image file", "error");
      }
    });
  }

  // =====================================================
  // FORM SUBMIT HANDLER
  // =====================================================
  const form = document.getElementById("createOptionalTourForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    showLoading(true, "Creating tour...");

    try {
      const formData = new FormData(form);

      // Determine which image method is active
      const useUrl = urlMethod && !urlMethod.classList.contains("hidden");
      const imageFile = !useUrl && fileInput ? fileInput.files[0] : null;
      const imageUrl = useUrl && urlInput ? urlInput.value.trim() : null;

      // Validate that at least one image method is provided
      if (!useUrl && !imageFile) {
        showToast("Please select an image or provide an image URL", "warning");
        showLoading(false);
        return;
      }

      let finalImageUrl = null;

      // Handle image upload if file is provided
      if (imageFile) {
        try {
          // Create a temporary ID for the upload (will be replaced after creation)
          const tempId = Date.now();
          const fileName = `optional-tours/temp-${tempId}-${imageFile.name}`;

          const { error: uploadError } = await supabase.storage
            .from("tour-images")
            .upload(fileName, imageFile, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("tour-images").getPublicUrl(fileName);

          finalImageUrl = publicUrl;
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          showToast(
            "⚠️ Image upload failed. Tour will be created without image.",
            "warning",
          );
        }
      } else if (useUrl && imageUrl) {
        finalImageUrl = imageUrl;
      }

      const tourData = {
        destination_id: formData.get("destination_id"),
        tour_name: formData.get("tour_name"),
        duration_hours: formData.get("duration_hours"),
        image_url: finalImageUrl,
        itinerary: formData.get("itinerary"),
        inclusions: formData.get("inclusions"),
        exclusions: formData.get("exclusions"),
        rate_solo: formData.get("rate_solo"),
        rate_2pax: formData.get("rate_2pax"),
        rate_3pax: formData.get("rate_3pax"),
        rate_4pax: formData.get("rate_4pax"),
        rate_5pax: formData.get("rate_5pax"),
        rate_6pax: formData.get("rate_6pax"),
        rate_7pax: formData.get("rate_7pax"),
        rate_8pax: formData.get("rate_8pax"),
        rate_9pax: formData.get("rate_9pax"),
        rate_10pax: formData.get("rate_10pax"),
        rate_11pax: formData.get("rate_11pax"),
        rate_12pax: formData.get("rate_12pax"),
        rate_child_4_9: formData.get("rate_child_4_9"),
      };

      console.log("📤 Creating tour with data:", tourData);

      const result = await createOptionalTour(tourData);

      if (result) {
        modal.remove();
        showToast("✅ Optional tour created successfully!", "success");
        await refreshDestinationsPage();
      }
    } catch (error) {
      console.error("Error creating tour:", error);
      showToast("❌ Failed to create tour: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  });
}
// =====================================================
// COMPLETELY REWRITTEN EDIT OPTIONAL TOUR MODAL
// WITH MANUAL RATE FETCHING
// =====================================================

export async function openEditOptionalTourModal(tourId) {
  try {
    showLoading(true, "Loading tour data...");

    // Fetch tour basic info first
    const { data: tour, error: tourError } = await supabase
      .from("optional_tours")
      .select("*")
      .eq("id", tourId)
      .single();

    if (tourError || !tour) {
      console.error("Error fetching tour:", tourError);
      showToast("Tour not found", "error");
      showLoading(false);
      return;
    }

    // Then fetch rates separately
    const { data: rates, error: ratesError } = await supabase
      .from("optional_tour_rates")
      .select("*")
      .eq("tour_id", tourId)
      .maybeSingle();

    if (ratesError) {
      console.error("Error fetching rates:", ratesError);
    }

    console.log("📦 Tour data:", tour);
    console.log("💰 Rates data:", rates);

    const destination = state.destinations.find(
      (d) => d.id === tour.destination_id,
    );

    showLoading(false);

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto";

    // Get rates object - THIS WILL NOW HAVE DATA
    const rateData = rates || {};

    // Log each rate value to verify
    console.log("📊 Solo rate:", rateData.rate_solo);
    console.log("📊 2Pax rate:", rateData.rate_2pax);
    console.log("📊 Child rate:", rateData.rate_child_4_9);

    // Format itinerary, inclusions, exclusions properly
    const itineraryText = Array.isArray(tour.itinerary)
      ? tour.itinerary.join("\n")
      : tour.itinerary || "";
    const inclusionsText = Array.isArray(tour.inclusions)
      ? tour.inclusions.join("\n")
      : tour.inclusions || "";
    const exclusionsText = Array.isArray(tour.exclusions)
      ? tour.exclusions.join("\n")
      : tour.exclusions || "";

    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl transform transition-all flex flex-col" style="max-height: 90vh;">
        <!-- Fixed Header -->
        <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 flex-shrink-0">
          <div class="absolute inset-0 bg-black/10"></div>
          <div class="relative px-6 py-5">
            <div class="flex items-center gap-4">
              <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/30">
                <i class="fas fa-edit text-2xl text-white"></i>
              </div>
              <div class="flex-1">
                <h3 class="text-2xl font-bold text-white tracking-tight">Edit Optional Tour</h3>
                <p class="text-amber-100 text-sm mt-1">${tour.tour_name}</p>
              </div>
              <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
            </div>
          </div>
        </div>
      
        <div class="flex-1 overflow-y-auto p-6">
          <form id="editOptionalTourForm" class="space-y-6">
            <input type="hidden" name="tour_id" value="${tour.id}">
            
            <!-- ========================================= -->
            <!-- IMAGE UPLOAD SECTION -->
            <!-- ========================================= -->
            <div class="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl border-2 border-purple-100">
              <h4 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i class="fas fa-image text-purple-500"></i>
                Tour Image
              </h4>
              
              <!-- Image Source Tabs -->
              <div class="flex border-b border-gray-200 mb-4">
                <button type="button" id="editUploadTabBtn" class="px-4 py-2 text-sm font-medium text-purple-600 border-b-2 border-purple-600">Upload File</button>
                <button type="button" id="editUrlTabBtn" class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Image URL</button>
              </div>
              
              <!-- Upload Method -->
              <div id="editUploadMethod" class="space-y-3">
                <div id="editImageUploadArea" 
                     class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-500 transition cursor-pointer relative">
                  
                  <input type="file" id="editImageFileInput" name="image_file" 
                         accept="image/png,image/jpeg,image/jpg,image/webp" 
                         class="hidden">
                  
                  <div id="editUploadPlaceholder" class="space-y-2 ${tour.image_url ? "hidden" : ""}">
                    <i class="fas fa-cloud-upload-alt text-3xl text-gray-400"></i>
                    <p class="text-sm text-gray-600">Click to select an image or drag and drop</p>
                    <p class="text-xs text-gray-400">PNG, JPG, WEBP up to 5MB</p>
                  </div>
                  
                  <div id="editImagePreview" class="space-y-3 ${tour.image_url ? "" : "hidden"}">
                    <img id="editPreviewImg" src="${tour.image_url || "#"}" alt="Preview" class="max-h-40 mx-auto rounded-lg shadow-md">
                    <div class="flex items-center justify-center gap-2 text-sm">
                      <i class="fas fa-check-circle text-green-500"></i>
                      <span id="editFileName" class="font-medium text-gray-700">${tour.image_url ? "Current image" : ""}</span>
                    </div>
                    <button type="button" onclick="clearEditSelectedImage(event)" 
                            class="text-xs text-red-600 hover:text-red-800 bg-red-50 px-3 py-1 rounded-full">
                      <i class="fas fa-times mr-1"></i> Remove
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- URL Method -->
              <div id="editUrlMethod" class="space-y-3 hidden">
                <div class="border-2 border-gray-300 rounded-lg p-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                  <input type="url" name="image_url" id="editImageUrlInput" value="${tour.image_url || ""}"
                         class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-sm"
                         placeholder="https://example.com/image.jpg">
                  <p class="text-xs text-gray-500 mt-2">
                    <i class="fas fa-info-circle"></i>
                    Enter a publicly accessible image URL
                  </p>
                  
                  <div id="editUrlPreviewContainer" class="mt-3 ${tour.image_url ? "" : "hidden"}">
                    <img id="editUrlPreviewImg" src="${tour.image_url || "#"}" alt="URL Preview" class="max-h-40 mx-auto rounded-lg shadow-md">
                  </div>
                </div>
              </div>
            </div>
            
            <!-- ========================================= -->
            <!-- BASIC INFO -->
            <!-- ========================================= -->
            <div class="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border-2 border-gray-100">
              <h4 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i class="fas fa-info-circle text-amber-500"></i>
                Tour Information
              </h4>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                  <label class="block text-sm font-semibold text-gray-600 mb-2">
                    Tour Name <span class="text-red-500">*</span>
                  </label>
                  <input type="text" name="tour_name" value="${tour.tour_name.replace(/"/g, "&quot;")}" required
                         class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm">
                </div>
                
                <div>
                  <label class="block text-sm font-semibold text-gray-600 mb-2">
                    Duration/Travel-Date (hours)
                  </label>
                  <input type="number" name="duration_hours" value="${tour.duration_hours || ""}" step="0.5" min="0"
                         class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm">
                </div>
              </div>
            </div>
            
            <!-- ========================================= -->
            <!-- TOUR ITINERARY -->
            <!-- ========================================= -->
            <div class="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl border-2 border-indigo-100">
              <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i class="fas fa-map-signs text-indigo-500"></i>
                Tour Itinerary (Schedule)
              </h4>
              <textarea name="itinerary" rows="6"
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm">${itineraryText}</textarea>
              <p class="text-xs text-gray-500 mt-1">One activity per line</p>
            </div>
            
            <!-- ========================================= -->
            <!-- TOUR INCLUSIONS -->
            <!-- ========================================= -->
            <div class="bg-gradient-to-br from-green-50 to-white p-5 rounded-xl border-2 border-green-100">
              <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i class="fas fa-check-circle text-green-500"></i>
                Tour Inclusions (What's included)
              </h4>
              <textarea name="inclusions" rows="5"
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 text-sm">${inclusionsText}</textarea>
              <p class="text-xs text-gray-500 mt-1">One inclusion per line</p>
            </div>
            
            <!-- ========================================= -->
            <!-- TOUR EXCLUSIONS -->
            <!-- ========================================= -->
            <div class="bg-gradient-to-br from-red-50 to-white p-5 rounded-xl border-2 border-red-100">
              <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i class="fas fa-times-circle text-red-500"></i>
                Tour Exclusions (What's NOT included)
              </h4>
              <textarea name="exclusions" rows="4"
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 text-sm">${exclusionsText}</textarea>
              <p class="text-xs text-gray-500 mt-1">One exclusion per line</p>
            </div>
            
            <!-- ========================================= -->
            <!-- TOUR RATES - DIRECT VALUE INSERTION -->
            <!-- ========================================= -->
            <div class="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl border-2 border-purple-100">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <i class="fas fa-tag text-purple-500"></i>
                  Tour Rates (₱ per person)
                </h4>
                <label class="flex items-center gap-2 text-sm bg-white px-3 py-1.5 rounded-lg border-2 border-purple-200">
                  <input type="checkbox" name="update_rates" value="true" checked class="h-4 w-4 text-purple-600 rounded">
                  <span>Update Rates</span>
                </label>
              </div>
              
              <!-- Current Rates Display Summary -->
              <div class="mb-4 p-4 bg-purple-100 rounded-lg border-2 border-purple-300">
                <p class="text-sm font-bold text-purple-800 mb-3 flex items-center gap-2">
                  <i class="fas fa-info-circle"></i>
                  Current Rates:
                </p>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  ${
                    rateData.rate_solo
                      ? `
                    <div class="bg-white p-2 rounded-lg border border-purple-200">
                      <span class="text-xs text-gray-500 block">Solo</span>
                      <span class="font-bold text-purple-700">₱${parseFloat(rateData.rate_solo).toLocaleString()}</span>
                    </div>
                  `
                      : ""
                  }
                  ${
                    rateData.rate_2pax
                      ? `
                    <div class="bg-white p-2 rounded-lg border border-purple-200">
                      <span class="text-xs text-gray-500 block">2 Pax</span>
                      <span class="font-bold text-purple-700">₱${parseFloat(rateData.rate_2pax).toLocaleString()}</span>
                    </div>
                  `
                      : ""
                  }
                  ${
                    rateData.rate_3pax
                      ? `
                    <div class="bg-white p-2 rounded-lg border border-purple-200">
                      <span class="text-xs text-gray-500 block">3 Pax</span>
                      <span class="font-bold text-purple-700">₱${parseFloat(rateData.rate_3pax).toLocaleString()}</span>
                    </div>
                  `
                      : ""
                  }
                  ${
                    rateData.rate_4pax
                      ? `
                    <div class="bg-white p-2 rounded-lg border border-purple-200">
                      <span class="text-xs text-gray-500 block">4 Pax</span>
                      <span class="font-bold text-purple-700">₱${parseFloat(rateData.rate_4pax).toLocaleString()}</span>
                    </div>
                  `
                      : ""
                  }
                  ${
                    rateData.rate_5pax
                      ? `
                    <div class="bg-white p-2 rounded-lg border border-purple-200">
                      <span class="text-xs text-gray-500 block">5 Pax</span>
                      <span class="font-bold text-purple-700">₱${parseFloat(rateData.rate_5pax).toLocaleString()}</span>
                    </div>
                  `
                      : ""
                  }
                  ${
                    rateData.rate_6pax
                      ? `
                    <div class="bg-white p-2 rounded-lg border border-purple-200">
                      <span class="text-xs text-gray-500 block">6 Pax</span>
                      <span class="font-bold text-purple-700">₱${parseFloat(rateData.rate_6pax).toLocaleString()}</span>
                    </div>
                  `
                      : ""
                  }
                  ${
                    rateData.rate_7pax
                      ? `
                    <div class="bg-white p-2 rounded-lg border border-purple-200">
                      <span class="text-xs text-gray-500 block">7 Pax</span>
                      <span class="font-bold text-purple-700">₱${parseFloat(rateData.rate_7pax).toLocaleString()}</span>
                    </div>
                  `
                      : ""
                  }
                  ${
                    rateData.rate_8pax
                      ? `
                    <div class="bg-white p-2 rounded-lg border border-purple-200">
                      <span class="text-xs text-gray-500 block">8 Pax</span>
                      <span class="font-bold text-purple-700">₱${parseFloat(rateData.rate_8pax).toLocaleString()}</span>
                    </div>
                  `
                      : ""
                  }
                  ${
                    rateData.rate_9pax
                      ? `
                    <div class="bg-white p-2 rounded-lg border border-purple-200">
                      <span class="text-xs text-gray-500 block">9 Pax</span>
                      <span class="font-bold text-purple-700">₱${parseFloat(rateData.rate_9pax).toLocaleString()}</span>
                    </div>
                  `
                      : ""
                  }
                  ${
                    rateData.rate_10pax
                      ? `
                    <div class="bg-white p-2 rounded-lg border border-purple-200">
                      <span class="text-xs text-gray-500 block">10 Pax</span>
                      <span class="font-bold text-purple-700">₱${parseFloat(rateData.rate_10pax).toLocaleString()}</span>
                    </div>
                  `
                      : ""
                  }
                  ${
                    rateData.rate_11pax
                      ? `
                    <div class="bg-white p-2 rounded-lg border border-purple-200">
                      <span class="text-xs text-gray-500 block">11 Pax</span>
                      <span class="font-bold text-purple-700">₱${parseFloat(rateData.rate_11pax).toLocaleString()}</span>
                    </div>
                  `
                      : ""
                  }
                  ${
                    rateData.rate_12pax
                      ? `
                    <div class="bg-white p-2 rounded-lg border border-purple-200">
                      <span class="text-xs text-gray-500 block">12 Pax</span>
                      <span class="font-bold text-purple-700">₱${parseFloat(rateData.rate_12pax).toLocaleString()}</span>
                    </div>
                  `
                      : ""
                  }
                  ${
                    rateData.rate_child_4_9
                      ? `
                    <div class="bg-white p-2 rounded-lg border border-purple-200">
                      <span class="text-xs text-gray-500 block">Child (4-9)</span>
                      <span class="font-bold text-purple-700">₱${parseFloat(rateData.rate_child_4_9).toLocaleString()}</span>
                    </div>
                  `
                      : ""
                  }
                </div>
                ${Object.values(rateData).every((v) => !v) ? '<p class="text-gray-500 italic text-sm">No rates currently set</p>' : ""}
              </div>
              
              <p class="text-sm font-semibold text-gray-700 mb-3">Update Rates:</p>
              
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">Solo</label>
                  <input type="number" name="rate_solo" value="${rateData.rate_solo || ""}" step="0.01" min="0"
                         class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                         placeholder="0.00">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">2 Pax</label>
                  <input type="number" name="rate_2pax" value="${rateData.rate_2pax || ""}" step="0.01" min="0"
                         class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                         placeholder="0.00">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">3 Pax</label>
                  <input type="number" name="rate_3pax" value="${rateData.rate_3pax || ""}" step="0.01" min="0"
                         class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                         placeholder="0.00">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">4 Pax</label>
                  <input type="number" name="rate_4pax" value="${rateData.rate_4pax || ""}" step="0.01" min="0"
                         class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                         placeholder="0.00">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">5 Pax</label>
                  <input type="number" name="rate_5pax" value="${rateData.rate_5pax || ""}" step="0.01" min="0"
                         class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                         placeholder="0.00">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">6 Pax</label>
                  <input type="number" name="rate_6pax" value="${rateData.rate_6pax || ""}" step="0.01" min="0"
                         class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                         placeholder="0.00">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">7 Pax</label>
                  <input type="number" name="rate_7pax" value="${rateData.rate_7pax || ""}" step="0.01" min="0"
                         class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                         placeholder="0.00">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">8 Pax</label>
                  <input type="number" name="rate_8pax" value="${rateData.rate_8pax || ""}" step="0.01" min="0"
                         class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                         placeholder="0.00">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">9 Pax</label>
                  <input type="number" name="rate_9pax" value="${rateData.rate_9pax || ""}" step="0.01" min="0"
                         class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                         placeholder="0.00">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">10 Pax</label>
                  <input type="number" name="rate_10pax" value="${rateData.rate_10pax || ""}" step="0.01" min="0"
                         class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                         placeholder="0.00">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">11 Pax</label>
                  <input type="number" name="rate_11pax" value="${rateData.rate_11pax || ""}" step="0.01" min="0"
                         class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                         placeholder="0.00">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">12 Pax</label>
                  <input type="number" name="rate_12pax" value="${rateData.rate_12pax || ""}" step="0.01" min="0"
                         class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                         placeholder="0.00">
                </div>
                <div class="col-span-2 md:col-span-3 lg:col-span-4">
                  <label class="block text-xs font-semibold text-gray-600 mb-1">Child Rate (4-9 years)</label>
                  <input type="number" name="rate_child_4_9" value="${rateData.rate_child_4_9 || ""}" step="0.01" min="0"
                         class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                         placeholder="0.00">
                </div>
              </div>
            </div>
            
            <!-- ========================================= -->
            <!-- STATUS -->
            <!-- ========================================= -->
            <div class="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border-2 border-gray-100">
              <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i class="fas fa-power-off text-gray-500"></i>
                Status
              </h4>
              <div class="flex items-center gap-4">
                <label class="flex items-center gap-2">
                  <input type="radio" name="is_active" value="true" ${tour.is_active ? "checked" : ""} class="h-4 w-4 text-emerald-600">
                  <span class="text-sm">Active</span>
                </label>
                <label class="flex items-center gap-2">
                  <input type="radio" name="is_active" value="false" ${!tour.is_active ? "checked" : ""} class="h-4 w-4 text-red-600">
                  <span class="text-sm">Inactive</span>
                </label>
              </div>
            </div>
            
            <!-- ========================================= -->
            <!-- ACTION BUTTONS -->
            <!-- ========================================= -->
            <div class="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
              <button type="button" onclick="this.closest('.fixed').remove()"
                      class="px-5 py-2.5 border-2 border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-all">
                <i class="fas fa-times mr-2"></i> Cancel
              </button>
              <button type="submit"
                      class="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg text-sm hover:from-amber-700 hover:to-orange-700 transition-all shadow-lg shadow-amber-200 flex items-center gap-2">
                <i class="fas fa-save"></i>
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // =====================================================
    // IMAGE UPLOAD/URL TAB FUNCTIONALITY
    // =====================================================
    const uploadTabBtn = document.getElementById("editUploadTabBtn");
    const urlTabBtn = document.getElementById("editUrlTabBtn");
    const uploadMethod = document.getElementById("editUploadMethod");
    const urlMethod = document.getElementById("editUrlMethod");
    const urlInput = document.getElementById("editImageUrlInput");
    const urlPreviewContainer = document.getElementById(
      "editUrlPreviewContainer",
    );
    const urlPreviewImg = document.getElementById("editUrlPreviewImg");
    const fileInput = document.getElementById("editImageFileInput");

    if (uploadTabBtn && urlTabBtn) {
      uploadTabBtn.addEventListener("click", () => {
        uploadTabBtn.classList.add(
          "text-purple-600",
          "border-b-2",
          "border-purple-600",
        );
        uploadTabBtn.classList.remove("text-gray-500");
        urlTabBtn.classList.remove(
          "text-purple-600",
          "border-b-2",
          "border-purple-600",
        );
        urlTabBtn.classList.add("text-gray-500");

        if (uploadMethod) uploadMethod.classList.remove("hidden");
        if (urlMethod) urlMethod.classList.add("hidden");

        if (urlInput) {
          urlInput.disabled = true;
          urlInput.required = false;
        }
        if (fileInput) fileInput.disabled = false;
      });

      urlTabBtn.addEventListener("click", () => {
        urlTabBtn.classList.add(
          "text-purple-600",
          "border-b-2",
          "border-purple-600",
        );
        urlTabBtn.classList.remove("text-gray-500");
        uploadTabBtn.classList.remove(
          "text-purple-600",
          "border-b-2",
          "border-purple-600",
        );
        uploadTabBtn.classList.add("text-gray-500");

        if (urlMethod) urlMethod.classList.remove("hidden");
        if (uploadMethod) uploadMethod.classList.add("hidden");

        if (urlInput) {
          urlInput.disabled = false;
          urlInput.required = false;
        }
        if (fileInput) {
          fileInput.disabled = true;
        }
      });
    }

    // URL preview on input
    if (urlInput) {
      urlInput.addEventListener("input", function () {
        const url = this.value.trim();
        if (url && urlPreviewContainer && urlPreviewImg) {
          urlPreviewImg.src = url;
          urlPreviewContainer.classList.remove("hidden");

          urlPreviewImg.onerror = function () {
            urlPreviewContainer.classList.add("hidden");
            showToast("Invalid image URL or image cannot be loaded", "warning");
          };

          urlPreviewImg.onload = function () {
            urlPreviewContainer.classList.remove("hidden");
          };
        } else if (urlPreviewContainer) {
          urlPreviewContainer.classList.add("hidden");
        }
      });
    }

    // =====================================================
    // IMAGE PREVIEW FUNCTIONALITY
    // =====================================================
    const uploadArea = document.getElementById("editImageUploadArea");
    const uploadPlaceholder = document.getElementById("editUploadPlaceholder");
    const imagePreview = document.getElementById("editImagePreview");
    const previewImg = document.getElementById("editPreviewImg");
    const fileName = document.getElementById("editFileName");

    window.clearEditSelectedImage = function (event) {
      if (event) event.stopPropagation();

      if (fileInput) fileInput.value = "";
      if (uploadPlaceholder) uploadPlaceholder.classList.remove("hidden");
      if (imagePreview) imagePreview.classList.add("hidden");
      if (previewImg) previewImg.src = "#";
      if (uploadArea)
        uploadArea.classList.remove("border-purple-500", "bg-purple-50");

      if (urlInput) urlInput.value = "";
      if (urlPreviewContainer) urlPreviewContainer.classList.add("hidden");
    };

    if (uploadArea && fileInput) {
      uploadArea.addEventListener("click", function (e) {
        if (e.target.closest("button")) return;
        fileInput.click();
      });

      fileInput.addEventListener("change", function (e) {
        const file = e.target.files[0];
        if (file) {
          const validTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
          ];
          if (!validTypes.includes(file.type)) {
            showToast(
              "Please select a valid image file (PNG, JPG, JPEG, WEBP)",
              "error",
            );
            fileInput.value = "";
            return;
          }

          if (file.size > 5 * 1024 * 1024) {
            showToast("File size must be less than 5MB", "error");
            fileInput.value = "";
            return;
          }

          const reader = new FileReader();
          reader.onload = function (e) {
            if (previewImg) previewImg.src = e.target.result;
            if (uploadPlaceholder) uploadPlaceholder.classList.add("hidden");
            if (imagePreview) imagePreview.classList.remove("hidden");

            const fileSizeKB = (file.size / 1024).toFixed(1);
            const fileSizeDisplay =
              fileSizeKB > 1024
                ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                : `${fileSizeKB} KB`;

            if (fileName)
              fileName.textContent = `${file.name} (${fileSizeDisplay})`;

            showToast(`✅ Image selected: ${file.name}`, "success");
          };
          reader.readAsDataURL(file);
        }
      });

      uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadArea.classList.add("border-purple-500", "bg-purple-50");
      });

      uploadArea.addEventListener("dragleave", () => {
        uploadArea.classList.remove("border-purple-500", "bg-purple-50");
      });

      uploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadArea.classList.remove("border-purple-500", "bg-purple-50");

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
          fileInput.files = e.dataTransfer.files;
          const event = new Event("change", { bubbles: true });
          fileInput.dispatchEvent(event);
        } else {
          showToast("Please drop an image file", "error");
        }
      });
    }

    // =====================================================
    // FORM SUBMIT HANDLER
    // =====================================================
    const form = document.getElementById("editOptionalTourForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      showLoading(true, "Updating tour...");

      try {
        const formData = new FormData(form);

        // Determine which image method is active
        const useUrl = urlMethod && !urlMethod.classList.contains("hidden");
        const imageFile = !useUrl && fileInput ? fileInput.files[0] : null;
        const imageUrl = useUrl && urlInput ? urlInput.value.trim() : null;

        let finalImageUrl = tour.image_url; // Keep existing by default

        // Handle image upload if file is provided
        if (imageFile) {
          try {
            const fileExt = imageFile.name.split(".").pop();
            const fileName = `optional-tours/${tour.id}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from("destination-images")
              .upload(fileName, imageFile, {
                cacheControl: "3600",
                upsert: false,
              });

            if (uploadError) {
              console.error("Upload error:", uploadError);
              showToast(
                "⚠️ Image upload failed. Using existing image.",
                "warning",
              );
            } else {
              const {
                data: { publicUrl },
              } = supabase.storage
                .from("destination-images")
                .getPublicUrl(fileName);

              finalImageUrl = publicUrl;
              console.log("✅ Image uploaded:", publicUrl);
            }
          } catch (uploadError) {
            console.error("Image upload failed:", uploadError);
            showToast(
              "⚠️ Image upload failed. Using existing image.",
              "warning",
            );
          }
        } else if (useUrl && imageUrl) {
          finalImageUrl = imageUrl;
        }

        // Build rate data object with explicit field mapping
        const rateData = {};

        const soloValue = formData.get("rate_solo");
        if (soloValue && soloValue.trim() !== "") {
          rateData.rate_solo = parseFloat(soloValue);
        }

        const pax2Value = formData.get("rate_2pax");
        if (pax2Value && pax2Value.trim() !== "") {
          rateData.rate_2pax = parseFloat(pax2Value);
        }

        const pax3Value = formData.get("rate_3pax");
        if (pax3Value && pax3Value.trim() !== "") {
          rateData.rate_3pax = parseFloat(pax3Value);
        }

        const pax4Value = formData.get("rate_4pax");
        if (pax4Value && pax4Value.trim() !== "") {
          rateData.rate_4pax = parseFloat(pax4Value);
        }

        const pax5Value = formData.get("rate_5pax");
        if (pax5Value && pax5Value.trim() !== "") {
          rateData.rate_5pax = parseFloat(pax5Value);
        }

        const pax6Value = formData.get("rate_6pax");
        if (pax6Value && pax6Value.trim() !== "") {
          rateData.rate_6pax = parseFloat(pax6Value);
        }

        const pax7Value = formData.get("rate_7pax");
        if (pax7Value && pax7Value.trim() !== "") {
          rateData.rate_7pax = parseFloat(pax7Value);
        }

        const pax8Value = formData.get("rate_8pax");
        if (pax8Value && pax8Value.trim() !== "") {
          rateData.rate_8pax = parseFloat(pax8Value);
        }

        const pax9Value = formData.get("rate_9pax");
        if (pax9Value && pax9Value.trim() !== "") {
          rateData.rate_9pax = parseFloat(pax9Value);
        }

        const pax10Value = formData.get("rate_10pax");
        if (pax10Value && pax10Value.trim() !== "") {
          rateData.rate_10pax = parseFloat(pax10Value);
        }

        const pax11Value = formData.get("rate_11pax");
        if (pax11Value && pax11Value.trim() !== "") {
          rateData.rate_11pax = parseFloat(pax11Value);
        }

        const pax12Value = formData.get("rate_12pax");
        if (pax12Value && pax12Value.trim() !== "") {
          rateData.rate_12pax = parseFloat(pax12Value);
        }

        const childValue = formData.get("rate_child_4_9");
        if (childValue && childValue.trim() !== "") {
          rateData.rate_child_4_9 = parseFloat(childValue);
        }

        const hasRates = Object.keys(rateData).length > 0;

        // Prepare tour data
        const tourData = {
          tour_name: formData.get("tour_name"),
          duration_hours: formData.get("duration_hours")
            ? parseFloat(formData.get("duration_hours"))
            : null,
          image_url: finalImageUrl,
          itinerary: formData.get("itinerary"),
          inclusions: formData.get("inclusions"),
          exclusions: formData.get("exclusions"),
          is_active: formData.get("is_active") === "true",
          update_rates: formData.get("update_rates") === "true",
        };

        // Only add rate data if update_rates is checked
        if (tourData.update_rates) {
          if (hasRates) {
            // If there are new rates, update with them
            Object.assign(tourData, rateData);
          } else {
            // If update_rates is checked but no rates provided, set all to null (clear rates)
            const clearRates = {
              rate_solo: null,
              rate_2pax: null,
              rate_3pax: null,
              rate_4pax: null,
              rate_5pax: null,
              rate_6pax: null,
              rate_7pax: null,
              rate_8pax: null,
              rate_9pax: null,
              rate_10pax: null,
              rate_11pax: null,
              rate_12pax: null,
              rate_child_4_9: null,
            };
            Object.assign(tourData, clearRates);
          }
        }

        console.log("📤 Saving tour data:", tourData);

        const result = await updateOptionalTour(tour.id, tourData);

        if (result) {
          modal.remove();
          showToast("✅ Optional tour updated successfully!", "success");
          await refreshDestinationsPage();
        }
      } catch (error) {
        console.error("Error updating tour:", error);
        showToast("❌ Failed to update tour: " + error.message, "error");
      } finally {
        showLoading(false);
      }
    });
  } catch (error) {
    console.error("Error opening edit tour modal:", error);
    showToast("Failed to load tour data", "error");
    showLoading(false);
  }
}
export async function updateOptionalTour(id, tourData) {
  try {
    showLoading(true, "Updating optional tour...");

    // Parse itinerary from textarea (one per line)
    const itinerary = tourData.itinerary
      ? tourData.itinerary
          .split("\n")
          .map((i) => i.trim())
          .filter((i) => i)
      : [];

    // Parse inclusions from textarea (one per line)
    const inclusions = tourData.inclusions
      ? tourData.inclusions
          .split("\n")
          .map((i) => i.trim())
          .filter((i) => i)
      : [];

    // Parse exclusions from textarea (one per line)
    const exclusions = tourData.exclusions
      ? tourData.exclusions
          .split("\n")
          .map((i) => i.trim())
          .filter((i) => i)
      : [];

    // Update main tour info - ADD image_url
    const { error: tourError } = await supabase
      .from("optional_tours")
      .update({
        tour_name: tourData.tour_name,
        duration_hours: tourData.duration_hours,
        image_url: tourData.image_url || null, // ADD THIS LINE
        itinerary: itinerary,
        inclusions: inclusions,
        exclusions: exclusions,
        is_active: tourData.is_active === "true" || tourData.is_active === true,
        updated_at: new Date(),
      })
      .eq("id", id);
    if (tourError) throw tourError;

    // Update rates if requested (rest remains the same)
    if (tourData.update_rates === "true" || tourData.update_rates === true) {
      const { data: existingRates } = await supabase
        .from("optional_tour_rates")
        .select("id")
        .eq("tour_id", id)
        .maybeSingle();

      const rateData = {
        rate_solo: tourData.rate_solo ? parseFloat(tourData.rate_solo) : null,
        rate_2pax: tourData.rate_2pax ? parseFloat(tourData.rate_2pax) : null,
        rate_3pax: tourData.rate_3pax ? parseFloat(tourData.rate_3pax) : null,
        rate_4pax: tourData.rate_4pax ? parseFloat(tourData.rate_4pax) : null,
        rate_5pax: tourData.rate_5pax ? parseFloat(tourData.rate_5pax) : null,
        rate_6pax: tourData.rate_6pax ? parseFloat(tourData.rate_6pax) : null,
        rate_7pax: tourData.rate_7pax ? parseFloat(tourData.rate_7pax) : null,
        rate_8pax: tourData.rate_8pax ? parseFloat(tourData.rate_8pax) : null,
        rate_9pax: tourData.rate_9pax ? parseFloat(tourData.rate_9pax) : null,
        rate_10pax: tourData.rate_10pax
          ? parseFloat(tourData.rate_10pax)
          : null,
        rate_11pax: tourData.rate_11pax
          ? parseFloat(tourData.rate_11pax)
          : null,
        rate_12pax: tourData.rate_12pax
          ? parseFloat(tourData.rate_12pax)
          : null,
        rate_child_4_9: tourData.rate_child_4_9
          ? parseFloat(tourData.rate_child_4_9)
          : null,
      };

      if (existingRates) {
        const { error: ratesError } = await supabase
          .from("optional_tour_rates")
          .update({ ...rateData, updated_at: new Date() })
          .eq("tour_id", id);
        if (ratesError) throw ratesError;
      } else {
        const { error: ratesError } = await supabase
          .from("optional_tour_rates")
          .insert([{ tour_id: id, ...rateData }]);
        if (ratesError) throw ratesError;
      }
    }

    await fetchDestinations();
    showToast("✅ Optional tour updated successfully!", "success");
    return true;
  } catch (error) {
    console.error("Error updating optional tour:", error);
    showToast("❌ Failed to update optional tour: " + error.message, "error");
    return null;
  } finally {
    showLoading(false);
  }
}
export function openEditTourRatesModal(tourId) {
  // Find the tour
  let tour = null;
  for (const dest of state.destinations) {
    const found = dest.optional_tours?.find((t) => t.id === tourId);
    if (found) {
      tour = found;
      break;
    }
  }

  if (!tour) {
    showToast("Tour not found", "error");
    return;
  }

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-3xl w-full shadow-2xl transform transition-all">
      <!-- Fixed Header -->
      <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">
        <div class="absolute inset-0 bg-black/10"></div>
        <div class="relative px-6 py-5">
          <div class="flex items-center gap-4">
            <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/30">
              <i class="fas fa-tags text-2xl text-white"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-white tracking-tight">Edit Tour Rates</h3>
              <p class="text-indigo-100 text-sm mt-1">${tour.tour_name}</p>
            </div>
            <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
        </div>
      </div>
      
      <form id="editTourRatesForm" class="p-6 space-y-5 max-h-[calc(90vh-120px)] overflow-y-auto">
        <input type="hidden" name="tour_id" value="${tour.id}">
        
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Solo</label>
            <input type="number" name="rate_solo" value="${tour.rates?.[0]?.rate_solo || ""}" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">2 Pax</label>
            <input type="number" name="rate_2pax" value="${tour.rates?.[0]?.rate_2pax || ""}" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">3 Pax</label>
            <input type="number" name="rate_3pax" value="${tour.rates?.[0]?.rate_3pax || ""}" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">4 Pax</label>
            <input type="number" name="rate_4pax" value="${tour.rates?.[0]?.rate_4pax || ""}" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">5 Pax</label>
            <input type="number" name="rate_5pax" value="${tour.rates?.[0]?.rate_5pax || ""}" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">6 Pax</label>
            <input type="number" name="rate_6pax" value="${tour.rates?.[0]?.rate_6pax || ""}" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">7 Pax</label>
            <input type="number" name="rate_7pax" value="${tour.rates?.[0]?.rate_7pax || ""}" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">8 Pax</label>
            <input type="number" name="rate_8pax" value="${tour.rates?.[0]?.rate_8pax || ""}" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">9 Pax</label>
            <input type="number" name="rate_9pax" value="${tour.rates?.[0]?.rate_9pax || ""}" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">10 Pax</label>
            <input type="number" name="rate_10pax" value="${tour.rates?.[0]?.rate_10pax || ""}" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">11 Pax</label>
            <input type="number" name="rate_11pax" value="${tour.rates?.[0]?.rate_11pax || ""}" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">12 Pax</label>
            <input type="number" name="rate_12pax" value="${tour.rates?.[0]?.rate_12pax || ""}" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
          </div>
          <div class="col-span-2">
            <label class="block text-xs font-semibold text-gray-600 mb-1">Child (4-9 years)</label>
            <input type="number" name="rate_child_4_9" value="${tour.rates?.[0]?.rate_child_4_9 || ""}" step="0.01"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button type="button" onclick="this.closest('.fixed').remove()"
                  class="px-5 py-2.5 border-2 border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit"
                  class="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm hover:from-indigo-700 hover:to-purple-700">
            Save Rates
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const form = document.getElementById("editTourRatesForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    const rateData = {
      rate_solo: formData.get("rate_solo"),
      rate_2pax: formData.get("rate_2pax"),
      rate_3pax: formData.get("rate_3pax"),
      rate_4pax: formData.get("rate_4pax"),
      rate_5pax: formData.get("rate_5pax"),
      rate_6pax: formData.get("rate_6pax"),
      rate_7pax: formData.get("rate_7pax"),
      rate_8pax: formData.get("rate_8pax"),
      rate_9pax: formData.get("rate_9pax"),
      rate_10pax: formData.get("rate_10pax"),
      rate_11pax: formData.get("rate_11pax"),
      rate_12pax: formData.get("rate_12pax"),
      rate_child_4_9: formData.get("rate_child_4_9"),
    };

    await saveOptionalTourRates(tour.id, rateData);
    modal.remove();
  });
}

// KEEP this version
export async function fetchOptionalTourRates(tourId) {
  try {
    const { data, error } = await supabase
      .from("optional_tour_rates")
      .select("*")
      .eq("tour_id", tourId)
      .maybeSingle();

    if (error) throw error;
    return data || {};
  } catch (error) {
    console.error("Error fetching tour rates:", error);
    return {};
  }
}

// =====================================================
// VIEW OPTIONAL TOUR DETAILS MODAL
// =====================================================

export function viewOptionalTourDetails(tourId) {
  // Find the tour in state
  let tour = null;
  let destination = null;
  for (const dest of state.destinations) {
    const found = dest.optional_tours?.find((t) => t.id === tourId);
    if (found) {
      tour = found;
      destination = dest;
      break;
    }
  }

  if (!tour) {
    showToast("Tour not found", "error");
    return;
  }

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto";

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl transform transition-all flex flex-col" style="max-height: 90vh;">
      <!-- Fixed Header -->
      <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 flex-shrink-0">
        <div class="absolute inset-0 bg-black/10"></div>
        <div class="relative px-6 py-5">
          <div class="flex items-center gap-4">
            <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/30">
              <i class="fas fa-info-circle text-2xl text-white"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-white tracking-tight">${tour.tour_name}</h3>
              <p class="text-indigo-100 text-sm mt-1">${destination?.name || "Unknown Destination"}</p>
            </div>
            <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
        </div>
      </div>
      
      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <div class="space-y-6">
          
          <!-- Tour Image (if exists) -->
          ${
            tour.image_url
              ? `
          <div class="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl border-2 border-purple-100">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i class="fas fa-image text-purple-500"></i>
              Tour Image
            </h4>
            <img src="${tour.image_url}" alt="${tour.tour_name}" class="max-h-60 rounded-lg border-2 border-gray-200 mx-auto">
          </div>
          `
              : ""
          }
          
          <!-- Basic Info -->
          <div class="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border-2 border-gray-100">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i class="fas fa-info-circle text-indigo-500"></i>
              Tour Information
            </h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-500"><DurationTravel/Date/p>
                <p class="font-semibold">${tour.duration_hours ? tour.duration_hours + " hours" : "Not specified"}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">Status</p>
                <span class="px-2 py-1 text-xs rounded-full ${tour.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}">
                  ${tour.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Tour Itinerary -->
          <div class="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl border-2 border-indigo-100">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i class="fas fa-map-signs text-indigo-500"></i>
              Tour Itinerary (Schedule)
            </h4>
            ${
              Array.isArray(tour.itinerary) && tour.itinerary.length > 0
                ? `
              <div class="space-y-2">
                ${tour.itinerary
                  .map(
                    (item, idx) => `
                  <div class="flex items-start gap-2">
                    <span class="text-indigo-500 font-bold min-w-[24px]">${idx + 1}.</span>
                    <span class="text-gray-600">${item}</span>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            `
                : '<p class="text-gray-500 italic">No itinerary specified</p>'
            }
          </div>
          
          <!-- Tour Inclusions -->
          <div class="bg-gradient-to-br from-green-50 to-white p-5 rounded-xl border-2 border-green-100">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i class="fas fa-check-circle text-green-500"></i>
              Tour Inclusions (What's included)
            </h4>
            ${
              Array.isArray(tour.inclusions) && tour.inclusions.length > 0
                ? `
              <div class="space-y-2">
                ${tour.inclusions
                  .map(
                    (item) => `
                  <div class="flex items-start gap-2">
                    <i class="fas fa-check-circle text-green-500 mt-1 text-sm min-w-[20px]"></i>
                    <span class="text-gray-600">${item}</span>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            `
                : '<p class="text-gray-500 italic">No inclusions specified</p>'
            }
          </div>
          
          <!-- Tour Exclusions (if exists) -->
          ${
            Array.isArray(tour.exclusions) && tour.exclusions.length > 0
              ? `
          <div class="bg-gradient-to-br from-red-50 to-white p-5 rounded-xl border-2 border-red-100">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i class="fas fa-times-circle text-red-500"></i>
              Tour Exclusions (What's NOT included)
            </h4>
            <div class="space-y-2">
              ${tour.exclusions
                .map(
                  (item) => `
                <div class="flex items-start gap-2">
                  <i class="fas fa-times-circle text-red-500 mt-1 text-sm min-w-[20px]"></i>
                  <span class="text-gray-600">${item}</span>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
          `
              : ""
          }
          
          <!-- Tour Rates -->
          <div class="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl border-2 border-purple-100">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i class="fas fa-tag text-purple-500"></i>
              Tour Rates (₱ per person)
            </h4>
            ${
              tour.rates &&
              tour.rates.length > 0 &&
              Object.values(tour.rates[0]).some((val) => val)
                ? `
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                ${Object.entries(tour.rates[0])
                  .filter(
                    ([key, value]) =>
                      key.startsWith("rate_") && value && parseFloat(value) > 0,
                  )
                  .map(([key, value]) => {
                    let label = key.replace("rate_", "").replace(/_/g, " ");
                    if (key === "rate_child_4_9") label = "Child (4-9 yrs)";
                    else if (key.includes("pax")) {
                      const match = key.match(/\d+/);
                      if (match) label = match[0] + " Pax";
                    }
                    return `
                      <div class="bg-white p-3 rounded-lg border border-purple-200">
                        <p class="text-xs text-gray-500 mb-1">${label}</p>
                        <p class="font-bold text-purple-600">₱${parseFloat(value).toLocaleString()}</p>
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            `
                : '<p class="text-gray-500 italic">No rates specified</p>'
            }
          </div>
          
          <!-- Packages using this tour -->
          <div class="bg-gradient-to-br from-blue-50 to-white p-5 rounded-xl border-2 border-blue-100">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i class="fas fa-box text-blue-500"></i>
              Included in Packages
            </h4>
            ${
              destination?.packages?.filter((p) =>
                p.optional_tours?.some((t) => t.id === tour.id),
              ).length > 0
                ? `
              <div class="space-y-1">
                ${destination.packages
                  .filter((p) =>
                    p.optional_tours?.some((t) => t.id === tour.id),
                  )
                  .map(
                    (p) => `
                    <div class="flex items-center gap-2 bg-white p-2 rounded-lg border border-blue-200">
                      <i class="fas fa-box text-blue-400 text-sm"></i>
                      <span class="text-sm text-gray-700">${p.package_name}</span>
                    </div>
                  `,
                  )
                  .join("")}
              </div>
            `
                : '<p class="text-gray-500 italic">Not included in any packages</p>'
            }
          </div>
          
          <!-- Action Buttons -->
          <div class="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
            <button onclick="this.closest('.fixed').remove()" 
                    class="px-5 py-2.5 border-2 border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-all">
              <i class="fas fa-times mr-2"></i>Close
            </button>
            <button onclick="window.openEditOptionalTourModal(${tour.id}); this.closest('.fixed').remove()" 
                    class="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg text-sm hover:from-amber-700 hover:to-orange-700 transition-all shadow-lg shadow-amber-200 flex items-center gap-2">
              <i class="fas fa-edit"></i>
              Edit Tour
            </button>
            <button onclick="window.duplicateOptionalTour(${tour.id})" 
                    class="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2">
              <i class="fas fa-copy"></i>
              Duplicate
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}
// =====================================================
// DUPLICATE OPTIONAL TOUR
// =====================================================

export async function duplicateOptionalTour(tourId) {
  try {
    showLoading(true, "Duplicating tour...");

    // Find the tour
    let tour = null;
    for (const dest of state.destinations) {
      const found = dest.optional_tours?.find((t) => t.id === tourId);
      if (found) {
        tour = found;
        break;
      }
    }

    if (!tour) {
      showToast("Tour not found", "error");
      return;
    }

    // Create new tour with "(Copy)" suffix
    const newTourData = {
      destination_id: tour.destination_id,
      tour_name: `${tour.tour_name} (Copy)`,
      duration_hours: tour.duration_hours,
      itinerary: Array.isArray(tour.itinerary)
        ? tour.itinerary.join("\n")
        : tour.itinerary,
      inclusions: Array.isArray(tour.inclusions)
        ? tour.inclusions.join("\n")
        : tour.inclusions,
      category_id: tour.category_id,
      rate_solo: tour.rates?.[0]?.rate_solo,
      rate_2pax: tour.rates?.[0]?.rate_2pax,
      rate_3pax: tour.rates?.[0]?.rate_3pax,
      rate_4pax: tour.rates?.[0]?.rate_4pax,
      rate_5pax: tour.rates?.[0]?.rate_5pax,
      rate_6pax: tour.rates?.[0]?.rate_6pax,
      rate_7pax: tour.rates?.[0]?.rate_7pax,
      rate_8pax: tour.rates?.[0]?.rate_8pax,
      rate_9pax: tour.rates?.[0]?.rate_9pax,
      rate_10pax: tour.rates?.[0]?.rate_10pax,
      rate_11pax: tour.rates?.[0]?.rate_11pax,
      rate_12pax: tour.rates?.[0]?.rate_12pax,
      rate_child_4_9: tour.rates?.[0]?.rate_child_4_9,
    };

    const result = await createOptionalTour(newTourData);
    if (result) {
      showToast("✅ Tour duplicated successfully!", "success");
      await refreshDestinationsPage();
    }
  } catch (error) {
    console.error("Error duplicating tour:", error);
    showToast("❌ Failed to duplicate tour: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

// =====================================================
// IMAGE RELATED FUNCTIONS
// =====================================================

// =====================================================
// OPTIMIZED IMAGE FUNCTION WITH FALLBACKS
// =====================================================

export function getDestinationImage(destinationName) {
  // Use fast-loading CDN images instead of Unsplash
  const defaultImages = {
    // Philippine Destinations
    Boracay:
      "https://images.pexels.com/photos/984607/pexels-photo-984607.jpeg?auto=compress&cs=tinysrgb&w=800",
    Palawan:
      "https://images.pexels.com/photos/1450360/pexels-photo-1450360.jpeg?auto=compress&cs=tinysrgb&w=800",
    "El Nido":
      "https://images.pexels.com/photos/1450360/pexels-photo-1450360.jpeg?auto=compress&cs=tinysrgb&w=800",
    Coron:
      "https://images.pexels.com/photos/1450360/pexels-photo-1450360.jpeg?auto=compress&cs=tinysrgb&w=800",
    Bacolod:
      "https://images.pexels.com/photos/189349/pexels-photo-189349.jpeg?auto=compress&cs=tinysrgb&w=800",
    Cebu: "https://images.pexels.com/photos/1470177/pexels-photo-1470177.jpeg?auto=compress&cs=tinysrgb&w=800",
    Bohol:
      "https://images.pexels.com/photos/1470177/pexels-photo-1470177.jpeg?auto=compress&cs=tinysrgb&w=800",
    Siargao:
      "https://images.pexels.com/photos/189349/pexels-photo-189349.jpeg?auto=compress&cs=tinysrgb&w=800",
    Davao:
      "https://images.pexels.com/photos/189349/pexels-photo-189349.jpeg?auto=compress&cs=tinysrgb&w=800",
    Baguio:
      "https://images.pexels.com/photos/631954/pexels-photo-631954.jpeg?auto=compress&cs=tinysrgb&w=800",
    Manila:
      "https://images.pexels.com/photos/357338/pexels-photo-357338.jpeg?auto=compress&cs=tinysrgb&w=800",

    // International Destinations
    Bali: "https://images.pexels.com/photos/2166559/pexels-photo-2166559.jpeg?auto=compress&cs=tinysrgb&w=800",
    Tokyo:
      "https://images.pexels.com/photos/161251/senso-ji-temple-japan-kyoto-161251.jpeg?auto=compress&cs=tinysrgb&w=800",
    Singapore:
      "https://images.pexels.com/photos/374710/pexels-photo-374710.jpeg?auto=compress&cs=tinysrgb&w=800",
    Bangkok:
      "https://images.pexels.com/photos/258196/pexels-photo-258196.jpeg?auto=compress&cs=tinysrgb&w=800",
    Paris:
      "https://images.pexels.com/photos/2363/france-eiffel-tower-landmark-lights.jpg?auto=compress&cs=tinysrgb&w=800",
    "Hong Kong":
      "https://images.pexels.com/photos/373290/pexels-photo-373290.jpeg?auto=compress&cs=tinysrgb&w=800",
    Seoul:
      "https://images.pexels.com/photos/373290/pexels-photo-373290.jpeg?auto=compress&cs=tinysrgb&w=800",
    "New York":
      "https://images.pexels.com/photos/290386/pexels-photo-290386.jpeg?auto=compress&cs=tinysrgb&w=800",
    London:
      "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=800",
    Sydney:
      "https://images.pexels.com/photos/1878293/pexels-photo-1878293.jpeg?auto=compress&cs=tinysrgb&w=800",

    // Generic fallbacks
    Beach:
      "https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=800",
    Mountain:
      "https://images.pexels.com/photos/631954/pexels-photo-631954.jpeg?auto=compress&cs=tinysrgb&w=800",
    City: "https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&w=800",
    Island:
      "https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=800",
  };

  // Try to find a matching image
  for (const [key, url] of Object.entries(defaultImages)) {
    if (destinationName.toLowerCase().includes(key.toLowerCase())) {
      return url;
    }
  }

  // Ultimate fallback - simple color gradient
  return (
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%234f46e5'/%3E%3Cstop offset='100%25' stop-color='%23db2777'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='600' fill='url(%23g)'/%3E%3Ctext x='400' y='300' font-family='Arial' font-size='24' fill='white' text-anchor='middle' dominant-baseline='middle'%3E" +
    encodeURIComponent(destinationName) +
    "%3C/text%3E%3C/svg%3E"
  );
}
// =====================================================
// LAZY LOADING IMAGE COMPONENT
// =====================================================

export function createLazyImage(src, alt, className = "") {
  const img = new Image();
  const wrapper = document.createElement("div");
  wrapper.className = `relative ${className} bg-gray-200 animate-pulse`;

  // Create placeholder
  const placeholder = document.createElement("div");
  placeholder.className = "absolute inset-0 flex items-center justify-center";
  placeholder.innerHTML = '<i class="fas fa-image text-gray-400 text-3xl"></i>';
  wrapper.appendChild(placeholder);

  // Load image
  img.onload = () => {
    placeholder.remove();
    img.className = "w-full h-full object-cover";
    wrapper.appendChild(img);
  };

  img.onerror = () => {
    placeholder.innerHTML =
      '<i class="fas fa-broken-image text-gray-400 text-3xl"></i>';
  };

  img.src = src;
  img.alt = alt;

  return wrapper;
}

export async function uploadDestinationImage(
  destinationId,
  file,
  destinationName,
) {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${destinationId}-${Date.now()}.${fileExt}`;
    const filePath = `destinations/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("destination-images")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("destination-images")
      .getPublicUrl(filePath);
    const imageUrl = urlData.publicUrl;

    const { count } = await supabase
      .from("destination_images")
      .select("*", { count: "exact", head: true })
      .eq("destination_id", destinationId);

    const isFirst = count === 0;

    const { error: insertError } = await supabase
      .from("destination_images")
      .insert([
        {
          destination_id: destinationId,
          url: imageUrl,
          alt_text: destinationName,
          is_primary: isFirst,
        },
      ]);

    if (insertError) throw insertError;

    return { success: true, url: imageUrl };
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

export async function setPrimaryImage(imageId, destinationId) {
  try {
    await supabase
      .from("destination_images")
      .update({ is_primary: false })
      .eq("destination_id", destinationId);

    await supabase
      .from("destination_images")
      .update({ is_primary: true })
      .eq("id", imageId);

    await fetchDestinations();
    showToast("✅ Primary image updated", "success");
  } catch (error) {
    console.error("Error setting primary image:", error);
    showToast("❌ Failed to update primary image", "error");
  }
}

export async function deleteImage(imageId) {
  showConfirmDialog("Delete this image?", async () => {
    try {
      const { data: image } = await supabase
        .from("destination_images")
        .select("url, destination_id, is_primary")
        .eq("id", imageId)
        .single();

      if (image.url.includes("storage.googleapis.com")) {
        const path = image.url.split("/").pop();
        if (path) {
          await supabase.storage
            .from("destination-images")
            .remove([`destinations/${path}`]);
        }
      }

      const { error } = await supabase
        .from("destination_images")
        .delete()
        .eq("id", imageId);
      if (error) throw error;

      if (image.is_primary) {
        const { data: remainingImages } = await supabase
          .from("destination_images")
          .select("id")
          .eq("destination_id", image.destination_id)
          .limit(1);

        if (remainingImages && remainingImages.length > 0) {
          await setPrimaryImage(remainingImages[0].id, image.destination_id);
        }
      }

      await fetchDestinations();
      showToast("✅ Image deleted", "success");
      await refreshDestinationsPage();
    } catch (error) {
      console.error("Error deleting image:", error);
      showToast("❌ Failed to delete image", "error");
    }
  });
}

export function showImageUploadModal(destinationId, destinationName) {
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl">
      <div class="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 flex items-center justify-between rounded-t-2xl">
        <h3 class="text-lg font-bold text-white">Upload Images for ${destinationName}</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
      </div>
      
      <div class="p-5">
        <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-500 transition cursor-pointer" id="uploadArea">
          <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
          <p class="text-sm text-gray-600">Click to select images or drag and drop</p>
          <p class="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB each</p>
          <input type="file" id="fileInput" accept="image/png,image/jpeg,image/jpg,image/webp" multiple class="hidden">
        </div>
        
        <div class="flex justify-end mt-4">
          <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const uploadArea = document.getElementById("uploadArea");
  const fileInput = document.getElementById("fileInput");

  uploadArea.addEventListener("click", () => fileInput.click());

  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("border-emerald-500", "bg-emerald-50");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("border-emerald-500", "bg-emerald-50");
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("border-emerald-500", "bg-emerald-50");
    const files = e.dataTransfer.files;
    handleFiles(files);
  });

  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });

  async function handleFiles(files) {
    if (files.length === 0) return;

    modal.remove();
    showLoading(true, `Uploading ${files.length} image(s)...`);

    try {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          showToast(`❌ ${file.name} exceeds 5MB limit`, "error");
          continue;
        }
        await uploadDestinationImage(destinationId, file, destinationName);
      }

      await fetchDestinations();
      showToast(`✅ ${files.length} image(s) uploaded!`, "success");
    } catch (error) {
      console.error("Upload error:", error);
      showToast("❌ Upload failed: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  }
}

export async function fetchDestinationImages(destinationId) {
  try {
    const { data, error } = await supabase
      .from("destination_images")
      .select("*")
      .eq("destination_id", destinationId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching destination images:", error);
    return [];
  }
}

export async function uploadImage(file, destinationId, destinationName) {
  return await uploadDestinationImage(destinationId, file, destinationName);
}

export async function addUnsplashImage(
  destinationId,
  destinationName,
  imageUrl,
) {
  try {
    showToast("📸 Adding image...", "info");

    const { error } = await supabase.from("destination_images").insert([
      {
        destination_id: parseInt(destinationId),
        url: imageUrl,
        alt_text: destinationName,
        is_primary: false,
      },
    ]);

    if (error) throw error;

    showToast("✅ Image added successfully!", "success");
    document.getElementById("imageUploadModal")?.remove();

    await fetchDestinations();
    await refreshDestinationsPage();
  } catch (error) {
    console.error("Error adding image:", error);
    showToast("❌ Failed to add image: " + error.message, "error");
  }
}

export async function addImageFromUrl(url, destinationId, destinationName) {
  try {
    showToast("📸 Adding image...", "info");

    const { error } = await supabase.from("destination_images").insert([
      {
        destination_id: parseInt(destinationId),
        url: url,
        alt_text: destinationName,
        is_primary: false,
      },
    ]);

    if (error) throw error;

    showToast("✅ Image added successfully!", "success");
    await fetchDestinations();
    await refreshDestinationsPage();
  } catch (error) {
    console.error("Error adding image:", error);
    showToast("❌ Failed to add image: " + error.message, "error");
  }
}

// =====================================================
// BATCH SELECTION FUNCTIONS
// =====================================================

export function toggleAllCheckboxes(checkbox, className) {
  const checkboxes = document.querySelectorAll(`.checkbox-${className}`);
  checkboxes.forEach((cb) => (cb.checked = checkbox.checked));
}

export async function deleteSelectedItems(type, parentId) {
  const checkboxes = document.querySelectorAll(
    `.checkbox-${type}-${parentId}:checked`,
  );
  const selectedIds = Array.from(checkboxes).map((cb) => parseInt(cb.value));

  if (selectedIds.length === 0) {
    showToast("No items selected", "warning");
    return;
  }

  showConfirmDialog(
    `Delete ${selectedIds.length} selected item(s)?`,
    async () => {
      try {
        showLoading(true, "Deleting selected items...");

        let tableName;
        switch (type) {
          case "inclusions":
            tableName = "package_inclusions";
            break;
          case "exclusions":
            tableName = "package_exclusions";
            break;
          case "itineraries":
            tableName = "package_itineraries";
            break;
          case "hotels":
            tableName = "hotels";
            break;
          case "optional_tours":
            tableName = "optional_tours";
            break;
          default:
            throw new Error("Invalid type");
        }

        const { error } = await supabase
          .from(tableName)
          .delete()
          .in("id", selectedIds);

        if (error) throw error;

        await fetchDestinations();
        showToast(
          `✅ ${selectedIds.length} item(s) deleted successfully!`,
          "success",
        );

        const modal = document.getElementById("editPackageModal");
        if (modal) {
          const packageId = modal.querySelector('[name="package_id"]')?.value;
          if (packageId) {
            modal.remove();
            await openEditPackageModal(parseInt(packageId));
          }
        }
      } catch (error) {
        console.error("Error deleting items:", error);
        showToast(`❌ Failed to delete items: ${error.message}`, "error");
      } finally {
        showLoading(false);
      }
    },
  );
}

// =====================================================
// INLINE EDIT FUNCTIONS
// =====================================================

export function addNewInclusion() {
  const input = document.getElementById("new-inclusion-input");
  if (input) input.classList.remove("hidden");
}

export function cancelNewInclusion() {
  const input = document.getElementById("new-inclusion-input");
  const textarea = document.getElementById("new-inclusion-text");
  if (input) input.classList.add("hidden");
  if (textarea) textarea.value = "";
}

export async function saveNewInclusion(packageId) {
  const textarea = document.getElementById("new-inclusion-text");
  if (!textarea) return;

  const text = textarea.value.trim();
  if (!text) {
    showToast("Please enter inclusion text", "warning");
    return;
  }

  try {
    showLoading(true, "Adding inclusion...");

    const { error } = await supabase.from("package_inclusions").insert([
      {
        package_id: packageId,
        inclusion_text: text,
        display_order: 999,
      },
    ]);

    if (error) throw error;

    await fetchDestinations();
    showToast("✅ Inclusion added successfully!", "success");

    const modal = document.getElementById("editPackageModal");
    if (modal) {
      modal.remove();
      await openEditPackageModal(packageId);
    }
  } catch (error) {
    console.error("Error adding inclusion:", error);
    showToast("❌ Failed to add inclusion: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}
// =====================================================
// OPTIONAL TOUR RATES CRUD - UPDATE RATES ONLY
// =====================================================

export async function updateOptionalTourRates(tourId, rateData) {
  try {
    showLoading(true, "Updating tour rates...");

    // Validate tourId
    if (!tourId || isNaN(parseInt(tourId))) {
      showToast("Invalid tour ID", "error");
      return false;
    }

    // Check if rates already exist for this tour
    const { data: existing, error: checkError } = await supabase
      .from("optional_tour_rates")
      .select("id")
      .eq("tour_id", tourId)
      .maybeSingle();

    if (checkError) throw checkError;

    // Clean the rate data - convert empty strings to null and parse to float
    const cleanRates = {};
    const rateFields = [
      "rate_solo",
      "rate_2pax",
      "rate_3pax",
      "rate_4pax",
      "rate_5pax",
      "rate_6pax",
      "rate_7pax",
      "rate_8pax",
      "rate_9pax",
      "rate_10pax",
      "rate_11pax",
      "rate_12pax",
      "rate_child_4_9",
    ];

    for (const field of rateFields) {
      if (
        rateData[field] !== undefined &&
        rateData[field] !== null &&
        rateData[field] !== ""
      ) {
        const parsed = parseFloat(rateData[field]);
        cleanRates[field] = isNaN(parsed) ? null : parsed;
      } else {
        cleanRates[field] = null;
      }
    }

    if (existing) {
      // Update existing rates
      const { error } = await supabase
        .from("optional_tour_rates")
        .update({
          ...cleanRates,
          updated_at: new Date(),
        })
        .eq("tour_id", tourId);

      if (error) throw error;
      showToast("✅ Tour rates updated successfully!", "success");
    } else {
      // Insert new rates
      const { error } = await supabase.from("optional_tour_rates").insert([
        {
          tour_id: parseInt(tourId),
          ...cleanRates,
        },
      ]);

      if (error) throw error;
      showToast("✅ Tour rates created successfully!", "success");
    }

    // Refresh destinations to update state
    await fetchDestinations();
    return true;
  } catch (error) {
    console.error("Error updating tour rates:", error);
    showToast("❌ Failed to update tour rates: " + error.message, "error");
    return false;
  } finally {
    showLoading(false);
  }
}
export async function editInclusion(id, currentText) {
  const newText = prompt("Edit inclusion:", currentText);
  if (newText && newText !== currentText) {
    try {
      showLoading(true, "Updating inclusion...");

      const { error } = await supabase
        .from("package_inclusions")
        .update({ inclusion_text: newText })
        .eq("id", id);

      if (error) throw error;

      await fetchDestinations();
      showToast("✅ Inclusion updated successfully!", "success");

      const modal = document.getElementById("editPackageModal");
      if (modal) {
        const packageId = modal.querySelector('[name="package_id"]')?.value;
        if (packageId) {
          modal.remove();
          await openEditPackageModal(parseInt(packageId));
        }
      }
    } catch (error) {
      console.error("Error updating inclusion:", error);
      showToast("❌ Failed to update inclusion: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  }
}

export function addNewExclusion() {
  const input = document.getElementById("new-exclusion-input");
  if (input) input.classList.remove("hidden");
}

export function cancelNewExclusion() {
  const input = document.getElementById("new-exclusion-input");
  const textarea = document.getElementById("new-exclusion-text");
  if (input) input.classList.add("hidden");
  if (textarea) textarea.value = "";
}

export async function saveNewExclusion(packageId) {
  const textarea = document.getElementById("new-exclusion-text");
  if (!textarea) return;

  const text = textarea.value.trim();
  if (!text) {
    showToast("Please enter exclusion text", "warning");
    return;
  }

  try {
    showLoading(true, "Adding exclusion...");

    const { error } = await supabase.from("package_exclusions").insert([
      {
        package_id: packageId,
        exclusion_text: text,
        display_order: 999,
      },
    ]);

    if (error) throw error;

    await fetchDestinations();
    showToast("✅ Exclusion added successfully!", "success");

    const modal = document.getElementById("editPackageModal");
    if (modal) {
      modal.remove();
      await openEditPackageModal(packageId);
    }
  } catch (error) {
    console.error("Error adding exclusion:", error);
    showToast("❌ Failed to add exclusion: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

export async function editExclusion(id, currentText) {
  const newText = prompt("Edit exclusion:", currentText);
  if (newText && newText !== currentText) {
    try {
      showLoading(true, "Updating exclusion...");

      const { error } = await supabase
        .from("package_exclusions")
        .update({ exclusion_text: newText })
        .eq("id", id);

      if (error) throw error;

      await fetchDestinations();
      showToast("✅ Exclusion updated successfully!", "success");

      const modal = document.getElementById("editPackageModal");
      if (modal) {
        const packageId = modal.querySelector('[name="package_id"]')?.value;
        if (packageId) {
          modal.remove();
          await openEditPackageModal(parseInt(packageId));
        }
      }
    } catch (error) {
      console.error("Error updating exclusion:", error);
      showToast("❌ Failed to update exclusion: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  }
}

// =====================================================
// ITINERARY FUNCTIONS
// =====================================================

export function addItineraryDayEdit() {
  const container = document.getElementById("itineraryContainer");
  if (!container) return;

  const dayCount = container.children.length + 1;
  const dayHtml = `
    <div class="flex items-center gap-2 bg-white p-2 rounded-lg border-2 border-gray-200">
      <span class="text-xs font-bold text-gray-600 w-12">Day ${dayCount}:</span>
      <input type="text" name="itineraries[${dayCount}]" 
             class="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-indigo-500"
             placeholder="Activity for day ${dayCount}">
      <button type="button" onclick="this.parentElement.remove(); updateDayCount()" 
              class="text-red-500 hover:text-red-700 p-1">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  container.insertAdjacentHTML("beforeend", dayHtml);

  // Call updateDayCount if it exists
  if (typeof window.updateDayCount === "function") {
    window.updateDayCount();
  }
}
// =====================================================
// ADD MULTIPLE OPTIONAL TOURS TO PACKAGE MODAL
// =====================================================

export async function openAddMultipleToursToPackageModal(
  packageId,
  destinationId,
) {
  try {
    showLoading(true, "Loading available tours...");

    // Get the package and destination
    let pkg = null;
    let destination = null;
    for (const dest of state.destinations) {
      if (dest.id === destinationId) {
        destination = dest;
        const found = dest.packages?.find((p) => p.id === packageId);
        if (found) {
          pkg = found;
        }
        break;
      }
    }

    if (!pkg || !destination) {
      showToast("Package or destination not found", "error");
      showLoading(false);
      return;
    }

    // Get available tours (not yet linked to this package)
    const availableTours = await getAvailableToursForPackage(
      packageId,
      destinationId,
    );

    showLoading(false);

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto";

    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl transform transition-all">
        <!-- Fixed Header -->
        <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500">
          <div class="absolute inset-0 bg-black/10"></div>
          <div class="relative px-6 py-5">
            <div class="flex items-center gap-4">
              <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/30">
                <i class="fas fa-compass text-2xl text-white"></i>
              </div>
              <div class="flex-1">
                <h3 class="text-2xl font-bold text-white tracking-tight">Add Optional Tours</h3>
                <p class="text-purple-100 text-sm mt-1">${pkg.package_name}</p>
              </div>
              <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
            </div>
          </div>
        </div>
        
        <div class="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          ${
            availableTours.length === 0
              ? `
            <div class="text-center py-8">
              <i class="fas fa-compass text-5xl text-gray-300 mb-3"></i>
              <p class="text-gray-500 mb-4">No optional tours available to add</p>
              <button onclick="window.openCreateOptionalTourModal(${destinationId}); this.closest('.fixed').remove()" 
                      class="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600">
                <i class="fas fa-plus-circle mr-1"></i> Create New Tour
              </button>
            </div>
          `
              : `
            <div class="mb-4 flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Select tours to add to this package:</p>
                <p class="text-xs text-gray-500 mt-1">
                  <span id="selectedCount">0</span> tour(s) selected
                </p>
              </div>
              <div class="flex gap-2">
                <button onclick="selectAllTours()" 
                        class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200">
                  <i class="fas fa-check-double mr-1"></i> Select All
                </button>
                <button onclick="deselectAllTours()" 
                        class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200">
                  <i class="fas fa-times mr-1"></i> Clear All
                </button>
              </div>
            </div>
            
            <div id="toursList" class="space-y-3 max-h-96 overflow-y-auto p-2 border border-gray-200 rounded-lg">
              ${availableTours
                .map(
                  (tour) => `
                <div class="tour-item flex items-center gap-3 bg-gray-50 p-3 rounded-lg border-2 border-gray-200 hover:border-purple-300 transition" data-tour-id="${tour.id}">
                  <input type="checkbox" class="tour-checkbox h-5 w-5 text-purple-600 rounded flex-shrink-0" value="${tour.id}">
                  <div class="flex items-center gap-3 flex-1">
                    ${
                      tour.image_url
                        ? `
                      <img src="${tour.image_url}" alt="${tour.tour_name}" class="w-12 h-12 rounded-lg object-cover">
                    `
                        : `
                      <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <i class="fas fa-compass text-purple-400"></i>
                      </div>
                    `
                    }
                    <div class="flex-1">
                      <h4 class="font-medium">${tour.tour_name}</h4>
                      <div class="flex items-center gap-2 text-xs text-gray-500">
                        ${tour.duration_hours ? `<span><i class="far fa-clock mr-1"></i>${tour.duration_hours}h</span>` : ""}
                        ${
                          tour.rates && tour.rates[0]
                            ? `
                          <span>• From ₱${tour.rates[0].rate_solo || tour.rates[0].rate_2pax || "0"}</span>
                        `
                            : ""
                        }
                      </div>
                    </div>
                  </div>
                  <button onclick="viewTourDetails(${tour.id})" 
                          class="text-purple-600 hover:text-purple-800 p-2" title="View Details">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
              `,
                )
                .join("")}
            </div>
            
            <div class="flex justify-end gap-3 mt-6 pt-4 border-t-2 border-gray-100">
              <button type="button" onclick="this.closest('.fixed').remove()"
                      class="px-5 py-2.5 border-2 border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onclick="addSelectedToursToPackage(${packageId}, ${destinationId})" 
                      class="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm hover:from-purple-700 hover:to-pink-700 flex items-center gap-2">
                <i class="fas fa-plus-circle"></i>
                Add Selected Tours
              </button>
            </div>
          `
          }
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    if (availableTours.length > 0) {
      // Update selected count when checkboxes change
      const checkboxes = document.querySelectorAll(".tour-checkbox");
      const selectedCountSpan = document.getElementById("selectedCount");

      checkboxes.forEach((cb) => {
        cb.addEventListener("change", updateSelectedCount);
      });

      function updateSelectedCount() {
        const checked = document.querySelectorAll(
          ".tour-checkbox:checked",
        ).length;
        selectedCountSpan.textContent = checked;
      }

      // Select All function
      window.selectAllTours = function () {
        checkboxes.forEach((cb) => (cb.checked = true));
        updateSelectedCount();
      };

      // Deselect All function
      window.deselectAllTours = function () {
        checkboxes.forEach((cb) => (cb.checked = false));
        updateSelectedCount();
      };

      // View tour details
      window.viewTourDetails = function (tourId) {
        viewOptionalTourDetails(tourId);
      };

      // Add selected tours to package
      window.addSelectedToursToPackage = async function (pkgId, destId) {
        const selectedTours = Array.from(
          document.querySelectorAll(".tour-checkbox:checked"),
        ).map((cb) => parseInt(cb.value));

        if (selectedTours.length === 0) {
          showToast("Please select at least one tour", "warning");
          return;
        }

        try {
          showLoading(true, `Adding ${selectedTours.length} tour(s)...`);

          let successCount = 0;
          let errorCount = 0;

          for (const tourId of selectedTours) {
            try {
              const result = await linkTourToPackage(pkgId, tourId);
              if (result) {
                successCount++;
              } else {
                errorCount++;
              }
            } catch (err) {
              console.error(`Error adding tour ${tourId}:`, err);
              errorCount++;
            }
          }

          modal.remove();

          if (successCount > 0) {
            showToast(
              `✅ ${successCount} tour(s) added successfully!${errorCount > 0 ? ` (${errorCount} failed)` : ""}`,
              "success",
            );
          } else {
            showToast("❌ Failed to add tours", "error");
          }

          // Refresh the view
          await viewDestinationDetails(destId);
        } catch (error) {
          console.error("Error adding tours to package:", error);
          showToast("❌ Failed to add tours: " + error.message, "error");
        } finally {
          showLoading(false);
        }
      };
    }
  } catch (error) {
    console.error("Error opening add tours modal:", error);
    showToast("Failed to load available tours", "error");
    showLoading(false);
  }
}
export function openEditPackageRateModal(rateId) {
  // Find the rate
  let rate = null;
  let pkg = null;
  let destination = null;
  for (const dest of state.destinations) {
    for (const p of dest.packages || []) {
      const found = p.package_hotel_rates?.find((r) => r.id === rateId);
      if (found) {
        rate = found;
        pkg = p;
        destination = dest;
        break;
      }
    }
  }

  if (!rate) {
    showToast("Rate not found", "error");
    return;
  }

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-3xl w-full shadow-2xl transform transition-all">
      <!-- Fixed Header -->
      <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-amber-600 via-orange-500 to-red-500">
        <div class="absolute inset-0 bg-black/10"></div>
        <div class="relative px-6 py-5">
          <div class="flex items-center gap-4">
            <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/30">
              <i class="fas fa-tag text-2xl text-white"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-white tracking-tight">Edit Hotel Rate</h3>
              <p class="text-amber-100 text-sm mt-1">${pkg?.package_name}</p>
            </div>
            <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
        </div>
      </div>
      
      <form id="editPackageRateForm" class="p-6 space-y-5 max-h-[calc(90vh-120px)] overflow-y-auto">
        <input type="hidden" name="id" value="${rate.id}">
        <input type="hidden" name="package_id" value="${rate.package_id}">
        <input type="hidden" name="hotel_category_id" value="${rate.hotel_category_id}">
        
        <!-- Season and Sneak Fields -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-600 mb-2">Season</label>
            <input type="text" name="season" value="${rate.season || ""}" 
                   class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="e.g., Peak Season 2024">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-600 mb-2">Sneak</label>
            <input type="text" name="sneak" value="${rate.sneak || ""}" 
                   class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="e.g., SNK001">
          </div>
        </div>
        
        <!-- Regular Rates 1-15 Pax -->
        <div>
          <h4 class="text-md font-bold text-gray-800 mb-3">Regular Rates (per person)</h4>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">Solo</label>
              <input type="number" name="rate_solo" value="${rate.rate_solo || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">2 Pax</label>
              <input type="number" name="rate_2pax" value="${rate.rate_2pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">3 Pax</label>
              <input type="number" name="rate_3pax" value="${rate.rate_3pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">4 Pax</label>
              <input type="number" name="rate_4pax" value="${rate.rate_4pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">5 Pax</label>
              <input type="number" name="rate_5pax" value="${rate.rate_5pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">6 Pax</label>
              <input type="number" name="rate_6pax" value="${rate.rate_6pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">7 Pax</label>
              <input type="number" name="rate_7pax" value="${rate.rate_7pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">8 Pax</label>
              <input type="number" name="rate_8pax" value="${rate.rate_8pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">9 Pax</label>
              <input type="number" name="rate_9pax" value="${rate.rate_9pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">10 Pax</label>
              <input type="number" name="rate_10pax" value="${rate.rate_10pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">11 Pax</label>
              <input type="number" name="rate_11pax" value="${rate.rate_11pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">12 Pax</label>
              <input type="number" name="rate_12pax" value="${rate.rate_12pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">13 Pax</label>
              <input type="number" name="rate_13pax" value="${rate.rate_13pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">14 Pax</label>
              <input type="number" name="rate_14pax" value="${rate.rate_14pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">15 Pax</label>
              <input type="number" name="rate_15pax" value="${rate.rate_15pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">Child (No BF)</label>
              <input type="number" name="rate_child_no_breakfast" value="${rate.rate_child_no_breakfast || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
          </div>
        </div>
        
        <!-- Extra Night Rates 1-15 Pax -->
        <div class="border-t border-gray-200 pt-4">
          <h4 class="text-md font-bold text-gray-800 mb-3">Extra Night Rates</h4>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">Solo Extra</label>
              <input type="number" name="extra_night_solo" value="${rate.extra_night_solo || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">2P Extra</label>
              <input type="number" name="extra_night_2pax" value="${rate.extra_night_2pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">3P Extra</label>
              <input type="number" name="extra_night_3pax" value="${rate.extra_night_3pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">4P Extra</label>
              <input type="number" name="extra_night_4pax" value="${rate.extra_night_4pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">5P Extra</label>
              <input type="number" name="extra_night_5pax" value="${rate.extra_night_5pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">6P Extra</label>
              <input type="number" name="extra_night_6pax" value="${rate.extra_night_6pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">7P Extra</label>
              <input type="number" name="extra_night_7pax" value="${rate.extra_night_7pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">8P Extra</label>
              <input type="number" name="extra_night_8pax" value="${rate.extra_night_8pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">9P Extra</label>
              <input type="number" name="extra_night_9pax" value="${rate.extra_night_9pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">10P Extra</label>
              <input type="number" name="extra_night_10pax" value="${rate.extra_night_10pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">11P Extra</label>
              <input type="number" name="extra_night_11pax" value="${rate.extra_night_11pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">12P Extra</label>
              <input type="number" name="extra_night_12pax" value="${rate.extra_night_12pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">13P Extra</label>
              <input type="number" name="extra_night_13pax" value="${rate.extra_night_13pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">14P Extra</label>
              <input type="number" name="extra_night_14pax" value="${rate.extra_night_14pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">15P Extra</label>
              <input type="number" name="extra_night_15pax" value="${rate.extra_night_15pax || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
            <div><label class="block text-xs font-semibold text-gray-600 mb-1">Child Extra</label>
              <input type="number" name="extra_night_child_no_breakfast" value="${rate.extra_night_child_no_breakfast || ""}" step="0.01"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"></div>
          </div>
        </div>
        
        <div class="mt-4">
          <label class="flex items-center gap-2">
            <input type="checkbox" name="breakfast_included" value="true" ${rate.breakfast_included ? "checked" : ""}
                   class="h-4 w-4 text-amber-600 rounded">
            <span class="text-sm text-gray-700">Breakfast Included</span>
          </label>
        </div>
        
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Breakfast Notes</label>
          <input type="text" name="breakfast_notes" value="${rate.breakfast_notes || ""}"
                 class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm">
        </div>
        <!-- ADD THIS - Additional Information field -->
<div class="mt-4">
  <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
    <i class="fas fa-info-circle text-amber-500"></i>
    Additional Information
  </label>
  <textarea name="additional_info" rows="4"
            class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm"
            placeholder="Check-in time: 2:00 PM
Check-out time: 12:00 PM
Free WiFi available
Pool access: 6:00 AM - 8:00 PM
Parking: Free
Children policy: Welcome
Pets: Not allowed">${rate.additional_info || ""}</textarea>
  <p class="text-xs text-gray-500 mt-1">One item per line for better formatting</p>
</div>
        <div class="mt-4">
          <label class="flex items-center gap-2">
            <input type="checkbox" name="is_promo" value="true" ${rate.is_promo ? "checked" : ""}
                   class="h-4 w-4 text-amber-600 rounded">
            <span class="text-sm text-gray-700">Is Promo Rate</span>
          </label>
        </div>
        
        <div id="promo-fields" class="${rate.is_promo ? "" : "hidden"} space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Promo Name</label>
            <input type="text" name="promo_name" value="${rate.promo_name || ""}"
                   class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Validity Date</label>
            <input type="date" name="validity_date" value="${rate.validity_date || ""}"
                   class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm">
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 pt-6 border-t border-gray-100">
          <button type="button" onclick="this.closest('.fixed').remove()"
                  class="px-5 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit"
                  class="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg text-sm font-semibold hover:from-amber-700 hover:to-orange-700">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Toggle promo fields
  const isPromoCheckbox = modal.querySelector('input[name="is_promo"]');
  const promoFields = modal.querySelector("#promo-fields");
  if (isPromoCheckbox) {
    isPromoCheckbox.addEventListener("change", function () {
      if (this.checked) {
        promoFields.classList.remove("hidden");
      } else {
        promoFields.classList.add("hidden");
      }
    });
  }

  const form = document.getElementById("editPackageRateForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    const rateData = {
      package_id: parseInt(formData.get("package_id")),
      hotel_category_id: parseInt(formData.get("hotel_category_id")),
      season: formData.get("season") || null,
      sneak: formData.get("sneak") || null,
      // Regular rates
      rate_solo: formData.get("rate_solo")
        ? parseFloat(formData.get("rate_solo"))
        : null,
      rate_2pax: formData.get("rate_2pax")
        ? parseFloat(formData.get("rate_2pax"))
        : null,
      rate_3pax: formData.get("rate_3pax")
        ? parseFloat(formData.get("rate_3pax"))
        : null,
      rate_4pax: formData.get("rate_4pax")
        ? parseFloat(formData.get("rate_4pax"))
        : null,
      rate_5pax: formData.get("rate_5pax")
        ? parseFloat(formData.get("rate_5pax"))
        : null,
      rate_6pax: formData.get("rate_6pax")
        ? parseFloat(formData.get("rate_6pax"))
        : null,
      rate_7pax: formData.get("rate_7pax")
        ? parseFloat(formData.get("rate_7pax"))
        : null,
      rate_8pax: formData.get("rate_8pax")
        ? parseFloat(formData.get("rate_8pax"))
        : null,
      rate_9pax: formData.get("rate_9pax")
        ? parseFloat(formData.get("rate_9pax"))
        : null,
      rate_10pax: formData.get("rate_10pax")
        ? parseFloat(formData.get("rate_10pax"))
        : null,
      rate_11pax: formData.get("rate_11pax")
        ? parseFloat(formData.get("rate_11pax"))
        : null,
      rate_12pax: formData.get("rate_12pax")
        ? parseFloat(formData.get("rate_12pax"))
        : null,
      rate_13pax: formData.get("rate_13pax")
        ? parseFloat(formData.get("rate_13pax"))
        : null,
      rate_14pax: formData.get("rate_14pax")
        ? parseFloat(formData.get("rate_14pax"))
        : null,
      rate_15pax: formData.get("rate_15pax")
        ? parseFloat(formData.get("rate_15pax"))
        : null,
      rate_child_no_breakfast: formData.get("rate_child_no_breakfast")
        ? parseFloat(formData.get("rate_child_no_breakfast"))
        : null,
      // Extra night rates
      extra_night_solo: formData.get("extra_night_solo")
        ? parseFloat(formData.get("extra_night_solo"))
        : null,
      extra_night_2pax: formData.get("extra_night_2pax")
        ? parseFloat(formData.get("extra_night_2pax"))
        : null,
      extra_night_3pax: formData.get("extra_night_3pax")
        ? parseFloat(formData.get("extra_night_3pax"))
        : null,
      extra_night_4pax: formData.get("extra_night_4pax")
        ? parseFloat(formData.get("extra_night_4pax"))
        : null,
      extra_night_5pax: formData.get("extra_night_5pax")
        ? parseFloat(formData.get("extra_night_5pax"))
        : null,
      extra_night_6pax: formData.get("extra_night_6pax")
        ? parseFloat(formData.get("extra_night_6pax"))
        : null,
      extra_night_7pax: formData.get("extra_night_7pax")
        ? parseFloat(formData.get("extra_night_7pax"))
        : null,
      extra_night_8pax: formData.get("extra_night_8pax")
        ? parseFloat(formData.get("extra_night_8pax"))
        : null,
      extra_night_9pax: formData.get("extra_night_9pax")
        ? parseFloat(formData.get("extra_night_9pax"))
        : null,
      extra_night_10pax: formData.get("extra_night_10pax")
        ? parseFloat(formData.get("extra_night_10pax"))
        : null,
      extra_night_11pax: formData.get("extra_night_11pax")
        ? parseFloat(formData.get("extra_night_11pax"))
        : null,
      extra_night_12pax: formData.get("extra_night_12pax")
        ? parseFloat(formData.get("extra_night_12pax"))
        : null,
      extra_night_13pax: formData.get("extra_night_13pax")
        ? parseFloat(formData.get("extra_night_13pax"))
        : null,
      extra_night_14pax: formData.get("extra_night_14pax")
        ? parseFloat(formData.get("extra_night_14pax"))
        : null,
      extra_night_15pax: formData.get("extra_night_15pax")
        ? parseFloat(formData.get("extra_night_15pax"))
        : null,
      extra_night_child_no_breakfast: formData.get(
        "extra_night_child_no_breakfast",
      )
        ? parseFloat(formData.get("extra_night_child_no_breakfast"))
        : null,
      breakfast_included: formData.get("breakfast_included") === "true",
      breakfast_notes: formData.get("breakfast_notes") || null,
      is_promo: formData.get("is_promo") === "true",
      promo_name: formData.get("promo_name") || null,
      validity_date: formData.get("validity_date") || null,
    };

    const result = await savePackageHotelRate(rateData);
    if (result) {
      modal.remove();
      showToast("✅ Rate updated successfully!", "success");
    }
  });
}

// =====================================================
// CONFIRMATION WRAPPERS
// =====================================================

export function confirmDeleteHotelCategory(id) {
  deleteHotelCategory(id);
}

export function confirmDeleteHotel(id) {
  deleteHotel(id);
}

export function confirmDeleteOptionalTour(id) {
  deleteOptionalTour(id);
}
// Add this function to destinations.js
// Add this function to destinations.js
window.showRateInfo = function (rateId) {
  // Find the rate
  let rate = null;
  let pkg = null;
  let category = null;

  for (const dest of state.destinations) {
    for (const p of dest.packages || []) {
      const found = p.package_hotel_rates?.find((r) => r.id === rateId);
      if (found) {
        rate = found;
        pkg = p;
        category = dest.hotel_categories?.find(
          (c) => c.id === rate.hotel_category_id,
        );
        break;
      }
    }
  }

  if (!rate || !rate.additional_info) {
    showToast("No additional information available", "info");
    return;
  }

  // Parse additional info (split by line)
  const infoLines = rate.additional_info
    .split("\n")
    .filter((line) => line.trim());

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
      <div class="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 rounded-t-2xl">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-bold text-white">Additional Information</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
        </div>
        <p class="text-indigo-100 text-sm mt-1">${pkg?.package_name} • ${category?.category_name || "Hotel"}</p>
      </div>
      
      <div class="p-6">
        <div class="space-y-3 max-h-96 overflow-y-auto">
          ${infoLines
            .map((line) => {
              // Try to format nicely if it contains a colon
              if (line.includes(":")) {
                const [label, value] = line.split(":").map((s) => s.trim());
                return `
                <div class="border-b border-gray-100 pb-2">
                  <span class="text-xs font-semibold text-gray-600 block">${label}:</span>
                  <span class="text-sm text-gray-800">${value || "Not specified"}</span>
                </div>
              `;
              } else {
                return `
                <div class="border-b border-gray-100 pb-2">
                  <span class="text-sm text-gray-800">${line}</span>
                </div>
              `;
              }
            })
            .join("")}
        </div>
        
        <div class="flex justify-end mt-6 pt-4 border-t border-gray-200">
          <button onclick="this.closest('.fixed').remove()"
                  class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
            Close
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
};
// Add these helper functions inside openEditPackageModal, after modal.innerHTML definition
// but before the form submit handler

// =====================================================
// ITINERARY HELPER FUNCTIONS
// =====================================================

// Function to update day count display
function updateDayCount() {
  const container = document.getElementById("itineraryContainer");
  if (!container) return;

  const days = container.children.length;
  const totalDaysSpan = document.getElementById("totalDays");
  if (totalDaysSpan) {
    totalDaysSpan.textContent = days;
  }
}

// Function to remove itinerary day
window.removeItineraryDay = function (button) {
  const dayDiv = button.closest("[data-day]");
  if (dayDiv) {
    dayDiv.remove();
    // Renumber remaining days
    const container = document.getElementById("itineraryContainer");
    if (container) {
      const days = container.children;
      for (let i = 0; i < days.length; i++) {
        const daySpan = days[i].querySelector("span:first-child");
        const textarea = days[i].querySelector("textarea");
        if (daySpan && textarea) {
          const newDayNum = i + 1;
          daySpan.textContent = `Day ${newDayNum}:`;
          textarea.name = `itineraries[${newDayNum}]`;
          textarea.placeholder = `Enter detailed itinerary for day ${newDayNum}...`;
          days[i].setAttribute("data-day", newDayNum);
        }
      }
    }
    updateDayCount();
  }
};

// Function to add itinerary day
window.addItineraryDayEdit = function () {
  const container = document.getElementById("itineraryContainer");
  if (!container) return;

  const dayCount = container.children.length + 1;
  const dayHtml = `
    <div class="flex items-start gap-2 bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-amber-300 transition-colors" data-day="${dayCount}">
      <span class="text-xs font-bold text-gray-600 w-12 pt-2 flex-shrink-0">Day ${dayCount}:</span>
      <textarea name="itineraries[${dayCount}]" rows="6" 
                class="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 resize-y min-h-[150px] whitespace-pre-wrap font-mono leading-relaxed"
                placeholder="Enter detailed itinerary for day ${dayCount}..."></textarea>
      <button type="button" onclick="removeItineraryDay(this)" class="text-red-500 hover:text-red-700 p-2 flex-shrink-0">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  container.insertAdjacentHTML("beforeend", dayHtml);
  updateDayCount();
};

// =====================================================
// INCLUSIONS HELPER FUNCTIONS
// =====================================================

// Add new inclusion
window.addNewInclusion = function () {
  const input = document.getElementById("new-inclusion-input");
  if (input) {
    input.classList.remove("hidden");
    const textarea = document.getElementById("new-inclusion-text");
    if (textarea) textarea.focus();
  }
};

// Cancel new inclusion
window.cancelNewInclusion = function () {
  const input = document.getElementById("new-inclusion-input");
  const textarea = document.getElementById("new-inclusion-text");
  if (input) input.classList.add("hidden");
  if (textarea) textarea.value = "";
};

// Save new inclusion
window.saveNewInclusion = async function (packageId) {
  const textarea = document.getElementById("new-inclusion-text");
  if (!textarea) return;

  const text = textarea.value.trim();
  if (!text) {
    showToast("Please enter inclusion text", "warning");
    return;
  }

  try {
    showLoading(true, "Adding inclusion...");

    const { error } = await supabase.from("package_inclusions").insert([
      {
        package_id: packageId,
        inclusion_text: text,
        display_order: 999,
      },
    ]);

    if (error) throw error;

    await fetchDestinations();
    showToast("✅ Inclusion added successfully!", "success");

    // Refresh the modal
    const modal = document.getElementById("editPackageModal");
    if (modal) {
      modal.remove();
      await openEditPackageModal(packageId);
    }
  } catch (error) {
    console.error("Error adding inclusion:", error);
    showToast("❌ Failed to add inclusion: " + error.message, "error");
  } finally {
    showLoading(false);
  }
};

// Delete single inclusion
window.deletePackageInclusion = async function (id) {
  showConfirmDialog("Delete this inclusion?", async () => {
    try {
      showLoading(true, "Deleting inclusion...");
      const { error } = await supabase
        .from("package_inclusions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await fetchDestinations();
      showToast("✅ Inclusion deleted successfully!", "success");

      // Refresh the modal
      const modal = document.getElementById("editPackageModal");
      if (modal) {
        const packageId = modal.querySelector('[name="package_id"]')?.value;
        if (packageId) {
          modal.remove();
          await openEditPackageModal(parseInt(packageId));
        }
      }
    } catch (error) {
      console.error("Error deleting inclusion:", error);
      showToast("❌ Failed to delete inclusion: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  });
};

// =====================================================
// EXCLUSIONS HELPER FUNCTIONS
// =====================================================

// Add new exclusion
window.addNewExclusion = function () {
  const input = document.getElementById("new-exclusion-input");
  if (input) {
    input.classList.remove("hidden");
    const textarea = document.getElementById("new-exclusion-text");
    if (textarea) textarea.focus();
  }
};

// Cancel new exclusion
window.cancelNewExclusion = function () {
  const input = document.getElementById("new-exclusion-input");
  const textarea = document.getElementById("new-exclusion-text");
  if (input) input.classList.add("hidden");
  if (textarea) textarea.value = "";
};

// Save new exclusion
window.saveNewExclusion = async function (packageId) {
  const textarea = document.getElementById("new-exclusion-text");
  if (!textarea) return;

  const text = textarea.value.trim();
  if (!text) {
    showToast("Please enter exclusion text", "warning");
    return;
  }

  try {
    showLoading(true, "Adding exclusion...");

    const { error } = await supabase.from("package_exclusions").insert([
      {
        package_id: packageId,
        exclusion_text: text,
        display_order: 999,
      },
    ]);

    if (error) throw error;

    await fetchDestinations();
    showToast("✅ Exclusion added successfully!", "success");

    // Refresh the modal
    const modal = document.getElementById("editPackageModal");
    if (modal) {
      modal.remove();
      await openEditPackageModal(packageId);
    }
  } catch (error) {
    console.error("Error adding exclusion:", error);
    showToast("❌ Failed to add exclusion: " + error.message, "error");
  } finally {
    showLoading(false);
  }
};

// Delete single exclusion
window.deletePackageExclusion = async function (id) {
  showConfirmDialog("Delete this exclusion?", async () => {
    try {
      showLoading(true, "Deleting exclusion...");
      const { error } = await supabase
        .from("package_exclusions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await fetchDestinations();
      showToast("✅ Exclusion deleted successfully!", "success");

      // Refresh the modal
      const modal = document.getElementById("editPackageModal");
      if (modal) {
        const packageId = modal.querySelector('[name="package_id"]')?.value;
        if (packageId) {
          modal.remove();
          await openEditPackageModal(parseInt(packageId));
        }
      }
    } catch (error) {
      console.error("Error deleting exclusion:", error);
      showToast("❌ Failed to delete exclusion: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  });
};

// =====================================================
// BULK SELECTION FUNCTIONS
// =====================================================

// Toggle all inclusion checkboxes
window.toggleAllInclusions = function (selectAllCheckbox) {
  const checkboxes = document.querySelectorAll(".inclusion-checkbox");
  checkboxes.forEach((cb) => (cb.checked = selectAllCheckbox.checked));
};

// Toggle all exclusion checkboxes
window.toggleAllExclusions = function (selectAllCheckbox) {
  const checkboxes = document.querySelectorAll(".exclusion-checkbox");
  checkboxes.forEach((cb) => (cb.checked = selectAllCheckbox.checked));
};

// Delete selected inclusions
window.deleteSelectedInclusions = async function (packageId) {
  const selectedCheckboxes = document.querySelectorAll(
    ".inclusion-checkbox:checked",
  );
  const selectedIds = Array.from(selectedCheckboxes).map((cb) =>
    parseInt(cb.value),
  );

  if (selectedIds.length === 0) {
    showToast("No inclusions selected", "warning");
    return;
  }

  showConfirmDialog(
    `Delete ${selectedIds.length} selected inclusion(s)?`,
    async () => {
      try {
        showLoading(true, "Deleting selected inclusions...");

        const { error } = await supabase
          .from("package_inclusions")
          .delete()
          .in("id", selectedIds);

        if (error) throw error;

        await fetchDestinations();
        showToast(
          `✅ ${selectedIds.length} inclusion(s) deleted successfully!`,
          "success",
        );

        // Refresh the modal
        const modal = document.getElementById("editPackageModal");
        if (modal) {
          modal.remove();
          await openEditPackageModal(packageId);
        }
      } catch (error) {
        console.error("Error deleting inclusions:", error);
        showToast("❌ Failed to delete inclusions: " + error.message, "error");
      } finally {
        showLoading(false);
      }
    },
  );
};

// Delete selected exclusions
window.deleteSelectedExclusions = async function (packageId) {
  const selectedCheckboxes = document.querySelectorAll(
    ".exclusion-checkbox:checked",
  );
  const selectedIds = Array.from(selectedCheckboxes).map((cb) =>
    parseInt(cb.value),
  );

  if (selectedIds.length === 0) {
    showToast("No exclusions selected", "warning");
    return;
  }

  showConfirmDialog(
    `Delete ${selectedIds.length} selected exclusion(s)?`,
    async () => {
      try {
        showLoading(true, "Deleting selected exclusions...");

        const { error } = await supabase
          .from("package_exclusions")
          .delete()
          .in("id", selectedIds);

        if (error) throw error;

        await fetchDestinations();
        showToast(
          `✅ ${selectedIds.length} exclusion(s) deleted successfully!`,
          "success",
        );

        // Refresh the modal
        const modal = document.getElementById("editPackageModal");
        if (modal) {
          modal.remove();
          await openEditPackageModal(packageId);
        }
      } catch (error) {
        console.error("Error deleting exclusions:", error);
        showToast("❌ Failed to delete exclusions: " + error.message, "error");
      } finally {
        showLoading(false);
      }
    },
  );
};
// Add this function to update the day count display
window.updateDayCount = function () {
  const container = document.getElementById("itineraryContainer");
  if (!container) return;

  const days = container.children.length;
  const totalDaysSpan = document.getElementById("totalDays");
  if (totalDaysSpan) {
    totalDaysSpan.textContent = days;
  }
  console.log(`📅 Day count updated: ${days} days`);
};

// Update the removeItineraryDay function to call updateDayCount
window.removeItineraryDay = function (button) {
  const dayDiv = button.closest("[data-day]");
  if (dayDiv) {
    dayDiv.remove();
    // Renumber remaining days
    const container = document.getElementById("itineraryContainer");
    if (container) {
      const days = container.children;
      for (let i = 0; i < days.length; i++) {
        const daySpan = days[i].querySelector("span:first-child");
        const textarea = days[i].querySelector("textarea");
        if (daySpan && textarea) {
          const newDayNum = i + 1;
          daySpan.textContent = `Day ${newDayNum}:`;
          textarea.name = `itineraries[${newDayNum}]`;
          textarea.placeholder = `Enter detailed itinerary for day ${newDayNum}...`;
          days[i].setAttribute("data-day", newDayNum);
        }
      }
    }
    window.updateDayCount(); // Call the function to update display
  }
};

// Update the addItineraryDayEdit function to call updateDayCount
window.addItineraryDayEdit = function () {
  const container = document.getElementById("itineraryContainer");
  if (!container) return;

  const dayCount = container.children.length + 1;
  const dayHtml = `
    <div class="flex items-start gap-2 bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-amber-300 transition-colors" data-day="${dayCount}">
      <span class="text-xs font-bold text-gray-600 w-12 pt-2 flex-shrink-0">Day ${dayCount}:</span>
      <textarea name="itineraries[${dayCount}]" rows="6" 
                class="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 resize-y min-h-[150px] whitespace-pre-wrap font-mono leading-relaxed"
                placeholder="Enter detailed itinerary for day ${dayCount}..."></textarea>
      <button type="button" onclick="removeItineraryDay(this)" class="text-red-500 hover:text-red-700 p-2 flex-shrink-0">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  container.insertAdjacentHTML("beforeend", dayHtml);
  window.updateDayCount(); // Call the function to update display
};
// =====================================================
// WINDOW EXPORTS
// =====================================================

// Make sure all functions are available globally
window.viewDestinationDetails = viewDestinationDetails;
window.renderDestinations = renderDestinations;
window.refreshDestinationsPage = refreshDestinationsPage;
window.updateOptionalTour = updateOptionalTour;
window.openCreateDestinationModal = openCreateDestinationModal;
window.openEditDestinationModal = openEditDestinationModal;
window.openCreatePackageModal = openCreatePackageModal;
window.openEditPackageModal = openEditPackageModal;
window.openBulkRateEditModal = openBulkRateEditModal;
window.openEditPackageRateModal = openEditPackageRateModal;
window.updateOptionalTourRates = updateOptionalTourRates;
window.openCreateHotelCategoryModal = openCreateHotelCategoryModal;
window.openEditHotelCategoryModal = openEditHotelCategoryModal;
window.openCreateHotelModalWithCategory = openCreateHotelModalWithCategory;
window.openEditHotelModal = openEditHotelModal;
window.unlinkTourFromPackage = unlinkTourFromPackage;
window.openCreateOptionalTourModal = openCreateOptionalTourModal;
window.openEditOptionalTourModal = openEditOptionalTourModal;
window.openEditTourRatesModal = openEditTourRatesModal;
window.viewOptionalTourDetails = viewOptionalTourDetails;
window.duplicateOptionalTour = duplicateOptionalTour;
window.linkTourToPackage = linkTourToPackage;
window.getDestinationImage = getDestinationImage;
window.uploadDestinationImage = uploadDestinationImage;
window.setPrimaryImage = setPrimaryImage;
window.deleteImage = deleteImage;
window.showImageUploadModal = showImageUploadModal;
window.fetchDestinationImages = fetchDestinationImages;
window.uploadImage = uploadImage;
window.addUnsplashImage = addUnsplashImage;
window.addImageFromUrl = addImageFromUrl;
window.fetchOptionalTourRates = fetchOptionalTourRates;
window.toggleAllCheckboxes = toggleAllCheckboxes;
window.deleteSelectedItems = deleteSelectedItems;
window.fetchOptionalTourById = fetchOptionalTourById;
window.addNewInclusion = addNewInclusion;
window.cancelNewInclusion = cancelNewInclusion;
window.saveNewInclusion = saveNewInclusion;
window.editInclusion = editInclusion;
window.addNewExclusion = addNewExclusion;
window.cancelNewExclusion = cancelNewExclusion;
window.saveNewExclusion = saveNewExclusion;
window.editExclusion = editExclusion;
window.addItineraryDayEdit = addItineraryDayEdit;
window.getAvailableToursForPackage = getAvailableToursForPackage;
window.confirmDeleteHotelCategory = confirmDeleteHotelCategory;
window.confirmDeleteHotel = confirmDeleteHotel;
window.confirmDeleteOptionalTour = confirmDeleteOptionalTour;
window.deletePackageInclusion = deletePackageInclusion;
window.deletePackageExclusion = deletePackageExclusion;
window.deletePackageItinerary = deletePackageItinerary;
window.confirmDeleteDestination = deleteDestination;
window.confirmDeletePackage = confirmDeletePackage;
window.confirmDeletePackageHotelRate = deletePackageHotelRate;
window.openAddMultipleToursToPackageModal = openAddMultipleToursToPackageModal;
window.showRateInfo = showRateInfo;
