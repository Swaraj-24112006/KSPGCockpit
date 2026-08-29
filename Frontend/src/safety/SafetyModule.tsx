import React from 'react';
import SafetyIncidents from './SafetyIncidents';
import { SafetyIncident } from '../types';

interface SafetyModuleProps {
  incidents: SafetyIncident[];
  onAddIncident: (incidentData: Partial<SafetyIncident>) => void;
  onUpdateIncident: (id: string, updatedFields: Partial<SafetyIncident>) => void;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
}

export default function SafetyModule({
  incidents,
  onAddIncident,
  onUpdateIncident,
  initialAction,
  onClearInitialAction
}: SafetyModuleProps) {
  return (
    <SafetyIncidents
      incidents={incidents}
      onAddIncident={onAddIncident}
      onUpdateIncident={onUpdateIncident}
      initialAction={initialAction}
      onClearInitialAction={onClearInitialAction}
    />
  );
}
