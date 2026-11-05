import React, { useState } from 'react';
import {
  Shield,
  Globe,
  Cpu,
  User,
  Briefcase,
  FileCheck,
  CheckCircle2
} from 'lucide-react';

export interface IshikawaCausesData {
  ppe: string[];
  environmental: string[];
  machineEquipment: string[];
  injuredPerson: string[];
  management: string[];
  jobProcedure: string[];
}

interface AccidentFishboneDiagramProps {
  causes?: IshikawaCausesData;
  problemTitle?: string;
  interactive?: boolean;
  onToggleCause?: (
    category: keyof IshikawaCausesData,
    item: string
  ) => void;
  compact?: boolean;
}

const EHS_CATEGORY_OPTIONS: Record<keyof IshikawaCausesData, string[]> = {
  ppe: [
    'PPE not available',
    'PPE not specified',
    'Improper use of PPE',
    'PPE not in good condition',
    'Operator not wear handgloves'
  ],
  environmental: [
    'Floor/Aisle not in good condition',
    'Inadequate work space',
    'Noise level was high',
    'Poor Illumination',
    'Location was Dusty / Smoky'
  ],
  machineEquipment: [
    'Defective Machine / Equipment',
    'Inspection Procedure was not followed',
    'Faulty machine design',
    'Unusable Machine',
    'Sharp edge/oily/odd size material',
    'Chemical (corrosive / toxic / flammable)'
  ],
  injuredPerson: [
    'Failure to follow SOP',
    'Inadequate job experience',
    'Inadequate training',
    'Physically unsuitable',
    'Employee under stress',
    'Improper body posture',
    'Operator Negligence'
  ],
  management: [
    'Failure to detect/report unsafe act/condition',
    'Failure to correct Unsafe condition',
    'Lack of training to Supervisor',
    'Hazards/SOP not communicated to employee',
    'Lack of supervision'
  ],
  jobProcedure: [
    'SOP not prepared',
    'SOP did not cover Unsafe act or condition',
    'Wrong substitute used (make shift arrangement)'
  ]
};

