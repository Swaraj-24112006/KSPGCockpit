import React, { useState } from 'react';
import { Kaizen } from '../types';
import { Upload, HelpCircle, Check, Eye, Trash2, Camera } from 'lucide-react';
import CameraModal from './CameraModal';

interface KaizenSheetFormProps {
  onAddKaizen: (kaizen: Partial<Kaizen>) => void;
  onCancel: () => void;
}

// Preset SVGs for mock files so the user doesn't have to look for images to test
const presetImages = {
  airLeakBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fef2f2"/><g stroke="%23dc2626" stroke-width="2" fill="none"><path d="M100,150 L300,150 M150,150 C150,110 180,90 200,90 C220,90 250,110 250,150" stroke-width="4"/><circle cx="200" cy="90" r="12" fill="%23fca5a5"/><path d="M190,70 Q160,50 140,65 M210,70 Q240,50 260,65 M200,65 L200,35" stroke-dasharray="4,4" stroke-width="3"/></g><text x="200" y="210" font-family="sans-serif" font-weight="bold" font-size="14" fill="%23b91c1c" text-anchor="middle">AIR LEAKING AT CYLINDER JOINT</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%23dc2626"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">BEFORE</text></svg>`,
  airLeakAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><g stroke="%2316a34a" stroke-width="2" fill="none"><path d="M100,150 L300,150 M150,150 C150,110 180,90 200,90 C220,90 250,110 250,150" stroke-width="4"/><circle cx="200" cy="90" r="12" fill="%2386efac" stroke="%2316a34a" stroke-width="3"/><path d="M195,90 L198,93 L205,86" stroke-width="3"/></g><text x="200" y="210" font-family="sans-serif" font-weight="bold" font-size="14" fill="%2315803d" text-anchor="middle">FITTED SECURE FLANGE %26 O-RING</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%2316a34a"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">AFTER</text></svg>`,
  toolRackBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23fffbeb"/><rect x="120" y="60" width="160" height="100" rx="4" fill="%23d97706" opacity="0.1" stroke="%23d97706" stroke-width="2"/><circle cx="160" cy="110" r="8" fill="%23ef4444"/><circle cx="200" cy="110" r="8" fill="%233b82f6"/><circle cx="240" cy="110" r="8" fill="%2310b981"/><path d="M130,200 L270,200" stroke="%23d97706" stroke-width="4"/><text x="200" y="220" font-family="sans-serif" font-weight="bold" font-size="14" fill="%2392400e" text-anchor="middle">TOOLS PILED RANDOMLY ON TABLE</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%23d97706"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">BEFORE</text></svg>`,
  toolRackAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f0fdf4"/><rect x="120" y="50" width="160" height="120" rx="8" fill="%23111827" stroke="%23374151" stroke-width="3"/><path d="M150,70 L150,110 M200,70 L200,120 M250,70 L250,105" stroke="%23f59e0b" stroke-width="6" stroke-linecap="round"/><circle cx="150" cy="140" r="10" fill="%23f0fdf4" stroke="%2310b981" stroke-width="2"/><path d="M147,140 L149,142 L153,138" stroke="%2310b981" stroke-width="2" fill="none"/><circle cx="200" cy="140" r="10" fill="%23f0fdf4" stroke="%2310b981" stroke-width="2"/><path d="M197,140 L199,142 L203,138" stroke="%2310b981" stroke-width="2" fill="none"/><circle cx="250" cy="140" r="10" fill="%23f0fdf4" stroke="%2310b981" stroke-width="2"/><path d="M247,140 L249,142 L253,138" stroke="%2310b981" stroke-width="2" fill="none"/><text x="200" y="215" font-family="sans-serif" font-weight="bold" font-size="14" fill="%2315803d" text-anchor="middle">ORGANIZED JIG SHADOW BOARD</text><rect x="15" y="15" width="90" height="25" rx="5" fill="%2316a34a"/><text x="60" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="white" text-anchor="middle">AFTER</text></svg>`,
  genericBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f3f4f6"/><rect x="50" y="50" width="300" height="150" rx="8" fill="none" stroke="%239ca3af" stroke-width="2" stroke-dasharray="6,6"/><circle cx="200" cy="120" r="30" fill="%23d1d5db"/><path d="M185,120 L215,120 M200,105 L200,135" stroke="%239ca3af" stroke-width="4"/><text x="200" y="170" font-family="sans-serif" font-size="12" fill="%236b7280" text-anchor="middle">BEFORE STATUS PHOTO</text></svg>`,
  genericAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23f3f4f6"/><rect x="50" y="50" width="300" height="150" rx="8" fill="none" stroke="%239ca3af" stroke-width="2" stroke-dasharray="6,6"/><circle cx="200" cy="120" r="30" fill="%23d1d5db"/><path d="M185,120 L215,120 M200,105 L200,135" stroke="%239ca3af" stroke-width="4"/><text x="200" y="170" font-family="sans-serif" font-size="12" fill="%236b7280" text-anchor="middle">AFTER STATUS PHOTO</text></svg>`
};

