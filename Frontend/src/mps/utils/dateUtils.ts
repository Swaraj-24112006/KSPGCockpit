import { WeekDefinition } from '../types';
import { todayISO, currentMonthISO } from './dateContext';

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export function getCurrentISODate(): string {
  return todayISO();
}

/**
 * Returns the current month formatted as YYYY-MM in local time.
 */
export function getCurrentMonth(): string {
  return currentMonthISO();
}

/**
 * Check if an ISO date string falls within a week's start and end date range.
 */
export function isDateWithinWeek(dateStr: string, week: WeekDefinition): boolean {
  if (!dateStr || !week.startDate || !week.endDate) return false;
  return dateStr >= week.startDate && dateStr <= week.endDate;
}

/**
 * Dynamically resolves the current active week definition from a list of weeks.
 * 1. Matches the week encompassing targetDate (or today).
 * 2. If targetMonth is given and differs from today, finds the closest week in that month.
 * 3. Falls back gracefully to the first week of the month, or first week overall.
 */
export function findCurrentWeek(
  weeks: WeekDefinition[],
  targetDate?: string,
  targetMonth?: string
): WeekDefinition | undefined {
  if (!weeks || weeks.length === 0) return undefined;

  const today = targetDate || getCurrentISODate();
  const month = targetMonth || today.slice(0, 7);

  const monthWeeks = weeks
    .filter((w) => w.month === month)
    .sort((a, b) => a.weekNo - b.weekNo);

  // 1. Direct hit: a week in the target month containing today's date
  const containingWeek = monthWeeks.find((w) => isDateWithinWeek(today, w));
  if (containingWeek) return containingWeek;

  // 2. If looking at today's month, pick the next upcoming week or the last week
  if (today.startsWith(month)) {
    const nextUpcoming = monthWeeks.find((w) => w.startDate && w.startDate >= today);
    if (nextUpcoming) return nextUpcoming;
    if (monthWeeks.length > 0) return monthWeeks[monthWeeks.length - 1];
  }

  // 3. If in another month, default to the first week of that month
  if (monthWeeks.length > 0) {
    return monthWeeks[0];
  }

  // 4. Overall fallback: week containing today across all weeks, or the first week
  const anyWeekContainingToday = weeks.find((w) => isDateWithinWeek(today, w));
  return anyWeekContainingToday || weeks[0];
}

/**
 * Helper to get the ID of the current active week.
 */
export function findCurrentWeekId(
  weeks: WeekDefinition[],
  targetDate?: string,
  targetMonth?: string
): string {
  const currentWeek = findCurrentWeek(weeks, targetDate, targetMonth);
  return currentWeek ? currentWeek.id : '';
}

/**
 * Returns a unique, sorted list of months from available weeks plus current month and surrounding months.
 */
export function getAvailableMonths(weeks: WeekDefinition[], currentMonth?: string): string[] {
  const cMonth = currentMonth || getCurrentMonth();
  const monthsSet = new Set<string>();

  // Add months from weeks
  weeks.forEach((w) => {
    if (w.month) monthsSet.add(w.month);
  });

  // Always include current month
  monthsSet.add(cMonth);

  // Also include 1 month before and after for smooth navigation
  const [yearStr, monthStr] = cMonth.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  if (!isNaN(y) && !isNaN(m)) {
    const prevDate = new Date(y, m - 2, 1);
    const nextDate = new Date(y, m, 1);
    const format = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(format(prevDate));
    monthsSet.add(format(nextDate));
  }

  return Array.from(monthsSet).sort();
}

