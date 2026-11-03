import React, { useState, useEffect } from 'react';
import { Kaizen } from '../types';
import { 
  Award, 
  Lightbulb, 
  XCircle, 
  AlertCircle, 
  CheckCircle2, 
  Compass, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  IndianRupee, 
  FileText, 
  ZoomIn, 
  Maximize2,
  Check,
  UserCheck,
  Building,
  Wrench,
  Sparkles,
  Download,
  Printer,
  Loader2
} from 'lucide-react';
import { formatIndianRupees } from '../utils';
import PhotoZoomModal from './PhotoZoomModal';
import { downloadElementAsPdf, triggerA4Print, triggerA3Print } from '../utils/pdfExporter';

interface KaizenPresentationModeProps {
  kaizen: Kaizen;
  allKaizens?: Kaizen[];
  onClose: () => void;
  onUpdateKaizen: (id: string, updatedFields: Partial<Kaizen>) => void;
  onSelectKaizen?: (id: string) => void;
}

const STEPS = [
  { id: 1, title: '1. Problem & Before State', subtitle: 'Shopfloor Defect & Baseline Photo' },
  { id: 2, title: '2. Countermeasure & After State', subtitle: 'Implemented Action & Post Photo' },
  { id: 3, title: '3. PQCDSM & Financial Impact', subtitle: '6-Pillar Metrics & Cost Savings' },
  { id: 4, title: '4. Committee Review & Sign-Off', subtitle: 'Classification, Remarks & Approval' }
];

