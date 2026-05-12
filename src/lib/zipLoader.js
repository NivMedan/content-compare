import JSZip from 'jszip';
import { Archive } from 'libarchive.js';
import { sha256 } from './hash.js';
import { classifyFile, isIgnored } from './fileTypes.js';

// Use getWorker callback so the bundle is loaded as a classic script (not type:module)
Archive.init({
  getWorker: () => new Worker(`${import.meta.env.BASE_URL}libarchive/worker-bundle.js`),
});

// ─── Public API ───────────────────────────────────────────────────────────────
// source: { kind: 'archive', file: File }
//       | { kind: 'folder',  name: string, entries: Array<{ path, file }> }

export async function loadSources(sources, onProgress) {
  if (sources.length === 1) return loadSingleSource(sources[0], onProgress);
  const [a, b] = await Promise.all([
    resolveSource(sources[0], onProgress),
    resolveSource(sources[1], onProgress),
  ]);
  console.log(`[CC] A "${a.name}": ${a.map.size} | B "${b.name}": ${b.map.size}`);
  return { sideA: a.map, sideB: b.map, nameA: a.name, nameB: b.name };
}

async function loadSingleSource(source, onProgress) {
  const { map, name } = await sourceToMap(source, onProgress);
  const roots = detectSubRoots(map);
  console.log(`[CC] Single source "${name}", roots:`, roots);

  if (roots.length !== 2) {
    throw new Error(
      roots.length === 0
        ? `No content files found inside "${name}".`
        : roots.length === 1
        ? `Only one version folder found ("${roots[0]}") inside "${name}". Use "Two sources" mode or pack two version folders together.`
        : `Found ${roots.length} folders (${roots.slice(0, 4).join(', ')}…). Ensure exactly 2 version folders are present, or use "Two sources" mode.`
    );
  }

  const [nameA, nameB] = roots;
  const mapA = splitMap(map, nameA);
  const mapB = splitMap(map, nameB);
  console.log(`[CC] A "${nameA}": ${mapA.size} | B "${nameB}": ${mapB.size}`);
  return { sideA: mapA, sideB: mapB, nameA, nameB };
}

async function resolveSource(source, onProgress) {
  const { map, name } = await sourceToMap(source, onProgress);
  const roots = detectSubRoots(map);
  // Strip single root prefix (e.g. archive with one top-level folder)
  if (roots.length === 1) return { map: splitMap(map, roots[0]), name: roots[0] };
  return { map, name };
}

// ─── Source → flat Map ───────────────────────────────────────────────────────
async function sourceToMap(source, onProgress) {
  if (source.kind === 'archive') {
    const ext = source.file.name.split('.').pop().toLowerCase();
    if (ext === 'zip') return buildMapFromZip(source.file, onProgress);
    return buildMapFromArchive(source.file, onProgress);
  }
  return buildMapFromEntries(source.entries, source.name, onProgress);
}

async function buildMapFromZip(file, onProgress) {
  onProgress?.({ stage: 'reading', label: `Reading ${file.name}…` });
  const zip = await JSZip.loadAsync(file);
  const map = new Map();
  const allEntries = [];
  zip.forEach((relPath, entry) => { if (!entry.dir && !isIgnored(relPath)) allEntries.push({ relPath, entry }); });

  let done = 0;
  await Promise.all(allEntries.map(async ({ relPath, entry }) => {
    const buf = await entry.async('arraybuffer');
    map.set(relPath, await makeEntry(buf, relPath));
    done++;
    onProgress?.({ stage: 'hashing', label: `Processing files…`, pct: Math.round(done / allEntries.length * 100) });
  }));

  return { map, name: file.name.replace(/\.zip$/i, '') };
}

async function buildMapFromArchive(file, onProgress) {
  onProgress?.({ stage: 'reading', label: `Extracting ${file.name} (this may take a moment)…` });
  const archive = await Archive.open(file);
  const extracted = await archive.extractFiles();
  const flat = flattenFiles(extracted);

  const map = new Map();
  let done = 0;
  await Promise.all(flat.map(async ({ path, file: f }) => {
    if (isIgnored(path)) { done++; return; }
    const buf = await f.arrayBuffer();
    map.set(path, await makeEntry(buf, path));
    done++;
    onProgress?.({ stage: 'hashing', label: `Processing files…`, pct: Math.round(done / flat.length * 100) });
  }));

  return { map, name: file.name.replace(/\.[^.]+$/i, '') };
}

