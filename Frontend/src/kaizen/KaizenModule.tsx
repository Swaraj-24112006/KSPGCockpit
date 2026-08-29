import React from 'react';
import Dashboard from '../dashboard/Dashboard';
import KaizenSheetForm from './KaizenSheetForm';
import KaizenReviewBoard from './KaizenReviewBoard';
import KaizenSpreadsheet from './KaizenSpreadsheet';
import CftMonthlyAwards from '../cft/CftMonthlyAwards';
import OpenImpactTracker from './OpenImpactTracker';
import KaizenProcessFlowchart from './KaizenProcessFlowchart';
import MyDrafts from './MyDrafts';
import AccessDenied from '../shared/components/AccessDenied';
import { Kaizen, PpsrReport, OpenImpactAction, UserPersona } from '../types';
import { RoleCategory, KaizenSubTab, canAccessTab } from '../shared/utils/rbac';

interface KaizenModuleProps {
  activeTab: KaizenSubTab;
  setActiveTab: (tab: KaizenSubTab) => void;
  kaizens: Kaizen[];
  drafts: Kaizen[];
  editingDraft: Kaizen | null;
  setEditingDraft: (draft: Kaizen | null) => void;
  ppsrReports: PpsrReport[];
  impactActions: OpenImpactAction[];
  userRole?: RoleCategory;
  onAddKaizen: (kaizen: Partial<Kaizen> & { photoBeforeFile?: File; photoAfterFile?: File }) => void;
  onSaveDraft: (draft: Partial<Kaizen> & { photoBeforeFile?: File; photoAfterFile?: File }) => void;
  onSubmitKaizen: (kaizen: Partial<Kaizen> & { photoBeforeFile?: File; photoAfterFile?: File }) => void;
  onDeleteDraft: (id: string) => void;
  onUpdateKaizen: (id: string, updatedFields: Partial<Kaizen>) => void;
  onAddImpactAction: (action: Partial<OpenImpactAction>) => void;
  onUpdateImpactAction: (id: string, updates: Partial<OpenImpactAction>) => void;
  onDeleteImpactAction: (id: string) => void;
  onUpdatePpsrReport: (id: string, updatedFields: Partial<PpsrReport>) => void;
  onSelectKaizen: (kaizen: Kaizen) => void;
  handleSetPersona: (persona: UserPersona) => void;
}

export default function KaizenModule({
  activeTab,
  setActiveTab,
  kaizens,
  drafts,
  editingDraft,
  setEditingDraft,
  ppsrReports,
  impactActions,
  userRole = 'initiator',
  onAddKaizen,
  onSaveDraft,
  onSubmitKaizen,
  onDeleteDraft,
  onUpdateKaizen,
  onAddImpactAction,
  onUpdateImpactAction,
  onDeleteImpactAction,
  onUpdatePpsrReport,
  onSelectKaizen,
  handleSetPersona
}: KaizenModuleProps) {
  // If activeTab is forbidden for current role, show AccessDenied immediately
  if (!canAccessTab(userRole, 'kaizen', activeTab)) {
    const tabLabels: Record<string, string> = {
      'form': 'Log New Kaizen',
      'drafts': 'My Drafts',
      'committee': 'Committee Review',
      'impact-tracker': 'Impact Point & Closure',
      'list': 'Spreadsheet Register',
    };
    return (
      <AccessDenied
        userRole={userRole}
        attemptedSection={tabLabels[activeTab] || activeTab}
        onNavigateHome={() => setActiveTab('dashboard')}
        onNavigateKaizen={() => setActiveTab('dashboard')}
      />
    );
  }

  return (
    <div className="space-y-1">
      {activeTab === 'dashboard' && (
        <Dashboard
          kaizens={kaizens}
          onSelectKaizen={onSelectKaizen}
          userRole={userRole}
          onNavigateToTab={(tab) => {
            if (canAccessTab(userRole, 'kaizen', tab as any)) {
              if (tab === 'form') {
                setEditingDraft(null);
                handleSetPersona('operator');
              } else if (tab === 'committee') {
                handleSetPersona('committee');
              }
              setActiveTab(tab as any);
            }
          }}
        />
      )}

      {activeTab === 'drafts' && (
        <MyDrafts
          drafts={drafts}
          onContinueEditing={(draft) => {
            setEditingDraft(draft);
            setActiveTab('form');
          }}
          onDeleteDraft={onDeleteDraft}
          onStartNew={() => {
            setEditingDraft(null);
            setActiveTab('form');
          }}
        />
      )}

      {activeTab === 'list' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide font-mono mb-1">
              📋 Kaizen Spreadsheet Register
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Click on any entry row to inspect, print, or review its complete Kaizen sheet.
            </p>
          </div>
          <KaizenSpreadsheet
            kaizens={kaizens}
            onSelectKaizen={onSelectKaizen}
            onUpdateKaizen={onUpdateKaizen}
          />
        </div>
      )}

      {activeTab === 'form' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <KaizenSheetForm
            initialData={editingDraft}
            onAddKaizen={onAddKaizen}
            onSaveDraft={onSaveDraft}
            onSubmitKaizen={onSubmitKaizen}
            onCancel={() => {
              setEditingDraft(null);
              setActiveTab('dashboard');
            }}
          />
        </div>
      )}

      {activeTab === 'committee' && (
        <KaizenReviewBoard
          kaizens={kaizens}
          onUpdateKaizen={onUpdateKaizen}
        />
      )}

      {activeTab === 'cft-awards' && (
        <CftMonthlyAwards
          kaizens={kaizens}
          ppsrReports={ppsrReports}
          onUpdateKaizen={onUpdateKaizen}
          onUpdatePpsrReport={onUpdatePpsrReport}
        />
      )}

      {activeTab === 'impact-tracker' && (
        <OpenImpactTracker
          impactActions={impactActions}
          kaizens={kaizens}
          onAddImpactAction={onAddImpactAction}
          onUpdateImpactAction={onUpdateImpactAction}
          onDeleteImpactAction={onDeleteImpactAction}
        />
      )}

      {activeTab === 'process-flowchart' && (
        <KaizenProcessFlowchart />
      )}
    </div>
  );
}
