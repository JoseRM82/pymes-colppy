import { useEffect, useRef, useState } from 'react';
import type { Venta, MedioPago, ConsolidadoMensual } from '../types/venta';
import { ventasApi } from '../api/ventasApi';
import { addMonths, formatMonthYear, getCurrentMonth } from '../utils/dateUtils';
import { formatImporte, formatMonthTotal } from '../utils/formatters';
import { MEDIOS_PAGO } from '../types/venta';

interface Props {
  mesesConDatos: string[];
  consolidadoMensual: ConsolidadoMensual[];
  onClientClick: (cliente: string) => void;
  onMonthChange?: () => void;
}

export function MonthSalesTable({
  mesesConDatos,
  consolidadoMensual,
  onClientClick,
  onMonthChange,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const hasInitializedMonth = useRef(false);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Venta | null>(null);
  const [editOriginal, setEditOriginal] = useState<Venta | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (mesesConDatos.length === 0) {
      hasInitializedMonth.current = false;
      return;
    }
    if (!hasInitializedMonth.current) {
      setSelectedMonth(mesesConDatos[mesesConDatos.length - 1]);
      hasInitializedMonth.current = true;
    }
  }, [mesesConDatos]);

  useEffect(() => {
    setLoading(true);
    ventasApi
      .porMes(selectedMonth)
      .then(setVentas)
      .catch(() => setVentas([]))
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  const monthTotal =
    consolidadoMensual.find((c) => c.mes === selectedMonth)?.total ??
    ventas.reduce((sum, v) => sum + v.importe, 0);

  const prevMonth = addMonths(selectedMonth, -1);
  const nextMonth = addMonths(selectedMonth, 1);
  // Permitir navegar mes a mes aunque haya meses vacíos en el medio,
  // siempre que exista al menos un mes con datos antes/después.
  const canPrev = mesesConDatos.some((m) => m < selectedMonth);
  const canNext = mesesConDatos.some((m) => m > selectedMonth);

  const startEdit = (venta: Venta) => {
    setEditingId(venta.id_venta);
    setEditDraft({ ...venta });
    setEditOriginal({ ...venta });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setEditOriginal(null);
  };

  const submitEdit = async () => {
    if (!editDraft || !editOriginal) return;
    setSending(true);
    try {
      const payload: Partial<Venta> = {};
      if (editDraft.fecha !== editOriginal.fecha) payload.fecha = editDraft.fecha;
      if (editDraft.cliente !== editOriginal.cliente) payload.cliente = editDraft.cliente;
      if (editDraft.producto !== editOriginal.producto) payload.producto = editDraft.producto;
      if (editDraft.cantidad !== editOriginal.cantidad) payload.cantidad = editDraft.cantidad;
      if (editDraft.moneda !== editOriginal.moneda) payload.moneda = editDraft.moneda;
      if (editDraft.importe !== editOriginal.importe) payload.importe = editDraft.importe;
      if (editDraft.medio_pago !== editOriginal.medio_pago)
        payload.medio_pago = editDraft.medio_pago;

      const updated = await ventasApi.update(editDraft.id_venta, payload);
      setVentas((rows) =>
        rows.map((r) => (r.id_venta === updated.id_venta ? updated : r)),
      );
      cancelEdit();
      alert('Enviado con éxito');
      if (Object.keys(payload).length > 0) {
        onMonthChange?.();
      }
    } catch {
      if (editOriginal) {
        setVentas((rows) =>
          rows.map((r) => (r.id_venta === editOriginal.id_venta ? editOriginal : r)),
        );
      }
      cancelEdit();
      alert('Ocurrió un error, inténtelo nuevamente en un momento');
    } finally {
      setSending(false);
    }
  };

  const renderCell = (
    venta: Venta,
    field: keyof Venta,
    type: 'text' | 'number' | 'select' = 'text',
  ) => {
    if (editingId !== venta.id_venta || !editDraft) {
      if (field === 'importe') return formatImporte(venta.importe);
      return venta[field];
    }
    if (type === 'select') {
      return (
        <select
          className="inline-input"
          value={editDraft.medio_pago}
          onChange={(e) =>
            setEditDraft({ ...editDraft, medio_pago: e.target.value as MedioPago })
          }
        >
          {MEDIOS_PAGO.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        className="inline-input"
        type={type}
        value={String(editDraft[field])}
        onChange={(e) =>
          setEditDraft({
            ...editDraft,
            [field]:
              type === 'number'
                ? field === 'cantidad'
                  ? Number(e.target.value)
                  : Number(e.target.value)
                : e.target.value,
          })
        }
      />
    );
  };

  return (
    <div className="card">
      <div className="month-nav">
        <button type="button" disabled={!canPrev} onClick={() => setSelectedMonth(prevMonth)}>
          ←
        </button>
        <h2>
          {formatMonthYear(selectedMonth)} {formatMonthTotal(monthTotal)}
        </h2>
        <button type="button" disabled={!canNext} onClick={() => setSelectedMonth(nextMonth)}>
          →
        </button>
      </div>

      {loading ? (
        <div className="status-msg muted">Cargando datos...</div>
      ) : ventas.length === 0 ? (
        <div className="empty-state">No hay ventas en este mes.</div>
      ) : (
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
                <th />
              </tr>
            </thead>
            <tbody>
              {ventas.map((venta) => (
                <tr key={venta.id_venta}>
                  <td>{renderCell(venta, 'fecha')}</td>
                  <td>
                    {editingId === venta.id_venta ? (
                      renderCell(venta, 'cliente')
                    ) : (
                      <button
                        type="button"
                        className="link-cliente"
                        onClick={() => onClientClick(venta.cliente)}
                      >
                        {venta.cliente}
                      </button>
                    )}
                  </td>
                  <td>{renderCell(venta, 'producto')}</td>
                  <td>{renderCell(venta, 'cantidad', 'number')}</td>
                  <td>{renderCell(venta, 'moneda')}</td>
                  <td>
                    {editingId === venta.id_venta
                      ? renderCell(venta, 'importe', 'number')
                      : formatImporte(venta.importe)}
                  </td>
                  <td>{renderCell(venta, 'medio_pago', 'select')}</td>
                  <td>{venta.id_venta}</td>
                  <td>
                    {editingId === venta.id_venta ? (
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={sending}
                          onClick={cancelEdit}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={sending}
                          onClick={submitEdit}
                        >
                          {sending ? 'Enviando...' : 'Enviar'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => startEdit(venta)}
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
