const selectFolderButton = document.getElementById("select-folder-button");
const selectFolderButtonEmpty = document.getElementById("select-folder-button-empty");
const uploadZipButton = document.getElementById("upload-zip-button");
const uploadZipStatus = document.getElementById("upload-zip-status");
const folderPill = document.getElementById("folder-pill");
const folderPathLabel = document.getElementById("folder-path");
const toolBadge = document.getElementById("tool-badge");
const toolBadgeIcon = document.getElementById("tool-badge-icon");
const toolBadgeLabel = document.getElementById("tool-badge-label");
const connPill = document.getElementById("conn-pill");
const connLabel = document.getElementById("conn-label");
const emptyState = document.getElementById("empty-state");
const watchingState = document.getElementById("watching-state");
const watchingFolderCode = document.getElementById("watching-folder-code");
const entryList = document.getElementById("entry-list");
const endSessionButton = document.getElementById("end-session-button");
const pulseLine = document.getElementById("pulse-line");
const modeTabs = document.querySelectorAll(".sidebar-nav-item");
const modeProject = document.getElementById("mode-project");
const modeCloud = document.getElementById("mode-cloud");
const modeCli = document.getElementById("mode-cli");

const sidebarStack = document.getElementById("sidebar-stack");
const sidebarStackFolderName = document.getElementById("sidebar-stack-folder-name");
const sidebarStackBadges = document.getElementById("sidebar-stack-badges");

const sidebarUserSignedIn = document.getElementById("sidebar-user-signed-in");
const sidebarUserAvatar = document.getElementById("sidebar-user-avatar");
const sidebarUserName = document.getElementById("sidebar-user-name");
const sidebarLoginButton = document.getElementById("sidebar-login-button");
const settingsOpenButton = document.getElementById("settings-open-button");

const settingsScrim = document.getElementById("settings-scrim");
const settingsPanel = document.getElementById("settings-panel");
const settingsCloseButton = document.getElementById("settings-close-button");
const settingsUsername = document.getElementById("settings-username");
const settingsVersion = document.getElementById("settings-version");
const settingsSignoutButton = document.getElementById("settings-signout-button");
const settingsResetCacheButton = document.getElementById("settings-reset-cache-button");
const settingsCacheToast = document.getElementById("settings-cache-toast");
const detailLevelInputs = document.querySelectorAll('input[name="detail-level"]');
const detailLevelTabsContainer = document.getElementById("detail-level-tabs");
const detailLevelTabs = detailLevelTabsContainer.querySelectorAll(".detail-level-tab");
const platformBarClaudeCodeBadge = document.getElementById("platform-badge-claude-code");

const cloudRepoSection = document.getElementById("cloud-repo-section");
const cloudBrowseReposButton = document.getElementById("cloud-browse-repos-button");
const cloudRepoStatus = document.getElementById("cloud-repo-status");
const cloudRepoList = document.getElementById("cloud-repo-list");

const cloudLoggedOut = document.getElementById("cloud-logged-out");
const cloudLoading = document.getElementById("cloud-loading");
const cloudEmpty = document.getElementById("cloud-empty");
const cloudError = document.getElementById("cloud-error");
const cloudList = document.getElementById("cloud-list");
const loginGithubButtonCloud = document.getElementById("login-github-button-cloud");

const cliCommandText = document.getElementById("cli-command-text");
const cliRefreshButton = document.getElementById("cli-refresh-button");
const cliCopyButton = document.getElementById("cli-copy-button");
const cliStatusPill = document.getElementById("cli-status-pill");
const cliStatusLabel = document.getElementById("cli-status-label");

// Onboarding overlay (5 steps: login → project → agent → AI provider → detail)
const onboarding = document.getElementById("onboarding");
const onboardingSteps = document.getElementById("onboarding-steps");
const onboardingProgress = document.getElementById("onboarding-progress");
const onboardingPanels = {
  1: document.getElementById("onboarding-panel-1"),
  2: document.getElementById("onboarding-panel-2"),
  3: document.getElementById("onboarding-panel-3"),
  4: document.getElementById("onboarding-panel-4"),
  5: document.getElementById("onboarding-panel-5"),
};
// Step 1 — login
const onboardingLoginBtn = document.getElementById("onboarding-login-btn");
const onboardingSignedIn = document.getElementById("onboarding-signed-in");
const onboardingSignedInName = document.getElementById("onboarding-signed-in-name");
const onboardingLoginNote = document.getElementById("onboarding-login-note");
const onboardingNext1 = document.getElementById("onboarding-next-1");
// Step 2 — project source (folder / zip / repos) + inline repo browser
const onboardingSources = {
  folder: document.getElementById("onboarding-source-folder"),
  zip: document.getElementById("onboarding-source-zip"),
  repos: document.getElementById("onboarding-source-repos"),
};
const onboardingSourceStatus = document.getElementById("onboarding-source-status");
const onboardingBack2 = document.getElementById("onboarding-back-2");
const onboardingRepoBrowser = document.getElementById("onboarding-repo-browser");
const onboardingRepoStatus = document.getElementById("onboarding-repo-status");
const onboardingRepoList = document.getElementById("onboarding-repo-list");
// Step 3 — coding agent
const onboardingAgentGrid = document.getElementById("onboarding-agent-grid");
const onboardingBack3 = document.getElementById("onboarding-back-3");
const onboardingNext3 = document.getElementById("onboarding-next-3");
// Step 4 — AI provider
const onboardingAiForm = document.getElementById("onboarding-ai-form");
const onboardingAiStatus = document.getElementById("onboarding-ai-status");
const onboardingBack4 = document.getElementById("onboarding-back-4");
const onboardingSkip4 = document.getElementById("onboarding-skip-4");
const onboardingNext4 = document.getElementById("onboarding-next-4");
// Step 5 — detail level
const onboardingDetailInputs = document.querySelectorAll('input[name="onboarding-detail-level"]');
const onboardingBack5 = document.getElementById("onboarding-back-5");
const onboardingFinish = document.getElementById("onboarding-finish");

// Persistent LLM summary (top of Project view)
const projectSummary = document.getElementById("project-summary");
const projectSummaryText = document.getElementById("project-summary-text");
const projectSummaryFile = document.getElementById("project-summary-file");
const projectSummaryFiles = document.getElementById("project-summary-files");

// One-time whole-repo overview (gauge + optional AI summary), shown after a
// folder/zip/repo starts being watched.
const repoOverview = document.getElementById("repo-overview");
const repoOverviewFolder = document.getElementById("repo-overview-folder");
const repoGauge = document.getElementById("repo-gauge");
const repoOverviewMetrics = document.getElementById("repo-overview-metrics");
const repoOverviewLegend = document.getElementById("repo-overview-legend");
const repoOverviewAi = document.getElementById("repo-overview-ai");

// Settings additions
const settingsPlatform = document.getElementById("settings-platform");
const settingsRerunOnboardingButton = document.getElementById("settings-rerun-onboarding-button");
const settingsAiForm = document.getElementById("settings-ai-form");
const settingsAiTestButton = document.getElementById("settings-ai-test");
const settingsAiSaveButton = document.getElementById("settings-ai-save");
const settingsAiRemoveButton = document.getElementById("settings-ai-remove");
const settingsAiStatus = document.getElementById("settings-ai-status");

// First-run dashboard callout pointing at "Generate fix prompt".
const fixPromptHint = document.getElementById("fix-prompt-hint");
const fixPromptHintDismiss = document.getElementById("fix-prompt-hint-dismiss");
// Loaded from settings at init; flips true (persisted) once dismissed.
let fixPromptHintDismissed = false;

const RISK_ORDER = { safe: 0, moderate: 1, high: 2 };
const ICON_FOR_RISK = {
  safe: "#i-check",
  moderate: "#i-warning",
  high: "#i-alert",
};
const RISK_LABEL = { safe: "safe", moderate: "moderate", high: "high" };

// Governs how much of usedIn's { file, line, absPath } buildImpactRow shows.
// Persisted via main.js's settings.json (see get-settings/set-detail-level),
// loaded further down. On change, existing cards re-render in place via
// rerenderVisibleCards() so a Settings/tab switch feels instant.
let currentDetailLevel = "simple";

// Cache of every visible entry card's original payload keyed by its DOM
// node, so a detail-level change can rebuild them without needing another
// scan. Cleared when watching a fresh folder in onWatchingStarted below.
const cardPayloads = new WeakMap();

/**
 * Renders main.js's tool detection ({id, label, letters, color}) as a
 * header badge. The colored two-letter monogram replaces the earlier
 * SVG glyphs — same visual language as the sidebar stack badges and
 * bottom status bar, no reproduction of any tool's actual logo/wordmark.
 */
function updateToolBadge(detectedTool) {
  const tool = detectedTool || { id: "unknown", label: "RippleCheck", letters: "RC", color: "#4B5563" };
  toolBadge.dataset.tool = tool.id;
  toolBadge.hidden = false;
  toolBadge.title = tool.label;
  toolBadgeLabel.textContent = tool.label;
  toolBadgeIcon.replaceChildren(monogram({ letters: tool.letters, color: tool.color, variant: "md" }));
}

/**
 * Drives the heartbeat strip's color. Every high-riskLevel result flags
 * it red and (re)starts the hold timer; if no new high-risk scan arrives
 * before the timer fires, it eases back to green. The waveform itself
 * keeps scrolling throughout via CSS animation — only color state lives
 * in JS.
 */
const HIGH_RISK_HOLD_MS = 4500;
let highRiskTimer = null;
function flagHighRiskPulse() {
  pulseLine.classList.add("is-alert");
  if (highRiskTimer) clearTimeout(highRiskTimer);
  highRiskTimer = setTimeout(() => {
    pulseLine.classList.remove("is-alert");
    highRiskTimer = null;
  }, HIGH_RISK_HOLD_MS);
}

/**
 * Sets the connection status pill's visual state. `scanning` auto-decays
 * back to `watching` after a short window, so callers don't have to
 * remember to reset it — this is what powers the "brief pulse during
 * scan" feedback the redesign asks for.
 */
let scanFlashTimer = null;
function setConnectionState(state, label) {
  if (scanFlashTimer) {
    clearTimeout(scanFlashTimer);
    scanFlashTimer = null;
  }

  connPill.dataset.state = state;
  connLabel.textContent = label;
  connPill.title = label;

  if (state === "scanning") {
    scanFlashTimer = setTimeout(() => {
      connPill.dataset.state = "watching";
      connLabel.textContent = "Watching";
      connPill.title = "Watching";
      scanFlashTimer = null;
    }, 520);
  }
}

function showOnly(section) {
  for (const view of [emptyState, watchingState, entryList]) {
    view.hidden = view !== section;
  }
}

/**
 * Reduces a card's entries to its most severe risk, so the card's left
 * stripe / risk order can reflect the "biggest thing to worry about."
 * Ignores note entries (diagnostics, skip-notices) since those don't
 * carry a risk level.
 */
function worstRiskOf(entries) {
  let worst = null;
  for (const entry of entries) {
    if (!entry.riskLevel) continue;
    if (worst === null || RISK_ORDER[entry.riskLevel] > RISK_ORDER[worst]) {
      worst = entry.riskLevel;
    }
  }
  return worst;
}

function countRisks(entries) {
  const counts = { safe: 0, moderate: 0, high: 0 };
  for (const entry of entries) {
    if (entry.riskLevel && counts[entry.riskLevel] !== undefined) {
      counts[entry.riskLevel] += 1;
    }
  }
  return counts;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "className") {
      node.className = value;
    } else if (key === "text") {
      node.textContent = value;
    } else if (key.startsWith("data-")) {
      node.setAttribute(key, value);
    } else {
      node.setAttribute(key, value);
    }
  }
  for (const child of children) {
    if (child == null) continue;
    node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function icon(id) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", id);
  svg.appendChild(use);
  return svg;
}

