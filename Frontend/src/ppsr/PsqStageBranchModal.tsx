import React from 'react';
import { PsqComponentSearchData } from '../types';
import { PsqGraphicTree } from './PsqGraphicTree';
import { X, GitFork, Info, ArrowRight } from 'lucide-react';

interface PsqStageBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageIndex: number; // 0, 1, 2, or -1 for full tree
  swapData: PsqComponentSearchData;
  onNavigateToStage?: (stageIndex: number) => void;
}

export const PsqStageBranchModal: React.FC<PsqStageBranchModalProps> = ({
  isOpen,
  onClose,
  stageIndex,
  swapData,
  onNavigateToStage
}) => {
  if (!isOpen) return null;

  const stageTitles: Record<number, { title: string; subtitle: string; rule: string; focus: 'all' | 'stage0' | 'stage1' | 'stage2' }> = {
    0: {
      title: "Stage 0 Tree Branch: Measurement Repeatability",
      subtitle: "Mone(Y) → ΔM (Measurement Gauge) vs ΔP (Process & Product)",
      rule: "Rule: If BOB remains BOB and WOW remains WOW across repeats without disassembly, the Measurement System (ΔM) is ELIMINATED with a diagonal slash and we proceed to Stage 1 (ΔP).",
      focus: 'stage0'
    },
    1: {
      title: "Stage 1 Tree Branch: Assembly Process vs Product",
      subtitle: "ΔP → Assembly Process (Torque / Method) vs Parts (Product)",
      rule: "Rule: If disassembled and re-assembled BOB stays BOB and WOW stays WOW, the Assembly Process is ELIMINATED and variation is proven to lie within Child Parts.",
      focus: 'stage1'
    },
    2: {
      title: "Stage 2 Tree Branch: Child Part Swaps & Red X Isolation",
      subtitle: "Parts → Individual Child Components (Swapping Analysis)",
      rule: "Rule: Swapping the true defective part (Red X) into BOB turns the assembly into WOW. Re-inserting the good part into WOW restores it to BOB.",
      focus: 'stage2'
    },
    [-1]: {
      title: "Full PSQ Elimination Hierarchy Tree",
      subtitle: "Complete 3-Stage Component Search Flow (Mone(Y) → ΔM → ΔP → Parts → Red X)",
      rule: "Overall Rule: Methodically isolate root cause by eliminating measurement, assembly process, and individual non-contributing components.",
      focus: 'all'
    }
  };

  const currentStageInfo = stageTitles[stageIndex] || stageTitles[-1];

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border-2 border-slate-300 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black shadow-xs">
              <GitFork className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider font-mono text-violet-300 block">
                {stageIndex === -1 ? 'Full Tree Diagram' : `Stage ${stageIndex} Visual Branch`}
              </span>
              <h3 className="text-sm sm:text-base font-black text-white font-mono">
                {currentStageInfo.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs">
          
          {/* Decision Rule Callout */}
          <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-3.5 flex items-start space-x-2.5 text-blue-950">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-[11px] uppercase tracking-wider text-blue-900 font-black">Methodology Guidance:</strong>
              <p className="text-[11px] leading-relaxed text-blue-900/90 mt-0.5">{currentStageInfo.rule}</p>
            </div>
          </div>

          {/* Render White Background Graphic Tree */}
          <PsqGraphicTree
            swapData={swapData}
            activeStageFocus={currentStageInfo.focus}
          />
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500 font-mono">
            {currentStageInfo.subtitle}
          </span>
          <div className="flex items-center space-x-2">
            {stageIndex >= 0 && stageIndex < 2 && onNavigateToStage && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToStage(stageIndex + 1);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold text-xs px-4 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <span>Proceed to Stage {stageIndex + 1}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
