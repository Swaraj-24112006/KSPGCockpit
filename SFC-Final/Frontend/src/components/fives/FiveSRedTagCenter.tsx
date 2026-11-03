import React, { useState } from 'react';
import { Tag, Plus, Search, Filter, AlertTriangle, CheckCircle, Clock, ArrowRight, Printer, X, Trash2, DollarSign } from 'lucide-react';
import { FiveSRedTag } from '../../types';
import { formatIndianRupees } from '../../utils';

interface FiveSRedTagCenterProps {
  redTags: FiveSRedTag[];
  onAddRedTag: (tag: Partial<FiveSRedTag>) => void;
  onUpdateRedTag: (id: string, tag: Partial<FiveSRedTag>) => void;
  onDeleteRedTag: (id: string) => void;
}

export default function FiveSRedTagCenter({
  redTags,
  onAddRedTag,
  onUpdateRedTag,
  onDeleteRedTag
}: FiveSRedTagCenterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTagForPrint, setSelectedTagForPrint] = useState<FiveSRedTag | null>(null);

  // Form state
  const [itemDescription, setItemDescription] = useState('');
  const [category, setCategory] = useState<FiveSRedTag['category']>('Tool / Jig / Fixture');
  const [quantity, setQuantity] = useState('1 unit');
  const [areaFound, setAreaFound] = useState('Assembly Line A (Pune)');
  const [taggedBy, setTaggedBy] = useState('Amit Mehta (Kaizen Lead)');
  const [reason, setReason] = useState<FiveSRedTag['reason']>('Surplus / Excess Stock');
  const [estimatedValueInr, setEstimatedValueInr] = useState('25000');
  const [actionRecommended, setActionRecommended] = useState<FiveSRedTag['actionRecommended']>('Relocate to Red Tag Area');
  const [dispositionDeadline, setDispositionDeadline] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );

  // Calculate days aged in holding
  const getDaysAged = (dateTagged: string) => {
    const diffMs = Date.now() - new Date(dateTagged).getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };

  // Metrics
  const totalTags = redTags.length;
  const inHoldingCount = redTags.filter((t) => t.status === 'In Holding Area' || t.status === 'Tagged').length;
  const overdueCount = redTags.filter((t) => (t.status === 'In Holding Area' || t.status === 'Tagged') && getDaysAged(t.dateTagged) > 15).length;
  const totalIdleValue = redTags.reduce((acc, t) => acc + (t.estimatedValueInr || 0), 0);
  const disposedCount = redTags.filter((t) => t.status === 'Disposed / Closed').length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemDescription.trim()) {
      alert('Please enter item description');
      return;
    }

    onAddRedTag({
      itemDescription,
      category,
      quantity,
      areaFound,
      taggedBy,
      reason,
      estimatedValueInr: Number(estimatedValueInr) || 0,
      actionRecommended,
      dispositionDeadline,
      status: 'Tagged',
      dateTagged: new Date().toISOString().split('T')[0]
    });

    setShowAddModal(false);
    setItemDescription('');
    setQuantity('1 unit');
  };

  const handleStatusChange = (tag: FiveSRedTag, newStatus: FiveSRedTag['status']) => {
    onUpdateRedTag(tag.id, {
      status: newStatus,
      disposedDate: newStatus === 'Disposed / Closed' ? new Date().toISOString().split('T')[0] : tag.disposedDate,
      dispositionApprovedBy: newStatus === 'Approved for Disposal' || newStatus === 'Disposed / Closed' ? 'Area Supervisor' : tag.dispositionApprovedBy
    });
  };

  // Filtered red tags
  const filteredTags = redTags.filter((t) => {
    const matchesSearch =
      t.tagNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.areaFound.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <span className="block text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">
            TOTAL RED TAGGED
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-slate-800 font-mono">{totalTags}</span>
            <span className="text-xs text-slate-400">items</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <span className="block text-[10px] font-black uppercase text-amber-600 font-mono tracking-wider">
            IN HOLDING AREA
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-amber-600 font-mono">{inHoldingCount}</span>
            <span className="text-xs text-slate-400">awaiting disposition</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${
          overdueCount > 0 ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'
        }`}>
          <span className="block text-[10px] font-black uppercase text-rose-600 font-mono tracking-wider">
            AGED &gt; 15 DAYS (URGENT)
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-rose-700 font-mono">{overdueCount}</span>
            <span className="text-xs text-rose-500 font-semibold">holding limit breach</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <span className="block text-[10px] font-black uppercase text-blue-600 font-mono tracking-wider">
            EST. IDLE VALUE
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-xl font-black text-blue-700 font-mono">{formatIndianRupees(totalIdleValue)}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <span className="block text-[10px] font-black uppercase text-emerald-600 font-mono tracking-wider">
            DISPOSED / SCRAPPED
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-emerald-600 font-mono">{disposedCount}</span>
            <span className="text-xs text-emerald-500 font-bold">100% cleared</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
              🔴 1S Seiri - Red Tag Holding Area &amp; Disposition Register
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly govern idle tools, obsolete jigs, unneeded inventory, and quarantined materials. Maximum 15 days in holding.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider font-mono flex items-center space-x-2 shadow-lg shadow-rose-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Issue New Red Tag</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Tag #, description, area..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-mono text-[10px] uppercase font-bold">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="Tool / Jig / Fixture">Tool / Jig / Fixture</option>
              <option value="Raw Material">Raw Material</option>
              <option value="WIP">WIP</option>
              <option value="Machine Spare">Machine Spare</option>
              <option value="Defective Part">Defective Part</option>
              <option value="Packaging / Pallet">Packaging / Pallet</option>
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
              <option value="Tagged">Tagged</option>
              <option value="In Holding Area">In Holding Area</option>
              <option value="Approved for Disposal">Approved for Disposal</option>
              <option value="Disposed / Closed">Disposed / Closed</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Red Tag #</th>
                <th className="py-3 px-4">Item &amp; Category</th>
                <th className="py-3 px-4">Location Found</th>
                <th className="py-3 px-4">Reason &amp; Est. Value</th>
                <th className="py-3 px-4 text-center">Holding Aging</th>
                <th className="py-3 px-4">Recommended Action</th>
                <th className="py-3 px-4">Status &amp; Workflow</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredTags.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-mono">
                    No Red Tag items match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredTags.map((tag) => {
                  const daysAged = getDaysAged(tag.dateTagged);
                  const isClosed = tag.status === 'Disposed / Closed';
                  const isAgingCritical = !isClosed && daysAged > 15;
                  const isAgingWarning = !isClosed && daysAged > 7 && daysAged <= 15;

                  return (
                    <tr key={tag.id} className="hover:bg-slate-50/80 transition">
                      {/* Tag # & Date */}
                      <td className="py-3 px-4 font-mono">
                        <span className="font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md text-[11px] block w-fit">
                          {tag.tagNo}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          📅 {tag.dateTagged}
                        </span>
                      </td>

                      {/* Description & Category */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800 text-xs">{tag.itemDescription}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {tag.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-semibold">
                            Qty: {tag.quantity}
                          </span>
                        </div>
                      </td>

                      {/* Location Found */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700 text-xs block">{tag.areaFound}</span>
                        <span className="text-[10px] text-slate-400 font-mono">By: {tag.taggedBy}</span>
                      </td>

                      {/* Reason & Value */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block text-xs">{tag.reason}</span>
                        <span className="text-[11px] font-mono font-black text-blue-600">
                          {formatIndianRupees(tag.estimatedValueInr || 0)}
                        </span>
                      </td>

                      {/* Holding Aging */}
                      <td className="py-3 px-4 text-center">
                        {isClosed ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-slate-100 text-slate-500">
                            Disposed
                          </span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black font-mono inline-flex items-center gap-1 ${
                            isAgingCritical
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                              : isAgingWarning
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}>
                            <Clock className="w-3 h-3" />
                            {daysAged} Days
                          </span>
                        )}
                        <span className="block text-[9px] text-slate-400 font-mono mt-1">
                          Due: {tag.dispositionDeadline}
                        </span>
                      </td>

                      {/* Action Recommended */}
                      <td className="py-3 px-4">
                        <span className="font-black text-xs text-slate-800 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/80 block w-fit">
                          {tag.actionRecommended}
                        </span>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3 px-4">
                        <select
                          value={tag.status}
                          onChange={(e) => handleStatusChange(tag, e.target.value as any)}
                          className={`text-xs font-black font-mono px-2.5 py-1.5 rounded-xl border focus:outline-none ${
                            tag.status === 'Disposed / Closed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : tag.status === 'Approved for Disposal'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : tag.status === 'In Holding Area'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          <option value="Tagged">Tagged</option>
                          <option value="In Holding Area">In Holding Area</option>
                          <option value="Approved for Disposal">Approved for Disposal</option>
                          <option value="Disposed / Closed">Disposed / Closed</option>
                        </select>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right space-x-1 font-mono">
                        <button
                          onClick={() => setSelectedTagForPrint(tag)}
                          title="View / Print Physical Red Tag"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete Red Tag ${tag.tagNo}?`)) {
                              onDeleteRedTag(tag.id);
                            }
                          }}
                          title="Delete Tag"
                          className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Issue Red Tag Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Tag className="w-5 h-5 text-white" />
                <h3 className="text-sm font-black uppercase tracking-tight font-mono">
                  Issue Official 5S Red Tag (Seiri)
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-rose-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                  Item Description *
                </label>
                <input
                  type="text"
                  required
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="e.g. Obsolete Euro-4 Engine Mounting Bracket Welding Jig"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="Tool / Jig / Fixture">Tool / Jig / Fixture</option>
                    <option value="Raw Material">Raw Material</option>
                    <option value="WIP">WIP</option>
                    <option value="Machine Spare">Machine Spare</option>
                    <option value="Defective Part">Defective Part</option>
                    <option value="Packaging / Pallet">Packaging / Pallet</option>
                    <option value="Documentation / Furniture">Documentation / Furniture</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                    Quantity
                  </label>
                  <input
                    type="text"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 4 pcs, 1 set, 50 kg"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                    Area Found / Location
                  </label>
                  <input
                    type="text"
                    value={areaFound}
                    onChange={(e) => setAreaFound(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                    Tagged By (Inspector / Auditor)
                  </label>
                  <input
                    type="text"
                    value={taggedBy}
                    onChange={(e) => setTaggedBy(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                    Reason for Tagging
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="Defective / Damaged">Defective / Damaged</option>
                    <option value="Obsolete / Expired">Obsolete / Expired</option>
                    <option value="Surplus / Excess Stock">Surplus / Excess Stock</option>
                    <option value="Unidentified">Unidentified</option>
                    <option value="No longer in use">No longer in use</option>
                    <option value="Scrap">Scrap</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                    Estimated Value (INR ₹)
                  </label>
                  <input
                    type="number"
                    value={estimatedValueInr}
                    onChange={(e) => setEstimatedValueInr(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                    Action Recommended
                  </label>
                  <select
                    value={actionRecommended}
                    onChange={(e) => setActionRecommended(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="Scrap">Scrap</option>
                    <option value="Return to Supplier">Return to Supplier</option>
                    <option value="Relocate to Red Tag Area">Relocate to Red Tag Area</option>
                    <option value="Transfer to other Dept">Transfer to other Dept</option>
                    <option value="Sell / Salvage">Sell / Salvage</option>
                    <option value="Repair / Re-machine">Repair / Re-machine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                    Disposition Deadline (Max 15d)
                  </label>
                  <input
                    type="date"
                    value={dispositionDeadline}
                    onChange={(e) => setDispositionDeadline(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider font-mono shadow-md shadow-rose-600/30"
                >
                  Register Red Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Physical Red Tag Ticket Preview Modal */}
      {selectedTagForPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="px-6 py-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                Physical Shopfloor Tag Card
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold font-mono flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ticket</span>
                </button>
                <button
                  onClick={() => setSelectedTagForPrint(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* The Authentic Physical Tag Card View */}
            <div className="p-6 bg-slate-100 flex justify-center">
              <div className="w-80 bg-red-600 border-4 border-red-800 rounded-2xl shadow-xl text-white overflow-hidden relative">
                {/* Tie Hole Punch */}
                <div className="w-5 h-5 rounded-full bg-slate-100 border-2 border-red-900 mx-auto mt-3 shadow-inner"></div>

                {/* Warning Hazard Diagonal Stripes */}
                <div className="bg-amber-400 text-slate-950 font-black text-center text-xs py-1 tracking-widest uppercase font-mono mt-2 border-y-2 border-slate-950">
                  ⚠ 5S RED TAG · SEIRI HOLDING ⚠
                </div>

                <div className="p-4 space-y-3 bg-red-600 text-xs font-sans">
                  <div className="flex justify-between items-center border-b border-red-400 pb-2">
                    <span className="text-[10px] font-mono uppercase font-black tracking-wider text-red-200">
                      TAG NO.
                    </span>
                    <span className="text-sm font-black font-mono bg-white text-red-700 px-2 py-0.5 rounded shadow">
                      {selectedTagForPrint.tagNo}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase font-mono text-red-200 font-bold block">
                      ITEM DESCRIPTION:
                    </span>
                    <p className="font-bold text-white text-xs bg-red-700/60 p-2 rounded border border-red-500">
                      {selectedTagForPrint.itemDescription}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="bg-red-700/40 p-1.5 rounded">
                      <span className="text-red-200 block">CATEGORY:</span>
                      <span className="font-bold">{selectedTagForPrint.category}</span>
                    </div>
                    <div className="bg-red-700/40 p-1.5 rounded">
                      <span className="text-red-200 block">QTY:</span>
                      <span className="font-bold">{selectedTagForPrint.quantity}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="bg-red-700/40 p-1.5 rounded">
                      <span className="text-red-200 block">FOUND AT:</span>
                      <span className="font-bold truncate">{selectedTagForPrint.areaFound}</span>
                    </div>
                    <div className="bg-red-700/40 p-1.5 rounded">
                      <span className="text-red-200 block">DATE TAGGED:</span>
                      <span className="font-bold">{selectedTagForPrint.dateTagged}</span>
                    </div>
                  </div>

                  <div className="bg-red-700/40 p-2 rounded text-[10px] font-mono">
                    <span className="text-red-200 block">REASON:</span>
                    <span className="font-bold">{selectedTagForPrint.reason}</span>
                  </div>

                  <div className="bg-white text-slate-900 p-2.5 rounded-xl border border-red-300 space-y-1">
                    <span className="text-[9px] uppercase font-mono text-slate-500 font-black block">
                      DISPOSITION DIRECTIVE:
                    </span>
                    <span className="text-xs font-black text-red-700 uppercase block font-mono">
                      {selectedTagForPrint.actionRecommended}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono block">
                      Deadline: {selectedTagForPrint.dispositionDeadline}
                    </span>
                  </div>

                  {/* Stamp */}
                  <div className="text-center pt-2">
                    <span className="inline-block border-2 border-dashed border-red-200 px-3 py-1 rounded text-[9px] uppercase font-mono font-bold tracking-widest text-red-100">
                      LEAN SHOPFLOOR VALIDATED
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
