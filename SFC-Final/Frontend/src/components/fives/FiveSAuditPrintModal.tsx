import React from 'react';
import { X, Printer, Sparkles, CheckCircle, Award } from 'lucide-react';
import { FiveSAudit } from '../../types';
import FiveSRadarChart from './FiveSRadarChart';

interface FiveSAuditPrintModalProps {
  audit: FiveSAudit | null;
  onClose: () => void;
}

export default function FiveSAuditPrintModal({ audit, onClose }: FiveSAuditPrintModalProps) {
  if (!audit) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white w-[96vw] max-w-[96vw] h-[94vh] max-h-[94vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-fade-in">
        {/* Modal Toolbar (hidden during actual print) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">
              Official 5S Workplace Audit Certificate &amp; Inspection Sheet
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black font-mono uppercase flex items-center space-x-1.5 shadow transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-900 font-sans print:p-0">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-700 font-black block">
                LEAN MANUFACTURING QUALITY ASSURANCE SYSTEM
              </span>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-950">
                5S Workplace Organization Audit Report
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Standardized Japanese 5S Evaluation (Sort · Set In Order · Shine · Standardize · Sustain)
              </p>
            </div>

            <div className="text-right font-mono text-xs space-y-0.5">
              <span className="block font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-300">
                AUDIT ID: {audit.id}
              </span>
              <span className="text-[11px] text-slate-500 block">
                Date: {audit.auditDate}
              </span>
            </div>
          </div>

          {/* Metadata Grid & Score Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-slate-50 p-5 rounded-2xl border border-slate-200">
            {/* Metadata Info */}
            <div className="space-y-2 text-xs md:col-span-1">
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block">
                  Shopfloor Area
                </span>
                <span className="font-black text-slate-800 text-sm">{audit.area}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block">
                  Lead Auditor
                </span>
                <span className="font-bold text-slate-700">{audit.auditor}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 font-bold block">
                    Shift
                  </span>
                  <span className="font-semibold text-slate-700">{audit.shift || 'Shift 1'}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 font-bold block">
                    Audit Type
                  </span>
                  <span className="font-semibold text-slate-700">{audit.auditType || 'Weekly Area Audit'}</span>
                </div>
              </div>
            </div>

            {/* Score Badge */}
            <div className="text-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm md:col-span-1">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-black tracking-widest block">
                COMPLIANCE INDEX
              </span>
              <span className="text-4xl font-black font-mono text-blue-600 block my-1">
                {audit.totalScore}%
              </span>
              <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-black font-mono uppercase ${
                audit.totalScore >= 85 ? 'bg-emerald-100 text-emerald-800' :
                audit.totalScore >= 65 ? 'bg-blue-100 text-blue-800' :
                'bg-amber-100 text-amber-800'
              }`}>
                Grade {audit.grade || (audit.totalScore >= 85 ? 'A' : audit.totalScore >= 65 ? 'B' : 'C')} · {audit.status}
              </span>
            </div>

            {/* Radar Mini View */}
            <div className="flex justify-center md:col-span-1">
              <FiveSRadarChart
                scores={{
                  sort: audit.sortScore,
                  setInOrder: audit.setInOrderScore,
                  shine: audit.shineScore,
                  standardize: audit.standardizeScore,
                  sustain: audit.sustainScore
                }}
                size={180}
                showLabels={false}
              />
            </div>
          </div>

          {/* 5-Pillar Breakdown Cards */}
          <div className="grid grid-cols-5 gap-2 text-center text-xs font-mono">
            <div className="p-2.5 bg-rose-50/70 rounded-xl border border-rose-200">
              <span className="block text-[10px] font-bold text-rose-800">1S SORT</span>
              <span className="text-base font-black text-rose-900">{audit.sortScore.toFixed(1)}/5</span>
            </div>
            <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200">
              <span className="block text-[10px] font-bold text-amber-800">2S ORDER</span>
              <span className="text-base font-black text-amber-900">{audit.setInOrderScore.toFixed(1)}/5</span>
            </div>
            <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
              <span className="block text-[10px] font-bold text-emerald-800">3S SHINE</span>
              <span className="text-base font-black text-emerald-900">{audit.shineScore.toFixed(1)}/5</span>
            </div>
            <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200">
              <span className="block text-[10px] font-bold text-blue-800">4S STD</span>
              <span className="text-base font-black text-blue-900">{audit.standardizeScore.toFixed(1)}/5</span>
            </div>
            <div className="p-2.5 bg-violet-50/70 rounded-xl border border-violet-200">
              <span className="block text-[10px] font-bold text-violet-800">5S SUST</span>
              <span className="text-base font-black text-violet-900">{audit.sustainScore.toFixed(1)}/5</span>
            </div>
          </div>

          {/* Checklist Itemization (if present) */}
          {audit.checklist && audit.checklist.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider font-mono text-slate-800">
                Audit Checkpoint Verification Matrix (25 Criteria)
              </h3>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 font-mono text-[9px] uppercase tracking-wider border-b border-slate-200 text-slate-700">
                    <tr>
                      <th className="py-2 px-3">Pillar</th>
                      <th className="py-2 px-3">Checkpoint &amp; Criteria</th>
                      <th className="py-2 px-3">Standard Requirement</th>
                      <th className="py-2 px-3 text-center">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {audit.checklist.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="py-1.5 px-3 font-mono font-bold text-[10px] text-slate-500 whitespace-nowrap">
                          {item.pillar.split('-')[0]}
                        </td>
                        <td className="py-1.5 px-3">
                          <strong className="text-slate-800 block text-[11px]">{item.checkpoint}</strong>
                          <span className="text-slate-500 text-[10px]">{item.criteria}</span>
                        </td>
                        <td className="py-1.5 px-3 text-[10px] text-slate-600 font-mono">
                          {item.standard}
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono font-black">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            item.score >= 4 ? 'bg-emerald-100 text-emerald-800' :
                            item.score === 3 ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {item.score}/5
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Remarks & Signatures */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block">
              Auditor Summary &amp; Recommendations
            </span>
            <p className="text-xs text-slate-700 leading-relaxed font-sans">
              {audit.remarks || 'Workplace meets 5S standardized benchmarks. Continue sustaining daily shift-end routines.'}
            </p>
          </div>

          {/* Signature Blocks */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-xs font-mono">
            <div className="space-y-8 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                AUDITED BY
              </span>
              <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                {audit.auditor}
              </div>
            </div>

            <div className="space-y-8 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                AREA 5S CHAMPION
              </span>
              <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                Area Supervisor Sign
              </div>
            </div>

            <div className="space-y-8 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                PLANT QUALITY HEAD
              </span>
              <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                QA / Continuous Improvement
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
