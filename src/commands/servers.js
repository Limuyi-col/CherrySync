import { Command } from "commander";
import { serversImportCommand } from "./servers-import.js";
import { serversShowCommand } from "./servers-show.js";
import { wrapCommand } from "../lib/command-wrap.js";

export function createServersCommand() {
  const command = new Command("servers");

  command
    .description("Manage server environment definitions.")
    .command("import")
    .argument("[path]", "Import from an external server file; omit to re-import .csync/servers.json")
    .description("Import server environments and fully sync .csync/config.json environments.")
    .action(wrapCommand(serversImportCommand));

  command
    .command("show")
    .description("Show current server file and effective environments.")
    .action(wrapCommand(serversShowCommand));

  return command;
}
