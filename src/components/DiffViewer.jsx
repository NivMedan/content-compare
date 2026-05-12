import { useState, useEffect } from 'react';
import { computeDiff } from '../lib/comparator.js';
import { formatBytes } from '../lib/fileTypes.js';

export default function DiffViewer({ file, nameA, nameB }) {
  const [diff, setDiff]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!file) return;
    if (file.status !== 'modified') {
      setDiff(null); setLoading(false); setError(null);
      return;
    }
    setLoading(true); setDiff(null); setError(null);
    computeDiff(file)
      .then(r => { setDiff(r); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [file?.path]);

  if (!file) return (
    <div className="diff-panel diff-empty">
      <div className="diff-placeholder">
        <span>←</span>
        <p>Select a file to view its diff</p>
      </div>
    </div>
  );

  const labelA = nameA ?? 'Version A';
  const labelB = nameB ?? 'Version B';

  return (
    <div className="diff-panel">

      {/* ── File path + status ── */}
      <div className="diff-header">
        <div className="diff-path">{file.path}</div>
        <div className="diff-meta">
          <span className={`diff-status st-${file.status}`}>{file.status}</span>
          <span className="diff-type">{file.type}</span>
        </div>
      </div>

      {/* ── Sticky version banner – always visible ── */}
      <div className="diff-version-banner">
        <div className="dvb-side dvb-a">
          <span className="dvb-pill dvb-pill-a">A</span>
          <span className="dvb-name" title={labelA}>{labelA}</span>
          {file.sizeA != null
            ? <span className="dvb-size">{formatBytes(file.sizeA)}</span>
            : <span className="dvb-absent">not present</span>}
        </div>
        <div className="dvb-sep" />
        <div className="dvb-side dvb-b">
          <span className="dvb-pill dvb-pill-b">B</span>
          <span className="dvb-name" title={labelB}>{labelB}</span>
          {file.sizeB != null
            ? <span className="dvb-size">{formatBytes(file.sizeB)}</span>
            : <span className="dvb-absent">not present</span>}
        </div>
      </div>

      {/* ── Two-pane body ── */}
      <div className="diff-body">
        {file.status === 'added' && <AddedPane file={file} labelB={labelB} />}
        {file.status === 'removed' && <RemovedPane file={file} labelA={labelA} />}
        {file.status === 'identical' && <IdenticalPane file={file} />}
        {file.status === 'modified' && (
          <ModifiedPane
            file={file} diff={diff} loading={loading} error={error}
            labelA={labelA} labelB={labelB}
            nameA={nameA} nameB={nameB}
          />
        )}
      </div>
    </div>
  );
}

// ─── Status panes ─────────────────────────────────────────────────────────────

function AddedPane({ file, labelB }) {
  return (
    <div className="two-pane-row">
      <div className="side-pane side-pane-a side-absent">
        <div className="absent-msg">
          <span className="absent-icon">✕</span>
          <span>Not present in A</span>
        </div>
      </div>
      <div className="side-pane side-pane-b side-exists side-added">
        <FileInfoBlock hash={file.hashB} size={file.sizeB} label={labelB} statusClass="added" statusText="Added" />
      </div>
    </div>
  );
}

function RemovedPane({ file, labelA }) {
  return (
    <div className="two-pane-row">
      <div className="side-pane side-pane-a side-exists side-removed">
        <FileInfoBlock hash={file.hashA} size={file.sizeA} label={labelA} statusClass="removed" statusText="Removed" />
      </div>
      <div className="side-pane side-pane-b side-absent">
        <div className="absent-msg">
          <span className="absent-icon">✕</span>
          <span>Not present in B</span>
        </div>
      </div>
    </div>
  );
}

function IdenticalPane({ file }) {
  return (
    <div className="two-pane-row">
      <div className="side-pane side-pane-a side-exists">
        <FileInfoBlock hash={file.hashA} size={file.sizeA} statusClass="identical" statusText="Identical" />
      </div>
      <div className="side-pane side-pane-b side-exists">
        <FileInfoBlock hash={file.hashB} size={file.sizeB} statusClass="identical" statusText="Identical" />
      </div>
    </div>
  );
}

function FileInfoBlock({ hash, size, statusClass, statusText }) {
  return (
    <div className="file-info-block">
      <div className={`fib-status st-${statusClass}`}>{statusText}</div>
      {size != null && <div className="fib-size">{formatBytes(size)}</div>}
      {hash && (
        <div className="fib-hash">
          <span className="fib-hash-label">SHA-256</span>
          <span className="fib-hash-val">{hash}</span>
        </div>
      )}
    </div>
  );
}

// ─── Modified pane ────────────────────────────────────────────────────────────

