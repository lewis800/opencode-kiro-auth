import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { withDatabaseLock } from '../plugin/storage/locked-operations.js'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('withDatabaseLock', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'kiro-db-lock-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('keeps an active lock exclusive beyond the stale window', async () => {
    const dbPath = join(tempDir, 'accounts.sqlite')
    let firstLockHeld = true
    let secondEnteredWhileFirstHeld = false

    const first = withDatabaseLock(dbPath, async () => {
      await sleep(12000)
      firstLockHeld = false
    })

    await sleep(10500)

    const second = withDatabaseLock(dbPath, async () => {
      secondEnteredWhileFirstHeld = firstLockHeld
    })

    await Promise.all([first, second])

    expect(secondEnteredWhileFirstHeld).toBe(false)
  }, 20000)
})
