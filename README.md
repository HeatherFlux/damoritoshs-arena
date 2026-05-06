# Damoritosh's Arena

A free encounter builder, combat tracker, and cinematic starship-scene runner for Starfinder 2E.

**Live:** [damoritoshs-arena.pages.dev](https://damoritoshs-arena.pages.dev)

## Features

### Encounter Builder
- Search creatures and hazards by name, level, type
- XP budget calculator with difficulty ratings (trivial to extreme)
- Elite/weak adjustments (PF2e Bestiary brackets: 1-2 / 3-5 / 6-20 / 21+)
- Save and manage multiple encounters

### Combat Tracker
- Initiative tracking with drag-to-reorder
- HP management with damage/healing controls
- Condition tracking with mechanical effects (clumsy, drained, frightened, etc.)
  - Custom note conditions for ad-hoc statuses ("aim", "marked", "concentrating")
  - Hidden-from-players flag per combatant — eye toggle hides creatures from the
    player view while keeping them on the GM screen
- Expandable statblocks for creatures and hazards
- Turn advancement with round counter

### Cinematic Starship Scenes
SF2e GM Core's cinematic starship combat, fully wired up:
- **Click-to-roll on every stat** — ship bonuses, defenses, threat AC/Fort/Ref/Init,
  attack bonuses, damage, DCs all roll inline like the combat tab
- **Threats with full routines** — multi-action turns with attack rolls, skill
  checks, special abilities, immunities/resistances/weaknesses
- **Crew action library** — actions tagged by role (captain / engineer / gunner /
  magic officer / pilot / science officer, plus custom "niche" roles per GM Core)
- **Victory conditions** — defeat, victory points, survival, escape, custom; the
  scene header chip adapts to the active condition
- **Initiative pre-fills from party** — the modal pulls PCs from the active party
  on the encounters tab, so you don't retype names
- **Edit mode during play** — tweak threat HP, abilities, routines, VP target,
  or scene name live without ending the scene
- **Saved starship templates** — save a PC ship configuration once, reuse it
  across scenes; mark a template as a "campaign ship" to carry HP/Shield damage
  forward between encounters
- **Monte Carlo simulator** — pre-game balance preview that runs 1000 simulated
  rounds with averaged crew rolls, shows outcome distribution and tuning hints
- **Player view** — shareable URL for the table; renders ship status, objectives,
  and crew action cards. Threats and GM-only data are filtered out.

### Hacking Encounters
SF2e's hackable computer system with networked nodes:
- Visual canvas with draggable access points
- Vulnerabilities reduce DCs (1-3 reduction)
- Countermeasures with notice/disable DCs and persistent triggers
- **Hidden nodes** — pre-author "secret" subsystems that don't appear in the
  player view until you reveal them mid-scene
- **Cumulative challenge mode** — optional HP-style margin tracking for nodes
  where binary success/fail feels punishing. Each successful hack adds
  (rolled - DC) margin to a running total; crits double, crit-fails subtract;
  the node breaches when the margin hits the target.
- **Real-time sync** — same-device via BroadcastChannel, cross-device via
  WebSocket. Player view auto-syncs with the GM's canvas.

### Dice Roller
- Click any stat to roll (attacks, saves, perception, threat skill checks, etc.)
- Auto-roll damage on hits (optional)
- Full roll history with export options
- Discord webhook integration — send rolls to your server

### Party Management
- Save party configurations
- Import characters from Pathbuilder JSON export
- Quick-add party members to combat
- Pre-fill the starship Initiative Roll modal automatically

### Shop Generator
- Settlement-aware item filtering (outpost / village / city / metropolis / megacity)
- Procedural shopkeeper NPCs (name, ancestry, mannerism, personality)
- Save shops with full inventory snapshots — no re-rolling on reload

### Other Stuff
- 7 color themes (dark and light modes)
- Mobile-first responsive layout
- No login required
- All data saves locally in your browser
- Export/import any of: encounters, parties, hacking sessions, starship scenes,
  starship templates, shops, or full session bundles (YAML or JSON)

## Data Storage

Everything saves to browser localStorage:

| Key | Content |
|-----|---------|
| `sf2e-encounters` | Saved encounters |
| `sf2e-parties` | Party configurations |
| `sf2e-combat` | Current combat state |
| `sf2e-custom-creatures` | User-defined creatures |
| `sf2e-settings` | Theme, Discord webhook, etc. |
| `sf2e-hacking-state` | Current hacking computer |
| `sf2e-hacking-saved` | Saved hacking encounters |
| `sf2e-starship-state` | Current starship scene |
| `sf2e-starship-saved` | Saved starship scenes |
| `sf2e-starship-templates` | Reusable PC ship templates |
| `sf2e-shops` | Saved shops with full inventory |

Use **Settings → Export Session Bundle** to back up everything in one YAML/JSON
file, or import one to set up a session on a different device.

## For GM Agents Authoring Prep

Both schemas (`starship-scenes.schema.json` and `hacking-sessions.schema.json`)
carry `x-player-visibility` blocks listing every PLAYER-VISIBLE and GM-ONLY
field, plus authoring rules for reveal arcs. The annotated YAML examples at
`public/schemas/examples/starship-encounter.example.yaml` and
`public/schemas/examples/hacking-encounter.example.yaml` document inline which
fields render verbatim to the table — useful when writing prep that involves
unrevealed antagonists or twists.

**Rule of thumb:** if the antagonist's identity is meant to be a reveal, use a
codename in the player-visible fields (`starship.name`, `starshipActions[].outcomes.*`,
`accessPoints[].name`); put the true identity in the scene-level `description`,
which is GM-only.

## Tech Stack

- Vue 3 + TypeScript
- Vite
- Tailwind CSS v4
- Vitest + happy-dom + @vue/test-utils (450+ tests)
- Hosted on Cloudflare Pages

## Development

```bash
npm install
npm run dev         # Vite dev server on :5173
npm test            # Vitest suite
npm run build       # vue-tsc + vite build
```

## License

Do whatever you want with it.
