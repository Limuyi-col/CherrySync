import { loadProjectContext } from "../lib/context.js";
import { validateEnvironmentArg, collectChanges } from "../lib/scanner.js";
import { selectServersForEnvironment } from "../lib/server-selection.js";
import {
  printSection,
  printSuccess,
  printWarn,
  printHint,
  printDivider,
  formatChangeType,
  formatServer,
} from "../lib/ui.js";

export async function dryRunCommand(env, options = {}) {
  const context = await loadProjectContext();
  validateEnvironmentArg(context, env);
  const environment = context.config.environments[env];
  const targetServers = await selectServersForEnvironment(
    environment,
    env,
    options,
  );

  const changeSet = await collectChanges(context, env);

  printSection(`Dry Run: push ${env}`, "No files will be transferred");
  printDivider();

  console.log("Target servers:");
  for (const server of targetServers) {
    console.log(`- ${formatServer(server)}`);
  }

  printDivider();

  if (changeSet.length === 0) {
    printSuccess("No pending changes.");
    return;
  }

  console.log("Pending changes:");
  for (const item of changeSet) {
    console.log(`- ${formatChangeType(item.type)}  ${item.path}`);
  }

  printDivider();

  const added = changeSet.filter((c) => c.type === "added").length;
  const modified = changeSet.filter((c) => c.type === "modified").length;
  const deleted = changeSet.filter((c) => c.type === "deleted").length;

  console.log(
    `Summary: ${added} added, ${modified} modified, ${deleted} deleted`,
  );
  console.log(
    `Total: ${changeSet.length} file(s) would be pushed to ${targetServers.length} server(s)`,
  );

  if (deleted > 0) {
    console.log("");
    printHint("Deleted files require separate confirmation during push.");
  }

  console.log("");
  printHint(`To execute: csync push ${env}`);
}
