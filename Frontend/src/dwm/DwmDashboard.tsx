import React, { useState } from 'react';
import { AuthUser, logout as authLogout } from '../shared/utils/auth';
import { getRoleBadge, RoleCategory } from '../shared/utils/rbac';
import {
  ShieldCheck,
  ClipboardCheck,
  CheckCircle2,
  FileCheck2,
  FileSpreadsheet,
  BarChart3,
  Clock,
  Gauge,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Bell,
  HelpCircle,
  X,
  ExternalLink,
  Cpu,
  Layers,
  Sparkles,
  Award,
  AlertTriangle,
  ChevronRight,
  Activity,
  Boxes,
  Sliders
} from 'lucide-react';

export interface DwmDashboardProps {
  currentUser?: AuthUser | null;
  onBackToLanding: () => void;
  onLaunchChecklist: () => void;
  onLogout?: () => void;
  onNavigateToSuperadmin?: () => void;
}

interface DwmAppDef {
  id: string;
  name: string;
  category: 'execution' | 'quality' | 'production';
  categoryLabel: string;
  badge: string;
  badgeType: 'active' | 'staged';
  theme: {
    border: string;
    shadow: string;
    hoverShadow: string;
    hudBorder: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    pingBg: string;
    iconBg: string;
    iconText: string;
    iconBorder: string;
    iconHoverBg: string;
    gradient: string;
    gradientHover: string;
    btnShadow: string;
  };
  icon: React.ElementType;
  description: string;
  pills: Array<{ label: string; dotColor: string }>;
  isCurrentProject?: boolean;
}

