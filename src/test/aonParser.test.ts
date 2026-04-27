import { describe, it, expect } from 'vitest'
// @ts-expect-error — JS module without TS types
import {
  normalizeBoldedLinks,
  parseAttacksFromMarkdown,
  parseAbilitiesFromMarkdown,
  lookupStockAbility,
  STOCK_ABILITIES,
} from '../../scripts/fetch-aon.mjs'

describe('normalizeBoldedLinks', () => {
  it('strips markdown link wrapping inside bold', () => {
    expect(normalizeBoldedLinks('**[Shield Block](/url)**')).toBe('**Shield Block**')
  })

  it('leaves plain bold names alone', () => {
    expect(normalizeBoldedLinks('**Shield Block**')).toBe('**Shield Block**')
  })

  it('handles multiple in one string', () => {
    expect(normalizeBoldedLinks('**[A](/x)** and **[B](/y)**')).toBe('**A** and **B**')
  })

  it('does not strip links that are NOT inside bold', () => {
    expect(normalizeBoldedLinks('See [the docs](/url) for more')).toBe('See [the docs](/url) for more')
  })
})

describe('lookupStockAbility', () => {
  it('finds Reactive Strike', () => {
    const stock = lookupStockAbility('Reactive Strike')
    expect(stock?.actions).toBe('reaction')
    expect(stock?.description).toContain('manipulate action')
  })

  it('finds Shield Block', () => {
    const stock = lookupStockAbility('Shield Block')
    expect(stock?.actions).toBe('reaction')
    expect(stock?.description).toContain('Hardness')
  })

  it('finds Four-Armed', () => {
    const stock = lookupStockAbility('Four-Armed')
    expect(stock?.description).toContain('four arms')
  })

  it('finds Ferocity', () => {
    const stock = lookupStockAbility('Ferocity')
    expect(stock?.actions).toBe('reaction')
  })

  it('is case-insensitive', () => {
    expect(lookupStockAbility('SHIELD BLOCK')).not.toBeNull()
    expect(lookupStockAbility('shield block')).not.toBeNull()
  })

  it('returns null for unknown abilities', () => {
    expect(lookupStockAbility('Some Custom Power Move')).toBeNull()
  })

  it('exports STOCK_ABILITIES with at least the documented entries', () => {
    expect(Object.keys(STOCK_ABILITIES)).toEqual(
      expect.arrayContaining([
        'reactive strike',
        'shield block',
        'four-armed',
        'exigency',
        'attack of opportunity',
        'ferocity',
      ])
    )
  })
})

describe('parseAttacksFromMarkdown', () => {
  it('parses Melee attacks with bonus and damage', () => {
    const md = `**Melee**
<actions string="Single Action" />
sword 8,
1d8+2 slashing`
    const attacks = parseAttacksFromMarkdown(md)
    expect(attacks).toHaveLength(1)
    expect(attacks[0]).toMatchObject({
      name: 'Sword',
      type: 'melee',
      bonus: 8,
      damage: '1d8+2 slashing',
    })
  })

  it('parses Ranged attacks', () => {
    const md = `**Ranged**
<actions string="Single Action" />
rifle 10,
1d10+3 fire`
    const attacks = parseAttacksFromMarkdown(md)
    expect(attacks[0]).toMatchObject({ name: 'Rifle', type: 'ranged', bonus: 10 })
  })

  it('parses Area Fire attacks (no attack bonus)', () => {
    const md = `**Area Fire**
<actions string="Single Action" />
frag grenade,
2d8 piercing (DC 25 basic Reflex save)`
    const attacks = parseAttacksFromMarkdown(md)
    expect(attacks).toHaveLength(1)
    expect(attacks[0]).toMatchObject({
      name: 'Frag grenade',
      type: 'area',
      bonus: 0,
    })
    expect(attacks[0].damage).toContain('2d8 piercing')
  })

  it('dedupes duplicate attacks (AoN often duplicates them)', () => {
    const md = `**Melee**
<actions string="Single Action" />
sword 8,
1d8 slashing

**Melee**
<actions string="Single Action" />
sword 8,
1d8 slashing`
    const attacks = parseAttacksFromMarkdown(md)
    expect(attacks).toHaveLength(1)
  })

  it('parses melee, ranged, and area attacks together', () => {
    const md = `**Melee**
<actions string="Single Action" />
sword 8,
1d8 slashing

**Ranged**
<actions string="Single Action" />
bow 10,
1d8 piercing

**Area Fire**
<actions string="Single Action" />
grenade,
2d6 fire`
    const attacks = parseAttacksFromMarkdown(md)
    expect(attacks).toHaveLength(3)
    expect(attacks.map((a: { type: string }) => a.type).sort()).toEqual(['area', 'melee', 'ranged'])
  })

  it('returns empty for markdown with no attack sections', () => {
    expect(parseAttacksFromMarkdown('Some random text with no attacks')).toEqual([])
    expect(parseAttacksFromMarkdown('')).toEqual([])
  })
})

