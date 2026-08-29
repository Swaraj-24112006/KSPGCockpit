import React, { useState } from 'react';
import { Kaizen, KaizenImpactAssessment, ImpactItem, AllocatedResource } from '../types';
import { 
  ShieldCheck, 
  Settings, 
  FileText, 
  Users, 
  UserPlus, 
  CheckCircle2, 
  X, 
  Plus, 
  Trash2, 
  Save, 
  Send, 
  UserCheck, 
  ClipboardList,
  Flame,
  Check,
  ArrowLeft,
  Printer,
  Download,
  Loader2
} from 'lucide-react';
import { downloadElementAsPdf, triggerA4Print } from '../shared/utils/pdfExporter';

interface KaizenImpactModalProps {
  kaizen: Kaizen;
  onClose: () => void;
  onUpdateKaizen: (id: string, updatedFields: Partial<Kaizen>) => void;
  mode?: 'review' | 'closure'; // 'review' for committee allocation, 'closure' for execution/signoff
}

export default function KaizenImpactModal({
  kaizen,
  onClose,
  onUpdateKaizen,
  mode = 'closure'
}: KaizenImpactModalProps) {
  // Existing or default impact assessment state
  const defaultImpacts: KaizenImpactAssessment = kaizen.impactAssessment || {
    decidedInReview: false,
    fiveMChange: {
      required: true,
      description: 'Check 5M (Man, Machine, Material, Method, Measurement) changes & revise standard parameters',
      assignedTo: kaizen.ideaBy || 'Kaizen Initiator',
      status: 'Pending',
      notes: ''
    },
    safetyImpact: {
      required: true,
      description: 'Perform EHS risk assessment & safety SOP check',
      assignedTo: kaizen.ideaBy || 'Kaizen Initiator',
      status: 'Pending',
      notes: ''
    },
    pfdUpdate: {
      required: true,
      description: 'Revise Process Flow Diagram (PFD) drawing',
      assignedTo: kaizen.ideaBy || 'Kaizen Initiator',
      status: 'Pending',
      notes: ''
    },
    pfmeaUpdate: {
      required: true,
      description: 'Update PFMEA failure mode RPN score & control measures',
      assignedTo: kaizen.ideaBy || 'Kaizen Initiator',
      status: 'Pending',
      notes: ''
    },
    allocatedResources: [],
    overallClosureStatus: 'In-Progress'
  };

  const [impactData, setImpactData] = useState<KaizenImpactAssessment>(defaultImpacts);
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  // User logged-in persona for submitting sign-off
  const [currentWorker, setCurrentWorker] = useState<string>(kaizen.ideaBy || 'Kaizen Initiator');

  // New resource allocation form state
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceRole, setNewResourceRole] = useState('Quality Engineer');
  const [newResourceTask, setNewResourceTask] = useState('PFMEA & Quality Inspection Update');

  // Success message toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Toggle item requirement
  const toggleRequired = (key: 'fiveMChange' | 'safetyImpact' | 'pfdUpdate' | 'pfmeaUpdate') => {
    setImpactData(prev => {
      const item = prev[key];
      const newRequired = !item.required;
      return {
        ...prev,
        [key]: {
          ...item,
          required: newRequired,
          status: newRequired ? (item.status === 'Not Required' ? 'Pending' : item.status) : 'Not Required'
        }
      };
    });
  };

  // Update impact item details
  const updateImpactItem = (
    key: 'fiveMChange' | 'safetyImpact' | 'pfdUpdate' | 'pfmeaUpdate',
    fields: Partial<ImpactItem>
  ) => {
    setImpactData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...fields
      }
    }));
  };

  // Add helper resource
  const handleAddResource = () => {
    if (!newResourceName.trim()) return;
    const newRes: AllocatedResource = {
      id: `res-${Date.now()}`,
      name: newResourceName.trim(),
      role: newResourceRole.trim(),
      taskAssigned: newResourceTask.trim()
    };
    setImpactData(prev => ({
      ...prev,
      allocatedResources: [...prev.allocatedResources, newRes]
    }));
    setNewResourceName('');
    showToast(`Allocated resource ${newRes.name} for ${newRes.taskAssigned}`);
  };

  // Remove helper resource
  const handleRemoveResource = (id: string) => {
    setImpactData(prev => ({
      ...prev,
      allocatedResources: prev.allocatedResources.filter(r => r.id !== id)
    }));
  };

  // Mark item as complete by current worker
  const handleCompleteItem = (key: 'fiveMChange' | 'safetyImpact' | 'pfdUpdate' | 'pfmeaUpdate') => {
    const today = new Date().toISOString().split('T')[0];
    updateImpactItem(key, {
      status: 'Completed',
      completedBy: currentWorker,
      completedDate: today
    });
    showToast(`Marked ${key.toUpperCase()} as COMPLETED by ${currentWorker}`);
  };

  // Save Review Meeting Assessment Decisions
  const handleSaveAssessment = () => {
    const updated: KaizenImpactAssessment = {
      ...impactData,
      decidedInReview: true,
      reviewedDate: new Date().toISOString().split('T')[0],
      reviewedBy: 'CFT Committee Lead',
      overallClosureStatus: impactData.overallClosureStatus === 'Fully Closed' ? 'Fully Closed' : 'Actions Allocated'
    };

    onUpdateKaizen(kaizen.id, {
      impactAssessment: updated
    });
    showToast(`Review decisions & resource allocations saved for Kaizen ${kaizen.srNo}!`);
  };

  // Final submit closure
  const handleSubmitFinalClosure = () => {
    const today = new Date().toISOString().split('T')[0];
    const updated: KaizenImpactAssessment = {
      ...impactData,
      overallClosureStatus: 'Fully Closed',
      closedBy: currentWorker,
      closureDate: today,
      closureRemarks: `All 5M, Safety, PFD, and PFMEA impacts fully audited and completed by ${currentWorker}.`
    };

    onUpdateKaizen(kaizen.id, {
      impactAssessment: updated
    });
    showToast(`🏆 Kaizen ${kaizen.srNo} Process Impact Closure successfully submitted and finalized!`);
    setTimeout(() => onClose(), 1200);
  };

  // Export A4 PDF
  const handleDownloadPdf = async () => {
    setIsPdfExporting(true);
    await downloadElementAsPdf('fivem-impact-sheet-container', {
      filename: `5M_Impact_Sheet_${kaizen.srNo}.pdf`,
      orientation: 'landscape',
      format: 'a4'
    });
    setIsPdfExporting(false);
  };

  // Compute stats
  const items = [
    { key: 'fiveMChange' as const, label: '5M Changes (Man, Machine, Material, Method, Measurement)', icon: Settings, color: 'text-amber-500' },
    { key: 'safetyImpact' as const, label: 'Safety & EHS Risk Evaluation', icon: ShieldCheck, color: 'text-emerald-500' },
    { key: 'pfdUpdate' as const, label: 'Process Flow Diagram (PFD) Revision', icon: FileText, color: 'text-indigo-500' },
    { key: 'pfmeaUpdate' as const, label: 'PFMEA RPN Score & Failure Mode Update', icon: ClipboardList, color: 'text-violet-500' }
  ];

  const totalRequired = items.filter(i => impactData[i.key].required).length;
  const totalCompleted = items.filter(i => impactData[i.key].required && impactData[i.key].status === 'Completed').length;
  const isAllCompleted = totalRequired > 0 && totalCompleted === totalRequired;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999] flex items-start justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-slate-100 rounded-3xl max-w-5xl w-full p-4 sm:p-6 md:p-8 shadow-2xl border border-slate-300 relative space-y-6 my-4 text-slate-900 animate-fade-in">
        
        {/* Toast alert */}
        {toastMsg && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] bg-slate-900 text-emerald-400 border border-emerald-500 px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-xs font-bold font-mono animate-bounce">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* TOP CONTROL HEADER WITH BACK BUTTON */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* BACK TO COMMITTEE REVIEW BUTTON */}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-mono font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2.5 cursor-pointer border border-slate-700 shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>← Back to Committee Review</span>
          </button>

          <div className="flex items-center space-x-2 flex-wrap justify-end">
            {/* Download A4 PDF */}
            <button
              type="button"
              disabled={isPdfExporting}
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 bg-violet-700 hover:bg-violet-600 active:scale-95 text-white font-mono font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-2 cursor-pointer border border-violet-500"
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

            {/* Print A4 Sheet */}
            <button
              type="button"
              onClick={() => triggerA4Print('fivem-impact-sheet-container', `5M Impact Sheet - ${kaizen.srNo}`)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-mono font-black text-xs rounded-xl shadow-xs transition flex items-center space-x-2 cursor-pointer border border-amber-300"
            >
              <Printer className="w-4 h-4" />
              <span>PRINT A4 SHEET</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* COMBINED SINGLE SHEET CONTAINER (EXPORTABLE TO A4 PDF) */}
        <div 
          id="fivem-impact-sheet-container" 
          className="bg-white rounded-3xl p-6 md:p-8 shadow-lg border border-slate-300 space-y-6 text-slate-900"
        >
          {/* SHEET FORMAL HEADER */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="bg-amber-500 text-slate-950 text-[11px] font-mono font-black px-3 py-0.5 rounded-md uppercase">
                  5M & PROCESS IMPACT SHEET
                </span>
                <span className="bg-slate-900 text-white text-[11px] font-mono font-black px-2.5 py-0.5 rounded-md uppercase">
                  {kaizen.srNo}
                </span>
                <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md uppercase ${
                  impactData.overallClosureStatus === 'Fully Closed'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {impactData.overallClosureStatus || 'In-Progress'}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black font-display text-slate-950">
                Post-Kaizen Process Impact Assessment & Closure
              </h2>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Consolidated single-sheet evaluation for <strong>5M Changes</strong>, <strong>Safety Risk</strong>, <strong>PFD</strong>, and <strong>PFMEA</strong> updates.
              </p>
            </div>

            <div className="bg-slate-900 text-white rounded-2xl p-3 text-right font-mono shrink-0 border border-slate-800">
              <span className="text-[10px] text-amber-400 font-bold block uppercase">Review Completion Progress</span>
              <span className="text-lg font-black text-emerald-400">{totalCompleted} / {totalRequired} Items Signed Off</span>
            </div>
          </div>

          {/* KAIZEN METADATA BANNER */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 text-xs space-y-2 border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div>
                <span className="text-slate-400 text-[10px] font-mono block">Kaizen Title:</span>
                <span className="font-bold text-amber-300 text-sm">{kaizen.title}</span>
              </div>
              <div className="sm:text-right">
                <span className="text-slate-400 text-[10px] font-mono block">Kaizen Initiator:</span>
                <span className="font-mono font-bold text-emerald-400 text-xs">{kaizen.ideaBy}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-300 pt-1">
              <div><span className="text-slate-500">Minifactory:</span> <strong className="text-white">{kaizen.minifactory}</strong></div>
              <div><span className="text-slate-500">Location:</span> <strong className="text-white">{kaizen.location}</strong></div>
              <div><span className="text-slate-500">Machine/Equipment:</span> <strong className="text-white">{kaizen.machine}</strong></div>
              <div><span className="text-slate-500">CFT Status:</span> <strong className="text-amber-400">{kaizen.status}</strong></div>
            </div>
          </div>

          {/* SECTION 1: 5M, SAFETY, PFD & PFMEA IMPACT MATRIX */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700">
                  <Flame className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black font-mono text-slate-900 uppercase tracking-wide">
                  1. Committee Review Matrix (5M, Safety, PFD & PFMEA)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                Toggle requirement & assign actions
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map(item => {
                const data = impactData[item.key];
                const IconComp = item.icon;

                return (
                  <div key={item.key} className={`border-2 rounded-2xl p-4 transition ${
                    data.required ? 'bg-white border-slate-300 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <IconComp className={`w-5 h-5 ${item.color}`} />
                        <h4 className="text-xs font-bold text-slate-900 font-mono uppercase">
                          {item.label}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleRequired(item.key)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold transition cursor-pointer ${
                          data.required
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-200 text-slate-600 border border-slate-300'
                        }`}
                      >
                        {data.required ? '✓ Impact Needed' : '✕ Not Required'}
                      </button>
                    </div>

                    {data.required && (
                      <div className="mt-3 space-y-2.5 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">
                            Action Description / Specific Standard Update
                          </label>
                          <input
                            type="text"
                            value={data.description || ''}
                            onChange={(e) => updateImpactItem(item.key, { description: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                            placeholder="e.g. Update SOP drawing and operator check card"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">
                            Assigned Responsibility
                          </label>
                          <input
                            type="text"
                            value={data.assignedTo || kaizen.ideaBy}
                            onChange={(e) => updateImpactItem(item.key, { assignedTo: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: ALLOCATED SUPPORTING HELPER RESOURCES */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-700">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black font-mono text-slate-900 uppercase tracking-wide">
                  2. Allocated Helper Resources ({impactData.allocatedResources.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                Assign plant experts to assist initiator
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Quick Add Form */}
              <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold font-mono text-slate-900 uppercase flex items-center space-x-1.5">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  <span>Allocate Support Member</span>
                </h4>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-0.5">Member Name *</label>
                    <input
                      type="text"
                      value={newResourceName}
                      onChange={(e) => setNewResourceName(e.target.value)}
                      placeholder="e.g. Sunita Rao"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-0.5">Role / Dept</label>
                    <select
                      value={newResourceRole}
                      onChange={(e) => setNewResourceRole(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none text-xs font-bold"
                    >
                      <option value="Quality Engineer">Quality Engineer</option>
                      <option value="Safety Specialist">Safety Specialist</option>
                      <option value="Process Lead">Process Lead</option>
                      <option value="Tooling Specialist">Tooling Specialist</option>
                      <option value="Maintenance Engineer">Maintenance Engineer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-0.5">Assigned Task</label>
                    <input
                      type="text"
                      value={newResourceTask}
                      onChange={(e) => setNewResourceTask(e.target.value)}
                      placeholder="e.g., PFMEA Revision"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none text-xs"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddResource}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Helper to Team</span>
                </button>
              </div>

              {/* Resource Cards */}
              <div className="md:col-span-7 space-y-2">
                {impactData.allocatedResources.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500 h-full flex flex-col items-center justify-center space-y-1">
                    <Users className="w-8 h-8 text-slate-300" />
                    <span>No additional helpers allocated. <strong>{kaizen.ideaBy}</strong> handles all tasks.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {impactData.allocatedResources.map(res => (
                      <div key={res.id} className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-xs text-slate-900">{res.name}</span>
                            <span className="text-[9px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded font-bold">
                              {res.role}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-sans">
                            Task: <strong>{res.taskAssigned}</strong>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveResource(res.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: SIGN-OFF CREDENTIAL TERMINAL & EXECUTION CLOSURE */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black font-mono text-slate-900 uppercase tracking-wide">
                  3. Log Sign-Off Credentials & Execution Closure
                </h3>
              </div>

              {/* CREDENTIAL PERSONA SELECTOR */}
              <div className="flex items-center space-x-2 bg-slate-900 text-white rounded-xl px-3 py-1 text-xs">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] text-slate-400 font-mono uppercase">Role:</span>
                <select
                  value={currentWorker}
                  onChange={(e) => setCurrentWorker(e.target.value)}
                  className="bg-slate-900 text-amber-300 font-bold font-mono text-xs focus:outline-none cursor-pointer"
                >
                  <option value={kaizen.ideaBy}>{kaizen.ideaBy} (Initiator)</option>
                  {impactData.allocatedResources.map(r => (
                    <option key={r.id} value={`${r.name} (${r.role})`}>
                      {r.name} ({r.role})
                    </option>
                  ))}
                  <option value="Sanjay Patil (Safety Specialist)">Sanjay Patil (Safety Specialist)</option>
                  <option value="Sunita Rao (Quality Lead)">Sunita Rao (Quality Lead)</option>
                  <option value="Amit Mehta (Kaizen Lead)">Amit Mehta (Kaizen Lead)</option>
                </select>
              </div>
            </div>

            {/* CHECKLIST CARDS FOR EACH ITEM */}
            <div className="space-y-3">
              {items.map(item => {
                const data = impactData[item.key];
                const IconComp = item.icon;

                if (!data.required) {
                  return (
                    <div key={item.key} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center justify-between text-slate-400">
                      <div className="flex items-center space-x-2">
                        <IconComp className="w-4 h-4 text-slate-400" />
                        <span className="font-mono font-bold uppercase">{item.label}</span>
                      </div>
                      <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                        Not Required
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={item.key} className={`border-2 rounded-2xl p-4 space-y-2.5 transition ${
                    data.status === 'Completed' ? 'bg-emerald-50/40 border-emerald-300' : 'bg-white border-slate-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <IconComp className={`w-4.5 h-4.5 ${item.color}`} />
                        <h4 className="text-xs font-bold font-mono text-slate-900 uppercase">
                          {item.label}
                        </h4>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        data.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {data.status === 'Completed' ? `✓ Completed on ${data.completedDate}` : '⚡ Pending Sign-off'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 font-sans bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-0.5">
                      <div>Action Needed: <strong>{data.description || 'Action required as per committee review'}</strong></div>
                      <div className="text-[10px] text-slate-500 font-mono">Assigned Responsibility: <strong>{data.assignedTo || kaizen.ideaBy}</strong></div>
                    </div>

                    {/* CLOSURE EVIDENCE / NOTES INPUT */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">
                        Evidence / Verification Remarks:
                      </label>
                      <textarea
                        value={data.notes || ''}
                        onChange={(e) => updateImpactItem(item.key, { notes: e.target.value })}
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="e.g. Updated SOP document #SOP-5M-102 and conducted operator retraining."
                      />

                      <div className="flex justify-end pt-1">
                        {data.status === 'Completed' ? (
                          <div className="text-xs font-mono text-emerald-700 font-bold flex items-center space-x-1.5 bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Signed off by {data.completedBy}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCompleteItem(item.key)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Sign-Off & Complete Item</span>
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* FINAL CLOSURE & ACTION FOOTER BAR */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
            <div>
              <div className="text-xs font-bold text-amber-300 font-mono uppercase">
                Overall Impact Closure Progress: {totalCompleted} of {totalRequired} Completed
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAllCompleted
                  ? '🎉 All required process impacts have been signed off! Click below to finalize closure.'
                  : 'Complete all required 5M, Safety, PFD, and PFMEA items above to submit final closure.'}
              </p>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <button
                type="button"
                onClick={handleSaveAssessment}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs rounded-xl border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                disabled={!isAllCompleted}
                onClick={handleSubmitFinalClosure}
                className={`px-5 py-2.5 rounded-xl text-xs font-mono font-black transition flex items-center space-x-2 ${
                  isAllCompleted
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg hover:from-emerald-400 hover:to-teal-400 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>SUBMIT FINAL KAIZEN CLOSURE</span>
              </button>
            </div>
          </div>

        </div>

        {/* BOTTOM NAV BAR WITH BACK BUTTON */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-mono font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2.5 cursor-pointer border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>← Back to Committee Review</span>
          </button>

          <span className="text-xs text-slate-500 font-mono">
            Document ID: {kaizen.srNo}
          </span>
        </div>

      </div>
    </div>
  );
}
