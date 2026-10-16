import { isGermanProse } from "../../scripts/check-english.js";
import { tokenize } from "../../scripts/english/tokenize.js";

type Token = { kind: string; text: string; line: number };

// Code that writes push texts; they come from i18n/locales/de/push*.ts so each recipient gets their language.
export const PUSH_CODE = [
  /^server\/services\/push\//,
  /^server\/services\/push(?:-relay)?\.service\.ts$/,
  /^server\/services\/absence\/(?:notice|report)\.ts$/,
  /^server\/services\/shift-request\/flow\//,
  /^server\/api\/push\//,
];

// Short titles such as „Anfrage abgelehnt“ have neither umlauts nor two stopwords.
const PUSH_WORDS = /\b(?:anfrage|tausch|schicht|storno|ausfall|planung|zusage|nachricht|ersatz)/i;
// Paths, query strings and catalog keys are not texts: "/?anfragen=1", "push.requests.cancelled.title".
const NOT_TEXT = /^[/?]|^[a-z]\w*(?:\.\w+)+$/;

// Umlauts and the sharp s, also written as escapes such as \u00e4.
const UMLAUTS = /[äöüß]|\\u00[c-f][0-9a-f]/i;

function isGerman(text: string, words: RegExp): boolean {
  // isGermanProse skips quoted parts (fine for comments); in a text the quotes are part of it.
  const unquoted = text.replace(/[„“”"'`]/g, "");
  return UMLAUTS.test(text) || isGermanProse(unquoted) || (words.test(text) && !NOT_TEXT.test(text));
}

/**
 * String literals outside comments as [line, text]. A template literal is one text with `{}` for
 * each expression, so „{} kann {} nicht tauschen.“ still shows its two stopwords.
 */
function stringTexts(source: string): Array<[number, string]> {
  const texts: Array<[number, string]> = [];
  const open: Array<[number, string]> = [];
  for (const { kind, text, line } of tokenize(source) as Token[]) {
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

/** German text in code whose texts come from the catalog, as "file:line text"; `words` are the area's short words. */
export function germanTextFindings(file: string, source: string, words: RegExp): string[] {
  return stringTexts(source)
    .filter(([, text]) => isGerman(text, words))
    .map(([line, text]) => `${file}:${line} ${text}`);
}

/** German text in push code, as "file:line text". */
export function pushTextFindings(file: string, source: string): string[] {
  return germanTextFindings(file, source, PUSH_WORDS);
}
