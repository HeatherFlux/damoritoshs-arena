<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useTscStore } from '../../stores/tscStore'
import { FRAMES } from '../../data/tscFrames'
import type { HullBand } from '../../types/tsc'

const store = useTscStore()

const data = computed(() => store.state.playerData)
const ship = computed(() => data.value?.playerShip ?? null)

const statusLabel = computed(() => {
  if (store.state.isRemoteSyncEnabled) {
    switch (store.state.wsConnectionState) {
      case 'connected': return 'LIVE (REMOTE)'
      case 'connecting': return 'SYNC...'
      case 'error': return 'ERROR'
      default: return 'OFFLINE'
    }
  }
  return 'LIVE'
})

const hpPercent = computed(() => ship.value && ship.value.maxHP > 0 ? Math.round((ship.value.currentHP / ship.value.maxHP) * 100) : 0)
const spPercent = computed(() => ship.value && ship.value.maxSP > 0 ? Math.round((ship.value.currentSP / ship.value.maxSP) * 100) : 0)
const hpColor = computed(() => {
  const pct = hpPercent.value
  if (pct > 50) return 'var(--color-success)'
  if (pct > 25) return 'var(--color-warning)'
  return 'var(--color-danger)'
})

const bandLabel: Record<HullBand, string> = {
  intact: 'Intact',
  damaged: 'Damaged',
  critical: 'Critical',
  destroyed: 'Destroyed',
}

const headingArrow: Record<string, string> = { fore: '▲', aft: '▼', port: '◀', starboard: '▶' }

function onHashChange() {
  if (window.location.hash.includes('/tsc/view')) window.location.reload()
}

onMounted(async () => {
  window.addEventListener('hashchange', onHashChange)
  store.setGMView(false)
  store.ensureChannel()
  if (store.hasRemoteSyncInUrl()) {
    const match = window.location.hash.match(/[?&]session=([^&]+)/)
    if (match) await store.joinRemoteSession(match[1])
  }
  store.requestStateFromGM()
})

onUnmounted(() => {
  window.removeEventListener('hashchange', onHashChange)
  store.disableRemoteSync()
})
</script>