describe('parseAbilitiesFromMarkdown', () => {
  it('extracts description without trait paren artifacts (Bug 1)', () => {
    // Trait parens contain markdown links with internal parens — old regex broke here
    const md = `**Techsense** ([detection](/traits/61-detection), [primal](/traits/144-primal)) The creature can sense items within 100 feet.`
    const abilities = parseAbilitiesFromMarkdown(md, ['Techsense'], 'Test', [])
    expect(abilities).toHaveLength(1)
    expect(abilities[0].description).toBe('The creature can sense items within 100 feet.')
    expect(abilities[0].description).not.toMatch(/^[)\],;]/)
  })

  it('handles **[Name](/url)** bold-link wrapping (Bug 7)', () => {
    const md = `**[Shield Block](/url)** <actions string="Reaction" /> Custom shield block effect.`
    const abilities = parseAbilitiesFromMarkdown(md, ['Shield Block'], 'Test', [])
    expect(abilities[0].name).toBe('Shield Block')
    expect(abilities[0].description).toContain('Custom shield block effect')
    expect(abilities[0].actions).toBe('reaction')
  })

  it('falls back to stock-ability lookup when description is missing (Bug 6)', () => {
    const md = `**Reactive Strike** <actions string="Reaction" />`
    const abilities = parseAbilitiesFromMarkdown(md, ['Reactive Strike'], 'Test', [])
    expect(abilities).toHaveLength(1)
    expect(abilities[0].description).toContain('manipulate action')
    expect(abilities[0].actions).toBe('reaction')
  })

  it('drops creature_ability entries that match parsed attacks (Bug 3)', () => {
    const fakeAttacks = [{ name: 'sword', type: 'melee', bonus: 8 }]
    const abilities = parseAbilitiesFromMarkdown(
      '**Sword Power** Some real description here.',
      ['sword', 'Sword Power'],
      'Test',
      fakeAttacks
    )
    expect(abilities.find((a: { name: string }) => a.name.toLowerCase() === 'sword')).toBeUndefined()
    expect(abilities.find((a: { name: string }) => a.name === 'Sword Power')).toBeDefined()
  })

  it('captures plain-text "Name [reaction]" abilities (Bug 4)', () => {
    const md = `Reactive Strike [reaction]`
    const abilities = parseAbilitiesFromMarkdown(md, [], 'Test', [])
    const rs = abilities.find((a: { name: string }) => a.name === 'Reactive Strike')
    expect(rs).toBeDefined()
    expect(rs!.actions).toBe('reaction')
    expect(rs!.description).toContain('manipulate action') // from stock lookup
  })

  it('handles multiple abilities separated by <br />', () => {
    const md = `**Aligned Comm Unit** ([divine](/traits/x-divine)) The first ability description.<br />**Social Media Addiction** ([divine](/traits/x-divine)) The second ability description.`
    const abilities = parseAbilitiesFromMarkdown(md, ['Aligned Comm Unit', 'Social Media Addiction'], 'Test', [])
    expect(abilities).toHaveLength(2)
    expect(abilities[0].description).toBe('The first ability description.')
    expect(abilities[1].description).toBe('The second ability description.')
  })

  it('does not consume next ability content (Four-Armed → Shield Block bug)', () => {
    const md = `**Four-Armed** <br />**Shield Block** Custom block effect for this creature.`
    const abilities = parseAbilitiesFromMarkdown(md, ['Four-Armed', 'Shield Block'], 'Test', [])
    const fa = abilities.find((a: { name: string }) => a.name === 'Four-Armed')
    const sb = abilities.find((a: { name: string }) => a.name === 'Shield Block')
    expect(fa?.description).not.toContain('Shield Block')
    expect(fa?.description).not.toContain('Custom block effect')
    expect(sb?.description).toContain('Custom block effect')
  })

  it('strips leading punctuation artifacts (Warp Troll case)', () => {
    const md = `**Defensive Phase** <actions string="Reaction" />; **Trigger** An enemy attacks.`
    const abilities = parseAbilitiesFromMarkdown(md, ['Defensive Phase'], 'Test', [])
    expect(abilities[0].description).not.toMatch(/^[;,)\]]/)
  })

  it('does not produce empty entries for attack-name slop in creature_ability', () => {
    // "frag grenade" appears in creature_ability but isn't bolded as an ability
    const md = `**Items** tactical Aeon Guard armor, frag grenades`
    const fakeAttacks = [{ name: 'Frag grenade', type: 'area', bonus: 0 }]
    const abilities = parseAbilitiesFromMarkdown(md, ['frag grenade'], 'Test', fakeAttacks)
    expect(abilities).toHaveLength(0)
  })

  it('strips creature name suffix from ability name', () => {
    const md = `**Hot Move Goblin** Some description here.`
    const abilities = parseAbilitiesFromMarkdown(md, ['Hot Move Goblin'], 'Goblin', [])
    expect(abilities[0].name).toBe('Hot Move')
  })

  it('parses action types: reaction, free, single, two, three', () => {
    const cases = [
      { actionStr: 'Reaction', expected: 'reaction' },
      { actionStr: 'Free Action', expected: 'free' },
      { actionStr: 'Single Action', expected: 1 },
      { actionStr: 'Two Actions', expected: 2 },
      { actionStr: 'Three Actions', expected: 3 },
    ]
    for (const { actionStr, expected } of cases) {
      const md = `**Test** <actions string="${actionStr}" /> Description.`
      const abilities = parseAbilitiesFromMarkdown(md, ['Test'], 'Test', [])
      expect(abilities[0].actions).toBe(expected)
    }
  })
})
