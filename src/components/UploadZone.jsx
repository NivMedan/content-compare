import { useState, useRef } from 'react';
import { readDroppedSource, sourceFromFileInput } from '../lib/zipLoader.js';

const ACCEPT_ARCHIVES = '.zip,.7z,.rar,.tar,.gz,.bz2,.tgz,.xz';

function useEta(progress) {
  const stageStart = useRef(null);
  const lastStage  = useRef(null);

  if (!progress || progress.stage !== 'hashing') {
    stageStart.current = null;
    lastStage.current  = null;
    return null;
  }
  if (lastStage.current !== 'hashing') {
    stageStart.current = Date.now();
    lastStage.current  = 'hashing';
  }
  const pct = progress.pct ?? 0;
  if (pct < 3) return null;
  const elapsed = (Date.now() - stageStart.current) / 1000;
  const totalEst = elapsed / (pct / 100);
  const remaining = Math.max(0, totalEst - elapsed);
  if (remaining < 2) return null;
  if (remaining < 60) return `~${Math.ceil(remaining)}s remaining`;
  return `~${Math.ceil(remaining / 60)}m remaining`;
}

export default function UploadZone({ onCompare, loading, progress }) {
  const [mode, setMode] = useState('dual');
  const [sourceA, setSourceA] = useState(null);
  const [sourceB, setSourceB] = useState(null);
  const [dragging, setDragging] = useState(null);

  const archRefA = useRef(); const folderRefA = useRef();
  const archRefB = useRef(); const folderRefB = useRef();

  const eta = useEta(progress);

  const canCompare = mode === 'single' ? !!sourceA : !!(sourceA && sourceB);

  async function handleDrop(e, slot) {
    e.preventDefault();
    setDragging(null);
    const source = await readDroppedSource(e.dataTransfer);
    if (!source) return;
    slot === 'A' ? setSourceA(source) : setSourceB(source);
  }

  function handleFileInput(e, slot) {
    const source = sourceFromFileInput(e.target.files);
    if (!source) return;
    slot === 'A' ? setSourceA(source) : setSourceB(source);
    e.target.value = '';
  }

  function handleCompare() {
    if (!canCompare || loading) return;
    onCompare(mode === 'single' ? [sourceA] : [sourceA, sourceB]);
  }

  return (
    <div className="upload-page">
      <div className="upload-header">
        <img src="suslogo-dark.svg" alt="Surgical Science" className="sus-logo" />
        <h1>Content Compare</h1>
        <p className="subtitle">Structural and semantic diff across content packages</p>
      </div>

      <div className="mode-toggle">
        <button className={`mode-btn ${mode === 'single' ? 'active' : ''}`}
          onClick={() => { setMode('single'); setSourceB(null); }}>
          Single source
          <span className="mode-hint">Archive or folder with 2 versions inside</span>
        </button>
        <button className={`mode-btn ${mode === 'dual' ? 'active' : ''}`}
          onClick={() => setMode('dual')}>
          Two sources
          <span className="mode-hint">One archive or folder per version</span>
        </button>
      </div>

      <div className={`drop-area-row ${mode === 'dual' ? 'dual' : 'single'}`}>
        <DropSlot
          label={mode === 'single' ? 'Drop archive or folder here' : 'Version A'}
          hint={mode === 'single' ? 'Must contain exactly 2 version folders' : 'The "before" version'}
          source={sourceA}
          dragging={dragging === 'A'}
          onDrop={e => handleDrop(e, 'A')}
          onDragOver={e => { e.preventDefault(); setDragging('A'); }}
          onDragLeave={() => setDragging(null)}
          onSelectArchive={() => archRefA.current.click()}
          onSelectFolder={() => folderRefA.current.click()}
          archRef={archRefA} folderRef={folderRefA}
          onFileInput={e => handleFileInput(e, 'A')}
          onClear={() => setSourceA(null)}
          disabled={loading}
        />
        {mode === 'dual' && (
          <>
            <div className="vs-divider">VS</div>
            <DropSlot
              label="Version B"
              hint='The "after" version'
              source={sourceB}
              dragging={dragging === 'B'}
              onDrop={e => handleDrop(e, 'B')}
              onDragOver={e => { e.preventDefault(); setDragging('B'); }}
              onDragLeave={() => setDragging(null)}
              onSelectArchive={() => archRefB.current.click()}
              onSelectFolder={() => folderRefB.current.click()}
              archRef={archRefB} folderRef={folderRefB}
              onFileInput={e => handleFileInput(e, 'B')}
              onClear={() => setSourceB(null)}
              disabled={loading}
            />
          </>
        )}
      </div>

      {loading && progress && (
        <div className="progress-bar-wrap">
          <div className="progress-label">
            <span className="spinner" /> {progress.label}
            {eta && <span className="progress-eta">{eta}</span>}
          </div>
          {progress.pct != null && (
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress.pct}%` }} />
              <span className="progress-pct">{progress.pct}%</span>
            </div>
          )}
        </div>
      )}

      <button className="compare-btn" disabled={!canCompare || loading} onClick={handleCompare}>
        {loading ? <><span className="spinner" /> Analyzing…</> : <><span>⚡</span> Compare Now</>}
      </button>

      <div className="format-row">
        <div className="format-group">
          <span className="format-group-label">Archives</span>
          {['ZIP', '7Z', 'RAR', 'TAR', 'GZ'].map(f => (
            <span key={f} className="type-badge archive">{f}</span>
          ))}
        </div>
        <div className="format-group">
          <span className="format-group-label">Content</span>
          {['XML', 'JSON', 'Excel', 'SQL', 'CSV', 'Text'].map(f => (
            <span key={f} className={`type-badge ${f.toLowerCase()}`}>{f}</span>
          ))}
        </div>
        <div className="format-group">
          <span className="format-group-label">Media</span>
          <span className="type-badge media">Images · Video · PDF (hash)</span>
        </div>
      </div>
    </div>
  );
}

function DropSlot({ label, hint, source, dragging, onDrop, onDragOver, onDragLeave,
                    onSelectArchive, onSelectFolder, archRef, folderRef, onFileInput, onClear, disabled }) {
  return (
    <div
      className={`drop-slot ${dragging ? 'drag-over' : ''} ${source ? 'has-file' : ''} ${disabled ? 'disabled' : ''}`}
      onDrop={disabled ? undefined : onDrop}
      onDragOver={disabled ? undefined : onDragOver}
      onDragLeave={onDragLeave}
    >
      <input ref={archRef}   type="file" accept={ACCEPT_ARCHIVES} style={{ display: 'none' }} onChange={onFileInput} />
      <input ref={folderRef} type="file" webkitdirectory="" mozdirectory="" multiple style={{ display: 'none' }} onChange={onFileInput} />

      {source ? (
        <>
          <div className="file-icon">{source.kind === 'archive' ? '📦' : '📁'}</div>
          <div className="file-name">{source.name}</div>
          <div className="file-size">
            {source.kind === 'archive'
              ? `${(source.file.size / 1024 / 1024).toFixed(1)} MB`
              : `${source.entries.length} files`}
          </div>
          {!disabled && <button className="clear-btn" onClick={e => { e.stopPropagation(); onClear(); }}>✕ Clear</button>}
        </>
      ) : (
        <>
          <div className="drop-icon">⬆</div>
          <div className="drop-label">{label}</div>
          <div className="drop-hint">{hint}</div>
          <div className="pick-btns">
            <button className="pick-btn" onClick={onSelectArchive} disabled={disabled}>📦 Archive</button>
            <button className="pick-btn" onClick={onSelectFolder}  disabled={disabled}>📁 Folder</button>
          </div>
        </>
      )}
    </div>
  );
}
