import { formatBytes } from '../lib/fileTypes.js';


function matchColor(pct) {
  if (pct >= 90) return '#3fb950';
  if (pct >= 70) return '#d29922';
  return '#f85149';
}

function matchLabel(pct) {
  if (pct >= 95) return 'Excellent match';
  if (pct >= 85) return 'Good match';
  if (pct >= 70) return 'Partial match';
  if (pct >= 50) return 'Low match';
  return 'Poor match';
}

export default function SummaryCards({ summary, nameA, nameB }) {
  const pct = n => summary.total ? Math.round((n / summary.total) * 100) : 0;

  // Match % = identical ÷ total — penalises added, removed AND modified files.
  // Zero total → 100 only if both sides are genuinely empty.
  const matchPct = summary.total
    ? Math.round((summary.identical / summary.total) * 100)
    : 100;
  const color = matchColor(matchPct);

  const cards = [
    { label: 'Total Files', value: summary.total,     color: 'accent',   icon: '📁' },
    { label: 'Added',       value: summary.added,     color: 'added',    icon: '＋', sub: `${pct(summary.added)}%` },
    { label: 'Removed',     value: summary.removed,   color: 'removed',  icon: '－', sub: `${pct(summary.removed)}%` },
    { label: 'Modified',    value: summary.modified,  color: 'modified', icon: '～', sub: `${pct(summary.modified)}%` },
    { label: 'Identical',   value: summary.identical, color: 'identical',icon: '＝', sub: `${pct(summary.identical)}%` },
  ];

  return (
    <div className="summary-section">

      {/* ── Version row + match score ── */}
      <div className="summary-top-row">
        <div className="version-badges">
          <div className="version-badge-wrap">
            <span className="version-badge version-a" title={nameA}>A: {nameA}</span>
            {summary.sizeA > 0 && <span className="version-size">{formatBytes(summary.sizeA)}</span>}
          </div>
          <span className="version-arrow">→</span>
          <div className="version-badge-wrap">
            <span className="version-badge version-b" title={nameB}>B: {nameB}</span>
            {summary.sizeB > 0 && <span className="version-size">{formatBytes(summary.sizeB)}</span>}
          </div>
        </div>

        <div className="match-score-banner" style={{ '--match-color': color }}>
          {/* arc ring */}
          <svg viewBox="0 0 56 56" className="msb-ring">
            <circle cx="28" cy="28" r="22" fill="none" stroke="var(--surface-3)" strokeWidth="5" />
            <circle
              cx="28" cy="28" r="22" fill="none"
              stroke={color} strokeWidth="5"
              strokeDasharray={`${(matchPct / 100) * 138.23} 138.23`}
              strokeLinecap="round"
              transform="rotate(-90 28 28)"
              style={{ transition: 'stroke-dasharray .6s ease' }}
            />
            <text x="28" y="32" textAnchor="middle" fill={color}
                  fontSize="11" fontWeight="800" fontFamily="system-ui">
              {matchPct}%
            </text>
          </svg>

          <div className="msb-text">
            <span className="msb-label" style={{ color }}>
              {matchLabel(matchPct)}
            </span>
            <span className="msb-sub">
              {summary.identical} of {summary.total} files unchanged
            </span>
            {/* full-width bar */}
            <div className="msb-bar-track">
              <div className="msb-bar-seg msb-identical"
                   style={{ width: `${pct(summary.identical)}%`, background: '#3fb950' }} />
              <div className="msb-bar-seg msb-modified"
                   style={{ width: `${pct(summary.modified)}%`,  background: '#d29922' }} />
              <div className="msb-bar-seg msb-removed"
                   style={{ width: `${pct(summary.removed)}%`,   background: '#f85149' }} />
              <div className="msb-bar-seg msb-added"
                   style={{ width: `${pct(summary.added)}%`,     background: '#58a6ff' }} />
            </div>
            <div className="msb-bar-legend">
              <span><span className="msb-dot" style={{background:'#3fb950'}}/>Identical</span>
              <span><span className="msb-dot" style={{background:'#d29922'}}/>Modified</span>
              <span><span className="msb-dot" style={{background:'#f85149'}}/>Removed</span>
              <span><span className="msb-dot" style={{background:'#58a6ff'}}/>Added</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="cards-row">
        {cards.map(c => (
          <div key={c.label} className={`summary-card card-${c.color}`}>
            <div className="card-icon">{c.icon}</div>
            <div className="card-value">{c.value.toLocaleString()}</div>
            <div className="card-label">{c.label}</div>
            {c.sub && <div className="card-sub">{c.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
