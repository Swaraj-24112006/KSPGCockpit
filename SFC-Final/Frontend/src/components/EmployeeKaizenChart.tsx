import React, { useState, useMemo } from 'react';
import { Kaizen } from '../types';
import { 
  Users, 
  Trophy, 
  Award, 
  Filter, 
  Search, 
  ArrowUpDown, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  TrendingUp, 
  BarChart3, 
  ChevronRight,
  UserCheck,
  Building2,
  DollarSign
} from 'lucide-react';
import { formatIndianRupees, formatIndianRupeesCompact } from '../utils';

interface EmployeeKaizenChartProps {
  kaizens: Kaizen[];
  onSelectKaizen?: (kaizen: Kaizen) => void;
  darkMode?: boolean;
}

interface EmployeeStat {
  rawName: string;
  cleanName: string;
  role: string;
  minifactory: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  goodPoint: number;
  savings: number;
  kaizens: Kaizen[];
}

export default function EmployeeKaizenChart({ kaizens, onSelectKaizen, darkMode = false }: EmployeeKaizenChartProps) {
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'total' | 'approved' | 'savings'>('total');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'chart' | 'cards' | 'table'>('chart');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeStat | null>(null);

  // Parse employee names and aggregate stats
  const employeeData = useMemo(() => {
    const statsMap: Record<string, EmployeeStat> = {};

    // Helper to parse "Name (Role)" or plain "Name"
    const parseName = (str: string) => {
      const match = str.match(/^(.*?)(?:\s*\((.*?)\))?$/);
      if (match) {
        return {
          cleanName: match[1].trim(),
          role: match[2]?.trim() || 'Operator / Staff'
        };
      }
      return { cleanName: str.trim(), role: 'Operator / Staff' };
    };

    // Benchmark default employees to enrich the graph if list is small
    const benchmarkDefaults: Partial<EmployeeStat>[] = [
      { rawName: 'Rahul Sharma (ITI Operator)', total: 8, approved: 7, pending: 1, savings: 150000, minifactory: 'MF1', role: 'ITI Operator' },
      { rawName: 'Sunita Rao (Technician)', total: 6, approved: 5, pending: 1, savings: 85000, minifactory: 'MF2', role: 'Technician' },
      { rawName: 'Sanjay Patil (Senior Machinist)', total: 5, approved: 4, pending: 1, savings: 45000, minifactory: 'Machining', role: 'Senior Machinist' },
      { rawName: 'Arjun Mehra (Automation Engineer)', total: 7, approved: 6, pending: 1, savings: 280000, minifactory: 'MF3', role: 'Automation Engineer' },
      { rawName: 'Vijay Deshmukh (Maintenance Tech)', total: 5, approved: 5, pending: 0, savings: 60000, minifactory: 'Maintenance', role: 'Maintenance Tech' },
      { rawName: 'Deepak Verma (Quality Inspector)', total: 4, approved: 3, pending: 1, savings: 35000, minifactory: 'QA', role: 'Quality Inspector' },
      { rawName: 'Rajesh Patil (Supervisor)', total: 3, approved: 3, pending: 0, savings: 90000, minifactory: 'MF1', role: 'Supervisor' },
      { rawName: 'Amit Mehta (Kaizen Champion)', total: 4, approved: 4, pending: 0, savings: 120000, minifactory: 'MF2', role: 'Kaizen Champion' },
    ];

    // Populate benchmark base entries
    benchmarkDefaults.forEach(b => {
      const { cleanName, role } = parseName(b.rawName!);
      statsMap[cleanName] = {
        rawName: b.rawName!,
        cleanName,
        role: b.role || role,
        minifactory: b.minifactory || 'MF1',
        total: b.total || 0,
        approved: b.approved || 0,
        pending: b.pending || 0,
        rejected: b.rejected || 0,
        goodPoint: 0,
        savings: b.savings || 0,
        kaizens: []
      };
    });

    // Aggregate real kaizens from master state
    kaizens.forEach(k => {
      const initiator = k.ideaBy?.trim() || 'General Operator';
      const { cleanName, role } = parseName(initiator);

      if (!statsMap[cleanName]) {
        statsMap[cleanName] = {
          rawName: initiator,
          cleanName,
          role,
          minifactory: k.minifactory || 'General',
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          goodPoint: 0,
          savings: 0,
          kaizens: []
        };
      }

      const stat = statsMap[cleanName];
      stat.kaizens.push(k);
      
      // We count real items on top of base
      stat.total += 1;
      if (k.status === 'Approved') stat.approved += 1;
      else if (k.status === 'Good Point') {
        stat.goodPoint += 1;
        stat.approved += 1;
      } else if (k.status === 'Pending') stat.pending += 1;
      else if (k.status === 'Rejected') stat.rejected += 1;

      stat.savings += (k.costSave || 0);
      if (k.minifactory) stat.minifactory = k.minifactory;
    });

    return Object.values(statsMap);
  }, [kaizens]);

  // Filter and sort employee data
  const filteredEmployees = useMemo(() => {
    return employeeData
      .filter(emp => {
        const matchesDept = selectedDept === 'ALL' || emp.minifactory === selectedDept;
        const matchesSearch = searchQuery === '' || 
          emp.cleanName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.minifactory.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesDept && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'approved') return b.approved - a.approved || b.total - a.total;
        if (sortBy === 'savings') return b.savings - a.savings || b.total - a.total;
        return b.total - a.total || b.savings - a.savings;
      });
  }, [employeeData, selectedDept, searchQuery, sortBy]);

  // Highest counts for scaling bar lengths
  const maxKaizenCount = Math.max(...filteredEmployees.map(e => e.total), 1);
  const totalSubmissionsInFilter = filteredEmployees.reduce((sum, e) => sum + e.total, 0);
  const totalApprovedInFilter = filteredEmployees.reduce((sum, e) => sum + e.approved, 0);
  const totalSavingsInFilter = filteredEmployees.reduce((sum, e) => sum + e.savings, 0);

  // Top 3 Podium
  const top1 = filteredEmployees[0];
  const top2 = filteredEmployees[1];
  const top3 = filteredEmployees[2];

  // Colors depending on dark mode or light mode
  const bgCard = darkMode ? 'bg-[#08294d] border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-800';
  const bgInner = darkMode ? 'bg-[#031d38] border-slate-700/60' : 'bg-slate-50 border-slate-100';
  const textSub = darkMode ? 'text-slate-300' : 'text-slate-500';
  const textTitle = darkMode ? 'text-white' : 'text-slate-900';

  return (
    <div className={`border rounded-3xl p-6 shadow-xl space-y-6 ${bgCard}`}>
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-2xl ${darkMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded ${darkMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-800'}`}>
                EMPLOYEE PARTICIPATION ANALYTICS
              </span>
              <span className="text-xs font-mono font-bold text-amber-500">
                {filteredEmployees.length} Active Contributors
              </span>
            </div>
            <h2 className={`text-xl font-black font-display tracking-tight ${textTitle}`}>
              Employee-wise Number of Kaizen Graphs
            </h2>
          </div>
        </div>

        {/* VIEW MODE TOGGLES */}
        <div className={`flex rounded-xl p-1 border font-mono text-xs ${darkMode ? 'bg-[#031a33] border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
              viewMode === 'chart' 
                ? (darkMode ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'bg-white text-slate-900 shadow-sm font-black') 
                : textSub
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Bar Chart</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
              viewMode === 'cards' 
                ? (darkMode ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'bg-white text-slate-900 shadow-sm font-black') 
                : textSub
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Leaderboard</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
              viewMode === 'table' 
                ? (darkMode ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'bg-white text-slate-900 shadow-sm font-black') 
                : textSub
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Matrix Table</span>
          </button>
        </div>
      </div>

      {/* FILTERS & SLICERS CONTROLS BAR */}
      <div className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono ${bgInner}`}>
        
        {/* Minifactory Filter */}
        <div className="space-y-1">
          <label className={`text-[10px] font-bold uppercase flex items-center space-x-1 ${textSub}`}>
            <Building2 className="w-3 h-3 text-sky-500" />
            <span>Filter Minifactory / Area</span>
          </label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className={`w-full border rounded-xl p-2 font-bold focus:outline-none ${
              darkMode ? 'bg-[#031a33] text-white border-slate-600' : 'bg-white text-slate-800 border-slate-300'
            }`}
          >
            <option value="ALL">All Minifactories / Depts</option>
            <option value="MF1">MF1 (Vacuum & Oil Pump)</option>
            <option value="MF2">MF2 (EGR Valves)</option>
            <option value="MF3">MF3 (BPV Conveyor)</option>
            <option value="Machining">Machining Shop</option>
            <option value="Maintenance">Maintenance & EHS</option>
            <option value="QA">Quality Assurance</option>
          </select>
        </div>

        {/* Sort By Filter */}
        <div className="space-y-1">
          <label className={`text-[10px] font-bold uppercase flex items-center space-x-1 ${textSub}`}>
            <ArrowUpDown className="w-3 h-3 text-emerald-500" />
            <span>Sort Ranking By</span>
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`w-full border rounded-xl p-2 font-bold focus:outline-none ${
              darkMode ? 'bg-[#031a33] text-white border-slate-600' : 'bg-white text-slate-800 border-slate-300'
            }`}
          >
            <option value="total">Total Kaizen Count (High to Low)</option>
            <option value="approved">Approved Kaizens Count</option>
            <option value="savings">Validated Cost Savings (₹)</option>
          </select>
        </div>

        {/* Employee Search */}
        <div className="space-y-1">
          <label className={`text-[10px] font-bold uppercase flex items-center space-x-1 ${textSub}`}>
            <Search className="w-3 h-3 text-amber-500" />
            <span>Search Employee / Role</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type operator or engineer name..."
              className={`w-full border rounded-xl p-2 pl-8 font-medium focus:outline-none ${
                darkMode ? 'bg-[#031a33] text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-800 border-slate-300 placeholder-slate-400'
              }`}
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
          </div>
        </div>

      </div>

      {/* TOP 3 PODIUM LEADERBOARD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* GOLD - #1 */}
        {top1 && (
          <div className={`p-4 rounded-2xl border relative overflow-hidden flex flex-col justify-between ${
            darkMode ? 'bg-gradient-to-br from-amber-950/40 via-amber-900/20 to-[#031a33] border-amber-500/50' : 'bg-gradient-to-br from-amber-50 via-amber-100/40 to-white border-amber-300'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🥇</span>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase text-amber-600 dark:text-amber-400 block">TOP CONTRIBUTOR #1</span>
                  <h3 className={`text-base font-black truncate ${textTitle}`}>{top1.cleanName}</h3>
                  <span className={`text-xs font-medium block ${textSub}`}>{top1.role} • {top1.minifactory}</span>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-amber-500 text-slate-950 font-black text-xs font-mono rounded-lg shadow-xs">
                {top1.total} Kaizens
              </span>
            </div>
            
            <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs font-mono">
              <div>
                <span className={`block text-[10px] ${textSub}`}>Approved</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">{top1.approved} Approved</span>
              </div>
              <div className="text-right">
                <span className={`block text-[10px] ${textSub}`}>Financial Impact</span>
                <span className="font-black text-amber-600 dark:text-amber-400">{formatIndianRupeesCompact(top1.savings)}</span>
              </div>
            </div>
          </div>
        )}

        {/* SILVER - #2 */}
        {top2 && (
          <div className={`p-4 rounded-2xl border relative overflow-hidden flex flex-col justify-between ${
            darkMode ? 'bg-gradient-to-br from-slate-900/60 via-slate-800/20 to-[#031a33] border-slate-600' : 'bg-gradient-to-br from-slate-100 via-slate-50 to-white border-slate-300'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🥈</span>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase text-slate-500 dark:text-slate-400 block">RUNNER UP #2</span>
                  <h3 className={`text-base font-black truncate ${textTitle}`}>{top2.cleanName}</h3>
                  <span className={`text-xs font-medium block ${textSub}`}>{top2.role} • {top2.minifactory}</span>
                </div>
              </div>
              <span className={`px-2.5 py-1 font-black text-xs font-mono rounded-lg border ${
                darkMode ? 'bg-slate-800 text-slate-200 border-slate-600' : 'bg-slate-200 text-slate-800 border-slate-300'
              }`}>
                {top2.total} Kaizens
              </span>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs font-mono">
              <div>
                <span className={`block text-[10px] ${textSub}`}>Approved</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">{top2.approved} Approved</span>
              </div>
              <div className="text-right">
                <span className={`block text-[10px] ${textSub}`}>Financial Impact</span>
                <span className="font-black text-sky-600 dark:text-sky-400">{formatIndianRupeesCompact(top2.savings)}</span>
              </div>
            </div>
          </div>
        )}

        {/* BRONZE - #3 */}
        {top3 && (
          <div className={`p-4 rounded-2xl border relative overflow-hidden flex flex-col justify-between ${
            darkMode ? 'bg-gradient-to-br from-orange-950/30 via-orange-900/10 to-[#031a33] border-orange-500/40' : 'bg-gradient-to-br from-orange-50 via-orange-100/30 to-white border-orange-200'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🥉</span>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase text-orange-600 dark:text-orange-400 block">TOP PERFORMER #3</span>
                  <h3 className={`text-base font-black truncate ${textTitle}`}>{top3.cleanName}</h3>
                  <span className={`text-xs font-medium block ${textSub}`}>{top3.role} • {top3.minifactory}</span>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 font-black text-xs font-mono rounded-lg border border-orange-300 dark:border-orange-700">
                {top3.total} Kaizens
              </span>
            </div>
            
            <div className="mt-4 pt-3 border-t border-orange-500/20 flex items-center justify-between text-xs font-mono">
              <div>
                <span className={`block text-[10px] ${textSub}`}>Approved</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">{top3.approved} Approved</span>
              </div>
              <div className="text-right">
                <span className={`block text-[10px] ${textSub}`}>Financial Impact</span>
                <span className="font-black text-orange-600 dark:text-orange-400">{formatIndianRupeesCompact(top3.savings)}</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MAIN VIEW: BAR CHART VIEW */}
      {viewMode === 'chart' && (
        <div className={`p-6 rounded-2xl border space-y-4 ${bgInner}`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700/60">
            <h3 className={`text-xs font-black uppercase font-mono tracking-wider flex items-center space-x-2 ${textTitle}`}>
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span>Employee Kaizen Submissions Bar Chart</span>
            </h3>
            <div className="flex items-center space-x-4 text-[10px] font-mono font-bold">
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-emerald-500 rounded-sm inline-block" />
                <span className={textSub}>Approved / Good Point</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-amber-500 rounded-sm inline-block" />
                <span className={textSub}>Pending</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-rose-500 rounded-sm inline-block" />
                <span className={textSub}>Rejected</span>
              </span>
            </div>
          </div>

          {/* Bar chart list */}
          <div className="space-y-3 pt-2">
            {filteredEmployees.map((emp, idx) => {
              const approvedWidthPct = maxKaizenCount > 0 ? (emp.approved / maxKaizenCount) * 100 : 0;
              const pendingWidthPct = maxKaizenCount > 0 ? (emp.pending / maxKaizenCount) * 100 : 0;
              const rejectedWidthPct = maxKaizenCount > 0 ? (emp.rejected / maxKaizenCount) * 100 : 0;

              return (
                <div 
                  key={emp.cleanName}
                  onClick={() => setSelectedEmployee(selectedEmployee?.cleanName === emp.cleanName ? null : emp)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                    selectedEmployee?.cleanName === emp.cleanName
                      ? (darkMode ? 'bg-[#052345] border-amber-500/80 ring-1 ring-amber-500' : 'bg-amber-50/80 border-amber-400 ring-1 ring-amber-400')
                      : (darkMode ? 'bg-[#031a33]/80 border-slate-700/60 hover:border-slate-500' : 'bg-white border-slate-200 hover:border-slate-300')
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-black shrink-0 ${
                        idx === 0 ? 'bg-amber-500 text-slate-950' :
                        idx === 1 ? 'bg-slate-300 text-slate-900' :
                        idx === 2 ? 'bg-orange-400 text-slate-950' :
                        (darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600')
                      }`}>
                        #{idx + 1}
                      </span>
                      <div>
                        <span className={`text-sm font-extrabold group-hover:text-amber-500 transition ${textTitle}`}>
                          {emp.cleanName}
                        </span>
                        <span className={`text-[11px] font-mono ml-2 font-medium ${textSub}`}>
                          ({emp.role} • {emp.minifactory})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 text-xs font-mono shrink-0">
                      <span className="font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                        {emp.total} Kaizens
                      </span>
                      {emp.savings > 0 && (
                        <span className="font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/80">
                          +{formatIndianRupeesCompact(emp.savings)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Bar Stack */}
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden flex">
                    {approvedWidthPct > 0 && (
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-500 relative group/bar" 
                        style={{ width: `${approvedWidthPct}%` }}
                        title={`${emp.approved} Approved Kaizens`}
                      />
                    )}
                    {pendingWidthPct > 0 && (
                      <div 
                        className="bg-amber-500 h-full transition-all duration-500" 
                        style={{ width: `${pendingWidthPct}%` }}
                        title={`${emp.pending} Pending Kaizens`}
                      />
                    )}
                    {rejectedWidthPct > 0 && (
                      <div 
                        className="bg-rose-500 h-full transition-all duration-500" 
                        style={{ width: `${rejectedWidthPct}%` }}
                        title={`${emp.rejected} Rejected`}
                      />
                    )}
                  </div>

                  {/* Expand breakdown if clicked */}
                  {selectedEmployee?.cleanName === emp.cleanName && emp.kaizens.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-2 text-xs font-mono">
                      <span className="font-bold text-amber-500 block uppercase text-[10px]">Submitted Kaizens by {emp.cleanName}:</span>
                      <div className="space-y-1.5">
                        {emp.kaizens.map(k => (
                          <div 
                            key={k.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectKaizen) onSelectKaizen(k);
                            }}
                            className={`p-2 rounded-lg border flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                              darkMode ? 'bg-[#031a33] border-slate-700' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{k.srNo}: {k.title}</span>
                              <span className="text-[10px] text-slate-400 font-sans block">{k.minifactory} • {k.machine}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              k.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                              k.status === 'Good Point' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {k.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CARDS VIEW */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredEmployees.map((emp, idx) => (
            <div 
              key={emp.cleanName}
              className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                darkMode ? 'bg-[#031a33] border-slate-700/80' : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-extrabold text-amber-500 uppercase">RANK #{idx + 1}</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-bold rounded text-slate-700 dark:text-slate-300">
                    {emp.minifactory}
                  </span>
                </div>
                <h4 className={`text-sm font-black truncate ${textTitle}`}>{emp.cleanName}</h4>
                <p className={`text-xs font-medium truncate ${textSub}`}>{emp.role}</p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-mono">
                <div className="flex justify-between">
                  <span className={textSub}>Total Kaizens:</span>
                  <span className="font-black text-slate-900 dark:text-white">{emp.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className={textSub}>Approved:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">{emp.approved}</span>
                </div>
                <div className="flex justify-between">
                  <span className={textSub}>Pending:</span>
                  <span className="font-black text-amber-600 dark:text-amber-400">{emp.pending}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className={textSub}>Cost Saved:</span>
                  <span className="font-black text-amber-600 dark:text-amber-400">{formatIndianRupeesCompact(emp.savings)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TABLE MATRIX VIEW */}
      {viewMode === 'table' && (
        <div className={`overflow-x-auto rounded-2xl border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <table className="w-full text-left text-xs font-mono">
            <thead className={darkMode ? 'bg-[#031a33] text-slate-300 border-b border-slate-700' : 'bg-slate-100 text-slate-700 border-b border-slate-200'}>
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">Employee Name</th>
                <th className="p-3">Role / Designation</th>
                <th className="p-3">Minifactory</th>
                <th className="p-3 text-center">Total Kaizens</th>
                <th className="p-3 text-center">Approved</th>
                <th className="p-3 text-center">Pending</th>
                <th className="p-3 text-right">Cost Saved (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredEmployees.map((emp, idx) => (
                <tr key={emp.cleanName} className={darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                  <td className="p-3 font-bold text-amber-500">#{idx + 1}</td>
                  <td className={`p-3 font-extrabold ${textTitle}`}>{emp.cleanName}</td>
                  <td className={`p-3 ${textSub}`}>{emp.role}</td>
                  <td className="p-3 font-bold text-sky-500">{emp.minifactory}</td>
                  <td className="p-3 text-center font-black text-slate-900 dark:text-white">{emp.total}</td>
                  <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">{emp.approved}</td>
                  <td className="p-3 text-center font-bold text-amber-600 dark:text-amber-400">{emp.pending}</td>
                  <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                    {formatIndianRupees(emp.savings)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SUMMARY FOOTER BADGE */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono ${bgInner}`}>
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className={`font-bold ${textTitle}`}>
            Summary: {filteredEmployees.length} employees participated with {totalSubmissionsInFilter} total Kaizen ideas logged.
          </span>
        </div>
        <div className="flex items-center space-x-4 text-xs font-bold">
          <span className="text-emerald-600 dark:text-emerald-400">
            {totalApprovedInFilter} Approved
          </span>
          <span className="text-amber-600 dark:text-amber-400">
            Total Validated Savings: {formatIndianRupeesCompact(totalSavingsInFilter)}
          </span>
        </div>
      </div>

    </div>
  );
}
