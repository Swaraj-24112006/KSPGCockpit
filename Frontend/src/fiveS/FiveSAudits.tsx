import React, { useState } from 'react';
import { FiveSAudit } from '../types';
import { Sparkles, Calendar, Plus, User, FileText, CheckCircle, Award } from 'lucide-react';

interface FiveSAuditsProps {
  audits: FiveSAudit[];
  onAddAudit: (data: Partial<FiveSAudit>) => void;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
}

export default function FiveSAudits({ 
  audits, 
  onAddAudit,
  initialAction,
  onClearInitialAction
}: FiveSAuditsProps) {
  const [showLogModal, setShowLogModal] = useState(false);

  React.useEffect(() => {
    if (initialAction === 'log-audit') {
      setShowLogModal(true);
      if (onClearInitialAction) onClearInitialAction();
    }
  }, [initialAction]);
  
  // Form State
  const [area, setArea] = useState('Assembly Line A (Pune)');
  const [auditor, setAuditor] = useState('Amit Mehta (Kaizen Lead)');
  const [sort, setSort] = useState(4);
  const [setInOrder, setSetInOrder] = useState(4);
  const [shine, setShine] = useState(4);
  const [standardize, setStandardize] = useState(4);
  const [sustain, setSustain] = useState(4);
  const [remarks, setRemarks] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddAudit({
      area,
      auditor,
      sortScore: sort,
      setInOrderScore: setInOrder,
      shineScore: shine,
      standardizeScore: standardize,
      sustainScore: sustain,
      remarks,
      auditDate: new Date().toISOString().split('T')[0]
    });
    setShowLogModal(false);
    setRemarks('');
    alert('5S Workplace Audit successfully recorded!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="fives-module">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">🧼 5S Workplace Audits & Standard</h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Sort (Seiri), Set in Order (Seiton), Shine (Seiso), Standardize (Seiketsu), and Sustain (Shitsuke). Monitor workplace productivity.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider font-mono shrink-0"
        >
          + Record 5S Audit
        </button>
      </div>

      {/* Grid of latest audits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Side: Audit Log List */}
        <div className="bg-white p-6 border border-slate-200 rounded-3xl space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-mono">📋 Latest 5S Audit Logs</h3>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {audits.length === 0 ? (
              <p className="text-xs text-slate-400 font-mono py-8 text-center">No audits logged yet for this plant.</p>
            ) : (
              audits.map((a) => (
                <div key={a.id} className="p-4 border border-slate-100 bg-slate-50/50 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{a.area}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">📅 {a.auditDate} • Auditor: {a.auditor}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black font-mono ${
                      a.status === 'Excellent' ? 'bg-emerald-100 text-emerald-800' :
                      a.status === 'Good' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {a.totalScore}% - {a.status}
                    </span>
                  </div>

                  {/* 5S break down bars */}
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    <div className="text-center bg-white p-1 rounded-lg border text-[9px]">
                      <span className="block text-slate-400 font-bold font-mono">SORT</span>
                      <span className="font-black text-slate-700">{a.sortScore}/5</span>
                    </div>
                    <div className="text-center bg-white p-1 rounded-lg border text-[9px]">
                      <span className="block text-slate-400 font-bold font-mono">ORDER</span>
                      <span className="font-black text-slate-700">{a.setInOrderScore}/5</span>
                    </div>
                    <div className="text-center bg-white p-1 rounded-lg border text-[9px]">
                      <span className="block text-slate-400 font-bold font-mono">SHINE</span>
                      <span className="font-black text-slate-700">{a.shineScore}/5</span>
                    </div>
                    <div className="text-center bg-white p-1 rounded-lg border text-[9px]">
                      <span className="block text-slate-400 font-bold font-mono">STAND</span>
                      <span className="font-black text-slate-700">{a.standardizeScore}/5</span>
                    </div>
                    <div className="text-center bg-white p-1 rounded-lg border text-[9px]">
                      <span className="block text-slate-400 font-bold font-mono">SUST</span>
                      <span className="font-black text-slate-700">{a.sustainScore}/5</span>
                    </div>
                  </div>

                  {a.remarks && (
                    <p className="text-[11px] text-slate-500 italic font-medium">" {a.remarks} "</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Educational Guidelines */}
        <div className="bg-slate-900 text-slate-300 p-6 rounded-3xl space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center space-x-2">
              <Award className="w-5 h-5 text-blue-400" />
              <span>5S Methodology Standard</span>
            </h3>

            <div className="space-y-4 text-xs font-medium">
              <div>
                <strong className="text-white block font-mono">1. SORT (Seiri)</strong>
                <span className="text-slate-400 text-[11px]">Eliminate all unneeded items from the workstation. Keep only what is critical for production.</span>
              </div>
              <div>
                <strong className="text-white block font-mono">2. SET IN ORDER (Seiton)</strong>
                <span className="text-slate-400 text-[11px]">A place for everything and everything in its place. Use shadow boards and floor marking tags.</span>
              </div>
              <div>
                <strong className="text-white block font-mono">3. SHINE (Seiso)</strong>
                <span className="text-slate-400 text-[11px]">Clean the work area daily. Prevent oil leaks and dust accumulation on machines.</span>
              </div>
              <div>
                <strong className="text-white block font-mono">4. STANDARDIZE (Seiketsu)</strong>
                <span className="text-slate-400 text-[11px]">Create visual SOPs, checklists, and color codes to maintain high standards consistently.</span>
              </div>
              <div>
                <strong className="text-white block font-mono">5. SUSTAIN (Shitsuke)</strong>
                <span className="text-slate-400 text-[11px]">Make 5S a habit. Conduct regular plant-wide audit loops and recognize winning teams.</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 text-center">
            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest block">TARGET SCORE</span>
            <span className="text-3xl font-black text-blue-400 font-mono">85% + Excellent</span>
          </div>
        </div>

      </div>

      {/* RECORD AUDIT MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between">
              <span className="text-xs font-black uppercase font-mono tracking-wider flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Log 5S Shopfloor Scorecard</span>
              </span>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Audit Area</label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                >
                  <option value="Assembly Line A (Pune)">Assembly Line A (Pune)</option>
                  <option value="Welding Shop - Chennai">Welding Shop - Chennai</option>
                  <option value="Hosur Machine Shop">Hosur Machine Shop</option>
                  <option value="Pune Heat Treat Room">Pune Heat Treat Room</option>
                </select>
              </div>

              {/* Scores 1 to 5 */}
              <div className="space-y-2.5">
                <span className="block text-[10px] font-bold text-slate-400 uppercase font-mono">Category Scoring (1 to 5)</span>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">1. Sort (Seiri)</span>
                  <input type="range" min="1" max="5" value={sort} onChange={(e) => setSort(Number(e.target.value))} className="w-1/2" />
                  <span className="font-bold font-mono w-6 text-right">{sort}/5</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">2. Set In Order (Seiton)</span>
                  <input type="range" min="1" max="5" value={setInOrder} onChange={(e) => setSetInOrder(Number(e.target.value))} className="w-1/2" />
                  <span className="font-bold font-mono w-6 text-right">{setInOrder}/5</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">3. Shine (Seiso)</span>
                  <input type="range" min="1" max="5" value={shine} onChange={(e) => setShine(Number(e.target.value))} className="w-1/2" />
                  <span className="font-bold font-mono w-6 text-right">{shine}/5</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">4. Standardize (Seiketsu)</span>
                  <input type="range" min="1" max="5" value={standardize} onChange={(e) => setStandardize(Number(e.target.value))} className="w-1/2" />
                  <span className="font-bold font-mono w-6 text-right">{standardize}/5</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">5. Sustain (Shitsuke)</span>
                  <input type="range" min="1" max="5" value={sustain} onChange={(e) => setSustain(Number(e.target.value))} className="w-1/2" />
                  <span className="font-bold font-mono w-6 text-right">{sustain}/5</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Auditor Name</label>
                <input
                  type="text"
                  value={auditor}
                  onChange={(e) => setAuditor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Remarks & Observations</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  placeholder="Identify outstanding best practices or critical actions..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider font-mono"
                >
                  Log Scorecard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Simple close icon helper inline
function X(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
