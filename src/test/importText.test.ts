import { describe, it, expect } from 'vitest'
import { toJsonText, IMPORT_ACCEPT } from '../utils/importText'

describe('toJsonText', () => {
  it('passes JSON through unchanged', () => {
    const json = '{"version":1,"parties":[{"name":"Crew"}]}'
    expect(toJsonText(json)).toBe(json)
  })

  it('turns YAML into the JSON the importers expect', () => {
    const yaml = `
version: 1
parties:
  - name: Crew
    players:
      - { name: Peebles, level: 5 }
`
    expect(JSON.parse(toJsonText(yaml))).toEqual({ version: 1, parties: [{ name: 'Crew', players: [{ name: 'Peebles', level: 5 }] }] })
  })

  it('reads a YAML list at the top level', () => {
    expect(JSON.parse(toJsonText('- name: A\n- name: B\n'))).toEqual([{ name: 'A' }, { name: 'B' }])
  })

  it('rejects empty files and malformed YAML', () => {
    expect(() => toJsonText('')).toThrow()
    expect(() => toJsonText('   \n# just a comment\n')).toThrow()
    expect(() => toJsonText('name: [unclosed')).toThrow()
  })

  it('offers YAML and JSON files in the picker', () => {
    expect(IMPORT_ACCEPT).toBe('.yaml,.yml,.json')
  })
})
