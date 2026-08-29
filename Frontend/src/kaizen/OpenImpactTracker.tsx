import React, { useState } from 'react';
import { OpenImpactAction, Kaizen } from '../types';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  UserCheck, 
  Calendar, 
  Edit3, 
  Check, 
  X, 
  Building2, 
  Layers,
  ArrowUpRight,
  TrendingUp,
  FileCheck,
  ShieldCheck
} from 'lucide-react';

interface OpenImpactTrackerProps {
  impactActions: OpenImpactAction[];
  kaizens: Kaizen[];
  onAddImpactAction: (action: Partial<OpenImpactAction>) => void;
  onUpdateImpactAction: (id: string, updates: Partial<OpenImpactAction>) => void;
  onDeleteImpactAction?: (id: string) => void;
}

export default function OpenImpactTracker({
  impactActions,
  kaizens,
  onAddImpactAction,
  onUpdateImpactAction,
  onDeleteImpactAction
}: OpenImpactTrackerProps) {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Modals & Inline Edit State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<OpenImpactAction | null>(null);

  // New Impact Point Form State
  const [selectedKaizenSrNo, setSelectedKaizenSrNo] = useState<string>('');
  const [newTitle, setNewTitle] = useState('');
  const [newDept, setNewDept] = useState('MF1');
  const [newCategory, setNewCategory] = useState<OpenImpactAction['category']>('Method');
  const [newDescription, setNewDescription] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newTargetDate, setNewTargetDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit Action Closure State
  const [closureActionTaken, setClosureActionTaken] = useState('');
  const [closureStatus, setClosureStatus] = useState<OpenImpactAction['status']>('In Progress');
  const [closureVerifiedBy, setClosureVerifiedBy] = useState('');

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Filtered List
  const filteredActions = impactActions.filter(action => {
    if (statusFilter !== 'All' && action.status !== statusFilter) return false;
    if (deptFilter !== 'All' && action.department !== deptFilter) return false;
    if (categoryFilter !== 'All' && action.category !== categoryFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSr = action.kaizenSrNo.toLowerCase().includes(q);
      const matchTitle = action.kaizenTitle.toLowerCase().includes(q);
      const matchDesc = action.impactDescription.toLowerCase().includes(q);
      const matchOwner = action.assignedOwner.toLowerCase().includes(q);
      const matchAction = (action.actionTaken || '').toLowerCase().includes(q);
      return matchSr || matchTitle || matchDesc || matchOwner || matchAction;
    }

    return true;
  });

  // Calculate Summary Counts
  const totalCount = impactActions.length;
  const openCount = impactActions.filter(a => a.status === 'Open').length;
  const inProgressCount = impactActions.filter(a => a.status === 'In Progress').length;
  const closedCount = impactActions.filter(a => a.status === 'Closed').length;

  // Handle Create Action
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) {
      showToast('Please enter an impact description');
      return;
    }

    // Auto-fill title if kaizen selected
    let refTitle = newTitle.trim();
    if (selectedKaizenSrNo) {
      const foundK = kaizens.find(k => k.srNo === selectedKaizenSrNo);
      if (foundK && !refTitle) refTitle = foundK.title;
    }
    if (!refTitle) refTitle = 'Shopfloor Continuous Improvement Action';

    onAddImpactAction({
      kaizenSrNo: selectedKaizenSrNo || 'KZ-GEN',
      kaizenTitle: refTitle,
      department: newDept,
      category: newCategory,
      impactDescription: newDescription.trim(),
      assignedOwner: newOwner.trim() || 'Unassigned',
      targetDate: newTargetDate,
      status: 'Open',
      actionTaken: '',
      closedDate: '',
      verifiedBy: ''
    });

    // Reset Form
    setSelectedKaizenSrNo('');
    setNewTitle('');
    setNewDescription('');
    setNewOwner('');
    setShowAddModal(false);
    showToast('New Open Impact Action created successfully!');
  };

  // Open Edit Modal
  const startEdit = (item: OpenImpactAction) => {
    setEditItem(item);
    setClosureActionTaken(item.actionTaken || '');
    setClosureStatus(item.status);
    setClosureVerifiedBy(item.verifiedBy || '');
  };

  // Save Edit Action Closure
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    const isNowClosed = closureStatus === 'Closed';
    const updatedDate = isNowClosed ? (editItem.closedDate || new Date().toISOString().split('T')[0]) : '';

    onUpdateImpactAction(editItem.id, {
      status: closureStatus,
      actionTaken: closureActionTaken.trim(),
      verifiedBy: closureVerifiedBy.trim(),
      closedDate: updatedDate
    });

    setEditItem(null);
    showToast(`Impact action [${editItem.kaizenSrNo}] updated! Status: ${closureStatus}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-emerald-400 border border-emerald-500/50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold font-mono animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="bg-slate-950 text-white border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-500/15 text-indigo-400 rounded-2xl border border-indigo-500/20">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-black uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                ACTION CLOSURE TRACKER
              </span>
            </div>
            <h1 className="text-xl font-black font-display text-white mt-0.5">
              Open Impact Points & Action Closures
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Track, assign, and verify 5M (Man, Machine, Material, Method, Measurement), Safety & Horizontal Deployment impact items derived from Kaizens.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black font-mono text-xs rounded-2xl shadow-lg transition flex items-center space-x-2 cursor-pointer shrink-0 border border-emerald-300"
        >
          <Plus className="w-4 h-4 stroke-[3px]" />
          <span>LOG NEW OPEN IMPACT ITEM</span>
        </button>
      </div>

      {/* SUMMARY STATS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">TOTAL IMPACT POINTS</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">{totalCount}</span>
          </div>
          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-amber-600 block">OPEN ACTION ITEMS</span>
            <span className="text-2xl font-black text-amber-600 font-mono mt-0.5 block">{openCount}</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-blue-600 block">IN PROGRESS</span>
            <span className="text-2xl font-black text-blue-600 font-mono mt-0.5 block">{inProgressCount}</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-600 block">VERIFIED CLOSED</span>
            <span className="text-2xl font-black text-emerald-600 font-mono mt-0.5 block">{closedCount}</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3 text-xs font-mono">
        
        {/* Search Input */}
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by SR No, Title, Owner, Impact Description..."
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl pl-9 pr-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Status Filter */}
        <div className="md:col-span-2 flex items-center space-x-1.5">
          <span className="text-slate-500 font-bold shrink-0">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold py-2 px-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open Only</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed / Verified</option>
          </select>
        </div>

        {/* Department Filter */}
        <div className="md:col-span-2 flex items-center space-x-1.5">
          <span className="text-slate-500 font-bold shrink-0">Dept:</span>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold py-2 px-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="All">All Depts</option>
            <option value="MF1">MF1</option>
            <option value="MF2">MF2</option>
            <option value="MF3">MF3</option>
            <option value="Machining">Machining</option>
            <option value="Quality">Quality</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>

        {/* 5M Category Filter */}
        <div className="md:col-span-3 flex items-center space-x-1.5">
          <span className="text-slate-500 font-bold shrink-0">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold py-2 px-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="All">All Categories</option>
            <option value="Man">Man</option>
            <option value="Machine">Machine</option>
            <option value="Material">Material</option>
            <option value="Method">Method</option>
            <option value="Measurement">Measurement</option>
            <option value="Safety">Safety</option>
            <option value="Horizontal Deployment">Horizontal Deployment</option>
          </select>
        </div>

      </div>

      {/* TABLE FORMAT FOR OPEN IMPACT POINTS & CLOSURE */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-900 text-white font-mono text-[11px] uppercase border-b border-slate-800">
                <th className="p-3.5 border-r border-slate-800 w-[130px]">Kaizen SR No</th>
                <th className="p-3.5 border-r border-slate-800 w-[110px]">Department</th>
                <th className="p-3.5 border-r border-slate-800 w-[130px]">Impact Category</th>
                <th className="p-3.5 border-r border-slate-800 w-[280px]">Open Impact Point / Action Item</th>
                <th className="p-3.5 border-r border-slate-800 w-[160px]">Assigned Owner & Target</th>
                <th className="p-3.5 border-r border-slate-800 w-[110px] text-center">Status</th>
                <th className="p-3.5 border-r border-slate-800">Action Taken & Verification Notes</th>
                <th className="p-3.5 w-[100px] text-center bg-slate-950">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans text-slate-800">
              {filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 font-medium">
                    No impact points match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredActions.map((action) => {
                  const isClosed = action.status === 'Closed';
                  const isInProgress = action.status === 'In Progress';

                  return (
                    <tr key={action.id} className="hover:bg-slate-50 transition-colors">
                      
                      {/* Kaizen Ref SR No */}
                      <td className="p-3.5 border-r border-slate-200 font-mono">
                        <span className="font-bold text-slate-900 block">{action.kaizenSrNo}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 line-clamp-1">{action.kaizenTitle}</span>
                      </td>

                      {/* Department */}
                      <td className="p-3.5 border-r border-slate-200 font-mono">
                        <span className="inline-block px-2 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-[10px] font-black">
                          {action.department}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="p-3.5 border-r border-slate-200 font-mono">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                          action.category === 'Safety'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : action.category === 'Horizontal Deployment'
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {action.category}
                        </span>
                      </td>

                      {/* Open Impact Point Description */}
                      <td className="p-3.5 border-r border-slate-200 text-slate-800 font-medium leading-snug">
                        {action.impactDescription}
                      </td>

                      {/* Owner & Target Date */}
                      <td className="p-3.5 border-r border-slate-200 font-mono text-[11px]">
                        <div className="font-bold text-slate-900">{action.assignedOwner}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Target: {action.targetDate}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5 border-r border-slate-200 text-center font-mono">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isClosed
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isInProgress
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {action.status}
                        </span>
                      </td>

                      {/* Action Taken & Verification Notes */}
                      <td className="p-3.5 border-r border-slate-200 text-xs">
                        {action.actionTaken ? (
                          <div className="space-y-1">
                            <p className="text-slate-800 font-medium leading-relaxed">{action.actionTaken}</p>
                            {action.verifiedBy && (
                              <span className="inline-block text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                                Verified by: {action.verifiedBy} ({action.closedDate || 'Closed'})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px] font-mono">Pending action closure details...</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="p-3.5 text-center font-mono">
                        <button
                          type="button"
                          onClick={() => startEdit(action)}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold transition flex items-center space-x-1 mx-auto cursor-pointer shadow-2xs"
                        >
                          <Edit3 className="w-3 h-3 text-amber-400" />
                          <span>Closure</span>
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* CREATE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-mono text-xs font-bold text-white uppercase">
                  Log New Open Impact Action Item
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 font-sans text-xs">
              
              {/* Select Kaizen or Custom SR */}
              <div>
                <label className="block text-[11px] font-bold font-mono text-slate-700 uppercase mb-1">
                  Link to Kaizen Sheet (Optional):
                </label>
                <select
                  value={selectedKaizenSrNo}
                  onChange={(e) => {
                    setSelectedKaizenSrNo(e.target.value);
                    const k = kaizens.find(item => item.srNo === e.target.value);
                    if (k) {
                      setNewTitle(k.title);
                      setNewDept(k.minifactory || 'MF1');
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2 px-3 rounded-xl font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">-- Standalone Shopfloor Action --</option>
                  {kaizens.map(k => (
                    <option key={k.id} value={k.srNo}>
                      [{k.srNo}] {k.title} ({k.minifactory})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title if not linked */}
              <div>
                <label className="block text-[11px] font-bold font-mono text-slate-700 uppercase mb-1">
                  Action Ref / Title:
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Standardize O-ring torque fitting SOP"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2 px-3 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Department & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold font-mono text-slate-700 uppercase mb-1">
                    Department:
                  </label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2 px-3 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="MF1">MF1 (Vacuum Pump)</option>
                    <option value="MF2">MF2 (EGR Line)</option>
                    <option value="MF3">MF3 (BPV Sensors)</option>
                    <option value="Machining">Machining Shop</option>
                    <option value="Quality">Quality Assurance</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold font-mono text-slate-700 uppercase mb-1">
                    5M Impact Category:
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2 px-3 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Man">Man</option>
                    <option value="Machine">Machine</option>
                    <option value="Material">Material</option>
                    <option value="Method">Method</option>
                    <option value="Measurement">Measurement</option>
                    <option value="Safety">Safety</option>
                    <option value="Horizontal Deployment">Horizontal Deployment</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold font-mono text-slate-700 uppercase mb-1">
                  Open Impact Point / Action Required: *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the action item required for 5M impact or horizontal deployment..."
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2 px-3 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Owner & Target Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold font-mono text-slate-700 uppercase mb-1">
                    Assigned Owner:
                  </label>
                  <input
                    type="text"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    placeholder="e.g. Rahul Sharma (ITI Operator)"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2 px-3 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold font-mono text-slate-700 uppercase mb-1">
                    Target Date:
                  </label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2 px-3 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Save Action Item
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* EDIT / CLOSURE MODAL */}
      {editItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-amber-400 font-bold block">
                  REF: {editItem.kaizenSrNo} • {editItem.department}
                </span>
                <h3 className="font-mono text-xs font-bold text-white uppercase mt-0.5">
                  Update Action Taken & Closure Verification
                </h3>
              </div>
              <button onClick={() => setEditItem(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 font-sans text-xs">
              
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Impact Description:</span>
                <p className="font-bold text-slate-900">{editItem.impactDescription}</p>
                <div className="text-[11px] font-mono text-slate-500 pt-1">
                  Assigned Owner: <strong className="text-slate-800">{editItem.assignedOwner}</strong> | Target: <strong className="text-slate-800">{editItem.targetDate}</strong>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-[11px] font-bold font-mono text-slate-700 uppercase mb-1">
                  Update Closure Status:
                </label>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  {(['Open', 'In Progress', 'Closed'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setClosureStatus(st)}
                      className={`py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                        closureStatus === st
                          ? 'bg-slate-900 text-amber-400 border-slate-800 shadow-sm'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Taken */}
              <div>
                <label className="block text-[11px] font-bold font-mono text-slate-700 uppercase mb-1">
                  Action Taken & Implementation Details:
                </label>
                <textarea
                  rows={3}
                  value={closureActionTaken}
                  onChange={(e) => setClosureActionTaken(e.target.value)}
                  placeholder="Describe exact physical/documentation actions completed to close this impact item..."
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2 px-3 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Verified By */}
              <div>
                <label className="block text-[11px] font-bold font-mono text-slate-700 uppercase mb-1">
                  Verified By (Auditor / Supervisor):
                </label>
                <input
                  type="text"
                  value={closureVerifiedBy}
                  onChange={(e) => setClosureVerifiedBy(e.target.value)}
                  placeholder="e.g. Amit Mehta (Kaizen Lead)"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 py-2 px-3 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Save Closure Details
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
