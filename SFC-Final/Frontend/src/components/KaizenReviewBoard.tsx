import React, { useState, useEffect } from 'react';
import { Kaizen } from '../types';
import { CheckCircle2, AlertCircle, Award, Lightbulb, Save, ShieldAlert, XCircle, FileText, ChevronDown, ChevronRight, ZoomIn, X, Maximize2, PanelLeftClose, PanelLeftOpen, Columns, Compass, ShieldCheck, Users, Settings, Flame, Search, Filter, Eye, UserCheck, LayoutList, FileSpreadsheet, ArrowUpDown, Calendar, Check, Printer, ChevronLeft, Download, Loader2 } from 'lucide-react';
import KaizenPresentationMode from './KaizenPresentationMode';
import KaizenImpactModal from './KaizenImpactModal';
import PhotoZoomModal from './PhotoZoomModal';
import { formatIndianRupees } from '../utils';
import { downloadElementAsPdf, triggerA4Print, triggerA3Print } from '../utils/pdfExporter';

interface KaizenReviewBoardProps {
  kaizens: Kaizen[];
  onUpdateKaizen: (id: string, updatedFields: Partial<Kaizen>) => void;
}

export default function KaizenReviewBoard({ kaizens, onUpdateKaizen }: KaizenReviewBoardProps) {
  // Main view mode: 'table' (default) or 'a3' (document layout)
  const [viewMode, setViewMode] = useState<'table' | 'a3'>('table');

  // Selected kaizen for A3 view or modal inspection
  const [selectedId, setSelectedId] = useState<string>('');
  const [presentingKaizen, setPresentingKaizen] = useState<Kaizen | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterMonth, setFilterMonth] = useState<string>('All');
  const [filterMinifactory, setFilterMinifactory] = useState<string>('All');
  const [filterClassification, setFilterClassification] = useState<string>('All');

  // Sidebar collapse in A3 view
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPendingCollapsed, setIsPendingCollapsed] = useState(false);
  const [isReviewedCollapsed, setIsReviewedCollapsed] = useState(false);

  // Full view photo modal state
  const [fullViewPhoto, setFullViewPhoto] = useState<{
    type: 'before' | 'after';
    url: string;
    title: string;
  } | null>(null);

  // Modals state
  const [impactModalKaizen, setImpactModalKaizen] = useState<Kaizen | null>(null);
  const [impactModalMode, setImpactModalMode] = useState<'review' | 'closure'>('review');

  // Review Audit Modal state
  const [reviewModalKaizen, setReviewModalKaizen] = useState<Kaizen | null>(null);
  const [classification, setClassification] = useState<'Kaizen' | 'Good Point' | 'Pending' | 'None'>('Pending');
  const [status, setStatus] = useState<'Pending' | 'Approved' | 'Good Point' | 'Rejected'>('Pending');
  const [remark, setRemark] = useState('');
  const [costSave, setCostSave] = useState<number>(0);
  const [approvedBy, setApprovedBy] = useState('Rajesh Patil (Supervisor)');
  const [verifiedBy, setVerifiedBy] = useState('Amit Mehta (Kaizen Lead)');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [benefits, setBenefits] = useState({ p: false, q: false, c: false, d: false, s: false, m: false });

  // PDF exporting loader
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  // Download A4 PDF handler
  const handleDownloadPdf = async () => {
    if (!selectedKaizen) return;
    setIsPdfExporting(true);
    await downloadElementAsPdf('a3-paper-document', {
      filename: `Kaizen_A4_Sheet_${selectedKaizen.srNo}.pdf`,
      orientation: 'landscape',
      format: 'a4'
    });
    setIsPdfExporting(false);
  };

  // Currently selected Kaizen for A3 view
  const selectedKaizen = kaizens.find(k => k.id === selectedId) || kaizens[0];

  useEffect(() => {
    if (selectedKaizen) {
      if (!selectedId) setSelectedId(selectedKaizen.id);
    }
  }, [selectedKaizen, selectedId]);

  // Handle ESC key to close photo modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullViewPhoto(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Extract unique months for Month/Year filter dropdown
  const uniqueMonths = Array.from(new Set(kaizens.map(k => {
    if (k.month) return k.month;
    if (k.suggestionDate) {
      const d = new Date(k.suggestionDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('default', { month: 'long', year: 'numeric' });
      }
    }
    return '';
  }).filter(Boolean)));

  // Extract unique minifactories
  const uniqueMinifactories = Array.from(new Set(kaizens.map(k => k.minifactory).filter(Boolean)));

  // Filtered Kaizens calculation
  const filteredKaizens = kaizens.filter(k => {
    // Search
    const matchesSearch = searchQuery === '' ||
      k.srNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.ideaBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.minifactory.toLowerCase().includes(searchQuery.toLowerCase());

    // Status
    const matchesStatus = filterStatus === 'All' || k.status === filterStatus;

    // Month
    const kaizenMonth = k.month || '';
    const kaizenDateStr = k.suggestionDate || '';
    const matchesMonth = filterMonth === 'All' || 
      kaizenMonth.toLowerCase().includes(filterMonth.toLowerCase()) || 
      kaizenDateStr.toLowerCase().includes(filterMonth.toLowerCase());

    // Minifactory
    const matchesMinifactory = filterMinifactory === 'All' || k.minifactory === filterMinifactory;

    // Classification
    const matchesClassification = filterClassification === 'All' || k.classification === filterClassification;

    return matchesSearch && matchesStatus && matchesMonth && matchesMinifactory && matchesClassification;
  });

  // Open Review Audit modal for a specific Kaizen
  const openReviewModal = (k: Kaizen) => {
    setReviewModalKaizen(k);
    setClassification(k.classification || 'Kaizen');
    setStatus(k.status || 'Approved');
    setRemark(k.remark || '');
    setCostSave(k.costSave || 0);
    setApprovedBy(k.approvedBy || 'Rajesh Patil (Supervisor)');
    setVerifiedBy(k.verifiedBy || 'Amit Mehta (Kaizen Lead)');
    setBenefits(k.benefits || { p: false, q: false, c: false, d: false, s: false, m: false });
    setSuccessMessage(null);
  };

  const handleSaveReviewModal = () => {
    if (!reviewModalKaizen) return;
    
    let targetStatus = status;
    if (status === 'Pending' && (classification === 'Kaizen' || classification === 'Good Point')) {
      targetStatus = classification === 'Good Point' ? 'Good Point' : 'Approved';
    }

    onUpdateKaizen(reviewModalKaizen.id, {
      classification,
      status: targetStatus,
      remark,
      costSave,
      approvedBy,
      verifiedBy,
      benefits
    });

    setSuccessMessage(`Decision logged for Kaizen ${reviewModalKaizen.srNo}!`);
    setTimeout(() => {
      setSuccessMessage(null);
      setReviewModalKaizen(null);
    }, 1200);
  };

  if (kaizens.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center text-slate-500 max-w-2xl mx-auto my-12 font-medium">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        No Kaizen reports are available to review. Switch to the Operator tab to log ideas first!
      </div>
    );
  }

  const pendingList = kaizens.filter(k => k.status === 'Pending');
  const approvedList = kaizens.filter(k => k.status === 'Approved' || k.status === 'Good Point');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      
      {/* Intro Header & Banner */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
              CFT Committee Board
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Total Logged: {kaizens.length}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black tracking-wide uppercase font-mono mt-1 text-slate-100 flex items-center space-x-2">
            <span>👥 Kaizen Committee Review & Audit Portal</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Evaluate PQCDSM metrics, audit cost savings (₹), assign Kaizen vs Good Point status, and execute 5M/Safety impact closures.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* View Mode Switcher */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              <span>Tabular Review</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('a3')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'a3'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>A3 Paper View</span>
            </button>
          </div>

          {/* Presentation Mode Button */}
          {selectedKaizen && (
            <button
              type="button"
              onClick={() => setPresentingKaizen(selectedKaizen)}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs font-bold font-mono rounded-xl transition duration-200 flex items-center space-x-1.5 border border-emerald-500 shadow-sm cursor-pointer"
            >
              <Compass className="w-4 h-4 text-emerald-200" />
              <span>PRESENTATION MODE</span>
            </button>
          )}

          <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs font-mono font-bold text-amber-400">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>{pendingList.length} PENDING</span>
          </div>
        </div>
      </div>

      {/* FILTER BAR FOR COMMITTEE REVIEW */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by SR No, Title, Creator name, Location..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            
            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500"
              >
                <option value="All">All Statuses ({kaizens.length})</option>
                <option value="Pending">⏳ Pending ({pendingList.length})</option>
                <option value="Approved">✅ Approved ({approvedList.length})</option>
                <option value="Good Point">💡 Good Point</option>
                <option value="Rejected">❌ Rejected</option>
              </select>
            </div>

            {/* Month & Year Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Month / Date
              </label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500"
              >
                <option value="All">All Months</option>
                {uniqueMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Minifactory Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Minifactory
              </label>
              <select
                value={filterMinifactory}
                onChange={(e) => setFilterMinifactory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500"
              >
                <option value="All">All Minifactories</option>
                {uniqueMinifactories.map(mf => (
                  <option key={mf} value={mf}>{mf}</option>
                ))}
              </select>
            </div>

            {/* Classification Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Classification
              </label>
              <select
                value={filterClassification}
                onChange={(e) => setFilterClassification(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500"
              >
                <option value="All">All Classifications</option>
                <option value="Kaizen">🏆 Kaizen</option>
                <option value="Good Point">💡 Good Point</option>
                <option value="Pending">⏳ Pending</option>
                <option value="None">❌ None / Rejected</option>
              </select>
            </div>

          </div>

        </div>

        {/* Filter Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px] font-mono text-slate-500">
          <div>
            Showing <strong className="text-slate-900">{filteredKaizens.length}</strong> of <strong className="text-slate-900">{kaizens.length}</strong> Kaizens in committee queue
          </div>
          {(searchQuery || filterStatus !== 'All' || filterMonth !== 'All' || filterMinifactory !== 'All' || filterClassification !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('All');
                setFilterMonth('All');
                setFilterMinifactory('All');
                setFilterClassification('All');
              }}
              className="text-amber-600 hover:text-amber-700 font-bold underline cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: TABULAR FORMAT (DEFAULT) */}
      {viewMode === 'table' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[1700px]">
              <thead>
                <tr className="bg-slate-900 text-white font-mono text-[11px] uppercase tracking-wider">
                  <th className="p-3 border-r border-slate-800 w-[230px] bg-amber-500 text-slate-950 font-black text-center sticky left-0 z-10 shadow-xs">
                    ⚡ Committee Review Actions
                  </th>
                  <th className="p-3 border-r border-slate-800 w-[110px]">SR No & Month</th>
                  <th className="p-3 border-r border-slate-800 w-[240px]">Kaizen Title & Initiator</th>
                  <th className="p-3 border-r border-slate-800 w-[180px]">Location & Station</th>
                  <th className="p-3 border-r border-slate-800 w-[260px]">Problem / Before Status</th>
                  <th className="p-3 border-r border-slate-800 w-[260px]">Countermeasure / After</th>
                  <th className="p-3 border-r border-slate-800 w-[130px] text-center">PQCDSM Benefits</th>
                  <th className="p-3 border-r border-slate-800 w-[120px] text-right">Audited Savings</th>
                  <th className="p-3 border-r border-slate-800 w-[120px] text-center">Classification</th>
                  <th className="p-3 border-r border-slate-800 w-[100px] text-center">Status</th>
                  <th className="p-3 border-r border-slate-800 w-[160px] text-center">5M & Process Impact</th>
                  <th className="p-3 w-[150px]">Committee Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans text-slate-700">
                {filteredKaizens.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-400 font-medium">
                      No matching Kaizen entries found for the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredKaizens.map(k => (
                    <tr
                      key={k.id}
                      className={`hover:bg-amber-50/30 transition-colors group ${
                        k.status === 'Pending' ? 'bg-amber-50/10' : ''
                      }`}
                    >
                      {/* Sticky Action Column */}
                      <td className="p-2 border-r border-slate-200 text-center bg-white group-hover:bg-amber-50/40 sticky left-0 z-10 shadow-xs">
                        <div className="flex items-center justify-center space-x-1">
                          
                          {/* 1. Review & Audit Button (Disabled if already reviewed) */}
                          {k.status !== 'Pending' ? (
                            <button
                              type="button"
                              disabled
                              className="px-2.5 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase border border-slate-300 flex items-center space-x-1 cursor-not-allowed opacity-80"
                              title="Committee Review is completed and decision is locked"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Reviewed</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openReviewModal(k)}
                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-black uppercase transition flex items-center space-x-1 cursor-pointer border border-amber-300 shadow-2xs"
                              title="Audit PQCDSM, Cost Savings & Decision"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Review</span>
                            </button>
                          )}

                          {/* 2. 5M Impact Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setImpactModalKaizen(k);
                              setImpactModalMode('review');
                            }}
                            className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer border border-slate-800"
                            title="Evaluate 5M, Safety, PFD & PFMEA Impacts"
                          >
                            <Settings className="w-3 h-3 text-amber-400" />
                            <span>5M Impact</span>
                          </button>

                          {/* 3. Sheet Blowup */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(k.id);
                              setViewMode('a3');
                            }}
                            className="p-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[10px] font-bold transition cursor-pointer border border-indigo-200"
                            title="Open A3 Sheet Replica View"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* 4. Slides */}
                          <button
                            type="button"
                            onClick={() => setPresentingKaizen(k)}
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-bold transition cursor-pointer border border-emerald-200"
                            title="Launch Fullscreen Slides"
                          >
                            <Compass className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>

                      {/* SR No & Month */}
                      <td className="p-3 border-r border-slate-200 font-mono">
                        <span className="font-bold text-slate-900 block">{k.srNo}</span>
                        <span className="text-[10px] text-slate-400 block">{k.month || k.suggestionDate}</span>
                      </td>

                      {/* Title & Initiator */}
                      <td className="p-3 border-r border-slate-200">
                        <span className="font-bold text-slate-900 block line-clamp-2 leading-snug">{k.title}</span>
                        <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">Logged by: {k.ideaBy}</span>
                      </td>

                      {/* Location */}
                      <td className="p-3 border-r border-slate-200 text-[11px]">
                        <span className="font-bold text-slate-800 block">{k.minifactory}</span>
                        <span className="text-slate-500 block">{k.location}</span>
                        <span className="text-slate-400 block text-[10px] font-mono">{k.machine}</span>
                      </td>

                      {/* Before Status */}
                      <td className="p-3 border-r border-slate-200">
                        <p className="line-clamp-2 text-slate-700 text-[11px] leading-snug">{k.problemBefore}</p>
                      </td>

                      {/* Countermeasure / After */}
                      <td className="p-3 border-r border-slate-200">
                        <p className="line-clamp-2 text-slate-700 text-[11px] leading-snug">{k.counterMeasureAfter}</p>
                      </td>

                      {/* PQCDSM Benefits */}
                      <td className="p-3 border-r border-slate-200 text-center font-mono">
                        <div className="grid grid-cols-6 gap-0.5 max-w-[120px] mx-auto">
                          {['p', 'q', 'c', 'd', 's', 'm'].map(key => {
                            const active = k.benefits?.[key as keyof typeof k.benefits];
                            return (
                              <div
                                key={key}
                                className={`text-[9px] font-black rounded py-0.5 uppercase ${
                                  active ? 'bg-slate-900 text-emerald-400' : 'bg-slate-100 text-slate-300'
                                }`}
                              >
                                {key}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Audited Savings */}
                      <td className="p-3 border-r border-slate-200 text-right font-mono font-extrabold text-emerald-600">
                        {formatIndianRupees(k.costSave)}
                      </td>

                      {/* Classification */}
                      <td className="p-3 border-r border-slate-200 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold font-mono uppercase ${
                          k.classification === 'Kaizen'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : k.classification === 'Good Point'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {k.classification || 'Pending'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3 border-r border-slate-200 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold font-mono uppercase ${
                          k.status === 'Approved'
                            ? 'bg-emerald-600 text-white'
                            : k.status === 'Pending'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : k.status === 'Good Point'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-red-600 text-white'
                        }`}>
                          {k.status}
                        </span>
                      </td>

                      {/* 5M & Process Impact */}
                      <td className="p-3 border-r border-slate-200 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setImpactModalKaizen(k);
                            setImpactModalMode('review');
                          }}
                          className={`w-full px-2 py-1 rounded-lg text-[9px] font-mono font-extrabold uppercase transition border flex items-center justify-center space-x-1 cursor-pointer ${
                            k.impactAssessment?.overallClosureStatus === 'Fully Closed'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                              : k.impactAssessment?.overallClosureStatus === 'Actions Allocated'
                              ? 'bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3 text-amber-500" />
                          <span>
                            {k.impactAssessment?.overallClosureStatus === 'Fully Closed'
                              ? '✓ Closed'
                              : k.impactAssessment?.overallClosureStatus || '5M Impact'}
                          </span>
                        </button>
                      </td>

                      {/* Committee Remark */}
                      <td className="p-3 text-slate-500 italic max-w-[150px] truncate">
                        {k.remark || '-'}
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: A3 DOCUMENT PAPER VIEW */}
      {viewMode === 'a3' && selectedKaizen && (
        <div className="space-y-4 animate-fade-in font-sans">
          
          {/* A3 DEDICATED ACTION BAR */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold font-mono transition flex items-center space-x-1.5 cursor-pointer border border-slate-700"
              >
                <ChevronLeft className="w-4 h-4 text-amber-400" />
                <span>Return to Audit Table</span>
              </button>
              <div>
                <span className="text-[10px] font-mono uppercase font-black text-amber-400 tracking-wider block">
                  📄 Pure A3 Paper Output View
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono text-white">
                  [{selectedKaizen.srNo}] {selectedKaizen.title}
                </span>
              </div>
            </div>

            {/* Quick Kaizen Selector & Print Button */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold px-2">Select:</span>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="bg-slate-900 text-slate-100 text-xs font-bold font-mono py-1 px-2.5 rounded-lg border border-slate-700 focus:outline-none"
                >
                  {kaizens.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.srNo} - {k.title.length > 32 ? k.title.substring(0, 32) + '...' : k.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Download A4 PDF Button */}
              <button
                type="button"
                disabled={isPdfExporting}
                onClick={handleDownloadPdf}
                className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 active:scale-95 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center space-x-2 font-mono uppercase tracking-wider cursor-pointer border border-violet-400"
              >
                {isPdfExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating A4 PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-violet-200" />
                    <span>Download A4 PDF</span>
                  </>
                )}
              </button>

              {/* Print A4 Sheet Button */}
              <button
                type="button"
                onClick={() => triggerA4Print('a3-paper-document', `Kaizen A4 Sheet - ${selectedKaizen.srNo}`)}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center space-x-2 font-mono uppercase tracking-wider cursor-pointer border border-amber-300"
              >
                <Printer className="w-4.5 h-4.5" />
                <span>PRINT A4 SHEET</span>
              </button>

              {/* Presentation Mode */}
              <button
                type="button"
                onClick={() => setPresentingKaizen(selectedKaizen)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 font-mono cursor-pointer shadow-xs"
              >
                <Compass className="w-4 h-4 text-emerald-200" />
                <span>Slides</span>
              </button>
            </div>
          </div>

          {/* THE CLEAN A3 DOCUMENT PAPER SHEET */}
          <div 
            id="a3-paper-document" 
            className="bg-white border-2 border-slate-900 rounded-2xl shadow-xl overflow-hidden p-6 max-w-5xl mx-auto space-y-0 text-slate-900 font-sans"
          >
            {/* SHEET TITLE HEADER */}
            <div className="border-b-2 border-slate-900 bg-white p-4 text-center">
              <h1 className="text-2xl font-black tracking-widest text-slate-950 border-b border-slate-200 pb-1 uppercase font-mono">
                KAIZEN SHEET
              </h1>
              <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest font-mono mt-1">
                (CONTINUOUS IMPROVEMENT FORM)
              </p>
            </div>

            {/* SHEET META TABLE GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-b-2 border-slate-900 text-xs font-mono">
              <div className="border-r border-b md:border-b-0 border-slate-900 p-3">
                <span className="text-slate-500 block uppercase font-bold text-[9px]">Created by:</span>
                <span className="font-black text-slate-900 truncate block text-xs">{selectedKaizen.ideaBy}</span>
              </div>
              <div className="border-r border-b md:border-b-0 border-slate-900 p-3">
                <span className="text-slate-500 block uppercase font-bold text-[9px]">Approved by:</span>
                <span className="font-bold text-slate-800 truncate block text-xs">{selectedKaizen.approvedBy || "NOT DECIDED YET"}</span>
              </div>
              <div className="border-r border-slate-900 p-3">
                <span className="text-slate-500 block uppercase font-bold text-[9px]">Document ID:</span>
                <span className="font-black text-slate-950 block text-xs">{selectedKaizen.srNo}</span>
              </div>
              <div className="p-3 bg-slate-50">
                <span className="text-slate-500 block uppercase font-bold text-[9px]">Version - Status:</span>
                <span className={`font-black block uppercase text-xs ${selectedKaizen.status === 'Pending' ? 'text-amber-600' : 'text-emerald-700'}`}>
                  V1.0 - {selectedKaizen.status}
                </span>
              </div>
            </div>

            {/* TITLE BAR */}
            <div className="p-4 bg-slate-100 border-b-2 border-slate-900">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Kaizen Theme Title:</span>
              <h2 className="text-base font-black text-slate-900 font-mono mt-0.5">{selectedKaizen.title}</h2>
            </div>

            {/* CENTRAL DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-12 border-b-2 border-slate-900">
              <div className="md:col-span-5 border-r-2 border-slate-900 p-4 space-y-2">
                <h3 className="text-xs font-black text-red-900 border-b border-red-200 pb-1 uppercase font-mono">
                  Problem / Before Status :
                </h3>
                <p className="text-xs text-slate-800 leading-relaxed min-h-28 font-medium whitespace-pre-line bg-red-50/40 p-3 rounded-lg border border-red-100">
                  {selectedKaizen.problemBefore}
                </p>
              </div>

              <div className="md:col-span-4 border-r-2 border-slate-900 p-4 space-y-2 bg-emerald-50/20">
                <h3 className="text-xs font-black text-emerald-900 border-b border-emerald-200 pb-1 uppercase font-mono">
                  Counter Measure / After Improvement :
                </h3>
                <p className="text-xs text-slate-800 leading-relaxed min-h-28 font-medium whitespace-pre-line bg-emerald-50/60 p-3 rounded-lg border border-emerald-100">
                  {selectedKaizen.counterMeasureAfter}
                </p>
              </div>

              <div className="md:col-span-3 p-3 bg-slate-50 text-[10px] space-y-2.5 font-mono">
                <h4 className="font-bold border-b border-slate-300 pb-1 text-[11px] text-slate-700 uppercase">
                  Area of Implementation:
                </h4>
                <div>
                  <span className="text-slate-400 uppercase font-bold block text-[9px]">Minifactory:</span>
                  <span className="text-slate-900 font-bold text-xs">{selectedKaizen.minifactory}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold block text-[9px]">Location:</span>
                  <span className="text-slate-800 font-bold">{selectedKaizen.location}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold block text-[9px]">Machine / Station:</span>
                  <span className="text-slate-800 font-bold">{selectedKaizen.machine}</span>
                </div>
              </div>
            </div>

            {/* PHOTOS */}
            <div className="grid grid-cols-1 md:grid-cols-12 border-b-2 border-slate-900">
              
              {/* Photo Before */}
              <div className="md:col-span-5 border-r-2 border-slate-900 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black text-red-800 uppercase font-mono">📷 PHOTO : BEFORE IMPROVEMENT</h4>
                  <span className="text-[9px] text-indigo-600 font-mono font-bold">🔍 Click photo to Zoom</span>
                </div>
                <div
                  onClick={() => setFullViewPhoto({
                    type: 'before',
                    url: selectedKaizen.photoBefore,
                    title: `BEFORE IMPROVEMENT: ${selectedKaizen.title}`
                  })}
                  className="bg-slate-50 rounded-xl aspect-video flex items-center justify-center p-1.5 border border-slate-300 overflow-hidden cursor-pointer group relative hover:border-indigo-500 transition shadow-inner"
                >
                  {selectedKaizen.photoBefore ? (
                    <>
                      <img
                        src={selectedKaizen.photoBefore}
                        alt="Before"
                        className="max-h-full max-w-full object-contain rounded-lg group-hover:scale-102 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-mono text-xs font-bold space-x-1">
                        <ZoomIn className="w-4 h-4" />
                        <span>Enlarge & Zoom Photo</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-slate-400 text-xs italic font-mono">No photo before recorded</span>
                  )}
                </div>
              </div>

              {/* Photo After */}
              <div className="md:col-span-4 border-r-2 border-slate-900 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black text-emerald-800 uppercase font-mono">📷 PHOTO : AFTER IMPROVEMENT</h4>
                  <span className="text-[9px] text-indigo-600 font-mono font-bold">🔍 Click photo to Zoom</span>
                </div>
                <div
                  onClick={() => setFullViewPhoto({
                    type: 'after',
                    url: selectedKaizen.photoAfter,
                    title: `AFTER IMPROVEMENT: ${selectedKaizen.title}`
                  })}
                  className="bg-slate-50 rounded-xl aspect-video flex items-center justify-center p-1.5 border border-slate-300 overflow-hidden cursor-pointer group relative hover:border-emerald-500 transition shadow-inner"
                >
                  {selectedKaizen.photoAfter ? (
                    <>
                      <img
                        src={selectedKaizen.photoAfter}
                        alt="After"
                        className="max-h-full max-w-full object-contain rounded-lg group-hover:scale-102 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-mono text-xs font-bold space-x-1">
                        <ZoomIn className="w-4 h-4" />
                        <span>Enlarge & Zoom Photo</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-slate-400 text-xs italic font-mono">No photo after recorded</span>
                  )}
                </div>
              </div>

              {/* Benefits Metric */}
              <div className="md:col-span-3 p-4 bg-slate-50 font-mono flex flex-col justify-between">
                <div>
                  <h4 className="text-[11px] font-black text-slate-800 uppercase border-b border-slate-300 pb-1 mb-3">
                    PQCDSM Benefits Metric:
                  </h4>
                  <div className="grid grid-cols-6 gap-1 text-center font-bold">
                    {(['p', 'q', 'c', 'd', 's', 'm'] as const).map(key => {
                      const active = selectedKaizen.benefits?.[key];
                      return (
                        <div key={key}>
                          <div className="text-[9px] uppercase text-slate-500">{key}</div>
                          <div className={`mt-1 border text-xs py-1 rounded font-black ${
                            active ? 'bg-slate-900 border-slate-900 text-emerald-400' : 'border-slate-300 text-slate-300 bg-white'
                          }`}>
                            {active ? '✓' : '-'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Audited Annual Savings:</span>
                  <span className="text-sm font-black text-emerald-700 font-mono">
                    {selectedKaizen.costSave ? formatIndianRupees(selectedKaizen.costSave) : '₹ 0 / year'}
                  </span>
                </div>
              </div>

            </div>

            {/* RESULTS & SIGNATURE FOOTER */}
            <div className="p-4 bg-slate-50 text-xs grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8">
                <span className="font-black text-slate-800 uppercase font-mono block mb-1">Outcome & Result Summary:</span>
                <p className="text-slate-800 leading-relaxed font-sans font-medium whitespace-pre-line bg-white p-3 rounded-lg border border-slate-200">
                  {selectedKaizen.result || "Continuous improvement implemented on shopfloor with verified standards."}
                </p>
              </div>

              <div className="md:col-span-4 border-l border-slate-200 pl-4 space-y-2 font-mono text-[11px]">
                <span className="font-bold text-slate-700 uppercase block border-b border-slate-200 pb-1">Sign-Offs:</span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Prepared By:</span>
                  <span className="font-bold text-slate-900">{selectedKaizen.preparedBy || selectedKaizen.ideaBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Approved By:</span>
                  <span className="font-bold text-slate-900">{selectedKaizen.approvedBy || 'Pending'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Verified By:</span>
                  <span className="font-bold text-slate-900">{selectedKaizen.verifiedBy || 'Pending'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* QUICK BUTTON TO OPEN AUDIT MODAL FROM A3 VIEW */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-between no-print max-w-5xl mx-auto border border-slate-800 shadow-md">
            <div>
              <h4 className="text-sm font-bold text-slate-100">Committee Review & Audit Status</h4>
              <p className="text-xs text-slate-400">Classify as Kaizen or Good Point, set cost savings (₹), and log remarks.</p>
            </div>
            {selectedKaizen.status !== 'Pending' ? (
              <div className="px-5 py-2.5 bg-slate-800 text-slate-300 border border-slate-700 font-black rounded-xl text-xs flex items-center space-x-2 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>REVIEW COMPLETED ({selectedKaizen.status})</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openReviewModal(selectedKaizen)}
                className="px-5 py-2.5 bg-amber-500 text-slate-950 font-black rounded-xl text-xs hover:bg-amber-400 transition cursor-pointer flex items-center space-x-1.5 shadow-md"
              >
                <UserCheck className="w-4 h-4" />
                <span>REVIEW & AUDIT THIS KAIZEN</span>
              </button>
            )}
          </div>

        </div>
      )}

      {/* COMMITTEE AUDIT MODAL (Opens for Tabular Row or A3 View) */}
      {reviewModalKaizen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setReviewModalKaizen(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                  Committee Review & Audit ({reviewModalKaizen.srNo})
                </span>
                <h3 className="text-base font-bold text-slate-100 leading-snug">
                  {reviewModalKaizen.title}
                </h3>
              </div>
            </div>

            <div className="space-y-4 text-xs font-sans">
              
              {/* Classification & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                    Kaizen Classification
                  </label>
                  <select
                    value={classification}
                    onChange={(e) => setClassification(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-100"
                  >
                    <option value="Kaizen">🏆 Kaizen (High Benefit)</option>
                    <option value="Good Point">💡 Good Point (Standard)</option>
                    <option value="Pending">⏳ Pending Review</option>
                    <option value="None">❌ None / Rejected</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                    Approval Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-100"
                  >
                    <option value="Approved">✅ Approved</option>
                    <option value="Good Point">💡 Good Point</option>
                    <option value="Pending">⏳ Pending</option>
                    <option value="Rejected">❌ Rejected</option>
                  </select>
                </div>
              </div>

              {/* Cost Savings */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                  Audited Annual Cost Savings (₹)
                </label>
                <input
                  type="number"
                  value={costSave}
                  onChange={(e) => setCostSave(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400"
                  placeholder="e.g. 85000"
                />
              </div>

              {/* PQCDSM Benefits checkmarks */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                  PQCDSM Benefit Areas
                </label>
                <div className="grid grid-cols-6 gap-1.5 font-mono">
                  {(['p', 'q', 'c', 'd', 's', 'm'] as const).map(key => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setBenefits({ ...benefits, [key]: !benefits[key] })}
                      className={`py-2 rounded-lg text-center font-black uppercase transition border ${
                        benefits[key]
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                          : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sign-offs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Verified Sign-off</label>
                  <input
                    type="text"
                    value={verifiedBy}
                    onChange={(e) => setVerifiedBy(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">Approved Sign-off</label>
                  <input
                    type="text"
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>
              </div>

              {/* Committee Remark */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                  Committee Remark & Guidance
                </label>
                <textarea
                  rows={2}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                  placeholder="Enter audit notes or feedback..."
                />
              </div>

              {/* 5M & Safety Impact shortcut */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-300 font-bold block">5M & Safety Impact Assessment</span>
                  <p className="text-[10px] text-slate-400">Manage 5M changes, Safety, PFD/PFMEA updates & assign helpers.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImpactModalKaizen(reviewModalKaizen);
                  }}
                  className="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg text-[10px] font-black uppercase hover:bg-amber-400 transition"
                >
                  Configure
                </button>
              </div>

            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReviewModalKaizen(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReviewModal}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{successMessage ? '✓ Decision Saved!' : 'Save Decision'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FULL VIEW LIGHTBOX MODAL FOR BEFORE/AFTER PHOTOS */}
      {fullViewPhoto && (
        <PhotoZoomModal
          photoUrl={fullViewPhoto.url}
          title={fullViewPhoto.title}
          onClose={() => setFullViewPhoto(null)}
        />
      )}

      {/* PRESENTATION MODE OVERLAY */}
      {presentingKaizen && (
        <KaizenPresentationMode
          kaizen={presentingKaizen}
          allKaizens={filteredKaizens}
          onClose={() => setPresentingKaizen(null)}
          onUpdateKaizen={onUpdateKaizen}
          onSelectKaizen={(id) => {
            const found = kaizens.find(k => k.id === id);
            if (found) {
              setSelectedId(id);
              setPresentingKaizen(found);
            }
          }}
        />
      )}

      {/* 5M IMPACT MODAL */}
      {impactModalKaizen && (
        <KaizenImpactModal
          kaizen={impactModalKaizen}
          mode={impactModalMode}
          onClose={() => setImpactModalKaizen(null)}
          onUpdateKaizen={onUpdateKaizen}
        />
      )}

    </div>
  );
}

