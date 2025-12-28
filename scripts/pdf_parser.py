#!/usr/bin/env python3
"""
Starfinder 2e Alien Archive PDF Statblock Parser

Extracts creature statblocks from the Alien Core PDF and outputs JSON.
Format based on SF2e/PF2e Remaster statblock structure.
"""

import re
import json
import sys
import uuid
from pathlib import Path
from typing import Optional, List, Dict, Any

try:
    import pdfplumber
except ImportError:
    print("Installing pdfplumber...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pdfplumber"])
    import pdfplumber


def generate_id(name: str) -> str:
    """Generate a URL-friendly ID from creature name."""
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def sanitize_text(text: str) -> str:
    """Clean up text extracted from PDF - remove stray newlines and normalize whitespace."""
    if not text:
        return text
    # Replace newlines with spaces (PDF columns often break mid-word)
    text = re.sub(r'\n+', ' ', text)
    # Normalize multiple spaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def clean_creature_name(name: str) -> str:
    """Remove sidebar text and other artifacts from creature names."""
    # If there's a newline, the real name is usually AFTER it
    # (garbage from headers/sidebars gets prefixed)
    if '\n' in name:
        name = name.split('\n')[-1]

    # Remove any remaining whitespace issues
    name = sanitize_text(name)

    # Title case the result
    return name.title() if name else name


def sanitize_traits(traits: list) -> list:
    """Clean up trait strings - remove newlines and artifacts."""
    cleaned = []
    for trait in traits:
        if not trait or len(trait) < 2:
            continue

        # If there's a newline, take only the part BEFORE it
        # (garbage from adjacent columns gets appended)
        if '\n' in trait:
            trait = trait.split('\n')[0]

        trait = sanitize_text(trait)

        # Skip if too short after cleaning
        if len(trait) < 2:
            continue

        # Skip if it looks like garbage (all caps section headers, just numbers)
        if re.match(r'^[A-Z]{4,}$', trait) or re.match(r'^\d+$', trait):
            continue

        cleaned.append(trait)

    return cleaned


def sanitize_skills(skills: dict) -> dict:
    """Clean up skill names - remove newlines and artifacts."""
    # Valid PF2e/SF2e skill names
    VALID_SKILLS = [
        'acrobatics', 'arcana', 'athletics', 'computers', 'crafting',
        'deception', 'diplomacy', 'engineering', 'intimidation',
        'medicine', 'nature', 'occultism', 'performance',
        'piloting', 'religion', 'society', 'stealth', 'survival', 'thievery',
    ]

    cleaned = {}
    for skill_name, value in skills.items():
        # If there's a newline in a Lore skill, it's a line break - join with space
        # Otherwise, take only the part before the newline
        if '\n' in skill_name:
            if 'lore' in skill_name.lower():
                skill_name = skill_name.replace('\n', ' ')
            else:
                skill_name = skill_name.split('\n')[0]

        clean_name = sanitize_text(skill_name)

        # Accept known skills or Lore skills
        is_valid = any(clean_name.lower().startswith(s) for s in VALID_SKILLS)
        is_lore = clean_name.lower().endswith(' lore')

        if (is_valid or is_lore) and 3 <= len(clean_name) <= 30:
            cleaned[clean_name] = value

    return cleaned


