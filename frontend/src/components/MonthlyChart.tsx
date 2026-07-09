import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ConsolidadoAnual, ConsolidadoMensual } from '../types/venta';
import { getCurrentMonth, buildMonthWindow } from '../utils/dateUtils';
import { buildYScale, shortMonthLabel } from '../utils/chartScale';
import {
  formatImporte,
  formatNumber,
  formatPercentChange,
} from '../utils/formatters';

export type ChartMode = 'monthly' | 'annual';

interface ChartPoint {
  key: string;
  label: string;
  total: number;
}

interface Props {
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
  mensual: ConsolidadoMensual[];
  anual: ConsolidadoAnual[];
}

function buildPoints(
  mode: ChartMode,
  mensual: ConsolidadoMensual[],
  anual: ConsolidadoAnual[],
): ChartPoint[] {
  if (mode === 'annual') {
    const map = new Map(anual.map((a) => [a.anio, a.total]));
    const years = [...map.keys()].sort();
    if (years.length === 0) return [];
    const min = Number(years[0]);
    const max = Number(years[years.length - 1]);
    const points: ChartPoint[] = [];
    for (let y = min; y <= max; y += 1) {
      const key = String(y);
      points.push({
        key,
        label: key,
        total: map.get(key) ?? 0,
      });
    }
    return points;
  }

  const endMonth = getCurrentMonth();
  const window = buildMonthWindow(endMonth, 12);
  const map = new Map(
    mensual.filter((m) => m.mes).map((m) => [m.mes, m.total]),
  );
  return window.map((mes) => ({
    key: mes,
    label: shortMonthLabel(mes, 'monthly'),
    total: map.get(mes) ?? 0,
  }));
}

function CustomTooltip({
  active,
  payload,
  points,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
  points: ChartPoint[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const idx = points.findIndex((p) => p.key === point.key);
  const prev = idx > 0 ? points[idx - 1].total : null;
  const pct =
    prev !== null ? formatPercentChange(point.total, prev) : null;

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--pyme-border)',
        padding: '0.75rem',
        borderRadius: 6,
      }}
    >
      <div style={{ fontWeight: 600 }}>{point.label}</div>
      <div>{formatImporte(point.total)}</div>
      {pct && (
        <div
          style={{
            color: pct.startsWith('+')
              ? 'var(--pyme-success)'
              : 'var(--pyme-error)',
          }}
        >
          {pct}
        </div>
      )}
    </div>
  );
}

export function MonthlyChart({ mode, onModeChange, mensual, anual }: Props) {
  const points = buildPoints(mode, mensual, anual);
  const { maxY, ticks } = buildYScale(points.map((p) => p.total));

  if (points.length === 0) {
    return (
      <div className="card">
        <div className="chart-toggle">
          <button
            type="button"
            className={mode === 'monthly' ? 'active' : ''}
            onClick={() => onModeChange('monthly')}
          >
            Mensual
          </button>
          <button
            type="button"
            className={mode === 'annual' ? 'active' : ''}
            onClick={() => onModeChange('annual')}
          >
            Anual
          </button>
        </div>
        <div className="empty-state">No hay datos para mostrar en el gráfico.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="chart-toggle">
        <button
          type="button"
          className={mode === 'monthly' ? 'active' : ''}
          onClick={() => onModeChange('monthly')}
        >
          Mensual
        </button>
        <button
          type="button"
          className={mode === 'annual' ? 'active' : ''}
          onClick={() => onModeChange('annual')}
        >
          Anual
        </button>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={points} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--pyme-border)" />
          <XAxis dataKey="label" tick={{ fill: 'var(--pyme-text-muted)', fontSize: 12 }} />
          <YAxis
            domain={[0, maxY]}
            ticks={ticks}
            tickFormatter={(v) => formatNumber(v)}
            tick={{ fill: 'var(--pyme-text-muted)', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip points={points} />} />
          <Line
            type="linear"
            dataKey="total"
            stroke="var(--pyme-purple)"
            strokeWidth={2}
            dot={{ fill: 'var(--pyme-purple)', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
