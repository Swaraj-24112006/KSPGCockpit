import React, { useState } from 'react';
import { StandardWorksheetRow, PsqTreeData } from '../types';
import { 
  Table, 
  Plus, 
  Trash2, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Sparkles, 
  Sliders, 
  FileText,
  Target,
  RefreshCw,
  Info,
  Check,
  Flame,
  ArrowRight
} from 'lucide-react';

interface StandardWorksheetEditorProps {
  worksheet: StandardWorksheetRow[];
  onChange: (rows: StandardWorksheetRow[]) => void;
  onAutoGenerateTree?: (rows: StandardWorksheetRow[]) => void;
  isEditable?: boolean;
  compact?: boolean;
  onSyncRealtimeChange?: (enabled: boolean) => void;
  realtimeSync?: boolean;
}

export const SAMPLE_STANDARD_WORKSHEET: StandardWorksheetRow[] = [
  {
    id: 'sw-1',
    stepNo: 'OP 10',
    operationName: 'Gauge Repeatability & Pressure Transducer Calibration',
    category: 'measurement',
    standardSpec: 'Transducer error < ±0.5 bar (Linear)',
    bobObserved: '215 bar (Good)',
    wowObserved: '142 bar (Bad - repeat reading identical)',
    status: 'eliminated',
    notes: 'Delta M ruled out: Gauge measurement system is repeatable.'
  },
  {
    id: 'sw-2',
    stepNo: 'OP 20',
    operationName: 'Assembly Torquing & Housing Seating Sequence',
    category: 'assembly',
    standardSpec: 'Torque 25.0 ± 2.0 Nm; 0-gap face contact',
    bobObserved: '24.8 Nm (Nominal)',
    wowObserved: '25.1 Nm (Reassembled WOW stays WOW)',
    status: 'eliminated',
    notes: 'Assembly process ruled out: Disassembly & re-torquing confirmed OK.'
  },
  {
    id: 'sw-3',
    stepNo: 'OP 30',
    operationName: 'Plunger Spring Force & Free Height',
    category: 'component',
    standardSpec: 'Free height 42.5 ± 0.5 mm, Force 120N',
    bobObserved: '42.4 mm (121 N)',
    wowObserved: '42.6 mm (119 N)',
    status: 'eliminated',
    notes: 'Swapping Plunger Spring between BOB and WOW showed no variance.'
  },
  {
    id: 'sw-4',
    stepNo: 'OP 40',
    operationName: 'Delivery Check Valve & Internal Seat Sealing',
    category: 'component',
    standardSpec: 'Internal seat Ra < 0.4 µm, 0 burrs',
    bobObserved: '0.22 µm (Smooth seat, seals 216 bar)',
    wowObserved: 'Micro-burr on seat edge; drops to 141 bar',
    status: 'target',
    notes: '🎯 RED X ROOT CAUSE: Swapping Check Valve transfers WOW defect to BOB unit!'
  },
  {
    id: 'sw-5',
    stepNo: 'OP 50',
    operationName: 'Inlet Metering Solenoid Coil',
    category: 'component',
    standardSpec: 'Resistance 3.2 ± 0.2 Ω',
    bobObserved: '3.21 Ω',
    wowObserved: '3.19 Ω',
    status: 'eliminated',
    notes: 'Electrical resistance & coil response within spec.'
  },
  {
    id: 'sw-6',
    stepNo: 'OP 60',
    operationName: 'Main Housing Body & Galling',
    category: 'component',
    standardSpec: 'Bore concentricity < 0.015 mm',
    bobObserved: '0.008 mm',
    wowObserved: '0.010 mm',
    status: 'eliminated',
    notes: 'Housing bore geometry confirmed OK.'
  }
];

