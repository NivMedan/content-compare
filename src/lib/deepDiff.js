export function deepDiff(a, b, path = '') {
  const diffs = [];
  if (a === b) return diffs;

  const typeA = Array.isArray(a) ? 'array' : typeof a;
  const typeB = Array.isArray(b) ? 'array' : typeof b;

  if (typeA !== typeB || a === null || b === null) {
    diffs.push({ type: 'changed', path: path || '(root)', before: summarize(a), after: summarize(b) });
    return diffs;
  }

  if (typeA === 'array') {
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      const p = `${path}[${i}]`;
      if (i >= a.length) diffs.push({ type: 'added', path: p, after: summarize(b[i]) });
      else if (i >= b.length) diffs.push({ type: 'removed', path: p, before: summarize(a[i]) });
      else diffs.push(...deepDiff(a[i], b[i], p));
    }
  } else if (typeA === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const p = path ? `${path}.${k}` : k;
      if (!(k in a)) diffs.push({ type: 'added', path: p, after: summarize(b[k]) });
      else if (!(k in b)) diffs.push({ type: 'removed', path: p, before: summarize(a[k]) });
      else diffs.push(...deepDiff(a[k], b[k], p));
    }
  } else {
    diffs.push({ type: 'changed', path: path || '(root)', before: String(a), after: String(b) });
  }

  return diffs;
}

function summarize(v) {
  if (v === null || v === undefined) return String(v);
  if (typeof v === 'object') return Array.isArray(v) ? `[Array(${v.length})]` : `{Object}`;
  return String(v);
}
