# `plans/` — design documents, tracked in git, never shipped

Design notes, feature plans, architecture decisions and the reasoning behind a rule. The kind of
thing someone forking this repo would genuinely want: why it is built the way it is, what was
considered and rejected, and where the traps are.

## Why it is safe to keep these in the repo

`src-tauri/tauri.conf.json` sets `frontendDist: "../docs"`, so **only `docs/` is bundled into the
app or served as the web version.** A Markdown file here is tracked and readable by anyone who
clones, but it is not part of the shipped product and is not reachable at a URL.

⚠ Related and easy to get wrong: **`docs/sw.js` has an explicit `APP_SHELL` array.** Anything added
under `docs/` needs a line there, and anything listed there must exist — `cache.addAll` is atomic,
so a single 404 stops the new service worker activating and pins every web user to the old app.
Files in `plans/` are outside `docs/` and so are correctly absent from that list.

## What may NOT go in here

This repo is public, and the files this app reads are live translation projects.

- **Real `.onestory` files.** A project file carries the team's names, emails and stored
  credentials alongside years of language data. One was committed under `sample/` and has since
  been removed — **do not add another**, in `plans/`, in `docs/`, or as a test fixture. Work from
  a local copy instead.
- **Real language data** — vernacular text, story titles, or anything lifted from a real project.
  Every example and fixture is synthetic; the placeholder language in these documents is "Alpha",
  ISO `qaa`, taken from the private-use range so it cannot be mistaken for a real one.
- **Real people** — member names, emails, `HgUsername`/`HgPassword`, speaker names, consent records.
- **Credentials of any kind**, including anything from a LanguageDepot or Chorus configuration.
- **An unfixed security weakness described in operational detail** while it is still live.

Structural statistics about a real project — element counts, byte lengths, how often an attribute
varies — are fine, and are what these plans are built on. They describe the *format*, not the
content.

The test before adding a file: *would you be comfortable if a stranger read this the day it landed?*

## What is in here now

| file | status |
|---|---|
| `onestory-injection.md` | `.flextext` → a new story spliced into a live `.onestory` project (Tauri-only), plus the NSIS installer work — **plan only, nothing built** |
