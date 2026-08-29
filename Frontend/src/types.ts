// ─── PSQ / Shainin Component Search Types ────────────────────────────────────

export interface PsqChildPartSwapItem {
  id: string;
  partName: string;
  wowInBobValue: string;
  wowInBobResult: string; // 'BOB' | 'WOW' | ''
  bobInWowValue: string;
  bobInWowResult: string; // 'BOB' | 'WOW' | ''
  isDefective: boolean;
  status: 'pending' | 'eliminated' | 'target';
  notes?: string;
}

export interface PsqComponentSearchData {
  productName: string;
  productNumber: string;
  customerName: string;
  testResultSpecification: string;
  activeStage: 0 | 1 | 2;

  stage0: {
    bobOriginal: string;
    wowOriginal: string;
    bobRepeat1: string;
    wowRepeat1: string;
    bobRepeat2: string;
    wowRepeat2: string;
    bobRepeat3: string;
    wowRepeat3: string;
    measurementGood: boolean;
    deltaMStatus: 'active' | 'eliminated';
    deltaPStatus: 'active' | 'eliminated';
    notes?: string;
  };

  stage1: {
    bobRepeat1: string;
    wowRepeat1: string;
    bobRepeat2: string;
    wowRepeat2: string;
    bobRepeat3: string;
    wowRepeat3: string;
    processGood: boolean;
    assemblyProcessStatus: 'active' | 'eliminated';
    partsStatus: 'active' | 'eliminated';
    notes?: string;
  };

  stage2: {
    childParts: PsqChildPartSwapItem[];
    contributingPartName?: string;
    notes?: string;
  };
}

export interface PsqTreeData {
  projectStatement: string;
  bigXTarget?: string;
  ftqRejectionRate?: string;
  estimatedCost?: string;
  treeType: 'swap_analysis';
  swapData: PsqComponentSearchData;
}

// ─── End PSQ Types ────────────────────────────────────────────────────────────

export interface OpenImpactAction {
  id: string;
  kaizenSrNo: string;
  kaizenTitle: string;
  department: string;
  category: 'Man' | 'Machine' | 'Material' | 'Method' | 'Measurement' | 'Safety' | 'Horizontal Deployment';
  impactDescription: string;
  assignedOwner: string;
  targetDate: string;
  status: 'Open' | 'In Progress' | 'Closed';
  actionTaken: string;
  closedDate?: string;
  verifiedBy?: string;
  createdAt: string;
}

export interface ImpactItem {
  required: boolean;
  description?: string;
  assignedTo: string; // Default is the Kaizen initiator
  status: 'Pending' | 'Completed' | 'Not Required';
  completedBy?: string;
  completedDate?: string;
  notes?: string;
}

export interface AllocatedResource {
  id: string;
  name: string;
  role: string; // e.g., Quality Engineer, Safety Officer, Process Lead
  taskAssigned: string; // e.g. "PFMEA Revision", "PFD Drawing", "Safety Risk Assessment"
}

export interface KaizenImpactAssessment {
  decidedInReview: boolean;
  reviewedDate?: string;
  reviewedBy?: string;
  fiveMChange: ImpactItem;
  safetyImpact: ImpactItem;
  pfdUpdate: ImpactItem;
  pfmeaUpdate: ImpactItem;
  allocatedResources: AllocatedResource[];
  overallClosureStatus: 'Pending Review' | 'Actions Allocated' | 'In-Progress' | 'Fully Closed';
  closedBy?: string;
  closureDate?: string;
  closureRemarks?: string;
}

export interface Kaizen {
  id: string;
  srNo: string;
  month: string;
  suggestionDate: string;
  title: string;
  problemBefore: string;
  counterMeasureAfter: string;
  area: string;
  minifactory: string;
  location: string;
  machine: string;
  closingTargetDate: string;
  implementedDate: string;
  costSave: number;
  benefits: {
    p: boolean; // Productivity
    q: boolean; // Quality
    c: boolean; // Cost
    d: boolean; // Delivery
    s: boolean; // Safety
    m: boolean; // Morale
  };
  ideaBy: string;
  implementedBy: string;
  preparedBy: string;
  approvedBy: string;
  verifiedBy: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Good Point' | 'Rejected';
  classification: 'Kaizen' | 'Good Point' | 'Pending' | 'None';
  remark: string;
  photoBefore?: string; // Raw storage key (from backend) or base64 (local preview only)
  photoAfter?: string;  // Raw storage key (from backend) or base64 (local preview only)
  photoBeforeUrl?: string; // Full URL to display the before image (served by Django media)
  photoAfterUrl?: string;  // Full URL to display the after image (served by Django media)
  result: string;
  impactAssessment?: KaizenImpactAssessment;
  cftVotes?: { voterName: string; rank: 1 | 2 | 3 }[];
  createdAt: string;
}

export interface RedFlag {
  id: string;
  srNo: string;
  raisedDate: string;
  mfName: string;
  lineAreaName: string;
  modelName: string;
  stationName: string;
  redFlagNo: string;
  status: 'Open' | 'In-Progress' | 'Closed';
  redFlagType: 'Quality' | 'Process' | 'Machine' | 'Safety' | 'Material';
  redFlagSubType: string;
  responsibleDepartment: string;
  redFlagDescription: string;
  evidencePhoto: string;
  teamLeader: string;
  repetitiveOccurrence: 'First Time' | 'Repetitive';
  closureResponsibility: string;
  immediateActionTaken: string;
  actionTakenBy: string;
  actionTakenDate: string;
  systematicPermanentAction: string;
  targetDate: string;
  closureDate: string;
  closureEvidence: string;
  createdAt: string;
}

