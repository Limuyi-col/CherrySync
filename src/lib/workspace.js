import path from "node:path";
import { promises as fs } from "node:fs";
import { DEFAULT_CONFIG, DEFAULT_STATE, WORKSPACE_DIRNAME } from "./constants.js";

export function workspacePaths(rootDir) {
  const workspaceDir = path.join(rootDir, WORKSPACE_DIRNAME);
  return {
    workspaceDir,
    configPath: path.join(workspaceDir, "config.json"),
    statePath: path.join(workspaceDir, "state.json"),
    logPath: path.join(workspaceDir, "sync.log"),
    tempDir: path.join(workspaceDir, ".temp"),
  };
}

export async function ensureWorkspace(rootDir) {
  const paths = workspacePaths(rootDir);
  await fs.mkdir(paths.workspaceDir, { recursive: true });
  await fs.mkdir(paths.tempDir, { recursive: true });
  await ensureJsonFile(paths.configPath, DEFAULT_CONFIG);
  await ensureJsonFile(paths.statePath, DEFAULT_STATE);
  await ensureTextFile(paths.logPath, "");
  return paths;
}

export async function ensureTempDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function removePath(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true });
}

export async function readLocalFileIfExists(filePath) {
  try {
    return {
      exists: true,
      content: await fs.readFile(filePath),
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { exists: false, content: null };
    }
    throw error;
  }
}

async function ensureJsonFile(filePath, data) {
  try {
    await fs.access(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  }
}

async function ensureTextFile(filePath, contents) {
  try {
    await fs.access(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    await fs.writeFile(filePath, contents, "utf8");
  }
}
