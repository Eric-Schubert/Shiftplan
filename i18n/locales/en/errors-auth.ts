import type de from "../de/errors-auth";

// Planner and admin sign-in, sessions, password changes and user management.
export default {
  loginRequired: "Not authorised – please sign in",
  forbidden: "You do not have permission for this action",
  csrfInvalid: "Invalid security token – please reload the page",
  usernameRequired: "Username is required",
  passwordRequired: "Password is required",
  invalidCredentials: "Invalid sign-in details",
  passwordTooLong: "Password is too long",
  tooManyLogins: "Too many sign-in attempts. Please wait.",
  loginFailed: "Sign-in failed",
  demoPassword: "The password cannot be changed in the demo",
  currentPasswordRequired: "Current password is required",
  newPasswordRequired: "New password is required",
  passwordChangeFailed: "Could not change the password",
  userFieldsRequired: "Username, password and role are required",
  usernameLength: "Username must have between {min} and {max} characters",
  invalidRole: "Invalid role. Allowed: admin, planner",
  usernameTaken: "Username is already taken",
  invalidUserId: "Invalid user ID",
  cannotDeleteSelf: "You cannot delete yourself",
  userNotFound: "User not found",
  lastAdmin: "The last admin cannot be deleted",
  // The rules of auth.passwordPolicy, in the order they are checked. Same texts as the web form.
  password: {
    minLength: "Password must have at least {min} characters",
    maxLength: "Password can have at most {max} characters",
    uppercase: "Password must contain at least one uppercase letter",
    lowercase: "Password must contain at least one lowercase letter",
    number: "Password must contain at least one number",
  },
} satisfies typeof de;
