#!/usr/bin/env node
/**
 * RippleCheck's Claude Code hook entry point, in two modes:
 *
 *   --refresh  (PostToolUse on Edit|Write) — folds the edited file into the
 *              daemon's warm project and records it as pending. Prints
 *              nothing: mid-turn, the assistant is usually part-way through a
 *              multi-file change, and a report on each file describes a state
 *              that no longer exists by the time it's read.
 *
 *   --report   (Stop, at the end of a turn) — the unambiguous "the assistant
 *              has finished" signal. Prints one report covering every file
 *              touched during the turn, then clears the pending list.
 *
 * With no flag it behaves as it always did (refresh + report in one go), so
 * an older settings.json, or a manual invocation, still works.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scanProject } from "./scanner.js";
import { explainImpact, formatEntriesAsText } from "./explain.js";
import { getImpactSummaryViaDaemon } from "./daemon-client.js";

const SLOW_SCAN_THRESHOLD_MS = 2000;

/**
 * The turn's edited files live in the OS temp dir, keyed by a hash of the
 * project path — deliberately not inside the project, where they would be
 * picked up by the daemon's and the desktop app's own file watchers and
 * trigger the very refresh they're recording.
 */
function pendingEditsPathFor(projectDir) {
  const key = crypto.createHash("sha1").update(path.resolve(projectDir)).digest("hex").slice(0, 16);
  return path.join(os.tmpdir(), `ripplecheck-pending-${key}.json`);
}

function readPendingEdits(projectDir) {
  try {
    const parsed = JSON.parse(fs.readFileSync(pendingEditsPathFor(projectDir), "utf8"));
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string") : [];
  } catch {
    // No file yet, or a partial/corrupt write — either way there's nothing
    // pending worth reporting, and the next edit starts a clean list.
    return [];
  }
}

function recordPendingEdit(projectDir, filePath) {
  if (!filePath) return;
  const pending = readPendingEdits(projectDir);
  if (!pending.includes(filePath)) pending.push(filePath);
  try {
    fs.writeFileSync(pendingEditsPathFor(projectDir), JSON.stringify(pending));
  } catch {
    // Can't persist the list (read-only temp, disk full). The Stop hook will
    // fall back to a whole-project report, which is a degraded label rather
    // than a missing report.
  }
}

function clearPendingEdits(projectDir) {
  try {
    fs.unlinkSync(pendingEditsPathFor(projectDir));
  } catch {
    // Already gone — nothing to clear.
  }
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function runOneOffScan(projectDir) {
  const scanResult = scanProject(projectDir);
  return formatEntriesAsText(explainImpact(scanResult));
}

/**
 * Produces the impact summary for one file via the warm daemon, falling back
 * to a direct one-off scan if the daemon route fails for any reason — the
 * hook still works then, just without the warm-cache speed-up.
 */
async function summarize(projectDir, filePath) {
  try {
    return filePath ? await getImpactSummaryViaDaemon(projectDir, filePath) : runOneOffScan(projectDir);
  } catch {
    return runOneOffScan(projectDir);
  }
}

/**
 * PostToolUse: keep the daemon's picture of the project current and remember
 * that this file changed. Any failure here is swallowed — a silent refresh
 * that didn't happen costs a slower scan at Stop, and is never worth
 * interrupting the assistant's turn over.
 */
async function runRefresh(projectDir, editedFilePath) {
  recordPendingEdit(projectDir, editedFilePath);
  if (!editedFilePath) return;
  try {
    await getImpactSummaryViaDaemon(projectDir, editedFilePath);
  } catch {
    // Daemon unavailable — Stop falls back to a one-off scan.
  }
}

/**
 * Stop: the turn is over, so report once on everything it touched. Files are
 * summarized through the (now warm) daemon; the header names the single file
 * when there was one, and counts them when there were several.
 */
async function runReport(projectDir, pendingEdits) {
  if (pendingEdits.length === 0) return; // Turn made no edits — nothing to report.

  const startedAt = Date.now();

  // The last file edited is the one whose ripple the developer is most likely
  // still thinking about, and the scan is whole-project regardless — so one
  // summary through the warm daemon covers the whole turn.
  const summaryText = await summarize(projectDir, pendingEdits[pendingEdits.length - 1]);
  const durationMs = Date.now() - startedAt;

  const header =
    pendingEdits.length === 1
      ? `RippleCheck — impact of your edit to ${path.relative(projectDir, pendingEdits[0])}:`
      : `RippleCheck — impact of this turn's edits to ${pendingEdits.length} files ` +
        `(${pendingEdits.map((filePath) => path.relative(projectDir, filePath)).join(", ")}):`;

  console.log(header);
  console.log(summaryText);

  if (durationMs > SLOW_SCAN_THRESHOLD_MS) {
    console.log(
      `Note: this check took ${durationMs}ms. Hooks run synchronously, so on a larger ` +
        `project you may want to point RippleCheck at a subfolder instead of the whole repo.`
    );
  }
}

async function main() {
  const mode = process.argv.includes("--refresh")
    ? "refresh"
    : process.argv.includes("--report")
      ? "report"
      : "both";

  const rawInput = await readStdin();

  let hookInput;
  try {
    hookInput = JSON.parse(rawInput);
  } catch (error) {
    process.stderr.write(`RippleCheck hook: could not parse hook input: ${error.message}\n`);
    process.exitCode = 2;
    return;
  }

  const projectDir = hookInput.cwd ? path.resolve(hookInput.cwd) : process.cwd();
  // Stop hooks carry no tool_input — the edited paths come from the pending
  // list the PostToolUse runs built up instead.
  const editedFilePath = hookInput.tool_input?.file_path;

  try {
    if (mode === "refresh") {
      await runRefresh(projectDir, editedFilePath);
    } else if (mode === "report") {
      const pendingEdits = readPendingEdits(projectDir);
      clearPendingEdits(projectDir);
      await runReport(projectDir, pendingEdits);
    } else if (editedFilePath) {
      await runReport(projectDir, [editedFilePath]);
    } else {
      // Legacy no-flag invocation with no file in scope (a manual run, or a
      // hook matcher that isn't tool-specific): report on the whole project.
      console.log("RippleCheck — impact summary:");
      console.log(runOneOffScan(projectDir));
    }
  } catch (error) {
    process.stderr.write(`RippleCheck hook: scan failed: ${error.message}\n`);
    process.exitCode = 2;
    return;
  }

  process.exitCode = 0;
}

main().catch((error) => {
  process.stderr.write(`RippleCheck hook: unexpected error: ${error.stack || error.message}\n`);
  process.exitCode = 2;
});
