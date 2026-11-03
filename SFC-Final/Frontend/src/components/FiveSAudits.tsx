import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Plus, 
  User, 
  FileText, 
  CheckCircle, 
  Award, 
  Tag, 
  CheckSquare, 
  Droplets, 
  BookOpen, 
  Trophy, 
  Printer, 
  TrendingUp, 
  AlertTriangle, 
  Search, 
  ChevronRight, 
  Eye, 
  Trash2, 
  ArrowUpRight,
  Filter,
  Layers,
  Clock
} from 'lucide-react';
import { FiveSAudit, FiveSRedTag, FiveSActionItem, FiveSSocLog, Kaizen, UserPersona } from '../types';
import FiveSRadarChart from './fives/FiveSRadarChart';
import FiveSChecklistAuditModal from './fives/FiveSChecklistAuditModal';
import FiveSRedTagCenter from './fives/FiveSRedTagCenter';
import FiveSCapaTracker from './fives/FiveSCapaTracker';
import FiveSSocTracker from './fives/FiveSSocTracker';
import FiveSStandardsGuide from './fives/FiveSStandardsGuide';
import FiveSLeaderboard from './fives/FiveSLeaderboard';
import FiveSAuditPrintModal from './fives/FiveSAuditPrintModal';
import PresentationModeView, { SlideItem } from './common/PresentationModeView';
import { SfcModuleStandardDrillBoard, SfcStandardRecord } from './common/SfcPowerBiShared';

interface FiveSAuditsProps {
  audits: FiveSAudit[];
  redTags?: FiveSRedTag[];
  actionItems?: FiveSActionItem[];
  socLogs?: FiveSSocLog[];
  kaizens?: Kaizen[];
  onAddAudit: (data: Partial<FiveSAudit>) => void;
  onUpdateAudit?: (id: string, data: Partial<FiveSAudit>) => void;
  onDeleteAudit?: (id: string) => void;
  onAddRedTag?: (tag: Partial<FiveSRedTag>) => void;
  onUpdateRedTag?: (id: string, tag: Partial<FiveSRedTag>) => void;
  onDeleteRedTag?: (id: string) => void;
  onAddActionItem?: (item: Partial<FiveSActionItem>) => void;
  onUpdateActionItem?: (id: string, item: Partial<FiveSActionItem>) => void;
  onDeleteActionItem?: (id: string) => void;
  onAddSocLog?: (soc: Partial<FiveSSocLog>) => void;
  onUpdateSocLog?: (id: string, soc: Partial<FiveSSocLog>) => void;
  onDeleteSocLog?: (id: string) => void;
  onAddKaizen?: (kaizen: Partial<Kaizen>) => void;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
  currentPersona?: UserPersona;
  isSidebarHidden?: boolean;
  onToggleSidebar?: () => void;
}

