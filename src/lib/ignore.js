import path from "node:path";
import { promises as fs } from "node:fs";
import { DEFAULT_IGNORE, WORKSPACE_DIRNAME } from "./constants.js";

export async function buildIgnorePatterns(rootDir, configIgnore) {
  const merged = new Set(DEFAULT_IGNORE);
  merged.add(`**/${WORKSPACE_DIRNAME}/**`);

  if (Array.isArray(configIgnore)) {
    for (const pattern of configIgnore) {
      if (typeof pattern === "string" && pattern.trim() !== "") {
        merged.add(normalizeLegacyPattern(pattern.trim()));
      }
    }
  }

  const gitignorePatterns = await readGitignorePatterns(path.join(rootDir, ".gitignore"));
  for (const pattern of gitignorePatterns) {
    merged.add(pattern);
  }

  return [...merged];
}

export async function normalizeConfigIgnore(configPath) {
  const raw = await fs.readFile(configPath, "utf8");
  const config = JSON.parse(raw);
  const current = Array.isArray(config.ignore) ? config.ignore : [];
  const next = [...new Set(current.map(normalizeLegacyPattern).filter(Boolean).concat(DEFAULT_IGNORE))];

  const changed = current.length !== next.length || next.some((value, index) => value !== current[index]);
  if (!changed) {
    return;
  }

  config.ignore = next;
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function normalizeLegacyPattern(pattern) {
  const directMap = new Map([
    [".CSync/**", "**/.csync/**"],
    [".csync/**", "**/.csync/**"],
    [".git/**", "**/.git/**"],
    [".idea/**", "**/.idea/**"],
    [".vscode/**", "**/.vscode/**"],
    ["node_modules/**", "**/node_modules/**"],
    ["dist/**", "**/dist/**"],
    ["build/**", "**/build/**"],
    ["coverage/**", "**/coverage/**"],
    [".cache/**", "**/.cache/**"],
    [".next/**", "**/.next/**"],
    [".nuxt/**", "**/.nuxt/**"],
    [".turbo/**", "**/.turbo/**"],
    ["csync.servers.json", null]
  ]);

  return directMap.has(pattern) ? directMap.get(pattern) : pattern;
}

async function readGitignorePatterns(gitignorePath) {
  try {
    const raw = await fs.readFile(gitignorePath, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#") && !line.startsWith("!"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
