<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo.svg">
    <img src="assets/logo.svg" alt="CherrySync" width="480">
  </picture>
</p>

<p align="center">
  <strong>Lightweight multi-environment code sync CLI with environment-aware state tracking.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <a href="#"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg" alt="Node: >=18"></a>
  <a href="#"><img src="https://img.shields.io/badge/npm-v1.1.0-orange.svg" alt="npm: v1.1.0"></a>
  <a href="#"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
</p>

<br>

---

## What is CherrySync?

CherrySync lets you sync local code to remote servers via SFTP — with full awareness of **what changed**, **what hasn't**, and across **multiple environments** like test, staging, and production.

It's like `git status` + `git push`, but for servers that don't run Git.

<br>

## Why CherrySync?

| Your pain point                       | Without CherrySync                                      | With CherrySync                                                               |
| :------------------------------------ | :------------------------------------------------------ | :---------------------------------------------------------------------------- |
| **Preview on staging**                | Commit half-baked code, push to Git, pull on server     | `csync push test` — zero garbage commits                                      |
| **"Did I upload this already?"**      | Check file timestamps manually or re-upload everything  | MD5 hash tracking per env, per server                                         |
| **Multi-server prod**                 | Upload to each server by hand, pray you didn't miss one | One command pushes to all servers — in parallel                               |
| **"What did I change?"**              | `git diff` only shows committed changes                 | `csync status` shows all un-synced edits                                      |
| **Accidental overwrites**             | No clue what's on the remote                            | `csync diff` fetches the remote version for side-by-side comparison           |
| **Deployment mistakes**               | Push wrong files to prod, no way to undo                | `csync push --backup` auto-saves remote files; `csync rollback` restores them |
| **Env divergence**                    | Test and prod drift apart silently over weeks           | `csync drift test prod` catches drift before it causes incidents              |
| **"Did all servers get the update?"** | Manually SSH into each machine to check                 | `csync consistency prod` verifies every server in one shot                    |

### vs. similar tools

| Tool                            | Designed for                    | How CherrySync is different                                                                        |
| :------------------------------ | :------------------------------ | :------------------------------------------------------------------------------------------------- |
| `rsync` / `scp`                 | One-shot file copy              | **Stateful** — remembers what's synced so you don't re-upload unchanged files                      |
| IDE auto-upload                 | Save-triggered single-file push | **Full-project awareness** — review all changes before pushing, like staging a commit              |
| CI/CD (GitHub Actions, Jenkins) | Git-push-triggered deployment   | **No commits needed** — sync directly while iterating; commit only when code is ready              |
| git-ftp / dploy                 | Git-diff-based FTP sync         | **Environment isolation** — test and prod tracked separately; multi-server with consistency checks |
| Ansible / Chef                  | Infrastructure-as-code          | **Zero config overhead** — no playbooks, no YAML boilerplate; one JSON file and you're done        |

> **CherrySync is the missing link between writing code and committing it** — the tool you reach for when you need to see changes live on dev/staging without polluting your Git history.

<br>

## Features

| Feature                     | Description                                     | Feature                  | Description                                         |
| :-------------------------- | :---------------------------------------------- | :----------------------- | :-------------------------------------------------- |
| Environment-aware state     | Test, staging, production tracked independently | Change staging           | Select which files to sync per push                 |
| Multi-server parallel push  | Deploy to all servers concurrently              | Remote backup & rollback | Auto-backup before overwrite; one-command restore   |
| Interactive diff preview    | Compare local vs remote content before push     | Health check             | Verify service health via HTTP after deploy         |
| Dry-run preview             | See the full push plan before any transfer      | Post-deploy commands     | Run `systemctl restart` etc. via SSH after push     |
| Environment drift detection | Catch test/prod divergence early                | Watch mode               | Auto-detect changes and show pending status         |
| Cluster consistency check   | Verify all servers have identical file versions | Binary file detection    | Safe handling; no terminal garbage                  |
| Operation logging           | Every sync written to `sync.log`                | Workspace isolation      | All config in `.csync/`, never touches your project |

<br>

## Quick Demo

