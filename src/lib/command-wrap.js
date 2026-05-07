import { formatError } from "./errors.js";

export function wrapCommand(handler) {
  return async (...args) => {
    try {
      await handler(...args);
    } catch (error) {
      console.error(formatError(error));
      process.exitCode = 1;
    }
  };
}
