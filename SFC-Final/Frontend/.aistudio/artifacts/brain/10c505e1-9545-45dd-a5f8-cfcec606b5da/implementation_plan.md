# End-to-End Red Flag Procedure System (Integrated with 5S, Kaizen & PPSR)

A comprehensive, shop-floor-ready digital Red Flag Standard Operating Procedure (SOP) and incident lifecycle engine for the SFC (Shop Floor Control) Tracker. It guides operators, team leaders, and quality managers from initial anomaly detection and immediate containment through cross-functional escalation, PPSR 8D problem-solving, Kaizen poka-yoke creation, 5S CAPA linkage, and multi-tier effectiveness sign-off.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Architecture & Scope Decision**:
> - **Cross-Module Integration**: The user explicitly confirmed that the Red Flag procedure must be deeply **integrated with 5S, Kaizen, and PPSR (Practical Problem Solving Report)** rather than operating as a disconnected silo.
> - **Unified Workflow**: Raising a Red Flag serves as the authoritative shop-floor incident entry point; unresolved or systemic issues can seamlessly spawn a PPSR 8D report, generate a Kaizen improvement sheet, or link to 5S contamination/containment actions without double entry.
> - **Recommended Default SLA**: Strict industrial timelines (Containment: $\le 2$ hours, Root Cause & Plan: $\le 24$ hours, CAPA Implementation: $\le 72$ hours, Effectiveness Validation: 7 days) with automated escalation flags.

---

## 1. Overview & Core Concept

### What It Does
The End-to-End Red Flag Procedure transforms shop-floor defect handling from reactive firefighting into a structured, audit-proof 5-stage lifecycle:
1. **Stage 1: Anomaly Detection & Immediate Flagging**: Mobile-friendly defect capture (photo evidence, line/station, 5M+1E categorization, severity tier, first-time vs repetitive flag).
2. **Stage 2: Shift Containment (4D / 2-Hour SLA)**: Quarantining suspect WIP, segregating lots, tagging physical parts, and immediate containment sign-off by Shift In-charge.
3. **Stage 3: Cross-Module Escalation & RCA**:
   - **Escalate to PPSR (8D)**: Auto-populates D1–D3 of an 8D report for high-severity or repetitive defects.
   - **Convert to Kaizen**: Spawns a Kaizen suggestion sheet with "Before" conditions pre-filled to engineer out the root cause (Poka-Yoke / Error Proofing).
   - **Link to 5S CAPA**: Creates a 5S Red Tag or Source of Contamination (SOC) log if caused by workplace disorganization or machine leakages.
4. **Stage 4: Permanent Corrective Action (CAPA)**: 5-Why analysis, engineering change orders (PFD, PFMEA, Control Plan, SOP updates), and allocated responsibilities.
5. **Stage 5: Multi-Level Effectiveness Validation & Closure**: Verification across 3 consecutive shifts without recurrence, photo comparison (Before vs After), and formal digital sign-off (Shift Lead $\rightarrow$ Quality Lead $\rightarrow$ Plant Head).

### Target Audience & Personas
- **Shop-Floor Operators & Team Leaders**: Fast, one-thumb mobile photo capture, immediate lot quarantine guidance, and containment checklists.
- **Quality Assurance (QA) Engineers**: Root-cause analysis (5-Why, Ishikawa 5M), PPSR 8D team facilitation, and PFMEA updates.
- **Production & Maintenance Managers**: SLA tracking, containment approval, and recurring defect heatmaps.
- **Plant Quality Head / Plant Manager**: Final closure authority, escalation reviews, and cross-plant standard deployment.

### Key Value
- **Zero Loss of Traceability**: Direct digital lineage from the initial shop-floor defect photo to the root-cause PPSR and resulting permanent Kaizen.
- **Zero Defect Escapes**: Enforced physical containment checklist before any line clearance or status progress.
- **Audit Compliance**: Complete IATF 16949 / ISO 9001 standard adherence with printable Red Flag Action Sheets.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       END-TO-END RED FLAG WORKFLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘
  [1. Anomaly Raised]       [2. Containment]            [3. Escalation / Linkage]
  • Photo capture            • Suspect parts count       • [⚡ Escalate to PPSR 8D]
  • Severity & 5M tag        • Tagged & quarantined      • [💡 Convert to Kaizen]
  • Auto-assigned owner      • Shift Lead sign-off       • [🏷️ Link 5S Red Tag]
           │                         │                               │
           ▼                         ▼                               ▼
  [Status: OPEN] ────────► [Status: CONTAINED] ──────► [Status: IN-PROGRESS]
                                                                     │
  [5. Closed & Audited]     [4. Permanent CAPA]                      │
  • 3-Shift run validation   • 5-Why RCA root cause ◄────────────────┘
  • Multi-tier signature     • SOP / PFMEA revised
  • Printable Action Sheet   • Permanent poka-yoke
