import fs from "node:fs";
import path from "node:path";
import { Project, Node, ts, FileSystemRefreshResult } from "ts-morph";
import { scanPythonProject } from "./python-bridge.js";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const HTML_EXTENSION = ".html";
const PYTHON_EXTENSION = ".py";
// Directories whose contents are never user-authored source: dependencies,
// VCS internals, and build output. `dist`/`dist-electron` are here for the
// same reason `node_modules` is — a packaged build re-emits the project's own
// code, so scanning it reports every bundled symbol a second time as a
// phantom cross-file "usage" of the original.
const SKIP_DIRECTORIES = new Set(["node_modules", ".git", "dist", "dist-electron"]);
const SCRIPT_TAG_REGEX = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const SRC_ATTRIBUTE_REGEX = /\bsrc\s*=/i;

/**
 * True if any segment of `candidatePath` names a skipped directory.
 *
 * Callers pass a path already made relative to the project root, so a project
 * that itself sits inside a `dist` folder still scans normally — only build
 * output *nested within* it is skipped. Splits on both separators (a watcher
 * may hand back either this OS's or normalized forward slashes) rather than
 * hardcoding one.
 */
function hasSkippedDirectorySegment(candidatePath) {
  return candidatePath
    .split(path.win32.sep)
    .flatMap((part) => part.split(path.posix.sep))
    .some((segment) => SKIP_DIRECTORIES.has(segment));
}

/**
 * Recursively collects every file under rootDir, skipping the SKIP_DIRECTORIES
 * (dependencies, VCS internals, build output). Uses path.join/path.extname
 * exclusively so it behaves the same on Mac and Windows. A directory that
 * can't be listed (permissions, broken mount, etc.) is skipped rather than
 * aborting the whole walk.
 */
function walkFiles(rootDir) {
  const results = [];

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRECTORIES.has(entry.name)) continue;
        walk(entryPath);
        continue;
      }

      if (entry.isFile()) {
        results.push(entryPath);
      }
    }
  }

  walk(rootDir);
  return results;
}

/**
 * Collects every .js/.jsx/.ts/.tsx file under rootDir.
 */
function findSourceFiles(rootDir) {
  return walkFiles(rootDir).filter((filePath) => SOURCE_EXTENSIONS.has(path.extname(filePath)));
}

/**
 * Pulls the code out of every inline <script>...</script> block in an HTML
 * file. Scripts loaded from another file (<script src="...">) are skipped
 * since there is no inline code to scan here.
 */
function extractInlineScripts(htmlContent) {
  const scripts = [];
  let match;

  while ((match = SCRIPT_TAG_REGEX.exec(htmlContent)) !== null) {
    const [, attributes, content] = match;
    if (SRC_ATTRIBUTE_REGEX.test(attributes)) continue;
    if (content.trim().length === 0) continue;
    scripts.push(content);
  }

  return scripts;
}

/**
 * Counts files by the kind of site they suggest, for the "nothing found"
 * diagnostic. .js/.jsx/.ts/.tsx are reported together as ".js files" since
 * that distinction doesn't matter to someone trying to understand why the
 * scan came up empty.
 */
function countFilesByType(filePaths) {
  const counts = { html: 0, css: 0, js: 0, py: 0 };

  for (const filePath of filePaths) {
    const extension = path.extname(filePath);
    if (extension === HTML_EXTENSION) {
      counts.html += 1;
    } else if (extension === ".css") {
      counts.css += 1;
    } else if (extension === PYTHON_EXTENSION) {
      counts.py += 1;
    } else if (SOURCE_EXTENSIONS.has(extension)) {
      counts.js += 1;
    }
  }

  return counts;
}

function buildNothingFoundDiagnostic(filePaths) {
  const counts = countFilesByType(filePaths);
  return (
    `No JS/TS/Python logic found to check. This folder has ${counts.html} .html files, ` +
    `${counts.css} .css files, ${counts.js} .js files, ${counts.py} .py files. If your ` +
    `JavaScript lives in separate files linked via <script src>, point the scan at that ` +
    `specific file or folder.`
  );
}

