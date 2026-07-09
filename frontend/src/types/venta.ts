export type MedioPago = 'efectivo' | 'tarjeta' | 'transferencia';

export interface Venta {
  id_venta: string;
  fecha: string;
  cliente: string;
  producto: string;
  cantidad: number;
  moneda: string;
  importe: number;
  medio_pago: MedioPago;
}

export interface ConsolidadoMensual {
  mes: string;
  total: number;
}

export interface ConsolidadoAnual {
  anio: string;
  total: number;
}

export interface LoteResult {
  insertadas: number;
  rechazadas: (Venta & { motivo: string })[];
}

export const REQUIRED_CSV_COLUMNS = [
  'id_venta',
  'fecha',
  'cliente',
  'producto',
  'cantidad',
  'importe',
  'medio_pago',
] as const;

export const OPTIONAL_CSV_COLUMNS = ['moneda'] as const;

export const MEDIOS_PAGO: MedioPago[] = ['efectivo', 'tarjeta', 'transferencia'];
