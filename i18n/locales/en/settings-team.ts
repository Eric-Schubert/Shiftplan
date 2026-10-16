import type de from "../de/settings-team";

// Settings tab “Team access”: team access code, QR code and link, app name, week start, default language.
export default {
  intro:
    "With a team access code, only your team sees the shift plan. Staff members do not need their own account: they scan the QR code, see the plan and can turn on notifications. Only planners and admins can change shifts, as before.",
  codeActive: "Access code active",
  public: "Plan publicly visible",
  subscribers: "1 device with push notifications | {count} devices with push notifications",
  setUp: "Set up team access code",
  saveFailed: "Team access code could not be saved",
  card: {
    qrLabel: "QR code for {link}",
    link: "Direct link",
    copy: "Copy link",
    copied: "Copied",
    copyFailed: "Link could not be copied",
    generate: "Generate new code",
    remove: "Remove code",
  },
  confirm: {
    removeHeader: "Remove team access code",
    firstHeader: "Set team access code",
    changeHeader: "Change team access code",
    remove: "Remove",
    first: "Set code",
    change: "Change code",
    removeText:
      "Anyone with the link can then read the shift plan again. Existing notifications stay active.",
    firstText:
      "Notifications turned on without a personal sign-in are deleted. The team enters the code once and turns them on again. {keepsPersonal}",
    changeText:
      "All devices using the old code are signed out and their notifications deleted. The team has to enter the new code once and turn on notifications again. {keepsPersonal}",
    keepsPersonal: "Devices with a personal sign-in stay signed in and keep their notifications.",
  },
  customCode: { label: "Set your own code (optional)", placeholder: "at least 6 characters" },
  name: {
    label: "Name in the app",
    placeholder: "e.g. Nursing team North",
    saved: "Saved",
    failed: "Name could not be saved",
  },
  weekStart: {
    label: "Show next week from Saturday",
    hint: "Suits teams without weekend shifts. If you work on Saturday or Sunday, turn it off. The plan and “Today” then show the current week until Sunday.",
  },
  locale: {
    label: "Default language",
    hint: "Applies to everyone who has not picked a language and whose browser uses none of the languages offered, and to the app and contact mails.",
  },
} satisfies typeof de;
