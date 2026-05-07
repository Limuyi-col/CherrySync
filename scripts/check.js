import { access } from "node:fs/promises";
import path from "node:path";

const required = [
  "bin/csync.js",
  "bin/cherrysync.js",
  "src/cli.js",
  "src/commands/init.js",
  "src/commands/status.js",
  "src/commands/diff.js",
  "src/commands/push.js",
  "src/commands/servers.js",
  "src/commands/servers-import.js",
  "src/commands/servers-show.js",
  "src/lib/command-wrap.js",
  "src/lib/server-source.js",
  "src/lib/ignore.js",
  "src/lib/diff-preview.js",
  "src/lib/environments.js",
  "src/lib/state-model.js",
  "src/lib/server-selection.js"
];

for (const file of required) {
  await access(path.resolve(file));
}

console.log("Project structure looks valid.");
