import chalk from "chalk";
import { formatChangeType, printDivider, printSection } from "./ui.js";

export function printChangeSet(env, changes) {
  printSection(`Status ${env}`, `Pending changes against remote environment [${env}]`);
  if (changes.length === 0) {
    console.log(chalk.green("No pending changes."));
    return;
  }

  printDivider();
  for (const item of changes) {
    console.log(`${formatChangeType(item.type)}  ${item.path}`);
  }
  printDivider();
  console.log(chalk.dim(`Total ${changes.length} change(s)`));
}

export function printDiff(filePath, hunks) {
  for (const part of hunks) {
    const lines = part.value.split("\n");
    for (const line of lines) {
      if (line === "") {
        continue;
      }

      if (part.added) {
        console.log(chalk.green(`+ ${line}`));
      } else if (part.removed) {
        console.log(chalk.red(`- ${line}`));
      } else {
        console.log(`  ${line}`);
      }
    }
  }
}
