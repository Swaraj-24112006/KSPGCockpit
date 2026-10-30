import React, { useState } from 'react';
import { AuthUser, logout as authLogout } from '../shared/utils/auth';
import { getRoleBadge, RoleCategory } from '../shared/utils/rbac';
import { Kaizen, RedFlag, FiveSAudit, SafetyIncident, PpsrReport } from '../types';
import { formatIndianRupeesCompact } from '../utils';
import {
  BarChart3,
  Lightbulb,
  Compass,
  Sparkles,
  Flag,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Bell,
  HelpCircle,
  X,
  Cpu,
  Layers,
  Trophy,
  Vote,
  CheckCircle2,
  Activity,
  Building,
  ShieldCheck,
  TrendingUp,
  Award
} from 'lucide-react';

export interface SfcDashboardProps {
  currentUser?: AuthUser | null;
  kaizens: Kaizen[];
  redFlags: RedFlag[];
  fiveSAudits: FiveSAudit[];
  safetyIncidents: SafetyIncident[];
  ppsrReports: PpsrReport[];
  onNavigateToModule: (module: 'kaizen' | 'redflag' | 'fives' | 'safety' | 'ppsr' | 'cft-awards', subAction?: string) => void;
  onBackToLanding?: () => void;
  onLogout?: () => void;
  onNavigateToSuperadmin?: () => void;
}

interface SfcAppDef {
  id: 'kaizen' | 'ppsr' | 'fives' | 'redflag' | 'safety';
  name: string;
  category: 'improvement' | 'problem-solving' | 'quality' | 'safety' | 'standards';
  categoryLabel: string;
  badge: string;
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
  launchLabel: string;
}