/**
 * Small colored rounded-square with two-letter monogram — the visual
 * currency for every stack/tool identifier in the app. `letters` +
 * `color` come from main.js's tech-badges.js so a given technology
 * always looks the same. `variant` controls sizing: "sm" for inline
 * chip use, "md" for the header tool badge and status-bar cells.
 */
function monogram({ letters, color, variant = "sm" }) {
  const node = document.createElement("span");
  node.className = `monogram monogram-${variant}`;
  node.style.backgroundColor = color;
  node.textContent = letters;
  node.setAttribute("aria-hidden", "true");
  return node;
}

/**
 * Briefly swaps a button's label to "Copied!" then reverts it — shared by
 * the CLI tab's copy button and each row's "Generate fix prompt" button
 * so the two don't duplicate the same setTimeout dance.
 */
function flashCopied(button, revertText) {
  const original = revertText ?? button.textContent;
  button.textContent = "Copied!";
  setTimeout(() => {
    button.textContent = original;
  }, 1500);
}

/**
 * Plain-text prompt for handing to an AI coding assistant: what changed,
 * where it's still used, and what to check. Only called for entries with
 * at least one usage — nothing to ask an assistant to verify otherwise.
 */
function buildFixPrompt(entry, changedFileLabel) {
  const locations = entry.usedIn.map((usage) => `${usage.file}:${usage.line}`).join(", ");
  return (
    `I changed \`${entry.name}\` in ${changedFileLabel}. It's also used in these places: ${locations}. ` +
    `Please check whether those usages still work correctly with this change, and update them if needed — ` +
    `don't modify anything else unrelated to this.`
  );
}

// --- Reviewed state (local UI only) ----------------------------------------
//
// "Mark as reviewed" is a per-finding, in-memory flag — never persisted to
// disk or sent anywhere. Keyed by the card's scan timestamp + finding name so
// it survives a detail-level re-render (which rebuilds every card from its
// stored payload) within the session; a fresh folder / new scan naturally gets
// its own timestamp and so starts unreviewed.
const reviewedByTimestamp = new Map();

function reviewedSetFor(timestamp) {
  let set = reviewedByTimestamp.get(timestamp);
  if (!set) {
    set = new Set();
    reviewedByTimestamp.set(timestamp, set);
  }
  return set;
}

function isReviewed(timestamp, name) {
  return reviewedByTimestamp.get(timestamp)?.has(name) ?? false;
}

// --- Retest ----------------------------------------------------------------
//
// Each finding row remembers the identity of what it reported (the symbol
// name plus the file it was defined in) and the usages it saw at the time.
// "Retest" hands that back to main, which re-runs the scan and diffs — so the
// row can answer "did my fix actually take?" without the user re-reading a
// whole new report and hunting for the same symbol.

const RETEST_VERDICTS = {
  fixed: { className: "is-fixed", label: "✅ Fixed — no longer flagged" },
  unchanged: { className: "is-unchanged", label: "⚠️ Still flagged the same way" },
  changed: { className: "is-changed", label: "🆕 Changed — now used in different places" },
};

/**
 * The line a retest writes underneath its row. Reused for the pending and
 * error states too, so a row only ever grows one status element.
 */
function retestStatusNode(bar) {
  let node = bar.querySelector(".impact-retest-status");
  if (!node) {
    // Lives inside the (wrapping) action bar, so it lands on its own line
    // directly under the buttons instead of needing its own row slot.
    node = el("div", { className: "impact-retest-status", role: "status", "aria-live": "polite" });
    bar.appendChild(node);
  }
  return node;
}

function renderRetestVerdict(statusNode, verdict) {
  const shape = RETEST_VERDICTS[verdict.status];
  statusNode.className = `impact-retest-status ${shape ? shape.className : "is-error"}`;

  if (!shape) {
    statusNode.textContent = verdict.error ?? "Retest failed.";
    return;
  }

  statusNode.replaceChildren(el("strong", { text: shape.label }));

  // "Changed" is the only verdict where *where* it's now used is the point —
  // the other two are fully described by their headline.
  if (verdict.status === "changed" && (verdict.usedIn ?? []).length > 0) {
    const list = el("div", { className: "impact-retest-usages" });
    for (const usage of verdict.usedIn) {
      list.appendChild(el("code", { className: "impact-file", text: `${usage.file}:${usage.line}` }));
    }
    statusNode.appendChild(list);
  } else if (verdict.status === "unchanged") {
    statusNode.appendChild(el("div", { className: "impact-retest-detail", text: verdict.sentence }));
  }
}

/**
 * "Retest" — re-runs the scan and reports what became of this one finding.
 * The identity sent over is the same (name + definingFile) pair explain.js
 * puts on every entry, so the lookup on the other side is exact.
 */
function buildRetestButton(entry, bar) {
  const button = el("button", {
    className: "impact-action-btn impact-retest-btn",
    type: "button",
    text: "Retest",
  });

  button.addEventListener("click", async () => {
    const statusNode = retestStatusNode(bar);
    statusNode.className = "impact-retest-status is-pending";
    statusNode.textContent = "Re-scanning…";
    button.disabled = true;

    try {
      const verdict = await window.rippleCheck.retestFinding({
        name: entry.name,
        definingFile: entry.definingFile ?? null,
        usedIn: (entry.usedIn ?? []).map((usage) => ({ file: usage.file, line: usage.line })),
      });
      renderRetestVerdict(statusNode, verdict ?? { error: "Retest returned nothing." });
    } catch (error) {
      renderRetestVerdict(statusNode, { error: `Retest failed: ${error.message}` });
    } finally {
      button.disabled = false;
    }
  });

  return button;
}

/**
 * The bottom action bar every finding row ends in: "Generate fix prompt"
 * (copies the same prompt the high-risk icon shortcut does), "Retest"
 * (re-scans and reports what became of this symbol) and "Mark as reviewed"
 * (toggles the local reviewed flag + the row's dimmed/checked styling). The
 * fix-prompt button only appears when there's actually a downstream usage to
 * ask an assistant about; Retest is always available, since confirming a
 * finding is still safe is as useful as confirming a fix landed.
 */
function buildActionBar(entry, changedFileLabel, timestamp, row) {
  const { name, usedIn } = entry;
  const bar = el("div", { className: "impact-actions" });

  if (usedIn.length > 0) {
    const fixButton = el("button", {
      className: "impact-action-btn impact-fix-btn",
      type: "button",
      text: "Generate fix prompt",
    });
    fixButton.addEventListener("click", async () => {
      await window.rippleCheck.copyToClipboard(buildFixPrompt(entry, changedFileLabel));
      flashCopied(fixButton, "Generate fix prompt");
    });
    bar.appendChild(fixButton);
  }

  bar.appendChild(buildRetestButton(entry, bar));

  const reviewedInitially = isReviewed(timestamp, name);
  const reviewButton = el("button", {
    className: `impact-action-btn impact-review-btn${reviewedInitially ? " is-reviewed" : ""}`,
    type: "button",
    "aria-pressed": String(reviewedInitially),
  });
  const setReviewButtonLabel = (reviewed) => {
    reviewButton.replaceChildren(
      icon(reviewed ? "#i-check" : "#i-info"),
      document.createTextNode(reviewed ? "Reviewed" : "Mark as reviewed")
    );
  };
  setReviewButtonLabel(reviewedInitially);
  reviewButton.addEventListener("click", () => {
    const set = reviewedSetFor(timestamp);
    const nowReviewed = !set.has(name);
    if (nowReviewed) set.add(name);
    else set.delete(name);
    reviewButton.classList.toggle("is-reviewed", nowReviewed);
    reviewButton.setAttribute("aria-pressed", String(nowReviewed));
    setReviewButtonLabel(nowReviewed);
    row.classList.toggle("is-reviewed", nowReviewed);
  });
  bar.appendChild(reviewButton);

  return bar;
}

/**
 * Builds the row for a single function/component impact. Risk styling always
 * comes straight off `entry.riskLevel`, never parsed from the sentence text.
 *
 * The two detail levels are deliberately different renderings of the same
 * finding:
 *   • "simple" — a compact one-liner that leans on the AI summary shown above
 *     the cards; no paths, lines or raw risk numbers.
 *   • "deep"   — the full technical trace: the plain-English sentence plus a
 *     block of absolute file:line usages and the raw risk level.
 * Both levels end in the same per-finding action bar.
 */
function buildImpactRow(entry, detailLevel, changedFileLabel, timestamp) {
  const { name, riskLevel, sentence, usedIn } = entry;

  // Notes / diagnostics / skip-notices have no riskLevel and no name.
  if (!riskLevel || !name) {
    const row = el("div", { className: "impact-row", "data-risk": "note", role: "listitem" });
    row.appendChild(el("div", { className: "impact-row-icon" }, [icon("#i-info")]));
    row.appendChild(el("div", { className: "impact-row-text", text: sentence }));
    return row;
  }

  const iconId = ICON_FOR_RISK[riskLevel];
  const rowReviewed = isReviewed(timestamp, name);
  const row = el("div", {
    className: `impact-row${rowReviewed ? " is-reviewed" : ""}`,
    "data-risk": riskLevel,
    role: "listitem",
    "aria-label": `${RISK_LABEL[riskLevel]}: ${sentence}`,
  });
  // On high-risk rows with real usages, the warning icon doubles as a
  // "copy fix prompt" shortcut — reuses buildFixPrompt (the same text
  // the "Generate fix prompt" button copies), so it's a second access
  // point to existing logic, not a new prompt template.
  if (riskLevel === "high" && usedIn.length > 0) {
    const iconButton = el("button", {
      className: "impact-row-icon impact-row-icon-copy",
      type: "button",
      title: "Copy fix prompt",
      "aria-label": `Copy fix prompt for ${name}`,
    });
    iconButton.appendChild(icon(iconId));
    iconButton.addEventListener("click", async () => {
      await window.rippleCheck.copyToClipboard(buildFixPrompt(entry, changedFileLabel));
      iconButton.classList.add("is-copied");
      setTimeout(() => iconButton.classList.remove("is-copied"), 1500);
    });
    row.appendChild(iconButton);
  } else {
    row.appendChild(el("div", { className: "impact-row-icon" }, [icon(iconId)]));
  }

  const text = el("div", { className: "impact-row-text" });
  const nameChip = el("code", { className: "impact-name", text: name });

  if (detailLevel === "deep") {
    text.appendChild(document.createTextNode(sentence));

    const block = el("pre", { className: "impact-expert-block" });
    const lines = usedIn.map((usage) => `${usage.absPath ?? usage.file}:${usage.line}`);
    lines.push(`risk: ${riskLevel}`);
    block.textContent = lines.join("\n");
    text.appendChild(block);
  } else if (detailLevel === "standard") {
    // Standard — the plain-English sentence plus a compact list of the
    // relative file:line usages, but no absolute paths or raw risk block.
    text.appendChild(document.createTextNode(sentence));
    if (usedIn.length > 0) {
      const usageList = el("div", { className: "impact-standard-usages" });
      for (const usage of usedIn) {
        usageList.appendChild(el("code", { className: "impact-file", text: `${usage.file}:${usage.line}` }));
      }
      text.appendChild(usageList);
    }
  } else {
    // Simple — a compact line, no paths/lines/risk numbers.
    const line = el("span", { className: "impact-simple-line" });
    line.appendChild(nameChip);
    if (usedIn.length === 0) {
      line.appendChild(document.createTextNode(" is safe to change — not used anywhere else."));
    } else {
      const placeWord = usedIn.length === 1 ? "place" : "places";
      line.appendChild(document.createTextNode(` is used in ${usedIn.length} other ${placeWord}.`));
    }
    text.appendChild(line);
  }

  text.appendChild(buildActionBar(entry, changedFileLabel, timestamp, row));

  row.appendChild(text);
  return row;
}

