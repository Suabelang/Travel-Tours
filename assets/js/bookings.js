// =====================================================
// BOOKINGS MODULE - COMPLETE CRUD WITH GMAIL SMTP INTEGRATION
// WITH EMAIL TRACKING - NO AGENCY
// =====================================================

import {
  supabase,
  state,
  formatCurrency,
  formatDate,
  showToast,
  showConfirmDialog,
  showLoading,
  hideLoading,
} from "./config_admin.js";

// Import dashboard functions for refreshing
import { fetchDashboardStats } from "./dashboard.js";

// =====================================================
// ============== SUPABASE CONFIGURATION ==============
// =====================================================
const SUPABASE_URL = "https://rpapduavenpzwtptgopm.supabase.co";

// =====================================================
// ENHANCED EMAIL SERVICE WITH GMAIL SMTP INTEGRATION
// =====================================================

const emailService = {
  // Send email with comprehensive tracking
  async send({
    to,
    subject,
    html,
    bookingId,
    emailType = "outgoing",
    cc = [],
    bcc = [],
    metadata = {},
    updateBookingStatus = false,
    statusToUpdate = null,
    paymentStatusToUpdate = null,
  }) {
    try {
      // Validate that we have a recipient
      if (!to) {
        console.error("No recipient email provided", { bookingId, emailType });
        throw new Error("No recipient email address provided");
      }

      // Validate email format
      if (!this.isValidEmail(to)) {
        throw new Error(`Invalid recipient email address: ${to}`);
      }

      // Show sending toast
      showToast(`📨 Sending ${emailType} email to ${to}...`, "info");

      // Generate request ID for tracking
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get the current session's access token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        showToast("❌ You must be logged in to send emails", "error");
        return { success: false, error: "No active session" };
      }

      // Send via edge function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Booking-ID": bookingId?.toString() || "",
          "X-Request-ID": requestId,
        },
        body: JSON.stringify({
          to: to,
          subject,
          html,
          replyTo: "bookings@snstravel.com",
          bookingId,
          emailType,
          cc,
          bcc,
          metadata: {
            ...metadata,
            requestId,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error ${response.status}`);
      }

      // Success!
      showToast(`✅ Email sent successfully to ${to}`, "success");

      // If we should update booking status
      if (updateBookingStatus && statusToUpdate && bookingId) {
        await this.updateBookingStatusAfterEmail(
          bookingId,
          statusToUpdate,
          paymentStatusToUpdate,
          emailType,
        );
      }

      return {
        success: true,
        messageId: result.messageId,
        recipient: to,
        bookingReference: result.bookingReference,
      };
    } catch (error) {
      return this.handleError(error, { bookingId, emailType, to });
    }
  },

  // Get booking with all related details - NO AGENCY
  async getBookingWithDetails(bookingId) {
    try {
      // Get booking first
      const { data: booking, error } = await supabase
        .from("b2b_bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (error) throw error;
      if (!booking) throw new Error("Booking not found");

      // Fetch related data
      const relatedData = {};

      if (booking.destination_id) {
        const { data } = await supabase
          .from("destinations")
          .select("name, airport_code, country")
          .eq("id", booking.destination_id)
          .single();
        relatedData.destinations = data;
      }

      if (booking.package_id) {
        const { data } = await supabase
          .from("destination_packages")
          .select("package_name, package_code, duration_days, duration_nights")
          .eq("id", booking.package_id)
          .single();
        relatedData.destination_packages = data;
      }

      if (booking.hotel_category_id) {
        const { data } = await supabase
          .from("hotel_categories")
          .select("category_name")
          .eq("id", booking.hotel_category_id)
          .single();
        relatedData.hotel_categories = data;
      }

      // Get email history
      const { data: emails } = await supabase
        .from("booking_emails")
        .select("id, email_type, status, created_at")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });

      return {
        ...booking,
        ...relatedData,
        booking_emails: emails || [],
      };
    } catch (error) {
      console.error("Error fetching booking:", error);
      return null;
    }
  },

  // Update booking status after email
  async updateBookingStatusAfterEmail(
    bookingId,
    status,
    paymentStatus,
    emailType,
  ) {
    try {
      console.log("🔄 Attempting to update booking:", {
        bookingId,
        status,
        paymentStatus,
      });

      const updateData = {
        updated_at: new Date().toISOString(),
      };

      if (status) {
        updateData.status = status;
      }

      if (paymentStatus) {
        updateData.payment_status = paymentStatus;
        if (paymentStatus === "paid") {
          updateData.paid_at = new Date().toISOString();
        }
      }

      console.log("Update data:", updateData);

      const { data, error } = await supabase
        .from("b2b_bookings")
        .update(updateData)
        .eq("id", bookingId)
        .select();

      if (error) {
        console.error("❌ Database error:", error);
        throw error;
      }

      console.log("✅ Database update successful:", data);

      // Refresh bookings
      await fetchBookings();
    } catch (error) {
      console.error("❌ Error updating booking status:", error);
    }
  },

  // Email templates with your database structure - NO AGENCY REFERENCES
  templates: {
    // Approval email with full booking details
    bookingApproval: (booking) => {
      const customerName = booking.agent_name || "Valued Customer";
      const destination = booking.destinations?.name || "N/A";
      const package_name = booking.destination_packages?.package_name || "N/A";
      const hotel = booking.hotel_categories?.category_name || "N/A";

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

      const totalPassengers =
        (booking.num_adults || 0) +
        (booking.num_children || 0) +
        (booking.infants || 0);

      return `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; }
                        .header h1 { margin: 0; font-size: 28px; }
                        .header p { margin: 10px 0 0; opacity: 0.9; }
                        .content { padding: 30px; background: #f9fafb; }
                        .booking-ref { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb; text-align: center; }
                        .booking-ref .label { font-size: 14px; color: #6b7280; }
                        .booking-ref .value { font-size: 24px; font-weight: bold; color: #059669; letter-spacing: 1px; }
                        .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb; }
                        .section h3 { margin: 0 0 15px; color: #374151; font-size: 18px; border-bottom: 2px solid #059669; padding-bottom: 8px; }
                        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                        .detail-item .label { font-size: 13px; color: #6b7280; }
                        .detail-item .value { font-size: 16px; font-weight: 600; color: #111827; }
                        .total { background: #ecfdf5; padding: 20px; border-radius: 8px; text-align: right; }
                        .total .amount { font-size: 24px; font-weight: bold; color: #059669; }
                        .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                        .button { display: inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
                        .note { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
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
                                <div class="label">Booking Reference</div>
                                <div class="value">${booking.booking_reference}</div>
                            </div>
                            
                            <p>Dear <strong>${customerName}</strong>,</p>
                            <p>Great news! Your booking with <strong>SNS Travel & Tours</strong> has been confirmed. Here are your complete booking details:</p>
                            
                            <div class="section">
                                <h3>📍 Destination & Package</h3>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <div class="label">Destination</div>
                                        <div class="value">${destination}${booking.destinations?.country ? `, ${booking.destinations.country}` : ""}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="label">Package</div>
                                        <div class="value">${package_name}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="label">Hotel Category</div>
                                        <div class="value">${hotel}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="label">Duration</div>
                                        <div class="value">${booking.destination_packages?.duration_days || "?"}D/${booking.destination_packages?.duration_nights || "?"}N</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="section">
                                <h3>📅 Travel Details</h3>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <div class="label">Travel Dates</div>
                                        <div class="value">${travelDates}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="label">Room Preference</div>
                                        <div class="value">${booking.room_preference || "No Preference"}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="label">Passengers</div>
                                        <div class="value">${booking.num_adults || 0} Adult(s), ${booking.num_children || 0} Child(ren), ${booking.infants || 0} Infant(s)</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="label">Total Passengers</div>
                                        <div class="value">${totalPassengers}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="section">
                                <h3>💰 Payment Summary</h3>
                                <div style="margin-bottom: 10px;">
                                    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                                        <span>Net Rate per Pax:</span>
                                        <span>₱${(booking.net_rate_per_pax || 0).toLocaleString()}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                                        <span>Markup:</span>
                                        <span>₱${(booking.agency_markup || 0).toLocaleString()}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 2px solid #e5e7eb; margin-top: 8px; font-weight: bold;">
                                        <span>Total Amount:</span>
                                        <span class="amount">₱${(booking.total_amount || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            
                            ${
                              booking.special_requests
                                ? `
                                <div class="note">
                                    <strong>📝 Special Requests:</strong><br>
                                    ${booking.special_requests}
                                </div>
                            `
                                : ""
                            }
                            
                            <div style="text-align: center;">
                                <a href="#" class="button">View Booking Online</a>
                            </div>
                            
                            <p style="margin-top: 20px;">
                                <strong>Need help?</strong><br>
                                Contact our support team:<br>
                                📞 +63 (2) 1234 5678<br>
                                📧 bookings@snstravel.com
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p>KASSCO BUILDING, RIZAL AVENUE COR. CAVITE AND LICO STREETS, SANTA CRUZ, MANILA, 1014 METRO MANILA</p>
                            <p>© ${new Date().getFullYear()} SNS Travel & Tours. All rights reserved.</p>
                            <p style="font-size: 10px;">Booking Reference: ${booking.booking_reference}</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
    },

    // Payment confirmation email
    paymentConfirmation: (booking) => {
      const customerName = booking.agent_name || "Valued Customer";

      return `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; }
                        .content { padding: 30px; background: #f9fafb; }
                        .amount-box { background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px dashed #059669; }
                        .amount { font-size: 32px; font-weight: bold; color: #059669; }
                        .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>💰 Payment Confirmed</h2>
                            <p>Thank you for your payment</p>
                        </div>
                        <div class="content">
                            <p>Dear <strong>${customerName}</strong>,</p>
                            <p>We have received your payment for booking <strong>${booking.booking_reference}</strong>.</p>
                            
                            <div class="amount-box">
                                <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">Amount Paid</div>
                                <div class="amount">₱${(booking.total_amount || 0).toLocaleString()}</div>
                                <div style="font-size: 14px; color: #6b7280; margin-top: 10px;">
                                    ${new Date().toLocaleDateString("en-PH", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                </div>
                            </div>
                            
                            <p>Your booking is now fully confirmed and guaranteed.</p>
                            <p>Thank you for choosing SNS Travel & Tours!</p>
                        </div>
                        <div class="footer">
                            <p>SNS Travel & Tours - Your Trusted Travel Partner</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
    },

    // Rejection email
    bookingRejection: (booking, reason) => {
      const customerName = booking.agent_name || "Valued Customer";

      return `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; }
                        .content { padding: 30px; background: #f9fafb; }
                        .reason { background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
                        .booking-ref { font-size: 18px; font-weight: bold; color: #dc2626; }
                        .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>📝 Booking Update</h2>
                            <p>Regarding your recent booking request</p>
                        </div>
                        <div class="content">
                            <p>Dear <strong>${customerName}</strong>,</p>
                            <p>Regarding your booking <span class="booking-ref">${booking.booking_reference}</span>:</p>
                            
                            <div class="reason">
                                <strong style="display: block; margin-bottom: 10px;">Reason for update:</strong>
                                <p style="margin: 0;">${reason}</p>
                            </div>
                            
                            <p>Please contact us if you have any questions or would like to discuss alternative options:</p>
                            <p>
                                📞 +63 (2) 1234 5678<br>
                                📧 bookings@snstravel.com
                            </p>
                        </div>
                        <div class="footer">
                            <p>We're here to help you find the perfect travel experience</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
    },

    // Reply template
    replyTemplate: (booking, message) => {
      const customerName = booking.agent_name || "Valued Customer";

      return `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 20px; text-align: center; }
                        .content { padding: 30px; background: #f9fafb; }
                        .message { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }
                        .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>💬 Reply Regarding Your Booking</h2>
                            <p>${booking.booking_reference}</p>
                        </div>
                        <div class="content">
                            <p>Dear <strong>${customerName}</strong>,</p>
                            
                            <div class="message">
                                ${message.replace(/\n/g, "<br>")}
                            </div>
                            
                            <p>Please don't hesitate to contact us if you need further assistance.</p>
                            <p>Best regards,<br><strong>SNS Travel & Tours Team</strong></p>
                        </div>
                        <div class="footer">
                            <p>Your trusted travel partner since 2010</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
    },

    // Test email
    testEmail: () => {
      return `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 20px auto; padding: 20px; background: #f9fafb; border-radius: 12px; }
                        .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px; }
                        .success { color: #059669; font-size: 48px; text-align: center; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>📧 Test Email</h2>
                        </div>
                        <div class="success">✅</div>
                        <h3 style="text-align: center;">Email Configuration Successful!</h3>
                        <p>If you're receiving this, your Gmail SMTP setup is working correctly.</p>
                        <hr>
                        <p><strong>System Information:</strong></p>
                        <ul>
                            <li>Time: ${new Date().toLocaleString()}</li>
                            <li>Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}</li>
                            <li>Status: Operational</li>
                        </ul>
                        <p style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">
                            SNS Travel & Tours - Booking System
                        </p>
                    </div>
                </body>
                </html>
            `;
    },
  },

  // Helper: Validate email
  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  },

  // Helper: Get client IP (via service)
  async getClientIP() {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      return data.ip;
    } catch {
      return "unknown";
    }
  },

  // Helper: Handle errors
  handleError(error, context) {
    console.error("❌ Email error:", error, context);

    let userMessage = "Failed to send email";

    if (error.message.includes("ECONNREFUSED")) {
      userMessage = "Could not connect to email server";
    } else if (error.message.includes("Invalid login")) {
      userMessage = "Email authentication failed - contact support";
    } else if (error.message.includes("quota")) {
      userMessage = "Daily email limit reached";
    } else if (error.message.includes("Invalid recipient")) {
      userMessage = "Invalid email address";
    }

    showToast(`❌ ${userMessage}`, "error");

    return { success: false, error: error.message };
  },
};

// Send approval email with status update
export async function sendApprovalEmail(bookingId) {
  try {
    showLoading(true, "Processing approval...");

    const booking = await emailService.getBookingWithDetails(bookingId);
    if (!booking) throw new Error("Booking not found");

    const recipientEmail = booking.agent_email;

    if (!recipientEmail) {
      showToast("❌ No email found for this booking", "error");
      showLoading(false);
      return { success: false };
    }

    const result = await emailService.send({
      to: recipientEmail,
      bookingId,
      emailType: "approval",
      subject: `✅ Booking Confirmed: ${booking.booking_reference} - SNS Travel`,
      html: emailService.templates.bookingApproval(booking),
      updateBookingStatus: true,
      statusToUpdate: "confirmed",
      metadata: {
        action: "approval",
        source: "booking_module",
      },
    });

    showLoading(false);

    if (result.success) {
      showToast("✅ Booking approved and email sent!", "success");

      const currentModal = document.querySelector(".fixed:last-child");
      if (currentModal) currentModal.remove();

      await fetchBookings();

      try {
        await fetchDashboardStats();
      } catch (e) {
        console.log("Dashboard stats not available");
      }

      await refreshCurrentPage();

      setTimeout(() => {
        viewBookingDetails(bookingId);
      }, 500);
    }

    return result;
  } catch (error) {
    showLoading(false);
    console.error("Approval error:", error);
    showToast("❌ Failed to send approval: " + error.message, "error");
    return { success: false };
  }
}

// Send rejection email
export async function sendRejectionEmail(bookingId, reason) {
  try {
    if (!reason) {
      showToast("Please enter a rejection reason", "warning");
      return { success: false };
    }

    showLoading(true, "Processing rejection...");

    const booking = await emailService.getBookingWithDetails(bookingId);
    if (!booking) throw new Error("Booking not found");

    const recipientEmail = booking.agent_email;

    if (!recipientEmail) {
      showToast("❌ No email found for this booking", "error");
      showLoading(false);
      return { success: false };
    }

    const result = await emailService.send({
      to: recipientEmail,
      bookingId,
      emailType: "rejection",
      subject: `📝 Update on your booking ${booking.booking_reference}`,
      html: emailService.templates.bookingRejection(booking, reason),
      updateBookingStatus: true,
      statusToUpdate: "cancelled",
      metadata: {
        action: "rejection",
        reason: reason,
        source: "booking_module",
      },
    });

    showLoading(false);

    if (result.success) {
      showToast("✅ Booking rejected and email sent!", "success");

      const currentModal = document.querySelector(".fixed:last-child");
      if (currentModal) currentModal.remove();

      await fetchBookings();

      try {
        await fetchDashboardStats();
      } catch (e) {
        console.log("Dashboard stats not available");
      }

      await refreshCurrentPage();
      await viewBookingDetails(bookingId);
    }

    return result;
  } catch (error) {
    showLoading(false);
    console.error("Rejection error:", error);
    showToast("❌ Failed to send rejection: " + error.message, "error");
    return { success: false };
  }
}

// Send payment confirmation
export async function sendPaymentConfirmation(bookingId) {
  try {
    showLoading(true, "Sending payment confirmation...");

    const booking = await emailService.getBookingWithDetails(bookingId);
    if (!booking) throw new Error("Booking not found");

    const recipientEmail = booking.agent_email;

    if (!recipientEmail) {
      showToast(
        "❌ No email found for this booking. Payment marked as paid but no email sent.",
        "warning",
      );

      await supabase
        .from("b2b_bookings")
        .update({
          payment_status: "paid",
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      showLoading(false);
      showToast("✅ Payment marked as paid!", "success");

      const currentModal = document.querySelector(".fixed:last-child");
      if (currentModal) currentModal.remove();
      await fetchBookings();
      await refreshCurrentPage();

      return { success: true, emailSent: false };
    }

    const result = await emailService.send({
      to: recipientEmail,
      bookingId,
      emailType: "payment_confirmation",
      subject: `💰 Payment Confirmed: ${booking.booking_reference}`,
      html: emailService.templates.paymentConfirmation(booking),
      updateBookingStatus: true,
      paymentStatusToUpdate: "paid",
      metadata: {
        action: "payment_confirmation",
        source: "booking_module",
      },
    });

    showLoading(false);

    if (result.success) {
      showToast("✅ Payment confirmed and email sent!", "success");
      const currentModal = document.querySelector(".fixed:last-child");
      if (currentModal) currentModal.remove();
      await fetchBookings();
      await refreshCurrentPage();
      setTimeout(() => {
        viewBookingDetails(bookingId);
      }, 500);
    }

    return result;
  } catch (error) {
    showLoading(false);
    console.error("Payment confirmation error:", error);
    showToast(
      "❌ Failed to send payment confirmation: " + error.message,
      "error",
    );
    return { success: false };
  }
}

// Send custom reply
export async function sendReply(bookingId, message) {
  try {
    if (!message) {
      showToast("Please enter a message", "warning");
      return { success: false };
    }

    const booking = await emailService.getBookingWithDetails(bookingId);
    if (!booking) throw new Error("Booking not found");

    const recipientEmail = booking.agent_email;

    if (!recipientEmail) {
      showToast("❌ No email found for this booking", "error");
      return { success: false };
    }

    const result = await emailService.send({
      to: recipientEmail,
      bookingId,
      emailType: "reply",
      subject: `💬 Re: Your booking ${booking.booking_reference}`,
      html: emailService.templates.replyTemplate(booking, message),
      metadata: {
        action: "reply",
        message_preview: message.substring(0, 100),
        source: "booking_module",
      },
    });

    if (result.success) {
      showToast("✅ Reply sent successfully!", "success");
    }

    return result;
  } catch (error) {
    console.error("Reply error:", error);
    showToast("❌ Failed to send reply: " + error.message, "error");
    return { success: false };
  }
}

// Send test email
export async function sendTestEmail(testEmail) {
  try {
    if (!testEmail) {
      showToast("Please enter an email address", "warning");
      return { success: false };
    }

    showLoading(true, "Sending test email...");

    const result = await emailService.send({
      to: testEmail,
      emailType: "test",
      subject: "Test Email from SNS Travel Booking System",
      html: emailService.templates.testEmail(),
      metadata: {
        action: "test",
        source: "booking_module",
      },
    });

    showLoading(false);

    if (result.success) {
      showToast("✅ Test email sent! Check your inbox", "success");
    }

    return result;
  } catch (error) {
    showLoading(false);
    console.error("Test email error:", error);
    showToast("❌ Test email failed: " + error.message, "error");
    return { success: false };
  }
}

// Get email history for a booking
export async function getEmailHistory(bookingId) {
  try {
    const { data, error } = await supabase
      .from("booking_emails")
      .select(
        `
                *,
                b2b_bookings (
                    booking_reference,
                    agent_name,
                    agent_email
                )
            `,
      )
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching email history:", error);
    return [];
  }
}

// Resend failed email
export async function resendEmail(emailId) {
  try {
    showLoading(true, "Resending email...");

    const { data: email, error } = await supabase
      .from("booking_emails")
      .select("*")
      .eq("id", emailId)
      .single();

    if (error) throw error;

    const result = await emailService.send({
      to: email.to_email,
      subject: email.subject,
      html: email.body,
      bookingId: email.booking_id,
      emailType: email.email_type,
      metadata: {
        ...email.metadata,
        is_resend: true,
        original_email_id: emailId,
      },
    });

    showLoading(false);

    if (result.success) {
      showToast("✅ Email resent successfully!", "success");
    }

    return result;
  } catch (error) {
    showLoading(false);
    console.error("Resend error:", error);
    showToast("❌ Failed to resend email: " + error.message, "error");
    return { success: false };
  }
}

// FETCH BOOKINGS - SIMPLIFIED VERSION (para iwas 400 error)
export async function fetchBookings() {
  try {
    showLoading(true, "Loading bookings...");

    const { data: bookings, error } = await supabase
      .from("b2b_bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (bookings && bookings.length > 0) {
      const destinationIds = [
        ...new Set(bookings.map((b) => b.destination_id).filter((id) => id)),
      ];
      const packageIds = [
        ...new Set(bookings.map((b) => b.package_id).filter((id) => id)),
      ];
      const hotelIds = [
        ...new Set(bookings.map((b) => b.hotel_category_id).filter((id) => id)),
      ];

      const promises = [];

      if (destinationIds.length > 0) {
        promises.push(
          supabase
            .from("destinations")
            .select("id, name, airport_code, country")
            .in("id", destinationIds),
        );
      }

      if (packageIds.length > 0) {
        promises.push(
          supabase
            .from("destination_packages")
            .select("id, package_name, package_code")
            .in("id", packageIds),
        );
      }

      if (hotelIds.length > 0) {
        promises.push(
          supabase
            .from("hotel_categories")
            .select("id, category_name")
            .in("id", hotelIds),
        );
      }

      const results = await Promise.all(promises);

      const destinations = results[0]?.data || [];
      const packages = results[1]?.data || [];
      const hotels = results[2]?.data || [];

      state.bookings = bookings.map((booking) => ({
        ...booking,
        destinations:
          destinations.find((d) => d.id === booking.destination_id) || null,
        destination_packages:
          packages.find((p) => p.id === booking.package_id) || null,
        hotel_categories:
          hotels.find((h) => h.id === booking.hotel_category_id) || null,
      }));
    } else {
      state.bookings = [];
    }

    console.log("✅ Bookings updated in state:", state.bookings.length);
    showLoading(false);
    return state.bookings;
  } catch (error) {
    console.error("Error fetching bookings:", error);
    showToast("Failed to load bookings", "error");
    showLoading(false);
    state.bookings = [];
    return [];
  }
}

// FETCH BOOKING BY ID - SIMPLIFIED VERSION
export async function fetchBookingById(id) {
  try {
    showLoading(true, "Loading booking details...");

    const { data: booking, error } = await supabase
      .from("b2b_bookings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!booking) throw new Error("Booking not found");

    const relatedData = {};

    if (booking.destination_id) {
      const { data } = await supabase
        .from("destinations")
        .select("*")
        .eq("id", booking.destination_id)
        .single();
      relatedData.destinations = data;
    }

    if (booking.package_id) {
      const { data } = await supabase
        .from("destination_packages")
        .select("*")
        .eq("id", booking.package_id)
        .single();
      relatedData.destination_packages = data;
    }

    if (booking.hotel_category_id) {
      const { data } = await supabase
        .from("hotel_categories")
        .select("*")
        .eq("id", booking.hotel_category_id)
        .single();
      relatedData.hotel_categories = data;
    }

    const { data: emails } = await supabase
      .from("booking_emails")
      .select("*")
      .eq("booking_id", id);

    showLoading(false);

    return {
      ...booking,
      ...relatedData,
      booking_emails: emails || [],
    };
  } catch (error) {
    console.error("Error fetching booking:", error);
    showToast("Failed to load booking details", "error");
    showLoading(false);
    return null;
  }
}

// =====================================================
// UPDATE: Booking status
// =====================================================
export async function updateBookingStatus(
  id,
  status,
  sendEmail = false,
  emailMessage = "",
) {
  try {
    showLoading(true, `Updating booking to ${status}...`);

    const { data, error } = await supabase
      .from("b2b_bookings")
      .update({
        status,
        updated_at: new Date(),
      })
      .eq("id", id)
      .select();

    if (error) throw error;

    await fetchBookings();
    showToast(`✅ Booking status updated to ${status}!`, "success");

    if (sendEmail) {
      if (status === "confirmed") {
        await sendApprovalEmail(id);
      } else if (status === "cancelled") {
        await sendRejectionEmail(id, emailMessage);
      }
    }

    showLoading(false);
    await refreshCurrentPage();
    return data[0];
  } catch (error) {
    console.error("Error updating booking status:", error);
    showToast("❌ Failed to update booking: " + error.message, "error");
    showLoading(false);
    return null;
  }
}

// =====================================================
// UPDATE: Payment status
// =====================================================
export async function updatePaymentStatus(id, status, sendEmail = false) {
  try {
    showLoading(true, `Updating payment to ${status}...`);

    const updateData = {
      payment_status: status,
      updated_at: new Date(),
    };

    if (status === "paid") {
      updateData.paid_at = new Date();
    }

    const { data, error } = await supabase
      .from("b2b_bookings")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;

    await fetchBookings();
    showToast(`✅ Payment status updated to ${status}!`, "success");

    if (sendEmail && status === "paid") {
      await sendPaymentConfirmation(id);
    }

    showLoading(false);
    await refreshCurrentPage();
    return data[0];
  } catch (error) {
    console.error("Error updating payment status:", error);
    showToast("❌ Failed to update payment: " + error.message, "error");
    showLoading(false);
    return null;
  }
}

// =====================================================
// CANCEL: Soft delete booking
// =====================================================
export async function cancelBooking(id) {
  showConfirmDialog(
    "⚠️ Are you sure you want to cancel this booking?",
    async () => {
      try {
        showLoading(true, "Cancelling booking...");

        const { error } = await supabase
          .from("b2b_bookings")
          .update({
            status: "cancelled",
            updated_at: new Date(),
          })
          .eq("id", id);

        if (error) throw error;

        await fetchBookings();
        showToast("✅ Booking cancelled successfully!", "success");
        showLoading(false);
        await refreshCurrentPage();
      } catch (error) {
        console.error("Error cancelling booking:", error);
        showToast("❌ Failed to cancel booking: " + error.message, "error");
        showLoading(false);
      }
    },
  );
}

// =====================================================
// REACTIVATE: Set cancelled booking back to pending
// =====================================================
export async function reactivateBooking(id) {
  showConfirmDialog(
    "⚠️ Reactivate this booking? This will set it back to pending status.",
    async () => {
      try {
        showLoading(true, "Reactivating booking...");

        const { error } = await supabase
          .from("b2b_bookings")
          .update({
            status: "pending",
            updated_at: new Date(),
          })
          .eq("id", id);

        if (error) throw error;

        await fetchBookings();
        showToast("✅ Booking reactivated successfully!", "success");
        showLoading(false);
        await refreshCurrentPage();
      } catch (error) {
        console.error("Error reactivating booking:", error);
        showToast("❌ Failed to reactivate booking: " + error.message, "error");
        showLoading(false);
      }
    },
  );
}

// =====================================================
// VIEW BOOKING CONFIRMATION
// =====================================================
export function viewBookingConfirmation(id) {
  const booking = state.bookings.find((b) => b.id === id);
  if (!booking) return;

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm";

  const customerName = booking.agent_name || "Customer";

  modal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div class="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 flex items-center justify-between sticky top-0 rounded-t-2xl">
                <div class="flex items-center gap-3">
                    <div class="h-10 w-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-white">Booking Confirmation</h3>
                        <p class="text-emerald-100 text-sm">${booking.booking_reference}</p>
                    </div>
                </div>
                <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-3xl">&times;</button>
            </div>
            <div class="p-6 space-y-6">
                <div class="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <div class="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <i class="fas fa-check-circle text-xl"></i>
                    </div>
                    <div>
                        <h4 class="font-semibold text-green-800">Booking Created!</h4>
                        <p class="text-sm text-green-600">Your booking has been successfully created.</p>
                    </div>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-800 mb-3">Booking Details</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div><p class="text-xs text-gray-500">Reference</p><p class="font-mono font-medium">${booking.booking_reference}</p></div>
                        <div><p class="text-xs text-gray-500">Booking Date</p><p class="font-medium">${formatDate(booking.created_at)}</p></div>
                        <div><p class="text-xs text-gray-500">Customer</p><p class="font-medium">${customerName}</p></div>
                        <div><p class="text-xs text-gray-500">Destination</p><p class="font-medium">${booking.destinations?.name || "N/A"}</p></div>
                        <div><p class="text-xs text-gray-500">Package</p><p class="font-medium">${booking.destination_packages?.package_name || "N/A"}</p></div>
                        <div><p class="text-xs text-gray-500">Travel Dates</p><p class="font-medium">${booking.travel_dates?.map((d) => formatDate(d)).join(" - ") || "N/A"}</p></div>
                    </div>
                </div>
                <div class="bg-emerald-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-800 mb-3">Payment Summary</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between text-sm"><span>Net Rate:</span><span class="font-medium">${formatCurrency(booking.net_rate_per_pax)} x ${booking.num_adults}</span></div>
                        <div class="flex justify-between text-sm"><span>Markup:</span><span class="font-medium">${formatCurrency(booking.agency_markup)}</span></div>
                        <div class="border-t border-emerald-200 pt-2 mt-2">
                            <div class="flex justify-between font-bold">
                                <span>Total Amount:</span>
                                <span class="text-emerald-700">${formatCurrency(booking.total_amount)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="bg-gray-100 p-3 rounded-lg text-xs text-gray-600 text-center">
                    KASSCO BUILDING, RIZAL AVENUE COR. CAVITE AND LICO STREETS, SANTA CRUZ, MANILA, 1014 METRO MANILA
                </div>
                <div class="flex justify-end gap-3 pt-4 border-t">
                    <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">Close</button>
                    <button onclick="window.printBookingConfirmation(${booking.id})" class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
                        <i class="fas fa-print mr-2"></i> Print
                    </button>
                </div>
            </div>
        </div>
    `;
  document.body.appendChild(modal);
}

// =====================================================
// PRINT BOOKING CONFIRMATION
// =====================================================
export function printBookingConfirmation(id) {
  const booking = state.bookings.find((b) => b.id === id);
  if (!booking) return;

  const customerName = booking.agent_name || "Customer";

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Booking Confirmation - ${booking.booking_reference}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { font-size: 28px; font-weight: bold; color: #059669; }
                .reference { font-size: 14px; color: #666; margin-top: 5px; }
                .section { margin-bottom: 25px; }
                .section-title { font-weight: bold; border-bottom: 2px solid #059669; padding-bottom: 5px; margin-bottom: 15px; color: #059669; }
                .row { display: flex; margin-bottom: 8px; }
                .label { width: 150px; color: #666; font-weight: 500; }
                .value { font-weight: 500; }
                .total { font-size: 20px; font-weight: bold; color: #059669; margin-top: 20px; text-align: right; }
                .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ccc; padding-top: 20px; }
                table { width: 100%; border-collapse: collapse; }
                td { padding: 5px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">SNS Travel & Tours</div>
                <div class="reference">Booking Confirmation: ${booking.booking_reference}</div>
            </div>
            
            <div class="section">
                <div class="section-title">Booking Details</div>
                <div class="row"><span class="label">Customer:</span><span class="value">${customerName}</span></div>
                <div class="row"><span class="label">Booking Date:</span><span class="value">${formatDate(booking.created_at)}</span></div>
                <div class="row"><span class="label">Status:</span><span class="value">${booking.status?.toUpperCase()}</span></div>
                <div class="row"><span class="label">Payment Status:</span><span class="value">${booking.payment_status?.toUpperCase()}</span></div>
            </div>
            
            <div class="section">
                <div class="section-title">Trip Details</div>
                <div class="row"><span class="label">Destination:</span><span class="value">${booking.destinations?.name || "N/A"}</span></div>
                <div class="row"><span class="label">Package:</span><span class="value">${booking.destination_packages?.package_name || "N/A"}</span></div>
                <div class="row"><span class="label">Travel Dates:</span><span class="value">${booking.travel_dates?.map((d) => formatDate(d)).join(" - ") || "N/A"}</span></div>
                <div class="row"><span class="label">Passengers:</span><span class="value">${booking.num_adults} Adult(s)${booking.num_children ? `, ${booking.num_children} Child(ren)` : ""}${booking.infants ? `, ${booking.infants} Infant(s)` : ""}</span></div>
                ${
                  booking.special_requests
                    ? `
                    <div class="row"><span class="label">Special Requests:</span><span class="value">${booking.special_requests}</span></div>
                `
                    : ""
                }
            </div>
            
            <div class="section">
                <div class="section-title">Payment Summary</div>
                <table>
                    <tr>
                        <td>Net Rate:</td>
                        <td>${formatCurrency(booking.net_rate_per_pax)} x ${booking.num_adults}</td>
                        <td>${formatCurrency(booking.net_rate_per_pax * booking.num_adults)}</td>
                    </tr>
                    <tr>
                        <td>Markup:</td>
                        <td></td>
                        <td>${formatCurrency(booking.agency_markup)}</td>
                    </tr>
                    <tr style="font-weight: bold; border-top: 1px solid #059669;">
                        <td>TOTAL:</td>
                        <td></td>
                        <td>${formatCurrency(booking.total_amount)}</td>
                    </tr>
                </table>
            </div>
            
            <div class="footer">
                <p>KASSCO BUILDING, RIZAL AVENUE COR. CAVITE AND LICO STREETS, SANTA CRUZ, MANILA, 1014 METRO MANILA</p>
                <p>Thank you for booking with SNS Travel & Tours!</p>
            </div>
        </body>
        </html>
    `);
  printWindow.document.close();
  printWindow.print();
}

// =====================================================
// SEND BOOKING EMAIL - WITH DUAL EMAIL SOURCES
// =====================================================
export async function sendBookingEmail(bookingId, type, customMessage = "") {
  try {
    if (type === "test") {
      return await sendTestEmail(customMessage);
    }

    if (type === "approve") {
      return await sendApprovalEmail(bookingId);
    } else if (type === "reject") {
      return await sendRejectionEmail(bookingId, customMessage);
    } else if (type === "reply") {
      return await sendReply(bookingId, customMessage);
    }

    return { success: false, error: "Invalid email type" };
  } catch (error) {
    console.error("Email error:", error);
    showToast("❌ Failed to send email: " + error.message, "error");
    return { success: false };
  }
}

// =====================================================
// CREATE: Add new booking - WITH ALL NEW FIELDS
// =====================================================
export async function createBooking(formData) {
  try {
    showLoading(true, "Creating booking...");

    if (!formData.destination_id) {
      showToast("Please select a destination", "error");
      showLoading(false);
      return null;
    }

    if (!formData.package_id) {
      showToast("Please select a package", "error");
      showLoading(false);
      return null;
    }

    if (!formData.travel_dates) {
      showToast("Please enter travel dates", "error");
      showLoading(false);
      return null;
    }

    if (!formData.agent_name) {
      showToast("Please enter customer name", "error");
      showLoading(false);
      return null;
    }

    if (!formData.agent_email) {
      showToast("Please enter customer email", "error");
      showLoading(false);
      return null;
    }

    const numAdults = parseInt(formData.num_adults);
    if (numAdults < 1) {
      showToast("Number of adults must be at least 1", "error");
      showLoading(false);
      return null;
    }

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    const bookingRef = `SNS-${year}${month}${day}-${random}`;

    let netRatePerPax = 0;
    let childRate = 0;

    if (formData.hotel_category_id) {
      const { data: rateData } = await supabase
        .from("package_hotel_rates")
        .select("rate_2pax, rate_solo, rate_child_no_breakfast")
        .eq("package_id", formData.package_id)
        .eq("hotel_category_id", formData.hotel_category_id)
        .maybeSingle();

      if (rateData) {
        netRatePerPax =
          numAdults === 1 ? rateData.rate_solo || 0 : rateData.rate_2pax || 0;
        childRate = rateData.rate_child_no_breakfast || 0;
      }
    }

    let markupAmount = 0;

    const numChildren = parseInt(formData.num_children || 0);
    const numInfants = parseInt(formData.infants || 0);
    const totalAmount =
      netRatePerPax * numAdults + markupAmount + childRate * numChildren;

    const travelDates = formData.travel_dates
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d)
      .map((d) => new Date(d).toISOString());

    const childrenAges = formData.children_ages
      ? formData.children_ages
          .split(",")
          .map((a) => parseInt(a.trim()))
          .filter((a) => !isNaN(a))
      : [];

    const { data, error } = await supabase
      .from("b2b_bookings")
      .insert([
        {
          booking_reference: bookingRef,
          agent_name: formData.agent_name,
          agent_email: formData.agent_email,
          agent_mobile: formData.agent_mobile,
          nationality: formData.nationality || "Filipino",
          destination_id: parseInt(formData.destination_id),
          package_id: parseInt(formData.package_id),
          hotel_category_id: formData.hotel_category_id
            ? parseInt(formData.hotel_category_id)
            : null,
          travel_dates: travelDates,
          is_flexible:
            formData.is_flexible === true || formData.is_flexible === "true",
          num_adults: numAdults,
          num_children: numChildren,
          infants: numInfants,
          children_ages: childrenAges,
          room_preference: formData.room_preference || "No Preference",
          net_rate_per_pax: netRatePerPax,
          agency_markup: markupAmount,
          total_amount: totalAmount,
          with_airfare:
            formData.with_airfare === true || formData.with_airfare === "true",
          with_insurance:
            formData.with_insurance === true ||
            formData.with_insurance === "true",
          with_transfers:
            formData.with_transfers === true ||
            formData.with_transfers === "true",
          special_requests: formData.special_requests || null,
          status: "pending",
          payment_status: "unpaid",
          created_at: new Date(),
          updated_at: new Date(),
        },
      ])
      .select();

    if (error) throw error;

    await fetchBookings();
    showToast(`✅ Booking created! Reference: ${bookingRef}`, "success");
    showLoading(false);

    setTimeout(() => viewBookingConfirmation(data[0].id), 500);
    await refreshCurrentPage();

    return data[0];
  } catch (error) {
    console.error("Error creating booking:", error);
    showToast("❌ Failed to create booking: " + error.message, "error");
    showLoading(false);
    return null;
  }
}

// =====================================================
// CREATE BOOKING MODAL - FULL SCREEN RESPONSIVE VERSION
// =====================================================
export function openCreateBookingModal() {
  console.log("📝 Opening create booking modal...");

  const existingModal = document.getElementById("createBookingModal");
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.id = "createBookingModal";
  modal.className =
    "fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto";

  modal.innerHTML = `
        <div class="bg-white w-full min-h-screen sm:min-h-0 sm:rounded-2xl sm:max-w-4xl sm:w-full sm:my-8 shadow-2xl overflow-hidden flex flex-col">
            <div class="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-20">
                <div class="flex items-center gap-2 sm:gap-3">
                    <div class="h-8 w-8 sm:h-10 sm:w-10 bg-white/20 backdrop-blur rounded-lg sm:rounded-xl flex items-center justify-center text-white">
                        <i class="fas fa-calendar-plus text-sm sm:text-base"></i>
                    </div>
                    <div>
                        <h3 class="text-lg sm:text-xl font-bold text-white">New Booking Form</h3>
                        <p class="text-emerald-100 text-xs sm:text-sm">Customer Information & Booking Details</p>
                    </div>
                </div>
                <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl sm:text-3xl">&times;</button>
            </div>
            
            <div class="flex-1 overflow-y-auto p-4 sm:p-6">
                <form id="createBookingForm" class="space-y-4 sm:space-y-6">
                    <!-- Customer Information -->
                    <div class="bg-gray-50 p-3 sm:p-4 rounded-lg">
                        <h4 class="text-sm sm:text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <i class="fas fa-user text-emerald-500 text-sm sm:text-base"></i>
                            Customer Information <span class="text-red-500 text-xs">*Required</span>
                        </h4>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    Full Name <span class="text-red-500">*</span>
                                </label>
                                <input type="text" id="bookingAgentName" required
                                       class="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                       placeholder="John Doe">
                            </div>
                            <div>
                                <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    Email <span class="text-red-500">*</span>
                                </label>
                                <input type="email" id="bookingAgentEmail" required
                                       class="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                       placeholder="customer@email.com">
                            </div>
                            <div>
                                <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    Mobile Number
                                </label>
                                <input type="text" id="bookingAgentMobile" 
                                       class="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                       placeholder="0917 123 4567">
                            </div>
                            <div>
                                <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    Nationality
                                </label>
                                <select id="bookingNationality" class="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                                    <option value="Filipino">Filipino</option>
                                    <option value="Foreign">Foreign</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Destination & Package -->
                    <div class="bg-gray-50 p-3 sm:p-4 rounded-lg">
                        <h4 class="text-sm sm:text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <i class="fas fa-map-pin text-emerald-500 text-sm sm:text-base"></i>
                            Destination & Package
                        </h4>
                        <div class="space-y-3 sm:space-y-4">
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                        Destination <span class="text-red-500">*</span>
                                    </label>
                                    <select id="bookingDestinationId" class="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required>
                                        <option value="">Select Destination</option>
                                        ${
                                          state.destinations
                                            ?.filter((d) => d.is_active)
                                            .map(
                                              (dest) =>
                                                `<option value="${dest.id}" data-airport="${dest.airport_code || ""}" data-airport-name="${dest.airport_name || ""}">${dest.name}${dest.country ? `, ${dest.country}` : ""}</option>`,
                                            )
                                            .join("") || ""
                                        }
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                        Airport of Origin
                                    </label>
                                    <input type="text" id="bookingAirportOrigin" readonly class="w-full px-3 sm:px-4 py-2 text-sm bg-gray-100 border border-gray-300 rounded-lg">
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                        Tour Package <span class="text-red-500">*</span>
                                    </label>
                                    <select id="bookingPackageId" class="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required>
                                        <option value="">Select Destination First</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                        Hotel Category
                                    </label>
                                    <select id="bookingHotelCategoryId" class="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                                        <option value="">No Hotel / Walk-in Rate</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Travel Details -->
                    <div class="bg-gray-50 p-3 sm:p-4 rounded-lg">
                        <h4 class="text-sm sm:text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <i class="fas fa-calendar-alt text-emerald-500 text-sm sm:text-base"></i>
                            Travel Details
                        </h4>
                        <div class="space-y-3 sm:space-y-4">
                            <div>
                                <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    Travel Dates <span class="text-red-500">*</span>
                                </label>
                                <input type="text" id="bookingTravelDates" placeholder="YYYY-MM-DD, YYYY-MM-DD" class="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required>
                                <p class="text-xs text-gray-500 mt-1">Separate multiple dates with commas</p>
                            </div>
                            
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                                <label class="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                    <input type="checkbox" id="bookingFlexible" class="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 rounded">
                                    <span>Flexible</span>
                                </label>
                                <label class="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                    <input type="checkbox" id="bookingWithAirfare" class="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 rounded">
                                    <span>Airfare</span>
                                </label>
                                <label class="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                    <input type="checkbox" id="bookingWithInsurance" class="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 rounded">
                                    <span>Insurance</span>
                                </label>
                                <label class="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                    <input type="checkbox" id="bookingWithTransfers" class="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 rounded">
                                    <span>Transfers</span>
                                </label>
                            </div>
                            
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                <div>
                                    <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                        Adults <span class="text-red-500">*</span>
                                    </label>
                                    <input type="number" id="bookingAdults" min="1" value="2" class="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required>
                                </div>
                                <div>
                                    <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                        Children (2-11)
                                    </label>
                                    <input type="number" id="bookingChildren" min="0" value="0" class="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                                </div>
                                <div>
                                    <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                        Infants (0-2)
                                    </label>
                                    <input type="number" id="bookingInfants" min="0" value="0" class="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    Children Ages (if any)
                                </label>
                                <input type="text" id="bookingChildrenAges" placeholder="e.g., 4, 6, 8" class="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                            </div>
                            
                            <div>
                                <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    Room Preference
                                </label>
                                <select id="bookingRoomPreference" class="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                                    <option value="No Preference">No Preference</option>
                                    <option value="Twin">Twin (2 beds)</option>
                                    <option value="Double">Double (1 bed)</option>
                                    <option value="Triple">Triple (3 beds)</option>
                                    <option value="Quad">Quad (4 beds)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Price Preview -->
                    <div class="bg-emerald-50 p-3 sm:p-4 rounded-lg" id="pricePreviewSection" style="display: none;">
                        <h4 class="text-sm sm:text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <i class="fas fa-tag text-emerald-500 text-sm sm:text-base"></i>
                            Price Preview
                        </h4>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <p class="text-xs text-gray-500">Net Rate/Pax</p>
                                <p class="text-base sm:text-lg font-bold text-gray-800" id="previewNetRate">₱0</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500">Markup</p>
                                <p class="text-base sm:text-lg font-bold text-gray-800" id="previewMarkup">₱0</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500">Total</p>
                                <p class="text-base sm:text-lg font-bold text-emerald-700" id="previewTotal">₱0</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Special Requests -->
                    <div>
                        <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                        <textarea id="bookingSpecialRequests" rows="2" class="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="Any special requirements..."></textarea>
                    </div>
                    
                    <!-- Actions -->
                    <div class="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
                        <button type="button" onclick="this.closest('.fixed').remove()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm order-2 sm:order-1">
                            Cancel
                        </button>
                        <button type="submit" class="px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-600 transition shadow-lg text-sm order-1 sm:order-2">
                            <i class="fas fa-check-circle mr-2"></i> Create Booking
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
  document.body.appendChild(modal);

  const destSelect = document.getElementById("bookingDestinationId");
  const airportInput = document.getElementById("bookingAirportOrigin");
  const packageSelect = document.getElementById("bookingPackageId");
  const hotelSelect = document.getElementById("bookingHotelCategoryId");

  destSelect.addEventListener("change", async () => {
    const opt = destSelect.options[destSelect.selectedIndex];
    airportInput.value = opt.dataset.airport
      ? `${opt.dataset.airport} - ${opt.dataset.airportName}`
      : "No airport information";

    const destId = destSelect.value;
    if (destId) {
      const packages = await getPackagesByDestination(destId);
      packageSelect.innerHTML = '<option value="">Select Package</option>';
      packages.forEach((p) => {
        packageSelect.innerHTML += `<option value="${p.id}">${p.package_code || ""} - ${p.package_name} (${p.duration_days}D/${p.duration_nights}N)</option>`;
      });
    } else {
      packageSelect.innerHTML =
        '<option value="">Select Destination First</option>';
    }
    hotelSelect.innerHTML = '<option value="">No Hotel / Walk-in Rate</option>';
  });

  packageSelect.addEventListener("change", async () => {
    const pkgId = packageSelect.value;
    if (pkgId) {
      const hotels = await getHotelCategoriesWithRates(pkgId);
      hotelSelect.innerHTML =
        '<option value="">No Hotel / Walk-in Rate</option>';
      hotels.forEach((h) => {
        const rate = h.package_hotel_rates?.[0];
        if (rate) {
          hotelSelect.innerHTML += `<option value="${h.id}" data-rate-solo="${rate.rate_solo}" data-rate-2pax="${rate.rate_2pax}" data-rate-child="${rate.rate_child_no_breakfast}">${h.category_name}</option>`;
        }
      });
    }
    updatePricePreview();
  });

  let previewTimeout;
  async function updatePricePreview() {
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(async () => {
      const pkgId = document.getElementById("bookingPackageId").value;
      const hotelId = document.getElementById("bookingHotelCategoryId").value;
      const adults =
        parseInt(document.getElementById("bookingAdults").value) || 0;
      const children =
        parseInt(document.getElementById("bookingChildren").value) || 0;

      if (!pkgId || !hotelId || adults === 0) {
        document.getElementById("pricePreviewSection").style.display = "none";
        return;
      }

      const { data: rateData } = await supabase
        .from("package_hotel_rates")
        .select("rate_solo, rate_2pax, rate_child_no_breakfast")
        .eq("package_id", pkgId)
        .eq("hotel_category_id", hotelId)
        .maybeSingle();

      if (rateData) {
        const net =
          adults === 1 ? rateData.rate_solo || 0 : rateData.rate_2pax || 0;
        const childRate = rateData.rate_child_no_breakfast || 0;

        const markupAmt = 0;
        const total = net * adults + childRate * children;

        document.getElementById("previewNetRate").textContent =
          formatCurrency(net);
        document.getElementById("previewMarkup").textContent =
          formatCurrency(markupAmt);
        document.getElementById("previewTotal").textContent =
          formatCurrency(total);
        document.getElementById("pricePreviewSection").style.display = "block";
      }
    }, 300);
  }

  document
    .getElementById("bookingAdults")
    .addEventListener("input", updatePricePreview);
  document
    .getElementById("bookingChildren")
    .addEventListener("input", updatePricePreview);
  document
    .getElementById("bookingHotelCategoryId")
    .addEventListener("change", updatePricePreview);

  const form = document.getElementById("createBookingForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i> Creating...';
    submitBtn.disabled = true;

    try {
      const formData = {
        agent_name: document.getElementById("bookingAgentName").value,
        agent_email: document.getElementById("bookingAgentEmail").value,
        agent_mobile: document.getElementById("bookingAgentMobile").value,
        nationality: document.getElementById("bookingNationality").value,
        destination_id: document.getElementById("bookingDestinationId").value,
        package_id: document.getElementById("bookingPackageId").value,
        hotel_category_id: document.getElementById("bookingHotelCategoryId")
          .value,
        travel_dates: document.getElementById("bookingTravelDates").value,
        is_flexible: document.getElementById("bookingFlexible").checked,
        with_airfare: document.getElementById("bookingWithAirfare").checked,
        with_insurance: document.getElementById("bookingWithInsurance").checked,
        with_transfers: document.getElementById("bookingWithTransfers").checked,
        num_adults: document.getElementById("bookingAdults").value,
        num_children: document.getElementById("bookingChildren").value,
        infants: document.getElementById("bookingInfants").value,
        children_ages: document.getElementById("bookingChildrenAges").value,
        room_preference: document.getElementById("bookingRoomPreference").value,
        special_requests: document.getElementById("bookingSpecialRequests")
          .value,
        agency_markup: 0,
      };

      const result = await createBooking(formData);
      if (result) modal.remove();
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

// =====================================================
// VIEW BOOKING DETAILS - FULL SCREEN VERSION (NO AGENCY)
// =====================================================
export async function viewBookingDetails(id) {
  const booking = await fetchBookingById(id);
  if (!booking) return;

  const { count: emailCount } = await supabase
    .from("booking_emails")
    .select("*", { count: "exact", head: true })
    .eq("booking_id", id);

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto";

  const customerName = booking.agent_name || "N/A";
  const customerEmail = booking.agent_email || "N/A";

  modal.innerHTML = `
        <div class="bg-white w-full sm:rounded-2xl sm:max-w-6xl sm:w-full sm:my-8 shadow-2xl overflow-hidden flex flex-col" style="max-height: 100vh; height: auto;">
            <div class="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-20 flex-shrink-0">
                <div class="flex items-center gap-2 sm:gap-3">
                    <div class="h-8 w-8 sm:h-10 sm:w-10 bg-white/20 backdrop-blur rounded-lg sm:rounded-xl flex items-center justify-center text-white">
                        <i class="fas fa-file-invoice text-sm sm:text-base"></i>
                    </div>
                    <div>
                        <h3 class="text-lg sm:text-xl font-bold text-white">Booking Details</h3>
                        <p class="text-emerald-100 text-xs sm:text-sm">${booking.booking_reference}</p>
                    </div>
                </div>
                <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl sm:text-3xl leading-none">&times;</button>
            </div>
            
            <div class="overflow-y-auto p-4 sm:p-6" style="max-height: calc(100vh - 80px);">
                <div class="space-y-4 sm:space-y-6">
                    <div class="flex items-center justify-between flex-wrap gap-2">
                        <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <span class="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full ${booking.status === "confirmed" ? "bg-green-100 text-green-700" : booking.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}">
                                ${booking.status?.toUpperCase() || "PENDING"}
                            </span>
                            <span class="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full ${booking.payment_status === "paid" ? "bg-green-100 text-green-700" : booking.payment_status === "partial" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
                                PAYMENT: ${booking.payment_status?.toUpperCase() || "UNPAID"}
                            </span>
                            ${
                              emailCount > 0
                                ? `
                                <span class="px-2 sm:px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs sm:text-sm flex items-center gap-1">
                                    <i class="fas fa-envelope"></i> ${emailCount} email${emailCount > 1 ? "s" : ""}
                                </span>
                            `
                                : ""
                            }
                        </div>
                        <span class="text-xs sm:text-sm text-gray-500">Booked: ${formatDate(booking.created_at)}</span>
                    </div>
                    
                    <div class="bg-gray-50 p-4 sm:p-5 rounded-lg">
                        <h4 class="font-semibold mb-3 flex items-center gap-2 text-base sm:text-lg">
                            <i class="fas fa-user text-emerald-500"></i> Customer Information
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p><span class="text-xs text-gray-500">Name:</span> <span class="text-sm font-medium">${customerName}</span></p>
                                <p><span class="text-xs text-gray-500">Email:</span> <span class="text-sm">${customerEmail}</span></p>
                            </div>
                            <div>
                                <p><span class="text-xs text-gray-500">Mobile:</span> <span class="text-sm">${booking.agent_mobile || "N/A"}</span></p>
                                <p><span class="text-xs text-gray-500">Nationality:</span> <span class="text-sm">${booking.nationality || "Filipino"}</span></p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 p-4 sm:p-5 rounded-lg">
                        <h4 class="font-semibold mb-3 flex items-center gap-2 text-base sm:text-lg">
                            <i class="fas fa-plane text-emerald-500"></i> Trip Information
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div class="space-y-2">
                                <p><span class="text-xs text-gray-500">Destination:</span> <span class="text-sm font-medium">${booking.destinations?.name || "N/A"}</span></p>
                                <p><span class="text-xs text-gray-500">Package:</span> <span class="text-sm">${booking.destination_packages?.package_name || "N/A"}</span></p>
                                <p><span class="text-xs text-gray-500">Hotel Category:</span> <span class="text-sm">${booking.hotel_categories?.category_name || "N/A"}</span></p>
                                <p><span class="text-xs text-gray-500">Duration:</span> <span class="text-sm">${booking.destination_packages?.duration_days || "?"}D/${booking.destination_packages?.duration_nights || "?"}N</span></p>
                            </div>
                            <div class="space-y-2">
                                <p><span class="text-xs text-gray-500">Travel Dates:</span> <span class="text-sm">${booking.travel_dates?.map((d) => formatDate(d)).join(" - ") || "N/A"}</span></p>
                                <p><span class="text-xs text-gray-500">Room Preference:</span> <span class="text-sm">${booking.room_preference || "No Preference"}</span></p>
                                <p><span class="text-xs text-gray-500">Passengers:</span> <span class="text-sm">${booking.num_adults} Adults, ${booking.num_children || 0} Children, ${booking.infants || 0} Infants</span></p>
                                <p><span class="text-xs text-gray-500">Total Pax:</span> <span class="text-sm">${(booking.num_adults || 0) + (booking.num_children || 0) + (booking.infants || 0)}</span></p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-emerald-50 p-4 sm:p-5 rounded-lg">
                        <h4 class="font-semibold mb-3 flex items-center gap-2 text-base sm:text-lg">
                            <i class="fas fa-tag text-emerald-500"></i> Payment Summary
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <p class="text-xs text-gray-500">Net Rate per Pax</p>
                                <p class="text-lg sm:text-xl font-bold text-gray-800">${formatCurrency(booking.net_rate_per_pax || 0)}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500">Markup</p>
                                <p class="text-lg sm:text-xl font-bold text-gray-800">${formatCurrency(booking.agency_markup || 0)}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500">Total Amount</p>
                                <p class="text-lg sm:text-xl font-bold text-emerald-700">${formatCurrency(booking.total_amount || 0)}</p>
                            </div>
                        </div>
                    </div>
                    
                    ${
                      booking.special_requests
                        ? `
                        <div class="bg-gray-50 p-4 sm:p-5 rounded-lg">
                            <h4 class="font-semibold mb-2 flex items-center gap-2 text-base sm:text-lg">
                                <i class="fas fa-comment text-emerald-500"></i> Special Requests
                            </h4>
                            <p class="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">${booking.special_requests}</p>
                        </div>
                    `
                        : ""
                    }
                    
                    ${
                      booking.status === "pending"
                        ? `
                        <div class="bg-blue-50 p-5 rounded-lg border border-blue-200">
                            <h4 class="font-semibold mb-4 flex items-center gap-2">
                                <i class="fas fa-envelope text-blue-500"></i> Booking Approval
                            </h4>
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                                    <textarea id="rejectionReason" rows="2" class="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="Enter reason if rejecting..."></textarea>
                                </div>
                                <div class="flex flex-wrap gap-3">
                                    <button onclick="window.sendApprovalEmail(${booking.id})" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
                                        <i class="fas fa-check-circle mr-2"></i> Approve & Send Email
                                    </button>
                                    <button onclick="window.sendRejectionEmail(${booking.id}, document.getElementById('rejectionReason').value)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                                        <i class="fas fa-times-circle mr-2"></i> Reject & Send Email
                                    </button>
                                </div>
                            </div>
                        </div>
                    `
                        : ""
                    }
                    
                    <div class="flex flex-wrap justify-end gap-3 pt-4 border-t">
                        <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">Close</button>
                        <button onclick="window.viewBookingEmails(${booking.id})" class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition flex items-center gap-2">
                            <i class="fas fa-envelope"></i> Email History ${emailCount > 0 ? `(${emailCount})` : ""}
                        </button>
                        ${
                          booking.status !== "confirmed" &&
                          booking.status !== "cancelled"
                            ? `
                            <button onclick="window.updateBookingStatus(${booking.id}, 'confirmed', false); this.closest('.fixed').remove()" 
                                class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
                                <i class="fas fa-check mr-2"></i> Confirm (No Email)
                            </button>
                        `
                            : ""
                        }
                        ${
                          booking.payment_status !== "paid"
                            ? `
                            <button onclick="window.sendPaymentConfirmation(${booking.id})" 
                                class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                                <i class="fas fa-credit-card mr-2"></i> Mark Paid & Send Confirmation
                            </button>
                        `
                            : ""
                        }
                        ${
                          booking.status !== "cancelled"
                            ? `
                            <button onclick="window.cancelBooking(${booking.id}); this.closest('.fixed').remove()" 
                                class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                                <i class="fas fa-times mr-2"></i> Cancel
                            </button>
                        `
                            : ""
                        }
                        ${
                          booking.status === "cancelled"
                            ? `
                            <button onclick="window.reactivateBooking(${booking.id}); this.closest('.fixed').remove()" 
                                class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition">
                                <i class="fas fa-undo mr-2"></i> Reactivate
                            </button>
                        `
                            : ""
                        }
                    </div>
                </div>
            </div>
        </div>
    `;
  document.body.appendChild(modal);
}

// =====================================================
// EMAIL HISTORY VIEW
// =====================================================
export async function viewBookingEmails(bookingId) {
  try {
    showLoading(true, "Loading email history...");

    const booking = await fetchBookingById(bookingId);

    const { data: emails, error } = await supabase
      .from("booking_emails")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    showLoading(false);

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto";

    const customerName = booking.agent_name || "Customer";
    const customerEmail = booking.agent_email || "No email on file";

    modal.innerHTML = `
            <div class="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl">
                <div class="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 rounded-t-2xl">
                    <div class="flex items-center gap-2 sm:gap-3">
                        <div class="h-8 w-8 sm:h-10 sm:w-10 bg-white/20 backdrop-blur rounded-lg sm:rounded-xl flex items-center justify-center text-white">
                            <i class="fas fa-envelope text-sm sm:text-base"></i>
                        </div>
                        <div>
                            <h3 class="text-base sm:text-xl font-bold text-white">Email History</h3>
                            <p class="text-emerald-100 text-xs sm:text-sm">Booking: ${booking?.booking_reference || bookingId}</p>
                        </div>
                    </div>
                    <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-2xl sm:text-3xl">&times;</button>
                </div>
                
                <div class="p-4 sm:p-6">
                    <div class="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                            <div>
                                <p class="text-xs text-gray-500">Customer</p>
                                <p class="font-semibold text-sm sm:text-base">${customerName}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500">Email</p>
                                <p class="font-semibold text-sm sm:text-base">${customerEmail}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500">Contact</p>
                                <p class="font-semibold text-sm sm:text-base">${booking.agent_mobile || "N/A"}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto p-2">
                        ${
                          emails.length === 0
                            ? `
                            <div class="text-center py-8 sm:py-12 text-gray-500">
                                <i class="fas fa-inbox text-4xl sm:text-5xl mb-3 sm:mb-4 opacity-30"></i>
                                <p class="text-base sm:text-lg font-medium">No emails yet</p>
                                <p class="text-xs sm:text-sm">Email history will appear here once you send messages</p>
                            </div>
                        `
                            : emails
                                .map((email) => {
                                  const isIncoming =
                                    email.email_type === "incoming";
                                  return `
                            <div class="border rounded-lg p-3 sm:p-4 ${isIncoming ? "bg-blue-50 border-blue-200 ml-4 sm:ml-8" : "bg-gray-50 border-gray-200 mr-4 sm:mr-8"} relative">
                                <div class="absolute top-3 sm:top-4 ${isIncoming ? "-left-2 sm:-left-3" : "-right-2 sm:-right-3"}">
                                    <div class="h-6 w-6 sm:h-8 sm:w-8 rounded-full ${isIncoming ? "bg-blue-500" : "bg-emerald-500"} flex items-center justify-center text-white text-xs sm:text-sm">
                                        <i class="fas ${isIncoming ? "fa-user" : "fa-user-tie"}"></i>
                                    </div>
                                </div>
                                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2 sm:mb-3">
                                    <div class="text-xs sm:text-sm">
                                        <span class="font-medium">${email.from_email}</span>
                                        <span class="text-gray-500 mx-1 sm:mx-2">→</span>
                                        <span class="font-medium">${email.to_email}</span>
                                    </div>
                                    <span class="text-xs text-gray-500">${new Date(email.created_at).toLocaleString()}</span>
                                </div>
                                <p class="text-xs sm:text-sm font-semibold mb-1 sm:mb-2">${email.subject}</p>
                                <div class="text-xs sm:text-sm text-gray-700 bg-white p-2 sm:p-3 rounded border max-h-24 sm:max-h-40 overflow-y-auto">
                                    ${email.body || "No content"}
                                </div>
                                <div class="mt-2 text-xs text-gray-400 flex items-center justify-between">
                                    <span class="inline-flex items-center gap-1">
                                        <i class="fas fa-check-circle text-${email.status === "sent" ? "green" : "yellow"}-500"></i>
                                        ${email.status}
                                    </span>
                                    <span>${email.email_type}</span>
                                    ${
                                      email.status === "failed"
                                        ? `
                                        <button onclick="window.resendEmail(${email.id})" class="text-blue-500 hover:text-blue-700 text-xs">
                                            <i class="fas fa-redo-alt mr-1"></i> Resend
                                        </button>
                                    `
                                        : ""
                                    }
                                </div>
                            </div>
                        `;
                                })
                                .join("")
                        }
                    </div>
                    
                    <div class="mt-4 sm:mt-6 pt-4 border-t">
                        <h4 class="font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                            <i class="fas fa-reply text-emerald-500"></i>
                            Send Reply to ${customerName}
                        </h4>
                        <textarea id="replyMessage" rows="3" class="w-full px-3 sm:px-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="Type your reply..."></textarea>
                        
                        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mt-3">
                            <div class="text-xs text-gray-500">
                                <i class="fas fa-info-circle mr-1"></i>
                                Reply to: <strong class="text-xs sm:text-sm">${customerEmail}</strong>
                            </div>
                            <div class="flex gap-2 w-full sm:w-auto">
                                <button onclick="document.getElementById('replyMessage').value = ''" class="flex-1 sm:flex-none px-3 sm:px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm">
                                    Clear
                                </button>
                                <button onclick="window.sendReply(${bookingId}, document.getElementById('replyMessage').value)" class="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition flex items-center justify-center gap-2 text-sm">
                                    <i class="fas fa-paper-plane"></i>
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error("Error fetching emails:", error);
    showToast("Failed to load email history", "error");
    showLoading(false);
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export async function getPackagesByDestination(destinationId) {
  try {
    const { data, error } = await supabase
      .from("destination_packages")
      .select("*")
      .eq("destination_id", destinationId)
      .eq("is_active", true);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching packages:", error);
    return [];
  }
}

export async function getHotelCategoriesWithRates(packageId) {
  try {
    const { data, error } = await supabase
      .from("hotel_categories")
      .select(
        `
                *,
                package_hotel_rates (
                    id, rate_solo, rate_2pax, rate_3pax, rate_4pax, rate_5pax, rate_child_no_breakfast
                )
            `,
      )
      .eq("package_hotel_rates.package_id", packageId)
      .order("display_order");
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching hotel categories:", error);
    return [];
  }
}

// =====================================================
// REFRESH CURRENT PAGE FUNCTION
// =====================================================
async function refreshCurrentPage() {
  console.log("🔄 Refreshing current page...");

  await fetchBookings();

  try {
    await fetchDashboardStats();
  } catch (e) {
    console.log("Dashboard stats not available");
  }

  const mainContent = document.getElementById("mainContent");
  if (mainContent) {
    const currentPage = window.location.hash || "#dashboard";

    if (currentPage.includes("bookings")) {
      const bookingsHtml = await renderBookings();
      mainContent.innerHTML = bookingsHtml;
      console.log("✅ Bookings page refreshed");
    } else if (currentPage.includes("dashboard")) {
      try {
        const { renderDashboard } = await import("./dashboard.js");
        mainContent.innerHTML = await renderDashboard();
        console.log("✅ Dashboard page refreshed");
      } catch (e) {
        console.log("Could not refresh dashboard");
      }
    }
  } else {
    console.log("⚠️ mainContent not found");
  }
}

window.refreshCurrentPage = refreshCurrentPage;

// =====================================================
// TAB FILTERING
// =====================================================
window.filterBookings = (status) => {
  document.querySelectorAll(".booking-row").forEach((row) => {
    row.style.display =
      status === "all" || row.dataset.status === status ? "" : "none";
  });
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove(
      "active",
      "text-emerald-600",
      "border-b-2",
      "border-emerald-600",
    );
    btn.classList.add("text-gray-500");
    if (btn.dataset.filter === status) {
      btn.classList.add(
        "active",
        "text-emerald-600",
        "border-b-2",
        "border-emerald-600",
      );
      btn.classList.remove("text-gray-500");
    }
  });
};

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("tab-btn")) {
    const filter = e.target.dataset.filter;
    window.filterBookings(filter);
  }
});

// =====================================================
// RENDER BOOKINGS PAGE
// =====================================================
export async function renderBookings() {
  await fetchBookings();

  if (!state.destinations || state.destinations.length === 0) {
    try {
      const { fetchDestinations } = await import("./destinations.js");
      await fetchDestinations();
    } catch (e) {
      console.log("Could not fetch destinations");
    }
  }

  const pendingBookings = state.bookings.filter((b) => b.status === "pending");
  const confirmedBookings = state.bookings.filter(
    (b) => b.status === "confirmed",
  );
  const cancelledBookings = state.bookings.filter(
    (b) => b.status === "cancelled",
  );
  const totalBookings = state.bookings.length;
  const confirmedCount = confirmedBookings.length;
  const pendingCount = pendingBookings.length;
  const cancelledCount = cancelledBookings.length;
  const paidCount = state.bookings.filter(
    (b) => b.payment_status === "paid",
  ).length;
  const totalRevenue = state.bookings
    .filter((b) => b.status === "confirmed" && b.payment_status === "paid")
    .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

  return `
        <div class="space-y-4 sm:space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Bookings</h1>
                    <p class="text-xs sm:text-sm text-gray-500 mt-1">Manage customer bookings with email tracking</p>
                </div>
                <button onclick="window.openCreateBookingModal()" class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-sm sm:text-base">
                    <i class="fas fa-plus-circle mr-2"></i> New Booking
                </button>
            </div>
            
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                <div class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-xs text-gray-500">Total</p>
                    <p class="text-lg sm:text-2xl font-bold text-gray-800">${totalBookings}</p>
                </div>
                <div class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-xs text-gray-500">Confirmed</p>
                    <p class="text-lg sm:text-2xl font-bold text-green-600">${confirmedCount}</p>
                </div>
                <div class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-xs text-gray-500">Pending</p>
                    <p class="text-lg sm:text-2xl font-bold text-yellow-600">${pendingCount}</p>
                </div>
                <div class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-xs text-gray-500">Cancelled</p>
                    <p class="text-lg sm:text-2xl font-bold text-red-600">${cancelledCount}</p>
                </div>
                <div class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-xs text-gray-500">Paid</p>
                    <p class="text-lg sm:text-2xl font-bold text-blue-600">${paidCount}</p>
                </div>
                <div class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-xs text-gray-500">Revenue</p>
                    <p class="text-lg sm:text-2xl font-bold text-emerald-600">${formatCurrency(totalRevenue)}</p>
                </div>
            </div>
            
            <div class="border-b border-gray-200 overflow-x-auto">
                <nav class="flex gap-2 sm:gap-4 min-w-max sm:min-w-0" id="bookingTabs">
                    <button class="tab-btn active px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-emerald-600 border-b-2 border-emerald-600" data-filter="all">All</button>
                    <button class="tab-btn px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700" data-filter="pending">Pending <span class="ml-1 px-1.5 sm:px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">${pendingCount}</span></button>
                    <button class="tab-btn px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700" data-filter="confirmed">Confirmed</button>
                    <button class="tab-btn px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700" data-filter="cancelled">Cancelled</button>
                </nav>
            </div>
            
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full min-w-[800px] sm:min-w-0" id="bookingsTable">
                        <thead class="bg-gray-50 text-left text-xs text-gray-500">
                            <tr>
                                <th class="px-3 sm:px-6 py-3">Booking Ref</th>
                                <th class="px-3 sm:px-6 py-3">Customer</th>
                                <th class="px-3 sm:px-6 py-3">Destination</th>
                                <th class="px-3 sm:px-6 py-3">Package</th>
                                <th class="px-3 sm:px-6 py-3">Travel Dates</th>
                                <th class="px-3 sm:px-6 py-3">Pax</th>
                                <th class="px-3 sm:px-6 py-3">Total</th>
                                <th class="px-3 sm:px-6 py-3">Status</th>
                                <th class="px-3 sm:px-6 py-3">Payment</th>
                                <th class="px-3 sm:px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100" id="bookingsTableBody">
                            ${state.bookings
                              .map((booking) => {
                                const travelDates =
                                  booking.travel_dates
                                    ?.map((d) => formatDate(d))
                                    .join(" - ") || "N/A";
                                const pax =
                                  booking.num_adults +
                                  (booking.num_children || 0) +
                                  (booking.infants || 0);
                                const customerName =
                                  booking.agent_name || "Walk-in";
                                return `
                                    <tr class="hover:bg-gray-50 transition booking-row text-sm" data-status="${booking.status || "pending"}">
                                        <td class="px-3 sm:px-6 py-3 sm:py-4 font-mono">${booking.booking_reference}</td>
                                        <td class="px-3 sm:px-6 py-3 sm:py-4">${customerName}</td>
                                        <td class="px-3 sm:px-6 py-3 sm:py-4">${booking.destinations?.name || "N/A"}</td>
                                        <td class="px-3 sm:px-6 py-3 sm:py-4">${booking.destination_packages?.package_name || "N/A"}</td>
                                        <td class="px-3 sm:px-6 py-3 sm:py-4">${travelDates}</td>
                                        <td class="px-3 sm:px-6 py-3 sm:py-4">${pax}</td>
                                        <td class="px-3 sm:px-6 py-3 sm:py-4 font-medium">${formatCurrency(booking.total_amount)}</td>
                                        <td class="px-3 sm:px-6 py-3 sm:py-4">
                                            <span class="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs rounded-full ${booking.status === "confirmed" ? "bg-green-100 text-green-700" : booking.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}">
                                                ${booking.status || "pending"}
                                            </span>
                                        </td>
                                        <td class="px-3 sm:px-6 py-3 sm:py-4">
                                            <span class="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs rounded-full ${booking.payment_status === "paid" ? "bg-green-100 text-green-700" : booking.payment_status === "partial" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
                                                ${booking.payment_status || "unpaid"}
                                            </span>
                                        </td>
                                        <td class="px-3 sm:px-6 py-3 sm:py-4">
                                            <div class="flex items-center gap-1 sm:gap-2">
                                                <button onclick="window.viewBookingDetails(${booking.id})" 
                                                    class="text-blue-600 hover:text-blue-700 p-1 rounded-lg hover:bg-blue-50 transition" 
                                                    title="View Details">
                                                    <i class="fas fa-eye text-sm"></i>
                                                </button>
                                                <button onclick="window.viewBookingEmails(${booking.id})" 
                                                    class="text-purple-600 hover:text-purple-700 p-1 rounded-lg hover:bg-purple-50 transition" 
                                                    title="Email History">
                                                    <i class="fas fa-envelope text-sm"></i>
                                                </button>
                                                <button onclick="window.printBookingConfirmation(${booking.id})" 
                                                    class="text-emerald-600 hover:text-emerald-700 p-1 rounded-lg hover:bg-emerald-50 transition" 
                                                    title="Print Confirmation">
                                                    <i class="fas fa-print text-sm"></i>
                                                </button>
                                                ${
                                                  booking.status !== "cancelled"
                                                    ? `
                                                    <button onclick="window.cancelBooking(${booking.id})" 
                                                        class="text-red-600 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition" 
                                                        title="Cancel Booking">
                                                        <i class="fas fa-times text-sm"></i>
                                                    </button>
                                                `
                                                    : ""
                                                }
                                                ${
                                                  booking.status === "cancelled"
                                                    ? `
                                                    <button onclick="window.reactivateBooking(${booking.id})" 
                                                        class="text-yellow-600 hover:text-yellow-700 p-1 rounded-lg hover:bg-yellow-50 transition" 
                                                        title="Reactivate Booking">
                                                        <i class="fas fa-undo text-sm"></i>
                                                    </button>
                                                `
                                                    : ""
                                                }
                                            </div>
                                        </td>
                                    </tr>
                                `;
                              })
                              .join("")}
                            ${
                              state.bookings.length === 0
                                ? `
                                <tr>
                                    <td colspan="10" class="px-3 sm:px-6 py-8 sm:py-12 text-center text-gray-500">
                                        <i class="fas fa-calendar-times text-3xl sm:text-4xl mb-2 sm:mb-3 opacity-50"></i>
                                        <p class="text-sm sm:text-base font-medium">No bookings yet</p>
                                        <p class="text-xs sm:text-sm mt-1">Click "New Booking" to create your first booking</p>
                                    </td>
                                </tr>
                            `
                                : ""
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// =====================================================
// WINDOW ASSIGNMENTS - FOR HTML ONCLICK EVENTS
// =====================================================
window.openCreateBookingModal = openCreateBookingModal;
window.viewBookingDetails = viewBookingDetails;
window.viewBookingEmails = viewBookingEmails;
window.cancelBooking = cancelBooking;
window.reactivateBooking = reactivateBooking;
window.sendApprovalEmail = sendApprovalEmail;
window.sendRejectionEmail = sendRejectionEmail;
window.sendPaymentConfirmation = sendPaymentConfirmation;
window.sendReply = sendReply;
window.sendTestEmail = sendTestEmail;
window.updateBookingStatus = updateBookingStatus;
window.updatePaymentStatus = updatePaymentStatus;
window.printBookingConfirmation = printBookingConfirmation;
window.getPackagesByDestination = getPackagesByDestination;
window.getHotelCategoriesWithRates = getHotelCategoriesWithRates;
window.refreshCurrentPage = refreshCurrentPage;
window.filterBookings = filterBookings;
window.renderBookings = renderBookings;
