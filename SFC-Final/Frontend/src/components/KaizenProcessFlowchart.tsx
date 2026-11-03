import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  HelpCircle, 
  FileText, 
  Database, 
  Wrench, 
  Award, 
  Printer, 
  Download, 
  RotateCcw, 
  Users, 
  Target, 
  Sparkles, 
  ArrowDown, 
  ShieldCheck,
  XCircle,
  Info,
  Flame,
  Code,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { downloadElementAsPdf, triggerA4Print, triggerA3Print } from '../utils/pdfExporter';

export interface FlowchartNode {
  id: string;
  type: 'terminal' | 'process' | 'decision' | 'document' | 'database' | 'impact';
  nodeCode: string; // Mermaid ID like A, B, C
  stepNumber?: string;
  title: string;
  subtitle: string;
  role: string;
  roleBg: string;
  description: string;
  keyInputs: string[];
  keyOutputs: string[];
  yesTarget?: string;
  noTarget?: string;
  yesLabel?: string;
  noLabel?: string;
  isImpactPoint?: boolean;
}

export const FLOWCHART_NODES: FlowchartNode[] = [
  {
    id: 'start',
    nodeCode: 'Start',
    type: 'terminal',
    title: 'START: Idea Identification & Gemba Walk',
    subtitle: 'Shopfloor Workstation Inspection',
    role: 'Shopfloor Operator / Technician',
    roleBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Shopfloor employee identifies an operational bottleneck, safety hazard, quality defect, or waste (Muda) at their workstation.',
    keyInputs: ['Observed Waste or Defect', 'Before Photos', 'PQCDSM Tagging'],
    keyOutputs: ['Identified Kaizen Idea']
  },
  {
    id: 'process-1',
    nodeCode: 'Step1',
    type: 'process',
    stepNumber: 'STEP 1',
    title: '1. Log Kaizen Idea & Draft Sheet',
    subtitle: 'Digitize on Shopfloor Portal',
    role: 'Operator / Kaizen Initiator',
    roleBg: 'bg-sky-100 text-sky-800 border-sky-300',
    description: 'Log initial problem statement, 5-Why root cause analysis, and assigned Minifactory tag into the digital system.',
    keyInputs: ['5-Why Root Cause', 'Minifactory Tag', 'Problem Statement'],
    keyOutputs: ['Draft Kaizen Record (KZ-2026-XXX)']
  },
  {
    id: 'doc-1',
    nodeCode: 'Doc1',
    type: 'document',
    title: '📄 Document: A4/A3 Kaizen Sheet',
    subtitle: 'Digital Artifact Generated',
    role: 'System Document',
    roleBg: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Official A4/A3 standardized printable Kaizen sheet generated with Before/After photos and cost impact.',
    keyInputs: ['System Form Data'],
    keyOutputs: ['Printable Kaizen Sheet']
  },
  {
    id: 'process-2',
    nodeCode: 'Step2',
    type: 'process',
    stepNumber: 'STEP 2',
    title: '2. Execute Physical Countermeasure',
    subtitle: 'Direct Shopfloor Implementation',
    role: 'Initiator & Maintenance Team',
    roleBg: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Fabricate low-cost jig, install poka-yoke guide, re-arrange 5S layout, or tweak machine parameters.',
    keyInputs: ['Maintenance Tooling Support', 'In-house Materials'],
    keyOutputs: ['Implemented Physical Kaizen', 'After Implementation Photo']
  },
  {
    id: 'decision-1',
    nodeCode: 'Dec1',
    type: 'decision',
    title: 'Is Improvement Physically Verified & Safe?',
    subtitle: 'Line Leader Supervisor Checkpoint',
    role: 'Line Supervisor',
    roleBg: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Supervisor physically inspects the workstation to ensure safety compliance, operational validity, and zero quality risk.',
    keyInputs: ['Implemented Kaizen', 'Workstation Visit'],
    keyOutputs: ['Supervisor Physical Sign-off'],
    yesLabel: 'YES: Verified & Safe',
    noLabel: 'NO: Refine Action',
    yesTarget: 'db-register',
    noTarget: 'process-2'
  },
  {
    id: 'db-register',
    nodeCode: 'DB',
    type: 'database',
    title: '🗄️ Database: Kaizen Master Register DB',
    subtitle: 'Central Storage System',
    role: 'Master Database Register',
    roleBg: 'bg-slate-100 text-slate-800 border-slate-300',
    description: 'Kaizen record is indexed in the master database and flagged for monthly Cross-Functional Team (CFT) board review.',
    keyInputs: ['Verified Kaizen Record'],
    keyOutputs: ['Indexed in CFT Master Register Board']
  },
  {
    id: 'process-3',
    nodeCode: 'Step3',
    type: 'process',
    stepNumber: 'STEP 3',
    title: '3. CFT Committee Review & Star Scoring',
    subtitle: 'Monthly Cross-Functional Evaluation',
    role: 'CFT Committee Board',
    roleBg: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'CFT members (Quality, Production, Maintenance) evaluate the Kaizen on 1-5 star criteria and audit cost savings.',
    keyInputs: ['Master Board Record', 'Cost Audit Verification'],
    keyOutputs: ['Cumulative CFT Score (1-25 Stars)']
  },
  {
    id: 'decision-2',
    nodeCode: 'Dec2',
    type: 'decision',
    title: 'CFT Score Approved & Savings Audited?',
    subtitle: 'Committee Threshold Gate (> 15 Stars)',
    role: 'Committee Board Lead',
    roleBg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    description: 'Check if total score meets minimum threshold (>15 Stars) and savings are verified for official approval.',
    keyInputs: ['CFT Committee Evaluation'],
    keyOutputs: ['Status Classification'],
    yesLabel: 'YES: Approved',
    noLabel: 'NO: Rejected / Feedback',
    yesTarget: 'process-impact',
    noTarget: 'end-reject'
  },
  {
    id: 'process-impact',
    nodeCode: 'Impact',
    type: 'impact',
    stepNumber: 'STEP 4',
    isImpactPoint: true,
    title: '4. 💥 5M & Process Impact Assessment',
    subtitle: 'Process Safety, PFD & PFMEA Audit',
    role: 'CFT Lead & Quality/Safety Specialist',
    roleBg: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    description: 'Perform mandatory 5M (Man, Machine, Material, Method, Measurement) change verification, Safety EHS risk check, Process Flow Diagram (PFD) revision, and PFMEA failure mode RPN score update.',
    keyInputs: ['CFT Approved Kaizen', '5M / Safety / PFD / PFMEA Audit Check'],
    keyOutputs: ['Completed 5M Process Impact Assessment Sheet', 'PFMEA & Safety SOP Sign-off']
  },
  {
    id: 'doc-impact',
    nodeCode: 'DocImpact',
    type: 'document',
    title: '📄 Document: 5M Impact Sign-Off Sheet',
    subtitle: 'Mandatory Compliance Record',
    role: 'Quality & EHS Compliance',
    roleBg: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Single-sheet formal document containing 5M, Safety, PFD, and PFMEA signed evidence and resource allocations.',
    keyInputs: ['5M Assessment Data'],
    keyOutputs: ['Signed Process Impact Document']
  },
  {
    id: 'process-4',
    nodeCode: 'Step4',
    type: 'process',
    stepNumber: 'STEP 5',
    title: '5. Horizontal Deployment & Standardization',
    subtitle: 'Replication Across Sister Plant Lines',
    role: 'Quality Engineering & Process Lead',
    roleBg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    description: 'Replicate proven Kaizen to sister machines/lines. Update Standard Operating Procedures (SOP), Work Instructions (WI), and PM logs.',
    keyInputs: ['Approved Kaizen Standard', 'Sister Machine Matrix'],
    keyOutputs: ['Standardized Operating Procedure (SOP)']
  },
  {
    id: 'process-5',
    nodeCode: 'Step5',
    type: 'process',
    stepNumber: 'STEP 6',
    title: '6. Monthly Best Kaizen Award Recognition',
    subtitle: 'Plant Head & Management Award',
    role: 'Plant Management & Operations Head',
    roleBg: 'bg-amber-100 text-amber-900 border-amber-300',
    description: 'Top-scoring Kaizens in each Minifactory earn Monthly Best Awards, Certificate of Excellence, and monetary incentives.',
    keyInputs: ['Final Winner Ranking'],
    keyOutputs: ['Printed Excellence Certificate', 'Reward Handover', 'Wall of Fame Post']
  },
  {
    id: 'end-success',
    nodeCode: 'EndSuccess',
    type: 'terminal',
    title: 'END: Standardized Lean Culture Sustained',
    subtitle: 'Continuous Improvement Cycle Complete',
    role: 'Plant Operations Culture',
    roleBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'The improvement is locked into daily operations as standard practice.',
    keyInputs: ['Standardized Process'],
    keyOutputs: ['Sustained Lean Culture']
  },
  {
    id: 'end-reject',
    nodeCode: 'EndReject',
    type: 'terminal',
    title: 'END (Rejected): Feedback Logged',
    subtitle: 'Return to Initiator with Guidance',
    role: 'Committee Feedback',
    roleBg: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'Kaizen is closed with explanatory feedback to help the initiator improve future submissions.',
    keyInputs: ['Committee Feedback Note'],
    keyOutputs: ['Closed with Explanation']
  }
];

