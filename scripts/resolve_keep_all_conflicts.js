#!/usr/bin/env node
/**
 * Resolve git conflict markers by keeping BOTH sides ("keep all").
 * Usage:
 *   - Resolve a single file:
 *       node scripts/resolve_keep_all_conflicts.js /absolute/path/to/file
 *   - Resolve all conflicted files in repo:
 *       git grep -l '<<<<<<<' | xargs -I{} node scripts/resolve_keep_all_conflicts.js {}
 *
 * Behavior:
 *   Replaces each conflict block:
 *     <<<<<<< HEAD
 *     [current]
 *     =======
 *     [incoming]
 *     >>>>>>> branch
 *   with:
 *     [current]\n[incoming]
 */

const fs = require('fs');
const path = require('path');

function resolveFileKeepAll(filePath) {
  const abs = path.resolve(filePath);
  let content;
  try {
    content = fs.readFileSync(abs, 'utf8');
  } catch (e) {
    console.error(`Failed to read: ${abs}`, e.message);
    process.exitCode = 1;
    return;
  }

  if (!content.includes('<<<<<<<')) {
    console.log(`No conflicts in: ${abs}`);
    return;
  }

  // Regex to match git conflict markers and capture both sides
  const conflictRegex = /<<<<<<<[^\n]*\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>>[^\n]*\n?/g;

  let replaced = false;
  const newContent = content.replace(conflictRegex, (_, ours, theirs) => {
    replaced = true;
    // Keep both blocks in order: ours then theirs, ensure single trailing newline
    const oursTrim = ours.replace(/\s+$/, '');
    const theirsTrim = theirs.replace(/\s+$/, '');
    return `${oursTrim}\n${theirsTrim}\n`;
  });

  if (!replaced) {
    console.warn(`No standard conflict blocks found in: ${abs}`);
    return;
  }

  try {
    fs.writeFileSync(abs, newContent, 'utf8');
    console.log(`Resolved (keep all): ${abs}`);
  } catch (e) {
    console.error(`Failed to write: ${abs}`, e.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/resolve_keep_all_conflicts.js <file>');
    process.exit(1);
  }
  resolveFileKeepAll(file);
}

module.exports = { resolveFileKeepAll };


