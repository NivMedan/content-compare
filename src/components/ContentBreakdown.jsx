import { useState } from 'react';

const TYPE_META = {
  xml:    { label: 'XML',    icon: '📄', color: '#79c0ff' },
  excel:  { label: 'Excel',  icon: '📊', color: '#3fb950' },
  json:   { label: 'JSON',   icon: '{}',  color: '#d2a8ff' },
  csv:    { label: 'CSV',    icon: '📋', color: '#56d364' },
  text:   { label: 'Text',   icon: '📝', color: '#9198a1' },
  media:  { label: 'Media',  icon: '🎬', color: '#f0883e' },
  binary: { label: 'Binary', icon: '⚙',  color: '#58a6ff' },
  other:  { label: 'Other',  icon: '📁', color: '#484f58' },
};

const CIRC = 2 * Math.PI * 32; // circumference for r=32

function matchPct(stats) {
  const shared = stats.identical + stats.modified;
  return shared === 0 ? null : Math.round((stats.identical / shared) * 100);
}

function scorePct(stats) {
  return stats.total === 0 ? null : Math.round((stats.identical / stats.total) * 100);
}

function gaugeColor(p) {
  if (p == null) return 'var(--border-2)';
  if (p >= 90) return '#3fb950';
  if (p >= 70) return '#d29922';
  return '#f85149';
}

