// ============================================================
// interlinear-align.test.mjs
// ============================================================
//
// WHY THIS TEST EXISTS
//
// Three defects in the exporters were found by measuring a real project,
// and all three are invisible without a test: the output is still valid
// XML, it just has the wrong gloss under the wrong word.
//
//   1. removeBnB() deleted "[B&B …]" tokens from the vernacular tier and
//      left the gloss tier alone — 186 verses silently misaligned.
//   2. A skipped gloss had no representation, so it could not be honoured.
//   3. Surplus glosses became words with empty baseline text — 294 of them.
//
// Each case below is a regression witness. Several assert what the OLD
// behaviour did, so the bug stays documented and cannot quietly return.
//
// ALL FIXTURES ARE SYNTHETIC. The placeholder language is "Alpha", ISO
// qaa, from the private-use range so it cannot be mistaken for a real
// one. No real vernacular text, story titles or member data appear here.
//
// Plain ESM, no framework, no npm install:
//     node tools/test/interlinear-align.test.mjs

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const A = require('../../docs/js/interlinear-align.js');

let fail = 0;
const ok = (cond, what) => {
  if (cond) { console.log(`  ok   ${what}`); }
  else { console.error(`  FAIL ${what}`); fail++; }
};
const eq = (actual, expected, what) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { console.log(`  ok   ${what}`); }
  else { console.error(`  FAIL ${what}\n         expected ${e}\n         actual   ${a}`); fail++; }
};

