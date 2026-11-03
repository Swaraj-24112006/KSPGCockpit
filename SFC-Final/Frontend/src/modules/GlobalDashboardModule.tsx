import React from 'react';
import GlobalDashboard from '../components/GlobalDashboard';
import { Kaizen, RedFlag, FiveSAudit, SafetyIncident, PpsrReport } from '../types';

interface GlobalDashboardModuleProps {
  kaizens: Kaizen[];
  redFlags: RedFlag[];
  fiveSAudits: FiveSAudit[];
  safetyIncidents: SafetyIncident[];
  ppsrReports: PpsrReport[];
  onNavigateToModule: (module: 'kaizen' | 'redflag' | 'fives' | 'safety' | 'ppsr' | 'cft-awards', subAction?: string) => void;
}

export default function GlobalDashboardModule({
  kaizens,
  redFlags,
  fiveSAudits,
  safetyIncidents,
  ppsrReports,
  onNavigateToModule
}: GlobalDashboardModuleProps) {
  return (
    <GlobalDashboard
      kaizens={kaizens}
      redFlags={redFlags}
      fiveSAudits={fiveSAudits}
      safetyIncidents={safetyIncidents}
      ppsrReports={ppsrReports}
      onNavigateToModule={onNavigateToModule}
    />
  );
}
