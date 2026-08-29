import React, { useState, useEffect } from 'react';
import { PpsrReport, PpsrMeetingLog } from '../types';
import { 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ChevronDown, 
  ChevronRight, 
  X, 
  Compass, 
  Users, 
  Search, 
  Eye, 
  LayoutList, 
  Calendar, 
  Printer, 
  Download, 
  Loader2,
  Plus,
  TrendingDown,
  Clock,
  History,
  ShieldCheck,
  Zap,
  Edit2,
  SlidersHorizontal,
  Check,
  AlertTriangle,
  Award,
  Layers
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import IshikawaFishbone from './IshikawaFishbone';
import { PsqEliminationTree, DEFAULT_PSQ_TREE_DATA } from './PsqEliminationTree';
import PpsrPresentationMode from './PpsrPresentationMode';
import { formatIndianRupees } from '../utils';
import { downloadElementAsPdf } from '../shared/utils/pdfExporter';

interface PpsrReviewBoardProps {
  reports: PpsrReport[];
  onUpdateReport: (id: string, updatedFields: Partial<PpsrReport>) => void;
  onInspectReport?: (report: PpsrReport) => void;
  meetings?: PpsrMeetingLog[];
  onAddMeeting?: (data: Partial<PpsrMeetingLog>) => void;
}

export default function PpsrReviewBoard({
  reports,
  onUpdateReport,
  onInspectReport,
  meetings = [],
  onAddMeeting
}: PpsrReviewBoardProps) {
  // Main view mode: 'table' (Kaizen Tracker Register), 'a3' (A3 Document paper view), or 'meeting-log' (Meeting Minutes)
  const [viewMode, setViewMode] = useState<'table' | 'a3' | 'meeting-log'>('table');

  // Selected report for A3 view or modal inspection
  const [selectedId, setSelectedId] = useState<string>('');
  const [presentingReport, setPresentingReport] = useState<PpsrReport | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterPlant, setFilterPlant] = useState<string>('All');
  const [filterWeek, setFilterWeek] = useState<string>('All');
  const [filterDecision, setFilterDecision] = useState<string>('All');
  const [filterStdStatus, setFilterStdStatus] = useState<string>('All');

  // A3 view sidebar collapse states
  const [isPendingCollapsed, setIsPendingCollapsed] = useState(false);
  const [isReviewedCollapsed, setIsReviewedCollapsed] = useState(false);

  // Review Audit Modal state (matching Kaizen Review Board format)
  const [reviewModalReport, setReviewModalReport] = useState<PpsrReport | null>(null);
  const [committeeDecision, setCommitteeDecision] = useState<'Approved' | 'In-Progress' | 'Re-work Needed' | 'Closed'>('Approved');
  const [status, setStatus] = useState<'Open' | 'In-Progress' | 'Closed'>('In-Progress');
  const [jiraNumber, setJiraNumber] = useState('');
  const [week, setWeek] = useState('');
  const [coach, setCoach] = useState('');
  const [cft, setCft] = useState('');
  const [stdStatusMF, setStdStatusMF] = useState<'Pending' | 'Completed' | 'N/A'>('Pending');
  const [stdDate, setStdDate] = useState('');
  const [responsibility, setResponsibility] = useState('');
  const [ppsrEndDate, setPpsrEndDate] = useState('');
  const [prodQtyBefore, setProdQtyBefore] = useState<number>(0);
  const [rejectedQtyBefore, setRejectedQtyBefore] = useState<number>(0);
  const [prodQtyAfter, setProdQtyAfter] = useState<number>(0);
  const [rejectedQtyAfter, setRejectedQtyAfter] = useState<number>(0);
  const [custDemandQtyMonth, setCustDemandQtyMonth] = useState<number>(0);
  const [custDemandQtyAnnum, setCustDemandQtyAnnum] = useState<number>(0);
  const [perSetRejectionCost, setPerSetRejectionCost] = useState<number>(0);
  const [remarks, setRemarks] = useState('');
  const [effectivityText, setEffectivityText] = useState('');
  const [steeringCommitteeSign, setSteeringCommitteeSign] = useState('Rajesh Patil (Steering Committee)');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Meeting Minutes Modal state
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [mtgDate, setMtgDate] = useState(new Date().toISOString().split('T')[0]);
  const [mtgChairperson, setMtgChairperson] = useState('Amit Mehta (Plant Quality Head)');
  const [mtgAttendees, setMtgAttendees] = useState('Rajesh Patil, Sunita Rao, Arjun Mehra, Vijay D.');
  const [mtgKeyDiscussionPoints, setMtgKeyDiscussionPoints] = useState('');
  const [mtgSelectedPpsrIds, setMtgSelectedPpsrIds] = useState<string[]>([]);
  const [mtgNextReviewDate, setMtgNextReviewDate] = useState('');

  // PDF exporting state
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  // Selected report for A3 view
  const selectedReport = reports.find(r => r.id === selectedId) || reports[0];

  useEffect(() => {
    if (selectedReport && !selectedId) {
      setSelectedId(selectedReport.id);
    }
  }, [selectedReport, selectedId]);

  // Derived filter lists
  const uniquePlants = Array.from(new Set(reports.map(r => r.plant).filter(Boolean)));
  const uniqueWeeks = Array.from(new Set(reports.map(r => r.week).filter(Boolean)));

  // Filtered reports calculation
  const filteredReports = reports.filter(r => {
    const matchesSearch = searchQuery === '' ||
      r.ppsrNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.leadOwner || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.projectLeader || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.plant || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.lineStation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.jiraNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
    const matchesPlant = filterPlant === 'All' || r.plant === filterPlant;
    const matchesWeek = filterWeek === 'All' || r.week === filterWeek;
    const matchesDecision = filterDecision === 'All' || r.committeeDecision === filterDecision;
    const matchesStdStatus = filterStdStatus === 'All' || r.stdStatusMF === filterStdStatus;

    return matchesSearch && matchesStatus && matchesPlant && matchesWeek && matchesDecision && matchesStdStatus;
  });

  const pendingList = reports.filter(r => r.status === 'Open' || r.committeeDecision === 'In Review' || !r.committeeDecision);
  const inProgressList = reports.filter(r => r.status === 'In-Progress');
  const closedList = reports.filter(r => r.status === 'Closed');

  // Total savings
  const totalMonthlySavings = reports.reduce((acc, r) => acc + (Number(r.costSavePerMonth) || 0), 0);
  const totalAnnualSavings = reports.reduce((acc, r) => acc + (Number(r.costSavePerAnnum) || 0), 0);

  // Open Review Audit modal for a specific PPSR Report
  const openReviewModal = (r: PpsrReport) => {
    setReviewModalReport(r);
    setCommitteeDecision((r.committeeDecision as any) || (r.status === 'Closed' ? 'Approved' : 'In-Progress'));
    setStatus(r.status || 'In-Progress');
    setJiraNumber(r.jiraNumber || '');
    setWeek(r.week || 'WK-28');
    setCoach(r.coach || 'Amit Mehta');
    setCft(r.cft || 'Assembly CFT');
    setStdStatusMF((r.stdStatusMF as any) || 'Pending');
    setStdDate(r.stdDate || '');
    setResponsibility(r.responsibility || r.leadOwner || '');
    setPpsrEndDate(r.ppsrEndDate || '');
    setProdQtyBefore(r.prodQtyBefore || 1000);
    setRejectedQtyBefore(r.rejectedQtyBefore || 45);
    setProdQtyAfter(r.prodQtyAfter || 1000);
    setRejectedQtyAfter(r.rejectedQtyAfter || 2);
    setCustDemandQtyMonth(r.custDemandQtyMonth || 5000);
    setCustDemandQtyAnnum(r.custDemandQtyAnnum || 60000);
    setPerSetRejectionCost(r.perSetRejectionCost || 240);
    setRemarks(r.remarks || '');
    setEffectivityText(r.effectivityText || 'Defects eliminated with zero recurring failures verified over 30 shifts.');
    setSteeringCommitteeSign(r.completionSignatures?.steeringCommittee || 'Rajesh Patil (Steering Committee)');
    setSuccessMessage(null);
  };

  // Calculated fields in modal
  const calcPctBefore = prodQtyBefore > 0 ? Number(((rejectedQtyBefore / prodQtyBefore) * 100).toFixed(2)) : 0;
  const calcPctAfter = prodQtyAfter > 0 ? Number(((rejectedQtyAfter / prodQtyAfter) * 100).toFixed(2)) : 0;
  const calcQtyMonthBefore = Math.round((custDemandQtyMonth * calcPctBefore) / 100);
  const calcQtyMonthAfter = Math.round((custDemandQtyMonth * calcPctAfter) / 100);
  const calcQtyMonthSaved = Math.max(0, calcQtyMonthBefore - calcQtyMonthAfter);
  const calcCostSaveMonth = Math.round(calcQtyMonthSaved * perSetRejectionCost);
  const calcCostSaveAnnum = calcCostSaveMonth * 12;

  // Handle Save Review Audit Modal
  const handleSaveReviewModal = () => {
    if (!reviewModalReport) return;

    let targetStatus: 'Open' | 'In-Progress' | 'Closed' = status;
    if (committeeDecision === 'Approved' || committeeDecision === 'Closed') {
      targetStatus = 'Closed';
    } else if (committeeDecision === 'Re-work Needed') {
      targetStatus = 'In-Progress';
    }

    onUpdateReport(reviewModalReport.id, {
      status: targetStatus,
      committeeDecision,
      committeeDecisionDate: new Date().toISOString().split('T')[0],
      jiraNumber,
      week,
      coach,
      cft,
      stdStatusMF,
      stdDate,
      responsibility,
      ppsrEndDate,
      prodQtyBefore,
      rejectedQtyBefore,
      pctBefore: calcPctBefore,
      prodQtyAfter,
      rejectedQtyAfter,
      pctAfter: calcPctAfter,
      custDemandQtyMonth,
      custDemandQtyAnnum,
      qtyMonthBeforeRejPct: calcQtyMonthBefore,
      qtyMonthAfterRejPct: calcQtyMonthAfter,
      qtyMonthSavedRejPct: calcQtyMonthSaved,
      perSetRejectionCost,
      costSavePerMonth: calcCostSaveMonth,
      costSavePerAnnum: calcCostSaveAnnum,
      remarks,
      effectivityText,
      completionSignatures: {
        projectLeader: reviewModalReport.leadOwner || 'Project Leader',
        steeringCommittee: steeringCommitteeSign,
        completedOn: new Date().toISOString().split('T')[0]
      }
    });

    setSuccessMessage(`Steering Committee Decision logged for PPSR ${reviewModalReport.ppsrNo}!`);
    setTimeout(() => {
      setSuccessMessage(null);
      setReviewModalReport(null);
    }, 1200);
  };

  // Handle Save Meeting Minutes
  const handleSaveMeetingMinutes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddMeeting) return;

    onAddMeeting({
      meetingDate: mtgDate,
      chairperson: mtgChairperson,
      attendees: mtgAttendees,
      keyDiscussionPoints: mtgKeyDiscussionPoints,
      discussedPpsrIds: mtgSelectedPpsrIds,
      nextReviewDate: mtgNextReviewDate
    });

    setShowAddMeeting(false);
    setMtgKeyDiscussionPoints('');
    setMtgSelectedPpsrIds([]);
  };

  // Download PDF Handler
  const handleDownloadPdf = async () => {
    if (!selectedReport) return;
    setIsPdfExporting(true);
    await downloadElementAsPdf('ppsr-a3-paper-document', {
      filename: `PPSR_Sheet_${selectedReport.ppsrNo}.pdf`,
      orientation: 'landscape',
      format: 'a3'
    });
    setIsPdfExporting(false);
  };

  if (reports.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center text-slate-500 max-w-2xl mx-auto my-12 font-medium">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        No PPSR investigation tickets are logged yet. Switch to "Initiate New PPSR" to initiate a problem report.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      
      {/* 1. COMPACT INTRO HEADER & COMMITTEE BANNER */}
      <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-violet-500/20 text-violet-300 border border-violet-500/30 font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
            <Users className="w-3 h-3 text-violet-400" />
            <span>Committee Review</span>
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Logged: <strong className="text-white">{reports.length}</strong>
          </span>
          <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Savings/Mo: {formatIndianRupees(totalMonthlySavings)}
          </span>
          <span className="text-xs text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {pendingList.length} PENDING
          </span>
        </div>

        {/* View Mode Switcher & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          
          {/* View Mode Switcher */}
          <div className="bg-slate-950 p-0.5 rounded-xl border border-slate-800 flex items-center space-x-0.5">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition flex items-center space-x-1 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-violet-600 text-white font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Tabular</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('a3')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition flex items-center space-x-1 cursor-pointer ${
                viewMode === 'a3'
                  ? 'bg-indigo-600 text-white font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>A3 Paper</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('meeting-log')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition flex items-center space-x-1 cursor-pointer ${
                viewMode === 'meeting-log'
                  ? 'bg-emerald-600 text-white font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Minutes</span>
            </button>
          </div>

          {/* Presentation Mode Button */}
          {selectedReport && (
            <button
              type="button"
              onClick={() => setPresentingReport(selectedReport)}
              className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold font-mono rounded-lg transition flex items-center space-x-1 border border-emerald-500 shadow-xs cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-200" />
              <span>PRESENT</span>
            </button>
          )}

        </div>
      </div>

      {/* 2. COMPACT FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PPSR No, Title, Plant, JIRA, Leader..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-1.5">
            
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-violet-500"
            >
              <option value="All">All Statuses ({reports.length})</option>
              <option value="Open">⏳ Open ({reports.filter(r => r.status === 'Open').length})</option>
              <option value="In-Progress">⚙️ In-Progress ({inProgressList.length})</option>
              <option value="Closed">✅ Closed ({closedList.length})</option>
            </select>

            {/* Plant Filter */}
            <select
              value={filterPlant}
              onChange={(e) => setFilterPlant(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-violet-500"
            >
              <option value="All">All Plants</option>
              {uniquePlants.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Review Week Filter */}
            <select
              value={filterWeek}
              onChange={(e) => setFilterWeek(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-violet-500"
            >
              <option value="All">All Weeks</option>
              {uniqueWeeks.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>

            {/* Committee Decision Filter */}
            <select
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-violet-500"
            >
              <option value="All">All Decisions</option>
              <option value="Approved">🏆 Approved</option>
              <option value="In Review">⏳ In Review</option>
              <option value="Re-work Needed">⚠️ Re-work</option>
            </select>

          </div>
        </div>
      </div>

      {/* 3. TABULAR REVIEW VIEW MODE (KAIZEN TRACKER FORMAT) */}
      {viewMode === 'table' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight font-mono text-slate-800 flex items-center gap-2">
                <span>📋 BE PPSR Master Register & Decision Tracker</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">Click "Review Decision" to open steering committee audit modal, record approvals, or update metrics.</p>
            </div>
            <span className="text-xs font-bold font-mono text-slate-500">
              Showing {filteredReports.length} of {reports.length} records
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse table-auto min-w-[1900px]">
              <thead>
                <tr className="bg-slate-900 text-slate-200 uppercase tracking-wider font-mono text-[10px] font-black border-b border-slate-800">
                  <th className="py-3.5 px-3 sticky left-0 bg-slate-900 text-center border-r border-slate-800 z-10 w-32">Actions</th>
                  <th className="py-3.5 px-3 border-r border-slate-800 text-center w-16">Sr. No</th>
                  <th className="py-3.5 px-3.5 border-r border-slate-800">PPSR NO</th>
                  <th className="py-3.5 px-3.5 border-r border-slate-800">JIRA Ref</th>
                  <th className="py-3.5 px-3.5 border-r border-slate-800 text-center">Raised Date</th>
                  <th className="py-3.5 px-3 border-r border-slate-800 text-center">Week</th>
                  <th className="py-3.5 px-4 border-r border-slate-800">Problem Title & Location</th>
                  <th className="py-3.5 px-4 border-r border-slate-800">Project Leader / CFT</th>
                  <th className="py-3.5 px-4 border-r border-slate-800">Primary Root Cause</th>
                  <th className="py-3.5 px-3 border-r border-slate-800 text-center">Std Status (MF)</th>
                  <th className="py-3.5 px-3.5 border-r border-slate-800 text-center bg-yellow-900 text-yellow-100">PPSR End Date (Yellow Column)</th>
                  <th className="py-3.5 px-3 border-r border-slate-800 text-center">% Before</th>
                  <th className="py-3.5 px-3 border-r border-slate-800 text-center">% After</th>
                  <th className="py-3.5 px-3.5 border-r border-slate-800 text-right bg-emerald-900 text-emerald-100">Cost Save / Mo (₹)</th>
                  <th className="py-3.5 px-3.5 border-r border-slate-800 text-right bg-violet-900 text-violet-100">Cost Save / Yr (₹)</th>
                  <th className="py-3.5 px-3.5 border-r border-slate-800 text-center">Committee Decision</th>
                  <th className="py-3.5 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-700 text-xs">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="p-8 text-center text-slate-400 font-mono">
                      No PPSR tickets matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((r, index) => {
                    const raisedDate = r.createdAt ? r.createdAt.split('T')[0] : r.discoveredOn || '-';
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition border-r border-slate-200">
                        
                        {/* STICKY ACTIONS COLUMN */}
                        <td className="py-3 px-3 sticky left-0 bg-white border-r border-slate-200 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => openReviewModal(r)}
                              className="bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-black uppercase font-mono tracking-wider py-1.5 px-2.5 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-xs"
                              title="Audit & Review Decision"
                            >
                              <Users className="w-3 h-3" />
                              <span>Audit</span>
                            </button>

                            <button
                              onClick={() => setPresentingReport(r)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                              title="Committee Presentation Mode"
                            >
                              <Compass className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setSelectedId(r.id);
                                setViewMode('a3');
                              }}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition cursor-pointer"
                              title="View A3 Paper Sheet"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3 border-r text-center font-mono font-bold text-slate-400 bg-slate-50/40">{index + 1}</td>
                        <td className="py-3 px-3.5 border-r font-mono font-black text-slate-900">{r.ppsrNo}</td>
                        <td className="py-3 px-3.5 border-r font-mono font-bold text-violet-600">{r.jiraNumber || '-'}</td>
                        <td className="py-3 px-3.5 border-r text-center font-mono">{raisedDate}</td>
                        <td className="py-3 px-3 border-r text-center font-mono font-bold text-emerald-600">{r.week || 'WK-28'}</td>
                        
                        <td className="py-3 px-4 border-r">
                          <span className="font-bold text-slate-900 block">{r.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            🏭 {r.plant || 'Pune'} • Line: {r.lineStation || 'ST-3'}
                          </span>
                        </td>

                        <td className="py-3 px-4 border-r font-mono text-[11px]">
                          <span className="font-bold text-slate-800 block">👤 {r.leadOwner || r.projectLeader || 'Lead'}</span>
                          <span className="text-slate-400 block">👥 CFT: {r.cft || 'Assembly CFT'}</span>
                        </td>

                        <td className="py-3 px-4 border-r text-[11px] max-w-xs">
                          <p className="line-clamp-2 text-slate-600 font-mono">{r.rootCauseAnalysis || 'Under investigation'}</p>
                        </td>

                        <td className="py-3 px-3 border-r text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase font-mono ${
                            r.stdStatusMF === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {r.stdStatusMF || 'Pending'}
                          </span>
                        </td>

                        {/* YELLOW COLUMN FOR PPSR END DATE */}
                        <td className="py-3 px-3.5 border-r text-center font-mono font-black text-amber-950 bg-yellow-100 border-l border-yellow-400">
                          {r.ppsrEndDate || 'TBD'}
                        </td>

                        <td className="py-3 px-3 border-r text-center font-mono font-bold text-rose-600 bg-rose-50/50">
                          {r.pctBefore || 0}%
                        </td>

                        <td className="py-3 px-3 border-r text-center font-mono font-bold text-emerald-600 bg-emerald-50/50">
                          {r.pctAfter || 0}%
                        </td>

                        <td className="py-3 px-3.5 border-r text-right font-mono font-black text-emerald-700 bg-emerald-50/60">
                          ₹{(r.costSavePerMonth || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3.5 border-r text-right font-mono font-black text-violet-700 bg-violet-50/60">
                          ₹{(r.costSavePerAnnum || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3.5 border-r text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase font-mono ${
                            r.committeeDecision === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            r.committeeDecision === 'Re-work Needed' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {r.committeeDecision || (r.status === 'Closed' ? 'Approved' : 'In Review')}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-[11px] text-slate-500 max-w-xs truncate" title={r.remarks}>
                          {r.remarks || '-'}
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. A3 PAPER VIEW MODE (SIDE-BY-SIDE QUEUE & LIVE INSPECTOR) */}
      {viewMode === 'a3' && selectedReport && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in">
          
          {/* Left Sidebar Queue */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black uppercase font-mono text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-violet-600" />
                  <span>PPSR Queue</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  {reports.length} Total
                </span>
              </div>

              {/* Pending Section */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setIsPendingCollapsed(!isPendingCollapsed)}
                  className="w-full flex items-center justify-between text-[11px] font-black uppercase font-mono text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-100"
                >
                  <span>Pending Committee Review ({pendingList.length})</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition ${isPendingCollapsed ? '-rotate-90' : ''}`} />
                </button>
                
                {!isPendingCollapsed && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {pendingList.map(r => (
                      <div
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition ${
                          selectedId === r.id
                            ? 'bg-violet-50/80 border-violet-300 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-xs text-slate-900">{r.ppsrNo}</span>
                          <span className="text-[9px] font-bold uppercase font-mono px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                            {r.status}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-1 line-clamp-1">{r.title}</p>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          🏭 {r.plant || 'Pune'} • Line: {r.lineStation || 'ST-3'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reviewed / Closed Section */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReviewedCollapsed(!isReviewedCollapsed)}
                  className="w-full flex items-center justify-between text-[11px] font-black uppercase font-mono text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-100"
                >
                  <span>Completed / Approved ({closedList.length})</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition ${isReviewedCollapsed ? '-rotate-90' : ''}`} />
                </button>

                {!isReviewedCollapsed && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {closedList.map(r => (
                      <div
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition ${
                          selectedId === r.id
                            ? 'bg-emerald-50/80 border-emerald-300 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-xs text-slate-900">{r.ppsrNo}</span>
                          <span className="text-[9px] font-bold uppercase font-mono px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                            Approved
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-1 line-clamp-1">{r.title}</p>
                        <span className="text-[10px] text-emerald-600 font-mono font-bold block mt-0.5">
                          ₹{(r.costSavePerMonth || 0).toLocaleString('en-IN')}/mo saved
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Right A3 Canvas & Decision Panel */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Quick Action Topbar */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase font-black text-slate-400 tracking-wider block">
                  Active Ticket Under Review
                </span>
                <h3 className="text-sm font-black font-mono text-slate-900">
                  {selectedReport.ppsrNo} • {selectedReport.title}
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => openReviewModal(selectedReport)}
                  className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-black uppercase font-mono px-4 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Audit / Set Decision</span>
                </button>

                <button
                  type="button"
                  onClick={() => onInspectReport && onInspectReport(selectedReport)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase font-mono px-3 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Inspect Print</span>
                </button>
              </div>
            </div>

            {/* A3 Paper Sheet Content Container */}
            <div id="ppsr-a3-paper-document" className="bg-white border border-slate-300 rounded-3xl p-6 shadow-sm space-y-6 text-left">
              
              {/* Header Box */}
              <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-violet-900 text-white font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded">
                      PPSR A3 SHEET
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      Standard Doc No: {selectedReport.ppsrNo}
                    </span>
                  </div>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight mt-1">
                    {selectedReport.title}
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200 shrink-0">
                  <div><span className="text-slate-400 font-bold">PLANT:</span> <strong className="text-slate-800">{selectedReport.plant || 'Pune'}</strong></div>
                  <div><span className="text-slate-400 font-bold">LINE:</span> <strong className="text-slate-800">{selectedReport.lineStation || 'ST-3'}</strong></div>
                  <div><span className="text-slate-400 font-bold">LEADER:</span> <strong className="text-slate-800">{selectedReport.leadOwner || 'Lead'}</strong></div>
                  <div><span className="text-slate-400 font-bold">STATUS:</span> <strong className="text-violet-700">{selectedReport.status}</strong></div>
                </div>
              </div>

              {/* Step 1 & 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Step 1: Problem Definition & Facts */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase font-mono border-b pb-1">
                    1. Problem Definition & IS/IS-NOT Facts
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {selectedReport.problemStatement || 'No statement provided.'}
                  </p>
                  
                  {selectedReport.factsAnalysis && (
                    <div className="grid grid-cols-2 gap-1.5 pt-2 text-[10px] font-mono">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-emerald-700 font-bold block">IS (What):</span>
                        <span className="text-slate-600">{selectedReport.factsAnalysis.whatIs || '-'}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-rose-700 font-bold block">IS NOT (What):</span>
                        <span className="text-slate-600">{selectedReport.factsAnalysis.whatIsNot || '-'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 2: Emergency Containment */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase font-mono border-b pb-1">
                    2. Containment Countermeasures
                  </h4>
                  <div className="space-y-2">
                    {(selectedReport.containmentActionsList || [
                      { no: 1, action: selectedReport.containmentAction || '100% sorting activated', responsible: 'QA Team', date: selectedReport.discoveredOn || 'Immediate', status: 'implemented' as const }
                    ]).map((c, i) => (
                      <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-800">{c.action}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">👤 {c.responsible} • 📅 {c.date}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Step 3: Root Cause Analysis */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase font-mono border-b pb-1">
                  3. Cause Localization & Root Cause Analysis
                </h4>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase font-mono text-slate-400 block mb-1">Primary Identified Technical Root Cause:</span>
                  <p className="text-xs font-bold text-slate-800 font-mono">{selectedReport.rootCauseAnalysis || 'Investigation complete.'}</p>
                </div>
              </div>

              {/* Step 4 & 5: Permanent Corrective Actions & Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Corrective Actions */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase font-mono border-b pb-1">
                    4. Permanent Corrective Actions (PCA)
                  </h4>
                  <div className="space-y-2">
                    {(selectedReport.correctiveActionsList || [
                      { no: 1, measure: selectedReport.permanentCorrectiveAction || 'Update PMS and pre-filters', responsible: 'Maintenance', deadline: selectedReport.targetDate || 'Completed', status: 'proven' as const }
                    ]).map((a, i) => (
                      <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{a.measure}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {a.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">👤 {a.responsible} • 📅 {a.deadline}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financials & Savings */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase font-mono border-b pb-1">
                    5. Financial Validation & Cost Savings
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Monthly Savings</span>
                      <span className="text-base font-black text-emerald-700">₹{(selectedReport.costSavePerMonth || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Annual Savings</span>
                      <span className="text-base font-black text-violet-700">₹{(selectedReport.costSavePerAnnum || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl text-xs font-mono flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-yellow-900 block">PPSR END DATE</span>
                      <span className="font-black text-yellow-950">{selectedReport.ppsrEndDate || 'TBD'}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-yellow-200 text-yellow-900">
                      Std (MF): {selectedReport.stdStatusMF || 'Pending'}
                    </span>
                  </div>
                </div>

              </div>

              {/* Signatures Box */}
              <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Prepared By (Lead)</span>
                  <span className="font-bold text-slate-800">{selectedReport.leadOwner || 'Project Leader'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Steering Committee Sign-Off</span>
                  <span className="font-bold text-emerald-700">{selectedReport.completionSignatures?.steeringCommittee || 'Rajesh Patil (Steering Committee)'}</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* 5. MEETING MINUTES LOG VIEW MODE */}
      {viewMode === 'meeting-log' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight font-mono text-slate-800 flex items-center gap-2">
                <span>🤝 Steering Committee Review Meeting Minutes</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">Log and track daily/weekly PPSR sprint minutes, reviewed items, and immediate CFT decisions.</p>
            </div>
            <button
              onClick={() => setShowAddMeeting(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider font-mono py-2 px-4 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Meeting Minutes</span>
            </button>
          </div>

          <div className="space-y-4">
            {(meetings || []).length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400 uppercase font-mono">No meeting logs recorded yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Click the button above to log your first meeting.</p>
              </div>
            ) : (
              (meetings || []).map((mtg, idx) => (
                <div key={mtg.id} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl relative overflow-hidden hover:border-slate-300 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-2.5 py-1 rounded-md font-mono uppercase">
                        Session #{(meetings || []).length - idx}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {mtg.meetingDate}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                      Next Review: {mtg.nextReviewDate || 'TBD'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4 space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Chairperson / Lead</span>
                      <span className="text-xs font-black text-slate-700 block">{mtg.chairperson}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block pt-1">Attendees</span>
                      <span className="text-[10px] font-bold text-slate-500 block leading-tight">{mtg.attendees}</span>
                    </div>

                    <div className="md:col-span-8 space-y-2 border-t md:border-t-0 md:border-l border-slate-200/80 md:pl-4">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Key Decisions & Action Log</span>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium mt-0.5">{mtg.keyDiscussionPoints}</p>
                      </div>
                      
                      {mtg.discussedPpsrIds && mtg.discussedPpsrIds.length > 0 && (
                        <div className="pt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block mb-1">Reviewed PPSRs</span>
                          <div className="flex flex-wrap gap-1.5">
                            {mtg.discussedPpsrIds.map(pid => {
                              const r = reports.find(report => report.id === pid);
                              return r ? (
                                <span key={pid} className="bg-violet-50 text-violet-700 border border-violet-100 text-[10px] font-black px-2 py-0.5 rounded-md font-mono">
                                  {r.ppsrNo}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 6. COMMITTEE REVIEW & AUDIT MODAL (KAIZEN TRACKER REVIEW MODAL FORMAT) */}
      {reviewModalReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-2">
                <span className="bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase">
                  AUDIT DECISION
                </span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {reviewModalReport.ppsrNo} • {reviewModalReport.title}
                </span>
              </div>
              <button 
                onClick={() => setReviewModalReport(null)} 
                className="text-slate-400 hover:text-white transition p-1 bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Decision & Status Banner */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">
                    Committee Decision *
                  </label>
                  <select
                    value={committeeDecision}
                    onChange={(e: any) => setCommitteeDecision(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none"
                  >
                    <option value="Approved">🏆 Approved</option>
                    <option value="In-Progress">⚙️ In-Progress</option>
                    <option value="Re-work Needed">⚠️ Re-work Needed</option>
                    <option value="Closed">✅ Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">
                    Standard (MF) Status *
                  </label>
                  <select
                    value={stdStatusMF}
                    onChange={(e: any) => setStdStatusMF(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none"
                  >
                    <option value="Pending">⏳ Pending</option>
                    <option value="Completed">✅ Completed</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
              </div>

              {/* Yellow Highlight: PPSR End Date & Std Date */}
              <div className="grid grid-cols-2 gap-4 bg-yellow-50/70 p-4 rounded-2xl border border-yellow-200">
                <div>
                  <label className="block text-[10px] font-black text-yellow-950 uppercase font-mono mb-1">
                    🟡 PPSR End Date (Yellow Column) *
                  </label>
                  <input
                    type="date"
                    value={ppsrEndDate}
                    onChange={(e) => setPpsrEndDate(e.target.value)}
                    className="w-full bg-white border border-yellow-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-yellow-900 uppercase font-mono mb-1">
                    Standardization Date (Std Date)
                  </label>
                  <input
                    type="date"
                    value={stdDate}
                    onChange={(e) => setStdDate(e.target.value)}
                    className="w-full bg-white border border-yellow-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* JIRA, Week, Coach, CFT */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono mb-1">JIRA Ref</label>
                  <input
                    type="text"
                    value={jiraNumber}
                    onChange={(e) => setJiraNumber(e.target.value)}
                    placeholder="e.g. JIRA-QA-1082"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono mb-1">Review Week</label>
                  <input
                    type="text"
                    value={week}
                    onChange={(e) => setWeek(e.target.value)}
                    placeholder="WK-28"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono mb-1">Coach</label>
                  <input
                    type="text"
                    value={coach}
                    onChange={(e) => setCoach(e.target.value)}
                    placeholder="Amit Mehta"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono mb-1">CFT</label>
                  <input
                    type="text"
                    value={cft}
                    onChange={(e) => setCft(e.target.value)}
                    placeholder="Assembly CFT"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Defect Metrics & Financial Impact Validation */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="text-[10px] font-black uppercase font-mono text-emerald-700">
                    📊 Financial Savings & Defect Reduction Audit
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    Live dynamic calculation
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Prod Qty (Before)</label>
                    <input
                      type="number"
                      value={prodQtyBefore}
                      onChange={(e) => setProdQtyBefore(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Rej Qty (Before)</label>
                    <input
                      type="number"
                      value={rejectedQtyBefore}
                      onChange={(e) => setRejectedQtyBefore(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-rose-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Prod Qty (After)</label>
                    <input
                      type="number"
                      value={prodQtyAfter}
                      onChange={(e) => setProdQtyAfter(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Rej Qty (After)</label>
                    <input
                      type="number"
                      value={rejectedQtyAfter}
                      onChange={(e) => setRejectedQtyAfter(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Cust Demand / Mo</label>
                    <input
                      type="number"
                      value={custDemandQtyMonth}
                      onChange={(e) => setCustDemandQtyMonth(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Per Set Rej Cost (₹)</label>
                    <input
                      type="number"
                      value={perSetRejectionCost}
                      onChange={(e) => setPerSetRejectionCost(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-xl flex flex-col justify-center text-center">
                    <span className="text-[8px] font-bold uppercase text-emerald-700 font-mono">Calculated Monthly Save</span>
                    <span className="text-xs font-black text-emerald-800 font-mono">₹{calcCostSaveMonth.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Committee Signatures & Remarks */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">
                  Steering Committee Lead Sign-off
                </label>
                <input
                  type="text"
                  value={steeringCommitteeSign}
                  onChange={(e) => setSteeringCommitteeSign(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">
                  Committee Review Remarks & Feedback *
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Record steering review findings, audit notes, or required adjustments..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 resize-none"
                />
              </div>

              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-mono font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{successMessage}</span>
                </div>
              )}

            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setReviewModalReport(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReviewModal}
                className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-black uppercase tracking-wider font-mono px-6 py-2.5 rounded-xl transition shadow-md shadow-violet-200"
              >
                Save Committee Decision
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. LOG MEETING MINUTES MODAL */}
      {showAddMeeting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-fade-in">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <span className="font-mono text-xs font-bold text-slate-300">LOG MINUTES OF REVIEW MEETING</span>
              <button onClick={() => setShowAddMeeting(false)} className="text-slate-400 hover:text-white transition p-1 bg-slate-800 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMeetingMinutes} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Meeting Date *</label>
                  <input
                    type="date"
                    required
                    value={mtgDate}
                    onChange={(e) => setMtgDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Next Review Date</label>
                  <input
                    type="date"
                    value={mtgNextReviewDate}
                    onChange={(e) => setMtgNextReviewDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Meeting Chairperson / Lead *</label>
                <input
                  type="text"
                  required
                  value={mtgChairperson}
                  onChange={(e) => setMtgChairperson(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Attendees *</label>
                <input
                  type="text"
                  required
                  value={mtgAttendees}
                  onChange={(e) => setMtgAttendees(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Associate Reviewed PPSRs</label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-2 max-h-[110px] overflow-y-auto">
                  {reports.map(r => (
                    <label key={r.id} className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mtgSelectedPpsrIds.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMtgSelectedPpsrIds([...mtgSelectedPpsrIds, r.id]);
                          } else {
                            setMtgSelectedPpsrIds(mtgSelectedPpsrIds.filter(id => id !== r.id));
                          }
                        }}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <span>{r.ppsrNo}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Key Decisions & Action Plan *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Record review findings, audit approvals, and next actions..."
                  value={mtgKeyDiscussionPoints}
                  onChange={(e) => setMtgKeyDiscussionPoints(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMeeting(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider font-mono px-5 py-2 rounded-xl transition"
                >
                  Save Minutes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. PRESENTATION MODE FULLSCREEN */}
      {presentingReport && (
        <PpsrPresentationMode
          report={presentingReport}
          onClose={() => setPresentingReport(null)}
          onUpdateReport={(id, updated) => {
            onUpdateReport(id, updated);
            setPresentingReport(prev => prev ? { ...prev, ...updated } : null);
          }}
          onOpenEditMode={() => {
            setPresentingReport(null);
            openReviewModal(presentingReport);
          }}
        />
      )}

    </div>
  );
}
