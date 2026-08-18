'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { centsToEuros, formatCents } from '@/lib/money';

const AXIS = { fontSize: 11, fill: '#8a93a1' };

function formatDay(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(date);
}

interface Point {
  date: string;
  wonCents: number;
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
        gagne: centsToEuros(point.wonCents),
        envoye: centsToEuros(point.sentCents),
      })),
    [data],
  );

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="devisia-won" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2547e0" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#2547e0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e6e9ee" strokeDasharray="3 3" vertical={false} />
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
            dataKey="envoye"
            name="Envoyé"
            stroke="#c9d3fb"
            strokeWidth={1.5}
            fill="none"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="gagne"
            name="Gagné"
            stroke="#2547e0"
            strokeWidth={2}
            fill="url(#devisia-won)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
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
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#e6e9ee" strokeDasharray="3 3" vertical={false} />
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
          <Bar dataKey="quotes" fill="#2547e0" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
