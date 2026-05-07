import { promises as fs } from "node:fs";

export async function ensureGitignoreEntry(gitignorePath, entry) {
  let existing = "";
  try {
    existing = await fs.readFile(gitignorePath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const lines = existing.split(/\r?\n/).filter(Boolean);
  if (!lines.includes(entry)) {
    const next = `${existing.trimEnd()}${existing ? "\n" : ""}${entry}\n`;
    await fs.writeFile(gitignorePath, next, "utf8");
  }
}
