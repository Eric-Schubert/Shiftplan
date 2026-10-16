// Settings tab „App-Zugänge“: personal QR codes, PINs and signed-in devices per person.
export default {
  intro:
    "Jede Person bekommt einen eigenen QR-Code für die Shiftplan-App oder den Browser. Bei der ersten Anmeldung legt sie eine PIN fest und meldet sich danach auf jedem Gerät mit Kürzel und PIN an. Ein Code ist 7 Tage gültig und nur einmal nutzbar. Verliert jemand sein Handy, sperrst du hier das Gerät. PIN vergessen: PIN zurücksetzen und einen neuen QR-Code erzeugen.",
  pinSet: "PIN festgelegt ·",
  resetPin: "PIN zurücksetzen",
  noPin: "Noch keine PIN",
  noDevice: "Noch kein Gerät eingerichtet",
  unnamedDevice: "Unbenanntes Gerät",
  lastSeen: "· zuletzt {time}",
  revoke: "Sperren",
  createInvite: "QR-Code erzeugen",
  inviteFailed: "QR-Code konnte nicht erzeugt werden",
  revokeFailed: "Gerät konnte nicht gesperrt werden",
  resetPinFailed: "PIN konnte nicht zurückgesetzt werden",
  invite: {
    header: "App-Zugang für {name}",
    qrLabel: "Persönlicher QR-Code für {name}",
    scan: "Mit der Shiftplan-App scannen oder im Browser öffnen. Ohne Kamera geht auch der Code:",
    validUntil: "Gültig bis {until}, nur einmal nutzbar. Nur an {name} weitergeben.",
  },
  revokeDialog: {
    header: "Gerät sperren",
    text: "„{device}“ von {name} wird abgemeldet und bekommt keine Benachrichtigungen mehr. Für einen neuen Zugang einfach einen neuen QR-Code erzeugen.",
  },
};
