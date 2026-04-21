#!/usr/bin/env node

/**
 * Legacy README generator entrypoint.
 *
 * Kept as a compatibility wrapper for older docs workflows. The maintained
 * implementation lives in `scripts/readme-generator.js`.
 */

import { updateReadme } from "./readme-generator.js";

console.log("Generating README content...");
updateReadme();
