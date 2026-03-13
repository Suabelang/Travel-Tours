// =====================================================
// SNS TRAVEL - CORE CONFIGURATION
// WITH ALL EXPORTS INCLUDING hideLoading
// =====================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Supabase Configuration
export const SUPABASE_URL = "https://rpapduavenpzwtptgopm.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYXBkdWF2ZW5wend0cHRnb3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NTI5NDUsImV4cCI6MjA4NjMyODk0NX0.IVTVByGm8LuykvYQ5wRzK4WBT1mA9Ew5fy6uTjokMbg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================================================
// GLOBAL STATE (Removed agency references)
// =====================================================
export const state = {
  currentPage: "dashboard",
  currentAction: null,
  currentId: null,
  stats: {
    totalDestinations: 0,
    totalPackages: 0,
    totalBookings: 0,
    totalRevenue: 0,
    pendingBookings: 0,
    totalOptionalTours: 0,
    totalImages: 0,
  },
  destinations: [],
  packages: [],
  hotels: [],
  hotelCategories: [],
  optionalTours: [],
  optionalTourCategories: [],
  localTourCategories: [],
  internationalTourCategories: [],
  tariffs: [],
  bookings: [],
  recentBookings: [],
  images: [],
};

// =====================================================
// TOAST CONTAINER SETUP
// =====================================================

// Ensure toast container exists
function ensureToastContainer() {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "fixed top-4 right-4 z-[9999] space-y-2";
    document.body.appendChild(container);
  }
  return container;
}

// =====================================================
// LOADING INDICATOR - COMPLETE WITH hideLoading
// =====================================================

export function showLoading(show = true, message = "Loading...") {
  try {
    // Handle different parameter types
    let shouldShow = true;
    let loadingMessage = message;

    if (typeof show === "boolean") {
      shouldShow = show;
      loadingMessage = message;
    } else if (typeof show === "string") {
      // Old format: showLoading('Loading...')
      shouldShow = true;
      loadingMessage = show;
    } else {
      shouldShow = false;
    }

    let loader = document.getElementById("globalLoader");

    if (shouldShow) {
      if (!loader) {
        loader = document.createElement("div");
        loader.id = "globalLoader";
        loader.className =
          "fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm";
        loader.innerHTML = `
                    <div class="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
                        <div class="text-center">
                            <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mb-4"></div>
                            <p class="text-gray-700 font-medium">${loadingMessage}</p>
                        </div>
                    </div>
                `;
        document.body.appendChild(loader);
      } else {
        // Update message if loader exists
        const messageEl = loader.querySelector("p");
        if (messageEl) messageEl.textContent = loadingMessage;
      }
    } else {
      if (loader) loader.remove();
    }
  } catch (error) {
    console.error("Error in showLoading:", error);
  }
}

// Export hideLoading function
export function hideLoading() {
  showLoading(false);
}

// =====================================================
// UNSPLASH IMAGE COLLECTION
// =====================================================
export const UNSPLASH_IMAGES = {
  Bacolod:
    "https://images.unsplash.com/photo-1625034902529-1e6bd3b2921e?w=800&q=80",
  Palawan:
    "https://images.unsplash.com/photo-1717992012486-b46c0e7c7bd2?w=800&q=80",
  Boracay:
    "https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?w=800&q=80",
  Siargao:
    "https://images.unsplash.com/photo-1590075894056-317510db35a6?w=800&q=80",
  Bohol:
    "https://images.unsplash.com/photo-1518709766635-a24c6dfa6f4a?w=800&q=80",
  Cebu: "https://images.unsplash.com/photo-1565967511849-76a60a516170?w=800&q=80",
  Batanes:
    "https://images.unsplash.com/photo-1564485377539-4af72d1f6a2f?w=800&q=80",
  Manila:
    "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&q=80",
  Bali: "https://images.unsplash.com/photo-1537996194471-e657df0abee4?w=800&q=80",
  Tokyo:
    "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
  "Swiss Alps":
    "https://images.unsplash.com/photo-1531973819741-e27a5ae2cc7b?w=800&q=80",
  Thailand:
    "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80",
  default:
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
};

