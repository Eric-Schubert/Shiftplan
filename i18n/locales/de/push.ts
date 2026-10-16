import requests from "./push-requests";

// Push notifications. The OS shows them as sent, so each recipient gets them in their language.
export default {
  change: {
    teamTitle: "Schichtplan geändert",
    ownTitle: "Deine Schicht hat sich geändert",
    // A change of a single day carries its date: „Früh Di. 13.10.“
    dayShift: "{shift} {day}",
    group: "{week} · {shift}",
    line: "{group}: {changes}",
    added: "neu: {names}",
    removed: "entfällt: {names}",
    more: "… und {count} weitere Änderung | … und {count} weitere Änderungen",
    // App texts name no people: „KW 41: Früh, Spät“
    weekShifts: "{week}: {shifts}",
    weeks: "Änderungen in {weeks}",
  },
  absence: {
    title: "Ausfall im Team",
    days: "{name} fällt {days} aus",
    shiftOpen: "{name} fällt {days} aus – {shift} offen",
    seekingTakeover: "{notice} – wer übernimmt?",
  },
  team: {
    title: "Nachricht vom Schichtplaner",
  },
  // A takeover names its shift: „Spät, Fr. 09.10.“; a swap only its days.
  requestShift: "{shift}, {days}",
  requests,
};
