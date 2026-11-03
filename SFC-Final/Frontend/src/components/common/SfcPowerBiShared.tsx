import React, { useState, useMemo, createContext, useContext } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  ReferenceLine,
  LabelList
} from 'recharts';
import {
  ArrowUp,
  ArrowDown,
  ChevronsDown,
  Maximize2,
  Minimize2,
  RotateCcw,
  ChevronRight,
  Sparkles,
  Layers
} from 'lucide-react';

// ============================================================================
// EXECUTIVE ANALYTICS COLOR PALETTE & CHART TOKENS
// Inspired by signature Deep Navy (#051C2C), Royal Cobalt (#005EB8),
// Electric Cerulean (#0284C7), Deep Teal (#0D9488), and Warm Amber (#D97706)
// ============================================================================
export const SFC_PALETTE = {
  navy: '#051C2C',
  cobalt: '#005EB8',
  cerulean: '#0284C7',
  teal: '#0D9488',
  emerald: '#059669',
  indigo: '#1E40AF',
  amber: '#D97706',
  rose: '#E11D48',
  violet: '#4F46E5',
  slate: '#475569',
  categorical: [
    '#051C2C', // Deep Executive Navy
    '#005EB8', // Royal Cobalt Blue
    '#0284C7', // Cerulean Cyan
    '#0D9488', // Deep Teal
    '#1E40AF', // Executive Indigo
    '#D97706', // Warm Amber
    '#334155', // Structural Slate
    '#059669'  // Emerald
  ]
};

export const VisualExpandContext = createContext<boolean>(false);
export const useVisualExpand = () => useContext(VisualExpandContext);

export interface DrillBreadcrumbItem {
  label: string;
  value?: string;
  level: number;
}

interface PowerBiVisualCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  accentColor?: 'emerald' | 'indigo' | 'sky' | 'amber' | 'rose' | 'violet' | 'slate';
  darkTheme?: boolean;
  drillLevel?: number;
  maxDrillLevel?: number;
  drillBreadcrumbs?: DrillBreadcrumbItem[];
  onDrillUp?: () => void;
  onDrillToLevel?: (level: number) => void;
  onExpandNextLevel?: () => void;
  drillModeActive?: boolean;
  onToggleDrillMode?: () => void;
  headerRight?: React.ReactNode;
  insightText?: string;
  insightHighlight?: string;
  children: React.ReactNode | ((isExpanded: boolean) => React.ReactNode);
  className?: string;
}

