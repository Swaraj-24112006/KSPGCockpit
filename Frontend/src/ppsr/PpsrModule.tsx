import React from 'react';
import PpsrSystem from './PpsrSystem';
import { PpsrReport, Kaizen, PpsrMeetingLog } from '../types';
import type { RoleCategory } from '../shared/utils/rbac';

interface PpsrModuleProps {
  reports: PpsrReport[];
  kaizens: Kaizen[];
  userRole?: RoleCategory;
  onAddReport: (reportData: Partial<PpsrReport>) => void;
  onUpdateReport: (id: string, updatedFields: Partial<PpsrReport>) => void;
  onUpdateKaizen: (id: string, updatedFields: Partial<Kaizen>) => void;
  activePpsrTab?: 'register' | 'meeting' | 'initiate' | 'cft-awards';
  setActivePpsrTab?: (tab: 'register' | 'meeting' | 'initiate' | 'cft-awards') => void;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
  onInspectReport: (report: PpsrReport) => void;
  meetings: PpsrMeetingLog[];
  onAddMeeting: (meetingData: Partial<PpsrMeetingLog>) => void;
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
  userRole
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
    />
  );
}
