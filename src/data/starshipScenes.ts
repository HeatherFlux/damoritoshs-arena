/**
 * Official Starship Scenes from Archives of Nethys
 * Source: SF2e GM Core + Guilt of the Grave World
 *
 * Each scene includes its own availableRoles and starshipActions,
 * matching the published stat blocks exactly.
 */

import type { SavedScene, ThreatRoutine, StarshipAction } from '../types/starship'

// ============ Shared Actions (reused across scenes) ============

function patchJob(craftingDC: number, athleticsDC: number): StarshipAction {
  return {
    id: 'patch-job',
    name: 'Patch Job',
    actionCost: 2,
    role: 'engineer',
    skills: ['Crafting', 'Athletics'],
    dc: craftingDC,
    description: `Crafting DC ${craftingDC} or Athletics DC ${athleticsDC}. Repair hull damage.`,
    outcomes: {
      criticalSuccess: 'The starship regains 2d8 Hit Points and loses any persistent damage conditions.',
      success: 'The starship regains 2d8 Hit Points.',
      failure: 'The damage is too severe for quick repairs.',
      criticalFailure: 'The repair attempt causes a small explosion. The starship takes 1d6 damage.'
    }
  }
}

function scan(computersDC: number, magicDC: number, vpName: string): StarshipAction {
  return {
    id: 'scan',
    name: 'Scan',
    actionCost: 2,
    role: 'magic_officer|science_officer',
    skills: ['Computers', 'Arcana', 'Nature', 'Occultism', 'Religion'],
    dc: computersDC,
    description: `Computers DC ${computersDC} or Arcana/Nature/Occultism/Religion DC ${magicDC}. Gather intelligence.`,
    outcomes: {
      criticalSuccess: `Gain 2 ${vpName}.`,
      success: `Gain 1 ${vpName}.`,
      failure: 'No useful data obtained.',
      criticalFailure: `Lose 1 ${vpName}.`
    }
  }
}

function tacticalWithdrawal(pilotingDC: number, perceptionDC: number, vpName: string): StarshipAction {
  return {
    id: 'tactical-withdrawal',
    name: 'Tactical Withdrawal',
    actionCost: 2,
    role: 'pilot',
    skills: ['Piloting', 'Perception'],
    dc: pilotingDC,
    description: `Piloting DC ${pilotingDC} or Perception DC ${perceptionDC}. Create distance from threats.`,
    outcomes: {
      criticalSuccess: `Gain 2 ${vpName}.`,
      success: `Gain 1 ${vpName}.`,
      failure: 'Unable to break away.',
      criticalFailure: `Lose 1 ${vpName}.`
    }
  }
}

function avoidAsteroids(dc: number): StarshipAction {
  return {
    id: 'avoid-asteroids',
    name: 'Avoid Asteroids',
    actionCost: 2,
    role: 'pilot',
    skills: ['Piloting'],
    dc: dc,
    description: `Piloting DC ${dc}. Navigate around tumbling asteroids.`,
    outcomes: {
      criticalSuccess: 'The starship is unaffected by the asteroid field\'s next routine and gains +1 to AC until next turn.',
      success: 'The starship is unaffected by the asteroid field\'s next routine.',
      failure: 'The asteroids are unavoidable. The field\'s routine affects the ship normally.',
      criticalFailure: 'The starship takes damage as though affected by the asteroid field\'s routine with a critical failure on the save.'
    }
  }
}

// ============ Threat Routines ============

const LIGHT_ASTEROID_ROUTINE: ThreatRoutine = {
  actionsPerTurn: 1,
  description: 'Tumbling asteroids batter all ships passing through.',
  actions: [{
    id: 'asteroid-collision',
    name: 'Asteroid Collision',
    actionCost: 1,
    type: 'ability',
    damage: '1d6',
    damageType: 'bludgeoning',
    vsDefense: 'Reflex DC',
    dc: 15,
    description: 'All starships take bludgeoning damage (basic Reflex). Negated if pilot used Avoid Asteroids.',
    effectOnCriticalSuccess: 'No damage.',
    effectOnSuccess: 'Half damage.',
    effectOnFailure: 'Full damage.',
    effectOnCriticalFailure: 'Double damage.'
  }]
}

const AMARANTH_L1_ROUTINE: ThreatRoutine = {
  actionsPerTurn: 2,
  description: 'The Amaranth scans, then fires its antimatter beam.',
  actions: [
    {
      id: 'disruptive-scan',
      name: 'Disruptive Scan',
      actionCost: 1,
      type: 'skill_check',
      skill: 'Arcana',
      vsDefense: 'Will DC',
      description: 'Arcana check vs PC Will DC. Success grants off-guard condition.',
      effectOnSuccess: 'PC starship gains off-guard until round end.',
      effectOnCriticalSuccess: 'As success, and one crew member is frightened 1.'
    },
    {
      id: 'antimatter-beam',
      name: 'Antimatter Beam',
      actionCost: 1,
      type: 'attack',
      attackBonus: 9,
      damage: '2d6+3',
      damageType: 'void',
      description: 'Antimatter beam Strike.'
    }
  ]
}

