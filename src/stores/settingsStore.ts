import { reactive, watch } from 'vue'
import { generateThemePalette, hexToHSL, hslToHex } from '../utils/colors'

const STORAGE_KEY = 'sf2e-settings'

export type ThemeId = 'cyber-cyan' | 'terminal-green' | 'warning-amber' | 'danger-red' | 'glam-pink' | 'neon-magenta' | 'light-rose' | 'light-violet'

export type BackgroundStyle = 'none' | 'gradient-wave' | 'dot-matrix' | 'particle-field' | 'cyber-grid' | 'floating-blobs' | 'random-dots'

export interface Settings {
  autoRollDamage: boolean
  theme: ThemeId
  backgroundStyle: BackgroundStyle
  // Discord Integration
  discordWebhookEnabled: boolean
  discordWebhookUrl: string
}

// Theme definition - just base color and mode, tetradic palette auto-generated
interface ThemeDefinition {
  name: string
  description: string
  baseColor: string  // Single color - tetrad calculated from this
  mode: 'dark' | 'light'
}

// Background style definitions
export const backgroundStyles: Record<BackgroundStyle, { name: string; description: string }> = {
  'none': {
    name: 'Static',
    description: 'No animation'
  },
  'gradient-wave': {
    name: 'Gradient Wave',
    description: 'Flowing color gradient'
  },
  'dot-matrix': {
    name: 'Matrix Rain',
    description: 'Falling 1s and 0s'
  },
  'particle-field': {
    name: 'Particle Field',
    description: 'Connected floating particles'
  },
  'cyber-grid': {
    name: 'Cyber Grid',
    description: 'Animated wireframe mesh'
  },
  'floating-blobs': {
    name: 'Floating Blobs',
    description: 'Glassmorphism style'
  },
  'random-dots': {
    name: 'Random Dots',
    description: 'Flickering dot field'
  }
}

const defaultSettings: Settings = {
  autoRollDamage: true,
  theme: 'neon-magenta',
  backgroundStyle: 'particle-field',
  discordWebhookEnabled: false,
  discordWebhookUrl: '',
}

// Theme definitions - simplified to just base color + mode
// Tetradic palette (4 colors 90° apart) auto-generated from base
const themeDefinitions: Record<ThemeId, ThemeDefinition> = {
  'cyber-cyan': {
    name: 'Cyber Cyan',
    description: 'Electric blue sci-fi',
    baseColor: '#1ECBE1',  // Cyan → Purple → Coral → Green
    mode: 'dark'
  },
  'terminal-green': {
    name: 'Terminal Green',
    description: 'Classic hacker terminal',
    baseColor: '#1EE14A',  // Green → Cyan → Magenta → Orange
    mode: 'dark'
  },
  'warning-amber': {
    name: 'Warning Amber',
    description: 'Caution yellow alert',
    baseColor: '#E1CB1E',  // Gold → Lime → Purple → Red
    mode: 'dark'
  },
  'danger-red': {
    name: 'Danger Red',
    description: 'Red alert mode',
    baseColor: '#E11E3C',  // Red → Orange → Cyan → Green
    mode: 'dark'
  },
  'glam-pink': {
    name: 'Glam Pink',
    description: 'Fabulous & fierce',
    baseColor: '#E11ECB',  // Magenta → Red → Green → Cyan
    mode: 'dark'
  },
  'neon-magenta': {
    name: 'Neon Purple',
    description: 'Vibrant synthwave',
    baseColor: '#8B1EE1',  // Purple → Blue → Yellow → Orange
    mode: 'dark'
  },
  'light-rose': {
    name: 'Light Rose',
    description: 'Soft light with rose',
    baseColor: '#e11d48',  // Rose → Orange → Teal → Lime
    mode: 'light'
  },
  'light-violet': {
    name: 'Light Violet',
    description: 'Soft light with purple',
    baseColor: '#7c3aed',  // Violet → Blue → Yellow → Orange
    mode: 'light'
  }
}

