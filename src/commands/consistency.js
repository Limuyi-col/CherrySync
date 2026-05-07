import { loadProjectContext } from "../lib/context.js";
import { validateEnvironmentArg } from "../lib/scanner.js";
import { checkConsistency } from "../lib/consistency.js";
import {
  printSection,
  printSuccess,
  printWarn,
  formatChangeType,
} from "../lib/ui.js";

export async function consistencyCommand(env, options = {}) {
  const context = await loadProjectContext();
  validateEnvironmentArg(context, env);
  const environment = context.config.environments[env];

  printSection("Consistency Check", `Checking server sync status in [${env}]`);

  const result = checkConsistency(context.state, env, environment);

  if (result.consistent) {
    printSuccess(
      `All ${result.serverCount} server(s) in [${env}] are fully consistent.`,
    );
    return;
  }

  printWarn(
    `${result.issues.length} inconsistency issue(s) found across ${result.serverCount} servers in [${env}]`,
  );

  for (const issue of result.issues) {
    if (issue.type === "inconsistent") {
      console.log(`\n  DIVERGED  ${issue.path}`);
      for (const s of issue.servers) {
        const status = s.digest
          ? `hash: ${s.digest.slice(0, 8)}...`
          : "MISSING";
        console.log(`    ${s.serverId}: ${status}`);
      }
    } else {
      console.log(`\n  MISSING   ${issue.path}`);
      for (const s of issue.servers) {
        console.log(`    ${s.serverId}: ${s.digest ? "present" : "absent"}`);
      }
    }
  }

  console.log("");
  printHint(
    `Run: csync push ${env} to bring all servers back to consistency. Use --server to target a specific lagging server.`,
  );
}