function buildRiskSummary(counts) {
  const summary = el("div", {
    className: "risk-summary",
    "aria-label": `${counts.high} high, ${counts.moderate} moderate, ${counts.safe} safe`,
  });

  const order = ["high", "moderate", "safe"];
  for (const risk of order) {
    if (counts[risk] === 0) continue;
    const chip = el("span", { className: "risk-summary-chip", "data-risk": risk });
    chip.appendChild(el("span", { className: "risk-summary-chip-dot" }));
    chip.appendChild(document.createTextNode(`${counts[risk]} ${RISK_LABEL[risk]}`));
    summary.appendChild(chip);
  }
  return summary;
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * The LLM contextual-analysis banner shown at the top of a card once
 * enrichImpact (main.js) returns. Strictly additive: the card is already
 * fully rendered from the deterministic scan before this arrives, so this is
 * extra context — a plain-language explanation, each involved file's likely
 * purpose, and a whole-change fix prompt — never a replacement for the
 * deterministic per-row text or the per-symbol "Generate fix prompt" buttons.
 */
/**
 * The labeled header every AI-insight state shares: the "AI" monogram, an
 * "AI analysis" wordmark, and a small "from your provider" note. This is the
 * trust signal — it makes explicit that everything in this banner came from
 * the user's configured LLM, not the deterministic engine.
 */
function buildAiInsightHead(labelText, note) {
  const head = el("div", { className: "ai-insight-head" });
  head.appendChild(monogram({ letters: "AI", color: "#7C3AED", variant: "sm" }));
  const label = el("span", { className: "ai-insight-label" });
  label.appendChild(el("span", { className: "ai-insight-label-title", text: labelText }));
  if (note) label.appendChild(el("span", { className: "ai-insight-label-note", text: note }));
  head.appendChild(label);
  return head;
}

function buildAiInsight(enrichment, level = currentDetailLevel) {
  const { explanation = "", files = [], fixPrompt = "" } = enrichment;

  const banner = el("div", {
    className: "ai-insight",
    role: "note",
    "aria-label": "AI contextual analysis",
  });

  banner.appendChild(buildAiInsightHead("AI analysis", "from your provider"));
  banner.appendChild(el("p", { className: "ai-insight-text", text: explanation }));

  // File-purpose labels — the heart of Simple mode, and still useful in Deep.
  if (files.length > 0) {
    const list = el("ul", { className: "ai-insight-files" });
    for (const { file, purpose } of files) {
      const item = el("li", { className: "ai-insight-file" });
      item.appendChild(el("code", { className: "impact-file", text: file }));
      item.appendChild(document.createTextNode(` — ${purpose}`));
      list.appendChild(item);
    }
    banner.appendChild(list);
  }

  // The AI's tailored fix prompt is the "reasoning" extra reserved for Deep
  // Dive — Simple stays a pure summary (explanation + file purposes).
  if (fixPrompt && level === "deep") {
    const button = el("button", {
      className: "ai-insight-fix-btn",
      type: "button",
      text: "Copy AI fix prompt",
    });
    button.addEventListener("click", async () => {
      await window.rippleCheck.copyToClipboard(fixPrompt);
      flashCopied(button, "Copy AI fix prompt");
    });
    banner.appendChild(button);
  }

  return banner;
}

/**
 * Loading state — shown the moment a scan lands while its LLM enrichment is
 * still in flight, so the banner slot doesn't pop in jarringly later. Shimmering
 * skeleton lines that mirror the eventual explanation + file-chip layout.
 */
function buildAiInsightSkeleton() {
  const banner = el("div", {
    className: "ai-insight ai-insight-skeleton",
    role: "status",
    "aria-label": "Generating AI analysis",
  });
  banner.appendChild(buildAiInsightHead("Analyzing…", "your provider is thinking"));

  const lines = el("div", { className: "ai-insight-skeleton-lines" });
  for (const width of ["96%", "82%"]) {
    lines.appendChild(el("span", { className: "skeleton-line", style: `width:${width}` }));
  }
  banner.appendChild(lines);

  const chips = el("div", { className: "ai-insight-skeleton-chips" });
  for (const width of ["120px", "150px"]) {
    chips.appendChild(el("span", { className: "skeleton-chip", style: `width:${width}` }));
  }
  banner.appendChild(chips);

  return banner;
}

/**
 * Error state — shown when enrichment fails (bad key, offline, timeout, rate
 * limit). Deliberately calm and neutral, NOT alarming red: enrichment is
 * optional, the deterministic analysis below is intact, so this just quietly
 * says the AI layer isn't available this time rather than vanishing silently.
 */
function buildAiInsightError() {
  const banner = el("div", {
    className: "ai-insight ai-insight-error",
    role: "note",
    "aria-label": "AI analysis unavailable",
  });
  banner.appendChild(buildAiInsightHead("AI analysis unavailable", "using the deterministic analysis"));
  banner.appendChild(
    el("p", {
      className: "ai-insight-text ai-insight-error-text",
      text: "Your AI provider couldn't be reached this time. The deterministic impact below is unaffected — check your key in Settings, or try again on the next save.",
    })
  );
  return banner;
}

function buildEntryCard(payload) {
  const { timestamp, changedFileLabel, entries, scanFailed, summary, enrichment } = payload;
  const worst = worstRiskOf(entries);
  const counts = countRisks(entries);

  const card = el("article", {
    className: "entry-card is-fresh",
    "data-worst": worst || "none",
    "data-timestamp": timestamp,
    role: "region",
    "aria-label": `Impact of edit to ${changedFileLabel}`,
  });

  const header = el("div", { className: "entry-card-header" });

  const file = el("div", { className: "entry-file" });
  file.appendChild(icon("#i-file"));
  file.appendChild(el("span", { className: "entry-file-path", text: changedFileLabel }));
  header.appendChild(file);

  const right = el("div", { className: "entry-card-header-right" });
  if (!scanFailed && entries.some((entry) => entry.riskLevel)) {
    right.appendChild(buildRiskSummary(counts));
  }
  right.appendChild(el("time", { className: "entry-time", text: formatTime(timestamp), datetime: timestamp }));
  header.appendChild(right);

  card.appendChild(header);

  // The AI-insight banner sits between the header and the impact rows and
  // reflects whichever enrichment state the payload is in — so a detail-level
  // rerender keeps the loading skeleton / error / success rather than dropping
  // it. Success wins if it has arrived; otherwise error, then the pending
  // skeleton, then nothing (enrichment not expected for this scan).
  if (!scanFailed) {
    if (enrichment) {
      card.appendChild(buildAiInsight(enrichment, currentDetailLevel));
    } else if (payload.enrichmentError) {
      card.appendChild(buildAiInsightError());
    } else if (payload.enrichmentPending) {
      card.appendChild(buildAiInsightSkeleton());
    }
  }

  const body = el("div", { className: "entry-card-body", role: "list" });

  if (scanFailed) {
    body.appendChild(el("div", { className: "scan-failed", text: summary }));
  } else if (entries.length === 0) {
    body.appendChild(
      el("div", { className: "impact-row", "data-risk": "note", role: "listitem" }, [
        el("div", { className: "impact-row-icon" }, [icon("#i-info")]),
        el("div", { className: "impact-row-text", text: "No functions found to check." }),
      ])
    );
  } else {
    for (const entry of entries) {
      body.appendChild(buildImpactRow(entry, currentDetailLevel, changedFileLabel, timestamp));
    }
  }

  card.appendChild(body);

  // Strip the fresh-glow class after the animation finishes so the effect
  // only applies to the newest arrival, not to whatever's already stacked.
  card.addEventListener(
    "animationend",
    (event) => {
      if (event.animationName === "fresh-glow") {
        card.classList.remove("is-fresh");
      }
    },
    { once: false }
  );

  // Cache the payload so a detail-level tab switch can rebuild this card
  // in place via rerenderVisibleCards() without re-triggering a scan.
  cardPayloads.set(card, payload);

  return card;
}

// --- Persistent project summary --------------------------------------------
//
// A single hero panel pinned above the per-edit cards, showing the LLM
// explanation for the *latest* scan (the BYOK Anthropic enrichment layer).
// Distinct from the per-card AI banner (which shows each card's own
// enrichment) and from the accent-blue session-summary card in the feed.
// Because enrichment lands a moment after its scan, the panel shows a brief
// pending state and then fills; if the AI layer is unavailable it simply
// hides rather than spinning forever.

let latestScanTimestamp = null;
let summaryPendingTimer = null;
const SUMMARY_PENDING_TIMEOUT_MS = 15000;

function resetProjectSummary() {
  latestScanTimestamp = null;
  if (summaryPendingTimer) {
    clearTimeout(summaryPendingTimer);
    summaryPendingTimer = null;
  }
  projectSummary.hidden = true;
  projectSummaryText.classList.remove("project-summary-pending");
  projectSummaryText.textContent = "";
  projectSummaryFiles.innerHTML = "";
  projectSummaryFile.textContent = "";
}

/**
 * Called for every scan. Marks it as the latest and, when an AI summary is
 * actually expected (a BYOK Anthropic key is set, real findings, scan
 * succeeded), shows a pending hero that onImpactEnrichment will fill.
 * Otherwise hides the panel so the hero never claims a summary that isn't
 * coming — with no key, enrichment is skipped entirely in the main process.
 */
function noteScanForSummary(timestamp, changedFileLabel, hasFindings, scanFailed) {
  latestScanTimestamp = timestamp;
  if (summaryPendingTimer) {
    clearTimeout(summaryPendingTimer);
    summaryPendingTimer = null;
  }

  if (scanFailed || !hasFindings || !aiEnrichmentEnabled) {
    projectSummary.hidden = true;
    return;
  }

  projectSummary.classList.remove("project-summary-errored");
  projectSummaryFile.textContent = changedFileLabel;
  projectSummaryFiles.innerHTML = "";
  projectSummaryText.textContent = "Generating AI summary of this change…";
  projectSummaryText.classList.add("project-summary-pending");
  projectSummary.hidden = false;

  summaryPendingTimer = setTimeout(() => {
    summaryPendingTimer = null;
    // Never got filled (no key, timeout, offline) — hide rather than spin.
    if (projectSummaryText.classList.contains("project-summary-pending")) {
      projectSummary.hidden = true;
    }
  }, SUMMARY_PENDING_TIMEOUT_MS);
}

/** Fills the hero from an enrichment payload (explanation + file purposes). */
function fillProjectSummary(enrichment) {
  const { explanation = "", files = [], changedFile = "" } = enrichment;
  if (summaryPendingTimer) {
    clearTimeout(summaryPendingTimer);
    summaryPendingTimer = null;
  }
  projectSummaryText.classList.remove("project-summary-pending");
  projectSummaryText.textContent = explanation;
  if (changedFile) projectSummaryFile.textContent = changedFile;

  projectSummaryFiles.innerHTML = "";
  for (const { file, purpose } of files) {
    const li = el("li");
    li.appendChild(el("b", { text: file }));
    if (purpose) li.appendChild(document.createTextNode(` · ${purpose}`));
    projectSummaryFiles.appendChild(li);
  }
  projectSummary.classList.remove("project-summary-errored");
  projectSummary.hidden = false;
}

/** Calm hero state when the latest scan's enrichment failed — rather than the
 * hero silently vanishing, it briefly notes the AI layer was unavailable while
 * the deterministic cards below stand on their own. */
function setProjectSummaryError() {
  if (summaryPendingTimer) {
    clearTimeout(summaryPendingTimer);
    summaryPendingTimer = null;
  }
  projectSummaryText.classList.remove("project-summary-pending");
  projectSummaryFiles.innerHTML = "";
  projectSummaryText.textContent = "AI summary unavailable — the deterministic impact below is unaffected.";
  projectSummary.classList.add("project-summary-errored");
  projectSummary.hidden = false;
}

// --- Repository overview (one-time, on watch start) ------------------------
//
// A pinned panel above the per-edit cards, driven by main.js's `repo-overview`
// event (a full initial scan aggregated into risk counts + totals) and, when a
// BYOK key is set, the follow-up `repo-overview-summary` event carrying one
// generated whole-repo sentence. Distinct from the per-edit AI banner/hero —
// this is repo-level context shown once per watched project. All risk coloring
// comes straight from riskLevel, never from parsing text.

const SVG_NS = "http://www.w3.org/2000/svg";

// The folder the currently-shown overview belongs to — lets a late-arriving
// AI summary be dropped if the user has since switched projects.
let currentOverviewFolder = null;

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

/**
 * Builds the circular risk ring into #repo-gauge: three arcs (safe / moderate /
 * high) sized to each level's share of all tracked functions and colored from
 * the same riskLevel palette the cards use. The centered percentage is the
 * share that's moderate or high — i.e. what portion of the repo's functions
 * warrant extra care when changed.
 */
function renderRepoGauge(counts) {
  const total = counts.safe + counts.moderate + counts.high;
  const concerning = counts.moderate + counts.high;
  const pct = total > 0 ? Math.round((concerning / total) * 100) : 0;

  const size = 132;
  const stroke = 13;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const svg = svgEl("svg", {
    class: "repo-gauge-svg",
    viewBox: `0 0 ${size} ${size}`,
    role: "img",
    "aria-label":
      total > 0
        ? `${pct}% of ${total} tracked functions are moderate or high risk`
        : "No tracked functions found",
  });

  svg.appendChild(
    svgEl("circle", { class: "repo-gauge-track", cx, cy, r, fill: "none", "stroke-width": stroke })
  );

  // Concerning risk first (high, then moderate), safe last, so the riskier
  // portion reads as one contiguous wedge starting from the top.
  const segments = [
    { key: "high", value: counts.high, color: "var(--high-fg)" },
    { key: "moderate", value: counts.moderate, color: "var(--moderate-fg)" },
    { key: "safe", value: counts.safe, color: "var(--safe-fg)" },
  ].filter((seg) => seg.value > 0);

  const gap = segments.length > 1 ? 2 : 0; // tiny visual break between arcs
  const group = svgEl("g", { transform: `rotate(-90 ${cx} ${cy})` });
  let startFraction = 0;
  for (const seg of segments) {
    const fraction = seg.value / total;
    const arcLen = Math.max(0, fraction * circumference - gap);
    group.appendChild(
      svgEl("circle", {
        class: "repo-gauge-arc",
        "data-risk": seg.key,
        cx,
        cy,
        r,
        fill: "none",
        stroke: seg.color,
        "stroke-width": stroke,
        "stroke-linecap": "butt",
        "stroke-dasharray": `${arcLen} ${circumference - arcLen}`,
        "stroke-dashoffset": `${-startFraction * circumference}`,
      })
    );
    startFraction += fraction;
  }
  svg.appendChild(group);

  const center = el("div", { className: "repo-gauge-center" });
  if (total > 0) {
    const pctEl = el("span", { className: "repo-gauge-pct", text: String(pct) });
    pctEl.appendChild(el("span", { className: "repo-gauge-pct-sign", text: "%" }));
    center.appendChild(pctEl);
    center.appendChild(el("span", { className: "repo-gauge-caption", text: "need care" }));
  } else {
    center.appendChild(el("span", { className: "repo-gauge-pct", text: "—" }));
    center.appendChild(el("span", { className: "repo-gauge-caption", text: "no functions" }));
  }

  repoGauge.replaceChildren(svg, center);
}

function buildRepoMetric(value, label) {
  return el("div", { className: "repo-overview-metric" }, [
    el("span", { className: "repo-overview-metric-value", text: String(value) }),
    el("span", { className: "repo-overview-metric-label", text: label }),
  ]);
}

/** The violet "AI repo overview" trust header, shared by the pending, filled,
 * and error states of the generated summary. */
function buildRepoAiHead() {
  return el("div", { className: "repo-overview-ai-head" }, [
    monogram({ letters: "AI", color: "#7C3AED", variant: "sm" }),
    el("span", { className: "repo-overview-ai-label", text: "AI repo overview" }),
  ]);
}

function setRepoOverviewAi(stateClass, text) {
  repoOverviewAi.className = `repo-overview-ai${stateClass ? ` ${stateClass}` : ""}`;
  repoOverviewAi.replaceChildren(
    buildRepoAiHead(),
    el("p", { className: "repo-overview-ai-text", text })
  );
  repoOverviewAi.hidden = false;
}

function resetRepoOverview() {
  currentOverviewFolder = null;
  repoOverview.hidden = true;
  repoOverviewAi.hidden = true;
  repoOverviewAi.replaceChildren();
  repoGauge.replaceChildren();
  repoOverviewMetrics.replaceChildren();
  repoOverviewLegend.replaceChildren();
  repoOverviewFolder.textContent = "";
}

/** Renders the deterministic half of the overview (gauge + totals + legend)
 * immediately, and primes the AI area to pending when a summary is expected.
 * A repo with no tracked functions has nothing to gauge, so the panel stays
 * hidden in that case. */
function renderRepoOverview(data) {
  const {
    folderPath = null,
    folderName = "",
    totalFunctions = 0,
    fileCount = 0,
    counts = { safe: 0, moderate: 0, high: 0 },
    aiPending = false,
  } = data;

  if (totalFunctions === 0) {
    resetRepoOverview();
    return;
  }

  currentOverviewFolder = folderPath;
  repoOverviewFolder.textContent = folderName || folderPath || "";

  renderRepoGauge(counts);

  repoOverviewMetrics.replaceChildren(
    buildRepoMetric(totalFunctions, totalFunctions === 1 ? "tracked function" : "tracked functions"),
    buildRepoMetric(fileCount, fileCount === 1 ? "file" : "files")
  );

  // Legend reuses the existing risk-summary chips (high/moderate/safe, zeros
  // omitted) for exact counts alongside the proportional gauge.
  repoOverviewLegend.replaceChildren(buildRiskSummary(counts));

  if (aiPending) {
    setRepoOverviewAi("is-pending", "Generating repo overview…");
  } else {
    repoOverviewAi.hidden = true;
    repoOverviewAi.replaceChildren();
  }

  repoOverview.hidden = false;
}

// --- Session summary -------------------------------------------------------
//
// A "session" aggregates every per-edit card between two boundaries: it
// starts when watching begins (or silently right after a prior session
// ends) and finishes either via the "End session" button or after 10
// minutes with no new file changes. It's pure aggregation of data already
// flowing through onImpactUpdate — no daemon/IPC changes involved.

const SESSION_INACTIVITY_MS = 10 * 60 * 1000;

function createSession() {
  return {
    active: true,
    startedAt: new Date().toISOString(),
    fileCount: 0,
    counts: { safe: 0, moderate: 0, high: 0 },
  };
}

let session = createSession();
let sessionInactivityTimer = null;

function scheduleSessionInactivityTimeout() {
  if (sessionInactivityTimer) clearTimeout(sessionInactivityTimer);
  sessionInactivityTimer = setTimeout(() => {
    sessionInactivityTimer = null;
    endSession();
  }, SESSION_INACTIVITY_MS);
}

/**
 * main.js labels a scan either with the single relative path that changed,
 * or "N files changed" when a debounced burst covered several files. This
 * recovers a per-scan file count from that label without needing any new
 * field on the impact-update payload.
 */
function countChangedFiles(changedFileLabel) {
  const match = /^(\d+) files changed$/.exec(changedFileLabel);
  return match ? Number(match[1]) : 1;
}

function buildSessionClosingLine(fileCount, counts) {
  const changeWord = fileCount === 1 ? "change" : "changes";
  const concerning = counts.moderate + counts.high;

  let tail;
  if (counts.safe === 0 && concerning === 0) {
    tail = "nothing to flag.";
  } else if (concerning === 0) {
    tail = "all safe.";
  } else if (counts.safe === 0) {
    tail = `${concerning} worth a second look.`;
  } else {
    tail = `${counts.safe} safe, ${concerning} worth a second look.`;
  }

  return `${fileCount} ${changeWord} this session — ${tail}`;
}

function buildSessionSummaryCard({ startedAt, fileCount, counts }) {
  const card = el("article", {
    className: "session-summary-card",
    role: "region",
    "aria-label": "Session summary",
  });

  const header = el("div", { className: "session-summary-header" }, [
    el("div", { className: "session-summary-title" }, [
      icon("#i-check"),
      document.createTextNode("Session summary"),
    ]),
  ]);

  const endedAt = new Date().toISOString();
  header.appendChild(
    el("time", {
      className: "session-summary-time",
      text: `${formatTime(startedAt)} – ${formatTime(endedAt)}`,
      datetime: endedAt,
    })
  );
  card.appendChild(header);

  const body = el("div", { className: "session-summary-body" });

  const stats = el("div", { className: "session-summary-stats" }, [
    el("div", { className: "session-summary-stat" }, [
      el("span", { className: "session-summary-stat-value", text: String(fileCount) }),
      el("span", {
        className: "session-summary-stat-label",
        text: fileCount === 1 ? "file changed" : "files changed",
      }),
    ]),
  ]);
  if (counts.safe + counts.moderate + counts.high > 0) {
    stats.appendChild(buildRiskSummary(counts));
  }
  body.appendChild(stats);

  body.appendChild(
    el("p", { className: "session-summary-line", text: buildSessionClosingLine(fileCount, counts) })
  );

  card.appendChild(body);
  return card;
}

/**
 * Ends the active session, if any, and — only when it actually saw at
 * least one file change — inserts its summary card above whatever's
 * currently at the top of the list (which, at this point, are exactly
 * that session's own per-edit cards). Older cards are left untouched.
 */
function endSession() {
  if (!session.active) return;

  if (sessionInactivityTimer) {
    clearTimeout(sessionInactivityTimer);
    sessionInactivityTimer = null;
  }

  session.active = false;

  if (session.fileCount > 0) {
    const card = buildSessionSummaryCard(session);
    entryList.insertBefore(card, entryList.firstChild);
  }
}

endSessionButton.addEventListener("click", endSession);

// --- Sidebar tech-stack badges ----------------------------------------------
//
// Purely a display of whatever main.js's shallow marker-file detection
// already computed and sent along with watching-started — no scanning
// logic lives here.

const UNSUPPORTED_STACK_TOOLTIP =
  "Detected, but RippleCheck's deep analysis currently only supports JavaScript/TypeScript. Full impact scanning for this isn't available yet.";

function buildStackBadge({ letters, color, label, version, isJsBased, folder }) {
  const badge = el("span", {
    className: "stack-badge",
    "data-supported": String(Boolean(isJsBased)),
    title: isJsBased ? folder || label : UNSUPPORTED_STACK_TOOLTIP,
  });
  badge.appendChild(monogram({ letters, color, variant: "sm" }));
  const text = el("span", { className: "stack-badge-text" });
  text.appendChild(document.createTextNode(label));
  // Only append a version chip when main.js gave us one it could
  // deterministically read; blank version means "don't guess" (see
  // parseStackVersion in tech-badges.js).
  if (version) {
    text.appendChild(el("span", { className: "stack-badge-version", text: version }));
  }
  badge.appendChild(text);
  return badge;
}

function renderTechStacks(techStacks = []) {
  sidebarStackBadges.innerHTML = "";
  for (const stack of techStacks) {
    sidebarStackBadges.appendChild(buildStackBadge(stack));
  }
  sidebarStack.hidden = techStacks.length === 0;
}

async function pickFolder() {
  const folderPath = await window.rippleCheck.selectFolder();
  if (folderPath) {
    folderPathLabel.textContent = folderPath;
    folderPill.classList.remove("is-empty");
  }
}

selectFolderButton.addEventListener("click", pickFolder);
selectFolderButtonEmpty.addEventListener("click", pickFolder);

uploadZipButton.addEventListener("click", async () => {
  uploadZipStatus.textContent = "";

  const result = await window.rippleCheck.selectZipAndWatch();

  if (result?.canceled) return;
  if (result?.error) {
    uploadZipStatus.textContent = "Couldn't extract that zip. Try again.";
    return;
  }

  // Success: the resulting watching-started event switches the view away
  // from this empty state, so there's nothing further to show here.
  uploadZipStatus.textContent = "";
});

window.rippleCheck.onWatchingStarted(({ folderPath, folderName, detectedTool, techStacks }) => {
  folderPathLabel.textContent = folderPath;
  folderPill.classList.remove("is-empty");
  watchingFolderCode.textContent = folderPath;
  updateToolBadge(detectedTool);

  sidebarStackFolderName.textContent = folderName || folderPath;
  renderTechStacks(techStacks);

  // Reset any prior scan history when the user picks a fresh folder. The
  // incoming repo-overview event (from the initial full scan) repopulates the
  // overview; hiding it here avoids a stale panel lingering in between.
  entryList.innerHTML = "";
  resetProjectSummary();
  resetRepoOverview();
  showOnly(watchingState);
  // Show the persistent detail-level tabs from now on — the empty state
  // has nothing to switch verbosity of.
  detailLevelTabsContainer.hidden = false;

  setConnectionState("watching", "Watching");

  // A fresh folder always starts a brand-new session.
  session = createSession();
  scheduleSessionInactivityTimeout();
  endSessionButton.hidden = false;

  // Reaching a watched project completes onboarding step 2 (all three source
  // flows funnel through here) — advance to the coding-agent step. The
  // workspace itself only opens after step 5, so we don't finish here.
  if (onboardingActive) advanceAfterProjectConnected();
});

window.rippleCheck.onImpactUpdate((payload) => {
  const { entries = [], scanFailed = false, changedFileLabel = "", timestamp } = payload;

  setConnectionState("scanning", "Scanning");

  // Point the persistent hero at this newest scan (fills once its AI
  // enrichment lands, or hides if none is coming).
  noteScanForSummary(timestamp, changedFileLabel, entries.some((entry) => entry.riskLevel), scanFailed);

  // A change arriving after the previous session ended starts a new one,
  // which builds silently until it, too, ends.
  if (!session.active) {
    session = createSession();
  }
  session.fileCount += countChangedFiles(changedFileLabel);
  const cardCounts = countRisks(entries);
  session.counts.safe += cardCounts.safe;
  session.counts.moderate += cardCounts.moderate;
  session.counts.high += cardCounts.high;
  scheduleSessionInactivityTimeout();

  // If a provider is configured and this scan produced any finding (any risk
  // level, including all-safe), enrichment is on its way — mark the card pending
  // so buildEntryCard renders the loading skeleton immediately (no jarring
  // pop-in later), and arm a fallback that flips to the calm error state if
  // nothing ever arrives.
  const expectsEnrichment =
    !scanFailed && aiEnrichmentEnabled && entries.some((entry) => entry.riskLevel);
  payload.enrichmentPending = expectsEnrichment;

  const card = buildEntryCard(payload);

  showOnly(entryList);
  entryList.insertBefore(card, entryList.firstChild);

  if (expectsEnrichment) armEnrichmentFallback(timestamp);

  // First time a card actually carries a "Generate fix prompt" action (i.e. a
  // finding with downstream usages), surface the one-time callout.
  if (!scanFailed) {
    maybeShowFixPromptHint(entries);
  }

  if (scanFailed) {
    setConnectionState("error", "Scan failed");
    return;
  }

  if (entries.some((entry) => entry.riskLevel === "high")) {
    flagHighRiskPulse();
  }

  // The scan just completed, so we know we're back to steadily watching.
  // setConnectionState("scanning", ...) already scheduled the auto-decay
  // back to "Watching" — nothing more to do here.
});

/** Reveals the one-time "Generate fix prompt" callout the first time a scan
 * produces a finding with downstream usages (the only case that renders the
 * button). No-op once dismissed or if already showing. */
function maybeShowFixPromptHint(entries) {
  if (fixPromptHintDismissed || !fixPromptHint.hidden) return;
  if (activeMode !== "project") return;
  if (entries.some((entry) => entry.usedIn && entry.usedIn.length > 0)) {
    fixPromptHint.hidden = false;
  }
}

fixPromptHintDismiss.addEventListener("click", () => {
  fixPromptHint.hidden = true;
  fixPromptHintDismissed = true;
  window.rippleCheck.setFixPromptHintDismissed();
});

// Per-card enrichment fallback timers: if the LLM result never arrives (a
// provider removed out of band, a silent hang past the main-process timeout),
// flip the card's skeleton to the calm error state instead of spinning
// forever. Keyed by scan timestamp.
const enrichFallbackTimers = new Map();
const ENRICH_FALLBACK_MS = 16000;

function clearEnrichFallback(timestamp) {
  const timer = enrichFallbackTimers.get(timestamp);
  if (timer) {
    clearTimeout(timer);
    enrichFallbackTimers.delete(timestamp);
  }
}

function armEnrichmentFallback(timestamp) {
  clearEnrichFallback(timestamp);
  enrichFallbackTimers.set(
    timestamp,
    setTimeout(() => {
      enrichFallbackTimers.delete(timestamp);
      applyEnrichmentState(timestamp, "error");
    }, ENRICH_FALLBACK_MS)
  );
}

/**
 * Swaps a card's AI-insight banner to its resolved state (success or error),
 * updating the cached payload so a later detail-level rerender keeps it. No-op
 * if the card is gone (folder changed / feed cleared).
 */
function applyEnrichmentState(timestamp, state, data) {
  const card = Array.from(entryList.querySelectorAll(".entry-card")).find(
    (candidate) => candidate.dataset.timestamp === timestamp
  );
  if (!card) return;
  const payload = cardPayloads.get(card);
  if (!payload) return;

  let banner;
  if (state === "success") {
    payload.enrichment = data;
    payload.enrichmentPending = false;
    payload.enrichmentError = false;
    banner = buildAiInsight(data, currentDetailLevel);
  } else {
    payload.enrichmentPending = false;
    payload.enrichmentError = true;
    banner = buildAiInsightError();
  }

  const existing = card.querySelector(".ai-insight");
  if (existing) {
    existing.replaceWith(banner);
  } else {
    card.querySelector(".entry-card-header").insertAdjacentElement("afterend", banner);
  }
}

// The LLM enrichment for a scan arrives a moment after its impact-update (or a
// failure signal if the provider call didn't succeed). Match it to the card by
// timestamp and swap the banner from its loading skeleton to success or the
// calm error state.
window.rippleCheck.onImpactEnrichment((data) => {
  if (!data || !data.timestamp) return;
  clearEnrichFallback(data.timestamp);

  if (data.error) {
    if (data.timestamp === latestScanTimestamp) setProjectSummaryError();
    applyEnrichmentState(data.timestamp, "error");
    return;
  }

  // The persistent hero tracks the latest scan — fill it regardless of
  // whether that scan's card is still in the feed.
  if (data.timestamp === latestScanTimestamp) {
    fillProjectSummary(data);
  }
  applyEnrichmentState(data.timestamp, "success", data);
});

// One-time repo overview: the deterministic gauge/totals land first, then the
// optional AI summary follows as a separate event and fills the pending slot.
window.rippleCheck.onRepoOverview((data) => {
  if (data) renderRepoOverview(data);
});

window.rippleCheck.onRepoOverviewSummary((data) => {
  // Ignore a summary for a project the user has since switched away from, or
  // one for a repo whose overview was never shown (no tracked functions).
  if (!data || data.folderPath !== currentOverviewFolder || repoOverview.hidden) return;

  if (data.error || typeof data.overview !== "string" || data.overview.trim() === "") {
    setRepoOverviewAi("is-error", "AI overview unavailable this time — the risk breakdown above still applies.");
    return;
  }
  setRepoOverviewAi("", data.overview.trim());
});

sidebarLoginButton.addEventListener("click", () => {
  window.rippleCheck.loginWithGithub();
});
loginGithubButtonCloud.addEventListener("click", () => {
  window.rippleCheck.loginWithGithub();
});

let isLoggedIn = false;
let currentUsername = null;

// Whether BYOK AI enrichment is configured in the main process. Enrichment no
// longer depends on being logged in — with a provider + key, the main process
// calls that provider directly; without one it skips enrichment. This flag lets
// the persistent AI-summary hero decide whether to show a pending state.
let aiEnrichmentEnabled = false;

// --- BYOK AI-provider form (shared: onboarding step 4 + Settings) -----------

const AI_PROVIDER_LABELS = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  xai: "xAI (Grok)",
  google: "Google",
  other: "Other (OpenAI-compatible)",
};

