#!/usr/bin/env node
// ============================================================
// check-shell.mjs — APP_SHELL in docs/sw.js must match docs/ on disk.
// ============================================================
//
// WHY THIS EXISTS
//
// docs/sw.js pre-caches an explicit APP_SHELL list with cache.addAll(),
// inside the install handler's waitUntil(). cache.addAll() is ATOMIC.
// The two ways to get it wrong are not equally bad:
//
//   (a) A file exists under docs/ but is missing from APP_SHELL.
//       install() still succeeds — addAll only fetches what it was
//       given. The page simply is not precached, and self-heals on the
//       first online visit. Quiet and degraded.
//
//   (b) APP_SHELL lists a path that 404s.
//       One rejected fetch rejects the whole addAll promise, install()
//       never completes, THE NEW SERVICE WORKER NEVER ACTIVATES, and
//       every existing web user is pinned to the old app forever. There
//       is no self-heal: their browser keeps serving the last good SW.
//
// (b) is the one that bricks the deployment, and it is trivially easy to
// cause — delete a file from docs/ and forget the APP_SHELL line. This
// checker asserts BOTH directions so neither can ship.
//
// Plain ESM, no dependencies, no framework. Run it directly:
//   node tools/check-shell.mjs
//
// Called from .githooks/pre-commit. Exits 1 on any mismatch.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const docsDir = join(repoRoot, 'docs');
const swPath = join(docsDir, 'sw.js');

// Extensions that make up the app shell. Anything else under docs/
// (images, fonts, data) is deliberately out of scope: it is not part of
// the executable shell and is fine to fetch on demand.
const SHELL_EXTENSIONS = ['.html', '.css', '.js'];

let fail = 0;
const bad = (msg) => { console.error(`  ✗ ${msg}`); fail++; };

// ---------------------------------------------------------------
// Parse the APP_SHELL array out of sw.js.
//
// Deliberately a text scan, not an import: sw.js is a service worker
// that references `self` and registers event listeners at module scope,
// so importing it under node would throw. The array is a flat list of
// string literals, which is well within what a regex can read safely.
// ---------------------------------------------------------------
if (!existsSync(swPath)) {
  console.error(`check-shell: docs/sw.js not found at ${swPath}`);
  process.exit(1);
}

const sw = readFileSync(swPath, 'utf8');
const arrayMatch = sw.match(/const\s+APP_SHELL\s*=\s*\[([\s\S]*?)\]/);
if (!arrayMatch) {
  console.error('check-shell: could not find `const APP_SHELL = [ … ]` in docs/sw.js.');
  console.error('             If the declaration was renamed or reformatted, update this checker.');
  process.exit(1);
}

const shell = [...arrayMatch[1].matchAll(/['"]([^'"]*)['"]/g)].map((m) => m[1]);
if (shell.length === 0) {
  console.error('check-shell: APP_SHELL parsed as empty. Refusing to pass a vacuous check.');
  process.exit(1);
}

// ---------------------------------------------------------------
// Walk docs/ for shell files.
// Recursive, so docs/js/*.js is covered the day that directory appears.
// ---------------------------------------------------------------
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const onDisk = walk(docsDir)
  .filter((f) => SHELL_EXTENSIONS.some((ext) => f.toLowerCase().endsWith(ext)))
  // Normalise to the './path' form APP_SHELL uses, POSIX separators —
  // the entries are URLs resolved against docs/, not filesystem paths.
  .map((f) => './' + relative(docsDir, f).split(sep).join('/'));

// './' is the navigation root, not a file. It resolves to index.html at
// request time, so it has no on-disk counterpart of its own and is
// exempt from the existence check.
const NAV_ROOT = './';
const listed = new Set(shell);

// ---------------------------------------------------------------
// Direction (a): every shell file on disk must be listed.
// ---------------------------------------------------------------
console.log(`check-shell: ${onDisk.length} shell file(s) under docs/, ${shell.length} APP_SHELL entr(ies)`);

for (const f of onDisk.sort()) {
  if (!listed.has(f)) {
    bad(`docs/ has ${f.slice(2)} but APP_SHELL does not list '${f}'  — it will not be precached`);
  }
}

// ---------------------------------------------------------------
// Direction (b): every listed entry must exist. This is the atomic one.
// ---------------------------------------------------------------
const seen = new Set();
for (const entry of shell) {
  if (seen.has(entry)) bad(`APP_SHELL lists '${entry}' more than once`);
  seen.add(entry);

  if (entry === NAV_ROOT) continue;
  if (!entry.startsWith('./')) {
    bad(`APP_SHELL entry '${entry}' is not a './'-relative path — cannot verify it`);
    continue;
  }
  if (!existsSync(join(docsDir, entry.slice(2)))) {
    bad(`APP_SHELL lists '${entry}' but docs/${entry.slice(2)} does not exist`
      + `  — cache.addAll is atomic, this 404 would brick the SW for every web user`);
  }
}

if (!listed.has(NAV_ROOT)) {
  bad(`APP_SHELL is missing the '${NAV_ROOT}' navigation root — offline visits to the bare URL would fail`);
}

if (fail) {
  console.error(`\ncheck-shell: FAILED (${fail} problem${fail === 1 ? '' : 's'}).`);
  console.error('Fix docs/sw.js APP_SHELL, or the files under docs/, so the two agree.');
  process.exit(1);
}

console.log('check-shell: OK — APP_SHELL and docs/ agree in both directions.');
process.exit(0);
