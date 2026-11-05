import React, { useState, useMemo } from 'react';
import { SafetyObservation, NearMissReport, AccidentReport, SafetyIncident } from '../../types';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Check, 
  FileText, 
  Camera, 
  UserCheck, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  ShieldCheck, 
  Eye, 
  Stethoscope, 
  Layers, 
  RefreshCw, 
  Play, 
  Send, 
  Calendar, 
  MapPin, 
  Building,
  User,
  Wrench,
  Flame,
  Award,
  HelpCircle,
  ExternalLink,
  Printer
} from 'lucide-react';

export interface TimelineStage {
  stageNumber: number;
  id: string;
  title: string;
  shortName: string;
  slaHours: string;
  responsibleRole: string;
  responsiblePerson: string;
  status: 'completed' | 'in-progress' | 'pending' | 'overdue';
  timestamp?: string;
  summary: string;
  actionDetails: string[];
  photoUrl?: string;
  photoLabel?: string;
  deliverables?: string[];
  signOff?: {
    approvedBy: string;
    approvedAt: string;
    remarks: string;
  };
}

export interface IncidentTimelineItem {
  id: string;
  referenceNo: string;
  type: 'Safety Observation' | 'Near Miss' | 'Accident Report' | 'General Incident';
  severity: 'Cat A (Critical)' | 'Cat B (High)' | 'Cat C (Medium)' | 'Low';
  title: string;
  location: string;
  minifactory: string;
  dateReported: string;
  reportedBy: string;
  currentStageNumber: number;
  overallStatus: 'Reported' | 'Contained' | 'Under RCA' | 'CAPA Implementation' | 'Closed';
  photoBefore?: string;
  photoAfter?: string;
  stages: TimelineStage[];
}

