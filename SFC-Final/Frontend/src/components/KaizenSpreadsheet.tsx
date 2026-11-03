import React, { useState } from 'react';
import { Kaizen } from '../types';
import { Search, Filter, Download, ArrowUpDown, ChevronDown, ChevronUp, Eye, ShieldCheck, Settings, Users, Maximize2, UserCheck, Trophy, X, Save, CheckCircle2, Award, Star, Sparkles, FileText, Check } from 'lucide-react';
import { formatIndianRupees, formatIndianRupeesCompact } from '../utils';
import KaizenImpactModal from './KaizenImpactModal';
import KaizenPresentationMode from './KaizenPresentationMode';

interface KaizenSpreadsheetProps {
  kaizens: Kaizen[];
  onSelectKaizen: (k: Kaizen) => void;
  onUpdateKaizen?: (id: string, updatedFields: Partial<Kaizen>) => void;
}

export default function KaizenSpreadsheet({ kaizens, onSelectKaizen, onUpdateKaizen }: KaizenSpreadsheetProps) {
  const [search, setSearch] = useState('');
  const [filterMinifactory, setFilterMinifactory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterClassification, setFilterClassification] = useState('All');
  
  // Mobile expand rows tracker
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Modal trigger states
  const [impactModalKaizen, setImpactModalKaizen] = useState<Kaizen | null>(null);
  const [presentationKaizen, setPresentationKaizen] = useState<Kaizen | null>(null);
  const [committeeReviewKaizen, setCommitteeReviewKaizen] = useState<Kaizen | null>(null);
  const [cftVoteKaizen, setCftVoteKaizen] = useState<Kaizen | null>(null);

  // Committee Review state for modal
  const [reviewClassification, setReviewClassification] = useState<'Kaizen' | 'Good Point' | 'Pending' | 'None'>('Kaizen');
  const [reviewStatus, setReviewStatus] = useState<'Pending' | 'Approved' | 'Good Point' | 'Rejected'>('Approved');
  const [reviewCostSave, setReviewCostSave] = useState<number>(0);
  const [reviewRemark, setReviewRemark] = useState('');
  const [reviewBenefits, setReviewBenefits] = useState({
    p: true, q: true, c: false, d: false, s: false, m: false
  });
  const [reviewSavedMessage, setReviewSavedMessage] = useState(false);

  // CFT Vote state for modal
  const [selectedVoter, setSelectedVoter] = useState('Amit Mehta (Kaizen & Quality Lead)');
  const [voteRank, setVoteRank] = useState<1 | 2 | 3>(1);
  const [voteSavedMessage, setVoteSavedMessage] = useState(false);

  // Populate committee review fields when modal opens
  const openCommitteeReviewModal = (k: Kaizen) => {
    setCommitteeReviewKaizen(k);
    setReviewClassification(k.classification || 'Kaizen');
    setReviewStatus(k.status || 'Approved');
    setReviewCostSave(k.costSave || 0);
    setReviewRemark(k.remark || '');
    setReviewBenefits(k.benefits || { p: false, q: false, c: false, d: false, s: false, m: false });
    setReviewSavedMessage(false);
  };

  const handleSaveCommitteeReview = () => {
    if (!committeeReviewKaizen || !onUpdateKaizen) return;
    onUpdateKaizen(committeeReviewKaizen.id, {
      classification: reviewClassification,
      status: reviewStatus,
      costSave: Number(reviewCostSave),
      remark: reviewRemark,
      benefits: reviewBenefits
    });
    setReviewSavedMessage(true);
    setTimeout(() => {
      setReviewSavedMessage(false);
      setCommitteeReviewKaizen(null);
    }, 1200);
  };

  const handleCastCftVote = () => {
    if (!cftVoteKaizen || !onUpdateKaizen) return;
    // Add or update vote in cftVotes array on the Kaizen
    const currentVotes = cftVoteKaizen.cftVotes || [];
    const existingIndex = currentVotes.findIndex(v => v.voterName === selectedVoter);
    let updatedVotes = [...currentVotes];
    if (existingIndex >= 0) {
      updatedVotes[existingIndex] = { voterName: selectedVoter, rank: voteRank };
    } else {
      updatedVotes.push({ voterName: selectedVoter, rank: voteRank });
    }

    onUpdateKaizen(cftVoteKaizen.id, {
      cftVotes: updatedVotes
    });
    setVoteSavedMessage(true);
    setTimeout(() => {
      setVoteSavedMessage(false);
      setCftVoteKaizen(null);
    }, 1200);
  };

  // Filter kaizens
  const filteredKaizens = kaizens.filter(k => {
    const matchesSearch = 
      k.title.toLowerCase().includes(search.toLowerCase()) ||
      k.srNo.toLowerCase().includes(search.toLowerCase()) ||
      k.ideaBy.toLowerCase().includes(search.toLowerCase()) ||
      k.problemBefore.toLowerCase().includes(search.toLowerCase());

    const matchesMinifactory = filterMinifactory === 'All' || k.minifactory === filterMinifactory;
    const matchesStatus = filterStatus === 'All' || k.status === filterStatus;
    const matchesClassification = filterClassification === 'All' || k.classification === filterClassification;

    return matchesSearch && matchesMinifactory && matchesStatus && matchesClassification;
  });

  const getPQCDSMString = (benefits: Kaizen['benefits']) => {
    if (!benefits) return '-';
    return Object.entries(benefits)
      .filter(([_, active]) => active)
      .map(([key]) => key.toUpperCase())
      .join(', ') || 'None';
  };

  const handleExportCSV = () => {
    // Generate simple CSV content mimicking Excel structure
    const headers = [
      "Kaizen SR. No", "Month", "Suggestion date", "Idea / Kaizen", "Problem/ Before Status",
      "Counter Measure/ After Improvement", "Location", "Station", "Responsibility", 
      "Closing target date", "Idea Implemented date", "Manufactory", "Cost save", 
      "Benefits in PQCDSM", "IDEA By", "Implemented -By", "Status", "Kaizen / Good Point", "Remark"
    ];

    const rows = filteredKaizens.map(k => [
      k.srNo, k.month, k.suggestionDate, `"${k.title.replace(/"/g, '""')}"`, 
      `"${k.problemBefore.replace(/"/g, '""')}"`, `"${k.counterMeasureAfter.replace(/"/g, '""')}"`,
      k.location, k.machine, k.implementedBy || k.ideaBy, k.closingTargetDate, k.implementedDate,
      k.minifactory, k.costSave, getPQCDSMString(k.benefits), k.ideaBy, k.implementedBy,
      k.status, k.classification, `"${k.remark.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Kaizen_Tracking_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      
      {/* Search, Filter & Action Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-800 focus:bg-white transition"
            placeholder="Search Serial No, title, operators, problem details..."
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          
          <div>
            <select
              value={filterMinifactory}
              onChange={(e) => setFilterMinifactory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="All">🏭 All Minifactories</option>
              <option value="MF1">MF1</option>
              <option value="MF2">MF2</option>
              <option value="MF3">MF3</option>
              <option value="Machining">Machining</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="All">🚦 All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Good Point">Good Point</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div>
            <select
              value={filterClassification}
              onChange={(e) => setFilterClassification(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="All">🏆 All Decisions</option>
              <option value="Kaizen">Kaizen Only</option>
              <option value="Good Point">Good Point Only</option>
              <option value="Pending">Pending Review</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ml-auto md:ml-0"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>Export Excel</span>
          </button>
        </div>

      </div>

      {/* Spreadsheet Main Container (Scrollable table on desktop, hybrid cards on mobile) */}
      <div className="bg-white border border-slate-250 rounded-2xl shadow-sm overflow-hidden">
        
        {/* DESKTOP EXCEL TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[11px] text-left border-collapse font-sans min-w-[1950px]">
            <thead>
              <tr className="bg-[#3b82f6] text-white border-b border-slate-300 font-semibold tracking-wider">
                <th className="px-3 py-2.5 border-r border-slate-300 w-[240px] bg-amber-400 text-slate-950 font-black text-center sticky left-0 z-10 shadow-xs">
                  ⚡ Tabular Actions (Blowup / Slides / Review / Award)
                </th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[100px]">Kaizen SR. No</th>
                <th className="px-2 py-2.5 border-r border-slate-300 w-[60px]">Month</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[90px]">Suggestion date</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[160px]">Idea / Kaizen</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[200px]">Problem/ Before Status</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[200px]">Counter Measure / After</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[100px]">Location</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[100px]">Station</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[100px]">Responsibility</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[90px]">Closing target date</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[90px]">Implemented date</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[110px]">Manufactory</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[100px]">Cost save (₹)</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[100px]">Benefits (PQCDSM)</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[100px]">IDEA By</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[100px]">Implemented-By</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[80px]">Status</th>
                {/* Yellow Highlighted Decision Header */}
                <th className="px-3 py-2.5 border-r border-slate-300 bg-[#fef08a] text-amber-900 font-extrabold w-[110px]">Kaizen / Good Point</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[140px]">5M / Safety / PFD Impact</th>
                <th className="px-3 py-2.5 w-[160px]">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredKaizens.length === 0 ? (
                <tr>
                  <td colSpan={21} className="px-6 py-12 text-center text-slate-400 font-medium text-xs bg-slate-50">
                    No matching Kaizen entries found in database records.
                  </td>
                </tr>
              ) : (
                filteredKaizens.map((k) => (
                  <tr
                    key={k.id}
                    onClick={() => onSelectKaizen(k)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    {/* Sticky Action Column */}
                    <td 
                      className="px-2 py-2 border-r border-slate-200 text-center bg-white group-hover:bg-slate-50 sticky left-0 z-10 shadow-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        {/* 1. Blowup Form */}
                        <button
                          type="button"
                          onClick={() => onSelectKaizen(k)}
                          title="Open Blowup Inspection Form"
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[10px] font-bold transition flex items-center space-x-1 border border-slate-800 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-amber-400" />
                          <span>Blowup</span>
                        </button>

                        {/* 2. Presentation Mode */}
                        <button
                          type="button"
                          onClick={() => setPresentationKaizen(k)}
                          title="Launch Fullscreen Presentation Mode"
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>Slides</span>
                        </button>

                        {/* 3. Committee Review */}
                        <button
                          type="button"
                          onClick={() => openCommitteeReviewModal(k)}
                          title="Conduct Committee Review & Decision"
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md text-[10px] font-black transition flex items-center space-x-1 cursor-pointer"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Review</span>
                        </button>

                        {/* 4. CFT Monthly Best Vote */}
                        <button
                          type="button"
                          onClick={() => setCftVoteKaizen(k)}
                          title="Cast CFT Monthly Best Award Vote"
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-extrabold transition flex items-center space-x-1 cursor-pointer"
                        >
                          <Trophy className="w-3 h-3 text-amber-300" />
                          <span>Vote</span>
                        </button>
                      </div>
                    </td>

                    <td className="px-3 py-2 border-r border-slate-200 font-mono font-bold text-slate-900 bg-slate-50/50">
                      {k.srNo}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-200 text-slate-500 font-medium">
                      {k.month}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 font-mono text-slate-600">
                      {k.suggestionDate}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 font-bold text-slate-800">
                      {k.title}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 text-slate-600 line-clamp-2 min-h-[40px] whitespace-pre-wrap leading-tight">
                      {k.problemBefore}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 text-slate-600 line-clamp-2 min-h-[40px] whitespace-pre-wrap leading-tight">
                      {k.counterMeasureAfter}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 text-slate-600 font-medium">
                      {k.location}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 text-slate-600">
                      {k.machine}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 text-slate-700 truncate max-w-[100px]">
                      {k.implementedBy || k.ideaBy}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 font-mono text-slate-500">
                      {k.closingTargetDate}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 font-mono text-slate-500">
                      {k.implementedDate}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 font-semibold text-slate-700">
                      {k.minifactory}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 font-mono font-bold text-slate-900 text-right pr-4">
                      {k.costSave > 0 ? formatIndianRupees(k.costSave) : '-'}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200">
                      <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-black font-mono">
                        {getPQCDSMString(k.benefits)}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 text-slate-500 font-medium">
                      {k.ideaBy}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 text-slate-500 truncate max-w-[100px]">
                      {k.implementedBy}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-xs text-[9px] font-extrabold uppercase font-mono ${
                        k.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : k.status === 'Good Point'
                          ? 'bg-emerald-50 text-emerald-700'
                          : k.status === 'Rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {k.status}
                      </span>
                    </td>
                    {/* Yellow Highlighted Decision Body Column */}
                    <td className="px-3 py-2 border-r border-slate-200 bg-[#fef9c3] font-bold text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono tracking-wide ${
                        k.classification === 'Kaizen'
                          ? 'bg-emerald-600 text-white'
                          : k.classification === 'Good Point'
                          ? 'bg-amber-500 text-white'
                          : k.classification === 'None'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        {k.classification}
                      </span>
                    </td>
                    {/* 5M / Safety / PFD Impact Closure Cell */}
                    <td 
                      className="px-2 py-2 border-r border-slate-200 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setImpactModalKaizen(k)}
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
                            ? '✓ Fully Closed'
                            : k.impactAssessment?.overallClosureStatus || '⚡ 5M Impacts'}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-2 text-slate-500 italic max-w-[160px] truncate">
                      {k.remark || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE & TABLET RESPONSIVE COMPACT CARD VIEW */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredKaizens.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No matching records found.
            </div>
          ) : (
            filteredKaizens.map(k => {
              const isExpanded = expandedRowId === k.id;
              return (
                <div key={k.id} className="p-4 space-y-3">
                  
                  {/* Top line with serial and badges */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-900">{k.srNo}</span>
                    <div className="flex space-x-1.5">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-sm uppercase font-mono ${
                        k.status === 'Approved' || k.status === 'Good Point'
                          ? 'bg-emerald-100 text-emerald-800'
                          : k.status === 'Rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {k.status}
                      </span>
                      {k.classification !== 'Pending' && k.classification !== 'None' && (
                        <span className="px-2 py-0.5 text-[9px] font-black rounded-sm bg-yellow-200 text-yellow-900 uppercase font-mono">
                          {k.classification}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title and Operator */}
                  <div onClick={() => onSelectKaizen(k)} className="cursor-pointer">
                    <h4 className="text-sm font-bold text-slate-800 leading-snug">{k.title}</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">Logged by: {k.ideaBy} • {k.minifactory}</p>
                  </div>

                  {/* Mobile Quick Action Strip */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => onSelectKaizen(k)}
                      className="px-2.5 py-1 bg-slate-900 text-white rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3 text-amber-400" />
                      <span>Blowup Form</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresentationKaizen(k)}
                      className="px-2.5 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Slides</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCommitteeReviewModal(k)}
                      className="px-2.5 py-1 bg-amber-500 text-slate-950 rounded text-[10px] font-black flex items-center space-x-1 cursor-pointer"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>Review</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCftVoteKaizen(k)}
                      className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-extrabold flex items-center space-x-1 cursor-pointer"
                    >
                      <Trophy className="w-3 h-3 text-amber-300" />
                      <span>Vote</span>
                    </button>
                  </div>

                  {/* Accordion expand block */}
                  <button
                    type="button"
                    onClick={() => setExpandedRowId(isExpanded ? null : k.id)}
                    className="w-full py-1 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center space-x-1.5 text-[10px] font-bold text-slate-600 cursor-pointer"
                  >
                    <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-2 border border-slate-100 divide-y divide-slate-200/60 font-medium">
                      <div className="pt-1.5 first:pt-0">
                        <span className="text-slate-400 block font-bold text-[9px] font-mono uppercase">Problem:</span>
                        <p className="text-slate-700 whitespace-pre-wrap leading-normal">{k.problemBefore}</p>
                      </div>
                      <div className="pt-2">
                        <span className="text-slate-400 block font-bold text-[9px] font-mono uppercase">Countermeasure:</span>
                        <p className="text-slate-700 whitespace-pre-wrap leading-normal">{k.counterMeasureAfter}</p>
                      </div>
                      <div className="pt-2 grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div>
                          <span className="text-slate-400 font-bold uppercase block">Station:</span>
                          <span className="text-slate-800">{k.machine || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold uppercase block">Location:</span>
                          <span className="text-slate-800">{k.location || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold uppercase block">Cost Savings:</span>
                          <span className="text-emerald-700 font-bold">{formatIndianRupees(k.costSave)}/yr</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold uppercase block">PQCDSM Benefits:</span>
                          <span className="text-slate-800">{getPQCDSMString(k.benefits)}</span>
                        </div>
                      </div>
                      {k.remark && (
                        <div className="pt-2">
                          <span className="text-amber-800 block font-bold text-[9px] font-mono uppercase">Committee Remark:</span>
                          <p className="text-amber-900 italic">{k.remark}</p>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

      </div>

      {/* 1. PRESENTATION MODE MODAL */}
      {presentationKaizen && (
        <KaizenPresentationMode
          kaizen={presentationKaizen}
          allKaizens={filteredKaizens}
          onClose={() => setPresentationKaizen(null)}
          onUpdateKaizen={(id, updatedFields) => {
            if (onUpdateKaizen) onUpdateKaizen(id, updatedFields);
          }}
          onSelectKaizen={(id) => {
            const found = kaizens.find(item => item.id === id);
            if (found) setPresentationKaizen(found);
          }}
        />
      )}

      {/* 2. TABULAR COMMITTEE REVIEW MODAL */}
      {committeeReviewKaizen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setCommitteeReviewKaizen(null)}
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
                  Committee Review & Audit ({committeeReviewKaizen.srNo})
                </span>
                <h3 className="text-base font-bold text-slate-100 leading-snug">
                  {committeeReviewKaizen.title}
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
                    value={reviewClassification}
                    onChange={(e) => setReviewClassification(e.target.value as any)}
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
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as any)}
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
                  value={reviewCostSave}
                  onChange={(e) => setReviewCostSave(Number(e.target.value))}
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
                      onClick={() => setReviewBenefits({ ...reviewBenefits, [key]: !reviewBenefits[key] })}
                      className={`py-2 rounded-lg text-center font-black uppercase transition border ${
                        reviewBenefits[key]
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                          : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Committee Remark */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                  Committee Remark & Guidance
                </label>
                <textarea
                  rows={2}
                  value={reviewRemark}
                  onChange={(e) => setReviewRemark(e.target.value)}
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
                    setImpactModalKaizen(committeeReviewKaizen);
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
                onClick={() => setCommitteeReviewKaizen(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCommitteeReview}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{reviewSavedMessage ? '✓ Decision Saved!' : 'Save Decision'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TABULAR CFT MONTHLY BEST VOTE MODAL */}
      {cftVoteKaizen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setCftVoteKaizen(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                  CFT Monthly Best Kaizen Award Vote
                </span>
                <h3 className="text-base font-bold text-slate-100 leading-snug">
                  {cftVoteKaizen.title}
                </h3>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Logged By:</span>
                <strong className="text-slate-200">{cftVoteKaizen.ideaBy}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Minifactory:</span>
                <strong className="text-slate-200">{cftVoteKaizen.minifactory}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Annual Cost Saving:</span>
                <strong className="text-emerald-400 font-mono">{formatIndianRupees(cftVoteKaizen.costSave)}</strong>
              </div>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                  Select CFT Voting Member
                </label>
                <select
                  value={selectedVoter}
                  onChange={(e) => setSelectedVoter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-100"
                >
                  <option value="Amit Mehta (Kaizen & Quality Lead)">Amit Mehta (Kaizen & Quality Lead)</option>
                  <option value="Rajesh Patil (Plant Supervisor)">Rajesh Patil (Plant Supervisor)</option>
                  <option value="Sunita Rao (Quality Lead)">Sunita Rao (Quality Lead)</option>
                  <option value="Arjun Mehra (Automation Lead)">Arjun Mehra (Automation Lead)</option>
                  <option value="Vijay Deshmukh (Area Leader)">Vijay Deshmukh (Area Leader)</option>
                  <option value="Sanjay Patil (Safety Specialist)">Sanjay Patil (Safety Specialist)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                  Assign Rank / Points for this Kaizen
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setVoteRank(1)}
                    className={`p-3 rounded-xl border text-center font-bold flex flex-col items-center space-y-1 transition cursor-pointer ${
                      voteRank === 1
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-lg">🥇</span>
                    <span className="text-xs font-extrabold">1st Rank</span>
                    <span className="text-[10px] font-mono text-amber-400">3 Points</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVoteRank(2)}
                    className={`p-3 rounded-xl border text-center font-bold flex flex-col items-center space-y-1 transition cursor-pointer ${
                      voteRank === 2
                        ? 'bg-slate-300/20 border-slate-200 text-slate-100 ring-2 ring-slate-200/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-lg">🥈</span>
                    <span className="text-xs font-extrabold">2nd Rank</span>
                    <span className="text-[10px] font-mono text-slate-300">2 Points</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVoteRank(3)}
                    className={`p-3 rounded-xl border text-center font-bold flex flex-col items-center space-y-1 transition cursor-pointer ${
                      voteRank === 3
                        ? 'bg-amber-700/20 border-amber-600 text-amber-400 ring-2 ring-amber-600/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-lg">🥉</span>
                    <span className="text-xs font-extrabold">3rd Rank</span>
                    <span className="text-[10px] font-mono text-amber-600">1 Point</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCftVoteKaizen(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCastCftVote}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md cursor-pointer"
              >
                <Trophy className="w-4 h-4" />
                <span>{voteSavedMessage ? '✓ Vote Logged!' : 'Submit Vote'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. KAIZEN PROCESS & 5M IMPACT CLOSURE MODAL */}
      {impactModalKaizen && (
        <KaizenImpactModal
          kaizen={impactModalKaizen}
          mode="closure"
          onClose={() => setImpactModalKaizen(null)}
          onUpdateKaizen={(id, updatedFields) => {
            if (onUpdateKaizen) {
              onUpdateKaizen(id, updatedFields);
            }
          }}
        />
      )}

    </div>
  );
}

