// assets/js/modules/bookings/booking-core.js
// Core booking functions - Complete version

console.log('📦 Booking Core loaded');

// Ensure supabase is available
if (typeof supabase === 'undefined' && typeof window.supabase !== 'undefined') {
    var supabase = window.supabase;
}

// Global state
if (typeof window.bookingState === 'undefined') {
    window.bookingState = {
        bookings: [],
        destinations: [],
        packages: [],
        hotelCategories: [],
        optionalTours: []
    };
}

// Generate booking reference
window.generateBookingReference = function() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SNS-${year}${month}${day}-${random}`;
};

// Fetch all bookings
window.fetchBookings = async function() {
    try {
        console.log('Fetching bookings...');
        
        const { data: bookings, error } = await supabase
            .from('b2b_bookings')
            .select(`
                *,
                destinations!b2b_bookings_destination_id_fkey (
                    id, name, airport_name, country
                ),
                destination_packages!b2b_bookings_package_id_fkey (
                    id, package_name, package_code, base_price
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        window.bookingState.bookings = bookings || [];
        console.log('✅ Bookings loaded:', window.bookingState.bookings.length);
        
        return window.bookingState.bookings;
        
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return [];
    }
};

// Fetch single booking by ID
window.fetchBookingById = async function(id) {
    try {
        const { data: booking, error } = await supabase
            .from('b2b_bookings')
            .select(`
                *,
                destinations!b2b_bookings_destination_id_fkey (
                    id, name, airport_name, country
                ),
                destination_packages!b2b_bookings_package_id_fkey (
                    id, package_name, package_code, base_price
                )
            `)
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        // Parse travel dates if they exist
        if (booking.travel_dates && typeof booking.travel_dates === 'string') {
            try {
                booking.travel_dates = JSON.parse(booking.travel_dates);
            } catch(e) {
                // Already parsed
            }
        }
        
        return booking;
        
    } catch (error) {
        console.error('Error fetching booking:', error);
        return null;
    }
};

// Update booking status and amount
window.updateBookingStatusAndAmount = async function(id, status, totalAmount) {
    try {
        const { error } = await supabase
            .from('b2b_bookings')
            .update({ 
                status: status,
                total_amount: totalAmount,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) throw error;
        await window.fetchBookings();
        return true;
        
    } catch (error) {
        console.error('Error updating booking:', error);
        return false;
    }
};

// Update booking status only
window.updateBookingStatus = async function(id, status) {
    try {
        const { error } = await supabase
            .from('b2b_bookings')
            .update({ 
                status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) throw error;
        await window.fetchBookings();
        return true;
        
    } catch (error) {
        console.error('Error updating booking status:', error);
        return false;
    }
};

// Update payment status
window.updatePaymentStatus = async function(id, status) {
    try {
        const updateData = {
            payment_status: status,
            updated_at: new Date().toISOString()
        };
        if (status === 'paid') {
            updateData.paid_at = new Date().toISOString();
        }
        
        const { error } = await supabase
            .from('b2b_bookings')
            .update(updateData)
            .eq('id', id);
        
        if (error) throw error;
        await window.fetchBookings();
        return true;
        
    } catch (error) {
        console.error('Error updating payment status:', error);
        return false;
    }
};

// Delete booking
window.deleteBooking = async function(id) {
    try {
        await supabase.from('booking_emails').delete().eq('booking_id', id);
        const { error } = await supabase.from('b2b_bookings').delete().eq('id', id);
        if (error) throw error;
        await window.fetchBookings();
        return true;
        
    } catch (error) {
        console.error('Error deleting booking:', error);
        return false;
    }
};

// Upload ID picture
window.uploadIdPicture = async function(file) {
    try {
        if (!file) return { success: false, error: 'No file selected' };
        
        if (file.size > 5 * 1024 * 1024) {
            return { success: false, error: 'File too large (max 5MB)' };
        }
        
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            return { success: false, error: 'Invalid file type' };
        }
        
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const fileExt = file.name.split('.').pop();
        const fileName = `${timestamp}-${random}.${fileExt}`;
        
        const { data, error } = await supabase.storage
            .from('id_pictures')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
            .from('id_pictures')
            .getPublicUrl(fileName);
        
        return { success: true, url: publicUrl, path: fileName };
        
    } catch (error) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
    }
};

console.log('✅ Booking core loaded');