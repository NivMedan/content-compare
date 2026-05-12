export function diffText(textA, textB) {
  const linesA = textA.split('\n');
  const linesB = textB.split('\n');

  // Myers-style edit script via LCS on lines (capped at 2000 lines each for perf)
  const a = linesA.slice(0, 2000);
  const b = linesB.slice(0, 2000);
  const lcs = computeLCS(a, b);

  const result = [];
  let ia = 0, ib = 0, il = 0;

  while (il < lcs.length) {
    while (ia < lcs[il].ia) result.push({ type: 'removed', content: a[ia++] });
    while (ib < lcs[il].ib) result.push({ type: 'added', content: b[ib++] });
    result.push({ type: 'context', content: a[ia] });
    ia++; ib++; il++;
  }
  while (ia < a.length) result.push({ type: 'removed', content: a[ia++] });
  while (ib < b.length) result.push({ type: 'added', content: b[ib++] });

  return { ok: true, lines: result, truncated: linesA.length > 2000 || linesB.length > 2000 };
}

function computeLCS(a, b) {
  const m = a.length, n = b.length;
  // DP table — avoid huge allocations by bailing if too large
  if (m * n > 4_000_000) return [];
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  // Backtrack
  const lcs = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { lcs.unshift({ ia: i - 1, ib: j - 1 }); i--; j--; }
    else if (dp[i - 1][j] > dp[i][j - 1]) i--;
    else j--;
  }
  return lcs;
}
