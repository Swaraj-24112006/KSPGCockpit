import React from 'react';
import RedFlagSystem from './RedFlagSystem';
import { RedFlag, UserPersona } from '../types';

interface RedFlagModuleProps {
  redFlags: RedFlag[];
  onAddRedFlag: (flagData: Partial<RedFlag>) => void;
  onUpdateRedFlag: (id: string, updatedFields: Partial<RedFlag>) => void;
  currentPersona: UserPersona;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
}

export default function RedFlagModule({
  redFlags,
  onAddRedFlag,
  onUpdateRedFlag,
  currentPersona,
  initialAction,
  onClearInitialAction
}: RedFlagModuleProps) {
  return (
    <RedFlagSystem
      redFlags={redFlags}
      onAddRedFlag={onAddRedFlag}
      onUpdateRedFlag={onUpdateRedFlag}
      currentPersona={currentPersona}
      initialAction={initialAction}
      onClearInitialAction={onClearInitialAction}
    />
  );
}
