import { app, BrowserWindow, clipboard, dialog, ipcMain, shell, safeStorage } from "electron";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { watch } from "chokidar";
import AdmZip from "adm-zip";
import {
  buildProjectForDirectory,
  computeScanResult,
  hasSkippedDirectorySegment,
  refreshOrAddFile,
  walkFiles,
} from "../scanner.js";
import { explainImpact, compareFinding } from "../explain.js";
import { getMonogram, parseStackVersion } from "./tech-badges.js";
import { createSettleScheduler } from "./settle-scheduler.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

// --- Report timing -------------------------------------------------------
//
// The watcher used to report 500ms after the last file event, which meant an
// AI assistant editing five files produced five reports, each describing a
// half-finished state. Instead we wait for edits to *settle*: every new event
// restarts the window, so a burst coalesces into one report once the tool has
// actually stopped writing.
//
// The warm project (`built`) is still refreshed on every single event — only
// the user-facing report is deferred. Correctness never waits on this timer.
const DEFAULT_SETTLE_WINDOW_MS = 3500;
const MIN_SETTLE_WINDOW_MS = 500;
const MAX_SETTLE_WINDOW_MS = 30000;
// A process that writes continuously (a dev-server rebuild loop, a long
// codegen run) would otherwise restart the window forever and never report.
// After this multiple of the window has elapsed, report regardless.
const SETTLE_MAX_WAIT_MULTIPLIER = 3;


// --- GitHub login (custom-protocol handoff from ripplecheck-website) ----
//
// Flow: renderer asks main to open the website's login page in the user's
// real browser -> user authorizes on GitHub there -> the website redirects
// to ripplecheck://auth?token=... -> the OS hands that URL back to this
// app (already running or freshly launched) -> we store the token and
// fetch the username from api/me.php.

const PROTOCOL = "ripplecheck";
const WEBSITE_ORIGIN = "https://ripplecheck.io";
const AUTH_TOKEN_PATH = path.join(app.getPath("userData"), "auth-token.bin");

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

app.setAsDefaultProtocolClient(PROTOCOL);

/**
 * Windows/Linux: a second launch attempt via the protocol gets redirected
 * here as a new process's argv, rather than this process receiving its
 * own 'open-url' event (that's macOS-only).
 */
app.on("second-instance", (_event, argv) => {
  const url = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
  if (url) handleAuthCallback(url);

  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

/** macOS: registered before 'ready' per Electron's docs, so a cold-launch
 * open-url (app wasn't running yet) isn't missed. */
app.on("open-url", (event, url) => {
  event.preventDefault();
  handleAuthCallback(url);
});

function parseAuthToken(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== `${PROTOCOL}:`) return null;
  return parsed.searchParams.get("token");
}

function handleAuthCallback(url) {
  const token = parseAuthToken(url);
  if (!token) return;

  saveAuthToken(token);

  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }

  refreshAuthState();
}

/**
 * safeStorage only encrypts/decrypts in memory — it doesn't persist
 * anything itself, so the encrypted bytes are written to a file under
 * Electron's userData dir by hand. If encryption genuinely isn't
 * available on this machine (e.g. no OS keyring), we deliberately don't
 * fall back to writing the token in plain text — login just won't
 * survive a restart there.
 */
function saveAuthToken(token) {
  if (!safeStorage.isEncryptionAvailable()) {
    console.error("RippleCheck: safeStorage encryption unavailable — not persisting auth token.");
    return;
  }
  const encrypted = safeStorage.encryptString(token);
  fs.writeFileSync(AUTH_TOKEN_PATH, encrypted);
}

