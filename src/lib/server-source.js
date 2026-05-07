import path from "node:path";
import { promises as fs } from "node:fs";
import { DEFAULT_CONFIG, SERVER_FILE_NAME } from "./constants.js";
import { normalizeEnvironments } from "./environments.js";

export function defaultServerFilePath(rootDir, config) {
  const configured = config?.serverSource?.path || DEFAULT_CONFIG.serverSource.path || SERVER_FILE_NAME;
  return path.resolve(rootDir, configured);
}

export async function detectServerFile(rootDir, config = DEFAULT_CONFIG) {
  const filePath = defaultServerFilePath(rootDir, config);
  try {
    await fs.access(filePath);
    return { found: true, filePath, source: "canonical" };
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const legacyPath = path.resolve(rootDir, "csync.servers.json");
  try {
    await fs.access(legacyPath);
    return { found: true, filePath: legacyPath, source: "legacy" };
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  return { found: false, filePath };
}

export async function loadServerFile(rootDir, config) {
  const filePath = defaultServerFilePath(rootDir, config);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const environments = parsed?.environments;
    if (!environments || typeof environments !== "object") {
      throw new Error(`Invalid server file structure: ${path.basename(filePath)}`);
    }
    return { filePath, environments: normalizeEnvironments(environments) };
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Missing server file: ${filePath}`);
    }
    throw error;
  }
}

export async function resolveEnvironments(rootDir, config) {
  const mode = config?.serverSource?.mode ?? "embedded";
  const baseEnvironments = normalizeEnvironments(config?.environments && typeof config.environments === "object" ? config.environments : {});

  if (mode === "dynamic") {
    const { environments } = await loadServerFile(rootDir, config);
    return environments;
  }

  return baseEnvironments;
}

export async function importServerFileEnvironments(configPath, rootDir) {
  const raw = await fs.readFile(configPath, "utf8");
  const config = JSON.parse(raw);
  const mode = config?.serverSource?.mode ?? "embedded";
  if (mode !== "embedded") {
    return false;
  }

  const { environments } = await loadServerFile(rootDir, config);
  config.environments = environments;
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return true;
}

export async function installServerFile(rootDir, config, sourcePath) {
  const resolvedSourcePath = path.resolve(rootDir, sourcePath);
  const raw = await fs.readFile(resolvedSourcePath, "utf8");
  const parsed = JSON.parse(raw);
  const environments = parsed?.environments;
  if (!environments || typeof environments !== "object") {
    throw new Error(`Invalid server file structure: ${path.basename(resolvedSourcePath)}`);
  }

  const targetPath = defaultServerFilePath(rootDir, config);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${JSON.stringify({ environments }, null, 2)}\n`, "utf8");
  return targetPath;
}

export async function syncServerEnvironments(rootDir, configPath, sourcePath) {
  const raw = await fs.readFile(configPath, "utf8");
  const config = JSON.parse(raw);

  let serverFilePath = defaultServerFilePath(rootDir, config);
  if (sourcePath) {
    serverFilePath = await installServerFile(rootDir, config, sourcePath);
  }

  const serverRaw = await fs.readFile(serverFilePath, "utf8");
  const serverParsed = JSON.parse(serverRaw);
  const environments = normalizeEnvironments(serverParsed?.environments);
  if (!environments || typeof environments !== "object") {
    throw new Error(`Invalid server file structure: ${path.basename(serverFilePath)}`);
  }

  const previous = config.environments && typeof config.environments === "object" ? config.environments : {};
  const diff = diffEnvironmentMaps(previous, environments);
  config.environments = environments;
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

  return {
    serverFilePath,
    environments,
    importedCount: Object.keys(environments).length,
    ...diff
  };
}

function diffEnvironmentMaps(previous, next) {
  const previousKeys = Object.keys(previous).sort();
  const nextKeys = Object.keys(next).sort();
  const previousSet = new Set(previousKeys);
  const nextSet = new Set(nextKeys);

  const added = nextKeys.filter((key) => !previousSet.has(key));
  const removed = previousKeys.filter((key) => !nextSet.has(key));
  const updated = nextKeys.filter((key) => previousSet.has(key) && JSON.stringify(previous[key]) !== JSON.stringify(next[key]));

  return { added, removed, updated };
}
