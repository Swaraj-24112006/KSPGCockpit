import React, { useState, useEffect, useMemo } from 'react';
import { authFetch } from '../../shared/utils/auth';
import { SafetyIncident, SafetyObservation, NearMissReport, AccidentReport, UserPersona } from '../types';
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
  Download,
  Filter,
  Activity,
  HardHat,
  Flame,
  CheckSquare,
  Eye,
  Stethoscope,
  ShieldCheck,
  Building,
  UserCheck,
  ChevronLeft,
  Target,
  Lock
} from 'lucide-react';
import PresentationModeView, { SlideItem } from './common/PresentationModeView';
import SafetyObservationSubmodule from './safety/SafetyObservationSubmodule';
import SafetyObservationForm from './safety/SafetyObservationForm';
import NearMissSubmodule from './safety/NearMissSubmodule';
import NearMissForm from './safety/NearMissForm';
import AccidentSubmodule from './safety/AccidentSubmodule';
import AccidentDoctorForm from './safety/AccidentDoctorForm';
import SafetyDashboardTab from './safety/SafetyDashboardTab';
import IncidentTimeline from './safety/IncidentTimeline';
import RiskAssessmentMatrix from './safety/RiskAssessmentMatrix';

export type SafetyViewType = 
  | 'dashboard' 
  | 'observations' 
  | 'raise-observation' 
  | 'nearmiss' 
  | 'raise-nearmiss' 
  | 'accidents' 
  | 'raise-accident' 
  | 'presentation'
  | 'timeline'
  | 'risk-matrix';

interface SafetyIncidentsProps {
  incidents: SafetyIncident[];
  onAddIncident: (data: Partial<SafetyIncident>) => void;
  onUpdateIncident: (id: string, data: Partial<SafetyIncident>) => void;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
  isSidebarHidden?: boolean;
  onToggleSidebar?: () => void;
  persona?: UserPersona;
  setPersona?: (p: UserPersona) => void;
  activeView?: SafetyViewType;
  setActiveView?: (view: SafetyViewType) => void;
}

