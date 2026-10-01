import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  CreditCard,
  TrendingDown,
  TrendingUp,
  PieChart,
  Users,
  BarChart3,
  Activity,
  FileText,
  Layers,
  RefreshCw,
  DollarSign
} from 'lucide-react';
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

export type { FinanceSubSection };

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
        fetch('/api/finance/stats'),
        fetch('/api/fee-structures'),
        fetch('/api/invoices'),
        fetch('/api/payments'),
        fetch('/api/expenses'),
        fetch('/api/income'),
        fetch('/api/budgets'),
        fetch('/api/payroll'),
        fetch('/api/finance/profit-loss'),
        fetch('/api/finance/cash-flow')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (fsRes.ok) setFeeStructures(await fsRes.json());
      if (invRes.ok) setInvoices(await invRes.json());
      if (payRes.ok) setPayments(await payRes.json());
      if (expRes.ok) setExpenses(await expRes.json());
      if (incRes.ok) setIncomeList(await incRes.json());
      if (budRes.ok) setBudgets(await budRes.json());
      if (prRes.ok) setPayroll(await prRes.json());
      if (pnlRes.ok) setPnlData(await pnlRes.json());
      if (cfRes.ok) setCashFlowData(await cfRes.json());
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllFinanceData();
  }, [fetchAllFinanceData]);

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

  const navItems: { id: FinanceSubSection; label: string; icon: any }[] = [
    { id: 'overview', label: 'Dulmar (Dashboard)', icon: LayoutDashboard },
    { id: 'invoices', label: 'Biilasha (Invoices)', icon: FileSpreadsheet },
    { id: 'payments', label: 'Lacag Qabasho (Payments)', icon: CreditCard },
    { id: 'expenses', label: 'Kharashaad (Expenses)', icon: TrendingDown },
    { id: 'income', label: 'Dakhli (Income)', icon: TrendingUp },
    { id: 'fee_structures', label: 'Qaab-dhismeedka Fiiga', icon: Layers },
    { id: 'budgets', label: 'Miisaaniyad (Budgets)', icon: PieChart },
    { id: 'payroll', label: 'Mushaar (Payroll)', icon: Users },
    { id: 'profit_loss', label: 'Faa’iido & Khasaare (P&L)', icon: BarChart3 },
    { id: 'cash_flow', label: 'Qulqulka Lacagta (Cash Flow)', icon: Activity },
    { id: 'reports', label: 'Warbixino (Reports)', icon: FileText }
  ];

  return (
    <PageContainer className="space-y-6 pb-12">
      <PageHeader
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

      {/* Sub-Navigation Bar */}
      <Card className="p-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSubTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveSubTab(item.id);
                  setQuickOpenModal(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Active Module Area */}
      <div className="min-h-[500px]">
        {activeSubTab === 'overview' && (
          <FinanceDashboard
            stats={stats}
            invoices={invoices}
            payments={payments}
            expenses={expenses}
            currency={currency}
            onQuickAction={handleQuickAction}
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
          />
        )}

        {activeSubTab === 'cash_flow' && (
          <CashFlowView
            cashFlowData={cashFlowData}
            currency={currency}
            schoolName={schoolName}
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
    </PageContainer>
  );
};

export default FinancePage;
export { FinancePage as FinanceView };
