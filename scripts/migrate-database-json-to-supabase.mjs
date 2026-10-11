#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const applying = process.argv.includes("--apply");
const sourceArg = process.argv.find((arg) => arg.startsWith("--source="))?.slice("--source=".length);
const sourcePath = path.resolve(sourceArg || process.env.LOCAL_JSON_MIGRATION_SOURCE || "database.json");
const batchReadSize = 1000;

const definitions = [
  { collection: "users", table: "dugsiga_users", keys: ["email"], columns: ["email","password","verified","role","school_id","teacher_id","verification_code","created_at"] },
  { collection: "students", table: "dugsiga_students", keys: ["id"], columns: ["id","school_id","full_name","gender","phone","class","status","photo","date_of_birth","address","guardian_name","guardian_relationship","guardian_phone","guardian_phone_alt","emergency_contact","section","roll_number","national_id","previous_school","blood_group","medical_notes","created_at","updated_at"] },
  { collection: "attendance", table: "dugsiga_attendance", keys: ["date","student_id","session_type"], columns: ["school_id","date","student_id","status","timestamp","session_type"] },
  { collection: "fees", table: "dugsiga_fees", keys: ["id"], columns: ["id","school_id","student_id","month","year","amount","paid_amount","status","created_at","updated_at","history"] },
  { collection: "classes", table: "dugsiga_classes", keys: ["id"], columns: ["id","school_id","class_name","teacher_name","room_number","description","section","capacity","academic_year","status","created_at"] },
  { collection: "subjects", table: "dugsiga_subjects", keys: ["id"], columns: ["id","school_id","subject_name","subject_code","class_name","teacher_name","category","description","pass_marks","max_marks","status","created_at"] },
  { collection: "examScores", table: "dugsiga_exam_scores", keys: ["id"], columns: ["id","school_id","student_id","student_name","class_name","subject_name","exam_name","term","max_marks","marks_obtained","grade","exam_date","created_at"] },
  { collection: "studentAudit", table: "dugsiga_student_audit", keys: ["id"], columns: ["id","school_id","student_id","action","actor_email","actor_role","changed_fields","before_data","after_data","created_at"] },
  { collection: "teachers", table: "dugsiga_teachers", keys: ["id"], columns: ["id","school_id","teacher_id","name","photo","gender","date_of_birth","phone","email","address","qualification","specialization","hire_date","employment_status","salary","emergency_contact","notes","assigned_classes","assigned_subjects","status","invitation_token","invitation_expires_at","invitation_sent_at","activated_at","created_at"] },
  { collection: "staff", table: "dugsiga_staff", keys: ["id"], columns: ["id","school_id","employee_id","name","role","department","phone","email","hire_date","salary","employment_status","notes","created_at"] },
  { collection: "guardians", table: "dugsiga_guardians", keys: ["id"], columns: ["id","school_id","guardian_id","name","relationship","phone","whatsapp","email","address","occupation","emergency_contact","student_ids","notes","created_at"] },
  { collection: "staffAttendance", table: "dugsiga_staff_attendance", keys: ["id"], columns: ["id","school_id","staff_id","staff_name","role","date","status","timestamp","notes"] },
  { collection: "timetable", table: "dugsiga_timetable", keys: ["id"], columns: ["id","school_id","academic_year","term","class_name","teacher_name","subject_name","room_number","day","start_time","end_time"] },
  { collection: "admissions", table: "dugsiga_admissions", keys: ["id"], columns: ["id","school_id","applicant_name","gender","date_of_birth","desired_class","guardian_name","guardian_phone","guardian_relationship","admission_date","status","notes","student_id","created_at"] },
  { collection: "announcements", table: "dugsiga_announcements", keys: ["id"], columns: ["id","school_id","title","message","audience","target_class","author","priority","status","publish_date","expiry_date","created_at"] },
  { collection: "libraryBooks", table: "dugsiga_library_books", keys: ["id"], columns: ["id","school_id","isbn","title","author","category","total_copies","available_copies","location","created_at"] },
  { collection: "libraryLoans", table: "dugsiga_library_loans", keys: ["id"], columns: ["id","school_id","book_id","book_title","borrower_type","borrower_id","borrower_name","issue_date","due_date","return_date","status"] },
  { collection: "inventory", table: "dugsiga_inventory", keys: ["id"], columns: ["id","school_id","item_name","category","quantity","location","condition","purchase_date","purchase_cost","assigned_to","status","notes"] },
  { collection: "documents", table: "dugsiga_documents", keys: ["id"], columns: ["id","school_id","title","category","related_id","related_name","file_type","file_size","file_url","upload_date","notes"] },
  { collection: "notifications", table: "dugsiga_notifications", keys: ["id"], columns: ["id","school_id","title","message","channel","recipient","recipient_name","status","created_at"] },
  { collection: "feeStructures", table: "dugsiga_fee_structures", keys: ["id"], columns: ["id","school_id","name","category","amount","class_name","academic_year","term","description","created_at"] },
  { collection: "invoices", table: "dugsiga_invoices", keys: ["id"], columns: ["id","school_id","invoice_number","student_id","student_name","class_name","guardian_name","guardian_phone","items","subtotal","discount","total","paid_amount","balance","issue_date","due_date","status","notes","created_at","updated_at"] },
  { collection: "payments", table: "dugsiga_payments", keys: ["id"], columns: ["id","school_id","receipt_number","invoice_id","invoice_number","student_id","student_name","class_name","amount","payment_date","payment_method","reference","remaining_balance","received_by","notes","created_at"] },
  { collection: "expenses", table: "dugsiga_expenses", keys: ["id"], columns: ["id","school_id","expense_id","category","description","amount","date","payment_method","vendor_payee","reference_number","receipt_document","created_by","notes","status","payroll_id","created_at","updated_at"] },
  { collection: "income", table: "dugsiga_income", keys: ["id"], columns: ["id","school_id","income_id","category","description","amount","date","payment_method","reference","payer","notes","created_by","payment_id","created_at"] },
  { collection: "budgets", table: "dugsiga_budgets", keys: ["id"], columns: ["id","school_id","academic_year","period","category","type","planned_amount","actual_amount","remaining_amount","variance","notes","created_at"] },
  { collection: "payroll", table: "dugsiga_payroll", keys: ["id"], columns: ["id","school_id","employee_type","employee_id","employee_name","role_or_department","basic_salary","allowances","deductions","gross_salary","net_salary","payment_date","payment_method","payroll_period","status","notes","paid_at","expense_id","created_at","updated_at"] }
];

