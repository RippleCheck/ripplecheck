# RippleCheck — packaging & install notes

## Building

```bash
npm run package:mac   # -> dist/RippleCheck-<version>-<arch>.dmg
npm run package:win   # -> dist/RippleCheck Setup <version>.exe  (NSIS installer)
```

Output lands in `dist/` (gitignored). Icons are generated from `assets/app-icon.png`
into `build/` (`icon.icns` for macOS, `icon.ico` for Windows).

### Building the Windows target on an Apple Silicon Mac requires Rosetta 2

electron-builder drives NSIS through `makensis`, and the binary it ships for macOS is
**x86_64 only**. On an arm64 Mac without Rosetta 2 the build dies part-way through with:

```
⨯ Cannot spawn .../nsis-3.0.4.1/mac/makensis: Error: spawn Unknown system error -86
```

Error 86 is `EBADARCH` — "Bad CPU type in executable". Install Rosetta once and the
build succeeds:

```bash
softwareupdate --install-rosetta --agree-to-license
```

Building on Windows, or on a Windows CI runner, needs none of this — `makensis` runs
natively there.

> This step is easy to misdiagnose. On first run electron-builder also downloads the
> `nsis`/`winCodeSign` toolchains from GitHub, and a slow network can stall that with
> `Timeout awaiting 'request' for 600000ms` — which looks like the same failure but
> isn't. Check whether `makensis` exists in the cache before blaming the network:
> if it's there, the problem is the architecture, not the download.

**Note that `npm run package:win` exits 0 even when the build fails.** electron-builder
reports the error in its log but the wrapper still returns success, so CI must assert
that the `.exe` actually exists rather than trusting the exit code.

## macOS: the app is not code-signed

There is no Apple Developer account yet, so the build is configured with
`mac.identity: null` — the `.dmg` is unsigned and un-notarized.

**What users will see:** double-clicking RippleCheck.app on first launch shows
*"RippleCheck can't be opened because Apple cannot check it for malicious software"*
(or *"...is from an unidentified developer"*). This is Gatekeeper reacting to the
missing signature, not to anything wrong with the app.

**The workaround — first launch only:**

1. Drag **RippleCheck.app** from the mounted `.dmg` into **Applications**.
2. In Applications, **right-click** (or Control-click) RippleCheck → **Open**.
3. In the dialog that appears, click **Open** again.

macOS remembers the decision, so every launch after that is a normal double-click.

> Right-click → Open is the specific gesture that works. Double-clicking gives you a
> dialog with no "open anyway" button. If you land there, the equivalent path is
> **System Settings → Privacy & Security**, where a *"RippleCheck was blocked"* row
> appears with an **Open Anyway** button for about an hour after the blocked attempt.

Advanced users can also clear the quarantine flag directly:

```bash
xattr -dr com.apple.quarantine /Applications/RippleCheck.app
```

Do **not** hand-write a `com.apple.quarantine` value onto the bundle to test this —
macOS reads a malformed value as a damaged app and will move it to the Trash.

To remove the warning permanently, the app needs a Developer ID certificate
($99/year) plus notarization; at that point set `mac.identity` to the signing
identity and add an `afterSign` notarization step.

## Windows

The build targets **x64** explicitly (`win.target[].arch`). Without that pin,
electron-builder defaults to the *host* architecture — so running `--win` on an Apple
Silicon Mac silently produces an ARM64-only installer that won't run on the x64
machines almost all Windows users have.

The NSIS installer is also unsigned, so SmartScreen may show
*"Windows protected your PC"* → **More info** → **Run anyway**. Same underlying
situation as macOS: it goes away with a code-signing certificate.

**Untested on real hardware.** The installer builds cleanly and contains the expected
files (including the unpacked `python-analyzer.py`), but it has only ever been produced
on macOS — nobody has yet run it on Windows to confirm it installs, launches, or that
Python analysis finds an interpreter there. Verify before publishing a download link.

## What ships inside the app

The desktop app only needs part of this repo, so `build.files` is an allowlist:

- `src/app/**` — the Electron app itself (main, preload, renderer, fonts)
- `src/scanner.js`, `src/explain.js`, `src/python-bridge.js` — the scan pipeline
  `src/app/main.js` imports directly
- `src/python-analyzer.py` — the Python AST analyzer
- `assets/logo-mark.png`, `assets/app-icon.png` — the only assets referenced at runtime

Deliberately **not** shipped: `src/index.js`, `src/mcp-server.js`, `src/daemon.js`,
`src/daemon-client.js`, `src/hook-runner.js`. Those are the CLI/MCP entry points; the
app never imports them, and they could not run from inside the app bundle anyway (see
asar note below). The MCP server stack in `node_modules` (`@modelcontextprotocol/sdk`,
`zod`, `hono`, `express`, …) is excluded for the same reason — that alone is ~9MB of
the asar.

`package.json`'s `main` still points at `src/index.js` for the npm CLI. The build
overrides it for the packaged app via `build.extraMetadata.main`, so both entry points
stay correct without a second package.json.

### asar and the Python analyzer (important)

The app's source is packed into `app.asar`, a virtual archive. Electron patches `fs`
so JavaScript inside the app reads it transparently — **but the Python interpreter we
spawn is an ordinary external process with no such patch.** Handing it a path inside
the archive fails with `[Errno 20] Not a directory`, and Python analysis silently stops
working in the packaged build while continuing to work from source.

Two pieces keep this working, and they must stay in sync:

1. `build.asarUnpack` includes `**/python-analyzer.py`, so a real copy exists on disk
   at `app.asar.unpacked/src/python-analyzer.py`.
2. `src/python-bridge.js` rewrites `app.asar/` → `app.asar.unpacked/` in the analyzer
   path. Running from source there is no `app.asar` segment, so it is a no-op.

If you ever add another file that gets handed to an external process, it needs the
same treatment.

## Verifying a packaged build

Beyond "it built", check that the bundle actually resolves its own code:

```bash
ELECTRON_RUN_AS_NODE=1 /Applications/RippleCheck.app/Contents/MacOS/RippleCheck -e "
const asar='/Applications/RippleCheck.app/Contents/Resources/app.asar';
Promise.all([import(asar+'/src/scanner.js'), import(asar+'/src/explain.js')])
  .then(([s,e]) => console.log(e.formatEntriesAsText(e.explainImpact(s.scanProject('/path/to/a/project')))));
"
```

Point it at a project containing **both** `.js` and `.py` files. If Python symbols come
back in the output, the asar-unpack path is intact. If only JS symbols appear, item 2
above has regressed.
