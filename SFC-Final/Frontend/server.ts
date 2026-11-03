import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Standard interface for server-side state
import { Kaizen } from "./src/types";

// Lazy-loaded Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please add it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Inline SVGs for beautiful, high-quality industrial before/after visual mockups
const svgBeforeAirLeak = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fef2f2"/><g stroke="%23dc2626" stroke-width="2" fill="none"><path d="M100,150 L300,150 M150,150 C150,110 180,90 200,90 C220,90 250,110 250,150" stroke-width="4"/><circle cx="200" cy="90" r="12" fill="%23fca5a5"/><path d="M190,70 Q160,50 140,65 M210,70 Q240,50 260,65 M200,65 L200,35" stroke-dasharray="4,4" stroke-width="3"/></g><text x="200" y="210" font-family="sans-serif" font-weight="bold" font-size="14" fill="%23b91c1c" text-anchor="middle">AIR LEAKING AT CYLINDER JOINT</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%23dc2626"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">BEFORE</text></svg>`;

const svgAfterAirLeak = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><g stroke="%2316a34a" stroke-width="2" fill="none"><path d="M100,150 L300,150 M150,150 C150,110 180,90 200,90 C220,90 250,110 250,150" stroke-width="4"/><circle cx="200" cy="90" r="12" fill="%2386efac" stroke="%2316a34a" stroke-width="3"/><path d="M195,90 L198,93 L205,86" stroke-width="3"/></g><text x="200" y="210" font-family="sans-serif" font-weight="bold" font-size="14" fill="%2315803d" text-anchor="middle">FITTED SECURE FLANGE %26 O-RING</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%2316a34a"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">AFTER</text></svg>`;

const svgBeforeToolRack = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fffbeb"/><rect x="120" y="60" width="160" height="100" rx="4" fill="%23d97706" opacity="0.1" stroke="%23d97706" stroke-width="2"/><circle cx="160" cy="110" r="8" fill="%23ef4444"/><circle cx="200" cy="110" r="8" fill="%233b82f6"/><circle cx="240" cy="110" r="8" fill="%2310b981"/><path d="M130,200 L270,200" stroke="%23d97706" stroke-width="4"/><text x="200" y="220" font-family="sans-serif" font-weight="bold" font-size="14" fill="%2392400e" text-anchor="middle">TOOLS PILED RANDOMLY ON TABLE</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%23d97706"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">BEFORE</text></svg>`;

const svgAfterToolRack = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><rect x="120" y="50" width="160" height="120" rx="8" fill="%23111827" stroke="%23374151" stroke-width="3"/><path d="M150,70 L150,110 M200,70 L200,120 M250,70 L250,105" stroke="%23f59e0b" stroke-width="6" stroke-linecap="round"/><circle cx="150" cy="140" r="10" fill="%23f0fdf4" stroke="%2310b981" stroke-width="2"/><path d="M147,140 L149,142 L153,138" stroke="%2310b981" stroke-width="2" fill="none"/><circle cx="200" cy="140" r="10" fill="%23f0fdf4" stroke="%2310b981" stroke-width="2"/><path d="M197,140 L199,142 L203,138" stroke="%2310b981" stroke-width="2" fill="none"/><circle cx="250" cy="140" r="10" fill="%23f0fdf4" stroke="%2310b981" stroke-width="2"/><path d="M247,140 L249,142 L253,138" stroke="%2310b981" stroke-width="2" fill="none"/><text x="200" y="215" font-family="sans-serif" font-weight="bold" font-size="14" fill="%2315803d" text-anchor="middle">ORGANIZED JIG SHADOW BOARD</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%2316a34a"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">AFTER</text></svg>`;

const svgBeforeShield = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fef2f2"/><g stroke="%23b91c1c" stroke-width="2" fill="none"><rect x="130" y="80" width="140" height="80" rx="4" fill="%23f87171" opacity="0.3"/><circle cx="200" cy="120" r="25" stroke-dasharray="5,5" stroke-width="3"/><path d="M180,105 L230,135 M220,105 L170,135" stroke-width="4"/><path d="M200,120 L270,70 M210,130 L290,140" stroke-width="2" stroke-dasharray="2,3" stroke="%23ef4444"/><text x="310" y="65" font-family="sans-serif" font-size="10" fill="%23ef4444">SPARKS FLY OUT</text></g><text x="200" y="210" font-family="sans-serif" font-weight="bold" font-size="14" fill="%23b91c1c" text-anchor="middle">EXPOSED ROTATING GRINDING WHEEL</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%23dc2626"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">BEFORE</text></svg>`;

const svgAfterShield = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><g stroke="%2315803d" stroke-width="2" fill="none"><rect x="130" y="80" width="140" height="80" rx="4" fill="%2386efac" opacity="0.2"/><circle cx="200" cy="120" r="25" stroke-width="3"/><path d="M180,105 L230,135 M220,105 L170,135" stroke-width="3"/><rect x="110" y="50" width="180" height="110" rx="8" stroke="%233b82f6" stroke-width="3" fill="%2393c5fd" fill-opacity="0.2"/></g><text x="200" y="210" font-family="sans-serif" font-weight="bold" font-size="14" fill="%2315803d" text-anchor="middle">CLEAR HINGED SAFETY SHIELD INSTALLED</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%2316a34a"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">AFTER</text></svg>`;

const svgBeforeGeneric = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f3f4f6"/><rect x="50" y="50" width="300" height="150" rx="8" fill="none" stroke="%239ca3af" stroke-width="2" stroke-dasharray="6,6"/><circle cx="200" cy="120" r="30" fill="%23d1d5db"/><path d="M185,120 L215,120 M200,105 L200,135" stroke="%239ca3af" stroke-width="4"/><text x="200" y="170" font-family="sans-serif" font-size="12" fill="%236b7280" text-anchor="middle">NO PHOTO CAPTURED (BEFORE)</text></svg>`;

const svgAfterGeneric = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f3f4f6"/><rect x="50" y="50" width="300" height="150" rx="8" fill="none" stroke="%239ca3af" stroke-width="2" stroke-dasharray="6,6"/><circle cx="200" cy="120" r="30" fill="%23d1d5db"/><path d="M185,120 L215,120 M200,105 L200,135" stroke="%239ca3af" stroke-width="4"/><text x="200" y="170" font-family="sans-serif" font-size="12" fill="%236b7280" text-anchor="middle">NO PHOTO CAPTURED (AFTER)</text></svg>`;

const svg5sShadowBoard = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%230f172a"/><rect x="30" y="30" width="340" height="190" rx="8" fill="%231e293b" stroke="%233b82f6" stroke-width="2"/><g fill="%230284c7" stroke="%2338bdf8" stroke-width="1.5"><rect x="60" y="60" width="25" height="120" rx="3"/><circle cx="72.5" cy="75" r="5" fill="%230f172a"/><rect x="110" y="70" width="20" height="100" rx="3"/><circle cx="120" cy="80" r="4" fill="%230f172a"/><path d="M160,80 L180,80 L170,160 Z"/><rect x="210" y="65" width="40" height="80" rx="4"/><rect x="280" y="60" width="60" height="120" rx="6" fill="%230369a1"/></g><rect x="15" y="15" width="110" height="25" rx="5" fill="%230284c7"/><text x="70" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">2S SHADOW BOARD</text><text x="200" y="212" font-family="sans-serif" font-weight="bold" font-size="12" fill="%2338bdf8" text-anchor="middle">A PLACE FOR EVERYTHING &amp; IN ITS PLACE</text></svg>`;

const svg5sRedTagItem = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fef2f2"/><rect x="40" y="30" width="320" height="190" rx="8" fill="%23fee2e2" stroke="%23ef4444" stroke-width="3" stroke-dasharray="8,6"/><polygon points="200,50 290,50 310,130 200,130" fill="%23dc2626"/><circle cx="215" cy="65" r="5" fill="white"/><text x="250" y="85" font-family="sans-serif" font-weight="900" font-size="14" fill="white" text-anchor="middle">5S RED TAG</text><text x="250" y="105" font-family="sans-serif" font-weight="bold" font-size="10" fill="%23fecaca" text-anchor="middle">SEIRI HOLDING</text><text x="200" y="180" font-family="sans-serif" font-weight="bold" font-size="13" fill="%23991b1b" text-anchor="middle">OBSOLETE DIESEL FIXTURE RT-2026-003</text><text x="200" y="202" font-family="sans-serif" font-size="11" fill="%23b91c1c" text-anchor="middle">Location: Bay 4 Holding Area | Days Aged: 18d</text></svg>`;

const svg5sFloorDemarcation = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23334155"/><rect x="50" y="50" width="130" height="150" fill="%23475569" stroke="%23eab308" stroke-width="6"/><text x="115" y="130" font-family="sans-serif" font-weight="bold" font-size="12" fill="%23fef08a" text-anchor="middle">WIP PALLET #1</text><rect x="220" y="50" width="130" height="150" fill="%23475569" stroke="%2322c55e" stroke-width="6"/><text x="285" y="130" font-family="sans-serif" font-weight="bold" font-size="12" fill="%23bbf7d0" text-anchor="middle">FINISHED GOODS</text><line x1="20" y1="220" x2="380" y2="220" stroke="%23eab308" stroke-width="8" stroke-dasharray="15,10"/><text x="200" y="240" font-family="sans-serif" font-weight="bold" font-size="10" fill="%23fef08a" text-anchor="middle">PEDESTRIAN WALKWAY GANGWAY</text></svg>`;

const svg5sCleanInspect = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23ecfdf5"/><circle cx="140" cy="120" r="50" fill="%23d1fae5" stroke="%2310b981" stroke-width="4"/><path d="M140,120 L170,90" stroke="%23047857" stroke-width="4"/><path d="M140,80 A40,40 0 0,1 180,120" stroke="%2322c55e" stroke-width="10" fill="none"/><circle cx="280" cy="100" r="22" fill="%2394a3b8"/><line x1="260" y1="90" x2="300" y2="110" stroke="%23ef4444" stroke-width="5"/><circle cx="280" cy="160" r="22" fill="%2394a3b8"/><line x1="260" y1="150" x2="300" y2="170" stroke="%23ef4444" stroke-width="5"/><text x="200" y="210" font-family="sans-serif" font-weight="bold" font-size="12" fill="%23065f46" text-anchor="middle">SEIKETSU: BOLT MATCH MARKING &amp; GAUGE GREEN ZONE</text></svg>`;