function ModifiedPane({ file, diff, loading, error, labelA, labelB, nameA, nameB }) {
  return (
    <div className="modified-pane">
      {/* hash row */}
      <div className="sbs-hash-row">
        <div className="hash-line sbs-hash-a">
          <span className="hash-label">{labelA}</span>
          <span className="hash-val">{file.hashA}</span>
        </div>
        <div className="hash-line sbs-hash-b">
          <span className="hash-label">{labelB}</span>
          <span className="hash-val">{file.hashB}</span>
        </div>
      </div>

      {loading && <div className="diff-loading"><span className="spinner" /> Computing diff…</div>}
      {error   && <div className="diff-error">⚠ {error}</div>}

      {diff && <DiffContent file={file} diff={diff} nameA={nameA} nameB={nameB} />}

      {(file.type === 'media' || file.type === 'other') && !loading && !error && (
        <div className="diff-note">Content diff not available for <strong>{file.type}</strong> files — hash comparison above.</div>
      )}
    </div>
  );
}

function DiffContent({ file, diff, nameA, nameB }) {
  if (!diff?.ok) return <div className="diff-error">⚠ {diff?.error ?? 'Parse error'}</div>;
  if (file.type === 'xml' || file.type === 'json') return <StructuredDiff diffs={diff.diffs} nameA={nameA} nameB={nameB} />;
  if (file.type === 'excel') return <ExcelDiff diff={diff} nameA={nameA} nameB={nameB} />;
  return <TextDiff diff={diff} nameA={nameA} nameB={nameB} />;
}

// ─── Structured diff (XML / JSON) ─────────────────────────────────────────────
function StructuredDiff({ diffs, nameA, nameB }) {
  const [show, setShow] = useState(200);
  if (!diffs.length) return <div className="diff-note">No semantic differences found.</div>;

  const added   = diffs.filter(d => d.type === 'added').length;
  const removed = diffs.filter(d => d.type === 'removed').length;
  const changed = diffs.filter(d => d.type === 'changed').length;

  return (
    <div className="struct-diff">
      <div className="struct-summary">
        {added   > 0 && <span className="st-added">+{added} added</span>}
        {removed > 0 && <span className="st-removed">-{removed} removed</span>}
        {changed > 0 && <span className="st-modified">~{changed} changed</span>}
      </div>

      {/* column headers */}
      <div className="struct-cols-header">
        <span />
        <span className="struct-ch-path">Field path</span>
        <span className="struct-ch-side sbs-a">{nameA ?? 'Version A'}</span>
        <span className="struct-ch-arrow" />
        <span className="struct-ch-side sbs-b">{nameB ?? 'Version B'}</span>
      </div>

      <div className="struct-table">
        {diffs.slice(0, show).map((d, i) => {
          const cls = d.type === 'added' ? 'st-added' : d.type === 'removed' ? 'st-removed' : 'st-modified';
          return (
            <div key={i} className={`struct-row-sbs ${cls}`}>
              <span className="struct-badge">{d.type === 'added' ? '＋' : d.type === 'removed' ? '－' : '～'}</span>
              <span className="struct-path">{d.path}</span>
              <span className="struct-before">{d.before != null ? truncate(d.before) : <em className="struct-empty">—</em>}</span>
              <span className="struct-arrow">→</span>
              <span className="struct-after">{d.after  != null ? truncate(d.after)  : <em className="struct-empty">—</em>}</span>
            </div>
          );
        })}
      </div>
      {diffs.length > show && (
        <button className="show-more-btn" onClick={() => setShow(s => s + 200)}>
          Show more ({diffs.length - show} remaining)
        </button>
      )}
    </div>
  );
}

