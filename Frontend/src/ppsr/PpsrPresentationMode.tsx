import React, { useState, useEffect } from 'react';
import { PpsrReport, PpsrCommitteeFeedback } from '../types';
import {
  Compass,
  X,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Plus,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  IndianRupee,
  FileText,
  Layers,
  RefreshCw,
  Edit3,
  TrendingDown,
  Check,
  ChevronDown,
  ChevronUp,
  Award
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import IshikawaFishbone from './IshikawaFishbone';
import { PsqEliminationTree, DEFAULT_PSQ_TREE_DATA } from './PsqEliminationTree';

interface PpsrPresentationModeProps {
  report: PpsrReport;
  onClose: () => void;
  onUpdateReport: (id: string, data: Partial<PpsrReport>) => void;
  onOpenEditMode?: (report: PpsrReport) => void;
}

const STEPS = [
  { id: 1, title: '1. Problem Definition & Facts', subtitle: '5W2H Problem Statement & Initial Evidence' },
  { id: 2, title: '2. Emergency Containment', subtitle: 'Immediate Actions & Non-Conformity Controls' },
  { id: 3, title: '3. Cause Localization & Root Cause', subtitle: 'Ishikawa 6M Fishbone / PSQ Elimination Tree & 5-Why' },
  { id: 4, title: '4. Corrective Actions (PCA)', subtitle: 'Permanent Solution & Countermeasure Roadmap' },
  { id: 5, title: '5. Effectiveness & Financials', subtitle: 'Rejection Trend & Cost Savings Validation' },
  { id: 6, title: '6. Standardization & MF', subtitle: 'SOP/WI Updates & Minifactory Deployment' },
  { id: 7, title: '7. Yokoten / Read-Across', subtitle: 'Horizontal Deployment to Sister Lines' },
  { id: 8, title: '8. Committee Sign-off', subtitle: 'Steering Review, Decision & Approval' }
];

export default function PpsrPresentationMode({
  report,
  onClose,
  onUpdateReport,
  onOpenEditMode
}: PpsrPresentationModeProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [activeLeftTab, setActiveLeftTab] = useState<'steps' | 'feedback'>('steps');

  // Committee feedback form state
  const [reviewerName, setReviewerName] = useState('Committee Reviewer');
  const [feedbackType, setFeedbackType] = useState<'revision_needed' | 'clarification' | 'approved' | 'general'>('revision_needed');
  const [commentText, setCommentText] = useState('');
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState('');

  // Committee decision state
  const [decision, setDecision] = useState<'Approved' | 'Re-work Needed' | 'In Review'>(report.committeeDecision || 'In Review');
  const [slide3Approach, setSlide3Approach] = useState<'both' | 'fishbone' | 'psq'>(
    report.causeLocalizationApproach || (report.psqTreeData ? 'both' : 'fishbone')
  );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentStep < 8) {
        setCurrentStep(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 1) {
        setCurrentStep(prev => prev - 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, onClose]);

  // Add new feedback item
  const handleAddFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newFeedback: PpsrCommitteeFeedback = {
      id: 'fb-' + Date.now(),
      stepNumber: currentStep,
      stepTitle: STEPS[currentStep - 1].title,
      reviewerName: reviewerName.trim() || 'Committee Member',
      feedbackType,
      comment: commentText.trim(),
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      resolved: false
    };

    const existingFeedback = report.presentationFeedback || [];
    const updatedList = [newFeedback, ...existingFeedback];

    onUpdateReport(report.id, {
      presentationFeedback: updatedList,
      committeeDecision: decision
    });

    setCommentText('');
    setFeedbackSuccessMsg(`Feedback saved for Step ${currentStep}`);
    setTimeout(() => setFeedbackSuccessMsg(''), 3000);
  };

  // Toggle feedback item resolved state
  const handleToggleResolveFeedback = (feedbackId: string) => {
    const existingFeedback = report.presentationFeedback || [];
    const updatedList = existingFeedback.map(item => {
      if (item.id === feedbackId) {
        return { ...item, resolved: !item.resolved };
      }
      return item;
    });

    onUpdateReport(report.id, { presentationFeedback: updatedList });
  };

  // Save Committee Decision
  const handleSaveDecision = (newDecision: 'Approved' | 'Re-work Needed' | 'In Review') => {
    setDecision(newDecision);
    onUpdateReport(report.id, {
      committeeDecision: newDecision,
      committeeDecisionDate: new Date().toISOString().split('T')[0],
      status: newDecision === 'Approved' ? 'Closed' : 'In-Progress'
    });
  };

  const facts = report.factsAnalysis || {
    whatIs: '', whatIsNot: '',
    whereIs: '', whereIsNot: '',
    howIs: '', howIsNot: '',
    whenIs: '', whenIsNot: ''
  };

  const containmentList = report.containmentActionsList || (report.containmentAction ? [
    { no: 1, action: report.containmentAction, responsible: report.leadOwner || 'TBD', date: report.targetDate || '', status: 'implemented' as const }
  ] : []);

  const ishikawa = report.ishikawa || {
    man: [], machine: [], material: [], methods: [], milieu: [], measurement: []
  };

  const fiveWhys = report.fiveWhysList || {
    column1: report.rootCauseAnalysis ? report.rootCauseAnalysis.split('\n') : [],
    column2: [],
    column3: []
  };

  const correctiveList = report.correctiveActionsList || (report.permanentCorrectiveAction ? [
    { no: 1, measure: report.permanentCorrectiveAction, responsible: report.leadOwner || 'TBD', deadline: report.targetDate || '', status: 'completed' as const }
  ] : []);

  const standardizationList = report.standardizationList || [];
  const readAcrossList = report.readAcrossList || [];

  const chartData = report.defectTrendData && report.defectTrendData.length > 0
    ? report.defectTrendData.map(d => ({ name: d.date, value: d.defectsCount }))
    : (report.effectivenessChartData || [
      { name: 'Day 1 (Initial)', value: report.pctBefore || 6.2 },
      { name: 'Day 2 (Manual)', value: 3.5 },
      { name: 'Day 3 (Fluid Revert)', value: 1.1 },
      { name: 'Day 4 (PLC Cycle)', value: 0.3 },
      { name: 'Day 5 (Current)', value: report.pctAfter || 0.1 }
    ]);

  const totalFeedbackCount = (report.presentationFeedback || []).length;
  const unresolvedFeedbackCount = (report.presentationFeedback || []).filter(f => !f.resolved).length;

  return (
    <div className="fixed inset-0 bg-slate-100 text-slate-900 z-[9999] flex flex-col md:flex-row overflow-hidden animate-fade-in font-sans">

      {/* LEFT SIDE PANEL (Fixed sidebar containing metadata, steps, feedback & controls) */}
      <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-300 flex flex-col shrink-0 shadow-xl z-20 overflow-hidden">

        {/* Left Panel Header */}
        <div className="p-4 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white shrink-0 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-xs">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-300 font-mono block">
                  PPSR STEERING PRESENTATION
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">[{report.ppsrNo}]</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded-xl transition cursor-pointer"
              title="Close Presentation Mode (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-sm font-bold text-white line-clamp-2 leading-snug">
            {report.title}
          </h2>

          <div className="mt-3 pt-3 border-t border-indigo-800/60 grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <span className="text-indigo-300 block text-[9px] uppercase">Leader / Owner</span>
              <span className="font-bold text-white truncate block">{report.projectLeader || report.leadOwner || 'Unassigned'}</span>
            </div>
            <div>
              <span className="text-indigo-300 block text-[9px] uppercase">Plant / Line</span>
              <span className="font-bold text-white truncate block">{report.plant || 'Main Line'}</span>
            </div>
          </div>

          {/* Committee Decision Badge */}
          <div className="mt-3 flex items-center justify-between bg-black/30 p-2 rounded-xl border border-white/10 text-xs">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-300">Committee Decision:</span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold font-mono text-[10px] uppercase ${decision === 'Approved'
                ? 'bg-emerald-500 text-white shadow-xs'
                : decision === 'Re-work Needed'
                  ? 'bg-red-500 text-white shadow-xs animate-pulse'
                  : 'bg-amber-500 text-slate-950 font-black'
              }`}>
              {decision}
            </span>
          </div>
        </div>

        {/* Tab Selector between Steps & Feedback */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1 shrink-0 font-mono text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveLeftTab('steps')}
            className={`flex-1 py-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center space-x-1.5 ${activeLeftTab === 'steps'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-black'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <span>📜 8 Steps Menu</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveLeftTab('feedback')}
            className={`flex-1 py-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center space-x-1.5 ${activeLeftTab === 'feedback'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-black'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Feedback</span>
            {totalFeedbackCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${unresolvedFeedbackCount > 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                {unresolvedFeedbackCount > 0 ? `${unresolvedFeedbackCount}` : totalFeedbackCount}
              </span>
            )}
          </button>
        </div>

        {/* Left Panel Main Scroll Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">

          {/* TAB 1: STEPS LIST */}
          {activeLeftTab === 'steps' && (
            <div className="space-y-1.5 animate-fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block px-2 pt-1">
                Select Slide Step to Present
              </span>

              {STEPS.map((step) => {
                const isCurrent = step.id === currentStep;
                const stepFeedbackList = (report.presentationFeedback || []).filter(f => f.stepNumber === step.id);
                const hasPendingFix = stepFeedbackList.some(f => !f.resolved);

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCurrentStep(step.id)}
                    className={`w-full text-left p-3 rounded-xl transition border cursor-pointer flex items-center justify-between ${isCurrent
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md font-bold'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-start space-x-2.5 min-w-0 pr-2">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black font-mono shrink-0 ${isCurrent ? 'bg-white text-indigo-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                        {step.id}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate leading-snug">
                          {step.title.split('. ')[1]}
                        </div>
                        <div className={`text-[10px] truncate ${isCurrent ? 'text-indigo-100 font-normal' : 'text-slate-500'}`}>
                          {step.subtitle}
                        </div>
                      </div>
                    </div>

                    {hasPendingFix && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-white animate-pulse shrink-0" title="Feedback pending on this step" />
                    )}
                  </button>
                );
              })}

              {/* Committee Decision Action Box directly in Left Panel */}
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-2 px-1">
                <span className="text-[10px] font-bold uppercase font-mono text-slate-500 block">
                  Quick Committee Decision
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSaveDecision('Approved')}
                    className={`py-2 px-1 rounded-lg font-mono font-bold text-[10px] uppercase text-center transition border cursor-pointer ${decision === 'Approved'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-emerald-800 border-slate-200 hover:bg-emerald-50'
                      }`}
                  >
                    ✓ Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveDecision('Re-work Needed')}
                    className={`py-2 px-1 rounded-lg font-mono font-bold text-[10px] uppercase text-center transition border cursor-pointer ${decision === 'Re-work Needed'
                        ? 'bg-red-600 text-white border-red-600 shadow-xs'
                        : 'bg-slate-50 text-red-800 border-slate-200 hover:bg-red-50'
                      }`}
                  >
                    ⚠️ Re-work
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveDecision('In Review')}
                    className={`py-2 px-1 rounded-lg font-mono font-bold text-[10px] uppercase text-center transition border cursor-pointer ${decision === 'In Review'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-xs'
                        : 'bg-slate-50 text-amber-900 border-slate-200 hover:bg-amber-50'
                      }`}
                  >
                    ⏳ Hold
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FEEDBACK & CORRECTIONS */}
          {activeLeftTab === 'feedback' && (
            <div className="space-y-4 animate-fade-in">
              {/* Form to Add Step Feedback */}
              <form onSubmit={handleAddFeedback} className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider font-mono text-indigo-900">
                    Log Feedback for Step 0{currentStep}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-700 font-bold bg-indigo-100 px-2 py-0.5 rounded-md">
                    Slide {currentStep}
                  </span>
                </div>

                <div>
                  <label className="text-[10px] text-slate-600 uppercase font-mono font-bold block mb-1">Reviewer Name / Role</label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="e.g. Quality Manager"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none font-sans"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-600 uppercase font-mono font-bold block mb-1">Feedback Classification</label>
                  <select
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none font-mono"
                  >
                    <option value="revision_needed">🔴 Revision Needed / Correction</option>
                    <option value="clarification">❓ Clarification / Question</option>
                    <option value="approved">✅ Step Approved / Good</option>
                    <option value="general">💬 General Suggestion</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-600 uppercase font-mono font-bold block mb-1">Correction / Comment</label>
                  <textarea
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Enter specific feedback or required changes..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none font-sans"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl font-mono uppercase tracking-wider transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Committee Note</span>
                </button>

                {feedbackSuccessMsg && (
                  <p className="text-[11px] font-mono text-emerald-700 font-bold text-center animate-fade-in">
                    {feedbackSuccessMsg}
                  </p>
                )}
              </form>

              {/* Logged Feedback Items */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono block px-1">
                  All Committee Feedback ({totalFeedbackCount})
                </span>

                {totalFeedbackCount === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                    No committee notes logged yet.
                  </div>
                ) : (
                  (report.presentationFeedback || []).map((fb) => (
                    <div
                      key={fb.id}
                      className={`p-3 rounded-xl border transition text-xs space-y-1.5 ${fb.resolved
                          ? 'bg-slate-50 border-slate-200 text-slate-600'
                          : fb.feedbackType === 'revision_needed'
                            ? 'bg-red-50/80 border-red-200 text-red-950'
                            : 'bg-indigo-50/80 border-indigo-200 text-indigo-950'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
                          Step {fb.stepNumber}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">{fb.reviewerName}</span>
                      </div>
                      <p className="font-medium text-slate-800 leading-snug">{fb.comment}</p>

                      <button
                        type="button"
                        onClick={() => handleToggleResolveFeedback(fb.id)}
                        className={`text-[10px] font-bold font-mono uppercase px-2 py-1 rounded transition cursor-pointer flex items-center space-x-1 ${fb.resolved
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                          }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>{fb.resolved ? 'Resolved by Initiator' : 'Mark Fixed'}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Left Panel Footer Edit Report Button */}
        {onOpenEditMode && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEditMode(report);
              }}
              className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 shadow-xs transition cursor-pointer flex items-center justify-center space-x-2"
            >
              <Edit3 className="w-4 h-4 text-indigo-600" />
              <span>Make Direct Edits in PPSR</span>
            </button>
          </div>
        )}
      </div>

      {/* RIGHT MAIN PRESENTATION CANVAS (Bright theme with enlarged text) */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">

        {/* SLIDE CANVAS HEADER BAR */}
        <div className="bg-white border-b border-slate-300 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-xs">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black font-mono text-indigo-700 bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                STEP 0{currentStep} OF 8
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                PPSR Methodology Presentation
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              {STEPS[currentStep - 1].title}
            </h1>
            <p className="text-sm font-medium text-slate-600 mt-0.5">
              {STEPS[currentStep - 1].subtitle}
            </p>
          </div>

          {/* Step Navigation Controls */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className="px-4 py-2 bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-40 rounded-xl text-slate-800 border border-slate-300 font-bold text-sm transition cursor-pointer flex items-center space-x-2 shadow-xs"
            >
              <ChevronLeft className="w-5 h-5 text-indigo-600" />
              <span>Previous Step</span>
            </button>

            <button
              type="button"
              disabled={currentStep === 8}
              onClick={() => setCurrentStep(prev => Math.min(8, prev + 1))}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-40 rounded-xl text-white font-black text-sm transition cursor-pointer flex items-center space-x-2 shadow-md shadow-indigo-200"
            >
              <span>Next Step</span>
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* SLIDE CANVAS BODY (ENLARGED BRIGHT PRESENTATION VIEWS) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">

          {/* SLIDE 1: PROBLEM DEFINITION & 5W2H FACTS */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">

              {/* Problem Statement Box */}
              <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-indigo-800 font-mono flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span>Official Problem Statement</span>
                  </h3>
                  <div className="flex items-center space-x-3 font-mono text-xs">
                    <span className="text-slate-500 font-bold">Discovered: {report.discoveredOn || report.createdAt}</span>
                    <span className="text-slate-300">|</span>
                    <span className={`px-3 py-1 rounded-md font-bold uppercase text-xs ${report.repeatCase === 'yes' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                      Repeat Case: {report.repeatCase || 'No'}
                    </span>
                  </div>
                </div>

                <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
                  {report.problemStatement || 'No detailed problem statement entered.'}
                </div>

                {/* Initial Evidence: Baseline Graph & Defect Photo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Option 1: Initial Baseline Chart */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800 font-mono block">
                      📈 Option 1: Initial Defect Baseline Chart
                    </span>
                    {report.initialDefectTrendData && report.initialDefectTrendData.length > 0 ? (
                      <div className="h-44 bg-white p-2 rounded-xl border border-slate-200">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={report.initialDefectTrendData.map(d => ({ name: d.date, value: d.defectsCount }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                            <YAxis stroke="#64748b" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                            <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={3} dot={{ r: 5, fill: '#059669' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-44 bg-white/70 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 font-mono">
                        No baseline trend data recorded
                      </div>
                    )}
                  </div>

                  {/* Option 2: Photo Evidence */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-800 font-mono block">
                      📷 Option 2: Defect Photo Evidence
                    </span>
                    {report.sketchPhoto ? (
                      <div className="h-44 bg-white rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-2">
                        <img src={report.sketchPhoto} alt="Defect Evidence" className="max-h-40 object-contain rounded-lg" />
                      </div>
                    ) : (
                      <div className="h-44 bg-white/70 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 font-mono">
                        No photo uploaded
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 5W2H Facts Analysis Matrix (Enlarged) */}
              <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-indigo-800 font-mono flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <span>5W2H Facts Analysis (IS vs IS NOT)</span>
                </h3>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-mono uppercase text-xs font-bold border-b border-slate-300">
                        <th className="p-4 w-44">Dimension</th>
                        <th className="p-4 text-emerald-800 bg-emerald-50/50">WHAT / WHERE / HOW / WHEN IS</th>
                        <th className="p-4 text-red-800 bg-red-50/50">WHAT / WHERE / HOW / WHEN IS NOT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800 font-sans">
                      <tr className="hover:bg-slate-50">
                        <td className="p-4 font-mono font-bold text-slate-900 bg-slate-100">WHAT (Defect)</td>
                        <td className="p-4 font-semibold text-slate-900">{facts.whatIs || '—'}</td>
                        <td className="p-4 text-slate-600">{facts.whatIsNot || '—'}</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="p-4 font-mono font-bold text-slate-900 bg-slate-100">WHERE (Location)</td>
                        <td className="p-4 font-semibold text-slate-900">{facts.whereIs || '—'}</td>
                        <td className="p-4 text-slate-600">{facts.whereIsNot || '—'}</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="p-4 font-mono font-bold text-slate-900 bg-slate-100">HOW (Pattern)</td>
                        <td className="p-4 font-semibold text-slate-900">{facts.howIs || '—'}</td>
                        <td className="p-4 text-slate-600">{facts.howIsNot || '—'}</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="p-4 font-mono font-bold text-slate-900 bg-slate-100">WHEN (Timing)</td>
                        <td className="p-4 font-semibold text-slate-900">{facts.whenIs || '—'}</td>
                        <td className="p-4 text-slate-600">{facts.whenIsNot || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Defect Sketch Photo */}
              {report.sketchPhoto && (
                <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-indigo-800 font-mono">
                    📷 Defect Evidence Photo / Diagram
                  </h3>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 aspect-video flex items-center justify-center max-h-96 overflow-hidden">
                    <img src={report.sketchPhoto} alt="Defect Sketch" className="max-h-full max-w-full object-contain rounded-lg" referrerPolicy="no-referrer" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SLIDE 2: EMERGENCY CONTAINMENT ACTIONS */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
              <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-amber-800 font-mono flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span>Emergency Containment Actions (ICA)</span>
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    Immediate Sorting & Non-Conformity Controls
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-mono uppercase text-xs font-bold border-b border-slate-300">
                        <th className="p-4 w-12">#</th>
                        <th className="p-4">Containment Action Description</th>
                        <th className="p-4 w-44">Responsible</th>
                        <th className="p-4 w-36">Target Date</th>
                        <th className="p-4 w-36">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {containmentList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500 italic text-base">
                            No containment actions logged yet.
                          </td>
                        </tr>
                      ) : (
                        containmentList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-4 font-mono font-bold text-slate-500 text-base">{item.no || idx + 1}</td>
                            <td className="p-4 font-bold text-slate-900 text-base">{item.action}</td>
                            <td className="p-4 text-slate-700 font-mono font-bold">{item.responsible}</td>
                            <td className="p-4 text-slate-700 font-mono">{item.date}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-md text-xs font-bold font-mono uppercase ${item.status === 'proven' || item.status === 'implemented'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: CAUSE LOCALIZATION & ROOT CAUSE ANALYSIS */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
              {/* Method Switcher Header */}
              <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Compass className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm font-black uppercase tracking-wider text-indigo-900 font-mono">
                    Cause Localization Methodology
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSlide3Approach('fishbone')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${slide3Approach === 'fishbone'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    🐟 Ishikawa (6M)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlide3Approach('psq')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${slide3Approach === 'psq'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    🌳 PSQ Elimination Tree
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlide3Approach('both')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${slide3Approach === 'both'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    🔄 Both Methods
                  </button>
                </div>
              </div>

              {/* Ishikawa Diagram Render */}
              {(slide3Approach === 'fishbone' || slide3Approach === 'both') && (
                <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-wider text-indigo-800 font-mono flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    <span>Method A: Cause & Effect Diagram (Ishikawa 6M Fishbone)</span>
                  </h3>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-x-auto">
                    <IshikawaFishbone ishikawa={ishikawa} problemTitle={report.title} />
                  </div>
                </div>
              )}

              {/* PSQ Elimination Tree Render */}
              {(slide3Approach === 'psq' || slide3Approach === 'both') && (
                <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-wider text-indigo-800 font-mono flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span>Method B: PSQ Project Definition & Elimination Strategy Tree (Cause Localization)</span>
                  </h3>

                  <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 overflow-x-auto">
                    <PsqEliminationTree
                      data={report.psqTreeData || DEFAULT_PSQ_TREE_DATA}
                      standardWorksheet={report.standardWorksheet || []}
                      isEditable={false}
                    />
                  </div>
                </div>
              )}

              {/* 5-Why Drilldown Table */}
              <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-indigo-800 font-mono flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5 text-indigo-600" />
                  <span>5-Why Root Cause Drilldown</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    { title: 'Pathway 1 (Process / Method)', items: fiveWhys.column1 },
                    { title: 'Pathway 2 (Machine / Tooling)', items: fiveWhys.column2 },
                    { title: 'Pathway 3 (Detection System)', items: fiveWhys.column3 }
                  ].map((col, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                      <h4 className="text-xs font-black text-indigo-900 font-mono uppercase border-b border-slate-300 pb-2">
                        {col.title}
                      </h4>
                      <div className="space-y-2">
                        {col.items && col.items.length > 0 ? (
                          col.items.map((why, wIdx) => (
                            <div key={wIdx} className="text-sm p-3 bg-white rounded-lg border border-slate-200 text-slate-900 font-medium shadow-2xs">
                              <span className="font-mono text-indigo-700 font-extrabold mr-2">Why {wIdx + 1}:</span>
                              {why}
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-slate-500 italic p-3">No 5-why entries logged.</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 4: PERMANENT CORRECTIVE ACTIONS (PCA) */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
              <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-emerald-800 font-mono flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Permanent Corrective Actions (PCA Countermeasures)</span>
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    Root Cause Elimination Roadmap
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-mono uppercase text-xs font-bold border-b border-slate-300">
                        <th className="p-4 w-12">#</th>
                        <th className="p-4">Countermeasure / Measure Description</th>
                        <th className="p-4 w-44">Responsible Engineer</th>
                        <th className="p-4 w-36">Deadline</th>
                        <th className="p-4 w-36">Implementation Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {correctiveList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500 italic text-base">
                            No permanent corrective actions logged yet.
                          </td>
                        </tr>
                      ) : (
                        correctiveList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-4 font-mono font-bold text-slate-500 text-base">{item.no || idx + 1}</td>
                            <td className="p-4 font-bold text-slate-900 text-base">{item.measure}</td>
                            <td className="p-4 text-slate-700 font-mono font-bold">{item.responsible}</td>
                            <td className="p-4 text-slate-700 font-mono">{item.deadline}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-md text-xs font-bold font-mono uppercase ${item.status === 'completed' || item.status === 'proven'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                }`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 5: EFFECTIVENESS VERIFICATION & FINANCIAL SAVINGS */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white border border-slate-300 p-5 rounded-2xl shadow-sm">
                  <span className="text-xs font-mono font-bold text-slate-500 uppercase block">Rejection Rate Before</span>
                  <div className="text-3xl sm:text-4xl font-black text-red-600 font-mono mt-2">
                    {report.pctBefore ? `${report.pctBefore}%` : '8.0%'}
                  </div>
                  <span className="text-xs text-slate-500 font-medium mt-1 block">Initial defect level</span>
                </div>

                <div className="bg-white border border-slate-300 p-5 rounded-2xl shadow-sm">
                  <span className="text-xs font-mono font-bold text-slate-500 uppercase block">Rejection Rate After</span>
                  <div className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono mt-2">
                    {report.pctAfter ? `${report.pctAfter}%` : '0.2%'}
                  </div>
                  <span className="text-xs text-emerald-700 font-bold mt-1 block">Post-PCA verified level</span>
                </div>

                <div className="bg-white border border-slate-300 p-5 rounded-2xl shadow-sm">
                  <span className="text-xs font-mono font-bold text-slate-500 uppercase block">Monthly Cost Saving</span>
                  <div className="text-3xl sm:text-4xl font-black text-indigo-700 font-mono mt-2 flex items-center">
                    <IndianRupee className="w-7 h-7 mr-0.5 text-indigo-700" />
                    <span>{(report.costSavePerMonth || 48000).toLocaleString('en-IN')}</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium mt-1 block">Calculated monthly benefit</span>
                </div>

                <div className="bg-white border border-slate-300 p-5 rounded-2xl shadow-sm">
                  <span className="text-xs font-mono font-bold text-slate-500 uppercase block">Annual Cost Saving</span>
                  <div className="text-3xl sm:text-4xl font-black text-emerald-700 font-mono mt-2 flex items-center">
                    <IndianRupee className="w-7 h-7 mr-0.5 text-emerald-700" />
                    <span>{(report.costSavePerAnnum || 576000).toLocaleString('en-IN')}</span>
                  </div>
                  <span className="text-xs text-emerald-700 font-bold mt-1 block">Projected annual return</span>
                </div>
              </div>

              {/* Defect Trend Chart */}
              <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-indigo-800 font-mono flex items-center space-x-2">
                  <TrendingDown className="w-5 h-5 text-indigo-600" />
                  <span>Defect Reduction Trend Chart</span>
                </h3>

                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 13, fontWeight: 600 }} />
                      <YAxis stroke="#475569" tick={{ fontSize: 13, fontWeight: 600 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={4} dot={{ r: 8, fill: '#059669' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 6: STANDARDIZATION & MINIFACTORY */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
              <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-indigo-800 font-mono flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span>Standardization & Minifactory Deployment</span>
                  </h3>
                  <div className="flex items-center space-x-2 font-mono text-xs">
                    <span className="text-slate-600 font-bold">MF Status:</span>
                    <span className="px-3 py-1 rounded-md font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {report.stdStatusMF || 'Completed'}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-mono uppercase text-xs font-bold border-b border-slate-300">
                        <th className="p-4 w-12">#</th>
                        <th className="p-4">Standardization Item (SOP / WI / Control Plan)</th>
                        <th className="p-4 w-44">Responsible</th>
                        <th className="p-4 w-36">Date</th>
                        <th className="p-4 w-36">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {standardizationList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500 italic text-base">
                            No standardization actions logged yet.
                          </td>
                        </tr>
                      ) : (
                        standardizationList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-4 font-mono font-bold text-slate-500 text-base">{item.no || idx + 1}</td>
                            <td className="p-4 font-bold text-slate-900 text-base">{item.measure}</td>
                            <td className="p-4 text-slate-700 font-mono font-bold">{item.responsible}</td>
                            <td className="p-4 text-slate-700 font-mono">{item.date}</td>
                            <td className="p-4">
                              <span className="px-3 py-1 rounded-md text-xs font-bold font-mono uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 7: YOKOTEN / READ-ACROSS */}
          {currentStep === 7 && (
            <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
              <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-indigo-800 font-mono flex items-center space-x-2">
                    <Compass className="w-5 h-5 text-indigo-600" />
                    <span>Yokoten / Read-Across Horizontal Deployment</span>
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    Deployment to Sister Lines & Complexes
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-mono uppercase text-xs font-bold border-b border-slate-300">
                        <th className="p-4 w-12">#</th>
                        <th className="p-4">Horizontal Deployment Proposal / Target Line</th>
                        <th className="p-4 w-44">Responsible</th>
                        <th className="p-4 w-36">Deadline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {readAcrossList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-500 italic text-base">
                            No horizontal read-across proposals logged yet.
                          </td>
                        </tr>
                      ) : (
                        readAcrossList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-4 font-mono font-bold text-slate-500 text-base">{item.no || idx + 1}</td>
                            <td className="p-4 font-bold text-slate-900 text-base">{item.proposal}</td>
                            <td className="p-4 text-slate-700 font-mono font-bold">{item.responsible}</td>
                            <td className="p-4 text-slate-700 font-mono">{item.deadline}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 8: COMMITTEE SIGN-OFF & DECISION */}
          {currentStep === 8 && (
            <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
              <div className="bg-white border border-slate-300 rounded-2xl p-8 shadow-sm space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-indigo-700 font-mono block">
                    FINAL STEP
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                    Steering Committee Review & Official Sign-off
                  </h3>
                  <p className="text-sm font-medium text-slate-600 mt-1">
                    Select official review decision. Requesting re-work will notify the initiator with notes to resolve before final closure.
                  </p>
                </div>

                {/* DECISION ACTION BUTTONS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <button
                    type="button"
                    onClick={() => handleSaveDecision('Approved')}
                    className={`p-6 rounded-2xl border transition flex flex-col items-center text-center cursor-pointer ${decision === 'Approved'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-950 shadow-md'
                        : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100'
                      }`}
                  >
                    <CheckCircle2 className={`w-10 h-10 mb-2 ${decision === 'Approved' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-base font-black uppercase font-mono tracking-wider">
                      Approve PPSR Study
                    </span>
                    <span className="text-xs text-slate-600 font-medium mt-1">
                      PPSR study complete & validated. Mark study closed.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveDecision('Re-work Needed')}
                    className={`p-6 rounded-2xl border transition flex flex-col items-center text-center cursor-pointer ${decision === 'Re-work Needed'
                        ? 'bg-red-50 border-red-500 ring-2 ring-red-500/30 text-red-950 shadow-md'
                        : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100'
                      }`}
                  >
                    <AlertTriangle className={`w-10 h-10 mb-2 ${decision === 'Re-work Needed' ? 'text-red-600' : 'text-slate-400'}`} />
                    <span className="text-base font-black uppercase font-mono tracking-wider">
                      Request Revisions
                    </span>
                    <span className="text-xs text-slate-600 font-medium mt-1">
                      Send feedback notes back to Initiator to revise & re-submit.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveDecision('In Review')}
                    className={`p-6 rounded-2xl border transition flex flex-col items-center text-center cursor-pointer ${decision === 'In Review'
                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/30 text-amber-950 shadow-md'
                        : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100'
                      }`}
                  >
                    <RefreshCw className={`w-10 h-10 mb-2 ${decision === 'In Review' ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="text-base font-black uppercase font-mono tracking-wider">
                      Hold / In Progress
                    </span>
                    <span className="text-xs text-slate-600 font-medium mt-1">
                      Keep study open for further trial run verification.
                    </span>
                  </button>
                </div>

                {/* SIGNATURES & TEAM */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-xs font-mono font-bold text-slate-500 uppercase block">Initiator / Project Leader</span>
                    <p className="text-base font-black text-slate-900 font-mono">{report.projectLeader || report.leadOwner || 'Initiator'}</p>
                    <p className="text-xs text-emerald-700 font-bold font-mono mt-1">✓ Submitted for Steering Committee Review</p>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-xs font-mono font-bold text-slate-500 uppercase block">Steering Committee Sign-off</span>
                    <p className="text-base font-black text-slate-900 font-mono">
                      {report.coach ? `Coach: ${report.coach}` : 'Steering Committee'}
                    </p>
                    <p className={`text-xs font-mono font-bold ${decision === 'Approved' ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                      {decision === 'Approved' ? '✓ Committee Approved & Verified' : 'Current Status: ' + decision}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* SLIDE CANVAS FOOTER (LARGE NEXT/PREVIOUS CONTROLS) */}
        <div className="bg-white border-t border-slate-300 px-6 py-4 flex items-center justify-between shrink-0 shadow-lg">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 disabled:opacity-30 rounded-xl text-slate-800 font-bold text-sm transition cursor-pointer flex items-center space-x-2 border border-slate-300"
          >
            <ChevronLeft className="w-5 h-5 text-indigo-600" />
            <span>Step {Math.max(1, currentStep - 1)}: {STEPS[Math.max(0, currentStep - 2)].title.split('. ')[1]}</span>
          </button>

          <span className="text-sm font-mono font-black text-slate-700 hidden sm:inline">
            Slide {currentStep} / 8
          </span>

          <button
            type="button"
            disabled={currentStep === 8}
            onClick={() => setCurrentStep(prev => Math.min(8, prev + 1))}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-30 rounded-xl text-white font-black text-sm transition cursor-pointer flex items-center space-x-2 shadow-md shadow-indigo-200"
          >
            <span>Step {Math.min(8, currentStep + 1)}: {STEPS[Math.min(7, currentStep)].title.split('. ')[1]}</span>
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>

      </div>

    </div>
  );
}
