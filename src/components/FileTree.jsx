import { useState, useMemo, useEffect } from 'react';
import { formatBytes } from '../lib/fileTypes.js';

const STATUS_ICON = { added: '＋', removed: '－', modified: '～', identical: '＝' };
const STATUS_CLASS = { added: 'st-added', removed: 'st-removed', modified: 'st-modified', identical: 'st-identical' };

export default function FileTree({ files, selectedPath, onSelect, jumpFilter, onClearJump }) {
  const [filter, setFilter]     = useState('all');
  const [typeFilter, setTypeFilter] = useState(null); // e.g. 'xml'
  const [search, setSearch]     = useState('');
  const [collapsed, setCollapsed] = useState(new Set());

  // When a chart segment is clicked, sync external filter in
  useEffect(() => {
    if (!jumpFilter) return;
    setFilter(jumpFilter.status ?? 'all');
    setTypeFilter(jumpFilter.type ?? null);
    setSearch('');
  }, [jumpFilter]);

  function clearJump() {
    setFilter('all');
    setTypeFilter(null);
    onClearJump?.();
  }

  const filtered = useMemo(() => files.filter(f => {
    if (filter !== 'all' && f.status !== filter) return false;
    if (typeFilter && f.type !== typeFilter) return false;
    if (search && !f.path.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [files, filter, typeFilter, search]);

  const tree = useMemo(() => buildTree(filtered), [filtered]);

  // Counts respect the active type filter so tabs always match what's visible
  const typeScoped = useMemo(
    () => typeFilter ? files.filter(f => f.type === typeFilter) : files,
    [files, typeFilter]
  );
  const counts = useMemo(() => ({
    all:      typeScoped.length,
    added:    typeScoped.filter(f => f.status === 'added').length,
    removed:  typeScoped.filter(f => f.status === 'removed').length,
    modified: typeScoped.filter(f => f.status === 'modified').length,
    identical:typeScoped.filter(f => f.status === 'identical').length,
  }), [typeScoped]);

  function toggleFolder(path) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }

  return (
    <div className="file-tree-panel">
      <div className="tree-controls">
        <input
          className="tree-search"
          placeholder="Search files…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-tabs">
          {['all', 'added', 'removed', 'modified', 'identical'].map(s => (
            <button
              key={s}
              className={`filter-tab filter-tab-${s} ${filter === s ? 'active' : ''}`}
              onClick={() => setFilter(s)}
            >
              {s === 'all' ? 'All' : STATUS_ICON[s]} {counts[s]}
            </button>
          ))}
        </div>
      </div>

      {typeFilter && (
        <div className="tree-jump-banner">
          <span>
            Chart filter: <strong>{typeFilter}</strong> · <strong>{filter}</strong>
            <span className="tree-jump-count">
              {' '}({counts[filter === 'all' ? 'all' : filter]} file{counts[filter === 'all' ? 'all' : filter] !== 1 ? 's' : ''})
            </span>
          </span>
          <button className="tree-jump-clear" onClick={clearJump}>✕ Clear</button>
        </div>
      )}

      <div className="tree-body">
        {filtered.length === 0 ? (
          <div className="tree-empty">
            {typeFilter
              ? <>No <strong>{typeFilter}</strong> files with status <strong>{filter === 'all' ? 'any' : filter}</strong>.<br/><span style={{fontSize:'11px'}}>Try clearing the filter or selecting a different status.</span></>
              : 'No files match this filter.'}
          </div>
        ) : (
          <TreeNode
            node={tree}
            depth={0}
            collapsed={collapsed}
            toggle={toggleFolder}
            onSelect={onSelect}
            selectedPath={selectedPath}
          />
        )}
      </div>
    </div>
  );
}

function TreeNode({ node, depth, collapsed, toggle, onSelect, selectedPath }) {
  return (
    <>
      {node.folders.map(folder => {
        const isCollapsed = collapsed.has(folder.path);
        const statusSummary = folderStatus(folder);
        return (
          <div key={folder.path}>
            <div
              className="tree-folder"
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              onClick={() => toggle(folder.path)}
            >
              <span className="folder-arrow">{isCollapsed ? '▶' : '▼'}</span>
              <span className="folder-icon">📂</span>
              <span className="folder-name">{folder.name}</span>
              <span className="folder-stats">
                {statusSummary.modified > 0 && <span className="st-modified">~{statusSummary.modified}</span>}
                {statusSummary.added > 0 && <span className="st-added">+{statusSummary.added}</span>}
                {statusSummary.removed > 0 && <span className="st-removed">-{statusSummary.removed}</span>}
              </span>
            </div>
            {!isCollapsed && (
              <TreeNode
                node={folder}
                depth={depth + 1}
                collapsed={collapsed}
                toggle={toggle}
                onSelect={onSelect}
                selectedPath={selectedPath}
              />
            )}
          </div>
        );
      })}
      {node.files.map(file => (
        <div
          key={file.path}
          className={`tree-file ${STATUS_CLASS[file.status]} ${selectedPath === file.path ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => onSelect(file)}
        >
          <span className={`status-badge ${STATUS_CLASS[file.status]}`}>{STATUS_ICON[file.status]}</span>
          <span className="file-name">{file.name}</span>
          <span className="file-meta">
            <span className="file-type">{file.type}</span>
            <span className="file-size">{formatBytes(file.sizeB ?? file.sizeA)}</span>
          </span>
        </div>
      ))}
    </>
  );
}

function buildTree(files) {
  const root = { folders: [], files: [], path: '' };
  const folderMap = { '': root };

  for (const file of files) {
    const parts = file.path.split('/');
    const name = parts.pop();
    let parent = root;

    let accumulated = '';
    for (const part of parts) {
      accumulated = accumulated ? `${accumulated}/${part}` : part;
      if (!folderMap[accumulated]) {
        const node = { name: part, path: accumulated, folders: [], files: [] };
        folderMap[accumulated] = node;
        parent.folders.push(node);
      }
      parent = folderMap[accumulated];
    }

    parent.files.push({ ...file, name });
  }

  return root;
}

function folderStatus(folder) {
  const counts = { modified: 0, added: 0, removed: 0 };
  function walk(node) {
    node.files.forEach(f => { if (f.status !== 'identical') counts[f.status]++; });
    node.folders.forEach(walk);
  }
  walk(folder);
  return counts;
}
