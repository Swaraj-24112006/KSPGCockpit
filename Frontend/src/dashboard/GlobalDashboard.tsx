import React from 'react';
import SfcDashboard from '../sfc/SfcDashboard';
import { Kaizen, RedFlag, FiveSAudit, SafetyIncident, PpsrReport } from '../types';
import { AuthUser, getUser } from '../shared/utils/auth';

export interface GlobalDashboardProps {
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

export default function GlobalDashboard({
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
}: GlobalDashboardProps) {
  const effectiveUser = currentUser || getUser();

  return (
    <SfcDashboard
      currentUser={effectiveUser}
      kaizens={kaizens}
      redFlags={redFlags}
      fiveSAudits={fiveSAudits}
      safetyIncidents={safetyIncidents}
      ppsrReports={ppsrReports}
      onNavigateToModule={onNavigateToModule}
      onBackToLanding={onBackToLanding}
      onLogout={onLogout}
      onNavigateToSuperadmin={onNavigateToSuperadmin}
    />
  );
}
