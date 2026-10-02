import React from 'react';
import {
  FileText,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  Users
} from 'lucide-react';
import { exportToExcel } from './financeUtils';
import { Button, Card } from '../../components/ui/primitives';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FinancialReportsModuleProps {
  stats: any;
  pnlData: any;
  cashFlowData: any;
  invoices: any[];
  expenses: any[];
  incomeList: any[];
  payroll: any[];
  currency: string;
  schoolName: string;
}

export const FinancialReportsModule: React.FC<FinancialReportsModuleProps> = ({
  invoices,
  expenses,
  incomeList,
  payroll,
  currency,
  schoolName
}) => {
  const downloadRevenueReport = () => {
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'bold');
    doc.text(`${schoolName} - Warbixinta Dakhliga (Revenue Report)`, 14, 20);
    const rows = (incomeList || []).map((inc) => [
      inc.incomeId || inc.id,
      inc.category,
      inc.description,
      inc.payer || 'N/A',
      inc.date,
      `${currency} ${Number(inc.amount).toLocaleString()}`
    ]);
    autoTable(doc, {
      startY: 28,
      head: [['ID', 'Category', 'Description', 'Payer', 'Date', 'Amount']],
      body: rows
    });
    doc.save('Revenue_Report.pdf');
  };

  const downloadExpenseReport = () => {
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'bold');
    doc.text(`${schoolName} - Warbixinta Kharashaadka (Expense Report)`, 14, 20);
    const rows = (expenses || []).map((exp) => [
      exp.expenseId || exp.id,
      exp.category,
      exp.description,
      exp.vendorPayee || 'N/A',
      exp.date,
      exp.status,
      `${currency} ${Number(exp.amount).toLocaleString()}`
    ]);
    autoTable(doc, {
      startY: 28,
      head: [['ID', 'Category', 'Description', 'Vendor', 'Date', 'Status', 'Amount']],
      body: rows
    });
    doc.save('Expense_Report.pdf');
  };

  const downloadOutstandingFeesReport = () => {
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'bold');
    doc.text(
      `${schoolName} - Warbixinta Baaqiga Fiiga (Outstanding Fees Report)`,
      14,
      20
    );
    const unpaidInvoices = (invoices || []).filter((i) => i.balance > 0);
    const rows = unpaidInvoices.map((inv) => [
      inv.invoiceNumber,
      inv.studentName,
      inv.className,
      inv.dueDate,
      `${currency} ${Number(inv.total).toLocaleString()}`,
      `${currency} ${Number(inv.paidAmount).toLocaleString()}`,
      `${currency} ${Number(inv.balance).toLocaleString()}`
    ]);
    autoTable(doc, {
      startY: 28,
      head: [
        [
          'Invoice #',
          'Student',
          'Class',
          'Due Date',
          'Total',
          'Paid',
          'Outstanding'
        ]
      ],
      body: rows
    });
    doc.save('Outstanding_Fees_Report.pdf');
  };

  const downloadPayrollReport = () => {
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'bold');
    doc.text(
      `${schoolName} - Warbixinta Mushahaarka Shaqaalaha (Payroll Report)`,
      14,
      20
    );
    const rows = (payroll || []).map((p) => [
      p.employeeName,
      p.roleOrDepartment || p.employeeType,
      p.payrollPeriod,
      p.status,
      `${currency} ${Number(p.basicSalary).toLocaleString()}`,
      `${currency} ${Number(p.netSalary).toLocaleString()}`
    ]);
    autoTable(doc, {
      startY: 28,
      head: [['Employee', 'Role', 'Period', 'Status', 'Basic', 'Net Salary']],
      body: rows
    });
    doc.save('Payroll_Report.pdf');
  };

  const reportsList = [
    {
      title: 'Warbixinta Dakhliga (Revenue Report)',
      desc: 'Dhammaan ilaha dakhliga dugsiga: fiiga ardayda, deeqaha, iyo dakhliyada kale.',
      icon: TrendingUp,
      color: 'text-emerald-500 bg-emerald-500/10',
      pdfAction: downloadRevenueReport,
      excelAction: () => exportToExcel('Revenue_Report', 'Revenue', incomeList)
    },
    {
      title: 'Warbixinta Kharashaadka (Expense Report)',
      desc: 'Kharashaadka guud ee dugsiga loo kala saaray qaybaha, ganacsatada, iyo taariikhda.',
      icon: TrendingDown,
      color: 'text-rose-500 bg-rose-500/10',
      pdfAction: downloadExpenseReport,
      excelAction: () => exportToExcel('Expense_Report', 'Expenses', expenses)
    },
    {
      title: 'Warbixinta Fiiga Dhiman (Outstanding Fees)',
      desc: 'Liiska ardayda leh lacagaha baaqiga ah, fasalladooda, iyo xilliyada bixinta.',
      icon: FileText,
      color: 'text-amber-500 bg-amber-500/10',
      pdfAction: downloadOutstandingFeesReport,
      excelAction: () =>
        exportToExcel(
          'Outstanding_Fees',
          'Outstanding',
          invoices.filter((i) => i.balance > 0)
        )
    },
    {
      title: 'Warbixinta Mushahaarka (Payroll Report)',
      desc: 'Warbixin faahfaahsan oo ku saabsan mushahaarka macallimiinta iyo shaqaalaha maamulka.',
      icon: Users,
      color: 'text-blue-500 bg-blue-500/10',
      pdfAction: downloadPayrollReport,
      excelAction: () => exportToExcel('Payroll_Report', 'Payroll', payroll)
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h2 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
          Xarunta Warbixinnada Maaliyadda (Financial Reports Center)
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          Soo dejiso ama daabac warbixinnada rasmiga ah qaab PDF ama Excel ah
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportsList.map((rep, idx) => {
          const Icon = rep.icon;
          return (
            <Card key={idx} className="p-5 space-y-4 flex flex-col justify-between">
              <div className="flex items-start gap-3.5">
                <div className={`p-3 rounded-xl border border-[var(--border-subtle)] ${rep.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {rep.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                    {rep.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={rep.pdfAction}
                  icon={<Printer className="w-3.5 h-3.5" />}
                  className="flex-1 justify-center"
                >
                  PDF Report
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={rep.excelAction}
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Excel
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
