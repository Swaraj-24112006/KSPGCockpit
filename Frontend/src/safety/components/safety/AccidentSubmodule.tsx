import React, { useState, useMemo } from 'react';
import { AccidentReport, AccidentWitness, AccidentCorrectiveAction } from '../../types';
import { 
  Plus, 
  Search, 
  Download, 
  Printer, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  Edit3, 
  ShieldAlert, 
  Stethoscope, 
  Activity, 
  X, 
  ChevronRight,
  UserCheck
} from 'lucide-react';
import AccidentReportPrintView from './AccidentReportPrintView';
import AccidentFishboneDiagram, { IshikawaCausesData } from './AccidentFishboneDiagram';

interface AccidentSubmoduleProps {
  accidents: AccidentReport[];
  onAddAccident: (data: Partial<AccidentReport>) => Promise<void>;
  onUpdateAccident: (id: string, data: Partial<AccidentReport>) => Promise<void>;
  isCoordinatorRole?: boolean;
  isDoctorRole?: boolean;
  onNavigateRaise?: () => void;
}

export default function AccidentSubmodule({
  accidents,
  onAddAccident,
  onUpdateAccident,
  isCoordinatorRole = false,
  isDoctorRole = false,
  onNavigateRaise
}: AccidentSubmoduleProps) {
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [isDoctorRaiseModalOpen, setIsDoctorRaiseModalOpen] = useState(false);
  const [coordinatorModalItem, setCoordinatorModalItem] = useState<AccidentReport | null>(null);
  const [printModalReport, setPrintModalReport] = useState<AccidentReport | null>(null);

  // ==========================================
  // Form State: Raised by Doctor / Medical Officer
  // ==========================================
  const [docDivision, setDocDivision] = useState('Pierburg');
  const [docAccidentDate, setDocAccidentDate] = useState(() => {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  });
  const [docAccidentRepDate, setDocAccidentRepDate] = useState(() => {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  });
  const [docDepartment, setDocDepartment] = useState('Pierburg (Module line 1)');
  const [docAccidentTime, setDocAccidentTime] = useState('08:40 PM');
  const [docLeadingActivities, setDocLeadingActivities] = useState<string[]>(['M/c. Operation']);
  const [docLeadingOther, setDocLeadingOther] = useState('');
  const [docBriefDescription, setDocBriefDescription] = useState('CUT INJURY ON LEFT HAND THUMB');
  const [docImmediateActions, setDocImmediateActions] = useState('Send to 1st aid in company dispensary');

  // Injured Person
  const [docInjuredName, setDocInjuredName] = useState('');
  const [docTicketNo, setDocTicketNo] = useState('');
  const [docDivDept, setDocDivDept] = useState('PIERBURG');
  const [docAgeGender, setDocAgeGender] = useState('25/M');
  const [docShift, setDocShift] = useState<'FIRST SHIFT' | 'SECOND SHIFT' | 'THIRD SHIFT' | 'GENERAL SHIFT'>('SECOND SHIFT');
  const [docAgency, setDocAgency] = useState('Cut injury on left hand thumb');
  const [docExactSite, setDocExactSite] = useState('PIERBURG - MODULE LINE 1');
  const [docDutyStartTime, setDocDutyStartTime] = useState('04:00 PM');
  const [docResAddress, setDocResAddress] = useState('Talegaon, Pune');

  // Witnesses
  const [docWitness1Name, setDocWitness1Name] = useState('Vishwajit Patil');
  const [docWitness1Address, setDocWitness1Address] = useState('Talegoan');
  const [docWitness1Ticket, setDocWitness1Ticket] = useState('696');
  const [docWitness2Name, setDocWitness2Name] = useState('Mr.Nitesh Patil');
  const [docWitness2Address, setDocWitness2Address] = useState('Kanhe');
  const [docWitness2Ticket, setDocWitness2Ticket] = useState('6330');

  // Management on duty
  const [docManagerName, setDocManagerName] = useState('Sunil More');
  const [docManagerExtn, setDocManagerExtn] = useState('4210');
  const [docPlantHeadName, setDocPlantHeadName] = useState('Rajesh Kulkarni');

  // Doctor / Medical Officer Section
  const [docBodyPartInjured, setDocBodyPartInjured] = useState('LEFT HAND THUMB');
  const [docNatureOfInjury, setDocNatureOfInjury] = useState('CUT INJURY');
  const [docTreatmentGivenOHC, setDocTreatmentGivenOHC] = useState('CLEANING & DRESSING');
  const [docHospitalSent, setDocHospitalSent] = useState('N/A (Dispensary OHC First-Aid)');
  const [docResumedDutyDate, setDocResumedDutyDate] = useState('JOINED AFTER OPD, SAME SHIFT');
  const [docMandaysLost, setDocMandaysLost] = useState<number>(0);
  const [docDoctorName, setDocDoctorName] = useState('Dr. ARJUN CHOUDHARY');
  const [docDoctorSign, setDocDoctorSign] = useState('Dr. A. Choudhary (MBBS / EHS Physician)');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // Form State: Safety Coordinator Section (Page 2: Investigation & 5-Why)
  // ==========================================
  const [coordInvestDate, setCoordInvestDate] = useState(() => {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  });
  
  // Fishbone checklist
  const [coordPpeCauses, setCoordPpeCauses] = useState<string[]>([]);
  const [coordEnvCauses, setCoordEnvCauses] = useState<string[]>([]);
  const [coordMachCauses, setCoordMachCauses] = useState<string[]>([]);
  const [coordInjuredCauses, setCoordInjuredCauses] = useState<string[]>([]);
  const [coordMgmtCauses, setCoordMgmtCauses] = useState<string[]>([]);
  const [coordJobProcCauses, setCoordJobProcCauses] = useState<string[]>([]);

  // 5-Why Analysis in Describe Causes
  const [coordWhy1, setCoordWhy1] = useState('');
  const [coordWhy2, setCoordWhy2] = useState('');
  const [coordWhy3, setCoordWhy3] = useState('');
  const [coordWhy4, setCoordWhy4] = useState('');
  const [coordWhy5, setCoordWhy5] = useState('');
  const [coordRootCauseDesc, setCoordRootCauseDesc] = useState('');

  // Corrective Actions
  const [coordActions, setCoordActions] = useState<AccidentCorrectiveAction[]>([
    { srNo: 1, correctiveAction: 'One point lesson display on station.', responsibility: 'Gunaji', targetDate: '11-02-2025', status: 'Completed' },
    { srNo: 2, correctiveAction: 'Given awarness & trainning to all team member to wear handgloves', responsibility: 'Gunaji', targetDate: '11-02-2025', status: 'Completed' }
  ]);
  const [coordInvestigators, setCoordInvestigators] = useState<string>('Gunaji Parab\nPrince Yadav, Vishwajit Patil\nAmey Kanjale, Santosh Wankhede');
  const [coordStatus, setCoordStatus] = useState<'Reported by Doctor' | 'Under Coordinator Investigation' | 'Actions In-Progress' | 'Closed'>('Closed');

  // Toggle Leading Activity
  const toggleLeadingActivity = (act: string) => {
    setDocLeadingActivities(prev => 
      prev.includes(act) ? prev.filter(a => a !== act) : [...prev, act]
    );
  };

  // Toggle fishbone checkboxes
  const toggleFishboneItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleToggleFishboneCategory = (category: keyof IshikawaCausesData, item: string) => {
    if (category === 'ppe') toggleFishboneItem(setCoordPpeCauses, item);
    else if (category === 'environmental') toggleFishboneItem(setCoordEnvCauses, item);
    else if (category === 'machineEquipment') toggleFishboneItem(setCoordMachCauses, item);
    else if (category === 'injuredPerson') toggleFishboneItem(setCoordInjuredCauses, item);
    else if (category === 'management') toggleFishboneItem(setCoordMgmtCauses, item);
    else if (category === 'jobProcedure') toggleFishboneItem(setCoordJobProcCauses, item);
  };

  // Open Coordinator Modal
  const handleOpenCoordinatorModal = (acc: AccidentReport) => {
    setCoordinatorModalItem(acc);
    setCoordInvestDate(acc.investigationDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    setCoordPpeCauses(acc.ishikawaCauses?.ppe || []);
    setCoordEnvCauses(acc.ishikawaCauses?.environmental || []);
    setCoordMachCauses(acc.ishikawaCauses?.machineEquipment || []);
    setCoordInjuredCauses(acc.ishikawaCauses?.injuredPerson || []);
    setCoordMgmtCauses(acc.ishikawaCauses?.management || []);
    setCoordJobProcCauses(acc.ishikawaCauses?.jobProcedure || []);

    setCoordWhy1(acc.why1 || '');
    setCoordWhy2(acc.why2 || '');
    setCoordWhy3(acc.why3 || '');
    setCoordWhy4(acc.why4 || '');
    setCoordWhy5(acc.why5 || '');
    setCoordRootCauseDesc(acc.rootCauseDescription || '');

    setCoordActions(acc.correctiveActions && acc.correctiveActions.length > 0 ? acc.correctiveActions : [
      { srNo: 1, correctiveAction: 'One point lesson display on station.', responsibility: 'Area Supervisor', targetDate: 'Next Shift', status: 'Completed' }
    ]);
    setCoordInvestigators(acc.investigators ? acc.investigators.join('\n') : 'Gunaji Parab\nPrince Yadav');
    setCoordStatus(acc.status || 'Under Coordinator Investigation');
  };

  // Submit Doctor Form
  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docInjuredName.trim() || !docBriefDescription.trim() || !docDoctorName.trim()) {
      alert('Please fill Name of Injured, Brief Description, and Doctor Name.');
      return;
    }
    setIsSubmitting(true);
    try {
      const witnesses: AccidentWitness[] = [];
      if (docWitness1Name.trim()) {
        witnesses.push({ name: docWitness1Name, address: docWitness1Address, ticketNo: docWitness1Ticket, sign: 'Signed' });
      }
      if (docWitness2Name.trim()) {
        witnesses.push({ name: docWitness2Name, address: docWitness2Address, ticketNo: docWitness2Ticket, sign: 'Signed' });
      }

      await onAddAccident({
        division: docDivision,
        accidentDate: docAccidentDate,
        accidentRepDate: docAccidentRepDate,
        department: docDepartment,
        accidentTime: docAccidentTime,
        leadingActivity: docLeadingActivities,
        leadingActivityOther: docLeadingOther,
        briefDescription: docBriefDescription,
        immediateCorrectiveActions: docImmediateActions,
        nameOfInjured: docInjuredName,
        ticketNo: docTicketNo,
        divDepartment: docDivDept,
        ageGender: docAgeGender,
        shift: docShift,
        agency: docAgency,
        exactSite: docExactSite,
        dutyStartTime: docDutyStartTime,
        resAddressInjured: docResAddress,
        witnesses,
        managerName: docManagerName,
        managerExtn: docManagerExtn,
        plantHeadName: docPlantHeadName,
        bodyPartInjured: docBodyPartInjured,
        natureOfInjury: docNatureOfInjury,
        treatmentGivenOHC: docTreatmentGivenOHC,
        injuredSentHospital: docHospitalSent,
        resumedDutyDate: docResumedDutyDate,
        mandaysLost: docMandaysLost,
        medicalOfficerName: docDoctorName,
        medicalOfficerSign: docDoctorSign,
        medicalReportDate: docAccidentRepDate,
        status: 'Reported by Doctor',
        // Default seed causes
        ishikawaCauses: {
          ppe: ['Operator not wear handgloves'],
          environmental: [],
          machineEquipment: ['Sharp edge/oily/odd size material'],
          injuredPerson: ['Operator Negligence'],
          management: [],
          jobProcedure: []
        },
        why1: 'Operator suffered an injury while operating machinery without full protective gear.',
        why2: 'Protective gear was not worn at the active workstation.',
        why3: 'Operator found gloves cumbersome during high-precision manipulation.',
        why4: 'Station SOP did not enforce ergonomic light-dexterity safety gloves.',
        why5: 'Task risk assessment lacked ergonomic dexterity evaluation.',
        rootCauseDescription: 'Absence of ergonomic dexterity-rated safety gloves and lack of supervisor enforcement.'
      });

      setIsDoctorRaiseModalOpen(false);
      setDocInjuredName('');
      setDocTicketNo('');
      alert('Accident Report successfully submitted by Medical Officer! Forwarded to Safety Coordinator for 5-Why Investigation and Corrective Actions.');
    } catch (err) {
      console.error(err);
      alert('Failed to submit accident report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Coordinator Assessment
  const handleCoordinatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordinatorModalItem) return;
    setIsSubmitting(true);
    try {
      const investigatorsList = coordInvestigators
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      await onUpdateAccident(coordinatorModalItem.id, {
        investigationDate: coordInvestDate,
        ishikawaCauses: {
          ppe: coordPpeCauses,
          environmental: coordEnvCauses,
          machineEquipment: coordMachCauses,
          injuredPerson: coordInjuredCauses,
          management: coordMgmtCauses,
          jobProcedure: coordJobProcCauses
        },
        why1: coordWhy1,
        why2: coordWhy2,
        why3: coordWhy3,
        why4: coordWhy4,
        why5: coordWhy5,
        rootCauseDescription: coordRootCauseDesc,
        correctiveActions: coordActions,
        investigators: investigatorsList,
        status: coordStatus,
        closingDate: coordStatus === 'Closed' ? new Date().toLocaleDateString('en-GB') : ''
      });

      setCoordinatorModalItem(null);
      alert('Coordinator Investigation, 5-Why RCA, and Corrective Actions updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update coordinator investigation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action helpers
  const handleAddActionRow = () => {
    setCoordActions(prev => [
      ...prev,
      {
        srNo: prev.length + 1,
        correctiveAction: '',
        responsibility: '',
        targetDate: new Date().toLocaleDateString('en-GB'),
        status: 'Pending'
      }
    ]);
  };

  const handleUpdateActionRow = (idx: number, field: keyof AccidentCorrectiveAction, val: any) => {
    setCoordActions(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleDeleteActionRow = (idx: number) => {
    setCoordActions(prev => prev.filter((_, i) => i !== idx));
  };

  // Filtered accidents
  const filteredAccidents = useMemo(() => {
    return accidents.filter(acc => {
      const matchesSearch = !searchTerm ||
        acc.recordNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.nameOfInjured.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.briefDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.medicalOfficerName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'All' ? true : acc.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [accidents, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full font-mono">
                Submodule 03 · KSPG/EHS Official Form
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs text-slate-500 font-mono">2-Page Compliance Standard</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Accident Reporting &amp; 5-Why Investigation
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isDoctorRole ? (
              <button
                onClick={() => onNavigateRaise ? onNavigateRaise() : setIsDoctorRaiseModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Stethoscope className="w-4 h-4" />
                <span>Raise Accident Report (Doctor)</span>
              </button>
            ) : (
              <span className="px-3 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-mono font-semibold flex items-center space-x-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-rose-600" />
                <span>Doctor (OHC) Role Only to Raise</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Accidents Register Cards & Table */}
      <div className="space-y-4">
        {filteredAccidents.map(acc => {
          const isPendingCoord = acc.status === 'Reported by Doctor' || !acc.rootCauseDescription;
          return (
            <div 
              key={acc.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${
                isPendingCoord ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-start space-x-3.5">
                  <div className={`p-2.5 rounded-xl font-bold text-sm font-mono shrink-0 ${
                    acc.mandaysLost > 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {acc.recordNo}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-base">{acc.nameOfInjured}</span>
                      <span className="text-xs text-slate-500 font-mono">({acc.ticketNo} · {acc.divDepartment})</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        acc.status === 'Closed' ? 'bg-emerald-100 text-emerald-800' :
                        acc.status === 'Reported by Doctor' ? 'bg-rose-100 text-rose-800 animate-pulse' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {acc.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      <strong>Accident Date:</strong> {acc.accidentDate} at {acc.accidentTime} (Shift: {acc.shift}) · <strong>Site:</strong> {acc.exactSite || acc.department}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => setPrintModalReport(acc)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
                    title="View & Print Official 2-Page Form"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>View Official 2-Page Form</span>
                  </button>

                  {isCoordinatorRole && (
                    <button
                      onClick={() => handleOpenCoordinatorModal(acc)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold transition"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-rose-700" />
                      <span>Coordinator Investigation &amp; 5-Why</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2-Column Summary: Doctor's Assessment vs Coordinator's 5-Why */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs">
                {/* Doctor's Assessment */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center space-x-1.5 text-slate-900 font-bold border-b border-slate-200 pb-1">
                    <Stethoscope className="w-4 h-4 text-rose-600" />
                    <span>Medical Officer (Doctor) Assessment</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div><span className="text-slate-500">Body Part:</span> <strong className="text-rose-950 uppercase">{acc.bodyPartInjured}</strong></div>
                    <div><span className="text-slate-500">Nature:</span> <strong className="text-rose-950 uppercase">{acc.natureOfInjury}</strong></div>
                    <div><span className="text-slate-500">Treatment at OHC:</span> <strong className="text-slate-800">{acc.treatmentGivenOHC}</strong></div>
                    <div><span className="text-slate-500">Mandays Lost:</span> <strong className="font-mono text-slate-800">{acc.mandaysLost}</strong></div>
                  </div>
                  <div className="text-[11px] pt-1 border-t border-slate-200/60 flex justify-between text-slate-500 font-mono">
                    <span>Medical Officer: {acc.medicalOfficerName}</span>
                    <span>Resumed: {acc.resumedDutyDate}</span>
                  </div>
                </div>

                {/* Coordinator's 5-Why & CAPA */}
                <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center space-x-1.5 text-amber-950 font-bold border-b border-amber-200 pb-1">
                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                    <span>Safety Coordinator 5-Why RCA &amp; Corrective Action</span>
                  </div>
                  {acc.rootCauseDescription ? (
                    <div className="space-y-1.5 text-[11px]">
                      <div>
                        <strong className="text-amber-900">Root Cause (5-Why):</strong>
                        <div className="text-slate-800 italic mt-0.5">{acc.rootCauseDescription}</div>
                      </div>
                      <div className="pt-1 text-slate-600">
                        <strong>Corrective Actions:</strong> {acc.correctiveActions?.length || 0} active/completed actions logged.
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-700 italic py-2">
                      Pending coordinator 5-Why root cause breakdown and action assignment.
                    </div>
                  )}
                </div>
              </div>

              {/* Visual Fishbone Diagram Output directly on Accident Card */}
              <div className="pt-4 mt-4 border-t border-slate-100">
                <AccidentFishboneDiagram
                  causes={acc.ishikawaCauses}
                  problemTitle={acc.briefDescription || acc.natureOfInjury}
                />
              </div>

              {/* Visual Proof Photos */}
              {(acc.photoBefore || acc.photoAfter) && (
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                  {acc.photoBefore && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-rose-700 font-mono uppercase block">📸 Before (Incident / Injury)</span>
                      <div className="border border-rose-200 rounded-lg overflow-hidden h-28 bg-rose-50/20 flex items-center justify-center p-1">
                        <img src={acc.photoBefore} alt="Before Incident" className="max-h-full max-w-full object-contain rounded" />
                      </div>
                    </div>
                  )}
                  {acc.photoAfter && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-emerald-700 font-mono uppercase block">📸 After (Treatment / Safeguard)</span>
                      <div className="border border-emerald-200 rounded-lg overflow-hidden h-28 bg-emerald-50/20 flex items-center justify-center p-1">
                        <img src={acc.photoAfter} alt="After Treatment" className="max-h-full max-w-full object-contain rounded" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL 1: RAISE ACCIDENT REPORT (Doctor / Medical Officer Form) */}
      {isDoctorRole && isDoctorRaiseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-fade-in max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-rose-50">
              <div className="flex items-center space-x-2.5">
                <Stethoscope className="w-5 h-5 text-rose-600" />
                <div>
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-widest font-mono">
                    KSPG/EHS ACCIDENT REPORT · Page 01
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Raise Accident Report (Raised by Doctor / Process Owner)
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setIsDoctorRaiseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDoctorSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Process Owner / Incident Details */}
              <div className="space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-slate-900 font-mono border-b border-slate-100 pb-1">
                  1. Incident &amp; Shift Information (Within 08 Hrs of Accident)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Division</label>
                    <input
                      type="text"
                      value={docDivision}
                      onChange={(e) => setDocDivision(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Accident Date</label>
                    <input
                      type="text"
                      value={docAccidentDate}
                      onChange={(e) => setDocAccidentDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Accident Time</label>
                    <input
                      type="text"
                      value={docAccidentTime}
                      onChange={(e) => setDocAccidentTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Department where accident occurred</label>
                    <input
                      type="text"
                      value={docDepartment}
                      onChange={(e) => setDocDepartment(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Exact Site of Accident</label>
                    <input
                      type="text"
                      value={docExactSite}
                      onChange={(e) => setDocExactSite(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
                      required
                    />
                  </div>
                </div>

                {/* Leading Activity Checkboxes */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Leading Activity</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {['M/c. Operation', 'Matl. Handling', 'Maintenance', 'Office work', 'Driving', 'Other'].map(act => (
                      <label key={act} className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={docLeadingActivities.includes(act)}
                          onChange={() => toggleLeadingActivity(act)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span>{act}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Brief Description of Accident (Explain What happened, When &amp; How it happened?) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={docBriefDescription}
                    onChange={(e) => setDocBriefDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                    required
                  />
                </div>
              </div>

              {/* Injured Person Info */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold uppercase tracking-wider text-slate-900 font-mono border-b border-slate-100 pb-1">
                  2. Injured Person Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Name of Injured <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. PRINCE YADAV"
                      value={docInjuredName}
                      onChange={(e) => setDocInjuredName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ticket No. <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. TS262"
                      value={docTicketNo}
                      onChange={(e) => setDocTicketNo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Age / Gender</label>
                    <input
                      type="text"
                      placeholder="e.g. 24/M"
                      value={docAgeGender}
                      onChange={(e) => setDocAgeGender(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Shift</label>
                    <select
                      value={docShift}
                      onChange={(e) => setDocShift(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
                    >
                      <option value="FIRST SHIFT">FIRST SHIFT</option>
                      <option value="SECOND SHIFT">SECOND SHIFT</option>
                      <option value="THIRD SHIFT">THIRD SHIFT</option>
                      <option value="GENERAL SHIFT">GENERAL SHIFT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Duty Start Time</label>
                    <input
                      type="text"
                      value={docDutyStartTime}
                      onChange={(e) => setDocDutyStartTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Agency (Caused Injury)</label>
                    <input
                      type="text"
                      value={docAgency}
                      onChange={(e) => setDocAgency(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION TO BE FILLED BY MEDICAL OFFICER (Doctor) */}
              <div className="space-y-3 pt-3 border-t-2 border-rose-300 bg-rose-50/50 p-4 rounded-xl">
                <div className="flex items-center space-x-2 text-rose-900 font-bold border-b border-rose-200 pb-1">
                  <Stethoscope className="w-4 h-4 text-rose-600" />
                  <span className="uppercase tracking-wider font-mono">
                    3. This Section TO BE FILLED BY MEDICAL OFFICER (Doctor)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-rose-950 mb-1">
                      Body Part Injured <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. LEFT HAND THUMB"
                      value={docBodyPartInjured}
                      onChange={(e) => setDocBodyPartInjured(e.target.value)}
                      className="w-full bg-white border border-rose-300 rounded-lg px-3 py-1.5 font-bold uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-rose-950 mb-1">
                      Nature of Injury <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CUT INJURY, LACERATION, CONTUSION"
                      value={docNatureOfInjury}
                      onChange={(e) => setDocNatureOfInjury(e.target.value)}
                      className="w-full bg-white border border-rose-300 rounded-lg px-3 py-1.5 font-bold uppercase"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    What Treatment given at O.H.C. (Dispensary) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CLEANING & DRESSING, TETANUS TOXOID"
                    value={docTreatmentGivenOHC}
                    onChange={(e) => setDocTreatmentGivenOHC(e.target.value)}
                    className="w-full bg-white border border-rose-300 rounded-lg px-3 py-1.5"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Injured Sent to which Hospital</label>
                    <input
                      type="text"
                      value={docHospitalSent}
                      onChange={(e) => setDocHospitalSent(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Resumed Duty Date</label>
                    <input
                      type="text"
                      value={docResumedDutyDate}
                      onChange={(e) => setDocResumedDutyDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mandays Lost</label>
                    <input
                      type="number"
                      min={0}
                      value={docMandaysLost}
                      onChange={(e) => setDocMandaysLost(Number(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block font-semibold text-rose-950 mb-1">
                      Name of Medical Officer (Doctor) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. ARJUN CHOUDHARY"
                      value={docDoctorName}
                      onChange={(e) => setDocDoctorName(e.target.value)}
                      className="w-full bg-white border border-rose-300 rounded-lg px-3 py-1.5 font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Doctor Signature / Credential</label>
                    <input
                      type="text"
                      value={docDoctorSign}
                      onChange={(e) => setDocDoctorSign(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 italic"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDoctorRaiseModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition shadow-sm"
                >
                  {isSubmitting ? 'Submitting Form...' : 'Submit Doctor Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SAFETY COORDINATOR SECTION (Page 2: Ishikawa & 5-Why Analysis) */}
      {isCoordinatorRole && coordinatorModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-fade-in max-h-[94vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-amber-50">
              <div className="flex items-center space-x-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-700" />
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest font-mono">
                    KSPG/EHS Page 02 · Safety Coordinator Investigation
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Accident #{coordinatorModalItem.recordNo} · {coordinatorModalItem.nameOfInjured}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setCoordinatorModalItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCoordinatorSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Doctor Handover Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 space-y-1">
                <div>
                  <strong>Injured:</strong> {coordinatorModalItem.nameOfInjured} ({coordinatorModalItem.divDepartment}) · <strong>Date:</strong> {coordinatorModalItem.accidentDate}
                </div>
                <div>
                  <strong>Doctor Findings:</strong> {coordinatorModalItem.natureOfInjury} on {coordinatorModalItem.bodyPartInjured} (Reported by {coordinatorModalItem.medicalOfficerName})
                </div>
              </div>

              {/* 1. Interactive Visual Fishbone Diagram Selection */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-slate-900 font-mono border-b border-slate-100 pb-1">
                  1. Cause(s) of the Incident — Interactive Fishbone Diagram (Click circle to blacken)
                </h4>
                <AccidentFishboneDiagram
                  interactive
                  problemTitle={coordinatorModalItem.briefDescription || coordinatorModalItem.natureOfInjury}
                  causes={{
                    ppe: coordPpeCauses,
                    environmental: coordEnvCauses,
                    machineEquipment: coordMachCauses,
                    injuredPerson: coordInjuredCauses,
                    management: coordMgmtCauses,
                    jobProcedure: coordJobProcCauses
                  }}
                  onToggleCause={handleToggleFishboneCategory}
                />
              </div>

              {/* USER MANDATE: "Add 5 Why analysis in Describe the Causes (What went wrong?)" */}
              <div className="space-y-3 pt-2 border-t border-slate-200 bg-amber-500/5 p-4 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between border-b border-amber-200 pb-1">
                  <h4 className="font-bold uppercase tracking-wider text-amber-950 font-mono">
                    2. Describe the Causes (What went wrong?) · 5-Why Analysis
                  </h4>
                  <span className="text-[10px] text-amber-800 font-medium">Mandatory 5-Why Drilldown</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-16 font-mono font-bold text-slate-600 shrink-0">Why 1:</span>
                    <input
                      type="text"
                      placeholder="Why did the physical event happen?"
                      value={coordWhy1}
                      onChange={(e) => setCoordWhy1(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-16 font-mono font-bold text-slate-600 shrink-0">Why 2:</span>
                    <input
                      type="text"
                      placeholder="Why?"
                      value={coordWhy2}
                      onChange={(e) => setCoordWhy2(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-16 font-mono font-bold text-slate-600 shrink-0">Why 3:</span>
                    <input
                      type="text"
                      placeholder="Why?"
                      value={coordWhy3}
                      onChange={(e) => setCoordWhy3(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-16 font-mono font-bold text-slate-600 shrink-0">Why 4:</span>
                    <input
                      type="text"
                      placeholder="Why?"
                      value={coordWhy4}
                      onChange={(e) => setCoordWhy4(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-16 font-mono font-bold text-slate-600 shrink-0">Why 5:</span>
                    <input
                      type="text"
                      placeholder="Why (Systemic root cause)?"
                      value={coordWhy5}
                      onChange={(e) => setCoordWhy5(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Root Cause Synthesis (Final Conclusion)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Synthesized systemic explanation of what went wrong..."
                    value={coordRootCauseDesc}
                    onChange={(e) => setCoordRootCauseDesc(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-lg p-2.5 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Corrective Actions Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <h4 className="font-bold uppercase tracking-wider text-slate-900 font-mono">
                    3. Corrective Action(s)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddActionRow}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Action Row</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-semibold text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="px-2 py-1.5 w-10 text-center">Sr.</th>
                        <th className="px-3 py-1.5">Corrective Action</th>
                        <th className="px-3 py-1.5 w-36">Responsibility</th>
                        <th className="px-3 py-1.5 w-32">Target Date</th>
                        <th className="px-2 py-1.5 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {coordActions.map((act, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-1.5 text-center font-mono font-bold">{idx + 1}</td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={act.correctiveAction}
                              onChange={(e) => handleUpdateActionRow(idx, 'correctiveAction', e.target.value)}
                              placeholder="e.g. One point lesson display on station."
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
                              required
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={act.responsibility}
                              onChange={(e) => handleUpdateActionRow(idx, 'responsibility', e.target.value)}
                              placeholder="e.g. Gunaji"
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
                              required
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={act.targetDate}
                              onChange={(e) => handleUpdateActionRow(idx, 'targetDate', e.target.value)}
                              placeholder="e.g. 11-02-2025"
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono"
                              required
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteActionRow(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Investigators & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Investigation Done By (Names, 1 per line)</label>
                  <textarea
                    rows={3}
                    value={coordInvestigators}
                    onChange={(e) => setCoordInvestigators(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Overall Accident Closure Status</label>
                  <select
                    value={coordStatus}
                    onChange={(e) => setCoordStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
                  >
                    <option value="Reported by Doctor">Reported by Doctor</option>
                    <option value="Under Coordinator Investigation">Under Coordinator Investigation</option>
                    <option value="Actions In-Progress">Actions In-Progress</option>
                    <option value="Closed">Closed (Investigation &amp; CAPA Verified)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCoordinatorModalItem(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition shadow-sm"
                >
                  {isSubmitting ? 'Saving Investigation...' : 'Save 5-Why Investigation & CAPA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: OFFICIAL 2-PAGE PRINT / PDF VIEW */}
      {printModalReport && (
        <AccidentReportPrintView
          report={printModalReport}
          onClose={() => setPrintModalReport(null)}
        />
      )}
    </div>
  );
}
