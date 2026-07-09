import { useEffect, useState } from 'react';
import type { ConsolidadoAnual, ConsolidadoMensual, Venta } from '../types/venta';
import { ventasApi } from '../api/ventasApi';
import { MonthlyChart, type ChartMode } from './MonthlyChart';
import { Pagination } from './Pagination';
import { formatImporte, formatNumber } from '../utils/formatters';

interface Props {
  cliente: string;
  onClose: () => void;
}

function buildAnualFromMensual(mensual: ConsolidadoMensual[]): ConsolidadoAnual[] {
  const byYear = new Map<string, number>();
  for (const m of mensual) {
    if (!m.mes) continue;
    const anio = m.mes.slice(0, 4);
    byYear.set(anio, (byYear.get(anio) ?? 0) + m.total);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([anio, total]) => ({ anio, total }));
}

export function ClientModal({ cliente, onClose }: Props) {
  const [chartMode, setChartMode] = useState<ChartMode>('monthly');
  const [mensual, setMensual] = useState<ConsolidadoMensual[]>([]);
  const [anual, setAnual] = useState<ConsolidadoAnual[]>([]);
  const [total, setTotal] = useState(0);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      ventasApi.consolidadoCliente(cliente),
      ventasApi.totalCliente(cliente),
      ventasApi.ventasCliente(cliente, page),
    ])
      .then(([consolidado, totalRes, paginated]) => {
        const safeConsolidado = Array.isArray(consolidado) ? consolidado : [];
        setMensual(safeConsolidado);
        setAnual(buildAnualFromMensual(safeConsolidado));
        setTotal(totalRes.total);
        setVentas(paginated.data);
        setTotalPages(paginated.totalPages);
        setTotalItems(paginated.total);
      })
      .catch(() => {
        setError('No se pudieron cargar los datos del cliente.');
      })
      .finally(() => setLoading(false));
  }, [cliente, page]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2 style={{ color: 'var(--pyme-purple)', marginTop: 0 }}>{cliente}</h2>
        <p style={{ fontWeight: 600 }}>Total: ${formatNumber(total)}</p>

        {loading ? (
          <div className="status-msg muted">Cargando datos...</div>
        ) : error ? (
          <div className="status-msg error">{error}</div>
        ) : (
          <>
            <MonthlyChart
              mode={chartMode}
              onModeChange={setChartMode}
              mensual={mensual}
              anual={anual}
            />
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>fecha</th>
                    <th>cliente</th>
                    <th>producto</th>
                    <th>cantidad</th>
                    <th>moneda</th>
                    <th>importe</th>
                    <th>medio_pago</th>
                    <th>id_venta</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((v) => (
                    <tr key={v.id_venta}>
                      <td>{v.fecha}</td>
                      <td>{v.cliente}</td>
                      <td>{v.producto}</td>
                      <td>{v.cantidad}</td>
                      <td>{v.moneda}</td>
                      <td>{formatImporte(v.importe)}</td>
                      <td>{v.medio_pago}</td>
                      <td>{v.id_venta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
