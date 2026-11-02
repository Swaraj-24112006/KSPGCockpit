import React, { useState } from 'react';
import { 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  FileText, 
  Sparkles, 
  Tag, 
  Camera, 
  Printer, 
  ArrowRight, 
  Check, 
  ExternalLink,
  Layers,
  HelpCircle,
  UserCheck,
  Zap,
  Calendar,
  Save,
  RotateCcw,
  Tv
} from 'lucide-react';
import { RedFlag, MonthSustenanceCheck, RedFlagRole } from '../../types';
import CameraModal from './CameraModal';
import { useRedFlag, useRedFlagLookups } from '../context/RedFlagContext';
import * as api from '../api/redflags';

interface RedFlagActionModalProps {
  redFlag: RedFlag;
  onClose: () => void;
  onUpdate: (id: string, updatedData: Partial<RedFlag>) => void;
  onEscalateToPpsr: (id: string) => Promise<void>;
  onConvertToKaizen: (id: string) => Promise<void>;
  onLinkToFiveS: (id: string) => Promise<void>;
  onOpenPrintSheet: (flag: RedFlag) => void;
  currentPersona?: string;
  onNavigateToModule?: (moduleKey: string) => void;
  currentRole?: RedFlagRole;
  onRoleChange?: (role: RedFlagRole) => void;
  onOpenPresentation?: (flag: RedFlag) => void;
}