<template>
  <div class="player-layout">
    <div class="player-content">
      <header class="view-header">
        <div>
          <div class="eyebrow">Tactical Starship Combat</div>
          <h1 class="scene-title">{{ data?.sceneName ?? 'Sensor Feed' }}</h1>
        </div>
        <div v-if="data?.initiativeRolled" class="round-badge">
          <span class="round-label">Round</span>
          <span class="round-number">{{ data.round }}</span>
        </div>
      </header>

      <!-- Player starship -->
      <section v-if="ship" class="ship-section" :class="{ 'ship-compromised': ship.compromised > 0, 'ship-destroyed': ship.destroyed }">
        <div class="ship-header">
          <h2 class="ship-name">{{ ship.name }}</h2>
          <span class="ship-frame">{{ FRAMES[ship.frame].name }} · Lvl {{ ship.level }} · zone {{ ship.position.zone }} {{ headingArrow[ship.position.heading] }}</span>
        </div>

        <div class="ship-bars">
          <div class="hp-bar ship-bar-shields">
            <div class="hp-bar-fill shield-fill" :style="{ width: spPercent + '%' }"></div>
            <div class="hp-bar-text">{{ ship.currentSP }}<span class="opacity-50">/</span>{{ ship.maxSP }} Shields</div>
          </div>
          <div class="hp-bar">
            <div class="hp-bar-fill" :style="{ width: hpPercent + '%', background: hpColor }"></div>
            <div class="hp-bar-text">{{ ship.currentHP }}<span class="opacity-50">/</span>{{ ship.maxHP }} Hull</div>
          </div>
        </div>

        <div class="ship-defenses">
          <div class="defense"><span class="defense-label">AC</span><span class="defense-value">{{ ship.ac }}</span></div>
          <div class="defense"><span class="defense-label">Fort</span><span class="defense-value">+{{ ship.fort }}</span></div>
          <div class="defense"><span class="defense-label">Ref</span><span class="defense-value">+{{ ship.ref }}</span></div>
          <div class="defense"><span class="defense-label">Will</span><span class="defense-value">+{{ ship.will }}</span></div>
          <div class="defense"><span class="defense-label">Speed</span><span class="defense-value">{{ ship.speed }}</span></div>
          <div class="defense"><span class="defense-label">Sensors</span><span class="defense-value">{{ ship.sensorRange }}</span></div>
        </div>

        <div v-if="ship.destroyed || ship.compromised || ship.wrecked || ship.inoperable || ship.offKilter || ship.conditions.length" class="condition-row">
          <span v-if="ship.destroyed" class="cond cond-danger">DESTROYED</span>
          <span v-if="ship.compromised" class="cond cond-danger">Compromised {{ ship.compromised }}</span>
          <span v-if="ship.inoperable" class="cond cond-warning">Inoperable</span>
          <span v-if="ship.wrecked" class="cond cond-warning">Wrecked {{ ship.wrecked }}</span>
          <span v-if="ship.offKilter" class="cond cond-warning">Off-Kilter</span>
          <span v-for="c in ship.conditions" :key="c.name" class="cond">{{ c.name }}<span v-if="c.value"> {{ c.value }}</span></span>
        </div>

        <div class="station-grid">
          <div v-for="st in ship.stations" :key="st.id" class="station" :class="{ 'station-malfunctioning': st.malfunctioning }">
            <span class="station-kind">{{ st.kind }}</span>
            <span class="station-grade">{{ st.grade }}</span>
            <span class="station-helm">{{ st.helmedBy ?? '— unhelmed —' }}</span>
            <span v-if="st.malfunctioning" class="station-flag">MALFUNCTIONING</span>
          </div>
        </div>
      </section>

      <section v-else class="waiting-section">
        <div class="waiting-icon">[*]</div>
        <p>Waiting for the GM to start a tactical scene...</p>
      </section>

      <!-- Initiative -->
      <section v-if="data?.initiativeRolled && data.entries.length" class="initiative-section">
        <h3 class="section-title">Initiative</h3>
        <ol class="initiative-list">
          <li v-for="(e, i) in data.entries" :key="i" class="initiative-entry" :class="{ 'is-current': i === data.turn, ['kind-' + e.kind]: true }">
            <span class="initiative-marker">{{ i === data.turn ? '▶' : '' }}</span>
            <span class="initiative-name">{{ e.name }}</span>
            <span class="initiative-kind">{{ e.kind === 'npcShip' ? 'starship' : e.kind === 'playerShip' ? 'your ship' : e.kind }}</span>
          </li>
        </ol>
      </section>

      <!-- Sensor contacts -->
      <section v-if="data && (data.npcShips.length || data.hazards.length)" class="contacts-section">
        <h3 class="section-title">Sensor Contacts</h3>
        <div class="contact-grid">
          <div v-for="n in data.npcShips" :key="n.instanceId" class="contact" :class="['band-' + n.band, { 'contact-destroyed': n.destroyed }]">
            <div class="contact-head">
              <span class="contact-name">{{ n.label }}</span>
              <span class="contact-pos">zone {{ n.position.zone }} {{ headingArrow[n.position.heading] }}</span>
            </div>
            <div class="contact-meta">
              <span>{{ n.modelName ?? 'Unidentified' }} · {{ n.size }}</span>
              <span class="band">{{ bandLabel[n.band] }}<span v-if="!n.destroyed"> · shields {{ n.shieldsUp ? 'up' : 'down' }}</span></span>
            </div>
            <div v-if="n.identifiedStations.length" class="contact-stations">
              <span v-for="s in n.identifiedStations" :key="s" class="cond" :class="{ 'cond-danger': n.malfunctioningStations.includes(s) }">{{ s }}</span>
            </div>
            <div v-if="n.offKilter || n.inoperable || n.conditions.length" class="condition-row">
              <span v-if="n.inoperable" class="cond cond-warning">Inoperable</span>
              <span v-if="n.offKilter" class="cond cond-warning">Off-Kilter</span>
              <span v-for="c in n.conditions" :key="c.name" class="cond">{{ c.name }}<span v-if="c.value"> {{ c.value }}</span></span>
            </div>
          </div>
          <div v-for="h in data.hazards" :key="h.instanceId" class="contact contact-hazard" :class="{ 'contact-destroyed': h.disabled }">
            <div class="contact-head">
              <span class="contact-name">{{ h.label }}</span>
              <span class="contact-pos">zone {{ h.position.zone }}</span>
            </div>
            <div class="contact-meta"><span>{{ h.name }} · hazard</span><span>{{ h.disabled ? 'disabled' : 'active' }}</span></div>
          </div>
        </div>
      </section>

      <section v-if="data?.log.length" class="log-section">
        <h3 class="section-title">Log</h3>
        <ul class="log-list">
          <li v-for="entry in [...data.log].reverse()" :key="entry.id"><span class="log-round">R{{ entry.round }}</span> {{ entry.text }}</li>
        </ul>
      </section>

      <div class="sync-badge">{{ statusLabel }}</div>
    </div>
  </div>
</template>