export default function KaizenSheetForm({ onAddKaizen, onCancel }: KaizenSheetFormProps) {
  // Core Fields
  const [title, setTitle] = useState('');
  const [problemBefore, setProblemBefore] = useState('');
  const [counterMeasureAfter, setCounterMeasureAfter] = useState('');
  const [result, setResult] = useState('');

  // Metadata
  const [area, setArea] = useState('Assembly Line A');
  const [minifactory, setMinifactory] = useState('MF1');
  const [location, setLocation] = useState('Bay 4 West');
  const [machine, setMachine] = useState('Pneumatic Press #3');

  // Dates & Team
  const [suggestionDate, setSuggestionDate] = useState(new Date().toISOString().split('T')[0]);
  const [closingTargetDate, setClosingTargetDate] = useState('');
  const [implementedDate, setImplementedDate] = useState('');
  
  const [ideaBy, setIdeaBy] = useState('John Doe (Operator)');
  const [implementedBy, setImplementedBy] = useState('John Doe');
  const [preparedBy, setPreparedBy] = useState('John Doe');

  // Benefits
  const [benefits, setBenefits] = useState({
    p: false, // Productivity
    q: false, // Quality
    c: false, // Cost
    d: false, // Delivery
    s: false, // Safety
    m: false, // Morale
  });

  const [costSave, setCostSave] = useState<number>(0);

  // Photos (base64 or preset URLs)
  const [photoBefore, setPhotoBefore] = useState(presetImages.genericBefore);
  const [photoAfter, setPhotoAfter] = useState(presetImages.genericAfter);
  const [cameraTarget, setCameraTarget] = useState<'before' | 'after' | null>(null);

  // AI Loading / States
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    refinedTitle: string;
    savingsJustification: string;
    p_reason?: string;
    q_reason?: string;
    c_reason?: string;
    d_reason?: string;
    s_reason?: string;
    m_reason?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Benefits explanation tags shown when AI generates analysis
  const [benefitsReasons, setBenefitsReasons] = useState<Record<string, string>>({});

  // File Upload Handlers (Simulation + Real FileReader support)
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

  const loadMockPreset = (presetType: 'airleak' | 'toolrack') => {
    if (presetType === 'airleak') {
      setPhotoBefore(presetImages.airLeakBefore);
      setPhotoAfter(presetImages.airLeakAfter);
      setTitle('Compressor Air Leak Repair');
      setProblemBefore('Pneumatic Press cylinder hose is generating high pitch whistling air leaks. Air compressor running constantly, wasting power and adding background sound hazards.');
      setCounterMeasureAfter('Tightened joint connection and replaced split plastic hoses with metal-reinforced high-temperature hoses and double-grip clamps.');
      setResult('Audible leakage dropped to 0 dB. Compressor now cycles only once every 20 minutes instead of continuously.');
    } else {
      setPhotoBefore(presetImages.toolRackBefore);
      setPhotoAfter(presetImages.toolRackAfter);
      setTitle('5S Shadow Board Organization');
      setProblemBefore('Wrenches, pliers and Allen keys are stored loosely in an unsorted steel shelf box. Hand tools are constantly mixed up, costing workers 12-15 seconds per tool changeover.');
      setCounterMeasureAfter('Mounted custom colored heavy-duty foam board cutouts with shadows labeled for each specific tool directly onto welding booth workbench wall.');
      setResult('All tools are visible instantly. Clean changeover is enforced. Zero lost tools recorded.');
    }
    setError(null);
  };

  // Invoke server-side Gemini endpoint for analysis
  const handleAiAssist = async () => {
    if (!problemBefore && !counterMeasureAfter) {
      setError('Please provide some details in the Problem or Counter Measure fields so the AI has context to assist.');
      return;
    }

    setIsAiLoading(true);
    setError(null);
    setAiResult(null);

    try {
      const res = await fetch('/api/kaizens/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          problemBefore,
          counterMeasureAfter,
          area,
          minifactory
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze Kaizen');
      }

      const info = data.data;
      
      // Auto-fill values
      if (info.refinedTitle) setTitle(info.refinedTitle);
      if (info.benefits) setBenefits(info.benefits);
      if (info.estimatedAnnualCostSavings !== undefined) setCostSave(info.estimatedAnnualCostSavings);
      if (info.suggestedResultSummary && !result) setResult(info.suggestedResultSummary);

      // Save AI analysis results for display
      setAiResult({
        refinedTitle: info.refinedTitle,
        savingsJustification: info.savingsJustification,
        p_reason: info.p_reason,
        q_reason: info.q_reason,
        c_reason: info.c_reason,
        d_reason: info.d_reason,
        s_reason: info.s_reason,
        m_reason: info.m_reason,
      });

      const reasons: Record<string, string> = {};
      if (info.p_reason) reasons.p = info.p_reason;
      if (info.q_reason) reasons.q = info.q_reason;
      if (info.c_reason) reasons.c = info.c_reason;
      if (info.d_reason) reasons.d = info.d_reason;
      if (info.s_reason) reasons.s = info.s_reason;
      if (info.m_reason) reasons.m = info.m_reason;
      setBenefitsReasons(reasons);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred connecting to the Gemini AI API server-side endpoint.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleBenefit = (key: keyof typeof benefits) => {
    setBenefits(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !problemBefore || !counterMeasureAfter) {
      setError('Please fill out the Title, Problem/Before, and Counter Measure/After status fields.');
      return;
    }

    const isBeforePhotoMissing = !photoBefore || photoBefore === presetImages.genericBefore;
    const isAfterPhotoMissing = !photoAfter || photoAfter === presetImages.genericAfter;

    if (isBeforePhotoMissing && isAfterPhotoMissing) {
      setError('Both BEFORE and AFTER improvement photos are compulsory before saving this Kaizen sheet. Please upload or take photos.');
      return;
    }
    if (isBeforePhotoMissing) {
      setError('The BEFORE status photo is compulsory before saving. Please upload or take a Before photo.');
      return;
    }
    if (isAfterPhotoMissing) {
      setError('The AFTER improvement photo is compulsory before saving. Please upload or take an After photo.');
      return;
    }

    onAddKaizen({
      title,
      problemBefore,
      counterMeasureAfter,
      result,
      area,
      minifactory,
      location,
      machine,
      suggestionDate,
      closingTargetDate: closingTargetDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0], // default 1 week
      implementedDate: implementedDate || new Date().toISOString().split('T')[0],
      costSave,
      benefits,
      ideaBy,
      implementedBy,
      preparedBy,
      photoBefore,
      photoAfter,
      status: 'Pending',
      classification: 'Pending',
      remark: ''
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden max-w-5xl mx-auto my-6">
      
      {/* Title Header */}
      <div className="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 gap-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">
            KAIZEN SHEET (Continuous Improvement)
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Submit Daily Improvements & Estimate Operational Impact
          </p>
        </div>
        
        {/* Test Preset Buttons */}
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Presets:</span>
          <button
            type="button"
            onClick={() => loadMockPreset('airleak')}
            className="px-2.5 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
          >
            💨 Air Leak Demo
          </button>
          <button
            type="button"
            onClick={() => loadMockPreset('toolrack')}
            className="px-2.5 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
          >
            🔧 5S shadow board
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">

        {/* Error Messages */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-800 rounded-r-lg font-medium">
            ⚠️ {error}
          </div>
        )}



        {/* Grid Meta Information */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-150 rounded-xl">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Minifactory</label>
            <select
              value={minifactory}
              onChange={(e) => setMinifactory(e.target.value)}
              className="w-full bg-white border border-slate-250 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800"
            >
              <option value="MF1">MF1 (Vacuum & Oil Pump)</option>
              <option value="MF2">MF2 (EGR Products)</option>
              <option value="MF3">MF3 (BPV Products)</option>
              <option value="Machining">Machining</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Area/Zone</label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full bg-white border border-slate-250 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800"
              placeholder="e.g. Line A"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-white border border-slate-250 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800"
              placeholder="e.g. Bay 4 West"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Machine/Station</label>
            <input
              type="text"
              value={machine}
              onChange={(e) => setMachine(e.target.value)}
              className="w-full bg-white border border-slate-250 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800"
              placeholder="e.g. Press #3"
            />
          </div>
        </div>

        {/* Title input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Improvement Idea Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800"
            placeholder="e.g. Quick-Connect Pneumatic Fittings Upgrade"
          />
        </div>

        {/* Problem Before vs Counter Measure After */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Before Status */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-red-800 uppercase tracking-wider">
                Problem / Before Status <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Issue</span>
            </div>
            <textarea
              value={problemBefore}
              onChange={(e) => setProblemBefore(e.target.value)}
              rows={4}
              className="w-full bg-white border border-slate-250 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Describe the problem, inefficiencies, hazards, or standard process limits clearly..."
            />
          </div>

          {/* After Counter Measure */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Counter Measure / After Improvement <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Solution</span>
            </div>
            <textarea
              value={counterMeasureAfter}
              onChange={(e) => setCounterMeasureAfter(e.target.value)}
              rows={4}
              className="w-full bg-white border border-slate-250 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Describe what modification was built, engineered, cleaned, or re-organized..."
            />
          </div>

        </div>

        {/* Photos Block (Attachment 1 style) */}
        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-2 gap-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <span>📸 BEFORE & AFTER VISUAL PROOF DOCUMENTATION</span>
              <span className="text-red-500 font-bold text-sm">*</span>
            </h3>
            <span className="text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider">
              Compulsory Photos Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Before Photo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-600 uppercase font-mono">Photos : BEFORE Status</span>
                  {photoBefore && photoBefore !== presetImages.genericBefore ? (
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
                photoBefore && photoBefore !== presetImages.genericBefore
                  ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                  : 'border-red-300 bg-red-50/20'
              }`}>
                <img
                  src={photoBefore}
                  alt="Status Before"
                  className="max-h-full max-w-full object-contain rounded"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                  <button
                    type="button"
                    onClick={() => setCameraTarget('before')}
                    className="text-xs text-white font-bold bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg border border-white/20 mr-2"
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
                  <span className="text-xs font-semibold text-slate-600 uppercase font-mono">Photos : AFTER Improvement</span>
                  {photoAfter && photoAfter !== presetImages.genericAfter ? (
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
                photoAfter && photoAfter !== presetImages.genericAfter
                  ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                  : 'border-red-300 bg-red-50/20'
              }`}>
                <img
                  src={photoAfter}
                  alt="Status After"
                  className="max-h-full max-w-full object-contain rounded"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                  <button
                    type="button"
                    onClick={() => setCameraTarget('after')}
                    className="text-xs text-white font-bold bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg border border-white/20 mr-2"
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

        {/* Benefits Matrix (PQCDSM Checklist) */}
        <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
          <div className="border-b border-slate-200 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
              <span>🎯 PQCDSM METRIC BENEFITS MATRIX</span>
              <span className="text-[10px] font-normal text-slate-500 font-mono italic">(Select affected areas)</span>
            </h3>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-700">Estimated Cost Savings:</span>
              <div className="flex items-center">
                <span className="text-sm font-semibold text-slate-500 mr-1">₹</span>
                <input
                  type="number"
                  value={costSave || ''}
                  onChange={(e) => setCostSave(Number(e.target.value))}
                  className="w-24 border border-slate-250 rounded-lg px-2 py-1 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-slate-800"
                  placeholder="0"
                />
                <span className="text-xs text-slate-500 font-semibold ml-1">/yr</span>
              </div>
            </div>
          </div>

          {/* Benefits grid boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            {[
              { key: 'p', label: 'P', name: 'Productivity', color: 'bg-blue-50 text-blue-800 border-blue-200' },
              { key: 'q', label: 'Q', name: 'Quality', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
              { key: 'c', label: 'C', name: 'Cost', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
              { key: 'd', label: 'D', name: 'Delivery', color: 'bg-amber-50 text-amber-800 border-amber-200' },
              { key: 's', label: 'S', name: 'Safety', color: 'bg-red-50 text-red-800 border-red-200' },
              { key: 'm', label: 'M', name: 'Morale', color: 'bg-purple-50 text-purple-800 border-purple-200' },
            ].map(item => {
              const active = benefits[item.key as keyof typeof benefits];
              return (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => toggleBenefit(item.key as keyof typeof benefits)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    active
                      ? `${item.color} font-bold scale-[1.02] ring-2 ring-slate-800/20`
                      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xl font-black">{item.label}</span>
                  <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">{item.name}</span>
                  {active && (
                    <div className="mt-1.5 bg-slate-900 text-white rounded-full p-0.5">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* AI generated reasons under metrics */}
          {Object.keys(benefitsReasons).length > 0 && (
            <div className="mt-4 p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Gemini Metric Analysis Log:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {Object.entries(benefitsReasons).map(([key, value]) => {
                  const labelMap: Record<string, string> = { p: 'Productivity', q: 'Quality', c: 'Cost', d: 'Delivery', s: 'Safety', m: 'Morale' };
                  return (
                    <div key={key} className="flex items-start space-x-1.5 bg-white p-2 rounded border border-slate-150">
                      <span className="font-extrabold uppercase text-slate-700 bg-slate-100 px-1 rounded text-[10px] mt-0.5">{key}</span>
                      <p className="text-slate-600 leading-snug"><span className="font-semibold text-slate-800">{labelMap[key]}:</span> {value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Expected Result summary */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Result / Outcomes <span className="text-slate-400 font-normal italic">(Expected or measured status change)</span>
          </label>
          <textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            rows={3}
            className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800"
            placeholder="Describe the overall measured results, time saved, worker safety feelings, or scrap reduction..."
          />
        </div>

        {/* Dates and Signatures */}
        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">
            ✍️ TEAM MEMBERS, CREATION, AND TARGET CLOSING TIMELINES
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1">Prepared By (Idea By)</label>
              <input
                type="text"
                value={ideaBy}
                onChange={(e) => {
                  setIdeaBy(e.target.value);
                  setPreparedBy(e.target.value);
                }}
                className="w-full bg-white border border-slate-250 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-800"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1">Implemented By</label>
              <input
                type="text"
                value={implementedBy}
                onChange={(e) => setImplementedBy(e.target.value)}
                className="w-full bg-white border border-slate-250 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-800"
                placeholder="Name or Department"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1">Suggestion / Logging Date</label>
              <input
                type="date"
                value={suggestionDate}
                onChange={(e) => setSuggestionDate(e.target.value)}
                className="w-full bg-white border border-slate-250 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1">Closing Target Date</label>
              <input
                type="date"
                value={closingTargetDate}
                onChange={(e) => setClosingTargetDate(e.target.value)}
                className="w-full bg-white border border-slate-250 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1">Actual Implemented Date</label>
              <input
                type="date"
                value={implementedDate}
                onChange={(e) => setImplementedDate(e.target.value)}
                className="w-full bg-white border border-slate-250 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-800 font-mono"
              />
            </div>
            <div className="flex items-end">
              <div className="text-[10px] text-slate-500 leading-normal font-mono">
                * Review committee members can finalize approvals, edit remarks, and decide "Kaizen" vs "Good Point" classification status in the committee portal.
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition shadow-sm"
          >
            Submit Kaizen Sheet
          </button>
        </div>

      </form>

      <CameraModal
        isOpen={cameraTarget !== null}
        onClose={() => setCameraTarget(null)}
        onCapture={(img) => {
          if (cameraTarget === 'before') setPhotoBefore(img);
          else if (cameraTarget === 'after') setPhotoAfter(img);
        }}
        title={`Take ${cameraTarget === 'before' ? 'Before' : 'After'} Photo`}
      />

    </div>
  );
}
