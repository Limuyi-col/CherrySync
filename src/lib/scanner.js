import path from "node:path";
import fg from "fast-glob";
import { hashFile } from "./hash.js";
import { buildIgnorePatterns } from "./ignore.js";
import { hasFileOnAnyServer, isFullySyncedAcrossServers } from "./state-model.js";
export function validateEnvironmentArg(context, env) {
  if (!env) {
    throw new Error("Missing target environment. Use `csync status <env>`.");
  }

  const configured = Object.keys(context.config.environments || {});
  if (configured.length === 0) {
    throw new Error("No target environments configured. Import server environments first.");
  }

  if (!context.config.environments[env]) {
    throw new Error(`Unknown environment: ${env}`);
  }
}

export async function collectChanges(context, env) {
  const ignore = await buildIgnorePatterns(context.rootDir, context.config.ignore);
  const files = await fg("**/*", {
    cwd: context.rootDir,
    dot: true,
    onlyFiles: true,
    ignore,
  });

  const localHashes = new Map();
  for (const relativePath of files.sort()) {
    const absolutePath = path.join(context.rootDir, relativePath);
    const digest = await hashFile(absolutePath);
    localHashes.set(relativePath.replace(/\\/g, "/"), { digest, absolutePath });
  }

  const stateForEnv = context.state[env] ?? {};
  const serverIds = (context.config.environments[env]?.servers || []).map((server) => server.id);
  const changes = [];

  for (const [relativePath, info] of localHashes.entries()) {
    if (!hasFileOnAnyServer(stateForEnv, relativePath)) {
      changes.push({ type: "added", path: relativePath, absolutePath: info.absolutePath });
    } else if (!isFullySyncedAcrossServers(stateForEnv, relativePath, info.digest, serverIds)) {
      changes.push({ type: "modified", path: relativePath, absolutePath: info.absolutePath });
    }
  }

  const remoteTrackedFiles = new Set();
  for (const serverState of Object.values(stateForEnv)) {
    for (const relativePath of Object.keys(serverState || {})) {
      remoteTrackedFiles.add(relativePath);
    }
  }

  for (const relativePath of [...remoteTrackedFiles].sort()) {
    if (!localHashes.has(relativePath)) {
      changes.push({ type: "deleted", path: relativePath, absolutePath: null });
    }
  }

  return changes.sort((left, right) => left.path.localeCompare(right.path));
}