export default function SfcDashboard({
  currentUser,
  kaizens,
  redFlags,
  fiveSAudits,
  safetyIncidents,
  ppsrReports,
  onNavigateToModule,
  onBackToLanding,
  onLogout,
  onNavigateToSuperadmin,
}: SfcDashboardProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'kaizen' | 'ppsr' | 'fives' | 'redflag' | 'safety'>('all');

  const userRole: RoleCategory = currentUser?.role_category || 'initiator';
  const roleBadge = getRoleBadge(userRole);
  const isSuperadmin = Boolean(currentUser?.is_superadmin || currentUser?.role_category === 'superadmin');

  // Calculations for live metrics
  const approvedKaizens = kaizens.filter(k => k.status === 'Approved' || k.status === 'Good Point').length;
  const pendingKaizens = kaizens.filter(k => k.status === 'Pending').length;
  const totalKaizenSavings = kaizens.reduce((sum, k) => sum + (k.costSave || 0), 0);

  const openRedFlags = redFlags.filter(r => r.status === 'Open' || r.status === 'In-Progress');
  const closedRedFlagsCount = redFlags.filter(r => r.status === 'Closed').length;

  const avgFiveSScore = fiveSAudits.length > 0
    ? Math.round(fiveSAudits.reduce((sum, a) => sum + a.totalScore, 0) / fiveSAudits.length)
    : 0;

  const openSafetyCount = safetyIncidents.filter(s => s.status === 'Open').length;
  const activePpsrCount = ppsrReports.filter(p => p.status !== 'Closed').length;

  const handleLogout = async () => {
    await authLogout();
    onLogout?.();
  };

  // The 5 SFC Applications
  const sfcApps: SfcAppDef[] = [
    {
      id: 'kaizen',
      name: 'Kaizen Continuous Improvement',
      category: 'improvement',
      categoryLabel: 'Continuous Improvement & ROI',
      badge: 'ACTIVE MODULE • READY',
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
      icon: Lightbulb,
      description:
        'Systematic employee suggestion scheme, P-Q-C-D-S-M benefit assessments, multi-tier committee review boards, verified financial ROI auditing, and A3 presentation mode.',
      pills: [
        { label: `Savings: ${formatIndianRupeesCompact(totalKaizenSavings)}`, dotColor: 'bg-emerald-400' },
        { label: `Approved: ${approvedKaizens} (${pendingKaizens} pend)`, dotColor: 'bg-sky-400' },
        { label: `Total Suggestions: ${kaizens.length}`, dotColor: 'bg-indigo-400' },
        { label: 'P-Q-C-D-S-M Matrix', dotColor: 'bg-amber-400' },
      ],
      launchLabel: 'LAUNCH KAIZEN SEQUENCE',
    },
    {
      id: 'ppsr',
      name: 'PPSR Root Cause Solver',
      category: 'problem-solving',
      categoryLabel: 'Root Cause & 8D Problem Solving',
      badge: 'ACTIVE MODULE • READY',
      theme: {
        border: 'border-violet-500',
        shadow: 'shadow-[0_16px_50px_rgba(14,22,38,0.8),0_0_35px_rgba(139,92,246,0.25)]',
        hoverShadow: 'hover:shadow-[0_20px_60px_rgba(139,92,246,0.35)]',
        hudBorder: 'border-violet-500',
        badgeBg: 'bg-violet-500/15',
        badgeText: 'text-violet-400',
        badgeBorder: 'border-violet-500/30',
        pingBg: 'bg-violet-400',
        iconBg: 'bg-violet-500/20',
        iconText: 'text-violet-400',
        iconBorder: 'border-violet-500/30',
        iconHoverBg: 'group-hover:bg-violet-500',
        gradient: 'from-violet-500 to-indigo-600',
        gradientHover: 'hover:from-violet-600 hover:to-indigo-700',
        btnShadow: 'shadow-violet-500/30',
      },
      icon: Compass,
      description:
        'Practical Problem Solving Reports utilizing 5-Whys root cause analysis, Ishikawa fishbone diagrams, containment protocols, standard worksheet updates, and 8D compliance.',
      pills: [
        { label: `Active Reports: ${activePpsrCount}`, dotColor: 'bg-violet-400' },
        { label: '8D Compliant Engine', dotColor: 'bg-emerald-400' },
        { label: '5-Whys & Fishbone', dotColor: 'bg-sky-400' },
        { label: 'Committee Review Board', dotColor: 'bg-amber-400' },
      ],
      launchLabel: 'LAUNCH PPSR SEQUENCE',
    },
    {
      id: 'fives',
      name: '5S Workplace Audit & Standards',
      category: 'standards',
      categoryLabel: 'Workplace Discipline & Standards',
      badge: 'ACTIVE MODULE • READY',
      theme: {
        border: 'border-sky-500',
        shadow: 'shadow-[0_16px_50px_rgba(14,22,38,0.8),0_0_35px_rgba(14,165,233,0.25)]',
        hoverShadow: 'hover:shadow-[0_20px_60px_rgba(14,165,233,0.35)]',
        hudBorder: 'border-sky-500',
        badgeBg: 'bg-sky-500/15',
        badgeText: 'text-sky-400',
        badgeBorder: 'border-sky-500/30',
        pingBg: 'bg-sky-400',
        iconBg: 'bg-sky-500/20',
        iconText: 'text-sky-400',
        iconBorder: 'border-sky-500/30',
        iconHoverBg: 'group-hover:bg-sky-500',
        gradient: 'from-sky-500 to-blue-600',
        gradientHover: 'hover:from-sky-600 hover:to-blue-700',
        btnShadow: 'shadow-sky-500/30',
      },
      icon: Sparkles,
      description:
        'Digital workplace audit execution across Sort, Set In Order, Shine, Standardize, and Sustain. Features automated scoring, photo evidence, radar benchmarks, and regression prevention.',
      pills: [
        { label: `Avg Score: ${avgFiveSScore}%`, dotColor: avgFiveSScore >= 80 ? 'bg-emerald-400' : 'bg-amber-400' },
        { label: `Audits: ${fiveSAudits.length}`, dotColor: 'bg-sky-400' },
        { label: '5S Radar Metrics', dotColor: 'bg-indigo-400' },
        { label: 'Zone Inspections', dotColor: 'bg-emerald-400' },
      ],
      launchLabel: 'LAUNCH 5S SEQUENCE',
    },
    {
      id: 'redflag',
      name: 'Red Flag Quality System',
      category: 'quality',
      categoryLabel: 'QA & Process Stop Alerts',
      badge: 'ACTIVE MODULE • READY',
      theme: {
        border: 'border-rose-500',
        shadow: 'shadow-[0_16px_50px_rgba(14,22,38,0.8),0_0_35px_rgba(244,63,94,0.25)]',
        hoverShadow: 'hover:shadow-[0_20px_60px_rgba(244,63,94,0.35)]',
        hudBorder: 'border-rose-500',
        badgeBg: 'bg-rose-500/15',
        badgeText: 'text-rose-400',
        badgeBorder: 'border-rose-500/30',
        pingBg: 'bg-rose-400',
        iconBg: 'bg-rose-500/20',
        iconText: 'text-rose-400',
        iconBorder: 'border-rose-500/30',
        iconHoverBg: 'group-hover:bg-rose-500',
        gradient: 'from-rose-500 to-rose-600',
        gradientHover: 'hover:from-rose-600 hover:to-rose-700',
        btnShadow: 'shadow-rose-500/30',
      },
      icon: Flag,
      description:
        'Immediate shopfloor alert escalation for line stoppages, critical quality defects, and process drifts. Includes immediate containment verification and permanent closure tracking.',
      pills: [
        { label: `Total Alerts: ${redFlags.length}`, dotColor: 'bg-sky-400' },
        { label: `Open Alerts: ${openRedFlags.length}`, dotColor: openRedFlags.length > 0 ? 'bg-rose-400' : 'bg-slate-400' },
        { label: `Resolved: ${closedRedFlagsCount}`, dotColor: 'bg-emerald-400' },
        { label: 'Emergency Containment', dotColor: 'bg-amber-400' },
      ],
      launchLabel: 'LAUNCH RED FLAG SEQUENCE',
    },
    {
      id: 'safety',
      name: 'Safety & Near-Miss Incident Tracker',
      category: 'safety',
      categoryLabel: 'EHS & Zero Harm Discipline',
      badge: 'ACTIVE MODULE • READY',
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
      icon: ShieldAlert,
      description:
        'Comprehensive EHS hazard reporting for unsafe acts and unsafe conditions. Tracks root-cause CAPA assignments, risk severity ratings, and plant-wide zero-injury streak milestones.',
      pills: [
        { label: `Open Hazards: ${openSafetyCount}`, dotColor: openSafetyCount > 0 ? 'bg-amber-400' : 'bg-emerald-400' },
        { label: 'Streak: 142 Days Safe', dotColor: 'bg-emerald-400' },
        { label: 'Near-Miss Logging', dotColor: 'bg-sky-400' },
        { label: 'CAPA Verification', dotColor: 'bg-indigo-400' },
      ],
      launchLabel: 'LAUNCH SAFETY SEQUENCE',
    },
  ];

  const filteredApps = activeFilter === 'all'
    ? sfcApps
    : sfcApps.filter((app) => app.id === activeFilter);

  return (
    <div className="text-[#F2F2F2] antialiased min-h-screen flex flex-col relative overflow-x-hidden bg-[#0E1626] selection:bg-[#4C7FFF]/30 selection:text-[#F2F2F2]">
      {/* Dynamic Background Glow Atmosphere (Matching KSPG Cockpit and DWM Dashboard) */}
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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#191B40] to-[#4C7FFF] border border-[#4C7FFF]/40 flex items-center justify-center text-[#F2F2F2] shadow-lg shadow-[#191B40]/60">
            <BarChart3 className="w-5 h-5 text-[#4C7FFF]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-[#F2F2F2] font-['Hanken_Grotesk']">
                SFC Cockpit
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                ONLINE
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-[#F2F2F2]/60">
              {onBackToLanding && (
                <>
                  <button
                    onClick={onBackToLanding}
                    className="hover:text-[#4C7FFF] hover:underline transition cursor-pointer"
                  >
                    KSPG Gateway
                  </button>
                  <span>/</span>
                </>
              )}
              <span className="text-[#4C7FFF] font-semibold">Shop Floor Control Intelligence</span>
            </div>
          </div>
        </div>

        {/* Center Nav / Category Filter Buttons */}
        <nav className="hidden lg:flex items-center gap-2 font-mono text-xs font-semibold bg-[#0E1626]/70 p-1 rounded-xl border border-[#F2F2F2]/10">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'all'
                ? 'bg-[#4C7FFF]/20 text-[#4C7FFF] border border-[#4C7FFF]/40 font-bold'
                : 'text-[#F2F2F2]/60 hover:text-[#F2F2F2]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Apps ({sfcApps.length})</span>
          </button>
          <button
            onClick={() => setActiveFilter('kaizen')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'kaizen'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-[#F2F2F2]/60 hover:text-[#F2F2F2]'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-emerald-400" />
            <span>Kaizen</span>
          </button>
          <button
            onClick={() => setActiveFilter('ppsr')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'ppsr'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 font-bold'
                : 'text-[#F2F2F2]/60 hover:text-[#F2F2F2]'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-violet-400" />
            <span>PPSR 8D</span>
          </button>
          <button
            onClick={() => setActiveFilter('fives')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'fives'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                : 'text-[#F2F2F2]/60 hover:text-[#F2F2F2]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>5S Audits</span>
          </button>
          <button
            onClick={() => setActiveFilter('redflag')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'redflag'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                : 'text-[#F2F2F2]/60 hover:text-[#F2F2F2]'
            }`}
          >
            <Flag className="w-3.5 h-3.5 text-rose-400" />
            <span>Red Flag</span>
          </button>
          <button
            onClick={() => setActiveFilter('safety')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'safety'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-[#F2F2F2]/60 hover:text-[#F2F2F2]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Safety</span>
          </button>
        </nav>

        {/* Right Controls & User Info */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Back to Cockpit button */}
          {onBackToLanding && (
            <button
              onClick={onBackToLanding}
              className="font-mono text-xs text-[#F2F2F2] border border-[#F2F2F2]/20 bg-[#0E1626] px-3 py-1.5 rounded-xl hover:bg-[#4C7FFF] hover:text-[#F2F2F2] hover:border-[#4C7FFF] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm font-bold"
              title="Return to Main Cockpit"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">COCKPIT</span>
            </button>
          )}

          {/* User Role Badge */}
          {currentUser && (
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0E1626]/80 border border-[#F2F2F2]/10 text-xs shadow-inner">
              <div className="w-6 h-6 rounded-lg bg-[#4C7FFF] text-[#F2F2F2] flex items-center justify-center font-bold text-[11px] shadow-sm">
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
          {isSuperadmin && onNavigateToSuperadmin && (
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
            className="font-mono text-xs text-[#F2F2F2] border border-[#F2F2F2]/20 bg-[#191B40] px-3 py-1.5 rounded-xl hover:bg-[#4C7FFF] hover:text-[#F2F2F2] hover:border-[#4C7FFF] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="System Notifications"
          >
            <Bell className="w-3.5 h-3.5 text-[#4C7FFF]" />
            <span className="hidden sm:inline">ALERTS</span>
          </button>

          {/* Help button */}
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 text-[#F2F2F2]/60 hover:text-[#F2F2F2] hover:bg-[#191B40] rounded-xl transition-colors cursor-pointer border border-transparent hover:border-[#F2F2F2]/10"
            title="SFC Architecture Documentation"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Logout button */}
          {onLogout && (
            <button
              onClick={handleLogout}
              className="font-mono text-xs text-rose-300 border border-rose-500/30 bg-rose-950/30 px-3 py-1.5 rounded-xl hover:bg-rose-600 hover:text-[#F2F2F2] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs font-semibold"
              title="End Session & Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">LOGOUT</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center justify-start relative z-10 px-6 md:px-12 py-10 md:py-14">
        {/* Hero Section */}
        <div className="w-full max-w-[1240px] mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#F2F2F2]/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] font-bold text-[#4C7FFF] uppercase tracking-widest bg-[#4C7FFF]/10 border border-[#4C7FFF]/30 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                SFC ECOSYSTEM • 5 APPLICATIONS
              </span>
              <span className="text-[#F2F2F2]/40 text-xs font-mono hidden sm:inline">• Shop Floor Control Suite</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-[#F2F2F2] font-['Hanken_Grotesk'] tracking-tight">
              Shop Floor Control (SFC) Intelligence
            </h1>
            <p className="text-[#F2F2F2]/70 text-sm mt-1 max-w-2xl leading-relaxed">
              Real-time operational workspace for continuous kaizen improvements, root-cause 8D problem solving, 5S workplace audits, immediate quality red flags, and zero-harm safety tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onBackToLanding && (
              <button
                onClick={onBackToLanding}
                className="font-mono text-xs font-bold px-4 py-2.5 rounded-xl bg-[#191B40] hover:bg-[#4C7FFF] text-[#F2F2F2] border border-[#F2F2F2]/15 hover:border-[#4C7FFF] transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← BACK TO COCKPIT</span>
              </button>
            )}
          </div>
        </div>

        {/* 5 Apps Grid (Matching exact style of SFC, DWM, and MPS cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1240px] w-full mb-8">
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

                {/* Feature / Stat pill row */}
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
                  onClick={() => onNavigateToModule(app.id)}
                  className={`w-full py-3.5 font-mono text-xs font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r ${app.theme.gradient} ${app.theme.gradientHover} active:scale-[0.99] text-[#F2F2F2] shadow-lg ${app.theme.btnShadow} flex justify-center items-center gap-2 transition-all transform group-hover:translate-x-0.5 cursor-pointer border border-[#F2F2F2]/20`}
                >
                  <span>{app.launchLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Featured Monthly CFT Awards Banner Card */}
        <div className="w-full max-w-[1240px] bg-[#191B40]/90 backdrop-blur-2xl p-6 md:p-8 relative group rounded-2xl border-2 border-amber-500/60 shadow-[0_16px_50px_rgba(14,22,38,0.8),0_0_35px_rgba(245,158,11,0.2)] hover:shadow-[0_20px_60px_rgba(245,158,11,0.3)] transition-all duration-300">
          {/* HUD Corner Brackets */}
          <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-500 rounded-tl" />
          <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-500 rounded-tr" />
          <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-500 rounded-bl" />
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-500 rounded-br" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center space-x-2 bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider font-mono">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Monthly CFT Excellence Awards</span>
              </div>
              <h3 className="text-xl md:text-2xl font-black font-['Hanken_Grotesk'] tracking-tight text-[#F2F2F2]">
                🏆 Monthly Evaluation &amp; Committee Voting Terminal
              </h3>
              <p className="text-xs md:text-sm text-[#F2F2F2]/80 leading-relaxed font-sans">
                Cross-Functional Team (CFT) monthly meeting where all approved Kaizens and closed PPSR problem-solving reports are evaluated. Committee members cast votes to decide the <strong>Top 3 Best Kaizens</strong> and <strong>Top 3 Best PPSRs</strong> for monthly trophies and recognition.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToModule('cft-awards')}
              className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.99] text-[#F2F2F2] font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2 border border-[#F2F2F2]/20 shrink-0 cursor-pointer"
            >
              <Vote className="w-4 h-4" />
              <span>OPEN CFT VOTING TERMINAL</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* Floating System Toast */}
      {toastMessage && (
        <div className="fixed bottom-16 right-8 z-50 bg-[#191B40] text-[#F2F2F2] px-5 py-3.5 rounded-2xl shadow-2xl border border-[#4C7FFF]/40 flex items-center gap-3 animate-fade-in text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-[#4C7FFF] animate-ping" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-[#F2F2F2]/60 hover:text-[#F2F2F2] ml-2 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Notifications Drawer / Modal */}
      {showNotifications && (
        <div className="fixed inset-0 bg-[#0E1626]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#191B40] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#F2F2F2]/15 text-[#F2F2F2]">
            <div className="flex justify-between items-center pb-4 border-b border-[#F2F2F2]/10">
              <div className="flex items-center gap-2.5">
                <Bell className="w-5 h-5 text-[#4C7FFF]" />
                <h3 className="font-bold text-[#F2F2F2] text-base font-['Hanken_Grotesk']">
                  SFC System Status
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
                  <span>Kaizen &amp; PPSR Engines: Operational</span>
                </div>
                <div className="text-[11px] text-[#F2F2F2]/70 mt-1">
                  {approvedKaizens} Kaizens approved • {activePpsrCount} active PPSR problem solvers.
                </div>
              </div>
              <div className="p-3.5 bg-[#0E1626]/90 border border-rose-500/30 rounded-2xl text-rose-300">
                <div className="font-bold mb-0.5 flex items-center gap-1.5">
                  <Flag className="w-4 h-4 text-rose-400" />
                  <span>Quality Red Flags &amp; Safety</span>
                </div>
                <div className="text-[11px] text-[#F2F2F2]/70 mt-1">
                  {openRedFlags.length} open quality alerts • {openSafetyCount} active safety hazards.
                </div>
              </div>
              <div className="p-3.5 bg-[#0E1626]/90 border border-[#4C7FFF]/30 rounded-2xl text-[#4C7FFF]">
                <div className="font-bold mb-0.5 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-[#4C7FFF]" />
                  <span>Single Sign-On Valid</span>
                </div>
                <div className="text-[11px] text-[#F2F2F2]/70 mt-1">
                  Authenticated as {currentUser?.username || 'User'} ({roleBadge.label}).
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowNotifications(false)}
              className="w-full py-3 bg-[#0E1626] text-[#F2F2F2] border border-[#F2F2F2]/20 hover:bg-[#4C7FFF] hover:border-[#4C7FFF] rounded-xl font-bold text-xs transition cursor-pointer"
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
                <HelpCircle className="w-5 h-5 text-[#4C7FFF]" />
                <h3 className="font-bold text-[#F2F2F2] text-base font-['Hanken_Grotesk']">
                  SFC Intelligence Architecture
                </h3>
              </div>
              <button onClick={() => setShowHelp(false)} className="text-[#F2F2F2]/60 hover:text-[#F2F2F2] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-sm text-[#F2F2F2]/80 leading-relaxed font-sans">
              <p>
                The <strong className="text-[#F2F2F2]">Shop Floor Control (SFC)</strong> ecosystem provides 5 interconnected manufacturing execution apps:
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs font-mono bg-[#0E1626]/80 p-3.5 rounded-2xl border border-[#F2F2F2]/10 text-[#F2F2F2]/90">
                <li>
                  <strong className="text-emerald-400">Kaizen:</strong> Continuous improvement suggestions, financial savings tracking, and committee audits.
                </li>
                <li>
                  <strong className="text-violet-400">PPSR:</strong> Practical Problem Solving Reports with 5-Whys root-cause and 8D containment.
                </li>
                <li>
                  <strong className="text-sky-400">5S Audits:</strong> Digital workplace organization across Sort, Set in Order, Shine, Standardize, Sustain.
                </li>
                <li>
                  <strong className="text-rose-400">Red Flag:</strong> Rapid line-stop alert escalation and defect containment resolution.
                </li>
                <li>
                  <strong className="text-amber-400">Safety:</strong> Unsafe acts &amp; conditions logging, near-misses, and zero-injury streak tracking.
                </li>
              </ul>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-3 bg-[#4C7FFF] hover:bg-[#366CEC] text-[#F2F2F2] rounded-xl font-bold text-xs transition cursor-pointer shadow-lg shadow-[#4C7FFF]/20"
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
          <span>© 2026 KSPG SHOP FLOOR CONTROL (SFC) | 5 SUITE APPS ONLINE</span>
        </div>
        <div className="flex gap-6 text-[#F2F2F2]/60 font-semibold">
          {onBackToLanding && (
            <button onClick={onBackToLanding} className="text-[#4C7FFF] hover:underline cursor-pointer">
              ← BACK TO MAIN COCKPIT
            </button>
          )}
          <span className="hover:text-[#F2F2F2] transition-colors cursor-pointer">SECURITY PROTOCOL</span>
        </div>
      </footer>
    </div>
  );
}

