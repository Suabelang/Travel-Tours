// =====================================================
// TABLE FORMATS MODULE - COMPLETE CRUD OPERATIONS
// =====================================================

import {
  supabase,
  showToast,
  showConfirmDialog,
  showLoading,
} from "../js/config_admin.js";

// Import viewDestinationDetails from destinations
import { viewDestinationDetails } from "./destinations.js";

// =====================================================
// GLOBAL CACHE CLEANUP
// =====================================================

// Clear any cached Supabase requests
const originalFetch = window.fetch;
window.fetch = function (...args) {
  // Log all Supabase requests for debugging
  if (typeof args[0] === "string" && args[0].includes("supabase")) {
    console.log("🌐 Supabase Request:", args[0]);
  }
  return originalFetch.apply(this, args);
};

// =====================================================
// TABLE FORMAT CRUD OPERATIONS
// =====================================================

// UPDATE - Update column definition
export async function updateColumnDefinition(columnId, columnData) {
  try {
    showLoading(true, "Updating column...");

    const { error } = await supabase
      .from("rate_column_definitions")
      .update({
        column_label: columnData.column_label,
        column_type: columnData.column_type,
        pax_count: columnData.pax_count ? parseInt(columnData.pax_count) : null,
        room_configuration: columnData.room_configuration || null,
        child_age_min: columnData.child_age_min
          ? parseInt(columnData.child_age_min)
          : null,
        child_age_max: columnData.child_age_max
          ? parseInt(columnData.child_age_max)
          : null,
        is_extra_night: columnData.is_extra_night === true,
        display_order: columnData.display_order,
        updated_at: new Date(),
      })
      .eq("id", columnId);

    if (error) throw error;

    showToast("✅ Column updated successfully!", "success");
    return true;
  } catch (error) {
    console.error("Error updating column:", error);
    showToast("❌ Failed to update column: " + error.message, "error");
    return false;
  } finally {
    showLoading(false);
  }
}

// CREATE - New table format
export async function createTableFormat(formData) {
  try {
    showLoading(true, "Creating table format...");

    const columns = JSON.parse(formData.columns);
    const destinationId = parseInt(formData.destination_id);
    const formatName = formData.format_name;
    const description = formData.description || null;

    // Validate each column before inserting
    for (const col of columns) {
      if (col.column_type === "pax") {
        if (
          !col.pax_count ||
          parseInt(col.pax_count) < 1 ||
          parseInt(col.pax_count) > 20
        ) {
          throw new Error(
            `Column "${col.column_label}" requires a valid pax count (1-20)`,
          );
        }
      }
    }

    // Insert all columns for this format
    const inserts = columns.map((col, index) => ({
      destination_id: destinationId,
      format_name: formatName,
      format_description: description,
      column_key: col.column_key,
      column_label: col.column_label,
      column_type: col.column_type || "pax",
      pax_count:
        col.column_type === "pax" && col.pax_count
          ? parseInt(col.pax_count)
          : null,
      room_configuration: col.room_configuration || null,
      child_age_min: col.child_age_min ? parseInt(col.child_age_min) : null,
      child_age_max: col.child_age_max ? parseInt(col.child_age_max) : null,
      is_extra_night: col.is_extra_night === true,
      display_order: index,
      is_active: true,
    }));

    const { data, error } = await supabase
      .from("rate_column_definitions")
      .insert(inserts)
      .select();

    if (error) {
      if (error.code === "23505") {
        throw new Error("A column with this key already exists");
      }
      throw error;
    }

    showToast(
      `✅ Table format "${formatName}" created with ${columns.length} columns!`,
      "success",
    );
    return data;
  } catch (error) {
    console.error("Error creating table format:", error);
    showToast("❌ Failed to create table format: " + error.message, "error");
    return null;
  } finally {
    showLoading(false);
  }
}

// READ - Fetch all table formats for a destination (active only)
export async function fetchTableFormats(destinationId) {
  try {
    const { data, error } = await supabase
      .from("rate_column_definitions")
      .select("*")
      .eq("destination_id", destinationId)
      .eq("is_active", true)
      .order("format_name")
      .order("is_extra_night")
      .order("display_order");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching table formats:", error);
    return [];
  }
}

// READ - Fetch all table formats including inactive (for debugging)
export async function fetchAllTableFormats(destinationId) {
  try {
    const { data, error } = await supabase
      .from("rate_column_definitions")
      .select("*")
      .eq("destination_id", destinationId)
      .order("format_name")
      .order("is_active")
      .order("display_order");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching all table formats:", error);
    return [];
  }
}

// FIXED - Fetch table format by name with better search
export async function fetchTableFormatByName(destinationId, formatName) {
  try {
    console.log(
      `🔍 Fetching format: "${formatName}" for destination: ${destinationId}`,
    );

    // Validate inputs
    if (!destinationId || !formatName) {
      console.error("Missing destinationId or formatName");
      return [];
    }

    // Clean the format name - remove any extra spaces
    const cleanFormatName = formatName.trim();

    // First try exact match with active=true
    const { data: exactMatches, error: exactError } = await supabase
      .from("rate_column_definitions")
      .select("*")
      .eq("destination_id", destinationId)
      .eq("format_name", cleanFormatName)
      .eq("is_active", true)
      .order("is_extra_night")
      .order("display_order");

    if (exactError) {
      console.error("Error in exact match:", exactError);
      throw exactError;
    }

    // If we found exact matches, return them
    if (exactMatches && exactMatches.length > 0) {
      console.log(
        `✅ Found ${exactMatches.length} active columns for "${cleanFormatName}"`,
      );
      return exactMatches;
    }

    // If no exact matches, try case-insensitive search
    console.log(
      `⚠️ No exact matches, trying case-insensitive search for "${cleanFormatName}"`,
    );

    const { data: caseInsensitiveMatches, error: caseError } = await supabase
      .from("rate_column_definitions")
      .select("*")
      .eq("destination_id", destinationId)
      .ilike("format_name", cleanFormatName)
      .eq("is_active", true)
      .order("is_extra_night")
      .order("display_order");

    if (caseError) {
      console.error("Error in case-insensitive search:", caseError);
      throw caseError;
    }

    if (caseInsensitiveMatches && caseInsensitiveMatches.length > 0) {
      console.log(
        `✅ Found ${caseInsensitiveMatches.length} case-insensitive matches for "${cleanFormatName}"`,
      );
      return caseInsensitiveMatches;
    }

    // If still no matches, try searching with % wildcards
    console.log(
      `⚠️ No case-insensitive matches, trying wildcard search for "%${cleanFormatName}%"`,
    );

    const { data: wildcardMatches, error: wildcardError } = await supabase
      .from("rate_column_definitions")
      .select("*")
      .eq("destination_id", destinationId)
      .ilike("format_name", `%${cleanFormatName}%`)
      .eq("is_active", true)
      .order("is_extra_night")
      .order("display_order");

    if (wildcardError) {
      console.error("Error in wildcard search:", wildcardError);
      throw wildcardError;
    }

    if (wildcardMatches && wildcardMatches.length > 0) {
      console.log(
        `✅ Found ${wildcardMatches.length} wildcard matches for "%${cleanFormatName}%"`,
      );
      return wildcardMatches;
    }

    // If still no matches, check if there are any formats at all for this destination
    console.log(`❌ No active formats found for "${cleanFormatName}"`);

    const { data: allFormats, error: allError } = await supabase
      .from("rate_column_definitions")
      .select("format_name, is_active")
      .eq("destination_id", destinationId);

    if (allError) {
      console.error("Error fetching all formats:", allError);
    } else {
      const activeFormats = [
        ...new Set(
          allFormats?.filter((f) => f.is_active).map((f) => f.format_name) ||
            [],
        ),
      ];
      const inactiveFormats = [
        ...new Set(
          allFormats?.filter((f) => !f.is_active).map((f) => f.format_name) ||
            [],
        ),
      ];

      console.log("📋 Active formats for this destination:", activeFormats);
      console.log("📋 Inactive (soft-deleted) formats:", inactiveFormats);

      if (inactiveFormats.length > 0) {
        console.log(
          `💡 Tip: Format "${cleanFormatName}" might be soft-deleted. Use fixOrphanedTableFormat() to restore it.`,
        );
      }
    }

    return [];
  } catch (error) {
    console.error("Error in fetchTableFormatByName:", error);
    return [];
  }
}

// FIXED - Update entire table format without causing conflicts
export async function updateTableFormat(destinationId, formatName, formData) {
  try {
    showLoading(true, "Updating table format...");

    const columns = JSON.parse(formData.columns);
    const description = formData.description || null;

    // Get existing active columns
    const { data: existingColumns } = await supabase
      .from("rate_column_definitions")
      .select("id, column_key")
      .eq("destination_id", destinationId)
      .eq("format_name", formatName)
      .eq("is_active", true);

    // Create a map of existing column keys to their IDs
    const existingColumnMap = {};
    existingColumns?.forEach((col) => {
      existingColumnMap[col.column_key] = col.id;
    });

    // Process each column from the form
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const existingId = existingColumnMap[col.column_key];

      if (existingId) {
        // Update existing column
        const { error } = await supabase
          .from("rate_column_definitions")
          .update({
            column_label: col.column_label,
            column_type: col.column_type || "pax",
            pax_count:
              col.column_type === "pax" && col.pax_count
                ? parseInt(col.pax_count)
                : null,
            room_configuration: col.room_configuration || null,
            child_age_min: col.child_age_min
              ? parseInt(col.child_age_min)
              : null,
            child_age_max: col.child_age_max
              ? parseInt(col.child_age_max)
              : null,
            is_extra_night: col.is_extra_night === true,
            display_order: i,
            format_description: description,
            updated_at: new Date(),
          })
          .eq("id", existingId);

        if (error) throw error;

        // Remove from map to track what's been processed
        delete existingColumnMap[col.column_key];
      } else {
        // Check if there's a soft-deleted column with this key
        const { data: softDeleted } = await supabase
          .from("rate_column_definitions")
          .select("id")
          .eq("destination_id", destinationId)
          .eq("format_name", formatName)
          .eq("column_key", col.column_key)
          .eq("is_active", false)
          .maybeSingle();

        if (softDeleted) {
          // Reactivate and update the soft-deleted column
          const { error } = await supabase
            .from("rate_column_definitions")
            .update({
              column_label: col.column_label,
              column_type: col.column_type || "pax",
              pax_count:
                col.column_type === "pax" && col.pax_count
                  ? parseInt(col.pax_count)
                  : null,
              room_configuration: col.room_configuration || null,
              child_age_min: col.child_age_min
                ? parseInt(col.child_age_min)
                : null,
              child_age_max: col.child_age_max
                ? parseInt(col.child_age_max)
                : null,
              is_extra_night: col.is_extra_night === true,
              display_order: i,
              format_description: description,
              is_active: true,
              updated_at: new Date(),
            })
            .eq("id", softDeleted.id);

          if (error) throw error;
        } else {
          // Insert new column
          const { error } = await supabase
            .from("rate_column_definitions")
            .insert({
              destination_id: parseInt(destinationId),
              format_name: formatName,
              format_description: description,
              column_key: col.column_key,
              column_label: col.column_label,
              column_type: col.column_type || "pax",
              pax_count:
                col.column_type === "pax" && col.pax_count
                  ? parseInt(col.pax_count)
                  : null,
              room_configuration: col.room_configuration || null,
              child_age_min: col.child_age_min
                ? parseInt(col.child_age_min)
                : null,
              child_age_max: col.child_age_max
                ? parseInt(col.child_age_max)
                : null,
              is_extra_night: col.is_extra_night === true,
              display_order: i,
              is_active: true,
            });

          if (error) throw error;
        }
      }
    }

    // Soft delete any remaining columns (ones that were in the original but not in the update)
    const remainingIds = Object.values(existingColumnMap);
    if (remainingIds.length > 0) {
      const { error } = await supabase
        .from("rate_column_definitions")
        .update({
          is_active: false,
          updated_at: new Date(),
        })
        .in("id", remainingIds);

      if (error) throw error;
    }

    showToast(`✅ Table format "${formatName}" updated!`, "success");
    return true;
  } catch (error) {
    console.error("Error updating table format:", error);
    showToast("❌ Failed to update table format: " + error.message, "error");
    return false;
  } finally {
    showLoading(false);
  }
}

