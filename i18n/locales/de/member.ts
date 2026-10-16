// Personal sign-in of staff in the browser: short code and PIN, invite code, account dialog and panel.
export default {
  hello: "Hallo {name}",
  shortCode: "Kürzel",
  login: {
    title: "Persönlich anmelden",
    pinIntro: "Mit deinem Kürzel und deiner PIN siehst du deine Schichten und kannst Ausfälle melden, Schichten abgeben und tauschen.",
    pin: "PIN",
    noPin: "Noch keine PIN?",
    useCode: "Mit dem Code der Planung anmelden",
    codeIntro: "Den persönlichen Code bekommst du von deiner Schichtplanung (Einstellungen → App-Zugänge). Danach legst du deine PIN fest.",
    code: "Persönlicher Code",
    havePin: "Ich habe schon eine PIN",
    setPinIntro: "Du bist angemeldet. Lege jetzt eine PIN fest, dann kannst du dich auf jedem Gerät mit deinem Kürzel {code} anmelden.",
    later: "Später",
    missingPin: "Bitte Kürzel und PIN eingeben",
    missingCode: "Bitte den Code eingeben",
    codeInvalid: "Der Code ist ungültig",
  },
  pin: {
    new: "Neue PIN",
    repeat: "Wiederholen",
    hint: "{min} bis {max} Ziffern. Damit meldest du dich auf jedem Gerät an.",
    mismatch: "Die PINs stimmen nicht überein",
    current: "Bisherige PIN",
    save: "PIN speichern",
    saved: "PIN gespeichert.",
    saveFailed: "PIN konnte nicht gespeichert werden",
    change: "PIN ändern",
    set: "PIN festlegen",
    forgotten: "PIN vergessen? Die Planung kann sie zurücksetzen.",
  },
  account: {
    signedInAs: "Angemeldet als {name}",
    title: "Mein Zugang",
    signOutFailed: "Abmelden hat nicht geklappt",
  },
  panel: {
    marked: "Deine Schichten sind im Plan markiert.",
    failed: "Das hat nicht geklappt",
  },
  // Name of the device in the planner's list of signed-in devices, e.g. „Firefox auf macOS“.
  device: { name: "{browser} auf {system}", browser: "Browser" },
};
