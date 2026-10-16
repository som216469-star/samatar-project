import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, DollarSign } from 'lucide-react';
import type {
  Invoice,
  PaymentTransaction,
  ExpenseRecord,
  IncomeRecord,
  BudgetRecord,
  PayrollRecord,
  FeeStructure
} from '../../types';

export interface FinanceStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfitLoss: number;
  totalReceivables: number;
  collectedThisMonth: number;
  overdueInvoicesAmount: number;
  overdueInvoicesCount: number;
  collectionRate: number;
  cashInHand: number;
  bankBalance: number;
  monthlyTrend: any[];
  expenseBreakdown: any[];
  incomeBreakdown: any[];
}
import { FinanceDashboard } from './FinanceDashboard';
import { InvoicesModule } from './InvoicesModule';
import { PaymentsModule } from './PaymentsModule';
import { ExpensesModule } from './ExpensesModule';
import { IncomeModule } from './IncomeModule';
import { BudgetsModule } from './BudgetsModule';
import { PayrollModule } from './PayrollModule';
import { ProfitLossView } from './ProfitLossView';
import { CashFlowView } from './CashFlowView';
import { FinancialReportsModule } from './FinancialReportsModule';
import { FeeStructuresModule } from './FeeStructuresModule';
import { PageContainer, PageHeader } from '../../components/layout/PageLayout';
import { Card, Button, Badge } from '../../components/ui/primitives';
import { FinanceSubSection } from '../../app/navigationConfig';
import { apiFetch } from '../../lib/apiClient';

export type { FinanceSubSection };

function financeResponseError(status: number): Error {
  if (status === 401) return new Error("Fadhigaagu wuu dhacay. Fadlan dib u gal si aad u aragto xogta maaliyadda.");
  if (status === 403) return new Error("Awood uma lihid inaad aragto qaybtaan maaliyadda.");
  if (status === 503) return new Error("Kaydka xogta maaliyadda hadda lama heli karo. Xogta lama cusboonaysiin; dib isku day marka adeeggu soo noqdo.");
  return new Error("Xogta maaliyadda lama soo qaadi karin. Fadlan isku day mar kale.");
}

