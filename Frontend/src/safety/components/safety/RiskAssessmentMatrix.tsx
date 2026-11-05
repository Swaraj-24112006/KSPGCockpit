import React, { useState, useMemo } from 'react';
import { SafetyObservation, NearMissReport, AccidentReport, SafetyIncident } from '../../types';
import {
  ShieldAlert,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Crosshair,
  Sliders,
  ArrowRight,
  Info
} from 'lucide-react';

export interface RiskMatrixResult {
  likelihood: number;
  likelihoodLabel: string;
  severity: number;
  severityLabel: string;
  score: number;
  priorityLevel: 'P1 - Critical' | 'P2 - High' | 'P3 - Medium' | 'P4 - Low';
  category: 'A' | 'B' | 'C';
  incidentSeverity: 'Critical' | 'Major' | 'Moderate' | 'Minor';
  slaTarget: string;
  actionProtocol: string;
  recommendedTargetDays: number;
}

export const LIKELIHOOD_LEVELS = [
  { level: 5, label: 'Almost Certain', short: '5 · Almost Certain', freq: 'Occurs daily / weekly on shift' },
  { level: 4, label: 'Likely', short: '4 · Likely', freq: 'Occurs monthly or multiple times/yr' },
  { level: 3, label: 'Possible', short: '3 · Possible', freq: 'Could occur once a year in plant' },
  { level: 2, label: 'Unlikely', short: '2 · Unlikely', freq: 'Rarely occurs (1 in 3–5 years)' },
  { level: 1, label: 'Rare', short: '1 · Rare', freq: 'Practically improbable (<1 in 5 yrs)' }
];

export const SEVERITY_LEVELS = [
  { level: 1, label: 'Negligible', short: '1 · Negligible', impact: 'No injury / Minor 5S deviation' },
  { level: 2, label: 'Minor', short: '2 · Minor', impact: 'First Aid (FAC) / Minor equipment scratch' },
  { level: 3, label: 'Moderate', short: '3 · Moderate', impact: 'Medical Treatment (MTC) / Line stoppage' },
  { level: 4, label: 'Major', short: '4 · Major', impact: 'Lost Time Injury (LTI) / Severe damage' },
  { level: 5, label: 'Catastrophic', short: '5 · Catastrophic', impact: 'Permanent disability / Fatality / Fire' }
];

export function evaluateRiskCell(likelihood: number, severity: number): RiskMatrixResult {
  const score = likelihood * severity;
  const likelihoodObj = LIKELIHOOD_LEVELS.find(l => l.level === likelihood) || LIKELIHOOD_LEVELS[2];
  const severityObj = SEVERITY_LEVELS.find(s => s.level === severity) || SEVERITY_LEVELS[2];

  if (score >= 15) {
    return {
      likelihood,
      likelihoodLabel: likelihoodObj.label,
      severity,
      severityLabel: severityObj.label,
      score,
      priorityLevel: 'P1 - Critical',
      category: 'A',
      incidentSeverity: 'Critical',
      slaTarget: '< 2 Hours Immediate Containment',
      actionProtocol: 'Stop Work Authority · Immediate Physical Guarding / LOTO · Plant Head & EHS Escalation',
      recommendedTargetDays: 1
    };
  }
  if (score >= 8) {
    return {
      likelihood,
      likelihoodLabel: likelihoodObj.label,
      severity,
      severityLabel: severityObj.label,
      score,
      priorityLevel: 'P2 - High',
      category: 'B',
      incidentSeverity: 'Major',
      slaTarget: '24 Hours ICA · 3 Days PCA',
      actionProtocol: 'Urgent Coordinator 5-Why RCA · Engineering Controls · Cross-Line Horizontal Deployment',
      recommendedTargetDays: 3
    };
  }
  if (score >= 4) {
    return {
      likelihood,
      likelihoodLabel: likelihoodObj.label,
      severity,
      severityLabel: severityObj.label,
      score,
      priorityLevel: 'P3 - Medium',
      category: 'C',
      incidentSeverity: 'Moderate',
      slaTarget: '48 Hours ICA · 7 Days PCA',
      actionProtocol: 'Standard SOP Update · Visual Management / Poka-Yoke · Shift Toolbox Talk',
      recommendedTargetDays: 7
    };
  }
  return {
    likelihood,
    likelihoodLabel: likelihoodObj.label,
    severity,
    severityLabel: severityObj.label,
    score,
    priorityLevel: 'P4 - Low',
    category: 'C',
    incidentSeverity: 'Minor',
    slaTarget: '14 Days Routine Closure',
    actionProtocol: 'Routine 5S Sustenance · Operator Awareness · Monitor in Gemba Walk',
    recommendedTargetDays: 14
  };
}

