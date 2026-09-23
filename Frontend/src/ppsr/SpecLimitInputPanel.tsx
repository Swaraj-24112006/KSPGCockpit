import React, { useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import SpecLimitTrendGraph from './SpecLimitTrendGraph';

interface SpecLimitInputPanelProps {
  usl: number;
  lsl: number;
  measurements: number[];
  onUslChange: (val: number) => void;
  onLslChange: (val: number) => void;
  onMeasurementsChange: (vals: number[]) => void;
  title: string;
}

/**
 * SpecLimitInputPanel — Inputs for USL, LSL, and measurement values
 * with inline validation and a live-updating SpecLimitTrendGraph.
 */
export default function SpecLimitInputPanel({
  usl,
  lsl,
  measurements,
  onUslChange,
  onLslChange,
  onMeasurementsChange,
  title,
}: SpecLimitInputPanelProps) {
  const [measurementText, setMeasurementText] = useState<string>(
    measurements.join(', ')
  );
  const [parseError, setParseError] = useState<string>('');

  const validationError =
    !isNaN(usl) && !isNaN(lsl) && usl <= lsl
      ? 'USL must be greater than LSL'
      : '';

  const handleMeasurementTextChange = useCallback(
    (raw: string) => {
      setMeasurementText(raw);

      // Allow empty
      if (raw.trim() === '') {
        onMeasurementsChange([]);
        setParseError('');
        return;
      }

      const tokens = raw
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      const parsed: number[] = [];
      const bad: string[] = [];

      for (const tok of tokens) {
        const n = Number(tok);
        if (isNaN(n)) {
          bad.push(tok);
        } else {
          parsed.push(n);
        }
      }

      if (bad.length > 0) {
        setParseError(`Non-numeric values ignored: ${bad.join(', ')}`);
      } else {
        setParseError('');
      }

      onMeasurementsChange(parsed);
    },
    [onMeasurementsChange]
  );

  // Sync external measurement changes back to the text field
  // (e.g. when loading from saved data)
  const syncedText = measurements.join(', ');
  const isTextSynced = syncedText === measurementText.replace(/\s+/g, '').replace(/,+/g, ',').replace(/^,|,$/g, '').split(',').map(s => s.trim()).join(', ');

  return (
    <div className="space-y-3 bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-teal-200 shadow-3xs animate-fade-in">
      {/* Header */}
      <div className="flex items-center space-x-2 border-b border-teal-100 pb-2">
        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
        <span className="text-[10px] font-black uppercase text-teal-800 font-mono tracking-wider">
          {title}
        </span>
      </div>

      {/* USL / LSL Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">
            USL (Upper Spec Limit)
          </label>
          <input
            type="number"
            step="0.01"
            value={usl}
            onChange={(e) => onUslChange(parseFloat(e.target.value) || 0)}
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-600 font-mono focus:outline-none focus:ring-1 focus:ring-red-300"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">
            LSL (Lower Spec Limit)
          </label>
          <input
            type="number"
            step="0.01"
            value={lsl}
            onChange={(e) => onLslChange(parseFloat(e.target.value) || 0)}
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-blue-600 font-mono focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
        </div>
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="flex items-center space-x-1.5 text-[10px] font-bold text-rose-600 font-mono bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Center Line display */}
      {!validationError && !isNaN(usl) && !isNaN(lsl) && (
        <div className="flex items-center space-x-2 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Center Line (CL) = ({usl} + {lsl}) / 2 = {((usl + lsl) / 2).toFixed(2)}</span>
        </div>
      )}

      {/* Measurements Input */}
      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">
          Measurement Values (comma-separated)
        </label>
        <textarea
          value={measurementText}
          onChange={(e) => handleMeasurementTextChange(e.target.value)}
          rows={2}
          placeholder="e.g. 6.19, 6.39, 8.24, 6.22, 6.19"
          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-teal-300 resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-slate-400 font-mono">
            {measurements.length} measurement{measurements.length !== 1 ? 's' : ''} entered
          </span>
          {parseError && (
            <span className="text-[9px] text-amber-600 font-mono font-bold">
              ⚠ {parseError}
            </span>
          )}
        </div>
      </div>

      {/* Live Graph */}
      {!validationError && measurements.length > 0 && (
        <div className="pt-2 border-t border-teal-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-slate-700 font-mono tracking-wider">
              Specification-Limit Trend Graph
            </span>
            <span className="text-[9px] font-mono text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              Live Preview
            </span>
          </div>
          <SpecLimitTrendGraph
            usl={usl}
            lsl={lsl}
            measurements={measurements}
            height={260}
          />
        </div>
      )}
    </div>
  );
}
