export function compare(sideA, sideB) {
  const allPaths = new Set([...sideA.keys(), ...sideB.keys()]);
  const files = [];

  for (const path of [...allPaths].sort()) {
    const entA = sideA.get(path);
    const entB = sideB.get(path);

    let status;
    if (!entA) status = 'added';
    else if (!entB) status = 'removed';
    else if (entA.hash === entB.hash) status = 'identical';
    else status = 'modified';

    files.push({
      path,
      status,
      type: (entA || entB).type,
      sizeA: entA?.size ?? null,
      sizeB: entB?.size ?? null,
      hashA: entA?.hash ?? null,
      hashB: entB?.hash ?? null,
      // raw data kept for lazy diff
      _dataA: entA?.data ?? null,
      _dataB: entB?.data ?? null,
    });
  }

  const summary = {
    total:     files.length,
    added:     files.filter(f => f.status === 'added').length,
    removed:   files.filter(f => f.status === 'removed').length,
    modified:  files.filter(f => f.status === 'modified').length,
    identical: files.filter(f => f.status === 'identical').length,
    sizeA:     files.reduce((s, f) => s + (f.sizeA ?? 0), 0),
    sizeB:     files.reduce((s, f) => s + (f.sizeB ?? 0), 0),
  };

  const byType = {};
  for (const f of files) {
    if (!byType[f.type]) byType[f.type] = { total: 0, added: 0, removed: 0, modified: 0, identical: 0 };
    byType[f.type].total++;
    byType[f.type][f.status]++;
  }

  return { summary, byType, files };
}

const TEXT_DECODER = new TextDecoder();

export async function computeDiff(file) {
  const { type, _dataA, _dataB } = file;
  if (file.status === 'identical') return null;
  if (file.status === 'added' || file.status === 'removed') return null;

  if (type === 'media' || type === 'other') return null;

  if (type === 'excel') {
    const { diffExcel } = await import('./parsers/excelParser.js');
    return diffExcel(_dataA, _dataB);
  }

  const textA = TEXT_DECODER.decode(_dataA);
  const textB = TEXT_DECODER.decode(_dataB);

  if (type === 'xml') {
    const { diffXml } = await import('./parsers/xmlParser.js');
    return diffXml(textA, textB);
  }
  if (type === 'json') {
    const { diffJson } = await import('./parsers/jsonParser.js');
    return diffJson(textA, textB);
  }
  // text / csv / other text
  const { diffText } = await import('./parsers/textParser.js');
  return diffText(textA, textB);
}