export default function AccidentFishboneDiagram({
  causes,
  problemTitle = 'CUT INJURY ON LEFT HAND THUMB',
  interactive = false,
  onToggleCause,
  compact = false
}: AccidentFishboneDiagramProps) {
  const [hoveredCategory, setHoveredCategory] = useState<keyof IshikawaCausesData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<keyof IshikawaCausesData | null>(null);

  const data: IshikawaCausesData = causes || {
    ppe: [],
    environmental: [],
    machineEquipment: [],
    injuredPerson: [],
    management: [],
    jobProcedure: []
  };

  const isCauseMatched = (category: keyof IshikawaCausesData, optionLabel: string) => {
    const list = data[category] || [];
    const normTarget = optionLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
    return list.some(entry => {
      const normEntry = entry.toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        normEntry.includes(normTarget.slice(0, 16)) ||
        normTarget.includes(normEntry.slice(0, 16))
      );
    });
  };

  const categories: {
    key: keyof IshikawaCausesData;
    title: string;
    shortTitle: string;
    icon: React.ComponentType<any>;
    color: string;
    lightBg: string;
    list: string[];
    allOptions: string[];
    xStart: number;
    xSpine: number;
    yStart: number;
    isTop: boolean;
  }[] = [
    {
      key: 'ppe',
      title: 'PERSONAL PROTECTIVE EQUIPMENT',
      shortTitle: 'PPE',
      icon: Shield,
      color: '#6366f1', // Indigo
      lightBg: '#e0e7ff',
      list: data.ppe || [],
      allOptions: EHS_CATEGORY_OPTIONS.ppe,
      xStart: 140,
      xSpine: 225,
      yStart: 52,
      isTop: true
    },
    {
      key: 'environmental',
      title: 'ENVIRONMENTAL CONDITIONS',
      shortTitle: 'ENVIRONMENT',
      icon: Globe,
      color: '#10b981', // Emerald
      lightBg: '#d1fae5',
      list: data.environmental || [],
      allOptions: EHS_CATEGORY_OPTIONS.environmental,
      xStart: 325,
      xSpine: 410,
      yStart: 52,
      isTop: true
    },
    {
      key: 'machineEquipment',
      title: 'MACHINE & RAW MATERIAL',
      shortTitle: 'MACHINE/MATL',
      icon: Cpu,
      color: '#f59e0b', // Amber
      lightBg: '#fef3c7',
      list: data.machineEquipment || [],
      allOptions: EHS_CATEGORY_OPTIONS.machineEquipment,
      xStart: 510,
      xSpine: 595,
      yStart: 52,
      isTop: true
    },
    {
      key: 'injuredPerson',
      title: 'INJURED PERSON',
      shortTitle: 'INJURED PERSON',
      icon: User,
      color: '#8b5cf6', // Violet
      lightBg: '#ede9fe',
      list: data.injuredPerson || [],
      allOptions: EHS_CATEGORY_OPTIONS.injuredPerson,
      xStart: 140,
      xSpine: 225,
      yStart: 368,
      isTop: false
    },
    {
      key: 'management',
      title: 'MANAGEMENT',
      shortTitle: 'MANAGEMENT',
      icon: Briefcase,
      color: '#f43f5e', // Rose
      lightBg: '#ffe4e6',
      list: data.management || [],
      allOptions: EHS_CATEGORY_OPTIONS.management,
      xStart: 325,
      xSpine: 410,
      yStart: 368,
      isTop: false
    },
    {
      key: 'jobProcedure',
      title: 'JOB PROCEDURE',
      shortTitle: 'JOB PROCEDURE',
      icon: FileCheck,
      color: '#06b6d4', // Cyan
      lightBg: '#ecfeff',
      list: data.jobProcedure || [],
      allOptions: EHS_CATEGORY_OPTIONS.jobProcedure,
      xStart: 510,
      xSpine: 595,
      yStart: 368,
      isTop: false
    }
  ];

  const totalIdentified = categories.reduce((acc, c) => acc + c.list.length, 0);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl overflow-hidden p-4 sm:p-5 shadow-md relative">
      {/* Subtle PPSR Tech Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-40 pointer-events-none" />

      {/* Top Header Bar (Inspired by PPSR Ishikawa Engine) */}
      <div className="relative flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 mb-3 gap-2">
        <div className="flex items-center space-x-2.5">
          <span className="text-[10px] font-black tracking-widest text-indigo-700 uppercase font-mono bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
            PPSR-Style Fishbone Engine
          </span>
          <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight">
            Ishikawa 6-Category Accident Cause-and-Effect Skeleton
          </h3>
        </div>

        <div className="flex items-center space-x-2 font-mono text-[10px]">
          <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">
            {totalIdentified} Active Cause{totalIdentified === 1 ? '' : 's'} Identified
          </span>
        </div>
      </div>

      {/* Main PPSR-Inspired Fishbone SVG Canvas */}
      <div className="relative w-full overflow-x-auto bg-slate-50/60 rounded-2xl border border-slate-200 p-3">
        <svg
          viewBox="0 0 850 420"
          className="w-full min-w-[740px] h-auto transition-all"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="safetyBackboneGrad" gradientUnits="userSpaceOnUse" x1="25" y1="210" x2="685" y2="210">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            <marker
              id="safetySpineArrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#dc2626" />
            </marker>

            <filter id="safetyGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="safetySoftShadow" filterUnits="userSpaceOnUse" x="-50" y="-50" width="950" height="520">
              <feDropShadow dx="1" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.1" />
            </filter>
          </defs>

          {/* Fish Tail (Left-hand side) */}
          <g>
            <path
              d="M 52,210 L 12,138 L 26,210 L 12,282 Z"
              fill="#f8fafc"
              stroke="#64748b"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M 34,178 L 18,162 M 38,198 L 20,192 M 38,222 L 20,228 M 34,242 L 18,258"
              stroke="#94a3b8"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>

          {/* Solid Backing Center Spine */}
          <line
            x1="26"
            y1="210"
            x2="685"
            y2="210"
            stroke="#475569"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Gradient Central Spine */}
          <line
            x1="26"
            y1="210"
            x2="685"
            y2="210"
            stroke="url(#safetyBackboneGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            markerEnd="url(#safetySpineArrow)"
          />

          {/* Spine Label Pill */}
          <g transform="translate(355, 210)">
            <rect
              x="-165"
              y="-10"
              width="330"
              height="20"
              rx="10"
              fill="#0f172a"
              stroke="#334155"
              strokeWidth="1"
              opacity="0.92"
            />
            <text
              x="0"
              y="3.5"
              textAnchor="middle"
              fill="#f8fafc"
              fontSize="7.5"
              fontWeight="900"
              fontFamily="monospace"
              letterSpacing="0.8"
            >
              UNSAFE CONDITIONS &amp; ACTS CONTRIBUTING TO ACCIDENT
            </text>
          </g>

          {/* Dashed continuation into Fish Head */}
          <line
            x1="685"
            y1="210"
            x2="715"
            y2="210"
            stroke="#dc2626"
            strokeWidth="2.5"
            strokeDasharray="4 2"
          />

          {/* Rib Bone Connection Nodes on Spine */}
          <g stroke="#94a3b8" strokeWidth="2">
            <circle cx="225" cy="210" r="4" fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
            <circle cx="410" cy="210" r="4" fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
            <circle cx="595" cy="210" r="4" fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
          </g>

          {/* 6 CATEGORY RIB BONES */}
          {categories.map((cat) => {
            const isHovered = hoveredCategory === cat.key;
            const isSelected = selectedCategory === cat.key;
            const isHighlighted = isHovered || isSelected;
            const hasCauses = cat.list.length > 0;
            const CatIcon = cat.icon;

            // Show identified causes on the bone; if none in this category yet, show top options in muted style so the bone is always informative
            const branchesToRender =
              cat.list.length > 0
                ? cat.list.map(label => ({ label, active: true }))
                : cat.allOptions.slice(0, 3).map(label => ({ label, active: false }));

            return (
              <g
                key={cat.key}
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => setHoveredCategory(cat.key)}
                onMouseLeave={() => setHoveredCategory(null)}
                onClick={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
              >
                {/* Glow on hover/selection */}
                {isHighlighted && (
                  <line
                    x1={cat.xStart}
                    y1={cat.yStart}
                    x2={cat.xSpine}
                    y2={210}
                    stroke={cat.color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="0.25"
                    filter="url(#safetyGlowFilter)"
                  />
                )}

                {/* Primary Diagonal Rib Bone */}
                <line
                  x1={cat.xStart}
                  y1={cat.yStart}
                  x2={cat.xSpine}
                  y2={210}
                  stroke={isHighlighted || hasCauses ? cat.color : '#94a3b8'}
                  strokeWidth={isHighlighted ? '3.2' : hasCauses ? '2.4' : '1.6'}
                  strokeLinecap="round"
                />

                {/* Category Badge at Outer End of Rib */}
                <g filter="url(#safetySoftShadow)">
                  <rect
                    x={cat.xStart - 72}
                    y={cat.isTop ? cat.yStart - 32 : cat.yStart + 6}
                    width="144"
                    height="26"
                    rx="7"
                    fill={isHighlighted ? cat.color : '#ffffff'}
                    stroke={hasCauses || isHighlighted ? cat.color : '#cbd5e1'}
                    strokeWidth="1.8"
                  />

                  {/* Category Short Title */}
                  <text
                    x={cat.xStart + 6}
                    y={cat.isTop ? cat.yStart - 15 : cat.yStart + 22}
                    textAnchor="middle"
                    fill={isHighlighted ? '#ffffff' : hasCauses ? '#0f172a' : '#64748b'}
                    fontSize="8.5"
                    fontWeight="900"
                    fontFamily="monospace"
                    className="select-none"
                  >
                    {cat.shortTitle}
                  </text>

                  {/* Category Icon */}
                  <g
                    transform={`translate(${cat.xStart - 62}, ${
                      cat.isTop ? cat.yStart - 27 : cat.yStart + 11
                    }) scale(0.62)`}
                  >
                    <circle cx="12" cy="12" r="14" fill={isHighlighted ? '#ffffff' : cat.lightBg} />
                    <foreignObject x="4" y="4" width="16" height="16">
                      <CatIcon
                        className="w-4 h-4"
                        style={{ color: cat.color }}
                      />
                    </foreignObject>
                  </g>

                  {/* Active Cause Count Badge */}
                  {hasCauses && (
                    <g
                      transform={`translate(${cat.xStart + 54}, ${
                        cat.isTop ? cat.yStart - 25 : cat.yStart + 13
                      })`}
                    >
                      <circle
                        cx="6"
                        cy="6"
                        r="6.5"
                        fill={isHighlighted ? '#ffffff' : cat.color}
                      />
                      <text
                        x="6"
                        y="9.5"
                        textAnchor="middle"
                        fill={isHighlighted ? cat.color : '#ffffff'}
                        fontSize="7.5"
                        fontWeight="bold"
                      >
                        {cat.list.length}
                      </text>
                    </g>
                  )}
                </g>

                {/* Horizontal Sub-Bones (Individual Cause Branches) */}
                {branchesToRender.map((branch, cIdx) => {
                  const count = branchesToRender.length;
                  const fraction =
                    count === 1 ? 0.52 : 0.24 + (cIdx * 0.56) / Math.max(1, count - 1);

                  const Xt = cat.xStart + fraction * (cat.xSpine - cat.xStart);
                  const Yt = cat.yStart + fraction * (210 - cat.yStart);
                  const branchWidth = 105;
                  const Xb = Xt - branchWidth;

                  return (
                    <g
                      key={`branch-${cat.key}-${cIdx}`}
                      onClick={(e) => {
                        if (interactive && onToggleCause) {
                          e.stopPropagation();
                          onToggleCause(cat.key, branch.label);
                        }
                      }}
                      className={interactive ? 'cursor-pointer' : ''}
                    >
                      {/* Sub-bone horizontal line */}
                      <line
                        x1={Xt}
                        y1={Yt}
                        x2={Xb}
                        y2={Yt}
                        stroke={branch.active ? cat.color : '#cbd5e1'}
                        strokeWidth={branch.active ? '1.8' : '1'}
                        strokeDasharray={branch.active ? undefined : '2 2'}
                      />

                      {/* Joint Anchor Circle on Diagonal Rib */}
                      <circle
                        cx={Xt}
                        cy={Yt}
                        r={branch.active ? '4' : '2.5'}
                        fill={branch.active ? cat.color : '#ffffff'}
                        stroke={branch.active ? '#ffffff' : '#94a3b8'}
                        strokeWidth="1.2"
                      />

                      {/* Cause Label Tag */}
                      <foreignObject x={Xb - 12} y={Yt - 13} width="110" height="28">
                        <div
                          xmlns="http://www.w3.org/1999/xhtml"
                          className={`text-[8px] leading-[10px] text-right pr-1.5 select-none overflow-hidden text-ellipsis line-clamp-2 ${
                            branch.active
                              ? 'font-black text-slate-900 bg-white/90 px-1 py-0.5 rounded border shadow-2xs'
                              : 'font-medium text-slate-400 italic'
                          }`}
                          style={
                            branch.active
                              ? { borderColor: cat.color }
                              : undefined
                          }
                        >
                          {branch.active ? `● ${branch.label}` : branch.label}
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* FISH HEAD (Right end, holds the Accident Effect / Injury Statement) */}
          <g filter="url(#safetySoftShadow)">
            <path
              d="M 672,110 C 735,110 828,150 828,210 C 828,270 735,310 672,310 Z"
              fill="#fff1f2"
              stroke="#e11d48"
              strokeWidth="2.2"
            />
            {/* Gill curve slit */}
            <path
              d="M 688,150 C 702,175 702,245 688,270"
              fill="none"
              stroke="#e11d48"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Eye */}
            <circle cx="778" cy="170" r="7" fill="#ffffff" stroke="#e11d48" strokeWidth="1.5" />
            <circle cx="780" cy="170" r="3.5" fill="#e11d48" />
            <circle cx="781.5" cy="168.5" r="1.2" fill="#ffffff" />

            {/* Accident Effect Title inside Fish Head */}
            <foreignObject x="694" y="162" width="112" height="100">
              <div
                xmlns="http://www.w3.org/1999/xhtml"
                className="h-full flex flex-col items-center justify-center text-center p-1 select-none"
              >
                <span className="text-[7px] font-black uppercase text-rose-700 tracking-widest block font-mono">
                  ACCIDENT EFFECT
                </span>
                <span className="text-[8.5px] font-black text-rose-950 uppercase leading-[11px] line-clamp-4 font-mono mt-1 px-1.5 py-1 bg-white rounded border border-rose-300 shadow-2xs">
                  {problemTitle}
                </span>
              </div>
            </foreignObject>
          </g>
        </svg>
      </div>

      {/* PPSR-Inspired 6-Category Detailed Cause Matrix Cards */}
      {!compact && (
        <div className="relative mt-4 border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest font-mono">
              {interactive
                ? 'Interactive 6-Category Cause Matrix (Click any cause to toggle on Fishbone)'
                : 'Detailed 6-Category Cause Matrix'}
            </h4>
            <div className="flex items-center space-x-3 text-[9px] font-mono text-slate-500">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-slate-900 inline-block" />
                <span>● Identified Cause</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full border border-slate-400 inline-block" />
                <span>○ Not Identified</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <div
                  key={cat.key}
                  onClick={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
                  className={`text-left p-2.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-slate-50 border-slate-300 shadow-xs ring-1 ring-slate-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                  style={{ borderLeftWidth: '3.5px', borderLeftColor: cat.color }}
                >
                  <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100">
                    <span className="text-[9px] font-black tracking-tight text-slate-900 uppercase font-mono truncate">
                      {cat.shortTitle}
                    </span>
                    <span
                      className="text-[8px] font-bold font-mono px-1.5 py-0.2 rounded-full"
                      style={{
                        backgroundColor: cat.lightBg,
                        color: cat.color
                      }}
                    >
                      {cat.list.length}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {cat.allOptions.map((option) => {
                      const active = isCauseMatched(cat.key, option);
                      return (
                        <button
                          key={option}
                          type="button"
                          disabled={!interactive}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (interactive && onToggleCause) {
                              onToggleCause(cat.key, option);
                            }
                          }}
                          className={`w-full text-left flex items-start space-x-1.5 p-1 rounded-md text-[8.5px] leading-tight transition ${
                            active
                              ? 'bg-slate-900 text-white font-bold shadow-2xs'
                              : interactive
                              ? 'text-slate-600 hover:bg-slate-100 cursor-pointer'
                              : 'text-slate-400'
                          }`}
                        >
                          <span className="shrink-0 font-mono text-[8px] mt-0.2">
                            {active ? '●' : '○'}
                          </span>
                          <span className="line-clamp-2">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
