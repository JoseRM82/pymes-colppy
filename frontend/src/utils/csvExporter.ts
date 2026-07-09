import Papa from 'papaparse';
import type { Venta } from '../types/venta';
import { REQUIRED_CSV_COLUMNS, OPTIONAL_CSV_COLUMNS } from '../types/venta';
import { toExportRow } from './csvParser';

function sanitizeCell(value: string): string {
  if (/^[=+\-@]/.test(value)) return `'${value}`;
  return value;
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}_${pad(d.getMonth() + 1)}_${pad(d.getDate())}__${pad(d.getHours())}_${pad(d.getMinutes())}`;
}

export function downloadCsv(
  filename: string,
  rows: Record<string, string>[],
  columns: readonly string[],
) {
  const sanitized = rows.map((row) => {
    const out: Record<string, string> = {};
    for (const col of columns) {
      out[col] = sanitizeCell(row[col] ?? '');
    }
    return out;
  });
  const csv = Papa.unparse(sanitized, { columns: [...columns] });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadInvalidCsv(rows: Record<string, string>[]) {
  downloadCsv(
    `ventas_con_datos_faltantes_${timestamp()}.csv`,
    rows,
    [...REQUIRED_CSV_COLUMNS, ...OPTIONAL_CSV_COLUMNS],
  );
}

export function downloadDuplicatesCsv(ventas: Venta[]) {
  const rows = ventas.map((v) => ({
    id_venta: v.id_venta,
    fecha: v.fecha,
    cliente: v.cliente,
    producto: v.producto,
    cantidad: String(v.cantidad),
    importe: v.importe.toFixed(2),
    medio_pago: v.medio_pago,
    moneda: v.moneda,
  }));
  downloadCsv(
    `ventas_ya_existentes_${timestamp()}.csv`,
    rows,
    [...REQUIRED_CSV_COLUMNS, ...OPTIONAL_CSV_COLUMNS],
  );
}

export function ventasToExportRows(ventas: Venta[]): Record<string, string>[] {
  return ventas.map((v) =>
    toExportRow({
      id_venta: v.id_venta,
      fecha: v.fecha,
      cliente: v.cliente,
      producto: v.producto,
      cantidad: String(v.cantidad),
      importe: v.importe.toFixed(2),
      medio_pago: v.medio_pago,
      moneda: v.moneda,
    }),
  );
}