function loadAuthToken() {
  try {
    const encrypted = fs.readFileSync(AUTH_TOKEN_PATH);
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
}

function clearAuthToken() {
  try {
    fs.unlinkSync(AUTH_TOKEN_PATH);
  } catch {
    // Already gone.
  }
}

async function fetchCurrentUser(token) {
  try {
    const response = await fetch(`${WEBSITE_ORIGIN}/api/me.php`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/** Backs the Cloud mode tab — same bearer-token auth as fetchCurrentUser. */
async function fetchCloudHistory(token) {
  try {
    const response = await fetch(`${WEBSITE_ORIGIN}/api/history.php`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return { error: "request-failed" };
    return await response.json();
  } catch {
    return { error: "network" };
  }
}

ipcMain.handle("fetch-cloud-history", async () => {
  const token = loadAuthToken();
  if (!token) return { error: "not-logged-in" };
  return fetchCloudHistory(token);
});

// --- Cloud repo browser: pick a GitHub repo, download it, watch it ------

/** Same bearer-token auth as fetchCloudHistory — backs the Cloud tab's "Browse your repos". */
async function fetchGithubRepos(token) {
  let response;
  try {
    response = await fetch(`${WEBSITE_ORIGIN}/api/repos.php`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // fetch itself threw — genuinely offline / DNS / TLS.
    return { error: "network" };
  }

  // Parse defensively: if repos.php isn't deployed, the host returns an HTML
  // 404 page, not our JSON. Reading text first (instead of response.json())
  // lets us tell "endpoint missing / server returned HTML" apart from a real
  // network failure, instead of misreporting the former as the latter.
  const raw = await response.text().catch(() => "");
  let body = null;
  try {
    body = JSON.parse(raw);
  } catch {
    // Non-JSON response (e.g. a 404 HTML error page).
  }

  if (!response.ok) {
    // JSON error from repos.php → pass its specific code + any real HTTP status
    // (e.g. github_api_error carries the upstream GitHub status) straight
    // through. No JSON (HTML error page) → the endpoint isn't reachable/deployed.
    if (body && body.error) return { error: body.error, status: body.status };
    return { error: "endpoint_unavailable", status: response.status };
  }
  return body ?? { error: "endpoint_unavailable", status: response.status };
}

ipcMain.handle("fetch-github-repos", async () => {
  const token = loadAuthToken();
  if (!token) return { error: "not-logged-in" };
  return fetchGithubRepos(token);
});

/**
 * Asks the website to resolve the repo's short-lived codeload.github.com
 * zip URL. The real GitHub access token lives only on the website's
 * server (see ripplecheck-website/github_token.php) and never reaches
 * this app — only this one-time-use download link does.
 */
async function fetchRepoDownloadUrl(token, fullName) {
  try {
    const response = await fetch(
      `${WEBSITE_ORIGIN}/api/repo-download-url.php?full_name=${encodeURIComponent(fullName)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const body = await response.json();
    if (!response.ok) return { error: body?.error || "request-failed" };
    return body;
  } catch {
    return { error: "network" };
  }
}

// Every extracted-zip temp dir is tracked here so it can be wiped on quit
// — nothing under os.tmpdir() should outlive the app.
const repoTempDirs = [];

app.on("before-quit", () => {
  for (const dir of repoTempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  repoTempDirs.length = 0;
});

/**
 * Extracts a zip — either a Buffer of downloaded bytes or a path to an
 * on-disk zip file, AdmZip accepts either — into a fresh os.tmpdir()
 * folder, and returns the path to watch. Shared by the GitHub repo
 * download flow and the "Upload zip" button; the only difference between
 * those two callers is where the zip data comes from.
 */
function extractZipToTempProject(zipSource) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ripplecheck-repo-"));
  repoTempDirs.push(tempDir);

  const extractDir = path.join(tempDir, "extracted");
  fs.mkdirSync(extractDir);
  new AdmZip(zipSource).extractAllTo(extractDir, true);

  // GitHub's zipball always wraps the repo in one top-level
  // `{owner}-{repo}-{sha}` folder. A manually-zipped project might not be
  // wrapped at all, so only descend into it when the extraction produced
  // exactly one top-level directory and nothing else alongside it.
  const entries = fs.readdirSync(extractDir, { withFileTypes: true });
  if (entries.length === 1 && entries[0].isDirectory()) {
    return path.join(extractDir, entries[0].name);
  }
  return extractDir;
}

/**
 * Reads a fetch Response body chunk-by-chunk so real progress can be
 * emitted while the bytes arrive, instead of one silent arrayBuffer()
 * wait. Emits `repo-clone-progress` with a percent when the server sent
 * a Content-Length, and with just the live byte count when it didn't —
 * GitHub's codeload zipballs are generated on the fly and streamed
 * chunked (no Content-Length), so for them an honest percentage doesn't
 * exist and the renderer shows "Downloading… 1.4 MB" instead. Progress
 * events are throttled: only when the integer percent moves, or (in the
 * no-length case) at most ~5 per second.
 */
async function readBodyWithProgress(response) {
  const contentLength = Number(response.headers.get("content-length"));
  const totalBytes = Number.isFinite(contentLength) && contentLength > 0 ? contentLength : null;

  const chunks = [];
  let receivedBytes = 0;
  let lastPercent = -1;
  let lastEmitAt = 0;

  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(Buffer.from(value));
    receivedBytes += value.byteLength;

    const percent = totalBytes ? Math.min(100, Math.floor((receivedBytes / totalBytes) * 100)) : null;
    const now = Date.now();
    const shouldEmit = percent !== null ? percent !== lastPercent : now - lastEmitAt >= 200;
    if (shouldEmit) {
      lastPercent = percent ?? lastPercent;
      lastEmitAt = now;
      mainWindow?.webContents.send("repo-clone-progress", {
        stage: "downloading",
        percent,
        receivedBytes,
        totalBytes,
      });
    }
  }

  return Buffer.concat(chunks);
}

/**
 * Downloads a repo as a zip and hands the extracted result straight to
 * the existing startWatching() — the exact same flow used for a
 * manually-picked folder, so none of the chokidar/scanProject wiring is
 * duplicated here.
 */
ipcMain.handle("download-and-watch-repo", async (_event, fullName) => {
  const token = loadAuthToken();
  if (!token) return { error: "not-logged-in" };

  const urlResult = await fetchRepoDownloadUrl(token, fullName);
  if (urlResult.error) return urlResult;

  mainWindow?.webContents.send("repo-clone-progress", { stage: "downloading", receivedBytes: 0 });

  let zipBuffer;
  try {
    const zipResponse = await fetch(urlResult.downloadUrl);
    if (!zipResponse.ok) return { error: "download-failed" };
    zipBuffer = await readBodyWithProgress(zipResponse);
  } catch {
    return { error: "network" };
  }

  mainWindow?.webContents.send("repo-clone-progress", { stage: "extracting" });

  let projectPath;
  try {
    projectPath = extractZipToTempProject(zipBuffer);
  } catch {
    return { error: "extract-failed" };
  }

  startWatching(projectPath);

  return { success: true };
});

/**
 * "Upload zip" in the Project tab's empty state: same extraction/watch
 * flow as the GitHub repo download, just sourced from a locally-picked
 * zip file instead of a network download.
 */
ipcMain.handle("select-zip-and-watch", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "Zip archives", extensions: ["zip"] }],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  mainWindow?.webContents.send("repo-clone-progress", { stage: "extracting" });

  let projectPath;
  try {
    projectPath = extractZipToTempProject(result.filePaths[0]);
  } catch {
    return { error: "extract-failed" };
  }

  startWatching(projectPath);

  return { success: true };
});

/** Pushes the current login state to the renderer — called on startup and
 * right after a token is (re)saved. An expired/invalid stored token is
 * treated the same as never having logged in, and is cleared. */
async function refreshAuthState() {
  const token = loadAuthToken();
  if (!token) {
    mainWindow?.webContents.send("auth-state", { loggedIn: false });
    return;
  }

  const user = await fetchCurrentUser(token);
  if (!user) {
    clearAuthToken();
    mainWindow?.webContents.send("auth-state", { loggedIn: false });
    return;
  }

  mainWindow?.webContents.send("auth-state", {
    loggedIn: true,
    username: user.username,
    avatarUrl: user.avatar_url,
  });
}

ipcMain.handle("login-with-github", () => {
  shell.openExternal(`${WEBSITE_ORIGIN}/login.php?from=app`);
});

ipcMain.handle("sign-out", async () => {
  clearAuthToken();
  await refreshAuthState();
});

/**
 * app.getVersion() reads from the app's package.json, but Electron looks
 * for it next to main.js — src/app/ has none, so it falls back to
 * Electron's own version. Read the project's top-level package.json
 * directly instead.
 */
const packageJsonPath = path.join(currentDirPath, "..", "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
ipcMain.handle("get-app-version", () => packageJson.version);

/** Clears the incremental scan cache. Next file change re-parses from
 * scratch — the only real user-facing knob here, since nothing scan-
 * related is persisted to disk. */
ipcMain.handle("reset-scan-cache", () => {
  built = null;
});

// --- Local app settings (plain JSON file, not localStorage — this is the
// Electron main process, localStorage isn't in scope here, and a file
// next to auth-token.bin keeps all of the app's local state in one place) ---

const SETTINGS_PATH = path.join(app.getPath("userData"), "settings.json");
// Three card verbosities: "simple" leans on the LLM summary (one-sentence
// explanation + file-purpose labels), "standard" adds the plain-English
// sentence plus the relative file:line usages, and "deep" shows the full
// deterministic trace (absolute paths, lines, riskLevel) plus that reasoning.
const VALID_DETAIL_LEVELS = new Set(["simple", "standard", "deep"]);
// The coding tool the user says they work in — a stated onboarding preference,
// separate from the folder's auto-detected tool badge (detectTool). "other"
// covers anything we don't list.
const VALID_PLATFORMS = new Set(["claude-code", "cursor", "codex", "windsurf", "other"]);
// Which optional AI-enrichment provider is active. "anthropic" uses the
// existing Messages API path (anthropic-key.bin); the rest use the OpenAI
// chat-completions shape (config in ai-provider.bin). null = enrichment off.
const VALID_AI_PROVIDERS = new Set(["anthropic", "openai", "xai", "google", "other"]);
const DEFAULT_SETTINGS = {
  detailLevel: "simple",
  platform: null,
  onboardingComplete: false,
  aiProvider: null,
  // The last real on-disk folder watched, re-opened on the next launch so a
  // returning user lands straight back in their project (see auto-rewatch in
  // createWindow's did-finish-load). Zip/repo temp dirs are deliberately not
  // stored here — they're wiped on quit.
  lastFolderPath: null,
  // First-run "Generate fix prompt" dashboard callout — shown once, then this
  // flips true so it never nags again.
  fixPromptHintDismissed: false,
  // Sticky "the npm package exists" flag: once the registry has confirmed the
  // package is published, the CLI tab keeps showing the portable npx command
  // even offline. One-way — an unpublish is not a state to auto-detect.
  npmPublished: false,
  // How long the watcher waits for edits to stop before showing a report.
  // Sized for an AI assistant rewriting several files in a burst: long enough
  // that the burst lands as one report instead of one per file. See
  // SETTLE_WINDOW_MS bounds.
  settleWindowMs: DEFAULT_SETTLE_WINDOW_MS,
};

function loadSettings() {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    ...DEFAULT_SETTINGS,
    detailLevel: VALID_DETAIL_LEVELS.has(raw?.detailLevel) ? raw.detailLevel : DEFAULT_SETTINGS.detailLevel,
    platform: VALID_PLATFORMS.has(raw?.platform) ? raw.platform : DEFAULT_SETTINGS.platform,
    onboardingComplete: raw?.onboardingComplete === true,
    aiProvider: VALID_AI_PROVIDERS.has(raw?.aiProvider) ? raw.aiProvider : DEFAULT_SETTINGS.aiProvider,
    lastFolderPath: typeof raw?.lastFolderPath === "string" ? raw.lastFolderPath : DEFAULT_SETTINGS.lastFolderPath,
    fixPromptHintDismissed: raw?.fixPromptHintDismissed === true,
    npmPublished: raw?.npmPublished === true,
    settleWindowMs: clampSettleWindow(raw?.settleWindowMs),
  };
}

/**
 * Keeps a hand-edited or stale settings file from producing a window that
 * either spams reports (too low) or looks like the app has stopped noticing
 * edits (too high). Anything non-numeric falls back to the default.
 */
function clampSettleWindow(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_SETTLE_WINDOW_MS;
  return Math.min(MAX_SETTLE_WINDOW_MS, Math.max(MIN_SETTLE_WINDOW_MS, Math.round(value)));
}

function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

ipcMain.handle("get-settings", () => loadSettings());

ipcMain.handle("set-detail-level", (_event, detailLevel) => {
  const settings = loadSettings();
  if (VALID_DETAIL_LEVELS.has(detailLevel)) {
    settings.detailLevel = detailLevel;
    saveSettings(settings);
  }
  return settings;
});

ipcMain.handle("set-platform", (_event, platform) => {
  const settings = loadSettings();
  if (VALID_PLATFORMS.has(platform)) {
    settings.platform = platform;
    saveSettings(settings);
  }
  return settings;
});

// Onboarding is a first-launch flow; once the user has picked a project source
// we persist this so later launches open straight into the workspace. It can be
// re-triggered from Settings without clearing it (the renderer just re-shows the
// overlay), so this only ever flips false → true here.
ipcMain.handle("set-onboarding-complete", () => {
  const settings = loadSettings();
  settings.onboardingComplete = true;
  saveSettings(settings);
  return settings;
});

// How long the watcher waits for edits to stop before reporting. Persisted so
// a user on a slower/chattier AI tool can widen it once instead of per session.
// Takes effect on the next burst — no re-watch needed, since scheduleScan reads
// the setting each time.
ipcMain.handle("set-settle-window", (_event, settleWindowMs) => {
  const settings = loadSettings();
  settings.settleWindowMs = clampSettleWindow(settleWindowMs);
  saveSettings(settings);
  return settings;
});

// First-run dashboard callout pointing at "Generate fix prompt". Flipping this
// true is one-way here — the callout is a one-time nudge, never re-shown.
ipcMain.handle("set-fix-prompt-hint-dismissed", () => {
  const settings = loadSettings();
  settings.fixPromptHintDismissed = true;
  saveSettings(settings);
  return settings;
});

// --- CLI mode (MCP registration) -----------------------------------------

const mcpServerPath = path.join(currentDirPath, "..", "mcp-server.js");
// Shown only until the npm package is published — it hardcodes this
// machine's absolute path, which is useless to anyone else.
const localMcpAddCommand = `claude mcp add ripplecheck --scope user -- node ${mcpServerPath}`;

// Must match package.json's "name" — `npx <x>` resolves a PACKAGE named x
// from the registry (not a bin inside some other package), so the portable
// command only works if the package itself is published under this name.
// `-y` skips npx's first-run install prompt, which would otherwise hang the
// MCP client's stdio spawn.
const NPM_PACKAGE_NAME = "ripplecheck-mcp";
const npxMcpAddCommand = `claude mcp add ripplecheck --scope user -- npx -y ${NPM_PACKAGE_NAME}`;

/**
 * One awaitable registry probe. Logs exactly what the registry answered so
 * "the tab still shows the local command" is diagnosable from the terminal
 * instead of a guess. On success persists the sticky settings.npmPublished
 * flag (one-way — the portable command keeps showing even offline later;
 * an unpublish is not a state to auto-detect).
 */
async function checkNpmPublishedNow() {
  if (loadSettings().npmPublished) return { published: true, probe: "already persisted" };

  let outcome;
  try {
    const response = await fetch(`https://registry.npmjs.org/${NPM_PACKAGE_NAME}/latest`, {
      signal: AbortSignal.timeout(4000),
    });
    outcome = { published: response.ok, probe: `registry HTTP ${response.status}` };
  } catch (error) {
    outcome = { published: false, probe: `registry unreachable: ${error.message}` };
  }

  console.log(
    `RippleCheck: npm publish check (${NPM_PACKAGE_NAME}) → published=${outcome.published} [${outcome.probe}]`
  );

  if (outcome.published) {
    const settings = loadSettings();
    settings.npmPublished = true;
    saveSettings(settings);
  }
  return outcome;
}

function buildCliInfo() {
  const published = loadSettings().npmPublished;
  return {
    command: published ? npxMcpAddCommand : localMcpAddCommand,
    mcpServerPath,
    published,
  };
}

ipcMain.handle("get-cli-info", () => {
  const info = buildCliInfo();
  // Warm the flag in the background so a plain tab re-open picks up a fresh
  // publish; the Refresh button below is the immediate, awaited path.
  if (!info.published) void checkNpmPublishedNow();
  return info;
});

// Manual "Refresh" in the CLI tab: awaits a real registry round-trip and
// returns the (possibly upgraded) command right away — no restart, no
// tab-switch dance.
ipcMain.handle("refresh-cli-info", async () => {
  const outcome = await checkNpmPublishedNow();
  return { ...buildCliInfo(), probe: outcome.probe };
});

/**
 * Claude Code stores MCP registrations in ~/.claude.json. A `--scope user`
 * add lands in the top-level `mcpServers` map; older/other-scoped adds land
 * nested under `projects[<cwd-at-the-time>].mcpServers` instead — so both
 * places are checked rather than assuming one shape.
 */
function isRippleCheckRegistered() {
  const claudeConfigPath = path.join(app.getPath("home"), ".claude.json");

  let config;
  try {
    config = JSON.parse(fs.readFileSync(claudeConfigPath, "utf8"));
  } catch {
    return false;
  }

  if (config?.mcpServers?.ripplecheck) return true;

  const projects = config?.projects;
  if (projects && typeof projects === "object") {
    for (const project of Object.values(projects)) {
      if (project?.mcpServers?.ripplecheck) return true;
    }
  }

  return false;
}

ipcMain.handle("check-mcp-status", () => isRippleCheckRegistered());

ipcMain.handle("copy-to-clipboard", (_event, text) => {
  clipboard.writeText(text);
});

// Checked in order — first match wins. Each entry lists the config
// paths (relative to the watched folder) that indicate that tool.
const TOOL_DETECTORS = [
  { id: "cursor", label: "Cursor", markers: [".cursor", ".cursorrules"] },
  { id: "claude-code", label: "Claude Code", markers: ["CLAUDE.md", ".claude"] },
  { id: "codex", label: "Codex", markers: [".codex"] },
];

/**
 * Best-effort sniff of which AI coding tool a folder is set up for, purely
 * from well-known config file/directory names. `fs.existsSync` never
 * throws, so a missing or unreadable folder just falls through to
 * "unknown" instead of blocking watching from starting.
 */
function detectTool(folderPath) {
  for (const detector of TOOL_DETECTORS) {
    const found = detector.markers.some((marker) => fs.existsSync(path.join(folderPath, marker)));
    if (found) return { id: detector.id, label: detector.label, ...getMonogram(detector.id) };
  }
  // No tool detected is a normal state, not a failure — label it as
  // RippleCheck itself instead of "Unknown tool" (which reads like an
  // error). The id stays "unknown" so the muted [data-tool="unknown"]
  // badge styling in renderer.html keeps applying.
  return { id: "unknown", label: "RippleCheck", ...getMonogram("ripplecheck") };
}

// --- Tech-stack detection (sidebar badges) -------------------------------
//
// Shallow, marker-file-only sniff — never reads source file contents and
// never feeds into scanProject/explainImpact. It only labels what's in the
// folder for the sidebar; RippleCheck's actual dependency scanning is
// untouched by this.

const STACK_DETECTION_IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage",
]);

const STACK_META = {
  "react-native": { label: "React Native", isJsBased: true },
  react: { label: "React", isJsBased: true },
  next: { label: "Next.js", isJsBased: true },
  node: { label: "Node.js", isJsBased: true },
  typescript: { label: "TypeScript", isJsBased: true },
  python: { label: "Python", isJsBased: false },
  java: { label: "Java", isJsBased: false },
  rust: { label: "Rust", isJsBased: false },
  go: { label: "Go", isJsBased: false },
};

function readPackageJsonSafely(dirPath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dirPath, "package.json"), "utf8"));
  } catch {
    return null;
  }
}

