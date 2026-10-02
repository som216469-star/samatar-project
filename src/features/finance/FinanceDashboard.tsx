import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  CreditCard,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  PlusCircle
} from 'lucide-react';
import { formatMoney } from './financeUtils';
import { Button, Card, EmptyState, StatCard } from '../../components/ui/primitives';

interface FinanceDashboardProps {
  stats: any;
  pnlData: any;
  cashFlowData: any;
  currency: string;
  onNavigateTab: (tabId: string) => void;
  onOpenNewInvoice: () => void;
  onOpenNewExpense: () => void;
  onOpenNewPayment: () => void;
  onOpenNewIncome: () => void;
}

export const FinanceDashboard: React.FC<FinanceDashboardProps> = ({
  stats,
  pnlData,
  currency,
  onNavigateTab,
  onOpenNewInvoice,
  onOpenNewExpense,
  onOpenNewPayment,
  onOpenNewIncome
}) => {
  const isProfitable = (stats?.netProfit ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Action Quick Bar */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-[var(--text-primary)] block">
            Degdeg u Diiwaangeli (Quick Actions)
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            Abuur biil, qabo lacag bixin, ama qor kharash cusub
          </span>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenNewInvoice}
            icon={<PlusCircle className="w-4 h-4" />}
          >
            Abuur Biil (New Invoice)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenNewPayment}
            icon={<Receipt className="w-4 h-4 text-emerald-500" />}
          >
            Qabo Lacag (Record Payment)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenNewExpense}
            icon={<CreditCard className="w-4 h-4 text-rose-500" />}
          >
            Qor Kharash (New Expense)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenNewIncome}
            icon={<DollarSign className="w-4 h-4 text-blue-500" />}
          >
            Dakhli Kale (Add Income)
          </Button>
        </div>
      </Card>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => onNavigateTab('income')} className="cursor-pointer">
          <StatCard
            label="Dakhliga Guud (Total Revenue)"
            value={formatMoney(stats?.totalRevenue ?? 0, currency)}
            subtext={`${stats?.paidInvoicesCount || 0} biilal la bixiyey`}
            icon={ArrowUpRight}
            color="emerald"
          />
        </div>

        <div onClick={() => onNavigateTab('expenses')} className="cursor-pointer">
          <StatCard
            label="Kharashka Guud (Total Expenses)"
            value={formatMoney(stats?.totalExpenses ?? 0, currency)}
            subtext={`Mushahaar & Qalab: ${formatMoney(stats?.payrollPaid ?? 0, currency)}`}
            icon={ArrowDownRight}
            color="rose"
          />
        </div>

        <div onClick={() => onNavigateTab('profit_loss')} className="cursor-pointer">
          <StatCard
            label="Faa'iidada Saufiga (Net Profit)"
            value={formatMoney(stats?.netProfit ?? 0, currency)}
            subtext="Formula: Dakhli - Kharash"
            icon={isProfitable ? TrendingUp : TrendingDown}
            color={isProfitable ? 'emerald' : 'rose'}
          />
        </div>

        <div onClick={() => onNavigateTab('invoices')} className="cursor-pointer">
          <StatCard
            label="Lacagta Dhiman (Outstanding Fees)"
            value={formatMoney(stats?.totalOutstandingFees ?? 0, currency)}
            subtext={`${stats?.pendingInvoicesCount || 0} biilal ayaa baaqi ah`}
            icon={FileText}
            color="amber"
          />
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
            Lacagta Soo Gashay (Inflows)
          </span>
          <span className="text-lg font-bold font-mono text-[var(--text-primary)]">
            {formatMoney(stats?.cashInflow ?? 0, currency)}
          </span>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
            Lacagta Baxday (Outflows)
          </span>
          <span className="text-lg font-bold font-mono text-[var(--text-primary)]">
            {formatMoney(stats?.cashOutflow ?? 0, currency)}
          </span>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
            Baaqiga Sanduuqa (Cash Balance)
          </span>
          <span className="text-lg font-bold font-mono text-emerald-500">
            {formatMoney(stats?.closingCashBalance ?? 0, currency)}
          </span>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
            Mushahaar Sugaya (Pending Payroll)
          </span>
          <span className="text-lg font-bold font-mono text-[var(--text-secondary)]">
            {formatMoney(stats?.payrollPending ?? 0, currency)}
          </span>
        </Card>
      </div>

      {/* Visual Chart / Trend Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Bars */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
                Dhaqdhaqaaqa Sanadlaha ah (Annual Financial Trend)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Isbarbardhigga Dakhliga iyo Kharashaadka bishiiba
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-emerald-500">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm inline-block" />
                Dakhli
              </span>
              <span className="flex items-center gap-1.5 text-rose-500">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm inline-block" />
                Kharash
              </span>
            </div>
          </div>

          <div className="h-52 flex items-end gap-2 pt-6 border-b border-[var(--border-subtle)] pb-2">
            {(pnlData?.monthlyTrend || []).map((m: any, idx: number) => {
              const maxVal = Math.max(
                100,
                ...(pnlData?.monthlyTrend || []).map((item: any) =>
                  Math.max(item.revenue || 0, item.expenses || 0)
                )
              );
              const revHeight = Math.round(((m.revenue || 0) / maxVal) * 100);
              const expHeight = Math.round(((m.expenses || 0) / maxVal) * 100);

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative"
                >
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[10px] font-mono p-1.5 rounded-lg shadow-lg pointer-events-none transition-opacity z-10 whitespace-nowrap text-[var(--text-primary)]">
                    <div className="text-emerald-500">Rev: ${m.revenue}</div>
                    <div className="text-rose-500">Exp: ${m.expenses}</div>
                  </div>
                  <div className="w-full flex items-end justify-center gap-1 h-36">
                    <div
                      style={{ height: `${Math.max(4, revHeight)}%` }}
                      className="w-1/2 bg-emerald-500/85 rounded-t-sm hover:bg-emerald-500 transition-all"
                      title={`Revenue: $${m.revenue}`}
                    />
                    <div
                      style={{ height: `${Math.max(4, expHeight)}%` }}
                      className="w-1/2 bg-rose-500/85 rounded-t-sm hover:bg-rose-500 transition-all"
                      title={`Expenses: $${m.expenses}`}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] mt-1">
                    {m.month}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Expenses by Category Breakdown */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
                Qeybaha Kharashka (Categories)
              </h3>
              <PieChartIcon className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Kharashyada ugu waaweyn ee bishan/sanadkan
            </p>

            <div className="space-y-3">
              {Object.entries(pnlData?.expensesByCategory || {}).length === 0 ? (
                <EmptyState
                  title="Kharashyo Ma Jiraan"
                  description="Wali kharashyo ma diiwaangashana."
                  className="py-6"
                />
              ) : (
                Object.entries(pnlData?.expensesByCategory || {})
                  .slice(0, 5)
                  .map(([cat, amt]: [string, any], idx) => {
                    const total = pnlData?.totalExpenses || 1;
                    const pct = Math.round((Number(amt) / total) * 100);
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-secondary)] font-medium">{cat}</span>
                          <span className="font-mono text-[var(--text-primary)] font-bold">
                            {formatMoney(amt, currency)} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-rose-500 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigateTab('expenses')}
            className="w-full mt-4 justify-center"
          >
            Eeg Dhammaan Kharashyada &rarr;
          </Button>
        </Card>
      </div>
    </div>
  );
};
