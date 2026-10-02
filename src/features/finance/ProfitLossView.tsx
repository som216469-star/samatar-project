import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Download,
  Printer,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { formatMoney, exportToExcel } from './financeUtils';
import { Button, Card, EmptyState, StatCard } from '../../components/ui/primitives';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ProfitLossViewProps {
  pnlData: any;
  currency: string;
  schoolName: string;
  onPeriodChange: (period: string, startDate?: string, endDate?: string) => void;
}

const inputClass =
  'px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/60 transition-all';

export const ProfitLossView: React.FC<ProfitLossViewProps> = ({
  pnlData,
  currency,
  schoolName,
  onPeriodChange
}) => {
  const [activePeriod, setActivePeriod] = useState('academic_year');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const handleSelectPeriod = (period: string) => {
    setActivePeriod(period);
    if (period !== 'custom') {
      onPeriodChange(period);
    }
  };

  const handleApplyCustom = () => {
    if (customStart && customEnd) {
      onPeriodChange('custom', customStart, customEnd);
    }
  };

  const totalRev = pnlData?.totalRevenue || 0;
  const totalExp = pnlData?.totalExpenses || 0;
  const netProfit = pnlData?.netProfit || totalRev - totalExp;
  const isProfit = netProfit >= 0;
  const marginPct = totalRev > 0 ? ((netProfit / totalRev) * 100).toFixed(1) : '0.0';

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 210, 8, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(schoolName || 'DUGSI PRO', 15, 22);

    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text("Baaqa Faa'iidada & Qasaaraha (Profit & Loss Statement)", 15, 30);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(
      `Xilliga: ${activePeriod.replace('_', ' ').toUpperCase()}  |  Taariikhda Daabacaadda: ${new Date().toLocaleDateString()}`,
      15,
      36
    );

    const rows: any[] = [];
    rows.push(['DAKHLIGA (REVENUE)', '']);
    Object.entries(pnlData?.revenueByCategory || {}).forEach(([cat, amt]) => {
      rows.push([`  ${cat}`, `${currency} ${Number(amt).toLocaleString()}`]);
    });
    rows.push([
      'WADARTA DAKHLIGA (TOTAL REVENUE)',
      `${currency} ${totalRev.toLocaleString()}`
    ]);
    rows.push(['', '']);
    rows.push(['KHARASHAADKA (EXPENSES)', '']);
    Object.entries(pnlData?.expensesByCategory || {}).forEach(([cat, amt]) => {
      rows.push([`  ${cat}`, `${currency} ${Number(amt).toLocaleString()}`]);
    });
    rows.push([
      'WADARTA KHARASHAADKA (TOTAL EXPENSES)',
      `${currency} ${totalExp.toLocaleString()}`
    ]);
    rows.push(['', '']);
    rows.push([
      "FAA'IIDADA SAUFIGA AH (NET PROFIT / LOSS)",
      `${currency} ${netProfit.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: 44,
      head: [['Qaybta (Particulars)', 'Cadadka (Amount)']],
      body: rows,
      headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    doc.save(`Profit_Loss_Statement_${activePeriod}.pdf`);
  };

  const exportExcel = () => {
    const data = [
      { Section: 'Revenue', Category: 'Total Revenue', Amount: totalRev },
      ...Object.entries(pnlData?.revenueByCategory || {}).map(([c, a]) => ({
        Section: 'Revenue',
        Category: c,
        Amount: a
      })),
      { Section: 'Expenses', Category: 'Total Expenses', Amount: totalExp },
      ...Object.entries(pnlData?.expensesByCategory || {}).map(([c, a]) => ({
        Section: 'Expenses',
        Category: c,
        Amount: a
      })),
      { Section: 'Summary', Category: 'Net Profit / Loss', Amount: netProfit }
    ];
    exportToExcel(`Profit_Loss_${activePeriod}`, 'P&L', data);
  };

  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'today', label: 'Maanta (Today)' },
            { id: 'this_week', label: 'Toddobaadkan (This Week)' },
            { id: 'this_month', label: 'Bishan (This Month)' },
            { id: 'this_term', label: 'Xilligan (This Term)' },
            { id: 'academic_year', label: 'Sanad-Dugsiyeedka (Academic Year)' },
            { id: 'custom', label: 'Custom Range' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSelectPeriod(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activePeriod === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={exportExcel}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Excel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={exportPDF}
            icon={<Printer className="w-3.5 h-3.5" />}
          >
            PDF Statement
          </Button>
        </div>
      </Card>

      {activePeriod === 'custom' && (
        <Card className="p-3.5 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-[var(--text-secondary)] font-medium">Laga bilaabo:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className={inputClass}
          />
          <span className="text-[var(--text-secondary)] font-medium">Ilaa:</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className={inputClass}
          />
          <Button variant="primary" size="sm" onClick={handleApplyCustom}>
            Raadi
          </Button>
        </Card>
      )}

      {/* KPI 3-Column Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Dakhliga Guud (Total Revenue)"
          value={formatMoney(totalRev, currency)}
          subtext="Fiiga ardayda, diiwaangelinta & dakhliyo kale"
          icon={ArrowUpRight}
          color="emerald"
        />

        <StatCard
          label="Kharashaadka Guud (Total Expenses)"
          value={formatMoney(totalExp, currency)}
          subtext="Mushahaar, kirada, internet, iyo agab"
          icon={ArrowDownRight}
          color="rose"
        />

        <StatCard
          label={`Faa'iidada Saufiga ah (Net Margin: ${marginPct}%)`}
          value={formatMoney(netProfit, currency)}
          subtext={
            isProfit
              ? "Xaaladda maaliyadeed waa faa'iido"
              : 'Kharashku wuu ka batay dakhliga'
          }
          icon={isProfit ? TrendingUp : TrendingDown}
          color={isProfit ? 'emerald' : 'rose'}
        />
      </div>

      {/* Side-by-Side Breakdown Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h3 className="text-sm font-bold tracking-tight text-emerald-500 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" />
              Qaybaha Dakhliga (Revenue Breakdown)
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-500">
              {formatMoney(totalRev, currency)}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {Object.entries(pnlData?.revenueByCategory || {}).length === 0 ? (
              <EmptyState
                title="Dakhli Ma Jiro"
                description="Wali dakhli ma jiro xilligan."
                className="py-6"
              />
            ) : (
              Object.entries(pnlData?.revenueByCategory || {}).map(
                ([cat, amt]: [string, any], idx) => {
                  const pct =
                    totalRev > 0 ? ((Number(amt) / totalRev) * 100).toFixed(1) : '0';
                  return (
                    <div
                      key={idx}
                      className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)] last:border-0"
                    >
                      <span className="text-[var(--text-primary)] font-medium">{cat}</span>
                      <div className="text-right">
                        <span className="font-mono font-bold text-[var(--text-primary)] block">
                          {formatMoney(amt, currency)}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">{pct}%</span>
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </Card>

        {/* Expenses Breakdown */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h3 className="text-sm font-bold tracking-tight text-rose-500 flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4" />
              Qaybaha Kharashka (Expenses Breakdown)
            </h3>
            <span className="text-xs font-mono font-bold text-rose-500">
              {formatMoney(totalExp, currency)}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {Object.entries(pnlData?.expensesByCategory || {}).length === 0 ? (
              <EmptyState
                title="Kharash Ma Jiro"
                description="Wali kharash ma jiro xilligan."
                className="py-6"
              />
            ) : (
              Object.entries(pnlData?.expensesByCategory || {}).map(
                ([cat, amt]: [string, any], idx) => {
                  const pct =
                    totalExp > 0 ? ((Number(amt) / totalExp) * 100).toFixed(1) : '0';
                  return (
                    <div
                      key={idx}
                      className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)] last:border-0"
                    >
                      <span className="text-[var(--text-primary)] font-medium">{cat}</span>
                      <div className="text-right">
                        <span className="font-mono font-bold text-[var(--text-primary)] block">
                          {formatMoney(amt, currency)}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">{pct}%</span>
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
