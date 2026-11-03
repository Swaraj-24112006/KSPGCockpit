import React, { useState } from 'react';
import { 
  Users, 
  Cpu, 
  Package, 
  Settings, 
  Globe, 
  Ruler, 
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Info
} from 'lucide-react';

interface IshikawaData {
  man?: string[];
  machine?: string[];
  material?: string[];
  methods?: string[];
  milieu?: string[];
  measurement?: string[];
}

interface IshikawaFishboneProps {
  ishikawa?: IshikawaData;
  problemTitle: string;
}

export default function IshikawaFishbone({ ishikawa, problemTitle }: IshikawaFishboneProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Default arrays with clean structures
  const data = ishikawa || {
    man: [], machine: [], material: [], methods: [], milieu: [], measurement: []
  };

  const manList = data.man || [];
  const machineList = data.machine || [];
  const materialList = data.material || [];
  const methodsList = data.methods || [];
  const milieuList = data.milieu || [];
  const measurementList = data.measurement || [];

  // Categorized structural definitions
  const categories = [
    {
      key: 'man',
      title: 'MAN (People)',
      shortTitle: 'MAN',
      icon: Users,
      color: '#6366f1', // Indigo
      lightBg: '#e0e7ff',
      glowColor: 'rgba(99, 102, 241, 0.4)',
      list: manList,
      xStart: 130,
      xSpine: 210,
      yStart: 50,
      isTop: true,
      desc: 'Operator competencies, work cycles, physical limitations, fatigue, or training issues.'
    },
    {
      key: 'machine',
      title: 'MACHINE (Hardware)',
      shortTitle: 'MACHINE',
      icon: Cpu,
      color: '#10b981', // Emerald
      lightBg: '#d1fae5',
      glowColor: 'rgba(16, 185, 129, 0.4)',
      list: machineList,
      xStart: 300,
      xSpine: 380,
      yStart: 50,
      isTop: true,
      desc: 'Equipment faults, worn fixture pins, hydraulic pressures, tool aging, or software faults.'
    },
    {
      key: 'material',
      title: 'MATERIAL (Stock)',
      shortTitle: 'MATERIAL',
      icon: Package,
      color: '#f59e0b', // Amber
      lightBg: '#fef3c7',
      glowColor: 'rgba(245, 158, 11, 0.4)',
      list: materialList,
      xStart: 470,
      xSpine: 550,
      yStart: 50,
      isTop: true,
      desc: 'Raw materials deviations, static coatings, tape residues, batch inconsistencies, or fluid specs.'
    },
    {
      key: 'methods',
      title: 'METHODS (SOPs)',
      shortTitle: 'METHODS',
      icon: Settings,
      color: '#8b5cf6', // Violet
      lightBg: '#ede9fe',
      glowColor: 'rgba(139, 92, 246, 0.4)',
      list: methodsList,
      xStart: 130,
      xSpine: 210,
      yStart: 350,
      isTop: false,
      desc: 'Standard operating procedures, check frequency, maintenance schedules, or line speed balance.'
    },
    {
      key: 'milieu',
      title: 'MILIEU (Environment)',
      shortTitle: 'MILIEU',
      icon: Globe,
      color: '#f43f5e', // Rose
      lightBg: '#ffe4e6',
      glowColor: 'rgba(244, 63, 94, 0.4)',
      list: milieuList,
      xStart: 300,
      xSpine: 380,
      yStart: 350,
      isTop: false,
      desc: 'Ambient conditions, shop humidity, heat expansions, noise levels, lighting, or external drafts.'
    },
    {
      key: 'measurement',
      title: 'MEASUREMENT',
      shortTitle: 'MEASURE',
      icon: Ruler,
      color: '#06b6d4', // Cyan
      lightBg: '#ecfeff',
      glowColor: 'rgba(6, 182, 212, 0.4)',
      list: measurementList,
      xStart: 470,
      xSpine: 550,
      yStart: 350,
      isTop: false,
      desc: 'Inspection resolution, manual feeler gauges vs lasers, audit frequency, or sensor calibration.'
    }
  ];

  const activeCategory = selectedCategory || hoveredCategory;
  const activeObj = categories.find(c => c.key === activeCategory);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl overflow-hidden p-6 shadow-xl relative" id="ishikawa-fishbone-panel">
      
      {/* Background Subtle Tech Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-45 pointer-events-none" />

      {/* Header Panel */}
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4 mb-4 gap-3">
        <div>
          <span className="text-[10px] font-black tracking-widest text-indigo-700 uppercase font-mono bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
            Interactive Fishbone Engine
          </span>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mt-1">
            Ishikawa 6M Cause-and-Effect Skeleton
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-500">
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-pulse" />
            <span>Click nodes to explore specific cause classifications</span>
          </span>
        </div>
      </div>

      {/* Main Fishbone SVG Canvas */}
      <div className="relative w-full overflow-x-auto bg-slate-50/50 rounded-2xl border border-slate-200 p-4">
        <svg
          viewBox="0 0 800 400"
          className="w-full min-w-[720px] h-auto transition-all"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Defs for gradients & shadow filters */}
          <defs>
            <linearGradient id="backboneGradient" gradientUnits="userSpaceOnUse" x1="25" y1="200" x2="655" y2="200">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            <marker id="spineArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#dc2626" />
            </marker>
            
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            <filter id="softShadow" filterUnits="userSpaceOnUse" x="-50" y="-50" width="900" height="500">
              <feDropShadow dx="1" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.1" />
            </filter>
          </defs>

          {/* Fish Tail (Left hand side) */}
          <g transform="translate(0,0)">
            <path
              d="M 50,200 L 12,130 L 25,200 L 12,270 Z"
              fill="#f8fafc"
              stroke="#64748b"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Tail interior fin slants */}
            <path
              d="M 32,170 L 18,155 M 36,190 L 20,185 M 36,210 L 20,215 M 32,230 L 18,245"
              stroke="#94a3b8"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>

          {/* Solid Backing Center Line (Guarantees visible line regardless of gradient capabilities) */}
          <line
            x1="25"
            y1="200"
            x2="655"
            y2="200"
            stroke="#475569"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Continuous Central Middle Spine Line (Tail to Head) with Gradient */}
          <line
            x1="25"
            y1="200"
            x2="655"
            y2="200"
            stroke="url(#backboneGradient)"
            strokeWidth="5"
            strokeLinecap="round"
            markerEnd="url(#spineArrow)"
          />

          {/* Inner dashed continuation line right into NOK Effect box */}
          <line
            x1="655"
            y1="200"
            x2="685"
            y2="200"
            stroke="#dc2626"
            strokeWidth="2.5"
            strokeDasharray="4 2"
          />

          {/* Rib bone connections onto central spine */}
          <g stroke="#94a3b8" strokeWidth="2" opacity="0.8">
            <circle cx="210" cy="200" r="3.5" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
            <circle cx="380" cy="200" r="3.5" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
            <circle cx="550" cy="200" r="3.5" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
          </g>

          {/* CATEGORY RIB BONES */}
          {categories.map((cat) => {
            const isHovered = hoveredCategory === cat.key;
            const isSelected = selectedCategory === cat.key;
            const isHighlighted = isHovered || isSelected;
            const hasCauses = cat.list.length > 0;

            const CatIcon = cat.icon;

            return (
              <g 
                key={cat.key} 
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => setHoveredCategory(cat.key)}
                onMouseLeave={() => setHoveredCategory(null)}
                onClick={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
              >
                {/* Visual bone line glow */}
                {isHighlighted && (
                  <line
                    x1={cat.xStart}
                    y1={cat.yStart}
                    x2={cat.xSpine}
                    y2={200}
                    stroke={cat.color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="0.25"
                    filter="url(#glowFilter)"
                  />
                )}

                {/* Primary Rib Bone Line */}
                <line
                  x1={cat.xStart}
                  y1={cat.yStart}
                  x2={cat.xSpine}
                  y2={200}
                  stroke={isHighlighted ? cat.color : '#94a3b8'}
                  strokeWidth={isHighlighted ? '3' : '1.5'}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />

                {/* Badge Container at outer end */}
                <g filter="url(#softShadow)">
                  <rect
                    x={cat.xStart - 65}
                    y={cat.isTop ? cat.yStart - 30 : cat.yStart + 5}
                    width="130"
                    height="25"
                    rx="6"
                    fill={isHighlighted ? cat.color : '#ffffff'}
                    stroke={hasCauses ? cat.color : '#cbd5e1'}
                    strokeWidth="1.5"
                    className="transition-colors duration-300"
                  />
                  
                  {/* Category Title Text */}
                  <text
                    x={cat.xStart + 8}
                    y={cat.isTop ? cat.yStart - 13 : cat.yStart + 21}
                    textAnchor="middle"
                    fill={isHighlighted ? '#ffffff' : hasCauses ? '#1e293b' : '#64748b'}
                    fontSize="8.5"
                    fontWeight="900"
                    fontFamily="monospace"
                    className="select-none"
                  >
                    {cat.shortTitle}
                  </text>

                  {/* Icon Indicator placement */}
                  <g transform={`translate(${cat.xStart - 52}, ${cat.isTop ? cat.yStart - 25 : cat.yStart + 10}) scale(0.6)`}>
                    <circle cx="12" cy="12" r="15" fill={isHighlighted ? '#ffffff' : '#f1f5f9'} />
                    <foreignObject x="4" y="4" width="16" height="16">
                      <CatIcon className="w-4 h-4" style={{ color: isHighlighted ? cat.color : '#64748b' }} />
                    </foreignObject>
                  </g>

                  {/* Small badge count of causes */}
                  {hasCauses && (
                    <g transform={`translate(${cat.xStart + 45}, ${cat.isTop ? cat.yStart - 24 : cat.yStart + 11})`}>
                      <circle cx="6" cy="6" r="6" fill={isHighlighted ? '#ffffff' : cat.color} />
                      <text x="6" y="9.5" textAnchor="middle" fill={isHighlighted ? cat.color : '#ffffff'} fontSize="7" fontWeight="bold">
                        {cat.list.length}
                      </text>
                    </g>
                  )}
                </g>

                {/* Sub-Bones (Individual Cause Lines) */}
                {cat.list.map((cause, cIdx) => {
                  const count = cat.list.length;
                  // Distribute evenly along the rib line
                  const fraction = count === 1 ? 0.6 : 0.3 + (cIdx * 0.5) / (count - 1);
                  
                  // Compute target point along rib bone diagonal
                  const Xt = cat.xStart + fraction * (cat.xSpine - cat.xStart);
                  const Yt = cat.yStart + fraction * (200 - cat.yStart);

                  // Branch line length
                  const branchWidth = 85;
                  const Xb = Xt - branchWidth;

                  return (
                    <g key={`cause-${cat.key}-${cIdx}`} className="group/cause">
                      {/* Horizontal cause connector line */}
                      <line
                        x1={Xt}
                        y1={Yt}
                        x2={Xb}
                        y2={Yt}
                        stroke={isHighlighted ? cat.color : '#cbd5e1'}
                        strokeWidth={isHighlighted ? '1.5' : '1'}
                        strokeDasharray="2 1"
                        className="transition-all duration-300"
                      />

                      {/* Small joint anchor circle */}
                      <circle 
                        cx={Xt} 
                        cy={Yt} 
                        r={isHighlighted ? '3.5' : '2'} 
                        fill={isHighlighted ? '#ffffff' : '#94a3b8'} 
                        stroke={cat.color}
                        strokeWidth="1"
                      />

                      {/* Floating Text tag for the cause */}
                      <foreignObject
                        x={Xb - 5}
                        y={Yt - 14}
                        width="85"
                        height="32"
                      >
                        <div
                          xmlns="http://www.w3.org/1999/xhtml"
                          className={`text-[8px] leading-[9.5px] text-right pr-2 select-none font-semibold overflow-hidden text-ellipsis line-clamp-3 transition-colors duration-200 ${
                            isHighlighted ? 'text-indigo-950 font-black' : 'text-slate-600 group-hover/cause:text-slate-900'
                          }`}
                        >
                          {cause}
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}

                {/* Empty bone fallback dashed indicator */}
                {cat.list.length === 0 && (
                  <g opacity="0.35">
                    <line
                      x1={cat.xStart + 35}
                      y1={cat.isTop ? cat.yStart + 40 : cat.yStart - 40}
                      x2={cat.xStart + 75}
                      y2={cat.isTop ? cat.yStart + 40 : cat.yStart - 40}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={cat.xStart + 55}
                      y={cat.isTop ? cat.yStart + 35 : cat.yStart - 45}
                      fill="#94a3b8"
                      fontSize="6.5"
                      fontStyle="italic"
                      textAnchor="middle"
                    >
                      No variables
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* FISH HEAD (Right end, holds the Effect/Problem Statement) */}
          <g filter="url(#softShadow)">
            <path
              d="M 640,105 C 700,105 780,145 780,200 C 780,255 700,295 640,295 Z"
              fill="#eef2ff"
              stroke="#4f46e5"
              strokeWidth="2"
            />
            {/* Gill curve slit */}
            <path
              d="M 655,145 C 668,168 668,232 655,255"
              fill="none"
              stroke="#4f46e5"
              strokeWidth="2"
              strokeLinecap="round"
            />
            
            {/* Eye */}
            <circle cx="735" cy="165" r="7" fill="#ffffff" stroke="#4f46e5" strokeWidth="1.5" />
            <circle cx="737" cy="165" r="3.5" fill="#ef4444" className="animate-pulse" />
            <circle cx="739" cy="163" r="1.2" fill="#ffffff" /> 

            {/* Problem Title / Effect text wrapped elegantly inside Head */}
            <foreignObject
              x="658"
              y="155"
              width="100"
              height="95"
            >
              <div xmlns="http://www.w3.org/1999/xhtml" className="h-full flex flex-col items-center justify-center text-center p-1 select-none">
                <span className="text-[7px] font-black uppercase text-indigo-600 tracking-widest block font-mono">
                   NOK EFFECT
                </span>
                <span className="text-[8px] font-black text-rose-700 uppercase leading-[11px] line-clamp-4 font-mono mt-1 px-1 py-0.5 bg-rose-50 rounded border border-rose-200/80">
                  {problemTitle || 'Root Failure'}
                </span>
              </div>
            </foreignObject>
          </g>
        </svg>
      </div>

      {/* Selected/Hovered Category Sidebar / Details Card */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Dynamic focus panel */}
        <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start space-x-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 border border-indigo-100">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">
              Active Category Lens: {activeObj ? activeObj.title : 'All Categories'}
            </h4>
            <p className="text-[10px] text-slate-600 leading-normal">
              {activeObj 
                ? activeObj.desc 
                : 'Select or hover over any primary bone above to see industrial guidelines and zoom into underlying systemic components.'}
            </p>
          </div>
        </div>

        {/* Legend Panel */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider block">Legend Indicators</span>
          <div className="grid grid-cols-2 gap-2 text-[8.5px] mt-1 font-mono text-slate-600 font-semibold">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>MAN (People)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>MACHINE (HW)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>MATERIAL (Stock)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              <span>METHODS (SOP)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>MILIEU (Env)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              <span>MEASUREMENT</span>
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Cause Matrix Cards */}
      <div className="mt-4 border-t border-slate-200 pt-4">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono mb-2.5">
          Detailed Cause Matrix
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {categories.map((cat) => {
            const hasCauses = cat.list.length > 0;
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
                className={`text-left p-2.5 rounded-xl border transition-all ${
                  isSelected 
                    ? 'bg-slate-100 border-slate-300 shadow-sm scale-102 ring-1 ring-slate-200' 
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
                style={{ borderLeftWidth: '3px', borderLeftColor: cat.color }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black tracking-tight text-slate-800 uppercase font-mono">
                    {cat.shortTitle}
                  </span>
                  <span className="text-[8px] font-bold text-slate-500 font-mono">
                    ({cat.list.length})
                  </span>
                </div>
                {hasCauses ? (
                  <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                    {cat.list.map((cause, idx) => (
                      <div key={idx} className="text-[8px] text-slate-600 font-sans leading-tight bg-slate-50 p-1 rounded-md border border-slate-100 truncate">
                        • {cause}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[8px] text-slate-400 font-mono italic">No causes logged</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
