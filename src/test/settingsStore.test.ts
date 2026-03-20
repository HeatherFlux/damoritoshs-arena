import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsStore } from '../stores/settingsStore'

describe('settingsStore', () => {
  let store: ReturnType<typeof useSettingsStore>

  beforeEach(() => {
    store = useSettingsStore()
    store.resetSettings()
  })

  it('has default settings', () => {
    expect(store.settings.theme).toBeTruthy()
    expect(typeof store.settings.autoRollDamage).toBe('boolean')
  })

  it('setSetting changes a setting', () => {
    store.setSetting('autoRollDamage', false)
    expect(store.settings.autoRollDamage).toBe(false)
  })

  it('setTheme changes theme', () => {
    store.setTheme('danger-red')
    expect(store.settings.theme).toBe('danger-red')
  })

  it('toggleSetting flips boolean settings', () => {
    const initial = store.settings.autoRollDamage
    store.toggleSetting('autoRollDamage')
    expect(store.settings.autoRollDamage).toBe(!initial)
  })

  it('resetSettings restores defaults', () => {
    store.setSetting('autoRollDamage', false)
    store.setTheme('danger-red')
    store.resetSettings()
    expect(store.settings.autoRollDamage).toBe(true)
    expect(store.settings.theme).toBe('neon-magenta')
  })

  it('persists to localStorage after flush', async () => {
    store.setSetting('autoRollDamage', false)
    // Vue watch is async — wait for next tick
    await new Promise(r => setTimeout(r, 10))
    const saved = localStorage.getItem('sf2e-settings')
    expect(saved).toBeTruthy()
    const parsed = JSON.parse(saved!)
    expect(parsed.autoRollDamage).toBe(false)
  })

  it('themes record has entries', () => {
    expect(Object.keys(store.themes).length).toBeGreaterThan(0)
    expect(store.themes['cyber-cyan']).toBeDefined()
    expect(store.themes['cyber-cyan'].name).toBeTruthy()
  })

  it('backgroundStyles record has entries', () => {
    expect(Object.keys(store.backgroundStyles).length).toBeGreaterThan(0)
    expect(store.backgroundStyles['none']).toBeDefined()
  })
})