```

1. **Interactive SOP Visualizer Tab**:
   - A dedicated interactive standard operating procedure flowchart showing the 5 stages, responsibilities, SLA clocks, and gate criteria.
   - Users can click any stage node to view the standard operating rules, mandatory documents, and escalation trigger points.
2. **Procedure-Guided Red Flag Action Drawer / Modal**:
   - Instead of a plain edit dialog, opening a Red Flag reveals a guided **Stage-Gate Stepper** (1. Detection $\rightarrow$ 2. Containment $\rightarrow$ 3. Root Cause $\rightarrow$ 4. Permanent Action $\rightarrow$ 5. Effectiveness & Closure).
   - Clear visual status ribbons with countdown timers against the SLA deadline (e.g., `"Containment Due in 45m"`, `"SLA Overdue by 4h"`).
3. **Cross-Module Action Bar**:
   - One-click buttons directly inside the Red Flag detail sheet:
     - **"Promote to PPSR 8D"**: Instantly creates a new PPSR record with Red Flag ID reference, defect description, containment photos, and team leads pre-populated.
     - **"Generate Kaizen Sheet"**: Opens Kaizen creation form with the problem description, station/line, and before-photo pre-filled.
     - **"Create 5S Red Tag / SOC Log"**: Immediately adds an item into the 5S Holding Area or Source of Contamination log.
4. **Printable Standard Red Flag Action Sheet**:
   - A clean, print-optimized document view with standard plant branding, barcode/QR ID, before/after evidence photos, 5-Why root cause chain, and physical signature approval blocks.

### Visual Identity & Theme
- **Domain Aesthetic**: Industrial High-Reliability Shop-Floor Console (SaaS & Dashboard domain guidelines).
- **Color Palette**:
  - Dominant Neutral: Clean crisp slate `#F8FAFC` canvas with `#FFFFFF` cards and `#0F172A` high-contrast headers.
  - Alert Crimson (`#E11D48` / `#BE123C`): Critical alerts, open red flags, containment quarantine indicators.
  - Warning Amber (`#D97706`): Approaching SLA, containment pending, in-progress investigation.
  - Verification Emerald (`#059669`): Verified containment, trial passed, closed & signed off.
  - Integrated Accents: Indigo (`#4F46E5`) for Kaizen link, Cyan (`#0891B2`) for PPSR 8D link, Purple (`#7C3AED`) for 5S link.
- **Typography**:
  - Primary UI: `Plus Jakarta Sans` for crisp titles and clear navigation.
  - Telemetry & Codes: Tabular figures (`tabular-nums`) with `JetBrains Mono` / `font-mono` for Red Flag numbers, dates, part counts, and SLA timers.
- **Zero-Pill Discipline**:
  - Informational metadata (dates, stations, departments) rendered as unboxed typography separated by clean middots (`·`).
  - Active interactive filters styled as segmented control buttons with clean surface elevation.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Two-Way Cross-Module Data Linkage
- **Chosen Approach**: When a Red Flag is escalated to PPSR or Kaizen, bidirectional references (`linkedPpsrId`, `linkedKaizenId`, `linkedFiveSId`) are stored on both records.
- **Why**: Allows users viewing a Kaizen to see "Originated from Red Flag #RF-2026-089" and vice-versa, providing end-to-end traceability for customer quality audits.
- **Alternatives Considered**: Duplicating data into standalone records without link tracking (causes data drift and audit non-conformance).

### Decision 2: Stage-Gated Lifecycle vs Freeform Status Dropdown
- **Chosen Approach**: Enforce prerequisite fields for stage progression (e.g., cannot move to "In-Progress" without documented containment action and suspect quantity; cannot close without 3-shift validation sign-off).
- **Why**: Prevents premature closure of dangerous quality and safety defects on the shop floor.
- **Alternatives Considered**: Loose dropdown selector without validation (leads to uncontained WIP reaching customers).

### Decision 3: Interactive Visual SOP Flowchart Tab
- **Chosen Approach**: Build an interactive graphical SOP viewer directly inside the Red Flag module alongside the Register and Analytics.
- **Why**: Serves as a standard training guide (One-Point Lesson) for shop floor operators, operators during Gemba walks, and auditors reviewing plant procedures.

---

## 4. Technical Architecture & Data Strategy