const PALE_BUTCHER_ROUTINE: ThreatRoutine = {
  actionsPerTurn: 2,
  description: 'The raider outmaneuvers, then fires its plasma cannon.',
  actions: [
    {
      id: 'outmaneuver',
      name: 'Outmaneuver',
      actionCost: 1,
      type: 'skill_check',
      skill: 'Piloting',
      vsDefense: 'Reflex DC',
      description: 'Piloting check vs target\'s Reflex DC. Success grants off-guard.',
      effectOnSuccess: 'PC starship gains off-guard until round end.',
      effectOnCriticalSuccess: 'As success, and the raider gains +2 circumstance to AC until its next turn.'
    },
    {
      id: 'light-plasma-cannon',
      name: 'Light Plasma Cannon',
      actionCost: 1,
      type: 'attack',
      attackBonus: 9,
      damage: '1d10+4',
      damageType: 'fire',
      description: 'Light plasma cannon Strike.',
      conditionalDamage: '+2 persistent electricity vs off-guard targets'
    }
  ]
}

const AMARANTH_L4_ROUTINE: ThreatRoutine = {
  actionsPerTurn: 2,
  description: 'The Amaranth disrupts, then fires its antimatter beam.',
  actions: [
    {
      id: 'disruptive-energy',
      name: 'Disruptive Magical Energy',
      actionCost: 1,
      type: 'skill_check',
      skill: 'Arcana',
      vsDefense: 'Will DC',
      description: 'Arcana check vs target role\'s Will DC.',
      effectOnSuccess: 'Target role has glitching 1 until round end.',
      effectOnCriticalSuccess: 'Target role has glitching 2 until round end.'
    },
    {
      id: 'antimatter-beam-l4',
      name: 'Antimatter Beam',
      actionCost: 1,
      type: 'attack',
      attackBonus: 9,
      damage: '2d6+3',
      damageType: 'void',
      description: 'Antimatter beam Strike.'
    }
  ]
}

const CORSAIR_FIGHTER_ROUTINE: ThreatRoutine = {
  actionsPerTurn: 2,
  description: 'The corsair dogfights, then fires its laser cannon.',
  actions: [
    {
      id: 'dogfight',
      name: 'Dogfight',
      actionCost: 1,
      type: 'skill_check',
      skill: 'Piloting',
      vsDefense: 'Reflex DC',
      description: 'Piloting check vs PC pilot\'s DC.',
      effectOnSuccess: 'PC starship gains off-guard until round end.',
      effectOnCriticalSuccess: 'As success, and the corsair gains +2 AC until its next turn.'
    },
    {
      id: 'laser-cannon',
      name: 'Laser Cannon',
      actionCost: 1,
      type: 'attack',
      attackBonus: 6,
      damage: '1d6+2',
      damageType: 'fire',
      description: 'Laser cannon Strike.'
    }
  ]
}

const NECRODRONE_ROUTINE: ThreatRoutine = {
  actionsPerTurn: 2,
  description: 'The necrodrone swarm scans and attacks.',
  actions: [
    {
      id: 'alert-scan',
      name: 'Alert Scan',
      actionCost: 1,
      type: 'skill_check',
      skill: 'Perception',
      vsDefense: 'Reflex DC',
      description: 'Scans against starship Reflex DC. At 8+ Alert Points, Call Reinforcements activates.',
      effectOnSuccess: '+1 Alert Point.',
      effectOnCriticalSuccess: '+2 Alert Points.',
      effectOnFailure: 'No effect.'
    },
    {
      id: 'light-antimatter-beam',
      name: 'Light Antimatter Beam',
      actionCost: 1,
      type: 'attack',
      attackBonus: 12,
      damage: '2d6+3',
      damageType: 'void',
      description: 'Light antimatter beam Strike.'
    }
  ]
}

const COLLAPSING_STAR_ROUTINE: ThreatRoutine = {
  actionsPerTurn: 1,
  description: 'The dying star lashes out with solar flares. DC 10 flat check: success = 1 Nova Point, crit = 2. At 8+, Stellar Implosion triggers.',
  actions: [{
    id: 'solar-flare',
    name: 'Solar Flare',
    actionCost: 1,
    type: 'ability',
    damage: '2d10+10',
    damageType: 'fire',
    vsDefense: 'Reflex DC',
    dc: 25,
    description: 'Deals 2d10+10 fire damage (DC 25 basic Reflex). Also DC 10 flat check for Nova Points.',
    effectOnCriticalSuccess: 'No damage.',
    effectOnSuccess: 'Half damage.',
    effectOnFailure: 'Full damage.',
    effectOnCriticalFailure: 'Double damage.'
  }]
}

const ELEMENTAL_HOST_ROUTINE: ThreatRoutine = {
  actionsPerTurn: 2,
  description: 'The elemental swarm attacks and gorges on stellar energy.',
  actions: [
    {
      id: 'swarm-flyby',
      name: 'Swarm Flyby',
      actionCost: 1,
      type: 'attack',
      attackBonus: 15,
      damage: '2d8+8',
      damageType: 'fire',
      description: 'Swarm flyby Strike.',
      conditionalDamage: 'On hit: additional 2d12+10 fire (DC 24 basic Fortitude)'
    },
    {
      id: 'gorge',
      name: 'Gorge on Star',
      actionCost: 1,
      type: 'ability',
      description: 'Gorge on stellar energy. All Scan Star checks take -4 penalty while gorging.',
      effectOnSuccess: 'Scan Star checks take -4 penalty until the host is defeated.'
    }
  ]
}

