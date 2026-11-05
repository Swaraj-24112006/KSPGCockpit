import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// =========================================================================
// IN-MEMORY SAFETY DATASETS
// =========================================================================

// Submodule 1: Safety Observations (Attachment 1)
let safetyObservations: any[] = [
  {
    id: "so-36",
    srNo: 36,
    date: "12-Oct-26",
    shift: "A",
    raisedBy: "Sagar Fadtare",
    minifactory: "MF3",
    line: "Line 2 - Assembly",
    station: "Drinking water point",
    legend: "Unsafe condition",
    beforeCondition: "While feeding water chances of fallen on air filter unit",
    category: "B",
    ica: "Installed temporary drip tray and rerouted dispenser overflow pipe away from electrical panel",
    targetDate: "14-Oct-26",
    icaStatus: "Closed",
    why1: "Water droplets spilled on floor and splashed towards air filter enclosure",
    why2: "No splash partition installed between high-pressure drinking point and plant equipment",
    why3: "Dispenser was relocated during seasonal shopfloor reorganization without civil clearance",
    why4: "Safety Gemba layout audit checklist did not enforce strict clearance perimeter for water stations",
    why5: "Lack of cross-functional EHS review before shifting shopfloor utility fixtures",
    rootCause: "Absence of mandatory EHS clearance SOP for utility equipment relocation near sensitive machinery",
    pca: "Fabricated permanent 1.8m acrylic splash barrier and standardized 2-meter clearance rule across all plants",
    responsibility: "Manoj Shinde (Plant Facilities)",
    dueDate: "20-Oct-26",
    closingDate: "19-Oct-26",
    deltaTimeToClosure: 7,
    status: "Closed",
    horizontalDeploymentArea: "MF1, MF2, MF3 and Warehouse drinking water stations",
    horizontalDeploymentStatus: "Closed",
    coordinatorName: "Kavita Reddy (EHS Lead)",
    createdAt: "2026-10-12T08:30:00.000Z"
  },
  {
    id: "so-37",
    srNo: 37,
    date: "12-Oct-26",
    shift: "A",
    raisedBy: "Ajay Alam",
    minifactory: "Engineering",
    line: "Validation Lab",
    station: "Testing room",
    legend: "Unsafe condition",
    beforeCondition: "Air fumes spread in shop during test is running",
    category: "A",
    ica: "Restricted test cell operation to night hours; mandatory N95 particulate respirators deployed",
    targetDate: "13-Oct-26",
    icaStatus: "Closed",
    why1: "Exhaust extraction velocity dropped below 12 m/s during full-throttle endurance test",
    why2: "Exhaust scrubber fan drive belt was loose and slipping under high heat load",
    why3: "Negative pressure draft damper in exhaust duct stuck at partial 25% angle",
    why4: "Preventive maintenance check on blower assembly skipped during heavy test run schedule",
    why5: "No automated pressure differential sensor to interlock dyno ignition with exhaust airflow",
    rootCause: "Lack of automated safety interlock tripping test cycle upon exhaust airflow degradation",
    pca: "Installed automated differential pressure transmitter with fail-safe dyno kill switch and new Kevlar belt drive",
    responsibility: "Pravin Kulkarni (Facilities Maintenance)",
    dueDate: "25-Oct-26",
    closingDate: "24-Oct-26",
    deltaTimeToClosure: 12,
    status: "Closed",
    horizontalDeploymentArea: "Testing Bays 1, 2, 3 and Emissions Prototype Cell",
    horizontalDeploymentStatus: "Closed",
    coordinatorName: "Kavita Reddy (EHS Lead)",
    createdAt: "2026-10-12T09:15:00.000Z"
  },
  {
    id: "so-38",
    srNo: 38,
    date: "28-Oct-26",
    shift: "B",
    raisedBy: "Sunil Ghorpade",
    minifactory: "MF1",
    line: "Main Assembly Line 1",
    station: "Station 04 - Pneumatic Press",
    legend: "Unsafe act",
    beforeCondition: "Operator found leaning over conveyor to retrieve dropped washer while indexing table in motion",
    category: "A",
    ica: "Immediate job halt; debriefed shift operator on pinch point dangers; issued magnetic retrieval wand",
    targetDate: "29-Oct-26",
    icaStatus: "Closed",
    why1: "Operator reached over table without hitting E-stop",
    why2: "Washers frequently bounce off parts bin into the indexing carousel gap",
    why3: "Gravity feed tray lip is too shallow (only 5mm)",
    why4: "Part bin redesign was not updated after washer gauge change",
    why5: "Ergonomic risk assessment did not capture small hardware bounce trajectory",
    rootCause: "Deficient part hopper geometry creating frequent dropped hardware near moving pinch-points",
    pca: "Installed 30mm high-lip silicone funnel hoppers and optical light curtain around indexing nest",
    responsibility: "Arjun Mehra (Automation Engineer)",
    dueDate: "05-Nov-26",
    closingDate: "",
    deltaTimeToClosure: "",
    status: "In-Progress",
    horizontalDeploymentArea: "MF1 and MF2 press feeding stations",
    horizontalDeploymentStatus: "Open",
    coordinatorName: "Vikram Sen (Safety Coordinator)",
    createdAt: "2026-10-28T14:20:00.000Z"
  },
  {
    id: "so-39",
    srNo: 39,
    date: "01-Nov-26",
    shift: "C",
    raisedBy: "Dinesh Pawale",
    minifactory: "MF2",
    line: "Line 3 - Packaging",
    station: "Carton Strapping Bay",
    legend: "Unsafe condition",
    beforeCondition: "Hydraulic oil mist settling on anti-slip gangway rubber mat causing slippery footing",
    status: "Open",
    coordinatorName: "",
    createdAt: "2026-11-01T22:10:00.000Z"
  }
];

