import { describe, expect, test } from 'bun:test'
import { AuthHandler } from '../core/auth/auth-handler.js'

describe('AuthHandler prompts', () => {
  test('shows configured IDC defaults in prompt placeholders and messages', () => {
    const handler = new AuthHandler(
      {
        idc_start_url: 'https://cmcmarkets-sso.awsapps.com/start',
        idc_region: 'eu-west-1'
      },
      {} as any
    )
    handler.setAccountManager({})

    const method = handler.getMethods()[0]
    expect(method).toBeDefined()
    expect(method?.type).toBe('oauth')

    const startUrlPrompt = method?.prompts?.[0]
    expect(startUrlPrompt?.type).toBe('text')
    if (!startUrlPrompt || startUrlPrompt.type !== 'text') {
      throw new Error('Expected start URL prompt to be a text prompt')
    }
    expect(startUrlPrompt.placeholder).toBe('https://cmcmarkets-sso.awsapps.com/start')
    expect(startUrlPrompt.message).toContain('configured default')

    const regionPrompt = method?.prompts?.[1]
    expect(regionPrompt?.type).toBe('text')
    if (!regionPrompt || regionPrompt.type !== 'text') {
      throw new Error('Expected region prompt to be a text prompt')
    }
    expect(regionPrompt.placeholder).toBe('eu-west-1')
    expect(regionPrompt.message).toContain('eu-west-1')
  })
})
