// Pushes about takeover and swap requests. {name} is the person who acted, {request} the shift
// and days („Spät, Fr. 09.10.“). Every entry has a title and a body.
export default {
  takeoverWanted: { title: "Übernahme gesucht", body: "{name} sucht Ersatz: {request}" },
  swapAsked: { title: "Tauschanfrage", body: "{name} möchte {request} die Schichten mit dir tauschen." },
  takeoverPromised: {
    title: "Übernahme zugesagt",
    body: "{name} hat zugesagt ({request}). Die Planung muss noch freigeben.",
  },
  swapPromised: {
    title: "Tausch zugesagt",
    body: "{name} hat zugesagt ({request}). Die Planung muss noch freigeben.",
  },
  takenOver: { title: "Schicht übernommen", body: "{name} übernimmt {request}." },
  swapAgreed: { title: "Tausch steht", body: "{name} hat dem Tausch zugestimmt ({request})." },
  takeoverApproved: { title: "Anfrage freigegeben", body: "Die Planung hat die Übernahme freigegeben ({request})." },
  swapApproved: { title: "Anfrage freigegeben", body: "Die Planung hat den Tausch freigegeben ({request})." },
  rejected: { title: "Anfrage abgelehnt", body: "Die Planung hat {request} nicht freigegeben." },
  takeoverReverted: { title: "Anfrage zurückgenommen", body: "Die Planung hat die Übernahme ({request}) zurückgenommen." },
  swapReverted: { title: "Anfrage zurückgenommen", body: "Die Planung hat den Tausch ({request}) zurückgenommen." },
  takeoverUndoAsked: {
    title: "Storno angefragt",
    body: "{name} möchte die Übernahme ({request}) stornieren. Bitte bestätigen oder ablehnen.",
  },
  swapUndoAsked: {
    title: "Storno angefragt",
    body: "{name} möchte den Tausch ({request}) stornieren. Bitte bestätigen oder ablehnen.",
  },
  undoConfirmed: { title: "Storno bestätigt", body: "{name} hat den Storno bestätigt. {request} ist wieder wie vorher." },
  undoDeclined: { title: "Storno abgelehnt", body: "{name} möchte {request} so lassen, wie es ist." },
  swapDeclined: { title: "Tausch abgelehnt", body: "{name} kann {request} nicht tauschen." },
  takeoverWithdrawn: {
    title: "Zusage zurückgezogen",
    body: "{name} übernimmt {request} doch nicht. Die Übernahme ist wieder offen.",
  },
  swapWithdrawn: { title: "Zusage zurückgezogen", body: "{name} möchte {request} doch nicht tauschen." },
  cancelled: { title: "Anfrage zurückgezogen", body: "{name} hat die Anfrage ({request}) zurückgezogen." },
};
