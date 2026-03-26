// assets/js/modules/bookings.js
// Main Bookings Module - With Extra Night Dropdown & Pax Type

console.log("🚀 Bookings Module Loading...");

// Global state
window.bookingState = {
  bookings: [],
};

// Fetch all bookings
window.fetchBookings = async function () {
  try {
    console.log("Fetching bookings...");

    const { data: bookings, error } = await supabase
      .from("b2b_bookings")
      .select(
        `
                *,
                destinations!b2b_bookings_destination_id_fkey (name),
                destination_packages!b2b_bookings_package_id_fkey (package_name)
            `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    window.bookingState.bookings = bookings || [];
    console.log("Bookings loaded:", window.bookingState.bookings.length);

    return window.bookingState.bookings;
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return [];
  }
};

// Fetch single booking by ID
window.fetchBookingById = async function (id) {
  try {
    const { data, error } = await supabase
      .from("b2b_bookings")
      .select(
        `
                *,
                destinations!b2b_bookings_destination_id_fkey (name),
                destination_packages!b2b_bookings_package_id_fkey (package_name),
                hotel_categories (category_name)
            `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching booking:", error);
    return null;
  }
};

// Update booking status and amount
window.updateBookingStatusAndAmount = async function (
  id,
  status,
  amount = null,
) {
  try {
    const updateData = {
      status: status,
      updated_at: new Date().toISOString(),
    };

    if (amount !== null) {
      updateData.total_amount = amount;
    }

    const { error } = await supabase
      .from("b2b_bookings")
      .update(updateData)
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating booking:", error);
    return false;
  }
};

// Render bookings table
window.renderBookingsTable = function () {
  const container = document.getElementById("bookings-table-container");
  if (!container) return;

  const bookings = window.bookingState.bookings;

  if (bookings.length === 0) {
    container.innerHTML = `
            <div class="text-center py-12 bg-white rounded-xl border border-gray-200">
                <i class="fas fa-calendar-alt text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-lg font-medium text-gray-600">No bookings found</h3>
                <button onclick="openCreateBookingModal()" class="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg">Create New Booking</button>
            </div>
        `;
    return;
  }

  container.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                         <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">Reference</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">Client</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">Destination</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">Package</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">Hotel</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">Travel Dates</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">Total</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                            <th class="px-6 py-3 text-center text-xs font-medium text-gray-500">Actions</th>
                         </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${bookings
                          .map(
                            (booking) => `
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 text-sm font-mono">${booking.booking_reference}</td>
                                <td class="px-6 py-4 text-sm">${booking.client_name || "N/A"}</td>
                                <td class="px-6 py-4 text-sm">${booking.destinations?.name || booking.category_name || "N/A"}</td>
                                <td class="px-6 py-4 text-sm">${booking.package_Name || booking.destination_packages?.package_name || "N/A"}</td>
                                <td class="px-6 py-4 text-sm">${booking.hotel_Name || "N/A"}</td>
                                <td class="px-6 py-4 text-sm">${booking.travel_dates?.length ? new Date(booking.travel_dates[0]).toLocaleDateString() + " - " + new Date(booking.travel_dates[booking.travel_dates.length - 1]).toLocaleDateString() : "N/A"}</td>
                                <td class="px-6 py-4 text-sm font-medium">₱${(Number(booking.total_amount) || 0).toLocaleString()}</td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 text-xs rounded-full ${booking.status === "confirmed" ? "bg-green-100 text-green-800" : booking.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}">
                                        ${(booking.status || "PENDING").toUpperCase()}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-center">
                                    <button onclick="viewBookingDetails(${booking.id})" class="text-blue-600 hover:text-blue-800 mx-1">
                                        <i class="fas fa-eye"></i>
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
};

// OPEN CREATE BOOKING MODAL
window.openCreateBookingModal = async function () {
  console.log("Opening create booking modal...");

  try {
    // Fetch destinations
    const { data: destinations, error: destError } = await supabase
      .from("destinations")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (destError) throw destError;

    // Fetch optional tours
    const { data: optionalTours } = await supabase
      .from("optional_tour_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    const modalHtml = `
            <div id="createBookingModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style="z-index: 10001;">
                <div class="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                    <div class="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 rounded-t-xl sticky top-0">
                        <div class="flex justify-between items-center">
                            <div>
                                <h3 class="text-xl font-bold text-white">Create New Booking</h3>
                                <p class="text-emerald-100 text-sm">Fill in customer and travel details</p>
                            </div>
                            <button onclick="closeCreateModal()" class="text-white hover:text-gray-200 text-2xl">&times;</button>
                        </div>
                    </div>
                    <form id="createBookingForm" class="p-6 space-y-5">
                        <!-- Customer Information -->
                        <div class="border-b pb-4">
                            <h4 class="font-semibold text-gray-800 mb-3">👤 Customer Information</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input type="text" id="clientName" required class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input type="email" id="clientEmail" required class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                                    <input type="text" id="clientMobile" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                                    <select id="nationality" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                        <option value="Filipino">Filipino</option>
                                        <option value="Foreign">Foreign</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Trip Details -->
                        <div class="border-b pb-4">
                            <h4 class="font-semibold text-gray-800 mb-3">✈️ Trip Details</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Destination *</label>
                                    <select id="destinationId" required class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                        <option value="">Select Destination</option>
                                        ${destinations?.map((d) => `<option value="${d.id}">${d.name}</option>`).join("") || ""}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Package *</label>
                                    <select id="packageId" required class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                        <option value="">Select Destination First</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Hotel Category</label>
                                    <select id="hotelCategoryId" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                        <option value="">Select Package First</option>
                                    </select>
                                </div>
                                <div id="hotelRatesContainer" class="hidden">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Hotel Rate *</label>
                                    <select id="hotelRatesSelected" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                        <option value="">Select Rate</option>
                                    </select>
                                </div>
                                <div id="extraNightsContainer" class="hidden">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Extra Night Fee</label>
                                    <select id="extraNightsSelect" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                        <option value="0">No Extra Night</option>
                                    </select>
                                    <p class="text-xs text-gray-500 mt-1">Select extra night fee if applicable</p>
                                </div>
                                <div class="col-span-2">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Travel Dates</label>
                                    <input type="text" id="travelDates" placeholder="2024-03-20, 2024-03-25" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                    <p class="text-xs text-gray-500 mt-1">Format: YYYY-MM-DD, YYYY-MM-DD</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Optional Tour -->
                        <div class="border-b pb-4">
                            <h4 class="font-semibold text-gray-800 mb-3">🏝️ Optional Tour</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Select Optional Tour</label>
                                    <select id="optionalTourId" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                        <option value="">None</option>
                                        ${optionalTours?.map((t) => `<option value="${t.id}">${t.name}</option>`).join("") || ""}
                                    </select>
                                </div>
                                <div id="optionalTourRatesContainer" class="hidden col-span-2">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Tour Rate</label>
                                    <select id="optionalTourRateSelected" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                        <option value="">Select Rate</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Additional Details -->
                        <div class="border-b pb-4">
                            <h4 class="font-semibold text-gray-800 mb-3">🆔 ID Picture (Optional)</h4>
                            <input type="file" id="idPicture" accept="image/*" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                            <textarea id="specialRequests" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Any special requests..."></textarea>
                        </div>
                        
                        <div>
                            <label class="flex items-center gap-2">
                                <input type="checkbox" id="isFlexible" class="w-4 h-4 text-emerald-600 rounded">
                                <span class="text-sm text-gray-700">Flexible with travel dates</span>
                            </label>
                        </div>
                        
                        <div class="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onclick="closeCreateModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                            <button type="submit" class="px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-600">Create Booking</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Get elements
    const destSelect = document.getElementById("destinationId");
    const packageSelect = document.getElementById("packageId");
    const hotelSelect = document.getElementById("hotelCategoryId");
    const hotelRatesContainer = document.getElementById("hotelRatesContainer");
    const hotelRatesSelect = document.getElementById("hotelRatesSelected");
    const extraNightsContainer = document.getElementById(
      "extraNightsContainer",
    );
    const extraNightsSelect = document.getElementById("extraNightsSelect");
    const optionalTourSelect = document.getElementById("optionalTourId");
    const optionalTourRatesContainer = document.getElementById(
      "optionalTourRatesContainer",
    );
    const optionalTourRateSelect = document.getElementById(
      "optionalTourRateSelected",
    );
    const travelDatesInput = document.getElementById("travelDates");

    // Handle destination change
    destSelect.addEventListener("change", async () => {
      const destId = destSelect.value;
      if (destId) {
        const { data: packages } = await supabase
          .from("destination_packages")
          .select("*")
          .eq("destination_id", destId)
          .eq("is_active", true);

        packageSelect.innerHTML = '<option value="">Select Package</option>';
        packages?.forEach((p) => {
          packageSelect.innerHTML += `<option value="${p.id}">${p.package_name}</option>`;
        });
      }
      hotelSelect.innerHTML = '<option value="">Select Package First</option>';
      hotelRatesContainer.classList.add("hidden");
      extraNightsContainer.classList.add("hidden");
    });

    // Handle package change
    packageSelect.addEventListener("change", async () => {
      const pkgId = packageSelect.value;
      const destId = destSelect.value;

      if (pkgId && destId) {
        const { data: categories } = await supabase
          .from("hotel_categories")
          .select("*")
          .eq("destination_id", destId);

        hotelSelect.innerHTML = '<option value="">No Hotel</option>';
        categories?.forEach((c) => {
          hotelSelect.innerHTML += `<option value="${c.id}">${c.category_name}</option>`;
        });
      } else {
        hotelSelect.innerHTML =
          '<option value="">Select Package First</option>';
      }
      hotelRatesContainer.classList.add("hidden");
      extraNightsContainer.classList.add("hidden");
    });

    // Handle hotel category change - load rates with extra nights
    hotelSelect.addEventListener("change", async () => {
      const hotelId = hotelSelect.value;
      const pkgId = packageSelect.value;

      if (hotelId && pkgId && hotelId !== "") {
        const { data: rates } = await supabase
          .from("package_hotel_rates")
          .select("*")
          .eq("package_id", pkgId)
          .eq("hotel_category_id", hotelId);

        console.log("Hotel rates loaded:", rates);

        if (rates && rates.length > 0) {
          hotelRatesSelect.innerHTML = '<option value="">Select Rate</option>';

          rates.forEach((rate) => {
            const label = `${rate.season || "Regular"}${rate.duration ? ` (${rate.duration})` : ""}`;

            // Solo rate
            if (rate.rate_solo && rate.rate_solo > 0) {
              hotelRatesSelect.innerHTML += `<option 
                                value="solo_${rate.id}" 
                                data-rate="${rate.rate_solo}" 
                                data-extra-night="${rate.extra_night_solo || 0}"
                                data-label="Solo (1 pax)"
                                data-season="${rate.season || "Regular"}"
                                data-duration="${rate.duration || ""}">${label} - Solo: ₱${Number(rate.rate_solo).toLocaleString()}</option>`;
            }
            // 2 Pax rate
            if (rate.rate_2pax && rate.rate_2pax > 0) {
              hotelRatesSelect.innerHTML += `<option 
                                value="2pax_${rate.id}" 
                                data-rate="${rate.rate_2pax}" 
                                data-extra-night="${rate.extra_night_2pax || 0}"
                                data-label="2 Pax"
                                data-season="${rate.season || "Regular"}"
                                data-duration="${rate.duration || ""}">${label} - 2 Pax: ₱${Number(rate.rate_2pax).toLocaleString()}</option>`;
            }
            // 3 Pax rate
            if (rate.rate_3pax && rate.rate_3pax > 0) {
              hotelRatesSelect.innerHTML += `<option 
                                value="3pax_${rate.id}" 
                                data-rate="${rate.rate_3pax}" 
                                data-extra-night="${rate.extra_night_3pax || 0}"
                                data-label="3 Pax"
                                data-season="${rate.season || "Regular"}"
                                data-duration="${rate.duration || ""}">${label} - 3 Pax: ₱${Number(rate.rate_3pax).toLocaleString()}</option>`;
            }
            // 4 Pax rate
            if (rate.rate_4pax && rate.rate_4pax > 0) {
              hotelRatesSelect.innerHTML += `<option 
                                value="4pax_${rate.id}" 
                                data-rate="${rate.rate_4pax}" 
                                data-extra-night="${rate.extra_night_4pax || 0}"
                                data-label="4 Pax"
                                data-season="${rate.season || "Regular"}"
                                data-duration="${rate.duration || ""}">${label} - 4 Pax: ₱${Number(rate.rate_4pax).toLocaleString()}</option>`;
            }
            // 5 Pax rate
            if (rate.rate_5pax && rate.rate_5pax > 0) {
              hotelRatesSelect.innerHTML += `<option 
                                value="5pax_${rate.id}" 
                                data-rate="${rate.rate_5pax}" 
                                data-extra-night="${rate.extra_night_5pax || 0}"
                                data-label="5 Pax"
                                data-season="${rate.season || "Regular"}"
                                data-duration="${rate.duration || ""}">${label} - 5 Pax: ₱${Number(rate.rate_5pax).toLocaleString()}</option>`;
            }
            // 6 Pax rate
            if (rate.rate_6pax && rate.rate_6pax > 0) {
              hotelRatesSelect.innerHTML += `<option 
                                value="6pax_${rate.id}" 
                                data-rate="${rate.rate_6pax}" 
                                data-extra-night="${rate.extra_night_6pax || 0}"
                                data-label="6 Pax"
                                data-season="${rate.season || "Regular"}"
                                data-duration="${rate.duration || ""}">${label} - 6 Pax: ₱${Number(rate.rate_6pax).toLocaleString()}</option>`;
            }
            // 7 Pax rate
            if (rate.rate_7pax && rate.rate_7pax > 0) {
              hotelRatesSelect.innerHTML += `<option 
                                value="7pax_${rate.id}" 
                                data-rate="${rate.rate_7pax}" 
                                data-extra-night="${rate.extra_night_7pax || 0}"
                                data-label="7 Pax"
                                data-season="${rate.season || "Regular"}"
                                data-duration="${rate.duration || ""}">${label} - 7 Pax: ₱${Number(rate.rate_7pax).toLocaleString()}</option>`;
            }
            // 8 Pax rate
            if (rate.rate_8pax && rate.rate_8pax > 0) {
              hotelRatesSelect.innerHTML += `<option 
                                value="8pax_${rate.id}" 
                                data-rate="${rate.rate_8pax}" 
                                data-extra-night="${rate.extra_night_8pax || 0}"
                                data-label="8 Pax"
                                data-season="${rate.season || "Regular"}"
                                data-duration="${rate.duration || ""}">${label} - 8 Pax: ₱${Number(rate.rate_8pax).toLocaleString()}</option>`;
            }
            // 9 Pax rate
            if (rate.rate_9pax && rate.rate_9pax > 0) {
              hotelRatesSelect.innerHTML += `<option 
                                value="9pax_${rate.id}" 
                                data-rate="${rate.rate_9pax}" 
                                data-extra-night="${rate.extra_night_9pax || 0}"
                                data-label="9 Pax"
                                data-season="${rate.season || "Regular"}"
                                data-duration="${rate.duration || ""}">${label} - 9 Pax: ₱${Number(rate.rate_9pax).toLocaleString()}</option>`;
            }
            // 10 Pax rate
            if (rate.rate_10pax && rate.rate_10pax > 0) {
              hotelRatesSelect.innerHTML += `<option 
                                value="10pax_${rate.id}" 
                                data-rate="${rate.rate_10pax}" 
                                data-extra-night="${rate.extra_night_10pax || 0}"
                                data-label="10 Pax"
                                data-season="${rate.season || "Regular"}"
                                data-duration="${rate.duration || ""}">${label} - 10 Pax: ₱${Number(rate.rate_10pax).toLocaleString()}</option>`;
            }
            // 11 Pax rate
            if (rate.rate_11pax && rate.rate_11pax > 0) {
              hotelRatesSelect.innerHTML += `<option 
                                value="11pax_${rate.id}" 
                                data-rate="${rate.rate_11pax}" 
                                data-extra-night="${rate.extra_night_11pax || 0}"
                                data-label="11 Pax"
                                data-season="${rate.season || "Regular"}"
                                data-duration="${rate.duration || ""}">${label} - 11 Pax: ₱${Number(rate.rate_11pax).toLocaleString()}</option>`;
            }
            // 12 Pax rate
            if (rate.rate_12pax && rate.rate_12pax > 0) {
              hotelRatesSelect.innerHTML += `<option 
                                value="12pax_${rate.id}" 
                                data-rate="${rate.rate_12pax}" 
                                data-extra-night="${rate.extra_night_12pax || 0}"
                                data-label="12 Pax"
                                data-season="${rate.season || "Regular"}"
                                data-duration="${rate.duration || ""}">${label} - 12 Pax: ₱${Number(rate.rate_12pax).toLocaleString()}</option>`;
            }
            // Child rate
            if (
              rate.rate_child_no_breakfast &&
              rate.rate_child_no_breakfast > 0
            ) {
              hotelRatesSelect.innerHTML += `<option 
                                value="child_${rate.id}" 
                                data-rate="${rate.rate_child_no_breakfast}" 
                                data-extra-night="${rate.extra_night_child_no_breakfast || 0}"
                                data-label="Child"
                                data-season="${rate.season || "Regular"}"
                                data-duration="${rate.duration || ""}">${label} - Child: ₱${Number(rate.rate_child_no_breakfast).toLocaleString()}</option>`;
            }
          });

          hotelRatesContainer.classList.remove("hidden");
        } else {
          console.log("No rates found for this hotel category");
        }
      } else {
        hotelRatesContainer.classList.add("hidden");
        extraNightsContainer.classList.add("hidden");
      }
    });

    // Handle hotel rate selection - populate extra night dropdown
    hotelRatesSelect.addEventListener("change", () => {
      console.log("Rate selected:", hotelRatesSelect.value);

      if (hotelRatesSelect.value && hotelRatesSelect.value !== "") {
        const selected =
          hotelRatesSelect.options[hotelRatesSelect.selectedIndex];
        const extraAmount = parseFloat(selected.dataset.extraNight) || 0;

        console.log("Extra amount:", extraAmount);

        // Clear and reset extra nights dropdown
        extraNightsSelect.innerHTML =
          '<option value="0">No Extra Night</option>';

        if (extraAmount > 0) {
          // Add the extra night option
          extraNightsSelect.innerHTML += `<option value="${extraAmount}">Extra Night: ₱${extraAmount.toLocaleString()}</option>`;
          // Show the container
          extraNightsContainer.classList.remove("hidden");
          console.log("Extra night dropdown shown with amount:", extraAmount);
        } else {
          // Hide the container if no extra night
          extraNightsContainer.classList.add("hidden");
          console.log("No extra night available for this rate");
        }
      } else {
        extraNightsContainer.classList.add("hidden");
      }
    });

    // Handle optional tour change
    optionalTourSelect.addEventListener("change", async () => {
      const tourId = optionalTourSelect.value;

      if (tourId && tourId !== "") {
        const { data: rates } = await supabase
          .from("optional_tour_rates")
          .select("*")
          .eq("tour_id", tourId)
          .maybeSingle();

        if (rates) {
          optionalTourRatesContainer.classList.remove("hidden");
          optionalTourRateSelect.innerHTML =
            '<option value="">Select Rate</option>';

          if (rates.rate_solo && rates.rate_solo > 0) {
            optionalTourRateSelect.innerHTML += `<option value="solo" data-rate="${rates.rate_solo}" data-label="Solo">Solo: ₱${Number(rates.rate_solo).toLocaleString()}</option>`;
          }
          if (rates.rate_2pax && rates.rate_2pax > 0) {
            optionalTourRateSelect.innerHTML += `<option value="2pax" data-rate="${rates.rate_2pax}" data-label="2 Pax">2 Pax: ₱${Number(rates.rate_2pax).toLocaleString()}</option>`;
          }
          if (rates.rate_3pax && rates.rate_3pax > 0) {
            optionalTourRateSelect.innerHTML += `<option value="3pax" data-rate="${rates.rate_3pax}" data-label="3 Pax">3 Pax: ₱${Number(rates.rate_3pax).toLocaleString()}</option>`;
          }
          if (rates.rate_4pax && rates.rate_4pax > 0) {
            optionalTourRateSelect.innerHTML += `<option value="4pax" data-rate="${rates.rate_4pax}" data-label="4 Pax">4 Pax: ₱${Number(rates.rate_4pax).toLocaleString()}</option>`;
          }
          if (rates.rate_child_4_9 && rates.rate_child_4_9 > 0) {
            optionalTourRateSelect.innerHTML += `<option value="child" data-rate="${rates.rate_child_4_9}" data-label="Child">Child: ₱${Number(rates.rate_child_4_9).toLocaleString()}</option>`;
          }
        }
      } else {
        optionalTourRatesContainer.classList.add("hidden");
      }
    });

    // Handle form submission
    const form = document.getElementById("createBookingForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");
      const bookingRef = `SNS-${year}${month}${day}-${random}`;

      const travelDatesStr = travelDatesInput?.value || "";
      const travelDatesArray = travelDatesStr
        ? travelDatesStr.split(",").map((d) => new Date(d.trim()))
        : [];

      // Get values with pax type
      let hotelRateAmount = null;
      let hotelExtraNight = null;
      let selectedPaxType = "";
      let selectedPaxCount = 1;
      let selectedRateDetails = "";

      if (hotelRatesSelect.value && hotelRatesSelect.value !== "") {
        const selectedOption =
          hotelRatesSelect.options[hotelRatesSelect.selectedIndex];
        hotelRateAmount = parseFloat(selectedOption.dataset.rate) || 0;
        hotelExtraNight = parseFloat(selectedOption.dataset.extraNight) || 0;

        // Get the pax type from the selected option
        selectedPaxType = selectedOption.dataset.label || "Solo (1 pax)";

        // Determine pax count based on pax type
        if (selectedPaxType === "2 Pax") selectedPaxCount = 2;
        else if (selectedPaxType === "3 Pax") selectedPaxCount = 3;
        else if (selectedPaxType === "4 Pax") selectedPaxCount = 4;
        else if (selectedPaxType === "5 Pax") selectedPaxCount = 5;
        else if (selectedPaxType === "6 Pax") selectedPaxCount = 6;
        else if (selectedPaxType === "7 Pax") selectedPaxCount = 7;
        else if (selectedPaxType === "8 Pax") selectedPaxCount = 8;
        else if (selectedPaxType === "9 Pax") selectedPaxCount = 9;
        else if (selectedPaxType === "10 Pax") selectedPaxCount = 10;
        else if (selectedPaxType === "11 Pax") selectedPaxCount = 11;
        else if (selectedPaxType === "12 Pax") selectedPaxCount = 12;
        else if (selectedPaxType === "Child") selectedPaxCount = 1;
        else selectedPaxCount = 1; // Solo

        // Build selected rate details
        const season = selectedOption.dataset.season || "Regular";
        const duration = selectedOption.dataset.duration || "";
        selectedRateDetails = `${season}${duration ? ` (${duration})` : ""} - ${selectedPaxType}: ₱${hotelRateAmount.toLocaleString()}`;
        if (hotelExtraNight > 0) {
          selectedRateDetails += ` + Extra Night: ₱${hotelExtraNight.toLocaleString()}`;
        }

        console.log("Hotel calculation:", {
          paxType: selectedPaxType,
          paxCount: selectedPaxCount,
          originalRateAmount: hotelRateAmount,
          extraNight: hotelExtraNight,
          calculatedTotal:
            hotelRateAmount * selectedPaxCount +
            hotelExtraNight * selectedPaxCount,
        });
      }

      // Get optional tour rate
      let optionalTourRateAmount = null;
      let optionalTourPaxType = "";
      let optionalTourPaxCount = 1;

      if (optionalTourRateSelect.value && optionalTourSelect.value !== "") {
        const selectedOption =
          optionalTourRateSelect.options[optionalTourRateSelect.selectedIndex];
        optionalTourRateAmount = parseFloat(selectedOption.dataset.rate) || 0;
        optionalTourPaxType = selectedOption.dataset.label || "";

        // Determine pax count for optional tour based on the selected type
        if (optionalTourPaxType === "2 Pax") optionalTourPaxCount = 2;
        else if (optionalTourPaxType === "3 Pax") optionalTourPaxCount = 3;
        else if (optionalTourPaxType === "4 Pax") optionalTourPaxCount = 4;
        else if (optionalTourPaxType === "Child") optionalTourPaxCount = 1;
        else optionalTourPaxCount = 1; // Solo

        console.log(
          "Optional tour:",
          optionalTourRateAmount,
          optionalTourPaxType,
          optionalTourPaxCount,
          optionalTourRateAmount * optionalTourPaxCount,
        );
      }

      // Calculate grand total with proper multiplication
      // Hotel total = (rate per pax × number of pax) + (extra night per pax × number of pax)
      const hotelTotal =
        (hotelRateAmount || 0) * selectedPaxCount +
        (hotelExtraNight || 0) * selectedPaxCount;

      // Optional tour total = rate per pax × number of pax
      const optionalTourTotal =
        (optionalTourRateAmount || 0) * optionalTourPaxCount;

      const grandTotal = hotelTotal + optionalTourTotal;

      console.log("Final calculation:", {
        hotelTotal: hotelTotal,
        optionalTourTotal: optionalTourTotal,
        grandTotal: grandTotal,
        paxCount: selectedPaxCount,
        optionalTourPaxCount: optionalTourPaxCount,
      });

      // Upload ID picture
      let idPictureUrl = null;
      const idPictureFile = document.getElementById("idPicture").files[0];

      if (idPictureFile) {
        try {
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(2, 8);
          const fileExt = idPictureFile.name.split(".").pop();
          const fileName = `${timestamp}-${randomStr}.${fileExt}`;

          await supabase.storage
            .from("id_pictures")
            .upload(fileName, idPictureFile);

          const {
            data: { publicUrl },
          } = supabase.storage.from("id_pictures").getPublicUrl(fileName);
          idPictureUrl = publicUrl;
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
        }
      }

      // Get names
      const packageId = document.getElementById("packageId").value;
      const destinationId = document.getElementById("destinationId").value;
      const hotelCategoryId = document.getElementById("hotelCategoryId").value;

      const { data: pkg } = await supabase
        .from("destination_packages")
        .select("package_name")
        .eq("id", packageId)
        .single();

      const { data: dest } = await supabase
        .from("destinations")
        .select("name")
        .eq("id", destinationId)
        .single();

      let hotelName = null;
      if (hotelCategoryId && hotelCategoryId !== "") {
        const { data: hotel } = await supabase
          .from("hotel_categories")
          .select("category_name")
          .eq("id", hotelCategoryId)
          .single();
        hotelName = hotel?.category_name;
      }

      let optionalTourName = null;
      if (optionalTourSelect.value && optionalTourSelect.value !== "") {
        const { data: tour } = await supabase
          .from("optional_tour_categories")
          .select("name")
          .eq("id", optionalTourSelect.value)
          .single();
        optionalTourName = tour?.name;
      }

      // Create booking with pax type and updated total calculation
      const bookingData = {
        booking_reference: bookingRef,
        destination_id: parseInt(destinationId),
        package_id: parseInt(packageId),
        hotel_category_id:
          hotelCategoryId && hotelCategoryId !== ""
            ? parseInt(hotelCategoryId)
            : null,
        travel_dates: travelDatesArray,
        total_amount: grandTotal,
        client_name: document.getElementById("clientName").value,
        client_email: document.getElementById("clientEmail").value,
        client_mobile: document.getElementById("clientMobile").value,
        nationality: document.getElementById("nationality").value,
        special_requests: document.getElementById("specialRequests").value,
        is_flexible: document.getElementById("isFlexible").checked,
        id_picture_url: idPictureUrl,
        package_Name: pkg?.package_name || null,
        category_name: dest?.name || null,
        hotel_Name: hotelName,
        hotel_Rates_Selected: hotelRateAmount,
        hotel_extra_night_rate: hotelExtraNight,
        hotel_pax_count: selectedPaxCount,
        selected_pax_type: selectedPaxType,
        selected_rate_details: selectedRateDetails,
        optional_tour_id:
          optionalTourSelect.value && optionalTourSelect.value !== ""
            ? parseInt(optionalTourSelect.value)
            : null,
        optional_tour_name: optionalTourName,
        optional_tour_pax_count: optionalTourPaxCount,
        optional_tour_pax_type: optionalTourPaxType,
        optional_tour_rate_selected: optionalTourRateAmount,
        optional_tour_total_amount: optionalTourTotal,
        status: "pending",
        payment_status: "unpaid",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("Creating booking with correct total:", bookingData);

      const { error } = await supabase
        .from("b2b_bookings")
        .insert([bookingData]);

      if (error) {
        alert("Error: " + error.message);
      } else {
        alert(
          `✅ Booking created!\nReference: ${bookingRef}\nPax: ${selectedPaxType}\nTotal: ₱${grandTotal.toLocaleString()}\n\nBreakdown:\n• Hotel (${selectedPaxCount} pax × ₱${hotelRateAmount?.toLocaleString() || 0}): ₱${hotelTotal.toLocaleString()}\n${hotelExtraNight > 0 ? `• Extra Night (${selectedPaxCount} pax × ₱${hotelExtraNight.toLocaleString()}): ₱${(hotelExtraNight * selectedPaxCount).toLocaleString()}\n` : ""}${optionalTourRateAmount > 0 ? `• Optional Tour (${optionalTourPaxCount} pax × ₱${optionalTourRateAmount.toLocaleString()}): ₱${optionalTourTotal.toLocaleString()}` : ""}`,
        );
        closeCreateModal();
        await window.fetchBookings();
        window.renderBookingsTable();
      }
    });

    window.closeCreateModal = function () {
      const modal = document.getElementById("createBookingModal");
      if (modal) modal.remove();
    };
  } catch (error) {
    console.error("Error opening create modal:", error);
    alert("Failed to open create booking form: " + error.message);
  }
};

// Initialize module
window.initBookingsModule = async function () {
  console.log("Initializing bookings module...");
  await window.fetchBookings();

  const content = document.getElementById("main-content");
  if (content) {
    content.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Bookings Management</h1>
                        <p class="text-sm text-gray-500">Manage customer bookings and reservations</p>
                    </div>
                    <button onclick="openCreateBookingModal()" class="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:from-primary-700 hover:to-primary-800 transition-all">
                        <i class="fas fa-plus-circle"></i>
                        <span>New Booking</span>
                    </button>
                </div>
                <div id="bookings-table-container">
                    <div class="text-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700 mx-auto"></div>
                        <p class="mt-2 text-gray-500">Loading bookings...</p>
                    </div>
                </div>
            </div>
        `;
    window.renderBookingsTable();
  }
};

console.log("✅ Bookings module loaded with extra night dropdown and pax type");