export default function SafetyIncidents({
  incidents,
  onAddIncident,
  onUpdateIncident,
  initialAction,
  onClearInitialAction,
  isSidebarHidden,
  onToggleSidebar,
  persona = 'coordinator',
  setPersona,
  activeView: propActiveView,
  setActiveView: propSetActiveView
}: SafetyIncidentsProps) {
  const [internalActiveView, setInternalActiveView] = useState<SafetyViewType>('dashboard');
  const activeView = propActiveView !== undefined ? propActiveView : internalActiveView;
  const setActiveView = propSetActiveView || setInternalActiveView;
  const [observations, setObservations] = useState<SafetyObservation[]>([]);
  const [nearMisses, setNearMisses] = useState<NearMissReport[]>([]);
  const [accidents, setAccidents] = useState<AccidentReport[]>([]);
  const [isLoadingSubmodules, setIsLoadingSubmodules] = useState(true);

  const deriveRoleFromPersona = (p?: UserPersona): 'anyone' | 'coordinator' | 'doctor' => {
    if (p === 'operator') return 'anyone';
    if (p === 'doctor') return 'doctor';
    return 'coordinator';
  };

  const [activeRole, setActiveRole] = useState<'anyone' | 'coordinator' | 'doctor'>(() => deriveRoleFromPersona(persona));

  useEffect(() => {
    const mapped = deriveRoleFromPersona(persona);
    setActiveRole(mapped);
    if (mapped !== 'doctor' && activeView === 'raise-accident') {
      setActiveView('accidents');
    }
  }, [persona]);

  const handleSelectRole = (role: 'anyone' | 'coordinator' | 'doctor') => {
    setActiveRole(role);
    if (setPersona) {
      if (role === 'anyone') setPersona('operator');
      else if (role === 'doctor') setPersona('doctor');
      else setPersona('coordinator');
    }
    if (role !== 'doctor' && activeView === 'raise-accident') {
      setActiveView('accidents');
    }
  };

  // Fetch Submodules Data
  const fetchSafetySubmodules = async () => {
    try {
      setIsLoadingSubmodules(true);
      const [resObs, resNm, resAcc] = await Promise.all([
        authFetch('/api/safety/observations', {
          headers: { 'X-Persona-Role': activeRole }
        }),
        authFetch('/api/safety/nearmiss', {
          headers: { 'X-Persona-Role': activeRole }
        }),
        authFetch('/api/safety/accidents', {
          headers: { 'X-Persona-Role': activeRole }
        })
      ]);

      if (resObs.ok) {
        const dataObs = await resObs.json();
        if (dataObs.success) setObservations(dataObs.data || []);
      }

      if (resNm.ok) {
        const dataNm = await resNm.json();
        if (dataNm.success) setNearMisses(dataNm.data || []);
      }

      if (resAcc.ok) {
        const dataAcc = await resAcc.json();
        if (dataAcc.success) setAccidents(dataAcc.data || []);
      }
    } catch (err) {
      console.error('Error fetching safety submodules:', err);
    } finally {
      setIsLoadingSubmodules(false);
    }
  };

  useEffect(() => {
    fetchSafetySubmodules();
  }, []);

  // Handle Initial Quick Actions from Left Sidebar Submenu
  useEffect(() => {
    if (!initialAction) return;

    if (initialAction === 'dashboard') {
      setActiveView('dashboard');
    } else if (initialAction === 'observations' || initialAction === 'report-hazard') {
      setActiveView('observations');
    } else if (initialAction === 'raise-observation') {
      setActiveView('raise-observation');
    } else if (initialAction === 'nearmiss') {
      setActiveView('nearmiss');
    } else if (initialAction === 'raise-nearmiss') {
      setActiveView('raise-nearmiss');
    } else if (initialAction === 'accidents' || initialAction === 'investigation') {
      setActiveView('accidents');
    } else if (initialAction === 'raise-accident') {
      if (activeRole === 'doctor') {
        setActiveView('raise-accident');
      } else {
        setActiveView('accidents');
      }
    } else if (initialAction === 'presentation') {
      setActiveView('presentation');
    } else if (initialAction === 'timeline' || initialAction === 'incident-timeline') {
      setActiveView('timeline');
    } else if (initialAction === 'risk-matrix') {
      setActiveView('risk-matrix');
    }

    if (onClearInitialAction) onClearInitialAction();
  }, [initialAction, onClearInitialAction]);

  // Submodule 1 Handlers (Safety Observations)
  const handleAddObservation = async (data: Partial<SafetyObservation>) => {
    try {
      const res = await authFetch('/api/safety/observations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Persona-Role': activeRole
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to create safety observation (status: ${res.status})`);
      }
      const result = await res.json();
      if (result.success) {
        setObservations(prev => [result.data, ...prev]);
        setActiveView('observations');
      }
    } catch (err) {
      console.error('Error adding observation:', err);
      throw err;
    }
  };

  const handleUpdateObservation = async (id: string, data: Partial<SafetyObservation>) => {
    try {
      const res = await authFetch(`/api/safety/observations/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Persona-Role': activeRole
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to update safety observation (status: ${res.status})`);
      }
      const result = await res.json();
      if (result.success) {
        setObservations(prev => prev.map(o => o.id === id ? result.data : o));
      }
    } catch (err) {
      console.error('Error updating observation:', err);
      throw err;
    }
  };

  // Submodule 2 Handlers (Near Miss)
  const handleAddNearMiss = async (data: Partial<NearMissReport>) => {
    try {
      const res = await authFetch('/api/safety/nearmiss', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Persona-Role': activeRole
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to log near-miss incident (status: ${res.status})`);
      }
      const result = await res.json();
      if (result.success) {
        setNearMisses(prev => [result.data, ...prev]);
        setActiveView('nearmiss');
      }
    } catch (err) {
      console.error('Error adding near miss:', err);
      throw err;
    }
  };

  const handleUpdateNearMiss = async (id: string, data: Partial<NearMissReport>) => {
    try {
      const res = await authFetch(`/api/safety/nearmiss/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Persona-Role': activeRole
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to update near-miss incident (status: ${res.status})`);
      }
      const result = await res.json();
      if (result.success) {
        setNearMisses(prev => prev.map(nm => nm.id === id ? result.data : nm));
      }
    } catch (err) {
      console.error('Error updating near miss:', err);
      throw err;
    }
  };

  // Submodule 3 Handlers (Accident Reports)
  const handleAddAccident = async (data: Partial<AccidentReport>) => {
    try {
      const res = await authFetch('/api/safety/accidents', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Persona-Role': activeRole
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to record accident report (status: ${res.status})`);
      }
      const result = await res.json();
      if (result.success) {
        setAccidents(prev => [result.data, ...prev]);
        setActiveView('accidents');
      }
    } catch (err) {
      console.error('Error adding accident report:', err);
      throw err;
    }
  };

  const handleUpdateAccident = async (id: string, data: Partial<AccidentReport>) => {
    try {
      const res = await authFetch(`/api/safety/accidents/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Persona-Role': activeRole
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to update accident report (status: ${res.status})`);
      }
      const result = await res.json();
      if (result.success) {
        setAccidents(prev => prev.map(a => a.id === id ? result.data : a));
      }
    } catch (err) {
      console.error('Error updating accident report:', err);
      throw err;
    }
  };

  // Presentation Slides
  const presentationSlides: SlideItem[] = useMemo(() => [
    {
      id: 'safety-slide-kpi',
      title: 'EHS Safety & Zero Harm Live Scorecard',
      subtitle: 'Heinrich Pyramid & Integrated Proactive Stewardship',
      badge: 'Zero Harm',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl p-6 text-center">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block">Safe Days Streak</span>
              <span className="text-4xl md:text-5xl font-black font-mono text-emerald-400 mt-2 block">294</span>
              <span className="text-xs text-emerald-500 mt-2 block">Zero Lost-Time Incidents</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest block">Safety Observations</span>
              <span className="text-4xl md:text-5xl font-black font-mono text-white mt-2 block">{observations.length}</span>
              <span className="text-xs text-slate-500 mt-2 block">Stage 1 &amp; 2 Register</span>
            </div>
            <div className="bg-slate-900 border border-orange-900/50 rounded-2xl p-6 text-center">
              <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-widest block">Near Misses Mitigated</span>
              <span className="text-4xl md:text-5xl font-black font-mono text-orange-400 mt-2 block">{nearMisses.length}</span>
              <span className="text-xs text-orange-300/80 mt-2 block">Investigation &amp; CAPA</span>
            </div>
            <div className="bg-slate-900 border border-rose-900/50 rounded-2xl p-6 text-center">
              <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-widest block">Accident 5-Why Audits</span>
              <span className="text-4xl md:text-5xl font-black font-mono text-rose-400 mt-2 block">{accidents.length}</span>
              <span className="text-xs text-rose-300/80 mt-2 block">Doctor &amp; EHS Verified</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-start space-x-4">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                EHS 3-Submodule Integration Complete
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                1) Safety Observations (Initiator raises till Before Condition → Safety Coordinator assigns Category A/B/C and 5-Why CAPA).<br/>
                2) Near-Miss Incident Register (Initiator logs incident → Coordinator completes Cause Investigation* and Corrective Actions).<br/>
                3) KSPG/EHS Accident Reports (Raised by Doctor/Medical Officer → Coordinator performs 5-Why Root Cause Analysis in 'Describe Causes').
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'safety-slide-obs',
      title: 'Safety Observations (Attachment 1 Workflow)',
      subtitle: 'Employee Hazard Identification & Coordinator 5-Why Resolution',
      badge: 'Submodule 1',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {observations.slice(0, 4).map(obs => (
              <div key={obs.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-amber-400 font-bold">#{obs.srNo} · {obs.date} · Shift {obs.shift}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    obs.category === 'A' ? 'bg-red-500/20 text-red-400' :
                    obs.category === 'B' ? 'bg-amber-500/20 text-amber-400' :
                    obs.category === 'C' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {obs.category ? `Cat ${obs.category}` : 'Pending Cat'}
                  </span>
                </div>
                <div className="text-xs text-white font-medium">{obs.beforeCondition}</div>
                <div className="text-[11px] text-slate-400 font-mono">Station: {obs.station} | Minifactory: {obs.minifactory}</div>
                {obs.pca && (
                  <div className="text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded border border-emerald-900/50">
                    <strong>PCA:</strong> {obs.pca}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'safety-slide-nm',
      title: 'Near-Miss Incidents (Attachment 2 Workflow)',
      subtitle: 'Root Cause Investigations & Horizontal Deployment Across Lines',
      badge: 'Submodule 2',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nearMisses.slice(0, 4).map(nm => (
              <div key={nm.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-orange-400 font-bold">#{nm.srNo} · {nm.incidentDate} {nm.incidentTime}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 uppercase">
                    Type: {nm.incidentType}
                  </span>
                </div>
                <div className="text-xs text-white font-medium">{nm.briefDescription}</div>
                <div className="text-[11px] text-slate-400 font-mono">Location: {nm.exactLocation} | Dept: {nm.deptPlant}</div>
                {nm.correctiveActionRecommended && (
                  <div className="text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded border border-emerald-900/50">
                    <strong>Action:</strong> {nm.correctiveActionRecommended}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'safety-slide-acc',
      title: 'KSPG / EHS Accident 5-Why Reports (Attachment 3)',
      subtitle: 'Doctor Medical Assessment + Safety Coordinator Root Cause Breakdown',
      badge: 'Submodule 3',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accidents.slice(0, 4).map(acc => (
              <div key={acc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-rose-400 font-bold">{acc.recordNo} · {acc.department}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">
                    {acc.mandaysLost} Mandays Lost
                  </span>
                </div>
                <div className="text-xs text-white font-medium">{acc.briefDescription}</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Injured: {acc.nameOfInjured} ({acc.ticketNo}) | Doctor: {acc.medicalOfficerName}
                </div>
                {acc.rootCauseDescription && (
                  <div className="text-[11px] text-amber-300 bg-amber-950/40 p-2 rounded border border-amber-900/50">
                    <strong>5-Why Cause:</strong> {acc.rootCauseDescription}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    }
  ], [observations, nearMisses, accidents]);

  // Determine current active sub-header title
  const currentViewTitle = useMemo(() => {
    switch (activeView) {
      case 'dashboard':
        return { title: 'Safety Dashboard', badge: 'Safety Desk' };
      case 'observations':
        return { title: 'Safety Observation Register', badge: 'Submodule 01' };
      case 'raise-observation':
        return { title: 'Raise Safety Observation', badge: 'Submodule 01' };
      case 'nearmiss':
        return { title: 'Near Miss Register', badge: 'Submodule 02' };
      case 'raise-nearmiss':
        return { title: 'Raise Near Miss Incident', badge: 'Submodule 02' };
      case 'accidents':
        return { title: 'Accident Reports Register', badge: 'Submodule 03' };
      case 'raise-accident':
        return { title: 'Raise Accident Report (Doctor Only)', badge: 'Submodule 03' };
      case 'presentation':
        return { title: 'Presentation & Print', badge: 'Safety Desk' };
      case 'timeline':
        return { title: 'Incident Timeline', badge: 'Safety Desk' };
      case 'risk-matrix':
        return { title: 'Risk Assessment Matrix', badge: '5×5 Matrix' };
      default:
        return { title: 'Safety Desk', badge: 'EHS' };
    }
  }, [activeView]);

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider">
              {currentViewTitle.badge}
            </span>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              {currentViewTitle.title}
            </h1>
          </div>
        </div>

        {/* Action Controls / Role Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {(activeView === 'raise-observation' || activeView === 'raise-nearmiss' || activeView === 'raise-accident') && (
            <button
              onClick={() => {
                if (activeView === 'raise-observation') setActiveView('observations');
                else if (activeView === 'raise-nearmiss') setActiveView('nearmiss');
                else if (activeView === 'raise-accident') setActiveView('accidents');
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Register</span>
            </button>
          )}

          <button
            onClick={() => setActiveView(activeView === 'risk-matrix' ? 'dashboard' : 'risk-matrix')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              activeView === 'risk-matrix'
                ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Target className={`w-3.5 h-3.5 ${activeView === 'risk-matrix' ? 'text-white' : 'text-rose-600'}`} />
            <span>Risk Matrix</span>
          </button>

          <button
            onClick={() => setActiveView(activeView === 'timeline' ? 'dashboard' : 'timeline')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              activeView === 'timeline'
                ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${activeView === 'timeline' ? 'text-white' : 'text-amber-600'}`} />
            <span>Timeline</span>
          </button>

          {/* Role Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs border border-slate-200">
            <button
              onClick={() => handleSelectRole('anyone')}
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                activeRole === 'anyone' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👷 Operator
            </button>
            <button
              onClick={() => handleSelectRole('coordinator')}
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                activeRole === 'coordinator' ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🛡️ Coordinator
            </button>
            <button
              onClick={() => handleSelectRole('doctor')}
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                activeRole === 'doctor' ? 'bg-rose-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🩺 Doctor
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: DASHBOARD */}
      {activeView === 'dashboard' && (
        <SafetyDashboardTab
          observations={observations}
          nearMisses={nearMisses}
          accidents={accidents}
          onNavigateSubmodule={(tab) => {
            if (tab === 'observations') setActiveView('observations');
            else if (tab === 'nearmiss') setActiveView('nearmiss');
            else if (tab === 'accidents') setActiveView('accidents');
            else if (tab === 'timeline') setActiveView('timeline');
            else if (tab === 'risk-matrix') setActiveView('risk-matrix');
            else if (tab === 'dashboard') setActiveView('dashboard');
          }}
        />
      )}

      {/* VIEW 2: SUBMODULE 1 - SAFETY OBSERVATIONS REGISTER */}
      {activeView === 'observations' && (
        <SafetyObservationSubmodule
          observations={observations}
          onAddObservation={handleAddObservation}
          onUpdateObservation={handleUpdateObservation}
          isCoordinatorRole={activeRole === 'coordinator'}
          onNavigateRaise={() => setActiveView('raise-observation')}
        />
      )}

      {/* VIEW 3: SUBMODULE 1 - RAISE SAFETY OBSERVATION FORM */}
      {activeView === 'raise-observation' && (
        <SafetyObservationForm
          onAddObservation={handleAddObservation}
          onCancel={() => setActiveView('observations')}
          onSuccess={() => setActiveView('observations')}
        />
      )}

      {/* VIEW 4: SUBMODULE 2 - NEAR MISS REGISTER */}
      {activeView === 'nearmiss' && (
        <NearMissSubmodule
          nearMisses={nearMisses}
          onAddNearMiss={handleAddNearMiss}
          onUpdateNearMiss={handleUpdateNearMiss}
          isCoordinatorRole={activeRole === 'coordinator'}
          onNavigateRaise={() => setActiveView('raise-nearmiss')}
        />
      )}

      {/* VIEW 5: SUBMODULE 2 - RAISE NEAR MISS FORM */}
      {activeView === 'raise-nearmiss' && (
        <NearMissForm
          onAddNearMiss={handleAddNearMiss}
          onCancel={() => setActiveView('nearmiss')}
          onSuccess={() => setActiveView('nearmiss')}
        />
      )}

      {/* VIEW 6: SUBMODULE 3 - ACCIDENT REPORTS REGISTER */}
      {activeView === 'accidents' && (
        <AccidentSubmodule
          accidents={accidents}
          onAddAccident={handleAddAccident}
          onUpdateAccident={handleUpdateAccident}
          isCoordinatorRole={activeRole === 'coordinator'}
          isDoctorRole={activeRole === 'doctor'}
          onNavigateRaise={() => {
            if (activeRole === 'doctor') {
              setActiveView('raise-accident');
            }
          }}
        />
      )}

      {/* VIEW 7: SUBMODULE 3 - RAISE DOCTOR ACCIDENT REPORT FORM (STRICTLY DOCTOR ONLY) */}
      {activeView === 'raise-accident' && (
        activeRole === 'doctor' ? (
          <AccidentDoctorForm
            onAddAccident={handleAddAccident}
            onCancel={() => setActiveView('accidents')}
            onSuccess={() => setActiveView('accidents')}
          />
        ) : (
          <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center max-w-lg mx-auto my-8 space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Restricted to Medical Officer (Doctor)
            </h3>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setActiveView('accidents')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Back to Register
              </button>
              <button
                onClick={() => handleSelectRole('doctor')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Switch to Doctor Role
              </button>
            </div>
          </div>
        )
      )}

      {/* VIEW 8: PRESENTATION MODE */}
      {activeView === 'presentation' && (
        <PresentationModeView
          moduleName="EHS SAFETY EXECUTIVE BOARD"
          moduleIcon={<ShieldAlert className="w-5 h-5 text-amber-500" />}
          slides={presentationSlides}
          onExit={() => setActiveView('dashboard')}
        />
      )}

      {/* VIEW 9: INCIDENT PROGRESSION TIMELINE */}
      {activeView === 'timeline' && (
        <IncidentTimeline
          observations={observations}
          nearMisses={nearMisses}
          accidents={accidents}
          incidents={incidents}
          isCoordinatorRole={activeRole === 'coordinator'}
        />
      )}

      {/* VIEW 10: INTERACTIVE RISK ASSESSMENT MATRIX */}
      {activeView === 'risk-matrix' && (
        <RiskAssessmentMatrix
          observations={observations}
          nearMisses={nearMisses}
          accidents={accidents}
          incidents={incidents}
          onUpdateObservation={handleUpdateObservation}
          onUpdateNearMiss={handleUpdateNearMiss}
          onUpdateAccident={handleUpdateAccident}
          onUpdateIncident={onUpdateIncident}
          isCoordinatorRole={activeRole === 'coordinator'}
        />
      )}
    </div>
  );
}
