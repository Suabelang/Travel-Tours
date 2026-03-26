// assets/js/modules/bookings/booking-ui.js
// BOOKING DETAILS MODAL UI - FULLY EDITABLE VERSION WITH ID PICTURE

console.log(
  "🎨 Booking Details UI Module Loading - FULLY EDITABLE VERSION WITH ID PICTURE",
);

// Helper function to get pax type label from booking data
function getPaxTypeLabel(booking) {
  if (booking.selected_pax_type) {
    return booking.selected_pax_type;
  }
  if (booking.selected_rate_details) {
    if (booking.selected_rate_details.includes("Solo")) return "Solo (1 pax)";
    if (booking.selected_rate_details.includes("2 Pax")) return "2 Pax";
    if (booking.selected_rate_details.includes("3 Pax")) return "3 Pax";
    if (booking.selected_rate_details.includes("4 Pax")) return "4 Pax";
    if (booking.selected_rate_details.includes("5 Pax")) return "5 Pax";
    if (booking.selected_rate_details.includes("6 Pax")) return "6 Pax";
    if (booking.selected_rate_details.includes("7 Pax")) return "7 Pax";
    if (booking.selected_rate_details.includes("8 Pax")) return "8 Pax";
    if (booking.selected_rate_details.includes("9 Pax")) return "9 Pax";
    if (booking.selected_rate_details.includes("10 Pax")) return "10 Pax";
    if (booking.selected_rate_details.includes("11 Pax")) return "11 Pax";
    if (booking.selected_rate_details.includes("12 Pax")) return "12 Pax";
    if (booking.selected_rate_details.includes("Child")) return "Child";
  }
  const count = booking.hotel_pax_count || 1;
  if (count === 1) return "Solo (1 pax)";
  return `${count} Pax`;
}

// Helper function to get hotel breakdown text
function getHotelBreakdown(booking) {
  const ratePerPax = booking.hotel_Rates_Selected || 0;
  const paxCount = booking.hotel_pax_count || 1;
  const extraNightPerPax = booking.hotel_extra_night_rate || 0;
  const totalExtraNight = extraNightPerPax * paxCount;
  let breakdown = `${paxCount} pax × ₱${ratePerPax.toLocaleString()} = ₱${(ratePerPax * paxCount).toLocaleString()}`;
  if (extraNightPerPax > 0) {
    breakdown += `\n+ Extra Night (${paxCount} pax × ₱${extraNightPerPax.toLocaleString()}) = ₱${totalExtraNight.toLocaleString()}`;
  }
  return breakdown;
}

// Helper function to get optional tour breakdown
function getOptionalTourBreakdown(booking) {
  if (
    !booking.optional_tour_rate_selected ||
    booking.optional_tour_rate_selected === 0
  )
    return null;
  const ratePerPax = booking.optional_tour_rate_selected;
  const paxCount =
    booking.optional_tour_pax_count || booking.hotel_pax_count || 1;
  const total = ratePerPax * paxCount;
  return `${paxCount} pax × ₱${ratePerPax.toLocaleString()} = ₱${total.toLocaleString()}`;
}

// =====================================================
// ID PICTURE FUNCTIONS
// =====================================================

