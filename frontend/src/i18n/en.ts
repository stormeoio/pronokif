/**
 * English translations.
 */
const en = {
  // ── App-level ─────────────────────────────────────
  app: {
    skip_to_content: "Skip to main content",
  },

  // ── Navigation ────────────────────────────────────
  nav: {
    home: "Home",
    predictions: "Preds",
    championship: "Champ.",
    leagues: "Leagues",
    profile: "Profile",
    aria_label: "Main navigation",
  },

  // ── Auth ──────────────────────────────────────────
  auth: {
    tagline: {
      main: "Make your predictions, challenge your friends,\nlive F1 like never before.",
      footer: "Predict. Challenge.",
      footer_accent: "Live it.",
    },
    tabs: {
      login: "Login",
      register: "Sign Up",
    },
    form: {
      email_label: "Email",
      email_placeholder: "you.com",
      password_label: "Password",
      remember_me: "Remember me",
      forgot_password: "Forgot?",
    },
    login: {
      submit: "Log in",
      loading: "Logging in...",
      success: "Logged in!",
    },
    register: {
      username_label: "Driver alias",
      username_placeholder: "VerstappenFan, LeclercSZN...",
      password_placeholder: "8 characters minimum",
      nationality_label: "Nationality",
      nationality_placeholder: "Select your country",
      submit: "Create my account",
      loading: "Creating...",
      success: "Account created!",
    },
    magic_link: {
      send: "Get a magic link",
      sent: "Link sent ✓",
      verifying: "Verifying magic link...",
      email_required: "Enter your email to get a magic link",
      send_error: "Failed to send magic link",
      send_success: "Magic link sent!",
      success: "Magic link confirmed!",
      invalid: "Invalid or expired magic link",
    },
    social: {
      divider: "or continue with",
    },
    footer: {
      new_user: "New here?",
      register_link: "Join the race",
      existing_user: "Already signed up?",
      login_link: "Log in",
    },
    error: {
      generic: "Something went wrong",
    },
  },

  // ── Username setup ────────────────────────────────
  username: {
    progress: "Step 3/3",
    title: "Pick your alias",
    subtitle: "This is how your friends will see you.",
    placeholder: "SpeedyMax",
    validation: {
      char_count: "3-20 chars",
      allowed: "Letters, digits, _",
    },
    preview_badge: "New",
    submit: "Let's go!",
    loading: "Saving...",
    success: "Username saved!",
    taken: "This username is already taken",
  },

  // ── Password ──────────────────────────────────────
  password: {
    forgot: {
      title: "Forgot your password?",
      subtitle: "Enter your email to receive a reset link.",
      email_placeholder: "you.com",
      submit: "Send reset link",
      loading: "Sending...",
      success_title: "Email sent",
      success_message:
        "If an account exists for this email, you'll receive a link to reset your password.",
      resend_timer: "Resend in {{seconds}}s",
      resend: "Resend email",
      open_mailbox: "Open my mailbox",
      back: "Back to login",
      error: "Something went wrong. Try again.",
    },
    reset: {
      title: "New password",
      subtitle: "Choose a secure password.",
      password_label: "New password",
      confirm_label: "Confirm",
      submit: "Reset password",
      loading: "Resetting...",
      success_title: "Password changed",
      success_message: "You can now log in with your new password.",
      success_login: "Log in",
      invalid_title: "Invalid link",
      request_new: "Request a new link",
      invalid_link: "Invalid reset link",
      mismatch: "Passwords don't match",
      invalid_criteria: "Password doesn't meet all requirements",
      match_ok: "Passwords match",
      match_fail: "Doesn't match",
      error: "Failed to reset password",
      rules: {
        characters: "8+ characters",
        uppercase: "1 uppercase",
        lowercase: "1 lowercase",
        digit: "1 digit",
      },
      strength: {
        weak: "Weak",
        medium: "Medium",
        good: "Good",
        strong: "Strong",
      },
    },
  },

  // ── Email verification ────────────────────────────
  email_verification: {
    message: "Verify your email to secure your account.",
    resend: "Resend",
    sending: "Sending...",
    sent: "Verification email sent!",
    error: "Failed to send",
    close: "Close",
  },
};

export default en;
