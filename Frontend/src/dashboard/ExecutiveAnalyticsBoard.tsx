import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  DollarSign,
  Filter,
  Calendar,
  Building2,
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { formatIndianRupees } from '../utils';

export default function ExecutiveAnalyticsBoard() {
  // Slicer States
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'Idea' | 'Kaizen'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'Closed' | 'Open' | 'Reject'>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  // Hardcoded exact benchmark data matching user's uploaded images
  const yoyKaizensData = [
    { year: '2021', count: 360, perEmp: 1.13, savings: 658071 },
    { year: '2022', count: 379, perEmp: 1.14, savings: 710238 },
    { year: '2023', count: 442, perEmp: 1.18, savings: 834458 },
    { year: '2024', count: 441, perEmp: 1.34, savings: 896448 },
    { year: 'YTD - 2025', count: 409, perEmp: 1.37, savings: 887300 },
  ];

  // Month on Month Kaizens (Image 3)
  const monthData = [
    { month: 'Jan', count: 17 },
    { month: 'Feb', count: 30 },
    { month: 'Mar', count: 21 },
    { month: 'Apr', count: 17 },
    { month: 'May', count: 14 },
    { month: 'Jun', count: 40 },
    { month: 'Jul', count: 53 },
    { month: 'Aug', count: 69 },
    { month: 'Sep', count: 69 },
    { month: 'Oct', count: 47 },
    { month: 'Nov', count: 29 },
  ];

  // Dept Distribution (Image 3)
  const deptData = [
    { dept: 'MF 2', count: 133, pct: '33%', savings: 110400, savingsPct: '34%', color: '#3b82f6' },
    { dept: 'MF 1', count: 78, pct: '19%', savings: 159600, savingsPct: '49%', color: '#84cc16' },
    { dept: 'MC', count: 71, pct: '17%', savings: 17100, savingsPct: '5%', color: '#ef4444' },
    { dept: 'Maintenance', count: 62, pct: '15%', savings: 38000, savingsPct: '11%', color: '#a855f7' },
    { dept: 'MF 3', count: 23, pct: '6%', savings: 0, savingsPct: '0%', color: '#f97316' },
    { dept: 'QA', count: 19, pct: '5%', savings: 2000, savingsPct: '1%', color: '#06b6d4' },
    { dept: 'OTH', count: 15, pct: '4%', savings: 0, savingsPct: '0%', color: '#64748b' },
    { dept: 'NCM', count: 5, pct: '1%', savings: 200, savingsPct: '0%', color: '#eab308' },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-transparent p-4 md:p-8">
      {/* Container */}
      <div className="relative flex flex-col items-center justify-center p-10 md:p-14 bg-white rounded-3xl shadow-sm border border-slate-200/60 max-w-2xl w-full text-center overflow-hidden">
        
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-30 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Icon & Badge */}
        <div className="relative z-10 flex flex-col items-center mb-6">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-50 to-blue-100 border border-indigo-200/60 rounded-2xl shadow-sm transform -rotate-3 transition-transform hover:rotate-0 duration-300">
              <BarChart3 className="w-10 h-10 text-indigo-600" />
            </div>
          </div>
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest font-mono">
              Module Under Construction
            </span>
          </div>
        </div>

        {/* Text Content */}
        <div className="relative z-10 space-y-4">
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
            KSPG Operations Cockpit
          </h2>
          
          <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed font-medium">
            The Executive Analytics and benchmarking dashboard is currently undergoing maintenance and upgrades to provide enhanced real-time data visualization capabilities.
          </p>
        </div>

        {/* Progress Bar Area */}
        <div className="relative z-10 mt-10 w-full max-w-sm mx-auto">
          <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-2 font-mono uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> System Upgrade
            </span>
            <span className="text-indigo-600">85%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
            <div className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full rounded-full w-[85%] relative overflow-hidden">
              <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse"></div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