// Export themes for UI (computed from definitions)
export const themes: Record<ThemeId, { name: string; accent: string; description: string }> =
  Object.fromEntries(
    Object.entries(themeDefinitions).map(([id, def]) => [
      id,
      { name: def.name, accent: def.baseColor, description: def.description }
    ])
  ) as Record<ThemeId, { name: string; accent: string; description: string }>

function loadFromStorage(): Partial<Settings> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load settings from storage:', e)
  }
  return {}
}

function saveToStorage(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}

// Helper: Extract RGB from hex for rgba() strings
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  }
}

// Helper: Create rgba string from hex
function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Helper: Create bright variant (higher lightness)
function brightColor(hex: string): string {
  const hsl = hexToHSL(hex)
  return hslToHex({ ...hsl, l: Math.min(100, hsl.l + 15) })
}

// Generate all CSS variables from a theme definition using tetradic color theory
function generateThemeColors(def: ThemeDefinition): Record<string, string> {
  const palette = generateThemePalette(def.baseColor)

  // Tetradic mapping:
  // Primary (base)     → Accent/Main theme color
  // Secondary (+90°)   → Hazard/Purple tones
  // Tertiary (+180°)   → Danger/Warning (opposite)
  // Quaternary (+270°) → Success/Green tones

  const isDark = def.mode === 'dark'

  // Base colors depend on mode
  const base = isDark ? {
    '--color-bg': '#050608',
    '--color-bg-surface': '#0a0d10',
    '--color-bg-elevated': '#0f1318',
    '--color-bg-hover': '#161c24',
    '--color-border': '#1e2832',
    '--color-border-hover': '#2a3844',
    '--color-text': '#e8eef4',
    '--color-text-dim': '#7a8b9a',
    '--color-text-muted': '#4a5968',
  } : {
    // Light mode - neutral grey shades (not white)
    '--color-bg': '#c8c8c8',           // Base grey
    '--color-bg-surface': '#d4d4d4',   // Slightly lighter
    '--color-bg-elevated': '#e0e0e0',  // Cards/modals
    '--color-bg-hover': '#bababa',     // Hover state (darker)
    '--color-border': '#a0a0a0',       // Medium grey borders
    '--color-border-hover': '#888888', // Darker on hover
    '--color-text': '#1a1a1a',         // Near black text
    '--color-text-dim': '#4a4a4a',     // Dimmed text
    '--color-text-muted': '#6a6a6a',   // Muted text
  }

  // Use same colors for both modes - no special light mode handling
  const primary = palette.primary
  const primaryDim = palette.primaryDim
  const primaryBright = palette.primaryBright
  const secondary = palette.secondary
  const secondaryDim = palette.secondaryDim
  const tertiary = palette.tertiary
  const tertiaryDim = palette.tertiaryDim
  const tertiaryBright = palette.tertiaryBright
  const quaternary = palette.quaternary
  const quaternaryDim = palette.quaternaryDim

  // Glow/subtle intensity
  const glowAlpha = 0.4
  const glowAlpha2 = 0.2
  const subtleAlpha = 0.12

  return {
    ...base,

    // PRIMARY (Accent) - the main theme color
    '--color-primary': primary,
    '--color-primary-dim': primaryDim,
    '--color-primary-bright': primaryBright,
    '--color-primary-subtle': hexToRgba(primary, subtleAlpha),
    '--color-accent': primary,
    '--color-accent-dim': primaryDim,
    '--color-accent-bright': primaryBright,
    '--color-accent-subtle': hexToRgba(primary, subtleAlpha),
    '--color-border-focus': primary,
    '--color-moderate': primary,
    '--color-stat-label': primary,
    '--shadow-glow-accent': `0 0 20px ${hexToRgba(primary, glowAlpha)}, 0 0 40px ${hexToRgba(primary, glowAlpha2)}`,

    // SECONDARY (+90°) - Hazard/Purple tones
    '--color-secondary': secondary,
    '--color-secondary-dim': secondaryDim,
    '--color-secondary-bright': palette.secondaryBright,
    '--color-secondary-subtle': hexToRgba(secondary, subtleAlpha),
    '--color-hazard': secondary,
    '--color-hazard-dim': secondaryDim,
    '--color-hazard-subtle': hexToRgba(secondary, subtleAlpha),

    // TERTIARY (+180°) - Danger/Warning (opposite on wheel)
    '--color-tertiary': tertiary,
    '--color-tertiary-dim': tertiaryDim,
    '--color-tertiary-bright': tertiaryBright,
    '--color-tertiary-subtle': hexToRgba(tertiary, subtleAlpha),
    '--color-danger': tertiary,
    '--color-danger-dim': tertiaryDim,
    '--color-danger-subtle': hexToRgba(tertiary, subtleAlpha),
    '--color-warning': brightColor(tertiary),
    '--color-warning-dim': tertiaryDim,
    '--color-warning-subtle': hexToRgba(tertiary, subtleAlpha),
    '--color-extreme': tertiary,
    '--color-severe': brightColor(tertiary),

    // QUATERNARY (+270°) - Success/Green tones
    '--color-quaternary': quaternary,
    '--color-quaternary-dim': quaternaryDim,
    '--color-quaternary-bright': palette.quaternaryBright,
    '--color-quaternary-subtle': hexToRgba(quaternary, subtleAlpha),
    '--color-success': quaternary,
    '--color-success-dim': quaternaryDim,
    '--color-success-subtle': hexToRgba(quaternary, subtleAlpha),
    '--color-low': quaternary,
    '--color-trivial': '#64748b',

    // Rollable - use tertiary (opposite) for contrast
    '--color-rollable': tertiary,
    '--color-rollable-hover': tertiaryBright,
    '--color-rollable-subtle': hexToRgba(tertiary, subtleAlpha),

    // Scrollbar - use primary
    '--color-scrollbar': hexToRgba(primary, 0.3),
    '--color-scrollbar-hover': hexToRgba(primary, 0.5),
  }
}

