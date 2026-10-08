import { addUniqueChanges } from "./commit-text.js";

async function fetchGithubReleaseBody(tagName) {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  if (!repository || !token || typeof fetch !== "function") return "";

  const response = await fetch(
    `https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(tagName)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    console.log(`[changelog] GitHub release body unavailable for ${tagName}: ${response.status}`);
    return "";
  }

  const release = await response.json();
  return typeof release.body === "string" ? release.body : "";
}

// Puts the changes from the GitHub release notes first; parseReleaseBody turns a body into change lines.
export async function mergeGithubReleaseBodies(entries, parseReleaseBody) {
  if (!process.env.GITHUB_REPOSITORY || !(process.env.GITHUB_TOKEN || process.env.GH_TOKEN)) {
    return entries;
  }

  const merged = [];

  for (const entry of entries) {
    const body = await fetchGithubReleaseBody(entry.title);
    const releaseChanges = parseReleaseBody(body);

    if (releaseChanges.length === 0) {
      merged.push(entry);
      continue;
    }

    const changes = [];
    const seen = new Set();

    addUniqueChanges(changes, releaseChanges, seen);
    addUniqueChanges(changes, entry.changes, seen);

    merged.push({ ...entry, changes });
  }

  return merged;
}
