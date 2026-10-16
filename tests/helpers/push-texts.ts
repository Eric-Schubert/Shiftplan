import { isGermanProse } from "../../scripts/check-english.js";
import { tokenize } from "../../scripts/english/tokenize.js";

type Token = { kind: string; text: string; line: number };

// Code that writes push texts; they come from i18n/locales/de/push*.ts so each recipient gets their language.
// flow/apply.ts only writes audit notes (audit_log.reason); those move to the catalog with the audit log.
export const PUSH_CODE = [
  /^server\/services\/push\//,
  /^server\/services\/push(?:-relay)?\.service\.ts$/,
  /^server\/services\/absence\/notice\.ts$/,
  /^server\/services\/shift-request\/flow\/(?!apply\.ts$)/,
  /^server\/api\/push\//,
];

// Short titles such as „Anfrage abgelehnt“ have neither umlauts nor two stopwords.
const PUSH_WORDS = /\b(?:anfrage|tausch|schicht|storno|ausfall|planung|zusage|nachricht|ersatz)/i;
// Paths, query strings and catalog keys are not texts: "/?anfragen=1", "push.requests.cancelled.title".
const NOT_TEXT = /^[/?]|^[a-z]\w*(?:\.\w+)+$/;

function isGerman(text: string): boolean {
  return /[äöüß]/i.test(text) || isGermanProse(text) || (PUSH_WORDS.test(text) && !NOT_TEXT.test(text));
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

/** German text in push code, as "file:line text". */
export function pushTextFindings(file: string, source: string): string[] {
  return stringTexts(source)
    .filter(([, text]) => isGerman(text))
    .map(([line, text]) => `${file}:${line} ${text}`);
}
