import React from 'react';
import FiveSAudits from '../components/FiveSAudits';
import { FiveSAudit, FiveSRedTag, FiveSActionItem, FiveSSocLog, Kaizen, UserPersona } from '../types';

interface FiveSModuleProps {
  audits: FiveSAudit[];
  redTags?: FiveSRedTag[];
  actionItems?: FiveSActionItem[];
  socLogs?: FiveSSocLog[];
  kaizens?: Kaizen[];
  onAddAudit: (auditData: Partial<FiveSAudit>) => void;
  onUpdateAudit?: (id: string, updateData: Partial<FiveSAudit>) => void;
  onDeleteAudit?: (id: string) => void;
  onAddRedTag?: (tag: Partial<FiveSRedTag>) => void;
  onUpdateRedTag?: (id: string, tag: Partial<FiveSRedTag>) => void;
  onDeleteRedTag?: (id: string) => void;
  onAddActionItem?: (item: Partial<FiveSActionItem>) => void;
  onUpdateActionItem?: (id: string, item: Partial<FiveSActionItem>) => void;
  onDeleteActionItem?: (id: string) => void;
  onAddSocLog?: (soc: Partial<FiveSSocLog>) => void;
  onUpdateSocLog?: (id: string, soc: Partial<FiveSSocLog>) => void;
  onDeleteSocLog?: (id: string) => void;
  onAddKaizen?: (kaizen: Partial<Kaizen>) => void;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
  currentPersona?: UserPersona;
  isSidebarHidden?: boolean;
  onToggleSidebar?: () => void;
}

export default function FiveSModule({
  audits,
  redTags = [],
  actionItems = [],
  socLogs = [],
  kaizens = [],
  onAddAudit,
  onUpdateAudit = () => {},
  onDeleteAudit = () => {},
  onAddRedTag = () => {},
  onUpdateRedTag = () => {},
  onDeleteRedTag = () => {},
  onAddActionItem = () => {},
  onUpdateActionItem = () => {},
  onDeleteActionItem = () => {},
  onAddSocLog = () => {},
  onUpdateSocLog = () => {},
  onDeleteSocLog = () => {},
  onAddKaizen = () => {},
  initialAction,
  onClearInitialAction,
  currentPersona = 'manager',
  isSidebarHidden,
  onToggleSidebar
}: FiveSModuleProps) {
  return (
    <FiveSAudits
      audits={audits}
      redTags={redTags}
      actionItems={actionItems}
      socLogs={socLogs}
      kaizens={kaizens}
      onAddAudit={onAddAudit}
      onUpdateAudit={onUpdateAudit}
      onDeleteAudit={onDeleteAudit}
      onAddRedTag={onAddRedTag}
      onUpdateRedTag={onUpdateRedTag}
      onDeleteRedTag={onDeleteRedTag}
      onAddActionItem={onAddActionItem}
      onUpdateActionItem={onUpdateActionItem}
      onDeleteActionItem={onDeleteActionItem}
      onAddSocLog={onAddSocLog}
      onUpdateSocLog={onUpdateSocLog}
      onDeleteSocLog={onDeleteSocLog}
      onAddKaizen={onAddKaizen}
      initialAction={initialAction}
      onClearInitialAction={onClearInitialAction}
      currentPersona={currentPersona}
      isSidebarHidden={isSidebarHidden}
      onToggleSidebar={onToggleSidebar}
    />
  );
}
