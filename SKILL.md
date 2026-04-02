---
name: ccb-sandbox
description: |
  Sandboxed command execution / 沙箱命令执行
  Uses Linux namespaces (unshare) for isolation.
  用途：在 Linux 命名空间中隔离执行危险命令，防止系统被破坏。
  触发词 / Triggers: "run in sandbox", "isolated execution", "安全执行", "沙箱运行"
---

# Sandbox Runner / 沙箱运行器

Isolated command execution using Linux namespaces (unshare).
使用 Linux 命名空间（unshare）实现进程隔离。

## 沙箱模式 / Sandbox Modes

| 模式 Mode | 文件系统 | 网络 | 说明 Description |
|-----------|----------|------|-----------------|
| `readonly` | 只读 Read-only | 允许 Allowed | 安全浏览+读取 / Safe for network + read |
| `net-only` | 正常 Normal | 允许 Allowed | 正常读写+网络 / Normal FS, network allowed |
| `isolated` | 只读 Read-only | 禁用 Blocked | 完全隔离 / Maximum isolation |

## 安全检查 / Safety Checks

自动拦截以下危险命令：
Automatically blocks dangerous commands:

- `rm -rf /` → 阻止：会删除系统 / ERROR: Would delete system
- `dd if=/dev/zero of=/dev/sda` → 阻止：会破坏磁盘 / ERROR: Would destroy disk
- `mkfs.*` → 阻止：会格式化文件系统 / ERROR: Would destroy filesystem
- `fdisk/parted/cfdisk` → 阻止：会修改分区表 / ERROR: Would modify partitions
- Fork bomb patterns → 阻止 / ERROR: Fork bomb detected

## 使用方法 / Usage

```bash
# 只读模式（安全浏览）/ Read-only sandbox
node sandbox.ts --mode=readonly "curl https://example.com"

# 仅网络模式（npm install）/ Network only
node sandbox.ts --mode=net-only "npm install express"

# 完全隔离（无网络+只读文件系统）/ Fully isolated
node sandbox.ts --mode=isolated "find / -name '*.txt'"

# 预览模式（不执行，只显示）/ Dry run
node sandbox.ts --dry-run "rm -rf /tmp/test"
```

## 内部实现 / Internals

使用 `unshare` 实现：
Uses `unshare` with:

- `--mount=readonly` - 文件系统隔离 / Filesystem isolation
- `--net` - 网络命名空间 / Network namespace
- `--pid` - 进程隔离 / Process isolation
- `--ipc` - IPC 隔离 / IPC isolation

## 环境要求 / Requirements

- Linux 系统（需支持命名空间）/ Linux with namespace support
- `unshare` 命令可用 / `unshare` command available
- Root 权限或适当 capabilities / Root or appropriate capabilities