// Whether each provider needs a custom base URL + model, plus a key hint.
// Mirrors main.js's AI_PROVIDER_PRESETS (only "other" is fully user-supplied).
const AI_PROVIDER_META = {
  anthropic: { custom: false, keyPlaceholder: "sk-ant-…" },
  openai: { custom: false, keyPlaceholder: "sk-…" },
  xai: { custom: false, keyPlaceholder: "xai-…" },
  google: { custom: false, keyPlaceholder: "AIza…" },
  other: { custom: true, keyPlaceholder: "API key" },
};

let settingsAiFormApi = null;
let onboardingAiFormApi = null;

/**
 * Wires one AI-provider form. Handles provider-chip selection, showing the
 * custom base-URL+model fields for "Other", the "Test connection" button, and
 * reporting save-readiness back via onReady so the caller can enable its
 * Save/Continue action. It never persists anything itself — the caller reads
 * values() on save.
 */
function createAiProviderForm({ root, testButton, onReady }) {
  const chips = root.querySelectorAll(".ai-provider-chip");
  const keyInput = root.querySelector('input[type="password"]');
  const custom = root.querySelector(".ai-provider-custom");
  const baseUrlInput = root.querySelector('[id$="-base-url"]');
  const modelInput = root.querySelector('[id$="-model"]');
  const testStatus = root.querySelector(".ai-provider-test-status");

  let selected = null;
  // Tracks what's already stored so "Test" can run against a saved key without
  // re-typing it (main.js falls back to the stored key when the field is blank).
  let savedProvider = null;
  let savedHasKey = false;

  function values() {
    return {
      provider: selected,
      apiKey: keyInput.value.trim(),
      baseUrl: baseUrlInput ? baseUrlInput.value.trim() : "",
      model: modelInput ? modelInput.value.trim() : "",
    };
  }

  function customComplete() {
    if (!selected || !AI_PROVIDER_META[selected].custom) return true;
    const v = values();
    return v.baseUrl !== "" && v.model !== "";
  }

  function canSave() {
    return Boolean(selected) && values().apiKey !== "" && customComplete();
  }

  function canTest() {
    if (!selected || !customComplete()) return false;
    const hasStoredKey = selected === savedProvider && savedHasKey;
    return values().apiKey !== "" || hasStoredKey;
  }

  function setTestStatus(text, tone) {
    testStatus.textContent = text;
    if (tone) testStatus.dataset.tone = tone;
    else delete testStatus.dataset.tone;
  }

  function syncState() {
    if (testButton) testButton.disabled = !canTest();
    onReady?.(canSave());
  }

  function selectProvider(provider) {
    selected = AI_PROVIDER_META[provider] ? provider : null;
    for (const chip of chips) {
      chip.setAttribute("aria-pressed", String(chip.dataset.provider === selected));
    }
    const meta = AI_PROVIDER_META[selected] || {};
    if (custom) custom.hidden = !meta.custom;
    keyInput.placeholder = selected === savedProvider && savedHasKey
      ? "•••••••••• (saved — type to replace)"
      : meta.keyPlaceholder || "API key";
    syncState();
  }

  for (const chip of chips) {
    chip.addEventListener("click", () => {
      setTestStatus("");
      selectProvider(chip.dataset.provider);
    });
  }
  for (const input of [keyInput, baseUrlInput, modelInput]) {
    input?.addEventListener("input", () => {
      setTestStatus("");
      syncState();
    });
  }

  if (testButton) {
    testButton.addEventListener("click", async () => {
      if (!canTest()) return;
      testButton.disabled = true;
      setTestStatus("Testing…", "pending");
      const result = await window.rippleCheck.testAiConnection(values());
      const stillReady = canTest();
      testButton.disabled = !stillReady;
      if (result?.ok) setTestStatus("Connection works.", "success");
      else setTestStatus(result?.error || "Connection failed.", "error");
    });
  }

  return {
    values,
    canSave,
    selectProvider,
    setTestStatus,
    reset() {
      keyInput.value = "";
      if (baseUrlInput) baseUrlInput.value = "";
      if (modelInput) modelInput.value = "";
      selectProvider(null);
      setTestStatus("");
    },
    /** Reflect stored (non-secret) status: preselect the active provider,
     * pre-fill any custom base/model, and hint that a key is already saved. */
    applyStatus(status) {
      savedProvider = status?.provider || null;
      savedHasKey = Boolean(status?.hasKey);
      keyInput.value = "";
      if (status?.provider) {
        if (baseUrlInput) baseUrlInput.value = status.baseUrl || "";
        if (modelInput) modelInput.value = status.model || "";
        selectProvider(status.provider);
      } else {
        selectProvider(null);
      }
    },
  };
}

