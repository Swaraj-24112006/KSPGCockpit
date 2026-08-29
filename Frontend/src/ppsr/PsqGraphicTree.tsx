import React from 'react';
import { PsqComponentSearchData, PsqChildPartSwapItem } from '../types';
import { Target, Flame, GitFork, Printer, Sparkles, CheckCircle2, XCircle } from 'lucide-react';

interface PsqGraphicTreeProps {
  swapData: PsqComponentSearchData;
  activeStageFocus?: 'all' | 'stage0' | 'stage1' | 'stage2';
  compact?: boolean;
  isEditable?: boolean;
  onOpenStage?: (stage: number) => void;
  onToggleNode?: (nodeType: 'deltaM' | 'deltaP' | 'assembly' | 'parts' | 'childPart', index?: number) => void;
}

export const PsqGraphicTree: React.FC<PsqGraphicTreeProps> = ({
  swapData,
  activeStageFocus = 'all',
  compact = false,
  isEditable = false,
  onOpenStage,
  onToggleNode
}) => {
  const deltaM = swapData.stage0.deltaMStatus;
  const deltaP = swapData.stage0.deltaPStatus;
  const assembly = swapData.stage1.assemblyProcessStatus;
  const parts = swapData.stage1.partsStatus;
  const childParts = swapData.stage2.childParts || [];
  const targetPart = childParts.find(p => p.isDefective || p.status === 'target');

  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3.5 text-slate-900 font-sans" id="psq-graphic-elimination-tree">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-slate-950 text-white flex items-center justify-center font-bold shadow-2xs">
            <GitFork className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider font-mono text-slate-900 flex items-center gap-1.5">
              <span>PSQ Elimination Tree Canvas</span>
              {isEditable && (
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-bold px-1.5 py-0.2 rounded">
                  Interactive
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <span className="bg-sky-50 text-sky-900 border border-sky-300 px-2 py-0.5 rounded-lg font-bold text-[9px] flex items-center gap-1">
            <span className="text-sky-600 font-black">/</span> Slash = Eliminated
          </span>
          <span className="bg-amber-100 text-amber-950 border border-amber-400 px-2 py-0.5 rounded-lg font-bold text-[9px] flex items-center gap-1">
            <Flame className="w-2.5 h-2.5 text-amber-600" /> Gold = Red X
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TREE PURE WHITE CANVAS CONTAINER */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col items-center overflow-x-auto min-w-[320px] select-none">
        
        {/* LEVEL 0: ROOT Mone(Y) */}
        <div className="flex flex-col items-center">
          <div className="px-6 py-2.5 bg-slate-950 text-white font-black font-mono text-sm rounded-2xl border-2 border-slate-800 shadow-md tracking-wider flex items-center space-x-2">
            <span>Mone(Y) : Total Defect Variation</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 mt-1 font-bold">
            {swapData.productName || 'Final Assembled Unit'} ({swapData.testResultSpecification || 'Output Spec'})
          </span>
          
          {/* Vertical Stem Down */}
          <div className="w-0.5 h-6 bg-slate-800"></div>
        </div>

        {/* LEVEL 1: Delta M and Delta P */}
        <div className="w-full max-w-xl flex flex-col items-center">
          {/* Horizontal Branch Bar */}
          <div className="w-64 sm:w-72 h-0.5 bg-slate-800 relative">
            <div className="absolute left-0 top-0 w-0.5 h-6 bg-slate-800"></div>
            <div className="absolute right-0 top-0 w-0.5 h-6 bg-slate-800"></div>
          </div>

          <div className="flex items-start justify-between w-full max-w-[420px] pt-6 gap-6 sm:gap-10">
            
            {/* LEFT: Delta M (Measurement) */}
            <div className="flex flex-col items-center flex-1">
              <div 
                onClick={() => isEditable && onToggleNode && onToggleNode('deltaM')}
                className={`relative px-4 py-3 rounded-2xl font-mono text-xs font-black border-2 text-center w-full transition shadow-xs ${
                  isEditable ? 'cursor-pointer hover:scale-105' : ''
                } ${
                  deltaM === 'eliminated'
                    ? 'bg-sky-50 text-sky-950 border-sky-400'
                    : deltaM === 'target'
                    ? 'bg-rose-100 text-rose-950 border-rose-500 ring-4 ring-rose-200'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                <span className="text-sm sm:text-base font-black">&Delta;M</span>
                <span className="block text-[10px] font-medium text-slate-600 mt-0.5">Measurement System</span>

                {/* Clean Diagonal Slash if eliminated */}
                {deltaM === 'eliminated' && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-sky-700 stroke-2">
                    <line x1="6" y1="88%" x2="94%" y2="12%" />
                  </svg>
                )}
              </div>

              <span className={`text-[10px] font-mono mt-1.5 font-bold ${
                deltaM === 'eliminated' ? 'text-sky-700' : deltaM === 'target' ? 'text-rose-700' : 'text-slate-400'
              }`}>
                {deltaM === 'eliminated' ? '✅ Eliminated (Repeatable)' : deltaM === 'target' ? '🚨 Measurement Defect' : 'Stage 0 Testing'}
              </span>

              {onOpenStage && (
                <button
                  type="button"
                  onClick={() => onOpenStage(0)}
                  className="mt-1 text-[10px] text-indigo-600 hover:text-indigo-800 underline font-mono cursor-pointer font-bold"
                >
                  Stage 0 Card &rarr;
                </button>
              )}
            </div>

            {/* RIGHT: Delta P (Process & Product) */}
            <div className="flex flex-col items-center flex-1">
              <div 
                onClick={() => isEditable && onToggleNode && onToggleNode('deltaP')}
                className={`px-4 py-3 rounded-2xl font-mono text-xs font-black border-2 text-center w-full transition shadow-xs ${
                  isEditable ? 'cursor-pointer hover:scale-105' : ''
                } ${
                  deltaP === 'active'
                    ? 'bg-violet-50 text-violet-950 border-violet-500 ring-2 ring-violet-200'
                    : 'bg-white text-slate-500 border-slate-300'
                }`}
              >
                <span className="text-sm sm:text-base font-black">&Delta;P</span>
                <span className="block text-[10px] font-medium text-slate-600 mt-0.5">Process &amp; Product</span>
              </div>

              <span className={`text-[10px] font-mono mt-1.5 font-bold ${
                deltaP === 'active' ? 'text-violet-700' : 'text-slate-400'
              }`}>
                {deltaP === 'active' ? '⚡ Active Problem Branch' : 'Pending'}
              </span>

              {/* Stem Down from Delta P to Stage 1 */}
              {(activeStageFocus === 'all' || activeStageFocus === 'stage1' || activeStageFocus === 'stage2') && (
                <div className="w-0.5 h-6 bg-slate-800 mt-2"></div>
              )}
            </div>

          </div>
        </div>

        {/* LEVEL 2: Under Delta P -> Parts vs Assembly Process */}
        {(activeStageFocus === 'all' || activeStageFocus === 'stage1' || activeStageFocus === 'stage2') && (
          <div className="w-full max-w-xl flex flex-col items-center -mt-2">
            {/* Horizontal Branch Bar */}
            <div className="w-72 sm:w-80 h-0.5 bg-slate-800 relative">
              <div className="absolute left-0 top-0 w-0.5 h-6 bg-slate-800"></div>
              <div className="absolute right-0 top-0 w-0.5 h-6 bg-slate-800"></div>
            </div>

            <div className="flex items-start justify-between w-full max-w-[460px] pt-6 gap-6 sm:gap-10">
              
              {/* LEFT: Parts (Product) */}
              <div className="flex flex-col items-center flex-1">
                <div 
                  onClick={() => isEditable && onToggleNode && onToggleNode('parts')}
                  className={`px-4 py-3 rounded-2xl font-mono text-xs font-black border-2 text-center w-full transition shadow-xs ${
                    isEditable ? 'cursor-pointer hover:scale-105' : ''
                  } ${
                    parts === 'active'
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-600 ring-2 ring-emerald-200'
                      : 'bg-white text-slate-600 border-slate-300'
                  }`}
                >
                  <span className="text-sm sm:text-base font-black">Child Parts</span>
                  <span className="block text-[10px] font-medium text-slate-600 mt-0.5">Component Matrix</span>
                </div>

                <span className={`text-[10px] font-mono mt-1.5 font-bold ${
                  parts === 'active' ? 'text-emerald-700' : 'text-slate-400'
                }`}>
                  {parts === 'active' ? '⚡ Active to Stage 2' : 'Pending'}
                </span>

                {/* Stem Down to Child Parts */}
                {(activeStageFocus === 'all' || activeStageFocus === 'stage2') && (
                  <div className="w-0.5 h-6 bg-slate-800 mt-2"></div>
                )}
              </div>

              {/* RIGHT: Assembly Process */}
              <div className="flex flex-col items-center flex-1">
                <div 
                  onClick={() => isEditable && onToggleNode && onToggleNode('assembly')}
                  className={`relative px-4 py-3 rounded-2xl font-mono text-xs font-black border-2 text-center w-full transition shadow-xs ${
                    isEditable ? 'cursor-pointer hover:scale-105' : ''
                  } ${
                    assembly === 'eliminated'
                      ? 'bg-sky-50 text-sky-950 border-sky-400'
                      : assembly === 'target'
                      ? 'bg-rose-100 text-rose-950 border-rose-500 ring-4 ring-rose-200'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  <span className="text-sm sm:text-base font-black">Assembly Process</span>
                  <span className="block text-[10px] font-medium text-slate-600 mt-0.5">Torque / Fixture / Method</span>

                  {/* Clean Diagonal Slash if eliminated */}
                  {assembly === 'eliminated' && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-sky-700 stroke-2">
                      <line x1="6" y1="88%" x2="94%" y2="12%" />
                    </svg>
                  )}
                </div>

                <span className={`text-[10px] font-mono mt-1.5 font-bold ${
                  assembly === 'eliminated' ? 'text-sky-700' : assembly === 'target' ? 'text-rose-700' : 'text-slate-400'
                }`}>
                  {assembly === 'eliminated' ? '✅ Eliminated (Method OK)' : assembly === 'target' ? '🚨 Assembly Defect' : 'Stage 1 Testing'}
                </span>

                {onOpenStage && (
                  <button
                    type="button"
                    onClick={() => onOpenStage(1)}
                    className="mt-1 text-[10px] text-indigo-600 hover:text-indigo-800 underline font-mono cursor-pointer font-bold"
                  >
                    Stage 1 Card &rarr;
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* LEVEL 3: Under Parts -> Child Parts Swaps */}
        {(activeStageFocus === 'all' || activeStageFocus === 'stage2') && (
          <div className="w-full flex flex-col items-center -mt-2">
            {childParts.length > 0 && (
              <div className="w-full max-w-lg h-0.5 bg-slate-800 relative">
                <div className="absolute left-0 top-0 w-0.5 h-6 bg-slate-800"></div>
                <div className="absolute right-0 top-0 w-0.5 h-6 bg-slate-800"></div>
                <div className="absolute left-1/2 top-0 w-0.5 h-6 bg-slate-800 -translate-x-1/2"></div>
              </div>
            )}

            {childParts.length === 0 ? (
              <div className="p-5 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-center max-w-sm mt-4 shadow-2xs">
                <p className="text-xs font-bold text-slate-700 font-mono">No child parts added yet.</p>
                <p className="text-[10px] text-slate-500 mt-1">Add components in Stage 2 to populate individual branch nodes.</p>
                {onOpenStage && (
                  <button
                    type="button"
                    onClick={() => onOpenStage(2)}
                    className="mt-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold font-mono px-4 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    Go to Stage 2 &rarr;
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-6 w-full max-w-4xl">
                {childParts.map((part, pIdx) => {
                  const isRedX = part.isDefective || part.status === 'target';
                  const isElim = part.status === 'eliminated' || (part.wowInBobResult === 'BOB' && !isRedX);

                  return (
                    <div key={part.id || pIdx} className="flex flex-col items-center">
                      <div 
                        onClick={() => isEditable && onToggleNode && onToggleNode('childPart', pIdx)}
                        className={`relative px-3 py-3 rounded-2xl font-mono text-xs font-bold border-2 text-center w-full transition shadow-xs ${
                          isEditable ? 'cursor-pointer hover:scale-105' : ''
                        } ${
                          isRedX
                            ? 'bg-amber-100 text-slate-950 border-amber-500 shadow-lg ring-4 ring-amber-400/50 scale-105 z-10'
                            : isElim
                            ? 'bg-sky-50/90 text-sky-950 border-sky-300'
                            : 'bg-white text-slate-800 border-slate-300'
                        }`}
                      >
                        <span className="block truncate font-black text-xs" title={part.partName}>
                          {part.partName || `Part #${pIdx + 1}`}
                        </span>
                        
                        <div className="mt-1.5">
                          {isRedX ? (
                            <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase inline-flex items-center gap-1 shadow-2xs">
                              <Flame className="w-3 h-3" /> RED X
                            </span>
                          ) : isElim ? (
                            <span className="text-[10px] text-sky-800 font-bold bg-sky-100/60 px-1.5 py-0.5 rounded">
                              Eliminated
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">
                              Testing
                            </span>
                          )}
                        </div>

                        {/* Clean Diagonal Slash for eliminated child part */}
                        {isElim && !isRedX && (
                          <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-sky-700 stroke-2">
                            <line x1="4" y1="90%" x2="96%" y2="10%" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Big X Target Isolated Banner */}
      {targetPart && (
        <div className="bg-amber-50 border-2 border-amber-500 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-xs">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black text-amber-800 uppercase font-mono block">
                Verified Root Cause Isolated (Red X)
              </span>
              <h4 className="text-base sm:text-lg font-black text-slate-950 font-mono">
                {targetPart.partName}
              </h4>
              <p className="text-xs text-slate-600 font-mono mt-0.5">
                Swapping this component from WOW unit into BOB unit transferred the defect signature.
              </p>
            </div>
          </div>
          <span className="bg-amber-500 text-slate-950 text-xs font-black font-mono px-4 py-2 rounded-xl uppercase tracking-wider self-start sm:self-auto shadow-xs shrink-0">
            🎯 Red X Confirmed
          </span>
        </div>
      )}

      {/* Bottom Methodology Footnote */}
      <div className="border-t border-slate-200 pt-3 text-xs font-mono text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span>Method: Mone(Y) &rarr; &Delta;M (Measurement) &rarr; &Delta;P (Process vs Parts) &rarr; Child Parts Swap</span>
        <span className="font-bold text-slate-700">Shainin PSQ Standardization &bull; AI Studio Quality Suite</span>
      </div>
    </div>
  );
};
