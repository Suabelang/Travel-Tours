// assets/js/modules/bookings/booking-ui.js
// BOOKING DETAILS MODAL UI - With Additional Fees & Discounts

console.log('🎨 Booking Details UI Module Loading...');

// =====================================================
// VIEW BOOKING DETAILS MODAL
// =====================================================

window.viewBookingDetails = async function(id) {
    console.log('🔍 Viewing booking details for ID:', id);
    
    const booking = await window.fetchBookingById(id);
    if (!booking) {
        if (typeof showToast !== 'undefined') showToast('Booking not found', 'error');
        return;
    }
    
    console.log('Booking data:', {
        hasIdPicture: !!booking.id_picture_url,
        idPictureUrl: booking.id_picture_url,
        hasAdditionalFee: !!booking.additional_fee,
        hasDiscount: !!booking.discount_amount
    });
    
    const status = (booking.status || '').toLowerCase();
    const isPending = status === 'pending';
    const isConfirmed = status === 'confirmed';
    const isPaid = (booking.payment_status || '').toLowerCase() === 'paid';
    
    const travelDates = booking.travel_dates?.map(d => new Date(d).toLocaleDateString('en-PH', {
        year: 'numeric', month: 'long', day: 'numeric'
    })).join(' → ') || 'Not specified';
    
    const nights = booking.travel_dates?.length ? booking.travel_dates.length - 1 : 0;
    
    // Calculate breakdown if booking has extra nights data
    const hasExtraNights = booking.hotel_extra_night_rate && booking.hotel_extra_night_rate > 0;
    const hotelBaseTotal = (booking.hotel_Rates_Selected || 0) * (booking.hotel_pax_count || 1);
    const extraNightsTotal = (booking.hotel_extra_night_rate || 0) * (booking.hotel_nights || 0) * (booking.hotel_pax_count || 1);
    const hotelTotal = hotelBaseTotal + extraNightsTotal;
    const optionalTourTotal = booking.optional_tour_total_amount || 0;
    const subtotal = hotelTotal + optionalTourTotal;
    const finalTotal = subtotal + (booking.additional_fee || 0) - (booking.discount_amount || 0);
    
    // Format ID Picture display
    let idPictureHtml = '';
    if (booking.id_picture_url && booking.id_picture_url !== 'null' && booking.id_picture_url !== '') {
        idPictureHtml = `
            <div style="background: #f9fafb; border-radius: 20px; padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
                    <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-id-card" style="color: white; font-size: 16px;"></i>
                    </div>
                    <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #1f2937;">🆔 ID Picture</h3>
                </div>
                <div style="display: flex; justify-content: center; padding: 10px;">
                    <img src="${booking.id_picture_url}" 
                         style="max-width: 100%; max-height: 300px; border-radius: 12px; border: 1px solid #e5e7eb; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" 
                         onclick="window.open('${booking.id_picture_url}', '_blank')"
                         onerror="this.onerror=null; this.src='https://placehold.co/400x300?text=No+Image';">
                </div>
                <p class="text-xs text-gray-500 text-center mt-2">Click image to view full size</p>
            </div>
        `;
    } else {
        idPictureHtml = `
            <div style="background: #f9fafb; border-radius: 20px; padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
                    <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-id-card" style="color: white; font-size: 16px;"></i>
                    </div>
                    <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #1f2937;">🆔 ID Picture</h3>
                </div>
                <div style="text-align: center; padding: 30px; background: white; border-radius: 12px; border: 1px dashed #e5e7eb;">
                    <i class="fas fa-image text-gray-300 text-4xl mb-2"></i>
                    <p class="text-gray-400 text-sm">No ID picture uploaded</p>
                </div>
            </div>
        `;
    }
    
    // Format optional tour display
    const optionalTourHtml = booking.optional_tour_name ? `
        <div style="background: #f9fafb; border-radius: 20px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
                <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-umbrella-beach" style="color: white; font-size: 16px;"></i>
                </div>
                <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #1f2937;">🏝️ Optional Tour</h3>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                <div><strong>Tour Name:</strong><br>${escapeHtml(booking.optional_tour_name)}</div>
                <div><strong>Number of Pax:</strong><br>${booking.optional_tour_pax_count || 1}</div>
                <div><strong>Rate per Pax:</strong><br>₱${Number(booking.optional_tour_rate_selected || 0).toLocaleString()}</div>
                <div><strong>Tour Total:</strong><br>₱${Number(booking.optional_tour_total_amount || 0).toLocaleString()}</div>
            </div>
        </div>
    ` : '';
    
    const modalHtml = `
        <div id="bookingDetailsModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;">
            <div style="background: white; border-radius: 28px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: modalSlideIn 0.3s ease-out;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 24px 32px; border-radius: 28px 28px 0 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="color: white; margin: 0; font-size: 24px;">Booking Details</h2>
                            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                                <i class="fas fa-hashtag" style="color: #d1fae5; font-size: 12px;"></i>
                                <p style="color: #d1fae5; margin: 0; font-family: monospace; font-size: 14px;">${booking.booking_reference}</p>
                            </div>
                        </div>
                        <button onclick="closeDetailsModal()" style="width: 36px; height: 36px; background: rgba(255,255,255,0.2); border: none; border-radius: 18px; color: white; font-size: 20px; cursor: pointer;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div style="padding: 32px;">
                    <!-- Status Cards -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px;">
                        <div style="background: ${isPending ? '#fef3c7' : isConfirmed ? '#dcfce7' : '#fee2e2'}; border-radius: 16px; padding: 14px 20px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <i class="fas ${isPending ? 'fa-clock' : isConfirmed ? 'fa-check-circle' : 'fa-times-circle'}" style="font-size: 24px; color: ${isPending ? '#d97706' : isConfirmed ? '#166534' : '#991b1b'}"></i>
                                <div>
                                    <p style="margin: 0; font-size: 11px; color: ${isPending ? '#92400e' : isConfirmed ? '#14532d' : '#991b1b'};">BOOKING STATUS</p>
                                    <p style="margin: 0; font-size: 18px; font-weight: 700; color: ${isPending ? '#d97706' : isConfirmed ? '#166534' : '#991b1b'}">${(booking.status || 'PENDING').toUpperCase()}</p>
                                </div>
                            </div>
                        </div>
                        <div style="background: ${isPaid ? '#dcfce7' : '#f3f4f6'}; border-radius: 16px; padding: 14px 20px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <i class="fas ${isPaid ? 'fa-check-double' : 'fa-hourglass-half'}" style="font-size: 24px; color: ${isPaid ? '#166534' : '#6b7280'}"></i>
                                <div>
                                    <p style="margin: 0; font-size: 11px; color: ${isPaid ? '#14532d' : '#4b5563'};">PAYMENT STATUS</p>
                                    <p style="margin: 0; font-size: 18px; font-weight: 700; color: ${isPaid ? '#166534' : '#374151'}">${(booking.payment_status || 'UNPAID').toUpperCase()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Client Information -->
                    <div style="background: #f9fafb; border-radius: 20px; padding: 20px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
                            <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-user" style="color: white; font-size: 16px;"></i>
                            </div>
                            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #1f2937;">👤 Client Information</h3>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                            <div><strong>Name:</strong><br>${escapeHtml(booking.client_name) || 'N/A'}</div>
                            <div><strong>Email:</strong><br>${escapeHtml(booking.client_email) || 'N/A'}</div>
                            <div><strong>Mobile:</strong><br>${escapeHtml(booking.client_mobile) || 'N/A'}</div>
                            <div><strong>Nationality:</strong><br>${escapeHtml(booking.nationality) || 'Filipino'}</div>
                        </div>
                    </div>
                    
                    <!-- Trip Details -->
                    <div style="background: #f9fafb; border-radius: 20px; padding: 20px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
                            <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-plane" style="color: white; font-size: 16px;"></i>
                            </div>
                            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #1f2937;">✈️ Trip Details</h3>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                            <div><strong>Destination:</strong><br>${escapeHtml(booking.destinations?.name || booking.category_name) || 'N/A'}</div>
                            <div><strong>Package:</strong><br>${escapeHtml(booking.package_Name || booking.destination_packages?.package_name) || 'N/A'}</div>
                            <div><strong>Hotel:</strong><br>${escapeHtml(booking.hotel_Name || booking.hotel_categories?.category_name) || 'N/A'}</div>
                            <div><strong>Travel Dates:</strong><br>${travelDates}</div>
                            <div><strong>Duration:</strong><br>${nights} night${nights !== 1 ? 's' : ''}</div>
                            ${booking.hotel_pax_count ? `<div><strong>Number of Pax:</strong><br>${booking.hotel_pax_count}</div>` : ''}
                            ${booking.hotel_Rates_Selected ? `<div><strong>Hotel Base Rate:</strong><br>₱${Number(booking.hotel_Rates_Selected).toLocaleString()}</div>` : ''}
                            ${hasExtraNights ? `
                                <div><strong>Extra Night Rate:</strong><br>₱${Number(booking.hotel_extra_night_rate).toLocaleString()} per night</div>
                                <div><strong>Extra Nights Total:</strong><br>₱${extraNightsTotal.toLocaleString()}</div>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${optionalTourHtml}
                    ${idPictureHtml}
                    
                    <!-- Special Requests -->
                    ${booking.special_requests ? `
                    <div style="background: #f9fafb; border-radius: 20px; padding: 20px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
                            <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-pen" style="color: white; font-size: 16px;"></i>
                            </div>
                            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #1f2937;">📝 Special Requests</h3>
                        </div>
                        <p style="margin: 0; padding: 12px; background: white; border-radius: 12px;">${escapeHtml(booking.special_requests)}</p>
                    </div>
                    ` : ''}
                    
                    <!-- Price Summary with Admin Editable Fields -->
                    <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 20px; padding: 20px; margin-bottom: 28px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 16px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 44px; height: 44px; background: #10b981; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-receipt" style="color: white; font-size: 20px;"></i>
                                </div>
                                <div>
                                    <p style="margin: 0; font-size: 12px; color: #065f46;">Price Breakdown</p>
                                    <p style="margin: 0; font-size: 12px; color: #065f46;">Subtotal: ₱${subtotal.toLocaleString()}</p>
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <div style="text-align: right;">
                                    <p style="margin: 0; font-size: 11px; color: #065f46;">Created</p>
                                    <p style="margin: 0; font-size: 12px; font-weight: 500;">${new Date(booking.created_at).toLocaleDateString()}</p>
                                </div>
                                <div style="width: 1px; background: #a7f3d0;"></div>
                                <div style="text-align: right;">
                                    <p style="margin: 0; font-size: 11px; color: #065f46;">Last Updated</p>
                                    <p style="margin: 0; font-size: 12px; font-weight: 500;">${new Date(booking.updated_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                        
                        ${isPending ? `
                            <!-- Admin Editable Fields for Pending Bookings -->
                            <div style="border-top: 1px solid #a7f3d0; padding-top: 16px; margin-top: 8px;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                                    <div>
                                        <label style="display: block; font-size: 12px; font-weight: 600; color: #065f46; margin-bottom: 4px;">Additional Fee (₱)</label>
                                        <input type="number" id="additionalFeeInput" value="${booking.additional_fee || 0}" step="100" min="0" 
                                               style="width: 100%; padding: 8px 12px; border: 1px solid #10b981; border-radius: 8px; font-size: 14px;">
                                        <input type="text" id="additionalFeeDescInput" value="${escapeHtml(booking.additional_fee_description || '')}" 
                                               placeholder="Fee description (e.g., Airport Transfer)" 
                                               style="width: 100%; margin-top: 4px; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px;">
                                    </div>
                                    <div>
                                        <label style="display: block; font-size: 12px; font-weight: 600; color: #065f46; margin-bottom: 4px;">Discount (₱)</label>
                                        <input type="number" id="discountAmountInput" value="${booking.discount_amount || 0}" step="100" min="0" 
                                               style="width: 100%; padding: 8px 12px; border: 1px solid #10b981; border-radius: 8px; font-size: 14px;">
                                        <input type="text" id="discountDescInput" value="${escapeHtml(booking.discount_description || '')}" 
                                               placeholder="Discount description (e.g., Early Bird)" 
                                               style="width: 100%; margin-top: 4px; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px;">
                                    </div>
                                </div>
                                <div id="updatedTotalDisplay" style="background: white; border-radius: 12px; padding: 12px; text-align: center; margin-bottom: 16px;">
                                    <span style="font-size: 14px; color: #065f46;">Updated Total:</span>
                                    <span style="font-size: 24px; font-weight: 800; color: #059669; margin-left: 12px;">₱${subtotal.toLocaleString()}</span>
                                </div>
                                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                                    <button onclick="updateBookingFees(${booking.id})" style="padding: 8px 20px; background: linear-gradient(135deg, #059669, #10b981); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 500;">
                                        💾 Save Fee Adjustments
                                    </button>
                                </div>
                            </div>
                        ` : `
                            <!-- Display Final Amount for Non-Pending Bookings -->
                            <div style="border-top: 1px solid #a7f3d0; padding-top: 16px; margin-top: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                                        ${booking.additional_fee && booking.additional_fee > 0 ? `
                                            <div>
                                                <p style="margin: 0; font-size: 11px; color: #dc2626;">+ Additional Fee</p>
                                                <p style="margin: 0; font-size: 14px; font-weight: 600;">₱${Number(booking.additional_fee).toLocaleString()}</p>
                                                ${booking.additional_fee_description ? `<p style="margin: 0; font-size: 10px; color: #6b7280;">${escapeHtml(booking.additional_fee_description)}</p>` : ''}
                                            </div>
                                        ` : ''}
                                        ${booking.discount_amount && booking.discount_amount > 0 ? `
                                            <div>
                                                <p style="margin: 0; font-size: 11px; color: #10b981;">- Discount</p>
                                                <p style="margin: 0; font-size: 14px; font-weight: 600;">₱${Number(booking.discount_amount).toLocaleString()}</p>
                                                ${booking.discount_description ? `<p style="margin: 0; font-size: 10px; color: #6b7280;">${escapeHtml(booking.discount_description)}</p>` : ''}
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div class="text-right">
                                        <p style="margin: 0; font-size: 12px; color: #065f46;">Total Amount</p>
                                        <p style="margin: 0; font-size: 28px; font-weight: 800; color: #065f46;">₱${(Number(booking.total_amount) || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        `}
                    </div>
                    
                    <!-- Action Buttons -->
                    <div style="border-top: 2px solid #e5e7eb; padding-top: 24px;">
                        <div style="display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;">
                            <button onclick="closeDetailsModal()" style="padding: 10px 24px; background: white; border: 1px solid #d1d5db; border-radius: 12px; cursor: pointer; font-weight: 500;">
                                Close
                            </button>
                            
                            ${isPending ? `
                                <button onclick="handleApproveWithFees(${booking.id})" style="padding: 10px 24px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 500;">
                                    ✓ Approve & Send Email
                                </button>
                                <button onclick="handleRejectBooking(${booking.id})" style="padding: 10px 24px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 500;">
                                    ✗ Reject
                                </button>
                            ` : `
                                <button onclick="handleSetPending(${booking.id})" style="padding: 10px 24px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 500;">
                                    ↺ Set as Pending
                                </button>
                            `}
                            
                            ${!isPaid && isConfirmed ? `
                                <button onclick="handlePaymentConfirmation(${booking.id})" style="padding: 10px 24px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 500;">
                                    💰 Mark Paid & Send Receipt
                                </button>
                            ` : ''}
                            
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
            input:focus {
                outline: none;
                border-color: #10b981;
                box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
            }
        </style>
    `;
    
    const existingModal = document.getElementById('bookingDetailsModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Add real-time total update for pending bookings
    if (isPending) {
        const additionalFeeInput = document.getElementById('additionalFeeInput');
        const discountAmountInput = document.getElementById('discountAmountInput');
        const updatedTotalDisplay = document.getElementById('updatedTotalDisplay');
        
        function updateLiveTotal() {
            const additionalFee = parseFloat(additionalFeeInput?.value) || 0;
            const discountAmount = parseFloat(discountAmountInput?.value) || 0;
            const newTotal = subtotal + additionalFee - discountAmount;
            if (updatedTotalDisplay) {
                updatedTotalDisplay.innerHTML = `
                    <span style="font-size: 14px; color: #065f46;">Updated Total:</span>
                    <span style="font-size: 24px; font-weight: 800; color: #059669; margin-left: 12px;">₱${newTotal.toLocaleString()}</span>
                `;
            }
        }
        
        additionalFeeInput?.addEventListener('input', updateLiveTotal);
        discountAmountInput?.addEventListener('input', updateLiveTotal);
    }
    
    window.closeDetailsModal = function() {
        const modal = document.getElementById('bookingDetailsModal');
        if (modal) modal.remove();
    };
    
    document.getElementById('bookingDetailsModal').addEventListener('click', function(e) {
        if (e.target === this) closeDetailsModal();
    });
};

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// =====================================================
// UPDATE BOOKING FEES (Additional Fee & Discount)
// =====================================================

window.updateBookingFees = async function(bookingId) {
    const additionalFee = parseFloat(document.getElementById('additionalFeeInput')?.value) || 0;
    const additionalFeeDesc = document.getElementById('additionalFeeDescInput')?.value || null;
    const discountAmount = parseFloat(document.getElementById('discountAmountInput')?.value) || 0;
    const discountDesc = document.getElementById('discountDescInput')?.value || null;
    
    // Get the booking data to calculate new total
    const booking = await window.fetchBookingById(bookingId);
    if (!booking) {
        alert('Booking not found');
        return;
    }
    
    // Calculate subtotal (hotel + optional tour)
    const hotelBaseTotal = (booking.hotel_Rates_Selected || 0) * (booking.hotel_pax_count || 1);
    const extraNightsTotal = (booking.hotel_extra_night_rate || 0) * (booking.hotel_nights || 0) * (booking.hotel_pax_count || 1);
    const hotelTotal = hotelBaseTotal + extraNightsTotal;
    const optionalTourTotal = booking.optional_tour_total_amount || 0;
    const subtotal = hotelTotal + optionalTourTotal;
    
    // Calculate new total
    const newTotal = subtotal + additionalFee - discountAmount;
    
    if (!confirm(`Update fees?\n\nAdditional Fee: ₱${additionalFee.toLocaleString()}${additionalFeeDesc ? ` (${additionalFeeDesc})` : ''}\nDiscount: ₱${discountAmount.toLocaleString()}${discountDesc ? ` (${discountDesc})` : ''}\nNew Total: ₱${newTotal.toLocaleString()}`)) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('b2b_bookings')
            .update({
                additional_fee: additionalFee,
                additional_fee_description: additionalFeeDesc,
                discount_amount: discountAmount,
                discount_description: discountDesc,
                total_amount: newTotal,
                updated_at: new Date().toISOString()
            })
            .eq('id', bookingId);
        
        if (error) throw error;
        
        alert(`✅ Fees updated successfully!\nNew Total: ₱${newTotal.toLocaleString()}`);
        
        // Refresh the modal
        await window.viewBookingDetails(bookingId);
        
    } catch (error) {
        console.error('Error updating fees:', error);
        alert('Failed to update fees: ' + error.message);
    }
};

// =====================================================
// APPROVE WITH FEES (Save fees and approve)
// =====================================================

window.handleApproveWithFees = async function(bookingId) {
    // First save the fees
    await window.updateBookingFees(bookingId);
    
    // Then approve with the updated total
    setTimeout(async () => {
        const booking = await window.fetchBookingById(bookingId);
        if (booking) {
            const totalAmount = booking.total_amount;
            if (!confirm(`Approve this booking with total amount ₱${totalAmount.toLocaleString()}?`)) {
                return;
            }
            
            try {
                if (typeof showLoading !== 'undefined') showLoading(true, 'Processing approval...');
                
                const updateResult = await window.updateBookingStatusAndAmount(bookingId, 'confirmed', totalAmount);
                
                if (updateResult) {
                    if (typeof window.sendApprovalEmail !== 'undefined') {
                        await window.sendApprovalEmail(bookingId);
                    }
                    alert(`✅ Booking approved with amount ₱${totalAmount.toLocaleString()}!`);
                    await window.fetchBookings();
                    if (typeof window.renderBookingsTable === 'function') {
                        window.renderBookingsTable();
                    }
                    closeDetailsModal();
                }
                
                if (typeof showLoading !== 'undefined') showLoading(false);
                
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to approve booking');
                if (typeof showLoading !== 'undefined') showLoading(false);
            }
        }
    }, 500);
};

// =====================================================
// HANDLE REJECT BOOKING
// =====================================================

window.handleRejectBooking = async function(bookingId) {
    if (!confirm('Reject this booking? This action cannot be undone.')) return;
    
    try {
        const updateResult = await window.updateBookingStatusAndAmount(bookingId, 'rejected');
        
        if (updateResult) {
            alert('✅ Booking rejected');
            await window.fetchBookings();
            window.renderBookingsTable();
            closeDetailsModal();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to reject booking');
    }
};

// =====================================================
// HANDLE SET PENDING
// =====================================================

window.handleSetPending = async function(bookingId) {
    if (!confirm('Set this booking back to pending status?')) return;
    
    try {
        const updateResult = await window.updateBookingStatusAndAmount(bookingId, 'pending');
        
        if (updateResult) {
            alert('✅ Booking status set to pending');
            await window.fetchBookings();
            window.renderBookingsTable();
            closeDetailsModal();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to update booking status');
    }
};

// =====================================================
// HANDLE PAYMENT CONFIRMATION
// =====================================================

window.handlePaymentConfirmation = async function(bookingId) {
    if (!confirm('Mark this booking as paid? This will send a receipt email.')) return;
    
    try {
        const { error } = await supabase
            .from('b2b_bookings')
            .update({
                payment_status: 'paid',
                paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', bookingId);
        
        if (error) throw error;
        
        if (typeof window.sendPaymentReceipt !== 'undefined') {
            await window.sendPaymentReceipt(bookingId);
        }
        
        alert('✅ Payment confirmed and receipt sent!');
        await window.fetchBookings();
        window.renderBookingsTable();
        closeDetailsModal();
        
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to confirm payment');
    }
};

// =====================================================
// HANDLE DELETE BOOKING
// =====================================================

window.handleDeleteBooking = async function(bookingId, bookingRef) {
    if (!confirm(`⚠️ Delete booking ${bookingRef}? This action cannot be undone!`)) return;
    
    try {
        const { error } = await supabase
            .from('b2b_bookings')
            .delete()
            .eq('id', bookingId);
        
        if (error) throw error;
        
        alert(`✅ Booking ${bookingRef} deleted successfully`);
        await window.fetchBookings();
        window.renderBookingsTable();
        closeDetailsModal();
        
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to delete booking');
    }
};

console.log('✅ Booking Details UI Module Loaded - With Additional Fee & Discount');