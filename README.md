# Content Compare

A browser-based diff tool for comparing Surgical Science content installer packages — ZIPs, 7z archives, or local folders — with no server required.

**Live app:** https://nivmedan.github.io/content-compare/

---

## What it does

Drop two content packages (or one, for a self-audit) and get:

- **File-level diff** — Added / Removed / Modified / Identical, across every file in the package
- **Side-by-side diff viewer** — Structured diffs for XML and Excel, plain text LCS diff, hash comparison for binaries and media
- **Content Breakdown** — Per-file-type counts for both sides, with match % gauges
- **Charts** — Doughnut (by status) and stacked bar (by file type). Click any bar segment to jump directly to that filtered subset in the file tree
- **Match score** — Overall % and per-type breakdown, with contextual labels (Excellent / Good / Partial / Low / Poor)
- **ETA** — Estimated time remaining during large XML analysis passes

### Supported formats

| Category | Formats |
|----------|---------|
| Archives | ZIP, 7z, RAR, TAR, GZ, BZ2, TGZ, XZ |
| Structured | XML, JSON, Excel (.xlsx/.xls) |
| Tabular | CSV |
| Documents | SQL, plain text |
| Media / Binary | MP4, MP3, PNG, JPG, PDF, and all others (SHA-256 hash comparison) |

---

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # production build → dist/
npm run preview    # serve the dist/ build locally
```

Node 18+ required.

---

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via the Actions workflow in `.github/workflows/deploy.yml`. No manual steps needed after the initial Pages setup (Settings → Pages → Source: GitHub Actions).

---

## Project structure

```
src/
  App.jsx                    # Root: phase machine (upload → loading → done)
  index.css                  # All styles, CSS design tokens in :root

  components/
    UploadZone.jsx            # Drop zones, mode toggle, progress bar + ETA
    Dashboard.jsx             # Top-level layout, chart→tree jump wiring
    SummaryCards.jsx          # Match score banner + 5 stat cards
    ChartSection.jsx          # Doughnut + stacked bar (Chart.js)
    ContentBreakdown.jsx      # Collapsible per-type breakdown table + gauges
    FileTree.jsx              # Filterable file tree with folder collapse
    DiffViewer.jsx            # Side-by-side diff for all file types

  lib/
    zipLoader.js              # Reads ZIP / 7z / folder sources, emits progress
    comparator.js             # Pairs files A↔B, computes summary + byType stats
    hash.js                   # Web Crypto SHA-256 for binary files
    fileTypes.js              # Extension → type mapping, formatBytes helper
    deepDiff.js               # LCS-based text diff, buildSideBySide pairing
    parsers/
      xmlParser.js            # fast-xml-parser → flat key-value diff
      excelParser.js          # SheetJS → per-sheet cell diff
      jsonParser.js           # Recursive JSON → flat path diff
      textParser.js           # Raw text line splitting

public/
  suslogo.svg                 # White version (used on black topbar)
  suslogo-dark.svg            # Dark version (used on white upload page)
```

---

## Tech stack

- **React 18** + **Vite 5**
- **Chart.js 4** + react-chartjs-2
- **JSZip** — ZIP extraction
- **libarchive.js** (WASM) — 7z / RAR / TAR extraction
- **fast-xml-parser** — XML parsing and diffing
- **SheetJS (xlsx)** — Excel parsing
- **Web Crypto API** — SHA-256 binary hashing
