import type de from "../de/settings-members";

// Settings tab “App access”: personal QR codes, PINs and signed-in devices per person.
export default {
  intro:
    "Each person gets their own QR code for the Shiftplan app or the browser. At their first sign-in they set a PIN, and after that they sign in on any device with their short code and PIN. A code is valid for 7 days and can only be used once. If someone loses their phone, you revoke the device here. Forgotten PIN: reset the PIN and create a new QR code.",
  pinSet: "PIN set ·",
  resetPin: "Reset PIN",
  noPin: "No PIN yet",
  noDevice: "No device set up yet",
  unnamedDevice: "Unnamed device",
  lastSeen: "· last seen {time}",
  revoke: "Revoke",
  createInvite: "Create QR code",
  inviteFailed: "QR code could not be created",
  revokeFailed: "Device could not be revoked",
  resetPinFailed: "PIN could not be reset",
  invite: {
    header: "App access for {name}",
    qrLabel: "Personal QR code for {name}",
    scan: "Scan with the Shiftplan app or open in the browser. Without a camera, use the code:",
    validUntil: "Valid until {until}, can only be used once. Only give it to {name}.",
  },
  revokeDialog: {
    header: "Revoke device",
    text: "{name}’s device “{device}” will be signed out and will no longer receive notifications. To give access again, just create a new QR code.",
  },
} satisfies typeof de;
