// ============================================
// HOME PAGE CAROUSEL - FIXED IMAGES (GAYA SA DESTINATIONS MANAGER)
// ============================================

class CarouselManager {
  constructor() {
    this.currentSlide = 0;
    this.totalSlides = 0;
    this.cards = [];
    this.videoFiles = [];
    this.autoPlayInterval = null;
    this.destinations = [];
    this.initAttempts = 0;
    this.maxInitAttempts = 20;
    this.videoCheckDone = false;
    this.currentVideoUrl = null;
    this.isPlaying = false;
    this.initDone = false;

    this.container = document.getElementById("carouselCards");
    this.heroBg = document.getElementById("heroBg");
    this.heroRegion = document.getElementById("heroRegion");
    this.heroTitle = document.getElementById("heroTitle");
    this.heroDesc = document.getElementById("heroDesc");
    this.pageNumber = document.getElementById("pageNumber");
    this.prevBtn = document.getElementById("prevBtn");
    this.nextBtn = document.getElementById("nextBtn");
  }

  async init(destinations) {
    if (this.initDone) {
      console.log("⚠️ Carousel already initialized, skipping...");
      return;
    }

    if (!this.container) {
      console.error("❌ Carousel container not found!");
      return;
    }

    if (!destinations || !destinations.length) {
      console.error("❌ No destinations provided to carousel!");
      return;
    }

    console.log(
      "🎬 Initializing carousel with destinations:",
      destinations.length,
    );

    // IMPORTANT: I-load ang destinations WITH IMAGES para sigurado
    await this.loadDestinationsWithImages();

    // Kung walang naload, gamitin ang binigay na destinations
    if (this.destinations.length === 0) {
      this.destinations = destinations;
    }

    await this.loadVideos();
    this.render(this.destinations);
    this.setupControls();
    this.startAutoPlay();

    this.initDone = true;
  }

  // ===== BAGONG METHOD: I-load ang destinations with images (gaya sa destinationsManager) =====
  async loadDestinationsWithImages() {
    try {
      console.log("🖼️ Loading destinations with images...");

      const { data, error } = await window.sns_supabase_client
        .from("destinations")
        .select(
          `
          *,
          destination_images (*)
        `,
        )
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      if (data && data.length > 0) {
        console.log(`✅ Loaded ${data.length} destinations with images`);
        this.destinations = data;
      } else {
        console.warn("⚠️ No destinations found in database");
      }
    } catch (error) {
      console.error("❌ Error loading destinations:", error);
    }
  }

  async loadVideos() {
    if (this.videoFiles.length > 0) {
      console.log("⚠️ Videos already loaded, skipping...");
      return;
    }

    try {
      console.log("📁 Listing videos from storage...");

      if (!window.sns_supabase_client) {
        console.error("❌ Supabase client not found!");
        this.videoFiles = [];
        return;
      }

      const { data, error } = await window.sns_supabase_client.storage
        .from("videos")
        .list();

      if (error) {
        console.error("❌ Error listing videos:", error.message);
        this.videoFiles = [];
        return;
      }

      this.videoFiles = (data || []).filter((file) =>
        file.name.match(/\.(mp4|mov|avi|mkv|webm)$/i),
      );

      console.log(`✅ Found ${this.videoFiles.length} videos`);
    } catch (error) {
      console.error("❌ Exception in loadVideos:", error);
      this.videoFiles = [];
    }
  }

  render(destinations) {
    if (!this.container) return;

    const maxItems = window.CONFIG?.CAROUSEL?.MAX_ITEMS || 10;

    this.container.innerHTML = destinations
      .slice(0, maxItems)
      .map((dest, index) => {
        const imageUrl = this.getDestinationImage(dest);
        const videoUrl = this.getVideoUrl(dest);

        return this.createCardHTML(dest, index, imageUrl, videoUrl);
      })
      .join("");

    this.cards = document.querySelectorAll(".carousel-card");
    this.totalSlides = this.cards.length;

    console.log(`📊 Rendered ${this.totalSlides} carousel cards`);

    this.cards.forEach((card, index) => {
      card.addEventListener("click", (e) => {
        e.stopPropagation();
        const destinationId = card.getAttribute("data-id");

        if (window.destinationsManager) {
          window.destinationsManager.showDestinationModal(
            parseInt(destinationId),
          );
        }
      });
    });

    if (this.totalSlides > 0) {
      this.goToSlide(0);
    }
  }

