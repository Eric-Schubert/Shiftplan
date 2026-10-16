import { parse } from "vue/compiler-sfc";
import { ALLOWED_IDENTIFIERS, isGermanProse } from "../../scripts/check-english.js";
import { tokenize } from "../../scripts/english/tokenize.js";
import { SHORT_NAME_KEYS } from "~/utils/holiday";

type Token = { kind: string; text: string; line: number };
type Finding = { line: number; text: string };

// Wire values and data that stay German: query parameters, absence reasons, holiday names from the API.
const ALLOWED = new Set([...ALLOWED_IDENTIFIERS, ...Object.keys(SHORT_NAME_KEYS), "Shiftplan"]);
// Attributes no one reads. Every other static attribute is text, so any word in it counts.
const TECHNICAL_ATTRS = new Set([
  "accept", "aria-busy", "aria-describedby", "aria-hidden", "aria-labelledby", "autocapitalize", "autocomplete",
  "autocorrect", "class", "draggable", "empty-icon", "field", "for", "height", "href", "icon", "icon-pos", "id",
  "id-prefix", "input-id", "inputmode", "keypath", "maxlength", "name", "option-label", "option-value", "ref", "rel",
  "role", "rows", "scope", "severity", "size", "spellcheck", "src", "style", "tabindex", "tag", "target", "to",
  "type", "value", "width",
]);
// One of these words makes a string in code German, even without umlauts or two stopwords („Neue Anfrage“).
const GERMAN_WORDS =
  /\b(?:abbrechen|abmelden|aktivieren|aktuell|alle|anfragen?|anmelden|ansicht|ausfall|austragen|bearbeiten|benutzer|bitte|eintragen|einstellungen|entfernen|ersatz|erneut|fehler|fehlgeschlagen|feiertage?|ferien|fertig|generieren|geladen|gespeichert|grund|heute|hinweis|kalender|laden|mitarbeiter\w*|muster|nachricht|neue?[rs]?|notiz|offen|passwort|planer|planung|schicht(?:en)?|schichtplan(?:s|er)?|schulferien|senden|speichern|storno|tage|tausch(?:en)?|unbekannt\w*|unbesetzt|unterbesetzt|vertretung|weiter|wochen?|zeitraum|zugangscode|zusagen?|zuweisen)\b/i;
// Paths, query strings and catalog keys are not texts: "/settings", "?einladung=1", "app.push.header".
const NOT_TEXT = /^[/?#]|^[a-z]\w*(?:\.\w+)+$/;
// Umlauts and the sharp s, also written as escapes such as \u00e4 in the source.
const UMLAUTS = /[äöüß]|\\u00[c-f][0-9a-f]/i;

function isGermanCode(text: string): boolean {
  if (ALLOWED.has(text) || NOT_TEXT.test(text)) return false;
  return UMLAUTS.test(text) || isGermanProse(text.replace(/[„“”"'`]/g, "")) || GERMAN_WORDS.test(text);
}

/** Strings in code without comments. A template literal is one text with {} per expression. */
function codeStrings(source: string, firstLine: number): Finding[] {
  const found: Finding[] = [];
  const open: Finding[] = [];
  for (const { kind, text, line } of tokenize(source, firstLine) as Token[]) {
    if (kind !== "string") continue;
    const content = text.replace(/^["'`}]/, "").replace(/(?:["'`]|\$\{)$/, "");
    const continues = text.startsWith("}") && open.length > 0;
    if (text.startsWith("`") && text.endsWith("${")) open.push({ line, text: content });
    else if (continues && text.endsWith("${")) open[open.length - 1]!.text += `{}${content}`;
    else if (continues) {
      const start = open.pop()!;
      found.push({ line: start.line, text: `${start.text}{}${content}` });
    } else found.push({ line, text: content });
  }
  return found;
}

/** Text nodes and readable attributes of a template, plus the strings in its expressions. */
function templateTexts(node: any, found: { markup: Finding[]; code: Finding[] }) {
  for (const prop of node.props ?? []) {
    const line = prop.loc.start.line;
    if (prop.type === 6 && prop.value && !TECHNICAL_ATTRS.has(prop.name)) found.markup.push({ line, text: prop.value.content });
    if (prop.type === 7 && prop.exp) found.code.push(...codeStrings(prop.exp.content, line));
  }
  for (const child of node.children ?? []) {
    if (child.type === 2) found.markup.push({ line: child.loc.start.line, text: child.content });
    else if (child.type === 5) found.code.push(...codeStrings(child.content.content, child.loc.start.line));
    else templateTexts(child, found);
  }
}

/**
 * German strings of one file as "line: text". In markup any word counts; in code, bindings included,
 * an umlaut, two stopwords or one German UI word.
 */
export function germanLiterals(file: string, source: string): string[] {
  const found = { markup: [] as Finding[], code: [] as Finding[] };
  if (file.endsWith(".vue")) {
    const { descriptor } = parse(source, { filename: file });
    for (const block of [descriptor.script, descriptor.scriptSetup]) {
      if (block) found.code.push(...codeStrings(block.content, block.loc.start.line));
    }
    if (descriptor.template?.ast) templateTexts(descriptor.template.ast, found);
  } else found.code.push(...codeStrings(source, 1));

  const markup = found.markup.filter(({ text }) => /\p{L}{2}/u.test(text) && !ALLOWED.has(text.trim()));
  const code = found.code.filter(({ text }) => isGermanCode(text));
  return [...markup, ...code].sort((a, b) => a.line - b.line).map(({ line, text }) => `${line}: ${text.trim()}`);
}
