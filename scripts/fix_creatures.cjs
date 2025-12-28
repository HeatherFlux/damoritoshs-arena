#!/usr/bin/env node
/**
 * Fix creature data issues from PDF parsing
 * - Clean up names with sidebar text artifacts
 * - Remove newlines from traits, skills, speed
 * - Filter out garbage data
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../src/data/creatures.json');
const data = require(dataPath);

// Sanitization functions
function sanitizeText(text) {
  if (!text) return text;
  return text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanCreatureName(name) {
  // If there's a newline, the real name is usually AFTER it
  if (name.includes('\n')) {
    name = name.split('\n').pop();
  }
  return sanitizeText(name);
}

function sanitizeTraits(traits) {
  return traits
    .map(t => {
      // If there's a newline, take only the part BEFORE it
      if (t.includes('\n')) {
        t = t.split('\n')[0];
      }
      return sanitizeText(t);
    })
    .filter(t => t && t.length >= 2)
    .filter(t => !/^[A-Z]{4,}$/.test(t) && !/^\d+$/.test(t));
}

// Known valid PF2e/SF2e skills
const VALID_SKILLS = [
  'acrobatics', 'arcana', 'athletics', 'computers', 'crafting',
  'deception', 'diplomacy', 'engineering', 'intimidation',
  'medicine', 'nature', 'occultism', 'performance',
  'piloting', 'religion', 'society', 'stealth', 'survival', 'thievery',
];

function sanitizeSkills(skills) {
  const cleaned = {};
  for (let [name, value] of Object.entries(skills)) {
    // If there's a newline in a Lore skill, it's a line break - join with space
    // Otherwise, take only the part before the newline
    if (name.includes('\n')) {
      if (name.toLowerCase().includes('lore')) {
        name = name.replace(/\n/g, ' ');
      } else {
        name = name.split('\n')[0];
      }
    }

    const cleanName = sanitizeText(name);

    // Accept known skills or Lore skills
    const isValid = VALID_SKILLS.some(s => cleanName.toLowerCase().startsWith(s));
    const isLore = cleanName.toLowerCase().endsWith(' lore');

    if ((isValid || isLore) && cleanName.length >= 3 && cleanName.length <= 30) {
      cleaned[cleanName] = value;
    }
  }
  return cleaned;
}

function sanitizeSpeed(speed) {
  // If there's a newline, take only the part before it
  if (speed.includes('\n')) {
    speed = speed.split('\n')[0];
  }

  speed = sanitizeText(speed);

  // If speed is too long (>60 chars), extract just the speed values
  if (speed.length > 60) {
    const speedParts = speed.match(/(?:burrow|climb|fly|swim|)\s*\d+\s*feet/gi);
    if (speedParts && speedParts.length > 0) {
      speed = speedParts.join(', ');
    }
  }

  // Clean up trailing semicolons or garbage
  speed = speed.replace(/;\s*[a-z].*$/i, '');
  speed = speed.replace(/;\s*$/, '');

  return speed;
}

// Fix each creature
let fixCount = 0;
let issueDetails = [];

data.forEach((c, i) => {
  let fixed = false;

  // Fix name
  const cleanName = cleanCreatureName(c.name);
  if (cleanName !== c.name) {
    issueDetails.push(`Name: "${c.name}" -> "${cleanName}"`);
    c.name = cleanName;
    c.id = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    fixed = true;
  }

  // Fix speed
  if (c.speed) {
    const cleanSpeed = sanitizeSpeed(c.speed);
    if (cleanSpeed !== c.speed) {
      issueDetails.push(`Speed [${c.name}]: "${c.speed.substring(0, 50)}..." -> "${cleanSpeed.substring(0, 50)}..."`);
      c.speed = cleanSpeed;
      fixed = true;
    }
  }

  // Fix skills
  if (c.skills) {
    const originalKeys = Object.keys(c.skills);
    const cleanSkills = sanitizeSkills(c.skills);
    const cleanKeys = Object.keys(cleanSkills);

    if (originalKeys.length !== cleanKeys.length || originalKeys.some(k => !cleanKeys.includes(sanitizeText(k)))) {
      const removed = originalKeys.filter(k => {
        const clean = sanitizeText(k);
        return !cleanKeys.includes(clean) || clean !== k;
      });
      if (removed.length > 0) {
        issueDetails.push(`Skills [${c.name}]: Cleaned ${removed.map(r => `"${r}"`).join(', ')}`);
      }
      c.skills = cleanSkills;
      fixed = true;
    }
  }

  // Fix attacks
  if (c.attacks) {
    c.attacks.forEach((a, ai) => {
      if (a.traits) {
        const originalTraits = [...a.traits];
        const cleanTraits = sanitizeTraits(a.traits);

        if (JSON.stringify(cleanTraits) !== JSON.stringify(originalTraits)) {
          const removed = originalTraits.filter(t => !cleanTraits.includes(sanitizeText(t)));
          if (removed.length > 0) {
            issueDetails.push(`Traits [${c.name}/${a.name}]: Cleaned ${removed.length} traits`);
          }
          a.traits = cleanTraits;
          fixed = true;
        }
      }
      if (a.damage) {
        const cleanDamage = sanitizeText(a.damage);
        if (cleanDamage !== a.damage) {
          a.damage = cleanDamage;
          fixed = true;
        }
      }
    });
  }

  // Fix senses
  if (c.senses) {
    c.senses = c.senses.map(s => sanitizeText(s)).filter(s => s);
  }

  // Fix languages
  if (c.languages) {
    c.languages = c.languages.map(l => sanitizeText(l)).filter(l => l);
  }

  if (fixed) fixCount++;
});

// Write back
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

console.log('='.repeat(60));
console.log('CREATURE DATA CLEANUP COMPLETE');
console.log('='.repeat(60));
console.log(`\nFixed ${fixCount} creatures\n`);

if (issueDetails.length > 0) {
  console.log('Details:');
  issueDetails.forEach(d => console.log(`  - ${d}`));
}
