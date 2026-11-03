import React, { useState } from 'react';
import { Sparkles, Plus, CheckCircle2, Circle, AlertCircle, Clock, Check, X, ShieldAlert, Droplets, Wind, Wrench } from 'lucide-react';
import { FiveSSocLog } from '../../types';

interface FiveSSocTrackerProps {
  socLogs: FiveSSocLog[];
  onAddSocLog: (soc: Partial<FiveSSocLog>) => void;
  onUpdateSocLog: (id: string, soc: Partial<FiveSSocLog>) => void;
  onDeleteSocLog: (id: string) => void;
}

const DAILY_GEMBA_ROUTINE = [
  { id: 'g1', task: 'Machine Exterior Wipe-Down', detail: 'Clean swarf, sludge, and coolant mist from inspection plexiglass and machine bed.' },
  { id: 'g2', task: 'Epoxy Floor Inspection', detail: 'Ensure zero puddles of oil, water, or hydraulic fluid. Clean spills immediately.' },
  { id: 'g3', task: 'Tool Shadow Board Return', detail: 'Verify 100% of wrenches, drivers, and calipers are present in their shadow slots.' },
  { id: 'g4', task: 'WIP Yellow Footprint Check', detail: 'Confirm part bins do not exceed marked maximum stacking limits on the shop floor.' },
  { id: 'g5', task: 'Bolt Witness Match-Marking', detail: 'Quick visual scan of red torque stripes on critical motor and fixture bolts.' },
  { id: 'g6', task: 'Emergency Safety Walkway Clear', detail: 'Ensure 1-meter radius around electrical panels and eyewash stations is unobstructed.' }
];

