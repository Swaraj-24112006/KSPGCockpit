import React, { useState, useEffect } from 'react';
import { Kaizen, PpsrReport } from '../types';
import { authFetch } from '../shared/utils/auth';
import { 
  Trophy, 
  Award, 
  CheckCircle2, 
  Users, 
  Calendar, 
  Printer, 
  X, 
  Plus, 
  UserCheck, 
  Search,
  Filter,
  Eye,
  Star,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Medal,
  Check,
  Building,
  ArrowUpRight,
  ArrowLeft
} from 'lucide-react';
import { formatIndianRupees } from '../utils';

interface CftMonthlyAwardsProps {
  kaizens: Kaizen[];
  ppsrReports?: PpsrReport[];
  onUpdateKaizen?: (id: string, updatedFields: Partial<Kaizen>) => void;
  onUpdatePpsrReport?: (id: string, updatedFields: Partial<PpsrReport>) => void;
}

export interface CftMember {
  id: string;
  name: string;
  role: string;
  department?: string;
}

// Category definition for Department & Minifactory Winners
export type CategoryKey = 'MF1' | 'MF2' | 'MF3' | 'Machining' | 'Quality' | 'Maintenance';

export const CATEGORY_CONFIGS: {
  key: CategoryKey;
  title: string;
  subtitle: string;
  winnerCount: number;
  badgeBg: string;
}[] = [
  {
    key: 'MF1',
    title: 'Minifactory 1 (MF1)',
    subtitle: 'Vacuum Pump & Sub-Assemblies',
    winnerCount: 1,
    badgeBg: 'from-amber-500 to-yellow-600 border-amber-400 text-slate-950'
  },
  {
    key: 'MF2',
    title: 'Minifactory 2 (MF2)',
    subtitle: 'EGR Valve & Power Cell Lines (2 Winners)',
    winnerCount: 2,
    badgeBg: 'from-blue-600 to-indigo-700 border-blue-400 text-white'
  },
  {
    key: 'MF3',
    title: 'Minifactory 3 (MF3)',
    subtitle: 'Bypass Valve & Smart Sensors',
    winnerCount: 1,
    badgeBg: 'from-emerald-600 to-teal-700 border-emerald-400 text-white'
  },
  {
    key: 'Machining',
    title: 'Machining Department',
    subtitle: 'CNC, Milling, Turning & Tooling Shop',
    winnerCount: 1,
    badgeBg: 'from-orange-500 to-amber-600 border-amber-400 text-slate-950'
  },
  {
    key: 'Quality',
    title: 'Quality Department',
    subtitle: 'QA/QC, Metrology & Inspection Benches',
    winnerCount: 1,
    badgeBg: 'from-violet-600 to-purple-700 border-purple-400 text-white'
  },
  {
    key: 'Maintenance',
    title: 'Maintenance Department',
    subtitle: 'Plant Electrical, Utilities & Automation',
    winnerCount: 1,
    badgeBg: 'from-rose-600 to-pink-700 border-rose-400 text-white'
  }
];

