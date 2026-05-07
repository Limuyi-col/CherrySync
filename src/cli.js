import { Command } from "commander";
import path from "node:path";
import { initCommand } from "./commands/init.js";
import { statusCommand } from "./commands/status.js";
import { diffCommand } from "./commands/diff.js";
import { pushCommand } from "./commands/push.js";
import { dryRunCommand } from "./commands/dry-run.js";
import { driftCommand } from "./commands/drift.js";
import { rollbackCommand } from "./commands/rollback.js";
import { consistencyCommand } from "./commands/consistency.js";
import { watchCommand } from "./commands/watch.js";
import { createServersCommand } from "./commands/servers.js";
import { wrapCommand } from "./lib/command-wrap.js";

export function run(argv = process.argv) {
  const program = new Command();
  const invokedName = argv[1]
    ? path.basename(argv[1], path.extname(argv[1]))
    : "csync";

  program
    .name(invokedName)
    .description("CherrySync multi-environment code synchronization tool.")
    .version("1.0.0");

  program
    .command("init")
    .description("Initialize .csync workspace in the current project.")
    .option(
      "--server-file <path>",
      "Import server environments from the specified server file into .csync/config.json",
    )
    .action(wrapCommand(initCommand));

  program
    .command("status")
    .argument("<env>", "Target environment name, such as test or prod")
    .description(
      "Show pending changes for the target environment and allow interactive diff preview.",
    )
    .action(wrapCommand(statusCommand));

  program
    .command("diff")
    .argument("<env>", "Environment name")
    .argument("<filepath>", "Project-relative file path")
    .description(
      "Compare local file with remote file in the target environment.",
    )
    .option(
      "--server <id>",
      "Use a specific server in a multi-server environment",
    )
    .action(wrapCommand(diffCommand));

  program
    .command("push")
    .argument("<env>", "Environment name")
    .description("Push selected changes to the target environment.")
    .option(
      "--server <id>",
      "Push only to one specific server in a multi-server environment",
    )
    .option(
      "--backup",
      "Download remote files before overwriting (enables rollback)",
    )
    .option(
      "--no-parallel",
      "Push to servers sequentially instead of in parallel",
    )
    .option(
      "--health-url <url>",
      "Health check URL (HTTP GET, expects 2xx/3xx)",
    )
    .option(
      "--post-command <cmd>",
      "Shell command on remote servers via SSH after push",
    )
    .option("--verbose", "Show detailed output including remote command stdout")
    .action(wrapCommand(pushCommand));

  program
    .command("dry-run")
    .argument("<env>", "Environment name")
    .description("Preview what would be pushed without making any changes.")
    .option("--server <id>", "Limit preview to a specific server")
    .action(wrapCommand(dryRunCommand));

  program
    .command("drift")
    .argument("<envA>", "First environment name (e.g. test)")
    .argument("<envB>", "Second environment name (e.g. prod)")
    .description("Detect consistency drift between two environments.")
    .option("--changes", "Also show local changes that help resolve drift")
    .option("--verbose", "Show per-server consistency details")
    .action(wrapCommand(driftCommand));

  program
    .command("rollback")
    .argument("<env>", "Environment name")
    .description(
      "Restore files from a previous backup (created by push --backup).",
    )
    .option("--server <id>", "Rollback on a specific server")
    .option("--timestamp <ts>", "Backup timestamp (skips interactive picker)")
    .action(wrapCommand(rollbackCommand));

  program
    .command("consistency")
    .argument("<env>", "Environment name")
    .description(
      "Check that all files are consistently synced across every server in an environment.",
    )
    .action(wrapCommand(consistencyCommand));

  program
    .command("watch")
    .argument("<env>", "Environment name")
    .description("Watch for file changes and auto-show pending sync status.")
    .option("--interval <ms>", "Debounce interval in milliseconds", "3000")
    .option("--auto", "Automatically push when changes are detected")
    .action(wrapCommand(watchCommand));

  program.addCommand(createServersCommand());

  program.parse(argv);
}