// In-memory data store seeded with highly authentic, polished items from an Indian manufacturing perspective
let kaizens: Kaizen[] = [
  {
    id: "kz-1",
    srNo: "KZ-2026-001",
    month: "June",
    suggestionDate: "2026-06-15",
    title: "Air Leak Reduction at Vacuum Pump Test Bench",
    problemBefore: "Excessive audible air leak detected near the pneumatic cylinder manifold of the Vacuum Pump final leak testing press. The compressor is cycling continuously, wasting electrical energy and creating high decibel background noise (82 dB) in Pune Plant.",
    counterMeasureAfter: "Identified degraded polyurethane connector fittings. Swapped with quick-release brass pneumatic couplers and added a custom high-temp nitrile O-ring seal to the Vacuum Pump test jig. Tightened thread assemblies to achieve zero-leak closure.",
    area: "Vacuum Pump Line A (Pune)",
    minifactory: "MF1",
    location: "Bay 2 West - Pune",
    machine: "Pneumatic Test Jig #3",
    closingTargetDate: "2026-06-20",
    implementedDate: "2026-06-18",
    costSave: 150000, // INR 1.5 Lakhs
    benefits: { p: true, q: false, c: true, d: false, s: false, m: true },
    ideaBy: "Rahul Sharma (ITI Operator)",
    implementedBy: "Rahul Sharma & Maintenance Team",
    preparedBy: "Rahul Sharma",
    approvedBy: "Rajesh Patil (Supervisor)",
    verifiedBy: "Amit Mehta (Kaizen Lead)",
    status: "Approved",
    classification: "Kaizen",
    remark: "Outstanding energy reduction project on Vacuum Pump line. Annualized electrical savings verified by utility meter check.",
    photoBefore: svgBeforeAirLeak,
    photoAfter: svgAfterAirLeak,
    result: "Compressor cycle rate reduced by 35%. Decibel levels dropped to a safe 64 dB. Clean workspace restored.",
    impactAssessment: {
      decidedInReview: true,
      reviewedDate: "2026-06-20",
      reviewedBy: "Amit Mehta (Kaizen Lead)",
      fiveMChange: {
        required: true,
        description: "Method & Machine change for pneumatic fitting standard",
        assignedTo: "Rahul Sharma (ITI Operator)",
        status: "Completed",
        completedBy: "Rahul Sharma",
        completedDate: "2026-06-22",
        notes: "Updated SOP for pneumatic coupler replacement and O-ring inspection."
      },
      safetyImpact: {
        required: true,
        description: "Noise level reduction and pressure rating check",
        assignedTo: "Sanjay Patil (Safety Specialist)",
        status: "Completed",
        completedBy: "Sanjay Patil",
        completedDate: "2026-06-21",
        notes: "Decibel check logged at 64dB. Zero pressure leak risk."
      },
      pfdUpdate: {
        required: true,
        description: "Process Flow Diagram step 4 inspection update",
        assignedTo: "Arjun Mehra (Process Lead)",
        status: "Completed",
        completedBy: "Arjun Mehra",
        completedDate: "2026-06-23",
        notes: "PFD Rev 3.2 published with brass coupler inspection checkpoint."
      },
      pfmeaUpdate: {
        required: true,
        description: "PFMEA air leak failure mode RPN reduction",
        assignedTo: "Sunita Rao (Quality Lead)",
        status: "Completed",
        completedBy: "Sunita Rao",
        completedDate: "2026-06-24",
        notes: "RPN reduced from 120 to 24 in PFMEA Document #PFMEA-VP-09."
      },
      allocatedResources: [
        { id: "res-1", name: "Sunita Rao", role: "Quality Lead", taskAssigned: "PFMEA RPN Calculation & Document Revision" },
        { id: "res-2", name: "Sanjay Patil", role: "Safety Specialist", taskAssigned: "Noise & Pneumatic Safety Audit" }
      ],
      overallClosureStatus: "Fully Closed",
      closedBy: "Rahul Sharma (ITI Operator)",
      closureDate: "2026-06-24",
      closureRemarks: "All 5M, Safety, PFD and PFMEA impacts fully audited and updated in plant QMS."
    },
    createdAt: "2026-06-15T08:30:00.000Z"
  },
  {
    id: "kz-2",
    srNo: "KZ-2026-002",
    month: "June",
    suggestionDate: "2026-06-19",
    title: "Organized 5S Shadow Board for EGR Valve Tooling",
    problemBefore: "Screwdrivers, torque wrenches, and calibrated bits used for adjusting All types of EGR valves are stored loosely in an unsorted metallic toolbox. Operators frequently waste 15-20 seconds searching for specific bits during each product changeover cycle, adding motion waste.",
    counterMeasureAfter: "Designed and mounted a color-coded vertical tool shadow board directly onto the workspace partition wall of EGR Valve Assembly Jig #1 in Chennai Plant. Added physical profiles for each EGR calibrating tool to make missing items instantly visible.",
    area: "EGR Assembly Line - Chennai",
    minifactory: "MF2",
    location: "Cell E1 East - Chennai",
    machine: "EGR Valve Assembly Station",
    closingTargetDate: "2026-06-25",
    implementedDate: "2026-06-22",
    costSave: 85000, // INR 85,000
    benefits: { p: true, q: true, c: false, d: true, s: false, m: true },
    ideaBy: "Sunita Rao (Technician)",
    implementedBy: "Sunita Rao (Technician)",
    preparedBy: "Sunita Rao",
    approvedBy: "Vijay Deshmukh (Area Leader)",
    verifiedBy: "Amit Mehta (Kaizen Lead)",
    status: "Approved",
    classification: "Good Point",
    remark: "An excellent 5S organization improvement on the EGR valve line. Highly recommended as a Standard Operating practice for neighboring tables.",
    photoBefore: svgBeforeToolRack,
    photoAfter: svgAfterToolRack,
    result: "Changeover motion waste eliminated. Average search time reduced from 18s to 0s. Cleanliness level significantly upgraded.",
    createdAt: "2026-06-19T10:15:00.000Z"
  },
  {
    id: "kz-3",
    srNo: "KZ-2026-003",
    month: "June",
    suggestionDate: "2026-06-26",
    title: "Interlocked Safety Shield on Pump Housing Grinder",
    problemBefore: "Rotating grinding wheel used for finishing pump housing castings sprays metal shavings, sparks, and fine debris directly outwards. Sparks occasionally bounce past safety glasses onto operators' skin, creating burn hazards in Hosur Machine Shop.",
    counterMeasureAfter: "Fabricated and attached a custom 6mm impact-resistant polycarbonate safety shield. Integrated a pivot hinge and a safety micro-switch that halts grinder motor power if the shield is raised.",
    area: "Hosur Machining Shop",
    minifactory: "Machining",
    location: "Hosur Machining Section C",
    machine: "Rotary Grinder Machine #2",
    closingTargetDate: "2026-07-02",
    implementedDate: "2026-06-29",
    costSave: 0,
    benefits: { p: false, q: false, c: false, d: false, s: true, m: true },
    ideaBy: "Sanjay Patil (Senior Machinist)",
    implementedBy: "Hosur Plant Maintenance Team",
    preparedBy: "Sanjay Patil",
    approvedBy: "Rajesh Patil (Supervisor)",
    verifiedBy: "Vikram Sen (Safety Lead)",
    status: "Approved",
    classification: "Kaizen",
    remark: "Safety impact is phenomenal. Zero sparks can escape the machining grinder enclosure now.",
    photoBefore: svgBeforeShield,
    photoAfter: svgAfterShield,
    result: "Sparks completely contained. Integrated interlock prevents operation without the shield in the active protecting position.",
    createdAt: "2026-06-26T14:40:00.000Z"
  },
  {
    id: "kz-4",
    srNo: "KZ-2026-004",
    month: "July",
    suggestionDate: "2026-07-05",
    title: "PTFE Self-Centering Guide Rails for BPV Conveyor",
    problemBefore: "BPV (Bypass Valve) components moving on conveyor belt frequently rotate 5-10 degrees, causing the vision camera scanner to fail to read the alignment marker, triggering false defects and line halts (4-5 stops per shift).",
    counterMeasureAfter: "Designed and 3D printed a low-friction PTFE funnel guide rail attachment. Placed guide rails immediately preceding the BPV vision inspection station, aligning components automatically to exactly 0 degrees.",
    area: "Final Quality BPV - Pune",
    minifactory: "MF3",
    location: "BPV Conveyor Line 2 - Pune",
    machine: "Keyence Smart Camera Cell",
    closingTargetDate: "2026-07-10",
    implementedDate: "2026-07-08",
    costSave: 280000, // INR 2.8 Lakhs
    benefits: { p: true, q: true, c: true, d: true, s: false, m: false },
    ideaBy: "Arjun Mehra (Automation Engineer)",
    implementedBy: "Arjun Mehra & Maintenance Team",
    preparedBy: "Arjun Mehra",
    approvedBy: "Vijay Deshmukh (Area Leader)",
    verifiedBy: "Amit Mehta (Kaizen Lead)",
    status: "Approved",
    classification: "Kaizen",
    remark: "Smart, low-cost engineering improvement on BPV conveyor. Drastically increased line efficiency.",
    photoBefore: svgBeforeGeneric,
    photoAfter: svgAfterGeneric,
    result: "False rejects dropped to 0%. Line downtime reduced by 22 minutes per day.",
    createdAt: "2026-07-05T09:00:00.000Z"
  },
  {
    id: "kz-5",
    srNo: "KZ-2026-005",
    month: "July",
    suggestionDate: "2026-07-11",
    title: "Conduit Routing & Cable Protection for Oil Pump Line",
    problemBefore: "Oil Pump barcode scanners, sensor leads, and custom packaging conveyor electrical cables were hanging loose beneath the main packing station table, creating trip hazards for workers and tension strain on ports.",
    counterMeasureAfter: "Gathered loose power cables into high-durability plastic corrugated conduits. Attached them to the underside of table with heavy-duty adhesive cable tie mounts and Velcro strips.",
    area: "Maintenance & Utilities",
    minifactory: "Maintenance",
    location: "Table 4 South - Bengaluru",
    machine: "Oil Pump Pack Station 04",
    closingTargetDate: "2026-07-16",
    implementedDate: "2026-07-13",
    costSave: 60000,
    benefits: { p: false, q: false, c: false, d: false, s: true, m: true },
    ideaBy: "Vijay Deshmukh (Maintenance Tech)",
    implementedBy: "Vijay Deshmukh",
    preparedBy: "Vijay Deshmukh",
    approvedBy: "Amit Mehta (Kaizen Lead)",
    verifiedBy: "Amit Mehta (Kaizen Lead)",
    status: "Approved",
    classification: "Kaizen",
    remark: "Clean cable management eliminated electrical trips and socket strain.",
    photoBefore: svgBeforeGeneric,
    photoAfter: svgAfterGeneric,
    result: "All loose wires gathered neatly. Zero clutter under workstation.",
    createdAt: "2026-07-11T11:20:00.000Z"
  },
  {
    id: "kz-6",
    srNo: "KZ-2026-006",
    month: "July",
    suggestionDate: "2026-07-12",
    title: "Semi-Circular Strike Zone Layout for EGR Fastener Bins",
    problemBefore: "Fastener trays containing small washers and M5/M6 screws for EGR assembly were arranged linearly. Operators stretch arms up to 75cm repeatedly, causing fatigue and slowing EGR pick cycle times.",
    counterMeasureAfter: "Re-arranged EGR bin positions into a semi-circular, tiered ergonomic arc (strike-zone) based on pick frequency. Heavy fasteners placed at front center; rare fasteners placed at outer sides.",
    area: "EGR Assembly Line B - Pune",
    minifactory: "MF2",
    location: "Cell 3 West - Pune",
    machine: "EGR Sub-assembly jig B3",
    closingTargetDate: "2026-07-18",
    implementedDate: "2026-07-13",
    costSave: 45000, // INR 45,000
    benefits: { p: true, q: false, c: false, d: false, s: true, m: true },
    ideaBy: "Deepak Verma (Operator)",
    implementedBy: "Deepak Verma",
    preparedBy: "Deepak Verma",
    approvedBy: "Rajesh Patil (Supervisor)",
    verifiedBy: "Amit Mehta (Kaizen Lead)",
    status: "Approved",
    classification: "Kaizen",
    remark: "Great ergonomic improvement for MF2 operators.",
    photoBefore: svgBeforeGeneric,
    photoAfter: svgAfterGeneric,
    result: "Ergonomic strain resolved. Saved 3 seconds per EGR sub-assembly.",
    createdAt: "2026-07-12T15:05:00.000Z"
  },
  {
    id: "kz-7",
    srNo: "KZ-2026-007",
    month: "July",
    suggestionDate: "2026-07-14",
    title: "Optical Poka-Yoke Sensor for EGR Flange Gasket Insertion",
    problemBefore: "Gaskets were occasionally skipped during high-speed EGR valve assembly, causing customer air-leak defect complaints.",
    counterMeasureAfter: "Installed a infrared reflective proximity sensor above gasket tray linked to assembly press PLC lock.",
    area: "EGR Assembly Cell 2",
    minifactory: "MF2",
    location: "EGR Line - Cell 2",
    machine: "EGR Press ST-02",
    closingTargetDate: "2026-07-20",
    implementedDate: "2026-07-16",
    costSave: 320000,
    benefits: { p: true, q: true, c: true, d: false, s: false, m: false },
    ideaBy: "Sanjay Patil (Process Engineer)",
    implementedBy: "Sanjay Patil & Quality Team",
    preparedBy: "Sanjay Patil",
    approvedBy: "Sunita Rao (Quality Lead)",
    verifiedBy: "Amit Mehta (Kaizen Lead)",
    status: "Approved",
    classification: "Kaizen",
    remark: "Zero defect poka-yoke deployment for MF2 EGR line.",
    photoBefore: svgBeforeGeneric,
    photoAfter: svgAfterGeneric,
    result: "100% gasket presence verification prior to press operation.",
    createdAt: "2026-07-14T09:30:00.000Z"
  },
  {
    id: "kz-8",
    srNo: "KZ-2026-008",
    month: "July",
    suggestionDate: "2026-07-15",
    title: "Digital Bluetooth Caliper Auto-Sync in Metrology Lab",
    problemBefore: "Quality inspectors manually typed dimension values from digital vernier calipers into Excel, introducing human transcription errors.",
    counterMeasureAfter: "Integrated Bluetooth digital calipers with instant USB HID receiver to directly push dimension values into QMS database.",
    area: "Quality Assurance Metrology",
    minifactory: "Quality",
    location: "CMM Room - Main Plant",
    machine: "Mitutoyo Quality Bench",
    closingTargetDate: "2026-07-22",
    implementedDate: "2026-07-18",
    costSave: 110000,
    benefits: { p: true, q: true, c: true, d: true, s: false, m: false },
    ideaBy: "Sunita Rao (Quality Specialist)",
    implementedBy: "Sunita Rao",
    preparedBy: "Sunita Rao",
    approvedBy: "Amit Mehta (Kaizen Lead)",
    verifiedBy: "Amit Mehta (Kaizen Lead)",
    status: "Approved",
    classification: "Kaizen",
    remark: "Excellent quality digitization project.",
    photoBefore: svgBeforeGeneric,
    photoAfter: svgAfterGeneric,
    result: "Inspection data log time reduced by 60%. Zero typing errors.",
    createdAt: "2026-07-15T14:10:00.000Z"
  },
  {
    id: "kz-9",
    srNo: "KZ-2026-009",
    month: "July",
    suggestionDate: "2026-07-18",
    title: "Coolant Recirculation Oil Skimmer on CNC Machining Center",
    problemBefore: "Trampoil accumulation on top of CNC coolant tanks caused anaerobic bacterial growth, bad odor, and shortened coolant life.",
    counterMeasureAfter: "Mounted a disk-type oil skimmer with automatic timer on CNC coolant tank to continuously remove surface trampoil.",
    area: "Machining & Milling Shop",
    minifactory: "Machining",
    location: "Bay 4 Machining Section",
    machine: "CNC Milling Center ST-08",
    closingTargetDate: "2026-07-24",
    implementedDate: "2026-07-21",
    costSave: 175000,
    benefits: { p: true, q: true, c: true, d: false, s: true, m: true },
    ideaBy: "Sanjay Patil (Machining Lead)",
    implementedBy: "Sanjay Patil",
    preparedBy: "Sanjay Patil",
    approvedBy: "Rajesh Patil (Supervisor)",
    verifiedBy: "Amit Mehta (Kaizen Lead)",
    status: "Approved",
    classification: "Kaizen",
    remark: "Doubled coolant usable lifespan in Machining Shop.",
    photoBefore: svgBeforeGeneric,
    photoAfter: svgAfterGeneric,
    result: "Coolant change interval extended from 30 days to 90 days.",
    createdAt: "2026-07-18T16:00:00.000Z"
  },
  {
    id: "kz-10",
    srNo: "KZ-2026-010",
    month: "July",
    suggestionDate: "2026-07-20",
    title: "Gravity Roller Chute for Vacuum Pump Sub-Assemblies",
    problemBefore: "Operators carried heavy cast pump housings by hand 8 meters between cleaning station and assembly press.",
    counterMeasureAfter: "Fabricated an unpowered inclined gravity roller chute connecting cleaning tank directly to assembly press.",
    area: "Vacuum Pump Line 1",
    minifactory: "MF1",
    location: "Cell 1 North - Pune",
    machine: "Vacuum Pump Line 1",
    closingTargetDate: "2026-07-26",
    implementedDate: "2026-07-23",
    costSave: 195000,
    benefits: { p: true, q: false, c: true, d: true, s: true, m: true },
    ideaBy: "Rahul Sharma (ITI Operator)",
    implementedBy: "Rahul Sharma & Maintenance",
    preparedBy: "Rahul Sharma",
    approvedBy: "Rajesh Patil (Supervisor)",
    verifiedBy: "Amit Mehta (Kaizen Lead)",
    status: "Approved",
    classification: "Kaizen",
    remark: "Material handling fatigue eliminated on MF1 line.",
    photoBefore: svgBeforeGeneric,
    photoAfter: svgAfterGeneric,
    result: "Manual transfer effort eliminated. Smooth inline flow achieved.",
    createdAt: "2026-07-20T10:00:00.000Z"
  },
  {
    id: "kz-11",
    srNo: "KZ-2026-011",
    month: "July",
    suggestionDate: "2026-07-22",
    title: "Laser Proximity Sensor Alignment for EGR Flange Positioning",
    problemBefore: "Manual alignment of EGR valve flanges before torqueing relies on visual estimation by operators, leading to 3-4 rework instances per shift.",
    counterMeasureAfter: "Proposed installing a dual laser beam crosshair guide to project exact mounting coordinates onto the EGR flange.",
    area: "EGR Line 2 - Pune",
    minifactory: "MF2",
    location: "Cell 2 West - Pune",
    machine: "Flange Torqueing Station #2",
    closingTargetDate: "2026-08-15",
    implementedDate: "",
    costSave: 120000,
    benefits: { p: true, q: true, c: true, d: false, s: false, m: false },
    ideaBy: "Suresh Kumar (Operator)",
    implementedBy: "Pending Committee Review",
    preparedBy: "Suresh Kumar",
    approvedBy: "",
    verifiedBy: "",
    status: "Pending",
    classification: "Pending",
    remark: "Awaiting Committee Review and evaluation.",
    photoBefore: svgBeforeGeneric,
    photoAfter: svgAfterGeneric,
    result: "Awaiting implementation approval.",
    createdAt: "2026-07-22T08:00:00.000Z"
  },
  {
    id: "kz-12",
    srNo: "KZ-2026-012",
    month: "August",
    suggestionDate: "2026-08-02",
    title: "Vibration Isolator Rubber Pads under Vacuum Pump Tester",
    problemBefore: "High frequency vibration from neighboring CNC milling shop transfers through shop floor concrete to Vacuum Pump micro-leak detector.",
    counterMeasureAfter: "Install 25mm thick neoprene anti-vibration damping pads under all 4 legs of the Vacuum Pump testing enclosure.",
    area: "Vacuum Pump Line 1 - Pune",
    minifactory: "MF1",
    location: "Bay 1 East - Pune",
    machine: "Leak Detector Station #1",
    closingTargetDate: "2026-08-20",
    implementedDate: "",
    costSave: 80000,
    benefits: { p: false, q: true, c: true, d: false, s: false, m: true },
    ideaBy: "Rahul Sharma (ITI Operator)",
    implementedBy: "Pending Committee Review",
    preparedBy: "Rahul Sharma",
    approvedBy: "",
    verifiedBy: "",
    status: "Pending",
    classification: "Pending",
    remark: "Submitted for August evaluation session.",
    photoBefore: svgBeforeGeneric,
    photoAfter: svgAfterGeneric,
    result: "Pending trial run.",
    createdAt: "2026-08-02T11:30:00.000Z"
  },
  {
    id: "kz-13",
    srNo: "KZ-2026-013",
    month: "August",
    suggestionDate: "2026-08-05",
    title: "Color-Coded Fixture Jigs for Machining Line Tooling",
    problemBefore: "Different CNC fixture clamps look identical, causing new operators to mix up clamp settings during product variant changeovers.",
    counterMeasureAfter: "Apply high-durability epoxy color bands (Red for Variant A, Blue for Variant B) with matching clamp guide slots.",
    area: "Hosur Machining Shop",
    minifactory: "Machining",
    location: "Section B - Hosur",
    machine: "CNC Lathe Machine #4",
    closingTargetDate: "2026-08-25",
    implementedDate: "",
    costSave: 95000,
    benefits: { p: true, q: true, c: false, d: true, s: false, m: false },
    ideaBy: "Sanjay Patil (Senior Machinist)",
    implementedBy: "Pending Committee Review",
    preparedBy: "Sanjay Patil",
    approvedBy: "",
    verifiedBy: "",
    status: "Pending",
    classification: "Pending",
    remark: "Poka-yoke suggestion submitted for review.",
    photoBefore: svgBeforeGeneric,
    photoAfter: svgAfterGeneric,
    result: "Under committee evaluation.",
    createdAt: "2026-08-05T14:15:00.000Z"
  },
  {
    id: "kz-14",
    srNo: "KZ-2026-014",
    month: "January",
    suggestionDate: "2026-01-14",
    title: "Quick-Change Magnetic Clamping Die on Vacuum Pump Press",
    problemBefore: "Bolted die changeover on Vacuum Pump Stamping Press #1 took 42 minutes per shift, delaying batch transitions.",
    counterMeasureAfter: "Installed SMED standardized magnetic quick-lock die plates with alignment dowels, cutting changeover time to 11 minutes.",
    area: "Vacuum Pump Line A (Pune)",
    minifactory: "MF1",
    location: "Bay 1 West - Pune",
    machine: "Stamping Press #1",
    closingTargetDate: "2026-01-25",
    implementedDate: "2026-01-22",
    costSave: 210000,
    benefits: { p: true, q: true, c: true, d: true, s: true, m: false },
    ideaBy: "Rahul Sharma (ITI Operator)",
    implementedBy: "Rahul Sharma & Tooling Team",
    preparedBy: "Rahul Sharma",
    approvedBy: "Rajesh Patil (Supervisor)",
    verifiedBy: "Amit Mehta (Kaizen Lead)",
    status: "Approved",
    classification: "Kaizen",
    remark: "SMED benchmark achievement in Q1.",
    photoBefore: svgBeforeToolRack,
    photoAfter: svgAfterToolRack,
    result: "Die changeover time reduced by 74% (42 min to 11 min).",
    createdAt: "2026-01-14T09:00:00.000Z"
  },
  {
    id: "kz-15",
    srNo: "KZ-2026-015",
    month: "February",
    suggestionDate: "2026-02-09",
    title: "Automated Torque Angle Poka-Yoke on EGR Actuator Housing",
    problemBefore: "Cross-threaded M6 bolts on EGR actuator housings passed torque threshold prematurely, causing unseated housing assemblies.",
    counterMeasureAfter: "Programmed dual torque + angle window (24 Nm + 90 deg +/- 5 deg) on DC nutrunner controller with auto-reject chute lock.",
    area: "EGR Assembly Line - Chennai",
    minifactory: "MF2",
    location: "Cell E2 - Chennai",
    machine: "Atlas Copco Nutrunner ST-03",
    closingTargetDate: "2026-02-20",
    implementedDate: "2026-02-18",
    costSave: 165000,
    benefits: { p: false, q: true, c: true, d: true, s: false, m: true },
    ideaBy: "Sunita Rao (Technician)",
    implementedBy: "Sunita Rao & Controls Eng",
    preparedBy: "Sunita Rao",
    approvedBy: "Vijay Deshmukh (Area Leader)",
    verifiedBy: "Amit Mehta (Kaizen Lead)",
    status: "Approved",
    classification: "Kaizen",
    remark: "Eliminated cross-thread customer escapes completely.",
    photoBefore: svgBeforeGeneric,
    photoAfter: svgAfterGeneric,
    result: "First Time Right (FTR) improved from 97.4% to 99.9%.",
    createdAt: "2026-02-09T10:30:00.000Z"
  },
  {
    id: "kz-16",
    srNo: "KZ-2026-016",
    month: "March",
    suggestionDate: "2026-03-11",
    title: "Swarf Chip Conveyor Auto-Reverse Interlock on CNC Mill",
    problemBefore: "Heavy aluminum swarf accumulation jammed the CNC chip auger twice a week, requiring 45 minutes of manual clearing.",
    counterMeasureAfter: "Added current-sensing overload relay that triggers a 5-second auto-reverse cycle before clearing jammed swarf automatically.",
    area: "Machining & Milling Shop",
    minifactory: "Machining",
    location: "Bay 4 Machining Section",
    machine: "CNC Milling Center ST-08",
    closingTargetDate: "2026-03-22",
    implementedDate: "2026-03-19",
    costSave: 135000,
    benefits: { p: true, q: false, c: true, d: true, s: true, m: true },
    ideaBy: "Sanjay Patil (Senior Machinist)",
    implementedBy: "Sanjay Patil & Electrical Maintenance",
    preparedBy: "Sanjay Patil",
    approvedBy: "Rajesh Patil (Supervisor)",
    verifiedBy: "Amit Mehta (Kaizen Lead)",
    status: "Approved",
    classification: "Kaizen",
    remark: "Zero auger jams recorded since March deployment.",
    photoBefore: svgBeforeShield,
    photoAfter: svgAfterShield,
    result: "Saved 90 minutes/week of unplanned CNC downtime.",
    createdAt: "2026-03-11T13:15:00.000Z"
  },
  {
    id: "kz-17",
    srNo: "KZ-2026-017",
    month: "April",
    suggestionDate: "2026-04-07",
    title: "Visual Min-Max Kanban Gravity Rack for BPV Springs",
    problemBefore: "Line material handlers frequently noticed BPV return spring shortages only after the feeder bin ran completely empty.",
    counterMeasureAfter: "Constructed a two-bin FIFO gravity flow rack with an automatic yellow/red mechanical flag triggered when the primary bin is removed.",
    area: "Final Quality BPV - Pune",
    minifactory: "MF3",
    location: "BPV Conveyor Line 2 - Pune",
    machine: "Spring Feeder Station ST-01",
    closingTargetDate: "2026-04-18",
    implementedDate: "2026-04-15",
    costSave: 72000,
    benefits: { p: true, q: false, c: true, d: true, s: false, m: true },
    ideaBy: "Arjun Mehra (Automation Engineer)",
    implementedBy: "Arjun Mehra",
    preparedBy: "Arjun Mehra",
    approvedBy: "Vijay Deshmukh (Area Leader)",
    verifiedBy: "Amit Mehta (Kaizen Lead)",
    status: "Good Point",
    classification: "Good Point",
    remark: "Simple zero-power visual replenishment trigger.",
    photoBefore: svgBeforeToolRack,
    photoAfter: svgAfterToolRack,
    result: "Material starvation stops on BPV Line 2 dropped to zero.",
    createdAt: "2026-04-07T08:45:00.000Z"
  },
  {
    id: "kz-18",
    srNo: "KZ-2026-018",
    month: "May",
    suggestionDate: "2026-05-12",
    title: "Compressed Air Blow-Off Nozzle Replacement with Venturi Amplifiers",
    problemBefore: "Open 6mm copper tubes were used for part drying after ultrasonic washing, consuming excessive compressed air.",
    counterMeasureAfter: "Replaced open copper pipes on all 3 wash booths with engineered Coanda-effect air amplifier nozzles.",
    area: "Maintenance & Utilities",
    minifactory: "Maintenance",
    location: "Central Utility Wash Bay",
    machine: "Ultrasonic Washer #2",
    closingTargetDate: "2026-05-24",
    implementedDate: "2026-05-21",
    costSave: 185000,
    benefits: { p: false, q: true, c: true, d: false, s: true, m: false },
    ideaBy: "Vijay Deshmukh (Maintenance Tech)",
    implementedBy: "Vijay Deshmukh",
    preparedBy: "Vijay Deshmukh",
    approvedBy: "Amit Mehta (Kaizen Lead)",
    verifiedBy: "Amit Mehta (Kaizen Lead)",
    status: "Approved",
    classification: "Kaizen",
    remark: "High ROI green energy conservation Kaizen.",
    photoBefore: svgBeforeAirLeak,
    photoAfter: svgAfterAirLeak,
    result: "42% reduction in CFM air consumption and 10 dB noise drop.",
    createdAt: "2026-05-12T11:10:00.000Z"
  },
  {
    id: "kz-19",
    srNo: "KZ-2026-019",
    month: "May",
    suggestionDate: "2026-05-26",
    title: "Go/No-Go Master Calibration Ring Holder at CMM Table",
    problemBefore: "Master setting rings were kept inside wooden drawers, requiring operators to open and unwrap anti-rust paper before every shift check.",
    counterMeasureAfter: "Created a desiccated acrylic quick-access dome stand with color-coded slots next to the CMM granite table.",
    area: "Quality Assurance Metrology",
    minifactory: "Quality",
    location: "CMM Room - Main Plant",
    machine: "Mitutoyo Quality Bench",
    closingTargetDate: "2026-06-04",
    implementedDate: "2026-06-02",
    costSave: 38000,
    benefits: { p: true, q: true, c: false, d: true, s: false, m: true },
    ideaBy: "Deepak Verma (Operator)",
    implementedBy: "Deepak Verma",
    preparedBy: "Deepak Verma",
    approvedBy: "Sunita Rao (Quality Lead)",
    verifiedBy: "Amit Mehta (Kaizen Lead)",
    status: "Good Point",
    classification: "Good Point",
    remark: "Saves 4 minutes at the start of every shift.",
    photoBefore: svgBeforeToolRack,
    photoAfter: svgAfterToolRack,
    result: "Instant gauge verification with continuous humidity protection.",
    createdAt: "2026-05-26T15:30:00.000Z"
  },
  {
    id: "kz-20",
    srNo: "KZ-2026-020",
    month: "August",
    suggestionDate: "2026-08-08",
    title: "Dual-Hand Anti-Tie-Down Optical Touch Buttons on BPV Press",
    problemBefore: "Mechanical spring-loaded dual palm buttons required 18N of thumb force, causing operator wrist strain over 500 cycles/shift.",
    counterMeasureAfter: "Upgrade to zero-force capacitive optical touch safety buttons with anti-tie-down synchronous relay logic.",
    area: "Final Quality BPV - Pune",
    minifactory: "MF3",
    location: "BPV Conveyor Line 2 - Pune",
    machine: "BPV Crimp Press #2",
    closingTargetDate: "2026-08-28",
    implementedDate: "",
    costSave: 65000,
    benefits: { p: true, q: false, c: false, d: false, s: true, m: true },
    ideaBy: "Arjun Mehra (Automation Engineer)",
    implementedBy: "Pending Committee Review",
    preparedBy: "Arjun Mehra",
    approvedBy: "",
    verifiedBy: "",
    status: "Pending",
    classification: "Pending",
    remark: "Safety & Ergonomics proposal queued for CFT approval.",
    photoBefore: svgBeforeShield,
    photoAfter: svgAfterShield,
    result: "Pending CFT budget sign-off.",
    createdAt: "2026-08-08T09:20:00.000Z"
  }
];

