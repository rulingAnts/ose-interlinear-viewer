# `sample/` — put a real OneStory project here, locally

This folder is **git-ignored except for this file**. It is where you keep a real
`.onestory` project to develop and test against.

Nothing you put here will be committed. That is deliberate.

## Why it is ignored

A `.onestory` file is a translation team's live corpus. Alongside years of unpublished
language data it carries, in plain text:

- every team member's **name and email address**
- their stored **`HgPassword`** values for the LanguageDepot / Chorus sync
- consultant notes, test answers and retellings — the team's internal working record

A real project was committed here once. Removing it meant rewriting the entire history
and force-pushing every branch and every tag, which broke every clone in existence — and
even then the data had already been public for months, so the credentials in it had to be
rotated. The `.gitignore` rules exist so that never has to happen twice.

## What to put here

Any `.onestory` project you have permission to work with. Several tests and gates in
[`../plans/onestory-injection.md`](../plans/onestory-injection.md) expect one — the OSE
round-trip proof, the splice proof and the end-to-end injection check all say to supply a
real project locally.

**Always work on a copy.** The injection feature writes to the project file in place; a
tool under development should never be pointed at the only copy of anything.

## What must never happen

- Do not `git add -f` a project file. If you think you need to, you need a synthetic
  fixture instead.
- Do not quote real vernacular text, story titles or member data in code comments, tests,
  commit messages or the documents under `plans/`. Every example in this repo is
  synthetic — the placeholder language is **"Alpha", ISO `qaa`**, from the private-use
  range so it cannot be mistaken for a real one.
- Structural statistics about a real project — element counts, byte lengths, how often an
  attribute varies — are fine, and are what the plans are built on. They describe the
  *format*, not anyone's content.