<style scoped>
.player-layout { min-height: 100vh; background: var(--color-bg); color: var(--color-text); padding: 1rem; }
.player-content { max-width: 64rem; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; }
.view-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid var(--color-border); padding-bottom: 0.5rem; }
.eyebrow { font-size: 0.625rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-accent); }
.scene-title { font-size: 1.5rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.round-badge { display: flex; flex-direction: column; align-items: center; padding: 0.25rem 0.75rem; border: 1px solid var(--color-accent); }
.round-label { font-size: 0.625rem; text-transform: uppercase; color: var(--color-text-dim); }
.round-number { font-size: 1.5rem; font-weight: 700; color: var(--color-accent); line-height: 1; }
.ship-section, .initiative-section, .contacts-section, .log-section, .waiting-section { background: var(--color-bg-surface); border: 1px solid var(--color-border); padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.ship-compromised { border-color: var(--color-danger); }
.ship-destroyed { opacity: 0.6; }
.ship-header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.5rem; }
.ship-name { font-size: 1.25rem; font-weight: 700; }
.ship-frame { font-size: 0.75rem; color: var(--color-text-dim); text-transform: uppercase; letter-spacing: 0.08em; }
.ship-bars { display: flex; flex-direction: column; gap: 0.5rem; }
.shield-fill { background: var(--color-accent); }
.ship-defenses { display: grid; grid-template-columns: repeat(auto-fit, minmax(5rem, 1fr)); gap: 0.5rem; }
.defense { display: flex; flex-direction: column; align-items: center; padding: 0.375rem; background: var(--color-bg-elevated); }
.defense-label { font-size: 0.625rem; text-transform: uppercase; color: var(--color-text-dim); }
.defense-value { font-size: 1.125rem; font-weight: 700; }
.condition-row { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.cond { font-size: 0.6875rem; padding: 0.125rem 0.5rem; background: var(--color-bg-elevated); border: 1px solid var(--color-border); text-transform: uppercase; letter-spacing: 0.05em; }
.cond-danger { border-color: var(--color-danger); color: var(--color-danger); }
.cond-warning { border-color: var(--color-warning); color: var(--color-warning); }
.station-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr)); gap: 0.5rem; }
.station { display: flex; flex-direction: column; padding: 0.5rem; background: var(--color-bg-elevated); border-left: 3px solid var(--color-accent); gap: 0.125rem; }
.station-malfunctioning { border-left-color: var(--color-danger); }
.station-kind { font-weight: 600; text-transform: capitalize; font-size: 0.8125rem; }
.station-grade { font-size: 0.625rem; text-transform: uppercase; color: var(--color-text-dim); }
.station-helm { font-size: 0.75rem; }
.station-flag { font-size: 0.625rem; color: var(--color-danger); font-weight: 700; }
.section-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--color-text-dim); }
.initiative-list { display: flex; flex-direction: column; gap: 0.25rem; list-style: none; padding: 0; margin: 0; }
.initiative-entry { display: grid; grid-template-columns: 1.25rem 1fr auto; align-items: center; padding: 0.375rem 0.5rem; background: var(--color-bg-elevated); gap: 0.5rem; }
.initiative-entry.is-current { outline: 1px solid var(--color-accent); background: var(--color-accent-subtle, var(--color-bg-elevated)); }
.initiative-marker { color: var(--color-accent); }
.initiative-name { font-weight: 600; }
.initiative-kind { font-size: 0.625rem; text-transform: uppercase; color: var(--color-text-dim); }
.kind-npcShip .initiative-name, .kind-hazard .initiative-name { color: var(--color-danger); }
.contact-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 0.5rem; }
.contact { padding: 0.5rem; background: var(--color-bg-elevated); border-left: 3px solid var(--color-danger); display: flex; flex-direction: column; gap: 0.25rem; }
.contact-hazard { border-left-color: var(--color-warning); }
.contact-destroyed { opacity: 0.5; text-decoration: line-through; }
.band-damaged { border-left-color: var(--color-warning); }
.band-critical { border-left-color: var(--color-danger); }
.contact-head { display: flex; justify-content: space-between; gap: 0.5rem; }
.contact-name { font-weight: 600; }
.contact-pos { font-size: 0.6875rem; color: var(--color-text-dim); }
.contact-meta { display: flex; justify-content: space-between; font-size: 0.6875rem; color: var(--color-text-dim); text-transform: capitalize; }
.contact-stations { display: flex; flex-wrap: wrap; gap: 0.25rem; }
.log-list { list-style: none; padding: 0; margin: 0; font-size: 0.75rem; display: flex; flex-direction: column; gap: 0.125rem; color: var(--color-text-dim); }
.log-round { color: var(--color-accent); font-family: monospace; margin-right: 0.25rem; }
.waiting-section { align-items: center; color: var(--color-text-dim); padding: 3rem 1rem; }
.waiting-icon { font-family: monospace; color: var(--color-accent); font-size: 1.5rem; animation: pulse 1.5s infinite; }
.sync-badge { align-self: flex-end; font-size: 0.625rem; letter-spacing: 0.15em; color: var(--color-text-dim); font-family: monospace; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
