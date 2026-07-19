import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT_FILE_NAME = ".ripplecheck-daemon-port";
const LOG_FILE_NAME = ".ripplecheck-daemon.log";
const WARM_REQUEST_TIMEOUT_MS = 5000;
const FIRST_REQUEST_TIMEOUT_MS = 30000;
const DAEMON_READY_TIMEOUT_MS = 30000;
const DAEMON_READY_POLL_INTERVAL_MS = 100;

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const daemonScriptPath = path.join(currentDirPath, "daemon.js");

function readPortFile(portFilePath) {
  try {
    const port = Number(fs.readFileSync(portFilePath, "utf8").trim());
    return Number.isInteger(port) && port > 0 ? port : null;
  } catch {
    return null;
  }
}

function sendRequestToDaemon(port, filePath, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ port, host: "127.0.0.1" });
    let buffer = "";

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("daemon request timed out"));
    }, timeoutMs);

    socket.on("connect", () => {
      socket.end(`${JSON.stringify({ filePath })}\n`);
    });

    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buffer += chunk;
    });

    socket.on("end", () => {
      clearTimeout(timer);
      try {
        const response = JSON.parse(buffer.trim());
        if (response.ok) {
          resolve(response.text);
        } else {
          reject(new Error(response.error || "daemon returned an error"));
        }
      } catch (error) {
        reject(error);
      }
    });

    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function spawnDaemon(projectDir) {
  const logFilePath = path.join(projectDir, LOG_FILE_NAME);
  const logFd = fs.openSync(logFilePath, "a");

  const child = spawn(process.execPath, [daemonScriptPath, projectDir], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    cwd: projectDir,
  });

  fs.closeSync(logFd);
  child.unref();
}

async function waitForDaemonReady(portFilePath, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const port = readPortFile(portFilePath);
    if (port !== null) return port;
    await new Promise((resolve) => setTimeout(resolve, DAEMON_READY_POLL_INTERVAL_MS));
  }

  return null;
}

/**
 * Tries the warm daemon first; spawns one (detached, survives after this
 * process exits) if none is running or the existing one is dead. Throws if
 * the daemon route can't be made to work at all, so the caller can fall
 * back to a plain one-off scan.
 */
async function getImpactSummaryViaDaemon(projectDir, editedFilePath) {
  const portFilePath = path.join(projectDir, PORT_FILE_NAME);
  const existingPort = readPortFile(portFilePath);

  if (existingPort !== null) {
    try {
      return await sendRequestToDaemon(existingPort, editedFilePath, WARM_REQUEST_TIMEOUT_MS);
    } catch {
      try {
        fs.unlinkSync(portFilePath);
      } catch {
        // Already gone.
      }
    }
  }

  spawnDaemon(projectDir);
  const newPort = await waitForDaemonReady(portFilePath, DAEMON_READY_TIMEOUT_MS);
  if (newPort === null) {
    throw new Error("daemon did not start in time");
  }

  return sendRequestToDaemon(newPort, editedFilePath, FIRST_REQUEST_TIMEOUT_MS);
}

export { getImpactSummaryViaDaemon };
