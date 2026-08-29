import React, { useState, useEffect } from 'react';
import { PpsrReport, Kaizen, PsqTreeData, StandardWorksheetRow } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import IshikawaFishbone from './IshikawaFishbone';
import { PsqEliminationTree, BLANK_PSQ_TREE_DATA, DEFAULT_PSQ_TREE_DATA } from './PsqEliminationTree';
import PpsrPresentationMode from './PpsrPresentationMode';
import PpsrMonthlyAwards from './PPSRMonthlyAwards';
import PpsrReviewBoard from './PpsrReviewBoard';
import {
  Compass,
  Plus,
  HelpCircle,
  User,
  Calendar,
  CheckCircle,
  Clock,
  X,
  FileText,
  Search,
  SlidersHorizontal,
  Printer,
  Eye,
  Trash2,
  ChevronRight,
  ArrowRight,
  TrendingDown,
  AlertTriangle,
  Globe,
  History,
  DollarSign,
  Users,
  Check,
  Briefcase,
  Edit2,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  Zap,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  Tv,
  Camera,
  Upload,
  PlusCircle,
  ClipboardList,
  Trophy
} from 'lucide-react';
import { PpsrMeetingLog } from '../types';

interface PpsrSystemProps {
  reports: PpsrReport[];
  kaizens?: Kaizen[];
  onAddReport: (data: Partial<PpsrReport>) => void;
  onUpdateReport: (id: string, data: Partial<PpsrReport>) => void;
  onUpdateKaizen?: (id: string, data: Partial<Kaizen>) => void;
  activePpsrTab?: PpsrSubTab;
  setActivePpsrTab?: (tab: PpsrSubTab) => void;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
  onInspectReport?: (report: PpsrReport) => void;
  meetings?: PpsrMeetingLog[];
  onAddMeeting?: (data: Partial<PpsrMeetingLog>) => void;
}

type PpsrSubTab = 'initiate' | 'meeting' | 'cft-awards' | 'register';

