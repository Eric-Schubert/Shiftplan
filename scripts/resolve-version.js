#!/usr/bin/env node

/**
 * Version Resolver Script
 *
 * Ermittelt die App-Version aus Git-Tags und schreibt sie in .version
 * Wird als "prebuild" Script ausgeführt.
 *
 * Ablauf:
 *   1. Prüfe ENV-Variable APP_VERSION (für Docker / CI)
 *   2. Falls nicht gesetzt → git describe --tags
 *   3. Fallback → Version aus package.json
 *
 * Ergebnis-Beispiele:
 *   Genau auf Tag v1.3.0        → "1.3.0"
 *   14 Commits nach v1.3.0      → "1.3.0+14"
 *   Kein Git / kein Tag         → package.json Version
 *
 * Usage:
 *   node scripts/resolve-version.js          (automatisch via prebuild)
 *   APP_VERSION=2.0.0 node scripts/resolve-version.js  (manuell / Docker)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const versionFile = path.join(ROOT, '.version');

function resolveVersion() {
  // 1. ENV hat höchste Priorität (Docker Build-Arg, CI)
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION;
  }

  // 2. Git describe
  try {
    const raw = execSync('git describe --tags --always 2>/dev/null', {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    // Format: "v1.3.0" oder "v1.3.0-14-gabcdef" oder "abcdef" (kein Tag)
    const tagMatch = raw.match(/^v?(\d+\.\d+\.\d+)(?:-(\d+)-g[a-f0-9]+)?$/);

    if (tagMatch) {
      const base = tagMatch[1];
      const commits = tagMatch[2];
      return commits ? `${base}+${commits}` : base;
    }

    // Nur Commit-Hash (kein Tag vorhanden) → Fallback
    return null;
  } catch {
    // Kein Git verfügbar
    return null;
  }
}

function getFallbackVersion() {
  try {
    const pkgPath = path.join(ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

// --- Main ---
const version = resolveVersion() || getFallbackVersion();

fs.writeFileSync(versionFile, version, 'utf-8');
console.log(`✓ Version: ${version} → .version`);