async function safeJson<T = any>(res: Response, fallback: T): Promise<T> {
  if (!res.ok) throw financeResponseError(res.status);
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return fallback;
  try {
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

interface FinanceViewProps {
  students: any[];
  classes: any[];
  teachers: any[];
  staff: any[];
  schoolName: string;
  currency?: string;
  subSection?: FinanceSubSection;
  onSubSectionChange?: (sub: FinanceSubSection) => void;
  onNavigateSubSection?: (sub: FinanceSubSection) => void;
}

export const FinancePage: React.FC<FinanceViewProps> = ({
  students,
  classes,
  teachers,
  staff,
  schoolName,
  currency = 'USD',
  subSection = 'overview',
  onSubSectionChange,
  onNavigateSubSection
}) => {
  const handleSubChange = onSubSectionChange || onNavigateSubSection;
  const [internalSubTab, setInternalSubTab] = useState<FinanceSubSection>(subSection);

  useEffect(() => {
    setInternalSubTab(subSection);
  }, [subSection]);

  const activeSubTab = handleSubChange ? subSection : internalSubTab;
  const setActiveSubTab = (sub: FinanceSubSection) => {
    setInternalSubTab(sub);
    handleSubChange?.(sub);
  };

  const [loading, setLoading] = useState(true);
  const [hasLoadedFinanceData, setHasLoadedFinanceData] = useState(false);
  const [financeLoadError, setFinanceLoadError] = useState<string | null>(null);
  const [stats, setStats] = useState<FinanceStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfitLoss: 0,
    totalReceivables: 0,
    collectedThisMonth: 0,
    overdueInvoicesAmount: 0,
    overdueInvoicesCount: 0,
    collectionRate: 0,
    cashInHand: 0,
    bankBalance: 0,
    monthlyTrend: [],
    expenseBreakdown: [],
    incomeBreakdown: []
  });

  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomeList, setIncomeList] = useState<IncomeRecord[]>([]);
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [pnlData, setPnlData] = useState<any>(null);
  const [cashFlowData, setCashFlowData] = useState<any>(null);

  // Quick-action state for cross-module modal triggers
  const [activeInvoiceForPayment, setActiveInvoiceForPayment] =
    useState<Invoice | null>(null);
  const [quickOpenModal, setQuickOpenModal] = useState<string | null>(null);

  const fetchAllFinanceData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        fsRes,
        invRes,
        payRes,
        expRes,
        incRes,
        budRes,
        prRes,
        pnlRes,
        cfRes
      ] = await Promise.all([
        apiFetch('/api/finance/stats'),
        apiFetch('/api/fee-structures'),
        apiFetch('/api/invoices'),
        apiFetch('/api/payments'),
        apiFetch('/api/expenses'),
        apiFetch('/api/income'),
        apiFetch('/api/budgets'),
        apiFetch('/api/payroll'),
        apiFetch('/api/profit-loss'),
        apiFetch('/api/cash-flow')
      ]);

      const [
        statsData,
        fsData,
        invData,
        payData,
        expData,
        incData,
        budData,
        prData,
        pnlResult,
        cfResult
      ] = await Promise.all([
        safeJson(statsRes, null),
        safeJson(fsRes, []),
        safeJson(invRes, []),
        safeJson(payRes, []),
        safeJson(expRes, []),
        safeJson(incRes, []),
        safeJson(budRes, []),
        safeJson(prRes, []),
        safeJson(pnlRes, null),
        safeJson(cfRes, null)
      ]);

      setFinanceLoadError(null);
      setHasLoadedFinanceData(true);
      if (statsData) setStats(statsData);
      if (Array.isArray(fsData)) setFeeStructures(fsData);
      if (Array.isArray(invData)) setInvoices(invData);
      if (Array.isArray(payData)) setPayments(payData);
      if (Array.isArray(expData)) setExpenses(expData);
      if (Array.isArray(incData)) setIncomeList(incData);
      if (Array.isArray(budData)) setBudgets(budData);
      if (Array.isArray(prData)) setPayroll(prData);
      if (pnlResult) setPnlData(pnlResult);
      if (cfResult) setCashFlowData(cfResult);
    } catch (error) {
      console.error('Error loading finance data:', error);
      setFinanceLoadError(
        error instanceof Error
          ? error.message
          : "Xogta maaliyadda lama soo qaadi karin. Fadlan isku day mar kale."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllFinanceData();
  }, [fetchAllFinanceData]);

  const handlePnlPeriodChange = useCallback(
    async (period: string, startDate?: string, endDate?: string) => {
      try {
        const params = new URLSearchParams({ period });
        if (startDate) params.set('from', startDate);
        if (endDate) params.set('to', endDate);
        const res = await apiFetch(`/api/profit-loss?${params.toString()}`);
        const data = await safeJson(res, null);
        if (data) {
          setPnlData(data);
          setFinanceLoadError(null);
        }
      } catch (err) {
        console.error('Error updating P&L period:', err);
        setFinanceLoadError(
          err instanceof Error
            ? err.message
            : "Warbixinta faa’iido iyo khasaaro lama cusboonaysiin karin."
        );
      }
    },
    []
  );

  const handleCashFlowPeriodChange = useCallback(async (period: string) => {
    try {
      const res = await apiFetch(`/api/cash-flow?period=${encodeURIComponent(period)}`);
      const data = await safeJson(res, null);
      if (data) {
        setCashFlowData(data);
        setFinanceLoadError(null);
      }
    } catch (err) {
      console.error('Error updating Cash Flow period:', err);
      setFinanceLoadError(
        err instanceof Error
          ? err.message
          : "Xogta socodka lacagta lama cusboonaysiin karin."
      );
    }
  }, []);

  const handleQuickAction = (action: string) => {
    if (action === 'create_invoice') {
      setActiveSubTab('invoices');
      setQuickOpenModal('create_invoice');
    } else if (action === 'record_payment') {
      setActiveSubTab('payments');
      setQuickOpenModal('record_payment');
    } else if (action === 'add_expense') {
      setActiveSubTab('expenses');
      setQuickOpenModal('add_expense');
    } else if (action === 'add_income') {
      setActiveSubTab('income');
      setQuickOpenModal('add_income');
    } else if (action === 'generate_report') {
      setActiveSubTab('reports');
    }
  };

  const handleRecordPaymentFromInvoice = (invoice: Invoice) => {
    setActiveInvoiceForPayment(invoice);
    setActiveSubTab('payments');
  };

  return (
    <PageContainer className="space-y-6 pb-12">
      <PageHeader
        moduleLabel="DUGSI PRO 2026 // FINANCE & ACCOUNTING"
        title="Maamulka Maaliyadda & Xisaabaadka (Finance & Accounting)"
        subtitle="Nidaamka Xisaabaadka Dugsiga — Biilasha, Kharashaadka, Dakhliga, Miisaaniyadda, Mushaarka & Warbixinada"
        badge={<Badge variant="success">Enterprise Accounting Suite</Badge>}
        actions={
          <div className="flex items-center gap-2.5">
            <Badge variant="neutral" className="py-1.5 px-3 font-mono text-xs">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500 mr-1" />
              Lacagta: {currency}
            </Badge>
            <Button
              variant="secondary"
              size="md"
              onClick={fetchAllFinanceData}
              icon={
                <RefreshCw
                  className={`w-4 h-4 text-emerald-500 ${loading ? 'animate-spin' : ''}`}
                />
              }
            >
              Cusboonaysii
            </Button>
          </div>
        }
      />

      {/* Active Module Area */}
      {financeLoadError ? (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-[360px] flex items-center justify-center rounded-3xl border border-amber-500/25 bg-amber-500/[0.045] p-6"
        >
          <div className="max-w-lg text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </div>
            <h2 className="mt-4 text-lg font-black tracking-tight text-[var(--color-text-primary)]">
              Xogta maaliyadda lama xaqiijin karin
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-text-secondary)]">
              {financeLoadError}
            </p>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              Xog hore looma muujinayo sidii inay tahay xogta hadda jirta.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={fetchAllFinanceData}
              loading={loading}
              icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
              className="mt-5"
            >
              Dib u tijaabi
            </Button>
          </div>
        </div>
      ) : loading && !hasLoadedFinanceData ? (
        <div role="status" aria-live="polite" className="min-h-[360px] flex items-center justify-center rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/60">
          <div className="flex flex-col items-center gap-3 text-center">
            <RefreshCw className="h-6 w-6 animate-spin text-[var(--color-brand)]" />
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Xogta maaliyadda ayaa la soo qaadaya…</p>
            <p className="text-xs text-[var(--color-text-muted)]">Fadlan sug inta kaydka xogta la xaqiijinayo.</p>
          </div>
        </div>
      ) : (
      <div className="min-h-[500px]">
        {activeSubTab === 'overview' && (
          <FinanceDashboard
            stats={stats}
            pnlData={pnlData}
            cashFlowData={cashFlowData}
            currency={currency}
            onNavigateTab={(tabId) => setActiveSubTab(tabId as FinanceSubSection)}
            onOpenNewInvoice={() => handleQuickAction('create_invoice')}
            onOpenNewPayment={() => handleQuickAction('record_payment')}
            onOpenNewExpense={() => handleQuickAction('add_expense')}
            onOpenNewIncome={() => handleQuickAction('add_income')}
          />
        )}

        {activeSubTab === 'invoices' && (
          <InvoicesModule
            invoices={invoices}
            students={students}
            classes={classes}
            feeStructures={feeStructures}
            currency={currency}
            schoolName={schoolName}
            onRefresh={fetchAllFinanceData}
            onRecordPayment={handleRecordPaymentFromInvoice}
            showCreateModalDefault={quickOpenModal === 'create_invoice'}
          />
        )}

        {activeSubTab === 'payments' && (
          <PaymentsModule
            payments={payments}
            invoices={invoices}
            currency={currency}
            schoolName={schoolName}
            onRefresh={fetchAllFinanceData}
            activeInvoiceForPayment={activeInvoiceForPayment}
            onClosePaymentModal={() => setActiveInvoiceForPayment(null)}
          />
        )}

        {activeSubTab === 'expenses' && (
          <ExpensesModule
            expenses={expenses}
            currency={currency}
            schoolName={schoolName}
            onRefresh={fetchAllFinanceData}
            showCreateModalDefault={quickOpenModal === 'add_expense'}
          />
        )}

        {activeSubTab === 'income' && (
          <IncomeModule
            incomeList={incomeList}
            currency={currency}
            schoolName={schoolName}
            onRefresh={fetchAllFinanceData}
            showCreateModalDefault={quickOpenModal === 'add_income'}
          />
        )}

        {activeSubTab === 'fee_structures' && (
          <FeeStructuresModule
            feeStructures={feeStructures}
            classes={classes}
            currency={currency}
            schoolName={schoolName}
            onRefresh={fetchAllFinanceData}
          />
        )}

        {activeSubTab === 'budgets' && (
          <BudgetsModule
            budgets={budgets}
            currency={currency}
            schoolName={schoolName}
            onRefresh={fetchAllFinanceData}
          />
        )}

        {activeSubTab === 'payroll' && (
          <PayrollModule
            payroll={payroll}
            teachers={teachers}
            staff={staff}
            currency={currency}
            schoolName={schoolName}
            onRefresh={fetchAllFinanceData}
          />
        )}

        {activeSubTab === 'profit_loss' && (
          <ProfitLossView
            pnlData={pnlData}
            currency={currency}
            schoolName={schoolName}
            onPeriodChange={handlePnlPeriodChange}
          />
        )}

        {activeSubTab === 'cash_flow' && (
          <CashFlowView
            cashFlowData={cashFlowData}
            currency={currency}
            schoolName={schoolName}
            onPeriodChange={handleCashFlowPeriodChange}
          />
        )}

        {activeSubTab === 'reports' && (
          <FinancialReportsModule
            stats={stats}
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
      )}
    </PageContainer>
  );
};

export default FinancePage;
export { FinancePage as FinanceView };
