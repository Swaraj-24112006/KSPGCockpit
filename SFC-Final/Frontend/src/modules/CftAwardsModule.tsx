import React from 'react';
import CftMonthlyAwards from '../components/CftMonthlyAwards';
import { Kaizen, PpsrReport } from '../types';

interface CftAwardsModuleProps {
  kaizens: Kaizen[];
  ppsrReports: PpsrReport[];
  onUpdateKaizen: (id: string, updatedFields: Partial<Kaizen>) => void;
  onUpdatePpsrReport: (id: string, updatedFields: Partial<PpsrReport>) => void;
}

export default function CftAwardsModule({
  kaizens,
  ppsrReports,
  onUpdateKaizen,
  onUpdatePpsrReport
}: CftAwardsModuleProps) {
  return (
    <CftMonthlyAwards
      kaizens={kaizens}
      ppsrReports={ppsrReports}
      onUpdateKaizen={onUpdateKaizen}
      onUpdatePpsrReport={onUpdatePpsrReport}
    />
  );
}
