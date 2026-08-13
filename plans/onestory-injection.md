# FLExText → OneStory Editor injection — plan

**Status: PLAN ONLY. Nothing is built.**

> ## ⚠ Repo boundary — read this first
>
> **Every code change in this plan lands in THIS repo, `rulingAnts/ose-interlinear-viewer`.
> Nothing in the FlexText Editor suite changes.**
>
> Both repos contain a `docs/` folder and both contain flextext code, so every path in this
> document is prefixed:
>
> | prefix | repo | role here |
> |---|---|---|
> | **`OSE:`** | `rulingAnts/ose-interlinear-viewer` — **this repo** | **the only repo that gets code changes** |
> | **`FXE:`** | [`rulingAnts/flextext-editor`](https://github.com/rulingAnts/flextext-editor) | reference only — read for behaviour, never edited, never imported |
>
> `FXE:docs/js/flextext.js` is cited throughout as the authority on what a `.flextext` file
> *means*. It is **not** a dependency and its code is **not** copied — see the licence wall in
> §0.3, which is the reason that matters.
>
> This document is self-contained: nothing in it requires a change to the FlexText Editor repo,
> and no phase is gated on one.

---

## 0. The shape of the thing

### 0.1 What Seth asked for

> *"Can we add the ability to convert and inject flextext files as story objects into a OneStory
> Editor file (basically the inverse operation of our flextext export)? It would only work with
> the tauri version, because it has to modify the onestory editor file in place rather than using
> a browser upload/download function."*
>
> *"We also need to make sure we have an NSIS installer for the tauri app."*

`OSE:docs/flextext.html` already does the forward direction: it reads a `.onestory` project and
exports one story as `.flextext`. This plan builds the inverse and hardens the installer.

### 0.2 The one sentence that governs every decision

> **A `.flextext` is a richer document than a OneStory `<story>`, and a OneStory `<story>` is a
> richer object than a `.flextext`. Containment holds in neither direction, so there is no
> lossless round trip either way — only a small stable core that survives both.**

That core is exactly `{ story name, verse sequence, Vernacular sentence, NationalBt token string,
InternationalBt sentence }`. Two consequences the whole design hangs on:

1. **Injection creates a NEW story. It is never an edit.** The forward exporter discards
   `story@guid` and every `Verse@guid`, so no identity link survives to update against — and a
   story's consultant apparatus (6,793 `ConsultantNote`s, 9,153 `Answer`s, 6,741 `Retelling`s,
   1,410 `Anchor`s in the reference project) hangs off the very `<Verse>` elements a replace
   would overwrite. **v1 has no replace mode**, and that is a correctness decision, not a scope cut.
2. **The `.flextext` is the archival artifact; the `.onestory` is a destination.** The UI says so
   in those words (§6.6), because word alignment, morpheme analysis and audio timings exist only
   in the `.flextext`.

### 0.3 The licence wall — why nothing is copied from this repo

`flextext-editor` is **AGPL-3.0**. `ose-interlinear-viewer` is **CC BY-NC-SA 4.0**. Copying
`parseFlextext` / `surveyWritingSystems` / `analyzeFlextextWs` across would add a
non-commercial use-restriction to AGPL code, which the AGPL forbids.

**So the ~250 lines the injector needs are reimplemented natively in `OSE:`**, with the survey's
label keys kept byte-identical (`wsline.baseline`, `wsline.wordgloss`, …) so the two remain
comparable and a future relicence makes them mergeable. The duplication is deliberate and
documented, not an oversight. (**D13**)

### 0.4 Provenance of the facts in this document

Every measurement below was taken from **the reference project** — a real, in-use OneStory
project of 8,805,065 bytes: 141 stories, 2,511 Verses, 5,802 StoryLines, 43 Members, 14,313
`*guid` attributes.

> ⚠ **That file is deliberately NOT in this repository, and must not be added.** It is a
> translation team's live corpus and it carries their names, emails and stored credentials. It was
> removed from `sample/` on 2026-08-13 and this document is written to survive its absence: only
> *structural statistics* are quoted here, never vernacular text, story titles or member data.
> **Every example in this plan is synthetic** — the placeholder language is "Alpha", ISO `qaa`,
> from the private-use range precisely so it cannot be mistaken for a real one.
>
> The phases that need a real project (Gate G2, Phase 5b, Phase 6c) say so explicitly and expect
> you to supply one **locally, on a copy, never committed**. That is not a limitation to design
> around; it is the only honest way to test a tool that writes to live language data.

Behavioural claims about OneStory Editor itself come from its C# source at
`bobeaton/OneStoryEditor` and are marked **[OSE-src]**; those are the claims Gate G2 exists to
verify against the real application before anything is built on them.

---

## 1. Scope

### 1.1 v1 does

- Read one `.flextext` file — including FlexText-Editor segmentation-mode output (with
  `begin/end-time-offset`, `<media-files>` and `audio 0:00.000–…` note items), raw FLEx exports
  (with `<morphemes>`, `pos`, `lit`, `cf`, `msa`), and multi-`<interlinear-text>` files.
- Survey its writing systems **by structural tier** and map three tiers onto the three OneStory
  story lines, with rigorous defaults and explicit override.
- Build one `<story>` per `<interlinear-text>`, one `<Verse>` per `<phrase>` (default) or per
  `<paragraph>` (option).
- Rebuild the `NationalBt` gloss string by **projecting flextext words onto the whitespace
  tokenisation of the Vernacular line it is about to write** (§4) — the only tokenisation
  OneStory will ever apply.
- Show a per-verse preview and a **mandatory, non-collapsible loss report** with live counts.
- Splice the story bytes into the chosen `<stories SetName="…">` of a live project:
  byte-preserving, verified out-of-repo backup, atomic same-directory rename, structural
  post-write assertions, guid-targeted undo.
- Ship as a **Windows** Tauri desktop feature only; the web build shows the card disabled with an
  explanation; the macOS build hides it (§6.2).
- Ship a configured, **verified** NSIS installer.

### 1.2 v1 explicitly does NOT

| Not doing | Why |
|---|---|
| Replace / update an existing story | No identity link (§0.2). Would destroy the consultant workflow data hanging off those Verses. |
| Write `Anchors`, `TestQuestions`, `Retellings`, `Answers`, `ConsultantNotes`, `CoachNotes`, `ExegeticalHelps`, `StoryPurpose` | A `.flextext` contains none of them. Inventing them is worse than omitting them. |
| Create a new `<stories SetName>` | A larger edit than asked for. Refuse and list what exists. |
| Write morpheme-level analysis | OneStory has no morpheme line. Squeezing morph glosses into `NationalBt` destroys word alignment. Counted in the loss report; composition option deferred (§4.7). |
| Write time offsets, media links, `segnum`, `pos`, `speaker` | No home in the format. Loss report names each with a count. |
| Write a `FreeTranslation` StoryLine | Legal but unused in this project, and gated by `TasksAllowedPf` (§3.4). **D10.** |
| Re-segment a long paragraph into sentences | Inventing structure. Warn instead (W-SEG). |
| **Multi-file batch** | Deferred — see §1.3. |
| Support UTF-16 `.onestory` files | Refuse cleanly. Offset arithmetic doubles; a wrong guess mojibakes years of work. |
| Modify `StoryProject@version` or `PanoramaFrontMatter` | Version gates who may open the file; the front matter is a 1,102-char escaped-RTF blob no serializer round-trips. Both byte-asserted after the write. |
| An auto-updater | Orthogonal, and the population it serves is least able to use it. |

### 1.3 Reversals from the winning draft, with reasons

Three things the design panel's top-ranked draft wanted, that this plan deliberately does not do:

| Reversed | Draft wanted | This plan | Why |
|---|---|---|---|
| **Multi-file batch** | yes, in v1 | **deferred to v1.1** | The per-verse preview *is* the safety feature, and a three-file preview is the one nobody reads. Its all-or-nothing single splice is technically sound, so this is a UI-attention judgement, not a correctness one — exactly the kind of scope that should fall out under *"does v1 break, lose data or mislead without it?"* |
| **Forward-path provenance guids** | Phase 1 | **Phase 6, last** | It is the only change in the whole plan that touches a **shipping** code path field users rely on. A FLEx-import regression there should not be able to block the feature it was added to help. |
| **MSI kept in the bundle array** | prose said drop it, JSON kept it | **dropped, consistently** | The draft's own JSON contradicted its own recommendation. Resolved in §7. |

---

## 2. What each model can hold that the other cannot

Counts measured from the reference project (§0.4). This table is the source of the loss report the UI renders.

### 2.1 OneStory holds; `.flextext` cannot → already gone by injection time, **unrecoverable**

| OneStory datum | Count | Fate in `OSE:docs/flextext.html → buildFLExText` |
|---|---|---|
| `story@guid`, `Verse@guid` | 141 + 2,511 | Not emitted. **This is what makes injection add-only.** |
| `story@stage` + `TransitionHistory` | 10 stages; 1,272 transitions | Not emitted. Workflow position lost. |
| `CraftingInfo` roles (`StoryCrafter`, `ProjectFacilitator`, `BackTranslator`, `Consultant`, `Coach`) | 141/141 + 135 others; 43 Members | Not emitted. Who did what is lost. |
| `CraftingInfo@NonBiblicalStory` **and** `<stories SetName>` membership | see §2.2 | Used to *filter* the export list; never written. |
| The four `Tasks*` strings | 3 / 2 / 1 / 1 distinct | Not emitted. Also **UI-gating**, not cosmetic (§3.4). |
| `Anchors` / `TestQuestions` / `Retellings` / `Answers` / `ConsultantNotes` / `CoachNotes` / `TestsRetellings` / `TestsTqAnswers` | 1,410 / 579 / 6,741 / 9,153 / 6,793 / 722 / 132 / 160 | Not emitted. **The entire consultant-checking apparatus.** |
| `Verse@visible="false"` | 8 | Exported as ordinary paragraphs → a hidden verse comes back **visible**. |
| `[B&B …]` tags in the **Vernacular** line | 279 of 787 | `removeBnB()` strips them and collapses whitespace. **Unrecoverable.** ⚠ **Asymmetric:** NationalBt (267) and InternationalBt (241) are only `.trim()`ed, so two-thirds of the tags *do* survive the forward trip. |
| Exact whitespace in the Vernacular line | 3 leading / 24 trailing | Collapsed by `removeBnB`. |
| `<LanguageInfo>` `FontName`/`FontSize`/`FontColor`/`SentenceFinalPunct` | 3 languages | Forward hard-codes `Charis SIL` / `Times New Roman`. |
| NationalBt and InternationalBt sharing one BCP-47 code | both `ind` here | Forward writes both codes; if identical the tiers become code-indistinguishable. **This is why the inverse maps by structure, never by code** (§3.2). |

### 2.2 The set/flag disagreement — measured, and it matters

| `<stories SetName>` | stories | of those, `NonBiblicalStory="true"` |
|---|---|---|
| `Stories` | 19 | 0 |
| `Non-Biblical Stories` | 42 | 42 |
| `Old Stories` | 80 | **6** |

