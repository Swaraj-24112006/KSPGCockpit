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
  ShieldCheck,
  FileEdit
} from 'lucide-react';
import { UserPersona } from '../../types';
import { RoleCategory, canAccessTab, getRoleBadge } from '../utils/rbac';

interface SidebarProps {
  activeModule: string;
  setActiveModule: (mod: any) => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  persona: UserPersona;
  setPersona: (p: UserPersona) => void;
  openRedflagsCount: number;
  draftsCount?: number;
  userRole?: RoleCategory;
  
  // Quick sub-action setters
  setInitialRedFlagAction: (act: string | null) => void;
  setInitialFiveSAction: (act: string | null) => void;
  setInitialSafetyAction: (act: string | null) => void;
  setInitialPpsrAction: (act: string | null) => void;

  // Mobile layout trigger
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export default function Sidebar({
  activeModule,
  setActiveModule,
  activeTab,
  setActiveTab,
  persona,
  setPersona,
  openRedflagsCount,
  draftsCount = 0,
  userRole = 'initiator',
  setInitialRedFlagAction,
  setInitialFiveSAction,
  setInitialSafetyAction,
  setInitialPpsrAction,
  isMobileOpen,
  setIsMobileOpen
}: SidebarProps) {
  // Desktop collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);

  // Expanded state of individual submenus
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    kaizen: true,
    redflag: false,
    fives: false,
    safety: false,
    ppsr: false,
  });

  const toggleSubmenu = (menuKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const selectModule = (moduleKey: any) => {
    setActiveModule(moduleKey);
    // Auto-open submenu when selecting a module
    setExpandedMenus(prev => ({
      ...prev,
      [moduleKey]: true
    }));
    // Close mobile drawer on item click
    setIsMobileOpen(false);
  };

  const selectSubTab = (moduleKey: any, subTab: string, actionVal?: string) => {
    setActiveModule(moduleKey);
    if (moduleKey === 'kaizen') {
      setActiveTab(subTab as any);
    } else if (moduleKey === 'redflag') {
      setInitialRedFlagAction(actionVal || null);
    } else if (moduleKey === 'fives') {
      setInitialFiveSAction(actionVal || null);
    } else if (moduleKey === 'safety') {
      setInitialSafetyAction(actionVal || null);
    } else if (moduleKey === 'ppsr') {
      setInitialPpsrAction(actionVal || null);
    }
    setIsMobileOpen(false);
  };

  // Determine if sidebar is effectively expanded (either pinned expanded, or collapsed but hovered)
  const isExpanded = !isCollapsed || hovering;

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main Sidebar Component */}
      <aside
        onMouseEnter={() => isCollapsed && setHovering(true)}
        onMouseLeave={() => isCollapsed && setHovering(false)}
        className={`fixed md:sticky top-0 left-0 h-screen z-50 bg-slate-950 text-slate-300 border-r border-slate-800/80 flex flex-col transition-all duration-300 ${
          isMobileOpen 
            ? 'translate-x-0 w-64' 
            : 'max-md:-translate-x-full'
        } ${
          isExpanded ? 'w-64' : 'w-16'
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

          {/* Pin/Unpin Sidebar toggler (Desktop) */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition cursor-pointer"
            title={isCollapsed ? "Pin sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4 rotate-90" />
            )}
          </button>

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
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${
                activeModule === 'global-dashboard'
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <LayoutDashboard className="w-4 h-4 shrink-0 text-indigo-400" />
                {isExpanded && <span className="truncate">SFMS Dashboard</span>}
              </div>
            </button>
          </div>

          <div className="pt-2 pb-1 border-t border-slate-900 my-2">
            {isExpanded && (
              <span className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">
                Modules & Registers
              </span>
            )}
          </div>

          {/* Kaizen Tracker */}
          <div className="space-y-1">
            <button
              onClick={() => selectModule('kaizen')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${
                activeModule === 'kaizen'
                  ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/20'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Lightbulb className="w-4 h-4 shrink-0 text-emerald-400" />
                {isExpanded && <span className="truncate">💡 Kaizen Tracker</span>}
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

            {/* Kaizen Submenu */}
            {isExpanded && expandedMenus.kaizen && (
              <div className="pl-7 pr-1 py-1 space-y-1 border-l-2 border-slate-900 ml-5 animate-fade-in">
                {/* 1. Overview Dashboard: Accessible to ALL roles */}
                <button
                  onClick={() => selectSubTab('kaizen', 'dashboard')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                    activeModule === 'kaizen' && activeTab === 'dashboard'
                      ? 'text-emerald-400 font-bold bg-slate-900/60'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
                  }`}
                >
                  <Gauge className="w-3 h-3 shrink-0" />
                  <span>Overview Dashboard</span>
                </button>

                {/* 2. Log New Kaizen: Initiator, Coordinator, Admin */}
                {canAccessTab(userRole, 'kaizen', 'form') && (
                  <button
                    onClick={() => selectSubTab('kaizen', 'form')}
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                      activeModule === 'kaizen' && activeTab === 'form'
                        ? 'text-emerald-400 font-bold bg-slate-900/60'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
                    }`}
                  >
                    <PlusCircle className="w-3 h-3 shrink-0 text-emerald-400" />
                    <span>👷 Log New Kaizen</span>
                  </button>
                )}

                {/* 2b. My Drafts: Initiator, Coordinator, Admin */}
                {canAccessTab(userRole, 'kaizen', 'drafts') && (
                  <button
                    onClick={() => selectSubTab('kaizen', 'drafts')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                      activeModule === 'kaizen' && activeTab === 'drafts'
                        ? 'text-amber-400 font-bold bg-slate-900/60'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <FileEdit className="w-3 h-3 shrink-0 text-amber-400" />
                      <span>📝 My Drafts</span>
                    </div>
                    {draftsCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {draftsCount}
                      </span>
                    )}
                  </button>
                )}

                {/* 3. Committee Review: Committee, Coordinator, Admin */}
                {canAccessTab(userRole, 'kaizen', 'committee') && (
                  <button
                    onClick={() => selectSubTab('kaizen', 'committee')}
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                      activeModule === 'kaizen' && activeTab === 'committee'
                        ? 'text-emerald-400 font-bold bg-slate-900/60'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
                    }`}
                  >
                    <UserCheck className="w-3 h-3 shrink-0 text-indigo-400" />
                    <span>👥 Committee Review</span>
                  </button>
                )}

                {/* 4. Monthly Best Awards: Super Admin & Kaizen Coordinator ONLY */}
                {canAccessTab(userRole, 'kaizen', 'cft-awards') && (
                  <button
                    onClick={() => selectSubTab('cft-awards', '')}
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                      activeModule === 'cft-awards' || (activeModule === 'kaizen' && activeTab === 'cft-awards')
                        ? 'text-amber-400 font-bold bg-slate-900/60'
                        : 'text-amber-400/80 hover:text-amber-300 hover:bg-slate-900/30'
                    }`}
                  >
                    <Trophy className="w-3 h-3 shrink-0 text-amber-400" />
                    <span>🏆 Monthly Best Awards</span>
                  </button>
                )}

                {/* 5. Impact Point & Closure: Committee, Coordinator, Admin */}
                {canAccessTab(userRole, 'kaizen', 'impact-tracker') && (
                  <button
                    onClick={() => selectSubTab('kaizen', 'impact-tracker')}
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                      activeModule === 'kaizen' && activeTab === 'impact-tracker'
                        ? 'text-indigo-400 font-bold bg-slate-900/60'
                        : 'text-indigo-300/80 hover:text-indigo-200 hover:bg-slate-900/30'
                    }`}
                  >
                    <ClipboardList className="w-3 h-3 shrink-0 text-indigo-400" />
                    <span>🎯 Impact Point & Closure</span>
                  </button>
                )}

                {/* 6. End-to-End Flowchart: ALL roles */}
                <button
                  onClick={() => selectSubTab('kaizen', 'process-flowchart')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                    activeModule === 'kaizen' && activeTab === 'process-flowchart'
                      ? 'text-indigo-400 font-bold bg-slate-900/60'
                      : 'text-indigo-300/80 hover:text-indigo-200 hover:bg-slate-900/30'
                  }`}
                >
                  <Workflow className="w-3 h-3 shrink-0 text-indigo-400" />
                  <span>🔄 End-to-End Flowchart</span>
                </button>

                {/* 7. Spreadsheet Register: Committee, Coordinator, Admin */}
                {canAccessTab(userRole, 'kaizen', 'list') && (
                  <button
                    onClick={() => selectSubTab('kaizen', 'list')}
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                      activeModule === 'kaizen' && activeTab === 'list'
                        ? 'text-emerald-400 font-bold bg-slate-900/60'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
                    }`}
                  >
                    <ClipboardList className="w-3 h-3 shrink-0 text-emerald-400" />
                    <span>📋 Spreadsheet Register</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Red Flags */}
          <div className="space-y-1">
            <button
              onClick={() => selectModule('redflag')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${
                activeModule === 'redflag'
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
                {isExpanded && <span className="truncate">🚩 Red Flags</span>}
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
                  onClick={() => selectSubTab('redflag', '', 'filter-all')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                >
                  <ClipboardList className="w-3 h-3 shrink-0" />
                  <span>Register & Actions</span>
                </button>
                <button
                  onClick={() => selectSubTab('redflag', '', 'raise-modal')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                >
                  <AlertOctagon className="w-3 h-3 shrink-0" />
                  <span>Raise Red Flag</span>
                </button>
              </div>
            )}
          </div>

          {/* 5S Auditing */}
          <div className="space-y-1">
            <button
              onClick={() => selectModule('fives')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${
                activeModule === 'fives'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Sparkles className="w-4 h-4 shrink-0 text-blue-400" />
                {isExpanded && <span className="truncate">🧼 5S Auditing</span>}
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
                  onClick={() => selectSubTab('fives', '')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                >
                  <ClipboardList className="w-3 h-3 shrink-0" />
                  <span>Audit Dashboard</span>
                </button>
                <button
                  onClick={() => selectSubTab('fives', '', 'log-audit')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                >
                  <PlusCircle className="w-3 h-3 shrink-0" />
                  <span>New 5S Audit</span>
                </button>
              </div>
            )}
          </div>

          {/* Safety Desk */}
          <div className="space-y-1">
            <button
              onClick={() => selectModule('safety')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${
                activeModule === 'safety'
                  ? 'bg-amber-600/15 text-amber-400 border border-amber-500/20'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
                {isExpanded && <span className="truncate">🛡️ Safety Desk</span>}
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
                  onClick={() => selectSubTab('safety', '')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                >
                  <ClipboardList className="w-3 h-3 shrink-0" />
                  <span>EHS Log Register</span>
                </button>
                <button
                  onClick={() => selectSubTab('safety', '', 'report-hazard')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                >
                  <PlusCircle className="w-3 h-3 shrink-0" />
                  <span>Report Hazard/Incident</span>
                </button>
              </div>
            )}
          </div>

          {/* PPSR (8D) */}
          <div className="space-y-1">
            <button
              onClick={() => selectModule('ppsr')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${
                activeModule === 'ppsr'
                  ? 'bg-violet-600/15 text-violet-400 border border-violet-500/20'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Compass className="w-4 h-4 shrink-0 text-violet-400" />
                {isExpanded && <span className="truncate">🧠 PPSR (8D)</span>}
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
                  onClick={() => selectSubTab('ppsr', '')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                >
                  <ClipboardList className="w-3 h-3 shrink-0" />
                  <span>Practical Problem Solving</span>
                </button>
                <button
                  onClick={() => selectSubTab('ppsr', '', 'initiate-ppsr')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                >
                  <PlusCircle className="w-3 h-3 shrink-0" />
                  <span>Initiate New PPSR</span>
                </button>
                {canAccessTab(userRole, 'cft-awards') && (
                  <button
                    onClick={() => selectSubTab('cft-awards', '')}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-amber-400/80 hover:text-amber-300 hover:bg-slate-900/30"
                  >
                    <Trophy className="w-3 h-3 shrink-0 text-amber-400" />
                    <span>🏆 CFT Best Awards</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* CFT Monthly Best Awards Top-Level Module: Super Admin & Kaizen Coordinator ONLY */}
          {canAccessTab(userRole, 'cft-awards') && (
            <div className="pt-2">
              <button
                onClick={() => selectModule('cft-awards')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${
                  activeModule === 'cft-awards'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'hover:bg-slate-900 text-amber-400/90 hover:text-amber-300 border border-amber-500/10 bg-amber-500/5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Trophy className="w-4 h-4 shrink-0 text-amber-400" />
                  {isExpanded && <span className="truncate">🏆 CFT Best Awards</span>}
                </div>
                {isExpanded && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">
                    VOTE
                  </span>
                )}
              </button>
            </div>
          )}

        </div>

        {/* Active Security Role Badge */}
        {isExpanded && (
          <div className="p-3 border-t border-slate-800/80 bg-slate-950 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider font-mono">
                🔒 RBAC ROLE
              </span>
              <span className="text-[9px] text-emerald-400 font-mono font-bold flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400 inline" />
                <span>ACTIVE</span>
              </span>
            </div>
            <div className={`px-2.5 py-1.5 rounded-xl border flex items-center space-x-2 ${getRoleBadge(userRole).colorClass}`}>
              <span className="text-sm">{getRoleBadge(userRole).icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold truncate leading-tight">
                  {getRoleBadge(userRole).label}
                </div>
                <div className="text-[9px] opacity-75 truncate leading-tight font-mono">
                  {getRoleBadge(userRole).description}
                </div>
              </div>
            </div>
          </div>
        )}


      </aside>
    </>
  );
}
