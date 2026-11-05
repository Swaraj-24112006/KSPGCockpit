// Safety Desk Type Definitions

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

// Submodule 1: Safety Observation (Attachment 1)
export interface SafetyObservation {
  id: string;
  srNo: number | string;
  date: string; // e.g. "12-Oct-26"
  shift: 'A' | 'B' | 'C' | 'General';
  raisedBy: string; // Anyone in the organisation
  minifactory: string; // e.g. MF3, Engineering, MF1
  line: string;
  station: string; // e.g. Drinking water point, Testing room
  legend: 'Unsafe condition' | 'Unsafe act';
  beforeCondition: string; // Description of condition prior to action
  photoBefore?: string;
  photoAfter?: string;

  // Coordinator section (from Category onward)
  category?: 'A' | 'B' | 'C'; // Category A, B, C
  ica?: string; // Immediate Corrective Action
  targetDate?: string; // Target date for ICA
  icaStatus?: 'Open' | 'Closed';
  why1?: string;
  why2?: string;
  why3?: string;
  why4?: string;
  why5?: string;
  rootCause?: string;
  pca?: string; // Permanent Corrective Action
  responsibility?: string;
  dueDate?: string; // Due date for PCA
  closingDate?: string;
  deltaTimeToClosure?: string | number; // Delta time to closure in days
  status: 'Open' | 'In-Progress' | 'Closed';
  horizontalDeploymentArea?: string;
  horizontalDeploymentStatus?: 'Open' | 'Closed' | 'NA';
  coordinatorName?: string;
  createdAt: string;
}

// Submodule 2: Near Miss Incident Report (Attachment 2)
export interface NearMissReport {
  id: string;
  srNo: number | string;
  incidentDate: string; // dd-mmm-yy
  incidentTime: string; // hrs:mm (e.g. 18:30)
  incidentType: 'F' | 'PD' | 'E' | 'Other'; // F: Fire/Fall, PD: Property Damage, E: Environmental, Other
  deptPlant: string; // Dept./ Plant where incident occurred
  incidentReportedBy: string; // Name of Manager / Submitter
  personInvolvedName?: string; // Name of Person involved in Near-Miss incident, if any & his Dept.
  ticketNo?: string; // Ticket No. of the person involved in the Near-miss
  exactLocation: string; // Exact Location where incident happened
  briefDescription: string; // Brief Description of Incident
  photoEvidence?: string;
  photoBefore?: string;
  photoAfter?: string;

  // Coordinator section (Investigation*, Corrective Action, Horizontal deployment)
  causeOfIncident?: string; // Investigation* Cause of Incident
  correctiveActionRecommended?: string; // Corrective Action Recommended
  actionTargetDate?: string; // Action Target Date (dd-mmm-yy)
  respForAction?: string; // Resp. for Action
  correctiveActionTaken?: string; // Corrective Action Taken
  horizontalDeploymentIdentify?: string; // Horizontal deployment identify
  closingDate?: string;
  status: 'Open' | 'In-Progress' | 'Closed';
  coordinatorName?: string;
  createdAt: string;
}

// Submodule 3: Accident Report (Attachment 3 - KSPG/EHS ACCIDENT REPORT)
export interface AccidentWitness {
  name: string;
  address: string;
  ticketNo: string;
  sign?: string;
}

export interface AccidentIshikawaCauses {
  ppe: string[]; // PPE not available, PPE not specified, Improper use of PPE, PPE not in good condition, Operator not wear handgloves
  environmental: string[]; // Floor/Aisle not in good condition, Inadequate work space, Noise level was high, Poor Illumination, Location was Dusty / Smoky
  machineEquipment: string[]; // Defective Machine / Equipment, Inspection Procedure was not followed, Faulty machine design, Unusable Machine, Sharp edge/oily/odd size material, Chemical
  injuredPerson: string[]; // Failure to follow SOP, Inadequate job experience, Inadequate training, Physically unsuitable, Employee under stress, Improper body posture, Operator Negligence
  management: string[]; // Failure to detect/anticipate/report unsafe act/condition, Failure to correct Unsafe condition, Lack of training to Supervisor, Hazards/SOP not communicated, Lack of supervision
  jobProcedure: string[]; // SOP not prepared, SOP did not cover Unsafe act or condition, Wrong substitute used
  otherNotes?: string;
}

export interface AccidentCorrectiveAction {
  srNo: number;
  correctiveAction: string;
  responsibility: string;
  targetDate: string;
  status?: 'Pending' | 'Completed';
  completedDate?: string;
}

export interface AccidentReport {
  id: string;
  recordNo: string; // e.g. "CR/03"
  division: string; // e.g. "Pierburg"
  accidentDate: string; // e.g. "11-01-2025"
  accidentRepDate: string; // e.g. "01/11/2025"
  department: string; // e.g. "Pierburg (Module line 1)"
  accidentTime: string; // e.g. "08:40 PM"
  leadingActivity: string[]; // Checkboxes: M/c. Operation, Matl. Handling, Maintenance, Office work, Driving, Other
  leadingActivityOther?: string;
  briefDescription: string; // Explain What happened, When & How it happened
  immediateCorrectiveActions: string; // Immediate Corrective Actions Initiated / Taken

  // Injured Person Details
  nameOfInjured: string; // e.g. "PRINCE YADAV"
  ticketNo: string; // e.g. "TS262"
  divDepartment: string; // e.g. "PIERBURG"
  ageGender: string; // e.g. "24/M"
  shift: 'FIRST SHIFT' | 'SECOND SHIFT' | 'THIRD SHIFT' | 'GENERAL SHIFT';
  agency: string; // What caused body injury? e.g. "Cut injury on left hand thumb"
  exactSite: string; // e.g. "PIERBURG - MODULE LINE 1"
  dutyStartTime: string; // e.g. "04:00 PM"
  resAddressInjured?: string;
  witnesses: AccidentWitness[];
  managerName?: string;
  managerExtn?: string;
  plantHeadName?: string;

  // Section TO BE FILLED BY MEDICAL OFFICER (Doctor)
  bodyPartInjured: string; // e.g. "LEFT HAND THUMB"
  natureOfInjury: string; // e.g. "CUT INJURY"
  treatmentGivenOHC: string; // e.g. "CLEANING & DRESSING"
  injuredSentHospital?: string; // Hospital name or "Dispensary OHC only"
  resumedDutyDate?: string; // e.g. "JOINED AFTER OPD, SAME SHIFT"
  mandaysLost: number; // e.g. 0
  medicalOfficerName: string; // e.g. "Dr. ARJUN CHOUDHARY"
  medicalOfficerSign?: string;
  medicalReportDate: string;

  // Section TO BE FILLED BY SAFETY COORDINATOR (Page 02: Investigation & 5-Why)
  investigationDate?: string;
  ishikawaCauses: AccidentIshikawaCauses;
  
  // 5-Why Analysis in Describe the Causes (What went wrong?)
  why1: string;
  why2: string;
  why3: string;
  why4: string;
  why5: string;
  rootCauseDescription: string;

  correctiveActions: AccidentCorrectiveAction[];
  investigators: string[]; // List of names who conducted investigation

  status: 'Reported by Doctor' | 'Under Coordinator Investigation' | 'Actions In-Progress' | 'Closed';
  closingDate?: string;
  coordinatorNotes?: string;
  photoBefore?: string;
  photoAfter?: string;
  createdAt: string;
}

export type UserPersona = 'operator' | 'coordinator' | 'doctor' | 'committee' | 'manager';
