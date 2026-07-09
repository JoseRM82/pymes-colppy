import Papa from 'papaparse';
import type { Venta, MedioPago } from '../types/venta';
import {
  MEDIOS_PAGO,
  OPTIONAL_CSV_COLUMNS,
  REQUIRED_CSV_COLUMNS,
} from '../types/venta';
import { getTodayLocal } from './dateUtils';
import { normalizeDecimalInput } from './formatters';

export const CSV_MAX_BYTES = 5 * 1024 * 1024;
export const CSV_MAX_ROWS = 10000;

export type RawRow = Record<string, string>;

export interface ParseCsvResult {
  valid: Venta[];
  invalid: RawRow[];
  missingHeaders: string[];
}

function normalizeHeader(h: string): string {
  return h.replace(/^\uFEFF/, '').trim().toLowerCase();
}

function rowKey(row: RawRow, key: string): string {
  const found = Object.keys(row).find((k) => normalizeHeader(k) === key);
  return found ? String(row[found] ?? '').trim() : '';
}

export function validateRow(row: RawRow): { venta?: Venta; invalid: boolean } {
  const id_venta = rowKey(row, 'id_venta');
  const fecha = rowKey(row, 'fecha');
  const cliente = rowKey(row, 'cliente');
  const producto = rowKey(row, 'producto');
  const cantidadStr = rowKey(row, 'cantidad');
  const importeStr = rowKey(row, 'importe');
  const medio_pago = rowKey(row, 'medio_pago').toLowerCase();
  const monedaRaw = rowKey(row, 'moneda');
  const moneda = monedaRaw || '$';

  if (
    !id_venta ||
    !fecha ||
    !cliente ||
    !producto ||
    !cantidadStr ||
    !importeStr ||
    !medio_pago
  ) {
    return { invalid: true };
  }

  if (!/^V-\d{4,}$/.test(id_venta)) return { invalid: true };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { invalid: true };
  if (fecha > getTodayLocal()) return { invalid: true };

  const cantidad = Number(cantidadStr);
  if (!Number.isInteger(cantidad) || cantidad < 1) return { invalid: true };

  if (importeStr.includes(',')) return { invalid: true };
  if (!/^\d+(\.\d{2})$/.test(importeStr)) return { invalid: true };
  const importe = Number(importeStr);
  if (importe <= 0) return { invalid: true };

  if (!MEDIOS_PAGO.includes(medio_pago as MedioPago)) return { invalid: true };

  return {
    invalid: false,
    venta: {
      id_venta,
      fecha,
      cliente,
      producto,
      cantidad,
      moneda,
      importe,
      medio_pago: medio_pago as MedioPago,
    },
  };
}

function ventaSignature(v: Venta): string {
  return JSON.stringify(v);
}

export function dedupeVentas(ventas: Venta[]): Venta[] {
  const result: Venta[] = [];
  const seenSignatures = new Set<string>();

  for (const v of ventas) {
    const sig = `${v.id_venta}::${ventaSignature(v)}`;
    if (seenSignatures.has(sig)) continue;
    seenSignatures.add(sig);
    result.push(v);
  }
  return result;
}

export function parseCsvText(text: string): ParseCsvResult {
  const parsed = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (!parsed.meta.fields?.length) {
    return { valid: [], invalid: [], missingHeaders: [...REQUIRED_CSV_COLUMNS] };
  }

  const headers = parsed.meta.fields.map(normalizeHeader);
  const missingHeaders = REQUIRED_CSV_COLUMNS.filter(
    (col) => !headers.includes(col),
  );
  if (missingHeaders.length > 0) {
    return { valid: [], invalid: [], missingHeaders };
  }

  const valid: Venta[] = [];
  const invalid: RawRow[] = [];

  for (const row of parsed.data) {
    const { venta, invalid: isInvalid } = validateRow(row);
    if (isInvalid || !venta) {
      invalid.push(toExportRow(row));
    } else {
      valid.push(venta);
    }
  }

  return { valid: dedupeVentas(valid), invalid, missingHeaders: [] };
}

export function toExportRow(row: RawRow): RawRow {
  const result: RawRow = {};
  for (const col of [...REQUIRED_CSV_COLUMNS, ...OPTIONAL_CSV_COLUMNS]) {
    result[col] = rowKey(row, col);
  }
  return result;
}

export function validateFormVenta(data: Partial<Venta>): data is Venta {
  const row: RawRow = {
    id_venta: data.id_venta ?? '',
    fecha: data.fecha ?? '',
    cliente: data.cliente ?? '',
    producto: data.producto ?? '',
    cantidad: data.cantidad !== undefined ? String(data.cantidad) : '',
    importe:
      data.importe !== undefined
        ? normalizeDecimalInput(String(data.importe))
        : '',
    medio_pago: data.medio_pago ?? '',
    moneda: data.moneda ?? '',
  };
  const { venta, invalid } = validateRow(row);
  return !invalid && !!venta;
}