  // ===== FIXED: Gaya sa destinationsManager ang image handling =====
  getDestinationImage(dest) {
    if (!dest) return this.getDefaultImage();

    // PRIORITY 1: destination_images table (gaya sa destinationsManager)
    if (dest.destination_images && dest.destination_images.length > 0) {
      // Hanapin ang primary image
      const primaryImage = dest.destination_images.find(
        (img) => img.is_primary === true,
      );
      if (primaryImage && primaryImage.url) {
        console.log(
          `✅ Using primary image for ${dest.name}:`,
          primaryImage.url,
        );
        return primaryImage.url;
      }

      // Kung walang primary, gamitin ang unang image
      const firstImage = dest.destination_images[0];
      if (firstImage && firstImage.url) {
        console.log(`✅ Using first image for ${dest.name}:`, firstImage.url);
        return firstImage.url;
      }
    }

    // PRIORITY 2: image_url field
    if (dest.image_url) {
      if (dest.image_url.startsWith("http")) {
        console.log(`✅ Using image_url for ${dest.name}:`, dest.image_url);
        return dest.image_url;
      }

      if (dest.image_url.startsWith("destinations/")) {
        const { data } = window.sns_supabase_client.storage
          .from("destination-images")
          .getPublicUrl(dest.image_url);
        console.log(`✅ Using storage image for ${dest.name}:`, data.publicUrl);
        return data.publicUrl;
      }
    }

    // PRIORITY 3: banner_image
    if (dest.banner_image) {
      if (dest.banner_image.startsWith("http")) {
        return dest.banner_image;
      }

      if (dest.banner_image.startsWith("destinations/")) {
        const { data } = window.sns_supabase_client.storage
          .from("destination-images")
          .getPublicUrl(dest.banner_image);
        return data.publicUrl;
      }
    }

    // PRIORITY 4: multiple_images array
    if (dest.multiple_images && dest.multiple_images.length > 0) {
      const firstImage = dest.multiple_images[0];
      if (firstImage.startsWith("http")) {
        return firstImage;
      }

      if (firstImage.startsWith("destinations/")) {
        const { data } = window.sns_supabase_client.storage
          .from("destination-images")
          .getPublicUrl(firstImage);
        return data.publicUrl;
      }
    }

    // PRIORITY 5: Unsplash fallback
    console.log(`⚠️ No image found for ${dest.name}, using Unsplash fallback`);
    return this.getUnsplashFallback(dest.name);
  }

  // ===== UNSplash fallback - gaya sa destinationsManager =====
  getUnsplashFallback(name) {
    const images = {
      Bacolod:
        "https://images.unsplash.com/photo-1625034902529-1e6bd3b2921e?w=800&auto=format",
      Palawan:
        "https://images.unsplash.com/photo-1717992012486-b46c0e7c7bd2?w=800&auto=format",
      Boracay:
        "https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?w=800&auto=format",
      Siargao:
        "https://images.unsplash.com/photo-1590075894056-317510db35a6?w=800&auto=format",
      Bohol:
        "https://images.unsplash.com/photo-1518709766635-a24c6dfa6f4a?w=800&auto=format",
      Cebu: "https://images.unsplash.com/photo-1565967511849-76a60a516170?w=800&auto=format",
      Balabac:
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format",
      Manila:
        "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&auto=format",
      Davao:
        "https://images.unsplash.com/photo-1590004950118-5a9d6c1b8c1f?w=800&auto=format",
      Baguio:
        "https://images.unsplash.com/photo-1590004950118-5a9d6c1b8c1f?w=800&auto=format",
    };

    if (!name) return this.getDefaultImage();

    const lowerName = name.toLowerCase();
    for (const [key, url] of Object.entries(images)) {
      if (lowerName.includes(key.toLowerCase())) {
        return url;
      }
    }

    return this.getDefaultImage();
  }