function hasDependency(packageJson, depName) {
  return Boolean(packageJson?.dependencies?.[depName] || packageJson?.devDependencies?.[depName]);
}

/**
 * Single directory's own marker files only (no recursion). Order matters:
 * JS framework deps are checked first (react-native > next > react —
 * more specific first), then other-language config files, then a
 * TypeScript-only signal, and a bare `package.json` with none of the
 * above is the last-resort "Node.js" fallback. So e.g. a stray
 * package.json alongside a real requirements.txt doesn't shadow the
 * more specific Python signal, and a Next.js app with tsconfig.json
 * still reads as "Next.js" rather than the generic "TypeScript".
 */
function detectStackId(dirPath) {
  const packageJson = fs.existsSync(path.join(dirPath, "package.json"))
    ? readPackageJsonSafely(dirPath)
    : null;

  if (packageJson) {
    if (hasDependency(packageJson, "react-native")) return "react-native";
    if (hasDependency(packageJson, "next")) return "next";
    if (hasDependency(packageJson, "react")) return "react";
  }

  if (
    fs.existsSync(path.join(dirPath, "requirements.txt")) ||
    fs.existsSync(path.join(dirPath, "pyproject.toml"))
  ) {
    return "python";
  }
  if (fs.existsSync(path.join(dirPath, "pom.xml")) || fs.existsSync(path.join(dirPath, "build.gradle"))) {
    return "java";
  }
  if (fs.existsSync(path.join(dirPath, "Cargo.toml"))) return "rust";
  if (fs.existsSync(path.join(dirPath, "go.mod"))) return "go";

  const hasTsconfig = fs.existsSync(path.join(dirPath, "tsconfig.json"));
  if (hasTsconfig || (packageJson && hasDependency(packageJson, "typescript"))) {
    return "typescript";
  }

  if (packageJson) return "node";

  return null;
}