export const MERMAID_DIAGRAM_CODE = `graph TD
    Start([🚀 START: Idea Identification & Gemba Walk]) --> Step1[1. Log Kaizen Idea & Draft Sheet]
    Step1 -.-> Doc1[/📄 Document: Kaizen Sheet KZ-2026/]
    Step1 --> Step2[2. Execute Physical Countermeasure]
    Step2 --> Dec1{Is Improvement Verified & Safe?}
    Dec1 -- ❌ NO: Refine Action --> Step2
    Dec1 -- ✅ YES: Verified --> DB[(🗄️ Database: Kaizen Master Register)]
    DB --> Step3[3. CFT Committee Review & Star Scoring]
    Step3 --> Dec2{CFT Score Approved >15 Stars?}
    Dec2 -- ❌ NO: Rejected --> EndReject([⛔ END: Closed with Feedback])
    Dec2 -- ✅ YES: Approved --> Impact[💥 4. 5M & Process Impact Assessment]
    Impact -.-> DocImpact[/📄 Document: 5M Impact Sign-Off Sheet/]
    Impact --> Step4[5. Horizontal Deployment & Standardization]
    Step4 --> Step5[6. Monthly Best Kaizen Award Recognition]
    Step5 --> EndSuccess([🏆 END: Standardized Lean Culture Sustained])
    
    style Impact fill:#fff1f2,stroke:#f43f5e,stroke-width:3px,color:#881337
    style Start fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#064e3b
    style EndSuccess fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#064e3b
    style Dec1 fill:#faf5ff,stroke:#a855f7,stroke-width:2px,color:#581c87
    style Dec2 fill:#eef2ff,stroke:#6366f1,stroke-width:2px,color:#312e81`;

