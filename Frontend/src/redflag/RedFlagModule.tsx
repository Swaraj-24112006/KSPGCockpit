import React from 'react';
import RedFlagSystem from './RedFlagSystem';
import { RedFlag, UserPersona } from '../types';
import { RedFlagProvider } from './context/RedFlagContext';
import ErrorBoundary from './components/common/ErrorBoundary';

interface RedFlagModuleProps {
  redFlags: RedFlag[];
  onAddRedFlag: (flagData: Partial<RedFlag>) => void;
  onUpdateRedFlag: (id: string, updatedFields: Partial<RedFlag>) => void;
  onDeleteRedFlag?: (id: string) => void;
  onEscalateToPpsr?: (id: string) => Promise<void>;
  onConvertToKaizen?: (id: string) => Promise<void>;
  onLinkToFiveS?: (id: string) => Promise<void>;
  onFlagListChanged?: (flags: RedFlag[]) => void;
  currentPersona: UserPersona;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
  onNavigateToModule?: (moduleKey: string) => void;
  isSidebarHidden?: boolean;
  onToggleSidebar?: () => void;
}

export default function RedFlagModule(props: RedFlagModuleProps) {
  return (
    <ErrorBoundary fallbackTitle="Red Flag Module Encountered an Issue">
      <RedFlagProvider initialFlags={props.redFlags} onFlagListChanged={props.onFlagListChanged}>
        <RedFlagSystem {...props} />
      </RedFlagProvider>
    </ErrorBoundary>
  );
}
