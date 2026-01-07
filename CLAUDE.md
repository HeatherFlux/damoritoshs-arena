# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Damoritosh's Arena** - A Starfinder 2e encounter builder and combat tracker for Game Masters. Vue 3 + TypeScript SPA deployed to Cloudflare Pages.

**Live site:** https://damoritoshs-arena.pages.dev

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Start Vite dev server (default port 5173)
npm run build    # Type-check with vue-tsc, then build with Vite
npm run preview  # Preview production build locally
npm run deploy   # Deploy to Cloudflare Pages (requires wrangler auth)
```

Note: No test suite currently exists.

### Data Scripts

```bash
npm run fetch-aon   # Fetch creature data from Archives of Nethys elasticsearch
npm run parse-pdf   # Parse PDF content (requires python3)
```

## Environment Variables

- `VITE_SYNC_SERVER_URL` - WebSocket server for cross-device hacking sync. Defaults to `http://localhost:8787` in dev mode.

## Architecture

### State Management

Uses Vue 3 Composition API with reactive stores (no Pinia/Vuex). All stores are in `src/stores/`:

- **encounterStore.ts** - Encounters, creatures, hazards. Manages XP calculations and creature database
- **combatStore.ts** - Active combat state, initiative order, HP/conditions
- **partyStore.ts** - Saved party configurations, player import from Pathbuilder
- **hackingStore.ts** - SF2e hacking encounter system with real-time sync
- **settingsStore.ts** - Theme, Discord webhook, UI preferences

Stores persist to localStorage with keys like `sf2e-encounters`, `sf2e-combat`, etc.

### Main Tabs (App.vue)

1. **Encounters** (`builder`) - Search creatures/hazards → build encounters → calculate XP
2. **Combat** (`combat`) - Initiative tracker, HP management, condition tracking
3. **Hacking** (`hacking`) - Visual hacking encounter system for SF2e computers

### Key Type Definitions

- `src/types/creature.ts` - Creature, EncounterCreature, CreatureAdjustment
- `src/types/hazard.ts` - Hazard, HazardComplexity (simple/complex)
- `src/types/encounter.ts` - XP calculation logic, difficulty thresholds
- `src/types/hacking.ts` - Computer, AccessPoint, NodeState, HackingEffect
- `src/types/combat.ts` - Combatant, CombatState, conditions

### Data Sources

- `src/data/creatures.json` - Bundled SF2e creature database (pre-fetched from Archives of Nethys)
- `src/data/hazards.ts` - Hazard definitions with XP calculations
- `src/data/conditions.ts` - PF2e/SF2e condition rules and effects

### Hacking System

The hacking tab implements SF2e's hackable computer system:
- `HackingPanel.vue` - GM view with computer editor
- `HackingPlayerView.vue` - Shareable player view (hash route: `#/hacking/view`)
- `hackingStore.ts` - State with BroadcastChannel sync for same-device sharing
- `syncTransport.ts` - WebSocket transport for cross-device real-time sync

Player view URL format: `/#/hacking/view?session=<id>&state=<encoded>`

Cross-device sync requires deploying a separate Cloudflare Worker (not bundled). Same-device sync works via BroadcastChannel.

### Styling

Tailwind CSS v4 with CSS custom properties for theming. Theme colors defined in `settingsStore.ts` with variables like `--color-accent`, `--color-surface`, etc.

## XP Calculation

Uses PF2e/SF2e unified encounter math in `src/types/encounter.ts`:
- Creature XP by level difference (-4 to +4 range)
- Hazard XP differs for simple vs complex
- Party size adjusts budget (+20 XP per player above 4)
- Difficulty thresholds: trivial (40), low (60), moderate (80), severe (120), extreme (160)

## Discord Integration

`src/utils/discordIntegration.ts` - Sends dice rolls to Discord via webhook. Configure in Settings modal.