interface IncidentTimelineProps {
  observations?: SafetyObservation[];
  nearMisses?: NearMissReport[];
  accidents?: AccidentReport[];
  incidents?: SafetyIncident[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (id: string) => void;
  onAdvanceStage?: (incidentId: string, targetStage: number) => void;
  isCoordinatorRole?: boolean;
}

// Built-in industrial incident progression presets for demonstration
const DEFAULT_TIMELINE_PRESETS: IncidentTimelineItem[] = [
  {
    id: 'so-36-timeline',
    referenceNo: 'OBS-2026-036',
    type: 'Safety Observation',
    severity: 'Cat B (High)',
    title: 'Water Leak Puddle Near 415V Air Filter Electrical Unit',
    location: 'Drinking water point, Sub-Assembly Line 2',
    minifactory: 'MF3 (BPV Products)',
    dateReported: '12-Oct-2026 09:15 AM',
    reportedBy: 'Sagar Fadtare (Shift A Operator)',
    currentStageNumber: 4,
    overallStatus: 'CAPA Implementation',
    photoBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fef2f2"/><g stroke="%23dc2626" stroke-width="2" fill="none"><rect x="140" y="80" width="120" height="100" fill="%23fee2e2" stroke="%23b91c1c" stroke-width="3" rx="6"/><path d="M170,120 L230,120 M200,95 L200,165" stroke="%23b91c1c" stroke-width="3"/><path d="M200,40 Q180,60 200,80" stroke="%230284c7" stroke-width="4" stroke-dasharray="3,3"/><circle cx="200" cy="85" r="5" fill="%230284c7"/></g><text x="200" y="215" font-family="sans-serif" font-weight="bold" font-size="13" fill="%23b91c1c" text-anchor="middle">WATER POOLING NEAR ELECTRICAL UNIT</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%23dc2626"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">BEFORE</text></svg>`,
    photoAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><g stroke="%2316a34a" stroke-width="2" fill="none"><rect x="140" y="80" width="120" height="100" fill="%23dcfce7" stroke="%2315803d" stroke-width="3" rx="6"/><rect x="120" y="65" width="160" height="15" fill="%2316a34a" rx="4"/><path d="M190,130 L197,137 L210,124" stroke="%2315803d" stroke-width="4"/></g><text x="200" y="215" font-family="sans-serif" font-weight="bold" font-size="13" fill="%2315803d" text-anchor="middle">PERMANENT TROUGH &amp; RELOCATED VALVE</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%2316a34a"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">AFTER</text></svg>`,
    stages: [
      {
        stageNumber: 1,
        id: 'stage-1',
        title: 'Stage 1: Hazard Observation & Before Condition Logged',
        shortName: 'Hazard Logged',
        slaHours: 'Immediate',
        responsibleRole: 'Shopfloor Initiator',
        responsiblePerson: 'Sagar Fadtare',
        status: 'completed',
        timestamp: '12-Oct-2026, 09:15 AM (Shift A)',
        summary: 'Initiator raised hazard in SFMS portal. Documented water puddle pooling within 40cm of 415V electrical filter control box.',
        actionDetails: [
          'Unsafe condition flagged: water bottle dispensing point valve dripping during bottle changes.',
          'Initial Before status photo captured via shopfloor mobile terminal.',
          'Automated alert broadcasted to Shift A Team Leader and EHS Coordinator desk.'
        ],
        photoLabel: 'Photo 01: Water leak at dispenser',
        deliverables: ['Observation Log #36', 'Before Condition Photo', 'Shift A Ticket'],
        signOff: {
          approvedBy: 'Sagar Fadtare (Operator)',
          approvedAt: '12-Oct-2026 09:20 AM',
          remarks: 'Submitted for 2-hour containment'
        }
      },
      {
        stageNumber: 2,
        id: 'stage-2',
        title: 'Stage 2: Shift Containment & Immediate Action (2-Hr SLA)',
        shortName: 'Shift Containment',
        slaHours: 'Within 2.0 Hrs',
        responsibleRole: 'Shift Supervisor / Line Leader',
        responsiblePerson: 'Mahesh Patil (Shift Leader)',
        status: 'completed',
        timestamp: '12-Oct-2026, 10:45 AM (1.5 hrs elapsed)',
        summary: 'Immediate containment executed. Water line shutoff valve isolated, yellow warning barrier cones placed around wet floor.',
        actionDetails: [
          'Water flow shut off; floor mopped completely dry with absorbent squeegee.',
          'Heavy-duty rubber non-conductive safety matting placed in front of electrical control panel.',
          'Area cordoned off with high-visibility caution bunting tape.'
        ],
        deliverables: ['Shift Containment Log', 'Rubber Mat Verification', 'Area Barricade Photo'],
        signOff: {
          approvedBy: 'Mahesh Patil (Line Supervisor)',
          approvedAt: '12-Oct-2026 10:50 AM',
          remarks: 'Immediate electrical contact risk eliminated. Ready for Safety Coordinator RCA.'
        }
      },
      {
        stageNumber: 3,
        id: 'stage-3',
        title: 'Stage 3: Safety Coordinator Assessment & 5-Why RCA',
        shortName: 'Coordinator 5-Why RCA',
        slaHours: 'Within 24 Hrs',
        responsibleRole: 'Safety Coordinator',
        responsiblePerson: 'Prakash Deshmukh (EHS Coordinator)',
        status: 'completed',
        timestamp: '12-Oct-2026, 03:30 PM',
        summary: 'Safety Coordinator classified incident as Category B (Medium-High Risk). Completed Ishikawa fishbone and 5-Why root cause audit.',
        actionDetails: [
          'Category B assigned due to close proximity to energized machinery power terminal.',
          '5-Why Analysis: 1) Why water puddle? Dispenser nozzle dripped. 2) Why? Water bottle valve seal worn out. 3) Why? Dispenser located directly above main cable tray. 4) Why? No drain tray installed. 5) Root Cause: Station layout lacked standardized fluid isolation boundary.',
          'ICA Status closed; Permanent Corrective Action (PCA) charter formulated with Central Engineering.'
        ],
        deliverables: ['5-Why RCA Worksheet', 'Category B Risk Scorecard', 'Engineering Work Order #E-401'],
        signOff: {
          approvedBy: 'Prakash Deshmukh (Safety Coordinator)',
          approvedAt: '12-Oct-2026 04:00 PM',
          remarks: 'Root cause confirmed. Engineering work order approved for permanent stainless drip tray.'
        }
      },
      {
        stageNumber: 4,
        id: 'stage-4',
        title: 'Stage 4: Permanent Corrective Action (PCA) & Engineering Fix',
        shortName: 'Permanent CAPA',
        slaHours: 'Within 7 Days',
        responsibleRole: 'Maintenance & Facility Lead',
        responsiblePerson: 'Amol Patil (Central Toolroom)',
        status: 'in-progress',
        timestamp: 'Active - Target: 18-Oct-2026',
        summary: 'Toolroom fabricated custom 304-grade stainless steel splash shield and dedicated drainage trough plumbed into shop drain pipe.',
        actionDetails: [
          'Fabricated 1.2m stainless steel drainage pan with 3/4" flexible PVC drain hose routed to shop trench.',
          'Relocated water dispensing cooler 2.5 meters away from electrical panel line.',
          'Captured After Improvement photo demonstrating dry, clean, shielded station.'
        ],
        photoLabel: 'Photo 02: Stainless drainage trough installed',
        deliverables: ['Engineering Drawing DWG-882', 'After Proof Photo', 'Maintenance Sign-off Form']
      },
      {
        stageNumber: 5,
        id: 'stage-5',
        title: 'Stage 5: 3-Shift Effectiveness Sign-off & Horizontal Closure',
        shortName: 'Closure & Horizontal',
        slaHours: 'Within 14 Days',
        responsibleRole: 'EHS Head & Plant Manager',
        responsiblePerson: 'EHS Manager / Plant Head',
        status: 'pending',
        timestamp: 'Scheduled upon Stage 4 Completion',
        summary: 'Final Gemba audit across Shifts A, B, and C to verify zero leakage. Standard deployed horizontally across MF1, MF2, and Machining.',
        actionDetails: [
          'Shift A, B, C verification over 72 continuous operating hours with zero re-occurrence.',
          'Horizontal deployment audit: inspect all 14 water dispenser stations across plant.',
          'EHS Master Register digital sign-off and permanent SOP standardization.'
        ],
        deliverables: ['3-Shift Verification Sheet', 'Horizontal Deployment Audit (14 Stations)', 'Final EHS Closure Certificate']
      }
    ]
  },
  {
    id: 'nm-1-timeline',
    referenceNo: 'NM-2026-001',
    type: 'Near Miss',
    severity: 'Cat A (Critical)',
    title: 'Heavy Component Trolley Stuck in Floor Patch - Fixture Tilt',
    location: 'Between L3 & L4 Gangway near Column #12',
    minifactory: 'MF1 (Vacuum & Oil Pump)',
    dateReported: '17-Feb-2026 06:30 PM',
    reportedBy: 'Nagraj (Shift Manager)',
    currentStageNumber: 5,
    overallStatus: 'Closed',
    stages: [
      {
        stageNumber: 1,
        id: 'stage-1',
        title: 'Stage 1: Near Miss Incident Reported',
        shortName: 'Incident Reported',
        slaHours: 'Immediate',
        responsibleRole: 'Initiator / Manager',
        responsiblePerson: 'Nagraj',
        status: 'completed',
        timestamp: '17-Feb-2026 06:30 PM',
        summary: 'Trolley carrying 85kg machining fixture hit broken concrete floor depression, causing fixture to tilt dangerously close to worker foot.',
        actionDetails: ['Logged exact gangway location', 'Initial scene photo attached', 'Reported via Near-miss portal'],
        deliverables: ['Near-Miss Ticket NM-001']
      },
      {
        stageNumber: 2,
        id: 'stage-2',
        title: 'Stage 2: Shift Containment & Gangway Isolation',
        shortName: 'Containment',
        slaHours: 'Within 2.0 Hrs',
        responsibleRole: 'Shift Team Leader',
        responsiblePerson: 'Ramesh S',
        status: 'completed',
        timestamp: '17-Feb-2026 07:15 PM',
        summary: 'Fixture safely hoisted back onto table. Gangway section barricaded with traffic cones and alternate route designated.',
        actionDetails: ['Heavy fixture restabilized', 'Warning cones installed', 'Gangway rerouted'],
        deliverables: ['Containment Protocol 2B']
      },
      {
        stageNumber: 3,
        id: 'stage-3',
        title: 'Stage 3: Root Cause Investigation & Fishbone Analysis',
        shortName: 'Cause Investigation',
        slaHours: 'Within 24 Hrs',
        responsibleRole: 'Safety Coordinator',
        responsiblePerson: 'Gunaji Parab',
        status: 'completed',
        timestamp: '18-Feb-2026 10:00 AM',
        summary: 'Investigation revealed: 1) Concrete floor patch spalled due to heavy forklift transit. 2) Trolley had rigid swivel casters without dual wheel locks.',
        actionDetails: ['Civil repair order issued', 'Trolley mechanical specs audited'],
        deliverables: ['Investigation Report 01']
      },
      {
        stageNumber: 4,
        id: 'stage-4',
        title: 'Stage 4: Corrective Action Implementation (Civil & Mechanical)',
        shortName: 'CAPA Implemented',
        slaHours: 'Within 7 Days',
        responsibleRole: 'Maintenance Lead',
        responsiblePerson: 'Amol Patil',
        status: 'completed',
        timestamp: '10-Mar-2026 04:00 PM',
        summary: 'Excavated damaged floor patch and laid high-strength industrial epoxy screed. Retrofitted polyurethane heavy-load casters with foot brakes.',
        actionDetails: ['High-build epoxy patch cured', 'New wheel brakes fitted to 6 trolleys'],
        deliverables: ['Civil Handover Certificate']
      },
      {
        stageNumber: 5,
        id: 'stage-5',
        title: 'Stage 5: Final Closure & Horizontal Plant Deployment',
        shortName: 'Final Closure',
        slaHours: 'Within 14 Days',
        responsibleRole: 'EHS Plant Head',
        responsiblePerson: 'EHS Department Head',
        status: 'completed',
        timestamp: '03-May-2026 11:30 AM',
        summary: 'Horizontal deployment completed across MF1, MF2, and MF3 gangways. Zero floor defects verified. Formally closed in register.',
        actionDetails: ['Plant-wide floor audit completed', 'Horizontal deployment confirmed', 'Closure signed'],
        deliverables: ['Closure Certificate #CR-001'],
        signOff: {
          approvedBy: 'EHS Plant Head',
          approvedAt: '03-May-2026',
          remarks: 'All horizontal deployment checks cleared. Case closed permanently.'
        }
      }
    ]
  },
  {
    id: 'acc-1-timeline',
    referenceNo: 'ACC-2025-CR03',
    type: 'Accident Report',
    severity: 'Cat A (Critical)',
    title: 'Cut Injury on Left Hand Thumb During Aluminum Deburring',
    location: 'Pierburg Module Line 1, Station 3',
    minifactory: 'Machining Division',
    dateReported: '11-Jan-2025 08:40 PM',
    reportedBy: 'Dr. Arjun Choudhary (OHC Medical Officer)',
    currentStageNumber: 3,
    overallStatus: 'Under RCA',
    stages: [
      {
        stageNumber: 1,
        id: 'stage-1',
        title: 'Stage 1: Accident Medical Report Raised by Doctor (Within 8 Hrs)',
        shortName: 'Doctor Report',
        slaHours: 'Within 8 Hrs',
        responsibleRole: 'Medical Officer / Doctor',
        responsiblePerson: 'Dr. Arjun Choudhary',
        status: 'completed',
        timestamp: '11-Jan-2025 08:40 PM (Second Shift)',
        summary: 'Injured operator Prince Yadav (TS262) arrived at Plant OHC with laceration on left hand thumb. Antiseptic cleaning, suture dressing, and tetanus injection administered.',
        actionDetails: [
          'First aid rendered at company dispensary.',
          'Medical assessment: Cut injury on thumb; 0 mandays lost; resumed same shift under light duty.',
          'Form Page 01 submitted to Safety Coordinator and HR within 8-hour window.'
        ],
        deliverables: ['KSPG/EHS Page 01 Form', 'OHC Medical Log', 'Injury Photos']
      },
      {
        stageNumber: 2,
        id: 'stage-2',
        title: 'Stage 2: Shift Containment & Deburring Tool Replacement',
        shortName: 'Containment',
        slaHours: 'Within 2.0 Hrs',
        responsibleRole: 'Process Owner / HOD',
        responsiblePerson: 'Gunaji Parab (Module HOD)',
        status: 'completed',
        timestamp: '11-Jan-2025 09:30 PM',
        summary: 'Defective worn deburring tool removed from station immediately. Operator issued cut-resistant Level 5 Kevlar glove replacement.',
        actionDetails: [
          'Station operation paused for 15 minutes for safety inspection.',
          'Damaged ceramic blade discarded into sharps container.',
          'Level 5 cut-resistant safety gloves verified for all operators on line.'
        ],
        deliverables: ['Containment Protocol', 'PPE Inspection Sheet']
      },
      {
        stageNumber: 3,
        id: 'stage-3',
        title: 'Stage 3: Safety Coordinator 5-Why RCA (Attachment 3 Page 02)',
        shortName: '5-Why RCA Audit',
        slaHours: 'Within 48 Hrs',
        responsibleRole: 'Safety Coordinator & Investigation Team',
        responsiblePerson: 'Gunaji Parab & EHS Committee',
        status: 'in-progress',
        timestamp: 'Active - Under Investigation',
        summary: 'Conducting Page 02 Investigation. Identified Unsafe Acts & Conditions: Operator not wearing handgloves at moment of part handling + sharp edge casing burr.',
        actionDetails: [
          '5-Why Breakdown: Why cut? Sharp flash contacted thumb. Why? Operator removed glove to feel surface smoothness. Why? Heavy knit glove lacked tactile feedback. Why? Tactile fine-handling cut gloves not specified in SOP. Root Cause: SOP PPE matrix specified general glove instead of EN388 Level 5 PU coated tactile gloves.',
          'One Point Lesson (OPL) drafted for deburring station display.'
        ],
        deliverables: ['KSPG/EHS Page 02 RCA', '5-Why Tree Document', 'Witness Statements (Vishwajit Patil, Nitesh Patil)']
      },
      {
        stageNumber: 4,
        id: 'stage-4',
        title: 'Stage 4: Corrective Actions & OPL Training',
        shortName: 'CAPA & OPL',
        slaHours: 'Target: 11-Feb-2025',
        responsibleRole: 'Line Supervisor',
        responsiblePerson: 'Gunaji Parab',
        status: 'pending',
        timestamp: 'Target Date: 11-Feb-2025',
        summary: 'Deploy One Point Lesson (OPL) display on station and complete mandatory cut safety awareness training for all team members.',
        actionDetails: [
          'Display OPL at Station 3 deburring arbor.',
          '100% training sign-off for Module Line 1 operators on glove compliance.'
        ],
        deliverables: ['OPL #25-04', 'Training Attendance Register']
      },
      {
        stageNumber: 5,
        id: 'stage-5',
        title: 'Stage 5: Management Review & Final Closure Sign-off',
        shortName: 'Final Sign-off',
        slaHours: 'Target: 18-Feb-2025',
        responsibleRole: 'Plant Head & EHS Lead',
        responsiblePerson: 'Plant Head (Pune) & Safety Lead',
        status: 'pending',
        timestamp: 'Target Date: 18-Feb-2025',
        summary: 'Final review by Plant Head and EHS Department Head. Closure approval upon zero repeat cut incidents.',
        actionDetails: [
          'Audit PPE compliance across all deburring stations in plant.',
          'Final digital signatures from Manager and Plant Head.'
        ],
        deliverables: ['CR/03 Closure Sign-off']
      }
    ]
  }
];

export default function IncidentTimeline({
  observations = [],
  nearMisses = [],
  accidents = [],
  incidents = [],
  selectedIncidentId,
  onSelectIncident,
  onAdvanceStage,
  isCoordinatorRole = false
}: IncidentTimelineProps) {
  // Merge live observations, near misses, and accidents into timeline items
  const timelineItems: IncidentTimelineItem[] = useMemo(() => {
    const list: IncidentTimelineItem[] = [...DEFAULT_TIMELINE_PRESETS];

    // Add any real observations not in presets
    observations.forEach(obs => {
      const exists = list.some(item => item.referenceNo.includes(String(obs.srNo)));
      if (!exists) {
        const isClosed = obs.status === 'Closed';
        const hasPCA = !!obs.pca;
        const hasWhy = !!obs.why1 || !!obs.rootCause;
        const currentStage = isClosed ? 5 : hasPCA ? 4 : hasWhy ? 3 : 2;

        list.push({
          id: obs.id,
          referenceNo: `OBS-${obs.srNo}`,
          type: 'Safety Observation',
          severity: obs.category === 'A' ? 'Cat A (Critical)' : obs.category === 'B' ? 'Cat B (High)' : 'Cat C (Medium)',
          title: obs.beforeCondition.slice(0, 70) + (obs.beforeCondition.length > 70 ? '...' : ''),
          location: `${obs.station}, ${obs.line || 'Line'}`,
          minifactory: obs.minifactory,
          dateReported: `${obs.date} (Shift ${obs.shift})`,
          reportedBy: obs.raisedBy,
          currentStageNumber: currentStage,
          overallStatus: isClosed ? 'Closed' : currentStage === 4 ? 'CAPA Implementation' : currentStage === 3 ? 'Under RCA' : 'Contained',
          photoBefore: obs.photoBefore,
          photoAfter: obs.photoAfter,
          stages: [
            {
              stageNumber: 1,
              id: 'stg-1',
              title: 'Stage 1: Hazard Observation Logged',
              shortName: 'Hazard Logged',
              slaHours: 'Immediate',
              responsibleRole: 'Shopfloor Initiator',
              responsiblePerson: obs.raisedBy,
              status: 'completed',
              timestamp: `${obs.date} (Shift ${obs.shift})`,
              summary: obs.beforeCondition,
              actionDetails: [`Logged by ${obs.raisedBy} at ${obs.station}`, `Legend: ${obs.legend}`]
            },
            {
              stageNumber: 2,
              id: 'stg-2',
              title: 'Stage 2: Shift Containment & Immediate Control (ICA)',
              shortName: 'Shift Containment',
              slaHours: 'Within 2.0 Hrs',
              responsibleRole: 'Line Supervisor',
              responsiblePerson: 'Area Line Leader',
              status: currentStage >= 2 ? 'completed' : 'in-progress',
              timestamp: obs.date,
              summary: obs.ica || 'Immediate containment initiated to safe-off the area.',
              actionDetails: ['Immediate containment logged', `ICA Status: ${obs.icaStatus || 'Open'}`]
            },
            {
              stageNumber: 3,
              id: 'stg-3',
              title: 'Stage 3: Safety Coordinator Review & 5-Why RCA',
              shortName: 'Coordinator 5-Why',
              slaHours: 'Within 24 Hrs',
              responsibleRole: 'Safety Coordinator',
              responsiblePerson: obs.coordinatorName || 'Safety Coordinator',
              status: currentStage >= 3 ? (currentStage > 3 ? 'completed' : 'in-progress') : 'pending',
              summary: obs.rootCause || 'Coordinator root cause assessment and 5-Why analysis.',
              actionDetails: [
                `Category Assigned: ${obs.category || 'Pending'}`,
                obs.why1 ? `Why 1: ${obs.why1}` : '5-Why analysis in progress',
                obs.rootCause ? `Root Cause: ${obs.rootCause}` : 'Determining root cause'
              ]
            },
            {
              stageNumber: 4,
              id: 'stg-4',
              title: 'Stage 4: Permanent Corrective Action (PCA)',
              shortName: 'Permanent CAPA',
              slaHours: 'Within 7 Days',
              responsibleRole: 'Responsible Owner',
              responsiblePerson: obs.responsibility || 'Assigned Lead',
              status: currentStage >= 4 ? (currentStage > 4 ? 'completed' : 'in-progress') : 'pending',
              summary: obs.pca || 'Permanent engineering action to prevent recurrence.',
              actionDetails: [
                `PCA: ${obs.pca || 'Pending proposal'}`,
                `Target Due Date: ${obs.dueDate || 'Pending'}`
              ]
            },
            {
              stageNumber: 5,
              id: 'stg-5',
              title: 'Stage 5: Effectiveness Verification & Horizontal Closure',
              shortName: 'Final Closure',
              slaHours: 'Within 14 Days',
              responsibleRole: 'EHS Coordinator',
              responsiblePerson: 'EHS Head',
              status: isClosed ? 'completed' : 'pending',
              timestamp: obs.closingDate || undefined,
              summary: `Horizontal deployment in ${obs.horizontalDeploymentArea || 'plant'}. Status: ${obs.horizontalDeploymentStatus || 'Open'}.`,
              actionDetails: [
                `Horizontal Area: ${obs.horizontalDeploymentArea || 'All lines'}`,
                `Closing Date: ${obs.closingDate || 'Open'}`
              ]
            }
          ]
        });
      }
    });

    return list;
  }, [observations, nearMisses, accidents]);

  // Selected Incident State
  const [activeIncidentId, setActiveIncidentId] = useState<string>(
    selectedIncidentId || DEFAULT_TIMELINE_PRESETS[0].id
  );

  // Active incident item
  const activeIncident = useMemo(() => {
    return timelineItems.find(item => item.id === activeIncidentId) || timelineItems[0];
  }, [timelineItems, activeIncidentId]);

  // Expanded Stage IDs (Default: active stage expanded)
  const [expandedStageIds, setExpandedStageIds] = useState<Record<string, boolean>>({
    'stage-1': true,
    'stage-2': true,
    'stage-3': true,
    'stage-4': true,
    'stg-1': true,
    'stg-2': true,
    'stg-3': true,
    'stg-4': true
  });

  const toggleExpand = (stageId: string) => {
    setExpandedStageIds(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    activeIncident.stages.forEach(stg => {
      allExpanded[stg.id] = true;
    });
    setExpandedStageIds(allExpanded);
  };

  const collapseAll = () => {
    setExpandedStageIds({});
  };

  // Local simulated stage advance
  const [localStageProgress, setLocalStageProgress] = useState<Record<string, number>>({});
  
  const currentStageNum = localStageProgress[activeIncident.id] ?? activeIncident.currentStageNumber;

  const handleSimulateNextStage = () => {
    if (currentStageNum < 5) {
      const nextStage = currentStageNum + 1;
      setLocalStageProgress(prev => ({
        ...prev,
        [activeIncident.id]: nextStage
      }));
      // Expand newly active stage
      const nextStageObj = activeIncident.stages.find(s => s.stageNumber === nextStage);
      if (nextStageObj) {
        setExpandedStageIds(prev => ({ ...prev, [nextStageObj.id]: true }));
      }
      if (onAdvanceStage) {
        onAdvanceStage(activeIncident.id, nextStage);
      }
    }
  };

  const handleResetStages = () => {
    setLocalStageProgress(prev => ({
      ...prev,
      [activeIncident.id]: activeIncident.currentStageNumber
    }));
  };

  // Calculate progress percentage
  const progressPercent = Math.min(100, Math.round(((currentStageNum - 1) / 4) * 100));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Top Banner & Incident Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider">
                EHS Incident Lifecycle Stepper
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs text-slate-500 font-mono">5-Stage SOP Progression</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1 flex items-center space-x-2">
              <span>Incident Progression Timeline</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Timeline</span>
            </button>
            {isCoordinatorRole && (
              <>
                <button
                  onClick={handleSimulateNextStage}
                  disabled={currentStageNum >= 5}
                  className="flex items-center space-x-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{currentStageNum >= 5 ? 'All Stages Complete' : `Advance to Stage ${currentStageNum + 1}`}</span>
                </button>
                {localStageProgress[activeIncident.id] && (
                  <button
                    onClick={handleResetStages}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    title="Reset stage"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Incident Filter Selector Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono">
            Select Active Incident to Trace Progression:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {timelineItems.map(item => {
              const isSelected = item.id === activeIncident.id;
              const itemCurrentStage = localStageProgress[item.id] ?? item.currentStageNumber;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveIncidentId(item.id);
                    if (onSelectIncident) onSelectIncident(item.id);
                  }}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-500/20 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {item.referenceNo}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase ${
                      item.type === 'Safety Observation' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      item.type === 'Near Miss' ? 'bg-orange-100 text-orange-900 border border-orange-300' :
                      'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}>
                      {item.type}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-2 line-clamp-1">
                    {item.title}
                  </h4>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 font-mono">
                    <span>{item.minifactory}</span>
                    <span className="font-semibold text-amber-700">
                      Stage {itemCurrentStage}/5
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Incident Header Overview Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/20">
                {activeIncident.referenceNo}
              </span>
              <span className="text-xs text-slate-400 font-mono">·</span>
              <span className="text-xs text-slate-300 font-mono">{activeIncident.type}</span>
              <span className="text-xs text-slate-400 font-mono">·</span>
              <span className="text-xs font-bold text-rose-400">{activeIncident.severity}</span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-wide mt-1">
              {activeIncident.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1 font-mono">
              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span>{activeIncident.location}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Building className="w-3.5 h-3.5 text-indigo-400" />
                <span>{activeIncident.minifactory}</span>
              </span>
              <span className="flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reported by: {activeIncident.reportedBy}</span>
              </span>
            </div>
          </div>

          {/* Progress Circular Badge / Metrics */}
          <div className="flex items-center space-x-4 shrink-0 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Current Status
              </div>
              <div className="text-sm font-black text-amber-400 mt-0.5">
                {currentStageNum >= 5 ? '✅ Full Closure' : `Stage ${currentStageNum}: ${activeIncident.stages[currentStageNum - 1]?.shortName}`}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                {progressPercent}% Complete
              </div>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-amber-500/30 border-t-amber-400 flex items-center justify-center font-black text-xs font-mono text-white">
              {currentStageNum}/5
            </div>
          </div>
        </div>

        {/* Horizontal Progress Bar Strip */}
        <div className="pt-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
            <span>Stage 1: Logged</span>
            <span>Stage 2: Contained</span>
            <span>Stage 3: 5-Why RCA</span>
            <span>Stage 4: CAPA</span>
            <span>Stage 5: Closure</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent === 0 ? 20 : progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Expand / Collapse Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
            Vertical Stepper Journey ({activeIncident.stages.length} Milestones)
          </span>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={expandAll}
            className="text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
          >
            Expand All
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={collapseAll}
            className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* THE VERTICAL STEPPER COMPONENT */}
      <div className="relative pl-6 md:pl-10 space-y-8 before:absolute before:left-3 md:before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
        {activeIncident.stages.map((stage, idx) => {
          const isCurrentActive = stage.stageNumber === currentStageNum;
          const isPassed = stage.stageNumber < currentStageNum;
          const isPending = stage.stageNumber > currentStageNum;
          const isExpanded = !!expandedStageIds[stage.id];

          // Determine stage color accents
          const accentColor = isPassed 
            ? 'emerald' 
            : isCurrentActive 
            ? 'amber' 
            : 'slate';

          return (
            <div key={stage.id} className="relative group">
              
              {/* Stepper Node Icon on Vertical Line */}
              <div 
                className={`absolute -left-6 md:-left-10 top-0.5 w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-all z-10 ${
                  isPassed
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                    : isCurrentActive
                    ? 'bg-amber-600 text-white ring-4 ring-amber-100 animate-pulse'
                    : 'bg-white border-2 border-slate-300 text-slate-400'
                }`}
              >
                {isPassed ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <span>{stage.stageNumber}</span>
                )}
              </div>

              {/* Stage Card */}
              <div 
                className={`bg-white border rounded-2xl transition-all shadow-xs overflow-hidden ${
                  isCurrentActive
                    ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-md'
                    : isPassed
                    ? 'border-slate-250 hover:border-slate-300'
                    : 'border-slate-200 opacity-80'
                }`}
              >
                {/* Header (Clickable to Toggle Expansion) */}
                <div 
                  onClick={() => toggleExpand(stage.id)}
                  className={`p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none transition ${
                    isCurrentActive ? 'bg-amber-50/40' : 'bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider ${
                        isPassed
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isCurrentActive
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {isPassed ? 'Completed' : isCurrentActive ? 'Active Stage' : 'Upcoming'}
                      </span>
                      <span className="text-slate-300 font-mono">·</span>
                      <span className="text-[11px] font-mono font-semibold text-slate-500">
                        SLA: {stage.slaHours}
                      </span>
                      {stage.timestamp && (
                        <>
                          <span className="text-slate-300 font-mono">·</span>
                          <span className="text-[11px] font-mono text-slate-600 flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{stage.timestamp}</span>
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {stage.title}
                    </h3>
                  </div>

                  {/* Responsible Role & Expand Arrow */}
                  <div className="flex items-center space-x-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Responsible</div>
                      <div className="text-xs font-bold text-slate-800">{stage.responsibleRole}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{stage.responsiblePerson}</div>
                    </div>
                    <div className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Collapsible Content Body */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-100 space-y-4 text-xs animate-fade-in">
                    
                    {/* Summary Description */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800 leading-relaxed font-medium">
                      {stage.summary}
                    </div>

                    {/* Action Items List */}
                    {stage.actionDetails && stage.actionDetails.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px] block">
                          Stage Execution Checklist &amp; Actions Taken:
                        </span>
                        <div className="space-y-1.5">
                          {stage.actionDetails.map((action, aIdx) => (
                            <div key={aIdx} className="flex items-start space-x-2 text-slate-700 bg-white p-2 rounded-lg border border-slate-150">
                              <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isPassed || isCurrentActive ? 'text-emerald-600' : 'text-slate-300'}`} />
                              <span className="leading-snug">{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Photographic Visual Proof (If Available for this Stage) */}
                    {(stage.stageNumber === 1 && activeIncident.photoBefore) && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="font-bold text-slate-800 uppercase tracking-wider font-mono text-[10px] block mb-1.5">
                          📸 Stage 1 Visual Evidence (Before Status Hazard):
                        </span>
                        <div className="border border-red-200 rounded-xl overflow-hidden max-w-sm aspect-video bg-red-50/20 p-1 flex items-center justify-center shadow-xs">
                          <img src={activeIncident.photoBefore} alt="Stage 1 Hazard Proof" className="max-h-full max-w-full object-contain rounded" />
                        </div>
                      </div>
                    )}

                    {(stage.stageNumber === 4 && activeIncident.photoAfter) && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="font-bold text-slate-800 uppercase tracking-wider font-mono text-[10px] block mb-1.5">
                          📸 Stage 4 Visual Verification (Permanent After Status):
                        </span>
                        <div className="border border-emerald-200 rounded-xl overflow-hidden max-w-sm aspect-video bg-emerald-50/20 p-1 flex items-center justify-center shadow-xs">
                          <img src={activeIncident.photoAfter} alt="Stage 4 CAPA Verification" className="max-h-full max-w-full object-contain rounded" />
                        </div>
                      </div>
                    )}

                    {/* Deliverables Badges */}
                    {stage.deliverables && stage.deliverables.length > 0 && (
                      <div className="pt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold font-mono text-slate-500 uppercase mr-1">
                          Audited Deliverables:
                        </span>
                        {stage.deliverables.map((deliv, dIdx) => (
                          <span key={dIdx} className="text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-mono">
                            📄 {deliv}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Official Sign-Off Block */}
                    {stage.signOff && (
                      <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 flex items-start space-x-3">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-0.5">
                          <div className="font-bold text-emerald-950">
                            Signed Off by {stage.signOff.approvedBy} · {stage.signOff.approvedAt}
                          </div>
                          <div className="text-emerald-800 italic">
                            "{stage.signOff.remarks}"
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Stage Controls if Current Active & Coordinator Role */}
                    {isCoordinatorRole && isCurrentActive && (
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSimulateNextStage();
                          }}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Stage {stage.stageNumber} Complete</span>
                        </button>
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