```bash
# 1. Initialize CherrySync in your project
$ csync init
  ✓ Workspace initialized at /home/you/project/.csync
  ✓ Generated .csync/config.json and .csync/state.json
  ✓ Ensured .gitignore ignores .csync/

# 2. Import your server definitions
$ csync servers import
  ✓ Imported 2 environment(s) into .csync/config.json.

# 3. Check what's changed since last sync
$ csync status test

=== Status test ===========================================
  ADDED     src/components/Header.js
  MODIFIED  src/index.js
  DELETED   src/old-util.js
===========================================================
? Preview diff in [test] - MODIFIED src/index.js

--- Remote (test-01)  +++ Local
@@ -1,4 +1,4 @@
-  <title>Old Title</title>
+  <title>New Title</title>

# 4. Preview without executing
$ csync dry-run prod
=== Dry Run: push prod ====================================
Target servers:
- prod-01 (deploy@10.0.0.1:22) /srv/prod
- prod-02 (deploy@10.0.0.2:22) /srv/prod
-----------------------------------------------------------
Pending changes:
- MODIFIED  src/index.js
- ADDED     src/components/Header.js
-----------------------------------------------------------
Summary: 1 added, 1 modified, 0 deleted
Total: 2 file(s) would be pushed to 2 server(s)

# 5. Safe push with backup + health check + restart
$ csync push prod --backup --health-url https://example.com/health --post-command "sudo systemctl reload nginx"
? Select files to sync to [prod] >
  ☑ (MODIFIED) src/index.js
  ☑ (ADDED)    src/components/Header.js

  Backup: downloading remote files before overwrite...
  ✓ Backed up: prod-01 src/index.js

✓ Synced 2 item(s) across 2 server(s).

  Health Check: https://example.com/health
  ✓ Health check passed — HTTP 200 (42ms)

  Post Command: sudo systemctl reload nginx
  ✓ prod-01: exit code 0
  ✓ prod-02: exit code 0

# 6. Verify cluster consistency
$ csync consistency prod
=== Consistency Check =====================================
  ✓ All 2 server(s) in [prod] are fully consistent.

# 7. Check for environment drift
$ csync drift test prod
=== Environment Drift =====================================
  Comparing [test] vs [prod]
  Drift Summary: 2 file(s) differ between environments
  - Only in test  src/components/Header.js
  - Diverged  src/index.js

# 8. Oops, rollback if needed
$ csync rollback prod
  ✓ Restored 1 file(s) on prod-01.
```

<br>

## Installation

### Prerequisites