// Submodule 2: Near Miss Incident Reports (Attachment 2)
let nearMissReports: any[] = [
  {
    id: "nm-1",
    srNo: 1,
    incidentDate: "17-Feb-26",
    incidentTime: "18:30",
    incidentType: "Other",
    deptPlant: "MF1- Between L3& L4",
    incidentReportedBy: "Nagraj",
    personInvolvedName: "Nagraj",
    ticketNo: "TK-9402",
    exactLocation: "Between L3& L4",
    briefDescription: "During changeover, the trolley got stuck in a floor patch, causing the fixture to fall down.",
    causeOfIncident: "1) Due to floor patch\n2) Fixture not locked",
    correctiveActionRecommended: "1) Need to fill patch\n2) Awareness to all team member",
    actionTargetDate: "1) 10/03/2026\n2) 18/02/2026",
    respForAction: "Amol Patil\nRamesh S",
    correctiveActionTaken: "1) Patch filled with industrial epoxy polymer mortar\n2) Fixture dual-lock pin standard deployed with shift training",
    horizontalDeploymentIdentify: "NA",
    closingDate: "3-May-26",
    status: "Closed",
    coordinatorName: "Vikram Sen (Safety Lead)",
    createdAt: "2026-02-17T18:45:00.000Z"
  },
  {
    id: "nm-2",
    srNo: 2,
    incidentDate: "14-Oct-26",
    incidentTime: "11:20",
    incidentType: "PD",
    deptPlant: "MF2 - Stamping Bay",
    incidentReportedBy: "Vijay Deshmukh",
    personInvolvedName: "Deepak Shinde (Press Operator)",
    ticketNo: "TK-5120",
    exactLocation: "Heavy Press Line #3 Die Transfer Bed",
    briefDescription: "Overhead crane hoist chain swung abruptly during die repositioning, missing operator's helmet by 6 inches.",
    causeOfIncident: "1) Crane pendant speed selector button sticking on rapid traverse\n2) Tag line guide rope was not fastened to die block before hoisting",
    correctiveActionRecommended: "1) Overhaul pendant joystick & replace microswitch\n2) Enforce tag line guide rope SOP for all crane lifts > 500kg",
    actionTargetDate: "1) 16/10/2026\n2) 20/10/2026",
    respForAction: "Ketan Patil (Electrical Maint.)\nDeepak Shinde (Area Lead)",
    correctiveActionTaken: "1) Pendant microswitch replaced and dual-speed governor tested\n2) Two magnetic tag lines installed on crane column with SOP board",
    horizontalDeploymentIdentify: "All overhead gantry cranes in Bay 1, 2, and Tool Room",
    closingDate: "22-Oct-26",
    status: "Closed",
    coordinatorName: "Vikram Sen (Safety Lead)",
    createdAt: "2026-10-14T11:40:00.000Z"
  },
  {
    id: "nm-3",
    srNo: 3,
    incidentDate: "29-Oct-26",
    incidentTime: "15:45",
    incidentType: "F",
    deptPlant: "MF3 - Brazing Cell",
    incidentReportedBy: "Rakesh Sharma",
    personInvolvedName: "Anand Verma",
    ticketNo: "TK-8831",
    exactLocation: "Station 02 - Torch Brazing Table",
    briefDescription: "Acetylene flashback arrestor hissed and released micro-flame near hose connector during cylinder changeover.",
    causeOfIncident: "Flashback arrestor O-ring perished; cylinder valve opened with sudden surge pressure.",
    correctiveActionRecommended: "Replace flashback arrestors with certified dry-type thermal check valves; install quick-connect pressure regulators.",
    actionTargetDate: "02/11/2026",
    respForAction: "Manoj Kumar (Safety Tech)",
    correctiveActionTaken: "",
    horizontalDeploymentIdentify: "All 6 gas welding and brazing carts in plant",
    closingDate: "",
    status: "In-Progress",
    coordinatorName: "Kavita Reddy (EHS Lead)",
    createdAt: "2026-10-29T16:00:00.000Z"
  }
];

