#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanProject } from "./scanner.js";
import { explainImpact } from "./explain.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

const targetPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(currentDirPath, "..", "test", "sample-project");

const result = scanProject(targetPath);

console.log(`Scanned: ${targetPath}`);
console.log(JSON.stringify(result, null, 2));

console.log("\n=== What this means ===");
for (const entry of explainImpact(result)) {
  console.log(entry.sentence);
}
