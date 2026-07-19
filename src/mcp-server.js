#!/usr/bin/env node
import path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { scanProject } from "./scanner.js";
import { explainImpact, formatEntriesAsText } from "./explain.js";
import { getImpactSummaryViaDaemon } from "./daemon-client.js";

const server = new McpServer({
  name: "ripplecheck",
  version: "0.1.0",
});

server.registerTool(
  "check_impact",
  {
    title: "Check Impact",
    description:
      "Scans a JavaScript/TypeScript project folder and explains, in plain English, where each function or component is used — so you know what else might break if you change it.",
    inputSchema: {
      projectPath: z
        .string()
        .describe("The absolute path to the project folder to scan"),
    },
  },
  async ({ projectPath }) => {
    const resolvedPath = path.resolve(projectPath);

    try {
      let text;
      try {
        text = await getImpactSummaryViaDaemon(resolvedPath, resolvedPath);
      } catch {
        // Daemon route failed for some reason — fall back to a direct,
        // one-off scan so the tool still works, just without the
        // warm-cache speed-up.
        const scanResult = scanProject(resolvedPath);
        text = formatEntriesAsText(explainImpact(scanResult));
      }

      return {
        content: [{ type: "text", text }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Could not scan "${projectPath}": ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
