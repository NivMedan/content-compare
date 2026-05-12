# CLAUDE.md — Content Compare

## Project overview

Browser-only React app that diffs two content installer packages (ZIP, 7z, folder). No backend. Deployed to GitHub Pages via GitHub Actions on every push to `main`.

Live URL: https://nivmedan.github.io/content-compare/

## Dev commands

```bash
npm install        # install deps (Node 18+)
npm run dev        # dev server at localhost:5173
npm run build      # production build → dist/
```

## Architecture

The app has three phases managed in `App.jsx`:

1. **upload** — `UploadZone` collects one or two sources
2. **loading** — `loadSources()` extracts archives and hashes files; `compare()` pairs them
3. **done** — `Dashboard` renders everything

### Data flow

```
UploadZone
  └─ onCompare([sourceA, sourceB])
       └─ loadSources()   → { sideA: Map<path,FileEntry>, sideB: Map, nameA, nameB }
       └─ compare()       → { files[], summary{}, byType{} }
            └─ Dashboard
                 ├─ SummaryCards     (match score + 5 stat cards)
                 ├─ ChartSection     (doughnut + stacked bar)
                 ├─ ContentBreakdown (per-type table + gauges)
                 └─ split-panel
                      ├─ FileTree    (filterable, chart-jump aware)
                      └─ DiffViewer  (per-file side-by-side diff)
```

### Key data shapes

**`FileEntry`** (output of `loadSources`):
```js
{ path, name, type, sizeA, sizeB, status, hashA, hashB, contentA, contentB }
// status: 'added' | 'removed' | 'modified' | 'identical'
// content* only populated for text/xml/json/excel (not binary/media)
```

**`summary`** (output of `compare`):
```js
{ total, added, removed, modified, identical, sizeA, sizeB }
```

**`byType`** (output of `compare`):
```js
{ xml: { total, added, removed, modified, identical }, excel: {…}, … }
```

## Styling

All styles live in `src/index.css`. Design tokens are in `:root`:

- `--bg`, `--surface`, `--surface-2`, `--surface-3` — white/grey backgrounds
- `--text-1`, `--text-2`, `--text-3` — dark → muted text
- `--accent` / `--sus-red` — `#F9423A` (Surgical Science red)
- `--added` / `--removed` / `--modified` / `--identical` — diff status colours
- `--font` — Inter (loaded from Google Fonts in the CSS `@import`)
- `--mono` — Cascadia Code / Fira Code / Consolas

**Topbar** is explicitly `background: #000000` (not a token) — white logo + white text on black. The upload page uses white background — use `suslogo-dark.svg` there, `suslogo.svg` (white) in the topbar.

## Chart interaction

`ChartSection` fires `onSegmentClick({ status, type })` when a stacked bar segment is clicked. `Dashboard` stores this as `jumpFilter` and passes it to `FileTree`, which syncs its internal `filter` + `typeFilter` state via `useEffect`. The jump banner shows the active filter with a ✕ Clear button.

Status order in the stacked bar datasets: `['added', 'removed', 'modified', 'identical']` — `datasetIndex` maps directly to this array.

## Match % formula

```js
matchPct = Math.round((summary.identical / summary.total) * 100)
```

`identical / total` (not `identical / shared`) correctly returns 0% when nothing matches and penalises adds/removes as well as modifications.

## File type counts in FileTree

Filter tab counts (`~2 modified`) are computed from `typeScoped` — files pre-filtered by the active `typeFilter` — so the tab counts always match what is visible when a chart type-filter is active.

## GitHub Pages deployment

`.github/workflows/deploy.yml` runs on every push to `main`:
1. `npm install`
2. `npm run build` (vite — also copies libarchive WASM to `dist/`)
3. Uploads `dist/` as a Pages artifact and deploys

`vite.config.js` uses `base: '/content-compare/'` for correct asset paths on Pages.

## Important constraints

- **No backend** — everything runs in the browser. Large archives (>500 MB) may be slow.
- **libarchive.js** is WASM-based; its worker bundle must be in `public/libarchive/`. The `copyLibarchivePlugin` in `vite.config.js` copies it from `node_modules` at build time.
- Do not change `base` in `vite.config.js` back to `'./'` — it breaks asset loading on GitHub Pages.