/** Pushes the resolved AI-provider status into every AI surface: the module
 * flag, the Settings status line + Remove button, and both forms. */
function applyAiStatus(status) {
  aiEnrichmentEnabled = Boolean(status?.enabled);

  if (settingsAiStatus) {
    settingsAiStatus.textContent = status?.enabled
      ? `${AI_PROVIDER_LABELS[status.provider] || "AI"} configured — AI enrichment is on.`
      : "No provider set — using the built-in template.";
  }
  if (settingsAiRemoveButton) settingsAiRemoveButton.hidden = !status?.enabled;

  settingsAiFormApi?.applyStatus(status);
  onboardingAiFormApi?.applyStatus(status);
}

// Settings AI form + its Save / Remove buttons.
settingsAiFormApi = createAiProviderForm({
  root: settingsAiForm,
  testButton: settingsAiTestButton,
  onReady: (ready) => {
    settingsAiSaveButton.disabled = !ready;
  },
});

settingsAiSaveButton.addEventListener("click", async () => {
  if (!settingsAiFormApi.canSave()) return;
  settingsAiSaveButton.disabled = true;
  const result = await window.rippleCheck.setAiProvider(settingsAiFormApi.values());
  settingsAiSaveButton.disabled = false;
  if (result?.encryptionUnavailable) {
    settingsAiStatus.textContent = "This machine has no secure key store, so the key can't be saved.";
    return;
  }
  if (result?.error) {
    settingsAiStatus.textContent = "Couldn't save — check the provider, key, and any base URL/model.";
    return;
  }
  applyAiStatus(result);
});

