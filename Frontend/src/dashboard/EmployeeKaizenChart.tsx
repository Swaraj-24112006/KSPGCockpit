import React, { useState, useMemo } from 'react';
import { Kaizen } from '../types';
import {
  Trophy,
  Medal,
  Award,
  Users,
  Search,
  Filter,
  Sparkles,
  TrendingUp,
  IndianRupee,
  Star,
  CheckCircle2,
  Clock,
  ChevronRight,
  Flame,
  ArrowUpDown,
  Building2
} from 'lucide-react';
import { formatIndianRupees, formatIndianRupeesCompact } from '../utils';

interface EmployeeKaizenChartProps {
  kaizens: Kaizen[];
  onSelectKaizen?: (k: Kaizen) => void;
  darkMode?: boolean;
}

interface EmployeeStat {
  name: string;
  total: number;
  approved: number;
  pending: number;
  goodPoint: number;
  rejected: number;
  totalSavings: number;
  minifactories: string[];
  latestKaizen?: Kaizen;
  kaizensList: Kaizen[];
}

export default function EmployeeKaizenChart({ kaizens, onSelectKaizen, darkMode = false }: EmployeeKaizenChartProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMinifactory, setSelectedMinifactory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'total' | 'savings' | 'approved'>('total');
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  // Group and aggregate data employee-wise
  const employeeStats: EmployeeStat[] = useMemo(() => {
    const map: Record<string, EmployeeStat> = {};

    kaizens.forEach(k => {
      // Primary attribution to ideaBy, fallback to implementedBy, preparedBy, or Unknown
      const rawName = (k.ideaBy || k.implementedBy || k.preparedBy || '').trim();
      const name = rawName || 'Anonymous / Unassigned';

      if (!map[name]) {
        map[name] = {
          name,
          total: 0,
          approved: 0,
          pending: 0,
          goodPoint: 0,
          rejected: 0,
          totalSavings: 0,
          minifactories: [],
          kaizensList: [],
        };
      }

      const stat = map[name];
      stat.total++;
      stat.kaizensList.push(k);

      const statusLower = (k.status || '').toLowerCase();
      if (statusLower === 'approved') stat.approved++;
      else if (statusLower === 'pending') stat.pending++;
      else if (statusLower.includes('good') || statusLower === 'good point') stat.goodPoint++;
      else if (statusLower === 'rejected') stat.rejected++;
      else stat.pending++;

      stat.totalSavings += Number(k.costSave || 0);

      const mf = (k.minifactory || 'MF1').trim();
      if (mf && !stat.minifactories.includes(mf)) {
        stat.minifactories.push(mf);
      }

      if (!stat.latestKaizen || (k.createdAt && stat.latestKaizen.createdAt && k.createdAt > stat.latestKaizen.createdAt)) {
        stat.latestKaizen = k;
      }
    });

    return Object.values(map);
  }, [kaizens]);

  // Unique minifactories
  const uniqueMinifactories = useMemo(() => {
    const set = new Set<string>();
    employeeStats.forEach(e => e.minifactories.forEach(mf => set.add(mf)));
    return ['All', ...Array.from(set).sort()];
  }, [employeeStats]);

  // Filtered and sorted employee list
  const filteredEmployees = useMemo(() => {
    return employeeStats
      .filter(emp => {
        const matchesSearch = searchTerm === '' || emp.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMf = selectedMinifactory === 'All' || emp.minifactories.includes(selectedMinifactory);
        return matchesSearch && matchesMf;
      })
      .sort((a, b) => {
        if (sortBy === 'total') return b.total - a.total || b.totalSavings - a.totalSavings;
        if (sortBy === 'savings') return b.totalSavings - a.totalSavings || b.total - a.total;
        if (sortBy === 'approved') return b.approved - a.approved || b.total - a.total;
        return 0;
      });
  }, [employeeStats, searchTerm, selectedMinifactory, sortBy]);

  // Top 3 for podium
  const topThree = useMemo(() => {
    return filteredEmployees.slice(0, 3);
  }, [filteredEmployees]);

  // Chart data: Top 8 employees
  const chartData = useMemo(() => {
    return filteredEmployees.slice(0, 8);
  }, [filteredEmployees]);

  // Maximum count for horizontal bar scaling
  const maxChartCount = useMemo(() => {
    if (chartData.length === 0) return 10;
    return Math.max(...chartData.map(d => d.total), 1);
  }, [chartData]);

  // Summary Metrics
  const totalEmployees = employeeStats.length;
  const avgKaizensPerEmp = totalEmployees > 0 ? (kaizens.length / totalEmployees).toFixed(1) : '0';
  const topPerformer = filteredEmployees[0];

  return (
    <div
      id="employee-kaizen-chart-section"
      className={`rounded-3xl p-6 sm:p-8 space-y-8 relative overflow-hidden transition-colors ${
        darkMode
          ? 'bg-gradient-to-b from-[#031d38] via-[#08284d] to-[#04162a] border border-sky-900/60 text-white shadow-2xl'
          : 'bg-white border border-slate-200 text-slate-900 shadow-xs'
      }`}
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Controls */}
      <div className={`relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-6 ${
        darkMode ? 'border-sky-800/50' : 'border-slate-100'
      }`}>
        <div>
          <div className={`inline-flex items-center space-x-2 border px-3 py-1 rounded-full text-[10px] font-black uppercase font-mono tracking-wider mb-2 ${
            darkMode
              ? 'bg-amber-500/20 border-amber-400/30 text-amber-300'
              : 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-300/40 text-amber-700'
          }`}>
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Employee Engagement & Recognition</span>
          </div>
          <h2 className={`text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <span>👥 Employee-Wise Kaizen Contribution & Leaderboard</span>
          </h2>
          <p className={`text-xs mt-1 max-w-2xl font-medium ${
            darkMode ? 'text-sky-300/80' : 'text-slate-500'
          }`}>
            Recognizing shop-floor champions driving lean culture, continuous improvement density, and validated cost savings across all mini-factories.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employee..."
              className={`w-full rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 transition ${
                darkMode
                  ? 'bg-[#031a33] border border-sky-800/80 text-white placeholder-slate-400'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white'
              }`}
            />
          </div>

          {/* Minifactory Filter */}
          <div className={`flex items-center space-x-1 border rounded-xl px-2.5 py-1 ${
            darkMode ? 'bg-[#031a33] border-sky-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedMinifactory}
              onChange={(e) => setSelectedMinifactory(e.target.value)}
              className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer pr-1 ${
                darkMode ? 'text-sky-200' : 'text-slate-700'
              }`}
            >
              {uniqueMinifactories.map(mf => (
                <option key={mf} value={mf} className={darkMode ? 'bg-slate-900 text-white' : ''}>
                  {mf === 'All' ? 'All Units' : mf}
                </option>
              ))}
            </select>
          </div>

          {/* Sorter */}
          <div className={`flex items-center space-x-1 border rounded-xl px-2.5 py-1 ${
            darkMode ? 'bg-[#031a33] border-sky-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer pr-1 ${
                darkMode ? 'text-sky-200' : 'text-slate-700'
              }`}
            >
              <option value="total" className={darkMode ? 'bg-slate-900 text-white' : ''}>Most Kaizens</option>
              <option value="savings" className={darkMode ? 'bg-slate-900 text-white' : ''}>Highest Savings (₹)</option>
              <option value="approved" className={darkMode ? 'bg-slate-900 text-white' : ''}>Most Approved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`border rounded-2xl p-4 flex items-center space-x-3 ${
          darkMode ? 'bg-[#052345]/80 border-sky-800/50' : 'bg-slate-50/80 border-slate-200/60'
        }`}>
          <div className="p-2.5 bg-blue-500/20 text-sky-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-[10px] font-mono uppercase font-bold ${darkMode ? 'text-sky-300/70' : 'text-slate-400'}`}>Contributors</div>
            <div className={`text-xl font-black font-mono ${darkMode ? 'text-white' : 'text-slate-900'}`}>{totalEmployees}</div>
          </div>
        </div>

        <div className={`border rounded-2xl p-4 flex items-center space-x-3 ${
          darkMode ? 'bg-[#052345]/80 border-sky-800/50' : 'bg-slate-50/80 border-slate-200/60'
        }`}>
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-[10px] font-mono uppercase font-bold ${darkMode ? 'text-sky-300/70' : 'text-slate-400'}`}>Top Contributor</div>
            <div className={`text-sm font-black truncate max-w-[120px] ${darkMode ? 'text-white' : 'text-slate-900'}`} title={topPerformer?.name}>
              {topPerformer ? topPerformer.name : 'N/A'}
            </div>
            <div className="text-[10px] text-amber-400 font-bold font-mono">
              {topPerformer ? `${topPerformer.total} sheets` : '0'}
            </div>
          </div>
        </div>

        <div className={`border rounded-2xl p-4 flex items-center space-x-3 ${
          darkMode ? 'bg-[#052345]/80 border-sky-800/50' : 'bg-slate-50/80 border-slate-200/60'
        }`}>
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-[10px] font-mono uppercase font-bold ${darkMode ? 'text-sky-300/70' : 'text-slate-400'}`}>Avg / Employee</div>
            <div className="text-xl font-black text-emerald-400 font-mono">{avgKaizensPerEmp}</div>
          </div>
        </div>

        <div className={`border rounded-2xl p-4 flex items-center space-x-3 ${
          darkMode ? 'bg-[#052345]/80 border-sky-800/50' : 'bg-slate-50/80 border-slate-200/60'
        }`}>
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-[10px] font-mono uppercase font-bold ${darkMode ? 'text-sky-300/70' : 'text-slate-400'}`}>Audited Savings</div>
            <div className={`text-sm font-black font-mono ${darkMode ? 'text-sky-200' : 'text-indigo-900'}`}>
              {formatIndianRupeesCompact(employeeStats.reduce((s, e) => s + e.totalSavings, 0))}
            </div>
          </div>
        </div>
      </div>

      {/* TOP 3 PODIUM - GAMIFICATION DISPLAY */}
      {topThree.length >= 1 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              darkMode ? 'text-sky-300' : 'text-slate-500'
            }`}>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Kaizen Champions Podium</span>
            </span>
            <span className={`text-[10px] font-mono ${darkMode ? 'text-sky-400/60' : 'text-slate-400'}`}>Ranked by total validated contributions</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1st Place - Gold */}
            {topThree[0] && (
              <div className={`rounded-3xl p-5 shadow-xs relative overflow-hidden order-1 md:order-2 md:-translate-y-2 transition ${
                darkMode
                  ? 'bg-gradient-to-b from-amber-950/40 via-amber-900/20 to-[#04203e] border-2 border-amber-400/80 text-white'
                  : 'bg-gradient-to-b from-amber-50/90 via-amber-50/40 to-white border-2 border-amber-300 text-slate-900'
              }`}>
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-amber-500 text-slate-950 font-black text-[10px] px-3 py-1 rounded-bl-xl font-mono uppercase flex items-center gap-1 shadow-xs">
                  <CrownIcon /> <span>#1 GOLD CHAMPION</span>
                </div>
                <div className="flex items-center space-x-3 mb-3 mt-2">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-base shadow-sm ring-4 ring-amber-200/50">
                    🥇
                  </div>
                  <div className="truncate">
                    <h3 className={`text-sm font-black truncate ${darkMode ? 'text-white' : 'text-slate-900'}`} title={topThree[0].name}>
                      {topThree[0].name}
                    </h3>
                    <div className={`flex items-center space-x-1.5 text-[11px] font-mono ${darkMode ? 'text-sky-300' : 'text-slate-500'}`}>
                      <span>{topThree[0].minifactories.join(', ') || 'Plant'}</span>
                    </div>
                  </div>
                </div>
                <div className={`grid grid-cols-2 gap-2 mt-4 pt-3 border-t font-mono ${
                  darkMode ? 'border-amber-400/20' : 'border-amber-100'
                }`}>
                  <div className={`p-2 rounded-xl border ${
                    darkMode ? 'bg-[#031a33]/90 border-amber-400/30' : 'bg-white/80 border-amber-200/60'
                  }`}>
                    <div className={`text-[10px] font-bold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>Total Kaizens</div>
                    <div className="text-lg font-black text-amber-400">{topThree[0].total}</div>
                  </div>
                  <div className={`p-2 rounded-xl border ${
                    darkMode ? 'bg-[#031a33]/90 border-amber-400/30' : 'bg-white/80 border-amber-200/60'
                  }`}>
                    <div className={`text-[10px] font-bold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>Savings</div>
                    <div className="text-sm font-black text-emerald-400 truncate">
                      {formatIndianRupeesCompact(topThree[0].totalSavings)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2nd Place - Silver */}
            {topThree[1] && (
              <div className={`rounded-3xl p-5 shadow-xs relative overflow-hidden order-2 md:order-1 transition ${
                darkMode
                  ? 'bg-gradient-to-b from-slate-900/50 via-slate-800/30 to-[#04203e] border border-slate-500/60 text-white'
                  : 'bg-gradient-to-b from-slate-50 via-slate-50/40 to-white border border-slate-300 text-slate-900'
              }`}>
                <div className="absolute top-0 right-0 bg-slate-200 text-slate-700 font-black text-[10px] px-3 py-1 rounded-bl-xl font-mono uppercase">
                  #2 SILVER
                </div>
                <div className="flex items-center space-x-3 mb-3 mt-2">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 flex items-center justify-center font-black text-base shadow-sm ring-4 ring-slate-100/40">
                    🥈
                  </div>
                  <div className="truncate">
                    <h3 className={`text-sm font-black truncate ${darkMode ? 'text-white' : 'text-slate-900'}`} title={topThree[1].name}>
                      {topThree[1].name}
                    </h3>
                    <div className={`flex items-center space-x-1.5 text-[11px] font-mono ${darkMode ? 'text-sky-300' : 'text-slate-500'}`}>
                      <span>{topThree[1].minifactories.join(', ') || 'Plant'}</span>
                    </div>
                  </div>
                </div>
                <div className={`grid grid-cols-2 gap-2 mt-4 pt-3 border-t font-mono ${
                  darkMode ? 'border-slate-700' : 'border-slate-100'
                }`}>
                  <div className={`p-2 rounded-xl border ${
                    darkMode ? 'bg-[#031a33]/90 border-slate-700' : 'bg-white/80 border-slate-200/60'
                  }`}>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Total Kaizens</div>
                    <div className={`text-base font-black ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{topThree[1].total}</div>
                  </div>
                  <div className={`p-2 rounded-xl border ${
                    darkMode ? 'bg-[#031a33]/90 border-slate-700' : 'bg-white/80 border-slate-200/60'
                  }`}>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Savings</div>
                    <div className="text-sm font-black text-emerald-400 truncate">
                      {formatIndianRupeesCompact(topThree[1].totalSavings)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place - Bronze */}
            {topThree[2] && (
              <div className={`rounded-3xl p-5 shadow-xs relative overflow-hidden order-3 md:order-3 transition ${
                darkMode
                  ? 'bg-gradient-to-b from-orange-950/40 via-orange-900/20 to-[#04203e] border border-orange-500/50 text-white'
                  : 'bg-gradient-to-b from-orange-50/60 via-orange-50/20 to-white border border-orange-200 text-slate-900'
              }`}>
                <div className="absolute top-0 right-0 bg-orange-200 text-orange-800 font-black text-[10px] px-3 py-1 rounded-bl-xl font-mono uppercase">
                  #3 BRONZE
                </div>
                <div className="flex items-center space-x-3 mb-3 mt-2">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-center font-black text-base shadow-sm ring-4 ring-orange-200/40">
                    🥉
                  </div>
                  <div className="truncate">
                    <h3 className={`text-sm font-black truncate ${darkMode ? 'text-white' : 'text-slate-900'}`} title={topThree[2].name}>
                      {topThree[2].name}
                    </h3>
                    <div className={`flex items-center space-x-1.5 text-[11px] font-mono ${darkMode ? 'text-sky-300' : 'text-slate-500'}`}>
                      <span>{topThree[2].minifactories.join(', ') || 'Plant'}</span>
                    </div>
                  </div>
                </div>
                <div className={`grid grid-cols-2 gap-2 mt-4 pt-3 border-t font-mono ${
                  darkMode ? 'border-orange-500/30' : 'border-orange-100'
                }`}>
                  <div className={`p-2 rounded-xl border ${
                    darkMode ? 'bg-[#031a33]/90 border-slate-700' : 'bg-white/80 border-orange-200/60'
                  }`}>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Total Kaizens</div>
                    <div className={`text-base font-black ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{topThree[2].total}</div>
                  </div>
                  <div className={`p-2 rounded-xl border ${
                    darkMode ? 'bg-[#031a33]/90 border-slate-700' : 'bg-white/80 border-orange-200/60'
                  }`}>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Savings</div>
                    <div className="text-sm font-black text-emerald-400 truncate">
                      {formatIndianRupeesCompact(topThree[2].totalSavings)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GRAPH & DETAILED TABLE CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* TOP PERFORMERS BAR GRAPH */}
        <div className={`lg:col-span-5 rounded-3xl p-5 sm:p-6 shadow-sm border space-y-4 flex flex-col justify-between ${
          darkMode
            ? 'bg-[#052345]/90 border-sky-800/60 text-white'
            : 'bg-slate-900 text-white border-slate-800'
        }`}>
          <div>
            <div className={`flex items-center justify-between border-b pb-3 ${
              darkMode ? 'border-sky-800/50' : 'border-slate-800'
            }`}>
              <div>
                <h3 className="text-xs font-black uppercase font-mono tracking-wider text-amber-400 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span>Contribution Volume Chart</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Top contributors by number of Kaizens logged</p>
              </div>
              <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded ${
                darkMode ? 'bg-[#031a33] text-sky-300' : 'bg-slate-800 text-slate-300'
              }`}>
                TOP 8
              </span>
            </div>

            {/* Horizontal Bar Chart */}
            <div className="space-y-3.5 mt-5">
              {chartData.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No employee Kaizens recorded for the current filter.
                </div>
              ) : (
                chartData.map((emp, idx) => {
                  const widthPct = Math.max((emp.total / maxChartCount) * 100, 8);
                  return (
                    <div key={emp.name} className="space-y-1 font-mono">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5 truncate max-w-[180px]" title={emp.name}>
                          <span className="text-[10px] text-amber-400 font-black">#{idx + 1}</span>
                          <span className="truncate">{emp.name}</span>
                        </span>
                        <div className="flex items-center gap-2 text-[11px] shrink-0">
                          <span className="text-emerald-400 font-bold">{emp.approved} app</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-amber-400 font-black">{emp.total} total</span>
                        </div>
                      </div>

                      {/* Bar with gradient and segment breakdown */}
                      <div className={`w-full h-2.5 rounded-full overflow-hidden flex ${
                        darkMode ? 'bg-[#031a33]' : 'bg-slate-800'
                      }`}>
                        <div
                          className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 h-full rounded-full transition-all duration-700 shadow-xs"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className={`pt-3 border-t flex items-center justify-between text-[10px] font-mono text-slate-400 ${
            darkMode ? 'border-sky-800/50' : 'border-slate-800/80'
          }`}>
            <span>Bar scale based on top submitter</span>
            <span className="text-amber-400 font-bold">Max: {maxChartCount} Kaizens</span>
          </div>
        </div>

        {/* DETAILED LEADERBOARD TABLE */}
        <div className={`lg:col-span-7 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4 border ${
          darkMode
            ? 'bg-[#052345]/90 border-sky-800/60 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${
            darkMode ? 'border-sky-800/50' : 'border-slate-100'
          }`}>
            <div>
              <h3 className={`text-xs font-black uppercase font-mono tracking-wider flex items-center gap-1.5 ${
                darkMode ? 'text-white' : 'text-slate-800'
              }`}>
                <Award className="w-4 h-4 text-indigo-400" />
                <span>Employee Registry & Audit Roster</span>
              </h3>
              <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-sky-300/70' : 'text-slate-400'}`}>
                Showing {filteredEmployees.length} of {employeeStats.length} contributing operators
              </p>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              darkMode ? 'bg-[#031a33] text-sky-300' : 'bg-slate-100 text-slate-500'
            }`}>
              ROSTER
            </span>
          </div>

          <div className={`overflow-x-auto max-h-[380px] overflow-y-auto divide-y ${
            darkMode ? 'divide-sky-900/40' : 'divide-slate-100'
          }`}>
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className={`text-[10px] uppercase ${darkMode ? 'text-sky-300/70 border-b border-sky-800/50' : 'text-slate-400 border-b border-slate-100'}`}>
                  <th className="pb-2.5 font-bold">Contributor</th>
                  <th className="pb-2.5 font-bold text-center">Minifactory</th>
                  <th className="pb-2.5 font-bold text-center">Approved</th>
                  <th className="pb-2.5 font-bold text-center">Total</th>
                  <th className="pb-2.5 font-bold text-right">Savings (₹)</th>
                  <th className="pb-2.5 font-bold text-center w-8">Sheet</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-sky-900/40' : 'divide-slate-100'}`}>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No matching employee records found.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp, index) => (
                    <tr
                      key={emp.name}
                      onClick={() => {
                        if (emp.latestKaizen && onSelectKaizen) {
                          onSelectKaizen(emp.latestKaizen);
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        darkMode ? 'hover:bg-sky-950/60' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] w-5 font-bold ${
                            index === 0
                              ? 'text-amber-400 font-black'
                              : index === 1
                              ? 'text-slate-300 font-black'
                              : index === 2
                              ? 'text-orange-400 font-black'
                              : darkMode
                              ? 'text-sky-400/50'
                              : 'text-slate-400'
                          }`}>
                            #{index + 1}
                          </span>
                          <span className={`font-bold truncate max-w-[150px] ${darkMode ? 'text-slate-100' : 'text-slate-800'}`} title={emp.name}>
                            {emp.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 text-center px-1">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {emp.minifactories.map(mf => (
                            <span
                              key={mf}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                darkMode ? 'bg-[#031a33] text-sky-200 border border-sky-800/60' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {mf}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-2.5 text-center font-bold text-emerald-400">
                        {emp.approved}
                      </td>

                      <td className="py-2.5 text-center font-black">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          darkMode ? 'bg-sky-950/80 text-sky-300' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {emp.total}
                        </span>
                      </td>

                      <td className="py-2.5 text-right font-bold text-emerald-400">
                        {emp.totalSavings > 0 ? formatIndianRupeesCompact(emp.totalSavings) : '₹0'}
                      </td>

                      <td className="py-2.5 text-center">
                        {emp.latestKaizen && onSelectKaizen ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (emp.latestKaizen && onSelectKaizen) {
                                onSelectKaizen(emp.latestKaizen);
                              }
                            }}
                            className={`p-1 rounded transition ${
                              darkMode
                                ? 'text-sky-400 hover:text-white hover:bg-sky-800/50'
                                : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                            title="View Kaizen sheet"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <ChevronRight className={`w-4 h-4 ${darkMode ? 'text-sky-900' : 'text-slate-300'}`} />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}

function CrownIcon() {
  return (
    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5m14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
    </svg>
  );
}
