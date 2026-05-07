import { promises as fs } from "node:fs";
import { DEFAULT_CONFIG, SERVER_FILE_NAME } from "./constants.js";

export async function loadConfig(configPath) {
  try {
    const raw = await fs.readFile(configPath, "utf8");
    return normalizeConfigObject(JSON.parse(raw));
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("Missing .csync/config.json. Run `csync init` first.");
    }
    throw error;
  }
}

export async function normalizeConfigFile(configPath) {
  const current = await loadConfig(configPath);
  await fs.writeFile(configPath, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  return current;
}

function normalizeConfigObject(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid config.json structure.");
  }

  if (!parsed.serverSource || typeof parsed.serverSource !== "object") {
    parsed.serverSource = { ...DEFAULT_CONFIG.serverSource };
  }

  if (!parsed.serverSource.path) {
    parsed.serverSource.path = DEFAULT_CONFIG.serverSource.path;
  }

  if (parsed.serverSource.path === "csync.servers.json") {
    parsed.serverSource.path = SERVER_FILE_NAME;
  }

  if (!parsed.serverSource.mode) {
    parsed.serverSource.mode = DEFAULT_CONFIG.serverSource.mode;
  }

  if (!parsed.environments || typeof parsed.environments !== "object") {
    parsed.environments = {};
  }

  return parsed;
}
