import React, { useState, useEffect } from 'react';
import { RedFlag, RedFlagRole, MonthSustenanceCheck } from '../types';
import { 
  ShieldAlert, 
  Camera, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Printer, 
  Loader2, 
  Layers, 
  Calendar, 
  UserCheck, 
  PackageCheck, 
  Maximize2, 
  ZoomIn, 
  FileText, 
  Award, 
  Sparkles, 
  ExternalLink,
  ShieldCheck,
  Lock,
  Unlock,
  Check,
  ChevronDown,
  Compass,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import PhotoZoomModal from './PhotoZoomModal';
import { useRedFlag } from '../context/RedFlagContext';
import { downloadElementAsPdf, triggerA4Print } from '../utils/pdfExporter';

interface RedFlagPresentationModeProps {
  redFlag?: RedFlag;
  flag?: RedFlag;
  allRedFlags?: RedFlag[];
  flagsList?: RedFlag[];
  onClose: () => void;
  onUpdateRedFlag?: (id: string, updatedFields: Partial<RedFlag>) => void;
  onUpdateFlag?: (id: string, updatedFields: Partial<RedFlag>) => void;
  onSelectRedFlag?: (id: string) => void;
  onSelectFlag?: (flag: RedFlag) => void;
  currentRole?: RedFlagRole;
  onChangeRole?: (role: RedFlagRole) => void;
  onRoleChange?: (role: RedFlagRole) => void;
  isSidebarHidden?: boolean;
  onToggleSidebar?: () => void;
}

const REDFLAG_STAGES = [
  { 
    id: 1, 
    stageNumber: 'Stage 1', 
    title: '1. Initiator Form', 
    subtitle: 'Point-of-Defect & Problem Anomaly (T0 Photo)',
    role: 'Initiator (Originator)',
    icon: Camera,
    color: 'rose'
  },
  { 
    id: 2, 
    stageNumber: 'Stage 2', 
    title: '2. Containment Action', 
    subtitle: 'Immediate Quarantine & Containment Photo (T1 Photo)',
    role: 'Target Person',
    icon: PackageCheck,
    color: 'amber'
  },
  { 
    id: 3, 
    stageNumber: 'Stage 3', 
    title: '3. Root Cause & Permanent Action', 
    subtitle: '5-Why RCA, CAPA & Engineering Standardization',
    role: 'Target Person / CFT',
    icon: Layers,
    color: 'indigo'
  },
  { 
    id: 4, 
    stageNumber: 'Stage 4', 
    title: '4. Quality Verification', 
    subtitle: 'QA Custodian Approval & 3-Month Sustenance Audits',
    role: 'Quality Custodian',
    icon: UserCheck,
    color: 'emerald'
  }
];

export default function RedFlagPresentationMode({
  redFlag: redFlagProp,
  flag,
  allRedFlags = [],
  flagsList = [],
  onClose,
  onUpdateRedFlag,
  onUpdateFlag,
  onSelectRedFlag,
  onSelectFlag,
  currentRole = 'Quality Custodian',
  onChangeRole,
  onRoleChange,
  isSidebarHidden = false,
  onToggleSidebar
}: RedFlagPresentationModeProps) {
  // Normalize flags list and active flag safely
  const flags = flagsList.length > 0 ? flagsList : allRedFlags;
  const redFlag = flag || redFlagProp || flags[0] || ({} as RedFlag);
  
  const updateFlag = (id: string, updates: Partial<RedFlag>) => {
    if (onUpdateFlag) onUpdateFlag(id, updates);
    if (onUpdateRedFlag) onUpdateRedFlag(id, updates);
  };

  const selectFlag = (targetItem: RedFlag) => {
    if (onSelectFlag) onSelectFlag(targetItem);
    if (onSelectRedFlag) onSelectRedFlag(targetItem.id);
  };

  const [currentStep, setCurrentStep] = useState(1);
  const [activeLeftTab, setActiveLeftTab] = useState<'slides' | 'queue'>('slides');
  const [isLeftPanelHidden, setIsLeftPanelHidden] = useState(false);
  const [activeRole, setActiveRole] = useState<RedFlagRole>(currentRole);
  const { actions, showDevRoleSwitch } = useRedFlag();

  // Sync external role
  useEffect(() => {
    setActiveRole(currentRole);
  }, [currentRole]);

  const handleRoleChange = (role: RedFlagRole) => {
    setActiveRole(role);
    if (onChangeRole) onChangeRole(role);
    if (onRoleChange) onRoleChange(role);
  };

  // Photo Zoom Modal state
  const [zoomedPhoto, setZoomedPhoto] = useState<{ url: string; title: string; subtitle?: string } | null>(null);
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  // Stage 4 Quality Verification interactive state
  const [qaNotes, setQaNotes] = useState(redFlag.qaCustodianNotes || '');
  const [qaStatus, setQaStatus] = useState(redFlag.qaCustodianStatus || 'Review Pending');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  useEffect(() => {
    setQaNotes(redFlag.qaCustodianNotes || '');
    setQaStatus(redFlag.qaCustodianStatus || 'Review Pending');
  }, [redFlag.id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentStep < 4) {
        setCurrentStep(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 1) {
        setCurrentStep(prev => prev - 1);
      } else if (e.key === 'Escape') {
        if (zoomedPhoto) setZoomedPhoto(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, onClose, zoomedPhoto]);

  // PDF Download handler
  const handleDownloadPdf = async () => {
    setIsPdfExporting(true);
    await downloadElementAsPdf('redflag-presentation-slide', {
      filename: `RedFlag_${redFlag.redFlagNo}_Stage_${currentStep}.pdf`,
      orientation: 'landscape',
      format: 'a4'
    });
    setIsPdfExporting(false);
  };

  // Role permissions check
  const isSuperAdmin = activeRole === 'Plant Head';
  const canEditStage1 = isSuperAdmin || activeRole === 'Initiator';
  const canEditStage2 = isSuperAdmin || activeRole === 'Target Person';
  const canEditStage3 = isSuperAdmin || activeRole === 'Target Person';
  const canEditStage4 = isSuperAdmin || activeRole === 'Quality Custodian';

  // Quality Verification Actions
  const handleVerifyContainment = async () => {
    try {
      const updated = await actions.approveContainment(redFlag.id, qaNotes || 'Immediate containment and physical quarantine verified on shopfloor.', redFlag.rowVersion);
      updateFlag(redFlag.id, updated);
      setActionSuccessMsg('Containment & Quarantine Approved by Quality Custodian');
      setTimeout(() => setActionSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error('Verify containment failed:', err);
      setActionSuccessMsg(`Error: ${err.message || 'Containment verification failed.'}`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  };

  const handleStartSustenance = async () => {
    try {
      const updated = await actions.startSustenance(redFlag.id, { notes: qaNotes || 'CAPA verified. Initiated 90-day 3-Month Sustenance watch period. Point kept OPEN.' }, redFlag.rowVersion);
      updateFlag(redFlag.id, updated);
      setActionSuccessMsg('3-Month Sustenance Initiated — Point Kept OPEN for 90 Days');
      setTimeout(() => setActionSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error('Start sustenance failed:', err);
      setActionSuccessMsg(`Error: ${err.message || 'Failed to start sustenance.'}`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  };

  const handleUpdateMonthAudit = async (month: 1 | 2 | 3, status: 'Passed' | 'Recurrence Detected') => {
    try {
      const updated = await actions.logAudit(redFlag.id, month, {
        status,
        observations: `Month ${month} Sustenance check ${status}. Audited by Quality Custodian.`
      }, redFlag.rowVersion);
      updateFlag(redFlag.id, updated);
      setActionSuccessMsg(`Month ${month} Audit Logged: ${status}`);
      setTimeout(() => setActionSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error('Update month audit failed:', err);
      setActionSuccessMsg(`Error: ${err.message || 'Audit logging failed.'}`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  };

  const currentRedFlagIndex = flags.findIndex(r => r.id === redFlag.id);

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md text-slate-900 z-[9999] flex flex-col md:flex-row overflow-hidden animate-fade-in font-sans">
      
      {/* ========================================================================
          LEFT SIDE PANEL: SLIDES SELECTOR & RED FLAG QUEUE
         ======================================================================== */}
      {!isLeftPanelHidden && (
        <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-300 flex flex-col shrink-0 shadow-2xl z-20 overflow-hidden animate-fade-in">
          
          {/* Left Panel Header */}
          <div className="p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 text-white shrink-0 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-rose-600 rounded-xl shadow-xs">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-rose-300 font-mono block">
                    RED FLAG 4-STAGE PRESENTATION
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-300">[{redFlag.redFlagNo}]</span>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setIsLeftPanelHidden(true)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                  title="Hide Left Window (Maximize Slide)"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                  title="Close Presentation Mode (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h2 className="text-sm font-bold text-white line-clamp-2 leading-snug">
              {redFlag.redFlagDescription || 'Shopfloor Non-Conformance'}
            </h2>

            <div className="mt-3 pt-3 border-t border-rose-900/60 grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div>
                <span className="text-rose-300 block text-[9px] uppercase">Initiator (T0)</span>
                <span className="font-bold text-white truncate block">{redFlag.raisedBy}</span>
              </div>
              <div>
                <span className="text-amber-300 block text-[9px] uppercase">Target Person (T1)</span>
                <span className="font-bold text-white truncate block">{redFlag.targetPerson || redFlag.targetDepartment}</span>
              </div>
            </div>

            {/* Status & Custodian Badge */}
            <div className="mt-3 flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/10 text-xs font-mono">
              <div>
                <span className="text-[9px] uppercase text-slate-400 block">Status</span>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                  redFlag.status === 'Open'
                    ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                    : redFlag.status === 'Contained'
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                    : redFlag.status === 'Under-Sustenance'
                    ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40'
                    : 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {redFlag.status}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase text-slate-400 block">QA Custodian</span>
                <span className="font-bold text-rose-300 text-[10px] truncate max-w-[120px] block">
                  {redFlag.qaCustodian || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Selector: Slides vs Queue */}
          <div className="flex border-b border-slate-200 bg-slate-50 p-1 shrink-0 font-mono text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveLeftTab('slides')}
              className={`flex-1 py-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                activeLeftTab === 'slides'
                  ? 'bg-white text-rose-700 shadow-xs border border-slate-200 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📜 4 Stages</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveLeftTab('queue')}
              className={`flex-1 py-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                activeLeftTab === 'queue'
                  ? 'bg-white text-rose-700 shadow-xs border border-slate-200 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📥 Queue ({allRedFlags.length})</span>
            </button>
          </div>

          {/* Left Panel Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeLeftTab === 'slides' && (
              <div className="space-y-2 animate-fade-in">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block px-2 pt-1">
                  Select 4-Stage Presentation Slide
                </span>

                {REDFLAG_STAGES.map((step) => {
                  const isCurrent = step.id === currentStep;
                  const StepIcon = step.icon;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setCurrentStep(step.id)}
                      className={`w-full text-left p-3 rounded-xl transition border cursor-pointer flex items-start justify-between ${
                        isCurrent
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md font-bold'
                          : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start space-x-2.5 min-w-0">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black font-mono shrink-0 ${
                          isCurrent 
                            ? 'bg-rose-600 text-white' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {step.id}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate leading-snug">
                            {step.title}
                          </div>
                          <div className={`text-[10px] truncate ${isCurrent ? 'text-slate-300 font-normal' : 'text-slate-500'}`}>
                            {step.subtitle}
                          </div>
                          <span className={`text-[9px] font-mono block mt-0.5 ${
                            isCurrent ? 'text-rose-300' : 'text-slate-400'
                          }`}>
                            Role: {step.role}
                          </span>
                        </div>
                      </div>
                      <StepIcon className={`w-4 h-4 shrink-0 mt-0.5 ${
                        isCurrent ? 'text-rose-400' : 'text-slate-400'
                      }`} />
                    </button>
                  );
                })}

                {/* Role Guidance Box */}
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold font-mono text-slate-700">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Role-Based Access
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 font-black">
                      {activeRole}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {activeRole === 'Initiator' && 'You can raise & document Stage 1. Stages 2-3 are assigned to Target Person; Stage 4 to Quality Custodian.'}
                    {activeRole === 'Target Person' && 'You are authorized to execute and submit Stage 2 (Containment & Photo) & Stage 3 (Root Cause & CAPA).'}
                    {activeRole === 'Quality Custodian' && 'You hold official custody: authorized to verify containment, sign off 3-month sustenance, and close the incident.'}
                    {activeRole === 'Plant Head' && 'Super-admin: full governance and editing across all 4 stages.'}
                  </p>
                </div>
              </div>
            )}

            {activeLeftTab === 'queue' && (
              <div className="space-y-1.5 animate-fade-in">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block px-2 pt-1">
                  Red Flag Incident Queue
                </span>
                {flags.map((item) => {
                  const isSelected = item.id === redFlag.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectFlag(item)}
                      className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-rose-700">{item.redFlagNo}</span>
                        <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                          item.status === 'Open'
                            ? 'bg-rose-100 text-rose-800'
                            : item.status === 'Contained'
                            ? 'bg-amber-100 text-amber-800'
                            : item.status === 'Under-Sustenance'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="text-xs font-bold line-clamp-1 mt-1 text-slate-900">{item.stationName} - {item.lineAreaName}</div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        Target: {item.targetPerson || item.targetDepartment}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Previous / Next Red Flag in Queue Footer */}
          {flags.length > 1 && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between text-xs font-mono font-bold">
              <button
                type="button"
                disabled={currentRedFlagIndex <= 0}
                onClick={() => {
                  if (currentRedFlagIndex > 0) {
                    selectFlag(flags[currentRedFlagIndex - 1]);
                  }
                }}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 rounded-lg text-slate-700 transition cursor-pointer"
              >
                ← Prev Incident
              </button>

              <span className="text-[10px] text-slate-500">
                {currentRedFlagIndex + 1} / {flags.length}
              </span>

              <button
                type="button"
                disabled={currentRedFlagIndex >= flags.length - 1}
                onClick={() => {
                  if (currentRedFlagIndex < flags.length - 1) {
                    selectFlag(flags[currentRedFlagIndex + 1]);
                  }
                }}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 rounded-lg text-slate-700 transition cursor-pointer"
              >
                Next Incident →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================
          RIGHT MAIN PRESENTATION CANVAS
         ======================================================================== */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
        
        {/* SLIDE CANVAS HEADER BAR */}
        <div className="bg-white border-b border-slate-300 px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 shadow-xs">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-1">
              {isLeftPanelHidden && (
                <button
                  type="button"
                  onClick={() => setIsLeftPanelHidden(false)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer mr-1"
                  title="Show Left Slides & Queue Window"
                >
                  <PanelLeftOpen className="w-4 h-4 text-rose-600" />
                  <span>Show Left Panel</span>
                </button>
              )}
              <span className="text-xs font-black font-mono text-rose-700 bg-rose-100 border border-rose-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                STAGE {currentStep} OF 4
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                SFC / QA / RF-01 Presentation
              </span>
              
              {/* Active Role Selector Dropdown */}
              <div className="flex items-center space-x-1.5 ml-2 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Role:</span>
                <select
                  value={activeRole}
                  onChange={(e) => handleRoleChange(e.target.value as RedFlagRole)}
                  className="text-xs font-bold bg-transparent border-none outline-none text-slate-900 cursor-pointer"
                >
                  <option value="Initiator">Initiator (Originator)</option>
                  <option value="Target Person">Target Person (Assignee)</option>
                  <option value="Quality Custodian">Quality Custodian (QA)</option>
                  <option value="Plant Head">Plant Head (Super-Admin)</option>
                </select>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              {REDFLAG_STAGES[currentStep - 1].title}
            </h1>
            <p className="text-sm font-medium text-slate-600 mt-0.5">
              {REDFLAG_STAGES[currentStep - 1].subtitle}
            </p>
          </div>

          {/* Action Buttons & Slide Navigation Controls */}
          <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-2">
            <button
              type="button"
              disabled={isPdfExporting}
              onClick={handleDownloadPdf}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider font-mono shadow-md cursor-pointer transition flex items-center space-x-1.5"
            >
              {isPdfExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => triggerA4Print('redflag-presentation-slide', `Red Flag Slide - ${redFlag.redFlagNo}`)}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider font-mono shadow-md cursor-pointer transition flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print A4</span>
            </button>

            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className="px-3 py-2 bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-40 rounded-xl text-slate-800 border border-slate-300 font-bold text-xs transition cursor-pointer flex items-center space-x-1 shadow-xs"
            >
              <ChevronLeft className="w-4 h-4 text-rose-600" />
              <span>Prev</span>
            </button>

            <button
              type="button"
              disabled={currentStep === 4}
              onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-40 rounded-xl text-white font-black text-xs transition cursor-pointer flex items-center space-x-1 shadow-md shadow-rose-200"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Action success alert */}
        {actionSuccessMsg && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* SLIDE CANVAS BODY */}
        <div id="redflag-presentation-slide" className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          {/* ====================================================================
              SLIDE 1: STAGE 1 — INITIATOR FORM (POINT-OF-DEFECT & RAISING T0)
             ==================================================================== */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
              
              {/* Meta Info Bar */}
              <div className="bg-white border border-slate-300 rounded-2xl p-5 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono">
                <div>
                  <span className="text-slate-500 block text-xs uppercase font-bold">1A. Raised By (Initiator)</span>
                  <span className="font-bold text-slate-900 text-base">{redFlag.raisedBy}</span>
                  <span className="text-xs text-rose-700 block mt-0.5">Dept: {redFlag.raisedByDepartment}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs uppercase font-bold">1B. Raised On (Target Person)</span>
                  <span className="font-bold text-slate-900 text-base">{redFlag.targetPerson || redFlag.targetDepartment}</span>
                  <span className="text-xs text-amber-700 block mt-0.5">Target: {redFlag.targetDepartment}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs uppercase font-bold">Plant Location &amp; Machine</span>
                  <span className="font-bold text-slate-900 text-base">{redFlag.stationName}</span>
                  <span className="text-xs text-slate-600 block mt-0.5">{redFlag.lineAreaName} ({redFlag.mfName})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs uppercase font-bold">Defect Classification &amp; 5M</span>
                  <span className="font-bold text-slate-900 text-base">{redFlag.redFlagType}</span>
                  <span className="text-xs text-indigo-700 block mt-0.5">5M: {redFlag.category5M || 'Method'} · {redFlag.severity || 'Major'}</span>
                </div>
              </div>

              {/* Defect Description & Point-of-Defect Photo (T0) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Defect Anomaly Card */}
                <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-rose-800 font-mono flex items-center space-x-2 border-b border-slate-200 pb-3">
                      <ShieldAlert className="w-5 h-5 text-rose-600" />
                      <span>Point-of-Defect / Anomaly Statement</span>
                    </h3>
                    <p className="mt-4 text-base sm:text-lg font-medium text-slate-900 leading-relaxed bg-rose-50/50 p-5 rounded-xl border border-rose-100">
                      {redFlag.redFlagDescription || 'No anomaly description logged.'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold uppercase">Timestamp (T0):</span>
                      <span className="font-bold text-rose-700">{redFlag.raisedTimestamp || redFlag.raisedDate || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold uppercase">Occurrence Frequency:</span>
                      <span className="font-bold text-slate-800">{redFlag.repetitiveOccurrence || 'First Time'}</span>
                    </div>
                  </div>
                </div>

                {/* Point of Defect Photo (T0) with Zoom button */}
                <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-sm font-black uppercase text-rose-700 font-mono flex items-center gap-2">
                      <Camera className="w-4 h-4 text-rose-600" />
                      <span>Point-of-Defect Photo (Before Status - T0)</span>
                    </span>
                    {redFlag.evidencePhoto && (
                      <button
                        type="button"
                        onClick={() => setZoomedPhoto({
                          url: redFlag.evidencePhoto,
                          title: `Point-of-Defect Evidence [${redFlag.redFlagNo}]`,
                          subtitle: `Raised by ${redFlag.raisedBy} (${redFlag.raisedByDepartment}) on ${redFlag.raisedDate}`
                        })}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition cursor-pointer flex items-center gap-1 text-xs font-mono font-bold"
                        title="Zoom Photo"
                      >
                        <ZoomIn className="w-4 h-4" />
                        <span>Zoom</span>
                      </button>
                    )}
                  </div>

                  <div className="aspect-video bg-rose-50/30 rounded-xl overflow-hidden border border-rose-200 flex items-center justify-center relative group">
                    {redFlag.evidencePhoto ? (
                      <img crossOrigin="anonymous" src={redFlag.evidencePhoto}
                        alt="Defect"
                        className="w-full h-full object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
                        onClick={() => setZoomedPhoto({
                          url: redFlag.evidencePhoto,
                          title: `Point-of-Defect Evidence [${redFlag.redFlagNo}]`,
                          subtitle: `Raised by ${redFlag.raisedBy} (${redFlag.raisedByDepartment})`
                        })}
                      />
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">No Point-of-Defect Photo Uploaded</span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono flex justify-between items-center pt-1">
                    <span>* Compulsory visual evidence at detection</span>
                    <span className="text-rose-700 font-bold">Uploaded by Initiator</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ====================================================================
              SLIDE 2: STAGE 2 — CONTAINMENT ACTION & QUARANTINE (T1 PHOTO)
             ==================================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
              
              {/* Containment Overview Bar with Time Gap Badge */}
              <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-amber-700" />
                    <span className="text-xs font-black uppercase text-amber-950 font-mono tracking-wide">
                      Stage 2 Execution by Target Person: {redFlag.targetPerson || redFlag.targetDepartment}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Shift containment SLA (&lt;2h): 100% sorting, suspect lot quarantine in Red Tag bay, and uploading the <strong>Containment Photo (T1)</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-center font-mono">
                    <span className="text-[10px] text-slate-400 block uppercase">Time Gap (T0➔T1)</span>
                    <span className="text-base font-black text-amber-400">
                      {redFlag.containmentTimeGap || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Visual Proof: T0 Point of Defect vs T1 Containment Photo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Photo 1: Defect T0 */}
                <div className="bg-white border border-slate-300 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-rose-700 uppercase font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-600" />
                      1. Initiator: Point of Defect (T0)
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {redFlag.raisedTimestamp || redFlag.raisedDate}
                    </span>
                  </div>
                  <div className="aspect-video bg-rose-50/40 rounded-xl overflow-hidden border border-rose-200 flex items-center justify-center">
                    {redFlag.evidencePhoto ? (
                      <img crossOrigin="anonymous" src={redFlag.evidencePhoto} alt="T0 Defect" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-slate-400">No Photo</span>
                    )}
                  </div>
                </div>

                {/* Photo 2: Containment T1 */}
                <div className="bg-white border-2 border-emerald-300 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <span className="text-xs font-bold text-emerald-700 uppercase font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      2. Target Person: Containment Photo (T1)
                    </span>
                    {redFlag.countermeasurePhoto && (
                      <button
                        type="button"
                        onClick={() => setZoomedPhoto({
                          url: redFlag.countermeasurePhoto!,
                          title: `Target Containment Proof [${redFlag.redFlagNo}]`,
                          subtitle: `Executed by ${redFlag.actionTakenBy || redFlag.targetPerson}`
                        })}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-700 transition cursor-pointer flex items-center gap-1 text-xs font-mono font-bold"
                      >
                        <ZoomIn className="w-4 h-4" />
                        <span>Zoom</span>
                      </button>
                    )}
                  </div>
                  <div className="aspect-video bg-emerald-50/40 rounded-xl overflow-hidden border border-emerald-200 flex items-center justify-center">
                    {redFlag.countermeasurePhoto || redFlag.closureEvidence ? (
                      <img crossOrigin="anonymous" src={redFlag.countermeasurePhoto || redFlag.closureEvidence} alt="T1 Containment" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-amber-700 font-bold font-mono">Pending Target Person T1 Photo</span>
                    )}
                  </div>
                </div>

              </div>

              {/* Quarantine Controls & Immediate Containment Action */}
              <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider border-b border-slate-200 pb-2">
                  Immediate 4D Quarantine &amp; Sorting Controls Data
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-200">
                    <span className="text-[10px] font-mono uppercase text-rose-800 font-bold block">Quarantined WIP</span>
                    <span className="text-2xl font-black font-mono text-rose-700 block mt-1">{redFlag.suspectQtyQuarantined || 0} pcs</span>
                    <span className="text-[10px] text-rose-700 mt-0.5 block">Held in Red Bay</span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Quarantine Tag No</span>
                    <span className="text-base font-bold font-mono text-slate-900 block mt-1">{redFlag.quarantineTagNo || `QT-${redFlag.redFlagNo}`}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">{redFlag.quarantineLocation || '—'}</span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">100% Sorting Count</span>
                    <span className="text-base font-bold font-mono text-slate-900 block mt-1">
                      {redFlag.sortingQtyInspected || (redFlag.suspectQtyQuarantined ? redFlag.suspectQtyQuarantined * 3 : 0)} pcs
                    </span>
                    <span className="text-[10px] text-emerald-700 font-mono font-bold mt-0.5 block">
                      {redFlag.sortingQtyOk || 0} OK · {redFlag.sortingQtyRejected || 0} Scrap
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Action Taken By</span>
                    <span className="text-base font-bold text-slate-900 block mt-1">{redFlag.actionTakenBy || redFlag.targetPerson}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">Date: {redFlag.actionTakenDate || redFlag.raisedDate}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
                    Immediate Containment Description:
                  </span>
                  <p className="text-sm font-medium text-slate-900 leading-relaxed">
                    {redFlag.containmentAction || redFlag.immediateActionTaken || 'Immediate machine stop, batch quarantine, and parameter check performed.'}
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* ====================================================================
              SLIDE 3: STAGE 3 — ROOT CAUSE & PERMANENT ACTION (5-WHY & CAPA)
             ==================================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
              
              {/* 5-Why Root Cause Drill-down Ladder */}
              <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-xs font-black uppercase text-indigo-900 font-mono tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>5-Why Root Cause Analysis (Executed by Target Person / CFT)</span>
                  </h3>
                  <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold">
                    Systemic Root Cause Elimination
                  </span>
                </div>

                <div className="space-y-2.5 font-sans">
                  {[
                    { step: 'Why 1', label: 'Why did the defect occur?', val: redFlag.why1 || 'Process parameter / component slipped below minimum tolerance threshold.' },
                    { step: 'Why 2', label: 'Why did the parameter slip?', val: redFlag.why2 || 'Locking collar / clamp vibrated loose during continuous shift operation.' },
                    { step: 'Why 3', label: 'Why was it not prevented?', val: redFlag.why3 || 'Preventive maintenance check frequency was weekly rather than daily shift-start.' },
                    { step: 'Why 4', label: 'Why did standard control fail?', val: redFlag.why4 || 'No mechanical positive lock pin or sensor interlock installed on station.' },
                    { step: 'Root Cause', label: 'Systemic Root Cause (5-Why):', val: redFlag.rootCause5Why || 'Absence of fail-safe poka-yoke sensor interlock and shift-start verification standard.', isRoot: true }
                  ].map((row, idx) => (
                    <div 
                      key={row.step}
                      className={`p-3 rounded-xl border flex items-start gap-3 ${
                        row.isRoot 
                          ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20' 
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded shrink-0 ${
                        row.isRoot ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {row.step}
                      </span>
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-slate-500 block">{row.label}</span>
                        <p className={`text-xs font-bold mt-0.5 ${row.isRoot ? 'text-rose-950 font-black' : 'text-slate-800'}`}>
                          {row.val}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Permanent Corrective Action & Standardization Checkboxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* CAPA Countermeasure */}
                <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider border-b border-slate-200 pb-2">
                      Permanent Corrective Action / Poka-Yoke Deployed
                    </h3>
                    <p className="mt-3 text-sm font-semibold text-slate-800 leading-relaxed bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                      {redFlag.systematicPermanentAction || 'Implemented mechanical anti-rotation locking pin and PLC limit interlock preventing machine start if torque is outside spec.'}
                    </p>
                  </div>
                  <div className="text-xs font-mono text-slate-500 flex justify-between pt-2 border-t border-slate-100">
                    <span>Target Date: <strong className="text-slate-900">{redFlag.targetDate || 'Resolved'}</strong></span>
                    <span>Owner: <strong className="text-slate-900">{redFlag.targetPerson}</strong></span>
                  </div>
                </div>

                {/* Standardization Updates */}
                <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider border-b border-slate-200 pb-2">
                    Engineering Standardization Required
                  </h3>
                  <div className="space-y-2 pt-1 text-xs font-mono">
                    {[
                      { label: 'SOP / Work Instruction Revised', checked: redFlag.standardizationUpdates?.sopUpdated ?? true },
                      { label: 'PFMEA Failure Mode Updated', checked: redFlag.standardizationUpdates?.pfmeaUpdated ?? true },
                      { label: 'Control Plan Inspection Revised', checked: redFlag.standardizationUpdates?.controlPlanUpdated ?? true },
                      { label: '1-Point Lesson (OPL) Training Given', checked: redFlag.standardizationUpdates?.onePointLessonIssued ?? true }
                    ].map(item => (
                      <div key={item.label} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <span className="font-medium text-slate-800">{item.label}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.checked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {item.checked ? '✓ Verified' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ====================================================================
              SLIDE 4: STAGE 4 — QUALITY VERIFICATION & 3-MONTH SUSTENANCE
             ==================================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
              
              {/* Mandatory Governance Banner */}
              <div className="p-4 bg-emerald-50 border-2 border-emerald-600 rounded-2xl flex items-start gap-3 shadow-xs">
                <Calendar className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-black text-emerald-950 uppercase tracking-wide block">
                    Stage 4 Authority: Quality Custodian Verification &amp; 3-Month Sustenance
                  </span>
                  <p className="text-emerald-900 leading-relaxed">
                    Under IATF 16949 SFC governance, the Red Flag point must remain <strong>OPEN</strong> for 90 continuous days. Quality Custodian conducts audits at Month 1 (30 days), Month 2 (60 days), and Month 3 (90 days). Final closure requires Month 3 verification of zero recurrence.
                  </p>
                </div>
              </div>

              {/* 3-Month Sustenance Audit Tracker Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Month 1 */}
                <div className={`p-4 border rounded-2xl space-y-3 bg-white ${
                  redFlag.month1Check?.status === 'Passed' ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-900 font-mono">Month 1 (30 Days)</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      redFlag.month1Check?.status === 'Passed' ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {redFlag.month1Check?.status || 'Scheduled'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Target: {redFlag.month1Check?.scheduledDate || '30 days from start'}
                  </p>
                  <p className="text-xs text-slate-700">
                    Shift trials verification &amp; first-off sample check with 0 recurrence.
                  </p>
                  {canEditStage4 && (
                    <div className="pt-2 flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateMonthAudit(1, 'Passed')}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        ✓ Month 1 Passed (0 Recurrence)
                      </button>
                    </div>
                  )}
                </div>

                {/* Month 2 */}
                <div className={`p-4 border rounded-2xl space-y-3 bg-white ${
                  redFlag.month2Check?.status === 'Passed' ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-900 font-mono">Month 2 (60 Days)</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      redFlag.month2Check?.status === 'Passed' ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {redFlag.month2Check?.status || 'Scheduled'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Target: {redFlag.month2Check?.scheduledDate || '60 days from start'}
                  </p>
                  <p className="text-xs text-slate-700">
                    Gemba audit verifying standard SOP adherence &amp; poka-yoke functioning.
                  </p>
                  {canEditStage4 && (
                    <div className="pt-2 flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateMonthAudit(2, 'Passed')}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        ✓ Month 2 Passed (Adherence OK)
                      </button>
                    </div>
                  )}
                </div>

                {/* Month 3 */}
                <div className={`p-4 border rounded-2xl space-y-3 bg-white ${
                  redFlag.month3Check?.status === 'Passed' ? 'border-emerald-400 bg-emerald-50/30 ring-2 ring-emerald-500/30' : 'border-slate-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-900 font-mono">Month 3 (90 Days)</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      redFlag.month3Check?.status === 'Passed' ? 'bg-emerald-500 text-white font-black' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {redFlag.month3Check?.status || 'Scheduled'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Target: {redFlag.month3Check?.scheduledDate || '90 days from start'}
                  </p>
                  <p className="text-xs text-slate-700">
                    Final QA Custodian sign-off confirming zero recurrence for official closure.
                  </p>
                  {canEditStage4 && (
                    <div className="pt-2 flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateMonthAudit(3, 'Passed')}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        ✓ Month 3 Passed (Final 90d Closure)
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Quality Custodian Authority & Sign-Off Section */}
              <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Quality Custodian Authorization &amp; Sign-Off Panel</span>
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Custodian: <strong className="text-slate-900">{redFlag.qaCustodian || '—'}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Quality Custodian Remarks &amp; Verification Guidance
                    </label>
                    <textarea
                      rows={2}
                      disabled={!canEditStage4}
                      value={qaNotes}
                      onChange={(e) => setQaNotes(e.target.value)}
                      placeholder="Enter QA verification remarks on containment & CAPA effectiveness..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none disabled:opacity-60"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">QA Custodian Sign</span>
                      <span className="font-bold text-slate-900 mt-1 block">
                        {redFlag.approvedByQA || redFlag.qaCustodian || '—'}
                      </span>
                      <span className="text-[10px] text-emerald-700 block mt-0.5">Authorized Signatory</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Plant Operations Head</span>
                      <span className="font-bold text-slate-900 mt-1 block">
                        {redFlag.approvedByProduction || '—'}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Joint Concurrence</span>
                    </div>
                  </div>
                </div>

                {/* Stage 4 Interactive Decision Bar */}
                {canEditStage4 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                    <span className="text-xs text-slate-600 font-mono">
                      Current QA Status: <strong className="text-emerald-700">{redFlag.qaCustodianStatus || 'Review Pending'}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleVerifyContainment}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        ✓ Verify Containment Action
                      </button>

                      <button
                        type="button"
                        onClick={handleStartSustenance}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Start 3M Sustenance (Keep Open)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                    <span>
                      * Quality Custodian authorization is required to sign off on Stage 4. You are currently viewing as <strong>{activeRole}</strong>.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRoleChange('Quality Custodian')}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition shrink-0 ml-2"
                    >
                      Switch to Quality Role ➔
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* ========================================================================
          PHOTO FULL-SCREEN ZOOM MODAL
         ======================================================================== */}
      {zoomedPhoto && (
        <PhotoZoomModal
          photoUrl={zoomedPhoto.url}
          title={zoomedPhoto.title}
          subtitle={zoomedPhoto.subtitle}
          onClose={() => setZoomedPhoto(null)}
        />
      )}

    </div>
  );
}
