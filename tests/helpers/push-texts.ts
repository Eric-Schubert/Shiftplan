import { isGermanText, stringTexts } from "./german-text";

// Code that writes push texts; they come from i18n/locales/de/push*.ts so each recipient gets their language.
// flow/apply.ts only writes audit notes (audit_log.reason); those move to the catalog with the audit log.
export const PUSH_CODE = [
  /^server\/services\/push\//,
  /^server\/services\/push(?:-relay)?\.service\.ts$/,
  /^server\/services\/absence\/(?:notice|report)\.ts$/,
  /^server\/services\/shift-request\/flow\/(?!apply\.ts$)/,
  /^server\/api\/push\//,
];

/** German text in push code, as "file:line text". */
export function pushTextFindings(file: string, source: string): string[] {
  return stringTexts(source)
    .filter(([, text]) => isGermanText(text))
    .map(([line, text]) => `${file}:${line} ${text}`);
}
