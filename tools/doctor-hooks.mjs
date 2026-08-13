#!/usr/bin/env node
// ============================================================
// doctor-hooks.mjs — is the pre-commit hook actually wired up?
// ============================================================
//
// WHY THIS EXISTS — and why it is NOT a git hook
//
// Every guarantee in .githooks/pre-commit (the .onestory guard, the
// APP_SHELL check, the version check, the CACHE_VERSION stamp) depends
// on git being told where the hooks live. That is core.hooksPath, and it
// is set by the "prepare" script in package.json — which only runs if
// somebody runs `npm install`.
//
// Clone the repo offline, skip npm install, and every one of those gates
// is silently absent. Not failing — ABSENT. Commits sail through, and
// docs/ changes ship with a stale CACHE_VERSION so web users never get
// the update. That has already happened in this repo at least once.
//
// THE CIRCULARITY, stated plainly, because it is the whole design point:
//
//   A checker that only runs FROM the pre-commit hook can never detect a
//   missing pre-commit hook. If the hook is not wired, the checker does
//   not run, and its silence is indistinguishable from success.
//
// So this check must hang off something a developer runs for their own
// reasons, independently of git. It is wired as "predev" in
// package.json, so `npm run dev` — the command you type when you want to
// see the app — refuses to start until the hooks are live. The app
// itself tells you.
//
// Run standalone any time:  npm run doctor   (or: node tools/doctor-hooks.mjs)

import { execFileSync } from 'node:child_process';
import { accessSync, constants, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const EXPECTED = '.githooks';
const hookFile = join(repoRoot, EXPECTED, 'pre-commit');

const problems = [];

// --- Are we even in a git repo? --------------------------------------
// If not, there are no hooks to wire and nothing to warn about. A
// tarball download or a vendored copy is a legitimate way to use this.
let inGitRepo = true;
try {
  execFileSync('git', ['rev-parse', '--git-dir'], { cwd: repoRoot, stdio: 'pipe' });
} catch {
  inGitRepo = false;
}

if (!inGitRepo) {
  console.log('doctor: not a git checkout — no hooks to wire. Skipping.');
  process.exit(0);
}

// --- 1. core.hooksPath ------------------------------------------------
let hooksPath = null;
try {
  hooksPath = execFileSync('git', ['config', 'core.hooksPath'], { cwd: repoRoot, stdio: 'pipe' })
    .toString().trim();
} catch {
  // git config exits 1 when the key is unset. That is the failure we care about.
}

if (!hooksPath) {
  problems.push({
    what: 'core.hooksPath is not set — the pre-commit hook is NOT running',
    why: 'Commits are not checked for .onestory files, APP_SHELL drift or version drift, '
       + 'and docs/ changes ship with a stale CACHE_VERSION.',
  });
} else if (hooksPath !== EXPECTED) {
  problems.push({
    what: `core.hooksPath is "${hooksPath}", expected "${EXPECTED}"`,
    why: 'This repo\'s hooks live in .githooks/. Hooks somewhere else are not the ones this repo ships.',
  });
}

// --- 2. the hook file itself -----------------------------------------
// A wired hooksPath pointing at a missing or non-executable file fails
// exactly as silently as no hooksPath at all: git skips a hook it cannot
// execute, without a word.
if (!existsSync(hookFile)) {
  problems.push({
    what: `${EXPECTED}/pre-commit does not exist`,
    why: 'git silently skips a hook that is not there.',
  });
} else if (!statSync(hookFile).isFile()) {
  problems.push({ what: `${EXPECTED}/pre-commit is not a regular file`, why: 'git will not execute it.' });
} else {
  try {
    accessSync(hookFile, constants.X_OK);
  } catch {
    problems.push({
      what: `${EXPECTED}/pre-commit is not executable`,
      why: 'git silently skips a hook without the execute bit — no error, no warning.',
    });
  }
}

// --- Report -----------------------------------------------------------
if (problems.length === 0) {
  console.log(`doctor: OK — core.hooksPath=${EXPECTED}, pre-commit present and executable.`);
  process.exit(0);
}

console.error('');
console.error('  ┌──────────────────────────────────────────────────────────────┐');
console.error('  │  THIS CLONE\'S GIT HOOKS ARE NOT ACTIVE                       │');
console.error('  └──────────────────────────────────────────────────────────────┘');
console.error('');
for (const p of problems) {
  console.error(`  ✗ ${p.what}`);
  console.error(`    ${p.why}`);
  console.error('');
}
console.error('  Fix it with either:');
console.error('');
console.error('      npm install                          # runs the "prepare" script');
console.error('      git config core.hooksPath .githooks  # or just set it directly');
console.error('');
console.error('  Then re-run. If the hook file lost its execute bit:');
console.error('');
console.error('      chmod +x .githooks/pre-commit');
console.error('');
process.exit(1);
