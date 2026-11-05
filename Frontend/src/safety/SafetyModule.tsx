import React from 'react';
import SafetyIncidents, { SafetyViewType } from './components/SafetyIncidents';
import { SafetyIncident, UserPersona } from './types';
import { isAuthenticated, getUser } from '../shared/utils/auth';
import { Lock, ShieldAlert, LogIn } from 'lucide-react';

interface SafetyModuleProps {
  incidents?: SafetyIncident[];
  onAddIncident?: (incidentData: Partial<SafetyIncident>) => void;
  onUpdateIncident?: (id: string, updatedFields: Partial<SafetyIncident>) => void;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
  isSidebarHidden?: boolean;
  onToggleSidebar?: () => void;
  persona?: UserPersona;
  setPersona?: (p: UserPersona) => void;
  activeView?: SafetyViewType;
  setActiveView?: (view: SafetyViewType) => void;
  onNavigateToModule?: (moduleKey: any, subAction?: string) => void;
}

export default function SafetyModule({
  incidents = [],
  onAddIncident = () => {},
  onUpdateIncident = () => {},
  initialAction,
  onClearInitialAction,
  isSidebarHidden,
  onToggleSidebar,
  persona,
  setPersona,
  activeView,
  setActiveView,
}: SafetyModuleProps) {
  // Gated Access Check: Safety Desk is only accessible to authenticated users
  if (!isAuthenticated()) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-3">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Restricted Access</span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              Authentication Required
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              The EHS Safety Desk, Heinrich Pyramid Dashboard, and Near-Miss registers are secure plant modules. Please log in with your employee credentials to proceed.
            </p>

            <button
              onClick={() => { window.location.href = '/'; }}
              className="w-full inline-flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Go to Login</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Derive initial persona from current authenticated user if not explicitly passed
  const currentUser = getUser();
  const effectivePersona: UserPersona = persona || (
    currentUser?.department?.toLowerCase().includes('medical') || currentUser?.role_category === 'doctor' as any
      ? 'doctor'
      : currentUser?.is_superadmin || currentUser?.role_category === 'admin' || currentUser?.role_category === 'coordinator'
      ? 'coordinator'
      : 'operator'
  );

  return (
    <SafetyIncidents
      incidents={incidents}
      onAddIncident={onAddIncident}
      onUpdateIncident={onUpdateIncident}
      initialAction={initialAction}
      onClearInitialAction={onClearInitialAction}
      isSidebarHidden={isSidebarHidden}
      onToggleSidebar={onToggleSidebar}
      persona={effectivePersona}
      setPersona={setPersona}
      activeView={activeView}
      setActiveView={setActiveView}
    />
  );
}

export type { SafetyViewType };
