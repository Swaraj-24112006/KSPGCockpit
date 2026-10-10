import React, { useState } from 'react';
import { Kaizen } from '../types';
import { BarChart, Clock, CheckCircle, TrendingUp, IndianRupee, Activity, Users, Award, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { formatIndianRupees, formatIndianRupeesCompact } from '../utils';
import ExecutiveAnalyticsBoard from './ExecutiveAnalyticsBoard';
import EmployeeKaizenChart from './EmployeeKaizenChart';

interface DashboardProps {
  kaizens: Kaizen[];
  onSelectKaizen: (k: Kaizen) => void;
  onNavigateToTab: (tab: 'form' | 'committee' | 'list' | 'cft-awards' | 'process-flowchart' | 'gamification') => void;
}

export default function Dashboard({ kaizens, onSelectKaizen, onNavigateToTab }: DashboardProps) {
  const [isPendingCollapsed, setIsPendingCollapsed] = useState(false);

  // Compute analytics metrics
  const totalLogged = kaizens.length;
  const pendingKaizens = kaizens.filter(k => k.status === 'Pending');
  const approvedKaizens = kaizens.filter(k => k.status === 'Approved' || k.status === 'Good Point');
  const totalSavings = approvedKaizens.reduce((sum, k) => sum + (k.costSave || 0), 0);

  // 1. Minifactory breakdown
  const minifactoryCounts: Record<string, number> = {};
  kaizens.forEach(k => {
    minifactoryCounts[k.minifactory] = (minifactoryCounts[k.minifactory] || 0) + 1;
  });

  // 2. PQCDSM metrics frequency
  const benefitsCounts = { p: 0, q: 0, c: 0, d: 0, s: 0, m: 0 };
  kaizens.forEach(k => {
    if (k.benefits?.p) benefitsCounts.p++;
    if (k.benefits?.q) benefitsCounts.q++;
    if (k.benefits?.c) benefitsCounts.c++;
    if (k.benefits?.d) benefitsCounts.d++;
    if (k.benefits?.s) benefitsCounts.s++;
    if (k.benefits?.m) benefitsCounts.m++;
  });

  // 3. Simple Month over Month trend (e.g. May, June, July)
  const monthCounts: Record<string, number> = { "May": 0, "June": 0, "July": 0 };
  kaizens.forEach(k => {
    // If month is June or July, increment, else default May/etc.
    const m = k.month || 'July';
    if (monthCounts[m] !== undefined) {
      monthCounts[m]++;
    } else {
      monthCounts[m] = 1;
    }
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* Opening Intro Hero block */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-900 px-2.5 py-1 rounded-full uppercase tracking-widest font-mono">
              ⚡ LIVE MANUFACTURING KAIZEN STATS
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Factory Continuous Improvement Tracker
            </h2>
            <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
              Every small daily improvement accumulates. Log Kaizen sheets at workstations, evaluate ROI values, and accelerate lean manufacturing standards.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigateToTab('gamification')}
              className="px-5 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center space-x-1.5 cursor-pointer border border-amber-300 ring-2 ring-amber-400/20"
            >
              <span>🎮 Gamification & Density</span>
            </button>
            <button
              onClick={() => onNavigateToTab('process-flowchart')}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-1.5 cursor-pointer border border-indigo-400"
            >
              <span>🔄 End-to-End Flowchart</span>
            </button>
            <button
              onClick={() => onNavigateToTab('form')}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 cursor-pointer"
            >
              <span>👷 Log New Kaizen</span>
            </button>
            <button
              onClick={() => onNavigateToTab('committee')}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <span>👥 Review Meeting</span>
            </button>
            <button
              onClick={() => onNavigateToTab('cft-awards')}
              className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center space-x-1.5 cursor-pointer border border-amber-300"
            >
              <span>🏆 Monthly Best Awards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Executive Analytics Dashboard (Matching User Uploaded Benchmark Charts) */}
      <ExecutiveAnalyticsBoard kaizens={kaizens} />

      {/* Employee-wise Number of Kaizen Graphs & Leaderboard */}
      <EmployeeKaizenChart kaizens={kaizens} onSelectKaizen={onSelectKaizen} />

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Logged */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase font-mono">Total Logged Ideas</span>
            <div className="p-2 bg-slate-50 rounded-xl">
              <Activity className="w-4 h-4 text-slate-700" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">{totalLogged}</div>
          <div className="text-[10px] text-slate-400 mt-2 font-medium">Accumulated across all minifactories</div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-600 uppercase font-mono">Pending Review</span>
            <div className="p-2 bg-amber-50 rounded-xl">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-700 font-mono tracking-tight">{pendingKaizens.length}</div>
          <div className="text-[10px] text-amber-500/80 mt-2 font-medium">Awaiting discussion in committee</div>
        </div>

        {/* Approved */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-600 uppercase font-mono">Approved / Closed</span>
            <div className="p-2 bg-emerald-50 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700 font-mono tracking-tight">{approvedKaizens.length}</div>
          <div className="text-[10px] text-emerald-500/80 mt-2 font-medium">Standardized as factory protocols</div>
        </div>

        {/* Financial ROI */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-600 uppercase font-mono">Estimated Annualized ROI</span>
            <div className="p-2 bg-indigo-50 rounded-xl">
              <IndianRupee className="w-4 h-4 text-indigo-500" />
            </div>
          </div>
          <div className="text-3xl font-black text-indigo-900 font-mono tracking-tight">{formatIndianRupees(totalSavings)}</div>
          <div className="text-[10px] text-indigo-500/80 mt-2 font-medium">Total validated cost reduction</div>
        </div>

      </div>

      {/* CHARTS CONTAINER - Custom Responsive Premium SVGs (Zero peer dependency issues) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Growth Trend (Line Chart) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase font-mono">📈 MONTHLY GROWTH TRENDS</h3>
              <p className="text-[11px] text-slate-400 font-medium">Total logged improvements submitted per calendar month</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 font-mono uppercase bg-slate-100 px-2.5 py-1 rounded-md">LOGGED FREQUENCY</span>
          </div>

          {/* SVG Line Chart */}
          <div className="relative w-full h-56 flex items-end">
            <svg viewBox="0 0 600 200" className="w-full h-full" strokeLinecap="round" strokeLinejoin="round">
              {/* Grid Lines */}
              <line x1="50" y1="20" x2="550" y2="20" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="50" y1="70" x2="550" y2="70" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="50" y1="120" x2="550" y2="120" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="50" y1="170" x2="550" y2="170" stroke="#f1f5f9" strokeWidth="1.5" />

              {/* Y Axis labels */}
              <text x="35" y="24" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="end">10</text>
              <text x="35" y="74" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="end">5</text>
              <text x="35" y="124" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="end">2</text>
              <text x="35" y="174" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="end">0</text>

              {/* Trend line coordinates: 
                  May: value is monthCounts['May'] or 1. x=150, y = 170 - (val * 15)
                  June: value is monthCounts['June']. x=300, y = 170 - (val * 15)
                  July: value is monthCounts['July']. x=450, y = 170 - (val * 15)
              */}
              {(() => {
                const mayVal = monthCounts["May"] || 1;
                const juneVal = monthCounts["June"] || 3;
                const julyVal = monthCounts["July"] || 3;

                const yMay = 170 - (mayVal * 15);
                const yJune = 170 - (juneVal * 15);
                const yJuly = 170 - (julyVal * 15);

                const linePath = `M 150 ${yMay} L 300 ${yJune} L 450 ${yJuly}`;
                const areaPath = `M 150 170 L 150 ${yMay} L 300 ${yJune} L 450 ${yJuly} L 450 170 Z`;

                return (
                  <>
                    {/* Glowing area fill */}
                    <path d={areaPath} fill="url(#blueGrad)" opacity="0.1" />
                    
                    {/* Colored path */}
                    <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="3" />

                    {/* Circles on vertices */}
                    <circle cx="150" cy={yMay} r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />
                    <circle cx="300" cy={yJune} r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />
                    <circle cx="450" cy={yJuly} r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />

                    {/* Numeric Labels */}
                    <text x="150" y={yMay - 10} fill="#1e3a8a" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">{mayVal}</text>
                    <text x="300" y={yJune - 10} fill="#1e3a8a" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">{juneVal}</text>
                    <text x="450" y={yJuly - 10} fill="#1e3a8a" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">{julyVal}</text>
                  </>
                );
              })()}

              {/* X Axis labels */}
              <text x="150" y="190" fill="#64748b" fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">May</text>
              <text x="300" y="190" fill="#64748b" fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">June</text>
              <text x="450" y="190" fill="#64748b" fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">July (Current)</text>

              {/* Definitions */}
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* PQCDSM Metrics breakdown (Horizontal Bars) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase font-mono">📊 PQCDSM PARAMETERS</h3>
            <p className="text-[11px] text-slate-400 font-medium">Frequency of continuous improvement benefits</p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {[
              { label: 'P', name: 'Productivity', count: benefitsCounts.p, color: 'bg-blue-500' },
              { label: 'Q', name: 'Quality', count: benefitsCounts.q, color: 'bg-indigo-500' },
              { label: 'C', name: 'Cost', count: benefitsCounts.c, color: 'bg-emerald-500' },
              { label: 'D', name: 'Delivery', count: benefitsCounts.d, color: 'bg-amber-500' },
              { label: 'S', name: 'Safety', count: benefitsCounts.s, color: 'bg-red-500' },
              { label: 'M', name: 'Morale', count: benefitsCounts.m, color: 'bg-purple-500' },
            ].map(item => {
              // Calculate width %
              const percentage = totalLogged > 0 ? (item.count / totalLogged) * 100 : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 flex items-center space-x-1.5">
                      <span className="bg-slate-100 text-slate-800 w-5 h-5 rounded flex items-center justify-center font-black">{item.label}</span>
                      <span>{item.name}</span>
                    </span>
                    <span className="font-bold text-slate-500">{item.count} hits</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`${item.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Minifactory bento card comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Minifactories contributions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase font-mono border-b border-slate-100 pb-3">
            🏭 MINIFFACTORY SUBMISSIONS INDEX
          </h3>
          <div className="divide-y divide-slate-100">
            {['MF1', 'MF2', 'MF3', 'Machining'].map(factory => {
              const count = minifactoryCounts[factory] || 0;
              const pct = totalLogged > 0 ? (count / totalLogged) * 100 : 0;
              const subDescription = factory === 'MF1' ? 'Vacuum & Oil Pump' : factory === 'MF2' ? 'All types of EGR' : factory === 'MF3' ? 'BPV' : 'Milling & Grinder';
              return (
                <div key={factory} className="py-2.5 flex items-center justify-between first:pt-0">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">{factory}</span>
                    <span className="text-[10px] text-slate-400 font-medium font-mono">{subDescription}</span>
                  </div>
                  <div className="flex items-center space-x-3 w-1/2">
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-slate-900 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-600 shrink-0 w-8 text-right">
                      {count} shts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Highest financial saving approvals */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase font-mono border-b border-slate-100 pb-3">
            🏆 TOP FINANCIAL VALUE IMPROVEMENTS
          </h3>
          <div className="divide-y divide-slate-100">
            {kaizens
              .filter(k => k.costSave > 0)
              .sort((a, b) => b.costSave - a.costSave)
              .slice(0, 4)
              .map(k => (
                <div
                  key={k.id}
                  onClick={() => onSelectKaizen(k)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer rounded-lg px-1 first:pt-0 transition"
                >
                  <div className="space-y-0.5 truncate pr-4">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{k.title}</h4>
                    <span className="text-[10px] text-slate-400 font-mono font-medium block">by {k.ideaBy} • {k.minifactory}</span>
                  </div>
                  <span className="text-xs font-mono font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md shrink-0">
                    +{formatIndianRupeesCompact(k.costSave)}/yr
                  </span>
                </div>
              ))}
          </div>
        </div>

      </div>

      {/* OPENING SCREEN SUMMARY - PENDING ENTRIES AND RECENT APPROVALS (Attachment 2 requirement) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        
        {/* SUMMARY: Pending Entries */}
        <div className="bg-white border border-slate-250 rounded-2xl shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setIsPendingCollapsed(!isPendingCollapsed)}
            className="w-full bg-amber-50 px-4 py-3 border-b border-amber-100 flex items-center justify-between hover:bg-amber-100/60 transition cursor-pointer select-none"
          >
            <span className="text-xs font-extrabold text-amber-800 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>📥 Summary of Pending Entries ({pendingKaizens.length})</span>
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-mono">
                Awaiting Committee
              </span>
              {isPendingCollapsed ? (
                <ChevronRight className="w-4 h-4 text-amber-700" />
              ) : (
                <ChevronDown className="w-4 h-4 text-amber-700" />
              )}
            </div>
          </button>

          {!isPendingCollapsed && (
            <div className="divide-y divide-slate-100 animate-fade-in">
              {pendingKaizens.length === 0 ? (
                <div className="p-8 text-xs text-center text-slate-400 font-medium">
                  🎉 No pending entries needing review right now. Nice job!
                </div>
              ) : (
                pendingKaizens.map(k => (
                  <div
                    key={k.id}
                    onClick={() => onSelectKaizen(k)}
                    className="p-4 flex items-start justify-between hover:bg-slate-50 cursor-pointer transition"
                  >
                    <div className="space-y-1 pr-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold text-slate-400 font-mono">{k.srNo}</span>
                        <span className="text-[10px] text-slate-400">• {k.suggestionDate}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{k.title}</h4>
                      <p className="text-[11px] text-slate-500 truncate font-sans">Logged by: {k.ideaBy}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectKaizen(k);
                      }}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline font-mono shrink-0"
                    >
                      View Sheet
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* SUMMARY: Recent Approvals */}
        <div className="bg-white border border-slate-250 rounded-2xl shadow-xs overflow-hidden">
          <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>✅ Recent Approvals & Decisions</span>
            </span>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono font-medium">
              Standardized
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {approvedKaizens.length === 0 ? (
              <div className="p-8 text-xs text-center text-slate-400 font-medium">
                No recent approvals logged in the system database yet.
              </div>
            ) : (
              approvedKaizens.slice(0, 4).map(k => (
                <div
                  key={k.id}
                  onClick={() => onSelectKaizen(k)}
                  className="p-4 flex items-start justify-between hover:bg-slate-50 cursor-pointer transition"
                >
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">{k.srNo}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase ${
                        k.classification === 'Kaizen'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {k.classification}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{k.title}</h4>
                    <p className="text-[11px] text-slate-500 truncate font-sans">ROI value: {formatIndianRupees(k.costSave)}/yr • {k.ideaBy}</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 font-mono self-center shrink-0">
                    {k.month}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
