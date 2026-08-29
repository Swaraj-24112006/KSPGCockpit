import React, { useState } from 'react';
import { SafetyIncident } from '../types';
import { ShieldAlert, Plus, CheckCircle, Clock, X, AlertTriangle, User, Calendar, FileText } from 'lucide-react';

interface SafetyIncidentsProps {
  incidents: SafetyIncident[];
  onAddIncident: (data: Partial<SafetyIncident>) => void;
  onUpdateIncident: (id: string, data: Partial<SafetyIncident>) => void;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
}

export default function SafetyIncidents({
  incidents,
  onAddIncident,
  onUpdateIncident,
  initialAction,
  onClearInitialAction
}: SafetyIncidentsProps) {
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SafetyIncident | null>(null);

  React.useEffect(() => {
    if (initialAction === 'report-hazard') {
      setShowLogModal(true);
      if (onClearInitialAction) onClearInitialAction();
    }
  }, [initialAction]);

  // Form states
  const [type, setType] = useState<'Unsafe Act' | 'Unsafe Condition' | 'Near Miss' | 'Minor Injury'>('Near Miss');
  const [area, setArea] = useState('Assembly Line A (Pune)');
  const [description, setDescription] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);

  // Closure state
  const [closureAction, setClosureAction] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !reportedBy) {
      alert("Please fill in Description and Reported By fields.");
      return;
    }
    onAddIncident({
      type,
      area,
      description,
      reportedBy,
      immediateAction,
      targetDate,
      status: 'Open',
      incidentDate: new Date().toISOString().split('T')[0]
    });
    setShowLogModal(false);
    setDescription('');
    setReportedBy('');
    setImmediateAction('');
    alert('EHS Safety Incident reported successfully!');
  };

  const handleCloseIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    if (!closureAction) {
      alert("Please write the final action taken to close the hazard.");
      return;
    }
    onUpdateIncident(selectedIncident.id, {
      immediateAction: selectedIncident.immediateAction ? `${selectedIncident.immediateAction}. Closure: ${closureAction}` : closureAction,
      status: 'Closed',
      closedDate: new Date().toISOString().split('T')[0]
    });
    setSelectedIncident(null);
    setClosureAction('');
    alert('Safety incident closed and verified.');
  };

  const openCount = incidents.filter(i => i.status === 'Open').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="safety-module">
      
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">🛡️ EHS Safety & Near-Miss Incident Tracker</h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              "Safety First". Proactively report Unsafe Acts and Unsafe Conditions to maintain a true zero-accident streak.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider font-mono shrink-0"
        >
          + Report Safety Hazard
        </button>
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-white border p-6 rounded-2xl text-center space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Zero Harm Streak</span>
          <span className="text-4xl font-black text-emerald-600 block">142 DAYS</span>
          <p className="text-[10px] text-slate-400 font-medium">Consecutive safe days on the shopfloor</p>
        </div>

        <div className="bg-white border p-6 rounded-2xl text-center space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Proactive Near Misses Logged</span>
          <span className="text-4xl font-black text-slate-800 block font-mono">{incidents.length}</span>
          <p className="text-[10px] text-slate-400 font-medium">Total reported hazards</p>
        </div>

        <div className="bg-white border border-rose-100 p-6 rounded-2xl text-center space-y-1">
          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest font-mono">🚨 Active Open Hazards</span>
          <span className={`text-4xl font-black block font-mono ${openCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-500'}`}>
            {openCount}
          </span>
          <p className="text-[10px] text-slate-400 font-medium">Require immediate containment & actions</p>
        </div>

      </div>

      {/* Incident List */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">🛡️ Active Safety Incident Register</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {incidents.length === 0 ? (
            <p className="text-xs text-slate-400 font-mono py-12 text-center">No safety incidents reported on the register.</p>
          ) : (
            incidents.map((inc) => (
              <div 
                key={inc.id} 
                className="p-5 hover:bg-slate-50/50 transition cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                onClick={() => setSelectedIncident(inc)}
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono uppercase border ${
                      inc.type === 'Unsafe Act' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      inc.type === 'Unsafe Condition' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      inc.type === 'Near Miss' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-50 text-slate-700'
                    }`}>
                      {inc.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">📅 {inc.incidentDate} • {inc.area}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 leading-relaxed">{inc.description}</h4>
                  <p className="text-[10px] text-slate-400 font-medium font-mono">Reported by: 👤 {inc.reportedBy} • Target Closure: 📅 {inc.targetDate}</p>
                </div>

                <div className="flex items-center space-x-3 self-end md:self-center shrink-0">
                  <span className={`text-[10px] font-black font-mono px-2.5 py-1 rounded-full uppercase border ${
                    inc.status === 'Open' ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  }`}>
                    {inc.status}
                  </span>
                  {inc.status === 'Open' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIncident(inc);
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg font-mono uppercase"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* REPORT HAZARD MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between">
              <span className="text-xs font-black uppercase font-mono tracking-wider flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span>Log EHS Proactive Report</span>
              </span>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Hazard Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="Near Miss">Near Miss</option>
                    <option value="Unsafe Condition">Unsafe Condition</option>
                    <option value="Unsafe Act">Unsafe Act</option>
                    <option value="Minor Injury">Minor Injury</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Shopfloor Area</label>
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

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Hazard Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Clearly describe the unsafe condition, act, or near-miss event detected..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Immediate Corrective Action Taken</label>
                <textarea
                  value={immediateAction}
                  onChange={(e) => setImmediateAction(e.target.value)}
                  rows={2}
                  placeholder="What temporary or instant control measures were executed?..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Reported By</label>
                <input
                  type="text"
                  value={reportedBy}
                  onChange={(e) => setReportedBy(e.target.value)}
                  placeholder="e.g. Sanjay Patil"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none font-bold"
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
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider font-mono"
                >
                  Report Hazard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOSE SAFETY INCIDENT WORKSPACE MODAL */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between">
              <span className="text-xs font-black uppercase font-mono tracking-wider">
                Resolve Safety Hazard: {selectedIncident.type}
              </span>
              <button onClick={() => setSelectedIncident(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl space-y-1.5 text-xs text-slate-600">
                <p><strong>Description:</strong> {selectedIncident.description}</p>
                <p><strong>Reported By:</strong> {selectedIncident.reportedBy} on {selectedIncident.incidentDate}</p>
                <p><strong>Immediate Action:</strong> {selectedIncident.immediateAction || 'None reported'}</p>
              </div>

              {selectedIncident.status === 'Open' ? (
                <form onSubmit={handleCloseIncidentSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Final Permanent Corrective Action (Elimination of Hazard)</label>
                    <textarea
                      value={closureAction}
                      onChange={(e) => setClosureAction(e.target.value)}
                      rows={3}
                      placeholder="e.g. Frayed electrical line completely replaced with armored conduit cable..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedIncident(null)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-black font-mono uppercase"
                    >
                      ✓ Close Hazard
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-800 font-bold flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>This hazard was successfully closed and verified on {selectedIncident.closedDate}.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
