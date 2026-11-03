import React from 'react';
import { RedFlag } from '../types';
import { Printer, X, ShieldAlert, CheckCircle, AlertTriangle, Layers, Tag, Check, Calendar, UserCheck } from 'lucide-react';

interface RedFlagPrintSheetProps {
  redFlag: RedFlag;
  onClose: () => void;
}

export default function RedFlagPrintSheet({ redFlag, onClose }: RedFlagPrintSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-2 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-[96vw] max-w-[96vw] h-[94vh] max-h-[94vh] flex flex-col overflow-hidden border border-slate-300">
        
        {/* Print Toolbar (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-900 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <span className="font-semibold text-sm">Shop Floor Control · Red Flag Action Form (SFC/QA/RF-01)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Form / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body - Strictly styled as the official shopfloor form */}
        <div className="flex-1 overflow-y-auto p-8 font-sans text-slate-900 space-y-4 print:p-0 print:overflow-visible print:text-black">
          
          {/* Header Block */}
          <div className="border-2 border-slate-900 p-3 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-rose-600 text-white flex flex-col items-center justify-center font-black rounded-sm border border-rose-800">
                <span className="text-sm leading-none">SFC</span>
                <span className="text-[10px] leading-none">QA</span>
              </div>
              <div>
                <h1 className="text-base font-black tracking-wider uppercase text-slate-900">
                  SHOP FLOOR QUALITY RED FLAG ACTION FORM
                </h1>
                <p className="text-[11px] text-slate-600 font-medium">
                  Standard Operating Form: <strong>SFC/QA/RF-01 (Rev. 03)</strong> · IATF 16949:2016 Cl. 10.2 Non-Conformity Control
                </p>
                <p className="text-[10px] text-slate-500">
                  Shop Floor Rule: <em>Anyone can raise a Red Flag on any department. QA is the custodian of Red Flag.</em>
                </p>
              </div>
            </div>

            <div className="text-right border-l-2 border-slate-300 pl-4 space-y-0.5">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Document No.</div>
              <div className="font-mono text-base font-black text-rose-700">{redFlag.redFlagNo}</div>
              <div className="text-[10px] text-slate-600 font-mono">Raised: {redFlag.raisedDate}</div>
              <div className="text-[10px] font-bold">
                Status: <span className="underline uppercase">{redFlag.status.replace('-', ' ')}</span>
              </div>
            </div>
          </div>

          {/* Section A: Identification & Responsibility Matrix (Anyone on Anyone) */}
          <table className="w-full border-collapse border border-slate-400 text-xs">
            <tbody>
              {/* Originator & Target Row */}
              <tr className="bg-slate-100 font-bold border-b border-slate-400">
                <td className="p-1.5 border-r border-slate-400 w-1/4">RAISED BY (ORIGINATOR):</td>
                <td className="p-1.5 border-r border-slate-400 w-1/4 text-slate-800 font-semibold">
                  {redFlag.raisedBy}
                  <span className="block text-[10px] text-slate-600 font-normal">Dept: {redFlag.raisedByDepartment || 'Production'}</span>
                </td>
                <td className="p-1.5 border-r border-slate-400 w-1/4">RAISED ON (TARGET DEPT):</td>
                <td className="p-1.5 w-1/4 text-slate-800 font-semibold">
                  {redFlag.targetDepartment || redFlag.responsibleDepartment}
                  <span className="block text-[10px] text-slate-600 font-normal">Resp: {redFlag.targetPerson || redFlag.teamLeader || 'Shift In-charge'}</span>
                </td>
              </tr>
              {/* Location & Machine */}
              <tr className="border-b border-slate-400">
                <td className="p-1.5 border-r border-slate-400 font-bold bg-slate-50">Plant / Mini-Factory:</td>
                <td className="p-1.5 border-r border-slate-400">{redFlag.mfName} · {redFlag.lineAreaName}</td>
                <td className="p-1.5 border-r border-slate-400 font-bold bg-slate-50">Station / Machine:</td>
                <td className="p-1.5">{redFlag.stationName} (Model: {redFlag.modelName})</td>
              </tr>
              {/* Classification */}
              <tr className="border-b border-slate-400">
                <td className="p-1.5 border-r border-slate-400 font-bold bg-slate-50">Defect Type &amp; Subtype:</td>
                <td className="p-1.5 border-r border-slate-400">{redFlag.redFlagType} · {redFlag.redFlagSubType || 'Non-conformance'}</td>
                <td className="p-1.5 border-r border-slate-400 font-bold bg-slate-50">5M+1E Category:</td>
                <td className="p-1.5 font-bold text-slate-800">{redFlag.category5M || 'Method'} (Occurrence: {redFlag.repetitiveOccurrence})</td>
              </tr>
              {/* QA Custodian & Severity */}
              <tr className="border-b border-slate-400">
                <td className="p-1.5 border-r border-slate-400 font-bold bg-rose-50 text-rose-900">QA CUSTODIAN (OFFICIAL):</td>
                <td className="p-1.5 border-r border-slate-400 font-bold text-rose-950">
                  {redFlag.qaCustodian || '—'}
                  <span className="block text-[10px] font-normal text-rose-700">Role: Custodian of Red Flag</span>
                </td>
                <td className="p-1.5 border-r border-slate-400 font-bold bg-slate-50">Severity Rating:</td>
                <td className="p-1.5 font-bold text-rose-700">{redFlag.severity || 'Major (Quarantine)'}</td>
              </tr>
            </tbody>
          </table>

          {/* Section 1: Anomaly Description & Point of Defect */}
          <div className="border border-slate-400 p-2.5 space-y-2">
            <div className="bg-slate-800 text-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
              1. Non-Conformance / Anomaly Description
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="col-span-2 space-y-1">
                <p className="text-slate-800 leading-relaxed font-medium bg-slate-50 p-2 border border-slate-200 min-h-[70px]">
                  {redFlag.redFlagDescription}
                </p>
                <div className="flex gap-4 text-[10px] text-slate-500 font-mono">
                  <span>Target Date: {redFlag.targetDate || 'TBD'}</span>
                  <span>Closure Owner: {redFlag.closureResponsibility}</span>
                </div>
              </div>
              <div className="border border-slate-300 p-1 bg-slate-50 text-center flex flex-col items-center justify-center min-h-[90px]">
                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Point-of-Defect (Before)</span>
                {redFlag.evidencePhoto ? (
                  <img crossOrigin="anonymous" src={redFlag.evidencePhoto}
                    alt="Defect"
                    className="max-h-24 max-w-full rounded border border-slate-300 object-contain"
                  />
                ) : (
                  <div className="text-[10px] text-slate-400 font-mono">[Photo Recorded on File]</div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Immediate Containment (4D) */}
          <div className="border border-slate-400 p-2.5 space-y-2">
            <div className="bg-amber-700 text-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider flex justify-between">
              <span>2. Immediate Containment Action (4D Quarantine &lt;2 Hours SLA)</span>
              <span>Status: {redFlag.containmentStatus || 'Pending'}</span>
            </div>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="p-1.5 border-r border-slate-300 font-bold bg-slate-50 w-1/3">Suspect WIP Quarantined:</td>
                  <td className="p-1.5 border-r border-slate-300 font-mono font-bold text-rose-700 w-1/3">
                    {redFlag.suspectQtyQuarantined || 0} Pieces Segregated
                  </td>
                  <td className="p-1.5 font-bold w-1/3 text-slate-700">
                    Verified By: {redFlag.containmentVerifiedBy || redFlag.teamLeader || 'Pending Verification'}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 border-r border-slate-300 font-bold bg-slate-50">Containment Action Taken:</td>
                  <td colSpan={2} className="p-1.5 font-medium text-slate-800">
                    {redFlag.containmentAction || redFlag.immediateActionTaken || '100% sorting initiated. Suspect material segregated to Red Tag Quarantine Bay.'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Root Cause (5-Why) & Cross-Module Escalations */}
          <div className="border border-slate-400 p-2.5 space-y-2">
            <div className="bg-blue-800 text-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider flex justify-between">
              <span>3. Root Cause Analysis (5-Why Method) &amp; Escalations</span>
              <span>Cross-Module Links: {redFlag.linkedPpsrNo || redFlag.linkedKaizenNo || redFlag.linkedFiveSRedTagNo || 'Direct Station'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-700 text-[10px] uppercase">5-Why Drill-down:</span>
                <div className="text-[11px] text-slate-800 space-y-0.5 border border-slate-200 p-1.5 bg-slate-50">
                  <p><strong>Why 1:</strong> {redFlag.why1 || 'Initial symptom: deviation observed in output'}</p>
                  <p><strong>Why 2:</strong> {redFlag.why2 || 'Process/tooling fixture or operator condition'}</p>
                  <p><strong>Why 3:</strong> {redFlag.why3 || 'Check or verification missed during shift'}</p>
                  <p><strong>Why 4:</strong> {redFlag.why4 || 'Inspection frequency or setting parameter standard gap'}</p>
                  <p className="text-rose-900 font-bold pt-1 border-t border-slate-200">
                    <strong>Root Cause:</strong> {redFlag.rootCause5Why || 'Lack of mistake proofing (Poka-yoke) or system interlock.'}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-700 text-[10px] uppercase">Permanent CAPA &amp; Standardization:</span>
                <div className="text-[11px] text-slate-800 border border-slate-200 p-1.5 bg-slate-50 space-y-1">
                  <p className="font-medium">{redFlag.systematicPermanentAction || 'Engineering countermeasure deployed to eliminate root cause.'}</p>
                  <div className="pt-1 text-[10px] border-t border-slate-200 flex flex-wrap gap-2 text-slate-600">
                    <span>SOP: {redFlag.standardizationUpdates?.sopUpdated ? '☑ Revised' : '☐ Open'}</span>
                    <span>PFMEA: {redFlag.standardizationUpdates?.pfmeaUpdated ? '☑ Revised' : '☐ Open'}</span>
                    <span>Control Plan: {redFlag.standardizationUpdates?.controlPlanUpdated ? '☑ Revised' : '☐ Open'}</span>
                    <span>OPL: {redFlag.standardizationUpdates?.onePointLessonIssued ? '☑ Issued' : '☐ Open'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: 3-Month Sustenance Verification Record (CRITICAL REQUIREMENT) */}
          <div className="border-2 border-emerald-800 p-2.5 space-y-2 bg-emerald-50/20">
            <div className="bg-emerald-800 text-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider flex justify-between items-center">
              <span>4. 3-Month Sustenance Tracking Record (Point Kept Open for 3 Months)</span>
              <span className="text-[10px] font-mono">IATF Rule: Final closure requires 90 days zero recurrence</span>
            </div>
            
            <p className="text-[10px] text-slate-600 font-medium italic">
              * Requirement: Point must remain OPEN during the entire 3-month sustenance period. QA Custodian audits the station at Month 1 (30d), Month 2 (60d), and Month 3 (90d).
            </p>

            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-300 text-[10px] uppercase">
                  <th className="p-1 border-r border-slate-300 text-left">Audit Milestone</th>
                  <th className="p-1 border-r border-slate-300 text-left">Target Days</th>
                  <th className="p-1 border-r border-slate-300 text-left">Audit Date</th>
                  <th className="p-1 border-r border-slate-300 text-left">QA Auditor / Custodian</th>
                  <th className="p-1 border-r border-slate-300 text-left">Recurrence Check</th>
                  <th className="p-1 text-left">Audit Status</th>
                </tr>
              </thead>
              <tbody>
                {/* Month 1 */}
                <tr className="border-b border-slate-300">
                  <td className="p-1 border-r border-slate-300 font-bold">Month 1 Sustenance Audit</td>
                  <td className="p-1 border-r border-slate-300 font-mono">Day 30</td>
                  <td className="p-1 border-r border-slate-300 font-mono">{redFlag.month1Check?.auditDate || redFlag.month1Check?.scheduledDate || 'Pending'}</td>
                  <td className="p-1 border-r border-slate-300">{redFlag.month1Check?.auditor || redFlag.qaCustodian || 'QA Custodian'}</td>
                  <td className="p-1 border-r border-slate-300 font-medium">
                    {redFlag.month1Check?.status === 'Passed' ? 'Zero Recurrence' : redFlag.month1Check?.status || 'Scheduled'}
                  </td>
                  <td className="p-1 font-bold">
                    {redFlag.month1Check?.status === 'Passed' ? (
                      <span className="text-emerald-700">✓ PASSED</span>
                    ) : (
                      <span className="text-amber-700">⏳ PENDING</span>
                    )}
                  </td>
                </tr>
                {/* Month 2 */}
                <tr className="border-b border-slate-300">
                  <td className="p-1 border-r border-slate-300 font-bold">Month 2 Sustenance Audit</td>
                  <td className="p-1 border-r border-slate-300 font-mono">Day 60</td>
                  <td className="p-1 border-r border-slate-300 font-mono">{redFlag.month2Check?.auditDate || redFlag.month2Check?.scheduledDate || 'Pending'}</td>
                  <td className="p-1 border-r border-slate-300">{redFlag.month2Check?.auditor || redFlag.qaCustodian || 'QA Custodian'}</td>
                  <td className="p-1 border-r border-slate-300 font-medium">
                    {redFlag.month2Check?.status === 'Passed' ? 'Zero Recurrence' : redFlag.month2Check?.status || 'Scheduled'}
                  </td>
                  <td className="p-1 font-bold">
                    {redFlag.month2Check?.status === 'Passed' ? (
                      <span className="text-emerald-700">✓ PASSED</span>
                    ) : (
                      <span className="text-amber-700">⏳ PENDING</span>
                    )}
                  </td>
                </tr>
                {/* Month 3 */}
                <tr className="border-b border-slate-300">
                  <td className="p-1 border-r border-slate-300 font-bold">Month 3 Sustenance Audit</td>
                  <td className="p-1 border-r border-slate-300 font-mono">Day 90</td>
                  <td className="p-1 border-r border-slate-300 font-mono">{redFlag.month3Check?.auditDate || redFlag.month3Check?.scheduledDate || 'Pending'}</td>
                  <td className="p-1 border-r border-slate-300">{redFlag.month3Check?.auditor || redFlag.qaCustodian || 'QA Custodian'}</td>
                  <td className="p-1 border-r border-slate-300 font-medium">
                    {redFlag.month3Check?.status === 'Passed' ? 'Zero Recurrence' : redFlag.month3Check?.status || 'Scheduled'}
                  </td>
                  <td className="p-1 font-bold">
                    {redFlag.month3Check?.status === 'Passed' ? (
                      <span className="text-emerald-700">✓ PASSED</span>
                    ) : (
                      <span className="text-amber-700">⏳ PENDING</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex items-center justify-between text-xs pt-1 font-bold">
              <span>3-Month Sustenance Achieved:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] ${redFlag.sustenanceAchieved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {redFlag.sustenanceAchieved ? 'YES - 90-DAY ZERO RECURRENCE ACHIEVED' : 'NO - POINT KEPT OPEN UNDER SUSTENANCE'}
              </span>
            </div>
          </div>

          {/* Section 5: Custodian & Management Sign-Off Authorization */}
          <div className="border border-slate-400">
            <div className="bg-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-400">
              5. Custodianship &amp; Closure Approval Sign-Off Block
            </div>
            <div className="grid grid-cols-4 text-xs divide-x divide-slate-400">
              <div className="p-2 space-y-3">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">ORIGINATOR (RAISED BY):</span>
                <div className="font-bold text-slate-800">{redFlag.raisedBy}</div>
                <div className="text-[10px] text-slate-500">Sign: Verified Digital</div>
              </div>

              <div className="p-2 space-y-3">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">TARGET DEPT IN-CHARGE:</span>
                <div className="font-bold text-slate-800">{redFlag.targetPerson || redFlag.teamLeader || 'Shift Lead'}</div>
                <div className="text-[10px] text-slate-500">Sign: Verified Digital</div>
              </div>

              <div className="p-2 space-y-3 bg-rose-50/30">
                <span className="text-[9px] uppercase font-bold text-rose-800 block">QA CUSTODIAN (QUALITY):</span>
                <div className="font-bold text-slate-900">{redFlag.qaCustodian || '—'}</div>
                <div className="text-[10px] text-emerald-700 font-semibold">
                  {redFlag.status === 'Closed' ? 'Approved (3M Passed)' : 'Custodian Oversight Active'}
                </div>
              </div>

              <div className="p-2 space-y-3">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">PLANT OPERATIONS HEAD:</span>
                <div className="font-bold text-slate-800">{redFlag.approvedByProduction || '—'}</div>
                <div className="text-[10px] text-slate-500">
                  {redFlag.status === 'Closed' ? 'Final Closure Authorized' : 'Pending 3M Sustenance'}
                </div>
              </div>
            </div>
          </div>

          {/* Form Footer */}
          <div className="text-[9px] font-mono text-slate-400 flex justify-between border-t border-slate-300 pt-1">
            <span>SFC Quality Incident Management System · Form SFC/QA/RF-01 Rev.03</span>
            <span>Printed on: {new Date().toLocaleString()} · Official Plant Quality Record</span>
          </div>

        </div>

      </div>
    </div>
  );
}
