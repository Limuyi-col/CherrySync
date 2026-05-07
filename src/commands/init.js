import path from "node:path";
import { ensureWorkspace, workspacePaths } from "../lib/workspace.js";
import { ensureGitignoreEntry } from "../lib/gitignore.js";
import { normalizeConfigIgnore } from "../lib/ignore.js";
import { detectServerFile, importServerFileEnvironments, installServerFile } from "../lib/server-source.js";
import { normalizeConfigFile } from "../lib/config.js";
import { printHint, printInfo, printKeyValue, printSection, printSuccess, printWarn } from "../lib/ui.js";

export async function initCommand(options = {}) {
  const rootDir = process.cwd();
  const paths = workspacePaths(rootDir);

  await ensureWorkspace(rootDir);
  const config = await normalizeConfigFile(paths.configPath);
  await normalizeConfigIgnore(paths.configPath);
  let detected = await detectServerFile(rootDir, config);
  if (options.serverFile) {
    const installedPath = await installServerFile(rootDir, config, options.serverFile);
    detected = { found: true, filePath: installedPath, source: "manual" };
  } else if (detected.found && detected.source === "legacy") {
    const installedPath = await installServerFile(rootDir, config, detected.filePath);
    detected = { found: true, filePath: installedPath, source: "legacy-migrated" };
  }

  const imported = detected.found ? await importServerFileEnvironments(paths.configPath, rootDir) : false;
  await ensureGitignoreEntry(path.join(rootDir, ".gitignore"), ".csync/");

  printSection("Init Complete", "CherrySync workspace is ready");
  printSuccess(`Workspace initialized at ${paths.workspaceDir}`);
  printInfo("Generated .csync/config.json and .csync/state.json");
  printInfo("Ensured .gitignore ignores .csync/");
  if (imported) {
    printKeyValue("Server file:", detected.filePath);
    if (detected.source === "manual") {
      printSuccess("Imported server environments from the specified file.");
    } else if (detected.source === "legacy-migrated") {
      printSuccess("Migrated legacy csync.servers.json into .csync/servers.json.");
    }
    printInfo("Embedded mode imported environments into .csync/config.json");
  } else {
    printWarn("No server file detected at .csync/servers.json");
    printHint("Import one with: csync init --server-file /path/to/servers.json");
  }
}
