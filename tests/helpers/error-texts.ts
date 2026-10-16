import { isGermanProse } from "../../scripts/check-english.js";
import { tokenize } from "../../scripts/english/tokenize.js";

type Token = { kind: string; text: string; line: number };

// The one file that builds HTTP errors itself; everything else goes through its apiError.
export const API_ERROR_FILE = "server/utils/api-error.ts";

const CATALOG_KEY = /^[a-z]\w*(?:\.\w+)+$/;
const GERMAN_WORDS = /\b(?:nicht|kein\w*|fehlt|fehler\w*|ungültig\w*|ungueltig\w*|unbekannt\w*|erforderlich|gefunden|bitte)\b/i;
const hasLetters = (text: string) => /\p{L}/u.test(text);
const isGerman = (text: string) => /[äöüß]/i.test(text) || isGermanProse(text) || GERMAN_WORDS.test(text);

/** Text of a string token or template piece without its quotes and `${` ends. */
function stringContent(text: string): string {
  return text.replace(/^["'`}]/, "").replace(/(?:["'`]|\$\{)$/, "");
}

/** createError and every name it is imported as (`createError as httpError`). */
function createErrorNames(tokens: Token[]): Set<string> {
  const names = new Set(["createError"]);
  tokens.forEach((token, index) => {
    if (token.text === "createError" && tokens[index + 1]?.text === "as") names.add(tokens[index + 2]?.text ?? "");
  });
  return names;
}

/** Contents of the string tokens between the parenthesis at `open` and its partner. */
function argumentStrings(tokens: Token[], open: number): string[] {
  const strings: string[] = [];
  let depth = 0;
  for (let at = open; at < tokens.length; at++) {
    const { kind, text } = tokens[at]!;
    if (kind === "punct" && text === "(") depth += 1;
    if (kind === "punct" && text === ")" && --depth === 0) break;
    if (kind === "string") strings.push(stringContent(text));
  }
  return strings;
}

/**
 * Error text that bypasses the message catalog, as "file:line text":
 * - any createError call (also under an alias) and any setResponseStatus text outside api-error.ts,
 * - statusMessage or statusText set outside api-error.ts (object literals, `throw { ... }`, assignments),
 * - German in `new Error(...)`, `new TypeError(...)` and friends; XlsxError takes catalog keys only.
 */
export function errorTextFindings(file: string, source: string): string[] {
  const tokens = (tokenize(source) as Token[]).filter((token) => token.kind !== "comment");
  const creators = createErrorNames(tokens);
  const own = file === API_ERROR_FILE;
  const found: string[] = [];
  tokens.forEach((token, index) => {
    if (token.kind !== "word") return;
    const [previous, next] = [tokens[index - 1]?.text, tokens[index + 1]?.text];
    const report = (text: string) => found.push(`${file}:${token.line} ${text}`);
    const texts = () => argumentStrings(tokens, index + 1);

    if (!own && next === "(" && previous !== "import" && creators.has(token.text)) {
      report(texts().find(hasLetters) ?? token.text);
    } else if (!own && next === "(" && token.text === "setResponseStatus") {
      texts().filter(hasLetters).forEach(report);
    } else if (!own && /^status(?:Message|Text)$/.test(token.text) && (previous !== "." || next === "=")) {
      report(token.text);
    } else if (previous === "new" && next === "(" && /Error$/.test(token.text)) {
      const keysOnly = token.text === "XlsxError";
      texts()
        .filter((text) => (keysOnly ? hasLetters(text) && !CATALOG_KEY.test(text) : isGerman(text)))
        .forEach(report);
    }
  });
  return found;
}