export default function ContentBreakdown({ summary, byType, nameA, nameB }) {
  const [open, setOpen] = useState(true);

  const inA = summary.identical + summary.modified + summary.removed;
  const inB = summary.identical + summary.modified + summary.added;
  const overallScore = scorePct(summary);
  const overallMatch = matchPct(summary);

  const types = Object.entries(byType)
    .map(([type, s]) => ({
      type,
      ...s,
      inA:   s.identical + s.modified + s.removed,
      inB:   s.identical + s.modified + s.added,
      match: matchPct(s),
      score: scorePct(s),
      meta:  TYPE_META[type] ?? TYPE_META.other,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="breakdown-card">
      <button className="breakdown-toggle" onClick={() => setOpen(o => !o)}>
        <span className="breakdown-toggle-title">
          <span className="breakdown-toggle-icon">📊</span>
          Content Breakdown &amp; Match Score
        </span>
        <span className="breakdown-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="breakdown-body">

          {/* ── Gauges + version counts ── */}
          <div className="breakdown-top">
            <MatchGauge
              pct={overallScore}
              label="Content Score"
              sub={`${summary.identical} of ${summary.total} files identical`}
              help="Identical files ÷ all files (penalises added/removed)"
            />
            <MatchGauge
              pct={overallMatch}
              label="Shared Match"
              sub={`${summary.identical} of ${summary.identical + summary.modified} shared`}
              help="Identical ÷ files present in both versions"
            />

            <div className="breakdown-version-grid">
              <VersionStat label={nameA ?? 'Version A'} count={inA} side="a" />
              <VersionStat label={nameB ?? 'Version B'} count={inB} side="b" />
              <StatPill label="Only in A" value={summary.removed} cls="st-removed"  empty="—" />
              <StatPill label="Only in B" value={summary.added}   cls="st-added"    empty="—" />
              <StatPill label="Modified"  value={summary.modified}cls="st-modified" empty="—" />
              <StatPill label="Identical" value={summary.identical}cls="st-ok"      empty="—" />
            </div>
          </div>

          {/* ── Per-type table ── */}
          <div className="tbt-wrap">
            <div className="tbt-head">
              <span className="tbt-type-col">Type</span>
              <span className="tbt-num">In {nameA ?? 'A'}</span>
              <span className="tbt-num">In {nameB ?? 'B'}</span>
              <span className="tbt-num tbt-removed">Only A</span>
              <span className="tbt-num tbt-added">Only B</span>
              <span className="tbt-num tbt-modified">Modified</span>
              <span className="tbt-num tbt-ok">Identical</span>
              <span className="tbt-match-col">Match</span>
            </div>

            {types.map(t => (
              <TypeRow key={t.type} t={t} />
            ))}

            {/* Totals row */}
            <div className="tbt-row tbt-totals">
              <span className="tbt-type-col"><strong>Total</strong></span>
              <span className="tbt-num"><strong>{inA}</strong></span>
              <span className="tbt-num"><strong>{inB}</strong></span>
              <span className="tbt-num tbt-removed"><strong>{summary.removed || '—'}</strong></span>
              <span className="tbt-num tbt-added"><strong>{summary.added || '—'}</strong></span>
              <span className="tbt-num tbt-modified"><strong>{summary.modified || '—'}</strong></span>
              <span className="tbt-num tbt-ok"><strong>{summary.identical}</strong></span>
              <span className="tbt-match-col">
                <MatchBar pct={overallMatch} />
              </span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MatchGauge({ pct, label, sub, help }) {
  const p   = pct ?? 0;
  const col = gaugeColor(pct);
  const dash = (p / 100) * CIRC;

  return (
    <div className="match-gauge" title={help}>
      <svg viewBox="0 0 80 80" className="gauge-svg">
        <circle cx="40" cy="40" r="32" fill="none" stroke="var(--surface-3)" strokeWidth="7" />
        <circle
          cx="40" cy="40" r="32" fill="none"
          stroke={col} strokeWidth="7"
          strokeDasharray={`${dash} ${CIRC}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dasharray .5s ease' }}
        />
        <text x="40" y="37" textAnchor="middle" dominantBaseline="middle"
              fill="var(--text-1)" fontSize="13" fontWeight="700" fontFamily="system-ui">
          {pct != null ? `${p}%` : '—'}
        </text>
        <text x="40" y="52" textAnchor="middle"
              fill="var(--text-3)" fontSize="6.5" fontFamily="system-ui">
          {label}
        </text>
      </svg>
      {sub && <div className="gauge-sub">{sub}</div>}
    </div>
  );
}

function VersionStat({ label, count, side }) {
  return (
    <div className={`version-stat vs-${side}`}>
      <div className="vs-count">{count.toLocaleString()}</div>
      <div className="vs-label">{label}</div>
    </div>
  );
}

function StatPill({ label, value, cls, empty }) {
  return (
    <div className="stat-pill">
      <div className={`sp-value ${value ? cls : 'sp-dim'}`}>{value || empty}</div>
      <div className="sp-label">{label}</div>
    </div>
  );
}

function TypeRow({ t }) {
  const p = t.match;
  return (
    <div className="tbt-row">
      <span className="tbt-type-col">
        <span className="tbt-icon">{t.meta.icon}</span>
        <span className="tbt-type-name" style={{ color: t.meta.color }}>{t.meta.label}</span>
        <span className="tbt-total">({t.total})</span>
      </span>
      <span className="tbt-num">{t.inA}</span>
      <span className="tbt-num">{t.inB}</span>
      <span className="tbt-num tbt-removed">{t.removed  || <span className="tbt-dim">—</span>}</span>
      <span className="tbt-num tbt-added"  >{t.added    || <span className="tbt-dim">—</span>}</span>
      <span className="tbt-num tbt-modified">{t.modified || <span className="tbt-dim">—</span>}</span>
      <span className="tbt-num tbt-ok"     >{t.identical || <span className="tbt-dim">—</span>}</span>
      <span className="tbt-match-col">
        <MatchBar pct={p} />
      </span>
    </div>
  );
}

function MatchBar({ pct }) {
  if (pct == null) return <span className="tbt-dim">—</span>;
  const col = gaugeColor(pct);
  return (
    <div className="match-bar-wrap">
      <div className="match-bar-track">
        <div className="match-bar-fill" style={{ width: `${pct}%`, background: col }} />
      </div>
      <span className="match-bar-pct" style={{ color: col }}>{pct}%</span>
    </div>
  );
}
