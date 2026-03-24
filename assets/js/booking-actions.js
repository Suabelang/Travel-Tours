// assets/js/modules/bookings/booking-actions.js
// Booking Actions Handler - Enhanced version

console.log("📦 Booking Actions module loaded - Enhanced");

// Send Approval Email
window.handleApproveBooking = async function (bookingId) {
  console.log(`🎯 Approve booking button clicked for ID: ${bookingId}`);

  try {
    const confirmed = confirm(
      "✅ Approve this booking?\n\nThis will send an approval email to the customer with all booking details.",
    );
    if (!confirmed) return;

    if (typeof showLoading !== "undefined")
      showLoading(true, "Sending approval email...");

    const result = await window.sendApprovalEmail(bookingId);

    if (typeof showLoading !== "undefined") showLoading(false);

    if (result && result.success) {
      if (typeof showToast !== "undefined") {
        showToast(`✅ Booking approved and email sent!`, "success");
      }

      // Refresh data
      if (typeof window.fetchBookings !== "undefined") {
        await window.fetchBookings();
      }
      if (typeof window.renderBookingsTable !== "undefined") {
        window.renderBookingsTable();
      }

      // Close modals
      const modal = document.querySelector("#bookingModal, .fixed");
      if (modal) modal.remove();

      // Reopen with updated status
      setTimeout(() => {
        if (typeof window.viewBookingDetails !== "undefined") {
          window.viewBookingDetails(bookingId);
        }
      }, 500);
    } else {
      if (typeof showToast !== "undefined") {
        showToast(`❌ Failed: ${result?.error || "Unknown error"}`, "error");
      }
    }
  } catch (error) {
    console.error("Error approving booking:", error);
    if (typeof showToast !== "undefined")
      showToast("❌ Failed to approve booking", "error");
    if (typeof showLoading !== "undefined") showLoading(false);
  }
};

// Send Rejection Email
window.handleRejectBooking = async function (bookingId) {
  console.log(`🎯 Reject booking button clicked for ID: ${bookingId}`);

  const reason = prompt("❌ Please enter a reason for rejection:");
  if (!reason) return;

  try {
    const confirmed = confirm(
      `⚠️ Reject this booking?\n\nReason: ${reason}\n\nThis will send a rejection email to the customer.`,
    );
    if (!confirmed) return;

    if (typeof showLoading !== "undefined")
      showLoading(true, "Sending rejection email...");

    const result = await window.sendRejectionEmail(bookingId, reason);

    if (typeof showLoading !== "undefined") showLoading(false);

    if (result && result.success) {
      if (typeof showToast !== "undefined") {
        showToast(`✅ Booking rejected and email sent!`, "success");
      }

      await window.fetchBookings();
      if (typeof window.renderBookingsTable !== "undefined")
        window.renderBookingsTable();

      const modal = document.querySelector("#bookingModal, .fixed");
      if (modal) modal.remove();
    } else {
      if (typeof showToast !== "undefined") {
        showToast(`❌ Failed: ${result?.error || "Unknown error"}`, "error");
      }
    }
  } catch (error) {
    console.error("Error rejecting booking:", error);
    if (typeof showToast !== "undefined")
      showToast("❌ Failed to reject booking", "error");
    if (typeof showLoading !== "undefined") showLoading(false);
  }
};

// Send Payment Confirmation
window.handlePaymentConfirmation = async function (bookingId) {
  console.log(`💰 Mark paid button clicked for ID: ${bookingId}`);

  try {
    const booking = await window.fetchBookingById(bookingId);
    const amount = Number(booking.total_amount || 0).toLocaleString();

    const confirmed = confirm(
      `💰 Confirm payment for this booking?\n\nBooking: ${booking.booking_reference}\nAmount: ₱${amount}\n\nThis will send a payment confirmation email.`,
    );
    if (!confirmed) return;

    if (typeof showLoading !== "undefined")
      showLoading(true, "Sending payment confirmation...");

    const result = await window.sendPaymentConfirmation(bookingId);

    if (typeof showLoading !== "undefined") showLoading(false);

    if (result && result.success) {
      if (typeof showToast !== "undefined") {
        showToast(`✅ Payment confirmed and receipt sent!`, "success");
      }

      await window.fetchBookings();
      if (typeof window.renderBookingsTable !== "undefined")
        window.renderBookingsTable();

      const modal = document.querySelector("#bookingModal, .fixed");
      if (modal) modal.remove();

      setTimeout(() => {
        if (typeof window.viewBookingDetails !== "undefined") {
          window.viewBookingDetails(bookingId);
        }
      }, 500);
    } else {
      if (typeof showToast !== "undefined") {
        showToast(`❌ Failed: ${result?.error || "Unknown error"}`, "error");
      }
    }
  } catch (error) {
    console.error("Error processing payment:", error);
    if (typeof showToast !== "undefined")
      showToast("❌ Failed to process payment", "error");
    if (typeof showLoading !== "undefined") showLoading(false);
  }
};