export function getCellColorStyles(score: number, isSelected: boolean) {
  if (score >= 15) {
    return isSelected
      ? 'bg-rose-600 text-white ring-4 ring-rose-900/30 border-slate-950 scale-[1.03] z-10 shadow-md'
      : 'bg-rose-500/90 hover:bg-rose-600 text-white border-rose-700/40';
  }
  if (score >= 8) {
    return isSelected
      ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-900/30 border-slate-950 scale-[1.03] z-10 shadow-md'
      : 'bg-amber-400/90 hover:bg-amber-500 text-slate-950 border-amber-600/40';
  }
  if (score >= 4) {
    return isSelected
      ? 'bg-yellow-300 text-slate-950 ring-4 ring-yellow-700/30 border-slate-950 scale-[1.03] z-10 shadow-md'
      : 'bg-yellow-200 hover:bg-yellow-300 text-slate-900 border-yellow-400/60';
  }
  return isSelected
    ? 'bg-emerald-600 text-white ring-4 ring-emerald-900/30 border-slate-950 scale-[1.03] z-10 shadow-md'
    : 'bg-emerald-500/85 hover:bg-emerald-600 text-white border-emerald-700/30';
}

interface RiskAssessmentMatrixProps {
  observations?: SafetyObservation[];
  nearMisses?: NearMissReport[];
  accidents?: AccidentReport[];
  incidents?: SafetyIncident[];
  onUpdateObservation?: (id: string, data: Partial<SafetyObservation>) => Promise<void> | void;
  onUpdateNearMiss?: (id: string, data: Partial<NearMissReport>) => Promise<void> | void;
  onUpdateAccident?: (id: string, data: Partial<AccidentReport>) => Promise<void> | void;
  onUpdateIncident?: (id: string, data: Partial<SafetyIncident>) => Promise<void> | void;
  /** Compact mode for embedding inside Coordinator Assessment or Raise Modals */
  compact?: boolean;
  initialLikelihood?: number;
  initialSeverity?: number;
  onSelectPriority?: (result: RiskMatrixResult) => void;
  isCoordinatorRole?: boolean;
}

interface UnifiedAssessableItem {
  uid: string;
  rawId: string;
  source: 'observation' | 'nearmiss' | 'accident' | 'incident';
  code: string;
  title: string;
  location: string;
  date: string;
  currentPriorityLabel: string;
  inferredLikelihood: number;
  inferredSeverity: number;
}