/**
 * Runs the bundled Python analyzer (see python-bridge.js) and folds its
 * findings into the same maps the JS/TS scan built, so Python entries flow
 * through the identical explainImpact/riskLevel pipeline — no parallel
 * path. Returns a user-facing note string when Python files exist but deep
 * analysis couldn't run (no python3, or the analyzer failed), else null.
 * On a cross-language name collision the JS/TS entry wins — ts-morph's
 * language-service references are the more precise source, and one merged
 * entry mixing two languages' files would misattribute the risk.
 */
function mergePythonAnalysis(result, combinedSkipped, allFilePaths, projectPath) {
  const pythonFileCount = allFilePaths.filter(
    (filePath) => path.extname(filePath) === PYTHON_EXTENSION
  ).length;
  if (pythonFileCount === 0) return null;

  const python = scanPythonProject(projectPath);

  if (!python.available) {
    return "Python detected, but python3 isn't available on this machine for deep analysis.";
  }
  if (python.failed) {
    return "Python files detected, but the Python analysis step failed — showing JS/TS results only.";
  }

  for (const [name, files] of Object.entries(python.functions)) {
    if (!(name in result)) {
      result[name] = files;
    }
  }
  combinedSkipped.push(...python.skipped);
  return null;
}

/**
 * Finds every named function declaration, function/arrow-function assigned
 * to a variable (covers React components declared as `const Foo = () => {}`),
 * and class declaration in a source file.
 */
function collectDeclarations(sourceFile) {
  const declarations = [];

  for (const fn of sourceFile.getFunctions()) {
    const nameNode = fn.getNameNode();
    if (nameNode) {
      declarations.push({ name: fn.getName(), nameNode });
    }
  }

  for (const varDecl of sourceFile.getVariableDeclarations()) {
    const initializer = varDecl.getInitializer();
    const nameNode = varDecl.getNameNode();
    if (
      initializer &&
      Node.isIdentifier(nameNode) &&
      (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer))
    ) {
      declarations.push({ name: varDecl.getName(), nameNode });
    }
  }

  for (const cls of sourceFile.getClasses()) {
    const nameNode = cls.getNameNode();
    if (nameNode) {
      declarations.push({ name: cls.getName(), nameNode });
    }
  }

  return declarations;
}

/**
 * True if `node` is the identifier inside an import/export specifier
 * (`import { Foo }`, `import Foo from`, `import * as Foo`, `export { Foo }`,
 * `export * as Foo`) rather than a real usage site. Import specifiers are
 * almost always the first reference ts-morph returns for a name — without
 * filtering these out, the reported line number nearly always points at the
 * top-of-file import instead of where the function is actually called.
 */
function isImportOrExportSpecifierReference(node) {
  const parent = node.getParent();
  return (
    Node.isImportSpecifier(parent) ||
    Node.isImportClause(parent) ||
    Node.isNamespaceImport(parent) ||
    Node.isExportSpecifier(parent) ||
    Node.isNamespaceExport(parent)
  );
}

/**
 * Picks the line number to show for a name's usage in one file: the
 * earliest real usage (call, JSX element, property access, etc.) if one
 * exists, otherwise the import line as a fallback (covers a name that's
 * imported but only ever referenced through that import, e.g. re-exported).
 */
function pickRepresentativeLine(referenceNodes) {
  const actualUsageNodes = referenceNodes.filter(
    (node) => !isImportOrExportSpecifierReference(node)
  );
  const candidates = actualUsageNodes.length > 0 ? actualUsageNodes : referenceNodes;
  return Math.min(...candidates.map((node) => node.getStartLineNumber()));
}

/**
 * Adds a single file to the project without letting a bad file (permission
 * error, binary content, broken encoding, anything) abort the whole scan.
 * Records a failure in skippedFiles instead of throwing.
 */
function addSourceFileSafely(project, filePath, absoluteProjectPath, skippedFiles) {
  try {
    return project.addSourceFileAtPath(filePath);
  } catch {
    skippedFiles.push({ file: path.relative(absoluteProjectPath, filePath), reason: "unreadable" });
    return null;
  }
}

/**
 * A file that's readable but has real syntax errors (or is binary content
 * misread as text) fails here. Checking syntactic-only diagnostics (not
 * getPreEmitDiagnostics) matters: it avoids flagging valid .ts/.tsx files
 * that merely have type errors, which are common and not "broken".
 */
function hasSyntaxErrors(project, sourceFile) {
  try {
    return project.getProgram().getSyntacticDiagnostics(sourceFile).length > 0;
  } catch {
    return true;
  }
}

