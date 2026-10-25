export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

function needsQuote(f: string): boolean {
  return /[",\r\n]/.test(f);
}

export function stringifyCsv(rows: string[][]): string {
  return rows.map((r) => r.map((f) => (needsQuote(f) ? `"${f.replace(/"/g, '""')}"` : f)).join(",")).join("\r\n");
}

export function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const [header, ...rest] = rows;
  return rest.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

export function objectsToRows(objs: Record<string, unknown>[]): string[][] {
  if (objs.length === 0) return [];
  const headers = [...new Set(objs.flatMap((o) => Object.keys(o)))];
  return [headers, ...objs.map((o) => headers.map((h) => (o[h] === undefined || o[h] === null ? "" : String(o[h]))))];
}
