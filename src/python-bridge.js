import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Bridge between scanner.js and the bundled python-analyzer.py. ts-morph
 * only understands JS/TS, so Python analysis is delegated to Python's own
 * stdlib `ast` module via a child process — no hand-rolled Python parsing
 * on the JS side, and no third-party Python packages required. Spawned
 * only when a scan actually finds .py files, so JS/TS-only projects pay
 * zero cost.
 */

/**
 * In a packaged Electron build the app's source lives inside `app.asar`, a
 * virtual archive. Electron patches `fs` so JS inside the app can read it
 * transparently — but the Python interpreter we spawn below is an ordinary
 * external process with no such patch, so handing it a path inside the
 * archive fails with "No such file or directory".
 *
 * electron-builder's `asarUnpack` keeps a real copy of the analyzer on disk
 * in `app.asar.unpacked/`, mirroring the archive's layout; rewriting the
 * path is how you point the child process at it. Running from source (no
 * `app.asar` segment) this is a no-op, so both modes use the same code path.
 */
const ANALYZER_PATH = path
  .join(path.dirname(fileURLToPath(import.meta.url)), "python-analyzer.py")
  .replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);

/**
 * Interpreter candidates in launch order. Windows installs typically ship
 * the `py` launcher (with `-3` selecting Python 3) and/or `python`;
 * Mac/Linux ship `python3` (bare `python` may still be a Python 2 on old
 * setups — the version probe below filters that out). RIPPLECHECK_PYTHON
 * lets a user (or a test) pin an explicit interpreter path.
 */
function pythonCandidates() {
  const platformDefaults =
    process.platform === "win32"
      ? [
          { cmd: "py", baseArgs: ["-3"] },
          { cmd: "python", baseArgs: [] },
          { cmd: "python3", baseArgs: [] },
        ]
      : [
          { cmd: "python3", baseArgs: [] },
          { cmd: "python", baseArgs: [] },
        ];

  const pinned = process.env.RIPPLECHECK_PYTHON;
  return pinned ? [{ cmd: pinned, baseArgs: [] }, ...platformDefaults] : platformDefaults;
}

// undefined = not probed yet; null = probed, none found. Cached for the
// process lifetime — a Python installed mid-session is picked up on the
// next daemon/app restart, which is fine for a "is this machine set up"
// probe that would otherwise re-spawn interpreters on every scan.
let cachedPython;

function findPython3() {
  if (cachedPython !== undefined) return cachedPython;

  for (const { cmd, baseArgs } of pythonCandidates()) {
    try {
      const probe = spawnSync(cmd, [...baseArgs, "--version"], {
        encoding: "utf8",
        timeout: 5000,
        windowsHide: true,
      });
      const versionOutput = `${probe.stdout || ""}${probe.stderr || ""}`;
      if (probe.status === 0 && /Python 3\./.test(versionOutput)) {
        cachedPython = { cmd, baseArgs };
        return cachedPython;
      }
    } catch {
      // Try the next candidate.
    }
  }

  cachedPython = null;
  return null;
}

/**
 * Runs the bundled analyzer over projectPath. Returns:
 *   { available: false }                      — no usable Python 3 on this machine
 *   { available: true, failed: true }         — interpreter exists but the run/parse failed
 *   { available: true, functions, skipped }   — the computeScanResult-shaped payload
 *
 * Callers translate the first two into honest user-facing notes; this
 * module never throws, since a Python hiccup must not take down the
 * JS/TS scan it piggybacks on.
 */
function scanPythonProject(projectPath) {
  const python = findPython3();
  if (!python) return { available: false };

  let run;
  try {
    run = spawnSync(python.cmd, [...python.baseArgs, ANALYZER_PATH, projectPath], {
      encoding: "utf8",
      timeout: 30000,
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return { available: true, failed: true };
  }

  if (run.status !== 0 || !run.stdout) {
    return { available: true, failed: true };
  }

  let payload;
  try {
    payload = JSON.parse(run.stdout);
  } catch {
    return { available: true, failed: true };
  }

  if (!payload || typeof payload.functions !== "object" || payload.functions === null) {
    return { available: true, failed: true };
  }

  return {
    available: true,
    functions: payload.functions,
    skipped: Array.isArray(payload.skipped) ? payload.skipped : [],
  };
}

export { scanPythonProject, findPython3 };
