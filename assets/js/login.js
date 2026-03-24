// =====================================================
// LOGIN.JS - UPDATED WITH ENHANCED FUNCTIONS (TOP RIGHT TOAST)
// =====================================================

// Supabase Configuration
const SUPABASE_URL = "https://rpapduavenpzwtptgopm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYXBkdWF2ZW5wend0cHRnb3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NTI5NDUsImV4cCI6MjA4NjMyODk0NX0.IVTVByGm8LuykvYQ5wRzK4WBT1mA9Ew5fy6uTjokMbg";

// DOM Elements
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("login-password");
const emailInput = document.getElementById("login-email");
const rememberMe = document.getElementById("remember-me");
const forgotLink = document.getElementById("forgotLink");

// ===== TOAST NOTIFICATION SYSTEM (TOP RIGHT) =====
function showToast(message, type = "success") {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll(".custom-toast");
  existingToasts.forEach((toast) => toast.remove());

  // Create toast container if not exists (for positioning)
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }

  // Create toast
  const toast = document.createElement("div");
  toast.className = `custom-toast transform transition-all duration-300 translate-x-full opacity-0`;

  let bgColor, icon, borderColor;
  switch (type) {
    case "success":
      bgColor = "bg-gradient-to-r from-green-500 to-green-600";
      borderColor = "border-green-400";
      icon = "fa-check-circle";
      break;
    case "error":
      bgColor = "bg-gradient-to-r from-red-500 to-red-600";
      borderColor = "border-red-400";
      icon = "fa-exclamation-circle";
      break;
    case "info":
      bgColor = "bg-gradient-to-r from-blue-500 to-blue-600";
      borderColor = "border-blue-400";
      icon = "fa-info-circle";
      break;
    case "warning":
      bgColor = "bg-gradient-to-r from-yellow-500 to-yellow-600";
      borderColor = "border-yellow-400";
      icon = "fa-exclamation-triangle";
      break;
    default:
      bgColor = "bg-gradient-to-r from-blue-500 to-blue-600";
      borderColor = "border-blue-400";
      icon = "fa-info-circle";
  }

  toast.style.cssText = `
    min-width: 280px;
    max-width: 380px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
    pointer-events: auto;
    margin-bottom: 0;
    overflow: hidden;
    border-left: 4px solid;
    border-left-color: ${type === "success" ? "#10b981" : type === "error" ? "#ef4444" : type === "warning" ? "#f59e0b" : "#3b82f6"};
  `;

  toast.innerHTML = `
    <div class="flex items-start p-4">
      <div class="flex-shrink-0">
        <div class="w-8 h-8 rounded-full flex items-center justify-center ${bgColor} text-white">
          <i class="fas ${icon} text-sm"></i>
        </div>
      </div>
      <div class="ml-3 flex-1">
        <p class="text-sm font-medium text-gray-800 leading-relaxed">${message}</p>
      </div>
      <button class="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors" onclick="this.closest('.custom-toast').remove()">
        <i class="fas fa-times text-xs"></i>
      </button>
    </div>
    <div class="h-1 bg-gray-100 w-full">
      <div class="h-full ${type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : type === "warning" ? "bg-yellow-500" : "bg-blue-500"} animate-progress-bar" style="width: 100%; animation: progressBar 3s linear forwards;"></div>
    </div>
  `;

  toastContainer.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.remove("translate-x-full", "opacity-0");
    toast.classList.add("translate-x-0", "opacity-100");
  }, 10);

  // Auto remove
  setTimeout(() => {
    toast.classList.remove("translate-x-0", "opacity-100");
    toast.classList.add("translate-x-full", "opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add animation styles if not exists
if (!document.querySelector("#toast-styles")) {
  const style = document.createElement("style");
  style.id = "toast-styles";
  style.textContent = `
    @keyframes progressBar {
      0% { width: 100%; }
      100% { width: 0%; }
    }
    .animate-progress-bar {
      animation: progressBar 3s linear forwards;
    }
  `;
  document.head.appendChild(style);
}

// ===== CAROUSEL INITIALIZATION =====
function initCarousel() {
  const slides = document.querySelectorAll(".carousel-slide");
  const dots = document.querySelectorAll(".carousel-dot");
  let currentSlide = 0;
  let interval;

  if (slides.length === 0) return;

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.style.opacity = i === index ? "1" : "0";
    });

    dots.forEach((dot, i) => {
      if (i === index) {
        dot.classList.remove("opacity-50");
        dot.classList.add("opacity-100");
      } else {
        dot.classList.remove("opacity-100");
        dot.classList.add("opacity-50");
      }
    });

    currentSlide = index;
  }

  function nextSlide() {
    const next = (currentSlide + 1) % slides.length;
    showSlide(next);
  }

  // Add click handlers to dots
  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      showSlide(index);
      resetInterval();
    });
  });

  function startInterval() {
    if (interval) clearInterval(interval);
    interval = setInterval(nextSlide, 5000);
  }

  function resetInterval() {
    clearInterval(interval);
    startInterval();
  }

  startInterval();

  // Pause on hover
  const container = document.querySelector(".carousel-container");
  if (container) {
    container.addEventListener("mouseenter", () => clearInterval(interval));
    container.addEventListener("mouseleave", startInterval);
  }
}