`OSE:docs/flextext.html` filters the story dropdown by the **flag**; membership is by **set**.
They disagree for 6 stories. **Therefore the destination set can never be inferred from the flag,
and the flag can never be inferred from the set.** Both are asked for explicitly (§3.3).

### 2.3 `.flextext` holds; OneStory cannot → lost on injection, disclosed in the loss report

| flextext datum | Why OneStory cannot hold it |
|---|---|
| Word segmentation **as data** | OneStory stores one space-joined string per line; alignment is re-derived from whitespace. Any tokenisation disagreeing with whitespace is destroyed. |
| Punctuation as its own token (`word > item[type="punct"]`) | Merges into the neighbouring surface token — harmless when attached, a hole when detached (§4.4). |
| Chained multi-word items (`<word type="phrase">`) | No chaining concept. The analyst's assertion "these two words are one unit" cannot be stated (§4.5). |
| Morphemes (`morph > item[type=txt/gls/cf/msa]`) | No morpheme line at all. **A text glossed only at morpheme level yields an entirely empty NationalBt** — warned loudly (§4.7). |
| Word `pos` | No POS line. |
| `phrase > item[type="lit"]` | Competes with `gls` for InternationalBt (**D4**). |
| `phrase > item[type="note"]` | **Must never be written.** This is where the suite's own `audio 0:00.000–…` timestamps live (`FXE:docs/js/flextext.js:463-465`). Leaking them into a StoryLine would put machine timestamps into the vernacular record. |
| `begin/end-time-offset`, `<media-files>` | **The entire output of segmentation mode.** No time slots in OneStory. |
| `<item type="segnum">` | Display sugar. Never mapped — same instinct as Seth's standing "no segnum in EAFs" rule. |
| More than one writing system per tier | One line per role. Unselected WSs simply are not written. |
| Paragraph grouping above the verse | `<Verses>` is flat (**D3**). |
| `speaker`, `interlinear-text` meta items other than title | No home. |
| Several `<interlinear-text>` in one file | **Not lost** — each becomes its own story. |

### 2.4 The composed round trip, stated exactly

Let **F** = the forward exporter, **I** = the injector. `I(F(S))` is a *new* story `S′` where:

- `S′.name == S.name` (or `S.name (2)` on collision) ✓
- verse count **identical**, including the leading `first="true"` verse — **provided R-FIRST
  (§3.5) is honoured** ✓
- `S′.Vernacular[i] == removeBnB(S.Vernacular[i])` — B&B tags gone, whitespace collapsed ✗ *(documented)*
- `S′.NationalBt[i] == S.NationalBt[i]` **iff** its token count did not exceed the vernacular
  count. **357 verses in the real project have more gloss tokens than vernacular tokens**, and
  those are recovered only by the orphan rule **R-A7** (§4.6). Without R-A7 they are silently
  dropped. ✓ *with R-A7*
- `S′.InternationalBt[i] == S.InternationalBt[i].trim()` ✓
- everything in §2.1 **absent** ✗
- `S′` carries a fresh guid, derived stage, inherited Tasks string, synthetic TransitionHistory
  ✗ *(regenerated, not recovered)*

**This asymmetry is the product spec.** The UI's job is to make it visible before the button is
pressed, not to apologise afterwards.

---

## 3. The mapping, field by field

### 3.1 Granularity

**Default: one `<phrase>` = one `<Verse>`, flattened across paragraphs.** The only rule that
behaves identically across all three input regimes (segmentation-mode 1:1:1:1, classic
multi-phrase paragraphs, raw FLEx/ELAN). Because the forward exporter emits exactly one phrase
per paragraph, **both modes are the identity for forward-exported input**; the mode only changes
behaviour for editor-, FLEx- and ELAN-sourced files, and the preview's `p.n` column makes that
visible.

Option (radio): **one `<paragraph>` = one `<Verse>`** — join phrase baselines with a space,
concatenate gloss token lists in order (§4.8), join frees with a space.

### 3.2 Writing system → story line — **structure first, code second**

The injector reimplements the 14-context survey of `FXE:docs/js/flextext.js:surveyWritingSystems()`,
keeping the label keys identical:

```
wsline.baseline   phrase > item[type="txt"]      wsline.wordgloss  word   > item[type="gls"]
wsline.word       word   > item[type="txt"]      wsline.free       phrase > item[type="gls"]
wsline.punct      word   > item[type="punct"]    wsline.lit        phrase > item[type="lit"]
wsline.morph      morph  > item[type="txt"]      wsline.note       phrase > item[type="note"]
wsline.morphgloss morph  > item[type="gls"]      wsline.pos        word   > item[type="pos"]
wsline.cf         morph  > item[type="cf"]       wsline.segnum     phrase > item[type="segnum"]
wsline.msa        morph  > item[type="msa"]      wsline.meta       interlinear-text > item
```

Claim order matters — an element belongs to the **first** matching context.

| id | Rule |
|---|---|
| **R-WS1** | `Vernacular` ← highest-count `wsline.baseline` row. Tie → the lang declared `vernacular="true"`. Still tie → document order. No baseline rows → top `wsline.word` row, and flag every phrase `reconstructed` (R-V2). |
| **R-WS2** | `NationalBt` ← highest-count `wsline.wordgloss` row. **None ⇒ role unmapped, no NationalBt lines written at all.** |
| **R-WS3** | `InternationalBt` ← highest-count `wsline.free` row; source tier selectable between `wsline.free` (default) and `wsline.lit` (**D4**). |
| **R-WS4** | NationalBt and InternationalBt resolving to the **same** code is **normal, not an error** — both are `ind` here. Roles are structural. Never dedupe; one info line notes it (W5). |
| **R-WS5** | **Never auto-map by BCP-47 code.** Codes collide, are frequently `und`, and `id` ≠ `id-ID`. Codes only *confirm* against the project's `<LanguageInfo code>` and phrase warnings. |
| **R-WS6** | A language appearing only in `wsline.segnum` or `wsline.meta` is never offered for a content role. |
| **R-WS7** | `wsline.note` is **never** offered for any role, at any confidence. Hard-coded, with a comment naming the timestamp leak. |
| **R-WS8** | Read the code off the item itself, never off a document-level "analysis language" field — that reports the registry's first non-vernacular code regardless of what was selected (`FXE:docs/js/flextext.js:249-250`). |

Rendered as three `<select>`s of `tier · lang (n items)`. Collapsed inside **Advanced** only when
all three resolved unambiguously; auto-expanded and amber-flagged otherwise.

### 3.3 Story-level fields

| attribute | Value | Rule |
|---|---|---|
| `name` | `<item type="title">` text | **R-TITLE**: prefer the title whose `lang` equals the **InternationalBt** code (the exact inverse of the forward exporter, which writes the title in `freeWS`), then Vernacular, then document order, then filename stem, then `Untitled`. Strip newlines, trim, NFC. Collision → ` (2)`, ` (3)`… |
| `stage` | derived, then confirmed | vern + word glosses + free → `ProjFacAddAnchors`; vern + word glosses → `ProjFacTypeInternationalBT`; vern only → `ProjFacTypeNationalBT`; no vern → `ProjFacTypeVernacular`. A stage names the **next** task. Editable via a `<select>` of stages already present in the project — **never free text**: an unknown stage throws `KeyNotFoundException` out of the load path, so the **whole project fails to open** **[OSE-src]**. |
| `guid` | minted in Rust, verified absent from all **14,313** existing `*guid` values | A duplicate trips a `Debug.Assert` that is a **no-op in release**, after which OSE silently re-mints and the story loses Chorus history linkage; the file handler keys `story` on `guid`, so a duplicate corrupts team merges **[OSE-src]**. |
| `stageDateTimeStamp` | `YYYY-MM-DDTHH:MM:SSZ`, now | Typed `DateTime`; malformed throws on load. |
| the four `Tasks*` strings | **§3.4** | Parsed with `Enum.Parse` on a `[Flags]` enum — an unknown token throws `ArgumentException` on load **[OSE-src]**. |
| `CountRetellingsTests`, `CountTestingQuestionTests` | `"0"` | Typed `int`. |

`<CraftingInfo NonBiblicalStory="…">` — **asked for explicitly, independently of the destination
set**, because they disagree for 6 stories (§2.2). Default `true`.

`StoryCrafter` / `ProjectFacilitator` — `<select>`s over the project's `<Member>`s filtered by
`memberType`, with an "Everyone" group at the bottom (`memberType` is comma-joined and free-ish).
Both must resolve to a real `memberKey`: a dangling `memberID` loads silently but shows blank and
breaks OSE's own copy-story path.

`<TransitionHistory>` — one `StateTransition` with `FromState == ToState == story@stage` and
`TransitionDateTime == stageDateTimeStamp`, matching the 37 single-transition stories.
`WindowsUserName` is display/audit only and nothing parses it: write
**`FlexTextInjector\<hostname>`**, never a fabricated `MACHINE\User`. This is a multi-party
consultant-checking audit trail; a plausible fake is worse than an honest marker. (**D5**)

### 3.4 The Tasks string is a UI gate — and the fallback ladder

`TasksAllowedPf` is what OSE consults to decide **which line fields to render**, so **a StoryLine
whose `*Fields` token is absent is in the file but invisible in the editor** — which reads to the
user as data loss **[OSE-src, verify at Gate G2]**.

Measured distribution of `TasksAllowedPf` across the 141 stories:

| stories | contains `*Fields` tokens |
|---|---|
| **135** | `VernacularLangFields`, `NationalBtLangFields`, `InternationalBtFields` |
| 4 | *(none)* |
| 2 | *(none)* |

**R-TASKS (resolved).** Inherit **the most common value in the project that already contains
every `*Fields` token for the lines being written** — here, the 135-story value. Only if no such
value exists, union the missing tokens into the most common value.

This resolves head-on a collision the design panel left open. One reviewer required
*"no novel vocabulary"* — every enumerated attribute value emitted must already appear
byte-identical somewhere in the file, which mechanically prevents the one failure that breaks the
**entire project** rather than one story. Another required unioning the `*Fields` tokens or the
text is invisible. Choosing the most-common-value-that-already-qualifies makes the union a **no-op
in 135 of 141 cases**, so both rules hold simultaneously and unmodified. Where a union is
genuinely unavoidable, apply the no-novel-vocabulary rule at **token level** for `[Flags]`
attributes — every token must already appear in some sibling's string — which the measured data
guarantees, since the common value contains all three.

**Fallback ladder, fail-closed** (this is the hole a critic found in the winning draft — it
declared the "no sibling story" case and then never handled it):

```
value ← last story in the destination set
      → else most common value across ALL stories in the project
      → else REFUSE with a named error. Never invent an enumerated string.
```

The same ladder applies to `stage` (project-wide `stages_present`; refuse if empty) and to
Crafter/Facilitator (project `<Member>` list; refuse if empty). A brand-new project with zero
stories is a **refusal**, not a guess — the self-closed-set path (§5.2) makes that reachable, so
it is a required test fixture, asserting `Err`.

### 3.5 Verses

