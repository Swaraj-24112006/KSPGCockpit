import React, { useState, useEffect } from 'react';
import { RedFlag, RedFlagRole, MonthSustenanceCheck } from '../../types';
import { 
  ShieldAlert, 
  Camera, 
  Upload, 
  Check, 
  AlertTriangle, 
  User, 
  UserCheck, 
  ArrowRight, 
  Clock, 
  Layers, 
  PackageCheck, 
  CheckCircle2, 
  Calendar, 
  FileCheck, 
  RefreshCw, 
  Sparkles,
  Lock,
  Unlock,
  ShieldCheck,
  Award,
  ChevronRight
} from 'lucide-react';
import CameraModal from './CameraModal';
import { useRedFlag, useRedFlagLookups } from '../context/RedFlagContext';
import * as api from '../api/redflags';

interface RedFlagSheetFormProps {
  redFlags?: RedFlag[];
  onAddRedFlag: (rf: Partial<RedFlag>) => void;
  onUpdateRedFlag?: (id: string, data: Partial<RedFlag>) => void;
  onCancel: () => void;
  onNavigateToTracker?: () => void;
  initialWorkflowStage?: 'initiator' | 'containment' | 'rootcause' | 'quality' | 'target';
  initialSelectedFlagId?: string | null;
  currentRole?: RedFlagRole;
  onChangeRole?: (role: RedFlagRole) => void;
  onRoleChange?: (role: RedFlagRole) => void;
}

// Preset SVGs for demo testing
// Convert any base64/SVG data URI into a clean PNG Blob for upload
export async function dataUriToPngBlob(dataUri: string): Promise<Blob> {
  return new Promise((resolve) => {
    // Fast path: if already a JPEG/PNG/WebP data URI, fetch directly
    if (dataUri.startsWith('data:image/png') || dataUri.startsWith('data:image/jpeg') || dataUri.startsWith('data:image/webp')) {
      try {
        fetch(dataUri).then(r => r.blob()).then(blob => {
          if (blob && blob.size > 0) resolve(blob);
          else rasterize();
        }).catch(() => rasterize());
        return;
      } catch {
        rasterize();
        return;
      }
    }

    rasterize();

    function rasterize() {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 400;
          canvas.height = img.naturalHeight || 250;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
              if (blob) resolve(blob);
              else fetch(dataUri).then(r => r.blob()).then(resolve).catch(() => resolve(new Blob([], { type: 'image/png' })));
            }, 'image/png');
            return;
          }
        } catch {}
        fetch(dataUri).then(r => r.blob()).then(resolve).catch(() => resolve(new Blob([], { type: 'image/png' })));
      };
      img.onerror = () => {
        fetch(dataUri).then(r => r.blob()).then(resolve).catch(() => resolve(new Blob([], { type: 'image/png' })));
      };
      img.src = dataUri;
    }
  });
}

export const presetRedFlagImages = {
  torqueDefectBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fff1f2"/><g stroke="%23e11d48" stroke-width="2" fill="none"><circle cx="200" cy="110" r="45" stroke-dasharray="6,4" stroke-width="3"/><path d="M170,110 L230,110 M200,80 L200,140" stroke-width="3"/><path d="M180,90 L220,130" stroke-width="4"/><polygon points="200,60 215,85 185,85" fill="%23e11d48"/></g><text x="200" y="195" font-family="sans-serif" font-weight="bold" font-size="13" fill="%23be123c" text-anchor="middle">TORQUE CALIBRATION SLIPPED (12.4 Nm vs 18 Nm)</text><rect x="15" y="15" width="165" height="24" rx="4" fill="%23e11d48"/><text x="97" y="31" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">INITIATOR: POINT OF DEFECT</text></svg>`,
  torqueDefectAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><g stroke="%2316a34a" stroke-width="2" fill="none"><circle cx="200" cy="110" r="45" stroke="%2316a34a" stroke-width="4"/><circle cx="200" cy="110" r="15" fill="%2386efac"/><path d="M192,110 L198,116 L210,102" stroke-width="4" stroke="%2315803d"/></g><text x="200" y="195" font-family="sans-serif" font-weight="bold" font-size="13" fill="%2315803d" text-anchor="middle">TARGET PERSON: RE-CALIBRATED &amp; LOT QUARANTINED</text><rect x="15" y="15" width="185" height="24" rx="4" fill="%2316a34a"/><text x="107" y="31" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">TARGET: CONTAINMENT PHOTO</text></svg>`,
  leakBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fef2f2"/><g stroke="%23dc2626" stroke-width="3" fill="none"><path d="M120,150 L280,150 M160,150 L160,80 L240,80 L240,150" stroke-width="4"/><path d="M190,155 Q200,185 200,200 Q200,215 190,225" stroke="%23ef4444" stroke-width="4"/></g><text x="200" y="225" font-family="sans-serif" font-weight="bold" font-size="13" fill="%23b91c1c" text-anchor="middle">HYDRAULIC OIL LEAK AT SEAL FLANGE</text><rect x="15" y="15" width="165" height="24" rx="4" fill="%23dc2626"/><text x="97" y="31" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">INITIATOR: POINT OF DEFECT</text></svg>`,
  leakAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><g stroke="%2316a34a" stroke-width="3" fill="none"><path d="M120,150 L280,150 M160,150 L160,80 L240,80 L240,150" stroke-width="4"/><circle cx="200" cy="115" r="16" fill="%2386efac" stroke="%2316a34a"/><path d="M194,115 L198,119 L208,109" stroke-width="3" stroke="%2315803d"/></g><text x="200" y="225" font-family="sans-serif" font-weight="bold" font-size="13" fill="%2315803d" text-anchor="middle">NEW VITON O-RING INSTALLED &amp; ZERO LEAK VERIFIED</text><rect x="15" y="15" width="185" height="24" rx="4" fill="%2316a34a"/><text x="107" y="31" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">TARGET: CONTAINMENT PHOTO</text></svg>`,
  genericBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fff1f2"/><rect x="50" y="50" width="300" height="150" rx="8" fill="none" stroke="%23f43f5e" stroke-width="2" stroke-dasharray="6,6"/><circle cx="200" cy="120" r="30" fill="%23fecdd3"/><path d="M185,120 L215,120 M200,105 L200,135" stroke="%23e11d48" stroke-width="4"/><text x="200" y="170" font-family="sans-serif" font-size="12" fill="%23be123c" text-anchor="middle">POINT-OF-DEFECT PHOTO (BY INITIATOR)</text></svg>`,
  genericAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><rect x="50" y="50" width="300" height="150" rx="8" fill="none" stroke="%2386efac" stroke-width="2" stroke-dasharray="6,6"/><circle cx="200" cy="120" r="30" fill="%23bbf7d0"/><path d="M185,120 L215,120 M200,105 L200,135" stroke="%2316a34a" stroke-width="4"/><text x="200" y="170" font-family="sans-serif" font-size="12" fill="%2315803d" text-anchor="middle">CONTAINMENT PHOTO (BY TARGET PERSON)</text></svg>`
};

// Helper to compute human-readable time gap between two timestamps
export function computeTimeGapLabel(raisedTs?: string, containmentTs?: string): string {
  if (!raisedTs || !containmentTs) return 'Pending Target Containment';
  const d1 = new Date(raisedTs.replace(' ', 'T'));
  const d2 = new Date(containmentTs.replace(' ', 'T'));
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return 'Pending';
  }
  const diffMs = Math.max(0, d2.getTime() - d1.getTime());
  const totalMins = Math.round(diffMs / 60000);
  if (totalMins === 0) return '< 1 min';
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m gap`;
  }
  return `${mins} mins gap`;
}

