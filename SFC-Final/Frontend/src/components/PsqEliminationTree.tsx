import React, { useState, useEffect } from 'react';
import { PsqTreeData, PsqComponentSearchData, PsqChildPartSwapItem } from '../types';
import { 
  GitFork, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Target, 
  Sparkles, 
  RefreshCw, 
  Info,
  Maximize2,
  FileText,
  Layers,
  ArrowRight,
  Zap,
  HelpCircle,
  Check,
  X,
  Printer,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Flame,
  Search,
  Sliders,
  Share2
} from 'lucide-react';

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
    notes: "BOB remains BOB (~215 bar) & WOW remains WOW (~142 bar). Measurement gauge repeatability is confirmed OK."
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
      {
        id: 'part-1',
        partName: "Plunger Spring",
        wowInBobValue: "214 bar (BOB)",
        wowInBobResult: "BOB",
        bobInWowValue: "142 bar (WOW)",
        bobInWowResult: "WOW",
        isDefective: false,
        status: 'eliminated',
        notes: "Swap caused no change. Defect stayed with WOW body."
      },
      {
        id: 'part-2',
        partName: "Delivery Check Valve",
        wowInBobValue: "141 bar (WOW) 🚨",
        wowInBobResult: "WOW",
        bobInWowValue: "216 bar (BOB) ⭐",
        bobInWowResult: "BOB",
        isDefective: true,
        status: 'target',
        notes: "BIG X ISOLATED: Swapping WOW Check Valve into BOB made BOB drop to 141 bar (WOW). Swapping BOB Check Valve into WOW made WOW jump to 216 bar (BOB)!"
      },
      {
        id: 'part-3',
        partName: "Inlet Metering Solenoid",
        wowInBobValue: "215 bar (BOB)",
        wowInBobResult: "BOB",
        bobInWowValue: "142 bar (WOW)",
        bobInWowResult: "WOW",
        isDefective: false,
        status: 'eliminated',
        notes: "No change in test outcome."
      },
      {
        id: 'part-4',
        partName: "Piston Barrel Sleeve",
        wowInBobValue: "214 bar (BOB)",
        wowInBobResult: "BOB",
        bobInWowValue: "143 bar (WOW)",
        bobInWowResult: "WOW",
        isDefective: false,
        status: 'eliminated',
        notes: "No effect on pressure output."
      },
      {
        id: 'part-5',
        partName: "Drive Cam Roller",
        wowInBobValue: "215 bar (BOB)",
        wowInBobResult: "BOB",
        bobInWowValue: "141 bar (WOW)",
        bobInWowResult: "WOW",
        isDefective: false,
        status: 'eliminated',
        notes: "No variance contribution."
      },
      {
        id: 'part-6',
        partName: "High-Pressure Seal Ring",
        wowInBobValue: "215 bar (BOB)",
        wowInBobResult: "BOB",
        bobInWowValue: "142 bar (WOW)",
        bobInWowResult: "WOW",
        isDefective: false,
        status: 'eliminated',
        notes: "No sealing leakage detected."
      },
      {
        id: 'part-7',
        partName: "Pump Housing Body",
        wowInBobValue: "216 bar (BOB)",
        wowInBobResult: "BOB",
        bobInWowValue: "140 bar (WOW)",
        bobInWowResult: "WOW",
        isDefective: false,
        status: 'eliminated',
        notes: "Housing tolerances within nominal drawing specs."
      }
    ],
    contributingPartName: "Delivery Check Valve",
    notes: "Delivery Check Valve internal micro-burr causes seat leakage under high flow rate. Dimension & deburring drawing revision requested."
  }
};

export const DEFAULT_PSQ_TREE_DATA: PsqTreeData = {
  projectStatement: "Component search method & swap analysis to isolate the Red X root cause for high pressure pump failure.",
  bigXTarget: "Delivery Check Valve (Seat leakage under pressure)",
  ftqRejectionRate: "4.20%",
  estimatedCost: "₹ 1,85,000 / month",
  treeType: 'swap_analysis',
  swapData: DEFAULT_PSQ_SWAP_DATA
};

