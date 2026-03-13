// =====================================================
// LOGIN.JS - PRODUCTION VERSION (NO TESTING CODE)
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

// Load SweetAlert
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

// Generate secure token
function generateSecureToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  await loadSweetAlert();
  loadRememberedEmail();
  setupEventListeners();
  clearExistingSession();
});

function clearExistingSession() {
  localStorage.clear();
  sessionStorage.clear();
}

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

function setupEventListeners() {
  togglePassword.addEventListener("click", () => {
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;
    togglePassword.innerHTML = `<i class="fas fa-eye${type === "password" ? "" : "-slash"}"></i>`;
  });

  loginForm.addEventListener("submit", handleLogin);

  if (forgotLink) {
    forgotLink.addEventListener("click", (e) => {
      e.preventDefault();
      handleForgotPassword();
    });
  }
}

// ===== FORGOT PASSWORD - PRODUCTION VERSION =====
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
    }
  }
}

// ===== LOGIN - PRODUCTION VERSION =====
async function handleLogin(e) {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    Swal.fire({
      icon: "error",
      title: "Missing Information",
      text: "Please fill in all fields",
    });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    Swal.fire({
      icon: "error",
      title: "Invalid Email",
      text: "Please enter a valid email address",
    });
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

    // Set localStorage
    localStorage.setItem("sns_admin_logged_in", "true");
    localStorage.setItem("sns_admin_email", email);
    localStorage.setItem("sns_admin_name", email.split("@")[0]);
    localStorage.setItem("sns_admin_token", sessionToken);
    localStorage.setItem("session_expires", expiresAt.toString());
    localStorage.setItem("last_activity", Date.now().toString());

    // Store dashboard token in sessionStorage (not in URL)
    sessionStorage.setItem("dashboard_token", dashboardToken);
    sessionStorage.setItem("session_start", Date.now().toString());

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

    await Swal.fire({
      icon: "success",
      title: "Welcome Back!",
      text: `Successfully signed in as ${email}`,
      timer: 1500,
      showConfirmButton: false,
    });

    // Redirect to dashboard with CLEAN URL (no hash token)
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Login error:", error);

    let errorMessage = "Invalid email or password";
    if (error.message.includes("Email not confirmed")) {
      errorMessage = "Please verify your email address first";
    } else if (error.message.includes("Invalid login credentials")) {
      errorMessage = "The email or password is incorrect";
    }

    Swal.fire({
      icon: "error",
      title: "Login Failed",
      text: errorMessage,
    });

    loginBtn.innerHTML = originalText;
    loginBtn.disabled = false;
  }
}

// WALANG TESTING CODE - PRODUCTION READY!
