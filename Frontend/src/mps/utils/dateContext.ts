import { WeekDefinition } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

// Local date, NOT toISOString() (that is UTC and shows yesterday in IST before 05:30)
export const todayISO = (now: Date = new Date()): string => {
  if (import.meta.env.DEV) {
    try {
      const override = localStorage.getItem('mps_debug_today');
      if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) {
        return override;
      }
    } catch {
      // Ignore localStorage access issues in tests/SSR
    }
  }
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const currentMonthISO = (now: Date = new Date()): string => todayISO(now).slice(0, 7);

// Mirrors backend WeekService.generate_standard_4_week_split: 1-7, 8-14, 15-21, 22-EOM
export function buildStandardMonthWeeks(month: string): WeekDefinition[] {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const short = new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short' });
  const ranges: [number, number, number][] = [[1, 7, 1], [8, 14, 1], [15, 21, 1], [22, lastDay, 2]]; // [start, end, holidays]
  const weeks = ranges.map(([s, e, h], i) => {
    const days = e - s + 1;
    return {
      id: `w-${month}-${pad(i + 1)}`, month, weekNo: i + 1,
      weekLabel: `Week ${i + 1} (${pad(s)}-${pad(e)} ${short})`,
      startDate: `${month}-${pad(s)}`, endDate: `${month}-${pad(e)}`,
      daysCount: days, holidayDays: h, workingDays: days - h, monthWeight: 0,
    } as WeekDefinition;
  });
  const total = weeks.reduce((s, w) => s + (w.workingDays || 0), 0);
  return weeks.map((w) => ({ ...w, monthWeight: total ? Math.round(((w.workingDays || 0) / total) * 10000) / 100 : 0 }));
}

export const findWeekForDate = (weeks: WeekDefinition[], date: string) =>
  weeks.find((w) => date >= w.startDate && date <= w.endDate);

// Week containing today if the month is the current month, else Week 1
export function pickDefaultWeek(monthWeeks: WeekDefinition[], month: string, today = todayISO()) {
  const sorted = [...monthWeeks].sort((a, b) => a.weekNo - b.weekNo);
  if (today.slice(0, 7) === month) return findWeekForDate(sorted, today) ?? sorted[0];
  return sorted[0];
}

// 12 months for (current year - 1, current year, current year + 1)
export function buildMonthOptions(anchorYear = new Date().getFullYear()) {
  const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const cur = currentMonthISO();
  const out: { year: number; value: string; label: string; isCurrent: boolean }[] = [];
  [anchorYear - 1, anchorYear, anchorYear + 1].forEach((y) =>
    names.forEach((n, i) => {
      const value = `${y}-${pad(i + 1)}`;
      out.push({ year: y, value, label: `${n} ${y}`, isCurrent: value === cur });
    })
  );
  return out;
}
