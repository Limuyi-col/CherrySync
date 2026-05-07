import { promises as fs } from "node:fs";
import { normalizeStateShape } from "./state-model.js";

export async function loadState(statePath, environments) {
  try {
    const raw = await fs.readFile(statePath, "utf8");
    return normalizeStateShape(JSON.parse(raw), environments);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("Missing .csync/state.json. Run `csync init` first.");
    }
    throw error;
  }
}

export async function saveState(statePath, state) {
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function syncStateEnvironments(state, environments) {
  return normalizeStateShape(state, environments);
}
