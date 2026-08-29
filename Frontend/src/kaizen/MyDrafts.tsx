import React, { useState } from 'react';
import { Kaizen } from '../types';
import { 
  FileEdit, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  PlusCircle, 
  Search, 
  MapPin, 
  Building2, 
  Calendar,
  Sparkles,
  ArrowRight,
  Gauge
} from 'lucide-react';
import { formatIndianRupees } from '../utils';

interface MyDraftsProps {
  drafts: Kaizen[];
  onContinueEditing: (draft: Kaizen) => void;
  onDeleteDraft: (id: string) => void;
  onStartNew: () => void;
}

export default function MyDrafts({
  drafts,
  onContinueEditing,
  onDeleteDraft,
  onStartNew
}: MyDraftsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredDrafts = drafts.filter(d => 
    (d.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.srNo || d.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.area || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.minifactory || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to compute completeness of a draft
  const getDraftCompleteness = (draft: Kaizen) => {
    let score = 0;
    const total = 7;
    if (draft.title && draft.title.trim().length >= 5) score++;
    if (draft.problemBefore && draft.problemBefore.trim().length >= 10) score++;
    if (draft.counterMeasureAfter && draft.counterMeasureAfter.trim().length >= 10) score++;
    if (draft.area && draft.area.trim()) score++;
    if (draft.ideaBy && draft.ideaBy.trim()) score++;
    if (draft.benefits && Object.values(draft.benefits).some(Boolean)) score++;
    if (draft.photoBeforeUrl || draft.photoAfterUrl || draft.photoBefore || draft.photoAfter) score++;
    const percent = Math.round((score / total) * 100);
    return { score, total, percent };
  };

  // Helper to format ISO timestamp nicely
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Recently saved';
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return timestamp;
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 rounded-full uppercase tracking-widest font-mono">
                📝 INITIATOR DRAFT REPOSITORY
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {drafts.length} {drafts.length === 1 ? 'draft' : 'drafts'} saved
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              My Saved Kaizen Drafts
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Continue working on your saved improvement proposals. Incomplete sheets are kept securely in draft status until all compulsory fields and photos are completed.
            </p>
          </div>

          <button
            type="button"
            onClick={onStartNew}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-500/20 flex items-center space-x-2 shrink-0 cursor-pointer self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Kaizen</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search drafts by title, SR#, area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium self-end sm:self-auto">
          Showing <span className="font-bold text-slate-800">{filteredDrafts.length}</span> of {drafts.length} drafts
        </div>
      </div>

      {/* Drafts Content */}
      {filteredDrafts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <FileEdit className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {searchTerm ? 'No drafts match your search' : 'No Saved Drafts Found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {searchTerm 
                ? 'Try searching with a different keyword or clear the search input.'
                : 'You have no incomplete drafts in progress. Click below to start drafting a new Kaizen.'}
            </p>
          </div>
          {!searchTerm && (
            <button
              type="button"
              onClick={onStartNew}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Log New Kaizen</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDrafts.map((draft) => {
            const completeness = getDraftCompleteness(draft);
            const isDeleting = deletingId === draft.id;

            return (
              <div 
                key={draft.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Top Status & Date */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      {draft.srNo || draft.id || 'DRAFT'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
                      <Clock className="w-3 h-3 inline" />
                      <span>{formatTimestamp((draft as any).updatedAt || (draft as any).updated_at)}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition line-clamp-2 leading-snug">
                    {draft.title || <span className="text-slate-400 italic">Untitled Kaizen Draft</span>}
                  </h3>

                  {/* Problem snippet */}
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {draft.problemBefore || <span className="text-slate-400 italic">No problem statement entered yet...</span>}
                  </p>

                  {/* Meta Chips */}
                  <div className="mt-3.5 flex flex-wrap gap-1.5 text-[10px] font-medium text-slate-600">
                    {draft.area && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 flex items-center space-x-1">
                        <MapPin className="w-2.5 h-2.5 text-slate-400" />
                        <span className="truncate max-w-[120px]">{draft.area}</span>
                      </span>
                    )}
                    {draft.minifactory && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 flex items-center space-x-1">
                        <Building2 className="w-2.5 h-2.5 text-slate-400" />
                        <span>{draft.minifactory}</span>
                      </span>
                    )}
                  </div>

                  {/* Completeness Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                      <span className="text-slate-400">Readiness</span>
                      <span className={`font-bold ${
                        completeness.percent >= 80 ? 'text-emerald-600' :
                        completeness.percent >= 50 ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {completeness.percent}% ({completeness.score}/{completeness.total})
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          completeness.percent >= 80 ? 'bg-emerald-500' :
                          completeness.percent >= 50 ? 'bg-amber-500' : 'bg-slate-400'
                        }`}
                        style={{ width: `${completeness.percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete draft "${draft.title || draft.srNo}"?`)) {
                        setDeletingId(draft.id);
                        onDeleteDraft(draft.id);
                      }
                    }}
                    disabled={isDeleting}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-200 cursor-pointer"
                    title="Delete Draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onContinueEditing(draft)}
                    className="flex-1 flex items-center justify-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm hover:shadow shadow-emerald-600/20 cursor-pointer"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>Continue Editing</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
