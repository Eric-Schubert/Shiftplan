import type de from "../de/member";

// Personal sign-in of staff in the browser: short code and PIN, invite code, account dialog and panel.
export default {
  hello: "Hello {name}",
  shortCode: "Short code",
  login: {
    title: "Personal sign-in",
    pinIntro:
      "With your short code and PIN you can see your shifts, report absences, and give away or swap shifts.",
    pin: "PIN",
    noPin: "No PIN yet?",
    useCode: "Sign in with the code from your planners",
    codeIntro:
      "You get your personal code from your planners (Settings → App access). After that, you set your PIN.",
    code: "Personal code",
    havePin: "I already have a PIN",
    setPinIntro:
      "You are signed in. Set a PIN now, then you can sign in on any device with your short code {code}.",
    later: "Later",
    missingPin: "Please enter your short code and PIN",
    missingCode: "Please enter the code",
    codeInvalid: "The code is invalid",
  },
  pin: {
    new: "New PIN",
    repeat: "Repeat",
    hint: "{min} to {max} digits. You use it to sign in on any device.",
    mismatch: "The PINs do not match",
    current: "Current PIN",
    save: "Save PIN",
    saved: "PIN saved.",
    saveFailed: "PIN could not be saved",
    change: "Change PIN",
    set: "Set PIN",
    forgotten: "Forgotten your PIN? Your planners can reset it.",
  },
  account: {
    signedInAs: "Signed in as {name}",
    title: "My account",
  },
  panel: {
    marked: "Your shifts are highlighted in the plan.",
    failed: "That did not work",
  },
  // Name of the device in the planner's list of signed-in devices, e.g. “Firefox on macOS”.
  device: { name: "{browser} on {system}", browser: "Browser" },
} satisfies typeof de;