// In-memory data store for Open Impact Points & Action Items
let impactActions: any[] = [
  {
    id: "ia-1",
    kaizenSrNo: "KZ-2026-001",
    kaizenTitle: "Air Leak Reduction at Vacuum Pump Test Bench",
    department: "MF1",
    category: "Method",
    impactDescription: "Update SOP Rev 3.2 for pneumatic coupler torque standards and incorporate daily leak inspection in pre-shift checklist.",
    assignedOwner: "Rahul Sharma (ITI Operator)",
    targetDate: "2026-08-20",
    status: "In Progress",
    actionTaken: "Drafted SOP update. Pending final sign-off from Quality Supervisor.",
    closedDate: "",
    verifiedBy: "Amit Mehta",
    createdAt: "2026-07-20T10:00:00.000Z"
  },
  {
    id: "ia-2",
    kaizenSrNo: "KZ-2026-002",
    kaizenTitle: "Organized 5S Shadow Board for EGR Valve Tooling",
    department: "MF2",
    category: "Horizontal Deployment",
    impactDescription: "Replicate 5S tool shadow board across all 4 neighboring EGR Valve assembly stations in Chennai plant.",
    assignedOwner: "Sunita Rao (Technician)",
    targetDate: "2026-08-28",
    status: "Open",
    actionTaken: "Shadow board materials ordered from vendor.",
    closedDate: "",
    verifiedBy: "",
    createdAt: "2026-07-22T09:00:00.000Z"
  },
  {
    id: "ia-3",
    kaizenSrNo: "KZ-2026-003",
    kaizenTitle: "Interlocked Safety Shield on Pump Housing Grinder",
    department: "Machining",
    category: "Safety",
    impactDescription: "Perform safety interlocking circuit audit on all grinding machines in Hosur shop floor.",
    assignedOwner: "Sanjay Patil (Senior Machinist)",
    targetDate: "2026-08-10",
    status: "Closed",
    actionTaken: "Interlock audit completed on 6 grinding machines. All micro-switches verified operational.",
    closedDate: "2026-08-10",
    verifiedBy: "Vikram Sen (Safety Lead)",
    createdAt: "2026-07-25T11:00:00.000Z"
  },
  {
    id: "ia-4",
    kaizenSrNo: "KZ-2026-004",
    kaizenTitle: "PTFE Self-Centering Guide Rails for BPV Conveyor",
    department: "MF3",
    category: "Machine",
    impactDescription: "Update PM checklist for monthly wear inspection of PTFE guide rails.",
    assignedOwner: "Arjun Mehra (Automation Lead)",
    targetDate: "2026-08-18",
    status: "Open",
    actionTaken: "Pending addition to ERP maintenance schedule.",
    closedDate: "",
    verifiedBy: "",
    createdAt: "2026-07-28T14:20:00.000Z"
  },
  {
    id: "ia-5",
    kaizenSrNo: "KZ-2026-008",
    kaizenTitle: "Digital Bluetooth Caliper Auto-Sync in Metrology Lab",
    department: "Quality",
    category: "Measurement",
    impactDescription: "Standardize Bluetooth HID USB protocol settings across all Metrology Lab measurement benches.",
    assignedOwner: "Sunita Rao (Quality Specialist)",
    targetDate: "2026-08-25",
    status: "In Progress",
    actionTaken: "2 out of 5 benches updated with auto-sync firmware.",
    closedDate: "",
    verifiedBy: "Amit Mehta",
    createdAt: "2026-08-01T08:45:00.000Z"
  }
];