export interface FiveSAudit {
  id: string;
  auditDate: string;
  area: string;
  auditor: string;
  sortScore: number;       // 1-5
  setInOrderScore: number; // 1-5
  shineScore: number;      // 1-5
  standardizeScore: number;// 1-5
  sustainScore: number;    // 1-5
  totalScore: number;      // average percentage
  remarks: string;
  status: 'Excellent' | 'Good' | 'Needs Improvement';
  createdAt: string;
}

export interface SafetyIncident {
  id: string;
  incidentDate: string;
  type: 'Unsafe Act' | 'Unsafe Condition' | 'Near Miss' | 'Minor Injury';
  area: string;
  description: string;
  reportedBy: string;
  immediateAction: string;
  status: 'Open' | 'Closed';
  targetDate: string;
  closedDate: string;
  createdAt: string;
}

export interface PpsrReport {
  id: string;
  ppsrNo: string;
  title: string;
  problemStatement: string;
  rootCauseAnalysis: string; // fallback string
  containmentAction: string; // fallback string
  permanentCorrectiveAction: string; // fallback string
  validationCheck: string; // fallback string
  status: 'Open' | 'In-Progress' | 'Closed';
  targetDate: string;
  leadOwner: string;
  createdAt: string;

  // Expanded BE detailed fields
  projectLeader?: string;
  teamMembers?: string;
  plant?: string;
  lineStation?: string;
  productComponent?: string;
  amountDefects?: string;
  discoveredOn?: string;
  discoveredBy?: string;
  repeatCase?: 'yes' | 'no';
  sketchPhoto?: string;

  factsAnalysis?: {
    whatIs: string; whatIsNot: string;
    whereIs: string; whereIsNot: string;
    howIs: string; howIsNot: string;
    whenIs: string; whenIsNot: string;
  };

  containmentActionsList?: Array<{
    no: number;
    action: string;
    responsible: string;
    date: string;
    status: 'planned' | 'in-progress' | 'implemented' | 'proven';
  }>;

  ishikawa?: {
    man: string[];
    machine: string[];
    material: string[];
    methods: string[];
    milieu: string[];
    measurement: string[];
  };

  fiveWhysList?: {
    column1: string[];
    column2: string[];
    column3: string[];
  };

  correctiveActionsList?: Array<{
    no: number;
    measure: string;
    responsible: string;
    deadline: string;
    status: 'planned' | 'in-progress' | 'completed' | 'proven';
  }>;

  effectivenessEvidence?: string;
  effectivenessChartData?: Array<{ name: string; value: number }>;

  standardizationList?: Array<{
    no: number;
    measure: string;
    responsible: string;
    date: string;
    status: 'planned' | 'in-progress' | 'completed' | 'proven';
  }>;

  readAcrossList?: Array<{
    no: number;
    proposal: string;
    responsible: string;
    deadline: string;
  }>;
  readAcrossExplanation?: string;

  completionSignatures?: {
    projectLeader: string;
    steeringCommittee: string;
    completedOn: string;
  };

  // Meeting spreadsheet review fields
  jiraNumber?: string;
  week?: string;
  coach?: string;
  cft?: string;
  stdStatusMF?: string;
  stdDate?: string;
  effDaysStd?: number;
  responsibility?: string;
  ppsrEndDate?: string;
  effDaysClosePpsr?: number;
  prodQtyBefore?: number;
  rejectedQtyBefore?: number;
  pctBefore?: number;
  prodQtyAfter?: number;
  rejectedQtyAfter?: number;
  pctAfter?: number;
  effectivityText?: string;
  custDemandQtyMonth?: number;
  custDemandQtyAnnum?: number;
  qtyMonthBeforeRejPct?: number;
  qtyMonthAfterRejPct?: number;
  qtyMonthSavedRejPct?: number;
  perSetRejectionCost?: number;
  costSavePerMonth?: number;
  costSavePerAnnum?: number;
  remarks?: string;

  // Cause Localization approach & PSQ tree
  causeLocalizationApproach?: 'both' | 'fishbone' | 'psq';
  psqTreeData?: PsqTreeData;

  // Evidence type selector (e.g. 'graph' | 'photo')
  evidenceType?: string;
  initialEvidenceType?: string;

  // Defect trend data arrays
  defectTrendData?: Array<{ date: string; defectsCount: number }>;
  initialDefectTrendData?: Array<{ date: string; defectsCount: number }>;

  // Committee Presentation & Review Feedback
  presentationFeedback?: PpsrCommitteeFeedback[];
  committeeDecision?: 'Approved' | 'Re-work Needed' | 'In Review';
  committeeDecisionDate?: string;
}

export interface PpsrCommitteeFeedback {
  id: string;
  stepNumber: number; // 1-8
  stepTitle: string;
  reviewerName: string;
  feedbackType: 'revision_needed' | 'clarification' | 'approved' | 'general';
  comment: string;
  createdAt: string;
  resolved?: boolean;
}

export interface PpsrMeetingLog {
  id: string;
  meetingDate: string;
  chairperson: string;
  attendees: string;
  keyDiscussionPoints: string;
  discussedPpsrIds: string[]; // IDs of PPSRs reviewed in this session
  nextReviewDate: string;
  createdAt: string;
}

export type UserPersona = 'operator' | 'committee' | 'manager';