// Submodule 3: Accident Reports (Attachment 3 - KSPG/EHS ACCIDENT REPORT)
let accidentReports: any[] = [
  {
    id: "acc-1",
    recordNo: "CR/03",
    division: "Pierburg",
    accidentDate: "11-01-2025",
    accidentRepDate: "01/11/2025",
    department: "Pierburg (Module line 1)",
    accidentTime: "08:40 PM",
    leadingActivity: ["M/c. Operation"],
    leadingActivityOther: "",
    briefDescription: "CUT INJURY ON LEFT HAND THUMB",
    immediateCorrectiveActions: "Send to 1st aid in company dispensary",
    nameOfInjured: "PRINCE YADAV",
    ticketNo: "TS262",
    divDepartment: "PIERBURG",
    ageGender: "24/M",
    shift: "SECOND SHIFT",
    agency: "Cut injury on left hand thumb while picking machined pump body from chute",
    exactSite: "PIERBURG - MODULE LINE 1",
    dutyStartTime: "04:00 PM",
    resAddressInjured: "Room 14, Shanti Nagar, Chakan, Pune",
    witnesses: [
      {
        name: "Yogesh Shinde",
        address: "Chakan, Pune",
        ticketNo: "TS219",
        sign: "Y. Shinde"
      }
    ],
    managerName: "Sanjay Dhole",
    managerExtn: "4102",
    plantHeadName: "P. R. Kulkarni",
    bodyPartInjured: "LEFT HAND THUMB",
    natureOfInjury: "CUT INJURY",
    treatmentGivenOHC: "CLEANING WITH BETADINE & STERILE DRESSING",
    injuredSentHospital: "Dispensary OHC only",
    resumedDutyDate: "JOINED AFTER OPD, SAME SHIFT",
    mandaysLost: 0,
    medicalOfficerName: "Dr. ARJUN CHOUDHARY",
    medicalOfficerSign: "Dr. A. Choudhary, MBBS (Reg. 84219)",
    medicalReportDate: "11/01/2025",
    investigationDate: "12-01-2025",
    ishikawaCauses: {
      ppe: ["Operator was not wearing designated cut-resistant level 5 safety gloves."],
      environmental: ["Discharge chute illumination was slightly obscured by overhead duct."],
      machineEquipment: ["Sharp micro-burr (0.8mm) remained on pump housing casting parting line."],
      injuredPerson: ["Operator hurried part pickup to meet shift cycle pace."],
      management: ["Daily glove verification audit was completed only once per week."],
      jobProcedure: ["SOP did not mandate de-burr tactile check before manual bin transfer."]
    },
    why1: "Operator sustained a 1.2cm laceration on left thumb while picking the pump housing.",
    why2: "Operator was handling sharp machined part without wearing designated cut-resistant safety gloves.",
    why3: "Operator removed gloves 10 minutes prior because inner nitrile coating felt sweaty in humid shift.",
    why4: "Plant PPE matrix had not approved breathable HPPE seamless cut-resistant gloves for humid cells.",
    why5: "EHS PPE procurement had standardized on dense rubberized gloves without operator comfort trials.",
    rootCauseDescription: "Inadequate ergonomic glove specification leading to operator non-compliance during high-cycle part unloading.",
    correctiveActions: [
      {
        srNo: 1,
        correctiveAction: "Standardized breathable CoolMax Cut-Level 5 gloves across all Pierburg module lines.",
        responsibility: "Kavita Reddy (EHS Lead)",
        targetDate: "18-01-2025",
        status: "Completed",
        completedDate: "16-01-2025"
      },
      {
        srNo: 2,
        correctiveAction: "Trained 100% line operators on mandatory PPE adherence & chute safety OPL.",
        responsibility: "Sanjay Dhole (Production Mgr)",
        targetDate: "20-01-2025",
        status: "Completed",
        completedDate: "19-01-2025"
      }
    ],
    investigators: [
      "Kavita Reddy (EHS Lead)",
      "Sanjay Dhole (Module Line Mgr)",
      "Yogesh Shinde (Line Safety Rep)"
    ],
    status: "Closed",
    closingDate: "22-01-2025",
    coordinatorNotes: "Investigation concluded. Zero recurrence observed over 90 days. OPL signed off by all shifts.",
    createdAt: "2025-01-11T20:50:00.000Z"
  }
];