// Set booking status to pending
window.handleSetPending = async function (bookingId) {
  console.log(`🔄 Set pending button clicked for booking ID: ${bookingId}`);

  if (
    !confirm(
      "🔄 Set this booking to pending?\n\nThis will change the status to pending without sending an email.",
    )
  ) {
    console.log("User cancelled");
    return;
  }

  try {
    if (typeof showLoading !== "undefined")
      showLoading(true, "Updating booking status...");

    const result = await window.updateBookingStatus(bookingId, "pending");

    if (typeof showLoading !== "undefined") showLoading(false);

    if (result) {
      if (typeof showToast !== "undefined") {
        showToast(`✅ Booking status set to pending!`, "success");
      }

      // Refresh data
      if (typeof window.fetchBookings !== "undefined") {
        await window.fetchBookings();
      }
      if (typeof window.renderBookingsTable !== "undefined") {
        window.renderBookingsTable();
      }

      // Close modal if open
      const modal = document.querySelector("#bookingModal, .fixed");
      if (modal) modal.remove();

      // Reopen with updated status
      setTimeout(() => {
        if (typeof window.viewBookingDetails !== "undefined") {
          window.viewBookingDetails(bookingId);
        }
      }, 500);
    } else {
      if (typeof showToast !== "undefined") {
        showToast(`❌ Failed to update status`, "error");
      }
    }
  } catch (error) {
    console.error("Error setting booking to pending:", error);
    if (typeof showToast !== "undefined")
      showToast("❌ Failed to update status: " + error.message, "error");
    if (typeof showLoading !== "undefined") showLoading(false);
  }
};

// View Email History
window.handleViewEmailHistory = async function (bookingId) {
  console.log(`📧 Viewing email history for booking ${bookingId}`);

  try {
    if (typeof window.viewEmailHistory !== "undefined") {
      await window.viewEmailHistory(bookingId);
    } else {
      console.error("viewEmailHistory not defined");
      if (typeof showToast !== "undefined") {
        showToast("Email history feature not available", "warning");
      }
    }
  } catch (error) {
    console.error("Error viewing email history:", error);
  }
};

// Delete Booking
window.handleDeleteBooking = async function (bookingId, reference) {
  console.log(`🗑️ Delete booking button clicked for ID: ${bookingId}`);

  try {
    const confirmed = confirm(
      `⚠️ Delete booking ${reference}?\n\nThis will permanently delete:\n- All booking data\n- Email history\n\nThis action cannot be undone.`,
    );
    if (!confirmed) return;

    if (typeof showLoading !== "undefined")
      showLoading(true, "Deleting booking...");

    const result = await window.deleteBooking(bookingId);

    if (typeof showLoading !== "undefined") showLoading(false);

    if (result) {
      if (typeof showToast !== "undefined") {
        showToast(`✅ Booking ${reference} deleted!`, "success");
      }

      await window.fetchBookings();
      if (typeof window.renderBookingsTable !== "undefined")
        window.renderBookingsTable();

      const modal = document.querySelector("#bookingModal, .fixed");
      if (modal) modal.remove();
    } else {
      if (typeof showToast !== "undefined") {
        showToast(`❌ Failed to delete booking`, "error");
      }
    }
  } catch (error) {
    console.error("Error deleting booking:", error);
    if (typeof showToast !== "undefined")
      showToast("❌ Failed to delete booking", "error");
    if (typeof showLoading !== "undefined") showLoading(false);
  }
};

// Create New Booking
window.handleCreateBooking = async function () {
  console.log(`📝 Create new booking button clicked`);

  try {
    if (typeof window.openCreateBookingModal !== "undefined") {
      await window.openCreateBookingModal();
    } else {
      console.error("openCreateBookingModal not defined");
      if (typeof showToast !== "undefined") {
        showToast("Booking module not ready", "error");
      }
    }
  } catch (error) {
    console.error("Error opening create booking modal:", error);
  }
};
// Add this function to booking-actions.js
window.updateBookingStatusAndAmount = async function (id, status, totalAmount) {
  try {
    const { error } = await supabase
      .from("b2b_bookings")
      .update({
        status: status,
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;
    await window.fetchBookings();
    return true;
  } catch (error) {
    console.error("Error updating booking:", error);
    return false;
  }
};
console.log("✅ Booking Actions module loaded - Enhanced");
