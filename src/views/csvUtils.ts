/**
 * Zero-dependency CSV utilities for DynamoDB data
 */

export function jsonToCsv(items: Record<string, unknown>[]): string {
  if (items.length === 0) return '';

  // Extract all unique headers
  const headersSet = new Set<string>();
  for (const item of items) {
    for (const key of Object.keys(item)) {
      headersSet.add(key);
    }
  }

  const headers = Array.from(headersSet);
  const rows = [];

  // Add header row
  rows.push(headers.map(escapeCsvValue).join(','));

  // Add data rows
  for (const item of items) {
    const row = headers.map(header => {
      const val = item[header];
      if (val === undefined || val === null) {
        return '';
      }
      if (typeof val === 'object') {
        // Stringify nested objects and arrays
        return escapeCsvValue(JSON.stringify(val));
      }
      return escapeCsvValue(String(val));
    });
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

export function csvToJson(csvText: string): Record<string, unknown>[] {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const items: Record<string, unknown>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Skip empty lines at the end
    if (row.length === 1 && row[0] === '') continue;

    const item: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const val = row[j];

      if (val === undefined || val === '') {
        continue; // Skip empty cells
      }

      // Try to parse as JSON if it looks like an array or object
      if ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']'))) {
        try {
          item[header] = JSON.parse(val);
        } catch {
          // If parsing fails, just use it as string
          item[header] = val;
        }
      } else if (!isNaN(Number(val)) && val.trim() !== '') {
        item[header] = Number(val);
      } else if (val === 'true') {
        item[header] = true;
      } else if (val === 'false') {
        item[header] = false;
      } else if (val === 'null') {
        item[header] = null;
      } else {
        item[header] = val;
      }
    }

    if (Object.keys(item).length > 0) {
      items.push(item);
    }
  }

  return items;
}

function escapeCsvValue(val: string): string {
  // If the value contains commas, quotes, or newlines, we need to wrap it in quotes
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    // Escape internal quotes by doubling them
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = i + 1 < text.length ? text[i + 1] : '';

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentCell += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        // End of quotes
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        // End of cell
        currentRow.push(currentCell);
        currentCell = '';
      } else if (char === '\r' && nextChar === '\n') {
        // End of row (CRLF)
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++; // Skip \n
      } else if (char === '\n' || char === '\r') {
        // End of row (LF or CR)
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  // Push last cell/row
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}