// Soft delete entire table format
export async function deleteTableFormat(destinationId, formatName) {
  showConfirmDialog(
    `⚠️ Are you sure you want to delete the format "${formatName}"? This will affect all packages using this format.`,
    async () => {
      try {
        showLoading(true, "Deleting table format...");

        const { error } = await supabase
          .from("rate_column_definitions")
          .update({ is_active: false })
          .eq("destination_id", destinationId)
          .eq("format_name", formatName);

        if (error) throw error;

        showToast(`✅ Format "${formatName}" deleted!`, "success");
        return true;
      } catch (error) {
        console.error("Error deleting table format:", error);
        showToast(
          "❌ Failed to delete table format: " + error.message,
          "error",
        );
        return false;
      } finally {
        showLoading(false);
      }
    },
  );
}

// Reactivate a soft-deleted format
export async function reactivateTableFormat(destinationId, formatName) {
  try {
    showLoading(true, "Reactivating table format...");

    const { error } = await supabase
      .from("rate_column_definitions")
      .update({ is_active: true })
      .eq("destination_id", destinationId)
      .eq("format_name", formatName);

    if (error) throw error;

    showToast(`✅ Format "${formatName}" reactivated!`, "success");
    return true;
  } catch (error) {
    console.error("Error reactivating format:", error);
    showToast("❌ Failed to reactivate format: " + error.message, "error");
    return false;
  } finally {
    showLoading(false);
  }
}

// Fix orphaned format (reactivate soft-deleted records)
export async function fixOrphanedTableFormat(destinationId, formatName) {
  try {
    showLoading(true, "Fixing table format...");

    const { error } = await supabase
      .from("rate_column_definitions")
      .update({ is_active: true })
      .eq("destination_id", destinationId)
      .eq("format_name", formatName);

    if (error) throw error;

    showToast(`✅ Format "${formatName}" restored!`, "success");
    return true;
  } catch (error) {
    console.error("Error fixing format:", error);
    showToast("❌ Failed to fix format: " + error.message, "error");
    return false;
  } finally {
    showLoading(false);
  }
}

// =====================================================
// ASSIGN TABLE FORMAT TO PACKAGE
// =====================================================

export async function assignFormatToPackage(packageId, formatName) {
  try {
    showLoading(true, "Assigning format to package...");

    const { error } = await supabase
      .from("destination_packages")
      .update({
        table_format: formatName,
        updated_at: new Date(),
      })
      .eq("id", packageId);

    if (error) throw error;

    showToast(
      `✅ Table format "${formatName}" assigned to package!`,
      "success",
    );
    return true;
  } catch (error) {
    console.error("Error assigning format:", error);
    showToast("❌ Failed to assign format: " + error.message, "error");
    return false;
  } finally {
    showLoading(false);
  }
}

// =====================================================
// FINAL FIX - WITH CORRECT SYNTAX
// =====================================================