export const getDestinationImage = (destinationName) => {
  if (!destinationName) return UNSPLASH_IMAGES.default;
  if (UNSPLASH_IMAGES[destinationName]) return UNSPLASH_IMAGES[destinationName];
  for (const [key, url] of Object.entries(UNSPLASH_IMAGES)) {
    if (destinationName.toLowerCase().includes(key.toLowerCase())) return url;
  }
  return UNSPLASH_IMAGES.default;
};

// =====================================================
// IMAGE CRUD OPERATIONS
// =====================================================

export async function uploadImage(file, destinationId, destinationName) {
  try {
    showToast("📤 Uploading image...", "info");

    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === "destination-images");

    if (!bucketExists) {
      await supabase.storage.createBucket("destination-images", {
        public: true,
        allowedMimeTypes: [
          "image/png",
          "image/jpeg",
          "image/jpg",
          "image/webp",
        ],
        fileSizeLimit: 5242880,
      });
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${destinationId}-${Date.now()}.${fileExt}`;
    const filePath = `destinations/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("destination-images")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("destination-images").getPublicUrl(filePath);

    const { data, error } = await supabase
      .from("destination_images")
      .insert([
        {
          destination_id: parseInt(destinationId),
          url: publicUrl,
          alt_text: destinationName || "Destination image",
          is_primary: false,
        },
      ])
      .select();

    if (error) throw error;

    showToast("✅ Image uploaded successfully!", "success");
    return { success: true, data: data[0], url: publicUrl };
  } catch (error) {
    console.error("Error uploading image:", error);
    showToast("❌ Failed to upload image: " + error.message, "error");
    return { success: false, error };
  }
}

export async function addImageFromUrl(url, destinationId, destinationName) {
  try {
    showToast("📸 Adding image...", "info");

    const { data, error } = await supabase
      .from("destination_images")
      .insert([
        {
          destination_id: parseInt(destinationId),
          url: url,
          alt_text: destinationName || "Destination image",
          is_primary: false,
        },
      ])
      .select();

    if (error) throw error;

    showToast("✅ Image added successfully!", "success");
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Error adding image:", error);
    showToast("❌ Failed to add image: " + error.message, "error");
    return { success: false, error };
  }
}

