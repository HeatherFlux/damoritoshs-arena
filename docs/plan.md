    Starfinder 2e Encounter Manager - Product Feature Requests

     Document Owner: Product Management
     Last Updated: December 27, 2025
     App Version: 1.0 (Current State Assessment)

     ---
     Executive Summary

     The Starfinder 2e Encounter Manager is a web-based tool for Game Masters to build balanced 
     encounters and track combat. After competitive analysis against Pathbuilder Encounters and
     Pathfinder Dashboard, we've identified key feature gaps that would significantly improve user
     experience and feature parity with market leaders.

     Competitive Tools Analyzed:
     - https://pathbuilder2e.com/beta/encounters.html - Industry-standard encounter builder
     - https://pathfinderdashboard.com/ - Full-featured GM combat tracker
     - https://pathbuilder2e.com/app.html - Leading character creation tool

     ---
     Current Product Capabilities

     | Feature Area       | Status      | Notes                                             |
     |--------------------|-------------|---------------------------------------------------|
     | Encounter Building | ✅ Complete | XP calc, difficulty thresholds, creature variants |
     | Creature Database  | ✅ Complete | Search, filter by level/trait, full stat blocks   |
     | Combat Tracker     | ✅ Complete | Initiative, HP/temp HP, conditions, rounds        |
     | Dice Rolling       | ✅ Complete | D20, damage dice, export to Discord/Foundry       |
     | Data Persistence   | ✅ Complete | LocalStorage save/load, JSON import/export        |

     ---
     Feature Request #1: Pathbuilder Character Import

     Overview

     Enable GMs to import player characters from Pathbuilder JSON exports, eliminating manual data 
     entry and ensuring accurate character stats during combat.

     User Story

     As a GM, I want to import my players' Pathbuilder character exports so that I can quickly add 
     them to combat with accurate HP, AC, and modifiers without manual entry.

     Business Justification

     - Friction Reduction: Players already use Pathbuilder for character management; creates seamless
      workflow
     - Competitive Parity: Pathfinder Dashboard offers this feature
     - Error Prevention: Manual stat entry leads to mistakes during play

     BDD Acceptance Criteria

     Feature: Pathbuilder Character Import
       As a GM preparing for a session
       I want to import player characters from Pathbuilder JSON
       So that I can add them to combat with accurate stats

       Background:
         Given I am on the Combat Tracker tab
         And I have a valid Pathbuilder JSON export

       Scenario: Import character via paste
         Given I click the "Import Character" button
         When I paste valid Pathbuilder JSON into the import field
         And I click "Import"
         Then a new player combatant should be created
         And the combatant name should match the character name
         And the combatant should be marked as a player

       Scenario: Extract combat-essential stats
         Given I have imported a character with:
           | Field | Value |
           | name | "Yo Yo" |
           | level | 7 |
           | class | "Mystic" |
         When the import completes
         Then the combatant should have:
           | Field | Source |
           | name | build.name |
           | maxHP | calculated from class HP + Con |
           | ac | build.acTotal.acTotal |
           | perception | build.proficiencies.perception + level + Wis |
           | fortitude | build.proficiencies.fortitude + level + Con |
           | reflex | build.proficiencies.reflex + level + Dex |
           | will | build.proficiencies.will + level + Wis |

       Scenario: Handle Starfinder 2e classes
         Given I import a character with class "Mystic"
         When the import completes
         Then the system should recognize SF2e class names
         And calculate HP using SF2e class HP values

       Scenario: Reject invalid JSON
         Given I click the "Import Character" button
         When I paste invalid JSON: "{ broken json"
         And I click "Import"
         Then I should see an error message "Invalid JSON format"
         And no combatant should be created

       Scenario: Handle missing fields gracefully
         Given I import JSON missing the "acTotal" field
         When the import completes
         Then the combatant should be created
         And AC should default to 10
         And I should see a warning "Some stats could not be imported"

       Scenario: Import multiple characters
         Given I have 4 Pathbuilder JSON exports
         When I import each one sequentially
         Then I should have 4 player combatants
         And each should have unique IDs

     Technical Implementation

     New Type Definition

     File: src/types/pathbuilder.ts
     export interface PathbuilderImport {
       success: boolean
       build: {
         name: string
         class: string
         level: number
         ancestry: string
         heritage: string
         abilities: {
           str: number; dex: number; con: number
           int: number; wis: number; cha: number
         }
         attributes: {
           ancestryhp: number
           classhp: number
           bonushp: number
           bonushpPerLevel: number
         }
         proficiencies: {
           perception: number
           fortitude: number
           reflex: number
           will: number
         }
         acTotal: {
           acTotal: number
         }
       }
     }

     export interface ImportResult {
       success: boolean
       combatant?: Combatant
       warnings: string[]
       errors: string[]
     }

     New Utility Function

     File: src/utils/pathbuilderImport.ts
     export function parsePathbuilderJSON(json: string): ImportResult
     export function calculateHP(build: PathbuilderBuild): number
     export function calculateModifier(
       proficiency: number,
       level: number,
       abilityMod: number
     ): number

     Component Changes

     File: src/components/CombatTracker.vue
     - Add "Import Character" button to player section
     - Add import modal with textarea for JSON paste
     - Display import warnings/errors

     Files to Modify

     | File                             | Changes                                  |
     |----------------------------------|------------------------------------------|
     | src/types/pathbuilder.ts         | New file - type definitions              |
     | src/utils/pathbuilderImport.ts   | New file - parsing logic                 |
     | src/components/CombatTracker.vue | Add import button + modal                |
     | src/stores/combatStore.ts        | Add importPlayerFromPathbuilder() method |

     Priority: 🔴 High

     Effort Estimate: Medium (3-5 days)

     ---
     Feature Request #2: Hazard Support

     Overview

     Add support for traps, environmental hazards, and haunts in encounter building with proper XP 
     calculations per Starfinder 2e rules.

     User Story

     As a GM, I want to add hazards to my encounters so that I can accurately calculate total 
     encounter difficulty when combining creatures with traps and environmental dangers.

     Business Justification

     - Rules Completeness: Hazards are core to SF2e/PF2e encounter design
     - Competitive Parity: Pathbuilder Encounters has "Add Hazard" as primary feature
     - GM Utility: Many published adventures combine creatures + hazards

     BDD Acceptance Criteria

     Feature: Hazard Support
       As a GM building encounters
       I want to add hazards alongside creatures
       So that I can accurately calculate encounter difficulty

       Background:
         Given I am on the Encounter Builder tab
         And I have an encounter with party level 5

       # --- HAZARD DATABASE ---

       Scenario: Search for hazards
         Given I switch to the "Hazards" search tab
         When I type "pit" in the search field
         Then I should see hazards matching "pit" in their name
         And each result should show: name, level, complexity, type

       Scenario: Filter hazards by level
         Given I am viewing the hazard search
         When I set level filter to "3-5"
         Then I should only see hazards between levels 3 and 5

       Scenario: Filter hazards by complexity
         Given I am viewing the hazard search
         When I select complexity filter "Complex"
         Then I should only see complex hazards
         And simple hazards should be hidden

       Scenario: Filter hazards by type
         Given I am viewing the hazard search
         When I select type filter "Trap"
         Then I should only see trap-type hazards
         And environmental hazards and haunts should be hidden

       # --- ADDING HAZARDS TO ENCOUNTERS ---

       Scenario: Add simple hazard to encounter
         Given I search for "Spike Pit"
         When I click the "+" button on "Spike Pit" (Level 1, Simple)
         Then the hazard should appear in my encounter
         And encounter XP should increase by 4 (simple hazard, -4 level diff)

       Scenario: Add complex hazard to encounter
         Given I search for "Poisoned Lock"
         When I click the "+" button on "Poisoned Lock" (Level 4, Complex)
         Then the hazard should appear in my encounter
         And encounter XP should increase by 30 (complex hazard, -1 level diff)

       Scenario: Display hazard in encounter alongside creatures
         Given I have an encounter with:
           | Name | Type | Count |
           | Goblin Warrior | Creature | 2 |
           | Spike Pit | Hazard | 1 |
         Then both should display in the encounter builder
         And the total XP should sum creatures + hazards correctly

       # --- XP CALCULATIONS ---

       Scenario Outline: Calculate simple hazard XP
         Given I have a party level of <party_level>
         When I add a simple hazard of level <hazard_level>
         Then the hazard XP should be <expected_xp>

         Examples:
           | party_level | hazard_level | expected_xp |
           | 5 | 1 | 2 |  # -4 diff
           | 5 | 2 | 3 |  # -3 diff
           | 5 | 3 | 4 |  # -2 diff
           | 5 | 4 | 6 |  # -1 diff
           | 5 | 5 | 8 |  # 0 diff
           | 5 | 6 | 12 | # +1 diff
           | 5 | 7 | 16 | # +2 diff
           | 5 | 8 | 24 | # +3 diff
           | 5 | 9 | 32 | # +4 diff

       Scenario Outline: Calculate complex hazard XP
         Given I have a party level of <party_level>
         When I add a complex hazard of level <hazard_level>
         Then the hazard XP should be <expected_xp>

         Examples:
           | party_level | hazard_level | expected_xp |
           | 5 | 1 | 10 |  # -4 diff
           | 5 | 2 | 15 |  # -3 diff
           | 5 | 3 | 20 |  # -2 diff
           | 5 | 4 | 30 |  # -1 diff
           | 5 | 5 | 40 |  # 0 diff
           | 5 | 6 | 60 |  # +1 diff
           | 5 | 7 | 80 |  # +2 diff
           | 5 | 8 | 120 | # +3 diff
           | 5 | 9 | 160 | # +4 diff

       # --- COMBAT TRACKER INTEGRATION ---

       Scenario: Add complex hazard to combat
         Given I have an encounter with a complex hazard "Poisoned Lock"
         When I start combat from this encounter
         Then I should be prompted to set initiative for the hazard
         And the hazard should appear in the initiative order

       Scenario: Simple hazards do not join initiative
         Given I have an encounter with a simple hazard "Spike Pit"
         When I start combat from this encounter
         Then the simple hazard should NOT be added to initiative
         And only creatures and players should have turns

       Scenario: View hazard stat block
         Given I have a hazard "Poisoned Lock" in my encounter
         When I click on the hazard name
         Then I should see the full hazard stat block
         Including: Stealth DC, Disable checks, AC, HP, Hardness, Actions

     Technical Implementation

     New Type Definition

     File: src/types/hazard.ts
     export type HazardComplexity = 'simple' | 'complex'
     export type HazardType = 'trap' | 'environmental' | 'haunt'

     export interface Hazard {
       id: string
       name: string
       level: number
       complexity: HazardComplexity
       type: HazardType
       traits: string[]
       stealth: string  // "Stealth DC 20 (trained)"
       description: string
       disable: string  // "Thievery DC 18 (trained)"
       ac?: number
       saves?: { fort?: number; ref?: number; will?: number }
       hp?: number
       hardness?: number
       immunities?: string[]
       weaknesses?: string[]
       actions: HazardAction[]
       reset?: string
       source: string
     }

     export interface HazardAction {
       name: string
       trigger?: string
       actions?: number | 'reaction'
       effect: string
       damage?: string
       dc?: number
       traits?: string[]
     }

     export interface EncounterHazard {
       hazard: Hazard
       count: number
       notes?: string
     }

     XP Calculation Update

     File: src/types/encounter.ts
     // Add hazard XP tables
     export const SIMPLE_HAZARD_XP: Record<string, number> = {
       '-4': 2, '-3': 3, '-2': 4, '-1': 6, '0': 8,
       '1': 12, '2': 16, '3': 24, '4': 32
     }

     export const COMPLEX_HAZARD_XP: Record<string, number> = {
       '-4': 10, '-3': 15, '-2': 20, '-1': 30, '0': 40,
       '1': 60, '2': 80, '3': 120, '4': 160
     }

     // Update Encounter interface
     export interface Encounter {
       // ... existing fields
       hazards: EncounterHazard[]  // NEW
     }

     // Update EncounterXPResult
     export interface EncounterXPResult {
       // ... existing fields
       hazardBreakdown: Array<{...}>  // NEW
     }

     Files to Modify/Create

     | File                                | Changes                                 |
     |-------------------------------------|-----------------------------------------|
     | src/types/hazard.ts                 | New file - hazard type definitions      |
     | src/data/hazards.json               | New file - hazard database              |
     | src/types/encounter.ts              | Add hazard XP tables, update interfaces |
     | src/components/HazardSearch.vue     | New file - hazard search component      |
     | src/components/EncounterBuilder.vue | Display hazards, update XP calc         |
     | src/stores/encounterStore.ts        | Add hazard CRUD methods                 |
     | src/components/CombatTracker.vue    | Support complex hazards in initiative   |

     Data Source

     - Hazard data can be sourced via MCP tool: searchHazards, getHazardsByLevel
     - Need to build initial hazards.json similar to creatures.json

     Priority: 🔴 High

     Effort Estimate: Medium-Large (5-8 days)

     ---
     Feature Request #3: Player View

     Overview

     Create a separate, shareable view that displays only initiative order and current turn - 
     designed for players to view on a secondary screen or device without revealing GM information.

     User Story

     As a GM running combat at a physical or virtual table, I want a player-facing view of initiative
      so that players always know turn order without seeing creature HP, stats, or my notes.

     Business Justification

     - Table Experience: Reduces "whose turn is it?" questions
     - Information Control: Players see only what they should
     - Competitive Parity: Pathfinder Dashboard's most-requested feature

     BDD Acceptance Criteria

     Feature: Player View
       As a GM running combat
       I want a player-facing initiative display
       So that players can see turn order without GM-only information

       Background:
         Given I have an active combat with:
           | Name | Initiative | HP | Is Player |
           | Goblin | 18 | 15/15 | false |
           | Alces | 15 | 45/45 | true |
           | Skeleton | 12 | 10/10 | false |
           | Poppy | 10 | 38/38 | true |

       # --- LAUNCHING PLAYER VIEW ---

       Scenario: Open player view from combat tracker
         Given I am on the Combat Tracker with active combat
         When I click "Open Player View"
         Then a new browser tab/window should open
         And the URL should be "/player"
         And the view should show the current combat

       Scenario: Generate shareable link
         Given I am on the Combat Tracker with active combat
         When I click "Copy Player Link"
         Then a URL should be copied to my clipboard
         And the URL should be shareable to other devices on local network

       # --- PLAYER VIEW DISPLAY ---

       Scenario: Display initiative order
         Given I open the Player View
         Then I should see all combatants in initiative order:
           | Position | Name |
           | 1 | Goblin |
           | 2 | Alces |
           | 3 | Skeleton |
           | 4 | Poppy |

       Scenario: Highlight current turn
         Given the current turn is "Alces"
         When I view the Player View
         Then "Alces" should be visually highlighted as active
         And other combatants should not be highlighted

       Scenario: Display round number
         Given the combat is on round 3
         When I view the Player View
         Then I should see "Round 3" displayed prominently

       # --- INFORMATION HIDING ---

       Scenario: Hide HP from players
         Given I open the Player View
         Then I should NOT see HP values for any combatant
         And I should NOT see HP bars

       Scenario: Hide GM notes from players
         Given the Goblin has notes "Will flee at 5 HP"
         When I view the Player View
         Then I should NOT see the GM notes

       Scenario: Optionally hide creature names
         Given the GM has enabled "Hide Enemy Names" setting
         When I view the Player View
         Then creatures should display as "Enemy 1", "Enemy 2"
         And player characters should show their real names

       Scenario: Optionally show conditions
         Given "Alces" has condition "Frightened 2"
         And the GM has enabled "Show Conditions to Players"
         When I view the Player View
         Then I should see "Frightened 2" next to "Alces"

       # --- REAL-TIME UPDATES ---

       Scenario: Auto-update when turn advances
         Given I have the Player View open
         When the GM advances from "Alces" to "Skeleton"
         Then the Player View should update automatically
         And "Skeleton" should now be highlighted

       Scenario: Auto-update when combatant dies
         Given I have the Player View open
         When the GM marks "Goblin" as dead
         Then "Goblin" should show a death indicator
         Or be removed from the list (based on settings)

       Scenario: Auto-update when round changes
         Given I have the Player View open on Round 2
         When the GM advances to Round 3
         Then the round display should update to "Round 3"

       # --- RESPONSIVE DESIGN ---

       Scenario: Mobile phone display
         Given I open the Player View on a mobile phone
         Then the layout should be single-column
         And text should be readable without zooming
         And the current turn should be prominently displayed

       Scenario: Large screen / TV display
         Given I open the Player View on a 55" TV
         Then the layout should expand to fill the screen
         And text should be large enough to read from 10 feet away

     Technical Implementation

     Architecture Options

     Option A: Same-Origin with LocalStorage Sync
     - Player view reads from same localStorage as GM
     - Uses storage events to detect changes
     - Pros: Simple, works offline
     - Cons: Same device only (or same browser profile)

     Option B: URL State Encoding
     - Encode combat state in URL hash
     - GM shares URL, player refreshes to update
     - Pros: Shareable, no backend
     - Cons: Manual refresh needed

     Option C: WebSocket / Server-Sent Events (Recommended)
     - Lightweight server relays state changes
     - True real-time sync across devices
     - Pros: Best UX, real-time
     - Cons: Requires server component

     Recommended: Option A for MVP, with upgrade path to Option C

     New Component

     File: src/views/PlayerView.vue
     // Minimal player view component
     // Reads combat state from localStorage
     // Filters out sensitive information
     // Listens for storage events for updates

     Router Addition

     File: src/router/index.ts (new file)
     import { createRouter, createWebHistory } from 'vue-router'

     const routes = [
       { path: '/', component: () => import('../App.vue') },
       { path: '/player', component: () => import('../views/PlayerView.vue') }
     ]

     Files to Modify/Create

     | File                             | Changes                          |
     |----------------------------------|----------------------------------|
     | src/views/PlayerView.vue         | New file - player view component |
     | src/router/index.ts              | New file - Vue Router setup      |
     | src/main.ts                      | Add router to app                |
     | src/stores/combatStore.ts        | Add player view settings         |
     | src/components/CombatTracker.vue | Add "Open Player View" button    |
     | package.json                     | Add vue-router dependency        |

     Priority: 🟡 Medium

     Effort Estimate: Medium (3-5 days)

     ---
     Feature Request #4: GM Reference Sheet

     Overview

     Add an integrated quick-reference panel with commonly-needed rules, DCs, and tables accessible 
     during combat without leaving the app.

     User Story

     As a GM in the middle of combat, I want quick access to DC tables, condition summaries, and 
     common rules so that I don't have to leave the app or flip through books.

     Business Justification

     - Session Flow: Reduces game interruptions for rule lookups
     - Competitive Parity: Pathfinder Dashboard includes comprehensive cheat sheet
     - User Retention: More reasons to stay in-app during sessions

     BDD Acceptance Criteria

     Feature: GM Reference Sheet
       As a GM running a session
       I want quick access to rules and tables
       So that I can look up information without leaving the app

       # --- ACCESS ---

       Scenario: Open reference panel
         Given I am on any tab in the app
         When I click the "Reference" button in the header
         Then a reference panel should slide in from the right
         And it should not obstruct the main content

       Scenario: Keyboard shortcut
         Given I am anywhere in the app
         When I press "?" or "Ctrl+/"
         Then the reference panel should toggle open/closed

       Scenario: Close reference panel
         Given the reference panel is open
         When I click outside the panel
         Or I click the X button
         Or I press Escape
         Then the panel should close

       # --- DC BY LEVEL ---

       Scenario: View DC by Level table
         Given I open the reference panel
         When I click "DCs by Level"
         Then I should see a table with columns:
           | Level | DC |
         And it should show levels -1 through 25
         And it should include adjustment columns for Easy/Hard/Incredible

       Scenario: Quick DC lookup
         Given I have "DCs by Level" open
         When I click on a specific level row
         Then that row should highlight
         And I can see Simple (-2), Standard, Hard (+2), Incredible (+5) DCs

       # --- CONDITIONS ---

       Scenario: View condition list
         Given I open the reference panel
         When I click "Conditions"
         Then I should see all conditions alphabetically
         And each condition should show a brief summary

       Scenario: Search conditions
         Given I am viewing the conditions list
         When I type "fright" in the search box
         Then only "Frightened" should be visible

       Scenario: Expand condition details
         Given I am viewing the conditions list
         When I click on "Frightened"
         Then I should see the full condition rules
         Including: value tracking, effects, recovery

       # --- SKILL ACTIONS ---

       Scenario: View skill actions
         Given I open the reference panel
         When I click "Skill Actions"
         Then I should see common skill actions grouped by skill:
           | Skill | Actions |
           | Athletics | Climb, Force Open, Grapple, Shove, Trip |
           | Medicine | Treat Wounds, Battle Medicine |
           | ...etc | ... |

       Scenario: Treat Wounds details
         Given I am viewing Skill Actions
         When I click "Treat Wounds"
         Then I should see:
           | DC | Healing |
           | 15 | 2d8 |
           | 20 | 2d8+10 |
           | 30 | 2d8+30 |
           | 40 | 2d8+50 |

       # --- COMBAT REFERENCE ---

       Scenario: View cover rules
         Given I open "Combat Quick Ref"
         When I view "Cover"
         Then I should see:
           | Cover Type | AC Bonus | Reflex Bonus |
           | Lesser | +1 | - |
           | Standard | +2 | +1 |
           | Greater | +4 | +2 |

       Scenario: View falling damage
         Given I open "Combat Quick Ref"
         When I view "Falling Damage"
         Then I should see the formula: "1d6 per 10 feet (max 750 damage)"

       # --- STARFINDER-SPECIFIC ---

       Scenario: View tech item rules
         Given I open the reference panel
         When I click "Starfinder Rules"
         Then I should see SF2e-specific references:
           - Capacity and usage
           - Vehicle rules
           - Computer tiers

     Technical Implementation

     Data Source

     Most data already exists in codebase:
     - Conditions: src/data/conditions.ts (615 lines, 27+ conditions)
     - Need to add: DCs, skill actions, combat rules

     New Data File

     File: src/data/reference.ts
     export const DC_BY_LEVEL: Record<number, {
       simple: number
       standard: number
       hard: number
       incredible: number
     }> = {
       [-1]: { simple: 11, standard: 13, hard: 15, incredible: 18 },
       [0]: { simple: 12, standard: 14, hard: 16, incredible: 19 },
       // ... levels 1-25
     }

     export const SKILL_ACTIONS = {
       athletics: [
         { name: 'Climb', action: 1, trained: false, description: '...' },
         { name: 'Grapple', action: 1, trained: false, description: '...' },
         // ...
       ],
       medicine: [
         {
           name: 'Treat Wounds',
           action: '10 min',
           trained: true,
           description: '...',
           table: [
             { dc: 15, healing: '2d8', proficiency: 'Trained' },
             // ...
           ]
         }
       ]
     }

     export const COVER_RULES = { ... }
     export const FALLING_DAMAGE = { ... }

     New Component

     File: src/components/ReferencePanel.vue
     - Slide-out panel design
     - Collapsible sections
     - Search/filter capability
     - Keyboard navigation

     Files to Modify/Create

     | File                              | Changes                                    |
     |-----------------------------------|--------------------------------------------|
     | src/data/reference.ts             | New file - DC tables, skill actions, rules |
     | src/components/ReferencePanel.vue | New file - reference panel UI              |
     | src/App.vue                       | Add reference button to header             |

     Priority: 🟡 Medium

     Effort Estimate: Small-Medium (2-4 days)

     ---
     Feature Request #5: Campaign Organization

     Overview

     Allow GMs to group encounters into campaigns for better organization and session planning.

     User Story

     As a GM running a long campaign, I want to organize my encounters into campaign folders so that 
     I can easily find encounters for specific story arcs or sessions.

     BDD Acceptance Criteria

     Feature: Campaign Organization
       As a GM with many encounters
       I want to organize them into campaigns
       So that I can easily find and manage related encounters

       Scenario: Create a new campaign
         Given I am viewing the encounter list
         When I click "New Campaign"
         And I enter the name "Against the Aeon Throne"
         Then a new campaign folder should be created
         And it should appear in the sidebar

       Scenario: Move encounter to campaign
         Given I have a campaign "Against the Aeon Throne"
         And I have an encounter "Starship Ambush"
         When I drag "Starship Ambush" onto "Against the Aeon Throne"
         Then the encounter should move into that campaign

       Scenario: View encounters by campaign
         Given I have campaigns with encounters
         When I click on a campaign name
         Then I should only see encounters in that campaign

       Scenario: View uncategorized encounters
         Given I have encounters not in any campaign
         When I click "Uncategorized"
         Then I should see only those encounters

       Scenario: Rename campaign
         Given I have a campaign "Test"
         When I right-click and select "Rename"
         And I enter "Book 1: Incident at Absalom Station"
         Then the campaign name should update

       Scenario: Delete campaign
         Given I have an empty campaign
         When I delete the campaign
         Then it should be removed
         And any encounters in it should move to "Uncategorized"

     Technical Implementation

     Type Updates

     File: src/types/encounter.ts
     export interface Campaign {
       id: string
       name: string
       notes?: string
       createdAt: Date
       updatedAt: Date
     }

     export interface Encounter {
       // ... existing fields
       campaignId?: string  // NEW - undefined = uncategorized
     }

     Files to Modify

     | File                             | Changes                                  |
     |----------------------------------|------------------------------------------|
     | src/types/encounter.ts           | Add Campaign interface, update Encounter |
     | src/stores/encounterStore.ts     | Add campaign CRUD, filter by campaign    |
     | src/components/EncounterList.vue | Campaign folders UI, drag-drop           |

     Priority: 🟡 Medium

     Effort Estimate: Small (2-3 days)

     ---
     Feature Request #6: Random Encounter Generator

     Overview

     Generate random level-appropriate encounters based on party parameters and optional filters.

     User Story

     As a GM who needs a quick encounter, I want to generate a random balanced encounter so that I 
     can improvise sessions or populate hex-crawl regions.

     BDD Acceptance Criteria

     Feature: Random Encounter Generator
       As a GM needing a quick encounter
       I want to generate random balanced encounters
       So that I can improvise without extensive prep

       Scenario: Generate moderate encounter
         Given my party is level 5 with 4 players
         When I click "Random Encounter"
         And I select difficulty "Moderate"
         Then I should see a generated encounter
         And the XP total should be approximately 80

       Scenario: Filter by creature type
         Given I want a "beast" themed encounter
         When I generate a random encounter
         And I filter by trait "beast"
         Then all suggested creatures should have the "beast" trait

       Scenario: Add generated encounter
         Given I have generated a random encounter
         When I click "Add to My Encounters"
         Then a new encounter should be created with those creatures

       Scenario: Regenerate different options
         Given I have a generated encounter
         When I click "Regenerate"
         Then I should see a different combination
         And the XP should still match my difficulty

     Priority: 🟢 Low

     Effort Estimate: Medium (3-4 days)

     ---
     Feature Request #7: Custom Creature Creator

     Overview

     Allow GMs to create and save custom creatures with their own stat blocks.

     User Story

     As a GM running a homebrew campaign, I want to create custom creatures so that I can add unique 
     monsters and NPCs to my encounters.

     BDD Acceptance Criteria

     Feature: Custom Creature Creator
       As a GM with homebrew content
       I want to create custom creatures
       So that I can use them in encounters

       Scenario: Create basic creature
         Given I click "Create Custom Creature"
         When I fill in:
           | Field | Value |
           | Name | "Corporate Security Guard" |
           | Level | 2 |
           | HP | 30 |
           | AC | 17 |
         And I click "Save"
         Then the creature should appear in my search results

       Scenario: Add creature image
         Given I am creating a custom creature
         When I paste an image URL
         Then the image should display in the creature card

       Scenario: Custom creatures in search
         Given I have custom creatures
         When I search for creatures
         Then custom creatures should appear alongside database creatures
         And they should be marked with a "Custom" badge

       Scenario: Export custom creatures
         Given I have 5 custom creatures
         When I click "Export Custom Creatures"
         Then I should download a JSON file
         And I can share it with other GMs

       Scenario: Import custom creatures
         Given I have a custom creature JSON file
         When I import it
         Then those creatures should be added to my custom list

     Priority: 🟢 Low

     Effort Estimate: Medium-Large (5-7 days)

     ---
     Feature Request #8: Quality of Life Improvements

     Overview

     Small UX improvements identified from competitive analysis.

     BDD Acceptance Criteria

     Feature: HP Math Expressions
       Scenario: Subtract damage with expression
         Given a combatant has 80 HP
         When I type "80-16" in the HP field
         And I press Enter
         Then HP should update to 64

     Feature: Keyboard Shortcuts
       Scenario: Advance turn with keyboard
         Given I am in active combat
         When I press "N" or "Space"
         Then the turn should advance to the next combatant

     Feature: Bulk Damage
       Scenario: Apply damage to multiple targets
         Given I select 3 combatants
         When I click "Apply Damage"
         And I enter "15"
         Then all 3 should take 15 damage

     Feature: Undo/Redo
       Scenario: Undo HP change
         Given I just dealt 20 damage to a combatant
         When I press Ctrl+Z
         Then the damage should be reversed

     Priority: 🟢 Low (individually)

     Effort Estimate: Varies (1-2 days each)

     ---
     Appendix A: Competitive Feature Matrix

     | Feature               | Our App | Pathbuilder Encounters | Pathfinder Dashboard |
     |-----------------------|---------|------------------------|----------------------|
     | Encounter Builder     | ✅      | ✅                     | ✅                   |
     | XP Calculation        | ✅      | ✅                     | ✅                   |
     | Creature Database     | ✅      | ✅                     | ✅                   |
     | Elite/Weak Variants   | ✅      | ✅                     | ✅                   |
     | Combat Tracker        | ✅      | ❌                     | ✅                   |
     | Condition Tracking    | ✅      | ❌                     | ✅                   |
     | Roll History          | ✅      | ✅                     | ✅                   |
     | Pathbuilder Import    | ❌      | N/A                    | ✅                   |
     | Hazards               | ❌      | ✅                     | ❌                   |
     | Player View           | ❌      | ❌                     | ✅                   |
     | Reference Sheet       | ❌      | ❌                     | ✅                   |
     | Campaign Organization | ❌      | ✅                     | ❌                   |
     | Random Encounters     | ❌      | ✅                     | ❌                   |
     | Custom Creatures      | ❌      | ✅                     | ✅                   |
     | Cloud Sync            | ❌      | ✅                     | ✅                   |
     | User Accounts         | ❌      | ✅                     | ❌                   |
     | Accessibility Modes   | ❌      | ❌                     | ✅                   |

     ---
     Appendix B: Recommended Roadmap

     Phase 1: Core Gaps (High Priority)

     | Feature                      | Effort   | Dependencies           |
     |------------------------------|----------|------------------------|
     | Pathbuilder Character Import | 3-5 days | None                   |
     | Hazard Support               | 5-8 days | Hazard data collection |

     Phase 2: Table Experience (Medium Priority)

     | Feature               | Effort   | Dependencies   |
     |-----------------------|----------|----------------|
     | Player View           | 3-5 days | Vue Router     |
     | GM Reference Sheet    | 2-4 days | Reference data |
     | Campaign Organization | 2-3 days | None           |

     Phase 3: Power Features (Low Priority)

     | Feature                    | Effort        | Dependencies |
     |----------------------------|---------------|--------------|
     | Random Encounter Generator | 3-4 days      | None         |
     | Custom Creature Creator    | 5-7 days      | None         |
     | QoL Improvements           | 1-2 days each | None         |

     Future Consideration

     - Cloud storage & user accounts (significant infrastructure)
     - Accessibility modes
     - Mobile app version

     ---
     Appendix C: Pathbuilder JSON Schema Reference

     Based on the sample JSON provided, key fields for import:

     {
       "success": true,
       "build": {
         "name": "Yo Yo",
         "class": "Mystic",
         "level": 7,
         "ancestry": "Ysoki",
         "abilities": {
           "str": 10, "dex": 16, "con": 14,
           "int": 18, "wis": 18, "cha": 10
         },
         "attributes": {
           "ancestryhp": 6,
           "classhp": 6,
           "bonushp": 0,
           "bonushpPerLevel": 0
         },
         "proficiencies": {
           "perception": 2,
           "fortitude": 4,
           "reflex": 4,
           "will": 4
         },
         "acTotal": {
           "acTotal": 24
         }
       }
     }

     HP Calculation:
     maxHP = ancestryhp + (classhp + conMod + bonushpPerLevel) × level + bonushp

     Modifier Calculation:
     modifier = abilityMod + level + (proficiency × 2)
     // where proficiency: 0=untrained, 2=trained, 4=expert, 6=master, 8=legendary


      Document Structure

  | Section                  | Content                                                   |
  |--------------------------|-----------------------------------------------------------|
  | User Story               | As a [role], I want [feature], so that [benefit]          |
  | Business Justification   | Why this feature matters                                  |
  | BDD Scenarios            | Full Gherkin Given/When/Then scenarios                    |
  | Technical Implementation | TypeScript interfaces, file changes, architecture options |
  | Effort Estimates         | Days to implement                                         |

  Highlights

  Feature #1 (Pathbuilder Import) - 7 scenarios covering:
  - Happy path import
  - Stat extraction
  - SF2e class handling
  - Invalid JSON rejection
  - Missing field handling
  - Multiple character import

  Feature #2 (Hazards) - 12 scenarios with:
  - Scenario Outlines for XP calculation tables
  - Simple vs Complex hazard handling
  - Combat tracker integration

  Feature #3 (Player View) - 12 scenarios covering:
  - Real-time sync
  - Information hiding
  - Responsive design (mobile + TV)

  Appendices include:
  - Competitive feature matrix
  - Roadmap with dependencies
  - Pathbuilder JSON schema + calculation formulas

  