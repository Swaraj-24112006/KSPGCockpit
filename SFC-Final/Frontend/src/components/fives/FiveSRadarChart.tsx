import React from 'react';

interface FiveSRadarChartProps {
  scores: {
    sort: number;       // 1 to 5
    setInOrder: number; // 1 to 5
    shine: number;      // 1 to 5
    standardize: number;// 1 to 5
    sustain: number;    // 1 to 5
  };
  benchmarkScore?: number; // default 4.0 (80%)
  size?: number;
  showLabels?: boolean;
  className?: string;
}

export default function FiveSRadarChart({
  scores,
  benchmarkScore = 4.0,
  size = 280,
  showLabels = true,
  className = ''
}: FiveSRadarChartProps) {
  const center = size / 2;
  const radius = size * 0.38;

  const pillars = [
    { name: '1S Sort', jName: 'Seiri', score: scores.sort, angle: -Math.PI / 2, color: '#ef4444' },
    { name: '2S Order', jName: 'Seiton', score: scores.setInOrder, angle: -Math.PI / 2 + (2 * Math.PI / 5), color: '#f59e0b' },
    { name: '3S Shine', jName: 'Seiso', score: scores.shine, angle: -Math.PI / 2 + (4 * Math.PI / 5), color: '#10b981' },
    { name: '4S Standardize', jName: 'Seiketsu', score: scores.standardize, angle: -Math.PI / 2 + (6 * Math.PI / 5), color: '#3b82f6' },
    { name: '5S Sustain', jName: 'Shitsuke', score: scores.sustain, angle: -Math.PI / 2 + (8 * Math.PI / 5), color: '#8b5cf6' }
  ];

  // Helper to get coordinates for a given pillar index and normalized value (0 to 5)
  const getPoint = (pillarIndex: number, val: number) => {
    const angle = pillars[pillarIndex].angle;
    const r = (Math.max(0, Math.min(5, val)) / 5) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  // Polygon points string for actual score
  const actualPoints = pillars
    .map((_, i) => {
      const pt = getPoint(i, pillars[i].score);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  // Polygon points string for benchmark target
  const benchmarkPoints = pillars
    .map((_, i) => {
      const pt = getPoint(i, benchmarkScore);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Background web concentric rings (Level 1 to 5) */}
        {[1, 2, 3, 4, 5].map((level) => {
          const ringPoints = pillars
            .map((_, i) => {
              const pt = getPoint(i, level);
              return `${pt.x},${pt.y}`;
            })
            .join(' ');

          return (
            <polygon
              key={level}
              points={ringPoints}
              fill={level === 5 ? '#f8fafc' : 'none'}
              stroke="#cbd5e1"
              strokeWidth={level === 4 || level === 5 ? '1.5' : '1'}
              strokeDasharray={level % 2 === 1 ? '2 2' : 'none'}
            />
          );
        })}

        {/* Axis Spokes from center to level 5 */}
        {pillars.map((p, i) => {
          const endPt = getPoint(i, 5);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={endPt.x}
              y2={endPt.y}
              stroke="#94a3b8"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
          );
        })}

        {/* Benchmark (Target 80% / 4.0) Polygon */}
        <polygon
          points={benchmarkPoints}
          fill="#3b82f6"
          fillOpacity="0.06"
          stroke="#3b82f6"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Actual Performance Polygon */}
        <polygon
          points={actualPoints}
          fill="url(#radarGradient)"
          fillOpacity="0.45"
          stroke="#2563eb"
          strokeWidth="2.5"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Corner Node Markers */}
        {pillars.map((p, i) => {
          const pt = getPoint(i, p.score);
          return (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                fill={p.color}
                stroke="#ffffff"
                strokeWidth="2"
                className="drop-shadow-sm transition-all duration-300"
              />
            </g>
          );
        })}

        {/* Labels at outer edges */}
        {showLabels &&
          pillars.map((p, i) => {
            const labelPt = getPoint(i, 5.85);
            const isLeft = labelPt.x < center - 10;
            const isRight = labelPt.x > center + 10;
            const textAnchor = isRight ? 'start' : isLeft ? 'end' : 'middle';

            return (
              <g key={`lbl-${i}`}>
                <text
                  x={labelPt.x}
                  y={labelPt.y - 4}
                  textAnchor={textAnchor}
                  className="font-bold text-[10px] fill-slate-800 tracking-tight font-sans"
                >
                  {p.name}
                </text>
                <text
                  x={labelPt.x}
                  y={labelPt.y + 7}
                  textAnchor={textAnchor}
                  className="font-mono text-[9px] font-semibold fill-slate-500"
                >
                  {p.jName} · <tspan className="font-black fill-blue-600">{p.score.toFixed(1)}/5</tspan>
                </text>
              </g>
            );
          })}
      </svg>

      {/* Legend Badge below chart */}
      <div className="flex items-center justify-center space-x-4 mt-2 text-[10px] font-medium font-mono">
        <span className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-600/70 border border-blue-700"></span>
          <span className="text-slate-700 font-bold">Actual Score</span>
        </span>
        <span className="flex items-center space-x-1.5">
          <span className="w-2.5 h-0.5 border-b-2 border-dashed border-blue-500"></span>
          <span className="text-slate-500">Target Standard (4.0/5)</span>
        </span>
      </div>
    </div>
  );
}