| id | Rule |
|---|---|
| **R-FIRST** | `<Verses>` child 0 is always an empty `<Verse guid="…" first="true" />` — measured **141/141, and 0 of the 141 carries a StoryLine**. It is OSE's slot for story-wide notes and general test questions (of the 141, 72 carry TestQuestions/ConsultantNotes/CoachNotes children). **⚠ The composition detail:** the forward exporter iterates `querySelectorAll('Verse')`, which *includes* this verse, so **an exported flextext's phrase 0 is already empty**. Consume it rather than adding another — but see the provenance condition immediately below. |
| **R-FIRST-PROV** | **The trigger is provenance, not emptiness.** Consume phrase 0 as the first-verse slot only when it is empty **AND** carries no `begin/end-time-offset`. A segmentation-mode blank first line **is a real timed silence span**, and consuming it would eat genuine data and shift every following verse — the plan would otherwise argue for preserving it in R-V-EMPTY and discard it here. When the source marker of §8 Phase 6 exists, use it as the primary discriminator. Both cases are round-trip fixtures. |
| **R-V-EMPTY** | An empty phrase anywhere else → `<Verse guid="…" />` with no StoryLines. Legal — **8** non-first Verses in the reference project carry no StoryLine — and correct, because a segmentation-mode blank line is real. |
| **R-V-GUID** | Every Verse gets a fresh v4 guid. **Never reuse flextext phrase guids** — different namespace, and re-injecting would mint collisions. Corollary: **injection is not idempotent.** Two clicks make two stories; the name-collision warning is the only guard, which is why W3 must be loud. |
| **R-V-NOVISIBLE** | Never emit `visible`. |

### 3.6 The Vernacular line

| id | Rule |
|---|---|
| **R-V1** | `Vernacular = baseline`, verbatim, after: newlines → space (**mandatory** — 0 of 5,802 StoryLines contain a newline), trim, and whitespace-run collapse (**default on**, matching `removeBnB` so export→inject is stable — **D11**). |
| **R-V2** | Rebuild from words **only** when baseline is empty and words are present, then flag `reconstructed` and render italic in the preview. Reason: `baselineFromWords()` (`FXE:docs/js/flextext.js:364-375`) treats a straight `"` as an *opening* mark, so `somi "ta" weni.` comes back as `somi " ta " weni.` Never space-join `w.txt` by hand — punctuation is a separate `<word>` and you get `Kalu , somi .` |
| **R-V3** | XML-escape `& < > "` — including `>`, matching the file's 5,540 existing `&gt;`. |
| **R-V4** | **Never strip or add bracket markup.** `[B&B …]`, `[V5]`, `[dia]` pass through verbatim. We cannot restore what `removeBnB` removed and must not invent it. If the baseline contains `[B&B`, say so (info). |
| **R-V5** | A phrase with no vernacular but a gloss or free still gets a Verse with the lines it has. But **every** Verse carrying any StoryLine in the reference project carries a Vernacular one (**2,362/2,362**), so a NationalBt-without-Vernacular verse is unprecedented — flag it amber. |
| **R-CHAR** | **Reject any code point outside XML 1.0's `Char` production** (`#x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]`), plus unpaired surrogates. See below — this is a blocker-class hazard. |

**R-CHAR is not defensive padding.** The suite's own escaper handles exactly four characters
(`FXE:docs/js/flextext.js:23` — `&`, `<`, `>`, `"`) and does no control-character handling, so a
baseline containing `U+000B`, `U+000C` or `U+001A` — routine in paste-from-PDF/Word, which is how
field transcription reaches a textarea — travels into the `.flextext` raw. Escaping is **not** a
fix: `&#x1F;` is equally illegal in XML 1.0. .NET's `XmlReader`, which OSE uses, throws
`XmlException` and **aborts the load of the entire project**, not one story. Measured: the 8.8 MB
sample contains **zero** control bytes outside tab/CR/LF, so OSE has never been asked to tolerate
one — this is untested territory, and the failure would land on the whole team after a
Send/Receive. Enforce in **two** places: in the emitter (reject, naming the offending verse) and
again in Rust before the backup is written, because the frontend renders the payload and Rust must
not trust it.

### 3.7 Unicode normalisation — real risk, unverifiable corpus

FieldWorks stores text **NFD**; OneStory projects typed on Windows are overwhelmingly **NFC**.
NFD `é` beside NFC `é` looks identical, compares unequal, and makes OSE's ordinal comparisons and
searches silently miss. Nobody notices for months.

**But this rule cannot be validated against the only corpus available**: measured over all 5,802
StoryLines, lines not already NFC = **0**, combining marks = **0**. The sample's only non-ASCII
content is curly quotes, an en dash and a broken bar (4,542 non-ASCII bytes total) — all
normalisation-invariant. So:

- **R-NFC:** default to the project's **sampled dominant form** (computed in the Rust summary over
  200 existing StoryLines), *not* unconditional NFC — for an orthography whose keyboard and font
  stack expect NFD, composing silently changes what the analyst typed.
- Make the choice **visible and overridable**, and show at least one **before/after pair**, never
  a bare count.
- Add a **synthetic NFD fixture** to the test suite, since the real project cannot exercise the
  path. A rule that ships untested because its corpus is a no-op is a rule that ships broken.
- Name-collision detection compares NFC-normalised, case-folded strings regardless, so an NFD
  duplicate cannot slip past W3.

### 3.8 The exact XML template

Emitted with **CRLF**, 2-space indentation, `<story>` at depth 2 (indent ladder 4/6/8/10 spaces
for `story`/`CraftingInfo`/`Verses`… as measured), `" />"` with a leading space for empty
elements, attributes in the measured order, and `<StoryCrafter …></StoryCrafter>` **not**
self-closed — that form is deliberate anti-false-diff formatting in OSE's own writer **[OSE-src]**.

```xml
    <story name="{name}" stage="{stage}" TasksAllowedPf="{tasksPf}" TasksRequiredPf="{tasksReqPf}" TasksAllowedCit="{tasksCit}" TasksRequiredCit="{tasksReqCit}" CountRetellingsTests="0" CountTestingQuestionTests="0" guid="{storyGuid}" stageDateTimeStamp="{nowZ}">
      <CraftingInfo NonBiblicalStory="{true|false}">
        <StoryCrafter memberID="{crafterKey}">
        </StoryCrafter>
        <ProjectFacilitator memberID="{facilitatorKey}">
        </ProjectFacilitator>
      </CraftingInfo>
      <TransitionHistory>
        <StateTransition LoggedInMemberId="{facilitatorKey}" FromState="{stage}" ToState="{stage}" TransitionDateTime="{nowZ}" WindowsUserName="FlexTextInjector\{hostname}" />
      </TransitionHistory>
      <Verses>
        <Verse guid="{g0}" first="true" />
        <Verse guid="{g1}">
          <StoryLine lang="Vernacular">Kalu somi ta ru weni.</StoryLine>
          <StoryLine lang="NationalBt">dia pergi rumah_besar *** sungai</StoryLine>
          <StoryLine lang="InternationalBt">He went to the big house by the river.</StoryLine>
        </Verse>
        <Verse guid="{g2}">
          <StoryLine lang="Vernacular">Mesu.</StoryLine>
        </Verse>
        <Verse guid="{g3}" />
      </Verses>
    </story>
```

Hard constraints baked into the emitter, each with a comment naming its source:

- `lang` is one of the **keywords** `Vernacular` / `NationalBt` / `InternationalBt` /
  `FreeTranslation` — **never a BCP-47 code.** The setter's `default:` case is a
  `Debug.Assert(false)` that is a **no-op in release**, so `lang="qaa"` is **silently discarded**
  on load **[OSE-src]**.
- StoryLine order is `Vernacular, NationalBt, InternationalBt` — 0 of 2,511 Verses violate it, and
  the schema declares an order-significant `xs:sequence`.
- Missing lines are **omitted**, never emitted empty — all 5,802 StoryLines have non-whitespace text.
- Child order inside `<story>` is `CraftingInfo, TransitionHistory, Verses` — 141/141.
- **Namespace-free.** An emitted `xmlns` makes the element vanish from OSE's typed reader **[OSE-src]**.
- No newline in any StoryLine text and none in any attribute value — 0 in the whole file.

---

## 4. Word/gloss alignment — the rigorous core

OneStory's `NationalBt` line is a **single string**. Its correspondence to the vernacular is
implicit and positional over **whitespace tokens of the Vernacular line as OneStory will see it** —
*not* over flextext `<word>` elements. Getting this wrong misaligns every subsequent gloss in the
verse, which is the classic way a gloss line becomes worse than no gloss line.

### 4.1 `alignGlossToBaseline(baseline, words, opts)`

```
surface = baseline.trim().split(/\s+/)      // N tokens: exactly what OneStory will see
slot[i] = []                                 // i in 0..N-1
orphans = []

cursor = 0
for w of words:
    if w.txt === '':                         // forward-export padding artifact
        if w.gls: orphans.push(w.gls)
        continue
    at = baseline.indexOf(w.txt, cursor)
    if at < 0: return { failed: true }       // refuse rather than guess
    span = surfaceTokensOverlapping(at, at + w.txt.length)   // 1 token, ≥2 for type="phrase"
    cursor = at + w.txt.length
    if w.punct: continue                     // punct carries no gloss by construction
    if w.gls: slot[span[0]].push(joinInternalSpaces(w.gls))
    for k of span[1..]: slot[k].push(CONTINUATION)

tokens = slot.map(s => s.length ? s.join('.') : HOLE)   // Leipzig Rule 4: '.' joins co-slot glosses
tokens = tokens.concat(orphans)
tokens = dropTrailingHoles(tokens)                       // only when not in paragraph-join mode
return tokens.every(t => t === HOLE) ? null : tokens.join(' ')
```

`joinInternalSpaces('rumah besar') → 'rumah_besar'` (Leipzig 4A). `HOLE` and `CONTINUATION` are the
same token, default `***` (**D1**).

### 4.2 Why projection, not `words[i]` ↔ `surface[i]`

Because they differ exactly where it matters:

| # | Vernacular written | flextext words | Surface | Emitted NationalBt | Note |
|---|---|---|---|---|---|
| 1 | `Kalu somi weni.` | `Kalu`/dia, `somi`/pergi, `weni`/sungai, `.`(punct) | 3 | `dia pergi sungai` | Attached punctuation does **not** break alignment. |
| 2 | `Mesu — nari .` | `Mesu`/batu, `—`(punct), `nari`/rumah, `.`(punct) | 4 | `batu *** rumah` | **Detached punctuation is a surface token and must get a placeholder** — index-pairing emits `batu rumah`, landing *rumah* on the em-dash and shifting every later gloss. |
| 3 | `Kalu ta ru weni.` | `Kalu`/dia, `ta ru`(phrase)/`rumah besar`, `weni`/sungai, `.`(punct) | 4 | `dia rumah_besar *** sungai` | Chained item spans two surface tokens; `sungai` still lands on `weni.` |
| 4 | `Kalu somi weni.` | `somi` unglossed | 3 | `dia *** sungai` | Medial hole. |
| 5 | `Kalu somi weni.` | no glosses | 3 | *(line omitted)* | All-hole ⇒ no NationalBt StoryLine. |
| 6 | `Mesu.` | morpheme-glossed only | 1 | *(omitted)* + morph warning | §4.7 |
| 7 | `Mesu.` | `Mesu`/batu, `''`/besar (padding) | 1 | `batu besar` | Orphan recovered (§4.6). |
| 8 | `สวัสดีครับ` | one token | 1 | one gloss token | Unsegmentable script — stated in the loss report, not a bug. |

