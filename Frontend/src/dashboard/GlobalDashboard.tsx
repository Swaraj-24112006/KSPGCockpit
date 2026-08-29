import React from 'react';
import { Kaizen, RedFlag, FiveSAudit, SafetyIncident, PpsrReport } from '../types';
import { 
  Lightbulb, 
  Flag, 
  Sparkles, 
  ShieldAlert, 
  Compass, 
  Building,
  ArrowRight,
  Trophy,
  Award,
  Vote
} from 'lucide-react';
import { formatIndianRupeesCompact } from '../utils';

interface GlobalDashboardProps {
  kaizens: Kaizen[];
  redFlags: RedFlag[];
  fiveSAudits: FiveSAudit[];
  safetyIncidents: SafetyIncident[];
  ppsrReports: PpsrReport[];
  onNavigateToModule: (module: 'kaizen' | 'redflag' | 'fives' | 'safety' | 'ppsr' | 'cft-awards', subAction?: string) => void;
}

export default function GlobalDashboard({
  kaizens,
  redFlags,
  fiveSAudits,
  safetyIncidents,
  ppsrReports,
  onNavigateToModule
}: GlobalDashboardProps) {
  
  // Calculations
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8" id="global-dashboard">
      
      {/* Top Welcome Panel with quick stats */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider font-mono">
              <Building className="w-3.5 h-3.5" />
              <span>Multi-Plant Integrated Hub</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase">
              Shopfloor Management System
            </h2>
            <p className="text-slate-300 text-xs md:text-sm font-medium max-w-2xl">
              Real-time workspace for monitoring safety, quality, 5S standards, and continuous kaizen improvements across manufacturing zones.
            </p>
          </div>
          <div className="flex items-center space-x-6 border-l border-slate-700/50 pl-6 shrink-0 font-mono">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Status</span>
              <span className="text-2xl font-black text-emerald-400">NORMAL</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Alerts</span>
              <span className={`text-2xl font-black ${openRedFlags.length > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
                {openRedFlags.length} RED
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of the exactly 5 clean, clickable main buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Module Button 1: RED FLAG SYSTEM */}
        <button 
          onClick={() => onNavigateToModule('redflag')}
          id="btn-redflag-system"
          className="text-left bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between hover:border-rose-400 hover:shadow-lg hover:shadow-rose-100/50 transition-all group duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-rose-500 w-full"
        >
          <div className="space-y-5 w-full">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-rose-50 rounded-2xl group-hover:bg-rose-100 transition">
                <Flag className="w-6 h-6 text-rose-500" />
              </div>
              <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full uppercase font-mono tracking-wider">
                QA & Safety Alerts
              </span>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight group-hover:text-rose-600 transition">🚩 Red Flag System</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                Empower anyone to raise immediate quality or process stop alerts. Assigned owners resolve and record systematic permanent closures.
              </p>
            </div>
            
            {/* Stats display */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 w-full">
              <div className="text-center border-r border-slate-200">
                <span className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Total</span>
                <span className="text-lg font-black text-slate-700 font-mono">{redFlags.length}</span>
              </div>
              <div className="text-center border-r border-slate-200">
                <span className="block text-[9px] font-bold text-rose-500 uppercase font-mono">Open</span>
                <span className={`text-lg font-black font-mono ${openRedFlags.length > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>
                  {openRedFlags.length}
                </span>
              </div>
              <div className="text-center">
                <span className="block text-[9px] font-bold text-emerald-600 uppercase font-mono">Closed</span>
                <span className="text-lg font-black text-slate-700 font-mono">{closedRedFlagsCount}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between w-full text-xs font-black uppercase text-rose-600 tracking-wider pt-4 border-t border-slate-100">
            <span>Launch Redflag subapp</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition duration-300" />
          </div>
        </button>

        {/* Module Button 2: KAIZEN TRACKER */}
        <button 
          onClick={() => onNavigateToModule('kaizen')}
          id="btn-kaizen-system"
          className="text-left bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100/50 transition-all group duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
        >
          <div className="space-y-5 w-full">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-emerald-50 rounded-2xl group-hover:bg-emerald-100 transition">
                <Lightbulb className="w-6 h-6 text-emerald-500" />
              </div>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full uppercase font-mono tracking-wider">
                Continuous Improvement
              </span>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight group-hover:text-emerald-600 transition">💡 Kaizen Improvement</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                Systematic incremental improvements suggested by operators, reviewed by committees, and audited for financial ROI.
              </p>
            </div>
            
            {/* Stats display */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 w-full">
              <div className="text-center border-r border-slate-200">
                <span className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Cost Savings</span>
                <span className="text-xs font-black text-emerald-600 font-mono">{formatIndianRupeesCompact(totalKaizenSavings)}</span>
              </div>
              <div className="text-center">
                <span className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Approved</span>
                <span className="text-lg font-black text-slate-700 font-mono">{approvedKaizens} <span className="text-[10px] text-amber-500 font-normal font-mono">({pendingKaizens} pnd)</span></span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between w-full text-xs font-black uppercase text-emerald-600 tracking-wider pt-4 border-t border-slate-100">
            <span>Launch Kaizen subapp</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition duration-300" />
          </div>
        </button>

        {/* Module Button 3: 5S AUDIT PANEL */}
        <button 
          onClick={() => onNavigateToModule('fives')}
          id="btn-fives-system"
          className="text-left bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100/50 transition-all group duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
        >
          <div className="space-y-5 w-full">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-100 transition">
                <Sparkles className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full uppercase font-mono tracking-wider">
                Workplace Discipline
              </span>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition">🧼 5S Audit & Standards</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                Evaluate workspaces across Sort, Set in Order, Shine, Standardize, and Sustain. Track trend charts to prevent regression.
              </p>
            </div>
            
            {/* Stats display */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 w-full">
              <div className="text-center border-r border-slate-200">
                <span className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Avg Score</span>
                <span className={`text-lg font-black font-mono ${avgFiveSScore >= 80 ? 'text-emerald-600' : 'text-amber-500'}`}>
                  {avgFiveSScore}%
                </span>
              </div>
              <div className="text-center">
                <span className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Audits Conducted</span>
                <span className="text-lg font-black text-slate-700 font-mono">{fiveSAudits.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between w-full text-xs font-black uppercase text-blue-600 tracking-wider pt-4 border-t border-slate-100">
            <span>Launch 5S subapp</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition duration-300" />
          </div>
        </button>

        {/* Module Button 4: SAFETY INCIDENT TRACKER */}
        <button 
          onClick={() => onNavigateToModule('safety')}
          id="btn-safety-system"
          className="text-left bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between hover:border-amber-400 hover:shadow-lg hover:shadow-amber-100/50 transition-all group duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-amber-500 w-full"
        >
          <div className="space-y-5 w-full">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-amber-50 rounded-2xl group-hover:bg-amber-100 transition">
                <ShieldAlert className="w-6 h-6 text-amber-500" />
              </div>
              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full uppercase font-mono tracking-wider">
                EHS Zero Incident
              </span>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight group-hover:text-amber-600 transition">🛡️ Safety & Near-Misses</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                Log and monitor unsafe conditions and unsafe acts before they lead to shopfloor hazards. Maintain zero harm discipline.
              </p>
            </div>
            
            {/* Stats display */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 w-full">
              <div className="text-center border-r border-slate-200">
                <span className="block text-[9px] font-bold text-amber-500 uppercase font-mono">Open Hazards</span>
                <span className={`text-lg font-black font-mono ${openSafetyCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                  {openSafetyCount}
                </span>
              </div>
              <div className="text-center">
                <span className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Streak (Days)</span>
                <span className="text-lg font-black text-emerald-600 font-mono">142 Days</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between w-full text-xs font-black uppercase text-amber-600 tracking-wider pt-4 border-t border-slate-100">
            <span>Launch Safety subapp</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition duration-300" />
          </div>
        </button>

        {/* Module Button 5: PPSR */}
        <button 
          onClick={() => onNavigateToModule('ppsr')}
          id="btn-ppsr-system"
          className="text-left bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between hover:border-violet-400 hover:shadow-lg hover:shadow-violet-100/50 transition-all group duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-violet-500 col-span-1 md:col-span-2 lg:col-span-1 w-full"
        >
          <div className="space-y-5 w-full">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-violet-50 rounded-2xl group-hover:bg-violet-100 transition">
                <Compass className="w-6 h-6 text-violet-500" />
              </div>
              <span className="text-[10px] font-bold bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full uppercase font-mono tracking-wider">
                Root Cause Solver
              </span>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight group-hover:text-violet-600 transition">🧠 PPSR Problem Solving</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                Practical Problem Solving Reports. Uses the 5-Whys methodology to structurally eliminate recurring or complex issues.
              </p>
            </div>
            
            {/* Stats display */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 w-full">
              <div className="text-center border-r border-slate-200">
                <span className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Active Reports</span>
                <span className="text-lg font-black text-violet-700 font-mono">{activePpsrCount}</span>
              </div>
              <div className="text-center">
                <span className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Status</span>
                <span className="text-xs font-black text-indigo-600 font-mono mt-1 block">8D Compliant</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between w-full text-xs font-black uppercase text-violet-600 tracking-wider pt-4 border-t border-slate-100">
            <span>Launch PPSR subapp</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition duration-300" />
          </div>
        </button>

      </div>

      {/* CFT Monthly Best Awards Banner Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider font-mono">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Monthly CFT Excellence Awards</span>
          </div>
          <h3 className="text-xl md:text-2xl font-black font-display tracking-tight text-white uppercase">
            🏆 Monthly Meeting & Voting Terminal
          </h3>
          <p className="text-xs md:text-sm text-slate-300 font-sans">
            Cross-Functional Team (CFT) monthly meeting where all approved Kaizens and closed PPSR problem-solving reports are evaluated. CFT committee members cast votes to decide the <strong>Top 3 Best Kaizens</strong> and <strong>Top 3 Best PPSRs</strong> for monthly trophies and cash prizes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateToModule('cft-awards')}
          className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black font-mono text-xs rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center space-x-2 border border-amber-300 shrink-0 cursor-pointer"
        >
          <Vote className="w-4 h-4" />
          <span>OPEN CFT VOTING TERMINAL</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