// Function to upload ID picture to Supabase Storage
window.uploadIdPicture = async function (bookingId, file) {
  if (!file) {
    alert("Please select a file to upload.");
    return;
  }

  // Validate file type (images only)
  if (!file.type.startsWith("image/")) {
    alert("Please select a valid image file (JPEG, PNG, etc.)");
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert("File size should be less than 5MB");
    return;
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${bookingId}_${Date.now()}.${fileExt}`;
  const filePath = `id_pictures/${fileName}`;

  if (typeof showLoading !== "undefined")
    showLoading(true, "Uploading ID picture...");

  try {
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("booking-documents") // Your bucket name
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("booking-documents").getPublicUrl(filePath);

    // Update booking record with the URL and storage path
    const { error: updateError } = await supabase
      .from("b2b_bookings")
      .update({
        id_picture_url: publicUrl,
        id_picture_storage_path: filePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) throw updateError;

    alert("✅ ID picture uploaded successfully!");
    await window.viewBookingDetails(bookingId); // Refresh modal
  } catch (error) {
    console.error("Error uploading ID picture:", error);
    alert("Failed to upload ID picture: " + error.message);
  } finally {
    if (typeof showLoading !== "undefined") showLoading(false);
  }
};

// Function to delete ID picture
window.deleteIdPicture = async function (bookingId, storagePath) {
  if (
    !confirm(
      "Are you sure you want to delete this ID picture? This action cannot be undone.",
    )
  )
    return;

  if (typeof showLoading !== "undefined")
    showLoading(true, "Deleting ID picture...");

  try {
    // Delete from storage
    if (storagePath) {
      const { error: deleteStorageError } = await supabase.storage
        .from("booking-documents")
        .remove([storagePath]);

      if (deleteStorageError) throw deleteStorageError;
    }

    // Update booking record to remove references
    const { error: updateError } = await supabase
      .from("b2b_bookings")
      .update({
        id_picture_url: null,
        id_picture_storage_path: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) throw updateError;

    alert("✅ ID picture deleted successfully!");
    await window.viewBookingDetails(bookingId); // Refresh modal
  } catch (error) {
    console.error("Error deleting ID picture:", error);
    alert("Failed to delete ID picture: " + error.message);
  } finally {
    if (typeof showLoading !== "undefined") showLoading(false);
  }
};

// MAIN FUNCTION - View Booking Details with FULL EDITABILITY and ID Picture
window.viewBookingDetails = async function (id) {
  console.log("🔍 Viewing booking details for ID:", id);

  const booking = await window.fetchBookingById(id);
  if (!booking) {
    alert("Booking not found");
    return;
  }

  const status = (booking.status || "").toLowerCase();
  const isPending = status === "pending";
  const isConfirmed = status === "confirmed";
  const isPaid = (booking.payment_status || "").toLowerCase() === "paid";

  const travelDatesFormatted =
    booking.travel_dates
      ?.map((d) =>
        new Date(d).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      )
      .join(" → ") || "Not specified";

  const travelDatesISO =
    booking.travel_dates
      ?.map((d) => new Date(d).toISOString().split("T")[0])
      .join(", ") || "";

  const paxLabel = getPaxTypeLabel(booking);

  // Calculate totals with proper per-pax multiplication
  const hotelRatePerPax = booking.hotel_Rates_Selected || 0;
  const hotelPaxCount = booking.hotel_pax_count || 1;
  const hotelExtraNightPerPax = booking.hotel_extra_night_rate || 0;
  const hotelRegularTotal = hotelRatePerPax * hotelPaxCount;
  const hotelExtraTotal = hotelExtraNightPerPax * hotelPaxCount;
  const hotelTotal = hotelRegularTotal + hotelExtraTotal;

  const optionalTourRatePerPax = booking.optional_tour_rate_selected || 0;
  const optionalTourPaxCount = booking.optional_tour_pax_count || hotelPaxCount;
  const optionalTourTotal = optionalTourRatePerPax * optionalTourPaxCount;

  const additionalFee = booking.additional_fee || 0;
  const discount = booking.discount_amount || 0;
  const subtotal = hotelTotal + optionalTourTotal;
  const total = subtotal + additionalFee - discount;

  const hasIdPicture =
    booking.id_picture_url && booking.id_picture_url.trim() !== "";

  const modalHtml = `
    <div id="bookingDetailsModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div style="background: white; border-radius: 28px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: modalSlideIn 0.3s ease-out;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 20px 28px; border-radius: 28px 28px 0 0; position: sticky; top: 0; z-index: 10;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h2 style="color: white; margin: 0; font-size: 22px;">Edit Booking Details</h2>
              <p style="color: #d1fae5; margin: 4px 0 0 0; font-family: monospace;">${booking.booking_reference}</p>
            </div>
            <button onclick="closeDetailsModal()" style="width: 36px; height: 36px; background: rgba(255,255,255,0.2); border: none; border-radius: 18px; color: white; font-size: 20px; cursor: pointer;">&times;</button>
          </div>
        </div>
        
        <div style="padding: 28px;">
          <!-- Status Cards -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px;">
            <div style="background: ${isPending ? "#fef3c7" : isConfirmed ? "#dcfce7" : "#fee2e2"}; border-radius: 16px; padding: 12px 18px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas ${isPending ? "fa-clock" : isConfirmed ? "fa-check-circle" : "fa-times-circle"}" style="font-size: 22px; color: ${isPending ? "#d97706" : isConfirmed ? "#166534" : "#991b1b"}"></i>
                <div>
                  <p style="margin: 0; font-size: 10px;">BOOKING STATUS</p>
                  <p style="margin: 0; font-size: 16px; font-weight: 700;">${(booking.status || "PENDING").toUpperCase()}</p>
                </div>
              </div>
            </div>
            <div style="background: ${isPaid ? "#dcfce7" : "#f3f4f6"}; border-radius: 16px; padding: 12px 18px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas ${isPaid ? "fa-check-double" : "fa-hourglass-half"}" style="font-size: 22px; color: ${isPaid ? "#166534" : "#6b7280"}"></i>
                <div>
                  <p style="margin: 0; font-size: 10px;">PAYMENT STATUS</p>
                  <p style="margin: 0; font-size: 16px; font-weight: 700;">${(booking.payment_status || "UNPAID").toUpperCase()}</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- EDITABLE Client Information -->
          <div style="background: #f9fafb; border-radius: 20px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
              <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-user" style="color: white; font-size: 16px;"></i>
              </div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 700;">👤 Client Information</h3>
              <button onclick="toggleEditMode('clientInfo')" style="margin-left: auto; padding: 4px 12px; background: #059669; color: white; border: none; border-radius: 20px; font-size: 11px; cursor: pointer;">Edit</button>
            </div>
            <div id="clientInfoDisplay">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                <div><strong>Name:</strong><br><span id="displayName">${escapeHtml(booking.client_name) || "N/A"}</span></div>
                <div><strong>Email:</strong><br><span id="displayEmail">${escapeHtml(booking.client_email) || "N/A"}</span></div>
                <div><strong>Mobile:</strong><br><span id="displayMobile">${escapeHtml(booking.client_mobile) || "N/A"}</span></div>
                <div><strong>Nationality:</strong><br><span id="displayNationality">${escapeHtml(booking.nationality) || "Filipino"}</span></div>
              </div>
            </div>
            <div id="clientInfoEdit" style="display: none;">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                <div><input type="text" id="editName" value="${escapeHtml(booking.client_name || "")}" style="width: 100%; padding: 8px; border: 1px solid #10b981; border-radius: 8px;"></div>
                <div><input type="email" id="editEmail" value="${escapeHtml(booking.client_email || "")}" style="width: 100%; padding: 8px; border: 1px solid #10b981; border-radius: 8px;"></div>
                <div><input type="tel" id="editMobile" value="${escapeHtml(booking.client_mobile || "")}" style="width: 100%; padding: 8px; border: 1px solid #10b981; border-radius: 8px;"></div>
                <div><input type="text" id="editNationality" value="${escapeHtml(booking.nationality || "Filipino")}" style="width: 100%; padding: 8px; border: 1px solid #10b981; border-radius: 8px;"></div>
              </div>
              <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end;">
                <button onclick="cancelEdit('clientInfo')" style="padding: 6px 16px; background: #e5e7eb; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>
                <button onclick="saveClientInfo(${booking.id})" style="padding: 6px 16px; background: #059669; color: white; border: none; border-radius: 8px; cursor: pointer;">Save</button>
              </div>
            </div>
          </div>
          
          <!-- ID PICTURE SECTION -->
          <div style="background: #f9fafb; border-radius: 20px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
              <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-id-card" style="color: white; font-size: 16px;"></i>
              </div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 700;">🪪 ID Picture</h3>
            </div>
            <div id="idPictureSection">
              ${
                hasIdPicture
                  ? `
                <div style="text-align: center; margin-bottom: 16px;">
                  <img src="${booking.id_picture_url}" alt="ID Picture" style="max-width: 100%; max-height: 200px; border-radius: 8px; border: 1px solid #e5e7eb; cursor: pointer;" onclick="window.open('${booking.id_picture_url}', '_blank')">
                  <div style="margin-top: 8px;">
                    <button onclick="deleteIdPicture(${booking.id}, '${booking.id_picture_storage_path}')" style="padding: 4px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">Delete Picture</button>
                  </div>
                </div>
              `
                  : `
                <div style="text-align: center; padding: 24px; background: #f3f4f6; border-radius: 12px; border: 2px dashed #d1d5db;">
                  <i class="fas fa-cloud-upload-alt" style="font-size: 32px; color: #9ca3af; margin-bottom: 12px;"></i>
                  <p style="margin: 0 0 8px 0;">No ID picture uploaded</p>
                  <input type="file" id="idPictureFileInput" accept="image/*" style="display: none;">
                  <button onclick="document.getElementById('idPictureFileInput').click()" style="padding: 6px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">Upload Picture</button>
                </div>
              `
              }
            </div>
          </div>
          
          <!-- EDITABLE Trip Details -->
          <div style="background: #f9fafb; border-radius: 20px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
              <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-plane" style="color: white; font-size: 16px;"></i>
              </div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 700;">✈️ Trip Details</h3>
              <button onclick="toggleEditMode('tripDetails')" style="margin-left: auto; padding: 4px 12px; background: #059669; color: white; border: none; border-radius: 20px; font-size: 11px; cursor: pointer;">Edit</button>
            </div>
            <div id="tripDetailsDisplay">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                <div><strong>Destination:</strong><br><span id="displayDestination">${escapeHtml(booking.destinations?.name || booking.category_name) || "N/A"}</span></div>
                <div><strong>Package:</strong><br><span id="displayPackage">${escapeHtml(booking.package_Name || booking.destination_packages?.package_name) || "N/A"}</span></div>
                <div><strong>Hotel Category:</strong><br><span id="displayHotel">${escapeHtml(booking.hotel_Name || booking.hotel_categories?.category_name) || "N/A"}</span></div>
                <div><strong>Travel Dates:</strong><br><span id="displayTravelDates">${travelDatesFormatted}</span></div>
                <div><strong>Number of Pax:</strong><br><span id="displayPax">${paxLabel}</span></div>
              </div>
              ${
                booking.selected_rate_details
                  ? `
                <div style="margin-top: 12px;">
                  <strong>Selected Rate:</strong><br>
                  <div style="background: #e8f5e9; padding: 8px 12px; border-radius: 8px;">${escapeHtml(booking.selected_rate_details)}</div>
                </div>
              `
                  : ""
              }
            </div>
            <div id="tripDetailsEdit" style="display: none;">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                <div><label style="font-size: 12px;">Destination</label><input type="text" id="editDestination" value="${escapeHtml(booking.destinations?.name || booking.category_name || "")}" style="width: 100%; padding: 8px; border: 1px solid #10b981; border-radius: 8px;"></div>
                <div><label style="font-size: 12px;">Package</label><input type="text" id="editPackage" value="${escapeHtml(booking.package_Name || booking.destination_packages?.package_name || "")}" style="width: 100%; padding: 8px; border: 1px solid #10b981; border-radius: 8px;"></div>
                <div><label style="font-size: 12px;">Hotel Category</label><input type="text" id="editHotel" value="${escapeHtml(booking.hotel_Name || booking.hotel_categories?.category_name || "")}" style="width: 100%; padding: 8px; border: 1px solid #10b981; border-radius: 8px;"></div>
                <div><label style="font-size: 12px;">Travel Dates (YYYY-MM-DD, YYYY-MM-DD)</label><input type="text" id="editTravelDates" value="${travelDatesISO}" placeholder="2024-03-20, 2024-03-25" style="width: 100%; padding: 8px; border: 1px solid #10b981; border-radius: 8px;"></div>
                <div><label style="font-size: 12px;">Number of Pax</label><input type="number" id="editPaxCount" value="${booking.hotel_pax_count || 1}" style="width: 100%; padding: 8px; border: 1px solid #10b981; border-radius: 8px;"></div>
                <div><label style="font-size: 12px;">Pax Type</label><input type="text" id="editPaxType" value="${paxLabel}" style="width: 100%; padding: 8px; border: 1px solid #10b981; border-radius: 8px;"></div>
              </div>
              <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end;">
                <button onclick="cancelEdit('tripDetails')" style="padding: 6px 16px; background: #e5e7eb; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>
                <button onclick="saveTripDetails(${booking.id})" style="padding: 6px 16px; background: #059669; color: white; border: none; border-radius: 8px; cursor: pointer;">Save</button>
              </div>
            </div>
          </div>
          
          <!-- EDITABLE Hotel Package Breakdown -->
          <div style="background: #f9fafb; border-radius: 20px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
              <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-hotel" style="color: white; font-size: 16px;"></i>
              </div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 700;">🏨 Hotel Package Breakdown</h3>
              <button onclick="toggleEditMode('hotelRates')" style="margin-left: auto; padding: 4px 12px; background: #059669; color: white; border: none; border-radius: 20px; font-size: 11px; cursor: pointer;">Edit</button>
            </div>
            <div id="hotelRatesDisplay">
              <div style="background: white; border-radius: 12px; padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
                  <span style="font-weight: 600;">Rate per Pax:</span>
                  <span>₱${(booking.hotel_Rates_Selected || 0).toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
                  <span style="font-weight: 600;">Number of Pax:</span>
                  <span>${booking.hotel_pax_count || 1}</span>
                </div>
                <div style="border-top: 1px solid #e5e7eb; margin: 12px 0; padding-top: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <span>Hotel Base Total:</span>
                    <span>₱${hotelRegularTotal.toLocaleString()}</span>
                  </div>
                  ${
                    booking.hotel_extra_night_rate &&
                    booking.hotel_extra_night_rate > 0
                      ? `
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 8px;">
                      <span>Extra Night Fee (${booking.hotel_pax_count || 1} pax × ₱${booking.hotel_extra_night_rate.toLocaleString()}):</span>
                      <span>₱${hotelExtraTotal.toLocaleString()}</span>
                    </div>
                  `
                      : ""
                  }
                  <div style="border-top: 2px solid #10b981; margin-top: 12px; padding-top: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                      <strong>Hotel Total:</strong>
                      <strong style="color: #059669;">₱${hotelTotal.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div id="hotelRatesEdit" style="display: none;">
              <div style="background: white; border-radius: 12px; padding: 16px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                  <div><label style="font-size: 12px;">Rate per Pax (₱)</label><input type="number" id="editRatePerPax" value="${booking.hotel_Rates_Selected || 0}" step="100" style="width: 100%; padding: 8px; border: 1px solid #10b981; border-radius: 8px;"></div>
                  <div><label style="font-size: 12px;">Number of Pax</label><input type="number" id="editHotelPaxCount" value="${booking.hotel_pax_count || 1}" step="1" min="1" style="width: 100%; padding: 8px; border: 1px solid #10b981; border-radius: 8px;"></div>
                  <div><label style="font-size: 12px;">Extra Night Rate per Pax (₱)</label><input type="number" id="editExtraNightRate" value="${booking.hotel_extra_night_rate || 0}" step="100" style="width: 100%; padding: 8px; border: 1px solid #10b981; border-radius: 8px;"></div>
                </div>
                <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end;">
                  <button onclick="cancelEdit('hotelRates')" style="padding: 6px 16px; background: #e5e7eb; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>
                  <button onclick="saveHotelRates(${booking.id})" style="padding: 6px 16px; background: #059669; color: white; border: none; border-radius: 8px; cursor: pointer;">Save</button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- EDITABLE Optional Tour -->
          ${
            booking.optional_tour_name
              ? `
            <div style="background: #f9fafb; border-radius: 20px; padding: 20px; margin-bottom: 20px;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
                <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                  <i class="fas fa-umbrella-beach" style="color: white; font-size: 16px;"></i>
                </div>
                <h3 style="margin: 0; font-size: 16px; font-weight: 700;">🏝️ Optional Tour Breakdown</h3>
                <button onclick="toggleEditMode('optionalTour')" style="margin-left: auto; padding: 4px 12px; background: #059669; color: white; border: none; border-radius: 20px; font-size: 11px; cursor: pointer;">Edit</button>
              </div>
              <div id="optionalTourDisplay">
                <div style="background: white; border-radius: 12px; padding: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
                    <span><strong>Tour Name:</strong></span>
                    <span>${escapeHtml(booking.optional_tour_name)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
                    <span><strong>Rate per Pax:</strong></span>
                    <span>₱${(booking.optional_tour_rate_selected || 0).toLocaleString()}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
                    <span><strong>Number of Pax:</strong></span>
                    <span>${booking.optional_tour_pax_count || booking.hotel_pax_count || 1}</span>
                  </div>
                  <div style="border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                      <strong>Tour Total:</strong>
                      <strong style="color: #059669;">₱${optionalTourTotal.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div id="optionalTourEdit" style="display: none;">
                <div style="background: white; border-radius: 12px; padding: 16px;">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div><label style="font-size: 12px;">Tour Name</label><input type="text" id="editTourName" value="${escapeHtml(booking.optional_tour_name)}" style="width: 100%; padding: 8px; border: 1px solid #10b981; border-radius: 8px;"></div>
                    <div><label style="font-size: 12px;">Rate per Pax (₱)</label><input type="number" id="editTourRate" value="${booking.optional_tour_rate_selected || 0}" step="100" style="width: 100%; padding: 8px; border: 1px solid #10b981; border-radius: 8px;"></div>
                    <div><label style="font-size: 12px;">Number of Pax</label><input type="number" id="editTourPaxCount" value="${booking.optional_tour_pax_count || booking.hotel_pax_count || 1}" step="1" min="1" style="width: 100%; padding: 8px; border: 1px solid #10b981; border-radius: 8px;"></div>
                  </div>
                  <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end;">
                    <button onclick="cancelEdit('optionalTour')" style="padding: 6px 16px; background: #e5e7eb; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>
                    <button onclick="saveOptionalTour(${booking.id})" style="padding: 6px 16px; background: #059669; color: white; border: none; border-radius: 8px; cursor: pointer;">Save</button>
                  </div>
                </div>
              </div>
            </div>
          `
              : ""
          }
          
          <!-- EDITABLE Special Requests -->
          <div style="background: #f9fafb; border-radius: 20px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
              <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-pen" style="color: white; font-size: 16px;"></i>
              </div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 700;">📝 Special Requests</h3>
              <button onclick="toggleEditMode('specialRequests')" style="margin-left: auto; padding: 4px 12px; background: #059669; color: white; border: none; border-radius: 20px; font-size: 11px; cursor: pointer;">Edit</button>
            </div>
            <div id="specialRequestsDisplay">
              <p style="margin: 0; padding: 12px; background: white; border-radius: 12px;">${escapeHtml(booking.special_requests) || "No special requests"}</p>
            </div>
            <div id="specialRequestsEdit" style="display: none;">
              <textarea id="editSpecialRequests" rows="3" style="width: 100%; padding: 12px; border: 1px solid #10b981; border-radius: 12px;">${escapeHtml(booking.special_requests || "")}</textarea>
              <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end;">
                <button onclick="cancelEdit('specialRequests')" style="padding: 6px 16px; background: #e5e7eb; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>
                <button onclick="saveSpecialRequests(${booking.id})" style="padding: 6px 16px; background: #059669; color: white; border: none; border-radius: 8px; cursor: pointer;">Save</button>
              </div>
            </div>
          </div>
          
          <!-- Price Summary with Admin Editable Fields -->
          <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 20px; padding: 20px; margin-bottom: 28px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 44px; height: 44px; background: #10b981; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                  <i class="fas fa-receipt" style="color: white; font-size: 20px;"></i>
                </div>
                <div>
                  <p style="margin: 0; font-size: 12px;">Price Breakdown</p>
                  <p style="margin: 0; font-size: 12px;">Subtotal: ₱${subtotal.toLocaleString()}</p>
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <div style="text-align: right;">
                  <p style="margin: 0; font-size: 11px;">Created</p>
                  <p style="margin: 0; font-size: 12px; font-weight: 500;">${new Date(booking.created_at).toLocaleDateString()}</p>
                </div>
                <div style="width: 1px; background: #a7f3d0;"></div>
                <div style="text-align: right;">
                  <p style="margin: 0; font-size: 11px;">Last Updated</p>
                  <p style="margin: 0; font-size: 12px; font-weight: 500;">${new Date(booking.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            
            <!-- Admin Editable Fields for Fees -->
            <div style="border-top: 1px solid #a7f3d0; padding-top: 16px; margin-top: 8px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px;">Additional Fee (₱)</label>
                  <input type="number" id="additionalFeeInput" value="${booking.additional_fee || 0}" step="100" min="0" 
                         style="width: 100%; padding: 8px 12px; border: 1px solid #10b981; border-radius: 8px; font-size: 14px;">
                  <input type="text" id="additionalFeeDescInput" value="${escapeHtml(booking.additional_fee_description || "")}" 
                         placeholder="Fee description (e.g., Airport Transfer)" 
                         style="width: 100%; margin-top: 4px; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px;">
                </div>
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px;">Discount (₱)</label>
                  <input type="number" id="discountAmountInput" value="${booking.discount_amount || 0}" step="100" min="0" 
                         style="width: 100%; padding: 8px 12px; border: 1px solid #10b981; border-radius: 8px; font-size: 14px;">
                  <input type="text" id="discountDescInput" value="${escapeHtml(booking.discount_description || "")}" 
                         placeholder="Discount description (e.g., Early Bird)" 
                         style="width: 100%; margin-top: 4px; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px;">
                </div>
              </div>
              <div id="updatedTotalDisplay" style="background: white; border-radius: 12px; padding: 12px; text-align: center; margin-bottom: 16px;">
                <span style="font-size: 14px;">Updated Total:</span>
                <span style="font-size: 24px; font-weight: 800; margin-left: 12px;">₱${total.toLocaleString()}</span>
              </div>
              <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button onclick="updateBookingFees(${booking.id})" style="padding: 8px 20px; background: linear-gradient(135deg, #059669, #10b981); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 500;">
                  💾 Save Fee Adjustments
                </button>
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div style="border-top: 2px solid #e5e7eb; padding-top: 24px;">
            <div style="display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;">
              <button onclick="closeDetailsModal()" style="padding: 10px 24px; background: white; border: 1px solid #d1d5db; border-radius: 12px; cursor: pointer; font-weight: 500;">
                Close
              </button>
              
              ${
                isPending
                  ? `
                <button onclick="handleApproveWithFees(${booking.id})" style="padding: 10px 24px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 500;">
                  ✓ Approve & Send Email
                </button>
                <button onclick="handleRejectBooking(${booking.id})" style="padding: 10px 24px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 500;">
                  ✗ Reject
                </button>
              `
                  : `
                <button onclick="handleSetPending(${booking.id})" style="padding: 10px 24px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 500;">
                  ↺ Set as Pending
                </button>
              `
              }
              
              ${
                !isPaid && isConfirmed
                  ? `
                <button onclick="handlePaymentConfirmation(${booking.id})" style="padding: 10px 24px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 500;">
                  💰 Mark Paid & Send Receipt
                </button>
              `
                  : ""
              }
              
              <button onclick="if(confirm('⚠️ Delete this booking?')) handleDeleteBooking(${booking.id}, '${booking.booking_reference}')" style="padding: 10px 24px; background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 500;">
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <style>
      @keyframes modalSlideIn {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      input:focus, textarea:focus {
        outline: none;
        border-color: #10b981;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
      }
    </style>
  `;

  const existingModal = document.getElementById("bookingDetailsModal");
  if (existingModal) existingModal.remove();
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  // Add real-time total update for fees
  const additionalFeeInput = document.getElementById("additionalFeeInput");
  const discountAmountInput = document.getElementById("discountAmountInput");
  const updatedTotalDisplay = document.getElementById("updatedTotalDisplay");

  function updateLiveTotal() {
    const additionalFee = parseFloat(additionalFeeInput?.value) || 0;
    const discountAmount = parseFloat(discountAmountInput?.value) || 0;
    const newTotal = subtotal + additionalFee - discountAmount;
    if (updatedTotalDisplay) {
      updatedTotalDisplay.innerHTML = `
        <span style="font-size: 14px;">Updated Total:</span>
        <span style="font-size: 24px; font-weight: 800; margin-left: 12px;">₱${newTotal.toLocaleString()}</span>
      `;
    }
  }

  additionalFeeInput?.addEventListener("input", updateLiveTotal);
  discountAmountInput?.addEventListener("input", updateLiveTotal);

  window.closeDetailsModal = function () {
    const modal = document.getElementById("bookingDetailsModal");
    if (modal) modal.remove();
  };

  // Add file upload event listener
  const fileInput = document.getElementById("idPictureFileInput");
  if (fileInput) {
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        await window.uploadIdPicture(booking.id, file);
        // Reset the file input
        fileInput.value = "";
      }
    };
  }

  document
    .getElementById("bookingDetailsModal")
    ?.addEventListener("click", function (e) {
      if (e.target === this) closeDetailsModal();
    });
};

// =====================================================
// EDIT MODE TOGGLE FUNCTIONS
// =====================================================

let currentEditMode = null;

function toggleEditMode(section) {
  const displayEl = document.getElementById(`${section}Display`);
  const editEl = document.getElementById(`${section}Edit`);

  if (displayEl && editEl) {
    displayEl.style.display = "none";
    editEl.style.display = "block";
    currentEditMode = section;
  }
}

function cancelEdit(section) {
  const displayEl = document.getElementById(`${section}Display`);
  const editEl = document.getElementById(`${section}Edit`);

  if (displayEl && editEl) {
    displayEl.style.display = "block";
    editEl.style.display = "none";
    currentEditMode = null;
  }
}

// =====================================================
// SAVE FUNCTIONS
// =====================================================

// Save Client Info
window.saveClientInfo = async function (bookingId) {
  const name = document.getElementById("editName")?.value;
  const email = document.getElementById("editEmail")?.value;
  const mobile = document.getElementById("editMobile")?.value;
  const nationality = document.getElementById("editNationality")?.value;

  if (!name || !email) {
    alert("Name and Email are required");
    return;
  }

  try {
    const { error } = await supabase
      .from("b2b_bookings")
      .update({
        client_name: name,
        client_email: email,
        client_mobile: mobile || null,
        nationality: nationality || "Filipino",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) throw error;

    alert("✅ Client information updated successfully!");
    cancelEdit("clientInfo");
    await window.viewBookingDetails(bookingId);
  } catch (error) {
    console.error("Error updating client info:", error);
    alert("Failed to update: " + error.message);
  }
};

// Save Trip Details
window.saveTripDetails = async function (bookingId) {
  const destination = document.getElementById("editDestination")?.value;
  const packageName = document.getElementById("editPackage")?.value;
  const hotel = document.getElementById("editHotel")?.value;
  const travelDatesStr = document.getElementById("editTravelDates")?.value;
  const paxCount =
    parseInt(document.getElementById("editPaxCount")?.value) || 1;
  const paxType = document.getElementById("editPaxType")?.value;

  let travelDatesArray = [];
  if (travelDatesStr) {
    travelDatesArray = travelDatesStr.split(",").map((d) => new Date(d.trim()));
  }

  try {
    const { error } = await supabase
      .from("b2b_bookings")
      .update({
        category_name: destination,
        package_Name: packageName,
        hotel_Name: hotel,
        travel_dates: travelDatesArray,
        hotel_pax_count: paxCount,
        selected_pax_type: paxType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) throw error;

    alert("✅ Trip details updated successfully!");
    cancelEdit("tripDetails");
    await window.viewBookingDetails(bookingId);
  } catch (error) {
    console.error("Error updating trip details:", error);
    alert("Failed to update: " + error.message);
  }
};

// Save Hotel Rates
window.saveHotelRates = async function (bookingId) {
  const ratePerPax =
    parseFloat(document.getElementById("editRatePerPax")?.value) || 0;
  const paxCount =
    parseInt(document.getElementById("editHotelPaxCount")?.value) || 1;
  const extraNightRate =
    parseFloat(document.getElementById("editExtraNightRate")?.value) || 0;

  // Recalculate totals
  const hotelBaseTotal = ratePerPax * paxCount;
  const hotelExtraTotal = extraNightRate * paxCount;
  const hotelTotal = hotelBaseTotal + hotelExtraTotal;

  // Get optional tour values to recalculate grand total
  const booking = await window.fetchBookingById(bookingId);
  const optionalTourRate = booking?.optional_tour_rate_selected || 0;
  const optionalTourPax = booking?.optional_tour_pax_count || paxCount;
  const optionalTourTotal = optionalTourRate * optionalTourPax;

  const additionalFee = booking?.additional_fee || 0;
  const discount = booking?.discount_amount || 0;
  const newTotal = hotelTotal + optionalTourTotal + additionalFee - discount;

  try {
    const { error } = await supabase
      .from("b2b_bookings")
      .update({
        hotel_Rates_Selected: ratePerPax,
        hotel_pax_count: paxCount,
        hotel_extra_night_rate: extraNightRate,
        total_amount: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) throw error;

    alert(`✅ Hotel rates updated! New Total: ₱${newTotal.toLocaleString()}`);
    cancelEdit("hotelRates");
    await window.viewBookingDetails(bookingId);
  } catch (error) {
    console.error("Error updating hotel rates:", error);
    alert("Failed to update: " + error.message);
  }
};

// Save Optional Tour
window.saveOptionalTour = async function (bookingId) {
  const tourName = document.getElementById("editTourName")?.value;
  const tourRate =
    parseFloat(document.getElementById("editTourRate")?.value) || 0;
  const tourPaxCount =
    parseInt(document.getElementById("editTourPaxCount")?.value) || 1;

  const tourTotal = tourRate * tourPaxCount;

  // Get other values to recalculate grand total
  const booking = await window.fetchBookingById(bookingId);
  const hotelRate = booking?.hotel_Rates_Selected || 0;
  const hotelPax = booking?.hotel_pax_count || 1;
  const extraNight = booking?.hotel_extra_night_rate || 0;
  const hotelTotal = hotelRate * hotelPax + extraNight * hotelPax;

  const additionalFee = booking?.additional_fee || 0;
  const discount = booking?.discount_amount || 0;
  const newTotal = hotelTotal + tourTotal + additionalFee - discount;

  try {
    const { error } = await supabase
      .from("b2b_bookings")
      .update({
        optional_tour_name: tourName,
        optional_tour_rate_selected: tourRate,
        optional_tour_pax_count: tourPaxCount,
        optional_tour_total_amount: tourTotal,
        total_amount: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) throw error;

    alert(`✅ Optional tour updated! New Total: ₱${newTotal.toLocaleString()}`);
    cancelEdit("optionalTour");
    await window.viewBookingDetails(bookingId);
  } catch (error) {
    console.error("Error updating optional tour:", error);
    alert("Failed to update: " + error.message);
  }
};

// Save Special Requests
window.saveSpecialRequests = async function (bookingId) {
  const requests = document.getElementById("editSpecialRequests")?.value;

  try {
    const { error } = await supabase
      .from("b2b_bookings")
      .update({
        special_requests: requests || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) throw error;

    alert("✅ Special requests updated!");
    cancelEdit("specialRequests");
    await window.viewBookingDetails(bookingId);
  } catch (error) {
    console.error("Error updating special requests:", error);
    alert("Failed to update: " + error.message);
  }
};

// =====================================================
// UPDATE TRAVEL DATES FUNCTION (Legacy - kept for compatibility)
// =====================================================

window.updateTravelDates = async function (bookingId) {
  const travelDatesInput = document.getElementById("editTravelDates");
  if (!travelDatesInput) return;

  const travelDatesStr = travelDatesInput.value;
  if (!travelDatesStr) {
    alert("Please enter travel dates in format: YYYY-MM-DD, YYYY-MM-DD");
    return;
  }

  const travelDatesArray = travelDatesStr
    .split(",")
    .map((d) => new Date(d.trim()));
  if (travelDatesArray.length < 2) {
    alert("Please enter both start and end dates");
    return;
  }

  if (!confirm(`Update travel dates to:\n${travelDatesStr}?`)) return;

  try {
    const { error } = await supabase
      .from("b2b_bookings")
      .update({
        travel_dates: travelDatesArray,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) throw error;

    alert("✅ Travel dates updated successfully!");
    await window.viewBookingDetails(bookingId);
  } catch (error) {
    console.error("Error updating travel dates:", error);
    alert("Failed to update travel dates: " + error.message);
  }
};

// =====================================================
// UPDATE BOOKING FEES (Additional Fee & Discount)
// =====================================================

window.updateBookingFees = async function (bookingId) {
  const additionalFee =
    parseFloat(document.getElementById("additionalFeeInput")?.value) || 0;
  const additionalFeeDesc =
    document.getElementById("additionalFeeDescInput")?.value || null;
  const discountAmount =
    parseFloat(document.getElementById("discountAmountInput")?.value) || 0;
  const discountDesc =
    document.getElementById("discountDescInput")?.value || null;

  const booking = await window.fetchBookingById(bookingId);
  if (!booking) {
    alert("Booking not found");
    return;
  }

  // Calculate subtotal with proper per-pax multiplication
  const hotelRatePerPax = booking.hotel_Rates_Selected || 0;
  const hotelPaxCount = booking.hotel_pax_count || 1;
  const hotelExtraNightPerPax = booking.hotel_extra_night_rate || 0;
  const hotelTotal =
    hotelRatePerPax * hotelPaxCount + hotelExtraNightPerPax * hotelPaxCount;

  const optionalTourRatePerPax = booking.optional_tour_rate_selected || 0;
  const optionalTourPaxCount = booking.optional_tour_pax_count || hotelPaxCount;
  const optionalTourTotal = optionalTourRatePerPax * optionalTourPaxCount;

  const subtotal = hotelTotal + optionalTourTotal;
  const newTotal = subtotal + additionalFee - discountAmount;

  if (
    !confirm(
      `Update fees?\n\nAdditional Fee: ₱${additionalFee.toLocaleString()}${additionalFeeDesc ? ` (${additionalFeeDesc})` : ""}\nDiscount: ₱${discountAmount.toLocaleString()}${discountDesc ? ` (${discountDesc})` : ""}\nNew Total: ₱${newTotal.toLocaleString()}`,
    )
  ) {
    return;
  }

  try {
    const { error } = await supabase
      .from("b2b_bookings")
      .update({
        additional_fee: additionalFee,
        additional_fee_description: additionalFeeDesc,
        discount_amount: discountAmount,
        discount_description: discountDesc,
        total_amount: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) throw error;

    alert(
      `✅ Fees updated successfully!\nNew Total: ₱${newTotal.toLocaleString()}`,
    );
    await window.viewBookingDetails(bookingId);
  } catch (error) {
    console.error("Error updating fees:", error);
    alert("Failed to update fees: " + error.message);
  }
};

// =====================================================
// APPROVE WITH FEES (Save fees and approve)
// =====================================================

window.handleApproveWithFees = async function (bookingId) {
  await window.updateBookingFees(bookingId);

  setTimeout(async () => {
    const booking = await window.fetchBookingById(bookingId);
    if (booking) {
      const totalAmount = booking.total_amount;
      if (
        !confirm(
          `Approve this booking with total amount ₱${totalAmount.toLocaleString()}?`,
        )
      )
        return;

      try {
        if (typeof showLoading !== "undefined")
          showLoading(true, "Processing approval...");

        const updateResult = await window.updateBookingStatusAndAmount(
          bookingId,
          "confirmed",
          totalAmount,
        );

        if (updateResult) {
          if (typeof window.sendApprovalEmail !== "undefined") {
            await window.sendApprovalEmail(bookingId);
          }
          alert(
            `✅ Booking approved with amount ₱${totalAmount.toLocaleString()}!`,
          );
          await window.fetchBookings();
          if (typeof window.renderBookingsTable === "function")
            window.renderBookingsTable();
          closeDetailsModal();
        }

        if (typeof showLoading !== "undefined") showLoading(false);
      } catch (error) {
        console.error("Error:", error);
        alert("Failed to approve booking");
        if (typeof showLoading !== "undefined") showLoading(false);
      }
    }
  }, 500);
};

// =====================================================
// HANDLE REJECT BOOKING
// =====================================================

window.handleRejectBooking = async function (bookingId) {
  if (!confirm("Reject this booking? This action cannot be undone.")) return;

  try {
    const updateResult = await window.updateBookingStatusAndAmount(
      bookingId,
      "rejected",
    );
    if (updateResult) {
      alert("✅ Booking rejected");
      await window.fetchBookings();
      window.renderBookingsTable();
      closeDetailsModal();
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to reject booking");
  }
};

// =====================================================
// HANDLE SET PENDING
// =====================================================

window.handleSetPending = async function (bookingId) {
  if (!confirm("Set this booking back to pending status?")) return;

  try {
    const updateResult = await window.updateBookingStatusAndAmount(
      bookingId,
      "pending",
    );
    if (updateResult) {
      alert("✅ Booking status set to pending");
      await window.fetchBookings();
      window.renderBookingsTable();
      closeDetailsModal();
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to update booking status");
  }
};

// =====================================================
// HANDLE PAYMENT CONFIRMATION
// =====================================================

window.handlePaymentConfirmation = async function (bookingId) {
  if (!confirm("Mark this booking as paid? This will send a receipt email."))
    return;

  try {
    const { error } = await supabase
      .from("b2b_bookings")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) throw error;

    if (typeof window.sendPaymentReceipt !== "undefined") {
      await window.sendPaymentReceipt(bookingId);
    }

    alert("✅ Payment confirmed and receipt sent!");
    await window.fetchBookings();
    window.renderBookingsTable();
    closeDetailsModal();
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to confirm payment");
  }
};

// =====================================================
// HANDLE DELETE BOOKING
// =====================================================

window.handleDeleteBooking = async function (bookingId, bookingRef) {
  if (
    !confirm(`⚠️ Delete booking ${bookingRef}? This action cannot be undone!`)
  )
    return;

  try {
    const { error } = await supabase
      .from("b2b_bookings")
      .delete()
      .eq("id", bookingId);
    if (error) throw error;

    alert(`✅ Booking ${bookingRef} deleted successfully`);
    await window.fetchBookings();
    window.renderBookingsTable();
    closeDetailsModal();
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to delete booking");
  }
};

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

console.log(
  "✅ Booking Details UI Module Loaded - FULLY EDITABLE VERSION WITH ID PICTURE",
);