// The buggy original, kept verbatim so the regression is provable rather
// than asserted. This is what docs/flextext.html:151 used to do.
const removeBnB_OLD = (t) =>
  (t || '').replace(/\[B&B[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
const toks = (s) => (s.trim() ? s.trim().split(/\s+/) : []);

console.log('\n--- 1. paired B&B stripping ---');
{
  // Alpha (qaa). NOTE the token arithmetic: "[B&B Ref 1:1]" is THREE
  // whitespace-separated tokens — "[B&B", "Ref", "1:1]" — not one. The
  // translator glosses against what OneStory displays, tag included, so a
  // fully-glossed line has one token per displayed token.
  const vern  = 'ka [B&B Ref 1:1] mo si';        // 6 tokens; tag at 1,2,3
  const gloss = 'one two three four five six';   // 6 tokens

  // The bug, demonstrated: stripping the tag from the vernacular alone
  // leaves 3 baseline words against 6 glosses, so every gloss after the
  // tag lands under the wrong word.
  eq(toks(removeBnB_OLD(vern)).length, 3, 'OLD: vernacular drops to 3 tokens');
  ok(toks(removeBnB_OLD(vern)).length !== toks(gloss).length,
     'OLD: tiers now disagree (3 vs 6) — this is the 186-verse bug');

  const r = A.stripBnBPaired(vern, gloss);
  eq(r.vernWords, ['ka', 'mo', 'si'], 'NEW: tag tokens removed from vernacular');
  eq(r.glossWords, ['one', 'five', 'six'], 'NEW: same indices removed from gloss');
  eq(r.vernWords.length, r.glossWords.length, 'NEW: tiers stay aligned');
}
{
  const r = A.stripBnBPaired('[B&B X] ka mo', 'a b c d');   // 4 tokens; tag at 0,1
  eq(r.vernWords, ['ka', 'mo'], 'tag at start: vernacular');
  eq(r.glossWords, ['c', 'd'], 'tag at start: gloss');
}
{
  const r = A.stripBnBPaired('ka mo [B&B X]', 'a b c d');   // 4 tokens; tag at 2,3
  eq(r.vernWords, ['ka', 'mo'], 'tag at end: vernacular');
  eq(r.glossWords, ['a', 'b'], 'tag at end: gloss');
}
{
  // 7 tokens: ka [B&B A] mo [B&B B] si -> tags at 1,2 and 4,5
  const r = A.stripBnBPaired('ka [B&B A] mo [B&B B] si', 'g1 g2 g3 g4 g5 g6 g7');
  eq(r.vernWords, ['ka', 'mo', 'si'], 'two tags in one verse: vernacular');
  eq(r.glossWords, ['g1', 'g4', 'g7'], 'two tags in one verse: gloss');
}
{
  // Tiers already disagreed, so we cannot know which gloss maps where.
  // Leave the gloss untouched rather than guess.
  const r = A.stripBnBPaired('ka [B&B X] mo', 'only two');
  eq(r.vernWords, ['ka', 'mo'], 'unequal tiers: vernacular still stripped');
  eq(r.glossWords, ['only', 'two'], 'unequal tiers: gloss left alone, not guessed');
}
{
  const r = A.stripBnBPaired('ka mo si', 'a b c');
  eq(r.vernWords, ['ka', 'mo', 'si'], 'no tag: vernacular unchanged');
  eq(r.glossWords, ['a', 'b', 'c'], 'no tag: gloss unchanged');
}

console.log('\n--- 2. *** as an explicit hole ---');
{
  eq(A.HOLE, '***', 'hole marker is ***');
  eq(A.glossOrEmpty('***'), '', 'exact *** becomes empty');
  eq(A.glossOrEmpty('abc'), 'abc', 'ordinary gloss untouched');
  eq(A.glossOrEmpty(''), '', 'empty stays empty');
  // Substring safety: only an exact token is a hole.
  eq(A.glossOrEmpty('***x'), '***x', 'substring *** is NOT a hole');
  eq(A.glossOrEmpty('a***'), 'a***', 'trailing *** is NOT a hole');
  eq(A.glossOrEmpty('**'), '**', 'two stars is NOT a hole');
}
{
  const g = ['one', '***', 'three'];
  eq(g.map(A.glossOrEmpty), ['one', '', 'three'], 'medial hole: position preserved');
  eq(['***', 'b'].map(A.glossOrEmpty), ['', 'b'], 'leading hole');
  eq(['a', '***'].map(A.glossOrEmpty), ['a', ''], 'trailing hole');
  eq(['***'].map(A.glossOrEmpty), [''], 'hole as the only token');
}

console.log('\n--- 3. orphan folding ---');
{
  const r = A.foldOrphans(['ka', 'mo'], ['a', 'b', 'c']);
  eq(r.vernWords, ['ka', 'mo'], '1 surplus: no phantom baseline word');
  eq(r.glossWords, ['a', 'b c'], '1 surplus: appended to the last real word');
  eq(r.vernWords.length, r.glossWords.length, '1 surplus: equal lengths');
}
{
  const r = A.foldOrphans(['ka'], ['a', 'b', 'c', 'd']);
  eq(r.glossWords, ['a b c d'], '3 surplus: all appended');
  eq(r.vernWords.length, r.glossWords.length, '3 surplus: equal lengths');
}
{
  const r = A.foldOrphans(['ka', 'mo', 'si'], ['a']);
  eq(r.glossWords, ['a', '', ''], 'short gloss: padded, not shifted');
  eq(r.vernWords.length, r.glossWords.length, 'short gloss: equal lengths');
}
{
  const r = A.foldOrphans([], ['a', 'b']);
  eq(r.vernWords, [], 'no baseline at all: nothing invented');
  eq(r.glossWords, [], 'no baseline at all: surplus dropped');
}
{
  const r = A.foldOrphans(['ka', 'mo'], ['a', 'b']);
  eq(r.glossWords, ['a', 'b'], 'equal counts: untouched');
}

console.log('\n--- 4. the whole pipeline ---');
{
  // B&B removal must happen before orphan folding: it changes both counts.
  const r = A.alignVerse('ka [B&B R] mo si', 'g1 g2 g3 g4 g5');
  eq(r.vernWords, ['ka', 'mo', 'si'], 'pipeline: vernacular');
  eq(r.glossWords, ['g1', 'g4', 'g5'], 'pipeline: gloss follows the same indices');
  eq(r.vernWords.length, r.glossWords.length, 'pipeline: aligned');
}
{
  const r = A.alignVerse('ka mo', 'g1 *** g3');
  eq(r.vernWords.length, r.glossWords.length, 'pipeline: holes survive folding');
  eq(r.glossWords.map(A.glossOrEmpty), ['g1', 'g3'], 'pipeline: hole then orphan fold');
}

console.log(fail ? `\n${fail} FAILURE(S)\n` : '\nall passed\n');
process.exit(fail ? 1 : 0);
