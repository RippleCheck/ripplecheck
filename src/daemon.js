#!/usr/bin/env node
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { watch } from "chokidar";
import {
  buildProjectForDirectory,
  computeScanResult,
  hasSkippedDirectorySegment,
  refreshOrAddFile,
  walkFiles,
} from "./scanner.js";
import { explainImpact, formatEntriesAsText } from "./explain.js";

const PORT_FILE_NAME = ".ripplecheck-daemon-port";
// Kept in sync with daemon-client.js's LOG_FILE_NAME: the daemon's stdout/stderr
// are redirected here, so the watcher must ignore it (and the port file) or its
// own log writes would trip an endless refresh loop.
const LOG_FILE_NAME = ".ripplecheck-daemon.log";
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
// Coalesce a burst of file events (a save touching several files, a branch
// switch) into one incremental refresh — same idea as the desktop app's watcher.
const WATCH_DEBOUNCE_MS = 300;
const IGNORED_FILE_NAMES = new Set([PORT_FILE_NAME, LOG_FILE_NAME]);

const projectDir = path.resolve(process.argv[2] ?? process.cwd());
const portFilePath = path.join(projectDir, PORT_FILE_NAME);

// Built lazily on the first request, then kept warm in memory for every request
// after that — this is the whole point of the daemon. Once a client connects, a
// chokidar watcher (below) also keeps `built` in sync with edits made directly
// on disk outside any AI tool, so the warm project never goes stale between calls.
let built = null;
let idleTimer = null;
let server = null;
let watcher = null;
let watchDebounceTimer = null;
let pendingChangedPaths = [];

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(shutdown, IDLE_TIMEOUT_MS);
  idleTimer.unref();
}

function cleanUpPortFile() {
  try {
    const recordedPort = fs.readFileSync(portFilePath, "utf8").trim();
    const ourPort = String(server?.address()?.port ?? "");
    if (recordedPort === ourPort) {
      fs.unlinkSync(portFilePath);
    }
  } catch {
    // Port file already gone, or never written — nothing to clean up.
  }
}

function shutdown() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  if (watchDebounceTimer) {
    clearTimeout(watchDebounceTimer);
    watchDebounceTimer = null;
  }
  cleanUpPortFile();
  process.exit(0);
}

/**
 * Skips the directories the scan itself skips (dependencies, VCS internals,
 * build output — delegated to scanner.js so the two can't drift apart), plus
 * the daemon's own port/log files, which would otherwise self-trigger an
 * endless refresh loop.
 */
function isIgnoredPath(candidatePath) {
  // Relative to the project root, so a project that itself lives under some
  // `.../dist/...` path isn't ignored wholesale (chokidar passes absolutes).
  if (hasSkippedDirectorySegment(path.relative(projectDir, candidatePath))) return true;
  const segments = candidatePath.split(path.win32.sep).flatMap((part) => part.split(path.posix.sep));
  return IGNORED_FILE_NAMES.has(segments[segments.length - 1]);
}

/**
 * Applies a coalesced batch of file-system changes to the warm project using
 * the daemon's existing incremental path (refreshOrAddFile, with a full-rebuild
 * fallback), so an edit made directly on disk — outside any AI tool — is
 * reflected before the next check_impact call arrives. Resets the idle timer so
 * active editing keeps the watcher alive.
 */
function refreshFromWatch() {
  const changedPaths = pendingChangedPaths;
  pendingChangedPaths = [];

  // Nothing warm to update yet — the next request builds from scratch and picks
  // up these changes anyway.
  if (!built) return;

  resetIdleTimer();

  try {
    for (const changedPath of changedPaths) {
      const handledIncrementally = refreshOrAddFile(built, changedPath);
      if (!handledIncrementally) {
        built = buildProjectForDirectory(projectDir);
        break;
      }
    }
    built.allFilePaths = walkFiles(built.absoluteProjectPath);
  } catch (error) {
    // A refresh blew up (file vanished mid-read, etc.) — drop the warm project
    // so the next request rebuilds cleanly.
    built = null;
    console.log(`RippleCheck daemon: watch refresh failed (${error.message}); will rebuild on next request`);
    return;
  }

  console.log(`RippleCheck daemon: picked up ${changedPaths.length} file change(s) from disk`);
}

/** Coalesces rapid change events into a single refresh, mirroring the app. */
function scheduleWatchRefresh(changedPath) {
  pendingChangedPaths.push(changedPath);
  if (watchDebounceTimer) clearTimeout(watchDebounceTimer);
  watchDebounceTimer = setTimeout(() => {
    watchDebounceTimer = null;
    refreshFromWatch();
  }, WATCH_DEBOUNCE_MS);
}

/**
 * Starts a persistent background watcher on the project the first time a client
 * connects (idempotent — later calls are no-ops). From then on, disk edits keep
 * the warm project current via scheduleWatchRefresh, independent of MCP calls.
 * Same chokidar mechanism the desktop app uses.
 */
function startWatchingIfNeeded() {
  if (watcher) return;

  watcher = watch(projectDir, {
    ignored: isIgnoredPath,
    ignoreInitial: true,
    persistent: true,
  });
  watcher.on("all", (_eventName, changedPath) => scheduleWatchRefresh(changedPath));

  console.log(`RippleCheck daemon: watching ${projectDir} for changes`);
}

/**
 * Handles one impact check for filePath: builds the project on the first
 * call, then on every later call only refreshes the one file that changed
 * (falling back to a full rebuild if the file can't be refreshed in place,
 * e.g. a new/edited .html file).
 */
function handleRequest(filePath) {
  if (!built) {
    built = buildProjectForDirectory(projectDir);
  } else {
    const handledIncrementally = refreshOrAddFile(built, filePath);
    if (!handledIncrementally) {
      built = buildProjectForDirectory(projectDir);
    } else {
      built.allFilePaths = walkFiles(built.absoluteProjectPath);
    }
  }

  // First client connection arms the persistent background watcher; idempotent
  // on every later call. Purely a side effect — the response below is unchanged.
  startWatchingIfNeeded();

  const scanResult = computeScanResult(built);
  return formatEntriesAsText(explainImpact(scanResult));
}

server = net.createServer((socket) => {
  let buffer = "";
  socket.setEncoding("utf8");

  socket.on("data", (chunk) => {
    buffer += chunk;
    const newlineIndex = buffer.indexOf("\n");
    if (newlineIndex === -1) return;

    resetIdleTimer();
    const line = buffer.slice(0, newlineIndex);

    let response;
    try {
      const request = JSON.parse(line);
      const text = handleRequest(path.resolve(request.filePath));
      response = { ok: true, text };
    } catch (error) {
      response = { ok: false, error: error.message };
    }

    socket.end(`${JSON.stringify(response)}\n`);
  });

  socket.on("error", () => {
    // Client disconnected mid-request — nothing more to do for this socket.
  });
});

server.on("error", (error) => {
  process.stderr.write(`RippleCheck daemon: server error: ${error.message}\n`);
  process.exit(1);
});

server.listen(0, "127.0.0.1", () => {
  const { port } = server.address();
  fs.writeFileSync(portFilePath, String(port));
  resetIdleTimer();
});

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
