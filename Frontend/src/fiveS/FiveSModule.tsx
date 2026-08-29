import React from 'react';
import FiveSAudits from './FiveSAudits';
import { FiveSAudit } from '../types';

interface FiveSModuleProps {
  audits: FiveSAudit[];
  onAddAudit: (auditData: Partial<FiveSAudit>) => void;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
}

export default function FiveSModule({
  audits,
  onAddAudit,
  initialAction,
  onClearInitialAction
}: FiveSModuleProps) {
  return (
    <FiveSAudits
      audits={audits}
      onAddAudit={onAddAudit}
      initialAction={initialAction}
      onClearInitialAction={onClearInitialAction}
    />
  );
}
