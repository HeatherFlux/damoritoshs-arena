#!/usr/bin/env python3
"""
Independent check of the bundled chase and vehicle data against the Starfinder GM Core PDF.

  python3 scripts/audit-chase.py <GM Core 204-221.pdf> <GM Core 222-239.pdf> <GM Core 240-253.pdf>

1. Parses the Sample Obstacles table (p. 217) straight from the PDF text and compares it with
   scripts/chase-obstacles-oracle.json. With --write it rewrites the oracle instead.
   src/test/chaseData.test.ts then checks src/data/chaseObstacles.ts against that oracle.
2. Finds every GM Core vehicle stat block (pp. 238-240, which spans two chapter files) in the PDF text and compares level, AC,
   Fort, Hardness, HP, BT and Collision with src/data/aonVehicles.json.

Exits 1 on any discrepancy.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORACLE = ROOT / 'scripts' / 'chase-obstacles-oracle.json'
ORDINAL = r'(\d+)(?:st|nd|rd|th)'
ENVIRONMENTS = ['UNDERGROUND', 'URBAN', 'VEHICLE', 'WILDERNESS']
SKILLS = {
    'Acrobatics', 'Athletics', 'Computers', 'Crafting', 'Fortitude', 'Intimidation', 'Nature',
    'Perception', 'Performance', 'Piloting', 'Reflex', 'Society', 'Stealth', 'Survival', 'Thievery',
}


def pdf_text(path, first, last, layout=False):
    args = ['pdftotext', '-f', str(first), '-l', str(last)]
    if layout:
        args.append('-layout')
    return subprocess.run(args + [path, '-'], capture_output=True, text=True, check=True).stdout


def parse_options(text):
    """'DC 15 Acrobatics or Athletics to weave, DC 13 Society to follow' -> [{dc, skills}]"""
    options = []
    for m in re.finditer(r'DC (\d+) ([A-Z][a-z]+(?: or [A-Z][a-z]+)*)', text):
        skills = m.group(2).split(' or ')
        unknown = [s for s in skills if s not in SKILLS]
        if unknown:
            raise SystemExit(f'unknown skill {unknown} in: {text!r}')
        options.append({'dc': int(m.group(1)), 'skills': skills})
    return options


NAME_COLUMN = 29      # the obstacle name sits left of this column, the approaches right of it
SIDEBAR_COLUMN = 128  # chapter navigation printed in the page margin


def parse_obstacles(pdf):
    # -layout keeps the two table columns at fixed character offsets
    text = pdf_text(pdf, 14, 14, layout=True)
    env = None
    rows = []  # [environment, name text, body text]
    for line in text.split('\n'):
        line = line[:SIDEBAR_COLUMN].rstrip()
        heading = re.match(r'^\s*(' + '|'.join(ENVIRONMENTS) + r') OBSTACLES', line)
        if heading:
            env = heading.group(1).lower()
            continue
        if env is None or not line.strip():
            continue
        name, body = line[:NAME_COLUMN].strip(), line[NAME_COLUMN:].strip()
        starts_row = bool(name) and not re.match(r'^\(' + ORDINAL + r'\)$', name)
        if starts_row:
            rows.append([env, name, body])
        elif rows:
            rows[-1][1] = (rows[-1][1] + ' ' + name).strip()
            rows[-1][2] += ' ' + body

    obstacles = []
    for env, name_cell, body in rows:
        head = re.match(r'^(.*?)\s*\(' + ORDINAL + r'\)$', name_cell)
        if not head:
            raise SystemExit(f'could not read the name and level from {name_cell!r}')
        body = re.sub(r'\s+', ' ', body).strip()
        base_text, _, variant_text = body.partition(';')
        base = {'name': head.group(1).strip(), 'level': int(head.group(2)), 'environment': env,
                'options': parse_options(base_text)}
        obstacles.append(base)
        v = re.match(r'^\s*(.*?)\s*\(' + ORDINAL + r'\)\s*(.*)$', variant_text)
        if not v:
            raise SystemExit(f"no higher-level variant found for {base['name']!r}")
        obstacles.append({'name': v.group(1).strip(), 'level': int(v.group(2)), 'environment': env,
                          'base': base['name'], 'options': parse_options(v.group(3))})
    return obstacles


def audit_vehicles(pdf, next_pdf):
    problems = []
    text = pdf_text(pdf, 17, 18) + pdf_text(next_pdf, 1, 1)
    flat = re.sub(r'\s+', ' ', text)
    vehicles = [v for v in json.loads((ROOT / 'src/data/aonVehicles.json').read_text()) if v['source'] == 'GM Core']
    for v in vehicles:
        # Stat line: "AC 16; Fort +11 Hardness 5, HP 60 (BT 30)" then "Collision 2d10 (DC 19)"
        want_def = f"AC {v['ac']}; Fort +{v['saves']['fort']}"
        want_hp = f"Hardness {v['hardness']}, HP {v['hp']} (BT {v['bt']})"
        want_col = f"Collision {v['collision']['damage']} (DC {v['collision']['dc']})"
        # The name can also appear in running text, so try every occurrence as the stat block start
        starts = [m.start() for m in re.finditer(re.escape(v['name'].upper()), flat)]
        if not starts:
            problems.append(f"{v['name']}: name not found in the PDF")
            continue
        wanted = [('level', f"VEHICLE {v['level']} "), ('defenses', want_def), ('hit points', want_hp),
                  ('collision', want_col)]
        wanted += [('piloting check', f"{c['skill']} (DC {c['dc']}") for c in v['pilotingChecks']]
        best = None
        for at in starts:
            # Text extraction does not keep reading order across columns, so look both ways
            window = flat[max(0, at - 3000):at + 2600]
            missing = [(label, want) for label, want in wanted if want not in window]
            if best is None or len(missing) < len(best):
                best = missing
        for label, want in best:
            problems.append(f"{v['name']}: {label} {want!r} not found in its stat block")
    return len(vehicles), problems


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    write = '--write' in sys.argv
    if len(args) != 3:
        raise SystemExit(__doc__)
    chase_pdf, vehicle_pdf, next_pdf = args

    obstacles = parse_obstacles(chase_pdf)
    problems = []
    if write:
        ORACLE.write_text(json.dumps(obstacles, indent=2) + '\n')
        print(f'wrote {len(obstacles)} obstacles to {ORACLE.relative_to(ROOT)}')
    else:
        oracle = json.loads(ORACLE.read_text())
        want = {o['name']: o for o in oracle}
        got = {o['name']: o for o in obstacles}
        for name in sorted(set(want) | set(got)):
            if name not in got:
                problems.append(f'obstacle {name}: in the oracle but not parsed from the PDF')
            elif name not in want:
                problems.append(f'obstacle {name}: in the PDF but not in the oracle')
            elif want[name] != got[name]:
                problems.append(f'obstacle {name}: oracle {want[name]} != PDF {got[name]}')
    for o in obstacles:
        if len(o['options']) < 2:
            problems.append(f"obstacle {o['name']}: only {len(o['options'])} option(s) parsed")

    count, vehicle_problems = audit_vehicles(vehicle_pdf, next_pdf)
    problems += vehicle_problems

    print(f'{len(obstacles)} obstacles, {count} GM Core vehicles checked, {len(problems)} discrepancies')
    for p in problems:
        print('  -', p)
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
