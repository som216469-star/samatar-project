import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationDirectory = path.join(projectRoot, "supabase", "migrations");
const sqlFiles = readdirSync(migrationDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const malformedNames = sqlFiles.filter((file) => !/^\d{14}_[a-z0-9_]+\.sql$/i.test(file));
assert.deepEqual(
  malformedNames,
  [],
  "Every tracked Supabase migration must use the 14-digit timestamp_name.sql format."
);

const recordedRemoteMigrations = [
  "20261002103150_complete_users_schema.sql",
  "20261002103214_complete_dugsi_schema_columns.sql",
  "20261002103305_dugsi_pro_integrity_indexes.sql",
  "20261002103409_secure_dugsi_pro_database_v2.sql",
  "20261002103444_lock_down_rls_trigger_function.sql",
  "20261002103526_harden_dugsi_data_integrity.sql",
  "20261002104058_tighten_future_public_permissions.sql",
  "20261002104117_add_explicit_service_role_rls_policies.sql",
  "20261002163638_students_10_10_audit_and_integrity.sql",
  "20261002165741_students_10_10_schema_fix_and_integrity_v3.sql",
  "20261002165850_students_10_10_updated_at_native_timestamp_v2.sql",
  "20261002170011_students_10_10_auto_updated_at_trigger.sql",
  "20261002170059_students_10_10_not_null_core_fields.sql",
  "20261002172811_students_10_10_audit_snapshots.sql",
  "20261002173620_students_fix_date_constraints.sql",
  "20261002174459_students_atomic_class_capacity.sql",
  "20261002174543_students_capacity_section_aware.sql",
  "20261002174613_attendance_10_10_integrity_and_indexes_v2.sql",
  "20261002174725_attendance_10_10_audit_and_history_support.sql",
  "20261002174901_students_canonical_hardening_sync.sql",
  "20261002180040_students_capacity_lock_scope.sql",
  "20261002180252_students_10_10_audit_snapshots.sql",
  "20261002180446_students_10_10_db_guardrails.sql",
  "20261002190818_students_10_10_final_integrity_reapply_v2.sql",
  "20261002192207_students_10_10_emergency_contact_constraint.sql",
  "20261002193056_students_10_10_clean_rebuild.sql"
];
const missingRemoteMigrations = recordedRemoteMigrations.filter((file) => !sqlFiles.includes(file));
assert.deepEqual(
  missingRemoteMigrations,
  [],
  "Every migration recorded in the Supabase project must have its timestamped SQL file in Git."
);

for (const file of recordedRemoteMigrations) {
  const content = readFileSync(path.join(migrationDirectory, file), "utf8");
  assert.ok(content.trim().length > 0, `Recorded migration is empty: ${file}`);
}

const pendingFinanceMigration = "20261021173729_atomic_finance_transactions.sql";
assert.ok(sqlFiles.includes(pendingFinanceMigration), "Atomic finance migration is missing.");
const timestamps = sqlFiles.map((file) => file.slice(0, 14));
assert.equal(new Set(timestamps).size, timestamps.length, "Migration timestamps must be unique.");
assert.ok(
  Number(pendingFinanceMigration.slice(0, 14)) >
    Math.max(...recordedRemoteMigrations.map((file) => Number(file.slice(0, 14)))),
  "The staged finance migration must follow the existing remote migration history."
);

console.log(
  `Supabase migration history contract passed: ${recordedRemoteMigrations.length} recorded migrations are versioned in Git, with the atomic finance migration staged after them.`
);