settingsAiRemoveButton.addEventListener("click", async () => {
  const result = await window.rippleCheck.removeAiProvider();
  applyAiStatus(result);
});

window.rippleCheck.onAuthState(({ loggedIn, username, avatarUrl }) => {
  const wasLoggedIn = isLoggedIn;
  isLoggedIn = loggedIn;
  currentUsername = loggedIn ? username : null;

  // Keep the onboarding login step in sync and auto-advance on a fresh login.
  handleOnboardingAuth(wasLoggedIn, loggedIn, username);

  if (loggedIn) {
    sidebarUserSignedIn.hidden = false;
    sidebarLoginButton.hidden = true;
    sidebarUserName.textContent = username;
    sidebarUserAvatar.src = avatarUrl || "";
    sidebarUserAvatar.alt = `${username}'s avatar`;
    settingsUsername.textContent = username;
  } else {
    sidebarUserSignedIn.hidden = true;
    sidebarLoginButton.hidden = false;
    sidebarUserName.textContent = "";
    sidebarUserAvatar.removeAttribute("src");
    settingsUsername.textContent = "—";
    // Signing out while the settings panel is open would leave a dialog
    // hovering over an unauthenticated app — close it defensively.
    closeSettings();

    // An explicit sign-out (we were logged in, now we're not) resets the whole
    // app back to the onboarding overlay at step 1 (login), rather than just
    // flipping the sidebar to a logged-out state on the current screen. Gated on
    // `wasLoggedIn` so a passive "no/expired token on startup" — where
    // `wasLoggedIn` was never true — keeps the normal returning-user flow and
    // doesn't force onboarding on every launch.
    if (wasLoggedIn && !onboardingActive) {
      startOnboarding();
    }
  }

  // Auth can complete while the Cloud tab is already open (the login
  // round-trip goes through the user's real browser), so it needs to
  // flip from the logged-out prompt to real content without a re-click.
  if (activeMode === "cloud") {
    refreshCloudPanel();
  }
});

// --- Onboarding (mandatory first launch, 5 steps) ---------------------------
//
// A full-window overlay that gates the workspace until the user has, in order:
//   1. signed in with GitHub (also grants repo-browse scope, permanently),
//   2. connected a project (folder / zip / GitHub repo),
//   3. named their coding agent,
//   4. optionally added an AI provider (skippable),
//   5. picked a detail level.
// Only after step 5 does the workspace open. All three project sources reuse
// the exact same flows the workspace uses. Completion is persisted so later
// launches skip straight in; re-triggerable from Settings.

const PLATFORM_LABELS = {
  "claude-code": "Claude Code",
  cursor: "Cursor",
  codex: "Codex",
  windsurf: "Windsurf",
  other: "Other",
};

const ONBOARDING_STEP_COUNT = 5;

let onboardingActive = false;
let onboardingStep = 1;
let selectedAgent = null;
let currentPlatform = null;
let onboardingDetailLevel = "simple";

/** Paints the colored two-letter monograms declared with data-letters/-color
 * (now just the AI-summary hero icon) using the same helper every other badge
 * in the app uses. The coding-agent step is deliberately text-only, no logos. */
function fillMonograms() {
  for (const slot of document.querySelectorAll(".onboarding-plat-icon[data-letters]")) {
    slot.replaceChildren(
      monogram({ letters: slot.dataset.letters, color: slot.dataset.color || "#6E7681", variant: "sm" })
    );
  }
}

function updatePlatformDisplay(platform) {
  settingsPlatform.textContent = PLATFORM_LABELS[platform] || "Not set";
}

function showOnboardingStep(step) {
  // Direction drives the slide: advancing forward slides the new panel in from
  // the right, going Back mirrors it. Equal steps (initial open) count as fwd.
  const direction = step < onboardingStep ? "back" : "fwd";
  onboardingStep = step;
  for (const [num, panel] of Object.entries(onboardingPanels)) {
    const isActive = Number(num) === step;
    panel.hidden = !isActive;
    if (isActive) {
      panel.classList.remove("onboarding-slide-fwd", "onboarding-slide-back");
      // Force a reflow so re-adding the class retriggers the CSS animation
      // even when moving between two same-direction steps in a row.
      void panel.offsetWidth;
      panel.classList.add(direction === "back" ? "onboarding-slide-back" : "onboarding-slide-fwd");
    }
  }
  for (const dot of onboardingSteps.querySelectorAll(".onboarding-step-dot")) {
    const dotStep = Number(dot.dataset.step);
    if (dotStep < step) dot.dataset.state = "done";
    else if (dotStep === step) dot.dataset.state = "active";
    else dot.removeAttribute("data-state");
  }
  onboardingProgress.textContent = `Step ${step} of ${ONBOARDING_STEP_COUNT}`;
}

function syncOnboardingLoginStep(loggedIn, username) {
  onboardingLoginBtn.hidden = loggedIn;
  onboardingSignedIn.hidden = !loggedIn;
  onboardingNext1.disabled = !loggedIn;
  if (loggedIn) {
    onboardingSignedInName.textContent = username || "";
    onboardingLoginNote.textContent = "";
  } else {
    onboardingLoginNote.textContent = "Waiting for GitHub sign-in…";
  }
}

function selectAgentCard(platform) {
  selectedAgent = PLATFORM_LABELS[platform] ? platform : null;
  for (const card of onboardingAgentGrid.querySelectorAll(".choice-card")) {
    card.setAttribute("aria-pressed", String(card.dataset.platform === selectedAgent));
  }
  onboardingNext3.disabled = !selectedAgent;
}

function selectOnboardingDetail(level) {
  onboardingDetailLevel = level;
  for (const input of onboardingDetailInputs) {
    input.checked = input.value === level;
  }
}

function startOnboarding() {
  onboardingActive = true;
  onboarding.hidden = false;
  setOnboardingSourceStatus("");
  onboardingRepoBrowser.hidden = true;
  onboardingRepoList.innerHTML = "";
  syncOnboardingLoginStep(isLoggedIn, currentUsername);
  // Pre-select prior choices so re-running setup keeps them.
  selectAgentCard(currentPlatform);
  selectOnboardingDetail(currentDetailLevel);
  onboardingAiStatus.textContent = "";
  showOnboardingStep(1);
}

function finishOnboarding() {
  if (!onboardingActive) return;
  onboardingActive = false;
  onboarding.hidden = true;
  window.rippleCheck.setOnboardingComplete();
}

/** Step 2 → 3: a project loaded (folder/zip/repo all land here via
 * onWatchingStarted). The workspace stays behind the overlay until step 5. */
function advanceAfterProjectConnected() {
  setOnboardingSourceStatus("Project connected.", "success");
  showOnboardingStep(3);
}

function handleOnboardingAuth(wasLoggedIn, loggedIn, username) {
  if (!onboardingActive) return;
  syncOnboardingLoginStep(loggedIn, username);
  // A fresh sign-in (logged-out → logged-in) while on the login step advances
  // automatically so the flow feels responsive; a re-run while already signed
  // in just enables Continue.
  if (!wasLoggedIn && loggedIn && onboardingStep === 1) {
    showOnboardingStep(2);
  }
}

function setOnboardingSourceStatus(text, tone) {
  onboardingSourceStatus.textContent = text;
  if (tone) onboardingSourceStatus.dataset.tone = tone;
  else delete onboardingSourceStatus.dataset.tone;
}

