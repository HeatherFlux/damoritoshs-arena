/**
 * Fetch vehicles from AoN Elasticsearch and save to bundled JSON.
 *
 * Tech Core vehicles are not on AoN; they come from scripts/parse-techcore.py and live in
 * src/data/vehicles.json. This script owns src/data/aonVehicles.json (GM Core and later books).
 * AoN does not carry the flavor description, so `description` is left empty.
 */
import { readFileSync, writeFileSync } from 'fs';

const RAW = process.argv[2] || '/tmp/aon_vehicles_raw.json';
const OUT = new URL('../src/data/aonVehicles.json', import.meta.url);

function slug(name) {
  return name.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Strip AoN markdown down to plain text. */
function plain(text) {
  return (text || '')
    .replace(/\{\{traits \d+ "([^"]+)"\}\}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseActions(str) {
  const s = str.toLowerCase();
  if (s.includes('reaction')) return 'reaction';
  if (s.includes('free')) return 'free';
  if (s.includes('three')) return 3;
  if (s.includes('two')) return 2;
  return 1;
}

/** "Piloting (DC 23) or Nature (DC 25; wind only)" -> [{skill, dc, note?}] */
function parsePilotingChecks(text) {
  const checks = [];
  const re = /([A-Z][A-Za-z ]+?)\s*\(DC (\d+)(?:;\s*([^)]+))?\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const check = { skill: m[1].replace(/^(?:or|and)\s+/i, '').trim(), dc: parseInt(m[2], 10) };
    if (m[3]) check.note = m[3].trim();
    checks.push(check);
  }
  return checks;
}

/** "fly 60 feet (motorized) or fly 40 feet (wind)" -> [{feet, mode, kind?}] */
function parseSpeeds(text) {
  const speeds = [];
  const re = /(?:(fly|swim|climb|burrow)\s+)?(\d+) feet\s*\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const speed = { feet: parseInt(m[2], 10), mode: m[3].trim() };
    if (m[1]) speed.kind = m[1];
    speeds.push(speed);
  }
  return speeds;
}

function parseDefenseList(markdown, label) {
  const m = markdown.match(new RegExp(`\\*\\*${label}\\*\\*\\s*([^\\n]+)`));
  if (!m) return [];
  return plain(m[1]).split(/,\s*/).map(s => s.trim()).filter(Boolean);
}

/** Everything after the Collision line is the vehicle's abilities. */
function parseAbilities(markdown) {
  const after = markdown.split(/\*\*Collision\*\*[^\n]*\n/)[1];
  if (!after) return [];
  const body = after.replace(/<\/column>[\s\S]*$/, '').replace(/<br\s*\/?>/g, '\n');
  const abilities = [];
  const re = /\*\*([^*]+)\*\*\s*(?:<actions string="([^"]+)"[^>]*>)?\s*(?:\(([^)]*\]\([^)]*\)[^)]*|[^)]*)\))?\s*([\s\S]*?)(?=\n\s*\*\*[A-Z][^*]+\*\*\s*(?:<actions|\(|[A-Z])|$)/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const name = m[1].trim();
    if (['Requirements', 'Effect', 'Trigger', 'Frequency'].includes(name)) continue;
    const ability = { name };
    if (m[2]) ability.actions = parseActions(m[2]);
    if (m[2] && m[3]) ability.traits = plain(m[3]).split(/,\s*/).filter(Boolean);
    let text = m[2] && m[3] ? m[4] : `${m[3] ? `(${m[3]}) ` : ''}${m[4]}`;
    const req = text.match(/\*\*Requirements\*\*\s*([\s\S]*?);\s*\*\*Effect\*\*/);
    if (req) ability.requirements = plain(req[1]);
    text = text.replace(/\*\*Requirements\*\*[\s\S]*?;\s*\*\*Effect\*\*/, '').replace(/\*\*Effect\*\*/, '');
    ability.effect = plain(text);
    if (ability.effect) abilities.push(ability);
  }
  return abilities;
}

const raw = JSON.parse(readFileSync(RAW, 'utf8'));
const vehicles = raw.hits.hits.map(({ _source: s }) => {
  const md = s.markdown || '';
  const speedText = plain(s.speed_raw || '');
  const collision = md.match(/\*\*Collision\*\*\s*([^\s(]+(?:\s+[a-z]+)?)\s*\(DC (\d+)\)/);
  const hp = String(s.hp_raw || '').match(/(\d+)(?:\s*\(BT (\d+)\))?/);
  const page = String(s.primary_source_raw || '').match(/pg\. (\d+)/);
  const space = md.match(/\*\*Space\*\*\s*([^\n]+)/);
  const crew = md.match(/\*\*Crew\*\*\s*([^\n]+)/);
  const passengers = md.match(/\*\*Passengers\*\*\s*([^\n]+)/);
  const fort = md.match(/\*\*Fort\*\*\s*\+?(-?\d+)/);

  const vehicle = {
    id: slug(s.name),
    name: s.name,
    level: s.level,
    source: s.primary_source,
    page: page ? parseInt(page[1], 10) : undefined,
    immunities: parseDefenseList(md, 'Immunities'),
    abilities: parseAbilities(md),
    rarity: (s.rarity || 'common').toLowerCase(),
    size: String(Array.isArray(s.size) ? s.size[0] : s.size).toLowerCase(),
    traits: (s.trait_raw || []).map(t => String(t).toLowerCase()),
    vehicleType: s.vehicle_type,
    price: s.price_raw || '',
    description: '',
    space: space ? plain(space[1]) : '',
    crew: crew ? plain(crew[1]) : '',
    pilotingChecks: parsePilotingChecks(s.piloting_check || ''),
    pilotingCheckText: s.piloting_check || '',
    ac: s.ac,
    saves: { fort: fort ? parseInt(fort[1], 10) : s.fortitude_save },
    hardness: s.hardness,
    hp: hp ? parseInt(hp[1], 10) : 0,
    bt: hp && hp[2] ? parseInt(hp[2], 10) : undefined,
    speed: parseSpeeds(speedText),
    speedText,
    collision: collision
      ? { damage: collision[1].trim(), dc: parseInt(collision[2], 10) }
      : { damage: '', dc: 0 },
  };
  if (passengers) {
    vehicle.passengersText = plain(passengers[1]);
    const n = vehicle.passengersText.match(/\d+/);
    if (n) vehicle.passengers = parseInt(n[0], 10);
  }
  const resistances = parseDefenseList(md, 'Resistances');
  const weaknesses = parseDefenseList(md, 'Weaknesses');
  if (resistances.length) vehicle.resistances = resistances;
  if (weaknesses.length) vehicle.weaknesses = weaknesses;
  return vehicle;
});

vehicles.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

const problems = [];
for (const v of vehicles) {
  if (!v.pilotingChecks.length) problems.push(`${v.name}: no piloting checks parsed`);
  if (!v.hp || v.bt === undefined) problems.push(`${v.name}: HP/BT missing`);
  if (!v.collision.dc) problems.push(`${v.name}: collision missing`);
  if (!v.speedText) problems.push(`${v.name}: speed missing`);
  if (v.ac === undefined || v.hardness === undefined) problems.push(`${v.name}: AC/Hardness missing`);
}

writeFileSync(OUT, JSON.stringify(vehicles, null, 2) + '\n');
console.log(`Wrote ${vehicles.length} vehicles to src/data/aonVehicles.json`);
if (problems.length) {
  console.warn(`${problems.length} problem(s):`);
  for (const p of problems) console.warn(`  - ${p}`);
  process.exit(1);
}
