import React, { useMemo, useState } from 'react';
import Dashboard from '../components/Dashboard';
import KaizenSheetForm from '../components/KaizenSheetForm';
import KaizenReviewBoard from '../components/KaizenReviewBoard';
import KaizenSpreadsheet from '../components/KaizenSpreadsheet';
import CftMonthlyAwards from '../components/CftMonthlyAwards';
import OpenImpactTracker from '../components/OpenImpactTracker';
import KaizenProcessFlowchart from '../components/KaizenProcessFlowchart';
import KaizenGamificationAnalytics from '../components/KaizenGamificationAnalytics';
import PresentationModeView, { SlideItem } from '../components/common/PresentationModeView';
import { Kaizen, PpsrReport, OpenImpactAction, UserPersona } from '../types';
import { 
  Lightbulb, 
  BarChart3, 
  PlusCircle, 
  ClipboardList, 
  Tv, 
  Layers, 
  TrendingUp, 
  Trophy, 
  Workflow, 
  Flame, 
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface KaizenModuleProps {
  activeTab: 'dashboard' | 'form' | 'committee' | 'list' | 'cft-awards' | 'impact-tracker' | 'process-flowchart' | 'gamification' | 'presentation' | 'other';
  setActiveTab: (tab: any) => void;
  kaizens: Kaizen[];
  ppsrReports: PpsrReport[];
  impactActions: OpenImpactAction[];
  onAddKaizen: (kaizen: Partial<Kaizen>) => void;
  onUpdateKaizen: (id: string, updatedFields: Partial<Kaizen>) => void;
  onAddImpactAction: (action: Partial<OpenImpactAction>) => void;
  onUpdateImpactAction: (id: string, updates: Partial<OpenImpactAction>) => void;
  onDeleteImpactAction: (id: string) => void;
  onUpdatePpsrReport: (id: string, updatedFields: Partial<PpsrReport>) => void;
  onSelectKaizen: (kaizen: Kaizen) => void;
  handleSetPersona: (persona: UserPersona) => void;
  isSidebarHidden?: boolean;
  onToggleSidebar?: () => void;
}

export default function KaizenModule({
  activeTab,
  setActiveTab,
  kaizens,
  ppsrReports,
  impactActions,
  onAddKaizen,
  onUpdateKaizen,
  onAddImpactAction,
  onUpdateImpactAction,
  onDeleteImpactAction,
  onUpdatePpsrReport,
  onSelectKaizen,
  handleSetPersona,
  isSidebarHidden,
  onToggleSidebar
}: KaizenModuleProps) {
  // Other sub-item selector when activeTab === 'other'
  const [otherSubmenu, setOtherSubmenu] = useState<'committee' | 'impact-tracker' | 'cft-awards' | 'process-flowchart' | 'gamification'>('committee');

  // Presentation slides for Kaizen
  const totalSavings = kaizens.reduce((sum, k) => sum + (k.costSave || 0), 0);
  const implementedCount = kaizens.filter(k => k.status === 'Approved').length;
  const underReviewCount = kaizens.filter(k => k.status === 'Pending').length;

  const presentationSlides: SlideItem[] = useMemo(() => [
    {
      id: 'kaizen-slide-executive',
      title: 'Continuous Improvement (Kaizen) Executive Board',
      subtitle: 'Shop Floor Suggestions & Hard-Dollar Bottom Line Savings',
      badge: 'Executive Briefing',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest block">Total Suggestions</span>
              <span className="text-4xl md:text-5xl font-black font-mono text-white mt-2 block">{kaizens.length}</span>
              <span className="text-xs text-slate-500 mt-2 block">100% Shopfloor Originated</span>
            </div>
            <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl p-6 text-center">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block">Validated Savings</span>
              <span className="text-3xl md:text-4xl font-black font-mono text-emerald-400 mt-2 block">
                ₹{totalSavings.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-emerald-400/80 mt-2 block">Annual Recurring Benefit</span>
            </div>
            <div className="bg-slate-900 border border-blue-900/50 rounded-2xl p-6 text-center">
              <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-widest block">Implemented & Sustained</span>
              <span className="text-4xl md:text-5xl font-black font-mono text-blue-400 mt-2 block">{implementedCount}</span>
              <span className="text-xs text-blue-400/80 mt-2 block">Standardized into SOP</span>
            </div>
            <div className="bg-slate-900 border border-amber-900/50 rounded-2xl p-6 text-center">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest block">Under Evaluation</span>
              <span className="text-4xl md:text-5xl font-black font-mono text-amber-400 mt-2 block">{underReviewCount}</span>
              <span className="text-xs text-amber-400/80 mt-2 block">CFT Committee Review</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <Lightbulb className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Employee Idea Velocity
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Empowering every operator with simple 1-sheet visual suggestions with photographic before & after verification.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 font-mono">
              <span className="text-xs text-slate-400 uppercase block">Implementation Ratio</span>
              <span className="text-2xl font-black text-emerald-400">
                {kaizens.length > 0 ? Math.round((implementedCount / kaizens.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'kaizen-slide-spotlight',
      title: 'Top High-Impact Kaizens of the Month',
      subtitle: 'Visual Before & After Evidence from the Shopfloor',
      badge: 'Hall of Fame',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {kaizens.slice(0, 4).map(k => (
            <div key={k.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black font-mono text-emerald-400">{k.srNo || k.id}</span>
                  <span className="text-xs font-bold text-slate-200 truncate max-w-[200px]">{k.title}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ₹{(k.costSave || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block uppercase text-[9px]">Originator</span>
                  <span className="text-slate-200 font-bold">{k.ideaBy || 'Shop Operator'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[9px]">Department / Line</span>
                  <span className="text-emerald-400 font-bold">{k.area || k.minifactory || 'Assembly Line'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[9px]">Classification</span>
                  <span className="text-amber-400 font-bold">{k.classification || 'Kaizen'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[9px]">Status</span>
                  <span className="text-emerald-400 font-bold">{k.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold text-rose-400 block mb-1">Before:</span>
                  <p className="text-slate-400 text-[11px] line-clamp-3">{k.problemBefore || 'Manual repositioning causing operator fatigue.'}</p>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold text-emerald-400 block mb-1">After:</span>
                  <p className="text-slate-300 text-[11px] line-clamp-3">{k.counterMeasureAfter || 'Pneumatic clamp fixture installed. Zero fatigue and 12s cycle time saved.'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }
  ], [kaizens, totalSavings, implementedCount, underReviewCount]);

  return (
    <div className="space-y-4">
      {/* Standardized Sub-Module Tab Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 pt-2 flex items-center gap-1 overflow-x-auto scrollbar-none shadow-xs">
        
        {/* 1. Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'dashboard'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
          <span>1. Dashboard</span>
        </button>

        {/* 2. Raise the Form */}
        <button
          onClick={() => setActiveTab('form')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'form'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>2. Raise Kaizen Form</span>
        </button>

        {/* 3. Master Tracker */}
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'list'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5 text-slate-600" />
          <span>3. Master Tracker ({kaizens.length})</span>
        </button>

        {/* 4. Presentation Mode */}
        <button
          onClick={() => setActiveTab('presentation')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'presentation'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tv className="w-3.5 h-3.5 text-indigo-500" />
          <span>4. Presentation Mode</span>
        </button>

        {/* 5. Other / Specific Submenus */}
        <div className="relative shrink-0">
          <button
            onClick={() => {
              if (activeTab !== 'other' && activeTab !== 'committee' && activeTab !== 'impact-tracker' && activeTab !== 'process-flowchart' && activeTab !== 'gamification' && activeTab !== 'cft-awards') {
                setActiveTab('other');
              }
            }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'other' || activeTab === 'committee' || activeTab === 'impact-tracker' || activeTab === 'process-flowchart' || activeTab === 'gamification' || activeTab === 'cft-awards'
                ? 'border-purple-600 text-purple-700 bg-purple-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>5. Other / Submenus</span>
          </button>
        </div>

      </div>

      {/* Sub-menu bar when on Other */}
      {(activeTab === 'other' || activeTab === 'committee' || activeTab === 'impact-tracker' || activeTab === 'process-flowchart' || activeTab === 'gamification' || activeTab === 'cft-awards') && (
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex flex-wrap gap-2 text-xs font-mono font-semibold">
          {[
            { id: 'committee', label: '👥 Committee Review Board' },
            { id: 'impact-tracker', label: '🎯 Open Impact Tracker' },
            { id: 'cft-awards', label: '🏆 CFT Best Awards' },
            { id: 'gamification', label: '🎮 Operator Gamification' },
            { id: 'process-flowchart', label: '🗺️ Process Flowchart' },
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

      {/* Render Submodules */}
      {activeTab === 'dashboard' && (
        <Dashboard
          kaizens={kaizens}
          onSelectKaizen={onSelectKaizen}
          onNavigateToTab={(tab) => {
            if (tab === 'form') handleSetPersona('operator');
            else if (tab === 'committee') handleSetPersona('committee');
            else setActiveTab(tab as any);
          }}
        />
      )}

      {activeTab === 'form' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <KaizenSheetForm
            onAddKaizen={(k) => {
              onAddKaizen(k);
              setActiveTab('list');
            }}
            onCancel={() => setActiveTab('dashboard')}
          />
        </div>
      )}

      {activeTab === 'list' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 space-y-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide font-mono mb-1">
              📋 Kaizen Spreadsheet Register
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Click on any entry row to inspect, print, or review its complete Kaizen sheet.
            </p>
          </div>
          <KaizenSpreadsheet
            kaizens={kaizens}
            onSelectKaizen={onSelectKaizen}
            onUpdateKaizen={onUpdateKaizen}
          />
        </div>
      )}

      {activeTab === 'presentation' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <PresentationModeView
            moduleName="Kaizen Continuous Improvement Board"
            moduleIcon={<Lightbulb className="w-5 h-5 text-emerald-500" />}
            slides={presentationSlides}
            onExit={() => setActiveTab('list')}
            isSidebarHidden={isSidebarHidden}
            onToggleSidebar={onToggleSidebar}
          />
        </div>
      )}

      {(activeTab === 'committee' || (activeTab === 'other' && otherSubmenu === 'committee')) && (
        <KaizenReviewBoard
          kaizens={kaizens}
          onUpdateKaizen={onUpdateKaizen}
        />
      )}

      {(activeTab === 'cft-awards' || (activeTab === 'other' && otherSubmenu === 'cft-awards')) && (
        <CftMonthlyAwards
          kaizens={kaizens}
          ppsrReports={ppsrReports}
          onUpdateKaizen={onUpdateKaizen}
          onUpdatePpsrReport={onUpdatePpsrReport}
        />
      )}

      {(activeTab === 'impact-tracker' || (activeTab === 'other' && otherSubmenu === 'impact-tracker')) && (
        <OpenImpactTracker
          impactActions={impactActions}
          kaizens={kaizens}
          onAddImpactAction={onAddImpactAction}
          onUpdateImpactAction={onUpdateImpactAction}
          onDeleteImpactAction={onDeleteImpactAction}
        />
      )}

      {(activeTab === 'gamification' || (activeTab === 'other' && otherSubmenu === 'gamification')) && (
        <KaizenGamificationAnalytics
          kaizens={kaizens}
          onSelectKaizen={onSelectKaizen}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
        />
      )}

      {(activeTab === 'process-flowchart' || (activeTab === 'other' && otherSubmenu === 'process-flowchart')) && (
        <KaizenProcessFlowchart />
      )}
    </div>
  );
}
