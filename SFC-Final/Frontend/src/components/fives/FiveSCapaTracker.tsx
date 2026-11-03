import React, { useState } from 'react';
import { CheckSquare, Plus, CheckCircle, Clock, AlertTriangle, ArrowRight, Lightbulb, Trash2, Camera, Eye, X, Filter } from 'lucide-react';
import { FiveSActionItem, Kaizen } from '../../types';

interface FiveSCapaTrackerProps {
  actionItems: FiveSActionItem[];
  onAddActionItem: (item: Partial<FiveSActionItem>) => void;
  onUpdateActionItem: (id: string, item: Partial<FiveSActionItem>) => void;
  onDeleteActionItem: (id: string) => void;
  onAddKaizen?: (kaizen: Partial<Kaizen>) => void;
}

export default function FiveSCapaTracker({
  actionItems,
  onAddActionItem,
  onUpdateActionItem,
  onDeleteActionItem,
  onAddKaizen
}: FiveSCapaTrackerProps) {
  const [pillarFilter, setPillarFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [convertModalItem, setConvertModalItem] = useState<FiveSActionItem | null>(null);

  // Form states
  const [pillar, setPillar] = useState<'1S' | '2S' | '3S' | '4S' | '5S'>('1S');
  const [findingDescription, setFindingDescription] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [area, setArea] = useState('Assembly Line A (Pune)');
  const [assignedTo, setAssignedTo] = useState('Amit Mehta (Kaizen Lead)');
  const [priority, setPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [targetDate, setTargetDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );

  // Kaizen conversion form state
  const [kaizenTitle, setKaizenTitle] = useState('');
  const [kaizenArea, setKaizenArea] = useState('');
  const [costSaveEst, setCostSaveEst] = useState('50000');

  const openCount = actionItems.filter((a) => a.status === 'Open').length;
  const inProgressCount = actionItems.filter((a) => a.status === 'In Progress').length;
  const closedCount = actionItems.filter((a) => a.status === 'Verified Closed').length;
  const criticalCount = actionItems.filter((a) => a.priority === 'Critical' && a.status !== 'Verified Closed').length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!findingDescription.trim()) return;

    onAddActionItem({
      pillar,
      findingDescription,
      rootCause,
      correctiveAction,
      area,
      assignedTo,
      priority,
      targetDate,
      status: 'Open'
    });

    setShowAddModal(false);
    setFindingDescription('');
    setRootCause('');
    setCorrectiveAction('');
  };

  const handleOpenKaizenModal = (item: FiveSActionItem) => {
    setConvertModalItem(item);
    setKaizenTitle(`5S Kaizen: Fix ${item.pillar} Abnormality at ${item.area}`);
    setKaizenArea(item.area);
  };

  const handleConfirmKaizenConversion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertModalItem || !onAddKaizen) return;

    const newKaizen: Partial<Kaizen> = {
      title: kaizenTitle,
      problemBefore: convertModalItem.findingDescription + (convertModalItem.rootCause ? ` Root Cause: ${convertModalItem.rootCause}` : ''),
      counterMeasureAfter: convertModalItem.correctiveAction,
      area: kaizenArea,
      minifactory: 'MF1',
      costSave: Number(costSaveEst) || 0,
      ideaBy: convertModalItem.assignedTo,
      status: 'Approved',
      classification: 'Kaizen',
      benefits: { p: true, q: true, c: true, d: false, s: true, m: false },
      photoBefore: convertModalItem.photoBefore,
      photoAfter: convertModalItem.photoAfter,
      result: '5S condition standardized and verified sustained.'
    };

    onAddKaizen(newKaizen);

    // Update action item to link kaizen ID
    onUpdateActionItem(convertModalItem.id, {
      linkedKaizenId: `KZ-5S-${Date.now().toString().slice(-4)}`
    });

    setConvertModalItem(null);
    alert('Successfully converted 5S finding to Kaizen Sheet!');
  };

  const filteredItems = actionItems.filter((a) => {
    const matchesPillar = pillarFilter === 'ALL' || a.pillar === pillarFilter;
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchesPillar && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <span className="block text-[10px] font-black uppercase text-rose-600 font-mono tracking-wider">
            OPEN ABNORMALITIES
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-rose-700 font-mono">{openCount}</span>
            <span className="text-xs text-slate-400">pending action</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <span className="block text-[10px] font-black uppercase text-amber-600 font-mono tracking-wider">
            IN PROGRESS (WIP)
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-amber-600 font-mono">{inProgressCount}</span>
            <span className="text-xs text-slate-400">under countermeasure</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <span className="block text-[10px] font-black uppercase text-emerald-600 font-mono tracking-wider">
            VERIFIED CLOSED (CAPA)
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-emerald-600 font-mono">{closedCount}</span>
            <span className="text-xs text-emerald-500 font-bold">100% sustained</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${
          criticalCount > 0 ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'
        }`}>
          <span className="block text-[10px] font-black uppercase text-rose-600 font-mono tracking-wider">
            CRITICAL HIGH PRIORITY
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-rose-800 font-mono">{criticalCount}</span>
            <span className="text-xs text-rose-500 font-bold">immediate focus</span>
          </div>
        </div>
      </div>

      {/* Main Actions Register */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Header Toolbar */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              🛠️ 5S Non-Conformity &amp; Corrective Action (CAPA) Tracker
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Systematic closure of audit findings across Seiri, Seiton, Seiso, Seiketsu, and Shitsuke. Convert abnormalities directly into Kaizen.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider font-mono flex items-center space-x-2 shadow-lg shadow-blue-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Log 5S Finding / CAPA</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-mono text-[10px] uppercase font-bold">Pillar:</span>
            <select
              value={pillarFilter}
              onChange={(e) => setPillarFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Pillars (1S to 5S)</option>
              <option value="1S">1S - Sort (Seiri)</option>
              <option value="2S">2S - Set In Order (Seiton)</option>
              <option value="3S">3S - Shine (Seiso)</option>
              <option value="4S">4S - Standardize (Seiketsu)</option>
              <option value="5S">5S - Sustain (Shitsuke)</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-mono text-[10px] uppercase font-bold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Verified Closed">Verified Closed</option>
            </select>
          </div>
        </div>

        {/* Action Items List */}
        <div className="divide-y divide-slate-100">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs">
              No 5S CAPA action items match the selected filter.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isClosed = item.status === 'Verified Closed';
              const pillarBadgeColor =
                item.pillar === '1S' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                item.pillar === '2S' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                item.pillar === '3S' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                item.pillar === '4S' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                'bg-violet-100 text-violet-700 border-violet-200';

              return (
                <div key={item.id} className="p-5 hover:bg-slate-50/60 transition space-y-3">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono border ${pillarBadgeColor}`}>
                          {item.pillar}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono uppercase ${
                          item.priority === 'Critical' ? 'bg-rose-100 text-rose-700' :
                          item.priority === 'High' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {item.priority} Priority
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          📅 Target: {item.targetDate}
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-slate-800 leading-snug">
                        {item.findingDescription}
                      </h4>

                      {item.rootCause && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200/60 font-sans">
                          <strong className="text-slate-700 font-mono text-[10px] uppercase">Root Cause: </strong>
                          {item.rootCause}
                        </p>
                      )}

                      <div className="text-xs text-blue-900 bg-blue-50/70 p-2 rounded-xl border border-blue-200/60 font-sans">
                        <strong className="text-blue-800 font-mono text-[10px] uppercase">Corrective Action: </strong>
                        {item.correctiveAction}
                      </div>

                      <div className="flex items-center space-x-4 text-[10px] font-mono text-slate-400 pt-1">
                        <span>📍 {item.area}</span>
                        <span>👤 Owner: {item.assignedTo}</span>
                        {item.linkedKaizenId && (
                          <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            ⭐ Linked Kaizen: {item.linkedKaizenId}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Changer & Kaizen Button */}
                    <div className="shrink-0 flex flex-col items-end space-y-2">
                      <select
                        value={item.status}
                        onChange={(e) => onUpdateActionItem(item.id, {
                          status: e.target.value as any,
                          completedDate: e.target.value === 'Verified Closed' ? new Date().toISOString().split('T')[0] : item.completedDate
                        })}
                        className={`text-xs font-black font-mono px-3 py-1.5 rounded-xl border focus:outline-none ${
                          item.status === 'Verified Closed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : item.status === 'In Progress'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Verified Closed">Verified Closed</option>
                      </select>

                      {/* Convert to Kaizen button */}
                      {!item.linkedKaizenId && onAddKaizen && (
                        <button
                          type="button"
                          onClick={() => handleOpenKaizenModal(item)}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] font-mono px-3 py-1.5 rounded-xl flex items-center space-x-1.5 shadow transition"
                        >
                          <Lightbulb className="w-3.5 h-3.5 fill-slate-950" />
                          <span>Convert to Kaizen</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Delete this action item?')) onDeleteActionItem(item.id);
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

      {/* Convert to Kaizen Modal */}
      {convertModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-amber-500 text-slate-950 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 fill-slate-950" />
                <h3 className="text-sm font-black uppercase tracking-tight font-mono">
                  Convert 5S Finding into Kaizen Sheet
                </h3>
              </div>
              <button
                onClick={() => setConvertModalItem(null)}
                className="p-1 rounded-lg text-slate-800 hover:text-slate-950"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmKaizenConversion} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 text-xs">
                This will automatically create a formal Continuous Improvement (Kaizen) proposal in the plant register, bridging 5S workplace findings with tangible cost and safety rewards.
              </p>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                  Kaizen Title
                </label>
                <input
                  type="text"
                  required
                  value={kaizenTitle}
                  onChange={(e) => setKaizenTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                  Shopfloor Area
                </label>
                <input
                  type="text"
                  required
                  value={kaizenArea}
                  onChange={(e) => setKaizenArea(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                  Estimated Cost / Downtime Savings (₹ INR)
                </label>
                <input
                  type="number"
                  value={costSaveEst}
                  onChange={(e) => setCostSaveEst(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setConvertModalItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black uppercase tracking-wider font-mono shadow-md shadow-amber-500/30"
                >
                  Generate Kaizen Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add Action Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckSquare className="w-5 h-5 text-white" />
                <h3 className="text-sm font-black uppercase tracking-tight font-mono">
                  Log 5S Corrective Action (CAPA)
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-blue-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                    5S Pillar
                  </label>
                  <select
                    value={pillar}
                    onChange={(e) => setPillar(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1S">1S - Sort (Seiri)</option>
                    <option value="2S">2S - Set In Order (Seiton)</option>
                    <option value="3S">3S - Shine (Seiso)</option>
                    <option value="4S">4S - Standardize (Seiketsu)</option>
                    <option value="5S">5S - Sustain (Shitsuke)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Critical">Critical (Immediate Hazard / Non-compliance)</option>
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                  Non-Conformity / Finding Description *
                </label>
                <textarea
                  required
                  rows={2}
                  value={findingDescription}
                  onChange={(e) => setFindingDescription(e.target.value)}
                  placeholder="Describe exact physical gap observed on shop floor..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                  Root Cause
                </label>
                <input
                  type="text"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="Why did this abnormality occur? (Lack of standard, missing shadow board, leak)"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                  Planned Corrective Action
                </label>
                <textarea
                  rows={2}
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  placeholder="Exact permanent countermeasure to standardize..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                    Shopfloor Area
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                    Assigned Owner
                  </label>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider font-mono shadow-md shadow-blue-600/30"
                >
                  Save CAPA Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