export default function FiveSSocTracker({
  socLogs,
  onAddSocLog,
  onUpdateSocLog,
  onDeleteSocLog
}: FiveSSocTrackerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [operatorChecks, setOperatorChecks] = useState<Record<string, boolean>>({
    g1: true,
    g2: true,
    g3: true,
    g4: false,
    g5: true,
    g6: true
  });
  const [operatorName, setOperatorName] = useState('Rahul Sharma (ITI Operator)');
  const [shift, setShift] = useState('Shift 1');
  const [routineCertified, setRoutineCertified] = useState(false);

  // SOC Form State
  const [machineOrArea, setMachineOrArea] = useState('CNC Milling Machine #4 (Hosur)');
  const [contaminantType, setContaminantType] = useState<FiveSSocLog['contaminantType']>('Oil Leak / Drip');
  const [sourceDescription, setSourceDescription] = useState('');
  const [countermeasurePlanned, setCountermeasurePlanned] = useState('');
  const [owner, setOwner] = useState('Sanjay Patil (Senior Machinist)');
  const [targetDate, setTargetDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );

  const toggleCheck = (id: string) => {
    setOperatorChecks((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
    setRoutineCertified(false);
  };

  const completedChecksCount = Object.values(operatorChecks).filter(Boolean).length;
  const isAllChecked = completedChecksCount === DAILY_GEMBA_ROUTINE.length;

  const handleSignOffRoutine = () => {
    if (!isAllChecked) {
      alert('Please complete all 6 daily clean-to-inspect tasks before signing off.');
      return;
    }
    setRoutineCertified(true);
    alert(`Shift Daily 5-Minute 5S Gemba Walk signed off by ${operatorName}!`);
  };

  const handleCreateSocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceDescription.trim()) return;

    onAddSocLog({
      machineOrArea,
      contaminantType,
      sourceDescription,
      countermeasurePlanned,
      owner,
      targetDate,
      status: 'Open',
      dateFound: new Date().toISOString().split('T')[0]
    });

    setShowAddModal(false);
    setSourceDescription('');
    setCountermeasurePlanned('');
  };

  const openSocCount = socLogs.filter((s) => s.status === 'Open').length;
  const eliminatedCount = socLogs.filter((s) => s.status === 'Eliminated').length;

  return (
    <div className="space-y-6">
      {/* Top Banner: Daily 5-Minute Operator Gemba Routine */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-white border border-blue-900/40 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-600/30 text-blue-400 rounded-2xl border border-blue-500/30">
              <Sparkles className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold">
                3S SEISO · CLEANING IS INSPECTION (सफाई ही निरीक्षण है)
              </span>
              <h3 className="text-lg font-black tracking-tight uppercase">
                Daily 5-Minute 5S Gemba Walk &amp; Shift Handover Routine
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                COMPLETION RATE
              </span>
              <span className="text-xl font-black font-mono text-emerald-400">
                {completedChecksCount} / {DAILY_GEMBA_ROUTINE.length}
              </span>
            </div>
            <button
              onClick={handleSignOffRoutine}
              disabled={routineCertified}
              className={`px-5 py-2.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition ${
                routineCertified
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                  : isAllChecked
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{routineCertified ? '✓ Shift Certified' : 'Sign-Off Shift'}</span>
            </button>
          </div>
        </div>

        {/* 6 Interactive Gemba Checkpoints */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {DAILY_GEMBA_ROUTINE.map((task) => {
            const isChecked = !!operatorChecks[task.id];
            return (
              <div
                key={task.id}
                onClick={() => toggleCheck(task.id)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3 ${
                  isChecked
                    ? 'bg-blue-600/20 border-blue-500/40 text-white'
                    : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="mt-0.5">
                  {isChecked ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <h4 className={`text-xs font-black tracking-tight ${isChecked ? 'text-white' : 'text-slate-300'}`}>
                    {task.task}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {task.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Operator signature line */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono border-t border-slate-800/80 pt-3">
          <div className="flex items-center space-x-3">
            <span>Operator: <strong className="text-white">{operatorName}</strong></span>
            <span>·</span>
            <span>Shift: <strong className="text-blue-400">{shift}</strong></span>
          </div>
          <div>
            <span>Timestamp: <strong className="text-white">{new Date().toLocaleTimeString()}</strong></span>
          </div>
        </div>
      </div>

      {/* Source of Contamination (SOC) Log & Abatement Register */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              💧 Source of Contamination (SOC) Elimination Register
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Root-cause eradication of oil drips, coolant mist, swarf scatter, and dust leaks so cleaning becomes effortless.
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 text-xs font-mono">
              <span className="text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                {openSocCount} Active Leaks
              </span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                {eliminatedCount} Eliminated
              </span>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider font-mono flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Log New SOC</span>
            </button>
          </div>
        </div>

        {/* SOC List */}
        <div className="divide-y divide-slate-100">
          {socLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs">
              Zero active sources of contamination logged! Pristine shopfloor conditions.
            </div>
          ) : (
            socLogs.map((soc) => {
              const isEliminated = soc.status === 'Eliminated';
              return (
                <div key={soc.id} className="p-5 hover:bg-slate-50/60 transition space-y-3">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black font-mono bg-cyan-50 text-cyan-800 border border-cyan-200 flex items-center gap-1">
                          <Droplets className="w-3 h-3" />
                          {soc.contaminantType}
                        </span>
                        <span className="text-xs font-bold text-slate-800 font-mono">
                          📍 {soc.machineOrArea}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          📅 Found: {soc.dateFound}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-800 leading-snug">
                        {soc.sourceDescription}
                      </h4>

                      <div className="text-xs text-emerald-900 bg-emerald-50/70 p-2 rounded-xl border border-emerald-200/60 font-sans">
                        <strong className="text-emerald-800 font-mono text-[10px] uppercase">
                          Countermeasure / Abatement: 
                        </strong>{' '}
                        {soc.countermeasurePlanned}
                      </div>

                      <div className="flex items-center space-x-4 text-[10px] font-mono text-slate-400 pt-1">
                        <span>👤 Owner: {soc.owner}</span>
                        <span>Target: {soc.targetDate}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end space-y-2">
                      <select
                        value={soc.status}
                        onChange={(e) => onUpdateSocLog(soc.id, { status: e.target.value as any })}
                        className={`text-xs font-black font-mono px-3 py-1.5 rounded-xl border focus:outline-none ${
                          isEliminated
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        <option value="Open">Open</option>
                        <option value="Eliminated">Eliminated (Sustained)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Delete this SOC item?')) onDeleteSocLog(soc.id);
                        }}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-mono transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add SOC Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Droplets className="w-5 h-5 text-white" />
                <h3 className="text-sm font-black uppercase tracking-tight font-mono">
                  Log Source of Contamination (SOC)
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-emerald-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSocSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                  Machine / Station Name
                </label>
                <input
                  type="text"
                  required
                  value={machineOrArea}
                  onChange={(e) => setMachineOrArea(e.target.value)}
                  placeholder="e.g. CNC Milling Machine #4 (Hosur)"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                  Contaminant Type
                </label>
                <select
                  value={contaminantType}
                  onChange={(e) => setContaminantType(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Oil Leak / Drip">Oil Leak / Drip</option>
                  <option value="Coolant Mist">Coolant Mist</option>
                  <option value="Metal Chips / Swarf">Metal Chips / Swarf</option>
                  <option value="Dust / Powder">Dust / Powder</option>
                  <option value="Water / Condensate">Water / Condensate</option>
                  <option value="Pneumatic Exhaust">Pneumatic Exhaust</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                  Root Cause &amp; Leak Description *
                </label>
                <textarea
                  required
                  rows={2}
                  value={sourceDescription}
                  onChange={(e) => setSourceDescription(e.target.value)}
                  placeholder="Where is the fluid/chip escaping from? (e.g. worn wiper, missing curtain, loose fitting)..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                  Permanent Countermeasure / Shield Planned
                </label>
                <textarea
                  rows={2}
                  value={countermeasurePlanned}
                  onChange={(e) => setCountermeasurePlanned(e.target.value)}
                  placeholder="e.g. Fabricate stainless splash tray with magnetic mounting..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                    Responsible Owner
                  </label>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider font-mono shadow-md shadow-emerald-600/30"
                >
                  Register SOC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
