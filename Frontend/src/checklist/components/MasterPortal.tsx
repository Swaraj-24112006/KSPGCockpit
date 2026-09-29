import React, { useState, useEffect, useRef } from 'react';
import {
  Minifactory,
  Station,
  MachineCheckpoint,
  PokayokeCheckpoint,
  MasterChecklistTemplate,
} from '../types';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Save,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  Camera,
  Eye,
  X,
  Factory,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Sliders,
  FileCheck,
  Info,
  Check,
  ExternalLink,
  Wrench,
  HelpCircle,
} from 'lucide-react';

interface MasterPortalProps {
  minifactories: Minifactory[];
  onPlantUpdate: (updatedMinifactories: Minifactory[]) => void;
  selectedMinifactoryId: string;
  onMinifactoryChange: (id: string) => void;
}

const BACKEND_URL = import.meta.env.VITE_CHECKLIST_API_URL || '/api/v1/checklist';

export const MasterPortal: React.FC<MasterPortalProps> = ({
  minifactories,
  onPlantUpdate,
  selectedMinifactoryId,
  onMinifactoryChange,
}) => {
  // Navigation & selection state
  const [selectedMfId, setSelectedMfId] = useState<string>(selectedMinifactoryId || minifactories[0]?.id || 'MF2');
  const currentMf = minifactories.find((m) => m.id === selectedMfId) || minifactories[0];
  const lines = currentMf?.lines || [];

  const [selectedLineId, setSelectedLineId] = useState<string>(lines[0]?.id || '');
  const currentLine = lines.find((l) => l.id === selectedLineId) || lines[0];
  const stations = currentLine?.stations || [];

  const [selectedStationId, setSelectedStationId] = useState<string>(stations[0]?.id || '');
  const activeStation = stations.find((s) => s.id === selectedStationId) || stations[0];

  // Editor tabs
  const [activeTab, setActiveTab] = useState<'machine' | 'pokayoke' | 'machine_settings'>('machine');

  // Active checklist working state
  const [machineCheckpoints, setMachineCheckpoints] = useState<MachineCheckpoint[]>([]);
  const [pokayokeCheckpoints, setPokayokeCheckpoints] = useState<PokayokeCheckpoint[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Modals
  const [showAddMachineModal, setShowAddMachineModal] = useState(false);
  const [newMachineForm, setNewMachineForm] = useState({
    number: '',
    name: '',
    minifactoryId: selectedMfId,
    lineId: selectedLineId || (lines[0]?.id || ''),
    lineName: currentLine?.name || '',
    operatorName: '',
    operatorId: '',
  });

  // Reference photo preview modal
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Uploading state tracking by checkpoint ID
  const [uploadingCheckpointId, setUploadingCheckpointId] = useState<string | null>(null);

  // File input ref for hidden upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{
    checkpointId: string;
    isPokayoke: boolean;
  } | null>(null);

  // Keep selectedMfId in sync with props
  useEffect(() => {
    if (selectedMinifactoryId) {
      setSelectedMfId(selectedMinifactoryId);
    }
  }, [selectedMinifactoryId]);

  // When selectedMfId changes, ensure line and station are valid
  useEffect(() => {
    if (lines.length > 0) {
      if (!lines.some((l) => l.id === selectedLineId)) {
        setSelectedLineId(lines[0].id);
      }
    }
  }, [selectedMfId, lines]);

  // When selectedLineId changes, ensure station is valid
  useEffect(() => {
    if (stations.length > 0) {
      if (!stations.some((s) => s.id === selectedStationId)) {
        setSelectedStationId(stations[0].id);
      }
    }
  }, [selectedLineId, stations]);

  // Fetch or load checklist template for selected station
  useEffect(() => {
    if (!activeStation) {
      setMachineCheckpoints([]);
      setPokayokeCheckpoints([]);
      return;
    }

    let isMounted = true;

    async function loadChecklist() {
      try {
        const res = await fetch(`${BACKEND_URL}/master/checklists/${activeStation.id}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.template) {
            setMachineCheckpoints(data.template.machineCheckpoints || []);
            setPokayokeCheckpoints(data.template.pokayokeCheckpoints || []);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not fetch remote checklist template, falling back to station state:', err);
      }

      // Fallback to activeStation's checkpoints
      if (isMounted) {
        setMachineCheckpoints(JSON.parse(JSON.stringify(activeStation.machineCheckpoints || [])));
        setPokayokeCheckpoints(JSON.parse(JSON.stringify(activeStation.pokayokeCheckpoints || [])));
      }
    }

    loadChecklist();

    return () => {
      isMounted = false;
    };
  }, [selectedStationId, activeStation?.id]);

  // Handle saving the full checklist to the backend
  const handleSaveChecklist = async () => {
    if (!activeStation) return;

    setIsSaving(true);
    setSaveStatus('idle');

    const templatePayload: MasterChecklistTemplate = {
      id: activeStation.id,
      stationId: activeStation.id,
      stationNumber: activeStation.number,
      stationName: activeStation.name,
      minifactoryId: currentMf.id,
      lineId: currentLine.id,
      machineCheckpoints,
      pokayokeCheckpoints,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Master Coordinator',
    };

    try {
      const res = await fetch(`${BACKEND_URL}/master/checklists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templatePayload),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      // Update in-memory plant structure
      const updatedMinifactories = minifactories.map((mf) => {
        if (mf.id === currentMf.id) {
          return {
            ...mf,
            lines: mf.lines.map((l) => {
              if (l.id === currentLine.id) {
                return {
                  ...l,
                  stations: l.stations.map((st) => {
                    if (st.id === activeStation.id) {
                      return {
                        ...st,
                        machineCheckpoints: JSON.parse(JSON.stringify(machineCheckpoints)),
                        pokayokeCheckpoints: JSON.parse(JSON.stringify(pokayokeCheckpoints)),
                      };
                    }
                    return st;
                  }),
                };
              }
              return l;
            }),
          };
        }
        return mf;
      });

      onPlantUpdate(updatedMinifactories);

      setSaveStatus('success');
      setSaveMessage(`Checklist for Station ${activeStation.number} successfully published to shopfloor.`);
      setTimeout(() => setSaveStatus('idle'), 4000);
    } catch (err: any) {
      console.error('Failed to save checklist:', err);
      setSaveStatus('error');
      setSaveMessage(err.message || 'Failed to connect to backend server.');
    } finally {
      setIsSaving(false);
    }
  };

  // Upload reference evidence photo to MinIO
  const triggerReferencePhotoUpload = (checkpointId: string, isPokayoke: boolean) => {
    setUploadTarget({ checkpointId, isPokayoke });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    // Read as Base64 data URL
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setUploadingCheckpointId(uploadTarget.checkpointId);

      try {
        const res = await fetch(`${BACKEND_URL}/master/upload-reference`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoDataUrl: dataUrl,
            stationId: activeStation?.id || 'general',
            checkpointId: uploadTarget.checkpointId,
            label: 'Reference Standard SOP',
          }),
        });

        if (!res.ok) {
          throw new Error('Upload to MinIO failed');
        }

        const data = await res.json();
        const minioUrl = data.url;

        // Update checkpoint state
        if (uploadTarget.isPokayoke) {
          setPokayokeCheckpoints((prev) =>
            prev.map((p) => (p.id === uploadTarget.checkpointId ? { ...p, referencePhotoUrl: minioUrl } : p))
          );
        } else {
          setMachineCheckpoints((prev) =>
            prev.map((m) => (m.id === uploadTarget.checkpointId ? { ...m, referencePhotoUrl: minioUrl } : m))
          );
        }
      } catch (err: any) {
        console.error('Photo upload failed:', err);
        alert(`Failed to upload reference photo to MinIO: ${err.message}`);
      } finally {
        setUploadingCheckpointId(null);
        setUploadTarget(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove reference photo
  const handleRemoveReferencePhoto = (checkpointId: string, isPokayoke: boolean) => {
    if (isPokayoke) {
      setPokayokeCheckpoints((prev) =>
        prev.map((p) => (p.id === checkpointId ? { ...p, referencePhotoUrl: undefined } : p))
      );
    } else {
      setMachineCheckpoints((prev) =>
        prev.map((m) => (m.id === checkpointId ? { ...m, referencePhotoUrl: undefined } : m))
      );
    }
  };

  // Machine Checkpoints Operations
  const handleAddMachineCheckpoint = () => {
    const nextSn = machineCheckpoints.length + 1;
    const newId = `m-${Date.now().toString(36)}`;
    const newCheckpoint: MachineCheckpoint = {
      id: newId,
      sn: nextSn,
      checkPoint: 'New inspection checkpoint',
      model: 'All Models',
      standard: 'Acceptance Criteria / Standard',
      freq: 'Per shift/ Setup',
      photoRequired: true,
      status: 'PENDING',
      photos: [],
    };
    setMachineCheckpoints((prev) => [...prev, newCheckpoint]);
  };

  const handleDeleteMachineCheckpoint = (id: string) => {
    setMachineCheckpoints((prev) =>
      prev
        .filter((c) => c.id !== id)
        .map((c, idx) => ({
          ...c,
          sn: idx + 1,
        }))
    );
  };

  const handleUpdateMachineCheckpoint = (id: string, field: keyof MachineCheckpoint, value: any) => {
    setMachineCheckpoints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // Pokayoke Checkpoints Operations
  const handleAddPokayokeCheckpoint = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nextLetter = letters[pokayokeCheckpoints.length % letters.length] || 'Z';
    const newId = `p-${Date.now().toString(36)}`;
    const newCheckpoint: PokayokeCheckpoint = {
      id: newId,
      sn: nextLetter,
      pokayoke: 'New Pokayoke sensor check',
      model: 'All Models',
      verifyMethod: 'Verification method / simulate error',
      freq: 'Per shift/ Setup',
      photoRequirementLabel: 'Yes',
      requiredPhotoCount: 1,
      status: 'PENDING',
      photos: [],
    };
    setPokayokeCheckpoints((prev) => [...prev, newCheckpoint]);
  };

  const handleDeletePokayokeCheckpoint = (id: string) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    setPokayokeCheckpoints((prev) =>
      prev
        .filter((c) => c.id !== id)
        .map((c, idx) => ({
          ...c,
          sn: letters[idx % letters.length] || `${idx + 1}`,
        }))
    );
  };

  const handleUpdatePokayokeCheckpoint = (id: string, field: keyof PokayokeCheckpoint, value: any) => {
    setPokayokeCheckpoints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // Create new machine/station
  const handleCreateNewMachine = async () => {
    if (!newMachineForm.number.trim() || !newMachineForm.name.trim()) {
      alert('Please provide both Machine Number and Machine Name.');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/master/machines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMachineForm),
      });

      if (!res.ok) {
        throw new Error('Failed to create machine on backend');
      }

      const data = await res.json();
      const createdStation: Station = data.station;

      // Update client state
      const updatedMinifactories = minifactories.map((mf) => {
        if (mf.id === newMachineForm.minifactoryId) {
          let lineExists = mf.lines.some((l) => l.id === newMachineForm.lineId);
          let updatedLines = mf.lines;

          if (!lineExists) {
            updatedLines = [
              ...updatedLines,
              {
                id: newMachineForm.lineId,
                minifactoryId: mf.id,
                name: newMachineForm.lineName || `Line ${newMachineForm.lineId}`,
                stations: [createdStation],
              },
            ];
          } else {
            updatedLines = updatedLines.map((l) => {
              if (l.id === newMachineForm.lineId) {
                return {
                  ...l,
                  stations: [...l.stations, createdStation],
                };
              }
              return l;
            });
          }

          return { ...mf, lines: updatedLines };
        }
        return mf;
      });

      onPlantUpdate(updatedMinifactories);
      setSelectedLineId(newMachineForm.lineId);
      setSelectedStationId(createdStation.id);
      setShowAddMachineModal(false);
      setNewMachineForm({
        number: '',
        name: '',
        minifactoryId: selectedMfId,
        lineId: selectedLineId || '',
        lineName: currentLine?.name || '',
        operatorName: '',
        operatorId: '',
      });
    } catch (err: any) {
      alert(`Error creating machine: ${err.message}`);
    }
  };

  // Delete machine
  const handleDeleteMachine = async (stationId: string) => {
    if (!window.confirm('Are you sure you want to delete this machine and its checklist?')) {
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/master/machines/${stationId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete machine on backend');
      }

      const updatedMinifactories = minifactories.map((mf) => ({
        ...mf,
        lines: mf.lines.map((l) => ({
          ...l,
          stations: l.stations.filter((s) => s.id !== stationId),
        })),
      }));

      onPlantUpdate(updatedMinifactories);

      // Select next station if available
      const remainingStations = stations.filter((s) => s.id !== stationId);
      if (remainingStations.length > 0) {
        setSelectedStationId(remainingStations[0].id);
      }
    } catch (err: any) {
      alert(`Error deleting machine: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hidden File Input for MinIO Reference Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {/* Top Banner: Master Portal Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-32 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold tracking-wide">
              <Wrench className="w-3.5 h-3.5 text-indigo-400" />
              <span>TPM SHOPFLOOR MASTER PORTAL</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Machine Checklist Configurator
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Assigned coordinator tool: Walk down to physical shopfloor machines, enter their specific TPM & Pokayoke
              checklists, and attach authentic visual standard evidence stored directly in MinIO.
            </p>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/80 rounded-2xl p-3 px-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Active Machine</div>
                <div className="text-sm font-bold text-white font-mono">
                  {activeStation ? `St. ${activeStation.number}` : 'None'}
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/80 rounded-2xl p-3 px-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-semibold">MinIO Evidence</div>
                <div className="text-sm font-bold text-white font-mono">
                  {machineCheckpoints.filter((c) => c.referencePhotoUrl).length +
                    pokayokeCheckpoints.filter((c) => c.referencePhotoUrl).length}{' '}
                  Standards
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Status Notification Banner */}
      {saveStatus === 'success' && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 flex items-center gap-3 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium">{saveMessage}</span>
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-sm font-medium">{saveMessage}</span>
        </div>
      )}

      {/* Main Grid: Machine Explorer (Left) & Checklist Editor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Machine & Plant Selector (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-base">Shopfloor Machines</h3>
              </div>
              <button
                onClick={() => {
                  setNewMachineForm({
                    number: '',
                    name: '',
                    minifactoryId: selectedMfId,
                    lineId: selectedLineId || '',
                    lineName: currentLine?.name || '',
                    operatorName: '',
                    operatorId: '',
                  });
                  setShowAddMachineModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Machine</span>
              </button>
            </div>

            {/* Minifactory Dropdown / Buttons */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Minifactory
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                {minifactories.map((mf) => (
                  <button
                    key={mf.id}
                    onClick={() => {
                      setSelectedMfId(mf.id);
                      onMinifactoryChange(mf.id);
                    }}
                    className={`py-2 px-2 text-xs font-bold rounded-xl transition-all ${
                      selectedMfId === mf.id
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {mf.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Selector */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Assembly / Machining Line
              </label>
              <select
                value={selectedLineId}
                onChange={(e) => setSelectedLineId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Machine List on Selected Line */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Machines on Line ({stations.length})</span>
                <span className="text-[11px] text-slate-400">Click to configure</span>
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {stations.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                    No machines created yet on this line. Click "+ Add Machine" above to add one.
                  </div>
                ) : (
                  stations.map((st) => {
                    const isSelected = selectedStationId === st.id;
                    const totalChecks = (st.machineCheckpoints?.length || 0) + (st.pokayokeCheckpoints?.length || 0);

                    return (
                      <div
                        key={st.id}
                        onClick={() => setSelectedStationId(st.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-300 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {st.number}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{st.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                              <span>{totalChecks} Checkpoints</span>
                              <span>•</span>
                              <span className="font-mono text-slate-600">{st.id}</span>
                            </div>
                          </div>
                        </div>

                        <ChevronRight
                          className={`w-4 h-4 shrink-0 transition-transform ${
                            isSelected ? 'text-indigo-600 translate-x-1' : 'text-slate-400'
                          }`}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Checklist Builder & Editor (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {activeStation ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-6">
              {/* Active Machine Header & Publish Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-mono font-extrabold">
                      Station {activeStation.number}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {currentMf.name.split('-')[0]} • {currentLine.name}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-1">{activeStation.name}</h3>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => handleDeleteMachine(activeStation.id)}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-rose-300 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete Machine"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleSaveChecklist}
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{isSaving ? 'Saving to MinIO...' : 'Publish Checklist'}</span>
                  </button>
                </div>
              </div>

              {/* Navigation Tabs between Machine Checks & Pokayoke Checks */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('machine')}
                  className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                    activeTab === 'machine'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Cpu className="w-4 h-4" />
                  <span>Machine Checkpoints ({machineCheckpoints.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('pokayoke')}
                  className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                    activeTab === 'pokayoke'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Pokayoke Mistake-Proofing ({pokayokeCheckpoints.length})</span>
                </button>
              </div>

              {/* Tab 1: Machine Checkpoints */}
              {activeTab === 'machine' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>
                        Enter what physical parameters operators must check at this machine. You can attach a standard
                        reference photo (e.g. gauge at 5 bar) stored in MinIO for them to compare against.
                      </span>
                    </div>
                    <button
                      onClick={handleAddMachineCheckpoint}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-1 shrink-0 transition-all shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Checkpoint</span>
                    </button>
                  </div>

                  {machineCheckpoints.length === 0 ? (
                    <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-3">
                      <Cpu className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-sm font-semibold text-slate-700">No machine checkpoints entered yet.</p>
                      <p className="text-xs text-slate-400">Click "+ Add Checkpoint" to define the first inspection item.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {machineCheckpoints.map((item, index) => (
                        <div
                          key={item.id}
                          className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 space-y-4 hover:border-slate-300 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-xl bg-slate-900 text-white text-xs font-mono font-bold flex items-center justify-center shrink-0">
                                {item.sn || index + 1}
                              </span>
                              <input
                                type="text"
                                value={item.checkPoint}
                                onChange={(e) => handleUpdateMachineCheckpoint(item.id, 'checkPoint', e.target.value)}
                                placeholder="Checkpoint name / item to verify..."
                                className="font-bold text-slate-900 text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white px-1.5 py-0.5 rounded transition-all focus:outline-none w-full sm:w-80"
                              />
                            </div>

                            <button
                              onClick={() => handleDeleteMachineCheckpoint(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Delete Checkpoint"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Row 2: Standard, Model & Frequency */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                                Standard / Acceptance Criteria
                              </label>
                              <input
                                type="text"
                                value={item.standard}
                                onChange={(e) => handleUpdateMachineCheckpoint(item.id, 'standard', e.target.value)}
                                placeholder="e.g. 4 - 6 bar / No dust"
                                className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                                Equipment Model
                              </label>
                              <input
                                type="text"
                                value={item.model}
                                onChange={(e) => handleUpdateMachineCheckpoint(item.id, 'model', e.target.value)}
                                placeholder="e.g. Panther WP VP"
                                className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Frequency</label>
                              <select
                                value={item.freq}
                                onChange={(e) => handleUpdateMachineCheckpoint(item.id, 'freq', e.target.value)}
                                className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="Per shift/ Setup">Per shift / Setup</option>
                                <option value="Per shift/ Setup (After 4 Hrs)">Per shift (After 4 Hrs)</option>
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Monthly">Monthly</option>
                              </select>
                            </div>
                          </div>

                          {/* Row 3: Evidence Options & Standard Photo Upload */}
                          <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.photoRequired}
                                  onChange={(e) =>
                                    handleUpdateMachineCheckpoint(item.id, 'photoRequired', e.target.checked)
                                  }
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>Operator Photo Required</span>
                              </label>
                            </div>

                            {/* Reference Evidence Upload via MinIO */}
                            <div className="flex items-center gap-2">
                              {item.referencePhotoUrl ? (
                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-[11px] font-bold text-emerald-700">Reference Photo Set</span>
                                  <button
                                    onClick={() => setPreviewPhotoUrl(item.referencePhotoUrl || null)}
                                    className="p-1 hover:text-emerald-900 transition-colors text-emerald-700"
                                    title="View Photo"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveReferencePhoto(item.id, false)}
                                    className="p-1 hover:text-rose-600 transition-colors text-slate-400"
                                    title="Remove Photo"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => triggerReferencePhotoUpload(item.id, false)}
                                  disabled={uploadingCheckpointId === item.id}
                                  className="px-3 py-1 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                                >
                                  {uploadingCheckpointId === item.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                                  ) : (
                                    <Upload className="w-3 h-3 text-indigo-600" />
                                  )}
                                  <span>
                                    {uploadingCheckpointId === item.id
                                      ? 'Uploading to MinIO...'
                                      : 'Attach Standard Reference Photo'}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Pokayoke Checkpoints */}
              {activeTab === 'pokayoke' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Configure Pokayoke (mistake-proofing) sensors, interlocks, and barcode rules for this machine.
                      </span>
                    </div>
                    <button
                      onClick={handleAddPokayokeCheckpoint}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-1 shrink-0 transition-all shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Pokayoke</span>
                    </button>
                  </div>

                  {pokayokeCheckpoints.length === 0 ? (
                    <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-3">
                      <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-sm font-semibold text-slate-700">No Pokayoke checkpoints configured yet.</p>
                      <p className="text-xs text-slate-400">Click "+ Add Pokayoke" to add error-proofing checks.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pokayokeCheckpoints.map((item, index) => (
                        <div
                          key={item.id}
                          className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 space-y-4 hover:border-slate-300 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white text-xs font-mono font-bold flex items-center justify-center shrink-0">
                                {item.sn}
                              </span>
                              <input
                                type="text"
                                value={item.pokayoke}
                                onChange={(e) => handleUpdatePokayokeCheckpoint(item.id, 'pokayoke', e.target.value)}
                                placeholder="Pokayoke sensor / interlock name..."
                                className="font-bold text-slate-900 text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white px-1.5 py-0.5 rounded transition-all focus:outline-none w-full sm:w-80"
                              />
                            </div>

                            <button
                              onClick={() => handleDeletePokayokeCheckpoint(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Delete Pokayoke"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Row 2: Verification Method, Model & Frequency */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                                Verification Method
                              </label>
                              <input
                                type="text"
                                value={item.verifyMethod}
                                onChange={(e) => handleUpdatePokayokeCheckpoint(item.id, 'verifyMethod', e.target.value)}
                                placeholder="e.g. Skip part loading"
                                className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Model Target</label>
                              <input
                                type="text"
                                value={item.model}
                                onChange={(e) => handleUpdatePokayokeCheckpoint(item.id, 'model', e.target.value)}
                                placeholder="e.g. Panther VP"
                                className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                                Photo Evidence Requirement
                              </label>
                              <select
                                value={item.requiredPhotoCount}
                                onChange={(e) => {
                                  const count = Number(e.target.value);
                                  handleUpdatePokayokeCheckpoint(item.id, 'requiredPhotoCount', count);
                                  handleUpdatePokayokeCheckpoint(
                                    item.id,
                                    'photoRequirementLabel',
                                    count === 2 ? 'Before and after photo' : count === 1 ? 'Yes' : 'None'
                                  );
                                }}
                                className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value={1}>1 Photo Required (Standard)</option>
                                <option value={2}>2 Photos Required (Before & After)</option>
                                <option value={0}>No Photo Required</option>
                              </select>
                            </div>
                          </div>

                          {/* Row 3: Standard Reference Photo for Pokayoke */}
                          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-end gap-2">
                            {item.referencePhotoUrl ? (
                              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-[11px] font-bold text-emerald-700">Reference SOP Attached</span>
                                <button
                                  onClick={() => setPreviewPhotoUrl(item.referencePhotoUrl || null)}
                                  className="p-1 hover:text-emerald-900 transition-colors text-emerald-700"
                                  title="View Photo"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRemoveReferencePhoto(item.id, true)}
                                  className="p-1 hover:text-rose-600 transition-colors text-slate-400"
                                  title="Remove Photo"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => triggerReferencePhotoUpload(item.id, true)}
                                disabled={uploadingCheckpointId === item.id}
                                className="px-3 py-1 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                              >
                                {uploadingCheckpointId === item.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                                ) : (
                                  <Upload className="w-3 h-3 text-indigo-600" />
                                )}
                                <span>
                                  {uploadingCheckpointId === item.id
                                    ? 'Uploading to MinIO...'
                                    : 'Attach Sensor Reference Photo'}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
              <Factory className="w-10 h-10 mx-auto text-slate-300" />
              <h4 className="text-base font-bold text-slate-700">Select a Machine to Edit its Checklist</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Choose a machine from the left panel or click "+ Add Machine" to create a new physical station.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add New Machine Modal */}
      {showAddMachineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Add New Shopfloor Machine</h3>
                  <p className="text-xs text-slate-500">Register physical machine to plant hierarchy</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMachineModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Minifactory</label>
                  <select
                    value={newMachineForm.minifactoryId}
                    onChange={(e) =>
                      setNewMachineForm((prev) => ({
                        ...prev,
                        minifactoryId: e.target.value,
                        lineId: minifactories.find((m) => m.id === e.target.value)?.lines[0]?.id || '',
                      }))
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  >
                    {minifactories.map((mf) => (
                      <option key={mf.id} value={mf.id}>
                        {mf.id} - {mf.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assembly Line</label>
                  <select
                    value={newMachineForm.lineId}
                    onChange={(e) => {
                      const l = minifactories
                        .find((m) => m.id === newMachineForm.minifactoryId)
                        ?.lines.find((x) => x.id === e.target.value);
                      setNewMachineForm((prev) => ({
                        ...prev,
                        lineId: e.target.value,
                        lineName: l?.name || '',
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  >
                    {minifactories
                      .find((m) => m.id === newMachineForm.minifactoryId)
                      ?.lines.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Machine / Station No. *</label>
                  <input
                    type="text"
                    value={newMachineForm.number}
                    onChange={(e) => setNewMachineForm((prev) => ({ ...prev, number: e.target.value }))}
                    placeholder="e.g. 140"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Machine / Station Name *</label>
                  <input
                    type="text"
                    value={newMachineForm.name}
                    onChange={(e) => setNewMachineForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Pneumatic Leakage & Pressure Test"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Operator Name (Optional)</label>
                  <input
                    type="text"
                    value={newMachineForm.operatorName}
                    onChange={(e) => setNewMachineForm((prev) => ({ ...prev, operatorName: e.target.value }))}
                    placeholder="e.g. Rajesh Patil"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Operator ID (Optional)</label>
                  <input
                    type="text"
                    value={newMachineForm.operatorId}
                    onChange={(e) => setNewMachineForm((prev) => ({ ...prev, operatorId: e.target.value }))}
                    placeholder="e.g. OP-8812"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowAddMachineModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewMachine}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
              >
                Create Machine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reference Photo Full View Modal */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-sm">Visual SOP Standard (Stored in MinIO)</h4>
              </div>
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 max-h-[70vh] flex items-center justify-center">
              <img
                src={previewPhotoUrl}
                alt="Reference SOP Standard"
                className="max-h-[65vh] w-auto object-contain"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="font-mono truncate max-w-xs">{previewPhotoUrl}</span>
              <a
                href={previewPhotoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                <span>Open in MinIO</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
