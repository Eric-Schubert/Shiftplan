import { isGermanText, stringTexts } from "./german-text";

// Code that writes push texts; they come from i18n/locales/de/push*.ts so each recipient gets their language.
export const PUSH_CODE = [
  /^server\/services\/push\//,
  /^server\/services\/push(?:-relay)?\.service\.ts$/,
  /^server\/services\/absence\/(?:notice|report)\.ts$/,
  /^server\/services\/shift-request\/flow\//,
  /^server\/api\/push\//,
];

/** German text in push code, as "file:line text". */
export function pushTextFindings(file: string, source: string): string[] {
  return stringTexts(source)
    .filter(([, text]) => isGermanText(text))
    .map(([line, text]) => `${file}:${line} ${text}`);
}
