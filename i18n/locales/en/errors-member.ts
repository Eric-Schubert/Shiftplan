import type de from "../de/errors-member";

// Member access: PIN sign-in, invites and the devices of a member.
export default {
  loginFailed: "Short code or PIN is incorrect",
  notSignedIn: "Not signed in or access blocked",
  wrongPin: "The current PIN is incorrect",
  pinLength: "The PIN needs {min} to {max} digits",
  pinWeak: "This PIN is too easy to guess",
  inviteInvalid: "The QR code is invalid, has expired or has already been used",
  staffNotFound: "Staff member not found or inactive",
  deviceNotFound: "Device not found",
} satisfies typeof de;
