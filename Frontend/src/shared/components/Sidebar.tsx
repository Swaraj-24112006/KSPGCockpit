import React, { useState } from 'react';
import {
  LayoutDashboard,
  Lightbulb,
  Flag,
  Sparkles,
  ShieldAlert,
  Compass,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  PlusCircle,
  FileText,
  Save,
  CheckCircle,
  ClipboardList,
  Sliders,
  TrendingUp,
  UserCheck,
  AlertOctagon,
  Gauge,
  Trophy,
  Award,
  Vote,
  Workflow,
  Crown,
  Flame,
  BarChart3,
  Tag,
  CheckSquare,
  BookOpen,
  Layers,
  Plus,
  Calendar,
  Tv,
  Eye,
  AlertTriangle,
  Stethoscope,
  Clock
} from 'lucide-react';
import { UserPersona } from '../../types';
import { RoleCategory, PpsrSubTab, canAccessTab, canAccessPpsrTab, hasModuleAccess, getModuleFriendlyName } from '../utils/rbac';
import { AuthUser } from '../utils/auth';

interface SidebarProps {
  activeModule: string;
  setActiveModule: (mod: any) => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  persona: UserPersona;
  setPersona: (p: UserPersona) => void;
  openRedflagsCount: number;

  // Quick sub-action setters
  setInitialRedFlagAction: (act: string | null) => void;
  setInitialFiveSAction: (act: string | null) => void;
  setInitialSafetyAction: (act: string | null) => void;
  setInitialPpsrAction: (act: string | null) => void;

  // Mobile layout trigger
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;

  // Presentation mode hide left window
  isSidebarHidden?: boolean;

  // RBAC / PPSR props (used for redirection + role-based menu visibility)
  currentUser?: AuthUser | null;
  onAccessDenied?: (moduleName: string) => void;
  draftsCount?: number;
  userRole?: RoleCategory;
  kaizenRole?: RoleCategory;
  ppsrRole?: RoleCategory;
  activePpsrTab?: PpsrSubTab;
  setActivePpsrTab?: (tab: PpsrSubTab) => void;
  openPpsrCount?: number;
  ppsrMeetingsCount?: number;
}

