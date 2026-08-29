import React, { useState } from 'react';
import { RedFlag } from '../types';
import CameraModal from '../shared/components/CameraModal';
import { 
  Flag, 
  Search, 
  Filter, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  X, 
  User, 
  Calendar, 
  FileText, 
  Camera, 
  ShieldAlert, 
  TrendingUp,
  Download,
  Check
} from 'lucide-react';

interface RedFlagSystemProps {
  redFlags: RedFlag[];
  onAddRedFlag: (data: Partial<RedFlag>) => void;
  onUpdateRedFlag: (id: string, data: Partial<RedFlag>) => void;
  currentPersona: string;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
}

export default function RedFlagSystem({
  redFlags,
  onAddRedFlag,
  onUpdateRedFlag,
  currentPersona,
  initialAction,
  onClearInitialAction
}: RedFlagSystemProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'In-Progress' | 'Closed'>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [selectedRedFlag, setSelectedRedFlag] = useState<RedFlag | null>(null);
  const [isClosingActionMode, setIsClosingActionMode] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'raise' | 'close' | null>(null);

  React.useEffect(() => {
    if (initialAction === 'raise-modal') {
      setShowRaiseModal(true);
      if (onClearInitialAction) onClearInitialAction();
    } else if (initialAction === 'filter-open') {
      setStatusFilter('Open');
      if (onClearInitialAction) onClearInitialAction();
    } else if (initialAction === 'filter-all') {
      setStatusFilter('All');
      if (onClearInitialAction) onClearInitialAction();
    }
  }, [initialAction]);

  // New Red Flag Form state
  const [newRf, setNewRf] = useState({
    mfName: 'MF1',
    lineAreaName: 'Assembly Line A (Pune)',
    modelName: 'SUV-500',
    stationName: 'Station 4',
    redFlagType: 'Quality' as const,
    redFlagSubType: 'Dimensional Deviation',
    responsibleDepartment: 'Production',
    redFlagDescription: '',
    teamLeader: 'Rajesh Patil',
    repetitiveOccurrence: 'First Time' as const,
    closureResponsibility: '',
    targetDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days target
    evidencePhoto: ''
  });

  // Closure Form state
  const [closureForm, setClosureForm] = useState({
    immediateActionTaken: '',
    actionTakenBy: '',
    actionTakenDate: new Date().toISOString().split('T')[0],
    systematicPermanentAction: '',
    closureDate: new Date().toISOString().split('T')[0],
    status: 'Closed' as const,
    closureEvidence: ''
  });

  const handleRaiseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRf.redFlagDescription || !newRf.closureResponsibility) {
      alert("Please fill in Red Flag Description and assign a Closure Responsibility owner.");
      return;
    }
    onAddRedFlag(newRf);
    setShowRaiseModal(false);
    // Reset form
    setNewRf({
      mfName: 'MF1',
      lineAreaName: 'Assembly Line A (Pune)',
      modelName: 'SUV-500',
      stationName: 'Station 4',
      redFlagType: 'Quality',
      redFlagSubType: 'Dimensional Deviation',
      responsibleDepartment: 'Production',
      redFlagDescription: '',
      teamLeader: 'Rajesh Patil',
      repetitiveOccurrence: 'First Time',
      closureResponsibility: '',
      targetDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      evidencePhoto: ''
    });
  };

  const handleClosureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRedFlag) return;
    if (!closureForm.immediateActionTaken || !closureForm.systematicPermanentAction) {
      alert("Please provide Immediate Action and Systematic Permanent Action before closing the Red Flag.");
      return;
    }

    onUpdateRedFlag(selectedRedFlag.id, {
      ...closureForm,
      status: closureForm.status,
      actionTakenBy: closureForm.actionTakenBy || currentPersona,
      closureDate: closureForm.status === 'Closed' ? closureForm.closureDate : ''
    });

    setIsClosingActionMode(false);
    setSelectedRedFlag(null);
    alert("Red Flag successfully updated and closed!");
  };

  // Filter red flags
  const filteredFlags = redFlags.filter(rf => {
    const matchesSearch = 
      rf.redFlagNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rf.redFlagDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rf.lineAreaName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rf.closureResponsibility.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rf.mfName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || rf.status === statusFilter;
    const matchesType = typeFilter === 'All' || rf.redFlagType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate high-level stats
  const totalCount = redFlags.length;
  const openCount = redFlags.filter(r => r.status === 'Open').length;
  const inProgressCount = redFlags.filter(r => r.status === 'In-Progress').length;
  const closedCount = redFlags.filter(r => r.status === 'Closed').length;

  // Custom photo upload handlers
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'raise' | 'close') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (field === 'raise') {
          setNewRf(prev => ({ ...prev, evidencePhoto: reader.result as string }));
        } else {
          setClosureForm(prev => ({ ...prev, closureEvidence: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="red-flag-module">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <Flag className="w-8 h-8 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">🚩 Quality & Process Red Flag Portal</h2>
              <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono">QA Authority</span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              "First-Time Right" Guard. Raise Red Flags on any critical deviation; assigned owners must document actions to achieve secure closure.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowRaiseModal(true)}
          className="flex items-center justify-center space-x-2 bg-rose-600 text-white px-5 py-3 rounded-xl text-xs font-black hover:bg-rose-700 transition shadow-sm shrink-0 uppercase tracking-wider font-mono"
        >
          <Plus className="w-4 h-4" />
          <span>Raise New Red Flag</span>
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Red Flags</span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-1 block">{totalCount}</span>
          </div>
          <div className="p-3 bg-slate-50 text-slate-500 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-rose-200 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-bold text-rose-500 uppercase tracking-wider font-mono">🚨 Open Alerts</span>
            <span className="text-2xl font-black text-rose-600 font-mono mt-1 block">{openCount}</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-500 rounded-xl">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-white border border-amber-200 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-bold text-amber-500 uppercase tracking-wider font-mono">⏳ In-Progress</span>
            <span className="text-2xl font-black text-amber-600 font-mono mt-1 block">{inProgressCount}</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-emerald-200 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider font-mono">✓ Resolved / Closed</span>
            <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">{closedCount}</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Filter and Register Search Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search flag no, description, owner..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          
          {/* Status Filter */}
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-150 shrink-0">
            {(['All', 'Open', 'In-Progress', 'Closed'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wide uppercase transition-all ${
                  statusFilter === tab 
                    ? 'bg-white text-slate-800 shadow-xs' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Type Filter Dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-bold font-mono text-slate-600 px-3 py-1.5 rounded-xl focus:bg-white focus:outline-none"
          >
            <option value="All">ALL TYPES</option>
            <option value="Quality">QUALITY</option>
            <option value="Process">PROCESS</option>
            <option value="Machine">MACHINE</option>
            <option value="Safety">SAFETY</option>
            <option value="Material">MATERIAL</option>
          </select>

        </div>
      </div>

      {/* Main Grid: Spreadsheet register list */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-wider font-mono font-black text-[10px]">
                <th className="px-4 py-3 text-center">SR No</th>
                <th className="px-4 py-3">Red Flag No</th>
                <th className="px-4 py-3">Raised Date</th>
                <th className="px-4 py-3">MF / Area</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Responsible Dept</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Assigned Closure</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredFlags.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400 font-mono">
                    No matching Red Flag reports found on the shopfloor register.
                  </td>
                </tr>
              ) : (
                filteredFlags.map((rf) => (
                  <tr 
                    key={rf.id} 
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                    onClick={() => {
                      setSelectedRedFlag(rf);
                      setIsClosingActionMode(false);
                      // Seed closure form
                      setClosureForm({
                        immediateActionTaken: rf.immediateActionTaken || '',
                        actionTakenBy: rf.actionTakenBy || '',
                        actionTakenDate: rf.actionTakenDate || new Date().toISOString().split('T')[0],
                        systematicPermanentAction: rf.systematicPermanentAction || '',
                        closureDate: rf.closureDate || new Date().toISOString().split('T')[0],
                        status: (rf.status === 'Closed' ? 'Closed' : 'Closed') as any,
                        closureEvidence: rf.closureEvidence || ''
                      });
                    }}
                  >
                    <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-500">
                      {rf.srNo}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-black text-slate-900">
                      {rf.redFlagNo}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono">
                      {rf.raisedDate}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-800">{rf.mfName}</div>
                      <div className="text-[10px] text-slate-400 font-medium font-mono">{rf.lineAreaName}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono tracking-wider ${
                        rf.redFlagType === 'Quality' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                        rf.redFlagType === 'Safety' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        rf.redFlagType === 'Machine' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                        'bg-slate-50 text-slate-700'
                      }`}>
                        {rf.redFlagType.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-600">
                      {rf.responsibleDepartment}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      <p className="line-clamp-2 text-slate-600 font-medium">{rf.redFlagDescription}</p>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-700 font-mono">
                      👤 {rf.closureResponsibility || 'Unassigned'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-black font-mono ${
                        rf.status === 'Open' ? 'bg-rose-50 border border-rose-200 text-rose-600 animate-pulse' :
                        rf.status === 'In-Progress' ? 'bg-amber-50 border border-amber-200 text-amber-600' :
                        'bg-emerald-50 border border-emerald-200 text-emerald-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          rf.status === 'Open' ? 'bg-rose-500' :
                          rf.status === 'In-Progress' ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`} />
                        <span>{rf.status.toUpperCase()}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedRedFlag(rf);
                          setIsClosingActionMode(true);
                          setClosureForm({
                            immediateActionTaken: rf.immediateActionTaken || '',
                            actionTakenBy: rf.actionTakenBy || '',
                            actionTakenDate: rf.actionTakenDate || new Date().toISOString().split('T')[0],
                            systematicPermanentAction: rf.systematicPermanentAction || '',
                            closureDate: rf.closureDate || new Date().toISOString().split('T')[0],
                            status: 'Closed',
                            closureEvidence: rf.closureEvidence || ''
                          });
                        }}
                        disabled={rf.status === 'Closed'}
                        className={`text-[10px] font-bold font-mono px-3 py-1.5 rounded-lg border uppercase ${
                          rf.status === 'Closed' 
                            ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' 
                            : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {rf.status === 'Closed' ? '✓ Closed' : '⚡ Resolve'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: RAISE A NEW RED FLAG (QA / Anyone can raise) */}
      {showRaiseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Flag className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-black uppercase tracking-wider font-mono">Raise Shopfloor Red Flag (QA Stop)</h3>
              </div>
              <button onClick={() => setShowRaiseModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRaiseSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Minifactory Unit</label>
                  <select
                    value={newRf.mfName}
                    onChange={(e) => setNewRf(prev => ({ ...prev, mfName: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="MF1">MF1 (Vacuum & Oil Pump)</option>
                    <option value="MF2">MF2 (EGR Products)</option>
                    <option value="MF3">MF3 (BPV Products)</option>
                    <option value="Machining">Machining</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Line / Area</label>
                  <input
                    type="text"
                    value={newRf.lineAreaName}
                    onChange={(e) => setNewRf(prev => ({ ...prev, lineAreaName: e.target.value }))}
                    placeholder="e.g. Assembly Line A (Pune)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Model Name / Family</label>
                  <input
                    type="text"
                    value={newRf.modelName}
                    onChange={(e) => setNewRf(prev => ({ ...prev, modelName: e.target.value }))}
                    placeholder="e.g. SUV-500"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Station / Jig Name</label>
                  <input
                    type="text"
                    value={newRf.stationName}
                    onChange={(e) => setNewRf(prev => ({ ...prev, stationName: e.target.value }))}
                    placeholder="e.g. Torqueing Station ST-4"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Red Flag Type</label>
                  <select
                    value={newRf.redFlagType}
                    onChange={(e) => setNewRf(prev => ({ ...prev, redFlagType: e.target.value as any }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="Quality">Quality Deviation</option>
                    <option value="Process">Process Non-Compliance</option>
                    <option value="Machine">Machine / Tool Fault</option>
                    <option value="Safety">Safety Hazard</option>
                    <option value="Material">Material Part Defect</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Sub Type / Symptom</label>
                  <input
                    type="text"
                    value={newRf.redFlagSubType}
                    onChange={(e) => setNewRf(prev => ({ ...prev, redFlagSubType: e.target.value }))}
                    placeholder="e.g. Dimensional / Under-torque"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Responsible Dept</label>
                  <select
                    value={newRf.responsibleDepartment}
                    onChange={(e) => setNewRf(prev => ({ ...prev, responsibleDepartment: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="Production">Production</option>
                    <option value="QA">Quality Assurance</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Planning">Planning</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Occurance Frequency</label>
                  <select
                    value={newRf.repetitiveOccurrence}
                    onChange={(e) => setNewRf(prev => ({ ...prev, repetitiveOccurrence: e.target.value as any }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                  >
                    <option value="First Time">First Time Occurance</option>
                    <option value="Repetitive">Repetitive Occurance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Team Leader</label>
                  <input
                    type="text"
                    value={newRf.teamLeader}
                    onChange={(e) => setNewRf(prev => ({ ...prev, teamLeader: e.target.value }))}
                    placeholder="e.g. Rajesh Patil"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Target Closure Date</label>
                  <input
                    type="date"
                    value={newRf.targetDate}
                    onChange={(e) => setNewRf(prev => ({ ...prev, targetDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Assign closure responsibility (Team Member)</label>
                <input
                  type="text"
                  value={newRf.closureResponsibility}
                  onChange={(e) => setNewRf(prev => ({ ...prev, closureResponsibility: e.target.value }))}
                  placeholder="Who is responsible for closing this flag? e.g. Suresh Kumar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none font-bold placeholder-rose-300"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Red Flag Description (The Defect Details)</label>
                <textarea
                  value={newRf.redFlagDescription}
                  onChange={(e) => setNewRf(prev => ({ ...prev, redFlagDescription: e.target.value }))}
                  rows={3}
                  placeholder="Describe the exact quality deviation or critical safety/process issue detected..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                />
              </div>

              {/* Photo Upload Box */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Defect Evidence Photo (Optional)</label>
                <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-dashed border-slate-300">
                  <div className="relative shrink-0">
                    {newRf.evidencePhoto ? (
                      <img src={newRf.evidencePhoto} className="w-14 h-14 object-cover rounded-lg border" alt="Evidence" />
                    ) : (
                      <div className="w-14 h-14 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400">
                        <Camera className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setCameraTarget('raise')}
                        className="text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2.5 py-1 rounded border border-emerald-300 transition flex items-center space-x-1 cursor-pointer"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Take Photo</span>
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, 'raise')}
                        className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                      />
                    </div>
                    <span className="block text-[9px] text-slate-400">Take a photo with camera or upload a JPG/PNG snapshot of the defect.</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRaiseModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider font-mono"
                >
                  🚩 RAISE RED FLAG
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DETAIL INSPECT & RESOLUTION WORKSPACE */}
      {selectedRedFlag && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className={`text-white px-6 py-4 flex items-center justify-between border-b ${
              selectedRedFlag.status === 'Closed' ? 'bg-emerald-900 border-emerald-800' : 'bg-rose-950 border-rose-900'
            }`}>
              <div className="flex items-center space-x-2">
                <Flag className="w-5 h-5 text-rose-500 animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-wider font-mono">
                  RED FLAG ACTION SHEET: {selectedRedFlag.redFlagNo}
                </h3>
              </div>
              <button onClick={() => setSelectedRedFlag(null)} className="text-slate-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* Top Banner details */}
              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Raised Date</span>
                  <span className="font-bold text-slate-700 font-mono text-xs">{selectedRedFlag.raisedDate}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Responsible Dept</span>
                  <span className="font-black text-slate-800 uppercase text-xs">{selectedRedFlag.responsibleDepartment}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Current Status</span>
                  <span className={`font-black uppercase text-xs ${
                    selectedRedFlag.status === 'Open' ? 'text-rose-600' : 
                    selectedRedFlag.status === 'In-Progress' ? 'text-amber-500' : 'text-emerald-600'
                  }`}>{selectedRedFlag.status}</span>
                </div>
              </div>

              {/* The Issue Block */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono border-b pb-1">1. Shopfloor Defect Description</h4>
                <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl space-y-2">
                  <p className="text-xs font-bold text-slate-700">{selectedRedFlag.redFlagDescription}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-500 pt-2 border-t border-rose-100/50">
                    <div>
                      <span className="font-bold">Plant Area:</span> {selectedRedFlag.mfName} • {selectedRedFlag.lineAreaName}
                    </div>
                    <div>
                      <span className="font-bold">Machine/Station:</span> {selectedRedFlag.stationName} ({selectedRedFlag.modelName})
                    </div>
                    <div>
                      <span className="font-bold">Team Leader:</span> {selectedRedFlag.teamLeader}
                    </div>
                    <div>
                      <span className="font-bold">Assigned Closure Owner:</span> <span className="font-bold text-indigo-600">{selectedRedFlag.closureResponsibility}</span>
                    </div>
                  </div>

                  {selectedRedFlag.evidencePhoto && (
                    <div className="mt-3">
                      <span className="block text-[10px] font-bold text-slate-400 mb-1">RAISED EVIDENCE PHOTO:</span>
                      <img src={selectedRedFlag.evidencePhoto} className="max-h-40 rounded-xl border object-contain bg-black" alt="Raised Evidence" />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Close Area */}
              {selectedRedFlag.status !== 'Closed' && !isClosingActionMode ? (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-center text-center space-y-3">
                  <p className="text-xs font-medium text-slate-500 max-w-sm">
                    Are you <strong>{selectedRedFlag.closureResponsibility || 'the assigned owner'}</strong>? Click below to record immediate actions and systematically close this Red Flag.
                  </p>
                  <button
                    onClick={() => setIsClosingActionMode(true)}
                    className="bg-slate-900 text-white hover:bg-slate-800 font-bold font-mono text-xs px-5 py-2.5 rounded-xl uppercase tracking-wider"
                  >
                    ⚡ ENTER RESOLUTION & CLOSE FLAG
                  </button>
                </div>
              ) : null}

              {/* Closure View: If closed, show actions. If in closure mode, show the form */}
              {selectedRedFlag.status === 'Closed' ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono border-b pb-1">2. Permanent Resolution Details</h4>
                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl space-y-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block font-mono">Immediate Action Taken</span>
                      <p className="font-medium text-slate-700 mt-0.5">{selectedRedFlag.immediateActionTaken}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block font-mono">Action Taken By</span>
                        <p className="font-bold text-slate-700 mt-0.5">👤 {selectedRedFlag.actionTakenBy}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block font-mono">Resolution Date</span>
                        <p className="font-bold text-slate-700 font-mono mt-0.5">📅 {selectedRedFlag.actionTakenDate}</p>
                      </div>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block font-mono">Systematic Permanent Action (Prevention of Recurrence)</span>
                      <p className="font-medium text-slate-700 mt-0.5">{selectedRedFlag.systematicPermanentAction}</p>
                    </div>

                    {selectedRedFlag.closureEvidence && (
                      <div className="mt-3">
                        <span className="block text-[9px] font-bold text-slate-400 mb-1">CLOSURE VERIFICATION PHOTO:</span>
                        <img src={selectedRedFlag.closureEvidence} className="max-h-40 rounded-xl border object-contain bg-black" alt="Closure Evidence" />
                      </div>
                    )}
                  </div>
                </div>
              ) : isClosingActionMode ? (
                <form onSubmit={handleClosureSubmit} className="space-y-4 border-t pt-4">
                  <h4 className="text-xs font-black text-rose-800 uppercase tracking-wider font-mono">⚡ Log Permanent Closure (Action Block)</h4>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Immediate Corrective Action Taken (Containment)</label>
                    <textarea
                      value={closureForm.immediateActionTaken}
                      onChange={(e) => setClosureForm(prev => ({ ...prev, immediateActionTaken: e.target.value }))}
                      rows={2}
                      placeholder="e.g. Swapped drill tool, recalibrated torque sensor to zero-deviation..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Action Taken By (Sign-off Name)</label>
                      <input
                        type="text"
                        value={closureForm.actionTakenBy}
                        onChange={(e) => setClosureForm(prev => ({ ...prev, actionTakenBy: e.target.value }))}
                        placeholder="e.g. Suresh Kumar"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none font-bold text-indigo-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Action Date</label>
                      <input
                        type="date"
                        value={closureForm.actionTakenDate}
                        onChange={(e) => setClosureForm(prev => ({ ...prev, actionTakenDate: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Systematic Permanent Action (Poka-Yoke / standard change to prevent recurrence)</label>
                    <textarea
                      value={closureForm.systematicPermanentAction}
                      onChange={(e) => setClosureForm(prev => ({ ...prev, systematicPermanentAction: e.target.value }))}
                      rows={3}
                      placeholder="e.g. Installed hardware limit switch, updated SOP-04 manual with visual check guidelines..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Closure Photo */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Countermeasure Evidence Photo (Optional)</label>
                    <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-dashed border-slate-300">
                      <div className="relative shrink-0">
                        {closureForm.closureEvidence ? (
                          <img src={closureForm.closureEvidence} className="w-14 h-14 object-cover rounded-lg border" alt="Closure Evidence" />
                        ) : (
                          <div className="w-14 h-14 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400">
                            <Camera className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setCameraTarget('close')}
                            className="text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2.5 py-1 rounded border border-emerald-300 transition flex items-center space-x-1 cursor-pointer"
                          >
                            <Camera className="w-3 h-3" />
                            <span>Take Photo</span>
                          </button>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(e, 'close')}
                            className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                          />
                        </div>
                        <span className="block text-[9px] text-slate-400">Take a photo with camera or upload a snapshot confirming resolution.</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsClosingActionMode(false)}
                      className="bg-slate-150 hover:bg-slate-250 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider font-mono"
                    >
                      ✓ CONFIRM RESOLUTION & CLOSE RED FLAG
                    </button>
                  </div>
                </form>
              ) : null}

            </div>
          </div>
        </div>
      )}

      <CameraModal
        isOpen={cameraTarget !== null}
        onClose={() => setCameraTarget(null)}
        onCapture={(img) => {
          if (cameraTarget === 'raise') {
            setNewRf(prev => ({ ...prev, evidencePhoto: img }));
          } else if (cameraTarget === 'close') {
            setClosureForm(prev => ({ ...prev, closureEvidence: img }));
          }
        }}
        title={`Take Red Flag ${cameraTarget === 'raise' ? 'Defect' : 'Resolution'} Photo`}
      />

    </div>
  );
}
