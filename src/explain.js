/**
 * Turns scanner.js output into a list of impact entries a UI or CLI can
 * render — plain-English sentence plus a structured riskLevel, the file
 * the symbol is defined in, and the files that use it. Relies on scanner.js's
 * convention that the first element in each array is a plain string (the
 * file where the function/component is defined), and every element after
 * it is a `{ file, line }` object for a place that uses it.
 */
const RISK_EMOJI = { safe: "✅", moderate: "⚠️", high: "🔴" };

function riskLevelFor(otherFilesCount) {
  if (otherFilesCount === 0) return "safe";
  if (otherFilesCount <= 2) return "moderate";
  return "high";
}

function buildSkippedNote(skipped) {
  if (!skipped || skipped.length === 0) return null;

  const fileNames = skipped.map((entry) => entry.file).join(", ");
  const plural = skipped.length === 1 ? "file" : "files";
  return `Note: ${skipped.length} ${plural} couldn't be checked (${fileNames}) — you may want to look at those manually.`;
}

/** A message with no function/riskLevel of its own (diagnostics, skip notes). */
function noteEntry(sentence) {
  return { name: null, definingFile: null, riskLevel: null, sentence, usedIn: [] };
}

function explainImpact(scanResult) {
  const skippedNote = buildSkippedNote(scanResult && scanResult.skipped);
  // Scanner-level advisories (e.g. "Python detected but python3 missing") —
  // rendered as plain note entries, same as the skipped-files note.
  const scannerNotes = Array.isArray(scanResult && scanResult.notes) ? scanResult.notes : [];

  if (scanResult && typeof scanResult.diagnostic === "string") {
    const entries = [noteEntry(scanResult.diagnostic), ...scannerNotes.map(noteEntry)];
    if (skippedNote) entries.push(noteEntry(skippedNote));
    return entries;
  }

  const functionMap = (scanResult && scanResult.functions) || {};
  const names = Object.keys(functionMap);

  if (names.length === 0) {
    const entries = [noteEntry("No functions found to check."), ...scannerNotes.map(noteEntry)];
    if (skippedNote) entries.push(noteEntry(skippedNote));
    return entries;
  }

  const entries = [];

  for (const name of names) {
    const files = functionMap[name];
    // scanner.js convention: index 0 is the defining file (a plain string).
    // Carrying it on the entry gives every finding a stable identity
    // (name + definingFile) that survives a re-scan — that pair is what
    // "Retest" looks the symbol back up by.
    const definingFile = typeof files[0] === "string" ? files[0] : null;
    const otherFiles = files.slice(1); // [{ file, line }, ...] — see scanner.js

    let sentence;
    if (otherFiles.length === 0) {
      sentence = `\`${name}\` isn't used anywhere else — safe to change.`;
    } else if (otherFiles.length === 1) {
      sentence = `\`${name}\` is also used in \`${otherFiles[0].file}\` — check that file after you change this.`;
    } else {
      sentence = `\`${name}\` is used in ${otherFiles.length} other places: ${otherFiles
        .map((entry) => entry.file)
        .join(", ")} — changing it could affect all of them.`;
    }

    entries.push({
      name,
      definingFile,
      riskLevel: riskLevelFor(otherFiles.length),
      sentence,
      usedIn: otherFiles,
    });
  }

  for (const note of scannerNotes) entries.push(noteEntry(note));
  if (skippedNote) entries.push(noteEntry(skippedNote));

  return entries;
}

/**
 * Finds one symbol in a fresh explainImpact() result by the identity a
 * finding row carries (name + the file it was defined in). Falls back to a
 * name-only match when the symbol moved files, so a rename of its home
 * doesn't read as "disappeared".
 */
function findEntryByIdentity(entries, name, definingFile) {
  const named = entries.filter((entry) => entry.name === name);
  if (named.length === 0) return null;
  return named.find((entry) => entry.definingFile === definingFile) ?? named[0];
}

/**
 * Compares one finding against its counterpart in a later scan — the
 * "did my fix actually land?" question the Retest button asks. Returns a
 * verdict the UI renders verbatim:
 *
 *   • "fixed"     — the symbol is gone, or no longer used anywhere else.
 *   • "unchanged" — still used in exactly the same files.
 *   • "changed"   — still used, but somewhere different (or it moved files).
 *
 * Comparison is by *file set*, deliberately not line numbers: editing the
 * call site shifts every line below it, and that shift isn't a change in
 * who depends on the symbol.
 */
function compareFinding(previousEntry, currentEntries) {
  const { name, definingFile } = previousEntry;
  const current = findEntryByIdentity(currentEntries, name, definingFile);

  if (!current) {
    return { status: "fixed", sentence: `\`${name}\` is no longer found in the project.`, usedIn: [] };
  }

  const currentUsedIn = current.usedIn ?? [];
  if (currentUsedIn.length === 0) {
    return {
      status: "fixed",
      sentence: `\`${name}\` isn't used anywhere else any more — safe to change.`,
      usedIn: [],
      riskLevel: current.riskLevel,
    };
  }

  const before = new Set((previousEntry.usedIn ?? []).map((usage) => usage.file));
  const after = new Set(currentUsedIn.map((usage) => usage.file));
  const sameFiles = before.size === after.size && [...before].every((file) => after.has(file));
  const movedHome = definingFile != null && current.definingFile !== definingFile;

  if (sameFiles && !movedHome) {
    return {
      status: "unchanged",
      sentence: current.sentence,
      usedIn: currentUsedIn,
      riskLevel: current.riskLevel,
    };
  }

  return {
    status: "changed",
    sentence: current.sentence,
    usedIn: currentUsedIn,
    riskLevel: current.riskLevel,
  };
}

/**
 * Renders explainImpact()'s entries as the emoji-prefixed, newline-joined
 * text daemon.js/hook-runner.js/mcp-server.js all show verbatim — kept
 * here so the three stay in sync instead of each re-implementing the
 * emoji mapping.
 */
function formatEntriesAsText(entries) {
  return entries
    .map((entry) => {
      const emoji = RISK_EMOJI[entry.riskLevel];
      return emoji ? `${emoji} ${entry.sentence}` : entry.sentence;
    })
    .join("\n");
}

export { explainImpact, formatEntriesAsText, compareFinding };
