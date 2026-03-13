// ============================================
// CONFIGURATION FILE
// ============================================

const CONFIG = {
  // Supabase Configuration
  SUPABASE_URL: "https://rpapduavenpzwtptgopm.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYXBkdWF2ZW5wend0cHRnb3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NTI5NDUsImV4cCI6MjA4NjMyODk0NX0.IVTVByGm8LuykvYQ5wRzK4WBT1mA9Ew5fy6uTjokMbg",

  // Storage buckets
  STORAGE_BUCKETS: {
    VIDEOS: "videos",
    IMAGES: "images",
  },

  // Default image (fallback)
  DEFAULT_IMAGE:
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop",

  // Carousel settings
  CAROUSEL: {
    AUTO_PLAY_INTERVAL: 5000, // 5 seconds
    MAX_ITEMS: 10,
  },

  // Animation settings
  ANIMATION: {
    DURATION: 1000,
    OFFSET: 100,
    ONCE: true,
  },
};

// Make CONFIG globally available
window.CONFIG = CONFIG;

console.log("✅ Config loaded");
