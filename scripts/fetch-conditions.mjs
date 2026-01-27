/**
 * Fetch conditions from AoN Elasticsearch and update descriptions in conditions.ts
 * Preserves mechanical effects, only updates text descriptions
 */
import { readFileSync, writeFileSync } from 'fs';

// Fetch and parse AoN conditions
const raw = JSON.parse(readFileSync('/tmp/aon_conditions_raw.json', 'utf-8'));
const hits = raw.hits?.hits || [];

const aonConditions = {};
for (const hit of hits) {
  const src = hit._source;
  const name = src.name;
  const key = name.toLowerCase().replace(/\s+/g, '-');

  // Clean up the text description - remove source prefix
  let description = (src.text || '')
    .replace(/^\s*\w+\s+Source\s+[^]+?(?=You|A |The |This |An )/i, '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  aonConditions[key] = {
    name,
    key,
    description
  };
}

// Read existing conditions.ts
const conditionsPath = './src/data/conditions.ts';
let content = readFileSync(conditionsPath, 'utf-8');

// Track updates
let updates = 0;

// Parse the CONDITIONS object and update descriptions
for (const [key, aon] of Object.entries(aonConditions)) {
  // Skip if description is too short
  if (aon.description.length < 20) continue;

  // Escape the description for use in a single-quoted string
  const newDesc = aon.description
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");

  // Find the condition block by looking for the key followed by description
  // Use a more specific pattern that matches the whole description string
  const keyPattern = key === 'off-guard' || key === 'persistent-damage'
    ? `'${key}'`
    : key;

  // Match: description: 'anything until closing quote that's followed by comma or newline'
  const regex = new RegExp(
    `(${keyPattern}:\\s*\\{[\\s\\S]*?description:\\s*')([^']*(?:\\\\'[^']*)*)(',)`,
    'm'
  );

  const match = content.match(regex);
  if (match) {
    const oldDesc = match[2];
    if (oldDesc !== newDesc) {
      content = content.replace(match[0], match[1] + newDesc + match[3]);
      updates++;
      console.log(`Updated: ${aon.name}`);
    }
  } else {
    console.log(`Not found: ${key}`);
  }
}

writeFileSync(conditionsPath, content);
console.log(`\nUpdated ${updates} condition descriptions`);