export default function RedFlagSheetForm({
  redFlags = [],
  onAddRedFlag,
  onUpdateRedFlag,
  onCancel,
  onNavigateToTracker,
  initialWorkflowStage = 'initiator',
  initialSelectedFlagId = null,
  currentRole = 'Initiator',
  onChangeRole,
  onRoleChange
}: RedFlagSheetFormProps) {
  // Normalize initial stage to 4-stage enum:
  // 1. 'initiator'   -> Stage 1: Initiator Form (Point-of-Defect & Raising)
  // 2. 'containment' -> Stage 2: Containment Action (Immediate Containment, Quarantine & T1 Photo)
  // 3. 'rootcause'   -> Stage 3: Root Cause and Permanent Action Taken (5-Why & CAPA)
  // 4. 'quality'     -> Stage 4: Quality Verification (QA Custodian Verification & 3M Sustenance)
  const resolveStage = (s: string): 'initiator' | 'containment' | 'rootcause' | 'quality' => {
    if (s === 'target' || s === 'containment') return 'containment';
    if (s === 'rootcause' || s === 'rca') return 'rootcause';
    if (s === 'quality') return 'quality';
    return 'initiator';
  };

  const [workflowStage, setWorkflowStage] = useState<'initiator' | 'containment' | 'rootcause' | 'quality'>(
    resolveStage(initialWorkflowStage)
  );
  const [activeRole, setActiveRole] = useState<RedFlagRole>(currentRole);
  const { actions, currentUser, showDevRoleSwitch } = useRedFlag();
  const { plants, config } = useRedFlagLookups();
  const [beforeAttachmentId, setBeforeAttachmentId] = useState<string | null>(null);
  const [afterAttachmentId, setAfterAttachmentId] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);

  useEffect(() => {
    if (initialWorkflowStage) {
      setWorkflowStage(resolveStage(initialWorkflowStage));
    }
  }, [initialWorkflowStage]);

  useEffect(() => {
    setActiveRole(currentRole);
  }, [currentRole]);

  const handleRoleChange = (role: RedFlagRole) => {
    setActiveRole(role);
    if (onChangeRole) onChangeRole(role);
    if (onRoleChange) onRoleChange(role);
  };

  // Selected existing Red Flag for Stages 2, 3, 4
  const [selectedFlagId, setSelectedFlagId] = useState<string>(() => {
    if (initialSelectedFlagId) return initialSelectedFlagId;
    const firstOpen = redFlags.find(r => r.status === 'Open' || r.containmentStatus === 'Pending');
    return firstOpen ? firstOpen.id : (redFlags[0]?.id || '');
  });

  useEffect(() => {
    if (initialSelectedFlagId) {
      setSelectedFlagId(initialSelectedFlagId);
    } else if (!selectedFlagId && redFlags.length > 0) {
      const firstOpen = redFlags.find(r => r.status === 'Open' || r.containmentStatus === 'Pending');
      setSelectedFlagId(firstOpen ? firstOpen.id : redFlags[0].id);
    }
  }, [initialSelectedFlagId, redFlags]);

  const activeFlag = redFlags.find(r => r.id === selectedFlagId) || redFlags[0] || null;

  // ============================================================================
  // STAGE 1 STATE: INITIATOR (POINT-OF-DEFECT PHOTO & ANOMALY ONLY)
  // ============================================================================
  const nowFormatted = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const [raisedBy, setRaisedBy] = useState(currentUser?.label || '');
  const [raisedByDepartment, setRaisedByDepartment] = useState(currentUser?.department || '');
  const [raisedByRole, setRaisedByRole] = useState(currentUser?.roles?.[0] || '');
  const [raisedTimestamp, setRaisedTimestamp] = useState(nowFormatted());

  const [targetDepartment, setTargetDepartment] = useState('');
  const [targetPerson, setTargetPerson] = useState('');

  const [mfName, setMfName] = useState('');
  const [lineAreaName, setLineAreaName] = useState('');
  const [modelName, setModelName] = useState('');
  const [stationName, setStationName] = useState('');

  const [redFlagType, setRedFlagType] = useState<'Quality' | 'Safety' | 'Machine' | 'Process' | 'Material' | '5S' | ''>('');
  const [redFlagSubType, setRedFlagSubType] = useState('');
  const [severity, setSeverity] = useState<'Critical (Line Stop)' | 'Major (Quarantine)' | 'Moderate (Rework)' | ''>('');
  const [category5M, setCategory5M] = useState<'Man' | 'Machine' | 'Method' | 'Material' | 'Measurement' | 'Environment' | ''>('');
  const [repetitiveOccurrence, setRepetitiveOccurrence] = useState<'First Time' | 'Repetitive'>('First Time');

  const [redFlagDescription, setRedFlagDescription] = useState('');
  const [photoBefore, setPhotoBefore] = useState(presetRedFlagImages.genericBefore);
  const [qaCustodian, setQaCustodian] = useState('');
  const selectedPlantObj = plants.find(p => p.code === mfName || p.name === mfName);
  useEffect(() => {
    if (!activeFlag && !qaCustodian && selectedPlantObj?.defaultQaCustodianLabel) {
      setQaCustodian(selectedPlantObj.defaultQaCustodianLabel);
    }
  }, [activeFlag, qaCustodian, selectedPlantObj]);
  const defaultDays = config?.defaultTargetDays ?? (config as any)?.default_target_days ?? 5;
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + defaultDays);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (!activeFlag && currentUser) {
      if (!raisedBy && currentUser.label) setRaisedBy(currentUser.label);
      if (!raisedByDepartment && currentUser.department) setRaisedByDepartment(currentUser.department);
      if (!raisedByRole && currentUser.roles?.[0]) setRaisedByRole(currentUser.roles[0]);
    }
  }, [currentUser, activeFlag]);

  // ============================================================================
  // STAGE 2 STATE: CONTAINMENT ACTION & QUARANTINE (BY TARGET PERSON)
  // ============================================================================
  const [targetActionBy, setTargetActionBy] = useState('');
  const [containmentTimestamp, setContainmentTimestamp] = useState(nowFormatted());
  const [suspectQtyQuarantined, setSuspectQtyQuarantined] = useState<number>(0);
  const [quarantineTagNo, setQuarantineTagNo] = useState('');
  const [quarantineLocation, setQuarantineLocation] = useState('');
  useEffect(() => {
    if (!activeFlag && selectedPlantObj?.defaultQuarantineLocation && !quarantineLocation) {
      setQuarantineLocation(selectedPlantObj.defaultQuarantineLocation);
    }
  }, [selectedPlantObj, activeFlag, quarantineLocation]);
  const [sortingQtyInspected, setSortingQtyInspected] = useState<number>(0);
  const [sortingQtyOk, setSortingQtyOk] = useState<number>(0);
  const [sortingQtyRejected, setSortingQtyRejected] = useState<number>(0);
  const [containmentAction, setContainmentAction] = useState('');
  const [photoAfter, setPhotoAfter] = useState(presetRedFlagImages.genericAfter);

  // ============================================================================
  // STAGE 3 STATE: ROOT CAUSE & PERMANENT ACTION TAKEN (CAPA & STANDARDIZATION)
  // ============================================================================
  const [why1, setWhy1] = useState('');
  const [why2, setWhy2] = useState('');
  const [why3, setWhy3] = useState('');
  const [why4, setWhy4] = useState('');
  const [rootCause5Why, setRootCause5Why] = useState('');
  const [systematicPermanentAction, setSystematicPermanentAction] = useState('');
  const [sopUpdated, setSopUpdated] = useState(false);
  const [pfmeaUpdated, setPfmeaUpdated] = useState(false);
  const [controlPlanUpdated, setControlPlanUpdated] = useState(false);
  const [onePointLessonIssued, setOnePointLessonIssued] = useState(false);

  // ============================================================================
  // STAGE 4 STATE: QUALITY VERIFICATION & 3-MONTH SUSTENANCE
  // ============================================================================
  const [qaVerifierName, setQaVerifierName] = useState(currentUser?.label || '');
  const [qaVerificationNotes, setQaVerificationNotes] = useState('');

  // Sync state when activeFlag changes
  useEffect(() => {
    if (activeFlag) {
      setTargetActionBy(activeFlag.actionTakenBy || activeFlag.targetPerson || '');
      setContainmentTimestamp(
        activeFlag.containmentTimestamp ? activeFlag.containmentTimestamp.replace(' ', 'T') : nowFormatted()
      );
      setSuspectQtyQuarantined(activeFlag.suspectQtyQuarantined || 0);
      setQuarantineTagNo(activeFlag.quarantineTagNo || `QT-${activeFlag.redFlagNo}`);
      setQuarantineLocation(activeFlag.quarantineLocation || '');
      setSortingQtyInspected(activeFlag.sortingQtyInspected || 0);
      setSortingQtyOk(activeFlag.sortingQtyOk || 0);
      setSortingQtyRejected(activeFlag.sortingQtyRejected || activeFlag.suspectQtyQuarantined || 0);
      setContainmentAction(activeFlag.containmentAction || activeFlag.immediateActionTaken || '');
      setPhotoAfter(activeFlag.countermeasurePhoto || activeFlag.closureEvidence || '');

      setWhy1(activeFlag.why1 || '');
      setWhy2(activeFlag.why2 || '');
      setWhy3(activeFlag.why3 || '');
      setWhy4(activeFlag.why4 || '');
      setRootCause5Why(activeFlag.rootCause5Why || '');
      setSystematicPermanentAction(activeFlag.systematicPermanentAction || '');

      setSopUpdated(activeFlag.standardizationUpdates?.sopUpdated || false);
      setPfmeaUpdated(activeFlag.standardizationUpdates?.pfmeaUpdated || false);
      setControlPlanUpdated(activeFlag.standardizationUpdates?.controlPlanUpdated || false);
      setOnePointLessonIssued(activeFlag.standardizationUpdates?.onePointLessonIssued || false);

      setQaVerifierName(activeFlag.qaCustodian || currentUser?.label || '');
      setQaVerificationNotes(activeFlag.qaCustodianNotes || '');
    }
  }, [activeFlag?.id]);

  // Camera & Feedback
  const [cameraTarget, setCameraTarget] = useState<'before' | 'after' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Role permissions
  const isSuperAdmin = activeRole === 'Plant Head' || currentUser?.isPlantHead;
  const isInitiatorAuthorized = isSuperAdmin || activeRole === 'Initiator' || !activeFlag;
  const isTargetAuthorized = !activeFlag || (activeFlag.allowedActions ? activeFlag.allowedActions.includes('submitContainment') : (isSuperAdmin || activeRole === 'Target Person'));
  const isRcaAuthorized = !activeFlag || (activeFlag.allowedActions ? activeFlag.allowedActions.includes('saveRootCause') : true);
  const isQualityAuthorized = !activeFlag || (activeFlag.allowedActions ? (activeFlag.allowedActions.includes('approveContainment') || activeFlag.allowedActions.includes('startSustenance') || activeFlag.allowedActions.includes('rejectContainment')) : (isSuperAdmin || activeRole === 'Quality Custodian' || currentUser?.isQualityCustodian));

  // Demo presets
  const loadInitiatorPreset = (presetType: 'torque' | 'leak') => {
    const pastTime = new Date(Date.now() - 78 * 60 * 1000);
    const yyyy = pastTime.getFullYear();
    const mm = String(pastTime.getMonth() + 1).padStart(2, '0');
    const dd = String(pastTime.getDate()).padStart(2, '0');
    const hh = String(pastTime.getHours()).padStart(2, '0');
    const min = String(pastTime.getMinutes()).padStart(2, '0');
    setRaisedTimestamp(`${yyyy}-${mm}-${dd}T${hh}:${min}`);

    if (presetType === 'torque') {
      setPhotoBefore(presetRedFlagImages.torqueDefectBefore);
      setRedFlagType('Quality');
      setRedFlagSubType('');
      setSeverity('Major (Quarantine)');
      setCategory5M('Machine');
      setLineAreaName('');
      setStationName('');
      setModelName('');
      setRaisedBy(currentUser?.label || '');
      setRaisedByDepartment(currentUser?.department || '');
      setTargetDepartment('Maintenance');
      setTargetPerson('');
      setRedFlagDescription('Digital torque wrench #TW-04 reading 12.4 Nm on bolt M10 while standard SOP specifies 18.0 Nm (+/- 0.5 Nm). Calibration drift spotted during hourly patrol check. Assigned to Maintenance Lead for immediate containment and WIP quarantine.');
    } else {
      setPhotoBefore(presetRedFlagImages.leakBefore);
      setRedFlagType('Machine');
      setRedFlagSubType('Hydraulic Seal Leakage');
      setSeverity('Critical (Line Stop)');
      setCategory5M('Method');
      setLineAreaName('Moulding Bay 3 (Chakan)');
      setStationName('Hydraulic Press HP-02');
      setModelName('Cylinder Assy C-40');
      setRaisedBy('Sneha Kulkarni (QA Inspector)');
      setRaisedByDepartment('Quality');
      setTargetDepartment('Maintenance');
      setTargetPerson('Anand Joshi (Hydraulics Tech)');
      setRedFlagDescription('High-pressure hydraulic oil leaking from cylinder seal joint onto operator station. Pressure dropping from 140 bar to 95 bar, creating short-moulding defect risk and slip hazard.');
    }
    setError(null);
  };

  const loadContainmentPreset = () => {
    setPhotoAfter(
      activeFlag?.redFlagType === 'Machine'
        ? presetRedFlagImages.leakAfter
        : presetRedFlagImages.torqueDefectAfter
    );
    setContainmentTimestamp(nowFormatted());
    setSuspectQtyQuarantined(18);
    setQuarantineTagNo(`QT-${activeFlag?.redFlagNo || 'RF-108'}`);
    setQuarantineLocation(`${activeFlag?.mfName || 'MF1'} Locked Quarantine Cage #2`);
    setSortingQtyInspected(60);
    setSortingQtyOk(42);
    setSortingQtyRejected(18);
    setContainmentAction(
      '1. Stopped station immediately and tagged suspect batch since last OK hourly check (60 pcs inspected: 42 OK, 18 quarantined in Red Hold Cage with Tag). 2. Replaced/re-calibrated faulty unit against master standard. 3. Uploaded Containment Photo after verifying first-off 5 consecutive pieces.'
    );
    setError(null);
  };

  const loadRcaPreset = () => {
    setWhy1('Torque/pressure drifted below lower specification limit during shift run');
    setWhy2('Internal locking collar loosened due to high-frequency vibration');
    setWhy3('Preventive check sheet only verified static reading at weekly interval');
    setWhy4('No physical anti-rotation pin or controller automated shut-off interlock');
    setRootCause5Why('Absence of shift-start positive lock pin and auto-cutoff interlock on station controller');
    setSystematicPermanentAction('Installed mechanical anti-rotation lock collar and PLC lower-limit pressure/torque auto-stop interlock.');
    setSopUpdated(true);
    setPfmeaUpdated(true);
    setControlPlanUpdated(true);
    setOnePointLessonIssued(true);
    setError(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingPhoto(true);
      try {
        const kind = target === 'before' ? 'evidence_photo' : 'countermeasure_photo';
        const res = await actions.uploadAttachment(file, kind);
        if (target === 'before') {
          setBeforeAttachmentId(res.id);
          setPhotoBefore(res.url);
        } else {
          setAfterAttachmentId(res.id);
          setPhotoAfter(res.url);
        }
      } catch (err: any) {
        console.error('Photo upload failed:', err);
        setError(err.message || 'Photo upload failed.');
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  // Submit Stage 1: Initiator Form
  const handleInitiatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!redFlagDescription.trim()) {
      setError('Initiator must describe the defect/anomaly observed at the station.');
      return;
    }
    const isBeforePhotoMissing = !beforeAttachmentId && !photoBefore;
    if (isBeforePhotoMissing) {
      setError('Point-of-Defect Photo (T0) is compulsory. Please take a photo, upload a file, or click a Preset.');
      return;
    }

    let attachmentId = beforeAttachmentId;
    if (!attachmentId && photoBefore && photoBefore.startsWith('data:')) {
      try {
        const b = await dataUriToPngBlob(photoBefore);
        const up = await actions.uploadAttachment(b, 'evidence_photo');
        if (up && up.id) {
          attachmentId = up.id;
          setBeforeAttachmentId(up.id);
        }
      } catch (err) {
        console.warn('Could not upload preset/base64 attachment to server:', err);
      }
    }

    const formattedRaisedTs = raisedTimestamp.replace('T', ' ');

    try {
      const created = await actions.raiseRedFlag({
        description: redFlagDescription,
        evidenceAttachmentId: attachmentId || undefined,
        evidencePhoto: photoBefore,
        plant: mfName,
        line: lineAreaName,
        station: stationName,
        model: modelName,
        redFlagType,
        redFlagSubType,
        severity,
        category5M,
        targetDepartment,
        targetPerson,
        qaCustodian,
        repetitiveOccurrence,
        targetDate: targetDate || undefined,
        raisedBy,
        raisedByDepartment,
        raisedByRole,
        raisedTimestamp: formattedRaisedTs
      });

      if (created && created.id) {
        onAddRedFlag(created);
        setSuccessBanner(`Stage 1 Complete: Red Flag raised with Point-of-Defect Photo and routed to Target Person (${targetPerson}) for Stage 2 Containment.`);
        setTimeout(() => {
          setSuccessBanner(null);
          if (onNavigateToTracker) onNavigateToTracker();
        }, 1200);
      } else {
        throw new Error('Server did not return a valid created Red Flag record.');
      }
    } catch (err: any) {
      console.error('Failed to raise Red Flag:', err);
      setError(err.message || 'Failed to raise Red Flag. Please check required fields.');
    }
  };

  // Submit Stage 2: Containment Action
  const handleContainmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFlag) return;
    setError(null);

    if (!containmentAction.trim()) {
      setError('Target Person must describe immediate containment & quarantine actions taken.');
      return;
    }

    const isAfterPhotoMissing = !afterAttachmentId && !photoAfter;
    if (isAfterPhotoMissing) {
      setError('Target Person must capture/upload the Containment Photo (T1) to prove physical containment.');
      return;
    }

    let attachmentId = afterAttachmentId;
    if (!attachmentId && photoAfter && photoAfter.startsWith('data:')) {
      try {
        const b = await dataUriToPngBlob(photoAfter);
        const up = await actions.uploadAttachment(b, 'countermeasure_photo');
        if (up && up.id) {
          attachmentId = up.id;
          setAfterAttachmentId(up.id);
        }
      } catch (err) {
        console.warn('Could not upload containment photo blob:', err);
      }
    }

    const formattedContainmentTs = containmentTimestamp.replace('T', ' ');
    const raisedTs = activeFlag.raisedTimestamp || activeFlag.raisedDate || '';
    const gapLabel = computeTimeGapLabel(raisedTs, formattedContainmentTs);

    try {
      const updated = await actions.submitContainment(activeFlag.id, {
        containmentAction,
        suspectQtyQuarantined: Number(suspectQtyQuarantined) || 0,
        quarantineTagNo,
        quarantineLocation,
        sortingQtyInspected: Number(sortingQtyInspected) || 0,
        sortingQtyOk: Number(sortingQtyOk) || 0,
        sortingQtyRejected: Number(sortingQtyRejected) || 0,
        countermeasureAttachmentId: attachmentId || undefined,
        countermeasurePhoto: photoAfter,
        actionTakenBy: targetActionBy || activeFlag.targetPerson,
        containmentTimestamp: formattedContainmentTs,
        rowVersion: activeFlag.rowVersion
      });

      if (onUpdateRedFlag) onUpdateRedFlag(activeFlag.id, updated);
      setError(null);
      setSuccessBanner(`Stage 2 Complete: Containment Photo & Quarantine Controls submitted (${gapLabel}). Transitioning to Stage 3 Root Cause & CAPA.`);
      setTimeout(() => {
        setSuccessBanner(null);
        setWorkflowStage('rootcause');
      }, 1000);
    } catch (err: any) {
      console.error('Failed to submit containment:', err);
      setError(err.message || 'Failed to submit containment action.');
    }
  };

  // Submit Stage 3: Root Cause & Permanent Action Taken (CAPA)
  const handleRootCauseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFlag) return;
    setError(null);

    if (!rootCause5Why.trim()) {
      setError('Please provide the 5-Why root cause statement.');
      return;
    }
    if (!systematicPermanentAction.trim()) {
      setError('Please describe the permanent corrective action / Poka-Yoke deployed.');
      return;
    }

    try {
      const updated = await actions.saveRootCause(activeFlag.id, {
        why1,
        why2,
        why3,
        why4,
        rootCause5Why,
        systematicPermanentAction,
        targetDate: targetDate || activeFlag.targetDate,
        standardizationUpdates: {
          sopUpdated,
          pfmeaUpdated,
          controlPlanUpdated,
          onePointLessonIssued
        },
        rowVersion: activeFlag.rowVersion
      });

      if (onUpdateRedFlag) onUpdateRedFlag(activeFlag.id, updated);
      setError(null);
      setSuccessBanner('Stage 3 Complete: 5-Why Root Cause & Permanent Action (CAPA) submitted. Ready for Stage 4 Quality Verification.');
      setTimeout(() => {
        setSuccessBanner(null);
        setWorkflowStage('quality');
      }, 1000);
    } catch (err: any) {
      console.error('Failed to save root cause:', err);
      setError(err.message || 'Failed to submit root cause analysis.');
    }
  };

  // Submit Stage 4: Quality Verification & 3-Month Sustenance
  const handleQualitySubmit = async (decision: 'approve_containment' | 'start_sustenance' | 'reject_containment') => {
    if (!activeFlag) return;
    setError(null);

    try {
      if (decision === 'reject_containment') {
        const reason = qaVerificationNotes || 'Containment or quarantine boundary inadequate. Target Person must re-execute Stage 2.';
        const updated = await actions.rejectContainment(activeFlag.id, reason, activeFlag.rowVersion);
        if (onUpdateRedFlag) onUpdateRedFlag(activeFlag.id, updated);
        setSuccessBanner('Containment rejected by QA Custodian. Sent back to Target Person for Stage 2.');
        setTimeout(() => {
          setSuccessBanner(null);
          setWorkflowStage('containment');
        }, 1000);
        return;
      }

      if (decision === 'approve_containment') {
        const updated = await actions.approveContainment(activeFlag.id, qaVerificationNotes, activeFlag.rowVersion);
        if (onUpdateRedFlag) onUpdateRedFlag(activeFlag.id, updated);
        setSuccessBanner('Quality Custodian approved Target Person Containment Action.');
        setTimeout(() => setSuccessBanner(null), 2000);
        return;
      }

      if (decision === 'start_sustenance') {
        const updated = await actions.startSustenance(activeFlag.id, { notes: qaVerificationNotes }, activeFlag.rowVersion);
        if (onUpdateRedFlag) onUpdateRedFlag(activeFlag.id, updated);
        setSuccessBanner('QA Custodian verified CAPA and initiated 3-Month Sustenance tracking (Point Kept OPEN).');
        setTimeout(() => {
          setSuccessBanner(null);
          if (onNavigateToTracker) onNavigateToTracker();
        }, 1200);
        return;
      }
    } catch (err: any) {
      console.error('Failed Quality action:', err);
      setError(err.message || 'Failed to perform quality action.');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden max-w-5xl mx-auto my-4 transition-all">
      
      {/* Top Header */}
      <div className="bg-slate-950 px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 bg-rose-600 text-white rounded-2xl shadow-sm">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                RED FLAG 4-STAGE GOVERNANCE FORM
              </h2>
              <span className="text-[10px] font-mono bg-rose-500/30 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded uppercase font-bold">
                SFC / QA / RF-01
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Stage 1: Initiator ➔ Stage 2: Containment Action ➔ Stage 3: Root Cause &amp; CAPA ➔ Stage 4: Quality Verification
            </p>
          </div>
        </div>

        {/* Role-Based Access Indicator & Switcher */}
        {showDevRoleSwitch && (
          <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-2xl">
            <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] uppercase font-bold text-slate-400">Active Role:</span>
              <select
                value={activeRole}
                onChange={(e) => handleRoleChange(e.target.value as RedFlagRole)}
                className="bg-slate-800 text-white font-bold text-xs rounded px-2 py-1 border border-slate-700 outline-none cursor-pointer"
              >
                <option value="Initiator">Initiator (Originator)</option>
                <option value="Target Person">Target Person (Assignee)</option>
                <option value="Quality Custodian">Quality Custodian (QA)</option>
                <option value="Plant Head">Plant Head (Super-Admin)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 4-STAGE WORKFLOW SELECTOR TABS */}
      <div className="bg-slate-100 border-b border-slate-200 px-6 sm:px-8 py-3.5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          
          {/* Stage 1 */}
          <button
            type="button"
            onClick={() => { setWorkflowStage('initiator'); setError(null); }}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              workflowStage === 'initiator'
                ? 'bg-white border-rose-600 ring-2 ring-rose-500/20 shadow-xs'
                : 'bg-white/60 border-slate-200 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`w-5 h-5 rounded-full text-[11px] font-black font-mono flex items-center justify-center ${
                workflowStage === 'initiator' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                1
              </span>
              <Camera className={`w-4 h-4 ${workflowStage === 'initiator' ? 'text-rose-600' : 'text-slate-400'}`} />
            </div>
            <div className="mt-2">
              <span className="text-xs font-black uppercase text-slate-900 block truncate">1. Initiator Form</span>
              <span className="text-[10px] text-slate-500 font-mono block">Point-of-Defect T0 Photo</span>
            </div>
          </button>

          {/* Stage 2 */}
          <button
            type="button"
            onClick={() => { setWorkflowStage('containment'); setError(null); }}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              workflowStage === 'containment'
                ? 'bg-white border-amber-600 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-white/60 border-slate-200 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`w-5 h-5 rounded-full text-[11px] font-black font-mono flex items-center justify-center ${
                workflowStage === 'containment' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-200 text-slate-700'
              }`}>
                2
              </span>
              <PackageCheck className={`w-4 h-4 ${workflowStage === 'containment' ? 'text-amber-600' : 'text-slate-400'}`} />
            </div>
            <div className="mt-2">
              <span className="text-xs font-black uppercase text-slate-900 block truncate">2. Containment Action</span>
              <span className="text-[10px] text-slate-500 font-mono block">Quarantine &amp; T1 Photo</span>
            </div>
          </button>

          {/* Stage 3 */}
          <button
            type="button"
            onClick={() => { setWorkflowStage('rootcause'); setError(null); }}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              workflowStage === 'rootcause'
                ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                : 'bg-white/60 border-slate-200 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`w-5 h-5 rounded-full text-[11px] font-black font-mono flex items-center justify-center ${
                workflowStage === 'rootcause' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                3
              </span>
              <Layers className={`w-4 h-4 ${workflowStage === 'rootcause' ? 'text-indigo-600' : 'text-slate-400'}`} />
            </div>
            <div className="mt-2">
              <span className="text-xs font-black uppercase text-slate-900 block truncate">3. Root Cause &amp; CAPA</span>
              <span className="text-[10px] text-slate-500 font-mono block">5-Why &amp; Permanent Action</span>
            </div>
          </button>

          {/* Stage 4 */}
          <button
            type="button"
            onClick={() => { setWorkflowStage('quality'); setError(null); }}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              workflowStage === 'quality'
                ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-white/60 border-slate-200 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`w-5 h-5 rounded-full text-[11px] font-black font-mono flex items-center justify-center ${
                workflowStage === 'quality' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                4
              </span>
              <UserCheck className={`w-4 h-4 ${workflowStage === 'quality' ? 'text-emerald-600' : 'text-slate-400'}`} />
            </div>
            <div className="mt-2">
              <span className="text-xs font-black uppercase text-slate-900 block truncate">4. Quality Verification</span>
              <span className="text-[10px] text-slate-500 font-mono block">QA Verify &amp; 3M Sustenance</span>
            </div>
          </button>

        </div>
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div className="mx-6 sm:mx-8 mt-5 p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* ========================================================================
          STAGE 1: INITIATOR FORM (POINT-OF-DEFECT PHOTO & RAISING)
         ======================================================================== */}
      {workflowStage === 'initiator' && (
        <form onSubmit={handleInitiatorSubmit} className="p-6 sm:p-8 space-y-6">
          
          {/* Initiator Callout Banner */}
          <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <Camera className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-black text-rose-950 uppercase tracking-wide block">
                  Stage 1: Initiator Form (Defect Anomaly &amp; Point-of-Defect Photo T0)
                </span>
                <p className="text-rose-800 leading-relaxed">
                  Anyone can raise on anyone. As the <strong>Initiator</strong>, log the non-conformance, upload the compulsory <strong>Point-of-Defect Photo (T0)</strong>, and assign the <strong>Target Person</strong>. Containment actions and after photos are deferred to Stage 2.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Presets:</span>
              <button
                type="button"
                onClick={() => loadInitiatorPreset('torque')}
                className="px-2.5 py-1 text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 transition cursor-pointer"
              >
                Torque Defect
              </button>
              <button
                type="button"
                onClick={() => loadInitiatorPreset('leak')}
                className="px-2.5 py-1 text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 transition cursor-pointer"
              >
                Hydraulic Leak
              </button>
            </div>
          </div>

          {/* Section 1: Initiator & Target Person Grid */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider">
                1. Initiator (Raised By) &amp; Target Person (Raised On — Responsible for Stage 2)
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Anyone On Anyone Rule</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Initiator Card */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase">1A. Initiator (Person Raising)</span>
                  <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                    Raiser (T0)
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Your Name &amp; Designation *</label>
                  <input
                    type="text"
                    required
                    value={raisedBy}
                    onChange={(e) => setRaisedBy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Originator Dept</label>
                    <select
                      value={raisedByDepartment}
                      onChange={(e) => setRaisedByDepartment(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium outline-none"
                    >
                      <option value="">Select Originator Dept...</option>
                      <option value="Production">Production</option>
                      <option value="Quality">Quality / QA</option>
                    <option value="Maintenance">Maintenance</option>
                      <option value="Safety & EHS">Safety &amp; EHS</option>
                      <option value="Logistics & Stores">Logistics &amp; Stores</option>
                      <option value="Tooling & Die">Tooling &amp; Die</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Detection Time (T0)</label>
                    <input
                      type="datetime-local"
                      value={raisedTimestamp}
                      onChange={(e) => setRaisedTimestamp(e.target.value)}
                      className="w-full px-2 py-2 bg-white border border-slate-300 rounded-xl text-[11px] font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Target Person Card */}
              <div className="bg-white p-4.5 rounded-2xl border-2 border-amber-300 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase">1B. Target Person (Raised Against)</span>
                  <span className="text-[10px] font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                    Action Owner (Stage 2 &amp; 3)
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Department *</label>
                  <select
                    value={targetDepartment}
                    onChange={(e) => setTargetDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                  >
                    <option value="">Select Target Dept...</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Production">Production</option>
                    <option value="Tooling & Die">Tooling &amp; Die</option>
                    <option value="Quality">Quality</option>
                    <option value="Logistics & Stores">Logistics &amp; Stores</option>
                    <option value="Supplier / Inward">Supplier / Inward</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Person / Area Lead *</label>
                  <input
                    type="text"
                    required
                    value={targetPerson}
                    onChange={(e) => setTargetPerson(e.target.value)}
                    placeholder="Target Department Lead"
                    className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white"
                  />
                  <span className="text-[10px] text-amber-800 font-medium block mt-1">
                    → Will receive Red Flag to take Stage 2 Containment Action and upload T1 photo.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Machine / Line Location & 5M Classification */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider border-b border-slate-200 pb-3">
              2. Shopfloor Machine Location &amp; 5M Classification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mini-Factory</label>
                <select
                  value={mfName}
                  onChange={(e) => setMfName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                >
                  <option value="">Select Mini-Factory...</option>
                  <option value="MF1">MF1 (Assembly &amp; Testing)</option>
                  <option value="MF2">MF2 (Machining &amp; CNC)</option>
                  <option value="MF3">MF3 (Moulding &amp; Tooling)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Line / Bay Area *</label>
                <input
                  type="text"
                  required
                  value={lineAreaName}
                  onChange={(e) => setLineAreaName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Station / Machine *</label>
                <input
                  type="text"
                  required
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Model / Part No. *</label>
                <input
                  type="text"
                  required
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Red Flag Type</label>
                <select
                  value={redFlagType}
                  onChange={(e) => setRedFlagType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                >
                  <option value="">Select Red Flag Type...</option>
                  <option value="Quality">Quality (Defect/Spec)</option>
                  <option value="Machine">Machine Breakdown</option>
                  <option value="Process">Process Parameter</option>
                  <option value="Safety">Safety &amp; EHS Hazard</option>
                  <option value="Material">Material Inward Defect</option>
                  <option value="5S">5S Contamination</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">5M Category</label>
                <select
                  value={category5M}
                  onChange={(e) => setCategory5M(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                >
                  <option value="">Select 5M Category...</option>
                  <option value="Machine">Machine (Tool/Fixture/Sensor)</option>
                  <option value="Method">Method (Standard/Process)</option>
                  <option value="Material">Material (Vendor/Raw Stock)</option>
                  <option value="Man">Man (Operator Skill/Handling)</option>
                  <option value="Measurement">Measurement (Gauge/Cal)</option>
                  <option value="Environment">Environment (Oil/Mist/Dust)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 bg-rose-50 border border-rose-300 text-rose-700 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="">Select Severity...</option>
                  <option value="Critical (Line Stop)">Critical (Line Stop)</option>
                  <option value="Major (Quarantine)">Major (Quarantine Lot)</option>
                  <option value="Moderate (Rework)">Moderate (Rework)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">QA Custodian</label>
                <input
                  type="text"
                  value={qaCustodian}
                  onChange={(e) => setQaCustodian(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Anomaly Statement & Point of Defect Photo (T0) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider border-b border-slate-200 pb-3 flex items-center justify-between">
              <span>3. Anomaly Description &amp; Compulsory Point-of-Defect Photo (T0)</span>
              <span className="text-[10px] text-rose-600 font-bold">* Compulsory Evidence</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              {/* Photo Upload */}
              <div className="bg-white p-4.5 rounded-2xl border border-rose-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-700 uppercase font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    Point-of-Defect Photo (T0)
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">
                    {raisedTimestamp.replace('T', ' ')}
                  </span>
                </div>
                <div className="relative border-2 border-dashed border-rose-200 rounded-xl overflow-hidden bg-rose-50/40 aspect-video flex items-center justify-center">
                  <img crossOrigin="anonymous" src={photoBefore} alt="Defect Before" className="w-full h-full object-contain" />
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setCameraTarget('before')}
                    className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Take Defect Photo</span>
                  </button>
                  <label className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, 'before')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Anomaly Description */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1.5">
                    Defect / Anomaly Statement *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={redFlagDescription}
                    onChange={(e) => setRedFlagDescription(e.target.value)}
                    placeholder="Describe exact defect parameter observed, deviation from specification, affected batch, and why this is raised on the Target Person..."
                    className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs font-medium outline-none focus:border-slate-900 leading-relaxed"
                  />
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-700" />
                    Handoff to Stage 2 (Containment Action)
                  </span>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Submitting this form routes the Red Flag to <strong>{targetPerson}</strong> ({targetDepartment}) with status <strong>Open</strong>. The Target Person will execute physical containment, quarantine suspect parts, and log the Containment Photo (T1) in Stage 2.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-bold">{error}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-slate-200 gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel / Back to Tracker
            </button>

            <button
              type="submit"
              className="px-7 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>SUBMIT STAGE 1 &amp; ROUTE TO TARGET PERSON ({targetDepartment.toUpperCase()})</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================
          STAGE 2: CONTAINMENT ACTION & QUARANTINE (BY TARGET PERSON)
         ======================================================================== */}
      {workflowStage === 'containment' && (
        <form onSubmit={handleContainmentSubmit} className="p-6 sm:p-8 space-y-6">
          
          {/* Header & Red Flag Picker */}
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-black text-amber-950 uppercase font-mono tracking-wide flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-amber-700" />
                <span>Stage 2: Immediate Containment &amp; Quarantine Controls Form</span>
              </span>
              <p className="text-xs text-amber-900 leading-relaxed">
                Executed by <strong>Target Person</strong>. Take immediate containment action, isolate suspect WIP in Red Hold Bay, and capture <strong>Containment Photo (T1)</strong> to capture the time gap.
              </p>
            </div>

            <div className="min-w-[280px]">
              <label className="block text-[10px] font-mono font-bold text-amber-900 uppercase mb-1">
                Select Red Flag for Containment:
              </label>
              <select
                value={selectedFlagId}
                onChange={(e) => setSelectedFlagId(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-amber-400 rounded-xl text-xs font-bold text-slate-900 outline-none"
              >
                {redFlags.map(rf => (
                  <option key={rf.id} value={rf.id}>
                    {rf.redFlagNo} — Target: {rf.targetPerson || rf.targetDepartment} ({rf.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeFlag ? (
            <>
              {/* Visual Time-Gap Comparison: T0 vs T1 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-2">
                  <div className="text-xs">
                    <span className="font-mono font-bold text-slate-800">{activeFlag.redFlagNo}</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span>Initiator: <strong>{activeFlag.raisedBy}</strong> ({activeFlag.raisedByDepartment})</span>
                    <span className="mx-2 text-slate-300">➔</span>
                    <span>Target Person: <strong className="text-amber-700">{activeFlag.targetPerson}</strong> ({activeFlag.targetDepartment})</span>
                  </div>

                  {/* Time Gap Badge */}
                  <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Time Gap (T0➔T1):</span>
                    <strong className="text-amber-400">
                      {computeTimeGapLabel(
                        activeFlag.raisedTimestamp || activeFlag.raisedDate,
                        containmentTimestamp.replace('T', ' ')
                      )}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* T0 Photo (Read-Only) */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-rose-700 uppercase">1. Initiator Point-of-Defect (T0)</span>
                      <span className="text-[10px] text-slate-500">{activeFlag.raisedTimestamp || activeFlag.raisedDate}</span>
                    </div>
                    <div className="aspect-video bg-rose-50/30 rounded-xl overflow-hidden border border-rose-200 flex items-center justify-center">
                      {activeFlag.evidencePhoto ? (
                        <img crossOrigin="anonymous" src={activeFlag.evidencePhoto} alt="T0" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs text-slate-400">No Photo</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <strong>Defect:</strong> {activeFlag.redFlagDescription}
                    </p>
                  </div>

                  {/* T1 Containment Photo (Target Person Upload) */}
                  <div className="bg-white p-4 rounded-xl border-2 border-emerald-300 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-emerald-700 uppercase">2. Target Containment Photo (T1) *</span>
                      <span className="text-[10px] text-slate-500">{containmentTimestamp.replace('T', ' ')}</span>
                    </div>
                    <div className="aspect-video bg-emerald-50/30 rounded-xl overflow-hidden border border-emerald-200 flex items-center justify-center">
                      <img crossOrigin="anonymous" src={photoAfter} alt="T1" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setCameraTarget('after')}
                        className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Capture Containment Photo</span>
                      </button>
                      <label className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, 'after')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Immediate Containment & Quarantine Controls Data */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider">
                    Immediate Containment Action &amp; Physical Quarantine Controls
                  </h3>
                  <button
                    type="button"
                    onClick={loadContainmentPreset}
                    className="px-2.5 py-1 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Fill Containment Preset</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Person Executing *</label>
                    <input
                      type="text"
                      required
                      value={targetActionBy}
                      onChange={(e) => setTargetActionBy(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Containment Time (T1) *</label>
                    <input
                      type="datetime-local"
                      value={containmentTimestamp}
                      onChange={(e) => setContainmentTimestamp(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Quarantine Hold Tag No *</label>
                    <input
                      type="text"
                      required
                      value={quarantineTagNo}
                      onChange={(e) => setQuarantineTagNo(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-rose-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Quarantine Bay / Cage *</label>
                    <input
                      type="text"
                      required
                      value={quarantineLocation}
                      onChange={(e) => setQuarantineLocation(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-200">
                  <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200">
                    <label className="block text-[11px] font-bold text-rose-800 uppercase mb-1">Suspect WIP Quarantined (Pcs) *</label>
                    <input
                      type="number"
                      min="0"
                      value={suspectQtyQuarantined}
                      onChange={(e) => setSuspectQtyQuarantined(parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded text-sm font-mono font-black text-rose-700 outline-none"
                    />
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">100% Sorting Inspected</label>
                    <input
                      type="number"
                      min="0"
                      value={sortingQtyInspected}
                      onChange={(e) => setSortingQtyInspected(parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-sm font-mono font-bold text-slate-800 outline-none"
                    />
                  </div>
                  <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                    <label className="block text-[11px] font-bold text-emerald-800 uppercase mb-1">Sorting OK Released</label>
                    <input
                      type="number"
                      min="0"
                      value={sortingQtyOk}
                      onChange={(e) => setSortingQtyOk(parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded text-sm font-mono font-bold text-emerald-700 outline-none"
                    />
                  </div>
                  <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                    <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Rejected / Scrap</label>
                    <input
                      type="number"
                      min="0"
                      value={sortingQtyRejected}
                      onChange={(e) => setSortingQtyRejected(parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded text-sm font-mono font-bold text-amber-800 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1.5">
                    Immediate Containment Action Description *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={containmentAction}
                    onChange={(e) => setContainmentAction(e.target.value)}
                    placeholder="Describe immediate physical containment: machine stop, boundary tagging, WIP quarantine bay placement, temporary sorting criteria..."
                    className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs font-medium outline-none focus:border-slate-900 leading-relaxed"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="font-bold">{error}</span>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-slate-200 gap-3">
                <button
                  type="button"
                  onClick={() => setWorkflowStage('initiator')}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  ← Back to Stage 1 (Initiator)
                </button>

                <button
                  type="submit"
                  className="px-7 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>SUBMIT STAGE 2 CONTAINMENT &amp; ADVANCE TO STAGE 3 (ROOT CAUSE)</span>
                </button>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              No Red Flag available. Raise a Red Flag in Stage 1 first.
            </div>
          )}
        </form>
      )}

      {/* ========================================================================
          STAGE 3: ROOT CAUSE & PERMANENT ACTION TAKEN (5-WHY & CAPA)
         ======================================================================== */}
      {workflowStage === 'rootcause' && (
        <form onSubmit={handleRootCauseSubmit} className="p-6 sm:p-8 space-y-6">
          
          <div className="bg-indigo-50 border border-indigo-300 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-black text-indigo-950 uppercase font-mono tracking-wide flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-700" />
                <span>Stage 3: 5-Why Root Cause &amp; Permanent Action Taken (CAPA)</span>
              </span>
              <p className="text-xs text-indigo-900 leading-relaxed">
                Executed by <strong>Target Person / Cross-Functional Team</strong>. Conduct drill-down 5-Why RCA, deploy systematic permanent poka-yoke countermeasure, and complete engineering standardization.
              </p>
            </div>

            <button
              type="button"
              onClick={loadRcaPreset}
              className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Fill 5-Why &amp; CAPA Preset</span>
            </button>
          </div>

          {activeFlag ? (
            <>
              {/* 5-Why RCA Drill-down Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider border-b border-slate-200 pb-3">
                  5-Why Root Cause Drill-down (Finding True Technical &amp; Systemic Cause)
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Why 1 (Immediate Symptom):</label>
                    <input
                      type="text"
                      value={why1}
                      onChange={(e) => setWhy1(e.target.value)}
                      placeholder="Why did the defect occur at the station?"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Why 2 (Condition / Mechanism):</label>
                    <input
                      type="text"
                      value={why2}
                      onChange={(e) => setWhy2(e.target.value)}
                      placeholder="Why did that mechanical/process condition arise?"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Why 3 (Control / Standard Gap):</label>
                    <input
                      type="text"
                      value={why3}
                      onChange={(e) => setWhy3(e.target.value)}
                      placeholder="Why did current inspection/check standard fail to prevent it?"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Why 4 (Fail-Safe Absence):</label>
                    <input
                      type="text"
                      value={why4}
                      onChange={(e) => setWhy4(e.target.value)}
                      placeholder="Why was there no poka-yoke or automatic cut-off?"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div className="pt-1">
                    <label className="block text-xs font-bold text-rose-900 uppercase mb-1">
                      Final Systemic Root Cause Statement (Why 5) *
                    </label>
                    <input
                      type="text"
                      required
                      value={rootCause5Why}
                      onChange={(e) => setRootCause5Why(e.target.value)}
                      placeholder="Final systemic and engineering root cause..."
                      className="w-full px-3 py-2.5 bg-rose-50/50 border border-rose-300 rounded-xl text-xs font-bold text-rose-950 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Permanent Corrective Action & Standardization Checkboxes */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider border-b border-slate-200 pb-3">
                  Permanent Corrective Action (CAPA) &amp; Standardization
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1.5">
                    Permanent Corrective Action / Poka-Yoke Deployed *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={systematicPermanentAction}
                    onChange={(e) => setSystematicPermanentAction(e.target.value)}
                    placeholder="Specify physical poka-yoke, sensor interlock, tooling modification, or automated inspection deployed..."
                    className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs font-medium outline-none focus:border-slate-900 leading-relaxed"
                  />
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase block font-mono">
                    Engineering Standardization Required
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-medium">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={sopUpdated} onChange={(e) => setSopUpdated(e.target.checked)} />
                      <span>SOP Updated</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={pfmeaUpdated} onChange={(e) => setPfmeaUpdated(e.target.checked)} />
                      <span>PFMEA Revised</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={controlPlanUpdated} onChange={(e) => setControlPlanUpdated(e.target.checked)} />
                      <span>Control Plan Revised</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={onePointLessonIssued} onChange={(e) => setOnePointLessonIssued(e.target.checked)} />
                      <span>OPL Training Given</span>
                    </label>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="font-bold">{error}</span>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-slate-200 gap-3">
                <button
                  type="button"
                  onClick={() => setWorkflowStage('containment')}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  ← Back to Stage 2 (Containment)
                </button>

                <button
                  type="submit"
                  className="px-7 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Layers className="w-4 h-4" />
                  <span>SUBMIT STAGE 3 CAPA &amp; ADVANCE TO STAGE 4 (QUALITY VERIFICATION)</span>
                </button>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              No Red Flag available. Select an incident in Stage 2 first.
            </div>
          )}
        </form>
      )}

      {/* ========================================================================
          STAGE 4: QUALITY VERIFICATION & 3-MONTH SUSTENANCE
         ======================================================================== */}
      {workflowStage === 'quality' && (
        <div className="p-6 sm:p-8 space-y-6">
          
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-black text-emerald-950 uppercase font-mono tracking-wide flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-700" />
                <span>Stage 4: Quality Custodian Verification &amp; 3-Month Sustenance Form</span>
              </span>
              <p className="text-xs text-emerald-900 leading-relaxed">
                QA serves as official Custodian. Verify T0 vs T1 photos, approve containment &amp; CAPA, and govern the mandatory 3-month (30/60/90-day) zero-recurrence sustenance window.
              </p>
            </div>

            <div className="min-w-[280px]">
              <label className="block text-[10px] font-mono font-bold text-emerald-900 uppercase mb-1">
                Select Red Flag for QA Review:
              </label>
              <select
                value={selectedFlagId}
                onChange={(e) => setSelectedFlagId(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-emerald-400 rounded-xl text-xs font-bold text-slate-900 outline-none"
              >
                {redFlags.map(rf => (
                  <option key={rf.id} value={rf.id}>
                    {rf.redFlagNo} — {rf.stationName} ({rf.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeFlag ? (
            <>
              {/* Visual Audit Strip: T0 Defect vs T1 Containment */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    Incident Audit: {activeFlag.redFlagNo} ({activeFlag.stationName})
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900 bg-slate-200 px-3 py-1 rounded-xl">
                    Time Gap: {activeFlag.containmentTimeGap || computeTimeGapLabel(activeFlag.raisedTimestamp, activeFlag.containmentTimestamp)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-white p-3.5 rounded-xl border border-rose-200 space-y-2">
                    <span className="text-xs font-bold text-rose-700 uppercase font-mono block">
                      1. Initiator Point of Defect (T0)
                    </span>
                    <div className="aspect-video bg-rose-50/40 rounded-xl overflow-hidden border border-rose-100 flex items-center justify-center">
                      {activeFlag.evidencePhoto ? (
                        <img crossOrigin="anonymous" src={activeFlag.evidencePhoto} alt="T0" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs text-slate-400">No Photo</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg">
                      <strong>Defect:</strong> {activeFlag.redFlagDescription}
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-2">
                    <span className="text-xs font-bold text-emerald-700 uppercase font-mono block">
                      2. Target Containment Photo (T1)
                    </span>
                    <div className="aspect-video bg-emerald-50/40 rounded-xl overflow-hidden border border-emerald-100 flex items-center justify-center">
                      {activeFlag.countermeasurePhoto || activeFlag.closureEvidence ? (
                        <img crossOrigin="anonymous" src={activeFlag.countermeasurePhoto || activeFlag.closureEvidence} alt="T1" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs text-amber-700 font-bold">Pending Target Containment Photo</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg">
                      <strong>Containment:</strong> {activeFlag.containmentAction || 'Pending'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quality Custodian Verification Form */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider border-b border-slate-200 pb-3">
                  Quality Custodian Sign-Off &amp; 3-Month Sustenance Authorization
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">QA Custodian Name</label>
                    <input
                      type="text"
                      value={qaVerifierName}
                      onChange={(e) => setQaVerifierName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Quality Remarks / Verification Guidance</label>
                    <input
                      type="text"
                      value={qaVerificationNotes}
                      onChange={(e) => setQaVerificationNotes(e.target.value)}
                      placeholder="Enter QA verification notes on quarantine lot & poka-yoke..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>

                {isQualityAuthorized ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleQualitySubmit('reject_containment')}
                      className="px-4 py-2.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer"
                    >
                      ✕ Reject Containment (Send Back to Target Person)
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQualitySubmit('approve_containment')}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                      >
                        ✓ Verify Containment &amp; Quarantine
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQualitySubmit('start_sustenance')}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>APPROVE CAPA &amp; INITIATE 3-MONTH SUSTENANCE (KEEP OPEN)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                    <span>
                      * Role-Based Access: Quality Custodian authority is required to sign off on Stage 4. You are viewing as <strong>{activeRole}</strong>.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRoleChange('Quality Custodian')}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer transition shrink-0 ml-2"
                    >
                      Switch to Quality Role ➔
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              No Red Flag available. Select an incident in Stage 2 first.
            </div>
          )}
        </div>
      )}

      {/* Live Camera Modal */}
      {cameraTarget && (
        <CameraModal
          isOpen={true}
          title={cameraTarget === 'before' ? 'Stage 1: Capture Point-of-Defect Photo (T0)' : 'Stage 2: Capture Containment Photo (T1)'}
          onCapture={(base64) => {
            if (cameraTarget === 'before') setPhotoBefore(base64);
            else setPhotoAfter(base64);
            setCameraTarget(null);
          }}
          onClose={() => setCameraTarget(null)}
        />
      )}

    </div>
  );
}