export default function RedFlagActionModal({
  redFlag,
  onClose,
  onUpdate,
  onEscalateToPpsr,
  onConvertToKaizen,
  onLinkToFiveS,
  onOpenPrintSheet,
  currentPersona = '',
  onNavigateToModule,
  currentRole = 'Quality Custodian',
  onRoleChange,
  onOpenPresentation
}: RedFlagActionModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'containment' | 'rca' | 'sustenance' | 'escalation'>('details');
  const [showCamera, setShowCamera] = useState<'evidence' | 'closure' | null>(null);
  const [isEscalating, setIsEscalating] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { actions, currentUser, showDevRoleSwitch } = useRedFlag();
  const { plants } = useRedFlagLookups();
  const currentPlant = plants.find(p => p.code === redFlag.mfName || p.name === redFlag.mfName);
  const [earlyCloseDialogOpen, setEarlyCloseDialogOpen] = useState<boolean>(false);
  const [earlyCloseReasonInput, setEarlyCloseReasonInput] = useState<string>('');

  // Form states initialized with redFlag values
  const [formData, setFormData] = useState({
    // Originator & Target (Anyone on Anyone)
    raisedBy: redFlag.raisedBy || '',
    raisedByDepartment: redFlag.raisedByDepartment || '',
    targetDepartment: redFlag.targetDepartment || '',
    targetPerson: redFlag.targetPerson || redFlag.teamLeader || '',
    qaCustodian: redFlag.qaCustodian || '',
    qaCustodianNotes: redFlag.qaCustodianNotes || '',

    // Context & Classification
    severity: redFlag.severity || 'Major (Quarantine)',
    category5M: redFlag.category5M || 'Method',
    redFlagType: redFlag.redFlagType || 'Quality',
    redFlagSubType: redFlag.redFlagSubType || '',
    redFlagDescription: redFlag.redFlagDescription || '',
    evidencePhoto: redFlag.evidencePhoto || '',
    teamLeader: redFlag.teamLeader || '',
    closureResponsibility: redFlag.closureResponsibility || redFlag.qaCustodian || '',
    targetDate: redFlag.targetDate || '',

    // Containment & Quarantine Controls (By Target Person)
    raisedTimestamp: redFlag.raisedTimestamp || redFlag.raisedDate || '',
    containmentTimestamp: redFlag.containmentTimestamp || new Date().toISOString().replace('T', ' ').substring(0, 16),
    containmentTimeGap: redFlag.containmentTimeGap || '',
    containmentStatus: redFlag.containmentStatus || 'Pending',
    suspectQtyQuarantined: redFlag.suspectQtyQuarantined || 0,
    quarantineTagNo: redFlag.quarantineTagNo || `QT-${redFlag.redFlagNo}`,
    quarantineLocation: redFlag.quarantineLocation || '',
    sortingQtyInspected: redFlag.sortingQtyInspected || 0,
    sortingQtyOk: redFlag.sortingQtyOk || 0,
    sortingQtyRejected: redFlag.sortingQtyRejected || 0,
    containmentAction: redFlag.containmentAction || redFlag.immediateActionTaken || '',
    countermeasurePhoto: redFlag.countermeasurePhoto || redFlag.closureEvidence || '',
    actionTakenBy: redFlag.actionTakenBy || redFlag.targetPerson || '',
    containmentVerifiedBy: redFlag.containmentVerifiedBy || '',
    containmentVerifiedDate: redFlag.containmentVerifiedDate || '',

    // RCA & CAPA
    why1: redFlag.why1 || '',
    why2: redFlag.why2 || '',
    why3: redFlag.why3 || '',
    why4: redFlag.why4 || '',
    rootCause5Why: redFlag.rootCause5Why || '',
    systematicPermanentAction: redFlag.systematicPermanentAction || '',
    sopUpdated: redFlag.standardizationUpdates?.sopUpdated || false,
    pfmeaUpdated: redFlag.standardizationUpdates?.pfmeaUpdated || false,
    controlPlanUpdated: redFlag.standardizationUpdates?.controlPlanUpdated || false,
    onePointLessonIssued: redFlag.standardizationUpdates?.onePointLessonIssued || false,

    // 3-Month Sustenance Tracking
    sustenanceStartDate: redFlag.sustenanceStartDate || '',
    month1Check: redFlag.month1Check || {
      month: 1,
      targetDays: 30,
      scheduledDate: '',
      status: 'Pending'
    },
    month2Check: redFlag.month2Check || {
      month: 2,
      targetDays: 60,
      scheduledDate: '',
      status: 'Pending'
    },
    month3Check: redFlag.month3Check || {
      month: 3,
      targetDays: 90,
      scheduledDate: '',
      status: 'Pending'
    },
    sustenanceAchieved: redFlag.sustenanceAchieved || false,

    closureEvidence: redFlag.closureEvidence || '',
    closureDate: redFlag.closureDate || '',
    approvedByQA: redFlag.approvedByQA || '',
    approvedByProduction: redFlag.approvedByProduction || currentPlant?.plantHeadLabel || '',
    status: redFlag.status || 'Open'
  });

  const handleSaveAll = async (targetStatus?: RedFlag['status']) => {
    setSaveError(null);
    try {
      let updatedFlag: RedFlag = redFlag;

      if (targetStatus === 'Closed') {
        updatedFlag = await actions.closeRedFlag(redFlag.id, {
          validationTrialShifts: Number(formData.validationTrialShifts) || 5,
          validationTrialResults: formData.validationTrialResults,
          closureEvidence: formData.closureEvidence,
          rowVersion: redFlag.rowVersion
        });
      } else if (activeTab === 'details') {
        updatedFlag = await actions.patchRedFlag(redFlag.id, {
          raisedBy: formData.raisedBy,
          raisedByDepartment: formData.raisedByDepartment,
          targetDepartment: formData.targetDepartment,
          targetPerson: formData.targetPerson,
          qaCustodian: formData.qaCustodian,
          qaCustodianNotes: formData.qaCustodianNotes,
          severity: formData.severity as any,
          category5M: formData.category5M as any,
          redFlagType: formData.redFlagType as any,
          redFlagSubType: formData.redFlagSubType,
          redFlagDescription: formData.redFlagDescription,
          evidencePhoto: formData.evidencePhoto,
          teamLeader: formData.teamLeader,
          closureResponsibility: formData.closureResponsibility,
          targetDate: formData.targetDate,
        }, redFlag.rowVersion);
      } else if (activeTab === 'containment') {
        updatedFlag = await actions.submitContainment(redFlag.id, {
          containmentAction: formData.containmentAction,
          suspectQtyQuarantined: Number(formData.suspectQtyQuarantined) || 0,
          quarantineTagNo: formData.quarantineTagNo,
          quarantineLocation: formData.quarantineLocation,
          sortingQtyInspected: Number(formData.sortingQtyInspected) || 0,
          sortingQtyOk: Number(formData.sortingQtyOk) || 0,
          sortingQtyRejected: Number(formData.sortingQtyRejected) || 0,
          countermeasurePhoto: formData.countermeasurePhoto,
          actionTakenBy: formData.actionTakenBy,
          containmentTimestamp: formData.containmentTimestamp,
          rowVersion: redFlag.rowVersion
        });
      } else if (activeTab === 'rca') {
        updatedFlag = await actions.saveRootCause(redFlag.id, {
          why1: formData.why1,
          why2: formData.why2,
          why3: formData.why3,
          why4: formData.why4,
          rootCause5Why: formData.rootCause5Why,
          systematicPermanentAction: formData.systematicPermanentAction,
          targetDate: formData.targetDate,
          standardizationUpdates: {
            sopUpdated: formData.sopUpdated,
            pfmeaUpdated: formData.pfmeaUpdated,
            controlPlanUpdated: formData.controlPlanUpdated,
            onePointLessonIssued: formData.onePointLessonIssued
          },
          rowVersion: redFlag.rowVersion
        });
      } else if (activeTab === 'sustenance') {
        if (targetStatus === 'Under-Sustenance') {
          updatedFlag = await actions.startSustenance(redFlag.id, { notes: formData.qaCustodianNotes }, redFlag.rowVersion);
        } else {
          updatedFlag = await actions.patchRedFlag(redFlag.id, {
            qaCustodianNotes: formData.qaCustodianNotes,
            validationTrialShifts: Number(formData.validationTrialShifts) || 0,
            validationTrialResults: formData.validationTrialResults,
            closureEvidence: formData.closureEvidence
          }, redFlag.rowVersion);
        }
      }

      onUpdate(redFlag.id, updatedFlag);
      setFormData(prev => ({ ...prev, ...updatedFlag }));
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    } catch (err: any) {
      console.error('Save failed:', err);
      setSaveError(err.message || 'Save failed.');
    }
  };

  const handleEarlyClosureSubmit = async () => {
    if (!earlyCloseReasonInput.trim()) {
      alert('Early closure requires a valid justification reason.');
      return;
    }
    setSaveError(null);
    try {
      const updatedFlag = await actions.closeRedFlag(redFlag.id, {
        earlyClosureReason: earlyCloseReasonInput.trim(),
        validationTrialShifts: Number(formData.validationTrialShifts) || 5,
        validationTrialResults: formData.validationTrialResults,
        closureEvidence: formData.closureEvidence,
        rowVersion: redFlag.rowVersion
      });
      onUpdate(redFlag.id, updatedFlag);
      setFormData(prev => ({ ...prev, ...updatedFlag }));
      setEarlyCloseDialogOpen(false);
      setEarlyCloseReasonInput('');
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    } catch (err: any) {
      console.error('Early close failed:', err);
      setSaveError(err.message || 'Early closure failed.');
    }
  };

  const updateMonthAudit = async (month: 1 | 2 | 3, status: 'Passed' | 'Recurrence Detected' | 'Pending', observations?: string) => {
    setSaveError(null);
    try {
      const updatedFlag = await actions.logAudit(redFlag.id, month, {
        status,
        observations: observations || `Month ${month} Sustenance check ${status}.`
      }, redFlag.rowVersion);
      onUpdate(redFlag.id, updatedFlag);
      setFormData(prev => ({ ...prev, ...updatedFlag }));
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    } catch (err: any) {
      console.error('Log audit failed:', err);
      setSaveError(err.message || `Month ${month} audit logging failed.`);
    }
  };

  const handleStartSustenance = async () => {
    setSaveError(null);
    try {
      const updatedFlag = await actions.startSustenance(redFlag.id, { notes: formData.qaCustodianNotes }, redFlag.rowVersion);
      onUpdate(redFlag.id, updatedFlag);
      setFormData(prev => ({ ...prev, ...updatedFlag }));
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    } catch (err: any) {
      console.error('Start sustenance failed:', err);
      setSaveError(err.message || 'Failed to start sustenance.');
    }
  };

  const handleEscalatePPSR = async () => {
    setIsEscalating('ppsr');
    try {
      await onEscalateToPpsr(redFlag.id);
    } finally {
      setIsEscalating(null);
    }
  };

  const handleConvertKaizen = async () => {
    setIsEscalating('kaizen');
    try {
      await onConvertToKaizen(redFlag.id);
    } finally {
      setIsEscalating(null);
    }
  };

  const handleLinkFiveS = async () => {
    setIsEscalating('fives');
    try {
      await onLinkToFiveS(redFlag.id);
    } finally {
      setIsEscalating(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-2 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-[96vw] max-w-[96vw] h-[94vh] max-h-[94vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-rose-600 flex items-center justify-center text-white font-black text-xs">
              RF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-rose-400 text-sm">{redFlag.redFlagNo}</span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-sm">{redFlag.lineAreaName} ({redFlag.stationName})</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Raised: {redFlag.raisedDate}</span>
                <span>·</span>
                <span>Raised By: <strong className="text-slate-200">{formData.raisedBy}</strong> ({formData.raisedByDepartment})</span>
                <span>·</span>
                <span>QA Custodian: <strong className="text-rose-300">{formData.qaCustodian}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Presentation Mode 4-Stage Slides Button */}
            {onOpenPresentation && (
              <button
                type="button"
                onClick={() => onOpenPresentation(redFlag)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-colors cursor-pointer shadow-xs border border-indigo-500"
                title="Open 4-Stage Executive Slide Deck for this Red Flag"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>📽️ 4-Stage Slides</span>
              </button>
            )}

            <button
              onClick={() => onOpenPrintSheet(redFlag)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded transition-colors cursor-pointer border border-slate-700"
              title="Print standard Shop Floor Action Sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Controls - 4 Distinct Stages Sequence + Escalation */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                activeTab === 'details' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Stage 1: Initiator Form
            </button>
            <button
              onClick={() => setActiveTab('containment')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'containment' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>2. Stage 2: Containment Action</span>
              {formData.containmentStatus === 'Verified' && <Check className="w-3 h-3 text-emerald-600" />}
            </button>
            <button
              onClick={() => setActiveTab('rca')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                activeTab === 'rca' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. Stage 3: Root Cause &amp; CAPA
            </button>
            <button
              onClick={() => setActiveTab('sustenance')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'sustenance' ? 'bg-white text-slate-900 shadow-sm font-semibold text-emerald-700' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>4. Stage 4: Quality &amp; 3M Sustenance</span>
              {formData.sustenanceAchieved && <Check className="w-3 h-3 text-emerald-600" />}
            </button>
            <button
              onClick={() => setActiveTab('escalation')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'escalation' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>5. Cross-Module Escalations</span>
              {(redFlag.linkedPpsrId || redFlag.linkedKaizenId || redFlag.linkedFiveSRedTagId) && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Role indicator */}
            {onRoleChange && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono mr-2">
                <span className="text-slate-500 font-sans text-xs">Role:</span>
                <select
                  value={currentRole}
                  onChange={(e) => onRoleChange(e.target.value as RedFlagRole)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 font-bold focus:outline-none"
                >
                  <option value="Initiator">Initiator</option>
                  <option value="Target Person">Target Person</option>
                  <option value="Quality Custodian">Quality Custodian</option>
                  <option value="Plant Head">Plant Head</option>
                </select>
              </div>
            )}

            {saveToast && (
              <span className="text-xs text-emerald-600 font-semibold animate-fade-in flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <button
              onClick={() => handleSaveAll()}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Progress</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: Anomaly Details & Anyone-on-Anyone Matrix */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              
              {/* Custodian & Originator Context Notice */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-slate-800">
                    SFC Governance: Anyone can raise a Red Flag on any department. QA is the custodian.
                  </p>
                  <p className="text-slate-600">
                    The Originator registers the observation; QA Custodian oversees containment, cross-functional root cause analysis, and ensures point remains OPEN until 3-month sustenance is verified.
                  </p>
                </div>
              </div>

              {/* Originator vs Target Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-200 p-4 rounded-lg bg-white">
                
                {/* Originator Block */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-1">
                    Originator (Raised By)
                  </h4>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Originator Name</label>
                    <input
                      type="text"
                      value={formData.raisedBy}
                      onChange={(e) => setFormData({ ...formData, raisedBy: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Originating Department</label>
                    <select
                      value={formData.raisedByDepartment}
                      onChange={(e) => setFormData({ ...formData, raisedByDepartment: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-slate-900 outline-none"
                    >
                      <option value="Production">Production</option>
                      <option value="Quality">Quality / QA</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Safety & EHS">Safety &amp; EHS</option>
                      <option value="Logistics & Stores">Logistics &amp; Stores</option>
                      <option value="Tooling & Die">Tooling &amp; Die</option>
                      <option value="Engineering">Engineering / NPE</option>
                    </select>
                  </div>
                </div>

                {/* Target Block */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-1">
                    Target (Raised Against)
                  </h4>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Department</label>
                    <select
                      value={formData.targetDepartment}
                      onChange={(e) => setFormData({ ...formData, targetDepartment: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-slate-900 outline-none font-semibold text-slate-800"
                    >
                      <option value="Production">Production</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Tooling & Die">Tooling &amp; Die</option>
                      <option value="Quality">Quality</option>
                      <option value="Logistics & Stores">Logistics &amp; Stores</option>
                      <option value="Supplier / Inward">Supplier / Inward</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Responsible Person / Supervisor</label>
                    <input
                      type="text"
                      value={formData.targetPerson}
                      onChange={(e) => setFormData({ ...formData, targetPerson: e.target.value })}
                      placeholder="e.g. Ramesh Kumar (Area Lead)"
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-slate-900 outline-none"
                    />
                  </div>
                </div>

              </div>

              {/* QA Custodian Assignment */}
              <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-rose-900 uppercase mb-1">
                    QA Custodian of Red Flag
                  </label>
                  <input
                    type="text"
                    value={formData.qaCustodian}
                    onChange={(e) => setFormData({ ...formData, qaCustodian: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-rose-300 rounded focus:border-rose-900 outline-none bg-white font-semibold"
                  />
                  <p className="text-[10px] text-rose-700 mt-1">QA Custodian monitors sustenance checks and signs final closure.</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-rose-900 uppercase mb-1">
                    Custodian Status &amp; Notes
                  </label>
                  <input
                    type="text"
                    value={formData.qaCustodianNotes}
                    onChange={(e) => setFormData({ ...formData, qaCustodianNotes: e.target.value })}
                    placeholder="QA guidance or notes for this red flag"
                    className="w-full text-xs px-2.5 py-1.5 border border-rose-300 rounded focus:border-rose-900 outline-none bg-white"
                  />
                </div>
              </div>

              {/* Defect Description & Classification */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Defect Type</label>
                    <select
                      value={formData.redFlagType}
                      onChange={(e) => setFormData({ ...formData, redFlagType: e.target.value as any })}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded outline-none"
                    >
                      <option value="Quality">Quality Non-conformance</option>
                      <option value="Machine">Machine / Tooling Breakdown</option>
                      <option value="Process">Process Parameter Drift</option>
                      <option value="Safety">Safety &amp; EHS Hazard</option>
                      <option value="Material">Material Defect</option>
                      <option value="5S">5S Disorganization / Leakage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">5M+1E Category</label>
                    <select
                      value={formData.category5M}
                      onChange={(e) => setFormData({ ...formData, category5M: e.target.value as any })}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded outline-none font-semibold"
                    >
                      <option value="Man">Man (Competency / Skill)</option>
                      <option value="Machine">Machine (Wear / Sensor / Calibration)</option>
                      <option value="Material">Material (Incoming defect / Spec deviation)</option>
                      <option value="Method">Method (SOP / Sequence / Setting)</option>
                      <option value="Measurement">Measurement (Gauge / Tool bias)</option>
                      <option value="Environment">Environment (Mist / Temperature / FOD)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Severity Tier</label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded outline-none font-bold text-rose-700"
                    >
                      <option value="Critical (Line Stop)">Critical (Line Stop)</option>
                      <option value="Major (Quarantine)">Major (Quarantine / Hold)</option>
                      <option value="Moderate (Rework)">Moderate (Rework / Deviation)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Problem / Anomaly Description</label>
                  <textarea
                    rows={3}
                    value={formData.redFlagDescription}
                    onChange={(e) => setFormData({ ...formData, redFlagDescription: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded focus:border-slate-900 outline-none leading-relaxed"
                  />
                </div>

                {/* Photo Evidence */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Point-of-Defect Evidence Photo</label>
                  <div className="flex items-center gap-4">
                    {formData.evidencePhoto ? (
                      <div className="relative group">
                        <img crossOrigin="anonymous" src={formData.evidencePhoto}
                          alt="Evidence"
                          className="w-24 h-24 object-cover rounded border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, evidencePhoto: '' })}
                          className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-1 text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 text-xs">
                        No Photo
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowCamera('evidence')}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-xs font-semibold rounded text-slate-700 cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-slate-500" />
                      <span>Take / Upload Photo</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: Target Person Containment, Quarantine Controls & Containment Photo */}
          {activeTab === 'containment' && (
            <div className="space-y-6">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <strong className="text-amber-950 block font-bold uppercase">
                    Stage 2: Target Person Responsibility — Immediate Containment &amp; Quarantine Controls (&lt; 2 Hours)
                  </strong>
                  <span className="text-amber-800">
                    The Target Person on whom the Red Flag was raised ({formData.targetPerson || formData.targetDepartment}) must execute physical quarantine, record the containment timestamp, and upload the <strong>Containment Photo</strong>.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-900 text-amber-400 px-3 py-1.5 rounded font-mono text-[11px] font-bold">
                    Time Gap: {formData.containmentTimeGap || '—'}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-amber-700 block uppercase font-bold">Status</span>
                    <span className="font-bold text-amber-900">{formData.containmentStatus}</span>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Photo Proof: Point of Defect (Initiator T0) vs Containment Photo (Target Person T1) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="bg-white p-3 rounded-lg border border-rose-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-rose-700 uppercase">1. Point of Defect Photo (By Initiator)</span>
                    <span className="font-mono text-[10px] text-slate-500">{formData.raisedTimestamp}</span>
                  </div>
                  <div className="aspect-video bg-rose-50/30 rounded border border-rose-100 flex items-center justify-center overflow-hidden">
                    {formData.evidencePhoto ? (
                      <img crossOrigin="anonymous" src={formData.evidencePhoto} alt="Point of Defect" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-slate-400">No Point-of-Defect Photo</span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border-2 border-emerald-300 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-700 uppercase">2. Containment Photo (By Target Person)</span>
                    <span className="font-mono text-[10px] text-slate-500">{formData.containmentTimestamp}</span>
                  </div>
                  <div className="aspect-video bg-emerald-50/30 rounded border border-emerald-100 flex items-center justify-center overflow-hidden">
                    {formData.countermeasurePhoto ? (
                      <img crossOrigin="anonymous" src={formData.countermeasurePhoto} alt="Containment" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-amber-700 font-semibold">Pending Target Person Containment Photo</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCamera('closure')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Capture / Upload Containment Photo</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Target Person & Quarantine Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Target Person Executing Containment
                  </label>
                  <input
                    type="text"
                    value={formData.actionTakenBy}
                    onChange={(e) => setFormData({ ...formData, actionTakenBy: e.target.value })}
                    placeholder="Target Department Lead"
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded focus:border-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Quarantine Hold Tag No.
                  </label>
                  <input
                    type="text"
                    value={formData.quarantineTagNo}
                    onChange={(e) => setFormData({ ...formData, quarantineTagNo: e.target.value })}
                    className="w-full text-xs font-mono font-bold text-rose-700 px-3 py-2 border border-slate-300 rounded focus:border-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Quarantine Location / Red Hold Bay
                  </label>
                  <input
                    type="text"
                    value={formData.quarantineLocation}
                    onChange={(e) => setFormData({ ...formData, quarantineLocation: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:border-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-rose-700 mb-1">
                    Suspect Qty Quarantined (Pcs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.suspectQtyQuarantined}
                    onChange={(e) => setFormData({ ...formData, suspectQtyQuarantined: Number(e.target.value) })}
                    className="w-full text-xs font-mono font-bold text-rose-700 px-3 py-2 border border-rose-300 bg-rose-50/40 rounded focus:border-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    100% Sorting Inspected (Pcs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sortingQtyInspected}
                    onChange={(e) => setFormData({ ...formData, sortingQtyInspected: Number(e.target.value) })}
                    className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded focus:border-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-700 mb-1">
                    Sorting OK Released (Pcs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sortingQtyOk}
                    onChange={(e) => setFormData({ ...formData, sortingQtyOk: Number(e.target.value) })}
                    className="w-full text-xs font-mono font-bold text-emerald-700 px-3 py-2 border border-emerald-300 bg-emerald-50/40 rounded focus:border-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Quality Verification Sign-Off
                  </label>
                  <input
                    type="text"
                    value={formData.containmentVerifiedBy}
                    onChange={(e) => setFormData({ ...formData, containmentVerifiedBy: e.target.value })}
                    placeholder="Quality Verification Sign-Off"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:border-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Immediate Containment &amp; Quarantine Action Description (By Target Person)
                </label>
                <textarea
                  rows={3}
                  value={formData.containmentAction}
                  onChange={(e) => setFormData({ ...formData, containmentAction: e.target.value })}
                  placeholder="Detail 100% sorting, quarantine bay tag numbers, machine stoppage, and temporary process checks..."
                  className="w-full text-xs p-3 border border-slate-300 rounded focus:border-slate-900 outline-none leading-relaxed"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      containmentStatus: 'Contained',
                      status: formData.status === 'Open' ? 'Contained' : formData.status
                    });
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded cursor-pointer transition-colors"
                >
                  ✓ Target Person: Log Containment &amp; Quarantine
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      containmentStatus: 'Verified',
                      containmentVerifiedBy: formData.containmentVerifiedBy || formData.qaCustodian,
                      containmentVerifiedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
                      status: formData.status === 'Open' ? 'Contained' : formData.status
                    });
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded cursor-pointer transition-colors"
                >
                  ✓ Quality Custodian: Verify Containment
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Cross-Module Escalations (PPSR / Kaizen / 5S) */}
          {activeTab === 'escalation' && (
            <div className="space-y-6">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <span className="font-bold text-slate-800 block">Cross-Module Integration Engine:</span>
                <p className="text-slate-600">
                  Instead of disconnected silos, systemic red flags can spawn an 8D PPSR problem-solving project, generate a Kaizen poka-yoke sheet, or link to a 5S contamination/holding tag without double entry.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Escalate to PPSR (8D) */}
                <div className="border border-slate-200 rounded-lg p-4 bg-white flex flex-col justify-between space-y-3">
                  <div>
                    <div className="w-7 h-7 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs mb-2">
                      8D
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">PPSR (8D Problem Solving)</h4>
                    <p className="text-[11px] text-slate-600 mt-1">
                      For chronic, high-cost, or critical defects requiring full 8D team facilitation and root cause analysis.
                    </p>
                  </div>
                  <div>
                    {redFlag.linkedPpsrId ? (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs space-y-1">
                        <span className="text-[10px] text-blue-700 font-bold block uppercase">Linked PPSR Active</span>
                        <div className="font-mono font-bold text-blue-900">{redFlag.linkedPpsrNo || redFlag.linkedPpsrId}</div>
                        {onNavigateToModule && (
                          <button
                            type="button"
                            onClick={() => onNavigateToModule('ppsr')}
                            className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <span>Open in PPSR Module</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isEscalating === 'ppsr'}
                        onClick={handleEscalatePPSR}
                        className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                      >
                        {isEscalating === 'ppsr' ? 'Spawning 8D...' : '⚡ Escalate to PPSR 8D'}
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Convert to Kaizen */}
                <div className="border border-slate-200 rounded-lg p-4 bg-white flex flex-col justify-between space-y-3">
                  <div>
                    <div className="w-7 h-7 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs mb-2">
                      KZ
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">Kaizen Improvement Sheet</h4>
                    <p className="text-[11px] text-slate-600 mt-1">
                      To design out the defect through shopfloor Poka-Yoke, jig modification, or error-proofing countermeasure.
                    </p>
                  </div>
                  <div>
                    {redFlag.linkedKaizenId ? (
                      <div className="p-2 bg-indigo-50 border border-indigo-200 rounded text-xs space-y-1">
                        <span className="text-[10px] text-indigo-700 font-bold block uppercase">Linked Kaizen Active</span>
                        <div className="font-mono font-bold text-indigo-900">{redFlag.linkedKaizenNo || redFlag.linkedKaizenId}</div>
                        {onNavigateToModule && (
                          <button
                            type="button"
                            onClick={() => onNavigateToModule('kaizen')}
                            className="text-[11px] text-indigo-700 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <span>Open in Kaizen Module</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isEscalating === 'kaizen'}
                        onClick={handleConvertKaizen}
                        className="w-full py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                      >
                        {isEscalating === 'kaizen' ? 'Generating Kaizen...' : '💡 Convert to Kaizen'}
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Link 5S Red Tag / SOC */}
                <div className="border border-slate-200 rounded-lg p-4 bg-white flex flex-col justify-between space-y-3">
                  <div>
                    <div className="w-7 h-7 rounded bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs mb-2">
                      5S
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">5S Red Tag / SOC Log</h4>
                    <p className="text-[11px] text-slate-600 mt-1">
                      If caused by workplace clutter, machine oil/coolant mist leakages, or source of contamination.
                    </p>
                  </div>
                  <div>
                    {redFlag.linkedFiveSRedTagId ? (
                      <div className="p-2 bg-purple-50 border border-purple-200 rounded text-xs space-y-1">
                        <span className="text-[10px] text-purple-700 font-bold block uppercase">Linked 5S Item Active</span>
                        <div className="font-mono font-bold text-purple-900">{redFlag.linkedFiveSRedTagNo || redFlag.linkedFiveSRedTagId}</div>
                        {onNavigateToModule && (
                          <button
                            type="button"
                            onClick={() => onNavigateToModule('fives')}
                            className="text-[11px] text-purple-700 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <span>Open in 5S Module</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isEscalating === 'fives'}
                        onClick={handleLinkFiveS}
                        className="w-full py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                      >
                        {isEscalating === 'fives' ? 'Linking 5S...' : '🏷️ Link to 5S Red Tag'}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: 5-Why RCA & CAPA */}
          {activeTab === 'rca' && (
            <div className="space-y-6">
              
              {/* 5-Why Drill-down */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  5-Why Root Cause Drill-down
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Why 1 (Primary Symptom):</label>
                    <input
                      type="text"
                      value={formData.why1}
                      onChange={(e) => setFormData({ ...formData, why1: e.target.value })}
                      placeholder="Why did the defect occur at the station?"
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Why 2:</label>
                    <input
                      type="text"
                      value={formData.why2}
                      onChange={(e) => setFormData({ ...formData, why2: e.target.value })}
                      placeholder="Why did that condition occur?"
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Why 3:</label>
                    <input
                      type="text"
                      value={formData.why3}
                      onChange={(e) => setFormData({ ...formData, why3: e.target.value })}
                      placeholder="Why was it not prevented?"
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Why 4:</label>
                    <input
                      type="text"
                      value={formData.why4}
                      onChange={(e) => setFormData({ ...formData, why4: e.target.value })}
                      placeholder="Why did standard or control check fail?"
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-rose-900 mb-0.5 uppercase">
                      Root Cause Statement (Why 5):
                    </label>
                    <input
                      type="text"
                      value={formData.rootCause5Why}
                      onChange={(e) => setFormData({ ...formData, rootCause5Why: e.target.value })}
                      placeholder="Systemic / technical root cause"
                      className="w-full text-xs px-2.5 py-1.5 border border-rose-300 rounded focus:border-rose-900 outline-none font-bold text-rose-950 bg-rose-50/30"
                    />
                  </div>
                </div>
              </div>

              {/* Permanent Corrective Action (CAPA) */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Permanent Corrective Action (CAPA)
                </h4>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Systematic Countermeasure Deployed
                  </label>
                  <textarea
                    rows={3}
                    value={formData.systematicPermanentAction}
                    onChange={(e) => setFormData({ ...formData, systematicPermanentAction: e.target.value })}
                    placeholder="Specify engineering poka-yoke, sensor interlock, tooling modification, or automated inspection..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:border-slate-900 outline-none leading-relaxed"
                  />
                </div>

                {/* Standardization Checkboxes */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase block">
                    Engineering Standardization Required
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sopUpdated}
                        onChange={(e) => setFormData({ ...formData, sopUpdated: e.target.checked })}
                        className="rounded"
                      />
                      <span>SOP Updated</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.pfmeaUpdated}
                        onChange={(e) => setFormData({ ...formData, pfmeaUpdated: e.target.checked })}
                        className="rounded"
                      />
                      <span>PFMEA Revised</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.controlPlanUpdated}
                        onChange={(e) => setFormData({ ...formData, controlPlanUpdated: e.target.checked })}
                        className="rounded"
                      />
                      <span>Control Plan Updated</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.onePointLessonIssued}
                        onChange={(e) => setFormData({ ...formData, onePointLessonIssued: e.target.checked })}
                        className="rounded"
                      />
                      <span>1-Point Lesson (OPL)</span>
                    </label>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 5: 3-Month Sustenance Tracking & QA Custodian Closure */}
          {activeTab === 'sustenance' && (
            <div className="space-y-6">

              {/* Notice Banner */}
              <div className="p-3.5 bg-emerald-50 border-2 border-emerald-600 rounded-lg flex items-start gap-3">
                <Calendar className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-emerald-950 uppercase tracking-wide">
                    Mandatory Rule: Keep Red Flag Point OPEN until 3-Month Sustenance is Achieved
                  </p>
                  <p className="text-emerald-900 leading-relaxed">
                    IATF 16949 &amp; Shop Floor Control standard dictates that corrective actions cannot be closed immediately. The incident must remain <strong>OPEN under Sustenance</strong> for 90 days. QA Custodian conducts audits at Month 1 (30 days), Month 2 (60 days), and Month 3 (90 days). Final closure is permitted <em>only</em> when Month 3 verifies zero recurrence.
                  </p>
                </div>
              </div>

              {/* Sustenance Initiation */}
              {!formData.sustenanceStartDate ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-3">
                  <p className="text-xs text-slate-700 font-medium">
                    CAPA has been deployed. Start the official 90-day 3-Month Sustenance tracking window.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartSustenance}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded cursor-pointer transition-colors shadow-sm"
                  >
                    Initiate 3-Month Sustenance Period (Keep Point Open)
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  <div className="flex items-center justify-between text-xs text-slate-600 pb-1 border-b border-slate-200">
                    <div>
                      Sustenance Started: <strong className="font-mono text-slate-900">{formData.sustenanceStartDate}</strong>
                    </div>
                    <div>
                      QA Custodian: <strong className="text-rose-900">{formData.qaCustodian}</strong>
                    </div>
                    <div>
                      Status: <strong className="uppercase text-slate-900">{formData.status.replace('-', ' ')}</strong>
                    </div>
                  </div>

                  {/* 3 Milestone Cards: Month 1, Month 2, Month 3 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Month 1 (30 Days) */}
                    <div className={`p-4 border rounded-lg space-y-3 ${
                      formData.month1Check?.status === 'Passed' ? 'bg-emerald-50/50 border-emerald-300' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-slate-900">Month 1 (30 Days)</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          formData.month1Check?.status === 'Passed' ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {formData.month1Check?.status || 'Pending'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-mono">
                        Target Date: {formData.month1Check?.scheduledDate || '30 days from start'}
                      </p>
                      {formData.month1Check?.auditDate && (
                        <p className="text-[10px] text-slate-500">
                          Audited: {formData.month1Check.auditDate} by {formData.month1Check.auditor}
                        </p>
                      )}
                      <div className="pt-2 flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateMonthAudit(1, 'Passed')}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded cursor-pointer transition-colors"
                        >
                          ✓ Month 1 Passed (0 Recurrence)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateMonthAudit(1, 'Recurrence Detected', 'Recurrence observed during Month 1 inspection.')}
                          className="w-full py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-medium rounded cursor-pointer border border-rose-200"
                        >
                          ⚠️ Flag Recurrence
                        </button>
                      </div>
                    </div>

                    {/* Month 2 (60 Days) */}
                    <div className={`p-4 border rounded-lg space-y-3 ${
                      formData.month2Check?.status === 'Passed' ? 'bg-emerald-50/50 border-emerald-300' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-slate-900">Month 2 (60 Days)</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          formData.month2Check?.status === 'Passed' ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {formData.month2Check?.status || 'Pending'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-mono">
                        Target Date: {formData.month2Check?.scheduledDate || '60 days from start'}
                      </p>
                      {formData.month2Check?.auditDate && (
                        <p className="text-[10px] text-slate-500">
                          Audited: {formData.month2Check.auditDate} by {formData.month2Check.auditor}
                        </p>
                      )}
                      <div className="pt-2 flex flex-col gap-1.5">
                        <button
                          type="button"
                          disabled={formData.month1Check?.status !== 'Passed'}
                          onClick={() => updateMonthAudit(2, 'Passed')}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded cursor-pointer transition-colors disabled:opacity-40"
                        >
                          ✓ Month 2 Passed (0 Recurrence)
                        </button>
                        <button
                          type="button"
                          disabled={formData.month1Check?.status !== 'Passed'}
                          onClick={() => updateMonthAudit(2, 'Recurrence Detected', 'Recurrence observed during Month 2 inspection.')}
                          className="w-full py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-medium rounded cursor-pointer border border-rose-200 disabled:opacity-40"
                        >
                          ⚠️ Flag Recurrence
                        </button>
                      </div>
                    </div>

                    {/* Month 3 (90 Days) */}
                    <div className={`p-4 border rounded-lg space-y-3 ${
                      formData.month3Check?.status === 'Passed' ? 'bg-emerald-50/50 border-emerald-300' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-slate-900">Month 3 (90 Days)</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          formData.month3Check?.status === 'Passed' ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {formData.month3Check?.status || 'Pending'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-mono">
                        Target Date: {formData.month3Check?.scheduledDate || '90 days from start'}
                      </p>
                      {formData.month3Check?.auditDate && (
                        <p className="text-[10px] text-slate-500">
                          Audited: {formData.month3Check.auditDate} by {formData.month3Check.auditor}
                        </p>
                      )}
                      <div className="pt-2 flex flex-col gap-1.5">
                        <button
                          type="button"
                          disabled={formData.month2Check?.status !== 'Passed'}
                          onClick={() => updateMonthAudit(3, 'Passed')}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded cursor-pointer transition-colors disabled:opacity-40"
                        >
                          ✓ Month 3 Passed (Final 90d)
                        </button>
                        <button
                          type="button"
                          disabled={formData.month2Check?.status !== 'Passed'}
                          onClick={() => updateMonthAudit(3, 'Recurrence Detected', 'Recurrence observed during Month 3 inspection.')}
                          className="w-full py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-medium rounded cursor-pointer border border-rose-200 disabled:opacity-40"
                        >
                          ⚠️ Flag Recurrence
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Closure Authority (QA Custodian Authorization) */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 pt-4">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      QA Custodian Closure Authorization
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          QA Custodian Sign-Off
                        </label>
                        <input
                          type="text"
                          value={formData.approvedByQA || formData.qaCustodian}
                          onChange={(e) => setFormData({ ...formData, approvedByQA: e.target.value })}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-slate-900 outline-none font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Plant Operations Head Sign-Off
                        </label>
                        <input
                          type="text"
                          value={formData.approvedByProduction || ''}
                          placeholder="Plant Operations Head Sign-Off"
                          onChange={(e) => setFormData({ ...formData, approvedByProduction: e.target.value })}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-slate-900 outline-none font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs">
                        {formData.sustenanceAchieved ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                            <Check className="w-4 h-4" /> 3-Month Sustenance Achieved: Ready for Official Closure
                          </span>
                        ) : (
                          <span className="text-amber-800 font-medium">
                            Point remains <strong>OPEN</strong> until Month 1, 2, and 3 sustenance checks are passed.
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveAll('Under-Sustenance')}
                          className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded cursor-pointer"
                        >
                          Keep Open in Sustenance
                        </button>
                        
                        <button
                          type="button"
                          disabled={!formData.sustenanceAchieved}
                          onClick={() => handleSaveAll('Closed')}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded cursor-pointer transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Approve 3-Month Sustenance &amp; Close Red Flag
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              )}

            </div>
          )}

        </div>

      </div>

            {/* Early Closure Modal for Plant Head */}
      {earlyCloseDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 uppercase">Authorize Early Closure</h3>
              <button onClick={() => setEarlyCloseDialogOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <p className="text-xs text-slate-600">
              IATF rule requires keeping the point OPEN until 3-month (90 days) sustenance is achieved with zero recurrence.
              As <strong>Plant Head</strong>, please provide the formal justification reason for authorizing early closure:
            </p>
            <textarea
              value={earlyCloseReasonInput}
              onChange={(e) => setEarlyCloseReasonInput(e.target.value)}
              placeholder="Enter formal justification (e.g. Line discontinued, permanent tooling redesign with zero recurrence)..."
              rows={4}
              className="w-full text-xs p-3 border border-slate-300 rounded-xl outline-none focus:border-slate-900"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEarlyCloseDialogOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEarlyClosureSubmit}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg"
              >
                Confirm Early Closure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Error Banner */}
      {saveError && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-shake">
          <span>⚠️ {saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-2">✕</button>
        </div>
      )}

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraModal
          isOpen={true}
          onClose={() => setShowCamera(null)}
          onCapture={(dataUrl) => {
            if (showCamera === 'evidence') {
              setFormData({ ...formData, evidencePhoto: dataUrl });
            } else {
              setFormData({ ...formData, countermeasurePhoto: dataUrl, closureEvidence: dataUrl });
            }
            setShowCamera(null);
          }}
          title={showCamera === 'evidence' ? "Initiator: Capture Point-of-Defect Photo (T0)" : "Target Person: Capture Containment Photo (T1)"}
        />
      )}
    </div>
  );
}
