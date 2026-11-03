import React, { useState } from 'react';
import { Kaizen } from '../types';
import EmployeeKaizenChart from './EmployeeKaizenChart';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  DollarSign, 
  Filter, 
  Calendar, 
  Building2, 
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { formatIndianRupees } from '../utils';

interface ExecutiveAnalyticsBoardProps {
  kaizens?: Kaizen[];
}

export default function ExecutiveAnalyticsBoard({ kaizens = [] }: ExecutiveAnalyticsBoardProps) {
  // Slicer States
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'Idea' | 'Kaizen'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'Closed' | 'Open' | 'Reject'>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  // Hardcoded exact benchmark data matching user's uploaded images
  const yoyKaizensData = [
    { year: '2021', count: 360, perEmp: 1.13, savings: 658071 },
    { year: '2022', count: 379, perEmp: 1.14, savings: 710238 },
    { year: '2023', count: 442, perEmp: 1.18, savings: 834458 },
    { year: '2024', count: 441, perEmp: 1.34, savings: 896448 },
    { year: 'YTD - 2025', count: 409, perEmp: 1.37, savings: 887300 },
  ];

  // Month on Month Kaizens (Image 3)
  const monthData = [
    { month: 'Jan', count: 17 },
    { month: 'Feb', count: 30 },
    { month: 'Mar', count: 21 },
    { month: 'Apr', count: 17 },
    { month: 'May', count: 14 },
    { month: 'Jun', count: 40 },
    { month: 'Jul', count: 53 },
    { month: 'Aug', count: 69 },
    { month: 'Sep', count: 69 },
    { month: 'Oct', count: 47 },
    { month: 'Nov', count: 29 },
  ];

  // Dept Distribution (Image 3)
  const deptData = [
    { dept: 'MF 2', count: 133, pct: '33%', savings: 110400, savingsPct: '34%', color: '#3b82f6' },
    { dept: 'MF 1', count: 78, pct: '19%', savings: 159600, savingsPct: '49%', color: '#84cc16' },
    { dept: 'MC', count: 71, pct: '17%', savings: 17100, savingsPct: '5%', color: '#ef4444' },
    { dept: 'Maintenance', count: 62, pct: '15%', savings: 38000, savingsPct: '11%', color: '#a855f7' },
    { dept: 'MF 3', count: 23, pct: '6%', savings: 0, savingsPct: '0%', color: '#f97316' },
    { dept: 'QA', count: 19, pct: '5%', savings: 2000, savingsPct: '1%', color: '#06b6d4' },
    { dept: 'OTH', count: 15, pct: '4%', savings: 0, savingsPct: '0%', color: '#64748b' },
    { dept: 'NCM', count: 5, pct: '1%', savings: 200, savingsPct: '0%', color: '#eab308' },
  ];

  return (
    <div className="space-y-8 font-sans">
      
      {/* SECTION 1: YoY IMPLEMENTED KAIZENS & PER EMPLOYEE (Image 1) */}
      <div className="bg-gradient-to-b from-[#031d38] via-[#08284d] to-[#04162a] border border-sky-900/60 rounded-3xl p-6 md:p-8 shadow-2xl text-white space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-800/50 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-500/20 rounded-2xl border border-sky-400/30 text-sky-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-black uppercase text-sky-400 tracking-wider block">EXECUTIVE YoY GROWTH</span>
              <h2 className="text-xl font-black font-display text-white">Year-over-Year Kaizen Implementation & Participation</h2>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-sky-950 text-sky-300 px-3 py-1 rounded-xl border border-sky-700/60">
            2021 – 2025 YTD Benchmark
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
          
          {/* Left Chart: No. of Kaizens - Implemented YoY */}
          <div className="bg-[#052345]/80 p-5 rounded-2xl border border-sky-800/40 space-y-4">
            <h3 className="text-center font-bold text-sm tracking-wide text-white uppercase font-sans">
              No. of Kaizens - Implemented YoY
            </h3>

            {/* SVG Bar + Trend Line */}
            <div className="relative w-full h-64">
              <svg viewBox="0 0 500 240" className="w-full h-full">
                {/* Bars */}
                {yoyKaizensData.map((d, i) => {
                  const x = 30 + i * 90;
                  const maxCount = 500;
                  const barHeight = (d.count / maxCount) * 160;
                  const y = 200 - barHeight;

                  return (
                    <g key={d.year}>
                      {/* Bar */}
                      <rect
                        x={x}
                        y={y}
                        width="54"
                        height={barHeight}
                        fill="#38bdf8"
                        rx="2"
                        className="transition-all hover:opacity-90"
                      />
                      {/* Count label inside bar top */}
                      <text
                        x={x + 27}
                        y={y + 20}
                        fill="#ffffff"
                        fontSize="12"
                        fontWeight="900"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {d.count}
                      </text>
                      {/* Year Label */}
                      <text
                        x={x + 27}
                        y="222"
                        fill="#e2e8f0"
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                        textAnchor="middle"
                      >
                        {d.year}
                      </text>
                    </g>
                  );
                })}

                {/* Yellow Trend Line */}
                <path
                  d="M 57 110 L 147 100 L 237 80 L 327 80 L 417 70"
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Right Chart: NO. OF KAIZENS PER EMPLOYEE */}
          <div className="bg-[#052345]/80 p-5 rounded-2xl border border-sky-800/40 space-y-4">
            <h3 className="text-center font-bold text-sm tracking-wide text-white uppercase font-sans">
              NO. OF KAIZENS PER EMPLOYEE
            </h3>

            {/* SVG Line Chart */}
            <div className="relative w-full h-64">
              <svg viewBox="0 0 500 240" className="w-full h-full">
                {/* Green Line */}
                <path
                  d="M 60 140 L 150 135 L 240 125 L 330 85 L 420 75"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {/* Data point boxes */}
                {yoyKaizensData.map((d, i) => {
                  const points = [
                    { x: 60, y: 140 },
                    { x: 150, y: 135 },
                    { x: 240, y: 125 },
                    { x: 330, y: 85 },
                    { x: 420, y: 75 },
                  ];
                  const pt = points[i];

                  return (
                    <g key={d.year}>
                      {/* Box Background */}
                      <rect
                        x={pt.x - 22}
                        y={pt.y - 12}
                        width="44"
                        height="24"
                        fill="#031a33"
                        stroke="#0369a1"
                        strokeWidth="1.5"
                        rx="4"
                      />
                      {/* Text value */}
                      <text
                        x={pt.x}
                        y={pt.y + 4}
                        fill="#ffffff"
                        fontSize="12"
                        fontWeight="900"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {d.perEmp}
                      </text>
                      {/* Year label */}
                      <text
                        x={pt.x}
                        y="222"
                        fill="#e2e8f0"
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                        textAnchor="middle"
                      >
                        {d.year}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

        </div>

      </div>

      {/* SECTION 2: FINANCIAL & CULTURAL IMPACT - COST SAVED YoY (Image 2) */}
      <div className="bg-[#03182e] border border-lime-900/60 rounded-3xl p-6 md:p-8 shadow-2xl text-white space-y-6">
        <div className="border-b border-lime-800/40 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black font-display text-white">Financial & Cultural Impact</h2>
            <p className="text-xs text-lime-400 font-mono mt-0.5">Validated annual cost savings and cost avoidance trajectory</p>
          </div>
          <span className="px-3 py-1 bg-lime-950 text-lime-300 font-mono font-bold text-xs rounded-xl border border-lime-700">
            INR (₹) Total Savings
          </span>
        </div>

        <div className="border border-lime-800/50 rounded-2xl p-6 bg-[#04203e]/90 space-y-4">
          <h3 className="text-center font-extrabold text-base tracking-wider text-white font-sans uppercase">
            YoY: Cost Saved/Avoided (INR)
          </h3>

          <div className="relative w-full h-72">
            <svg viewBox="0 0 600 280" className="w-full h-full">
              {/* Y Axis Grid Lines */}
              <line x1="80" y1="40" x2="560" y2="40" stroke="#0f3763" strokeDasharray="3 3" />
              <text x="70" y="44" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">1000000</text>

              <line x1="80" y1="80" x2="560" y2="80" stroke="#0f3763" strokeDasharray="3 3" />
              <text x="70" y="84" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">800000</text>

              <line x1="80" y1="120" x2="560" y2="120" stroke="#0f3763" strokeDasharray="3 3" />
              <text x="70" y="124" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">600000</text>

              <line x1="80" y1="160" x2="560" y2="160" stroke="#0f3763" strokeDasharray="3 3" />
              <text x="70" y="164" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">400000</text>

              <line x1="80" y1="200" x2="560" y2="200" stroke="#0f3763" strokeDasharray="3 3" />
              <text x="70" y="204" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">200000</text>

              <line x1="80" y1="240" x2="560" y2="240" stroke="#475569" strokeWidth="1.5" />
              <text x="70" y="244" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">0</text>

              {/* Bars */}
              {yoyKaizensData.map((d, i) => {
                const x = 110 + i * 90;
                const maxVal = 1000000;
                const barHeight = (d.savings / maxVal) * 200;
                const y = 240 - barHeight;

                return (
                  <g key={d.year}>
                    {/* Glowing Lime Bar */}
                    <rect
                      x={x}
                      y={y}
                      width="58"
                      height={barHeight}
                      fill="#a3e635"
                      rx="3"
                      className="transition-all hover:brightness-110"
                    />
                    {/* Value label */}
                    <text
                      x={x + 29}
                      y={y + 24}
                      fill="#0f172a"
                      fontSize="11"
                      fontWeight="900"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {d.savings}
                    </text>
                    {/* Year Label */}
                    <text
                      x={x + 29}
                      y="262"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                    >
                      {d.year}
                    </text>
                  </g>
                );
              })}

              {/* Yellow Dashed Trend Line */}
              <path
                d="M 139 130 L 229 120 L 319 95 L 409 82 L 499 75"
                fill="none"
                stroke="#facc15"
                strokeWidth="2.5"
                strokeDasharray="5 4"
              />
            </svg>
          </div>
        </div>

      </div>

      {/* SECTION 3: IDEA / KAIZEN MANAGEMENT DASHBOARD (Image 3) */}
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
            <span className="text-xs font-mono text-slate-400">Interactive Slicer Controls</span>
          </div>

          {/* SLICER CONTROLS BAR */}
          <div className="bg-[#08294d] border border-slate-700/80 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            
            {/* Timeline Slicer */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-sky-400" />
                <span>Month Timeline (2025)</span>
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-[#031a33] text-white border border-slate-600 rounded-lg p-2 font-bold focus:outline-none"
              >
                <option value="ALL">All Months (2025)</option>
                <option value="Jan">Jan</option>
                <option value="Feb">Feb</option>
                <option value="Mar">Mar</option>
                <option value="Apr">Apr</option>
                <option value="May">May</option>
                <option value="Jun">Jun</option>
                <option value="Jul">Jul</option>
                <option value="Aug">Aug</option>
                <option value="Sep">Sep</option>
                <option value="Oct">Oct</option>
                <option value="Nov">Nov</option>
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
                    className={`flex-1 py-1.5 text-[11px] font-bold transition ${
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
                    className={`flex-1 py-1.5 text-[10px] font-bold transition ${
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
                className="w-full bg-[#031a33] text-white border border-slate-600 rounded-lg p-2 font-bold focus:outline-none"
              >
                <option value="ALL">All Depts (Maintenance, MF1..3, MC, QA)</option>
                <option value="MF 1">MF 1</option>
                <option value="MF 2">MF 2</option>
                <option value="MF 3">MF 3</option>
                <option value="MC">MC</option>
                <option value="Maintenance">Maintenance</option>
                <option value="QA">QA</option>
                <option value="NCM">NCM</option>
                <option value="OTH">OTH</option>
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

            {/* Donut representation */}
            <div className="flex flex-col items-center justify-center space-y-4 pt-2">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Kaizen Segment (83%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="20"
                    strokeDasharray="198 238"
                  />
                  {/* Idea Segment (17%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="20"
                    strokeDasharray="40 238"
                    strokeDashoffset="-198"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black font-mono text-white">406 Total</span>
                  <span className="text-[10px] text-slate-300 font-mono">100% Submissions</span>
                </div>
              </div>

              <div className="flex items-center space-x-6 text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <div className="w-3.5 h-3.5 bg-orange-500 rounded-sm" />
                  <span className="font-bold text-slate-200">Idea: 67 (17%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3.5 h-3.5 bg-sky-400 rounded-sm" />
                  <span className="font-bold text-slate-200">Kaizen: 339 (83%)</span>
                </div>
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
                {/* Closed Bar (369) */}
                <rect x="20" y="20" width="36" height="110" fill="#f97316" rx="2" />
                <text x="38" y="15" fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">369</text>
                <text x="38" y="148" fill="#e2e8f0" fontSize="9" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">CLOSED</text>

                {/* Open Bar (34) */}
                <rect x="82" y="105" width="36" height="25" fill="#38bdf8" rx="2" />
                <text x="100" y="100" fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">34</text>
                <text x="100" y="148" fill="#e2e8f0" fontSize="9" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">OPEN</text>

                {/* Reject Bar (3) */}
                <rect x="144" y="125" width="36" height="5" fill="#64748b" rx="2" />
                <text x="162" y="120" fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">3</text>
                <text x="162" y="148" fill="#e2e8f0" fontSize="9" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">REJECT</text>
              </svg>
            </div>
          </div>

          {/* Chart 3: Month on Month Trend */}
          <div className="lg:col-span-5 bg-[#08294d] border border-slate-700 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-extrabold text-white uppercase font-mono border-b border-slate-700 pb-2">
              Month on Month Submission Volume
            </h3>

            <div className="relative w-full h-48">
              <svg viewBox="0 0 450 160" className="w-full h-full">
                {/* Trend line */}
                <path
                  d="M 20 120 L 55 90 L 90 110 L 125 120 L 160 125 L 195 75 L 230 50 L 265 20 L 300 20 L 335 60 L 370 95"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                />

                {/* Dots with numeric badges */}
                {monthData.map((d, i) => {
                  const points = [
                    { x: 20, y: 120 },
                    { x: 55, y: 90 },
                    { x: 90, y: 110 },
                    { x: 125, y: 120 },
                    { x: 160, y: 125 },
                    { x: 195, y: 75 },
                    { x: 230, y: 50 },
                    { x: 265, y: 20 },
                    { x: 300, y: 20 },
                    { x: 335, y: 60 },
                    { x: 370, y: 95 },
                  ];
                  const pt = points[i];

                  return (
                    <g key={d.month}>
                      <circle cx={pt.x} cy={pt.y} r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                      <text x={pt.x} y={pt.y - 8} fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                        {d.count}
                      </text>
                      <text x={pt.x} y="150" fill="#94a3b8" fontSize="8" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
                        {d.month}
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
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#3b82f6" strokeWidth="18" strokeDasharray="78 238" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#ef4444" strokeWidth="18" strokeDasharray="45 238" strokeDashoffset="-78" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#84cc16" strokeWidth="18" strokeDasharray="40 238" strokeDashoffset="-123" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#a855f7" strokeWidth="18" strokeDasharray="35 238" strokeDashoffset="-163" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#f97316" strokeWidth="18" strokeDasharray="15 238" strokeDashoffset="-198" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#06b6d4" strokeWidth="18" strokeDasharray="12 238" strokeDashoffset="-213" />
                  <text x="50" y="52" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="monospace" textAnchor="middle">Minifactory</text>
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono flex-1">
                {deptData.map(d => (
                  <div key={d.dept} className="flex items-center space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-200 font-bold truncate">{d.dept}: {d.count} ({d.pct})</span>
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
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#84cc16" strokeWidth="18" strokeDasharray="116 238" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#a855f7" strokeWidth="18" strokeDasharray="80 238" strokeDashoffset="-116" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#3b82f6" strokeWidth="18" strokeDasharray="26 238" strokeDashoffset="-196" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#ef4444" strokeWidth="18" strokeDasharray="12 238" strokeDashoffset="-222" />
                  <text x="50" y="52" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="monospace" textAnchor="middle">₹ Savings</text>
                </svg>
              </div>

              <div className="space-y-1.5 text-[11px] font-mono flex-1">
                <div className="flex items-center justify-between text-slate-200 font-bold border-b border-slate-700/60 pb-1">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 bg-lime-500 rounded-xs inline-block" />
                    <span>MF 1</span>
                  </span>
                  <span className="text-lime-400 font-black">₹1,59,600 (49%)</span>
                </div>

                <div className="flex items-center justify-between text-slate-200 font-bold border-b border-slate-700/60 pb-1">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 bg-purple-500 rounded-xs inline-block" />
                    <span>MF 2</span>
                  </span>
                  <span className="text-purple-300 font-black">₹1,10,400 (34%)</span>
                </div>

                <div className="flex items-center justify-between text-slate-200 font-bold border-b border-slate-700/60 pb-1">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-xs inline-block" />
                    <span>Maintenance</span>
                  </span>
                  <span className="text-sky-300 font-black">₹38,000 (11%)</span>
                </div>

                <div className="flex items-center justify-between text-slate-200 font-bold">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-xs inline-block" />
                    <span>MC / QA / NCM</span>
                  </span>
                  <span className="text-slate-300 font-black">₹19,300 (6%)</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* SECTION 4: EMPLOYEE-WISE KAIZEN SUBMISSION & PARTICIPATION LEADERBOARD */}
      <EmployeeKaizenChart kaizens={kaizens} darkMode={true} />

    </div>
  );
}
