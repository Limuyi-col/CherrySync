import chalk from "chalk";

export function printSection(title, subtitle = "") {
  console.log("");
  console.log(chalk.bold.cyan(`== ${title} ==`));
  if (subtitle) {
    console.log(chalk.dim(subtitle));
  }
}

export function printKeyValue(label, value) {
  console.log(`${chalk.dim(label)} ${value}`);
}

export function printInfo(message) {
  console.log(chalk.blue(`INFO  ${message}`));
}

export function printSuccess(message) {
  console.log(chalk.green(`OK    ${message}`));
}

export function printWarn(message) {
  console.log(chalk.yellow(`WARN  ${message}`));
}

export function printErrorLine(message) {
  console.log(chalk.red(`ERR   ${message}`));
}

export function printHint(message) {
  console.log(chalk.dim(`TIP   ${message}`));
}

export function formatChangeType(type) {
  if (type === "added") {
    return chalk.green("ADD");
  }
  if (type === "modified") {
    return chalk.yellow("MOD");
  }
  return chalk.red("DEL");
}

export function formatServer(server) {
  return `${chalk.bold(server.id)} ${chalk.dim(`(${server.username}@${server.host}:${server.port})`)} ${server.remotePath}`;
}

export function printDivider() {
  console.log(chalk.dim("-".repeat(56)));
}