// ===== SOCIAL LOGIN SETUP =====
function setupSocialLogins() {
  const googleBtn = document.getElementById("google-login");
  const facebookBtn = document.getElementById("facebook-login");
  const appleBtn = document.getElementById("apple-login");

  if (googleBtn) {
    googleBtn.addEventListener("click", () => handleSocialLogin("google"));
  }

  if (facebookBtn) {
    facebookBtn.addEventListener("click", () => handleSocialLogin("facebook"));
  }

  if (appleBtn) {
    appleBtn.addEventListener("click", () => handleSocialLogin("apple"));
  }
}

// ===== HANDLE SOCIAL LOGIN =====
async function handleSocialLogin(provider) {
  showToast(`Redirecting to ${provider} login...`, "info");

  try {
    const supabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
    );
    const redirectUrl = `${window.location.origin}/dashboard.html`;

    if (provider === "google") {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
    } else if (provider === "facebook") {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
    } else {
      showToast(`${provider} login is coming soon!`, "info");
    }
  } catch (error) {
    console.error(`${provider} login error:`, error);
    showToast(`Unable to login with ${provider}. Please try again.`, "error");
  }
}

// ===== KEYBOARD SHORTCUT FOR ENTER KEY =====
function setupKeyboardShortcut() {
  document.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      const loginFormEl = document.getElementById("loginForm");
      const activeElement = document.activeElement;
      if (
        loginFormEl &&
        activeElement &&
        (activeElement.id === "login-email" ||
          activeElement.id === "login-password")
      ) {
        event.preventDefault();
        loginFormEl.dispatchEvent(new Event("submit"));
      }
    }
  });
}

// ===== LOAD SWEETALERT =====
function loadSweetAlert() {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
    script.onload = resolve;
    document.head.appendChild(script);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css";
    document.head.appendChild(link);
  });
}

// ===== GENERATE SECURE TOKEN =====
function generateSecureToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