// Safety Incidents Overview
let safetyIncidents: any[] = [
  {
    id: "sf-1",
    incidentDate: "2026-07-03",
    type: "Unsafe Condition",
    area: "Hosur Machine Shop",
    description: "Frayed electrical power cable trailing on floor near CNC cutting machine pedal. Potential trip and shock hazard.",
    reportedBy: "Sanjay Patil (Senior Machinist)",
    immediateAction: "Taped cord temporarily, notified maintenance to replace the complete line cord.",
    status: "Closed",
    targetDate: "2026-07-05",
    closedDate: "2026-07-04",
    createdAt: "2026-07-03T10:00:00.000Z"
  },
  {
    id: "sf-2",
    incidentDate: "2026-07-12",
    type: "Unsafe Act",
    area: "Pune Heat Treat Room",
    description: "Operator found loading high-temp furnace without wearing heat-resistant safety sleeves and protective visor.",
    reportedBy: "Vikram Sen (Safety Lead)",
    immediateAction: "Stopped operation instantly, coached worker on PPE mandate, issued correct safety sleeves.",
    status: "Open",
    targetDate: "2026-07-13",
    closedDate: "",
    createdAt: "2026-07-12T16:45:00.000Z"
  }
];

// =========================================================================
// SAFETY API ENDPOINTS
// =========================================================================

// Incidents Overview
app.get("/api/safetyincidents", (req, res) => {
  res.json({ success: true, data: safetyIncidents });
});

app.post("/api/safetyincidents", (req, res) => {
  try {
    const data = req.body;
    const newIncident = {
      id: `sf-${Date.now()}`,
      incidentDate: data.incidentDate || new Date().toISOString().split('T')[0],
      type: data.type || "Near Miss",
      area: data.area || "",
      description: data.description || "",
      reportedBy: data.reportedBy || "",
      immediateAction: data.immediateAction || "",
      status: data.status || "Open",
      targetDate: data.targetDate || "",
      closedDate: data.closedDate || "",
      createdAt: new Date().toISOString()
    };
    safetyIncidents.unshift(newIncident);
    res.json({ success: true, data: newIncident });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/safetyincidents/:id", (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const index = safetyIncidents.findIndex(s => s.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: "Safety Incident not found" });
  }
  safetyIncidents[index] = {
    ...safetyIncidents[index],
    ...updateData,
    id: safetyIncidents[index].id
  };
  res.json({ success: true, data: safetyIncidents[index] });
});

// Submodule 1: Safety Observations
app.get("/api/safety/observations", (req, res) => {
  res.json({ success: true, data: safetyObservations });
});