export async function fetchDestinationImages(destinationId) {
  try {
    const { data, error } = await supabase
      .from("destination_images")
      .select("*")
      .eq("destination_id", destinationId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching images:", error);
    return [];
  }
}

export async function setPrimaryImage(imageId, destinationId) {
  try {
    await supabase
      .from("destination_images")
      .update({ is_primary: false })
      .eq("destination_id", destinationId);

    const { error } = await supabase
      .from("destination_images")
      .update({ is_primary: true })
      .eq("id", imageId);

    if (error) throw error;

    showToast("✅ Primary image updated!", "success");
    return { success: true };
  } catch (error) {
    console.error("Error setting primary image:", error);
    showToast("❌ Failed to set primary image: " + error.message, "error");
    return { success: false };
  }
}

export async function deleteImage(imageId) {
  try {
    const { error } = await supabase
      .from("destination_images")
      .delete()
      .eq("id", imageId);

    if (error) throw error;

    showToast("✅ Image deleted successfully!", "success");
    return { success: true };
  } catch (error) {
    console.error("Error deleting image:", error);
    showToast("❌ Failed to delete image: " + error.message, "error");
    return { success: false };
  }
}

// =====================================================
// IMAGE UPLOAD MODAL
// =====================================================

export function showImageUploadModal(destinationId, destinationName) {
  // Remove existing modal if any
  const existingModal = document.getElementById("imageUploadModal");
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.id = "imageUploadModal";
  modal.className =
    "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm";

  modal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
            <div class="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div class="flex items-center gap-3">
                    <div class="h-10 w-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white">
                        <i class="fas fa-cloud-upload-alt"></i>
                    </div>
                    <h3 class="text-xl font-bold text-white">Upload Image for ${destinationName}</h3>
                </div>
                <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white text-3xl">&times;</button>
            </div>
            
            <div class="p-6 space-y-6">
                <!-- File Upload Area -->
                <div class="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-emerald-500 transition cursor-pointer" id="fileUploadArea">
                    <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-3"></i>
                    <p class="text-gray-700 font-medium mb-1">Click to upload or drag and drop</p>
                    <p class="text-xs text-gray-500">PNG, JPG, JPEG, WEBP up to 5MB</p>
                    <input type="file" id="fileInput" accept="image/png,image/jpeg,image/jpg,image/webp" class="hidden">
                </div>
                
                <div class="relative">
                    <div class="absolute inset-0 flex items-center">
                        <div class="w-full border-t border-gray-300"></div>
                    </div>
                    <div class="relative flex justify-center text-sm">
                        <span class="px-4 bg-white text-gray-500">OR</span>
                    </div>
                </div>
                
                <!-- Unsplash Quick Add -->
                <div>
                    <p class="text-sm font-medium text-gray-700 mb-3">Quick add from Unsplash:</p>
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="window.addUnsplashImage(${destinationId}, '${destinationName}', 'https://images.unsplash.com/photo-1625034902529-1e6bd3b2921e?w=800&q=80')" 
                                class="p-2 bg-gray-50 rounded-lg hover:bg-emerald-50 transition text-left flex items-center gap-2">
                            <div class="w-10 h-10 rounded bg-cover bg-center" style="background-image: url('https://images.unsplash.com/photo-1625034902529-1e6bd3b2921e?w=200&q=80')"></div>
                            <span class="text-xs font-medium">Bacolod</span>
                        </button>
                        <button onclick="window.addUnsplashImage(${destinationId}, '${destinationName}', 'https://images.unsplash.com/photo-1717992012486-b46c0e7c7bd2?w=800&q=80')" 
                                class="p-2 bg-gray-50 rounded-lg hover:bg-emerald-50 transition text-left flex items-center gap-2">
                            <div class="w-10 h-10 rounded bg-cover bg-center" style="background-image: url('https://images.unsplash.com/photo-1717992012486-b46c0e7c7bd2?w=200&q=80')"></div>
                            <span class="text-xs font-medium">Palawan</span>
                        </button>
                        <button onclick="window.addUnsplashImage(${destinationId}, '${destinationName}', 'https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?w=800&q=80')" 
                                class="p-2 bg-gray-50 rounded-lg hover:bg-emerald-50 transition text-left flex items-center gap-2">
                            <div class="w-10 h-10 rounded bg-cover bg-center" style="background-image: url('https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?w=200&q=80')"></div>
                            <span class="text-xs font-medium">Boracay</span>
                        </button>
                        <button onclick="window.addUnsplashImage(${destinationId}, '${destinationName}', 'https://images.unsplash.com/photo-1590075894056-317510db35a6?w=800&q=80')" 
                                class="p-2 bg-gray-50 rounded-lg hover:bg-emerald-50 transition text-left flex items-center gap-2">
                            <div class="w-10 h-10 rounded bg-cover bg-center" style="background-image: url('https://images.unsplash.com/photo-1590075894056-317510db35a6?w=200&q=80')"></div>
                            <span class="text-xs font-medium">Siargao</span>
                        </button>
                        <button onclick="window.addUnsplashImage(${destinationId}, '${destinationName}', 'https://images.unsplash.com/photo-1518709766635-a24c6dfa6f4a?w=800&q=80')" 
                                class="p-2 bg-gray-50 rounded-lg hover:bg-emerald-50 transition text-left flex items-center gap-2">
                            <div class="w-10 h-10 rounded bg-cover bg-center" style="background-image: url('https://images.unsplash.com/photo-1518709766635-a24c6dfa6f4a?w=200&q=80')"></div>
                            <span class="text-xs font-medium">Bohol</span>
                        </button>
                        <button onclick="window.addUnsplashImage(${destinationId}, '${destinationName}', 'https://images.unsplash.com/photo-1537996194471-e657df0abee4?w=800&q=80')" 
                                class="p-2 bg-gray-50 rounded-lg hover:bg-emerald-50 transition text-left flex items-center gap-2">
                            <div class="w-10 h-10 rounded bg-cover bg-center" style="background-image: url('https://images.unsplash.com/photo-1537996194471-e657df0abee4?w=200&q=80')"></div>
                            <span class="text-xs font-medium">Bali</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

  document.body.appendChild(modal);

  // Handle file upload
  const fileUploadArea = document.getElementById("fileUploadArea");
  const fileInput = document.getElementById("fileInput");

  fileUploadArea.addEventListener("click", () => fileInput.click());

  fileUploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    fileUploadArea.classList.add("border-emerald-500", "bg-emerald-50");
  });

  fileUploadArea.addEventListener("dragleave", () => {
    fileUploadArea.classList.remove("border-emerald-500", "bg-emerald-50");
  });

  fileUploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    fileUploadArea.classList.remove("border-emerald-500", "bg-emerald-50");
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file, destinationId, destinationName);
    }
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageUpload(file, destinationId, destinationName);
    }
  });
}