function toStackEntry(id, folder, dirPath) {
  return {
    id,
    folder,
    ...STACK_META[id],
    ...getMonogram(id),
    version: parseStackVersion(id, dirPath),
  };
}

/**
 * Checks the watched folder's own markers, then one level of
 * subdirectories for the monorepo case (several sibling apps each with
 * their own package.json/requirements.txt/etc). When 2+ subdirectories
 * each resolve to their own stack, that's treated as a multi-part project
 * and each is listed separately instead of collapsing to one guess.
 */
function detectTechStacks(rootPath) {
  let subdirNames = [];
  try {
    subdirNames = fs
      .readdirSync(rootPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => !name.startsWith(".") && !STACK_DETECTION_IGNORED_DIRS.has(name));
  } catch {
    subdirNames = [];
  }

  const subEntries = [];
  for (const name of subdirNames) {
    const subDirPath = path.join(rootPath, name);
    const id = detectStackId(subDirPath);
    if (id) subEntries.push(toStackEntry(id, name, subDirPath));
  }

  if (subEntries.length >= 2) return subEntries;

  const rootId = detectStackId(rootPath);
  if (rootId) return [toStackEntry(rootId, undefined, rootPath)];

  return subEntries;
}

let mainWindow = null;
let watcher = null;
let watchedFolder = null;
let pendingChangedPaths = [];
// Owns the "have the edits stopped?" timing (see settle-scheduler.js). The
// window is re-read from settings on every event, so changing it in Settings
// applies to the next burst without re-watching the folder.
const settleScheduler = createSettleScheduler({
  getWindowMs: () => clampSettleWindow(loadSettings().settleWindowMs),
  maxWaitMultiplier: SETTLE_MAX_WAIT_MULTIPLIER,
  onSettled: () => runScanAndNotify(),
});
// Kept warm across scans the same way daemon.js keeps it warm across
// requests — re-parsing the whole project on every keystroke-triggered
// save doesn't scale to a large watched folder.
let built = null;

/**
 * Which paths the watcher ignores. Delegates to scanner.js so the watcher and
 * the scan can't drift apart — they did once, and a `dist/` the scan skipped
 * was still being watched and fed back in one event at a time.
 *
 * chokidar hands back absolute paths, so this compares the project-relative
 * portion: watching a folder that itself sits under some `.../dist/...` path
 * would otherwise ignore every file in it.
 */
function pathHasIgnoredSegment(candidatePath) {
  if (!watchedFolder) return hasSkippedDirectorySegment(candidatePath);
  return hasSkippedDirectorySegment(path.relative(watchedFolder, candidatePath));
}

function stopWatching() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  settleScheduler.cancel();
  pendingChangedPaths = [];
}

/**
 * Folds changed files into the warm project immediately, without reporting
 * anything. This runs on every single file event so `built` — the state the
 * repo overview, Retest and the next report all read — is never stale, even
 * while the report itself is still waiting for the burst to settle.
 *
 * Falls back to a full rebuild when a file can't be patched in place, and
 * drops the warm project entirely on error so the next read rebuilds cleanly.
 */
function applyChangesToWarmProject(changedPaths) {
  if (!watchedFolder) return;

  try {
    if (!built) {
      built = buildProjectForDirectory(watchedFolder);
      return;
    }
    for (const changedPath of changedPaths) {
      const handledIncrementally = refreshOrAddFile(built, changedPath);
      if (!handledIncrementally) {
        built = buildProjectForDirectory(watchedFolder);
        return;
      }
    }
    built.allFilePaths = walkFiles(built.absoluteProjectPath);
  } catch {
    built = null;
  }
}

function runScanAndNotify() {
  if (!watchedFolder || !mainWindow) return;

  const changedPaths = pendingChangedPaths;
  pendingChangedPaths = [];

  let entries = [];
  let summary;
  let scanFailed = false;
  try {
    // Every path in this burst was already folded into `built` as its event
    // arrived (see scheduleScan); this only covers a warm project that was
    // dropped by a failed refresh in between.
    if (!built) built = buildProjectForDirectory(watchedFolder);

    const scanResult = computeScanResult(built);
    // The renderer reads `entries[i].riskLevel` directly for color-coding
    // (see CLAUDE.md). `summary` is kept for anything still consuming the
    // plain-text form.
    entries = explainImpact(scanResult);

    // Expert detail level shows a full absolute path per usage — computed
    // here (not in the renderer) since this is the only process with
    // Node's path module; scanner.js's usedIn[].file stays project-root-
    // relative for every other consumer (CLI, MCP, hook-runner).
    for (const entry of entries) {
      for (const usage of entry.usedIn) {
        usage.absPath = path.join(watchedFolder, usage.file);
      }
    }

    summary = entries.map((entry) => entry.sentence).join("\n");
  } catch (error) {
    built = null;
    scanFailed = true;
    summary = `Scan failed: ${error.message}`;
  }

  // A settled burst usually contains several events for the same file (write,
  // then the editor's atomic-rename follow-up), so count distinct files —
  // otherwise a single save reports as "3 files changed".
  const distinctChangedFiles = [...new Set(changedPaths)];
  const changedFileLabel =
    distinctChangedFiles.length === 1
      ? path.relative(watchedFolder, distinctChangedFiles[0])
      : `${distinctChangedFiles.length} files changed`;

  const timestamp = new Date().toISOString();
  mainWindow.webContents.send("impact-update", {
    timestamp,
    changedFileLabel,
    summary,
    entries,
    scanFailed,
  });

  // Fire-and-forget LLM enrichment. Deliberately not awaited: the
  // deterministic result above is already on screen, and this layer must
  // never gate or break it. On any failure (no Anthropic key set, timeout,
  // offline, bad key) enrichImpact resolves silently and the renderer keeps
  // the template text it already rendered.
  if (!scanFailed && entries.length > 0) {
    void enrichImpact({ timestamp, changedFileLabel, entries });
  }
}

/**
 * Re-runs the scan and reports what happened to one specific finding — the
 * "I fixed it, did it take?" check behind each row's Retest button.
 *
 * Goes through the same buildProjectForDirectory/computeScanResult/
 * explainImpact pipeline as a normal scan; the only thing added here is
 * looking the symbol back up by its identity and diffing (compareFinding).
 * The rebuild is unconditional: the point of pressing Retest is to trust the
 * answer, so this deliberately doesn't reuse a possibly-stale warm project.
 */
