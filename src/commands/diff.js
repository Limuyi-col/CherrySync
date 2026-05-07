import { loadProjectContext } from "../lib/context.js";
import { validateEnvironmentArg } from "../lib/scanner.js";
import { showFileDiff } from "../lib/diff-preview.js";

export async function diffCommand(env, filepath, options = {}) {
  const context = await loadProjectContext();
  validateEnvironmentArg(context, env);
  await showFileDiff(context, env, filepath, options);
}
