import React, { useState } from 'react';
import { PsqTreeData, PsqComponentSearchData, PsqChildPartSwapItem, StandardWorksheetRow } from '../types';
import { StandardWorksheetEditor } from './StandardWorksheetEditor';
import { PsqGraphicTree } from './PsqGraphicTree';
import { PsqStageBranchModal } from './PsqStageBranchModal';
import {
  GitFork,
  Plus,
  Trash2,
  CheckCircle2,
  Target,
  Sparkles,
  Info,
  FileText,
  Layers,
  ArrowRight,
  ArrowLeft,
  Zap,
  Check,
  X,
  ChevronDown,
  Flame,
  Table,
  Eye,
  Activity,
  Printer,
  RefreshCw,
  SlidersHorizontal,
  CheckCheck,
  HelpCircle
} from 'lucide-react';

export const BLANK_PSQ_SWAP_DATA: PsqComponentSearchData = {
  productName: "",
  productNumber: "",
  customerName: "",
  testResultSpecification: "",
  activeStage: 0,
  stage0: {
    bobOriginal: "",
    wowOriginal: "",
    bobRepeat1: "",
    wowRepeat1: "",
    bobRepeat2: "",
    wowRepeat2: "",
    bobRepeat3: "",
    wowRepeat3: "",
    measurementGood: false,
    deltaMStatus: 'pending',
    deltaPStatus: 'pending',
    notes: ""
  },
  stage1: {
    bobRepeat1: "",
    wowRepeat1: "",
    bobRepeat2: "",
    wowRepeat2: "",
    bobRepeat3: "",
    wowRepeat3: "",
    processGood: false,
    assemblyProcessStatus: 'pending',
    partsStatus: 'pending',
    notes: ""
  },
  stage2: {
    childParts: [],
    contributingPartName: "",
    notes: ""
  }
};

