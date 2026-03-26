// assets/js/modules/bookings/booking-email.js
// Enhanced email functions with ALL booking details and per-pax calculations

console.log("📧 Booking Email loaded - Enhanced with Per-Pax Calculations");

// Ensure supabase is available
if (typeof supabase === "undefined" && typeof window.supabase !== "undefined") {
  var supabase = window.supabase;
}

// Send email via edge function
window.sendEmail = async function ({
  to,
  subject,
  html,
  bookingId,
  emailType = "outgoing",
}) {
  try {
    console.log(`📧 Sending ${emailType} email to: ${to}`);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) throw new Error("No active session");

    const response = await fetch(
      "https://rpapduavenpzwtptgopm.supabase.co/functions/v1/send-email",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ to, subject, html, bookingId, emailType }),
      },
    );

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Failed to send email");

    console.log(`✅ Email sent! Message ID: ${result.messageId}`);
    if (typeof showToast !== "undefined")
      showToast(`✅ ${emailType} email sent to ${to}`, "success");

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("❌ Email error:", error);
    if (typeof showToast !== "undefined")
      showToast(`❌ Failed to send email: ${error.message}`, "error");
    return { success: false, error: error.message };
  }
};

// Get pax type label from rate details
function getPaxTypeLabel(booking) {
  if (booking.selected_pax_type) {
    return booking.selected_pax_type;
  }

  if (booking.selected_rate_details) {
    // Extract pax type from selected_rate_details
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
  return `${booking.hotel_pax_count || 1} Pax`;
}

// Helper function to calculate totals with per-pax multiplication
function calculateBookingTotals(booking) {
  // Hotel calculations
  const hotelRatePerPax = booking.hotel_Rates_Selected || 0;
  const hotelPaxCount = booking.hotel_pax_count || 1;
  const hotelExtraNightPerPax = booking.hotel_extra_night_rate || 0;

  const hotelBaseTotal = hotelRatePerPax * hotelPaxCount;
  const hotelExtraTotal = hotelExtraNightPerPax * hotelPaxCount;
  const hotelTotal = hotelBaseTotal + hotelExtraTotal;

  // Optional tour calculations
  const optionalTourRatePerPax = booking.optional_tour_rate_selected || 0;
  const optionalTourPaxCount = booking.optional_tour_pax_count || hotelPaxCount;
  const optionalTourTotal = optionalTourRatePerPax * optionalTourPaxCount;

  // Totals
  const subtotal = hotelTotal + optionalTourTotal;
  const grandTotal =
    subtotal + (booking.additional_fee || 0) - (booking.discount_amount || 0);

  return {
    hotelRatePerPax,
    hotelPaxCount,
    hotelBaseTotal,
    hotelExtraNightPerPax,
    hotelExtraTotal,
    hotelTotal,
    optionalTourRatePerPax,
    optionalTourPaxCount,
    optionalTourTotal,
    subtotal,
    grandTotal,
  };
}

// Generate comprehensive approval email HTML with ALL details and per-pax breakdown
function generateApprovalEmailHTML(booking) {
  const travelDates =
    booking.travel_dates
      ?.map((d) =>
        new Date(d).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      )
      .join(" → ") || "Not specified";

  // Get pax type label
  const paxLabel = getPaxTypeLabel(booking);

  // Calculate totals with per-pax multiplication
  const totals = calculateBookingTotals(booking);

  // Format hotel rate display with per-pax breakdown
  let hotelRateDisplay = "";
  if (booking.hotel_Rates_Selected) {
    hotelRateDisplay = `
            <div class="price-breakdown-item">
                <div class="price-row">
                    <span>Hotel Rate (${totals.hotelPaxCount} pax × ₱${totals.hotelRatePerPax.toLocaleString()}):</span>
                    <span>₱${totals.hotelBaseTotal.toLocaleString()}</span>
                </div>
                ${
                  booking.hotel_extra_night_rate &&
                  booking.hotel_extra_night_rate > 0
                    ? `
                <div class="price-row">
                    <span>Extra Night Fee (${totals.hotelPaxCount} pax × ₱${totals.hotelExtraNightPerPax.toLocaleString()}):</span>
                    <span>₱${totals.hotelExtraTotal.toLocaleString()}</span>
                </div>
                `
                    : ""
                }
                <div class="price-row subtotal" style="border-top: 1px solid #e5e7eb; margin-top: 8px; padding-top: 8px;">
                    <span><strong>Hotel Total:</strong></span>
                    <span><strong>₱${totals.hotelTotal.toLocaleString()}</strong></span>
                </div>
            </div>
        `;
  }

  // Format optional tour display
  let optionalTourDisplay = "";
  if (booking.optional_tour_name && totals.optionalTourTotal > 0) {
    optionalTourDisplay = `
            <div class="section">
                <h3>🏝️ Optional Tour</h3>
                <div class="detail-grid">
                    <div><strong>Tour Name:</strong><br>${escapeHtml(booking.optional_tour_name)}</div>
                    <div><strong>Number of Pax:</strong><br>${totals.optionalTourPaxCount} Pax</div>
                    <div><strong>Rate per Pax:</strong><br>₱${totals.optionalTourRatePerPax.toLocaleString()}</div>
                    <div><strong>Tour Total (${totals.optionalTourPaxCount} pax × ₱${totals.optionalTourRatePerPax.toLocaleString()}):</strong><br>₱${totals.optionalTourTotal.toLocaleString()}</div>
                </div>
            </div>
        `;
  }

  // Format selected rate details
  let selectedRateDisplay = "";
  if (booking.selected_rate_details) {
    selectedRateDisplay = `
            <div class="section">
                <h3>📋 Selected Rate Details</h3>
                <div class="detail-box" style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 10px;">
                    ${booking.selected_rate_details}
                </div>
            </div>
        `;
  }

  // Format additional fees and discounts with descriptions
  let additionalFeeDisplay = "";
  if (booking.additional_fee && booking.additional_fee > 0) {
    additionalFeeDisplay = `
            <div class="price-row">
                <span>Additional Fee:</span>
                <span>₱${Number(booking.additional_fee).toLocaleString()}</span>
            </div>
            ${booking.additional_fee_description ? `<div style="font-size: 12px; color: #6b7280; margin-top: -5px; margin-bottom: 5px; text-align: right;">(${escapeHtml(booking.additional_fee_description)})</div>` : ""}
        `;
  }

  let discountDisplay = "";
  if (booking.discount_amount && booking.discount_amount > 0) {
    discountDisplay = `
            <div class="price-row">
                <span>Discount:</span>
                <span>-₱${Number(booking.discount_amount).toLocaleString()}</span>
            </div>
            ${booking.discount_description ? `<div style="font-size: 12px; color: #6b7280; margin-top: -5px; margin-bottom: 5px; text-align: right;">(${escapeHtml(booking.discount_description)})</div>` : ""}
        `;
  }

  return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Confirmation - ${booking.booking_reference}</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Arial, sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    background: #f5f5f5; 
                    margin: 0; 
                    padding: 0; 
                }
                .container { 
                    max-width: 650px; 
                    margin: 20px auto; 
                    background: #fff; 
                    border-radius: 16px; 
                    overflow: hidden; 
                    box-shadow: 0 8px 24px rgba(0,0,0,0.12); 
                }
                .header { 
                    background: linear-gradient(135deg, #059669 0%, #10b981 100%); 
                    color: white; 
                    padding: 32px; 
                    text-align: center; 
                }
                .header h1 { 
                    margin: 0; 
                    font-size: 28px; 
                    letter-spacing: -0.5px;
                }
                .header p {
                    margin: 8px 0 0;
                    opacity: 0.9;
                }
                .content { 
                    padding: 32px; 
                    background: #ffffff; 
                }
                .booking-ref { 
                    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
                    padding: 20px; 
                    border-radius: 12px; 
                    margin-bottom: 24px; 
                    text-align: center; 
                    border: 1px solid #d1fae5;
                }
                .booking-ref .label { 
                    font-size: 12px; 
                    text-transform: uppercase; 
                    letter-spacing: 1px; 
                    color: #065f46; 
                    margin-bottom: 5px;
                }
                .booking-ref .value { 
                    font-size: 26px; 
                    font-weight: bold; 
                    color: #059669; 
                    letter-spacing: 1px; 
                    font-family: monospace;
                }
                .greeting {
                    font-size: 16px;
                    margin-bottom: 20px;
                }
                .section { 
                    background: #f9fafb; 
                    padding: 20px; 
                    border-radius: 12px; 
                    margin-bottom: 20px; 
                    border: 1px solid #e5e7eb;
                }
                .section h3 { 
                    margin: 0 0 16px; 
                    color: #1f2937; 
                    border-left: 4px solid #059669; 
                    padding-left: 12px;
                    font-size: 16px;
                }
                .detail-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 16px; 
                }
                .detail-item { 
                    margin-bottom: 12px; 
                }
                .detail-item strong {
                    display: block;
                    font-size: 12px;
                    color: #6b7280;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .detail-item span {
                    font-size: 15px;
                    font-weight: 500;
                    color: #1f2937;
                }
                .detail-box {
                    background: white;
                    padding: 12px 16px;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                }
                .price-breakdown {
                    background: #f9fafb;
                    padding: 16px;
                    border-radius: 12px;
                    margin: 16px 0;
                }
                .price-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #e5e7eb;
                }
                .price-row.subtotal {
                    border-bottom: none;
                    font-weight: 500;
                }
                .price-row.total {
                    border-top: 2px solid #059669;
                    border-bottom: none;
                    margin-top: 12px;
                    padding-top: 12px;
                    font-weight: bold;
                    font-size: 18px;
                }
                .total-amount {
                    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                    padding: 20px;
                    border-radius: 12px;
                    text-align: center;
                    margin-top: 20px;
                }
                .total-amount .label {
                    color: white;
                    font-size: 14px;
                    opacity: 0.9;
                    margin-bottom: 8px;
                }
                .total-amount .amount {
                    font-size: 32px;
                    font-weight: bold;
                    color: white;
                }
                .footer { 
                    background: #f9fafb; 
                    padding: 24px; 
                    text-align: center; 
                    color: #6b7280; 
                    font-size: 12px; 
                    border-top: 1px solid #e5e7eb;
                }
                .footer p {
                    margin: 5px 0;
                }
                .contact-info {
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 1px solid #e5e7eb;
                }
                @media (max-width: 480px) {
                    .detail-grid {
                        grid-template-columns: 1fr;
                    }
                    .container {
                        margin: 0;
                        border-radius: 0;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✈️ Booking Confirmed!</h1>
                    <p>Your travel adventure awaits</p>
                </div>
                <div class="content">
                    <div class="booking-ref">
                        <div class="label">Booking Reference</div>
                        <div class="value">${booking.booking_reference}</div>
                    </div>
                    
                    <div class="greeting">
                        Dear <strong>${escapeHtml(booking.client_name) || "Valued Customer"}</strong>,
                    </div>
                    
                    <p>Great news! Your booking with <strong>SNS Travel & Tours</strong> has been confirmed. Please review your travel details below.</p>
                    
                    <div class="section">
                        <h3>📍 Trip Details</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <strong>Destination</strong>
                                <span>${escapeHtml(booking.destinations?.name || booking.category_name) || "N/A"}</span>
                            </div>
                            <div class="detail-item">
                                <strong>Package</strong>
                                <span>${escapeHtml(booking.package_Name || booking.destination_packages?.package_name) || "N/A"}</span>
                            </div>
                            <div class="detail-item">
                                <strong>Hotel Category</strong>
                                <span>${escapeHtml(booking.hotel_Name || booking.hotel_categories?.category_name) || "N/A"}</span>
                            </div>
                            <div class="detail-item">
                                <strong>Travel Dates</strong>
                                <span>${travelDates}</span>
                            </div>
                            <div class="detail-item">
                                <strong>Number of Pax</strong>
                                <span>${paxLabel}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${optionalTourDisplay}
                    ${selectedRateDisplay}
                    
                    <div class="section">
                        <h3>💰 Price Breakdown</h3>
                        <div class="price-breakdown">
                            ${hotelRateDisplay}
                            ${
                              booking.optional_tour_total_amount &&
                              booking.optional_tour_total_amount > 0
                                ? `
                            <div class="price-row">
                                <span>Optional Tour (${totals.optionalTourPaxCount} pax × ₱${totals.optionalTourRatePerPax.toLocaleString()}):</span>
                                <span>₱${totals.optionalTourTotal.toLocaleString()}</span>
                            </div>
                            `
                                : ""
                            }
                            ${additionalFeeDisplay}
                            ${discountDisplay}
                            <div class="price-row total">
                                <span>Total Amount:</span>
                                <span>₱${totals.grandTotal.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="total-amount">
                        <div class="label">Amount to be Paid</div>
                        <div class="amount">₱${totals.grandTotal.toLocaleString()}</div>
                    </div>
                    
                    ${
                      booking.special_requests
                        ? `
                    <div class="section">
                        <h3>📝 Special Requests</h3>
                        <div class="detail-box">
                            ${escapeHtml(booking.special_requests)}
                        </div>
                    </div>
                    `
                        : ""
                    }
                    
                    ${
                      booking.is_flexible
                        ? `
                    <div class="section">
                        <h3>🔄 Flexible Booking</h3>
                        <p>This booking is flexible with travel dates. Please contact us for any changes.</p>
                    </div>
                    `
                        : ""
                    }
                    
                    <div class="contact-info">
                        <p>✨ Thank you for choosing SNS Travel & Tours! We look forward to making your journey unforgettable.</p>
                        <p>📞 Need assistance? Contact us:<br>
                        Phone: 09171672200<br>
                        09178862022 <br>
                        09176501100<br>
                        Email: snstraveltours81@gmail.com<br>
                        Address: KASSCO BUILDING, RIZAL AVENUE COR. CAVITE AND LICO STREETS, SANTA CRUZ, MANILA, 1014 METRO MANILA</p>
                    </div>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} SNS Travel & Tours. All rights reserved.</p>
                    <p>This is a system-generated email. Please do not reply to this message.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// Generate comprehensive payment confirmation HTML with full details and per-pax breakdown
function generatePaymentConfirmationHTML(booking) {
  const travelDates =
    booking.travel_dates
      ?.map((d) =>
        new Date(d).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      )
      .join(" → ") || "Not specified";

  const paxLabel = getPaxTypeLabel(booking);

  // Calculate totals with per-pax multiplication
  const totals = calculateBookingTotals(booking);

  let additionalFeeDisplay = "";
  if (booking.additional_fee && booking.additional_fee > 0) {
    additionalFeeDisplay = `
            <div class="price-row">
                <span>Additional Fee:</span>
                <span>₱${Number(booking.additional_fee).toLocaleString()}</span>
            </div>
            ${booking.additional_fee_description ? `<div style="font-size: 12px; color: #6b7280; margin-top: -5px; text-align: right;">(${escapeHtml(booking.additional_fee_description)})</div>` : ""}
        `;
  }

  let discountDisplay = "";
  if (booking.discount_amount && booking.discount_amount > 0) {
    discountDisplay = `
            <div class="price-row">
                <span>Discount:</span>
                <span>-₱${Number(booking.discount_amount).toLocaleString()}</span>
            </div>
            ${booking.discount_description ? `<div style="font-size: 12px; color: #6b7280; margin-top: -5px; text-align: right;">(${escapeHtml(booking.discount_description)})</div>` : ""}
        `;
  }

  return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Confirmation - ${booking.booking_reference}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
                .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 32px; text-align: center; }
                .content { padding: 32px; background: #ffffff; }
                .amount-box { background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); padding: 24px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #d1fae5; }
                .amount { font-size: 36px; font-weight: bold; color: #059669; }
                .booking-ref { background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
                .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
                .price-breakdown {
                    background: #f9fafb;
                    padding: 16px;
                    border-radius: 12px;
                    margin: 20px 0;
                }
                .price-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #e5e7eb;
                }
                .price-row.total {
                    border-top: 2px solid #059669;
                    border-bottom: none;
                    margin-top: 12px;
                    padding-top: 12px;
                    font-weight: bold;
                    font-size: 18px;
                }
                .footer { background: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
                .highlight { color: #059669; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>💰 Payment Confirmed!</h2>
                    <p>Thank you for your payment</p>
                </div>
                <div class="content">
                    <p>Dear <strong>${escapeHtml(booking.client_name) || "Valued Customer"}</strong>,</p>
                    <p>We have successfully received your payment for the following booking:</p>
                    
                    <div class="booking-ref">
                        <strong>Booking Reference:</strong><br>
                        <span style="font-size: 20px; font-weight: bold; color: #059669;">${booking.booking_reference}</span>
                    </div>
                    
                    <div class="details-grid">
                        <div><strong>Destination:</strong><br>${escapeHtml(booking.destinations?.name || booking.category_name) || "N/A"}</div>
                        <div><strong>Package:</strong><br>${escapeHtml(booking.package_Name || booking.destination_packages?.package_name) || "N/A"}</div>
                        <div><strong>Travel Dates:</strong><br>${travelDates}</div>
                        <div><strong>Number of Pax:</strong><br>${paxLabel}</div>
                    </div>
                    
                    <div class="price-breakdown">
                        <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #1f2937;">💰 Price Breakdown</h3>
                        <div class="price-row">
                            <span>Hotel Rate (${totals.hotelPaxCount} pax × ₱${totals.hotelRatePerPax.toLocaleString()}):</span>
                            <span>₱${totals.hotelBaseTotal.toLocaleString()}</span>
                        </div>
                        ${
                          booking.hotel_extra_night_rate &&
                          booking.hotel_extra_night_rate > 0
                            ? `
                        <div class="price-row">
                            <span>Extra Night Fee (${totals.hotelPaxCount} pax × ₱${totals.hotelExtraNightPerPax.toLocaleString()}):</span>
                            <span>₱${totals.hotelExtraTotal.toLocaleString()}</span>
                        </div>
                        `
                            : ""
                        }
                        <div class="price-row">
                            <span><strong>Hotel Subtotal:</strong></span>
                            <span><strong>₱${totals.hotelTotal.toLocaleString()}</strong></span>
                        </div>
                        ${
                          booking.optional_tour_total_amount &&
                          booking.optional_tour_total_amount > 0
                            ? `
                        <div class="price-row">
                            <span>Optional Tour (${totals.optionalTourPaxCount} pax × ₱${totals.optionalTourRatePerPax.toLocaleString()}):</span>
                            <span>₱${totals.optionalTourTotal.toLocaleString()}</span>
                        </div>
                        `
                            : ""
                        }
                        ${additionalFeeDisplay}
                        ${discountDisplay}
                        <div class="price-row total">
                            <span>Total Amount Paid:</span>
                            <span>₱${totals.grandTotal.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div class="amount-box">
                        <div style="font-size: 14px; color: #065f46; margin-bottom: 8px;">Payment Confirmed</div>
                        <div class="amount">₱${totals.grandTotal.toLocaleString()}</div>
                        <div style="font-size: 12px; margin-top: 8px;">${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</div>
                    </div>
                    
                    <p>Your booking is now fully confirmed. We've attached the itinerary for your reference.</p>
                    <p>Safe travels and enjoy your journey with SNS Travel & Tours!</p>
                </div>
                <div class="footer">
                    <p>SNS Travel & Tours - Your Trusted Travel Partner</p>
                    <p>✈️ Book with confidence | 🌏 Travel with joy</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// Generate comprehensive rejection email HTML
function generateRejectionEmailHTML(booking, reason) {
  const paxLabel = getPaxTypeLabel(booking);

  return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Update - ${booking.booking_reference}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
                .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 32px; text-align: center; }
                .content { padding: 32px; background: #ffffff; }
                .reason-box { background: #fee2e2; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #dc2626; }
                .booking-ref { background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
                .footer { background: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>❌ Booking Update</h2>
                    <p>Important information about your booking</p>
                </div>
                <div class="content">
                    <div class="booking-ref">
                        <strong>Booking Reference:</strong><br>
                        <span style="font-size: 20px; font-weight: bold;">${booking.booking_reference}</span>
                    </div>
                    
                    <p>Dear <strong>${escapeHtml(booking.client_name) || "Valued Customer"}</strong>,</p>
                    
                    <p>Thank you for choosing SNS Travel & Tours. After reviewing your booking request, we regret to inform you that we are unable to proceed with your booking at this time.</p>
                    
                    <div class="reason-box">
                        <strong>📝 Reason:</strong><br>
                        ${escapeHtml(reason)}
                    </div>
                    
                    <p><strong>Booking Details:</strong></p>
                    <ul>
                        <li>Destination: ${escapeHtml(booking.destinations?.name || booking.category_name) || "N/A"}</li>
                        <li>Package: ${escapeHtml(booking.package_Name || booking.destination_packages?.package_name) || "N/A"}</li>
                        <li>Travel Dates: ${booking.travel_dates?.map((d) => new Date(d).toLocaleDateString()).join(" - ") || "N/A"}</li>
                        <li>Number of Pax: ${paxLabel}</li>
                    </ul>
                    
                    <p><strong>What you can do:</strong></p>
                    <ul>
                        <li>Contact us for alternative travel options</li>
                        <li>Modify your booking request with different dates</li>
                        <li>Visit our website for other available packages</li>
                    </ul>
                    
                    <p>We apologize for any inconvenience this may cause and appreciate your understanding.</p>
                    
                    <p>📞 Contact us: 8180 4194 2015<br>
                    📧 snstraveltours81.com</p>
                </div>
                <div class="footer">
                    <p>SNS Travel & Tours - Your Trusted Travel Partner</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

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

// Send approval email
window.sendApprovalEmail = async function (bookingId) {
  console.log(`📧 Sending approval email for booking ${bookingId}`);

  try {
    const booking = await window.fetchBookingById(bookingId);
    if (!booking) throw new Error("Booking not found");

    if (!booking.client_email) {
      throw new Error("No email address for this booking");
    }

    const html = generateApprovalEmailHTML(booking);

    const result = await window.sendEmail({
      to: booking.client_email,
      bookingId,
      emailType: "approval",
      subject: `✅ Booking Confirmed: ${booking.booking_reference} - SNS Travel`,
      html,
    });

    if (result.success) {
      await window.updateBookingStatusAndAmount(bookingId, "confirmed");
      console.log(`✅ Booking ${bookingId} confirmed and email sent`);
    }

    return result;
  } catch (error) {
    console.error("Approval email error:", error);
    if (typeof showToast !== "undefined")
      showToast("❌ Failed to send approval email: " + error.message, "error");
    return { success: false, error: error.message };
  }
};

// Send rejection email
window.sendRejectionEmail = async function (bookingId, reason) {
  console.log(
    `📧 Sending rejection email for booking ${bookingId}, reason: ${reason}`,
  );

  try {
    const booking = await window.fetchBookingById(bookingId);
    if (!booking) throw new Error("Booking not found");

    if (!booking.client_email) {
      throw new Error("No email address for this booking");
    }

    const html = generateRejectionEmailHTML(booking, reason);

    const result = await window.sendEmail({
      to: booking.client_email,
      bookingId,
      emailType: "rejection",
      subject: `❌ Booking Update: ${booking.booking_reference} - SNS Travel`,
      html,
    });

    if (result.success) {
      await window.updateBookingStatusAndAmount(bookingId, "cancelled");
      console.log(`✅ Booking ${bookingId} cancelled and rejection email sent`);
    }

    return result;
  } catch (error) {
    console.error("Rejection email error:", error);
    if (typeof showToast !== "undefined")
      showToast("❌ Failed to send rejection email: " + error.message, "error");
    return { success: false, error: error.message };
  }
};

// Send payment confirmation
window.sendPaymentConfirmation = async function (bookingId) {
  console.log(`💰 Sending payment confirmation for booking ${bookingId}`);

  try {
    const booking = await window.fetchBookingById(bookingId);
    if (!booking) throw new Error("Booking not found");

    if (!booking.client_email) {
      throw new Error("No email address for this booking");
    }

    const html = generatePaymentConfirmationHTML(booking);

    const result = await window.sendEmail({
      to: booking.client_email,
      bookingId,
      emailType: "payment_confirmation",
      subject: `💰 Payment Confirmed: ${booking.booking_reference} - SNS Travel`,
      html,
    });

    if (result.success) {
      // Update payment status if needed
      const { error } = await supabase
        .from("b2b_bookings")
        .update({ payment_status: "paid", paid_at: new Date().toISOString() })
        .eq("id", bookingId);

      if (error) throw error;
      console.log(`✅ Booking ${bookingId} marked as paid and email sent`);
    }

    return result;
  } catch (error) {
    console.error("Payment confirmation error:", error);
    if (typeof showToast !== "undefined")
      showToast(
        "❌ Failed to send payment confirmation: " + error.message,
        "error",
      );
    return { success: false, error: error.message };
  }
};

console.log(
  "✅ Booking email loaded - Enhanced with per-pax calculations and detailed breakdowns",
);
