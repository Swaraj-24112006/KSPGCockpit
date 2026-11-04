import {
  BOMItem,
  VendorBuyerItem,
  WeekDefinition,
  MonthlyPlanItem,
  MB51TransactionItem,
  StockReportItem,
  FGWeeklyCoverageSummary,
  RMWeeklyRequirementSummary
} from '../types';
import { getEffectiveStockSnapshot } from './mb52LockEngine';

/**
 * Helper to check if a date falls within a week definition range
 */
export function isDateInWeek(dateStr: string, week: WeekDefinition): boolean {
  if (!dateStr || !week.startDate || !week.endDate) return false;
  return dateStr >= week.startDate && dateStr <= week.endDate;
}

/**
 * Helper to match an MB51 transaction to a week definition
 */
export function getWeekForTransaction(
  tx: MB51TransactionItem,
  weeks: WeekDefinition[]
): WeekDefinition | undefined {
  if (tx.weekId) {
    const found = weeks.find((w) => w.id === tx.weekId);
    if (found) return found;
  }
  return weeks.find((w) => isDateInWeek(tx.postingDate, w));
}

/**
 * Calculates the proportion of working days in a week on or after an effective baseline date.
 * Used to prorate consumption when an MB52 stock snapshot is uploaded mid-week,
 * ensuring consumption prior to the snapshot is not double-counted.
 */
export function getRemainingWorkingDaysRatio(
  week: WeekDefinition,
  effectiveDate?: string,
  nonWorkingDays: string[] = ['Sun']
): number {
  if (!effectiveDate || !week.startDate || !week.endDate) return 1.0;
  if (effectiveDate <= week.startDate) return 1.0;
  if (effectiveDate > week.endDate) return 0.0;

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let totalWorking = 0;
  let remainingWorking = 0;

  try {
    const curr = new Date(week.startDate + 'T00:00:00');
    const end = new Date(week.endDate + 'T00:00:00');
    let count = 0;

    while (curr <= end && count < 60) {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      const isoDate = `${yyyy}-${mm}-${dd}`;
      const dayName = weekdays[curr.getDay()];

      if (!nonWorkingDays.includes(dayName)) {
        totalWorking++;
        if (isoDate >= effectiveDate) {
          remainingWorking++;
        }
      }
      curr.setDate(curr.getDate() + 1);
      count++;
    }
  } catch (e) {
    console.error('Failed to compute remaining working days ratio:', e);
    return 1.0;
  }

  if (totalWorking === 0) return 1.0;
  return remainingWorking / totalWorking;
}

/**
 * Computes FG Weekly Plan vs Actual Receipts (MB51 101 prefix 7) vs Dispatches (MB51 601)
 * Resolves FG snapshots week-by-week using getEffectiveStockSnapshot to preserve historical stock
 * and rolls stock forward seamlessly across weeks.
 */
