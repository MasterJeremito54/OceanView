"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { format } from "date-fns";
import type { Reading } from "@/types/station";

interface ReadingChartProps {
  data: Reading[];
  dataKey: keyof Reading;
  label: string;
  unit: string;
  color: string;
}

export function ReadingChart({ data, dataKey, label, unit, color }: ReadingChartProps) {
  // null se preserva (no se filtra ni se interpola) para que el hueco en
  // el gráfico sea visible — es información real: "el sensor no reportó".
  // Se ordena y se convierte a epoch numérico: con un eje categórico (el
  // default de Recharts para XAxis) los puntos se espacian por índice, no
  // por tiempo real — con datos dispersos (ej. oleaje, que no viene en
  // cada lectura) eso desordena visualmente el eje.
  const chartData = data
    .map((r) => ({
      time: new Date(r.timestamp).getTime(),
      value: typeof r[dataKey] === "number" ? (r[dataKey] as number) : null,
    }))
    .sort((a, b) => a.time - b.time);

  const hasAnyData = chartData.some((d) => d.value !== null);
  const gradientId = `gradient-${String(dataKey)}`;

  return (
    <div className="rounded-lg border border-panel-border bg-panel p-4">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-ink-muted">
        {label}
      </p>

      {!hasAnyData ? (
        <div className="flex h-48 items-center justify-center text-sm text-ink-muted">
          Sin datos suficientes en este rango
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#24445E" vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              tickFormatter={(value: number) => format(new Date(value), "HH:mm")}
              tick={{ fill: "#6E8FA3", fontSize: 10 }}
              axisLine={{ stroke: "#24445E" }}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              tick={{ fill: "#6E8FA3", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={{
                background: "#16324A",
                border: "1px solid #24445E",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#6E8FA3" }}
              itemStyle={{ color: "#EAF2F5" }}
              labelFormatter={(value: number) => format(new Date(value), "dd/MM HH:mm")}
              formatter={(value: number) => [`${value}${unit}`, label]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              connectNulls={false}
              dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
