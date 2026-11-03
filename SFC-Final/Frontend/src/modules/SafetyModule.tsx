import React from 'react';
import SafetyIncidents from '../components/SafetyIncidents';
import { SafetyIncident } from '../types';

interface SafetyModuleProps {
  incidents: SafetyIncident[];
  onAddIncident: (incidentData: Partial<SafetyIncident>) => void;
  onUpdateIncident: (id: string, updatedFields: Partial<SafetyIncident>) => void;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
  isSidebarHidden?: boolean;
  onToggleSidebar?: () => void;
}

export default function SafetyModule({
  incidents,
  onAddIncident,
  onUpdateIncident,
  initialAction,
  onClearInitialAction,
  isSidebarHidden,
  onToggleSidebar
}: SafetyModuleProps) {
  return (
    <SafetyIncidents
      incidents={incidents}
      onAddIncident={onAddIncident}
      onUpdateIncident={onUpdateIncident}
      initialAction={initialAction}
      onClearInitialAction={onClearInitialAction}
      isSidebarHidden={isSidebarHidden}
      onToggleSidebar={onToggleSidebar}
    />
  );
}
