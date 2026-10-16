import { XlsxError } from "./error";

/** One element: the text between its name and `>`, and its content (null when self-closing). */
export type XmlElement = { attrs: string; inner: string | null };

const SPACE = 32;
const TAB = 9;
const LINE_FEED = 10;
const CARRIAGE_RETURN = 13;
const SLASH = 47;
const GREATER_THAN = 62;

/** Whether the character after `<name` ends the name, so `<c` does not match `<col`. */
function endsName(code: number): boolean {
  return code === SPACE || code === TAB || code === LINE_FEED || code === CARRIAGE_RETURN || code === SLASH || code === GREATER_THAN;
}

/**
 * Every `<tag …>…</tag>` and `<tag …/>` of `xml` in one forward pass with indexOf. Lazy regexes like
 * /<row\b[^>]*>([\s\S]*?)<\/row>/g scanned to the end of the input for every unclosed tag, so a crafted
 * sheet of a few hundred KB blocked the server for minutes. An unclosed tag is a broken file.
 * The elements must not nest in themselves, which holds for rows, cells, values and text runs.
 */
export function* xmlElements(xml: string, tag: string): Generator<XmlElement> {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  let position = 0;

  while (position < xml.length) {
    const start = xml.indexOf(open, position);
    if (start === -1) return;

    const nameEnd = start + open.length;
    if (!endsName(xml.charCodeAt(nameEnd))) {
      position = nameEnd;
      continue;
    }

    const tagEnd = xml.indexOf(">", nameEnd);
    if (tagEnd === -1) throw new XlsxError("excel.file.brokenXml");

    if (xml.charCodeAt(tagEnd - 1) === SLASH) {
      yield { attrs: xml.slice(nameEnd, tagEnd - 1), inner: null };
      position = tagEnd + 1;
      continue;
    }

    const end = xml.indexOf(close, tagEnd + 1);
    if (end === -1) throw new XlsxError("excel.file.brokenXml");
    yield { attrs: xml.slice(nameEnd, tagEnd), inner: xml.slice(tagEnd + 1, end) };
    position = end + close.length;
  }
}

/** The first such element, or undefined. */
export function firstXmlElement(xml: string, tag: string): XmlElement | undefined {
  for (const element of xmlElements(xml, tag)) return element;
  return undefined;
}