// Handle image upload helper
async function handleImageUpload(file, destinationId, destinationName) {
  try {
    showToast("📤 Uploading image...", "info");
    const result = await uploadImage(file, destinationId, destinationName);
    if (result.success) {
      document.getElementById("imageUploadModal")?.remove();
      showToast("✅ Image uploaded successfully!", "success");
      const { navigateTo } = await import("./router_admin.js");
      navigateTo(state.currentPage);
    }
  } catch (error) {
    console.error("Error uploading image:", error);
    showToast("❌ Failed to upload image: " + error.message, "error");
  }
}

// Add Unsplash image
export async function addUnsplashImage(
  destinationId,
  destinationName,
  imageUrl,
) {
  try {
    showToast("📸 Adding image...", "info");
    const { data, error } = await supabase
      .from("destination_images")
      .insert([
        {
          destination_id: parseInt(destinationId),
          url: imageUrl,
          alt_text: destinationName || "Destination image",
          is_primary: false,
        },
      ])
      .select();
    if (error) throw error;
    showToast("✅ Image added successfully!", "success");
    document.getElementById("imageUploadModal")?.remove();
    const { navigateTo } = await import("./router_admin.js");
    navigateTo(state.currentPage);
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Error adding image:", error);
    showToast("❌ Failed to add image: " + error.message, "error");
    return { success: false, error };
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return "₱0";
  return `₱${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatUSD = (amount) => {
  if (!amount && amount !== 0) return "$0";
  return `$${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (date) => {
  if (!date) return "N/A";
  try {
    return new Date(date).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid Date";
  }
};

// FIXED: showToast with automatic container creation
export const showToast = (message, type = "success") => {
  // Ensure toast container exists
  const container = ensureToastContainer();

  const toast = document.createElement("div");
  toast.className = `px-6 py-3 rounded-lg shadow-lg text-white flex items-center gap-3 animate-slide-in ${
    type === "success"
      ? "bg-emerald-500"
      : type === "error"
        ? "bg-red-500"
        : type === "warning"
          ? "bg-yellow-500"
          : "bg-blue-500"
  }`;
  toast.innerHTML = `
        <i class="fas ${type === "success" ? "fa-check-circle" : type === "error" ? "fa-exclamation-circle" : type === "warning" ? "fa-exclamation-triangle" : "fa-info-circle"}"></i>
        <span>${message}</span>
    `;
  container.appendChild(toast);

  // Add slide-in animation style if not exists
  if (!document.getElementById("toastStyles")) {
    const style = document.createElement("style");
    style.id = "toastStyles";
    style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .animate-slide-in {
                animation: slideIn 0.3s ease-out;
            }
        `;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease-out";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

export const showConfirmDialog = (message, onConfirm) => {
  if (confirm(message)) {
    onConfirm();
  }
};

// Initialize toast container on module load
ensureToastContainer();

// =====================================================
// EXPORT GLOBAL FUNCTIONS TO WINDOW
// =====================================================

window.showImageUploadModal = showImageUploadModal;
window.addUnsplashImage = addUnsplashImage;
window.setPrimaryImage = setPrimaryImage;
window.deleteImage = deleteImage;
window.uploadImage = uploadImage;
window.addImageFromUrl = addImageFromUrl;
window.fetchDestinationImages = fetchDestinationImages;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.showToast = showToast;
window.showConfirmDialog = showConfirmDialog;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