export const StandardWorksheetEditor: React.FC<StandardWorksheetEditorProps> = ({
  worksheet = [],
  onChange,
  onAutoGenerateTree,
  isEditable = true,
  compact = false,
  onSyncRealtimeChange,
  realtimeSync = true
}) => {
  const [successMessage, setSuccessMessage] = useState<string>('');

  const handleAddRow = () => {
    if (!isEditable) return;
    const nextIdx = worksheet.length + 1;
    const newRow: StandardWorksheetRow = {
      id: `sw-${Date.now()}-${nextIdx}`,
      stepNo: `OP ${nextIdx * 10}`,
      operationName: `Operation / Element ${nextIdx}`,
      category: nextIdx === 1 ? 'measurement' : nextIdx === 2 ? 'assembly' : 'component',
      standardSpec: '',
      bobObserved: '',
      wowObserved: '',
      status: 'pending',
      notes: ''
    };
    const updated = [...worksheet, newRow];
    onChange(updated);
    if (realtimeSync && onAutoGenerateTree) {
      onAutoGenerateTree(updated);
    }
  };

  const handleUpdateRow = (index: number, updates: Partial<StandardWorksheetRow>) => {
    if (!isEditable) return;
    const updated = worksheet.map((row, i) => i === index ? { ...row, ...updates } : row);
    onChange(updated);
    if (realtimeSync && onAutoGenerateTree) {
      onAutoGenerateTree(updated);
    }
  };

  const handleRemoveRow = (index: number) => {
    if (!isEditable) return;
    const updated = worksheet.filter((_, i) => i !== index);
    onChange(updated);
    if (realtimeSync && onAutoGenerateTree) {
      onAutoGenerateTree(updated);
    }
  };

  const handleLoadSample = () => {
    if (!isEditable) return;
    onChange(SAMPLE_STANDARD_WORKSHEET);
    if (onAutoGenerateTree) {
      onAutoGenerateTree(SAMPLE_STANDARD_WORKSHEET);
    }
    setSuccessMessage('Sample standard worksheet loaded and Elimination Tree generated!');
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  const handleClearWorksheet = () => {
    if (!isEditable) return;
    onChange([]);
    if (onAutoGenerateTree) {
      onAutoGenerateTree([]);
    }
    setSuccessMessage('Standard worksheet cleared.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleTriggerAutoGenerate = () => {
    if (onAutoGenerateTree) {
      onAutoGenerateTree(worksheet);
      setSuccessMessage('⚡ Elimination Tree automatically generated from worksheet rows!');
      setTimeout(() => setSuccessMessage(''), 3500);
    }
  };

  const eliminatedCount = worksheet.filter(r => r.status === 'eliminated').length;
  const targetCount = worksheet.filter(r => r.status === 'target').length;
  const pendingCount = worksheet.filter(r => r.status === 'pending' || r.status === 'suspect').length;

  return (
    <div className="space-y-4 font-sans select-none text-slate-800" id="standard-worksheet-container">
      {/* Header & Control Bar */}
      <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-md">
                Standard Worksheet
              </span>
              <span className="text-xs font-mono text-slate-500 font-bold">
                Process Parameters &amp; Verification Matrix
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Standard Work Elements &amp; Elimination Inputs
            </h3>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Summary counters */}
          <div className="flex items-center space-x-1.5 text-xs font-mono font-bold bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-emerald-700 font-extrabold">{eliminatedCount} Eliminated ❌</span>
            <span className="text-slate-300">|</span>
            <span className="text-red-700 font-extrabold">{targetCount} Red X 🎯</span>
            <span className="text-slate-300">|</span>
            <span className="text-amber-700 font-extrabold">{pendingCount} Pending</span>
          </div>

          {isEditable && (
            <>
              <button
                type="button"
                onClick={handleAddRow}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-mono font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Element Row</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerAutoGenerate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold px-3.5 py-1.5 rounded-xl flex items-center space-x-1.5 transition cursor-pointer shadow-xs animate-pulse"
                title="Generate Elimination Tree from these worksheet rows"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Auto-Generate Tree ⚡</span>
              </button>

              <button
                type="button"
                onClick={handleLoadSample}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition cursor-pointer border border-slate-300"
                title="Load standard worksheet sample"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Load Sample</span>
              </button>

              {worksheet.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearWorksheet}
                  className="bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-mono font-bold px-2.5 py-1.5 rounded-xl transition cursor-pointer border border-slate-200"
                  title="Clear worksheet"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-mono font-bold p-3 rounded-xl flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Guide Banner */}
      <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-950 font-mono flex items-start gap-2.5">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            💡 <strong>How Standard Worksheet Drives the Elimination Tree:</strong>
          </p>
          <p className="text-slate-600">
            Fill the standard process operations, tolerances, and BOB (Good) vs WOW (Bad) observations. 
            Mark non-contributing rows as <strong>&quot;Eliminated ❌&quot;</strong> and the root cause element as <strong>&quot;Target Red X 🎯&quot;</strong>. 
            The system automatically constructs <strong>Stage 0 (ΔM Measurement)</strong>, <strong>Stage 1 (Process vs Parts)</strong>, and <strong>Stage 2 (Child Parts Swap Tree)</strong>.
          </p>
        </div>
      </div>

      {/* Standard Worksheet Table */}
      <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse">
            <thead className="bg-slate-900 text-white font-black text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-2.5 text-center w-14">Op #</th>
                <th className="p-2.5 text-left w-52">Work Element / Parameter</th>
                <th className="p-2.5 text-left w-36">Category</th>
                <th className="p-2.5 text-left w-48">Standard Spec / Tolerance</th>
                <th className="p-2.5 text-left w-44 bg-emerald-950/90 text-emerald-200">BOB Observed (Good)</th>
                <th className="p-2.5 text-left w-44 bg-rose-950/90 text-rose-200">WOW Observed (Bad)</th>
                <th className="p-2.5 text-center w-36">Verification Status</th>
                <th className="p-2.5 text-left">Findings / Elimination Rationale</th>
                {isEditable && <th className="p-2.5 text-center w-12 bg-slate-900">Act</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {worksheet.length === 0 ? (
                <tr>
                  <td colSpan={isEditable ? 9 : 8} className="p-8 text-center bg-slate-50/50">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 mx-auto flex items-center justify-center">
                        <Table className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold font-mono text-slate-600">
                        Standard Worksheet is currently blank.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Add rows to log process parameters and observations, or click &quot;Load Sample&quot; to test with high-pressure fuel pump data.
                      </p>
                      {isEditable && (
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleAddRow}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-mono font-bold px-3.5 py-1.5 rounded-xl inline-flex items-center space-x-1.5 transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add First Element</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleLoadSample}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-mono font-bold px-3.5 py-1.5 rounded-xl inline-flex items-center space-x-1.5 transition"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Load Sample</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                worksheet.map((row, idx) => (
                  <tr 
                    key={row.id || idx} 
                    className={`hover:bg-slate-50/80 transition ${
                      row.status === 'target' 
                        ? 'bg-rose-50/90 font-medium' 
                        : row.status === 'eliminated'
                        ? 'bg-slate-50/40'
                        : ''
                    }`}
                  >
                    {/* Step No */}
                    <td className="p-2.5 text-center font-bold text-slate-900 border-r border-slate-200 bg-slate-100/50">
                      {isEditable ? (
                        <input
                          type="text"
                          value={row.stepNo}
                          onChange={(e) => handleUpdateRow(idx, { stepNo: e.target.value })}
                          placeholder="OP 10"
                          className="w-full text-center bg-white border border-slate-300 rounded px-1 py-0.5 font-mono font-bold text-slate-900 text-xs"
                        />
                      ) : (
                        row.stepNo
                      )}
                    </td>

                    {/* Work Element Name */}
                    <td className="p-2.5 border-r border-slate-200">
                      {isEditable ? (
                        <input
                          type="text"
                          value={row.operationName}
                          onChange={(e) => handleUpdateRow(idx, { operationName: e.target.value })}
                          placeholder="Element / Parameter..."
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-bold text-slate-900 text-xs"
                        />
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          {row.status === 'target' && <Flame className="w-3.5 h-3.5 text-red-600 shrink-0 animate-pulse" />}
                          <span className="font-bold text-slate-900">{row.operationName}</span>
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="p-2.5 border-r border-slate-200">
                      {isEditable ? (
                        <select
                          value={row.category}
                          onChange={(e) => handleUpdateRow(idx, { category: e.target.value as any })}
                          className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs font-bold text-slate-800"
                        >
                          <option value="measurement">📐 Measurement (ΔM)</option>
                          <option value="assembly">🔧 Assembly Process</option>
                          <option value="component">🔩 Child Part</option>
                          <option value="parameter">⚙️ Machine Param</option>
                        </select>
                      ) : (
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          row.category === 'measurement' ? 'bg-blue-100 text-blue-800' :
                          row.category === 'assembly' ? 'bg-amber-100 text-amber-800' :
                          row.category === 'component' ? 'bg-purple-100 text-purple-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {row.category}
                        </span>
                      )}
                    </td>

                    {/* Standard Spec */}
                    <td className="p-2.5 border-r border-slate-200">
                      {isEditable ? (
                        <input
                          type="text"
                          value={row.standardSpec}
                          onChange={(e) => handleUpdateRow(idx, { standardSpec: e.target.value })}
                          placeholder="e.g. 25 ± 2 Nm / Spec"
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs"
                        />
                      ) : (
                        <span className="text-slate-700">{row.standardSpec || '—'}</span>
                      )}
                    </td>

                    {/* BOB Observed */}
                    <td className="p-2.5 border-r border-slate-200 bg-emerald-50/40">
                      {isEditable ? (
                        <input
                          type="text"
                          value={row.bobObserved}
                          onChange={(e) => handleUpdateRow(idx, { bobObserved: e.target.value })}
                          placeholder="e.g. 215 bar (Good)"
                          className="w-full bg-white border border-emerald-300 rounded px-2 py-1 text-emerald-800 font-bold text-xs"
                        />
                      ) : (
                        <span className="text-emerald-800 font-bold">{row.bobObserved || '—'}</span>
                      )}
                    </td>

                    {/* WOW Observed */}
                    <td className="p-2.5 border-r border-slate-200 bg-rose-50/40">
                      {isEditable ? (
                        <input
                          type="text"
                          value={row.wowObserved}
                          onChange={(e) => handleUpdateRow(idx, { wowObserved: e.target.value })}
                          placeholder="e.g. 142 bar (Bad)"
                          className="w-full bg-white border border-rose-300 rounded px-2 py-1 text-rose-800 font-bold text-xs"
                        />
                      ) : (
                        <span className="text-rose-800 font-bold">{row.wowObserved || '—'}</span>
                      )}
                    </td>

                    {/* Verification Status */}
                    <td className="p-2.5 text-center border-r border-slate-200">
                      {isEditable ? (
                        <select
                          value={row.status}
                          onChange={(e) => handleUpdateRow(idx, { status: e.target.value as any })}
                          className={`w-full border rounded px-2 py-1 text-xs font-black uppercase text-center ${
                            row.status === 'eliminated' ? 'bg-blue-100 text-blue-900 border-blue-400' :
                            row.status === 'target' ? 'bg-red-600 text-white border-red-700 animate-pulse' :
                            row.status === 'suspect' ? 'bg-amber-100 text-amber-900 border-amber-400' :
                            'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="eliminated">❌ Eliminated (OK)</option>
                          <option value="target">🎯 Red X Target</option>
                          <option value="suspect">🔍 Suspect</option>
                          <option value="pending">⏳ Pending</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          row.status === 'eliminated' ? 'bg-blue-100 text-blue-900' :
                          row.status === 'target' ? 'bg-red-600 text-white' :
                          row.status === 'suspect' ? 'bg-amber-100 text-amber-900' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {row.status === 'eliminated' ? '❌ Eliminated' :
                           row.status === 'target' ? '🎯 Red X' :
                           row.status === 'suspect' ? '🔍 Suspect' : '⏳ Pending'}
                        </span>
                      )}
                    </td>

                    {/* Findings & Notes */}
                    <td className="p-2.5">
                      {isEditable ? (
                        <input
                          type="text"
                          value={row.notes || ''}
                          onChange={(e) => handleUpdateRow(idx, { notes: e.target.value })}
                          placeholder="Evidence, measurement notes, elimination reason..."
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 text-xs"
                        />
                      ) : (
                        <span className="text-slate-600 text-[11px]">{row.notes || '—'}</span>
                      )}
                    </td>

                    {/* Act Delete */}
                    {isEditable && (
                      <td className="p-2 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="text-slate-400 hover:text-red-600 transition p-1 cursor-pointer"
                          title="Delete row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