/**
 * Builds a fresh ts-morph Project for a directory: walks the tree, adds
 * every .js/.jsx/.ts/.tsx file (skipping ones that fail to read), extracts
 * and adds every inline <script> block from .html files as a virtual .js
 * file, then drops anything with real syntax errors. This is the expensive
 * step (parsing + type-checking everything) — a long-lived daemon runs it
 * once and reuses the result across requests via refreshOrAddFile below.
 */
function buildProjectForDirectory(projectPath) {
  const absoluteProjectPath = path.resolve(projectPath);
  const allFilePaths = walkFiles(absoluteProjectPath);
  const sourceFilePaths = allFilePaths.filter((filePath) =>
    SOURCE_EXTENSIONS.has(path.extname(filePath))
  );
  const htmlFilePaths = allFilePaths.filter((filePath) => path.extname(filePath) === HTML_EXTENSION);

  const project = new Project({
    compilerOptions: {
      allowJs: true,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      esModuleInterop: true,
    },
  });

  const skippedFiles = [];

  for (const filePath of sourceFilePaths) {
    addSourceFileSafely(project, filePath, absoluteProjectPath, skippedFiles);
  }

  for (const htmlFilePath of htmlFilePaths) {
    let htmlContent;
    try {
      htmlContent = fs.readFileSync(htmlFilePath, "utf8");
    } catch {
      skippedFiles.push({
        file: path.relative(absoluteProjectPath, htmlFilePath),
        reason: "unreadable",
      });
      continue;
    }

    const inlineScripts = extractInlineScripts(htmlContent);

    inlineScripts.forEach((scriptContent, index) => {
      const virtualFilePath = path.join(
        path.dirname(htmlFilePath),
        `${path.basename(htmlFilePath)}.inline-${index}.js`
      );
      try {
        project.createSourceFile(virtualFilePath, scriptContent);
      } catch {
        skippedFiles.push({
          file: path.relative(absoluteProjectPath, virtualFilePath),
          reason: "unreadable",
        });
      }
    });
  }

  for (const sourceFile of project.getSourceFiles()) {
    if (hasSyntaxErrors(project, sourceFile)) {
      skippedFiles.push({
        file: path.relative(absoluteProjectPath, sourceFile.getFilePath()),
        reason: "parse error",
      });
      project.removeSourceFile(sourceFile);
    }
  }

  return { project, absoluteProjectPath, skippedFiles, allFilePaths };
}

/**
 * Runs declaration + reference collection over whatever is currently in
 * `built.project` and shapes the final result. Safe to call repeatedly
 * against the same warm project (a daemon's hot path) — it never mutates
 * built.skippedFiles, so re-running it can't pile up duplicate entries.
 */
function computeScanResult(built) {
  const { project, absoluteProjectPath, skippedFiles, allFilePaths } = built;
  const usageMap = new Map();
  const extraSkipped = [];

  for (const sourceFile of project.getSourceFiles()) {
    const definingFilePath = path.relative(absoluteProjectPath, sourceFile.getFilePath());

    let declarations;
    try {
      declarations = collectDeclarations(sourceFile);
    } catch {
      extraSkipped.push({ file: definingFilePath, reason: "parse error" });
      continue;
    }

    for (const { name, nameNode } of declarations) {
      if (!usageMap.has(name)) {
        usageMap.set(name, { definedIn: definingFilePath, usedIn: new Map() });
      }
      const entry = usageMap.get(name);
      entry.definedIn = definingFilePath;

      let references = [];
      try {
        references = nameNode.findReferencesAsNodes();
      } catch {
        references = [];
      }

      const referencesByFile = new Map();
      for (const reference of references) {
        const referenceFilePath = path.relative(
          absoluteProjectPath,
          reference.getSourceFile().getFilePath()
        );
        if (referenceFilePath === entry.definedIn) continue;
        if (!referencesByFile.has(referenceFilePath)) {
          referencesByFile.set(referenceFilePath, []);
        }
        referencesByFile.get(referenceFilePath).push(reference);
      }

      // A function called several times from the same file still counts as
      // one "place" for risk-level/chip purposes, just with a single
      // representative line number attached (see pickRepresentativeLine).
      for (const [referenceFilePath, fileReferences] of referencesByFile.entries()) {
        if (!entry.usedIn.has(referenceFilePath)) {
          entry.usedIn.set(referenceFilePath, pickRepresentativeLine(fileReferences));
        }
      }
    }
  }

  // The defining file is always index 0 (a plain string), followed by the
  // files that use it as { file, line } objects (sorted by file). This
  // keeps each entry a flat array while still letting callers like
  // explain.js tell "defined here" apart from "used elsewhere" without a
  // second lookup.
  const result = {};
  for (const [name, { definedIn, usedIn }] of usageMap.entries()) {
    const usedInList = Array.from(usedIn.entries())
      .map(([file, line]) => ({ file, line }))
      .sort((a, b) => a.file.localeCompare(b.file));
    result[name] = [definedIn, ...usedInList];
  }

  const combinedSkipped = [...skippedFiles, ...extraSkipped];

  // Python runs after the JS/TS map is built (so collisions resolve JS-first)
  // and before the emptiness check (so a Python-only project gets real
  // results, not the "nothing found" diagnostic).
  const pythonNote = mergePythonAnalysis(result, combinedSkipped, allFilePaths, absoluteProjectPath);
  const notes = pythonNote ? [pythonNote] : [];

  if (Object.keys(result).length === 0) {
    return {
      functions: {},
      skipped: combinedSkipped,
      notes,
      diagnostic: buildNothingFoundDiagnostic(allFilePaths),
    };
  }

  return { functions: result, skipped: combinedSkipped, notes };
}

