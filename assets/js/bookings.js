// assets/js/modules/bookings.js
// Main Bookings Module - With Extra Nights Functionality

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

// OPEN CREATE BOOKING MODAL - WITH EXTRA NIGHTS
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
    console.log("Destinations loaded:", destinations?.length);

    // Fetch optional tours
    const { data: optionalTours } = await supabase
      .from("optional_tour_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    console.log("Optional tours loaded:", optionalTours?.length);

    const modalHtml = `
            <div id="createBookingModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style="z-index: 10001;">
                <div class="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                    <div class="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 rounded-t-xl sticky top-0">
                        <div class="flex justify-between items-center">
                            <div>
                                <h3 class="text-xl font-bold text-white">Create New Booking</h3>
                                <p class="text-emerald-100 text-sm">Fill in the customer and travel details below</p>
                            </div>
                            <button onclick="closeCreateModal()" class="text-white hover:text-gray-200 text-2xl">&times;</button>
                        </div>
                    </div>
                    <form id="createBookingForm" class="p-6 space-y-5">
                        <!-- Customer Information -->
                        <div class="border-b pb-4">
                            <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <i class="fas fa-user text-emerald-600"></i> Customer Information
                            </h4>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input type="text" id="clientName" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500">
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
                            <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <i class="fas fa-plane text-emerald-600"></i> Trip Details
                            </h4>
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
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Hotel Rates *</label>
                                    <select id="hotelRatesSelected" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                        <option value="">Select Rate</option>
                                    </select>
                                </div>
                                <div id="hotelPaxContainer" class="hidden">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Number of Pax *</label>
                                    <input type="number" id="hotelPaxCount" min="1" value="1" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                    <p class="text-xs text-gray-500 mt-1">Number of persons for this booking</p>
                                </div>
                                <div class="col-span-2">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Travel Dates *</label>
                                    <input type="text" id="travelDates" placeholder="2024-03-20, 2024-03-25" required class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                    <p class="text-xs text-gray-500 mt-1">Format: YYYY-MM-DD, YYYY-MM-DD (start date, end date)</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Optional Tour -->
                        <div class="border-b pb-4">
                            <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <i class="fas fa-umbrella-beach text-emerald-600"></i> Optional Tour
                            </h4>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Select Optional Tour</label>
                                    <select id="optionalTourId" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                        <option value="">None</option>
                                        ${optionalTours?.map((t) => `<option value="${t.id}">${t.name}</option>`).join("") || ""}
                                    </select>
                                </div>
                                <div id="optionalTourPaxContainer" class="hidden">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Number of Pax</label>
                                    <input type="number" id="optionalTourPaxCount" min="1" value="1" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                </div>
                                <div id="optionalTourRatesContainer" class="hidden col-span-2">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Tour Rates</label>
                                    <select id="optionalTourRateSelected" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                                        <option value="">Select Rate</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Additional Details -->
                        <div class="border-b pb-4">
                            <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <i class="fas fa-id-card text-emerald-600"></i> ID Picture (Optional)
                            </h4>
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
                            <button type="submit" class="px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-600 flex items-center gap-2">
                                <i class="fas fa-save"></i> Create Booking
                            </button>
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
    const hotelPaxContainer = document.getElementById("hotelPaxContainer");
    const hotelPaxCount = document.getElementById("hotelPaxCount");
    const optionalTourSelect = document.getElementById("optionalTourId");
    const optionalTourPaxContainer = document.getElementById(
      "optionalTourPaxContainer",
    );
    const optionalTourRatesContainer = document.getElementById(
      "optionalTourRatesContainer",
    );
    const optionalTourRateSelect = document.getElementById(
      "optionalTourRateSelected",
    );
    const optionalTourPaxCount = document.getElementById(
      "optionalTourPaxCount",
    );

    // Handle destination change - load packages
    destSelect.addEventListener("change", async () => {
      const destId = destSelect.value;
      if (destId) {
        const { data: packages } = await supabase
          .from("destination_packages")
          .select("*")
          .eq("destination_id", destId)
          .eq("is_active", true);

        console.log("Packages loaded:", packages?.length);
        packageSelect.innerHTML = '<option value="">Select Package</option>';
        packages?.forEach((p) => {
          packageSelect.innerHTML += `<option value="${p.id}">${p.package_name}</option>`;
        });
      }
      hotelSelect.innerHTML = '<option value="">Select Package First</option>';
      hotelRatesContainer.classList.add("hidden");
      hotelPaxContainer.classList.add("hidden");
    });

    // Handle package change - load hotel categories
    packageSelect.addEventListener("change", async () => {
      const pkgId = packageSelect.value;
      const destId = destSelect.value;
      console.log("Package selected:", pkgId, "Destination:", destId);

      if (pkgId && destId) {
        const { data: categories } = await supabase
          .from("hotel_categories")
          .select("*")
          .eq("destination_id", destId);

        console.log("Hotel categories loaded:", categories?.length);
        hotelSelect.innerHTML = '<option value="">No Hotel</option>';
        categories?.forEach((c) => {
          hotelSelect.innerHTML += `<option value="${c.id}">${c.category_name}${c.has_breakfast ? " (with breakfast)" : ""}</option>`;
        });
      } else {
        hotelSelect.innerHTML =
          '<option value="">Select Package First</option>';
      }
      hotelRatesContainer.classList.add("hidden");
      hotelPaxContainer.classList.add("hidden");
    });

    // Handle hotel category change - load hotel rates with extra nights
    hotelSelect.addEventListener("change", async () => {
      const hotelId = hotelSelect.value;
      const pkgId = packageSelect.value;

      console.log("Hotel selected:", hotelId, "Package:", pkgId);

      if (hotelId && pkgId && hotelId !== "") {
        const { data: rates, error } = await supabase
          .from("package_hotel_rates")
          .select("*")
          .eq("package_id", pkgId)
          .eq("hotel_category_id", hotelId)
          .maybeSingle();

        console.log("Hotel rates from DB:", rates);

        if (error) {
          console.error("Error fetching rates:", error);
        }

        if (rates) {
          hotelRatesSelect.innerHTML =
            '<option value="">Select Rate Type</option>';
          let hasRates = false;

          // Add adult rates with extra nights
          const rateOptions = [
            {
              key: "rate_solo",
              label: "Solo (1 pax)",
              extraKey: "extra_night_solo",
            },
            { key: "rate_2pax", label: "2 Pax", extraKey: "extra_night_2pax" },
            { key: "rate_3pax", label: "3 Pax", extraKey: "extra_night_3pax" },
            { key: "rate_4pax", label: "4 Pax", extraKey: "extra_night_4pax" },
            { key: "rate_5pax", label: "5 Pax", extraKey: "extra_night_5pax" },
            { key: "rate_6pax", label: "6 Pax", extraKey: "extra_night_6pax" },
            { key: "rate_7pax", label: "7 Pax", extraKey: "extra_night_7pax" },
            { key: "rate_8pax", label: "8 Pax", extraKey: "extra_night_8pax" },
            { key: "rate_9pax", label: "9 Pax", extraKey: "extra_night_9pax" },
            {
              key: "rate_10pax",
              label: "10 Pax",
              extraKey: "extra_night_10pax",
            },
            {
              key: "rate_11pax",
              label: "11 Pax",
              extraKey: "extra_night_11pax",
            },
            {
              key: "rate_12pax",
              label: "12 Pax",
              extraKey: "extra_night_12pax",
            },
          ];

          rateOptions.forEach((rate) => {
            if (rates[rate.key] && rates[rate.key] > 0) {
              const extraNightRate = rates[rate.extraKey] || 0;
              hotelRatesSelect.innerHTML += `<option value="${rate.key}" 
                                data-amount="${rates[rate.key]}" 
                                data-extra-night="${extraNightRate}"
                                data-label="${rate.label}">${rate.label} - ₱${Number(rates[rate.key]).toLocaleString()} ${extraNightRate > 0 ? `(Extra night: ₱${Number(extraNightRate).toLocaleString()})` : ""}</option>`;
              hasRates = true;
            }
          });

          // Add child rate if exists
          if (
            rates.rate_child_no_breakfast &&
            rates.rate_child_no_breakfast > 0
          ) {
            const extraNightChild = rates.extra_night_child_no_breakfast || 0;
            hotelRatesSelect.innerHTML += `<option value="child" 
                            data-amount="${rates.rate_child_no_breakfast}" 
                            data-extra-night="${extraNightChild}"
                            data-label="Child (no breakfast)">Child (no breakfast) - ₱${Number(rates.rate_child_no_breakfast).toLocaleString()} ${extraNightChild > 0 ? `(Extra night: ₱${Number(extraNightChild).toLocaleString()})` : ""}</option>`;
            hasRates = true;
          }

          if (hasRates) {
            hotelRatesContainer.classList.remove("hidden");
            console.log("Hotel rates container shown");
          } else {
            hotelRatesContainer.classList.add("hidden");
            hotelPaxContainer.classList.add("hidden");
            console.log("No rates found for this hotel");
          }
        } else {
          hotelRatesContainer.classList.add("hidden");
          hotelPaxContainer.classList.add("hidden");
          console.log("No rates record found for this package and hotel");
        }
      } else {
        hotelRatesContainer.classList.add("hidden");
        hotelPaxContainer.classList.add("hidden");
      }
    });

    // Handle hotel rate selection to show pax count
    hotelRatesSelect.addEventListener("change", () => {
      if (hotelRatesSelect.value && hotelRatesSelect.value !== "") {
        hotelPaxContainer.classList.remove("hidden");

        // Auto-populate pax count based on rate type
        const selectedOption =
          hotelRatesSelect.options[hotelRatesSelect.selectedIndex];
        const rateLabel = selectedOption.dataset.label || "";

        if (rateLabel.includes("Solo")) {
          hotelPaxCount.value = 1;
        } else if (rateLabel.includes("2 Pax")) {
          hotelPaxCount.value = 2;
        } else if (rateLabel.includes("3 Pax")) {
          hotelPaxCount.value = 3;
        } else if (rateLabel.includes("4 Pax")) {
          hotelPaxCount.value = 4;
        } else if (rateLabel.includes("5 Pax")) {
          hotelPaxCount.value = 5;
        } else if (rateLabel.includes("6 Pax")) {
          hotelPaxCount.value = 6;
        } else {
          hotelPaxCount.value = 1;
        }
      } else {
        hotelPaxContainer.classList.add("hidden");
      }
    });

    // Handle optional tour change
    optionalTourSelect.addEventListener("change", async () => {
      const tourId = optionalTourSelect.value;
      console.log("Optional tour selected:", tourId);

      if (tourId && tourId !== "") {
        const { data: rates, error } = await supabase
          .from("optional_tour_rates")
          .select("*")
          .eq("tour_id", tourId)
          .maybeSingle();

        console.log("Optional tour rates:", rates);

        if (rates) {
          optionalTourPaxContainer.classList.remove("hidden");
          optionalTourRatesContainer.classList.remove("hidden");
          optionalTourRateSelect.innerHTML =
            '<option value="">Select Rate Type</option>';

          let hasRates = false;
          const rateOptions = [
            { key: "rate_solo", label: "Solo (1 pax)" },
            { key: "rate_2pax", label: "2 Pax" },
            { key: "rate_3pax", label: "3 Pax" },
            { key: "rate_4pax", label: "4 Pax" },
            { key: "rate_5pax", label: "5 Pax" },
            { key: "rate_6pax", label: "6 Pax" },
            { key: "rate_7pax", label: "7 Pax" },
            { key: "rate_8pax", label: "8 Pax" },
            { key: "rate_9pax", label: "9 Pax" },
            { key: "rate_10pax", label: "10 Pax" },
            { key: "rate_11pax", label: "11 Pax" },
            { key: "rate_12pax", label: "12 Pax" },
          ];

          rateOptions.forEach((rate) => {
            if (rates[rate.key] && rates[rate.key] > 0) {
              optionalTourRateSelect.innerHTML += `<option value="${rate.key}" data-amount="${rates[rate.key]}">${rate.label} - ₱${Number(rates[rate.key]).toLocaleString()}</option>`;
              hasRates = true;
            }
          });

          if (rates.rate_child_4_9 && rates.rate_child_4_9 > 0) {
            optionalTourRateSelect.innerHTML += `<option value="child" data-amount="${rates.rate_child_4_9}">Child (4-9 years) - ₱${Number(rates.rate_child_4_9).toLocaleString()}</option>`;
            hasRates = true;
          }

          if (!hasRates) {
            optionalTourRateSelect.innerHTML =
              '<option value="">No rates available</option>';
          }
        } else {
          optionalTourPaxContainer.classList.add("hidden");
          optionalTourRatesContainer.classList.add("hidden");
          console.log("No rates found for this optional tour");
        }
      } else {
        optionalTourPaxContainer.classList.add("hidden");
        optionalTourRatesContainer.classList.add("hidden");
      }
    });

    // Handle form submission with extra nights calculation
    const form = document.getElementById("createBookingForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Generate booking reference
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");
      const bookingRef = `SNS-${year}${month}${day}-${random}`;

      // Parse travel dates
      const travelDatesStr = document.getElementById("travelDates").value;
      const travelDatesArray = travelDatesStr
        .split(",")
        .map((d) => new Date(d.trim()).toISOString());
      const nights = travelDatesArray.length - 1; // Calculate number of nights

      // Get selected hotel rate and calculate total with extra nights
      let hotelRateAmount = null;
      let hotelExtraNightRate = null;
      let hotelTotalAmount = null;
      let hotelPaxCountValue = 1;

      if (hotelRatesSelect.value && hotelRatesSelect.value !== "") {
        const selectedOption =
          hotelRatesSelect.options[hotelRatesSelect.selectedIndex];
        hotelRateAmount = parseFloat(selectedOption.dataset.amount);
        hotelExtraNightRate =
          parseFloat(selectedOption.dataset.extraNight) || 0;
        hotelPaxCountValue =
          parseInt(document.getElementById("hotelPaxCount")?.value) || 1;

        // Calculate total: (base rate + (extra night rate * nights)) * pax count
        const baseTotal = hotelRateAmount;
        const extraNightsTotal = hotelExtraNightRate * nights;
        const perPaxTotal = baseTotal + extraNightsTotal;
        hotelTotalAmount = perPaxTotal * hotelPaxCountValue;

        console.log("Hotel calculation:", {
          baseRate: hotelRateAmount,
          extraNightRate: hotelExtraNightRate,
          nights: nights,
          perPaxTotal: perPaxTotal,
          paxCount: hotelPaxCountValue,
          total: hotelTotalAmount,
        });
      }

      // Get selected optional tour rate
      let optionalTourRateAmount = null;
      let optionalTourTotal = null;
      if (optionalTourRateSelect.value && optionalTourSelect.value !== "") {
        const selectedOption =
          optionalTourRateSelect.options[optionalTourRateSelect.selectedIndex];
        optionalTourRateAmount = parseFloat(selectedOption.dataset.amount);
        const paxCount = parseInt(optionalTourPaxCount.value) || 1;
        optionalTourTotal = optionalTourRateAmount * paxCount;
        console.log(
          "Selected optional tour rate:",
          optionalTourRateAmount,
          "Total:",
          optionalTourTotal,
        );
      }

      // Calculate grand total
      const grandTotal = (hotelTotalAmount || 0) + (optionalTourTotal || 0);

      // Upload ID picture if exists
      let idPictureUrl = null;
      const idPictureFile = document.getElementById("idPicture").files[0];

      if (idPictureFile) {
        try {
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(2, 8);
          const fileExt = idPictureFile.name.split(".").pop();
          const fileName = `${timestamp}-${randomStr}.${fileExt}`;

          const { error } = await supabase.storage
            .from("id_pictures")
            .upload(fileName, idPictureFile, {
              cacheControl: "3600",
              upsert: false,
            });

          if (!error) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("id_pictures").getPublicUrl(fileName);
            idPictureUrl = publicUrl;
            console.log("ID picture uploaded:", idPictureUrl);
          }
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
        }
      }

      // Get package and destination names
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

      // Create booking data with extra nights info
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
        hotel_extra_night_rate: hotelExtraNightRate,
        hotel_pax_count: hotelPaxCountValue,
        hotel_nights: nights,
        optional_tour_id:
          optionalTourSelect.value && optionalTourSelect.value !== ""
            ? parseInt(optionalTourSelect.value)
            : null,
        optional_tour_name: optionalTourName,
        optional_tour_pax_count:
          optionalTourSelect.value && optionalTourSelect.value !== ""
            ? parseInt(optionalTourPaxCount.value) || 1
            : null,
        optional_tour_rate_selected: optionalTourRateAmount,
        optional_tour_total_amount: optionalTourTotal,
        status: "pending",
        payment_status: "unpaid",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("Creating booking:", bookingData);

      const { error } = await supabase
        .from("b2b_bookings")
        .insert([bookingData]);

      if (error) {
        alert("Error: " + error.message);
        console.error("Insert error:", error);
      } else {
        alert(
          `✅ Booking created!\nReference: ${bookingRef}\nTotal Amount: ₱${grandTotal.toLocaleString()}\nNights: ${nights}\nPax: ${hotelPaxCountValue}`,
        );
        closeCreateModal();
        await window.fetchBookings();
        window.renderBookingsTable();
      }
    });

    // Close modal function
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

console.log("✅ Bookings module loaded with extra nights functionality");