async function buildMapFromEntries(entries, name, onProgress) {
  onProgress?.({ stage: 'reading', label: `Reading folder "${name}"…` });
  const map = new Map();
  let done = 0;
  await Promise.all(entries.map(async ({ path, file }) => {
    if (isIgnored(path)) { done++; return; }
    const buf = await file.arrayBuffer();
    map.set(path, await makeEntry(buf, path));
    done++;
    onProgress?.({ stage: 'hashing', label: `Processing files…`, pct: Math.round(done / entries.length * 100) });
  }));
  return { map, name };
}

async function makeEntry(buf, path) {
  return { data: buf, size: buf.byteLength, hash: await sha256(buf), type: classifyFile(path) };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function detectSubRoots(map) {
  const roots = new Set();
  for (const path of map.keys()) { const top = path.split('/')[0]; if (top) roots.add(top); }
  return [...roots].filter(r => [...map.keys()].some(p => p.startsWith(r + '/')));
}

function splitMap(map, prefix) {
  const sub = new Map();
  const strip = prefix + '/';
  for (const [path, entry] of map) { if (path.startsWith(strip)) sub.set(path.slice(strip.length), entry); }
  return sub;
}

function flattenFiles(obj, basePath = '') {
  const files = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value instanceof File) files.push({ path: basePath + key, file: value });
    else if (value && typeof value === 'object') files.push(...flattenFiles(value, basePath + key + '/'));
  }
  return files;
}

// ─── Drag-and-drop reader ────────────────────────────────────────────────────
export async function readDroppedSource(dataTransfer) {
  const items = [...(dataTransfer.items || [])];
  const fsEntries = items.map(i => i.webkitGetAsEntry?.()).filter(Boolean);

  if (fsEntries.length === 0) {
    const files = [...dataTransfer.files];
    if (files.length === 1 && isArchiveFile(files[0].name)) return { kind: 'archive', file: files[0] };
    return null;
  }

  if (fsEntries.length === 1) {
    const e = fsEntries[0];
    if (e.isFile) {
      const file = await fileFromEntry(e);
      if (isArchiveFile(file.name)) return { kind: 'archive', file };
      return null;
    }
    if (e.isDirectory) {
      const entries = await readDirEntry(e, '');
      return { kind: 'folder', name: e.name, entries };
    }
  }

  // Multiple items — treat as flat folder contents
  const entries = [];
  for (const e of fsEntries) {
    if (e.isFile) { const f = await fileFromEntry(e); entries.push({ path: f.name, file: f }); }
    else if (e.isDirectory) { entries.push(...await readDirEntry(e, e.name + '/')); }
  }
  return { kind: 'folder', name: fsEntries[0].name, entries };
}

export function sourceFromFileInput(fileList) {
  const files = [...fileList];
  if (files.length === 1 && isArchiveFile(files[0].name)) return { kind: 'archive', file: files[0] };
  if (files[0]?.webkitRelativePath) {
    const name = files[0].webkitRelativePath.split('/')[0];
    return { kind: 'folder', name, entries: files.map(f => ({ path: f.webkitRelativePath, file: f })) };
  }
  return null;
}

function isArchiveFile(name) {
  return /\.(zip|7z|rar|tar|gz|bz2|xz|tgz)$/i.test(name);
}

async function readDirEntry(dirEntry, basePath) {
  const results = [];
  const children = await readAllEntries(dirEntry.createReader());
  for (const child of children) {
    if (child.isFile) { const f = await fileFromEntry(child); results.push({ path: basePath + child.name, file: f }); }
    else if (child.isDirectory) results.push(...await readDirEntry(child, basePath + child.name + '/'));
  }
  return results;
}

function readAllEntries(reader) {
  return new Promise((resolve, reject) => {
    const all = [];
    const next = () => reader.readEntries(batch => { if (!batch.length) return resolve(all); all.push(...batch); next(); }, reject);
    next();
  });
}

function fileFromEntry(entry) {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}
