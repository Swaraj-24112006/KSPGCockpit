import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import PpsrSheetInspect from './components/PpsrSheetInspect';
import GlobalDashboardModule from './modules/GlobalDashboardModule';
import KaizenModule from './modules/KaizenModule';
import RedFlagModule from './modules/RedFlagModule';
import FiveSModule from './modules/FiveSModule';
import SafetyModule from './modules/SafetyModule';
import PpsrModule from './modules/PpsrModule';
import CftAwardsModule from './modules/CftAwardsModule';
import { Kaizen, UserPersona, RedFlag, FiveSAudit, FiveSRedTag, FiveSActionItem, FiveSSocLog, SafetyIncident, PpsrReport, PpsrMeetingLog, OpenImpactAction } from './types';
import { Eye, X, Award, Lightbulb, Check, FileText, CheckCircle, HelpCircle, Printer, LayoutDashboard, Flag, Sparkles, ShieldAlert, Compass, Menu, PanelLeftOpen } from 'lucide-react';
import { formatIndianRupees } from './utils';

export default function App() {
  const [persona, setPersona] = useState<UserPersona>('manager');
  
  // Presentation Mode: provision to hide left window (sidebar) for all modules
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const toggleSidebarHidden = () => setIsSidebarHidden(prev => !prev);
  
  // Top Level Navigation Module Switcher
  const [activeModule, setActiveModule] = useState<'global-dashboard' | 'kaizen' | 'redflag' | 'fives' | 'safety' | 'ppsr' | 'cft-awards'>('global-dashboard');
  
  // Kaizen internal tab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'form' | 'committee' | 'list' | 'cft-awards' | 'impact-tracker' | 'process-flowchart' | 'gamification' | 'presentation' | 'other'>('dashboard');

  // Mobile drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Master States
  const [kaizens, setKaizens] = useState<Kaizen[]>([]);
  const [redFlags, setRedFlags] = useState<RedFlag[]>([]);
  const [fiveSAudits, setFiveSAudits] = useState<FiveSAudit[]>([]);
  const [fiveSRedTags, setFiveSRedTags] = useState<FiveSRedTag[]>([]);
  const [fiveSActions, setFiveSActions] = useState<FiveSActionItem[]>([]);
  const [fiveSSocLogs, setFiveSSocLogs] = useState<FiveSSocLog[]>([]);
  const [safetyIncidents, setSafetyIncidents] = useState<SafetyIncident[]>([]);
  const [ppsrReports, setPpsrReports] = useState<PpsrReport[]>([]);
  const [ppsrMeetings, setPpsrMeetings] = useState<PpsrMeetingLog[]>([]);
  const [impactActions, setImpactActions] = useState<OpenImpactAction[]>([]);

  // Safe custom notification state to replace iframe-blocked alert() calls
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    // Intercept native alert calls and redirect them to beautiful toast notifications
    const originalAlert = window.alert;
    window.alert = (msg: string) => {
      console.log('Intercepted window.alert:', msg);
      const isErrorOrWarning = msg.toLowerCase().includes('error') || 
                               msg.toLowerCase().includes('fail') || 
                               msg.toLowerCase().includes('required') ||
                               msg.toLowerCase().includes('please');
      setToast({
        message: msg,
        type: isErrorOrWarning ? 'info' : 'success'
      });
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const [isLoading, setIsLoading] = useState(true);
  const [inspectKaizen, setInspectKaizen] = useState<Kaizen | null>(null);
  const [inspectPpsr, setInspectPpsr] = useState<PpsrReport | null>(null);

  // Submenu Quick triggers
  const [initialRedFlagAction, setInitialRedFlagAction] = useState<string | null>(null);
  const [initialFiveSAction, setInitialFiveSAction] = useState<string | null>(null);
  const [initialSafetyAction, setInitialSafetyAction] = useState<string | null>(null);
  const [initialPpsrAction, setInitialPpsrAction] = useState<string | null>(null);

  // Sync persona workflow
  const handleSetPersona = (newPersona: UserPersona) => {
    setPersona(newPersona);
    if (newPersona === 'operator') {
      setActiveModule('kaizen');
      setActiveTab('form');
    } else if (newPersona === 'committee') {
      setActiveModule('kaizen');
      setActiveTab('committee');
    } else {
      setActiveModule('global-dashboard');
    }
  };

  // Fetch all shopfloor modules data
  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch Kaizens
      const resK = await fetch('/api/kaizens');
      const dataK = await resK.json();
      if (dataK.success) setKaizens(dataK.data);

      // Fetch Redflags
      const resR = await fetch('/api/redflags');
      const dataR = await resR.json();
      if (dataR.success) {
        const flags = dataR.data?.results || dataR.data || [];
        setRedFlags(flags);
      }

      // Fetch 5S Audits
      const resF = await fetch('/api/fivesaudits');
      const dataF = await resF.json();
      if (dataF.success) setFiveSAudits(dataF.data);

      // Fetch 5S Red Tags
      const resRT = await fetch('/api/fives/redtags');
      const dataRT = await resRT.json();
      if (dataRT.success) setFiveSRedTags(dataRT.data);

      // Fetch 5S Action Items
      const resAct = await fetch('/api/fives/actions');
      const dataAct = await resAct.json();
      if (dataAct.success) setFiveSActions(dataAct.data);

      // Fetch 5S SOC Logs
      const resSoc = await fetch('/api/fives/soc');
      const dataSoc = await resSoc.json();
      if (dataSoc.success) setFiveSSocLogs(dataSoc.data);

      // Fetch Safety Incidents
      const resS = await fetch('/api/safetyincidents');
      const dataS = await resS.json();
      if (dataS.success) setSafetyIncidents(dataS.data);

      // Fetch PPSRs
      const resP = await fetch('/api/ppsrreports');
      const dataP = await resP.json();
      if (dataP.success) setPpsrReports(dataP.data);

      // Fetch PPSR Meetings
      const resM = await fetch('/api/ppsrmeetings');
      const dataM = await resM.json();
      if (dataM.success) setPpsrMeetings(dataM.data);

      // Fetch Open Impact Actions
      const resI = await fetch('/api/impactactions');
      const dataI = await resI.json();
      if (dataI.success) setImpactActions(dataI.data);

    } catch (err) {
      console.error('Error loading SFMS data from backend:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Post Kaizen
  const handleAddKaizen = async (newKaizen: Partial<Kaizen>) => {
    try {
      const res = await fetch('/api/kaizens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKaizen)
      });
      const data = await res.json();
      if (data.success) {
        setKaizens(prev => [data.data, ...prev]);
        setActiveTab('dashboard');
        alert('Your Kaizen Sheet was successfully logged in the system! It is now pending committee review.');
      }
    } catch (err) {
      console.error('Error adding Kaizen:', err);
      alert('Error saving Kaizen.');
    }
  };

  // Update Kaizen
  const handleUpdateKaizen = async (id: string, updatedFields: Partial<Kaizen>) => {
    try {
      const res = await fetch(`/api/kaizens/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      const data = await res.json();
      if (data.success) {
        setKaizens(prev => prev.map(k => k.id === id ? data.data : k));
        if (inspectKaizen?.id === id) setInspectKaizen(data.data);
      }
    } catch (err) {
      console.error('Error updating Kaizen:', err);
    }
  };

  // Red Flags
  const handleAddRedFlag = async (rfData: Partial<RedFlag>) => {
    try {
      const res = await fetch('/api/redflags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rfData)
      });
      const data = await res.json();
      if (data.success) {
        setRedFlags(prev => [data.data, ...prev]);
        alert(`Red Flag raised on shopfloor! Serial Number: ${data.data.redFlagNo}. Under responsible team: ${data.data.responsibleDepartment}`);
      }
    } catch (err) {
      console.error('Error raising Redflag:', err);
    }
  };

  const handleUpdateRedFlag = async (id: string, rfData: Partial<RedFlag>) => {
    try {
      const res = await fetch(`/api/redflags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rfData)
      });
      const data = await res.json();
      if (data.success) {
        setRedFlags(prev => prev.map(r => r.id === id ? data.data : r));
      }
    } catch (err) {
      console.error('Error updating Redflag:', err);
    }
  };

  const handleDeleteRedFlag = async (id: string) => {
    try {
      const res = await fetch(`/api/redflags/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setRedFlags(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error('Error deleting Redflag:', err);
    }
  };

  const handleEscalateRedFlagToPpsr = async (id: string) => {
    try {
      const res = await fetch(`/api/redflags/${id}/escalate-ppsr`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const rf = data.data?.redFlag || data.redFlag;
        const ppsr = data.data?.ppsr || data.ppsr;
        if (rf) setRedFlags(prev => prev.map(r => r.id === id ? rf : r));
        if (ppsr) setPpsrReports(prev => [ppsr, ...prev]);
        alert(`Red Flag escalated to 8D Practical Problem Solving Report: ${ppsr?.ppsrNo || rf?.linkedPpsrNo || id}`);
      }
    } catch (err) {
      console.error('Error escalating to PPSR:', err);
    }
  };

  const handleConvertRedFlagToKaizen = async (id: string) => {
    try {
      const res = await fetch(`/api/redflags/${id}/convert-kaizen`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const rf = data.data?.redFlag || data.redFlag;
        const kaizen = data.data?.kaizen || data.kaizen;
        if (rf) setRedFlags(prev => prev.map(r => r.id === id ? rf : r));
        if (kaizen) setKaizens(prev => [kaizen, ...prev]);
        alert(`Red Flag converted to Kaizen Poka-Yoke sheet: ${kaizen?.srNo || rf?.linkedKaizenNo || id}`);
      }
    } catch (err) {
      console.error('Error converting to Kaizen:', err);
    }
  };

  const handleLinkRedFlagToFiveS = async (id: string) => {
    try {
      const res = await fetch(`/api/redflags/${id}/link-fives`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const rf = data.data?.redFlag || data.redFlag;
        const redTag = data.data?.redTag || data.redTag;
        if (rf) setRedFlags(prev => prev.map(r => r.id === id ? rf : r));
        if (redTag) setFiveSRedTags(prev => [redTag, ...prev]);
        alert(`Red Flag material linked to 5S Red Tag Holding register: ${redTag?.tagNo || rf?.linkedFiveSRedTagNo || id}`);
      }
    } catch (err) {
      console.error('Error linking to 5S:', err);
    }
  };

  // 5S Audits CRUD
  const handleAddFiveSAudit = async (fsData: Partial<FiveSAudit>) => {
    try {
      const res = await fetch('/api/fivesaudits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fsData)
      });
      const data = await res.json();
      if (data.success) {
        setFiveSAudits(prev => [data.data, ...prev]);
        window.alert('5S Workplace Audit successfully recorded!');
      }
    } catch (err) {
      console.error('Error adding 5S Audit:', err);
    }
  };

  const handleUpdateFiveSAudit = async (id: string, updateData: Partial<FiveSAudit>) => {
    try {
      const res = await fetch(`/api/fivesaudits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      const data = await res.json();
      if (data.success) {
        setFiveSAudits(prev => prev.map(a => a.id === id ? data.data : a));
      }
    } catch (err) {
      console.error('Error updating 5S Audit:', err);
    }
  };

  const handleDeleteFiveSAudit = async (id: string) => {
    try {
      const res = await fetch(`/api/fivesaudits/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFiveSAudits(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('Error deleting 5S Audit:', err);
    }
  };

  // 5S Red Tags CRUD
  const handleAddRedTag = async (tagData: Partial<FiveSRedTag>) => {
    try {
      const res = await fetch('/api/fives/redtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData)
      });
      const data = await res.json();
      if (data.success) {
        setFiveSRedTags(prev => [data.data, ...prev]);
        window.alert(`Red Tag ${data.data.tagNo} registered in 1S Holding Area!`);
      }
    } catch (err) {
      console.error('Error adding Red Tag:', err);
    }
  };

  const handleUpdateRedTag = async (id: string, updateData: Partial<FiveSRedTag>) => {
    try {
      const res = await fetch(`/api/fives/redtags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      const data = await res.json();
      if (data.success) {
        setFiveSRedTags(prev => prev.map(t => t.id === id ? data.data : t));
        window.alert(`Red Tag ${data.data.tagNo} updated.`);
      }
    } catch (err) {
      console.error('Error updating Red Tag:', err);
    }
  };

  const handleDeleteRedTag = async (id: string) => {
    try {
      const res = await fetch(`/api/fives/redtags/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFiveSRedTags(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error('Error deleting Red Tag:', err);
    }
  };

  // 5S CAPA Action Items CRUD
  const handleAddActionItem = async (actData: Partial<FiveSActionItem>) => {
    try {
      const res = await fetch('/api/fives/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actData)
      });
      const data = await res.json();
      if (data.success) {
        setFiveSActions(prev => [data.data, ...prev]);
        window.alert('5S CAPA Action item created successfully!');
      }
    } catch (err) {
      console.error('Error adding action item:', err);
    }
  };

  const handleUpdateActionItem = async (id: string, updateData: Partial<FiveSActionItem>) => {
    try {
      const res = await fetch(`/api/fives/actions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      const data = await res.json();
      if (data.success) {
        setFiveSActions(prev => prev.map(a => a.id === id ? data.data : a));
      }
    } catch (err) {
      console.error('Error updating action item:', err);
    }
  };

  const handleDeleteActionItem = async (id: string) => {
    try {
      const res = await fetch(`/api/fives/actions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFiveSActions(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('Error deleting action item:', err);
    }
  };

  // 5S Source of Contamination (SOC) CRUD
  const handleAddSocLog = async (socData: Partial<FiveSSocLog>) => {
    try {
      const res = await fetch('/api/fives/soc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(socData)
      });
      const data = await res.json();
      if (data.success) {
        setFiveSSocLogs(prev => [data.data, ...prev]);
        window.alert('Source of Contamination logged!');
      }
    } catch (err) {
      console.error('Error adding SOC log:', err);
    }
  };

  const handleUpdateSocLog = async (id: string, updateData: Partial<FiveSSocLog>) => {
    try {
      const res = await fetch(`/api/fives/soc/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      const data = await res.json();
      if (data.success) {
        setFiveSSocLogs(prev => prev.map(s => s.id === id ? data.data : s));
      }
    } catch (err) {
      console.error('Error updating SOC log:', err);
    }
  };

  const handleDeleteSocLog = async (id: string) => {
    try {
      const res = await fetch(`/api/fives/soc/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFiveSSocLogs(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Error deleting SOC log:', err);
    }
  };

  // Safety Incidents
  const handleAddSafetyIncident = async (sfData: Partial<SafetyIncident>) => {
    try {
      const res = await fetch('/api/safetyincidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sfData)
      });
      const data = await res.json();
      if (data.success) {
        setSafetyIncidents(prev => [data.data, ...prev]);
      }
    } catch (err) {
      console.error('Error adding Safety Incident:', err);
    }
  };

  const handleUpdateSafetyIncident = async (id: string, sfData: Partial<SafetyIncident>) => {
    try {
      const res = await fetch(`/api/safetyincidents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sfData)
      });
      const data = await res.json();
      if (data.success) {
        setSafetyIncidents(prev => prev.map(s => s.id === id ? data.data : s));
      }
    } catch (err) {
      console.error('Error updating Safety incident:', err);
    }
  };

  // PPSR Problem solver
  const handleAddPpsrReport = async (ppsrData: Partial<PpsrReport>) => {
    try {
      const res = await fetch('/api/ppsrreports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ppsrData)
      });
      const data = await res.json();
      if (data.success) {
        setPpsrReports(prev => [data.data, ...prev]);
      }
    } catch (err) {
      console.error('Error adding PPSR:', err);
    }
  };

  const handleUpdatePpsrReport = async (id: string, ppsrData: Partial<PpsrReport>) => {
    try {
      const res = await fetch(`/api/ppsrreports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ppsrData)
      });
      const data = await res.json();
      if (data.success) {
        setPpsrReports(prev => prev.map(p => p.id === id ? data.data : p));
      }
    } catch (err) {
      console.error('Error updating PPSR:', err);
    }
  };

  const handleAddPpsrMeeting = async (mtgData: Partial<PpsrMeetingLog>) => {
    try {
      const res = await fetch('/api/ppsrmeetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mtgData)
      });
      const data = await res.json();
      if (data.success) {
        setPpsrMeetings(prev => [data.data, ...prev]);
      }
    } catch (err) {
      console.error('Error adding PPSR meeting:', err);
    }
  };

  // Open Impact Action handlers
  const handleAddImpactAction = async (actData: Partial<OpenImpactAction>) => {
    try {
      const res = await fetch('/api/impactactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actData)
      });
      const data = await res.json();
      if (data.success) {
        setImpactActions(prev => [data.data, ...prev]);
      }
    } catch (err) {
      console.error('Error adding Impact Action:', err);
    }
  };

  const handleUpdateImpactAction = async (id: string, updates: Partial<OpenImpactAction>) => {
    try {
      const res = await fetch(`/api/impactactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        setImpactActions(prev => prev.map(a => a.id === id ? data.data : a));
      }
    } catch (err) {
      console.error('Error updating Impact Action:', err);
    }
  };

  const handleDeleteImpactAction = async (id: string) => {
    try {
      const res = await fetch(`/api/impactactions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setImpactActions(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('Error deleting Impact Action:', err);
    }
  };

  const openRedflagsCount = redFlags.filter(r => r.status === 'Open' || r.status === 'In-Progress').length;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800 relative">
      
      {/* Floating button to restore Left Window (Sidebar) when hidden */}
      {isSidebarHidden && (
        <button
          type="button"
          onClick={() => setIsSidebarHidden(false)}
          className="fixed top-3 left-3 z-50 bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold font-mono shadow-2xl flex items-center space-x-2 transition cursor-pointer backdrop-blur-md animate-fade-in"
          title="Show Left Navigation Window (Exit Fullscreen)"
        >
          <PanelLeftOpen className="w-4 h-4 text-emerald-400" />
          <span>Show Left Window</span>
        </button>
      )}

      {/* Left Panel Sidebar */}
      <Sidebar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        persona={persona}
        setPersona={handleSetPersona}
        openRedflagsCount={openRedflagsCount}
        setInitialRedFlagAction={setInitialRedFlagAction}
        setInitialFiveSAction={setInitialFiveSAction}
        setInitialSafetyAction={setInitialSafetyAction}
        setInitialPpsrAction={setInitialPpsrAction}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        isSidebarHidden={isSidebarHidden}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Mobile menu toggle button for small screens */}
        {!isMobileSidebarOpen && !isSidebarHidden && (
          <div className="md:hidden p-3 print:hidden shrink-0 flex items-center justify-between bg-slate-900 text-white">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold font-mono"
            >
              <Menu className="w-4 h-4" />
              <span>SFMS MENU</span>
            </button>
            <span className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider">
              SHOPFLOOR MS
            </span>
          </div>
        )}

        {/* Main Body content renderer */}
        <main className="flex-1 pb-16 print:hidden">
          {isLoading ? (
            <div className="max-w-md mx-auto text-center py-24 space-y-4">
              <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-500 font-mono uppercase tracking-widest">CONNECTING SFMS TERMINAL...</p>
            </div>
          ) : (
            <div className="animate-fade-in">
            
            {/* Executive Dashboard Module */}
            {activeModule === 'global-dashboard' && (
              <GlobalDashboardModule
                kaizens={kaizens}
                redFlags={redFlags}
                fiveSAudits={fiveSAudits}
                safetyIncidents={safetyIncidents}
                ppsrReports={ppsrReports}
                onNavigateToModule={(mod, subAction) => {
                  setActiveModule(mod);
                  if (mod === 'kaizen') {
                    if (subAction) {
                      setActiveTab(subAction as any);
                    } else {
                      setActiveTab('dashboard');
                    }
                  } else if (mod === 'redflag') {
                    if (subAction) {
                      setInitialRedFlagAction(subAction);
                    }
                  } else if (mod === 'fives') {
                    if (subAction) {
                      setInitialFiveSAction(subAction);
                    }
                  } else if (mod === 'safety') {
                    if (subAction) {
                      setInitialSafetyAction(subAction);
                    }
                  } else if (mod === 'ppsr') {
                    if (subAction) {
                      setInitialPpsrAction(subAction);
                    }
                  }
                }}
              />
            )}

            {/* 1. Complete 5S Lean Workplace Management Module */}
            {activeModule === 'fives' && (
              <FiveSModule
                audits={fiveSAudits}
                redTags={fiveSRedTags}
                actionItems={fiveSActions}
                socLogs={fiveSSocLogs}
                kaizens={kaizens}
                onAddAudit={handleAddFiveSAudit}
                onUpdateAudit={handleUpdateFiveSAudit}
                onDeleteAudit={handleDeleteFiveSAudit}
                onAddRedTag={handleAddRedTag}
                onUpdateRedTag={handleUpdateRedTag}
                onDeleteRedTag={handleDeleteRedTag}
                onAddActionItem={handleAddActionItem}
                onUpdateActionItem={handleUpdateActionItem}
                onDeleteActionItem={handleDeleteActionItem}
                onAddSocLog={handleAddSocLog}
                onUpdateSocLog={handleUpdateSocLog}
                onDeleteSocLog={handleDeleteSocLog}
                onAddKaizen={handleAddKaizen}
                initialAction={initialFiveSAction}
                onClearInitialAction={() => setInitialFiveSAction(null)}
                currentPersona={persona}
                isSidebarHidden={isSidebarHidden}
                onToggleSidebar={toggleSidebarHidden}
              />
            )}

            {/* 2. Safety Tracker Module */}
            {activeModule === 'safety' && (
              <SafetyModule
                incidents={safetyIncidents}
                onAddIncident={handleAddSafetyIncident}
                onUpdateIncident={handleUpdateSafetyIncident}
                initialAction={initialSafetyAction}
                onClearInitialAction={() => setInitialSafetyAction(null)}
                isSidebarHidden={isSidebarHidden}
                onToggleSidebar={toggleSidebarHidden}
              />
            )}

            {/* 3. Red Flag Quality Portal Module */}
            {activeModule === 'redflag' && (
              <RedFlagModule
                redFlags={redFlags}
                onAddRedFlag={handleAddRedFlag}
                onUpdateRedFlag={handleUpdateRedFlag}
                onDeleteRedFlag={handleDeleteRedFlag}
                onEscalateToPpsr={handleEscalateRedFlagToPpsr}
                onConvertToKaizen={handleConvertRedFlagToKaizen}
                onLinkToFiveS={handleLinkRedFlagToFiveS}
                currentPersona={persona}
                initialAction={initialRedFlagAction}
                onClearInitialAction={() => setInitialRedFlagAction(null)}
                onNavigateToModule={(mod) => setActiveModule(mod as any)}
                isSidebarHidden={isSidebarHidden}
                onToggleSidebar={toggleSidebarHidden}
              />
            )}

            {/* 4. PPSR Root Cause Problem Solver Module */}
            {activeModule === 'ppsr' && (
              <PpsrModule
                reports={ppsrReports}
                kaizens={kaizens}
                onAddReport={handleAddPpsrReport}
                onUpdateReport={handleUpdatePpsrReport}
                onUpdateKaizen={handleUpdateKaizen}
                initialAction={initialPpsrAction}
                onClearInitialAction={() => setInitialPpsrAction(null)}
                onInspectReport={(report) => setInspectPpsr(report)}
                meetings={ppsrMeetings}
                onAddMeeting={handleAddPpsrMeeting}
                isSidebarHidden={isSidebarHidden}
                onToggleSidebar={toggleSidebarHidden}
              />
            )}

            {/* 5. Kaizen Continuous Improvement Module */}
            {activeModule === 'kaizen' && (
              <KaizenModule
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                kaizens={kaizens}
                ppsrReports={ppsrReports}
                impactActions={impactActions}
                onAddKaizen={handleAddKaizen}
                onUpdateKaizen={handleUpdateKaizen}
                onAddImpactAction={handleAddImpactAction}
                onUpdateImpactAction={handleUpdateImpactAction}
                onDeleteImpactAction={handleDeleteImpactAction}
                onUpdatePpsrReport={handleUpdatePpsrReport}
                onSelectKaizen={setInspectKaizen}
                handleSetPersona={handleSetPersona}
                isSidebarHidden={isSidebarHidden}
                onToggleSidebar={toggleSidebarHidden}
              />
            )}

            {/* CFT Monthly Best Awards Module */}
            {activeModule === 'cft-awards' && (
              <CftAwardsModule
                kaizens={kaizens}
                ppsrReports={ppsrReports}
                onUpdateKaizen={handleUpdateKaizen}
                onUpdatePpsrReport={handleUpdatePpsrReport}
              />
            )}

          </div>
        )}
      </main>

      {/* SHEET INSPECT OVERLAY MODAL (Attachment 1 Paper Layout Replication) */}
      {inspectKaizen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden print:absolute print:inset-0 print:bg-white print:p-0 print:m-0 print:overflow-visible">
          <div className="bg-white rounded-2xl w-[96vw] max-w-[96vw] h-[94vh] max-h-[94vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col print:border-none print:shadow-none print:rounded-none print:max-h-none print:max-w-none print:w-full print:m-0 print:p-0 print:overflow-visible">
            
            {/* Modal Header Controls */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0 print:hidden">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span className="font-mono text-xs font-bold text-slate-300">INSPECT KAIZEN SHEET REGISTER • ID: {inspectKaizen.srNo}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                  title="Print Kaizen Sheet"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print to PDF</span>
                </button>
                <button
                  onClick={() => setInspectKaizen(null)}
                  className="text-slate-400 hover:text-white transition p-1.5 bg-slate-800 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Sheet */}
            <div className="p-6 overflow-y-auto bg-slate-100/50 space-y-6 print:p-0 print:bg-white print:overflow-visible print:space-y-8">
              
              {/* Paper Layout Card */}
              <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden text-slate-800 font-sans print:border print:border-slate-400 print:rounded-none print:shadow-none">
                
                {/* 1. Header Banner */}
                <div className="border-b border-slate-300 text-center py-5 px-4 bg-white">
                  <h1 className="text-2xl font-black tracking-wider text-slate-900 uppercase font-mono">
                    KAIZEN SHEET
                  </h1>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mt-1">
                    (Continuous Improvement Protocol Form)
                  </p>
                </div>

                {/* 2. Paper Meta Table */}
                <div className="grid grid-cols-1 md:grid-cols-4 border-b border-slate-300 text-xs font-mono">
                  <div className="border-r border-b md:border-b-0 border-slate-300 p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Created By (Idea By)</span>
                    <span className="font-bold text-slate-800">{inspectKaizen.ideaBy}</span>
                  </div>
                  <div className="border-r border-b md:border-b-0 border-slate-300 p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Approved By Sign-off</span>
                    <span className="font-bold text-slate-800">{inspectKaizen.approvedBy || "NOT APPROVED YET"}</span>
                  </div>
                  <div className="border-r border-slate-300 p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Document ID</span>
                    <span className="font-black text-slate-900 text-sm">{inspectKaizen.srNo}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Version - Status</span>
                    <span className={`font-black uppercase text-xs ${inspectKaizen.status === 'Pending' ? 'text-amber-600' : 'text-emerald-600'}`}>
                      V1.0 - {inspectKaizen.status}
                    </span>
                  </div>
                </div>

                {/* 3. Problem Before vs Counter Measure After */}
                <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-300 divide-y md:divide-y-0 md:divide-x divide-slate-300">
                  
                  {/* Left: Problem Before */}
                  <div className="md:col-span-5 p-5 space-y-3">
                    <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider border-b border-red-100 pb-1 font-mono">
                      Problem / Before Status :
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                      {inspectKaizen.problemBefore}
                    </p>
                  </div>

                  {/* Middle: Countermeasure */}
                  <div className="md:col-span-4 p-5 space-y-3 bg-slate-50/20">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider border-b border-emerald-100 pb-1 font-mono">
                      Counter Measure / After Improvement :
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                      {inspectKaizen.counterMeasureAfter}
                    </p>
                  </div>

                  {/* Right: Area Meta */}
                  <div className="md:col-span-3 p-4 bg-slate-50 font-mono text-[10px] space-y-2.5">
                    <h4 className="text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200 pb-1">
                      Area of Implementation:
                    </h4>
                    <div>
                      <span className="text-slate-400 uppercase font-black block">Minifactory:</span>
                      <span className="text-slate-900 font-bold text-[11px]">{inspectKaizen.minifactory}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-black block">Location:</span>
                      <span className="text-slate-800 font-bold">{inspectKaizen.location}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-black block">Machine/Station:</span>
                      <span className="text-slate-800 font-bold">{inspectKaizen.machine}</span>
                    </div>
                  </div>

                </div>

                {/* 4. Photos row */}
                <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-300 divide-y md:divide-y-0 md:divide-x divide-slate-300">
                  
                  {/* Before Photo */}
                  <div className="md:col-span-5 p-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase font-mono mb-2">Photos: BEFORE</h4>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl aspect-video p-1 flex items-center justify-center overflow-hidden">
                      <img
                        src={inspectKaizen.photoBefore}
                        alt="Before"
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  {/* After Photo */}
                  <div className="md:col-span-4 p-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase font-mono mb-2">Photos: AFTER</h4>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl aspect-video p-1 flex items-center justify-center overflow-hidden">
                      <img
                        src={inspectKaizen.photoAfter}
                        alt="After"
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  {/* Benefits checklist PQCDSM */}
                  <div className="md:col-span-3 p-4 bg-slate-50 font-mono flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200 pb-1 mb-3">Benefits Matrix :</h4>
                      <div className="grid grid-cols-6 gap-1 text-center font-bold">
                        {['p', 'q', 'c', 'd', 's', 'm'].map(key => {
                          const active = inspectKaizen.benefits?.[key as keyof typeof inspectKaizen.benefits];
                          return (
                            <div key={key}>
                              <div className="text-[9px] uppercase text-slate-400">{key}</div>
                              <div className={`mt-0.5 border text-xs py-0.5 rounded-sm font-black ${
                                active
                                  ? 'bg-slate-900 border-slate-900 text-emerald-400'
                                  : 'border-slate-200 text-slate-300 bg-white'
                              }`}>
                                {active ? '✓' : '-'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="text-[8px] text-slate-400 leading-tight border-t border-slate-200 pt-1.5 mt-4">
                      P-Productivity | Q-Quality | C-Cost | D-Delivery | S-Safety | M-Morale
                    </div>
                  </div>

                </div>

                {/* 5. Result block */}
                <div className="p-4 bg-slate-50/10">
                  <span className="font-bold text-slate-500 uppercase font-mono text-[10px] block mb-1">Result Summary:</span>
                  <p className="text-slate-700 text-xs leading-relaxed font-sans font-medium whitespace-pre-line">
                    {inspectKaizen.result || "No outcome results summary documented yet."}
                  </p>
                </div>

                {/* 6. Sign-off Footer block */}
                <div className="border-t border-slate-300 p-4 bg-slate-50/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 uppercase font-bold block text-[9px]">Idea by:</span>
                    <span className="font-semibold text-slate-700">{inspectKaizen.ideaBy}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-bold block text-[9px]">Implemented by:</span>
                    <span className="font-semibold text-slate-700">{inspectKaizen.implementedBy || inspectKaizen.ideaBy}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-bold block text-[9px]">Prepared by:</span>
                    <span className="font-semibold text-slate-700">{inspectKaizen.preparedBy || inspectKaizen.ideaBy}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-bold block text-[9px]">Verified & Approved by:</span>
                    <span className="font-bold text-emerald-700">{inspectKaizen.approvedBy || "PENDING BOARD DECISION"}</span>
                  </div>
                </div>

              </div>

              {/* Board classification panel review inside modal */}
              <div className="bg-white border border-slate-250 rounded-2xl p-5 space-y-3 print:border print:border-slate-400 print:rounded-none print:shadow-none print-avoid-break">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide font-mono flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4 text-slate-800" />
                  <span>Committee Classifications & Remarks Log</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium text-slate-600">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Status:</span>
                    <span className="font-black text-sm text-slate-800 mt-1 block">{inspectKaizen.status}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Meeting Decision:</span>
                    <span className={`font-black text-sm mt-1 block ${
                      inspectKaizen.classification === 'Kaizen'
                        ? 'text-emerald-600'
                        : inspectKaizen.classification === 'Good Point'
                        ? 'text-amber-500'
                        : 'text-slate-500'
                    }`}>
                      {inspectKaizen.classification === 'Pending' ? 'Awaiting Meeting' : inspectKaizen.classification}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Audited Value Saved:</span>
                    <span className="font-black text-sm text-emerald-600 mt-1 block">
                      {inspectKaizen.costSave > 0 ? `${formatIndianRupees(inspectKaizen.costSave)}/yr` : '₹0 (Intangible)'}
                    </span>
                  </div>
                </div>

                {inspectKaizen.remark && (
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-xs text-amber-900 leading-normal">
                    <span className="font-black font-mono block uppercase text-[10px] text-amber-800 mb-1">Committee Meeting Remarks:</span>
                    <p className="italic font-semibold">"{inspectKaizen.remark}"</p>
                  </div>
                )}
              </div>

            </div>

            {/* Close Controls */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end shrink-0 gap-3 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectKaizen(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Close Sheet Viewer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PPSR SHEET INSPECT OVERLAY MODAL */}
      {inspectPpsr && (
        <PpsrSheetInspect
          report={inspectPpsr}
          onClose={() => setInspectPpsr(null)}
        />
      )}

      {/* Floating high-fidelity toast notifications to replace blocked browser alerts */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-fade-in max-w-md bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 shadow-2xl flex items-start space-x-3 mr-4">
          <div className={`p-1.5 rounded-lg shrink-0 ${toast.type === 'success' ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'}`}>
            {toast.type === 'success' ? (
              <Check className="w-4 h-4 stroke-[3px]" />
            ) : (
              <Sparkles className="w-4 h-4 text-slate-950 animate-pulse" />
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              {toast.type === 'success' ? '✓ Operation Success' : '⚠️ System Notification'}
            </h4>
            <p className="text-xs font-semibold text-slate-200 mt-1 leading-relaxed">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      </div>
    </div>
  );
}
