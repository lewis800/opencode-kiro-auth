import { Database } from 'bun:sqlite'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { getCliDbPath, safeJsonParse } from './kiro-cli-parser'

function extractProfileArn(value: unknown): string | undefined {
  const arn = (value as any)?.arn || (value as any)?.profileArn || (value as any)?.profile_arn
  return typeof arn === 'string' && arn.trim() ? arn.trim() : undefined
}

function getWindowsDesktopProfilePath(): string {
  return join(
    process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'),
    'Kiro',
    'User',
    'globalStorage',
    'kiro.kiroagent',
    'profile.json'
  )
}

function getPosixDesktopProfilePath(): string {
  if (process.platform === 'darwin') {
    return join(
      homedir(),
      'Library',
      'Application Support',
      'Kiro',
      'User',
      'globalStorage',
      'kiro.kiroagent',
      'profile.json'
    )
  }

  return join(
    homedir(),
    '.config',
    'Kiro',
    'User',
    'globalStorage',
    'kiro.kiroagent',
    'profile.json'
  )
}

function getMountedWindowsUsersRoots(): string[] {
  const mountsRoot = '/mnt'
  if (!existsSync(mountsRoot)) return []

  return readdirSync(mountsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^[a-z]$/i.test(entry.name))
    .map((entry) => join(mountsRoot, entry.name, 'Users'))
    .filter((candidate) => existsSync(candidate))
}

function readProfileArn(candidate: string): string | undefined {
  if (!existsSync(candidate)) return undefined

  try {
    const parsed = safeJsonParse(readFileSync(candidate, 'utf-8'))
    return extractProfileArn(parsed)
  } catch {
    return undefined
  }
}

export function readActiveProfileArnFromKiroDesktop(usersRoot?: string): string | undefined {
  const directCandidate =
    process.platform === 'win32' ? getWindowsDesktopProfilePath() : getPosixDesktopProfilePath()
  const directArn = readProfileArn(directCandidate)
  if (directArn) return directArn

  const usersRoots = usersRoot ? [usersRoot] : getMountedWindowsUsersRoots()
  const discoveredArns = new Set<string>()

  for (const root of usersRoots) {
    if (!existsSync(root)) continue
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const arn = readProfileArn(
        join(
          root,
          entry.name,
          'AppData',
          'Roaming',
          'Kiro',
          'User',
          'globalStorage',
          'kiro.kiroagent',
          'profile.json'
        )
      )
      if (arn) discoveredArns.add(arn)
    }
  }

  return discoveredArns.size === 1 ? [...discoveredArns][0] : undefined
}

export function readActiveProfileArnFromKiroCli(): string | undefined {
  const dbPath = getCliDbPath()
  if (!existsSync(dbPath)) return readActiveProfileArnFromKiroDesktop()

  let cliDb: Database | undefined
  try {
    cliDb = new Database(dbPath, { readonly: true })
    cliDb.run('PRAGMA busy_timeout = 5000')

    const row = cliDb
      .prepare('SELECT value FROM state WHERE key = ?')
      .get('api.codewhisperer.profile') as any
    const parsed = safeJsonParse(row?.value)
    const arn = extractProfileArn(parsed)
    return arn || readActiveProfileArnFromKiroDesktop()
  } catch {
    return readActiveProfileArnFromKiroDesktop()
  } finally {
    try {
      cliDb?.close()
    } catch {
      // ignore
    }
  }
}