export default function RiskAssessmentMatrix({
  observations = [],
  nearMisses = [],
  accidents = [],
  incidents = [],
  onUpdateObservation,
  onUpdateNearMiss,
  onUpdateAccident,
  onUpdateIncident,
  compact = false,
  initialLikelihood = 4,
  initialSeverity = 4,
  onSelectPriority,
  isCoordinatorRole = false
}: RiskAssessmentMatrixProps) {
  const [selectedLikelihood, setSelectedLikelihood] = useState<number>(initialLikelihood);
  const [selectedSeverity, setSelectedSeverity] = useState<number>(initialSeverity);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'observation' | 'nearmiss' | 'accident'>('all');
  const [selectedRecordUid, setSelectedRecordUid] = useState<string>('');
  const [autoAssignOnClick, setAutoAssignOnClick] = useState<boolean>(true);
  const [lastAssignedBanner, setLastAssignedBanner] = useState<string | null>(null);
  const [localPriorityOverrides, setLocalPriorityOverrides] = useState<Record<string, RiskMatrixResult>>({});

  // Build unified list of safety items that can be prioritized
  const assessableItems = useMemo<UnifiedAssessableItem[]>(() => {
    const list: UnifiedAssessableItem[] = [];

    observations.forEach(obs => {
      const cat = obs.category;
      const infL = cat === 'A' ? 4 : cat === 'B' ? 3 : 2;
      const infS = cat === 'A' ? 4 : cat === 'B' ? 3 : 2;
      list.push({
        uid: `obs-${obs.id}`,
        rawId: obs.id,
        source: 'observation',
        code: `OBS #${obs.srNo}`,
        title: obs.beforeCondition,
        location: `${obs.minifactory} · ${obs.station}`,
        date: obs.date,
        currentPriorityLabel: cat
          ? `Category ${cat} (${cat === 'A' ? 'P1 Critical' : cat === 'B' ? 'P2 High' : 'P3 Medium'})`
          : 'Unassigned (Pending Coordinator)',
        inferredLikelihood: infL,
        inferredSeverity: infS
      });
    });

    nearMisses.forEach(nm => {
      list.push({
        uid: `nm-${nm.id}`,
        rawId: nm.id,
        source: 'nearmiss',
        code: `NM #${nm.srNo}`,
        title: nm.briefDescription,
        location: `${nm.deptPlant} · ${nm.exactLocation}`,
        date: nm.incidentDate,
        currentPriorityLabel: nm.status === 'Closed' ? 'P3 Medium (Closed)' : 'P2 High (Active Investigation)',
        inferredLikelihood: 3,
        inferredSeverity: 3
      });
    });

    accidents.forEach(acc => {
      const hasLti = (acc.mandaysLost || 0) > 0;
      list.push({
        uid: `acc-${acc.id}`,
        rawId: acc.id,
        source: 'accident',
        code: acc.recordNo || 'ACC',
        title: `${acc.briefDescription} (${acc.natureOfInjury})`,
        location: `${acc.division} · ${acc.department}`,
        date: acc.accidentDate,
        currentPriorityLabel: hasLti ? 'P1 Critical (Category A · LTI)' : 'P2 High (Category B · Medical)',
        inferredLikelihood: hasLti ? 4 : 3,
        inferredSeverity: hasLti ? 4 : 3
      });
    });

    incidents.forEach(inc => {
      const isHigh = inc.type === 'Minor Injury' || inc.type === 'Near Miss';
      list.push({
        uid: `inc-${inc.id}`,
        rawId: inc.id,
        source: 'incident',
        code: `INC-${inc.id.slice(0, 5).toUpperCase()}`,
        title: inc.description,
        location: inc.area,
        date: inc.incidentDate,
        currentPriorityLabel: `${inc.type} (${inc.status})`,
        inferredLikelihood: isHigh ? 4 : 3,
        inferredSeverity: isHigh ? 4 : 2
      });
    });

    return list;
  }, [observations, nearMisses, accidents, incidents]);

  const filteredItems = useMemo(() => {
    if (sourceFilter === 'all') return assessableItems;
    return assessableItems.filter(item => item.source === sourceFilter);
  }, [assessableItems, sourceFilter]);

  const activeItem = useMemo(() => {
    if (!selectedRecordUid && filteredItems.length > 0) {
      return filteredItems[0];
    }
    return filteredItems.find(i => i.uid === selectedRecordUid) || filteredItems[0] || null;
  }, [filteredItems, selectedRecordUid]);

  const currentEvaluation = useMemo(
    () => evaluateRiskCell(selectedLikelihood, selectedSeverity),
    [selectedLikelihood, selectedSeverity]
  );

  // Format future target date string (e.g., "18-Oct-26")
  const computeTargetDateString = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dd = String(d.getDate()).padStart(2, '0');
    const mmm = months[d.getMonth()];
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mmm}-${yy}`;
  };

  // Apply priority level to the selected record
  const applyPriorityToRecord = async (result: RiskMatrixResult, targetItem: UnifiedAssessableItem | null) => {
    if (onSelectPriority) {
      onSelectPriority(result);
    }

    if (!targetItem) return;

    setLocalPriorityOverrides(prev => ({
      ...prev,
      [targetItem.uid]: result
    }));

    const targetDateStr = computeTargetDateString(result.recommendedTargetDays);

    if (targetItem.source === 'observation' && onUpdateObservation) {
      await onUpdateObservation(targetItem.rawId, {
        category: result.category,
        targetDate: targetDateStr
      });
    } else if (targetItem.source === 'nearmiss' && onUpdateNearMiss) {
      await onUpdateNearMiss(targetItem.rawId, {
        actionTargetDate: targetDateStr
      });
    } else if (targetItem.source === 'accident' && onUpdateAccident) {
      await onUpdateAccident(targetItem.rawId, {
        status: result.score >= 15 ? 'Under Coordinator Investigation' : 'Actions In-Progress'
      });
    } else if (targetItem.source === 'incident' && onUpdateIncident) {
      await onUpdateIncident(targetItem.rawId, {
        targetDate: targetDateStr
      });
    }

    setLastAssignedBanner(
      `Assigned ${result.priorityLevel} (Category ${result.category} · Score ${result.score}/25) to ${targetItem.code}`
    );
  };

  const handleCellClick = (likelihood: number, severity: number) => {
    setSelectedLikelihood(likelihood);
    setSelectedSeverity(severity);
    const result = evaluateRiskCell(likelihood, severity);

    if (compact && onSelectPriority) {
      onSelectPriority(result);
      setLastAssignedBanner(
        `Auto-assigned ${result.priorityLevel} → Category ${result.category} (Risk Score: ${result.score}/25)`
      );
      return;
    }

    if (isCoordinatorRole && autoAssignOnClick && activeItem) {
      applyPriorityToRecord(result, activeItem);
    }
  };

  // COMPACT MODE (Used inside Coordinator Assessment Modal or Initiator Forms)
  if (compact) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
          <div className="flex items-center space-x-2">
            <Crosshair className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
              Interactive 5×5 Risk Assessment Matrix (Click Cell to Auto-Assign Priority)
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-700">
            Score: {currentEvaluation.score}/25 · {currentEvaluation.priorityLevel} (Cat {currentEvaluation.category})
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Compact 5x5 Grid */}
          <div className="lg:col-span-7 overflow-x-auto">
            <div className="min-w-[360px]">
              <div className="grid grid-cols-6 gap-1 text-[10px] font-mono font-bold text-slate-600 mb-1 text-center">
                <div className="text-left pl-1 text-[9px] uppercase text-slate-400">L \ S →</div>
                {SEVERITY_LEVELS.map(sev => (
                  <div key={sev.level} className="truncate px-1 py-0.5 bg-slate-100 rounded">
                    S{sev.level} {sev.label.slice(0, 4)}
                  </div>
                ))}
              </div>
              {LIKELIHOOD_LEVELS.map(like => (
                <div key={like.level} className="grid grid-cols-6 gap-1 mb-1 items-center">
                  <div className="text-[10px] font-mono font-bold text-slate-700 pr-1 truncate">
                    L{like.level} {like.label}
                  </div>
                  {SEVERITY_LEVELS.map(sev => {
                    const cellScore = like.level * sev.level;
                    const isSelected = selectedLikelihood === like.level && selectedSeverity === sev.level;
                    const cellEval = evaluateRiskCell(like.level, sev.level);
                    return (
                      <button
                        key={`${like.level}-${sev.level}`}
                        type="button"
                        onClick={() => handleCellClick(like.level, sev.level)}
                        className={`h-9 rounded-lg border text-center font-mono transition-all cursor-pointer flex flex-col items-center justify-center ${getCellColorStyles(
                          cellScore,
                          isSelected
                        )}`}
                        title={`Likelihood ${like.level} (${like.label}) × Severity ${sev.level} (${sev.label}) = Score ${cellScore} (${cellEval.priorityLevel})`}
                      >
                        <span className="text-xs font-black leading-none">{cellScore}</span>
                        <span className="text-[9px] font-bold leading-none mt-0.5 opacity-90">
                          Cat {cellEval.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Selected Cell Output Summary */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="text-[11px] font-mono text-slate-500">
              L{selectedLikelihood} ({currentEvaluation.likelihoodLabel}) × S{selectedSeverity} ({currentEvaluation.severityLabel})
            </div>
            <div className="text-sm font-black text-slate-900">
              {currentEvaluation.priorityLevel} · Category {currentEvaluation.category}
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">SLA:</strong> {currentEvaluation.slaTarget}
            </div>
            <div className="text-[11px] text-slate-600 leading-snug">
              {currentEvaluation.actionProtocol}
            </div>
            {lastAssignedBanner && (
              <div className="text-[11px] font-semibold text-emerald-700 flex items-center space-x-1 pt-1">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{lastAssignedBanner}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // FULL STANDALONE INTERACTIVE RISK MATRIX VIEW
  return (
    <div className="space-y-6">
      {/* Top Executive Context Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs text-amber-400 font-mono">
              <Target className="w-4 h-4" />
              <span>ISO 45001 / EHS HIRA Risk Evaluation</span>
              <span aria-hidden="true">·</span>
              <span>5×5 Likelihood vs Severity</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Risk Assessment Matrix (Likelihood × Severity)
            </h2>
          </div>

          {/* Live Calculated Score Readout */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-5 py-3.5 flex items-center space-x-4 shrink-0">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Active Matrix Cell
              </div>
              <div className="text-lg font-black font-mono text-white mt-0.5">
                L{selectedLikelihood} × S{selectedSeverity} = {currentEvaluation.score}/25
              </div>
              <div className="text-xs font-semibold text-amber-400">
                {currentEvaluation.priorityLevel} · Category {currentEvaluation.category}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Banner when a cell click assigns priority */}
      {lastAssignedBanner && (
        <div className="bg-emerald-950 text-emerald-200 border border-emerald-800 rounded-xl px-4 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{lastAssignedBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setLastAssignedBanner(null)}
            className="text-emerald-400 hover:text-white font-mono text-[11px] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Two-Column Workspace: Left = 5x5 Interactive Grid, Right = Incident Selector & Priority Assignment Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols): Interactive 5x5 Matrix Grid */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                5×5 Risk Matrix (Likelihood × Severity)
              </h3>
            </div>

            {isCoordinatorRole && (
              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoAssignOnClick}
                  onChange={(e) => setAutoAssignOnClick(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Auto-assign on cell click</span>
              </label>
            )}
          </div>

          {/* 5x5 Grid Table */}
          <div className="overflow-x-auto">
            <div className="min-w-[540px]">
              {/* Severity Axis Header */}
              <div className="grid grid-cols-6 gap-2 mb-2">
                <div className="bg-slate-100 rounded-xl p-2.5 flex flex-col justify-between border border-slate-200">
                  <div className="text-[10px] font-mono font-bold text-slate-500 text-right">
                    SEVERITY →
                  </div>
                  <div className="text-[10px] font-mono font-bold text-slate-700">
                    ↓ LIKELIHOOD
                  </div>
                </div>
                {SEVERITY_LEVELS.map((sev) => (
                  <div
                    key={sev.level}
                    className={`rounded-xl p-2.5 border text-center transition ${
                      selectedSeverity === sev.level
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="text-xs font-black font-mono">S{sev.level}</div>
                    <div className="text-[11px] font-bold mt-0.5">{sev.label}</div>
                    <div
                      className={`text-[10px] mt-1 leading-tight ${
                        selectedSeverity === sev.level ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {sev.impact}
                    </div>
                  </div>
                ))}
              </div>

              {/* Matrix Rows (Likelihood 5 down to 1) */}
              <div className="space-y-2">
                {LIKELIHOOD_LEVELS.map((like) => (
                  <div key={like.level} className="grid grid-cols-6 gap-2 items-stretch">
                    {/* Likelihood Row Header */}
                    <div
                      className={`rounded-xl p-2.5 border flex flex-col justify-center transition ${
                        selectedLikelihood === like.level
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-800 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black font-mono">L{like.level}</span>
                        <span className="text-[11px] font-bold">{like.label}</span>
                      </div>
                      <div
                        className={`text-[10px] mt-1 leading-tight ${
                          selectedLikelihood === like.level ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {like.freq}
                      </div>
                    </div>

                    {/* 5 Cells for this Likelihood Row */}
                    {SEVERITY_LEVELS.map((sev) => {
                      const cellScore = like.level * sev.level;
                      const isSelected =
                        selectedLikelihood === like.level && selectedSeverity === sev.level;
                      const cellResult = evaluateRiskCell(like.level, sev.level);

                      return (
                        <button
                          key={`${like.level}-${sev.level}`}
                          type="button"
                          onClick={() => handleCellClick(like.level, sev.level)}
                          className={`rounded-xl p-2.5 border transition-all cursor-pointer flex flex-col items-center justify-center min-h-[76px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${getCellColorStyles(
                            cellScore,
                            isSelected
                          )}`}
                        >
                          <div className="text-lg font-black font-mono leading-none">
                            {cellScore}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-tight mt-1">
                            {cellResult.priorityLevel}
                          </div>
                          <div className="text-[10px] font-mono opacity-90 mt-0.5">
                            Cat {cellResult.category}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Priority Band Legend (Clean unboxed rows with clear typographic hierarchy) */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200">
              <div className="font-mono font-bold text-rose-800">Score 15–25 · P1 Critical</div>
              <div className="font-semibold text-slate-900 mt-0.5">Category A (Stop Work)</div>
              <div className="text-[11px] text-slate-600 mt-0.5">&lt; 2 Hr Containment SLA</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
              <div className="font-mono font-bold text-amber-900">Score 8–12 · P2 High</div>
              <div className="font-semibold text-slate-900 mt-0.5">Category B (Urgent CAPA)</div>
              <div className="text-[11px] text-slate-600 mt-0.5">24 Hr ICA · 3-Day PCA</div>
            </div>
            <div className="p-3 rounded-xl bg-yellow-50/80 border border-yellow-300">
              <div className="font-mono font-bold text-yellow-900">Score 4–6 · P3 Medium</div>
              <div className="font-semibold text-slate-900 mt-0.5">Category C (Standard Fix)</div>
              <div className="text-[11px] text-slate-600 mt-0.5">7-Day Engineering / SOP</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="font-mono font-bold text-emerald-800">Score 1–3 · P4 Low</div>
              <div className="font-semibold text-slate-900 mt-0.5">Category C (Monitor)</div>
              <div className="text-[11px] text-slate-600 mt-0.5">14-Day Gemba Sustenance</div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Target Incident Selector & Auto-Assigned Priority Action Card */}
        <div className="xl:col-span-5 space-y-5">
          {/* Card 1: Target Incident Selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  1. Target Incident
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {filteredItems.length} records
              </span>
            </div>

            {/* Interactive Source Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {(['all', 'observation', 'nearmiss', 'accident'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setSourceFilter(tab);
                    setSelectedRecordUid('');
                  }}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition cursor-pointer capitalize ${
                    sourceFilter === tab
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'all'
                    ? 'All Incidents'
                    : tab === 'observation'
                    ? 'Observations'
                    : tab === 'nearmiss'
                    ? 'Near Misses'
                    : 'Accidents'}
                </button>
              ))}
            </div>

            {/* Dropdown Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Safety Record
              </label>
              <select
                value={activeItem?.uid || ''}
                onChange={(e) => {
                  const nextUid = e.target.value;
                  setSelectedRecordUid(nextUid);
                  const found = assessableItems.find(i => i.uid === nextUid);
                  if (found) {
                    const override = localPriorityOverrides[found.uid];
                    setSelectedLikelihood(override ? override.likelihood : found.inferredLikelihood);
                    setSelectedSeverity(override ? override.severity : found.inferredSeverity);
                  }
                }}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {filteredItems.map((item) => (
                  <option key={item.uid} value={item.uid}>
                    [{item.code}] {item.location} — {item.title.slice(0, 65)}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Incident Details Box */}
            {activeItem && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
                  <span>{activeItem.code}</span>
                  <span>·</span>
                  <span>{activeItem.date}</span>
                  <span>·</span>
                  <span>{activeItem.location}</span>
                </div>
                <div className="font-semibold text-slate-900 leading-snug">
                  {activeItem.title}
                </div>
                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-200/80">
                  <span>Current Assigned Priority:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {localPriorityOverrides[activeItem.uid]
                      ? `${localPriorityOverrides[activeItem.uid].priorityLevel} (Cat ${
                          localPriorityOverrides[activeItem.uid].category
                        } · Score ${localPriorityOverrides[activeItem.uid].score})`
                      : activeItem.currentPriorityLabel}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Evaluated Priority Level & One-Click Assignment */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  2. Calculated Priority &amp; Escalation SLA
                </h3>
                <p className="text-xs text-slate-500">
                  Based on clicked cell (L{selectedLikelihood} × S{selectedSeverity})
                </p>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs text-slate-500">Risk Score: </span>
                <span className="text-base font-black text-slate-900">
                  {currentEvaluation.score}/25
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[10px] font-mono uppercase text-slate-500">
                    Assigned Priority Level
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-1">
                    {currentEvaluation.priorityLevel}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[10px] font-mono uppercase text-slate-500">
                    EHS Hazard Category
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-1">
                    Category {currentEvaluation.category} ({currentEvaluation.incidentSeverity})
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Containment &amp; Closure SLA:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {currentEvaluation.slaTarget}
                  </span>
                </div>
                <div className="text-slate-600 leading-relaxed pt-1 border-t border-slate-200/70">
                  <strong className="text-slate-800">Mandatory Protocol:</strong>{' '}
                  {currentEvaluation.actionProtocol}
                </div>
              </div>

              {isCoordinatorRole ? (
                <button
                  type="button"
                  onClick={() => applyPriorityToRecord(currentEvaluation, activeItem)}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                >
                  <Zap className="w-4 h-4" />
                  <span>
                    Assign {currentEvaluation.priorityLevel} (Category {currentEvaluation.category}) to{' '}
                    {activeItem ? activeItem.code : 'Incident'}
                  </span>
                </button>
              ) : (
                <div className="w-full py-2.5 px-4 bg-slate-100 text-slate-600 border border-slate-200 font-mono font-semibold rounded-xl text-xs text-center">
                  Safety Coordinator Role Required to Assign Priority
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