  getDefaultImage() {
    return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format";
  }

  createCardHTML(dest, index, imageUrl, videoUrl) {
    const imageOnError = `this.onerror=null; this.src='${this.getDefaultImage()}';`;

    return `
      <div class="carousel-card ${index === 0 ? "active" : ""}" 
           data-id="${dest.id}"
           data-index="${index}"
           data-region="${dest.country || "Philippines"}"
           data-title="${dest.name || "Destination"}"
           data-desc="${dest.description || ""}"
           data-bg="${imageUrl}"
           data-video="${videoUrl || ""}">
        
        <div class="relative w-full h-32 overflow-hidden rounded-t-lg bg-gray-200">
          <img src="${imageUrl}" 
               alt="${dest.name}" 
               class="w-full h-full object-cover transition-transform hover:scale-110"
               loading="lazy"
               onerror="${imageOnError}"
               onload="this.classList.add('loaded')" />
        </div>
        
        <div class="card-content p-3">
          <h4 class="font-bold text-sm text-gray-900 truncate">${dest.name}</h4>
          <p class="text-xs text-gray-600 flex items-center gap-1">
            <i class="fas fa-map-marker-alt text-emerald-500 text-[10px]"></i>
            ${dest.country || "Philippines"}
          </p>
        </div>
      </div>
    `;
  }

  getVideoUrl(destination) {
    if (!this.videoFiles || !this.videoFiles.length) return null;

    const destName = destination.name?.toLowerCase() || "";
    const firstWord = destName.split(" ")[0];

    const matchedVideo = this.videoFiles.find((video) => {
      const videoName = video.name.toLowerCase();
      const videoWithoutExt = videoName.replace(
        /\.(mp4|mov|avi|mkv|webm)$/,
        "",
      );

      return (
        videoName.includes(destName) ||
        videoName.includes(firstWord) ||
        destName.includes(videoWithoutExt) ||
        firstWord.includes(videoWithoutExt)
      );
    });

    if (matchedVideo) {
      const { data } = window.sns_supabase_client.storage
        .from("videos")
        .getPublicUrl(matchedVideo.name);
      return data.publicUrl;
    }

    return null;
  }

  goToSlide(index) {
    if (!this.cards || !this.cards.length || this.isPlaying) return;

    this.isPlaying = true;

    this.cards.forEach((card) => card.classList.remove("active"));
    this.cards[index].classList.add("active");

    const region = this.cards[index].getAttribute("data-region");
    const title = this.cards[index].getAttribute("data-title");
    const desc = this.cards[index].getAttribute("data-desc");
    const bg = this.cards[index].getAttribute("data-bg");
    const video = this.cards[index].getAttribute("data-video");

    if (this.heroRegion) this.heroRegion.textContent = region || "Philippines";
    if (this.heroTitle)
      this.heroTitle.innerHTML = title || "Experience the Philippines";
    if (this.heroDesc) this.heroDesc.textContent = desc || "";

    this.setBackground(bg, video);

    if (this.pageNumber) {
      this.pageNumber.textContent = (index + 1).toString().padStart(2, "0");
    }

    this.currentSlide = index;

    setTimeout(() => {
      this.isPlaying = false;
    }, 500);
  }

  setBackground(imageUrl, videoUrl) {
    if (!this.heroBg) return;

    if (videoUrl && videoUrl === this.currentVideoUrl) {
      console.log("🎥 Same video already playing, skipping...");
      return;
    }

    const existingVideo = document.querySelector(".hero-video");
    if (existingVideo) existingVideo.remove();

    this.heroBg.style.backgroundImage = "none";

    if (videoUrl && videoUrl !== "null" && videoUrl !== "") {
      this.currentVideoUrl = videoUrl;

      const videoElement = document.createElement("video");
      videoElement.className =
        "hero-video absolute inset-0 w-full h-full object-cover";
      videoElement.autoplay = true;
      videoElement.loop = true;
      videoElement.muted = true;
      videoElement.playsInline = true;

      const source = document.createElement("source");
      source.src = videoUrl;
      source.type = "video/mp4";

      videoElement.appendChild(source);

      videoElement.onerror = () => {
        console.error("❌ Error loading video:", videoUrl);
        this.heroBg.style.backgroundImage = `url('${imageUrl}')`;
        videoElement.remove();
        this.currentVideoUrl = null;
      };

      videoElement.oncanplay = () => {
        console.log("🎥 Video loaded successfully:", videoUrl);
      };

      const overlay = document.querySelector("#home .overlay");
      if (overlay) {
        overlay.parentNode.insertBefore(videoElement, overlay);
      } else {
        this.heroBg.parentNode.insertBefore(
          videoElement,
          this.heroBg.nextSibling,
        );
      }

      console.log("🎥 Background video playing:", videoUrl);
    } else {
      this.currentVideoUrl = null;
      this.heroBg.style.backgroundImage = `url('${imageUrl}')`;
    }
  }

