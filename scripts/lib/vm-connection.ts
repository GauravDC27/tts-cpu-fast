import fs from 'fs';
import dotenv from 'dotenv';
import type { ConnectConfig } from 'ssh2';

dotenv.config({ quiet: true });

/**
 * SSH settings for the H200 training VM, read only from the environment
 * (or a local, git-ignored .env file). See .env.example.
 * Key auth (VM_SSH_KEY_PATH) takes precedence over VM_PASSWORD.
 */
export function vmConnectConfig(): ConnectConfig {
  const host = process.env.VM_HOST;
  const port = Number(process.env.VM_PORT || 22);
  const username = process.env.VM_USER || 'ubuntu';
  const keyPath = process.env.VM_SSH_KEY_PATH;
  const password = process.env.VM_PASSWORD;

  if (!host || (!keyPath && !password)) {
    console.error('Missing VM connection settings: set VM_HOST and either VM_SSH_KEY_PATH or VM_PASSWORD (see .env.example).');
    process.exit(1);
  }

  if (keyPath) {
    return {
      host,
      port,
      username,
      privateKey: fs.readFileSync(keyPath),
      passphrase: process.env.VM_SSH_KEY_PASSPHRASE,
    };
  }

  return { host, port, username, password };
}
