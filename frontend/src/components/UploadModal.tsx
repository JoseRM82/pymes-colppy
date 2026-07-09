import { useRef, useState } from 'react';
import type { Venta, MedioPago } from '../types/venta';
import { ventasApi } from '../api/ventasApi';
import { MEDIOS_PAGO } from '../types/venta';
import {
  CSV_MAX_BYTES,
  CSV_MAX_ROWS,
  parseCsvText,
  validateFormVenta,
} from '../utils/csvParser';
import {
  downloadDuplicatesCsv,
  downloadInvalidCsv,
  ventasToExportRows,
} from '../utils/csvExporter';
import { normalizeDecimalInput } from '../utils/formatters';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  blockClose: boolean;
  setBlockClose: (v: boolean) => void;
}

type PanelMessage = { text: string; tone: 'muted' | 'success' | 'error' };

const emptyForm: Partial<Venta> = {
  id_venta: '',
  fecha: '',
  cliente: '',
  producto: '',
  cantidad: undefined,
  moneda: '',
  importe: undefined,
  medio_pago: undefined,
};

function StatusBanner({ message }: { message: PanelMessage | null }) {
  if (!message?.text) return null;
  return <div className={`status-msg ${message.tone}`}>{message.text}</div>;
}

export function UploadModal({
  onClose,
  onSuccess,
  blockClose,
  setBlockClose,
}: Props) {
  const [form, setForm] = useState<Partial<Venta>>({ ...emptyForm });
  const [loading, setLoading] = useState(false);
  const [formMsg, setFormMsg] = useState<PanelMessage | null>(null);
  const [csvMsg, setCsvMsg] = useState<PanelMessage | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const formValid = validateFormVenta({
    id_venta: form.id_venta ?? '',
    fecha: form.fecha ?? '',
    cliente: form.cliente ?? '',
    producto: form.producto ?? '',
    cantidad: form.cantidad,
    moneda: form.moneda?.trim() || '$',
    importe: form.importe,
    medio_pago: form.medio_pago as MedioPago,
  });

  const handleClose = () => {
    if (blockClose) return;
    onClose();
  };

  const submitForm = async () => {
    if (!formValid || loading) return;
    setLoading(true);
    setBlockClose(true);
    setCsvMsg(null);
    setFormMsg({ text: 'Cargando datos...', tone: 'muted' });
    try {
      const payload: Venta = {
        id_venta: form.id_venta!,
        fecha: form.fecha!,
        cliente: form.cliente!,
        producto: form.producto!,
        cantidad: Number(form.cantidad),
        moneda: form.moneda?.trim() || '$',
        importe: Number(normalizeDecimalInput(String(form.importe))),
        medio_pago: form.medio_pago as MedioPago,
      };
      await ventasApi.createOne(payload);
      setFormMsg({ text: 'Cargado con éxito', tone: 'success' });
      setForm({ ...emptyForm });
      onSuccess();
    } catch (err: unknown) {
      const error = err as {
        status?: number;
        body?: { message?: { venta?: Venta; message?: string } | string; venta?: Venta };
      };
      const nested =
        typeof error.body?.message === 'object' ? error.body.message : error.body;
      if (error.status === 409 && nested && 'venta' in nested && nested.venta) {
        const v = nested.venta;
        alert(
          `El id de venta ya existe.\n${v.id_venta} — ${v.cliente} — ${v.producto} — ${v.importe}`,
        );
      } else {
        alert('Hubo un error, inténtelo de nuevo en un momento');
      }
      setFormMsg(null);
    } finally {
      setLoading(false);
      setBlockClose(false);
    }
  };

  const handleFileSelect = (file: File | undefined) => {
    if (!file || loading) return;
    setSelectedFile(file);
    setCsvMsg(null);
  };

  const submitCsv = async () => {
    if (!selectedFile || loading) return;
    await handleFile(selectedFile);
  };

  const handleFile = async (file: File) => {
    if (file.size > CSV_MAX_BYTES) {
      alert('El archivo supera el límite de 5 MB.');
      return;
    }
    setLoading(true);
    setBlockClose(true);
    setFormMsg(null);
    setCsvMsg({ text: 'Cargando datos...', tone: 'muted' });

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim()).length - 1;
      if (lines > CSV_MAX_ROWS) {
        alert(`El archivo supera el límite de ${CSV_MAX_ROWS} filas.`);
        setCsvMsg(null);
        return;
      }

      const parsed = parseCsvText(text);
      if (parsed.missingHeaders.length > 0) {
        alert(`Faltan columnas: ${parsed.missingHeaders.join(', ')}`);
        setCsvMsg(null);
        return;
      }

      let invalidRows = [...parsed.invalid];
      let insertadas = 0;

      if (parsed.valid.length > 0) {
        const result = await ventasApi.createLote(parsed.valid);
        insertadas = result.insertadas;
        const duplicados = result.rechazadas.filter((r) => r.motivo === 'id_duplicado');
        const invalidBack = result.rechazadas
          .filter((r) => r.motivo === 'validacion_fallida')
          .map(({ motivo: _m, ...v }) => v);
        if (invalidBack.length > 0) {
          invalidRows = [...invalidRows, ...ventasToExportRows(invalidBack)];
        }
        if (duplicados.length > 0) {
          alert(
            `${duplicados.length} fila(s) ya existían en la base de datos. Se descargó un CSV con esos registros.`,
          );
          downloadDuplicatesCsv(duplicados);
        }
      }

      if (invalidRows.length > 0) {
        alert(
          'Algunas filas contienen datos incompletos o incorrectos, se generará un CSV con ellas',
        );
        downloadInvalidCsv(invalidRows);
      }

      if (insertadas > 0) {
        setCsvMsg({
          text: `Cargado con éxito (${insertadas} venta(s) nueva(s))`,
          tone: 'success',
        });
        setSelectedFile(null);
        if (fileRef.current) fileRef.current.value = '';
        onSuccess();
      } else if (parsed.valid.length > 0) {
        setCsvMsg({
          text: 'No se importaron ventas nuevas (ya existían o fueron rechazadas).',
          tone: 'error',
        });
      } else if (invalidRows.length > 0) {
        setCsvMsg({ text: 'Ninguna fila válida para importar.', tone: 'error' });
      } else {
        setCsvMsg(null);
      }
    } catch {
      alert('Hubo un error, inténtelo de nuevo en un momento');
      setCsvMsg(null);
    } finally {
      setLoading(false);
      setBlockClose(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close"
          onClick={handleClose}
          disabled={blockClose}
        >
          ×
        </button>
        <h2 style={{ color: 'var(--pyme-purple)', marginTop: 0 }}>Subir ventas</h2>

        <div className="modal-grid">
          <div>
            <h3>Alta individual</h3>
            <div className="form-field">
              <label>id_venta</label>
              <input
                placeholder="V-0000"
                value={form.id_venta ?? ''}
                onChange={(e) => setForm({ ...form, id_venta: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="form-field">
              <label>fecha</label>
              <input
                placeholder="AAAA-MM-DD"
                value={form.fecha ?? ''}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="form-field">
              <label>cliente</label>
              <input
                placeholder="Nombre del cliente"
                value={form.cliente ?? ''}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="form-field">
              <label>producto</label>
              <input
                placeholder="Producto"
                value={form.producto ?? ''}
                onChange={(e) => setForm({ ...form, producto: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="form-field">
              <label>cantidad</label>
              <input
                placeholder="Cantidad (número)"
                type="number"
                value={form.cantidad ?? ''}
                onChange={(e) =>
                  setForm({ ...form, cantidad: Number(e.target.value) })
                }
                disabled={loading}
              />
            </div>
            <div className="form-field">
              <label>moneda (opcional)</label>
              <input
                placeholder="$"
                value={form.moneda ?? ''}
                onChange={(e) => setForm({ ...form, moneda: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="form-field">
              <label>importe</label>
              <input
                placeholder="Importe (número con dos decimales)"
                value={form.importe ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    importe: e.target.value as unknown as number,
                  })
                }
                disabled={loading}
              />
            </div>
            <div className="form-field">
              <label>medio_pago</label>
              <select
                value={form.medio_pago ?? ''}
                onChange={(e) =>
                  setForm({ ...form, medio_pago: e.target.value as MedioPago })
                }
                disabled={loading}
              >
                <option value="">Seleccionar...</option>
                {MEDIOS_PAGO.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={!formValid || loading}
              onClick={submitForm}
            >
              Enviar
            </button>
            <StatusBanner message={formMsg} />
          </div>

          <div>
            <h3>Carga masiva CSV</h3>
            <ul className="upload-hints">
              <li>Máximo 5 MB y 10.000 filas</li>
              <li>La fecha no puede ser posterior a hoy</li>
              <li>Decimales con punto (.)</li>
              <li>Columna moneda opcional (default $)</li>
            </ul>
            <div className="upload-zone">
              <input
                ref={fileRef}
                id="csv-upload-input"
                type="file"
                accept=".csv"
                disabled={loading}
                className="upload-file-input"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />
              <label htmlFor="csv-upload-input" className="btn-secondary upload-file-label">
                {selectedFile ? 'Elegir otro archivo' : 'Elegir archivo'}
              </label>
              {selectedFile && (
                <p className="selected-file-name">{selectedFile.name}</p>
              )}
              {selectedFile && (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={loading}
                  onClick={() => void submitCsv()}
                >
                  Subir
                </button>
              )}
            </div>
            <StatusBanner message={csvMsg} />
          </div>
        </div>
      </div>
    </div>
  );
}
