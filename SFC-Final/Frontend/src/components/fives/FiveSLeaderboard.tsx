import React from 'react';
import { Trophy, Award, Crown, Flame, Sparkles, TrendingUp, CheckCircle, Star, ArrowUpRight } from 'lucide-react';
import { FiveSAudit } from '../../types';

interface FiveSLeaderboardProps {
  audits: FiveSAudit[];
  onSelectAudit?: (audit: FiveSAudit) => void;
}

export default function FiveSLeaderboard({ audits, onSelectAudit }: FiveSLeaderboardProps) {
  // Sort audits by totalScore descending
  const sortedAudits = [...audits].sort((a, b) => b.totalScore - a.totalScore);
  const championAudit = sortedAudits[0] || null;

  const MATURITY_LEVELS = [
    { level: 'Level 1: Novice', desc: 'Basic clutter removal; items randomly placed.', scoreRange: '< 50%' },
    { level: 'Level 2: Organized', desc: 'Floor lines and rough tool shadow boards installed.', scoreRange: '50% - 64%' },
    { level: 'Level 3: Clean & Proactive', desc: 'Daily 5-min clean-as-inspection routine active; SOC controlled.', scoreRange: '65% - 79%' },
    { level: 'Level 4: Standardized', desc: 'Match-marking on bolts; visual operating bands on all gauges.', scoreRange: '80% - 89%' },
    { level: 'Level 5: Benchmark (Kaizen)', desc: 'Autonomous habit; continuous 5S Kaizens logged weekly.', scoreRange: '>= 90%' }
  ];

  return (
    <div className="space-y-6">
      {/* Golden Broom Rolling Trophy Showcase */}
      {championAudit && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 p-8 text-slate-950 shadow-2xl border-4 border-amber-300">
          <div className="absolute top-0 right-0 p-8 opacity-15 pointer-events-none">
            <Trophy className="w-56 h-56" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center space-x-2">
                <span className="bg-slate-950 text-amber-300 px-3 py-1 rounded-full text-xs font-black uppercase font-mono tracking-wider flex items-center gap-1.5 shadow">
                  <Crown className="w-4 h-4 fill-amber-300" />
                  🏆 "GOLDEN BROOM" ROLLING TROPHY WINNER
                </span>
                <span className="text-xs font-bold text-amber-950 font-mono">
                  CURRENT MONTH CHAMPION
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-950">
                {championAudit.area}
              </h2>

              <p className="text-xs font-medium text-amber-950 leading-relaxed">
                Awarded for exceptional visual cleanliness, 100% gangway clearance, pristine two-color foam tool shadow boards, and zero aged items in 1S Holding.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-mono font-bold">
                <span className="bg-white/80 px-3 py-1.5 rounded-xl shadow-sm">
                  👤 Lead: {championAudit.auditor}
                </span>
                <span className="bg-white/80 px-3 py-1.5 rounded-xl shadow-sm">
                  📅 Audited: {championAudit.auditDate}
                </span>
                <span className="bg-slate-950 text-amber-300 px-3 py-1.5 rounded-xl shadow-sm">
                  🔥 4-Month Winning Streak
                </span>
              </div>
            </div>

            <div className="bg-slate-950 text-white p-6 rounded-2xl border border-amber-400/50 shadow-2xl text-center shrink-0 min-w-[200px]">
              <span className="text-[10px] font-mono text-amber-400 uppercase font-black tracking-widest block">
                CHAMPIONSHIP SCORE
              </span>
              <span className="text-5xl font-black font-mono text-amber-300 block my-1">
                {championAudit.totalScore}%
              </span>
              <span className="inline-block bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-black px-2.5 py-0.5 rounded-full uppercase">
                Grade {championAudit.grade || 'A+'} · World Class
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table & Maturity Ladder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Zone Rankings (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Shopfloor 5S Zone Leaderboard Rankings
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated against the standardized 25-point lean audit criteria.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              {sortedAudits.length} Zones Audited
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {sortedAudits.map((audit, index) => {
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;

              return (
                <div
                  key={audit.id}
                  className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-4">
                    {/* Rank Badge */}
                    <div className={`w-8 h-8 rounded-xl font-mono text-xs font-black flex items-center justify-center shrink-0 ${
                      isFirst ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 shadow-md' :
                      isSecond ? 'bg-slate-200 text-slate-800' :
                      isThird ? 'bg-amber-700/20 text-amber-800' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      #{index + 1}
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-slate-800">
                        {audit.area}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Auditor: {audit.auditor} · {audit.auditDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Score Bar */}
                    <div className="hidden sm:block w-32">
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            audit.totalScore >= 85 ? 'bg-emerald-500' :
                            audit.totalScore >= 65 ? 'bg-blue-500' :
                            'bg-amber-500'
                          }`}
                          style={{ width: `${audit.totalScore}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black font-mono text-slate-800 block">
                        {audit.totalScore}%
                      </span>
                      <span className={`text-[9px] font-mono font-bold uppercase ${
                        audit.status === 'Excellent' ? 'text-emerald-600' :
                        audit.status === 'Good' ? 'text-blue-600' :
                        'text-rose-600'
                      }`}>
                        {audit.status}
                      </span>
                    </div>

                    {onSelectAudit && (
                      <button
                        onClick={() => onSelectAudit(audit)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs"
                        title="View Full Audit"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: 5S Lean Maturity Stages */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-sm">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight font-mono flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              5S Lean Maturation Ladder
            </h3>
            <p className="text-[11px] text-slate-500">
              Milestones from basic housekeeping to autonomous world-class discipline.
            </p>
          </div>

          <div className="space-y-2.5">
            {MATURITY_LEVELS.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl border text-xs space-y-1 ${
                  idx === 4
                    ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                    : idx >= 2
                    ? 'bg-blue-50/40 border-blue-100 text-slate-800'
                    : 'bg-slate-50 border-slate-100 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="font-black text-xs">{m.level}</span>
                  <span className="font-bold text-[10px] text-slate-400">{m.scoreRange}</span>
                </div>
                <p className="text-[11px] leading-tight text-slate-600">
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