- **Node.js >= 18** — [download](https://nodejs.org/)
- **npm** (ships with Node.js)
- SSH access to your target servers (key-based or password)

### Global install (recommended)

```bash
npm install -g cherrysync
```

Two commands become available globally — use whichever you prefer:

```bash
cherrysync --help
csync --help          # short alias
```

### Local install (per-project)

```bash
npm install --save-dev cherrysync
```

Run via `npx`:

```bash
npx csync init
npx csync status test
```

<br>

## Getting Started

### 1. Initialize

Navigate to your project root:

```bash
cd my-project
csync init
```

This creates the `.csync/` workspace:

```
my-project/
├── .csync/                 # gitignored
│   ├── config.json         # Server definitions + settings
│   ├── state.json          # Per-file-per-server MD5 hashes
│   ├── sync.log            # Append-only operation log
│   ├── backups/            # Remote file backups (from push --backup)
│   └── .temp/              # Temp files (auto-cleaned)
├── src/
├── .gitignore              # ".csync/" auto-appended
└── package.json
```

### 2. Define your servers

Create `.csync/servers.json`:

```json
{
  "test": {
    "servers": [
      {
        "id": "test-01",
        "host": "192.168.1.100",
        "port": 22,
        "username": "deploy",
        "privateKeyPath": "~/.ssh/id_rsa",
        "remotePath": "/var/www/my-project-test"
      }
    ]
  },
  "prod": {
    "servers": [
      {
        "id": "prod-01",
        "host": "10.0.0.1",
        "port": 22,
        "username": "deploy",
        "privateKeyPath": "~/.ssh/id_rsa",
        "remotePath": "/var/www/my-project"
      },
      {
        "id": "prod-02",
        "host": "10.0.0.2",
        "port": 22,
        "username": "deploy",
        "privateKeyPath": "~/.ssh/id_rsa",
        "remotePath": "/var/www/my-project"
      }
    ]
  }
}
```

Import the servers:

```bash
csync servers import
```

> **Shortcut:** Use `csync init --server-file /path/to/servers.json` to do steps 1 and 2 together.

### 3. Review changes

```bash
csync status test
```

Shows Added / Modified / Deleted files, with an interactive diff picker to inspect individual changes.

### 4. Preview your push

```bash
csync dry-run test
```

See exactly which files would go to which servers — zero risk.

### 5. Push (safely)

```bash
csync push test --backup
```

Interactive workflow: select files - select servers - review - confirm - transfer. The `--backup` flag saves remote files before overwriting so you can always roll back.

<br>

## Command Reference

### `csync init`

```bash
csync init [--server-file <path>]
```

Bootstraps the `.csync/` workspace in the current directory.

| Action               | Detail                                                                             |
| :------------------- | :--------------------------------------------------------------------------------- |
| Creates `.csync/`    | `config.json`, `state.json`, `sync.log`, `.temp/`, `backups/`                      |
| Default ignore rules | `node_modules`, `.git`, IDE dirs, build artifacts, caches                          |
| Seeds state          | Empty `test` and `prod` environments                                               |
| Git safety           | Appends `.csync/` to `.gitignore`                                                  |
| Server import        | Optionally imports from `--server-file`; auto-migrates legacy `csync.servers.json` |

```bash
csync init
csync init --server-file ~/my-servers.json
```

---

### `csync status <env>`

```bash
csync status <env>
```

Scans local files, computes MD5 hashes, compares against `.csync/state.json`, and shows every file that changed since the last push.

| Classification | Meaning                                            |
| :------------- | :------------------------------------------------- |
| **ADDED**      | Local file not tracked in this environment's state |
| **MODIFIED**   | Hash differs from state on at least one server     |
| **DELETED**    | Tracked in state but no longer on disk             |

After displaying the list, drops into an interactive loop — pick any file to preview its local-vs-remote diff.

```bash
csync status test
csync status prod
```

---

### `csync diff <env> <filepath>`

```bash
csync diff <env> <filepath> [--server <id>]
```

Fetches the remote file via SFTP, computes a unified diff, and displays it with syntax coloring.

| Scenario            | Output                                  |
| :------------------ | :-------------------------------------- |
| Normal              | Green (+) / Red (-) unified diff        |
| New file            | `New File (No remote version to diff)`  |
| Binary file         | `[Binary file, no text diff available]` |
| Remote file deleted | `Remote file does not exist`            |

```bash
csync diff test src/index.js
csync diff prod src/utils.js --server prod-02
```

---

### `csync push <env>`

```bash
csync push <env> [options]
```

Interactive multi-step push with safety features.

| Option                 | Description                                                         |
| :--------------------- | :------------------------------------------------------------------ |
| `--server <id>`        | Push only to one specific server                                    |
| `--backup`             | Download remote files before overwriting (enables `csync rollback`) |
| `--no-parallel`        | Push to servers sequentially (default: parallel)                    |
| `--health-url <url>`   | HTTP GET after push; warns if non-2xx/3xx response                  |
| `--post-command <cmd>` | Execute shell command on remote servers via SSH after push          |
| `--verbose`            | Show detailed output including remote command stdout                |

**Workflow steps:**

| Step                                      | What happens                                                   |
| :---------------------------------------- | :------------------------------------------------------------- |
| **1. File selection**                     | Multi-select checklist — pick which changed files to push      |
| **2. Server selection**                   | Choose target servers (or all) — skipped if `--server` is set  |
| **3. Backup** (if `--backup`)             | Downloads remote files to `.csync/backups/` before overwriting |
| **4. Review**                             | Summary of targets and files — explicit confirmation required  |
| **5. Delete approval**                    | Separate confirmation before deleting remote files             |
| **6. Transfer**                           | SFTP upload/create/delete (parallel across servers by default) |
| **7. State update**                       | MD5 hashes written to state after each successful transfer     |
| **8. Health check** (if `--health-url`)   | HTTP GET to verify service availability                        |
| **9. Post command** (if `--post-command`) | SSH exec on each remote server                                 |
| **10. Logging**                           | Operation appended to `sync.log`                               |

> **Atomicity:** Failed transfers do **not** update state — those files re-appear in the next `status`.

**Examples:**

```bash
# Basic push
csync push test

# Safe production push with full safety net
csync push prod --backup --health-url https://example.com/health --post-command "sudo systemctl reload nginx"

# Push to a single server
csync push prod --server prod-01

# Push with verbose output
csync push prod --backup --verbose
```

---

### `csync dry-run <env>`

```bash
csync dry-run <env> [--server <id>]
```

Preview exactly what `csync push` would do — without connecting to servers or transferring any files. Shows target servers, pending changes, and a summary of what would happen.

```bash
csync dry-run test
csync dry-run prod --server prod-01
```

---

### `csync drift <envA> <envB>`

```bash
csync drift <envA> <envB> [--changes] [--verbose]
```

Compare the sync state of two environments and report files that have diverged or are missing from one environment.

| Option      | Description                                                  |
| :---------- | :----------------------------------------------------------- |
| `--changes` | Also display local changes that would help resolve the drift |
| `--verbose` | Show per-server consistency details for each diverged file   |

**Use cases:**

- Before a prod deploy, check that test and prod aren't already out of sync
- After a hotfix applied directly on production, find what was modified
- Audit: "has anyone pushed to test but forgotten to push to prod?"

```bash
csync drift test prod
csync drift staging prod --changes --verbose
```

---

### `csync rollback <env>`

```bash
csync rollback <env> [--server <id>] [--timestamp <ts>]
```

Restore files from a previous backup (created via `csync push --backup`). Interactive — pick a backup timestamp and confirm restoration.

| Option             | Description                                                    |
| :----------------- | :------------------------------------------------------------- |
| `--server <id>`    | Rollback on a specific server only                             |
| `--timestamp <ts>` | Skip the interactive picker and restore from a specific backup |

```bash
csync rollback test
csync rollback prod --server prod-01 --timestamp 2026-05-07T09-30-00
```

> Backups are stored locally in `.csync/backups/<env>/<server>/<timestamp>/`. Old backups can be cleaned manually.

---

### `csync consistency <env>`

```bash
csync consistency <env>
```

Verify that all servers in an environment have the same file versions. Reports any files that are missing from some servers or have mismatched hashes.

```bash
csync consistency prod
```

**Example output when issues are found:**

```
=== Consistency Check =====================================
  WARN  2 inconsistency issue(s) found across 3 servers

  DIVERGED  src/api.js
    lb-01: hash: a1b2c3d4...
    lb-02: hash: a1b2c3d4...
    lb-03: MISSING

  MISSING   src/config.js
    lb-01: present
    lb-02: absent
    lb-03: present

  TIP  Run: csync push prod to bring all servers back to consistency.
```

---

### `csync watch <env>`

```bash
csync watch <env> [--interval <ms>] [--auto]
```

Watch for file changes and automatically display pending sync status. Useful during active development — keep it running in a terminal while you edit code.

| Option            | Description                                       |
| :---------------- | :------------------------------------------------ |
| `--interval <ms>` | Debounce interval in milliseconds (default: 3000) |
| `--auto`          | Automatically push when changes are detected      |

```bash
csync watch test
csync watch test --interval 5000
```

Press `Ctrl+C` to exit watch mode.

---

### `csync servers`

```bash
csync servers import [path]
csync servers show
```

| Subcommand      | Description                                                                                                     |
| :-------------- | :-------------------------------------------------------------------------------------------------------------- |
| `import [path]` | Import server definitions into `.csync/config.json`. If `path` is given, copies to `.csync/servers.json` first. |
| `show`          | Display current server configuration: mode, server file path, all environments and servers.                     |

```bash
csync servers import
csync servers import ~/new-server-config.json
csync servers show
```

<br>

## Server File Format

Server definitions live in `.csync/servers.json`. Each top-level key is an environment name; each environment contains an array of server objects.

### Schema

```json
{
  "<environment-name>": {
    "servers": [
      {
        "id": "<unique-id>",
        "name": "<display-name>",
        "host": "<host-or-ip>",
        "port": 22,
        "username": "<ssh-user>",
        "privateKeyPath": "~/.ssh/id_rsa",
        "password": "<ssh-password>",
        "remotePath": "/absolute/remote/path"
      }
    ]
  }
}
```

### Field reference

| Field            | Required | Default        | Notes                                                        |
| :--------------- | :------- | :------------- | :----------------------------------------------------------- |
| `id`             | No       | Auto-generated | Unique server identifier (e.g. `prod-a`)                     |
| `name`           | No       | Same as `id`   | Human-readable display name                                  |
| `host`           | **Yes**  | —              | SSH hostname or IP                                           |
| `port`           | No       | `22`           | SSH port                                                     |
| `username`       | **Yes**  | —              | SSH login user                                               |
| `privateKeyPath` | No       | —              | SSH private key, `~` expanded. Takes priority over password. |
| `password`       | No       | —              | Password auth (fallback when no key path)                    |
| `remotePath`     | **Yes**  | —              | Absolute remote path for file sync                           |

### Multi-server environments

When an environment lists multiple servers, CherrySync tracks each server independently:

```json
{
  "prod": {
    "servers": [
      { "id": "lb-01", "host": "10.0.0.1", ... },
      { "id": "lb-02", "host": "10.0.0.2", ... }
    ]
  }
}
```

A file only disappears from `csync status` once its hash matches across **all** servers. Use `csync consistency prod` to verify at any time.

### Config modes

| Mode                 | Behavior                                                                                     |
| :------------------- | :------------------------------------------------------------------------------------------- |
| `embedded` (default) | Server definitions copied into `config.json` on import. Re-import after server file changes. |
| `dynamic`            | Server definitions read from `servers.json` at runtime on every command.                     |

Set via `serverSource.mode` in `.csync/config.json`.

<br>

## How It Works

### Change detection pipeline

```
Local files  ->  glob (respecting ignore rules)  ->  MD5 hash  ->  compare with state.json  ->  classify
```

1. **Scan** — `fast-glob` lists all project files, applying merged ignore patterns (defaults + config + `.gitignore`)
2. **Hash** — Each file hashed via streaming MD5 (efficient on large files)
3. **Compare** — Hashes compared against `.csync/state.json` for the target environment
4. **Classify** — Each file labeled ADDED, MODIFIED, or DELETED

### State data model

```
state[environment][serverId][relativeFilePath] = md5hash
```

Three-level tracking means each environment is siloed and each server within an environment is independently verified.

### SFTP & SSH operations

- **Auth**: SSH key (read from file with `~` expansion) or password
- **Upload**: `fastPut` with automatic recursive `mkdir`
- **Download**: `fastGet` to `.csync/.temp/` for diff, `.csync/backups/` for backup
- **Delete**: With existence check before removal
- **Remote exec**: Dedicated SSH connection for `--post-command` execution

<br>

## Configuration

### .csync/config.json

Generated by `csync init`:

```json
{
  "ignore": [
    "**/node_modules/**",
    "**/.git/**",
    "**/.csync/**",
    ".DS_Store",
    "*.log",
    "**/.idea/**",
    "**/dist/**",
    "**/build/**",
    "**/coverage/**",
    "**/.cache/**"
  ],
  "environments": {
    "test": { "servers": [...] },
    "prod": { "servers": [...] }
  },
  "serverSource": {
    "path": ".csync/servers.json",
    "mode": "embedded"
  }
}
```

### Ignore rules (merge order)

| Priority     | Source                           | Examples                                                                |
| :----------- | :------------------------------- | :---------------------------------------------------------------------- |
| 1. Built-in  | Hardcoded defaults               | `node_modules`, `.git`, `.csync`, IDE dirs, `dist`, `build`, `coverage` |
| 2. Config    | `.csync/config.json` -> `ignore` | Custom project patterns                                                 |
| 3. Gitignore | Project `.gitignore`             | Your existing ignore rules                                              |

### .csync/state.json

```json
{
  "test": {
    "test-01": {
      "src/index.js": "d41d8cd98f00b204e9800998ecf8427e"
    }
  },
  "prod": {
    "prod-01": {
      "src/index.js": "d41d8cd98f00b204e9800998ecf8427e"
    },
    "prod-02": {
      "src/index.js": "d41d8cd98f00b204e9800998ecf8427e"
    }
  }
}
```

> Never edit this file by hand — it's updated automatically after each successful push.

<br>

## Security

### Credential storage

Server credentials live in `.csync/config.json` and `.csync/servers.json`. CherrySync automatically ensures `.csync/` is in your `.gitignore`.

**Best practices:**

- Use SSH key authentication instead of passwords
- Use a dedicated deployment key, not your personal key
- Verify `.csync/` appears in `.gitignore` after `csync init`
- Never commit `.csync/` to version control

### Safety guarantees

| Concern                  | Protection                                                                 |
| :----------------------- | :------------------------------------------------------------------------- |
| Accidental commit        | `.csync/` auto-gitignored during `init`                                    |
| Failed transfers         | State only updated on success — failed files re-appear in `status`         |
| Accidental overwrites    | `--backup` saves remote files before overwriting; `rollback` restores them |
| Binary files             | Detected and handled safely; no binary content dumped to terminal          |
| Overwrite detection      | `csync diff` lets you inspect remote content before pushing                |
| Temp files               | Downloaded files for diff are cleaned up immediately after display         |
| Post-deploy verification | `--health-url` confirms service is healthy after push                      |

<br>

## Project Structure

```
CherrySync/
├── assets/
│   └── logo.svg              # Project logo
├── bin/
│   ├── cherrysync.js         # Entry point
│   └── csync.js              # Short alias entry point
├── scripts/
│   └── check.js              # Structure validation
├── src/
│   ├── cli.js                # Commander CLI wiring
│   ├── commands/
│   │   ├── init.js           # csync init
│   │   ├── status.js         # csync status
│   │   ├── diff.js           # csync diff
│   │   ├── push.js           # csync push (backup, health-check, post-command, parallel)
│   │   ├── dry-run.js        # csync dry-run
│   │   ├── drift.js          # csync drift
│   │   ├── rollback.js       # csync rollback
│   │   ├── consistency.js    # csync consistency
│   │   ├── watch.js          # csync watch
│   │   ├── servers.js        # csync servers (parent)
│   │   ├── servers-import.js # csync servers import
│   │   └── servers-show.js   # csync servers show
│   └── lib/
│       ├── backup.js         # Backup creation, listing, restoration
│       ├── command-wrap.js   # Error handling wrapper
│       ├── config.js         # Config loading & normalization
│       ├── consistency.js    # Multi-server consistency checker
│       ├── constants.js      # Defaults and templates
│       ├── context.js        # Unified project context
│       ├── diff-preview.js   # Remote-vs-local diff
│       ├── drift.js          # Cross-environment drift detection
│       ├── environments.js   # Environment normalization
│       ├── errors.js         # Error formatting
│       ├── files.js          # File utilities
│       ├── gitignore.js      # .gitignore management
│       ├── hash.js           # MD5 file hashing
│       ├── health-check.js   # HTTP health check
│       ├── ignore.js         # Ignore pattern merging
│       ├── logger.js         # sync.log writer
│       ├── output.js         # Terminal output formatting
│       ├── remote-client.js  # SFTP client wrapper
│       ├── scanner.js        # Change detection engine
│       ├── server-selection.js  # Interactive server prompts
│       ├── server-source.js  # Server file management
│       ├── ssh-exec.js       # SSH remote command execution
│       ├── state.js          # State persistence
│       ├── state-model.js    # State data model
│       ├── ui.js             # Terminal UI helpers
│       └── workspace.js      # Workspace path utils
├── package.json
├── package-lock.json
├── .gitignore
├── LICENSE
└── README.md
```

<br>

## Contributing

Contributions are welcome! Open an issue to discuss proposed changes before submitting a pull request.

### Dev setup

```bash
git clone <repo-url>
cd CherrySync
npm install
npm run lint        # verify project structure
node bin/csync.js --help
```

- **Runtime**: Node.js >= 18, pure ESM, no build step
- **Style**: Minimal, no unnecessary abstractions

<br>

## License

MIT (c) 2026 CherrySync — see [LICENSE](LICENSE) for full text.

<br>

<p align="center">
  <sub>Made for developers who ship.</sub>
</p>
