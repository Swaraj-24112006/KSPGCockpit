import React, { useState, useMemo } from 'react';
import { RedFlag, RedFlagRole } from '../types';
import CameraModal from './components/CameraModal';
import { useRedFlag } from './context/RedFlagContext';
import RedFlagActionModal from './components/RedFlagActionModal';
import RedFlagPrintSheet from './components/RedFlagPrintSheet';
import RedFlagSheetForm from './components/RedFlagSheetForm';
import RedFlagDashboard from './components/RedFlagDashboard';
import ErrorBoundary from './components/common/ErrorBoundary';
import RedFlagPresentationMode from './components/RedFlagPresentationMode';
import PresentationModeView, { SlideItem } from './components/common/PresentationModeView';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  Filter, 
  Plus, 
  X, 
  FileText, 
  Camera, 
  TrendingUp, 
  Layers, 
  Zap, 
  Sparkles, 
  Tag, 
  ArrowRight, 
  ExternalLink, 
  Check, 
  Printer, 
  Trash2,
  BarChart3,
  Calendar,
  Download,
  Eye,
  RefreshCw,
  UserCheck,
  LayoutDashboard,
  Tv,
  PlusCircle,
  ClipboardList
} from 'lucide-react';

interface RedFlagSystemProps {
  redFlags: RedFlag[];
  onAddRedFlag: (data: Partial<RedFlag>) => void;
  onUpdateRedFlag: (id: string, data: Partial<RedFlag>) => void;
  onDeleteRedFlag?: (id: string) => void;
  onEscalateToPpsr?: (id: string) => Promise<void>;
  onConvertToKaizen?: (id: string) => Promise<void>;
  onLinkToFiveS?: (id: string) => Promise<void>;
  currentPersona: string;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
  onNavigateToModule?: (moduleKey: string) => void;
  isSidebarHidden?: boolean;
  onToggleSidebar?: () => void;
}

