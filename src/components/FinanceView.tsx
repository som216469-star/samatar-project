import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  FileText, 
  Receipt, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  PieChart, 
  Users, 
  Layers, 
  FileSpreadsheet,
  RefreshCw
} from "lucide-react";
import { FinanceDashboard } from "./finance/FinanceDashboard";
import { InvoicesModule } from "./finance/InvoicesModule";
import { PaymentsModule } from "./finance/PaymentsModule";
import { ExpensesModule } from "./finance/ExpensesModule";
import { IncomeModule } from "./finance/IncomeModule";
import { ProfitLossView } from "./finance/ProfitLossView";
import { CashFlowView } from "./finance/CashFlowView";
import { BudgetsModule } from "./finance/BudgetsModule";
import { PayrollModule } from "./finance/PayrollModule";
import { FeeStructuresModule } from "./finance/FeeStructuresModule";
import { FinancialReportsModule } from "./finance/FinancialReportsModule";
import type { Invoice, PaymentTransaction, ExpenseRecord, IncomeRecord, BudgetRecord, PayrollRecord, FeeStructure } from "../types";

interface FinanceViewProps {
  students: any[];
  classes: any[];
  teachers?: any[];
  staff?: any[];
  currency?: string;
  schoolName?: string;
  subSection?: string;
  onNavigateSubSection?: (sub: any) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  students = [],
  classes = [],
  teachers = [],
  staff = [],
  currency = "USD",
  schoolName = "Dugsiga Pro 2026",
  subSection,
  onNavigateSubSection
}) => {
  const [activeSubTab, setActiveSubTabState] = useState<string>(subSection || "overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subSection && subSection !== activeSubTab) {
      setActiveSubTabState(subSection);
    }
  }, [subSection]);

  const setActiveSubTab = (tab: string) => {
    setActiveSubTabState(tab);
    if (onNavigateSubSection) {
      onNavigateSubSection(tab);
    }
  };

  // Data States
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [pnlData, setPnlData] = useState<any>(null);
  const [cashFlowData, setCashFlowData] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomeList, setIncomeList] = useState<IncomeRecord[]>([]);
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);

  // Modals / Triggers from Dashboard
  const [activeInvoiceForPayment, setActiveInvoiceForPayment] = useState<Invoice | null>(null);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const [
        dashRes,
        pnlRes,
        cfRes,
        invRes,
        payRes,
        expRes,
        incRes,
        bgRes,
        prRes,
        fsRes
      ] = await Promise.all([
        fetch("/api/finance/stats").then((r) => r.json()).catch(() => null),
        fetch("/api/profit-loss?period=academic_year").then((r) => r.json()).catch(() => null),
        fetch("/api/cash-flow?period=annual").then((r) => r.json()).catch(() => null),
        fetch("/api/invoices").then((r) => r.json()).catch(() => []),
        fetch("/api/payments").then((r) => r.json()).catch(() => []),
        fetch("/api/expenses").then((r) => r.json()).catch(() => []),
        fetch("/api/income").then((r) => r.json()).catch(() => []),
        fetch("/api/budgets").then((r) => r.json()).catch(() => []),
        fetch("/api/payroll").then((r) => r.json()).catch(() => []),
        fetch("/api/fee-structures").then((r) => r.json()).catch(() => [])
      ]);

      if (dashRes) setDashboardStats(dashRes);
      if (pnlRes) setPnlData(pnlRes);
      if (cfRes) setCashFlowData(cfRes);
      if (Array.isArray(invRes)) setInvoices(invRes);
      if (Array.isArray(payRes)) setPayments(payRes);
      if (Array.isArray(expRes)) setExpenses(expRes);
      if (Array.isArray(incRes)) setIncomeList(incRes);
      if (Array.isArray(bgRes)) setBudgets(bgRes);
      if (Array.isArray(prRes)) setPayroll(prRes);
      if (Array.isArray(fsRes)) setFeeStructures(fsRes);
    } catch (err) {
      console.error("Error fetching finance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const handlePnlPeriodChange = async (period: string, startDate?: string, endDate?: string) => {
    try {
      let url = `/api/profit-loss?period=${period}`;
      if (startDate && endDate) {
        url += `&from=${startDate}&to=${endDate}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPnlData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCashFlowPeriodChange = async (period: string) => {
    try {
      const res = await fetch(`/api/cash-flow?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setCashFlowData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenPaymentFromInvoice = (inv: Invoice) => {
    setActiveInvoiceForPayment(inv);
    setActiveSubTab("payments");
  };

  const navTabs = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "invoices", label: "Invoices (Biilal)", icon: FileText, count: invoices.filter((i) => i.balance > 0).length },
    { id: "payments", label: "Payments (Rasiidyo)", icon: Receipt },
    { id: "expenses", label: "Expenses (Kharash)", icon: CreditCard },
    { id: "income", label: "Income (Dakhli)", icon: DollarSign },
    { id: "profit_loss", label: "Profit & Loss", icon: TrendingUp },
    { id: "cash_flow", label: "Cash Flow", icon: Wallet },
    { id: "budgets", label: "Budgets", icon: PieChart },
    { id: "payroll", label: "Payroll (Mushahaar)", icon: Users },
    { id: "fee_structures", label: "Fee Structures", icon: Layers },
    { id: "reports", label: "Reports Center", icon: FileSpreadsheet }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff10] pb-4">
        <div>
          <h1 className="text-xl font-bold font-serif text-[#f5f5f5] flex items-center gap-2">
            <span>Maaliyadda & Xisaabaadka (Finance & Accounting)</span>
          </h1>
          <p className="text-xs text-[#737373] mt-0.5">
            Dugsi Pro 2026 — Xarunta Guud ee Maareynta Dakhliga, Kharashaadka, Mushahaarka & Biilasha
          </p>
        </div>

        <button
          onClick={fetchFinanceData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-[#ffffff10] bg-[#0f0f0f] hover:bg-[#ffffff05] text-[#a3a3a3] hover:text-[#e5e5e5] text-xs font-semibold cursor-pointer transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Dib u Cusbooneysii</span>
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-[#ffffff0a] scrollbar-none">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? "bg-[#e5e5e5] text-[#0a0a0a]"
                  : "text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#ffffff05]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${isActive ? "bg-[#0a0a0a] text-white" : "bg-amber-500/20 text-amber-400"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Sub-Module View */}
      {activeSubTab === "overview" && (
        <FinanceDashboard
          stats={dashboardStats}
          pnlData={pnlData}
          cashFlowData={cashFlowData}
          currency={currency}
          onNavigateTab={(tab) => setActiveSubTab(tab)}
          onOpenNewInvoice={() => setActiveSubTab("invoices")}
          onOpenNewExpense={() => setActiveSubTab("expenses")}
          onOpenNewPayment={() => setActiveSubTab("payments")}
          onOpenNewIncome={() => setActiveSubTab("income")}
        />
      )}

      {activeSubTab === "invoices" && (
        <InvoicesModule
          invoices={invoices}
          students={students}
          classes={classes}
          feeStructures={feeStructures}
          currency={currency}
          schoolName={schoolName}
          onRefresh={fetchFinanceData}
          onRecordPayment={handleOpenPaymentFromInvoice}
        />
      )}

      {activeSubTab === "payments" && (
        <PaymentsModule
          payments={payments}
          invoices={invoices}
          currency={currency}
          schoolName={schoolName}
          onRefresh={fetchFinanceData}
          activeInvoiceForPayment={activeInvoiceForPayment}
          onClosePaymentModal={() => setActiveInvoiceForPayment(null)}
        />
      )}

      {activeSubTab === "expenses" && (
        <ExpensesModule
          expenses={expenses}
          currency={currency}
          schoolName={schoolName}
          onRefresh={fetchFinanceData}
        />
      )}

      {activeSubTab === "income" && (
        <IncomeModule
          incomeList={incomeList}
          currency={currency}
          schoolName={schoolName}
          onRefresh={fetchFinanceData}
        />
      )}

      {activeSubTab === "profit_loss" && (
        <ProfitLossView
          pnlData={pnlData}
          currency={currency}
          schoolName={schoolName}
          onPeriodChange={handlePnlPeriodChange}
        />
      )}

      {activeSubTab === "cash_flow" && (
        <CashFlowView
          cashFlowData={cashFlowData}
          currency={currency}
          schoolName={schoolName}
          onPeriodChange={handleCashFlowPeriodChange}
        />
      )}

      {activeSubTab === "budgets" && (
        <BudgetsModule
          budgets={budgets}
          currency={currency}
          schoolName={schoolName}
          onRefresh={fetchFinanceData}
        />
      )}

      {activeSubTab === "payroll" && (
        <PayrollModule
          payroll={payroll}
          teachers={teachers}
          staff={staff}
          currency={currency}
          schoolName={schoolName}
          onRefresh={fetchFinanceData}
        />
      )}

      {activeSubTab === "fee_structures" && (
        <FeeStructuresModule
          feeStructures={feeStructures}
          classes={classes}
          currency={currency}
          schoolName={schoolName}
          onRefresh={fetchFinanceData}
        />
      )}

      {activeSubTab === "reports" && (
        <FinancialReportsModule
          stats={dashboardStats}
          pnlData={pnlData}
          cashFlowData={cashFlowData}
          invoices={invoices}
          expenses={expenses}
          incomeList={incomeList}
          payroll={payroll}
          currency={currency}
          schoolName={schoolName}
        />
      )}
    </div>
  );
};