function setOnboardingRepoStatus(text, tone) {
  onboardingRepoStatus.textContent = text;
  if (tone) onboardingRepoStatus.dataset.tone = tone;
  else delete onboardingRepoStatus.dataset.tone;
}

// Inline repo browser for step 2 — reuses the same fetch/download IPCs as the
// Cloud tab (login in step 1 already granted the scope, so no re-auth). On a
// successful download+watch, onWatchingStarted → advanceAfterProjectConnected.
async function loadOnboardingRepoList() {
  onboardingRepoBrowser.hidden = false;
  onboardingRepoList.hidden = true;
  setOnboardingRepoStatus("Loading your repos…");

  const result = await window.rippleCheck.fetchGithubRepos();
  if (result?.error) {
    setOnboardingRepoStatus(describeRepoError(result), "error");
    return;
  }
  const repos = result?.repos ?? [];
  if (repos.length === 0) {
    setOnboardingRepoStatus("No repos found.");
    return;
  }

  onboardingRepoList.innerHTML = "";
  for (const repo of repos) {
    onboardingRepoList.appendChild(buildRepoRow(repo, selectOnboardingRepo));
  }
  onboardingRepoList.hidden = false;
  setOnboardingRepoStatus("");
}

async function selectOnboardingRepo(repo) {
  if (repoCloneInFlight) return;
  repoCloneInFlight = true;

  const rows = [...onboardingRepoList.querySelectorAll(".cloud-repo-item")];
  for (const row of rows) row.disabled = true;
  setOnboardingRepoStatus(`Downloading ${repo.full_name}…`);

  const result = await window.rippleCheck.downloadAndWatchRepo(repo.full_name);

  repoCloneInFlight = false;
  for (const row of rows) row.disabled = false;

  if (result?.error) {
    setOnboardingRepoStatus(describeRepoError(result), "error");
    return;
  }
  // Success → watching-started → advanceAfterProjectConnected() handles the step.
}

// Step 1 — login
onboardingLoginBtn.addEventListener("click", () => window.rippleCheck.loginWithGithub());
onboardingNext1.addEventListener("click", () => {
  if (!onboardingNext1.disabled) showOnboardingStep(2);
});

// Step 2 — connect a project
onboardingBack2.addEventListener("click", () => showOnboardingStep(1));
onboardingSources.folder.addEventListener("click", async () => {
  onboardingRepoBrowser.hidden = true;
  setOnboardingSourceStatus("Opening folder picker…");
  const folderPath = await window.rippleCheck.selectFolder();
  // On success, watching-started fires and advances the step for us.
  if (!folderPath) setOnboardingSourceStatus("No folder selected — try again.", "error");
});
onboardingSources.zip.addEventListener("click", async () => {
  onboardingRepoBrowser.hidden = true;
  setOnboardingSourceStatus("Opening…");
  const result = await window.rippleCheck.selectZipAndWatch();
  if (result?.canceled) setOnboardingSourceStatus("No zip selected — try again.");
  else if (result?.error) setOnboardingSourceStatus("Couldn't extract that zip — try again.", "error");
  // On success, watching-started fires and advances the step.
});
onboardingSources.repos.addEventListener("click", () => {
  setOnboardingSourceStatus("");
  loadOnboardingRepoList();
});

// Step 3 — coding agent
for (const card of onboardingAgentGrid.querySelectorAll(".choice-card")) {
  card.addEventListener("click", () => selectAgentCard(card.dataset.platform));
}
onboardingBack3.addEventListener("click", () => showOnboardingStep(2));
onboardingNext3.addEventListener("click", async () => {
  if (!selectedAgent) return;
  currentPlatform = selectedAgent;
  updatePlatformDisplay(currentPlatform);
  await window.rippleCheck.setPlatform(currentPlatform);
  showOnboardingStep(4);
});

// Step 4 — AI provider (optional/skippable)
onboardingAiFormApi = createAiProviderForm({
  root: onboardingAiForm,
  testButton: document.getElementById("onboarding-ai-test"),
  onReady: (ready) => {
    onboardingNext4.disabled = !ready;
  },
});
onboardingBack4.addEventListener("click", () => showOnboardingStep(3));
onboardingSkip4.addEventListener("click", () => {
  // Skip leaves enrichment exactly as it was (off, or a previously-saved
  // provider on a re-run) — nothing is written here.
  showOnboardingStep(5);
});
onboardingNext4.addEventListener("click", async () => {
  if (!onboardingAiFormApi.canSave()) return;
  onboardingNext4.disabled = true;
  const result = await window.rippleCheck.setAiProvider(onboardingAiFormApi.values());
  onboardingNext4.disabled = false;
  if (result?.encryptionUnavailable) {
    onboardingAiStatus.textContent = "This machine has no secure key store — skip for now.";
    onboardingAiStatus.dataset.tone = "error";
    return;
  }
  if (result?.error) {
    onboardingAiStatus.textContent = "Couldn't save — check the key and any base URL/model, or skip.";
    onboardingAiStatus.dataset.tone = "error";
    return;
  }
  applyAiStatus(result);
  showOnboardingStep(5);
});

// Step 5 — detail level
for (const input of onboardingDetailInputs) {
  input.addEventListener("change", () => {
    if (input.checked) onboardingDetailLevel = input.value;
  });
}
onboardingBack5.addEventListener("click", () => showOnboardingStep(4));
onboardingFinish.addEventListener("click", async () => {
  await applyDetailLevel(onboardingDetailLevel);
  finishOnboarding();
});

fillMonograms();

// --- Mode switcher ---------------------------------------------------------

const MODE_PANELS = { project: modeProject, cloud: modeCloud, cli: modeCli };
let activeMode = "project";
let mcpStatusTimer = null;
let cliInfoLoaded = false;

function stopMcpStatusPolling() {
  if (mcpStatusTimer) {
    clearInterval(mcpStatusTimer);
    mcpStatusTimer = null;
  }
}

function setActiveMode(mode) {
  if (mode === activeMode) return;
  activeMode = mode;

  for (const [name, panel] of Object.entries(MODE_PANELS)) {
    panel.hidden = name !== mode;
  }
  for (const tab of modeTabs) {
    if (tab.dataset.mode === mode) {
      tab.setAttribute("aria-current", "page");
    } else {
      tab.setAttribute("aria-current", "false");
    }
  }

  stopMcpStatusPolling();

  if (mode === "cloud") {
    refreshCloudPanel();
  } else if (mode === "cli") {
    initCliPanel();
  }
}

for (const tab of modeTabs) {
  tab.addEventListener("click", () => setActiveMode(tab.dataset.mode));
}

// --- Cloud mode --------------------------------------------------------

function showCloudState(section) {
  for (const view of [cloudLoggedOut, cloudLoading, cloudEmpty, cloudError, cloudList]) {
    view.hidden = view !== section;
  }
}

function buildCloudScanCard(scan) {
  const card = el("div", { className: "cloud-item" });
  card.appendChild(
    el("span", { className: "cloud-item-folder", text: scan.folderName || "Unknown folder" })
  );
  if (scan.scannedAt) {
    const date = new Date(scan.scannedAt);
    card.appendChild(
      el("span", {
        className: "cloud-item-meta",
        text: date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }),
      })
    );
  }
  return card;
}

async function refreshCloudPanel() {
  cloudRepoSection.hidden = !isLoggedIn;

  if (!isLoggedIn) {
    showCloudState(cloudLoggedOut);
    return;
  }

  showCloudState(cloudLoading);

  const result = await window.rippleCheck.fetchCloudHistory();

  if (result?.error === "not-logged-in") {
    showCloudState(cloudLoggedOut);
    return;
  }
  if (result?.error) {
    // request-failed (bad HTTP status) or network (fetch threw) — distinct
    // from a genuinely empty scan list, so it doesn't misreport server/network
    // trouble as "no history yet".
    showCloudState(cloudError);
    return;
  }

  const scans = result?.scans ?? [];
  if (scans.length === 0) {
    showCloudState(cloudEmpty);
    return;
  }

  cloudList.innerHTML = "";
  for (const scan of scans) {
    cloudList.appendChild(buildCloudScanCard(scan));
  }
  showCloudState(cloudList);
}

// --- Cloud repo browser --------------------------------------------------
//
// Lets a logged-in user pick one of their own GitHub repos, download it,
// and start watching it — reusing the exact same startWatching() flow a
// manually-picked folder goes through (see main.js's
// download-and-watch-repo handler); nothing about scanning is duplicated
// here, this is purely the browse/pick/progress UI.

/**
 * Turns a repo-browse/download failure into a specific, actionable message.
 * Accepts the whole IPC result (so github_api_error can surface the real HTTP
 * status repos.php attached) or a bare code string.
 */
function describeRepoError(result) {
  const code = typeof result === "string" ? result : result?.error;
  const status = typeof result === "object" && result ? result.status : undefined;
  switch (code) {
    case "reauth_required":
      return "Please log out and log back in to enable repo browsing.";
    case "missing_token":
      return "Your GitHub sign-in didn't grant repo access. Log out and log back in to enable it.";
    case "github_api_error":
      return status
        ? `GitHub returned an error (HTTP ${status}). Try again in a moment.`
        : "Couldn't reach GitHub. Check your connection and try again.";
    case "db_unavailable":
      return "Can't reach RippleCheck's server right now. Try again shortly.";
    case "endpoint_unavailable":
      return status
        ? `RippleCheck's repo service is unavailable (HTTP ${status}). Try again later.`
        : "RippleCheck's repo service is unavailable. Try again later.";
    case "not-logged-in":
      return "Please log in to browse repos.";
    case "network":
      return "Network error reaching the server. Check your connection.";
    case "repo_empty":
      return "This repo is empty — there's nothing to download yet.";
    case "download-failed":
      return "The repo download failed. Try again in a moment.";
    case "extract-failed":
      return "Couldn't unpack the downloaded repo. Try again.";
    default:
      return "Something went wrong. Try again in a moment.";
  }
}

function setCloudRepoStatus(text, tone) {
  cloudRepoStatus.textContent = text;
  if (tone) {
    cloudRepoStatus.dataset.tone = tone;
  } else {
    delete cloudRepoStatus.dataset.tone;
  }
}

function buildRepoRow(repo, onPick = selectRepo) {
  const row = el("button", { className: "cloud-item cloud-repo-item", type: "button" });

  const left = el("span", { className: "cloud-item-folder" });
  if (repo.private) {
    left.appendChild(el("span", { className: "cloud-repo-visibility", text: "Private" }));
  }
  left.appendChild(document.createTextNode(repo.full_name));
  row.appendChild(left);

  if (repo.updated_at) {
    row.appendChild(
      el("span", {
        className: "cloud-item-meta",
        text: new Date(repo.updated_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }),
      })
    );
  }

  row.addEventListener("click", () => onPick(repo));
  return row;
}

async function loadRepoList() {
  setCloudRepoStatus("Loading repos…");
  cloudRepoList.hidden = true;

  const result = await window.rippleCheck.fetchGithubRepos();

  if (result?.error) {
    setCloudRepoStatus(describeRepoError(result), "error");
    return;
  }

  const repos = result?.repos ?? [];
  if (repos.length === 0) {
    setCloudRepoStatus("No repos found.");
    return;
  }

  cloudRepoList.innerHTML = "";
  for (const repo of repos) {
    cloudRepoList.appendChild(buildRepoRow(repo));
  }
  cloudRepoList.hidden = false;
  setCloudRepoStatus("");
}

cloudBrowseReposButton.addEventListener("click", loadRepoList);

let repoCloneInFlight = false;

