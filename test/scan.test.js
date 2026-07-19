import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { scanProject } from "../src/scanner.js";
import { explainImpact } from "../src/explain.js";
import { findPython3 } from "../src/python-bridge.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const sampleProject = path.join(testDir, "sample-project");
const pythonProject = path.join(testDir, "python-project");

/** usedIn entries ({file, line}) for one name, keyed for easy lookup. */
function usageByFile(scanResult, name) {
  const files = scanResult.functions[name];
  assert.ok(files, `expected \`${name}\` in scan result`);
  return new Map(files.slice(1).map((usage) => [usage.file, usage.line]));
}

// --- JS/TS regression (the existing sample-project fixture) ---------------

test("JS/TS: cross-file references are tracked with defining file first", () => {
  const result = scanProject(sampleProject);

  assert.equal(result.functions.Button[0], path.join("components", "Button.jsx"));
  assert.ok(usageByFile(result, "Button").has(path.join("components", "App.jsx")));

  assert.equal(result.functions.add[0], path.join("utils", "math.js"));
  assert.ok(usageByFile(result, "add").has(path.join("utils", "calculator.js")));

  assert.ok(usageByFile(result, "calculate").has(path.join("components", "App.jsx")));
});

test("JS/TS: riskLevel follows the other-files count", () => {
  const entries = explainImpact(scanProject(sampleProject));
  const byName = new Map(entries.map((entry) => [entry.name, entry]));

  assert.equal(byName.get("add").riskLevel, "moderate"); // used in 1 other file
  assert.equal(byName.get("App").riskLevel, "safe"); // used nowhere else
});

// --- Python (bundled ast analyzer via python-bridge) ----------------------

const pythonAvailable = findPython3() !== null;

test("Python: a function used in 2 other .py files is tracked cross-file", { skip: !pythonAvailable && "no python3 on this machine" }, () => {
  const result = scanProject(pythonProject);

  // Deep analysis ran — a Python-only project must not fall into the
  // "nothing found" diagnostic, and no advisory note should fire.
  assert.equal(result.diagnostic, undefined);
  assert.deepEqual(result.notes, []);

  // load_data: defined in helpers.py, called from app.py (via
  // `from helpers import load_data`) and report.py (via
  // `import helpers; helpers.load_data(...)`) — both call lines, not the
  // import lines.
  assert.equal(result.functions.load_data[0], "helpers.py");
  const loadDataUsage = usageByFile(result, "load_data");
  assert.equal(loadDataUsage.size, 2);
  assert.equal(loadDataUsage.get("app.py"), 5);
  assert.equal(loadDataUsage.get("report.py"), 5);

  // A never-referenced function stays "safe to change".
  assert.deepEqual(result.functions.unused_helper, ["helpers.py"]);
});

test("Python: entries flow through the same explainImpact riskLevels", { skip: !pythonAvailable && "no python3 on this machine" }, () => {
  const entries = explainImpact(scanProject(pythonProject));
  const byName = new Map(entries.map((entry) => [entry.name, entry]));

  assert.equal(byName.get("load_data").riskLevel, "moderate"); // 2 other files
  assert.equal(byName.get("unused_helper").riskLevel, "safe");
  assert.match(byName.get("load_data").sentence, /2 other places/);
});

test("Python merge never disturbs a JS/TS-only scan", () => {
  const result = scanProject(sampleProject);
  assert.deepEqual(result.notes, []); // no .py files → no python note, no spawn
  assert.ok(Object.keys(result.functions).length > 0);
});
