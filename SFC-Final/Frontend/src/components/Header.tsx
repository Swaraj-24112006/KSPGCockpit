import React from 'react';
import { UserPersona, Kaizen } from '../types';
import { Menu, Shield, Sparkles, Database, User, Users, LineChart, CheckCircle, Clock, TrendingUp, Globe, Flag } from 'lucide-react';
import { formatIndianRupeesCompact } from '../utils';

interface HeaderProps {
  currentPersona: UserPersona;
  setPersona: (persona: UserPersona) => void;
  kaizens: Kaizen[];
  openRedflagsCount: number;
  onMenuClick?: () => void;
}

export default function Header({ currentPersona, setPersona, kaizens, openRedflagsCount, onMenuClick }: HeaderProps) {
  const pendingCount = kaizens.filter(k => k.status === 'Pending').length;
  const approvedCount = kaizens.filter(k => k.status === 'Approved' || k.status === 'Good Point').length;
  const totalSavings = kaizens
    .filter(k => k.status === 'Approved' || k.status === 'Good Point')
    .reduce((sum, k) => sum + (k.costSave || 0), 0);

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          
          {/* App Branding */}
          <div className="flex items-center space-x-3">
            {onMenuClick && (
              <button
                type="button"
                onClick={onMenuClick}
                className="md:hidden p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                title="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-md shadow-slate-900/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  SHOPFLOOR MS
                </h1>
                <span className="bg-slate-900 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                  Master Hub
                </span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 font-mono tracking-wider uppercase">
                Continuous Improvement & QA Portal
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider leading-none">Kaizens</div>
                <div className="text-xs font-bold text-emerald-800 leading-none mt-1 font-mono">{approvedCount} Solved</div>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-xl px-3 py-1.5 flex items-center space-x-2">
              <Flag className="w-4 h-4 text-rose-600" />
              <div>
                <div className="text-[10px] font-bold text-rose-700/70 uppercase tracking-wider leading-none">Red Flags</div>
                <div className={`text-xs font-bold leading-none mt-1 font-mono ${openRedflagsCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                  {openRedflagsCount} Active
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-xl px-4 py-1.5 flex items-center space-x-2 shadow-sm">
              <Database className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Kaizen ROI</div>
                <div className="text-xs font-bold text-emerald-400 leading-none mt-1 font-mono">
                  {formatIndianRupeesCompact(totalSavings)}/yr
                </div>
              </div>
            </div>
          </div>

          {/* Persona Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex space-x-1 self-start md:self-auto border border-slate-200">
            <button
              id="persona-operator-btn"
              onClick={() => setPersona('operator')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                currentPersona === 'operator'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>👷 Operator</span>
            </button>
            <button
              id="persona-committee-btn"
              onClick={() => setPersona('committee')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                currentPersona === 'committee'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>👥 Committee</span>
            </button>
            <button
              id="persona-manager-btn"
              onClick={() => setPersona('manager')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                currentPersona === 'manager'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>📊 Manager</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
