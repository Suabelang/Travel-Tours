// assets/js/modules/bookings/booking-email.js
// Enhanced email functions with ALL booking details and payment info

console.log("📧 Booking Email loaded - Enhanced");

// Ensure supabase is available
if (typeof supabase === "undefined" && typeof window.supabase !== "undefined") {
  var supabase = window.supabase;
}

// Hardcoded Payment Information
const PAYMENT_INFO = {
  banks: [
    {
      name: "BDO",
      accountName: "PINOY TRAVEL BIZ GROUP INC.",
      branch: "JAS ANTIPOLO",
      accountNumber: "001080129756",
      swiftCode: "BNORPHMMXXX",
    },
    {
      name: "Security Bank",
      accountName: "PINOY TRAVEL BIZ GROUP INC.",
      branch: "UST BRANCH",
      accountNumber: "0000071352913",
      swiftCode: null,
    },
    {
      name: "BPI",
      accountName: "PINOY TRAVEL BIZ GROUP INC.",
      branch: "MASANGKAY",
      accountNumber: "4100 009647",
      swiftCode: "BOPIPHMM",
    },
  ],
  creditCardFee: "4.5% + ₱200 on Total Bill",
  contactNumbers: ["09171672200", "09178662022", "09176501100"],
  note: "After payment, immediately forward the Proof of Payment or the Deposit Slip for verification",
};

// Get payment info HTML
function getPaymentInfoHTML() {
  let banksHtml = "";
  PAYMENT_INFO.banks.forEach((bank) => {
    banksHtml += `
            <div style="margin-bottom: 15px;">
                <h4 style="margin: 0 0 8px 0; color: #2c3e50;">🏦 ${bank.name}</h4>
                <p style="margin: 0 0 5px 0;"><strong>Account Name:</strong> ${bank.accountName}</p>
                <p style="margin: 0 0 5px 0;"><strong>Branch:</strong> ${bank.branch}</p>
                <p style="margin: 0 0 5px 0;"><strong>Account Number:</strong> ${bank.accountNumber}</p>
                ${bank.swiftCode ? `<p style="margin: 0 0 5px 0;"><strong>SWIFT Code:</strong> ${bank.swiftCode}</p>` : ""}
            </div>
        `;
  });

  return `
        <div class="payment-info" style="background: #fff3e0; border: 1px solid #ffd966; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #b45f06; border-left: 4px solid #f39c12; padding-left: 12px;">💰 Mode of Payments</h3>
            ${banksHtml}
            <div style="background: #fef9e6; padding: 12px; border-radius: 8px; margin: 15px 0;">
                <p style="margin: 0; font-size: 13px;"><strong>💳 Credit Cards/Online Payments:</strong> Processing Fee: ${PAYMENT_INFO.creditCardFee}</p>
            </div>
            <div style="background: #e8f5e9; padding: 12px; border-radius: 8px; margin: 15px 0;">
                <p style="margin: 0; font-size: 13px;"><strong>📝 Note:</strong> ${PAYMENT_INFO.note}</p>
            </div>
            <div style="margin-top: 15px;">
                <h4 style="margin: 0 0 8px 0; color: #2c3e50;">📞 Contact Us:</h4>
                <p style="margin: 0;">${PAYMENT_INFO.contactNumbers.join(" | ")}</p>
            </div>
        </div>
    `;
}