export default function RedFlagSystem({
  redFlags,
  onAddRedFlag,
  onUpdateRedFlag,
  onDeleteRedFlag,
  onEscalateToPpsr,
  onConvertToKaizen,
  onLinkToFiveS,
  currentPersona,
  initialAction,
  onClearInitialAction,
  onNavigateToModule,
  isSidebarHidden,
  onToggleSidebar
}: RedFlagSystemProps) {
  // Navigation tabs in exact standard sequence:
  // 1. Dashboard -> 2. Raise the Form -> 3. Master Tracker -> 4. Presentation Mode -> 5. Other
  const [activeTab, setActiveTab] = useState<'dashboard' | 'form' | 'tracker' | 'presentation' | 'other'>('dashboard');

  // Filter & Search states for Master Tracker
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Contained' | 'In-Progress' | 'Under-Sustenance' | 'Closed'>('All');
  const [targetDeptFilter, setTargetDeptFilter] = useState<string>('All');
  const [raisedByDeptFilter, setRaisedByDeptFilter] = useState<string>('All');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [category5MFilter, setCategory5MFilter] = useState<string>('All');
  const [viewLayout, setViewLayout] = useState<'table' | 'cards'>('table');

  // Role-Based Access Control (RBAC) & Presentation states
  const [currentRole, setCurrentRole] = useState<RedFlagRole>('Initiator');
  const [presentingFlag, setPresentingFlag] = useState<RedFlag | null>(null);

  // Modals & Workflow Stage Routing across 4 stages
  const [selectedFlagForAction, setSelectedFlagForAction] = useState<RedFlag | null>(null);
  const [flagToPrint, setFlagToPrint] = useState<RedFlag | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [formWorkflowStage, setFormWorkflowStage] = useState<'initiator' | 'containment' | 'rootcause' | 'quality'>('initiator');
  const [formSelectedFlagId, setFormSelectedFlagId] = useState<string | null>(null);
  const { actions, showDevRoleSwitch, totalCount, currentPage, pageSize, setPage, setFilters } = useRedFlag();

  // Handle external deep actions from Sidebar or Dashboard
  React.useEffect(() => {
    if (initialAction === 'dashboard') {
      setActiveTab('dashboard');
      if (onClearInitialAction) onClearInitialAction();
    } else if (initialAction === 'form' || initialAction === 'raise-modal') {
      setActiveTab('form');
      if (onClearInitialAction) onClearInitialAction();
    } else if (initialAction === 'tracker' || initialAction === 'filter-all') {
      setActiveTab('tracker');
      setStatusFilter('All');
      if (onClearInitialAction) onClearInitialAction();
    } else if (initialAction === 'filter-open') {
      setActiveTab('tracker');
      setStatusFilter('Open');
      if (onClearInitialAction) onClearInitialAction();
    } else if (initialAction === 'presentation') {
      setActiveTab('presentation');
      if (onClearInitialAction) onClearInitialAction();
    } else if (initialAction === 'filter-sustenance' || initialAction === 'sustenance' || initialAction === 'other') {
      setActiveTab('other');
      if (onClearInitialAction) onClearInitialAction();
    }
  }, [initialAction]);

  // Export to CSV function via backend endpoint
  const exportToCSV = async () => {
    try {
      await actions.downloadCsv({
        search: searchTerm,
        status: statusFilter !== 'All' ? statusFilter : '',
        severity: severityFilter !== 'All' ? severityFilter : '',
        category_5m: category5MFilter !== 'All' ? category5MFilter : '',
        target_dept: targetDeptFilter !== 'All' ? targetDeptFilter : '',
        originating_dept: raisedByDeptFilter !== 'All' ? raisedByDeptFilter : ''
      });
    } catch (err: any) {
      console.error('CSV export failed:', err);
      alert(`Export failed: ${err.message || 'Server error'}`);
    }
  };

  // Filtered List calculation for Tracker
  const filteredFlags = redFlags.filter(rf => {
    const matchesSearch = 
      !searchTerm ||
      rf.redFlagNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rf.redFlagDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rf.raisedBy && rf.raisedBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rf.targetPerson && rf.targetPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
      rf.lineAreaName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rf.stationName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'All' ? true : 
      statusFilter === 'Under-Sustenance' ? (rf.status === 'Under-Sustenance' || (rf.sustenanceStartDate && !rf.sustenanceAchieved)) :
      rf.status === statusFilter;

    const matchesSeverity = severityFilter === 'All' ? true : (rf.severity === severityFilter);
    const matches5M = category5MFilter === 'All' ? true : (rf.category5M === category5MFilter);
    const matchesTargetDept = targetDeptFilter === 'All' ? true : (rf.targetDepartment === targetDeptFilter || rf.responsibleDepartment === targetDeptFilter);
    const matchesRaisedDept = raisedByDeptFilter === 'All' ? true : (rf.raisedByDepartment === raisedByDeptFilter);

    return matchesSearch && matchesStatus && matchesSeverity && matches5M && matchesTargetDept && matchesRaisedDept;
  });

  // Calculate Metrics (safely guarding against null/undefined records)
  const safeFlags = Array.isArray(redFlags) ? redFlags.filter(r => r && typeof r === 'object' && r.id) : [];
  const totalFlags = safeFlags.length;
  const openCount = safeFlags.filter(r => r.status === 'Open').length;
  const containedCount = safeFlags.filter(r => r.status === 'Contained').length;
  const inProgressCount = safeFlags.filter(r => r.status === 'In-Progress').length;
  const underSustenanceCount = safeFlags.filter(r => r.status === 'Under-Sustenance' || (r.sustenanceStartDate && !r.sustenanceAchieved)).length;
  const closedCount = safeFlags.filter(r => r.status === 'Closed' && r.sustenanceAchieved).length;

  // Presentation Mode Slides
  const presentationSlides: SlideItem[] = useMemo(() => [
    {
      id: 'slide-executive-scorecard',
      title: 'Executive Red Flag & Quality Incident Status',
      subtitle: 'Real-time Shopfloor Control (SFC) Live Board',
      badge: 'Live Status',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest block">Total Incidents</span>
              <span className="text-4xl md:text-5xl font-black font-mono text-white mt-2 block">{totalFlags}</span>
              <span className="text-xs text-slate-500 mt-2 block">Logged Plantwide</span>
            </div>
            <div className="bg-slate-900 border border-rose-900/50 rounded-2xl p-6 text-center">
              <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-widest block">Active Open</span>
              <span className="text-4xl md:text-5xl font-black font-mono text-rose-500 mt-2 block animate-pulse">{openCount}</span>
              <span className="text-xs text-rose-400/80 mt-2 block">&lt;2h Containment SLA</span>
            </div>
            <div className="bg-slate-900 border border-amber-900/50 rounded-2xl p-6 text-center">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest block">In 3M Sustenance</span>
              <span className="text-4xl md:text-5xl font-black font-mono text-amber-500 mt-2 block">{underSustenanceCount}</span>
              <span className="text-xs text-amber-400/80 mt-2 block">90-Day Point Kept Open</span>
            </div>
            <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl p-6 text-center">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block">Sustained &amp; Closed</span>
              <span className="text-4xl md:text-5xl font-black font-mono text-emerald-400 mt-2 block">{closedCount}</span>
              <span className="text-xs text-emerald-400/80 mt-2 block">QA Signed Zero-Recurrence</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Mandatory Governance Rules
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  1. Anyone can raise on anyone • 2. QA serves as official Custodian • 3. Points kept open until 3-month sustenance is achieved.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 font-mono">
              <span className="text-xs text-slate-400 uppercase block">Containment Rate</span>
              <span className="text-2xl font-black text-emerald-400">
                {totalFlags > 0 ? Math.round(((totalFlags - openCount) / totalFlags) * 100) : 100}%
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'slide-critical-alerts',
      title: 'Active Line Stop & Quarantine Alerts',
      subtitle: 'Immediate 4D Containment & Photographic Proof',
      badge: 'Defects & Containment',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {redFlags.filter(r => r.status === 'Open' || r.status === 'Contained').slice(0, 4).map(rf => (
            <div key={rf.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black font-mono text-rose-400">{rf.redFlagNo}</span>
                  <span className="text-xs font-bold text-slate-300">({rf.stationName})</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {rf.severity || 'Major'}
                </span>
              </div>

              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {rf.redFlagDescription}
              </p>

              <div className="grid grid-cols-2 gap-3 text-[11px] font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block uppercase text-[9px]">Raised By</span>
                  <span className="text-slate-200 font-bold">{rf.raisedByDepartment}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[9px]">Target Dept</span>
                  <span className="text-rose-400 font-bold">{rf.targetDepartment || rf.responsibleDepartment}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[9px]">Quarantined WIP</span>
                  <span className="text-amber-400 font-bold">{rf.suspectQtyQuarantined || 0} Pcs</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[9px]">Status</span>
                  <span className="text-emerald-400 font-bold">{rf.status}</span>
                </div>
              </div>

              {rf.evidencePhoto && (
                <div className="aspect-video bg-black/40 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                  <img crossOrigin="anonymous" src={rf.evidencePhoto} alt="Evidence" className="h-full object-contain" />
                </div>
              )}
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'slide-sustenance-engine',
      title: '3-Month Sustenance Engine (Point Kept Open)',
      subtitle: '90-Day Verification Milestones: Day 30, Day 60, Day 90 Audits',
      badge: '90-Day Watch',
      content: (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Sustenance Audit Verification Table</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400">
                    <th className="p-3">RF Number &amp; Station</th>
                    <th className="p-3">Sustenance Start</th>
                    <th className="p-3">Month 1 (30d)</th>
                    <th className="p-3">Month 2 (60d)</th>
                    <th className="p-3">Month 3 (90d)</th>
                    <th className="p-3">Outcome</th>
                    <th className="p-3 text-right">QA Custodian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {redFlags.slice(0, 6).map(rf => (
                    <tr key={rf.id} className="hover:bg-slate-800/40">
                      <td className="p-3">
                        <span className="text-rose-400 font-bold block">{rf.redFlagNo}</span>
                        <span className="text-[10px] text-slate-400">{rf.stationName}</span>
                      </td>
                      <td className="p-3 text-slate-300">{rf.sustenanceStartDate || rf.raisedDate}</td>
                      <td className="p-3">
                        <span className={rf.month1Check?.status === 'Passed' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                          {rf.month1Check?.status || 'Scheduled'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={rf.month2Check?.status === 'Passed' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                          {rf.month2Check?.status || 'Scheduled'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={rf.month3Check?.status === 'Passed' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                          {rf.month3Check?.status || 'Scheduled'}
                        </span>
                      </td>
                      <td className="p-3">
                        {rf.sustenanceAchieved ? (
                          <span className="text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded font-bold">
                            Closed (3M Achieved)
                          </span>
                        ) : (
                          <span className="text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded font-bold">
                            Point Kept Open
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right text-slate-300">{rf.qaCustodian || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'slide-pareto-matrix',
      title: '5M Root Cause Pareto & Originator Matrix',
      subtitle: 'Who Raises on Whom & Dominant Failure Modes',
      badge: 'Analytical Matrix',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              5M Root Cause Category Breakdown
            </h3>
            <div className="space-y-3 pt-2">
              {['Method', 'Machine', 'Material', 'Man', 'Measurement'].map(cat => {
                const count = redFlags.filter(r => (r.category5M || 'Method') === cat).length;
                const pct = totalFlags > 0 ? Math.round((count / totalFlags) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{cat}</span>
                      <span className="font-mono text-slate-400">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Accountability Flow (Anyone on Anyone)
            </h3>
            <div className="space-y-2 text-xs font-mono pt-2">
              {[
                { flow: 'Production ➔ Maintenance', desc: 'Tool wear, hydraulic & pneumatic line stops' },
                { flow: 'Quality QA ➔ Production', desc: 'Torque slippage & dimension non-conformance' },
                { flow: 'Stores / Inward ➔ Tooling', desc: 'Rough machining burrs & gauge calibration' },
                { flow: 'Safety EHS ➔ Maintenance', desc: 'Absence of interlock & emergency switch' }
              ].map(item => (
                <div key={item.flow} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-rose-400 font-bold block">{item.flow}</span>
                    <span className="text-[10px] text-slate-500">{item.desc}</span>
                  </div>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }
  ], [redFlags, totalFlags, openCount, underSustenanceCount, closedCount]);

  return (
    <div className="space-y-6 font-sans text-slate-900 animate-fade-in px-4 sm:px-6 lg:px-8 py-5 sm:py-6 bg-slate-50/50 min-h-screen">

      {/* Header Bar with Role-Based Access Switcher & Enhanced Spacing */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 bg-white p-4 sm:p-5 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-rose-600" />
              <span>SFC Red Flag Incident Tracker</span>
              <span className="text-[10px] font-mono bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold uppercase">
                IATF 16949 / SFC / QA / RF-01
              </span>
            </h1>
          </div>
          <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
            <span>Shop Floor Rule: <strong className="text-slate-800">Anyone can raise on anyone</strong></span>
            <span>·</span>
            <span>Custodian: <strong className="text-slate-800">QA is Custodian</strong></span>
            <span>·</span>
            <span>Sustenance: <strong className="text-slate-800">Point kept open for 3 months (90 days)</strong></span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Role Selector (RBAC) */}
          {showDevRoleSwitch && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs">
            <UserCheck className="w-4 h-4 text-rose-600 shrink-0" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-mono text-slate-500 font-bold block leading-none">Active Role:</span>
              <select
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value as RedFlagRole)}
                className="text-xs font-bold text-slate-900 bg-transparent outline-none cursor-pointer pr-1"
                title="Switch active role to test Role-Based Access Control"
              >
                <option value="Initiator">Initiator (Stage 1 Raising)</option>
                <option value="Target Person">Target Person (Stage 2 &amp; 3)</option>
                <option value="Quality Custodian">Quality Custodian (Stage 4 &amp; 3M)</option>
                <option value="Plant Head">Plant Head (Super Admin)</option>
              </select>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              currentRole === 'Initiator' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
              currentRole === 'Target Person' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
              currentRole === 'Quality Custodian' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
              'bg-purple-100 text-purple-800 border border-purple-200'
            }`}>
              {currentRole === 'Initiator' ? 'Stage 1 Only' :
               currentRole === 'Target Person' ? 'Stage 2 & 3' :
               currentRole === 'Quality Custodian' ? 'Stage 4 Custodian' : 'Super Admin'}
            </span>
          </div>
          )}

          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            title="Export full Red Flag spreadsheet to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
          
          <button
            onClick={() => {
              setFormWorkflowStage('initiator');
              setActiveTab('form');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Raise Stage 1 Red Flag</span>
          </button>
        </div>
      </div>

      {/* Unified Top Navigation in EXACT sequence requested:
          1. Dashboard -> 2. Raise the Form -> 3. Master Tracker -> 4. Presentation Mode -> 5. Other */}
      <div className="flex items-center gap-1 border-b border-slate-200 pt-1 overflow-x-auto scrollbar-none bg-white px-3 rounded-lg shadow-2xs">
        
        {/* 1. Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'dashboard'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5 text-indigo-500" />
          <span>1. Dashboard (Matrix)</span>
        </button>

        {/* 2. Raise the Form */}
        <button
          onClick={() => {
            setFormWorkflowStage('initiator');
            setActiveTab('form');
          }}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'form'
              ? 'border-rose-600 text-rose-700 bg-rose-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5 text-rose-500" />
          <span>2. 4-Stage Workflow Forms</span>
        </button>

        {/* 3. Master Tracker */}
        <button
          onClick={() => setActiveTab('tracker')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'tracker'
              ? 'border-slate-900 text-slate-900 bg-slate-50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5 text-slate-600" />
          <span>3. Master Tracker ({filteredFlags.length})</span>
        </button>

        {/* 4. Presentation Mode */}
        <button
          onClick={() => {
            if (!presentingFlag && redFlags.length > 0) {
              setPresentingFlag(redFlags[0]);
            }
            setActiveTab('presentation');
          }}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'presentation'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tv className="w-3.5 h-3.5 text-indigo-500" />
          <span>4. Presentation Mode (4 Stages)</span>
        </button>

        {/* 5. More / Sustenance & Forms */}
        <button
          onClick={() => setActiveTab('other')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'other'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
          <span>5. More / Sustenance &amp; Print</span>
          {underSustenanceCount > 0 && (
            <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded ml-1">
              {underSustenanceCount} Open
            </span>
          )}
        </button>

      </div>

      {/* TAB 1: ALL-COMBINATION DASHBOARD & ANALYTICS */}
      {activeTab === 'dashboard' && (
        <ErrorBoundary fallbackTitle="Red Flag Dashboard View">
          <RedFlagDashboard 
            redFlags={redFlags} 
            onSelectRedFlag={(rf) => setSelectedFlagForAction(rf)}
            onNavigateToTab={(tab) => {
              if (tab === 'form') setActiveTab('form');
              else if (tab === 'sustenance') setActiveTab('other');
              else if (tab === 'tracker') setActiveTab('tracker');
            }}
            onOpenWorkflowStage={(rf, stage) => {
              if (rf) setFormSelectedFlagId(rf.id);
              if (stage === 'initiator') setFormWorkflowStage('initiator');
              else if (stage === 'target') setFormWorkflowStage('containment');
              else setFormWorkflowStage('quality');
              setActiveTab('form');
            }}
          />
        </ErrorBoundary>
      )}

      {/* TAB 2: 4-STAGE WORKFLOW FORMS WITH ROLE-BASED ACCESS CONTROL */}
      {activeTab === 'form' && (
        <RedFlagSheetForm
          redFlags={redFlags}
          onAddRedFlag={(rfData) => {
            onAddRedFlag(rfData);
            setActiveTab('tracker');
          }}
          onUpdateRedFlag={onUpdateRedFlag}
          onCancel={() => setActiveTab('tracker')}
          onNavigateToTracker={() => setActiveTab('tracker')}
          initialWorkflowStage={formWorkflowStage}
          initialSelectedFlagId={formSelectedFlagId}
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
        />
      )}

      {/* TAB 4: 4-STAGE PRESENTATION MODE (IDENTICAL TO KAIZEN WITH HIDE LEFT WINDOW & ROLE ACCESS) */}
      {(activeTab === 'presentation' || presentingFlag) && (
        <RedFlagPresentationMode
          flag={presentingFlag || filteredFlags[0] || redFlags[0]}
          flagsList={redFlags}
          onSelectFlag={(flag) => setPresentingFlag(flag)}
          onUpdateFlag={(id, updates) => {
            onUpdateRedFlag(id, updates);
            if (presentingFlag && presentingFlag.id === id) {
              setPresentingFlag(prev => prev ? { ...prev, ...updates } : null);
            }
          }}
          onClose={() => {
            setPresentingFlag(null);
            if (activeTab === 'presentation') setActiveTab('tracker');
          }}
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          isSidebarHidden={isSidebarHidden}
          onToggleSidebar={onToggleSidebar}
        />
      )}

      {/* TAB 5: OTHER / 3-MONTH SUSTENANCE MONITOR & PRINT */}
      {activeTab === 'other' && (
        <div className="space-y-4">
          <div className="bg-white p-5 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>3-Month Sustenance Tracking Engine</span>
              </h2>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                IATF 16949 Sustenance Rule
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every Red Flag remains in <strong>OPEN status</strong> after immediate containment and CAPA until 90 continuous days pass without recurrence. Audits must be logged at 30, 60, and 90-day intervals by the QA Custodian.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[11px] uppercase">
                    <th className="p-3">Red Flag No &amp; Station</th>
                    <th className="p-3">Sustenance Start</th>
                    <th className="p-3 min-w-[150px]">Month 1 Audit (30d)</th>
                    <th className="p-3 min-w-[150px]">Month 2 Audit (60d)</th>
                    <th className="p-3 min-w-[150px]">Month 3 Audit (90d)</th>
                    <th className="p-3">Sustenance Outcome</th>
                    <th className="p-3">QA Custodian</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {redFlags.map((rf) => (
                    <tr key={rf.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <span className="font-mono font-bold text-rose-700 block">{rf.redFlagNo}</span>
                        <span className="text-[10px] text-slate-600">{rf.stationName} ({rf.lineAreaName})</span>
                      </td>

                      <td className="p-3 font-mono">
                        {rf.sustenanceStartDate || rf.raisedDate}
                      </td>

                      {/* Month 1 */}
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <span className={`font-bold block text-[11px] ${
                            rf.month1Check?.status === 'Passed' ? 'text-emerald-700' : 'text-slate-600'
                          }`}>
                            {rf.month1Check?.status === 'Passed' ? '✓ M1 Passed' : rf.month1Check?.status || 'Scheduled'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {rf.month1Check?.auditDate || rf.month1Check?.scheduledDate || 'Day 30'}
                          </span>
                        </div>
                      </td>

                      {/* Month 2 */}
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <span className={`font-bold block text-[11px] ${
                            rf.month2Check?.status === 'Passed' ? 'text-emerald-700' : 'text-slate-600'
                          }`}>
                            {rf.month2Check?.status === 'Passed' ? '✓ M2 Passed' : rf.month2Check?.status || 'Scheduled'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {rf.month2Check?.auditDate || rf.month2Check?.scheduledDate || 'Day 60'}
                          </span>
                        </div>
                      </td>

                      {/* Month 3 */}
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <span className={`font-bold block text-[11px] ${
                            rf.month3Check?.status === 'Passed' ? 'text-emerald-700' : 'text-slate-600'
                          }`}>
                            {rf.month3Check?.status === 'Passed' ? '✓ M3 Passed' : rf.month3Check?.status || 'Scheduled'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {rf.month3Check?.auditDate || rf.month3Check?.scheduledDate || 'Day 90'}
                          </span>
                        </div>
                      </td>

                      {/* Outcome */}
                      <td className="p-3">
                        {rf.sustenanceAchieved ? (
                          <span className="text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                            Achieved &amp; Closed
                          </span>
                        ) : (
                          <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                            Point Kept Open
                          </span>
                        )}
                      </td>

                      {/* QA Custodian */}
                      <td className="p-3 font-semibold text-slate-800">
                        {rf.qaCustodian || '—'}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedFlagForAction(rf)}
                          className="px-2.5 py-1 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                        >
                          Audit
                        </button>
                        <button
                          onClick={() => setFlagToPrint(rf)}
                          className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                          title="Print official Shopfloor Action Form"
                        >
                          <Printer className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MASTER TRACKER TABLE */}
      {activeTab === 'tracker' && (
        <div className="space-y-4">
          
          {/* KPI Metric Strip (High-density, zero-pill) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Raised</span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-0.5 tabular-nums">{totalFlags}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Shop floor non-conformances</div>
            </div>

            <div className="p-3 bg-white border border-rose-200 rounded-lg shadow-2xs">
              <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">Open / Action Needed</span>
              <div className="text-xl font-bold font-mono text-rose-700 mt-0.5 tabular-nums">{openCount + containedCount}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{containedCount} WIP lots contained</div>
            </div>

            <div className="p-3 bg-white border border-amber-200 rounded-lg shadow-2xs">
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">Under 3M Sustenance</span>
              <div className="text-xl font-bold font-mono text-amber-800 mt-0.5 tabular-nums">{underSustenanceCount}</div>
              <div className="text-[11px] text-amber-800 mt-0.5 font-medium">Points Kept Open (M1/M2/M3)</div>
            </div>

            <div className="p-3 bg-white border border-emerald-200 rounded-lg shadow-2xs">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">3M Sustained &amp; Closed</span>
              <div className="text-xl font-bold font-mono text-emerald-800 mt-0.5 tabular-nums">{closedCount}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">90-day zero recurrence audited</div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">QA Custodian Backlog</span>
              <div className="text-xl font-bold font-mono text-slate-800 mt-0.5 tabular-nums">
                {redFlags.filter(r => r.qaCustodianStatus === 'Review Pending' || !r.qaCustodianStatus).length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Pending QA verification</div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
            
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by RF No, defect description, raised by, target lead, station..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:border-slate-900 outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-white px-2 py-1.5 border border-slate-300 rounded text-xs outline-none font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open (Fresh)</option>
                <option value="Contained">Contained (WIP Quarantined)</option>
                <option value="In-Progress">In-Progress (CAPA)</option>
                <option value="Under-Sustenance">Under 3M Sustenance (Open)</option>
                <option value="Closed">Closed (3M Achieved)</option>
              </select>
            </div>

            {/* Target Department Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Target Dept:</span>
              <select
                value={targetDeptFilter}
                onChange={(e) => setTargetDeptFilter(e.target.value)}
                className="bg-white px-2 py-1.5 border border-slate-300 rounded text-xs outline-none font-medium"
              >
                <option value="All">All Target Depts</option>
                <option value="Production">Production</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Tooling & Die">Tooling &amp; Die</option>
                <option value="Quality">Quality</option>
                <option value="Logistics & Stores">Stores &amp; Inward</option>
              </select>
            </div>

            {/* 5M Category Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">5M Category:</span>
              <select
                value={category5MFilter}
                onChange={(e) => setCategory5MFilter(e.target.value)}
                className="bg-white px-2 py-1.5 border border-slate-300 rounded text-xs outline-none font-medium"
              >
                <option value="All">All 5M Categories</option>
                <option value="Man">Man</option>
                <option value="Machine">Machine</option>
                <option value="Material">Material</option>
                <option value="Method">Method</option>
                <option value="Measurement">Measurement</option>
                <option value="Environment">Environment</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-white px-2 py-1.5 border border-slate-300 rounded text-xs outline-none font-medium"
              >
                <option value="All">All Severities</option>
                <option value="Critical (Line Stop)">Critical (Line Stop)</option>
                <option value="Major (Quarantine)">Major (Quarantine)</option>
                <option value="Minor (Observation)">Minor (Observation)</option>
              </select>
            </div>

            {/* View Layout Toggle */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewLayout('table')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  viewLayout === 'table' ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Spreadsheet
              </button>
              <button
                onClick={() => setViewLayout('cards')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  viewLayout === 'cards' ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Cards
              </button>
            </div>

          </div>

          {/* TABLE LAYOUT: High-Density Industrial Shop Floor Spreadsheet */}
          {viewLayout === 'table' ? (
            <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-mono text-[11px] uppercase tracking-wider">
                      <th className="p-2.5 font-bold">Sr / RF No</th>
                      <th className="p-2.5 font-bold">1. Initiator (T0 Defect)</th>
                      <th className="p-2.5 font-bold">2. Target Person (T1 Containment)</th>
                      <th className="p-2.5 font-bold">Line &amp; Station</th>
                      <th className="p-2.5 font-bold">Type &amp; Severity</th>
                      <th className="p-2.5 font-bold min-w-[200px]">Defect &amp; Containment Proof</th>
                      <th className="p-2.5 font-bold text-center">Photos &amp; Time Gap</th>
                      <th className="p-2.5 font-bold text-center">Quarantined WIP</th>
                      <th className="p-2.5 font-bold">3. Quality (QA &amp; 3M)</th>
                      <th className="p-2.5 font-bold">Workflow Stage</th>
                      <th className="p-2.5 font-bold text-right">Role Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFlags.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="p-8 text-center text-slate-400">
                          No Red Flag records found matching current search and filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredFlags.map((rf, idx) => (
                        <tr key={rf.id} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* Sr & RF No */}
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-rose-700 block">{rf.redFlagNo}</span>
                            <span className="text-[10px] text-slate-600 font-mono">{rf.raisedDate}</span>
                          </td>

                          {/* 1. Initiator (Raised By) */}
                          <td className="p-2.5">
                            <span className="font-semibold text-slate-900 block truncate max-w-[140px]">{rf.raisedBy}</span>
                            <span className="text-[10px] text-emerald-700 font-mono block">Dept: {rf.raisedByDepartment}</span>
                          </td>

                          {/* 2. Target Person (Raised On — Responsible for Containment) */}
                          <td className="p-2.5">
                            <span className="font-bold text-slate-900 block truncate max-w-[140px]">{rf.targetPerson || 'Area In-charge'}</span>
                            <span className="text-[10px] text-amber-700 font-mono font-bold block">Target: {rf.targetDepartment || rf.responsibleDepartment}</span>
                          </td>

                          {/* Line & Station */}
                          <td className="p-2.5">
                            <span className="font-medium text-slate-800 block truncate max-w-[130px]">{rf.stationName}</span>
                            <span className="text-[10px] text-slate-600 truncate block max-w-[130px]">{rf.lineAreaName} ({rf.mfName})</span>
                          </td>

                          {/* Type & Severity */}
                          <td className="p-2.5 whitespace-nowrap">
                            <span className={`font-mono text-[11px] font-bold block ${
                              rf.severity?.includes('Critical') ? 'text-rose-700' :
                              rf.severity?.includes('Major') ? 'text-amber-700' : 'text-slate-600'
                            }`}>
                              {rf.severity || 'Major'}
                            </span>
                            <span className="text-[10px] text-slate-600 font-mono">{rf.redFlagType} · 5M: {rf.category5M || 'Method'}</span>
                          </td>

                          {/* Defect & Containment Description */}
                          <td className="p-2.5">
                            <p className="text-xs text-slate-800 font-medium line-clamp-2 max-w-[240px] leading-snug" title={rf.redFlagDescription}>
                              <strong className="text-rose-700">Defect:</strong> {rf.redFlagDescription}
                            </p>
                            {rf.containmentAction ? (
                              <p className="text-[10px] text-emerald-800 font-mono truncate max-w-[240px] mt-0.5" title={rf.containmentAction}>
                                <strong>Containment:</strong> {rf.containmentAction}
                              </p>
                            ) : (
                              <span className="text-[10px] text-amber-600 font-mono font-semibold block mt-0.5">
                                ⏳ Awaiting Target Person Containment
                              </span>
                            )}
                          </td>

                          {/* Point-of-Defect Photo vs Containment Photo & Time Gap */}
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {rf.evidencePhoto ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewPhoto(rf.evidencePhoto)}
                                  className="px-1.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[10px] font-mono font-bold hover:bg-rose-100 cursor-pointer"
                                  title="View Initiator Point-of-Defect Photo (T0)"
                                >
                                  T0 Photo
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400">No T0</span>
                              )}
                              <span className="text-slate-400 text-[10px]">➔</span>
                              {rf.countermeasurePhoto || rf.closureEvidence ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewPhoto(rf.countermeasurePhoto || rf.closureEvidence || null)}
                                  className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded text-[10px] font-mono font-bold hover:bg-emerald-100 cursor-pointer"
                                  title="View Target Person Containment Photo (T1)"
                                >
                                  T1 Photo
                                </button>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded text-[10px] font-mono">
                                  T1 Pending
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                              {rf.containmentTimeGap || (rf.status === 'Open' ? 'Pending' : '—')}
                            </span>
                          </td>

                          {/* 4D Quarantined WIP */}
                          <td className="p-2.5 text-center whitespace-nowrap font-mono tabular-nums">
                            {rf.suspectQtyQuarantined ? (
                              <div>
                                <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 block">
                                  {rf.suspectQtyQuarantined} pcs
                                </span>
                                <span className="text-[9px] text-slate-500 block mt-0.5">
                                  {rf.quarantineTagNo || `QT-${rf.redFlagNo}`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-amber-600 font-semibold">Pending</span>
                            )}
                          </td>

                          {/* 3. Quality Custodian & 3-Month Sustenance */}
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="font-semibold text-slate-800 block text-[11px]">{rf.qaCustodian || '—'}</span>
                            <div className="flex items-center gap-1 font-mono text-[10px] mt-0.5">
                              <span className={`px-1 rounded ${rf.month1Check?.status === 'Passed' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-500'}`}>M1</span>
                              <span className={`px-1 rounded ${rf.month2Check?.status === 'Passed' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-500'}`}>M2</span>
                              <span className={`px-1 rounded ${rf.month3Check?.status === 'Passed' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-500'}`}>M3</span>
                            </div>
                          </td>

                          {/* Workflow Stage Status */}
                          <td className="p-2.5 whitespace-nowrap font-mono text-[11px]">
                            <span className={`font-bold block ${
                              rf.status === 'Open' ? 'text-rose-600' :
                              rf.status === 'Contained' ? 'text-amber-600' :
                              rf.status === 'In-Progress' ? 'text-blue-600' :
                              rf.status === 'Under-Sustenance' ? 'text-indigo-600' :
                              'text-emerald-700'
                            }`}>
                              {rf.status}
                            </span>
                            <span className="text-[9px] text-slate-500 block">
                              {rf.status === 'Open'
                                ? 'At: Target Person'
                                : rf.status === 'Contained'
                                ? 'At: Quality Verify'
                                : 'At: QA 3M Audit'}
                            </span>
                          </td>

                          {/* Role Actions */}
                          <td className="p-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {rf.status === 'Open' || rf.containmentStatus === 'Pending' ? (
                                <button
                                  onClick={() => {
                                    setFormSelectedFlagId(rf.id);
                                    setFormWorkflowStage('target');
                                    setActiveTab('form');
                                  }}
                                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded text-[11px] font-bold transition-colors cursor-pointer"
                                  title="Open Target Person Containment & Quarantine Form"
                                >
                                  Target: Containment
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setFormSelectedFlagId(rf.id);
                                    setFormWorkflowStage('quality');
                                    setActiveTab('form');
                                  }}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition-colors cursor-pointer"
                                  title="Open Quality Custodian Verification Form"
                                >
                                  Quality: Verify
                                </button>
                              )}

                              {/* 4-Stage Presentation Mode Button */}
                              <button
                                onClick={() => {
                                  setPresentingFlag(rf);
                                  setActiveTab('presentation');
                                }}
                                className="p-1 text-indigo-700 hover:text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors cursor-pointer flex items-center gap-1 px-1.5"
                                title="Open 4-Stage Executive Slide Deck for this Red Flag"
                              >
                                <Tv className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold">Slides</span>
                              </button>

                              <button
                                onClick={() => setSelectedFlagForAction(rf)}
                                className="px-2 py-1 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Review Full 4-Stage Action Modal"
                              >
                                Details
                              </button>
                              
                              <button
                                onClick={() => setFlagToPrint(rf)}
                                className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                                title="Print official SFC Action Form (SFC/QA/RF-01)"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {(!rf.allowedActions || rf.allowedActions.includes('delete')) && (
                                <button
                                  onClick={async () => {
                                    const reason = window.prompt(`Please provide a reason for soft-deleting Red Flag ${rf.redFlagNo}:`);
                                    if (!reason || !reason.trim()) return;
                                    try {
                                      await actions.deleteRedFlag(rf.id, reason.trim());
                                      if (onDeleteRedFlag) onDeleteRedFlag(rf.id);
                                    } catch (err: any) {
                                      console.error('Delete failed:', err);
                                      alert(err.message || 'Failed to delete Red Flag.');
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Soft delete entry (Audit preserved)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* CARDS LAYOUT */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredFlags.map((rf) => (
                <div key={rf.id} className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="font-bold text-rose-700">{rf.redFlagNo}</span>
                        <span className="text-[10px] text-slate-500">· {rf.raisedDate}</span>
                      </div>
                      <span className={`font-mono text-[10px] font-bold ${
                        rf.status === 'Open' ? 'text-rose-600' :
                        rf.status === 'Contained' ? 'text-amber-600' : 'text-emerald-700'
                      }`}>
                        {rf.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-900 font-medium line-clamp-2 leading-relaxed">
                      {rf.redFlagDescription}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-mono">Raised By</span>
                        <span className="font-semibold text-slate-800">{rf.raisedByDepartment}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-mono">Target Dept</span>
                        <span className="font-bold text-slate-800">{rf.targetDepartment || rf.responsibleDepartment}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-mono text-slate-500">
                      QA: {rf.qaCustodian || '—'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setPresentingFlag(rf);
                          setActiveTab('presentation');
                        }}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-xs font-bold cursor-pointer flex items-center gap-1"
                        title="Open 4-Stage Presentation Mode"
                      >
                        <Tv className="w-3.5 h-3.5" />
                        <span>Slides</span>
                      </button>
                      <button
                        onClick={() => setSelectedFlagForAction(rf)}
                        className="px-2.5 py-1 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                      >
                        Action
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
            <span className="font-mono">
              Showing {totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} Red Flags
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition cursor-pointer"
              >
                ← Previous
              </button>
              <span className="px-2 font-mono font-bold">
                Page {currentPage} of {Math.max(1, Math.ceil(totalCount / pageSize))}
              </span>
              <button
                type="button"
                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                onClick={() => setPage(currentPage + 1)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition cursor-pointer"
              >
                Next →
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Action / Review Stepper Drawer Modal */}
      {selectedFlagForAction && (
        <RedFlagActionModal
          redFlag={selectedFlagForAction}
          onClose={() => setSelectedFlagForAction(null)}
          onUpdate={(id, data) => {
            onUpdateRedFlag(id, data);
            setSelectedFlagForAction(prev => prev ? ({ ...prev, ...data }) : null);
          }}
          onEscalateToPpsr={onEscalateToPpsr || (async () => {})}
          onConvertToKaizen={onConvertToKaizen || (async () => {})}
          onLinkToFiveS={onLinkToFiveS || (async () => {})}
          onOpenPrintSheet={(flag) => setFlagToPrint(flag)}
          currentPersona={currentPersona}
          onNavigateToModule={onNavigateToModule}
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          onOpenPresentation={(flag) => {
            setPresentingFlag(flag);
            setActiveTab('presentation');
            setSelectedFlagForAction(null);
          }}
        />
      )}

      {/* Official SFC/QA/RF-01 Print Sheet Modal */}
      {flagToPrint && (
        <RedFlagPrintSheet
          redFlag={flagToPrint}
          onClose={() => setFlagToPrint(null)}
        />
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 cursor-pointer"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-white rounded-lg p-2 overflow-hidden shadow-2xl">
            <img crossOrigin="anonymous" src={previewPhoto}
              alt="Evidence zoom"
              className="max-h-[80vh] w-auto mx-auto object-contain rounded"
            />
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 bg-slate-900/80 text-white rounded-full p-1.5 hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
