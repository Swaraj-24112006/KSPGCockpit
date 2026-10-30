import React from 'react';
import GlobalDashboard from './GlobalDashboard';
import { Kaizen, RedFlag, FiveSAudit, SafetyIncident, PpsrReport } from '../types';
import { AuthUser } from '../shared/utils/auth';

interface GlobalDashboardModuleProps {
  kaizens: Kaizen[];
  redFlags: RedFlag[];
  fiveSAudits: FiveSAudit[];
  safetyIncidents: SafetyIncident[];
  ppsrReports: PpsrReport[];
  onNavigateToModule: (module: 'kaizen' | 'redflag' | 'fives' | 'safety' | 'ppsr' | 'cft-awards', subAction?: string) => void;
  currentUser?: AuthUser | null;
  onBackToLanding?: () => void;
  onLogout?: () => void;
  onNavigateToSuperadmin?: () => void;
}

export default function GlobalDashboardModule({
  kaizens,
  redFlags,
  fiveSAudits,
  safetyIncidents,
  ppsrReports,
  onNavigateToModule,
  currentUser,
  onBackToLanding,
  onLogout,
  onNavigateToSuperadmin,
}: GlobalDashboardModuleProps) {
  return (
    <GlobalDashboard
      kaizens={kaizens}
      redFlags={redFlags}
      fiveSAudits={fiveSAudits}
      safetyIncidents={safetyIncidents}
      ppsrReports={ppsrReports}
      onNavigateToModule={onNavigateToModule}
      currentUser={currentUser}
      onBackToLanding={onBackToLanding}
      onLogout={onLogout}
      onNavigateToSuperadmin={onNavigateToSuperadmin}
    />
  );
}