export function PowerBiVisualCard({
  title,
  subtitle,
  badge,
  accentColor = 'sky',
  darkTheme = false,
  drillLevel = 0,
  maxDrillLevel = 0,
  drillBreadcrumbs = [],
  onDrillUp,
  onDrillToLevel,
  onExpandNextLevel,
  drillModeActive,
  onToggleDrillMode,
  headerRight,
  insightText,
  insightHighlight,
  children,
  className = ''
}: PowerBiVisualCardProps) {
  const [isFocused, setIsFocused] = useState(false);

  const topBorderMap: Record<string, string> = darkTheme
    ? {
        emerald: 'border-t-emerald-500',
        indigo: 'border-t-blue-500',
        sky: 'border-t-sky-500',
        amber: 'border-t-amber-500',
        rose: 'border-t-rose-500',
        violet: 'border-t-indigo-400',
        slate: 'border-t-slate-500'
      }
    : {
        emerald: 'border-t-[#0D9488]',
        indigo: 'border-t-[#051C2C]',
        sky: 'border-t-[#005EB8]',
        amber: 'border-t-[#D97706]',
        rose: 'border-t-[#E11D48]',
        violet: 'border-t-[#1E40AF]',
        slate: 'border-t-[#334155]'
      };

  const badgeColorMap: Record<string, string> = darkTheme
    ? {
        emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        indigo: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        sky: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        amber: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        rose: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        violet: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        slate: 'bg-slate-700 text-slate-200 border-slate-600'
      }
    : {
        emerald: 'bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]',
        indigo: 'bg-[#051C2C] text-white border-[#051C2C]',
        sky: 'bg-[#EFF6FF] text-[#005EB8] border-[#BFDBFE]',
        amber: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
        rose: 'bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]',
        violet: 'bg-[#EEF2FF] text-[#1E40AF] border-[#C7D2FE]',
        slate: 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]'
      };

  const hasDrillControls = maxDrillLevel > 0;

  const cardSurface = darkTheme
    ? 'bg-[#0B192C] border-slate-700/80 text-white shadow-md'
    : 'bg-white border-[#CBD5E1] text-[#051C2C] shadow-xs';

  const headerSurface = darkTheme
    ? 'bg-[#07111E] border-slate-800'
    : 'bg-[#F8FAFC] border-[#E2E8F0]';

  const renderCardBody = (inModal: boolean) => {
    const resolvedChildren = typeof children === 'function' ? children(inModal) : children;

    return (
      <VisualExpandContext.Provider value={inModal}>
        <div
          className={`border border-t-[3px] ${topBorderMap[accentColor]} rounded-xl flex flex-col justify-between overflow-hidden transition-all ${cardSurface} ${
            inModal ? 'w-[96vw] max-w-[96vw] h-[94vh] max-h-[94vh] shadow-2xl' : className
          }`}
        >
          {/* Visual Header */}
          <div className="shrink-0">
            <div className={`${inModal ? 'px-6 py-4' : 'px-4 py-2.5'} border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${headerSurface}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {badge && (
                    <span className={`${inModal ? 'text-xs px-2.5 py-1' : 'text-[9px] px-2 py-0.5'} font-mono font-black uppercase rounded-sm border whitespace-nowrap tracking-wider ${badgeColorMap[accentColor]}`}>
                      {badge}
                    </span>
                  )}
                  <h3 className={`${inModal ? 'text-base sm:text-lg' : 'text-xs'} font-black uppercase tracking-wider font-mono truncate ${darkTheme ? 'text-white' : 'text-[#051C2C]'}`}>
                    {title}
                  </h3>
                </div>
                {subtitle && (
                  <p className={`${inModal ? 'text-xs sm:text-sm mt-1' : 'text-[10px] mt-0.5'} font-medium truncate ${darkTheme ? 'text-slate-400' : 'text-[#475569]'}`}>
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Interactive Hierarchy Controls (↑ Drill Up, ↓ Drill Mode, ⇊ Next Level, ⛶ Fullscreen Popup) */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {hasDrillControls && (
                  <div className={`flex items-center rounded-md p-0.5 ${inModal ? 'text-xs' : 'text-[10px]'} font-mono font-bold border ${
                    darkTheme ? 'bg-[#050D1A] border-slate-700' : 'bg-white border-[#CBD5E1]'
                  }`}>
                    {/* ↑ Drill Up */}
                    {onDrillUp && (
                      <button
                        type="button"
                        onClick={onDrillUp}
                        disabled={drillLevel === 0}
                        title="Drill Up (↑) one level"
                        className={`${inModal ? 'px-3 py-1.5' : 'px-2 py-1'} rounded-xs flex items-center gap-1 transition whitespace-nowrap ${
                          drillLevel > 0
                            ? darkTheme
                              ? 'text-sky-300 hover:bg-slate-800 cursor-pointer font-black'
                              : 'text-[#005EB8] hover:bg-slate-100 cursor-pointer font-black'
                            : 'opacity-30 cursor-not-allowed'
                        }`}
                      >
                        <ArrowUp className={inModal ? 'w-4 h-4' : 'w-3 h-3'} />
                        <span>Up</span>
                      </button>
                    )}

                    {/* ↓ Drill Mode Toggle */}
                    {onToggleDrillMode !== undefined && (
                      <button
                        type="button"
                        onClick={onToggleDrillMode}
                        title={drillModeActive ? 'Drill Down Mode ON: Click a bar to drill down' : 'Cross-Filter Mode: Click a bar to cross-highlight'}
                        className={`${inModal ? 'px-3 py-1.5' : 'px-2 py-1'} rounded-xs flex items-center gap-1 border-l transition cursor-pointer whitespace-nowrap ${
                          darkTheme ? 'border-slate-800' : 'border-slate-200'
                        } ${
                          drillModeActive
                            ? darkTheme
                              ? 'bg-sky-500 text-slate-950 font-black'
                              : 'bg-[#051C2C] text-white font-black'
                            : darkTheme
                            ? 'text-slate-400 hover:bg-slate-800'
                            : 'text-[#475569] hover:bg-slate-100'
                        }`}
                      >
                        <ArrowDown className={inModal ? 'w-4 h-4' : 'w-3 h-3'} />
                        <span>{drillModeActive ? 'Drill: ON' : 'Filter'}</span>
                      </button>
                    )}

                    {/* ⇊ Expand Next Level */}
                    {onExpandNextLevel && (
                      <button
                        type="button"
                        onClick={onExpandNextLevel}
                        disabled={drillLevel >= maxDrillLevel}
                        title="Go to the next level in the hierarchy (⇊)"
                        className={`${inModal ? 'px-3 py-1.5' : 'px-2 py-1'} rounded-xs flex items-center gap-1 border-l transition whitespace-nowrap ${
                          darkTheme ? 'border-slate-800' : 'border-slate-200'
                        } ${
                          drillLevel < maxDrillLevel
                            ? darkTheme
                              ? 'text-emerald-300 hover:bg-slate-800 cursor-pointer font-black'
                              : 'text-[#0D9488] hover:bg-teal-50 cursor-pointer font-black'
                            : 'opacity-30 cursor-not-allowed'
                        }`}
                      >
                        <ChevronsDown className={inModal ? 'w-4 h-4' : 'w-3 h-3'} />
                        <span>Next</span>
                      </button>
                    )}
                  </div>
                )}

                {headerRight}

                {/* Full-Screen Expand / Restore Visual */}
                <button
                  type="button"
                  onClick={() => setIsFocused(!isFocused)}
                  title={isFocused ? 'Exit Full Screen View' : 'Expand Visual to Full Screen'}
                  className={`${inModal ? 'px-3.5 py-1.5 text-xs' : 'px-2 py-1 text-[10px]'} rounded-md border font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    darkTheme
                      ? 'bg-[#050D1A] border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800'
                      : 'bg-white border-[#CBD5E1] text-[#051C2C] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {isFocused ? (
                    <>
                      <Minimize2 className={`${inModal ? 'w-4 h-4' : 'w-3.5 h-3.5'} text-rose-500`} />
                      <span>Close Full Screen</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-[#005EB8]" />
                      <span className="hidden sm:inline">Expand</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Interactive Drill Breadcrumb Bar */}
            {drillBreadcrumbs.length > 0 && (
              <div className={`${inModal ? 'px-6 py-2.5 text-xs' : 'px-4 py-1.5 text-[10px]'} border-b flex items-center justify-between gap-2 font-mono overflow-x-auto ${
                darkTheme ? 'bg-[#081322] border-slate-800 text-slate-300' : 'bg-[#F1F5F9] border-[#E2E8F0] text-[#334155]'
              }`}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`${inModal ? 'text-xs' : 'text-[9px]'} font-black uppercase mr-1 flex items-center gap-1 ${
                    darkTheme ? 'text-sky-400' : 'text-[#005EB8]'
                  }`}>
                    <Layers className={inModal ? 'w-4 h-4' : 'w-3 h-3'} />
                    <span>Hierarchy Path:</span>
                  </span>
                  {drillBreadcrumbs.map((crumb, idx) => {
                    const isCurrent = idx === drillBreadcrumbs.length - 1;
                    return (
                      <React.Fragment key={`${crumb.level}-${crumb.label}`}>
                        {idx > 0 && <ChevronRight className={`${inModal ? 'w-4 h-4' : 'w-3 h-3'} text-slate-400 shrink-0`} />}
                        <button
                          type="button"
                          onClick={() => onDrillToLevel && onDrillToLevel(crumb.level)}
                          className={`${inModal ? 'px-3 py-1' : 'px-2 py-0.5'} rounded-xs transition whitespace-nowrap cursor-pointer ${
                            isCurrent
                              ? darkTheme
                                ? 'bg-sky-500 text-slate-950 font-black'
                                : 'bg-[#051C2C] text-white font-black'
                              : darkTheme
                              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 font-bold'
                              : 'bg-white text-[#334155] hover:bg-slate-200 border border-[#CBD5E1] font-bold'
                          }`}
                        >
                          {crumb.label}
                          {crumb.value ? `: ${crumb.value}` : ''}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
                <span className={`${inModal ? 'text-xs' : 'text-[9px]'} font-bold opacity-75 whitespace-nowrap`}>
                  Level {drillLevel + 1} of {maxDrillLevel + 1}
                </span>
              </div>
            )}
          </div>

          {/* Main Chart Body — stretches proportionally in full screen */}
          <div className={`${inModal ? 'p-6 flex-1 min-h-0 flex flex-col justify-between overflow-y-auto h-full' : 'p-4 flex-1 flex flex-col justify-between overflow-y-auto'}`}>
            {resolvedChildren}
          </div>

          {/* Compact Analytical Takeaway Footer */}
          {(insightText || insightHighlight) && (
            <div className={`${inModal ? 'px-6 py-3.5 text-xs sm:text-sm' : 'px-4 py-2 text-[10px]'} border-t flex items-center justify-between gap-2 shrink-0 ${
              darkTheme ? 'bg-[#07111E] border-slate-800 text-slate-300' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#334155]'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className={`${inModal ? 'w-4 h-4' : 'w-3.5 h-3.5'} shrink-0 ${darkTheme ? 'text-amber-400' : 'text-[#005EB8]'}`} />
                <span className="truncate font-semibold">{insightText}</span>
              </div>
              {insightHighlight && (
                <span className={`font-mono font-black ${inModal ? 'px-3.5 py-1 text-xs' : 'px-2.5 py-0.5 text-[10px]'} rounded-xs border whitespace-nowrap shrink-0 tabular-nums ${
                  darkTheme ? 'bg-slate-800 text-emerald-300 border-slate-700' : 'bg-[#051C2C] text-white border-[#051C2C]'
                }`}>
                  {insightHighlight}
                </span>
              )}
            </div>
          )}
        </div>
      </VisualExpandContext.Provider>
    );
  };

  return (
    <>
      {renderCardBody(false)}
      {isFocused && (
        <div className="fixed inset-0 z-[9999] bg-[#051C2C]/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          {renderCardBody(true)}
        </div>
      )}
    </>
  );
}

// ============================================================================
// UNIVERSAL HIERARCHICAL DRILL-DOWN & TOPPERS ENGINE FOR ALL SFC SUB-MODULES
// ============================================================================
export interface SfcStandardRecord {
  id: string;
  code: string;
  title: string;
  level1: string;       // e.g. Plant / Minifactory / Department
  level2: string;       // e.g. Line / Area / Zone
  level3: string;       // e.g. Category / Pillar / Station / Type
  owner: string;        // e.g. Operator / Auditor / Engineer
  status: 'Completed' | 'In-Progress' | 'Open';
  rawStatus: string;
  period: string;       // e.g. Month or Date
  metricValue: number;  // e.g. Cost Saved ₹, Audit Score %, Quarantine Qty, etc.
}

interface SfcModuleStandardDrillBoardProps {
  moduleTitle: string;
  moduleSubtitle: string;
  moduleBadge: string;
  accentColor?: 'emerald' | 'indigo' | 'sky' | 'amber' | 'rose' | 'violet';
  level1Label: string;
  level2Label: string;
  level3Label: string;
  metricLabel: string;
  metricFormatter?: (val: number) => string;
  metricIsAverage?: boolean;
  records: SfcStandardRecord[];
  onSelectRecord?: (id: string) => void;
}

export function SfcModuleStandardDrillBoard({
  moduleTitle,
  moduleSubtitle,
  moduleBadge,
  accentColor = 'sky',
  level1Label,
  level2Label,
  level3Label,
  metricLabel,
  metricFormatter = (v) => v.toLocaleString('en-IN'),
  metricIsAverage = false,
  records
}: SfcModuleStandardDrillBoardProps) {
  const [drillLevel, setDrillLevel] = useState<number>(0);
  const [selectedL1, setSelectedL1] = useState<string | null>(null);
  const [selectedL2, setSelectedL2] = useState<string | null>(null);
  const [selectedL3, setSelectedL3] = useState<string | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const [statusSlicer, setStatusSlicer] = useState<'ALL' | 'Completed' | 'In-Progress' | 'Open'>('ALL');
  const [drillModeActive, setDrillModeActive] = useState<boolean>(true);
  // Default to Light Mode
  const [darkTheme, setDarkTheme] = useState<boolean>(false);

  // Filter records by active hierarchy path, owner topper click & status slicer
  const activeRecords = useMemo(() => {
    return records.filter(r => {
      if (statusSlicer !== 'ALL' && r.status !== statusSlicer) return false;
      if (selectedL1 && r.level1 !== selectedL1) return false;
      if (selectedL2 && r.level2 !== selectedL2) return false;
      if (selectedL3 && r.level3 !== selectedL3) return false;
      if (selectedOwner && r.owner !== selectedOwner) return false;
      return true;
    });
  }, [records, statusSlicer, selectedL1, selectedL2, selectedL3, selectedOwner]);

  // Compute Top 3 Module Toppers (By Owner / Contributor)
  const moduleToppers = useMemo(() => {
    const map: Record<string, { name: string; dept: string; count: number; completed: number; metricSum: number }> = {};
    records.forEach(r => {
      const owner = r.owner || 'Shopfloor Team';
      if (!map[owner]) {
        map[owner] = { name: owner, dept: r.level1, count: 0, completed: 0, metricSum: 0 };
      }
      map[owner].count += 1;
      if (r.status === 'Completed') map[owner].completed += 1;
      map[owner].metricSum += r.metricValue;
    });
    return Object.values(map)
      .map(t => ({
        ...t,
        metricDisplay: metricIsAverage && t.count > 0 ? Math.round(t.metricSum / t.count) : t.metricSum
      }))
      .sort((a, b) => b.count - a.count || b.metricDisplay - a.metricDisplay)
      .slice(0, 3);
  }, [records, metricIsAverage]);

  // Group records by current drill level for the Primary Drill-Down Bar + Pareto Combo Chart
  const drillChartData = useMemo(() => {
    const groups: Record<string, {
      name: string;
      count: number;
      completed: number;
      inProgress: number;
      open: number;
      metricSum: number;
    }> = {};

    activeRecords.forEach(r => {
      const key =
        drillLevel === 0 ? r.level1 :
        drillLevel === 1 ? r.level2 :
        drillLevel === 2 ? r.level3 :
        r.owner || r.code;

      if (!groups[key]) {
        groups[key] = { name: key, count: 0, completed: 0, inProgress: 0, open: 0, metricSum: 0 };
      }
      groups[key].count += 1;
      if (r.status === 'Completed') groups[key].completed += 1;
      else if (r.status === 'In-Progress') groups[key].inProgress += 1;
      else groups[key].open += 1;
      groups[key].metricSum += r.metricValue;
    });

    const sorted = Object.values(groups)
      .map(g => ({
        ...g,
        metricDisplay: metricIsAverage && g.count > 0 ? Math.round(g.metricSum / g.count) : g.metricSum
      }))
      .sort((a, b) => b.count - a.count);

    const totalCount = sorted.reduce((s, i) => s + i.count, 0);
    let cumulative = 0;
    return sorted.map(item => {
      cumulative += item.count;
      return {
        ...item,
        cumulativePct: totalCount > 0 ? Math.round((cumulative / totalCount) * 100) : 0
      };
    });
  }, [activeRecords, drillLevel, metricIsAverage]);

  // Group by Level 3 (Category / Pillar) for Cross-Filter Distribution Chart
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, { name: string; count: number; metricSum: number }> = {};
    activeRecords.forEach(r => {
      const k = r.level3 || 'General';
      if (!counts[k]) counts[k] = { name: k, count: 0, metricSum: 0 };
      counts[k].count += 1;
      counts[k].metricSum += r.metricValue;
    });
    const total = activeRecords.length || 1;
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .map((c, idx) => ({
        ...c,
        pct: Math.round((c.count / total) * 100),
        color: SFC_PALETTE.categorical[idx % SFC_PALETTE.categorical.length]
      }));
  }, [activeRecords]);

  const handleBarClick = (entry: any) => {
    if (!entry || !entry.name) return;
    const clickedName = entry.name;

    if (!drillModeActive) {
      if (drillLevel === 0) setSelectedL1(prev => (prev === clickedName ? null : clickedName));
      else if (drillLevel === 1) setSelectedL2(prev => (prev === clickedName ? null : clickedName));
      else if (drillLevel === 2) setSelectedL3(prev => (prev === clickedName ? null : clickedName));
      return;
    }

    if (drillLevel === 0) {
      setSelectedL1(clickedName);
      setDrillLevel(1);
    } else if (drillLevel === 1) {
      setSelectedL2(clickedName);
      setDrillLevel(2);
    } else if (drillLevel === 2) {
      setSelectedL3(clickedName);
      setDrillLevel(3);
    }
  };

  const handleDrillUp = () => {
    if (drillLevel === 3) {
      setSelectedL3(null);
      setDrillLevel(2);
    } else if (drillLevel === 2) {
      setSelectedL2(null);
      setDrillLevel(1);
    } else if (drillLevel === 1) {
      setSelectedL1(null);
      setDrillLevel(0);
    }
  };

  const handleDrillToLevel = (targetLevel: number) => {
    if (targetLevel <= 0) {
      setSelectedL1(null);
      setSelectedL2(null);
      setSelectedL3(null);
      setDrillLevel(0);
    } else if (targetLevel === 1) {
      setSelectedL2(null);
      setSelectedL3(null);
      setDrillLevel(1);
    } else if (targetLevel === 2) {
      setSelectedL3(null);
      setDrillLevel(2);
    }
  };

  const handleResetAll = () => {
    setSelectedL1(null);
    setSelectedL2(null);
    setSelectedL3(null);
    setSelectedOwner(null);
    setDrillLevel(0);
    setStatusSlicer('ALL');
  };

  const breadcrumbs: DrillBreadcrumbItem[] = [
    { label: `All ${level1Label}`, value: selectedL1 || undefined, level: 0 },
    ...(drillLevel >= 1 ? [{ label: level2Label, value: selectedL2 || undefined, level: 1 }] : []),
    ...(drillLevel >= 2 ? [{ label: level3Label, value: selectedL3 || undefined, level: 2 }] : []),
    ...(drillLevel >= 3 ? [{ label: 'Contributors / Records', level: 3 }] : [])
  ];

  const currentDimensionLabel =
    drillLevel === 0 ? level1Label :
    drillLevel === 1 ? level2Label :
    drillLevel === 2 ? level3Label :
    'Contributor / Owner';

  const topGroup = drillChartData[0];

  return (
    <div className={`rounded-2xl p-4 sm:p-5 border space-y-4 transition-colors ${
      darkTheme ? 'bg-[#081221] border-slate-800 text-white' : 'bg-[#F4F6F9] border-[#CBD5E1] text-[#051C2C]'
    }`}>
      {/* Top Executive Ribbon & Slicer Bar */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b pb-3 ${
        darkTheme ? 'border-slate-800' : 'border-[#CBD5E1]'
      }`}>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-xs tracking-wider ${
              darkTheme ? 'bg-sky-500 text-slate-950' : 'bg-[#051C2C] text-white'
            }`}>
              {moduleBadge} · EXECUTIVE ANALYTICS SUITE
            </span>
            {(selectedL1 || selectedL2 || selectedL3 || selectedOwner || statusSlicer !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetAll}
                className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-0.5 rounded-xs flex items-center gap-1 cursor-pointer transition whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters &amp; Drill</span>
              </button>
            )}
          </div>
          <h3 className={`text-sm sm:text-base font-black uppercase tracking-tight mt-1 ${darkTheme ? 'text-white' : 'text-[#051C2C]'}`}>
            {moduleTitle}
          </h3>
          <p className={`text-[11px] font-medium ${darkTheme ? 'text-slate-400' : 'text-[#475569]'}`}>
            {moduleSubtitle}
          </p>
        </div>

        {/* Right Controls: Chiclet Slicers & Theme Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center rounded-lg p-0.5 border text-[10px] font-mono font-bold ${
            darkTheme ? 'bg-[#0f1f35] border-slate-700' : 'bg-white border-[#CBD5E1]'
          }`}>
            {(['ALL', 'Completed', 'In-Progress', 'Open'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusSlicer(st)}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
                  statusSlicer === st
                    ? darkTheme
                      ? 'bg-sky-500 text-slate-950 font-black'
                      : 'bg-[#051C2C] text-white font-black'
                    : darkTheme
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-[#475569] hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setDarkTheme(!darkTheme)}
            className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-bold cursor-pointer transition whitespace-nowrap ${
              darkTheme
                ? 'bg-slate-800 text-sky-300 border-slate-700 hover:bg-slate-700'
                : 'bg-white text-[#051C2C] border-[#CBD5E1] hover:bg-slate-50'
            }`}
          >
            {darkTheme ? 'Theme: Dark' : 'Theme: Light'}
          </button>
        </div>
      </div>

      {/* MODULE TOPPERS PODIUM STRIP (GOLD #1, SILVER #2, BRONZE #3) */}
      {moduleToppers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {moduleToppers.map((topper, idx) => {
            const isSelected = selectedOwner === topper.name;
            const rankBadge = idx === 0 ? '🥇 #1 GOLD TOPPER' : idx === 1 ? '🥈 #2 SILVER TOPPER' : '🥉 #3 BRONZE TOPPER';
            const cardColors = darkTheme
              ? idx === 0
                ? 'bg-gradient-to-r from-amber-500/20 via-[#0f1f35] to-[#0f1f35] border-amber-500/50'
                : idx === 1
                ? 'bg-gradient-to-r from-slate-400/15 via-[#0f1f35] to-[#0f1f35] border-slate-600'
                : 'bg-gradient-to-r from-orange-500/15 via-[#0f1f35] to-[#0f1f35] border-orange-500/40'
              : idx === 0
              ? 'bg-white border-[#051C2C] border-l-4 border-l-[#D97706] shadow-2xs'
              : idx === 1
              ? 'bg-white border-[#CBD5E1] border-l-4 border-l-[#005EB8] shadow-2xs'
              : 'bg-white border-[#CBD5E1] border-l-4 border-l-[#0D9488] shadow-2xs';

            return (
              <button
                key={topper.name}
                type="button"
                onClick={() => setSelectedOwner(prev => (prev === topper.name ? null : topper.name))}
                className={`text-left p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${cardColors} ${
                  isSelected ? 'ring-2 ring-[#005EB8]' : ''
                }`}
              >
                <div className="min-w-0">
                  <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-xs inline-block ${
                    idx === 0
                      ? 'bg-[#051C2C] text-[#FBBF24]'
                      : idx === 1
                      ? 'bg-[#EFF6FF] text-[#005EB8] border border-[#BFDBFE]'
                      : 'bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4]'
                  }`}>
                    {rankBadge}
                  </span>
                  <h4 className={`text-xs font-black truncate mt-1 ${darkTheme ? 'text-white' : 'text-[#051C2C]'}`}>
                    {topper.name}
                  </h4>
                  <span className={`text-[10px] font-mono block truncate ${darkTheme ? 'text-slate-400' : 'text-[#475569]'}`}>
                    Zone: {topper.dept}
                  </span>
                </div>
                <div className="text-right font-mono shrink-0 tabular-nums">
                  <span className={`text-base font-black block ${darkTheme ? 'text-sky-400' : 'text-[#005EB8]'}`}>
                    {topper.count} Logs
                  </span>
                  <span className={`text-[10px] font-bold block ${darkTheme ? 'text-emerald-400' : 'text-[#0D9488]'}`}>
                    {metricLabel}: {metricFormatter(topper.metricDisplay)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left 8 Cols: Multi-Level Drill-Down Bar & Pareto Line Chart with Direct Data Labels */}
        <PowerBiVisualCard
          className="lg:col-span-8"
          darkTheme={darkTheme}
          title={`Hierarchical Drill-Down by ${currentDimensionLabel}`}
          subtitle={`Click any bar to drill down (${level1Label} → ${level2Label} → ${level3Label} → Owner)`}
          badge={`LEVEL ${drillLevel + 1}/4`}
          accentColor={accentColor}
          drillLevel={drillLevel}
          maxDrillLevel={3}
          drillBreadcrumbs={breadcrumbs}
          onDrillUp={handleDrillUp}
          onDrillToLevel={handleDrillToLevel}
          onExpandNextLevel={() => setDrillLevel(prev => Math.min(3, prev + 1))}
          drillModeActive={drillModeActive}
          onToggleDrillMode={() => setDrillModeActive(prev => !prev)}
          insightText={
            topGroup
              ? `Topper ${currentDimensionLabel}: "${topGroup.name}" leads with ${topGroup.count} records (${topGroup.cumulativePct}% cumulative share).`
              : 'No records match current filter.'
          }
          insightHighlight={`${activeRecords.length} Records Active`}
        >
          {(isExpanded) => (
            <div className={isExpanded ? 'flex-1 min-h-[520px] h-full w-full' : 'h-64 w-full'}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={drillChartData}
                  margin={{
                    top: isExpanded ? 32 : 18,
                    right: isExpanded ? 28 : 16,
                    left: isExpanded ? 4 : -12,
                    bottom: isExpanded ? 36 : 20
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={darkTheme ? '#1e293b' : '#E2E8F0'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: isExpanded ? 13 : 10,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fill: darkTheme ? '#cbd5e1' : '#051C2C'
                    }}
                    interval={0}
                    angle={drillChartData.length > 5 ? -15 : 0}
                    textAnchor={drillChartData.length > 5 ? 'end' : 'middle'}
                    height={isExpanded ? 56 : 42}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{
                      fontSize: isExpanded ? 13 : 10,
                      fontFamily: 'monospace',
                      fill: darkTheme ? '#94a3b8' : '#475569'
                    }}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{
                      fontSize: isExpanded ? 13 : 10,
                      fontFamily: 'monospace',
                      fill: '#D97706'
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#051C2C] text-white p-3.5 rounded-xl border border-slate-700 shadow-xl text-xs font-mono space-y-1">
                          <div className="font-black text-sky-300 border-b border-slate-700 pb-1">
                            {d.name}
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-300">Total Count:</span>
                            <span className="font-bold tabular-nums">{d.count}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-emerald-400">Completed:</span>
                            <span className="font-bold tabular-nums">{d.completed}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-amber-400">Open / In-Prog:</span>
                            <span className="font-bold tabular-nums">{d.inProgress + d.open}</span>
                          </div>
                          <div className="flex justify-between gap-4 border-t border-slate-700 pt-1">
                            <span className="text-sky-300">{metricLabel}:</span>
                            <span className="font-bold tabular-nums">{metricFormatter(d.metricDisplay)}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine yAxisId="right" y={80} stroke="#D97706" strokeDasharray="4 4" />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    name="Total Count"
                    fill="#005EB8"
                    maxBarSize={isExpanded ? 96 : 52}
                    radius={[5, 5, 0, 0]}
                    cursor="pointer"
                    onClick={(data) => handleBarClick(data)}
                  >
                    {drillChartData.map((entry, idx) => (
                      <Cell
                        key={entry.name}
                        fill={SFC_PALETTE.categorical[idx % SFC_PALETTE.categorical.length]}
                      />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="top"
                      style={{
                        fill: darkTheme ? '#ffffff' : '#051C2C',
                        fontSize: isExpanded ? 15 : 11,
                        fontWeight: 900,
                        fontFamily: 'monospace'
                      }}
                    />
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulativePct"
                    name="Pareto Cumulative %"
                    stroke="#D97706"
                    strokeWidth={isExpanded ? 3.5 : 2.5}
                    dot={{ r: isExpanded ? 6 : 4, fill: '#D97706', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </PowerBiVisualCard>

        {/* Right 4 Cols: Category Donut & In-Cell Data Bar Matrix */}
        <PowerBiVisualCard
          className="lg:col-span-4"
          darkTheme={darkTheme}
          title={`${level3Label} Share`}
          subtitle="Click slice or row to cross-filter canvas"
          badge="SHARE + MATRIX"
          accentColor="emerald"
          insightText={`Click any ${level3Label} row to filter the entire analytics board.`}
          insightHighlight={`${categoryBreakdown.length} Segments`}
        >
          {(isExpanded) => (
            <div className={isExpanded ? 'flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch h-full' : 'space-y-3 flex-1 flex flex-col justify-between'}>
              <div className={isExpanded ? 'lg:col-span-7 flex-1 min-h-[420px] h-full w-full relative flex flex-col' : 'h-40 w-full relative'}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={isExpanded ? '44%' : '48%'}
                      outerRadius={isExpanded ? '76%' : '82%'}
                      paddingAngle={2}
                      label={
                        isExpanded
                          ? ({ name, count, pct }: any) => `${name}: ${count} (${pct}%)`
                          : false
                      }
                      labelLine={isExpanded}
                      onClick={(entry) => {
                        if (!entry?.name) return;
                        setSelectedL3(prev => (prev === entry.name ? null : entry.name));
                      }}
                      className="cursor-pointer"
                    >
                      {categoryBreakdown.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color}
                          opacity={selectedL3 && selectedL3 !== entry.name ? 0.25 : 1}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any, name: any) => [`${val} records`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className={isExpanded ? 'lg:col-span-5 space-y-2.5 overflow-y-auto pr-2 flex flex-col justify-center' : 'space-y-1 max-h-28 overflow-y-auto pr-1'}>
                {categoryBreakdown.map(cat => {
                  const isSelected = selectedL3 === cat.name;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setSelectedL3(prev => (prev === cat.name ? null : cat.name))}
                      className={`w-full flex items-center justify-between ${
                        isExpanded ? 'px-4 py-3 rounded-xl text-sm' : 'px-2.5 py-1 rounded text-[11px]'
                      } font-mono transition cursor-pointer border ${
                        isSelected
                          ? 'bg-[#051C2C] text-white border-[#051C2C] font-black'
                          : darkTheme
                          ? 'bg-[#0b1728] hover:bg-slate-800 text-slate-200 border-slate-800'
                          : 'bg-[#F8FAFC] hover:bg-slate-100 text-[#051C2C] border-[#E2E8F0]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`${isExpanded ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'} rounded-xs shrink-0`} style={{ backgroundColor: cat.color }} />
                        <span className="truncate font-bold">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        {isExpanded && (
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, backgroundColor: cat.color }} />
                          </div>
                        )}
                        <span className="font-black">{cat.count}</span>
                        <span className={`${isExpanded ? 'text-xs' : 'text-[10px]'} opacity-75`}>({cat.pct}%)</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </PowerBiVisualCard>
      </div>
    </div>
  );
}
