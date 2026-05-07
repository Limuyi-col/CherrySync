import { loadProjectContext } from "../lib/context.js";
import { validateEnvironmentArg, collectChanges } from "../lib/scanner.js";
import { detectDrift } from "../lib/drift.js";
import { printSection, printWarn, formatChangeType } from "../lib/ui.js";
import { selectServersForEnvironment } from "../lib/server-selection.js";

export async function driftCommand(envA, envB, options = {}) {
  const context = await loadProjectContext();
  validateEnvironmentArg(context, envA);
  validateEnvironmentArg(context, envB);

  if (envA === envB) {
    throw new Error(
      "Cannot compare an environment with itself. Provide two different environment names.",
    );
  }

  printSection("Environment Drift", `Comparing [${envA}] vs [${envB}]`);

  const results = detectDrift(context.state, envA, envB);

  if (results.length === 0) {
    printSection("Result", "No drift detected — environments are in sync.");
    return;
  }

  printSection(
    "Drift Summary",
    `${results.length} file(s) differ between environments`,
  );

  for (const item of results) {
    const typeLabel =
      item.type === "missing_in_a"
        ? `Only in ${envB}`
        : item.type === "missing_in_b"
          ? `Only in ${envA}`
          : "Diverged";
    console.log(`- ${typeLabel}  ${item.path}`);

    if (options.verbose && item.details) {
      for (const [env, status] of Object.entries(item.details)) {
        console.log(`    ${env}: ${status}`);
      }
    }
  }

  if (!options.changes) {
    return;
  }

  const changeSet = await collectChanges(context, envA);
  const driftPaths = new Set(results.map((r) => r.path));
  const actionable = changeSet.filter((item) => driftPaths.has(item.path));

  if (actionable.length === 0) {
    printWarn("No local changes that would help resolve the drift.");
    return;
  }

  printSection(
    "Suggested Actions",
    `Push these files to [${envA}] to reduce drift:`,
  );
  for (const item of actionable) {
    console.log(`- ${formatChangeType(item.type)}  ${item.path}`);
  }

  const environment = context.config.environments[envA];
  const targetServers = await selectServersForEnvironment(
    environment,
    envA,
    options,
  );

  if (targetServers.length > 0) {
    console.log("");
    console.log(`Run: csync push ${envA} --server ${targetServers[0].id}`);
  }
}