export default function CftMonthlyAwards({
  kaizens,
  onUpdateKaizen
}: CftMonthlyAwardsProps) {
  // Month & Year Selection
  const [selectedMonth, setSelectedMonth] = useState('August');
  const [selectedYear, setSelectedYear] = useState('2026');

  // Backend session ID
  const [sessionId, setSessionId] = useState<number | null>(null);

  // Attendance Toggle (Expand/Collapse panel)
  const [isAttendanceExpanded, setIsAttendanceExpanded] = useState(true);

  // Inline Member Addition Form Visibility & Inputs
  const [showInlineAddForm, setShowInlineAddForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newMemberDept, setNewMemberDept] = useState('Operations');

  // Master List of CFT Members (loaded from backend)
  const [cftMembers, setCftMembers] = useState<CftMember[]>([
    { id: '1', name: 'Amit Mehta', role: 'Kaizen & Quality Lead', department: 'Quality' },
    { id: '2', name: 'Sunita Rao', role: 'Quality Specialist', department: 'Quality' },
    { id: '3', name: 'Rajesh Patil', role: 'Plant Supervisor', department: 'Operations' },
    { id: '4', name: 'Arjun Mehra', role: 'Automation Lead', department: 'Engineering' },
    { id: '5', name: 'Vijay Deshmukh', role: 'Area Leader', department: 'Maintenance' },
    { id: '6', name: 'Sanjay Patil', role: 'Process Specialist', department: 'Machining' },
    { id: '7', name: 'Rahul Sharma', role: 'Maintenance Lead', department: 'Maintenance' }
  ]);

  // Present Members Set (stored by member.id)
  const [presentMemberIds, setPresentMemberIds] = useState<string[]>(['1', '2', '3', '4', '5', '6', '7']);

  // Rating store: Map of memberId -> kaizenId -> rating (1..5)
  const [ratings, setRatings] = useState<Record<string, Record<string, number>>>({});

  // Category Overrides
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, CategoryKey>>({});

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [benefitFilter, setBenefitFilter] = useState<string>('All');

  // Inspection Modal
  const [inspectKaizen, setInspectKaizen] = useState<Kaizen | null>(null);

  // Certificate Modal
  const [showCertificateModal, setShowCertificateModal] = useState<{
    categoryTitle: string;
    rankLabel: string;
    kaizenTitle: string;
    winnerName: string;
    minifactory: string;
    costSaveText: string;
    srNo: string;
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

  const availableMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const availableYears = ['2026', '2025', '2024'];

  // Dynamic award categories loaded from DB (defaulting to CATEGORY_CONFIGS)
  const [categories, setCategories] = useState<{
    key: CategoryKey;
    title: string;
    subtitle: string;
    winnerCount: number;
    badgeBg: string;
  }[]>(CATEGORY_CONFIGS);

  // Server-managed eligible kaizens
  const [serverKaizens, setServerKaizens] = useState<Kaizen[] | null>(null);
  const [allSessionKaizens, setAllSessionKaizens] = useState<Kaizen[] | null>(null);
  const [isKaizensLoading, setIsKaizensLoading] = useState(false);
  const [sessionWinners, setSessionWinners] = useState<any[]>([]);

  // Load configured award categories from DB
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await authFetch('/api/v1/cft/categories/');
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setCategories(json.data.map((c: any) => ({
            key: (c.key || c.code) as CategoryKey,
            title: c.title || c.name,
            subtitle: c.subtitle || '',
            winnerCount: c.winnerCount || c.winner_count || 1,
            badgeBg: c.badgeBg || c.badge_bg || 'from-blue-600 to-indigo-700 border-blue-400 text-white'
          })));
        }
      } catch (err) {
        console.error('Failed to load award categories from backend:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch all eligible kaizens for current session (for winner calculations)
  const fetchAllSessionKaizens = async (currentSessionId: number) => {
    try {
      const res = await authFetch(`/api/v1/cft/sessions/${currentSessionId}/kaizens/`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const mapped = json.data.map((k: any) => ({
          id: String(k.id),
          srNo: k.srNo || k.sr_no,
          title: k.title,
          ideaBy: k.ideaBy || k.idea_by || k.created_by_name || 'Staff',
          department: k.area || k.location || '',
          minifactory: k.minifactory || k.mini_factory || '',
          location: k.location || '',
          area: k.area || '',
          machine: k.machine || '',
          month: k.month,
          costSave: Number(k.costSave || k.cost_save || 0),
          status: k.status,
          classification: k.classification,
          benefits: k.benefits || { p: false, q: false, c: false, d: false, s: false, m: false },
          category: k.category,
          problemBefore: k.problem_before || '',
          counterMeasureAfter: k.counter_measure_after || '',
          remark: k.remark || '',
          result: k.result || '',
          implementationDate: k.implementation_date || k.suggestion_date || '',
        }));
        setAllSessionKaizens(mapped);
      }
    } catch (err) {
      console.error('Error fetching all session kaizens:', err);
    }
  };

  // ── Sync with Django Backend for Month & Year Session ──
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const res = await authFetch('/api/v1/cft/sessions/get-or-create/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            month: selectedMonth,
            year: parseInt(selectedYear) || 2026,
            openedByName: 'CFT Committee Lead',
          }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setSessionId(d.id);

          // Update members roster from DB
          if (d.members && d.members.length > 0) {
            setCftMembers(d.members.map((m: any) => ({
              id: String(m.id),
              name: m.name,
              role: m.role,
              department: m.department,
            })));
          }

          // Update attendance
          if (d.presentIds && Array.isArray(d.presentIds)) {
            setPresentMemberIds(d.presentIds.map((id: any) => String(id)));
          }

          // Update category overrides
          if (d.categoryOverrides) {
            setCategoryOverrides(d.categoryOverrides);
          }

          // Update existing ratings
          if (d.allRatings && Array.isArray(d.allRatings)) {
            const rMap: Record<string, Record<string, number>> = {};
            d.allRatings.forEach((r: any) => {
              const mId = String(r.member);
              const kId = String(r.kaizen);
              if (!rMap[mId]) rMap[mId] = {};
              rMap[mId][kId] = r.stars;
            });
            setRatings(rMap);
          }

          // Load all eligible kaizens for session
          fetchAllSessionKaizens(d.id);
        }
      } catch (err) {
        console.error('Error fetching CFT session data from backend:', err);
      }
    };

    fetchSessionData();
  }, [selectedMonth, selectedYear]);

  // Load authoritative session winners on session load (Step 8)
  useEffect(() => {
    if (!sessionId) return;
    const fetchWinners = async () => {
      try {
        const res = await authFetch(`/api/v1/cft/sessions/${sessionId}/winners/`);
        const json = await res.json();
        if (json.success && json.data && json.data.categories) {
          setSessionWinners(json.data.categories);
        }
      } catch (err) {
        console.error('Failed to load session winners:', err);
      }
    };
    fetchWinners();
  }, [sessionId]);

  // Load filtered eligible Kaizens from Django backend (Step 8 & 9)
  useEffect(() => {
    if (!sessionId) return;

    const fetchFilteredKaizens = async () => {
      setIsKaizensLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.append('search', searchQuery.trim());
        if (categoryFilter !== 'All') params.append('category', categoryFilter);
        if (benefitFilter !== 'All') params.append('benefit', benefitFilter);

        const qStr = params.toString() ? `?${params.toString()}` : '';
        const res = await authFetch(`/api/v1/cft/sessions/${sessionId}/kaizens/${qStr}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const mapped = json.data.map((k: any) => ({
            id: String(k.id),
            srNo: k.srNo || k.sr_no,
            title: k.title,
            ideaBy: k.ideaBy || k.idea_by || k.created_by_name || 'Staff',
            department: k.area || k.location || '',
            minifactory: k.minifactory || k.mini_factory || '',
            location: k.location || '',
            area: k.area || '',
            machine: k.machine || '',
            month: k.month,
            costSave: Number(k.costSave || k.cost_save || 0),
            status: k.status,
            classification: k.classification,
            benefits: k.benefits || { p: false, q: false, c: false, d: false, s: false, m: false },
            category: k.category,
            problemBefore: k.problem_before || '',
            counterMeasureAfter: k.counter_measure_after || '',
            remark: k.remark || '',
            result: k.result || '',
            implementationDate: k.implementation_date || k.suggestion_date || '',
          }));
          setServerKaizens(mapped);
        }
      } catch (err) {
        console.error('Error fetching filtered eligible kaizens:', err);
      } finally {
        setIsKaizensLoading(false);
      }
    };

    fetchFilteredKaizens();
  }, [sessionId, searchQuery, categoryFilter, benefitFilter]);


  // Source Kaizens for monthly calculations (Django server-eligible or prop fallback)
  const closedKaizensForMonth = allSessionKaizens !== null ? allSessionKaizens : kaizens.filter(k => {
    const s = (k.status || '').toLowerCase();
    const isEligible = s === 'approved' || s === 'good point' || s === 'good_point' || s === 'closed' || s === 'submitted' || s === 'pending';
    const monthMatches = selectedMonth === 'All' || (k.month && k.month.toLowerCase().includes(selectedMonth.toLowerCase()));
    return isEligible && monthMatches;
  });

  // Helper function to resolve category
  function getKaizenCategory(k: Kaizen): CategoryKey {
    if (categoryOverrides[k.id]) {
      return categoryOverrides[k.id];
    }
    if ((k as any).category) {
      return (k as any).category as CategoryKey;
    }
    const mf = ((k as any).miniFactory || k.minifactory || '').toUpperCase();
    const loc = (k.location || '').toLowerCase();
    const area = (k.area || '').toLowerCase();
    const machine = (k.machine || '').toLowerCase();

    if (mf.includes('MF1') || mf.includes('1') || area.includes('mf1') || loc.includes('pune')) return 'MF1';
    if (mf.includes('MF2') || mf.includes('2') || area.includes('egr') || area.includes('mf2')) return 'MF2';
    if (mf.includes('MF3') || mf.includes('3') || area.includes('bpv') || area.includes('mf3')) return 'MF3';
    if (mf.includes('MACHIN') || area.includes('machin') || machine.includes('cnc') || machine.includes('grind') || machine.includes('mill')) return 'Machining';
    if (mf.includes('QUAL') || area.includes('qual') || area.includes('cmm') || loc.includes('metrology') || k.classification === 'Good Point') return 'Quality';
    if (mf.includes('MAINT') || area.includes('maint') || area.includes('utilit') || machine.includes('conduit') || machine.includes('blower')) return 'Maintenance';

    return 'MF1';
  }

  // Filtered Kaizens for Table (fallback if serverKaizens is not yet available)
  const fallbackFilteredKaizens = closedKaizensForMonth.filter(k => {
    const cat = getKaizenCategory(k);
    if (categoryFilter !== 'All' && cat !== categoryFilter) return false;

    if (benefitFilter !== 'All') {
      const key = benefitFilter.toLowerCase() as 'p' | 'q' | 'c' | 'd' | 's' | 'm';
      if (!k.benefits?.[key]) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSr = k.srNo.toLowerCase().includes(q);
      const matchTitle = k.title.toLowerCase().includes(q);
      const matchBy = (k.ideaBy || '').toLowerCase().includes(q);
      const matchLoc = (k.location || '').toLowerCase().includes(q);
      const matchArea = (k.area || '').toLowerCase().includes(q);
      return matchSr || matchTitle || matchBy || matchLoc || matchArea;
    }

    return true;
  });

  // Authoritative table kaizens: Django backend when available, fallback to client filtering
  const displayTableKaizens = serverKaizens !== null ? serverKaizens : fallbackFilteredKaizens;


  // Calculate Cumulative Score
  const getCumulativeScore = (kaizenId: string) => {
    let totalScore = 0;
    let votesCount = 0;

    presentMemberIds.forEach(memberId => {
      const rating = ratings[memberId]?.[kaizenId];
      if (rating && rating > 0) {
        totalScore += rating;
        votesCount += 1;
      }
    });

    return { totalScore, votesCount };
  };

  // Toggle Member Attendance & Sync with DB
  const toggleAttendance = async (memberId: string) => {
    let newPresentIds: string[];
    if (presentMemberIds.includes(memberId)) {
      if (presentMemberIds.length === 1) {
        showToast('At least 1 CFT member must be present for evaluation');
        return;
      }
      newPresentIds = presentMemberIds.filter(id => id !== memberId);
    } else {
      newPresentIds = [...presentMemberIds, memberId];
    }
    setPresentMemberIds(newPresentIds);

    if (sessionId) {
      try {
        await authFetch(`/api/v1/cft/sessions/${sessionId}/update-attendance/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            present_member_ids: newPresentIds.map(Number).filter(n => !isNaN(n))
          }),
        });
      } catch (err) {
        console.error('Failed to update attendance on server:', err);
      }
    }
  };

  // Rate Kaizen & Save to DB
  const handleRateKaizen = async (memberId: string, kaizenId: string, ratingValue: number) => {
    setRatings(prev => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || {}),
        [kaizenId]: ratingValue
      }
    }));

    if (sessionId) {
      try {
        await authFetch(`/api/v1/cft/sessions/${sessionId}/submit-ratings/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            member_id: Number(memberId),
            ratings: { [kaizenId]: ratingValue }
          }),
        });
        
        // Step 6: Recalculate winners immediately when ratings change
        const calcRes = await authFetch(`/api/v1/cft/sessions/${sessionId}/calculate-winners/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const calcJson = await calcRes.json();
        if (calcJson.success && calcJson.data && calcJson.data.categories) {
          setSessionWinners(calcJson.data.categories);
        }
      } catch (err) {
        console.error('Failed to persist star rating or recalculate winners:', err);
      }
    }
  };

  // Add Member Inline Right on the Screen & Save to Database
  const handleAddMemberInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    try {
      const res = await authFetch('/api/v1/cft/members/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMemberName.trim(),
          role: newMemberRole.trim() || 'CFT Reviewer',
          department: newMemberDept
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const newMember: CftMember = {
          id: String(json.data.id),
          name: json.data.name,
          role: json.data.role,
          department: json.data.department
        };

        setCftMembers(prev => [...prev, newMember]);
        const updatedPresent = [...presentMemberIds, newMember.id];
        setPresentMemberIds(updatedPresent);

        if (sessionId) {
          await authFetch(`/api/v1/cft/sessions/${sessionId}/update-attendance/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              present_member_ids: updatedPresent.map(Number).filter(n => !isNaN(n))
            }),
          });
        }

        setNewMemberName('');
        setNewMemberRole('');
        setShowInlineAddForm(false);
        showToast(`✅ ${newMember.name} added to CFT Committee & saved to database!`);
        return;
      } else {
        showToast(`❌ Failed to add member: ${json.detail || 'Server error'}`);
      }
    } catch (err) {
      console.error('Failed to create member on backend:', err);
      showToast('❌ Network error: Could not reach backend server to add member.');
    }
  };


  // Category Override Handler
  const handleCategoryOverrideChange = async (kaizenId: string, newCat: CategoryKey) => {
    const updated = {
      ...categoryOverrides,
      [kaizenId]: newCat
    };
    setCategoryOverrides(updated);

    if (sessionId) {
      try {
        await authFetch(`/api/v1/cft/sessions/${sessionId}/update-overrides/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category_overrides: updated }),
        });
        fetchAllSessionKaizens(sessionId);
        
        // Recalculate winners since category changed
        const calcRes = await authFetch(`/api/v1/cft/sessions/${sessionId}/calculate-winners/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const calcJson = await calcRes.json();
        if (calcJson.success && calcJson.data && calcJson.data.categories) {
          setSessionWinners(calcJson.data.categories);
        }
      } catch (err) {
        console.error('Failed to persist category override or recalculate:', err);
      }
    }
  };


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-amber-400 border border-amber-500/50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold font-mono animate-bounce">
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
                <span className="text-[10px] font-mono uppercase font-black tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                  SINGLE-SCREEN EVALUATION DESK • POSTGRESQL CONNECTED
                </span>
              </div>
              <h1 className="text-2xl font-black font-display text-white mt-0.5">
                Monthly Best Kaizen Awards & CFT Evaluation
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Rate Kaizens in real-time with present CFT reviewers and calculate department winners instantly on a single screen with database persistence.
              </p>
            </div>
          </div>

          {/* Month, Year & Print Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-slate-900 px-3.5 py-2 rounded-2xl border border-slate-800 font-mono text-xs">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-400 font-bold">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-950 text-amber-300 font-black py-1 px-2.5 rounded-xl border border-slate-700 focus:outline-none cursor-pointer"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <span className="text-slate-400 font-bold ml-2">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-950 text-amber-300 font-black py-1 px-2.5 rounded-xl border border-slate-700 focus:outline-none cursor-pointer"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black font-mono text-xs rounded-2xl shadow-md transition flex items-center space-x-2 cursor-pointer border border-amber-300"
            >
              <Printer className="w-4 h-4" />
              <span>PRINT MINUTES</span>
            </button>
          </div>

        </div>

        {/* Real-time Stats Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 font-mono text-xs">
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Evaluated Kaizens</span>
            <span className="text-lg font-black text-emerald-400 mt-0.5 block">{closedKaizensForMonth.length} items</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Active CFT Voters</span>
            <span className="text-lg font-black text-amber-400 mt-0.5 block">{presentMemberIds.length} / {cftMembers.length} present</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Winner Podiums</span>
            <span className="text-lg font-black text-blue-400 mt-0.5 block">6 Department Podiums</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Evaluation Mode</span>
            <span className="text-lg font-black text-purple-400 mt-0.5 block">1-5 Stars Scoring</span>
          </div>
        </div>
      </div>

      {/* INTEGRATED CFT MEMBER PANEL & INLINE TEAM ADDITION */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-black font-mono text-slate-900 uppercase">
              CFT Review Committee Attendance ({presentMemberIds.length} Present)
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowInlineAddForm(!showInlineAddForm)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-mono text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>{showInlineAddForm ? 'Cancel Add Member' : '+ Add New Committee Member'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAttendanceExpanded(!isAttendanceExpanded)}
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 transition cursor-pointer"
            >
              {isAttendanceExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* INLINE ADD NEW TEAM MEMBER FORM RIGHT ON THE SCREEN */}
        {showInlineAddForm && (
          <form onSubmit={handleAddMemberInline} className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3 animate-fade-in font-mono">
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
              ⚡ QUICK ADD NEW COMMITTEE MEMBER TO DATABASE
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Full Name: *</label>
                <input
                  required
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="e.g. Ketan Patil"
                  className="w-full bg-slate-950 border border-slate-700 text-white px-3 py-1.5 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Designation / Role:</label>
                <input
                  type="text"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  placeholder="e.g. Process Engineer"
                  className="w-full bg-slate-950 border border-slate-700 text-white px-3 py-1.5 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Department:</label>
                <select
                  value={newMemberDept}
                  onChange={(e) => setNewMemberDept(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-amber-300 px-3 py-1.5 rounded-xl font-bold focus:outline-none cursor-pointer"
                >
                  <option value="Operations">Operations</option>
                  <option value="Quality">Quality</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Machining">Machining</option>
                  <option value="Management">Management</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center space-x-1.5 shadow-md cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3px]" />
                <span>SAVE TO DATABASE & MARK PRESENT</span>
              </button>
            </div>
          </form>
        )}

        {/* EXPANDABLE ATTENDANCE CHIPS */}
        {isAttendanceExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
            {cftMembers.map((m) => {
              const isPresent = presentMemberIds.includes(m.id);

              return (
                <div
                  key={m.id}
                  onClick={() => toggleAttendance(m.id)}
                  className={`p-3 rounded-2xl border-2 transition cursor-pointer select-none space-y-1 ${
                    isPresent
                      ? 'bg-emerald-50/70 border-emerald-500 text-slate-900 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-2 h-2 rounded-full ${isPresent ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={`text-[10px] font-mono font-bold ${isPresent ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {isPresent ? 'PRESENT' : 'ABSENT'}
                    </span>
                  </div>

                  <h4 className={`text-xs font-bold truncate ${isPresent ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                    {m.name}
                  </h4>
                  <p className="text-[10px] font-mono text-slate-500 truncate">{m.role}</p>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* TOP FILTERS BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3 text-xs font-mono">
        
        {/* Search Input */}
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by SR No, Title, Initiator, Location..."
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl pl-9 pr-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Minifactory / Department */}
        <div className="md:col-span-4 flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-slate-500 font-bold shrink-0">Dept:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold py-2 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="All">All Minifactories & Depts</option>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* PQCDSM Benefit */}
        <div className="md:col-span-3 flex items-center space-x-2">
          <span className="text-slate-500 font-bold shrink-0">PQCDSM:</span>
          <select
            value={benefitFilter}
            onChange={(e) => setBenefitFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold py-2 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="All">All Benefits</option>
            <option value="p">P - Productivity</option>
            <option value="q">Q - Quality</option>
            <option value="c">C - Cost</option>
            <option value="d">D - Delivery</option>
            <option value="s">S - Safety</option>
            <option value="m">M - Morale</option>
          </select>
        </div>

      </div>

      {/* MAIN UNIFIED TABULAR SCORING BOARD */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4 text-amber-400" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-amber-300">
              Kaizen Review & Present CFT Member Scoring Matrix ({displayTableKaizens.length} Items)
            </h3>
            {isKaizensLoading && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono animate-pulse">
                Syncing with Django...
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Ratings: 1 (Minimal) to 5 (Outstanding) • Saved in PostgreSQL
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-950 text-slate-300 font-mono text-[11px] uppercase border-b border-slate-800">
                <th className="p-3 border-r border-slate-800 w-[100px] min-w-[100px]">SR No & Date</th>
                <th className="p-3 border-r border-slate-800 w-[190px] min-w-[170px]">Kaizen Title & Initiator</th>
                <th className="p-3 border-r border-slate-800 w-[140px] min-w-[130px]">Department Category</th>
                <th className="p-3 border-r border-slate-800 w-[210px] min-w-[190px]">Problem & Countermeasure</th>
                <th className="p-3 border-r border-slate-800 w-[95px] min-w-[90px] text-right">Savings (₹)</th>
                <th className="p-3 border-r border-slate-800 text-center bg-amber-950 text-amber-300 font-bold min-w-[280px]">
                  ⭐ Present CFT Member Ratings (1–5 Stars)
                </th>
                <th className="p-3 w-[110px] min-w-[110px] text-center bg-slate-900 text-amber-400 font-black sticky right-0 z-20 shadow-md border-l-2 border-amber-500/40">
                  Cumulative Score
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans text-slate-800">
              {displayTableKaizens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-medium">
                    No Kaizens match your filter criteria for {selectedMonth} {selectedYear}.
                  </td>
                </tr>
              ) : (
                displayTableKaizens.map((k) => {
                  const currentCategory = getKaizenCategory(k);
                  const { totalScore, votesCount } = getCumulativeScore(k.id);

                  return (
                    <tr key={k.id} className="hover:bg-amber-50/30 transition-colors group">
                      
                      {/* SR No */}
                      <td className="p-2.5 border-r border-slate-200 font-mono">
                        <span className="font-bold text-slate-900 block">{k.srNo}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{(k as any).implementationDate || k.implementedDate || k.closingTargetDate}</span>
                        <button
                          type="button"
                          onClick={() => setInspectKaizen(k)}
                          className="mt-1.5 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-indigo-600" />
                          <span>Inspect Sheet</span>
                        </button>
                      </td>

                      {/* Title & Initiator */}
                      <td className="p-2.5 border-r border-slate-200 cursor-pointer" onClick={() => setInspectKaizen(k)}>
                        <h4 className="font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition">
                          {k.title}
                        </h4>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          By: <strong className="text-slate-800">{k.ideaBy}</strong>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Loc: {(k as any).miniFactory || k.minifactory} • {k.location}
                        </span>
                      </td>

                      {/* Department Dropdown */}
                      <td className="p-2.5 border-r border-slate-200">
                        <select
                          value={currentCategory}
                          onChange={(e) => handleCategoryOverrideChange(k.id, e.target.value as CategoryKey)}
                          className="bg-slate-50 border border-slate-300 text-slate-900 text-[11px] font-mono font-bold py-1 px-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer w-full"
                        >
                          {categories.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </td>


                      {/* Problem & Countermeasure */}
                      <td className="p-2.5 border-r border-slate-200 text-[11px] space-y-1">
                        <div className="text-slate-600 line-clamp-2">
                          <span className="font-bold text-red-700 font-mono">Before: </span>
                          {k.problemBefore}
                        </div>
                        <div className="text-slate-800 line-clamp-2 font-medium">
                          <span className="font-bold text-emerald-700 font-mono">After: </span>
                          {k.counterMeasureAfter}
                        </div>
                      </td>

                      {/* Cost Savings */}
                      <td className="p-2.5 border-r border-slate-200 text-right font-mono font-bold text-emerald-700 text-xs">
                        {k.costSave ? formatIndianRupees(k.costSave) : 'N/A'}
                      </td>

                      {/* CFT Rating Buttons */}
                      <td className="p-2.5 border-r border-slate-200 bg-amber-50/20">
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {cftMembers.filter(m => presentMemberIds.includes(m.id)).map(m => {
                            const currentRating = ratings[m.id]?.[k.id] || 0;

                            return (
                              <div key={m.id} className="bg-white border border-slate-300 p-1 rounded-lg text-center space-y-0.5 shadow-2xs">
                                <span className="text-[9px] font-mono font-bold text-slate-600 block truncate max-w-[55px]">
                                  {m.name.split(' ')[0]}
                                </span>
                                <div className="flex items-center justify-center space-x-[2px]">
                                  {[1, 2, 3, 4, 5].map(val => (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => handleRateKaizen(m.id, k.id, val)}
                                      className={`w-4.5 h-4.5 text-[9px] font-bold font-mono rounded transition flex items-center justify-center cursor-pointer ${
                                        currentRating === val
                                          ? 'bg-amber-500 text-slate-950 font-black ring-1 ring-amber-400 scale-105'
                                          : 'bg-slate-100 hover:bg-amber-100 text-slate-600'
                                      }`}
                                    >
                                      {val}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Live Cumulative Score - Sticky Right Column */}
                      <td className="p-2.5 text-center bg-slate-900 text-white font-mono sticky right-0 z-10 shadow-md border-l-2 border-amber-500/40 group-hover:bg-slate-850">
                        <div className="text-sm sm:text-base font-black text-amber-400">{totalScore} pts</div>
                        <div className="text-[9px] text-slate-400 font-bold">{votesCount} / {presentMemberIds.length} votes</div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* REAL-TIME DEPARTMENT WINNERS PODIUM (ON THE SAME SCREEN!) */}
      <div className="bg-slate-950 text-white border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Medal className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black font-display text-white">
              Real-time Cumulative Score Winner Podiums ({selectedMonth} {selectedYear})
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Auto-calculated from highest CFT cumulative scores
          </span>
        </div>

        {/* Winners Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {categories.map((config) => {
            // Find backend-calculated winners for this category
            const serverCategory = sessionWinners.find(c => c.category === config.key.toUpperCase());
            const winners = serverCategory ? serverCategory.winners : [];

            return (
              <div
                key={config.key}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                <div>
                  <div className="border-b border-slate-800 pb-3 mb-3">
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black font-mono uppercase tracking-wider bg-gradient-to-r ${config.badgeBg} shadow-sm inline-block`}>
                      {config.title}
                    </span>
                    <p className="text-[11px] text-slate-400 font-mono mt-1">{config.subtitle}</p>
                  </div>

                  {winners.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 italic font-mono">
                      No Kaizens recorded for {config.title} in {selectedMonth}.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {winners.map((w: any, idx: number) => {
                        const k = w.kaizen;
                        const totalScore = w.score;
                        const isFirst = idx === 0;
                        const rankLabel = config.winnerCount > 1
                          ? (isFirst ? '🥇 Winner #1 (Gold)' : '🥈 Winner #2 (Silver)')
                          : '🏆 Winner (#1)';

                        return (
                          <div
                            key={k.id}
                            className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2 relative"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black font-mono uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                {rankLabel}
                              </span>
                              <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                                {totalScore} pts
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug font-sans">
                              [{k.srNo}] {k.title}
                            </h4>

                            <div className="text-[11px] space-y-1 font-mono text-slate-300 pt-2 border-t border-slate-800/80">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Winner Initiator:</span>
                                <span className="font-bold text-amber-300">{k.ideaBy}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Audited Savings:</span>
                                <span className="font-bold text-emerald-400">{k.costSave ? formatIndianRupees(k.costSave) : 'N/A'}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowCertificateModal({
                                categoryTitle: config.title,
                                rankLabel,
                                kaizenTitle: k.title,
                                winnerName: k.ideaBy,
                                minifactory: `${(k as any).minifactory || k.minifactory || ''} (${k.location || ''})`,
                                costSaveText: k.costSave ? `${formatIndianRupees(k.costSave)} / year` : 'Verified Process Improvement',
                                srNo: k.srNo,
                                totalScore,
                                month: selectedMonth,
                                year: selectedYear
                              })}
                              className="mt-2 w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black font-mono text-[10px] uppercase rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>Print Winner Certificate</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* PRINTABLE WINNER CERTIFICATE MODAL */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0 print:hidden">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCertificateModal(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-mono font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer border border-slate-700 shrink-0"
                >
                  <ArrowLeft className="w-4 h-4 text-amber-400" />
                  <span>← Back to Awards</span>
                </button>
                <div className="flex items-center space-x-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span className="font-mono text-xs font-bold text-slate-300 hidden sm:inline">PRINTABLE CERTIFICATE OF EXCELLENCE</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Certificate</span>
                </button>
                <button
                  onClick={() => setShowCertificateModal(null)}
                  className="text-slate-400 hover:text-white transition p-1.5 bg-slate-800 rounded-lg"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Certificate Body */}
            <div className="p-8 bg-amber-50/30 print:p-0">
              <div className="bg-white border-8 border-amber-600/30 p-10 rounded-2xl shadow-xl text-center space-y-6 relative overflow-hidden print:border-4 print:shadow-none print:rounded-none">
                
                <div className="flex justify-between items-center border-b border-slate-200 pb-4 font-mono text-xs">
                  <span className="font-bold text-slate-600 uppercase">SHOPFLOOR MS • KAIZEN CELL</span>
                  <span className="font-bold text-amber-600 uppercase">{showCertificateModal.rankLabel}</span>
                </div>

                <div className="space-y-2 py-4">
                  <Trophy className="w-16 h-16 text-amber-500 mx-auto" />
                  <h1 className="text-3xl font-black font-display tracking-wide uppercase text-slate-900">
                    CERTIFICATE OF EXCELLENCE
                  </h1>
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                    In Continuous Improvement & Process Kaizen
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-serif italic">This official award is proudly presented to</p>
                  <h2 className="text-2xl font-black text-amber-600 font-mono tracking-tight underline underline-offset-8">
                    {showCertificateModal.winnerName}
                  </h2>
                  <p className="text-xs text-slate-600 font-mono pt-2">
                    For outstanding Kaizen achievement in <strong className="text-slate-900">{showCertificateModal.categoryTitle}</strong> ({showCertificateModal.minifactory}) during <strong className="text-slate-900">{showCertificateModal.month} {showCertificateModal.year}</strong>.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left font-mono text-xs space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Winning Improvement Title:</span>
                  <p className="font-bold text-slate-900">[{showCertificateModal.srNo}] {showCertificateModal.kaizenTitle}</p>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-[11px]">
                    <span>Audited Savings: <strong className="text-emerald-700">{showCertificateModal.costSaveText}</strong></span>
                    <span>CFT Cumulative Score: <strong className="text-amber-600">{showCertificateModal.totalScore} Points</strong></span>
                  </div>
                </div>

                <div className="pt-8 grid grid-cols-2 gap-8 text-center font-mono text-xs border-t border-slate-200">
                  <div>
                    <div className="h-10 border-b border-slate-400 flex items-end justify-center pb-1">
                      <span className="font-serif italic text-slate-700">Amit Mehta</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase mt-1 block">CFT Committee Lead</span>
                  </div>

                  <div>
                    <div className="h-10 border-b border-slate-400 flex items-end justify-center pb-1">
                      <span className="font-serif italic text-slate-700">Rajesh Patil</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase mt-1 block">Plant Operations Head</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Modal Action Bar */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-t border-slate-800 shrink-0 print:hidden">
              <button
                type="button"
                onClick={() => setShowCertificateModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-mono font-bold text-xs rounded-xl transition flex items-center space-x-2 cursor-pointer border border-slate-700"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" />
                <span>← Back to Monthly Awards</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center space-x-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-xl text-xs font-black transition cursor-pointer font-mono"
              >
                <Printer className="w-4 h-4" />
                <span>PRINT CERTIFICATE</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* INSPECT KAIZEN OVERLAY MODAL */}
      {inspectKaizen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8 max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <span className="font-mono text-xs font-bold text-slate-300">INSPECT KAIZEN SHEET • ID: {inspectKaizen.srNo}</span>
              <button onClick={() => setInspectKaizen(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 font-sans text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h3 className="text-base font-black text-slate-900">[{inspectKaizen.srNo}] {inspectKaizen.title}</h3>
                <p className="font-mono text-slate-600">
                  Initiator: <strong className="text-slate-900">{inspectKaizen.ideaBy}</strong> | Location: <strong>{(inspectKaizen as any).miniFactory || inspectKaizen.minifactory} ({inspectKaizen.location})</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50/50 p-4 rounded-2xl border border-red-200 space-y-1">
                  <span className="font-mono text-red-800 font-bold uppercase text-[10px]">Problem Before:</span>
                  <p className="text-slate-800 leading-relaxed font-medium">{inspectKaizen.problemBefore}</p>
                </div>

                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 space-y-1">
                  <span className="font-mono text-emerald-800 font-bold uppercase text-[10px]">Countermeasure After:</span>
                  <p className="text-slate-800 leading-relaxed font-medium">{inspectKaizen.counterMeasureAfter}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-mono text-slate-400 block mb-1 self-start">Photo Before</span>
                  {(inspectKaizen.photoBeforeUrl || inspectKaizen.photoBefore) ? (
                    <img src={inspectKaizen.photoBeforeUrl || inspectKaizen.photoBefore} alt="Before" className="w-full h-36 object-contain rounded" />
                  ) : (
                    <div className="h-36 flex items-center justify-center text-xs text-slate-400 font-mono">No before photo</div>
                  )}
                </div>
                <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-mono text-slate-400 block mb-1 self-start">Photo After</span>
                  {(inspectKaizen.photoAfterUrl || inspectKaizen.photoAfter) ? (
                    <img src={inspectKaizen.photoAfterUrl || inspectKaizen.photoAfter} alt="After" className="w-full h-36 object-contain rounded" />
                  ) : (
                    <div className="h-36 flex items-center justify-center text-xs text-slate-400 font-mono">No after photo</div>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Audited Annual Cost Savings:</span>
                  <span className="text-lg font-black text-emerald-400">{inspectKaizen.costSave ? formatIndianRupees(inspectKaizen.costSave) : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Status:</span>
                  <span className="text-sm font-black text-amber-400 uppercase">{inspectKaizen.status}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setInspectKaizen(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Close Sheet
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
