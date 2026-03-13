// ============================================
// SUPABASE CLIENT
// ============================================

const sns_supabase_client = window.supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY,
);
window.sns_supabase_client = sns_supabase_client;
console.log("✅ Supabase client initialized");

// ===== VIDEO FUNCTIONS =====
async function listVideos() {
  console.log("📁 Listing videos from storage...");

  try {
    const { data, error } = await sns_supabase_client.storage
      .from(CONFIG.STORAGE_BUCKETS.VIDEOS)
      .list();

    if (error) {
      console.error("❌ Error listing videos:", error.message);
      return [];
    }

    console.log(
      `✅ Found ${data?.length || 0} videos:`,
      data?.map((v) => v.name) || [],
    );
    return data || [];
  } catch (error) {
    console.error("❌ Exception in listVideos:", error);
    return [];
  }
}

async function getVideoUrl(videoFileName) {
  if (!videoFileName) return null;

  try {
    const { data } = sns_supabase_client.storage
      .from(CONFIG.STORAGE_BUCKETS.VIDEOS)
      .getPublicUrl(videoFileName);

    return data.publicUrl;
  } catch (error) {
    console.error("❌ Error getting video URL:", error);
    return null;
  }
}

// ===== DESTINATION FUNCTIONS =====
async function fetchDestinations() {
  console.log("📋 Fetching destinations...");

  try {
    const { data, error } = await sns_supabase_client
      .from("destinations")
      .select("*");

    if (error) {
      console.warn("⚠️ Supabase error, using fallback data:", error.message);
      return getFallbackDestinations();
    }

    if (data && data.length > 0) {
      console.log("✅ Got data from Supabase:", data.length, "destinations");
      return data;
    } else {
      console.log("⚠️ No data from Supabase, using fallback");
      return getFallbackDestinations();
    }
  } catch (error) {
    console.warn(
      "⚠️ Exception in fetchDestinations, using fallback:",
      error.message,
    );
    return getFallbackDestinations();
  }
}

// ✅ FALLBACK DESTINATIONS WITH PROPER PRICES
function getFallbackDestinations() {
  console.log("📋 Using fallback destinations data");

  return [
    {
      id: 1,
      name: "Banaue Rice Terraces",
      slug: "banaue",
      description:
        "Experience the 8th Wonder of the World - Ancient rice terraces carved into the mountains of Ifugao.",
      region: "Ifugao",
      price: 5000,
      duration: "3D/2N",
      image_url:
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop",
      badge_type: "popular",
    },
    {
      id: 2,
      name: "Bacolod City",
      slug: "bacolod",
      description:
        "City of Smiles - Famous for MassKara Festival and delicious chicken inasal.",
      region: "Negros Occidental",
      price: 4500,
      duration: "3D/2N",
      image_url:
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop",
      badge_type: "popular",
    },
    {
      id: 3,
      name: "Palawan",
      slug: "palawan",
      description:
        "Experience the stunning underground river and pristine beaches.",
      region: "Palawan",
      price: 6000,
      duration: "4D/3N",
      image_url:
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop",
      badge_type: "featured",
    },
    {
      id: 4,
      name: "Boracay",
      slug: "boracay",
      description: "World-famous white sand beach and vibrant nightlife.",
      region: "Aklan",
      price: 5500,
      duration: "4D/3N",
      image_url:
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop",
      badge_type: "featured",
    },
  ];
}

// Make functions globally available
window.listVideos = listVideos;
window.getVideoUrl = getVideoUrl;
window.fetchDestinations = fetchDestinations;
window.getFallbackDestinations = getFallbackDestinations;
