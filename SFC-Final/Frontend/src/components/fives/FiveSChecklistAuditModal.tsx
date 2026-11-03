import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, ShieldCheck, Sparkles, HelpCircle, Camera, Plus, Trash2 } from 'lucide-react';
import { FiveSAudit, FiveSChecklistItem, FiveSActionItem } from '../../types';

interface FiveSChecklistAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (auditData: Partial<FiveSAudit>, generatedActions: Partial<FiveSActionItem>[]) => void;
  initialArea?: string;
  initialAuditor?: string;
}

const DEFAULT_25_CHECKPOINTS: Omit<FiveSChecklistItem, 'score'>[] = [
  // 1S - Sort (Seiri)
  {
    id: '1s-1',
    pillar: '1S-Sort',
    checkpoint: 'Workstation Clutter & Gangway Clearance',
    criteria: 'Gangways, aisles, and workstations are free from unneeded raw materials, empty pallets, scrap, and personal items.',
    standard: '100% clear gangways with zero unauthorized floor storage.'
  },
  {
    id: '1s-2',
    pillar: '1S-Sort',
    checkpoint: 'Red Tag Strategy & Holding Area',
    criteria: 'Unwanted or defective items are physically tagged with a 5S Red Tag and moved to the designated Red Tag area.',
    standard: 'All aged items logged in Red Tag register; no item older than 15 days without approval.'
  },
  {
    id: '1s-3',
    pillar: '1S-Sort',
    checkpoint: 'WIP Limits & Inventory Min/Max',
    criteria: 'Work-in-progress (WIP) and incoming materials do not exceed designated yellow floor footprint limits.',
    standard: 'Max 1 shift WIP staged; zero overflowing component bins.'
  },
  {
    id: '1s-4',
    pillar: '1S-Sort',
    checkpoint: 'Defective Parts & Scrap Segregation',
    criteria: 'Non-conforming parts and rework items are segregated in marked red quarantine containers.',
    standard: 'Quarantine boxes clearly locked or segregated to prevent mix-ups.'
  },
  {
    id: '1s-5',
    pillar: '1S-Sort',
    checkpoint: 'Obsolete Documentation & Posters',
    criteria: 'Old revision drawings, outdated work instructions, and expired certificates are removed.',
    standard: 'Only current engineering revisions displayed at workstations.'
  },

  // 2S - Set In Order (Seiton)
  {
    id: '2s-1',
    pillar: '2S-SetInOrder',
    checkpoint: 'Tool Shadow Boards & Pegboards',
    criteria: 'Hand tools, pneumatic drivers, and measuring gauges have defined shadow silhouettes or foam inlays.',
    standard: 'Missing tools immediately identifiable at a glance within 5 seconds.'
  },
  {
    id: '2s-2',
    pillar: '2S-SetInOrder',
    checkpoint: 'Floor Demarcation & Aisles',
    criteria: 'Floor markings are bright, clean, and conform to plant color standards (Yellow = traffic, White = equipment).',
    standard: 'Lines crisp, no faded paint, pedestrian walkway boundaries strictly respected.'
  },
  {
    id: '2s-3',
    pillar: '2S-SetInOrder',
    checkpoint: 'Kanban Address & Part Bin Labeling',
    criteria: 'Storage racks, bins, and tables have standardized Aisle-Rack-Shelf-Bin address labels.',
    standard: 'Any new operator or auditor can locate any part in under 30 seconds.'
  },
  {
    id: '2s-4',
    pillar: '2S-SetInOrder',
    checkpoint: 'Ergonomic Reach & Golden Zone',
    criteria: 'High-frequency tools and parts are positioned within operator primary reach envelope (no bending/stretching).',
    standard: 'Primary tools within 35cm; secondary items within 60cm.'
  },
  {
    id: '2s-5',
    pillar: '2S-SetInOrder',
    checkpoint: 'Safety Equipment 1-Meter Clear Radius',
    criteria: 'Fire extinguishers, eyewash stations, first aid kits, and electrical breaker panels are completely unobstructed.',
    standard: '1-meter clearance zone painted with red/white hatch marks.'
  },

  // 3S - Shine & Inspect (Seiso)
  {
    id: '3s-1',
    pillar: '3S-Shine',
    checkpoint: 'Machine Exterior & Chip Enclosure',
    criteria: 'Machine housings, inspection shields, and plexiglass windows are wiped free of oil sludge and metal swarf.',
    standard: 'Machine surfaces clean enough to touch without glove contamination.'
  },
  {
    id: '3s-2',
    pillar: '3S-Shine',
    checkpoint: 'Epoxy Floor Cleanliness & Slip Hazards',
    criteria: 'Floors are dry, swept, and free of oil drips, coolant puddles, water leaks, and tripping hazards.',
    standard: 'Zero wet spots; immediate spill response station operational.'
  },
  {
    id: '3s-3',
    pillar: '3S-Shine',
    checkpoint: 'Source of Contamination (SOC) Abatement',
    criteria: 'Leaks, overspray, and chips are contained at the source with guards, wipers, or drip pans.',
    standard: 'Active SOC mitigation log with assigned countermeasures.'
  },
  {
    id: '3s-4',
    pillar: '3S-Shine',
    checkpoint: '5S Cleaning Tool Station',
    criteria: 'Brooms, squeegees, dustpans, and degreaser bottles are stored in a dedicated, color-coded shadow rack.',
    standard: 'Cleaning tools neatly hung up, clean, and in good condition.'
  },
  {
    id: '3s-5',
    pillar: '3S-Shine',
    checkpoint: 'Daily 5-Min Clean-to-Inspect Routine',
    criteria: 'Operators perform the mandatory 5-minute shift-end cleaning-as-inspection routine and sign the log sheet.',
    standard: 'Daily checklist completed for 100% of shifts.'
  },

  // 4S - Standardize (Seiketsu)
  {
    id: '4s-1',
    pillar: '4S-Standardize',
    checkpoint: 'Visual Gauge Limits & Sight Glasses',
    criteria: 'Pressure gauges, temperature dials, and oil sight glasses have green normal zones and red warning lines.',
    standard: 'Operating state visible and verifiable from 2 meters away.'
  },
  {
    id: '4s-2',
    pillar: '4S-Standardize',
    checkpoint: 'Bolt Torque Match-Marking',
    criteria: 'Torque seal witness lines (match-marks) are applied across critical fastener heads and mating surfaces.',
    standard: 'Loose bolts instantly visible without putting a wrench on them.'
  },
  {
    id: '4s-3',
    pillar: '4S-Standardize',
    checkpoint: 'Pipe Identification & Direction Arrows',
    criteria: 'Pneumatics, water lines, coolant pipes, and exhaust ducts are color-coded with directional flow arrows.',
    standard: '100% compliance with plant visual piping standard.'
  },
  {
    id: '4s-4',
    pillar: '4S-Standardize',
    checkpoint: 'One-Point Lessons (OPL) & Visual SOPs',
    criteria: 'High-quality One-Point Lessons (OPLs) and visual standard cards are posted in protective sleeves.',
    standard: 'Displayed at operator eye level with clear Before/After illustrations.'
  },
  {
    id: '4s-5',
    pillar: '4S-Standardize',
    checkpoint: '5S Zone Ownership Map',
    criteria: 'A workplace 5S responsibility map clearly identifies the zone leader, operator custodians, and boundaries.',
    standard: 'Zero unassigned shopfloor square meters.'
  },

  // 5S - Sustain (Shitsuke)
  {
    id: '5s-1',
    pillar: '5S-Sustain',
    checkpoint: 'Audit Calendar Adherence',
    criteria: 'Gemba walks, weekly area audits, and monthly cross-department audits are carried out on schedule.',
    standard: '100% adherence to planned 5S audit calendar.'
  },
  {
    id: '5s-2',
    pillar: '5S-Sustain',
    checkpoint: 'Prior Non-Conformity (CAPA) Closure',
    criteria: 'Action items and non-conformities identified in previous 5S audits are closed within the target deadline.',
    standard: 'Zero overdue high-priority CAPA actions.'
  },
  {
    id: '5s-3',
    pillar: '5S-Sustain',
    checkpoint: 'Habitual Discipline & PPE Adherence',
    criteria: 'Operators adhere to safety glasses, safety shoes, and 5S return-to-place discipline without policing.',
    standard: 'Spontaneous compliance ingrained as shopfloor culture.'
  },
  {
    id: '5s-4',
    pillar: '5S-Sustain',
    checkpoint: '5S Kaizen Engagement',
    criteria: 'Operators and cell teams proactively log 5S continuous improvement ideas on the Kaizen tracker.',
    standard: 'At least 1 5S-related Kaizen registered per zone per month.'
  },
  {
    id: '5s-5',
    pillar: '5S-Sustain',
    checkpoint: 'Visual 5S Communication Board',
    criteria: 'The zone 5S notice board displays up-to-date radar charts, audit scores, awards, and Before/After photos.',
    standard: 'Board refreshed weekly; accessible to all shifts.'
  }
];

