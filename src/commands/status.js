import { loadProjectContext } from "../lib/context.js";
import prompts from "prompts";
import { collectChanges, validateEnvironmentArg } from "../lib/scanner.js";
import { printChangeSet } from "../lib/output.js";
import { showFileDiff } from "../lib/diff-preview.js";
import { printHint } from "../lib/ui.js";

export async function statusCommand(env) {
  const context = await loadProjectContext();
  validateEnvironmentArg(context, env);

  const changeSet = await collectChanges(context, env);
  printChangeSet(env, changeSet);
  await previewDiffsInteractively(context, env, changeSet);
}

async function previewDiffsInteractively(context, env, changeSet) {
  const previewable = changeSet.filter((item) => item.type !== "deleted");
  if (previewable.length === 0 || !process.stdout.isTTY) {
    return;
  }

  printHint("Select a file to preview its remote diff. Choose Exit when finished.");

  while (true) {
    const response = await prompts(
      {
        type: "select",
        name: "target",
        message: `Preview diff in [${env}]`,
        choices: [
          ...previewable.map((item) => ({
            title: `${item.type.toUpperCase()}  ${item.path}`,
            value: item.path,
          })),
          {
            title: "Exit",
            value: null,
          },
        ],
        initial: 0,
      },
      {
        onCancel: () => {
          throw new Error("Operation cancelled.");
        },
      },
    );

    if (!response.target) {
      return;
    }

    await showFileDiff(context, env, response.target);
  }
}
