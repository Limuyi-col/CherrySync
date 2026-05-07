import { watch } from "node:fs";
import path from "node:path";
import prompts from "prompts";
import { loadProjectContext } from "../lib/context.js";
import { validateEnvironmentArg, collectChanges } from "../lib/scanner.js";
import { buildIgnorePatterns } from "../lib/ignore.js";
import { printChangeSet } from "../lib/output.js";
import { printSection, printHint, printWarn, printSuccess } from "../lib/ui.js";

export async function watchCommand(env, options = {}) {
  const context = await loadProjectContext();
  validateEnvironmentArg(context, env);

  const interval = options.interval ?? 3000;
  const autoPush = options.auto ?? false;

  printSection(
    "Watch Mode",
    `Monitoring file changes in [${env}] every ${interval}ms`,
  );
  printHint("Press Ctrl+C to exit.");

  if (autoPush) {
    printWarn("Auto-push is enabled — changes will be pushed automatically.");
  }

  let lastChangeSet = [];
  let pending = false;
  let debounceTimer = null;

  async function scanAndDisplay() {
    try {
      const changeSet = await collectChanges(context, env);

      if (changeSet.length === 0) {
        if (lastChangeSet.length > 0) {
          printSuccess("All changes resolved.");
          lastChangeSet = [];
        }
        return;
      }

      const currentKeys = changeSet
        .map((c) => `${c.type}:${c.path}`)
        .sort()
        .join(",");
      const lastKeys = lastChangeSet
        .map((c) => `${c.type}:${c.path}`)
        .sort()
        .join(",");

      if (currentKeys !== lastKeys) {
        lastChangeSet = changeSet;
        console.log("");
        printChangeSet(env, changeSet);

        if (autoPush && changeSet.length > 0) {
          console.log("");
          // In auto mode, just report — push requires interactive confirmation
          printHint(
            `Detected ${changeSet.length} change(s). Run: csync push ${env}`,
          );
        }
      }
    } catch (error) {
      printWarn(`Watch scan error: ${error.message}`);
    } finally {
      pending = false;
    }
  }

  const ignorePatterns = await buildIgnorePatterns(
    context.rootDir,
    context.config.ignore,
  );

  const watcher = watch(
    context.rootDir,
    { recursive: true },
    (eventType, filename) => {
      if (!filename) return;
      const relPath = filename.replace(/\\/g, "/");
      if (relPath.startsWith(".csync/") || relPath.startsWith(".git/")) return;
      if (relPath.startsWith("node_modules/")) return;

      if (pending) return;
      pending = true;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(scanAndDisplay, interval);
    },
  );

  process.on("SIGINT", () => {
    watcher.close();
    console.log("");
    printHint("Watch mode stopped.");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    watcher.close();
    process.exit(0);
  });

  await scanAndDisplay();

  return new Promise(() => {});
}
