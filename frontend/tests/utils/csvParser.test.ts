import { describe, expect, it } from 'vitest';
import {
  dedupeVentas,
  parseCsvText,
  validateFormVenta,
  validateRow,
} from '../../src/utils/csvParser';

const validRow = {
  id_venta: 'V-1001',
  fecha: '2026-05-02',
  cliente: 'Cliente A',
  producto: 'Producto B',
  cantidad: '2',
  importe: '150.50',
  medio_pago: 'efectivo',
};

describe('validateRow', () => {
  it('acepta una fila válida', () => {
    const result = validateRow(validRow);
    expect(result.invalid).toBe(false);
    expect(result.venta).toMatchObject({
      id_venta: 'V-1001',
      importe: 150.5,
      medio_pago: 'efectivo',
      moneda: '$',
    });
  });

  it('rechaza fecha futura', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const fecha = tomorrow.toISOString().slice(0, 10);
    const result = validateRow({ ...validRow, fecha });
    expect(result.invalid).toBe(true);
  });

  it('rechaza id_venta con formato inválido', () => {
    expect(validateRow({ ...validRow, id_venta: 'V-123' }).invalid).toBe(true);
    expect(validateRow({ ...validRow, id_venta: 'X-10001' }).invalid).toBe(true);
  });

  it('rechaza importe con coma decimal', () => {
    expect(validateRow({ ...validRow, importe: '150,50' }).invalid).toBe(true);
  });

  it('rechaza importe sin dos decimales', () => {
    expect(validateRow({ ...validRow, importe: '150.5' }).invalid).toBe(true);
  });

  it('rechaza medio_pago desconocido', () => {
    expect(validateRow({ ...validRow, medio_pago: 'crypto' }).invalid).toBe(true);
  });

  it('usa $ como moneda default si falta', () => {
    const result = validateRow(validRow);
    expect(result.venta?.moneda).toBe('$');
  });
});

describe('validateFormVenta', () => {
  it('valida formulario con importe numérico sin decimales visibles', () => {
    expect(
      validateFormVenta({
        id_venta: 'V-1278',
        fecha: '2026-06-28',
        cliente: 'New Client',
        producto: 'Arroz x10',
        cantidad: 200,
        moneda: '$',
        importe: 680000,
        medio_pago: 'transferencia',
      }),
    ).toBe(true);
  });

  it('rechaza formulario incompleto', () => {
    expect(
      validateFormVenta({
        id_venta: 'V-1278',
        fecha: '2026-06-28',
      }),
    ).toBe(false);
  });
});

describe('parseCsvText', () => {
  it('separa filas válidas e inválidas', () => {
    const csv = `id_venta,fecha,cliente,producto,cantidad,importe,medio_pago
V-2001,2026-05-02,Cliente A,Prod,1,10.00,efectivo
V-2002,2026-05-03,Cliente B,Prod,1,10.5,tarjeta
V-2003,2026-05-04,Cliente C,Prod,1,20.00,transferencia`;

    const result = parseCsvText(csv);
    expect(result.missingHeaders).toEqual([]);
    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(1);
    expect(result.valid.map((v) => v.id_venta)).toEqual(['V-2001', 'V-2003']);
  });

  it('reporta columnas faltantes', () => {
    const csv = `id_venta,fecha,cliente
V-2001,2026-05-02,Cliente A`;

    const result = parseCsvText(csv);
    expect(result.valid).toHaveLength(0);
    expect(result.missingHeaders.length).toBeGreaterThan(0);
    expect(result.missingHeaders).toContain('importe');
  });
});

describe('dedupeVentas', () => {
  it('deduplica filas idénticas', () => {
    const row = {
      id_venta: 'V-1001',
      fecha: '2026-05-02',
      cliente: 'A',
      producto: 'B',
      cantidad: 1,
      moneda: '$',
      importe: 10,
      medio_pago: 'efectivo' as const,
    };
    expect(dedupeVentas([row, row])).toHaveLength(1);
  });
});
