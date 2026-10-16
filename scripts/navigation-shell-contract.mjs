import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`Navigation UX contract failed: missing ${rel}`);
  return fs.readFileSync(file, "utf8");
}

function assertContains(content, needle, label) {
  if (!content.includes(needle)) {
    throw new Error(`Navigation UX contract failed: ${label}`);
  }
}

function assertCountAtLeast(content, needle, count, label) {
  const found = content.split(needle).length - 1;
  if (found < count) {
    throw new Error(`Navigation UX contract failed: ${label} (expected at least ${count}, got ${found})`);
  }
}

const appShell = read("src/app/AppShell.tsx");
const navigation = read("src/app/navigationConfig.ts");
const css = read("src/index.css");
const installButton = read("src/components/PWAInstallButton.tsx");

for (const [needle, label] of [
  ["{ id: 'OVERVIEW', label: 'GUUDMAR' }", "overview nav group is Somali"],
  ["{ id: 'ACADEMIC', label: 'WAXBARASHO' }", "academic nav group is Somali"],
  ["{ id: 'PEOPLE', label: 'SHAQAALE & WAALIDIIN' }", "people nav group is Somali"],
  ["{ id: 'OPERATIONS', label: 'HAWLAHA DUGSIGA' }", "operations nav group is Somali"],
  ["{ id: 'FINANCE', label: 'MAALIYADDA' }", "finance nav group is Somali"],
  ["{ id: 'SYSTEM', label: 'NIDAAMKA' }", "system nav group is Somali"],
  ["export function getSomaliNavLabel", "shared Somali navigation labels are centralized"],
  ["export function getSomaliNavSubLabel", "shared Somali navigation descriptions are centralized"],
  ["export function getSomaliRoleLabel", "role names are localized"],
  ["'students-add': 'Ku Dar Arday'", "student sub-navigation has Somali labels"],
  ["'finance-invoices': 'Biilasha'", "finance sub-navigation has Somali labels"],
  ["if (!knownRoles.has(rawRole)) return [];", "unknown roles remain denied navigation access"],
  ["const allowedTabs: AppTabId[]", "existing role-based module allowlists remain present"]
]) {
  assertContains(navigation, needle, label);
}

for (const [needle, label] of [
  ["getSomaliNavLabel(item.id, item.label)", "sidebar shows localized parent labels"],
  ["getSomaliNavLabel(child.id, child.label)", "sidebar shows localized child labels"],
  ["getSomaliNavSubLabel(child.id, child.subLabel)", "sidebar shows localized sublabels"],
  ["searchText:", "command palette searches bilingual navigation terms"],
  [".filter((n) => !q || n.searchText.toLowerCase().includes(q))", "command palette filters across Somali and English"],
  ["event.key === 'Escape' && sidebarQuery", "Escape clears sidebar search"],
  ["aria-current={childActive ? 'page' : undefined}", "child navigation exposes current page to assistive technology"],
  ["aria-current={active ? 'page' : undefined}", "parent navigation exposes current page to assistive technology"],
  ["className=\"app-sidebar-content flex flex-col h-full", "sidebar uses the premium surface class"],
  ["sidebarCollapsed ? 'w-[4.5rem]' : 'w-[17rem]'", "desktop sidebar supports compact and expanded widths"],
  ["w-80 max-w-[88vw]", "mobile drawer remains responsive"],
  ["getSomaliRoleLabel(user.role)", "current role display is Somali"],
  ["setSidebarQuery('');", "navigation selection clears stale search results"],
  ["aria-label=\"Ka raadi qaybaha nidaamka\"", "sidebar search has an accessible Somali label"],
  ["Raadi qaybta aad u baahan tahay...", "sidebar search placeholder is Somali"]
]) {
  assertContains(appShell, needle, label);
}
assertCountAtLeast(appShell, "setSidebarQuery('');", 3, "parent, child, and leaf navigation clear search");

for (const [needle, label] of [
  [".app-sidebar-content {", "premium sidebar background exists"],
  [".sidebar-section-heading {", "navigation section headings have a shared style"],
  [".app-sidebar nav::-webkit-scrollbar-thumb", "sidebar scrollbars are styled"],
  [".app-sidebar button:focus-visible", "keyboard focus remains visible"]
]) {
  assertContains(css, needle, label);
}

assertContains(installButton, "'Ku Shub App-ka'", "install action is localized in Somali");
assertContains(installButton, "'Ku shub (iOS)'", "iOS install action is localized in Somali");
assertContains(installButton, "Waan fahmay", "iOS setup confirmation is localized in Somali");

console.log("Somali navigation and sidebar UX contract checks: PASS");
