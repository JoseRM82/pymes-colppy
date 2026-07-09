import { Venta } from '@prisma/client';

export interface VentaResponse {
  id_venta: string;
  fecha: string;
  cliente: string;
  producto: string;
  cantidad: number;
  moneda: string;
  importe: number;
  medio_pago: string;
}

export function mapVenta(venta: Venta): VentaResponse {
  return {
    id_venta: venta.idVenta,
    fecha: venta.fecha.toISOString().slice(0, 10),
    cliente: venta.cliente,
    producto: venta.producto,
    cantidad: venta.cantidad,
    moneda: venta.moneda,
    importe: Number(venta.importe),
    medio_pago: venta.medioPago,
  };
}

export function parseFecha(fecha: string): Date {
  return new Date(`${fecha}T12:00:00.000Z`);
}

export function monthRange(yyyyMm: string): { start: Date; end: Date } {
  const [year, month] = yyyyMm.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}