// ─── Excel diff ───────────────────────────────────────────────────────────────
function ExcelDiff({ diff, nameA, nameB }) {
  const { sheetsAdded = [], sheetsRemoved = [], sheetsModified = {}, sheetsIdentical = [] } = diff;
  const modNames = Object.keys(sheetsModified);

  return (
    <div className="excel-diff">
      {sheetsAdded.length   > 0 && <div className="sheet-section"><h4 className="st-added">Sheets Added</h4>{sheetsAdded.map(s => <span key={s} className="sheet-tag st-added">{s}</span>)}</div>}
      {sheetsRemoved.length > 0 && <div className="sheet-section"><h4 className="st-removed">Sheets Removed</h4>{sheetsRemoved.map(s => <span key={s} className="sheet-tag st-removed">{s}</span>)}</div>}
      {sheetsIdentical.length > 0 && <div className="sheet-section"><span className="st-identical">✓ {sheetsIdentical.length} sheet(s) identical</span></div>}
      {modNames.map(name => {
        const { cellsAdded, cellsRemoved, cellsChanged } = sheetsModified[name];
        return (
          <div key={name} className="sheet-diff">
            <h4 className="sheet-title">Sheet: {name}</h4>
            <div className="struct-summary">
              {cellsAdded.length   > 0 && <span className="st-added">+{cellsAdded.length}</span>}
              {cellsRemoved.length > 0 && <span className="st-removed">-{cellsRemoved.length}</span>}
              {cellsChanged.length > 0 && <span className="st-modified">~{cellsChanged.length}</span>}
            </div>
            <table className="cell-table">
              <thead>
                <tr>
                  <th>Cell</th>
                  <th className="cell-col-a">{nameA ?? 'Version A'}</th>
                  <th className="cell-col-b">{nameB ?? 'Version B'}</th>
                </tr>
              </thead>
              <tbody>
                {cellsChanged.map(c => (
                  <tr key={c.ref} className="st-modified">
                    <td className="cell-ref">{c.ref}</td>
                    <td className="cell-before">{truncate(String(c.before))}</td>
                    <td className="cell-after">{truncate(String(c.after))}</td>
                  </tr>
                ))}
                {cellsAdded.map(c => (
                  <tr key={c.ref} className="st-added">
                    <td className="cell-ref">{c.ref}</td>
                    <td className="cell-absent">—</td>
                    <td>{truncate(String(c.value))}</td>
                  </tr>
                ))}
                {cellsRemoved.map(c => (
                  <tr key={c.ref} className="st-removed">
                    <td className="cell-ref">{c.ref}</td>
                    <td>{truncate(String(c.value))}</td>
                    <td className="cell-absent">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ─── Side-by-side text diff ───────────────────────────────────────────────────
function buildSideBySide(lines) {
  const pairs = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.type === 'context') {
      pairs.push({ left: line, right: line, kind: 'context' });
      i++;
    } else if (line.type === 'removed') {
      const removed = [];
      while (i < lines.length && lines[i].type === 'removed') removed.push(lines[i++]);
      const added = [];
      while (i < lines.length && lines[i].type === 'added')   added.push(lines[i++]);
      const maxLen = Math.max(removed.length, added.length);
      for (let j = 0; j < maxLen; j++) {
        pairs.push({ left: removed[j] ?? null, right: added[j] ?? null, kind: 'change' });
      }
    } else if (line.type === 'added') {
      pairs.push({ left: null, right: line, kind: 'change' });
      i++;
    } else {
      i++;
    }
  }
  return pairs;
}

function TextDiff({ diff, nameA, nameB }) {
  const [showAll, setShowAll] = useState(false);
  const { lines, truncated } = diff;
  const changed = lines.filter(l => l.type !== 'context');
  if (!changed.length) return <div className="diff-note">No textual differences found.</div>;

  const allPairs = buildSideBySide(lines);
  const displayPairs = showAll ? allPairs : (() => {
    const changedIdx = new Set(allPairs.map((p, i) => p.kind === 'change' ? i : -1).filter(i => i >= 0));
    const visible = new Set();
    changedIdx.forEach(i => {
      for (let j = Math.max(0, i - 3); j <= Math.min(allPairs.length - 1, i + 3); j++) visible.add(j);
    });
    return allPairs.filter((_, i) => visible.has(i));
  })();

  const addedCnt   = lines.filter(l => l.type === 'added').length;
  const removedCnt = lines.filter(l => l.type === 'removed').length;

  return (
    <div className="text-diff">
      <div className="struct-summary">
        <span className="st-added">+{addedCnt} lines</span>
        <span className="st-removed">-{removedCnt} lines</span>
        {!showAll && <button className="show-more-btn small" onClick={() => setShowAll(true)}>Show full file</button>}
        {truncated && <span className="diff-note-inline">⚠ Truncated at 2000 lines</span>}
      </div>

      <div className="sbs-diff-table">
        <div className="sbs-col-header sbs-a">{nameA ?? 'Version A'}</div>
        <div className="sbs-col-header sbs-b">{nameB ?? 'Version B'}</div>
        {displayPairs.map((pair, i) => <SbsRow key={i} pair={pair} />)}
      </div>
    </div>
  );
}

function SbsRow({ pair }) {
  const { left, right } = pair;
  const leftCls  = left  ? (left.type  === 'removed' ? 'sbs-removed' : 'sbs-context') : 'sbs-empty';
  const rightCls = right ? (right.type === 'added'   ? 'sbs-added'   : 'sbs-context') : 'sbs-empty';

  return (
    <>
      <div className={`sbs-cell ${leftCls}`}>
        {left && <><span className="sbs-gutter">{left.type === 'removed' ? '−' : ' '}</span><span className="sbs-content">{left.content}</span></>}
      </div>
      <div className={`sbs-cell ${rightCls}`}>
        {right && <><span className="sbs-gutter">{right.type === 'added' ? '+' : ' '}</span><span className="sbs-content">{right.content}</span></>}
      </div>
    </>
  );
}

function truncate(s, n = 80) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}
