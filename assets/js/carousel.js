// ============================================
// HOME PAGE CAROUSEL - PRODUCTION (ERRORS ONLY)
// ============================================

class CarouselManager {
  constructor() {
    this.currentSlide = 0;
    this.totalSlides = 0;
    this.cards = [];
    this.autoPlayInterval = null;
    this.destinations = [];
    this.initAttempts = 0;
    this.maxInitAttempts = 20;
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
    if (this.initDone) return;

    if (!this.container) {
      console.error("Carousel container not found");
      return;
    }

    if (!destinations || !destinations.length) {
      console.error("No destinations provided to carousel");
      return;
    }

    await this.loadDestinationsWithImages();

    if (this.destinations.length === 0) {
      this.destinations = destinations;
    }

    this.render(this.destinations);
    this.setupControls();
    this.startAutoPlay();

    this.initDone = true;
  }

  async loadDestinationsWithImages() {
    try {
      const { data, error } = await window.sns_supabase_client
        .from("destinations")
        .select(
          `*,
          destination_images (*)`,
        )
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      if (data && data.length > 0) {
        this.destinations = data;
      }
    } catch (error) {
      console.error("Error loading destinations:", error);
    }
  }

  render(destinations) {
    if (!this.container) return;

    const maxItems = window.CONFIG?.CAROUSEL?.MAX_ITEMS || 10;

    this.container.innerHTML = destinations
      .slice(0, maxItems)
      .map((dest, index) => {
        const imageUrl = this.getDestinationImage(dest);
        return this.createCardHTML(dest, index, imageUrl);
      })
      .join("");

    this.cards = document.querySelectorAll(".carousel-card");
    this.totalSlides = this.cards.length;

    this.cards.forEach((card, index) => {
      card.addEventListener("click", (e) => {
        e.stopPropagation();
        const destinationId = card.getAttribute("data-id");

        const tryShow = (retries = 0) => {
          if (
            window.destinationsManager &&
            typeof window.destinationsManager.showDestinationModal ===
              "function"
          ) {
            window.destinationsManager.showDestinationModal(
              parseInt(destinationId),
            );
          } else if (retries < 10) {
            setTimeout(() => tryShow(retries + 1), 100);
          } else {
            console.error(
              "destinationsManager.showDestinationModal not available",
            );
          }
        };
        tryShow();
      });
    });

    if (this.totalSlides > 0) {
      this.goToSlide(0);
    }
  }

  getDestinationImage(dest) {
    if (!dest) return this.getDefaultImage();

    if (dest.destination_images && dest.destination_images.length > 0) {
      const primaryImage = dest.destination_images.find(
        (img) => img.is_primary === true,
      );
      if (primaryImage && primaryImage.url) {
        return primaryImage.url;
      }
      const firstImage = dest.destination_images[0];
      if (firstImage && firstImage.url) {
        return firstImage.url;
      }
    }

    if (dest.image_url) {
      if (dest.image_url.startsWith("http")) {
        return dest.image_url;
      }
      if (dest.image_url.startsWith("destinations/")) {
        const { data } = window.sns_supabase_client.storage
          .from("destination-images")
          .getPublicUrl(dest.image_url);
        return data.publicUrl;
      }
    }

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

    return this.getUnsplashFallback(dest.name);
  }

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

  createCardHTML(dest, index, imageUrl) {
    const imageOnError = `this.onerror=null; this.src='${this.getDefaultImage()}';`;

    return `
      <div class="carousel-card ${index === 0 ? "active" : ""}" 
           data-id="${dest.id}"
           data-index="${index}"
           data-region="${dest.country || "Philippines"}"
           data-title="${dest.name || "Destination"}"
           data-desc="${dest.description || ""}"
           data-bg="${imageUrl}">
        
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

  goToSlide(index) {
    if (!this.cards || !this.cards.length || this.isPlaying) return;

    this.isPlaying = true;

    this.cards.forEach((card) => card.classList.remove("active"));
    this.cards[index].classList.add("active");

    const region = this.cards[index].getAttribute("data-region");
    const title = this.cards[index].getAttribute("data-title");
    const desc = this.cards[index].getAttribute("data-desc");
    const bg = this.cards[index].getAttribute("data-bg");

    if (this.heroRegion) this.heroRegion.textContent = region || "Philippines";
    if (this.heroTitle)
      this.heroTitle.innerHTML = title || "Experience the Philippines";
    if (this.heroDesc) this.heroDesc.textContent = desc || "";

    this.setBackground(bg);

    if (this.pageNumber) {
      this.pageNumber.textContent = (index + 1).toString().padStart(2, "0");
    }

    this.currentSlide = index;

    setTimeout(() => {
      this.isPlaying = false;
    }, 500);
  }

  setBackground(imageUrl) {
    if (!this.heroBg) return;
    this.heroBg.style.backgroundImage = `url('${imageUrl}')`;
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
      this.render(this.destinations);
      this.setupControls();
      this.startAutoPlay();
    }
  }
}

const carouselManager = new CarouselManager();
window.carouselManager = carouselManager;

async function initCarouselOnce() {
  await carouselManager.loadDestinationsWithImages();

  if (carouselManager.destinations.length > 0) {
    carouselManager.render(carouselManager.destinations);
    carouselManager.setupControls();
    carouselManager.startAutoPlay();
    carouselManager.initDone = true;
    return true;
  }

  if (window.destinationsManager?.destinations?.length > 0) {
    carouselManager.destinations = window.destinationsManager.destinations;
    carouselManager.render(carouselManager.destinations);
    carouselManager.setupControls();
    carouselManager.startAutoPlay();
    carouselManager.initDone = true;
    return true;
  }

  return false;
}

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(initCarouselOnce, 1000);
});

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
