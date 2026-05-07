import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";
import SftpClient from "ssh2-sftp-client";

export class RemoteClient {
  constructor(environment) {
    this.environment = environment;
    this.client = new SftpClient();
    this.connected = false;
  }

  async connect() {
    if (this.connected) {
      return;
    }

    const config = {
      host: this.environment.host,
      port: this.environment.port ?? 22,
      username: this.environment.username,
    };

    if (this.environment.privateKeyPath) {
      const keyPath = expandHome(this.environment.privateKeyPath);
      config.privateKey = await fs.readFile(keyPath, "utf8");
    }

    if (this.environment.password) {
      config.password = this.environment.password;
    }

    await this.client.connect(config);
    this.connected = true;
  }

  remotePath(relativePath) {
    const basePath = this.environment.remotePath.replace(/\\/g, "/").replace(/\/+$/, "");
    const targetPath = relativePath.replace(/\\/g, "/");
    return `${basePath}/${targetPath}`;
  }

  async download(relativePath, localPath) {
    const remotePath = this.remotePath(relativePath);
    const exists = await this.client.exists(remotePath);
    if (!exists) {
      return false;
    }
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await this.client.fastGet(remotePath, localPath);
    return true;
  }

  async upload(relativePath, localPath) {
    const remotePath = this.remotePath(relativePath);
    await this.client.mkdir(path.posix.dirname(remotePath), true);
    await this.client.fastPut(localPath, remotePath);
  }

  async delete(relativePath) {
    const remotePath = this.remotePath(relativePath);
    const exists = await this.client.exists(remotePath);
    if (exists) {
      await this.client.delete(remotePath);
    }
  }

  async dispose() {
    if (!this.connected) {
      return;
    }
    this.connected = false;
    await this.client.end();
  }
}

function expandHome(filePath) {
  if (filePath.startsWith("~/")) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}