function fail(message) {
  console.error(`Migration stopped: ${message}`);
  process.exitCode = 1;
}

function toSnakeCase(key) {
  return key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

function prepareRow(definition, source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return { error: "record is not an object" };
  }

  const schoolId = String(source.schoolId ?? source.school_id ?? "").trim();
  if (!schoolId) return { error: "missing school_id; tenant cannot be safely inferred" };

  const row = {};
  for (const [key, value] of Object.entries(source)) {
    let column = toSnakeCase(key);
    if (definition.table === "dugsiga_users" && key === "password_hash") column = "password";
    if (definition.table === "dugsiga_users" && key === "passwordHash") column = "password";
    if (definition.columns.includes(column) && value !== undefined) row[column] = value;
  }
  row.school_id = schoolId;

  if (definition.table === "dugsiga_users") {
    row.email = String(source.email || "").trim().toLowerCase();
    if (!row.email) return { error: "user is missing email" };
    if (source.password_hash !== undefined) row.password = source.password_hash;
    if (source.password !== undefined) row.password = source.password;
  } else if (definition.table === "dugsiga_students") {
    row.full_name = String(source.fullName ?? source.full_name ?? "").trim();
  }

  if (definition.table === "dugsiga_attendance") {
    row.date = source.date;
    row.student_id = source.studentId ?? source.student_id;
    row.session_type = source.sessionType ?? source.session_type ?? "before_break";
  }
  if (definition.table === "dugsiga_student_audit") {
    row.changed_fields = source.changedFields ?? source.changed_fields ?? [];
    row.before_data = source.beforeData ?? source.before_data ?? null;
    row.after_data = source.afterData ?? source.after_data ?? null;
  }

  for (const key of definition.keys) {
    if (row[key] === undefined || row[key] === null || String(row[key]).trim() === "") {
      return { error: `missing primary key ${key}` };
    }
  }
  return { row, schoolId };
}

function keyOf(row, keys) {
  return keys.map((key) => String(row[key] ?? "")).join("\u001f");
}

