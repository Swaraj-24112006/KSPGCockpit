import React, { useState, useMemo } from 'react';
import { SafetyObservation } from '../../types';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  Edit3, 
  ShieldAlert, 
  HelpCircle, 
  UserCheck, 
  X, 
  ChevronRight,
  ArrowRight,
  Info
} from 'lucide-react';
import RiskAssessmentMatrix from './RiskAssessmentMatrix';

interface SafetyObservationSubmoduleProps {
  observations: SafetyObservation[];
  onAddObservation: (data: Partial<SafetyObservation>) => Promise<void>;
  onUpdateObservation: (id: string, data: Partial<SafetyObservation>) => Promise<void>;
  isCoordinatorRole?: boolean;
  onNavigateRaise?: () => void;
}

export default function SafetyObservationSubmodule({
  observations,
  onAddObservation,
  onUpdateObservation,
  isCoordinatorRole = true,
  onNavigateRaise
}: SafetyObservationSubmoduleProps) {
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'A' | 'B' | 'C' | 'Uncategorized'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'In-Progress' | 'Closed' | 'PendingCoordinator'>('All');
  const [shiftFilter, setShiftFilter] = useState<string>('All');

  // Modals
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [coordinatorModalItem, setCoordinatorModalItem] = useState<SafetyObservation | null>(null);
  const [viewDetailItem, setViewDetailItem] = useState<SafetyObservation | null>(null);

  // Form State: Anyone can raise (up to before condition)
  const [newDate, setNewDate] = useState(() => {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  });
  const [newShift, setNewShift] = useState<'A' | 'B' | 'C' | 'General'>('A');
  const [newRaisedBy, setNewRaisedBy] = useState('');
  const [newMinifactory, setNewMinifactory] = useState('MF1');
  const [newLine, setNewLine] = useState('');
  const [newStation, setNewStation] = useState('');
  const [newLegend, setNewLegend] = useState<'Unsafe condition' | 'Unsafe act'>('Unsafe condition');
  const [newBeforeCondition, setNewBeforeCondition] = useState('');
  const [newPhotoBefore, setNewPhotoBefore] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State: Safety Coordinator Action
  const [coordCategory, setCoordCategory] = useState<'A' | 'B' | 'C'>('B');
  const [coordICA, setCoordICA] = useState('');
  const [coordTargetDate, setCoordTargetDate] = useState('');
  const [coordICAStatus, setCoordICAStatus] = useState<'Open' | 'Closed'>('Open');
  const [coordWhy1, setCoordWhy1] = useState('');
  const [coordWhy2, setCoordWhy2] = useState('');
  const [coordWhy3, setCoordWhy3] = useState('');
  const [coordWhy4, setCoordWhy4] = useState('');
  const [coordWhy5, setCoordWhy5] = useState('');
  const [coordRootCause, setCoordRootCause] = useState('');
  const [coordPCA, setCoordPCA] = useState('');
  const [coordResponsibility, setCoordResponsibility] = useState('');
  const [coordDueDate, setCoordDueDate] = useState('');
  const [coordClosingDate, setCoordClosingDate] = useState('');
  const [coordStatus, setCoordStatus] = useState<'Open' | 'In-Progress' | 'Closed'>('Open');
  const [coordHospArea, setCoordHospArea] = useState('');
  const [coordHospStatus, setCoordHospStatus] = useState<'Open' | 'Closed' | 'NA'>('Open');
  const [coordName, setCoordName] = useState('Safety Coordinator');

  // Open Coordinator Modal with loaded values
  const handleOpenCoordinatorModal = (obs: SafetyObservation) => {
    setCoordinatorModalItem(obs);
    setCoordCategory(obs.category || 'B');
    setCoordICA(obs.ica || '');
    setCoordTargetDate(obs.targetDate || '');
    setCoordICAStatus(obs.icaStatus || 'Open');
    setCoordWhy1(obs.why1 || '');
    setCoordWhy2(obs.why2 || '');
    setCoordWhy3(obs.why3 || '');
    setCoordWhy4(obs.why4 || '');
    setCoordWhy5(obs.why5 || '');
    setCoordRootCause(obs.rootCause || '');
    setCoordPCA(obs.pca || '');
    setCoordResponsibility(obs.responsibility || '');
    setCoordDueDate(obs.dueDate || '');
    setCoordClosingDate(obs.closingDate || '');
    setCoordStatus(obs.status || 'Open');
    setCoordHospArea(obs.horizontalDeploymentArea || '');
    setCoordHospStatus(obs.horizontalDeploymentStatus || 'Open');
    setCoordName(obs.coordinatorName || 'Safety Coordinator');
  };

  // Submit Initial Observation (Anyone in organisation)
  const handleRaiseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRaisedBy.trim() || !newStation.trim() || !newBeforeCondition.trim()) {
      alert('Please fill Raised by, Station, and Before condition fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onAddObservation({
        date: newDate,
        shift: newShift,
        raisedBy: newRaisedBy,
        minifactory: newMinifactory,
        line: newLine || 'General Line',
        station: newStation,
        legend: newLegend,
        beforeCondition: newBeforeCondition,
        photoBefore: newPhotoBefore,
        status: 'Open'
      });
      setIsRaiseModalOpen(false);
      // Reset
      setNewRaisedBy('');
      setNewLine('');
      setNewStation('');
      setNewBeforeCondition('');
      setNewPhotoBefore('');
      alert('Safety Observation successfully logged! Sent to Safety Coordinator for review and Category/CAPA assignment.');
    } catch (err) {
      console.error(err);
      alert('Failed to save observation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Coordinator Assessment
  const handleCoordinatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordinatorModalItem) return;
    setIsSubmitting(true);
    try {
      await onUpdateObservation(coordinatorModalItem.id, {
        category: coordCategory,
        ica: coordICA,
        targetDate: coordTargetDate,
        icaStatus: coordICAStatus,
        why1: coordWhy1,
        why2: coordWhy2,
        why3: coordWhy3,
        why4: coordWhy4,
        why5: coordWhy5,
        rootCause: coordRootCause,
        pca: coordPCA,
        responsibility: coordResponsibility,
        dueDate: coordDueDate,
        closingDate: coordClosingDate,
        status: coordStatus,
        horizontalDeploymentArea: coordHospArea,
        horizontalDeploymentStatus: coordHospStatus,
        coordinatorName: coordName
      });
      setCoordinatorModalItem(null);
      alert('Safety Coordinator review and 5-Why CAPA successfully updated!');
    } catch (err) {
      console.error(err);
      alert('Failed to update coordinator assessment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter observations
  const filteredObservations = useMemo(() => {
    return observations.filter(item => {
      const matchesSearch = !searchTerm ||
        String(item.srNo).includes(searchTerm) ||
        item.raisedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.station.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.beforeCondition.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.responsibility && item.responsibility.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = 
        categoryFilter === 'All' ? true :
        categoryFilter === 'Uncategorized' ? !item.category :
        item.category === categoryFilter;

      const matchesStatus = 
        statusFilter === 'All' ? true :
        statusFilter === 'PendingCoordinator' ? !item.category || item.status === 'Open' :
        item.status === statusFilter;

      const matchesShift = shiftFilter === 'All' ? true : item.shift === shiftFilter;

      return matchesSearch && matchesCategory && matchesStatus && matchesShift;
    });
  }, [observations, searchTerm, categoryFilter, statusFilter, shiftFilter]);

  // Quick stats
  const totalCount = observations.length;
  const pendingCoordCount = observations.filter(o => !o.category || !o.ica).length;
  const openCount = observations.filter(o => o.status === 'Open' || o.status === 'In-Progress').length;
  const closedCount = observations.filter(o => o.status === 'Closed').length;

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Sr no', 'Date', 'Shift', 'Raised by', 'Minifactory', 'Line', 'Station',
      'Legend', 'Before condition', 'Category A,B,C', 'ICA', 'Target date',
      'ICA Status', 'Why1', 'Why2', 'Why3', 'Why4', 'Why5', 'Root cause',
      'PCA', 'Responsibility', 'Due date', 'Closing Date', 'Δ time to closure',
      'Status', 'Horizontal deployment area', 'Deployment Status'
    ];
    const rows = filteredObservations.map(o => [
      o.srNo,
      `"${o.date || ''}"`,
      o.shift,
      `"${o.raisedBy || ''}"`,
      `"${o.minifactory || ''}"`,
      `"${o.line || ''}"`,
      `"${o.station || ''}"`,
      `"${o.legend || ''}"`,
      `"${(o.beforeCondition || '').replace(/"/g, '""')}"`,
      o.category || '',
      `"${(o.ica || '').replace(/"/g, '""')}"`,
      o.targetDate || '',
      o.icaStatus || '',
      `"${(o.why1 || '').replace(/"/g, '""')}"`,
      `"${(o.why2 || '').replace(/"/g, '""')}"`,
      `"${(o.why3 || '').replace(/"/g, '""')}"`,
      `"${(o.why4 || '').replace(/"/g, '""')}"`,
      `"${(o.why5 || '').replace(/"/g, '""')}"`,
      `"${(o.rootCause || '').replace(/"/g, '""')}"`,
      `"${(o.pca || '').replace(/"/g, '""')}"`,
      `"${o.responsibility || ''}"`,
      o.dueDate || '',
      o.closingDate || '',
      o.deltaTimeToClosure || '',
      o.status || '',
      `"${o.horizontalDeploymentArea || ''}"`,
      o.horizontalDeploymentStatus || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Safety_Observations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Submodule Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-amber-700 font-mono uppercase tracking-wider">
            Submodule 01
          </span>
          <h2 className="text-lg font-bold text-slate-900">
            Safety Observation Register
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print</span>
          </button>
          <button
            onClick={() => onNavigateRaise ? onNavigateRaise() : setIsRaiseModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Raise Safety Observation</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Observations</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">{totalCount}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Coordinator</div>
          <div className="text-2xl font-bold text-amber-600 mt-1 font-mono tabular-nums">{pendingCoordCount}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Open / In-Progress</div>
          <div className="text-2xl font-bold text-rose-600 mt-1 font-mono tabular-nums">{openCount}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Closed</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1 font-mono tabular-nums">{closedCount}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Sr no, station, initiator, finding..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600">
            <span>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="A">Cat A (High / Imminent)</option>
              <option value="B">Cat B (Medium Risk)</option>
              <option value="C">Cat C (Low / Awareness)</option>
              <option value="Uncategorized">Pending Coordinator</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="PendingCoordinator">Pending Coordinator</option>
              <option value="Open">Open</option>
              <option value="In-Progress">In-Progress</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600">
            <span>Shift:</span>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none"
            >
              <option value="All">All Shifts</option>
              <option value="A">Shift A</option>
              <option value="B">Shift B</option>
              <option value="C">Shift C</option>
              <option value="General">General</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Showing <span className="font-bold text-slate-800">{filteredObservations.length}</span> of {observations.length} records
        </div>
      </div>

      {/* Authentic Spreadsheet Table matching Attachment 1 */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Group Header Row matching spreadsheet colors */}
              <tr className="bg-emerald-100 text-emerald-950 border-b border-emerald-300 font-bold uppercase tracking-wider text-[11px]">
                <th colSpan={9} className="px-3 py-2 border-r border-emerald-300 bg-[#dbe8cf]">
                  Initiator Section (Till Before Condition)
                </th>
                <th colSpan={17} className="px-3 py-2 bg-[#d1e2c4]">
                  Safety Coordinator Section (From Category Onward)
                </th>
                <th className="px-3 py-2 bg-[#c2d9b2] text-center">Action</th>
              </tr>
              {/* Main Column Headers */}
              <tr className="bg-[#e2ebd7] text-slate-800 font-semibold text-[11px] border-b border-slate-300 divide-x divide-slate-300/60">
                <th className="px-3 py-2 whitespace-nowrap">Sr no</th>
                <th className="px-3 py-2 whitespace-nowrap">Date</th>
                <th className="px-3 py-2 whitespace-nowrap">Shift</th>
                <th className="px-3 py-2 whitespace-nowrap">Raised by</th>
                <th className="px-3 py-2 whitespace-nowrap">Minifactory</th>
                <th className="px-3 py-2 whitespace-nowrap">Line</th>
                <th className="px-3 py-2 whitespace-nowrap">Station</th>
                <th className="px-3 py-2 whitespace-nowrap">Legend</th>
                <th className="px-4 py-2 min-w-[240px]">Before condition</th>
                
                {/* Coordinator columns */}
                <th className="px-3 py-2 whitespace-nowrap font-bold text-amber-900 bg-[#d9e8cd]">Category A,B,C</th>
                <th className="px-3 py-2 min-w-[180px]">ICA</th>
                <th className="px-3 py-2 whitespace-nowrap">Target date</th>
                <th className="px-3 py-2 whitespace-nowrap">ICA Status</th>
                <th className="px-3 py-2 min-w-[150px]">Why 1</th>
                <th className="px-3 py-2 min-w-[150px]">Why 2</th>
                <th className="px-3 py-2 min-w-[150px]">Why 3</th>
                <th className="px-3 py-2 min-w-[150px]">Why 4</th>
                <th className="px-3 py-2 min-w-[150px]">Why 5</th>
                <th className="px-3 py-2 min-w-[180px] font-bold text-slate-900">Root cause</th>
                <th className="px-3 py-2 min-w-[180px]">PCA</th>
                <th className="px-3 py-2 whitespace-nowrap">Responsibility</th>
                <th className="px-3 py-2 whitespace-nowrap">Due date</th>
                <th className="px-3 py-2 whitespace-nowrap">Closing Date</th>
                <th className="px-3 py-2 whitespace-nowrap">Δ time (Days)</th>
                <th className="px-3 py-2 whitespace-nowrap font-bold text-slate-900">Status</th>
                <th className="px-3 py-2 min-w-[160px]">Horizontal deployment area</th>
                <th className="px-3 py-2 text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredObservations.length === 0 ? (
                <tr>
                  <td colSpan={27} className="px-4 py-8 text-center text-slate-400">
                    No safety observations match the selected criteria. Click "Raise Safety Observation" to submit a new finding.
                  </td>
                </tr>
              ) : (
                filteredObservations.map((obs) => {
                  const isPendingCoord = !obs.category || !obs.ica;
                  return (
                    <tr 
                      key={obs.id} 
                      className={`hover:bg-slate-50 transition-colors divide-x divide-slate-100 ${
                        isPendingCoord ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5 font-bold font-mono text-slate-800 whitespace-nowrap">
                        {obs.srNo}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-700">
                        {obs.date}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-slate-700">
                        Shift {obs.shift}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-900">
                        {obs.raisedBy}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-700">
                        {obs.minifactory}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                        {obs.line || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-800">
                        {obs.station}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          obs.legend === 'Unsafe act' 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {obs.legend}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-800 leading-snug">
                        {obs.beforeCondition}
                      </td>

                      {/* Coordinator Columns */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-center">
                        {obs.category ? (
                          <span className={`inline-block px-2 py-0.5 rounded font-black font-mono text-xs ${
                            obs.category === 'A' ? 'bg-rose-600 text-white' :
                            obs.category === 'B' ? 'bg-amber-500 text-white' :
                            'bg-blue-500 text-white'
                          }`}>
                            Cat {obs.category}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-semibold italic">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {obs.ica || <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-600">
                        {obs.targetDate || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {obs.icaStatus ? (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            obs.icaStatus === 'Closed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {obs.icaStatus}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 max-w-[150px] truncate" title={obs.why1}>
                        {obs.why1 || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 max-w-[150px] truncate" title={obs.why2}>
                        {obs.why2 || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 max-w-[150px] truncate" title={obs.why3}>
                        {obs.why3 || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 max-w-[150px] truncate" title={obs.why4}>
                        {obs.why4 || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 max-w-[150px] truncate" title={obs.why5}>
                        {obs.why5 || '—'}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-800" title={obs.rootCause}>
                        {obs.rootCause || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700" title={obs.pca}>
                        {obs.pca || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-900">
                        {obs.responsibility || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-600">
                        {obs.dueDate || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-600">
                        {obs.closingDate || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-center text-slate-700">
                        {obs.deltaTimeToClosure !== undefined && obs.deltaTimeToClosure !== '' ? `${obs.deltaTimeToClosure} d` : '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          obs.status === 'Closed' ? 'bg-emerald-100 text-emerald-800' :
                          obs.status === 'In-Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {obs.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {obs.horizontalDeploymentArea || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => setViewDetailItem(obs)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
                            title="Inspect details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isCoordinatorRole && (
                            <button
                              onClick={() => handleOpenCoordinatorModal(obs)}
                              className="flex items-center space-x-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-semibold text-[11px] cursor-pointer"
                              title="Safety Coordinator Fill / Edit"
                            >
                              <Edit3 className="w-3 h-3 text-amber-700" />
                              <span>Coordinator Action</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: RAISE SAFETY OBSERVATION */}
      {isRaiseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden my-8 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Raise Safety Observation
                </h3>
              </div>
              <button 
                onClick={() => setIsRaiseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRaiseSubmit} className="p-6 space-y-4">

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="text"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shift</label>
                  <select
                    value={newShift}
                    onChange={(e) => setNewShift(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <option value="A">Shift A</option>
                    <option value="B">Shift B</option>
                    <option value="C">Shift C</option>
                    <option value="General">General Shift</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Raised by (Your Name / Ticket No) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sagar Fadtare (Technician)"
                  value={newRaisedBy}
                  onChange={(e) => setNewRaisedBy(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Minifactory</label>
                  <select
                    value={newMinifactory}
                    onChange={(e) => setNewMinifactory(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <option value="MF1">MF1 (Chassis &amp; Assembly)</option>
                    <option value="MF2">MF2 (Machining &amp; Powertrain)</option>
                    <option value="MF3">MF3 (Electronics &amp; Final)</option>
                    <option value="Engineering">Engineering &amp; Labs</option>
                    <option value="Warehouse">Warehouse &amp; Logistics</option>
                    <option value="Facilities">Plant Facilities</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Line / Area</label>
                  <input
                    type="text"
                    placeholder="e.g. Line 2, Testing Bay"
                    value={newLine}
                    onChange={(e) => setNewLine(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Station / Exact Spot <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Drinking water point, Stn 04"
                    value={newStation}
                    onChange={(e) => setNewStation(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Legend</label>
                  <div className="flex items-center space-x-2 pt-1">
                    <label className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={newLegend === 'Unsafe condition'}
                        onChange={() => setNewLegend('Unsafe condition')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>Unsafe condition</span>
                    </label>
                    <label className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer ml-3">
                      <input
                        type="radio"
                        checked={newLegend === 'Unsafe act'}
                        onChange={() => setNewLegend('Unsafe act')}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>Unsafe act</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Before Condition Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain exactly what you observed (e.g. While feeding water chances of fallen on air filter unit...)"
                  value={newBeforeCondition}
                  onChange={(e) => setNewBeforeCondition(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRaiseModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Observation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SAFETY COORDINATOR ACTION (Category onward) */}
      {isCoordinatorRole && coordinatorModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-amber-500/10">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-amber-700" />
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest font-mono">
                    Stage 2 · Safety Coordinator Assessment
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Observation #{coordinatorModalItem.srNo} · {coordinatorModalItem.station}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setCoordinatorModalItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCoordinatorSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Context Summary from Stage 1 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>Initial Finding (Raised by: {coordinatorModalItem.raisedBy} on {coordinatorModalItem.date})</span>
                  <span className="font-mono text-slate-500">{coordinatorModalItem.minifactory} · {coordinatorModalItem.station}</span>
                </div>
                <div className="text-slate-700 mt-1 italic">
                  "{coordinatorModalItem.beforeCondition}"
                </div>
              </div>

              {/* Coordinator Fields */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono border-b border-slate-100 pb-1">
                  1. Classification &amp; Immediate Corrective Action (ICA)
                </h4>

                {/* Embedded Interactive 5x5 Risk Assessment Matrix */}
                <RiskAssessmentMatrix
                  compact
                  initialLikelihood={coordCategory === 'A' ? 4 : coordCategory === 'B' ? 3 : 2}
                  initialSeverity={coordCategory === 'A' ? 4 : coordCategory === 'B' ? 3 : 2}
                  onSelectPriority={(res) => {
                    setCoordCategory(res.category);
                  }}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Category A, B, C <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={coordCategory}
                      onChange={(e) => setCoordCategory(e.target.value as any)}
                      className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                    >
                      <option value="A">Category A (High Risk / Stop Work / Imminent Hazard)</option>
                      <option value="B">Category B (Medium Risk / Unsafe Condition)</option>
                      <option value="C">Category C (Low Risk / Housekeeping / Awareness)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ICA Target Date</label>
                    <input
                      type="text"
                      placeholder="e.g. 14-Oct-26"
                      value={coordTargetDate}
                      onChange={(e) => setCoordTargetDate(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ICA Status</label>
                    <select
                      value={coordICAStatus}
                      onChange={(e) => setCoordICAStatus(e.target.value as any)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                    >
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ICA (Immediate Containment / Corrective Action)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Installed temporary drip tray and rerouted dispenser overflow pipe"
                    value={coordICA}
                    onChange={(e) => setCoordICA(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* 5-Why Analysis */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono border-b border-slate-100 pb-1 flex items-center justify-between">
                  <span>2. 5-Why Root Cause Analysis</span>
                  <span className="text-[10px] text-slate-500 font-normal">Iterative root cause drill-down</span>
                </h4>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="w-14 font-mono font-bold text-slate-500 shrink-0">Why 1:</span>
                    <input
                      type="text"
                      placeholder="Why did this occur?"
                      value={coordWhy1}
                      onChange={(e) => setCoordWhy1(e.target.value)}
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
                    />
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="w-14 font-mono font-bold text-slate-500 shrink-0">Why 2:</span>
                    <input
                      type="text"
                      placeholder="Why?"
                      value={coordWhy2}
                      onChange={(e) => setCoordWhy2(e.target.value)}
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
                    />
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="w-14 font-mono font-bold text-slate-500 shrink-0">Why 3:</span>
                    <input
                      type="text"
                      placeholder="Why?"
                      value={coordWhy3}
                      onChange={(e) => setCoordWhy3(e.target.value)}
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
                    />
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="w-14 font-mono font-bold text-slate-500 shrink-0">Why 4:</span>
                    <input
                      type="text"
                      placeholder="Why?"
                      value={coordWhy4}
                      onChange={(e) => setCoordWhy4(e.target.value)}
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
                    />
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="w-14 font-mono font-bold text-slate-500 shrink-0">Why 5:</span>
                    <input
                      type="text"
                      placeholder="Why (systemic cause)?"
                      value={coordWhy5}
                      onChange={(e) => setCoordWhy5(e.target.value)}
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Root Cause (Final Synthesis)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Synthesized systemic root cause..."
                    value={coordRootCause}
                    onChange={(e) => setCoordRootCause(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  />
                </div>
              </div>

              {/* PCA & Deployment */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono border-b border-slate-100 pb-1">
                  3. Permanent Corrective Action (PCA) &amp; Horizontal Closure
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PCA (Permanent Corrective Action)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Fabricated permanent 1.8m acrylic splash barrier and standardized clearance rule..."
                    value={coordPCA}
                    onChange={(e) => setCoordPCA(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Responsibility</label>
                    <input
                      type="text"
                      placeholder="e.g. Manoj Shinde"
                      value={coordResponsibility}
                      onChange={(e) => setCoordResponsibility(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                    <input
                      type="text"
                      placeholder="e.g. 20-Oct-26"
                      value={coordDueDate}
                      onChange={(e) => setCoordDueDate(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Closing Date</label>
                    <input
                      type="text"
                      placeholder="e.g. 19-Oct-26"
                      value={coordClosingDate}
                      onChange={(e) => setCoordClosingDate(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Overall Status</label>
                    <select
                      value={coordStatus}
                      onChange={(e) => setCoordStatus(e.target.value as any)}
                      className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                    >
                      <option value="Open">Open</option>
                      <option value="In-Progress">In-Progress</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Horizontal Deployment Area</label>
                    <input
                      type="text"
                      placeholder="e.g. All MF1, MF2, MF3 water points"
                      value={coordHospArea}
                      onChange={(e) => setCoordHospArea(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Deployment Status</label>
                    <select
                      value={coordHospStatus}
                      onChange={(e) => setCoordHospStatus(e.target.value as any)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                    >
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                      <option value="NA">Not Applicable (NA)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCoordinatorModalItem(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {isSubmitting ? 'Saving...' : 'Save Coordinator Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW RECORD DETAILS */}
      {viewDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden my-8 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                Safety Observation #{viewDetailItem.srNo} · Details
              </h3>
              <button 
                onClick={() => setViewDetailItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div><span className="text-slate-500 font-mono">Date:</span> <strong className="text-slate-800">{viewDetailItem.date} (Shift {viewDetailItem.shift})</strong></div>
                <div><span className="text-slate-500 font-mono">Raised By:</span> <strong className="text-slate-800">{viewDetailItem.raisedBy}</strong></div>
                <div><span className="text-slate-500 font-mono">Minifactory &amp; Line:</span> <strong className="text-slate-800">{viewDetailItem.minifactory} / {viewDetailItem.line || 'N/A'}</strong></div>
                <div><span className="text-slate-500 font-mono">Station:</span> <strong className="text-slate-800">{viewDetailItem.station}</strong></div>
                <div><span className="text-slate-500 font-mono">Legend:</span> <strong className="text-slate-800">{viewDetailItem.legend}</strong></div>
                <div><span className="text-slate-500 font-mono">Category:</span> <strong className="text-slate-800">{viewDetailItem.category ? `Category ${viewDetailItem.category}` : 'Pending Assignment'}</strong></div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Before Condition:</span>
                <div className="bg-slate-100 p-3 rounded-lg text-slate-800">{viewDetailItem.beforeCondition}</div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Immediate Corrective Action (ICA):</span>
                <div className="bg-slate-100 p-3 rounded-lg text-slate-800">{viewDetailItem.ica || 'Pending coordinator review'}</div>
              </div>

              {viewDetailItem.rootCause && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Root Cause (5-Why):</span>
                  <div className="bg-slate-100 p-3 rounded-lg text-slate-800">{viewDetailItem.rootCause}</div>
                </div>
              )}

              {viewDetailItem.pca && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Permanent Action (PCA):</span>
                  <div className="bg-slate-100 p-3 rounded-lg text-slate-800">{viewDetailItem.pca}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div><span className="text-slate-500">Responsibility:</span> <strong>{viewDetailItem.responsibility || '—'}</strong></div>
                <div><span className="text-slate-500">Closing Date:</span> <strong>{viewDetailItem.closingDate || 'Open'}</strong></div>
                <div><span className="text-slate-500">Deployment Area:</span> <strong>{viewDetailItem.horizontalDeploymentArea || '—'}</strong></div>
                <div><span className="text-slate-500">Status:</span> <strong>{viewDetailItem.status}</strong></div>
              </div>

              {/* Before and After Photos */}
              {(viewDetailItem.photoBefore || viewDetailItem.photoAfter) && (
                <div className="pt-3 border-t border-slate-200">
                  <span className="font-bold text-slate-800 block mb-2 font-mono uppercase tracking-wider text-[11px]">
                    📸 Visual Proof Documentation (Before &amp; After):
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {viewDetailItem.photoBefore && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-red-700 font-mono uppercase block">Before Status (Hazard)</span>
                        <div className="border border-red-200 rounded-lg overflow-hidden aspect-video bg-red-50/30 flex items-center justify-center p-1">
                          <img src={viewDetailItem.photoBefore} alt="Before Hazard" className="max-h-full max-w-full object-contain rounded" />
                        </div>
                      </div>
                    )}
                    {viewDetailItem.photoAfter && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-emerald-700 font-mono uppercase block">After Improvement (Safe)</span>
                        <div className="border border-emerald-200 rounded-lg overflow-hidden aspect-video bg-emerald-50/30 flex items-center justify-center p-1">
                          <img src={viewDetailItem.photoAfter} alt="After Containment" className="max-h-full max-w-full object-contain rounded" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewDetailItem(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
