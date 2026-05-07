import prompts from "prompts";
import { loadProjectContext } from "../lib/context.js";
import { validateEnvironmentArg } from "../lib/scanner.js";
import { selectServersForEnvironment } from "../lib/server-selection.js";
import { listBackups, getBackupFiles, restoreBackup } from "../lib/backup.js";
import { hashFileIfExists } from "../lib/hash.js";
import { saveState } from "../lib/state.js";
import { appendLog } from "../lib/logger.js";
import {
  printSection,
  printSuccess,
  printWarn,
  printHint,
  printErrorLine,
  printKeyValue,
  formatServer,
} from "../lib/ui.js";

export async function rollbackCommand(env, options = {}) {
  const context = await loadProjectContext();
  validateEnvironmentArg(context, env);
  const environment = context.config.environments[env];
  const targetServers = await selectServersForEnvironment(
    environment,
    env,
    options,
  );

  if (targetServers.length === 0) {
    throw new Error(`No servers selected for environment: ${env}`);
  }

  printSection("Rollback", `Restore files from backup on [${env}]`);

  const allBackups = [];
  for (const server of targetServers) {
    const timestamps = await listBackups(context.rootDir, env, server.id);
    allBackups.push({ server, timestamps });
  }

  const availableServers = allBackups.filter((b) => b.timestamps.length > 0);
  if (availableServers.length === 0) {
    printWarn("No backups found.");
    printHint("Backups are created when you push with --backup flag.");
    return;
  }

  let selectedTimestamp = options.timestamp;
  if (!selectedTimestamp) {
    const allTimestamps = new Set();
    for (const b of availableServers) {
      for (const t of b.timestamps) {
        allTimestamps.add(t);
      }
    }

    const sorted = [...allTimestamps].sort().reverse().slice(0, 20);
    const response = await prompts(
      {
        type: "select",
        name: "timestamp",
        message: "Select backup timestamp",
        choices: sorted.map((t) => ({ title: t, value: t })),
        initial: 0,
      },
      {
        onCancel: () => {
          throw new Error("Operation cancelled.");
        },
      },
    );
    selectedTimestamp = response.timestamp;
  }

  if (!selectedTimestamp) {
    throw new Error("No timestamp selected.");
  }

  for (const { server } of availableServers) {
    printSection(`Restoring on ${server.id}`);
    printKeyValue("Timestamp:", selectedTimestamp);

    const files = await getBackupFiles(
      context.rootDir,
      env,
      server.id,
      selectedTimestamp,
    );
    if (files.length === 0) {
      printWarn(
        `No backup files found for ${server.id} at ${selectedTimestamp}`,
      );
      continue;
    }

    console.log(`Files in backup: ${files.length}`);
    for (const f of files.slice(0, 10)) {
      console.log(`- ${f}`);
    }
    if (files.length > 10) {
      console.log(`  ... and ${files.length - 10} more`);
    }

    const confirmation = await prompts(
      {
        type: "confirm",
        name: "confirmed",
        message: `Restore ${files.length} file(s) from backup on ${server.id}?`,
        initial: false,
      },
      {
        onCancel: () => {
          throw new Error("Operation cancelled.");
        },
      },
    );

    if (!confirmation.confirmed) {
      printWarn(`Skipped ${server.id}.`);
      continue;
    }

    const results = await restoreBackup(
      context.rootDir,
      env,
      [{ server, timestamp: selectedTimestamp }],
      server,
      {
        timestamp: selectedTimestamp,
        files,
      },
    );

    const restored = results.filter((r) => r.restored);
    if (restored.length > 0) {
      for (const item of restored) {
        const absPath = item.path;
        if (absPath) {
          const digest = await hashFileIfExists(absPath);
          if (digest) {
            context.state[env][server.id] ||= {};
            context.state[env][server.id][item.path] = digest;
          }
        }
      }

      await saveState(context.paths.statePath, context.state);
      await appendLog(
        context.paths.logPath,
        env,
        restored.map((r) => ({ path: r.path, type: "modified" })),
        [server.id],
      );
      printSuccess(`Restored ${restored.length} file(s) on ${server.id}.`);
    }

    const failed = results.filter((r) => !r.restored);
    if (failed.length > 0) {
      for (const item of failed) {
        printErrorLine(`${item.path}: ${item.error || "unknown error"}`);
      }
    }
  }

  printHint(
    "After rollback, files will appear as 'modified' in status until you push again.",
  );
}
