import { describe, it, expect } from 'vitest'
import { generateThemeColors, themeDefinitions } from '../stores/settingsStore'
import { contrastRatio, MIN_TEXT_CONTRAST } from '../utils/colors'

const SURFACES = ['--color-bg', '--color-bg-surface', '--color-bg-elevated', '--color-bg-hover']

// Colors that are used as text on the plain surfaces
const TEXT_COLORS = [
  '--color-text', '--color-text-dim', '--color-text-muted',
  '--color-primary', '--color-primary-dim', '--color-primary-bright',
  '--color-accent', '--color-accent-dim', '--color-accent-bright',
  '--color-secondary', '--color-secondary-dim', '--color-secondary-bright',
  '--color-tertiary', '--color-tertiary-dim', '--color-tertiary-bright',
  '--color-quaternary', '--color-quaternary-dim', '--color-quaternary-bright',
  '--color-hazard', '--color-hazard-dim', '--color-info',
  '--color-danger', '--color-danger-dim',
  '--color-warning', '--color-warning-dim',
  '--color-success', '--color-success-dim',
  '--color-trivial', '--color-low', '--color-moderate', '--color-severe', '--color-extreme',
  '--color-rollable', '--color-rollable-hover',
  '--color-stat-label',
]

// Filled highlight and the text color that sits on it
const FILLS: Array<[string, string]> = [
  ['--color-accent', '--color-on-accent'],
  ['--color-secondary', '--color-on-secondary'],
  ['--color-hazard', '--color-on-hazard'],
  ['--color-danger', '--color-on-danger'],
  ['--color-warning', '--color-on-warning'],
  ['--color-success', '--color-on-success'],
  ['--color-text-dim', '--color-on-dim'],
  ['--color-text-muted', '--color-on-muted'],
  // Difficulty badges and trait chips share one ink across several fills
  ['--color-trivial', '--color-on-fill'],
  ['--color-low', '--color-on-fill'],
  ['--color-moderate', '--color-on-fill'],
  ['--color-severe', '--color-on-fill'],
  ['--color-extreme', '--color-on-fill'],
  ['--color-info', '--color-on-fill'],
  ['--color-primary', '--color-on-secondary'],
  ['--color-tertiary', '--color-on-secondary'],
  ['--color-quaternary', '--color-on-secondary'],
]

// A 12% tint of a color laid over a surface, as the -subtle backgrounds do
function tint(hex: string, surface: string, alpha = 0.12): string {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16)
  return '#' + [0, 1, 2]
    .map(i => Math.round(ch(hex, i) * alpha + ch(surface, i) * (1 - alpha)).toString(16).padStart(2, '0'))
    .join('')
}

describe('theme contrast', () => {
  for (const [id, def] of Object.entries(themeDefinitions)) {
    const colors = generateThemeColors(def)

    it(`${id}: every text color reads on every surface`, () => {
      const failures: string[] = []
      for (const text of TEXT_COLORS) {
        for (const surface of SURFACES) {
          const ratio = contrastRatio(colors[text], colors[surface])
          if (ratio < MIN_TEXT_CONTRAST) failures.push(`${text} ${colors[text]} on ${surface} ${colors[surface]}: ${ratio.toFixed(2)}`)
        }
      }
      expect(failures).toEqual([])
    })

    it(`${id}: text on filled highlights reads`, () => {
      const failures: string[] = []
      for (const [fill, ink] of FILLS) {
        const ratio = contrastRatio(colors[ink], colors[fill])
        if (ratio < MIN_TEXT_CONTRAST) failures.push(`${ink} ${colors[ink]} on ${fill} ${colors[fill]}: ${ratio.toFixed(2)}`)
      }
      expect(failures).toEqual([])
    })

    it(`${id}: colored text reads on its own subtle tint`, () => {
      const failures: string[] = []
      for (const name of ['accent', 'secondary', 'tertiary', 'quaternary', 'danger', 'warning', 'success', 'hazard', 'rollable']) {
        const color = colors[`--color-${name}`]
        for (const surface of SURFACES) {
        const background = tint(color, colors[surface])
        const ratio = contrastRatio(color, background)
        if (ratio < MIN_TEXT_CONTRAST) failures.push(`${name} ${color} on tint ${background}: ${ratio.toFixed(2)}`)
        }
      }
      expect(failures).toEqual([])
    })
  }
})
