import type express from "express";
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
    const schoolId = getSchoolId(req);
    const authUser = getAuthenticatedUser(req, loadLocalDB);
    const db = loadLocalDB();

    if (authUser && (authUser.role === "teacher" || authUser.role === "staff" || authUser.role === "receptionist")) {
      const normalizedRole =
        authUser.role === "teacher"
          ? "Teacher"
          : authUser.role === "receptionist"
          ? "Receptionist"
          : "Staff";
      return {
        authorized: hasPermission(normalizedRole, requiredPermission),
        role: normalizedRole,
        schoolId
      };
    }

    const user = (db.users || []).find((u: any) => u.email.toLowerCase() === (authUser?.email || schoolId).toLowerCase());
    const role = user?.role || "School Admin";
    
    // School Admin, admin, and Super Admin always have full access
    if (role === "School Admin" || role === "Super Admin" || role === "Accountant" || role === "admin" || role === "accountant") {
      return { authorized: true, role, schoolId };
    }
    
    // Principal can view, but not necessarily edit all
    if (role === "Principal" && (requiredPermission.includes("view") || requiredPermission.includes("reports"))) {
      return { authorized: true, role, schoolId };
    }

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
      const invExists = (db.invoices || []).some((inv: any) => inv.id === f.id || inv.feeId === f.id);
      if (!invExists) {
        const student = (db.students || []).find((s: any) => s.id === f.studentId);
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
          const payExists = (db.payments || []).some((p: any) => p.invoiceId === f.id);
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
  const syncFinanceTableToSupabase = async (table: string, row: Record<string, any>) => {
    if (getUseLocalFallback() || !supabase) return;
    try {
      await supabase.from(table).upsert([row], { onConflict: "id" });
    } catch {
      // Resilient fallback if table is not yet provisioned
    }
  };

  const deleteFinanceRowFromSupabase = async (table: string, id: string, schoolId: string) => {
    if (getUseLocalFallback() || !supabase) return;
    try {
      await supabase.from(table).delete().eq("id", id).eq("school_id", schoolId);
    } catch {
      // Resilient fallback
    }
  };

  /* =========================================================================
     1. FEE STRUCTURES (CRUD)
     ========================================================================= */
  app.get("/api/fee-structures", async (req, res) => {
    const schoolId = getSchoolId(req);
    if (!getUseLocalFallback() && supabase) {
      try {
        const { data, error } = await supabase
          .from("dugsiga_fee_structures")
          .select("*")
          .eq("school_id", schoolId);
        if (!error && data && data.length > 0) {
          const formatted = data.map((fs: any) => ({
            id: fs.id,
            schoolId: fs.school_id,
            name: fs.name,
            category: fs.category || "Monthly Tuition",
            amount: Number(fs.amount) || 0,
            className: fs.class_name || "All Classes",
            academicYear: fs.academic_year || "2026-2027",
            term: fs.term || "All Terms",
            description: fs.description || "",
            createdAt: fs.created_at || ""
          }));
          return res.json(formatted);
        }
      } catch {}
    }
    const db = getEnsureDB();
    const list = (db.feeStructures || []).filter((fs: any) => fs.schoolId === schoolId);
    return res.json(list);
  });

  app.post("/api/fee-structures", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid qaabeynta khidmadaha (Forbidden)" });

    const body = req.body;
    if (!body.name || !body.amount) {
      return res.status(400).json({ error: "Magaca iyo cadadka khidmadda waa khasab" });
    }

    const db = getEnsureDB();
    const newStructure = {
      id: body.id || 'fs-' + Math.random().toString(36).substring(2, 11),
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
    await syncFinanceTableToSupabase("dugsiga_fee_structures", {
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
    });
    return res.status(201).json(newStructure);
  });

  app.put("/api/fee-structures/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid wax ka beddelka (Forbidden)" });

    const { id } = req.params;
    const db = getEnsureDB();
    const idx = (db.feeStructures || []).findIndex((fs: any) => fs.id === id && fs.schoolId === schoolId);
    if (idx === -1) return res.status(404).json({ error: "Fee structure not found" });

    db.feeStructures[idx] = { ...db.feeStructures[idx], ...req.body };
    saveLocalDB(db);
    const updated = db.feeStructures[idx];
    await syncFinanceTableToSupabase("dugsiga_fee_structures", {
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
    });
    return res.json(updated);
  });

  app.delete("/api/fee-structures/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid tirtirista (Forbidden)" });

    const { id } = req.params;
    const db = getEnsureDB();
    db.feeStructures = (db.feeStructures || []).filter((fs: any) => !(fs.id === id && fs.schoolId === schoolId));
    saveLocalDB(db);
    await deleteFinanceRowFromSupabase("dugsiga_fee_structures", id, schoolId);
    return res.json({ success: true });
  });

  /* =========================================================================
     2. INVOICES (Single, Bulk, Filters)
     ========================================================================= */
  app.get("/api/invoices", async (req, res) => {
    const schoolId = getSchoolId(req);
    syncLegacyFeesToInvoices(schoolId);

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

    const body = req.body;
    if (!body.studentId) return res.status(400).json({ error: "Ardaygu waa khasab (Student is required)" });

    const db = getEnsureDB();
    const student = (db.students || []).find((s: any) => s.id === body.studentId && s.schoolId === schoolId);
    if (!student) return res.status(404).json({ error: "Ardayga lama helin (Student not found)" });

    const invoiceId = body.id || 'inv-' + Math.random().toString(36).substring(2, 11);
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
    const feeExists = (db.fees || []).find((f: any) => f.id === invoiceId);
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
        paymentDate: newInvoice.issueDate,
        paymentMethod: body.paymentMethod || 'Cash',
        reference: body.paymentReference || 'INITIAL-PAY',
        receivedBy: 'Admin',
        notes: 'Initial payment upon invoice creation',
        createdAt: new Date().toISOString()
      });
    }

    saveLocalDB(db);
    await syncFinanceTableToSupabase("dugsiga_invoices", {
      id: newInvoice.id,
      school_id: schoolId,
      invoice_number: newInvoice.invoiceNumber,
      student_id: newInvoice.studentId,
      student_name: newInvoice.studentName,
      class_name: newInvoice.className,
      guardian_name: newInvoice.guardianName,
      guardian_phone: newInvoice.guardianPhone,
      items: newInvoice.items,
      subtotal: newInvoice.subtotal,
      discount: newInvoice.discount,
      total: newInvoice.total,
      paid_amount: newInvoice.paidAmount,
      balance: newInvoice.balance,
      issue_date: newInvoice.issueDate,
      due_date: newInvoice.dueDate,
      status: newInvoice.status,
      notes: newInvoice.notes,
      created_at: newInvoice.createdAt
    });
    return res.status(201).json(newInvoice);
  });

  // Bulk Invoice Generation
  app.post("/api/invoices/bulk", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid biilasha wadajirka ah (Forbidden)" });

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
    const feeIdx = (db.fees || []).findIndex((f: any) => f.id === id);
    if (feeIdx > -1) {
      db.fees[feeIdx] = {
        ...db.fees[feeIdx],
        amount: total,
        paidAmount,
        status: status.toLowerCase()
      };
    }

    saveLocalDB(db);
    const updatedInv = db.invoices[idx];
    await syncFinanceTableToSupabase("dugsiga_invoices", {
      id: updatedInv.id,
      school_id: schoolId,
      invoice_number: updatedInv.invoiceNumber,
      student_id: updatedInv.studentId,
      student_name: updatedInv.studentName,
      class_name: updatedInv.className,
      guardian_name: updatedInv.guardianName,
      guardian_phone: updatedInv.guardianPhone,
      items: updatedInv.items,
      subtotal: updatedInv.subtotal,
      discount: updatedInv.discount,
      total: updatedInv.total,
      paid_amount: updatedInv.paidAmount,
      balance: updatedInv.balance,
      issue_date: updatedInv.issueDate,
      due_date: updatedInv.dueDate,
      status: updatedInv.status,
      notes: updatedInv.notes,
      created_at: updatedInv.createdAt,
      updated_at: updatedInv.updatedAt
    });
    return res.json(updatedInv);
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid tirtirista (Forbidden)" });

    const { id } = req.params;
    const db = getEnsureDB();
    db.invoices = (db.invoices || []).filter((inv: any) => !(inv.id === id && inv.schoolId === schoolId));
    db.fees = (db.fees || []).filter((f: any) => !(f.id === id && f.schoolId === schoolId));
    saveLocalDB(db);
    await deleteFinanceRowFromSupabase("dugsiga_invoices", id, schoolId);
    return res.json({ success: true });
  });

  /* =========================================================================
     3. PAYMENTS & RECEIPTS (Full/Partial, Non-duplicate Revenue, WhatsApp)
     ========================================================================= */
  app.get("/api/payments", async (req, res) => {
    const schoolId = getSchoolId(req);
    syncLegacyFeesToInvoices(schoolId);

    const db = getEnsureDB();
    const payments = (db.payments || []).filter((p: any) => p.schoolId === schoolId);
    payments.sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    return res.json(payments);
  });

  app.post("/api/payments", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid qabashada lacagta (Forbidden)" });

    const body = req.body;
    const { invoiceId, amount, paymentMethod, reference, receivedBy, notes } = body;

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ error: "Fadlan geli cadad lacageed oo sax ah (Valid amount required)" });
    }

    const db = getEnsureDB();
    const invoiceIdx = (db.invoices || []).findIndex((inv: any) => inv.id === invoiceId && inv.schoolId === schoolId);
    if (invoiceIdx === -1) {
      return res.status(404).json({ error: "Biilka lama helin (Invoice not found)" });
    }

    const inv = db.invoices[invoiceIdx];
    const newPaidAmount = (Number(inv.paidAmount) || 0) + payAmount;
    const newBalance = Math.max(0, inv.total - newPaidAmount);
    const newStatus = newBalance === 0 ? 'Paid' : 'Partially Paid';

    // Update invoice
    db.invoices[invoiceIdx] = {
      ...inv,
      paidAmount: newPaidAmount,
      balance: newBalance,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };

    // Mirror to db.fees
    const feeIdx = (db.fees || []).findIndex((f: any) => f.id === invoiceId);
    if (feeIdx > -1) {
      db.fees[feeIdx].paidAmount = newPaidAmount;
      db.fees[feeIdx].status = newStatus.toLowerCase();
    }

    // Create Payment Transaction Record
    const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPayment = {
      id: 'pay-' + Math.random().toString(36).substring(2, 11),
      receiptNumber,
      schoolId,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      studentId: inv.studentId,
      studentName: inv.studentName,
      className: inv.className,
      amount: payAmount,
      paymentDate: body.paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: paymentMethod || 'Cash',
      reference: reference || 'TXN-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      receivedBy: receivedBy || 'Xisaabiyaha',
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    db.payments.unshift(newPayment);
    saveLocalDB(db);
    await syncFinanceTableToSupabase("dugsiga_payments", {
      id: newPayment.id,
      school_id: schoolId,
      receipt_number: newPayment.receiptNumber,
      invoice_id: newPayment.invoiceId,
      invoice_number: newPayment.invoiceNumber,
      student_id: newPayment.studentId,
      student_name: newPayment.studentName,
      class_name: newPayment.className,
      amount: newPayment.amount,
      payment_date: newPayment.paymentDate,
      payment_method: newPayment.paymentMethod,
      reference: newPayment.reference,
      remaining_balance: newBalance,
      received_by: newPayment.receivedBy,
      notes: newPayment.notes,
      created_at: newPayment.createdAt
    });
    await syncFinanceTableToSupabase("dugsiga_invoices", {
      id: inv.id,
      school_id: schoolId,
      invoice_number: inv.invoiceNumber,
      student_id: inv.studentId,
      student_name: inv.studentName,
      class_name: inv.className,
      guardian_name: inv.guardianName,
      guardian_phone: inv.guardianPhone,
      items: inv.items,
      subtotal: inv.subtotal,
      discount: inv.discount,
      total: inv.total,
      paid_amount: newPaidAmount,
      balance: newBalance,
      issue_date: inv.issueDate,
      due_date: inv.dueDate,
      status: newStatus,
      notes: inv.notes,
      created_at: inv.createdAt,
      updated_at: db.invoices[invoiceIdx].updatedAt
    });

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

    const body = req.body;
    if (!body.category || !body.description || !body.amount) {
      return res.status(400).json({ error: "Category, description, and amount are required" });
    }

    const db = getEnsureDB();
    const newExpense = {
      id: body.id || 'exp-' + Math.random().toString(36).substring(2, 11),
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
    await syncFinanceTableToSupabase("dugsiga_expenses", {
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
    });
    return res.status(201).json(newExpense);
  });

  app.put("/api/expenses/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid wax ka beddelka kharashka (Forbidden)" });

    const { id } = req.params;
    const db = getEnsureDB();
    const idx = (db.expenses || []).findIndex((e: any) => e.id === id && e.schoolId === schoolId);
    if (idx === -1) return res.status(404).json({ error: "Expense not found" });

    db.expenses[idx] = {
      ...db.expenses[idx],
      ...req.body,
      amount: req.body.amount !== undefined ? Number(req.body.amount) : db.expenses[idx].amount,
      updatedAt: new Date().toISOString()
    };

    saveLocalDB(db);
    const updatedExp = db.expenses[idx];
    await syncFinanceTableToSupabase("dugsiga_expenses", {
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
    });
    return res.json(updatedExp);
  });

  app.put("/api/expenses/:id/approve", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid oggolaanshaha kharashka (Forbidden)" });

    const { id } = req.params;
    const db = getEnsureDB();
    const idx = (db.expenses || []).findIndex((e: any) => e.id === id && e.schoolId === schoolId);
    if (idx === -1) return res.status(404).json({ error: "Expense not found" });

    db.expenses[idx].status = 'Approved';
    db.expenses[idx].updatedAt = new Date().toISOString();
    saveLocalDB(db);
    const approvedExp = db.expenses[idx];
    await syncFinanceTableToSupabase("dugsiga_expenses", {
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
    });
    return res.json(approvedExp);
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid tirtirista kharashka (Forbidden)" });

    const { id } = req.params;
    const db = getEnsureDB();
    db.expenses = (db.expenses || []).filter((e: any) => !(e.id === id && e.schoolId === schoolId));
    saveLocalDB(db);
    await deleteFinanceRowFromSupabase("dugsiga_expenses", id, schoolId);
    return res.json({ success: true });
  });

  /* =========================================================================
     5. INCOME / REVENUE MODULE (Centralized, No-Duplicate Tracking)
     ========================================================================= */
  app.get("/api/income", async (req, res) => {
    const schoolId = getSchoolId(req);
    syncLegacyFeesToInvoices(schoolId);

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

    const body = req.body;
    if (!body.category || !body.description || !body.amount) {
      return res.status(400).json({ error: "Category, description, and amount are required" });
    }

    const db = getEnsureDB();
    const newIncome = {
      id: body.id || 'inc-' + Math.random().toString(36).substring(2, 11),
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
    await syncFinanceTableToSupabase("dugsiga_income", {
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
    });
    return res.status(201).json(newIncome);
  });

  app.put("/api/income/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "Forbidden" });

    const { id } = req.params;
    const db = getEnsureDB();
    const idx = (db.income || []).findIndex((inc: any) => inc.id === id && inc.schoolId === schoolId);
    if (idx === -1) return res.status(404).json({ error: "Income record not found" });

    db.income[idx] = {
      ...db.income[idx],
      ...req.body,
      amount: req.body.amount !== undefined ? Number(req.body.amount) : db.income[idx].amount
    };

    saveLocalDB(db);
    const updatedInc = db.income[idx];
    await syncFinanceTableToSupabase("dugsiga_income", {
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
    });
    return res.json(updatedInc);
  });

  app.delete("/api/income/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "Forbidden" });

    const { id } = req.params;
    const db = getEnsureDB();
    db.income = (db.income || []).filter((inc: any) => !(inc.id === id && inc.schoolId === schoolId));
    saveLocalDB(db);
    await deleteFinanceRowFromSupabase("dugsiga_income", id, schoolId);
    return res.json({ success: true });
  });

  /* =========================================================================
     6. PAYROLL (Staff & Teachers, Gross & Net, Automatic Expense Integration)
     ========================================================================= */
  app.get("/api/payroll", async (req, res) => {
    const schoolId = getSchoolId(req);
    const db = getEnsureDB();
    const list = (db.payroll || []).filter((pr: any) => pr.schoolId === schoolId);
    list.sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    return res.json(list);
  });

  app.post("/api/payroll", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "U fasax ma tihid maaraynta mushahaarka (Forbidden)" });

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
      id: body.id || 'pr-' + Math.random().toString(36).substring(2, 11),
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
    await syncFinanceTableToSupabase("dugsiga_payroll", {
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
    });
    return res.status(201).json(newPayroll);
  });

  app.put("/api/payroll/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "Forbidden" });

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
      basicSalary,
      allowances,
      deductions,
      grossSalary,
      netSalary,
      updatedAt: new Date().toISOString()
    };

    saveLocalDB(db);
    return res.json(db.payroll[idx]);
  });

  // Mark Payroll as Paid
  app.put("/api/payroll/:id/pay", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "Forbidden" });

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

    const existingExpIdx = (db.expenses || []).findIndex((e: any) => e.payrollId === pr.id || e.id === expId);
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

    saveLocalDB(db);
    return res.json({ success: true, payroll: pr });
  });

  app.delete("/api/payroll/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "Forbidden" });

    const { id } = req.params;
    const db = getEnsureDB();
    const pr = (db.payroll || []).find((p: any) => p.id === id && p.schoolId === schoolId);
    if (pr?.expenseId) {
      db.expenses = (db.expenses || []).filter((e: any) => e.id !== pr.expenseId && e.payrollId !== id);
    }
    db.payroll = (db.payroll || []).filter((p: any) => !(p.id === id && p.schoolId === schoolId));
    saveLocalDB(db);
    return res.json({ success: true });
  });

  /* =========================================================================
     7. BUDGETS (Budget vs Actual, Planned vs Remaining)
     ========================================================================= */
  app.get("/api/budgets", async (req, res) => {
    const schoolId = getSchoolId(req);
    syncLegacyFeesToInvoices(schoolId);

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

    const body = req.body;
    if (!body.category || !body.plannedAmount) {
      return res.status(400).json({ error: "Category and plannedAmount required" });
    }

    const db = getEnsureDB();
    const newBudget = {
      id: body.id || 'bg-' + Math.random().toString(36).substring(2, 11),
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
    await syncFinanceTableToSupabase("dugsiga_budgets", {
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
    });
    return res.status(201).json(newBudget);
  });

  app.put("/api/budgets/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "Forbidden" });

    const { id } = req.params;
    const db = getEnsureDB();
    const idx = (db.budgets || []).findIndex((b: any) => b.id === id && b.schoolId === schoolId);
    if (idx === -1) return res.status(404).json({ error: "Budget not found" });

    db.budgets[idx] = {
      ...db.budgets[idx],
      ...req.body,
      plannedAmount: req.body.plannedAmount !== undefined ? Number(req.body.plannedAmount) : db.budgets[idx].plannedAmount
    };

    saveLocalDB(db);
    return res.json(db.budgets[idx]);
  });

  app.delete("/api/budgets/:id", async (req, res) => {
    const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");
    if (!authorized) return res.status(403).json({ error: "Forbidden" });

    const { id } = req.params;
    const db = getEnsureDB();
    db.budgets = (db.budgets || []).filter((b: any) => !(b.id === id && b.schoolId === schoolId));
    saveLocalDB(db);
    return res.json({ success: true });
  });

  /* =========================================================================
     8. PROFIT & LOSS REPORTING (Revenue - Expenses = Net Profit/Loss)
     ========================================================================= */
  app.get("/api/profit-loss", async (req, res) => {
    const schoolId = getSchoolId(req);
    syncLegacyFeesToInvoices(schoolId);

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
    syncLegacyFeesToInvoices(schoolId);

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
    syncLegacyFeesToInvoices(schoolId);

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
    syncLegacyFeesToInvoices(schoolId);

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
