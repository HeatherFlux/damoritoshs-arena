import { describe, it, expect } from 'vitest'
import {
  hexToHSL,
  hslToHex,
  getTetradicColors,
  hexToRgb,
  generateThemePalette,
} from '../utils/colors'

describe('hexToHSL', () => {
  it('converts red #FF0000', () => {
    const hsl = hexToHSL('#FF0000')
    expect(hsl.h).toBe(0)
    expect(hsl.s).toBe(100)
    expect(hsl.l).toBe(50)
  })

  it('converts white #FFFFFF', () => {
    const hsl = hexToHSL('#FFFFFF')
    expect(hsl.s).toBe(0)
    expect(hsl.l).toBe(100)
  })

  it('converts black #000000', () => {
    const hsl = hexToHSL('#000000')
    expect(hsl.s).toBe(0)
    expect(hsl.l).toBe(0)
  })

  it('handles hex without #', () => {
    const hsl = hexToHSL('FF0000')
    expect(hsl.h).toBe(0)
    expect(hsl.s).toBe(100)
  })
})

describe('hslToHex', () => {
  it('converts pure red', () => {
    expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe('#ff0000')
  })

  it('converts white', () => {
    expect(hslToHex({ h: 0, s: 0, l: 100 })).toBe('#ffffff')
  })

  it('converts black', () => {
    expect(hslToHex({ h: 0, s: 0, l: 0 })).toBe('#000000')
  })
})

describe('hexToHSL / hslToHex round-trip', () => {
  it.each(['#ff0000', '#00ff00', '#0000ff', '#808080'])('round-trips %s', (hex) => {
    const hsl = hexToHSL(hex)
    const result = hslToHex(hsl)
    expect(result.toLowerCase()).toBe(hex.toLowerCase())
  })
})

describe('getTetradicColors', () => {
  it('returns 4 colors', () => {
    const palette = getTetradicColors('#1ECBE1')
    expect(palette.primary).toBeTruthy()
    expect(palette.secondary).toBeTruthy()
    expect(palette.tertiary).toBeTruthy()
    expect(palette.quaternary).toBeTruthy()
  })

  it('secondary is ~90 degrees from primary', () => {
    const hex = '#1ECBE1'
    const primaryHSL = hexToHSL(hex)
    const palette = getTetradicColors(hex)
    const secondaryHSL = hexToHSL(palette.secondary)
    const hDiff = (secondaryHSL.h - primaryHSL.h + 360) % 360
    expect(hDiff).toBe(90)
  })

  it('returns grayscale variants for low saturation input', () => {
    const palette = getTetradicColors('#18181a')
    // For low saturation, all colors should have low saturation
    const primaryHSL = hexToHSL(palette.primary)
    expect(primaryHSL.s).toBeLessThan(15)
  })
})

describe('hexToRgb', () => {
  it('converts #FF0000 to {r:255, g:0, b:0}', () => {
    expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 })
  })

  it('handles lowercase hex', () => {
    expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 })
  })

  it('handles without #', () => {
    expect(hexToRgb('0000FF')).toEqual({ r: 0, g: 0, b: 255 })
  })
})

describe('generateThemePalette', () => {
  it('returns all expected keys', () => {
    const palette = generateThemePalette('#1ECBE1')
    expect(palette).toHaveProperty('primary')
    expect(palette).toHaveProperty('primaryDim')
    expect(palette).toHaveProperty('primaryBright')
    expect(palette).toHaveProperty('primarySubtle')
    expect(palette).toHaveProperty('secondary')
    expect(palette).toHaveProperty('secondarySubtle')
    expect(palette).toHaveProperty('tertiary')
    expect(palette).toHaveProperty('quaternary')
  })

  it('subtle variants use rgba', () => {
    const palette = generateThemePalette('#1ECBE1')
    expect(palette.primarySubtle).toMatch(/^rgba\(/)
    expect(palette.secondarySubtle).toMatch(/^rgba\(/)
  })
})
