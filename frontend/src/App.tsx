import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { MonthlyChart, type ChartMode } from './components/MonthlyChart';
import { MonthSalesTable } from './components/MonthSalesTable';
import { ClientModal } from './components/ClientModal';
import { UploadModal } from './components/UploadModal';
import { ventasApi } from './api/ventasApi';
import type { ConsolidadoAnual, ConsolidadoMensual } from './types/venta';

function App() {
  const [chartMode, setChartMode] = useState<ChartMode>('monthly');
  const [mensual, setMensual] = useState<ConsolidadoMensual[]>([]);
  const [anual, setAnual] = useState<ConsolidadoAnual[]>([]);
  const [mesesConDatos, setMesesConDatos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [blockModalClose, setBlockModalClose] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [m, a, meses] = await Promise.all([
        ventasApi.consolidadoMensual(),
        ventasApi.consolidadoAnual(),
        ventasApi.mesesConDatos(),
      ]);
      setMensual(m);
      setAnual(a);
      setMesesConDatos(meses);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const hasData = mesesConDatos.length > 0 || mensual.length > 0;

  return (
    <div className="app-container">
      <Header onUploadClick={() => setShowUpload(true)} />

      {loading && !hasData ? (
        <div className="status-msg muted">Cargando datos...</div>
      ) : !hasData ? (
        <div className="empty-state">
          No hay ventas cargadas. Usá &quot;Subir ventas&quot; para importar los CSV de
          ejemplo en la carpeta ventas/.
        </div>
      ) : (
        <>
          <MonthlyChart
            mode={chartMode}
            onModeChange={setChartMode}
            mensual={mensual}
            anual={anual}
          />
          <MonthSalesTable
            mesesConDatos={mesesConDatos}
            consolidadoMensual={mensual}
            onClientClick={setSelectedClient}
            onMonthChange={() => void refresh()}
          />
        </>
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => void refresh()}
          blockClose={blockModalClose}
          setBlockClose={setBlockModalClose}
        />
      )}

      {selectedClient && (
        <ClientModal
          cliente={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
}

export default App;
