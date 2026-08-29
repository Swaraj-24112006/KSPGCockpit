import React from 'react';
import CftMonthlyAwards from './CftMonthlyAwards';
import AccessDenied from '../shared/components/AccessDenied';
import { Kaizen, PpsrReport } from '../types';
import { RoleCategory, canAccessTab } from '../shared/utils/rbac';

interface CftAwardsModuleProps {
  kaizens: Kaizen[];
  ppsrReports: PpsrReport[];
  userRole?: RoleCategory;
  onUpdateKaizen: (id: string, updatedFields: Partial<Kaizen>) => void;
  onUpdatePpsrReport: (id: string, updatedFields: Partial<PpsrReport>) => void;
  onNavigateHome?: () => void;
  onNavigateKaizen?: () => void;
}

export default function CftAwardsModule({
  kaizens,
  ppsrReports,
  userRole = 'initiator',
  onUpdateKaizen,
  onUpdatePpsrReport,
  onNavigateHome = () => {},
  onNavigateKaizen = () => {}
}: CftAwardsModuleProps) {
  // If role is not authorized (only Super Admin and Kaizen Coordinator are allowed)
  if (!canAccessTab(userRole, 'cft-awards')) {
    return (
      <AccessDenied
        userRole={userRole}
        attemptedSection="Monthly Best Awards"
        onNavigateHome={onNavigateHome}
        onNavigateKaizen={onNavigateKaizen}
      />
    );
  }

  return (
    <CftMonthlyAwards
      kaizens={kaizens}
      ppsrReports={ppsrReports}
      onUpdateKaizen={onUpdateKaizen}
      onUpdatePpsrReport={onUpdatePpsrReport}
    />
  );
}
