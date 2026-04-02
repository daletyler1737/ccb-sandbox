---
name: ccb-sandbox
description: |
  Sandboxed command execution. Inspired by Claude Code Best's SandboxManager.
  Runs potentially dangerous commands in isolated Linux namespaces (namespace sandbox).
  Use when: executing untrusted code, running destructive commands for preview,
  or testing commands with restricted filesystem access.
---

# Sandbox Runner

Isolated command execution using Linux namespaces (unshare).

## Requirements

- Linux with namespace support
- `unshare` command available
- Root or appropriate capabilities

## Usage

```bash
# Run command in read-only sandbox (can't write files)
node sandbox.ts --mode=readonly "curl https://example.com"

# Run command with network only (no filesystem write)
node sandbox.ts --mode=net-only "npm install"

# Run command fully isolated (no network, read-only FS)
node sandbox.ts --mode=isolated "find / -name '*.txt'"

# Dry run (show what would be executed)
node sandbox.ts --dry-run "rm -rf /"
```

## Sandbox Modes

| Mode | Filesystem | Network | Description |
|------|------------|---------|-------------|
| `readonly` | Read-only | Allowed | Safe for network + read |
| `net-only` | Normal | Allowed | Normal FS, network allowed |
| `isolated` | Read-only | Blocked | Maximum isolation |

## Safety Checks

Automatically blocks:
- `rm -rf /` → ERROR: Would delete system
- `dd if=/dev/zero of=/dev/sda` → ERROR: Would destroy disk
- Commands accessing `/proc` dangerously
- `mkfs`, `fdisk`, `parted` → ERROR: Would destroy filesystem

## Internals

Uses `unshare` with:
- `--mount=readonly` for filesystem isolation
- `--net` for network namespace
- `--pid` for process isolation
- `--ipc` for IPC isolation
