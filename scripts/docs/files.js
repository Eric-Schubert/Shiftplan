import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function fileExists(...parts) {
  return fs.existsSync(path.join(ROOT, ...parts));
}

export function readText(...parts) {
  return fs.readFileSync(path.join(ROOT, ...parts), "utf-8");
}

export function listFilesRecursive(dirPath) {
  const fullPath = path.join(ROOT, dirPath);
  if (!fs.existsSync(fullPath)) return [];

  const files = [];
  const items = fs.readdirSync(fullPath, { withFileTypes: true }).sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const item of items) {
    const relativePath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      files.push(...listFilesRecursive(relativePath));
    } else {
      files.push(relativePath);
    }
  }

  return files;
}
