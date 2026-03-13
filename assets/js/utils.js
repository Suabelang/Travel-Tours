// ============================================
// UTILITY FUNCTIONS - RESPONSIVE VERSION
// ============================================

// Debounce - para sa performance
function debounce(func, wait) {
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

// ✅ FORMAT PRICE - Blanko kung walang price
function formatPrice(price) {
  if (!price || price === 0 || price === null || price === undefined) {
    return ""; // Blanko
  }
  return `₱${price.toLocaleString()}`;
}

// Get badge class based on type
function getBadgeClass(badgeType) {
  switch (badgeType) {
    case "new":
      return "badge-new";
    case "featured":
      return "badge-featured";
    default:
      return "badge-popular";
  }
}

// Get badge text
function getBadgeText(dest) {
  if (dest.badge_text) return dest.badge_text;
  if (dest.badge_type === "new") return "New";
  if (dest.badge_type === "featured") return "Featured";
  return "Popular";
}

// Smooth scroll to element
function smoothScrollTo(element, offset = 0) {
  if (!element) return;
  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth",
  });
}

// Check if element is in viewport
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Truncate text
function truncateText(text, length = 100) {
  if (!text) return "";
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
}

// Generate random ID
function generateId(prefix = "") {
  return prefix + Math.random().toString(36).substring(2, 9);
}

// Get URL parameter
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Device detection
function isMobile() {
  return window.innerWidth <= 768;
}

function isTablet() {
  return window.innerWidth > 768 && window.innerWidth <= 1024;
}

function isDesktop() {
  return window.innerWidth > 1024;
}

// Copy to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
}

// Format date
function formatDate(dateString) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
}

// Email validation
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Phone validation (Philippines)
function isValidPhone(phone) {
  const re = /^(09|\+639)\d{9}$/;
  return re.test(phone);
}

// Sleep / Delay
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Group array by key
function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
}

// ===== RESPONSIVE UTILITIES =====

// Detect device and orientation
window.addEventListener(
  "resize",
  debounce(function () {
    const width = window.innerWidth;
    const height = window.innerHeight;

    document.documentElement.style.setProperty("--vw", width / 100 + "px");
    document.documentElement.style.setProperty("--vh", height / 100 + "px");

    // Dispatch custom event for components that need to react
    window.dispatchEvent(
      new CustomEvent("resize:done", {
        detail: { width, height, isMobile: width <= 768 },
      }),
    );
  }, 150),
);

// Initialize vh/vw units
(function () {
  const width = window.innerWidth;
  const height = window.innerHeight;
  document.documentElement.style.setProperty("--vw", width / 100 + "px");
  document.documentElement.style.setProperty("--vh", height / 100 + "px");
})();

// Fix for 100vh on mobile browsers
function setVhProperty() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}

window.addEventListener("resize", setVhProperty);
window.addEventListener("orientationchange", setVhProperty);
setVhProperty();

// Get responsive image URL
function getResponsiveImageUrl(url, width) {
  if (!url) return CONFIG?.DEFAULT_IMAGE || "";

  // For Unsplash images
  if (url.includes("unsplash.com")) {
    return url.replace(/w=\d+/, `w=${width}`);
  }

  return url;
}

// Check orientation
function isPortrait() {
  return window.innerHeight > window.innerWidth;
}

function isLandscape() {
  return window.innerWidth > window.innerHeight;
}

// Make utilities globally available
window.debounce = debounce;
window.formatPrice = formatPrice;
window.getBadgeClass = getBadgeClass;
window.getBadgeText = getBadgeText;
window.smoothScrollTo = smoothScrollTo;
window.isInViewport = isInViewport;
window.truncateText = truncateText;
window.generateId = generateId;
window.getUrlParameter = getUrlParameter;
window.isMobile = isMobile;
window.isTablet = isTablet;
window.isDesktop = isDesktop;
window.copyToClipboard = copyToClipboard;
window.formatDate = formatDate;
window.isValidEmail = isValidEmail;
window.isValidPhone = isValidPhone;
window.sleep = sleep;
window.groupBy = groupBy;
window.getResponsiveImageUrl = getResponsiveImageUrl;
window.isPortrait = isPortrait;
window.isLandscape = isLandscape;

console.log("✅ Utils loaded - Responsive version");
