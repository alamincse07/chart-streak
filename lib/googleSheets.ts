import { google } from 'googleapis';

// The app reads sheets with its own service account, separate from the
// viewer's Google Sign-In identity. Sign-In only tells us who is viewing
// (for the watermark) — it does not need Sheets access itself, so viewers
// never need "Share" permission on the underlying spreadsheet.
function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

export type SheetTable = {
  columns: string[];
  rows: Record<string, string | number | null>[];
};

/**
 * Fetches a full tab and converts it into column/row objects.
 * Row 1 is treated as the header. Empty trailing cells in a row are
 * padded with null so every row object has every column key.
 */
export async function fetchSheetAsTable(
  spreadsheetId: string,
  tabName: string
): Promise<SheetTable> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: tabName, // whole tab; add e.g. `${tabName}!A1:Z` to cap the range
  });

  const values = res.data.values || [];
  if (values.length === 0) return { columns: [], rows: [] };

  const [header, ...dataRows] = values;
  const columns = header.map((h: string, i: number) => h?.trim() || `Column ${i + 1}`);

  const rows = dataRows.map((row) => {
    const obj: Record<string, string | number | null> = {};
    columns.forEach((col, i) => {
      const cell = row[i];
      obj[col] = cell === undefined || cell === '' ? null : cell;
    });
    return obj;
  });

  return { columns, rows };
}