export async function createRateRow(
  packageId,
  hotelCategoryId,
  rowData,
  columns,
) {
  try {
    if (!hotelCategoryId) {
      throw new Error("Hotel Category ID is required");
    }

    const {
      season,
      sneak,
      duration,
      values,
      breakfast_included,
      breakfast_notes,
    } = rowData;

    // Process empty values
    const processedSeason =
      season && season.trim() !== "" ? season.trim() : "N/A";
    const processedSneak = sneak && sneak.trim() !== "" ? sneak.trim() : "N/A";
    const processedDuration =
      duration && duration.trim() !== "" ? duration.trim() : "N/A";

    console.log("Saving row:", {
      packageId,
      hotelCategoryId,
      season: processedSeason,
      sneak: processedSneak,
      duration: processedDuration,
      values,
    });

    const results = [];
    let hasError = false;
    let hasAnyValue = false;

    // Process each column - use SIMPLE upsert first
    for (const col of columns) {
      const value = values[col.column_key];

      if (!value || value.trim() === "") {
        continue;
      }

      hasAnyValue = true;
      const numericValue = parseFloat(value);

      if (isNaN(numericValue)) {
        console.warn(`Invalid number for column ${col.column_key}: ${value}`);
        continue;
      }

      // TRY UPDATE FIRST (mas reliable kung hindi pa updated ang constraint)
      console.log(`Trying to update column ${col.column_key}`);

      const { data: existing, error: selectError } = await supabase
        .from("package_rate_values")
        .select("id")
        .eq("package_id", packageId)
        .eq("hotel_category_id", hotelCategoryId)
        .eq("column_definition_id", col.id)
        .eq("season", processedSeason)
        .eq("sneak", processedSneak)
        .eq("duration", processedDuration)
        .maybeSingle();

      if (selectError) {
        console.error("Error checking existing:", selectError);
        continue;
      }

      if (existing) {
        // UPDATE existing record
        console.log(`Updating existing record ID: ${existing.id}`);

        const { error: updateError } = await supabase
          .from("package_rate_values")
          .update({
            rate_value: numericValue,
            updated_at: new Date(),
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error(
            `Error updating column ${col.column_key}:`,
            updateError,
          );
          hasError = true;
        } else {
          results.push({
            id: existing.id,
            action: "updated",
            column: col.column_key,
          });
        }
      } else {
        // INSERT new record
        console.log(`Inserting new record for column ${col.column_key}`);

        const { data: inserted, error: insertError } = await supabase
          .from("package_rate_values")
          .insert({
            package_id: packageId,
            hotel_category_id: hotelCategoryId,
            column_definition_id: col.id,
            season: processedSeason,
            sneak: processedSneak,
            duration: processedDuration,
            rate_value: numericValue,
            breakfast_included: breakfast_included || false,
            breakfast_notes: breakfast_notes || null,
          })
          .select();

        if (insertError) {
          console.error(
            `Error inserting column ${col.column_key}:`,
            insertError,
          );
          hasError = true;
        } else {
          results.push({
            id: inserted?.[0]?.id,
            action: "inserted",
            column: col.column_key,
          });
        }
      }
    }

    console.log("Save results:", results);

    if (!hasAnyValue) {
      throw new Error("No rate values provided for any column");
    }

    return results.length > 0;
  } catch (error) {
    console.error("Error in createRateRow:", error);
    throw error;
  }
}
// =====================================================
// DIAGNOSTIC FUNCTION - CHECK EXISTING RATES
// =====================================================

export async function debugRates(packageId, hotelCategoryId) {
  try {
    console.log(
      `🔍 Checking rates for package ${packageId}, category ${hotelCategoryId}`,
    );

    const { data, error } = await supabase
      .from("package_rate_values")
      .select(
        `
        id,
        season,
        sneak,
        duration,
        rate_value,
        column_definition:rate_column_definitions(column_key, column_label)
      `,
      )
      .eq("package_id", packageId)
      .eq("hotel_category_id", hotelCategoryId)
      .order("duration")
      .order("column_definition_id");

    if (error) {
      console.error("Error fetching rates:", error);
      return;
    }

    console.log("📊 Existing rates:");

    // Group by duration
    const byDuration = {};
    data.forEach((rate) => {
      if (!byDuration[rate.duration]) {
        byDuration[rate.duration] = [];
      }
      byDuration[rate.duration].push({
        id: rate.id,
        column:
          rate.column_definition?.column_label ||
          rate.column_definition?.column_key,
        value: rate.rate_value,
      });
    });

    console.log("By duration:", byDuration);

    return data;
  } catch (error) {
    console.error("Debug error:", error);
  }
}
// READ - Fetch all rate rows for a package and category
export async function fetchRateRows(packageId, hotelCategoryId) {
  try {
    // If hotelCategoryId is null, return empty array
    if (!hotelCategoryId) {
      return [];
    }

    const { data, error } = await supabase
      .from("package_rate_values")
      .select(
        `
        *,
        column_definition:rate_column_definitions(*)
      `,
      )
      .eq("package_id", packageId)
      .eq("hotel_category_id", hotelCategoryId)
      .order("created_at");

    if (error) throw error;

    // Group by season/sneak/duration combination (each row)
    const rows = {};
    data?.forEach((rate) => {
      const rowKey = `${rate.season || ""}_${rate.sneak || ""}_${rate.duration || ""}`;
      if (!rows[rowKey]) {
        rows[rowKey] = {
          season: rate.season,
          sneak: rate.sneak,
          duration: rate.duration,
          values: {},
          breakfast_included: rate.breakfast_included,
          breakfast_notes: rate.breakfast_notes,
        };
      }
      rows[rowKey].values[rate.column_definition.column_key] = {
        id: rate.id,
        value: rate.rate_value,
      };
    });

    return Object.values(rows);
  } catch (error) {
    console.error("Error fetching rate rows:", error);
    return [];
  }
}

// UPDATE - Update entire rate row
export async function updateRateRow(
  packageId,
  hotelCategoryId,
  oldRowData,
  newRowData,
  columns,
) {
  try {
    showLoading(true, "Updating rate row...");

    // Delete old row
    await supabase
      .from("package_rate_values")
      .delete()
      .eq("package_id", packageId)
      .eq("hotel_category_id", hotelCategoryId)
      .eq("season", oldRowData.season || null)
      .eq("sneak", oldRowData.sneak || null)
      .eq("duration", oldRowData.duration || null);

    // Create new row
    const {
      season,
      sneak,
      duration,
      values,
      breakfast_included,
      breakfast_notes,
    } = newRowData;

    const rateInserts = [];

    for (const col of columns) {
      const value = values[col.column_key];
      if (value && value.trim() !== "") {
        rateInserts.push({
          package_id: packageId,
          hotel_category_id: hotelCategoryId,
          column_definition_id: col.id,
          season: season || null,
          sneak: sneak || null,
          duration: duration || null,
          rate_value: parseFloat(value),
          breakfast_included: breakfast_included || false,
          breakfast_notes: breakfast_notes || null,
        });
      }
    }

    if (rateInserts.length > 0) {
      const { error } = await supabase
        .from("package_rate_values")
        .insert(rateInserts);

      if (error) throw error;
    }

    showToast(`✅ Rate row updated!`, "success");
    return true;
  } catch (error) {
    console.error("Error updating rate row:", error);
    showToast("❌ Failed to update rate row: " + error.message, "error");
    return false;
  } finally {
    showLoading(false);
  }
}

// DELETE - Delete entire rate row
export async function deleteRateRow(
  packageId,
  hotelCategoryId,
  season,
  sneak,
  duration,
) {
  showConfirmDialog("Delete this entire rate row?", async () => {
    try {
      showLoading(true, "Deleting rate row...");

      const { error } = await supabase
        .from("package_rate_values")
        .delete()
        .eq("package_id", packageId)
        .eq("hotel_category_id", hotelCategoryId)
        .eq("season", season || null)
        .eq("sneak", sneak || null)
        .eq("duration", duration || null);

      if (error) throw error;

      showToast("✅ Rate row deleted successfully!", "success");
      return true;
    } catch (error) {
      console.error("Error deleting rate row:", error);
      showToast("❌ Failed to delete rate row: " + error.message, "error");
      return false;
    } finally {
      showLoading(false);
    }
  });
}

// UPDATE - Update single rate cell value
export async function updateRateCell(rateId, newValue) {
  try {
    showLoading(true, "Updating rate...");

    const { error } = await supabase
      .from("package_rate_values")
      .update({
        rate_value: parseFloat(newValue),
        updated_at: new Date(),
      })
      .eq("id", rateId);

    if (error) throw error;

    showToast("✅ Rate updated!", "success");
    return true;
  } catch (error) {
    console.error("Error updating rate:", error);
    showToast("❌ Failed to update rate", "error");
    return false;
  } finally {
    showLoading(false);
  }
}

// DELETE - Delete single rate cell
export async function deleteRateCell(rateId) {
  showConfirmDialog("Delete this rate value?", async () => {
    try {
      showLoading(true, "Deleting rate...");

      const { error } = await supabase
        .from("package_rate_values")
        .delete()
        .eq("id", rateId);

      if (error) throw error;

      showToast("✅ Rate deleted!", "success");
      return true;
    } catch (error) {
      console.error("Error deleting rate:", error);
      showToast("❌ Failed to delete rate", "error");
      return false;
    } finally {
      showLoading(false);
    }
  });
}

// =====================================================
// TABLE FORMAT BUILDER MODAL
// =====================================================

export function openTableFormatBuilderModal(
  destinationId,
  existingFormat = null,
) {
  const isEditMode = !!existingFormat;
  let columnCounter = 0;

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto";

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-6xl w-full my-8 shadow-2xl" style="max-height: 90vh;">
      <!-- Header -->
      <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-emerald-600 to-teal-600 sticky top-0 z-10">
        <div class="relative px-6 py-5">
          <div class="flex items-center gap-4">
            <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
              <i class="fas fa-table text-2xl text-white"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-white">
                ${isEditMode ? "Edit" : "Create New"} Table Format
              </h3>
              <p class="text-emerald-100 text-sm mt-1">
                ${isEditMode ? "Modify your custom rate table" : "Design your own rate table structure"}
              </p>
            </div>
            <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
        </div>
      </div>
      
      <div class="p-6 overflow-y-auto" style="max-height: calc(90vh - 120px);">
        <form id="tableFormatForm" class="space-y-6">
          <input type="hidden" name="destination_id" value="${destinationId}">
          ${isEditMode ? `<input type="hidden" name="format_id" value="${existingFormat.id}">` : ""}
          
          <!-- Basic Info -->
          <div class="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2 md:col-span-1">
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Format Name <span class="text-red-500">*</span>
                </label>
                <input type="text" name="format_name" id="formatName" required
                       value="${isEditMode ? existingFormat.format_name : ""}"
                       class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 text-sm"
                       placeholder="e.g., Standard Hotel Rates, Family Package Rates">
              </div>
              <div class="col-span-2 md:col-span-1">
                <label class="block text-sm font-semibold text-gray-700 mb-2">Description (Optional)</label>
                <input type="text" name="description" id="formatDescription"
                       value="${isEditMode ? existingFormat.format_description || "" : ""}"
                       class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 text-sm"
                       placeholder="Brief description of this rate table">
              </div>
            </div>
          </div>
          
          <!-- Column Builder -->
          <div class="bg-white p-4 rounded-lg border-2 border-gray-200">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-lg font-bold text-gray-800">Table Columns</h4>
              <div class="flex gap-2">
                <button type="button" onclick="window.addRegularColumn()" 
                        class="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                  <i class="fas fa-plus-circle mr-1"></i> Add Regular Column
                </button>
                <button type="button" onclick="window.addExtraNightColumn()" 
                        class="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600">
                  <i class="fas fa-moon mr-1"></i> Add Extra Night Column
                </button>
              </div>
            </div>
            
            <!-- Regular Columns Section -->
            <div class="mb-6">
              <h5 class="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Regular Rate Columns
              </h5>
              <div id="regularColumnsContainer" class="space-y-3">
                <!-- Regular columns will be added here -->
              </div>
            </div>
            
            <!-- Extra Night Columns Section -->
            <div>
              <h5 class="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                <span class="w-2 h-2 bg-purple-500 rounded-full"></span>
                Extra Night Rate Columns
              </h5>
              <div id="extraColumnsContainer" class="space-y-3">
                <!-- Extra night columns will be added here -->
              </div>
            </div>
            
            <!-- Preview Section -->
            <div class="mt-6 pt-4 border-t-2 border-gray-200">
              <h5 class="text-sm font-semibold text-gray-600 mb-3">Preview</h5>
              <div class="overflow-x-auto bg-gray-50 p-4 rounded-lg">
                <table class="w-full border-collapse text-sm">
                  <thead>
                    <tr id="previewHeader" class="bg-gray-200">
                      <!-- Headers will be populated dynamically -->
                    </tr>
                  </thead>
                  <tbody>
                    <tr id="previewRow" class="bg-white">
                      <!-- Cells will be populated dynamically -->
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
            <button type="button" onclick="this.closest('.fixed').remove()"
                    class="px-5 py-2.5 border-2 border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit"
                    class="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-sm hover:from-emerald-700 hover:to-teal-700">
              ${isEditMode ? "Save Changes" : "Create Format"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // =====================================================
  // COLUMN MANAGEMENT FUNCTIONS
  // =====================================================

  // Add Regular Column
  window.addRegularColumn = () => {
    addColumn(false);
  };

  // Add Extra Night Column
  window.addExtraNightColumn = () => {
    addColumn(true);
  };

  function addColumn(isExtraNight) {
    const containerId = isExtraNight
      ? "extraColumnsContainer"
      : "regularColumnsContainer";
    const container = document.getElementById(containerId);
    const colIndex = columnCounter++;
    const columnType = isExtraNight ? "extra" : "regular";

    const columnHtml = `
      <div class="column-row bg-gray-50 p-4 rounded-lg border-2 border-gray-200 relative" 
           data-column-index="${colIndex}" 
           data-type="${columnType}"
           data-column-id="">
        
        <div class="absolute top-2 right-2 flex gap-1">
          <button type="button" onclick="window.editColumn(this)" class="text-blue-500 hover:text-blue-700 p-1" title="Edit/Rename">
            <i class="fas fa-pencil-alt text-xs"></i>
          </button>
          <button type="button" onclick="window.moveColumnUp(this)" class="text-gray-500 hover:text-gray-700 p-1" title="Move Up">
            <i class="fas fa-chevron-up text-xs"></i>
          </button>
          <button type="button" onclick="window.moveColumnDown(this)" class="text-gray-500 hover:text-gray-700 p-1" title="Move Down">
            <i class="fas fa-chevron-down text-xs"></i>
          </button>
          <button type="button" onclick="window.removeColumn(this)" class="text-red-500 hover:text-red-700 p-1" title="Remove">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pr-16">
          <div class="col-span-2">
            <label class="block text-xs font-semibold text-gray-600 mb-1">Column Label</label>
            <input type="text" name="col_${colIndex}_label" 
                   class="column-label w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="e.g., Solo Traveler, Family of 4"
                   oninput="window.generateColumnKey(this)">
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Column Key</label>
            <input type="text" name="col_${colIndex}_key" readonly
                   class="column-key w-full px-3 py-2 bg-gray-100 border-2 border-gray-200 rounded-lg text-sm text-gray-600">
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Column Type</label>
            <select name="col_${colIndex}_type" class="column-type w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                    onchange="window.toggleColumnFields(this, ${colIndex})">
              <option value="pax" selected>Per Person (Pax)</option>
              <option value="room">Per Room</option>
              <option value="child">Child Rate</option>
              <option value="infant">Infant Rate</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <!-- Pax count field (shown for pax type) -->
          <div id="paxFields_${colIndex}" class="">
            <label class="block text-xs font-semibold text-gray-600 mb-1">
              Number of Persons <span class="text-red-500">*</span>
            </label>
            <input type="number" name="col_${colIndex}_pax" min="1" max="20"
                   class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                   placeholder="e.g., 1, 2, 3">
          </div>
          
          <!-- Room configuration field (shown for room type) -->
          <div id="roomFields_${colIndex}" class="hidden">
            <label class="block text-xs font-semibold text-gray-600 mb-1">Room Type</label>
            <select name="col_${colIndex}_room" class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
              <option value="">Select type</option>
              <option value="single">Single Room</option>
              <option value="double">Double Room</option>
              <option value="twin">Twin Room</option>
              <option value="triple">Triple Room</option>
              <option value="quad">Quad Room</option>
              <option value="family">Family Room</option>
            </select>
          </div>
          
          <!-- Child age fields (shown for child type) -->
          <div id="childFields_${colIndex}" class="col-span-2 grid grid-cols-2 gap-2 hidden">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Min Age</label>
              <input type="number" name="col_${colIndex}_age_min" min="0" max="17"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Max Age</label>
              <input type="number" name="col_${colIndex}_age_max" min="1" max="17"
                     class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm">
            </div>
          </div>
          
          <input type="hidden" name="col_${colIndex}_is_extra" value="${isExtraNight}">
          <input type="hidden" name="col_${colIndex}_id" class="column-id" value="">
        </div>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", columnHtml);

    updatePreview();
  }

  // Generate column key from label
  window.generateColumnKey = (input) => {
    const row = input.closest(".column-row");
    const keyInput = row.querySelector(".column-key");
    const label = input.value;

    const key = label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^_|_$/g, "");

    keyInput.value = key || "column_" + Date.now();
    updatePreview();
  };

  // Toggle fields based on column type
  window.toggleColumnFields = (select, index) => {
    const type = select.value;

    const paxField = document.getElementById(`paxFields_${index}`);
    const roomField = document.getElementById(`roomFields_${index}`);
    const childField = document.getElementById(`childFields_${index}`);

    const paxInput = paxField?.querySelector('input[name*="_pax"]');

    // Hide all fields first
    if (paxField) paxField.classList.add("hidden");
    if (roomField) roomField.classList.add("hidden");
    if (childField) childField.classList.add("hidden");

    // Remove required attribute from all inputs first
    if (paxInput) {
      paxInput.required = false;
      paxInput.removeAttribute("required");
    }

    // Show and set required based on selected type
    switch (type) {
      case "pax":
        if (paxField) {
          paxField.classList.remove("hidden");
          if (paxInput) {
            paxInput.required = true;
            paxInput.setAttribute("required", "required");
          }
        }
        break;
      case "room":
        if (roomField) roomField.classList.remove("hidden");
        break;
      case "child":
        if (childField) childField.classList.remove("hidden");
        break;
    }
    updatePreview();
  };

  // Move column up
  window.moveColumnUp = (button) => {
    const row = button.closest(".column-row");
    const container = row.parentNode;
    const prev = row.previousElementSibling;
    if (prev) {
      container.insertBefore(row, prev);
      updatePreview();
    }
  };

  // Move column down
  window.moveColumnDown = (button) => {
    const row = button.closest(".column-row");
    const container = row.parentNode;
    const next = row.nextElementSibling;
    if (next) {
      container.insertBefore(next, row);
      updatePreview();
    }
  };

  // Remove column
  window.removeColumn = (button) => {
    const row = button.closest(".column-row");
    row.remove();
    updatePreview();
  };

  // Edit/Rename column
  window.editColumn = (button) => {
    const row = button.closest(".column-row");
    const columnId = row.querySelector(".column-id").value;
    const isNewColumn = !columnId;

    if (isNewColumn) {
      row.querySelector(".column-label").focus();
      return;
    }

    openEditColumnModal(columnId, row);
  };

  // Open modal to edit an existing column
  function openEditColumnModal(columnId, row) {
    const labelInput = row.querySelector(".column-label");
    const typeSelect = row.querySelector(".column-type");
    const paxInput = row.querySelector('[name*="_pax"]');
    const roomSelect = row.querySelector('[name*="_room"]');
    const ageMinInput = row.querySelector('[name*="_age_min"]');
    const ageMaxInput = row.querySelector('[name*="_age_max"]');
    const isExtra = row.dataset.type === "extra";

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";

    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
          <h3 class="text-xl font-bold text-white">Edit Column</h3>
        </div>
        
        <form id="editColumnForm" class="p-6 space-y-4">
          <input type="hidden" name="column_id" value="${columnId}">
          <input type="hidden" name="is_extra_night" value="${isExtra}">
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Column Label</label>
            <input type="text" name="column_label" value="${labelInput.value.replace(/"/g, "&quot;")}" required
                   class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500">
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Column Type</label>
            <select name="column_type" class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg">
              <option value="pax" ${typeSelect.value === "pax" ? "selected" : ""}>Per Person (Pax)</option>
              <option value="room" ${typeSelect.value === "room" ? "selected" : ""}>Per Room</option>
              <option value="child" ${typeSelect.value === "child" ? "selected" : ""}>Child Rate</option>
              <option value="infant" ${typeSelect.value === "infant" ? "selected" : ""}>Infant Rate</option>
              <option value="custom" ${typeSelect.value === "custom" ? "selected" : ""}>Custom</option>
            </select>
          </div>
          
          <div id="editPaxField" class="${typeSelect.value !== "pax" ? "hidden" : ""}">
            <label class="block text-sm font-semibold text-gray-700 mb-2">Number of Persons</label>
            <input type="number" name="pax_count" value="${paxInput ? paxInput.value : ""}" min="1" max="20"
                   class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg">
          </div>
          
          <div id="editRoomField" class="${typeSelect.value !== "room" ? "hidden" : ""}">
            <label class="block text-sm font-semibold text-gray-700 mb-2">Room Type</label>
            <select name="room_configuration" class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg">
              <option value="">Select type</option>
              <option value="single" ${roomSelect && roomSelect.value === "single" ? "selected" : ""}>Single Room</option>
              <option value="double" ${roomSelect && roomSelect.value === "double" ? "selected" : ""}>Double Room</option>
              <option value="twin" ${roomSelect && roomSelect.value === "twin" ? "selected" : ""}>Twin Room</option>
              <option value="triple" ${roomSelect && roomSelect.value === "triple" ? "selected" : ""}>Triple Room</option>
              <option value="quad" ${roomSelect && roomSelect.value === "quad" ? "selected" : ""}>Quad Room</option>
              <option value="family" ${roomSelect && roomSelect.value === "family" ? "selected" : ""}>Family Room</option>
            </select>
          </div>
          
          <div id="editChildFields" class="grid grid-cols-2 gap-3 ${typeSelect.value !== "child" ? "hidden" : ""}">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Min Age</label>
              <input type="number" name="child_age_min" value="${ageMinInput ? ageMinInput.value : ""}" min="0" max="17"
                     class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Max Age</label>
              <input type="number" name="child_age_max" value="${ageMaxInput ? ageMaxInput.value : ""}" min="1" max="17"
                     class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg">
            </div>
          </div>
          
          <div class="flex justify-end gap-3 pt-4">
            <button type="button" onclick="this.closest('.fixed').remove()"
                    class="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm">
              Cancel
            </button>
            <button type="submit"
                    class="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const editForm = document.getElementById("editColumnForm");
    const typeSelectEdit = editForm.querySelector('[name="column_type"]');

    typeSelectEdit.addEventListener("change", () => {
      document.getElementById("editPaxField").classList.add("hidden");
      document.getElementById("editRoomField").classList.add("hidden");
      document.getElementById("editChildFields").classList.add("hidden");

      switch (typeSelectEdit.value) {
        case "pax":
          document.getElementById("editPaxField").classList.remove("hidden");
          break;
        case "room":
          document.getElementById("editRoomField").classList.remove("hidden");
          break;
        case "child":
          document.getElementById("editChildFields").classList.remove("hidden");
          break;
      }
    });

    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(editForm);

      labelInput.value = formData.get("column_label");
      typeSelect.value = formData.get("column_type");

      if (paxInput) paxInput.value = formData.get("pax_count") || "";
      if (roomSelect)
        roomSelect.value = formData.get("room_configuration") || "";
      if (ageMinInput) ageMinInput.value = formData.get("child_age_min") || "";
      if (ageMaxInput) ageMaxInput.value = formData.get("child_age_max") || "";

      const columnData = {
        column_label: formData.get("column_label"),
        column_type: formData.get("column_type"),
        pax_count: formData.get("pax_count"),
        room_configuration: formData.get("room_configuration"),
        child_age_min: formData.get("child_age_min"),
        child_age_max: formData.get("child_age_max"),
        is_extra_night: isExtra,
        display_order: row.dataset.displayOrder || 0,
      };

      const result = await updateColumnDefinition(columnId, columnData);

      if (result) {
        generateColumnKey(labelInput);
        updatePreview();
        modal.remove();
        showToast("✅ Column updated successfully", "success");
      }
    });
  }

  // Update preview table
  function updatePreview() {
    const regularColumns = document.querySelectorAll(
      "#regularColumnsContainer .column-row",
    );
    const extraColumns = document.querySelectorAll(
      "#extraColumnsContainer .column-row",
    );
    const previewHeader = document.getElementById("previewHeader");
    const previewRow = document.getElementById("previewRow");

    let headerHtml =
      '<th class="border border-gray-300 px-4 py-2 bg-gray-100">Season</th>';
    headerHtml +=
      '<th class="border border-gray-300 px-4 py-2 bg-gray-100">Sneak</th>';
    headerHtml +=
      '<th class="border border-gray-300 px-4 py-2 bg-gray-100">Duration/Travel-Date</th>';

    regularColumns.forEach((col) => {
      const label = col.querySelector(".column-label")?.value || "New Column";
      headerHtml += `<th class="border border-gray-300 px-4 py-2 bg-emerald-100 text-emerald-800">${label}</th>`;
    });

    if (extraColumns.length > 0) {
      extraColumns.forEach((col) => {
        const label =
          col.querySelector(".column-label")?.value || "Extra Night";
        headerHtml += `<th class="border border-gray-300 px-4 py-2 bg-purple-100 text-purple-800">${label} (Extra)</th>`;
      });
    }

    previewHeader.innerHTML = headerHtml;

    let rowHtml =
      '<td class="border border-gray-300 px-4 py-2">Peak Season</td>';
    rowHtml += '<td class="border border-gray-300 px-4 py-2">SNK001</td>';
    rowHtml += '<td class="border border-gray-300 px-4 py-2">3D2N</td>';

    regularColumns.forEach(() => {
      rowHtml +=
        '<td class="border border-gray-300 px-4 py-2 text-right">₱ 0.00</td>';
    });

    extraColumns.forEach(() => {
      rowHtml +=
        '<td class="border border-gray-300 px-4 py-2 text-right">₱ 0.00</td>';
    });

    previewRow.innerHTML = rowHtml;
  }

  // Load existing data if in edit mode
  if (isEditMode && existingFormat && existingFormat.columns) {
    setTimeout(() => {
      existingFormat.columns.forEach((col) => {
        addColumn(col.is_extra_night);
        const lastRow = document.querySelector(
          `#${col.is_extra_night ? "extra" : "regular"}ColumnsContainer .column-row:last-child`,
        );
        if (lastRow) {
          const labelInput = lastRow.querySelector(".column-label");
          const keyInput = lastRow.querySelector(".column-key");
          const typeSelect = lastRow.querySelector(".column-type");
          const paxInput = lastRow.querySelector('[name*="_pax"]');
          const roomSelect = lastRow.querySelector('[name*="_room"]');
          const ageMinInput = lastRow.querySelector('[name*="_age_min"]');
          const ageMaxInput = lastRow.querySelector('[name*="_age_max"]');
          const idInput = lastRow.querySelector(".column-id");

          if (labelInput) labelInput.value = col.column_label;
          if (keyInput) keyInput.value = col.column_key;
          if (typeSelect) typeSelect.value = col.column_type;
          if (paxInput) paxInput.value = col.pax_count;
          if (roomSelect) roomSelect.value = col.room_configuration;
          if (ageMinInput) ageMinInput.value = col.child_age_min;
          if (ageMaxInput) ageMaxInput.value = col.child_age_max;
          if (idInput) idInput.value = col.id;

          if (typeSelect) {
            toggleColumnFields(
              typeSelect,
              parseInt(lastRow.dataset.columnIndex),
            );
          }
        }
      });
      updatePreview();
    }, 100);
  } else {
    addColumn(false);
  }

  // =====================================================
  // FORM SUBMIT HANDLER
  // =====================================================
  const form = document.getElementById("tableFormatForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const formatName = formData.get("format_name");

    if (!formatName) {
      showToast("Please enter a format name", "warning");
      return;
    }

    const regularRows = document.querySelectorAll(
      "#regularColumnsContainer .column-row",
    );
    const extraRows = document.querySelectorAll(
      "#extraColumnsContainer .column-row",
    );
    const allRows = [...regularRows, ...extraRows];

    // Validate pax fields
    for (const row of allRows) {
      const typeSelect = row.querySelector(".column-type");
      const paxInput = row.querySelector('[name*="_pax"]');

      if (typeSelect && typeSelect.value === "pax" && paxInput) {
        if (!paxInput.value || paxInput.value.trim() === "") {
          showToast(
            "Please enter number of persons for Pax type columns",
            "warning",
          );
          paxInput.focus();
          return;
        }
      }
    }

    if (allRows.length === 0) {
      showToast("Please add at least one column", "warning");
      return;
    }

    // Check for duplicate column keys
    const columnKeys = new Set();
    const duplicateKeys = [];

    allRows.forEach((row) => {
      const keyInput = row.querySelector(".column-key");
      const labelInput = row.querySelector(".column-label");
      const key = keyInput ? keyInput.value : "";

      if (columnKeys.has(key)) {
        duplicateKeys.push(labelInput ? labelInput.value : key);
      } else {
        columnKeys.add(key);
      }
    });

    if (duplicateKeys.length > 0) {
      showToast(
        `Duplicate column keys detected: ${duplicateKeys.join(", ")}. Please make each column unique.`,
        "warning",
      );
      return;
    }

    const columns = [];
    let validationFailed = false;

    allRows.forEach((row, index) => {
      if (validationFailed) return;

      const labelInput = row.querySelector(".column-label");
      const keyInput = row.querySelector(".column-key");
      const typeSelect = row.querySelector(".column-type");
      const paxInput = row.querySelector('[name*="_pax"]');
      const roomSelect = row.querySelector('[name*="_room"]');
      const ageMinInput = row.querySelector('[name*="_age_min"]');
      const ageMaxInput = row.querySelector('[name*="_age_max"]');
      const isExtraInput = row.querySelector('[name*="_is_extra"]');
      const idInput = row.querySelector(".column-id");

      const column = {
        id: idInput ? idInput.value : null,
        column_label: labelInput ? labelInput.value : "",
        column_key: keyInput ? keyInput.value : "",
        column_type: typeSelect ? typeSelect.value : "pax",
        is_extra_night: isExtraInput ? isExtraInput.value === "true" : false,
        pax_count: paxInput ? paxInput.value : null,
        room_configuration: roomSelect ? roomSelect.value : null,
        child_age_min: ageMinInput ? ageMinInput.value : null,
        child_age_max: ageMaxInput ? ageMaxInput.value : null,
        display_order: index,
      };

      if (!column.column_label || !column.column_key) {
        showToast("Please fill in all column labels", "warning");
        validationFailed = true;
        return;
      }

      columns.push(column);
    });

    if (validationFailed) return;

    const submitData = {
      destination_id: formData.get("destination_id"),
      format_name: formatName,
      description: formData.get("description"),
      columns: JSON.stringify(columns),
    };

    let result;
    if (isEditMode) {
      result = await updateTableFormat(
        formData.get("destination_id"),
        formatName,
        submitData,
      );
    } else {
      result = await createTableFormat(submitData);
    }

    if (result) {
      modal.remove();
      showToast(
        `✅ Table format "${formatName}" ${isEditMode ? "updated" : "created"}!`,
        "success",
      );

      if (!isEditMode) {
        setTimeout(() => {
          showConfirmDialog(
            `Would you like to assign this format to a package now?`,
            async () => {
              const { data: packages } = await supabase
                .from("destination_packages")
                .select("id, package_name")
                .eq("destination_id", destinationId)
                .eq("is_active", true);

              if (packages && packages.length > 0) {
                openPackageSelectorModal(destinationId, formatName, packages);
              } else {
                showToast("No packages available for this destination", "info");
              }
            },
            "Yes, Assign to Package",
            "No, Later",
          );
        }, 500);
      }
    }
  });
}