// Confidential Note HTML
function getConfidentialNoteHTML() {
  return `
        <div style="background: #fef2e0; border-left: 4px solid #e67e22; padding: 12px 16px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; font-size: 11px; color: #e67e22;">
                <strong>🔒 CONFIDENTIAL:</strong> This page is confidential between PINOY ONLINE TRAVEL BIZ and your agency. 
                Please DO NOT send this to your client. Unauthorized sharing may result in revocation of access and termination of portal account.
            </p>
        </div>
    `;
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

// Get pax type label from booking data
function getPaxTypeLabel(booking) {
  // First check if we have selected_pax_type stored
  if (booking.selected_pax_type) {
    return booking.selected_pax_type;
  }
  // Check from selected_rate_details
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
  // Fallback to hotel_pax_count
  const count = booking.hotel_pax_count || 1;
  if (count === 1) return "Solo (1 pax)";
  return `${count} Pax`;
}

// Generate comprehensive approval email HTML with ALL details
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

  // Calculate totals
  const hotelTotal =
    (booking.hotel_Rates_Selected || 0) + (booking.hotel_extra_night_rate || 0);
  const optionalTotal = booking.optional_tour_total_amount || 0;
  const subtotal = hotelTotal + optionalTotal;
  const grandTotal =
    subtotal + (booking.additional_fee || 0) - (booking.discount_amount || 0);

  // Format additional fees and discounts
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
                .total-amount {
                    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                    padding: 20px;
                    border-radius: 12px;
                    text-align: center;
                    margin: 20px 0;
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
                .contact-info {
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 1px solid #e5e7eb;
                }
                @media (max-width: 480px) {
                    .detail-grid {
                        grid-template-columns: 1fr;
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
                    ${getConfidentialNoteHTML()}
                    
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
                    
                    ${
                      booking.selected_rate_details
                        ? `
                    <div class="section">
                        <h3>📋 Selected Rate Details</h3>
                        <div class="detail-box">
                            ${escapeHtml(booking.selected_rate_details)}
                        </div>
                    </div>
                    `
                        : ""
                    }
                    
                    <div class="section">
                        <h3>💰 Price Breakdown</h3>
                        <div class="price-breakdown">
                            ${
                              booking.hotel_Rates_Selected
                                ? `
                            <div class="price-row">
                                <span>Hotel Rate:</span>
                                <span>₱${Number(booking.hotel_Rates_Selected).toLocaleString()}</span>
                            </div>
                            `
                                : ""
                            }
                            ${
                              booking.hotel_extra_night_rate &&
                              booking.hotel_extra_night_rate > 0
                                ? `
                            <div class="price-row">
                                <span>Extra Night Fee:</span>
                                <span>₱${Number(booking.hotel_extra_night_rate).toLocaleString()}</span>
                            </div>
                            `
                                : ""
                            }
                            ${
                              booking.optional_tour_total_amount &&
                              booking.optional_tour_total_amount > 0
                                ? `
                            <div class="price-row">
                                <span>Optional Tour:</span>
                                <span>₱${Number(booking.optional_tour_total_amount).toLocaleString()}</span>
                            </div>
                            `
                                : ""
                            }
                            ${additionalFeeDisplay}
                            ${discountDisplay}
                        </div>
                        <div class="total-amount">
                            <div class="label">Total Amount</div>
                            <div class="amount">₱${grandTotal.toLocaleString()}</div>
                        </div>
                    </div>
                    
                    ${
                      booking.optional_tour_name
                        ? `
                    <div class="section">
                        <h3>🏝️ Optional Tour</h3>
                        <div class="detail-grid">
                            <div><strong>Tour Name:</strong><br>${escapeHtml(booking.optional_tour_name)}</div>
                            <div><strong>Number of Pax:</strong><br>${paxLabel}</div>
                            <div><strong>Rate per Pax:</strong><br>₱${Number(booking.optional_tour_rate_selected || 0).toLocaleString()}</div>
                            <div><strong>Tour Total:</strong><br>₱${Number(booking.optional_tour_total_amount || 0).toLocaleString()}</div>
                        </div>
                    </div>
                    `
                        : ""
                    }
                    
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
                    
                    ${getPaymentInfoHTML()}
                    
                    <div class="contact-info">
                        <p>✨ Thank you for choosing SNS Travel & Tours! We look forward to making your journey unforgettable.</p>
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

// Generate payment confirmation HTML
function generatePaymentConfirmationHTML(booking) {
  const grandTotal = (booking.total_amount || 0).toLocaleString();
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
                .footer { background: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>💰 Payment Confirmed!</h2>
                    <p>Thank you for your payment</p>
                </div>
                <div class="content">
                    ${getConfidentialNoteHTML()}
                    
                    <p>Dear <strong>${escapeHtml(booking.client_name) || "Valued Customer"}</strong>,</p>
                    <p>We have successfully received your payment for the following booking:</p>
                    
                    <div class="booking-ref">
                        <strong>Booking Reference:</strong><br>
                        <span style="font-size: 20px; font-weight: bold; color: #059669;">${booking.booking_reference}</span>
                    </div>
                    
                    <div class="amount-box">
                        <div style="font-size: 14px; color: #065f46; margin-bottom: 8px;">Amount Paid</div>
                        <div class="amount">₱${grandTotal}</div>
                        <div style="font-size: 12px; margin-top: 8px;">${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</div>
                    </div>
                    
                    <div class="details-grid">
                        <div><strong>Destination:</strong><br>${escapeHtml(booking.destinations?.name || booking.category_name) || "N/A"}</div>
                        <div><strong>Package:</strong><br>${escapeHtml(booking.package_Name || booking.destination_packages?.package_name) || "N/A"}</div>
                        <div><strong>Travel Dates:</strong><br>${travelDates}</div>
                        <div><strong>Number of Pax:</strong><br>${paxLabel}</div>
                    </div>
                    
                    <p>Your booking is now fully confirmed. We've attached the itinerary for your reference.</p>
                    <p>Safe travels and enjoy your journey with SNS Travel & Tours!</p>
                    
                    ${getPaymentInfoHTML()}
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

// Generate rejection email HTML
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
                    ${getConfidentialNoteHTML()}
                    
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
                    
                    <p>📞 Contact us: ${PAYMENT_INFO.contactNumbers.join(" | ")}</p>
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
      await window.updatePaymentStatus(bookingId, "paid");
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
  "✅ Booking email loaded - Enhanced with payment info and all details",
);