### 4.3 When counts disagree — the full table

| Situation | Behaviour |
|---|---|
| gloss for every non-punct word | Straight emission. |
| **medial or leading** holes | `***`, counted. **Never dropped** — dropping re-aligns everything after it against the wrong word. |
| **trailing-only** holes | Truncated. OneStory produces short gloss lines constantly; this removes most placeholder noise. |
| **more gloss tokens than surface tokens** | Appended as orphans (§4.6). **357 verses in the real project are this shape**, so W1 can never block. |
| projection failed | If `nonPunctWords.length === surface.length`, fall back to index pairing (FLEx's own assumption) and mark `indexPaired`. Otherwise **omit the NationalBt line for that phrase** and raise a per-phrase amber. **Invariant: never write a gloss line that could not be verified token-for-token.** |

### 4.4 Punctuation — **R-A-PUNCT**

A `word > item[type="punct"]` contributes **zero** gloss tokens and projects onto whatever surface
token it lies in. It occupies a slot only when it is itself a whitespace-delimited surface token,
in which case that slot is a hole.

### 4.5 Chained `type="phrase"` words — **R-A-CHAIN**

The gloss stays **whole** (internal spaces → `_`) on the **first** surface token of its span; the
remaining tokens of the span are holes.

The rejected alternative — splitting `rumah besar` across `ta` and `ru` — asserts `ji`→`rumah`,
`ate`→`besar`, precisely the analysis the linguist rejected by chaining them. **Writing a false
alignment is worse than writing an incomplete one**, and this is the one place in the design where
that principle is load-bearing.

### 4.6 Orphan glosses — **R-A7**

A `<word>` with empty `txt` but non-empty `gls` is an **orphan**: append its gloss as a trailing
token and count it.

This closes a specific forward/inverse gap. The forward exporter pads to
`max(vernWords, glossWords)` and writes an **empty** `<item type="txt">` for the surplus
(`OSE:docs/flextext.html:233`), whereas the suite's serializer omits an empty gloss entirely
(`if (w.gls)`, `FXE:docs/js/flextext.js:451`). **Both must read as valid input.** Without R-A7,
export→inject silently drops the surplus on the **357 verses** that have it.

### 4.7 Morphemes — **R-A-MORPH**

A word with no word-level `gls` but with `<morphemes>` children is a hole, counted in a
**separate** warning class from a plainly unglossed word:

> *Note: 34 words are glossed only at morpheme level. OneStory has no morpheme line, so they will
> appear as `***` and their analysis will not be written. Your `.flextext` still has it.*

This matters because a FLEx-native text analysed morpheme-by-morpheme with an empty word-gloss
line produces an **entirely empty NationalBt**, and the user reads that as "the tool didn't work".
Naming it is the difference between a bug report and an informed choice.

*Deferred to v1.1 (designed, not built):* an opt-in "compose word glosses from morpheme glosses"
checkbox joining a word's morph glosses with `-` (Leipzig Rule 2), every composed gloss marked in
the preview. Off by default — composed glosses are derived data and should not enter someone's
project without a deliberate click.

### 4.8 Paragraph-join mode

Concatenate per-phrase token arrays **before** dropping trailing holes; drop only at the end of the
joined line. Dropping per phrase would shift every subsequent phrase.

### 4.9 RTL and script notes

- The Vernacular line is written verbatim; OSE stores no direction hint. Tokenisation is
  script-safe.
- For an RTL vernacular against an LTR gloss, the two lines display in opposite visual order while
  remaining correctly aligned logically. Emit an info line. Do **not** "fix" it by reversing.
- For an unsegmentable script (Thai, Khmer, Lao) the whole baseline is one token and therefore one
  gloss slot. State it rather than letting the user discover it.

---

## 5. Write strategy and safety contract

**Byte-preserving splice, in Rust, behind a positive file-occupancy lock, with a verified
out-of-repo backup and an atomic same-directory rename.** The DOM round-trip is rejected outright.

### 5.1 Why not a DOM round-trip

Re-serialising the reference project changes **every line**: 62,388 CRLFs → LF, and the
`<?xml version="1.0"?>` declaration (measured: **no `encoding` attribute, no BOM**) is rewritten.
Worse, serializers turn the `&#xD;&#xA;` escapes inside the 1,102-char `PanoramaFrontMatter` RTF
attribute into literal CR/LF, which XML attribute-value normalisation then flattens to spaces on
the next read — silent and irreversible. The file's **8,966 intentional bare LFs** inside note text
cannot coexist with its **62,388 structural CRLFs** through any parser (XML 1.0 §2.11 normalises
CRLF on read).

And these projects sync through Chorus/Mercurial with a structured 3-way merger that keys
`stories` on `SetName` and `story` on `guid`: **appending one keyed child is the single
best-supported shape in that merger**, while rewriting the file turns every teammate's clean merge
into a ~9 MB conflict.

Only the splice permits the strongest verification available: *every byte outside the inserted
range is identical to the original.*

### 5.2 Finding the insertion point

A **`quick-xml` streaming pass recording byte offsets. Never a regex.** The decisive
counter-example: a self-closed `<stories SetName="Non-Biblical Stories" />` has no closing tag, so
a regex hunting the next `</stories>` sails into the *following* set and files a non-biblical story
under *Old Stories*, discovered weeks later. Attribute values are read unescaped so a `SetName`
containing `&amp;` matches.

**Belt-and-braces, retained even with a real parser:** refuse projects containing XML comments,
CDATA or processing instructions — measured **0, 0 and 0** in the reference project. With those banned,
a literal `<` cannot appear in text or attribute values, which keeps the byte arithmetic trivially
auditable and deletes the whole "`</stories>` inside a comment" hazard class for five lines.

**Parse to EOF before splicing** — otherwise you splice into a file OSE already cannot open and get
blamed for it.

**Key the API on the set's index, not its `SetName` string.** Name-matching silently takes the
first hit if two `<stories>` elements share a name; the UI is list-driven, so a duplicate would
render two identical rows both resolving to the first element. `os_plan`/`os_commit` assert that
exactly one `<stories>` matches **both** the index and the expected name, returning `Err` on zero
or multiple, and `os_commit` re-derives and asserts the same `insert_at` the user was shown.

A self-closed target set is handled by a uniform **`(offset, remove_len, insert_bytes)` edit
model** rather than being refused — refusing means the tool cannot add the first story to an empty
set, which is a plausible real request. This generalises the post-write assertion from "exactly one
insertion" to "exactly one contiguous replacement" (§5.5).

### 5.3 Pre-flight

Existence · regular file · `.onestory` extension · not read-only (**ask, never auto-clear** — a
read-only project is often a deliberate consultant copy) · not a OneDrive placeholder · directory
writable **in practice** (Controlled Folder Access protects `Documents` **by default**, which is
exactly where these files live — the message must name it) · free space ≥ 2× + 1 MB · snapshot
`len`/`sha256`/`mtime` · encoding sniff (**refuse UTF-16 cleanly**) · full parse to EOF · root is
`StoryProject` · `@version ∈ {1.6, 1.7, 1.8}` · **no comments/CDATA/PI** · target set resolves
uniquely (**never auto-create**) · name collision · guid uniqueness against all 14,313 ·
**project file not held open** (§5.4) · hg state (clean / dirty-warn / mid-merge-block) · not a
network drive · final confirmation.

**Re-check `mtime` + `sha256` immediately before the rename.** Mismatch → abort, nothing written.

### 5.4 The occupancy lock — do not rely on a process name

The winning draft hard-blocked on `StoryEditor.exe` being in the process list. That gate **fails
open**: the image name is asserted nowhere verifiable, and if OSE is launched via a shim or is
named differently, the "hard block" silently never fires while the rest of the design assumes it
did. Worse, the draft then engineered *through* the one reliable positive signal — retrying past
`ERROR_SHARING_VIOLATION` for ~6 s and celebrating replace-while-open semantics.

**Instead:**

1. **Positive probe.** Open the target with `FILE_SHARE_READ` only (deny write) and **hold that
   handle across backup + write + verify**. Failure to acquire is a **hard stop** naming OSE.
2. Keep the process-name check as a **secondary hint only**, with the assumed string in a commented
   constant marked *unverified*, and log the observed process list into the receipt so a field
   failure is diagnosable.
3. Keep a bounded retry for transient AV/indexer locks, but **a final sharing violation is always a
   hard stop**, never a success.
4. Keep a mandatory **"OneStory Editor is closed"** checkbox regardless, because detection cannot be
   proven.

Why this matters more than it sounds: if OSE holds the project and the name check missed it, the
write succeeds and OSE's next autosave writes its in-memory copy over the top — the injected story
simply ceases to exist — or OSE dumps the team's unsaved work to a `.bad` file, **itself a Chorus
include pattern, so it gets committed and pushed**.

### 5.5 Backup, write, verify

**Backup**
- Name: `<Project>.onestory.<YYYYMMDD-HHMMSSZ>.flextext-backup` — deliberately matching **none** of
  Chorus's `IncludePatterns` (`*.onestory`, `*.xml`, `*.bad`, `*.conflict`, `*.ChorusNotes`), any
  of which would commit a ~9 MB blob and **push it to LanguageDepot over village bandwidth**.
  A test asserts the property, not the literal name, so a future rename cannot quietly reintroduce it.
- Location: `%LOCALAPPDATA%\FlexTextOseInject\backups\<Project>\` — outside the hg working copy, so
  it survives `hg revert` and never syncs. Keep 10, prune oldest. Optional, default-**off**,
  "also keep a copy beside the project".
- **Ordering is load-bearing:** backup written → **`sync_all()` on the backup handle** → reopened,
  re-read and hashed → *only then* is the target touched. Re-reading alone verifies content, not
  durability: the read is served from the page cache, so a backup living only in dirty pages passes
  the check and is lost on an abrupt power cut — which is the normal way a village field laptop
  stops. The outcome would be the one state this whole design exists to prevent: a modified project
  and no backup.

**Write**
`tempfile::NamedTempFile::new_in(project_folder)` (same directory — persist is a rename, and
same-directory creation inherits the folder's ACLs) → write → `sync_all()` → `persist()`.
Never write to the target directly; never delete the original first.

⚠ **Verify, don't assume, the rename semantics.** `persist()` is *not* `std::fs::rename`, and
tempfile has historically used `MoveFileExW`, which does **not** carry POSIX
replace-while-open semantics. Add a Windows-only ignored test that opens the target in another
process and asserts what `persist()` actually does, then write the observed behaviour into the
comment. (This cuts both ways: if it *is* `MoveFileExW`, replace-while-open fails with a sharing
violation instead of succeeding — safer, but the opposite of what a naive comment would claim.)

**Post-write assertions** — re-read from disk and assert:

1. **The contiguous-replacement invariant**, stated once in its general form:
   `after[..ins] == before[..ins]`, `after[ins+insert_len..] == before[ins+replaced_len..]`, and
   `after.len() == before.len() - replaced_len + insert_len`. Pure insertion is the
   `replaced_len == 0` case. Include the degenerate test where inserted bytes coincide with their
   surroundings (`old="abcabc"`, `new="abcabcabc"` must be **accepted**) — naive common-prefix /
   common-suffix arithmetic double-counts there, so the suffix match needs a clamp.
2. **A structural assertion — this is the one the invariant cannot give you.** The byte invariant is
   insensitive to *where* the insertion landed: a splice into a `<Verses>` block instead of before
   `</stories>` is still well-formed, still differs by one contiguous range, and still has the right
   guid multiset. So: re-parse and confirm the element carrying the new guid has element-name
   `story`, **parent `stories` with the expected `SetName`, and depth exactly 2** (measured depths:
   `StoryProject`=0, `stories`=1, `story`=2, `Verses`=3, `Verse`=4, `StoryLine`=5). A required test
   deliberately mis-anchors a splice inside `<Verses>` and asserts verification **rejects** it.
3. Full parse to EOF.
4. Root element and `@version` byte-identical.
5. Story count +1 in the target set, **unchanged in every other set**, and project-wide +1.
6. The new guid occurs exactly once; guid multiset is old ∪ {new}.
7. `PanoramaFrontMatter` and the `<Members>` byte range identical — the canary for serializer damage
   and for the 43 members' credentials and PII.
8. **Re-run the no-novel-vocabulary check** on the written bytes.

**All lengths are computed in Rust from `blocks.iter().map(|b| b.as_bytes().len()).sum()`.** Never
accept a length, offset or size from the webview: JS `String.length` counts UTF-16 code units, not
UTF-8 bytes, so every curly quote makes the expectation short by one byte and a correct write gets
rolled back with a corruption message. The sample has 4,542 non-ASCII bytes and 31 StoryLines
containing typographic quotes or dashes; the reference orthography happens to be ASCII, but a
Vietnamese, Yoruba or Amharic project would fail on essentially every story. A required fixture
contains `U+201C` and a 4-byte astral character.

**Rollback is conditional, not blanket.** Set `renamed: bool` only after `persist()` returns `Ok`.
Every failure **before** the rename — backup write, backup verify, temp create, temp write, persist
— leaves the target untouched, so the handler must clean up the temp file, keep the backup, and
report *"your project was not modified"* **with no further write**. Restoring at that point would
mean writing 8.8 MB over a file we never modified, through the identical rename that just failed on
a lock; even if it succeeded it would give the file a new mtime and inode, invalidating Mercurial's
dirstate cache and making hg report the project dirty for no reason. Only post-rename assertion
failures may enter the restore path. A test injects a persist failure and asserts the target's bytes
and mtime are untouched.

### 5.6 Receipt and undo

**Receipt** JSON in appdata: `{ target_path, project_name, set_name, story_guid, story_name,
backup_path, len_before, len_after, sha256_before, sha256_after, injected_at, source_flextext:
{path, sha256}, mapping, loss_report, alignment_stats, hg_parent, observed_processes }`.

**Undo = guid-targeted excision, not blind restore.** Re-read, confirm the hash still matches,
locate the `<story>` with the recorded guid via the same streaming parser, excise its byte range
**including the preceding indentation**, then the same backup + atomic write + verify. Blind restore
would discard any real work done since.

This buys the **strongest achievable byte-level gate in the plan**: `inject → undo → sha256 ==
pre-injection hash`. Excision is the exact inverse of insertion, so identity is provable.

⚠ **The sharing gate must key on Mercurial state, not on the file hash.** A Chorus Send/Receive runs
`hg commit` + push; committing does **not** modify the working file, so a hash check still matches
hours after the story has been pushed to LanguageDepot and undo would then excise a story every
teammate already has — which the same 3-way merger faithfully replicates as a deletion. So: record
the **Mercurial parent revision** in the receipt at inject time (`.hg/dirstate`'s first 20 bytes, or
`hg parents --template {node}` when hg is on PATH) and **refuse undo if the parent has advanced or
the `.onestory` is committed-clean relative to it**. If `.hg` is absent, keep the hash check and say
plainly in the dialog that sharing cannot be detected. Gate test: commit a copy of that local project in a throwaway
hg repo, inject, `hg commit`, assert undo **refuses**.

### 5.7 Windows path realities

`longPathAware` in the app manifest, plus conversion to a verbatim `\\?\` path (built from a
canonicalised absolute path, never string concatenation) when a constructed path exceeds ~240 chars
— `C:\Users\<u>\OneDrive - <Long Org>\Documents\OneStory Editor Projects\<P>\<P>.onestory` gets
close, and the temp suffix must be budgeted. Never derive the temp filename from the project name.
Non-ASCII project names are fine; NFC-normalise for comparison only.

---

## 6. Frontend

### 6.1 Where it lives

A **fifth card** on `OSE:docs/index.html` under a second eyebrow label, plus a new page
`OSE:docs/inject.html`. It is not another export format; it is the other direction, and the menu
should say so.

```html
<p class="menu-eyebrow">Export from OneStory</p>
<div class="format-menu"> …four existing cards unchanged… </div>
<hr class="divider">
<p class="menu-eyebrow">Add to OneStory</p>
<div class="format-menu">
  <button class="btn-format btn-format-write" id="injectCard" onclick="navigateTo('./inject.html')">
    <span class="btn-format-icon">📥</span>
    <span class="btn-format-text">
      <span class="btn-format-name">Story from FLExText
        <span class="style-note-badge">Windows desktop app only</span></span>
      <span class="btn-format-desc">Adds a <code>.flextext</code> file to your
        <code>.onestory</code> project as a new story — the reverse of the FLExText export.</span>
    </span>
    <span class="btn-format-arrow">›</span>
  </button>
</div>
<p class="inject-note" id="injectNote" hidden></p>
```

Promote the four inline copies of the eyebrow style into `styles.css` as `.menu-eyebrow`, and
`flextext.html`'s `.ws-warning`/`.ws-path` into `.notice-warn` — their second use, which is the
threshold for extracting them.

The primary action uses a new **`.btn-write`** variant (solid amber, same geometry) rather than the
export pages' `.btn-accent` gradient. On an export page a misclick costs a file in Downloads; here
it costs an edit to a project a village team has been building since 2016. Colour is the only
pre-click signal.

Page title *OneStory Interlinearizer — Add Story from FLExText*; button **Add to project ›** — not
"Inject" (developer vocabulary), not "Import" (the sibling page already means "import into FLEx" by
that word). Card width `max-width: 860px`; the window is 680×680, so the preview table lives in its
own `overflow:auto` box.

### 6.2 Platform gating — three states, not two

`<input type="file">` gives no writable path, so the project side **must** be a Rust-side dialog.
Two visually different pickers on one page is a feature: it makes "this is the one I will write to"
legible.

| Build | Behaviour |
|---|---|
| **Windows Tauri** | Full feature. |
| **macOS Tauri** | **Card hidden**, via a new `os_platform()` command. v1's entire safety machinery is Windows-specific — `%LOCALAPPDATA%`, the occupancy probe, Controlled Folder Access, `\\?\` paths — and gating on `window.__TAURI__` alone would ship the feature to macOS with **none** of it: the OSE-running gate can never match, so it silently always passes, and `tempfile::NamedTempFile::new_in` creates files mode `0600` on Unix, so `persist()` would silently change a team project from `0644` to owner-only. If macOS is wanted later it needs `app_local_data_dir()`, `fs::set_permissions` copied from the original's metadata before `persist()`, and a mandatory confirmation checkbox in place of the process check. |
| **Web** | Card visibly disabled; clicking reveals an inline note (click-to-reveal, **not** `alert()` — an alert cannot be read slowly, screenshotted, or pasted to a translator): *"**Adding a story needs the desktop app.** A web page can only download files — it cannot save changes back into your `.onestory` project on disk. [Download the Windows app ↗]"*. `inject.html` defends itself the same way for bookmarked deep links (hide the form, show the note; **no redirect**). |

**Reject the degraded "download a modified copy" mode outright.** It is a data-loss path wearing a
feature's clothes: an 8.8 MB copy in `Downloads/` under a browser-chosen name, no backup, and the
user must then replace their real project — possibly while OSE holds it open, possibly diverging
from the Chorus history. The safe path and the unsafe path must not look like the same feature.

### 6.3 Flow

| # | Step | Required | Default |
|---|---|---|---|
| 1 | Project (native dialog) | yes | last-used, one click |
| 2 | FLExText file | yes | — |
| 3 | Add to set | pre-filled | *Non-Biblical Stories* if present, else last set in document order |
| 4 | Position | defaulted | End of set |
| 5 | Line mapping (3 roles) | auto, in `<details> Advanced` | §3.2; auto-expanded + amber when ambiguous |
| 6 | Verse granularity | defaulted | Phrase (**D3**) |
| 7 | Story details (name, Crafter, Facilitator, stage, NonBiblicalStory) | defaulted, inline | §3.3 |
| 8 | Preview + loss report → **Add to project** | | disabled until 1+2 satisfied and 0 red warnings |

### 6.4 The preview — the main safety feature

**Header strip**
> **Mesu nari kobe** → *Non-Biblical Stories* (43rd story) · 24 verses · 187 vernacular words ·
> 184 glosses · free translation on 22 of 24
> Lines: **qaa → Vernacular (Alpha)** · **ind → NationalBt (Indonesian)** · **ind → InternationalBt
> (Free Translation)**

**Verse table**, one row per Verse:

| # | Vernacular | NationalBt | InternationalBt | |
|---|---|---|---|---|
| 1 | *(empty leading verse)* | | | |
| 2 | Kalu somi ta ru weni. | dia · pergi · rumah_besar · *** · sungai | He went to the big house. | `4/4` |
| 3.1 | Mesu. | batu | Batu! | `1/1` |
| 3.2 | Nari kobe. | rumah · *** | | ⚠ `2/1` |

- Gloss tokens carry a hairline separator so **positional pairing is visible** — the user must be
  able to see which gloss lands on which word *before* writing.
- `***` placeholders and `_`-joined glosses render in a muted colour with a tooltip naming the rule
  that produced them.
- The `#` column shows `p.n` **only** when a paragraph produced more than one verse, so reshaping is
  visible.
- Reconstructed baselines (R-V2) in italic.
- **The vernacular column renders in the project's own `<LanguageInfo>` font, size and colour.** For
  a vernacular-speaking facilitator with limited English, the verse table is the only readable part of this
  page; making it look like OneStory Editor is the difference between "I can check this" and "I click
  and hope".
- All rows rendered, scroll box capped ~60vh. Scrolling past 90 rows *is* the "this is bigger than I
  thought" signal — 90 is the largest story in the reference project.

> ⚠ **Build this table with `createElement` / `textContent` only.** This page is the first thing in
> the repo to render untrusted file content as markup, and `tauri.conf.json` currently sets
> `"csp": null`, so there is no second line of defence. A `.flextext` whose baseline contains
> `<img src=x onerror=…>` would otherwise reach `invoke`, and with `withGlobalTauri: true` the most
> damaging call is not a stray link but `os_commit` with attacker-chosen blocks against the project
> the user just loaded. The four existing pages are already careful (`flextext.html:126` uses
> `opt.text = …`, never `innerHTML` with file data). Add a grep-based check in `OSE:tools/` asserting
> no file-derived string reaches `innerHTML` on `inject.html`, **and set a real CSP**
> (`default-src 'self'; script-src 'self'`) — every page is local and self-contained, so nothing breaks.

**Footer strip — what will physically happen**
> Adds **1** `<story>` at the end of `<stories SetName="Non-Biblical Stories">`.
> Nothing else in the project changes — every other byte is copied unchanged.
> A backup is saved first to `%LOCALAPPDATA%\FlexTextOseInject\backups\example-project\example-project.onestory.20260813-094500Z.flextext-backup`.

### 6.5 Warnings — red blocks, amber never does

One summary line per class with `(show 12)` disclosure — never 251 rows.

| id | sev | Copy |
|---|---|---|
| W1 | amber | *"12 verses have a different number of vernacular words and glosses. OneStory pairs words by position; in verse 9 the last 2 words will show `***`."* — 251 of 1,662 glossed verses in the real project already mismatch (429 once B&B tags are stripped, which is the state the injector sees), so this can never block. |
| W1b | amber | *"34 words are glossed only at morpheme level…"* (§4.7) — a **separate** class. |
| W1c | amber | *"3 verses could not be aligned reliably. Their gloss line will be left out rather than written misaligned."* |
| W2 | amber | *"3 verses have no vernacular text. They will be added as empty verses."* |
| W2b | info | *"2 of 24 verses have no free translation."* |
| W3 | amber | *"A story named 'Dua Pohon' already exists in Non-Biblical Stories. The new story will be named 'Dua Pohon (2)'."* Never red — **7 duplicate names already exist** in the reference project. |
| W4 | amber | *"This story has 240 verses. The largest story already in this project has 90."* Threshold derived from the file, never guessed. |
| W5 | info | *"Indonesian (ind) is used by two lines in this project. The mapping below is by position in the FLExText file, not by language code."* |
| W5b | amber | *"The FLExText uses 'und' for its baseline. No language in this project uses that code. It has been mapped to Vernacular (Alpha, qaa) because of where it appears in the file — check the mapping."* + auto-expand Advanced. |
| **W6** | amber, **always shown, never collapsible** | The loss report — §6.6. |
| W-SEG | info | *"12 verses contain more than one sentence (using this project's SentenceFinalPunct '.!?:')."* Uses the project's own metadata; we never re-segment. |
| W-NFC | info | Normalisation note **with a before/after example**, not a bare count (§3.7). |
| W-RTL | info | RTL/LTR display note (§4.9). |
| W-CHAR | **red** | *"Verse 12 contains a character that cannot be stored in an XML file (U+000B). OneStory Editor would refuse to open the whole project."* (§3.6 R-CHAR) |
| W7 | **red** | *"NNN.flextext is not a FLExText file (its root element is `<X>`)."* |
| W8 | **red** | *"NNN.flextext contains no verses to add."* |
| W9 | **red** | *"example-project.onestory has changed since you opened it — someone may have saved it in OneStory Editor. Choose the project again."* |
| W10 | **red** | *"Could not write to example-project.onestory. Your project has not been changed. (reason) Your original is safe at `<backup path>`."* |
| W-OSE | **red** | *"OneStory Editor has this project open. Close it completely and try again."* (§5.4) |

**Every terminal error names a path the user can act on. A failure message with no path is a bug.**

### 6.6 The loss report — mandatory, generated, never boilerplate

Always visible, never inside a `<details>`, immediately above the button. Generated from the
reader's tier census:

> **What OneStory cannot store — this will not be written**
> · audio timings on **24** phrases and 1 media file reference
> · **24** note lines (including this file's `audio 0:00.000–…` timestamps)
> · morpheme analysis on **112** words
> · part-of-speech tags on **112** words
> · line numbers (`segnum`) on 24 phrases
> · a second word-gloss language (`en`, 96 items) — only `ind` is being written
> · paragraph grouping (24 paragraphs → 24 verses, unchanged here)
>
> **Your `.flextext` file is not changed. Keep it — it is the copy that holds the word alignment,
> timings and morpheme analysis. OneStory is a destination, not an archive.**

The same report goes into the receipt, so a year later someone can tell what was dropped and find
the source file by hash.

### 6.7 Accessibility and field realism

- **Every user-visible string goes in one `const STR = {…}` object at the top of `inject.html`.**
  The app is 100% English with strings inline in markup and no string table; this is the
  highest-leverage i18n concession available and establishes the pattern the other four pages can
  migrate to. A later Indonesian pass is then one object literal.
- Keep `alert()` only for "you forgot a required pick". Every warning and failure is **inline**.
- **Never signal by colour alone** — prefix `Note:` / `Warning:` / `Cannot continue:` plus an icon.
  Lift warning body text to clear ~7:1 on the dark surface.

---

## 7. NSIS installer

### 7.1 The honest headline: NSIS already ships

`bundle.targets: "all"` resolves on Windows to exactly `[WindowsMsi, Nsis]`, and the **v2.0.0
release assets prove it** — `OSE.Interlinear.Viewer_2.0.0_x64-setup.exe`, 1.77 MB. The README's
"portable `.exe` or MSI installer" is describing that NSIS setup exe inaccurately; there is no
separate portable artifact.

**So the work is: make it explicit, add a check that can fail, and fix what is actually broken.**

### 7.2 What is actually broken

1. **v2.0.1 is a bare tag with no binaries**, while `package.json` and `tauri.conf.json` both say
   2.0.1 and five in-app "Check for updates" links point at `/releases/latest` → **v2.0.0**. Users
   are being sent to a version older than the config claims.
2. **Two of five version sites are drifted:** `package-lock.json` and `src-tauri/Cargo.lock` still
   say **1.3.0**.
3. `release-mac.yml`'s `Resolve tag` step runs `git describe --tags` **before**
   `actions/checkout@v4`, so its "leave blank for latest tag" path can never work.

### 7.3 `OSE:src-tauri/tauri.conf.json`

```jsonc
"bundle": {
  "active": true,
  "targets": ["nsis", "app", "dmg"],
  "windows": {
    "webviewInstallMode": { "type": "downloadBootstrapper" },
    "nsis": {
      "installMode": "currentUser",
      "languages": ["English"],
      "installerIcon": "icons/icon.ico",
      "compression": "lzma"
    }
  },
  "icon": [ /* unchanged */ ]
}
```

- ⚠ **The union-array trap.** Both matrix legs read the same config, and the bundler **intersects**
  the requested targets with the platform's native set — an empty intersection **bundles nothing,
  with no error**. `["nsis","msi"]` would make the macOS leg go green and ship nothing. The array
  must be the **union across both legs**.
- **`installMode: "currentUser"`**, deliberately not `perMachine` or `both` — `both` requires Admin
  **even when the user picks current-user**, and on a locked-down field laptop with no local admin
  that is a hard stop at the UAC prompt with nobody to type a password. Cost: per-profile install
  under `%LOCALAPPDATA%`. Worth a release-page line that AppLocker/SRP fleets sometimes block
  execution from there — that is an IT exception, not a config change.
- **Do not add `"Indonesian"` to `languages`.** Tauri translates 22 NSIS languages and Indonesian is
  **not** among them; adding it emits a build warning and produces an installer *labelled*
  Indonesian showing English strings, which is worse than plain English. A real Indonesian installer
  needs an `Indonesian.nsh` via `customLanguageFiles` — a separate, genuinely valuable item.
- **MSI is dropped** (**D9b**). Building MSI needs the deprecated **VBSCRIPT** optional Windows
  feature, and a WiX failure **aborts `tauri build`, taking the perfectly good NSIS artifact with
  it.** For a `currentUser` app aimed at non-admin users, the MSI has no audience the NSIS setup does
  not serve better. This does change what existing users get, hence it is a decision, not a default.
- **WebView2 (D9):** the default `downloadBootstrapper` fails on a machine with no internet *and* no
  pre-existing runtime — the LTSC / imaged field-laptop case. Recommendation: **two Windows
  artifacts**, the ~1.8 MB bootstrapper plus a ~129 MB `offlineInstaller`, via a
  `src-tauri/tauri.offline.conf.json` overlay (`--config … --bundles nsis`) and
  `releaseAssetNamePattern` so the two `-setup.exe` files do not collide. Release page:
  *"Download the small one. If it says it can't install WebView2, download the big offline one."*
  If Seth wants exactly one file, choose `offlineInstaller` — a 129 MB file that always works beats a
  2 MB file that fails on the one machine nobody can reach, and it is USB-transferable once and
  reusable, which is how these laptops actually get software.
- **Signing: none.** Unsigned is fine to *run*; SmartScreen warns on the **browser-download** path
  because of the Mark-of-the-Web, so **hand-carrying the installer on a USB stick removes the problem
  entirely** and belongs in the field instructions rather than being treated as a workaround.
  Publish SHA-256 checksums. **Do not self-sign** — an untrusted root builds no reputation and is a
  worse signal than no signature.

### 7.4 `OSE:.github/workflows/release.yml`

> ⚠ Per this repo family's cost policy, **any `.github/workflows/**` edit needs Seth's explicit OK
> first.** These are public-repo standard runners so the marginal cost is **$0**, but the gate
> applies to touching the files at all.

```yaml
- name: Assert an NSIS installer was produced
  if: matrix.platform == 'windows-latest'
  shell: pwsh
  run: |
    $f = Get-ChildItem src-tauri/target/release/bundle/nsis -Filter *-setup.exe -ErrorAction SilentlyContinue
    if (-not $f) { throw "No NSIS -setup.exe in bundle/nsis" }
    $f | ForEach-Object { "$($_.Name)  $([math]::Round($_.Length/1MB,2)) MB" }
```

Plus `uploadWorkflowArtifacts: true` (which would have salvaged the missing v2.0.1 binaries), the
`release-mac.yml` checkout-ordering fix, and `tauri-action@v0 → @v1` in **both** workflows together
(v0's last release was 2024-03-14; v1 dropped only Tauri-v1 support and `includeRelease` /
`includeDebug` / Gitea, none of which this project uses — and `uploadWorkflowArtifacts` /
`releaseAssetNamePattern` exist only on the newer action).

---

## 8. New modules, and the APP_SHELL hazard

| File | Contents |
|---|---|
| `OSE:docs/js/flextext-read.js` | `readFlextext(xml) → { texts:[{ title, titleLang, langs, meta, lines:[…] }], survey, error }`. **Own scanner, no DOM**, so it runs under plain `node`. Line shape `{ baseline, words:[{txt, gls, punct, phrase}], free, lit, note, start, end, guid }`. Handles: free translation **before and after** `<words>` (after wins); `type="gls"` disambiguated **structurally by parent**, never by re-querying; empty-gls and absent-gls both as holes; chained words; morphemes; `lit`/`note`/`pos` collected but flagged unmappable. **Plus the R-CHAR legality gate (§3.6)** — choosing a hand scanner over `DOMParser` removes the one parser in the pipeline that would have enforced the XML `Char` production, so it must be enforced explicitly. |
| `OSE:docs/js/onestory-story.js` | `alignGlossToBaseline()`, `buildStoryXml(lines, opts) → { xml, report }`, `escXmlText()`, `escXmlAttr()`, the R-CHAR check. Pure string→string, node-testable, zero deps. |
| `OSE:docs/js/flextext-write.js` | `buildFLExText(...)` extracted from `flextext.html`, unchanged. Makes the forward path testable for the first time. **Phase 6.** |

### ⚠ The APP_SHELL hazard — the v108 shape, live in this repo right now

`OSE:docs/sw.js` carries an explicit `APP_SHELL` array. Two distinct failure shapes:

- **(a) forgot to add a file** — `cache.addAll` only lists what exists, so install succeeds; the page
  simply is not precached and self-heals on the first online visit. Quiet, degraded.
- **(b) listed a path that 404s** — `cache.addAll` is **atomic**; one 404 rejects the whole promise
  inside `install`'s `waitUntil`, **the new service worker never activates**, and every existing web
  user is pinned to the old app forever. **This is the v108 shape.**
- **(c)** the service worker is registered **only from `index.html`, only when `!window.__TAURI__`**.
  A user who bookmarks `inject.html` never triggers an update check — so `index.html` must remain the
  update entry point. Conveniently, the disabled card lives there.

**A live example is sitting in the repo:** `'./renderer.js'` is in `APP_SHELL` and is dead Electron
boilerplate referenced by nothing else. Delete the file without the `APP_SHELL` line and the app
bricks for every web user.

**Prerequisite, not a nice-to-have:** add `OSE:tools/check-shell.mjs` (~15 lines, called from
`.githooks/pre-commit`) asserting **both** directions — every `docs/*.{html,css,js}` appears in
`APP_SHELL`, and every `APP_SHELL` entry exists on disk. This is the local, free analogue of this
repo family's `check-release-integrity.sh paths`, and it is what makes the `renderer.js` deletion
safe.

⚠ Also note the hook is activated by `core.hooksPath`, i.e. **by running `npm install` once after
cloning**. A contributor who only edits HTML has no reason to, and nothing checks that
`CACHE_VERSION` changed. This belongs in a new `OSE:CLAUDE.md`.

---

## 9. Rust surface

State: `struct Loaded { path: PathBuf, bytes: Vec<u8>, sha256: [u8;32], mtime: SystemTime,
lock: File /* FILE_SHARE_READ handle, §5.4 */, summary: Summary, guids: HashSet<String> }` held in
`tauri::State<Mutex<Option<Loaded>>>`.

**The frontend never sees or supplies a filesystem path for writing.** `save_file` today is safe only
because its destination comes from a dialog the user just confirmed; an in-place `write(path,
content)` would let any JS in the webview overwrite any writable file, since `withGlobalTauri: true`
exposes `invoke` to all page script. The path lives in Rust state; JS gets a display string.

```rust
#[tauri::command] async fn os_open(window: tauri::Window) -> Result<Summary, String>;
// rfd AsyncFileDialog::pick_file().set_parent(&window), filter *.onestory.
// Reads bytes, sniffs encoding (refuse UTF-16), full quick-xml parse to EOF,
// acquires the FILE_SHARE_READ lock, runs pre-flight, stores Loaded, returns a few-KB Summary.

#[derive(Serialize)] struct Summary {
  display_path: String, project_name: String, version: String, byte_len: u64,
  sets: Vec<SetInfo>,        // { index, name, story_count, story_names, self_closed, last_story }
  members: Vec<MemberInfo>,  // { key, name, member_type }
  languages: Vec<LangInfo>,  // { lang, name, code, font_name, font_size, font_color, sfp }
  stages_present: Vec<String>,
  tasks_defaults: Option<StoryDefaults>,   // §3.4 ladder, resolved in Rust; None ⇒ UI must refuse
  dominant_normalization: &'static str,    // "NFC" | "NFD" | "mixed"
  warnings: Vec<String>,
}

#[tauri::command] fn os_mint_guids(n: usize) -> Result<Vec<String>, String>;
// v4, lowercase, each verified absent from Loaded.guids; inserted on success.

#[tauri::command] fn os_plan(set_index: usize, set_name: String, at_end: bool, blocks: Vec<String>)
    -> Result<InsertPlan, String>;
// Dry run. Locates the anchor by INDEX, asserts the name matches, re-runs R-CHAR on every block,
// and derives EVERY length in Rust from blocks.iter().map(|b| b.as_bytes().len()).sum(). No write.

#[tauri::command] async fn os_commit(set_index: usize, set_name: String, at_end: bool,
                                     blocks: Vec<String>, expect_insert_at: u64)
    -> Result<CommitReceipt, String>;
// Re-check mtime+sha256 (W9) → re-derive the anchor and assert it equals expect_insert_at →
// R-CHAR again → backup + sync_all + verify → splice → temp + sync_all + persist →
// the eight post-write assertions → conditional rollback (§5.5).

#[tauri::command] async fn os_undo(receipt_id: String) -> Result<(), String>;
#[tauri::command] fn os_host_label() -> String;          // hostname for WindowsUserName
#[tauri::command] fn os_platform() -> &'static str;      // gates the card to Windows (§6.2)
#[tauri::command] fn os_reveal_backup_dir() -> Result<(), String>;
```

⚠ **`os_reveal_backup_dir()` takes no argument, deliberately.** A `reveal(path: String)` would hand
an arbitrary webview-supplied path to `opener`, which on Windows is `ShellExecute` — it will run a
`.exe`, a `.lnk` or a UNC path. Rust already knows the only path it ever needs. Stating a threat
model and then shipping an arbitrary-shell-execute primitive four lines later is exactly the kind of
thing an adversarial read is for.

**Capabilities: unchanged, `["core:default"]`.** These are app commands, not `plugin:` commands, and
`frontendDist: "../docs"` is a local origin. ⚠ **Tripwire:** the moment anyone adds
`src-tauri/permissions/*.toml`, the ACL gate flips on for **every** command including the three that
work today. It is all-or-nothing.

**Stay with `rfd`-in-Rust** rather than `tauri-plugin-dialog` + `tauri-plugin-fs`. rfd is already in
`Cargo.lock` (0.15.4), needs zero config, and purpose-built commands are a strictly smaller attack
surface than generic `readTextFile`/`writeTextFile` exposed to the webview. Use `AsyncFileDialog`
inside `async fn` (never the blocking `FileDialog`), and add `.set_parent(&window)` — free, zero new
deps (`raw-window-handle 0.6.2` is already single-versioned), and it fixes the existing unparented
dialog drifting behind the app window.

**New Cargo deps:** `quick-xml`, `tempfile`, `sha2`, `uuid`. Windows-only ones —
`windows` (drive type, file attributes, the share-mode open) and any process probe — go under
**`[target.'cfg(windows)'.dependencies]`**, not plain `[dependencies]`: a plain entry breaks the
`macos-14` leg outright, and `fail-fast: false` means the Windows leg would still publish, producing
exactly the half-empty release §7.2 complains about.

**IPC volume:** the 8.8 MB file never crosses the bridge. Rust reads it and returns a few-KB
`Summary`; JS reads only the small `.flextext`, exactly as `flextext.html` already does.

---

## 10. Phasing — every gate can fail

The convention, adopted from this repo family: **a gate that has never been observed failing is
decoration.** Where a gate is a checker, it must be *shown failing* on the current tree before it is
trusted.

| Phase | Work | **GATE** — named, failable, with an expected result |
|---|---|---|
| **0** | Plan lands here; Seth answers D1–D13. | Every D has a recorded answer. |
| **1** | `OSE:tools/check-shell.mjs` + pre-commit wiring; version-site checker. | (a) The version checker **exits 1 on the current tree**, naming `package-lock.json` and `Cargo.lock` at 1.3.0. (b) `check-shell.mjs` **exits 1** when a bogus `./nope.js` is added to `APP_SHELL`, and **exits 1** before `./inject.html` is added — proving it catches the v108 shape. Then both green. |
| **2** | **OSE round-trip proof, before any code.** Hand-edit a **copy of a real project you supply locally** (§0.4) to insert one story built to the §3.8 template; open it in real OneStory Editor. | Six named checks: project opens with no exception; story lands in the chosen set; verse 1 is the story-notes slot; **all three StoryLines render in the right fields**; Crafter/Facilitator names resolve; and **a `TasksAllowedPf` missing a `*Fields` token really does hide that line** (§3.4). Then OSE's own Save leaves every other story byte-identical. **Only now is the golden fixture frozen.** |
| **3** | `flextext-read.js`. | `node tools/test/flextext-read.test.mjs` passes §11.1, including: **no `note` item's text appears in any line's `baseline`, `free` or `lit`**, and R-CHAR rejects `U+000B` and a lone surrogate. |
| **4** | `onestory-story.js` — alignment + emitter. | (a) `align.test.mjs` reproduces **every row of §4.2 exactly, string-for-string**. (b) `onestory-story.test.mjs` asserts the block **byte-for-byte** against the Phase-2 golden fixture: CRLF, the indent ladder, `" />"`, `<StoryCrafter …></StoryCrafter>`, attribute order, `&gt;`, the leading `first="true"` verse, no `visible`, **no BCP-47 in any `lang`**. |
| **5** | Rust: open, plan, commit, undo, backup, verification. | (a) `cargo test` offset suite: normal set; **self-closed `<stories … />`**; a comment containing `</stories>`; `SetName` containing `&amp;`; missing set → `Err`; **duplicate SetName → `Err`**; **zero-story project → `Err`, not a guess**. (b) **The splice proof:** inject into a copy of a real multi-megabyte project (supplied locally, never committed), then `node tools/verify-splice.mjs orig new` prints `identical outside [a, a+n)`; `PanoramaFrontMatter` and `<Members>` byte ranges identical. (c) **A deliberately mis-anchored splice inside `<Verses>` is REJECTED** by the structural assertion. (d) A fixture containing `U+201C` and a 4-byte astral character produces a plan length equal to the actual on-disk delta. (e) An injected persist failure leaves the target's bytes **and mtime** untouched. (f) `inject → undo → sha256 == pre-injection hash`. (g) In a throwaway hg repo: inject, `hg commit`, **undo refuses**. |
| **6** | `inject.html`, preview, loss report, warnings, platform gating. **Then** the forward-path provenance change (`flextext-write.js` extraction + guids + `<item type="source">`). | (a) Web build: card visibly disabled, click reveals the note; `inject.html` opened directly shows the note and no form. (b) macOS build: card **absent**. (c) Windows: inject a **segmentation-mode** `.flextext` (offsets + note items) into a copy of that same local project, open in OneStory Editor, confirm item by item — right set, right name, verse 1 is the notes slot, verse counts match the preview, all three lines render, **the gloss tokens sit under the intended words**, and **no `audio 0:00.000–…` string appears anywhere in the story**. (d) OSE Save/Reopen leaves the story unchanged. (e) Provenance regression: the new export differs from captured pre-refactor output by **exactly 3 added lines/attributes and nothing else** — a diff-count assertion, not an eyeball — and the result still **imports into FLEx** without error. |
| **7** | NSIS config, workflow assert, `release-mac.yml` fix, five version sites → 2.1.0 with both lockfiles regenerated, README/CLAUDE.md rewrite. | (a) A local Windows build produces `bundle/nsis/OSE Interlinear Viewer_2.1.0_x64-setup.exe`. (b) Version check → **5/5 sites agree**, lockfiles included. (c) Tagged release run green **and** the assert step printed the `-setup.exe` name and size. (d) **The published release page lists the NSIS `-setup.exe`** — checked on the page, not assumed. (e) **Fresh-VM install as a non-admin user succeeds and the app launches.** |

---

## 11. Testing

`OSE:` has **no test infrastructure at all** — no CI, no linter, nothing runs on push. Introduce the
convention this repo family already uses: plain ESM scripts, no framework, no npm install, run
directly with `node`; a header comment saying *why the test exists*; `let fail = 0; const ok = …`;
`process.exit(fail ? 1 : 0)`. Add `OSE:tools/run-tests.sh` looping `tools/test/*.test.mjs` and call
it from the pre-commit hook alongside `check-shell.mjs`.

Everything in §3 and §4 is unit-testable with **zero GUI and zero DOM**, because the reader carries
its own scanner.

**11.1 `flextext-read.test.mjs`** — free translation before `<words>`; after; both (after wins); a
word gloss must **never** be promoted to a free translation; empty `<phrase/>`; `<paragraph>` with no
`<phrases>`; two `<interlinear-text>`; missing `<languages>`; `version="1"` and no version;
morphemes-only word; punct word; `<word type="phrase">` with an internal space; two word-gloss
languages; a `<scrMilestone>`; a segmentation-mode file with offsets, `<media-files>` and `audio …`
notes; a forward-exported file with **empty `txt` items (padding) and empty `gls` items**;
`U+000B`; a lone surrogate; **an NFD fixture** (§3.7).

**11.2 `align.test.mjs`** — every row of §4.2, plus: all-holes → `null`; trailing truncation; medial
hole preserved; orphan appended; projection failure with equal counts → index-paired; with unequal
counts → `null` + flag; paragraph-join does **not** truncate per phrase.

**11.3 `roundtrip.test.mjs`** — the composition test, and the reason the forward extraction exists.
Take a **synthetic** `<story>` fragment modelled on the reference project's shape (**never real vernacular text,
never a real `<Member>` line, never a real speaker name** — the sibling's `FXE:plans/README.md`
carries the exclusion list this follows), run
write → read → build, and assert against the original with the documented losses applied:

- verse count identical (proves **R-FIRST**), **and** a segmentation-mode fixture whose phrase 0 is a
  timed silence keeps that verse (proves **R-FIRST-PROV**)
- `Vernacular[i] === removeBnB(original[i])` for every i
- `NationalBt[i] === original[i]` for every verse whose gloss count ≤ vernacular count
- **and also** for verses with surplus gloss tokens (proves **R-A7**) — include at least one, since
  357 verses in the real project are that shape
- `InternationalBt[i] === original[i].trim()`
- a verse containing `[B&B Yesus ikut]` comes back **without** it — asserted explicitly, with a
  comment naming it a known intended loss
- a `visible="false"` verse comes back visible — same treatment
- a second run of the same input produces **different** guids (proves non-idempotency is deliberate)

**11.4 Rust `#[cfg(test)]`** — offset finding (Phase 5a), guid-set membership, the eight post-write
assertions against a small synthetic project, the contiguous-replacement invariant including the
`old="abcabc"` / `new="abcabcabc"` degenerate case, and the UTF-8 length fixture.

**11.5 Not unit-testable** — the rfd dialogs, the occupancy probe, the OneDrive/CFA/AV paths, and
OSE's own reading of the result. Those are the manual gates in Phases 2, 5 and 6, **named with
expected results**, because there is no staging estate here. Given the feature writes to user data,
that manual smoke test on a **copied** project deserves the same weight this repo family gives Seth's
production test-drive sign-off.

---

## 12. Decisions for Seth

| # | Decision | Recommended default | Why |
|---|---|---|---|
| **D1** | Gloss-hole placeholder | **`***`**, trailing holes dropped | What FLEx itself shows for a missing analysis; ASCII-safe; obviously not a real gloss. Alternatives: `–`, `?`, or "omit the whole gloss line when incomplete". |
| **D2** | Chained `type="phrase"` word | **gloss whole with `_` on the first surface token; rest are holes** | Splitting asserts an analysis the linguist explicitly rejected. |
| **D3** | Verse granularity | **one phrase = one Verse** | Identical to the forward mapping; stable across all three input regimes. Paragraph mode offered as a radio. |
| **D4** | InternationalBt source tier | **phrase `gls`** default, `lit` selectable | `gls` composes with the forward path exactly; `lit` is currently invisible to every consumer and is the better free translation in some projects. |
| **D5** | `<TransitionHistory>` | **one `StateTransition`, `WindowsUserName="FlexTextInjector\<hostname>"`** | Preserves the `stage == last ToState` invariant (141/141) and is honest provenance. Never fabricate `MACHINE\User`. |
| **D6** | Unicode normalisation | **match the project's sampled dominant form**, visible and overridable, with a before/after example | Unconditional NFC silently changes what the analyst typed for an NFD orthography — and the rule cannot be validated against this corpus (0 non-NFC lines), so it ships on a synthetic fixture. |
| **D7** | Provenance guids in the forward export | **yes — but Phase 6, last** | Makes export→inject duplication detectable and is the only thing that could ever enable a real update path. It is also the only change touching a **shipping** path, so it must not be able to block the feature. |
| **D8** | Multi-file batch in v1 | **no — defer to v1.1** | The per-verse preview *is* the safety feature, and a three-file preview is the one nobody reads. |
| **D9** | WebView2 install mode | **two Windows NSIS artifacts** (bootstrapper + offline), clearly labelled | 129 MB is punishing over village bandwidth and wasted on most machines; 2 MB fails on the one machine you cannot reach. Fallback if one file is wanted: `offlineInstaller`. |
| **D9b** | Keep or drop the MSI target | **drop it** | MSI needs the deprecated VBSCRIPT feature, and a WiX failure aborts the build and **takes the NSIS artifact with it.** But it changes what existing users get. |
| **D10** | Write a `FreeTranslation` StoryLine | **no in v1** | Legal but unused here, and needs `FreeTranslationFields` unioned into `TasksAllowedPf` or it is invisible. Revisit if a target project already uses it. |
| **D11** | Collapse whitespace runs in the Vernacular line | **on** | Matches `removeBnB`'s collapse so export→inject is stable; only 3 leading / 24 trailing exist in the real project, i.e. accidental there too. |
| **D12** | Plan doc home | ~~open~~ **settled: `OSE:plans/` — here.** | It documents a change to this repo, so it lives with the code it governs, and nothing about it depends on the sibling. This also establishes `OSE:plans/` as a folder — tracked, never served (`frontendDist` is `../docs`, so nothing outside `docs/` ships). |
| **D13** | Licence route | **reimplement the reader in `OSE:`; do not copy engine code** | AGPL forbids adding the NC restriction. Relicensing `ose-interlinear-viewer` to AGPL is a bigger decision than this feature and should not be made by a `git cp`. |

### Open risks worth naming

- **The whole feature's value depends on the gloss line being trustworthy.** If Seth would rather
  never write a partially-aligned gloss line than write one with placeholders, that is a coherent
  alternative policy (D1's "omit when incomplete") and it should be decided **before Phase 4**, not
  after field feedback.
- **Non-idempotency is the sharpest edge.** Two clicks make two stories with different guids, and the
  only guard is a name-collision warning. Cheap mitigation using data the receipt already holds: warn
  on a repeat of the **same source SHA-256** into the same project.
- **Every OSE-behaviour claim marked [OSE-src] is inferred from C# source, not from running the
  application.** That is precisely why Gate G2 (Phase 2) exists and why it comes before any code.
  `R-TASKS` in particular is simultaneously the most valuable insight in the plan and the least
  verifiable from the corpus alone.
- **v2.0.1 has no binaries.** Independent of this feature, that tag should be built or deleted — five
  in-app "Check for updates" links currently resolve to a version older than the config claims.
- **A v1.1 alternative worth recording so it is not rediscovered:** OneStory Editor has its own
  *copy story from another project* clipboard path, which merges through OSE's own validation with no
  file locking and no possible guid collision. As a "Copy story for OneStory Editor" button beside
  the write button it is strictly safer than any splice for a nervous user or a project on a network
  drive, and costs one clipboard capability.

---

## Appendix — corrections applied during review

This plan is the output of a research → three-design-panel → judge → adversarial-verify pass. The
following were wrong in the winning draft and are fixed above; they are recorded so nobody
reintroduces them from an older copy.

| Was | Now | Evidence |
|---|---|---|
| "12 leading / 95 trailing" whitespace on Vernacular lines | **3 leading / 24 trailing** | measured |
| "7 non-first empty Verses" | **8** (counting "no StoryLine") | measured |
| Gloss mismatch "251/1,662 (15%)" | 251 (15%) raw, **429 (26%)** once B&B tags are stripped — which is the state the injector sees. Orphan-direction specifically: **357** | measured |
| `bundle.targets` JSON kept `"msi"` while the prose recommended dropping it | dropped consistently | §7.3 |
| R-FIRST triggered on **emptiness** | triggers on **provenance** (R-FIRST-PROV) | a segmentation-mode leading silence is real data |
| `blocks_len` accepted from the webview | all lengths derived in Rust from UTF-8 bytes | JS `.length` is UTF-16 code units |
| No XML `Char`-production check anywhere | R-CHAR, enforced in the emitter **and** in Rust | a hand scanner replaced the only validating parser |
| Tasks/stage/member defaults with no "no sibling story" case | explicit fail-closed ladder | §3.4 |
| Blanket rollback on "any failure" | rollback only after a successful rename | 5 pre-rename failure points touch nothing |
| Post-write assertions insensitive to **where** the splice landed | structural depth/parent assertion added | a splice into `<Verses>` passed all seven |
| `StoryEditor.exe` name check as the hard block | positive `FILE_SHARE_READ` occupancy lock held across the write | a name check fails open |
| Backup verified by re-read only | `sync_all()` **before** verify | a page-cache read verifies content, not durability |
| Undo gated on the file hash | gated on the **Mercurial parent revision** | `hg commit` does not modify the working file |
| Feature gated on `window.__TAURI__` alone | gated to **Windows**; `windows` crate under `cfg(windows)` | macOS would get the feature with none of its safety machinery, and a plain `[dependencies]` entry breaks the macOS leg |
| `os_reveal(path)` | `os_reveal_backup_dir()`, no argument, plus a real CSP | `opener` on Windows is `ShellExecute` |
| Insertion assertion written only for `replaced_len == 0` | stated once in general contiguous-replacement form | the self-closed-set path is a required test |
| Set located by `SetName` string | located by **index**, name asserted, `insert_at` echoed and re-asserted | duplicate names resolve to the first hit |
| `rust-version = "1.85"` comment asserting `fs::rename` POSIX semantics | replaced by an observed-behaviour test | `persist()` is not `fs::rename` |
| Unconditional NFC | project's dominant form, overridable, synthetic fixture | 0 non-NFC lines in the corpus — the rule was untestable |
