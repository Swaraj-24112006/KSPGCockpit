import React, { useState, useMemo } from 'react';
import { Kaizen } from '../types';
import EmployeeKaizenChart from './EmployeeKaizenChart';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Building2,
  Layers,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { formatIndianRupees } from '../utils';
import { useExecutiveAnalytics } from './hooks/useAnalytics';
import {
  niceMax,
  donutArcs,
  buildLinePath,
  generateAxisTicks,
  Point2D,
} from '../components/charts/chartPrimitives';
import {
  AnalyticsSkeleton,
  AnalyticsError,
  AnalyticsEmpty,
  LastUpdatedBadge,
} from '../components/charts/AnalyticsStates';

interface ExecutiveAnalyticsBoardProps {
  kaizens?: Kaizen[];
  onSelectKaizen?: (k: Kaizen) => void;
}

export default function ExecutiveAnalyticsBoard({ kaizens = [], onSelectKaizen }: ExecutiveAnalyticsBoardProps) {
  // Slicer States
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number | string>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'Idea' | 'Kaizen'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'Closed' | 'Open' | 'Reject'>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  // Query live executive analytics from PostgreSQL
  const { data, isLoading, isFetching, error, refetch } = useExecutiveAnalytics({
    year: selectedYear,
    month: selectedMonth,
    type: selectedType,
    status: selectedStatus,
    dept: selectedDept,
  });

  const total = data?.total ?? 0;
  const yoy = data?.yoy || [];
  const typeSplit = data?.typeSplit || [];
  const statusSummary = data?.statusSummary || [];
  const monthTrend = data?.monthTrend || [];
  const deptVolume = data?.deptVolume || [];
  const deptSavings = data?.deptSavings || [];
  const options = data?.options || { years: [currentYear], departments: [] };

  // ── 1. Section 1 YoY Chart Geometry (SVG 500 x 240) ────────────────────────
  const { yoyCountMax, yoyBarTopPoints, yoyPerEmpPoints, yoyPerEmpMax } = useMemo(() => {
    if (yoy.length === 0) {
      return { yoyCountMax: 100, yoyBarTopPoints: [], yoyPerEmpPoints: [], yoyPerEmpMax: 2 };
    }
    const maxCount = Math.max(...yoy.map(d => d.kaizens), 1);
    const countMax = niceMax(maxCount);

    const maxEmpRate = Math.max(...yoy.map(d => d.perEmployee || 0), 1);
    const empMax = Math.max(niceMax(maxEmpRate), 2);

    const countPts: Point2D[] = [];
    const empPts: Point2D[] = [];

    const len = yoy.length;
    const chartW = 440;
    const startX = 40;
    const barW = Math.min(54, Math.floor(chartW / len) - 16);

    yoy.forEach((d, i) => {
      const xCenter = startX + (i + 0.5) * (chartW / len);
      const barH = (d.kaizens / countMax) * 150;
      const yTop = 200 - barH;
      countPts.push({ x: xCenter, y: yTop });

      const empY = 200 - ((d.perEmployee || 0) / empMax) * 150;
      empPts.push({ x: xCenter, y: Math.max(30, empY) });
    });

    return {
      yoyCountMax: countMax,
      yoyBarTopPoints: countPts,
      yoyPerEmpPoints: empPts,
      yoyPerEmpMax: empMax,
    };
  }, [yoy]);

  // ── 2. Section 2 Financial Savings YoY Chart Geometry (SVG 600 x 280) ──────
  const { maxSavingsVal, savingsAxisTicks, savingsTopPoints } = useMemo(() => {
    if (yoy.length === 0) {
      return { maxSavingsVal: 100000, savingsAxisTicks: [100000, 50000, 0], savingsTopPoints: [] };
    }
    const maxRaw = Math.max(...yoy.map(d => d.savings), 10000);
    const maxVal = niceMax(maxRaw);
    const ticks = generateAxisTicks(maxVal, 4);

    const pts: Point2D[] = [];
    const len = yoy.length;
    const startX = 110;
    const usableW = 440;

    yoy.forEach((d, i) => {
      const x = len > 1 ? startX + (i / (len - 1)) * usableW : startX + usableW / 2;
      const barH = (d.savings / maxVal) * 200;
      const y = 240 - barH;
      pts.push({ x, y });
    });

    return {
      maxSavingsVal: maxVal,
      savingsAxisTicks: ticks,
      savingsTopPoints: pts,
    };
  }, [yoy]);

  // ── 3. Section 3 Donut Arcs Calculations ──────────────────────────────────
  // Type Donut (Kaizen vs Idea)
  const typeDonutArcs = useMemo(() => {
    const kaizenCount = typeSplit.find(t => t.key.toLowerCase() === 'kaizen')?.count || 0;
    const ideaCount = typeSplit.find(t => t.key.toLowerCase() === 'idea')?.count || 0;
    return donutArcs([kaizenCount, ideaCount]);
  }, [typeSplit]);

  // Dept Volume Donut
  const deptVolumeArcs = useMemo(() => {
    return donutArcs(deptVolume.map(d => d.count));
  }, [deptVolume]);

  // Dept Savings Donut
  const deptSavingsArcs = useMemo(() => {
    return donutArcs(deptSavings.map(d => d.savings));
  }, [deptSavings]);

  // Status Summary Bars Geometry
  const { statusMax, statusBars } = useMemo(() => {
    const maxVal = niceMax(Math.max(...statusSummary.map(s => s.count), 1));
    const bars = statusSummary.map(s => {
      const h = Math.max(4, (s.count / maxVal) * 110);
      const y = 130 - h;
      return { ...s, height: h, y };
    });
    return { statusMax: maxVal, statusBars: bars };
  }, [statusSummary]);

  // Month on Month Trend Geometry (SVG 450 x 160)
  const { monthPoints, maxMonthVal, monthLinePath } = useMemo(() => {
    if (monthTrend.length === 0) {
      return { monthPoints: [], maxMonthVal: 10, monthLinePath: '' };
    }
    const maxRaw = Math.max(...monthTrend.map(d => d.count), 1);
    const maxVal = niceMax(maxRaw);

    const len = monthTrend.length;
    const startX = 30;
    const endX = 420;
    const usableW = endX - startX;

    const pts: Point2D[] = monthTrend.map((d, i) => {
      const x = len > 1 ? startX + (i / (len - 1)) * usableW : startX + usableW / 2;
      const h = (d.count / maxVal) * 105;
      const y = 125 - h;
      return { x, y };
    });

    return {
      monthPoints: pts,
      maxMonthVal: maxVal,
      monthLinePath: buildLinePath(pts),
    };
  }, [monthTrend]);

  return (
    <div className="space-y-8 font-sans">
      
      {/* SECTION 1: YoY IMPLEMENTED KAIZENS & PER EMPLOYEE */}
      <div className="bg-gradient-to-b from-[#031d38] via-[#08284d] to-[#04162a] border border-sky-900/60 rounded-3xl p-6 md:p-8 shadow-2xl text-white space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-800/50 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-500/20 rounded-2xl border border-sky-400/30 text-sky-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-black uppercase text-sky-400 tracking-wider block">
                EXECUTIVE YoY GROWTH
              </span>
              <h2 className="text-xl font-black font-display text-white">
                Year-over-Year Kaizen Implementation & Participation
              </h2>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <LastUpdatedBadge generatedAt={data?.generatedAt} isFetching={isFetching} darkMode={true} />
            <span className="text-xs font-mono font-bold bg-sky-950 text-sky-300 px-3 py-1 rounded-xl border border-sky-700/60">
              {yoy.length > 0 ? `${yoy[0].year} – ${yoy[yoy.length - 1].year} Verified Data` : 'Live Stream'}
            </span>
          </div>
        </div>

        {error && !data && (
          <AnalyticsError message={error.message} onRetry={() => refetch()} darkMode={true} />
        )}

        {isLoading && !data ? (
          <AnalyticsSkeleton height="h-64" darkMode={true} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
            
            {/* Left Chart: No. of Kaizens - Implemented YoY */}
            <div className="bg-[#052345]/80 p-5 rounded-2xl border border-sky-800/40 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-center font-bold text-sm tracking-wide text-white uppercase font-sans">
                  No. of Kaizens - Implemented YoY
                </h3>
                <span className="text-[10px] font-mono text-sky-400">Scale: 0–{yoyCountMax}</span>
              </div>

              {/* Dynamic SVG Bar + Trend Line */}
              <div className="relative w-full h-64">
                <svg viewBox="0 0 500 240" className="w-full h-full">
                  {/* Grid base line */}
                  <line x1="20" y1="200" x2="480" y2="200" stroke="#0e3d6f" strokeWidth="1.5" />

                  {/* Dynamic Bars */}
                  {yoy.map((d, i) => {
                    const len = yoy.length;
                    const chartW = 440;
                    const barW = Math.min(54, Math.floor(chartW / len) - 16);
                    const pt = yoyBarTopPoints[i];
                    if (!pt) return null;
                    const x = pt.x - barW / 2;
                    const barH = 200 - pt.y;

                    return (
                      <g key={d.year}>
                        {/* Bar */}
                        <rect
                          x={x}
                          y={pt.y}
                          width={barW}
                          height={Math.max(barH, 3)}
                          fill={d.isYtd ? '#38bdf8' : '#0284c7'}
                          rx="3"
                          className="transition-all hover:brightness-125"
                        />
                        {/* Count label */}
                        <text
                          x={pt.x}
                          y={Math.max(pt.y - 6, 20)}
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="900"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {d.kaizens}
                        </text>
                        {/* Year Label */}
                        <text
                          x={pt.x}
                          y="222"
                          fill="#cbd5e1"
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                          textAnchor="middle"
                        >
                          {d.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Dynamic Yellow Trend Line connecting bar tops */}
                  {yoyBarTopPoints.length > 1 && (
                    <path
                      d={buildLinePath(yoyBarTopPoints)}
                      fill="none"
                      stroke="#eab308"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </div>
            </div>

            {/* Right Chart: NO. OF KAIZENS PER EMPLOYEE */}
            <div className="bg-[#052345]/80 p-5 rounded-2xl border border-sky-800/40 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-center font-bold text-sm tracking-wide text-white uppercase font-sans">
                  NO. OF KAIZENS PER EMPLOYEE
                </h3>
                <span className="text-[10px] font-mono text-emerald-400">Ratio (Max {yoyPerEmpMax})</span>
              </div>

              {/* Dynamic SVG Line Chart */}
              <div className="relative w-full h-64">
                <svg viewBox="0 0 500 240" className="w-full h-full">
                  {/* Grid base line */}
                  <line x1="20" y1="200" x2="480" y2="200" stroke="#0e3d6f" strokeWidth="1.5" />

                  {/* Dynamic Green Line */}
                  {yoyPerEmpPoints.length > 1 && (
                    <path
                      d={buildLinePath(yoyPerEmpPoints)}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Data point boxes */}
                  {yoy.map((d, i) => {
                    const pt = yoyPerEmpPoints[i];
                    if (!pt) return null;

                    return (
                      <g key={d.year}>
                        {/* Box Background */}
                        <rect
                          x={pt.x - 24}
                          y={pt.y - 14}
                          width="48"
                          height="24"
                          fill="#031a33"
                          stroke="#0369a1"
                          strokeWidth="1.5"
                          rx="4"
                        />
                        {/* Text value */}
                        <text
                          x={pt.x}
                          y={pt.y + 2}
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="900"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {d.perEmployee !== null ? d.perEmployee : '—'}
                        </text>
                        {/* Year label */}
                        <text
                          x={pt.x}
                          y="222"
                          fill="#cbd5e1"
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                          textAnchor="middle"
                        >
                          {d.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* SECTION 2: FINANCIAL & CULTURAL IMPACT - COST SAVED YoY */}
      <div className="bg-[#03182e] border border-lime-900/60 rounded-3xl p-6 md:p-8 shadow-2xl text-white space-y-6">
        <div className="border-b border-lime-800/40 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black font-display text-white">Financial & Cultural Impact</h2>
            <p className="text-xs text-lime-400 font-mono mt-0.5">Validated annual cost savings and cost avoidance trajectory</p>
          </div>
          <span className="px-3 py-1 bg-lime-950 text-lime-300 font-mono font-bold text-xs rounded-xl border border-lime-700">
            INR (₹) Total Savings (Closed Only)
          </span>
        </div>

        <div className="border border-lime-800/50 rounded-2xl p-6 bg-[#04203e]/90 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-center font-extrabold text-base tracking-wider text-white font-sans uppercase">
              YoY: Cost Saved/Avoided (INR)
            </h3>
            <span className="text-[10px] font-mono text-lime-300">Scale: 0–{formatIndianRupees(maxSavingsVal)}</span>
          </div>

          <div className="relative w-full h-72">
            <svg viewBox="0 0 600 280" className="w-full h-full">
              {/* Dynamic Y Axis Grid Lines */}
              {savingsAxisTicks.map((val) => {
                const yPos = 240 - (val / maxSavingsVal) * 200;
                return (
                  <g key={val}>
                    <line x1="80" y1={yPos} x2="560" y2={yPos} stroke="#0f3763" strokeDasharray="3 3" />
                    <text x="70" y={yPos + 4} fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">
                      {val}
                    </text>
                  </g>
                );
              })}

              <line x1="80" y1="240" x2="560" y2="240" stroke="#475569" strokeWidth="1.5" />

              {/* Dynamic Glowing Lime Bars */}
              {yoy.map((d, i) => {
                const pt = savingsTopPoints[i];
                if (!pt) return null;
                const barW = Math.min(58, Math.floor(440 / yoy.length) - 16);
                const x = pt.x - barW / 2;
                const barH = 240 - pt.y;

                return (
                  <g key={d.year}>
                    <rect
                      x={x}
                      y={pt.y}
                      width={barW}
                      height={Math.max(barH, 3)}
                      fill="#a3e635"
                      rx="3"
                      className="transition-all hover:brightness-125"
                    />
                    {d.savings > 0 && (
                      <text
                        x={pt.x}
                        y={Math.max(pt.y - 8, 20)}
                        fill="#fef08a"
                        fontSize="10"
                        fontWeight="900"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        ₹{Math.round(d.savings).toLocaleString('en-IN')}
                      </text>
                    )}
                    <text
                      x={pt.x}
                      y="262"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}

              {/* Dynamic Yellow Dashed Trend Line */}
              {savingsTopPoints.length > 1 && (
                <path
                  d={buildLinePath(savingsTopPoints)}
                  fill="none"
                  stroke="#facc15"
                  strokeWidth="2.5"
                  strokeDasharray="5 4"
                />
              )}
            </svg>
          </div>
        </div>

      </div>

      {/* SECTION 3: IDEA / KAIZEN MANAGEMENT DASHBOARD */}
      <div className="bg-[#031d38] border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl text-white space-y-6">
        
        {/* HEADER BAR & SLICERS / FILTERS */}
        <div className="space-y-4 border-b border-slate-700/60 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-black uppercase text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30">
                EXECUTIVE ANALYTICS BOARD
              </span>
              <h2 className="text-xl font-black font-display text-white">IDEA / KAIZEN MANAGEMENT - DASHBOARD</h2>
            </div>
            <div className="flex items-center space-x-2">
              <LastUpdatedBadge generatedAt={data?.generatedAt} isFetching={isFetching} darkMode={true} />
              <button
                type="button"
                onClick={() => refetch()}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* SLICER CONTROLS BAR */}
          <div className="bg-[#08294d] border border-slate-700/80 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs font-mono">
            
            {/* Year Slicer */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-sky-400" />
                <span>Year Slicer</span>
              </span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-[#031a33] text-white border border-slate-600 rounded-lg p-2 font-bold focus:outline-none cursor-pointer"
              >
                {options.years.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            {/* Timeline Slicer */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-sky-400" />
                <span>Month Timeline</span>
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-[#031a33] text-white border border-slate-600 rounded-lg p-2 font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Months ({selectedYear})</option>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>

            {/* Type Slicer */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center space-x-1">
                <Layers className="w-3 h-3 text-amber-400" />
                <span>Type Slicer</span>
              </span>
              <div className="flex rounded-lg overflow-hidden border border-slate-600 bg-[#031a33]">
                {['ALL', 'Idea', 'Kaizen'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedType(t as any)}
                    className={`flex-1 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                      selectedType === t ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Slicer */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center space-x-1">
                <Filter className="w-3 h-3 text-emerald-400" />
                <span>Status Slicer</span>
              </span>
              <div className="flex rounded-lg overflow-hidden border border-slate-600 bg-[#031a33]">
                {['ALL', 'Closed', 'Open', 'Reject'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedStatus(s as any)}
                    className={`flex-1 py-1.5 text-[10px] font-bold transition cursor-pointer ${
                      selectedStatus === s ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Minifactory Slicer */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center space-x-1">
                <Building2 className="w-3 h-3 text-indigo-400" />
                <span>Minifactory / Dept</span>
              </span>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full bg-[#031a33] text-white border border-slate-600 rounded-lg p-2 font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {options.departments.map(d => (
                  <option key={d.code} value={d.code}>{d.name}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* ROW 1 CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Chart 1: TYPE - IDEA OR KAIZEN */}
          <div className="lg:col-span-4 bg-[#08294d] border border-slate-700 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-extrabold text-white uppercase font-mono border-b border-slate-700 pb-2">
              TYPE - IDEA OR KAIZEN
            </h3>

            {/* Dynamic Donut */}
            <div className="flex flex-col items-center justify-center space-y-4 pt-2">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Kaizen Arc (Sky) */}
                  {typeDonutArcs[0] && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="20"
                      strokeDasharray={`${typeDonutArcs[0].len} ${typeDonutArcs[0].gap}`}
                      strokeDashoffset={typeDonutArcs[0].offset}
                    />
                  )}
                  {/* Idea Arc (Orange) */}
                  {typeDonutArcs[1] && (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="20"
                      strokeDasharray={`${typeDonutArcs[1].len} ${typeDonutArcs[1].gap}`}
                      strokeDashoffset={typeDonutArcs[1].offset}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black font-mono text-white">{total} Total</span>
                  <span className="text-[10px] text-slate-300 font-mono">100% Submissions</span>
                </div>
              </div>

              <div className="flex items-center space-x-6 text-xs font-mono">
                {typeSplit.map((t, idx) => (
                  <div key={t.key} className="flex items-center space-x-2">
                    <div className={`w-3.5 h-3.5 rounded-sm ${idx === 0 ? 'bg-sky-400' : 'bg-orange-500'}`} />
                    <span className="font-bold text-slate-200">
                      {t.key}: {t.count} ({t.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 2: STATUS SUMMARY */}
          <div className="lg:col-span-3 bg-[#08294d] border border-slate-700 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-extrabold text-white uppercase font-mono border-b border-slate-700 pb-2">
              STATUS SUMMARY
            </h3>

            <div className="relative w-full h-48 flex items-end justify-around pt-4">
              <svg viewBox="0 0 200 160" className="w-full h-full">
                {statusBars.map((b, idx) => {
                  const x = 20 + idx * 62;
                  const color = b.key === 'Closed' ? '#f97316' : b.key === 'Open' ? '#38bdf8' : '#64748b';
                  return (
                    <g key={b.key}>
                      <rect x={x} y={b.y} width="36" height={b.height} fill={color} rx="3" />
                      <text x={x + 18} y={Math.max(b.y - 5, 12)} fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                        {b.count}
                      </text>
                      <text x={x + 18} y="148" fill="#e2e8f0" fontSize="9" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
                        {b.key.toUpperCase()}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Chart 3: Month on Month Trend */}
          <div className="lg:col-span-5 bg-[#08294d] border border-slate-700 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-extrabold text-white uppercase font-mono border-b border-slate-700 pb-2">
              Month on Month Submission Volume ({selectedYear})
            </h3>

            <div className="relative w-full h-48">
              <svg viewBox="0 0 450 160" className="w-full h-full">
                {/* Dynamic Trend Line */}
                {monthPoints.length > 1 && (
                  <path
                    d={monthLinePath}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                  />
                )}

                {/* Dots with numeric badges */}
                {monthTrend.map((d, i) => {
                  const pt = monthPoints[i];
                  if (!pt) return null;

                  return (
                    <g key={d.month}>
                      <circle cx={pt.x} cy={pt.y} r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                      {d.count > 0 && (
                        <text x={pt.x} y={pt.y - 7} fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                          {d.count}
                        </text>
                      )}
                      <text x={pt.x} y="150" fill="#94a3b8" fontSize="8" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
                        {d.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

        </div>

        {/* ROW 2 CHARTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          
          {/* Donut 1: Minifactory/Dept-wise Kaizen Count */}
          <div className="bg-[#08294d] border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-extrabold text-white uppercase font-mono border-b border-slate-700 pb-2">
              Minifactory / Dept-wise Volume Breakdown
            </h3>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-40 h-40 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {deptVolume.map((d, idx) => {
                    const arc = deptVolumeArcs[idx];
                    if (!arc || arc.len === 0) return null;
                    return (
                      <circle
                        key={d.code}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="none"
                        stroke={d.color}
                        strokeWidth="18"
                        strokeDasharray={`${arc.len} ${arc.gap}`}
                        strokeDashoffset={arc.offset}
                      />
                    );
                  })}
                  <text x="50" y="52" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="monospace" textAnchor="middle" className="rotate-90 origin-center">
                    Units
                  </text>
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono flex-1">
                {deptVolume.map(d => (
                  <div key={d.code} className="flex items-center space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-200 font-bold truncate">
                      {d.name}: {d.count} ({Math.round(d.pct)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Donut 2: Cost Saving/Avoidance in INR */}
          <div className="bg-[#08294d] border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-extrabold text-white uppercase font-mono border-b border-slate-700 pb-2">
              Cost Saving / Avoidance Share in INR
            </h3>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-40 h-40 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {deptSavings.map((d, idx) => {
                    const arc = deptSavingsArcs[idx];
                    if (!arc || arc.len === 0) return null;
                    return (
                      <circle
                        key={d.code}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="none"
                        stroke={d.color}
                        strokeWidth="18"
                        strokeDasharray={`${arc.len} ${arc.gap}`}
                        strokeDashoffset={arc.offset}
                      />
                    );
                  })}
                  <text x="50" y="52" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="monospace" textAnchor="middle" className="rotate-90 origin-center">
                    ₹ Share
                  </text>
                </svg>
              </div>

              <div className="space-y-1.5 text-[11px] font-mono flex-1">
                {deptSavings.slice(0, 4).map(d => (
                  <div key={d.code} className="flex items-center justify-between text-slate-200 font-bold border-b border-slate-700/60 pb-1">
                    <span className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs inline-block shrink-0" style={{ backgroundColor: d.color }} />
                      <span>{d.name}</span>
                    </span>
                    <span className="font-black text-lime-400">
                      ₹{Math.round(d.savings).toLocaleString('en-IN')} ({Math.round(d.pct)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* SECTION 4: EMPLOYEE-WISE KAIZEN SUBMISSION & PARTICIPATION LEADERBOARD */}
      {/* Slicers from the board drive this component directly */}
      <div id="employee-kaizen-chart-section">
        <EmployeeKaizenChart
          filters={{
            year: selectedYear,
            month: selectedMonth,
            type: selectedType,
            status: selectedStatus,
            dept: selectedDept,
          }}
          darkMode={true}
          onSelectKaizen={onSelectKaizen}
        />
      </div>

    </div>
  );
}
