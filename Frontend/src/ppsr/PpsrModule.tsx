import React from 'react';
import PpsrSystem from './PpsrSystem';
import { PpsrReport, Kaizen, PpsrMeetingLog } from '../types';
import type { RoleCategory, PpsrSubTab } from '../shared/utils/rbac';

interface PpsrModuleProps {
  reports: PpsrReport[];
  kaizens: Kaizen[];
  userRole?: RoleCategory;
  onAddReport: (reportData: Partial<PpsrReport>) => void;
  onUpdateReport: (id: string, updatedFields: Partial<PpsrReport>) => void;
  onUpdateKaizen: (id: string, updatedFields: Partial<Kaizen>) => void;
  activePpsrTab?: PpsrSubTab;
  setActivePpsrTab?: (tab: PpsrSubTab) => void;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
  onInspectReport: (report: PpsrReport) => void;
  meetings: PpsrMeetingLog[];
  onAddMeeting: (meetingData: Partial<PpsrMeetingLog>) => void;
  // Draft support
  drafts?: PpsrReport[];
  onSaveDraft?: (data: Partial<PpsrReport>) => void;
  onUpdateDraft?: (id: string, data: Partial<PpsrReport>) => void;
  onDeleteDraft?: (id: string) => void;
}

export default function PpsrModule({
  reports,
  kaizens,
  onAddReport,
  onUpdateReport,
  onUpdateKaizen,
  activePpsrTab,
  setActivePpsrTab,
  initialAction,
  onClearInitialAction,
  onInspectReport,
  meetings,
  onAddMeeting,
  userRole,
  drafts,
  onSaveDraft,
  onUpdateDraft,
  onDeleteDraft,
}: PpsrModuleProps) {
  return (
    <PpsrSystem
      reports={reports}
      kaizens={kaizens}
      onAddReport={onAddReport}
      onUpdateReport={onUpdateReport}
      onUpdateKaizen={onUpdateKaizen}
      activePpsrTab={activePpsrTab}
      setActivePpsrTab={setActivePpsrTab}
      initialAction={initialAction}
      onClearInitialAction={onClearInitialAction}
      onInspectReport={onInspectReport}
      meetings={meetings}
      onAddMeeting={onAddMeeting}
      userRole={userRole}
      drafts={drafts}
      onSaveDraft={onSaveDraft}
      onUpdateDraft={onUpdateDraft}
      onDeleteDraft={onDeleteDraft}
    />
  );
}
