import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface SpecLimitTrendGraphProps {
  usl: number;
  lsl: number;
  measurements: number[];
  height?: number;
}

/**
 * SpecLimitTrendGraph — renders a process-quality specification-limit trend chart.
 *
 * - X-axis: measurement sequence index (1, 2, 3, …, n), equally spaced
 * - Y-axis: dynamic scale covering USL, LSL, and all measurement values
 * - USL/LSL/Center horizontal reference lines
 * - Measurement trend line with markers and value labels
 * - Out-of-spec points highlighted in red
 */
export default function SpecLimitTrendGraph({
  usl,
  lsl,
  measurements,
  height = 280,
}: SpecLimitTrendGraphProps) {
  const centerLine = (usl + lsl) / 2;

  // Build chart data: x = sequence index, y = measurement value
  const chartData = useMemo(() => {
    return measurements.map((val, idx) => ({
      index: idx + 1,
      value: val,
      outOfSpec: val > usl || val < lsl,
    }));
  }, [measurements, usl, lsl]);

  // Dynamic Y-axis domain with 10% padding
  const { yMin, yMax } = useMemo(() => {
    const allValues = [usl, lsl, ...measurements];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min || 1;
    return {
      yMin: Math.floor((min - range * 0.1) * 100) / 100,
      yMax: Math.ceil((max + range * 0.1) * 100) / 100,
    };
  }, [usl, lsl, measurements]);

  // Custom dot renderer: red for out-of-spec, teal for in-spec
  const renderDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    const isOOS = payload?.outOfSpec;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={isOOS ? '#ef4444' : '#0d9488'}
        stroke="#ffffff"
        strokeWidth={2}
      />
    );
  };

  // Custom label renderer: show numeric value above each dot
  const renderLabel = (props: any) => {
    const { x, y, value, index: _i } = props;
    if (x == null || y == null || value == null) return null;
    const entry = chartData[_i];
    const isOOS = entry?.outOfSpec;
    return (
      <text
        x={x}
        y={y - 12}
        fill={isOOS ? '#ef4444' : '#0f172a'}
        fontSize={10}
        fontWeight={700}
        fontFamily="monospace"
        textAnchor="middle"
      >
        {value}
      </text>
    );
  };

  if (measurements.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 text-xs text-slate-400 font-mono"
        style={{ height }}
      >
        Enter measurements to generate the Spec-Limit Trend Graph
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 24, right: 30, left: 10, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

          <XAxis
            dataKey="index"
            stroke="#64748b"
            fontSize={11}
            fontWeight={600}
            tickLine={false}
            label={{
              value: 'Measurement #',
              position: 'insideBottomRight',
              offset: -4,
              fontSize: 10,
              fill: '#94a3b8',
            }}
          />

          <YAxis
            domain={[yMin, yMax]}
            stroke="#64748b"
            fontSize={11}
            fontWeight={600}
            tickLine={false}
            label={{
              value: 'Value',
              angle: -90,
              position: 'insideLeft',
              offset: 4,
              fontSize: 10,
              fill: '#94a3b8',
            }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
            formatter={(val: any) => [`${val}`, 'Measurement']}
            labelFormatter={(label: any) => `Point #${label}`}
          />

          <Legend
            verticalAlign="top"
            height={28}
            wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700 }}
          />

          {/* USL Reference Line */}
          <ReferenceLine
            y={usl}
            stroke="#ef4444"
            strokeDasharray="8 4"
            strokeWidth={2}
            label={{
              value: `USL = ${usl}`,
              position: 'right',
              fill: '#ef4444',
              fontSize: 11,
              fontWeight: 700,
            }}
          />

          {/* LSL Reference Line */}
          <ReferenceLine
            y={lsl}
            stroke="#3b82f6"
            strokeDasharray="8 4"
            strokeWidth={2}
            label={{
              value: `LSL = ${lsl}`,
              position: 'right',
              fill: '#3b82f6',
              fontSize: 11,
              fontWeight: 700,
            }}
          />

          {/* Center Line */}
          <ReferenceLine
            y={centerLine}
            stroke="#22c55e"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: `CL = ${centerLine}`,
              position: 'right',
              fill: '#22c55e',
              fontSize: 10,
              fontWeight: 600,
            }}
          />

          {/* Measurement Trend Line */}
          <Line
            type="linear"
            dataKey="value"
            name="Measurement"
            stroke="#0d9488"
            strokeWidth={2.5}
            dot={renderDot}
            activeDot={{ r: 8, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }}
            label={renderLabel}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
