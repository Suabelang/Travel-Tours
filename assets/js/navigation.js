// ============================================
// NAVIGATION AND MOBILE MENU - FULLY RESPONSIVE
// ============================================

class NavigationManager {
  constructor() {
    this.backToTop = document.getElementById("backToTop");
    this.mobileMenu = document.getElementById("mobileMenu");
    this.mobileMenuBtn = document.getElementById("mobileMenuBtn");
    this.navLinks = document.querySelectorAll(".nav-links a");
    this.mobileLinks = document.querySelectorAll(".mobile-menu a");
    this.sections = ["home", "destinations", "services", "about"];
    this.isMenuOpen = false;
    this.isAnimating = false;

    this.init();
  }

  init() {
    console.log("🔧 NavigationManager initializing...");
    this.setupBackToTop();
    this.setupMobileMenu();
    this.setupSmoothScroll();
    this.setupActiveLinks();
    this.setupClickOutside();
    this.setupResizeHandler();
  }

  setupBackToTop() {
    if (!this.backToTop) return;

    window.addEventListener("scroll", () => {
      if (window.pageYOffset > 300) {
        this.backToTop.classList.add("show");
      } else {
        this.backToTop.classList.remove("show");
      }
    });

    this.backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  setupMobileMenu() {
    if (!this.mobileMenuBtn) {
      console.log("⚠️ Mobile menu button not found");
      return;
    }

    console.log("✅ Mobile menu button found, attaching click handler");

    // Toggle menu when button is clicked
    this.mobileMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMobileMenu();
    });

    // Close menu when mobile links are clicked
    this.mobileLinks.forEach((link) => {
      link.addEventListener("click", () => {
        this.closeMobileMenu();
      });
    });
  }

  toggleMobileMenu() {
    if (this.isAnimating) return;
    this.isAnimating = true;

    console.log("🔄 Toggling mobile menu");
    if (this.mobileMenu) {
      this.mobileMenu.classList.toggle("active");
      this.isMenuOpen = this.mobileMenu.classList.contains("active");
    }
    if (this.mobileMenuBtn) {
      this.mobileMenuBtn.classList.toggle("active");
    }

    // Prevent body scroll when menu is open
    if (this.isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    setTimeout(() => {
      this.isAnimating = false;
    }, 300);
  }

  closeMobileMenu() {
    if (this.isAnimating) return;

    if (this.mobileMenu && this.mobileMenu.classList.contains("active")) {
      this.isAnimating = true;
      this.mobileMenu.classList.remove("active");
      if (this.mobileMenuBtn) {
        this.mobileMenuBtn.classList.remove("active");
      }
      this.isMenuOpen = false;
      document.body.style.overflow = "";

      setTimeout(() => {
        this.isAnimating = false;
      }, 300);
    }
  }

  setupClickOutside() {
    document.addEventListener("click", (event) => {
      if (this.isMenuOpen && this.mobileMenu && this.mobileMenuBtn) {
        // Check if click is outside both menu and button
        if (
          !this.mobileMenu.contains(event.target) &&
          !this.mobileMenuBtn.contains(event.target)
        ) {
          this.closeMobileMenu();
        }
      }
    });
  }

  setupResizeHandler() {
    // Close mobile menu when window is resized to desktop size
    window.addEventListener("resize", () => {
      if (window.innerWidth > 768 && this.isMenuOpen) {
        this.closeMobileMenu();
      }
    });
  }

  setupSmoothScroll() {
    // Desktop navigation links
    this.navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href");
        if (href && href.startsWith("#")) {
          e.preventDefault();
          this.closeMobileMenu();
          this.scrollToSection(href);
          this.updateActiveClass(href);
        }
      });
    });

    // Mobile navigation links
    this.mobileLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href");
        if (href && href.startsWith("#")) {
          e.preventDefault();
          this.closeMobileMenu();
          this.scrollToSection(href);
          this.updateActiveClass(href);
        }
      });
    });
  }

  scrollToSection(href) {
    const target = document.querySelector(href);
    if (target) {
      const offset = 80;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  }

  updateActiveClass(href) {
    // Update desktop navigation active state
    document.querySelectorAll(".nav-links li").forEach((li) => {
      li.classList.remove("active");
    });

    document.querySelectorAll(".nav-links a").forEach((link) => {
      if (link.getAttribute("href") === href) {
        link.parentElement.classList.add("active");
      }
    });

    // Update mobile navigation active state
    document.querySelectorAll(".mobile-menu a").forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === href) {
        link.classList.add("active");
      }
    });
  }

  setupActiveLinks() {
    window.addEventListener(
      "scroll",
      this.debounce(() => {
        const scrollPos = window.scrollY + 100;

        for (const section of this.sections) {
          const element = document.getElementById(section);
          if (element) {
            const top = element.offsetTop;
            const bottom = top + element.clientHeight;

            if (scrollPos >= top && scrollPos < bottom) {
              this.updateActiveClass("#" + section);
              break;
            }
          }
        }
      }, 100),
    );
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Initialize navigation manager
let navigationManager = null;

document.addEventListener("DOMContentLoaded", () => {
  // Small delay to ensure DOM is fully ready
  setTimeout(() => {
    if (!navigationManager) {
      navigationManager = new NavigationManager();
      window.navigationManager = navigationManager;
      console.log("✅ NavigationManager initialized");
    }
  }, 100);
});

// Global function for backward compatibility
window.toggleMobileMenu = function () {
  if (navigationManager) {
    navigationManager.toggleMobileMenu();
  } else {
    console.log("⚠️ NavigationManager not ready, retrying...");
    setTimeout(() => {
      if (navigationManager) {
        navigationManager.toggleMobileMenu();
      }
    }, 200);
  }
};

console.log("✅ navigation.js loaded with fixes");