// Preset examples for quick loading
const PRESET_EXAMPLES: { name: string; desc: string; data: PsqComponentSearchData }[] = [
  {
    name: "HP Fuel Pump (Check Valve Failure)",
    desc: "Stage 0 (Gauge OK) → Stage 1 (Assembly OK) → Stage 2 (Delivery Check Valve Isolated as Red X)",
    data: DEFAULT_PSQ_SWAP_DATA
  },
  {
    name: "Starter Motor (Solenoid Plunger Stick)",
    desc: "Pinpoints high cranking current draw down to solenoid plunger armature friction.",
    data: {
      productName: "Starter Motor 12V 2.2kW",
      productNumber: "STM-2200-B",
      customerName: "Tata Motors Commercial",
      testResultSpecification: "Cranking Current: 140 - 180A (Spec Max 180A)",
      activeStage: 2,
      stage0: {
        bobOriginal: "155 A (Good)",
        wowOriginal: "245 A (Bad)",
        bobRepeat1: "156 A",
        wowRepeat1: "242 A",
        bobRepeat2: "154 A",
        wowRepeat2: "246 A",
        bobRepeat3: "155 A",
        wowRepeat3: "244 A",
        measurementGood: true,
        deltaMStatus: 'eliminated',
        deltaPStatus: 'active',
        notes: "Test bench current clamp repeatability verified. Measurement is Good."
      },
      stage1: {
        bobRepeat1: "155 A",
        wowRepeat1: "245 A",
        bobRepeat2: "154 A",
        wowRepeat2: "243 A",
        bobRepeat3: "156 A",
        wowRepeat3: "244 A",
        processGood: true,
        assemblyProcessStatus: 'eliminated',
        partsStatus: 'active',
        notes: "Disassembly and re-assembly reproduced identical currents. Process is Good."
      },
      stage2: {
        childParts: [
          { id: 'p-1', partName: "Solenoid Plunger", wowInBobValue: "242 A (WOW)", wowInBobResult: "WOW", bobInWowValue: "158 A (BOB)", bobInWowResult: "BOB", isDefective: true, status: 'target', notes: "Red X: Plunger guide diameter 0.08mm oversize." },
          { id: 'p-2', partName: "Armature Rotor", wowInBobValue: "155 A (BOB)", wowInBobResult: "BOB", bobInWowValue: "245 A (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' },
          { id: 'p-3', partName: "Carbon Brushes", wowInBobValue: "156 A (BOB)", wowInBobResult: "BOB", bobInWowValue: "244 A (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' },
          { id: 'p-4', partName: "Planetary Gear", wowInBobValue: "154 A (BOB)", wowInBobResult: "BOB", bobInWowValue: "245 A (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' },
          { id: 'p-5', partName: "Pinion Drive", wowInBobValue: "155 A (BOB)", wowInBobResult: "BOB", bobInWowValue: "243 A (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' }
        ],
        contributingPartName: "Solenoid Plunger",
        notes: "Plunger outer diameter ground out of tolerance at sub-supplier."
      }
    }
  },
  {
    name: "Steering Gearbox (Backlash)",
    desc: "Stage 0 (OK) → Stage 1 (OK) → Stage 2 (Pinion Bearing Preload Shim)",
    data: {
      productName: "Power Steering Gearbox Assembly",
      productNumber: "STG-440-EPS",
      customerName: "Maruti Suzuki India Ltd",
      testResultSpecification: "Pinion Backlash: 0.05 - 0.12 mm (Spec max 0.15mm)",
      activeStage: 2,
      stage0: {
        bobOriginal: "0.08 mm (Good)",
        wowOriginal: "0.28 mm (Bad)",
        bobRepeat1: "0.08 mm",
        wowRepeat1: "0.27 mm",
        bobRepeat2: "0.07 mm",
        wowRepeat2: "0.28 mm",
        bobRepeat3: "0.08 mm",
        wowRepeat3: "0.29 mm",
        measurementGood: true,
        deltaMStatus: 'eliminated',
        deltaPStatus: 'active',
        notes: "Dial indicator repeatability confirmed OK."
      },
      stage1: {
        bobRepeat1: "0.08 mm",
        wowRepeat1: "0.28 mm",
        bobRepeat2: "0.08 mm",
        wowRepeat2: "0.27 mm",
        bobRepeat3: "0.07 mm",
        wowRepeat3: "0.28 mm",
        processGood: true,
        assemblyProcessStatus: 'eliminated',
        partsStatus: 'active',
        notes: "Disassembly and re-assembly showed no shift. Process is Good."
      },
      stage2: {
        childParts: [
          { id: 'p-1', partName: "Rack Bar", wowInBobValue: "0.08 mm (BOB)", wowInBobResult: "BOB", bobInWowValue: "0.28 mm (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' },
          { id: 'p-2', partName: "Pinion Shaft", wowInBobValue: "0.08 mm (BOB)", wowInBobResult: "BOB", bobInWowValue: "0.28 mm (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' },
          { id: 'p-3', partName: "Preload Adjuster Shim", wowInBobValue: "0.27 mm (WOW)", wowInBobResult: "WOW", bobInWowValue: "0.09 mm (BOB)", bobInWowResult: "BOB", isDefective: true, status: 'target', notes: "Red X: Shim thickness 1.20mm instead of 1.45mm." },
          { id: 'p-4', partName: "Support Yoke", wowInBobValue: "0.07 mm (BOB)", wowInBobResult: "BOB", bobInWowValue: "0.28 mm (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' },
          { id: 'p-5', partName: "Housing Casting", wowInBobValue: "0.08 mm (BOB)", wowInBobResult: "BOB", bobInWowValue: "0.27 mm (WOW)", bobInWowResult: "WOW", isDefective: false, status: 'eliminated' }
        ],
        contributingPartName: "Preload Adjuster Shim",
        notes: "Operator picked thinner shim from wrong bin. Poke-yoke color code added."
      }
    }
  }
];

interface PsqEliminationTreeProps {
  data?: PsqTreeData;
  onChange?: (updatedData: PsqTreeData) => void;
  isEditable?: boolean;
  compact?: boolean;
  contextInfo?: {
    title?: string;
    description?: string;
    area?: string;
    line?: string;
    station?: string;
    partName?: string;
    partNo?: string;
    rejectionRate?: string;
    scrapCost?: string;
  };
}

export const PsqEliminationTree: React.FC<PsqEliminationTreeProps> = ({
  data = DEFAULT_PSQ_TREE_DATA,
  onChange,
  isEditable = false,
  compact = false,
  contextInfo
}) => {
  // Ensure swapData exists with fallback to DEFAULT_PSQ_SWAP_DATA
  const swapData: PsqComponentSearchData = data.swapData || DEFAULT_PSQ_SWAP_DATA;

  // View modes: 'worksheet' (the exact paper sheet layout) | 'tree_diagram' (graphic elimination tree) | 'split' (both side by side)
  const [viewMode, setViewMode] = useState<'worksheet' | 'tree_diagram' | 'split'>('worksheet');
  const [showHelpModal, setShowHelpModal] = useState(false);

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

  // Stage 0 updates
  const handleStage0Change = (field: keyof typeof swapData.stage0, value: any) => {
    if (!isEditable) return;
    const updated = {
      ...swapData,
      stage0: {
        ...swapData.stage0,
        [field]: value
      }
    };

    // If measurement good is toggled
    if (field === 'measurementGood') {
      updated.stage0.deltaMStatus = value ? 'eliminated' : 'target';
      updated.stage0.deltaPStatus = value ? 'active' : 'eliminated';
    }

    handleUpdateSwapData(updated);
  };

  // Stage 1 updates
  const handleStage1Change = (field: keyof typeof swapData.stage1, value: any) => {
    if (!isEditable) return;
    const updated = {
      ...swapData,
      stage1: {
        ...swapData.stage1,
        [field]: value
      }
    };

    if (field === 'processGood') {
      updated.stage1.assemblyProcessStatus = value ? 'eliminated' : 'target';
      updated.stage1.partsStatus = value ? 'active' : 'eliminated';
    }

    handleUpdateSwapData(updated);
  };

  // Stage 2: Child part update
  const handleUpdateChildPart = (index: number, updates: Partial<PsqChildPartSwapItem>) => {
    if (!isEditable) return;
    const childParts = [...swapData.stage2.childParts];
    const item = { ...childParts[index], ...updates };

    // Auto calculate if defective: WOW in BOB is WOW AND BOB in WOW is BOB
    if (updates.wowInBobResult !== undefined || updates.bobInWowResult !== undefined) {
      const isDef = item.wowInBobResult === 'WOW' && item.bobInWowResult === 'BOB';
      item.isDefective = isDef;
      item.status = isDef ? 'target' : (item.wowInBobResult === 'BOB' ? 'eliminated' : 'pending');
    }

    childParts[index] = item;
    
    // Find contributing part
    const def = childParts.find(p => p.isDefective);

    const updated = {
      ...swapData,
      stage2: {
        ...swapData.stage2,
        childParts,
        contributingPartName: def ? def.partName : swapData.stage2.contributingPartName
      }
    };

    handleUpdateSwapData(updated);
  };

  // Add Child Part
  const handleAddChildPart = () => {
    if (!isEditable) return;
    const nextIdx = swapData.stage2.childParts.length + 1;
    const newPart: PsqChildPartSwapItem = {
      id: `part-${Date.now()}`,
      partName: `Child Part ${nextIdx}`,
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

  // Load Preset
  const handleLoadPreset = (presetData: PsqComponentSearchData) => {
    if (!isEditable) return;
    handleUpdateSwapData(presetData);
  };

  return (
    <div className="space-y-4 font-sans select-none text-slate-800" id="psq-swap-analysis-container">
      {/* Top Toolbar / Mode Switcher */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black shadow-xs">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-violet-100 text-violet-800 text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-md">
                PSQ / Shainin Method
              </span>
              <span className="text-xs font-mono text-slate-400 font-bold">
                Mone(Y) &rarr; &Delta;M &rarr; &Delta;P &rarr; Parts &rarr; Red X
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Component Search Method or Swap Analysis
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 font-mono text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('worksheet')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'worksheet'
                  ? 'bg-white text-violet-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>1. Standard Worksheet</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tree_diagram')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'tree_diagram'
                  ? 'bg-white text-violet-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>2. Elimination Tree</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-white text-violet-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
          </div>

          {/* Quick Preset Selector (if editable) */}
          {isEditable && (
            <div className="relative group">
              <button
                type="button"
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold font-mono px-3 py-2 rounded-xl flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Load Sample Case</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 hidden group-hover:block animate-fade-in">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono px-2 py-1 block">
                  Industry Swap Case Presets
                </span>
                {PRESET_EXAMPLES.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadPreset(p.data)}
                    className="w-full text-left p-2 hover:bg-violet-50 rounded-xl transition group/btn flex flex-col space-y-0.5 cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-900 group-hover/btn:text-violet-700">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-slate-500 line-clamp-1">
                      {p.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Info Modal Button */}
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="PSQ / Swap Analysis Method Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER: Split or Single View */}
      <div className={`grid gap-6 ${viewMode === 'split' ? 'grid-cols-1 xl:grid-cols-12' : 'grid-cols-1'}`}>
        
        {/* ========================================================================= */}
        {/* SECTION 1: THE EXACT OFFICIAL WORKSHEET RECREATION */}
        {/* ========================================================================= */}
        {(viewMode === 'worksheet' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'xl:col-span-7' : 'w-full'} bg-white border-2 border-slate-300 rounded-3xl p-6 shadow-sm space-y-6 print:border-black print:p-2`}>
            
            {/* SHEET HEADER */}
            <div className="border-b-2 border-slate-900 pb-4 space-y-3">
              <div className="text-center space-y-1">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950 font-serif">
                  Component search method or Swap Analysis
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs font-bold text-slate-700 font-mono">
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-md">
                    BOB = Best OF Best Product (Good Assembly)
                  </span>
                  <span className="bg-rose-50 text-rose-800 border border-rose-300 px-2.5 py-0.5 rounded-md">
                    WOW = Worst OF Worst Product (Bad Assembly)
                  </span>
                </div>
              </div>

              {/* Product Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs font-mono">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500">Product Name:</label>
                  {isEditable ? (
                    <input
                      type="text"
                      value={swapData.productName || ''}
                      onChange={(e) => handleUpdateSwapData({ ...swapData, productName: e.target.value })}
                      placeholder="e.g. Fuel Pump Sub-Assembly"
                      className="w-full bg-slate-50 border-b-2 border-slate-300 focus:border-slate-900 px-2 py-1 font-bold text-slate-900 outline-hidden"
                    />
                  ) : (
                    <span className="font-bold text-slate-900 border-b border-slate-300 block py-1">{swapData.productName || '—'}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500">Product Number:</label>
                  {isEditable ? (
                    <input
                      type="text"
                      value={swapData.productNumber || ''}
                      onChange={(e) => handleUpdateSwapData({ ...swapData, productNumber: e.target.value })}
                      placeholder="e.g. HPFP-8840-X2"
                      className="w-full bg-slate-50 border-b-2 border-slate-300 focus:border-slate-900 px-2 py-1 font-bold text-slate-900 outline-hidden"
                    />
                  ) : (
                    <span className="font-bold text-slate-900 border-b border-slate-300 block py-1">{swapData.productNumber || '—'}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500">Customer Name:</label>
                  {isEditable ? (
                    <input
                      type="text"
                      value={swapData.customerName || ''}
                      onChange={(e) => handleUpdateSwapData({ ...swapData, customerName: e.target.value })}
                      placeholder="e.g. Mahindra & Mahindra"
                      className="w-full bg-slate-50 border-b-2 border-slate-300 focus:border-slate-900 px-2 py-1 font-bold text-slate-900 outline-hidden"
                    />
                  ) : (
                    <span className="font-bold text-slate-900 border-b border-slate-300 block py-1">{swapData.customerName || '—'}</span>
                  )}
                </div>
              </div>

              {/* Test Result Specification */}
              <div className="text-xs font-mono pt-1">
                <label className="block text-[10px] font-black uppercase text-slate-500">Test Result Specification:</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={swapData.testResultSpecification || ''}
                    onChange={(e) => handleUpdateSwapData({ ...swapData, testResultSpecification: e.target.value })}
                    placeholder="e.g. Output pressure: 180 - 220 bar @ 2000 RPM (Spec min: 180 bar)"
                    className="w-full bg-slate-50 border-b-2 border-slate-300 focus:border-slate-900 px-2 py-1 font-bold text-violet-900 outline-hidden"
                  />
                ) : (
                  <span className="font-bold text-violet-900 border-b border-slate-300 block py-1">{swapData.testResultSpecification || '—'}</span>
                )}
              </div>
            </div>

            {/* ========================================================= */}
            {/* STAGE 0: MEASUREMENT VALIDATION (Delta M vs Delta P) */}
            {/* ========================================================= */}
            <div className="border-2 border-slate-300 rounded-2xl p-4 space-y-4 bg-slate-50/40 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-slate-900 text-white text-xs font-black font-mono px-2.5 py-1 rounded-md uppercase">
                    Stage 0
                  </span>
                  <span className="font-black text-sm uppercase font-mono text-slate-900">
                    Measurement System Repeatability Test
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {isEditable && (
                    <label className="flex items-center space-x-2 text-xs font-bold font-mono bg-white px-3 py-1 rounded-lg border border-slate-300 cursor-pointer shadow-3xs">
                      <input
                        type="checkbox"
                        checked={swapData.stage0.measurementGood}
                        onChange={(e) => handleStage0Change('measurementGood', e.target.checked)}
                        className="rounded text-violet-600 focus:ring-violet-500"
                      />
                      <span>Measurement is Good (&Delta;M Eliminated &rarr; Next to Stage 1)</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left Table */}
                <div className="md:col-span-8 overflow-x-auto">
                  <table className="w-full text-xs font-mono border border-slate-300 rounded-xl overflow-hidden bg-white">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2 text-left w-36">Test Cycle</th>
                        <th className="p-2 text-center bg-emerald-50 text-emerald-950 font-black border-l border-r border-slate-300">
                          BOB (Good Product)
                        </th>
                        <th className="p-2 text-center bg-rose-50 text-rose-950 font-black">
                          WOW (Bad Product)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2 font-bold bg-slate-50">Original value</td>
                        <td className="p-2 text-center border-l border-r border-slate-200">
                          {isEditable ? (
                            <input
                              type="text"
                              value={swapData.stage0.bobOriginal}
                              onChange={(e) => handleStage0Change('bobOriginal', e.target.value)}
                              placeholder="e.g. 215 bar"
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-emerald-700"
                            />
                          ) : (
                            <span className="font-bold text-emerald-700">{swapData.stage0.bobOriginal || '—'}</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {isEditable ? (
                            <input
                              type="text"
                              value={swapData.stage0.wowOriginal}
                              onChange={(e) => handleStage0Change('wowOriginal', e.target.value)}
                              placeholder="e.g. 142 bar"
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-rose-700"
                            />
                          ) : (
                            <span className="font-bold text-rose-700">{swapData.stage0.wowOriginal || '—'}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-bold bg-slate-50">1st Repeat value</td>
                        <td className="p-2 text-center border-l border-r border-slate-200">
                          {isEditable ? (
                            <input
                              type="text"
                              value={swapData.stage0.bobRepeat1}
                              onChange={(e) => handleStage0Change('bobRepeat1', e.target.value)}
                              placeholder="e.g. 214 bar"
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-emerald-700"
                            />
                          ) : (
                            <span className="font-bold text-emerald-700">{swapData.stage0.bobRepeat1 || '—'}</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {isEditable ? (
                            <input
                              type="text"
                              value={swapData.stage0.wowRepeat1}
                              onChange={(e) => handleStage0Change('wowRepeat1', e.target.value)}
                              placeholder="e.g. 140 bar"
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-rose-700"
                            />
                          ) : (
                            <span className="font-bold text-rose-700">{swapData.stage0.wowRepeat1 || '—'}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-bold bg-slate-50">2nd Repeat value</td>
                        <td className="p-2 text-center border-l border-r border-slate-200">
                          {isEditable ? (
                            <input
                              type="text"
                              value={swapData.stage0.bobRepeat2}
                              onChange={(e) => handleStage0Change('bobRepeat2', e.target.value)}
                              placeholder="e.g. 215 bar"
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-emerald-700"
                            />
                          ) : (
                            <span className="font-bold text-emerald-700">{swapData.stage0.bobRepeat2 || '—'}</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {isEditable ? (
                            <input
                              type="text"
                              value={swapData.stage0.wowRepeat2}
                              onChange={(e) => handleStage0Change('wowRepeat2', e.target.value)}
                              placeholder="e.g. 143 bar"
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-rose-700"
                            />
                          ) : (
                            <span className="font-bold text-rose-700">{swapData.stage0.wowRepeat2 || '—'}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-bold bg-slate-50">3rd Repeat value</td>
                        <td className="p-2 text-center border-l border-r border-slate-200">
                          {isEditable ? (
                            <input
                              type="text"
                              value={swapData.stage0.bobRepeat3}
                              onChange={(e) => handleStage0Change('bobRepeat3', e.target.value)}
                              placeholder="e.g. 216 bar"
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-emerald-700"
                            />
                          ) : (
                            <span className="font-bold text-emerald-700">{swapData.stage0.bobRepeat3 || '—'}</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {isEditable ? (
                            <input
                              type="text"
                              value={swapData.stage0.wowRepeat3}
                              onChange={(e) => handleStage0Change('wowRepeat3', e.target.value)}
                              placeholder="e.g. 141 bar"
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-rose-700"
                            />
                          ) : (
                            <span className="font-bold text-rose-700">{swapData.stage0.wowRepeat3 || '—'}</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Stage 0 Mini Tree Graphic on Right */}
                <div className="md:col-span-4 flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl text-center shadow-3xs">
                  <span className="text-[10px] font-black uppercase text-slate-400 font-mono">Stage 0 Tree Branch</span>
                  
                  <div className="mt-2 space-y-2 w-full flex flex-col items-center">
                    {/* Mone(Y) Root */}
                    <div className="px-4 py-1.5 bg-slate-900 text-white font-black font-mono text-xs rounded-md shadow-xs border border-slate-700">
                      Mone(Y)
                    </div>
                    
                    {/* Connecting T */}
                    <div className="w-28 h-4 relative">
                      <div className="absolute left-1/2 -top-2 w-0.5 h-3 bg-slate-800 -translate-x-1/2"></div>
                      <div className="absolute top-1 left-2 right-2 h-0.5 bg-slate-800"></div>
                      <div className="absolute top-1 left-2 w-0.5 h-3 bg-slate-800"></div>
                      <div className="absolute top-1 right-2 w-0.5 h-3 bg-slate-800"></div>
                    </div>

                    {/* Delta M and Delta P */}
                    <div className="flex items-center justify-between w-full max-w-[200px] gap-2 pt-1">
                      {/* Delta M (Diagonal Crossed Out) */}
                      <div className={`relative px-3 py-1.5 rounded-md font-mono text-xs font-black border text-center flex-1 transition ${
                        swapData.stage0.deltaMStatus === 'eliminated'
                          ? 'bg-blue-100 text-slate-700 border-blue-400'
                          : 'bg-rose-100 text-rose-900 border-rose-400'
                      }`}>
                        <span>&Delta;M</span>
                        {swapData.stage0.deltaMStatus === 'eliminated' && (
                          <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-blue-700 stroke-2">
                            <line x1="0" y1="100%" x2="100%" y2="0" />
                          </svg>
                        )}
                      </div>

                      {/* Delta P */}
                      <div className={`px-3 py-1.5 rounded-md font-mono text-xs font-black border text-center flex-1 transition ${
                        swapData.stage0.deltaPStatus === 'active'
                          ? 'bg-white text-slate-950 border-slate-900 shadow-3xs ring-2 ring-violet-500/30'
                          : 'bg-slate-100 text-slate-500 border-slate-300'
                      }`}>
                        <span>&Delta;P</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage 0 Rule Text */}
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-2.5 text-xs text-blue-950 font-mono font-medium flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  <strong>Rule:</strong> (If BOB remains BOB &amp; WOW remains WOW, means <strong>measurement</strong> is Good, next go for <strong>Stage1</strong>)
                </span>
              </div>
            </div>

            {/* ========================================================= */}
            {/* STAGE 1: DISASSEMBLY & RE-ASSEMBLY (Process vs Product) */}
            {/* ========================================================= */}
            <div className="border-2 border-slate-300 rounded-2xl p-4 space-y-4 bg-slate-50/40 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-slate-900 text-white text-xs font-black font-mono px-2.5 py-1 rounded-md uppercase">
                    Stage 1
                  </span>
                  <span className="font-black text-sm uppercase font-mono text-slate-900">
                    Dis-assembly &amp; Re-assembly Test (Process vs Product)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {isEditable && (
                    <label className="flex items-center space-x-2 text-xs font-bold font-mono bg-white px-3 py-1 rounded-lg border border-slate-300 cursor-pointer shadow-3xs">
                      <input
                        type="checkbox"
                        checked={swapData.stage1.processGood}
                        onChange={(e) => handleStage1Change('processGood', e.target.checked)}
                        className="rounded text-violet-600 focus:ring-violet-500"
                      />
                      <span>Process is Good (Assembly Process Eliminated &rarr; Next to Stage 2)</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="text-xs font-medium text-slate-600 font-mono italic">
                Do the dis-assembly and again Re-assembly of BOB parts &amp; WOW parts &amp; record the values:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left Table */}
                <div className="md:col-span-8 overflow-x-auto">
                  <table className="w-full text-xs font-mono border border-slate-300 rounded-xl overflow-hidden bg-white">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2 text-left w-36">Repeat Test (3 Times)</th>
                        <th className="p-2 text-center bg-emerald-50 text-emerald-950 font-black border-l border-r border-slate-300">
                          BOB Re-assembled
                        </th>
                        <th className="p-2 text-center bg-rose-50 text-rose-950 font-black">
                          WOW Re-assembled
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2 font-bold bg-slate-50">1st Repeat value</td>
                        <td className="p-2 text-center border-l border-r border-slate-200">
                          {isEditable ? (
                            <input
                              type="text"
                              value={swapData.stage1.bobRepeat1}
                              onChange={(e) => handleStage1Change('bobRepeat1', e.target.value)}
                              placeholder="e.g. 214 bar"
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-emerald-700"
                            />
                          ) : (
                            <span className="font-bold text-emerald-700">{swapData.stage1.bobRepeat1 || '—'}</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {isEditable ? (
                            <input
                              type="text"
                              value={swapData.stage1.wowRepeat1}
                              onChange={(e) => handleStage1Change('wowRepeat1', e.target.value)}
                              placeholder="e.g. 142 bar"
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-rose-700"
                            />
                          ) : (
                            <span className="font-bold text-rose-700">{swapData.stage1.wowRepeat1 || '—'}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-bold bg-slate-50">2nd Repeat value</td>
                        <td className="p-2 text-center border-l border-r border-slate-200">
                          {isEditable ? (
                            <input
                              type="text"
                              value={swapData.stage1.bobRepeat2}
                              onChange={(e) => handleStage1Change('bobRepeat2', e.target.value)}
                              placeholder="e.g. 215 bar"
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-emerald-700"
                            />
                          ) : (
                            <span className="font-bold text-emerald-700">{swapData.stage1.bobRepeat2 || '—'}</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {isEditable ? (
                            <input
                              type="text"
                              value={swapData.stage1.wowRepeat2}
                              onChange={(e) => handleStage1Change('wowRepeat2', e.target.value)}
                              placeholder="e.g. 140 bar"
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-rose-700"
                            />
                          ) : (
                            <span className="font-bold text-rose-700">{swapData.stage1.wowRepeat2 || '—'}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-bold bg-slate-50">3rd Repeat value</td>
                        <td className="p-2 text-center border-l border-r border-slate-200">
                          {isEditable ? (
                            <input
                              type="text"
                              value={swapData.stage1.bobRepeat3}
                              onChange={(e) => handleStage1Change('bobRepeat3', e.target.value)}
                              placeholder="e.g. 215 bar"
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-emerald-700"
                            />
                          ) : (
                            <span className="font-bold text-emerald-700">{swapData.stage1.bobRepeat3 || '—'}</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {isEditable ? (
                            <input
                              type="text"
                              value={swapData.stage1.wowRepeat3}
                              onChange={(e) => handleStage1Change('wowRepeat3', e.target.value)}
                              placeholder="e.g. 141 bar"
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-rose-700"
                            />
                          ) : (
                            <span className="font-bold text-rose-700">{swapData.stage1.wowRepeat3 || '—'}</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Stage 1 Mini Tree Graphic on Right */}
                <div className="md:col-span-4 flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl text-center shadow-3xs">
                  <span className="text-[10px] font-black uppercase text-slate-400 font-mono">Stage 1 Tree Branch</span>
                  
                  <div className="mt-2 space-y-2 w-full flex flex-col items-center">
                    {/* Delta P Root */}
                    <div className="px-4 py-1.5 bg-slate-900 text-white font-black font-mono text-xs rounded-md shadow-xs border border-slate-700">
                      &Delta;P
                    </div>
                    
                    {/* Connecting T */}
                    <div className="w-36 h-4 relative">
                      <div className="absolute left-1/2 -top-2 w-0.5 h-3 bg-slate-800 -translate-x-1/2"></div>
                      <div className="absolute top-1 left-2 right-2 h-0.5 bg-slate-800"></div>
                      <div className="absolute top-1 left-2 w-0.5 h-3 bg-slate-800"></div>
                      <div className="absolute top-1 right-2 w-0.5 h-3 bg-slate-800"></div>
                    </div>

                    {/* Parts and Assembly Process */}
                    <div className="flex items-center justify-between w-full max-w-[240px] gap-2 pt-1">
                      {/* Parts (Product) */}
                      <div className={`px-2.5 py-1.5 rounded-md font-mono text-[11px] font-black border text-center flex-1 transition ${
                        swapData.stage1.partsStatus === 'active'
                          ? 'bg-white text-slate-950 border-slate-900 shadow-3xs ring-2 ring-violet-500/30'
                          : 'bg-slate-100 text-slate-500 border-slate-300'
                      }`}>
                        <span>Parts</span>
                      </div>

                      {/* Assembly Process (Diagonal Crossed Out) */}
                      <div className={`relative px-2 py-1.5 rounded-md font-mono text-[10px] font-black border text-center flex-1 transition ${
                        swapData.stage1.assemblyProcessStatus === 'eliminated'
                          ? 'bg-blue-100 text-slate-700 border-blue-400'
                          : 'bg-rose-100 text-rose-900 border-rose-400'
                      }`}>
                        <span>Assembly process</span>
                        {swapData.stage1.assemblyProcessStatus === 'eliminated' && (
                          <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-blue-700 stroke-2">
                            <line x1="0" y1="100%" x2="100%" y2="0" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage 1 Rule Text */}
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-2.5 text-xs text-blue-950 font-mono font-medium flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  <strong>Rule:</strong> (If BOB remains BOB &amp; WOW remains WOW, means <strong>Process</strong> is Good, next go for <strong>Stage2</strong>)
                </span>
              </div>
            </div>

            {/* ========================================================= */}
            {/* STAGE 2: SWAPPING INDIVIDUAL CHILD PARTS IN BOB & WOW */}
            {/* ========================================================= */}
            <div className="border-2 border-slate-300 rounded-2xl p-4 space-y-4 bg-slate-50/40 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-slate-900 text-white text-xs font-black font-mono px-2.5 py-1 rounded-md uppercase">
                    Stage 2
                  </span>
                  <span className="font-black text-sm uppercase font-mono text-slate-900">
                    Swapping Individual Child Parts in the BOB &amp; WOW Product
                  </span>
                </div>
                {isEditable && (
                  <button
                    type="button"
                    onClick={handleAddChildPart}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition cursor-pointer shadow-3xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Child Part Row</span>
                  </button>
                )}
              </div>

              {/* Two Column Swap Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono border border-slate-300 rounded-xl overflow-hidden bg-white">
                  <thead className="bg-slate-900 text-white text-[11px] font-black border-b border-slate-800">
                    <tr>
                      <th className="p-2.5 text-left border-r border-slate-800 w-1/2 bg-amber-950/90 text-amber-200">
                        🔄 Swap: WOW product in BOB product
                      </th>
                      <th className="p-2.5 text-left w-1/2 bg-indigo-950/90 text-indigo-200">
                        🔁 Swap: BOB product in WOW product (Confirmation)
                      </th>
                      {isEditable && <th className="p-2.5 text-center w-12 bg-slate-900">Act</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {swapData.stage2.childParts.map((item, idx) => (
                      <tr key={item.id || idx} className={`hover:bg-slate-50/90 transition ${
                        item.isDefective ? 'bg-amber-50/80 border-2 border-amber-500' : ''
                      }`}>
                        {/* Left Swap: WOW in BOB */}
                        <td className="p-3 border-r border-slate-200 align-top">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-slate-400">Child Part #{idx + 1}:</span>
                              {item.isDefective && (
                                <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1 shadow-3xs animate-pulse">
                                  <Flame className="w-3 h-3" /> RED X ROOT CAUSE
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {isEditable ? (
                                <input
                                  type="text"
                                  value={item.partName}
                                  onChange={(e) => handleUpdateChildPart(idx, { partName: e.target.value })}
                                  placeholder="Child Part Name..."
                                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-bold text-slate-900 focus:bg-white"
                                />
                              ) : (
                                <span className="font-bold text-slate-900 block">{item.partName}</span>
                              )}
                            </div>

                            <div className="grid grid-cols-12 gap-2 pt-1">
                              <div className="col-span-8">
                                <label className="block text-[9px] uppercase text-slate-400 font-bold">Result Value (WOW in BOB):</label>
                                {isEditable ? (
                                  <input
                                    type="text"
                                    value={item.wowInBobValue}
                                    onChange={(e) => handleUpdateChildPart(idx, { wowInBobValue: e.target.value })}
                                    placeholder="e.g. 141 bar (Drop)"
                                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800"
                                  />
                                ) : (
                                  <span className="font-bold text-slate-800 text-xs">{item.wowInBobValue || '—'}</span>
                                )}
                              </div>
                              <div className="col-span-4">
                                <label className="block text-[9px] uppercase text-slate-400 font-bold">Result:</label>
                                {isEditable ? (
                                  <select
                                    value={item.wowInBobResult}
                                    onChange={(e) => handleUpdateChildPart(idx, { wowInBobResult: e.target.value as any })}
                                    className={`w-full border rounded px-1.5 py-1 text-xs font-black ${
                                      item.wowInBobResult === 'WOW' ? 'bg-red-100 text-red-900 border-red-400' :
                                      item.wowInBobResult === 'BOB' ? 'bg-emerald-100 text-emerald-900 border-emerald-400' : 'bg-slate-50 border-slate-300'
                                    }`}
                                  >
                                    <option value="">Select...</option>
                                    <option value="BOB">BOB (No effect)</option>
                                    <option value="WOW">WOW (Turned Bad 🚨)</option>
                                  </select>
                                ) : (
                                  <span className={`px-2 py-0.5 rounded text-xs font-black inline-block ${
                                    item.wowInBobResult === 'WOW' ? 'bg-red-100 text-red-900' :
                                    item.wowInBobResult === 'BOB' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {item.wowInBobResult || '—'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Right Swap: BOB in WOW */}
                        <td className="p-3 align-top">
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 block">Confirmation Check with {item.partName || `Part #${idx+1}`}:</span>
                            <div className="grid grid-cols-12 gap-2 pt-1">
                              <div className="col-span-8">
                                <label className="block text-[9px] uppercase text-slate-400 font-bold">Result Value (BOB in WOW):</label>
                                {isEditable ? (
                                  <input
                                    type="text"
                                    value={item.bobInWowValue}
                                    onChange={(e) => handleUpdateChildPart(idx, { bobInWowValue: e.target.value })}
                                    placeholder="e.g. 216 bar (Recovered)"
                                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800"
                                  />
                                ) : (
                                  <span className="font-bold text-slate-800 text-xs">{item.bobInWowValue || '—'}</span>
                                )}
                              </div>
                              <div className="col-span-4">
                                <label className="block text-[9px] uppercase text-slate-400 font-bold">Result:</label>
                                {isEditable ? (
                                  <select
                                    value={item.bobInWowResult}
                                    onChange={(e) => handleUpdateChildPart(idx, { bobInWowResult: e.target.value as any })}
                                    className={`w-full border rounded px-1.5 py-1 text-xs font-black ${
                                      item.bobInWowResult === 'BOB' ? 'bg-emerald-100 text-emerald-900 border-emerald-400' :
                                      item.bobInWowResult === 'WOW' ? 'bg-red-100 text-red-900 border-red-400' : 'bg-slate-50 border-slate-300'
                                    }`}
                                  >
                                    <option value="">Select...</option>
                                    <option value="BOB">BOB (Recovered ⭐)</option>
                                    <option value="WOW">WOW (Still Bad)</option>
                                  </select>
                                ) : (
                                  <span className={`px-2 py-0.5 rounded text-xs font-black inline-block ${
                                    item.bobInWowResult === 'BOB' ? 'bg-emerald-100 text-emerald-900' :
                                    item.bobInWowResult === 'WOW' ? 'bg-red-100 text-red-900' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {item.bobInWowResult || '—'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Remove Action Button */}
                        {isEditable && (
                          <td className="p-2 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => handleRemoveChildPart(idx)}
                              className="text-slate-400 hover:text-red-600 transition p-1"
                              title="Delete row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Stage 2 Decision Rules Box */}
              <div className="space-y-2 pt-2">
                <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 font-mono space-y-1.5">
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>Root Cause Identification Rule:</strong> (If WOW product <span className="underline font-black text-red-700">{swapData.stage2.contributingPartName || 'Child Part'}</span> assembled in BOB product &amp; result comes <strong>WOW</strong>, means that child part contributes to problem. Kindly check that child dimensionally or as per drawing.)
                    </div>
                  </div>
                  <div className="flex items-start gap-2 pt-1 border-t border-amber-200/60">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>Confirmation Rule:</strong> (For confirmation, If BOB product <span className="underline font-black text-emerald-700">{swapData.stage2.contributingPartName || 'Child Part'}</span> assembled in WOW product &amp; result comes <strong>BOB</strong>.)
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: THE AUTHENTIC GRAPHIC ELIMINATION TREE DIAGRAM */}
        {/* ========================================================================= */}
        {(viewMode === 'tree_diagram' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'xl:col-span-5' : 'w-full'} bg-slate-900 text-white border-2 border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 flex flex-col justify-between`}>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-sm font-black uppercase tracking-wider font-mono text-slate-200">
                    PSQ Elimination Hierarchy Tree
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  Graphic Representation
                </span>
              </div>

              {/* VISUAL TREE SVG & BOXES CONTAINER */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-8 flex flex-col items-center overflow-x-auto min-w-[320px]">
                
                {/* 1. ROOT: Mone(Y) */}
                <div className="flex flex-col items-center">
                  <div className="px-6 py-2.5 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white font-black font-mono text-sm rounded-xl border-2 border-slate-500 shadow-lg tracking-wider">
                    Mone(Y)
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 mt-1">Total Problem Variation (Y)</span>
                  
                  {/* Stem Down */}
                  <div className="w-0.5 h-6 bg-slate-600"></div>
                </div>

                {/* 2. LEVEL 1: Delta M and Delta P */}
                <div className="w-full max-w-md flex flex-col items-center">
                  {/* Horizontal Bar */}
                  <div className="w-48 h-0.5 bg-slate-600 relative">
                    <div className="absolute left-0 top-0 w-0.5 h-6 bg-slate-600"></div>
                    <div className="absolute right-0 top-0 w-0.5 h-6 bg-slate-600"></div>
                  </div>

                  <div className="flex items-start justify-between w-full max-w-[280px] pt-6 gap-6">
                    
                    {/* LEFT: Delta M (Measurement) */}
                    <div className="flex flex-col items-center flex-1">
                      <div className={`relative px-4 py-2 rounded-xl font-mono text-xs font-black border-2 text-center w-full transition ${
                        swapData.stage0.deltaMStatus === 'eliminated'
                          ? 'bg-blue-900/40 text-blue-200 border-blue-500/80 shadow-inner'
                          : 'bg-rose-950 text-rose-200 border-rose-500'
                      }`}>
                        <span>&Delta;M</span>
                        <span className="block text-[8px] font-medium opacity-80">(Measurement)</span>

                        {/* Diagonal Slash if eliminated */}
                        {swapData.stage0.deltaMStatus === 'eliminated' && (
                          <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-blue-400 stroke-2">
                            <line x1="0" y1="100%" x2="100%" y2="0" />
                          </svg>
                        )}
                      </div>
                      <span className="text-[8px] font-mono text-blue-400 mt-1 font-bold">
                        {swapData.stage0.deltaMStatus === 'eliminated' ? 'Eliminated in Stage 0' : 'Measurement Defect'}
                      </span>
                    </div>

                    {/* RIGHT: Delta P (Process & Product) */}
                    <div className="flex flex-col items-center flex-1">
                      <div className={`px-4 py-2 rounded-xl font-mono text-xs font-black border-2 text-center w-full transition ${
                        swapData.stage0.deltaPStatus === 'active'
                          ? 'bg-slate-800 text-white border-violet-400 shadow-md ring-2 ring-violet-500/40'
                          : 'bg-slate-900 text-slate-500 border-slate-700'
                      }`}>
                        <span>&Delta;P</span>
                        <span className="block text-[8px] font-medium opacity-80">(Process &amp; Product)</span>
                      </div>
                      <span className="text-[8px] font-mono text-emerald-400 mt-1 font-bold">
                        Active Branch &rarr;
                      </span>

                      {/* Stem Down from Delta P to Stage 1 */}
                      <div className="w-0.5 h-6 bg-slate-600 mt-2"></div>
                    </div>

                  </div>
                </div>

                {/* 3. LEVEL 2: Under Delta P -> Parts vs Assembly process */}
                <div className="w-full max-w-md flex flex-col items-center -mt-2">
                  {/* Horizontal Bar */}
                  <div className="w-56 h-0.5 bg-slate-600 relative">
                    <div className="absolute left-0 top-0 w-0.5 h-6 bg-slate-600"></div>
                    <div className="absolute right-0 top-0 w-0.5 h-6 bg-slate-600"></div>
                  </div>

                  <div className="flex items-start justify-between w-full max-w-[320px] pt-6 gap-6">
                    
                    {/* LEFT: Parts (Product) */}
                    <div className="flex flex-col items-center flex-1">
                      <div className={`px-3 py-2 rounded-xl font-mono text-xs font-black border-2 text-center w-full transition ${
                        swapData.stage1.partsStatus === 'active'
                          ? 'bg-slate-800 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/40'
                          : 'bg-slate-900 text-slate-500 border-slate-700'
                      }`}>
                        <span>Parts</span>
                        <span className="block text-[8px] font-medium opacity-80">(Product Child Parts)</span>
                      </div>
                      <span className="text-[8px] font-mono text-emerald-400 mt-1 font-bold">
                        Active to Stage 2 &rarr;
                      </span>

                      {/* Stem Down to Child Parts */}
                      <div className="w-0.5 h-6 bg-slate-600 mt-2"></div>
                    </div>

                    {/* RIGHT: Assembly process (Eliminated) */}
                    <div className="flex flex-col items-center flex-1">
                      <div className={`relative px-3 py-2 rounded-xl font-mono text-[11px] font-black border-2 text-center w-full transition ${
                        swapData.stage1.assemblyProcessStatus === 'eliminated'
                          ? 'bg-blue-900/40 text-blue-200 border-blue-500/80 shadow-inner'
                          : 'bg-rose-950 text-rose-200 border-rose-500'
                      }`}>
                        <span>Assembly process</span>
                        <span className="block text-[8px] font-medium opacity-80">(Torque / Seating)</span>

                        {/* Diagonal Slash if eliminated */}
                        {swapData.stage1.assemblyProcessStatus === 'eliminated' && (
                          <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-blue-400 stroke-2">
                            <line x1="0" y1="100%" x2="100%" y2="0" />
                          </svg>
                        )}
                      </div>
                      <span className="text-[8px] font-mono text-blue-400 mt-1 font-bold">
                        {swapData.stage1.assemblyProcessStatus === 'eliminated' ? 'Eliminated in Stage 1' : 'Assembly Defect'}
                      </span>
                    </div>

                  </div>
                </div>

                {/* 4. LEVEL 3: Under Parts -> Individual Child Parts Branches */}
                <div className="w-full flex flex-col items-center -mt-2">
                  {/* Wide Horizontal Line connecting all child parts */}
                  <div className="w-full max-w-sm h-0.5 bg-slate-600 relative">
                    <div className="absolute left-0 top-0 w-0.5 h-6 bg-slate-600"></div>
                    <div className="absolute right-0 top-0 w-0.5 h-6 bg-slate-600"></div>
                    <div className="absolute left-1/4 top-0 w-0.5 h-6 bg-slate-600"></div>
                    <div className="absolute left-1/2 top-0 w-0.5 h-6 bg-slate-600"></div>
                    <div className="absolute left-3/4 top-0 w-0.5 h-6 bg-slate-600"></div>
                  </div>

                  {/* Child Parts Boxes Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-6 w-full max-w-xl">
                    {swapData.stage2.childParts.map((part, pIdx) => {
                      const isRedX = part.isDefective || part.status === 'target';
                      const isElim = part.status === 'eliminated' || (part.wowInBobResult === 'BOB' && !isRedX);

                      return (
                        <div key={part.id || pIdx} className="flex flex-col items-center">
                          <div className={`relative px-2.5 py-2 rounded-xl font-mono text-[10px] font-black border-2 text-center w-full transition ${
                            isRedX
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xl ring-4 ring-amber-500/50 scale-105 z-10'
                              : isElim
                              ? 'bg-blue-900/40 text-blue-200 border-blue-500/80 shadow-inner'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            <span className="block truncate font-bold" title={part.partName}>
                              {part.partName || `Part #${pIdx + 1}`}
                            </span>
                            <span className="block text-[8px] opacity-75 mt-0.5">
                              {isRedX ? '🎯 RED X' : isElim ? 'Eliminated' : 'Testing'}
                            </span>

                            {/* Diagonal Slash for eliminated parts */}
                            {isElim && !isRedX && (
                              <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-blue-400 stroke-2">
                                <line x1="0" y1="100%" x2="100%" y2="0" />
                              </svg>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Big X Target Card */}
              {swapData.stage2.contributingPartName && (
                <div className="bg-amber-950/80 border-2 border-amber-500 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                      <Target className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase font-mono block">
                        Isolate &amp; Verified Root Cause (Red X)
                      </span>
                      <h4 className="text-base font-black text-amber-100 font-mono">
                        {swapData.stage2.contributingPartName}
                      </h4>
                    </div>
                  </div>
                  <span className="bg-amber-500 text-slate-950 text-xs font-black font-mono px-3 py-1.5 rounded-xl uppercase tracking-wider">
                    BIG X Identified
                  </span>
                </div>
              )}
            </div>

            {/* Tree Summary Footer Note */}
            <div className="border-t border-slate-800 pt-3 text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Method: Mone(Y) &rarr; &Delta;M &rarr; &Delta;P &rarr; Parts</span>
              <span className="text-amber-400 font-bold">Standard PSQ Strategy</span>
            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* HELP / METHODOLOGY EXPLANATION MODAL */}
      {/* ========================================================================= */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <GitFork className="w-5 h-5 text-violet-400" />
                <span className="font-mono text-xs font-black uppercase tracking-wider">
                  PSQ &amp; Component Search / Swap Analysis Guide
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-700 leading-relaxed font-sans">
              <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-2">
                <h4 className="font-black text-sm text-violet-900 uppercase font-mono">
                  Why Use Component Search (Swap Analysis)?
                </h4>
                <p>
                  Component search eliminates guesswork by methodically isolating whether a defect comes from the <strong>Measurement System (&Delta;M)</strong>, the <strong>Assembly Process</strong>, or a specific <strong>Child Part</strong>.
                </p>
              </div>

              <div className="space-y-3 font-mono">
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1">
                  <span className="font-black text-slate-900 text-xs block uppercase">1. Start with Mone(Y)</span>
                  <p className="text-[11px] text-slate-600">
                    The total observed variance / defect symptom in the finished product is designated as Mone(Y).
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1">
                  <span className="font-black text-slate-900 text-xs block uppercase">2. Stage 0: Evaluate &Delta;M (Measurement)</span>
                  <p className="text-[11px] text-slate-600">
                    Test BOB and WOW 3 times without disassembly. If BOB stays BOB and WOW stays WOW, &Delta;M is crossed out (eliminated) and we move down &Delta;P.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1">
                  <span className="font-black text-slate-900 text-xs block uppercase">3. Stage 1: Evaluate &Delta;P &rarr; Assembly Process vs Parts</span>
                  <p className="text-[11px] text-slate-600">
                    Disassemble and re-assemble BOB with BOB parts, and WOW with WOW parts. If BOB stays BOB and WOW stays WOW, the <strong>Assembly Process</strong> is eliminated, proving the root cause lies in one of the <strong>Child Parts</strong>.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1">
                  <span className="font-black text-slate-900 text-xs block uppercase">4. Stage 2: Swap Child Parts &amp; Confirm Red X</span>
                  <p className="text-[11px] text-slate-600">
                    Swap one child part at a time. The true defective part (Red X) will turn BOB into WOW when inserted into BOB, and will turn WOW into BOB when the good part is inserted into WOW.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs px-5 py-2 rounded-xl transition"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PsqEliminationTree;