ipcMain.handle("retest-finding", (_event, finding) => {
  if (!watchedFolder) return { error: "No folder is being watched." };
  if (!finding || typeof finding.name !== "string") return { error: "Nothing to retest." };

  try {
    built = buildProjectForDirectory(watchedFolder);
    const entries = explainImpact(computeScanResult(built));
    const verdict = compareFinding(
      { name: finding.name, definingFile: finding.definingFile ?? null, usedIn: finding.usedIn ?? [] },
      entries
    );

    // Same absolute-path enrichment the watch path does — the renderer's deep
    // detail level reads usage.absPath, and a retest result feeds the same row.
    for (const usage of verdict.usedIn ?? []) {
      usage.absPath = path.join(watchedFolder, usage.file);
    }

    return verdict;
  } catch (error) {
    built = null;
    return { error: `Retest failed: ${error.message}` };
  }
});

/**
 * Aggregates one full scan into the whole-repo overview: risk distribution
 * across every tracked function, the number of distinct files that define one,
 * and the highest-fan-out symbols (for the AI overview to name real hotspots).
 * `scanResult.functions[name]` is `[definedIn, ...usages]` (see scanner.js), so
 * index 0 is the defining file and the rest are usage sites.
 */
function computeRepoOverview(scanResult, entries) {
  const findings = entries.filter((entry) => entry.riskLevel);
  const counts = { safe: 0, moderate: 0, high: 0 };
  for (const finding of findings) {
    if (counts[finding.riskLevel] !== undefined) counts[finding.riskLevel] += 1;
  }

  const files = new Set();
  const functionMap = (scanResult && scanResult.functions) || {};
  for (const list of Object.values(functionMap)) {
    if (Array.isArray(list) && typeof list[0] === "string") files.add(list[0]);
  }

  const topFindings = findings
    .filter((finding) => finding.riskLevel !== "safe")
    .sort((a, b) => b.usedIn.length - a.usedIn.length)
    .slice(0, 12)
    .map((finding) => ({
      name: finding.name,
      riskLevel: finding.riskLevel,
      usageCount: finding.usedIn.length,
    }));

  return { totalFunctions: findings.length, fileCount: files.size, counts, topFindings };
}

/**
 * One-time full scan of a freshly-watched folder, feeding the repo-overview
 * gauge (deterministic, always) plus — if an AI key is configured — a single
 * whole-repo AI summary. Deferred from startWatching so watching-started paints
 * first; it also warms the shared `built` cache so the first real edit reuses
 * this parse. A failed scan just skips the overview; per-edit scanning is
 * unaffected. Guarded on watchedFolder so a fast folder switch drops a stale run.
 */
function runInitialOverview(folderPath) {
  if (!mainWindow || mainWindow.isDestroyed() || watchedFolder !== folderPath) return;

  let scanResult;
  let entries;
  try {
    built = buildProjectForDirectory(folderPath);
    scanResult = computeScanResult(built);
    entries = explainImpact(scanResult);
  } catch {
    built = null;
    return;
  }

  // The synchronous scan can't be interrupted, but the window may have closed.
  if (!mainWindow || mainWindow.isDestroyed() || watchedFolder !== folderPath) return;

  const overview = computeRepoOverview(scanResult, entries);
  const aiConfig = resolveAiConfig();
  const aiPending = aiConfig !== null && overview.totalFunctions > 0;

  mainWindow.webContents.send("repo-overview", {
    folderPath,
    folderName: path.basename(folderPath),
    totalFunctions: overview.totalFunctions,
    fileCount: overview.fileCount,
    counts: overview.counts,
    aiPending,
  });

  if (aiPending) {
    void enrichRepoOverview(folderPath, { folderName: path.basename(folderPath), ...overview }, aiConfig);
  }
}

// --- LLM contextual analysis (BYOK — direct, local, user-funded) -----------
//
// Enrichment is optional and Bring-Your-Own-Key: if the user pastes their own
// Anthropic key in Settings, we call the Anthropic Messages API directly from
// this main process with that key and merge the model's reply back into the
// feed as a follow-up `impact-enrichment` event. The key is stored encrypted
// at rest (same safeStorage mechanism as the GitHub auth token) and is sent
// only to api.anthropic.com — never to ripplecheck.io. With no key set, the
// enrichment step is skipped entirely and the deterministic template stands.
// The prompt-building that used to live in ripplecheck-website/api/summarize.php
// is ported verbatim below; that endpoint has been removed.

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
// The user pays for this on their own key. Kept as the default the ported
// summarize.php used; this is a fast, bounded, non-streaming summarization call.
const ANTHROPIC_MODEL = "claude-opus-4-8";

const ANTHROPIC_KEY_PATH = path.join(app.getPath("userData"), "anthropic-key.bin");

/** Same encrypted-at-rest scheme as saveAuthToken: safeStorage encrypts in
 * memory, we persist the ciphertext next to auth-token.bin. If the OS keyring
 * is unavailable we refuse to write a plaintext key and report that back. */
function saveAnthropicKey(key) {
  if (!safeStorage.isEncryptionAvailable()) {
    console.error("RippleCheck: safeStorage encryption unavailable — not persisting Anthropic key.");
    return false;
  }
  fs.writeFileSync(ANTHROPIC_KEY_PATH, safeStorage.encryptString(key));
  return true;
}

function loadAnthropicKey() {
  try {
    return safeStorage.decryptString(fs.readFileSync(ANTHROPIC_KEY_PATH));
  } catch {
    return null;
  }
}

function clearAnthropicKey() {
  try {
    fs.unlinkSync(ANTHROPIC_KEY_PATH);
  } catch {
    // Already gone.
  }
}

// --- Multi-provider AI enrichment (BYOK) -----------------------------------
//
// Anthropic keeps its own dedicated path above (Messages API, anthropic-key.bin)
// — untouched. The other providers are all OpenAI-chat-completions-compatible,
// so they share one transport that only differs by base URL + model. Their
// config (provider id, key, and for "other" a custom base URL + model) lives
// encrypted in ai-provider.bin, exactly the same safeStorage scheme. Only one
// provider is ever active at a time (settings.aiProvider decides which).

