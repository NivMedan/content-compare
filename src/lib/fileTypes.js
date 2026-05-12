const IGNORED = new Set(['.ds_store', 'thumbs.db', 'desktop.ini', '.gitkeep', '.gitignore']);

const TYPE_MAP = {
  xml:    ['.xml', '.xsd', '.xsl', '.xslt', '.config', '.csproj', '.resx'],
  json:   ['.json', '.jsonc'],
  excel:  ['.xlsx', '.xls', '.xlsm', '.xlsb'],
  csv:    ['.csv', '.tsv'],
  text:   ['.txt', '.html', '.htm', '.css', '.js', '.ts', '.jsx', '.tsx',
           '.md', '.ini', '.yaml', '.yml', '.toml', '.sh', '.bat', '.sql',
           '.py', '.ps1', '.log'],
  media:  ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.ico', '.svg',
           '.mp4', '.avi', '.mov', '.wmv', '.mkv', '.mp3', '.wav', '.ogg',
           '.pdf', '.psd', '.ai'],
  binary: ['.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.db',
           '.zip', '.7z', '.rar', '.tar', '.gz', '.bz2'],
};

export function classifyFile(filename) {
  const lower = filename.toLowerCase();
  const base = lower.split('/').pop();
  if (IGNORED.has(base)) return 'ignored';
  const ext = '.' + base.split('.').pop();
  for (const [type, exts] of Object.entries(TYPE_MAP)) {
    if (exts.includes(ext)) return type;
  }
  return 'other';
}

export function isIgnored(filename) {
  return classifyFile(filename) === 'ignored';
}

export function formatBytes(n) {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