function applyTheme(themeId: ThemeId) {
  const def = themeDefinitions[themeId]
  const colors = generateThemeColors(def)
  const root = document.documentElement
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

// Initialize state
const savedSettings = loadFromStorage()
const settings = reactive<Settings>({
  ...defaultSettings,
  ...savedSettings,
})

// Apply theme on load
applyTheme(settings.theme)

// Auto-save on changes and apply theme
watch(
  () => ({ ...settings }),
  (newVal) => {
    saveToStorage(newVal)
    applyTheme(newVal.theme)
  },
  { deep: true }
)

// Discord webhook helper
export interface DiscordMessage {
  content?: string
  embeds?: Array<{
    title?: string
    description?: string
    color?: number
    fields?: Array<{ name: string; value: string; inline?: boolean }>
    footer?: { text: string }
    timestamp?: string
  }>
  username?: string
  avatar_url?: string
}

async function sendToDiscord(message: DiscordMessage): Promise<boolean> {
  if (!settings.discordWebhookEnabled || !settings.discordWebhookUrl) {
    return false
  }

  try {
    const response = await fetch(settings.discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
    return response.ok
  } catch (error) {
    console.error('Failed to send Discord message:', error)
    return false
  }
}

// Export the store
export function useSettingsStore() {
  return {
    settings,
    themes,
    backgroundStyles,

    setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
      settings[key] = value
    },

    setTheme(themeId: ThemeId) {
      settings.theme = themeId
    },

    toggleSetting(key: keyof Settings) {
      if (typeof settings[key] === 'boolean') {
        (settings[key] as boolean) = !settings[key]
      }
    },

    resetSettings() {
      Object.assign(settings, defaultSettings)
    },

    // Discord integration
    sendToDiscord,

    async testDiscordWebhook(): Promise<boolean> {
      if (!settings.discordWebhookUrl) return false

      // Temporarily enable to test
      const wasEnabled = settings.discordWebhookEnabled
      settings.discordWebhookEnabled = true

      const result = await sendToDiscord({
        embeds: [{
          title: '🎮 Damoritosh\'s Arena Connected!',
          description: 'Your Discord webhook is working. Combat logs will appear here.',
          color: 0x00d4ff,
          footer: { text: 'Starfinder 2E Encounter Builder' },
          timestamp: new Date().toISOString(),
        }],
        username: 'Damoritosh\'s Arena',
      })

      settings.discordWebhookEnabled = wasEnabled
      return result
    },
  }
}