export default function Sidebar({
  activeModule,
  setActiveModule,
  activeTab,
  setActiveTab,
  persona,
  setPersona,
  openRedflagsCount,
  currentUser,
  onAccessDenied,
  draftsCount = 0,
  userRole = 'initiator',
  kaizenRole,
  ppsrRole,
  setActivePpsrTab,
  setInitialRedFlagAction,
  setInitialFiveSAction,
  setInitialSafetyAction,
  setInitialPpsrAction,
  isMobileOpen,
  setIsMobileOpen,
  isSidebarHidden = false
}: SidebarProps) {
  const effectiveKaizenRole: RoleCategory = kaizenRole || userRole || 'initiator';
  const effectivePpsrRole: RoleCategory = ppsrRole || userRole || 'initiator';
  // Desktop auto-hide: collapsed (icon rail) by default, opens on hover, closes on mouse leave.
  // The pin button sets isCollapsed to false to keep the sidebar permanently open.
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hovering, setHovering] = useState(false);

  // Expanded state of individual submenus (all collapsed by default to show all 5 SFM initiatives)
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    fives: false,
    safety: false,
    redflag: false,
    ppsr: false,
    kaizen: false,
  });

  const toggleSubmenu = (menuKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const selectModule = (moduleKey: any) => {
    if (moduleKey !== 'global-dashboard' && currentUser && !hasModuleAccess(currentUser, moduleKey)) {
      onAccessDenied?.(getModuleFriendlyName(moduleKey));
      return;
    }
    setActiveModule(moduleKey);
    if (moduleKey === 'ppsr' && setActivePpsrTab) {
      setActivePpsrTab(effectivePpsrRole === 'committee' ? 'meeting' : 'initiate');
    }
    // Close mobile drawer on item click without auto-expanding submenus
    setIsMobileOpen(false);
  };

  const selectSubTab = (moduleKey: any, subTab: string, actionVal?: string) => {
    if (moduleKey !== 'global-dashboard' && currentUser && !hasModuleAccess(currentUser, moduleKey)) {
      onAccessDenied?.(getModuleFriendlyName(moduleKey));
      return;
    }
    setActiveModule(moduleKey);
    if (moduleKey === 'kaizen') {
      setActiveTab(subTab as any);
    } else if (moduleKey === 'redflag') {
      setInitialRedFlagAction(actionVal || subTab || null);
    } else if (moduleKey === 'fives') {
      setInitialFiveSAction(actionVal || subTab || null);
    } else if (moduleKey === 'safety') {
      setInitialSafetyAction(actionVal || subTab || null);
    } else if (moduleKey === 'ppsr') {
      if (setActivePpsrTab && subTab) {
        setActivePpsrTab(subTab as PpsrSubTab);
      }
      setInitialPpsrAction(actionVal || null);
    }
    setIsMobileOpen(false);
  };

  // Determine if sidebar is effectively expanded (pinned open, hovered, or mobile drawer open)
  const isExpanded = !isCollapsed || hovering || isMobileOpen;

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Layout spacer: reserves only the slim rail width on desktop (full width when pinned),
          so the page content does not shift when the sidebar opens on hover */}
      <div
        className={`md:sticky md:top-0 md:h-screen md:z-50 md:shrink-0 transition-all duration-300 ${isSidebarHidden ? 'hidden! md:hidden!' : ''
          } ${isCollapsed ? 'md:w-16' : 'md:w-64'}`}
      >
        {/* Main Sidebar Component (hidden when Presentation Mode requests hide left window) */}
        <aside
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className={`fixed top-0 left-0 h-screen z-50 bg-slate-950 text-slate-300 border-r border-slate-800/80 flex flex-col transition-all duration-300 ${isSidebarHidden ? 'hidden! md:hidden!' : ''
            } ${isMobileOpen ? 'translate-x-0' : 'max-md:-translate-x-full'
            } ${isExpanded ? 'w-64' : 'w-16'
            } ${isCollapsed && hovering ? 'shadow-2xl shadow-black/60' : ''
            }`}
        >
          {/* Branding & Collapse Toggle */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white p-2 rounded-xl shadow-md flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              {isExpanded && (
                <div className="animate-fade-in flex flex-col">
                  <span className="font-display font-black text-sm tracking-wider text-white uppercase">
                    SHOPFLOOR MS
                  </span>
                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider font-mono">
                    Master Hub
                  </span>
                </div>
              )}
            </div>

            {/* Pin/Unpin Sidebar toggler (Desktop) - pin keeps it open, unpin returns to auto-hide */}
            {isExpanded && (
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition cursor-pointer"
                title={isCollapsed ? "Pin sidebar open" : "Unpin (auto-hide)"}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4 rotate-90" />
                )}
              </button>
            )}

            {/* Close mobile drawer */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">

            {/* Global Dashboard */}
            <div>
              <button
                onClick={() => selectModule('global-dashboard')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${activeModule === 'global-dashboard'
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                    : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <LayoutDashboard className="w-4 h-4 shrink-0 text-indigo-400" />
                  {isExpanded && <span className="truncate">SFC Dashboard</span>}
                </div>
              </button>
            </div>

            <div className="pt-2 pb-1 border-t border-slate-900 my-2">
              {isExpanded && (
                <span className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">
                  5 SFM Initiatives
                </span>
              )}
            </div>

            {/* 1. 5S Auditing */}
            <div className="space-y-1">
              <button
                onClick={() => selectModule('fives')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${activeModule === 'fives'
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                    : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-4 h-4 shrink-0 text-blue-400" />
                  {isExpanded && <span className="truncate">1. 🧼 5S Auditing</span>}
                </div>
                {isExpanded && (
                  <div
                    onClick={(e) => toggleSubmenu('fives', e)}
                    className="p-0.5 hover:bg-slate-800 rounded transition"
                  >
                    {expandedMenus.fives ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                )}
              </button>

              {isExpanded && expandedMenus.fives && (
                <div className="pl-7 pr-1 py-1 space-y-1 border-l-2 border-slate-900 ml-5 animate-fade-in">
                  <button
                    onClick={() => selectSubTab('fives', 'dashboard')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                  >
                    <BarChart3 className="w-3 h-3 shrink-0 text-blue-400" />
                    <span>1. Dashboard (Radar &amp; KPIs)</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('fives', 'form', 'audit-new')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                  >
                    <PlusCircle className="w-3 h-3 shrink-0 text-emerald-400" />
                    <span>2. Raise 25-Pt Audit Form</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('fives', 'tracker', 'audits-list')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                  >
                    <ClipboardList className="w-3 h-3 shrink-0" />
                    <span>3. Master Tracker (Audit Logs)</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('fives', 'presentation', 'presentation')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-slate-900/30"
                  >
                    <Tv className="w-3 h-3 shrink-0 text-indigo-400" />
                    <span>4. Presentation Mode</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('fives', 'other', 'redtags')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                  >
                    <Tag className="w-3 h-3 shrink-0 text-rose-400" />
                    <span>5. Other: 1S Red Tags</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('fives', 'other', 'actions')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                  >
                    <CheckSquare className="w-3 h-3 shrink-0 text-amber-400" />
                    <span>5. Other: CAPA Action Items</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('fives', 'other', 'soc')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                  >
                    <Sparkles className="w-3 h-3 shrink-0 text-cyan-400" />
                    <span>5. Other: 3S SOC Daily Gemba</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('fives', 'other', 'standards')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                  >
                    <BookOpen className="w-3 h-3 shrink-0 text-indigo-400" />
                    <span>5. Other: Visual Standards</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('fives', 'other', 'leaderboard')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-amber-400/90 hover:text-amber-300 hover:bg-slate-900/30"
                  >
                    <Trophy className="w-3 h-3 shrink-0 text-amber-400" />
                    <span>5. Other: Zone Championship</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Safety Desk */}
            <div className="space-y-1">
              <button
                onClick={() => selectModule('safety')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${activeModule === 'safety'
                    ? 'bg-amber-600/15 text-amber-400 border border-amber-500/20'
                    : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
                  {isExpanded && <span className="truncate">2. 🛡️ Safety Desk</span>}
                </div>
                {isExpanded && (
                  <div
                    onClick={(e) => toggleSubmenu('safety', e)}
                    className="p-0.5 hover:bg-slate-800 rounded transition"
                  >
                    {expandedMenus.safety ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                )}
              </button>

              {isExpanded && expandedMenus.safety && (
                <div className="pl-7 pr-1 py-1 space-y-1 border-l-2 border-slate-900 ml-5 animate-fade-in">
                  <button
                    onClick={() => selectSubTab('safety', 'dashboard')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-slate-900/30"
                  >
                    <BarChart3 className="w-3 h-3 shrink-0 text-emerald-400" />
                    <span>1. 📊 Zero Harm Dashboard</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('safety', 'observations')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-amber-400 hover:text-amber-200 hover:bg-slate-900/30"
                  >
                    <Eye className="w-3 h-3 shrink-0 text-amber-400" />
                    <span>2. 👁️ Safety Observations</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('safety', 'raise-observation', 'raise-observation')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1 rounded-lg text-left text-[10px] font-medium text-amber-300/80 hover:text-amber-100 hover:bg-slate-900/30 pl-5"
                  >
                    <PlusCircle className="w-2.5 h-2.5 shrink-0 text-amber-400" />
                    <span>✍️ Raise Observation</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('safety', 'nearmiss')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-orange-400 hover:text-orange-200 hover:bg-slate-900/30"
                  >
                    <AlertTriangle className="w-3 h-3 shrink-0 text-orange-400" />
                    <span>3. ⚠️ Near Miss Register</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('safety', 'raise-nearmiss', 'raise-nearmiss')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1 rounded-lg text-left text-[10px] font-medium text-orange-300/80 hover:text-orange-100 hover:bg-slate-900/30 pl-5"
                  >
                    <PlusCircle className="w-2.5 h-2.5 shrink-0 text-orange-400" />
                    <span>✍️ Raise Near Miss</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('safety', 'accidents')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-rose-400 hover:text-rose-200 hover:bg-slate-900/30"
                  >
                    <Stethoscope className="w-3 h-3 shrink-0 text-rose-400" />
                    <span>4. 🚑 Accident Reports</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('safety', 'presentation', 'presentation')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-slate-900/30"
                  >
                    <Tv className="w-3 h-3 shrink-0 text-indigo-400" />
                    <span>5. 🖨️ Presentation &amp; Print</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('safety', 'timeline', 'timeline')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-amber-400 hover:text-amber-200 hover:bg-slate-900/30"
                  >
                    <Clock className="w-3 h-3 shrink-0 text-amber-400" />
                    <span>6. ⏱️ Incident Timeline</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('safety', 'risk-matrix', 'risk-matrix')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-blue-400 hover:text-blue-300 hover:bg-slate-900/30"
                  >
                    <Layers className="w-3 h-3 shrink-0 text-blue-400" />
                    <span>7. 🎯 Risk Assessment Matrix</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Red Flags */}
            <div className="space-y-1">
              <button
                onClick={() => selectModule('redflag')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${activeModule === 'redflag'
                    ? 'bg-rose-600/15 text-rose-400 border border-rose-500/20'
                    : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Flag className="w-4 h-4 shrink-0 text-rose-500" />
                    {openRedflagsCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                    )}
                  </div>
                  {isExpanded && <span className="truncate">3. 🚩 Red Flags</span>}
                </div>
                {isExpanded && (
                  <div
                    onClick={(e) => toggleSubmenu('redflag', e)}
                    className="p-0.5 hover:bg-slate-800 rounded transition"
                  >
                    {expandedMenus.redflag ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                )}
              </button>

              {isExpanded && expandedMenus.redflag && (
                <div className="pl-7 pr-1 py-1 space-y-1 border-l-2 border-slate-900 ml-5 animate-fade-in">
                  <button
                    onClick={() => selectSubTab('redflag', 'dashboard', 'dashboard')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                  >
                    <BarChart3 className="w-3 h-3 shrink-0 text-rose-400" />
                    <span>1. Dashboard (Matrix)</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('redflag', 'form', 'raise-modal')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                  >
                    <PlusCircle className="w-3 h-3 shrink-0 text-rose-400" />
                    <span>2. Raise Red Flag Form</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('redflag', 'tracker', 'filter-all')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                  >
                    <ClipboardList className="w-3 h-3 shrink-0" />
                    <span>3. Master Tracker</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('redflag', 'presentation', 'presentation')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-slate-900/30"
                  >
                    <Tv className="w-3 h-3 shrink-0 text-indigo-400" />
                    <span>4. Presentation Mode</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('redflag', 'other', 'filter-sustenance')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                  >
                    <Calendar className="w-3 h-3 shrink-0 text-emerald-400" />
                    <span>5. Other: 3M Sustenance &amp; Print</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. PPSR (8D) */}
            <div className="space-y-1">
              <button
                onClick={() => selectModule('ppsr')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${activeModule === 'ppsr'
                    ? 'bg-violet-600/15 text-violet-400 border border-violet-500/20'
                    : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <Compass className="w-4 h-4 shrink-0 text-violet-400" />
                  {isExpanded && <span className="truncate">4. 🧠 PPSR (8D)</span>}
                </div>
                {isExpanded && (
                  <div
                    onClick={(e) => toggleSubmenu('ppsr', e)}
                    className="p-0.5 hover:bg-slate-800 rounded transition"
                  >
                    {expandedMenus.ppsr ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                )}
              </button>

              {isExpanded && expandedMenus.ppsr && (
                <div className="pl-7 pr-1 py-1 space-y-1 border-l-2 border-slate-900 ml-5 animate-fade-in">
                  <button
                    onClick={() => selectSubTab('ppsr', '', 'dashboard')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                  >
                    <BarChart3 className="w-3 h-3 shrink-0 text-violet-400" />
                    <span>1. Dashboard (8D Resolution)</span>
                  </button>
                  {canAccessPpsrTab(effectivePpsrRole, 'initiate') && (
                    <button
                      onClick={() => selectSubTab('ppsr', 'initiate', 'initiate-ppsr')}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                    >
                      <PlusCircle className="w-3 h-3 shrink-0 text-emerald-400" />
                      <span>2. Raise 8D Report Form</span>
                    </button>
                  )}
                  {canAccessPpsrTab(effectivePpsrRole, 'register') && (
                    <button
                      onClick={() => selectSubTab('ppsr', 'register', 'register')}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                    >
                      <ClipboardList className="w-3 h-3 shrink-0" />
                      <span>3. Master Tracker (8D Register)</span>
                    </button>
                  )}
                  <button
                    onClick={() => selectSubTab('ppsr', '', 'presentation')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-slate-900/30"
                  >
                    <Tv className="w-3 h-3 shrink-0 text-indigo-400" />
                    <span>4. Presentation Mode</span>
                  </button>
                  {canAccessPpsrTab(effectivePpsrRole, 'cft-awards') && (
                    <button
                      onClick={() => selectSubTab('ppsr', 'cft-awards', 'cft-awards')}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-amber-400/80 hover:text-amber-300 hover:bg-slate-900/30"
                    >
                      <Trophy className="w-3 h-3 shrink-0 text-amber-400" />
                      <span>5. Other: CFT Best Awards &amp; Review</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 5. Kaizen Tracker */}
            <div className="space-y-1">
              <button
                onClick={() => selectModule('kaizen')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${activeModule === 'kaizen'
                    ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/20'
                    : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Lightbulb className="w-4 h-4 shrink-0 text-emerald-400" />
                    {draftsCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full" />
                    )}
                  </div>
                  {isExpanded && <span className="truncate">5. 💡 Kaizen Tracker</span>}
                </div>
                {isExpanded && (
                  <div
                    onClick={(e) => toggleSubmenu('kaizen', e)}
                    className="p-0.5 hover:bg-slate-800 rounded transition"
                  >
                    {expandedMenus.kaizen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                )}
              </button>

              {/* Kaizen Submenu - Collapsed by default */}
              {isExpanded && expandedMenus.kaizen && (
                <div className="pl-7 pr-1 py-1 space-y-1 border-l-2 border-slate-900 ml-5 animate-fade-in">
                  <button
                    onClick={() => selectSubTab('kaizen', 'dashboard')}
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                      activeModule === 'kaizen' && activeTab === 'dashboard'
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                    }`}
                  >
                    <Gauge className="w-3 h-3 shrink-0 text-emerald-400" />
                    <span>1. Dashboard (Overview &amp; ROI)</span>
                  </button>
                  {canAccessTab(effectiveKaizenRole, 'kaizen', 'form') && (
                    <button
                      onClick={() => selectSubTab('kaizen', 'form')}
                      className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                        activeModule === 'kaizen' && activeTab === 'form'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                      }`}
                    >
                      <PlusCircle className="w-3 h-3 shrink-0 text-emerald-400" />
                      <span>2. Raise Kaizen Sheet Form</span>
                    </button>
                  )}
                  {canAccessTab(effectiveKaizenRole, 'kaizen', 'drafts') && (
                    <button
                      onClick={() => selectSubTab('kaizen', 'drafts')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                        activeModule === 'kaizen' && activeTab === 'drafts'
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <Save className="w-3 h-3 shrink-0 text-amber-400" />
                        <span className="truncate">Save Draft / My Drafts</span>
                      </div>
                      {typeof draftsCount === 'number' && draftsCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                          {draftsCount}
                        </span>
                      )}
                    </button>
                  )}
                  {canAccessTab(effectiveKaizenRole, 'kaizen', 'list') && (
                    <button
                      onClick={() => selectSubTab('kaizen', 'list')}
                      className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                        activeModule === 'kaizen' && activeTab === 'list'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                      }`}
                    >
                      <ClipboardList className="w-3 h-3 shrink-0" />
                      <span>3. Master Tracker (Spreadsheet)</span>
                    </button>
                  )}
                  <button
                    onClick={() => selectSubTab('kaizen', 'presentation')}
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                      activeModule === 'kaizen' && activeTab === 'presentation'
                        ? 'bg-indigo-500/20 text-indigo-300 font-bold'
                        : 'text-indigo-400 hover:text-indigo-300 hover:bg-slate-900/30'
                    }`}
                  >
                    <Tv className="w-3 h-3 shrink-0 text-indigo-400" />
                    <span>4. Presentation Mode</span>
                  </button>
                  {canAccessTab(effectiveKaizenRole, 'kaizen', 'committee') && (
                    <button
                      onClick={() => selectSubTab('kaizen', 'committee')}
                      className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                        activeModule === 'kaizen' && activeTab === 'committee'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
                      }`}
                    >
                      <UserCheck className="w-3 h-3 shrink-0" />
                      <span>5. Other: Committee Review</span>
                    </button>
                  )}
                  {canAccessTab(effectiveKaizenRole, 'kaizen', 'impact-tracker') && (
                    <button
                      onClick={() => selectSubTab('kaizen', 'impact-tracker')}
                      className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                        activeModule === 'kaizen' && activeTab === 'impact-tracker'
                          ? 'bg-amber-500/20 text-amber-300 font-bold'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
                      }`}
                    >
                      <CheckSquare className="w-3 h-3 shrink-0 text-amber-400" />
                      <span>5. Other: Impact Point Tracker</span>
                    </button>
                  )}
                  <button
                    onClick={() => selectSubTab('kaizen', 'gamification')}
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                      activeModule === 'kaizen' && activeTab === 'gamification'
                        ? 'bg-amber-500/20 text-amber-300 font-bold'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
                    }`}
                  >
                    <Crown className="w-3 h-3 shrink-0 text-amber-400" />
                    <span>5. Other: Gamification &amp; Culture</span>
                  </button>
                  <button
                    onClick={() => selectSubTab('kaizen', 'process-flowchart')}
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                      activeModule === 'kaizen' && activeTab === 'process-flowchart'
                        ? 'bg-indigo-500/20 text-indigo-300 font-bold'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
                    }`}
                  >
                    <Workflow className="w-3 h-3 shrink-0 text-indigo-400" />
                    <span>5. Other: Flowchart &amp; Standards</span>
                  </button>
                  {canAccessTab(effectiveKaizenRole, 'kaizen', 'cft-awards') && (
                    <button
                      onClick={() => selectSubTab('cft-awards', '')}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-amber-400/80 hover:text-amber-300 hover:bg-slate-900/30"
                    >
                      <Trophy className="w-3 h-3 shrink-0 text-amber-400" />
                      <span>5. Other: Monthly Best Awards</span>
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Persona quick switch panel at sidebar bottom (Very Enterprise!) */}
          {isExpanded && (
            <div className="p-3 border-t border-slate-800/80 bg-slate-950 shrink-0">
              <span className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-2 font-mono">
                ⚡ WORKSPACE PERSONA
              </span>
              <div className="grid grid-cols-1 gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPersona('operator')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg transition ${persona === 'operator'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                >
                  <span>👷</span>
                  <span className="truncate">Operator Console</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPersona('committee')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg transition ${persona === 'committee'
                      ? 'bg-indigo-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                >
                  <span>👥</span>
                  <span className="truncate">Committee Reviewer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPersona('manager')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg transition ${persona === 'manager'
                      ? 'bg-blue-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                >
                  <span>📊</span>
                  <span className="truncate">Manager BI Desk</span>
                </button>
              </div>
            </div>
          )}

        </aside>
      </div>
    </>
  );
}
