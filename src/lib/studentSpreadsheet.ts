import { readSheet } from 'read-excel-file/browser';
import writeExcelFile from 'write-excel-file/browser';

type CellValue = string | number | boolean | Date | null;

function normalizeCell(value: unknown): unknown {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    const maybeText = value as { text?: unknown; result?: unknown };
    if (typeof maybeText.text === 'string') return maybeText.text;
    if (typeof maybeText.result === 'string' || typeof maybeText.result === 'number') {
      return maybeText.result;
    }
  }
  return value;
}

function sanitizeSpreadsheetText(value: string): string {
  // Prevent CSV/Excel formula injection from untrusted imported names/notes.
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

export async function readStudentSpreadsheet(file: File): Promise<Record<string, unknown>[]> {
  const extension = file.name.toLowerCase().split('.').pop() || '';

  if (extension === 'csv') {
    const text = await file.text();
    return parseCsv(text);
  }

  const matrix = (await readSheet(file)) as unknown[][];
  if (matrix.length === 0) return [];

  const headers = (matrix[0] || []).map((header, index) => {
    const normalized = normalizeCell(header);
    const value = String(normalized ?? '').trim();
    return value || `Column ${index + 1}`;
  });

  return matrix.slice(1).map((row) => {
    const result: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      result[header] = normalizeCell(row?.[index]);
    });
    return result;
  });
}

function parseCsv(input: string): Record<string, unknown>[] {
  const rows = parseCsvRows(input);
  if (rows.length === 0) return [];

  const headers = rows[0].map((cell, index) => cell.trim() || `Column ${index + 1}`);

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim() !== ''))
    .map((row) => {
      const item: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        item[header] = row[index] ?? '';
      });
      return item;
    });
}

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (char === '"') {
      if (inQuotes && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\\n' || char === '\\r') && !inQuotes) {
      if (char === '\\r' && input[i + 1] === '\\n') i += 1;
      row.push(cell);
      cell = '';
      if (row.length > 0) rows.push(row);
      row = [];
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

export async function downloadStudentSpreadsheet(
  rows: Record<string, unknown>[],
  fileName: string,
  sheetName = 'Ardayda'
): Promise<void> {
  const normalizedRows = rows.length > 0 ? rows : [{}];
  const headers = Object.keys(normalizedRows[0] || {});
  const sheetData: CellValue[][] = [
    headers,
    ...normalizedRows.map((row) =>
      headers.map((header) => {
        const value = normalizeCell(row[header]);
        if (
          value === null ||
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          value instanceof Date
        ) {
          return typeof value === 'string'
            ? sanitizeSpreadsheetText(value)
            : (value as CellValue);
        }
        return sanitizeSpreadsheetText(String(value ?? ''));
      })
    )
  ];

  await writeExcelFile(sheetData, {
    sheet: sheetName
  }).toFile(fileName);
}

export function escapeCsvCell(value: unknown): string {
  const text = String(normalizeCell(value) ?? '');
  if (/[",\\n\\r]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  return [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(','))
  ].join('\\r\\n');
}
