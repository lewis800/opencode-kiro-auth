import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readActiveProfileArnFromKiroDesktop } from '../plugin/sync/kiro-cli-profile.js'

describe('readActiveProfileArnFromKiroDesktop', () => {
  let usersRoot: string

  beforeEach(() => {
    usersRoot = join(mkdtempSync(join(tmpdir(), 'kiro-desktop-profile-')), 'Users')
    mkdirSync(usersRoot, { recursive: true })
  })

  afterEach(() => {
    rmSync(join(usersRoot, '..'), { recursive: true, force: true })
  })

  test('reads the active profile ARN from Kiro desktop global storage', () => {
    const profileDir = join(
      usersRoot,
      'Alice',
      'AppData',
      'Roaming',
      'Kiro',
      'User',
      'globalStorage',
      'kiro.kiroagent'
    )
    mkdirSync(profileDir, { recursive: true })
    writeFileSync(
      join(profileDir, 'profile.json'),
      JSON.stringify({
        arn: 'arn:aws:codewhisperer:eu-central-1:123456789012:profile/QN94Y4CPNAA9',
        name: 'KiroProfile-eu-central-1'
      })
    )

    expect(readActiveProfileArnFromKiroDesktop(usersRoot)).toBe(
      'arn:aws:codewhisperer:eu-central-1:123456789012:profile/QN94Y4CPNAA9'
    )
  })

  test('returns undefined when multiple desktop profiles resolve to different ARNs', () => {
    const aliceProfileDir = join(
      usersRoot,
      'Alice',
      'AppData',
      'Roaming',
      'Kiro',
      'User',
      'globalStorage',
      'kiro.kiroagent'
    )
    mkdirSync(aliceProfileDir, { recursive: true })
    writeFileSync(
      join(aliceProfileDir, 'profile.json'),
      JSON.stringify({
        arn: 'arn:aws:codewhisperer:eu-central-1:123456789012:profile/ALICE'
      })
    )

    const bobProfileDir = join(
      usersRoot,
      'Bob',
      'AppData',
      'Roaming',
      'Kiro',
      'User',
      'globalStorage',
      'kiro.kiroagent'
    )
    mkdirSync(bobProfileDir, { recursive: true })
    writeFileSync(
      join(bobProfileDir, 'profile.json'),
      JSON.stringify({
        arn: 'arn:aws:codewhisperer:eu-central-1:123456789012:profile/BOB'
      })
    )

    expect(readActiveProfileArnFromKiroDesktop(usersRoot)).toBeUndefined()
  })

  test('returns undefined when no Kiro desktop profile file exists', () => {
    expect(readActiveProfileArnFromKiroDesktop(usersRoot)).toBeUndefined()
  })
})
