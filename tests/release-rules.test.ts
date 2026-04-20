import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  evaluateCommitMessage,
  getDeployPrefixes,
  getHiddenPrefixes,
  getVisiblePrefixes,
  loadReleaseRules,
} from "../scripts/release-rules.js";

function normalizeCliffPattern(pattern: string) {
  return pattern.replace(/^\^/, "").replace(/\?$/, "");
}

describe("release rules", () => {
  it("classifies release, deploy, and hidden prefixes", () => {
    expect(evaluateCommitMessage("feat: add planner dashboard")).toMatchObject({
      type: "feat",
      release: true,
      deploy: true,
    });
    expect(evaluateCommitMessage("fix(api): repair login")).toMatchObject({
      type: "fix",
      release: true,
      deploy: true,
    });
    expect(evaluateCommitMessage("security!: rotate session format")).toMatchObject({
      type: "security",
      breaking: true,
      release: true,
      deploy: true,
    });
    expect(evaluateCommitMessage("docs: update README")).toMatchObject({
      type: "docs",
      hidden: true,
      release: false,
      deploy: false,
    });
    expect(evaluateCommitMessage("fix: repair login [skip ci]")).toMatchObject({
      skipCi: true,
      release: false,
      deploy: false,
    });
  });

  it("keeps git-cliff parser prefixes in sync", () => {
    const cliff = fs.readFileSync("cliff.toml", "utf-8");
    const visible = [...cliff.matchAll(/\{\s*message\s*=\s*"([^"]+)",\s*group\s*=/g)]
      .flatMap((match) => match[1] ? [normalizeCliffPattern(match[1])] : []);
    const hidden = [...cliff.matchAll(/\{\s*message\s*=\s*"([^"]+)",\s*skip\s*=\s*true/g)]
      .flatMap((match) => match[1] ? [normalizeCliffPattern(match[1])] : []);
    const rules = loadReleaseRules();

    expect(visible).toEqual(getVisiblePrefixes());
    expect(hidden).toEqual(getHiddenPrefixes());
    expect(getDeployPrefixes()).toEqual(getVisiblePrefixes());
    expect(rules.visible.map((entry: { prefix: string }) => entry.prefix)).toEqual(getVisiblePrefixes());
  });

  it("uses the shared helper in release workflows", () => {
    const autoVersion = fs.readFileSync(".github/workflows/auto-version.yml", "utf-8");
    const dockerBuild = fs.readFileSync(".github/workflows/docker-build.yml", "utf-8");
    const generateChangelog = fs.readFileSync("scripts/generate-changelog.js", "utf-8");

    expect(autoVersion).toContain("node scripts/release-rules.js github-output");
    expect(dockerBuild).toContain("node scripts/release-rules.js github-output");
    expect(generateChangelog).toContain("./release-rules.js");
    expect(autoVersion).not.toContain("startsWith(github.event.head_commit.message");
    expect(dockerBuild).not.toContain("startsWith(github.event.workflow_run.head_commit.message");
    expect(generateChangelog).not.toContain("feat|fix|perf|security");
  });
});
