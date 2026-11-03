import React, { useState, useMemo } from 'react';
import { SafetyIncident } from '../types';
import { 
  ShieldAlert, 
  Plus, 
  CheckCircle, 
  Clock, 
  X, 
  AlertTriangle, 
  User, 
  Calendar, 
  FileText,
  BarChart3,
  Tv,
  PlusCircle,
  ClipboardList,
  Layers,
  Camera,
  Download,
  Filter,
  Activity,
  HardHat,
  Flame,
  CheckSquare
} from 'lucide-react';
import PresentationModeView, { SlideItem } from './common/PresentationModeView';
import { SfcModuleStandardDrillBoard, SfcStandardRecord } from './common/SfcPowerBiShared';

interface SafetyIncidentsProps {
  incidents: SafetyIncident[];
  onAddIncident: (data: Partial<SafetyIncident>) => void;
  onUpdateIncident: (id: string, data: Partial<SafetyIncident>) => void;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
  isSidebarHidden?: boolean;
  onToggleSidebar?: () => void;
}

export default function SafetyIncidents({
  incidents,
  onAddIncident,
  onUpdateIncident,
  initialAction,
  onClearInitialAction,
  isSidebarHidden,
  onToggleSidebar
}: SafetyIncidentsProps) {
  // Navigation tabs in exact standard sequence:
  // 1. Dashboard -> 2. Raise the Form -> 3. Master Tracker -> 4. Presentation Mode -> 5. Other
  const [activeTab, setActiveTab] = useState<'dashboard' | 'form' | 'tracker' | 'presentation' | 'other'>('dashboard');

  // Tracker Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Closed'>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [areaFilter, setAreaFilter] = useState<string>('All');

  // Selected incident for action/close
  const [selectedIncident, setSelectedIncident] = useState<SafetyIncident | null>(null);
  const [closureAction, setClosureAction] = useState('');

  // Form states (matching Kaizen / Red Flag structure)
  const [formType, setFormType] = useState<'Unsafe Act' | 'Unsafe Condition' | 'Near Miss' | 'Minor Injury'>('Near Miss');
  const [formArea, setFormArea] = useState('Assembly Line A (Pune)');
  const [formStation, setFormStation] = useState('Stn 04 - Torque Assembly');
  const [formSeverity, setFormSeverity] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [formDescription, setFormDescription] = useState('');
  const [formReportedBy, setFormReportedBy] = useState('');
  const [formImmediateAction, setFormImmediateAction] = useState('');
  const [formTargetDate, setFormTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPhoto, setFormPhoto] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialAction === 'report-hazard' || initialAction === 'form') {
      setActiveTab('form');
      if (onClearInitialAction) onClearInitialAction();
    } else if (initialAction === 'dashboard') {
      setActiveTab('dashboard');
      if (onClearInitialAction) onClearInitialAction();
    } else if (initialAction === 'tracker') {
      setActiveTab('tracker');
      if (onClearInitialAction) onClearInitialAction();
    } else if (initialAction === 'presentation') {
      setActiveTab('presentation');
      if (onClearInitialAction) onClearInitialAction();
    }
  }, [initialAction, onClearInitialAction]);

  const openCount = incidents.filter(i => i.status === 'Open').length;
  const closedCount = incidents.filter(i => i.status === 'Closed').length;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription || !formReportedBy) {
      alert("Please fill in Description and Reported By fields.");
      return;
    }
    onAddIncident({
      type: formType,
      area: `${formArea} - ${formStation}`,
      description: formDescription,
      reportedBy: formReportedBy,
      immediateAction: formImmediateAction,
      targetDate: formTargetDate,
      status: 'Open',
      incidentDate: new Date().toISOString().split('T')[0]
    });
    setFormDescription('');
    setFormReportedBy('');
    setFormImmediateAction('');
    setFormPhoto(null);
    setActiveTab('tracker');
  };

  const handleCloseIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    if (!closureAction) {
      alert("Please write the final action taken to close the hazard.");
      return;
    }
    onUpdateIncident(selectedIncident.id, {
      immediateAction: selectedIncident.immediateAction ? `${selectedIncident.immediateAction}. Closure: ${closureAction}` : closureAction,
      status: 'Closed',
      closedDate: new Date().toISOString().split('T')[0]
    });
    setSelectedIncident(null);
    setClosureAction('');
  };

  // Filtered List
  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch = !searchTerm || 
      inc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.reportedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.area.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' ? true : inc.status === statusFilter;
    const matchesType = typeFilter === 'All' ? true : inc.type === typeFilter;
    const matchesArea = areaFilter === 'All' ? true : inc.area.includes(areaFilter);
    return matchesSearch && matchesStatus && matchesType && matchesArea;
  });

  // Presentation Slides for Safety
  const presentationSlides: SlideItem[] = useMemo(() => [
    {
      id: 'safety-slide-kpi',
      title: 'EHS Safety & Zero Harm Live Scorecard',
      subtitle: 'Proactive Hazard Elimination & Near Miss Stewardship',
      badge: 'Zero Harm',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl p-6 text-center">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block">Safe Days Streak</span>
              <span className="text-4xl md:text-5xl font-black font-mono text-emerald-400 mt-2 block">142</span>
              <span className="text-xs text-emerald-500 mt-2 block">Zero Lost-Time Incidents</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest block">Near Misses Logged</span>
              <span className="text-4xl md:text-5xl font-black font-mono text-white mt-2 block">{incidents.length}</span>
              <span className="text-xs text-slate-500 mt-2 block">Proactively Mitigated</span>
            </div>
            <div className="bg-slate-900 border border-rose-900/50 rounded-2xl p-6 text-center">
              <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-widest block">Active Open Hazards</span>
              <span className="text-4xl md:text-5xl font-black font-mono text-rose-500 mt-2 block animate-pulse">{openCount}</span>
              <span className="text-xs text-rose-400/80 mt-2 block">Under Corrective Action</span>
            </div>
            <div className="bg-slate-900 border border-blue-900/50 rounded-2xl p-6 text-center">
              <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-widest block">Closure Rate</span>
              <span className="text-4xl md:text-5xl font-black font-mono text-blue-400 mt-2 block">
                {incidents.length > 0 ? Math.round((closedCount / incidents.length) * 100) : 100}%
              </span>
              <span className="text-xs text-blue-400/80 mt-2 block">EHS Verified Rectified</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Heinrich's Triangle Prevention
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  For every major accident, there are 300 unsafe acts and near-misses. Reporting early guarantees shopfloor safety.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'safety-slide-critical',
      title: 'Active Open Hazards & Containment Measures',
      subtitle: 'Immediate Actions Taken by Shopfloor Safety Stewards',
      badge: 'Action Register',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {incidents.filter(i => i.status === 'Open').slice(0, 4).map(inc => (
            <div key={inc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-mono font-bold text-amber-400">{inc.type}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {inc.status}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">{inc.description}</p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span className="text-slate-300">{inc.area}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reported By:</span>
                  <span className="text-slate-300">{inc.reportedBy}</span>
                </div>
                {inc.immediateAction && (
                  <div className="mt-2 text-emerald-400">
                    <span className="text-slate-500 block text-[9px] uppercase">Immediate Action:</span>
                    {inc.immediateAction}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )
    }
  ], [incidents, openCount, closedCount]);

  return (
    <div className="space-y-4 font-sans text-slate-900 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>🛡️ EHS Safety &amp; Near-Miss Desk</span>
            <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
              Zero Harm Plant
            </span>
          </h1>
          <div className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-2">
            <span>Streak: <strong className="text-emerald-700">142 Days Safe</strong></span>
            <span>·</span>
            <span>Active Open Hazards: <strong className={openCount > 0 ? "text-rose-600" : "text-slate-700"}>{openCount}</strong></span>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('form')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Report Safety Hazard</span>
        </button>
      </div>

      {/* Unified Top Navigation in EXACT sequence requested:
          1. Dashboard -> 2. Raise the Form -> 3. Master Tracker -> 4. Presentation Mode -> 5. Other */}
      <div className="flex items-center gap-1 border-b border-slate-200 pt-1 overflow-x-auto scrollbar-none">
        
        {/* 1. Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'dashboard'
              ? 'border-amber-600 text-amber-700 bg-amber-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
          <span>1. Dashboard (Zero Harm)</span>
        </button>

        {/* 2. Raise the Form */}
        <button
          onClick={() => setActiveTab('form')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'form'
              ? 'border-amber-600 text-amber-700 bg-amber-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>2. Raise Safety Form</span>
        </button>

        {/* 3. Master Tracker */}
        <button
          onClick={() => setActiveTab('tracker')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'tracker'
              ? 'border-slate-900 text-slate-900 bg-slate-50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5 text-slate-600" />
          <span>3. Master Tracker ({filteredIncidents.length})</span>
        </button>

        {/* 4. Presentation Mode */}
        <button
          onClick={() => setActiveTab('presentation')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'presentation'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tv className="w-3.5 h-3.5 text-indigo-500" />
          <span>4. Presentation Mode</span>
        </button>

        {/* 5. Other */}
        <button
          onClick={() => setActiveTab('other')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'other'
              ? 'border-blue-600 text-blue-700 bg-blue-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>5. Other / EHS Controls</span>
        </button>

      </div>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl text-center space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Zero Harm Streak</span>
              <span className="text-4xl font-black text-emerald-600 block">142 DAYS</span>
              <p className="text-[10px] text-slate-400 font-medium">Consecutive safe days</p>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl text-center space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Total Reports</span>
              <span className="text-4xl font-black text-slate-800 block font-mono">{incidents.length}</span>
              <p className="text-[10px] text-slate-400 font-medium">Proactive hazards</p>
            </div>
            <div className="bg-white border border-rose-200 p-5 rounded-2xl text-center space-y-1">
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest font-mono">🚨 Active Open</span>
              <span className={`text-4xl font-black block font-mono ${openCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-500'}`}>
                {openCount}
              </span>
              <p className="text-[10px] text-slate-400 font-medium">Requiring containment</p>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl text-center space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Resolution Rate</span>
              <span className="text-4xl font-black text-blue-600 block font-mono">
                {incidents.length > 0 ? Math.round((closedCount / incidents.length) * 100) : 100}%
              </span>
              <p className="text-[10px] text-slate-400 font-medium">Closed &amp; Verified</p>
            </div>
          </div>

          {/* Standard SFC Hierarchical Drill-Down & Pareto Engine */}
          <SfcModuleStandardDrillBoard
            moduleTitle="EHS Safety & Near-Miss Hierarchical Drill-Down"
            moduleSubtitle="Drill down from Plant Zone / Line → Workstation → Hazard Category → Reporting Steward"
            moduleBadge="EHS ZERO HARM ANALYTICS"
            accentColor="amber"
            level1Label="Shopfloor Line / Zone"
            level2Label="Station / Area"
            level3Label="Hazard Type"
            metricLabel="Logged Hazards"
            records={incidents.map((inc): SfcStandardRecord => {
              const parts = inc.area.split('-').map(s => s.trim());
              return {
                id: inc.id,
                code: `EHS-${inc.id}`,
                title: inc.description,
                level1: parts[0] || inc.area,
                level2: parts[1] || inc.area,
                level3: inc.type,
                owner: inc.reportedBy,
                status: inc.status === 'Closed' ? 'Completed' : 'Open',
                rawStatus: inc.status,
                period: inc.incidentDate,
                metricValue: 1
              };
            })}
          />

          {/* Pareto & Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Hazard Type Distribution
              </h3>
              <div className="space-y-3">
                {['Near Miss', 'Unsafe Condition', 'Unsafe Act', 'Minor Injury'].map(hType => {
                  const count = incidents.filter(i => i.type === hType).length;
                  const pct = incidents.length > 0 ? Math.round((count / incidents.length) * 100) : 0;
                  return (
                    <div key={hType} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">{hType}</span>
                        <span className="font-mono text-slate-500">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Departmental Safety Density
              </h3>
              <div className="space-y-2 text-xs font-mono">
                {[
                  { dept: 'Assembly Line A & B', count: incidents.filter(i => i.area.includes('Assembly')).length },
                  { dept: 'Paint Shop & Oven', count: incidents.filter(i => i.area.includes('Paint')).length },
                  { dept: 'Machining & Press', count: incidents.filter(i => i.area.includes('Machining') || i.area.includes('Press')).length },
                  { dept: 'Stores & Logistics', count: incidents.filter(i => i.area.includes('Store') || i.area.includes('Logistics')).length },
                ].map(d => (
                  <div key={d.dept} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-700 font-semibold">{d.dept}</span>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-bold">{d.count} hazards</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RAISE SAFETY FORM (MATCHING KAIZEN SHEET LOOK & FEEL) */}
      {activeTab === 'form' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <span>Proactive Safety Incident / Near-Miss Reporting Sheet</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Help preserve zero accidents. Document unsafe conditions or behaviors with immediate containment.
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hazard Category</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                >
                  <option value="Near Miss">Near Miss (No injury occurred)</option>
                  <option value="Unsafe Condition">Unsafe Condition (Equipment/Floor)</option>
                  <option value="Unsafe Act">Unsafe Act (Behavioral)</option>
                  <option value="Minor Injury">Minor Injury (First Aid)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Severity Level</label>
                <select
                  value={formSeverity}
                  onChange={(e) => setFormSeverity(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                >
                  <option value="Low">Low (Informational fix)</option>
                  <option value="Medium">Medium (Attention required within 24h)</option>
                  <option value="High">High (Immediate hazard / line stop)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Plant Area / Mini-Factory</label>
                <input
                  type="text"
                  value={formArea}
                  onChange={(e) => setFormArea(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Specific Workstation / Machine</label>
                <input
                  type="text"
                  value={formStation}
                  onChange={(e) => setFormStation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                  placeholder="e.g. Press Machine 02, Paint Booth 01"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reported By (Operator / Inspector Name)</label>
                <input
                  type="text"
                  value={formReportedBy}
                  onChange={(e) => setFormReportedBy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                  placeholder="Your Name / Employee Code"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Closure Date</label>
                <input
                  type="date"
                  value={formTargetDate}
                  onChange={(e) => setFormTargetDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hazard / Near-Miss Detailed Description</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:outline-none"
                placeholder="What exactly happened or was observed? What was the potential risk?"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Immediate Containment Action (What was done right away?)</label>
              <input
                type="text"
                value={formImmediateAction}
                onChange={(e) => setFormImmediateAction(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                placeholder="e.g. Warning cone placed, machine interlock tagged out, oil spill cleaned."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('tracker')}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider"
              >
                Submit Safety Report
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: MASTER TRACKER */}
      {activeTab === 'tracker' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search hazards or reporters..."
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs w-64 focus:outline-none"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
              >
                <option value="All">All Hazard Types</option>
                <option value="Near Miss">Near Miss</option>
                <option value="Unsafe Condition">Unsafe Condition</option>
                <option value="Unsafe Act">Unsafe Act</option>
                <option value="Minor Injury">Minor Injury</option>
              </select>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Showing {filteredIncidents.length} of {incidents.length}
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="divide-y divide-slate-100">
              {filteredIncidents.length === 0 ? (
                <p className="text-xs text-slate-400 font-mono py-12 text-center">No safety incidents match current filters.</p>
              ) : (
                filteredIncidents.map((inc) => (
                  <div 
                    key={inc.id} 
                    className="p-5 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono uppercase border ${
                          inc.type === 'Unsafe Act' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          inc.type === 'Unsafe Condition' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          inc.type === 'Near Miss' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-50 text-slate-700'
                        }`}>
                          {inc.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">📅 {inc.incidentDate} • {inc.area}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 leading-relaxed">{inc.description}</h4>
                      <p className="text-[10px] text-slate-400 font-medium font-mono">Reported by: 👤 {inc.reportedBy} • Target Closure: 📅 {inc.targetDate}</p>
                      {inc.immediateAction && (
                        <p className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-md inline-block">
                          ✓ Action: {inc.immediateAction}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className={`text-[10px] font-black font-mono px-2.5 py-1 rounded-full uppercase border ${
                        inc.status === 'Open' ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      }`}>
                        {inc.status}
                      </span>
                      {inc.status === 'Open' && (
                        <button
                          onClick={() => setSelectedIncident(inc)}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg font-mono uppercase cursor-pointer"
                        >
                          Resolve &amp; Close
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRESENTATION MODE */}
      {activeTab === 'presentation' && (
        <PresentationModeView
          moduleName="EHS Safety & Zero Harm Committee Desk"
          moduleIcon={<ShieldAlert className="w-5 h-5 text-amber-500" />}
          slides={presentationSlides}
          onExit={() => setActiveTab('tracker')}
          isSidebarHidden={isSidebarHidden}
          onToggleSidebar={onToggleSidebar}
        />
      )}

      {/* TAB 5: OTHER */}
      {activeTab === 'other' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>Plant EHS Controls &amp; Zero Harm Governance</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <HardHat className="w-6 h-6 text-amber-500" />
              <h3 className="text-xs font-bold text-slate-800 uppercase font-mono">Daily EHS Tool-Box Talks</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Mandatory 5-minute safety pledge conducted at shift start across all 4 production lines.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <CheckSquare className="w-6 h-6 text-emerald-500" />
              <h3 className="text-xs font-bold text-slate-800 uppercase font-mono">Interlock Safety Audits</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Monthly physical audit of optical curtains, emergency stop buttons, and guard interlocks.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <Activity className="w-6 h-6 text-rose-500" />
              <h3 className="text-xs font-bold text-slate-800 uppercase font-mono">Near-Miss Recognition</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Operators reporting the most impactful near-misses receive monthly recognition badges and awards.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RESOLVE MODAL */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between">
              <span className="text-xs font-black uppercase font-mono tracking-wider flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Verify Hazard Rectification</span>
              </span>
              <button onClick={() => setSelectedIncident(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseIncidentSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Hazard:</span>
                <p className="text-slate-600">{selectedIncident.description}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Corrective Action Implemented for Final Closure:
                </label>
                <textarea
                  value={closureAction}
                  onChange={(e) => setClosureAction(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:outline-none"
                  placeholder="Describe permanent engineering or administrative control implemented."
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedIncident(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Sign-off &amp; Close Hazard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
