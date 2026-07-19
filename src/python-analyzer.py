#!/usr/bin/env python3
"""RippleCheck's Python-side analyzer.

Spawned by python-bridge.js (never imported) with one argument: the project
root. Walks every .py file, extracts module-level function/class definitions
and their cross-file references using the stdlib `ast` module — no
third-party dependencies, so any system Python 3 can run it — and prints one
JSON object to stdout in the exact shape scanner.js's computeScanResult()
builds for JS/TS:

    {
      "functions": { "name": ["defining/file.py", {"file": ..., "line": ...}, ...] },
      "skipped":   [ {"file": ..., "reason": "parse error" | "unreadable"}, ... ],
      "pyFileCount": <int>
    }

Reference-finding mirrors scanner.js deliberately:
  * only module-level defs/classes are collected (JS collects top-level
    functions/classes/arrow-consts, not methods);
  * references in the defining file itself are excluded;
  * several references in one file collapse to a single representative
    line — the earliest real usage, falling back to the import line when
    the name is imported but never otherwise referenced;
  * a name defined in multiple files keeps one merged entry (last
    definition wins the "defined in" slot), same as scanner.js's usageMap.

To avoid name-collision false positives, `module.attr` references only
count when `module` is a name bound by an `import` statement in that file,
and `from m import name as alias` tracks the alias so later `alias(...)`
calls attribute to the real name.
"""

import ast
import json
import os
import sys

# node_modules/.git/dist/dist-electron mirror scanner.js's SKIP_DIRECTORIES —
# keep the two lists in step, or a directory excluded from the JS/TS walk still
# shows up here and the project gets phantom findings from just its .py files.
# The rest are Python's equivalents of "installed dependencies / build output"
# that would flood the reference map with third-party defs.
SKIP_DIRECTORIES = {
    "node_modules",
    ".git",
    "dist",
    "dist-electron",
    "__pycache__",
    ".venv",
    "venv",
    ".tox",
    "site-packages",
}


def find_python_files(root):
    results = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRECTORIES]
        for filename in filenames:
            if filename.endswith(".py"):
                results.append(os.path.join(dirpath, filename))
    return results


def collect_declarations(module_node):
    """Names defined at module level: def / async def / class."""
    names = []
    for node in module_node.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            names.append(node.name)
    return names


class ReferenceCollector(ast.NodeVisitor):
    """Collects, for one file, every (line, is_import) where a declared name
    is referenced. Import statements bind aliases so both `from m import x
    as y; y()` and `import m; m.x()` attribute to the declared name x."""

    def __init__(self, declared_names):
        self.declared = declared_names
        # local alias -> declared name (from `from m import x as y`)
        self.import_aliases = {}
        # local module alias -> True (from `import m [as n]`)
        self.module_aliases = set()
        self.references = {}  # declared name -> list of (line, is_import)

    def _record(self, name, line, is_import):
        self.references.setdefault(name, []).append((line, is_import))

    def visit_ImportFrom(self, node):
        for alias in node.names:
            if alias.name in self.declared:
                self._record(alias.name, node.lineno, True)
                self.import_aliases[alias.asname or alias.name] = alias.name
        self.generic_visit(node)

    def visit_Import(self, node):
        for alias in node.names:
            # `import helpers` / `import pkg.helpers as h` — remember the local
            # binding so `h.load_data` counts as a load_data reference below.
            self.module_aliases.add(alias.asname or alias.name.split(".")[0])
        self.generic_visit(node)

    def visit_Name(self, node):
        if isinstance(node.ctx, ast.Load):
            target = self.import_aliases.get(node.id, node.id)
            if target in self.declared:
                self._record(target, node.lineno, False)
        self.generic_visit(node)

    def visit_Attribute(self, node):
        # Only `module.attr` where `module` was bound by an import statement —
        # matching any object's `.attr` by bare name would fabricate
        # references (e.g. an unrelated method that happens to share a name).
        if (
            node.attr in self.declared
            and isinstance(node.value, ast.Name)
            and node.value.id in self.module_aliases
        ):
            self._record(node.attr, node.lineno, False)
        self.generic_visit(node)


def representative_line(references):
    """scanner.js's pickRepresentativeLine: earliest real usage, else the
    earliest import line."""
    real = [line for line, is_import in references if not is_import]
    candidates = real if real else [line for line, _ in references]
    return min(candidates)


def main():
    if len(sys.argv) != 2:
        print(json.dumps({"error": "usage: python-analyzer.py <project-root>"}))
        return 2

    root = os.path.abspath(sys.argv[1])
    py_files = find_python_files(root)

    skipped = []
    parsed = {}  # absolute path -> ast.Module
    for file_path in py_files:
        relative = os.path.relpath(file_path, root)
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as handle:
                source = handle.read()
        except OSError:
            skipped.append({"file": relative, "reason": "unreadable"})
            continue
        try:
            parsed[file_path] = ast.parse(source, filename=file_path)
        except (SyntaxError, ValueError):
            skipped.append({"file": relative, "reason": "parse error"})

    # Pass 1: declarations. Same merge semantics as scanner.js's usageMap —
    # one entry per name, later definitions overwrite the defining file.
    usage_map = {}  # name -> {"defined_in": rel, "used_in": {rel: line}}
    for file_path, module_node in parsed.items():
        relative = os.path.relpath(file_path, root)
        for name in collect_declarations(module_node):
            entry = usage_map.setdefault(name, {"defined_in": relative, "used_in": {}})
            entry["defined_in"] = relative

    declared_names = set(usage_map.keys())

    # Pass 2: references, one representative line per (name, file).
    for file_path, module_node in parsed.items():
        relative = os.path.relpath(file_path, root)
        collector = ReferenceCollector(declared_names)
        collector.visit(module_node)
        for name, references in collector.references.items():
            entry = usage_map[name]
            if relative == entry["defined_in"]:
                continue
            if relative not in entry["used_in"]:
                entry["used_in"][relative] = representative_line(references)

    functions = {}
    for name, entry in usage_map.items():
        used_in = [
            {"file": file, "line": line}
            for file, line in sorted(entry["used_in"].items(), key=lambda item: item[0])
        ]
        functions[name] = [entry["defined_in"]] + used_in

    print(json.dumps({"functions": functions, "skipped": skipped, "pyFileCount": len(py_files)}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
