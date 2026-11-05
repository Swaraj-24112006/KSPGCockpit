import React, { useState } from 'react';
import { SafetyObservation } from '../../types';
import { Camera, Upload, Check, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import CameraModal from '../CameraModal';

interface SafetyObservationFormProps {
  onAddObservation: (obs: Partial<SafetyObservation>) => Promise<void>;
  onCancel: () => void;
  onSuccess?: () => void;
}

// Preset SVGs for mock safety observation images
const safetyPresets = {
  waterNearElectricalBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fef2f2"/><g stroke="%23dc2626" stroke-width="2" fill="none"><rect x="140" y="80" width="120" height="100" fill="%23fee2e2" stroke="%23b91c1c" stroke-width="3" rx="6"/><path d="M170,120 L230,120 M200,95 L200,165" stroke="%23b91c1c" stroke-width="3"/><path d="M200,40 Q180,60 200,80" stroke="%230284c7" stroke-width="4" stroke-dasharray="3,3"/><circle cx="200" cy="85" r="5" fill="%230284c7"/></g><text x="200" y="215" font-family="sans-serif" font-weight="bold" font-size="13" fill="%23b91c1c" text-anchor="middle">WATER DRIPPING NEAR ELECTRICAL FILTER UNIT</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%23dc2626"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">BEFORE</text></svg>`,
  waterNearElectricalAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><g stroke="%2316a34a" stroke-width="2" fill="none"><rect x="140" y="80" width="120" height="100" fill="%23dcfce7" stroke="%2315803d" stroke-width="3" rx="6"/><rect x="120" y="65" width="160" height="15" fill="%2316a34a" rx="4"/><path d="M190,130 L197,137 L210,124" stroke="%2315803d" stroke-width="4"/></g><text x="200" y="215" font-family="sans-serif" font-weight="bold" font-size="13" fill="%2315803d" text-anchor="middle">WATER DEFLECTOR &amp; DRAINAGE TRAY INSTALLED</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%2316a34a"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">AFTER</text></svg>`,
  fumesInShopBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fffbeb"/><g stroke="%23d97706" stroke-width="2" fill="none"><circle cx="200" cy="110" r="45" fill="%23fde68a" stroke="%23b45309" stroke-width="3"/><path d="M170,70 Q190,40 210,65 Q230,40 240,70" stroke="%2378716c" stroke-width="4" stroke-dasharray="4,4"/><path d="M160,110 L240,110 M200,80 L200,140" stroke="%23b45309" stroke-width="3"/></g><text x="200" y="215" font-family="sans-serif" font-weight="bold" font-size="13" fill="%2392400e" text-anchor="middle">AIR FUMES SPREADING FROM TEST ROOM</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%23d97706"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">BEFORE</text></svg>`,
  fumesInShopAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><g stroke="%2316a34a" stroke-width="2" fill="none"><rect x="150" y="60" width="100" height="90" fill="%23bbf7d0" stroke="%2315803d" stroke-width="3" rx="8"/><path d="M200,60 L200,30 L260,30" stroke="%2315803d" stroke-width="4"/><path d="M190,110 L197,117 L210,104" stroke="%2315803d" stroke-width="4"/></g><text x="200" y="215" font-family="sans-serif" font-weight="bold" font-size="13" fill="%2315803d" text-anchor="middle">FUME EXTRACTION HOOD &amp; DUCT MOUNTED</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%2316a34a"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">AFTER</text></svg>`,
  genericBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fef2f2"/><rect x="50" y="50" width="300" height="150" rx="8" fill="none" stroke="%23f87171" stroke-width="2" stroke-dasharray="6,6"/><circle cx="200" cy="120" r="30" fill="%23fecaca"/><text x="200" y="125" font-family="sans-serif" font-weight="bold" font-size="18" fill="%23dc2626" text-anchor="middle">!</text><text x="200" y="175" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23b91c1c" text-anchor="middle">BEFORE: UNSAFE CONDITION PHOTO</text></svg>`,
  genericAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><rect x="50" y="50" width="300" height="150" rx="8" fill="none" stroke="%234ade80" stroke-width="2" stroke-dasharray="6,6"/><circle cx="200" cy="120" r="30" fill="%23bbf7d0"/><path d="M190,120 L197,127 L210,114" stroke="%2316a34a" stroke-width="4" fill="none"/><text x="200" y="175" font-family="sans-serif" font-size="12" font-weight="bold" fill="%2315803d" text-anchor="middle">AFTER: COUNTERMEASURE PHOTO</text></svg>`
};

export default function SafetyObservationForm({ onAddObservation, onCancel, onSuccess }: SafetyObservationFormProps) {
  // Initiator Fields (Attachment 1: till Before Condition)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<'A' | 'B' | 'C' | 'General'>('A');
  const [raisedBy, setRaisedBy] = useState('');
  const [minifactory, setMinifactory] = useState('MF3');
  const [line, setLine] = useState('');
  const [station, setStation] = useState('');
  const [legend, setLegend] = useState<'Unsafe condition' | 'Unsafe act'>('Unsafe condition');
  const [beforeCondition, setBeforeCondition] = useState('');
  const [suggestedControl, setSuggestedControl] = useState('');

  // Compulsory Before & After Photo Proofs (Replicating Kaizen standard)
  const [photoBefore, setPhotoBefore] = useState(safetyPresets.genericBefore);
  const [photoAfter, setPhotoAfter] = useState(safetyPresets.genericAfter);
  const [cameraTarget, setCameraTarget] = useState<'before' | 'after' | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File Upload Handlers (Real FileReader support)
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

  const loadPreset = (type: 'water' | 'fumes') => {
    if (type === 'water') {
      setPhotoBefore(safetyPresets.waterNearElectricalBefore);
      setPhotoAfter(safetyPresets.waterNearElectricalAfter);
      setDate('2026-10-12');
      setShift('A');
      setRaisedBy('Sagar Fadtare');
      setMinifactory('MF3');
      setLine('Sub-Assembly L2');
      setStation('Drinking water point');
      setLegend('Unsafe condition');
      setBeforeCondition('While feeding water chances of falling on air filter and electrical control unit. Slippery wet puddle creating slip hazard.');
      setSuggestedControl('Relocate water dispensing line and install drip deflection trough with dedicated drain hose.');
    } else {
      setPhotoBefore(safetyPresets.fumesInShopBefore);
      setPhotoAfter(safetyPresets.fumesInShopAfter);
      setDate('2026-10-12');
      setShift('A');
      setRaisedBy('Ajay Alam');
      setMinifactory('Engineering');
      setLine('Testing Lab');
      setStation('Testing room');
      setLegend('Unsafe condition');
      setBeforeCondition('Air fumes spread in shop during test is running. Workers experiencing burning sensation in eyes and headache.');
      setSuggestedControl('Mount sealed flexible exhaust extraction hood over test bench with activated carbon filtration.');
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!raisedBy.trim()) {
      setError('Please enter your Name (Raised By).');
      return;
    }
    if (!station.trim()) {
      setError('Please enter Station or Location where hazard was observed.');
      return;
    }
    if (!beforeCondition.trim()) {
      setError('Please describe the Unsafe Condition or Act in detail.');
      return;
    }

    const isBeforePhotoMissing = !photoBefore || photoBefore === safetyPresets.genericBefore;
    const isAfterPhotoMissing = !photoAfter || photoAfter === safetyPresets.genericAfter;

    if (isBeforePhotoMissing && isAfterPhotoMissing) {
      setError('Both BEFORE and AFTER visual photos are required (Kaizen standard). Please upload or take photos, or use a quick demo preset.');
      return;
    }
    if (isBeforePhotoMissing) {
      setError('The BEFORE status photo is required to document the hazard. Please upload or capture photo.');
      return;
    }
    if (isAfterPhotoMissing) {
      setError('The AFTER / containment photo is required. Please upload or capture photo.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onAddObservation({
        date,
        shift,
        raisedBy,
        minifactory,
        line,
        station,
        legend,
        beforeCondition,
        photoBefore,
        photoAfter,
        category: undefined, // Filled later by Safety Coordinator
        ica: suggestedControl ? `Immediate control suggested: ${suggestedControl}` : undefined,
        icaStatus: 'Open',
        status: 'Open',
        responsibility: '',
        dueDate: ''
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit Safety Observation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden max-w-5xl mx-auto my-6">
      
      {/* Title Header */}
      <div className="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 gap-3">
        <div>
          <span className="text-[10px] font-bold text-amber-400 font-mono uppercase tracking-wider">
            Submodule 01
          </span>
          <h2 className="text-lg font-bold text-white tracking-wide">
            SAFETY OBSERVATION SHEET
          </h2>
        </div>
        
        {/* Preset Buttons */}
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Presets:</span>
          <button
            type="button"
            onClick={() => loadPreset('water')}
            className="px-2.5 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition cursor-pointer"
          >
            💧 Water Near Electrical
          </button>
          <button
            type="button"
            onClick={() => loadPreset('fumes')}
            className="px-2.5 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition cursor-pointer"
          >
            💨 Air Fumes in Shop
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

        {/* Metadata Grid (Kaizen Style 4-Column Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Shift <span className="text-red-500">*</span>
            </label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
            >
              <option value="A">Shift A (Morning)</option>
              <option value="B">Shift B (Evening)</option>
              <option value="C">Shift C (Night)</option>
              <option value="General">General Shift</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Raised By (Initiator) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={raisedBy}
              onChange={(e) => setRaisedBy(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
              placeholder="e.g. Sagar Fadtare / Operator"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Legend / Type <span className="text-red-500">*</span>
            </label>
            <select
              value={legend}
              onChange={(e) => setLegend(e.target.value as any)}
              className={`w-full border rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-slate-800 ${
                legend === 'Unsafe condition' ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-rose-50 text-rose-900 border-rose-300'
              }`}
            >
              <option value="Unsafe condition">⚠️ Unsafe condition (Physical hazard)</option>
              <option value="Unsafe act">🚫 Unsafe act (Behavioral breach)</option>
            </select>
          </div>
        </div>

        {/* Location Info (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Minifactory / Department <span className="text-red-500">*</span>
            </label>
            <select
              value={minifactory}
              onChange={(e) => setMinifactory(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
            >
              <option value="MF1">MF1 (Vacuum & Oil Pump)</option>
              <option value="MF2">MF2 (EGR Products)</option>
              <option value="MF3">MF3 (BPV Products)</option>
              <option value="Machining">Machining Division</option>
              <option value="Engineering">Central Engineering</option>
              <option value="Stores">Warehouse & Logistics</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Line / Area
            </label>
            <input
              type="text"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
              placeholder="e.g. Line 3, Sub-Assembly"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Station / Specific Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
              placeholder="e.g. Drinking water point, Press #4"
              required
            />
          </div>
        </div>

        {/* Problem / Before Condition vs Suggested Action (Kaizen 2-Column Split) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Before Condition */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-red-800 uppercase tracking-wider flex items-center space-x-1.5">
                <span>BEFORE CONDITION</span>
                <span className="text-red-500">*</span>
              </label>
            </div>
            <textarea
              value={beforeCondition}
              onChange={(e) => setBeforeCondition(e.target.value)}
              rows={4}
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter before condition..."
              required
            />
          </div>

          {/* Suggested Immediate Safeguard */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1.5">
                <span>IMMEDIATE ACTION / SAFEGUARD</span>
              </label>
            </div>
            <textarea
              value={suggestedControl}
              onChange={(e) => setSuggestedControl(e.target.value)}
              rows={4}
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Enter immediate action..."
            />
          </div>

        </div>

        {/* Compulsory Photo Upload Block */}
        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-2 gap-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
              <span>📸 BEFORE &amp; AFTER PHOTOS</span>
              <span className="text-red-500 font-bold text-sm">*</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Before Photo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-700 uppercase font-mono">Photo: BEFORE Condition</span>
                  {photoBefore && photoBefore !== safetyPresets.genericBefore ? (
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
                photoBefore && photoBefore !== safetyPresets.genericBefore
                  ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                  : 'border-red-300 bg-red-50/20'
              }`}>
                <img
                  src={photoBefore}
                  alt="Hazard Before Condition"
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
                  <span className="text-xs font-semibold text-slate-700 uppercase font-mono">Photo: AFTER / Contained</span>
                  {photoAfter && photoAfter !== safetyPresets.genericAfter ? (
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
                photoAfter && photoAfter !== safetyPresets.genericAfter
                  ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                  : 'border-red-300 bg-red-50/20'
              }`}>
                <img
                  src={photoAfter}
                  alt="Rectified After Condition"
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
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Routing to Coordinator...' : 'Submit Safety Observation'}</span>
            </button>
          </div>
        </div>

      </form>

      {/* Live Device Camera Modal */}
      {cameraTarget && (
        <CameraModal
          isOpen={true}
          title={`Capture ${cameraTarget === 'before' ? 'BEFORE (Hazard)' : 'AFTER (Safe)'} Photo`}
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
