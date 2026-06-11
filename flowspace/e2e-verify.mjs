import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:3100";
const SHOT_DIR = "/tmp/flowspace-shots";
fs.mkdirSync(SHOT_DIR, { recursive: true });

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
});
page.on("pageerror", (err) => pageErrors.push(String(err).slice(0, 300)));
page.on("requestfailed", (req) => {
  if (!req.url().includes("favicon")) failedRequests.push(`${req.url()} :: ${req.failure()?.errorText}`);
});

const shot = (name) => page.screenshot({ path: `${SHOT_DIR}/${name}.png` });
const log = (...a) => console.log("•", ...a);

try {
  // 1. landing
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const heroText = await page.textContent("h1");
  log("landing h1:", JSON.stringify(heroText?.trim().replace(/\s+/g, " ")));
  await shot("01-landing");

  // 2. sign in
  await page.click("text=Open the demo workspace");
  await page.waitForSelector("text=Ava Chen");
  await page.click("text=Ava Chen");
  await page.waitForURL("**/app/home", { timeout: 15000 });
  await page.waitForTimeout(1200);
  log("signed in, at:", page.url());
  await shot("02-home");
  const homeHasMyWork = await page.isVisible("text=Recents").catch(() => false);
  log("home shows Recents:", homeHasMyWork);

  // 3. project board view
  await page.goto(`${BASE}/app/projects/pr_app?view=board`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const columns = await page.locator("text=In Progress").count();
  log("board 'In Progress' occurrences:", columns);
  const feedCard = await page.isVisible("text=Build new home feed with personalized ranking");
  log("board shows seed task:", feedCard);
  await shot("03-board");

  // 4. open task panel from board
  await page.click("text=Build new home feed with personalized ranking");
  await page.waitForTimeout(1000);
  const panelComments = await page.isVisible("text=Comments");
  log("task panel visible w/ Comments tab:", panelComments);
  await shot("04-task-panel");
  // post a comment
  const composer = page.locator("textarea").last();
  await composer.fill("Verification comment from e2e ✅");
  await page.keyboard.press("Control+Enter");
  await page.waitForTimeout(600);
  const commentPosted = await page.isVisible("text=Verification comment from e2e");
  log("comment posted:", commentPosted);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // 5. list view
  await page.goto(`${BASE}/app/projects/pr_app?view=list`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const listHasTask = await page.isVisible("text=Offline mode: local cache & sync engine");
  log("list shows seed task:", listHasTask);
  await shot("05-list");

  // 6. table view
  await page.goto(`${BASE}/app/projects/pr_app?view=table`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const tableHasSprint = await page.isVisible("text=Sprint");
  log("table shows custom field column 'Sprint':", tableHasSprint);
  await shot("06-table");

  // 7. gantt + calendar + workload + overview quick render check
  for (const v of ["gantt", "calendar", "workload", "overview", "activity"]) {
    await page.goto(`${BASE}/app/projects/pr_app?view=${v}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    await shot(`07-${v}`);
    log(`${v} view rendered`);
  }

  // 8. other pages
  const pages = ["my-tasks", "inbox", "docs", "goals", "dashboards", "timesheet", "automations", "integrations", "settings", "everything"];
  for (const p of pages) {
    await page.goto(`${BASE}/app/${p}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await shot(`08-${p}`);
    log(`page /app/${p} rendered`);
  }

  // 9. dashboard detail + doc editor
  await page.goto(`${BASE}/app/dashboards/dash_exec`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await shot("09-dashboard-exec");
  log("dashboard exec rendered");
  await page.goto(`${BASE}/app/docs/doc_v4_prd`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const docHasContent = await page.isVisible("text=Product Requirements");
  log("doc editor shows PRD content:", docHasContent);
  await shot("10-doc-editor");

  // 10. command palette
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(500);
  await page.keyboard.type("billing");
  await page.waitForTimeout(500);
  const cmdkResult = await page.isVisible("text=Usage-based billing");
  log("cmd+k finds 'Usage-based billing':", cmdkResult);
  await shot("11-cmdk");
  await page.keyboard.press("Escape");

  // 11. quick-create task via board quick add (probe: create + verify persistence)
  await page.goto(`${BASE}/app/projects/pr_bugs?view=list`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const addBtn = page.locator("text=Add task").first();
  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click();
    await page.keyboard.type("E2E probe bug — created via quick add");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(700);
    const created = await page.isVisible("text=E2E probe bug");
    log("quick-add created task:", created);
    // automation 'New bug → triage defaults' should set priority high + tag bug
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    const persisted = await page.isVisible("text=E2E probe bug");
    log("task persisted after reload:", persisted);
    await shot("12-quickadd-automation");
  } else {
    log("quick-add affordance not found (probe skipped)");
  }
} catch (e) {
  console.log("ERROR during flow:", e.message);
  await shot("99-error");
}

console.log("\nconsole errors:", consoleErrors.length);
consoleErrors.slice(0, 10).forEach((e) => console.log("  CE:", e));
console.log("page errors:", pageErrors.length);
pageErrors.slice(0, 10).forEach((e) => console.log("  PE:", e));
console.log("failed requests:", failedRequests.length);
failedRequests.slice(0, 10).forEach((e) => console.log("  RF:", e));

await browser.close();
