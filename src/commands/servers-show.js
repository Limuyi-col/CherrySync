import { loadConfig, normalizeConfigFile } from "../lib/config.js";
import { detectServerFile, loadServerFile } from "../lib/server-source.js";
import { workspacePaths } from "../lib/workspace.js";
import { formatServer, printKeyValue, printSection, printWarn } from "../lib/ui.js";

export async function serversShowCommand() {
  const rootDir = process.cwd();
  const paths = workspacePaths(rootDir);

  await normalizeConfigFile(paths.configPath);
  const config = await loadConfig(paths.configPath);
  const detected = await detectServerFile(rootDir, config);

  printSection("Servers", "Current server source and effective environment mapping");
  printKeyValue("Mode:", config.serverSource.mode);
  printKeyValue("Configured server file:", config.serverSource.path);
  printKeyValue("Resolved server file:", detected.filePath);
  printKeyValue("Server file exists:", detected.found ? "yes" : "no");

  if (detected.found && detected.source !== "canonical") {
    printKeyValue("Detected source:", detected.source);
  }

  printEnvironmentSection("Config environments", config.environments);

  if (detected.found) {
    const serverFile = await loadServerFile(rootDir, config);
    printEnvironmentSection("Server file environments", serverFile.environments);
  }
}

function printEnvironmentSection(title, environments) {
  const names = Object.keys(environments || {}).sort();
  printSection(title);

  if (names.length === 0) {
    printWarn("No environments configured.");
    return;
  }

  for (const name of names) {
    console.log(`${name}`);
    const environment = environments[name];
    for (const server of environment.servers || []) {
      console.log(`- ${formatServer(server)}`);
    }
  }
}
