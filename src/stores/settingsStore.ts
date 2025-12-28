import { reactive, watch } from 'vue'

const STORAGE_KEY = 'sf2e-settings'

export type ThemeId = 'cyber-cyan' | 'terminal-green' | 'warning-amber' | 'danger-red' | 'glam-pink' | 'light-rose' | 'light-violet'

export interface Settings {
  autoRollDamage: boolean
  theme: ThemeId
}

const defaultSettings: Settings = {
  autoRollDamage: true,
  theme: 'cyber-cyan',
}

// Theme definitions
export const themes: Record<ThemeId, { name: string; accent: string; description: string }> = {
  'cyber-cyan': {
    name: 'Cyber Cyan',
    accent: '#00d4ff',
    description: 'Electric blue sci-fi'
  },
  'terminal-green': {
    name: 'Terminal Green',
    accent: '#00ff66',
    description: 'Classic hacker terminal'
  },
  'warning-amber': {
    name: 'Warning Amber',
    accent: '#ffaa00',
    description: 'Caution yellow alert'
  },
  'danger-red': {
    name: 'Danger Red',
    accent: '#ff3366',
    description: 'Red alert mode'
  },
  'glam-pink': {
    name: 'Glam Pink',
    accent: '#ff44aa',
    description: 'Fabulous & fierce'
  },
  'light-rose': {
    name: 'Light Rose',
    accent: '#e11d48',
    description: 'Soft light with rose'
  },
  'light-violet': {
    name: 'Light Violet',
    accent: '#7c3aed',
    description: 'Soft light with purple'
  }
}

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

// Dark mode base colors (shared by all dark themes)
const darkModeBase = {
  '--color-bg': '#050608',
  '--color-bg-surface': '#0a0d10',
  '--color-bg-elevated': '#0f1318',
  '--color-bg-hover': '#161c24',
  '--color-border': '#1e2832',
  '--color-border-hover': '#2a3844',
  '--color-text': '#e8eef4',
  '--color-text-dim': '#7a8b9a',
  '--color-text-muted': '#4a5968',
  '--color-rollable': '#ffcc00',
  '--color-rollable-hover': '#ffe566',
  '--color-rollable-subtle': 'rgba(255, 204, 0, 0.12)',
}

