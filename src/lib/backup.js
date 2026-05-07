import path from "node:path";
import { promises as fs } from "node:fs";
import { workspacePaths, ensureTempDir } from "./workspace.js";
import { RemoteClient } from "./remote-client.js";
import { printInfo, printSection, printSuccess, printWarn } from "./ui.js";

function backupDir(rootDir) {
  return path.join(workspacePaths(rootDir).workspaceDir, "backups");
}

function timestampedDir(rootDir, env, serverId) {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return path.join(backupDir(rootDir), env, serverId, ts);
}

export async function createBackup(
  rootDir,
  env,
  servers,
  filePaths,
  options = {},
) {
  const dryRun = options.dryRun ?? false;
  const backupTimestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const results = [];

  if (!dryRun) {
    printSection("Backup", "Downloading remote files before push");
  }

  for (const server of servers) {
    const serverResults = [];
    const remote = new RemoteClient(server);

    try {
      await remote.connect();

      for (const relativePath of filePaths) {
        const localBackupPath = path.join(
          backupDir(rootDir),
          env,
          server.id,
          backupTimestamp,
          relativePath,
        );

        if (!dryRun) {
          await ensureTempDir(path.dirname(localBackupPath));
          const downloaded = await remote.download(
            relativePath,
            localBackupPath,
          );

          serverResults.push({
            path: relativePath,
            backedUp: downloaded,
            backupPath: localBackupPath,
          });

          if (downloaded) {
            printInfo(`Backed up: ${server.id} ${relativePath}`);
          } else {
            printWarn(
              `No remote file to back up: ${server.id} ${relativePath}`,
            );
          }
        } else {
          serverResults.push({
            path: relativePath,
            backedUp: false,
            backupPath: localBackupPath,
            note: "dry-run",
          });
        }
      }
    } finally {
      await remote.dispose();
    }

    results.push({
      serverId: server.id,
      timestamp: backupTimestamp,
      files: serverResults,
    });
  }

  return { timestamp: backupTimestamp, results };
}

export async function listBackups(rootDir, env, serverId) {
  const dir = path.join(backupDir(rootDir), env, serverId ?? "");

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const timestamps = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .reverse();
    return timestamps;
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function restoreBackup(
  rootDir,
  env,
  backups,
  server,
  options = {},
) {
  const dryRun = options.dryRun ?? false;
  const timestamp = options.timestamp;
  const files = options.files;

  if (dryRun) {
    printSection(
      "Rollback Preview",
      `Would restore from backup [${timestamp}] to ${server.id}`,
    );
  } else {
    printSection(
      "Rollback",
      `Restoring files from backup [${timestamp}] on ${server.id}`,
    );
  }

  const basePath = path.join(backupDir(rootDir), env, server.id, timestamp);
  const results = [];

  if (!dryRun) {
    const remote = new RemoteClient(server);
    try {
      await remote.connect();

      for (const relativePath of files) {
        try {
          const localBackupPath = path.join(basePath, relativePath);
          const fileExists = await fs
            .access(localBackupPath)
            .then(() => true)
            .catch(() => false);

          if (!fileExists) {
            results.push({
              path: relativePath,
              restored: false,
              error: "Backup file not found",
            });
            printWarn(`Backup not found: ${relativePath}`);
            continue;
          }

          await remote.upload(relativePath, localBackupPath);
          results.push({ path: relativePath, restored: true });
          printSuccess(`Restored: ${server.id} ${relativePath}`);
        } catch (error) {
          results.push({
            path: relativePath,
            restored: false,
            error: error.message,
          });
        }
      }
    } finally {
      await remote.dispose();
    }
  } else {
    for (const relativePath of files) {
      results.push({ path: relativePath, restored: true, note: "dry-run" });
    }
  }

  return results;
}

export async function getBackupFiles(rootDir, env, serverId, timestamp) {
  const dir = path.join(backupDir(rootDir), env, serverId, timestamp);

  async function walk(baseDir, relativePrefix = "") {
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const rel = relativePrefix
        ? `${relativePrefix}/${entry.name}`
        : entry.name;
      if (entry.isDirectory()) {
        files.push(...(await walk(path.join(baseDir, entry.name), rel)));
      } else {
        files.push(rel);
      }
    }

    return files;
  }

  try {
    return await walk(dir);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
