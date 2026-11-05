import React from 'react';
import { ShieldAlert, X, ArrowLeft, Lock } from 'lucide-react';

export interface AccessDeniedModalProps {
  isOpen: boolean;
  moduleName: string;
  onClose: () => void;
  message?: string;
  onBackToDashboard?: () => void;
}

export default function AccessDeniedModal({
  isOpen,
  moduleName,
  onClose,
  message,
  onBackToDashboard,
}: AccessDeniedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0E1626]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-[#191B40] rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border-2 border-rose-500/40 text-[#F2F2F2] relative overflow-hidden">
        {/* Glow atmosphere */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#F2F2F2]/60 hover:text-[#F2F2F2] p-1.5 rounded-xl hover:bg-[#0E1626] transition cursor-pointer"
          title="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Glowing Shield Icon */}
          <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border-2 border-rose-500/50 flex items-center justify-center text-rose-400 mb-5 shadow-lg shadow-rose-950/60 animate-bounce">
            <ShieldAlert className="w-8 h-8 text-rose-400" />
          </div>

          {/* Badge */}
          <span className="font-mono text-[10px] font-bold text-rose-400 bg-rose-950/60 px-3 py-1 rounded-full border border-rose-500/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            <span>ROLE-BASED RESTRICTION</span>
          </span>

          {/* Heading requested by user */}
          <h3 className="text-xl md:text-2xl font-black text-[#F2F2F2] font-['Hanken_Grotesk'] tracking-tight">
            Access not available to you
          </h3>
          <p className="text-xs text-rose-300 font-mono mt-0.5">
            Authorization Required
          </p>

          {/* Description */}
          <div className="my-5 p-4 bg-[#0E1626]/90 border border-rose-500/30 rounded-2xl text-left w-full">
            <p className="text-xs text-[#F2F2F2]/80 leading-relaxed font-sans">
              {message || (
                <>
                  You do not have permission to access the <strong className="text-rose-300 font-semibold">{moduleName}</strong> module. Your account has been assigned <strong className="text-rose-400">No Access</strong> for this section.
                </>
              )}
            </p>
            <div className="mt-3 pt-3 border-t border-[#F2F2F2]/10 flex items-center justify-between text-[11px] font-mono text-[#F2F2F2]/60">
              <span>Security Status:</span>
              <span className="text-rose-400 font-bold uppercase">Restricted</span>
            </div>
          </div>

          <p className="text-[11px] text-[#F2F2F2]/60 mb-5 leading-normal">
            If you require authorization for this module, please contact your Plant Administrator or SuperAdmin.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 w-full">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 font-mono text-xs font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-lg shadow-rose-900/40 transition cursor-pointer"
            >
              OK, Understood
            </button>
            {onBackToDashboard && (
              <button
                onClick={() => {
                  onClose();
                  onBackToDashboard();
                }}
                className="py-3 px-4 font-mono text-xs font-bold rounded-xl bg-[#0E1626] border border-[#F2F2F2]/15 hover:bg-[#191B40] text-[#F2F2F2] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
