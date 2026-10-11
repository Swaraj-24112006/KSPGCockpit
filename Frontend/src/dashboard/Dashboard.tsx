import React, { useState, useMemo } from 'react';
import { Kaizen } from '../types';
import {
  Clock,
  CheckCircle,
  TrendingUp,
  IndianRupee,
  Activity,
  Calendar,
  Filter,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { formatIndianRupees, formatIndianRupeesCompact } from '../utils';
import { RoleCategory, canAccessTab } from '../shared/utils/rbac';
import ExecutiveAnalyticsBoard from './ExecutiveAnalyticsBoard';
import { useDashboardAnalytics } from './hooks/useAnalytics';
import { niceMax, buildLinePath, buildAreaPath, generateAxisTicks, Point2D } from '../components/charts/chartPrimitives';
import {
  AnalyticsSkeleton,
  AnalyticsError,
  AnalyticsEmpty,
  LastUpdatedBadge
} from '../components/charts/AnalyticsStates';

interface DashboardProps {
  kaizens: Kaizen[];
  onSelectKaizen: (k: Kaizen | any) => void;
  onNavigateToTab: (tab: 'form' | 'committee' | 'list' | 'cft-awards' | 'process-flowchart' | 'gamification') => void;
  userRole?: RoleCategory;
}

type PeriodFilter = 'this_year' | 'this_quarter' | 'this_month' | 'all';

export default function Dashboard({ kaizens, onSelectKaizen, onNavigateToTab, userRole }: DashboardProps) {
  const [isPendingCollapsed, setIsPendingCollapsed] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>('this_year');

  // Compute from / to dates for the period filter
  const { from, to } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed

    if (period === 'this_month') {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return {
        from: start.toISOString().split('T')[0],
        to: end.toISOString().split('T')[0],
      };
    } else if (period === 'this_quarter') {
      const qStartMonth = Math.floor(m / 3) * 3;
      const start = new Date(y, qStartMonth, 1);
      const end = new Date(y, qStartMonth + 3, 0);
      return {
        from: start.toISOString().split('T')[0],
        to: end.toISOString().split('T')[0],
      };
    } else if (period === 'all') {
      return {
        from: '2020-01-01',
        to: `${y + 1}-12-31`,
      };
    } else {
      // 'this_year' (default)
      return {
        from: `${y}-01-01`,
        to: `${y}-12-31`,
      };
    }
  }, [period]);

  // Live analytics from PostgreSQL backend
  const { data, isLoading, isFetching, error, refetch } = useDashboardAnalytics({ from, to });

  // Fallback / safe defaults when loading or empty
  const summary = data?.summary || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    approvalRate: null,
    totalSavings: 0,
  };

  const monthlyTrend = data?.monthlyTrend || [];
  const pqcdsm = data?.pqcdsm || [];
  const byMinifactory = data?.byMinifactory || [];
  const topSavings = data?.topSavings || [];
  const pendingKaizens = data?.pending || [];
  const recentApprovals = data?.recentApprovals || [];

  // Monthly trend chart geometry calculations with niceMax
  const { chartPoints, maxTrendVal, axisTicks, linePath, areaPath } = useMemo(() => {
    if (monthlyTrend.length === 0) {
      return { chartPoints: [], maxTrendVal: 10, axisTicks: [10, 5, 0], linePath: '', areaPath: '' };
    }

    const counts = monthlyTrend.map(d => d.count);
    const rawMax = Math.max(...counts, 1);
    const maxVal = niceMax(rawMax);
    const ticks = generateAxisTicks(maxVal, 3);

    // SVG coordinates: Width 600, Height 200.
    // Chart area: x in [70, 560], y in [30, 165] (165 is baseline y)
    const baselineY = 165;
    const topY = 30;
    const leftX = 70;
    const rightX = 560;
    const usableW = rightX - leftX;
    const usableH = baselineY - topY;

    const countPts = monthlyTrend.length;
    const pts: Point2D[] = monthlyTrend.map((d, i) => {
      const x = countPts > 1 ? leftX + (i / (countPts - 1)) * usableW : leftX + usableW / 2;
      const normalizedH = (d.count / maxVal) * usableH;
      const y = baselineY - normalizedH;
      return { x, y };
    });

    const lPath = buildLinePath(pts);
    const aPath = buildAreaPath(pts, baselineY);

    return {
      chartPoints: pts,
      maxTrendVal: maxVal,
      axisTicks: ticks,
      linePath: lPath,
      areaPath: aPath,
    };
  }, [monthlyTrend]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-sans">

      {/* Opening Intro Hero block */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-900 px-2.5 py-1 rounded-full uppercase tracking-widest font-mono">
                ⚡ LIVE MANUFACTURING KAIZEN STATS
              </span>
              <LastUpdatedBadge generatedAt={data?.generatedAt} isFetching={isFetching} darkMode={true} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Factory Continuous Improvement Tracker
            </h2>
            <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
              Every small daily improvement accumulates. Log Kaizen sheets at workstations, evaluate ROI values, and accelerate lean manufacturing standards.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                const el = document.getElementById('employee-kaizen-chart-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  onNavigateToTab('gamification');
                }
              }}
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
            {(!userRole || canAccessTab(userRole, 'kaizen', 'form')) && (
              <button
                onClick={() => onNavigateToTab('form')}
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 cursor-pointer"
              >
                <span>👷 Log New Kaizen</span>
              </button>
            )}
            {(!userRole || canAccessTab(userRole, 'kaizen', 'committee')) && (
              <button
                onClick={() => onNavigateToTab('committee')}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <span>👥 Review Meeting</span>
              </button>
            )}
            <button
              onClick={() => onNavigateToTab('cft-awards')}
              className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center space-x-1.5 cursor-pointer border border-amber-300"
            >
              <span>🏆 Monthly Best Awards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scope Controls & Period Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold uppercase font-mono text-slate-700">Analytics Period:</span>
          <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-0.5 text-xs font-mono">
            {[
              { id: 'this_year', label: 'This Year' },
              { id: 'this_quarter', label: 'This Quarter' },
              { id: 'this_month', label: 'This Month' },
              { id: 'all', label: 'All History' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id as PeriodFilter)}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  period === p.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <LastUpdatedBadge generatedAt={data?.generatedAt} isFetching={isFetching} />
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state alert */}
      {error && !data && (
        <AnalyticsError message={error.message} onRetry={() => refetch()} />
      )}

      {/* Executive Analytics Dashboard (Matching User Uploaded Benchmark Charts & Employee Leaderboard) */}
      <ExecutiveAnalyticsBoard kaizens={kaizens} onSelectKaizen={onSelectKaizen} />

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
          <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
            {isLoading && !data ? '—' : summary.total}
          </div>
          <div className="text-[10px] text-slate-400 mt-2 font-medium">Accumulated across all minifactories in window</div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-600 uppercase font-mono">Pending Review</span>
            <div className="p-2 bg-amber-50 rounded-xl">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-700 font-mono tracking-tight">
            {isLoading && !data ? '—' : summary.pending}
          </div>
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
          <div className="text-3xl font-black text-emerald-700 font-mono tracking-tight">
            {isLoading && !data ? '—' : summary.approved}
          </div>
          <div className="text-[10px] text-emerald-500/80 mt-2 font-medium">
            Standardized protocols (Rate: {summary.approvalRate !== null ? `${Math.round(summary.approvalRate * 100)}%` : '—'})
          </div>
        </div>

        {/* Financial ROI */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-600 uppercase font-mono">Estimated Annualized ROI</span>
            <div className="p-2 bg-indigo-50 rounded-xl">
              <IndianRupee className="w-4 h-4 text-indigo-500" />
            </div>
          </div>
          <div className="text-3xl font-black text-indigo-900 font-mono tracking-tight">
            {isLoading && !data ? '—' : formatIndianRupees(summary.totalSavings)}
          </div>
          <div className="text-[10px] text-indigo-500/80 mt-2 font-medium">Total validated cost reduction (Closed only)</div>
        </div>
      </div>

      {/* CHARTS CONTAINER - Custom Responsive Premium SVGs derived cleanly from live data */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Growth Trend (Line Chart) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase font-mono">📈 MONTHLY GROWTH TRENDS</h3>
              <p className="text-[11px] text-slate-400 font-medium">Total logged improvements submitted per calendar month</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 font-mono uppercase bg-slate-100 px-2.5 py-1 rounded-md">
              LOGGED FREQUENCY
            </span>
          </div>

          {/* SVG Line Chart */}
          <div className="relative w-full h-56 flex items-end">
            {isLoading && !data ? (
              <AnalyticsSkeleton height="h-56" />
            ) : monthlyTrend.length === 0 ? (
              <AnalyticsEmpty title="No Trend Data" subtitle="No submissions recorded in this date range." />
            ) : (
              <svg viewBox="0 0 600 200" className="w-full h-full" strokeLinecap="round" strokeLinejoin="round">
                {/* Horizontal Grid Lines */}
                {axisTicks.map((val) => {
                  const yPos = 165 - (val / maxTrendVal) * 135;
                  return (
                    <g key={val}>
                      <line x1="50" y1={yPos} x2="570" y2={yPos} stroke="#f1f5f9" strokeWidth="1" />
                      <text x="42" y={yPos + 4} fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="end">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Base axis line */}
                <line x1="50" y1="165" x2="570" y2="165" stroke="#e2e8f0" strokeWidth="1.5" />

                {/* Area Gradient Fill */}
                <path d={areaPath} fill="url(#blueGradDashboard)" opacity="0.12" />

                {/* Line Path */}
                <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="3" />

                {/* Data Points */}
                {chartPoints.map((pt, i) => {
                  const mData = monthlyTrend[i];
                  return (
                    <g key={mData.month}>
                      <circle cx={pt.x} cy={pt.y} r="4.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
                      {mData.count > 0 && (
                        <text
                          x={pt.x}
                          y={pt.y - 10}
                          fill="#1e3a8a"
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {mData.count}
                        </text>
                      )}
                      <text
                        x={pt.x}
                        y="185"
                        fill="#64748b"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                        textAnchor="middle"
                      >
                        {mData.label.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}

                <defs>
                  <linearGradient id="blueGradDashboard" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#ffffff" />
                  </linearGradient>
                </defs>
              </svg>
            )}
          </div>
        </div>

        {/* PQCDSM Metrics breakdown (Horizontal Bars) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase font-mono">📊 PQCDSM PARAMETERS</h3>
            <p className="text-[11px] text-slate-400 font-medium">Frequency of continuous improvement benefits</p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {pqcdsm.map(item => {
              const colorMap: Record<string, string> = {
                P: 'bg-blue-500',
                Q: 'bg-indigo-500',
                C: 'bg-emerald-500',
                D: 'bg-amber-500',
                S: 'bg-red-500',
                M: 'bg-purple-500',
              };
              const color = colorMap[item.key] || 'bg-slate-600';
              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 flex items-center space-x-1.5">
                      <span className="bg-slate-100 text-slate-800 w-5 h-5 rounded flex items-center justify-center font-black">
                        {item.key}
                      </span>
                      <span>{item.name}</span>
                    </span>
                    <span className="font-bold text-slate-500">
                      {item.count} hits ({item.pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`${color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${item.pct}%` }}
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
            {byMinifactory.map(factory => (
              <div key={factory.code} className="py-2.5 flex items-center justify-between first:pt-0">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">{factory.name || factory.code}</span>
                  <span className="text-[10px] text-slate-400 font-medium font-mono">{factory.description}</span>
                </div>
                <div className="flex items-center space-x-3 w-1/2">
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-900 h-full rounded-full transition-all duration-500"
                      style={{ width: `${factory.pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-600 shrink-0 w-12 text-right">
                    {factory.count} shts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Highest financial saving approvals */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase font-mono border-b border-slate-100 pb-3">
            🏆 TOP FINANCIAL VALUE IMPROVEMENTS
          </h3>
          <div className="divide-y divide-slate-100">
            {topSavings.length === 0 ? (
              <div className="p-8 text-xs text-center text-slate-400 font-medium">
                No approved Kaizens with positive ROI recorded in this window yet.
              </div>
            ) : (
              topSavings.map(k => (
                <div
                  key={k.id}
                  onClick={() => onSelectKaizen(k)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer rounded-lg px-1 first:pt-0 transition"
                >
                  <div className="space-y-0.5 truncate pr-4">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{k.title}</h4>
                    <span className="text-[10px] text-slate-400 font-mono font-medium block">
                      by {k.ideaBy} • {k.minifactory}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md shrink-0">
                    +{formatIndianRupeesCompact(k.costSave)}/yr
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* OPENING SCREEN SUMMARY - PENDING ENTRIES AND RECENT APPROVALS */}
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
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline font-mono shrink-0 cursor-pointer"
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
            {recentApprovals.length === 0 ? (
              <div className="p-8 text-xs text-center text-slate-400 font-medium">
                No recent approvals logged in the system database yet.
              </div>
            ) : (
              recentApprovals.map(k => (
                <div
                  key={k.id}
                  onClick={() => onSelectKaizen(k)}
                  className="p-4 flex items-start justify-between hover:bg-slate-50 cursor-pointer transition"
                >
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">{k.srNo}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase bg-emerald-100 text-emerald-800">
                        {k.classification || 'Kaizen'}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{k.title}</h4>
                    <p className="text-[11px] text-slate-500 truncate font-sans">
                      ROI value: {formatIndianRupees(k.costSave)}/yr • {k.ideaBy}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 font-mono self-center shrink-0">
                    {k.month || k.suggestionDate}
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