export const DEFAULT_PSQ_SWAP_DATA: PsqComponentSearchData = {
  productName: "High Pressure Fuel Pump Sub-Assembly",
  productNumber: "HPFP-8840-X2",
  customerName: "Mahindra & Mahindra Ltd",
  testResultSpecification: "Output pressure: 180 - 220 bar @ 2000 RPM (Spec min: 180 bar)",
  activeStage: 2,

  stage0: {
    bobOriginal: "215 bar (Good)",
    wowOriginal: "142 bar (Bad)",
    bobRepeat1: "214 bar",
    wowRepeat1: "140 bar",
    bobRepeat2: "215 bar",
    wowRepeat2: "143 bar",
    bobRepeat3: "216 bar",
    wowRepeat3: "141 bar",
    measurementGood: true,
    deltaMStatus: 'eliminated',
    deltaPStatus: 'active',
    notes: "BOB remains BOB (~215 bar) & WOW remains WOW (~142 bar). Gauge repeatability confirmed OK."
  },

  stage1: {
    bobRepeat1: "214 bar",
    wowRepeat1: "142 bar",
    bobRepeat2: "215 bar",
    wowRepeat2: "140 bar",
    bobRepeat3: "215 bar",
    wowRepeat3: "141 bar",
    processGood: true,
    assemblyProcessStatus: 'eliminated',
    partsStatus: 'active',
    notes: "BOB remains BOB & WOW remains WOW after disassembly and re-assembly. Assembly torque & tightening sequence confirmed OK."
  },

  stage2: {
    childParts: [
      { id: '1', partName: "Plunger Assembly", wowInBobValue: "141 bar (WOW)", wowInBobResult: "WOW", bobInWowValue: "216 bar (BOB)", bobInWowResult: "BOB", isDefective: true, status: 'target', notes: "Red X Root Cause: Plunger barrel clearance out of spec." },
      { id: '2', partName: "Inlet Check Valve", wowInBobValue: "214 bar (BOB)", wowInBobResult: "BOB", bobInWowValue: "142 bar (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' },
      { id: '3', partName: "Discharge Valve", wowInBobValue: "215 bar (BOB)", wowInBobResult: "BOB", bobInWowValue: "140 bar (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' },
      { id: '4', partName: "Return Spring", wowInBobValue: "214 bar (BOB)", wowInBobResult: "BOB", bobInWowValue: "143 bar (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' },
      { id: '5', partName: "Drive Shaft", wowInBobValue: "215 bar (BOB)", wowInBobResult: "BOB", bobInWowValue: "141 bar (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' }
    ],
    contributingPartName: "Plunger Assembly",
    notes: "Swapping Plunger Assembly from WOW to BOB reproduced the 141 bar pressure drop defect."
  }
};

export const BLANK_PSQ_TREE_DATA: PsqTreeData = {
  projectStatement: "",
  bigXTarget: "",
  ftqRejectionRate: "",
  estimatedCost: "",
  treeType: 'swap_analysis',
  rootNodes: [],
  swapData: BLANK_PSQ_SWAP_DATA
};

export const DEFAULT_PSQ_TREE_DATA: PsqTreeData = {
  projectStatement: "High Pressure Fuel Pump Output Pressure Drop at 2000 RPM",
  bigXTarget: "Plunger Assembly (Component Search Red X)",
  ftqRejectionRate: "14.2%",
  estimatedCost: "₹ 4,80,000 / month",
  treeType: 'swap_analysis',
  rootNodes: [],
  swapData: DEFAULT_PSQ_SWAP_DATA
};

export function generateEliminationTreeFromWorksheet(
  worksheet: StandardWorksheetRow[],
  contextInfo?: { title?: string; problemStatement?: string; productComponent?: string; bigXTarget?: string }
): PsqTreeData {
  if (!worksheet || worksheet.length === 0) {
    return {
      projectStatement: contextInfo?.problemStatement || contextInfo?.title || "Standard Worksheet Elimination Tree",
      bigXTarget: "",
      ftqRejectionRate: "",
      estimatedCost: "",
      treeType: 'swap_analysis',
      rootNodes: [],
      swapData: BLANK_PSQ_SWAP_DATA
    };
  }

  // 1. Check for Gage/Measurement Repeatability (Stage 0)
  const gageRows = worksheet.filter(r => r.category === 'measurement' || r.operationName.toLowerCase().includes('gage') || r.operationName.toLowerCase().includes('measur'));
  let measurementGood = true;
  let deltaMStatus: 'eliminated' | 'target' | 'pending' = 'eliminated';
  let deltaPStatus: 'active' | 'eliminated' | 'pending' = 'active';
  let stage0Bob = worksheet[0]?.bobObserved || "";
  let stage0Wow = worksheet[0]?.wowObserved || "";
  let stage0Notes = "Gage repeatability verified from standard worksheet.";

  if (gageRows.length > 0) {
    const hasTarget = gageRows.some(r => r.status === 'target');
    if (hasTarget) {
      measurementGood = false;
      deltaMStatus = 'target';
      deltaPStatus = 'eliminated';
      stage0Notes = 'Measurement gage error isolated as root cause.';
    }
  }

  // 2. Check for Process / Disassembly Repeatability (Stage 1)
  const processRows = worksheet.filter(r => r.category === 'assembly' || r.operationName.toLowerCase().includes('process') || r.operationName.toLowerCase().includes('assembly'));
  let processGood = true;
  let assemblyProcessStatus: 'eliminated' | 'target' | 'pending' = 'eliminated';
  let partsStatus: 'active' | 'eliminated' | 'pending' = 'active';
  let stage1Notes = "Assembly torque and fixture confirmed OK.";

  if (processRows.length > 0) {
    const hasTarget = processRows.some(r => r.status === 'target');
    if (hasTarget) {
      processGood = false;
      assemblyProcessStatus = 'target';
      partsStatus = 'eliminated';
      stage1Notes = 'Assembly torque / process sequence isolated as root cause.';
    }
  }

  // 3. Child parts & Parameters (Stage 2)
  const componentRows = worksheet.filter(r => r.category === 'component' || r.category === 'parameter');
  const childParts: PsqChildPartSwapItem[] = componentRows.map((r, idx) => {
    const isTarget = r.status === 'target';
    const isElim = r.status === 'eliminated';

    return {
      id: r.id || `child-${idx + 1}`,
      partName: r.operationName || `Component ${idx + 1}`,
      wowInBobValue: isTarget ? `${r.wowObserved || 'Defect'} (WOW)` : `${r.bobObserved || 'Nominal'} (BOB)`,
      wowInBobResult: isTarget ? 'WOW' : (isElim ? 'BOB' : ''),
      bobInWowValue: isTarget ? `${r.bobObserved || 'Nominal'} (BOB)` : `${r.wowObserved || 'Defect'} (WOW)`,
      bobInWowResult: isTarget ? 'BOB' : (isElim ? 'WOW' : ''),
      isDefective: isTarget,
      status: isTarget ? 'target' : (isElim ? 'eliminated' : 'pending'),
      notes: r.notes || (isTarget ? `RED X ISOLATED: Swapping ${r.operationName} transfers defect pattern!` : 'Swap test showed no variance contribution.')
    };
  });

  const targetPart = childParts.find(p => p.isDefective || p.status === 'target');
  const targetWorksheetRow = worksheet.find(r => r.status === 'target');
  const bigXName = targetPart ? targetPart.partName : (targetWorksheetRow ? targetWorksheetRow.operationName : '');

  const swapData: PsqComponentSearchData = {
    productName: contextInfo?.productComponent || "Assembly System",
    productNumber: "",
    customerName: "",
    testResultSpecification: worksheet[0]?.standardSpec || "",
    activeStage: targetPart ? 2 : (assemblyProcessStatus === 'eliminated' ? 2 : (deltaMStatus === 'eliminated' ? 1 : 0)),
    stage0: {
      bobOriginal: stage0Bob || (childParts[0]?.bobInWowValue || ""),
      wowOriginal: stage0Wow || (childParts[0]?.wowInBobValue || ""),
      bobRepeat1: stage0Bob,
      wowRepeat1: stage0Wow,
      bobRepeat2: stage0Bob,
      wowRepeat2: stage0Wow,
      bobRepeat3: stage0Bob,
      wowRepeat3: stage0Wow,
      measurementGood,
      deltaMStatus,
      deltaPStatus,
      notes: stage0Notes
    },
    stage1: {
      bobRepeat1: stage0Bob,
      wowRepeat1: stage0Wow,
      bobRepeat2: stage0Bob,
      wowRepeat2: stage0Wow,
      bobRepeat3: stage0Bob,
      wowRepeat3: stage0Wow,
      processGood,
      assemblyProcessStatus,
      partsStatus,
      notes: stage1Notes
    },
    stage2: {
      childParts,
      contributingPartName: bigXName,
      notes: targetPart ? `Big X Target: ${bigXName} isolated as contributing root cause.` : ""
    }
  };

  return {
    projectStatement: contextInfo?.problemStatement || contextInfo?.title || "Component search method & elimination tree generated from Standard Worksheet.",
    bigXTarget: bigXName ? `${bigXName} (Red X Root Cause)` : "",
    ftqRejectionRate: "",
    estimatedCost: "",
    treeType: 'swap_analysis',
    rootNodes: [],
    swapData
  };
}

export const PRESET_EXAMPLES: { name: string; desc: string; data: PsqComponentSearchData }[] = [
  {
    name: "Fuel Pump (Pressure Drop)",
    desc: "Stage 0 (OK) → Stage 1 (OK) → Stage 2 (Plunger Barrel Clearance)",
    data: DEFAULT_PSQ_SWAP_DATA
  },
  {
    name: "Starter Motor (High Cranking Current)",
    desc: "Stage 0 (OK) → Stage 1 (OK) → Stage 2 (Armature Commutator Runout)",
    data: {
      productName: "Starter Motor 12V 2.2kW",
      productNumber: "STR-9921-HD",
      customerName: "Tata Motors Commercial",
      testResultSpecification: "No-load Cranking Current < 160 A (Spec max 170A)",
      activeStage: 2,
      stage0: {
        bobOriginal: "155 A (Good)",
        wowOriginal: "245 A (Bad)",
        bobRepeat1: "154 A",
        wowRepeat1: "242 A",
        bobRepeat2: "155 A",
        wowRepeat2: "246 A",
        bobRepeat3: "156 A",
        wowRepeat3: "244 A",
        measurementGood: true,
        deltaMStatus: 'eliminated',
        deltaPStatus: 'active',
        notes: "Current clamp repeatability verified within ±2A."
      },
      stage1: {
        bobRepeat1: "155 A",
        wowRepeat1: "245 A",
        bobRepeat2: "156 A",
        wowRepeat2: "244 A",
        bobRepeat3: "154 A",
        wowRepeat3: "245 A",
        processGood: true,
        assemblyProcessStatus: 'eliminated',
        partsStatus: 'active',
        notes: "Motor housing bolt torque sequence confirmed OK."
      },
      stage2: {
        childParts: [
          { id: '1', partName: "Armature Assembly", wowInBobValue: "242 A (WOW)", wowInBobResult: "WOW", bobInWowValue: "155 A (BOB)", bobInWowResult: "BOB", isDefective: true, status: 'target', notes: "Armature commutator runout caused high brush resistance." },
          { id: '2', partName: "Carbon Brush Set", wowInBobValue: "155 A (BOB)", wowInBobResult: "BOB", bobInWowValue: "245 A (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' },
          { id: '3', partName: "Drive Pinion Clutch", wowInBobValue: "156 A (BOB)", wowInBobResult: "BOB", bobInWowValue: "244 A (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' },
          { id: '4', partName: "Planetary Gear Set", wowInBobValue: "154 A (BOB)", wowInBobResult: "BOB", bobInWowValue: "245 A (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' }
        ],
        contributingPartName: "Armature Assembly",
        notes: "Swapping Armature reproduced high cranking current defect."
      }
    }
  },
  {
    name: "Brake Booster (Vacuum Leakage)",
    desc: "Stage 0 (OK) → Stage 1 (OK) → Stage 2 (Diaphragm Valve Seal)",
    data: {
      productName: "Tandem Vacuum Brake Booster",
      productNumber: "VBB-300-ABS",
      customerName: "Maruti Suzuki India",
      testResultSpecification: "Vacuum loss < 0.05 bar/min at -0.8 bar hold",
      activeStage: 2,
      stage0: {
        bobOriginal: "0.01 bar/min (Good)",
        wowOriginal: "0.42 bar/min (Bad)",
        bobRepeat1: "0.01 bar/min",
        wowRepeat1: "0.41 bar/min",
        bobRepeat2: "0.02 bar/min",
        wowRepeat2: "0.43 bar/min",
        bobRepeat3: "0.01 bar/min",
        wowRepeat3: "0.42 bar/min",
        measurementGood: true,
        deltaMStatus: 'eliminated',
        deltaPStatus: 'active',
        notes: "Digital differential pressure manometer gauge repeatability confirmed."
      },
      stage1: {
        bobRepeat1: "0.01 bar/min",
        wowRepeat1: "0.42 bar/min",
        bobRepeat2: "0.02 bar/min",
        wowRepeat2: "0.41 bar/min",
        bobRepeat3: "0.01 bar/min",
        wowRepeat3: "0.43 bar/min",
        processGood: true,
        assemblyProcessStatus: 'eliminated',
        partsStatus: 'active',
        notes: "Shell crimping and guide pin alignment verified OK."
      },
      stage2: {
        childParts: [
          { id: '1', partName: "Diaphragm Valve Seal", wowInBobValue: "0.41 bar/min (WOW)", wowInBobResult: "WOW", bobInWowValue: "0.02 bar/min (BOB)", bobInWowResult: "BOB", isDefective: true, status: 'target', notes: "Diaphragm lip flash caused air seepage under negative pressure." },
          { id: '2', partName: "Reaction Disc", wowInBobValue: "0.01 bar/min (BOB)", wowInBobResult: "BOB", bobInWowValue: "0.42 bar/min (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' },
          { id: '3', partName: "Air Filter Element", wowInBobValue: "0.02 bar/min (BOB)", wowInBobResult: "BOB", bobInWowValue: "0.41 bar/min (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' },
          { id: '4', partName: "Return Spring", wowInBobValue: "0.01 bar/min (BOB)", wowInBobResult: "BOB", bobInWowValue: "0.43 bar/min (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' }
        ],
        contributingPartName: "Diaphragm Valve Seal",
        notes: "Swapping Diaphragm Seal reproduced the vacuum leak defect."
      }
    }
  }
];

interface PsqEliminationTreeProps {
  data?: PsqTreeData;
  onChange?: (data: PsqTreeData) => void;
  standardWorksheet?: StandardWorksheetRow[];
  onStandardWorksheetChange?: (worksheet: StandardWorksheetRow[]) => void;
  isEditable?: boolean;
  compact?: boolean;
  contextInfo?: {
    title?: string;
    description?: string;
    line?: string;
    station?: string;
    partName?: string;
    partNo?: string;
    rejectionRate?: string;
    scrapCost?: string;
  };
}

export const PsqEliminationTree: React.FC<PsqEliminationTreeProps> = ({
  data = BLANK_PSQ_TREE_DATA,
  onChange,
  standardWorksheet = [],
  onStandardWorksheetChange,
  isEditable = false,
  compact = false,
  contextInfo
}) => {
  const swapData: PsqComponentSearchData = data.swapData || BLANK_PSQ_SWAP_DATA;

  // View modes: 'studio' (Interactive Swap Studio) | 'tree_diagram' (Pure White Tree) | 'split' (Studio + Tree) | 'standard_worksheet' (Spreadsheet)
  const [viewMode, setViewMode] = useState<'studio' | 'tree_diagram' | 'split' | 'standard_worksheet'>('studio');

  // Step navigation inside Swap Studio
  const [activeStageStep, setActiveStageStep] = useState<number>(swapData.activeStage || 0);

  // Auto-generate toast state
  const [autoGenToast, setAutoGenToast] = useState(false);

  // New child part input inline
  const [newPartName, setNewPartName] = useState('');

  // Helper to trigger parent onChange
  const handleUpdateSwapData = (newSwapData: PsqComponentSearchData) => {
    if (!onChange) return;

    // Auto-calculate Big X target from Stage 2 if identified
    const defectivePart = newSwapData.stage2.childParts.find(p => p.isDefective || p.status === 'target');
    const bigX = defectivePart ? `${defectivePart.partName} (Component Search Red X)` : (data.bigXTarget || '');

    onChange({
      ...data,
      bigXTarget: bigX,
      treeType: 'swap_analysis',
      swapData: newSwapData
    });
  };

  // Auto-generate tree from standard worksheet
  const handleAutoGenerateFromWorksheet = (rowsToUse?: StandardWorksheetRow[]) => {
    const rows = rowsToUse || standardWorksheet;
    const generatedTree = generateEliminationTreeFromWorksheet(rows, {
      title: contextInfo?.title,
      problemStatement: contextInfo?.description,
      productComponent: contextInfo?.partName
    });

    if (onChange) {
      onChange(generatedTree);
    }
    setAutoGenToast(true);
    setTimeout(() => setAutoGenToast(false), 3000);
  };

  // Stage 0 updates
  const handleStage0Toggle = (isGood: boolean) => {
    if (!isEditable) return;
    const updated: PsqComponentSearchData = {
      ...swapData,
      activeStage: (isGood ? Math.max(swapData.activeStage, 1) : 0) as 0 | 1 | 2,
      stage0: {
        ...swapData.stage0,
        measurementGood: isGood,
        deltaMStatus: isGood ? ('eliminated' as const) : ('target' as const),
        deltaPStatus: isGood ? ('active' as const) : ('eliminated' as const),
        notes: isGood ? "Measurement gauge is repeatable. ΔM is eliminated." : "Measurement gauge is unstable. ΔM isolated as root cause."
      }
    };
    handleUpdateSwapData(updated);
  };

  // Stage 1 updates
  const handleStage1Toggle = (isGood: boolean) => {
    if (!isEditable) return;
    const updated: PsqComponentSearchData = {
      ...swapData,
      activeStage: (isGood ? Math.max(swapData.activeStage, 2) : 1) as 0 | 1 | 2,
      stage1: {
        ...swapData.stage1,
        processGood: isGood,
        assemblyProcessStatus: isGood ? ('eliminated' as const) : ('target' as const),
        partsStatus: isGood ? ('active' as const) : ('eliminated' as const),
        notes: isGood ? "Disassembly and re-assembly is repeatable. Assembly process is eliminated." : "Assembly torque / method defect found."
      }
    };
    handleUpdateSwapData(updated);
  };

  // Stage 2: Child Part Swap Test Toggle
  const handleTogglePartDefect = (index: number, isDefective: boolean) => {
    if (!isEditable) return;
    const childParts: PsqChildPartSwapItem[] = swapData.stage2.childParts.map((p, i) => {
      if (i === index) {
        return {
          ...p,
          isDefective: isDefective,
          status: isDefective ? ('target' as const) : ('eliminated' as const),
          wowInBobResult: isDefective ? ('WOW' as const) : ('BOB' as const),
          bobInWowResult: isDefective ? ('BOB' as const) : ('WOW' as const),
          notes: isDefective ? `RED X ROOT CAUSE: Swapping ${p.partName} transferred the defect to BOB unit!` : 'Defect did not transfer. Eliminated.'
        };
      }
      // If one is marked defective, other can be left or kept eliminated
      return p;
    });

    const target = childParts.find(p => p.isDefective);
    const updated: PsqComponentSearchData = {
      ...swapData,
      stage2: {
        ...swapData.stage2,
        childParts,
        contributingPartName: target ? target.partName : '',
        notes: target ? `Red X verified on ${target.partName}.` : ''
      }
    };
    handleUpdateSwapData(updated);
  };

  // Add Child Part
  const handleAddChildPart = () => {
    if (!isEditable || !newPartName.trim()) return;
    const newPart: PsqChildPartSwapItem = {
      id: `part-${Date.now()}`,
      partName: newPartName.trim(),
      wowInBobValue: '',
      wowInBobResult: '',
      bobInWowValue: '',
      bobInWowResult: '',
      isDefective: false,
      status: 'pending'
    };

    const updated = {
      ...swapData,
      stage2: {
        ...swapData.stage2,
        childParts: [...swapData.stage2.childParts, newPart]
      }
    };

    handleUpdateSwapData(updated);
    setNewPartName('');
  };

  // Remove Child Part
  const handleRemoveChildPart = (index: number) => {
    if (!isEditable) return;
    const childParts = swapData.stage2.childParts.filter((_, i) => i !== index);
    const updated = {
      ...swapData,
      stage2: {
        ...swapData.stage2,
        childParts
      }
    };
    handleUpdateSwapData(updated);
  };

  // Interactive Tree Node click handler
  const handleTreeNodeClick = (nodeType: 'deltaM' | 'deltaP' | 'assembly' | 'parts' | 'childPart', index?: number) => {
    if (!isEditable) return;
    if (nodeType === 'deltaM') {
      const isCurrentlyElim = swapData.stage0.deltaMStatus === 'eliminated';
      handleStage0Toggle(!isCurrentlyElim);
    } else if (nodeType === 'assembly') {
      const isCurrentlyElim = swapData.stage1.assemblyProcessStatus === 'eliminated';
      handleStage1Toggle(!isCurrentlyElim);
    } else if (nodeType === 'childPart' && index !== undefined) {
      const part = swapData.stage2.childParts[index];
      const isDef = part ? (part.isDefective || part.status === 'target') : false;
      handleTogglePartDefect(index, !isDef);
    }
  };

  // Methodology conclusion calculation
  const isGaugeGood = swapData.stage0.deltaMStatus === 'eliminated';
  const isProcessGood = swapData.stage1.assemblyProcessStatus === 'eliminated';
  const targetPart = swapData.stage2.childParts?.find(p => p.isDefective || p.status === 'target');

  return (
    <div className="space-y-5 font-sans select-none text-slate-900" id="psq-swap-analysis-root">

      {/* Toast Notification */}
      {autoGenToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-emerald-300 border-2 border-emerald-500/50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-mono font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Auto-generated PSQ Elimination Tree from Standard Worksheet!</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ULTRA-COMPACT TOP CONTROL BAR & VIEW MODES */}
      {/* ========================================================================= */}
      <div className="bg-slate-950 text-white rounded-2xl p-2.5 sm:p-3 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2">
        {/* Left: Compact Title & Status */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 shrink-0">
            <GitFork className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white truncate">
              PSQ Swap &amp; Elimination Studio
            </h3>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase font-mono px-1.5 py-0.5 rounded">
              Shainin
            </span>
            {targetPart ? (
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black font-mono px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
                <Target className="w-2.5 h-2.5" /> Red X: {targetPart.partName}
              </span>
            ) : isGaugeGood && isProcessGood ? (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded">
                ΔM &amp; ΔP OK
              </span>
            ) : (
              <span className="bg-slate-800 text-slate-400 text-[9px] font-mono px-1.5 py-0.5 rounded">
                Testing
              </span>
            )}
          </div>
        </div>

        {/* Right: Compact View Switcher, Presets & Sync */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {/* View Switcher Pills */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('studio')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition flex items-center space-x-1 cursor-pointer ${viewMode === 'studio'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
                }`}
              title="Step-by-step card bench"
            >
              <Activity className="w-3 h-3" />
              <span>Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('tree_diagram')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition flex items-center space-x-1 cursor-pointer ${viewMode === 'tree_diagram'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
                }`}
              title="Interactive Graphic Tree"
            >
              <GitFork className="w-3 h-3" />
              <span>Tree</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition hidden sm:flex items-center space-x-1 cursor-pointer ${viewMode === 'split'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
                }`}
              title="Side-by-side cards and diagram"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Split</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('standard_worksheet')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition flex items-center space-x-1 cursor-pointer ${viewMode === 'standard_worksheet'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
                }`}
              title="Standard Worksheet Table"
            >
              <Table className="w-3 h-3" />
              <span>Worksheet</span>
            </button>
          </div>

          {/* Quick Preset Mini-Buttons */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900/80 px-1.5 py-1 rounded-xl border border-slate-800 text-[10px] font-mono">
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
            {PRESET_EXAMPLES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleUpdateSwapData(preset.data)}
                className="hover:bg-slate-800 text-slate-300 hover:text-white px-1.5 py-0.5 rounded transition cursor-pointer"
                title={preset.desc}
              >
                {preset.name.split(' ')[0]}
              </button>
            ))}
          </div>

          {standardWorksheet.length > 0 && (
            <button
              type="button"
              onClick={() => handleAutoGenerateFromWorksheet()}
              className="bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 px-2 py-1 rounded-xl text-[10px] font-bold font-mono flex items-center space-x-1 transition cursor-pointer"
              title="Sync from Standard Worksheet"
            >
              <RefreshCw className="w-2.5 h-2.5 text-emerald-400" />
              <span>Sync</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ULTRA-SLIM METHODOLOGY VERDICT RIBBON */}
      {/* ========================================================================= */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs font-mono text-[11px] text-slate-700">
        <div className="flex items-center space-x-2 flex-wrap">
          <span className="font-bold text-slate-400 uppercase text-[9px] flex items-center gap-1">
            <Target className="w-3 h-3 text-slate-500" /> Shainin Flow:
          </span>
          <span className={isGaugeGood ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
            {isGaugeGood ? '✅ ΔM Eliminated' : '⏳ ΔM Gauge'}
          </span>
          <span className="text-slate-300">&rarr;</span>
          <span className={isProcessGood ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
            {isProcessGood ? '✅ ΔP Eliminated' : '⏳ ΔP Assembly'}
          </span>
          <span className="text-slate-300">&rarr;</span>
          {targetPart ? (
            <span className="text-rose-700 font-black bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
              🎯 Red X: {targetPart.partName}
            </span>
          ) : (
            <span className="text-slate-500">Child Parts Testing</span>
          )}
        </div>

        {targetPart && (
          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
            Stage 2 Complete
          </span>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: INTERACTIVE SWAP STUDIO (CARDS BENCH) */}
      {/* ========================================================================= */}
      {(viewMode === 'studio' || viewMode === 'split') && (
        <div className={`grid grid-cols-1 ${viewMode === 'split' ? 'lg:grid-cols-2' : ''} gap-5`}>

          {/* Studio Steps Left Column */}
          <div className="space-y-4">

            {/* Step Navigation Tabs */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { step: 0, title: "Stage 0: Gauge (ΔM)", sub: isGaugeGood ? "✅ Repeatable" : "Test Repeatability" },
                { step: 1, title: "Stage 1: Assembly (ΔP)", sub: isProcessGood ? "✅ Process OK" : "Test Disassembly" },
                { step: 2, title: "Stage 2: Child Parts", sub: targetPart ? `🎯 ${targetPart.partName}` : "Component Swaps" }
              ].map((s) => {
                const isActive = activeStageStep === s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setActiveStageStep(s.step)}
                    className={`p-3 rounded-2xl text-left border-2 transition cursor-pointer font-mono ${isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                      }`}
                  >
                    <span className={`block text-xs font-black ${isActive ? 'text-emerald-400' : 'text-slate-900'}`}>
                      {s.title}
                    </span>
                    <span className={`block text-[10px] mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                      {s.sub}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* STAGE 0 CARD: GAUGE REPEATABILITY */}
            {activeStageStep === 0 && (
              <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xs space-y-5 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="text-sm font-black uppercase font-mono text-slate-900">
                      🔬 Stage 0: Measurement Gauge Repeatability (&Delta;M)
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">
                      Test BOB unit (Best of Best) vs WOW unit (Worst of Worst) 3 times with the exact same measurement gauge.
                    </p>
                  </div>
                </div>

                {/* Baselines */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-emerald-50 border-2 border-emerald-300 p-3 rounded-2xl">
                    <span className="text-[10px] font-black text-emerald-900 uppercase block">BOB Baseline (Good Unit):</span>
                    <input
                      type="text"
                      disabled={!isEditable}
                      value={swapData.stage0.bobOriginal || ''}
                      onChange={(e) => {
                        const updated = { ...swapData, stage0: { ...swapData.stage0, bobOriginal: e.target.value } };
                        handleUpdateSwapData(updated);
                      }}
                      placeholder="e.g. 215 bar (Good)"
                      className="bg-white border border-emerald-300 rounded-xl px-3 py-1.5 w-full font-bold text-slate-900 mt-1"
                    />
                  </div>

                  <div className="bg-rose-50 border-2 border-rose-300 p-3 rounded-2xl">
                    <span className="text-[10px] font-black text-rose-900 uppercase block">WOW Baseline (Defective Unit):</span>
                    <input
                      type="text"
                      disabled={!isEditable}
                      value={swapData.stage0.wowOriginal || ''}
                      onChange={(e) => {
                        const updated = { ...swapData, stage0: { ...swapData.stage0, wowOriginal: e.target.value } };
                        handleUpdateSwapData(updated);
                      }}
                      placeholder="e.g. 142 bar (Bad)"
                      className="bg-white border border-rose-300 rounded-xl px-3 py-1.5 w-full font-bold text-slate-900 mt-1"
                    />
                  </div>
                </div>

                {/* Repeat Measurement Rows */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 font-mono block">3 Consecutive Repeat Readings:</span>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    {[
                      { label: "Repeat 1", bob: swapData.stage0.bobRepeat1, wow: swapData.stage0.wowRepeat1, bKey: 'bobRepeat1', wKey: 'wowRepeat1' },
                      { label: "Repeat 2", bob: swapData.stage0.bobRepeat2, wow: swapData.stage0.wowRepeat2, bKey: 'bobRepeat2', wKey: 'wowRepeat2' },
                      { label: "Repeat 3", bob: swapData.stage0.bobRepeat3, wow: swapData.stage0.wowRepeat3, bKey: 'bobRepeat3', wKey: 'wowRepeat3' }
                    ].map((rep, rIdx) => (
                      <div key={rIdx} className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-600 block">{rep.label}</span>
                        <input
                          type="text"
                          disabled={!isEditable}
                          value={rep.bob || ''}
                          onChange={(e) => {
                            const updated = { ...swapData, stage0: { ...swapData.stage0, [rep.bKey]: e.target.value } };
                            handleUpdateSwapData(updated);
                          }}
                          placeholder="BOB val"
                          className="bg-white border border-slate-300 rounded-lg px-2 py-1 w-full text-xs font-bold text-emerald-900"
                        />
                        <input
                          type="text"
                          disabled={!isEditable}
                          value={rep.wow || ''}
                          onChange={(e) => {
                            const updated = { ...swapData, stage0: { ...swapData.stage0, [rep.wKey]: e.target.value } };
                            handleUpdateSwapData(updated);
                          }}
                          placeholder="WOW val"
                          className="bg-white border border-slate-300 rounded-lg px-2 py-1 w-full text-xs font-bold text-rose-900"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Big Decision Switch */}
                <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl space-y-2">
                  <span className="text-xs font-black uppercase font-mono text-slate-800 block">
                    Is the Measurement System Repeatable (BOB stays BOB, WOW stays WOW)?
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={!isEditable}
                      onClick={() => handleStage0Toggle(true)}
                      className={`p-3 rounded-xl border-2 font-mono text-xs font-black flex items-center justify-center space-x-2 transition cursor-pointer ${isGaugeGood
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-4 ring-emerald-200'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-500'
                        }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>YES : Gauge OK (&Delta;M Eliminated)</span>
                    </button>

                    <button
                      type="button"
                      disabled={!isEditable}
                      onClick={() => handleStage0Toggle(false)}
                      className={`p-3 rounded-xl border-2 font-mono text-xs font-black flex items-center justify-center space-x-2 transition cursor-pointer ${swapData.stage0.deltaMStatus === 'target'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-4 ring-rose-200'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-rose-500'
                        }`}
                    >
                      <X className="w-4 h-4" />
                      <span>NO : Gauge Defective (&Delta;M Root Cause)</span>
                    </button>
                  </div>
                </div>

                {/* Next Step Footer */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStageStep(1)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs px-4 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Proceed to Stage 1 (Assembly Process)</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 1 CARD: ASSEMBLY PROCESS */}
            {activeStageStep === 1 && (
              <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xs space-y-5 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="text-sm font-black uppercase font-mono text-slate-900">
                      ⚙️ Stage 1: Assembly Process &amp; Torque Repeatability (&Delta;P)
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">
                      Disassemble BOB &amp; WOW completely and re-assemble with same original parts (no swapping).
                    </p>
                  </div>
                </div>

                {/* Disassembly Repeat Measurements */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 font-mono block">3 Consecutive Re-assembly Tests:</span>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    {[
                      { label: "Reassembly 1", bob: swapData.stage1.bobRepeat1, wow: swapData.stage1.wowRepeat1, bKey: 'bobRepeat1', wKey: 'wowRepeat1' },
                      { label: "Reassembly 2", bob: swapData.stage1.bobRepeat2, wow: swapData.stage1.wowRepeat2, bKey: 'bobRepeat2', wKey: 'wowRepeat2' },
                      { label: "Reassembly 3", bob: swapData.stage1.bobRepeat3, wow: swapData.stage1.wowRepeat3, bKey: 'bobRepeat3', wKey: 'wowRepeat3' }
                    ].map((rep, rIdx) => (
                      <div key={rIdx} className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-600 block">{rep.label}</span>
                        <input
                          type="text"
                          disabled={!isEditable}
                          value={rep.bob || ''}
                          onChange={(e) => {
                            const updated = { ...swapData, stage1: { ...swapData.stage1, [rep.bKey]: e.target.value } };
                            handleUpdateSwapData(updated);
                          }}
                          placeholder="BOB reassembled"
                          className="bg-white border border-slate-300 rounded-lg px-2 py-1 w-full text-xs font-bold text-emerald-900"
                        />
                        <input
                          type="text"
                          disabled={!isEditable}
                          value={rep.wow || ''}
                          onChange={(e) => {
                            const updated = { ...swapData, stage1: { ...swapData.stage1, [rep.wKey]: e.target.value } };
                            handleUpdateSwapData(updated);
                          }}
                          placeholder="WOW reassembled"
                          className="bg-white border border-slate-300 rounded-lg px-2 py-1 w-full text-xs font-bold text-rose-900"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Big Decision Switch */}
                <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl space-y-2">
                  <span className="text-xs font-black uppercase font-mono text-slate-800 block">
                    Does Re-assembly Preserve the Difference (Assembly Process is OK)?
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={!isEditable}
                      onClick={() => handleStage1Toggle(true)}
                      className={`p-3 rounded-xl border-2 font-mono text-xs font-black flex items-center justify-center space-x-2 transition cursor-pointer ${isProcessGood
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-4 ring-emerald-200'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-500'
                        }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>YES : Assembly OK (Eliminates Process, Isolates Parts)</span>
                    </button>

                    <button
                      type="button"
                      disabled={!isEditable}
                      onClick={() => handleStage1Toggle(false)}
                      className={`p-3 rounded-xl border-2 font-mono text-xs font-black flex items-center justify-center space-x-2 transition cursor-pointer ${swapData.stage1.assemblyProcessStatus === 'target'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-4 ring-rose-200'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-rose-500'
                        }`}
                    >
                      <X className="w-4 h-4" />
                      <span>NO : Torque/Method Defect (Process Root Cause)</span>
                    </button>
                  </div>
                </div>

                {/* Next Step Footer */}
                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStageStep(0)}
                    className="text-slate-600 hover:text-slate-900 font-mono font-bold text-xs flex items-center space-x-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Stage 0</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStageStep(2)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs px-4 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Proceed to Stage 2 (Child Parts Swapping)</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 2 CARD: CHILD PARTS SWAPPING MATRIX */}
            {activeStageStep === 2 && (
              <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xs space-y-5 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
                  <div>
                    <h4 className="text-sm font-black uppercase font-mono text-slate-900">
                      🧩 Stage 2: Child Part Swapping Matrix &amp; Red X Hunting
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">
                      Swap one component from WOW unit into BOB unit. If BOB becomes WOW, the swapped part is the Red X root cause!
                    </p>
                  </div>
                </div>

                {/* Add Child Part Form */}
                {isEditable && (
                  <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <input
                      type="text"
                      value={newPartName}
                      onChange={(e) => setNewPartName(e.target.value)}
                      placeholder="Add Child Part (e.g. Plunger Assembly, Check Valve)..."
                      className="bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 flex-1 outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={handleAddChildPart}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold text-xs px-4 py-2 rounded-xl transition flex items-center space-x-1 cursor-pointer shadow-xs shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Part</span>
                    </button>
                  </div>
                )}

                {/* Child Parts Cards Grid */}
                <div className="space-y-3">
                  {swapData.stage2.childParts.length === 0 ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-2xl text-center text-slate-400 font-mono text-xs">
                      No child parts added to this component search matrix yet. Click "Add Part" above or pick a preset.
                    </div>
                  ) : (
                    swapData.stage2.childParts.map((part, pIdx) => {
                      const isRedX = part.isDefective || part.status === 'target';
                      const isElim = part.status === 'eliminated';

                      return (
                        <div
                          key={part.id || pIdx}
                          className={`p-4 rounded-2xl border-2 transition font-mono space-y-3 ${isRedX
                            ? 'bg-amber-50 border-amber-500 shadow-md ring-4 ring-amber-300/40'
                            : isElim
                              ? 'bg-sky-50/60 border-sky-300'
                              : 'bg-white border-slate-200'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                                #{pIdx + 1}
                              </span>
                              <h5 className="text-sm font-black text-slate-900">{part.partName}</h5>
                            </div>

                            <div className="flex items-center space-x-2">
                              {isRedX ? (
                                <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-xl uppercase flex items-center gap-1 shadow-2xs">
                                  <Flame className="w-3 h-3" /> RED X ROOT CAUSE
                                </span>
                              ) : isElim ? (
                                <span className="bg-sky-100 text-sky-950 font-bold text-[10px] px-2 py-0.5 rounded-lg">
                                  Eliminated 🚫
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-lg">
                                  Testing...
                                </span>
                              )}

                              {isEditable && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveChildPart(pIdx)}
                                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  title="Delete Part"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Swap Test Trigger */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="bg-white/80 border border-slate-200 p-2.5 rounded-xl">
                              <span className="text-[10px] text-slate-500 font-bold block">Swap: WOW Part placed in BOB Unit</span>
                              <input
                                type="text"
                                disabled={!isEditable}
                                value={part.wowInBobValue || ''}
                                onChange={(e) => {
                                  const childParts = [...swapData.stage2.childParts];
                                  childParts[pIdx].wowInBobValue = e.target.value;
                                  handleUpdateSwapData({ ...swapData, stage2: { ...swapData.stage2, childParts } });
                                }}
                                placeholder="e.g. 141 bar (Defect transferred)"
                                className="bg-white border border-slate-300 rounded-lg px-2 py-1 w-full text-xs font-bold mt-1 text-slate-900"
                              />
                            </div>

                            <div className="flex items-center space-x-2 pt-2 sm:pt-0">
                              <button
                                type="button"
                                disabled={!isEditable}
                                onClick={() => handleTogglePartDefect(pIdx, true)}
                                className={`flex-1 py-2.5 px-3 rounded-xl border-2 text-xs font-black flex items-center justify-center space-x-1.5 transition cursor-pointer ${isRedX
                                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-300 hover:border-amber-400'
                                  }`}
                              >
                                <Flame className="w-3.5 h-3.5 text-amber-950" />
                                <span>Defect Transferred &rarr; RED X 🎯</span>
                              </button>

                              <button
                                type="button"
                                disabled={!isEditable}
                                onClick={() => handleTogglePartDefect(pIdx, false)}
                                className={`py-2.5 px-3 rounded-xl border-2 text-xs font-bold transition cursor-pointer ${isElim && !isRedX
                                  ? 'bg-sky-600 text-white border-sky-600'
                                  : 'bg-white text-slate-700 border-slate-300 hover:border-sky-400'
                                  }`}
                              >
                                <span>Eliminate 🚫</span>
                              </button>
                            </div>
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStageStep(1)}
                    className="text-slate-600 hover:text-slate-900 font-mono font-bold text-xs flex items-center space-x-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Stage 1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('tree_diagram')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold text-xs px-4 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <span>View Pure White Tree Canvas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Right Column in Split View: Live Tree */}
          {viewMode === 'split' && (
            <div className="sticky top-4">
              <PsqGraphicTree
                swapData={swapData}
                isEditable={isEditable}
                onToggleNode={handleTreeNodeClick}
              />
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: PURE WHITE FULL GRAPHIC TREE CANVAS */}
      {/* ========================================================================= */}
      {viewMode === 'tree_diagram' && (
        <div className="space-y-4 animate-fade-in">
          <PsqGraphicTree
            swapData={swapData}
            isEditable={isEditable}
            onOpenStage={(stage) => {
              setActiveStageStep(stage);
              setViewMode('studio');
            }}
            onToggleNode={handleTreeNodeClick}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 3: STANDARD WORKSHEET (EXCEL-STYLE SPREADSHEET) */}
      {/* ========================================================================= */}
      {viewMode === 'standard_worksheet' && (
        <div className="space-y-4 animate-fade-in">
          <StandardWorksheetEditor
            rows={standardWorksheet}
            onChange={(newRows) => {
              if (onStandardWorksheetChange) {
                onStandardWorksheetChange(newRows);
              }
              handleAutoGenerateFromWorksheet(newRows);
            }}
            isEditable={isEditable}
          />
        </div>
      )}

    </div>
  );
};