export function computeFGWeeklyCoverage(
  selectedMonth: string,
  monthlyPlans: MonthlyPlanItem[],
  weeks: WeekDefinition[],
  mb51List: MB51TransactionItem[],
  stockList: StockReportItem[],
  openingStockDate?: string
): FGWeeklyCoverageSummary[] {
  const monthWeeks = weeks
    .filter((w) => w.month === selectedMonth)
    .sort((a, b) => a.weekNo - b.weekNo);

  const monthPlans = monthlyPlans.filter((p) => p.month === selectedMonth);

  // Derive effective opening date if not explicitly passed
  const effectiveOpeningDate =
    openingStockDate || stockList.find((s) => s.stockDate)?.stockDate;

  return monthPlans.map((plan) => {
    let rollingStock = 0;
    let hasRollingBaseline = false;
    let lastAppliedSnapshotDate = '';
    let startingStock = 0;
    let totalActualProd = 0;
    let totalActualDisp = 0;
    let totalPlanTarget = 0;

    const weekSummaries = monthWeeks.map((week) => {
      const planTarget = plan.weeklyBreakdown[week.id] || 0;
      totalPlanTarget += planTarget;

      // Filter MB51 transactions for this FG and this week
      const fgReceipts = mb51List.filter((tx) => {
        const isMvt101 = tx.movementType === '101';
        const isThisFG = tx.partNumber === plan.fgCode;
        const matchesWeek =
          tx.weekId === week.id || isDateInWeek(tx.postingDate, week);
        return isMvt101 && isThisFG && matchesWeek;
      });

      const actualProd = fgReceipts.reduce((sum, tx) => sum + tx.quantity, 0);
      totalActualProd += actualProd;

      const fgDispatches = mb51List.filter((tx) => {
        const isMvt601 = tx.movementType === '601';
        const isThisFG = tx.partNumber === plan.fgCode;
        const matchesWeek =
          tx.weekId === week.id || isDateInWeek(tx.postingDate, week);
        return isMvt601 && isThisFG && matchesWeek;
      });

      const actualDisp = fgDispatches.reduce((sum, tx) => sum + tx.quantity, 0);
      totalActualDisp += actualDisp;

      const variance = actualProd - planTarget;

      // Resolve FG snapshot for this specific week using getEffectiveStockSnapshot
      const stockSnapshot = getEffectiveStockSnapshot(
        plan.fgCode,
        stockList,
        week,
        effectiveOpeningDate
      );
      const snapshotStock = stockSnapshot.unrestrictedStock;
      const itemBaselineDate = stockSnapshot.effectiveDate;

      const isNewSnapshotInThisWeek =
        itemBaselineDate &&
        itemBaselineDate !== lastAppliedSnapshotDate &&
        week.startDate &&
        week.endDate &&
        itemBaselineDate >= week.startDate &&
        itemBaselineDate <= week.endDate;

      const isFutureSnapshot =
        itemBaselineDate &&
        week.endDate &&
        itemBaselineDate > week.endDate;

      const priorClosingStock = rollingStock;

      if (!hasRollingBaseline) {
        if (!isFutureSnapshot && snapshotStock !== undefined) {
          rollingStock = snapshotStock;
          hasRollingBaseline = true;
          lastAppliedSnapshotDate = itemBaselineDate || '';
          startingStock = snapshotStock;
        }
      } else if (isNewSnapshotInThisWeek) {
        rollingStock = snapshotStock;
        lastAppliedSnapshotDate = itemBaselineDate || '';
      }

      const weekOpeningStock = hasRollingBaseline
        ? (isNewSnapshotInThisWeek && week.startDate && itemBaselineDate <= week.startDate
            ? snapshotStock
            : (hasRollingBaseline && priorClosingStock !== 0 ? priorClosingStock : snapshotStock))
        : 0;

      if (!hasRollingBaseline) {
        // Historical week strictly prior to opening stock snapshot
      } else if (isNewSnapshotInThisWeek) {
        // Mid-week snapshot: only receipts and dispatches on or after the snapshot date affect closing stock
        const receiptsFromDate = fgReceipts
          .filter((tx) => !itemBaselineDate || tx.postingDate >= itemBaselineDate)
          .reduce((sum, tx) => sum + tx.quantity, 0);

        const dispatchesFromDate = fgDispatches
          .filter((tx) => !itemBaselineDate || tx.postingDate >= itemBaselineDate)
          .reduce((sum, tx) => sum + tx.quantity, 0);

        rollingStock = snapshotStock + receiptsFromDate - dispatchesFromDate;
      } else {
        // Normal rolling week: carry forward previous closing and apply full week transactions
        rollingStock = rollingStock + actualProd - actualDisp;
      }

      return {
        weekId: week.id,
        weekNo: week.weekNo,
        weekLabel: week.weekLabel,
        daysCount: week.daysCount,
        planTarget,
        actualProductionReceipt: actualProd,
        variance,
        actualDispatch: actualDisp,
        openingStock: Math.round(weekOpeningStock),
        closingStock: Math.round(rollingStock)
      };
    });

    const achievementRate =
      totalPlanTarget > 0 ? (totalActualProd / totalPlanTarget) * 100 : 0;

    return {
      fgCode: plan.fgCode,
      fgDescription: plan.fgDescription,
      customerName: plan.customerName,
      startingStock,
      monthlyPlanTarget: plan.monthlyTarget,
      weeks: weekSummaries,
      totalActualProduction: totalActualProd,
      totalActualDispatch: totalActualDisp,
      overallAchievementRate: Math.round(achievementRate * 10) / 10
    };
  });
}

/**
 * Computes Consolidated RM/PM Requirements, MB51 Inwards (101 prefix non-7), Stock Balances & Buyer Assignments.
 * Dynamically prorates gross requirements when a snapshot arrives mid-week to prevent double-counting,
 * and maintains continuous week-over-week stock carry forward.
 */
