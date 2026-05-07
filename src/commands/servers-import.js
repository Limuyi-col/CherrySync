import { loadConfig, normalizeConfigFile } from "../lib/config.js";
import { syncServerEnvironments } from "../lib/server-source.js";
import { loadState, saveState, syncStateEnvironments } from "../lib/state.js";
import { workspacePaths } from "../lib/workspace.js";
import { printInfo, printSection, printSuccess, printWarn } from "../lib/ui.js";

export async function serversImportCommand(sourcePath) {
  const rootDir = process.cwd();
  const paths = workspacePaths(rootDir);

  await normalizeConfigFile(paths.configPath);
  const config = await loadConfig(paths.configPath);
  const result = await syncServerEnvironments(rootDir, paths.configPath, sourcePath);
  const state = await loadState(paths.statePath, result.environments);
  const nextState = syncStateEnvironments(state, result.environments);
  await saveState(paths.statePath, nextState);

  printSection("Servers Import", "Sync server definitions into .csync/config.json");
  printInfo(`Server file: ${result.serverFilePath}`);
  printSuccess(`Imported ${result.importedCount} environment(s) into .csync/config.json.`);

  if (result.removed.length > 0) {
    printWarn(`Removed environment(s): ${result.removed.join(", ")}`);
  }

  if (result.added.length > 0) {
    printSuccess(`Added environment(s): ${result.added.join(", ")}`);
  }

  if (result.updated.length > 0) {
    printInfo(`Updated environment(s): ${result.updated.join(", ")}`);
  }

  if (result.removed.length === 0 && result.added.length === 0 && result.updated.length === 0) {
    printInfo("No environment changes detected.");
  }

  if ((config.serverSource?.mode ?? "embedded") !== "embedded") {
    printWarn("Current config uses dynamic server mode; runtime commands still read directly from .csync/servers.json.");
  }
}