export default function FiveSChecklistAuditModal({
  isOpen,
  onClose,
  onSubmit,
  initialArea = 'Assembly Line A (Pune)',
  initialAuditor = 'Amit Mehta (Kaizen Lead)'
}: FiveSChecklistAuditModalProps) {
  const [area, setArea] = useState(initialArea);
  const [plantZone, setPlantZone] = useState('Plant 1 - Final Assembly');
  const [auditor, setAuditor] = useState(initialAuditor);
  const [shift, setShift] = useState<'Shift 1' | 'Shift 2' | 'General Shift'>('Shift 1');
  const [auditType, setAuditType] = useState<'Daily Gemba' | 'Weekly Area Audit' | 'Monthly Cross-Plant Audit'>('Weekly Area Audit');
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Checklist item scores (map of checkpoint ID -> score 1-5, findings, etc.)
  const [items, setItems] = useState<FiveSChecklistItem[]>(() =>
    DEFAULT_25_CHECKPOINTS.map((c) => ({
      ...c,
      score: 4,
      findingNotes: ''
    }))
  );

  const [activePillarFilter, setActivePillarFilter] = useState<'ALL' | '1S-Sort' | '2S-SetInOrder' | '3S-Shine' | '4S-Standardize' | '5S-Sustain'>('ALL');
  const [remarks, setRemarks] = useState('');
  const [strengthNote, setStrengthNote] = useState('Operators maintain tool shadow boards diligently.');
  const [opportunityNote, setOpportunityNote] = useState('Address swarf buildup in machine corners.');

  if (!isOpen) return null;

  // Calculate scores
  const getPillarItems = (pillar: string) => items.filter((i) => i.pillar === pillar);
  const getPillarAverage = (pillar: string) => {
    const pItems = getPillarItems(pillar);
    if (!pItems.length) return 0;
    const sum = pItems.reduce((acc, cur) => acc + cur.score, 0);
    return Number((sum / pItems.length).toFixed(2));
  };

  const sortAvg = getPillarAverage('1S-Sort');
  const orderAvg = getPillarAverage('2S-SetInOrder');
  const shineAvg = getPillarAverage('3S-Shine');
  const standardizeAvg = getPillarAverage('4S-Standardize');
  const sustainAvg = getPillarAverage('5S-Sustain');

  const totalPoints = items.reduce((acc, cur) => acc + cur.score, 0);
  const maxPoints = items.length * 5;
  const totalScorePercent = Math.round((totalPoints / maxPoints) * 100);

  let calculatedGrade: 'A+' | 'A' | 'B' | 'C' = 'C';
  let calculatedStatus: 'Excellent' | 'Good' | 'Needs Improvement' = 'Needs Improvement';
  if (totalScorePercent >= 90) {
    calculatedGrade = 'A+';
    calculatedStatus = 'Excellent';
  } else if (totalScorePercent >= 80) {
    calculatedGrade = 'A';
    calculatedStatus = 'Excellent';
  } else if (totalScorePercent >= 65) {
    calculatedGrade = 'B';
    calculatedStatus = 'Good';
  }

  // Handle score change
  const handleScoreChange = (id: string, newScore: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, score: newScore } : item))
    );
  };

  const handleNotesChange = (id: string, notes: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, findingNotes: notes } : item))
    );
  };

  // Find all low score items (score <= 2) to auto-generate corrective actions
  const lowScoreItems = items.filter((i) => i.score <= 2);

  const handleSubmitAudit = (e: React.FormEvent) => {
    e.preventDefault();

    // Auto-create CAPA actions for items with score <= 2
    const generatedActions: Partial<FiveSActionItem>[] = lowScoreItems.map((item) => ({
      pillar: item.pillar.split('-')[0] as any,
      findingDescription: `[${item.checkpoint}] Non-compliant: ${item.criteria}. ${item.findingNotes || ''}`.trim(),
      rootCause: item.findingNotes ? `Identified during audit: ${item.findingNotes}` : 'Standard discipline gap or missing visual fixture',
      correctiveAction: `Standardize and rectify according to benchmark: ${item.standard}`,
      area,
      assignedTo: 'Area Leader',
      targetDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'Open',
      priority: item.score === 1 ? 'Critical' : 'High'
    }));

    const auditPayload: Partial<FiveSAudit> = {
      area,
      plantZone,
      auditor,
      shift,
      auditType,
      auditDate,
      sortScore: sortAvg,
      setInOrderScore: orderAvg,
      shineScore: shineAvg,
      standardizeScore: standardizeAvg,
      sustainScore: sustainAvg,
      totalScore: totalScorePercent,
      grade: calculatedGrade,
      status: calculatedStatus,
      remarks: remarks || `5S Workplace Audit completed. Overall adherence ${totalScorePercent}%.`,
      checklist: items,
      strengths: strengthNote ? [strengthNote] : [],
      opportunities: opportunityNote ? [opportunityNote] : []
    };

    onSubmit(auditPayload, generatedActions);
    onClose();
  };

  const filteredItems = activePillarFilter === 'ALL'
    ? items
    : items.filter((i) => i.pillar === activePillarFilter);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white w-[96vw] max-w-[96vw] h-[94vh] max-h-[94vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight uppercase flex items-center gap-2">
                25-Point Industrial 5S Audit Execution
                <span className="text-[10px] bg-blue-500/30 text-blue-300 font-mono px-2 py-0.5 rounded-full border border-blue-400/30">
                  STANDARD SHOPFLOOR AUDIT
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Comprehensive 5S evaluation across Seiri, Seiton, Seiso, Seiketsu, and Shitsuke.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Metadata Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs shrink-0">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono mb-1">
              Shopfloor Area
            </label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Assembly Line A (Pune)">Assembly Line A (Pune)</option>
              <option value="BPV Line 2 - Pune">BPV Line 2 - Pune</option>
              <option value="Hosur Machine Shop">Hosur Machine Shop</option>
              <option value="Welding Shop - Chennai">Welding Shop - Chennai</option>
              <option value="Paint Shop - Hosur">Paint Shop - Hosur</option>
              <option value="Dispatch Warehouse">Dispatch Warehouse</option>
              <option value="Tool Room & Die Maintenance">Tool Room &amp; Die Maintenance</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono mb-1">
              Plant Division / Zone
            </label>
            <input
              type="text"
              value={plantZone}
              onChange={(e) => setPlantZone(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono mb-1">
              Auditor Name
            </label>
            <input
              type="text"
              value={auditor}
              onChange={(e) => setAuditor(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono mb-1">
              Operating Shift
            </label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Shift 1">Shift 1 (Morning)</option>
              <option value="Shift 2">Shift 2 (Evening)</option>
              <option value="General Shift">General Shift</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono mb-1">
              Audit Scope
            </label>
            <select
              value={auditType}
              onChange={(e) => setAuditType(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Daily Gemba">Daily Gemba Walk</option>
              <option value="Weekly Area Audit">Weekly Area Audit</option>
              <option value="Monthly Cross-Plant Audit">Monthly Cross-Plant Audit</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono mb-1">
              Audit Date
            </label>
            <input
              type="date"
              value={auditDate}
              onChange={(e) => setAuditDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Live Scorecard Bar */}
        <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 text-white flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center space-x-5">
            <div>
              <span className="block text-[9px] font-black font-mono text-slate-400 uppercase tracking-wider">
                OVERALL 5S SCORE
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black font-mono text-blue-400">
                  {totalScorePercent}%
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono uppercase ${
                  calculatedGrade === 'A+' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                  calculatedGrade === 'A' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                  calculatedGrade === 'B' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  Grade {calculatedGrade} · {calculatedStatus}
                </span>
              </div>
            </div>

            <div className="hidden sm:flex items-center space-x-3 text-[10px] font-mono border-l border-slate-800 pl-4">
              <div className="text-center">
                <span className="text-slate-400 block font-bold">1S SORT</span>
                <span className="font-black text-rose-400">{sortAvg}/5</span>
              </div>
              <div className="text-center">
                <span className="text-slate-400 block font-bold">2S ORDER</span>
                <span className="font-black text-amber-400">{orderAvg}/5</span>
              </div>
              <div className="text-center">
                <span className="text-slate-400 block font-bold">3S SHINE</span>
                <span className="font-black text-emerald-400">{shineAvg}/5</span>
              </div>
              <div className="text-center">
                <span className="text-slate-400 block font-bold">4S STD</span>
                <span className="font-black text-blue-400">{standardizeAvg}/5</span>
              </div>
              <div className="text-center">
                <span className="text-slate-400 block font-bold">5S SUST</span>
                <span className="font-black text-violet-400">{sustainAvg}/5</span>
              </div>
            </div>
          </div>

          {lowScoreItems.length > 0 && (
            <div className="flex items-center space-x-2 bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 rounded-xl text-rose-300 text-xs font-bold font-mono">
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>{lowScoreItems.length} Non-Conformities (CAPA will auto-generate)</span>
            </div>
          )}
        </div>

        {/* Pillar Filter Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6 pt-2 gap-2 overflow-x-auto shrink-0">
          {[
            { id: 'ALL', label: 'All 25 Checkpoints', count: 25 },
            { id: '1S-Sort', label: '1S Seiri (Sort)', count: 5, color: 'text-rose-600' },
            { id: '2S-SetInOrder', label: '2S Seiton (Set In Order)', count: 5, color: 'text-amber-600' },
            { id: '3S-Shine', label: '3S Seiso (Shine)', count: 5, color: 'text-emerald-600' },
            { id: '4S-Standardize', label: '4S Seiketsu (Standardize)', count: 5, color: 'text-blue-600' },
            { id: '5S-Sustain', label: '5S Shitsuke (Sustain)', count: 5, color: 'text-violet-600' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivePillarFilter(tab.id as any)}
              className={`pb-2.5 px-3 font-mono text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activePillarFilter === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Checklist Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/60">
          {filteredItems.map((item, index) => {
            const isLowScore = item.score <= 2;
            const pillarBadgeColor =
              item.pillar === '1S-Sort' ? 'bg-rose-100 text-rose-700 border-rose-200' :
              item.pillar === '2S-SetInOrder' ? 'bg-amber-100 text-amber-700 border-amber-200' :
              item.pillar === '3S-Shine' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
              item.pillar === '4S-Standardize' ? 'bg-blue-100 text-blue-700 border-blue-200' :
              'bg-violet-100 text-violet-700 border-violet-200';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isLowScore
                    ? 'bg-rose-50/50 border-rose-300 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left Column: Criteria details */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono border ${pillarBadgeColor}`}>
                        {item.pillar.split('-')[0]}
                      </span>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                        {item.checkpoint}
                      </h4>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.criteria}
                    </p>

                    <div className="text-[11px] text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/60 font-mono">
                      <span className="font-bold text-slate-700">Standard: </span>
                      {item.standard}
                    </div>
                  </div>

                  {/* Right Column: 1-5 Scoring selector */}
                  <div className="shrink-0 flex flex-col items-end space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Rating (1 = Fail, 5 = Benchmark)
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleScoreChange(item.id, s)}
                          className={`w-9 h-9 rounded-xl font-mono text-xs font-black transition-all ${
                            item.score === s
                              ? s >= 4
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500 ring-offset-1'
                                : s === 3
                                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-400 ring-offset-1'
                                : 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-500 ring-offset-1'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    <span className="text-[10px] font-mono font-bold">
                      {item.score === 5 && <span className="text-emerald-600">★ 5 - World Class Standard</span>}
                      {item.score === 4 && <span className="text-emerald-700">✓ 4 - Compliant &amp; Maintained</span>}
                      {item.score === 3 && <span className="text-amber-600">▲ 3 - Acceptable / Minor Gap</span>}
                      {item.score === 2 && <span className="text-rose-600">✕ 2 - Non-Compliant Gap</span>}
                      {item.score === 1 && <span className="text-rose-700 font-black">⚠ 1 - Critical Failure</span>}
                    </span>
                  </div>
                </div>

                {/* Optional observation/finding notes row */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center space-x-3">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase shrink-0">
                    Observation Note:
                  </span>
                  <input
                    type="text"
                    value={item.findingNotes || ''}
                    onChange={(e) => handleNotesChange(item.id, e.target.value)}
                    placeholder={
                      isLowScore
                        ? 'REQUIRED: Describe exact abnormality and immediate action needed...'
                        : 'Optional comment or praise on visual adherence...'
                    }
                    className={`flex-1 text-xs px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-2 ${
                      isLowScore
                        ? 'border-rose-300 bg-rose-50 text-rose-900 focus:ring-rose-500 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700 focus:ring-blue-500'
                    }`}
                  />
                </div>
              </div>
            );
          })}

          {/* Qualitative Section: Strengths, Opportunities & Remarks */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">
              📝 Qualitative Evaluation &amp; Auditor Assessment
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-emerald-700 font-mono mb-1">
                  🌟 Top Observed Strength
                </label>
                <input
                  type="text"
                  value={strengthNote}
                  onChange={(e) => setStrengthNote(e.target.value)}
                  placeholder="e.g. Shadow boards pristine and gangways 100% clean"
                  className="w-full text-xs px-3 py-2 bg-emerald-50/50 border border-emerald-200 rounded-xl font-medium text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-amber-700 font-mono mb-1">
                  🔍 Top Opportunity for Improvement
                </label>
                <input
                  type="text"
                  value={opportunityNote}
                  onChange={(e) => setOpportunityNote(e.target.value)}
                  placeholder="e.g. Install splash shield to contain CNC coolant drip"
                  className="w-full text-xs px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl font-medium text-amber-950 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 font-mono mb-1">
                General Auditor Remarks &amp; Feedback
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Summarize overall plant performance, shift discipline, and recommendations..."
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-mono">
            {lowScoreItems.length > 0 ? (
              <span className="text-rose-600 font-bold">
                ⚠️ {lowScoreItems.length} corrective actions will automatically be queued into the 5S CAPA Tracker.
              </span>
            ) : (
              <span className="text-emerald-600 font-bold">
                ✓ All 25 checkpoints meet or exceed acceptable standards.
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition w-full sm:w-auto font-mono"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitAudit}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 w-full sm:w-auto font-mono"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Record &amp; Finalize 5S Audit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
