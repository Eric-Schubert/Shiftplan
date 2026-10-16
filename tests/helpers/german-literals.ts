import { parse } from "vue/compiler-sfc";
import { ALLOWED_IDENTIFIERS } from "../../scripts/check-english.js";
import { SHORT_NAME_KEYS } from "~/utils/holiday";
import { isGermanText, stringTexts } from "./german-text";

// Wire values and data that stay German: query parameters, absence reasons, holiday names from the API.
const ALLOWED = new Set([...ALLOWED_IDENTIFIERS, ...Object.keys(SHORT_NAME_KEYS), "Shiftplan"]);
// Attributes no one reads. Every other static attribute is text, so any word in it counts.
const TECHNICAL_ATTRS = new Set([
  "accept", "aria-busy", "aria-describedby", "aria-hidden", "aria-labelledby", "autocapitalize", "autocomplete",
  "autocorrect", "class", "draggable", "empty-icon", "for", "height", "href", "icon", "icon-pos", "id", "id-prefix",
  "input-id", "inputmode", "keypath", "maxlength", "option-value", "ref", "rel", "role", "rows", "scope", "severity",
  "size", "spellcheck", "src", "style", "tabindex", "tag", "target", "to", "type", "width",
]);
// Usually a field or option name, but a component may show it (<PrimeTag value="…">): checked like code.
const VALUE_ATTRS = new Set(["field", "name", "option-label", "value"]);

type Finding = { line: number; text: string };

function codeStrings(source: string, firstLine: number): Finding[] {
  return stringTexts(source, firstLine).map(([line, text]) => ({ line, text }));
}

/** Text nodes and readable attributes of a template, plus the strings in its expressions. */
function templateTexts(node: any, found: { markup: Finding[]; code: Finding[] }) {
  for (const prop of node.props ?? []) {
    const line = prop.loc.start.line;
    if (prop.type === 6 && prop.value && VALUE_ATTRS.has(prop.name)) found.code.push({ line, text: prop.value.content });
    else if (prop.type === 6 && prop.value && !TECHNICAL_ATTRS.has(prop.name)) found.markup.push({ line, text: prop.value.content });
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
  const code = found.code.filter(({ text }) => !ALLOWED.has(text) && isGermanText(text));
  return [...markup, ...code].sort((a, b) => a.line - b.line).map(({ line, text }) => `${line}: ${text.trim()}`);
}
