import { Workbook } from 'exceljs';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export class ExcelHelper {
  static async toXlsxBuffer(
    columns: ExcelColumn[],
    rows: Record<string, unknown>[],
    sheetName = 'Data',
  ): Promise<Buffer> {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? 20,
    }));
    sheet.addRows(rows);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  static toCsvString(headers: string[], rows: Array<Array<string | number>>): string {
    const escape = (value: string | number): string => {
      const str = String(value ?? '');
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const headerLine = headers.map(escape).join(',');
    const bodyLines = rows.map((row) => row.map(escape).join(','));
    return [headerLine, ...bodyLines].join('\n');
  }
}
