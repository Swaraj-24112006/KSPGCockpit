import React from 'react';
import { ShieldAlert, ArrowLeft, Lightbulb, LayoutDashboard } from 'lucide-react';
import { RoleCategory, getRoleBadge } from '../utils/rbac';

interface AccessDeniedProps {
  userRole?: RoleCategory;
  attemptedSection: string;
  onNavigateHome: () => void;
  onNavigateKaizen: () => void;
}

export default function AccessDenied({
  userRole = 'initiator',
  attemptedSection,
  onNavigateHome,
  onNavigateKaizen,
}: AccessDeniedProps) {
  const badge = getRoleBadge(userRole);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 animate-fade-in">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Shield Icon */}
        <div className="w-16 h-16 bg-rose-950/80 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5 text-rose-400 shadow-lg shadow-rose-950/50 animate-bounce">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-black text-white tracking-wide uppercase font-display">
          Access Restricted
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Security Policy • RBAC Enforcement
        </p>

        {/* User Role Tag */}
        <div className="mt-5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-left">
          <div className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">
            Your Active Role
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-base">{badge.icon}</span>
            <span className="text-sm font-bold text-slate-200">{badge.label}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
            {badge.description}
          </p>
        </div>

        {/* Description of restriction */}
        <div className="mt-4 p-3 bg-rose-950/30 border border-rose-900/40 rounded-xl text-left">
          <p className="text-xs text-rose-200 leading-relaxed font-sans">
            The <strong className="text-rose-100 uppercase tracking-wide">"{attemptedSection}"</strong> section is not authorized for your role assignment.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={onNavigateKaizen}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-950 cursor-pointer"
          >
            <Lightbulb className="w-4 h-4" />
            <span>Return to Kaizen Overview</span>
          </button>

          <button
            type="button"
            onClick={onNavigateHome}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition border border-slate-700 cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Go to SFMS Global Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