// =====================================================
// PACKAGE SELECTOR MODAL
// =====================================================

export function openPackageSelectorModal(destinationId, formatName, packages) {
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
      <!-- Header -->
      <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-emerald-600 to-teal-600">
        <div class="relative px-6 py-5">
          <div class="flex items-center gap-4">
            <div class="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <i class="fas fa-box text-2xl text-white"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-white">Assign Format to Package</h3>
              <p class="text-emerald-100 text-sm mt-1">${formatName}</p>
            </div>
            <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
        </div>
      </div>
      
      <div class="p-6">
        <p class="text-sm text-gray-600 mb-4">Select a package to assign this format:</p>
        
        <div class="space-y-2 max-h-80 overflow-y-auto">
          ${packages
            .map(
              (pkg) => `
            <div class="border-2 border-gray-200 rounded-lg p-3 hover:border-emerald-500 cursor-pointer transition package-item"
                 data-package-id="${pkg.id}" data-package-name="${pkg.package_name}">
              <div class="flex items-center gap-3">
                <div class="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <i class="fas fa-box text-emerald-600 text-sm"></i>
                </div>
                <div>
                  <h4 class="font-medium">${pkg.package_name}</h4>
                  <p class="text-xs text-gray-500">ID: ${pkg.id}</p>
                </div>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
        
        <div class="flex justify-end gap-3 mt-6 pt-4 border-t-2 border-gray-100">
          <button onclick="this.closest('.fixed').remove()"
                  class="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.querySelectorAll(".package-item").forEach((item) => {
    item.addEventListener("click", async () => {
      const packageId = item.dataset.packageId;
      const packageName = item.dataset.packageName;

      modal.remove();

      const result = await assignFormatToPackage(packageId, formatName);

      if (result) {
        showToast(`✅ Format assigned to "${packageName}"`, "success");

        const destModal = document.querySelector(".fixed.z-\\[100\\]");
        if (destModal) {
          destModal.remove();
          await viewDestinationDetails(destinationId);
        }
      }
    });
  });
}

// =====================================================
// ASSIGN FORMAT MODAL
// =====================================================

export async function openAssignFormatModal(packageId, destinationId) {
  try {
    showLoading(true, "Loading formats...");

    const formats = await fetchTableFormats(destinationId);
    const uniqueFormats = [...new Set(formats.map((f) => f.format_name))];

    const { data: pkg } = await supabase
      .from("destination_packages")
      .select("table_format")
      .eq("id", packageId)
      .single();

    showLoading(false);

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";

    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
        <!-- Header -->
        <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-blue-600 to-indigo-600">
          <div class="relative px-6 py-5">
            <div class="flex items-center gap-4">
              <div class="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <i class="fas fa-table text-2xl text-white"></i>
              </div>
              <div class="flex-1">
                <h3 class="text-2xl font-bold text-white">Change Package Format</h3>
                <p class="text-blue-100 text-sm mt-1">Select a table format</p>
              </div>
              <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
            </div>
          </div>
        </div>
        
        <div class="p-6">
          ${
            uniqueFormats.length === 0
              ? `
            <div class="text-center py-6">
              <i class="fas fa-table text-4xl text-gray-300 mb-3"></i>
              <p class="text-gray-500">No formats available</p>
              <button onclick="window.openTableFormatBuilderModal(${destinationId}); this.closest('.fixed').remove()" 
                      class="mt-3 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm">
                Create Format
              </button>
            </div>
          `
              : `
            <div class="space-y-2">
              ${uniqueFormats
                .map(
                  (formatName) => `
                <div class="border-2 border-gray-200 rounded-lg p-3 hover:border-blue-500 cursor-pointer transition format-item
                          ${pkg?.table_format === formatName ? "border-blue-500 bg-blue-50" : ""}"
                     data-format-name="${formatName}">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i class="fas fa-table text-blue-600 text-sm"></i>
                      </div>
                      <div>
                        <h4 class="font-medium">${formatName}</h4>
                        <p class="text-xs text-gray-500">
                          ${formats.filter((f) => f.format_name === formatName).length} columns
                        </p>
                      </div>
                    </div>
                    ${
                      pkg?.table_format === formatName
                        ? `
                      <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Current</span>
                    `
                        : ""
                    }
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>
            
            <div class="flex justify-end gap-3 mt-6 pt-4 border-t-2 border-gray-100">
              <button onclick="this.closest('.fixed').remove()"
                      class="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onclick="window.openTableFormatBuilderModal(${destinationId})" 
                      class="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                Create New Format
              </button>
            </div>
          `
          }
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.querySelectorAll(".format-item").forEach((item) => {
      item.addEventListener("click", async () => {
        const formatName = item.dataset.formatName;

        const result = await assignFormatToPackage(packageId, formatName);

        if (result) {
          modal.remove();

          const destModal = document.querySelector(".fixed.z-\\[100\\]");
          if (destModal) {
            destModal.remove();
            await viewDestinationDetails(destinationId);
          }
        }
      });
    });
  } catch (error) {
    console.error("Error opening assign format modal:", error);
    showToast("Failed to load formats", "error");
    showLoading(false);
  }
}

// =====================================================
// FIXED RATE INPUT MODAL - COMPLETE WORKING VERSION
// =====================================================

export async function openRateInputModal(
  packageId,
  hotelCategoryId,
  formatName,
) {
  if (!hotelCategoryId) {
    showToast("Please select a hotel category first", "error");
    return;
  }

  try {
    showLoading(true, "Loading rate table...");

    // Get the package info
    const { data: pkg, error: pkgError } = await supabase
      .from("destination_packages")
      .select("*, destinations!inner(*)")
      .eq("id", packageId)
      .single();

    if (pkgError || !pkg) {
      showToast("Package not found", "error");
      showLoading(false);
      return;
    }

    console.log("📦 Package:", pkg.package_name);
    console.log("📍 Destination ID:", pkg.destination_id);
    console.log("🔍 Looking for format:", formatName);

    // Get the format columns
    const columns = await fetchTableFormatByName(
      pkg.destination_id,
      formatName,
    );

    if (!columns || columns.length === 0) {
      console.error("No columns found for format:", formatName);

      // Check what formats are available
      const { data: allFormats } = await supabase
        .from("rate_column_definitions")
        .select("format_name, is_active")
        .eq("destination_id", pkg.destination_id);

      const activeFormats = [
        ...new Set(
          allFormats?.filter((f) => f.is_active).map((f) => f.format_name) ||
            [],
        ),
      ];

      showLoading(false);

      // Show error modal with available formats
      const errorModal = document.createElement("div");
      errorModal.className =
        "fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";

      errorModal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
          <div class="bg-gradient-to-r from-red-600 to-pink-600 px-6 py-5 rounded-t-2xl">
            <h3 class="text-2xl font-bold text-white">Format Not Found</h3>
          </div>
          
          <div class="p-6">
            <p class="text-sm text-gray-600 mb-4">
              The format "${formatName}" was not found for this destination.
            </p>
            
            ${
              activeFormats.length > 0
                ? `
              <p class="text-sm font-semibold text-gray-700 mb-2">Available formats:</p>
              <div class="space-y-2 max-h-60 overflow-y-auto mb-4">
                ${activeFormats
                  .map(
                    (f) => `
                  <div class="border-2 border-gray-200 rounded-lg p-3">
                    <div class="flex items-center gap-3">
                      <div class="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i class="fas fa-table text-blue-600 text-sm"></i>
                      </div>
                      <div>
                        <h4 class="font-medium">${f}</h4>
                      </div>
                    </div>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            `
                : `
              <p class="text-sm text-gray-500 italic mb-4">No formats available for this destination.</p>
            `
            }
            
            <div class="flex justify-end gap-3">
              <button onclick="this.closest('.fixed').remove()"
                      class="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm">
                Close
              </button>
              <button onclick="this.closest('.fixed').remove(); window.openTableFormatBuilderModal(${pkg.destination_id})" 
                      class="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                Create Format
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(errorModal);
      return;
    }

    console.log(`✅ Found ${columns.length} columns for format`);

    // Fetch existing rates for this package and category
    const existingRateRows = await fetchRateRows(packageId, hotelCategoryId);

    showLoading(false);

    // Separate regular and extra night columns
    const regularColumns = columns.filter((col) => !col.is_extra_night);
    const extraColumns = columns.filter((col) => col.is_extra_night);

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto";

    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-7xl w-full my-8 shadow-2xl" style="max-height: 90vh;">
        <!-- Header -->
        <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-blue-600 to-indigo-600 sticky top-0 z-10">
          <div class="relative px-6 py-5">
            <div class="flex items-center gap-4">
              <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
                <i class="fas fa-edit text-2xl text-white"></i>
              </div>
              <div class="flex-1">
                <h3 class="text-2xl font-bold text-white">Enter Rates</h3>
                <p class="text-blue-100 text-sm mt-1">${formatName} • ${pkg.package_name}</p>
              </div>
              <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
            </div>
          </div>
        </div>
        
        <div class="p-6 overflow-y-auto" style="max-height: calc(90vh - 120px);">
          <div class="mb-4 flex justify-between items-center">
            <h4 class="text-lg font-bold text-gray-800">Rate Rows</h4>
            <button type="button" id="addNewRowBtn" 
                    class="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
              <i class="fas fa-plus-circle mr-1"></i> Add New Row
            </button>
          </div>
          
          <form id="rateInputForm" class="space-y-6">
            <input type="hidden" name="package_id" value="${packageId}">
            <input type="hidden" name="hotel_category_id" value="${hotelCategoryId}">
            <input type="hidden" name="format_name" value="${formatName}">
            
            <!-- Rate Rows Container -->
            <div id="rateRowsContainer" class="space-y-8">
              ${
                existingRateRows.length > 0
                  ? existingRateRows
                      .map((row, index) =>
                        generateRateRowHTML(
                          row,
                          index,
                          regularColumns,
                          extraColumns,
                        ),
                      )
                      .join("")
                  : generateRateRowHTML(null, 0, regularColumns, extraColumns)
              }
            </div>
            
            <!-- Action Buttons -->
            <div class="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
              <button type="button" onclick="this.closest('.fixed').remove()"
                      class="px-5 py-2.5 border-2 border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit"
                      class="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm hover:from-blue-700 hover:to-indigo-700">
                Save All Rates
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Now that the modal is in the DOM, we can safely get references to elements
    const form = document.getElementById("rateInputForm");
    const addNewRowBtn = document.getElementById("addNewRowBtn");
    const rateRowsContainer = document.getElementById("rateRowsContainer");

    if (!form) {
      console.error("Form element not found!");
      return;
    }

    // Add function to add new rate row
    const addNewRateRow = () => {
      const rowIndex = rateRowsContainer.children.length;
      const newRowHTML = generateRateRowHTML(
        null,
        rowIndex,
        regularColumns,
        extraColumns,
      );
      rateRowsContainer.insertAdjacentHTML("beforeend", newRowHTML);
    };

    // Attach event listener to add new row button
    if (addNewRowBtn) {
      addNewRowBtn.addEventListener("click", addNewRateRow);
    }

    // =====================================================
    // FORM SUBMIT HANDLER - FIXED VERSION
    // =====================================================
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      showLoading(true, "Saving rates...");

      const rows = [];
      const rowElements = document.querySelectorAll(".rate-row");

      for (let i = 0; i < rowElements.length; i++) {
        const rowEl = rowElements[i];
        const season =
          rowEl.querySelector(`[name="rows[${i}][season]"]`)?.value || "";
        const sneak =
          rowEl.querySelector(`[name="rows[${i}][sneak]"]`)?.value || "";
        const duration =
          rowEl.querySelector(`[name="rows[${i}][duration]"]`)?.value || "";

        const values = {};
        let hasValue = false;

        // Get regular column values
        regularColumns.forEach((col) => {
          const input = rowEl.querySelector(
            `[name="rows[${i}][values][${col.column_key}]"]`,
          );
          if (input && input.value && input.value.trim() !== "") {
            values[col.column_key] = input.value;
            hasValue = true;
          }
        });

        // Get extra column values
        extraColumns.forEach((col) => {
          const input = rowEl.querySelector(
            `[name="rows[${i}][extra_values][${col.column_key}]"]`,
          );
          if (input && input.value && input.value.trim() !== "") {
            values[col.column_key] = input.value;
            hasValue = true;
          }
        });

        // Only add row if it has at least one value
        if (hasValue) {
          rows.push({
            season: season || "",
            sneak: sneak || "",
            duration: duration || "",
            values,
            breakfast_included: false,
            breakfast_notes: null,
          });
        }
      }

      if (rows.length === 0) {
        showToast("Please add at least one rate value", "warning");
        showLoading(false);
        return;
      }

      console.log("Saving rows:", rows);

      // Save each row SEQUENTIALLY
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const row of rows) {
        try {
          console.log(
            `Processing row: ${row.season} - ${row.sneak} - ${row.duration}`,
          );
          const result = await createRateRow(
            packageId,
            hotelCategoryId,
            row,
            columns,
          );
          if (result) {
            successCount++;
            console.log(`✅ Row saved successfully`);
          } else {
            errorCount++;
            errors.push(
              `Row ${row.season}/${row.sneak}/${row.duration} failed`,
            );
            console.error(`❌ Row save returned false`);
          }
        } catch (error) {
          console.error(`❌ Error saving row:`, error);
          errors.push(error.message);
          errorCount++;
        }
      }

      console.log(
        `Save complete: ${successCount} success, ${errorCount} failed`,
      );

      if (errorCount === 0) {
        showToast(
          `✅ All ${successCount} rate rows saved successfully!`,
          "success",
        );

        // Close modal after short delay
        setTimeout(() => {
          modal.remove();

          // Refresh the view
          const destModal = document.querySelector(".fixed.z-\\[100\\]");
          if (destModal) {
            destModal.remove();
            viewDestinationDetails(pkg.destination_id);
          }
        }, 1500);
      } else if (successCount > 0) {
        showToast(
          `⚠️ ${successCount} rows saved, ${errorCount} failed. Check console for details.`,
          "warning",
        );
        showLoading(false);
      } else {
        showToast(`❌ Failed to save rates: ${errors.join(", ")}`, "error");
        showLoading(false);
      }
    });
  } catch (error) {
    console.error("Error opening rate input modal:", error);
    showToast("Failed to open rate input: " + error.message, "error");
    showLoading(false);
  }
}

// Generate rate row HTML
function generateRateRowHTML(existingRow, index, regularColumns, extraColumns) {
  const rowId = `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const season = existingRow?.season || "";
  const sneak = existingRow?.sneak || "";
  const duration = existingRow?.duration || "";

  return `
    <div class="rate-row bg-gray-50 p-4 rounded-lg border-2 border-gray-200 relative hover:border-blue-300 transition-all" data-row-id="${rowId}">
      <div class="absolute top-2 right-2">
        <button type="button" onclick="this.closest('.rate-row').remove()" 
                class="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-all" title="Remove Row">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <!-- Row Header -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Season</label>
          <input type="text" name="rows[${index}][season]" value="${season}" 
                 class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                 placeholder="e.g., Peak Season">
          <p class="text-xs text-gray-400 mt-1">Leave empty for N/A</p>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Sneak</label>
          <input type="text" name="rows[${index}][sneak]" value="${sneak}" 
                 class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                 placeholder="e.g., SNK001">
          <p class="text-xs text-gray-400 mt-1">Leave empty for N/A</p>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">Duration</label>
          <input type="text" name="rows[${index}][duration]" value="${duration}" 
                 class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                 placeholder="e.g., 3D2N">
          <p class="text-xs text-gray-400 mt-1">Leave empty for N/A</p>
        </div>
      </div>
      
      <!-- Regular Rates Table -->
      ${
        regularColumns.length > 0
          ? `
        <div class="mb-4">
          <h5 class="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
            <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
            Regular Rates (₱ per person)
          </h5>
          <div class="overflow-x-auto rounded-lg border-2 border-gray-200">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="bg-gray-100">
                  ${regularColumns
                    .map(
                      (col) => `
                    <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[120px]">
                      <div class="flex flex-col">
                        <span>${col.column_label}</span>
                        ${col.pax_count ? `<span class="text-xs text-gray-500 font-normal">${col.pax_count} pax</span>` : ""}
                      </div>
                    </th>
                  `,
                    )
                    .join("")}
                </tr>
              </thead>
              <tbody>
                <tr>
                  ${regularColumns
                    .map((col) => {
                      const value =
                        existingRow?.values?.[col.column_key]?.value || "";
                      return `
                      <td class="border border-gray-300 px-3 py-2">
                        <div class="relative">
                          <span class="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                          <input type="number" name="rows[${index}][values][${col.column_key}]" 
                                 value="${value}" step="0.01" min="0"
                                 class="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                 placeholder="0.00">
                        </div>
                      </td>
                    `;
                    })
                    .join("")}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `
          : ""
      }
      
      <!-- Extra Night Rates Table -->
      ${
        extraColumns.length > 0
          ? `
        <div class="mt-4">
          <h5 class="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
            <span class="w-2 h-2 bg-purple-500 rounded-full"></span>
            Extra Night Rates (₱ per person)
          </h5>
          <div class="overflow-x-auto rounded-lg border-2 border-gray-200">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="bg-gray-100">
                  ${extraColumns
                    .map(
                      (col) => `
                    <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 min-w-[120px]">
                      <div class="flex flex-col">
                        <span>${col.column_label}</span>
                        ${col.pax_count ? `<span class="text-xs text-gray-500 font-normal">${col.pax_count} pax</span>` : ""}
                      </div>
                    </th>
                  `,
                    )
                    .join("")}
                </tr>
              </thead>
              <tbody>
                <tr>
                  ${extraColumns
                    .map((col) => {
                      const value =
                        existingRow?.values?.[col.column_key]?.value || "";
                      return `
                      <td class="border border-gray-300 px-3 py-2">
                        <div class="relative">
                          <span class="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                          <input type="number" name="rows[${index}][extra_values][${col.column_key}]" 
                                 value="${value}" step="0.01" min="0"
                                 class="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-right focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                                 placeholder="0.00">
                        </div>
                      </td>
                    `;
                    })
                    .join("")}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `
          : ""
      }
      
      <input type="hidden" name="rows[${index}][row_id]" value="${rowId}">
    </div>
  `;
}

// Check if format exists
export async function checkFormatExists(destinationId, formatName) {
  try {
    const { data, error } = await supabase
      .from("rate_column_definitions")
      .select("id")
      .eq("destination_id", destinationId)
      .eq("format_name", formatName)
      .eq("is_active", true)
      .limit(1);

    if (error) throw error;

    return data && data.length > 0;
  } catch (error) {
    console.error("Error checking format:", error);
    return false;
  }
}

// =====================================================
// TABLE FORMAT SELECTOR MODAL
// =====================================================

export async function openTableFormatSelectorModal(destinationId, onSelect) {
  const formats = await fetchTableFormats(destinationId);

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

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
      <!-- Header -->
      <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-indigo-600 to-purple-600">
        <div class="relative px-6 py-5">
          <div class="flex items-center gap-4">
            <div class="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <i class="fas fa-table text-2xl text-white"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-white">Select Table Format</h3>
              <p class="text-indigo-100 text-sm">Choose a rate table format for your package</p>
            </div>
            <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
        </div>
      </div>
      
      <div class="p-6">
        <div class="mb-4 flex justify-between items-center">
          <p class="text-sm text-gray-600">${Object.keys(formatsByName).length} available format(s)</p>
          <button onclick="window.openTableFormatBuilderModal(${destinationId}); this.closest('.fixed').remove()" 
                  class="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
            <i class="fas fa-plus-circle mr-1"></i> Create New
          </button>
        </div>
        
        <div class="space-y-3 max-h-96 overflow-y-auto">
          ${
            Object.keys(formatsByName).length === 0
              ? `
            <div class="text-center py-8">
              <i class="fas fa-table text-4xl text-gray-300 mb-3"></i>
              <p class="text-gray-500">No table formats yet</p>
              <button onclick="window.openTableFormatBuilderModal(${destinationId}); this.closest('.fixed').remove()" 
                      class="mt-3 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm">
                Create Your First Format
              </button>
            </div>
          `
              : Object.values(formatsByName)
                  .map(
                    (format) => `
            <div class="border-2 border-gray-200 rounded-lg p-4 hover:border-indigo-300 cursor-pointer transition format-item"
                 data-format-name="${format.name}">
              <div class="flex justify-between items-start">
                <div>
                  <h4 class="font-bold text-lg">${format.name}</h4>
                  ${format.description ? `<p class="text-sm text-gray-500">${format.description}</p>` : ""}
                  <p class="text-xs text-gray-400 mt-1">${format.columns.length} columns</p>
                </div>
                <div class="flex gap-2">
                  <button onclick="event.stopPropagation(); window.editFormatFromSelector(${destinationId}, '${format.name}')" 
                          class="text-amber-600 hover:text-amber-800 p-2">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button onclick="event.stopPropagation(); window.deleteFormatFromSelector(${destinationId}, '${format.name}')" 
                          class="text-red-600 hover:text-red-800 p-2">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              
              <!-- Mini preview of columns -->
              <div class="mt-2 flex flex-wrap gap-1">
                ${format.columns
                  .slice(0, 5)
                  .map(
                    (col) => `
                  <span class="text-xs px-2 py-1 ${col.is_extra_night ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"} rounded">
                    ${col.column_label}
                  </span>
                `,
                  )
                  .join("")}
                ${format.columns.length > 5 ? `<span class="text-xs px-2 py-1 bg-gray-100 rounded">+${format.columns.length - 5} more</span>` : ""}
              </div>
            </div>
          `,
                  )
                  .join("")
          }
        </div>
        
        <div class="flex justify-end mt-6">
          <button onclick="this.closest('.fixed').remove()"
                  class="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.querySelectorAll(".format-item").forEach((item) => {
    item.addEventListener("click", () => {
      const formatName = item.dataset.formatName;
      onSelect(formatName);
      modal.remove();
    });
  });

  window.editFormatFromSelector = (destId, formatName) => {
    modal.remove();
    fetchTableFormatByName(destId, formatName).then((columns) => {
      if (columns && columns.length > 0) {
        const formatExample = {
          id: columns[0].id,
          format_name: formatName,
          format_description: columns[0].format_description,
          columns: columns,
        };
        openTableFormatBuilderModal(destId, formatExample);
      }
    });
  };

  window.deleteFormatFromSelector = (destId, formatName) => {
    deleteTableFormat(destId, formatName).then(() => {
      modal.remove();
      openTableFormatSelectorModal(destId, onSelect);
    });
  };
}

// =====================================================
// RENDER TABLE FORMAT PREVIEW
// =====================================================

export function renderTableFormatPreview(columns, containerId, values = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const regularColumns = columns.filter((col) => !col.is_extra_night);
  const extraColumns = columns.filter((col) => col.is_extra_night);

  let html = `
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="bg-gray-100">
            <th class="border border-gray-300 px-3 py-2">Season</th>
            <th class="border border-gray-300 px-3 py-2">Sneak</th>
            <th class="border border-gray-300 px-3 py-2">Duration/Travel-Date</th>
  `;

  regularColumns
    .sort((a, b) => a.display_order - b.display_order)
    .forEach((col) => {
      html += `<th class="border border-gray-300 px-3 py-2 bg-emerald-100">${col.column_label}</th>`;
    });

  extraColumns
    .sort((a, b) => a.display_order - b.display_order)
    .forEach((col) => {
      html += `<th class="border border-gray-300 px-3 py-2 bg-purple-100">${col.column_label} (Extra)</th>`;
    });

  html += `
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border border-gray-300 px-3 py-2">
              <input type="text" name="season" value="${values.season || ""}" 
                     class="w-full px-2 py-1 border border-gray-200 rounded" placeholder="Season">
            </td>
            <td class="border border-gray-300 px-3 py-2">
              <input type="text" name="sneak" value="${values.sneak || ""}" 
                     class="w-full px-2 py-1 border border-gray-200 rounded" placeholder="Sneak">
            </td>
            <td class="border border-gray-300 px-3 py-2">
              <input type="text" name="duration" value="${values.duration || ""}" 
                     class="w-full px-2 py-1 border border-gray-200 rounded" placeholder="Duration/Travel-Date">
            </td>
  `;

  regularColumns.forEach((col) => {
    const value = values[col.column_key] || "";
    html += `<td class="border border-gray-300 px-3 py-2">
      <input type="number" name="rate_${col.column_key}" value="${value}" 
             step="0.01" class="w-full px-2 py-1 border border-gray-200 rounded text-right" 
             placeholder="0.00">
    </td>`;
  });

  extraColumns.forEach((col) => {
    const value = values[col.column_key] || "";
    html += `<td class="border border-gray-300 px-3 py-2">
      <input type="number" name="extra_${col.column_key}" value="${value}" 
             step="0.01" class="w-full px-2 py-1 border border-gray-200 rounded text-right" 
             placeholder="0.00">
    </td>`;
  });

  html += `
          </tr>
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

// =====================================================
// FIXED VIEW RATES MODAL
// =====================================================

// =====================================================
// FIXED VIEW RATES MODAL
// =====================================================

export async function viewRatesModal(packageId, formatName) {
  try {
    showLoading(true, "Loading rates...");

    console.log(
      `🔍 viewRatesModal called with packageId: ${packageId}, formatName: "${formatName}"`,
    );

    // Get package info
    const { data: pkg, error: pkgError } = await supabase
      .from("destination_packages")
      .select("*, destinations!inner(*)")
      .eq("id", packageId)
      .single();

    if (pkgError || !pkg) {
      console.error("Package not found:", pkgError);
      showToast("Package not found", "error");
      showLoading(false);
      return;
    }

    console.log("📦 Package:", {
      id: pkg.id,
      name: pkg.package_name,
      destination_id: pkg.destination_id,
      destination_name: pkg.destinations?.name,
      table_format: pkg.table_format,
    });

    // Use the package's table_format if formatName is not provided
    const searchFormat = formatName || pkg.table_format;

    if (!searchFormat) {
      showToast(
        "No format name provided and package has no assigned format",
        "error",
      );
      showLoading(false);
      return;
    }

    console.log(
      `🔍 Searching for format: "${searchFormat}" in destination ${pkg.destination_id}`,
    );

    // Get columns using our improved fetch function
    let columns = await fetchTableFormatByName(
      pkg.destination_id,
      searchFormat,
    );

    // If no columns found, try to get all formats for this destination to help the user
    if (!columns || columns.length === 0) {
      console.log("❌ No columns found, fetching all formats for debugging...");

      const { data: allFormats } = await supabase
        .from("rate_column_definitions")
        .select("format_name, is_active, format_description")
        .eq("destination_id", pkg.destination_id);

      const activeFormats = [
        ...new Set(
          allFormats?.filter((f) => f.is_active).map((f) => f.format_name) ||
            [],
        ),
      ];
      const inactiveFormats = [
        ...new Set(
          allFormats?.filter((f) => !f.is_active).map((f) => f.format_name) ||
            [],
        ),
      ];

      console.log("📋 All active formats:", activeFormats);
      console.log("📋 Inactive formats:", inactiveFormats);

      showLoading(false);

      // Show modal with available formats
      const errorModal = document.createElement("div");
      errorModal.className =
        "fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";

      errorModal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
          <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 rounded-t-2xl">
            <h3 class="text-2xl font-bold text-white">Format Not Found</h3>
          </div>
          
          <div class="p-6">
            <p class="text-sm text-gray-600 mb-4">
              The format "${searchFormat}" was not found in destination ${pkg.destinations?.name || pkg.destination_id}.
            </p>
            
            ${
              activeFormats.length > 0
                ? `
              <p class="text-sm font-semibold text-gray-700 mb-2">Available active formats:</p>
              <div class="space-y-2 max-h-60 overflow-y-auto mb-4">
                ${activeFormats
                  .map(
                    (f) => `
                  <div class="border-2 border-gray-200 rounded-lg p-3 hover:border-blue-500 cursor-pointer transition format-item"
                       data-format-name="${f}">
                    <div class="flex items-center gap-3">
                      <div class="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i class="fas fa-table text-blue-600 text-sm"></i>
                      </div>
                      <div>
                        <h4 class="font-medium">${f}</h4>
                      </div>
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
              inactiveFormats.length > 0
                ? `
              <p class="text-sm font-semibold text-gray-700 mb-2 mt-4">Inactive formats (can be restored):</p>
              <div class="space-y-2 max-h-40 overflow-y-auto mb-4">
                ${inactiveFormats
                  .map(
                    (f) => `
                  <div class="border-2 border-gray-200 rounded-lg p-3 hover:border-amber-500 cursor-pointer transition inactive-format-item"
                       data-format-name="${f}">
                    <div class="flex items-center gap-3">
                      <div class="h-8 w-8 bg-amber-100 rounded-lg flex items-center justify-center">
                        <i class="fas fa-clock text-amber-600 text-sm"></i>
                      </div>
                      <div>
                        <h4 class="font-medium">${f}</h4>
                        <p class="text-xs text-gray-500">Click to restore</p>
                      </div>
                    </div>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            `
                : ""
            }
            
            <div class="flex justify-end gap-3 mt-4">
              <button onclick="this.closest('.fixed').remove()"
                      class="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm">
                Close
              </button>
              <button onclick="this.closest('.fixed').remove(); window.openTableFormatBuilderModal(${pkg.destination_id})" 
                      class="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                Create New Format
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(errorModal);

      // Handle active format selection
      document.querySelectorAll(".format-item").forEach((item) => {
        item.addEventListener("click", () => {
          const selectedFormat = item.dataset.formatName;
          errorModal.remove();
          viewRatesModal(packageId, selectedFormat);
        });
      });

      // Handle inactive format restoration
      document.querySelectorAll(".inactive-format-item").forEach((item) => {
        item.addEventListener("click", async () => {
          const selectedFormat = item.dataset.formatName;
          errorModal.remove();
          showLoading(true, "Restoring format...");

          const result = await fixOrphanedTableFormat(
            pkg.destination_id,
            selectedFormat,
          );

          if (result) {
            showToast("✅ Format restored! Loading rates...", "success");
            setTimeout(() => {
              viewRatesModal(packageId, selectedFormat);
            }, 500);
          } else {
            showLoading(false);
          }
        });
      });

      return;
    }

    console.log(
      `✅ Found ${columns.length} columns for format "${searchFormat}"`,
    );

    // Get all hotel categories
    const { data: categories, error: catError } = await supabase
      .from("hotel_categories")
      .select("*")
      .eq("destination_id", pkg.destination_id)
      .order("display_order");

    if (catError) {
      console.error("Error fetching categories:", catError);
      throw catError;
    }

    console.log(`📋 Found ${categories?.length || 0} hotel categories`);

    // Fetch rates for each category
    const allRates = {};
    let hasAnyRates = false;

    if (categories && categories.length > 0) {
      for (const cat of categories) {
        const rates = await fetchRateRows(packageId, cat.id);
        allRates[cat.id] = rates;
        if (rates && rates.length > 0) {
          hasAnyRates = true;
        }
      }
    }

    console.log(`💰 Has rates: ${hasAnyRates}`);

    showLoading(false);

    // Create and show the rates modal
    const regularColumns = columns.filter((col) => !col.is_extra_night);
    const extraColumns = columns.filter((col) => col.is_extra_night);

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto";

    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-7xl w-full my-8 shadow-2xl" style="max-height: 90vh;">
        <!-- Header -->
        <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-purple-600 to-indigo-600 sticky top-0 z-10">
          <div class="relative px-6 py-5">
            <div class="flex items-center gap-4">
              <div class="h-14 w-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
                <i class="fas fa-eye text-2xl text-white"></i>
              </div>
              <div class="flex-1">
                <h3 class="text-2xl font-bold text-white">Rate Values</h3>
                <p class="text-purple-100 text-sm mt-1">${pkg.package_name} • ${searchFormat}</p>
              </div>
              <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl">&times;</button>
            </div>
          </div>
        </div>
        
        <div class="p-6 overflow-y-auto" style="max-height: calc(90vh - 120px);">
          ${categories
            ?.map((cat) => {
              const catRates = allRates[cat.id] || [];

              if (catRates.length === 0) {
                return `
                <div class="mb-8 border-2 border-gray-200 rounded-lg p-4">
                  <h4 class="font-bold text-lg mb-3 text-gray-700">${cat.category_name}</h4>
                  <p class="text-gray-400 italic text-center py-4">No rates entered for this category</p>
                  <div class="flex justify-center">
                    <button onclick="window.openRateInputModal(${packageId}, ${cat.id}, '${searchFormat}'); this.closest('.fixed').remove()" 
                            class="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                      <i class="fas fa-plus-circle mr-1"></i> Add Rates
                    </button>
                  </div>
                </div>
              `;
              }

              return `
              <div class="mb-8 border-2 border-gray-200 rounded-lg p-4">
                <div class="flex justify-between items-center mb-3">
                  <h4 class="font-bold text-lg text-gray-700">${cat.category_name}</h4>
                  <button onclick="window.openRateInputModal(${packageId}, ${cat.id}, '${searchFormat}'); this.closest('.fixed').remove()" 
                          class="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                    <i class="fas fa-edit mr-1"></i> Edit Rates
                  </button>
                </div>
                
                <div class="overflow-x-auto">
                  <table class="w-full border-collapse text-sm">
                    <thead>
                      <tr class="bg-gray-100">
                        <th class="border border-gray-300 px-3 py-2">Season</th>
                        <th class="border border-gray-300 px-3 py-2">Sneak</th>
                        <th class="border border-gray-300 px-3 py-2">Duration</th>
                        ${regularColumns
                          .map(
                            (col) =>
                              `<th class="border border-gray-300 px-3 py-2 bg-emerald-50">${col.column_label}</th>`,
                          )
                          .join("")}
                        ${extraColumns
                          .map(
                            (col) =>
                              `<th class="border border-gray-300 px-3 py-2 bg-purple-50">${col.column_label}</th>`,
                          )
                          .join("")}
                      </tr>
                    </thead>
                    <tbody>
                      ${catRates
                        .map(
                          (row) => `
                        <tr>
                          <td class="border border-gray-300 px-3 py-2">${row.season !== "N/A" ? row.season : "-"}</td>
                          <td class="border border-gray-300 px-3 py-2">${row.sneak !== "N/A" ? row.sneak : "-"}</td>
                          <td class="border border-gray-300 px-3 py-2">${row.duration !== "N/A" ? row.duration : "-"}</td>
                          ${regularColumns
                            .map(
                              (col) =>
                                `<td class="border border-gray-300 px-3 py-2 text-right">${row.values[col.column_key] ? "₱" + parseFloat(row.values[col.column_key].value).toLocaleString() : "-"}</td>`,
                            )
                            .join("")}
                          ${extraColumns
                            .map(
                              (col) =>
                                `<td class="border border-gray-300 px-3 py-2 text-right">${row.values[col.column_key] ? "₱" + parseFloat(row.values[col.column_key].value).toLocaleString() : "-"}</td>`,
                            )
                            .join("")}
                        </tr>
                      `,
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              </div>
            `;
            })
            .join("")}
          
          <div class="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
            <button onclick="this.closest('.fixed').remove()"
                    class="px-5 py-2.5 border-2 border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Close
            </button>
            <button onclick="window.openRateInputModal(${packageId}, ${categories?.[0]?.id}, '${searchFormat}'); this.closest('.fixed').remove()" 
                    class="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm hover:from-blue-700 hover:to-indigo-700">
              <i class="fas fa-edit mr-1"></i> Edit All Rates
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error("Error in viewRatesModal:", error);
    showToast("Failed to load rates: " + error.message, "error");
    showLoading(false);
  }
}
// =====================================================
// DESTINATION INTEGRATION FUNCTIONS
// =====================================================

window.editFormatFromDestination = async function (destinationId, formatName) {
  try {
    showLoading(true, "Loading format...");
    const columns = await fetchTableFormatByName(destinationId, formatName);

    if (columns && columns.length > 0) {
      const formatExample = {
        id: columns[0].id,
        format_name: formatName,
        format_description: columns[0].format_description,
        columns: columns,
      };
      openTableFormatBuilderModal(destinationId, formatExample);
    }
  } catch (error) {
    console.error("Error editing format:", error);
    showToast("Failed to load format", "error");
  } finally {
    showLoading(false);
  }
};

window.deleteFormatFromDestination = async function (
  destinationId,
  formatName,
) {
  showConfirmDialog(
    `⚠️ Delete format "${formatName}"? This will affect all packages using this format.`,
    async () => {
      const result = await deleteTableFormat(destinationId, formatName);
      if (result) {
        const modal = document.querySelector(".fixed.z-\\[100\\]");
        if (modal) {
          modal.remove();
          await viewDestinationDetails(destinationId);
        }
      }
    },
  );
};

window.selectTableFormatForPackage = async function (packageId, destinationId) {
  await openTableFormatSelectorModal(destinationId, async (formatName) => {
    try {
      showLoading(true, "Applying format...");

      const { error } = await supabase
        .from("destination_packages")
        .update({ table_format: formatName })
        .eq("id", packageId);

      if (error) throw error;

      showToast(
        `✅ Table format "${formatName}" applied to package`,
        "success",
      );

      const modal = document.querySelector(".fixed.z-\\[100\\]");
      if (modal) {
        modal.remove();
        await viewDestinationDetails(destinationId);
      }
    } catch (error) {
      console.error("Error applying format:", error);
      showToast("Failed to apply format", "error");
    } finally {
      showLoading(false);
    }
  });
};

// =====================================================
// EXPORT ALL FUNCTIONS
// =====================================================

window.openTableFormatBuilderModal = openTableFormatBuilderModal;
window.openTableFormatSelectorModal = openTableFormatSelectorModal;
window.renderTableFormatPreview = renderTableFormatPreview;
window.fetchTableFormats = fetchTableFormats;
window.fetchAllTableFormats = fetchAllTableFormats;
window.deleteTableFormat = deleteTableFormat;
window.reactivateTableFormat = reactivateTableFormat;
window.fixOrphanedTableFormat = fixOrphanedTableFormat;
window.fetchRateRows = fetchRateRows;
window.createRateRow = createRateRow;
window.updateRateRow = updateRateRow;
window.deleteRateRow = deleteRateRow;
window.updateRateCell = updateRateCell;
window.deleteRateCell = deleteRateCell;
window.updateColumnDefinition = updateColumnDefinition;
window.editFormatFromDestination = editFormatFromDestination;
window.deleteFormatFromDestination = deleteFormatFromDestination;
window.selectTableFormatForPackage = selectTableFormatForPackage;
window.assignFormatToPackage = assignFormatToPackage;
window.openPackageSelectorModal = openPackageSelectorModal;
window.openAssignFormatModal = openAssignFormatModal;
window.viewRatesModal = viewRatesModal;
window.openRateInputModal = openRateInputModal;
