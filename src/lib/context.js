import { loadConfig } from "./config.js";
import { loadState } from "./state.js";
import { resolveEnvironments } from "./server-source.js";
import { workspacePaths } from "./workspace.js";

export async function loadProjectContext(rootDir = process.cwd()) {
  const paths = workspacePaths(rootDir);
  const config = await loadConfig(paths.configPath);
  const environments = await resolveEnvironments(rootDir, config);
  const state = await loadState(paths.statePath, environments);
  return { rootDir, paths, config: { ...config, environments }, state };
}