// Red flags seed array moved to Django backend

// Standard 25-point 5S audit checklist generator helper
const generate5SChecklist = (scores: { s1: number[]; s2: number[]; s3: number[]; s4: number[]; s5: number[] }) => {
  return [
    // 1S - Sort (Seiri)
    { id: "1s-1", pillar: "1S-Sort", checkpoint: "Workstation Clutter & Gangways", criteria: "No unneeded tools, excess stock, or scrap on floor/aisles", standard: "100% clear gangways, zero idle clutter", score: scores.s1[0] || 4 },
    { id: "1s-2", pillar: "1S-Sort", checkpoint: "Red Tag Holding Area", criteria: "Unwanted items tagged with 5S Red Tag, aging tracked (<15d)", standard: "Active red tag register, no unapproved aged items", score: scores.s1[1] || 4 },
    { id: "1s-3", pillar: "1S-Sort", checkpoint: "WIP & Material Limits", criteria: "Raw material & in-process inventory within marked max limits", standard: "Max 1 shift WIP, no overflowing bins", score: scores.s1[2] || 4 },
    { id: "1s-4", pillar: "1S-Sort", checkpoint: "Defect & Scrap Segregation", criteria: "Rejects and scrap physically separated in red quarantine bins", standard: "Quarantine clearly locked or distinct from good parts", score: scores.s1[3] || 4 },
    { id: "1s-5", pillar: "1S-Sort", checkpoint: "Obsolete Documentation", criteria: "Old drawings, obsolete SOPs, and expired forms discarded", standard: "Only current revision documents displayed", score: scores.s1[4] || 4 },

    // 2S - Set In Order (Seiton)
    { id: "2s-1", pillar: "2S-SetInOrder", checkpoint: "Tool Shadow Boards", criteria: "All hand tools, gauges, and jigs have marked silhouette slots", standard: "Color shadow board, missing tools instantly visible", score: scores.s2[0] || 4 },
    { id: "2s-2", pillar: "2S-SetInOrder", checkpoint: "Floor Demarcation Lines", criteria: "Yellow aisles, green walkways, red danger zones clearly painted", standard: "Lines crisp, no faded paint, clear boundaries", score: scores.s2[1] || 4 },
    { id: "2s-3", pillar: "2S-SetInOrder", checkpoint: "Kanban Part Address System", criteria: "Aisle-Rack-Shelf-Bin labels on every storage location", standard: "Anyone can locate part within 30 seconds", score: scores.s2[2] || 4 },
    { id: "2s-4", pillar: "2S-SetInOrder", checkpoint: "Ergonomic Tool Reach", criteria: "Frequently used tools within primary reach zone (arm's length)", standard: "Zero excessive bending, stretching, or walking", score: scores.s2[3] || 4 },
    { id: "2s-5", pillar: "2S-SetInOrder", checkpoint: "Safety Gear Access", criteria: "Fire extinguishers, eyewash & electric panels unobstructed 1m", standard: "Zero obstacles in front of emergency utilities", score: scores.s2[4] || 4 },

    // 3S - Shine & Inspect (Seiso)
    { id: "3s-1", pillar: "3S-Shine", checkpoint: "Machine Cleaning & Viewing", criteria: "Machine frames, slides, guards, windows free of oil/dust", standard: "Wiped clean every shift, clear visibility", score: scores.s3[0] || 4 },
    { id: "3s-2", pillar: "3S-Shine", checkpoint: "Floor Cleanliness & Leaks", criteria: "Floors dry and clean, zero oil drips, coolant or grease puddles", standard: "Zero slip hazards, pristine epoxy shine", score: scores.s3[1] || 4 },
    { id: "3s-3", pillar: "3S-Shine", checkpoint: "Source of Contamination (SOC)", criteria: "Leaks and chip dispersal controlled at source with deflectors", standard: "Active SOC mitigation program in place", score: scores.s3[2] || 4 },
    { id: "3s-4", pillar: "3S-Shine", checkpoint: "5S Cleaning Station", criteria: "Brooms, wipers, degreasers stored neatly in dedicated racks", standard: "Color-coded cleaning tools in shadow rack", score: scores.s3[3] || 4 },
    { id: "3s-5", pillar: "3S-Shine", checkpoint: "Daily 5-Min Cleaning Routine", criteria: "Operators perform shift-end 5-min clean-to-inspect routine", standard: "Daily 5S checklist signed by operator & supervisor", score: scores.s3[4] || 4 },

    // 4S - Standardize (Seiketsu)
    { id: "4s-1", pillar: "4S-Standardize", checkpoint: "Visual Controls on Gauges", criteria: "Operating range green stickers and red danger zones on dials", standard: "Pressure/temp abnormalities detectable from 2m away", score: scores.s4[0] || 4 },
    { id: "4s-2", pillar: "4S-Standardize", checkpoint: "Bolt Torque Match-Marking", criteria: "Torque seal witness lines on all critical bolts & union joints", standard: "Loosened fasteners visible at a glance", score: scores.s4[1] || 4 },
    { id: "4s-3", pillar: "4S-Standardize", checkpoint: "Pipe Flow & Rotation Arrows", criteria: "Pneumatics, water & oil lines color-coded with flow arrows", standard: "Full compliance with ISO/ASME pipe standards", score: scores.s4[2] || 4 },
    { id: "4s-4", pillar: "4S-Standardize", checkpoint: "OPL & Visual Work Standards", criteria: "One-Point Lessons (OPLs) and visual standard cards displayed", standard: "Laminated, clear font, updated revision dates", score: scores.s4[3] || 4 },
    { id: "4s-5", pillar: "4S-Standardize", checkpoint: "5S Responsibility Zone Map", criteria: "Every square meter has an assigned operator owner & champion", standard: "Zone chart posted with photos of area custodians", score: scores.s4[4] || 4 },

    // 5S - Sustain (Shitsuke)
    { id: "5s-1", pillar: "5S-Sustain", checkpoint: "Audit Frequency Adherence", criteria: "Gemba walks and weekly audits completed as per schedule", standard: "100% adherence to planned audit calendar", score: scores.s5[0] || 4 },
    { id: "5s-2", pillar: "5S-Sustain", checkpoint: "CAPA Action Item Closure", criteria: "Prior audit non-conformities resolved within target deadlines", standard: "Zero overdue CAPA action items", score: scores.s5[3] || 4 },
    { id: "5s-3", pillar: "5S-Sustain", checkpoint: "Self-Discipline & PPE Adherence", criteria: "Team wears standard PPE and returns tools without reminder", standard: "Habitual compliance across all operators", score: scores.s5[2] || 4 },
    { id: "5s-4", pillar: "5S-Sustain", checkpoint: "5S Kaizen Culture", criteria: "Shopfloor operators actively propose 5S improvements", standard: "At least 1 5S Kaizen logged per zone per month", score: scores.s5[1] || 4 },
    { id: "5s-5", pillar: "5S-Sustain", checkpoint: "Visual 5S Dashboard Board", criteria: "Radar chart, audit scores, and zone champions displayed", standard: "Weekly board updates visible to whole team", score: scores.s5[4] || 4 }
  ];
};

// In-memory data store for 5S Audits
let fiveSAudits: any[] = [
  {
    id: "fs-1",
    auditDate: "2026-07-25",
    area: "Assembly Line A (Pune)",
    plantZone: "Plant 1 - Final Assembly",
    auditor: "Amit Mehta (Kaizen Lead)",
    shift: "Shift 1",
    auditType: "Monthly Cross-Plant Audit",
    sortScore: 4.8,
    setInOrderScore: 4.6,
    shineScore: 4.8,
    standardizeScore: 4.4,
    sustainScore: 4.4,
    totalScore: 92, // %
    grade: "A+",
    remarks: "Benchmark standard! Tool shadow boards pristine, zero loose items, gangways 100% clear. Golden Broom candidate.",
    status: "Excellent",
    strengths: [
      "Custom two-color high density foam cutouts on all pneumatic tool tables",
      "Epoxy floor lines freshly repainted with clear pedestrian walkways",
      "Torque match marking strictly applied on all 14 station fixture bolts"
    ],
    opportunities: [
      "Replace worn visual limit sticker on Station #4 pneumatic regulator",
      "Digitize daily 5-minute cleaning checklist via mobile QR code"
    ],
    photoBefore: svg5sShadowBoard,
    photoAfter: svg5sCleanInspect,
    checklist: generate5SChecklist({
      s1: [5, 5, 5, 4, 5],
      s2: [5, 5, 4, 5, 4],
      s3: [5, 5, 4, 5, 5],
      s4: [5, 4, 4, 5, 4],
      s5: [5, 4, 4, 5, 4]
    }),
    createdAt: "2026-07-25T09:00:00.000Z"
  },
  {
    id: "fs-2",
    auditDate: "2026-07-20",
    area: "BPV Line 2 - Pune",
    plantZone: "Plant 1 - Sub-Assembly Bay",
    auditor: "Sanjay Patil (Supervisor)",
    shift: "Shift 1",
    auditType: "Weekly Area Audit",
    sortScore: 4.2,
    setInOrderScore: 4.4,
    shineScore: 4.0,
    standardizeScore: 4.2,
    sustainScore: 4.2,
    totalScore: 84, // %
    grade: "A",
    remarks: "Good visual management and Kanban part addresses. A few minor swarf particles near deburring station.",
    status: "Good",
    strengths: [
      "Kanban address barcodes clearly readable on every single component tray",
      "One-Point Lessons for BPV alignment posted at operator eye level"
    ],
    opportunities: [
      "Empty reject bin at deburring station before shift handover",
      "Add red tag on cracked fixture clamp found under bench"
    ],
    photoBefore: svg5sFloorDemarcation,
    photoAfter: svg5sShadowBoard,
    checklist: generate5SChecklist({
      s1: [4, 4, 4, 4, 5],
      s2: [5, 4, 5, 4, 4],
      s3: [4, 4, 3, 5, 4],
      s4: [4, 4, 4, 5, 4],
      s5: [4, 4, 4, 5, 4]
    }),
    createdAt: "2026-07-20T11:00:00.000Z"
  },
  {
    id: "fs-3",
    auditDate: "2026-07-16",
    area: "Hosur Machine Shop",
    plantZone: "Plant 2 - Machining Division",
    auditor: "Amit Mehta (Kaizen Lead)",
    shift: "Shift 2",
    auditType: "Weekly Area Audit",
    sortScore: 3.8,
    setInOrderScore: 3.6,
    shineScore: 3.4,
    standardizeScore: 3.8,
    sustainScore: 3.4,
    totalScore: 72, // %
    grade: "B",
    remarks: "Fair progress. Machining oil mist around CNC #4 needs source containment. Tool cabinet needs shadow inlay.",
    status: "Good",
    strengths: [
      "All pedestrian walkways well respected with zero forklift incursions",
      "Daily emergency eyewash testing log fully updated"
    ],
    opportunities: [
      "Install splash guard to arrest coolant drip from CNC #4 chuck",
      "Dispose 2 obsolete boring bars currently resting on machine bed"
    ],
    photoBefore: svgBeforeAirLeak,
    photoAfter: svg5sFloorDemarcation,
    checklist: generate5SChecklist({
      s1: [4, 3, 4, 4, 4],
      s2: [4, 3, 4, 4, 3],
      s3: [3, 3, 3, 4, 4],
      s4: [4, 4, 4, 4, 3],
      s5: [3, 4, 3, 4, 3]
    }),
    createdAt: "2026-07-16T15:30:00.000Z"
  },
  {
    id: "fs-4",
    auditDate: "2026-07-10",
    area: "Welding Shop - Chennai",
    plantZone: "Plant 3 - Fabrication & Weld",
    auditor: "Vikram Sen (Safety Specialist)",
    shift: "General Shift",
    auditType: "Monthly Cross-Plant Audit",
    sortScore: 2.6,
    setInOrderScore: 2.4,
    shineScore: 2.8,
    standardizeScore: 2.6,
    sustainScore: 2.6,
    totalScore: 52, // %
    grade: "C",
    remarks: "Non-compliant! Heavy clutter of raw metal parts blocking emergency gangway. Red Tag holding campaign mandated immediately.",
    status: "Needs Improvement",
    strengths: [
      "Weld fume extraction hoods operating at correct airflow velocity"
    ],
    opportunities: [
      "Immediate clearance of weld spatter and slag from gangway floor",
      "Red Tag 12 obsolete stamping dies stored haphazardly in work cell",
      "Re-paint faded floor demarcation yellow boundary lines"
    ],
    photoBefore: svg5sRedTagItem,
    photoAfter: svgBeforeToolRack,
    checklist: generate5SChecklist({
      s1: [2, 2, 3, 3, 3],
      s2: [2, 2, 3, 3, 2],
      s3: [3, 2, 3, 3, 3],
      s4: [3, 2, 3, 3, 2],
      s5: [3, 2, 3, 3, 2]
    }),
    createdAt: "2026-07-10T14:30:00.000Z"
  }
];

