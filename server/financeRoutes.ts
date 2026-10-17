import type express from "express";
import crypto from "crypto";
import { getAuthenticatedUser } from "./authSession.ts";

interface FinanceRouteHelpers {
  getSchoolId: (req: express.Request) => string;
  loadLocalDB: () => any;
  saveLocalDB: (db: any) => void;
  supabase: any;
  getUseLocalFallback: () => boolean;
  hasPermission: (role: string, requiredPermission: string) => boolean;
  handleSupabaseError: (res: any, error: any, context: string) => void;
}

export function registerFinanceRoutes(app: express.Express, helpers: FinanceRouteHelpers) {
  const {
    getSchoolId,
    loadLocalDB,
    saveLocalDB,
    supabase,
    getUseLocalFallback,
    hasPermission
  } = helpers;

  // Helper: check user role for finance operations using Zero-Trust session resolution
  const checkFinanceAuth = (req: express.Request, requiredPermission: string): { authorized: boolean; role: string; schoolId: string } => {
    // Authorization must use the verified session, never a stale role from the local JSON cache.
    const authUser = getAuthenticatedUser(req);
    const schoolId = getSchoolId(req);

    // Fail closed when the signed session or its tenant identity is missing.
    if (!authUser || !schoolId) {
      return { authorized: false, role: "unknown", schoolId };
    }

    const role = authUser.role.trim();
    if (!role) {
      return { authorized: false, role: "unknown", schoolId };
    }

    if (role === "teacher" || role === "staff" || role === "receptionist") {
      const normalizedRole =
        role === "teacher"
          ? "Teacher"
          : role === "receptionist"
          ? "Receptionist"
          : "Staff";
      return {
        authorized: hasPermission(normalizedRole, requiredPermission),
        role: normalizedRole,
        schoolId
      };
    }

    // Only recognized administrator/accounting roles receive finance access.
    if (
      role === "School Admin" ||
      role === "Super Admin" ||
      role === "Accountant" ||
      role === "admin" ||
      role === "accountant"
    ) {
      return { authorized: true, role, schoolId };
    }

    // Principal can view/report only.
    if (
      role === "Principal" &&
      (requiredPermission.includes("view") || requiredPermission.includes("reports"))
    ) {
      return { authorized: true, role, schoolId };
    }

    // Unknown roles fail closed instead of silently becoming School Admin.
    const authorized = hasPermission(role, requiredPermission);
    return { authorized, role, schoolId };
  };

  // Helper: ensure DB arrays exist
  const getEnsureDB = () => {
    const db = loadLocalDB();
    if (!db.feeStructures) db.feeStructures = [];
    if (!db.invoices) db.invoices = [];
    if (!db.payments) db.payments = [];
    if (!db.expenses) db.expenses = [];
    if (!db.income) db.income = [];
    if (!db.budgets) db.budgets = [];
    if (!db.payroll) db.payroll = [];
    if (!db.fees) db.fees = [];
    return db;
  };

  // Helper: auto-bridge legacy fees into invoices & payments
  const syncLegacyFeesToInvoices = (schoolId: string) => {
    const db = getEnsureDB();
    const schoolFees = (db.fees || []).filter((f: any) => f.schoolId === schoolId);
    let changed = false;

    for (const f of schoolFees) {
      const invExists = (db.invoices || []).some((inv: any) =>
        inv.schoolId === schoolId && (inv.id === f.id || inv.feeId === f.id)
      );
      if (!invExists) {
        const student = (db.students || []).find((s: any) => s.id === f.studentId && s.schoolId === schoolId);
        const feeAmount = Number(f.amount) || 50;
        const paidAmount = Number(f.paidAmount || (f.status === 'paid' ? feeAmount : 0));
        const balance = Math.max(0, feeAmount - paidAmount);
        const status = balance === 0 ? 'Paid' : (paidAmount > 0 ? 'Partially Paid' : 'Unpaid');
        const invNum = `INV-${f.year || '2026'}-${(f.month || 'SEP').substring(0, 3).toUpperCase()}-${f.id.substring(f.id.length - 4).toUpperCase()}`;

        const newInv = {
          id: f.id,
          feeId: f.id,
          schoolId,
          invoiceNumber: invNum,
          studentId: f.studentId,
          studentName: student?.fullName || 'Arday Dugsiga',
          className: student?.class || 'Fasalka 1aad',
          guardianName: student?.guardianName || 'Waalidka',
          guardianPhone: student?.guardianPhone || '',
          items: [
            {
              id: 'item-' + f.id,
              name: `Lacagta Bishan (${f.month} ${f.year})`,
              category: 'Monthly Tuition',
              amount: feeAmount
            }
          ],
          subtotal: feeAmount,
          discount: 0,
          total: feeAmount,
          paidAmount,
          balance,
          issueDate: f.createdAt ? f.createdAt.split('T')[0] : '2026-09-01',
          dueDate: `${f.year || '2026'}-09-28`,
          status,
          notes: 'Auto-bridged from existing school fees',
          createdAt: f.createdAt || new Date().toISOString()
        };

        db.invoices.push(newInv);
        changed = true;

        // If paid amount > 0, log a corresponding payment transaction if not exists
        if (paidAmount > 0) {
          const payExists = (db.payments || []).some((p: any) =>
            p.schoolId === schoolId && p.invoiceId === f.id
          );
          if (!payExists) {
            db.payments.push({
              id: 'pay-' + f.id,
              receiptNumber: `REC-${f.year || '2026'}-${f.id.substring(f.id.length - 4).toUpperCase()}`,
              schoolId,
              invoiceId: f.id,
              invoiceNumber: invNum,
              studentId: f.studentId,
              studentName: student?.fullName || 'Arday Dugsiga',
              className: student?.class || 'Fasalka 1aad',
              amount: paidAmount,
              paymentDate: f.createdAt ? f.createdAt.split('T')[0] : '2026-09-16',
              paymentMethod: 'Cash',
              reference: 'LEGACY-PAY-' + f.id.substring(f.id.length - 4),
              receivedBy: 'Xisaabiyaha Dugsiga',
              notes: 'Initial fee payment',
              createdAt: f.createdAt || new Date().toISOString()
            });
          }
        }
      }
    }

    if (changed) {
      saveLocalDB(db);
    }
  };

  // Helper: synchronize local finance collections with Supabase tables (Tables 21-27) when Cloud DB is active
  const syncFinanceRowsToSupabase = async (table: string, rows: Record<string, any>[]): Promise<boolean> => {
    if (getUseLocalFallback()) return true;
    if (!supabase) return false;
    if (rows.length === 0) return true;
    try {
      const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
      if (error) {
        console.error("Finance write failed:", { table, code: String(error.code || "UNKNOWN") });
        return false;
      }
      return true;
    } catch (error: any) {
      console.error("Finance write threw an error:", {
        table,
        message: String(error?.message || "unknown").slice(0, 160)
      });
      return false;
    }
  };

  const syncFinanceTableToSupabase = async (table: string, row: Record<string, any>): Promise<boolean> =>
    syncFinanceRowsToSupabase(table, [row]);

  const deleteFinanceRowFromSupabase = async (table: string, id: string, schoolId: string): Promise<boolean> => {
    if (getUseLocalFallback()) return true;
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) {
        console.error("Finance delete failed:", { table, code: String(error.code || "UNKNOWN") });
        return false;
      }
      return true;
    } catch (error: any) {
      console.error("Finance delete threw an error:", {
        table,
        message: String(error?.message || "unknown").slice(0, 160)
      });
      return false;
    }
  };

  type FinanceWriteOperation =
    | { action: "upsert"; table: string; rows: Record<string, any>[] }
    | { action: "delete"; table: string; ids: string[] };

  // Related finance writes go through one Postgres function so the full set commits or rolls back together.
  const syncFinanceTransaction = async (
    schoolId: string,
    operations: FinanceWriteOperation[]
  ): Promise<boolean> => {
    if (getUseLocalFallback()) return true;
    if (!supabase || !schoolId) return false;

    try {
      const { error } = await supabase.rpc("dugsiga_finance_transaction", {
        p_school_id: schoolId,
        p_operations: operations
      });
      if (error) {
        console.error("Atomic finance transaction failed:", {
          code: String(error.code || "UNKNOWN"),
          message: String(error.message || "unknown").slice(0, 160)
        });
        return false;
      }
      return true;
    } catch (error: any) {
      console.error("Atomic finance transaction threw an error:", {
        message: String(error?.message || "unknown").slice(0, 160)
      });
      return false;
    }
  };

  type FinanceCollection =
    | "feeStructures"
    | "invoices"
    | "payments"
    | "expenses"
    | "income"
    | "payroll"
    | "budgets"
    | "fees";

  const financeCollectionDefinitions: Record<FinanceCollection, {
    table: string;
    key: string;
    map: (row: any) => any;
  }> = {
    feeStructures: {
      table: "dugsiga_fee_structures",
      key: "feeStructures",
      map: (row) => ({
        id: row.id, schoolId: row.school_id, name: row.name,
        category: row.category || "Monthly Tuition", amount: Number(row.amount) || 0,
        className: row.class_name || "All Classes", academicYear: row.academic_year || "2026-2027",
        term: row.term || "All Terms", description: row.description || "", createdAt: row.created_at || ""
      })
    },
    invoices: {
      table: "dugsiga_invoices",
      key: "invoices",
      map: (row) => ({
        id: row.id, schoolId: row.school_id, feeId: row.fee_id || undefined,
        invoiceNumber: row.invoice_number, studentId: row.student_id,
        studentName: row.student_name || "", className: row.class_name || "",
        guardianName: row.guardian_name || "", guardianPhone: row.guardian_phone || "",
        items: Array.isArray(row.items) ? row.items : [],
        subtotal: Number(row.subtotal) || 0, discount: Number(row.discount) || 0,
        total: Number(row.total) || 0, paidAmount: Number(row.paid_amount) || 0,
        balance: Number(row.balance) || 0, issueDate: row.issue_date || "",
        dueDate: row.due_date || "", status: row.status || "Unpaid",
        notes: row.notes || "", createdAt: row.created_at || "", updatedAt: row.updated_at || ""
      })
    },
    payments: {
      table: "dugsiga_payments",
      key: "payments",
      map: (row) => ({
        id: row.id, schoolId: row.school_id, receiptNumber: row.receipt_number,
        invoiceId: row.invoice_id || "", invoiceNumber: row.invoice_number || "",
        studentId: row.student_id || "", studentName: row.student_name || "",
        className: row.class_name || "", amount: Number(row.amount) || 0,
        paymentDate: row.payment_date || "", paymentMethod: row.payment_method || "Cash",
        reference: row.reference || "", remainingBalance: Number(row.remaining_balance) || 0,
        receivedBy: row.received_by || "", notes: row.notes || "", createdAt: row.created_at || ""
      })
    },
    expenses: {
      table: "dugsiga_expenses",
      key: "expenses",
      map: (row) => ({
        id: row.id, schoolId: row.school_id, expenseId: row.expense_id || "",
        category: row.category || "", description: row.description || "",
        amount: Number(row.amount) || 0, date: row.date || "",
        paymentMethod: row.payment_method || "Cash", vendorPayee: row.vendor_payee || "",
        referenceNumber: row.reference_number || "", receiptDocument: row.receipt_document || "",
        createdBy: row.created_by || "", notes: row.notes || "", status: row.status || "Approved",
        payrollId: row.payroll_id || undefined, createdAt: row.created_at || "", updatedAt: row.updated_at || ""
      })
    },
    income: {
      table: "dugsiga_income",
      key: "income",
      map: (row) => ({
        id: row.id, schoolId: row.school_id, incomeId: row.income_id || "",
        category: row.category || "", description: row.description || "",
        amount: Number(row.amount) || 0, date: row.date || "",
        paymentMethod: row.payment_method || "Cash", reference: row.reference || "",
        payer: row.payer || "", notes: row.notes || "", createdBy: row.created_by || "",
        paymentId: row.payment_id || undefined, createdAt: row.created_at || ""
      })
    },
    payroll: {
      table: "dugsiga_payroll",
      key: "payroll",
      map: (row) => ({
        id: row.id, schoolId: row.school_id, employeeType: row.employee_type || "Teacher",
        employeeId: row.employee_id || "", employeeName: row.employee_name || "",
        roleOrDepartment: row.role_or_department || "", basicSalary: Number(row.basic_salary) || 0,
        allowances: Number(row.allowances) || 0, deductions: Number(row.deductions) || 0,
        grossSalary: Number(row.gross_salary) || 0, netSalary: Number(row.net_salary) || 0,
        paymentDate: row.payment_date || "", paymentMethod: row.payment_method || "Bank",
        payrollPeriod: row.payroll_period || "", status: row.status || "Draft",
        notes: row.notes || "", paidAt: row.paid_at || "", expenseId: row.expense_id || "",
        createdAt: row.created_at || "", updatedAt: row.updated_at || ""
      })
    },
    budgets: {
      table: "dugsiga_budgets",
      key: "budgets",
      map: (row) => ({
        id: row.id, schoolId: row.school_id, academicYear: row.academic_year || "2026-2027",
        period: row.period || "Annual", category: row.category || "", type: row.type || "Expense",
        plannedAmount: Number(row.planned_amount) || 0, actualAmount: Number(row.actual_amount) || 0,
        remainingAmount: Number(row.remaining_amount) || 0, variance: Number(row.variance) || 0,
        notes: row.notes || "", createdAt: row.created_at || ""
      })
    },
    fees: {
      table: "dugsiga_fees",
      key: "fees",
      map: (row) => ({
        id: row.id, schoolId: row.school_id, studentId: row.student_id,
        month: row.month, year: Number(row.year) || 0, amount: Number(row.amount) || 0,
        paidAmount: Number(row.paid_amount) || 0, status: row.status || "unpaid",
        createdAt: row.created_at || "", updatedAt: row.updated_at || "", history: row.history || []
      })
    }
  };

  const toSupabaseFinanceRow = (collection: FinanceCollection, row: any): Record<string, any> => {
    switch (collection) {
      case "feeStructures":
        return {
          id: row.id, school_id: row.schoolId, name: row.name, category: row.category,
          amount: row.amount, class_name: row.className, academic_year: row.academicYear,
          term: row.term, description: row.description, created_at: row.createdAt
        };
      case "invoices":
        return {
          id: row.id, school_id: row.schoolId, invoice_number: row.invoiceNumber,
          student_id: row.studentId, student_name: row.studentName, class_name: row.className,
          guardian_name: row.guardianName, guardian_phone: row.guardianPhone, items: row.items,
          subtotal: row.subtotal, discount: row.discount, total: row.total,
          paid_amount: row.paidAmount, balance: row.balance, issue_date: row.issueDate,
          due_date: row.dueDate, status: row.status, notes: row.notes,
          created_at: row.createdAt, updated_at: row.updatedAt || null
        };
      case "payments":
        return {
          id: row.id, school_id: row.schoolId, receipt_number: row.receiptNumber,
          invoice_id: row.invoiceId, invoice_number: row.invoiceNumber, student_id: row.studentId,
          student_name: row.studentName, class_name: row.className, amount: row.amount,
          payment_date: row.paymentDate, payment_method: row.paymentMethod,
          reference: row.reference, remaining_balance: row.remainingBalance ?? null,
          received_by: row.receivedBy, notes: row.notes, created_at: row.createdAt
        };
      case "expenses":
        return {
          id: row.id, school_id: row.schoolId, expense_id: row.expenseId, category: row.category,
          description: row.description, amount: row.amount, date: row.date,
          payment_method: row.paymentMethod, vendor_payee: row.vendorPayee,
          reference_number: row.referenceNumber, receipt_document: row.receiptDocument,
          created_by: row.createdBy, notes: row.notes, status: row.status,
          payroll_id: row.payrollId || null, created_at: row.createdAt, updated_at: row.updatedAt || null
        };
      case "income":
        return {
          id: row.id, school_id: row.schoolId, income_id: row.incomeId, category: row.category,
          description: row.description, amount: row.amount, date: row.date,
          payment_method: row.paymentMethod, reference: row.reference, payer: row.payer,
          notes: row.notes, created_by: row.createdBy, payment_id: row.paymentId || null,
          created_at: row.createdAt
        };
      case "payroll":
        return {
          id: row.id, school_id: row.schoolId, employee_type: row.employeeType,
          employee_id: row.employeeId, employee_name: row.employeeName,
          role_or_department: row.roleOrDepartment, basic_salary: row.basicSalary,
          allowances: row.allowances, deductions: row.deductions, gross_salary: row.grossSalary,
          net_salary: row.netSalary, payment_date: row.paymentDate, payment_method: row.paymentMethod,
          payroll_period: row.payrollPeriod, status: row.status, notes: row.notes,
          paid_at: row.paidAt || null, expense_id: row.expenseId || null,
          created_at: row.createdAt, updated_at: row.updatedAt || null
        };
      case "budgets":
        return {
          id: row.id, school_id: row.schoolId, academic_year: row.academicYear,
          period: row.period, category: row.category, type: row.type,
          planned_amount: row.plannedAmount, actual_amount: row.actualAmount,
          remaining_amount: row.remainingAmount, variance: row.variance,
          notes: row.notes, created_at: row.createdAt
        };
      case "fees":
        return {
          id: row.id, school_id: row.schoolId, student_id: row.studentId,
          month: row.month, year: row.year, amount: row.amount, paid_amount: row.paidAmount,
          status: row.status, created_at: row.createdAt, updated_at: row.updatedAt || null,
          history: row.history || []
        };
    }
  };

  // Cloud mode refreshes each school's finance cache from Supabase before reads or writes.
  // Empty cloud results are authoritative too; stale local rows are never used as a fallback.
  const refreshFinanceCollectionsFromSupabase = async (
    schoolId: string,
    collections: FinanceCollection[]
  ): Promise<boolean> => {
    if (!schoolId) return false;
    if (getUseLocalFallback()) return true;
    if (!supabase) return false;

    try {
      const fetched: Array<{ key: string; rows: any[] }> = [];
      for (const collection of Array.from(new Set(collections))) {
        const definition = financeCollectionDefinitions[collection];
        const { data, error } = await supabase
          .from(definition.table)
          .select("*")
          .eq("school_id", schoolId);
        if (error) {
          console.error("Finance read failed:", {
            table: definition.table,
            code: String(error.code || "UNKNOWN")
          });
          return false;
        }
        fetched.push({
          key: definition.key,
          rows: (data || []).map(definition.map)
        });
      }

      const db = getEnsureDB();
      for (const collection of fetched) {
        const current = Array.isArray(db[collection.key]) ? db[collection.key] : [];
        db[collection.key] = [
          ...current.filter((row: any) => row.schoolId !== schoolId),
          ...collection.rows
        ];
      }
      saveLocalDB(db);
      return true;
    } catch (error: any) {
      console.error("Finance refresh threw an error:", String(error?.message || "unknown").slice(0, 160));
      return false;
    }
  };

  const refreshFinanceOrFail = async (
    res: express.Response,
    schoolId: string,
    collections: FinanceCollection[]
  ): Promise<boolean> => {
    const refreshed = await refreshFinanceCollectionsFromSupabase(schoolId, collections);
    if (refreshed) return true;
    res.status(503).json({
      error: "Xogta maaliyadda lagama xaqiijin karin kaydka Supabase. Fadlan mar kale isku day.",
      code: "DATABASE_UNAVAILABLE"
    });
    return false;
  };

  /* =========================================================================
     1. FEE STRUCTURES (CRUD)
     ========================================================================= */
  app.get("/api/fee-structures", async (req, res) => {
    const schoolId = getSchoolId(req);
    if (!(await refreshFinanceOrFail(res, schoolId, ["feeStructures"]))) return;
    const db = getEnsureDB();
    const list = (db.feeStructures || []).filter((fs: any) => fs.schoolId === schoolId);
    return res.json(list);
  });

  app.post("/api/fee-structures", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid qaabeynta khidmadaha (Forbidden)" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["feeStructures"]))) return;

    const body = req.body;
    if (!body.name || !body.amount) {
      return res.status(400).json({ error: "Magaca iyo cadadka khidmadda waa khasab" });
    }

    const db = getEnsureDB();
    const newStructure = {
      id: 'fs-' + crypto.randomUUID(),
      schoolId,
      name: body.name.trim(),
      category: body.category || 'Monthly Tuition',
      amount: Number(body.amount) || 0,
      className: body.className || 'All Classes',
      academicYear: body.academicYear || '2026-2027',
      term: body.term || 'All Terms',
      description: body.description || '',
      createdAt: new Date().toISOString()
    };

    db.feeStructures.push(newStructure);
    saveLocalDB(db);
    if (!(await syncFinanceTableToSupabase("dugsiga_fee_structures", {
      id: newStructure.id,
      school_id: schoolId,
      name: newStructure.name,
      category: newStructure.category,
      amount: newStructure.amount,
      class_name: newStructure.className,
      academic_year: newStructure.academicYear,
      term: newStructure.term,
      description: newStructure.description,
      created_at: newStructure.createdAt
    }))) return res.status(503).json({ error: "Kaydinta maaliyadda way fashilantay; xogta lama xaqiijin karo. Fadlan mar kale isku day.", code: "DATABASE_UNAVAILABLE" });
    return res.status(201).json(newStructure);
  });

  app.put("/api/fee-structures/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid wax ka beddelka (Forbidden)" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["feeStructures"]))) return;

    const { id } = req.params;
    const db = getEnsureDB();
    const idx = (db.feeStructures || []).findIndex((fs: any) => fs.id === id && fs.schoolId === schoolId);
    if (idx === -1) return res.status(404).json({ error: "Fee structure not found" });

    const currentStructure = db.feeStructures[idx];
    db.feeStructures[idx] = {
      ...currentStructure,
      ...req.body,
      id: currentStructure.id,
      schoolId: currentStructure.schoolId
    };
    saveLocalDB(db);
    const updated = db.feeStructures[idx];
    if (!(await syncFinanceTableToSupabase("dugsiga_fee_structures", {
      id: updated.id,
      school_id: schoolId,
      name: updated.name,
      category: updated.category,
      amount: Number(updated.amount) || 0,
      class_name: updated.className,
      academic_year: updated.academicYear,
      term: updated.term,
      description: updated.description,
      created_at: updated.createdAt
    }))) return res.status(503).json({ error: "Kaydinta maaliyadda way fashilantay; xogta lama xaqiijin karo. Fadlan mar kale isku day.", code: "DATABASE_UNAVAILABLE" });
    return res.json(updated);
  });

  app.delete("/api/fee-structures/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid tirtirista (Forbidden)" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["feeStructures"]))) return;

    const { id } = req.params;
    const db = getEnsureDB();
    db.feeStructures = (db.feeStructures || []).filter((fs: any) => !(fs.id === id && fs.schoolId === schoolId));
    saveLocalDB(db);
    if (!(await deleteFinanceRowFromSupabase("dugsiga_fee_structures", id, schoolId))) return res.status(503).json({ error: "Kaydinta maaliyadda way fashilantay; xogta lama xaqiijin karo. Fadlan mar kale isku day.", code: "DATABASE_UNAVAILABLE" });
    return res.json({ success: true });
  });

  /* =========================================================================
     2. INVOICES (Single, Bulk, Filters)
     ========================================================================= */
  app.get("/api/invoices", async (req, res) => {
    const schoolId = getSchoolId(req);
    if (!(await refreshFinanceOrFail(res, schoolId, ["invoices","payments","fees"]))) return;
    if (getUseLocalFallback()) syncLegacyFeesToInvoices(schoolId);

    const db = getEnsureDB();
    let invoices = (db.invoices || []).filter((inv: any) => inv.schoolId === schoolId);

    const { status, class: className, studentId, search } = req.query;
    if (status && status !== 'All') {
      invoices = invoices.filter((inv: any) => inv.status?.toLowerCase() === (status as string).toLowerCase());
    }
    if (className && className !== 'All') {
      invoices = invoices.filter((inv: any) => inv.className === className);
    }
    if (studentId) {
      invoices = invoices.filter((inv: any) => inv.studentId === studentId);
    }
    if (search) {
      const q = (search as string).toLowerCase();
      invoices = invoices.filter((inv: any) => 
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.studentName && inv.studentName.toLowerCase().includes(q)) ||
        (inv.guardianPhone && inv.guardianPhone.includes(q))
      );
    }

    return res.json(invoices);
  });

  app.post("/api/invoices", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid abuurista biilasha (Forbidden)" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["invoices","payments","fees"]))) return;

    const body = req.body;
    if (!body.studentId) return res.status(400).json({ error: "Ardaygu waa khasab (Student is required)" });

    const db = getEnsureDB();
    const student = (db.students || []).find((s: any) => s.id === body.studentId && s.schoolId === schoolId);
    if (!student) return res.status(404).json({ error: "Ardayga lama helin (Student not found)" });

    const invoiceId = 'inv-' + crypto.randomUUID();
    const invoiceNumber = body.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const items = Array.isArray(body.items) && body.items.length > 0 
      ? body.items 
      : [{ id: 'item-1', name: body.title || 'Waxbarasho / Tuition', category: body.category || 'Monthly Tuition', amount: Number(body.amount) || 50 }];

    const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
    const discount = Number(body.discount) || 0;
    const total = Math.max(0, subtotal - discount);
    const paidAmount = Number(body.paidAmount) || 0;
    const balance = Math.max(0, total - paidAmount);
    const status = balance === 0 ? 'Paid' : (paidAmount > 0 ? 'Partially Paid' : (body.status || 'Unpaid'));

    const newInvoice = {
      id: invoiceId,
      invoiceNumber,
      schoolId,
      studentId: student.id,
      studentName: student.fullName,
      className: student.class,
      guardianName: student.guardianName || body.guardianName || 'Waalidka',
      guardianPhone: student.guardianPhone || body.guardianPhone || '',
      items,
      subtotal,
      discount,
      total,
      paidAmount,
      balance,
      issueDate: body.issueDate || new Date().toISOString().split('T')[0],
      dueDate: body.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status,
      notes: body.notes || '',
      createdAt: new Date().toISOString()
    };

    db.invoices.unshift(newInvoice);

    // Sync to db.fees for 100% backward compatibility
    const feeExists = (db.fees || []).find((f: any) => f.id === invoiceId && f.schoolId === schoolId);
    if (!feeExists) {
      db.fees.push({
        id: invoiceId,
        studentId: student.id,
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear(),
        amount: total,
        paidAmount,
        status: status.toLowerCase(),
        schoolId,
        createdAt: newInvoice.createdAt
      });
    }

    // If initial payment was made with invoice creation, record payment transaction
    if (paidAmount > 0) {
      const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      db.payments.unshift({
        id: 'pay-' + Math.random().toString(36).substring(2, 11),
        receiptNumber,
        schoolId,
        invoiceId,
        invoiceNumber,
        studentId: student.id,
        studentName: student.fullName,
        className: student.class,
        amount: paidAmount,
        remainingBalance: balance,
        paymentDate: newInvoice.issueDate,
        paymentMethod: body.paymentMethod || 'Cash',
        reference: body.paymentReference || 'INITIAL-PAY',
        receivedBy: 'Admin',
        notes: 'Initial payment upon invoice creation',
        createdAt: new Date().toISOString()
      });
    }

    const linkedFee = (db.fees || []).find((fee: any) => fee.id === invoiceId && fee.schoolId === schoolId);
    const initialPayment = paidAmount > 0
      ? (db.payments || []).find((payment: any) => payment.invoiceId === invoiceId && payment.schoolId === schoolId)
      : null;
    const operations: FinanceWriteOperation[] = [
      { action: "upsert", table: "dugsiga_invoices", rows: [toSupabaseFinanceRow("invoices", newInvoice)] },
      { action: "upsert", table: "dugsiga_fees", rows: linkedFee ? [toSupabaseFinanceRow("fees", linkedFee)] : [] },
      { action: "upsert", table: "dugsiga_payments", rows: initialPayment ? [toSupabaseFinanceRow("payments", initialPayment)] : [] }
    ];
    if (!(await syncFinanceTransaction(schoolId, operations))) {
      return res.status(503).json({
        error: "Biilka iyo diiwaannada la xiriira si wadajir ah looma kaydin karin. Fadlan dib u hubi xogta ka hor ku celinta codsiga.",
        code: "DATABASE_UNAVAILABLE"
      });
    }
    saveLocalDB(db);
    return res.status(201).json(newInvoice);
  });

  // Bulk Invoice Generation
  app.post("/api/invoices/bulk", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid biilasha wadajirka ah (Forbidden)" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["invoices","fees","feeStructures"]))) return;

    const { targetClass, feeStructureIds, month, year, dueDate, customAmount } = req.body;
    const db = getEnsureDB();

    let targetStudents = (db.students || []).filter((s: any) => s.schoolId === schoolId && s.status === 'active');
    if (targetClass && targetClass !== 'All') {
      targetStudents = targetStudents.filter((s: any) => s.class === targetClass);
    }

    if (targetStudents.length === 0) {
      return res.status(400).json({ error: "Arday firfircoon lagama helin fasalkan (No active students found)" });
    }

    // Resolve fee items
    const selectedStructures = (db.feeStructures || []).filter((fs: any) => 
      fs.schoolId === schoolId && (feeStructureIds || []).includes(fs.id)
    );

    let defaultItems = selectedStructures.map((fs: any) => ({
      id: fs.id,
      name: fs.name,
      category: fs.category,
      amount: fs.amount
    }));

    if (defaultItems.length === 0) {
      const amt = Number(customAmount) || 50;
      defaultItems = [{
        id: 'bulk-item-1',
        name: `Lacagta Waxbarashada (${month || 'September'} ${year || 2026})`,
        category: 'Monthly Tuition',
        amount: amt
      }];
    }

    const subtotal = defaultItems.reduce((sum: number, it: any) => sum + it.amount, 0);
    const createdInvoices: any[] = [];
    const issueDate = new Date().toISOString().split('T')[0];
    const resolvedDueDate = dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    for (const student of targetStudents) {
      // Check if student already has invoice for this month/year if monthly tuition
      const alreadyHasMonthly = (db.invoices || []).some((inv: any) => 
        inv.studentId === student.id && 
        inv.schoolId === schoolId &&
        inv.notes?.includes(`${month} ${year}`)
      );
      if (alreadyHasMonthly) continue;

      const invoiceId = 'inv-' + Math.random().toString(36).substring(2, 11);
      const invoiceNumber = `INV-${year || 2026}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newInv = {
        id: invoiceId,
        invoiceNumber,
        schoolId,
        studentId: student.id,
        studentName: student.fullName,
        className: student.class,
        guardianName: student.guardianName || 'Waalidka',
        guardianPhone: student.guardianPhone || '',
        items: defaultItems,
        subtotal,
        discount: 0,
        total: subtotal,
        paidAmount: 0,
        balance: subtotal,
        issueDate,
        dueDate: resolvedDueDate,
        status: 'Unpaid',
        notes: `Bulk generated for ${month || ''} ${year || ''}`,
        createdAt: new Date().toISOString()
      };

      db.invoices.push(newInv);
      createdInvoices.push(newInv);

      // Also mirror to db.fees
      db.fees.push({
        id: invoiceId,
        studentId: student.id,
        month: month || 'September',
        year: Number(year) || 2026,
        amount: subtotal,
        paidAmount: 0,
        status: 'unpaid',
        schoolId,
        createdAt: newInv.createdAt
      });
    }

    const createdIds = new Set(createdInvoices.map((invoice: any) => invoice.id));
    const linkedFees = (db.fees || []).filter((fee: any) => fee.schoolId === schoolId && createdIds.has(fee.id));
    if (!(await syncFinanceTransaction(schoolId, [
      {
        action: "upsert",
        table: "dugsiga_invoices",
        rows: createdInvoices.map((invoice: any) => toSupabaseFinanceRow("invoices", invoice))
      },
      {
        action: "upsert",
        table: "dugsiga_fees",
        rows: linkedFees.map((fee: any) => toSupabaseFinanceRow("fees", fee))
      }
    ]))) {
      return res.status(503).json({
        error: "Biilasha iyo diiwaannada khidmadaha lama wada kaydin karin. Fadlan hubi liiska ka hor ku celinta codsiga.",
        code: "DATABASE_UNAVAILABLE"
      });
    }
    saveLocalDB(db);

    return res.json({ 
      success: true, 
      count: createdInvoices.length, 
      message: `${createdInvoices.length} biilal ayaa si guul leh loo abuuray.` 
    });
  });

  app.put("/api/invoices/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid wax ka beddelka (Forbidden)" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["invoices","fees"]))) return;

    const { id } = req.params;
    const db = getEnsureDB();
    const idx = (db.invoices || []).findIndex((inv: any) => inv.id === id && inv.schoolId === schoolId);
    if (idx === -1) return res.status(404).json({ error: "Invoice not found" });

    const current = db.invoices[idx];
    const updates = req.body;

    const discount = updates.discount !== undefined ? Number(updates.discount) : current.discount;
    const items = updates.items || current.items;
    const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
    const total = Math.max(0, subtotal - discount);
    const paidAmount = updates.paidAmount !== undefined ? Number(updates.paidAmount) : current.paidAmount;
    const balance = Math.max(0, total - paidAmount);
    const status = updates.status || (balance === 0 ? 'Paid' : (paidAmount > 0 ? 'Partially Paid' : 'Unpaid'));

    db.invoices[idx] = {
      ...current,
      ...updates,
      id: current.id,
      schoolId: current.schoolId,
      feeId: current.feeId,
      createdAt: current.createdAt,
      items,
      subtotal,
      discount,
      total,
      paidAmount,
      balance,
      status,
      updatedAt: new Date().toISOString()
    };

    // Mirror to db.fees
    const feeIdx = (db.fees || []).findIndex((f: any) => f.id === id && f.schoolId === schoolId);
    if (feeIdx > -1) {
      db.fees[feeIdx] = {
        ...db.fees[feeIdx],
        amount: total,
        paidAmount,
        status: status.toLowerCase()
      };
    }

    const updatedInv = db.invoices[idx];
    const operations: FinanceWriteOperation[] = [
      { action: "upsert", table: "dugsiga_invoices", rows: [toSupabaseFinanceRow("invoices", updatedInv)] }
    ];
    if (feeIdx > -1) {
      operations.push({
        action: "upsert",
        table: "dugsiga_fees",
        rows: [toSupabaseFinanceRow("fees", db.fees[feeIdx])]
      });
    }
    if (!(await syncFinanceTransaction(schoolId, operations))) {
      return res.status(503).json({
        error: "Biilka iyo diiwaanka khidmadaha lama wada cusboonaysiin karin. Fadlan dib u hubi xogta.",
        code: "DATABASE_UNAVAILABLE"
      });
    }
    saveLocalDB(db);
    return res.json(updatedInv);
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid tirtirista (Forbidden)" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["invoices","fees"]))) return;

    const { id } = req.params;
    const db = getEnsureDB();
    if (!(await syncFinanceTransaction(schoolId, [
      { action: "delete", table: "dugsiga_invoices", ids: [id] },
      { action: "delete", table: "dugsiga_fees", ids: [id] }
    ]))) {
      return res.status(503).json({
        error: "Biilka iyo diiwaanka khidmadaha lama wada tirtiri karin.",
        code: "DATABASE_UNAVAILABLE"
      });
    }
    db.invoices = (db.invoices || []).filter((inv: any) => !(inv.id === id && inv.schoolId === schoolId));
    db.fees = (db.fees || []).filter((f: any) => !(f.id === id && f.schoolId === schoolId));
    saveLocalDB(db);
    return res.json({ success: true });
  });

  /* =========================================================================
     3. PAYMENTS & RECEIPTS (Full/Partial, Non-duplicate Revenue, WhatsApp)
     ========================================================================= */
  app.get("/api/payments", async (req, res) => {
    const schoolId = getSchoolId(req);
    if (!(await refreshFinanceOrFail(res, schoolId, ["payments","invoices","fees"]))) return;
    if (getUseLocalFallback()) syncLegacyFeesToInvoices(schoolId);

    const db = getEnsureDB();
    const payments = (db.payments || []).filter((p: any) => p.schoolId === schoolId);
    payments.sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    return res.json(payments);
  });

  app.post("/api/payments", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid qabashada lacagta (Forbidden)" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["invoices", "payments", "fees"]))) return;

    const body = req.body;
    const { invoiceId, amount, paymentMethod, reference, receivedBy, notes } = body;
    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ error: "Fadlan geli cadad lacageed oo sax ah (Valid amount required)" });
    }

    const db = getEnsureDB();
    const invoiceIdx = (db.invoices || []).findIndex((invoice: any) => invoice.id === invoiceId && invoice.schoolId === schoolId);
    if (invoiceIdx === -1) {
      return res.status(404).json({ error: "Biilka lama helin (Invoice not found)" });
    }

    const invoice = db.invoices[invoiceIdx];
    const createdAt = new Date().toISOString();
    const newPayment = {
      id: "pay-" + crypto.randomUUID(),
      receiptNumber: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      schoolId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      studentId: invoice.studentId,
      studentName: invoice.studentName,
      className: invoice.className,
      amount: payAmount,
      remainingBalance: null as number | null,
      paymentDate: body.paymentDate || new Date().toISOString().split("T")[0],
      paymentMethod: paymentMethod || "Cash",
      reference: reference || "TXN-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      receivedBy: receivedBy || "Xisaabiyaha",
      notes: notes || "",
      createdAt
    };

    if (!getUseLocalFallback()) {
      if (!supabase) {
        return res.status(503).json({
          error: "Kaydka Supabase lama heli karo; lacag-bixinta lama diiwaangelin.",
          code: "DATABASE_UNAVAILABLE"
        });
      }
      try {
        const { data, error } = await supabase.rpc("dugsiga_record_invoice_payment", {
          p_school_id: schoolId,
          p_invoice_id: invoice.id,
          p_payment: toSupabaseFinanceRow("payments", newPayment)
        });
        if (error || !data?.invoice || !data?.payment) {
          console.error("Atomic invoice payment failed:", {
            code: String(error?.code || "UNKNOWN"),
            message: String(error?.message || "RPC returned an incomplete result").slice(0, 160)
          });
          return res.status(503).json({
            error: "Lacag-bixinta iyo cusboonaysiinta biilka si wadajir ah looma kaydin karin. Fadlan hubi rasiidhada ka hor ku celinta codsiga.",
            code: "DATABASE_UNAVAILABLE"
          });
        }

        const savedInvoice = financeCollectionDefinitions.invoices.map(data.invoice);
        const savedPayment = financeCollectionDefinitions.payments.map(data.payment);
        const savedFee = data.fee ? financeCollectionDefinitions.fees.map(data.fee) : null;
        db.invoices[invoiceIdx] = savedInvoice;
        if (savedFee) {
          const feeIdx = (db.fees || []).findIndex((fee: any) => fee.id === savedFee.id && fee.schoolId === schoolId);
          if (feeIdx >= 0) db.fees[feeIdx] = savedFee;
          else db.fees.push(savedFee);
        }
        db.payments.unshift(savedPayment);
        saveLocalDB(db);
        return res.status(201).json({
          success: true,
          payment: savedPayment,
          invoice: savedInvoice
        });
      } catch (error: any) {
        console.error("Atomic invoice payment threw an error:", String(error?.message || "unknown").slice(0, 160));
        return res.status(503).json({
          error: "Lacag-bixinta lama xaqiijin karin kaydka Supabase. Fadlan dib u hubi ka hor ku celinta codsiga.",
          code: "DATABASE_UNAVAILABLE"
        });
      }
    }

    // Local-only fallback retains the previous behavior; cloud mode never uses this path.
    const newPaidAmount = (Number(invoice.paidAmount) || 0) + payAmount;
    const newBalance = Math.max(0, Number(invoice.total) - newPaidAmount);
    const newStatus = newBalance === 0 ? "Paid" : "Partially Paid";
    db.invoices[invoiceIdx] = {
      ...invoice,
      paidAmount: newPaidAmount,
      balance: newBalance,
      status: newStatus,
      updatedAt: createdAt
    };
    const feeIdx = (db.fees || []).findIndex((fee: any) => fee.id === invoiceId && fee.schoolId === schoolId);
    if (feeIdx >= 0) {
      db.fees[feeIdx].paidAmount = newPaidAmount;
      db.fees[feeIdx].status = newStatus.toLowerCase();
      db.fees[feeIdx].updatedAt = createdAt;
    }
    newPayment.remainingBalance = newBalance;
    db.payments.unshift(newPayment);
    saveLocalDB(db);
    return res.status(201).json({
      success: true,
      payment: newPayment,
      invoice: db.invoices[invoiceIdx]
    });
  });

  /* =========================================================================
     4. EXPENSES MODULE (CRUD, Categories, Status, PDF/Excel)
     ========================================================================= */
  app.get("/api/expenses", async (req, res) => {
    const schoolId = getSchoolId(req);
    if (!(await refreshFinanceOrFail(res, schoolId, ["expenses"]))) return;
    const db = getEnsureDB();
    let expenses = (db.expenses || []).filter((e: any) => e.schoolId === schoolId);

    const { category, status, paymentMethod, from, to, search } = req.query;
    if (category && category !== 'All') {
      expenses = expenses.filter((e: any) => e.category === category);
    }
    if (status && status !== 'All') {
      expenses = expenses.filter((e: any) => e.status?.toLowerCase() === (status as string).toLowerCase());
    }
    if (paymentMethod && paymentMethod !== 'All') {
      expenses = expenses.filter((e: any) => e.paymentMethod === paymentMethod);
    }
    if (from) {
      expenses = expenses.filter((e: any) => e.date >= (from as string));
    }
    if (to) {
      expenses = expenses.filter((e: any) => e.date <= (to as string));
    }
    if (search) {
      const q = (search as string).toLowerCase();
      expenses = expenses.filter((e: any) => 
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.vendorPayee && e.vendorPayee.toLowerCase().includes(q)) ||
        (e.referenceNumber && e.referenceNumber.toLowerCase().includes(q))
      );
    }

    expenses.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return res.json(expenses);
  });

  app.post("/api/expenses", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid diiwaangelinta kharashka (Forbidden)" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["expenses"]))) return;

    const body = req.body;
    if (!body.category || !body.description || !body.amount) {
      return res.status(400).json({ error: "Category, description, and amount are required" });
    }

    const db = getEnsureDB();
    const newExpense = {
      id: 'exp-' + crypto.randomUUID(),
      schoolId,
      expenseId: `EXP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      category: body.category,
      description: body.description.trim(),
      amount: Number(body.amount) || 0,
      date: body.date || new Date().toISOString().split('T')[0],
      paymentMethod: body.paymentMethod || 'Cash',
      vendorPayee: body.vendorPayee || 'General Payee',
      referenceNumber: body.referenceNumber || '',
      receiptDocument: body.receiptDocument || '',
      createdBy: body.createdBy || 'Admin',
      notes: body.notes || '',
      status: body.status || 'Paid',
      createdAt: new Date().toISOString()
    };

    db.expenses.unshift(newExpense);
    saveLocalDB(db);
    if (!(await syncFinanceTableToSupabase("dugsiga_expenses", {
      id: newExpense.id,
      school_id: schoolId,
      expense_id: newExpense.expenseId,
      category: newExpense.category,
      description: newExpense.description,
      amount: newExpense.amount,
      date: newExpense.date,
      payment_method: newExpense.paymentMethod,
      vendor_payee: newExpense.vendorPayee,
      reference_number: newExpense.referenceNumber,
      receipt_document: newExpense.receiptDocument,
      created_by: newExpense.createdBy,
      notes: newExpense.notes,
      status: newExpense.status,
      created_at: newExpense.createdAt
    }))) return res.status(503).json({ error: "Kaydinta maaliyadda way fashilantay; xogta lama xaqiijin karo. Fadlan mar kale isku day.", code: "DATABASE_UNAVAILABLE" });
    return res.status(201).json(newExpense);
  });

  app.put("/api/expenses/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid wax ka beddelka kharashka (Forbidden)" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["expenses"]))) return;

    const { id } = req.params;
    const db = getEnsureDB();
    const idx = (db.expenses || []).findIndex((e: any) => e.id === id && e.schoolId === schoolId);
    if (idx === -1) return res.status(404).json({ error: "Expense not found" });

    const currentExpense = db.expenses[idx];
    db.expenses[idx] = {
      ...currentExpense,
      ...req.body,
      id: currentExpense.id,
      schoolId: currentExpense.schoolId,
      createdAt: currentExpense.createdAt,
      amount: req.body.amount !== undefined ? Number(req.body.amount) : currentExpense.amount,
      updatedAt: new Date().toISOString()
    };

    saveLocalDB(db);
    const updatedExp = db.expenses[idx];
    if (!(await syncFinanceTableToSupabase("dugsiga_expenses", {
      id: updatedExp.id,
      school_id: schoolId,
      expense_id: updatedExp.expenseId,
      category: updatedExp.category,
      description: updatedExp.description,
      amount: updatedExp.amount,
      date: updatedExp.date,
      payment_method: updatedExp.paymentMethod,
      vendor_payee: updatedExp.vendorPayee,
      reference_number: updatedExp.referenceNumber,
      receipt_document: updatedExp.receiptDocument,
      created_by: updatedExp.createdBy,
      notes: updatedExp.notes,
      status: updatedExp.status,
      created_at: updatedExp.createdAt,
      updated_at: updatedExp.updatedAt
    }))) return res.status(503).json({ error: "Kaydinta maaliyadda way fashilantay; xogta lama xaqiijin karo. Fadlan mar kale isku day.", code: "DATABASE_UNAVAILABLE" });
    return res.json(updatedExp);
  });

  app.put("/api/expenses/:id/approve", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid oggolaanshaha kharashka (Forbidden)" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["expenses"]))) return;

    const { id } = req.params;
    const db = getEnsureDB();
    const idx = (db.expenses || []).findIndex((e: any) => e.id === id && e.schoolId === schoolId);
    if (idx === -1) return res.status(404).json({ error: "Expense not found" });

    db.expenses[idx].status = 'Approved';
    db.expenses[idx].updatedAt = new Date().toISOString();
    saveLocalDB(db);
    const approvedExp = db.expenses[idx];
    if (!(await syncFinanceTableToSupabase("dugsiga_expenses", {
      id: approvedExp.id,
      school_id: schoolId,
      expense_id: approvedExp.expenseId,
      category: approvedExp.category,
      description: approvedExp.description,
      amount: approvedExp.amount,
      date: approvedExp.date,
      payment_method: approvedExp.paymentMethod,
      vendor_payee: approvedExp.vendorPayee,
      reference_number: approvedExp.referenceNumber,
      receipt_document: approvedExp.receiptDocument,
      created_by: approvedExp.createdBy,
      notes: approvedExp.notes,
      status: approvedExp.status,
      created_at: approvedExp.createdAt,
      updated_at: approvedExp.updatedAt
    }))) return res.status(503).json({ error: "Kaydinta maaliyadda way fashilantay; xogta lama xaqiijin karo. Fadlan mar kale isku day.", code: "DATABASE_UNAVAILABLE" });
    return res.json(approvedExp);
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid tirtirista kharashka (Forbidden)" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["expenses"]))) return;

    const { id } = req.params;
    const db = getEnsureDB();
    db.expenses = (db.expenses || []).filter((e: any) => !(e.id === id && e.schoolId === schoolId));
    saveLocalDB(db);
    if (!(await deleteFinanceRowFromSupabase("dugsiga_expenses", id, schoolId))) return res.status(503).json({ error: "Kaydinta maaliyadda way fashilantay; xogta lama xaqiijin karo. Fadlan mar kale isku day.", code: "DATABASE_UNAVAILABLE" });
    return res.json({ success: true });
  });

  /* =========================================================================
     5. INCOME / REVENUE MODULE (Centralized, No-Duplicate Tracking)
     ========================================================================= */
  app.get("/api/income", async (req, res) => {
    const schoolId = getSchoolId(req);
    if (!(await refreshFinanceOrFail(res, schoolId, ["income","payments"]))) return;
    if (getUseLocalFallback()) syncLegacyFeesToInvoices(schoolId);

    const db = getEnsureDB();
    const standaloneIncome = (db.income || []).filter((inc: any) => inc.schoolId === schoolId);

    // Formatted student payment revenue stream
    const feeIncome = (db.payments || []).filter((p: any) => p.schoolId === schoolId).map((p: any) => ({
      id: p.id,
      incomeId: p.receiptNumber,
      category: 'Student Fees',
      description: `Student Fee: ${p.studentName} (${p.className}) - ${p.invoiceNumber}`,
      amount: p.amount,
      date: p.paymentDate,
      paymentMethod: p.paymentMethod,
      reference: p.reference,
      payer: p.studentName,
      notes: p.notes,
      createdBy: p.receivedBy,
      paymentId: p.id,
      createdAt: p.createdAt
    }));

    const combined = [...standaloneIncome, ...feeIncome];
    combined.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return res.json(combined);
  });

  app.post("/api/income", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid diiwaangelinta dakhliga (Forbidden)" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["income"]))) return;

    const body = req.body;
    if (!body.category || !body.description || !body.amount) {
      return res.status(400).json({ error: "Category, description, and amount are required" });
    }

    const db = getEnsureDB();
    const newIncome = {
      id: 'inc-' + crypto.randomUUID(),
      schoolId,
      incomeId: `INC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      category: body.category,
      description: body.description.trim(),
      amount: Number(body.amount) || 0,
      date: body.date || new Date().toISOString().split('T')[0],
      paymentMethod: body.paymentMethod || 'Cash',
      reference: body.reference || '',
      payer: body.payer || 'Anonymous Donor',
      notes: body.notes || '',
      createdBy: body.createdBy || 'Admin',
      createdAt: new Date().toISOString()
    };

    db.income.unshift(newIncome);
    saveLocalDB(db);
    if (!(await syncFinanceTableToSupabase("dugsiga_income", {
      id: newIncome.id,
      school_id: schoolId,
      income_id: newIncome.incomeId,
      category: newIncome.category,
      description: newIncome.description,
      amount: newIncome.amount,
      date: newIncome.date,
      payment_method: newIncome.paymentMethod,
      reference: newIncome.reference,
      payer: newIncome.payer,
      notes: newIncome.notes,
      created_by: newIncome.createdBy,
      created_at: newIncome.createdAt
    }))) return res.status(503).json({ error: "Kaydinta maaliyadda way fashilantay; xogta lama xaqiijin karo. Fadlan mar kale isku day.", code: "DATABASE_UNAVAILABLE" });
    return res.status(201).json(newIncome);
  });

  app.put("/api/income/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "Forbidden" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["income"]))) return;

    const { id } = req.params;
    const db = getEnsureDB();
    const idx = (db.income || []).findIndex((inc: any) => inc.id === id && inc.schoolId === schoolId);
    if (idx === -1) return res.status(404).json({ error: "Income record not found" });

    const currentIncome = db.income[idx];
    db.income[idx] = {
      ...currentIncome,
      ...req.body,
      id: currentIncome.id,
      schoolId: currentIncome.schoolId,
      createdAt: currentIncome.createdAt,
      amount: req.body.amount !== undefined ? Number(req.body.amount) : currentIncome.amount
    };

    saveLocalDB(db);
    const updatedInc = db.income[idx];
    if (!(await syncFinanceTableToSupabase("dugsiga_income", {
      id: updatedInc.id,
      school_id: schoolId,
      income_id: updatedInc.incomeId,
      category: updatedInc.category,
      description: updatedInc.description,
      amount: updatedInc.amount,
      date: updatedInc.date,
      payment_method: updatedInc.paymentMethod,
      reference: updatedInc.reference,
      payer: updatedInc.payer,
      notes: updatedInc.notes,
      created_by: updatedInc.createdBy,
      created_at: updatedInc.createdAt
    }))) return res.status(503).json({ error: "Kaydinta maaliyadda way fashilantay; xogta lama xaqiijin karo. Fadlan mar kale isku day.", code: "DATABASE_UNAVAILABLE" });
    return res.json(updatedInc);
  });

  app.delete("/api/income/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "Forbidden" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["income"]))) return;

    const { id } = req.params;
    const db = getEnsureDB();
    db.income = (db.income || []).filter((inc: any) => !(inc.id === id && inc.schoolId === schoolId));
    saveLocalDB(db);
    if (!(await deleteFinanceRowFromSupabase("dugsiga_income", id, schoolId))) return res.status(503).json({ error: "Kaydinta maaliyadda way fashilantay; xogta lama xaqiijin karo. Fadlan mar kale isku day.", code: "DATABASE_UNAVAILABLE" });
    return res.json({ success: true });
  });

  /* =========================================================================
     6. PAYROLL (Staff & Teachers, Gross & Net, Automatic Expense Integration)
     ========================================================================= */
  app.get("/api/payroll", async (req, res) => {
    const schoolId = getSchoolId(req);
    if (!(await refreshFinanceOrFail(res, schoolId, ["payroll","expenses"]))) return;
    const db = getEnsureDB();
    const list = (db.payroll || []).filter((pr: any) => pr.schoolId === schoolId);
    list.sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    return res.json(list);
  });

  app.post("/api/payroll", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid maaraynta mushahaarka (Forbidden)" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["payroll","expenses"]))) return;

    const body = req.body;
    if (!body.employeeId || !body.employeeName) {
      return res.status(400).json({ error: "Shaqaalaha waa khasab (Employee required)" });
    }

    const basicSalary = Number(body.basicSalary) || 0;
    const allowances = Number(body.allowances) || 0;
    const deductions = Number(body.deductions) || 0;
    const grossSalary = basicSalary + allowances;
    const netSalary = Math.max(0, grossSalary - deductions);

    const db = getEnsureDB();
    const newPayroll = {
      id: 'pr-' + crypto.randomUUID(),
      schoolId,
      employeeType: body.employeeType || 'Teacher',
      employeeId: body.employeeId,
      employeeName: body.employeeName,
      roleOrDepartment: body.roleOrDepartment || 'Teaching Staff',
      basicSalary,
      allowances,
      deductions,
      grossSalary,
      netSalary,
      paymentDate: body.paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: body.paymentMethod || 'Bank',
      payrollPeriod: body.payrollPeriod || 'September 2026',
      status: body.status || 'Draft',
      notes: body.notes || '',
      expenseId: '',
      paidAt: '',
      createdAt: new Date().toISOString()
    };

    // If created with status 'Paid', auto-link expense record
    if (newPayroll.status === 'Paid') {
      const expId = 'exp-pr-' + newPayroll.id;
      newPayroll.expenseId = expId;
      newPayroll.paidAt = new Date().toISOString();

      db.expenses.push({
        id: expId,
        schoolId,
        expenseId: `EXP-SAL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        category: 'Salaries',
        description: `Mushahar / Salary: ${newPayroll.employeeName} (${newPayroll.payrollPeriod})`,
        amount: netSalary,
        date: newPayroll.paymentDate,
        paymentMethod: newPayroll.paymentMethod,
        vendorPayee: newPayroll.employeeName,
        referenceNumber: 'PAYROLL-' + newPayroll.id.substring(newPayroll.id.length - 5).toUpperCase(),
        createdBy: 'Payroll System',
        notes: `Basic: $${basicSalary}, Allowances: $${allowances}, Deductions: $${deductions}`,
        status: 'Paid',
        payrollId: newPayroll.id,
        createdAt: new Date().toISOString()
      });
    }

    db.payroll.unshift(newPayroll);
    saveLocalDB(db);
    if (!(await syncFinanceTableToSupabase("dugsiga_payroll", {
      id: newPayroll.id,
      school_id: schoolId,
      employee_type: newPayroll.employeeType,
      employee_id: newPayroll.employeeId,
      employee_name: newPayroll.employeeName,
      role_or_department: newPayroll.roleOrDepartment,
      basic_salary: newPayroll.basicSalary,
      allowances: newPayroll.allowances,
      deductions: newPayroll.deductions,
      gross_salary: newPayroll.grossSalary,
      net_salary: newPayroll.netSalary,
      payment_date: newPayroll.paymentDate,
      payment_method: newPayroll.paymentMethod,
      payroll_period: newPayroll.payrollPeriod,
      status: newPayroll.status,
      notes: newPayroll.notes,
      paid_at: newPayroll.paidAt || null,
      expense_id: newPayroll.expenseId || null,
      created_at: newPayroll.createdAt
    }))) return res.status(503).json({ error: "Kaydinta maaliyadda way fashilantay; xogta lama xaqiijin karo. Fadlan mar kale isku day.", code: "DATABASE_UNAVAILABLE" });

    if (newPayroll.status === "Paid") {
      const linkedExpense = (db.expenses || []).find((expense: any) =>
        expense.schoolId === schoolId && expense.payrollId === newPayroll.id
      );
      if (linkedExpense && !(await syncFinanceTableToSupabase("dugsiga_expenses", toSupabaseFinanceRow("expenses", linkedExpense)))) {
        return res.status(503).json({ error: "Mushaharka waa la diiwaangeliyey, laakiin kharashka mushaharka lama waafajin karin.", code: "DATABASE_UNAVAILABLE" });
      }
    }
    return res.status(201).json(newPayroll);
  });

  app.put("/api/payroll/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "Forbidden" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["payroll","expenses"]))) return;

    const { id } = req.params;
    const db = getEnsureDB();
    const idx = (db.payroll || []).findIndex((pr: any) => pr.id === id && pr.schoolId === schoolId);
    if (idx === -1) return res.status(404).json({ error: "Payroll record not found" });

    const current = db.payroll[idx];
    const updates = req.body;
    const basicSalary = updates.basicSalary !== undefined ? Number(updates.basicSalary) : current.basicSalary;
    const allowances = updates.allowances !== undefined ? Number(updates.allowances) : current.allowances;
    const deductions = updates.deductions !== undefined ? Number(updates.deductions) : current.deductions;
    const grossSalary = basicSalary + allowances;
    const netSalary = Math.max(0, grossSalary - deductions);

    db.payroll[idx] = {
      ...current,
      ...updates,
      id: current.id,
      schoolId: current.schoolId,
      createdAt: current.createdAt,
      basicSalary,
      allowances,
      deductions,
      grossSalary,
      netSalary,
      updatedAt: new Date().toISOString()
    };

    saveLocalDB(db);

    if (!(await syncFinanceTableToSupabase("dugsiga_payroll", toSupabaseFinanceRow("payroll", db.payroll[idx])))) {
      return res.status(503).json({ error: "Cusboonaysiinta mushaharka lama kaydin karin Supabase.", code: "DATABASE_UNAVAILABLE" });
    }
    return res.json(db.payroll[idx]);
  });

  // Mark Payroll as Paid
  app.put("/api/payroll/:id/pay", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "Forbidden" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["payroll","expenses"]))) return;

    const { id } = req.params;
    const db = getEnsureDB();
    const idx = (db.payroll || []).findIndex((pr: any) => pr.id === id && pr.schoolId === schoolId);
    if (idx === -1) return res.status(404).json({ error: "Payroll record not found" });

    const pr = db.payroll[idx];
    pr.status = 'Paid';
    pr.paidAt = new Date().toISOString();

    // Auto-create or update linked expense record without double-counting
    const expId = pr.expenseId || ('exp-pr-' + pr.id);
    pr.expenseId = expId;

    const existingExpIdx = (db.expenses || []).findIndex((e: any) =>
      e.schoolId === schoolId && (e.payrollId === pr.id || e.id === expId)
    );
    const expRecord = {
      id: expId,
      schoolId,
      expenseId: `EXP-SAL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'Salaries',
      description: `Mushahar / Salary: ${pr.employeeName} (${pr.payrollPeriod})`,
      amount: pr.netSalary,
      date: pr.paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: pr.paymentMethod || 'Bank',
      vendorPayee: pr.employeeName,
      referenceNumber: 'PAYROLL-' + pr.id.substring(pr.id.length - 5).toUpperCase(),
      createdBy: 'Payroll System',
      notes: `Basic: $${pr.basicSalary}, Allowances: $${pr.allowances}, Deductions: $${pr.deductions}`,
      status: 'Paid',
      payrollId: pr.id,
      createdAt: new Date().toISOString()
    };

    if (existingExpIdx > -1) {
      db.expenses[existingExpIdx] = { ...db.expenses[existingExpIdx], ...expRecord };
    } else {
      db.expenses.unshift(expRecord);
    }

    pr.updatedAt = pr.paidAt;
    if (!(await syncFinanceTransaction(schoolId, [
      { action: "upsert", table: "dugsiga_payroll", rows: [toSupabaseFinanceRow("payroll", pr)] },
      { action: "upsert", table: "dugsiga_expenses", rows: [toSupabaseFinanceRow("expenses", expRecord)] }
    ]))) {
      return res.status(503).json({
        error: "Mushaharka iyo kharashkiisa si wadajir ah looma kaydin karin. Fadlan hubi diiwaannada ka hor ku celinta codsiga.",
        code: "DATABASE_UNAVAILABLE"
      });
    }
    saveLocalDB(db);
    return res.json({ success: true, payroll: pr });
  });

  app.delete("/api/payroll/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "Forbidden" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["payroll","expenses"]))) return;

    const { id } = req.params;
    const db = getEnsureDB();
    const pr = (db.payroll || []).find((p: any) => p.id === id && p.schoolId === schoolId);
    if (!pr) return res.status(404).json({ error: "Payroll record not found" });
    const operations: FinanceWriteOperation[] = [
      { action: "delete", table: "dugsiga_payroll", ids: [id] }
    ];
    if (pr.expenseId) {
      operations.push({ action: "delete", table: "dugsiga_expenses", ids: [pr.expenseId] });
    }
    if (!(await syncFinanceTransaction(schoolId, operations))) {
      return res.status(503).json({
        error: "Diiwaanka mushaharka iyo kharashkiisa lama wada tirtiri karin.",
        code: "DATABASE_UNAVAILABLE"
      });
    }
    if (pr.expenseId) {
      db.expenses = (db.expenses || []).filter((e: any) =>
        !(e.schoolId === schoolId && (e.id === pr.expenseId || e.payrollId === id))
      );
    }
    db.payroll = (db.payroll || []).filter((payroll: any) => !(payroll.id === id && payroll.schoolId === schoolId));
    saveLocalDB(db);
    return res.json({ success: true });
  });

  /* =========================================================================
     7. BUDGETS (Budget vs Actual, Planned vs Remaining)
     ========================================================================= */
  app.get("/api/budgets", async (req, res) => {
    const schoolId = getSchoolId(req);
    if (!(await refreshFinanceOrFail(res, schoolId, ["budgets","expenses","income","payments","invoices","payroll"]))) return;
    if (getUseLocalFallback()) syncLegacyFeesToInvoices(schoolId);

    const db = getEnsureDB();
    const budgets = (db.budgets || []).filter((b: any) => b.schoolId === schoolId);

    const allExpenses = (db.expenses || []).filter((e: any) => e.schoolId === schoolId && e.status === 'Paid');
    const allIncome = (db.income || []).filter((inc: any) => inc.schoolId === schoolId);
    const allPayments = (db.payments || []).filter((p: any) => p.schoolId === schoolId);

    // Compute live actual amounts
    const enrichedBudgets = budgets.map((b: any) => {
      let actual = 0;
      if (b.type === 'Expense') {
        actual = allExpenses
          .filter((e: any) => b.category === 'All' || e.category === b.category)
          .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
      } else {
        if (b.category === 'Student Fees') {
          actual = allPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        } else {
          actual = allIncome
            .filter((inc: any) => b.category === 'All' || inc.category === b.category)
            .reduce((sum: number, inc: any) => sum + (Number(inc.amount) || 0), 0);
        }
      }

      const planned = Number(b.plannedAmount) || 0;
      const remaining = planned - actual;
      const variance = planned > 0 ? Math.round(((actual - planned) / planned) * 100) : 0;

      return {
        ...b,
        actualAmount: actual,
        remainingAmount: remaining,
        variance
      };
    });

    return res.json(enrichedBudgets);
  });

  app.post("/api/budgets", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "Forbidden" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["budgets"]))) return;

    const body = req.body;
    if (!body.category || !body.plannedAmount) {
      return res.status(400).json({ error: "Category and plannedAmount required" });
    }

    const db = getEnsureDB();
    const newBudget = {
      id: 'bg-' + crypto.randomUUID(),
      schoolId,
      academicYear: body.academicYear || '2026-2027',
      period: body.period || 'Annual',
      category: body.category,
      type: body.type || 'Expense',
      plannedAmount: Number(body.plannedAmount) || 0,
      actualAmount: 0,
      remainingAmount: Number(body.plannedAmount) || 0,
      variance: 0,
      notes: body.notes || '',
      createdAt: new Date().toISOString()
    };

    db.budgets.push(newBudget);
    saveLocalDB(db);
    if (!(await syncFinanceTableToSupabase("dugsiga_budgets", {
      id: newBudget.id,
      school_id: schoolId,
      academic_year: newBudget.academicYear,
      period: newBudget.period,
      category: newBudget.category,
      type: newBudget.type,
      planned_amount: newBudget.plannedAmount,
      actual_amount: newBudget.actualAmount,
      remaining_amount: newBudget.remainingAmount,
      variance: newBudget.variance,
      notes: newBudget.notes,
      created_at: newBudget.createdAt
    }))) return res.status(503).json({ error: "Kaydinta maaliyadda way fashilantay; xogta lama xaqiijin karo. Fadlan mar kale isku day.", code: "DATABASE_UNAVAILABLE" });
    return res.status(201).json(newBudget);
  });

  app.put("/api/budgets/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "Forbidden" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["budgets"]))) return;

    const { id } = req.params;
    const db = getEnsureDB();
    const idx = (db.budgets || []).findIndex((b: any) => b.id === id && b.schoolId === schoolId);
    if (idx === -1) return res.status(404).json({ error: "Budget not found" });

    const currentBudget = db.budgets[idx];
    db.budgets[idx] = {
      ...currentBudget,
      ...req.body,
      id: currentBudget.id,
      schoolId: currentBudget.schoolId,
      createdAt: currentBudget.createdAt,
      plannedAmount: req.body.plannedAmount !== undefined ? Number(req.body.plannedAmount) : currentBudget.plannedAmount
    };

    saveLocalDB(db);

    if (!(await syncFinanceTableToSupabase("dugsiga_budgets", toSupabaseFinanceRow("budgets", db.budgets[idx])))) {
      return res.status(503).json({ error: "Cusboonaysiinta miisaaniyadda lama kaydin karin Supabase.", code: "DATABASE_UNAVAILABLE" });
    }
    return res.json(db.budgets[idx]);
  });

  app.delete("/api/budgets/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "Forbidden" });
    if (!(await refreshFinanceOrFail(res, schoolId, ["budgets"]))) return;

    const { id } = req.params;
    const db = getEnsureDB();
    db.budgets = (db.budgets || []).filter((b: any) => !(b.id === id && b.schoolId === schoolId));
    saveLocalDB(db);

    if (!(await deleteFinanceRowFromSupabase("dugsiga_budgets", id, schoolId))) {
      return res.status(503).json({ error: "Miisaaniyadda lagama tirtiri karin Supabase.", code: "DATABASE_UNAVAILABLE" });
    }
    return res.json({ success: true });
  });

  /* =========================================================================
     8. PROFIT & LOSS REPORTING (Revenue - Expenses = Net Profit/Loss)
     ========================================================================= */
  app.get("/api/profit-loss", async (req, res) => {
    const schoolId = getSchoolId(req);
    if (!(await refreshFinanceOrFail(res, schoolId, ["payments","income","expenses","invoices","fees"]))) return;
    if (getUseLocalFallback()) syncLegacyFeesToInvoices(schoolId);

    const db = getEnsureDB();
    const { period, from, to } = req.query;

    let startDate = from ? new Date(from as string) : new Date(new Date().getFullYear(), 0, 1);
    let endDate = to ? new Date(to as string) : new Date();

    if (period === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      startDate = new Date(todayStr);
      endDate = new Date(todayStr);
    } else if (period === 'week') {
      const now = new Date();
      startDate = new Date(now.setDate(now.getDate() - now.getDay()));
    } else if (period === 'month') {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Filter authoritative payment revenues
    const payments = (db.payments || []).filter((p: any) => 
      p.schoolId === schoolId && p.paymentDate >= startStr && p.paymentDate <= endStr
    );
    const standaloneIncome = (db.income || []).filter((inc: any) => 
      inc.schoolId === schoolId && inc.date >= startStr && inc.date <= endStr
    );

    // Revenue by category
    const revenueByCategory: Record<string, number> = {};
    let totalRevenue = 0;

    payments.forEach((p: any) => {
      const amt = Number(p.amount) || 0;
      totalRevenue += amt;
      revenueByCategory['Student Fees'] = (revenueByCategory['Student Fees'] || 0) + amt;
    });

    standaloneIncome.forEach((inc: any) => {
      const amt = Number(inc.amount) || 0;
      totalRevenue += amt;
      revenueByCategory[inc.category] = (revenueByCategory[inc.category] || 0) + amt;
    });

    // Filter paid expenses (includes payroll salaries without duplicate counting)
    const expenses = (db.expenses || []).filter((e: any) => 
      e.schoolId === schoolId && e.status === 'Paid' && e.date >= startStr && e.date <= endStr
    );

    const expensesByCategory: Record<string, number> = {};
    let totalExpenses = 0;

    expenses.forEach((e: any) => {
      const amt = Number(e.amount) || 0;
      totalExpenses += amt;
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + amt;
    });

    const netProfit = totalRevenue - totalExpenses;

    // Monthly trend for current year
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyTrend = months.map((m, idx) => {
      const monthPrefix = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
      const mRev = (db.payments || []).filter((p: any) => p.schoolId === schoolId && p.paymentDate?.startsWith(monthPrefix))
        .reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0) +
        (db.income || []).filter((inc: any) => inc.schoolId === schoolId && inc.date?.startsWith(monthPrefix))
        .reduce((s: number, inc: any) => s + (Number(inc.amount) || 0), 0);

      const mExp = (db.expenses || []).filter((e: any) => e.schoolId === schoolId && e.status === 'Paid' && e.date?.startsWith(monthPrefix))
        .reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);

      return {
        month: m,
        revenue: mRev,
        expenses: mExp,
        profit: mRev - mExp
      };
    });

    return res.json({
      period: (period as string) || 'Custom',
      from: startStr,
      to: endStr,
      totalRevenue,
      totalExpenses,
      netProfit,
      revenueByCategory,
      expensesByCategory,
      monthlyTrend
    });
  });

  /* =========================================================================
     9. CASH FLOW MANAGEMENT (Opening + Inflows - Outflows = Closing)
     ========================================================================= */
  app.get("/api/cash-flow", async (req, res) => {
    const schoolId = getSchoolId(req);
    if (!(await refreshFinanceOrFail(res, schoolId, ["payments","income","expenses","invoices","fees"]))) return;
    if (getUseLocalFallback()) syncLegacyFeesToInvoices(schoolId);

    const db = getEnsureDB();
    const openingBalance = Number(req.query.openingBalance) || 0;

    const payments = (db.payments || []).filter((p: any) => p.schoolId === schoolId);
    const standaloneIncome = (db.income || []).filter((inc: any) => inc.schoolId === schoolId);
    const expenses = (db.expenses || []).filter((e: any) => e.schoolId === schoolId && e.status === 'Paid');

    let totalInflows = 0;
    const inflowsByCategory: Record<string, number> = {};
    const timeline: any[] = [];

    payments.forEach((p: any) => {
      const amt = Number(p.amount) || 0;
      totalInflows += amt;
      inflowsByCategory['Student Fees'] = (inflowsByCategory['Student Fees'] || 0) + amt;
      timeline.push({
        date: p.paymentDate,
        type: 'inflow',
        amount: amt,
        description: `Student Payment: ${p.studentName} (${p.receiptNumber})`,
        method: p.paymentMethod
      });
    });

    standaloneIncome.forEach((inc: any) => {
      const amt = Number(inc.amount) || 0;
      totalInflows += amt;
      inflowsByCategory[inc.category] = (inflowsByCategory[inc.category] || 0) + amt;
      timeline.push({
        date: inc.date,
        type: 'inflow',
        amount: amt,
        description: `${inc.category}: ${inc.description}`,
        method: inc.paymentMethod
      });
    });

    let totalOutflows = 0;
    const outflowsByCategory: Record<string, number> = {};

    expenses.forEach((e: any) => {
      const amt = Number(e.amount) || 0;
      totalOutflows += amt;
      outflowsByCategory[e.category] = (outflowsByCategory[e.category] || 0) + amt;
      timeline.push({
        date: e.date,
        type: 'outflow',
        amount: amt,
        description: `${e.category}: ${e.description}`,
        method: e.paymentMethod
      });
    });

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const closingBalance = openingBalance + totalInflows - totalOutflows;

    return res.json({
      openingBalance,
      totalInflows,
      totalOutflows,
      closingBalance,
      inflowsByCategory,
      outflowsByCategory,
      timeline
    });
  });

  /* =========================================================================
     10. FINANCE DASHBOARD STATS (Aggregated Institutional Metrics)
     ========================================================================= */
  app.get("/api/finance/stats", async (req, res) => {
    const schoolId = getSchoolId(req);
    if (!(await refreshFinanceOrFail(res, schoolId, ["invoices","payments","expenses","income","payroll","budgets","fees"]))) return;
    if (getUseLocalFallback()) syncLegacyFeesToInvoices(schoolId);

    const db = getEnsureDB();
    const invoices = (db.invoices || []).filter((inv: any) => inv.schoolId === schoolId);
    const payments = (db.payments || []).filter((p: any) => p.schoolId === schoolId);
    const expenses = (db.expenses || []).filter((e: any) => e.schoolId === schoolId);
    const paidExpenses = expenses.filter((e: any) => e.status === 'Paid');
    const income = (db.income || []).filter((inc: any) => inc.schoolId === schoolId);
    const payroll = (db.payroll || []).filter((pr: any) => pr.schoolId === schoolId);

    const totalStudentFeePaid = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const totalStandaloneIncome = income.reduce((sum: number, inc: any) => sum + (Number(inc.amount) || 0), 0);
    const totalRevenue = totalStudentFeePaid + totalStandaloneIncome;

    const totalExpenses = paidExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    const totalOutstandingFees = invoices.reduce((sum: number, inv: any) => sum + (Number(inv.balance) || 0), 0);
    const paidInvoicesCount = invoices.filter((inv: any) => inv.status === 'Paid').length;
    const pendingInvoicesCount = invoices.filter((inv: any) => inv.status !== 'Paid' && inv.status !== 'Cancelled').length;

    const totalPayrollPaid = payroll.filter((p: any) => p.status === 'Paid').reduce((sum: number, p: any) => sum + (Number(p.netSalary) || 0), 0);
    const totalPayrollPending = payroll.filter((p: any) => p.status !== 'Paid').reduce((sum: number, p: any) => sum + (Number(p.netSalary) || 0), 0);

    return res.json({
      totalRevenue,
      totalExpenses,
      netProfit,
      totalOutstandingFees,
      paidInvoicesCount,
      pendingInvoicesCount,
      totalInvoicesCount: invoices.length,
      cashInflow: totalRevenue,
      cashOutflow: totalExpenses,
      closingCashBalance: totalRevenue - totalExpenses,
      payrollPaid: totalPayrollPaid,
      payrollPending: totalPayrollPending
    });
  });

  /* =========================================================================
     11. FINANCIAL REPORTS (Comprehensive Print/PDF/Excel Data Feeds)
     ========================================================================= */
  app.get("/api/financial-reports", async (req, res) => {
    const schoolId = getSchoolId(req);
    if (!(await refreshFinanceOrFail(res, schoolId, ["invoices","payments","expenses","income","payroll","budgets","fees"]))) return;
    if (getUseLocalFallback()) syncLegacyFeesToInvoices(schoolId);

    const db = getEnsureDB();
    const { type } = req.query;

    if (type === 'revenue') {
      const payments = (db.payments || []).filter((p: any) => p.schoolId === schoolId);
      const income = (db.income || []).filter((inc: any) => inc.schoolId === schoolId);
      return res.json({ payments, income });
    }

    if (type === 'expenses') {
      const expenses = (db.expenses || []).filter((e: any) => e.schoolId === schoolId);
      return res.json({ expenses });
    }

    if (type === 'payroll') {
      const payroll = (db.payroll || []).filter((pr: any) => pr.schoolId === schoolId);
      return res.json({ payroll });
    }

    if (type === 'fees') {
      const invoices = (db.invoices || []).filter((inv: any) => inv.schoolId === schoolId);
      return res.json({ invoices });
    }

    return res.json({ success: true });
  });
}
