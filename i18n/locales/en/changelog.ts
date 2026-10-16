import type de from "../de/changelog";

// Chrome of the version history dialog. The release notes themselves come from GitHub as they are.
export default {
  title: "Version history",
  eyebrow: { history: "Version archive", detail: "Changelog" },
  releaseTitle: "Release {version}",
  installed: "Installed {version}",
  development: "Development build",
  publishedOn: "Published on {date}",
  changeCount: "1 change in this release. | {count} changes in this release.",
  currentInstalled: "Currently installed",
  onGithub: "Release on GitHub",
  overview: "Overview",
  whatsNew: "What’s new",
  points: "1 item | {count} items",
  latest: "Latest version",
  current: "Current",
  morePoints: "+1 more item | +{count} more items",
  view: "View",
  close: "Close",
} satisfies typeof de;