/**
 * Updates an already-built project in place for a single changed file,
 * instead of rebuilding the whole thing — the speed-up a daemon relies on.
 * Returns true if it handled the change, false if the caller should fall
 * back to a full buildProjectForDirectory() rebuild instead (currently:
 * a new or edited .html file, since incrementally patching its extracted
 * inline <script> virtual files isn't implemented).
 */
function refreshOrAddFile(built, filePath) {
  const { project, absoluteProjectPath, skippedFiles } = built;
  const relativePath = path.relative(absoluteProjectPath, filePath);

  // walkFiles never yields these, but a watcher does — and the "unknown file"
  // branch below would happily add them to the project one event at a time,
  // undoing the exclusion during exactly the live-watching case it matters
  // for. Reported as handled so a build writing into dist/ can't trigger the
  // full-rebuild fallback either.
  if (hasSkippedDirectorySegment(relativePath)) return true;

  const previousSkipIndex = skippedFiles.findIndex((entry) => entry.file === relativePath);
  if (previousSkipIndex !== -1) {
    skippedFiles.splice(previousSkipIndex, 1);
  }

  const existing = project.getSourceFile(filePath);

  if (existing) {
    let refreshResult;
    try {
      refreshResult = existing.refreshFromFileSystemSync();
    } catch {
      skippedFiles.push({ file: relativePath, reason: "unreadable" });
      project.removeSourceFile(existing);
      return true;
    }

    if (refreshResult === FileSystemRefreshResult.Deleted) {
      project.removeSourceFile(existing);
      return true;
    }

    if (hasSyntaxErrors(project, existing)) {
      skippedFiles.push({ file: relativePath, reason: "parse error" });
      project.removeSourceFile(existing);
    }
    return true;
  }

  const extension = path.extname(filePath);

  if (extension === HTML_EXTENSION) {
    return false;
  }

  if (!SOURCE_EXTENSIONS.has(extension)) {
    return true;
  }

  let added;
  try {
    added = project.addSourceFileAtPath(filePath);
  } catch {
    skippedFiles.push({ file: relativePath, reason: "unreadable" });
    return true;
  }

  if (hasSyntaxErrors(project, added)) {
    skippedFiles.push({ file: relativePath, reason: "parse error" });
    project.removeSourceFile(added);
  }
  return true;
}

/**
 * Scans a project directory and builds a map of every function/component
 * name to the list of files (relative to projectPath) where it is defined
 * or referenced (calls, JSX usage, imports resolved via the TS language
 * service so cross-file usage is tracked, not just the definition site).
 * A single problematic file (unreadable, binary, unparseable) is recorded
 * in `skipped` and excluded — it never aborts the rest of the scan.
 */
function scanProject(projectPath) {
  return computeScanResult(buildProjectForDirectory(projectPath));
}

export {
  scanProject,
  findSourceFiles,
  walkFiles,
  hasSkippedDirectorySegment,
  buildProjectForDirectory,
  computeScanResult,
  refreshOrAddFile,
};
