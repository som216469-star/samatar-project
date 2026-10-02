import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Printer,
  Wallet
} from 'lucide-react';
import { formatMoney, exportToExcel } from './financeUtils';
import { Button, Card, EmptyState, StatCard } from '../../components/ui/primitives';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CashFlowViewProps {
  cashFlowData: any;
  currency: string;
  schoolName: string;
  onPeriodChange: (period: string) => void;
}

export const CashFlowView: React.FC<CashFlowViewProps> = ({
  cashFlowData,
  currency,
  schoolName,
  onPeriodChange
}) => {
  const [activePeriod, setActivePeriod] = useState('annual');

  const handlePeriodClick = (p: string) => {
    setActivePeriod(p);
    onPeriodChange(p);
  };

  const opening = cashFlowData?.openingBalance || 0;
  const inflow = cashFlowData?.totalInflows || 0;
  const outflow = cashFlowData?.totalOutflows || 0;
  const closing = cashFlowData?.closingBalance || opening + inflow - outflow;
  const netChange = cashFlowData?.netCashFlow || inflow - outflow;

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 210, 8, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(schoolName || 'DUGSI PRO', 15, 22);

    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text('Baaqa Socodka Lacagta (Cash Flow Statement)', 15, 30);

    const rows = [
      ['Baaqiga Hore (Opening Cash Balance)', `${currency} ${opening.toLocaleString()}`],
      ['Lacagta Soo Gashay (Cash Inflows)', `+ ${currency} ${inflow.toLocaleString()}`],
      ['Lacagta Baxday (Cash Outflows)', `- ${currency} ${outflow.toLocaleString()}`],
      ['Farqiga Socodka (Net Cash Flow)', `${currency} ${netChange.toLocaleString()}`],
      ['Baaqiga Xiritaanka (Closing Cash Balance)', `${currency} ${closing.toLocaleString()}`]
    ];

    autoTable(doc, {
      startY: 40,
      head: [['Qodobka (Particulars)', 'Cadadka (Amount)']],
      body: rows,
      headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    doc.save(`Cash_Flow_Statement_${activePeriod}.pdf`);
  };

  const exportExcel = () => {
    const data = [
      { Metric: 'Opening Balance', Amount: opening },
      { Metric: 'Cash Inflow', Amount: inflow },
      { Metric: 'Cash Outflow', Amount: outflow },
      { Metric: 'Net Cash Flow', Amount: netChange },
      { Metric: 'Closing Balance', Amount: closing }
    ];
    exportToExcel(`Cash_Flow_${activePeriod}`, 'CashFlow', data);
  };

  return (
    <div className="space-y-6">
      {/* Time Period Filter */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'daily', label: 'Maalinle (Daily)' },
            { id: 'weekly', label: 'Toddobaadle (Weekly)' },
            { id: 'monthly', label: 'Bille (Monthly)' },
            { id: 'term', label: 'Xillle (Term)' },
            { id: 'annual', label: 'Sanadle (Annual)' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handlePeriodClick(tab.id)}
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

      {/* 4 Cards Formula Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="1. Baaqiga Hore (Opening Balance)"
          value={formatMoney(opening, currency)}
          subtext="Bilowga xilligan"
          icon={Wallet}
          color="blue"
        />

        <StatCard
          label="2. Lacagta Soo Gashay (+)"
          value={formatMoney(inflow, currency)}
          subtext="Dakhliga & fiiga la qabtay"
          icon={ArrowUpRight}
          color="emerald"
        />

        <StatCard
          label="3. Lacagta Baxday (-)"
          value={formatMoney(outflow, currency)}
          subtext="Kharashaadka & mushahaarka"
          icon={ArrowDownRight}
          color="rose"
        />

        <StatCard
          label="4. Baaqiga Hada (Closing Balance)"
          value={formatMoney(closing, currency)}
          subtext={`Net Change: ${netChange >= 0 ? '+' : ''}${formatMoney(netChange, currency)}`}
          icon={Wallet}
          color="emerald"
        />
      </div>

      {/* Transaction Timeline / Recent Flow */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
          Dhaqdhaqaaqa Sanduuqa (Cash Activity Timeline)
        </h3>

        <div className="space-y-2.5">
          {(cashFlowData?.timeline || []).length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Dhaqdhaqaaq Ma Jiro"
              description="Wax dhaqdhaqaaq ah lagama helin muddadan."
              className="py-8"
            />
          ) : (
            (cashFlowData?.timeline || []).map((item: any, idx: number) => {
              const isInflow = item.type === 'Inflow';
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isInflow
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      {isInflow ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">
                        {item.description}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                        <span>{item.date}</span>
                        <span>•</span>
                        <span>{item.paymentMethod || 'Cash'}</span>
                        <span>•</span>
                        <span>{item.category || 'General'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono font-bold text-sm ${
                        isInflow ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {isInflow ? '+' : '-'}
                      {formatMoney(item.amount, currency)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