  setupControls() {
    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => {
        if (this.totalSlides === 0 || this.isPlaying) return;
        let newIndex = this.currentSlide - 1;
        if (newIndex < 0) newIndex = this.totalSlides - 1;
        this.goToSlide(newIndex);
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => {
        if (this.totalSlides === 0 || this.isPlaying) return;
        let newIndex = this.currentSlide + 1;
        if (newIndex >= this.totalSlides) newIndex = 0;
        this.goToSlide(newIndex);
      });
    }
  }

  startAutoPlay() {
    if (this.autoPlayInterval) clearInterval(this.autoPlayInterval);
    const interval = window.CONFIG?.CAROUSEL?.AUTO_PLAY_INTERVAL || 5000;
    this.autoPlayInterval = setInterval(() => {
      if (this.totalSlides === 0 || this.isPlaying) return;
      let newIndex = this.currentSlide + 1;
      if (newIndex >= this.totalSlides) newIndex = 0;
      this.goToSlide(newIndex);
    }, interval);
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  forceRender() {
    if (this.destinations.length > 0) {
      console.log("🔄 Force re-rendering carousel...");
      this.render(this.destinations);
      this.setupControls();
      this.startAutoPlay();
    }
  }
}

// Initialize carousel
const carouselManager = new CarouselManager();
window.carouselManager = carouselManager;

console.log("✅ Carousel loaded - FIXED IMAGES (gaya sa destinations)");

// ===== SIMPLIFIED INITIALIZATION =====
async function initCarouselOnce() {
  // Diretsong i-load ang destinations with images
  await carouselManager.loadDestinationsWithImages();

  if (carouselManager.destinations.length > 0) {
    console.log(
      `🎬 Initializing carousel with ${carouselManager.destinations.length} destinations`,
    );
    carouselManager.render(carouselManager.destinations);
    carouselManager.setupControls();
    carouselManager.startAutoPlay();
    carouselManager.initDone = true;
    return true;
  }

  // Fallback: gamitin ang destinationsManager kung may laman
  if (window.destinationsManager?.destinations?.length > 0) {
    console.log("🎬 Using destinationsManager data as fallback");
    carouselManager.destinations = window.destinationsManager.destinations;
    carouselManager.render(carouselManager.destinations);
    carouselManager.setupControls();
    carouselManager.startAutoPlay();
    carouselManager.initDone = true;
    return true;
  }

  return false;
}

// Initialize pag ready na ang DOM
document.addEventListener("DOMContentLoaded", function () {
  console.log("📄 DOM ready");
  setTimeout(initCarouselOnce, 1000);
});

// Add CSS for image loading
const style = document.createElement("style");
style.textContent = `
  .carousel-card img {
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .carousel-card img.loaded {
    opacity: 1;
  }
  
  .carousel-card .relative {
    position: relative;
    background: linear-gradient(45deg, #f3f4f6 25%, #e5e7e5 25%, #e5e7e5 50%, #f3f4f6 50%, #f3f4f6 75%, #e5e7e5 75%);
    background-size: 1rem 1rem;
    animation: loading 1s linear infinite;
  }
  
  @keyframes loading {
    0% { background-position: 0 0; }
    100% { background-position: 1rem 0; }
  }
`;
document.head.appendChild(style);
