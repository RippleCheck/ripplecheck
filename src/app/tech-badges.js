import fs from "node:fs";
import path from "node:path";

// Monogram + fixed color for every stack/tool RippleCheck can label.
// White letters on the color read at ≥ 4.5:1 contrast against the app's
// #0a0a0a canvas — all values are Tailwind-family "-600"/"-500" tones so
// distinct techs stay perceptibly different at a glance without any
// single one dominating. Reordering keys inside a category is fine;
// changing a color is a brand association, so change one deliberately.
const MONOGRAM_STYLE = {
  // Tech stacks
  react:         { letters: "RE", color: "#0891B2" },
  "react-native":{ letters: "RN", color: "#0EA5E9" },
  next:          { letters: "NX", color: "#64748B" },
  node:          { letters: "NO", color: "#16A34A" },
  typescript:    { letters: "TS", color: "#2563EB" },
  javascript:    { letters: "JS", color: "#CA8A04" },
  python:        { letters: "PY", color: "#6366F1" },
  java:          { letters: "JA", color: "#EA580C" },
  rust:          { letters: "RS", color: "#DC2626" },
  go:            { letters: "GO", color: "#0D9488" },

  // AI coding tools (header badge + bottom status bar)
  "claude-code": { letters: "CC", color: "#D97706" },
  cursor:        { letters: "CU", color: "#7C3AED" },
  codex:         { letters: "CO", color: "#059669" },
  // Shown when no coding tool is detected — branded as RippleCheck itself
  // rather than "??/Unknown", since an undetected tool is normal, not an
  // error. Same muted grey as `unknown` so the badge stays neutral.
  ripplecheck:   { letters: "RC", color: "#4B5563" },
  unknown:       { letters: "??", color: "#4B5563" },
};

function getMonogram(id) {
  return MONOGRAM_STYLE[id] || MONOGRAM_STYLE.unknown;
}

/**
 * Strips the leading semver operator (`^`, `~`, `>=`, `<`, `=`, `v`) and
 * anything after the first whitespace/comma so `"^18.2.0"` and
 * `">=3.11,<4"` both come out as `"18.2.0"` / `"3.11"`. Anything that
 * doesn't leave a version-like remainder returns null so callers can
 * silently drop it (per project rule: don't guess a version).
 */
function stripSemverPrefix(rawValue) {
  if (typeof rawValue !== "string") return null;
  const trimmed = rawValue.trim().replace(/^[v=^~<>]+/, "").trim();
  const head = trimmed.split(/[\s,]/)[0];
  return /^\d/.test(head) ? head : null;
}

function readFileSafely(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function readPackageJson(dirPath) {
  const text = readFileSafely(path.join(dirPath, "package.json"));
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function versionFromPackageJsonDep(dirPath, depName) {
  const pkg = readPackageJson(dirPath);
  if (!pkg) return null;
  const raw = pkg.dependencies?.[depName] ?? pkg.devDependencies?.[depName];
  return stripSemverPrefix(raw);
}

function nodeEnginesVersion(dirPath) {
  const pkg = readPackageJson(dirPath);
  return stripSemverPrefix(pkg?.engines?.node);
}

/**
 * pyproject.toml is TOML, but we only need one value — grep for
 * `requires-python = "..."` (PEP 621) or the older `python_requires`
 * without pulling in a TOML parser. Returns null on any failure.
 */
function pythonRequiresVersion(dirPath) {
  const text = readFileSafely(path.join(dirPath, "pyproject.toml"));
  if (!text) return null;
  const match = text.match(/(?:requires-python|python_requires)\s*=\s*"([^"]+)"/);
  return match ? stripSemverPrefix(match[1]) : null;
}

/**
 * go.mod's first `go X.Y[.Z]` directive. There's exactly one per module,
 * so a plain regex is fine — no need to walk imports or parse blocks.
 */
function goDirectiveVersion(dirPath) {
  const text = readFileSafely(path.join(dirPath, "go.mod"));
  if (!text) return null;
  const match = text.match(/^\s*go\s+(\d+\.\d+(?:\.\d+)?)/m);
  return match ? match[1] : null;
}

/**
 * Returns the detected version string (e.g. `"18.2.0"`) for the given
 * stack id, or null when it's unparseable/unavailable. Never guesses:
 * if we can't read it deterministically, callers should show the tech
 * name alone.
 */
function parseStackVersion(id, dirPath) {
  if (!dirPath) return null;
  switch (id) {
    case "react":         return versionFromPackageJsonDep(dirPath, "react");
    case "react-native":  return versionFromPackageJsonDep(dirPath, "react-native");
    case "next":          return versionFromPackageJsonDep(dirPath, "next");
    case "typescript":    return versionFromPackageJsonDep(dirPath, "typescript");
    case "node":          return nodeEnginesVersion(dirPath);
    case "python":        return pythonRequiresVersion(dirPath);
    case "go":            return goDirectiveVersion(dirPath);
    // java / rust / javascript: too varied to derive honestly — leave blank
    default:              return null;
  }
}

export { MONOGRAM_STYLE, getMonogram, parseStackVersion };
