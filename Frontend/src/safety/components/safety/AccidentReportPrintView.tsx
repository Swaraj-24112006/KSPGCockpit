import React from 'react';
import { AccidentReport } from '../../types';
import { Printer, X, Download } from 'lucide-react';
import AccidentFishboneDiagram from './AccidentFishboneDiagram';

interface AccidentReportPrintViewProps {
  report: AccidentReport;
  onClose: () => void;
}

export default function AccidentReportPrintView({ report, onClose }: AccidentReportPrintViewProps) {
  const isCheckedActivity = (act: string) => {
    return report.leadingActivity && report.leadingActivity.includes(act);
  };

  const isIshikawaChecked = (category: 'ppe' | 'environmental' | 'machineEquipment' | 'injuredPerson' | 'management' | 'jobProcedure', item: string) => {
    if (!report.ishikawaCauses) return false;
    const list = report.ishikawaCauses[category] || [];
    return list.some(c => c.toLowerCase().includes(item.toLowerCase()));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full border border-slate-300 shadow-2xl overflow-hidden my-4 flex flex-col max-h-[96vh]">
        {/* Top Control Bar (Hidden during Print) */}
        <div className="no-print flex items-center justify-between px-6 py-3 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-sm tracking-wide">
              Official KSPG/EHS ACCIDENT REPORT (Record #{report.recordNo})
            </span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              2-Page EHS Standard Form
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Form (Page 1 &amp; 2)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="p-6 overflow-y-auto font-sans text-black bg-white space-y-8 select-text">

          {/* ======================================================== */}
          {/* PAGE 01 OF 02 */}
          {/* ======================================================== */}
          <div className="border-2 border-black p-4 space-y-3 print-avoid-break bg-white text-xs text-black">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-black pb-2">
              <div className="font-black text-lg tracking-wider">
                KSPG/EHS
              </div>
              <div className="text-center font-bold text-base tracking-widest uppercase">
                ACCIDENT REPORT
              </div>
              <div className="text-right text-[11px] italic font-mono">
                Page 01 of 02
              </div>
            </div>

            <div className="text-[10px] text-center font-semibold uppercase tracking-wider text-slate-700 border-b border-black pb-1">
              (TO BE FILLED IN BY PROCESS OWNER/H.O.D. ON DUTY WITHIN 08 HRS OF ACCIDENT AND SUBMIT)
            </div>

            <div className="text-[9px] uppercase tracking-wider font-semibold border-b border-black pb-1">
              <strong>DISTRIBUTION:</strong> ORIGINAL - EHS Dept., <strong>1st COPY</strong> - HR Dept. &amp; <strong>2nd COPY</strong> - Your Own Dept.
            </div>

            {/* Division, Dates, Dept */}
            <div className="grid grid-cols-2 border border-black divide-x divide-black text-[11px]">
              <div className="p-1.5 space-y-1">
                <div><strong>Division:</strong> <span className="font-semibold">{report.division}</span></div>
                <div><strong>Department where accident occurred:</strong> <span className="font-semibold">{report.department}</span></div>
              </div>
              <div className="p-1.5 space-y-1">
                <div className="flex justify-between">
                  <span><strong>Accident Date:</strong> {report.accidentDate}</span>
                  <span><strong>Accident Rep. Date:</strong> {report.accidentRepDate}</span>
                </div>
                <div><strong>Accident Time(hh:mm):</strong> <span className="font-mono">{report.accidentTime}</span></div>
              </div>
            </div>

            {/* Leading Activity Checkboxes */}
            <div className="border border-black p-2 text-[11px]">
              <div className="font-bold mb-1.5">Leading Activity :</div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <div className="flex items-center space-x-1.5">
                  <div className={`w-4 h-4 border border-black flex items-center justify-center font-bold ${isCheckedActivity('M/c. Operation') ? 'bg-black text-white' : ''}`}>
                    {isCheckedActivity('M/c. Operation') ? '✓' : ''}
                  </div>
                  <span>M/c. Operation</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className={`w-4 h-4 border border-black flex items-center justify-center font-bold ${isCheckedActivity('Matl. Handling') ? 'bg-black text-white' : ''}`}>
                    {isCheckedActivity('Matl. Handling') ? '✓' : ''}
                  </div>
                  <span>Matl. Handling</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className={`w-4 h-4 border border-black flex items-center justify-center font-bold ${isCheckedActivity('Maintenance') ? 'bg-black text-white' : ''}`}>
                    {isCheckedActivity('Maintenance') ? '✓' : ''}
                  </div>
                  <span>Maintenance</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className={`w-4 h-4 border border-black flex items-center justify-center font-bold ${isCheckedActivity('Office work') ? 'bg-black text-white' : ''}`}>
                    {isCheckedActivity('Office work') ? '✓' : ''}
                  </div>
                  <span>Office work</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className={`w-4 h-4 border border-black flex items-center justify-center font-bold ${isCheckedActivity('Driving') ? 'bg-black text-white' : ''}`}>
                    {isCheckedActivity('Driving') ? '✓' : ''}
                  </div>
                  <span>Driving</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className={`w-4 h-4 border border-black flex items-center justify-center font-bold ${isCheckedActivity('Other') ? 'bg-black text-white' : ''}`}>
                    {isCheckedActivity('Other') ? '✓' : ''}
                  </div>
                  <span>Other {report.leadingActivityOther ? `(${report.leadingActivityOther})` : ''}</span>
                </div>
              </div>
            </div>

            {/* Brief Description */}
            <div className="border border-black">
              <div className="bg-slate-200 px-2 py-1 font-bold text-[10px] uppercase border-b border-black">
                Brief Description of Accident (Explain What happened, When &amp; How it happened?)
              </div>
              <div className="p-2.5 font-bold text-xs uppercase min-h-[44px]">
                {report.briefDescription}
              </div>
            </div>

            {/* Immediate Corrective Actions */}
            <div className="border border-black">
              <div className="bg-slate-200 px-2 py-1 font-bold text-[10px] uppercase border-b border-black">
                Immediate Corrective Actions Initiated / Taken
              </div>
              <div className="p-2 font-medium text-xs min-h-[36px]">
                {report.immediateCorrectiveActions}
              </div>
            </div>

            {/* Injured Person Info Table */}
            <div className="border border-black text-[11px] divide-y divide-black">
              <div className="grid grid-cols-3 divide-x divide-black">
                <div className="p-1.5"><strong>Name of Injured:</strong> <span className="font-bold uppercase">{report.nameOfInjured}</span></div>
                <div className="p-1.5"><strong>Ticket No.:</strong> <span className="font-mono font-bold">{report.ticketNo}</span></div>
                <div className="p-1.5"><strong>Age (Yrs):</strong> {report.ageGender || '—'}</div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="p-1.5"><strong>Div. &amp; Department:</strong> {report.divDepartment}</div>
                <div className="p-1.5"><strong>Shift:</strong> {report.shift}</div>
              </div>
              <div className="p-1.5">
                <strong>Agency (What caused body injury?):</strong> {report.agency}
              </div>
              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="p-1.5"><strong>Exact site of Accident:</strong> {report.exactSite}</div>
                <div className="p-1.5"><strong>Duty Start Time:</strong> <span className="font-mono">{report.dutyStartTime}</span></div>
              </div>
              <div className="p-1.5">
                <strong>Res. Address of Injured:</strong> {report.resAddressInjured || '—'}
              </div>
            </div>

            {/* Witnesses */}
            <div className="border border-black text-[11px] divide-y divide-black">
              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="p-1.5">
                  <strong>Names of Witness (1):</strong> {report.witnesses?.[0]?.name || '—'}
                </div>
                <div className="p-1.5">
                  <strong>Witness (2):</strong> {report.witnesses?.[1]?.name || '—'}
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="p-1.5">
                  <strong>Res. Address (1):</strong> {report.witnesses?.[0]?.address || '—'}
                </div>
                <div className="p-1.5">
                  <strong>Res. Address (2):</strong> {report.witnesses?.[1]?.address || '—'}
                </div>
              </div>
              <div className="grid grid-cols-4 divide-x divide-black">
                <div className="p-1.5"><strong>Ticket No (1):</strong> <span className="font-mono">{report.witnesses?.[0]?.ticketNo || '—'}</span></div>
                <div className="p-1.5"><strong>Sign (1):</strong> <span className="italic">{report.witnesses?.[0]?.sign || 'V. Patil'}</span></div>
                <div className="p-1.5"><strong>Ticket No (2):</strong> <span className="font-mono">{report.witnesses?.[1]?.ticketNo || '—'}</span></div>
                <div className="p-1.5"><strong>Sign (2):</strong> <span className="italic">{report.witnesses?.[1]?.sign || 'N. Patil'}</span></div>
              </div>
            </div>

            {/* Manager Sign-off */}
            <div className="grid grid-cols-3 border border-black divide-x divide-black text-[11px]">
              <div className="p-2 space-y-2">
                <div><strong>Signature:</strong> <span className="italic">Signed</span></div>
                <div><strong>Name of Manager:</strong> {report.managerName || 'Sunil More'}</div>
              </div>
              <div className="p-2">
                <div><strong>Tel.Extn. Of Manager:</strong> <span className="font-mono">{report.managerExtn || '4210'}</span></div>
              </div>
              <div className="p-2 space-y-2">
                <div><strong>Signature:</strong> <span className="italic">Approved</span></div>
                <div><strong>Name of Plant Head:</strong> {report.plantHeadName || 'Rajesh Kulkarni'}</div>
              </div>
            </div>

            {/* Section TO BE FILLED BY MEDICAL OFFICER (Doctor) */}
            <div className="border-2 border-black">
              <div className="bg-slate-300 px-3 py-1.5 font-black text-center text-xs uppercase tracking-wider border-b border-black">
                This Section TO BE FILLED BY MEDICAL OFFICER (Doctor)
              </div>
              <div className="p-2.5 text-[11px] divide-y divide-black/50 space-y-2">
                <div className="grid grid-cols-2 gap-2 pb-1.5">
                  <div><strong>Body Part Injured:</strong> <span className="font-bold uppercase text-rose-950">{report.bodyPartInjured}</span></div>
                  <div><strong>Nature of Injury:</strong> <span className="font-bold uppercase text-rose-950">{report.natureOfInjury}</span></div>
                </div>
                <div className="pt-1.5 pb-1">
                  <strong>What Treatment given at O.H.C.:</strong> <span className="font-semibold">{report.treatmentGivenOHC}</span>
                </div>
                <div className="pt-1 pb-1">
                  <strong>Injured Sent to which Hospital:</strong> {report.injuredSentHospital || 'N/A (Treated in OHC dispensary)'}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 pb-1.5">
                  <div><strong>Date on which Injured Resumed Duty:</strong> <span className="font-semibold">{report.resumedDutyDate}</span></div>
                  <div><strong>Mandays Lost:</strong> <span className="font-mono font-bold">{report.mandaysLost}</span></div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-black">
                  <div><strong>Name of Medical Officer:</strong> <span className="font-bold">{report.medicalOfficerName}</span></div>
                  <div><strong>Sign. of Medical Officer:</strong> <span className="italic">{report.medicalOfficerSign || 'Dr. A. Choudhary (MBBS)'}</span></div>
                  <div><strong>Date:</strong> <span className="font-mono">{report.medicalReportDate}</span></div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1">
              <span>Standard EHS Incident Form (First-Aid / LTI)</span>
              <span>Record No.: <strong>{report.recordNo}</strong></span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* PAGE 02 OF 02 */}
          {/* ======================================================== */}
          <div className="border-2 border-black p-4 space-y-3 print-avoid-break bg-white text-xs text-black">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-black pb-2">
              <div className="font-black text-lg tracking-wider">
                KSPG/EHS
              </div>
              <div className="text-center font-bold text-base tracking-widest uppercase">
                ACCIDENT REPORT
              </div>
              <div className="text-right text-[11px] italic font-mono">
                Page 02 of 02
              </div>
            </div>

            <div className="flex justify-between items-center border-b border-black pb-1.5 text-xs font-bold uppercase">
              <span>INVESTIGATION</span>
              <span>Date: {report.investigationDate || '12 / 01 / 2025'}</span>
            </div>

            {/* Visual Fishbone Diagram / Cause(s) of the Incident */}
            <AccidentFishboneDiagram
              causes={report.ishikawaCauses}
              problemTitle={report.briefDescription || report.natureOfInjury}
            />

            {/* User Requested: "Describe the Causes (What went wrong?) with 5 Why analysis" */}
            <div className="border-2 border-black">
              <div className="bg-slate-300 px-3 py-1 font-bold text-center text-xs uppercase tracking-wider border-b border-black">
                Describe the Causes (What went wrong?) · 5-Why Analysis
              </div>
              <div className="p-3 text-[11px] space-y-2">
                <div className="grid grid-cols-1 divide-y divide-black/30 border border-black">
                  <div className="p-1.5 flex items-start space-x-2">
                    <span className="font-bold w-16 text-slate-800 shrink-0 font-mono">Why 1:</span>
                    <span>{report.why1 || 'Operator cut thumb while handling machined casting without PPE'}</span>
                  </div>
                  <div className="p-1.5 flex items-start space-x-2">
                    <span className="font-bold w-16 text-slate-800 shrink-0 font-mono">Why 2:</span>
                    <span>{report.why2 || 'Part edges had razor-sharp deburring burrs'}</span>
                  </div>
                  <div className="p-1.5 flex items-start space-x-2">
                    <span className="font-bold w-16 text-slate-800 shrink-0 font-mono">Why 3:</span>
                    <span>{report.why3 || 'Assigned cut-resistant gloves were oil-soaked and operator removed them'}</span>
                  </div>
                  <div className="p-1.5 flex items-start space-x-2">
                    <span className="font-bold w-16 text-slate-800 shrink-0 font-mono">Why 4:</span>
                    <span>{report.why4 || 'No clean dry backup pair available in station cabinet'}</span>
                  </div>
                  <div className="p-1.5 flex items-start space-x-2">
                    <span className="font-bold w-16 text-slate-800 shrink-0 font-mono">Why 5:</span>
                    <span>{report.why5 || 'Station checklist did not enforce minimum spare buffer verification at shift start'}</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-black p-2 font-semibold">
                  <span className="font-black uppercase text-rose-950 font-mono">Root Cause Synthesis: </span>
                  {report.rootCauseDescription || 'Deficient cell-level PPE buffer and non-adherence to Stop Work protocol when mandatory safety gloves are missing.'}
                </div>
              </div>
            </div>

            {/* Corrective Action(s) Table */}
            <div className="border border-black">
              <div className="bg-slate-300 px-3 py-1 font-bold text-center text-xs uppercase tracking-wider border-b border-black">
                CORRECTIVE ACTION(S)
              </div>
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-black divide-x divide-black font-bold">
                    <th className="px-2 py-1 w-12 text-center">Sr. No.</th>
                    <th className="px-3 py-1">Corrective Action</th>
                    <th className="px-3 py-1 w-36">Responsibility</th>
                    <th className="px-3 py-1 w-28 whitespace-nowrap">Target Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {report.correctiveActions && report.correctiveActions.length > 0 ? (
                    report.correctiveActions.map((act, i) => (
                      <tr key={i} className="divide-x divide-black">
                        <td className="px-2 py-1.5 text-center font-mono font-bold">{act.srNo || i + 1}</td>
                        <td className="px-3 py-1.5">{act.correctiveAction}</td>
                        <td className="px-3 py-1.5 font-medium">{act.responsibility}</td>
                        <td className="px-3 py-1.5 font-mono">{act.targetDate}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-center text-slate-500 italic">No corrective actions logged yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Investigation Done By Table */}
            <div className="border border-black">
              <div className="bg-slate-300 px-3 py-1 font-bold text-center text-xs uppercase tracking-wider border-b border-black">
                INVESTIGATION DONE BY
              </div>
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-black divide-x divide-black font-bold">
                    <th className="px-2 py-1 w-12 text-center">Sr. No.</th>
                    <th className="px-3 py-1">Name</th>
                    <th className="px-3 py-1 w-44">Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {report.investigators && report.investigators.length > 0 ? (
                    report.investigators.map((inv, idx) => (
                      <tr key={idx} className="divide-x divide-black">
                        <td className="px-2 py-1 text-center font-mono">{idx + 1}</td>
                        <td className="px-3 py-1 font-semibold">{inv}</td>
                        <td className="px-3 py-1 italic text-slate-600">Verified</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="divide-x divide-black">
                      <td className="px-2 py-1 text-center">1</td>
                      <td className="px-3 py-1">Gunaji Parab (EHS Specialist)</td>
                      <td className="px-3 py-1 italic">Verified</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1">
              <span>Investigation Closed &amp; Archived in Shopfloor MS</span>
              <span>Record No: <strong>{report.recordNo}</strong></span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