class SF2eStatblockParser:
    """Parse Starfinder 2e statblocks from PDF text."""

    # Size keywords for detection
    SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']

    # Rarity keywords
    RARITIES = ['uncommon', 'rare', 'unique']

    def __init__(self, pdf_path: str):
        self.pdf_path = Path(pdf_path)
        self.creatures: List[Dict[str, Any]] = []

    def extract_text_by_page(self, start_page: int = 0, end_page: Optional[int] = None) -> List[str]:
        """Extract text from PDF pages, returning list of page texts."""
        pages_text = []

        with pdfplumber.open(self.pdf_path) as pdf:
            total_pages = len(pdf.pages)
            end = min(end_page or total_pages, total_pages)

            print(f"Extracting pages {start_page + 1} to {end} of {total_pages}...")

            for i in range(start_page, end):
                if i % 20 == 0:
                    print(f"  Processing page {i + 1}...")
                text = pdf.pages[i].extract_text() or ""
                pages_text.append(text)

        return pages_text

    def find_creature_blocks(self, text: str) -> List[Dict[str, Any]]:
        """Find all creature statblock starts in text."""
        # Pattern: NAME CREATURE LEVEL (where NAME is in caps or title case)
        # e.g., "YEARLING ARABUK CREATURE 3" or "Aeon Guard Commander CREATURE 8"
        pattern = r'([A-Z][A-Za-z\s\'-]+?)\s+CREATURE\s+(\d+)\s*\n'

        matches = list(re.finditer(pattern, text))
        blocks = []

        for i, match in enumerate(matches):
            raw_name = match.group(1).strip()
            level = int(match.group(2))
            start = match.start()
            # End at next creature or 3000 chars (reasonable statblock length)
            end = matches[i + 1].start() if i + 1 < len(matches) else min(start + 4000, len(text))

            # Clean up the creature name (remove sidebar text artifacts)
            cleaned_name = clean_creature_name(raw_name)

            blocks.append({
                'name': cleaned_name,
                'level': level,
                'text': text[start:end]
            })

        return blocks

    def parse_traits(self, text: str) -> tuple:
        """Extract size, rarity, and other traits from first few lines."""
        lines = text.split('\n')[:5]
        header = ' '.join(lines).lower()

        # Find size
        size = 'medium'
        for s in self.SIZES:
            if s in header:
                size = s
                break

        # Find rarity
        rarity = None
        for r in self.RARITIES:
            if r in header:
                rarity = r.title()
                break

        # Extract bracketed traits or capitalized trait words
        traits = []
        if rarity:
            traits.append(rarity)
        traits.append(size.title())

        # Look for common creature types
        type_keywords = ['aberration', 'animal', 'beast', 'construct', 'dragon',
                        'elemental', 'fey', 'fiend', 'giant', 'humanoid', 'monstrosity',
                        'ooze', 'plant', 'undead', 'celestial', 'cosmic', 'void',
                        'human', 'android', 'vesk', 'ysoki', 'kasatha', 'lashunta',
                        'shirren', 'skittermander', 'tech', 'magical', 'divine', 'occult']

        for keyword in type_keywords:
            if keyword in header:
                traits.append(keyword.title())

        return size, traits

    def parse_perception(self, text: str) -> tuple:
        """Extract perception bonus and senses."""
        match = re.search(r'Perception\s+([+-]?\d+)(?:[;,]\s*(.+?))?(?=\n|Languages|Skills)', text, re.IGNORECASE)
        if match:
            perception = int(match.group(1))
            senses_text = match.group(2) or ''
            senses = [s.strip() for s in senses_text.split(',') if s.strip()]
            return perception, senses
        return 0, []

    def parse_languages(self, text: str) -> List[str]:
        """Extract languages."""
        match = re.search(r'Languages\s+(.+?)(?=\n|Skills)', text, re.IGNORECASE)
        if match:
            langs = match.group(1).strip()
            if langs.lower() == 'none':
                return []
            return [l.strip() for l in langs.split(',') if l.strip()]
        return []

    def parse_skills(self, text: str) -> Dict[str, int]:
        """Extract skills and their modifiers."""
        skills = {}
        match = re.search(r'Skills\s+(.+?)(?=\nStr|$)', text, re.IGNORECASE | re.DOTALL)
        if match:
            skills_text = match.group(1)
            # Match patterns like "Acrobatics +21" or "Athletics +20"
            skill_pattern = r'([A-Za-z][A-Za-z\s]+?)\s+([+-]\d+)'
            for skill_match in re.finditer(skill_pattern, skills_text):
                skill_name = skill_match.group(1).strip()
                skill_value = int(skill_match.group(2))
                skills[skill_name] = skill_value
        return skills

    def parse_abilities(self, text: str) -> Dict[str, int]:
        """Extract ability modifiers."""
        abilities = {'str': 0, 'dex': 0, 'con': 0, 'int': 0, 'wis': 0, 'cha': 0}
        for ability in abilities.keys():
            match = re.search(rf'\b{ability}\s+([+-]?\d+)', text, re.IGNORECASE)
            if match:
                abilities[ability] = int(match.group(1))
        return abilities

    def parse_defenses(self, text: str) -> Dict[str, Any]:
        """Extract AC, saves, HP, immunities, resistances, weaknesses."""
        defenses = {
            'ac': 0,
            'saves': {'fort': 0, 'ref': 0, 'will': 0},
            'hp': 0,
            'immunities': [],
            'resistances': [],
            'weaknesses': []
        }

        # AC
        ac_match = re.search(r'AC\s+(\d+)', text, re.IGNORECASE)
        if ac_match:
            defenses['ac'] = int(ac_match.group(1))

        # Saves
        for save in ['fort', 'ref', 'will']:
            match = re.search(rf'{save}\s+([+-]?\d+)', text, re.IGNORECASE)
            if match:
                defenses['saves'][save] = int(match.group(1))

        # HP
        hp_match = re.search(r'HP\s+(\d+)', text, re.IGNORECASE)
        if hp_match:
            defenses['hp'] = int(hp_match.group(1))

        # Immunities
        imm_match = re.search(r'Immunities\s+(.+?)(?=;|Resistances|Weaknesses|Speed|\n\n)', text, re.IGNORECASE)
        if imm_match:
            defenses['immunities'] = [i.strip() for i in imm_match.group(1).split(',') if i.strip()]

        # Resistances
        res_match = re.search(r'Resistances\s+(.+?)(?=;|Weaknesses|Speed|\n\n)', text, re.IGNORECASE)
        if res_match:
            defenses['resistances'] = [r.strip() for r in res_match.group(1).split(',') if r.strip()]

        # Weaknesses
        weak_match = re.search(r'Weaknesses\s+(.+?)(?=;|Speed|\n\n)', text, re.IGNORECASE)
        if weak_match:
            defenses['weaknesses'] = [w.strip() for w in weak_match.group(1).split(',') if w.strip()]

        return defenses

    def parse_speed(self, text: str) -> str:
        """Extract speed."""
        match = re.search(r'Speed\s+(.+?)(?=\n|Melee|Ranged)', text, re.IGNORECASE)
        if match:
            speed = sanitize_text(match.group(1))
            # Remove any trailing garbage that's clearly not speed info
            speed = re.sub(r'\s+(to arcane|such as|Caypin|[A-Z][a-z]+\s+CREATURE).*$', '', speed, flags=re.IGNORECASE)
            return speed
        return '25 feet'

    def parse_attacks(self, text: str) -> List[Dict[str, Any]]:
        """Extract melee and ranged attacks."""
        attacks = []

        # Melee attacks: Melee [one-action] name +X (traits), Damage XdX+X type
        melee_pattern = r'Melee\s+\[one-action\]\s*([^+]+?)\s+([+-]\d+)\s*(?:\(([^)]+)\))?,?\s*Damage\s+([^\n;]+)'
        for match in re.finditer(melee_pattern, text, re.IGNORECASE):
            name = sanitize_text(match.group(1))
            bonus = int(match.group(2))
            traits_str = match.group(3) or ''
            traits = [t.strip() for t in traits_str.split(',') if t.strip()]
            traits = sanitize_traits(traits)
            damage = sanitize_text(match.group(4))

            attacks.append({
                'name': name,
                'type': 'melee',
                'bonus': bonus,
                'damage': damage,
                'traits': traits,
                'actions': 1
            })

        # Ranged attacks
        ranged_pattern = r'Ranged\s+\[one-action\]\s*([^+]+?)\s+([+-]\d+)\s*(?:\(([^)]+)\))?,?\s*Damage\s+([^\n;]+)'
        for match in re.finditer(ranged_pattern, text, re.IGNORECASE):
            name = sanitize_text(match.group(1))
            bonus = int(match.group(2))
            traits_str = match.group(3) or ''
            traits = [t.strip() for t in traits_str.split(',') if t.strip()]
            traits = sanitize_traits(traits)
            damage = sanitize_text(match.group(4))

            attacks.append({
                'name': name,
                'type': 'ranged',
                'bonus': bonus,
                'damage': damage,
                'traits': traits,
                'actions': 1
            })

        return attacks

    def parse_special_abilities(self, text: str) -> List[Dict[str, Any]]:
        """Extract special abilities."""
        abilities = []

        # Look for ability patterns: Name [action-type] (traits) Description
        # or Name Description (for passive abilities)
        ability_pattern = r'\n([A-Z][A-Za-z\s\']+)\s+(\[(?:one-action|two-actions|three-actions|reaction|free-action)\])?\s*(?:\(([^)]+)\))?\s+([A-Z][^.]+\.(?:[^.]+\.)*)'

        for match in re.finditer(ability_pattern, text):
            name = match.group(1).strip()
            action_type = match.group(2)
            traits_str = match.group(3) or ''
            description = match.group(4).strip()

            # Skip if this looks like a stat line
            if any(skip in name.lower() for skip in ['perception', 'languages', 'skills', 'speed', 'melee', 'ranged', 'ac ', 'hp ', 'fort', 'str ', 'dex ', 'con ', 'int ', 'wis ', 'cha ']):
                continue

            # Convert action type
            actions = None
            if action_type:
                action_map = {
                    '[one-action]': 1,
                    '[two-actions]': 2,
                    '[three-actions]': 3,
                    '[reaction]': 'reaction',
                    '[free-action]': 'free'
                }
                actions = action_map.get(action_type.lower())

            traits = [t.strip() for t in traits_str.split(',') if t.strip()] if traits_str else []

            ability = {
                'name': name,
                'description': description[:500]  # Limit description length
            }
            if actions is not None:
                ability['actions'] = actions
            if traits:
                ability['traits'] = traits

            abilities.append(ability)

        return abilities[:10]  # Limit to 10 abilities per creature

    def parse_items(self, text: str) -> List[str]:
        """Extract items/equipment."""
        match = re.search(r'Items\s+(.+?)(?=\nAC|\n\n)', text, re.IGNORECASE)
        if match:
            items_text = match.group(1).strip()
            # Split by comma but be careful with parentheses
            items = []
            current = ''
            paren_depth = 0
            for char in items_text:
                if char == '(':
                    paren_depth += 1
                elif char == ')':
                    paren_depth -= 1
                elif char == ',' and paren_depth == 0:
                    if current.strip():
                        items.append(current.strip())
                    current = ''
                    continue
                current += char
            if current.strip():
                items.append(current.strip())
            return items
        return []

    def parse_statblock(self, block: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single statblock into structured data."""
        text = block['text']
        name = block['name']
        level = block['level']

        size, traits = self.parse_traits(text)
        perception, senses = self.parse_perception(text)
        languages = self.parse_languages(text)
        skills = sanitize_skills(self.parse_skills(text))  # Apply sanitization
        abilities = self.parse_abilities(text)
        defenses = self.parse_defenses(text)
        speed = self.parse_speed(text)
        attacks = self.parse_attacks(text)
        special_abilities = self.parse_special_abilities(text)
        items = self.parse_items(text)

        # Sanitize senses and languages too
        senses = [sanitize_text(s) for s in senses if s]
        languages = [sanitize_text(l) for l in languages if l]

        creature = {
            'id': generate_id(name),
            'name': name,
            'level': level,
            'traits': traits,
            'size': size,
            'source': 'Alien Core',
            'perception': perception,
            'senses': senses,
            'languages': languages,
            'skills': skills,
            'abilities': abilities,
            'ac': defenses['ac'],
            'saves': defenses['saves'],
            'hp': defenses['hp'],
            'immunities': defenses['immunities'],
            'resistances': defenses['resistances'],
            'weaknesses': defenses['weaknesses'],
            'speed': speed,
            'attacks': attacks,
            'specialAbilities': special_abilities,
        }

        if items:
            creature['items'] = items

        return creature

    def parse_pdf(self, start_page: int = 0, end_page: Optional[int] = None) -> List[Dict[str, Any]]:
        """Parse the PDF and extract all creatures."""
        print(f"Opening PDF: {self.pdf_path}")

        pages_text = self.extract_text_by_page(start_page, end_page)
        full_text = '\n\n'.join(pages_text)

        print("Finding creature statblocks...")
        blocks = self.find_creature_blocks(full_text)
        print(f"Found {len(blocks)} potential creatures")

        seen_ids = set()
        for block in blocks:
            try:
                creature = self.parse_statblock(block)
                # Skip duplicates (same name)
                if creature['id'] in seen_ids:
                    continue
                seen_ids.add(creature['id'])

                self.creatures.append(creature)
                print(f"  Parsed: {creature['name']} (Level {creature['level']}) - AC {creature['ac']}, HP {creature['hp']}")
            except Exception as e:
                print(f"  Warning: Failed to parse {block['name']}: {e}")

        return self.creatures

    def save_json(self, output_path: str):
        """Save creatures to JSON file."""
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)

        with open(output, 'w') as f:
            json.dump(self.creatures, f, indent=2)

        print(f"\nSaved {len(self.creatures)} creatures to {output}")

    def preview_pages(self, page_nums: List[int]) -> str:
        """Preview specific pages."""
        with pdfplumber.open(self.pdf_path) as pdf:
            texts = []
            for p in page_nums:
                if 0 <= p < len(pdf.pages):
                    text = pdf.pages[p].extract_text() or ""
                    texts.append(f"\n{'='*60}\nPAGE {p + 1}\n{'='*60}\n{text}")
            return "\n".join(texts)


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Parse Starfinder 2e statblocks from PDF')
    parser.add_argument('pdf_path', help='Path to the Alien Core PDF')
    parser.add_argument('--output', '-o', default='../src/data/creatures.json',
                       help='Output JSON file path')
    parser.add_argument('--preview', '-p', type=int, nargs='+',
                       help='Preview specific page numbers (0-indexed)')
    parser.add_argument('--start', type=int, default=0,
                       help='Start page (0-indexed)')
    parser.add_argument('--end', type=int, default=None,
                       help='End page (0-indexed)')

    args = parser.parse_args()

    pdf_parser = SF2eStatblockParser(args.pdf_path)

    if args.preview:
        print(pdf_parser.preview_pages(args.preview))
    else:
        pdf_parser.parse_pdf(args.start, args.end)
        pdf_parser.save_json(args.output)

        # Print summary
        print("\n" + "="*60)
        print("PARSING COMPLETE")
        print("="*60)
        levels = {}
        for c in pdf_parser.creatures:
            levels[c['level']] = levels.get(c['level'], 0) + 1
        print("\nCreatures by level:")
        for level in sorted(levels.keys()):
            print(f"  Level {level}: {levels[level]} creatures")


if __name__ == '__main__':
    main()
