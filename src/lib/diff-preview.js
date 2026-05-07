import path from "node:path";
import { diffLines } from "diff";
import { RemoteClient } from "./remote-client.js";
import { ensureTempDir, readLocalFileIfExists, removePath } from "./workspace.js";
import { isBinaryFile, relativeProjectPath } from "./files.js";
import { printDiff } from "./output.js";
import { selectSingleServer } from "./server-selection.js";
import { printInfo, printSection, printWarn } from "./ui.js";

export async function showFileDiff(context, env, filepath, options = {}) {
  const relativePath = relativeProjectPath(filepath, context.rootDir);
  const localPath = path.join(context.rootDir, relativePath);
  const localExists = await readLocalFileIfExists(localPath);

  if (!localExists.exists) {
    printSection(`Diff ${env}`, relativePath);
    printWarn("Local file has been deleted; no local text diff available.");
    return;
  }

  if (await isBinaryFile(localPath)) {
    printSection(`Diff ${env}`, relativePath);
    printWarn("[Binary file, no text diff available]");
    return;
  }

  const tempDir = path.join(context.paths.tempDir, env, path.dirname(relativePath));
  const tempFilePath = path.join(context.paths.tempDir, env, relativePath);
  await ensureTempDir(tempDir);

  const server = await selectSingleServer(context.config.environments[env], env, options);
  const remote = new RemoteClient(server);
  try {
    await remote.connect();
    const downloaded = await remote.download(relativePath, tempFilePath);
    printSection(`Diff ${env}/${server.id}`, relativePath);

    if (!downloaded) {
      printInfo("New file on local workspace. No remote diff available.");
      return;
    }

    if (await isBinaryFile(tempFilePath)) {
      printWarn("[Binary file, no text diff available]");
      return;
    }

    const localText = localExists.content.toString("utf8");
    const remoteText = (await readLocalFileIfExists(tempFilePath)).content.toString("utf8");
    const hunks = diffLines(remoteText, localText);
    printDiff(relativePath, hunks);
  } finally {
    await remote.dispose();
    await removePath(path.join(context.paths.tempDir, env));
  }
}
