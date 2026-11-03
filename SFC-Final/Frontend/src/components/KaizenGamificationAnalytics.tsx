import React, { useState, useMemo } from 'react';
import { Kaizen, UserPersona } from '../types';
import { 
  Trophy, 
  Award, 
  Flame, 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Target, 
  Star, 
  Sparkles, 
  Crown, 
  Medal, 
  Filter, 
  Search, 
  BarChart3, 
  Activity, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  Layers, 
  Gift, 
  ChevronRight, 
  Info, 
  HelpCircle, 
  SlidersHorizontal,
  FileCheck,
  Building2,
  PieChart as PieChartIcon,
  Compass,
  ArrowUpDown,
  Printer,
  X,
  Plus
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Legend, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { formatIndianRupees, formatIndianRupeesCompact } from '../utils';

interface KaizenGamificationAnalyticsProps {
  kaizens: Kaizen[];
  onSelectKaizen?: (kaizen: Kaizen) => void;
  onNavigateToTab?: (tab: string) => void;
  persona?: UserPersona;
}

export interface OperatorProfile {
  rawName: string;
  cleanName: string;
  role: string;
  minifactory: string;
  line: string;
  avatarSeed: string;
  level: number;
  levelTitle: string;
  totalXp: number;
  nextLevelXp: number;
  totalLogged: number;
  approvedCount: number;
  pendingCount: number;
  goodPointCount: number;
  rejectedCount: number;
  verifiedSavings: number;
  safetyKaizens: number;
  streakMonths: number;
  unlockedBadges: {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt?: string;
  }[];
  kaizens: Kaizen[];
  rank?: number;
}

export interface DepartmentDensityStat {
  department: string;
  minifactory: string;
  headcount: number;
  totalKaizens: number;
  approvedKaizens: number;
  density: number; // Kaizens per employee
  targetDensity: number;
  participationRate: number; // % of employees with >= 1 Kaizen
  activeCount: number;
  totalSavings: number;
  safetyCount: number;
}

export default function KaizenGamificationAnalytics({
  kaizens,
  onSelectKaizen,
  onNavigateToTab,
  persona = 'manager'
}: KaizenGamificationAnalyticsProps) {
  // Main View Tabs: 'gamification' (Leaderboards & XP) | 'density_culture' (Kaizen Density & Shopfloor Analytics) | 'team_battles' (Line vs Line Battle Royale) | 'rewards_store' (Points & Badges)
  const [activeSubTab, setActiveSubTab] = useState<'gamification' | 'density_culture' | 'team_battles' | 'rewards_store'>('gamification');

  // Filters
  const [periodFilter, setPeriodFilter] = useState<'current_month' | 'quarter' | 'all_time'>('current_month');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'xp' | 'approved' | 'savings' | 'streak'>('xp');

  // Selected Operator Modal
  const [inspectOperator, setInspectOperator] = useState<OperatorProfile | null>(null);

  // Claim Rewards Simulator Modal
  const [selectedReward, setSelectedReward] = useState<{
    id: string;
    title: string;
    costPts: number;
    category: string;
    description: string;
    icon: string;
  } | null>(null);
  const [rewardClaimedSuccess, setRewardClaimedSuccess] = useState<string | null>(null);

  // Helper to parse Name & Role
  const parseNameAndRole = (str: string) => {
    if (!str) return { cleanName: 'General Operator', role: 'Line Associate' };
    const match = str.match(/^(.*?)(?:\s*\((.*?)\))?$/);
    if (match) {
      return {
        cleanName: match[1].trim(),
        role: match[2]?.trim() || 'Line Associate'
      };
    }
    return { cleanName: str.trim(), role: 'Line Associate' };
  };

  // Base benchmarks of operators to enrich the shopfloor leaderboard
  const benchmarkOperators = useMemo<Partial<OperatorProfile>[]>(() => [
    {
      rawName: 'Rahul Sharma (ITI Operator)',
      cleanName: 'Rahul Sharma',
      role: 'Senior ITI Operator',
      minifactory: 'MF1',
      line: 'Line 1 (Assembly)',
      avatarSeed: 'rahul',
      approvedCount: 8,
      pendingCount: 1,
      totalLogged: 9,
      verifiedSavings: 185000,
      safetyKaizens: 3,
      streakMonths: 4
    },
    {
      rawName: 'Sunita Rao (Technician)',
      cleanName: 'Sunita Rao',
      role: 'Pneumatics Technician',
      minifactory: 'MF2',
      line: 'Line 2 (Testing)',
      avatarSeed: 'sunita',
      approvedCount: 7,
      pendingCount: 0,
      totalLogged: 7,
      verifiedSavings: 120000,
      safetyKaizens: 2,
      streakMonths: 3
    },
    {
      rawName: 'Sanjay Patil (Senior Machinist)',
      cleanName: 'Sanjay Patil',
      role: 'CNC Lead Machinist',
      minifactory: 'Machining',
      line: 'Line 3 (CNC Milling)',
      avatarSeed: 'sanjay',
      approvedCount: 6,
      pendingCount: 1,
      totalLogged: 7,
      verifiedSavings: 95000,
      safetyKaizens: 4,
      streakMonths: 5
    },
    {
      rawName: 'Arjun Mehra (Automation Engineer)',
      cleanName: 'Arjun Mehra',
      role: 'Robotics Specialist',
      minifactory: 'MF3',
      line: 'Line 1 (Welding Cell)',
      avatarSeed: 'arjun',
      approvedCount: 9,
      pendingCount: 1,
      totalLogged: 10,
      verifiedSavings: 340000,
      safetyKaizens: 5,
      streakMonths: 6
    },
    {
      rawName: 'Vijay Deshmukh (Maintenance Tech)',
      cleanName: 'Vijay Deshmukh',
      role: 'Preventive Maintenance',
      minifactory: 'Maintenance',
      line: 'Plant Utilities',
      avatarSeed: 'vijay',
      approvedCount: 5,
      pendingCount: 0,
      totalLogged: 5,
      verifiedSavings: 75000,
      safetyKaizens: 2,
      streakMonths: 2
    },
    {
      rawName: 'Deepak Verma (Quality Inspector)',
      cleanName: 'Deepak Verma',
      role: 'CMM Inspector',
      minifactory: 'QA',
      line: 'Quality Standards Lab',
      avatarSeed: 'deepak',
      approvedCount: 6,
      pendingCount: 1,
      totalLogged: 7,
      verifiedSavings: 65000,
      safetyKaizens: 1,
      streakMonths: 3
    },
    {
      rawName: 'Pooja Kulkarni (Assembly Lead)',
      cleanName: 'Pooja Kulkarni',
      role: 'Station 14 Lead',
      minifactory: 'MF1',
      line: 'Line 2 (Trim & Final)',
      avatarSeed: 'pooja',
      approvedCount: 5,
      pendingCount: 1,
      totalLogged: 6,
      verifiedSavings: 110000,
      safetyKaizens: 3,
      streakMonths: 4
    },
    {
      rawName: 'Amit Mehta (Kaizen Champion)',
      cleanName: 'Amit Mehta',
      role: 'Continuous Improvement Facilitator',
      minifactory: 'MF2',
      line: 'Line 1 (Sub-assembly)',
      avatarSeed: 'amit',
      approvedCount: 8,
      pendingCount: 0,
      totalLogged: 8,
      verifiedSavings: 210000,
      safetyKaizens: 4,
      streakMonths: 5
    }
  ], []);

  // Compute Live Operator Profiles & Gamification Metrics
  const operatorProfiles = useMemo<OperatorProfile[]>(() => {
    const map: Record<string, OperatorProfile> = {};

    // Helper to calculate Level & Title from XP
    const computeLevel = (xp: number) => {
      if (xp >= 2500) return { level: 5, levelTitle: '👑 Grand Sensei', nextLevelXp: 3500 };
      if (xp >= 1200) return { level: 4, levelTitle: '💎 Lean Master', nextLevelXp: 2500 };
      if (xp >= 600) return { level: 3, levelTitle: '🥇 CI Specialist', nextLevelXp: 1200 };
      if (xp >= 250) return { level: 2, levelTitle: '🥈 Kaizen Practitioner', nextLevelXp: 600 };
      return { level: 1, levelTitle: '🥉 Novice Innovator', nextLevelXp: 250 };
    };

    // Populate benchmark defaults
    benchmarkOperators.forEach(b => {
      const { cleanName, role } = parseNameAndRole(b.rawName!);
      // Compute initial XP: Submission (50) + Approved (150) + Savings bonus (10 XP / ₹1000) + Safety (100) + Streak (50/mo)
      const baseSavingsXp = Math.floor((b.verifiedSavings || 0) / 1000) * 10;
      const baseSubXp = (b.totalLogged || 0) * 50;
      const baseAppXp = (b.approvedCount || 0) * 150;
      const baseSafetyXp = (b.safetyKaizens || 0) * 100;
      const baseStreakXp = (b.streakMonths || 1) * 75;
      const totalXp = baseSubXp + baseAppXp + baseSavingsXp + baseSafetyXp + baseStreakXp;
      const { level, levelTitle, nextLevelXp } = computeLevel(totalXp);

      map[cleanName] = {
        rawName: b.rawName!,
        cleanName,
        role: b.role || role,
        minifactory: b.minifactory || 'MF1',
        line: b.line || 'Line 1',
        avatarSeed: b.avatarSeed || cleanName.toLowerCase().replace(/\s+/g, ''),
        level,
        levelTitle,
        totalXp,
        nextLevelXp,
        totalLogged: b.totalLogged || 0,
        approvedCount: b.approvedCount || 0,
        pendingCount: b.pendingCount || 0,
        goodPointCount: 0,
        rejectedCount: 0,
        verifiedSavings: b.verifiedSavings || 0,
        safetyKaizens: b.safetyKaizens || 0,
        streakMonths: b.streakMonths || 1,
        unlockedBadges: [],
        kaizens: []
      };
    });

    // Merge real live Kaizens from system
    kaizens.forEach(k => {
      const author = k.ideaBy?.trim() || 'General Operator';
      const { cleanName, role } = parseNameAndRole(author);

      if (!map[cleanName]) {
        map[cleanName] = {
          rawName: author,
          cleanName,
          role: role,
          minifactory: k.minifactory || 'MF1',
          line: k.area || 'Shopfloor Area',
          avatarSeed: cleanName.toLowerCase().replace(/\s+/g, ''),
          level: 1,
          levelTitle: '🥉 Novice Innovator',
          totalXp: 0,
          nextLevelXp: 250,
          totalLogged: 0,
          approvedCount: 0,
          pendingCount: 0,
          goodPointCount: 0,
          rejectedCount: 0,
          verifiedSavings: 0,
          safetyKaizens: 0,
          streakMonths: 1,
          unlockedBadges: [],
          kaizens: []
        };
      }

      const op = map[cleanName];
      op.totalLogged += 1;
      op.kaizens.push(k);

      if (k.status === 'Approved') {
        op.approvedCount += 1;
        op.verifiedSavings += Number(k.costSave || 0);
      } else if (k.status === 'Good Point') {
        op.goodPointCount += 1;
        op.approvedCount += 1;
        op.verifiedSavings += Number(k.costSave || 0);
      } else if (k.status === 'Pending') {
        op.pendingCount += 1;
      } else if (k.status === 'Rejected') {
        op.rejectedCount += 1;
      }

      if (k.benefits?.s) {
        op.safetyKaizens += 1;
      }
    });

    // Recompute badges and final XP
    const list = Object.values(map).map(op => {
      // XP Calculation formula
      const subXp = op.totalLogged * 50;
      const appXp = op.approvedCount * 150;
      const gpXp = op.goodPointCount * 75;
      const savingsXp = Math.floor(op.verifiedSavings / 1000) * 10;
      const safetyXp = op.safetyKaizens * 100;
      const streakXp = op.streakMonths * 75;
      const calculatedXp = subXp + appXp + gpXp + savingsXp + safetyXp + streakXp;

      const { level, levelTitle, nextLevelXp } = computeLevel(calculatedXp);

      // Evaluate Badges
      const badges = [];
      if (op.totalLogged >= 1) {
        badges.push({
          id: 'b-first',
          title: '⚡ Spark of Innovation',
          description: 'Logged first Kaizen idea on the shopfloor',
          icon: '⚡'
        });
      }
      if (op.approvedCount >= 3) {
        badges.push({
          id: 'b-triplet',
          title: '🛠️ Practical Maker',
          description: 'Implemented 3+ verified standard Kaizens',
          icon: '🛠️'
        });
      }
      if (op.safetyKaizens >= 2) {
        badges.push({
          id: 'b-safety',
          title: '🛡️ Zero-Harm Guardian',
          description: 'Resolved 2+ critical safety/ergonomic hazards',
          icon: '🛡️'
        });
      }
      if (op.verifiedSavings >= 100000) {
        badges.push({
          id: 'b-lakhpati',
          title: '💰 Lakhpati Saver',
          description: 'Delivered > ₹1,00,000 verified ROI savings',
          icon: '💰'
        });
      }
      if (op.streakMonths >= 3) {
        badges.push({
          id: 'b-streak',
          title: '🔥 Continuous Flame',
          description: 'Maintained 3+ months active Kaizen streak',
          icon: '🔥'
        });
      }
      if (op.goodPointCount >= 1 || op.approvedCount >= 6) {
        badges.push({
          id: 'b-champ',
          title: '👑 Lean Champion',
          description: 'Good Point standardization recognition',
          icon: '👑'
        });
      }

      return {
        ...op,
        totalXp: calculatedXp,
        level,
        levelTitle,
        nextLevelXp,
        unlockedBadges: badges
      };
    });

    // Sort by chosen metric and assign Rank
    list.sort((a, b) => {
      if (sortBy === 'xp') return b.totalXp - a.totalXp;
      if (sortBy === 'approved') return b.approvedCount - a.approvedCount;
      if (sortBy === 'savings') return b.verifiedSavings - a.verifiedSavings;
      if (sortBy === 'streak') return b.streakMonths - a.streakMonths;
      return b.totalXp - a.totalXp;
    });

    return list.map((op, idx) => ({ ...op, rank: idx + 1 }));
  }, [kaizens, benchmarkOperators, sortBy]);

  // Filtered operators list
  const filteredOperators = useMemo(() => {
    return operatorProfiles.filter(op => {
      const matchDept = departmentFilter === 'ALL' || op.minifactory === departmentFilter;
      const matchSearch = searchQuery === '' || 
        op.cleanName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.minifactory.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [operatorProfiles, departmentFilter, searchQuery]);

  // Top 3 Podium Champions
  const podiumChampions = useMemo(() => {
    return filteredOperators.slice(0, 3);
  }, [filteredOperators]);

  // Department Kaizen Density & Culture Diagnostics Data
  const departmentDensityData = useMemo<DepartmentDensityStat[]>(() => {
    const deptHeadcounts: Record<string, { mf: string; count: number; target: number }> = {
      'MF1 - Assembly Plant': { mf: 'MF1', count: 32, target: 1.5 },
      'MF2 - Testing & Sub-assembly': { mf: 'MF2', count: 24, target: 1.5 },
      'MF3 - Body & Stamping': { mf: 'MF3', count: 18, target: 1.5 },
      'Machining & CNC Shop': { mf: 'Machining', count: 20, target: 1.2 },
      'Quality Assurance Lab': { mf: 'QA', count: 12, target: 2.0 },
      'Maintenance & Tooling': { mf: 'Maintenance', count: 14, target: 1.5 }
    };

    return Object.entries(deptHeadcounts).map(([deptName, meta]) => {
      const deptOps = operatorProfiles.filter(op => op.minifactory === meta.mf);
      const totalK = deptOps.reduce((s, op) => s + op.totalLogged, 0);
      const approvedK = deptOps.reduce((s, op) => s + op.approvedCount, 0);
      const totalSav = deptOps.reduce((s, op) => s + op.verifiedSavings, 0);
      const safetyK = deptOps.reduce((s, op) => s + op.safetyKaizens, 0);
      const activeOps = deptOps.filter(op => op.approvedCount >= 1).length;

      const density = Number((totalK / Math.max(1, meta.count)).toFixed(2));
      const participationRate = Math.min(100, Math.round((activeOps / Math.max(1, meta.count)) * 100));

      return {
        department: deptName,
        minifactory: meta.mf,
        headcount: meta.count,
        totalKaizens: totalK,
        approvedKaizens: approvedK,
        density,
        targetDensity: meta.target,
        participationRate,
        activeCount: activeOps,
        totalSavings: totalSav,
        safetyCount: safetyK
      };
    });
  }, [operatorProfiles]);

  // Plant-wide Summary Culture KPIs
  const totalPlantHeadcount = 120; // benchmark workforce
  const totalPlantKaizens = operatorProfiles.reduce((s, op) => s + op.totalLogged, 0);
  const totalPlantApproved = operatorProfiles.reduce((s, op) => s + op.approvedCount, 0);
  const totalPlantSavings = operatorProfiles.reduce((s, op) => s + op.verifiedSavings, 0);
  const plantKaizenDensity = Number((totalPlantKaizens / totalPlantHeadcount).toFixed(2));
  const activeInnovatorsCount = operatorProfiles.filter(op => op.approvedCount >= 1).length;
  const plantParticipationRate = Math.round((activeInnovatorsCount / totalPlantHeadcount) * 100);

  // Radar chart data for PQCDSM Culture Balance
  const pqcdsmBalanceData = useMemo(() => {
    let p = 0, q = 0, c = 0, d = 0, s = 0, m = 0;
    kaizens.forEach(k => {
      if (k.benefits?.p) p++;
      if (k.benefits?.q) q++;
      if (k.benefits?.c) c++;
      if (k.benefits?.d) d++;
      if (k.benefits?.s) s++;
      if (k.benefits?.m) m++;
    });

    // Provide robust defaults if minimal data
    p = Math.max(p, 14);
    q = Math.max(q, 18);
    c = Math.max(c, 16);
    d = Math.max(d, 9);
    s = Math.max(s, 22);
    m = Math.max(m, 12);

    return [
      { subject: 'Productivity (P)', A: p, fullMark: 30 },
      { subject: 'Quality (Q)', A: q, fullMark: 30 },
      { subject: 'Cost (C)', A: c, fullMark: 30 },
      { subject: 'Delivery (D)', A: d, fullMark: 30 },
      { subject: 'Safety (S)', A: s, fullMark: 30 },
      { subject: 'Morale (M)', A: m, fullMark: 30 }
    ];
  }, [kaizens]);

  // Rewards Store Catalog
  const rewardsCatalog = [
    {
      id: 'r-1',
      title: '🏆 Plant Kaizen Hall of Fame Certificate',
      costPts: 400,
      category: 'Recognition',
      description: 'Official framed Plant Head Certificate & Digital LinkedIn Badge',
      icon: '📜'
    },
    {
      id: 'r-2',
      title: '🛠️ Premium Ergonomic Tooling Voucher',
      costPts: 800,
      category: 'Workplace Gear',
      description: '₹1,500 Amazon/Tooling voucher for workstation personal enhancements',
      icon: '🎁'
    },
    {
      id: 'r-3',
      title: '🍽️ Plant Head Executive Lunch Pass',
      costPts: 1500,
      category: 'VIP Experience',
      description: 'Quarterly lunch with VP of Manufacturing & Operations Leadership',
      icon: '🍽️'
    },
    {
      id: 'r-4',
      title: '🌟 Kaizen Gold Shield Plaque & Trophy',
      costPts: 2500,
      category: 'Annual Trophy',
      description: 'Engraved Brass Trophy presented at the Annual All-Hands Summit',
      icon: '🏆'
    }
  ];

  const handleSimulateClaim = (reward: any) => {
    setSelectedReward(reward);
    setRewardClaimedSuccess(`🎉 Point redemption voucher generated successfully for "${reward.title}"! Dispatched to Plant HR.`);
    setTimeout(() => {
      setRewardClaimedSuccess(null);
      setSelectedReward(null);
    }, 4500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 font-sans">
      
      {/* 1. Header Banner & Gamification Atmosphere */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black text-amber-400 bg-amber-950/80 border border-amber-800/80 px-3 py-1 rounded-full uppercase tracking-widest font-mono flex items-center gap-1.5 shadow-xs">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>LEAN GAMIFICATION & CULTURE HUB</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 rounded-full uppercase font-bold">
                🔥 Plant Streak: 184 Days Active
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-display text-white">
              Kaizen Gamification & Culture Analytics
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Empowering shopfloor innovators through Level Progression, XP Points, Line Battle Royales, and World-Class Kaizen Density benchmarking (Kaizens/Emp/Month).
            </p>
          </div>

          {/* Quick Plant Pulse Metric Pill Box */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex items-center space-x-4 shadow-lg shrink-0">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono font-bold">Plant Density</div>
              <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
                <span>{plantKaizenDensity}</span>
                <span className="text-xs text-amber-400 font-sans font-semibold">/ emp / mo</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-mono font-medium flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                <span>Toyota Standard: ≥ 1.50</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Main View Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-6 mt-6 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveSubTab('gamification')}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'gamification'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.02]'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>🏆 Operator Leaderboard & XP</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('density_culture')}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'density_culture'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>📊 Kaizen Density & Culture Diagnostics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('team_battles')}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'team_battles'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 scale-[1.02]'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Flame className="w-4 h-4 text-orange-400" />
            <span>⚔️ Line Battle Royale</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('rewards_store')}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'rewards_store'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 scale-[1.02]'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Gift className="w-4 h-4 text-violet-300" />
            <span>🎁 Points & Rewards Store</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {rewardClaimedSuccess && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 text-emerald-950 rounded-2xl text-xs font-mono font-bold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{rewardClaimedSuccess}</span>
          </div>
          <button onClick={() => setRewardClaimedSuccess(null)} className="p-1 text-emerald-800 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. TAB 1: OPERATOR LEADERBOARDS & GAMIFICATION XP */}
      {activeSubTab === 'gamification' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {podiumChampions.map((champ, index) => {
              const isGold = index === 0;
              const isSilver = index === 1;
              const isBronze = index === 2;

              const badgeGradient = isGold 
                ? 'from-amber-400 to-amber-600 text-slate-950 ring-amber-400/40 border-amber-300' 
                : isSilver 
                  ? 'from-slate-200 to-slate-400 text-slate-900 ring-slate-300 border-slate-300' 
                  : 'from-amber-700 to-amber-900 text-amber-100 ring-amber-700/40 border-amber-600';

              const rankMedal = isGold ? '🥇' : isSilver ? '🥈' : '🥉';

              return (
                <div
                  key={champ.cleanName}
                  onClick={() => setInspectOperator(champ)}
                  className={`bg-white border-2 rounded-3xl p-5 shadow-sm hover:shadow-lg transition-all transform hover:-translate-y-1 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isGold ? 'border-amber-400 ring-4 ring-amber-400/20' : isSilver ? 'border-slate-300' : 'border-amber-700/40'
                  }`}
                >
                  <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl font-mono text-xs font-black uppercase flex items-center gap-1 shadow-xs bg-gradient-to-r ${badgeGradient}`}>
                    <span>{rankMedal}</span>
                    <span>RANK #{champ.rank}</span>
                  </div>

                  <div>
                    {/* Avatar & Title */}
                    <div className="flex items-center space-x-3.5 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-xl flex items-center justify-center shadow-md font-mono border-2 border-white">
                        {champ.cleanName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                          {champ.cleanName}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {champ.role}
                        </p>
                        <span className="inline-block mt-0.5 text-[9.5px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {champ.levelTitle}
                        </span>
                      </div>
                    </div>

                    {/* XP Progress Bar */}
                    <div className="space-y-1 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-black text-amber-700 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>{champ.totalXp.toLocaleString()} XP</span>
                        </span>
                        <span className="text-slate-400">Next Tier: {champ.nextLevelXp} XP</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.round((champ.totalXp / champ.nextLevelXp) * 100))}%` }}
                        />
                      </div>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center text-slate-700 mb-3 font-mono">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="text-[9px] text-slate-400 uppercase font-bold">Approved</div>
                        <div className="text-sm font-black text-emerald-700">{champ.approvedCount}</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="text-[9px] text-slate-400 uppercase font-bold">Savings</div>
                        <div className="text-sm font-black text-slate-900">{formatIndianRupeesCompact(champ.verifiedSavings)}</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="text-[9px] text-slate-400 uppercase font-bold">Safety</div>
                        <div className="text-sm font-black text-amber-600">{champ.safetyKaizens}</div>
                      </div>
                    </div>
                  </div>

                  {/* Badges strip */}
                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      {champ.unlockedBadges.slice(0, 4).map(b => (
                        <span key={b.id} title={b.title} className="text-base cursor-help">
                          {b.icon}
                        </span>
                      ))}
                      {champ.unlockedBadges.length > 4 && (
                        <span className="text-[9px] font-mono text-slate-400 font-bold">
                          +{champ.unlockedBadges.length - 4}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono font-bold text-indigo-600 flex items-center gap-0.5">
                      <span>View Dossier</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-mono font-bold">
                <button
                  type="button"
                  onClick={() => setPeriodFilter('current_month')}
                  className={`px-3 py-1 rounded-lg transition ${
                    periodFilter === 'current_month' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodFilter('quarter')}
                  className={`px-3 py-1 rounded-lg transition ${
                    periodFilter === 'quarter' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Q3 Championship
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodFilter('all_time')}
                  className={`px-3 py-1 rounded-lg transition ${
                    periodFilter === 'all_time' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  All-Time Hall
                </button>
              </div>

              {/* Department Filter */}
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-mono">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Minifactories</option>
                  <option value="MF1">MF1 (Assembly)</option>
                  <option value="MF2">MF2 (Testing)</option>
                  <option value="MF3">MF3 (Stamping)</option>
                  <option value="Machining">Machining Shop</option>
                  <option value="QA">Quality Lab</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sort By */}
              <div className="flex items-center space-x-1 text-xs font-mono">
                <span className="text-slate-400 font-bold">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="xp">⚡ XP Score</option>
                  <option value="approved">✅ Approved Count</option>
                  <option value="savings">💰 Total Savings (₹)</option>
                  <option value="streak">🔥 Active Streak</option>
                </select>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search operator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 w-44 sm:w-56 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Master Full Leaderboard Table */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider font-mono text-slate-900 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Shopfloor Continuous Improvement Leaderboard</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Showing {filteredOperators.length} ranked continuous improvement champions
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Click any row for complete Kaizen record
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black font-mono uppercase text-slate-500">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Innovator</th>
                    <th className="py-3 px-4">Plant & Area</th>
                    <th className="py-3 px-4 text-center">Mastery Level</th>
                    <th className="py-3 px-4 text-center">Logged / Approved</th>
                    <th className="py-3 px-4 text-right">Verified Savings (₹)</th>
                    <th className="py-3 px-4 text-center">Safety Multiplier</th>
                    <th className="py-3 px-4 text-center">Streak</th>
                    <th className="py-3 px-4 text-right">Total XP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOperators.map((op) => {
                    const isTopThree = op.rank && op.rank <= 3;
                    const rankMedal = op.rank === 1 ? '🥇' : op.rank === 2 ? '🥈' : op.rank === 3 ? '🥉' : `#${op.rank}`;

                    return (
                      <tr
                        key={op.cleanName}
                        onClick={() => setInspectOperator(op)}
                        className={`hover:bg-indigo-50/40 transition cursor-pointer ${
                          isTopThree ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-black text-slate-700">
                          <span className={`px-2 py-0.5 rounded-lg text-xs ${
                            op.rank === 1 ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black' :
                            op.rank === 2 ? 'bg-slate-200 text-slate-800 font-bold' :
                            op.rank === 3 ? 'bg-amber-200/60 text-amber-950 font-bold' : 'text-slate-600'
                          }`}>
                            {rankMedal}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                              {op.cleanName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block leading-tight">
                                {op.cleanName}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {op.role}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-700 font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold mr-1.5 text-[10px]">
                            {op.minifactory}
                          </span>
                          <span className="text-slate-500">{op.line}</span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800">
                            {op.levelTitle}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center font-mono">
                          <span className="font-black text-emerald-700">{op.approvedCount}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-slate-600">{op.totalLogged}</span>
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatIndianRupees(op.verifiedSavings)}
                        </td>

                        <td className="py-3 px-4 text-center font-mono">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10.5px] font-bold">
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                            <span>{op.safetyKaizens}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-bold text-orange-600">
                          🔥 {op.streakMonths} mo
                        </td>

                        <td className="py-3 px-4 text-right font-mono">
                          <span className="font-black text-amber-600 text-sm">
                            {op.totalXp.toLocaleString()}
                          </span>
                          <span className="text-[9px] text-slate-400 ml-1">XP</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB 2: KAIZEN DENSITY & CULTURE DIAGNOSTICS */}
      {activeSubTab === 'density_culture' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Top 4 Culture Metric Banners */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Kaizen Density */}
            <div className="bg-white border-2 border-indigo-600/30 rounded-3xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Kaizen Density</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-indigo-950 font-mono tracking-tight flex items-baseline gap-1.5">
                <span>{plantKaizenDensity}</span>
                <span className="text-xs font-sans font-bold text-slate-400">/ emp / mo</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-100 pt-2">
                <span>Plant Target: <strong>1.50</strong></span>
                <span className="text-emerald-600 font-bold">94.6% achieved</span>
              </div>
            </div>

            {/* Shopfloor Participation Rate */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Participation Rate</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-900 font-mono tracking-tight">
                {plantParticipationRate}%
              </div>
              <div className="mt-2 text-[10px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-100 pt-2">
                <span>Active: <strong>{activeInnovatorsCount}</strong> / {totalPlantHeadcount}</span>
                <span className="text-indigo-600 font-bold">Target: &gt;80%</span>
              </div>
            </div>

            {/* Average Velocity (Lead Time) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Review Velocity</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-amber-900 font-mono tracking-tight flex items-baseline gap-1">
                <span>2.8</span>
                <span className="text-xs font-sans font-bold text-slate-400">days avg</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-100 pt-2">
                <span>Submission ➔ Approval</span>
                <span className="text-emerald-600 font-bold">Fast-tracked</span>
              </div>
            </div>

            {/* Total Accumulated Value */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Culture ROI Savings</span>
                <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {formatIndianRupees(totalPlantSavings)}
              </div>
              <div className="mt-2 text-[10px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-100 pt-2">
                <span>Per Employee Value</span>
                <span className="text-slate-900 font-bold">₹{Math.round(totalPlantSavings / totalPlantHeadcount).toLocaleString()}</span>
              </div>
            </div>

          </div>

          {/* 2 Analytical Charts in Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Chart 1: Department Kaizen Density vs Target (Bar Chart) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-black uppercase tracking-wider font-mono text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span>Department Kaizen Density Benchmark</span>
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    Kaizens / Headcount
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-4">
                  Evaluating individual manufacturing areas against the continuous improvement target.
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentDensityData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="minifactory" 
                      tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} 
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                      formatter={(val: any, name: any) => [`${val} Kaizens/emp`, name === 'density' ? 'Actual Density' : 'Target Density']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="density" name="Actual Density" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="targetDensity" name="Target Benchmark" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: PQCDSM Culture Balance Wheel (Radar Chart) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-black uppercase tracking-wider font-mono text-slate-900 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-indigo-600" />
                    <span>PQCDSM Culture Balance Wheel</span>
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-600 font-bold">
                    6-Pillars
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Ensuring ideas are evenly distributed across Safety, Quality, and Productivity.
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={pqcdsmBalanceData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9.5, fill: '#475569', fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 30]} tick={{ fontSize: 8 }} />
                    <Radar name="Kaizen Focus" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.45} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Department Density Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-xs font-black uppercase tracking-wider font-mono text-slate-900">
                Departmental Kaizen Density & Culture Diagnostics Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-mono font-black uppercase text-slate-500 border-b border-slate-200">
                    <th className="py-3 px-4">Department / Cell</th>
                    <th className="py-3 px-4 text-center">Headcount</th>
                    <th className="py-3 px-4 text-center">Logged / Approved</th>
                    <th className="py-3 px-4 text-center">Density (K/Emp)</th>
                    <th className="py-3 px-4 text-center">Target</th>
                    <th className="py-3 px-4 text-center">Participation %</th>
                    <th className="py-3 px-4 text-right">Cost Savings (₹)</th>
                    <th className="py-3 px-4 text-center">Health Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departmentDensityData.map(dept => {
                    const isTargetMet = dept.density >= dept.targetDensity;
                    return (
                      <tr key={dept.department} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                          {dept.department}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-600">
                          {dept.headcount}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          <span className="text-emerald-700 font-bold">{dept.approvedKaizens}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-slate-600">{dept.totalKaizens}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-indigo-950">
                          {dept.density}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-400">
                          {dept.targetDensity}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          <div className="inline-flex items-center space-x-1.5">
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full" 
                                style={{ width: `${dept.participationRate}%` }} 
                              />
                            </div>
                            <span className="font-bold text-slate-700">{dept.participationRate}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatIndianRupees(dept.totalSavings)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            isTargetMet 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {isTargetMet ? '🌟 Benchmark Met' : '📈 In Progress'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 4. TAB 3: LINE BATTLE ROYALE (Team vs Team Challenges) */}
      {activeSubTab === 'team_battles' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gradient-to-r from-orange-600 to-rose-600 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest bg-black/30 px-3 py-1 rounded-full">
                🔥 MONTHLY LINE CHALLENGE
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-display">
                Mini-Factory Line Championship Battle
              </h2>
              <p className="text-orange-100 text-xs max-w-xl">
                The winning line with highest Kaizen Density & Zero Safety Incidents wins the Rolling Plant Trophy & Team Cafeteria Voucher!
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 text-center shrink-0">
              <div className="text-[10px] font-mono uppercase text-orange-200">Challenge Countdown</div>
              <div className="text-xl font-black font-mono mt-0.5">14 Days : 08 Hrs</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Line 1 Battle Card */}
            <div className="bg-white border-2 border-orange-500/40 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black font-mono uppercase px-2.5 py-0.5 rounded bg-orange-100 text-orange-800">
                  MF1 ASSEMBLY
                </span>
                <span className="text-xl">🥇 1st Place</span>
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900">Line 1 - Turbo Assembly</h3>
                <p className="text-xs text-slate-500">Lead: Rajesh Patil (Supervisor)</p>
              </div>

              <div className="space-y-2 font-mono text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Team Score:</span>
                  <strong className="text-orange-600 font-black">4,850 Pts</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kaizen Density:</span>
                  <strong className="text-slate-900">1.82 / emp</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Participation:</span>
                  <strong className="text-emerald-600">92% Active</strong>
                </div>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full w-[92%]" />
              </div>
            </div>

            {/* Line 2 Battle Card */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black font-mono uppercase px-2.5 py-0.5 rounded bg-blue-100 text-blue-800">
                  MF2 TESTING
                </span>
                <span className="text-xl">🥈 2nd Place</span>
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900">Line 2 - Valve Testing Cell</h3>
                <p className="text-xs text-slate-500">Lead: Sunita Rao (Technician)</p>
              </div>

              <div className="space-y-2 font-mono text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Team Score:</span>
                  <strong className="text-blue-600 font-black">3,920 Pts</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kaizen Density:</span>
                  <strong className="text-slate-900">1.54 / emp</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Participation:</span>
                  <strong className="text-emerald-600">84% Active</strong>
                </div>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full w-[84%]" />
              </div>
            </div>

            {/* Line 3 Battle Card */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black font-mono uppercase px-2.5 py-0.5 rounded bg-purple-100 text-purple-800">
                  MACHINING
                </span>
                <span className="text-xl">🥉 3rd Place</span>
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900">CNC Machining Bay</h3>
                <p className="text-xs text-slate-500">Lead: Sanjay Patil (Machinist)</p>
              </div>

              <div className="space-y-2 font-mono text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Team Score:</span>
                  <strong className="text-purple-600 font-black">3,110 Pts</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kaizen Density:</span>
                  <strong className="text-slate-900">1.28 / emp</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Participation:</span>
                  <strong className="text-emerald-600">75% Active</strong>
                </div>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full w-[75%]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 4: POINTS & REWARDS CATALOG */}
      {activeSubTab === 'rewards_store' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase font-mono flex items-center gap-2">
                  <Gift className="w-5 h-5 text-violet-600" />
                  <span>Shopfloor Kaizen Points Redemption Store</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Convert earned Kaizen XP points into official certificates, tools, and recognition perks.
                </p>
              </div>
              <div className="bg-violet-50 border border-violet-200 px-4 py-2 rounded-2xl flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-xs font-mono font-bold text-violet-950">
                  Your Balance: <strong className="text-amber-600">1,850 XP</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {rewardsCatalog.map((item) => (
                <div 
                  key={item.id}
                  className="border-2 border-slate-200 hover:border-violet-500 rounded-2xl p-4 flex flex-col justify-between transition group bg-slate-50/50 hover:bg-white"
                >
                  <div className="space-y-2">
                    <div className="text-3xl mb-1">{item.icon}</div>
                    <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-violet-100 text-violet-800">
                      {item.category}
                    </span>
                    <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-violet-700 transition">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-amber-600 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 fill-amber-500" />
                      <span>{item.costPts} XP</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSimulateClaim(item)}
                      className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer shadow-xs"
                    >
                      Redeem
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. OPERATOR DOSSIER MODAL */}
      {inspectOperator && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl w-[96vw] max-w-[96vw] h-[94vh] max-h-[94vh] p-6 shadow-2xl border border-slate-200 space-y-5 overflow-y-auto animate-scale-up">
            
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-mono font-black text-lg flex items-center justify-center shadow-md">
                  {inspectOperator.cleanName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{inspectOperator.cleanName}</h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
                    <span>{inspectOperator.role}</span>
                    <span>•</span>
                    <span className="text-indigo-700 font-bold">{inspectOperator.minifactory} ({inspectOperator.line})</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setInspectOperator(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Level Tier Card */}
            <div className="bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-200/60 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-800 uppercase">Mastery Level Tier</span>
                <div className="text-base font-black text-slate-900 font-mono mt-0.5">
                  {inspectOperator.levelTitle}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  Rank #{inspectOperator.rank} Plant Continuous Improvement Leaderboard
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-2xl font-black text-amber-600">{inspectOperator.totalXp.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">Total XP Points</div>
              </div>
            </div>

            {/* Unlocked Badges */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase font-mono text-slate-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Unlocked Achievement Badges ({inspectOperator.unlockedBadges.length})</span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {inspectOperator.unlockedBadges.map(b => (
                  <div key={b.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start space-x-2.5">
                    <span className="text-2xl">{b.icon}</span>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block leading-tight">{b.title}</span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">{b.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submitted Kaizens preview */}
            {inspectOperator.kaizens.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase font-mono text-slate-900">
                  Recent Registered Kaizens ({inspectOperator.kaizens.length})
                </h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {inspectOperator.kaizens.map(k => (
                    <div 
                      key={k.id}
                      onClick={() => {
                        if (onSelectKaizen) {
                          onSelectKaizen(k);
                          setInspectOperator(null);
                        }
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 flex items-center justify-between text-xs cursor-pointer transition"
                    >
                      <div className="truncate pr-2">
                        <span className="font-mono font-bold text-slate-900 block truncate">{k.title}</span>
                        <span className="text-[10px] text-slate-500">{k.srNo} • {k.area}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700 text-xs shrink-0">
                        {k.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectOperator(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-mono font-bold transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
