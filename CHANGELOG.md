# Damoritosh's Arena - Changelog

## Setup Side Panels
- Chase and tactical starship setup share one shape, modelled on the custom builder: a side panel of three steps with a live preview beside it
- A new chase or scene arrives already filled in and ready to run
- Four example chases, one for each type
- Obstacles, starships, hazards and vehicles are picked in dialogs instead of separate tabs

## Chases and Vehicles
- New CHASE tab for the GM Core chase subsystem: builder, tracker, and `#/chase/view` player view with face-down obstacle cards
- 42 sample obstacles from GM Core, audited against the PDF by `scripts/audit-chase.py`
- Vehicles can be attached to either side of a chase to track Hit Points, broken, uncontrolled and destroyed (a table aid; the chase rules do not use vehicle statistics)
- 13 more vehicles from Archives of Nethys (GM Core, Tales from the Vast) via `npm run fetch-vehicles`, 43 in all
- Session bundles and schemas cover chases

## Readability
- Theme colors adjust themselves to reach 4.5:1 contrast on every surface; text on filled highlights picks dark or light ink per theme
- Settings, schema and import dialogs have a proper panel background
- Button chamfers scale with button size
- Gradient Wave background rebuilt as a ripple simulation on a single canvas

## Tech Core: Tactical Starship Combat
- STARSHIP tab gains a CSC / TSC mode toggle; the cinematic runner is unchanged
- Bundled Starfinder Tech Core data parsed from the PDF: 74 NPC starships, 32 starship hazards, 30 vehicles, faction common actions
- Library with searchable stat blocks and rollable attacks
- Player starship sheets derived from frame (bulwark / explorer / skirmisher) + level with battle-station grades, upgrades, weapons and expansion bays
- Tactical tracker: initiative for crew, NPC ships and complex hazards; shields-then-hull damage; compromised / wrecked / inoperable / off-kilter handling with hull integrity checks; station malfunction and identification memory; zone + heading positions; Discord turn notifications
- `#/tsc/view` player sensor feed with hull bands instead of numbers
- Encounter builder: starships and starship hazards count toward XP; small-crew budget; "Run in TSC"
- Custom NPC starship builder; session bundles and schemas cover TSC data

## Starship Scene Save/Load & Improved Editing
- Full threat editing via ThreatCard (type, tactical role, saves, shield regen, initiative, routines)
- Victory conditions editor as standalone component
- Collapsible sidebar for saving, loading, duplicating, and exporting custom scenes
- JSON import/export with file upload support
- Setup validation warnings before scene start

## Shop Generator & Item Search Tab
- Shop Generator with 8 shop types, 5 settlement sizes, level-weighted random inventory
- Item Search across 1,310 items (weapons, armor, shields, equipment) with filters and AoN links

## Condition Controls & Pathmuncher Import
- +/- buttons for valued conditions (replaces click-to-decrement)
- File upload for Pathbuilder/Pathmuncher JSON import

## Settings Data Management
- Export/import/clear for custom hazards and party data

## Starship Combat Runner
- Initiative tracker with per-action roll panels
- Threat routine display and action logging
- DC-by-level utility, richer scene data

## UI Polish
- ActionIcon component replacing CSS diamond hacks
- All roles editable (built-in roles create modified copies)
- Starship role skills updated to match SF2e GM Core
- Gunner actions converted to attack rolls with weapon proficiency

## Cinematic Starship Scenes (initial)
- Role deck builder with custom roles and PDF export
- Ship templates, custom ship creation
- Scene runner with HP/shield tracking
- Player view with BroadcastChannel sync
