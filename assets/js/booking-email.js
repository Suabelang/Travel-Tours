// assets/js/modules/bookings/booking-email.js
// Enhanced email functions with all booking details

console.log("📧 Booking Email loaded - Enhanced");

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
      .join(" - ") || "Not specified";

  const totalAmount = Number(booking.total_amount || 0).toLocaleString();
  const nights = booking.travel_dates?.length
    ? booking.travel_dates.length - 1
    : 0;

  // Format hotel rate display
  let hotelRateDisplay = "";
  if (booking.hotel_Rates_Selected) {
    hotelRateDisplay = `
            <div class="detail-item">
                <strong>Hotel Rate:</strong> ₱${Number(booking.hotel_Rates_Selected).toLocaleString()}
            </div>
        `;
  }

  // Format optional tour display
  let optionalTourDisplay = "";
  if (booking.optional_tour_name) {
    const tourTotal = Number(
      booking.optional_tour_total_amount || 0,
    ).toLocaleString();
    optionalTourDisplay = `
            <div class="section">
                <h3>🏝️ Optional Tour</h3>
                <div class="detail-grid">
                    <div><strong>Tour Name:</strong><br>${booking.optional_tour_name}</div>
                    <div><strong>Number of Pax:</strong><br>${booking.optional_tour_pax_count || 1}</div>
                    <div><strong>Tour Rate:</strong><br>₱${Number(booking.optional_tour_rate_selected || 0).toLocaleString()} per pax</div>
                    <div><strong>Tour Total:</strong><br>₱${tourTotal}</div>
                </div>
            </div>
        `;
  }

  return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { padding: 30px; background: #f9fafb; }
                .booking-ref { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; border: 1px solid #e5e7eb; }
                .booking-ref .value { font-size: 24px; font-weight: bold; color: #059669; letter-spacing: 1px; }
                .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb; }
                .section h3 { margin: 0 0 15px; color: #374151; border-bottom: 2px solid #059669; padding-bottom: 8px; }
                .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .detail-item { margin-bottom: 10px; }
                .total { background: #ecfdf5; padding: 20px; border-radius: 8px; text-align: right; }
                .total .amount { font-size: 24px; font-weight: bold; color: #059669; }
                .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Booking Confirmed!</h1>
                    <p>Your travel adventure awaits</p>
                </div>
                <div class="content">
                    <div class="booking-ref">
                        <div class="value">${booking.booking_reference}</div>
                    </div>
                    <p>Dear <strong>${booking.client_name || "Valued Customer"}</strong>,</p>
                    <p>Great news! Your booking with <strong>SNS Travel & Tours</strong> has been confirmed.</p>
                    
                    <div class="section">
                        <h3>📍 Trip Details</h3>
                        <div class="detail-grid">
                            <div><strong>Destination:</strong><br>${booking.destinations?.name || booking.category_name || "N/A"}</div>
                            <div><strong>Package:</strong><br>${booking.package_Name || booking.destination_packages?.package_name || "N/A"}</div>
                            <div><strong>Hotel Category:</strong><br>${booking.hotel_Name || booking.hotel_categories?.category_name || "N/A"}</div>
                            <div><strong>Travel Dates:</strong><br>${travelDates}</div>
                            <div><strong>Duration:</strong><br>${nights} night(s)</div>
                            ${hotelRateDisplay}
                        </div>
                    </div>
                    
                    ${optionalTourDisplay}
                    
                    ${
                      booking.special_requests
                        ? `
                    <div class="section">
                        <h3>📝 Special Requests</h3>
                        <p>${booking.special_requests}</p>
                    </div>
                    `
                        : ""
                    }
                    
                    ${
                      booking.is_flexible
                        ? `
                    <div class="section">
                        <h3>🔄 Flexible Booking</h3>
                        <p>This booking is flexible with travel dates.</p>
                    </div>
                    `
                        : ""
                    }
                    
                    <div class="section">
                        <h3>💰 Payment Summary</h3>
                        <div class="total">
                            <div>Total Amount</div>
                            <div class="amount">₱${totalAmount}</div>
                        </div>
                    </div>
                    
                    <p>Thank you for choosing SNS Travel & Tours!</p>
                    <p>📞 Need help? Contact us: +63 (2) 1234 5678<br>📧 bookings@snstravel.com</p>
                </div>
                <div class="footer">
                    <p>KASSCO BUILDING, RIZAL AVENUE COR. CAVITE AND LICO STREETS, SANTA CRUZ, MANILA, 1014 METRO MANILA</p>
                    <p>© ${new Date().getFullYear()} SNS Travel & Tours. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// Generate comprehensive payment confirmation HTML
function generatePaymentConfirmationHTML(booking) {
  const totalAmount = Number(booking.total_amount || 0).toLocaleString();

  return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; background: #f9fafb; }
                .amount-box { background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px dashed #059669; }
                .amount { font-size: 32px; font-weight: bold; color: #059669; }
                .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                .details { background: white; padding: 15px; border-radius: 8px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>💰 Payment Confirmed!</h2>
                </div>
                <div class="content">
                    <p>Dear <strong>${booking.client_name || "Valued Customer"}</strong>,</p>
                    <p>We have received your payment for booking <strong>${booking.booking_reference}</strong>.</p>
                    <div class="amount-box">
                        <div>Amount Paid</div>
                        <div class="amount">₱${totalAmount}</div>
                        <div style="font-size: 14px; margin-top: 10px;">${new Date().toLocaleDateString("en-PH")}</div>
                    </div>
                    <div class="details">
                        <p><strong>Booking Reference:</strong> ${booking.booking_reference}</p>
                        <p><strong>Destination:</strong> ${booking.destinations?.name || booking.category_name || "N/A"}</p>
                        <p><strong>Package:</strong> ${booking.package_Name || booking.destination_packages?.package_name || "N/A"}</p>
                    </div>
                    <p>Your booking is now fully confirmed. Thank you for choosing SNS Travel & Tours!</p>
                </div>
                <div class="footer">
                    <p>SNS Travel & Tours - Your Trusted Travel Partner</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// Generate comprehensive rejection email HTML
function generateRejectionEmailHTML(booking, reason) {
  return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { padding: 30px; background: #f9fafb; }
                .reason-box { background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
                .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                .booking-ref { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; border: 1px solid #e5e7eb; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>❌ Booking Update</h1>
                    <p>Important information about your booking</p>
                </div>
                <div class="content">
                    <div class="booking-ref">
                        <strong>Booking Reference:</strong><br>
                        <span style="font-size: 20px; font-weight: bold;">${booking.booking_reference}</span>
                    </div>
                    
                    <p>Dear <strong>${booking.client_name || "Valued Customer"}</strong>,</p>
                    
                    <p>Thank you for choosing SNS Travel & Tours. After reviewing your booking request, we regret to inform you that we are unable to proceed with your booking at this time.</p>
                    
                    <div class="reason-box">
                        <strong>📝 Reason:</strong><br>
                        ${reason}
                    </div>
                    
                    <p><strong>Booking Details:</strong></p>
                    <ul>
                        <li>Destination: ${booking.destinations?.name || booking.category_name || "N/A"}</li>
                        <li>Package: ${booking.package_Name || booking.destination_packages?.package_name || "N/A"}</li>
                        <li>Travel Dates: ${booking.travel_dates?.map((d) => new Date(d).toLocaleDateString()).join(" - ") || "N/A"}</li>
                    </ul>
                    
                    <p><strong>What you can do:</strong></p>
                    <ul>
                        <li>Contact us for alternative travel options</li>
                        <li>Modify your booking request with different dates</li>
                        <li>Visit our website for other available packages</li>
                    </ul>
                    
                    <p>We apologize for any inconvenience this may cause and appreciate your understanding.</p>
                    
                    <p>📞 Contact us: +63 (2) 1234 5678<br>
                    📧 bookings@snstravel.com</p>
                </div>
                <div class="footer">
                    <p>SNS Travel & Tours - Your Trusted Travel Partner</p>
                </div>
            </div>
        </body>
        </html>
    `;
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
      await window.updateBookingStatus(bookingId, "confirmed");
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
      await window.updateBookingStatus(bookingId, "cancelled");
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

console.log("✅ Booking email loaded - Enhanced");
