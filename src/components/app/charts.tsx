'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Mesure du conteneur : le graphique reçoit une largeur explicite. Le
 * `ResponsiveContainer` de recharts restait vide dans certains navigateurs
 * (première mesure à zéro jamais réémise) ; ici la mesure est la nôtre.
 */
function useElementSize<T extends HTMLElement>(): [React.RefObject<T | null>, { width: number; height: number }] {
  const ref = React.useRef<T | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      setSize((current) =>
        Math.round(rect.width) === current.width && Math.round(rect.height) === current.height
          ? current
          : { width: Math.round(rect.width), height: Math.round(rect.height) },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, size];
}

function ChartFrame({ height, children }: { height: number; children: (size: { width: number; height: number }) => React.ReactNode }) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  return (
    <div ref={ref} className="w-full" style={{ height }}>
      {size.width > 0 ? children({ width: size.width, height }) : null}
    </div>
  );
}
import { centsToEuros, formatCents } from '@/lib/money';

const AXIS = { fontSize: 11, fill: '#98a2b3' };

function formatDay(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(date);
}

interface Point {
  date: string;
  sentCents: number;
  quotes: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string | number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[10px] border border-line bg-canvas px-3 py-2 shadow-md">
      <p className="text-[11.5px] font-medium text-subtle">{label ? formatDay(label) : ''}</p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="mt-1 text-[13px] font-medium text-ink tabular">
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
            style={{ background: entry.color }}
            aria-hidden
          />
          {entry.name} : {formatCents(Math.round((entry.value ?? 0) * 100))}
        </p>
      ))}
    </div>
  );
}

export function RevenueChart({ data }: { data: Point[] }) {
  const series = React.useMemo(
    () =>
      data.map((point) => ({
        date: point.date,
        devise: centsToEuros(point.sentCents),
      })),
    [data],
  );

  return (
    <ChartFrame height={240}>
      {(size) => (
        <AreaChart width={size.width} height={size.height} data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="devisia-quoted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2f52e8" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#2f52e8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e8ecf2" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            width={64}
            tickFormatter={(value: number) =>
              new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(value) + ' €'
            }
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#d4d9e1' }} />
          <Area
            type="monotone"
            dataKey="devise"
            name="Devisé"
            stroke="#2f52e8"
            strokeWidth={2}
            fill="url(#devisia-quoted)"
            dot={false}
          />
        </AreaChart>
      )}
    </ChartFrame>
  );
}

export function FunnelChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <ul className="space-y-3">
      {data.map((step, index) => {
        const previous = data[index - 1]?.value;
        // Le taux n'a de sens que s'il décrit une conversion : au-delà de 100 %
        // (période où l'on envoie plus de devis qu'il n'entre de prospects),
        // l'afficher induirait en erreur.
        const raw = previous && previous > 0 ? Math.round((step.value / previous) * 100) : null;
        const rate = raw != null && raw <= 100 ? raw : null;
        return (
          <li key={step.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] text-ink-soft">{step.label}</span>
              <span className="text-[13px] font-semibold text-ink tabular">
                {step.value}
                {rate != null ? <span className="ml-2 text-[11.5px] font-normal text-subtle">{rate} %</span> : null}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-700"
                style={{ width: `${Math.max(4, (step.value / max) * 100)}%`, opacity: 1 - index * 0.16 }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function QuotesBarChart({ data }: { data: Point[] }) {
  return (
    <ChartFrame height={180}>
      {(size) => (
        <BarChart width={size.width} height={size.height} data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#e8ecf2" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: '#f1f3f6' }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="rounded-[10px] border border-line bg-canvas px-3 py-2 shadow-md">
                  <p className="text-[11.5px] text-subtle">{label ? formatDay(String(label)) : ''}</p>
                  <p className="text-[13px] font-medium text-ink tabular">
                    {payload[0]?.value} devis envoyés
                  </p>
                </div>
              ) : null
            }
          />
          <Bar dataKey="quotes" fill="#2f52e8" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      )}
    </ChartFrame>
  );
}
