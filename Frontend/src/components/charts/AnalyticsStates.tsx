import React from 'react';
import { AlertTriangle, RefreshCw, Clock, Inbox } from 'lucide-react';

export function AnalyticsSkeleton({ height = 'h-64', darkMode = false }: { height?: string; darkMode?: boolean }) {
  return (
    <div
      className={`w-full ${height} rounded-2xl animate-pulse flex flex-col justify-center items-center p-6 space-y-3 ${
        darkMode ? 'bg-[#052345]/60 border border-sky-900/40' : 'bg-slate-100/80 border border-slate-200/60'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl ${darkMode ? 'bg-sky-800/40' : 'bg-slate-200'}`} />
      <div className={`w-40 h-3 rounded-full ${darkMode ? 'bg-sky-800/40' : 'bg-slate-200'}`} />
      <div className={`w-24 h-2.5 rounded-full ${darkMode ? 'bg-sky-800/20' : 'bg-slate-200/60'}`} />
    </div>
  );
}

export function AnalyticsError({
  message = 'Failed to load analytics data from server.',
  onRetry,
  darkMode = false,
}: {
  message?: string;
  onRetry?: () => void;
  darkMode?: boolean;
}) {
  return (
    <div
      className={`w-full p-6 rounded-2xl border text-center flex flex-col items-center justify-center space-y-3 ${
        darkMode
          ? 'bg-red-950/30 border-red-800/50 text-red-200'
          : 'bg-red-50 border-red-200 text-red-800'
      }`}
    >
      <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
      <div className="space-y-1">
        <h4 className="text-xs font-bold font-mono uppercase tracking-wider">Analytics Service Warning</h4>
        <p className="text-xs opacity-90 max-w-md">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-1.5 rounded-xl text-xs font-bold font-mono transition flex items-center space-x-1.5 bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Loading</span>
        </button>
      )}
    </div>
  );
}

export function AnalyticsEmpty({
  title = 'No Data Available',
  subtitle = 'No continuous improvement entries found for this scope or filter.',
  darkMode = false,
}: {
  title?: string;
  subtitle?: string;
  darkMode?: boolean;
}) {
  return (
    <div
      className={`w-full py-12 px-6 rounded-2xl border text-center flex flex-col items-center justify-center space-y-2 ${
        darkMode
          ? 'bg-[#041d38]/50 border-sky-900/40 text-sky-200/80'
          : 'bg-slate-50 border-slate-200 text-slate-500'
      }`}
    >
      <Inbox className="w-8 h-8 opacity-40 mb-1" />
      <h4 className="text-xs font-bold font-mono uppercase">{title}</h4>
      <p className="text-[11px] opacity-75 max-w-sm">{subtitle}</p>
    </div>
  );
}

export function LastUpdatedBadge({
  generatedAt,
  darkMode = false,
  isFetching = false,
}: {
  generatedAt?: string;
  darkMode?: boolean;
  isFetching?: boolean;
}) {
  if (!generatedAt) return null;

  const dateObj = new Date(generatedAt);
  const timeStr = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : generatedAt;

  return (
    <span
      className={`inline-flex items-center space-x-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full border transition ${
        darkMode
          ? 'bg-sky-950/80 border-sky-800/60 text-sky-300'
          : 'bg-slate-100 border-slate-200 text-slate-600'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isFetching ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
      <Clock className="w-3 h-3 opacity-60" />
      <span>Updated {timeStr}</span>
    </span>
  );
}
