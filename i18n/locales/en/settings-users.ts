import type de from "../de/settings-users";

// Settings tab “Users”: planner and admin accounts, the create and delete dialogs.
export default {
  intro: "Manage users and their permissions",
  create: "New user",
  empty: "No users yet",
  form: {
    usernamePlaceholder: "e.g. shiftlead",
    caseSensitive: "The sign-in is case-sensitive.",
    role: "Role",
    roles: { planner: "Planner – may change shift assignments", admin: "Admin – full access" },
    required: "Username and password are required.",
    usernameTooShort: "The username needs at least {min} characters.",
    failed: "Error creating the user",
  },
  delete: "Delete user",
  deleteText: "Are you sure you want to delete user {name}? This cannot be undone.",
  deleteFailed: "User could not be deleted.",
} satisfies typeof de;
