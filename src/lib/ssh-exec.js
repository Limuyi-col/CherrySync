import { Client } from "ssh2";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

function expandHome(filePath) {
  if (filePath.startsWith("~/")) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

export function remoteExec(server, command, options = {}) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const timeout = options.timeout ?? 30000;

    const timer = setTimeout(() => {
      conn.end();
      reject(new Error(`Remote command timed out after ${timeout}ms`));
    }, timeout);

    conn.on("ready", () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timer);
          conn.end();
          return reject(err);
        }

        let stdout = "";
        let stderr = "";

        stream.on("close", (code, signal) => {
          clearTimeout(timer);
          conn.end();
          resolve({
            code,
            signal,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
          });
        });

        stream.on("data", (data) => {
          stdout += data.toString();
        });

        stream.stderr.on("data", (data) => {
          stderr += data.toString();
        });
      });
    });

    conn.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    const connectConfig = {
      host: server.host,
      port: server.port ?? 22,
      username: server.username,
      readyTimeout: 10000,
    };

    if (server.privateKeyPath) {
      const keyPath = expandHome(server.privateKeyPath);
      fs.readFile(keyPath, "utf8")
        .then((key) => {
          connectConfig.privateKey = key;
          conn.connect(connectConfig);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(
            new Error(`Failed to read SSH key ${keyPath}: ${err.message}`),
          );
        });
    } else if (server.password) {
      connectConfig.password = server.password;
      conn.connect(connectConfig);
    } else {
      conn.connect(connectConfig);
    }
  });
}