const AI_PROVIDER_PRESETS = {
  anthropic: { label: "Anthropic", kind: "anthropic" },
  openai: { label: "OpenAI", kind: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  xai: { label: "xAI (Grok)", kind: "openai", baseUrl: "https://api.x.ai/v1", model: "grok-2-latest" },
  google: {
    label: "Google",
    kind: "openai",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.0-flash",
  },
  // "other" is fully user-supplied (base URL + model + key) — any
  // OpenAI-compatible endpoint.
  other: { label: "Other (OpenAI-compatible)", kind: "openai", baseUrl: "", model: "" },
};

const AI_PROVIDER_PATH = path.join(app.getPath("userData"), "ai-provider.bin");

/** Persists a non-Anthropic provider's { provider, apiKey, baseUrl, model }
 * encrypted at rest — same refusal-to-write-plaintext behavior as the keys. */
function saveAiProvider(config) {
  if (!safeStorage.isEncryptionAvailable()) {
    console.error("RippleCheck: safeStorage encryption unavailable — not persisting AI provider config.");
    return false;
  }
  fs.writeFileSync(AI_PROVIDER_PATH, safeStorage.encryptString(JSON.stringify(config)));
  return true;
}

function loadAiProvider() {
  try {
    const decoded = JSON.parse(safeStorage.decryptString(fs.readFileSync(AI_PROVIDER_PATH)));
    return decoded && typeof decoded === "object" ? decoded : null;
  } catch {
    return null;
  }
}

function clearAiProvider() {
  try {
    fs.unlinkSync(AI_PROVIDER_PATH);
  } catch {
    // Already gone.
  }
}

/**
 * Resolves the one active enrichment config, or null if enrichment is off.
 * Returns either { kind: "anthropic", apiKey } (the untouched Messages API
 * path) or { kind: "openai", apiKey, baseUrl, model, provider } (the shared
 * chat-completions path). Backward compatible: an install that only ever set
 * an Anthropic key (before aiProvider existed) still enriches via Anthropic.
 */
function resolveAiConfig() {
  const provider = loadSettings().aiProvider;

  if (!provider) {
    const apiKey = loadAnthropicKey();
    return apiKey ? { kind: "anthropic", apiKey } : null;
  }

  if (provider === "anthropic") {
    const apiKey = loadAnthropicKey();
    return apiKey ? { kind: "anthropic", apiKey } : null;
  }

  const stored = loadAiProvider();
  if (stored && stored.provider === provider && stored.apiKey) {
    const preset = AI_PROVIDER_PRESETS[provider] || {};
    return {
      kind: "openai",
      provider,
      apiKey: stored.apiKey,
      baseUrl: (stored.baseUrl || preset.baseUrl || "").replace(/\/+$/, ""),
      model: stored.model || preset.model || "",
    };
  }
  return null;
}

/** Non-secret view of the active provider for the renderer — never returns any
 * key, only whether one is set and where enrichment currently stands. */
function getAiProviderStatus() {
  const settings = loadSettings();
  const anthropicHasKey = loadAnthropicKey() !== null;
  const stored = loadAiProvider();

  let provider = settings.aiProvider;
  if (!provider && anthropicHasKey) provider = "anthropic"; // backward compat

  let hasKey = false;
  let baseUrl = "";
  let model = "";
  if (provider === "anthropic") {
    hasKey = anthropicHasKey;
  } else if (provider && stored && stored.provider === provider) {
    hasKey = Boolean(stored.apiKey);
    baseUrl = stored.baseUrl || AI_PROVIDER_PRESETS[provider]?.baseUrl || "";
    model = stored.model || AI_PROVIDER_PRESETS[provider]?.model || "";
  }

  return {
    provider: provider || null,
    hasKey,
    baseUrl,
    model,
    enabled: resolveAiConfig() !== null,
  };
}

// The key itself never crosses back to the renderer — only whether one is set,
// which is all the UI needs to reflect state and decide whether enrichment is
// expected.
ipcMain.handle("get-anthropic-key-status", () => ({ hasKey: loadAnthropicKey() !== null }));

// A non-empty value saves/replaces the key; an empty (or whitespace) value
// clears it. Returns { hasKey } so the renderer can update its state without
// ever seeing the key back.
ipcMain.handle("set-anthropic-key", (_event, key) => {
  const trimmed = typeof key === "string" ? key.trim() : "";
  if (trimmed === "") {
    clearAnthropicKey();
    return { hasKey: false };
  }
  const saved = saveAnthropicKey(trimmed);
  return { hasKey: saved, encryptionUnavailable: !saved };
});

// The renderer's single source of truth for AI-enrichment state (onboarding
// step + Settings). Never returns a key — only the active provider and whether
// it's configured.
ipcMain.handle("get-ai-provider", () => getAiProviderStatus());

/**
 * Saves the chosen provider and marks it active. Anthropic routes to the
 * existing anthropic-key.bin store (its request path stays separate/untouched);
 * every other provider serializes into ai-provider.bin. Switching providers
 * clears the other store so only one is ever configured at a time.
 */
ipcMain.handle("set-ai-provider", (_event, payload) => {
  const provider = payload?.provider;
  if (!VALID_AI_PROVIDERS.has(provider)) {
    return { ...getAiProviderStatus(), error: "invalid_provider" };
  }

  const apiKey = typeof payload?.apiKey === "string" ? payload.apiKey.trim() : "";
  const settings = loadSettings();

  if (provider === "anthropic") {
    if (apiKey === "") return { ...getAiProviderStatus(), error: "missing_key" };
    const saved = saveAnthropicKey(apiKey);
    if (!saved) return { ...getAiProviderStatus(), encryptionUnavailable: true };
    clearAiProvider();
  } else {
    if (apiKey === "") return { ...getAiProviderStatus(), error: "missing_key" };
    const preset = AI_PROVIDER_PRESETS[provider] || {};
    const baseUrl = typeof payload?.baseUrl === "string" && payload.baseUrl.trim() !== ""
      ? payload.baseUrl.trim()
      : preset.baseUrl || "";
    const model = typeof payload?.model === "string" && payload.model.trim() !== ""
      ? payload.model.trim()
      : preset.model || "";
    if (provider === "other" && (baseUrl === "" || model === "")) {
      return { ...getAiProviderStatus(), error: "missing_base_or_model" };
    }
    const saved = saveAiProvider({ provider, apiKey, baseUrl, model });
    if (!saved) return { ...getAiProviderStatus(), encryptionUnavailable: true };
    clearAnthropicKey();
  }

  settings.aiProvider = provider;
  saveSettings(settings);
  return getAiProviderStatus();
});

// Turns enrichment off entirely: clears whichever store the active provider
// used and unsets aiProvider so the deterministic template stands alone.
ipcMain.handle("remove-ai-provider", () => {
  const settings = loadSettings();
  clearAnthropicKey();
  clearAiProvider();
  settings.aiProvider = null;
  saveSettings(settings);
  return getAiProviderStatus();
});

/**
 * Makes ONE minimal real API call to verify a key/endpoint before the user
 * commits, so a bad key surfaces here instead of silently during a real scan.
 * Uses the typed config as given; if the key field was left blank it falls
 * back to whatever's already stored for that provider. Returns { ok } or
 * { ok: false, error } — never echoes the key.
 */
ipcMain.handle("test-ai-connection", async (_event, payload) => {
  const provider = payload?.provider;
  if (!VALID_AI_PROVIDERS.has(provider)) return { ok: false, error: "Invalid provider." };

  let apiKey = typeof payload?.apiKey === "string" ? payload.apiKey.trim() : "";
  if (apiKey === "") {
    // Fall back to the stored key for this provider so "Test" works from
    // Settings without re-typing.
    apiKey = provider === "anthropic" ? loadAnthropicKey() || "" : loadAiProvider()?.apiKey || "";
  }
  if (apiKey === "") return { ok: false, error: "Enter an API key first." };

  if (provider === "anthropic") {
    return testAnthropicConnection(apiKey);
  }

  const preset = AI_PROVIDER_PRESETS[provider] || {};
  const baseUrl = (
    (typeof payload?.baseUrl === "string" && payload.baseUrl.trim()) || preset.baseUrl || ""
  ).replace(/\/+$/, "");
  const model = (typeof payload?.model === "string" && payload.model.trim()) || preset.model || "";
  if (baseUrl === "" || model === "") return { ok: false, error: "Set a base URL and model first." };
  return testOpenAiConnection({ apiKey, baseUrl, model });
});

// Fast, free filename/path heuristics — a cheap first-pass purpose label so the
// model refines an existing guess instead of inventing one, cutting tokens and
// anchoring it to real naming conventions. Ported verbatim from summarize.php;
// matched against the lowercased path (so e.g. `use[A-Z]` is intentionally
// inert, exactly as it was server-side).
const FILE_PURPOSE_PATTERNS = [
  [/(^|\/)(login|signin|sign-in)/, "login page"],
  [/(^|\/)(register|signup|sign-up)/, "sign-up page"],
  [/(^|\/)(logout|signout)/, "logout flow"],
  [/auth|oauth|session|token|credential/, "authentication flow"],
  [/dashboard/, "dashboard view"],
  [/settings|preferences|config/, "settings/config"],
  [/(^|\/)api\/|route|endpoint|controller/, "API route/handler"],
  [/(^|\/)(index|home|main)\./, "entry point"],
  [/model|schema|entity|repository|\bdb\b/, "data/model layer"],
  [/util|helper|lib|shared|common/, "shared utility"],
  [/test|spec|__tests__|\.e2e\./, "test file"],
  [/component|widget|view|page/, "UI component"],
  [/style|\.css|\.scss/, "styling"],
  [/hook|use[A-Z]/, "React hook"],
  [/middleware|guard/, "middleware/guard"],
];

function guessFilePurpose(filePath) {
  const lower = filePath.replace(/\\/g, "/").toLowerCase();
  for (const [pattern, label] of FILE_PURPOSE_PATTERNS) {
    if (pattern.test(lower)) return label;
  }
  const ext = path.extname(lower).replace(/^\./, "");
  return ext !== "" ? `${ext} module` : "source file";
}

// Ported verbatim from summarize.php. Asks for a bare JSON object (no
// output_config.format) so it stays model-agnostic; we extract it defensively.
const ENRICH_SYSTEM_PROMPT = `You are the contextual-analysis layer for RippleCheck, a tool that maps which
functions and components in a JavaScript/TypeScript codebase are used where. A
developer just edited one file. You are given that changed file, the exported
symbols it defines that are used elsewhere ("findings", each with a risk level
and the exact files+lines that use them), and a fast filename-based purpose
guess for every involved file.

Respond with ONLY a single JSON object (no markdown, no code fences, no prose
before or after) with exactly these keys:
- "explanation": one plain-language sentence stating what the edit changes and
  what could break downstream. Concrete, not generic.
- "files": an array of {"file": string, "purpose": string} — refine each
  provided guess into a specific likely purpose inferred from the path/name.
  Include only files that appear in the input.
- "fixPrompt": a specific, context-aware prompt the developer could paste into
  an AI coding assistant to safely update every affected call site for THIS
  change. Name the actual symbols and files involved; do not be generic.

When a finding's "usedIn" is empty, nothing else in the codebase depends on that
symbol. If every finding is used nowhere, the change is safe: make "explanation"
say the change looks safe and nothing else in the codebase depends on what
changed, and set "fixPrompt" to a brief note that no downstream call sites need
updating.

Be precise and grounded in the given data. Never invent files or symbols that
are not in the input.`;

/**
 * Pull the JSON object out of the model's text reply, tolerating ```json
 * fences or stray prose despite the instructions. Ported from summarize.php's
 * extractJsonObject.
 */
function extractJsonObject(text) {
  const trimmed = String(text).trim().replace(/^```(?:json)?\s*|\s*```$/gi, "");
  try {
    const decoded = JSON.parse(trimmed);
    if (decoded && typeof decoded === "object") return decoded;
  } catch {
    // Fall through to the first-{ … last-} span.
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const decoded = JSON.parse(trimmed.slice(start, end + 1));
      if (decoded && typeof decoded === "object") return decoded;
    } catch {
      // Give up — caller treats null as "no enrichment".
    }
  }
  return null;
}

