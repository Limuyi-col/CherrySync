import prompts from "prompts";
import { loadProjectContext } from "../lib/context.js";
import { collectChanges, validateEnvironmentArg } from "../lib/scanner.js";
import { RemoteClient } from "../lib/remote-client.js";
import { appendLog } from "../lib/logger.js";
import { hashFileIfExists } from "../lib/hash.js";
import { saveState } from "../lib/state.js";
import { selectServersForEnvironment } from "../lib/server-selection.js";
import { createBackup } from "../lib/backup.js";
import { performHealthCheck } from "../lib/health-check.js";
import { remoteExec } from "../lib/ssh-exec.js";
import {
  formatChangeType,
  formatServer,
  printDivider,
  printErrorLine,
  printHint,
  printSection,
  printSuccess,
  printWarn,
  printInfo,
} from "../lib/ui.js";

export async function pushCommand(env, options = {}) {
  const context = await loadProjectContext();
  validateEnvironmentArg(context, env);
  const environment = context.config.environments[env];
  const targetServers = await selectServersForEnvironment(
    environment,
    env,
    options,
  );

  const changeSet = await collectChanges(context, env);
  if (changeSet.length === 0) {
    printSection(
      `Push ${env}`,
      "Sync local changes to selected target servers",
    );
    printSuccess("No pending changes.");
    return;
  }

  const response = await prompts(
    {
      type: "multiselect",
      name: "selected",
      message: `Select files to sync to [${env}]`,
      choices: changeSet.map((item) => ({
        title: `(${item.type}) ${item.path}`,
        value: item.path,
        selected: item.type !== "deleted",
      })),
      instructions: false,
      min: 1,
    },
    {
      onCancel: () => {
        throw new Error("Operation cancelled.");
      },
    },
  );

  const selectedPaths = new Set(response.selected);
  const selectedChanges = changeSet.filter((item) =>
    selectedPaths.has(item.path),
  );
  if (selectedChanges.length === 0) {
    printWarn("No files selected.");
    return;
  }

  printSection(
    `Push ${env}`,
    "Review target servers and selected files before upload",
  );
  printDivider();
  console.log("Target servers:");
  for (const server of targetServers) {
    console.log(`- ${formatServer(server)}`);
  }
  printDivider();
  console.log("Selected files:");
  for (const item of selectedChanges) {
    console.log(`- ${formatChangeType(item.type)}  ${item.path}`);
  }
  printDivider();

  if (options.backup) {
    printHint(
      "Backup enabled — remote files will be downloaded before being overwritten.",
    );
  }
  printHint(
    "A file remains pending in status until every server in this environment is updated.",
  );

  const confirmation = await prompts(
    {
      type: "confirm",
      name: "confirmed",
      message: `Push ${selectedChanges.length} item(s) to [${env}] server(s): ${targetServers.map((server) => server.id).join(", ")} ?`,
      initial: false,
    },
    {
      onCancel: () => {
        throw new Error("Operation cancelled.");
      },
    },
  );

  if (!confirmation.confirmed) {
    throw new Error("Operation cancelled.");
  }

  const deletedItems = selectedChanges.filter(
    (item) => item.type === "deleted",
  );
  let approvedDeletes = new Set();
  if (deletedItems.length > 0) {
    const deleteResponse = await prompts(
      {
        type: "confirm",
        name: "confirmed",
        message: `Delete ${deletedItems.length} remote file(s) in [${env}] as well?`,
        initial: false,
      },
      {
        onCancel: () => {
          throw new Error("Operation cancelled.");
        },
      },
    );

    if (deleteResponse.confirmed) {
      approvedDeletes = new Set(deletedItems.map((item) => item.path));
    }
  }

  const modifiedItems = selectedChanges.filter(
    (item) => item.type !== "deleted",
  );

  // Backup
  if (options.backup && modifiedItems.length > 0) {
    await createBackup(
      context.rootDir,
      env,
      targetServers,
      modifiedItems.map((item) => item.path),
    );
  }

  // Push — parallel or sequential
  const parallel = options.parallel !== false;
  let synced;
  let failed;

  if (parallel && targetServers.length > 1) {
    const results = await Promise.allSettled(
      targetServers.map((server) =>
        pushToServer(context, env, server, selectedChanges, approvedDeletes),
      ),
    );
    synced = [];
    failed = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        synced.push(...result.value.synced);
        failed.push(...result.value.failed);
      } else {
        failed.push({
          path: "connection",
          serverId: "unknown",
          message: result.reason?.message || "Unknown error",
        });
      }
    }
  } else {
    const allSynced = [];
    const allFailed = [];
    for (const server of targetServers) {
      const result = await pushToServer(
        context,
        env,
        server,
        selectedChanges,
        approvedDeletes,
      );
      allSynced.push(...result.synced);
      allFailed.push(...result.failed);
    }
    synced = allSynced;
    failed = allFailed;
  }

  // Save state
  if (synced.length > 0) {
    await saveState(context.paths.statePath, context.state);
    await appendLog(
      context.paths.logPath,
      env,
      synced,
      targetServers.map((server) => server.id),
    );
  }

  // Result summary
  printSection(`Push Result ${env}`);
  if (synced.length > 0) {
    printSuccess(
      `Synced ${synced.length} item(s) across ${targetServers.length} server(s).`,
    );
  }
  for (const item of synced) {
    console.log(
      `- ${item.serverId} ${formatChangeType(item.type)}  ${item.path}`,
    );
  }

  if (failed.length > 0) {
    printWarn(`Failed to sync ${failed.length} item(s).`);
    for (const item of failed) {
      printErrorLine(`${item.serverId} ${item.path}: ${item.message}`);
    }
    process.exitCode = 1;
  }

  // Health check
  if (options.healthUrl && synced.length > 0) {
    printSection("Health Check", `Checking ${options.healthUrl}`);
    const healthResult = await performHealthCheck(options.healthUrl);
    if (healthResult.healthy) {
      printSuccess(
        `Health check passed — HTTP ${healthResult.statusCode} (${healthResult.duration}ms)`,
      );
    } else if (healthResult.error) {
      printWarn(`Health check failed — ${healthResult.error}`);
    } else {
      printWarn(
        `Health check failed — HTTP ${healthResult.statusCode} (${healthResult.duration}ms)`,
      );
    }
  }

  // Post-push remote command
  if (options.postCommand && synced.length > 0) {
    printSection("Post Command", "Executing remote command on target servers");
    for (const server of targetServers) {
      try {
        printInfo(`Executing on ${server.id}: ${options.postCommand}`);
        const result = await remoteExec(server, options.postCommand);
        if (result.code === 0) {
          printSuccess(`${server.id}: exit code ${result.code}`);
        } else {
          printWarn(`${server.id}: exit code ${result.code}`);
          if (result.stderr) {
            console.log(`  stderr: ${result.stderr}`);
          }
        }
        if (result.stdout && options.verbose) {
          console.log(`  stdout: ${result.stdout}`);
        }
      } catch (error) {
        printWarn(`${server.id}: exec failed — ${error.message}`);
      }
    }
  }
}

async function pushToServer(
  context,
  env,
  server,
  selectedChanges,
  approvedDeletes,
) {
  const synced = [];
  const failed = [];
  const remote = new RemoteClient(server);

  try {
    await remote.connect();
    context.state[env][server.id] ||= {};

    for (const item of selectedChanges) {
      try {
        if (item.type === "deleted") {
          if (!approvedDeletes.has(item.path)) {
            continue;
          }
          await remote.delete(item.path);
          delete context.state[env][server.id][item.path];
        } else {
          await remote.upload(item.path, item.absolutePath);
          const digest = await hashFileIfExists(item.absolutePath);
          if (!digest) {
            throw new Error(`Cannot hash uploaded file: ${item.path}`);
          }
          context.state[env][server.id][item.path] = digest;
        }
        synced.push({ ...item, serverId: server.id });
      } catch (error) {
        failed.push({
          path: item.path,
          serverId: server.id,
          message: error.message,
        });
      }
    }
  } finally {
    await remote.dispose();
  }

  return { synced, failed };
}
