import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { tokenize } from "./english/tokenize.js";
import { repoFiles } from "./repo-files.js";

// Code, comments, test titles and log messages are English. UI text lives in strings and is not checked.
const CHECKED = /\.(vue|ts|js|mjs|cjs|sh|ya?ml)$/;
const TEST_FILE = /^tests\/|\.test\.ts$/;

// prettier-ignore
const STOPWORDS = new Set([
  "der", "die", "das", "den", "dem", "und", "wird", "werden", "nicht", "für", "mit", "wenn", "ist", "sind",
  "ein", "eine", "einen", "oder", "auch", "bei", "nur", "noch", "dass", "kein", "keine", "über", "ohne",
  "zum", "zur", "vom", "wir", "muss", "soll", "kann", "sonst", "alle", "weil", "damit", "hier", "schon",
  "fuer", "ueber",
]);
// Operators read console output, so a single one of these words already makes a log message German.
const LOG_WORDS = /\b(?:fehlgeschlagen|konnte|nicht|ungültig|ungueltig|fehler|unbekannt\w*)\b/i;
const GERMAN_STEMS =
  /kuerzel|kürzel|woche|schicht|mitarbeit|urlaub|einladung|zugang|anfrage|tausch|feiertag|ferien|frueh|spaet|loesch|datenschutz|impressum|^kw|kw$/i;
// Public wire values that stay German: query parameters (?einladung, ?zugang, ?anfragen) and absence reasons.
export const ALLOWED_IDENTIFIERS = new Set(["einladung", "zugang", "anfragen", "urlaub", "privat", "sonstiges"]);
// Quoted text may name German UI labels or fixture data.
const QUOTED = /„[^“]*“|“[^”]*”|"(?:[^"\\]|\\.)*"|(?<!\p{L})'[^']*'(?!\p{L})|`[^`]*`/gu;
const TEST_CALL = /^(?:describe|it|test|skip|only|todo)$/;
const FULL_STRING = /^(["'`])[\s\S]*\1$/;

export function isGermanProse(text) {
  const prose = text.replace(QUOTED, "");
  if (/[äöüß]/i.test(prose)) return true;
  const words = prose.match(/\p{L}+/gu) ?? [];
  // Count distinct stopwords, so English "die ... die" stays fine. Ignore all-caps words such as MIT.
  const stopwords = words.filter((word) => word !== word.toUpperCase() && STOPWORDS.has(word.toLowerCase()));
  return new Set(stopwords.map((word) => word.toLowerCase())).size >= 2;
}

function isGermanLog(text) {
  return isGermanProse(text) || LOG_WORDS.test(text.replace(QUOTED, ""));
}

export function isGermanIdentifier(name) {
  return !ALLOWED_IDENTIFIERS.has(name) && GERMAN_STEMS.test(name);
}

function lineAt(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function isTestTitle(tokens, index) {
  const call = tokens[index - 2];
  return tokens[index - 1]?.text === "(" && call?.kind === "word" && TEST_CALL.test(call.text);
}

function scanScript(source, firstLine, isTest, report) {
  const tokens = tokenize(source, firstLine);
  let logDepth = 0; // open parentheses of a console.* call, whose strings only operators read
  tokens.forEach((token, index) => {
    const { kind, text, line } = token;
    if (kind === "punct" && text === "(" && (logDepth > 0 || tokens[index - 3]?.text === "console")) logDepth += 1;
    if (kind === "punct" && text === ")" && logDepth > 0) logDepth -= 1;
    if (kind === "comment") report.comment(text, line);
    else if (kind === "word" && isGermanIdentifier(text)) report.add(line, "identifier", text);
    else if (kind === "string" && logDepth > 0 && isGermanLog(text.slice(1, -1))) report.add(line, "log message", text);
    else if (isTest && kind === "string" && FULL_STRING.test(text) && isTestTitle(tokens, index)) {
      if (isGermanProse(text.slice(1, -1))) report.add(line, "test title", text);
    }
  });
}

// "#" starts a comment in shell and YAML when it begins a word outside quotes.
function hashComments(source, report) {
  source.split("\n").forEach((text, index) => {
    let quote = "";
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (quote) {
        if (char === quote) quote = "";
        else if (char === "\\" && quote === '"') i += 1;
      } else if (char === "'" || char === '"') quote = char;
      else if (char === "#" && (i === 0 || /\s/.test(text[i - 1]))) {
        report.comment(text.slice(i), index + 1);
        return;
      }
    }
  });
}

// Vue: script blocks are code, style blocks have CSS comments, the rest is markup.
function scanVue(source, report) {
  let markup = source;
  for (const match of source.matchAll(/<(script|style)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    const start = match.index + match[0].indexOf(">") + 1;
    const firstLine = lineAt(source, start);
    if (match[1] === "script") scanScript(match[2], firstLine, false, report);
    for (const css of match[1] === "style" ? match[2].matchAll(/\/\*[\s\S]*?\*\//g) : []) {
      report.comment(css[0], firstLine + lineAt(match[2], css.index) - 1);
    }
    markup = markup.replace(match[0], match[0].replace(/[^\n]/g, ""));
  }
  for (const html of markup.matchAll(/<!--[\s\S]*?-->/g)) report.comment(html[0], lineAt(markup, html.index));
}

/** German comments, identifiers, test titles and log messages in one file, as { line, kind, text }. */
export function findGerman(file, source) {
  const findings = [];
  const report = {
    add: (line, kind, text) => findings.push({ line, kind, text }),
    // A block comment counts as a whole and is reported at its first line.
    comment: (text, line) => {
      if (isGermanProse(text)) findings.push({ line, kind: "comment", text: text.replace(/\s+/g, " ").trim().slice(0, 120) });
    },
  };
  if (/\.(sh|ya?ml)$/.test(file)) hashComments(source, report);
  else if (file.endsWith(".vue")) scanVue(source, report);
  else scanScript(source, 1, TEST_FILE.test(file), report);
  return findings.sort((a, b) => a.line - b.line);
}

export function findGermanInFiles(files, readFile = (file) => fs.readFileSync(file, "utf-8")) {
  return files
    .filter((file) => CHECKED.test(file))
    .flatMap((file) => findGerman(file, readFile(file)).map((finding) => ({ file, ...finding })));
}

function main() {
  const files = repoFiles();
  const findings = findGermanInFiles(files);

  if (findings.length === 0) {
    console.log("No German comments, identifiers, test titles or log messages found.");
    return;
  }

  for (const { file, line, kind, text } of findings) {
    console.error(`::error file=${file},line=${line}::German ${kind}: ${text}`);
  }
  console.error(`${findings.length} findings. Write them in English; German UI text belongs in strings.`);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
