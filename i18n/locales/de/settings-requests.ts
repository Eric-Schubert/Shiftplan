// Settings tab „Anfragen“: takeover and swap requests the planning approves, reverts or follows.
export default {
  intro:
    "In der App können Mitarbeitende eine Übernahme für eine Schicht suchen oder mit einer Kollegin oder einem Kollegen für einen Zeitraum alle Schichten tauschen. Der Wochenplan bleibt dabei unverändert, geändert wird nur der betroffene Zeitraum.",
  approval: {
    label: "Freigabe durch die Planung",
    hint: "Ist das aus, gilt eine Übernahme oder ein Tausch, sobald die Kollegin oder der Kollege zusagt. Ist es an, muss die Planung danach noch freigeben.",
  },
  approve: "Freigeben",
  revert: "Zurücknehmen",
  recent: "Offene und letzte Anfragen",
  empty: "Noch keine Anfragen.",
  failed: "Die Anfrage konnte nicht geändert werden",
  // One request in a line: who, which shift, who helps.
  summary: {
    takenBy: "{name} übernimmt",
    seeking: "sucht Ersatz",
    swap: "{requester} ↔ {partner} tauschen alle Schichten",
  },
  decidedBy: "{status} · {name}",
  decidedByUndo: "{status} · {name} per Storno",
};
