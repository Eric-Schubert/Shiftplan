import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SCRIPTS = ["create-release-tag.js", "release-rules.js", "release-prefixes.json"];
const GIT_ENV = {
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

let dir: string;
let repo: string;
const commits: Record<string, string> = {};

function git(args: string[]) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf-8", env: { ...process.env, ...GIT_ENV } }).trim();
}

function commit(name: string) {
  git(["commit", "--allow-empty", "-q", "-m", `fix: ${name}`]);
  commits[name] = git(["rev-parse", "HEAD"]);
}

// Runs the script as the release job does: detached at the commit CI tested.
function release(name: string) {
  git(["checkout", "-q", "--detach", commits[name]!]);
  const env: NodeJS.ProcessEnv = { ...process.env, ...GIT_ENV, RELEASE_TYPE: "fix", RELEASE_BREAKING: "false" };
  delete env.GITHUB_OUTPUT;
  const stdout = execFileSync("node", ["scripts/create-release-tag.js"], { cwd: repo, encoding: "utf-8", env });
  return Object.fromEntries(
    stdout.split("\n").filter((line) => line.includes("=")).map((line) => line.split("=", 2)),
  );
}

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-tag-"));
  repo = path.join(dir, "repo");
  fs.mkdirSync(path.join(repo, "scripts"), { recursive: true });
  for (const file of SCRIPTS) {
    fs.copyFileSync(path.join("scripts", file), path.join(repo, "scripts", file));
  }
  execFileSync("git", ["init", "-q", "--bare", path.join(dir, "origin.git")]);
  git(["init", "-q"]);
  git(["remote", "add", "origin", path.join(dir, "origin.git")]);
  git(["add", "."]);
  commit("a");
  git(["tag", "v1.0.0"]);
  ["b", "c", "d"].forEach(commit);
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("create-release-tag", () => {
  it("tags and pushes the next version", () => {
    expect(release("b")).toEqual({ previous_tag: "v1.0.0", new_tag: "v1.0.1", release_type: "patch" });
    expect(git(["ls-remote", "--tags", "origin"])).toContain("refs/tags/v1.0.1");
  });

  it("skips a commit that a newer release already contains", () => {
    expect(release("d").new_tag).toBe("v1.0.2");
    expect(release("c")).toEqual({});
    expect(git(["tag", "--list", "v*"]).split("\n")).toEqual(["v1.0.0", "v1.0.1", "v1.0.2"]);
  });

  it("writes the outputs again for the commit with the newest tag", () => {
    expect(release("d")).toEqual({ previous_tag: "v1.0.1", new_tag: "v1.0.2", release_type: "patch" });
  });

  it("skips an older tagged commit", () => {
    expect(release("b")).toEqual({});
  });
});