export default function KaizenPresentationMode({
  kaizen,
  allKaizens = [],
  onClose,
  onUpdateKaizen,
  onSelectKaizen
}: KaizenPresentationModeProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [activeLeftTab, setActiveLeftTab] = useState<'slides' | 'queue'>('slides');

  // Committee review form state local sync
  const [classification, setClassification] = useState<'Kaizen' | 'Good Point' | 'Pending' | 'None'>(kaizen.classification || 'Pending');
  const [status, setStatus] = useState<'Pending' | 'Approved' | 'Good Point' | 'Rejected'>(kaizen.status || 'Pending');
  const [remark, setRemark] = useState(kaizen.remark || '');
  const [costSave, setCostSave] = useState<number>(kaizen.costSave || 0);
  const [approvedBy, setApprovedBy] = useState(kaizen.approvedBy || 'Rajesh Patil (Supervisor)');
  const [verifiedBy, setVerifiedBy] = useState(kaizen.verifiedBy || 'Amit Mehta (Kaizen Lead)');
  const [benefits, setBenefits] = useState(kaizen.benefits || { p: false, q: false, c: false, d: false, s: false, m: false });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Zoom photo modal state
  const [zoomedPhoto, setZoomedPhoto] = useState<{ url: string; title: string } | null>(null);
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  const handleDownloadPdf = async () => {
    setIsPdfExporting(true);
    await downloadElementAsPdf('kaizen-presentation-slide', {
      filename: `Kaizen_${kaizen.srNo}_Slide_${currentStep}.pdf`,
      orientation: 'landscape',
      format: 'a4'
    });
    setIsPdfExporting(false);
  };

  // Sync state when props change
  useEffect(() => {
    setClassification(kaizen.classification || 'Pending');
    setStatus(kaizen.status || 'Pending');
    setRemark(kaizen.remark || '');
    setCostSave(kaizen.costSave || 0);
    setApprovedBy(kaizen.approvedBy || 'Rajesh Patil (Supervisor)');
    setVerifiedBy(kaizen.verifiedBy || 'Amit Mehta (Kaizen Lead)');
    setBenefits(kaizen.benefits || { p: false, q: false, c: false, d: false, s: false, m: false });
  }, [kaizen.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentStep < 4) {
        setCurrentStep(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 1) {
        setCurrentStep(prev => prev - 1);
      } else if (e.key === 'Escape') {
        if (zoomedPhoto) setZoomedPhoto(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, onClose, zoomedPhoto]);

  // Handle Save Review
  const handleSaveDecision = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let targetStatus = status;
    if (status === 'Pending' && (classification === 'Kaizen' || classification === 'Good Point')) {
      targetStatus = classification === 'Good Point' ? 'Good Point' : 'Approved';
    }

    onUpdateKaizen(kaizen.id, {
      classification,
      status: targetStatus,
      remark,
      costSave,
      approvedBy,
      verifiedBy,
      benefits
    });

    setSaveSuccessMsg(`Decision Saved: ${classification}`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const currentKaizenIndex = allKaizens.findIndex(k => k.id === kaizen.id);

  return (
    <div className="fixed inset-0 bg-slate-100 text-slate-900 z-[9999] flex flex-col md:flex-row overflow-hidden animate-fade-in font-sans">
      
      {/* LEFT SIDE PANEL */}
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
                  KAIZEN REVIEW PRESENTATION
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">[{kaizen.srNo}]</span>
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
            {kaizen.title}
          </h2>

          <div className="mt-3 pt-3 border-t border-indigo-800/60 grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <span className="text-indigo-300 block text-[9px] uppercase">Idea By</span>
              <span className="font-bold text-white truncate block">{kaizen.ideaBy}</span>
            </div>
            <div>
              <span className="text-indigo-300 block text-[9px] uppercase">Minifactory</span>
              <span className="font-bold text-white truncate block">{kaizen.minifactory}</span>
            </div>
          </div>

          {/* Classification Status Badge */}
          <div className="mt-3 flex items-center justify-between bg-black/30 p-2 rounded-xl border border-white/10 text-xs">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-300">Status:</span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold font-mono text-[10px] uppercase ${
              kaizen.classification === 'Kaizen'
                ? 'bg-emerald-500 text-white'
                : kaizen.classification === 'Good Point'
                ? 'bg-amber-500 text-slate-950 font-black'
                : kaizen.status === 'Rejected'
                ? 'bg-red-500 text-white'
                : 'bg-slate-600 text-slate-200'
            }`}>
              {kaizen.classification && kaizen.classification !== 'None' ? kaizen.classification : kaizen.status}
            </span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1 shrink-0 font-mono text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveLeftTab('slides')}
            className={`flex-1 py-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeLeftTab === 'slides'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📜 Slides</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveLeftTab('queue')}
            className={`flex-1 py-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeLeftTab === 'queue'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📥 Queue ({allKaizens.length})</span>
          </button>
        </div>

        {/* Left Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {activeLeftTab === 'slides' && (
            <div className="space-y-1.5 animate-fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block px-2 pt-1">
                Select Slide Step
              </span>

              {STEPS.map((step) => {
                const isCurrent = step.id === currentStep;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCurrentStep(step.id)}
                    className={`w-full text-left p-3 rounded-xl transition border cursor-pointer flex items-center justify-between ${
                      isCurrent
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md font-bold'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5 min-w-0">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black font-mono shrink-0 ${
                        isCurrent ? 'bg-white text-indigo-700' : 'bg-slate-100 text-slate-700'
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
                  </button>
                );
              })}

              {/* Quick Decision Buttons in Left Menu */}
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-2 px-1">
                <span className="text-[10px] font-bold uppercase font-mono text-slate-500 block">
                  Quick Committee Classification
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setClassification('Kaizen');
                      setStatus('Approved');
                      onUpdateKaizen(kaizen.id, { classification: 'Kaizen', status: 'Approved' });
                    }}
                    className={`py-2 px-2 rounded-lg font-mono font-bold text-[11px] uppercase text-center transition border cursor-pointer ${
                      classification === 'Kaizen'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-emerald-800 border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    🏆 Kaizen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClassification('Good Point');
                      setStatus('Good Point');
                      onUpdateKaizen(kaizen.id, { classification: 'Good Point', status: 'Good Point' });
                    }}
                    className={`py-2 px-2 rounded-lg font-mono font-bold text-[11px] uppercase text-center transition border cursor-pointer ${
                      classification === 'Good Point'
                        ? 'bg-amber-500 text-slate-950 font-black border-amber-500 shadow-xs'
                        : 'bg-slate-50 text-amber-900 border-slate-200 hover:bg-amber-50'
                    }`}
                  >
                    💡 Good Point
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeLeftTab === 'queue' && (
            <div className="space-y-1 animate-fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block px-2 pt-1">
                Kaizen Queue Items
              </span>
              {allKaizens.map((item) => {
                const isSelected = item.id === kaizen.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectKaizen && onSelectKaizen(item.id)}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500">{item.srNo}</span>
                      <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                        item.classification === 'Kaizen'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.classification === 'Good Point'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.classification || item.status}
                      </span>
                    </div>
                    <div className="text-xs font-bold line-clamp-1 mt-1">{item.title}</div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">{item.ideaBy}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Previous / Next Kaizen in Queue Footer */}
        {allKaizens.length > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between text-xs font-mono font-bold">
            <button
              type="button"
              disabled={currentKaizenIndex <= 0}
              onClick={() => {
                if (currentKaizenIndex > 0 && onSelectKaizen) {
                  onSelectKaizen(allKaizens[currentKaizenIndex - 1].id);
                }
              }}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 rounded-lg text-slate-700 transition cursor-pointer"
            >
              ← Prev Kaizen
            </button>

            <span className="text-[10px] text-slate-500">
              {currentKaizenIndex + 1} / {allKaizens.length}
            </span>

            <button
              type="button"
              disabled={currentKaizenIndex >= allKaizens.length - 1}
              onClick={() => {
                if (currentKaizenIndex < allKaizens.length - 1 && onSelectKaizen) {
                  onSelectKaizen(allKaizens[currentKaizenIndex + 1].id);
                }
              }}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 rounded-lg text-slate-700 transition cursor-pointer"
            >
              Next Kaizen →
            </button>
          </div>
        )}
      </div>

      {/* RIGHT MAIN PRESENTATION CANVAS */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
        
        {/* SLIDE CANVAS HEADER BAR */}
        <div className="bg-white border-b border-slate-300 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-xs">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black font-mono text-indigo-700 bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                SLIDE 0{currentStep} OF 4
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                Kaizen Review Presentation
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              {STEPS[currentStep - 1].title}
            </h1>
            <p className="text-sm font-medium text-slate-600 mt-0.5">
              {STEPS[currentStep - 1].subtitle}
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              disabled={isPdfExporting}
              onClick={handleDownloadPdf}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider font-mono shadow-md cursor-pointer transition flex items-center space-x-1.5"
            >
              {isPdfExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => triggerA4Print('kaizen-presentation-slide', `Kaizen Slide - ${kaizen.srNo}`)}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider font-mono shadow-md cursor-pointer transition flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print A4</span>
            </button>

            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className="px-3 py-2 bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-40 rounded-xl text-slate-800 border border-slate-300 font-bold text-xs transition cursor-pointer flex items-center space-x-1 shadow-xs"
            >
              <ChevronLeft className="w-4 h-4 text-indigo-600" />
              <span>Prev</span>
            </button>

            <button
              type="button"
              disabled={currentStep === 4}
              onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-40 rounded-xl text-white font-black text-xs transition cursor-pointer flex items-center space-x-1 shadow-md shadow-indigo-200"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* SLIDE CANVAS BODY */}
        <div id="kaizen-presentation-slide" className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          {/* SLIDE 1: PROBLEM & BEFORE STATE */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
              
              {/* Meta Info Bar */}
              <div className="bg-white border border-slate-300 rounded-2xl p-5 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono">
                <div>
                  <span className="text-slate-500 block text-xs uppercase font-bold">Kaizen Title</span>
                  <span className="font-bold text-slate-900 text-base">{kaizen.title}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs uppercase font-bold">Suggested By</span>
                  <span className="font-bold text-slate-900 text-base">{kaizen.ideaBy}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs uppercase font-bold">Location / Machine</span>
                  <span className="font-bold text-slate-900 text-base">{kaizen.location} - {kaizen.machine}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs uppercase font-bold">Suggestion Date</span>
                  <span className="font-bold text-slate-900 text-base">{kaizen.suggestionDate || kaizen.createdAt}</span>
                </div>
              </div>

              {/* Problem Description & Photo Before */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Problem Statement Card */}
                <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-red-800 font-mono flex items-center space-x-2 border-b border-slate-200 pb-3">
                      <FileText className="w-5 h-5 text-red-600" />
                      <span>Problem Before Improvement</span>
                    </h3>
                    <p className="mt-4 text-base sm:text-lg font-medium text-slate-900 leading-relaxed bg-red-50/50 p-5 rounded-xl border border-red-100">
                      {kaizen.problemBefore || 'No problem before detailed.'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono space-y-1">
                    <span className="text-slate-500 block font-bold uppercase">Prepared By:</span>
                    <span className="font-bold text-slate-800 text-sm">{kaizen.preparedBy || kaizen.ideaBy}</span>
                  </div>
                </div>

                {/* Photo Before */}
                <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 font-mono">
                      🔴 Photo Before (Defect Condition)
                    </h3>
                    {kaizen.photoBefore && (
                      <button
                        type="button"
                        onClick={() => setZoomedPhoto({ url: kaizen.photoBefore, title: `BEFORE: ${kaizen.title}` })}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-bold transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ZoomIn className="w-4 h-4" />
                        <span>Enlarge</span>
                      </button>
                    )}
                  </div>

                  <div 
                    onClick={() => kaizen.photoBefore && setZoomedPhoto({ url: kaizen.photoBefore, title: `BEFORE IMPROVEMENT: ${kaizen.title}` })}
                    className="bg-slate-50 p-2 rounded-xl border border-slate-200 aspect-video flex items-center justify-center overflow-hidden cursor-pointer group relative hover:border-indigo-400 transition"
                  >
                    {kaizen.photoBefore ? (
                      <>
                        <img src={kaizen.photoBefore} alt="Photo Before" className="max-h-full max-w-full object-contain rounded-lg group-hover:scale-102 transition-transform" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-mono text-xs font-bold space-x-1">
                          <ZoomIn className="w-4 h-4" />
                          <span>Click to Zoom High-Res</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400 text-sm italic">No photo before uploaded</span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* SLIDE 2: COUNTERMEASURE & AFTER STATE */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Countermeasure Card */}
                <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-emerald-800 font-mono flex items-center space-x-2 border-b border-slate-200 pb-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Countermeasure / Improvement Action</span>
                    </h3>
                    <p className="mt-4 text-base sm:text-lg font-medium text-slate-900 leading-relaxed bg-emerald-50/50 p-5 rounded-xl border border-emerald-100">
                      {kaizen.counterMeasureAfter || 'No countermeasure detailed.'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Implemented By:</span>
                      <span className="font-bold text-slate-900">{kaizen.implementedBy || kaizen.ideaBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Implemented Date:</span>
                      <span className="font-bold text-slate-900">{kaizen.implementedDate || 'Completed'}</span>
                    </div>
                  </div>
                </div>

                {/* Photo After */}
                <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-emerald-800 font-mono">
                      🟢 Photo After (Improved Condition)
                    </h3>
                    {kaizen.photoAfter && (
                      <button
                        type="button"
                        onClick={() => setZoomedPhoto({ url: kaizen.photoAfter, title: `AFTER: ${kaizen.title}` })}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-bold transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ZoomIn className="w-4 h-4" />
                        <span>Enlarge</span>
                      </button>
                    )}
                  </div>

                  <div 
                    onClick={() => kaizen.photoAfter && setZoomedPhoto({ url: kaizen.photoAfter, title: `AFTER IMPROVEMENT: ${kaizen.title}` })}
                    className="bg-slate-50 p-2 rounded-xl border border-slate-200 aspect-video flex items-center justify-center overflow-hidden cursor-pointer group relative hover:border-emerald-400 transition"
                  >
                    {kaizen.photoAfter ? (
                      <>
                        <img src={kaizen.photoAfter} alt="Photo After" className="max-h-full max-w-full object-contain rounded-lg group-hover:scale-102 transition-transform" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-mono text-xs font-bold space-x-1">
                          <ZoomIn className="w-4 h-4" />
                          <span>Click to Zoom High-Res</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400 text-sm italic">No photo after uploaded</span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* SLIDE 3: PQCDSM & FINANCIAL SAVINGS */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
              
              {/* Cost Savings Highlight */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono font-bold text-emerald-100 uppercase tracking-widest block">
                    Verified Annual Cost Savings
                  </span>
                  <div className="text-4xl sm:text-5xl font-black font-mono mt-1 flex items-center">
                    <IndianRupee className="w-10 h-10 mr-1 text-emerald-200" />
                    <span>{(costSave || kaizen.costSave || 0).toLocaleString('en-IN')}</span>
                    <span className="text-lg text-emerald-200 ml-2 font-normal">/ year</span>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 text-xs font-mono text-white text-right space-y-1">
                  <div>Minifactory: <span className="font-bold">{kaizen.minifactory}</span></div>
                  <div>Area: <span className="font-bold">{kaizen.area || kaizen.location}</span></div>
                </div>
              </div>

              {/* PQCDSM Metrics Matrix */}
              <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-indigo-800 font-mono flex items-center space-x-2 border-b border-slate-200 pb-3">
                  <Award className="w-5 h-5 text-indigo-600" />
                  <span>PQCDSM Benefit Categories Verified</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { key: 'p', label: 'P - Productivity', color: 'bg-blue-50 text-blue-900 border-blue-200' },
                    { key: 'q', label: 'Q - Quality', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
                    { key: 'c', label: 'C - Cost', color: 'bg-amber-50 text-amber-900 border-amber-200' },
                    { key: 'd', label: 'D - Delivery', color: 'bg-indigo-50 text-indigo-900 border-indigo-200' },
                    { key: 's', label: 'S - Safety', color: 'bg-red-50 text-red-900 border-red-200' },
                    { key: 'm', label: 'M - Morale', color: 'bg-purple-50 text-purple-900 border-purple-200' },
                  ].map((m) => {
                    const active = benefits[m.key as keyof typeof benefits];
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setBenefits(prev => ({ ...prev, [m.key]: !prev[m.key as keyof typeof benefits] }))}
                        className={`p-4 rounded-xl border font-mono font-bold text-xs transition text-center cursor-pointer flex flex-col items-center justify-center space-y-2 ${
                          active
                            ? `${m.color} shadow-sm ring-2 ring-indigo-500`
                            : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                          {active ? '✓' : ''}
                        </div>
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Outcome / Result Notes */}
              <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 font-mono">
                  Result / Quantitative Impact Summary
                </h3>
                <p className="text-base text-slate-800 font-medium bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {kaizen.result || 'No specific outcome summary documented.'}
                </p>
              </div>

            </div>
          )}

          {/* SLIDE 4: COMMITTEE REVIEW & SIGN-OFF (DIRECT COMMITTEE CONTROLS) */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
              
              <div className="bg-white border border-slate-300 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                
                <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black uppercase tracking-wider text-indigo-900 font-mono flex items-center space-x-2">
                      <UserCheck className="w-6 h-6 text-indigo-600" />
                      <span>Committee Decision & Official Sign-off</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Classify this shopfloor proposal and record official audit figures directly.
                    </p>
                  </div>

                  {saveSuccessMsg && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-mono font-bold text-xs rounded-lg animate-fade-in border border-emerald-300">
                      ✓ {saveSuccessMsg}
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveDecision} className="space-y-6">
                  
                  {/* 1. Classification Selection */}
                  <div>
                    <label className="block text-xs font-bold font-mono text-slate-700 uppercase tracking-wide mb-2">
                      1. Classification Decision
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setClassification('Kaizen');
                          setStatus('Approved');
                        }}
                        className={`p-4 rounded-xl border text-sm font-black font-mono transition cursor-pointer flex items-center justify-center space-x-2 ${
                          classification === 'Kaizen'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-emerald-50'
                        }`}
                      >
                        <Award className="w-5 h-5" />
                        <span>🏆 KAIZEN</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setClassification('Good Point');
                          setStatus('Good Point');
                        }}
                        className={`p-4 rounded-xl border text-sm font-black font-mono transition cursor-pointer flex items-center justify-center space-x-2 ${
                          classification === 'Good Point'
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-amber-50'
                        }`}
                      >
                        <Lightbulb className="w-5 h-5" />
                        <span>💡 GOOD POINT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setClassification('None');
                          setStatus('Rejected');
                        }}
                        className={`p-4 rounded-xl border text-sm font-bold font-mono transition cursor-pointer flex items-center justify-center space-x-2 ${
                          status === 'Rejected'
                            ? 'bg-red-600 text-white border-red-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-red-50'
                        }`}
                      >
                        <XCircle className="w-5 h-5" />
                        <span>❌ REJECT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setClassification('Pending');
                          setStatus('Pending');
                        }}
                        className={`p-4 rounded-xl border text-sm font-bold font-mono transition cursor-pointer flex items-center justify-center space-x-2 ${
                          status === 'Pending'
                            ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <AlertCircle className="w-5 h-5" />
                        <span>⏳ HOLD</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Audited Annual Cost Savings & Signatures */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold font-mono text-slate-700 uppercase tracking-wide mb-1">
                        Audited Cost Savings (₹ / year)
                      </label>
                      <div className="relative">
                        <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="number"
                          value={costSave}
                          onChange={(e) => setCostSave(Number(e.target.value))}
                          placeholder="0"
                          className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-base font-mono font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold font-mono text-slate-700 uppercase tracking-wide mb-1">
                        Approved By (Supervisor)
                      </label>
                      <input
                        type="text"
                        value={approvedBy}
                        onChange={(e) => setApprovedBy(e.target.value)}
                        placeholder="Supervisor Name"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold font-mono text-slate-700 uppercase tracking-wide mb-1">
                        Verified By (Kaizen Lead)
                      </label>
                      <input
                        type="text"
                        value={verifiedBy}
                        onChange={(e) => setVerifiedBy(e.target.value)}
                        placeholder="Kaizen Lead Name"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 3. Committee Remarks */}
                  <div>
                    <label className="block text-xs font-bold font-mono text-slate-700 uppercase tracking-wide mb-1">
                      Committee Review Remarks & Feedback
                    </label>
                    <textarea
                      rows={3}
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="Add official notes, commendations, or required changes..."
                      className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-black text-sm rounded-xl font-mono uppercase tracking-wider transition cursor-pointer flex items-center justify-center space-x-2 shadow-md shadow-indigo-200"
                  >
                    <Save className="w-5 h-5" />
                    <span>Save Official Committee Review Decision</span>
                  </button>

                </form>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* PHOTO ZOOM MODAL OVERLAY */}
      {zoomedPhoto && (
        <PhotoZoomModal
          photoUrl={zoomedPhoto.url}
          title={zoomedPhoto.title}
          subtitle={`Kaizen ID: ${kaizen.srNo}`}
          onClose={() => setZoomedPhoto(null)}
        />
      )}

    </div>
  );
}