export default function KaizenProcessFlowchart() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('process-impact');
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [copiedCode, setCopiedCode] = useState(false);

  const selectedNode = FLOWCHART_NODES.find(n => n.id === selectedNodeId) || FLOWCHART_NODES[0];

  const handleDownloadPdf = async () => {
    setIsPdfExporting(true);
    await downloadElementAsPdf('kaizen-flowchart-canvas', {
      filename: 'Kaizen_Standard_Mermaid_Flowchart.pdf',
      orientation: 'landscape',
      format: 'a4'
    });
    setIsPdfExporting(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(MERMAID_DIAGRAM_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* HEADER BAR */}
      <div className="bg-slate-950 text-white border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-black uppercase text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                MERMAID DIAGRAM ARCHITECTURE
              </span>
              <span className="text-[10px] font-mono font-black uppercase text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                INCLUDES 5M IMPACT POINT
              </span>
            </div>
            <h1 className="text-2xl font-black font-display text-white mt-0.5">
              Standard Kaizen Process Flowchart
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Professional Mermaid-style workflow mapping from Idea Generation to 5M Impact Assessment, Standardization, and Awards.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0 flex-wrap">
          {/* TAB SWITCHER */}
          <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'visual'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Visual Diagram</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'code'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Mermaid Source</span>
            </button>
          </div>

          <button
            type="button"
            disabled={isPdfExporting}
            onClick={handleDownloadPdf}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono font-black text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer border border-emerald-400"
          >
            <Download className="w-4 h-4" />
            <span>{isPdfExporting ? 'Generating A4 PDF...' : 'Download A4 PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() => triggerA4Print('kaizen-flowchart-canvas', 'Kaizen End-to-End Standard Flowchart')}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-black text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer border border-amber-300"
          >
            <Printer className="w-4 h-4" />
            <span>Print A4</span>
          </button>
        </div>
      </div>

      {/* SYMBOL LEGEND BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs font-mono text-xs flex flex-wrap items-center justify-between gap-3">
        <span className="font-black text-slate-900 uppercase flex items-center space-x-1.5">
          <Info className="w-4 h-4 text-indigo-600" />
          <span>Mermaid Diagram Shape Key:</span>
        </span>
        
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          {/* Terminal / Oval */}
          <div className="flex items-center space-x-1.5">
            <div className="px-2 py-0.5 rounded-full bg-emerald-100 border-2 border-emerald-500 text-[9px] font-black text-emerald-800">
              Start / End
            </div>
            <span className="text-slate-600 font-semibold">Terminal</span>
          </div>

          {/* Process Rectangle */}
          <div className="flex items-center space-x-1.5">
            <div className="px-2 py-0.5 bg-sky-100 border-2 border-sky-500 rounded text-[9px] font-black text-sky-800">
              Process
            </div>
            <span className="text-slate-600 font-semibold">Action Step</span>
          </div>

          {/* Decision Diamond */}
          <div className="flex items-center space-x-1.5">
            <div className="px-2 py-0.5 bg-purple-100 border-2 border-purple-500 rounded text-[9px] font-black text-purple-800">
              &#123; Decision &#125;
            </div>
            <span className="text-slate-600 font-semibold">Gate Check</span>
          </div>

          {/* Impact Point */}
          <div className="flex items-center space-x-1.5">
            <div className="px-2 py-0.5 bg-rose-100 border-2 border-rose-500 rounded text-[9px] font-black text-rose-800 flex items-center space-x-0.5">
              <Flame className="w-2.5 h-2.5 text-rose-600" />
              <span>5M Impact</span>
            </div>
            <span className="text-slate-800 font-black">Process Impact Point</span>
          </div>

          {/* Document */}
          <div className="flex items-center space-x-1.5">
            <div className="px-2 py-0.5 bg-amber-100 border-2 border-amber-500 rounded-tr-md text-[9px] font-black text-amber-800">
              Document
            </div>
            <span className="text-slate-600 font-semibold">Sheet Output</span>
          </div>

          {/* Database */}
          <div className="flex items-center space-x-1.5">
            <div className="px-2 py-0.5 bg-slate-100 border-2 border-slate-600 rounded text-[9px] font-black text-slate-800">
              [( Database )]
            </div>
            <span className="text-slate-600 font-semibold">Master DB</span>
          </div>
        </div>
      </div>

      {activeTab === 'code' ? (
        /* MERMAID CODE VIEW */
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-white font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Code className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                Native Mermaid.js Flowchart Source Code (.mmd)
              </h3>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Mermaid Code'}</span>
            </button>
          </div>

          <pre className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-xs text-amber-200 overflow-x-auto leading-relaxed">
            {MERMAID_DIAGRAM_CODE}
          </pre>
        </div>
      ) : (
        /* VISUAL MERMAID-STYLE FLOWCHART CANVAS */
        <div 
          id="kaizen-flowchart-canvas" 
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-8 text-white"
        >
          {/* FLOWCHART TITLE BANNER FOR PRINT */}
          <div className="hidden print:block border-b-2 border-slate-700 pb-4 mb-4">
            <h2 className="text-xl font-black font-display text-white">SHOPFLOOR MS — KAIZEN PROCESS FLOWCHART</h2>
            <p className="text-xs text-slate-300 font-mono">Standard Operating Procedure mapping including 5M Process Impact Assessment.</p>
          </div>

          <div className="flex flex-col items-center space-y-5 max-w-3xl mx-auto py-2">
            
            {/* 1. START TERMINAL */}
            <div 
              onClick={() => setSelectedNodeId('start')}
              className={`w-full max-w-md p-4 rounded-3xl border-2 shadow-lg cursor-pointer transition-all flex items-center justify-between ${
                selectedNodeId === 'start'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-200 ring-4 ring-emerald-500/30 scale-102'
                  : 'bg-slate-800/90 text-emerald-300 border-emerald-500/60 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-950 text-emerald-300 rounded-2xl border border-emerald-500/40">
                  <Play className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider block opacity-80">
                    ([ TERMINAL SYMBOL ])
                  </span>
                  <h3 className="text-sm font-black font-display">START: Idea Identification & Gemba Walk</h3>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-emerald-950/60 px-2.5 py-1 rounded-xl text-emerald-200 border border-emerald-500/30">
                Operator
              </span>
            </div>

            {/* Directional Connector Arrow */}
            <div className="flex flex-col items-center -my-2">
              <div className="w-0.5 h-6 bg-slate-600" />
              <ArrowDown className="w-4 h-4 text-slate-400 -mt-1" />
            </div>

            {/* 2. STEP 1: LOG KAIZEN */}
            <div className="w-full max-w-md relative">
              <div 
                onClick={() => setSelectedNodeId('process-1')}
                className={`p-4 rounded-2xl border-2 shadow-lg cursor-pointer transition-all flex items-center justify-between ${
                  selectedNodeId === 'process-1'
                    ? 'bg-sky-600 text-white border-sky-200 ring-4 ring-sky-500/30 scale-102'
                    : 'bg-slate-800/90 text-slate-100 border-sky-500/50 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono font-black bg-sky-950 text-sky-300 px-2 py-1 rounded-lg border border-sky-500/40 shrink-0">
                    STEP 1
                  </span>
                  <div>
                    <h3 className="text-sm font-black font-display">1. Log Kaizen Idea & Draft Sheet</h3>
                    <p className="text-[11px] font-mono text-slate-300">Shopfloor Portal Input</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-sky-300">Initiator</span>
              </div>

              {/* Side Document Branch */}
              <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 hidden md:flex items-center space-x-2">
                <div className="w-8 h-0.5 bg-amber-500/60 border-t border-dashed border-amber-400" />
                <div 
                  onClick={() => setSelectedNodeId('doc-1')}
                  className={`px-3 py-2 rounded-xl border cursor-pointer text-xs font-mono font-bold flex items-center space-x-2 shadow-md shrink-0 ${
                    selectedNodeId === 'doc-1'
                      ? 'bg-amber-400 text-slate-950 border-amber-200'
                      : 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                  }`}
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>📄 [/ Kaizen Sheet Draft /]</span>
                </div>
              </div>
            </div>

            {/* Directional Connector Arrow */}
            <div className="flex flex-col items-center -my-2">
              <div className="w-0.5 h-6 bg-slate-600" />
              <ArrowDown className="w-4 h-4 text-slate-400 -mt-1" />
            </div>

            {/* 3. STEP 2: COUNTERMEASURE */}
            <div 
              onClick={() => setSelectedNodeId('process-2')}
              className={`w-full max-w-md p-4 rounded-2xl border-2 shadow-lg cursor-pointer transition-all flex items-center justify-between ${
                selectedNodeId === 'process-2'
                  ? 'bg-blue-600 text-white border-blue-200 ring-4 ring-blue-500/30 scale-102'
                  : 'bg-slate-800/90 text-slate-100 border-blue-500/50 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono font-black bg-blue-950 text-blue-300 px-2 py-1 rounded-lg border border-blue-500/40 shrink-0">
                  STEP 2
                </span>
                <div>
                  <h3 className="text-sm font-black font-display">2. Execute Physical Countermeasure</h3>
                  <p className="text-[11px] font-mono text-slate-300">Fabricate Jig / 5S / Poka-Yoke</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-blue-300">Maintenance</span>
            </div>

            {/* Directional Connector Arrow */}
            <div className="flex flex-col items-center -my-2">
              <div className="w-0.5 h-6 bg-slate-600" />
              <ArrowDown className="w-4 h-4 text-slate-400 -mt-1" />
            </div>

            {/* 4. DECISION GATEWAY 1 */}
            <div className="w-full max-w-md relative my-1">
              <div 
                onClick={() => setSelectedNodeId('decision-1')}
                className={`p-4 rounded-2xl border-2 shadow-xl cursor-pointer transition-all space-y-2 text-center ${
                  selectedNodeId === 'decision-1'
                    ? 'bg-purple-600 text-white border-purple-200 ring-4 ring-purple-500/30'
                    : 'bg-purple-950/80 text-purple-100 border-purple-500/70 hover:bg-purple-900/80'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5">
                  <HelpCircle className="w-4 h-4 text-purple-300" />
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-purple-300">
                    &#123; DECISION GATEWAY &#125;
                  </span>
                </div>
                <h3 className="text-sm font-black font-display">Is Improvement Physically Verified & Safe?</h3>
                <p className="text-[11px] font-mono text-purple-200">Line Leader / Supervisor Sign-off</p>
              </div>

              {/* REJECT BRANCH SIDEWAYS */}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 flex items-center space-x-1.5">
                <div className="w-6 h-0.5 bg-rose-500" />
                <div className="bg-rose-950 border border-rose-600 text-rose-300 font-mono font-black text-[10px] px-2.5 py-1 rounded-lg flex items-center space-x-1 shadow-md shrink-0">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>NO: Refine Action</span>
                </div>
              </div>
            </div>

            {/* YES BRANCH DOWN */}
            <div className="flex flex-col items-center space-y-1">
              <div className="bg-emerald-950 border border-emerald-500 text-emerald-300 font-mono font-black text-[10px] px-3 py-0.5 rounded-md flex items-center space-x-1 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>YES: Verified & Safe</span>
              </div>
              <div className="w-0.5 h-5 bg-emerald-500" />
              <ArrowDown className="w-4 h-4 text-emerald-400 -mt-1" />
            </div>

            {/* 5. DATABASE NODE */}
            <div 
              onClick={() => setSelectedNodeId('db-register')}
              className={`w-full max-w-md p-4 rounded-2xl border-2 shadow-lg cursor-pointer transition-all flex items-center justify-between ${
                selectedNodeId === 'db-register'
                  ? 'bg-slate-700 text-white border-amber-400 ring-4 ring-slate-500/30 scale-102'
                  : 'bg-slate-800/90 text-slate-100 border-slate-600 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase text-amber-400 tracking-wider block">
                    [( DATABASE CYLINDER )]
                  </span>
                  <h3 className="text-sm font-black font-display">Kaizen Master Register Database</h3>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400">CFT Board</span>
            </div>

            {/* Directional Connector Arrow */}
            <div className="flex flex-col items-center -my-2">
              <div className="w-0.5 h-6 bg-slate-600" />
              <ArrowDown className="w-4 h-4 text-slate-400 -mt-1" />
            </div>

            {/* 6. STEP 3: CFT REVIEW */}
            <div 
              onClick={() => setSelectedNodeId('process-3')}
              className={`w-full max-w-md p-4 rounded-2xl border-2 shadow-lg cursor-pointer transition-all flex items-center justify-between ${
                selectedNodeId === 'process-3'
                  ? 'bg-amber-600 text-slate-950 border-amber-200 ring-4 ring-amber-500/30 scale-102'
                  : 'bg-slate-800/90 text-slate-100 border-amber-500/50 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono font-black bg-amber-950 text-amber-300 px-2 py-1 rounded-lg border border-amber-500/40 shrink-0">
                  STEP 3
                </span>
                <div>
                  <h3 className="text-sm font-black font-display">3. CFT Committee Review & Star Scoring</h3>
                  <p className="text-[11px] font-mono text-slate-300">1-5 Star Member Rating & Cost Audit</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-300">CFT Board</span>
            </div>

            {/* Directional Connector Arrow */}
            <div className="flex flex-col items-center -my-2">
              <div className="w-0.5 h-6 bg-slate-600" />
              <ArrowDown className="w-4 h-4 text-slate-400 -mt-1" />
            </div>

            {/* 7. DECISION GATEWAY 2 */}
            <div className="w-full max-w-md relative my-1">
              <div 
                onClick={() => setSelectedNodeId('decision-2')}
                className={`p-4 rounded-2xl border-2 shadow-xl cursor-pointer transition-all space-y-2 text-center ${
                  selectedNodeId === 'decision-2'
                    ? 'bg-indigo-600 text-white border-indigo-200 ring-4 ring-indigo-500/30'
                    : 'bg-indigo-950/80 text-indigo-100 border-indigo-500/70 hover:bg-indigo-900/80'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5">
                  <HelpCircle className="w-4 h-4 text-indigo-300" />
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-indigo-300">
                    &#123; DECISION GATEWAY &#125;
                  </span>
                </div>
                <h3 className="text-sm font-black font-display">CFT Score Approved & Savings Audited?</h3>
                <p className="text-[11px] font-mono text-indigo-200">Threshold &gt; 15 Stars</p>
              </div>

              {/* REJECT BRANCH SIDEWAYS */}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 flex items-center space-x-1.5">
                <div className="w-6 h-0.5 bg-rose-500" />
                <div 
                  onClick={() => setSelectedNodeId('end-reject')}
                  className="bg-rose-950 border border-rose-600 text-rose-300 font-mono font-black text-[10px] px-2.5 py-1 rounded-lg flex items-center space-x-1 shadow-md cursor-pointer hover:bg-rose-900 shrink-0"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>NO: Reject & Log Reason</span>
                </div>
              </div>
            </div>

            {/* YES BRANCH DOWN */}
            <div className="flex flex-col items-center space-y-1">
              <div className="bg-emerald-950 border border-emerald-500 text-emerald-300 font-mono font-black text-[10px] px-3 py-0.5 rounded-md flex items-center space-x-1 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>YES: Approved</span>
              </div>
              <div className="w-0.5 h-5 bg-emerald-500" />
              <ArrowDown className="w-4 h-4 text-emerald-400 -mt-1" />
            </div>

            {/* 8. 💥 STEP 4: 5M & PROCESS IMPACT ASSESSMENT (CRUCIAL IMPACT POINT) */}
            <div className="w-full max-w-md relative">
              <div 
                onClick={() => setSelectedNodeId('process-impact')}
                className={`p-4.5 rounded-2xl border-3 shadow-2xl cursor-pointer transition-all ${
                  selectedNodeId === 'process-impact'
                    ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white border-amber-200 ring-4 ring-rose-500/40 scale-103'
                    : 'bg-rose-950/90 text-rose-100 border-rose-500/80 hover:bg-rose-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-black bg-slate-950 text-rose-300 px-2.5 py-0.5 rounded-md border border-rose-500/40 flex items-center space-x-1">
                    <Flame className="w-3 h-3 text-rose-400" />
                    <span>💥 PROCESS IMPACT POINT • STEP 4</span>
                  </span>
                  <span className="text-[10px] font-mono font-black text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                    CRITICAL AUDIT
                  </span>
                </div>

                <h3 className="text-base font-black font-display text-white">
                  4. 5M & Process Impact Assessment
                </h3>
                <p className="text-xs font-mono text-rose-200 mt-0.5">
                  Check 5M (Man, Machine, Material, Method, Measurement), Safety EHS, PFD Drawing & PFMEA RPN Score updates.
                </p>
              </div>

              {/* Side Document Artifact */}
              <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 hidden md:flex items-center space-x-2">
                <div className="w-8 h-0.5 bg-amber-500/60 border-t border-dashed border-amber-400" />
                <div 
                  onClick={() => setSelectedNodeId('doc-impact')}
                  className={`px-3 py-2 rounded-xl border cursor-pointer text-xs font-mono font-bold flex items-center space-x-2 shadow-md shrink-0 ${
                    selectedNodeId === 'doc-impact'
                      ? 'bg-amber-400 text-slate-950 border-amber-200'
                      : 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                  }`}
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>📄 [/ 5M Impact Sign-Off Sheet /]</span>
                </div>
              </div>
            </div>

            {/* Directional Connector Arrow */}
            <div className="flex flex-col items-center -my-2">
              <div className="w-0.5 h-6 bg-slate-600" />
              <ArrowDown className="w-4 h-4 text-slate-400 -mt-1" />
            </div>

            {/* 9. STEP 5: HORIZONTAL DEPLOYMENT */}
            <div 
              onClick={() => setSelectedNodeId('process-4')}
              className={`w-full max-w-md p-4 rounded-2xl border-2 shadow-lg cursor-pointer transition-all flex items-center justify-between ${
                selectedNodeId === 'process-4'
                  ? 'bg-indigo-600 text-white border-indigo-200 ring-4 ring-indigo-500/30 scale-102'
                  : 'bg-slate-800/90 text-slate-100 border-indigo-500/50 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono font-black bg-indigo-950 text-indigo-300 px-2 py-1 rounded-lg border border-indigo-500/40 shrink-0">
                  STEP 5
                </span>
                <div>
                  <h3 className="text-sm font-black font-display">5. Horizontal Deployment & SOP Update</h3>
                  <p className="text-[11px] font-mono text-slate-300">Replicate on Sister Lines & Update WI/PM</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-indigo-300">Quality Eng</span>
            </div>

            {/* Directional Connector Arrow */}
            <div className="flex flex-col items-center -my-2">
              <div className="w-0.5 h-6 bg-slate-600" />
              <ArrowDown className="w-4 h-4 text-slate-400 -mt-1" />
            </div>

            {/* 10. STEP 6: MONTHLY AWARDS */}
            <div 
              onClick={() => setSelectedNodeId('process-5')}
              className={`w-full max-w-md p-4 rounded-2xl border-2 shadow-lg cursor-pointer transition-all flex items-center justify-between ${
                selectedNodeId === 'process-5'
                  ? 'bg-amber-600 text-slate-950 border-amber-200 ring-4 ring-amber-500/30 scale-102'
                  : 'bg-slate-800/90 text-slate-100 border-amber-500/50 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono font-black bg-amber-950 text-amber-300 px-2 py-1 rounded-lg border border-amber-500/40 shrink-0">
                  STEP 6
                </span>
                <div>
                  <h3 className="text-sm font-black font-display">6. Monthly Best Kaizen Award Recognition</h3>
                  <p className="text-[11px] font-mono text-slate-300">Certificate of Excellence & Rewards</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-300">Plant Head</span>
            </div>

            {/* Directional Connector Arrow */}
            <div className="flex flex-col items-center -my-2">
              <div className="w-0.5 h-6 bg-slate-600" />
              <ArrowDown className="w-4 h-4 text-slate-400 -mt-1" />
            </div>

            {/* 11. END TERMINAL */}
            <div 
              onClick={() => setSelectedNodeId('end-success')}
              className={`w-full max-w-md p-4 rounded-3xl border-2 shadow-lg cursor-pointer transition-all flex items-center justify-between ${
                selectedNodeId === 'end-success'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-200 ring-4 ring-emerald-500/30 scale-102'
                  : 'bg-slate-800/90 text-emerald-300 border-emerald-500/60 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-950 text-emerald-300 rounded-2xl border border-emerald-500/40">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider block opacity-80">
                    ([ TERMINAL SYMBOL ])
                  </span>
                  <h3 className="text-sm font-black font-display">END: Standardized Lean Culture Sustained</h3>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-emerald-950/60 px-2.5 py-1 rounded-xl text-emerald-200 border border-emerald-500/30">
                Plant Culture
              </span>
            </div>

          </div>

          {/* SELECTED NODE DETAIL INSPECTOR */}
          <div className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-black uppercase text-amber-400 tracking-wider">
                    SPECIFICATION INSPECTOR
                  </span>
                  {selectedNode.isImpactPoint && (
                    <span className="text-[10px] font-mono font-black bg-rose-500 text-slate-950 px-2 py-0.5 rounded uppercase">
                      💥 PROCESS IMPACT POINT
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-white font-display mt-0.5">
                  {selectedNode.title}
                </h3>
              </div>
              <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border shrink-0 ${selectedNode.roleBg}`}>
                Role: {selectedNode.role}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {selectedNode.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans pt-1">
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase block mb-1">
                  📥 Inputs / Prerequisites
                </span>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  {selectedNode.keyInputs.map((inp, idx) => (
                    <li key={idx}>{inp}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase block mb-1">
                  📤 Outputs / Deliverables
                </span>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  {selectedNode.keyOutputs.map((out, idx) => (
                    <li key={idx}>{out}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