// In-memory data store for 5S Red Tags (1S Seiri Holding Area)
let fiveSRedTags: any[] = [
  {
    id: "rt-1",
    tagNo: "RT-2026-001",
    dateTagged: "2026-07-26",
    taggedBy: "Amit Mehta (Kaizen Lead)",
    itemDescription: "Surplus Stamping Die Clamp Blocks (Qty: 8)",
    category: "Tool / Jig / Fixture",
    quantity: "8 pcs",
    areaFound: "Chennai Welding Shop - Bay 3",
    reason: "Surplus / Excess Stock",
    estimatedValueInr: 35000,
    actionRecommended: "Transfer to other Dept",
    dispositionDeadline: "2026-08-10",
    dispositionApprovedBy: "Rajesh Patil",
    status: "In Holding Area",
    photoUrl: svg5sRedTagItem,
    createdAt: "2026-07-26T08:30:00.000Z"
  },
  {
    id: "rt-2",
    tagNo: "RT-2026-002",
    dateTagged: "2026-07-18",
    taggedBy: "Ketan Patil (Senior Auditor)",
    itemDescription: "Cracked High-Pressure Hydraulic Hose Reels",
    category: "Machine Spare",
    quantity: "3 reels (45m)",
    areaFound: "Hosur Machine Shop - CNC Rack 2",
    reason: "Defective / Damaged",
    estimatedValueInr: 18000,
    actionRecommended: "Scrap",
    dispositionDeadline: "2026-07-31",
    dispositionApprovedBy: "Sanjay Patil",
    disposedDate: "2026-07-29",
    dispositionNotes: "Sent to certified industrial metal & rubber recycling vendor.",
    status: "Disposed / Closed",
    photoUrl: svg5sRedTagItem,
    createdAt: "2026-07-18T10:15:00.000Z"
  },
  {
    id: "rt-3",
    tagNo: "RT-2026-003",
    dateTagged: "2026-07-06",
    taggedBy: "Suresh Kumar (Operator)",
    itemDescription: "Obsolete Euro-4 Engine Mounting Bracket Welding Jig",
    category: "Tool / Jig / Fixture",
    quantity: "1 heavy fixture",
    areaFound: "Assembly Line A - Pune East Bay",
    reason: "Obsolete / Expired",
    estimatedValueInr: 120000,
    actionRecommended: "Scrap",
    dispositionDeadline: "2026-07-20",
    status: "In Holding Area", // Aged >15 days (Alert!)
    photoUrl: svg5sRedTagItem,
    createdAt: "2026-07-06T14:00:00.000Z"
  },
  {
    id: "rt-4",
    tagNo: "RT-2026-004",
    dateTagged: "2026-07-24",
    taggedBy: "Pooja Sharma (Quality Tech)",
    itemDescription: "Unidentified Industrial Degreaser Fluid Barrel (200L)",
    category: "Raw Material",
    quantity: "1 drum (200L)",
    areaFound: "Paint Shop Staging - Hosur",
    reason: "Unidentified",
    estimatedValueInr: 45000,
    actionRecommended: "Return to Supplier",
    dispositionDeadline: "2026-08-05",
    dispositionApprovedBy: "Vikram Sen",
    status: "Approved for Disposal",
    photoUrl: svg5sRedTagItem,
    createdAt: "2026-07-24T09:40:00.000Z"
  },
  {
    id: "rt-5",
    tagNo: "RT-2026-005",
    dateTagged: "2026-07-22",
    taggedBy: "Vijay Deshmukh (Area Leader)",
    itemDescription: "Dented Sheet Metal BPV Enclosure Panels Lot #B-402",
    category: "Defective Part",
    quantity: "14 pcs",
    areaFound: "BPV Line 2 - Pune",
    reason: "Defective / Damaged",
    estimatedValueInr: 28000,
    actionRecommended: "Repair / Re-machine",
    dispositionDeadline: "2026-08-01",
    status: "In Holding Area",
    photoUrl: svg5sRedTagItem,
    createdAt: "2026-07-22T13:20:00.000Z"
  },
  {
    id: "rt-6",
    tagNo: "RT-2026-006",
    dateTagged: "2026-07-28",
    taggedBy: "Manoj Kumar (Forklift Operator)",
    itemDescription: "Splintered Wooden Transport Pallets (Hazardous)",
    category: "Packaging / Pallet",
    quantity: "12 pallets",
    areaFound: "Dispatch Warehouse Gangway #4",
    reason: "Scrap",
    estimatedValueInr: 3600,
    actionRecommended: "Scrap",
    dispositionDeadline: "2026-07-30",
    status: "Tagged",
    photoUrl: svg5sRedTagItem,
    createdAt: "2026-07-28T16:00:00.000Z"
  }
];

// In-memory data store for 5S CAPA Action Items
let fiveSActions: any[] = [
  {
    id: "act-1",
    auditId: "fs-4",
    pillar: "1S",
    findingDescription: "Obsolete stamping dies and metal scrap blocking main emergency gangway in Chennai Welding Shop.",
    rootCause: "No temporary holding buffer defined prior to tooling swap.",
    correctiveAction: "Cleared 100% of gangway clutter, created designated Red Tag Holding Zone #2 with physical chain boundary.",
    area: "Welding Shop - Chennai",
    assignedTo: "Rajesh Patil (Supervisor)",
    targetDate: "2026-07-15",
    completedDate: "2026-07-14",
    status: "Verified Closed",
    priority: "Critical",
    photoBefore: svg5sRedTagItem,
    photoAfter: svg5sFloorDemarcation,
    linkedKaizenId: "kz-3",
    createdAt: "2026-07-10T16:00:00.000Z"
  },
  {
    id: "act-2",
    auditId: "fs-1",
    pillar: "2S",
    findingDescription: "Wrenches and pneumatic torque bits piled loose on assembly bench without location outlines.",
    rootCause: "New 14mm bit added to assembly sequence without updating tool foam shadow board.",
    correctiveAction: "Cut two-color EVA high-density foam shadow board with silhouette outlines for every tool.",
    area: "Assembly Line A (Pune)",
    assignedTo: "Sunita Rao (Line Leader)",
    targetDate: "2026-07-20",
    completedDate: "2026-07-19",
    status: "Verified Closed",
    priority: "High",
    photoBefore: svgBeforeToolRack,
    photoAfter: svg5sShadowBoard,
    linkedKaizenId: "kz-3",
    createdAt: "2026-07-02T10:00:00.000Z"
  },
  {
    id: "act-3",
    auditId: "fs-3",
    pillar: "3S",
    findingDescription: "Hydraulic oil dripping from CNC #4 chuck rotary cylinder onto machine bed and floor.",
    rootCause: "Worn nitrile seal on high pressure rotary union due to fine metal chip intrusion.",
    correctiveAction: "Replace rotary seal and install stainless steel chip deflector apron to prevent chips entering seal.",
    area: "Hosur Machine Shop",
    assignedTo: "Ketan Patil (Maintenance Lead)",
    targetDate: "2026-08-05",
    status: "In Progress",
    priority: "Critical",
    photoBefore: svg5sCleanInspect,
    createdAt: "2026-07-16T17:00:00.000Z"
  },
  {
    id: "act-4",
    auditId: "fs-2",
    pillar: "4S",
    findingDescription: "Pneumatic regulator pressure dials on BPV line lack green operating range markings.",
    rootCause: "Maintenance replaced gauge dials without reapplying visual standard vinyl stickers.",
    correctiveAction: "Affix standard circular green range stickers (4.5 - 6.0 Bar) and red maximum limit indicators.",
    area: "BPV Line 2 - Pune",
    assignedTo: "Amit Mehta (Kaizen Lead)",
    targetDate: "2026-08-08",
    status: "Open",
    priority: "Medium",
    createdAt: "2026-07-20T14:00:00.000Z"
  },
  {
    id: "act-5",
    auditId: "fs-3",
    pillar: "5S",
    findingDescription: "Daily 5-minute cleaning sign-off checklist not completed on Shift 2 for 3 consecutive days.",
    rootCause: "Sign-off board placed behind electrical cabinet, out of operator line of sight.",
    correctiveAction: "Relocated board to main line entrance and created a 1-Point Lesson (OPL) on shift-end handover.",
    area: "Hosur Machine Shop",
    assignedTo: "Vijay Deshmukh (Area Leader)",
    targetDate: "2026-08-10",
    status: "In Progress",
    priority: "High",
    createdAt: "2026-07-17T09:00:00.000Z"
  }
];

// In-memory data store for 5S Source of Contamination (SOC) Logs
let fiveSSocLogs: any[] = [
  {
    id: "soc-1",
    dateFound: "2026-07-12",
    machineOrArea: "CNC Milling Machine #4 (Hosur)",
    contaminantType: "Coolant Mist",
    sourceDescription: "High-pressure coolant spray splashing out past missing door rubber seal wiper.",
    countermeasurePlanned: "Installed magnetic silicone splash skirt and replaced door wiper gasket.",
    owner: "Sanjay Patil (Senior Machinist)",
    targetDate: "2026-07-18",
    status: "Eliminated",
    photoUrl: svg5sCleanInspect,
    createdAt: "2026-07-12T11:00:00.000Z"
  },
  {
    id: "soc-2",
    dateFound: "2026-07-15",
    machineOrArea: "BPV Laser Welding Station (Pune)",
    contaminantType: "Metal Chips / Swarf",
    sourceDescription: "Flexible exhaust hose on deburring vacuum unit has a 10mm tear near the clamp collar.",
    countermeasurePlanned: "Swap with wire-reinforced anti-abrasive polyurethane suction tube.",
    owner: "Arjun Mehra (Automation Engineer)",
    targetDate: "2026-08-04",
    status: "Open",
    createdAt: "2026-07-15T15:20:00.000Z"
  },
  {
    id: "soc-3",
    dateFound: "2026-07-14",
    machineOrArea: "Hydraulic Stamping Press #2 (Chennai)",
    contaminantType: "Oil Leak / Drip",
    sourceDescription: "Micro-drip from solenoid valve manifold O-ring onto bed guide rail.",
    countermeasurePlanned: "Replaced 4 manifold O-rings with Viton high-pressure seals, torqued to 45 Nm.",
    owner: "Manoj Kumar (Maintenance)",
    targetDate: "2026-07-22",
    status: "Eliminated",
    photoUrl: svg5sCleanInspect,
    createdAt: "2026-07-14T09:30:00.000Z"
  },
  {
    id: "soc-4",
    dateFound: "2026-07-23",
    machineOrArea: "Powder Coating Booth (Hosur)",
    contaminantType: "Dust / Powder",
    sourceDescription: "Filter cartridge seal leaking airborne pigment dust onto neighboring walkway.",
    countermeasurePlanned: "Install dual HEPA seal gaskets and add differential pressure manometers.",
    owner: "Kavita Reddy (EHS Lead)",
    targetDate: "2026-08-12",
    status: "Open",
    createdAt: "2026-07-23T14:10:00.000Z"
  }
];

// In-memory data store for Safety Incident near-misses
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

