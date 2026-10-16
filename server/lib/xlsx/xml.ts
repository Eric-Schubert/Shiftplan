import { xmlElements } from "./xml-scan";

// Characters XML 1.0 does not allow at all (most C0 controls, U+FFFE, U+FFFF, lone surrogates).
// One of them in a name, say a pasted vertical tab, made Excel report the whole file as corrupt.
const FORBIDDEN_XML_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;

export function escapeXml(value: string): string {
  return value
    .replace(FORBIDDEN_XML_CHARS, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** A character reference as text; one beyond Unicode would make String.fromCodePoint throw. */
function codePoint(code: number): string {
  return code <= 0x10ffff ? String.fromCodePoint(code) : "�";
}

export function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => codePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => codePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&");
}

const ATTRIBUTE_NAME = /^[\w:.-]+$/;

/** name="value" pairs in one forward pass; a regex here also went quadratic on a long junk tag. */
export function parseAttrs(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let position = 0;

  while (position < input.length) {
    const equals = input.indexOf("=", position);
    if (equals === -1) break;

    const name = input.slice(position, equals).trim().split(/\s+/).pop() ?? "";
    let valueStart = equals + 1;
    while (input[valueStart] === " " || input[valueStart] === "\t" || input[valueStart] === "\n" || input[valueStart] === "\r") valueStart++;

    const quote = input[valueStart];
    if (quote !== '"' && quote !== "'") {
      position = equals + 1;
      continue;
    }

    const valueEnd = input.indexOf(quote, valueStart + 1);
    if (valueEnd === -1) break;
    if (ATTRIBUTE_NAME.test(name)) attrs[name] = decodeXml(input.slice(valueStart + 1, valueEnd));
    position = valueEnd + 1;
  }

  return attrs;
}

export function parseTextRuns(xml: string): string {
  const texts: string[] = [];
  for (const text of xmlElements(xml, "t")) {
    if (text.inner !== null) texts.push(decodeXml(text.inner));
  }
  return texts.join("");
}
