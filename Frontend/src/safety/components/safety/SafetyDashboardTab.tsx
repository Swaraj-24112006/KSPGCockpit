import React from 'react';
import { SafetyObservation, NearMissReport, AccidentReport } from '../../types';
import { 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  Target
} from 'lucide-react';

interface SafetyDashboardTabProps {
  observations: SafetyObservation[];
  nearMisses: NearMissReport[];
  accidents: AccidentReport[];
  onNavigateSubmodule: (tab: 'observations' | 'nearmiss' | 'accidents' | 'timeline' | 'risk-matrix' | 'dashboard') => void;
}

export default function SafetyDashboardTab({
  observations,
  nearMisses,
  accidents,
  onNavigateSubmodule
}: SafetyDashboardTabProps) {
  const totalAccidents = accidents.length;
  const lostTimeAccidents = accidents.filter(a => (a.mandaysLost || 0) > 0).length;
  const firstAidAccidents = accidents.filter(a => (a.mandaysLost || 0) === 0).length;
  const totalNearMisses = nearMisses.length;
  const totalObservations = observations.length;

  const catACount = observations.filter(o => o.category === 'A').length;
  const catBCount = observations.filter(o => o.category === 'B').length;
  const catCCount = observations.filter(o => o.category === 'C').length;
  const catPendingCount = observations.filter(o => !o.category).length;

  const unsafeActCount = observations.filter(o => o.legend === 'Unsafe act').length;
  const unsafeConditionCount = observations.filter(o => o.legend === 'Unsafe condition').length;

  const daysWithoutLTI = 294;

  return (
    <div className="space-y-6">
      {/* Zero Harm Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <span className="text-[10px] font-bold text-emerald-400 font-mono tracking-widest uppercase block">
              Zero Harm Metrics
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Safety Overview
            </h2>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl px-5 py-3 border border-slate-700 flex items-center space-x-3 shrink-0">
          <div className="text-center">
            <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
              {daysWithoutLTI}
            </div>
            <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">
              Safe Days Without LTI
            </div>
          </div>
        </div>
      </div>

      {/* 3 Submodules Launchpad */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          onClick={() => onNavigateSubmodule('observations')}
          className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-xs rounded-2xl p-5 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Submodule 01</span>
              <span className="font-bold text-slate-900">{totalObservations} Records</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-2 group-hover:text-amber-700 transition-colors">
              Safety Observations
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-700">
            <span>Open Register</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div 
          onClick={() => onNavigateSubmodule('nearmiss')}
          className="bg-white border border-slate-200 hover:border-orange-400 hover:shadow-xs rounded-2xl p-5 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Submodule 02</span>
              <span className="font-bold text-slate-900">{totalNearMisses} Records</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-2 group-hover:text-orange-700 transition-colors">
              Near Miss Register
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-orange-700">
            <span>Open Register</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div 
          onClick={() => onNavigateSubmodule('accidents')}
          className="bg-white border border-slate-200 hover:border-rose-400 hover:shadow-xs rounded-2xl p-5 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Submodule 03</span>
              <span className="font-bold text-slate-900">{totalAccidents} Records</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-2 group-hover:text-rose-700 transition-colors">
              Accident Reports
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-rose-700">
            <span>Open Register</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Heinrich Pyramid & Category Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
              Safety Triangle
            </h3>
            <span className="text-xs font-bold text-emerald-700 font-mono">Live Count</span>
          </div>

          <div className="flex flex-col items-center justify-center py-4 space-y-2">
            <div className="w-44 bg-rose-700 text-white text-center py-2 rounded-t-xl shadow-xs">
              <div className="text-xs uppercase font-bold tracking-wider">Accidents</div>
              <div className="text-lg font-black font-mono">{totalAccidents} <span className="text-[10px] font-normal">({lostTimeAccidents} LTI / {firstAidAccidents} First-Aid)</span></div>
            </div>

            <div className="w-72 bg-amber-500 text-white text-center py-2.5 shadow-xs">
              <div className="text-xs uppercase font-bold tracking-wider">Near Misses</div>
              <div className="text-lg font-black font-mono">{totalNearMisses}</div>
            </div>

            <div className="w-96 bg-emerald-700 text-white text-center py-3 rounded-b-xl shadow-xs">
              <div className="text-xs uppercase font-bold tracking-wider">Safety Observations</div>
              <div className="text-xl font-black font-mono">{totalObservations}</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
              Category Distribution
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-700">Category A</span>
                <span className="font-mono">{catACount}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-rose-600 h-full rounded-full" 
                  style={{ width: `${totalObservations > 0 ? (catACount / totalObservations) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700">Category B</span>
                <span className="font-mono">{catBCount}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full" 
                  style={{ width: `${totalObservations > 0 ? (catBCount / totalObservations) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-blue-700">Category C</span>
                <span className="font-mono">{catCCount}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full" 
                  style={{ width: `${totalObservations > 0 ? (catCCount / totalObservations) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-500">Pending Category</span>
                <span className="font-mono">{catPendingCount}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-slate-400 h-full rounded-full" 
                  style={{ width: `${totalObservations > 0 ? (catPendingCount / totalObservations) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Unsafe Conditions</div>
              <div className="text-xl font-bold font-mono text-amber-700 mt-0.5">{unsafeConditionCount}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Unsafe Acts</div>
              <div className="text-xl font-bold font-mono text-rose-700 mt-0.5">{unsafeActCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Cards: Risk Matrix & Incident Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-rose-300 font-mono uppercase">5×5 Priority Grid</div>
              <h3 className="text-sm font-bold text-white">Risk Assessment Matrix</h3>
            </div>
          </div>
          <button
            onClick={() => onNavigateSubmodule('risk-matrix')}
            className="flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
          >
            <span>Open Matrix</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-amber-300 font-mono uppercase">5-Stage Stepper</div>
              <h3 className="text-sm font-bold text-white">Incident Timeline</h3>
            </div>
          </div>
          <button
            onClick={() => onNavigateSubmodule('timeline')}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
          >
            <span>Open Timeline</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
