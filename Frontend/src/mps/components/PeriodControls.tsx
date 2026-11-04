import React from 'react';
import { buildMonthOptions } from '../utils/dateContext';

interface MonthSelectProps {
  value: string;
  onChange: (month: string) => void;
  className?: string;
  id?: string;
}

export const MonthSelect: React.FC<MonthSelectProps> = ({
  value,
  onChange,
  className,
  id
}) => {
  const options = buildMonthOptions();
  const years = Array.from(new Set(options.map((o) => o.year))).sort((a, b) => a - b);
  const isValueCovered = options.some((o) => o.value === value);

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={
        className ||
        'bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer text-xs border-0 py-0 pl-1 pr-6'
      }
    >
      {!isValueCovered && value && (
        <option value={value}>{value}</option>
      )}
      {years.map((y) => (
        <optgroup key={y} label={String(y)}>
          {options
            .filter((o) => o.year === y)
            .map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} {o.isCurrent ? '• Current' : ''}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
};

interface TodayButtonProps {
  onClick: () => void;
  className?: string;
}

export const TodayButton: React.FC<TodayButtonProps> = ({
  onClick,
  className
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        className ||
        'px-2 py-0.5 text-xs font-semibold rounded bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-300 shadow-xs transition-colors'
      }
      title="Jump to today"
    >
      Today
    </button>
  );
};
