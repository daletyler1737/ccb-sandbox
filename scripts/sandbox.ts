/**
 * Sandbox Runner - Isolated command execution
 * Inspired by Claude Code Best's SandboxManager
 */

import { spawn } from 'child_process'
import { execSync } from 'child_process'

type SandboxMode = 'readonly' | 'net-only' | 'isolated'

const DANGEROUS_PATTERNS = [
  { pattern: /rm\s+(-rf\s+\/|-\/\s*\$|rf\s+\/|rf\s+"\//), msg: 'Would delete system files' },
  { pattern: /dd\s+.*of=\/(dev\/|sda|sdb|sdc|nvme), msg: 'Would write to disk device' },
  { pattern: /mkfs/, msg: 'Would create filesystem' },
  { pattern: /fdisk|parted|cfdisk/, msg: 'Would modify partitions' },
  { pattern: /:\(\)\{:\|:&\};:/, msg: 'Fork bomb detected' },
  { pattern: /shred\s+-u.*\/dev/, msg: 'Would shred device' },
]

const READONLY_WHITELIST = ['/proc/1/', '/proc/self/', '/proc/thread-self/']

function checkDangerous(command: string): string | null {
  for (const { pattern, msg } of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return msg
    }
  }
  return null
}

function buildUnshareArgs(mode: SandboxMode): string[] {
  switch (mode) {
    case 'readonly':
      return ['--mount=readonly', '--pid', '--ipc', '--uts', '--net']
    case 'net-only':
      return ['--pid', '--ipc', '--uts']
    case 'isolated':
      return ['--mount=readonly', '--pid', '--ipc', '--uts', '--net', '--cgroup']
    default:
      return ['--pid', '--ipc']
  }
}

interface SandboxResult {
  stdout: string
  stderr: string
  exitCode: number
  mode: SandboxMode
  command: string
  dangerous: string | null
}

export function runSandboxed(command: string, mode: SandboxMode = 'readonly'): SandboxResult {
  const dangerous = checkDangerous(command)

  if (dangerous) {
    return {
      stdout: '',
      stderr: `ERROR: Dangerous command blocked - ${dangerous}`,
      exitCode: 1,
      mode,
      command,
      dangerous
    }
  }

  const args = buildUnshareArgs(mode)

  try {
    const fullCmd = `unshare ${args.join(' ')} --map-root-user -- sh -c '${command.replace(/'/g, "'\\''")}'`

    let stdout = ''
    let stderr = ''
    let exitCode = 0

    try {
      stdout = execSync(fullCmd, { timeout: 30000, encoding: 'utf-8', shell: '/bin/sh' })
    } catch (err: any) {
      stderr = err.stderr?.toString() || err.message
      exitCode = err.status || 1
    }

    return { stdout, stderr, exitCode, mode, command, dangerous: null }
  } catch (err: any) {
    return {
      stdout: '',
      stderr: err.message,
      exitCode: 1,
      mode,
      command,
      dangerous: null
    }
  }
}

// CLI
if (import.meta.url.endsWith(process.argv[1]?.replace(/^file:\/\//, '') || '')) {
  const args = process.argv.slice(2)
  const modeArg = args.find(a => a.startsWith('--mode='))
  const dryRun = args.includes('--dry-run')
  const command = args.filter(a => !a.startsWith('--')).join(' ')

  const mode = (modeArg?.split('=')[1] || 'readonly') as SandboxMode

  if (!command) {
    console.log('Usage: node sandbox.ts [--mode=readonly|net-only|isolated] [--dry-run] <command>')
    process.exit(1)
  }

  if (dryRun) {
    const dangerous = checkDangerous(command)
    if (dangerous) {
      console.log(`DRY RUN: Would block - ${dangerous}`)
    } else {
      console.log(`DRY RUN: Would execute in ${mode} mode:`)
      console.log(`  unshare ${buildUnshareArgs(mode).join(' ')} -- sh -c '${command}'`)
    }
    process.exit(0)
  }

  const result = runSandboxed(command, mode)

  if (result.dangerous) {
    console.error(`Blocked: ${result.dangerous}`)
    process.exit(1)
  }

  if (result.stdout) console.log(result.stdout)
  if (result.stderr) console.error(result.stderr)
  process.exit(result.exitCode)
}