export function computeRMWeeklyRequirements(
  selectedMonth: string,
  monthlyPlans: MonthlyPlanItem[],
  weeks: WeekDefinition[],
  boms: BOMItem[],
  vendorBuyers: VendorBuyerItem[],
  mb51List: MB51TransactionItem[],
  stockList: StockReportItem[],
  openingStockDate?: string
): RMWeeklyRequirementSummary[] {
  const monthWeeks = weeks
    .filter((w) => w.month === selectedMonth)
    .sort((a, b) => a.weekNo - b.weekNo);

  const monthPlans = monthlyPlans.filter((p) => p.month === selectedMonth);

  // Derive effective opening date if not explicitly passed
  const effectiveOpeningDate =
    openingStockDate || stockList.find((s) => s.stockDate)?.stockDate;

  // 1. Group BOM items by componentCode
  const componentMap = new Map<
    string,
    {
      componentCode: string;
      componentDescription: string;
      category: 'RM' | 'PM';
      uom: string;
      usedInFGs: { fgCode: string; fgDescription: string; usagePerFG: number }[];
    }
  >();

  boms.forEach((bom) => {
    const existing = componentMap.get(bom.componentCode);
    if (existing) {
      if (!existing.usedInFGs.some((f) => f.fgCode === bom.fgCode)) {
        existing.usedInFGs.push({
          fgCode: bom.fgCode,
          fgDescription: bom.fgDescription,
          usagePerFG: bom.qty
        });
      }
    } else {
      componentMap.set(bom.componentCode, {
        componentCode: bom.componentCode,
        componentDescription: bom.componentDescription,
        category: bom.category || (bom.componentCode.startsWith('8') ? 'PM' : 'RM'),
        uom: bom.uom,
        usedInFGs: [
          {
            fgCode: bom.fgCode,
            fgDescription: bom.fgDescription,
            usagePerFG: bom.qty
          }
        ]
      });
    }
  });

  const summaries: RMWeeklyRequirementSummary[] = [];

  componentMap.forEach((comp) => {
    // Lookup vendor and buyer from master
    const vbMapping = vendorBuyers.find((vb) =>
      vb.suppliedComponents.includes(comp.componentCode)
    );
    const buyerName = vbMapping
      ? vbMapping.buyerName
      : 'Unassigned Buyer';
    const vendorName = vbMapping ? vbMapping.vendorName : 'Direct / Spot Vendor';
    const vendorCode = vbMapping ? vbMapping.vendorCode : 'V-NONE';
    const leadTimeDays = vbMapping ? vbMapping.leadTimeDays : 7;

    let rollingStock = 0;
    let hasRollingBaseline = false;
    let lastAppliedSnapshotDate = '';
    let startingStockForSummary = 0;

    const weekSummaries = monthWeeks.map((week) => {
      // Lookup Stock Report (Snapshot for this component at this week)
      const stockSnapshot = getEffectiveStockSnapshot(
        comp.componentCode,
        stockList,
        week,
        effectiveOpeningDate
      );
      const snapshotStock = stockSnapshot.totalPhysicalStock;
      const safetyStock = stockSnapshot.safetyStock;
      const itemBaselineDate = stockSnapshot.effectiveDate;

      const isNewSnapshotInThisWeek =
        itemBaselineDate &&
        itemBaselineDate !== lastAppliedSnapshotDate &&
        week.startDate &&
        week.endDate &&
        itemBaselineDate >= week.startDate &&
        itemBaselineDate <= week.endDate;

      const isFutureSnapshot =
        itemBaselineDate &&
        week.endDate &&
        itemBaselineDate > week.endDate;

      const priorClosingStock = rollingStock;

      if (!hasRollingBaseline) {
        if (!isFutureSnapshot && snapshotStock !== undefined) {
          rollingStock = snapshotStock;
          hasRollingBaseline = true;
          lastAppliedSnapshotDate = itemBaselineDate || '';
          startingStockForSummary = snapshotStock;
        }
      } else if (isNewSnapshotInThisWeek) {
        rollingStock = snapshotStock;
        lastAppliedSnapshotDate = itemBaselineDate || '';
      }

      const weekOpeningStock = hasRollingBaseline
        ? (isNewSnapshotInThisWeek && week.startDate && itemBaselineDate <= week.startDate
            ? snapshotStock
            : (hasRollingBaseline && priorClosingStock !== 0 ? priorClosingStock : snapshotStock))
        : 0;

      // Calculate Gross Requirement across all active FG plans in this month
      let grossReqForWeek = 0;
      comp.usedInFGs.forEach((fgUsage) => {
        const fgPlan = monthPlans.find((p) => p.fgCode === fgUsage.fgCode);
        if (fgPlan) {
          const fgWeekQty = fgPlan.weeklyBreakdown[week.id] || 0;
          grossReqForWeek += fgWeekQty * fgUsage.usagePerFG;
        }
      });

      grossReqForWeek = Math.round(grossReqForWeek * 100) / 100;

      // Filter MB51 Receipts (Mvt 101 prefix non-7) for this component
      const rmReceipts = mb51List.filter((tx) => {
        const isMvt101 = tx.movementType === '101';
        const isThisComp = tx.partNumber === comp.componentCode;
        const matchesWeek =
          tx.weekId === week.id || isDateInWeek(tx.postingDate, week);
        return isMvt101 && isThisComp && matchesWeek;
      });

      const inwardQty = rmReceipts.reduce((sum, tx) => sum + tx.quantity, 0);

      if (!hasRollingBaseline) {
        // Week strictly prior to first snapshot baseline
      } else if (isNewSnapshotInThisWeek) {
        // Mid-week snapshot upload:
        // 1. Only receipts on or after snapshot date count
        const inwardsFromDate = rmReceipts
          .filter((tx) => !itemBaselineDate || tx.postingDate >= itemBaselineDate)
          .reduce((sum, tx) => sum + tx.quantity, 0);

        // 2. Prorate consumption from snapshot date onward to avoid double-counting prior days
        const ratio = getRemainingWorkingDaysRatio(week, itemBaselineDate);
        const effectiveGrossReq = Math.round(grossReqForWeek * ratio * 100) / 100;

        rollingStock = snapshotStock + inwardsFromDate - effectiveGrossReq;
      } else {
        // Normal rolling carry-forward week
        rollingStock = rollingStock + inwardQty - grossReqForWeek;
      }

      let status: 'OK' | 'WARNING' | 'SHORTAGE' = 'OK';
      let deficit = 0;

      if (rollingStock < 0) {
        status = 'SHORTAGE';
        deficit = Math.abs(rollingStock);
      } else if (rollingStock < safetyStock) {
        status = 'WARNING';
        deficit = safetyStock - rollingStock;
      }

      return {
        weekId: week.id,
        weekNo: week.weekNo,
        weekLabel: week.weekLabel,
        grossRequirement: grossReqForWeek,
        actualInwardReceipt: inwardQty,
        projectedStock: Math.round(rollingStock),
        deficit: Math.round(deficit),
        status,
        currentStock: Math.round(weekOpeningStock),
        openingStock: Math.round(weekOpeningStock),
        safetyStock
      };
    });

    const totalGrossReq = weekSummaries.reduce((sum, s) => sum + s.grossRequirement, 0);
    const totalInward = weekSummaries.reduce((sum, s) => sum + s.actualInwardReceipt, 0);
    const maxShortage = Math.max(...weekSummaries.map((s) => s.deficit));
    const overallStatus = weekSummaries.some((s) => s.status === 'SHORTAGE')
      ? 'SHORTAGE'
      : weekSummaries.some((s) => s.status === 'WARNING')
      ? 'WARNING'
      : 'OK';

    summaries.push({
      componentCode: comp.componentCode,
      componentDescription: comp.componentDescription,
      category: comp.category,
      uom: comp.uom,
      buyerName,
      vendorName,
      vendorCode,
      leadTimeDays,
      currentStock: startingStockForSummary || weekSummaries[0]?.currentStock || 0,
      safetyStock: weekSummaries[0]?.safetyStock ?? 0,
      usedInFGs: comp.usedInFGs,
      weeks: weekSummaries,
      totalGrossRequirement: Math.round(totalGrossReq),
      totalInwardReceived: Math.round(totalInward),
      overallStatus,
      maxShortageQty: Math.round(maxShortage)
    });
  });

  // Sort by status: SHORTAGE first, then WARNING, then OK
  return summaries.sort((a, b) => {
    const score = (s: string) =>
      s === 'SHORTAGE' ? 3 : s === 'WARNING' ? 2 : 1;
    return score(b.overallStatus) - score(a.overallStatus);
  });
}

// Export aliases matching naming conventions
export const calculateWeeklyFGPlan = computeFGWeeklyCoverage;
export const calculateWeeklyRMPlan = computeRMWeeklyRequirements;
