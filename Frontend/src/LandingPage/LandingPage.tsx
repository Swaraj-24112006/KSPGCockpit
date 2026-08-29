import React, { useState } from 'react';
import { AuthUser, logout as authLogout } from '../shared/utils/auth';
import { getRoleBadge, RoleCategory } from '../shared/utils/rbac';
import {
  BarChart3,
  Boxes,
  ShieldCheck,
  Wrench,
  Layers,
  Lock,
  ArrowRight,
  LogOut,
  Bell,
  Settings,
  HelpCircle,
  CheckCircle2,
  X,
  ExternalLink,
  Cpu,
  Activity,
  Sparkles,
  Gauge,
  Database,
  Radio
} from 'lucide-react';

interface LandingPageProps {
  currentUser?: AuthUser | null;
  onLaunchSFC: () => void;
  onLogout?: () => void;
  onNavigateToSuperadmin?: () => void;
}

export default function LandingPage({
  currentUser,
  onLaunchSFC,
  onLogout,
  onNavigateToSuperadmin
}: LandingPageProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const userRole: RoleCategory = currentUser?.role_category || 'initiator';
  const roleBadge = getRoleBadge(userRole);
  const isSuperadmin = Boolean(currentUser?.is_superadmin || currentUser?.role_category === 'superadmin');

  const handleLogout = async () => {
    await authLogout();
    onLogout?.();
  };

  const showModuleNotice = (modName: string) => {
    setToastMessage(`Module "${modName}" is currently staged for deployment in the next release cycle.`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  return (
    <div className="text-[#F2F2F2] antialiased min-h-screen flex flex-col relative overflow-x-hidden bg-[#0E1626] selection:bg-[#4C7FFF]/30 selection:text-[#F2F2F2]">
      {/* Dynamic Background Glow Atmosphere (No Grid Lines) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-[#191B40] via-[#191B40]/40 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute top-1/3 -left-48 w-[600px] h-[600px] bg-[#191B40]/50 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-10 -right-48 w-[700px] h-[600px] bg-[#191B40]/60 rounded-full blur-[130px] opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-radial from-[#191B40]/30 to-transparent rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Top Navigation Shell */}
      <header className="bg-[#191B40]/80 backdrop-blur-2xl border-b border-[#F2F2F2]/10 shadow-[0_4px_30px_rgba(14,22,38,0.7)] flex justify-between items-center w-full px-6 md:px-12 h-16 z-40 sticky top-0">
        {/* Left Branding */}
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#191B40] to-[#4C7FFF] border border-[#4C7FFF]/40 flex items-center justify-center text-[#F2F2F2] shadow-lg shadow-[#191B40]/60">
            <Cpu className="w-5 h-5 text-[#F2F2F2]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-[#F2F2F2] font-['Hanken_Grotesk']">
                KSPG Cockpit
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                ONLINE
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#F2F2F2]/60 tracking-wider uppercase">
              Enterprise Module Gateway
            </span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 font-mono text-xs font-semibold">
          <button
            onClick={onLaunchSFC}
            className="text-[#F2F2F2] font-bold border-b-2 border-[#4C7FFF] pb-1 hover:text-[#4C7FFF] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#4C7FFF]" />
            <span>SFC Intelligence</span>
          </button>
          <button
            onClick={() => showModuleNotice('Inventory Mgt.')}
            className="text-[#F2F2F2]/60 hover:text-[#F2F2F2] transition-colors cursor-pointer"
          >
            Inventory
          </button>
          <button
            onClick={() => showModuleNotice('Quality & Metrology')}
            className="text-[#F2F2F2]/60 hover:text-[#F2F2F2] transition-colors cursor-pointer"
          >
            Quality
          </button>
          <button
            onClick={() => showModuleNotice('TPM Maintenance')}
            className="text-[#F2F2F2]/60 hover:text-[#F2F2F2] transition-colors cursor-pointer"
          >
            Maintenance
          </button>
        </nav>

        {/* Right Controls & User Info */}
        <div className="flex items-center gap-3 md:gap-4">
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
          {isSuperadmin && (
            <button
              onClick={onNavigateToSuperadmin}
              className="font-mono text-xs text-rose-300 border border-rose-500/40 bg-rose-950/40 px-3 py-1.5 rounded-xl hover:bg-rose-600 hover:text-[#F2F2F2] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm font-bold"
              title="SuperAdmin Platform Governance"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SUPERADMIN</span>
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
            title="Help & Architecture Documentation"
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
      <main className="flex-grow flex flex-col items-center justify-center relative z-10 px-6 md:px-12 py-10 md:py-14">



        {/* Module Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1240px] w-full">

          {/* Module Card 1: SFC Intelligence (ACTIVE) */}
          <div className="bg-[#191B40]/90 backdrop-blur-2xl p-7 relative group flex flex-col h-full rounded-2xl border-2 border-[#4C7FFF] shadow-[0_16px_50px_rgba(14,22,38,0.8),0_0_35px_rgba(76,127,255,0.25)] hover:shadow-[0_20px_60px_rgba(76,127,255,0.35)] transition-all duration-300 hover:-translate-y-1">
            {/* HUD Corner Brackets */}
            <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-[#4C7FFF] rounded-tl" />
            <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-[#4C7FFF] rounded-tr" />
            <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-[#4C7FFF] rounded-bl" />
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-[#4C7FFF] rounded-br" />

            <div className="flex justify-between items-start mb-5 border-b border-[#F2F2F2]/10 pb-4">
              <div>
                <span className="font-mono text-[10px] font-bold text-[#4C7FFF] bg-[#4C7FFF]/15 px-2.5 py-1 rounded-md border border-[#4C7FFF]/30 mb-2 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4C7FFF] animate-ping" />
                  ACTIVE MODULE • READY
                </span>
                <h2 className="text-xl md:text-2xl font-black text-[#F2F2F2] font-['Hanken_Grotesk'] mt-1">
                  SFC Intelligence
                </h2>
              </div>
              <div className="p-3 rounded-xl bg-[#4C7FFF]/20 text-[#4C7FFF] border border-[#4C7FFF]/30 group-hover:bg-[#4C7FFF] group-hover:text-[#F2F2F2] transition-colors duration-300 shadow-md shadow-[#4C7FFF]/10">
                <BarChart3 className="w-7 h-7" />
              </div>
            </div>

            <p className="text-[#F2F2F2]/80 text-sm flex-grow mb-6 leading-relaxed">
              Integrated Kaizen suggestion cycle, PPSR 8D problem solving sprints, 5S workplace audits, Safety incident tracking, and Shop Floor Control real-time intelligence.
            </p>

            {/* Feature pill row */}
            <div className="grid grid-cols-2 gap-2 mb-6 font-mono text-[10px]">
              <div className="px-2.5 py-1.5 rounded-lg bg-[#0E1626]/70 border border-[#F2F2F2]/10 text-[#F2F2F2]/90 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Kaizen Cycle</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-[#0E1626]/70 border border-[#F2F2F2]/10 text-[#F2F2F2]/90 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>PPSR 8D System</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-[#0E1626]/70 border border-[#F2F2F2]/10 text-[#F2F2F2]/90 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>5S Audits</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-[#0E1626]/70 border border-[#F2F2F2]/10 text-[#F2F2F2]/90 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>Safety &amp; Awards</span>
              </div>
            </div>

            <button
              id="launch-sfc-btn"
              onClick={onLaunchSFC}
              className="w-full py-3.5 font-mono text-xs font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-[#4C7FFF] to-[#366CEC] hover:from-[#366CEC] hover:to-[#0652d2] active:scale-[0.99] text-[#F2F2F2] shadow-lg shadow-[#4C7FFF]/30 flex justify-center items-center gap-2 transition-all transform group-hover:translate-x-0.5 cursor-pointer border border-[#F2F2F2]/20"
            >
              <span>LAUNCH SEQUENCE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Module Card 2: Inventory Management */}


          {/* Module Card 3: Quality & Metrology */}


          {/* Module Card 4: TPM Maintenance */}


          {/* Module Card 5: ERP & MES Connector */}


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
                <h3 className="font-bold text-[#F2F2F2] text-base font-['Hanken_Grotesk']">System Notifications</h3>
              </div>
              <button onClick={() => setShowNotifications(false)} className="text-[#F2F2F2]/60 hover:text-[#F2F2F2] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-3 font-mono text-xs">
              <div className="p-3.5 bg-[#0E1626]/90 border border-emerald-500/30 rounded-2xl text-emerald-300">
                <div className="font-bold mb-0.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>SFC Intelligence Engine: Active</span>
                </div>
                <div className="text-[11px] text-[#F2F2F2]/70 mt-1">Kaizen, PPSR, 5S, and Safety pipelines operational.</div>
              </div>
              <div className="p-3.5 bg-[#0E1626]/90 border border-[#4C7FFF]/30 rounded-2xl text-[#4C7FFF]">
                <div className="font-bold mb-0.5 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-[#4C7FFF]" />
                  <span>Single Sign-On Authenticated</span>
                </div>
                <div className="text-[11px] text-[#F2F2F2]/70 mt-1">Logged in as {currentUser?.username || 'User'} ({roleBadge.label}).</div>
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
                <h3 className="font-bold text-[#F2F2F2] text-base font-['Hanken_Grotesk']">KSPG Cockpit Guidance</h3>
              </div>
              <button onClick={() => setShowHelp(false)} className="text-[#F2F2F2]/60 hover:text-[#F2F2F2] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-sm text-[#F2F2F2]/80 leading-relaxed font-sans">
              <p>
                Welcome to the <strong className="text-[#F2F2F2]">KSPG Cockpit Enterprise Portal</strong>. This hub allows you to access industrial modules:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs font-mono bg-[#0E1626]/80 p-3.5 rounded-2xl border border-[#F2F2F2]/10 text-[#F2F2F2]/90">
                <li><strong className="text-[#4C7FFF]">SFC Intelligence:</strong> Kaizen improvement cycle, PPSR problem solving, 5S audits, Safety incidents.</li>
                <li><strong className="text-emerald-400">Navigation:</strong> When inside SFC, click <em className="text-[#F2F2F2]">"← Back to Cockpit"</em> to return here anytime.</li>
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
          <span>© 2026 KSPG INTERNAL OPERATIONS | SYSTEM NOMINAL</span>
        </div>
        <div className="flex gap-6 text-[#F2F2F2]/60 font-semibold">
          <span className="text-[#4C7FFF]">REV-01.44</span>
          <span className="hover:text-[#F2F2F2] transition-colors cursor-pointer">LEGAL</span>
          <span className="hover:text-[#F2F2F2] transition-colors cursor-pointer">SECURITY PROTOCOL</span>
        </div>
      </footer>
    </div>
  );
}