export default function DwmDashboard({
  currentUser,
  onBackToLanding,
  onLaunchChecklist,
  onLogout,
  onNavigateToSuperadmin,
}: DwmDashboardProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedAppModal, setSelectedAppModal] = useState<DwmAppDef | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'execution' | 'quality' | 'production'>('all');

  const userRole: RoleCategory = currentUser?.role_category || 'initiator';
  const roleBadge = getRoleBadge(userRole);
  const isSuperadmin = Boolean(currentUser?.is_superadmin || currentUser?.role_category === 'superadmin');

  const handleLogout = async () => {
    await authLogout();
    onLogout?.();
  };

  const showModuleNotice = (modName: string) => {
    setToastMessage(`Module "${modName}" is currently staged for deployment in the upcoming DWM release cycle.`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // The 5 DWM Applications
  const dwmApps: DwmAppDef[] = [
    {
      id: 'checklist',
      name: 'Checklist Verification',
      category: 'execution',
      categoryLabel: 'Shop Floor Execution',
      badge: 'ACTIVE MODULE • READY',
      badgeType: 'active',
      isCurrentProject: true,
      theme: {
        border: 'border-emerald-500',
        shadow: 'shadow-[0_16px_50px_rgba(14,22,38,0.8),0_0_35px_rgba(16,185,129,0.25)]',
        hoverShadow: 'hover:shadow-[0_20px_60px_rgba(16,185,129,0.35)]',
        hudBorder: 'border-emerald-500',
        badgeBg: 'bg-emerald-500/15',
        badgeText: 'text-emerald-400',
        badgeBorder: 'border-emerald-500/30',
        pingBg: 'bg-emerald-400',
        iconBg: 'bg-emerald-500/20',
        iconText: 'text-emerald-400',
        iconBorder: 'border-emerald-500/30',
        iconHoverBg: 'group-hover:bg-emerald-500',
        gradient: 'from-emerald-500 to-emerald-600',
        gradientHover: 'hover:from-emerald-600 hover:to-emerald-700',
        btnShadow: 'shadow-emerald-500/30',
      },
      icon: ClipboardCheck,
      description:
        'Operator machine & pokayoke verification checklists with photo evidence capture, GPS geofencing, deviation management, and real-time compliance dashboards.',
      pills: [
        { label: 'Machine Checks', dotColor: 'bg-emerald-400' },
        { label: 'Pokayoke Verify', dotColor: 'bg-sky-400' },
        { label: 'Deviation Logs', dotColor: 'bg-amber-400' },
        { label: 'Photo Evidence', dotColor: 'bg-rose-400' },
      ],
    },
    {
      id: 'first-piece',
      name: 'First Piece Inspection Report',
      category: 'quality',
      categoryLabel: 'Quality & Setup Assurance',
      badge: 'ACTIVE MODULE • READY',
      badgeType: 'staged',
      theme: {
        border: 'border-cyan-500',
        shadow: 'shadow-[0_16px_50px_rgba(14,22,38,0.8),0_0_35px_rgba(6,182,212,0.25)]',
        hoverShadow: 'hover:shadow-[0_20px_60px_rgba(6,182,212,0.35)]',
        hudBorder: 'border-cyan-500',
        badgeBg: 'bg-cyan-500/15',
        badgeText: 'text-cyan-400',
        badgeBorder: 'border-cyan-500/30',
        pingBg: 'bg-cyan-400',
        iconBg: 'bg-cyan-500/20',
        iconText: 'text-cyan-400',
        iconBorder: 'border-cyan-500/30',
        iconHoverBg: 'group-hover:bg-cyan-500',
        gradient: 'from-cyan-500 to-blue-600',
        gradientHover: 'hover:from-cyan-600 hover:to-blue-700',
        btnShadow: 'shadow-cyan-500/30',
      },
      icon: FileCheck2,
      description:
        'Mandatory shift-start, tool change, and batch turnover verification protocol. Validates first-off parts against GD&T engineering drawings and dimensional tolerance limits.',
      pills: [
        { label: 'Shift Setup Audit', dotColor: 'bg-cyan-400' },
        { label: 'Tolerance Limits', dotColor: 'bg-indigo-400' },
        { label: 'Calibration Sync', dotColor: 'bg-amber-400' },
        { label: 'QA Sign-off', dotColor: 'bg-emerald-400' },
      ],
    },
    {
      id: 'last-piece',
      name: 'Last Piece Inspection Report',
      category: 'quality',
      categoryLabel: 'Quality & Tooling Lifecycle',
      badge: 'ACTIVE MODULE • READY',
      badgeType: 'staged',
      theme: {
        border: 'border-indigo-500',
        shadow: 'shadow-[0_16px_50px_rgba(14,22,38,0.8),0_0_35px_rgba(99,102,241,0.25)]',
        hoverShadow: 'hover:shadow-[0_20px_60px_rgba(99,102,241,0.35)]',
        hudBorder: 'border-indigo-500',
        badgeBg: 'bg-indigo-500/15',
        badgeText: 'text-indigo-400',
        badgeBorder: 'border-indigo-500/30',
        pingBg: 'bg-indigo-400',
        iconBg: 'bg-indigo-500/20',
        iconText: 'text-indigo-400',
        iconBorder: 'border-indigo-500/30',
        iconHoverBg: 'group-hover:bg-indigo-500',
        gradient: 'from-indigo-500 to-purple-600',
        gradientHover: 'hover:from-indigo-600 hover:to-purple-700',
        btnShadow: 'shadow-indigo-500/30',
      },
      icon: Award,
      description:
        'End-of-lot inspection and tooling preservation protocol. Identifies dimensional wear, cavity burrs, and machine drift to approve tool teardown and batch closure.',
      pills: [
        { label: 'Batch Closeout', dotColor: 'bg-indigo-400' },
        { label: 'Wear Analytics', dotColor: 'bg-rose-400' },
        { label: 'Die & Mold Check', dotColor: 'bg-sky-400' },
        { label: 'Pass / Fail Disposition', dotColor: 'bg-emerald-400' },
      ],
    },
    {
      id: 'daily-production',
      name: 'Daily Production Report',
      category: 'production',
      categoryLabel: 'Production Analytics',
      badge: 'ACTIVE MODULE • READY',
      badgeType: 'staged',
      theme: {
        border: 'border-amber-500',
        shadow: 'shadow-[0_16px_50px_rgba(14,22,38,0.8),0_0_35px_rgba(245,158,11,0.25)]',
        hoverShadow: 'hover:shadow-[0_20px_60px_rgba(245,158,11,0.35)]',
        hudBorder: 'border-amber-500',
        badgeBg: 'bg-amber-500/15',
        badgeText: 'text-amber-400',
        badgeBorder: 'border-amber-500/30',
        pingBg: 'bg-amber-400',
        iconBg: 'bg-amber-500/20',
        iconText: 'text-amber-400',
        iconBorder: 'border-amber-500/30',
        iconHoverBg: 'group-hover:bg-amber-500',
        gradient: 'from-amber-500 to-amber-600',
        gradientHover: 'hover:from-amber-600 hover:to-amber-700',
        btnShadow: 'shadow-amber-500/30',
      },
      icon: BarChart3,
      description:
        'Shift-by-shift consolidated production volume, target vs actual output reconciliation, overall equipment effectiveness (OEE), scrap accounting, and downtime Pareto charts.',
      pills: [
        { label: 'Plan vs Actual', dotColor: 'bg-amber-400' },
        { label: 'OEE Metrics', dotColor: 'bg-emerald-400' },
        { label: 'Scrap & Rework', dotColor: 'bg-rose-400' },
        { label: 'Shift Summary', dotColor: 'bg-sky-400' },
      ],
    },
    {
      id: 'hourly-production',
      name: 'Hourly Production',
      category: 'production',
      categoryLabel: 'Real-time Monitoring',
      badge: 'ACTIVE MODULE • READY',
      badgeType: 'staged',
      theme: {
        border: 'border-[#4C7FFF]',
        shadow: 'shadow-[0_16px_50px_rgba(14,22,38,0.8),0_0_35px_rgba(76,127,255,0.25)]',
        hoverShadow: 'hover:shadow-[0_20px_60px_rgba(76,127,255,0.35)]',
        hudBorder: 'border-[#4C7FFF]',
        badgeBg: 'bg-[#4C7FFF]/15',
        badgeText: 'text-[#4C7FFF]',
        badgeBorder: 'border-[#4C7FFF]/30',
        pingBg: 'bg-[#4C7FFF]',
        iconBg: 'bg-[#4C7FFF]/20',
        iconText: 'text-[#4C7FFF]',
        iconBorder: 'border-[#4C7FFF]/30',
        iconHoverBg: 'group-hover:bg-[#4C7FFF]',
        gradient: 'from-[#4C7FFF] to-[#366CEC]',
        gradientHover: 'hover:from-[#366CEC] hover:to-[#0652d2]',
        btnShadow: 'shadow-[#4C7FFF]/30',
      },
      icon: Gauge,
      description:
        'Live hour-by-hour output pace tracking, takt time pacing boards, bottleneck warnings, micro-stoppage detection, and operator line velocity visual cues.',
      pills: [
        { label: 'Hourly Output', dotColor: 'bg-[#4C7FFF]' },
        { label: 'Takt Pacing', dotColor: 'bg-emerald-400' },
        { label: 'Bottleneck Alerts', dotColor: 'bg-rose-400' },
        { label: 'Cycle Speed', dotColor: 'bg-amber-400' },
      ],
    },
  ];

  const filteredApps = activeFilter === 'all'
    ? dwmApps
    : dwmApps.filter((app) => app.category === activeFilter);

  const handleAppLaunch = (app: DwmAppDef) => {
    if (app.isCurrentProject) {
      onLaunchChecklist();
    } else {
      setSelectedAppModal(app);
    }
  };

  return (
    <div className="text-[#F2F2F2] antialiased min-h-screen flex flex-col relative overflow-x-hidden bg-[#0E1626] selection:bg-[#4C7FFF]/30 selection:text-[#F2F2F2]">
      {/* Dynamic Background Glow Atmosphere (Matching Landing Page) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-[#191B40] via-[#191B40]/40 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute top-1/3 -left-48 w-[600px] h-[600px] bg-[#191B40]/50 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-10 -right-48 w-[700px] h-[600px] bg-[#191B40]/60 rounded-full blur-[130px] opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-radial from-[#191B40]/30 to-transparent rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Top Navigation Shell */}
      <header className="bg-[#191B40]/80 backdrop-blur-2xl border-b border-[#F2F2F2]/10 shadow-[0_4px_30px_rgba(14,22,38,0.7)] flex justify-between items-center w-full px-6 md:px-12 h-16 z-40 sticky top-0">
        {/* Left Branding & Breadcrumb */}
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#191B40] to-emerald-500 border border-emerald-500/40 flex items-center justify-center text-[#F2F2F2] shadow-lg shadow-[#191B40]/60">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-[#F2F2F2] font-['Hanken_Grotesk']">
                DWM Cockpit
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                ONLINE
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-[#F2F2F2]/60">
              <button
                onClick={onBackToLanding}
                className="hover:text-emerald-400 hover:underline transition cursor-pointer"
              >
                KSPG Gateway
              </button>
              <span>/</span>
              <span className="text-emerald-400 font-semibold">Daily Work Management</span>
            </div>
          </div>
        </div>

        {/* Center Nav / Category Filter Buttons */}
        <nav className="hidden lg:flex items-center gap-2 font-mono text-xs font-semibold bg-[#0E1626]/70 p-1 rounded-xl border border-[#F2F2F2]/10">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeFilter === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-[#F2F2F2]/60 hover:text-[#F2F2F2]'
              }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Apps ({dwmApps.length})</span>
          </button>
          <button
            onClick={() => setActiveFilter('execution')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeFilter === 'execution'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-[#F2F2F2]/60 hover:text-[#F2F2F2]'
              }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Checklist</span>
          </button>
          <button
            onClick={() => setActiveFilter('quality')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeFilter === 'quality'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-[#F2F2F2]/60 hover:text-[#F2F2F2]'
              }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Inspections</span>
          </button>
          <button
            onClick={() => setActiveFilter('production')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeFilter === 'production'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-[#F2F2F2]/60 hover:text-[#F2F2F2]'
              }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Production</span>
          </button>
        </nav>

        {/* Right Controls & User Info */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Back to Cockpit button */}
          <button
            onClick={onBackToLanding}
            className="font-mono text-xs text-[#F2F2F2] border border-[#F2F2F2]/20 bg-[#0E1626] px-3 py-1.5 rounded-xl hover:bg-[#4C7FFF] hover:text-[#F2F2F2] hover:border-[#4C7FFF] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm font-bold"
            title="Return to Main Cockpit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">COCKPIT</span>
          </button>

          {/* User Role Badge */}
          {currentUser && (
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0E1626]/80 border border-[#F2F2F2]/10 text-xs shadow-inner">
              <div className="w-6 h-6 rounded-lg bg-emerald-500 text-[#F2F2F2] flex items-center justify-center font-bold text-[11px] shadow-sm">
                {currentUser.full_name?.[0] || currentUser.username?.[0] || 'U'}
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="font-bold text-[#F2F2F2] text-[11px] truncate max-w-[120px]">
                  {currentUser.full_name || currentUser.username}
                </span>
                <span className="text-[9px] font-mono text-[#F2F2F2]/60">
                  {roleBadge.label}
                </span>
              </div>
            </div>
          )}

          {/* SuperAdmin Portal Button (Visible only to SuperAdmins) */}
          {isSuperadmin && (
            <button
              onClick={onNavigateToSuperadmin}
              className="font-mono text-xs text-rose-300 border border-rose-500/40 bg-rose-950/40 px-3 py-1.5 rounded-xl hover:bg-rose-600 hover:text-[#F2F2F2] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm font-bold"
              title="SuperAdmin Platform Governance"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SUPERADMIN</span>
            </button>
          )}

          {/* Notifications button */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="font-mono text-xs text-[#F2F2F2] border border-[#F2F2F2]/20 bg-[#191B40] px-3 py-1.5 rounded-xl hover:bg-emerald-500 hover:text-[#F2F2F2] hover:border-emerald-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="System Notifications"
          >
            <Bell className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">ALERTS</span>
          </button>

          {/* Help button */}
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 text-[#F2F2F2]/60 hover:text-[#F2F2F2] hover:bg-[#191B40] rounded-xl transition-colors cursor-pointer border border-transparent hover:border-[#F2F2F2]/10"
            title="DWM Suite Documentation"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="font-mono text-xs text-rose-300 border border-rose-500/30 bg-rose-950/30 px-3 py-1.5 rounded-xl hover:bg-rose-600 hover:text-[#F2F2F2] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs font-semibold"
            title="End Session & Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">LOGOUT</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center justify-start relative z-10 px-6 md:px-12 py-10 md:py-14">
        {/* Hero Section */}
        <div className="w-full max-w-[1240px] mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#F2F2F2]/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                DWM ECOSYSTEM • 5 APPLICATIONS
              </span>
              <span className="text-[#F2F2F2]/40 text-xs font-mono hidden sm:inline">• Shop Floor Suite</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-[#F2F2F2] font-['Hanken_Grotesk'] tracking-tight">
              Daily Work Management (DWM)
            </h1>
            <p className="text-[#F2F2F2]/70 text-sm mt-1 max-w-2xl leading-relaxed">
              Standardized plant operations hub: operator machine checklists, initial setup &amp; teardown inspection reports, and shift-level production tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBackToLanding}
              className="font-mono text-xs font-bold px-4 py-2.5 rounded-xl bg-[#191B40] hover:bg-[#4C7FFF] text-[#F2F2F2] border border-[#F2F2F2]/15 hover:border-[#4C7FFF] transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← BACK TO COCKPIT</span>
            </button>
          </div>
        </div>

        {/* 5 Apps Grid (Matching exact style of SFC, DWM, and MPS cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1240px] w-full">
          {filteredApps.map((app) => {
            const AppIcon = app.icon;
            return (
              <div
                key={app.id}
                className={`bg-[#191B40]/90 backdrop-blur-2xl p-7 relative group flex flex-col h-full rounded-2xl border-2 ${app.theme.border} ${app.theme.shadow} ${app.theme.hoverShadow} transition-all duration-300 hover:-translate-y-1`}
              >
                {/* HUD Corner Brackets */}
                <div className={`absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 ${app.theme.hudBorder} rounded-tl`} />
                <div className={`absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 ${app.theme.hudBorder} rounded-tr`} />
                <div className={`absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 ${app.theme.hudBorder} rounded-bl`} />
                <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 ${app.theme.hudBorder} rounded-br`} />

                <div className="flex justify-between items-start mb-5 border-b border-[#F2F2F2]/10 pb-4">
                  <div>
                    <span
                      className={`font-mono text-[10px] font-bold ${app.theme.badgeText} ${app.theme.badgeBg} px-2.5 py-1 rounded-md border ${app.theme.badgeBorder} mb-2 inline-flex items-center gap-1.5`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${app.theme.pingBg} animate-ping`} />
                      {app.badge}
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-[#F2F2F2] font-['Hanken_Grotesk'] mt-1">
                      {app.name}
                    </h2>
                    <span className="text-[10px] font-mono text-[#F2F2F2]/50 tracking-wider uppercase block mt-0.5">
                      {app.categoryLabel}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-xl ${app.theme.iconBg} ${app.theme.iconText} border ${app.theme.iconBorder} ${app.theme.iconHoverBg} group-hover:text-[#F2F2F2] transition-colors duration-300 shadow-md`}
                  >
                    <AppIcon className="w-7 h-7" />
                  </div>
                </div>

                <p className="text-[#F2F2F2]/80 text-sm flex-grow mb-6 leading-relaxed">
                  {app.description}
                </p>

                {/* Feature pill row */}
                <div className="grid grid-cols-2 gap-2 mb-6 font-mono text-[10px]">
                  {app.pills.map((pill, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0E1626]/70 border border-[#F2F2F2]/10 text-[#F2F2F2]/90 flex items-center gap-1.5 truncate"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${pill.dotColor} shrink-0`} />
                      <span className="truncate">{pill.label}</span>
                    </div>
                  ))}
                </div>

                {/* Launch Button */}
                <button
                  id={`launch-${app.id}-btn`}
                  onClick={() => handleAppLaunch(app)}
                  className={`w-full py-3.5 font-mono text-xs font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r ${app.theme.gradient} ${app.theme.gradientHover} active:scale-[0.99] text-[#F2F2F2] shadow-lg ${app.theme.btnShadow} flex justify-center items-center gap-2 transition-all transform group-hover:translate-x-0.5 cursor-pointer border border-[#F2F2F2]/20`}
                >
                  <span>{app.isCurrentProject ? 'LAUNCH CHECKLIST SEQUENCE' : 'LAUNCH SEQUENCE'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating System Toast */}
      {toastMessage && (
        <div className="fixed bottom-16 right-8 z-50 bg-[#191B40] text-[#F2F2F2] px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 animate-fade-in text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-[#F2F2F2]/60 hover:text-[#F2F2F2] ml-2 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* App Details / Staging Modal for other 4 apps */}
      {selectedAppModal && (
        <div className="fixed inset-0 bg-[#0E1626]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#191B40] rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-[#F2F2F2]/15 text-[#F2F2F2] relative">
            <div className="flex justify-between items-start pb-4 border-b border-[#F2F2F2]/10">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${selectedAppModal.theme.iconBg} ${selectedAppModal.theme.iconText} border ${selectedAppModal.theme.iconBorder}`}>
                  <selectedAppModal.icon className="w-6 h-6" />
                </div>
                <div>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${selectedAppModal.theme.badgeBorder} ${selectedAppModal.theme.badgeBg} ${selectedAppModal.theme.badgeText}`}>
                    {selectedAppModal.categoryLabel}
                  </span>
                  <h3 className="font-extrabold text-xl text-[#F2F2F2] font-['Hanken_Grotesk'] mt-1">
                    {selectedAppModal.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppModal(null)}
                className="text-[#F2F2F2]/60 hover:text-[#F2F2F2] p-1 rounded-lg hover:bg-[#0E1626] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 space-y-4 font-mono text-xs">
              <div className="p-4 bg-[#0E1626]/90 border border-emerald-500/30 rounded-2xl">
                <div className="font-bold text-emerald-400 flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Module Staged for DWM Release</span>
                </div>
                <p className="text-[#F2F2F2]/70 font-sans text-xs leading-relaxed mt-1">
                  {selectedAppModal.description}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-[#F2F2F2]/60 uppercase tracking-wider block mb-2">
                  Key Capabilities in this App:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {selectedAppModal.pills.map((pill, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#0E1626] border border-[#F2F2F2]/10 flex items-center gap-2 text-[#F2F2F2]/90"
                    >
                      <span className={`w-2 h-2 rounded-full ${pill.dotColor}`} />
                      <span>{pill.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-amber-200/90 text-[11px]">
                <strong>Deployment Note:</strong> This application is linked to the plant's DWM database schema and will synchronize with the active Operator Checklist data once published.
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedAppModal(null);
                  showModuleNotice(selectedAppModal.name);
                }}
                className={`flex-1 py-3 bg-gradient-to-r ${selectedAppModal.theme.gradient} text-[#F2F2F2] rounded-xl font-bold text-xs transition cursor-pointer shadow-lg`}
              >
                Acknowledge &amp; Request Staging Access
              </button>
              <button
                onClick={() => setSelectedAppModal(null)}
                className="px-5 py-3 bg-[#0E1626] text-[#F2F2F2]/70 hover:text-[#F2F2F2] border border-[#F2F2F2]/20 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Drawer / Modal */}
      {showNotifications && (
        <div className="fixed inset-0 bg-[#0E1626]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#191B40] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#F2F2F2]/15 text-[#F2F2F2]">
            <div className="flex justify-between items-center pb-4 border-b border-[#F2F2F2]/10">
              <div className="flex items-center gap-2.5">
                <Bell className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-[#F2F2F2] text-base font-['Hanken_Grotesk']">
                  DWM Notifications
                </h3>
              </div>
              <button onClick={() => setShowNotifications(false)} className="text-[#F2F2F2]/60 hover:text-[#F2F2F2] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-3 font-mono text-xs">
              <div className="p-3.5 bg-[#0E1626]/90 border border-emerald-500/30 rounded-2xl text-emerald-300">
                <div className="font-bold mb-0.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Checklist Verification: Connected</span>
                </div>
                <div className="text-[11px] text-[#F2F2F2]/70 mt-1">
                  Operator machine &amp; pokayoke verification engine online.
                </div>
              </div>
              <div className="p-3.5 bg-[#0E1626]/90 border border-cyan-500/30 rounded-2xl text-cyan-300">
                <div className="font-bold mb-0.5 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-cyan-400" />
                  <span>Quality Inspection Reports: Staged</span>
                </div>
                <div className="text-[11px] text-[#F2F2F2]/70 mt-1">
                  First Piece and Last Piece protocols initialized.
                </div>
              </div>
              <div className="p-3.5 bg-[#0E1626]/90 border border-[#4C7FFF]/30 rounded-2xl text-[#4C7FFF]">
                <div className="font-bold mb-0.5 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-[#4C7FFF]" />
                  <span>SSO Session Valid</span>
                </div>
                <div className="text-[11px] text-[#F2F2F2]/70 mt-1">
                  Authenticated as {currentUser?.username || 'User'} ({roleBadge.label}).
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowNotifications(false)}
              className="w-full py-3 bg-[#0E1626] text-[#F2F2F2] border border-[#F2F2F2]/20 hover:bg-emerald-500 hover:border-emerald-500 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-[#0E1626]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#191B40] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#F2F2F2]/15 text-[#F2F2F2]">
            <div className="flex justify-between items-center pb-4 border-b border-[#F2F2F2]/10">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-[#F2F2F2] text-base font-['Hanken_Grotesk']">
                  DWM Architecture Overview
                </h3>
              </div>
              <button onClick={() => setShowHelp(false)} className="text-[#F2F2F2]/60 hover:text-[#F2F2F2] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-sm text-[#F2F2F2]/80 leading-relaxed font-sans">
              <p>
                The <strong className="text-[#F2F2F2]">Daily Work Management (DWM)</strong> ecosystem consolidates five key operational modules:
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs font-mono bg-[#0E1626]/80 p-3.5 rounded-2xl border border-[#F2F2F2]/10 text-[#F2F2F2]/90">
                <li>
                  <strong className="text-emerald-400">Checklist:</strong> Machine &amp; pokayoke check sheets with photo verification and GPS.
                </li>
                <li>
                  <strong className="text-cyan-400">First Piece Inspection:</strong> Setup sign-off &amp; dimensional GD&T validation at shift start.
                </li>
                <li>
                  <strong className="text-indigo-400">Last Piece Inspection:</strong> End-of-batch wear verification before tool changeover.
                </li>
                <li>
                  <strong className="text-amber-400">Daily Production Report:</strong> Consolidated shift volumes, OEE, scrap, and downtime logs.
                </li>
                <li>
                  <strong className="text-blue-400">Hourly Production:</strong> Real-time takt pacing, micro-stops, and bottleneck alerts.
                </li>
              </ul>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-[#F2F2F2] rounded-xl font-bold text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Modern High-Tech Footer */}
      <footer className="bg-[#191B40]/90 backdrop-blur-md font-mono text-[11px] border-t border-[#F2F2F2]/10 flex flex-col sm:flex-row justify-between items-center w-full px-6 md:px-12 py-4 z-40 relative gap-3 sm:gap-0">
        <div className="flex items-center gap-2 text-[#F2F2F2]/60">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
          <span>© 2026 KSPG DAILY WORK MANAGEMENT (DWM) | 5 SUITE APPS ONLINE</span>
        </div>
        <div className="flex gap-6 text-[#F2F2F2]/60 font-semibold">
          <button onClick={onBackToLanding} className="text-emerald-400 hover:underline cursor-pointer">
            ← BACK TO MAIN COCKPIT
          </button>
          <span className="hover:text-[#F2F2F2] transition-colors cursor-pointer">SECURITY PROTOCOL</span>
        </div>
      </footer>
    </div>
  );
}