async function fetchExistingKeys(supabase, definition, schoolId) {
  const set = new Set();
  let offset = 0;
  while (true) {
    let query = supabase.from(definition.table).select(definition.keys.join(",")).eq("school_id", schoolId);
    const { data, error } = await query.range(offset, offset + batchReadSize - 1);
    if (error) throw new Error(`Could not inspect ${definition.table} for school ${schoolId}: ${error.message}`);
    for (const row of data || []) set.add(keyOf(row, definition.keys));
    if (!data || data.length < batchReadSize) break;
    offset += batchReadSize;
  }
  return set;
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("Safe JSON-to-Supabase migration. Default is dry-run; pass --apply to insert missing rows only. Optional: --source=/path/to/database.json");
    return;
  }

  if (!fs.existsSync(sourcePath)) {
    fail(`source file not found: ${sourcePath}. Keep database.json unchanged and supply the correct path with --source.`);
    return;
  }

  const url = (process.env.SUPABASE_URL || "").trim().replace(/^["']|["']$/g, "");
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (!url || !key) {
    fail("SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required.");
    return;
  }

  let sourceDB;
  try {
    sourceDB = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  } catch (error) {
    fail(`could not parse JSON: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const report = { source: sourcePath, mode: applying ? "APPLY (insert only)" : "DRY RUN (no writes)", inserted: 0, existing: 0, skipped: 0, failed: 0, byTable: {} };
  console.log(`Source: ${sourcePath}`);
  console.log(`Target: ${new URL(url).host}`);
  console.log(`Mode: ${report.mode}`);
  console.log("The source file will not be modified. Existing Supabase rows are never upserted or overwritten.");

  for (const definition of definitions) {
    let rawRows = Array.isArray(sourceDB[definition.collection]) ? sourceDB[definition.collection] : [];
    if (definition.table === "dugsiga_student_audit") rawRows = rawRows.filter((row) => row && (row.schoolId || row.school_id));
    const counts = { candidates: 0, existing: 0, inserted: 0, skipped: 0, failed: 0 };
    report.byTable[definition.table] = counts;
    if (!rawRows.length) continue;

    const prepared = [];
    const sourceKeys = new Set();
    for (const raw of rawRows) {
      const result = prepareRow(definition, raw);
      if (result.error) {
        counts.skipped++;
        report.skipped++;
        console.warn(`SKIP ${definition.table}: ${result.error}`);
        continue;
      }
      const row = result.row;
      const key = keyOf(row, definition.keys);
      if (sourceKeys.has(key)) {
        counts.skipped++;
        report.skipped++;
        console.warn(`SKIP ${definition.table}: duplicate key inside database.json (${key.replaceAll("\u001f", "/")})`);
        continue;
      }
      sourceKeys.add(key);
      prepared.push({ row, schoolId: result.schoolId, key });
    }

    const bySchool = new Map();
    for (const item of prepared) {
      if (!bySchool.has(item.schoolId)) bySchool.set(item.schoolId, []);
      bySchool.get(item.schoolId).push(item);
    }

    for (const [schoolId, schoolRows] of bySchool) {
      let existingKeys;
      try {
        existingKeys = await fetchExistingKeys(supabase, definition, schoolId);
      } catch (error) {
        counts.failed += schoolRows.length;
        report.failed += schoolRows.length;
        console.error(error instanceof Error ? error.message : String(error));
        continue;
      }

      for (const item of schoolRows) {
        if (existingKeys.has(item.key)) {
          counts.existing++;
          report.existing++;
          continue;
        }
        counts.candidates++;
        report.inserted += applying ? 0 : 0;
        if (!applying) continue;

        const { error } = await supabase.from(definition.table).insert([item.row]);
        if (error) {
          counts.failed++;
          report.failed++;
          console.error(`FAIL ${definition.table} (${item.key.replaceAll("\u001f", "/")}): ${error.message}`);
          continue;
        }
        counts.inserted++;
        report.inserted++;
        existingKeys.add(item.key);
      }
    }

    console.log(`${definition.table}: candidates=${counts.candidates}, existing=${counts.existing}, inserted=${counts.inserted}, skipped=${counts.skipped}, failed=${counts.failed}`);
  }

  // The legacy settings object is accepted only when it is explicitly keyed by school.
  const settings = sourceDB.settings;
  if (settings && typeof settings === "object" && !Array.isArray(settings)) {
    const settingRows = [];
    for (const [schoolId, value] of Object.entries(settings)) {
      if (value && typeof value === "object" && schoolId.trim() && schoolId !== "schoolName") {
        settingRows.push({ school_id: schoolId, key: "main_settings", value });
      }
    }
    if (settingRows.length > 0) {
      const counts = { candidates: 0, existing: 0, inserted: 0, skipped: 0, failed: 0 };
      report.byTable.dugsiga_settings = counts;
      for (const row of settingRows) {
        const { data: existing, error: readError } = await supabase.from("dugsiga_settings").select("key").eq("school_id", row.school_id).eq("key", row.key).maybeSingle();
        if (readError) {
          counts.failed++;
          report.failed++;
          console.error(`Could not inspect settings for school ${row.school_id}: ${readError.message}`);
          continue;
        }
        if (existing) {
          counts.existing++;
          report.existing++;
          continue;
        }
        counts.candidates++;
        if (!applying) continue;
        const { error } = await supabase.from("dugsiga_settings").insert([row]);
        if (error) {
          counts.failed++;
          report.failed++;
          console.error(`FAIL dugsiga_settings for school ${row.school_id}: ${error.message}`);
        } else {
          counts.inserted++;
          report.inserted++;
        }
      }
      console.log(`dugsiga_settings: candidates=${counts.candidates}, existing=${counts.existing}, inserted=${counts.inserted}, skipped=${counts.skipped}, failed=${counts.failed}`);
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.failed > 0) process.exitCode = 1;
  if (!applying) {
    console.log("Dry run complete. Review the report, back up Supabase, then rerun with --apply to insert missing rows.");
  } else {
    console.log("Apply complete. Rows already present were left unchanged; the source JSON was not deleted or rewritten.");
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
