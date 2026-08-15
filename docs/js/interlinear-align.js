// ============================================================
// interlinear-align.js — vernacular ↔ gloss tier alignment
// ============================================================
//
// WHY THIS EXISTS
//
// OneStory stores four *strings* per verse (VerseData.cs: Vernacular,
// NationalBt, InternationalBt, FreeTranslation). There is no word-level
// structure anywhere. Alignment between the vernacular baseline and the
// NationalBt gloss line is emergent: split both on whitespace and pair
// them 1:1, left to right. Delete a token from one tier and everything
// after it re-associates one slot to the left.
//
// That model leaked in three separate ways, all measured against a real
// 141-story project:
//
//   1. removeBnB() stripped "[B&B …]" tokens out of the vernacular and
//      left the gloss tier untouched — 494 tokens deleted from one tier
//      only, misaligning 186 verses (11% of glossed verses).
//   2. A translator who skips a gloss cannot say so: OneStory has no way
//      to represent an empty slot (OSE's own splits pass
//      StringSplitOptions.RemoveEmptyEntries, so a doubled space is
//      discarded, not preserved). 72 verses are short, 61 by exactly one.
//   3. Surplus gloss tokens were emitted as words with empty baseline
//      text — 294 phantom words that render as blank columns in FLEx.
//
// This module is the single source of truth for all three rules. It is
// deliberately dependency-free and side-effect-free so the same code runs
// in the browser and under plain `node` for the tests in tools/test/.
//
// UMD-lite: the browser gets a global (classic <script>, so the existing
// inline onclick= handlers keep working); node gets module.exports.
//
// NOTE: docs/xlingpaper.html and docs/html.html are XSLT and cannot
// import this. They implement the same rules in their own templates —
// keep the two in step, and see tools/test/interlinear-align.test.mjs,
// which asserts both behaviours.

(function (root) {
  'use strict';

  // The hole marker. A translator types this where a word has no gloss;
  // machine-facing exports turn it back into an empty gloss.
  //
  // '***' is what FLEx itself shows for a missing analysis, it is ASCII,
  // and it is obviously not a real gloss. Verified safe against the
  // reference project: 0 of 1,662 NationalBt lines contain even one '*',
  // so an exact-token match can never collide with real data.
  var HOLE = '***';

  var BNB_SPAN = /\[B&B[^\]]*\]/g;

  function tokens(s) {
    s = (s == null ? '' : String(s)).trim();
    return s ? s.split(/\s+/) : [];
  }

  // ------------------------------------------------------------
  // stripBnBPaired(vernacular, glossLine) -> { vernWords, glossWords }
  // ------------------------------------------------------------
  // Removes "[B&B …]" annotation spans from the vernacular WITHOUT
  // breaking alignment, by deleting the same token INDICES from both
  // tiers rather than doing a string replace on one of them.
  //
  // The gloss tier is only touched when the two tiers were associated to
  // begin with (equal token counts). If they already disagreed we cannot
  // know which gloss belongs to which word, so we leave the gloss alone
  // and let the caller's hole/orphan handling deal with it.
  function stripBnBPaired(vernacular, glossLine) {
    var text = (vernacular == null ? '' : String(vernacular));

    var spans = [];
    BNB_SPAN.lastIndex = 0;
    var m;
    while ((m = BNB_SPAN.exec(text)) !== null) {
      spans.push([m.index, m.index + m[0].length]);
    }

    // Tokenise with the tag still in place — this is what OneStory
    // displays and therefore what the translator glossed against.
    var toks = [];
    var re = /\S+/g;
    while ((m = re.exec(text)) !== null) {
      var a = m.index, b = a + m[0].length;
      var inTag = false;
      for (var i = 0; i < spans.length; i++) {
        if (a < spans[i][1] && b > spans[i][0]) { inTag = true; break; }
      }
      toks.push({ tok: m[0], inTag: inTag });
    }

    var keep = [];
    for (var j = 0; j < toks.length; j++) if (!toks[j].inTag) keep.push(j);

    var gloss = tokens(glossLine);
    var vernWords = keep.map(function (k) { return toks[k].tok; });
    var glossWords = (gloss.length === toks.length)
      ? keep.map(function (k) { return gloss[k]; })
      : gloss;

    return { vernWords: vernWords, glossWords: glossWords };
  }

  // ------------------------------------------------------------
  // glossOrEmpty(token) -> string
  // ------------------------------------------------------------
  // Exact-token match only, never a substring: a real gloss containing
  // '***' as part of a longer token must survive untouched.
  function glossOrEmpty(tok) {
    return (tok === HOLE) ? '' : (tok == null ? '' : String(tok));
  }

  // ------------------------------------------------------------
  // foldOrphans(vernWords, glossWords) -> { vernWords, glossWords }
  // ------------------------------------------------------------
  // When there are more gloss tokens than vernacular words, append the
  // surplus to the LAST real word's gloss instead of emitting slots with
  // no baseline text. This is rule R-A7 from plans/§4.6, applied to the
  // outbound direction.
  //
  // Both arrays come back the same length, so every consumer can pair by
  // index without a bounds check. If there is no vernacular word at all
  // to attach to, the surplus is dropped — there is nowhere to put it
  // that would not invent a word.
  function foldOrphans(vernWords, glossWords) {
    var v = (vernWords || []).slice();
    var g = (glossWords || []).slice();

    if (g.length > v.length) {
      if (v.length === 0) return { vernWords: [], glossWords: [] };

      // Hole markers carry no information, so they are dropped on both
      // sides of the join: appending a literal '***' onto a real gloss,
      // or onto a slot that was itself a hole, is worse than discarding
      // it. If nothing survives, the slot keeps whatever it had — so a
      // hole stays a hole rather than silently becoming a real gloss.
      var notEmpty = function (t) { return t !== undefined && t !== '' && t !== HOLE; };
      var surplus = g.slice(v.length).filter(notEmpty);
      g = g.slice(0, v.length);

      if (surplus.length) {
        var last = v.length - 1;
        var parts = (notEmpty(g[last]) ? [g[last]] : []).concat(surplus);
        g[last] = parts.length ? parts.join(' ') : g[last];
      }
    }

    // Pad the short side so callers can always pair by index.
    while (g.length < v.length) g.push('');

    return { vernWords: v, glossWords: g };
  }

  // ------------------------------------------------------------
  // alignVerse(vernacular, glossLine) -> { vernWords, glossWords }
  // ------------------------------------------------------------
  // The whole pipeline, in the order the rules must apply: pair-strip the
  // B&B spans first (it changes both token counts), then fold orphans
  // against the corrected counts. Hole markers are left intact here —
  // whether '***' becomes an empty gloss or stays visible depends on the
  // consumer, so that decision belongs to the caller via glossOrEmpty().
  function alignVerse(vernacular, glossLine) {
    var stripped = stripBnBPaired(vernacular, glossLine);
    return foldOrphans(stripped.vernWords, stripped.glossWords);
  }

  var api = {
    HOLE: HOLE,
    tokens: tokens,
    stripBnBPaired: stripBnBPaired,
    glossOrEmpty: glossOrEmpty,
    foldOrphans: foldOrphans,
    alignVerse: alignVerse
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OseAlign = api;
})(typeof self !== 'undefined' ? self : this);
