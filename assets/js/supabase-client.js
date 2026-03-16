// ============================================
// SUPABASE CLIENT - PRODUCTION (NO CONSOLE)
// ============================================

const sns_supabase_client = window.supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY,
);
window.sns_supabase_client = sns_supabase_client;

async function fetchDestinations() {
  try {
    const { data, error } = await sns_supabase_client
      .from("destinations")
      .select("*");

    if (error) {
      return getFallbackDestinations();
    }

    if (data && data.length > 0) {
      return data;
    } else {
      return getFallbackDestinations();
    }
  } catch (error) {
    return getFallbackDestinations();
  }
}

function getFallbackDestinations() {
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

window.fetchDestinations = fetchDestinations;
window.getFallbackDestinations = getFallbackDestinations;
