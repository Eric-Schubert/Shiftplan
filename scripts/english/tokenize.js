// Small tokenizer for the English check. It only needs to tell comments, strings,
// regex literals and words apart, so it does not parse JavaScript or TypeScript fully.

const WORD = /[\p{L}\p{N}_$]+/uy;
const REGEX_AFTER_WORD = /^(?:return|typeof|instanceof|case|do|else|in|of|new|delete|void|throw|yield|await)$/;

// Index after the closing quote. Unterminated strings end at the line break.
function stringEnd(src, start, quote) {
  let i = start + 1;
  while (i < src.length && src[i] !== quote && src[i] !== "\n") i += src[i] === "\\" ? 2 : 1;
  return i + 1;
}

// Index after the regex flags, or -1 when the slash is not a regex literal.
function regexEnd(src, start) {
  let i = start + 1;
  let inClass = false;
  while (i < src.length && src[i] !== "\n") {
    if (src[i] === "\\") i += 1;
    else if (src[i] === "[") inClass = true;
    else if (src[i] === "]") inClass = false;
    else if (src[i] === "/" && !inClass) {
      i += 1;
      while (/[a-z]/.test(src[i] ?? "")) i += 1;
      return i;
    }
    i += 1;
  }
  return -1;
}

// End of a template literal piece that starts at "`" or at the "}" closing "${".
// Returns the end index and whether the piece stops at a "${".
function templateEnd(src, start) {
  let i = start + 1;
  while (i < src.length) {
    if (src[i] === "\\") i += 2;
    else if (src[i] === "`") return { end: i + 1, open: false };
    else if (src[i] === "$" && src[i + 1] === "{") return { end: i + 2, open: true };
    else i += 1;
  }
  return { end: i, open: false };
}

function regexAllowed(previous) {
  if (!previous) return true;
  if (previous.kind === "word") return REGEX_AFTER_WORD.test(previous.text);
  if (previous.kind === "punct") return !/^[)\]}]$/.test(previous.text);
  return false;
}

/**
 * Splits JavaScript or TypeScript into tokens with their start line.
 * Kinds: comment, string (also template pieces), regex, word, number, punct.
 */
export function tokenize(src, firstLine = 1) {
  const tokens = [];
  const templateDepths = [];
  let i = 0;
  let line = firstLine;
  let depth = 0;
  let previous = null;

  const push = (kind, end) => {
    const text = src.slice(i, end);
    const token = { kind, text, line };
    tokens.push(token);
    if (kind !== "comment") previous = token;
    line += text.split("\n").length - 1;
    i = end;
  };
  const pushTemplate = () => {
    const { end, open } = templateEnd(src, i);
    if (open) templateDepths.push(depth);
    push("string", end);
  };

  while (i < src.length) {
    const char = src[i];
    const next = src[i + 1];
    WORD.lastIndex = i;
    const word = WORD.exec(src);
    if (char === "\n") {
      line += 1;
      i += 1;
    } else if (/\s/.test(char)) i += 1;
    else if (char === "/" && next === "/") push("comment", src.indexOf("\n", i) < 0 ? src.length : src.indexOf("\n", i));
    else if (char === "/" && next === "*") push("comment", src.indexOf("*/", i + 2) < 0 ? src.length : src.indexOf("*/", i + 2) + 2);
    else if (char === "'" || char === '"') push("string", stringEnd(src, i, char));
    else if (char === "`") pushTemplate();
    else if (char === "}" && templateDepths.at(-1) === depth) {
      templateDepths.pop();
      pushTemplate();
    } else if (char === "/" && regexAllowed(previous) && regexEnd(src, i) > 0) push("regex", regexEnd(src, i));
    else if (word) push(/^\p{N}/u.test(word[0]) ? "number" : "word", i + word[0].length);
    else {
      if (char === "{") depth += 1;
      if (char === "}") depth -= 1;
      push("punct", i + 1);
    }
  }
  return tokens;
}
