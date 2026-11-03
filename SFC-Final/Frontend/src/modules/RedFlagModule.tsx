import React from 'react';
import RedFlagSystem from '../components/RedFlagSystem';
import { RedFlag, UserPersona } from '../types';
import { RedFlagProvider } from '../context/RedFlagContext';

interface RedFlagModuleProps {
  redFlags: RedFlag[];
  onAddRedFlag: (flagData: Partial<RedFlag>) => void;
  onUpdateRedFlag: (id: string, updatedFields: Partial<RedFlag>) => void;
  onDeleteRedFlag?: (id: string) => void;
  onEscalateToPpsr?: (id: string) => Promise<void>;
  onConvertToKaizen?: (id: string) => Promise<void>;
  onLinkToFiveS?: (id: string) => Promise<void>;
  currentPersona: UserPersona;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
  onNavigateToModule?: (moduleKey: string) => void;
  isSidebarHidden?: boolean;
  onToggleSidebar?: () => void;
}

export default function RedFlagModule(props: RedFlagModuleProps) {
  return (
    <RedFlagProvider initialFlags={props.redFlags}>
      <RedFlagSystem {...props} />
    </RedFlagProvider>
  );
}
