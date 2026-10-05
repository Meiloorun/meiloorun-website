
export interface LibraryGame {
  igdbId?: number; title: string; platform: string; status: string; completion: string;
  completedOn?: string; rating?: string;
}
export interface GameLibrary {
  entries: LibraryGame[]; playing: LibraryGame[]; recentlyCompleted: LibraryGame[];
  snapshotDate?: string;
}

/** Handles CSV escaping, quoted commas/newlines, CRLF, and UTF-8 BOMs. */
export function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false, closed = false, bareQuote = false;
  const text = source.replace(/^\uFEFF/, '');
  const finishRow = () => { row.push(field); if (row.some(value => value.trim())) rows.push(row); row = []; field = ''; closed = false; bareQuote = false; };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      // Infinite Backlog sometimes leaves inner title quotes unescaped.
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        if (!(bareQuote && /[,\r\n]/.test(text[i + 2] ?? ','))) i++;
      }
      else if (char === '"' && (i === text.length - 1 || /[,\r\n]/.test(text[i + 1]))) { quoted = false; closed = true; }
      else if (char === '"') { field += char; bareQuote = true; }
      else field += char;
    } else if (char === ',') { row.push(field); field = ''; closed = false; bareQuote = false; }
    else if (char === '\n' || char === '\r') { if (char === '\r' && text[i + 1] === '\n') i++; finishRow(); }
    else if (char === '"' && field === '' && !closed) quoted = true;
    else if (closed || char === '"') throw new Error('Invalid CSV quoting in game export.');
    else field += char;
  }
  if (quoted) throw new Error('Unclosed quoted field in game export.');
  if (field || row.length || closed) finishRow();
  return rows;
}

export function importGameLibrary(source: string, filename: string): GameLibrary {
  const [headers, ...rows] = parseCsv(source);
  if (!headers) throw new Error('Game export is empty.');
  const required = ['IGDB ID', 'Game name', 'Platform', 'Status', 'Completion', 'Completion date'];
  for (const header of required) if (!headers.includes(header)) throw new Error(`Game export is missing the ${header} column.`);
  const index = new Map(headers.map((header, i) => [header, i]));
  const entries = rows.map((row, i): LibraryGame => {
    if (row.length !== headers.length) throw new Error(`Game export row ${i + 2} has an unexpected number of columns.`);
    const cell = (header: string) => row[index.get(header) ?? -1]?.trim() ?? '';
    const id = cell('IGDB ID');
    const title = cell('Game name');
    if (!title) throw new Error(`Game export row ${i + 2} has no game name.`);
    // Explicit allowlist: personal notes and acquisition/borrowing data never leave the importer.
    return {
      igdbId: /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) ? Number(id) : undefined,
      title, platform: cell('Platform'), status: cell('Status'), completion: cell('Completion'),
      completedOn: cell('Completion date') || undefined, rating: cell('Rating (Score)') || undefined,
    };
  });
  const recentlyCompleted = entries.filter(game => ['beaten', 'completed'].includes(game.completion.toLowerCase()) && game.completedOn && /^\d{4}(-\d{2})?(-\d{2})?$/.test(game.completedOn))
    .sort((a, b) => b.completedOn!.localeCompare(a.completedOn!)).slice(0, 6);
  return { entries, playing: entries.filter(game => game.status.toLowerCase() === 'playing'), recentlyCompleted,
    snapshotDate: filename.match(/(\d{4}-\d{2}-\d{2})\.csv$/i)?.[1] };
}

export async function loadGameLibrary(): Promise<GameLibrary> {
  const exports = import.meta.glob<string>('/src/data/games_export/*', { query: '?raw', import: 'default' });
  const filename = singleExport(Object.keys(exports));
  return importGameLibrary(await exports[filename](), filename);
}

export function singleExport(paths: string[]): string {
  const files = paths.filter(path => /\.csv$/i.test(path));
  if (files.length !== 1) throw new Error(`Expected exactly one CSV in src/data/games_export; found ${files.length}. Remove the old export and leave the new one.`);
  return files[0];
}

/** Reuse IGDB's canonical slug under the configured Infinite Backlog user collection. */
export function gameCollectionUrl(slug: string | undefined, profileUrl: string): string | undefined {
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) return undefined;
  try {
    const url = new URL(profileUrl);
    const user = url.pathname.match(/^\/users\/([^/]+)(?:\/|$)/)?.[1];
    if (!['infinitebacklog.net', 'beta.infinitebacklog.net', 'www.infinitebacklog.net'].includes(url.hostname) || !user) return undefined;
    url.protocol = 'https:';
    url.hostname = 'infinitebacklog.net';
    url.port = '';
    url.pathname = `/users/${user}/collection/${slug}`;
    url.search = '';
    url.hash = '';
    return url.href;
  } catch { return undefined; }
}
