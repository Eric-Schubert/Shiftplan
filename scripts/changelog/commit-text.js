export function capitalizeFirst(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getCommitMessageParts(commit) {
  const raw = String(commit.raw_message || "");

  if (raw) {
    const lines = raw.split(/\r?\n/);
    return {
      subject: (lines.shift() || "").trim(),
      body: lines.join("\n").trim(),
    };
  }

  return {
    subject: String(commit.message || "").split(/\r?\n/)[0].trim(),
    body: String(commit.body || "").trim(),
  };
}

export function cleanChangeLine(line) {
  return String(line)
    .trim()
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();
}

function isCommitFooter(line) {
  return /^(co-authored-by|signed-off-by|refs?|closes|fixes):\s+/i.test(line);
}

function isListItem(line) {
  return /^([-*+]|\d+[.)])\s+/.test(line);
}

// One change per list item or paragraph. Wrapped lines continue the current
// change, a blank line ends it, so line breaks never split a change.
export function bodyToChanges(body) {
  const changes = [];
  let continuing = false;

  for (const rawLine of String(body || "").split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || isCommitFooter(line)) {
      continuing = false;
      continue;
    }

    if (continuing && !isListItem(line)) {
      changes[changes.length - 1] += ` ${line}`;
      continue;
    }

    changes.push(cleanChangeLine(line));
    continuing = true;
  }

  return changes.filter(Boolean).map(capitalizeFirst);
}

export function addUniqueChanges(target, changes, seen) {
  for (const change of changes) {
    if (!change || seen.has(change.toLowerCase())) continue;
    seen.add(change.toLowerCase());
    target.push(change);
  }
}
