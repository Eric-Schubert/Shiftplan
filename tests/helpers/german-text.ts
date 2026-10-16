import { isGermanProse } from "../../scripts/check-english.js";
import { tokenize } from "../../scripts/english/tokenize.js";

type Token = { kind: string; text: string; line: number };

// Short UI texts such as „Anfrage abgelehnt“ or „Neue Anfrage“ have neither umlauts nor two stopwords.
// Stems also catch compounds („Tauschanfrage“); the whole words would match English or code as prefixes.
const WORD_STEMS = /\b(?:anfrage|tausch|schicht|storno|ausfall|planung|zusage|nachricht|ersatz)/i;
const WORDS =
  /\b(?:abbrechen|abmelden|aktivieren|aktuell|alle|anmelden|ansicht|austragen|bearbeiten|benutzer|bitte|eintragen|einstellungen|ende|entfernen|erneut|fehler|fehlgeschlagen|feiertage?|ferien|fertig|generieren|geladen|gespeichert|grund|heute|hinweis|(?:in)?aktiv|kalender|kopiert|laden|mitarbeiter\w*|muster|neue?[rs]?|notiz|offen|passwort|planer|rolle|schulferien|seite|senden|speichern|sperren|tage|teilzeit|unbekannt\w*|unbesetzt|unterbesetzt|vertretung|vollzeit|vorschau|weiter|wochen?|zeit|zeitraum|zugangscode|zuweisen)\b/i;
// German UI words that are also English or code words, so only capitalized as a label: „Start“.
const CAPITALIZED_WORDS = /\bStart\b/;
// Paths, query strings, catalog keys and identifiers are not texts:
// "/?anfragen=1", "push.requests.cancelled.title", "schichtplaner_pushPromptDismissed".
const NOT_TEXT = /^[/?#]|^[a-z]\w*(?:\.\w+)+$|^\w+_\w+$/;
// Umlauts and the sharp s, also written as escapes such as \u00e4 in the source.
const UMLAUTS = /[äöüß]|\\u00[c-f][0-9a-f]/i;

/** An umlaut, two German stopwords or one German UI word, outside paths, keys and identifiers. */
export function isGermanText(text: string): boolean {
  // isGermanProse skips quoted parts (fine for comments); in a UI text the quotes are part of it.
  const unquoted = text.replace(/[„“”"'`]/g, "");
  return UMLAUTS.test(text) || isGermanProse(unquoted) || (!NOT_TEXT.test(text) && hasGermanWord(text));
}

/** One German UI word or stem, without the umlaut and stopword checks: for regex literals, where „ä“ may be fine. */
export function hasGermanWord(text: string): boolean {
  return WORD_STEMS.test(text) || WORDS.test(text) || CAPITALIZED_WORDS.test(text);
}

/**
 * String literals outside comments as [line, text]. A template literal is one text with `{}` for
 * each expression, so „{} kann {} nicht tauschen.“ still shows its two stopwords.
 */
export function stringTexts(source: string, firstLine = 1): Array<[number, string]> {
  const texts: Array<[number, string]> = [];
  const open: Array<[number, string]> = [];
  for (const { kind, text, line } of tokenize(source, firstLine) as Token[]) {
    if (kind !== "string") continue;
    const content = text.replace(/^["'`}]/, "").replace(/(?:["'`]|\$\{)$/, "");
    const opens = text.startsWith("`") && text.endsWith("${");
    const continues = text.startsWith("}") && open.length > 0;
    if (opens) open.push([line, content]);
    else if (continues && text.endsWith("${")) open[open.length - 1]![1] += `{}${content}`;
    else if (continues) {
      const [start, before] = open.pop()!;
      texts.push([start, `${before}{}${content}`]);
    } else texts.push([line, content]);
  }
  return texts;
}
