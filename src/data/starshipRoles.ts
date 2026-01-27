/**
 * Starfinder 2E Cinematic Starship Roles
 * Pre-built roles based on SF2e rules
 */

import type { StarshipRole } from '../types/starship'

export const STARSHIP_ROLES: StarshipRole[] = [
  {
    id: 'captain',
    type: 'captain',
    name: 'Captain',
    description: 'The captain coordinates the crew, inspires allies, and intimidates enemies. They are the heart of the crew, keeping morale high and directing tactical decisions.',
    primarySkills: ['Diplomacy', 'Intimidation', 'Performance'],
    actions: [
      {
        id: 'rally-crew',
        name: 'Rally Crew',
        actionCost: 2,
        skills: ['Diplomacy', 'Performance'],
        description: 'You rally your crew with an inspiring speech or display of confidence, boosting their morale and effectiveness.',
        outcomes: {
          criticalSuccess: 'Choose two crew members. Each gains a +2 circumstance bonus to their next check this round. If either rolls a critical failure, it becomes a failure instead.',
          success: 'Choose one crew member. They gain a +1 circumstance bonus to their next check this round.',
          failure: 'Your rally falls flat. No effect.',
          criticalFailure: 'Your attempt at inspiration backfires, creating doubt. One random crew member takes a -1 circumstance penalty to their next check this round.'
        }
      },
      {
        id: 'taunt-enemy',
        name: 'Taunt Enemy',
        actionCost: 2,
        skills: ['Intimidation', 'Deception'],
        description: 'You broadcast a taunt to the enemy ship, attempting to goad them into making a mistake or revealing their intentions.',
        outcomes: {
          criticalSuccess: 'The enemy captain is rattled. The enemy ship takes a -2 circumstance penalty to their next attack roll or piloting check. Additionally, the GM reveals one of the enemy\'s planned actions.',
          success: 'The enemy is distracted. The enemy ship takes a -1 circumstance penalty to their next attack roll.',
          failure: 'Your taunt has no effect.',
          criticalFailure: 'The enemy turns your taunt against you. Your gunner takes a -1 circumstance penalty to their next attack roll.'
        }
      },
      {
        id: 'demand-surrender',
        name: 'Demand Surrender',
        actionCost: 2,
        skills: ['Intimidation', 'Diplomacy'],
        description: 'You demand the enemy ship stand down, attempting to end the conflict without further violence.',
        outcomes: {
          criticalSuccess: 'The enemy is cowed. If the enemy ship is below half HP or has lost significant crew, they surrender. Otherwise, they take a -2 circumstance penalty to all checks for 1 round as they consider your offer.',
          success: 'The enemy hesitates. They take a -1 circumstance penalty to their next check while considering your demand.',
          failure: 'The enemy refuses and the battle continues.',
          criticalFailure: 'The enemy is emboldened by your perceived weakness. They gain a +1 circumstance bonus to their next attack roll.'
        }
      },
      {
        id: 'coordinate-attack',
        name: 'Coordinate Attack',
        actionCost: 2,
        skills: ['Warfare Lore', 'Society'],
        description: 'You identify a weakness in the enemy\'s defenses and direct your crew to exploit it.',
        outcomes: {
          criticalSuccess: 'You identify a critical weakness. The next attack against the target gains a +2 circumstance bonus and deals an additional die of damage on a hit.',
          success: 'You spot an opening. The next attack against the target gains a +1 circumstance bonus.',
          failure: 'You can\'t find a clear opening.',
          criticalFailure: 'Your misdirection confuses your own crew. The next attack from your ship takes a -1 circumstance penalty.'
        }
      }
    ]
  },
  {
    id: 'engineer',
    type: 'engineer',
    name: 'Engineer',
    description: 'The engineer keeps the ship running, repairs damage, and can push systems beyond their normal limits in emergencies.',
    primarySkills: ['Crafting', 'Engineering Lore'],
    actions: [
      {
        id: 'divert-power',
        name: 'Divert Power',
        actionCost: 2,
        skills: ['Crafting', 'Engineering Lore'],
        description: 'You reroute power from non-essential systems to boost a critical function.',
        outcomes: {
          criticalSuccess: 'Choose weapons, shields, or engines. That system gains a +2 circumstance bonus to related checks or effects for 1 round. Another system of your choice takes no penalty.',
          success: 'Choose weapons, shields, or engines. That system gains a +1 circumstance bonus to related checks or effects for 1 round, but another system of your choice takes a -1 penalty.',
          failure: 'The power rerouting is unstable. No effect.',
          criticalFailure: 'A power surge damages systems. One random system takes a -1 circumstance penalty for 1 round.'
        }
      },
      {
        id: 'emergency-repair',
        name: 'Emergency Repair',
        actionCost: 2,
        skills: ['Crafting', 'Engineering Lore'],
        description: 'You perform hasty repairs on damaged systems or hull breaches.',
        outcomes: {
          criticalSuccess: 'Restore 2d6 + your level HP to the ship, or fully restore one disabled system.',
          success: 'Restore 1d6 + half your level HP to the ship, or partially restore a disabled system (it functions at -2 penalty until fully repaired).',
          failure: 'The damage is too severe for quick repairs.',
          criticalFailure: 'Your repairs make things worse. The ship takes 1d6 damage from a small explosion or system feedback.'
        }
      },
      {
        id: 'boost-shields',
        name: 'Boost Shields',
        actionCost: 2,
        skills: ['Crafting', 'Engineering Lore'],
        description: 'You overcharge the shield generators to provide extra protection.',
        outcomes: {
          criticalSuccess: 'The shields surge with power. Restore shields to maximum and gain temporary shields equal to half maximum that last for 1 round.',
          success: 'Restore shields equal to the ship\'s shield regeneration value plus your level.',
          failure: 'The shield generators sputter. Restore only half the normal shield regeneration.',
          criticalFailure: 'The overload damages the shield system. Shields drop by 1d6 and don\'t regenerate next round.'
        }
      },
      {
        id: 'overclock-weapons',
        name: 'Overclock Weapons',
        actionCost: 2,
        skills: ['Crafting', 'Engineering Lore'],
        description: 'You push the weapon systems beyond their normal parameters.',
        outcomes: {
          criticalSuccess: 'Weapons deal an additional 2d6 damage on the next hit this round, and the gunner gains a +1 bonus to their attack roll.',
          success: 'Weapons deal an additional 1d6 damage on the next hit this round.',
          failure: 'The weapons can\'t handle the increased power.',
          criticalFailure: 'Weapons malfunction. The gunner takes a -2 penalty to their next attack roll.'
        }
      }
    ]
  },
  {
    id: 'gunner',
    type: 'gunner',
    name: 'Gunner',
    description: 'The gunner operates the ship\'s weapons systems, targeting enemies and defending against incoming attacks.',
    primarySkills: ['Piloting Lore', 'Athletics'],
    actions: [
      {
        id: 'fire-at-will',
        name: 'Fire at Will',
        actionCost: 2,
        skills: ['Piloting Lore', 'Athletics'],
        description: 'You unleash a barrage of weapons fire at an enemy target.',
        outcomes: {
          criticalSuccess: 'Direct hit to a vital system! Deal normal damage plus an additional 2d6, and choose one: disable a system for 1 round, or the target is off-guard until the start of your next turn.',
          success: 'Solid hit. Deal normal weapon damage to the target.',
          failure: 'Your shots go wide. No damage dealt.',
          criticalFailure: 'Catastrophic miss. Your weapons overheat and can\'t be used until the engineer repairs them or until the end of next round.'
        }
      },
      {
        id: 'precise-shot',
        name: 'Precise Shot',
        actionCost: 2,
        skills: ['Piloting Lore', 'Perception'],
        description: 'You take careful aim at a specific system on the enemy ship.',
        outcomes: {
          criticalSuccess: 'Perfect shot! Deal normal damage and disable the targeted system (weapons, engines, or shields) for 2 rounds.',
          success: 'You hit the system. Deal half normal damage and disable the targeted system for 1 round.',
          failure: 'You miss the precise target but may still graze the hull. Deal 1d6 damage.',
          criticalFailure: 'Your focus on the precise shot leaves you exposed. The enemy gains a +1 circumstance bonus to their next attack against your ship.'
        }
      },
      {
        id: 'suppressive-fire',
        name: 'Suppressive Fire',
        actionCost: 2,
        skills: ['Piloting Lore', 'Intimidation'],
        description: 'You lay down a field of fire to restrict enemy movement and actions.',
        outcomes: {
          criticalSuccess: 'The enemy is pinned down. They take a -2 circumstance penalty to all piloting checks and attack rolls until the start of your next turn, and take 1d6 damage if they attempt to move.',
          success: 'The enemy is suppressed. They take a -1 circumstance penalty to piloting checks until the start of your next turn.',
          failure: 'Your suppressive fire is ineffective.',
          criticalFailure: 'You waste ammunition and reveal your firing patterns. The enemy gains a +1 bonus to evade your next attack.'
        }
      },
      {
        id: 'point-defense',
        name: 'Point Defense',
        actionCost: 2,
        skills: ['Piloting Lore', 'Perception'],
        description: 'You ready the ship\'s point defense systems to intercept incoming attacks.',
        outcomes: {
          criticalSuccess: 'Exceptional defensive coverage. Reduce the damage from the next attack against your ship by half, and if it\'s a missile or torpedo attack, negate it entirely.',
          success: 'Good coverage. Reduce the damage from the next attack against your ship by 1d6 + your level.',
          failure: 'Your point defense systems can\'t lock on.',
          criticalFailure: 'Point defense systems misfire. Your ship takes 1d6 damage from friendly fire.'
        }
      }
    ]
  },
  {
    id: 'magic_officer',
    type: 'magic_officer',
    name: 'Magic Officer',
    description: 'The magic officer uses arcane or mystical abilities to enhance the ship, protect the crew, or hamper enemies.',
    primarySkills: ['Arcana', 'Occultism', 'Religion', 'Nature'],
    actions: [
      {
        id: 'arcane-boost',
        name: 'Arcane Boost',
        actionCost: 2,
        skills: ['Arcana', 'Occultism'],
        description: 'You channel magical energy into the ship\'s systems, temporarily enhancing their capabilities.',
        outcomes: {
          criticalSuccess: 'Magical energy surges through all systems. All crew members gain a +1 circumstance bonus to their next check, and the ship gains 1d6 temporary HP.',
          success: 'Choose one system (weapons, shields, or engines). That system\'s next check gains a +2 circumstance bonus.',
          failure: 'The magical energies dissipate harmlessly.',
          criticalFailure: 'Magical backlash! One random crew member takes a -1 penalty to their next check, and you take 1d6 mental damage.'
        }
      },
      {
        id: 'mystic-ward',
        name: 'Mystic Ward',
        actionCost: 2,
        skills: ['Arcana', 'Religion', 'Occultism'],
        description: 'You erect magical defenses around the ship to protect against attacks.',
        outcomes: {
          criticalSuccess: 'A shimmering barrier surrounds the ship. The ship gains resistance 5 to all damage until the start of your next turn, and the next attack that hits automatically has its damage reduced by an additional 1d6.',
          success: 'A ward flickers into place. The ship gains resistance 3 to all damage until the start of your next turn.',
          failure: 'The ward fails to manifest.',
          criticalFailure: 'The ward inverts. The next attack against your ship deals an additional 1d6 damage.'
        }
      },
      {
        id: 'scrying-sensors',
        name: 'Scrying Sensors',
        actionCost: 2,
        skills: ['Arcana', 'Occultism', 'Nature'],
        description: 'You enhance the ship\'s sensors with magical divination to reveal hidden information.',
        outcomes: {
          criticalSuccess: 'The cosmos reveals its secrets. Learn the enemy ship\'s current HP, shield status, and their planned action for this round. Your science officer gains a +2 bonus to their next scan.',
          success: 'Mystic sight enhances your sensors. Learn the enemy ship\'s approximate HP (above half, below half, or critical) and one of their capabilities or weaknesses.',
          failure: 'The divination is unclear.',
          criticalFailure: 'Your scrying is detected! The enemy gains a +1 bonus against your ship for 1 round as they anticipated being watched.'
        }
      },
      {
        id: 'eldritch-disruption',
        name: 'Eldritch Disruption',
        actionCost: 2,
        skills: ['Arcana', 'Occultism'],
        description: 'You send waves of disruptive magical energy at the enemy ship.',
        outcomes: {
          criticalSuccess: 'Reality warps around the enemy vessel. They take 2d6 force damage, and all their crew take a -1 circumstance penalty to checks for 1 round as instruments malfunction.',
          success: 'Eldritch energy crackles across the enemy hull. They take 1d6 force damage and one crew member of your choice takes a -1 penalty to their next check.',
          failure: 'The disruption fizzles out before reaching the target.',
          criticalFailure: 'The magic rebounds. Your ship takes 1d6 force damage.'
        }
      }
    ]
  },
  {
    id: 'pilot',
    type: 'pilot',
    name: 'Pilot',
    description: 'The pilot controls the ship\'s movement, executing maneuvers to gain tactical advantage, avoid attacks, and position for the crew.',
    primarySkills: ['Piloting Lore', 'Acrobatics'],
    actions: [
      {
        id: 'evasive-maneuvers',
        name: 'Evasive Maneuvers',
        actionCost: 2,
        skills: ['Piloting Lore', 'Acrobatics'],
        description: 'You throw the ship into a series of unpredictable movements to avoid incoming fire.',
        outcomes: {
          criticalSuccess: 'Masterful evasion! The ship gains a +2 circumstance bonus to AC and Reflex saves until the start of your next turn. The first attack that misses you this round provokes a free counterattack from your gunner at -2.',
          success: 'The ship weaves through space. Gain a +1 circumstance bonus to AC until the start of your next turn.',
          failure: 'Your maneuvers are too predictable. No bonus.',
          criticalFailure: 'You overcorrect and expose a weakness. The ship takes a -1 penalty to AC until the start of your next turn.'
        }
      },
      {
        id: 'full-speed',
        name: 'Full Speed',
        actionCost: 2,
        skills: ['Piloting Lore', 'Athletics'],
        description: 'You push the engines to maximum, closing distance with enemies or creating separation.',
        outcomes: {
          criticalSuccess: 'The ship surges forward with incredible speed. Gain a significant positional advantage (close to optimal firing range, escape a pursuer, or catch a fleeing enemy). Your gunner gains a +1 bonus to their next attack from the momentum.',
          success: 'You gain a moderate positional advantage, either closing distance or creating space as desired.',
          failure: 'The engines respond sluggishly. Minimal positional change.',
          criticalFailure: 'Engine strain! The ship moves but takes 1d6 damage from engine stress, and the engineer must repair the engines before they can be pushed again.'
        }
      },
      {
        id: 'barrel-roll',
        name: 'Barrel Roll',
        actionCost: 2,
        skills: ['Piloting Lore', 'Acrobatics'],
        description: 'You execute a dramatic spinning maneuver to throw off targeting solutions and reposition.',
        outcomes: {
          criticalSuccess: 'A perfect roll that reorients the ship advantageously. Negate one attack that would have hit this round, and position yourself for a better firing angle (+1 to your gunner\'s next attack).',
          success: 'A solid roll. One attack against you this round takes a -2 penalty.',
          failure: 'The roll is sloppy but you recover. No effect.',
          criticalFailure: 'You lose control momentarily. The ship is off-guard until the start of your next turn, and one crew member is rattled (-1 to their next check).'
        }
      },
      {
        id: 'pursuit',
        name: 'Pursuit',
        actionCost: 2,
        skills: ['Piloting Lore', 'Survival'],
        description: 'You doggedly pursue a fleeing enemy or maintain optimal attack position.',
        outcomes: {
          criticalSuccess: 'You\'re right on their tail. The enemy can\'t escape this round, your gunner gains a +2 bonus to attack them, and if they try to flee, you get a free attack.',
          success: 'You maintain pursuit. The enemy can\'t easily escape, and your gunner gains a +1 bonus to attack them.',
          failure: 'The enemy slips away from optimal range.',
          criticalFailure: 'You overcommit to the chase. Another enemy (or hazard) gets a free action against your exposed ship.'
        }
      }
    ]
  },
  {
    id: 'science_officer',
    type: 'science_officer',
    name: 'Science Officer',
    description: 'The science officer gathers intelligence, analyzes enemy weaknesses, and manipulates sensors and communications.',
    primarySkills: ['Computers', 'Society'],
    actions: [
      {
        id: 'scan-target',
        name: 'Scan Target',
        actionCost: 2,
        skills: ['Computers', 'Perception'],
        description: 'You perform a detailed scan of an enemy ship or hazard to reveal its capabilities and weaknesses.',
        outcomes: {
          criticalSuccess: 'Comprehensive scan complete. Learn the target\'s HP, AC, all save values, special abilities, and one critical weakness. Share this info with the crew for a +1 bonus to all checks against this target for 1 round.',
          success: 'Good sensor data. Learn the target\'s approximate HP, AC, and one special ability or weakness.',
          failure: 'Sensors can\'t get a clear reading.',
          criticalFailure: 'The target detects your scan and jams your sensors. You can\'t scan this target again for 1 round.'
        }
      },
      {
        id: 'jam-communications',
        name: 'Jam Communications',
        actionCost: 2,
        skills: ['Computers', 'Deception'],
        description: 'You flood enemy communication frequencies with interference.',
        outcomes: {
          criticalSuccess: 'Total communications blackout. The enemy can\'t coordinate effectively; their captain\'s abilities don\'t function for 1 round, and they can\'t call for reinforcements.',
          success: 'Significant interference. The enemy captain takes a -2 penalty to their next action, as their orders are garbled.',
          failure: 'The enemy filters out your jamming.',
          criticalFailure: 'Your jamming frequencies are exploited. The enemy intercepts one of your communications and learns your planned action this round.'
        }
      },
      {
        id: 'analyze-weakness',
        name: 'Analyze Weakness',
        actionCost: 2,
        skills: ['Computers', 'Engineering Lore'],
        description: 'You study the enemy\'s flight patterns and system signatures to identify exploitable weaknesses.',
        outcomes: {
          criticalSuccess: 'Critical weakness identified! The next attack against the target that hits deals an additional 2d6 damage and bypasses any resistance or shield.',
          success: 'Weakness found. The next attack against the target gains a +1 circumstance bonus and deals an additional 1d6 damage on a hit.',
          failure: 'No clear weakness presents itself.',
          criticalFailure: 'Your analysis is flawed. If your gunner acts on this information, they take a -1 penalty to their attack.'
        }
      },
      {
        id: 'emergency-broadcast',
        name: 'Emergency Broadcast',
        actionCost: 2,
        skills: ['Computers', 'Society', 'Diplomacy'],
        description: 'You send out a distress signal or call for assistance on all frequencies.',
        outcomes: {
          criticalSuccess: 'Help is on the way! Reinforcements or assistance will arrive in 1d4 rounds. The enemy must decide whether to flee, press the attack, or prepare for new arrivals.',
          success: 'Signal sent. There\'s a chance help may arrive (GM discretion based on the situation). The enemy is aware you\'ve called for aid.',
          failure: 'The signal doesn\'t get through or goes unanswered.',
          criticalFailure: 'The enemy traces your broadcast and uses it to lock weapons. Their next attack against you gains a +1 bonus.'
        }
      }
    ]
  }
]

// Helper to get a role by ID
export function getRoleById(roleId: string): StarshipRole | undefined {
  return STARSHIP_ROLES.find(r => r.id === roleId)
}

// Helper to get a role by type
export function getRoleByType(type: string): StarshipRole | undefined {
  return STARSHIP_ROLES.find(r => r.type === type)
}

// Get all available skills across all roles
export function getAllRoleSkills(): string[] {
  const skills = new Set<string>()
  for (const role of STARSHIP_ROLES) {
    for (const skill of role.primarySkills) {
      skills.add(skill)
    }
    for (const action of role.actions) {
      for (const skill of action.skills) {
        skills.add(skill)
      }
    }
  }
  return Array.from(skills).sort()
}
