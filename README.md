# ose-interlinear-viewer
OneStory Editor Interlinear Viewer

Imports stories from a OneStory Editor project file and displays or exports them as Interlinear Texts in multiple formats. (Word/OpenOffice XML export is planned but not yet implemented.)

## How to use

**Option A — Desktop App (Windows or Mac)**

1. Download the portable `.exe` or use the MSI installer for Windows (latest release [here](https://github.com/rulingAnts/ose-interlinear-viewer/releases/latest)), or download the Mac build if available.
2. Launch the app.

**Option B — Web App (in-browser)**

Open `index.html` directly in Google Chrome, Microsoft Edge, or Safari. No installation required. The web version may include more recent (but potentially experimental) changes than the packaged desktop release.

---

3. Choose your export format:
   - **XLingPaper** — downloads an `.xml` file you can open in [XLingPaper](https://software.sil.org/xlingpaper/). More powerful for formal linguistic presentation, but requires XLingPaper to be installed.
   - **Web Page** — opens the interlinear story directly in a new browser tab. No extra software needed; great for quick review.
   - **Tab-Separated (TSV)** — downloads a `.tsv` file you can open in Excel, Google Sheets, or any spreadsheet app. Uses FLEx-style layout: each verse is three rows (vernacular words, glosses, free translation) with one word per column.

4. Click **Choose...** (or the file input) and navigate to your OneStory Editor database. It is typically at:
   `Documents/OneStory Editor Projects/<projectname>.onestory`
   (or `My Documents/My OneStory Editor Projects/` on some systems).

5. After opening the file, a list of stories appears. Use the **Biblical / Non-Biblical / All** filter, then pick a story from the dropdown and click **Generate**.

### Back-Translation Style options (XLingPaper and Web Page only)

| Style | Description |
|---|---|
| **FLEx Style** | Free translation shown inline below each verse's word-for-word gloss (like FieldWorks Language Explorer) |
| **Paratext Style** | Free translation shown as a block paragraph section at the end (like Paratext) |
| **Both** | Includes both the interlinear section and the Paratext-style paragraph section |

The TSV export always uses FLEx style. The paragraph view at the end (Paratext style) is especially useful for attending to overall discourse flow — plot structure, information flow, and big-picture story issues.

## Development

Built with [Tauri v2](https://tauri.app/). The frontend is static files in `docs/` — the same
files GitHub Pages serves as the web version — and `src-tauri/` is the Rust shell around them.

```bash
npm install
npm run dev
```

Requires Node.js and a Rust toolchain. `npm install` is not optional: its `prepare` script sets
`core.hooksPath`, which is what activates the pre-commit hook in `.githooks/`. That hook stamps
`CACHE_VERSION` in `docs/sw.js`, refuses to commit a `.onestory` project file, and runs the
checkers in `tools/`. If you skip it, all of that silently does nothing — `npm run dev` will
refuse to start until it is wired, and `npm run doctor` checks it on demand.

The XLingPaper and Web Page exports use client-side XSLT (via the browser's built-in
`XSLTProcessor`) to transform the `.onestory` XML. The TSV and FLExText exports use plain
JavaScript. No server needed for any format.

⚠ `docs/sw.js` carries an explicit `APP_SHELL` array. Anything added under `docs/` needs a line
there, and anything listed there must exist on disk — `cache.addAll` is atomic, so a single 404
stops the new service worker activating and pins every web user to the old version.
`npm run check` asserts both directions.

## Licence

Copyright © Seth Johnston.

Licensed under the [GNU Affero General Public License v3.0](LICENSE.md) or later
(`AGPL-3.0-or-later`). You may use, modify and redistribute this software, including
commercially, provided derivative works remain under the same licence and their source is made
available — including to users who interact with a modified version over a network.

Releases up to and including v2.0.1 were published under CC BY-NC-SA 4.0. Those copies remain
under that licence; it is not retroactively revoked.
