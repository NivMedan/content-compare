import * as XLSX from 'xlsx';

export function diffExcel(bufferA, bufferB) {
  try {
    const wbA = XLSX.read(new Uint8Array(bufferA), { type: 'array' });
    const wbB = XLSX.read(new Uint8Array(bufferB), { type: 'array' });

    const sheetsA = new Set(wbA.SheetNames);
    const sheetsB = new Set(wbB.SheetNames);

    const sheetsAdded = wbB.SheetNames.filter(s => !sheetsA.has(s));
    const sheetsRemoved = wbA.SheetNames.filter(s => !sheetsB.has(s));
    const sheetsCommon = wbA.SheetNames.filter(s => sheetsB.has(s));

    const sheetsModified = {};
    for (const name of sheetsCommon) {
      const diff = diffSheet(wbA.Sheets[name], wbB.Sheets[name]);
      if (diff.cellsChanged.length || diff.cellsAdded.length || diff.cellsRemoved.length) {
        sheetsModified[name] = diff;
      }
    }

    return { ok: true, sheetsAdded, sheetsRemoved, sheetsModified, sheetsIdentical: sheetsCommon.filter(s => !sheetsModified[s]) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function diffSheet(wsA, wsB) {
  const cellsA = getCells(wsA);
  const cellsB = getCells(wsB);
  const allRefs = new Set([...Object.keys(cellsA), ...Object.keys(cellsB)]);

  const cellsAdded = [];
  const cellsRemoved = [];
  const cellsChanged = [];

  for (const ref of allRefs) {
    const inA = ref in cellsA;
    const inB = ref in cellsB;
    if (!inA) cellsAdded.push({ ref, value: cellsB[ref] });
    else if (!inB) cellsRemoved.push({ ref, value: cellsA[ref] });
    else if (String(cellsA[ref]) !== String(cellsB[ref])) {
      cellsChanged.push({ ref, before: cellsA[ref], after: cellsB[ref] });
    }
  }

  return { cellsAdded, cellsRemoved, cellsChanged };
}

function getCells(ws) {
  const cells = {};
  if (!ws || !ws['!ref']) return cells;
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref]) cells[ref] = ws[ref].v ?? '';
    }
  }
  return cells;
}
