/**
 * Color utilities for generating tetradic color palettes
 * Based on color wheel theory - 4 colors 90° apart
 */

export interface HSL {
  h: number  // 0-360
  s: number  // 0-100
  l: number  // 0-100
}

export interface TetradicPalette {
  primary: string      // Base color
  secondary: string    // +90° (purple if cyan primary)
  tertiary: string     // +180° (coral/red)
  quaternary: string   // +270° (green)
}

export interface ThemePalette extends TetradicPalette {
  primaryDim: string
  primaryBright: string
  primarySubtle: string
  secondaryDim: string
  secondaryBright: string
  secondarySubtle: string
  tertiaryDim: string
  tertiaryBright: string
  tertiarySubtle: string
  quaternaryDim: string
  quaternaryBright: string
  quaternarySubtle: string
}

/**
 * Convert hex color to HSL
 */
export function hexToHSL(hex: string): HSL {
  // Remove # if present
  hex = hex.replace(/^#/, '')

  // Parse RGB
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

/**
 * Convert HSL to hex color
 */
export function hslToHex(hsl: HSL): string {
  const h = hsl.h / 360
  const s = hsl.s / 100
  const l = hsl.l / 100

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Generate tetradic colors from a base color
 * Returns 4 colors that are 90° apart on the color wheel
 * Quaternary is slightly dimmed so success green isn't too vivid
 * For very low saturation colors (like The Gap), keeps all colors grayscale
 */
export function getTetradicColors(baseHex: string): TetradicPalette {
  const hsl = hexToHSL(baseHex)

  // For very low saturation (< 10%), keep everything grayscale
  // Use wider lightness spread for better contrast/readability
  if (hsl.s < 10) {
    return {
      primary: hslToHex({ ...hsl, l: Math.min(100, hsl.l + 25) }),      // Lighter for visibility
      secondary: hslToHex({ ...hsl, l: Math.min(100, hsl.l + 35) }),    // Even lighter
      tertiary: hslToHex({ ...hsl, l: Math.min(100, hsl.l + 45) }),     // Brightest for contrast
      quaternary: hslToHex({ ...hsl, l: Math.min(100, hsl.l + 30) }),   // Mid-bright
    }
  }

  // Quaternary (success/green) gets dimmed so it's not so vivid
  const quatSat = Math.max(0, hsl.s - 5)
  const quatLight = Math.max(0, hsl.l - 0)

  return {
    primary: baseHex,
    secondary: hslToHex({ ...hsl, h: (hsl.h + 90) % 360 }),
    tertiary: hslToHex({ ...hsl, h: (hsl.h + 180) % 360 }),
    quaternary: hslToHex({ h: (hsl.h + 270) % 360, s: quatSat, l: quatLight }),
  }
}

/**
 * Create dim variant (lower lightness)
 */
function dimColor(hex: string): string {
  const hsl = hexToHSL(hex)
  return hslToHex({ ...hsl, l: Math.max(0, hsl.l - 1) })
}

/**
 * Create bright variant (higher lightness)
 */
function brightColor(hex: string): string {
  const hsl = hexToHSL(hex)
  return hslToHex({ ...hsl, l: Math.min(100, hsl.l + 15) })
}

/**
 * Create subtle RGBA variant for backgrounds
 */
function subtleColor(hex: string, alpha: number = 0.12): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Generate a complete theme palette from a single base color
 */
export function generateThemePalette(baseHex: string): ThemePalette {
  const tetrad = getTetradicColors(baseHex)

  return {
    ...tetrad,
    primaryDim: dimColor(tetrad.primary),
    primaryBright: brightColor(tetrad.primary),
    primarySubtle: subtleColor(tetrad.primary),
    secondaryDim: dimColor(tetrad.secondary),
    secondaryBright: brightColor(tetrad.secondary),
    secondarySubtle: subtleColor(tetrad.secondary),
    tertiaryDim: dimColor(tetrad.tertiary),
    tertiaryBright: brightColor(tetrad.tertiary),
    tertiarySubtle: subtleColor(tetrad.tertiary),
    quaternaryDim: dimColor(tetrad.quaternary),
    quaternaryBright: brightColor(tetrad.quaternary),
    quaternarySubtle: subtleColor(tetrad.quaternary),
  }
}

/**
 * Apply a theme palette to CSS custom properties
 */
export function applyThemePalette(palette: ThemePalette): void {
  const root = document.documentElement

  root.style.setProperty('--color-primary', palette.primary)
  root.style.setProperty('--color-primary-dim', palette.primaryDim)
  root.style.setProperty('--color-primary-bright', palette.primaryBright)
  root.style.setProperty('--color-primary-subtle', palette.primarySubtle)

  root.style.setProperty('--color-secondary', palette.secondary)
  root.style.setProperty('--color-secondary-dim', palette.secondaryDim)
  root.style.setProperty('--color-secondary-bright', palette.secondaryBright)
  root.style.setProperty('--color-secondary-subtle', palette.secondarySubtle)

  root.style.setProperty('--color-tertiary', palette.tertiary)
  root.style.setProperty('--color-tertiary-dim', palette.tertiaryDim)
  root.style.setProperty('--color-tertiary-bright', palette.tertiaryBright)
  root.style.setProperty('--color-tertiary-subtle', palette.tertiarySubtle)

  root.style.setProperty('--color-quaternary', palette.quaternary)
  root.style.setProperty('--color-quaternary-dim', palette.quaternaryDim)
  root.style.setProperty('--color-quaternary-bright', palette.quaternaryBright)
  root.style.setProperty('--color-quaternary-subtle', palette.quaternarySubtle)
}

/**
 * Predefined theme base colors
 */
export const THEME_PRESETS = {
  // Current default - Cyan
  cyber: '#1ECBE1',

  // Alternatives
  neon: '#E11ECB',       // Magenta/Pink
  matrix: '#1EE14A',     // Green
  solar: '#E1CB1E',      // Yellow/Gold
  ember: '#E14A1E',      // Orange/Red
  void: '#961EE1',       // Purple
  ice: '#1E96E1',        // Blue
  rust: '#E1961E',       // Amber
} as const

export type ThemePreset = keyof typeof THEME_PRESETS

/**
 * Convert hex color to RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  hex = hex.replace(/^#/, '')
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16)
  }
}