app.post("/api/safety/observations", (req, res) => {
  try {
    const data = req.body;
    const count = safetyObservations.length + 36;
    const newObs = {
      id: `so-${Date.now()}`,
      srNo: data.srNo || count,
      date: data.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
      shift: data.shift || 'A',
      raisedBy: data.raisedBy || 'Shopfloor Member',
      minifactory: data.minifactory || 'MF1',
      line: data.line || 'Line 1',
      station: data.station || 'Assembly Station',
      legend: data.legend || 'Unsafe condition',
      beforeCondition: data.beforeCondition || '',
      photoBefore: data.photoBefore || '',
      photoAfter: data.photoAfter || '',
      category: data.category || undefined,
      ica: data.ica || '',
      targetDate: data.targetDate || '',
      icaStatus: data.icaStatus || 'Open',
      why1: data.why1 || '',
      why2: data.why2 || '',
      why3: data.why3 || '',
      why4: data.why4 || '',
      why5: data.why5 || '',
      rootCause: data.rootCause || '',
      pca: data.pca || '',
      responsibility: data.responsibility || '',
      dueDate: data.dueDate || '',
      closingDate: data.closingDate || '',
      deltaTimeToClosure: data.deltaTimeToClosure || '',
      status: data.status || 'Open',
      horizontalDeploymentArea: data.horizontalDeploymentArea || '',
      horizontalDeploymentStatus: data.horizontalDeploymentStatus || 'Open',
      coordinatorName: data.coordinatorName || '',
      createdAt: new Date().toISOString()
    };
    safetyObservations.unshift(newObs);

    safetyIncidents.unshift({
      id: newObs.id,
      incidentDate: new Date().toISOString().split('T')[0],
      type: newObs.legend === 'Unsafe act' ? 'Unsafe Act' : 'Unsafe Condition',
      area: `${newObs.minifactory} - ${newObs.station}`,
      description: newObs.beforeCondition,
      reportedBy: newObs.raisedBy,
      immediateAction: newObs.ica || 'Under review by Safety Coordinator',
      status: newObs.status === 'Closed' ? 'Closed' : 'Open',
      targetDate: newObs.targetDate || '',
      closedDate: newObs.closingDate || '',
      createdAt: newObs.createdAt
    });

    res.json({ success: true, data: newObs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/safety/observations/:id", (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const index = safetyObservations.findIndex(o => o.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: "Safety Observation not found" });
  }
  
  let deltaTimeToClosure = updateData.deltaTimeToClosure || safetyObservations[index].deltaTimeToClosure;
  if (updateData.closingDate && !deltaTimeToClosure) {
    try {
      const origDate = new Date(safetyObservations[index].createdAt || Date.now());
      const closeDate = new Date();
      const diffTime = Math.abs(closeDate.getTime() - origDate.getTime());
      deltaTimeToClosure = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      deltaTimeToClosure = 1;
    }
  }

  safetyObservations[index] = {
    ...safetyObservations[index],
    ...updateData,
    deltaTimeToClosure,
    id: safetyObservations[index].id
  };

  const legacyIdx = safetyIncidents.findIndex(s => s.id === id);
  if (legacyIdx !== -1) {
    safetyIncidents[legacyIdx].status = safetyObservations[index].status === 'Closed' ? 'Closed' : 'Open';
    safetyIncidents[legacyIdx].immediateAction = safetyObservations[index].ica || safetyIncidents[legacyIdx].immediateAction;
    safetyIncidents[legacyIdx].closedDate = safetyObservations[index].closingDate || safetyIncidents[legacyIdx].closedDate;
  }

  res.json({ success: true, data: safetyObservations[index] });
});

app.delete("/api/safety/observations/:id", (req, res) => {
  const { id } = req.params;
  const index = safetyObservations.findIndex(o => o.id === id);
  if (index === -1) return res.status(404).json({ success: false, error: "Observation not found" });
  const deleted = safetyObservations.splice(index, 1);
  res.json({ success: true, data: deleted[0] });
});

// Submodule 2: Near Miss Reports
app.get("/api/safety/nearmiss", (req, res) => {
  res.json({ success: true, data: nearMissReports });
});

app.post("/api/safety/nearmiss", (req, res) => {
  try {
    const data = req.body;
    const count = nearMissReports.length + 1;
    const newNm = {
      id: `nm-${Date.now()}`,
      srNo: data.srNo || count,
      incidentDate: data.incidentDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
      incidentTime: data.incidentTime || new Date().toTimeString().substring(0, 5),
      incidentType: data.incidentType || 'Other',
      deptPlant: data.deptPlant || 'MF1',
      incidentReportedBy: data.incidentReportedBy || 'Shopfloor Member',
      personInvolvedName: data.personInvolvedName || '',
      ticketNo: data.ticketNo || '',
      exactLocation: data.exactLocation || '',
      briefDescription: data.briefDescription || '',
      photoEvidence: data.photoEvidence || data.photoBefore || '',
      photoBefore: data.photoBefore || data.photoEvidence || '',
      photoAfter: data.photoAfter || '',
      causeOfIncident: data.causeOfIncident || '',
      correctiveActionRecommended: data.correctiveActionRecommended || '',
      actionTargetDate: data.actionTargetDate || '',
      respForAction: data.respForAction || '',
      correctiveActionTaken: data.correctiveActionTaken || '',
      horizontalDeploymentIdentify: data.horizontalDeploymentIdentify || 'NA',
      closingDate: data.closingDate || '',
      status: data.status || 'Open',
      coordinatorName: data.coordinatorName || '',
      createdAt: new Date().toISOString()
    };
    nearMissReports.unshift(newNm);

    safetyIncidents.unshift({
      id: newNm.id,
      incidentDate: new Date().toISOString().split('T')[0],
      type: 'Near Miss',
      area: `${newNm.deptPlant} - ${newNm.exactLocation}`,
      description: newNm.briefDescription,
      reportedBy: newNm.incidentReportedBy,
      immediateAction: newNm.correctiveActionRecommended || 'Near miss logged; coordinator review underway',
      status: newNm.status === 'Closed' ? 'Closed' : 'Open',
      targetDate: newNm.actionTargetDate || '',
      closedDate: newNm.closingDate || '',
      createdAt: newNm.createdAt
    });

    res.json({ success: true, data: newNm });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/safety/nearmiss/:id", (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const index = nearMissReports.findIndex(n => n.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: "Near Miss not found" });
  }
  nearMissReports[index] = {
    ...nearMissReports[index],
    ...updateData,
    id: nearMissReports[index].id
  };

  const legacyIdx = safetyIncidents.findIndex(s => s.id === id);
  if (legacyIdx !== -1) {
    safetyIncidents[legacyIdx].status = nearMissReports[index].status === 'Closed' ? 'Closed' : 'Open';
    safetyIncidents[legacyIdx].closedDate = nearMissReports[index].closingDate || safetyIncidents[legacyIdx].closedDate;
    safetyIncidents[legacyIdx].immediateAction = nearMissReports[index].correctiveActionTaken || nearMissReports[index].correctiveActionRecommended || safetyIncidents[legacyIdx].immediateAction;
  }

  res.json({ success: true, data: nearMissReports[index] });
});

app.delete("/api/safety/nearmiss/:id", (req, res) => {
  const { id } = req.params;
  const index = nearMissReports.findIndex(n => n.id === id);
  if (index === -1) return res.status(404).json({ success: false, error: "Near Miss not found" });
  const deleted = nearMissReports.splice(index, 1);
  res.json({ success: true, data: deleted[0] });
});

// Submodule 3: Accident Reports (KSPG/EHS)
app.get("/api/safety/accidents", (req, res) => {
  res.json({ success: true, data: accidentReports });
});

app.post("/api/safety/accidents", (req, res) => {
  try {
    const data = req.body;
    const count = accidentReports.length + 3;
    const newAcc = {
      id: `acc-${Date.now()}`,
      recordNo: data.recordNo || `CR/${String(count).padStart(2, '0')}`,
      division: data.division || 'Pierburg',
      accidentDate: data.accidentDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      accidentRepDate: data.accidentRepDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      department: data.department || 'Pierburg (Module line 1)',
      accidentTime: data.accidentTime || new Date().toTimeString().substring(0, 5),
      leadingActivity: data.leadingActivity || ['M/c. Operation'],
      leadingActivityOther: data.leadingActivityOther || '',
      briefDescription: data.briefDescription || '',
      immediateCorrectiveActions: data.immediateCorrectiveActions || 'Send to 1st aid in company dispensary',
      nameOfInjured: data.nameOfInjured || '',
      ticketNo: data.ticketNo || '',
      divDepartment: data.divDepartment || 'PIERBURG',
      ageGender: data.ageGender || '',
      shift: data.shift || 'SECOND SHIFT',
      agency: data.agency || '',
      exactSite: data.exactSite || '',
      dutyStartTime: data.dutyStartTime || '08:00 AM',
      resAddressInjured: data.resAddressInjured || '',
      witnesses: data.witnesses || [],
      managerName: data.managerName || '',
      managerExtn: data.managerExtn || '',
      plantHeadName: data.plantHeadName || '',
      bodyPartInjured: data.bodyPartInjured || '',
      natureOfInjury: data.natureOfInjury || '',
      treatmentGivenOHC: data.treatmentGivenOHC || '',
      injuredSentHospital: data.injuredSentHospital || '',
      resumedDutyDate: data.resumedDutyDate || '',
      mandaysLost: Number(data.mandaysLost) || 0,
      medicalOfficerName: data.medicalOfficerName || 'Dr. ARJUN CHOUDHARY',
      medicalOfficerSign: data.medicalOfficerSign || '',
      medicalReportDate: data.medicalReportDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      investigationDate: data.investigationDate || '',
      ishikawaCauses: data.ishikawaCauses || {
        ppe: [],
        environmental: [],
        machineEquipment: [],
        injuredPerson: [],
        management: [],
        jobProcedure: []
      },
      why1: data.why1 || '',
      why2: data.why2 || '',
      why3: data.why3 || '',
      why4: data.why4 || '',
      why5: data.why5 || '',
      rootCauseDescription: data.rootCauseDescription || '',
      correctiveActions: data.correctiveActions || [],
      investigators: data.investigators || [],
      status: data.status || 'Reported by Doctor',
      closingDate: data.closingDate || '',
      coordinatorNotes: data.coordinatorNotes || '',
      photoBefore: data.photoBefore || '',
      photoAfter: data.photoAfter || '',
      createdAt: new Date().toISOString()
    };
    accidentReports.unshift(newAcc);

    safetyIncidents.unshift({
      id: newAcc.id,
      incidentDate: new Date().toISOString().split('T')[0],
      type: 'Minor Injury',
      area: `${newAcc.division} - ${newAcc.exactSite || newAcc.department}`,
      description: `[Accident ${newAcc.recordNo}] ${newAcc.nameOfInjured}: ${newAcc.briefDescription}`,
      reportedBy: `${newAcc.medicalOfficerName} (Medical Officer)`,
      immediateAction: newAcc.treatmentGivenOHC || newAcc.immediateCorrectiveActions,
      status: newAcc.status === 'Closed' ? 'Closed' : 'Open',
      targetDate: '',
      closedDate: newAcc.closingDate || '',
      createdAt: newAcc.createdAt
    });

    res.json({ success: true, data: newAcc });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/safety/accidents/:id", (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const index = accidentReports.findIndex(a => a.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: "Accident Report not found" });
  }
  accidentReports[index] = {
    ...accidentReports[index],
    ...updateData,
    id: accidentReports[index].id
  };

  const legacyIdx = safetyIncidents.findIndex(s => s.id === id);
  if (legacyIdx !== -1) {
    safetyIncidents[legacyIdx].status = accidentReports[index].status === 'Closed' ? 'Closed' : 'Open';
    safetyIncidents[legacyIdx].closedDate = accidentReports[index].closingDate || safetyIncidents[legacyIdx].closedDate;
  }

  res.json({ success: true, data: accidentReports[index] });
});

app.delete("/api/safety/accidents/:id", (req, res) => {
  const { id } = req.params;
  const index = accidentReports.findIndex(a => a.id === id);
  if (index === -1) return res.status(404).json({ success: false, error: "Accident Report not found" });
  const deleted = accidentReports.splice(index, 1);
  res.json({ success: true, data: deleted[0] });
});

// Setup Vite Dev Server / Production routing
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Safety Desk Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
