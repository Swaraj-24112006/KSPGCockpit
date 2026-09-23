import React, { useState } from 'react';
import { PpsrReport } from '../types';
import { X, Printer, Compass, CheckCircle2, AlertCircle, Sparkles, HelpCircle, Download, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SpecLimitTrendGraph from './SpecLimitTrendGraph';
import IshikawaFishbone from './IshikawaFishbone';
import { PsqEliminationTree, DEFAULT_PSQ_TREE_DATA } from './PsqEliminationTree';
import { downloadElementAsPdf, triggerA4Print, triggerA3Print } from '../shared/utils/pdfExporter';

interface PpsrSheetInspectProps {
  report: PpsrReport;
  onClose: () => void;
}

export default function PpsrSheetInspect({ report, onClose }: PpsrSheetInspectProps) {
  // Ensure default structures are safe if they don't exist on older reports
  const facts = report.factsAnalysis || {
    whatIs: '', whatIsNot: '',
    whereIs: '', whereIsNot: '',
    howIs: '', howIsNot: '',
    whenIs: '', whenIsNot: ''
  };

  const containmentList = report.containmentActionsList || (report.containmentAction ? [
    { no: 1, action: report.containmentAction, responsible: report.leadOwner || 'TBD', date: report.targetDate || '', status: 'implemented' as const }
  ] : []);

  const rawIshikawa = report.ishikawa || (report as any).fishbone || {};
  const ishikawa = {
    man: rawIshikawa.man || [],
    machine: rawIshikawa.machine || [],
    material: rawIshikawa.material || [],
    methods: rawIshikawa.methods || rawIshikawa.method || [],
    milieu: rawIshikawa.milieu || rawIshikawa.environment || [],
    measurement: rawIshikawa.measurement || rawIshikawa.measurements || []
  };

  // Migrate old column-based format to new array format
  const rawFiveWhys = report.fiveWhysList;
  const fiveWhys: Array<{ heading: string; whys: string[] }> = Array.isArray(rawFiveWhys)
    ? rawFiveWhys
    : rawFiveWhys && typeof rawFiveWhys === 'object' && ('column1' in rawFiveWhys || 'column2' in rawFiveWhys || 'column3' in rawFiveWhys)
      ? [
          ...((rawFiveWhys as any).column1?.length ? [{ heading: 'Root Cause 1', whys: (rawFiveWhys as any).column1 }] : []),
          ...((rawFiveWhys as any).column2?.length ? [{ heading: 'Root Cause 2', whys: (rawFiveWhys as any).column2 }] : []),
          ...((rawFiveWhys as any).column3?.length ? [{ heading: 'Root Cause 3', whys: (rawFiveWhys as any).column3 }] : []),
        ]
      : report.rootCauseAnalysis
        ? [{ heading: 'Root Cause 1', whys: report.rootCauseAnalysis.split('\n') }]
        : [];

  const correctiveList = report.correctiveActionsList || (report.permanentCorrectiveAction ? [
    { no: 1, measure: report.permanentCorrectiveAction, responsible: report.leadOwner || 'TBD', deadline: report.targetDate || '', status: 'completed' as const }
  ] : []);

  const standardizationList = report.standardizationList || [];
  const readAcrossList = report.readAcrossList || [];

  const completion = {
    projectLeader: report.completionSignatures?.projectLeader || report.leadOwner || '',
    steeringCommittee: report.completionSignatures?.steeringCommittee || report.steeringCommitteeSign || 'Steering Committee Member',
    completedOn: report.completionSignatures?.completedOn || report.targetDate || ''
  };

  const chartData = (report.effectivenessChartData && report.effectivenessChartData.length > 0)
    ? report.effectivenessChartData
    : [
      { name: 'Initial', value: 8 },
      { name: 'Contain', value: 4.5 },
      { name: 'Fix', value: 1 },
      { name: 'Current', value: 0.2 }
    ];

  const hasInitialSpec = !!(report.initialSpecLimitGraph?.measurements && report.initialSpecLimitGraph.measurements.length > 0);
  const hasEffectivenessSpec = !!(report.effectivenessSpecLimitGraph?.measurements && report.effectivenessSpecLimitGraph.measurements.length > 0);

  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [activeApproach, setActiveApproach] = useState<'both' | 'fishbone' | 'psq'>(
    report.causeLocalizationApproach || (report.psqTreeData ? 'both' : 'fishbone')
  );

  const handleDownloadPdf = async () => {
    setIsPdfExporting(true);
    await downloadElementAsPdf('ppsr-sheet-content', {
      filename: `PPSR_Report_${report.ppsrNo}.pdf`,
      orientation: 'landscape',
      format: 'a4'
    });
    setIsPdfExporting(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto print:absolute print:inset-0 print:bg-white print:p-0 print:m-0 print:overflow-visible" id="ppsr-inspect-modal">
      <div className="bg-slate-100 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-4 max-h-[95vh] print:border-none print:shadow-none print:rounded-none print:max-h-none print:max-w-none print:w-full print:m-0 print:p-0 print:overflow-visible">

        {/* Sticky Action Bar */}
        <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-violet-600/30 rounded-lg">
              <Compass className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-black text-violet-400 uppercase tracking-widest block">Quality Assurance Audit</span>
              <h3 className="text-sm font-black uppercase tracking-tight">BE PPSR Document: {report.ppsrNo}</h3>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Download PDF button */}
            <button
              type="button"
              disabled={isPdfExporting}
              onClick={handleDownloadPdf}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider font-mono shadow-md cursor-pointer transition-all hover:scale-105"
            >
              {isPdfExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            {/* Print A4 Sheet button */}
            <button
              type="button"
              onClick={() => triggerA4Print('ppsr-sheet-content', `PPSR Report - ${report.ppsrNo}`)}
              className="flex items-center space-x-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black uppercase tracking-wider font-mono shadow-md cursor-pointer transition-all hover:scale-105"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Sheet</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Outer Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100 print:p-0 print:bg-white print:overflow-visible">

          {/* Printable Paper Sheet */}
          <div
            id="ppsr-sheet-content"
            className="max-w-4xl mx-auto bg-white border border-slate-300 rounded-2xl shadow-sm p-6 md:p-8 space-y-8 text-slate-800 font-sans print:border print:border-slate-400 print:rounded-none print:shadow-none print:p-0 print:m-0 print:space-y-6"
          >

            {/* Header Title Grid */}
            <div className="border border-slate-800 grid grid-cols-1 md:grid-cols-4 font-mono">
              <div className="md:col-span-3 border-r md:border-r border-b md:border-b-0 border-slate-800 p-4 flex flex-col justify-center">
                <h1 className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 uppercase">
                  BE Problem Solving Sheet
                </h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                  Practical Problem Solving Report (PPSR Protocol)
                </p>
              </div>
              <div className="p-4 bg-slate-50 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Report No.</span>
                <span className="text-base font-black text-slate-900">{report.ppsrNo}</span>
                <span className="text-[8px] font-mono text-slate-400 mt-1 block">Date: {report.createdAt.split('T')[0]}</span>
              </div>
            </div>

            {/* General Meta Information Grid */}
            <div className="border-x border-b border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 text-[11px] font-mono divide-y md:divide-y-0 md:divide-x divide-slate-800 -mt-8">
              <div className="p-2.5">
                <span className="text-[8px] font-black text-slate-400 uppercase block">Project Title:</span>
                <span className="font-bold text-slate-900 uppercase">{report.title}</span>
              </div>
              <div className="p-2.5">
                <span className="text-[8px] font-black text-slate-400 uppercase block">Project Leader:</span>
                <span className="font-bold text-slate-900">{report.projectLeader || report.leadOwner || 'TBD'}</span>
              </div>
              <div className="p-2.5">
                <span className="text-[8px] font-black text-slate-400 uppercase block">Team Member(s):</span>
                <span className="font-bold text-slate-900">{report.teamMembers || 'N/A'}</span>
              </div>
            </div>

            {/* Section 1: Definition of the Problem */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>1 Definition of the problem</span>
                <span className="text-[10px] font-normal text-slate-400 lowercase italic">BE Step 1</span>
              </h3>

              {/* Problem Parameters Table */}
              <div className="grid grid-cols-2 md:grid-cols-4 border border-slate-800 divide-x divide-y divide-slate-800 text-[10px] font-mono">
                <div className="p-2">
                  <span className="text-[7px] font-black text-slate-400 uppercase block">Plant:</span>
                  <span className="font-bold text-slate-800">{report.plant || 'Pune Plant'}</span>
                </div>
                <div className="p-2">
                  <span className="text-[7px] font-black text-slate-400 uppercase block">Line/Station:</span>
                  <span className="font-bold text-slate-800">{report.lineStation || 'Assembly Line'}</span>
                </div>
                <div className="p-2 col-span-2 md:col-span-1">
                  <span className="text-[7px] font-black text-slate-400 uppercase block">Product / Component:</span>
                  <span className="font-bold text-slate-800">{report.productComponent || 'General Component'}</span>
                </div>
                <div className="p-2">
                  <span className="text-[7px] font-black text-slate-400 uppercase block">Amount Defects:</span>
                  <span className="font-bold text-rose-700">{report.amountDefects || 'N/A'}</span>
                </div>
                <div className="p-2">
                  <span className="text-[7px] font-black text-slate-400 uppercase block">Discovered On:</span>
                  <span className="font-bold text-slate-800">{report.discoveredOn || report.createdAt.split('T')[0]}</span>
                </div>
                <div className="p-2">
                  <span className="text-[7px] font-black text-slate-400 uppercase block">Discovered By:</span>
                  <span className="font-bold text-slate-800">{report.discoveredBy || 'QA Inspector'}</span>
                </div>
                <div className="p-2 col-span-2 md:col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-[7px] font-black text-slate-400 uppercase block">Repeat Case:</span>
                    <span className="font-bold text-slate-800">{report.repeatCase === 'yes' ? '🚨 YES, REPETITIVE' : 'NO, NEW CASE'}</span>
                  </div>
                  <div className="flex space-x-2 mr-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold font-mono uppercase ${report.repeatCase === 'yes' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                      Yes
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold font-mono uppercase ${report.repeatCase !== 'yes' ? 'bg-emerald-100 text-emerald-700 font-black' : 'bg-slate-100 text-slate-600'}`}>
                      No
                    </span>
                  </div>
                </div>
              </div>

              {/* Text & Picture/Chart layout */}
              <div className="grid grid-cols-1 md:grid-cols-12 border-x border-b border-slate-800 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                <div className="md:col-span-6 p-3 text-xs leading-relaxed space-y-1 bg-white">
                  <span className="text-[8px] font-black text-slate-400 uppercase block font-mono">Problem description:</span>
                  <p className="text-slate-700 font-medium whitespace-pre-wrap">{report.problemStatement}</p>
                </div>

                {/* Option 1: Initial Baseline Graph */}
                <div className="md:col-span-3 p-2 bg-slate-50 flex flex-col justify-between min-h-[140px]">
                  <span className="text-[8px] font-black text-slate-500 uppercase block font-mono mb-1">Option 1: Initial Baseline Graph</span>
                  {report.initialDefectTrendData && report.initialDefectTrendData.length > 0 ? (
                    <div className="h-28 bg-white p-1 rounded border border-slate-200">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={report.initialDefectTrendData.map(d => ({
                          name: d.date || (d as any).name || (d as any).stage || 'Stage',
                          value: Number(d.defectsCount ?? (d as any).defects_count ?? (d as any).value ?? 0)
                        }))} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 7, fill: '#64748b' }} />
                          <YAxis tick={{ fontSize: 7, fill: '#64748b' }} />
                          <Tooltip contentStyle={{ fontSize: '8px', padding: '2px 4px' }} />
                          <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-28 bg-white/60 border border-dashed border-slate-300 rounded flex items-center justify-center text-center p-2 text-[9px] text-slate-400 font-mono">
                      No baseline trend data
                    </div>
                  )}
                </div>

                {/* Specification-Limit Trend Graph (Replaced Option 2 Defect Photo) */}
                <div className="md:col-span-3 p-2 bg-slate-50 flex flex-col justify-between min-h-[140px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-black text-teal-800 uppercase font-mono">Specification-Limit Trend</span>
                    {hasInitialSpec && (
                      <div className="flex items-center space-x-1 text-[7px] font-mono font-bold">
                        <span className="text-red-600 bg-red-50 px-1 rounded border border-red-200">U:{report.initialSpecLimitGraph!.usl}</span>
                        <span className="text-blue-600 bg-blue-50 px-1 rounded border border-blue-200">L:{report.initialSpecLimitGraph!.lsl}</span>
                      </div>
                    )}
                  </div>
                  {hasInitialSpec ? (
                    <div className="h-28 bg-white p-1 rounded border border-slate-200">
                      <SpecLimitTrendGraph
                        usl={report.initialSpecLimitGraph!.usl}
                        lsl={report.initialSpecLimitGraph!.lsl}
                        measurements={report.initialSpecLimitGraph!.measurements}
                        height={108}
                      />
                    </div>
                  ) : (
                    <div className="h-28 bg-white/60 border border-dashed border-slate-300 rounded flex items-center justify-center text-center p-2 text-[9px] text-slate-400 font-mono">
                      No spec-limit data
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Facts Analysis (IS / IS NOT comparison) */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>2 Facts analysis</span>
                <span className="text-[10px] font-normal text-slate-400 lowercase italic">BE Step 2</span>
              </h3>

              <div className="border border-slate-800 grid grid-cols-12 divide-x divide-y divide-slate-800 text-[10px] font-mono">

                {/* Header row */}
                <div className="col-span-2 p-1.5 bg-slate-100 font-black uppercase text-center border-b border-slate-800">Focus</div>
                <div className="col-span-5 p-1.5 bg-emerald-50 text-emerald-950 font-black uppercase text-center border-b border-slate-800">The Problem IS (NOK product/process)</div>
                <div className="col-span-5 p-1.5 bg-rose-50 text-rose-950 font-black uppercase text-center border-b border-slate-800">The Problem IS NOT (Comparison OK product/process)</div>

                {/* WHAT */}
                <div className="col-span-2 p-2 bg-slate-50 font-black text-center flex items-center justify-center">WHAT</div>
                <div className="col-span-5 p-2 font-medium">{facts.whatIs || 'Dust specks on doors'}</div>
                <div className="col-span-5 p-2 font-medium">{facts.whatIsNot || 'No thin paint, no running paint'}</div>

                {/* WHERE */}
                <div className="col-span-2 p-2 bg-slate-50 font-black text-center flex items-center justify-center border-t">WHERE</div>
                <div className="col-span-5 p-2 font-medium border-t">{facts.whereIs || 'ST-3 spray booth, Pune plant'}</div>
                <div className="col-span-5 p-2 font-medium border-t">{facts.whereIsNot || 'Chennai plant, Chassis workshop'}</div>

                {/* HOW */}
                <div className="col-span-2 p-2 bg-slate-50 font-black text-center flex items-center justify-center border-t">HOW</div>
                <div className="col-span-5 p-2 font-medium border-t">{facts.howIs || 'Consistent 8% defect rate during spraying'}</div>
                <div className="col-span-5 p-2 font-medium border-t">{facts.howIsNot || 'Not intermittent, not seasonal'}</div>

                {/* WHEN */}
                <div className="col-span-2 p-2 bg-slate-50 font-black text-center flex items-center justify-center border-t">WHEN</div>
                <div className="col-span-5 p-2 font-medium border-t">{facts.whenIs || 'First noticed July 8 shift B'}</div>
                <div className="col-span-5 p-2 font-medium border-t">{facts.whenIsNot || 'Prior shifts or test assemblies'}</div>

              </div>
            </div>

            {/* Section 3: Containment Actions */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>3 Containment Actions</span>
                <span className="text-[10px] font-normal text-slate-400 lowercase italic">BE Step 3</span>
              </h3>

              <div className="border border-slate-800 overflow-hidden">
                <table className="w-full text-[10px] font-mono divide-y divide-slate-800">
                  <thead className="bg-slate-100">
                    <tr className="divide-x divide-slate-800">
                      <th className="p-1.5 text-center w-8">No</th>
                      <th className="p-1.5 text-left">Containment Action</th>
                      <th className="p-1.5 text-left w-32">Responsible</th>
                      <th className="p-1.5 text-center w-24">Date</th>
                      <th className="p-1.5 text-center w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {containmentList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-slate-400">No containment actions defined.</td>
                      </tr>
                    ) : (
                      containmentList.map((item, index) => (
                        <tr key={index} className="divide-x divide-slate-800">
                          <td className="p-1.5 text-center font-bold">{item.no || index + 1}</td>
                          <td className="p-1.5 text-slate-700 font-medium">{item.action}</td>
                          <td className="p-1.5 font-bold text-slate-800">{item.responsible}</td>
                          <td className="p-1.5 text-center text-slate-500 font-mono">{item.date}</td>
                          <td className="p-1.5 text-center">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase ${item.status === 'proven' ? 'bg-emerald-100 text-emerald-800' :
                                item.status === 'implemented' ? 'bg-blue-100 text-blue-800' :
                                  item.status === 'in-progress' ? 'bg-amber-100 text-amber-800' :
                                    'bg-slate-100 text-slate-800'
                              }`}>
                              ● {item.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Page break marker for print */}
            <div className="print:page-break-after-always" />

            {/* Section 4a: Cause Localization (Fishbone & PSQ Approach) */}
            <div className="space-y-2 pt-6 print:pt-0">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-1 gap-2">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono">
                    4a Cause localization (Fishbone / PSQ Elimination Tree)
                  </h3>
                  <span className="text-[10px] font-normal text-slate-400 lowercase italic">BE Step 4a</span>
                </div>

                {/* Print-hidden approach view toggle */}
                <div className="flex items-center space-x-1 print:hidden">
                  <button
                    type="button"
                    onClick={() => setActiveApproach('fishbone')}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition ${activeApproach === 'fishbone' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    Ishikawa Fishbone
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveApproach('psq')}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition ${activeApproach === 'psq' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    PSQ Elimination Tree
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveApproach('both')}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition ${activeApproach === 'both' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    Both Approaches
                  </button>
                </div>
              </div>

              {/* Ishikawa Fishbone View */}
              {(activeApproach === 'fishbone' || activeApproach === 'both') && (
                <div className="space-y-1">
                  {activeApproach === 'both' && (
                    <span className="text-[9px] font-black uppercase text-indigo-700 font-mono block">
                      Approach 1: Ishikawa 6M Cause-and-Effect Skeleton
                    </span>
                  )}
                  <IshikawaFishbone ishikawa={ishikawa} problemTitle={report.title} />
                </div>
              )}

              {/* PSQ Project Definition & Elimination Strategy Tree View */}
              {(activeApproach === 'psq' || activeApproach === 'both') && (
                <div className="space-y-1 pt-2">
                  {activeApproach === 'both' && (
                    <span className="text-[9px] font-black uppercase text-indigo-700 font-mono block">
                      Approach 2: PSQ Project Definition & Elimination Strategy Tree (Cause Localization)
                    </span>
                  )}
                  <PsqEliminationTree
                    data={report.psqTreeData || (report as any).psq_tree_data || DEFAULT_PSQ_TREE_DATA}
                    standardWorksheet={report.standardWorksheet || (report as any).standard_worksheet || []}
                    isEditable={false}
                    compact={true}
                  />
                </div>
              )}
            </div>

            {/* Section 4b: Root Cause Analysis (5 x Why Columns) */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>4b Root Cause Analysis (5 x WHY Drilldown)</span>
                <span className="text-[10px] font-normal text-slate-400 lowercase italic">BE Step 4b</span>
              </h3>

              <div className={`border border-slate-800 grid grid-cols-1 ${fiveWhys.length === 2 ? 'md:grid-cols-2' : fiveWhys.length >= 3 ? 'md:grid-cols-3' : ''} divide-y md:divide-y-0 md:divide-x divide-slate-800 font-mono text-[9px]`}>

                {fiveWhys.length > 0 ? (
                  fiveWhys.map((rc, idx) => (
                    <div key={idx} className={`p-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/55'} space-y-2.5`}>
                      <span className="block text-[8px] font-black text-indigo-700 uppercase tracking-widest border-b pb-1 font-mono">
                        {rc.heading || `Root Cause ${idx + 1}`}
                      </span>
                      <div className="space-y-2">
                        {rc.whys && rc.whys.length > 0 ? (
                          rc.whys.map((w, wIdx) => (
                            <div key={wIdx} className="flex items-start space-x-1">
                              <span className="font-bold text-slate-400 select-none">W{wIdx + 1}:</span>
                              <span className="text-slate-700 font-medium">{w}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">No analysis loaded</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-white text-slate-400 italic text-center col-span-full">
                    No root cause analysis recorded.
                  </div>
                )}

              </div>
            </div>

            {/* Section 5: Corrective Actions */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>5 Corrective Actions</span>
                <span className="text-[10px] font-normal text-slate-400 lowercase italic">BE Step 5</span>
              </h3>

              <div className="border border-slate-800 overflow-hidden">
                <table className="w-full text-[10px] font-mono divide-y divide-slate-800">
                  <thead className="bg-slate-100">
                    <tr className="divide-x divide-slate-800">
                      <th className="p-1.5 text-center w-8">Nr</th>
                      <th className="p-1.5 text-left">Permanent Corrective Measure</th>
                      <th className="p-1.5 text-left w-32">Responsible</th>
                      <th className="p-1.5 text-center w-24">Deadline</th>
                      <th className="p-1.5 text-center w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {correctiveList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-slate-400">No permanent corrective actions logged.</td>
                      </tr>
                    ) : (
                      correctiveList.map((item, index) => (
                        <tr key={index} className="divide-x divide-slate-800">
                          <td className="p-1.5 text-center font-bold">{item.no || index + 1}</td>
                          <td className="p-1.5 text-slate-700 font-medium">{item.measure}</td>
                          <td className="p-1.5 font-bold text-slate-800">{item.responsible}</td>
                          <td className="p-1.5 text-center text-slate-500 font-mono">{item.deadline}</td>
                          <td className="p-1.5 text-center">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase ${item.status === 'proven' ? 'bg-emerald-100 text-emerald-800' :
                                item.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                  item.status === 'in-progress' ? 'bg-amber-100 text-amber-800' :
                                    'bg-slate-100 text-slate-800'
                              }`}>
                              ● {item.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 6: Effectiveness & Evidence Options */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>6 Effectiveness Evidence (Defect Reduction & Specification-Limit Verification)</span>
                <span className="text-[10px] font-normal text-slate-400 lowercase italic">BE Step 6</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-800 p-4">
                {/* Option 1: Defect Reduction Trend Chart */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-indigo-700 uppercase font-mono tracking-wider">
                      📈 Option 1: Defect Reduction Trend Chart
                    </span>
                    <span className="text-[8px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                      Verified Data
                    </span>
                  </div>
                  <div className="h-44 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={
                        report.defectTrendData && report.defectTrendData.length > 0
                          ? report.defectTrendData.map(d => ({
                              name: d.date || (d as any).name || (d as any).stage || 'Stage',
                              value: Number(d.defectsCount ?? (d as any).defects_count ?? (d as any).value ?? 0)
                            }))
                          : chartData.map(d => ({
                              name: d.name || (d as any).date || 'Stage',
                              value: Number(d.value ?? (d as any).defectsCount ?? (d as any).defects_count ?? 0)
                            }))
                      } margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#475569', fontWeight: 600 }} />
                        <YAxis tick={{ fontSize: 8, fill: '#475569', fontWeight: 600 }} />
                        <Tooltip contentStyle={{ fontSize: '10px', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#0f172a', color: '#fff' }} />
                        <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={3} dot={{ r: 5, fill: '#059669', stroke: '#ffffff', strokeWidth: 1.5 }} activeDot={{ r: 7 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic border-l-2 border-emerald-500 pl-2">
                    {report.effectivenessEvidence || report.validationCheck || 'Defect level decreased systematically following permanent corrective action implementation.'}
                  </p>
                </div>

                {/* Specification-Limit Trend Graph (Replaced Option 2 Photo) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-teal-800 uppercase font-mono tracking-wider">
                      🎯 Specification-Limit Verification
                    </span>
                    {hasEffectivenessSpec && (
                      <div className="flex items-center space-x-1 text-[8px] font-mono font-bold">
                        <span className="text-red-600 bg-red-50 px-1 py-0.5 rounded border border-red-200">USL: {report.effectivenessSpecLimitGraph!.usl}</span>
                        <span className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-200">LSL: {report.effectivenessSpecLimitGraph!.lsl}</span>
                        <span className="text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">CL: {((report.effectivenessSpecLimitGraph!.usl + report.effectivenessSpecLimitGraph!.lsl) / 2).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  {hasEffectivenessSpec ? (
                    <div className="h-44 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <SpecLimitTrendGraph
                        usl={report.effectivenessSpecLimitGraph!.usl}
                        lsl={report.effectivenessSpecLimitGraph!.lsl}
                        measurements={report.effectivenessSpecLimitGraph!.measurements}
                        height={160}
                      />
                    </div>
                  ) : (
                    <div className="h-44 bg-slate-50 p-2 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-500 font-mono">No Spec-Limit Data Logged</span>
                      <p className="text-[9px] text-slate-400 mt-1">Process measurements against USL/LSL.</p>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic border-l-2 border-teal-500 pl-2">
                    Process capability verified against specification limits post-PCA.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 7: Standardization */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>7 Standardization (Protection)</span>
                <span className="text-[10px] font-normal text-slate-400 lowercase italic">BE Step 7</span>
              </h3>
              <p className="text-[8px] text-slate-400 italic font-mono uppercase -mt-1">Protection of the successful solution (FMEA, Control Plan, instructions, training)</p>

              <div className="border border-slate-800 overflow-hidden">
                <table className="w-full text-[10px] font-mono divide-y divide-slate-800">
                  <thead className="bg-slate-100">
                    <tr className="divide-x divide-slate-800">
                      <th className="p-1.5 text-center w-8">Nr</th>
                      <th className="p-1.5 text-left">Standardization / Training Action</th>
                      <th className="p-1.5 text-left w-32">Responsible</th>
                      <th className="p-1.5 text-center w-24">Date</th>
                      <th className="p-1.5 text-center w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {standardizationList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-slate-400">No standardization actions logged yet.</td>
                      </tr>
                    ) : (
                      standardizationList.map((item, index) => (
                        <tr key={index} className="divide-x divide-slate-800">
                          <td className="p-1.5 text-center font-bold">{item.no || index + 1}</td>
                          <td className="p-1.5 text-slate-700 font-medium">{item.measure}</td>
                          <td className="p-1.5 font-bold text-slate-800">{item.responsible}</td>
                          <td className="p-1.5 text-center text-slate-500 font-mono">{item.date}</td>
                          <td className="p-1.5 text-center">
                            <span className="inline-flex items-center px-1 text-[8px] font-bold text-emerald-800 bg-emerald-50 rounded">
                              ✓ {item.status || 'completed'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 8: Read Across */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>8 Read Across (Lessons Learned)</span>
                <span className="text-[10px] font-normal text-slate-400 lowercase italic">BE Step 8</span>
              </h3>
              <p className="text-[8px] text-slate-400 italic font-mono uppercase -mt-1">Transfer of the solution to other products / processes / plant sites</p>

              <div className="border border-slate-800 overflow-hidden divide-y divide-slate-800">
                <table className="w-full text-[10px] font-mono">
                  <thead className="bg-slate-100">
                    <tr className="divide-x divide-slate-800 border-b border-slate-800">
                      <th className="p-1.5 text-center w-8">Nr</th>
                      <th className="p-1.5 text-left">Proposed Shared Activity</th>
                      <th className="p-1.5 text-left w-32">Responsible</th>
                      <th className="p-1.5 text-center w-24">Deadline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {readAcrossList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-slate-400">No read across tasks logged.</td>
                      </tr>
                    ) : (
                      readAcrossList.map((item, index) => (
                        <tr key={index} className="divide-x divide-slate-800">
                          <td className="p-1.5 text-center font-bold">{item.no || index + 1}</td>
                          <td className="p-1.5 text-slate-700 font-medium">{item.proposal}</td>
                          <td className="p-1.5 font-bold text-slate-800">{item.responsible}</td>
                          <td className="p-1.5 text-center text-slate-500 font-mono">{item.deadline}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="p-2.5 text-xs text-slate-700 bg-white">
                  <span className="text-[7px] font-black text-slate-400 uppercase block font-mono">Explanation in case of non-necessity or site specifics:</span>
                  <p className="italic font-medium">{report.readAcrossExplanation || 'Read-across implemented in key spray paint setups.'}</p>
                </div>
              </div>
            </div>

            {/* Section 9: Completion and Steering Committee Approval */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>9 Completion & Sign-off</span>
                <span className="text-[10px] font-normal text-slate-400 lowercase italic">BE Step 9</span>
              </h3>

              <div className="border border-slate-800 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-[10px] font-mono bg-slate-50/50">
                <div className="p-3 space-y-3">
                  <span className="text-[8px] font-black text-slate-400 uppercase block">Project Leader Signature</span>
                  <div className="border-b border-slate-400 border-dashed h-8 flex items-end justify-center pb-1">
                    <span className="text-[11px] font-bold text-violet-700 font-mono italic">{completion.projectLeader}</span>
                  </div>
                  <span className="text-[7px] text-slate-400 text-center block">Self Confirming Sign-off</span>
                </div>

                <div className="p-3 space-y-3">
                  <span className="text-[8px] font-black text-slate-400 uppercase block">Steering Committee Sign-off</span>
                  <div className="border-b border-slate-400 border-dashed h-8 flex items-end justify-center pb-1">
                    <span className="text-[10px] font-black text-slate-700 font-mono italic">✓ {completion.steeringCommittee}</span>
                  </div>
                  <span className="text-[7px] text-slate-400 text-center block">Case Approval Confirmation</span>
                </div>

                <div className="p-3 space-y-3">
                  <span className="text-[8px] font-black text-slate-400 uppercase block">Completed On Date</span>
                  <div className="border-b border-slate-400 border-dashed h-8 flex items-end justify-center pb-1">
                    <span className="text-xs font-black text-slate-800 font-mono">{completion.completedOn}</span>
                  </div>
                  <span className="text-[7px] text-slate-400 text-center block">Standardization Date</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