const SWARM_INVADERS_ROUTINE: ThreatRoutine = {
  actionsPerTurn: 3,
  description: 'The Swarm fires biocannons, then ingests crowd members.',
  actions: [
    {
      id: 'biocannon',
      name: 'Biocannon',
      actionCost: 1,
      type: 'attack',
      attackBonus: 24,
      damage: '3d10+10',
      damageType: 'fire',
      description: 'Biocannon Strike against PC starship.'
    },
    {
      id: 'ingest-crowd',
      name: 'Ingest Crowd Members',
      actionCost: 2,
      type: 'ability',
      damage: '5d8',
      damageType: 'acid',
      vsDefense: 'Fortitude DC',
      dc: 28,
      description: '5d8 acid/slashing damage (DC 28 Fort). Instant death for crowd members.',
      effectOnCriticalSuccess: 'No damage, crowd evacuated from area.',
      effectOnSuccess: 'Half damage.',
      effectOnFailure: 'Full damage.',
      effectOnCriticalFailure: 'Double damage and panic penalty increases.'
    }
  ]
}

// ============ Official Scenes ============

export const OFFICIAL_SCENES: SavedScene[] = [

  // ---- Asteroid Field Chase (Level 1) ----
  {
    id: 'aon-asteroid-field-chase',
    name: 'Asteroid Field Chase',
    level: 1,
    description: 'A Corpse Fleet cruiser emerges from behind an asteroid and fires on the PCs\' starship! Source: Guilt of the Grave World.',
    victoryCondition: 'victory_points',
    vpRequired: 5,
    customCondition: 'Defeat the Amaranth (reduce HP to 0) OR earn 5+ Escape Points.',
    availableRoles: ['engineer', 'gunner', 'gunner', 'magic_officer', 'pilot', 'science_officer'],
    starshipActions: [
      {
        id: 'missile-launcher-l1', name: 'Missile Launcher', actionCost: 2, role: 'gunner',
        skills: [], isAttack: true, proficiency: 'martial', damage: '1d6+3 fire',
        description: 'Fire the ship\'s missile launcher.',
        outcomes: { criticalSuccess: 'Deal double damage.', success: 'Deal 1d6+3 fire damage.', failure: 'Miss.', criticalFailure: 'Miss. Weapons overheat; -2 to next attack.' }
      },
      {
        id: 'machine-gun-l1', name: 'Machine Gun', actionCost: 2, role: 'gunner',
        skills: [], isAttack: true, proficiency: 'martial', damage: '1d6+3 piercing',
        description: 'Fire the ship\'s machine gun.',
        outcomes: { criticalSuccess: 'Deal double damage.', success: 'Deal 1d6+3 piercing damage.', failure: 'Miss.', criticalFailure: 'Miss. Weapons overheat; -2 to next attack.' }
      },
      avoidAsteroids(15),
      patchJob(15, 18),
      scan(15, 16, 'Escape Points'),
      tacticalWithdrawal(15, 18, 'Escape Points')
    ],
    starship: {
      id: 'aon-rc-hpr', name: 'RC-HPR (Rock Hopper)', level: 1,
      ac: 15, fortitude: 11, reflex: 6,
      maxShields: 5, currentShields: 5, shieldRegen: 3,
      maxHP: 26, currentHP: 26, bonuses: { 'Computers': 1 }
    },
    threats: [
      {
        id: 'aon-amaranth-l1', name: 'Amaranth (Corpse Fleet Cruiser)', type: 'enemy_ship', level: 2,
        maxHP: 50, currentHP: 50, maxShields: 5, currentShields: 5, shieldRegen: 5,
        ac: 18, fortitude: 12, reflex: 6,
        initiativeSkill: 'Arcana', initiativeBonus: 14, skills: { Arcana: 14, Piloting: 12 },
        description: 'A Corpse Fleet cruiser. Scans with disruptive magical energy, then fires antimatter beam.',
        routine: AMARANTH_L1_ROUTINE,
        isDefeated: false, routineActionsUsed: []
      },
      {
        id: 'aon-asteroid-field-l1', name: 'Asteroid Field', type: 'hazard', level: 1,
        initiativeSkill: 'Stealth', initiativeBonus: 5,
        description: 'All starships take 1d6 bludgeoning damage each round (DC 15 basic Reflex).',
        routine: LIGHT_ASTEROID_ROUTINE,
        specialAbilities: [{ name: 'Captain Concierge', description: 'The Rock Hopper\'s AI grants +1 bonus to one occupied role per round, or performs an unoccupied role at +7.' }],
        isDefeated: false, routineActionsUsed: []
      }
    ],
    roles: [], savedAt: Date.now()
  },

  // ---- Asteroid Ambush (Level 2) ----
  {
    id: 'aon-asteroid-ambush',
    name: 'Asteroid Ambush',
    level: 2,
    description: 'The PCs are scanning a light asteroid field for resources when a stealthy Corpse Fleet raider attacks! Source: GM Core.',
    victoryCondition: 'victory_points',
    vpRequired: 5,
    customCondition: 'Defeat the Corpse Fleet raider (reduce HP to 0) OR earn 5+ Escape Points.',
    availableRoles: ['engineer', 'gunner', 'gunner', 'pilot', 'pilot', 'science_officer'],
    starshipActions: [
      {
        id: 'mining-laser', name: 'Mining Laser', actionCost: 2, role: 'gunner',
        skills: [], isAttack: true, proficiency: 'martial', damage: '1d8+4 fire', traits: ['deadly d8'],
        description: 'Fire the mining laser. Martial weapon, deadly d8 trait.',
        outcomes: { criticalSuccess: 'Deal double damage plus deadly d8.', success: 'Deal 1d8+4 fire damage.', failure: 'Miss.', criticalFailure: 'Miss. Weapons overheat; -2 to next attack.' }
      },
      { ...avoidAsteroids(15), role: 'pilot|science_officer', skills: ['Computers', 'Piloting'], description: 'Computers or Piloting DC 15. Navigate around asteroids.' },
      patchJob(16, 18),
      tacticalWithdrawal(16, 20, 'Escape Points')
    ],
    starship: {
      id: 'aon-rc-hpr-l2', name: 'RC-HPR (Rock Hopper)', level: 2,
      ac: 15, fortitude: 11, reflex: 6,
      maxShields: 5, currentShields: 5, shieldRegen: 5,
      maxHP: 35, currentHP: 35, bonuses: { 'Computers': 1 }
    },
    threats: [
      {
        id: 'aon-pale-butcher', name: 'Pale Butcher Scout (Corpse Fleet Raider)', type: 'enemy_ship', level: 2,
        maxHP: 25, currentHP: 25, maxShields: 5, currentShields: 5, shieldRegen: 2,
        ac: 18, fortitude: 6, reflex: 10,
        initiativeSkill: 'Piloting', initiativeBonus: 9, skills: { Piloting: 9 },
        description: 'A stealthy Corpse Fleet raider.',
        routine: PALE_BUTCHER_ROUTINE,
        isDefeated: false, routineActionsUsed: []
      },
      {
        id: 'aon-asteroid-field-l2', name: 'Light Asteroid Field', type: 'hazard', level: 2,
        initiativeSkill: 'Stealth', initiativeBonus: 5,
        description: 'All starships take 2d6 bludgeoning damage each round (DC 15 basic Reflex).',
        routine: { ...LIGHT_ASTEROID_ROUTINE, actions: [{ ...LIGHT_ASTEROID_ROUTINE.actions[0], id: 'asteroid-collision-2d6', damage: '2d6' }] },
        isDefeated: false, routineActionsUsed: []
      }
    ],
    roles: [], savedAt: Date.now()
  },

  // ---- Approaching Barrow (Level 4) ----
  {
    id: 'aon-approaching-barrow',
    name: 'Approaching Barrow',
    level: 4,
    description: 'The PCs dodge patrols and sabotage necrodrones through Corpse Fleet space. Source: Guilt of the Grave World.',
    victoryCondition: 'victory_points',
    vpRequired: 6,
    customCondition: 'Obtain 6+ Infiltration Points, then use Prepare for Landing (3-action) to succeed.',
    availableRoles: ['captain', 'engineer', 'gunner', 'gunner', 'magic_officer', 'pilot', 'science_officer'],
    starshipActions: [
      {
        id: 'missile-launcher-l4', name: 'Missile Launcher', actionCost: 2, role: 'gunner',
        skills: [], isAttack: true, proficiency: 'martial', damage: '2d6+8 fire',
        description: 'Fire the ship\'s missile launcher.',
        outcomes: { criticalSuccess: 'Deal double damage.', success: 'Deal 2d6+8 fire damage.', failure: 'Miss.', criticalFailure: 'Miss. Weapons overheat; -2 to next attack.' }
      },
      {
        id: 'machine-turret', name: 'Machine Turret', actionCost: 2, role: 'gunner',
        skills: [], isAttack: true, proficiency: 'martial', damage: '2d6+8 piercing',
        description: 'Fire the ship\'s machine turret (area weapon).',
        outcomes: { criticalSuccess: 'Deal double damage.', success: 'Deal 2d6+8 piercing damage.', failure: 'Miss.', criticalFailure: 'Miss. Weapons overheat; -2 to next attack.' }
      },
      {
        id: 'fly-under-radar', name: 'Fly Under the Radar', actionCost: 2, role: 'pilot',
        skills: ['Piloting'], dc: 19,
        description: 'Piloting DC 19. Sneak past Corpse Fleet patrols.',
        outcomes: { criticalSuccess: 'Gain 2 Infiltration Points.', success: 'Gain 1 Infiltration Point.', failure: 'No progress.', criticalFailure: 'Lose 1 Infiltration Point.' }
      },
      {
        id: 'hack-defenses', name: 'Hack Defenses', actionCost: 2, role: 'magic_officer|science_officer',
        skills: ['Arcana', 'Computers', 'Nature', 'Occultism', 'Religion'], dc: 22,
        description: 'Arcana/Computers/Nature/Occultism/Religion DC 22. Sabotage necrodrone defenses.',
        outcomes: { criticalSuccess: 'Gain 2 Infiltration Points.', success: 'Gain 1 Infiltration Point.', failure: 'No progress.', criticalFailure: 'Lose 1 Infiltration Point.' }
      },
      {
        id: 'inspire-crew-l4', name: 'Inspire Crew', actionCost: 2, role: 'captain',
        skills: ['Diplomacy', 'Intimidation'], dc: 20,
        description: 'Diplomacy or Intimidation DC 20. Rally your crew.',
        outcomes: { criticalSuccess: 'Choose two allies. Each gains a +2 status bonus to their next check.', success: 'Choose one ally. They gain a +2 status bonus to their next check.', failure: 'No effect.', criticalFailure: 'The next crew member to act takes a -1 status penalty to their check.' }
      },
      {
        id: 'prepare-for-landing', name: 'Prepare for Landing', actionCost: 3, role: 'captain|pilot',
        skills: [], description: 'Requires 6+ Infiltration Points. Activate landing sequence to end the encounter.',
        outcomes: { criticalSuccess: 'Landing successful. Encounter ends in victory.', success: 'Landing successful. Encounter ends in victory.', failure: 'Cannot land yet \u2014 need more Infiltration Points.', criticalFailure: 'Cannot land yet.' }
      }
    ],
    starship: {
      id: 'aon-explorer-l4', name: 'Explorer', level: 4,
      ac: 20, fortitude: 14, reflex: 10,
      maxShields: 5, currentShields: 5, shieldRegen: 5,
      maxHP: 65, currentHP: 65, bonuses: {}
    },
    threats: [
      {
        id: 'aon-necrodrone-swarm', name: 'Necrodrone Swarm', type: 'enemy_ship', level: 4,
        maxHP: 42, currentHP: 42, ac: 18, fortitude: 4, reflex: 6,
        initiativeSkill: 'Perception', initiativeBonus: 14, skills: { Perception: 14, Piloting: 11 },
        description: 'Corpse Fleet necrodrone patrol. Accumulates Alert Points; at 8+ calls reinforcements.',
        routine: NECRODRONE_ROUTINE,
        specialAbilities: [
          { name: 'Call Reinforcements', description: 'At 8+ Alert Points, summons a Corpse Fleet cruiser.', trigger: '8+ Alert Points' },
          { name: 'Necromantic Interference', description: 'Each PC in a role must succeed at DC 20 Will or become frightened 2 for 1 minute.' }
        ],
        isDefeated: false, routineActionsUsed: []
      }
    ],
    roles: [], savedAt: Date.now()
  },

  // ---- Cosmic Sortie (Level 4) ----
  {
    id: 'aon-cosmic-sortie',
    name: 'Cosmic Sortie',
    level: 4,
    description: 'Four daring corsair fighters challenge the PCs to a skirmish. Source: Guilt of the Grave World.',
    victoryCondition: 'defeat',
    customCondition: 'Defeat one or more corsair fighters.',
    availableRoles: ['captain', 'engineer', 'gunner', 'gunner', 'magic_officer', 'pilot', 'science_officer'],
    starshipActions: [
      {
        id: 'missile-launcher-sortie', name: 'Missile Launcher', actionCost: 2, role: 'gunner',
        skills: [], isAttack: true, proficiency: 'martial', damage: '2d6+8 fire',
        description: 'Fire the ship\'s missile launcher.',
        outcomes: { criticalSuccess: 'Deal double damage.', success: 'Deal 2d6+8 fire damage.', failure: 'Miss.', criticalFailure: 'Miss. Weapons overheat; -2 to next attack.' }
      },
      {
        id: 'machine-gun-sortie', name: 'Machine Gun', actionCost: 2, role: 'gunner',
        skills: [], isAttack: true, proficiency: 'martial', damage: '2d6+8 piercing',
        description: 'Fire the ship\'s machine gun.',
        outcomes: { criticalSuccess: 'Deal double damage.', success: 'Deal 2d6+8 piercing damage.', failure: 'Miss.', criticalFailure: 'Miss. Weapons overheat; -2 to next attack.' }
      },
      {
        id: 'bold-talk', name: 'Bold Talk', actionCost: 2, role: 'captain',
        skills: ['Deception', 'Intimidation'], dc: 18,
        description: 'Deception or Intimidation DC 18. Taunt the enemy crew.',
        outcomes: { criticalSuccess: 'All enemy starship roles are frightened 2 until the beginning of your next turn.', success: 'All enemy starship roles are frightened 1 until the beginning of your next turn.', failure: 'No effect.', criticalFailure: 'Your crew is rattled. One ally takes -1 to their next check.' }
      },
      {
        id: 'evasive-maneuvers', name: 'Evasive Maneuvers', actionCost: 2, role: 'pilot',
        skills: ['Piloting', 'Perception'], dc: 15,
        description: 'Piloting DC 15 or Perception DC 18. Dodge incoming fire.',
        outcomes: { criticalSuccess: 'The ship gains a +2 circumstance bonus to AC until the beginning of your next turn.', success: 'The ship gains a +1 circumstance bonus to AC until the beginning of your next turn.', failure: 'No effect.', criticalFailure: 'The ship is off-guard until the beginning of your next turn.' }
      },
      patchJob(15, 18),
      scan(15, 16, 'Escape Points')
    ],
    starship: {
      id: 'aon-explorer-sortie', name: 'Explorer', level: 4,
      ac: 20, fortitude: 14, reflex: 10,
      maxShields: 5, currentShields: 5, shieldRegen: 5,
      maxHP: 65, currentHP: 65, bonuses: {}
    },
    threats: Array.from({ length: 4 }, (_, i) => ({
      id: `aon-corsair-${i + 1}`, name: `Corsair Fighter ${i + 1}`, type: 'enemy_ship' as const, level: 2,
      maxHP: 16, currentHP: 16, maxShields: 3, currentShields: 3, shieldRegen: 3,
      ac: 16, fortitude: 2, reflex: 4,
      initiativeSkill: 'Piloting', initiativeBonus: 8, skills: { Piloting: 8 },
      description: 'A corsair fighter. Dogfights then fires laser cannon.',
      routine: CORSAIR_FIGHTER_ROUTINE,
      isDefeated: false, routineActionsUsed: [] as string[]
    })),
    roles: [], savedAt: Date.now()
  },

  // ---- Fateful Reunion (Level 4) ----
  {
    id: 'aon-fateful-reunion',
    name: 'Fateful Reunion',
    level: 4,
    description: 'The Corpse Fleet cruiser from Chapter 1 returns for a final showdown! Source: Guilt of the Grave World.',
    victoryCondition: 'defeat',
    availableRoles: ['captain', 'engineer', 'gunner', 'gunner', 'magic_officer', 'pilot', 'science_officer'],
    starshipActions: [
      {
        id: 'missile-launcher-reunion', name: 'Missile Launcher', actionCost: 2, role: 'gunner',
        skills: [], isAttack: true, proficiency: 'martial', damage: '2d6+8 fire',
        description: 'Fire the ship\'s missile launcher.',
        outcomes: { criticalSuccess: 'Deal double damage.', success: 'Deal 2d6+8 fire damage.', failure: 'Miss.', criticalFailure: 'Miss. Weapons overheat; -2 to next attack.' }
      },
      {
        id: 'machine-gun-reunion', name: 'Machine Gun', actionCost: 2, role: 'gunner',
        skills: [], isAttack: true, proficiency: 'martial', damage: '2d6+8 piercing',
        description: 'Fire the ship\'s machine gun.',
        outcomes: { criticalSuccess: 'Deal double damage.', success: 'Deal 2d6+8 piercing damage.', failure: 'Miss.', criticalFailure: 'Miss. Weapons overheat; -2 to next attack.' }
      },
      {
        id: 'bold-talk-reunion', name: 'Bold Talk', actionCost: 2, role: 'captain',
        skills: ['Deception', 'Intimidation'], dc: 18,
        description: 'Deception or Intimidation DC 18. Taunt the enemy crew.',
        outcomes: { criticalSuccess: 'All enemy roles are frightened 2 until beginning of your next turn.', success: 'All enemy roles are frightened 1 until beginning of your next turn.', failure: 'No effect.', criticalFailure: 'Your crew is rattled. One ally takes -1 to their next check.' }
      },
      {
        id: 'evasive-maneuvers-reunion', name: 'Evasive Maneuvers', actionCost: 2, role: 'pilot',
        skills: ['Piloting', 'Perception'], dc: 15,
        description: 'Piloting DC 15 or Perception DC 18.',
        outcomes: { criticalSuccess: '+2 circumstance bonus to AC until beginning of your next turn.', success: '+1 circumstance bonus to AC until beginning of your next turn.', failure: 'No effect.', criticalFailure: 'Ship is off-guard until beginning of your next turn.' }
      },
      patchJob(15, 18),
      scan(15, 16, 'Escape Points')
    ],
    starship: {
      id: 'aon-explorer-reunion', name: 'Explorer', level: 4,
      ac: 20, fortitude: 14, reflex: 10,
      maxShields: 5, currentShields: 5, shieldRegen: 5,
      maxHP: 65, currentHP: 65, bonuses: {}
    },
    threats: [{
      id: 'aon-amaranth-l4', name: 'Amaranth (Corpse Fleet Cruiser)', type: 'enemy_ship', level: 4,
      maxHP: 50, currentHP: 50, maxShields: 5, currentShields: 5, shieldRegen: 5,
      ac: 18, fortitude: 12, reflex: 6,
      initiativeSkill: 'Arcana', initiativeBonus: 14, skills: { Arcana: 14, Piloting: 12 },
      description: 'The Amaranth returns. Disrupts with magical energy, then fires its antimatter beam.',
      routine: AMARANTH_L4_ROUTINE,
      specialAbilities: [{ name: 'Captain Concierge', description: 'Ship AI grants +1 bonus to one occupied role per round, or performs an unoccupied role at +7.' }],
      isDefeated: false, routineActionsUsed: []
    }],
    roles: [], savedAt: Date.now()
  },

  // ---- Scanning a Dying Sun (Level 7) ----
  {
    id: 'aon-scanning-dying-sun',
    name: 'Scanning a Dying Sun',
    level: 7,
    description: 'The PCs fly an explorer to monitor a star\'s final moments before supernova. Fire elementals complicate matters. Source: GM Core.',
    victoryCondition: 'victory_points',
    vpRequired: 6,
    customCondition: 'Obtain 6+ Scan Points via Scan Star, then escape with Tactical Withdrawal (3-action).',
    availableRoles: ['captain', 'gunner', 'gunner', 'pilot', 'science_officer', 'science_officer'],
    starshipActions: [
      {
        id: 'torpedo-launcher', name: 'Torpedo Launcher', actionCost: 2, role: 'gunner',
        skills: [], isAttack: true, proficiency: 'martial', damage: '2d10+8 piercing',
        traits: ['persistent electricity 1d8'],
        description: 'Fire torpedoes. Deals 2d10+8 piercing plus 1d8 persistent electricity.',
        outcomes: { criticalSuccess: 'Deal double damage plus persistent electricity.', success: 'Deal 2d10+8 piercing + 1d8 persistent electricity.', failure: 'Miss.', criticalFailure: 'Miss. Torpedo misfires; -2 to next attack.' }
      },
      {
        id: 'flak-cannon', name: 'Flak Cannon', actionCost: 2, role: 'gunner',
        skills: [], isAttack: true, proficiency: 'martial', damage: '2d6+6 slashing',
        description: 'Fire the flak cannon. Deals 2d6+6 slashing.',
        outcomes: { criticalSuccess: 'Deal double damage.', success: 'Deal 2d6+6 slashing damage.', failure: 'Miss.', criticalFailure: 'Miss. Weapons jam.' }
      },
      {
        id: 'deft-maneuvers', name: 'Deft Maneuvers', actionCost: 2, role: 'pilot',
        skills: ['Piloting'], dc: 25,
        description: 'Piloting DC 25. Execute a deft maneuver to protect the ship.',
        outcomes: { criticalSuccess: 'Select up to two: +2 circumstance to saves, +2 to AC, or +2 to ranged Strikes until next turn.', success: 'Choose one: +2 circumstance to saves, AC, or ranged Strikes until next turn.', failure: 'No effect.', criticalFailure: 'Ship is off-guard until next turn.' }
      },
      {
        id: 'inspire-crew-l7', name: 'Inspire Crew', actionCost: 2, role: 'captain',
        skills: ['Diplomacy', 'Intimidation'], dc: 28,
        description: 'Diplomacy or Intimidation DC 28. Rally your crew.',
        outcomes: { criticalSuccess: 'Choose two allies. Each gains a +2 status bonus to their next check.', success: 'Choose one ally. They gain a +2 status bonus to their next check.', failure: 'No effect.', criticalFailure: 'The next crew member takes a -1 status penalty.' }
      },
      {
        id: 'scan-star', name: 'Scan Star', actionCost: 2, role: 'science_officer',
        skills: ['Computers'], dc: 27,
        description: 'Computers DC 27. Gather critical data from the dying star.',
        outcomes: { criticalSuccess: 'Gain 2 Scan Points.', success: 'Gain 1 Scan Point.', failure: 'No useful data.', criticalFailure: 'Lose 1 Scan Point.' }
      },
      {
        id: 'tactical-withdrawal-escape', name: 'Tactical Withdrawal', actionCost: 3, role: 'captain|pilot',
        skills: [], description: 'Requires 6+ Scan Points. Activate the Drift engine to escape the system.',
        outcomes: { criticalSuccess: 'Escape successful.', success: 'Escape successful.', failure: 'Cannot escape yet.', criticalFailure: 'Cannot escape yet.' }
      }
    ],
    starship: {
      id: 'aon-explorer-l7', name: 'Explorer', level: 7,
      ac: 25, fortitude: 13, reflex: 18,
      maxShields: 10, currentShields: 10, shieldRegen: 5,
      maxHP: 90, currentHP: 90, bonuses: { 'Computers': 2, 'Piloting': 1 }
    },
    threats: [
      {
        id: 'aon-collapsing-star', name: 'Collapsing Star', type: 'environmental', level: 7,
        initiativeSkill: 'Stealth', initiativeBonus: 11,
        description: 'The dying star. Massive fire damage + Nova Point accumulation. At 8+ Nova Points, Stellar Implosion.',
        routine: COLLAPSING_STAR_ROUTINE,
        specialAbilities: [{ name: 'Stellar Implosion', description: 'At 8+ Nova Points, the star collapses. All ships destroyed if they don\'t escape.', trigger: '8+ Nova Points' }],
        isDefeated: false, routineActionsUsed: []
      },
      {
        id: 'aon-elemental-host', name: 'Elemental Host', type: 'enemy_ship', level: 7,
        maxHP: 90, currentHP: 90, ac: 22, fortitude: 12, reflex: 15,
        initiativeSkill: 'Piloting', initiativeBonus: 15, skills: { Piloting: 15 },
        description: 'Fire elemental swarm gorging on stellar energy. Immune to fire.',
        immunities: ['fire'], routine: ELEMENTAL_HOST_ROUTINE,
        specialAbilities: [{ name: 'Elemental Interference', description: 'While gorging, imposes -4 to Scan Star checks.' }],
        isDefeated: false, routineActionsUsed: []
      }
    ],
    roles: [], savedAt: Date.now()
  },

  // ---- Songbird Sortie (Level 12) ----
  {
    id: 'aon-songbird-sortie',
    name: 'Songbird Sortie',
    level: 12,
    description: 'A dramatic air show over Songbird Station goes wrong when a Swarm fleet attacks the concert! Source: GM Core.',
    victoryCondition: 'victory_points',
    vpRequired: 6,
    customCondition: 'Obtain 6+ Drama Points (Show Off, Trick Shot), then defeat the Swarm invaders.',
    availableRoles: ['gunner', 'gunner', 'pilot', 'pilot'],
    starshipActions: [
      {
        id: 'plasma-cannon', name: 'Plasma Cannon', actionCost: 2, role: 'gunner',
        skills: [], isAttack: true, proficiency: 'martial', damage: '3d10+5 fire',
        traits: ['persistent electricity 1d6'],
        description: 'Fire the plasma cannon. 3d10+5 fire plus 1d6 persistent electricity.',
        outcomes: { criticalSuccess: 'Deal double damage plus persistent electricity.', success: 'Deal 3d10+5 fire + 1d6 persistent electricity.', failure: 'Miss.', criticalFailure: 'Miss. Cannon overheats.' }
      },
      {
        id: 'missile-pod', name: 'Missile Pod', actionCost: 2, role: 'gunner',
        skills: [], isAttack: true, proficiency: 'simple', damage: '3d10+8 fire',
        description: 'Fire the missile pod. Simple weapon. 3d10+8 fire.',
        outcomes: { criticalSuccess: 'Deal double damage.', success: 'Deal 3d10+8 fire damage.', failure: 'Miss.', criticalFailure: 'Miss. Pod jams.' }
      },
      {
        id: 'evacuate-dance-floor', name: 'Evacuate the Dance Floor', actionCost: 2, role: 'any',
        skills: ['Diplomacy', 'Intimidation', 'Performance'], dc: 31,
        description: 'Diplomacy, Intimidation, or Performance DC 31. Clear the crowd to safety.',
        outcomes: { criticalSuccess: 'Crowd evacuates. Ignore the penalty from Panic at the Concert!', success: 'Crowd mostly evacuates. Reduce the Panic penalty to -1.', failure: 'No progress on evacuation.', criticalFailure: 'Panic worsens. The penalty from Panic at the Concert! increases to -3.' }
      },
      {
        id: 'show-off', name: 'Show Off', actionCost: 2, role: 'pilot',
        skills: ['Piloting'], dc: 30,
        description: 'Piloting DC 30. Perform daring aerial stunts for the crowd.',
        outcomes: { criticalSuccess: 'Gain 2 Drama Points.', success: 'Gain 1 Drama Point.', failure: 'No drama generated.', criticalFailure: 'Lose 1 Drama Point.' }
      },
      {
        id: 'trick-shot', name: 'Trick Shot', actionCost: 2, role: 'gunner',
        skills: ['Computers', 'Performance'], dc: 30,
        description: 'Computers or Performance DC 30. Fire a flashy shot that thrills the crowd.',
        outcomes: { criticalSuccess: 'Gain 2 Drama Points.', success: 'Gain 1 Drama Point.', failure: 'No drama generated.', criticalFailure: 'Lose 1 Drama Point.' }
      }
    ],
    starship: {
      id: 'aon-norikama-prototype', name: 'Norikama Prototype', level: 12,
      ac: 30, fortitude: 19, reflex: 25,
      maxShields: 10, currentShields: 10, shieldRegen: 5,
      maxHP: 165, currentHP: 165, bonuses: { 'Performance': 1, 'Piloting': 2 }
    },
    threats: [{
      id: 'aon-swarm-invaders', name: 'Swarm Invaders', type: 'enemy_ship', level: 12,
      maxHP: 90, currentHP: 90, ac: 30, fortitude: 12, reflex: 15,
      initiativeSkill: 'Stealth', initiativeBonus: 22, skills: { Piloting: 20, Stealth: 22 },
      description: 'Swarm fleet. Attacks starship and ingests crowd members. Acid resistance 15.',
      resistances: { acid: 15 }, routine: SWARM_INVADERS_ROUTINE,
      specialAbilities: [{ name: 'Panic at the Concert!', description: 'All Strikes take -2 (except Trick Shot) until Evacuate the Dance Floor succeeds.' }],
      isDefeated: false, routineActionsUsed: []
    }],
    roles: [], savedAt: Date.now()
  }
]

// ============ Helpers ============

export function getOfficialSceneById(sceneId: string): SavedScene | undefined {
  return OFFICIAL_SCENES.find(s => s.id === sceneId)
}

export function cloneOfficialScene(scene: SavedScene): SavedScene {
  return {
    ...scene,
    id: crypto.randomUUID(),
    starship: { ...scene.starship, id: crypto.randomUUID(), currentHP: scene.starship.maxHP, currentShields: scene.starship.maxShields },
    threats: scene.threats.map(t => ({ ...t, id: crypto.randomUUID(), currentHP: t.maxHP, currentShields: t.maxShields, isDefeated: false, routineActionsUsed: [] })),
    starshipActions: [...scene.starshipActions],
    availableRoles: [...scene.availableRoles],
    roles: [],
    savedAt: Date.now()
  }
}
