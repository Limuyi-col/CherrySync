import { promises as fs } from "node:fs";

export async function appendLog(logPath, env, changes, serverIds = []) {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  const uploaded = changes.filter((item) => item.type !== "deleted").map((item) => item.path);
  const deleted = changes.filter((item) => item.type === "deleted").map((item) => item.path);
  const lines = [];
  const serverText = serverIds.length > 0 ? ` [${serverIds.join(", ")}]` : "";

  if (uploaded.length > 0) {
    lines.push(`[${timestamp}] [${env.toUpperCase()}]${serverText} SUCCESS - Pushed ${uploaded.length} file(s): ${uploaded.join(", ")}`);
  }
  if (deleted.length > 0) {
    lines.push(`[${timestamp}] [${env.toUpperCase()}]${serverText} DELETED - ${deleted.join(", ")}`);
  }

  if (lines.length > 0) {
    await fs.appendFile(logPath, `${lines.join("\n")}\n`, "utf8");
  }
}
