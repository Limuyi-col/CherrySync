import path from "node:path";
import { promises as fs } from "node:fs";

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".pdf",
  ".zip", ".gz", ".tar", ".7z", ".rar", ".woff", ".woff2", ".ttf",
  ".eot", ".mp3", ".mp4", ".avi", ".mov", ".exe", ".dll", ".so"
]);

export function relativeProjectPath(inputPath, rootDir) {
  const normalized = inputPath.replace(/\\/g, "/");
  const absolute = path.resolve(rootDir, normalized);
  const relative = path.relative(rootDir, absolute).replace(/\\/g, "/");

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path is outside project root: ${inputPath}`);
  }
  return relative;
}

export async function isBinaryFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) {
    return true;
  }

  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(1024);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    for (let index = 0; index < bytesRead; index += 1) {
      if (buffer[index] === 0) {
        return true;
      }
    }
    return false;
  } finally {
    await handle.close();
  }
}
