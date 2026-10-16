import type de from "../de/settings-auth";

// Planner sign-in on the settings page, the demo hint and the change-password dialog.
export default {
  username: "Username",
  password: "Password",
  // The password rules, until the instance config with its own hint has loaded.
  passwordHint: "At least 8 characters with upper and lower case letters and a number",
  login: {
    intro: "Sign in to manage shifts, patterns and users.",
    sessionExpired: "Your session has expired. Please sign in again.",
    usernamePlaceholder: "e.g. shiftlead",
    passwordPlaceholder: "Enter password",
    usernameMissing: "Please enter your username",
    passwordMissing: "Please enter your password",
    failed: "Sign-in failed",
    error: "Error signing in",
  },
  demo: {
    title: "Demo access",
    user: "User",
    reset: "The demo is reset regularly.",
    fill: "Fill in demo credentials",
  },
  changePassword: {
    done: "Password changed successfully.",
    current: "Current password",
    currentPlaceholder: "Enter current password",
    new: "New password",
    repeat: "Confirm new password",
    repeatPlaceholder: "Repeat new password",
    allFields: "Fill in all fields",
    mismatch: "The new passwords do not match",
    failed: "Password could not be changed",
  },
} satisfies typeof de;