// In-memory data store for PPSR Reports (Practical Problem Solving Report)
let ppsrReports: any[] = [
  {
    id: "ppsr-1",
    ppsrNo: "PPSR-2026-001",
    title: "Rear Bumper Clip Retention Alignment Failure",
    problemStatement: "The clip retention tab on the rear left bumper assembly is failing to engage fully during final marriage. This leaves a 2.8mm visual gap that fails the final Quality Gate audit on 5.4% of Hatchback GT-Line models.",
    rootCauseAnalysis: "1. Why is there a 2.8mm gap? The bumper retention clip tab is not snapping into the locking slot. 2. Why? The alignment pins on the body side are offset. 3. Why? The fixture locating pin is worn out by 0.45mm. 4. Why? Locating pin replacement was missed. 5. Why? PM schedule lacked coordinate-measuring machine (CMM) alignment checks.",
    containmentAction: "Added double-faced alignment foam tape on ST-14; introduced a manual secondary check gauge before final bolt tightening.",
    permanentCorrectiveAction: "Replaced the worn fixture locating pins with hardened carbide pins and integrated quarterly laser tracking system checks into the PM system.",
    validationCheck: "CMM measurements daily for 10 shifts to verify that bumper gap deviation remains strictly below 0.5mm.",
    status: "Closed",
    targetDate: "2026-07-12",
    leadOwner: "Sunita Rao (Body Shop Quality Lead)",
    createdAt: "2026-07-02T10:00:00.000Z",

    jiraNumber: "JIRA-QA-1082",
    week: "WK-27",
    coach: "Amit Mehta",
    cft: "Body Shop CFT",
    stdStatusMF: "Completed",
    stdDate: "2026-07-12",
    effDaysStd: 10,
    responsibility: "Sunita Rao",
    ppsrEndDate: "2026-07-12",
    effDaysClosePpsr: 10,
    prodQtyBefore: 5000,
    rejectedQtyBefore: 270,
    pctBefore: 5.4,
    prodQtyAfter: 5000,
    rejectedQtyAfter: 0,
    pctAfter: 0.0,
    effectivityText: "Zero defects achieved after carbide pins implementation.",
    custDemandQtyMonth: 10000,
    custDemandQtyAnnum: 120000,
    qtyMonthBeforeRejPct: 540,
    qtyMonthAfterRejPct: 0,
    qtyMonthSavedRejPct: 540,
    perSetRejectionCost: 850,
    costSavePerMonth: 459000,
    costSavePerAnnum: 5508000,
    remarks: "Highly effective solution. Cost savings validated.",

    projectLeader: "Sunita Rao",
    teamMembers: "Vijay Deshmukh, Rahul Sharma, Robert M.",
    plant: "Pune Chassis & Assembly",
    lineStation: "Assembly Trim Line 2 (ST-14)",
    productComponent: "Rear Bumper Module (GT-Line)",
    amountDefects: "5.4% audit failures (Approx. 12 units per shift)",
    discoveredOn: "2026-07-01",
    discoveredBy: "Ketan Patil (Senior Auditor)",
    repeatCase: "no",
    factsAnalysis: {
      whatIs: "High bumper-to-body panel visual gap exceeding 1.5mm specification.",
      whatIsNot: "No paint peeling, no clip breakage, no structural bumper damage.",
      whereIs: "Left rear quarter panel mounting point, Station Trim-2.",
      whereIsNot: "Right side rear bumper points; completely normal on sedan models.",
      howIs: "Consistent during hot humid shifts when polypropylene expands.",
      howIsNot: "Not observed on cold start shifts or during dry ambient storage.",
      whenIs: "First flagged systematically during Shift B on July 1st.",
      whenIsNot: "Not flagged in previous production weeks."
    },
    containmentActionsList: [
      { no: 1, action: "Apply temporary double-faced alignment tape to maintain horizontal hold", responsible: "Vijay Deshmukh", date: "2026-07-01", status: "proven" },
      { no: 2, action: "Introduce manual slide-gauge inspection for every Hatchback GT-Line unit", responsible: "Rahul Sharma", date: "2026-07-01", status: "implemented" }
    ],
    ishikawa: {
      man: ["Operator rushing to secure bumper within 45-second cycle", "New contract operators lacking visual tactile training"],
      machine: ["Worn fixture locating pin at Station-14 (0.45mm deviation)", "Pneumatic pressure fluctuation on the retention clamping tool"],
      material: ["Bumper clip resin batch with higher thermal expansion rate"],
      methods: ["No mechanical support guide during the insertion step", "Missing standard work instruction for secondary clip checks"],
      milieu: ["Elevated summer temperatures in the assembly shop (above 38°C)"],
      measurement: ["Relying strictly on visual gap estimations instead of standard feeler gauges"]
    },
    causeLocalizationApproach: "both",
    psqTreeData: {
      projectStatement: "Component search method & swap analysis to isolate the Red X root cause for Rear Bumper Gap clearance deviation (>1.5mm).",
      bigXTarget: "Station-14 Fixture Locating Pin Wear (0.45mm axial runout)",
      ftqRejectionRate: "4.20%",
      estimatedCost: "3200 €",
      treeType: 'swap_analysis',
      swapData: {
        productName: "Rear Bumper Fascia & Mounting Sub-Assembly",
        productNumber: "RBM-550-GT",
        customerName: "Mahindra & Mahindra Ltd",
        testResultSpecification: "Mating Gap Clearance: 0.3 - 0.8 mm (Spec max 1.0mm)",
        activeStage: 2,
        stage0: {
          bobOriginal: "0.45 mm (Good)",
          wowOriginal: "1.85 mm (Bad)",
          bobRepeat1: "0.45 mm",
          wowRepeat1: "1.82 mm",
          bobRepeat2: "0.44 mm",
          wowRepeat2: "1.86 mm",
          bobRepeat3: "0.45 mm",
          wowRepeat3: "1.84 mm",
          measurementGood: true,
          deltaMStatus: 'eliminated',
          deltaPStatus: 'active',
          notes: "Feeler gauge and optical tracker repeatability verified. Measurement is Good (ΔM eliminated)."
        },
        stage1: {
          bobRepeat1: "0.45 mm",
          wowRepeat1: "1.85 mm",
          bobRepeat2: "0.44 mm",
          wowRepeat2: "1.83 mm",
          bobRepeat3: "0.45 mm",
          wowRepeat3: "1.84 mm",
          processGood: true,
          assemblyProcessStatus: 'eliminated',
          partsStatus: 'active',
          notes: "Disassembly and re-assembly produced identical gap clearance. Process is Good (Assembly Process eliminated)."
        },
        stage2: {
          childParts: [
            { id: 'part-1', partName: "Polypropylene Bumper Fascia", wowInBobValue: "0.45 mm (BOB)", wowInBobResult: "BOB", bobInWowValue: "1.84 mm (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' },
            { id: 'part-2', partName: "Station-14 Mating Locating Pin", wowInBobValue: "1.82 mm (WOW) 🚨", wowInBobResult: "WOW", bobInWowValue: "0.46 mm (BOB) ⭐", bobInWowResult: "BOB", isDefective: true, status: 'target', notes: "Red X: Locating pin tip worn by 0.45mm preventing locking tab latching." },
            { id: 'part-3', partName: "Retaining Snap Clip", wowInBobValue: "0.46 mm (BOB)", wowInBobResult: "BOB", bobInWowValue: "1.85 mm (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' },
            { id: 'part-4', partName: "Side Bracket Guide", wowInBobValue: "0.44 mm (BOB)", wowInBobResult: "BOB", bobInWowValue: "1.83 mm (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' },
            { id: 'part-5', partName: "Tailgate Interface Flange", wowInBobValue: "0.45 mm (BOB)", wowInBobResult: "BOB", bobInWowValue: "1.84 mm (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' }
          ],
          contributingPartName: "Station-14 Mating Locating Pin",
          notes: "Station-14 fixture locating pin worn out due to abrasive contact. Replaced with ultra-hardened carbide pin."
        }
      }
    },
    fiveWhysList: {
      column1: ["Rear bumper-to-body gap exceeds 1.5mm limit", "Bumper clip tab does not snap into locking slot", "Assembly alignment pin is offset by 0.45mm", "Fixture locating pin is worn out", "PM check skipped fixture wear measurements"],
      column2: ["Pneumatic clamp didn't lock fully", "Air pressure dropped below 4.5 bar", "Main manifold leak left unaddressed", "Acoustic leak alarm deactivated", "Maintenance technician silencing alarm during lunch shift"],
      column3: ["Polypropylene clip tab deformed on press", "Cooling dwell time was shortened by 4 seconds", "PLC sequence timer modified by shift lead", "No passcode lock on PLC master cabinet", "Factory override instructions not restricted"]
    },
    correctiveActionsList: [
      { no: 1, measure: "Replace worn fixture locating pins with ultra-hardened carbide guides", responsible: "Vijay Deshmukh", deadline: "2026-07-04", status: "completed" },
      { no: 2, measure: "Restrict PLC control panels with physical key-locks and digital passwords", responsible: "Robert M.", deadline: "2026-07-08", status: "completed" },
      { no: 3, measure: "Re-train all shift operators on standardized bumper mating force techniques", responsible: "Sunita Rao", deadline: "2026-07-10", status: "completed" }
    ],
    effectivenessEvidence: "After carbide pin swap and daily laser tracker verification, the gap alignment error rate dropped from 5.4% to exactly 0%. The feeler gauge audit reports over the next 10 production days show consistent gap clearances at 0.4mm, which is well within standard specifications.",
    evidenceType: "data",
    defectTrendData: [
      { date: "Day 1 (Initial)", defectsCount: 6.2, stage: "Initial Baseline" },
      { date: "Day 2 (Manual)", defectsCount: 3.5, stage: "Manual Jig Adjustment" },
      { date: "Day 3 (Fluid Revert)", defectsCount: 1.1, stage: "Fluid Revert" },
      { date: "Day 4 (PLC Cycle)", defectsCount: 0.3, stage: "PLC Cycle" },
      { date: "Day 5 (Current)", defectsCount: 0.1, stage: "Current Standardized" }
    ],
    effectivenessChartData: [
      { name: "Day 1 (Initial)", value: 6.2 },
      { name: "Day 2 (Manual)", value: 3.5 },
      { name: "Day 3 (Fluid Revert)", value: 1.1 },
      { name: "Day 4 (PLC Cycle)", value: 0.3 },
      { name: "Day 5 (Current)", value: 0.1 }
    ],
    standardizationList: [
      { no: 1, measure: "Incorporate coordinate-measuring machine (CMM) fixture check in PMS ledger", responsible: "Vijay Deshmukh", date: "2026-07-11", status: "completed" },
      { no: 2, measure: "Add Bumper Clip Tack-time block to standard digital assembly SOP", responsible: "Sunita Rao", date: "2026-07-12", status: "completed" }
    ],
    readAcrossList: [
      { no: 1, proposal: "Deploy hard carbide locating pins across Hatchback Line 1 and Sedan Line 3", responsible: "Vijay Deshmukh", deadline: "2026-07-25" },
      { no: 2, proposal: "Incorporate standardized PLC password rules on all pneumatic stamping platforms", responsible: "Amit Mehta", deadline: "2026-07-30" }
    ],
    readAcrossExplanation: "Shared lessons with Chennai body shop teams to standardize all marriage station locating pins.",
    completionSignatures: {
      projectLeader: "Sunita Rao",
      steeringCommittee: "Rajesh Patil (Plant Steering Head)",
      completedOn: "2026-07-12"
    }
  },
  {
    id: "ppsr-2",
    ppsrNo: "PPSR-2026-002",
    title: "Excessive Weld Spatter on Engine Cradle",
    problemStatement: "Hard weld spatter beads larger than 1.5mm diameter are adhering to the front engine cradle surface during robotic MIG welding, causing interference with suspension strut mounting plates on 6.2% of SUV-300 units.",
    rootCauseAnalysis: "1. Why are spatter beads adhering? Anti-spatter chemical layer was too thin. 2. Why? Automated spray nozzle is partially clogged. 3. Why? Silica dust buildup on nozzle tip. 4. Why? Anti-spatter fluid quality contained higher silica binder. 5. Why? Sourced alternative fluid brand without validating technical datasheets.",
    containmentAction: "Initiated 100% offline manual wire-brush scrubbing of engine cradles before shipment to assembly line.",
    permanentCorrectiveAction: "Reverted to standard high-grade anti-spatter formulation; modified spray nozzle angle to 45° with automated compressed air blowoff after every cycle.",
    validationCheck: "Random paint shop visual scan for 5 consecutive production days to ensure cradle surface is free of spatter.",
    status: "In-Progress",
    targetDate: "2026-07-20",
    leadOwner: "Arjun Mehra (Automation Engineer)",
    createdAt: "2026-07-10T14:00:00.000Z",

    jiraNumber: "JIRA-QA-1094",
    week: "WK-28",
    coach: "Amit Mehta",
    cft: "Welding CFT",
    stdStatusMF: "Pending",
    stdDate: "",
    effDaysStd: 0,
    responsibility: "Arjun Mehra",
    ppsrEndDate: "",
    effDaysClosePpsr: 0,
    prodQtyBefore: 4500,
    rejectedQtyBefore: 279,
    pctBefore: 6.2,
    prodQtyAfter: 4500,
    rejectedQtyAfter: 150,
    pctAfter: 3.3,
    effectivityText: "Under active investigation. Containment wire brush active.",
    custDemandQtyMonth: 8000,
    custDemandQtyAnnum: 96000,
    qtyMonthBeforeRejPct: 496,
    qtyMonthAfterRejPct: 264,
    qtyMonthSavedRejPct: 232,
    perSetRejectionCost: 1200,
    costSavePerMonth: 278400,
    costSavePerAnnum: 3340800,
    remarks: "Corrective action scheduled for upcoming Saturday shutdown.",

    projectLeader: "Arjun Mehra",
    teamMembers: "Sunita Rao, Devendra J., Ketan Patil",
    plant: "Pune Welding Complex",
    lineStation: "MIG Weld Robot ST-3",
    productComponent: "Engine Cradle (SUV-300)",
    amountDefects: "6.2% of assemblies (approx. 22 units daily)",
    discoveredOn: "2026-07-09",
    discoveredBy: "Vikram Sen (Safety & Quality Lead)",
    repeatCase: "yes",
    factsAnalysis: {
      whatIs: "Hard weld spatter beads sticking directly on suspension bolt hole surfaces.",
      whatIsNot: "No weld crack, no porosity defects, no structural weld strength failure.",
      whereIs: "Engine cradle front suspension strut bracket (A-side flange).",
      whereIsNot: "Rear suspension brackets or auxiliary radiator frame mounts.",
      howIs: "Mainly occurs on Station 3 during high-current heavy-gauge welds.",
      howIsNot: "Not seen on thin-sheet welding processes or automated spot weld cells.",
      whenIs: "First observed right after the third-party chemical supplier shift on July 9th.",
      whenIsNot: "Not logged when using the approved chemical vendor stock."
    },
    containmentActionsList: [
      { no: 1, action: "Execute 100% manual pneumatic chiseling of active batch components", responsible: "Devendra J.", date: "2026-07-09", status: "implemented" },
      { no: 2, action: "Perform manual anti-spatter sponge brushing prior to weld start", responsible: "Ketan Patil", date: "2026-07-10", status: "proven" }
    ],
    ishikawa: {
      man: ["Operator neglected anti-spatter manual top-up checklist", "Weld programmer increased welding speed to recover production backlog"],
      machine: ["Automated spray nozzle partially clogged by high-silica compound", "Robotic gas cup shielding gas flow rate dropping below 12L/min"],
      material: ["Alternative anti-spatter compound with lower heat tolerance", "Welding wire coil with inconsistent chemical coating"],
      methods: ["No automated nozzle cleaning cycle programmed in PLC", "Weld fixture lacks protective copper shields over critical surfaces"],
      milieu: ["High draft air currents from bay doors blowing shielding gas away"],
      measurement: ["No visual check or digital scanner for spatter size at Station 3"]
    },
    fiveWhysList: {
      column1: ["Weld spatter larger than 1.5mm is adhering", "Anti-spatter protective coating was inadequate", "Spray nozzle tip was clogged", "Anti-spatter fluid contained high silica residue", "Fluid brand was changed without testing"],
      column2: ["Shielding gas coverage was poor", "Gas flow rate dropped at robot tip", "Internal gas diffuser was worn and cracked", "No preventive schedule for welding torch diffusers", "PM standard grouped diffusers with standard nozzle spares"],
      column3: ["Weld arc was unstable during shift", "Wire feed speed fluctuated", "Drive roll tension in wire feeder was loose", "Tension gauge not calibrated during yearly audit", "Calibration checklist did not explicitly cover wire tensioners"]
    },
    correctiveActionsList: [
      { no: 1, measure: "Revert chemical inventory to standard approved anti-spatter compound", responsible: "Arjun Mehra", deadline: "2026-07-12", status: "completed" },
      { no: 2, measure: "Program a 4-second automated wire-brush torch cleaner cycle every 10 welds", responsible: "Devendra J.", deadline: "2026-07-15", status: "completed" },
      { no: 3, measure: "Install protective magnetic copper covers on suspension mounting holes", responsible: "Ketan Patil", deadline: "2026-07-18", status: "in-progress" }
    ],
    effectivenessEvidence: "Since reverting the anti-spatter fluid formulation and deploying automated pneumatic torch cleaners, spatter rate on the engine cradle fell to less than 0.2%. Feeler pin gauge checks verify perfect flange mating.",
    effectivenessChartData: [
      { name: "Day 1 (Initial)", value: 6.2 },
      { name: "Day 2 (Manual)", value: 3.5 },
      { name: "Day 3 (Fluid Revert)", value: 1.1 },
      { name: "Day 4 (PLC Cycle)", value: 0.3 },
      { name: "Day 5 (Current)", value: 0.1 }
    ],
    standardizationList: [
      { no: 1, measure: "Incorporate 'Anti-Spatter Chemical Brand Verification' in procurement manual", responsible: "Arjun Mehra", date: "2026-07-14", status: "completed" },
      { no: 2, measure: "Incorporate automated weld torch tip maintenance in PM-1 Schedule", responsible: "Devendra J.", date: "2026-07-15", status: "completed" }
    ],
    readAcrossList: [
      { no: 1, proposal: "Deploy automated torch cleaner program across all Pune chassis weld stations", responsible: "Arjun Mehra", deadline: "2026-07-28" },
      { no: 2, proposal: "Audit anti-spatter chemical brands at Chennai and Indore manufacturing lines", responsible: "Sunita Rao", deadline: "2026-08-05" }
    ],
    readAcrossExplanation: "Applies to all heavy-gauge MIG welding lines. Spotted no secondary risk on sub-assemblies.",
    completionSignatures: {
      projectLeader: "Arjun Mehra",
      steeringCommittee: "Rajesh Patil (Steering Committee)",
      completedOn: ""
    }
  },
  {
    id: "ppsr-3",
    ppsrNo: "PPSR-2026-003",
    title: "Air Voids in Windshield Polyurethane Sealant",
    problemStatement: "Microscopic air bubble voids are appearing inside the automated polyurethane sealant bead applied to front windshield frames. Results in water leak test failures on 4.1% of SUV cabin assemblies.",
    rootCauseAnalysis: "1. Why are air voids appearing? Air got trapped in the high-pressure drum pump. 2. Why? Drum follower plate seal was deformed. 3. Why? Follower plate was forced down during high-viscosity cold start. 4. Why? Material pre-heating blanket was turned off. 5. Why? Heating system circuit breaker had tripped due to an unrated 15A fuse.",
    containmentAction: "Added double-wipe visual sealant bead checks; offline static cabin rain shower leak-testing for all completed vehicles.",
    permanentCorrectiveAction: "Replaced follow plate seals. Installed a high-durability 30A circuit breaker with automated temperature alarms connected to the MES cockpit.",
    validationCheck: "100% online pressurized cabin water-spray test monitored over 15 subsequent production shifts.",
    status: "In-Progress",
    targetDate: "2026-07-22",
    leadOwner: "Rajesh Patil (Maintenance Manager)",
    createdAt: "2026-07-12T08:30:00.000Z",

    jiraNumber: "JIRA-QA-1102",
    week: "WK-28",
    coach: "Vijay Deshmukh",
    cft: "Assembly CFT",
    stdStatusMF: "Pending",
    stdDate: "",
    effDaysStd: 0,
    responsibility: "Rajesh Patil",
    ppsrEndDate: "",
    effDaysClosePpsr: 0,
    prodQtyBefore: 3000,
    rejectedQtyBefore: 123,
    pctBefore: 4.1,
    prodQtyAfter: 3000,
    rejectedQtyAfter: 80,
    pctAfter: 2.6,
    effectivityText: "Drum heaters activated; viscosity stabilized at 310 Pa-s.",
    custDemandQtyMonth: 6000,
    custDemandQtyAnnum: 72000,
    qtyMonthBeforeRejPct: 246,
    qtyMonthAfterRejPct: 156,
    qtyMonthSavedRejPct: 90,
    perSetRejectionCost: 1500,
    costSavePerMonth: 135000,
    costSavePerAnnum: 1620000,
    remarks: "Permanent 30A circuit breaker being installed this week.",

    projectLeader: "Rajesh Patil",
    teamMembers: "Arjun Mehra, Sunita Rao, Devendra J.",
    plant: "Pune Assembly & Paint Complex",
    lineStation: "Assembly Glass Glazing Zone (ST-21)",
    productComponent: "Front Windshield Glass Assembly",
    amountDefects: "4.1% water leaks (Approx. 15 cabins per day)",
    discoveredOn: "2026-07-11",
    discoveredBy: "Rahul Sharma (Assembly Shift Manager)",
    repeatCase: "no",
    factsAnalysis: {
      whatIs: "Air pocket voids and bead gaps in polyurethane adhesive seam.",
      whatIsNot: "No issues with windshield glass dimensions, primer contamination, or glass cracks.",
      whereIs: "Windshield frame top right radius and bottom horizontal seams.",
      whereIsNot: "Rear glass or panoramic roof adhesive seals.",
      howIs: "More severe during early morning shift startups.",
      howIsNot: "Not observed during continuous hot run shifts in afternoon.",
      whenIs: "First surfaced on the morning shift of July 11th.",
      whenIsNot: "Not seen in prior dry run seasons."
    },
    containmentActionsList: [
      { no: 1, action: "Manual bead patching using handheld polyurethane extrusion guns on defect zones", responsible: "Devendra J.", date: "2026-07-11", status: "implemented" },
      { no: 2, action: "Redirect all completed cabs to the high-pressure shower booth for leak tests", responsible: "Rahul Sharma", date: "2026-07-11", status: "proven" }
    ],
    ishikawa: {
      man: ["Operator skipping the manual bubble check in dark lighting conditions", "Glazing specialist not verifying heater blanket status before startup"],
      machine: ["Deformed follower plate seal on high-viscosity adhesive pump", "Circuit breaker tripped under overload during high-viscosity cold starts"],
      material: ["High-viscosity polyurethane batch (viscosity exceeded 420 Pa-s)", "Moisture in primer adhesive cartridges causing bubbling"],
      methods: ["No pre-heating sequence defined in startup SOPs", "No automated bead thickness detection sensor at ST-21"],
      milieu: ["Cold shop drafts in morning cooling drum material below 18°C"],
      measurement: ["Standard vision sensor unable to detect voids hidden inside black adhesive beads"]
    },
    fiveWhysList: {
      column1: ["Air bubble voids appear in windshield sealant", "High-pressure drum pump sucked in air pocket", "Follower plate seal was buckled and deformed", "Follower plate was forced down on unheated, cold sealant", "Heater blanket was completely offline"],
      column2: ["Heater blanket system power failed during startup", "Circuit breaker tripped due to electrical overload", "Incorrect 15A fuse was fitted during the weekend shift maintenance", "Standard replacement part stockout on the shelf", "No inventory re-order alert triggered in ERP"],
      column3: ["Polyurethane sealant viscosity was too high", "Warehouse stored material below 15°C standard storage limit", "Warehouse heating ventilation fan failed", "HVAC maintenance grouped under general building facilities instead of manufacturing PM", "Facilities SLA lacks fast response guidelines for warehouse climate controllers"]
    },
    correctiveActionsList: [
      { no: 1, measure: "Replace polyurethane drum pump follower plate rubber seal assembly", responsible: "Rajesh Patil", deadline: "2026-07-13", status: "completed" },
      { no: 2, measure: "Install durable 30A circuit breaker with automated temperature sensors and MES status feedback", responsible: "Arjun Mehra", deadline: "2026-07-16", status: "in-progress" },
      { no: 3, measure: "Implement strict warehouse thermal monitoring standards with automated temperature alert system", responsible: "Sunita Rao", deadline: "2026-07-19", status: "planned" }
    ],
    effectivenessEvidence: "After replacing the pump seal and stabilizing drum heaters above 32°C, adhesive viscosity stabilized at 310 Pa-s. No air pocket gaps have been detected on the last 4 production shifts. Cabin shower leak testing shows zero leak-through failures.",
    effectivenessChartData: [
      { name: "Day 1 (Initial)", value: 4.1 },
      { name: "Day 2 (Contain)", value: 2.2 },
      { name: "Day 3 (Seal Swap)", value: 0.9 },
      { name: "Day 4 (Heaters On)", value: 0.1 },
      { name: "Day 5 (Current)", value: 0.0 }
    ],
    standardizationList: [
      { no: 1, measure: "Create 'Cold Weather Glue Pre-heating Procedure' in standard shop floor manual", responsible: "Rajesh Patil", date: "2026-07-14", status: "completed" },
      { no: 2, measure: "Register critical heater breaker specifications in active manufacturing catalog", responsible: "Arjun Mehra", date: "2026-07-15", status: "completed" }
    ],
    readAcrossList: [
      { no: 1, proposal: "Deploy digital temperature telemetry sensors on all glass-glazing drum heaters", responsible: "Arjun Mehra", deadline: "2026-08-10" },
      { no: 2, proposal: "Incorporate climate SLA standards into warehouse facilities maintenance logs", responsible: "Sunita Rao", deadline: "2026-08-15" }
    ],
    readAcrossExplanation: "Applicable directly to windshield and panoramic rear-glass automated adhesive extrusion cells.",
    completionSignatures: {
      projectLeader: "Rajesh Patil",
      steeringCommittee: "Rajesh Patil (Steering Committee Representative)",
      completedOn: ""
    }
  }
];

// Helper to generate a new sequential serial number
function getNextSerialNo(): string {
  const currentYear = new Date().getFullYear();
  const yearKaizens = kaizens.filter(k => k.srNo.startsWith(`KZ-${currentYear}`));
  const nextNum = yearKaizens.length + 1;
  const padded = String(nextNum).padStart(3, '0');
  return `KZ-${currentYear}-${padded}`;
}

const app = express();
const PORT = 3000;

// Reverse proxy /api/redflags to Django backend
const DJANGO_URL = process.env.DJANGO_URL || 'http://127.0.0.1:8000';
const djangoTarget = new URL(DJANGO_URL);

app.use('/api/redflags', (req, res) => {
  const options: http.RequestOptions = {
    hostname: djangoTarget.hostname,
    port: djangoTarget.port || (djangoTarget.protocol === 'https:' ? 443 : 80),
    path: req.originalUrl,
    method: req.method,
    headers: {
      ...req.headers,
      host: djangoTarget.host,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Django proxy error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        error: 'Bad Gateway: Could not reach Django Red Flag backend service.',
        details: err.message,
      });
    }
  });

  req.pipe(proxyReq);
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// API: Get all Kaizens
app.get("/api/kaizens", (req, res) => {
  res.json({ success: true, data: kaizens });
});

// API: Submit a new Kaizen
app.post("/api/kaizens", (req, res) => {
  try {
    const data = req.body;
    
    const newKaizen: Kaizen = {
      id: `kz-${Date.now()}`,
      srNo: data.srNo || getNextSerialNo(),
      month: data.month || new Date().toLocaleString('default', { month: 'long' }),
      suggestionDate: data.suggestionDate || new Date().toISOString().split('T')[0],
      title: data.title || "Untitled Improvement",
      problemBefore: data.problemBefore || "",
      counterMeasureAfter: data.counterMeasureAfter || "",
      area: data.area || "",
      minifactory: data.minifactory || "",
      location: data.location || "",
      machine: data.machine || "",
      closingTargetDate: data.closingTargetDate || "",
      implementedDate: data.implementedDate || "",
      costSave: Number(data.costSave) || 0,
      benefits: {
        p: !!data.benefits?.p,
        q: !!data.benefits?.q,
        c: !!data.benefits?.c,
        d: !!data.benefits?.d,
        s: !!data.benefits?.s,
        m: !!data.benefits?.m,
      },
      ideaBy: data.ideaBy || "Anonymous Operator",
      implementedBy: data.implementedBy || "",
      preparedBy: data.preparedBy || "",
      approvedBy: data.approvedBy || "",
      verifiedBy: data.verifiedBy || "",
      status: data.status || "Pending",
      classification: data.classification || "Pending",
      remark: data.remark || "",
      photoBefore: data.photoBefore || svgBeforeGeneric,
      photoAfter: data.photoAfter || svgAfterGeneric,
      result: data.result || "",
      createdAt: new Date().toISOString()
    };

    kaizens.unshift(newKaizen); // Insert at beginning of list so it appears as recent
    res.json({ success: true, data: newKaizen });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Update an existing Kaizen (including status updates and Committee reviews)
app.put("/api/kaizens/:id", (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const index = kaizens.findIndex(k => k.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: "Kaizen not found" });
  }

  // Support updating nested benefits safely
  const existing = kaizens[index];
  const updatedBenefits = updateData.benefits ? {
    p: updateData.benefits.p !== undefined ? !!updateData.benefits.p : existing.benefits.p,
    q: updateData.benefits.q !== undefined ? !!updateData.benefits.q : existing.benefits.q,
    c: updateData.benefits.c !== undefined ? !!updateData.benefits.c : existing.benefits.c,
    d: updateData.benefits.d !== undefined ? !!updateData.benefits.d : existing.benefits.d,
    s: updateData.benefits.s !== undefined ? !!updateData.benefits.s : existing.benefits.s,
    m: updateData.benefits.m !== undefined ? !!updateData.benefits.m : existing.benefits.m,
  } : existing.benefits;

  kaizens[index] = {
    ...existing,
    ...updateData,
    benefits: updatedBenefits,
    // Do not overwrite ID and serial number
    id: existing.id,
    srNo: existing.srNo
  };

  res.json({ success: true, data: kaizens[index] });
});

// API: Open Impact Points & Action Items
app.get("/api/impactactions", (req, res) => {
  res.json({ success: true, data: impactActions });
});

app.post("/api/impactactions", (req, res) => {
  try {
    const data = req.body;
    const newAction = {
      id: `ia-${Date.now()}`,
      kaizenSrNo: data.kaizenSrNo || "KZ-GENERAL",
      kaizenTitle: data.kaizenTitle || "General Shopfloor Action",
      department: data.department || "MF1",
      category: data.category || "Method",
      impactDescription: data.impactDescription || "",
      assignedOwner: data.assignedOwner || "Unassigned",
      targetDate: data.targetDate || new Date().toISOString().split('T')[0],
      status: data.status || "Open",
      actionTaken: data.actionTaken || "",
      closedDate: data.closedDate || "",
      verifiedBy: data.verifiedBy || "",
      createdAt: new Date().toISOString()
    };
    impactActions.unshift(newAction);
    res.json({ success: true, data: newAction });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/impactactions/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const idx = impactActions.findIndex(item => item.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Impact Action not found" });
    }
    impactActions[idx] = { ...impactActions[idx], ...updates };
    res.json({ success: true, data: impactActions[idx] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/impactactions/:id", (req, res) => {
  try {
    const { id } = req.params;
    impactActions = impactActions.filter(item => item.id !== id);
    res.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: AI-Assist Kaizen Analysis Endpoint using gemini-3.5-flash
app.post("/api/kaizens/ai-assist", async (req, res) => {
  try {
    const { title, problemBefore, counterMeasureAfter, area, minifactory } = req.body;

    if (!problemBefore && !counterMeasureAfter) {
      return res.status(400).json({
        success: false,
        error: "Please provide at least a problem description or countermeasure description to use AI Assist."
      });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are a professional industrial Kaizen and Lean Manufacturing analysis agent, specialized in the Indian manufacturing sector (e.g., MSME and automotive plants in Pune, Chennai, Gurgaon, or Hosur).
Analyze the user's logged draft improvement details and return a structured JSON response containing:
1. "refinedTitle": A highly polished, short, professional technical title for the Kaizen sheet.
2. "p_reason", "q_reason", "c_reason", "d_reason", "s_reason", "m_reason": Short explanations of how Productivity, Quality, Cost, Delivery, Safety, and Morale are affected (or null if not affected).
3. "benefits": An object of booleans {p: boolean, q: boolean, c: boolean, d: boolean, s: boolean, m: boolean} indicating which elements are positively affected.
4. "estimatedAnnualCostSavings": An estimated annualized cost saving in Indian Rupees (INR) (number, e.g., 75000) based on realistic Indian manufacturing logic. If it is purely safety/morale with no clear direct cost calculation, estimate 0 but write a strong justification.
5. "savingsJustification": A short, scannable, logical one-sentence explanation of how the INR cost savings estimation was calculated (e.g., 'Saves 15 mins/day of line operator idle time at a standard ₹180/hr labor rate').
6. "suggestedResultSummary": A professional draft summarizing the expected results of the implementation.

Return strictly raw JSON format matching this schema without any markdown wrapper (no backticks).`;

    const userPrompt = `Draft Improvement Details:
- Input Title: ${title || "Not specified"}
- Problem/Before Status: ${problemBefore || "Not specified"}
- Counter Measure/After Improvement: ${counterMeasureAfter || "Not specified"}
- Area: ${area || "Not specified"}
- Minifactory: ${minifactory || "Not specified"}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refinedTitle: { type: Type.STRING },
            benefits: {
              type: Type.OBJECT,
              properties: {
                p: { type: Type.BOOLEAN },
                q: { type: Type.BOOLEAN },
                c: { type: Type.BOOLEAN },
                d: { type: Type.BOOLEAN },
                s: { type: Type.BOOLEAN },
                m: { type: Type.BOOLEAN }
              },
              required: ["p", "q", "c", "d", "s", "m"]
            },
            p_reason: { type: Type.STRING },
            q_reason: { type: Type.STRING },
            c_reason: { type: Type.STRING },
            d_reason: { type: Type.STRING },
            s_reason: { type: Type.STRING },
            m_reason: { type: Type.STRING },
            estimatedAnnualCostSavings: { type: Type.INTEGER },
            savingsJustification: { type: Type.STRING },
            suggestedResultSummary: { type: Type.STRING }
          },
          required: ["refinedTitle", "benefits", "estimatedAnnualCostSavings", "savingsJustification", "suggestedResultSummary"]
        }
      }
    });

    const aiText = response.text || "{}";
    const resultObj = JSON.parse(aiText.trim());

    res.json({
      success: true,
      data: resultObj
    });
  } catch (error: any) {
    console.error("AI Assist error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: AI Auto-Generate PSQ Elimination Strategy Tree
app.post("/api/ppsr/ai-psq", async (req, res) => {
  try {
    const { title, problemDescription, area, line, station, partName, partNo, rejectionRate, scrapCost } = req.body;

    if (!title && !problemDescription) {
      return res.status(400).json({
        success: false,
        error: "Please provide problem title or description to generate PSQ Tree."
      });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are a world-class automotive quality & reliability engineering expert specializing in the PSQ (Problem Solving Questions / Progressive Sifting Questionnaire) Cause Localization and Elimination Strategy Tree methodology (such as used in Bosch, Toyota, and tier-1 automotive manufacturing).

Analyze the manufacturing problem context and construct a high-precision, hierarchical Elimination Strategy Tree.
The PSQ tree must logically funnel down from high-level categories to isolate the specific "Big X" (Root Cause).

Funnel Structure:
- Level 0: Problem Statement Definition ("Find and control the Big X for [Target NOK] found at [Station/Line] to reduce FTQ rejection [Rate]% & [Cost] € estimated.")
- Level 1 (Nature of Problem): Categories such as Feature (CAD geometry), Property (material/metallurgy), Defect (visual/surface flaws), and Event (dynamic testing/assembly failure). Eliminate the non-applicable ones with a clear technical reason, and keep the active one open.
- Level 2 (Failure Mode): Drilldown into the active category (e.g. Malfunction vs Destructive vs Leakage).
- Level 3 (Location / Process Station): Isolate the specific station/jig/tooling where the defect is generated vs others.
- Level 4 (Product / Component Variant): Isolate the affected part number, model variant, or sub-assembly.
- Level 5 (Specific Parameter / Critical Mechanism): Isolate competing hypotheses and identify the exact "target" (Big X Root Cause) with realistic measured deviation vs eliminated ones.

Return strictly raw JSON format matching this schema:
{
  "projectStatement": "string",
  "bigXTarget": "string",
  "ftqRejectionRate": "string",
  "estimatedCost": "string",
  "rootNodes": [
    {
      "id": "string",
      "title": "string",
      "label": "string",
      "status": "active" | "eliminated" | "target",
      "explanation": "string",
      "children": [ ...recursive nodes ]
    }
  ]
}`;

    const userPrompt = `Manufacturing Defect Context:
- Problem Title: ${title || "Component Defect"}
- Problem Description: ${problemDescription || "Quality non-conformity detected on production line"}
- Area / Plant: ${area || "Manufacturing Plant"}
- Line: ${line || "Assembly Line"}
- Station: ${station || "Inspection / Assembly Station"}
- Part Name / No: ${partName || "Automotive Component"} (${partNo || "N/A"})
- Rejection Rate: ${rejectionRate || "2.5%"}
- Scrap / Rework Cost: ${scrapCost || "1800 €"}

Generate a complete, technically authentic PSQ Elimination Tree structure tailored specifically to this problem. Do not use generic placeholders.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const aiText = response.text || "{}";
    const resultObj = JSON.parse(aiText.trim());

    res.json({
      success: true,
      data: resultObj
    });
  } catch (error: any) {
    console.error("AI PSQ generation error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Red Flags routes proxied to Django backend



// API: 5S Audits CRUD
app.get("/api/fivesaudits", (req, res) => {
  res.json({ success: true, data: fiveSAudits });
});

app.post("/api/fivesaudits", (req, res) => {
  try {
    const data = req.body;
    const scores = [
      Number(data.sortScore) || 0,
      Number(data.setInOrderScore) || 0,
      Number(data.shineScore) || 0,
      Number(data.standardizeScore) || 0,
      Number(data.sustainScore) || 0
    ];
    // If checklist was provided, we can compute exact weighted percentage
    let avgScore = 0;
    if (data.checklist && Array.isArray(data.checklist) && data.checklist.length > 0) {
      const sumChecklist = data.checklist.reduce((acc: number, item: any) => acc + (Number(item.score) || 0), 0);
      avgScore = Math.round((sumChecklist / (data.checklist.length * 5)) * 100);
    } else {
      avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / 25) * 100);
    }

    let status: 'Excellent' | 'Good' | 'Needs Improvement' = 'Needs Improvement';
    let grade: 'A+' | 'A' | 'B' | 'C' = 'C';
    if (avgScore >= 90) {
      status = 'Excellent';
      grade = 'A+';
    } else if (avgScore >= 80) {
      status = 'Excellent';
      grade = 'A';
    } else if (avgScore >= 65) {
      status = 'Good';
      grade = 'B';
    } else {
      status = 'Needs Improvement';
      grade = 'C';
    }

    const newAudit = {
      id: `fs-${Date.now()}`,
      auditDate: data.auditDate || new Date().toISOString().split('T')[0],
      area: data.area || "Assembly Line A (Pune)",
      plantZone: data.plantZone || "Plant 1 - Production",
      auditor: data.auditor || "QC Lead",
      shift: data.shift || "Shift 1",
      auditType: data.auditType || "Weekly Area Audit",
      sortScore: Number(data.sortScore) || 4,
      setInOrderScore: Number(data.setInOrderScore) || 4,
      shineScore: Number(data.shineScore) || 4,
      standardizeScore: Number(data.standardizeScore) || 4,
      sustainScore: Number(data.sustainScore) || 4,
      totalScore: avgScore,
      grade: data.grade || grade,
      remarks: data.remarks || "",
      status: status,
      checklist: data.checklist || generate5SChecklist({
        s1: [Number(data.sortScore) || 4, Number(data.sortScore) || 4, Number(data.sortScore) || 4, Number(data.sortScore) || 4, Number(data.sortScore) || 4],
        s2: [Number(data.setInOrderScore) || 4, Number(data.setInOrderScore) || 4, Number(data.setInOrderScore) || 4, Number(data.setInOrderScore) || 4, Number(data.setInOrderScore) || 4],
        s3: [Number(data.shineScore) || 4, Number(data.shineScore) || 4, Number(data.shineScore) || 4, Number(data.shineScore) || 4, Number(data.shineScore) || 4],
        s4: [Number(data.standardizeScore) || 4, Number(data.standardizeScore) || 4, Number(data.standardizeScore) || 4, Number(data.standardizeScore) || 4, Number(data.standardizeScore) || 4],
        s5: [Number(data.sustainScore) || 4, Number(data.sustainScore) || 4, Number(data.sustainScore) || 4, Number(data.sustainScore) || 4, Number(data.sustainScore) || 4]
      }),
      strengths: data.strengths || ["Team demonstrated good discipline and visual adherence."],
      opportunities: data.opportunities || ["Continue addressing hard-to-reach dust areas."],
      actionItems: data.actionItems || [],
      photoBefore: data.photoBefore || svg5sShadowBoard,
      photoAfter: data.photoAfter || svg5sCleanInspect,
      createdAt: new Date().toISOString()
    };
    fiveSAudits.unshift(newAudit);
    res.json({ success: true, data: newAudit });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/fivesaudits/:id", (req, res) => {
  const index = fiveSAudits.findIndex(a => a.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: "Audit not found" });
  fiveSAudits[index] = { ...fiveSAudits[index], ...req.body };
  res.json({ success: true, data: fiveSAudits[index] });
});

app.delete("/api/fivesaudits/:id", (req, res) => {
  const index = fiveSAudits.findIndex(a => a.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: "Audit not found" });
  const deleted = fiveSAudits.splice(index, 1);
  res.json({ success: true, data: deleted[0] });
});

// API: 5S Red Tags CRUD (1S Seiri Holding Area)
app.get("/api/fives/redtags", (req, res) => {
  res.json({ success: true, data: fiveSRedTags });
});

app.post("/api/fives/redtags", (req, res) => {
  try {
    const data = req.body;
    const tagCount = fiveSRedTags.length + 1;
    const newTag = {
      id: `rt-${Date.now()}`,
      tagNo: data.tagNo || `RT-2026-${String(tagCount).padStart(3, '0')}`,
      dateTagged: data.dateTagged || new Date().toISOString().split('T')[0],
      taggedBy: data.taggedBy || "5S Champion",
      itemDescription: data.itemDescription || "Unidentified Equipment / Material",
      category: data.category || "Tool / Jig / Fixture",
      quantity: data.quantity || "1 pc",
      areaFound: data.areaFound || "Shopfloor Gangway",
      reason: data.reason || "Surplus / Excess Stock",
      estimatedValueInr: Number(data.estimatedValueInr) || 0,
      actionRecommended: data.actionRecommended || "Relocate to Red Tag Area",
      dispositionDeadline: data.dispositionDeadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      dispositionApprovedBy: data.dispositionApprovedBy || "",
      disposedDate: data.disposedDate || "",
      dispositionNotes: data.dispositionNotes || "",
      status: data.status || "Tagged",
      photoUrl: data.photoUrl || svg5sRedTagItem,
      createdAt: new Date().toISOString()
    };
    fiveSRedTags.unshift(newTag);
    res.json({ success: true, data: newTag });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/fives/redtags/:id", (req, res) => {
  const index = fiveSRedTags.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: "Red Tag not found" });
  fiveSRedTags[index] = { ...fiveSRedTags[index], ...req.body };
  res.json({ success: true, data: fiveSRedTags[index] });
});

app.delete("/api/fives/redtags/:id", (req, res) => {
  const index = fiveSRedTags.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: "Red Tag not found" });
  const deleted = fiveSRedTags.splice(index, 1);
  res.json({ success: true, data: deleted[0] });
});

// API: 5S CAPA Actions CRUD
app.get("/api/fives/actions", (req, res) => {
  res.json({ success: true, data: fiveSActions });
});

app.post("/api/fives/actions", (req, res) => {
  try {
    const data = req.body;
    const newAction = {
      id: `act-${Date.now()}`,
      auditId: data.auditId || "",
      pillar: data.pillar || "1S",
      findingDescription: data.findingDescription || "",
      rootCause: data.rootCause || "",
      correctiveAction: data.correctiveAction || "",
      area: data.area || "Shopfloor",
      assignedTo: data.assignedTo || "Area Leader",
      targetDate: data.targetDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      completedDate: data.completedDate || "",
      status: data.status || "Open",
      priority: data.priority || "High",
      photoBefore: data.photoBefore || svg5sRedTagItem,
      photoAfter: data.photoAfter || "",
      linkedKaizenId: data.linkedKaizenId || "",
      createdAt: new Date().toISOString()
    };
    fiveSActions.unshift(newAction);
    res.json({ success: true, data: newAction });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/fives/actions/:id", (req, res) => {
  const index = fiveSActions.findIndex(a => a.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: "Action item not found" });
  fiveSActions[index] = { ...fiveSActions[index], ...req.body };
  res.json({ success: true, data: fiveSActions[index] });
});

app.delete("/api/fives/actions/:id", (req, res) => {
  const index = fiveSActions.findIndex(a => a.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: "Action item not found" });
  const deleted = fiveSActions.splice(index, 1);
  res.json({ success: true, data: deleted[0] });
});

// API: 5S SOC Logs CRUD (Source of Contamination)
app.get("/api/fives/soc", (req, res) => {
  res.json({ success: true, data: fiveSSocLogs });
});

app.post("/api/fives/soc", (req, res) => {
  try {
    const data = req.body;
    const newSoc = {
      id: `soc-${Date.now()}`,
      dateFound: data.dateFound || new Date().toISOString().split('T')[0],
      machineOrArea: data.machineOrArea || "",
      contaminantType: data.contaminantType || "Oil Leak / Drip",
      sourceDescription: data.sourceDescription || "",
      countermeasurePlanned: data.countermeasurePlanned || "",
      owner: data.owner || "Maintenance Lead",
      targetDate: data.targetDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: data.status || "Open",
      photoUrl: data.photoUrl || svg5sCleanInspect,
      createdAt: new Date().toISOString()
    };
    fiveSSocLogs.unshift(newSoc);
    res.json({ success: true, data: newSoc });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/fives/soc/:id", (req, res) => {
  const index = fiveSSocLogs.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: "SOC item not found" });
  fiveSSocLogs[index] = { ...fiveSSocLogs[index], ...req.body };
  res.json({ success: true, data: fiveSSocLogs[index] });
});

app.delete("/api/fives/soc/:id", (req, res) => {
  const index = fiveSSocLogs.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: "SOC item not found" });
  const deleted = fiveSSocLogs.splice(index, 1);
  res.json({ success: true, data: deleted[0] });
});

// API: Safety Incidents CRUD
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

// API: PPSR Reports CRUD
app.get("/api/ppsrreports", (req, res) => {
  res.json({ success: true, data: ppsrReports });
});

app.post("/api/ppsrreports", (req, res) => {
  try {
    const data = req.body;
    const count = ppsrReports.length + 1;
    const formattedCount = String(count).padStart(3, '0');
    
    const newPpsr = {
      ppsrNo: data.ppsrNo || `PPSR-${new Date().getFullYear()}-${formattedCount}`,
      title: data.title || "Untitled Problem",
      problemStatement: data.problemStatement || "",
      rootCauseAnalysis: data.rootCauseAnalysis || "",
      containmentAction: data.containmentAction || "",
      permanentCorrectiveAction: data.permanentCorrectiveAction || "",
      validationCheck: data.validationCheck || "",
      status: data.status || "Open",
      targetDate: data.targetDate || "",
      leadOwner: data.leadOwner || "",
      ...data,
      id: data.id || `pp-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    ppsrReports.unshift(newPpsr);
    res.json({ success: true, data: newPpsr });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/ppsrreports/:id", (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const index = ppsrReports.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: "PPSR not found" });
  }
  ppsrReports[index] = {
    ...ppsrReports[index],
    ...updateData,
    id: ppsrReports[index].id
  };
  res.json({ success: true, data: ppsrReports[index] });
});

// In-memory data store for PPSR Review Meetings
let ppsrMeetings: any[] = [
  {
    id: "mtg-1",
    meetingDate: "2026-07-15",
    chairperson: "Amit Mehta (Kaizen & Quality Head)",
    attendees: "Sunita Rao, Arjun Mehra, Rajesh Patil, Vijay Deshmukh",
    keyDiscussionPoints: "Reviewed open bumper alignment PPSR-2026-001 (now successfully verified and closed with zero defects) and weld spatter PPSR-2026-002 (under active manual offline containment; corrective action nozzle cleaning is scheduled). Urged CFT to close all pending items by next Monday.",
    discussedPpsrIds: ["ppsr-1", "ppsr-2"],
    nextReviewDate: "2026-07-22",
    createdAt: "2026-07-15T10:00:00.000Z"
  }
];

// API: Meetings CRUD
app.get("/api/ppsrmeetings", (req, res) => {
  res.json({ success: true, data: ppsrMeetings });
});

app.post("/api/ppsrmeetings", (req, res) => {
  try {
    const data = req.body;
    const newMtg = {
      id: `mtg-${Date.now()}`,
      meetingDate: data.meetingDate || new Date().toISOString().split('T')[0],
      chairperson: data.chairperson || "Quality Head",
      attendees: data.attendees || "",
      keyDiscussionPoints: data.keyDiscussionPoints || "",
      discussedPpsrIds: data.discussedPpsrIds || [],
      nextReviewDate: data.nextReviewDate || "",
      createdAt: new Date().toISOString()
    };
    ppsrMeetings.unshift(newMtg);
    res.json({ success: true, data: newMtg });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
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
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
