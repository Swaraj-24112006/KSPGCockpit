import React, { useState } from 'react';
import { PpsrReport } from '../types';
import {
    Trophy,
    Award,
    CheckCircle2,
    Users,
    Calendar,
    Printer,
    X,
    Plus,
    Search,
    Eye,
    Star,
    Sparkles,
    Medal,
    Check,
    Building,
    Target,
    FileText,
    DollarSign,
    Layers,
    ArrowRight
} from 'lucide-react';
import { formatIndianRupees } from '../utils';

interface PpsrMonthlyAwardsProps {
    ppsrReports: PpsrReport[];
    onUpdatePpsrReport?: (id: string, updatedFields: Partial<PpsrReport>) => void;
}

export interface PpsrCftMember {
    id: string;
    name: string;
    role: string;
    department?: string;
}

// Category definition for PPSR Department & Minifactory Winners
export type PpsrCategoryKey = 'Overall' | 'RedX' | 'CostFTQ' | 'MF1' | 'MF2' | 'MF3' | 'Machining' | 'Quality';

export const PPSR_CATEGORY_CONFIGS: {
    key: PpsrCategoryKey;
    title: string;
    subtitle: string;
    winnerCount: number;
    badgeBg: string;
}[] = [
        {
            key: 'Overall',
            title: 'PPSR of the Month (Overall Winner)',
            subtitle: 'Highest aggregate CFT score for rigorous 8D/5-Why root cause & containment',
            winnerCount: 1,
            badgeBg: 'from-amber-500 to-yellow-600 border-amber-400 text-slate-950'
        },
        {
            key: 'RedX',
            title: 'Best Root Cause Isolation (Red X Award)',
            subtitle: 'Excellence in Shainin PSQ swap analysis & physical root cause proof',
            winnerCount: 1,
            badgeBg: 'from-rose-600 to-red-700 border-rose-400 text-white'
        },
        {
            key: 'CostFTQ',
            title: 'Highest FTQ & Cost Savings PPSR',
            subtitle: 'Greatest scrap reduction & direct financial benefit',
            winnerCount: 1,
            badgeBg: 'from-emerald-600 to-teal-700 border-emerald-400 text-white'
        },
        {
            key: 'MF1',
            title: 'Minifactory 1 (MF1) Winner',
            subtitle: 'Vacuum Pump & High Pressure Assembly Lines',
            winnerCount: 1,
            badgeBg: 'from-blue-600 to-indigo-700 border-blue-400 text-white'
        },
        {
            key: 'MF2',
            title: 'Minifactory 2 (MF2) Winner',
            subtitle: 'EGR Valve & Actuator Lines',
            winnerCount: 1,
            badgeBg: 'from-violet-600 to-purple-700 border-purple-400 text-white'
        },
        {
            key: 'MF3',
            title: 'Minifactory 3 (MF3) Winner',
            subtitle: 'Bypass Valve & Smart Sensor Assembly',
            winnerCount: 1,
            badgeBg: 'from-cyan-600 to-sky-700 border-cyan-400 text-white'
        },
        {
            key: 'Machining',
            title: 'Machining & Quality Dept Winner',
            subtitle: 'CNC, Grinding, CMM & In-process Inspection Stations',
            winnerCount: 1,
            badgeBg: 'from-orange-500 to-amber-600 border-amber-400 text-slate-950'
        }
    ];