// ===== FORGOT PASSWORD HANDLER =====
async function handleForgotPassword() {
  const { value: email } = await Swal.fire({
    title: "Reset Password",
    text: "Enter your email address to receive a password reset link.",
    input: "email",
    inputPlaceholder: "your@email.com",
    showCancelButton: true,
    confirmButtonText: "Send Reset Link",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#34d399",
    cancelButtonColor: "#6b7280",
    inputValidator: (value) => {
      if (!value) return "Email is required!";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        return "Please enter a valid email address";
    },
  });

  if (email) {
    try {
      const supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
      );

      Swal.fire({
        title: "Sending...",
        text: "Please wait",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const redirectUrl = window.location.origin + "/reset-password.html";

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      Swal.fire({
        icon: "success",
        title: "Reset Link Sent!",
        html: `Check your inbox <strong>${email}</strong> for the password reset link.<br><br>📧 Don't forget to check your spam folder!`,
        confirmButtonColor: "#34d399",
      });

      showToast(`Reset link sent to ${email}`, "success");
    } catch (error) {
      console.error("Forgot password error:", error);

      let errorMessage = error.message;
      if (error.message.includes("User not found")) {
        errorMessage = "No account found with this email address.";
      } else if (error.message.includes("rate limit")) {
        errorMessage = "Too many requests. Please try again later.";
      }

      Swal.fire({
        icon: "error",
        title: "Failed to Send",
        text: errorMessage,
        confirmButtonColor: "#34d399",
      });

      showToast(errorMessage, "error");
    }
  }
}

// ===== LOGIN HANDLER =====
async function handleLogin(e) {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showToast("Please fill in all fields", "error");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Please enter a valid email address", "error");
    return;
  }

  const originalText = loginBtn.innerHTML;
  loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
  loginBtn.disabled = true;

  try {
    const supabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const sessionToken = generateSecureToken();
    const dashboardToken = generateSecureToken();
    const expiresAt = Date.now() + 8 * 60 * 60 * 1000;

    // Store user info
    const userData = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role || "admin",
      name: data.user.user_metadata?.name || email.split("@")[0],
      lastLogin: new Date().toISOString(),
    };

    localStorage.setItem("sns_admin_logged_in", "true");
    localStorage.setItem("sns_admin_email", email);
    localStorage.setItem("sns_admin_name", email.split("@")[0]);
    localStorage.setItem("sns_admin_token", sessionToken);
    localStorage.setItem("session_expires", expiresAt.toString());
    localStorage.setItem("last_activity", Date.now().toString());
    sessionStorage.setItem("dashboard_token", dashboardToken);
    sessionStorage.setItem("session_start", Date.now().toString());
    sessionStorage.setItem("user", JSON.stringify(userData));

    localStorage.setItem(
      "userSession",
      JSON.stringify({
        access_token: data.session.access_token,
        expires_at: expiresAt,
        user: data.user,
      }),
    );

    // Handle "Remember Me"
    if (rememberMe.checked) {
      localStorage.setItem("rememberedEmail", btoa(email));
    } else {
      localStorage.removeItem("rememberedEmail");
    }

    showToast(
      `Welcome ${userData.name}! Redirecting to dashboard...`,
      "success",
    );

    // Redirect after delay
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1500);
  } catch (error) {
    console.error("Login error:", error);

    let errorMessage = "Invalid email or password";
    if (error.message.includes("Email not confirmed")) {
      errorMessage = "Please verify your email address first";
    } else if (error.message.includes("Invalid login credentials")) {
      errorMessage = "The email or password is incorrect";
    }

    showToast(errorMessage, "error");

    loginBtn.innerHTML = originalText;
    loginBtn.disabled = false;
  }
}

// ===== LOAD REMEMBERED EMAIL =====
function loadRememberedEmail() {
  const remembered = localStorage.getItem("rememberedEmail");
  if (remembered) {
    try {
      emailInput.value = atob(remembered);
      rememberMe.checked = true;
    } catch {
      localStorage.removeItem("rememberedEmail");
    }
  }
}

// ===== CLEAR EXISTING SESSION =====
function clearExistingSession() {
  // Don't clear all localStorage because remembered email might be saved
  // Only clear session-related items
  const rememberedEmail = localStorage.getItem("rememberedEmail");
  localStorage.clear();
  sessionStorage.clear();
  if (rememberedEmail) {
    localStorage.setItem("rememberedEmail", rememberedEmail);
  }
}

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
  if (togglePassword) {
    togglePassword.addEventListener("click", () => {
      const type = passwordInput.type === "password" ? "text" : "password";
      passwordInput.type = type;
      togglePassword.innerHTML = `<i class="fas fa-eye${type === "password" ? "" : "-slash"}"></i>`;
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  if (forgotLink) {
    forgotLink.addEventListener("click", (e) => {
      e.preventDefault();
      handleForgotPassword();
    });
  }

  // Setup social logins
  setupSocialLogins();

  // Setup keyboard shortcut
  setupKeyboardShortcut();
}

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Login page initializing...");

  await loadSweetAlert();
  loadRememberedEmail();
  setupEventListeners();
  clearExistingSession();

  // Initialize carousel if elements exist
  initCarousel();

  console.log("✅ Login handler initialized successfully");
});

// Export for debugging (optional)
window.loginHelpers = {
  showToast,
  handleSocialLogin,
  initCarousel,
};

console.log(
  "✅ Login.js loaded with enhanced functions (top right toast, carousel, social login)",
);
