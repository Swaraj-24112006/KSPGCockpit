/**
 * MpsModule.tsx — Top-Level Entry Wrapper for MPS (Supply Chain / MRP)
 * =====================================================================
 * Follows the MODULE_INTEGRATION_SPEC.md contract.
 * Wraps the entire MPS App.tsx content with a Cockpit-compatible shell
 * that includes "← Back to Cockpit" navigation and user identity display.
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, LogOut, Boxes } from 'lucide-react';
import { AuthUser } from '../shared/utils/auth';

// MPS internal types & data
import {
  BOMItem,
  VendorBuyerItem,
  WeekDefinition,
  MonthlyPlanItem,
  MB51TransactionItem,
  StockReportItem,
  VendorDeliverySchedule,
  MondayReviewActionItem,
  FGPlanFreezeItem,
  VendorDeliveryScheduleChangeLog,
  UserRole
} from './types';
import {
  INITIAL_BOM_MASTER,
  INITIAL_VENDOR_BUYER_MASTER,
  INITIAL_WEEK_DEFINITIONS,
  INITIAL_MONTHLY_PLANS,
  INITIAL_MB51_TRANSACTIONS,
  INITIAL_STOCK_REPORT,
  INITIAL_VENDOR_DELIVERY_SCHEDULES,
  INITIAL_MONDAY_REVIEW_ACTIONS,
  INITIAL_PLAN_FREEZE_ITEMS,
  INITIAL_DELIVERY_CHANGE_LOGS
} from './data/sapInitialData';

// Layout Components
import { Header } from './components/Header';
import { Sidebar, SubViewTab } from './components/Sidebar';

// Master Data Components
import { BOMMasterManager } from './components/MasterData/BOMMasterManager';
import { FGHeaderManager } from './components/MasterData/FGHeaderManager';
import { ComponentManager } from './components/MasterData/ComponentManager';
import { CommonComponentsDashboard } from './components/MasterData/CommonComponentsDashboard';
import { VendorBuyerManager } from './components/MasterData/VendorBuyerManager';
import bomService from './services/bomService';
import vendorBuyerService from './services/vendorBuyerService';
import { weekService, dtoToFrontend } from './services/weekService';
import { monthlyPlanService } from './services/monthlyPlanService';
import { mb51Service } from './services/mb51Service';
import { stockService } from './services/stockService';

// Monthly Upload Components
import { WeekDefinitionManager } from './components/MonthlyUpload/WeekDefinitionManager';
import { MonthlyPlanManager } from './components/MonthlyUpload/MonthlyPlanManager';

// Monday Upload Components
import { MB51ReportManager } from './components/MondayUpload/MB51ReportManager';
import { StockReportManager } from './components/MondayUpload/StockReportManager';

// Weekly MRP & Supply Views
import { MondayReviewCockpit } from './components/WeeklyMRP/MondayReviewCockpit';
import { ManagementProductionLossReport } from './components/Analytics/ManagementProductionLossReport';
import { PerformanceDashboard } from './components/Analytics/PerformanceDashboard';
import { VendorScheduleManager } from './components/WeeklyMRP/VendorScheduleManager';
import { WeeklyFGSupplyView } from './components/WeeklyMRP/WeeklyFGSupplyView';
import { WeeklyRMSupplyView } from './components/WeeklyMRP/WeeklyRMSupplyView';
import { AuditLogView } from './components/WeeklyMRP/AuditLogView';
import { computeRMWeeklyRequirements } from './utils/weeklyMrpEngine';

// ─── Props contract from MODULE_INTEGRATION_SPEC.md ───────────────
export interface MpsModuleProps {
  currentUser: AuthUser | null;
  onBackToLanding: () => void;
  onLogout: () => void;
  onNavigateToSuperadmin?: () => void;
}

export default function MpsModule({
  currentUser,
  onBackToLanding,
  onLogout,
  onNavigateToSuperadmin,
}: MpsModuleProps) {
  // Navigation State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sap_sidebar_collapsed');
    return saved !== null ? saved === 'true' : true;
  });
  const [activeSubView, setActiveSubView] = useState<SubViewTab>(() => {
    const saved = localStorage.getItem('sap_active_subview');
    if (saved === 'master_exploded_bom') return 'master_bom';
    return (saved as SubViewTab) || 'monday_review_cockpit';
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    // If user has an assigned MPS module role from backend, prioritize it
    const rolesList = currentUser?.module_roles || (currentUser as any)?.moduleRoles || [];
    const assignedMps = Array.isArray(rolesList) ? rolesList.find((r: any) => r.module_code === 'mps' || r.moduleCode === 'mps') : null;
    const mpsRoleName = assignedMps ? (assignedMps.role_name || assignedMps.roleName) : null;
    if (mpsRoleName && ['demand_planner', 'supply_planner', 'production', 'management'].includes(mpsRoleName)) {
      return mpsRoleName as UserRole;
    }
    const saved = localStorage.getItem('sap_current_role');
    return (saved as UserRole) || 'demand_planner';
  });

  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');

  // One-time clear of old dummy data
  if (typeof window !== 'undefined' && !localStorage.getItem('sap_cleared_dummy_data_v1')) {
    localStorage.removeItem('sap_boms');
    localStorage.removeItem('sap_vendor_buyers');
    localStorage.removeItem('sap_weeks');
    localStorage.removeItem('sap_monthly_plans');
    localStorage.removeItem('sap_mb51');
    localStorage.removeItem('sap_stock');
    localStorage.removeItem('sap_vendor_delivery_schedules');
    localStorage.removeItem('sap_monday_review_actions');
    localStorage.removeItem('sap_plan_freeze');
    localStorage.removeItem('sap_delivery_change_logs');
    localStorage.setItem('sap_cleared_dummy_data_v1', 'true');
  }

  // Core Data State
  const [boms, setBoms] = useState<BOMItem[]>(() => {
    const saved = localStorage.getItem('sap_boms');
    return saved ? JSON.parse(saved) : INITIAL_BOM_MASTER;
  });

  const [vendorBuyers, setVendorBuyers] = useState<VendorBuyerItem[]>(() => {
    const saved = localStorage.getItem('sap_vendor_buyers');
    return saved ? JSON.parse(saved) : INITIAL_VENDOR_BUYER_MASTER;
  });

  const [weeks, setWeeks] = useState<WeekDefinition[]>(() => {
    const saved = localStorage.getItem('sap_weeks');
    return saved ? JSON.parse(saved) : INITIAL_WEEK_DEFINITIONS;
  });

  const [monthlyPlans, setMonthlyPlans] = useState<MonthlyPlanItem[]>(() => {
    const saved = localStorage.getItem('sap_monthly_plans');
    return saved ? JSON.parse(saved) : INITIAL_MONTHLY_PLANS;
  });

  const [mb51List, setMb51List] = useState<MB51TransactionItem[]>(() => {
    const saved = localStorage.getItem('sap_mb51');
    return saved ? JSON.parse(saved) : INITIAL_MB51_TRANSACTIONS;
  });

  const [stockList, setStockList] = useState<StockReportItem[]>(() => {
    const saved = localStorage.getItem('sap_stock');
    return saved ? JSON.parse(saved) : INITIAL_STOCK_REPORT;
  });

  const [vendorDeliverySchedules, setVendorDeliverySchedules] = useState<VendorDeliverySchedule[]>(() => {
    const saved = localStorage.getItem('sap_vendor_delivery_schedules');
    return saved ? JSON.parse(saved) : INITIAL_VENDOR_DELIVERY_SCHEDULES;
  });

  const [mondayReviewActions, setMondayReviewActions] = useState<MondayReviewActionItem[]>(() => {
    const saved = localStorage.getItem('sap_monday_review_actions');
    return saved ? JSON.parse(saved) : INITIAL_MONDAY_REVIEW_ACTIONS;
  });

  const [planFreezeList, setPlanFreezeList] = useState<FGPlanFreezeItem[]>(() => {
    const saved = localStorage.getItem('sap_plan_freeze');
    return saved ? JSON.parse(saved) : INITIAL_PLAN_FREEZE_ITEMS;
  });

  const [deliveryScheduleChangeLogs, setDeliveryScheduleChangeLogs] = useState<VendorDeliveryScheduleChangeLog[]>(() => {
    const saved = localStorage.getItem('sap_delivery_change_logs');
    return saved ? JSON.parse(saved) : INITIAL_DELIVERY_CHANGE_LOGS;
  });

  // LocalStorage sync effects
  useEffect(() => {
    localStorage.setItem('sap_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('sap_active_subview', activeSubView);
  }, [activeSubView]);

  useEffect(() => {
    localStorage.setItem('sap_current_role', currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem('sap_boms', JSON.stringify(boms));
  }, [boms]);

  useEffect(() => {
    localStorage.setItem('sap_vendor_buyers', JSON.stringify(vendorBuyers));
  }, [vendorBuyers]);

  useEffect(() => {
    localStorage.setItem('sap_weeks', JSON.stringify(weeks));
  }, [weeks]);

  useEffect(() => {
    localStorage.setItem('sap_monthly_plans', JSON.stringify(monthlyPlans));
  }, [monthlyPlans]);

  useEffect(() => {
    localStorage.setItem('sap_mb51', JSON.stringify(mb51List));
  }, [mb51List]);

  useEffect(() => {
    localStorage.setItem('sap_stock', JSON.stringify(stockList));
  }, [stockList]);

  useEffect(() => {
    localStorage.setItem('sap_vendor_delivery_schedules', JSON.stringify(vendorDeliverySchedules));
  }, [vendorDeliverySchedules]);

  useEffect(() => {
    localStorage.setItem('sap_monday_review_actions', JSON.stringify(mondayReviewActions));
  }, [mondayReviewActions]);

  useEffect(() => {
    localStorage.setItem('sap_plan_freeze', JSON.stringify(planFreezeList));
  }, [planFreezeList]);

  useEffect(() => {
    localStorage.setItem('sap_delivery_change_logs', JSON.stringify(deliveryScheduleChangeLogs));
  }, [deliveryScheduleChangeLogs]);

  // Hydrate master data from backend PostgreSQL API on mount
  useEffect(() => {
    bomService.listAll()
      .then((items) => {
        if (Array.isArray(items)) {
          setBoms(
            items.map((dto) => ({
              id: String(dto.id),
              fgCode: dto.fg_code,
              fgDescription: dto.fg_description,
              componentCode: dto.component_code,
              componentDescription: dto.component_description,
              qty: dto.qty,
              uom: dto.uom,
              category: dto.category as 'RM' | 'PM',
            }))
          );
        }
      })
      .catch(() => {
        /* Non-fatal: fallback to existing localStorage or seed data */
      });

    vendorBuyerService.listAll()
      .then((items) => {
        if (Array.isArray(items)) {
          setVendorBuyers(
            items.map((dto) => ({
              id: String(dto.id),
              vendorCode: dto.vendor_code,
              vendorName: dto.vendor_name,
              buyerName: dto.buyer_name,
              buyerEmail: dto.buyer_email || '',
              buyerPhone: dto.buyer_phone || '',
              category: dto.category || 'RM',
              suppliedComponents: dto.supplied_components || [],
              leadTimeDays: dto.lead_time_days || 7,
              city: dto.city || '',
              gstNo: dto.gst_no || '',
            }))
          );
        }
      })
      .catch(() => {
        /* Non-fatal */
      });

    // Hydrate weeks from API
    weekService.list()
      .then((items) => {
        if (Array.isArray(items)) {
          setWeeks(items.map(dtoToFrontend));
        }
      })
      .catch(() => {});

    // Hydrate monthly plans from API
    monthlyPlanService.getMonthlyPlans()
      .then((plans) => {
        if (Array.isArray(plans)) {
          setMonthlyPlans(plans);
        }
      })
      .catch(() => {});

    // Hydrate MB51 transactions from API
    mb51Service.getTransactions()
      .then((txs) => {
        if (Array.isArray(txs)) {
          setMb51List(txs);
        }
      })
      .catch(() => {});

    // Hydrate stock report from API
    stockService.getStockReport()
      .then((items) => {
        if (Array.isArray(items)) {
          setStockList(items);
        }
      })
      .catch(() => {});
  }, []);

  // Compute Critical RM Shortages Count for Badges
  const rmSummaries = computeRMWeeklyRequirements(
    selectedMonth,
    monthlyPlans,
    weeks,
    boms,
    vendorBuyers,
    mb51List,
    stockList,
    vendorDeliverySchedules
  );
  const criticalShortagesCount = rmSummaries.filter((s) => s.overallStatus === 'SHORTAGE').length;

  const handleResetData = () => {
    if (
      window.confirm(
        'Clear all Master Data, Monthly Plans, Week Definitions, MB51 Transactions, Stock balances, Delivery Schedules and Action items?'
      )
    ) {
      setBoms([]);
      setVendorBuyers([]);
      setWeeks([]);
      setMonthlyPlans([]);
      setMb51List([]);
      setStockList([]);
      setVendorDeliverySchedules([]);
      setMondayReviewActions([]);
      setPlanFreezeList([]);
      setDeliveryScheduleChangeLogs([]);
      localStorage.clear();
      localStorage.setItem('sap_cleared_dummy_data_v1', 'true');
      window.location.reload();
    }
  };

  const getActiveViewTitle = () => {
    switch (activeSubView) {
      case 'monday_review_cockpit':
        return 'Monday Review & Seamless Production Cockpit';
      case 'management_loss_report':
        return 'Executive Management Report: Critical Items & Weekly Production Loss Matrix';
      case 'performance_dashboard':
        return 'Performance Dashboard: Monthly Fulfillment, RM Trends & Stock Accuracy';
      case 'update_delivery_schedule':
        return 'Vendor Delivery Schedule Updation & Consolidated RM Matrix (Supply/Buyer)';
      case 'weekly_rm_matrix':
        return 'Weekly RM/PM MRP & Shortage Matrix';
      case 'weekly_fg_matrix':
        return 'Weekly FG Supply & Dispatch Matrix';
      case 'monthly_define_weeks':
        return 'Monthly Calendar: Define Week No.';
      case 'monthly_plan_upload':
        return 'Monthly Upload: FG Plan & Prorating';
      case 'monday_mb51_report':
        return 'Monday Upload: SAP MB51 Movement Report';
      case 'monday_stock_report':
        return 'Monday Upload: Stock Report (MB52)';
      case 'master_bom':
        return 'Master Data: BOM Master';
      case 'master_vendor_buyer':
        return 'Master Data: Vendor & Buyer Relationship';
      case 'audit_log':
        return 'System Audit Log';
      default:
        return 'Weekly MRP & Supply Operations';
    }
  };

  const handleSelectRole = (role: UserRole) => {
    setCurrentRole(role);
    if (role === 'management' && activeSubView !== 'management_loss_report' && activeSubView !== 'performance_dashboard') {
      setActiveSubView('management_loss_report');
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 font-sans overflow-hidden">
      {/* 1. Collapsible Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        currentRole={currentRole}
        onSelectRole={handleSelectRole}
        activeSubView={activeSubView}
        onSelectSubView={setActiveSubView}
        criticalShortagesCount={criticalShortagesCount}
        onResetData={handleResetData}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Cockpit Back Navigation Strip */}
        <div className="bg-slate-950 border-b border-slate-800 px-4 py-1.5 flex items-center justify-between z-30">
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-300 hover:bg-[#4C7FFF] hover:text-white hover:border-[#4C7FFF] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO COCKPIT</span>
          </button>
          <div className="flex items-center gap-3">
            {currentUser?.is_superadmin && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-900/60 text-rose-300 border border-rose-500/40">
                SUPERADMIN ROOT
              </span>
            )}
            <span className="text-[10px] font-mono text-slate-400">
              {currentUser?.full_name || currentUser?.username} • MPS Module
            </span>
            {onNavigateToSuperadmin && currentUser?.is_superadmin && (
              <button
                onClick={onNavigateToSuperadmin}
                className="flex items-center gap-1 px-2 py-1 rounded bg-rose-950/40 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold hover:bg-rose-600 hover:text-white transition cursor-pointer"
                title="SuperAdmin Governance"
              >
                GOVERNANCE
              </button>
            )}
            <button
              onClick={onLogout}
              className="p-1.5 text-rose-400 hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Top Header */}
        <Header
          currentRole={currentRole}
          setCurrentRole={handleSelectRole}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onResetData={handleResetData}
          criticalShortageCount={criticalShortagesCount}
          activeViewTitle={getActiveViewTitle()}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-3.5 bg-slate-100">
          <div className="w-full space-y-3 max-w-[100vw]">
            {activeSubView === 'monday_review_cockpit' && (
              <MondayReviewCockpit
                monthlyPlans={monthlyPlans}
                weeks={weeks}
                boms={boms}
                vendorBuyers={vendorBuyers}
                mb51List={mb51List}
                stockList={stockList}
                vendorDeliverySchedules={vendorDeliverySchedules}
                onUpdateVendorDeliverySchedules={setVendorDeliverySchedules}
                mondayReviewActions={mondayReviewActions}
                onUpdateMondayReviewActions={setMondayReviewActions}
                planFreezeList={planFreezeList}
                onUpdatePlanFreezeList={setPlanFreezeList}
                deliveryScheduleChangeLogs={deliveryScheduleChangeLogs}
                onUpdateDeliveryScheduleChangeLogs={setDeliveryScheduleChangeLogs}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
                currentRole={currentRole}
                onSelectRole={setCurrentRole}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              />
            )}

            {activeSubView === 'management_loss_report' && (
              <ManagementProductionLossReport
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                weeks={weeks}
                monthlyPlans={monthlyPlans}
                boms={boms}
                vendorBuyers={vendorBuyers}
                mb51List={mb51List}
                stockList={stockList}
                vendorDeliverySchedules={vendorDeliverySchedules}
                planFreezeList={planFreezeList}
                onNavigateToCockpit={(weekId, fgCode) => {
                  setActiveSubView('monday_review_cockpit');
                }}
                onNavigateToVendorSchedule={(compCode) => {
                  setActiveSubView('update_delivery_schedule');
                }}
              />
            )}

            {activeSubView === 'performance_dashboard' && (
              <PerformanceDashboard
                monthlyPlans={monthlyPlans}
                weeks={weeks}
                boms={boms}
                vendorBuyers={vendorBuyers}
                mb51List={mb51List}
                stockList={stockList}
                vendorDeliverySchedules={vendorDeliverySchedules}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
                currentRole={currentRole}
                onNavigateToCockpit={() => setActiveSubView('monday_review_cockpit')}
                onNavigateToRMSupply={() => setActiveSubView('weekly_rm_matrix')}
              />
            )}

            {activeSubView === 'update_delivery_schedule' && (
              <VendorScheduleManager
                monthlyPlans={monthlyPlans}
                weeks={weeks}
                boms={boms}
                vendorBuyers={vendorBuyers}
                mb51List={mb51List}
                stockList={stockList}
                vendorDeliverySchedules={vendorDeliverySchedules}
                onUpdateVendorDeliverySchedules={setVendorDeliverySchedules}
                deliveryScheduleChangeLogs={deliveryScheduleChangeLogs}
                onUpdateDeliveryScheduleChangeLogs={setDeliveryScheduleChangeLogs}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
                currentRole={currentRole}
                onSelectRole={setCurrentRole}
              />
            )}

            {activeSubView === 'weekly_rm_matrix' && (
              <WeeklyRMSupplyView
                monthlyPlans={monthlyPlans}
                weeks={weeks}
                boms={boms}
                vendorBuyers={vendorBuyers}
                mb51List={mb51List}
                stockList={stockList}
                vendorDeliverySchedules={vendorDeliverySchedules}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
                onNavigateToDeliverySchedule={() => setActiveSubView('update_delivery_schedule')}
              />
            )}

            {activeSubView === 'weekly_fg_matrix' && (
              <WeeklyFGSupplyView
                monthlyPlans={monthlyPlans}
                weeks={weeks}
                mb51List={mb51List}
                stockList={stockList}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
              />
            )}

            {activeSubView === 'monthly_define_weeks' && (
              <WeekDefinitionManager
                weeks={weeks}
                onUpdateWeeks={setWeeks}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
              />
            )}

            {activeSubView === 'monthly_plan_upload' && (
              <MonthlyPlanManager
                monthlyPlans={monthlyPlans}
                onUpdateMonthlyPlans={setMonthlyPlans}
                weeks={weeks}
                boms={boms}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
              />
            )}

            {activeSubView === 'monday_mb51_report' && (
              <MB51ReportManager
                mb51List={mb51List}
                onUpdateMB51={setMb51List}
                weeks={weeks}
                selectedMonth={selectedMonth}
              />
            )}

            {activeSubView === 'monday_stock_report' && (
              <StockReportManager
                stockList={stockList}
                onUpdateStock={setStockList}
              />
            )}

            {activeSubView === 'master_bom' && (
              <BOMMasterManager
                boms={boms}
                onUpdateBoms={setBoms}
              />
            )}

            {activeSubView === 'master_fg_headers' && (
              <FGHeaderManager />
            )}

            {activeSubView === 'master_components' && (
              <ComponentManager />
            )}

            {activeSubView === 'master_common_components' && (
              <CommonComponentsDashboard />
            )}

            {activeSubView === 'master_vendor_buyer' && (
              <VendorBuyerManager
                vendorBuyers={vendorBuyers}
                onUpdateVendorBuyers={setVendorBuyers}
              />
            )}

            {activeSubView === 'audit_log' && (
              <AuditLogView
                deliveryScheduleChangeLogs={deliveryScheduleChangeLogs}
                planFreezeList={planFreezeList}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