const ENRICH_CACHE_TTL_MS = 3 * 60 * 1000;
const ENRICH_TIMEOUT_MS = 12_000;
// Keyed on changedFile + findings so identical repeated scans (a comment-only
// save, an undo/redo) reuse one in-flight/settled request for a few minutes
// instead of hitting the API again on every keystroke-triggered save.
const enrichCache = new Map();

function enrichCacheKey(changedFileLabel, findings, aiConfig) {
  // Discriminate by provider/model too, so switching providers mid-session
  // doesn't reuse the previous one's cached summary for the same scan.
  const providerTag = `${aiConfig.kind}:${aiConfig.provider ?? ""}:${aiConfig.model ?? ""}`;
  return crypto
    .createHash("sha1")
    .update(`${providerTag}\n${changedFileLabel}\n${JSON.stringify(findings)}`)
    .digest("hex");
}

/** Builds the bounded user-message JSON the model sees. Shared by every
 * provider so the prompt is identical regardless of transport (the same
 * bounding summarize.php did: 40 findings, 20 usages each). */
function buildEnrichmentUserPayload(changedFile, findings) {
  const boundedFindings = findings.slice(0, 40).map((finding) => ({
    name: finding.name,
    riskLevel: finding.riskLevel ?? "unknown",
    usedIn: (finding.usedIn ?? []).slice(0, 20).map((usage) => ({
      file: usage.file,
      line: usage.line ?? 0,
    })),
  }));

  const involvedFiles = [changedFile];
  for (const finding of boundedFindings) {
    for (const usage of finding.usedIn) involvedFiles.push(usage.file);
  }
  const filePurposeGuesses = [...new Set(involvedFiles)].map((file) => ({
    file,
    guess: guessFilePurpose(file),
  }));

  return JSON.stringify({ changedFile, filePurposeGuesses, findings: boundedFindings }, null, 2);
}

/** Turns a model's raw text reply into the enrichment object, or null if it
 * didn't produce the required shape. Shared by both transports. */
function normalizeEnrichment(changedFile, replyText, model) {
  const parsed = extractJsonObject(replyText);
  if (!parsed || typeof parsed.explanation !== "string" || typeof parsed.fixPrompt !== "string") {
    return null;
  }
  const files = Array.isArray(parsed.files)
    ? parsed.files
        .filter((item) => item && typeof item.file === "string" && typeof item.purpose === "string")
        .map((item) => ({ file: item.file, purpose: item.purpose }))
    : [];
  return { changedFile, explanation: parsed.explanation, files, fixPrompt: parsed.fixPrompt, model };
}

/** Anthropic Messages API transport (x-api-key + anthropic-version, content
 * blocks). The system prompt is a parameter so the one transport serves both
 * per-edit enrichment and the whole-repo overview. */
async function callAnthropic(apiKey, systemPrompt, userPayload, signal) {
  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPayload }],
    }),
    signal,
  });
  if (!response.ok) return null; // bad key (401), rate limit (429), etc.
  const apiBody = await response.json();
  let replyText = "";
  for (const block of apiBody?.content ?? []) {
    if (block?.type === "text") replyText += block.text ?? "";
  }
  return replyText;
}

/** OpenAI chat-completions transport — shared by OpenAI, xAI, Google, and any
 * "Other (OpenAI-compatible)" endpoint. The system prompt becomes a system
 * message; the reply is choices[0].message.content. */
async function callOpenAiCompatible({ apiKey, baseUrl, model }, systemPrompt, userPayload, signal) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPayload },
      ],
    }),
    signal,
  });
  if (!response.ok) return null;
  const apiBody = await response.json();
  return apiBody?.choices?.[0]?.message?.content ?? "";
}

/** One request to whichever transport the resolved config selects, with the
 * given system prompt. Returns the model's raw text reply, or null on a
 * non-OK response. Shared by per-edit enrichment and the repo overview. */
async function dispatchToModel(aiConfig, systemPrompt, userPayload, signal) {
  if (aiConfig.kind === "anthropic") {
    return callAnthropic(aiConfig.apiKey, systemPrompt, userPayload, signal);
  }
  return callOpenAiCompatible(aiConfig, systemPrompt, userPayload, signal);
}

/** Dispatches a per-edit enrichment and normalizes the reply. Times out / fails
 * silently → null, so enrichment never blocks or breaks the deterministic
 * result already on screen. */
