const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("rippleCheck", {
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  selectZipAndWatch: () => ipcRenderer.invoke("select-zip-and-watch"),
  onWatchingStarted: (callback) => {
    ipcRenderer.on("watching-started", (_event, data) => callback(data));
  },
  onImpactUpdate: (callback) => {
    ipcRenderer.on("impact-update", (_event, data) => callback(data));
  },
  onImpactEnrichment: (callback) => {
    ipcRenderer.on("impact-enrichment", (_event, data) => callback(data));
  },
  // One-time whole-repo overview after a folder/zip/repo starts being watched:
  // `repo-overview` carries the deterministic gauge data (risk counts, totals);
  // `repo-overview-summary` follows async with the optional AI summary text.
  onRepoOverview: (callback) => {
    ipcRenderer.on("repo-overview", (_event, data) => callback(data));
  },
  onRepoOverviewSummary: (callback) => {
    ipcRenderer.on("repo-overview-summary", (_event, data) => callback(data));
  },
  loginWithGithub: () => ipcRenderer.invoke("login-with-github"),
  onAuthState: (callback) => {
    ipcRenderer.on("auth-state", (_event, data) => callback(data));
  },
  fetchCloudHistory: () => ipcRenderer.invoke("fetch-cloud-history"),
  fetchGithubRepos: () => ipcRenderer.invoke("fetch-github-repos"),
  downloadAndWatchRepo: (fullName) => ipcRenderer.invoke("download-and-watch-repo", fullName),
  onRepoCloneProgress: (callback) => {
    ipcRenderer.on("repo-clone-progress", (_event, data) => callback(data));
  },
  getCliInfo: () => ipcRenderer.invoke("get-cli-info"),
  refreshCliInfo: () => ipcRenderer.invoke("refresh-cli-info"),
  checkMcpStatus: () => ipcRenderer.invoke("check-mcp-status"),
  copyToClipboard: (text) => ipcRenderer.invoke("copy-to-clipboard", text),
  signOut: () => ipcRenderer.invoke("sign-out"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  resetScanCache: () => ipcRenderer.invoke("reset-scan-cache"),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  setDetailLevel: (detailLevel) => ipcRenderer.invoke("set-detail-level", detailLevel),
  // How long the watcher waits for edits to settle before showing a report.
  setSettleWindow: (settleWindowMs) => ipcRenderer.invoke("set-settle-window", settleWindowMs),
  // Re-scans and reports what happened to one finding: { status, sentence,
  // usedIn } where status is "fixed" | "unchanged" | "changed", or { error }.
  retestFinding: (finding) => ipcRenderer.invoke("retest-finding", finding),
  setPlatform: (platform) => ipcRenderer.invoke("set-platform", platform),
  setOnboardingComplete: () => ipcRenderer.invoke("set-onboarding-complete"),
  setFixPromptHintDismissed: () => ipcRenderer.invoke("set-fix-prompt-hint-dismissed"),
  // BYOK Anthropic key: status is a boolean (never the key itself); setting an
  // empty string clears it. The key is stored encrypted in the main process.
  getAnthropicKeyStatus: () => ipcRenderer.invoke("get-anthropic-key-status"),
  setAnthropicKey: (key) => ipcRenderer.invoke("set-anthropic-key", key),
  // BYOK AI provider (Anthropic / OpenAI / xAI / Google / Other). Status never
  // includes the key itself — only the active provider and whether one is set.
  getAiProvider: () => ipcRenderer.invoke("get-ai-provider"),
  setAiProvider: (config) => ipcRenderer.invoke("set-ai-provider", config),
  removeAiProvider: () => ipcRenderer.invoke("remove-ai-provider"),
  testAiConnection: (config) => ipcRenderer.invoke("test-ai-connection", config),
});
