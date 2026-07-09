const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message ?? 'Error en la solicitud'), {
      status: res.status,
      body,
    });
  }
  return res.json() as Promise<T>;
}

import type {
  ConsolidadoAnual,
  ConsolidadoMensual,
  LoteResult,
  Venta,
} from '../types/venta';

export const ventasApi = {
  createOne: (venta: Omit<Venta, never>) =>
    request<Venta>('/ventas', {
      method: 'POST',
      body: JSON.stringify(venta),
    }),

  createLote: (ventas: Venta[]) =>
    request<LoteResult>('/ventas/lote', {
      method: 'POST',
      body: JSON.stringify({ ventas }),
    }),

  update: (id: string, data: Partial<Venta>) =>
    request<Venta>(`/ventas/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  consolidadoMensual: () =>
    request<ConsolidadoMensual[]>('/ventas/consolidado/mensual'),

  consolidadoAnual: () =>
    request<ConsolidadoAnual[]>('/ventas/consolidado/anual'),

  mesesConDatos: () => request<string[]>('/ventas/meses/con-datos'),

  porMes: (yyyyMm: string) =>
    request<Venta[]>(`/ventas/por-mes/${yyyyMm}`),

  consolidadoCliente: (cliente: string) =>
    request<ConsolidadoMensual[]>(
      `/ventas/cliente/${encodeURIComponent(cliente)}/consolidado`,
    ),

  totalCliente: (cliente: string) =>
    request<{ total: number }>(
      `/ventas/cliente/${encodeURIComponent(cliente)}/total`,
    ),

  ventasCliente: (cliente: string, page: number, limit = 20) =>
    request<{
      data: Venta[];
      total: number;
      page: number;
      totalPages: number;
    }>(
      `/ventas/cliente/${encodeURIComponent(cliente)}?page=${page}&limit=${limit}`,
    ),
};