async function summarizeImpact(aiConfig, changedFile, findings) {
  const userPayload = buildEnrichmentUserPayload(changedFile, findings);
  const model = aiConfig.kind === "anthropic" ? ANTHROPIC_MODEL : aiConfig.model;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ENRICH_TIMEOUT_MS);
  try {
    const replyText = await dispatchToModel(aiConfig, ENRICH_SYSTEM_PROMPT, userPayload, controller.signal);
    if (replyText === null) return null;
    return normalizeEnrichment(changedFile, replyText, model);
  } catch {
    // Timeout, offline, aborted, or malformed response — caller falls back to
    // the deterministic template.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// --- Whole-repo overview (one-time, on watch start) ------------------------
//
// A single repo-level summary generated once right after a folder/zip/repo
// starts being watched, distinct from the per-edit enrichment above. Reuses the
// same resolved AI config + transports, just with a repo-scoped system prompt
// and a payload describing the full initial scan instead of one edit.

const REPO_OVERVIEW_SYSTEM_PROMPT = `You are the contextual-analysis layer for RippleCheck, a tool that maps which
functions and components in a JavaScript/TypeScript codebase are used where. You
are given a whole-repository summary from a fresh full scan: the repo name, how
many tracked functions/components were found, across how many files, a breakdown
by risk level (safe = used nowhere else, moderate = used in 1-2 other files,
high = used in 3+ other files), and the highest-fan-out symbols by name.

Respond with ONLY a single JSON object (no markdown, no code fences, no prose
before or after) with exactly one key:
- "overview": one or two plain-language sentences giving the developer a quick
  read on this repo's shape and where change is riskiest. State the totals, and
  call out that high-risk symbols are used in many places and are worth extra
  care when changed — naming a couple of the actual high-fan-out symbols if any
  exist. If there are no concerning symbols, say the repo looks low-risk to
  change. Be concrete and grounded in the given numbers; never invent symbols or
  counts that are not in the input.`;

/** Bounded repo-level JSON the model sees for the overview (top symbols capped
 * so the payload stays small regardless of repo size). */
function buildRepoOverviewPayload(stats) {
  return JSON.stringify(
    {
      repo: stats.folderName,
      totalFunctions: stats.totalFunctions,
      fileCount: stats.fileCount,
      riskBreakdown: stats.counts,
      highFanOutSymbols: stats.topFindings,
    },
    null,
    2
  );
}

/** Generates the one-sentence-ish repo overview, or null on timeout/failure/bad
 * shape. Same timeout + JSON-extraction discipline as summarizeImpact. */
async function summarizeRepoOverview(aiConfig, stats) {
  const userPayload = buildRepoOverviewPayload(stats);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ENRICH_TIMEOUT_MS);
  try {
    const replyText = await dispatchToModel(
      aiConfig,
      REPO_OVERVIEW_SYSTEM_PROMPT,
      userPayload,
      controller.signal
    );
    if (replyText === null) return null;
    const parsed = extractJsonObject(replyText);
    if (!parsed || typeof parsed.overview !== "string" || parsed.overview.trim() === "") return null;
    return { overview: parsed.overview.trim() };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fire-and-forget repo overview enrichment: calls the model, then emits the
 * result as a `repo-overview-summary` event. Keyed by folderPath so a summary
 * for a folder that's since been switched away from is dropped rather than
 * shown against the wrong project. On failure emits `{ error: true }` so the
 * renderer can quietly drop the pending state (the gauge stands on its own).
 */
async function enrichRepoOverview(folderPath, stats, aiConfig) {
  const summary = await summarizeRepoOverview(aiConfig, stats);

  if (!(mainWindow && !mainWindow.isDestroyed())) return;
  if (watchedFolder !== folderPath) return; // folder changed during the round-trip

  if (!summary) {
    mainWindow.webContents.send("repo-overview-summary", { folderPath, error: true });
    return;
  }
  mainWindow.webContents.send("repo-overview-summary", { folderPath, overview: summary.overview });
}

// --- Connection tests (one minimal real call, used by "Test connection") ----

const TEST_TIMEOUT_MS = 10_000;

async function testAnthropicConnection(apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
  try {
    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 8,
        messages: [{ role: "user", content: "ping" }],
      }),
      signal: controller.signal,
    });
    if (response.ok) return { ok: true };
    return { ok: false, error: `Anthropic rejected the key (HTTP ${response.status}).` };
  } catch {
    return { ok: false, error: "Couldn't reach Anthropic. Check your connection." };
  } finally {
    clearTimeout(timer);
  }
}

async function testOpenAiConnection({ apiKey, baseUrl, model }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, max_tokens: 8, messages: [{ role: "user", content: "ping" }] }),
      signal: controller.signal,
    });
    if (response.ok) return { ok: true };
    return { ok: false, error: `Endpoint rejected the request (HTTP ${response.status}).` };
  } catch {
    return { ok: false, error: "Couldn't reach that endpoint. Check the base URL and your connection." };
  } finally {
    clearTimeout(timer);
  }
}

async function enrichImpact({ timestamp, changedFileLabel, entries }) {
  const aiConfig = resolveAiConfig();
  if (!aiConfig) return; // BYOK: no provider configured → keep the template.

  // Every real finding is included, even "safe" ones with no downstream usages,
  // so that a configured key always yields an AI summary — including the
  // all-safe case (the model then says nothing else depends on the change).
  // Only pure note/diagnostic entries (no name/riskLevel) are dropped.
  const findings = entries
    .filter((entry) => entry.name && entry.riskLevel)
    .map((entry) => ({
      name: entry.name,
      riskLevel: entry.riskLevel,
      usedIn: (entry.usedIn ?? []).map((usage) => ({ file: usage.file, line: usage.line })),
    }));
  if (findings.length === 0) return; // only notes/diagnostics — nothing to summarize.

  const key = enrichCacheKey(changedFileLabel, findings, aiConfig);
  const now = Date.now();
  const cached = enrichCache.get(key);

  let enrichment;
  if (cached && cached.expires > now) {
    // Reuse the in-flight or already-resolved request for this exact scan.
    enrichment = await cached.promise;
  } else {
    const promise = summarizeImpact(aiConfig, changedFileLabel, findings);
    enrichCache.set(key, { promise, expires: now + ENRICH_CACHE_TTL_MS });
    enrichment = await promise;
    if (!enrichment) {
      enrichCache.delete(key); // Don't cache failures — retry on the next save.
    }
  }

  // The folder may have changed or the window closed during the round-trip.
  // `timestamp` lets the renderer ignore enrichment for a scan it has already
  // replaced.
  if (!(mainWindow && !mainWindow.isDestroyed())) return;

  if (!enrichment) {
    // Enrichment was attempted (a provider is configured + there were findings)
    // but failed — bad key, offline, timeout, rate limit. Tell the renderer so
    // it can show a calm error state instead of leaving the loading skeleton
    // spinning or the banner silently vanishing. Purely a UI signal; the
    // deterministic result is already on screen and unaffected.
    mainWindow.webContents.send("impact-enrichment", { timestamp, changedFile: changedFileLabel, error: true });
    return;
  }

  mainWindow.webContents.send("impact-enrichment", { timestamp, ...enrichment });
}

/**
 * Coalesces a burst of rapid changes — an AI assistant rewriting several
 * files, a save touching many — into a single report once the edits settle.
 *
 * Two things happen per event, deliberately at different speeds:
 *   • the warm project is refreshed *now*, so state stays correct;
 *   • the report timer is restarted, so the user sees one report describing
 *     the finished burst rather than one mid-edit report per file.
 */
function scheduleScan(changedPath) {
  pendingChangedPaths.push(changedPath);
  applyChangesToWarmProject([changedPath]);
  settleScheduler.notify();
}

function startWatching(folderPath) {
  stopWatching();
  watchedFolder = folderPath;
  built = null;

  const detectedTool = detectTool(folderPath);
  const techStacks = detectTechStacks(folderPath);
  const folderName = path.basename(folderPath);

  watcher = watch(folderPath, {
    ignored: pathHasIgnoredSegment,
    ignoreInitial: true,
    persistent: true,
  });

  watcher.on("all", (_eventName, changedPath) => {
    scheduleScan(changedPath);
  });

  mainWindow?.webContents.send("watching-started", { folderPath, folderName, detectedTool, techStacks });

  // One-time full-repo overview (gauge + optional AI summary). Deferred so the
  // watching-started view paints before the (potentially heavier) full scan
  // runs; it also warms `built` for the first real edit.
  setImmediate(() => runInitialOverview(folderPath));
}

ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const [folderPath] = result.filePaths;
  // Remember this real on-disk folder so the next launch re-opens it (the
  // "store the choice so relaunching doesn't ask again" onboarding promise).
  // Only genuine directory picks are persisted — not zip/repo temp dirs.
  const settings = loadSettings();
  settings.lastFolderPath = folderPath;
  saveSettings(settings);
  startWatching(folderPath);
  return folderPath;
});

const appIconPath = path.join(currentDirPath, "..", "..", "assets", "app-icon.png");

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    backgroundColor: "#0A0A0A",
    icon: appIconPath,
    webPreferences: {
      preload: path.join(currentDirPath, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(currentDirPath, "renderer.html"));

  mainWindow.webContents.once("did-finish-load", () => {
    refreshAuthState();

    // Returning user (onboarding already done): re-open the last real folder
    // they watched so they land straight back in their project instead of the
    // empty state. Guarded by existsSync so a moved/deleted folder just falls
    // through to the empty state rather than erroring. Only runs post-
    // onboarding — during first-run the overlay drives project selection.
    const settings = loadSettings();
    if (settings.onboardingComplete && settings.lastFolderPath && fs.existsSync(settings.lastFolderPath)) {
      startWatching(settings.lastFolderPath);
    }
  });
}

app.whenReady().then(() => {
  // Window icon above covers Windows/Linux; macOS shows app identity via the
  // Dock instead, which needs its own explicit call.
  if (process.platform === "darwin") {
    app.dock?.setIcon(appIconPath);
  }
  createWindow();

  // Windows/Linux cold-launch via the protocol: unlike a second-instance
  // redirect, there's no other running process to catch this — the URL
  // just shows up in our own argv on the very first launch.
  const coldLaunchUrl = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
  if (coldLaunchUrl) handleAuthCallback(coldLaunchUrl);
});

app.on("window-all-closed", () => {
  stopWatching();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
