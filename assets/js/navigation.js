// ============================================
// NAVIGATION AND MOBILE MENU
// ============================================

class NavigationManager {
  constructor() {
    this.backToTop = document.getElementById("backToTop");
    this.mobileMenu = document.getElementById("mobileMenu");
    this.mobileMenuBtn = document.querySelector(".mobile-menu-btn");
    this.navLinks = document.querySelectorAll(".nav-links a, .mobile-menu a");
    this.sections = ["home", "destinations", "services", "about"];

    this.init();
  }

  init() {
    this.setupBackToTop();
    this.setupMobileMenu();
    this.setupSmoothScroll();
    this.setupActiveLinks();
    this.setupClickOutside();
  }

  setupBackToTop() {
    if (!this.backToTop) return;

    window.addEventListener(
      "scroll",
      debounce(() => {
        if (window.pageYOffset > 300) {
          this.backToTop.classList.add("show");
        } else {
          this.backToTop.classList.remove("show");
        }
      }, 100),
    );

    this.backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  setupMobileMenu() {
    if (!this.mobileMenuBtn) return;

    this.mobileMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMobileMenu();
    });
  }

  toggleMobileMenu() {
    if (this.mobileMenu) {
      this.mobileMenu.classList.toggle("active");
    }
    if (this.mobileMenuBtn) {
      this.mobileMenuBtn.classList.toggle("active");
    }
  }

  closeMobileMenu() {
    if (this.mobileMenu) {
      this.mobileMenu.classList.remove("active");
    }
    if (this.mobileMenuBtn) {
      this.mobileMenuBtn.classList.remove("active");
    }
  }

  setupClickOutside() {
    document.addEventListener("click", (event) => {
      if (this.mobileMenu && this.mobileMenuBtn) {
        if (
          !this.mobileMenu.contains(event.target) &&
          !this.mobileMenuBtn.contains(event.target)
        ) {
          this.closeMobileMenu();
        }
      }
    });
  }

  setupSmoothScroll() {
    this.navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href");

        if (href && href.startsWith("#")) {
          e.preventDefault();
          const target = document.querySelector(href);

          if (target) {
            smoothScrollTo(target, 80);
            this.closeMobileMenu();
            this.updateActiveClass(href);
          }
        }
      });
    });
  }

  updateActiveClass(href) {
    document.querySelectorAll(".nav-links li a").forEach((link) => {
      link.parentElement.classList.remove("active");
      if (link.getAttribute("href") === href) {
        link.parentElement.classList.add("active");
      }
    });

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
      debounce(() => {
        const scrollPos = window.scrollY + 100;

        this.sections.forEach((section) => {
          const element = document.getElementById(section);
          if (element) {
            const top = element.offsetTop;
            const bottom = top + element.clientHeight;

            if (scrollPos >= top && scrollPos < bottom) {
              this.updateActiveClass("#" + section);
            }
          }
        });
      }, 100),
    );
  }
}

// Initialize
const navigationManager = new NavigationManager();
window.navigationManager = navigationManager;

// Legacy function
function toggleMobileMenu() {
  navigationManager.toggleMobileMenu();
}

window.toggleMobileMenu = toggleMobileMenu;

console.log("✅ Navigation loaded");
