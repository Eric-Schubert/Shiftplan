function parseVersionParts(version) {
  const match = String(version).match(/\d+(?:\.\d+)*/);
  if (!match) return [];

  return match[0].split(".").map((part) => Number.parseInt(part, 10));
}

export function compareVersions(a, b) {
  const aParts = parseVersionParts(a);
  const bParts = parseVersionParts(b);
  const maxLength = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLength; i += 1) {
    const diff = (aParts[i] || 0) - (bParts[i] || 0);
    if (diff !== 0) return diff;
  }

  return String(a).localeCompare(String(b));
}

export function compareChangelogEntries(a, b) {
  return b.date.localeCompare(a.date) || compareVersions(b.title, a.title);
}
