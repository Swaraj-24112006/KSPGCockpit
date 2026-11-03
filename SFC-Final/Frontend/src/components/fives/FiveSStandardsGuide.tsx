import React, { useState } from 'react';
import { BookOpen, Palette, CheckCircle, AlertTriangle, ShieldCheck, Download, Eye, Layers, Compass } from 'lucide-react';

export default function FiveSStandardsGuide() {
  const [activeTab, setActiveTab] = useState<'colors' | 'shadowboards' | 'visualcontrols' | 'opl'>('colors');

  const COLOR_STANDARDS = [
    {
      name: 'Yellow (Traffic & Aisles)',
      hex: '#eab308',
      bgClass: 'bg-yellow-400',
      borderClass: 'border-yellow-500',
      width: '100mm (4 inches)',
      useCase: 'Primary gangways, forklift lanes, pedestrian corridors, cell perimeters.',
      rule: 'Must remain 100% unobstructed at all times. Zero temporary staging inside yellow lines.'
    },
    {
      name: 'White (Workstations & Machines)',
      hex: '#ffffff',
      bgClass: 'bg-white',
      borderClass: 'border-slate-300',
      width: '50mm (2 inches)',
      useCase: 'Equipment footprints, workbench locations, stationary racks, waste bins.',
      rule: 'Equipment must be aligned parallel with white floor tape borders.'
    },
    {
      name: 'Red (Quarantine & Red Tag)',
      hex: '#ef4444',
      bgClass: 'bg-rose-500',
      borderClass: 'border-rose-600',
      width: '100mm / Solid box',
      useCase: '5S Red Tag Holding Areas, defective scrap containers, non-conforming WIP quarantine.',
      rule: 'Items require an authorized Red Tag ticket; holding duration capped at 15 days.'
    },
    {
      name: 'Green (Safety & Finished Goods)',
      hex: '#22c55e',
      bgClass: 'bg-emerald-500',
      borderClass: 'border-emerald-600',
      width: '50mm / Green field',
      useCase: 'First aid kits, safety eyewash stations, certified finished goods ready for dispatch.',
      rule: 'Indicates ready-to-ship quality or life-safety emergency gear.'
    },
    {
      name: 'Blue (Raw Materials & WIP)',
      hex: '#3b82f6',
      bgClass: 'bg-blue-500',
      borderClass: 'border-blue-600',
      width: '50mm / Blue field',
      useCase: 'Incoming raw material pallets, in-process sub-assemblies, supplier returnable totes.',
      rule: 'Limited to maximum 1 shift buffer quantity.'
    },
    {
      name: 'Black & Yellow Stripes (Hazard Zone)',
      hex: '#f59e0b',
      bgClass: 'bg-[repeating-linear-gradient(45deg,#000,#000_10px,#eab308_10px,#eab308_20px)]',
      borderClass: 'border-amber-600',
      width: '100mm diagonal',
      useCase: '1-meter electrical breaker clearance, high voltage panels, robotic pinch zones, overhead crane paths.',
      rule: 'Absolute zero storage permit. Mandatory 1-meter clear radius maintained 24/7.'
    }
  ];

  const OPL_LESSONS = [
    {
      id: 'OPL-5S-01',
      title: 'Bolt Torque Match-Marking Standard (Witness Lines)',
      category: '4S Standardize',
      summary: 'Apply a single continuous line of red torque-seal paint across the tightened bolt head onto the base metal.',
      keyRule: 'If the line is broken or misaligned, the fastener has vibrated loose and requires immediate re-torqueing.',
      tag: 'FASTENER DISCIPLINE'
    },
    {
      id: 'OPL-5S-02',
      title: 'Two-Color Foam Tool Shadow Board Silhouette Rule',
      category: '2S Set In Order',
      summary: 'Black top layer with bright high-visibility orange or blue bottom contrast layer.',
      keyRule: 'Any exposed colored silhouette immediately flags a missing tool in under 3 seconds.',
      tag: 'TOOL CONTROL'
    },
    {
      id: 'OPL-5S-03',
      title: 'Pressure Gauge & Sight Glass Visual Operating Bands',
      category: '4S Standardize',
      summary: 'Affix green translucent vinyl arc for standard operating range; red vinyl wedge for over/under-pressure danger zones.',
      keyRule: 'Operator can verify pressure normality from 2 meters away without reading numerical dial units.',
      tag: 'VISUAL CONTROLS'
    },
    {
      id: 'OPL-5S-04',
      title: '5S Red Tag Holding Area Aging & Disposition Gate',
      category: '1S Sort',
      summary: 'Every item entering holding must carry a physical Red Tag with Tag # and target disposition date.',
      keyRule: 'Items aged >15 days without written Area Leader authorization are auto-escalated for immediate scrap.',
      tag: 'SEIRI GOVERNANCE'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              📐 Plant 5S Visual Workplace Standards &amp; OPL Library
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Standard Operating Procedures (SOPs), floor tape demarcation color codes, tool shadow board specs, and 1-Point Lessons.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider font-mono flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition"
          >
            <Download className="w-4 h-4" />
            <span>Print 5S Standard Card</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-6 pt-3 gap-3 overflow-x-auto rounded-t-3xl">
        {[
          { id: 'colors', label: '🎨 Floor Color Standards' },
          { id: 'shadowboards', label: '🔧 Tool Shadow Boards (2S)' },
          { id: 'visualcontrols', label: '👁️ Visual Controls & Match-Marking (4S)' },
          { id: 'opl', label: '📖 One-Point Lessons (OPL)' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-4 font-mono text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Floor Demarcation Standards */}
      {activeTab === 'colors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {COLOR_STANDARDS.map((color, index) => (
            <div key={index} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm hover:border-slate-300 transition">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-xl shadow-inner border ${color.borderClass} ${color.bgClass}`}></div>
                <div>
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-tight font-sans">
                    {color.name}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    Width: {color.width}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                <p>
                  <strong className="text-slate-700 font-mono text-[10px] uppercase">Use Cases: </strong>
                  {color.useCase}
                </p>
                <p className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-[11px] text-slate-500">
                  <strong className="text-slate-700 font-mono text-[10px] uppercase">Shopfloor Rule: </strong>
                  {color.rule}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Tool Shadow Boards */}
      {activeTab === 'shadowboards' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase text-indigo-600 font-mono tracking-wider">
                2S SEITON · VISUAL MOTION ECONOMY
              </span>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                Industrial Tool Shadow Board Architecture
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                "A place for everything, and everything in its place." Tool shadow boards eliminate operator search time, minimize tool loss, and instantly highlight missing equipment at shift handover.
              </p>

              <div className="space-y-2.5 text-xs font-medium">
                <div className="flex items-start space-x-2 text-slate-700">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Dual-Layer Contrast Foam:</strong> CNC-routed EVA foam with black top surface and neon blue/orange background.</span>
                </div>
                <div className="flex items-start space-x-2 text-slate-700">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Golden Reach Zone:</strong> Tools used every cycle placed within 35 cm; shift-start tools within 60 cm.</span>
                </div>
                <div className="flex items-start space-x-2 text-slate-700">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Silhouette &amp; Part Number:</strong> Every cutout bears an engraved tool ID and description.</span>
                </div>
              </div>
            </div>

            {/* Visual Graphic Representation */}
            <div className="bg-slate-900 p-6 rounded-2xl border-4 border-slate-800 text-center space-y-4 shadow-xl">
              <span className="text-xs font-mono font-black text-blue-400 uppercase tracking-wider block">
                STANDARD STATION TOOL SHADOW BOARD
              </span>
              <div className="p-4 bg-slate-950 rounded-xl border border-blue-500/30 flex items-center justify-around">
                <div className="w-16 h-28 border-2 border-dashed border-sky-400 bg-sky-950/40 rounded flex flex-col items-center justify-center text-[10px] font-mono text-sky-300">
                  <span>Wrench</span>
                  <span className="text-[9px] text-sky-400">14mm</span>
                </div>
                <div className="w-14 h-24 border-2 border-dashed border-emerald-400 bg-emerald-950/40 rounded flex flex-col items-center justify-center text-[10px] font-mono text-emerald-300">
                  <span>Torque</span>
                  <span className="text-[9px] text-emerald-400">Driver</span>
                </div>
                <div className="w-16 h-20 border-2 border-dashed border-amber-400 bg-amber-950/40 rounded flex flex-col items-center justify-center text-[10px] font-mono text-amber-300">
                  <span>Feeler</span>
                  <span className="text-[9px] text-amber-400">Gauge</span>
                </div>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Auditor rule: If any slot is empty without an operator checkout card, mark checkpoint 2S.1 non-compliant.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Visual Controls */}
      {activeTab === 'visualcontrols' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl border border-slate-200 space-y-3 bg-slate-50/50">
              <h4 className="font-black text-xs text-slate-800 uppercase font-mono">
                1. Gauge Safe Operating Band
              </h4>
              <p className="text-xs text-slate-600">
                Transparent green pie slice sticker placed between minimum and maximum operating pressure.
              </p>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-center font-mono text-xs">
                <span className="text-emerald-600 font-bold">🟢 4.5 to 6.0 Bar Safe</span>
                <span className="block text-[10px] text-rose-600 font-bold mt-1">🔴 &gt;6.5 Bar Overpressure</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 space-y-3 bg-slate-50/50">
              <h4 className="font-black text-xs text-slate-800 uppercase font-mono">
                2. Bolt Torque Witness Mark
              </h4>
              <p className="text-xs text-slate-600">
                Torque seal line drawn with a paint pen across fastener head onto base flange.
              </p>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-center font-mono text-xs">
                <span className="text-slate-800 font-bold">Red Acrylic Torque Seal</span>
                <span className="block text-[10px] text-slate-500 mt-1">Verified loose at 5° deviation</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 space-y-3 bg-slate-50/50">
              <h4 className="font-black text-xs text-slate-800 uppercase font-mono">
                3. Direction of Flow Arrows
              </h4>
              <p className="text-xs text-slate-600">
                Pipes wrapped with standardized arrow tape every 3 meters and at all valves/elbows.
              </p>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-center font-mono text-xs">
                <span className="text-blue-600 font-bold">Compressed Air: Light Blue →</span>
                <span className="block text-[10px] text-amber-600 font-bold mt-1">Hydraulic Oil: Brown →</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: One-Point Lessons (OPL) */}
      {activeTab === 'opl' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {OPL_LESSONS.map((opl) => (
            <div key={opl.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm hover:border-slate-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  {opl.id}
                </span>
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400">
                  {opl.tag}
                </span>
              </div>

              <h4 className="font-bold text-xs text-slate-800 uppercase leading-snug">
                {opl.title}
              </h4>

              <p className="text-xs text-slate-600">
                {opl.summary}
              </p>

              <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs font-sans text-indigo-950">
                <strong className="text-indigo-800 font-mono text-[10px] uppercase">Golden Rule: </strong>
                {opl.keyRule}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