export default function PpsrMonthlyAwards({
    ppsrReports = [],
    onUpdatePpsrReport
}: PpsrMonthlyAwardsProps) {
    // Month & Year Selection
    const [selectedMonth, setSelectedMonth] = useState('July');
    const [selectedYear, setSelectedYear] = useState('2026');

    // Attendance Toggle
    const [isAttendanceExpanded, setIsAttendanceExpanded] = useState(true);

    // Inline Member Addition
    const [showInlineAddForm, setShowInlineAddForm] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('');
    const [newMemberDept, setNewMemberDept] = useState('Quality');

    // CFT Evaluators
    const [cftMembers, setCftMembers] = useState<PpsrCftMember[]>([
        { id: 'cft-1', name: 'Amit Mehta', role: 'Plant Quality Head', department: 'Quality' },
        { id: 'cft-2', name: 'Dr. S. K. Kulkarni', role: 'Chief Technical Officer', department: 'Engineering' },
        { id: 'cft-3', name: 'Rajesh Patil', role: 'Operations & Production Head', department: 'Operations' },
        { id: 'cft-4', name: 'Sunita Rao', role: 'Shainin / PSQ Lead Specialist', department: 'Quality' },
        { id: 'cft-5', name: 'Arjun Mehra', role: 'Automation & Process Lead', department: 'Engineering' },
        { id: 'cft-6', name: 'Vijay Deshmukh', role: 'Plant Maintenance Lead', department: 'Maintenance' },
        { id: 'cft-7', name: 'Sanjay Patil', role: 'Machining Line Supervisor', department: 'Machining' }
    ]);

    // Present Members Set
    const [presentMemberIds, setPresentMemberIds] = useState<string[]>([
        'cft-1', 'cft-2', 'cft-3', 'cft-4', 'cft-5', 'cft-6', 'cft-7'
    ]);

    // Rating store: Map of memberId -> ppsrId -> rating (1..5)
    const [ratings, setRatings] = useState<Record<string, Record<string, number>>>({
        'cft-1': { 'ppsr-1': 5, 'ppsr-2': 5, 'ppsr-3': 4, 'ppsr-4': 4, 'ppsr-5': 5 },
        'cft-2': { 'ppsr-1': 5, 'ppsr-2': 4, 'ppsr-3': 5, 'ppsr-4': 4, 'ppsr-5': 5 },
        'cft-3': { 'ppsr-1': 4, 'ppsr-2': 5, 'ppsr-3': 4, 'ppsr-4': 5, 'ppsr-5': 4 },
        'cft-4': { 'ppsr-1': 5, 'ppsr-2': 5, 'ppsr-3': 5, 'ppsr-4': 4, 'ppsr-5': 5 },
        'cft-5': { 'ppsr-1': 4, 'ppsr-2': 4, 'ppsr-3': 4, 'ppsr-4': 5, 'ppsr-5': 4 }
    });

    // Filters State
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('All');
    const [statusFilter, setStatusFilter] = useState<string>('All');

    // Inspection Modal
    const [inspectPpsr, setInspectPpsr] = useState<PpsrReport | null>(null);

    // Certificate Modal
    const [showCertificateModal, setShowCertificateModal] = useState<{
        categoryTitle: string;
        rankLabel: string;
        ppsrTitle: string;
        winnerName: string;
        departmentLocation: string;
        costSaveText: string;
        ticketId: string;
        rootCause: string;
        totalScore: number;
        month: string;
        year: string;
    } | null>(null);

    // Toast
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    };

    const availableMonths = ['All', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const availableYears = ['2026', '2025', '2024'];

    // Helper to categorize PPSR by location / minifactory
    function getPpsrCategory(p: PpsrReport): PpsrCategoryKey {
        const line = (p.lineStation || '').toLowerCase();
        const prod = (p.productComponent || '').toLowerCase();
        const title = (p.title || '').toLowerCase();

        if (line.includes('mf1') || line.includes('vacuum') || prod.includes('fuel pump') || prod.includes('vacuum')) return 'MF1';
        if (line.includes('mf2') || line.includes('egr') || prod.includes('egr') || title.includes('egr')) return 'MF2';
        if (line.includes('mf3') || line.includes('bpv') || prod.includes('sensor') || title.includes('valve')) return 'MF3';
        if (line.includes('machin') || line.includes('cnc') || line.includes('quality') || line.includes('cmm')) return 'Machining';
        return 'MF1';
    }

    // Filter PPSRs for selected month
    const filteredPpsrs = ppsrReports.filter(p => {
        // Status filter
        if (statusFilter !== 'All' && p.status !== statusFilter) return false;

        // Search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchId = (p.ppsrNo || p.id || '').toLowerCase().includes(q);
            const matchTitle = (p.title || '').toLowerCase().includes(q);
            const matchLead = (p.leadOwner || '').toLowerCase().includes(q);
            const matchLine = (p.lineStation || '').toLowerCase().includes(q);
            const matchProd = (p.productComponent || '').toLowerCase().includes(q);
            if (!matchId && !matchTitle && !matchLead && !matchLine && !matchProd) return false;
        }

        return true;
    });

    // Calculate Cumulative Score
    const getCumulativeScore = (ppsrId: string) => {
        let totalScore = 0;
        let votesCount = 0;

        presentMemberIds.forEach(memberId => {
            const rating = ratings[memberId]?.[ppsrId];
            if (rating && rating > 0) {
                totalScore += rating;
                votesCount += 1;
            }
        });

        return { totalScore, votesCount };
    };

    // Toggle Member Attendance
    const toggleAttendance = (memberId: string) => {
        if (presentMemberIds.includes(memberId)) {
            if (presentMemberIds.length === 1) {
                showToast('At least 1 CFT member must be present for evaluation');
                return;
            }
            setPresentMemberIds(presentMemberIds.filter(id => id !== memberId));
        } else {
            setPresentMemberIds([...presentMemberIds, memberId]);
        }
    };

    // Rate PPSR
    const handleRatePpsr = (memberId: string, ppsrId: string, ratingValue: number) => {
        setRatings(prev => ({
            ...prev,
            [memberId]: {
                ...(prev[memberId] || {}),
                [ppsrId]: ratingValue
            }
        }));
    };

    // Add Member Inline
    const handleAddMemberInline = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMemberName.trim()) return;

        const newMember: PpsrCftMember = {
            id: `cft-${Date.now()}`,
            name: newMemberName.trim(),
            role: newMemberRole.trim() || 'CFT Evaluator',
            department: newMemberDept
        };

        setCftMembers(prev => [...prev, newMember]);
        setPresentMemberIds(prev => [...prev, newMember.id]);
        setNewMemberName('');
        setNewMemberRole('');
        setShowInlineAddForm(false);
        showToast(`Added ${newMember.name} to PPSR CFT Steering Committee & marked present!`);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans text-slate-900" id="ppsr-cft-awards-root">

            {/* Toast Alert */}
            {toastMsg && (
                <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-amber-400 border-2 border-amber-500/50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold font-mono animate-bounce">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>{toastMsg}</span>
                </div>
            )}

            {/* TOP UNIFIED HEADER BAR */}
            <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                            <Trophy className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-md">
                                    PPSR Quality Excellence
                                </span>
                                <span className="text-xs font-mono text-slate-400 font-bold hidden sm:inline">
                                    CFT Steering Committee Evaluation
                                </span>
                            </div>
                            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white mt-0.5">
                                Monthly Best PPSR Awards &amp; CFT Scoring Matrix
                            </h2>
                            <p className="text-xs text-slate-400">
                                Rate and celebrate closed Practical Problem Solving Reports (PPSR) with real-time scoring, Red X root cause verification, and official certificate generation.
                            </p>
                        </div>
                    </div>

                    {/* Month / Year Filter Controls */}
                    <div className="flex items-center space-x-3 bg-slate-900 p-2 rounded-2xl border border-slate-800 self-start lg:self-auto">
                        <div className="flex items-center space-x-1.5 px-2">
                            <Calendar className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-bold text-slate-300">Period:</span>
                        </div>

                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-slate-800 text-white text-xs font-bold font-mono px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                        >
                            {availableMonths.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>

                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="bg-slate-800 text-white text-xs font-bold font-mono px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                        >
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Quick KPI Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
                    <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold font-mono block">Evaluated PPSRs</span>
                        <span className="text-lg font-black text-amber-400 font-mono mt-0.5 block">{filteredPpsrs.length} Projects</span>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold font-mono block">CFT Reviewers Present</span>
                        <span className="text-lg font-black text-emerald-400 font-mono mt-0.5 block">{presentMemberIds.length} of {cftMembers.length}</span>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold font-mono block">Red X Identified</span>
                        <span className="text-lg font-black text-rose-400 font-mono mt-0.5 block">
                            {filteredPpsrs.filter(p => p.psqTreeData?.bigXTarget || p.psqTreeData?.swapData?.stage2?.childParts?.some(c => c.isDefective)).length} Verified
                        </span>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold font-mono block">Award Categories</span>
                        <span className="text-lg font-black text-cyan-400 font-mono mt-0.5 block">7 Titles</span>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 1. CFT MEMBERS ATTENDANCE & INLINE ADDITION PANEL */}
            {/* ========================================================================= */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                            <Users className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase text-slate-900 font-mono">
                                PPSR CFT Committee Attendance ({presentMemberIds.length}/{cftMembers.length} Present)
                            </h3>
                            <p className="text-[11px] text-slate-500 font-mono">
                                Click any member badge to toggle their attendance for this scoring session.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={() => setShowInlineAddForm(!showInlineAddForm)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-mono font-bold px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Member</span>
                        </button>
                    </div>
                </div>

                {/* Inline Add Member Form */}
                {showInlineAddForm && (
                    <form onSubmit={handleAddMemberInline} className="bg-indigo-50/70 border-2 border-indigo-200 rounded-2xl p-4 space-y-3 animate-fade-in">
                        <span className="text-xs font-black uppercase font-mono text-indigo-950 block">
                            Add New Reviewer to PPSR Steering Committee:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                            <input
                                type="text"
                                value={newMemberName}
                                onChange={(e) => setNewMemberName(e.target.value)}
                                placeholder="Reviewer Name (e.g. Ramesh Deshpande)"
                                className="bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-indigo-600 outline-none"
                                required
                            />
                            <input
                                type="text"
                                value={newMemberRole}
                                onChange={(e) => setNewMemberRole(e.target.value)}
                                placeholder="Designation / Role (e.g. Plant Head)"
                                className="bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-indigo-600 outline-none"
                            />
                            <select
                                value={newMemberDept}
                                onChange={(e) => setNewMemberDept(e.target.value)}
                                className="bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-indigo-600 outline-none"
                            >
                                <option value="Quality">Quality Assurance</option>
                                <option value="Engineering">Process Engineering</option>
                                <option value="Operations">Operations / Production</option>
                                <option value="Maintenance">Plant Maintenance</option>
                                <option value="Machining">Machining Shop</option>
                            </select>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={() => setShowInlineAddForm(false)}
                                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-mono font-bold cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-mono font-bold px-4 py-1.5 rounded-xl transition cursor-pointer"
                            >
                                Save &amp; Mark Present
                            </button>
                        </div>
                    </form>
                )}

                {/* Member Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                    {cftMembers.map((m) => {
                        const isPresent = presentMemberIds.includes(m.id);
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => toggleAttendance(m.id)}
                                className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center space-x-2 transition cursor-pointer border-2 ${isPresent
                                        ? 'bg-emerald-50 text-emerald-950 border-emerald-400 shadow-2xs'
                                        : 'bg-slate-50 text-slate-400 border-slate-200 line-through opacity-60'
                                    }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${isPresent ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <span>{m.name}</span>
                                <span className="text-[10px] opacity-75 font-normal">({m.role})</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. REAL-TIME CFT SCORING MATRIX TABLE */}
            {/* ========================================================================= */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">

                {/* Table Filters Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                        <h3 className="text-sm sm:text-base font-black uppercase text-slate-900 font-mono flex items-center gap-2">
                            <span>📊 PPSR CFT Member Scoring Matrix ({filteredPpsrs.length} Projects)</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 font-mono">
                            Score each PPSR from 1 to 5 stars. Ratings immediately update the winners leaderboard below.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                placeholder="Filter PPSR ID or title..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-slate-50 border-2 border-slate-200 text-xs font-mono font-bold pl-8 pr-3 py-1.5 rounded-xl outline-none focus:border-indigo-600"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-slate-50 border-2 border-slate-200 text-xs font-mono font-bold px-3 py-1.5 rounded-xl outline-none focus:border-indigo-600 cursor-pointer"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Closed">Closed</option>
                            <option value="Pending Verification">Pending Verification</option>
                            <option value="Open">Open</option>
                        </select>
                    </div>
                </div>

                {/* Matrix Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono border-2 border-slate-200 rounded-2xl overflow-hidden bg-white">
                        <thead className="bg-slate-900 text-white font-bold border-b-2 border-slate-800">
                            <tr>
                                <th className="p-3 text-left w-64 min-w-[200px]">PPSR Project &amp; Initiator</th>
                                <th className="p-3 text-left w-36">Minifactory / Line</th>
                                <th className="p-3 text-left w-44">Red X Root Cause</th>
                                <th className="p-3 text-center w-24">Status</th>
                                {cftMembers.filter(m => presentMemberIds.includes(m.id)).map(m => (
                                    <th key={m.id} className="p-2 text-center w-28 min-w-[100px] border-l border-slate-800">
                                        <span className="block text-[11px] truncate" title={m.name}>{m.name.split(' ')[0]}</span>
                                        <span className="block text-[9px] text-slate-400 font-normal truncate">({m.role.split(' ')[0]})</span>
                                    </th>
                                ))}
                                <th className="p-3 text-center w-24 bg-amber-500 text-slate-950 font-black border-l border-amber-400">
                                    Total Score
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-100">
                            {filteredPpsrs.length === 0 ? (
                                <tr>
                                    <td colSpan={5 + presentMemberIds.length} className="p-8 text-center text-slate-400 font-mono">
                                        No PPSR projects found matching the filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredPpsrs.map((p) => {
                                    const { totalScore, votesCount } = getCumulativeScore(p.id);
                                    const bigX = p.psqTreeData?.bigXTarget || p.psqTreeData?.swapData?.stage2?.childParts?.find(c => c.isDefective)?.partName || 'Under Investigation';

                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50/80 transition">

                                            {/* Project Title & Lead */}
                                            <td className="p-3 font-bold text-slate-900 cursor-pointer" onClick={() => setInspectPpsr(p)}>
                                                <div className="flex items-center space-x-1.5">
                                                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-black font-mono">
                                                        {p.ppsrNo || p.id}
                                                    </span>
                                                    <span className="hover:text-indigo-600 underline font-bold line-clamp-1">{p.title}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-500 block mt-0.5">
                                                    Lead: <strong className="text-slate-700">{p.leadOwner || 'CFT Member'}</strong>
                                                </span>
                                            </td>

                                            {/* Line Station */}
                                            <td className="p-3 text-slate-600">
                                                <span className="font-bold text-slate-800 block truncate">{p.lineStation || 'MF1'}</span>
                                                <span className="text-[10px] text-slate-500 block truncate">{p.productComponent || 'Assembly'}</span>
                                            </td>

                                            {/* Root Cause (Red X) */}
                                            <td className="p-3">
                                                <div className="flex items-center space-x-1">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border flex items-center gap-1 ${bigX !== 'Under Investigation'
                                                            ? 'bg-rose-50 text-rose-900 border-rose-300 font-mono'
                                                            : 'bg-slate-50 text-slate-600 border-slate-200'
                                                        }`}>
                                                        <Target className="w-3 h-3 text-rose-600 shrink-0" />
                                                        <span className="truncate">{bigX}</span>
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="p-3 text-center">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase ${p.status === 'Closed'
                                                        ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                                                        : 'bg-amber-100 text-amber-950 border border-amber-300'
                                                    }`}>
                                                    {p.status}
                                                </span>
                                            </td>

                                            {/* Member Rating Columns */}
                                            {cftMembers.filter(m => presentMemberIds.includes(m.id)).map(m => {
                                                const currentVal = ratings[m.id]?.[p.id] || 0;
                                                return (
                                                    <td key={m.id} className="p-2 text-center border-l border-slate-100">
                                                        <div className="flex items-center justify-center space-x-0.5">
                                                            {[1, 2, 3, 4, 5].map((val) => (
                                                                <button
                                                                    key={val}
                                                                    type="button"
                                                                    onClick={() => handleRatePpsr(m.id, p.id, val)}
                                                                    className="p-0.5 hover:scale-125 transition cursor-pointer"
                                                                    title={`Rate ${val}/5`}
                                                                >
                                                                    <Star
                                                                        className={`w-3.5 h-3.5 ${val <= currentVal
                                                                                ? 'text-amber-400 fill-amber-400'
                                                                                : 'text-slate-200'
                                                                            }`}
                                                                    />
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400 font-mono mt-0.5 block">
                                                            {currentVal > 0 ? `${currentVal}/5` : '—'}
                                                        </span>
                                                    </td>
                                                );
                                            })}

                                            {/* Total Score */}
                                            <td className="p-3 text-center bg-amber-50 font-black border-l-2 border-amber-200">
                                                <span className="text-base text-slate-950 block">{totalScore}</span>
                                                <span className="text-[9px] text-slate-500 block font-normal">({votesCount} votes)</span>
                                            </td>

                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. DEPARTMENT & AWARD CATEGORY WINNERS LEADERBOARD */}
            {/* ========================================================================= */}
            <div className="space-y-4">
                <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                        <Medal className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-base font-black uppercase text-slate-900 font-mono">
                            Monthly PPSR Category Winners &amp; Certificate Generation
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">
                            Computed from the active CFT review matrix for {selectedMonth} {selectedYear}. Click "Generate Certificate" to print or save official certificate.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {PPSR_CATEGORY_CONFIGS.map((config) => {
                        // Sort PPSRs for this category
                        let categoryPpsrs = [...filteredPpsrs];
                        if (config.key === 'MF1') categoryPpsrs = categoryPpsrs.filter(p => getPpsrCategory(p) === 'MF1');
                        if (config.key === 'MF2') categoryPpsrs = categoryPpsrs.filter(p => getPpsrCategory(p) === 'MF2');
                        if (config.key === 'MF3') categoryPpsrs = categoryPpsrs.filter(p => getPpsrCategory(p) === 'MF3');
                        if (config.key === 'Machining') categoryPpsrs = categoryPpsrs.filter(p => getPpsrCategory(p) === 'Machining');
                        if (config.key === 'RedX') {
                            categoryPpsrs = categoryPpsrs.filter(p => !!(p.psqTreeData?.bigXTarget || p.psqTreeData?.swapData?.stage2?.childParts?.some(c => c.isDefective)));
                        }

                        const sorted = [...categoryPpsrs].sort((a, b) => {
                            const scoreA = getCumulativeScore(a.id).totalScore;
                            const scoreB = getCumulativeScore(b.id).totalScore;
                            return scoreB - scoreA;
                        });

                        const winner = sorted[0];
                        const winnerScore = winner ? getCumulativeScore(winner.id).totalScore : 0;
                        const bigX = winner?.psqTreeData?.bigXTarget || winner?.psqTreeData?.swapData?.stage2?.childParts?.find(c => c.isDefective)?.partName || 'Verified Root Cause';

                        return (
                            <div key={config.key} className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-400 transition">

                                {/* Header */}
                                <div className="space-y-1">
                                    <div className={`px-3 py-1 rounded-xl font-mono text-[10px] font-black uppercase tracking-wider inline-block bg-gradient-to-r ${config.badgeBg} shadow-2xs`}>
                                        {config.title}
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-mono mt-1">{config.subtitle}</p>
                                </div>

                                {/* Winner Card */}
                                {winner ? (
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                                                1st Rank Winner 🏆
                                            </span>
                                            <span className="text-xs font-mono font-black text-amber-600">
                                                Score: {winnerScore} pts
                                            </span>
                                        </div>

                                        <h4 className="text-sm font-black text-slate-900 line-clamp-1 font-mono">
                                            [{winner.ppsrNo || winner.id}] {winner.title}
                                        </h4>

                                        <div className="text-[11px] font-mono text-slate-600 space-y-0.5">
                                            <div>Lead: <strong className="text-slate-900">{winner.leadOwner || 'CFT Leader'}</strong></div>
                                            <div>Location: <strong className="text-slate-800">{winner.lineStation || 'MF1'}</strong></div>
                                            <div className="text-rose-700 font-bold truncate">Red X: {bigX}</div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setShowCertificateModal({
                                                categoryTitle: config.title,
                                                rankLabel: '1st Rank Excellence Award',
                                                ppsrTitle: winner.title,
                                                winnerName: winner.leadOwner || 'Project Leader & CFT Team',
                                                departmentLocation: `${winner.lineStation || 'Plant Floor'} • ${winner.productComponent || 'Assembly'}`,
                                                costSaveText: '100% FTQ Restoration',
                                                ticketId: winner.ppsrNo || winner.id,
                                                rootCause: bigX,
                                                totalScore: winnerScore,
                                                month: selectedMonth,
                                                year: selectedYear
                                            })}
                                            className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs py-2 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                                        >
                                            <Printer className="w-3.5 h-3.5 text-amber-300" />
                                            <span>Print PPSR Certificate</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 font-mono text-xs">
                                        No evaluated PPSR projects recorded for this category yet.
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 4. OFFICIAL PPSR EXCELLENCE CERTIFICATE MODAL */}
            {/* ========================================================================= */}
            {showCertificateModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowCertificateModal(null)}>
                    <div
                        className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border-4 border-amber-400 overflow-hidden flex flex-col max-h-[95vh] text-slate-900 font-serif"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Top Actions */}
                        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between font-sans border-b border-slate-800">
                            <span className="text-xs font-bold font-mono text-amber-400 flex items-center gap-1.5">
                                <Trophy className="w-4 h-4" />
                                <span>PPSR EXCELLENCE CERTIFICATE PREVIEW</span>
                            </span>
                            <div className="flex items-center space-x-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center space-x-1 cursor-pointer"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Print / Save PDF</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCertificateModal(null)}
                                    className="text-slate-400 hover:text-white p-1 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Certificate Canvas */}
                        <div className="p-8 sm:p-12 overflow-y-auto space-y-6 text-center bg-radial from-amber-50/40 via-white to-amber-50/20 border-8 border-double border-amber-600/30 m-4 rounded-2xl shadow-inner">

                            {/* Plant Emblem & Subtitle */}
                            <div className="space-y-1">
                                <span className="font-mono text-xs font-black tracking-widest text-slate-600 uppercase block">
                                    PLANT QUALITY ASSURANCE &bull; CFT STEERING COMMITTEE
                                </span>
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-950 uppercase tracking-tight">
                                    Certificate of Excellence
                                </h1>
                                <p className="font-sans text-xs font-bold uppercase tracking-wider text-amber-700">
                                    Practical Problem Solving Report (PPSR) Recognition
                                </p>
                            </div>

                            {/* Decorative Divider */}
                            <div className="flex items-center justify-center space-x-3">
                                <div className="w-24 h-0.5 bg-amber-500"></div>
                                <Award className="w-7 h-7 text-amber-600" />
                                <div className="w-24 h-0.5 bg-amber-500"></div>
                            </div>

                            {/* Body Text */}
                            <div className="space-y-3 font-sans max-w-xl mx-auto text-xs sm:text-sm text-slate-700 leading-relaxed">
                                <p>This Certificate is proudly awarded to:</p>
                                <h2 className="text-xl sm:text-2xl font-black text-slate-950 font-serif border-b-2 border-slate-300 pb-1 max-w-md mx-auto">
                                    {showCertificateModal.winnerName}
                                </h2>

                                <p className="pt-2">
                                    For outstanding problem solving rigor and breakthrough root cause elimination in the category of:
                                </p>
                                <span className="bg-amber-100 text-amber-950 font-black font-mono px-4 py-1 rounded-xl text-xs uppercase tracking-wider inline-block border border-amber-300">
                                    {showCertificateModal.categoryTitle}
                                </span>

                                <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 text-left font-mono text-xs space-y-1 mt-4 shadow-2xs">
                                    <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold">
                                        <span>PPSR ID: {showCertificateModal.ticketId}</span>
                                        <span>Month: {showCertificateModal.month} {showCertificateModal.year}</span>
                                    </div>
                                    <h4 className="font-black text-slate-900 text-sm">{showCertificateModal.ppsrTitle}</h4>
                                    <div className="text-slate-600 text-[11px]">Location: <strong>{showCertificateModal.departmentLocation}</strong></div>
                                    <div className="text-rose-700 font-bold text-[11px]">Verified Red X: {showCertificateModal.rootCause}</div>
                                </div>
                            </div>

                            {/* Signatures Footer */}
                            <div className="grid grid-cols-3 gap-4 pt-8 border-t-2 border-slate-200 font-sans text-xs">
                                <div className="space-y-1">
                                    <div className="h-9 flex items-end justify-center font-serif italic text-slate-500 font-bold text-xs">
                                        Amit Mehta
                                    </div>
                                    <div className="border-t border-slate-400 pt-1">
                                        <strong className="block font-black text-slate-900 text-[11px]">CFT Chairperson</strong>
                                        <span className="text-[10px] text-slate-500">Quality Assurance</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="h-9 flex items-end justify-center font-serif italic text-slate-500 font-bold text-xs">
                                        Dr. S. K. Kulkarni
                                    </div>
                                    <div className="border-t border-slate-400 pt-1">
                                        <strong className="block font-black text-slate-900 text-[11px]">Head of Engineering</strong>
                                        <span className="text-[10px] text-slate-500">Technical Steering</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="h-9 flex items-end justify-center font-serif italic text-slate-500 font-bold text-xs">
                                        Rajesh Patil
                                    </div>
                                    <div className="border-t border-slate-400 pt-1">
                                        <strong className="block font-black text-slate-900 text-[11px]">Plant Head</strong>
                                        <span className="text-[10px] text-slate-500">Operations &amp; Quality</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 5. INSPECT PPSR MODAL */}
            {/* ========================================================================= */}
            {inspectPpsr && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setInspectPpsr(null)}>
                    <div
                        className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border-2 border-slate-300 overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center space-x-2.5">
                                <FileText className="w-5 h-5 text-indigo-400" />
                                <div>
                                    <span className="text-[10px] font-mono font-bold text-indigo-300 block uppercase">
                                        INSPECT PPSR DETAILS • {inspectPpsr.ticketId || inspectPpsr.id}
                                    </span>
                                    <h3 className="text-sm font-black text-white line-clamp-1">{inspectPpsr.title}</h3>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInspectPpsr(null)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs">
                            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                                <div>Lead Owner: <strong className="text-slate-900">{inspectPpsr.leadOwner || 'CFT Lead'}</strong></div>
                                <div>Location: <strong className="text-slate-900">{inspectPpsr.lineStation}</strong></div>
                                <div>Product: <strong className="text-slate-900">{inspectPpsr.productComponent}</strong></div>
                                <div>Status: <strong className="text-emerald-700">{inspectPpsr.status}</strong></div>
                            </div>

                            <div>
                                <span className="font-black text-slate-500 uppercase text-[10px] block">Problem Statement:</span>
                                <p className="bg-white border-2 border-slate-200 p-3 rounded-xl text-slate-800 mt-1 font-sans">
                                    {inspectPpsr.problemStatement || inspectPpsr.title}
                                </p>
                            </div>

                            {inspectPpsr.containmentAction && (
                                <div>
                                    <span className="font-black text-slate-500 uppercase text-[10px] block">Containment Actions:</span>
                                    <p className="bg-white border-2 border-slate-200 p-3 rounded-xl text-slate-800 mt-1 font-sans">
                                        {inspectPpsr.containmentAction}
                                    </p>
                                </div>
                            )}

                            {inspectPpsr.psqTree?.bigXTarget && (
                                <div className="bg-rose-50 border-2 border-rose-300 p-3.5 rounded-2xl">
                                    <span className="font-black text-rose-900 uppercase text-[10px] block">Verified Red X Root Cause:</span>
                                    <p className="text-rose-950 font-black text-sm mt-0.5">{inspectPpsr.psqTree.bigXTarget}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setInspectPpsr(null)}
                                className="bg-slate-900 text-white font-mono font-bold text-xs px-4 py-2 rounded-xl"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
