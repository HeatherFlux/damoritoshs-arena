import { describe, it, expect } from 'vitest'
// @ts-expect-error — JS module without TS types
import {
  normalizeBoldedLinks,
  parseAttacksFromMarkdown,
  parseAbilitiesFromMarkdown,
  parseSkillsFromMarkdown,
  pruneSiblingSections,
  parsePageBlocks,
  mergePageBlocks,
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

describe('parseSkillsFromMarkdown', () => {
  it('reads every skill from skill_markdown, including Lore and Piloting that skill_mod omits', () => {
    const md = '[Acrobatics](/skills/1-acrobatics) +13, [Corpse Fleet Lore](/skills/9-lore) +15, [Piloting](/skills/14-piloting) +14, [Computers](/skills/4-computers) +8'
    expect(parseSkillsFromMarkdown(md, { acrobatics: 13 })).toEqual({
      acrobatics: 13,
      'corpse fleet lore': 15,
      piloting: 14,
      computers: 8,
    })
  })

  it('falls back to skill_mod when the markdown is empty', () => {
    expect(parseSkillsFromMarkdown('', { stealth: 4 })).toEqual({ stealth: 4 })
    expect(parseSkillsFromMarkdown(undefined, undefined)).toEqual({})
  })
})

describe('parseAttacksFromMarkdown — Auto-Fire and effect-only attacks', () => {
  it('parses Auto-Fire as an area attack with no bonus and an Auto-Fire label', () => {
    const md = `**Auto-Fire**
<actions string="Two Actions" />
minigun,
2d10+8 piercing (DC 20 basic Reflex)`
    const attacks = parseAttacksFromMarkdown(md)
    expect(attacks).toHaveLength(1)
    expect(attacks[0]).toMatchObject({ name: 'Minigun', type: 'area', bonus: 0, actions: 2, area: 'Auto-Fire' })
    expect(attacks[0].damage).toContain('2d10+8 piercing')
  })

  it('labels Area Fire attacks', () => {
    const md = `**Area Fire**
<actions string="Single Action" />
frag grenade,
2d8 piercing`
    expect(parseAttacksFromMarkdown(md)[0].area).toBe('Area Fire')
  })

  it('keeps the effect text for attacks with no damage dice instead of inventing 1d6', () => {
    const md = `**Ranged**
<actions string="Single Action" />
magbola +16,
magnet trap

**Area Fire**
<actions string="Single Action" />
flash grenade,
[dazzled](/conditions/7-dazzled) and [suppressed](/conditions/39-suppressed) for 1 round (DC 27 Fortitude save)`
    const attacks = parseAttacksFromMarkdown(md)
    expect(attacks).toHaveLength(2)
    expect(attacks[0].damage).toBe('magnet trap')
    expect(attacks[1].damage).toBe('dazzled and suppressed for 1 round (DC 27 Fortitude save)')
  })

  it('collapses the AoN "[Grab](/url)Grab" link duplication artifact', () => {
    const md = `**Melee**
<actions string="Single Action" />
leg +17,
2d10+4 bludgeoning plus [Grab](/creatures/abilities/16-grab)Grab`
    expect(parseAttacksFromMarkdown(md)[0].damage).toBe('2d10+4 bludgeoning plus Grab')
  })
})

describe('parseAbilitiesFromMarkdown — spell lists, unclosed bold, stock senses', () => {
  it('captures the full spell list after the DC line, one rank per segment', () => {
    const md = `**Primal Innate Spells** DC 16, attack +7
- **Cantrips (1st)**
[Electric Arc](/spells/86-electric-arc), [Figment](/spells/110-figment)
- **1st**
[Delete](/spells/59-delete), [Thunderstrike](/spells/324-thunderstrike)

**Melee**
<actions string="Single Action" />
bite +7,
1d4+2 piercing`
    const abilities = parseAbilitiesFromMarkdown(md, [], 'Botnib', [])
    const spells = abilities.find(a => a.name === 'Primal Innate Spells')
    expect(spells?.description).toBe('DC 16, attack +7; Cantrips (1st): Electric Arc, Figment; 1st: Delete, Thunderstrike')
  })

  it('captures a spell header with no DC text and one whose bold name carries traits', () => {
    const md = `**Innate Arcane Spells** 
- **1st**
[Sure Strike](/spells/310-sure-strike), [Shield](/spells/263-shield)

**Arcane Innate Spells (manipulate, tech)** DC 29, attack +21
- **Cantrips (5th)**
[Measure](/spells/181-measure)

**Rituals** DC 21

- **1st**
[Angelic Messenger](/rituals/20-angelic-messenger)

**Melee**`
    const abilities = parseAbilitiesFromMarkdown(md, [], 'X', [])
    expect(abilities.find(a => a.name === 'Innate Arcane Spells')?.description).toBe('1st: Sure Strike, Shield')
    expect(abilities.find(a => a.name === 'Arcane Innate Spells')?.description).toBe('DC 29, attack +21; Cantrips (5th): Measure')
    expect(abilities.find(a => a.name === 'Rituals')?.description).toBe('DC 21; 1st: Angelic Messenger')
  })

  it('does not let a multi-line fallback ability run past a blank line', () => {
    const md = `**Glitch Aura** Tech struggles nearby
for 20 feet.

**Speed** 25 feet`
    const abilities = parseAbilitiesFromMarkdown(md, [], 'X', [])
    expect(abilities.find(a => a.name === 'Glitch Aura')?.description).toBe('Tech struggles nearby for 20 feet.')
  })

  it('recovers an ability whose bold name is never closed before the actions tag (Sanimus Slayn case)', () => {
    const md = `**Lonely Rage** Sanimus fights harder alone.<br />**Vengeful Strike <actions string="Reaction" /> **Trigger** A creature heals an ally; **Effect** Sanimus makes a ranged Strike.`
    const abilities = parseAbilitiesFromMarkdown(md, ['Lonely Rage', 'Vengeful Strike'], 'Sanimus Slayn', [])
    const vs = abilities.find(a => a.name === 'Vengeful Strike')
    expect(vs?.actions).toBe('reaction')
    expect(vs?.description).toContain('Trigger A creature heals an ally')
  })

  it('strips literal bold markers from descriptions', () => {
    const md = `**Absorb Shock** <actions string="Reaction" /> **Trigger** It would take bludgeoning damage; **Effect** It absorbs the blow.`
    const abilities = parseAbilitiesFromMarkdown(md, ['Absorb Shock'], 'X', [])
    expect(abilities[0].description).toBe('Trigger It would take bludgeoning damage; Effect It absorbs the blow.')
  })

  it('fills stock text for No Breath, Light Blindness, All-Around Vision and Lifesense', () => {
    const md = `**[No Breath](/creatures/abilities/24-no-breath)** <br />**[Light Blindness](/creatures/abilities/22-light-blindness)** \n\n**All-Around Vision** <br />**Other** Text here.`
    const abilities = parseAbilitiesFromMarkdown(md, ['No Breath', 'Light Blindness', 'All-Around Vision', 'Lifesense'], 'X', [])
    for (const name of ['No Breath', 'Light Blindness', 'All-Around Vision', 'Lifesense']) {
      expect(abilities.find(a => a.name === name)?.description, name).toBeTruthy()
    }
  })
})

describe('pruneSiblingSections — one sidebar, three dragon ages', () => {
  const md = `**Frightful Presence** 90 feet, DC 30

<aside>
<title level="2">Host Dragon Spellcasters</title>
<title level="3" right="">Young Host Dragon</title>**Primal Prepared Spells** DC 23, attack +15; **1st** _[fear](/spells/107-fear)_
<title level="3" right="">Adult Host Dragon</title>**Primal Prepared Spells** DC 26, attack +18; as young host dragon, plus **5th** _[toxic cloud](/spells/326-toxic-cloud)_
<title level="3" right="">Ancient Host Dragon</title>**Primal Prepared Spells** DC 34, attack +26; **7th** _[regenerate](/spells/237-regenerate)_
</aside>`

  it('keeps only the section titled with the creature name', () => {
    const pruned = pruneSiblingSections(md, 'Adult Host Dragon')
    expect(pruned).toContain('DC 26')
    expect(pruned).not.toContain('DC 23')
    expect(pruned).not.toContain('DC 34')
    expect(pruned).toContain('Frightful Presence')
  })

  it('leaves markdown untouched when no section matches', () => {
    expect(pruneSiblingSections(md, 'Blight Drake')).toBe(md)
  })

  it('gives the adult dragon its own spell list, not the young one', () => {
    const abilities = parseAbilitiesFromMarkdown(md, ['Frightful Presence'], 'Adult Host Dragon', [])
    const spells = abilities.find(a => a.name === 'Primal Prepared Spells')
    expect(spells?.description).toBe('DC 26, attack +18; as young host dragon, plus 5th: toxic cloud')
    const fp = abilities.find(a => a.name === 'Frightful Presence')
    expect(fp?.description).toMatch(/^90 feet, DC 30\. A creature that first enters the aura/)
  })
})

describe('parsePageBlocks — rendered AoN page blocks the ES index omits', () => {
  const html = `
<div class="creature-attack">
<b>Melee</b>
    <span><span class="action" title="One Action" role="img" aria-label="One Action">[one-action]</span></span>
claw <span class="adjustable-stat is-attack is-agile">+32</span>
<span class="traits-parenthetical comma-delimited-list">(<span><a href="/traits/11-agile"><u>agile</u></a></span><span><a href="/traits/152-reach"><u>reach 10 feet</u></a></span>)</span>,
<b>Damage</b> 3d6<span class="adjustable-stat is-damage">+18</span> slashing plus <a href="/creatures/abilities/16-grab" class="link">Grab</a>
</div>
<div class="creature-attack">
<b>Ranged</b>
    <span><span class="action" title="One Action" role="img" aria-label="One Action">[one-action]</span></span>
laser beam <span class="adjustable-stat is-attack">+24</span>
<span class="traits-parenthetical comma-delimited-list">(<span><a href="/traits/83-fire"><u>fire</u></a></span><span><a href="/traits/151-range"><u>range increment 120 feet</u></a></span>)</span>,
<b>Damage</b> 3d6<span class="adjustable-stat is-damage">+11</span> fire
</div>
<div class="creature-attack">
<b>Swarm Breath</b>
    <span><span class="action" title="Two Actions" role="img" aria-label="Two Actions">[two-actions]</span></span>
<span class="traits-parenthetical comma-delimited-list">(<span><a href="/traits/144-primal"><u>primal</u></a></span>)</span>
The dragon disgorges insects that deals 12d8<span class="adjustable-stat is-damage is-limited-use"></span> piercing damage (DC <span class="adjustable-stat">37</span> basic Reflex save).
</div>
<div class="creature-attack">
<b>Draconic Momentum</b>
The dragon recharges their Swarm Breath whenever they score a critical hit.
</div>
<div class="creature-attack">
<b><a href="/creatures/abilities/35-swallow-whole" class="link">Swallow Whole</a></b>
    <span><span class="action" title="One Action" role="img" aria-label="One Action">[one-action]</span></span>
<span class="traits-parenthetical comma-delimited-list">(<span>dc {{stat &quot;37&quot;}} basic fortitude save. also {{conditions 13 &quot;enfeebled 1&quot;}} for 1 round.</span>)</span>
Large, 3d10+14 bludgeoning, Rupture 35
</div>
<div class="creature-attack">
<b>Giant Centipede Venom</b>
<span class="traits-parenthetical comma-delimited-list">(<span><a href="/traits/211-poison"><u>poison</u></a></span>)</span>
<b>Saving Throw</b> DC <span class="adjustable-stat">14</span> Fortitude; <b>Stage 1</b> 1d4 poison damage (1 round)
</div>`

  it('parses strikes with agile/reach traits, range, and rider text', () => {
    const { attacks } = parsePageBlocks(html)
    expect(attacks).toHaveLength(2)
    expect(attacks[0]).toMatchObject({ name: 'Claw', type: 'melee', bonus: 32, actions: 1, damage: '3d6+18 slashing plus Grab' })
    expect(attacks[0].traits).toEqual(['agile', 'reach 10 feet'])
    expect(attacks[1]).toMatchObject({ name: 'Laser beam', type: 'ranged', bonus: 24, range: '120 feet', damage: '3d6+11 fire' })
    expect(attacks[1].traits).toEqual(['fire'])
  })

  it('parses offensive abilities with actions, traits, and clean text', () => {
    const { abilities } = parsePageBlocks(html)
    const names = abilities.map(a => a.name)
    expect(names).toEqual(['Swarm Breath', 'Draconic Momentum', 'Swallow Whole', 'Giant Centipede Venom'])
    const breath = abilities[0]
    expect(breath.actions).toBe(2)
    expect(breath.traits).toEqual(['primal'])
    expect(breath.description).toBe('The dragon disgorges insects that deals 12d8 piercing damage (DC 37 basic Reflex save).')
    expect(abilities[1].actions).toBeUndefined()
    expect(abilities[3].description).toBe('Saving Throw DC 14 Fortitude; Stage 1 1d4 poison damage (1 round)')
  })

  it('unwraps entity-encoded template tags and keeps a mis-filed parenthetical as text', () => {
    const swallow = parsePageBlocks(html).abilities.find(a => a.name === 'Swallow Whole')
    expect(swallow?.actions).toBe(1)
    expect(swallow?.traits).toBeUndefined()
    expect(swallow?.description).toBe('(dc 37 basic fortitude save. also enfeebled 1 for 1 round.) Large, 3d10+14 bludgeoning, Rupture 35')
  })

  it('returns nothing for a page without blocks', () => {
    expect(parsePageBlocks('<html></html>')).toEqual({ attacks: [], abilities: [] })
  })
})

describe('mergePageBlocks', () => {
  const base = {
    attacks: [{ name: 'Claw', type: 'melee', bonus: 32, damage: '3d6+18 slashing', traits: [], actions: 1 }],
    specialAbilities: [{ name: 'Frightful Presence', description: '90 feet, DC 37' }],
  }
  const page = {
    attacks: [
      { name: 'Claw', type: 'melee', bonus: 32, damage: '3d6+18 slashing', traits: ['agile', 'magical'], actions: 1 },
      { name: 'Laser beam', type: 'ranged', bonus: 24, damage: '3d6+11 fire', traits: ['fire'], actions: 1, range: '120 feet' },
    ],
    abilities: [
      { name: 'Frightful Presence', description: 'duplicate — must not be added twice' },
      { name: 'Swarm Breath', actions: 2, traits: ['primal'], description: '12d8 piercing' },
    ],
  }

  it('adds traits to matching strikes, appends unknown strikes and abilities, skips duplicates', () => {
    const merged = mergePageBlocks(base as never, page as never) as typeof base
    expect(merged.attacks[0].traits).toEqual(['agile', 'magical'])
    expect(merged.attacks.map(a => a.name)).toEqual(['Claw', 'Laser beam'])
    expect(merged.specialAbilities.map(a => a.name)).toEqual(['Frightful Presence', 'Swarm Breath'])
    expect(merged.specialAbilities[0].description).toBe('90 feet, DC 37')
  })

  it('is a no-op without a page', () => {
    expect(mergePageBlocks(base as never, undefined)).toBe(base)
  })
})
