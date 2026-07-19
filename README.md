<h1 align="center">RippleCheck</h1>

<p align="center">
  <strong>Insurance for AI-generated code.</strong><br>
  Know what else breaks before you change anything.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ripplecheck-mcp"><img alt="npm" src="https://img.shields.io/npm/v/ripplecheck-mcp?color=%230a7ea4&label=npm"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green"></a>
  <img alt="Platform" src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey">
  <img alt="Node" src="https://img.shields.io/badge/node-%E2%89%A518-brightgreen">
</p>

---

## Why this exists

An AI assistant changes one function and confidently reports success. It was right
about that function. What it didn't check is the eleven other files that call it.

This failure mode is specific to fast, confident, wide-reaching edits: the change is
locally correct and globally wrong, and you find out later, somewhere else. Reading a
diff doesn't help — the breakage isn't in the diff.

RippleCheck answers one question, before you commit: **what else touches this?**

```
⚠️  `getUserSession` is used in 3 other places: src/api/auth.ts, src/pages/login.tsx,
    src/hooks/useAuth.ts — changing it could affect all of them.
✅  `formatBytes` isn't used anywhere else — safe to change.
```

The scan is static, deterministic, and entirely local. No account, no network call, no
code leaves your machine.

## How it works

RippleCheck resolves real references — not text matches — using
[ts-morph](https://ts-morph.com) for JavaScript/TypeScript and Python's own `ast`
module for Python. For every top-level function, component and class it reports the
defining file and every other file that references it, with line numbers.

Each finding carries a risk level derived purely from fan-out:

| Risk | Meaning |
|:--|:--|
| ✅ `safe` | Used nowhere else |
| ⚠️ `moderate` | Used in 1–2 other files |
| 🔴 `high` | Used in 3 or more other files |

That is the entire heuristic, and it is deliberately simple: it tells you *where to
look*, not how dangerous your particular edit is.

**Languages:** `.js` `.jsx` `.ts` `.tsx`, inline `<script>` blocks in `.html`, and
`.py`. Python analysis requires `python3` (or `py -3` on Windows) on your `PATH`; if
it's absent, Python files are skipped with a note and the JS/TS scan proceeds normally.

## Install

Three ways to run it, depending on where you want the answer to appear.

### 1. MCP server

Exposes a `check_impact` tool to any MCP-compatible client. For Claude Code:

```bash
claude mcp add ripplecheck --scope user -- npx -y ripplecheck-mcp
```

Then ask your assistant to check the impact of a change, or let it call the tool on its
own.

### 2. Claude Code hooks

For automatic reporting with no prompting at all. The hook runner ships inside the npm
package but is not exposed as a standalone binary, so point at it directly — in
`.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "node /path/to/ripplecheck/src/hook-runner.js --refresh", "timeout": 10 }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "node /path/to/ripplecheck/src/hook-runner.js --report", "timeout": 20 }
        ]
      }
    ]
  }
}
```

The split is intentional. `PostToolUse` runs silently after every edit, keeping a warm
background index current. `Stop` fires once when the assistant finishes its turn and
prints a single report covering everything it touched — reporting after each individual
edit would describe a half-finished state.

### 3. Desktop app

A standalone Electron app (macOS and Windows) that watches a folder and shows impact
live. It depends on no AI tool, no hooks and no MCP support — it drives the same
scanner directly.

**Download v0.1.1:**

| Platform | Download |
|:--|:--|
| macOS (Apple Silicon) | [RippleCheck-0.1.1-arm64.dmg](https://github.com/RippleCheck/ripplecheck/releases/download/v0.1.1/RippleCheck-0.1.1-arm64.dmg) |
| Windows (x64) | [RippleCheck Setup 0.1.1.exe](https://github.com/RippleCheck/ripplecheck/releases/download/v0.1.1/RippleCheck.Setup.0.1.1.exe) |

Neither installer is code-signed, so both platforms warn on first launch. On macOS,
drag to Applications then **right-click → Open** (double-clicking the first time gives
a dialog with no "open anyway" button). On Windows, SmartScreen → **More info** →
**Run anyway**.

> **The Windows build has not been tested on real Windows hardware.** It builds cleanly
> and contains the correct files, but was produced on macOS and never run. Treat it as
> "compiles and contains the right files," not "known working" — and please
> [open an issue](https://github.com/RippleCheck/ripplecheck/issues) with what you find.
> The macOS build has been installed and verified to run real scans.

macOS Intel is not currently built. To build from source instead:

```bash
git clone https://github.com/RippleCheck/ripplecheck.git
cd ripplecheck && npm install
npm run app                 # run it
npm run package:mac         # -> dist/*.dmg
npm run package:win         # -> dist/*.exe  (needs Rosetta 2 on Apple Silicon; see NOTES.md)
```

### CLI

The package publishes two binaries: `ripplecheck-mcp` (the MCP server, above) and
`ripplecheck` (the scanner):

```bash
npx -p ripplecheck-mcp ripplecheck /path/to/project
```

Prints the dependency map as JSON, followed by a plain-English summary.

## Features

**Deterministic scanning.** Reference-based resolution via ts-morph, not regex. Same
input, same output, every time. Free and local, permanently — this is the core of the
tool, not a trial tier.

**Adaptive report timing.** The desktop app waits for edits to settle (default 3.5s,
configurable) before reporting, so a burst of AI-driven edits across many files lands
as one coherent report instead of one per file.

**Retest.** Re-scan a single finding after you've fixed it and get a direct answer —
fixed, unchanged, or now pointing somewhere different. No re-reading a fresh report
hunting for the same symbol.

**Fix prompts.** Generate a copy-paste-ready prompt describing a finding and its call
sites, for handing straight to an AI assistant.

**Session summaries.** A running view of what changed during a work session and the
risk it accumulated, plus a whole-repository overview with a risk distribution gauge
and detected tech-stack badges.

**GitHub repository browser.** Sign in to browse your repositories and scan one
directly, without cloning it by hand first.

**Optional AI enrichment (BYOK).** Adds a plain-English summary and a refined fix
prompt on top of the deterministic result. Bring your own API key: it's stored
encrypted at rest via Electron's `safeStorage` and sent **only to your chosen
provider** — never to any RippleCheck server, because there isn't one. With no key
configured, enrichment is skipped silently and the deterministic output is unchanged.

## Limitations

Worth knowing before you rely on it:

- **The risk level is a fan-out count.** Three usages reads as "high" whether the change
  is a comment tweak or a signature rewrite.
- **Only top-level declarations are tracked.** Class methods, object properties and
  nested closures are not individually mapped.
- **Same-name collisions.** Two unrelated functions sharing a name across files can be
  conflated, particularly in the Python path, which links by name rather than by
  resolved reference.
- **Dynamic references are invisible.** `obj[methodName]()`, string-based imports and
  runtime dispatch cannot be seen by static analysis. A clean report is not proof that
  nothing else depends on a symbol.
- **The Windows installer is built but untested.** It compiles and contains the correct
  files, but has never been run on real Windows hardware.
- **Neither installer is code-signed.** macOS Gatekeeper and Windows SmartScreen will
  both warn on first launch. See [NOTES.md](NOTES.md) for the workaround.
- **First scan of a large repository is slow.** A warm index makes subsequent scans
  fast, but the initial parse scales with project size.

## Development

```bash
npm install
npm test                # node --test test/
node src/index.js .     # scan this repository
```

`node_modules`, `.git`, `dist` and `dist-electron` are excluded from scans — build
output re-emits your own source and would otherwise report every symbol twice.

## License

[MIT](LICENSE) © Agrajeet Verma
