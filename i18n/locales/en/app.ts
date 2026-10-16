import type de from "../de/app";

// App shell: push dialog, team access gate, layout, settings page frame and error page.
export default {
  push: {
    header: "Notifications",
    changeFailed: "Notifications could not be changed",
    checking: "Checking status.",
    install: {
      intro: "On iPhone, notifications only arrive when Shiftplan is on your Home Screen as an app (iOS 16.4 or later).",
      share: "In Safari, tap {share}.",
      shareLabel: "Share",
      add: "Choose “Add to Home Screen”.",
      open: "Open Shiftplan from the Home Screen and tap the bell there.",
    },
    unsupported: "This browser does not support push notifications. Use Chrome, Edge, Firefox or Safari, for example.",
    denied:
      "Notifications are blocked for this site. Allow them in your browser settings (iPhone: Settings → Notifications → Shiftplan) and reload the page.",
    intro: "You get a notification when shifts change this week or next week, or when your planners message the team directly.",
    active: "Active on this device.",
    disable: "Turn off",
    noAccess: "No access to the shift plan",
  },
  teamAccess: {
    title: "Open the shift plan",
    intro: "Enter the access code you got from your planners. With the QR code, there is no need to type it.",
    code: "Access code",
    codeMissing: "Please enter the access code",
    open: "Open plan",
    memberLogin: "Sign in with short code and PIN",
    plannerLogin: "Sign in as planner",
    linkExpired: "The access code from the link is no longer valid.",
  },
  layout: {
    skipToContent: "Skip to content",
    roles: { admin: "Admin", planner: "Planner" },
    changelog: "Show version history",
    push: { on: "Notifications active", off: "Set up notifications" },
    theme: { light: "Switch to light mode", dark: "Switch to dark mode" },
    settings: { open: "Open settings", back: "Back to the shift plan" },
    imprint: "Legal notice",
    privacy: "Privacy",
    language: "Language",
    dataFailed: "Staff, shifts and the rotation pattern could not be loaded.",
  },
  settingsPage: {
    checking: "Checking session.",
    noAccess: "No access",
    noAccessText: "This area is only available to planners and administrators.",
    title: "Settings",
    intro: {
      admin: "Staff members, shifts, users and rotation patterns are managed centrally here.",
      planner: "Here you can maintain rotation patterns and generate shift plans from templates.",
    },
    changePassword: "Change password",
  },
  // Shown and sent to the push relay while the planner has not named the instance; never stored.
  instance: { defaultName: "Shift planner" },
  // Name and description of the installed web app (server/routes/manifest.json.ts).
  manifest: {
    name: "Shiftplan",
    shortName: "Shiftplan",
    description: "Plan shifts in the browser, view them as a team in the app.",
  },
  error: {
    title: { notFound: "Page not found · Shiftplan", other: "Error · Shiftplan" },
    code: "Error {code}",
    heading: { notFound: "This page does not exist", other: "Something went wrong" },
    text: {
      notFound: "The link is out of date or mistyped. The shift plan itself is still available.",
      other: "The server could not process the request. Reload the page or try again in a moment.",
    },
  },
} satisfies typeof de;
