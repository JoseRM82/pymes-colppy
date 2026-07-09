import { describe, expect, it } from 'vitest';
import { dedupeVentas, validateFormVenta, validateRow } from '../../src/utils/csvParser';

describe('csvParser', () => {
  it('rechaza fecha futura', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const fecha = tomorrow.toISOString().slice(0, 10);
    const result = validateRow({
      id_venta: 'V-1001',
      fecha,
      cliente: 'A',
      producto: 'B',
      cantidad: '1',
      importe: '10.00',
      medio_pago: 'efectivo',
    });
    expect(result.invalid).toBe(true);
  });

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
    const result = dedupeVentas([row, row]);
    expect(result).toHaveLength(1);
  });

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
});
