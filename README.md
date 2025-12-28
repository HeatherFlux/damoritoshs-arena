# Damoritosh's Arena

A free encounter builder and combat tracker for Starfinder 2E.

**Live:** [damoritoshs-arena.pages.dev](https://damoritoshs-arena.pages.dev)

## Features

### Encounter Builder
- Search creatures and hazards by name, level, type
- XP budget calculator with difficulty ratings (trivial to extreme)
- Elite/weak adjustments
- Save and manage multiple encounters

### Combat Tracker
- Initiative tracking with drag-to-reorder
- HP management with damage/healing controls
- Condition tracking with mechanical effects (flat-footed, frightened, etc)
- Expandable statblocks for creatures and hazards
- Turn advancement with round counter

### Dice Roller
- Click any stat to roll (attacks, saves, perception, etc)
- Auto-roll damage on hits (optional)
- Full roll history with export options
- Discord webhook integration - send rolls to your server

### Party Management
- Save party configurations
- Import characters from Pathbuilder JSON export
- Quick-add party members to combat

### Other Stuff
- 7 color themes (dark and light modes)
- Works on mobile
- No login required
- All data saves locally in your browser
- Export/import encounters as JSON

## Data Storage

Everything saves to browser localStorage:
- `sf2e-encounters` - your encounters
- `sf2e-parties` - party configurations
- `sf2e-combat` - current combat state
- `sf2e-settings` - theme, discord webhook, etc

Use Export to backup your data or move between devices.

## Tech Stack

- Vue 3 + TypeScript
- Vite
- Tailwind CSS v4
- Hosted on Cloudflare Pages

## Roadmap

### v1.0 (current)
- [x] Ground encounter builder
- [x] Combat tracker
- [x] Dice rolling with history
- [x] Party management
- [x] Pathbuilder import
- [x] Discord webhook integration
- [x] Multiple themes

### v1.1 (planned)
- [ ] Party export/import
- [ ] Encounter templates/presets

### v2.0 (future)
- [ ] **Starship Combat Tab**
  - Cinematic starship scenes support
  - Crew role tracking (Captain, Pilot, Gunner, Engineer, etc)
  - Ship threat library
  - Victory point tracking for non-combat objectives
  - Ship damage/shields management

- [ ] **AoN Integration**
  - Pull creatures directly from Archives of Nethys
  - Auto-update when new content releases
  - Starship threats and scenes

### Maybe Eventually
- [ ] Cloud sync (optional accounts)
- [ ] Shared combat sessions (GM + players)
- [ ] Foundry VTT module

## Development

```bash
npm install
npm run dev
```

## License

Do whatever you want with it.
