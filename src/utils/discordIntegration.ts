/**
 * Discord webhook integration for sending dice rolls and turn changes
 */

import { onRoll, type RollResult } from './dice'
import { useSettingsStore } from '../stores/settingsStore'

// Color palette for Discord embeds
const COLORS = {
  d20: 0x00d4ff,      // Cyan for d20 rolls
  damage: 0xff3366,   // Red for damage
  crit: 0xffd700,     // Gold for crits
  fumble: 0x8b0000,   // Dark red for nat 1s
  turn: 0x7c3aed,     // Purple for turn changes
}

let unsubscribe: (() => void) | null = null

/**
 * Initialize Discord integration - call once on app startup
 */
export function initDiscordIntegration() {
  // Subscribe to all roll events
  unsubscribe = onRoll((roll) => {
    sendRollToDiscord(roll)
  })
}

/**
 * Cleanup Discord integration
 */
export function destroyDiscordIntegration() {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
}

/**
 * Send a roll result to Discord
 */
async function sendRollToDiscord(roll: RollResult) {
  const { sendToDiscord, settings } = useSettingsStore()
  if (!settings.discordWebhookEnabled) return

  let color = COLORS.d20
  let emoji = '🎲'

  if (roll.type === 'damage') {
    color = roll.isCriticalHit ? COLORS.crit : COLORS.damage
    emoji = roll.isCriticalHit ? '💥' : '⚔️'
  } else if (roll.isNat20) {
    color = COLORS.crit
    emoji = '🎯'
  } else if (roll.isNat1) {
    color = COLORS.fumble
    emoji = '💀'
  }

  const fields: Array<{ name: string; value: string; inline?: boolean }> = []

  if (roll.type === 'damage') {
    fields.push({ name: 'Dice', value: `\`${roll.diceExpression}\``, inline: true })
    fields.push({ name: 'Total', value: `**${roll.total}**${roll.damageType ? ` ${roll.damageType}` : ''}`, inline: true })
    if (roll.individualRolls && roll.individualRolls.length > 1) {
      fields.push({ name: 'Rolls', value: roll.individualRolls.join(' + '), inline: true })
    }
  } else {
    fields.push({ name: 'Roll', value: `\`d20\` (${roll.roll})`, inline: true })
    fields.push({ name: 'Modifier', value: `${roll.modifier >= 0 ? '+' : ''}${roll.modifier}`, inline: true })
    fields.push({ name: 'Total', value: `**${roll.total}**`, inline: true })
  }

  const title = roll.isNat20
    ? `${emoji} ${roll.name} - NAT 20!`
    : roll.isNat1
    ? `${emoji} ${roll.name} - NAT 1!`
    : roll.isCriticalHit
    ? `${emoji} ${roll.name} - CRITICAL!`
    : `${emoji} ${roll.name}`

  await sendToDiscord({
    embeds: [{
      title,
      description: `**${roll.source}**`,
      color,
      fields,
      timestamp: roll.timestamp.toISOString(),
    }],
    username: "Damoritosh's Arena",
  })
}

/**
 * Send turn change notification
 */
export async function sendTurnChange(combatantName: string, round: number, isPlayer: boolean) {
  const { sendToDiscord, settings } = useSettingsStore()
  if (!settings.discordWebhookEnabled) return

  await sendToDiscord({
    embeds: [{
      title: `🎭 ${combatantName}'s Turn`,
      description: `Round ${round}`,
      color: isPlayer ? COLORS.turn : COLORS.d20,
      timestamp: new Date().toISOString(),
    }],
    username: "Damoritosh's Arena",
  })
}
