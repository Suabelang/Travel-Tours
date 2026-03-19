// ============================================
// CONFIGURATION FILE - PRODUCTION (NO CONSOLE)
// ============================================

const CONFIG = {
  SUPABASE_URL: "https://rpapduavenpzwtptgopm.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYXBkdWF2ZW5wend0cHRnb3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NTI5NDUsImV4cCI6MjA4NjMyODk0NX0.IVTVByGm8LuykvYQ5wRzK4WBT1mA9Ew5fy6uTjokMbg",

  SITE_URL: "https://travel-tours-zeta.vercel.app",  // <-- TAMA NA!

  STORAGE_BUCKETS: {
    IMAGES: "images",
  },

  DEFAULT_IMAGE:
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop",

  CAROUSEL: {
    AUTO_PLAY_INTERVAL: 5000,
    MAX_ITEMS: 10,
  },

  ANIMATION: {
    DURATION: 1000,
    OFFSET: 100,
    ONCE: true,
  },
};

window.CONFIG = CONFIG;