export default function FiveSAudits({
  audits,
  redTags = [],
  actionItems = [],
  socLogs = [],
  kaizens = [],
  onAddAudit,
  onUpdateAudit = () => {},
  onDeleteAudit = () => {},
  onAddRedTag = () => {},
  onUpdateRedTag = () => {},
  onDeleteRedTag = () => {},
  onAddActionItem = () => {},
  onUpdateActionItem = () => {},
  onDeleteActionItem = () => {},
  onAddSocLog = () => {},
  onUpdateSocLog = () => {},
  onDeleteSocLog = () => {},
  onAddKaizen = () => {},
  initialAction,
  onClearInitialAction,
  currentPersona = 'manager',
  isSidebarHidden,
  onToggleSidebar
}: FiveSAuditsProps) {
  // Navigation tabs in exact standard sequence:
  // 1. Dashboard -> 2. Raise the Form -> 3. Master Tracker -> 4. Presentation Mode -> 5. Other
  const [activeTab, setActiveTab] = useState<'dashboard' | 'form' | 'audits-list' | 'presentation' | 'other' | 'redtags' | 'actions' | 'soc' | 'standards' | 'leaderboard'>('dashboard');
  const [otherSubmenu, setOtherSubmenu] = useState<'redtags' | 'actions' | 'soc' | 'standards' | 'leaderboard'>('redtags');

  // Modals state
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [selectedAuditForPrint, setSelectedAuditForPrint] = useState<FiveSAudit | null>(null);
  const [selectedAuditDetails, setSelectedAuditDetails] = useState<FiveSAudit | null>(null);

  // Filters
  const [plantFilter, setPlantFilter] = useState('ALL');
  const [auditSearchTerm, setAuditSearchTerm] = useState('');

  // Handle initial quick actions triggered from sidebar or global shortcuts
  useEffect(() => {
    if (!initialAction) return;

    if (initialAction === 'log-audit' || initialAction === 'audit-new' || initialAction === 'form') {
      setShowChecklistModal(true);
    } else if (initialAction === 'tracker' || initialAction === 'audits-list') {
      setActiveTab('audits-list');
    } else if (initialAction === 'presentation') {
      setActiveTab('presentation');
    } else if (initialAction === 'redtags') {
      setActiveTab('other');
      setOtherSubmenu('redtags');
    } else if (initialAction === 'actions') {
      setActiveTab('other');
      setOtherSubmenu('actions');
    } else if (initialAction === 'soc') {
      setActiveTab('other');
      setOtherSubmenu('soc');
    } else if (initialAction === 'standards') {
      setActiveTab('other');
      setOtherSubmenu('standards');
    } else if (initialAction === 'leaderboard') {
      setActiveTab('other');
      setOtherSubmenu('leaderboard');
    } else if (initialAction === 'dashboard') {
      setActiveTab('dashboard');
    }

    if (onClearInitialAction) onClearInitialAction();
  }, [initialAction, onClearInitialAction]);

  // Aggregate Plant Metrics
  const totalAuditsCount = audits.length;
  const avgPlantScore = totalAuditsCount > 0
    ? Math.round(audits.reduce((acc, a) => acc + a.totalScore, 0) / totalAuditsCount)
    : 80;

  const avgSort = totalAuditsCount > 0
    ? Number((audits.reduce((acc, a) => acc + a.sortScore, 0) / totalAuditsCount).toFixed(1))
    : 4.1;
  const avgOrder = totalAuditsCount > 0
    ? Number((audits.reduce((acc, a) => acc + a.setInOrderScore, 0) / totalAuditsCount).toFixed(1))
    : 3.9;
  const avgShine = totalAuditsCount > 0
    ? Number((audits.reduce((acc, a) => acc + a.shineScore, 0) / totalAuditsCount).toFixed(1))
    : 4.0;
  const avgStandardize = totalAuditsCount > 0
    ? Number((audits.reduce((acc, a) => acc + a.standardizeScore, 0) / totalAuditsCount).toFixed(1))
    : 3.8;
  const avgSustain = totalAuditsCount > 0
    ? Number((audits.reduce((acc, a) => acc + a.sustainScore, 0) / totalAuditsCount).toFixed(1))
    : 3.8;

  const openRedTagsCount = redTags.filter((t) => t.status === 'In Holding Area' || t.status === 'Tagged').length;
  const openActionsCount = actionItems.filter((a) => a.status !== 'Verified Closed').length;
  const activeSocCount = socLogs.filter((s) => s.status === 'Open').length;

  // Filtered audits
  const filteredAudits = audits.filter((a) => {
    const matchesPlant = plantFilter === 'ALL' || a.area.toLowerCase().includes(plantFilter.toLowerCase());
    const matchesSearch =
      a.area.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
      a.auditor.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
      a.remarks.toLowerCase().includes(auditSearchTerm.toLowerCase());
    return matchesPlant && matchesSearch;
  });

  // Handle audit creation from 25-point modal
  const handleAuditSubmit = (auditData: Partial<FiveSAudit>, generatedActions: Partial<FiveSActionItem>[]) => {
    onAddAudit(auditData);

    // Also auto-queue generated CAPA actions
    if (generatedActions && generatedActions.length > 0) {
      generatedActions.forEach((act) => {
        onAddActionItem(act);
      });
    }
  };

  // Presentation Slides for 5S
  const presentationSlides: SlideItem[] = React.useMemo(() => [
    {
      id: '5s-slide-scorecard',
      title: 'Plantwide 5S Index & Radar Overview',
      subtitle: 'Lean Workplace Organization & World-Class 5S Standards',
      badge: '5S Live Index',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
            <div className="bg-slate-900 border border-blue-900/50 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-mono text-blue-400 font-bold block uppercase">Plant Index</span>
              <span className="text-4xl font-black text-white font-mono mt-1 block">{avgPlantScore}%</span>
              <span className="text-[10px] text-emerald-400 font-mono mt-1 block">Grade A</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-mono text-rose-400 font-bold block uppercase">1S Sort</span>
              <span className="text-3xl font-black text-rose-400 font-mono mt-1 block">{avgSort}</span>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">/ 5.0</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-mono text-amber-400 font-bold block uppercase">2S Order</span>
              <span className="text-3xl font-black text-amber-400 font-mono mt-1 block">{avgOrder}</span>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">/ 5.0</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-mono text-emerald-400 font-bold block uppercase">3S Shine</span>
              <span className="text-3xl font-black text-emerald-400 font-mono mt-1 block">{avgShine}</span>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">/ 5.0</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-mono text-blue-400 font-bold block uppercase">4S Standardize</span>
              <span className="text-3xl font-black text-blue-400 font-mono mt-1 block">{avgStandardize}</span>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">/ 5.0</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-mono text-purple-400 font-bold block uppercase">5S Sustain</span>
              <span className="text-3xl font-black text-purple-400 font-mono mt-1 block">{avgSustain}</span>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">/ 5.0</span>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-6 h-6 text-blue-400" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase font-mono">Continuous 5S Shopfloor Auditing</h4>
                <p className="text-[11px] text-slate-400">Total {totalAuditsCount} audits logged • {openRedTagsCount} Red Tags active • {openActionsCount} CAPA actions open</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: '5s-slide-zones',
      title: '5S Zone Championship & Top Areas',
      subtitle: 'Shop Floor Departmental Leaderboard',
      badge: 'Zone Rankings',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {audits.slice(0, 4).map((a, idx) => (
            <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold font-mono text-blue-400">#{idx + 1} {a.area}</span>
                <span className="text-[10px] text-slate-400 block mt-1">Auditor: {a.auditor} • {a.auditDate}</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-white font-mono">{a.totalScore}%</span>
                <span className="text-[10px] text-emerald-400 font-bold block">Grade {a.grade || 'A'}</span>
              </div>
            </div>
          ))}
        </div>
      )
    }
  ], [avgPlantScore, avgSort, avgOrder, avgShine, avgStandardize, avgSustain, totalAuditsCount, openRedTagsCount, openActionsCount, audits]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="fives-master-module">
      {/* Executive Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="flex items-start space-x-4">
          <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/30 shrink-0">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase font-mono tracking-widest text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                LEAN SHOPFLOOR CONTROL
              </span>
              <span className="text-xs text-slate-400 font-mono font-bold">
                · JAPANESE 5S ARCHITECTURE
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              🧼 5S Workplace Organization &amp; Audit System
            </h1>
            <p className="text-xs text-slate-500 font-medium max-w-2xl">
              Sort (Seiri) · Set In Order (Seiton) · Shine (Seiso) · Standardize (Seiketsu) · Sustain (Shitsuke). Full digital Red Tag holding area, daily Gemba routines, 25-point audits, and Kaizen bridge.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              if (audits.length > 0) setSelectedAuditForPrint(audits[0]);
              else alert('No audits available to print.');
            }}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-black uppercase tracking-wider font-mono flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Audit Report</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('other');
              setOtherSubmenu('redtags');
            }}
            className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black uppercase tracking-wider font-mono flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>1S Red Tag ({openRedTagsCount})</span>
          </button>

          <button
            onClick={() => setShowChecklistModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider font-mono flex items-center space-x-2 shadow-lg shadow-blue-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Execute 25-Pt Audit</span>
          </button>
        </div>
      </div>

      {/* Standardized Navigation Sub-Tabs Bar:
          1. Dashboard -> 2. Raise the Form -> 3. Master Tracker -> 4. Presentation Mode -> 5. Other */}
      <div className="flex border-b border-slate-200 bg-white px-4 sm:px-6 pt-2 gap-2 overflow-x-auto rounded-2xl shadow-sm">
        
        {/* 1. Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pb-3 px-3.5 font-mono text-xs font-bold border-b-2 flex items-center space-x-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'dashboard'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>1. Dashboard (Radar &amp; KPIs)</span>
        </button>

        {/* 2. Raise the Form */}
        <button
          onClick={() => setShowChecklistModal(true)}
          className={`pb-3 px-3.5 font-mono text-xs font-bold border-b-2 flex items-center space-x-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'form'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Plus className="w-3.5 h-3.5 text-blue-600" />
          <span>2. Raise 25-Pt Audit Form</span>
        </button>

        {/* 3. Master Tracker */}
        <button
          onClick={() => setActiveTab('audits-list')}
          className={`pb-3 px-3.5 font-mono text-xs font-bold border-b-2 flex items-center space-x-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'audits-list'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>3. Master Tracker ({audits.length})</span>
        </button>

        {/* 4. Presentation Mode */}
        <button
          onClick={() => setActiveTab('presentation')}
          className={`pb-3 px-3.5 font-mono text-xs font-bold border-b-2 flex items-center space-x-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'presentation'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-3.5 h-3.5 text-indigo-500" />
          <span>4. Presentation Mode</span>
        </button>

        {/* 5. Other / Submenus */}
        <button
          onClick={() => setActiveTab('other')}
          className={`pb-3 px-3.5 font-mono text-xs font-bold border-b-2 flex items-center space-x-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'other' || activeTab === 'redtags' || activeTab === 'actions' || activeTab === 'soc' || activeTab === 'standards' || activeTab === 'leaderboard'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-purple-600" />
          <span>5. Other / Submenus</span>
        </button>
      </div>

      {/* Submenu bar when on Other */}
      {(activeTab === 'other' || activeTab === 'redtags' || activeTab === 'actions' || activeTab === 'soc' || activeTab === 'standards' || activeTab === 'leaderboard') && (
        <div className="bg-slate-100 border border-slate-200 px-4 py-2 rounded-2xl flex flex-wrap gap-2 text-xs font-mono font-semibold">
          {[
            { id: 'redtags', label: `🔴 1S: Red Tag Holding (${openRedTagsCount})` },
            { id: 'actions', label: `🛠️ CAPA Actions (${openActionsCount})` },
            { id: 'soc', label: `🧽 3S: SOC & Daily Gemba (${activeSocCount})` },
            { id: 'standards', label: '📐 Visual 5S Standards' },
            { id: 'leaderboard', label: '🏆 Zone Championship' }
          ].map(sub => (
            <button
              key={sub.id}
              onClick={() => {
                setActiveTab(sub.id as any);
                setOtherSubmenu(sub.id as any);
              }}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                activeTab === sub.id || (activeTab === 'other' && otherSubmenu === sub.id)
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* TAB 1: 5S OVERVIEW DASHBOARD & RADAR */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="block text-[9px] font-black uppercase text-blue-600 font-mono tracking-wider">
                PLANT 5S INDEX
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-3xl font-black text-slate-800 font-mono">{avgPlantScore}%</span>
                <span className="text-[10px] text-emerald-600 font-black font-mono">
                  {avgPlantScore >= 85 ? 'Grade A+' : avgPlantScore >= 75 ? 'Grade A' : 'Grade B'}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="block text-[9px] font-black uppercase text-rose-600 font-mono tracking-wider">
                1S SORT (SEIRI)
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-black text-rose-700 font-mono">{avgSort}</span>
                <span className="text-xs text-slate-400 font-mono">/ 5.0</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{openRedTagsCount} Red Tags active</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="block text-[9px] font-black uppercase text-amber-600 font-mono tracking-wider">
                2S ORDER (SEITON)
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-black text-amber-600 font-mono">{avgOrder}</span>
                <span className="text-xs text-slate-400 font-mono">/ 5.0</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Shadow boards intact</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="block text-[9px] font-black uppercase text-emerald-600 font-mono tracking-wider">
                3S SHINE (SEISO)
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-black text-emerald-600 font-mono">{avgShine}</span>
                <span className="text-xs text-slate-400 font-mono">/ 5.0</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{activeSocCount} active SOC leaks</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="block text-[9px] font-black uppercase text-blue-600 font-mono tracking-wider">
                4S STANDARDIZE
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-black text-blue-600 font-mono">{avgStandardize}</span>
                <span className="text-xs text-slate-400 font-mono">/ 5.0</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Match-marking active</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="block text-[9px] font-black uppercase text-violet-600 font-mono tracking-wider">
                5S SUSTAIN
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-black text-violet-600 font-mono">{avgSustain}</span>
                <span className="text-xs text-slate-400 font-mono">/ 5.0</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{openActionsCount} open CAPA</span>
            </div>
          </div>

          {/* Standard SFC Hierarchical Drill-Down & Pareto Engine */}
          <SfcModuleStandardDrillBoard
            moduleTitle="5S Audit Hierarchical Drill-Down & Score Index"
            moduleSubtitle="Drill down from Plant Zone → Audited Area → Audit Type / Shift → Lead Auditor"
            moduleBadge="5S WORKPLACE ANALYTICS"
            accentColor="sky"
            level1Label="Plant Zone"
            level2Label="Audited Area"
            level3Label="Audit Type / Grade"
            metricLabel="Avg 5S Score"
            metricFormatter={(v) => `${v}%`}
            metricIsAverage={true}
            records={audits.map((a): SfcStandardRecord => ({
              id: a.id,
              code: `5S-${a.id}`,
              title: a.remarks,
              level1: a.plantZone || 'Pune Main Plant',
              level2: a.area,
              level3: a.auditType || `Grade ${a.grade || 'A'}`,
              owner: a.auditor,
              status: a.totalScore >= 80 ? 'Completed' : a.totalScore >= 65 ? 'In-Progress' : 'Open',
              rawStatus: a.status,
              period: a.auditDate,
              metricValue: a.totalScore
            }))}
          />

          {/* Radar Chart & Zone Scorecard Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Cols: Spider Web Radar Chart */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 flex flex-col items-center justify-between shadow-sm">
              <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    5S Multi-Axis Spider / Radar Evaluation
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Plant-wide average across all 5 continuous improvement pillars.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  Target: 4.0/5.0
                </span>
              </div>

              <div className="py-4">
                <FiveSRadarChart
                  scores={{
                    sort: avgSort,
                    setInOrder: avgOrder,
                    shine: avgShine,
                    standardize: avgStandardize,
                    sustain: avgSustain
                  }}
                  size={300}
                  showLabels={true}
                />
              </div>

              <div className="w-full grid grid-cols-2 gap-2 text-[11px] font-mono pt-3 border-t border-slate-100">
                <div className="bg-slate-50 p-2 rounded-xl text-center">
                  <span className="text-slate-400 block text-[9px]">STRONGEST PILLAR</span>
                  <span className="font-black text-emerald-600">
                    {avgSort >= avgOrder && avgSort >= avgShine ? '1S Sort (Seiri)' : '3S Shine (Seiso)'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl text-center">
                  <span className="text-slate-400 block text-[9px]">FOCUS AREA</span>
                  <span className="font-black text-amber-600">
                    4S &amp; 5S Standardization
                  </span>
                </div>
              </div>
            </div>

            {/* Right 7 Cols: Zone Performance Scorecards */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">
                    📍 Shopfloor Zone Performance &amp; Adherence
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Real-time compliance status of active manufacturing cells.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Plant:</span>
                  <select
                    value={plantFilter}
                    onChange={(e) => setPlantFilter(e.target.value)}
                    className="text-xs font-bold font-mono px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none"
                  >
                    <option value="ALL">All Plants</option>
                    <option value="Pune">Pune Plant</option>
                    <option value="Hosur">Hosur Plant</option>
                    <option value="Chennai">Chennai Plant</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {filteredAudits.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-xs text-slate-800">{a.area}</h4>
                          <span className="text-[9px] font-mono bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded">
                            {a.shift || 'Shift 1'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          📅 {a.auditDate} · Auditor: {a.auditor}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black font-mono ${
                          a.status === 'Excellent' ? 'bg-emerald-100 text-emerald-800' :
                          a.status === 'Good' ? 'bg-blue-100 text-blue-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {a.totalScore}% · Grade {a.grade || (a.totalScore >= 85 ? 'A' : 'B')}
                        </span>
                        <button
                          onClick={() => setSelectedAuditForPrint(a)}
                          className="p-1.5 bg-white hover:bg-slate-200 rounded-lg border border-slate-200 text-slate-600 transition"
                          title="Print Official Certificate"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Mini 5S Score Bar Grid */}
                    <div className="grid grid-cols-5 gap-1 pt-1 text-center font-mono text-[9px]">
                      <div className="bg-white p-1 rounded border border-slate-100">
                        <span className="text-slate-400 block font-bold">1S</span>
                        <span className="font-black text-rose-600">{a.sortScore.toFixed(1)}</span>
                      </div>
                      <div className="bg-white p-1 rounded border border-slate-100">
                        <span className="text-slate-400 block font-bold">2S</span>
                        <span className="font-black text-amber-600">{a.setInOrderScore.toFixed(1)}</span>
                      </div>
                      <div className="bg-white p-1 rounded border border-slate-100">
                        <span className="text-slate-400 block font-bold">3S</span>
                        <span className="font-black text-emerald-600">{a.shineScore.toFixed(1)}</span>
                      </div>
                      <div className="bg-white p-1 rounded border border-slate-100">
                        <span className="text-slate-400 block font-bold">4S</span>
                        <span className="font-black text-blue-600">{a.standardizeScore.toFixed(1)}</span>
                      </div>
                      <div className="bg-white p-1 rounded border border-slate-100">
                        <span className="text-slate-400 block font-bold">5S</span>
                        <span className="font-black text-violet-600">{a.sustainScore.toFixed(1)}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 italic">
                      "{a.remarks}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS MASTER REGISTER */}
      {activeTab === 'audits-list' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Master 5S Audit Register
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete historical record of 25-point workplace inspections, radar metrics, and auditor sign-offs.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowChecklistModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider font-mono flex items-center space-x-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Audit</span>
                </button>
              </div>
            </div>

            {/* Search Filter */}
            <div className="p-4 bg-white border-b border-slate-100 flex items-center space-x-3 text-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={auditSearchTerm}
                  onChange={(e) => setAuditSearchTerm(e.target.value)}
                  placeholder="Search audit area, auditor, remarks..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100">
              {filteredAudits.map((audit) => (
                <div key={audit.id} className="p-5 hover:bg-slate-50/80 transition flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {audit.id}
                      </span>
                      <h4 className="font-black text-xs text-slate-800">{audit.area}</h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        📅 {audit.auditDate}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-snug">
                      {audit.remarks}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-400 pt-1">
                      <span>Auditor: <strong className="text-slate-700">{audit.auditor}</strong></span>
                      <span>·</span>
                      <span>Shift: <strong className="text-slate-700">{audit.shift || 'Shift 1'}</strong></span>
                      <span>·</span>
                      <span>Type: <strong className="text-slate-700">{audit.auditType || 'Weekly'}</strong></span>
                    </div>
                  </div>

                  {/* 5S Score breakdown */}
                  <div className="shrink-0 flex items-center space-x-5">
                    <div className="hidden sm:grid grid-cols-5 gap-1.5 text-center font-mono text-[10px]">
                      <div className="p-1 bg-slate-50 rounded border">
                        <span className="text-slate-400 block text-[8px]">1S</span>
                        <span className="font-black text-rose-600">{audit.sortScore.toFixed(1)}</span>
                      </div>
                      <div className="p-1 bg-slate-50 rounded border">
                        <span className="text-slate-400 block text-[8px]">2S</span>
                        <span className="font-black text-amber-600">{audit.setInOrderScore.toFixed(1)}</span>
                      </div>
                      <div className="p-1 bg-slate-50 rounded border">
                        <span className="text-slate-400 block text-[8px]">3S</span>
                        <span className="font-black text-emerald-600">{audit.shineScore.toFixed(1)}</span>
                      </div>
                      <div className="p-1 bg-slate-50 rounded border">
                        <span className="text-slate-400 block text-[8px]">4S</span>
                        <span className="font-black text-blue-600">{audit.standardizeScore.toFixed(1)}</span>
                      </div>
                      <div className="p-1 bg-slate-50 rounded border">
                        <span className="text-slate-400 block text-[8px]">5S</span>
                        <span className="font-black text-violet-600">{audit.sustainScore.toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-black font-mono text-slate-800 block">
                        {audit.totalScore}%
                      </span>
                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                        audit.status === 'Excellent' ? 'bg-emerald-100 text-emerald-800' :
                        audit.status === 'Good' ? 'bg-blue-100 text-blue-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        Grade {audit.grade || 'A'} · {audit.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setSelectedAuditForPrint(audit)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                        title="Print / Save Official Certificate"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete audit ${audit.id}?`)) onDeleteAudit(audit.id);
                        }}
                        className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-xl transition"
                        title="Delete Audit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 1S RED TAG HOLDING AREA */}
      {activeTab === 'redtags' && (
        <div className="animate-fade-in">
          <FiveSRedTagCenter
            redTags={redTags}
            onAddRedTag={onAddRedTag}
            onUpdateRedTag={onUpdateRedTag}
            onDeleteRedTag={onDeleteRedTag}
          />
        </div>
      )}

      {/* TAB 4: 5S CAPA ACTION TRACKER */}
      {activeTab === 'actions' && (
        <div className="animate-fade-in">
          <FiveSCapaTracker
            actionItems={actionItems}
            onAddActionItem={onAddActionItem}
            onUpdateActionItem={onUpdateActionItem}
            onDeleteActionItem={onDeleteActionItem}
            onAddKaizen={onAddKaizen}
          />
        </div>
      )}

      {/* TAB 5: 3S SOURCE OF CONTAMINATION & DAILY GEMBA */}
      {activeTab === 'soc' && (
        <div className="animate-fade-in">
          <FiveSSocTracker
            socLogs={socLogs}
            onAddSocLog={onAddSocLog}
            onUpdateSocLog={onUpdateSocLog}
            onDeleteSocLog={onDeleteSocLog}
          />
        </div>
      )}

      {/* TAB 6: VISUAL STANDARDS & OPL */}
      {activeTab === 'standards' && (
        <div className="animate-fade-in">
          <FiveSStandardsGuide />
        </div>
      )}

      {/* TAB 7: ZONE CHAMPIONSHIP LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="animate-fade-in">
          <FiveSLeaderboard
            audits={audits}
            onSelectAudit={(a) => setSelectedAuditForPrint(a)}
          />
        </div>
      )}

      {/* TAB 4: PRESENTATION MODE (WITH HIDE LEFT WINDOW PROVISION) */}
      {activeTab === 'presentation' && (
        <PresentationModeView
          moduleName="5S Lean Workplace & Audit Council"
          moduleIcon={<Sparkles className="w-5 h-5 text-blue-500" />}
          slides={presentationSlides}
          onExit={() => setActiveTab('audits-list')}
          isSidebarHidden={isSidebarHidden}
          onToggleSidebar={onToggleSidebar}
        />
      )}

      {/* 25-Point Checklist Audit Modal */}
      <FiveSChecklistAuditModal
        isOpen={showChecklistModal}
        onClose={() => setShowChecklistModal(false)}
        onSubmit={handleAuditSubmit}
      />

      {/* Official Audit Report & Certificate Print Modal */}
      <FiveSAuditPrintModal
        audit={selectedAuditForPrint}
        onClose={() => setSelectedAuditForPrint(null)}
      />
    </div>
  );
}
