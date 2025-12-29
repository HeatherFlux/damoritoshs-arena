/**
 * Creature Adapter - Converts AoN Elasticsearch data to our Creature format
 */

import type { Creature } from '../types/creature'

/**
 * Normalize size string to valid Creature size
 */
function normalizeSize(size: unknown): Creature['size'] {
  const sizeStr = (Array.isArray(size) ? size[0] : size || 'medium').toString().toLowerCase()
  const validSizes = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']
  return validSizes.includes(sizeStr) ? sizeStr as Creature['size'] : 'medium'
}

/**
 * Ensure value is an array of strings
 */
function ensureArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') return value ? [value] : []
  return []
}

/**
 * Ensure object field for skills
 */
function ensureSkills(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {}
  const result: Record<string, number> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val === 'number') result[key] = val
  }
  return result
}

/**
 * Adapt AoN Elasticsearch creature hit to our Creature format
 */
export function adaptAoNCreature(hit: { _id: string; _source: Record<string, any> }): Creature {
  const src = hit._source

  return {
    id: `aon-${hit._id}`,
    name: src.name || 'Unknown Creature',
    level: typeof src.level === 'number' ? src.level : 0,
    traits: ensureArray(src.trait_raw || src.trait),
    size: normalizeSize(src.size),
    source: src.primary_source || 'Archives of Nethys',
    perception: typeof src.perception === 'number' ? src.perception : 0,
    senses: ensureArray(src.sense_markdown || src.sense),
    languages: ensureArray(src.language),
    skills: ensureSkills(src.skill_mod),
    abilities: {
      str: src.strength ?? 0,
      dex: src.dexterity ?? 0,
      con: src.constitution ?? 0,
      int: src.intelligence ?? 0,
      wis: src.wisdom ?? 0,
      cha: src.charisma ?? 0
    },
    items: ensureArray(src.item),
    ac: typeof src.ac === 'number' ? src.ac : 10,
    saves: {
      fort: src.fortitude_save ?? 0,
      ref: src.reflex_save ?? 0,
      will: src.will_save ?? 0
    },
    hp: typeof src.hp === 'number' ? src.hp : 10,
    immunities: ensureArray(src.immunity),
    resistances: ensureArray(src.resistance_raw),
    weaknesses: ensureArray(src.weakness_raw),
    speed: src.speed_raw || src.speed_markdown || '30 feet',
    attacks: [], // AoN doesn't expose structured attack data easily
    specialAbilities: ensureArray(src.creature_ability).map(name => ({
      name,
      description: ''
    })),
    description: src.summary || '',
    rawText: src.text || ''
  }
}