async function selectRepo(repo) {
  if (repoCloneInFlight) return;
  repoCloneInFlight = true;

  const repoButtons = [...cloudRepoList.querySelectorAll(".cloud-repo-item")];
  for (const button of repoButtons) button.disabled = true;
  setCloudRepoStatus(`Downloading ${repo.full_name}…`);

  const result = await window.rippleCheck.downloadAndWatchRepo(repo.full_name);

  repoCloneInFlight = false;
  for (const button of repoButtons) button.disabled = false;

  if (result?.error) {
    setCloudRepoStatus(describeRepoError(result), "error");
    return;
  }

  setCloudRepoStatus(`Watching ${repo.full_name}.`);
  setActiveMode("project");
}

/** "1.4 MB" / "312 KB" — for live download progress when the server sent
 * no Content-Length (GitHub's codeload streams chunked), where a real
 * percentage doesn't exist. */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Live text for the downloading stage: a real percentage when
 * Content-Length was available, a live byte counter otherwise — never a
 * made-up percentage. */
function describeDownloadProgress({ percent, receivedBytes }) {
  if (typeof percent === "number") return `Downloading… ${percent}%`;
  const size = formatBytes(receivedBytes);
  return size ? `Downloading… ${size}` : "Downloading…";
}

// Shared between the Cloud tab's repo download and the Project tab's
// "Upload zip" button — only one of those flows can be in progress at a
// time, so updating both status elements on every event is harmless.
window.rippleCheck.onRepoCloneProgress((progress) => {
  const text =
    progress.stage === "downloading"
      ? describeDownloadProgress(progress)
      : progress.stage === "extracting"
        ? "Extracting…"
        : "";
  setCloudRepoStatus(text);
  uploadZipStatus.textContent = text;
  // Also drive the onboarding step-2 inline browser when a repo is being
  // downloaded there (only one clone can be in flight at a time).
  if (onboardingActive) setOnboardingRepoStatus(text);
});

// --- CLI mode ------------------------------------------------------------

async function refreshMcpStatus() {
  const connected = await window.rippleCheck.checkMcpStatus();
  cliStatusPill.dataset.state = connected ? "connected" : "disconnected";
  cliStatusLabel.textContent = connected ? "Connected" : "Not connected yet";
}

async function initCliPanel() {
  if (!cliInfoLoaded) {
    const info = await window.rippleCheck.getCliInfo();
    cliCommandText.textContent = info.command;
    // Only stop re-fetching once the portable npx command is showing —
    // until the package is published, each open re-asks so the tab
    // upgrades from the local-path command without an app restart.
    cliInfoLoaded = info.published === true;
  }

  await refreshMcpStatus();
  mcpStatusTimer = setInterval(refreshMcpStatus, 3000);
}

cliCopyButton.addEventListener("click", async () => {
  await window.rippleCheck.copyToClipboard(cliCommandText.textContent);
  flashCopied(cliCopyButton, "Copy");
});

// Manual re-check of the npm-published state — upgrades the shown command
// to the portable npx form the moment the package is live, no restart.
cliRefreshButton.addEventListener("click", async () => {
  cliRefreshButton.disabled = true;
  cliRefreshButton.textContent = "Checking…";

  const info = await window.rippleCheck.refreshCliInfo();
  cliCommandText.textContent = info.command;
  cliInfoLoaded = info.published === true;

  cliRefreshButton.textContent = info.published ? "Up to date" : "Not published yet";
  setTimeout(() => {
    cliRefreshButton.textContent = "Refresh";
    cliRefreshButton.disabled = false;
  }, 1600);
});

// --- Settings slide-over -------------------------------------------------

let cacheToastTimer = null;

function openSettings() {
  settingsScrim.hidden = false;
  settingsPanel.hidden = false;
  // Force layout so the transition animates from the off-screen state
  // instead of snapping instantly on first open.
  requestAnimationFrame(() => {
    settingsScrim.classList.add("is-open");
    settingsPanel.classList.add("is-open");
  });
}

function closeSettings() {
  settingsScrim.classList.remove("is-open");
  settingsPanel.classList.remove("is-open");
  // Match the CSS transition duration so the panel finishes sliding out
  // before it gets `hidden` (which would kill the animation mid-flight).
  setTimeout(() => {
    if (!settingsPanel.classList.contains("is-open")) {
      settingsScrim.hidden = true;
      settingsPanel.hidden = true;
    }
  }, 260);
}

settingsOpenButton.addEventListener("click", openSettings);
settingsCloseButton.addEventListener("click", closeSettings);
settingsScrim.addEventListener("click", closeSettings);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && settingsPanel.classList.contains("is-open")) {
    closeSettings();
  }
});

settingsSignoutButton.addEventListener("click", async () => {
  await window.rippleCheck.signOut();
  // The auth-state handler above will observe loggedIn=false and close
  // this panel via closeSettings(). No further action needed here.
});

settingsRerunOnboardingButton.addEventListener("click", () => {
  closeSettings();
  startOnboarding();
});

settingsResetCacheButton.addEventListener("click", async () => {
  await window.rippleCheck.resetScanCache();
  settingsCacheToast.classList.add("is-visible");
  if (cacheToastTimer) clearTimeout(cacheToastTimer);
  cacheToastTimer = setTimeout(() => {
    settingsCacheToast.classList.remove("is-visible");
    cacheToastTimer = null;
  }, 1800);
});

/**
 * Single write path for detail-level changes — used by both the Settings
 * panel radios and the persistent Simple / Deep Dive segmented control at
 * the top of the results panel. Updates the module-scope
 * `currentDetailLevel`, syncs both UI groups, persists via IPC, and
 * rebuilds every card already on screen at the new level so the switch
 * feels instant. Never triggers change events on inputs (only their
 * .checked state), so there's no loop back into this function.
 */
async function applyDetailLevel(newLevel, { persist = true } = {}) {
  if (newLevel === currentDetailLevel && persist) return;
  currentDetailLevel = newLevel;

  for (const input of detailLevelInputs) {
    input.checked = input.value === newLevel;
  }
  for (const tab of detailLevelTabs) {
    tab.setAttribute("aria-selected", tab.dataset.level === newLevel ? "true" : "false");
  }

  rerenderVisibleCards();

  if (persist) {
    await window.rippleCheck.setDetailLevel(newLevel);
  }
}

/**
 * Rebuilds every impact card already in the DOM using its stored payload
 * at the current detail level. Session-summary cards have no payload in
 * `cardPayloads` and are skipped in place. The `is-fresh` glow class is
 * stripped from replacements — five cards simultaneously pulsing on a
 * tab-switch would just be visual noise.
 */
function rerenderVisibleCards() {
  const cards = Array.from(entryList.querySelectorAll(".entry-card"));
  for (const oldCard of cards) {
    const payload = cardPayloads.get(oldCard);
    if (!payload) continue;
    const newCard = buildEntryCard(payload);
    newCard.classList.remove("is-fresh");
    cardPayloads.set(newCard, payload);
    oldCard.replaceWith(newCard);
  }
}

for (const input of detailLevelInputs) {
  input.addEventListener("change", () => {
    if (!input.checked) return;
    applyDetailLevel(input.value);
  });
}

for (const tab of detailLevelTabs) {
  tab.addEventListener("click", () => {
    applyDetailLevel(tab.dataset.level);
  });
}

// --- Settle window (report timing) ----------------------------------------
//
// Shown in seconds because that's the unit the user is reasoning in ("give
// the assistant a few seconds to finish"); stored in ms, which is what the
// watcher's timers take. Main clamps the value, so this is presentation only.

const settleWindowInput = document.getElementById("settle-window-input");
const settleWindowHint = document.getElementById("settle-window-hint");

function applySettleWindow(settleWindowMs) {
  const seconds = (settleWindowMs ?? 3500) / 1000;
  settleWindowInput.value = String(seconds);
  settleWindowHint.textContent =
    seconds === 3.5 ? "Default 3.5s" : `Waiting ${seconds}s after the last edit`;
}

// "change" rather than "input" so a half-typed number ("1" on the way to
// "15") isn't persisted and clamped mid-keystroke.
settleWindowInput.addEventListener("change", async () => {
  const seconds = Number(settleWindowInput.value);
  if (!Number.isFinite(seconds)) return;
  const settings = await window.rippleCheck.setSettleWindow(Math.round(seconds * 1000));
  applySettleWindow(settings.settleWindowMs);
});

(async () => {
  const version = await window.rippleCheck.getAppVersion();
  settingsVersion.textContent = `v${version}`;
})();

(async () => {
  const status = await window.rippleCheck.getAiProvider();
  applyAiStatus(status);
})();

(async () => {
  const settings = await window.rippleCheck.getSettings();
  // Don't re-persist during initial load — we're just reflecting the
  // stored value into both UI groups.
  await applyDetailLevel(settings.detailLevel, { persist: false });

  currentPlatform = settings.platform;
  updatePlatformDisplay(currentPlatform);

  applySettleWindow(settings.settleWindowMs);

  // First-run "Generate fix prompt" callout: once dismissed it never shows
  // again. Tracked here so buildEntryCard can reveal it the first time a card
  // with a fix-prompt button appears.
  fixPromptHintDismissed = settings.fixPromptHintDismissed === true;

  // First launch (or a cleared install) → run onboarding before the
  // workspace is usable. Returning users skip straight in.
  if (!settings.onboardingComplete) {
    startOnboarding();
  }
})();

// --- Platform bar (fixed bottom) ------------------------------------------
//
// Honest detection only. Claude Code lights up bright when the existing
// check-mcp-status IPC returns true (RippleCheck's MCP entry present in
// ~/.claude.json). Cursor and Codex have no verifiable signal wired up
// yet, so their badges stay muted+dashed with an explicit tooltip — a
// bright badge means "we saw it", not "you probably have it installed".

/** Fills in the monogram icon inside each platform badge. Idempotent —
 * called once at module init. Colors are the same fixed palette used by
 * every other monogram in the app (see main.js's tech-badges.js), so
 * "CC" is the same amber square whether it's in the header or here. */
function initPlatformBar() {
  // Kept in the same order the HTML declares them so the icons line up
  // with each badge (Claude Code is the only one JS updates interactively;
  // the other two are static "not yet detected" badges).
  const platformCells = [
    { badge: platformBarClaudeCodeBadge, letters: "CC", color: "#D97706" },
    { badge: platformBarClaudeCodeBadge.nextElementSibling, letters: "CU", color: "#7C3AED" },
    { badge: platformBarClaudeCodeBadge.nextElementSibling?.nextElementSibling, letters: "CO", color: "#059669" },
  ];
  for (const { badge, letters, color } of platformCells) {
    if (!badge) continue;
    const iconSlot = badge.querySelector(".platform-badge-icon");
    if (iconSlot) {
      iconSlot.replaceChildren(monogram({ letters, color, variant: "sm" }));
    }
  }
}

async function refreshPlatformBar() {
  let connected = false;
  try {
    connected = await window.rippleCheck.checkMcpStatus();
  } catch {
    connected = false;
  }
  platformBarClaudeCodeBadge.dataset.connected = String(connected);
  platformBarClaudeCodeBadge.title = connected
    ? "Claude Code detected — RippleCheck's MCP entry is registered in ~/.claude.json."
    : "Not detected — Claude Code doesn't have RippleCheck's MCP entry registered in ~/.claude.json yet.";
}

initPlatformBar();
refreshPlatformBar();
// Poll on the same 3s cadence the CLI panel already uses, but always on
// rather than only while the CLI tab is active — this bar is persistent.
setInterval(refreshPlatformBar, 3000);
