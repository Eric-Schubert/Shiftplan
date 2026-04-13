#!/usr/bin/env node

/**
 * Version Bump Script
 * 
 * Erhöht automatisch die Patch-Version in package.json bei jedem Build.
 * Wird als "prebuild" Script ausgeführt.
 * 
 * Usage: node scripts/bump-version.js
 * 
 * Optionen:
 *   --minor  Erhöht die Minor-Version (z.B. 1.2.3 → 1.3.0)
 *   --major  Erhöht die Major-Version (z.B. 1.2.3 → 2.0.0)
 *   (ohne)   Erhöht die Patch-Version (z.B. 1.2.3 → 1.2.4)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);

const arg = process.argv[2];

if (arg === '--major') {
  pkg.version = `${major + 1}.0.0`;
} else if (arg === '--minor') {
  pkg.version = `${major}.${minor + 1}.0`;
} else {
  pkg.version = `${major}.${minor}.${patch + 1}`;
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`✓ Version: ${major}.${minor}.${patch} → ${pkg.version}`);
