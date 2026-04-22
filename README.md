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

Built with [Electron](https://www.electronjs.org/). To run locally:

```bash
npm install
npm start
```

Requires Node.js. The XLingPaper and Web Page exports use client-side XSLT (via the browser's built-in `XSLTProcessor`) to transform the `.onestory` XML. The TSV export uses plain JavaScript. No server needed for any format.
