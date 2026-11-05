import React, { useState } from 'react';
import { AccidentReport } from '../../types';
import { Camera, Upload, Check, Stethoscope, AlertOctagon, X, UserCheck, HeartPulse } from 'lucide-react';
import CameraModal from '../CameraModal';

interface AccidentDoctorFormProps {
  onAddAccident: (acc: Partial<AccidentReport>) => Promise<void>;
  onCancel: () => void;
  onSuccess?: () => void;
}

// Preset SVGs for mock Accident images
const accidentPresets = {
  thumbCutBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fff1f2"/><g stroke="%23e11d48" stroke-width="2" fill="none"><path d="M160,180 C160,110 170,80 190,80 C205,80 210,105 210,130 L210,180" stroke="%23be123c" stroke-width="4"/><path d="M175,100 L195,115" stroke="%23e11d48" stroke-width="4"/><circle cx="185" cy="110" r="5" fill="%23e11d48"/><path d="M170,140 Q150,150 140,165" stroke="%23e11d48" stroke-width="3"/></g><text x="200" y="215" font-family="sans-serif" font-weight="bold" font-size="12" fill="%23be123c" text-anchor="middle">CUT INJURY ON LEFT THUMB - SHARP EDGE</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%23e11d48"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">BEFORE</text></svg>`,
  thumbCutAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><g stroke="%2316a34a" stroke-width="2" fill="none"><path d="M160,180 C160,110 170,80 190,80 C205,80 210,105 210,130 L210,180" stroke="%2315803d" stroke-width="4"/><rect x="175" y="90" width="30" height="35" rx="4" fill="%23ffffff" stroke="%2316a34a" stroke-width="2"/><line x1="180" y1="107" x2="200" y2="107" stroke="%23e11d48" stroke-width="3"/><line x1="190" y1="97" x2="190" y2="117" stroke="%23e11d48" stroke-width="3"/><path d="M190,40 L197,47 L210,34" stroke="%2315803d" stroke-width="4"/></g><text x="200" y="215" font-family="sans-serif" font-weight="bold" font-size="12" fill="%2315803d" text-anchor="middle">OHC ANTISEPTIC DRESSING &amp; LEVEL 5 CUT GLOVE</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%2316a34a"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">AFTER</text></svg>`,
  ankleSprainBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fff1f2"/><g stroke="%23e11d48" stroke-width="2" fill="none"><ellipse cx="200" cy="180" rx="70" ry="15" fill="%23fecdd3" stroke="%23e11d48" stroke-width="2"/><path d="M170,70 L185,150 L230,170" stroke="%23881337" stroke-width="6" stroke-linecap="round"/><circle cx="185" cy="150" r="14" fill="%23fca5a5" stroke="%23e11d48" stroke-width="2"/><text x="185" y="155" font-family="sans-serif" font-weight="bold" font-size="12" fill="%23881337" text-anchor="middle">⚡</text></g><text x="200" y="220" font-family="sans-serif" font-weight="bold" font-size="12" fill="%23be123c" text-anchor="middle">ANKLE SLIP ON HYDRAULIC OIL FILM</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%23e11d48"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">BEFORE</text></svg>`,
  ankleSprainAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><g stroke="%2316a34a" stroke-width="2" fill="none"><path d="M170,70 L185,150 L230,170" stroke="%2315803d" stroke-width="6" stroke-linecap="round"/><rect x="175" y="130" width="35" height="35" rx="6" fill="%23bbf7d0" stroke="%2315803d" stroke-width="2"/><path d="M190,50 L197,57 L210,44" stroke="%2315803d" stroke-width="4"/></g><text x="200" y="220" font-family="sans-serif" font-weight="bold" font-size="12" fill="%2315803d" text-anchor="middle">CRAPE BANDAGE APPLIED &amp; ANTI-SKID MATTING</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%2316a34a"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">AFTER</text></svg>`,
  genericBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fff1f2"/><rect x="50" y="50" width="300" height="150" rx="8" fill="none" stroke="%23fb7185" stroke-width="2" stroke-dasharray="6,6"/><circle cx="200" cy="120" r="30" fill="%23fecdd3"/><text x="200" y="125" font-family="sans-serif" font-weight="bold" font-size="18" fill="%23e11d48" text-anchor="middle">🚑</text><text x="200" y="175" font-family="sans-serif" font-size="12" font-weight="bold" fill="%239f1239" text-anchor="middle">BEFORE: ACCIDENT / INJURY PHOTO</text></svg>`,
  genericAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><rect x="50" y="50" width="300" height="150" rx="8" fill="none" stroke="%234ade80" stroke-width="2" stroke-dasharray="6,6"/><circle cx="200" cy="120" r="30" fill="%23bbf7d0"/><path d="M190,120 L197,127 L210,114" stroke="%2316a34a" stroke-width="4" fill="none"/><text x="200" y="175" font-family="sans-serif" font-size="12" font-weight="bold" fill="%2315803d" text-anchor="middle">AFTER: MEDICAL TREATMENT PHOTO</text></svg>`
};

export default function AccidentDoctorForm({ onAddAccident, onCancel, onSuccess }: AccidentDoctorFormProps) {
  // Section 1: General & Incident Details (Attachment 3 Page 01)
  const [division, setDivision] = useState('Pierburg');
  const [department, setDepartment] = useState('Pierburg (Module line 1)');
  const [accidentDate, setAccidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [accidentTime, setAccidentTime] = useState('20:40');
  const [accidentRepDate, setAccidentRepDate] = useState(new Date().toISOString().split('T')[0]);
  const [leadingActivity, setLeadingActivity] = useState<string[]>(['M/c. Operation']);
  const [otherActivity, setOtherActivity] = useState('');
  const [exactSite, setExactSite] = useState('PIERBURG - MODULE LINE 1');
  const [briefDescription, setBriefDescription] = useState('CUT INJURY ON LEFT HAND THUMB');
  const [immediateActions, setImmediateActions] = useState('Send to 1st aid in company dispensary');

  // Section 2: Injured Person Particulars
  const [injuredName, setInjuredName] = useState('PRINCE YADAV');
  const [ticketNo, setTicketNo] = useState('TS262');
  const [ageYrs, setAgeYrs] = useState('24/M');
  const [shift, setShift] = useState<'1st' | '2nd' | '3rd' | 'General'>('2nd');
  const [agency, setAgency] = useState('Cut injury on left hand thumb');
  const [dutyStartTime, setDutyStartTime] = useState('16:00');
  const [witnessName1, setWitnessName1] = useState('Vishwajit Patil');
  const [witnessName2, setWitnessName2] = useState('Mr. Nitesh Patil');
  const [managerName, setManagerName] = useState('Gunaji Parab');

  // Section 3: MEDICAL OFFICER / DOCTOR CLINICAL SECTION (Compulsory filled by Doctor)
  const [bodyPartInjured, setBodyPartInjured] = useState('LEFT HAND THUMB');
  const [natureOfInjury, setNatureOfInjury] = useState('CUT INJURY');
  const [treatmentGiven, setTreatmentGiven] = useState('CLEANING & DRESSING');
  const [injuredSentHospital, setInjuredSentHospital] = useState('N/A (Treated at Plant OHC)');
  const [resumedDutyDate, setResumedDutyDate] = useState('JOINED AFTER OPD, SAME SHIFT');
  const [mandaysLost, setMandaysLost] = useState<number>(0);
  const [medicalOfficerName, setMedicalOfficerName] = useState('Dr. Arjun Choudhary');

  // Compulsory Before & After Photo Proofs (Replicating Kaizen standard)
  const [photoBefore, setPhotoBefore] = useState(accidentPresets.genericBefore);
  const [photoAfter, setPhotoAfter] = useState(accidentPresets.genericAfter);
  const [cameraTarget, setCameraTarget] = useState<'before' | 'after' | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          if (target === 'before') setPhotoBefore(reader.result);
          else setPhotoAfter(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleActivity = (activity: string) => {
    setLeadingActivity(prev => 
      prev.includes(activity) ? prev.filter(a => a !== activity) : [...prev, activity]
    );
  };

  const loadPreset = (type: 'thumb' | 'ankle') => {
    if (type === 'thumb') {
      setPhotoBefore(accidentPresets.thumbCutBefore);
      setPhotoAfter(accidentPresets.thumbCutAfter);
      setDivision('Pierburg');
      setDepartment('Pierburg (Module line 1)');
      setAccidentDate('2025-01-11');
      setAccidentTime('20:40');
      setAccidentRepDate('2025-01-11');
      setLeadingActivity(['M/c. Operation']);
      setExactSite('PIERBURG - MODULE LINE 1');
      setBriefDescription('CUT INJURY ON LEFT HAND THUMB. While deburring aluminum casing, sharp edge slipped into glove thumb seam.');
      setImmediateActions('Send to 1st aid in company dispensary. Replaced deburring tool.');
      setInjuredName('PRINCE YADAV');
      setTicketNo('TS262');
      setAgeYrs('24/M');
      setShift('2nd');
      setAgency('Cut injury on left hand thumb');
      setDutyStartTime('16:00');
      setWitnessName1('Vishwajit Patil');
      setWitnessName2('Mr. Nitesh Patil');
      setManagerName('Gunaji Parab');
      setBodyPartInjured('LEFT HAND THUMB');
      setNatureOfInjury('CUT INJURY');
      setTreatmentGiven('CLEANING & DRESSING');
      setInjuredSentHospital('N/A (Treated at Plant OHC)');
      setResumedDutyDate('JOINED AFTER OPD, SAME SHIFT');
      setMandaysLost(0);
      setMedicalOfficerName('Dr. Arjun Choudhary');
    } else {
      setPhotoBefore(accidentPresets.ankleSprainBefore);
      setPhotoAfter(accidentPresets.ankleSprainAfter);
      setDivision('Pierburg');
      setDepartment('Machining Cell 3');
      setAccidentDate('2025-02-14');
      setAccidentTime('14:20');
      setAccidentRepDate('2025-02-14');
      setLeadingActivity(['Matl. Handling']);
      setExactSite('MACHINING CELL 3 GANGWAY');
      setBriefDescription('Right ankle twisted when walking across puddle of hydraulic coolant during tote box transfer.');
      setImmediateActions('First aid applied. Cold ice pack compression administered. Absorbent granules spread on coolant spill.');
      setInjuredName('RAJESH KADAM');
      setTicketNo('MK104');
      setAgeYrs('32/M');
      setShift('1st');
      setAgency('Slip and ankle twist on oily surface');
      setDutyStartTime('07:00');
      setWitnessName1('Suresh More');
      setWitnessName2('Pramod Shinde');
      setManagerName('Amey Kanjale');
      setBodyPartInjured('RIGHT ANKLE');
      setNatureOfInjury('SOFT TISSUE SPRAIN');
      setTreatmentGiven('ICE COMPRESSION, ANALGESIC OINTMENT, CREPE BANDAGE');
      setInjuredSentHospital('City Ortho Clinic (X-Ray cleared)');
      setResumedDutyDate('2025-02-16');
      setMandaysLost(1);
      setMedicalOfficerName('Dr. Meena Rao');
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!injuredName.trim()) {
      setError('Please enter Name of Injured Person.');
      return;
    }
    if (!medicalOfficerName.trim()) {
      setError('Please enter Name of Medical Officer / Doctor submitting this report.');
      return;
    }
    if (!natureOfInjury.trim() || !bodyPartInjured.trim()) {
      setError('Medical details (Nature of Injury & Body Part Injured) are compulsory.');
      return;
    }

    const isBeforePhotoMissing = !photoBefore || photoBefore === accidentPresets.genericBefore;
    const isAfterPhotoMissing = !photoAfter || photoAfter === accidentPresets.genericAfter;

    if (isBeforePhotoMissing && isAfterPhotoMissing) {
      setError('Both BEFORE (Injury/Site) and AFTER (Medical Treatment) visual photos are required (Kaizen standard). Please upload or take photos, or use a quick demo preset.');
      return;
    }
    if (isBeforePhotoMissing) {
      setError('The BEFORE status photo is required to document the injury/site. Please upload or capture photo.');
      return;
    }
    if (isAfterPhotoMissing) {
      setError('The AFTER / medical treatment photo is required. Please upload or capture photo.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const shiftMapped: 'FIRST SHIFT' | 'SECOND SHIFT' | 'THIRD SHIFT' | 'GENERAL SHIFT' = 
      shift === '1st' ? 'FIRST SHIFT' :
      shift === '2nd' ? 'SECOND SHIFT' :
      shift === '3rd' ? 'THIRD SHIFT' : 'GENERAL SHIFT';

    try {
      await onAddAccident({
        division,
        department,
        accidentDate,
        accidentTime,
        accidentRepDate,
        leadingActivity,
        leadingActivityOther: otherActivity,
        briefDescription,
        immediateCorrectiveActions: immediateActions,
        nameOfInjured: injuredName,
        ticketNo,
        divDepartment: department,
        ageGender: ageYrs,
        shift: shiftMapped,
        agency,
        exactSite,
        dutyStartTime,
        witnesses: [
          { name: witnessName1, address: 'Talegaon', ticketNo: '696', sign: 'Yes' },
          { name: witnessName2, address: 'Kanhe', ticketNo: '6330', sign: 'Yes' }
        ],
        managerName,
        plantHeadName: 'Plant Head (Pune)',
        bodyPartInjured,
        natureOfInjury,
        treatmentGivenOHC: treatmentGiven,
        injuredSentHospital,
        resumedDutyDate,
        mandaysLost: Number(mandaysLost) || 0,
        medicalOfficerName,
        medicalReportDate: accidentRepDate,
        photoBefore,
        photoAfter,
        status: 'Reported by Doctor',
        ishikawaCauses: {
          ppe: [],
          environmental: [],
          machineEquipment: [],
          injuredPerson: [],
          management: [],
          jobProcedure: []
        },
        why1: '',
        why2: '',
        why3: '',
        why4: '',
        why5: '',
        rootCauseDescription: '',
        correctiveActions: [],
        investigators: []
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit Accident Report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden max-w-5xl mx-auto my-6">
      
      {/* Title Header (Kaizen Look & Feel) */}
      <div className="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
              Submodule 3: Doctor Initiation Portal
            </span>
            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
              OHC Medical Officer
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide mt-1 flex items-center space-x-2">
            <span>KSPG / EHS ACCIDENT REPORT (Page 01 of 02)</span>
          </h2>
        </div>
        
        {/* Test Preset Buttons */}
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Demo Presets:</span>
          <button
            type="button"
            onClick={() => loadPreset('thumb')}
            className="px-2.5 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition cursor-pointer"
          >
            🩹 Thumb Cut (Pierburg)
          </button>
          <button
            type="button"
            onClick={() => loadPreset('ankle')}
            className="px-2.5 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition cursor-pointer"
          >
            🦶 Ankle Sprain (Machining)
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">

        {/* Error Messages */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-800 rounded-r-lg font-medium flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}



        {/* SECTION 1: INCIDENT METADATA */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono block">
            1. Accident General Information (Page 01 Header)
          </span>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Division</label>
              <input
                type="text"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Department Occurred</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Accident Date</label>
              <input
                type="date"
                value={accidentDate}
                onChange={(e) => setAccidentDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Accident Time (hh:mm)</label>
              <input
                type="time"
                value={accidentTime}
                onChange={(e) => setAccidentTime(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
                required
              />
            </div>
          </div>

          {/* Leading Activity Checkboxes (Attachment 3 Page 01 format) */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 font-mono">
              Leading Activity:
            </label>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700">
              {['M/c. Operation', 'Matl. Handling', 'Maintenance', 'Office work', 'Driving', 'Other'].map(act => (
                <label key={act} className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 border border-slate-200 rounded-lg hover:border-slate-400">
                  <input
                    type="checkbox"
                    checked={leadingActivity.includes(act)}
                    onChange={() => toggleActivity(act)}
                    className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  <span>{act}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 2: INJURED PERSON & INCIDENT DETAILS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Injured Person Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono block">
              2. Injured Person Details
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-mono">Name of Injured *</label>
                <input
                  type="text"
                  value={injuredName}
                  onChange={(e) => setInjuredName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-mono">Ticket No. *</label>
                <input
                  type="text"
                  value={ticketNo}
                  onChange={(e) => setTicketNo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-mono">Age / Gender</label>
                <input
                  type="text"
                  value={ageYrs}
                  onChange={(e) => setAgeYrs(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium"
                  placeholder="e.g. 24/M"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-mono">Shift</label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-medium"
                >
                  <option value="1st">1st Shift</option>
                  <option value="2nd">2nd Shift</option>
                  <option value="3rd">3rd Shift</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-mono">Duty Start Time</label>
                <input
                  type="time"
                  value={dutyStartTime}
                  onChange={(e) => setDutyStartTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-mono">Agency (What caused injury?)</label>
              <input
                type="text"
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium"
                placeholder="e.g. Cut injury on left hand thumb from casing flash"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-mono">Exact Site of Accident</label>
              <input
                type="text"
                value={exactSite}
                onChange={(e) => setExactSite(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium"
              />
            </div>
          </div>

          {/* Description & Immediate Action */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono block">
              3. Description &amp; Immediate Action
            </span>

            <div>
              <label className="block text-xs font-bold text-rose-900 uppercase tracking-wider mb-1">
                Brief Description of Accident <span className="text-red-500">*</span>
              </label>
              <textarea
                value={briefDescription}
                onChange={(e) => setBriefDescription(e.target.value)}
                rows={3}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Explain what happened, when, and how it happened..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                Immediate Corrective Actions Initiated / Taken
              </label>
              <textarea
                value={immediateActions}
                onChange={(e) => setImmediateActions(e.target.value)}
                rows={2}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Sent to 1st aid in company dispensary. Machine stopped..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-mono">Witness 1</label>
                <input
                  type="text"
                  value={witnessName1}
                  onChange={(e) => setWitnessName1(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                  placeholder="Witness Name"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 font-mono">Witness 2</label>
                <input
                  type="text"
                  value={witnessName2}
                  onChange={(e) => setWitnessName2(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                  placeholder="Witness Name"
                />
              </div>
            </div>
          </div>

        </div>

        {/* SECTION 3: THIS SECTION TO BE FILLED BY MEDICAL OFFICER (Doctor Section from Attachment 3) */}
        <div className="border-2 border-indigo-200 bg-indigo-50/40 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
            <div className="flex items-center space-x-2">
              <HeartPulse className="w-5 h-5 text-indigo-600" />
              <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                THIS SECTION TO BE FILLED BY MEDICAL OFFICER (Doctor / OHC)
              </h3>
            </div>
            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider">
              Doctor Verified
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-1 font-mono">
                Body Part Injured <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={bodyPartInjured}
                onChange={(e) => setBodyPartInjured(e.target.value)}
                className="w-full bg-white border border-indigo-300 rounded-lg px-3 py-1.5 text-sm font-bold text-indigo-950"
                placeholder="e.g. LEFT HAND THUMB"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-1 font-mono">
                Nature of Injury <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={natureOfInjury}
                onChange={(e) => setNatureOfInjury(e.target.value)}
                className="w-full bg-white border border-indigo-300 rounded-lg px-3 py-1.5 text-sm font-bold text-indigo-950"
                placeholder="e.g. CUT INJURY, SPRAIN, BURN"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-1 font-mono">
                What Treatment Given at O.H.C.
              </label>
              <input
                type="text"
                value={treatmentGiven}
                onChange={(e) => setTreatmentGiven(e.target.value)}
                className="w-full bg-white border border-indigo-300 rounded-lg px-3 py-1.5 text-sm"
                placeholder="e.g. CLEANING & DRESSING, TETANUS"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-1 font-mono">
                Injured Sent to Hospital?
              </label>
              <input
                type="text"
                value={injuredSentHospital}
                onChange={(e) => setInjuredSentHospital(e.target.value)}
                className="w-full bg-white border border-indigo-300 rounded-lg px-3 py-1.5 text-sm"
                placeholder="Hospital Name or N/A"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-1 font-mono">
                Resumed Duty Date
              </label>
              <input
                type="text"
                value={resumedDutyDate}
                onChange={(e) => setResumedDutyDate(e.target.value)}
                className="w-full bg-white border border-indigo-300 rounded-lg px-3 py-1.5 text-sm"
                placeholder="e.g. JOINED SAME SHIFT"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-1 font-mono">
                Mandays Lost
              </label>
              <input
                type="number"
                min="0"
                value={mandaysLost}
                onChange={(e) => setMandaysLost(parseInt(e.target.value) || 0)}
                className="w-full bg-white border border-indigo-300 rounded-lg px-3 py-1.5 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-1 font-mono">
                Doctor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={medicalOfficerName}
                onChange={(e) => setMedicalOfficerName(e.target.value)}
                className="w-full bg-white border border-indigo-300 rounded-lg px-3 py-1.5 text-sm font-bold text-indigo-950"
                placeholder="Dr. Arjun Choudhary"
                required
              />
            </div>
          </div>
        </div>

        {/* Compulsory Photo Upload Block (Exact Kaizen standard) */}
        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-2 gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <span>📸 BEFORE &amp; AFTER VISUAL PROOF DOCUMENTATION</span>
                <span className="text-red-500 font-bold text-sm">*</span>
              </h3>
            </div>
            <span className="text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider shrink-0">
              Compulsory Photos Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Before Photo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-700 uppercase font-mono">Photo: BEFORE (Injury / Incident Site)</span>
                  {photoBefore && photoBefore !== accidentPresets.genericBefore ? (
                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-mono">
                      ✓ Attached
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold bg-red-100 text-red-800 border border-red-300 px-1.5 py-0.5 rounded font-mono animate-pulse">
                      ⚠️ Required *
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setCameraTarget('before')}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center space-x-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Take Photo</span>
                  </button>
                  <label className="cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, 'before')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              <div className={`bg-white border rounded-xl overflow-hidden aspect-video relative flex items-center justify-center p-2 group shadow-inner transition ${
                photoBefore && photoBefore !== accidentPresets.genericBefore
                  ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                  : 'border-red-300 bg-red-50/20'
              }`}>
                <img
                  src={photoBefore}
                  alt="Accident Injury / Site Before"
                  className="max-h-full max-w-full object-contain rounded"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all gap-2">
                  <button
                    type="button"
                    onClick={() => setCameraTarget('before')}
                    className="text-xs text-white font-bold bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg border border-white/20 cursor-pointer"
                  >
                    Take Photo
                  </button>
                  <label className="cursor-pointer text-xs text-white font-bold bg-slate-900/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-white/20">
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, 'before')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* After Photo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-700 uppercase font-mono">Photo: AFTER (Medical Treatment / Guard)</span>
                  {photoAfter && photoAfter !== accidentPresets.genericAfter ? (
                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-mono">
                      ✓ Attached
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold bg-red-100 text-red-800 border border-red-300 px-1.5 py-0.5 rounded font-mono animate-pulse">
                      ⚠️ Required *
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setCameraTarget('after')}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center space-x-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Take Photo</span>
                  </button>
                  <label className="cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, 'after')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              <div className={`bg-white border rounded-xl overflow-hidden aspect-video relative flex items-center justify-center p-2 group shadow-inner transition ${
                photoAfter && photoAfter !== accidentPresets.genericAfter
                  ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                  : 'border-red-300 bg-red-50/20'
              }`}>
                <img
                  src={photoAfter}
                  alt="Medical Treatment After"
                  className="max-h-full max-w-full object-contain rounded"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all gap-2">
                  <button
                    type="button"
                    onClick={() => setCameraTarget('after')}
                    className="text-xs text-white font-bold bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg border border-white/20 cursor-pointer"
                  >
                    Take Photo
                  </button>
                  <label className="cursor-pointer text-xs text-white font-bold bg-slate-900/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-white/20">
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, 'after')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-200 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Cancel &amp; Return to Register
          </button>
          
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Routing to Safety Coordinator...' : 'Submit Doctor Accident Report'}</span>
            </button>
          </div>
        </div>

      </form>

      {/* Live Device Camera Modal */}
      {cameraTarget && (
        <CameraModal
          isOpen={true}
          title={`Capture ${cameraTarget === 'before' ? 'BEFORE (Injury / Incident)' : 'AFTER (Treatment / Safe)'} Photo`}
          onCapture={(dataUrl) => {
            if (cameraTarget === 'before') setPhotoBefore(dataUrl);
            else setPhotoAfter(dataUrl);
            setCameraTarget(null);
          }}
          onClose={() => setCameraTarget(null)}
        />
      )}

    </div>
  );
}