// Theme color schemes
const themeColors: Record<ThemeId, Record<string, string>> = {
  'cyber-cyan': {
    ...darkModeBase,
    '--color-accent': '#00d4ff',
    '--color-accent-dim': '#00a8cc',
    '--color-accent-bright': '#5ce1ff',
    '--color-accent-subtle': 'rgba(0, 212, 255, 0.12)',
    '--color-border-focus': '#00d4ff',
    '--color-moderate': '#00d4ff',
    '--color-stat-label': '#00d4ff',
    '--shadow-glow-accent': '0 0 20px rgba(0, 212, 255, 0.4), 0 0 40px rgba(0, 212, 255, 0.2)',
    // Scrollbar
    '--color-scrollbar': 'rgba(0, 212, 255, 0.3)',
    '--color-scrollbar-hover': 'rgba(0, 212, 255, 0.5)',
  },
  'terminal-green': {
    ...darkModeBase,
    '--color-accent': '#00ff66',
    '--color-accent-dim': '#00cc52',
    '--color-accent-bright': '#66ff99',
    '--color-accent-subtle': 'rgba(0, 255, 102, 0.12)',
    '--color-border-focus': '#00ff66',
    '--color-moderate': '#00ff66',
    '--color-stat-label': '#00ff66',
    '--shadow-glow-accent': '0 0 20px rgba(0, 255, 102, 0.4), 0 0 40px rgba(0, 255, 102, 0.2)',
    // Swap success to cyan since accent is green
    '--color-success': '#00d4ff',
    '--color-success-dim': '#00a8cc',
    '--color-success-subtle': 'rgba(0, 212, 255, 0.15)',
    '--color-low': '#00d4ff',
    // Scrollbar
    '--color-scrollbar': 'rgba(0, 255, 102, 0.3)',
    '--color-scrollbar-hover': 'rgba(0, 255, 102, 0.5)',
  },
  'warning-amber': {
    ...darkModeBase,
    '--color-accent': '#ffaa00',
    '--color-accent-dim': '#cc8800',
    '--color-accent-bright': '#ffcc55',
    '--color-accent-subtle': 'rgba(255, 170, 0, 0.12)',
    '--color-border-focus': '#ffaa00',
    '--color-moderate': '#ffaa00',
    '--color-stat-label': '#ffaa00',
    '--shadow-glow-accent': '0 0 20px rgba(255, 170, 0, 0.4), 0 0 40px rgba(255, 170, 0, 0.2)',
    // Swap warning to pink since accent is amber
    '--color-warning': '#ff66aa',
    '--color-warning-dim': '#dd4488',
    '--color-warning-subtle': 'rgba(255, 102, 170, 0.15)',
    '--color-severe': '#ff66aa',
    // Scrollbar
    '--color-scrollbar': 'rgba(255, 170, 0, 0.3)',
    '--color-scrollbar-hover': 'rgba(255, 170, 0, 0.5)',
  },
  'danger-red': {
    ...darkModeBase,
    '--color-accent': '#ff3366',
    '--color-accent-dim': '#cc2952',
    '--color-accent-bright': '#ff6688',
    '--color-accent-subtle': 'rgba(255, 51, 102, 0.12)',
    '--color-border-focus': '#ff3366',
    '--color-moderate': '#ff3366',
    '--color-stat-label': '#ff3366',
    '--shadow-glow-accent': '0 0 20px rgba(255, 51, 102, 0.4), 0 0 40px rgba(255, 51, 102, 0.2)',
    // Swap danger to orange since accent is red
    '--color-danger': '#ff8844',
    '--color-danger-dim': '#dd6622',
    '--color-danger-subtle': 'rgba(255, 136, 68, 0.15)',
    '--color-extreme': '#ff8844',
    // Scrollbar
    '--color-scrollbar': 'rgba(255, 51, 102, 0.3)',
    '--color-scrollbar-hover': 'rgba(255, 51, 102, 0.5)',
  },
  'glam-pink': {
    ...darkModeBase,
    '--color-accent': '#ff44aa',
    '--color-accent-dim': '#dd2288',
    '--color-accent-bright': '#ff77cc',
    '--color-accent-subtle': 'rgba(255, 68, 170, 0.15)',
    '--color-border-focus': '#ff44aa',
    '--color-moderate': '#ff44aa',
    '--color-stat-label': '#ff44aa',
    '--shadow-glow-accent': '0 0 20px rgba(255, 68, 170, 0.5), 0 0 40px rgba(255, 68, 170, 0.3)',
    // Glam gets purple success and gold warning
    '--color-success': '#aa66ff',
    '--color-success-dim': '#8844dd',
    '--color-success-subtle': 'rgba(170, 102, 255, 0.15)',
    '--color-warning': '#ffdd44',
    '--color-warning-dim': '#ddbb22',
    '--color-warning-subtle': 'rgba(255, 221, 68, 0.15)',
    '--color-low': '#aa66ff',
    '--color-severe': '#ffdd44',
    // Scrollbar
    '--color-scrollbar': 'rgba(255, 68, 170, 0.3)',
    '--color-scrollbar-hover': 'rgba(255, 68, 170, 0.5)',
  },
  'light-rose': {
    // Light mode backgrounds - warm greys with rose tint
    '--color-bg': '#d5d0d0',
    '--color-bg-surface': '#dedada',
    '--color-bg-elevated': '#e5e0e0',
    '--color-bg-hover': '#d8cccc',
    // Light mode borders
    '--color-border': '#c4b5b5',
    '--color-border-hover': '#b09898',
    // Light mode text
    '--color-text': '#1a1010',
    '--color-text-dim': '#4a3838',
    '--color-text-muted': '#6a5555',
    // Rose accent
    '--color-accent': '#e11d48',
    '--color-accent-dim': '#be123c',
    '--color-accent-bright': '#f43f5e',
    '--color-accent-subtle': 'rgba(225, 29, 72, 0.18)',
    '--color-border-focus': '#e11d48',
    '--color-moderate': '#e11d48',
    '--color-stat-label': '#be123c',
    '--shadow-glow-accent': '0 0 10px rgba(225, 29, 72, 0.35), 0 0 25px rgba(225, 29, 72, 0.2)',
    // Status colors for light backgrounds
    '--color-success': '#15803d',
    '--color-success-dim': '#166534',
    '--color-success-subtle': 'rgba(21, 128, 61, 0.15)',
    '--color-warning': '#b45309',
    '--color-warning-dim': '#92400e',
    '--color-warning-subtle': 'rgba(180, 83, 9, 0.15)',
    '--color-danger': '#be123c',
    '--color-danger-dim': '#9f1239',
    '--color-danger-subtle': 'rgba(190, 18, 60, 0.15)',
    // Difficulty colors for light mode
    '--color-trivial': '#64748b',
    '--color-low': '#15803d',
    '--color-severe': '#c2410c',
    '--color-extreme': '#be123c',
    // Rollable for light bg
    '--color-rollable': '#9a4209',
    '--color-rollable-hover': '#c45a0c',
    '--color-rollable-subtle': 'rgba(154, 66, 9, 0.15)',
    // Hazard color
    '--color-hazard': '#c2410c',
    '--color-hazard-subtle': 'rgba(194, 65, 12, 0.15)',
    // Scrollbar
    '--color-scrollbar': 'rgba(225, 29, 72, 0.25)',
    '--color-scrollbar-hover': 'rgba(225, 29, 72, 0.4)',
  },
  'light-violet': {
    // Light mode backgrounds - cool greys with violet tint
    '--color-bg': '#d0ced8',
    '--color-bg-surface': '#dad8e2',
    '--color-bg-elevated': '#e0dee8',
    '--color-bg-hover': '#ccc8da',
    // Light mode borders
    '--color-border': '#b8b2c8',
    '--color-border-hover': '#a098b8',
    // Light mode text
    '--color-text': '#151020',
    '--color-text-dim': '#3a3248',
    '--color-text-muted': '#5a5070',
    // Violet accent
    '--color-accent': '#7c3aed',
    '--color-accent-dim': '#6d28d9',
    '--color-accent-bright': '#8b5cf6',
    '--color-accent-subtle': 'rgba(124, 58, 237, 0.18)',
    '--color-border-focus': '#7c3aed',
    '--color-moderate': '#7c3aed',
    '--color-stat-label': '#6d28d9',
    '--shadow-glow-accent': '0 0 10px rgba(124, 58, 237, 0.35), 0 0 25px rgba(124, 58, 237, 0.2)',
    // Status colors for light backgrounds
    '--color-success': '#059669',
    '--color-success-dim': '#047857',
    '--color-success-subtle': 'rgba(5, 150, 105, 0.15)',
    '--color-warning': '#d97706',
    '--color-warning-dim': '#b45309',
    '--color-warning-subtle': 'rgba(217, 119, 6, 0.15)',
    '--color-danger': '#dc2626',
    '--color-danger-dim': '#b91c1c',
    '--color-danger-subtle': 'rgba(220, 38, 38, 0.15)',
    // Difficulty colors for light mode
    '--color-trivial': '#64748b',
    '--color-low': '#059669',
    '--color-severe': '#ea580c',
    '--color-extreme': '#dc2626',
    // Rollable for light bg
    '--color-rollable': '#9a4209',
    '--color-rollable-hover': '#c45a0c',
    '--color-rollable-subtle': 'rgba(154, 66, 9, 0.15)',
    // Hazard color
    '--color-hazard': '#ea580c',
    '--color-hazard-subtle': 'rgba(234, 88, 12, 0.15)',
    // Scrollbar
    '--color-scrollbar': 'rgba(124, 58, 237, 0.25)',
    '--color-scrollbar-hover': 'rgba(124, 58, 237, 0.4)',
  },
}

function applyTheme(themeId: ThemeId) {
  const colors = themeColors[themeId]
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

// Export the store
export function useSettingsStore() {
  return {
    settings,
    themes,

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
  }
}