### System Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND COMPONENTS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  src/modules/RedFlagModule.tsx (Parent Container & Sub-Navigation)          │
│    │                                                                        │
│    ├── Tab 1: RedFlagDashboard.tsx (KPIs, Pareto by 5M, SLA Aging, Trends)  │
│    │                                                                        │
│    ├── Tab 2: RedFlagRegister.tsx (Filterable Table & Card Views)           │
│    │     └── RedFlagActionModal.tsx (5-Stage Guided Stepper & Approvals)    │
│    │           ├── Stage 1: Detection Details & Evidence Photos             │
│    │           ├── Stage 2: 4D Containment & Suspect WIP Quarantine         │
│    │           ├── Stage 3: Cross-Module Linkage (PPSR 8D / Kaizen / 5S)    │
│    │           ├── Stage 4: 5-Why Root Cause & Permanent CAPA               │
│    │           └── Stage 5: Validation Run & Digital Sign-off               │
│    │                                                                        │
│    ├── Tab 3: RedFlagSOPFlowchart.tsx (Interactive Standard Procedure)      │
│    │     ├── 5-Stage Interactive Timeline & Escalation Matrix Matrix        │
│    │     └── SLA Governance & Level 1/2/3 Plant Escalation Triggers         │
│    │                                                                        │
│    └── RedFlagPrintSheet.tsx (Print-ready IATF Standard Action Sheet)       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND & DATA API                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  server.ts                                                                  │
│    ├── GET/POST/PUT/DELETE /api/redflags (Full CRUD with stage-gates)       │
│    ├── POST /api/redflags/:id/escalate-ppsr (Auto-creates linked PPSR)      │
│    ├── POST /api/redflags/:id/convert-kaizen (Auto-creates linked Kaizen)   │
│    └── POST /api/redflags/:id/link-fives (Auto-creates 5S Red Tag / SOC)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Extended Data Model (`RedFlag` entity enhancements)
```typescript
export interface RedFlagStageAudit {
  stage: 'Detection' | 'Containment' | 'RootCause' | 'CAPA' | 'Effectiveness';
  completedAt?: string;
  completedBy?: string;
  signOffRole?: string;
  notes?: string;
}

export interface RedFlag {
  id: string;
  srNo: string;
  redFlagNo: string;
  raisedDate: string;
  raisedBy: string;
  mfName: string;
  lineAreaName: string;
  modelName: string;
  stationName: string;
  
  // Categorization & Severity
  redFlagType: 'Quality' | 'Process' | 'Machine' | 'Safety' | 'Material' | '5S';
  redFlagSubType: string;
  severity: 'Critical (Line Stop)' | 'Major (Quarantine)' | 'Moderate (Rework)';
  category5M: 'Man' | 'Machine' | 'Material' | 'Method' | 'Measurement' | 'Environment';
  repetitiveOccurrence: 'First Time' | 'Repetitive';
  
  // Description & Evidence
  redFlagDescription: string;
  evidencePhoto: string;
  teamLeader: string;
  responsibleDepartment: string;
  closureResponsibility: string;
  targetDate: string;
  
  // Stage 2: Containment
  containmentStatus: 'Pending' | 'Contained' | 'Verified';
  suspectQtyQuarantined?: number;
  containmentAction?: string;
  containmentVerifiedBy?: string;
  containmentVerifiedDate?: string;
  
  // Stage 3: Cross-Module Linkages
  linkedPpsrId?: string;       // Linked 8D / Practical Problem Solving Report
  linkedKaizenId?: string;     // Linked Kaizen Improvement Sheet
  linkedFiveSRedTagId?: string;// Linked 5S Red Tag
  
  // Stage 4: Root Cause (5-Why) & Permanent Action
  why1?: string;
  why2?: string;
  why3?: string;
  why4?: string;
  rootCause5Why?: string;
  systematicPermanentAction?: string;
  actionTakenBy?: string;
  actionTakenDate?: string;
  standardizationUpdates?: {
    sopUpdated: boolean;
    pfmeaUpdated: boolean;
    controlPlanUpdated: boolean;
    onePointLessonIssued: boolean;
  };
  
  // Stage 5: Effectiveness Validation & Closure
  validationTrialShifts?: number; // e.g. 3 shifts
  validationTrialResults?: string;
  closureEvidence?: string;
  status: 'Open' | 'Contained' | 'In-Progress' | 'Under-Trial' | 'Closed';
  closureDate?: string;
  approvedByQA?: string;
  approvedByProduction?: string;
  
  // Audit Trail
  stageHistory?: RedFlagStageAudit[];
  createdAt: string;
}
```

### Integration Sequences & Interactive Handlers
1. **"Escalate to PPSR 8D"**:
   - Operator clicks button on Red Flag Action Modal $\rightarrow$ API creates new PPSR report with title `[RF Escalation] <redFlagNo>: <redFlagDescription>`, D1 team, D2 problem statement $\rightarrow$ Updates Red Flag with `linkedPpsrId` and shifts status to `In-Progress` $\rightarrow$ Toast alert with link to view the PPSR immediately.
2. **"Convert to Kaizen"**:
   - Operator clicks "Convert to Kaizen" $\rightarrow$ Modal opens Kaizen creation pre-filled with Before Photo, Problem Description, Station/Line, and Kaizen Category $\rightarrow$ Submitting saves the Kaizen and writes `linkedKaizenId` into the Red Flag.
3. **"Link to 5S Red Tag / SOC"**:
   - If defect relates to unneeded items or machine contamination, creates a Red Tag in the 5S Holding Area with Red Flag reference number and photo.
4. **Interactive SOP Flowchart**:
   - Visual step nodes with clickable SLA cards, escalation triggers, and downloadable standard procedure summary.
