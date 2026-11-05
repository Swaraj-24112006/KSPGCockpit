import React, { useState } from 'react';
import { NearMissReport } from '../../types';
import { Camera, Upload, Check, AlertTriangle, ShieldAlert, X } from 'lucide-react';
import CameraModal from '../CameraModal';

interface NearMissFormProps {
  onAddNearMiss: (nm: Partial<NearMissReport>) => Promise<void>;
  onCancel: () => void;
  onSuccess?: () => void;
}

// Preset SVGs for mock Near Miss images
const nearMissPresets = {
  trolleyFloorPatchBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fff7ed"/><g stroke="%23ea580c" stroke-width="2" fill="none"><rect x="130" y="110" width="140" height="60" fill="%23fed7aa" stroke="%23c2410c" stroke-width="3" rx="4"/><circle cx="160" cy="180" r="14" fill="%237c2d12"/><circle cx="240" cy="180" r="14" fill="%237c2d12"/><path d="M140,195 L260,195" stroke="%237c2d12" stroke-width="4"/><path d="M220,190 L260,190 L250,205 L230,205 Z" fill="%23dc2626" stroke="%23991b1b"/><path d="M190,70 L250,90" stroke="%23dc2626" stroke-width="4" stroke-dasharray="3,3"/><polygon points="250,90 240,82 248,78" fill="%23dc2626"/></g><text x="200" y="225" font-family="sans-serif" font-weight="bold" font-size="12" fill="%23c2410c" text-anchor="middle">TROLLEY STUCK IN CRACKED FLOOR PATCH - TILT HAZARD</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%23ea580c"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">BEFORE</text></svg>`,
  trolleyFloorPatchAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><g stroke="%2316a34a" stroke-width="2" fill="none"><rect x="130" y="110" width="140" height="60" fill="%23bbf7d0" stroke="%2315803d" stroke-width="3" rx="4"/><circle cx="160" cy="180" r="14" fill="%23166534"/><circle cx="240" cy="180" r="14" fill="%23166534"/><line x1="80" y1="195" x2="320" y2="195" stroke="%2316a34a" stroke-width="4"/><path d="M190,65 L197,72 L210,59" stroke="%2315803d" stroke-width="4"/></g><text x="200" y="225" font-family="sans-serif" font-weight="bold" font-size="12" fill="%2315803d" text-anchor="middle">FLOOR RESURFACED WITH EPOXY &amp; WHEEL LOCKS FITTED</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%2316a34a"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">AFTER</text></svg>`,
  hoistSlingBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fff7ed"/><g stroke="%23ea580c" stroke-width="2" fill="none"><line x1="200" y1="20" x2="200" y2="80" stroke="%23475569" stroke-width="4"/><circle cx="200" cy="90" r="12" fill="%23cbd5e1" stroke="%23334155" stroke-width="3"/><path d="M190,95 L140,160 L240,160 Z" fill="%23fed7aa" stroke="%23ea580c" stroke-width="2"/><circle cx="270" cy="170" r="16" fill="%23fef08a" stroke="%23ca8a04"/><text x="270" y="175" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23854d0e" text-anchor="middle">⚠️</text></g><text x="200" y="225" font-family="sans-serif" font-weight="bold" font-size="12" fill="%23c2410c" text-anchor="middle">OVERHEAD HOIST SWUNG UNEXPECTEDLY NEAR WORKER</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%23ea580c"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">BEFORE</text></svg>`,
  hoistSlingAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><g stroke="%2316a34a" stroke-width="2" fill="none"><line x1="200" y1="20" x2="200" y2="80" stroke="%23475569" stroke-width="4"/><circle cx="200" cy="90" r="12" fill="%23bbf7d0" stroke="%2315803d" stroke-width="3"/><rect x="150" y="105" width="100" height="50" fill="%23dcfce7" stroke="%2315803d" stroke-width="2" rx="6"/><path d="M190,135 L197,142 L210,129" stroke="%2315803d" stroke-width="4"/></g><text x="200" y="225" font-family="sans-serif" font-weight="bold" font-size="12" fill="%2315803d" text-anchor="middle">GUIDED BALANCER &amp; TAG LINE INSTALLED</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%2316a34a"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">AFTER</text></svg>`,
  genericBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fff7ed"/><rect x="50" y="50" width="300" height="150" rx="8" fill="none" stroke="%23fb923c" stroke-width="2" stroke-dasharray="6,6"/><circle cx="200" cy="120" r="30" fill="%23fed7aa"/><text x="200" y="125" font-family="sans-serif" font-weight="bold" font-size="18" fill="%23c2410c" text-anchor="middle">⚠️</text><text x="200" y="175" font-family="sans-serif" font-size="12" font-weight="bold" fill="%239a3412" text-anchor="middle">BEFORE: NEAR-MISS INCIDENT PHOTO</text></svg>`,
  genericAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><rect x="50" y="50" width="300" height="150" rx="8" fill="none" stroke="%234ade80" stroke-width="2" stroke-dasharray="6,6"/><circle cx="200" cy="120" r="30" fill="%23bbf7d0"/><path d="M190,120 L197,127 L210,114" stroke="%2316a34a" stroke-width="4" fill="none"/><text x="200" y="175" font-family="sans-serif" font-size="12" font-weight="bold" fill="%2315803d" text-anchor="middle">AFTER: CORRECTIVE ACTION PHOTO</text></svg>`
};

export default function NearMissForm({ onAddNearMiss, onCancel, onSuccess }: NearMissFormProps) {
  // Initiator Fields (Attachment 2: Near-miss Incident Report left zone)
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [incidentTime, setIncidentTime] = useState('18:30');
  const [incidentType, setIncidentType] = useState<'F' | 'PD' | 'E' | 'Other'>('Other');
  const [deptPlant, setDeptPlant] = useState('MF1- Between L3& L4');
  const [reportedBy, setReportedBy] = useState('Nagraj');
  const [personInvolved, setPersonInvolved] = useState('Nagraj');
  const [ticketNo, setTicketNo] = useState('');
  const [exactLocation, setExactLocation] = useState('Between L3& L4');
  const [briefDescription, setBriefDescription] = useState('');
  const [immediateActionTaken, setImmediateActionTaken] = useState('');

  // Compulsory Before & After Photo Proofs (Replicating Kaizen standard)
  const [photoBefore, setPhotoBefore] = useState(nearMissPresets.genericBefore);
  const [photoAfter, setPhotoAfter] = useState(nearMissPresets.genericAfter);
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

  const loadPreset = (type: 'trolley' | 'hoist') => {
    if (type === 'trolley') {
      setPhotoBefore(nearMissPresets.trolleyFloorPatchBefore);
      setPhotoAfter(nearMissPresets.trolleyFloorPatchAfter);
      setIncidentDate('2026-02-17');
      setIncidentTime('18:30');
      setIncidentType('Other');
      setDeptPlant('MF1- Between L3& L4');
      setReportedBy('Nagraj (Manager)');
      setPersonInvolved('Nagraj');
      setTicketNo('OP-4091');
      setExactLocation('Between L3& L4 Gangway');
      setBriefDescription('During changeover, the trolley got stuck in a floor patch, causing the fixture to fall down. The operator jumped back just in time to avoid foot crushing.');
      setImmediateActionTaken('Stop line temporarily, cleared the fallen fixture, taped off floor pothole area with yellow warning cones.');
    } else {
      setPhotoBefore(nearMissPresets.hoistSlingBefore);
      setPhotoAfter(nearMissPresets.hoistSlingAfter);
      setIncidentDate('2026-03-05');
      setIncidentTime('10:15');
      setIncidentType('PD');
      setDeptPlant('Machining Bay 2');
      setReportedBy('Vikram Shinde');
      setPersonInvolved('Ramesh S');
      setTicketNo('TC-8821');
      setExactLocation('Loading dock crane hoist #2');
      setBriefDescription('Overhead crane hoist swung within 20cm of operator helmet during pallet lifting due to unbalanced sling hook tension.');
      setImmediateActionTaken('Lowered pallet to ground immediately. Verified rigging tackle and re-centered the balance load.');
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportedBy.trim()) {
      setError('Please enter Incident Reported By (Name / Manager).');
      return;
    }
    if (!exactLocation.trim()) {
      setError('Please enter the Exact Location where incident happened.');
      return;
    }
    if (!briefDescription.trim()) {
      setError('Please provide a Brief Description of the Near-Miss Incident.');
      return;
    }

    const isBeforePhotoMissing = !photoBefore || photoBefore === nearMissPresets.genericBefore;
    const isAfterPhotoMissing = !photoAfter || photoAfter === nearMissPresets.genericAfter;

    if (isBeforePhotoMissing && isAfterPhotoMissing) {
      setError('Both BEFORE (Incident) and AFTER (Containment) visual photos are required (Kaizen standard). Please upload or take photos, or use a quick demo preset.');
      return;
    }
    if (isBeforePhotoMissing) {
      setError('The BEFORE status photo is required to document the near-miss hazard. Please upload or capture photo.');
      return;
    }
    if (isAfterPhotoMissing) {
      setError('The AFTER / containment photo is required. Please upload or capture photo.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onAddNearMiss({
        incidentDate,
        incidentTime,
        incidentType,
        deptPlant,
        incidentReportedBy: reportedBy,
        personInvolvedName: personInvolved,
        ticketNo,
        exactLocation,
        briefDescription,
        photoBefore,
        photoAfter,
        correctiveActionTaken: immediateActionTaken ? `Immediate action: ${immediateActionTaken}` : undefined,
        status: 'Open'
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit Near-Miss Report. Please try again.');
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
            <span className="text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
              Submodule 2: Initiator Portal
            </span>
            <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
              Anyone in Organisation
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide mt-1 flex items-center space-x-2">
            <span>NEAR-MISS INCIDENT REPORT SHEET</span>
          </h2>
        </div>
        
        {/* Test Preset Buttons */}
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Demo Presets:</span>
          <button
            type="button"
            onClick={() => loadPreset('trolley')}
            className="px-2.5 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition cursor-pointer"
          >
            🛒 Trolley Floor Patch
          </button>
          <button
            type="button"
            onClick={() => loadPreset('hoist')}
            className="px-2.5 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition cursor-pointer"
          >
            ⚡ Crane Hoist Close Call
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



        {/* Metadata Grid (4-Column Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Incident Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Incident Time (hrs:mm) <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={incidentTime}
              onChange={(e) => setIncidentTime(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Incident Type <span className="text-red-500">*</span>
            </label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
            >
              <option value="Other">Other / General Near Miss</option>
              <option value="F">F - Fire / Fatal Hazard</option>
              <option value="PD">PD - Property Damage</option>
              <option value="E">E - Environmental Spillage</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Dept / Plant Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={deptPlant}
              onChange={(e) => setDeptPlant(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
              placeholder="e.g. MF1- Between L3& L4"
              required
            />
          </div>
        </div>

        {/* Personnel Grid (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Incident Reported By <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reportedBy}
              onChange={(e) => setReportedBy(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
              placeholder="Name of Manager / Initiator"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Person Involved (If Any)
            </label>
            <input
              type="text"
              value={personInvolved}
              onChange={(e) => setPersonInvolved(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
              placeholder="Name of worker involved"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Ticket / Employee No.
            </label>
            <input
              type="text"
              value={ticketNo}
              onChange={(e) => setTicketNo(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
              placeholder="e.g. TS262 / OP-4091"
            />
          </div>
        </div>

        {/* Exact Location & Description (Kaizen 2-Column Split) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Brief Description */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-orange-900 uppercase tracking-wider flex items-center space-x-1.5">
                <span>BRIEF DESCRIPTION OF NEAR-MISS INCIDENT</span>
                <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                What Happened
              </span>
            </div>
            <textarea
              value={briefDescription}
              onChange={(e) => setBriefDescription(e.target.value)}
              rows={4}
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g. During changeover, the trolley got stuck in a floor patch, causing the fixture to fall down. Worker narrowly avoided foot injury..."
              required
            />
          </div>

          {/* Exact Location & Immediate Action */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Exact Location Where Incident Happened <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={exactLocation}
                onChange={(e) => setExactLocation(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-800"
                placeholder="e.g. Between L3 & L4 gangway near column #12"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                Immediate Action Taken at Time of Event
              </label>
              <textarea
                value={immediateActionTaken}
                onChange={(e) => setImmediateActionTaken(e.target.value)}
                rows={2}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Cleared fallen part, barricaded damaged floor zone..."
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
                  <span className="text-xs font-semibold text-slate-700 uppercase font-mono">Photo: BEFORE (Incident Scene)</span>
                  {photoBefore && photoBefore !== nearMissPresets.genericBefore ? (
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
                photoBefore && photoBefore !== nearMissPresets.genericBefore
                  ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                  : 'border-red-300 bg-red-50/20'
              }`}>
                <img
                  src={photoBefore}
                  alt="Near Miss Incident Scene"
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
                  <span className="text-xs font-semibold text-slate-700 uppercase font-mono">Photo: AFTER (Containment)</span>
                  {photoAfter && photoAfter !== nearMissPresets.genericAfter ? (
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
                photoAfter && photoAfter !== nearMissPresets.genericAfter
                  ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                  : 'border-red-300 bg-red-50/20'
              }`}>
                <img
                  src={photoAfter}
                  alt="Containment / Safe State"
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
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting to Coordinator...' : 'Submit Near-Miss Report'}</span>
            </button>
          </div>
        </div>

      </form>

      {/* Live Device Camera Modal */}
      {cameraTarget && (
        <CameraModal
          isOpen={true}
          title={`Capture ${cameraTarget === 'before' ? 'BEFORE (Incident Scene)' : 'AFTER (Containment)'} Photo`}
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
