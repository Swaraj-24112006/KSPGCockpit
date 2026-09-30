import React, { useState } from 'react';
import { PpsrReport } from '../types';
import { Search, FileEdit, Trash2, Clock, ArrowRight, AlertCircle, PlusCircle } from 'lucide-react';

interface PpsrMyDraftsProps {
  drafts: PpsrReport[];
  onContinueEditing: (draft: PpsrReport) => void;
  onDeleteDraft: (id: string) => void;
  onStartNew: () => void;
}

export default function PpsrMyDrafts({
  drafts,
  onContinueEditing,
  onDeleteDraft,
  onStartNew,
}: PpsrMyDraftsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredDrafts = drafts.filter(d =>
    (d.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.ppsrNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.leadOwner || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.plant || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compute how complete a draft is (0-100%)
  const getDraftCompleteness = (draft: PpsrReport) => {
    let score = 0;
    const total = 10;
    if (draft.title && draft.title.trim().length >= 3) score++;
    if (draft.problemStatement && draft.problemStatement.trim().length >= 5) score++;
    if (draft.leadOwner && draft.leadOwner.trim()) score++;
    if (draft.plant && draft.plant.trim()) score++;
    if (draft.factsAnalysis && draft.factsAnalysis.whatIs) score++;
    if (draft.ishikawa && Object.values(draft.ishikawa as Record<string, string[]>).some(arr => arr && arr.length > 0)) score++;
    if (draft.fiveWhysList && draft.fiveWhysList.length > 0 && draft.fiveWhysList[0].heading) score++;
    if (draft.containmentActionsList && draft.containmentActionsList.length > 0) score++;
    if (draft.correctiveActionsList && draft.correctiveActionsList.length > 0) score++;
    if (draft.effectivenessEvidence) score++;
    return Math.round((score / total) * 100);
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return 'Unknown';
    try {
      return new Date(ts).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return ts;
    }
  };

  const stepLabels: Record<number, string> = {
    1: 'General Parameters',
    2: 'Facts Analysis (IS/IS NOT)',
    3: 'Root Cause & Ishikawa',
    4: 'Actions & Standardization',
    5: 'Effectiveness & Evidence',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/60 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="inline-flex items-center space-x-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest font-mono mb-2">
              <FileEdit className="w-3 h-3" />
              <span>📝 PPSR Draft Repository</span>
              <span className="bg-amber-800 text-amber-100 px-1.5 rounded-full text-[9px]">
                {drafts.length} {drafts.length === 1 ? 'draft' : 'drafts'} saved
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 leading-tight">
              My Saved PPSR Drafts
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Continue working on your saved problem-solving reports. Drafts are kept securely until you're ready to submit. Only submitted reports appear in the Committee Review Board.
            </p>
          </div>
          <button
            onClick={onStartNew}
            className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase font-mono shadow-md transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Start New PPSR</span>
          </button>
        </div>

        {/* Search */}
        {drafts.length > 0 && (
          <div className="mt-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search drafts by title, PPSR#, plant, owner..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
            />
          </div>
        )}
        {drafts.length > 0 && (
          <p className="text-[10px] text-slate-400 font-mono mt-2">
            Showing <span className="font-bold text-slate-800">{filteredDrafts.length}</span> of {drafts.length} drafts
          </p>
        )}
      </div>

      {/* Drafts List */}
      {filteredDrafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 bg-white border border-dashed border-slate-300 rounded-2xl">
          <div className="text-5xl">📄</div>
          <h3 className="text-lg font-bold text-slate-600">
            {searchTerm ? 'No drafts match your search' : 'No Saved Drafts Found'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm text-center">
            {searchTerm
              ? 'Try a different search term.'
              : 'You have no incomplete drafts. Click below to start drafting a new PPSR report.'}
          </p>
          {!searchTerm && (
            <button
              onClick={onStartNew}
              className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Start New PPSR</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDrafts.map((draft) => {
            const completeness = getDraftCompleteness(draft);
            const isDeleting = deletingId === draft.id;
            const step = draft.lastSavedStep || 1;
            return (
              <div
                key={draft.id}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Draft info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">
                        {draft.ppsrNo || 'DRAFT'}
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimestamp(draft.updatedAt || draft.createdAt)}</span>
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {draft.title || <span className="text-slate-400 italic">Untitled PPSR Draft</span>}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {draft.problemStatement || <span className="text-slate-400 italic">No problem statement entered yet...</span>}
                    </p>

                    {/* Tags */}
                    <div className="flex items-center flex-wrap gap-1.5 text-[10px]">
                      {draft.plant && (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          🏭 {draft.plant}
                        </span>
                      )}
                      {draft.leadOwner && (
                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">
                          👤 {draft.leadOwner}
                        </span>
                      )}
                      <span className="bg-violet-50 text-violet-600 px-2 py-0.5 rounded font-bold">
                        📋 Step {step}/5: {stepLabels[step] || 'Unknown'}
                      </span>
                    </div>

                    {/* Completeness bar */}
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden max-w-[200px]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            completeness >= 80 ? 'bg-emerald-500' :
                            completeness >= 40 ? 'bg-amber-500' : 'bg-slate-400'
                          }`}
                          style={{ width: `${completeness}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 font-mono">{completeness}%</span>
                    </div>
                  </div>

                  {/* Right: Action buttons */}
                  <div className="flex flex-col items-end space-y-2 shrink-0">
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete draft "${draft.title || draft.ppsrNo}"?`)) {
                          setDeletingId(draft.id);
                          onDeleteDraft(draft.id);
                        }
                      }}
                      disabled={isDeleting}
                      title="Delete Draft"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onContinueEditing(draft)}
                      className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Continue Editing</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info note */}
      {drafts.length > 0 && (
        <div className="flex items-start space-x-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            <strong>Note:</strong> Drafts are only visible to you. They will appear in the Committee Review Board and PPSR Register only after you submit (Compile & Initiate) the report.
          </p>
        </div>
      )}
    </div>
  );
}