export default function PpsrSystem({
  reports,
  kaizens = [],
  onAddReport,
  onUpdateReport,
  onUpdateKaizen,
  activePpsrTab,
  setActivePpsrTab,
  initialAction,
  onClearInitialAction,
  onInspectReport,
  meetings,
  onAddMeeting
}: PpsrSystemProps) {

  const [internalTab, setInternalTab] = useState<PpsrSubTab>('initiate');
  const currentTab = activePpsrTab || internalTab;

  const handleSetTab = (tab: PpsrSubTab) => {
    setInternalTab(tab);
    if (setActivePpsrTab) setActivePpsrTab(tab);
  };

  const [selectedReport, setSelectedReport] = useState<PpsrReport | null>(null);
  const [presentingReport, setPresentingReport] = useState<PpsrReport | null>(null);

  // Trigger from sidebar menu navigation or global dashboard links
  useEffect(() => {
    if (!initialAction) return;

    if (initialAction === 'initiate-ppsr' || initialAction === 'initiate') {
      handleSetTab('initiate');
      if (onClearInitialAction) onClearInitialAction();
    } else if (initialAction === 'meeting' || initialAction === 'committee') {
      handleSetTab('meeting');
      if (onClearInitialAction) onClearInitialAction();
    } else if (initialAction === 'register') {
      handleSetTab('register');
      if (onClearInitialAction) onClearInitialAction();
    } else if (initialAction === 'board') {
      handleSetTab('register');
      if (onClearInitialAction) onClearInitialAction();
    } else if (initialAction === 'cft-awards') {
      handleSetTab('cft-awards');
      if (onClearInitialAction) onClearInitialAction();
    }
  }, [initialAction]);

  // Set default selected report if none selected
  useEffect(() => {
    if (reports.length > 0 && !selectedReport) {
      setSelectedReport(reports[0]);
    }
  }, [reports, selectedReport]);

  // PPSR Meeting Review states
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [mtgDate, setMtgDate] = useState(new Date().toISOString().split('T')[0]);
  const [mtgChairperson, setMtgChairperson] = useState('');
  const [mtgAttendees, setMtgAttendees] = useState('');
  const [mtgKeyDiscussionPoints, setMtgKeyDiscussionPoints] = useState('');
  const [mtgSelectedPpsrIds, setMtgSelectedPpsrIds] = useState<string[]>([]);
  const [mtgNextReviewDate, setMtgNextReviewDate] = useState('');

  // Editing single report's Excel spreadsheet review metrics
  const [editingReport, setEditingReport] = useState<PpsrReport | null>(null);
  const [editJiraNumber, setEditJiraNumber] = useState('');
  const [editWeek, setEditWeek] = useState('');
  const [editCoach, setEditCoach] = useState('');
  const [editCft, setEditCft] = useState('');
  const [editStdStatusMF, setEditStdStatusMF] = useState<'Pending' | 'Completed' | 'N/A'>('Pending');
  const [editStdDate, setEditStdDate] = useState('');
  const [editResponsibility, setEditResponsibility] = useState('');
  const [editPpsrEndDate, setEditPpsrEndDate] = useState('');
  const [editProdQtyBefore, setEditProdQtyBefore] = useState<number>(0);
  const [editRejectedQtyBefore, setEditRejectedQtyBefore] = useState<number>(0);
  const [editProdQtyAfter, setEditProdQtyAfter] = useState<number>(0);
  const [editRejectedQtyAfter, setEditRejectedQtyAfter] = useState<number>(0);
  const [editPerSetRejectionCost, setEditPerSetRejectionCost] = useState<number>(0);
  const [editRemarks, setEditRemarks] = useState('');
  const [editEffectivityText, setEditEffectivityText] = useState('');
  const [editCustDemandQtyMonth, setEditCustDemandQtyMonth] = useState<number>(0);

  // Auto handle starting the editing of a report
  const handleStartEditingReport = (report: PpsrReport) => {
    setEditingReport(report);
    setEditJiraNumber(report.jiraNumber || '');
    setEditWeek(report.week || 'WK-' + (new Date().getMonth() * 4 + 1));
    setEditCoach(report.coach || '');
    setEditCft(report.cft || '');
    setEditStdStatusMF(report.stdStatusMF || 'Pending');
    setEditStdDate(report.stdDate || '');
    setEditResponsibility(report.responsibility || report.projectLeader || '');
    setEditPpsrEndDate(report.ppsrEndDate || '');
    setEditProdQtyBefore(report.prodQtyBefore !== undefined ? report.prodQtyBefore : 1000);
    setEditRejectedQtyBefore(report.rejectedQtyBefore !== undefined ? report.rejectedQtyBefore : 0);
    setEditProdQtyAfter(report.prodQtyAfter !== undefined ? report.prodQtyAfter : 1000);
    setEditRejectedQtyAfter(report.rejectedQtyAfter !== undefined ? report.rejectedQtyAfter : 0);
    setEditPerSetRejectionCost(report.perSetRejectionCost !== undefined ? report.perSetRejectionCost : 100);
    setEditRemarks(report.remarks || '');
    setEditEffectivityText(report.effectivityText || '');
    setEditCustDemandQtyMonth(report.custDemandQtyMonth !== undefined ? report.custDemandQtyMonth : 5000);
  };

  const calculateSpreadsheetFields = (inputs: {
    prodQtyBefore?: number;
    rejectedQtyBefore?: number;
    prodQtyAfter?: number;
    rejectedQtyAfter?: number;
    custDemandQtyMonth?: number;
    perSetRejectionCost?: number;
    createdAt?: string;
    stdDate?: string;
    ppsrEndDate?: string;
  }) => {
    const prodQtyBefore = Number(inputs.prodQtyBefore) || 0;
    const rejectedQtyBefore = Number(inputs.rejectedQtyBefore) || 0;
    const prodQtyAfter = Number(inputs.prodQtyAfter) || 0;
    const rejectedQtyAfter = Number(inputs.rejectedQtyAfter) || 0;
    const custDemandQtyMonth = Number(inputs.custDemandQtyMonth) || 0;
    const perSetRejectionCost = Number(inputs.perSetRejectionCost) || 0;

    const pctBefore = prodQtyBefore > 0 ? Number(((rejectedQtyBefore / prodQtyBefore) * 100).toFixed(2)) : 0;
    const pctAfter = prodQtyAfter > 0 ? Number(((rejectedQtyAfter / prodQtyAfter) * 100).toFixed(2)) : 0;

    const custDemandQtyAnnum = custDemandQtyMonth * 12;

    const qtyMonthBeforeRejPct = Math.round(custDemandQtyMonth * (pctBefore / 100));
    const qtyMonthAfterRejPct = Math.round(custDemandQtyMonth * (pctAfter / 100));
    const qtyMonthSavedRejPct = Math.max(0, qtyMonthBeforeRejPct - qtyMonthAfterRejPct);

    const costSavePerMonth = qtyMonthSavedRejPct * perSetRejectionCost;
    const costSavePerAnnum = costSavePerMonth * 12;

    let effDaysStd = 0;
    if (inputs.createdAt && inputs.stdDate) {
      const start = new Date(inputs.createdAt);
      const end = new Date(inputs.stdDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        effDaysStd = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }

    let effDaysClosePpsr = 0;
    if (inputs.createdAt && inputs.ppsrEndDate) {
      const start = new Date(inputs.createdAt);
      const end = new Date(inputs.ppsrEndDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        effDaysClosePpsr = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }

    return {
      pctBefore,
      pctAfter,
      custDemandQtyAnnum,
      qtyMonthBeforeRejPct,
      qtyMonthAfterRejPct,
      qtyMonthSavedRejPct,
      costSavePerMonth,
      costSavePerAnnum,
      effDaysStd,
      effDaysClosePpsr
    };
  };

  const handleSaveSpreadsheetMetrics = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;

    const calc = calculateSpreadsheetFields({
      prodQtyBefore: editProdQtyBefore,
      rejectedQtyBefore: editRejectedQtyBefore,
      prodQtyAfter: editProdQtyAfter,
      rejectedQtyAfter: editRejectedQtyAfter,
      custDemandQtyMonth: editCustDemandQtyMonth,
      perSetRejectionCost: editPerSetRejectionCost,
      createdAt: editingReport.createdAt,
      stdDate: editStdDate,
      ppsrEndDate: editPpsrEndDate
    });

    const updatedData: Partial<PpsrReport> = {
      jiraNumber: editJiraNumber,
      week: editWeek,
      coach: editCoach,
      cft: editCft,
      stdStatusMF: editStdStatusMF,
      stdDate: editStdDate,
      effDaysStd: calc.effDaysStd,
      responsibility: editResponsibility,
      ppsrEndDate: editPpsrEndDate,
      effDaysClosePpsr: calc.effDaysClosePpsr,
      prodQtyBefore: editProdQtyBefore,
      rejectedQtyBefore: editRejectedQtyBefore,
      pctBefore: calc.pctBefore,
      prodQtyAfter: editProdQtyAfter,
      rejectedQtyAfter: editRejectedQtyAfter,
      pctAfter: calc.pctAfter,
      effectivityText: editEffectivityText,
      custDemandQtyMonth: editCustDemandQtyMonth,
      custDemandQtyAnnum: calc.custDemandQtyAnnum,
      qtyMonthBeforeRejPct: calc.qtyMonthBeforeRejPct,
      qtyMonthAfterRejPct: calc.qtyMonthAfterRejPct,
      qtyMonthSavedRejPct: calc.qtyMonthSavedRejPct,
      perSetRejectionCost: editPerSetRejectionCost,
      costSavePerMonth: calc.costSavePerMonth,
      costSavePerAnnum: calc.costSavePerAnnum,
      remarks: editRemarks
    };

    onUpdateReport(editingReport.id, updatedData);
    setEditingReport(null);
  };

  const handleSaveMeetingMinutes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddMeeting) return;

    onAddMeeting({
      meetingDate: mtgDate,
      chairperson: mtgChairperson,
      attendees: mtgAttendees,
      keyDiscussionPoints: mtgKeyDiscussionPoints,
      discussedPpsrIds: mtgSelectedPpsrIds,
      nextReviewDate: mtgNextReviewDate
    });

    setShowAddMeeting(false);
    setMtgChairperson('');
    setMtgAttendees('');
    setMtgKeyDiscussionPoints('');
    setMtgSelectedPpsrIds([]);
    setMtgNextReviewDate('');
  };

  // Filters for Register Spreadsheet
  const [searchQuery, setSearchQuery] = useState('');
  const [plantFilter, setPlantFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ppsrNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.leadOwner || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlant = plantFilter === 'all' || (r.plant || '').toLowerCase().includes(plantFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesPlant && matchesStatus;
  });

  // --- FORM STATES FOR INITIATING A FULL BE PPSR ---
  const [formStep, setFormStep] = useState(1);
  const [title, setTitle] = useState('');
  const [plant, setPlant] = useState('Pune Assembly & Paint Complex');
  const [lineStation, setLineStation] = useState('');
  const [productComponent, setProductComponent] = useState('');
  const [amountDefects, setAmountDefects] = useState('');
  const [discoveredBy, setDiscoveredBy] = useState('');
  const [discoveredOn, setDiscoveredOn] = useState(new Date().toISOString().split('T')[0]);
  const [repeatCase, setRepeatCase] = useState<'yes' | 'no'>('no');
  const [problemStatement, setProblemStatement] = useState('');
  const [sketchPhoto, setSketchPhoto] = useState('');

  // Step 1.1: Initial Evidence Options (Option 1 Data vs Option 2 Photo)
  const [initialEvidenceType, setInitialEvidenceType] = useState<'data' | 'photo' | 'both'>('data');
  const [initialDefectTrendData, setInitialDefectTrendData] = useState<Array<{ date: string; defectsCount: number; stage?: string }>>([
    { date: '13-12-2027', defectsCount: 6.2, stage: 'Initial Baseline' },
    { date: '14-12-2027', defectsCount: 3.5, stage: 'Observation' },
    { date: '15-12-2027', defectsCount: 1.1, stage: 'Investigation' },
    { date: '16-12-2027', defectsCount: 0.3, stage: 'Analysis' },
    { date: '18-12-2027', defectsCount: 0.1, stage: 'Pre-countermeasure' }
  ]);

  const handleAddInitialDefectRow = () => {
    const nextNum = initialDefectTrendData.length + 1;
    setInitialDefectTrendData(prev => [
      ...prev,
      { date: `Day ${nextNum}`, defectsCount: 0, stage: 'Baseline' }
    ]);
  };

  const handleUpdateInitialDefectRow = (index: number, field: 'date' | 'defectsCount' | 'stage', val: any) => {
    setInitialDefectTrendData(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveInitialDefectRow = (index: number) => {
    if (initialDefectTrendData.length > 1) {
      setInitialDefectTrendData(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Step 2: Facts Analysis
  const [whatIs, setWhatIs] = useState('');
  const [whatIsNot, setWhatIsNot] = useState('');
  const [whereIs, setWhereIs] = useState('');
  const [whereIsNot, setWhereIsNot] = useState('');
  const [howIs, setHowIs] = useState('');
  const [howIsNot, setHowIsNot] = useState('');
  const [whenIs, setWhenIs] = useState('');
  const [whenIsNot, setWhenIsNot] = useState('');

  // Step 3: Containment actions
  const [containmentActions, setContainmentActions] = useState<Array<{ action: string, responsible: string, date: string, status: 'planned' | 'in-progress' | 'implemented' | 'proven' }>>([
    { action: '', responsible: '', date: new Date().toISOString().split('T')[0], status: 'implemented' }
  ]);

  const handleAddContainmentRow = () => {
    setContainmentActions(prev => [...prev, { action: '', responsible: '', date: new Date().toISOString().split('T')[0], status: 'implemented' }]);
  };

  // Step 4a: Cause Localization (Fishbone, Standard Worksheet & PSQ Elimination Tree)
  const [causeLocalizationApproach, setCauseLocalizationApproach] = useState<'fishbone' | 'psq' | 'both'>('both');
  const [standardWorksheet, setStandardWorksheet] = useState<StandardWorksheetRow[]>([]);
  const [psqTreeData, setPsqTreeData] = useState<PsqTreeData>(BLANK_PSQ_TREE_DATA);

  // Ishikawa state
  const [ishikawaMan, setIshikawaMan] = useState('');
  const [ishikawaMachine, setIshikawaMachine] = useState('');
  const [ishikawaMaterial, setIshikawaMaterial] = useState('');
  const [ishikawaMethods, setIshikawaMethods] = useState('');
  const [ishikawaMilieu, setIshikawaMilieu] = useState('');
  const [ishikawaMeasurement, setIshikawaMeasurement] = useState('');

  // Step 4b: 5-Whys
  const [why1_col1, setWhy1_col1] = useState('');
  const [why2_col1, setWhy2_col1] = useState('');
  const [why3_col1, setWhy3_col1] = useState('');
  const [why4_col1, setWhy4_col1] = useState('');
  const [why5_col1, setWhy5_col1] = useState('');

  const [why1_col2, setWhy1_col2] = useState('');
  const [why2_col2, setWhy2_col2] = useState('');
  const [why3_col2, setWhy3_col2] = useState('');
  const [why4_col2, setWhy4_col2] = useState('');
  const [why5_col2, setWhy5_col2] = useState('');

  const [why1_col3, setWhy1_col3] = useState('');
  const [why2_col3, setWhy2_col3] = useState('');
  const [why3_col3, setWhy3_col3] = useState('');
  const [why4_col3, setWhy4_col3] = useState('');
  const [why5_col3, setWhy5_col3] = useState('');

  // Step 5: Corrective actions
  const [correctiveActions, setCorrectiveActions] = useState<Array<{ measure: string, responsible: string, deadline: string, status: 'planned' | 'in-progress' | 'completed' | 'proven' }>>([
    { measure: '', responsible: '', deadline: new Date().toISOString().split('T')[0], status: 'completed' }
  ]);

  const handleAddCorrectiveRow = () => {
    setCorrectiveActions(prev => [...prev, { measure: '', responsible: '', deadline: new Date().toISOString().split('T')[0], status: 'completed' }]);
  };

  // Step 6: Effectiveness & Verification Evidence Options
  const [effectivenessEvidence, setEffectivenessEvidence] = useState('');
  const [evidenceType, setEvidenceType] = useState<'data' | 'photo' | 'both'>('data');
  const [defectTrendData, setDefectTrendData] = useState<Array<{ date: string; defectsCount: number; stage?: string }>>([
    { date: 'Day 1 (Initial)', defectsCount: 6.2, stage: 'Initial Baseline' },
    { date: 'Day 2 (Manual)', defectsCount: 3.5, stage: 'Manual Jig Adjustment' },
    { date: 'Day 3 (Fluid Revert)', defectsCount: 1.1, stage: 'Fluid Revert' },
    { date: 'Day 4 (PLC Cycle)', defectsCount: 0.3, stage: 'PLC Cycle' },
    { date: 'Day 5 (Current)', defectsCount: 0.1, stage: 'Current Standardized' },
  ]);

  const handleAddDefectRow = () => {
    const nextNum = defectTrendData.length + 1;
    setDefectTrendData(prev => [
      ...prev,
      { date: `Day ${nextNum}`, defectsCount: 0, stage: 'Verification' }
    ]);
  };

  const handleUpdateDefectRow = (index: number, field: 'date' | 'defectsCount' | 'stage', val: any) => {
    setDefectTrendData(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveDefectRow = (index: number) => {
    if (defectTrendData.length > 1) {
      setDefectTrendData(prev => prev.filter((_, i) => i !== index));
    }
  };

  const [standardizationActions, setStandardizationActions] = useState<Array<{ measure: string, responsible: string, date: string, status: 'completed' }>>([
    { measure: '', responsible: '', date: new Date().toISOString().split('T')[0], status: 'completed' }
  ]);

  const handleAddStandardizationRow = () => {
    setStandardizationActions(prev => [...prev, { measure: '', responsible: '', date: new Date().toISOString().split('T')[0], status: 'completed' }]);
  };

  // Step 8: Read Across & Completion
  const [readAcrossActions, setReadAcrossActions] = useState<Array<{ proposal: string, responsible: string, deadline: string }>>([
    { proposal: '', responsible: '', deadline: new Date().toISOString().split('T')[0] }
  ]);

  const handleAddReadAcrossRow = () => {
    setReadAcrossActions(prev => [...prev, { proposal: '', responsible: '', deadline: new Date().toISOString().split('T')[0] }]);
  };

  const [readAcrossExplanation, setReadAcrossExplanation] = useState('');
  const [leadOwner, setLeadOwner] = useState('');
  const [steeringCommittee, setSteeringCommittee] = useState('Rajesh Patil (Supervisor)');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !problemStatement || !leadOwner) {
      alert("Please enter a Title, Problem description and Lead Owner (Project Leader) to initiate the BE report.");
      return;
    }

    // Assemble complex BE structure
    const ppsrPayload: Partial<PpsrReport> = {
      title,
      problemStatement,
      leadOwner,
      status: 'Open',
      targetDate: discoveredOn,
      rootCauseAnalysis: why1_col1 ? `1. Why? ${why1_col1}\n2. Why? ${why2_col1}\n3. Why? ${why3_col1}\n4. Why? ${why4_col1}\n5. Why? ${why5_col1}` : 'Root cause analysis in progress.',
      containmentAction: containmentActions[0]?.action || 'Containment action pending.',
      permanentCorrectiveAction: correctiveActions[0]?.measure || 'Corrective actions scheduled.',
      validationCheck: effectivenessEvidence || 'Validation check scheduled.',

      projectLeader: leadOwner,
      teamMembers: 'Rahul Sharma, Sunita Rao (Assigned Quality Team)',
      plant,
      lineStation,
      productComponent,
      amountDefects,
      discoveredOn,
      discoveredBy,
      repeatCase,
      sketchPhoto: sketchPhoto || undefined,
      initialEvidenceType,
      initialDefectTrendData,

      factsAnalysis: {
        whatIs, whatIsNot,
        whereIs, whereIsNot,
        howIs, howIsNot,
        whenIs, whenIsNot
      },

      containmentActionsList: containmentActions
        .filter(c => c.action.trim() !== '')
        .map((c, i) => ({ no: i + 1, ...c })),

      ishikawa: {
        man: ishikawaMan ? ishikawaMan.split(',').map(s => s.trim()) : [],
        machine: ishikawaMachine ? ishikawaMachine.split(',').map(s => s.trim()) : [],
        material: ishikawaMaterial ? ishikawaMaterial.split(',').map(s => s.trim()) : [],
        methods: ishikawaMethods ? ishikawaMethods.split(',').map(s => s.trim()) : [],
        milieu: ishikawaMilieu ? ishikawaMilieu.split(',').map(s => s.trim()) : [],
        measurement: ishikawaMeasurement ? ishikawaMeasurement.split(',').map(s => s.trim()) : []
      },

      causeLocalizationApproach,
      standardWorksheet,
      psqTreeData,

      fiveWhysList: {
        column1: [why1_col1, why2_col1, why3_col1, why4_col1, why5_col1].filter(Boolean),
        column2: [why1_col2, why2_col2, why3_col2, why4_col2, why5_col2].filter(Boolean),
        column3: [why1_col3, why2_col3, why3_col3, why4_col3, why5_col3].filter(Boolean)
      },

      correctiveActionsList: correctiveActions
        .filter(ca => ca.measure.trim() !== '')
        .map((ca, i) => ({ no: i + 1, ...ca })),

      effectivenessEvidence,
      evidenceType,
      defectTrendData,
      effectivenessChartData: defectTrendData.map(d => ({
        name: d.date,
        value: Number(d.defectsCount) || 0
      })),

      standardizationList: standardizationActions
        .filter(s => s.measure.trim() !== '')
        .map((s, i) => ({ no: i + 1, ...s, status: 'completed' })),

      readAcrossList: readAcrossActions
        .filter(r => r.proposal.trim() !== ''),
      readAcrossExplanation,

      completionSignatures: {
        projectLeader: leadOwner,
        steeringCommittee,
        completedOn: new Date().toISOString().split('T')[0]
      }
    };

    onAddReport(ppsrPayload);
    alert('SUCCESS: Practical Problem Solving Report (PPSR) initiated and logged to server!');

    // Clear states
    setTitle('');
    setLineStation('');
    setProductComponent('');
    setAmountDefects('');
    setProblemStatement('');
    setWhatIs(''); setWhatIsNot('');
    setWhereIs(''); setWhereIsNot('');
    setHowIs(''); setHowIsNot('');
    setWhenIs(''); setWhenIsNot('');
    setIshikawaMan(''); setIshikawaMachine(''); setIshikawaMaterial('');
    setIshikawaMethods(''); setIshikawaMilieu(''); setIshikawaMeasurement('');
    setWhy1_col1(''); setWhy2_col1(''); setWhy3_col1(''); setWhy4_col1(''); setWhy5_col1('');
    setStandardWorksheet([]);
    setPsqTreeData(BLANK_PSQ_TREE_DATA);
    setEffectivenessEvidence('');
    setLeadOwner('');
    setFormStep(1);

    handleSetTab('register');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2 space-y-3.5" id="ppsr-system-hub">

      {/* PPSR Workflow Sub-Tabs Navigation */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-1 shadow-2xs flex items-center justify-between gap-1 overflow-x-auto select-none">
        <div className="flex items-center gap-1 min-w-max">
          {/* 1. Initiate PPSR */}
          <button
            id="tab-ppsr-initiate"
            onClick={() => handleSetTab('initiate')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentTab === 'initiate'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <PlusCircle className="w-3.5 h-3.5 shrink-0 text-violet-300" />
            <span>1. Initiate PPSR</span>
          </button>

          {/* 2. Committee Review */}
          <button
            id="tab-ppsr-meeting"
            onClick={() => handleSetTab('meeting')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentTab === 'meeting'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0 text-emerald-300" />
            <span>2. Committee Review</span>
            {meetings && meetings.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${currentTab === 'meeting' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-700'
                }`}>
                {meetings.length}
              </span>
            )}
          </button>

          {/* 3. Monthly Awards */}
          <button
            id="tab-ppsr-awards"
            onClick={() => handleSetTab('cft-awards')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentTab === 'cft-awards'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Trophy className="w-3.5 h-3.5 shrink-0 text-amber-200" />
            <span>3. Monthly Awards</span>
          </button>

          {/* 4. PPSR Register */}
          <button
            id="tab-ppsr-register"
            onClick={() => handleSetTab('register')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentTab === 'register'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <ClipboardList className="w-3.5 h-3.5 shrink-0 text-blue-300" />
            <span>4. PPSR Register</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${currentTab === 'register' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
              }`}>
              {reports.length}
            </span>
          </button>
        </div>

        <div className="hidden lg:flex items-center space-x-2 px-3 text-[11px] font-mono text-slate-400">
          <Compass className="w-3.5 h-3.5 text-violet-500" />
          <span>8D Problem Solving Lifecycle</span>
        </div>
      </div>

      {/* 2. Render Active Tab */}

      {currentTab === 'cft-awards' && (
        <PpsrMonthlyAwards
          ppsrReports={reports}
          onUpdatePpsrReport={onUpdateReport}
        />
      )}

      {/* SUB-TAB 2: REGISTER SPREADSHEET */}
      {currentTab === 'register' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-6">

          {/* Filtering row */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-150">
            <div className="relative w-full md:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Title, Report ID or Lead..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium"
              />
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div className="flex items-center space-x-1 shrink-0 text-slate-400">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase font-mono">Filters:</span>
              </div>

              <select
                value={plantFilter}
                onChange={(e) => setPlantFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
              >
                <option value="all">All Plants</option>
                <option value="Pune">Pune Plant</option>
                <option value="Chennai">Chennai Plant</option>
                <option value="Hosur">Hosur Plant</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In-Progress">In-Progress</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Master spreadsheet table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-900 text-slate-200 text-[10px] uppercase font-mono tracking-wider">
                <tr className="divide-x divide-slate-800 border-b border-slate-800">
                  <th className="p-3 text-center w-24">Report ID</th>
                  <th className="p-3">Problem Title & Location</th>
                  <th className="p-3">Discovered By & On</th>
                  <th className="p-3">Primary Root Cause</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-mono">No reports matching filters found.</td>
                  </tr>
                ) : (
                  filteredReports.map((r, i) => (
                    <tr key={r.id} className={`hover:bg-slate-50/50 transition divide-x divide-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                      <td className="p-3 text-center font-black font-mono text-slate-900">{r.ppsrNo}</td>
                      <td className="p-3 space-y-0.5">
                        <span className="font-bold text-slate-800 text-[13px] block">{r.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-medium block">
                          🏭 {r.plant || 'Pune'} • Line: {r.lineStation || 'ST-3'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[10px] text-slate-600">
                        <span className="block font-bold">👤 {r.discoveredBy || r.leadOwner}</span>
                        <span className="block text-slate-400">📅 {r.discoveredOn || r.targetDate}</span>
                      </td>
                      <td className="p-3">
                        <p className="text-[11px] font-mono text-slate-600 line-clamp-2 max-w-sm whitespace-pre-wrap">{r.rootCauseAnalysis || 'Investigation in progress.'}</p>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${r.status === 'Open' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            r.status === 'In-Progress' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => setPresentingReport(r)}
                            className="px-2 py-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg transition-all text-[10px] font-bold font-mono flex items-center space-x-1 cursor-pointer"
                            title="Step-by-Step Committee Presentation Mode"
                          >
                            <Compass className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </button>
                          <button
                            onClick={() => onInspectReport && onInspectReport(r)}
                            className="p-1.5 bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 transition-all cursor-pointer"
                            title="Inspect Sheet & Print"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedReport(r)}
                            className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
                            title="Open on Solver Board"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: LOG NEW BE FORM */}
      {currentTab === 'initiate' && (
        <form onSubmit={handleFormSubmit} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 max-w-4xl mx-auto text-left" id="ppsr-initiate-form-wizard">

          {/* Form Header */}
          <div className="border-b pb-2 flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
                🧠 Initiate PPSR Report
              </span>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                8D Problem Solving Wizard
              </span>
            </div>
            <div className="bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono tracking-wider shrink-0">
              Step {formStep} / 5
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex items-center justify-between gap-2 overflow-x-auto select-none">
            {[
              { num: 1, title: "1. Problem & Facts", desc: "Symptoms & IS/NOT" },
              { num: 2, title: "2. Containment", desc: "Short-term" },
              { num: 3, title: "3. Root Causes", desc: "Ishikawa & PSQ" },
              { num: 4, title: "4. Action Plan", desc: "Fixes & Evidence" },
              { num: 5, title: "5. Standardization", desc: "Control & Sign-off" }
            ].map((step) => {
              const isPassed = formStep > step.num;
              const isActive = formStep === step.num;
              return (
                <div
                  key={step.num}
                  onClick={() => setFormStep(step.num)}
                  className="flex items-center space-x-1.5 min-w-[120px] shrink-0 cursor-pointer hover:opacity-95"
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${isPassed ? 'bg-emerald-600 text-white' :
                      isActive ? 'bg-violet-600 text-white shadow-xs ring-2 ring-violet-200' :
                        'bg-slate-200 text-slate-500'
                    }`}>
                    {isPassed ? "✓" : step.num}
                  </div>
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-tight leading-none ${isActive ? 'text-violet-600' : isPassed ? 'text-emerald-700' : 'text-slate-500'
                      }`}>
                      {step.title}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* STEP 1: GENERAL INFO & PROBLEM STATEMENT & FACTS (IS/IS NOT) */}
          {formStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-black text-violet-600 uppercase tracking-widest font-mono border-b pb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Step 1.1: General Parameters</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Problem / Project Title *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Micro-Dust Contamination in Paint Booth"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Plant Location</label>
                    <select
                      value={plant}
                      onChange={(e) => setPlant(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none font-semibold text-slate-700"
                    >
                      <option value="Pune Assembly & Paint Complex">Pune Assembly & Paint Complex</option>
                      <option value="Chennai Main frame Plant">Chennai Main frame Plant</option>
                      <option value="Hosur Machining Section C">Hosur Machining Section C</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Line / Station</label>
                    <input
                      type="text"
                      value={lineStation}
                      onChange={(e) => setLineStation(e.target.value)}
                      placeholder="e.g. Paint Cabin ST-3"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Product / Component</label>
                    <input
                      type="text"
                      value={productComponent}
                      onChange={(e) => setProductComponent(e.target.value)}
                      placeholder="e.g. SUV-500 Side Door"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Amount Defects</label>
                    <input
                      type="text"
                      value={amountDefects}
                      onChange={(e) => setAmountDefects(e.target.value)}
                      placeholder="e.g. 8% defect rate"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Discovered On</label>
                    <input
                      type="date"
                      value={discoveredOn}
                      onChange={(e) => setDiscoveredOn(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none font-semibold text-slate-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Discovered By</label>
                    <input
                      type="text"
                      value={discoveredBy}
                      onChange={(e) => setDiscoveredBy(e.target.value)}
                      placeholder="e.g. Suresh Kumar (QA Inspector)"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Repeat Case?</label>
                    <select
                      value={repeatCase}
                      onChange={(e) => setRepeatCase(e.target.value as 'yes' | 'no')}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none font-bold text-slate-700"
                    >
                      <option value="no">No, first time occurrence</option>
                      <option value="yes">Yes, recurring problem</option>
                    </select>
                  </div>
                </div>

                {/* Step 1.1: Initial Evidence & Defect Data Options (Option 1: Data Trend Chart & Option 2: Photo Upload) */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono flex items-center gap-1.5">
                        <span>📊 Step 1.1: Initial Problem Evidence Options</span>
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        Choose between entering initial defect trend data (generates initial baseline graph) or uploading photo evidence.
                      </p>
                    </div>

                    {/* TWO OPTION TOGGLE */}
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-3xs font-mono text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setInitialEvidenceType('data')}
                        className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${initialEvidenceType === 'data'
                            ? 'bg-emerald-600 text-white shadow-xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>Option 1: Data (Date & Defects)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInitialEvidenceType('photo')}
                        className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${initialEvidenceType === 'photo'
                            ? 'bg-indigo-600 text-white shadow-xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Option 2: Photo Upload</span>
                      </button>
                    </div>
                  </div>

                  {/* OPTION 1: DATA ENTRY FOR INITIAL DEFECT BASELINE TREND CHART */}
                  {(initialEvidenceType === 'data' || initialEvidenceType === 'both') && (
                    <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-3xs animate-fade-in">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div>
                          <span className="text-[10px] font-black uppercase text-emerald-700 font-mono tracking-wider flex items-center space-x-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Option 1: Initial Defect Data Input</span>
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5">Input dates/days and defect counts. The baseline graph below updates automatically.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddInitialDefectRow}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1.5 rounded-lg font-bold font-mono transition border border-emerald-200 flex items-center space-x-1"
                        >
                          <span>+ Add Data Point</span>
                        </button>
                      </div>

                      {/* Table of Date & Defect Count */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                              <th className="p-2 w-8">#</th>
                              <th className="p-2">Date / Stage Name</th>
                              <th className="p-2 w-36">Number of Defects</th>
                              <th className="p-2 text-right w-12">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {initialDefectTrendData.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80">
                                <td className="p-2 font-bold text-slate-400">{idx + 1}</td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={row.date}
                                    onChange={(e) => handleUpdateInitialDefectRow(idx, 'date', e.target.value)}
                                    placeholder="e.g. 13-12-2027"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={row.defectsCount}
                                    onChange={(e) => handleUpdateInitialDefectRow(idx, 'defectsCount', parseFloat(e.target.value) || 0)}
                                    className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-emerald-700"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveInitialDefectRow(idx)}
                                    className="text-slate-300 hover:text-rose-600 p-1 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* GENERATED GRAPH FOR STEP 1.1 */}
                      <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-slate-700 font-mono tracking-wider flex items-center space-x-1">
                            <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Initial Defect Baseline Chart (Generated Graph)</span>
                          </span>
                          <span className="text-[9px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Real-time Plot ({initialDefectTrendData.length} stages)
                          </span>
                        </div>

                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                          <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={initialDefectTrendData.map(d => ({ name: d.date, defects: d.defectsCount }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                                formatter={(val: any) => [`${val} Defects`, 'Defects']}
                              />
                              <Line
                                type="monotone"
                                dataKey="defects"
                                stroke="#059669"
                                strokeWidth={3}
                                dot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                                activeDot={{ r: 8, fill: '#10b981' }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OPTION 2: PHOTO UPLOAD FOR INITIAL EVIDENCE */}
                  {(initialEvidenceType === 'photo' || initialEvidenceType === 'both') && (
                    <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-3xs animate-fade-in">
                      <h5 className="text-xs font-bold text-slate-800 font-mono uppercase flex items-center space-x-1.5">
                        <Camera className="w-4 h-4 text-indigo-600" />
                        <span>Option 2: Initial Defect Photo Upload</span>
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">Upload Image File</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setSketchPhoto(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                            id="photo-upload-step1"
                          />
                          <label
                            htmlFor="photo-upload-step1"
                            className="w-full bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl px-4 py-3 flex items-center justify-center space-x-2 cursor-pointer transition text-xs font-bold text-indigo-600 font-mono"
                          >
                            <Upload className="w-4 h-4 text-indigo-500" />
                            <span>Choose Defect Photo File</span>
                          </label>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">Or Visual Image URL</label>
                          <input
                            type="text"
                            value={sketchPhoto}
                            onChange={(e) => setSketchPhoto(e.target.value)}
                            placeholder="Paste visual image URL..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                          />
                        </div>
                      </div>

                      {sketchPhoto && (
                        <div className="mt-3 flex items-center space-x-3 pt-3 border-t border-slate-100">
                          <img src={sketchPhoto} alt="Initial Defect Evidence" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                          <div>
                            <span className="text-[10px] font-black uppercase text-indigo-600 font-mono block">INITIAL PHOTO ATTACHED</span>
                            <button
                              type="button"
                              onClick={() => setSketchPhoto('')}
                              className="text-[10px] font-mono text-rose-600 hover:underline font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">1 Detailed Problem Statement *</label>
                  <textarea
                    value={problemStatement}
                    onChange={(e) => setProblemStatement(e.target.value)}
                    required
                    rows={3}
                    placeholder="Detail the failure symptoms, defective quantities, frequency, and consequences on production flow..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Step 1.2: IS / IS NOT */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-black text-violet-600 uppercase tracking-widest font-mono border-b pb-1 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Step 1.2: Facts Analysis (IS / IS NOT COMPARISON)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* NOK IS Block */}
                  <div className="bg-rose-50/30 p-4 rounded-xl border border-rose-100/50 space-y-3">
                    <h5 className="text-[10px] font-black uppercase text-rose-600 font-mono flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span>The Problem IS (NOK - Non-conforming)</span>
                    </h5>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono mb-1">WHAT IS the problem?</label>
                      <input type="text" value={whatIs} onChange={(e) => setWhatIs(e.target.value)} placeholder="e.g. Specks on SUV side doors" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-rose-900" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono mb-1">WHERE IS the problem?</label>
                      <input type="text" value={whereIs} onChange={(e) => setWhereIs(e.target.value)} placeholder="e.g. ST-3 spray cabin" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-rose-900" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono mb-1">HOW IS the problem happening?</label>
                      <input type="text" value={howIs} onChange={(e) => setHowIs(e.target.value)} placeholder="e.g. Continuous 8% rework rate" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-rose-900" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono mb-1">WHEN IS the problem observed?</label>
                      <input type="text" value={whenIs} onChange={(e) => setWhenIs(e.target.value)} placeholder="e.g. Shift B July 8" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-rose-900" />
                    </div>
                  </div>

                  {/* OK IS NOT Block */}
                  <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-100/50 space-y-3">
                    <h5 className="text-[10px] font-black uppercase text-emerald-600 font-mono flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>The Problem IS NOT (OK - Conforming)</span>
                    </h5>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono mb-1">WHAT IS NOT the problem?</label>
                      <input type="text" value={whatIsNot} onChange={(e) => setWhatIsNot(e.target.value)} placeholder="e.g. No thin coat or paint runs" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-emerald-900" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono mb-1">WHERE IS NOT the problem?</label>
                      <input type="text" value={whereIsNot} onChange={(e) => setWhereIsNot(e.target.value)} placeholder="e.g. Hosur or Chennai plants" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-emerald-900" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono mb-1">HOW IS NOT the problem?</label>
                      <input type="text" value={howIsNot} onChange={(e) => setHowIsNot(e.target.value)} placeholder="e.g. Intermittent, seasonal, random" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-emerald-900" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono mb-1">WHEN IS NOT the problem?</label>
                      <input type="text" value={whenIsNot} onChange={(e) => setWhenIsNot(e.target.value)} placeholder="e.g. Previous month batches" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-emerald-900" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONTAINMENT ACTIONS */}
          {formStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono">Step 2: Temporary Containment Actions</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Protect the customer or downstream operations within 24 hours of discovery.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddContainmentRow}
                    className="bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs px-3 py-1.5 rounded-lg font-black uppercase font-mono transition flex items-center space-x-1 border border-violet-100"
                  >
                    <span>+ Add Measure</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {containmentActions.map((c, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-3xs relative group">
                      <button
                        type="button"
                        onClick={() => {
                          if (containmentActions.length > 1) {
                            setContainmentActions(prev => prev.filter((_, idx) => idx !== i));
                          }
                        }}
                        className="absolute right-2 top-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="sm:col-span-5">
                        <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Containment Measure</label>
                        <input
                          type="text"
                          value={c.action}
                          onChange={(e) => {
                            const copy = [...containmentActions];
                            copy[i].action = e.target.value;
                            setContainmentActions(copy);
                          }}
                          placeholder="e.g. Vacuum clean air nozzles / 100% sort paint stock"
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Responsible</label>
                        <input
                          type="text"
                          value={c.responsible}
                          onChange={(e) => {
                            const copy = [...containmentActions];
                            copy[i].responsible = e.target.value;
                            setContainmentActions(copy);
                          }}
                          placeholder="Rahul S."
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Target Date</label>
                        <input
                          type="date"
                          value={c.date}
                          onChange={(e) => {
                            const copy = [...containmentActions];
                            copy[i].date = e.target.value;
                            setContainmentActions(copy);
                          }}
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Status</label>
                        <select
                          value={c.status}
                          onChange={(e) => {
                            const copy = [...containmentActions];
                            copy[i].status = e.target.value as any;
                            setContainmentActions(copy);
                          }}
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-2 py-1 text-xs font-mono font-bold text-slate-700"
                        >
                          <option value="planned">Planned</option>
                          <option value="in-progress">In-Progress</option>
                          <option value="implemented">Implemented</option>
                          <option value="proven">Proven (Verified)</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CAUSE LOCALIZATION (FISHBONE & PSQ) & 5-WHYS */}
          {formStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              {/* Step 3.0: Methodology Selection */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
                  <div>
                    <h4 className="text-xs font-black text-violet-700 uppercase tracking-widest font-mono flex items-center gap-2">
                      <span>🎯 Step 3.1: Cause Localization Methodology Selection</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose between the classical <strong>Ishikawa (6M) Fishbone</strong> or the structured <strong>PSQ (Problem Solving Question) Project Definition Elimination Tree</strong> to isolate the Big X.
                    </p>
                  </div>

                  {/* Approach Switcher */}
                  <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCauseLocalizationApproach('fishbone')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${causeLocalizationApproach === 'fishbone'
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      🐟 Ishikawa (6M)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCauseLocalizationApproach('psq')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${causeLocalizationApproach === 'psq'
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      🌳 PSQ Elimination Tree
                    </button>
                    <button
                      type="button"
                      onClick={() => setCauseLocalizationApproach('both')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${causeLocalizationApproach === 'both'
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      🔄 Both Approaches
                    </button>
                  </div>
                </div>

                {/* PSQ Tree Editor */}
                {(causeLocalizationApproach === 'psq' || causeLocalizationApproach === 'both') && (
                  <div className="pt-1">
                    <PsqEliminationTree
                      data={psqTreeData}
                      onChange={setPsqTreeData}
                      standardWorksheet={standardWorksheet}
                      onStandardWorksheetChange={setStandardWorksheet}
                      isEditable={true}
                      contextInfo={{
                        title,
                        description: problemStatement,
                        area: plant,
                        line: lineStation,
                        station: lineStation,
                        partName: productComponent,
                        partNo: productComponent,
                        rejectionRate: amountDefects,
                        scrapCost: '2500 €'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Step 3.1: Ishikawa */}
              {(causeLocalizationApproach === 'fishbone' || causeLocalizationApproach === 'both') && (
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <h4 className="text-xs font-black text-violet-600 uppercase tracking-widest font-mono border-b pb-2 flex items-center gap-1.5">
                    <span>📐 Step 3.1: Ishikawa 6M Localization categories (Separate causes by commas)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                      <label className="block text-[9px] font-black uppercase text-indigo-600 font-mono">👷 MAN (People)</label>
                      <textarea
                        value={ishikawaMan}
                        onChange={(e) => setIshikawaMan(e.target.value)}
                        placeholder="e.g. Operator fatigue, lack of spray SOP check, rushing"
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs focus:bg-white"
                      />
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                      <label className="block text-[9px] font-black uppercase text-emerald-600 font-mono">⚙️ MACHINE (Hardware)</label>
                      <textarea
                        value={ishikawaMachine}
                        onChange={(e) => setIshikawaMachine(e.target.value)}
                        placeholder="e.g. Ruptured pre-filter box, spray gun residue"
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs focus:bg-white"
                      />
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                      <label className="block text-[9px] font-black uppercase text-amber-600 font-mono">📦 MATERIAL (Stock)</label>
                      <textarea
                        value={ishikawaMaterial}
                        onChange={(e) => setIshikawaMaterial(e.target.value)}
                        placeholder="e.g. High static doors attracting dust particles"
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs focus:bg-white"
                      />
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                      <label className="block text-[9px] font-black uppercase text-violet-600 font-mono">📋 METHODS (SOPs)</label>
                      <textarea
                        value={ishikawaMethods}
                        onChange={(e) => setIshikawaMethods(e.target.value)}
                        placeholder="e.g. PMC maintenance schedule skipped, no checklist"
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs focus:bg-white"
                      />
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                      <label className="block text-[9px] font-black uppercase text-rose-600 font-mono">🌍 MILIEU (Environment)</label>
                      <textarea
                        value={ishikawaMilieu}
                        onChange={(e) => setIshikawaMilieu(e.target.value)}
                        placeholder="e.g. Ambient draft in paint zone, static charge levels"
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs focus:bg-white"
                      />
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                      <label className="block text-[9px] font-black uppercase text-cyan-600 font-mono">📏 MEASUREMENT</label>
                      <textarea
                        value={ishikawaMeasurement}
                        onChange={(e) => setIshikawaMeasurement(e.target.value)}
                        placeholder="e.g. Visual inspection only, missing automated scanner"
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3.2: 5-Whys Flow */}
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-black text-violet-600 uppercase tracking-widest font-mono border-b pb-2 flex items-center gap-1.5">
                  <span>⛓️ Step 3.2: Root Cause Analysis (5-Whys Chain)</span>
                </h4>

                <div className="max-w-xl mx-auto space-y-3">
                  {[
                    { label: "Why 1 (The Defect)", value: why1_col1, setter: setWhy1_col1, placeholder: "e.g. Micro-dust particles on the side door surface" },
                    { label: "Why 2 (Immediate Cause)", value: why2_col1, setter: setWhy2_col1, placeholder: "e.g. Air flow blower introduced ambient airborne particles" },
                    { label: "Why 3 (Process Cause)", value: why3_col1, setter: setWhy3_col1, placeholder: "e.g. HEPA intake pre-filter media was torn" },
                    { label: "Why 4 (Technical Root)", value: why4_col1, setter: setWhy4_col1, placeholder: "e.g. Filter pressure differential check was not carried out" },
                    { label: "Why 5 (Systemic Root)", value: why5_col1, setter: setWhy5_col1, placeholder: "e.g. Preventative Maintenance schedule did not have the task logged" }
                  ].map((w, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <div className="w-full bg-white p-3 rounded-xl border border-slate-200 shadow-3xs flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                          W{idx + 1}
                        </div>
                        <div className="flex-1">
                          <label className="block text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">{w.label}</label>
                          <input
                            type="text"
                            value={w.value}
                            onChange={(e) => w.setter(e.target.value)}
                            placeholder={w.placeholder}
                            className="w-full bg-slate-50/40 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 font-semibold"
                          />
                        </div>
                      </div>
                      {idx < 4 && (
                        <div className="my-1 text-slate-400 font-bold font-mono animate-bounce text-[10px]">
                          ↓ Why?
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PERMANENT CORRECTIVE PLANS & EVIDENCE */}
          {formStep === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono">Step 4.1: Permanent Corrective Actions</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Eliminate the technical and systemic root cause permanently.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCorrectiveRow}
                    className="bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs px-3 py-1.5 rounded-lg font-black uppercase font-mono transition flex items-center space-x-1 border border-violet-100"
                  >
                    <span>+ Add Solution</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {correctiveActions.map((ca, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-3xs relative group">
                      <button
                        type="button"
                        onClick={() => {
                          if (correctiveActions.length > 1) {
                            setCorrectiveActions(prev => prev.filter((_, idx) => idx !== i));
                          }
                        }}
                        className="absolute right-2 top-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="sm:col-span-5">
                        <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Permanent Solution Measure</label>
                        <input
                          type="text"
                          value={ca.measure}
                          onChange={(e) => {
                            const copy = [...correctiveActions];
                            copy[i].measure = e.target.value;
                            setCorrectiveActions(copy);
                          }}
                          placeholder="e.g. Install dual metal pre-filters and update PMS scheduler"
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Responsible Owner</label>
                        <input
                          type="text"
                          value={ca.responsible}
                          onChange={(e) => {
                            const copy = [...correctiveActions];
                            copy[i].responsible = e.target.value;
                            setCorrectiveActions(copy);
                          }}
                          placeholder="Arjun Mehra"
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Deadline Date</label>
                        <input
                          type="date"
                          value={ca.deadline}
                          onChange={(e) => {
                            const copy = [...correctiveActions];
                            copy[i].deadline = e.target.value;
                            setCorrectiveActions(copy);
                          }}
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Status</label>
                        <select
                          value={ca.status}
                          onChange={(e) => {
                            const copy = [...correctiveActions];
                            copy[i].status = e.target.value as any;
                            setCorrectiveActions(copy);
                          }}
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-2 py-1 text-xs font-mono font-bold text-slate-700"
                        >
                          <option value="planned">Planned</option>
                          <option value="in-progress">In-Progress</option>
                          <option value="completed">Completed</option>
                          <option value="proven">Proven (verified)</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 4.2: Evidence of Effectiveness (Two Options: Data Graph vs Photo Upload) */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono flex items-center gap-1.5">
                      <span>📊 Step 4.2: Evidence & Verification Options</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      Choose between entering defect reduction data (generates trend graph) or uploading photo evidence.
                    </p>
                  </div>

                  {/* TWO OPTION TOGGLE */}
                  <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-3xs font-mono text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setEvidenceType('data')}
                      className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${evidenceType === 'data'
                          ? 'bg-emerald-600 text-white shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>Option 1: Data (Date & Defects)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEvidenceType('photo')}
                      className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${evidenceType === 'photo'
                          ? 'bg-indigo-600 text-white shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Option 2: Photo Upload</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">Effectiveness Summary Statement</label>
                  <textarea
                    value={effectivenessEvidence}
                    onChange={(e) => setEffectivenessEvidence(e.target.value)}
                    rows={2}
                    placeholder="Describe post-implementation defect reduction (e.g., Defect count dropped from 6.2 to 0.1 after PLC cycle tune)..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none text-slate-800"
                  />
                </div>

                {/* OPTION 1: DATA ENTRY FOR DEFECT REDUCTION TREND CHART */}
                {(evidenceType === 'data' || evidenceType === 'both') && (
                  <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-3xs animate-fade-in">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div>
                        <span className="text-[10px] font-black uppercase text-emerald-700 font-mono tracking-wider flex items-center space-x-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Option 1: Defect Trend Data Input</span>
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">Input dates/days and defect counts. The trend graph below updates automatically.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddDefectRow}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1.5 rounded-lg font-bold font-mono transition border border-emerald-200 flex items-center space-x-1"
                      >
                        <span>+ Add Data Point</span>
                      </button>
                    </div>

                    {/* Table of Date & Defect Count */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <th className="p-2 w-8">#</th>
                            <th className="p-2">Date / Stage Name</th>
                            <th className="p-2 w-36">Number of Defects</th>
                            <th className="p-2 text-right w-12">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {defectTrendData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="p-2 font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={row.date}
                                  onChange={(e) => handleUpdateDefectRow(idx, 'date', e.target.value)}
                                  placeholder="e.g. Day 1 (Initial)"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={row.defectsCount}
                                  onChange={(e) => handleUpdateDefectRow(idx, 'defectsCount', parseFloat(e.target.value) || 0)}
                                  className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-emerald-700"
                                />
                              </td>
                              <td className="p-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDefectRow(idx)}
                                  className="text-slate-300 hover:text-rose-600 p-1 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* GENERATED GRAPH (DEFECT REDUCTION TREND CHART - IMAGE 3) */}
                    <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-700 font-mono tracking-wider flex items-center space-x-1">
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Defect Reduction Trend Chart (Generated Graph)</span>
                        </span>
                        <span className="text-[9px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Real-time Plot ({defectTrendData.length} stages)
                        </span>
                      </div>

                      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={defectTrendData.map(d => ({ name: d.date, defects: d.defectsCount }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                              formatter={(val: any) => [`${val} Defects`, 'Defects']}
                            />
                            <Line
                              type="monotone"
                              dataKey="defects"
                              stroke="#059669"
                              strokeWidth={3}
                              dot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                              activeDot={{ r: 8, fill: '#10b981' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* OPTION 2: PHOTO UPLOAD */}
                {(evidenceType === 'photo' || evidenceType === 'both') && (
                  <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-3xs animate-fade-in">
                    <h5 className="text-xs font-bold text-slate-800 font-mono uppercase flex items-center space-x-1.5">
                      <Camera className="w-4 h-4 text-indigo-600" />
                      <span>Option 2: Photo Upload & Visual Evidence</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">Upload Image File</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => setSketchPhoto(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                          id="photo-upload-step4"
                        />
                        <label
                          htmlFor="photo-upload-step4"
                          className="w-full bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl px-4 py-3 flex items-center justify-center space-x-2 cursor-pointer transition text-xs font-bold text-indigo-600 font-mono"
                        >
                          <Upload className="w-4 h-4 text-indigo-500" />
                          <span>Choose Photo File</span>
                        </label>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">Or Visual Image URL</label>
                        <input
                          type="text"
                          value={sketchPhoto}
                          onChange={(e) => setSketchPhoto(e.target.value)}
                          placeholder="Paste image URL..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                        />
                      </div>
                    </div>

                    {sketchPhoto && (
                      <div className="mt-3 flex items-center space-x-3 pt-3 border-t border-slate-100">
                        <img src={sketchPhoto} alt="Evidence" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                        <div>
                          <span className="text-[10px] font-black uppercase text-emerald-600 font-mono block">PHOTO ATTACHED</span>
                          <button
                            type="button"
                            onClick={() => setSketchPhoto('')}
                            className="text-[10px] font-mono text-rose-600 hover:underline font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: STANDARDIZATION, READ ACROSS & SIGN-OFF */}
          {formStep === 5 && (
            <div className="space-y-6 animate-fade-in">
              {/* Step 5.1: Standardization */}
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono">Step 5.1: Standardization Measures (SOPs, control plans)</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Locks standard practices to prevent relapse.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddStandardizationRow}
                    className="bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs px-3 py-1.5 rounded-lg font-black uppercase font-mono transition flex items-center space-x-1 border border-violet-100"
                  >
                    <span>+ Add SOP Entry</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {standardizationActions.map((s, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-3xs relative group">
                      <button
                        type="button"
                        onClick={() => {
                          if (standardizationActions.length > 1) {
                            setStandardizationActions(prev => prev.filter((_, idx) => idx !== i));
                          }
                        }}
                        className="absolute right-2 top-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="sm:col-span-6">
                        <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">SOP / Manual / Work Instruction updated</label>
                        <input
                          type="text"
                          value={s.measure}
                          onChange={(e) => {
                            const copy = [...standardizationActions];
                            copy[i].measure = e.target.value;
                            setStandardizationActions(copy);
                          }}
                          placeholder="e.g. Integrate pre-filter daily check logs to paint workshop PMC standard ledger"
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Responsible Owner</label>
                        <input
                          type="text"
                          value={s.responsible}
                          onChange={(e) => {
                            const copy = [...standardizationActions];
                            copy[i].responsible = e.target.value;
                            setStandardizationActions(copy);
                          }}
                          placeholder="Arjun Mehra"
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Date Deployed</label>
                        <input
                          type="date"
                          value={s.date}
                          onChange={(e) => {
                            const copy = [...standardizationActions];
                            copy[i].date = e.target.value;
                            setStandardizationActions(copy);
                          }}
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 5.2: Read Across */}
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono">Step 5.2: Read Across (Lessons Shared)</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Shares the lesson learned across other parallel lines, plants, or machinery.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddReadAcrossRow}
                    className="bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs px-3 py-1.5 rounded-lg font-black uppercase font-mono transition flex items-center space-x-1 border border-violet-100"
                  >
                    <span>+ Add Read Across</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {readAcrossActions.map((r, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-3xs relative group">
                      <button
                        type="button"
                        onClick={() => {
                          if (readAcrossActions.length > 1) {
                            setReadAcrossActions(prev => prev.filter((_, idx) => idx !== i));
                          }
                        }}
                        className="absolute right-2 top-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="sm:col-span-6">
                        <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Read Across Proposal / Sourced Asset</label>
                        <input
                          type="text"
                          value={r.proposal}
                          onChange={(e) => {
                            const copy = [...readAcrossActions];
                            copy[i].proposal = e.target.value;
                            setReadAcrossActions(copy);
                          }}
                          placeholder="e.g. Send HEPA torn-alert logs checklists and SOP to Chennai & Hosur plants"
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Responsible Owner</label>
                        <input
                          type="text"
                          value={r.responsible}
                          onChange={(e) => {
                            const copy = [...readAcrossActions];
                            copy[i].responsible = e.target.value;
                            setReadAcrossActions(copy);
                          }}
                          placeholder="Vijay D."
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[8px] font-bold uppercase text-slate-400 font-mono mb-1">Target Deadline</label>
                        <input
                          type="date"
                          value={r.deadline}
                          onChange={(e) => {
                            const copy = [...readAcrossActions];
                            copy[i].deadline = e.target.value;
                            setReadAcrossActions(copy);
                          }}
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 5.3: Sign-Off */}
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-black text-violet-600 uppercase tracking-widest font-mono border-b pb-2 flex items-center gap-1.5">
                  <span>✍️ Step 5.3: Completion Signatures & Approval</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Project Leader (Prepared By) *</label>
                    <input
                      type="text"
                      required
                      value={leadOwner}
                      onChange={(e) => setLeadOwner(e.target.value)}
                      placeholder="e.g. Arjun Mehra (Automation Engineer)"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Steering Committee sign-off (Supervisor)</label>
                    <input
                      type="text"
                      value={steeringCommittee}
                      onChange={(e) => setSteeringCommittee(e.target.value)}
                      placeholder="e.g. Rajesh Patil (Steering Committee)"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex justify-between items-center border-t pt-6 mt-4 gap-4 select-none">
            <button
              type="button"
              onClick={() => {
                if (formStep > 1) {
                  setFormStep(formStep - 1);
                } else {
                  handleSetTab('register');
                }
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-xs font-black uppercase font-mono tracking-wider transition"
            >
              {formStep === 1 ? "Cancel Form" : "Back Step"}
            </button>

            <div className="flex items-center space-x-2">
              {formStep < 5 ? (
                <button
                  type="button"
                  onClick={() => {
                    // Validations
                    if (formStep === 1) {
                      if (!title) {
                        alert("Problem/Project Title is required.");
                        return;
                      }
                      if (!problemStatement) {
                        alert("Detailed Problem Statement is required.");
                        return;
                      }
                    }
                    setFormStep(formStep + 1);
                  }}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase font-mono tracking-wider shadow-md shadow-violet-100 transition"
                >
                  Next Step &rarr;
                </button>
              ) : (
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase font-mono tracking-wider shadow-md shadow-emerald-100 transition"
                >
                  Compile & Initiate BE Standard
                </button>
              )}
            </div>
          </div>

        </form>
      )}

      {currentTab === 'meeting' && (
        <PpsrReviewBoard
          reports={reports}
          onUpdateReport={onUpdateReport}
          onInspectReport={onInspectReport}
          meetings={meetings}
          onAddMeeting={onAddMeeting}
        />
      )}

      {/* MODAL 1: ADD REVIEW MEETING MINUTES */}
      {showAddMeeting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <span className="font-mono text-xs font-bold text-slate-300">LOG MINUTES OF REVIEW MEETING</span>
              <button onClick={() => setShowAddMeeting(false)} className="text-slate-400 hover:text-white transition p-1 bg-slate-800 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMeetingMinutes} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Meeting Date *</label>
                  <input
                    type="date"
                    required
                    value={mtgDate}
                    onChange={(e) => setMtgDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Next Review Date</label>
                  <input
                    type="date"
                    value={mtgNextReviewDate}
                    onChange={(e) => setMtgNextReviewDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Meeting Chairperson / Lead *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amit Mehta (Plant Quality Head)"
                  value={mtgChairperson}
                  onChange={(e) => setMtgChairperson(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Attendees (Comma separated) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunita Rao, Arjun Mehra, Rajesh Patil"
                  value={mtgAttendees}
                  onChange={(e) => setMtgAttendees(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Associate Reviewed PPSRs</label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-2 max-h-[110px] overflow-y-auto">
                  {reports.map(r => (
                    <label key={r.id} className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mtgSelectedPpsrIds.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMtgSelectedPpsrIds([...mtgSelectedPpsrIds, r.id]);
                          } else {
                            setMtgSelectedPpsrIds(mtgSelectedPpsrIds.filter(id => id !== r.id));
                          }
                        }}
                        className="rounded-sm border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <span>{r.ppsrNo}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Key Decisions & Action Plan *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Review findings, status updates, roadblocks, and next actions to drive to completion ASAP..."
                  value={mtgKeyDiscussionPoints}
                  onChange={(e) => setMtgKeyDiscussionPoints(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-slate-900 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMeeting(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider font-mono px-5 py-2 rounded-xl transition animate-pulse-subtle"
                >
                  Save Minutes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INTERACTIVE MATRIX SIDEBAR/MODAL FOR SPREADSHEET ROW EDITING */}
      {editingReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-end z-50">
          <div className="bg-white h-full w-full max-w-xl shadow-2xl border-l border-slate-200 flex flex-col animate-slideIn">

            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between shrink-0">
              <div>
                <span className="bg-yellow-400 text-yellow-950 px-2.5 py-0.5 rounded-md text-[9px] font-mono font-black uppercase tracking-widest">
                  SPREADSHEET METRICS LOG
                </span>
                <h3 className="text-sm font-black font-mono tracking-tight text-white mt-1">
                  UPDATE REVIEW • {editingReport.ppsrNo}
                </h3>
              </div>
              <button onClick={() => setEditingReport(null)} className="text-slate-400 hover:text-white transition p-1.5 bg-slate-800 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSpreadsheetMetrics} className="flex-1 overflow-y-auto p-6 space-y-5">

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <h4 className="text-[11px] font-black uppercase font-mono tracking-wide text-slate-800 mb-2">
                  BE Problem Context Info
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Standard No:</span>
                    <span className="font-bold text-slate-700">{editingReport.ppsrNo}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Project Title:</span>
                    <span className="font-bold text-slate-700 truncate block" title={editingReport.title}>{editingReport.title}</span>
                  </div>
                </div>
              </div>

              {/* JIRA, Week, Coach, CFT */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">JIRA Reference No</label>
                  <input
                    type="text"
                    placeholder="e.g. JIRA-QA-1082"
                    value={editJiraNumber}
                    onChange={(e) => setEditJiraNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">PPSR Review Week</label>
                  <input
                    type="text"
                    placeholder="e.g. WK-28"
                    value={editWeek}
                    onChange={(e) => setEditWeek(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Team Coach / Sponsor</label>
                  <input
                    type="text"
                    placeholder="e.g. Amit Mehta"
                    value={editCoach}
                    onChange={(e) => setEditCoach(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Cross Functional Team (CFT)</label>
                  <input
                    type="text"
                    placeholder="e.g. Assembly CFT"
                    value={editCft}
                    onChange={(e) => setEditCft(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Std Status, Date, Responsibility, End Date */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Standard (MF) Status</label>
                  <select
                    value={editStdStatusMF}
                    onChange={(e: any) => setEditStdStatusMF(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Standard (MF) Date</label>
                  <input
                    type="date"
                    value={editStdDate}
                    onChange={(e) => setEditStdDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Lead Responsibility</label>
                  <input
                    type="text"
                    required
                    value={editResponsibility}
                    onChange={(e) => setEditResponsibility(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-600 uppercase font-mono mb-1">PPSR End Date (Yellow Column)</label>
                  <input
                    type="date"
                    value={editPpsrEndDate}
                    onChange={(e) => setEditPpsrEndDate(e.target.value)}
                    className="w-full bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-xs font-bold text-amber-900 focus:outline-hidden focus:border-yellow-500"
                  />
                </div>
              </div>

              {/* Qty and Financial calculations */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-[11px] font-black uppercase font-mono tracking-wide text-slate-800 border-b pb-2">
                  Production vs Rejection Sizing
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Prod Qty (Before)</label>
                    <input
                      type="number"
                      value={editProdQtyBefore}
                      onChange={(e) => setEditProdQtyBefore(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Rejected Qty (Before)</label>
                    <input
                      type="number"
                      value={editRejectedQtyBefore}
                      onChange={(e) => setEditRejectedQtyBefore(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Prod Qty (After)</label>
                    <input
                      type="number"
                      value={editProdQtyAfter}
                      onChange={(e) => setEditProdQtyAfter(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Rejected Qty (After)</label>
                    <input
                      type="number"
                      value={editRejectedQtyAfter}
                      onChange={(e) => setEditRejectedQtyAfter(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Monthly Cust Demand</label>
                    <input
                      type="number"
                      value={editCustDemandQtyMonth}
                      onChange={(e) => setEditCustDemandQtyMonth(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Per Set Rejection Cost (₹)</label>
                    <input
                      type="number"
                      value={editPerSetRejectionCost}
                      onChange={(e) => setEditPerSetRejectionCost(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Real-time Math Preview box */}
                <div className="bg-slate-900 text-slate-300 p-4 rounded-xl space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span>% Rej (Before):</span>
                    <span className="text-red-400 font-bold">
                      {(editProdQtyBefore > 0 ? (editRejectedQtyBefore / editProdQtyBefore * 100) : 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>% Rej (After):</span>
                    <span className="text-emerald-400 font-bold">
                      {(editProdQtyAfter > 0 ? (editRejectedQtyAfter / editProdQtyAfter * 100) : 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1.5 mt-1.5 font-bold">
                    <span className="text-white">PROJECTED SAVINGS / MONTH:</span>
                    <span className="text-emerald-400">
                      ₹{Math.round(
                        Math.max(0,
                          (editProdQtyBefore > 0 ? (editRejectedQtyBefore / editProdQtyBefore) : 0) -
                          (editProdQtyAfter > 0 ? (editRejectedQtyAfter / editProdQtyAfter) : 0)
                        ) * editCustDemandQtyMonth * editPerSetRejectionCost
                      ).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Effectivity Results Summary</label>
                <input
                  type="text"
                  placeholder="e.g. Zero defects achieved after implementation."
                  value={editEffectivityText}
                  onChange={(e) => setEditEffectivityText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Any additional feedback or validation results..."
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex space-x-3 shrink-0 pt-4 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-xs font-black uppercase font-mono tracking-wider transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-2.5 rounded-xl text-xs font-black uppercase font-mono tracking-wider transition"
                >
                  Save Metrics
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* PPSR STEP-BY-STEP COMMITTEE PRESENTATION MODE OVERLAY */}
      {presentingReport && (
        <PpsrPresentationMode
          report={presentingReport}
          onClose={() => setPresentingReport(null)}
          onUpdateReport={onUpdateReport}
          onOpenEditMode={(report) => handleStartEditingReport(report)}
        />
      )}

    </div>
  );
}
