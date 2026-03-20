import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CreatureCard, { type ConditionPenalties } from '../components/CreatureCard.vue'
import { makeCreature } from './fixtures'
import * as dice from '../utils/dice'

// Spy on rollD20 to capture what modifiers are actually used
const rollD20Spy = vi.spyOn(dice, 'rollD20')

beforeEach(() => {
  rollD20Spy.mockClear()
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
})

function mountCard(creatureOverrides = {}, conditionPenalties?: ConditionPenalties) {
  const creature = makeCreature({
    perception: 8,
    skills: { athletics: 12, stealth: 10 },
    saves: { fort: 9, ref: 7, will: 5 },
    attacks: [{
      name: 'Claw',
      type: 'melee' as const,
      bonus: 14,
      damage: '2d6+4 slashing',
      traits: [],
      actions: 1 as const,
    }],
    ...creatureOverrides,
  })

  return mount(CreatureCard, {
    props: {
      creature,
      showRecallKnowledge: false,
      ...(conditionPenalties ? { conditionPenalties } : {}),
    },
  })
}

describe('CreatureCard — condition penalty integration', () => {
  describe('without penalties (encounter builder mode)', () => {
    it('rolls perception with raw modifier', async () => {
      const wrapper = mountCard()
      const percSpan = wrapper.findAll('.rollable').find(el => el.text().includes('Perception'))
      await percSpan!.trigger('click')
      expect(rollD20Spy).toHaveBeenCalledWith(8, 'Perception', expect.any(String))
    })

    it('rolls saves with raw modifiers', async () => {
      const wrapper = mountCard()
      const fortSpan = wrapper.findAll('.rollable').find(el => el.text().includes('Fort'))
      await fortSpan!.trigger('click')
      expect(rollD20Spy).toHaveBeenCalledWith(9, 'Fortitude', expect.any(String))
    })

    it('rolls attacks with raw bonus', async () => {
      const wrapper = mountCard()
      const atkBtn = wrapper.findAll('.map-btn')[0]
      await atkBtn!.trigger('click')
      expect(rollD20Spy).toHaveBeenCalledWith(14, 'Claw', expect.any(String))
    })

    it('displays raw modifiers in template', () => {
      const wrapper = mountCard()
      expect(wrapper.text()).toContain('+8') // Perception
      expect(wrapper.text()).toContain('+14') // Attack
    })
  })

  describe('with penalties (combat mode)', () => {
    const penalties = {
      attackRolls: -2,
      perception: -3,
      fortitude: -1,
      reflex: -2,
      will: -1,
      skillChecks: -2,
      damage: -1,
    }

    it('rolls perception with penalty applied', async () => {
      const wrapper = mountCard({}, penalties)
      const percSpan = wrapper.findAll('.rollable').find(el => el.text().includes('Perception'))
      await percSpan!.trigger('click')
      // perception 8 + penalty -3 = 5
      expect(rollD20Spy).toHaveBeenCalledWith(5, 'Perception', expect.any(String))
    })

    it('rolls fortitude with penalty applied', async () => {
      const wrapper = mountCard({}, penalties)
      const fortSpan = wrapper.findAll('.rollable').find(el => el.text().includes('Fort'))
      await fortSpan!.trigger('click')
      // fort 9 + penalty -1 = 8
      expect(rollD20Spy).toHaveBeenCalledWith(8, 'Fortitude', expect.any(String))
    })

    it('rolls reflex with penalty applied', async () => {
      const wrapper = mountCard({}, penalties)
      const refSpan = wrapper.findAll('.rollable').find(el => el.text().includes('Ref'))
      await refSpan!.trigger('click')
      // ref 7 + penalty -2 = 5
      expect(rollD20Spy).toHaveBeenCalledWith(5, 'Reflex', expect.any(String))
    })

    it('rolls will with penalty applied', async () => {
      const wrapper = mountCard({}, penalties)
      const willSpan = wrapper.findAll('.rollable').find(el => el.text().includes('Will'))
      await willSpan!.trigger('click')
      // will 5 + penalty -1 = 4
      expect(rollD20Spy).toHaveBeenCalledWith(4, 'Will', expect.any(String))
    })

    it('rolls attack with penalty applied', async () => {
      const wrapper = mountCard({}, penalties)
      const atkBtn = wrapper.findAll('.map-btn')[0]
      await atkBtn!.trigger('click')
      // bonus 14 + attackRolls penalty -2 = 12
      expect(rollD20Spy).toHaveBeenCalledWith(12, 'Claw', expect.any(String))
    })

    it('rolls skills with penalty applied', async () => {
      const wrapper = mountCard({}, penalties)
      const skillSpan = wrapper.findAll('.rollable').find(el => el.text().includes('athletics'))
      await skillSpan!.trigger('click')
      // athletics 12 + skillChecks penalty -2 = 10
      expect(rollD20Spy).toHaveBeenCalledWith(10, 'athletics', expect.any(String))
    })

    it('displays adjusted modifiers in template', () => {
      const wrapper = mountCard({}, penalties)
      const html = wrapper.html()
      // Should show adjusted perception: +5 (8 + -3)
      expect(html).toContain('+5')
      // Should show strikethrough on original values
      expect(wrapper.findAll('.roll-base-struck').length).toBeGreaterThan(0)
    })

    it('shows penalized styling on adjusted values', () => {
      const wrapper = mountCard({}, penalties)
      expect(wrapper.findAll('.roll-penalized').length).toBeGreaterThan(0)
    })

    it('displays adjusted attack bonus in buttons', () => {
      const wrapper = mountCard({}, penalties)
      const atkBtns = wrapper.findAll('.map-btn')
      // First attack: 14 + (-2) = +12
      expect(atkBtns[0].text()).toBe('+12')
    })
  })

  describe('with zero penalties', () => {
    const zeroPenalties = {
      attackRolls: 0,
      perception: 0,
      fortitude: 0,
      reflex: 0,
      will: 0,
      skillChecks: 0,
      damage: 0,
    }

    it('shows raw modifiers when all penalties are zero', () => {
      const wrapper = mountCard({}, zeroPenalties)
      // No strikethrough should appear
      expect(wrapper.findAll('.roll-base-struck').length).toBe(0)
    })

    it('rolls with raw modifiers when penalties are zero', async () => {
      const wrapper = mountCard({}, zeroPenalties)
      const percSpan = wrapper.findAll('.rollable').find(el => el.text().includes('Perception'))
      await percSpan!.trigger('click')
      expect(rollD20Spy).toHaveBeenCalledWith(8, 'Perception', expect.any(String))
    })
  })
})
