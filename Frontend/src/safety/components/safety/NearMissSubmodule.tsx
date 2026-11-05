import React, { useState, useMemo } from 'react';
import { NearMissReport } from '../../types';
import { 
  Plus, 
  Search, 
  Download, 
  Printer, 
  AlertOctagon, 
  CheckCircle, 
  Clock, 
  Eye, 
  Edit3, 
  X, 
  Info,
  ShieldCheck,
  Building
} from 'lucide-react';

interface NearMissSubmoduleProps {
  nearMisses: NearMissReport[];
  onAddNearMiss: (data: Partial<NearMissReport>) => Promise<void>;
  onUpdateNearMiss: (id: string, data: Partial<NearMissReport>) => Promise<void>;
  isCoordinatorRole?: boolean;
  onNavigateRaise?: () => void;
}

export default function NearMissSubmodule({
  nearMisses,
  onAddNearMiss,
  onUpdateNearMiss,
  isCoordinatorRole = true,
  onNavigateRaise
}: NearMissSubmoduleProps) {
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modals
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [coordinatorModalItem, setCoordinatorModalItem] = useState<NearMissReport | null>(null);
  const [viewDetailItem, setViewDetailItem] = useState<NearMissReport | null>(null);

  // Form State: Anyone can raise (Near-miss Incident Report)
  const [incidentDate, setIncidentDate] = useState(() => {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  });
  const [incidentTime, setIncidentTime] = useState(() => {
    return new Date().toTimeString().substring(0, 5);
  });
  const [incidentType, setIncidentType] = useState<'F' | 'PD' | 'E' | 'Other'>('Other');
  const [deptPlant, setDeptPlant] = useState('MF1- Between L3& L4');
  const [incidentReportedBy, setIncidentReportedBy] = useState('');
  const [personInvolvedName, setPersonInvolvedName] = useState('');
  const [ticketNo, setTicketNo] = useState('');
  const [exactLocation, setExactLocation] = useState('');
  const [briefDescription, setBriefDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State: Safety Coordinator Section
  const [coordCause, setCoordCause] = useState('');
  const [coordActionRec, setCoordActionRec] = useState('');
  const [coordTargetDate, setCoordTargetDate] = useState('');
  const [coordResp, setCoordResp] = useState('');
  const [coordActionTaken, setCoordActionTaken] = useState('');
  const [coordHorizDeploy, setCoordHorizDeploy] = useState('');
  const [coordClosingDate, setCoordClosingDate] = useState('');
  const [coordStatus, setCoordStatus] = useState<'Open' | 'In-Progress' | 'Closed'>('Open');

  // Open Coordinator Modal
  const handleOpenCoordinatorModal = (nm: NearMissReport) => {
    setCoordinatorModalItem(nm);
    setCoordCause(nm.causeOfIncident || '');
    setCoordActionRec(nm.correctiveActionRecommended || '');
    setCoordTargetDate(nm.actionTargetDate || '');
    setCoordResp(nm.respForAction || '');
    setCoordActionTaken(nm.correctiveActionTaken || '');
    setCoordHorizDeploy(nm.horizontalDeploymentIdentify || 'NA');
    setCoordClosingDate(nm.closingDate || '');
    setCoordStatus(nm.status || 'Open');
  };

  // Submit Initial Near Miss (Anyone in organisation)
  const handleRaiseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentReportedBy.trim() || !deptPlant.trim() || !exactLocation.trim() || !briefDescription.trim()) {
      alert('Please fill Incident Reported by, Dept/Plant, Exact Location, and Brief Description.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onAddNearMiss({
        incidentDate,
        incidentTime,
        incidentType,
        deptPlant,
        incidentReportedBy,
        personInvolvedName: personInvolvedName || incidentReportedBy,
        ticketNo,
        exactLocation,
        briefDescription,
        status: 'Open'
      });
      setIsRaiseModalOpen(false);
      // Reset
      setIncidentReportedBy('');
      setPersonInvolvedName('');
      setTicketNo('');
      setExactLocation('');
      setBriefDescription('');
      alert('Near-miss report successfully logged! Forwarded to Safety Coordinator for Investigation and Corrective Action.');
    } catch (err) {
      console.error(err);
      alert('Failed to log Near Miss.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Coordinator Investigation & CAPA
  const handleCoordinatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordinatorModalItem) return;
    setIsSubmitting(true);
    try {
      await onUpdateNearMiss(coordinatorModalItem.id, {
        causeOfIncident: coordCause,
        correctiveActionRecommended: coordActionRec,
        actionTargetDate: coordTargetDate,
        respForAction: coordResp,
        correctiveActionTaken: coordActionTaken,
        horizontalDeploymentIdentify: coordHorizDeploy,
        closingDate: coordClosingDate,
        status: coordStatus
      });
      setCoordinatorModalItem(null);
      alert('Near-miss investigation & CAPA updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update coordinator assessment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Near Misses
  const filteredNearMisses = useMemo(() => {
    return nearMisses.filter(item => {
      const matchesSearch = !searchTerm ||
        String(item.srNo).includes(searchTerm) ||
        item.incidentReportedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.deptPlant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.exactLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.briefDescription.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'All' ? true : item.incidentType === typeFilter;
      const matchesStatus = statusFilter === 'All' ? true : item.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [nearMisses, searchTerm, typeFilter, statusFilter]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Sr. No.', 'Incident Date', 'Incident Time', 'Incident type', 'Dept./ Plant',
      'Incident Reported by', 'Person involved & Dept', 'Ticket No.', 'Exact Location',
      'Brief Description', 'Cause of Incident', 'Corrective Action Recommended',
      'Action Target Date', 'Resp. for Action', 'Corrective Action Taken',
      'Horizontal deployment identify', 'Closing date'
    ];
    const rows = filteredNearMisses.map(nm => [
      nm.srNo,
      `"${nm.incidentDate}"`,
      `"${nm.incidentTime}"`,
      `"${nm.incidentType}"`,
      `"${nm.deptPlant}"`,
      `"${nm.incidentReportedBy}"`,
      `"${nm.personInvolvedName || ''}"`,
      `"${nm.ticketNo || ''}"`,
      `"${nm.exactLocation}"`,
      `"${nm.briefDescription.replace(/"/g, '""')}"`,
      `"${(nm.causeOfIncident || '').replace(/"/g, '""')}"`,
      `"${(nm.correctiveActionRecommended || '').replace(/"/g, '""')}"`,
      `"${nm.actionTargetDate || ''}"`,
      `"${(nm.respForAction || '').replace(/"/g, '""')}"`,
      `"${(nm.correctiveActionTaken || '').replace(/"/g, '""')}"`,
      `"${nm.horizontalDeploymentIdentify || ''}"`,
      `"${nm.closingDate || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Near_Miss_Incident_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full font-mono">
                Submodule 02 · Near-miss Incident Register
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs text-slate-500 font-mono">Attachment 2 Format</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Near-miss Incident Report System
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print</span>
            </button>
            <button
              onClick={() => onNavigateRaise ? onNavigateRaise() : setIsRaiseModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Raise Near Miss Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ticket, reporter, dept, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600">
            <span>Incident Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none"
            >
              <option value="All">All Types</option>
              <option value="F">F (Fire / Fall)</option>
              <option value="PD">PD (Property Damage)</option>
              <option value="E">E (Environmental)</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open (Pending Coordinator)</option>
              <option value="In-Progress">In-Progress</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Total Near-misses: <strong className="text-slate-800">{filteredNearMisses.length}</strong>
        </div>
      </div>

      {/* Near Miss Table matching Attachment 2 Exact Layout */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Top Colored Category Headers (from Attachment 2) */}
              <tr className="font-bold text-[11px] uppercase tracking-wider text-center border-b border-slate-300">
                <th colSpan={10} className="px-3 py-2 bg-[#fbd4b4] text-red-900 border-r border-slate-300">
                  Near-miss Incident Report
                </th>
                <th colSpan={1} className="px-3 py-2 bg-[#ffff99] text-amber-950 border-r border-slate-300">
                  Investigation*
                </th>
                <th colSpan={4} className="px-3 py-2 bg-[#c6efce] text-emerald-950 border-r border-slate-300">
                  Corrective Action
                </th>
                <th colSpan={2} className="px-3 py-2 bg-[#b6dde8] text-cyan-950 border-r border-slate-300">
                  Horizontal deployment
                </th>
                <th className="px-3 py-2 bg-slate-200 text-slate-800">
                  Action
                </th>
              </tr>
              {/* Detailed Columns */}
              <tr className="bg-slate-100 text-slate-800 font-semibold text-[11px] border-b border-slate-300 divide-x divide-slate-300/70">
                <th className="px-3 py-2 whitespace-nowrap">Sr. No.</th>
                <th className="px-3 py-2 whitespace-nowrap">Incident Date<br/><span className="text-[9px] font-normal text-slate-500">(dd-mmm-yy)</span></th>
                <th className="px-3 py-2 whitespace-nowrap">Incident Time<br/><span className="text-[9px] font-normal text-slate-500">(hrs:mm)</span></th>
                <th className="px-3 py-2 whitespace-nowrap">Incident type<br/><span className="text-[9px] font-normal text-slate-500">F/PD/E/Other</span></th>
                <th className="px-3 py-2 min-w-[140px]">Dept./ Plant where incident occurred.</th>
                <th className="px-3 py-2 whitespace-nowrap">Incident Reported by<br/><span className="text-[9px] font-normal text-slate-500">(Name of Manager)</span></th>
                <th className="px-3 py-2 min-w-[140px]">Name of Person involved in Near-Miss incident, if any &amp; his Dept.</th>
                <th className="px-3 py-2 whitespace-nowrap">Ticket No. of the person involved</th>
                <th className="px-3 py-2 min-w-[140px]">Exact Location where incident happened</th>
                <th className="px-4 py-2 min-w-[260px]">Brief Description of Incident</th>
                
                {/* Investigation (Yellow) */}
                <th className="px-3 py-2 min-w-[180px] bg-[#ffffe0]">Cause of Incident</th>

                {/* Corrective Action (Green) */}
                <th className="px-3 py-2 min-w-[200px] bg-[#e2f0d9]">Corrective Action Recommended</th>
                <th className="px-3 py-2 whitespace-nowrap bg-[#e2f0d9]">Action Target Date<br/><span className="text-[9px] font-normal text-slate-500">(dd-mmm-yy)</span></th>
                <th className="px-3 py-2 min-w-[130px] bg-[#e2f0d9]">Resp. for Action</th>
                <th className="px-3 py-2 min-w-[180px] bg-[#e2f0d9]">Corrective Action Taken</th>

                {/* Horizontal Deployment (Teal) */}
                <th className="px-3 py-2 min-w-[140px] bg-[#deebf7]">Horizontal deployment identify</th>
                <th className="px-3 py-2 whitespace-nowrap bg-[#deebf7]">Closing date</th>

                <th className="px-3 py-2 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredNearMisses.length === 0 ? (
                <tr>
                  <td colSpan={18} className="px-4 py-8 text-center text-slate-400">
                    No near-miss records found matching filter.
                  </td>
                </tr>
              ) : (
                filteredNearMisses.map((nm) => {
                  const isPendingCoord = !nm.causeOfIncident || !nm.correctiveActionRecommended;
                  return (
                    <tr 
                      key={nm.id}
                      className={`hover:bg-slate-50 transition-colors divide-x divide-slate-100 ${
                        isPendingCoord ? 'bg-orange-50/10' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5 font-bold font-mono text-slate-800 text-center whitespace-nowrap">
                        {nm.srNo}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-700">
                        {nm.incidentDate}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-600">
                        {nm.incidentTime}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-center">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          nm.incidentType === 'F' ? 'bg-rose-100 text-rose-800' :
                          nm.incidentType === 'PD' ? 'bg-amber-100 text-amber-800' :
                          nm.incidentType === 'E' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {nm.incidentType}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 font-medium">
                        {nm.deptPlant}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-900 font-medium">
                        {nm.incidentReportedBy}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {nm.personInvolvedName || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-600">
                        {nm.ticketNo || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 font-medium">
                        {nm.exactLocation}
                      </td>
                      <td className="px-4 py-2.5 text-slate-800 leading-snug">
                        {nm.briefDescription}
                      </td>

                      {/* Coordinator Sections */}
                      <td className="px-3 py-2.5 text-slate-700 whitespace-pre-line bg-amber-50/20">
                        {nm.causeOfIncident || <span className="text-amber-700 italic text-[11px]">Pending Investigation</span>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 whitespace-pre-line bg-emerald-50/20">
                        {nm.correctiveActionRecommended || <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="px-3 py-2.5 whitespace-pre-line font-mono text-slate-600 bg-emerald-50/20">
                        {nm.actionTargetDate || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-pre-line text-slate-900 font-medium bg-emerald-50/20">
                        {nm.respForAction || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 whitespace-pre-line bg-emerald-50/20">
                        {nm.correctiveActionTaken || <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 bg-sky-50/20">
                        {nm.horizontalDeploymentIdentify || 'NA'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-600 bg-sky-50/20">
                        {nm.closingDate || '—'}
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => setViewDetailItem(nm)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                            title="Inspect details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isCoordinatorRole && (
                            <button
                              onClick={() => handleOpenCoordinatorModal(nm)}
                              className="flex items-center space-x-1 px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded font-semibold text-[11px]"
                              title="Fill Investigation & Actions"
                            >
                              <Edit3 className="w-3 h-3 text-orange-700" />
                              <span>Coordinator</span>
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

      {/* MODAL 1: RAISE NEAR MISS (Anyone can raise) */}
      {isRaiseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden my-8 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-orange-50">
              <div>
                <span className="text-[10px] font-bold text-orange-800 uppercase tracking-widest font-mono">
                  Near-miss Incident Report
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Raise Near-Miss Incident
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Date</label>
                  <input
                    type="text"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Time</label>
                  <input
                    type="text"
                    value={incidentTime}
                    onChange={(e) => setIncidentTime(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Type</label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <option value="F">F (Fire / Fall)</option>
                    <option value="PD">PD (Property Damage)</option>
                    <option value="E">E (Environmental)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dept./ Plant where incident occurred <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. MF1- Between L3& L4"
                  value={deptPlant}
                  onChange={(e) => setDeptPlant(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Incident Reported by (Name of Manager / Initiator) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nagraj"
                    value={incidentReportedBy}
                    onChange={(e) => setIncidentReportedBy(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Person involved in incident &amp; Dept
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nagraj (Production)"
                    value={personInvolvedName}
                    onChange={(e) => setPersonInvolvedName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ticket No. of Person</label>
                  <input
                    type="text"
                    placeholder="e.g. TK-9402"
                    value={ticketNo}
                    onChange={(e) => setTicketNo(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Exact Location where incident happened <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Between L3& L4"
                    value={exactLocation}
                    onChange={(e) => setExactLocation(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brief Description of Incident <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. During changeover, the trolley got stuck in a floor patch, causing the fixture to fall down..."
                  value={briefDescription}
                  onChange={(e) => setBriefDescription(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-3"
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
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {isSubmitting ? 'Logging...' : 'Submit Near Miss'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SAFETY COORDINATOR ACTION (Investigation & CAPA) */}
      {isCoordinatorRole && coordinatorModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-amber-100/50">
              <div>
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-widest font-mono">
                  Safety Coordinator Action
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Near Miss #{coordinatorModalItem.srNo} · Investigation &amp; CAPA
                </h3>
              </div>
              <button 
                onClick={() => setCoordinatorModalItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCoordinatorSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 space-y-1">
                <div><strong>Reported:</strong> {coordinatorModalItem.incidentReportedBy} ({coordinatorModalItem.deptPlant})</div>
                <div><strong>Description:</strong> {coordinatorModalItem.briefDescription}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-950 mb-1">
                  Investigation* · Cause of Incident
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 1) Due to floor patch&#10;2) Fixture not locked"
                  value={coordCause}
                  onChange={(e) => setCoordCause(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-950 mb-1">
                  Corrective Action Recommended
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 1) Need to fill patch&#10;2) Awareness to all team member"
                  value={coordActionRec}
                  onChange={(e) => setCoordActionRec(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Action Target Date (dd-mmm-yy)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1) 10/03/2026 2) 18/02/2026"
                    value={coordTargetDate}
                    onChange={(e) => setCoordTargetDate(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Resp. for Action
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Amol Patil / Ramesh S"
                    value={coordResp}
                    onChange={(e) => setCoordResp(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Corrective Action Taken
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1) Patch filled with polymer mortar"
                  value={coordActionTaken}
                  onChange={(e) => setCoordActionTaken(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Horizontal Deployment Identify</label>
                  <input
                    type="text"
                    placeholder="e.g. NA or All plant lines"
                    value={coordHorizDeploy}
                    onChange={(e) => setCoordHorizDeploy(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Closing Date</label>
                  <input
                    type="text"
                    placeholder="e.g. 3-May-26"
                    value={coordClosingDate}
                    onChange={(e) => setCoordClosingDate(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={coordStatus}
                    onChange={(e) => setCoordStatus(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
                  >
                    <option value="Open">Open</option>
                    <option value="In-Progress">In-Progress</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
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
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {isSubmitting ? 'Saving...' : 'Save Investigation & Actions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW NEAR MISS */}
      {viewDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden my-8 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                Near Miss Incident #{viewDetailItem.srNo}
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
                <div><span className="text-slate-500">Date &amp; Time:</span> <strong>{viewDetailItem.incidentDate} at {viewDetailItem.incidentTime}</strong></div>
                <div><span className="text-slate-500">Type:</span> <strong>{viewDetailItem.incidentType}</strong></div>
                <div><span className="text-slate-500">Dept/Plant:</span> <strong>{viewDetailItem.deptPlant}</strong></div>
                <div><span className="text-slate-500">Location:</span> <strong>{viewDetailItem.exactLocation}</strong></div>
                <div><span className="text-slate-500">Reported By:</span> <strong>{viewDetailItem.incidentReportedBy}</strong></div>
                <div><span className="text-slate-500">Person Involved:</span> <strong>{viewDetailItem.personInvolvedName || 'N/A'} ({viewDetailItem.ticketNo || '—'})</strong></div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Brief Description:</span>
                <div className="bg-slate-100 p-3 rounded-lg text-slate-800">{viewDetailItem.briefDescription}</div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Cause of Incident:</span>
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900 whitespace-pre-line">
                  {viewDetailItem.causeOfIncident || 'Pending Investigation'}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Corrective Action Recommended &amp; Taken:</span>
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-emerald-950 whitespace-pre-line">
                  {viewDetailItem.correctiveActionRecommended || 'Pending recommendation'}
                  {viewDetailItem.correctiveActionTaken && (
                    <div className="mt-2 pt-2 border-t border-emerald-200">
                      <strong>Action Taken:</strong> {viewDetailItem.correctiveActionTaken}
                    </div>
                  )}
                </div>
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
                        <span className="text-[10px] font-bold text-orange-700 font-mono uppercase block">Before Status (Near Miss Scene)</span>
                        <div className="border border-orange-200 rounded-lg overflow-hidden aspect-video bg-orange-50/30 flex items-center justify-center p-1">
                          <img src={viewDetailItem.photoBefore} alt="Before Near Miss" className="max-h-full max-w-full object-contain rounded" />
                        </div>
                      </div>
                    )}
                    {viewDetailItem.photoAfter && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-emerald-700 font-mono uppercase block">After Containment (Workplace Safe)</span>
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
