#!/usr/bin/env python3
"""
Independent cross-check of the bundled Tech Core data against the PDF.

`scripts/parse-techcore.py` reads the book through `pdftohtml -xml` and font
classification. This script deliberately uses a different path — plain
`pdftotext -layout` (whole pages for full-width tables, per-column crops for
the two-column archive) plus regexes — and diffs the results against:

  src/data/tscStarships.json   level, AC, Fort/Ref/Will, HP, SP, fortify, Speed,
                               Perception, sensor range for every ship
  src/data/tscFrames.ts        all 20 rows × 3 frames
  src/data/tscStations.ts      the six battle-station advancement tables
  src/data/tscWeapons.ts       the ranged starship weapons table

It checks every record, never a sample. Exit code 1 on any discrepancy.

Usage: python3 scripts/audit-techcore.py "<path to Tech Core PDF>"
"""

import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def page_text(pdf, first, last):
    return subprocess.run(['pdftotext', '-layout', '-f', str(first), '-l', str(last), pdf, '-'],
                          capture_output=True, text=True, check=True).stdout


def column_text(pdf, first, last):
    out = []
    for pg in range(first, last + 1):
        geo = [(78, 234), (312, 232)] if pg % 2 else [(58, 234), (292, 232)]
        for x, w in geo:
            out.append(subprocess.run(
                ['pdftotext', '-f', str(pg), '-l', str(pg), '-x', str(x), '-y', '45', '-W', str(w), '-H', '700', '-layout', pdf, '-'],
                capture_output=True, text=True, check=True).stdout)
    return '\n'.join(out).replace('\x08', '')


def norm(n):
    return re.sub(r'[^a-z0-9]+', '-', n.replace('’', "'").lower()).strip('-')


def check_ships(pdf, issues):
    arch = column_text(pdf, 211, 246)   # printed pp. 210-245
    arch = re.sub(r'\n(\s*[A-Z][A-Z0-9\'’\- ]+)\n\s*(STARSHIP\s+[–\-]?\d+)\s*$', r'\n\1   \2', arch, flags=re.M)
    ships = json.loads((REPO / 'src/data/tscStarships.json').read_text())
    byslug = {norm(s['name']): s for s in ships}
    seen = set()
    for blk in re.split(r'\n(?=\s*[A-Z][A-Z0-9\'’\- ]+\s{2,}STARSHIP\s+[–\-]?\d+\s*$)', arch, flags=re.M):
        m = re.match(r'\s*([A-Z][A-Z0-9\'’\- ]+?)\s{2,}STARSHIP\s+([–\-]?\d+)', blk)
        if not m:
            continue
        name, lvl = m.group(1).strip(), int(m.group(2).replace('–', '-'))
        s = byslug.get(norm(name)) or next((v for k, v in byslug.items() if k.endswith(norm(name))), None)
        if not s:
            issues.append(f'ship block "{name}" has no JSON record')
            continue
        seen.add(s['name'])
        body = re.sub(r'\s+', ' ', blk)

        def grab(pat):
            mm = re.search(pat, body)
            return int(mm.group(1)) if mm else None

        hpm = re.search(r'\bHP (\d+)', body)
        spm = re.search(r'\bSP (\d+)(?: \(fortify (\d+)\))?', body[hpm.end():hpm.end() + 200]) if hpm else None
        checks = {
            'level': (lvl, s['level']),
            'ac': (grab(r'\bAC (\d+);'), s['ac']),
            'fort': (grab(r'Fort(?:itude)?\s*\+(\d+)'), s['saves']['fort']),
            'ref': (grab(r'Ref(?:lex)?\s*\+(\d+)'), s['saves']['ref']),
            'will': (grab(r'Will\s*\+(\d+)'), s['saves']['will']),
            'hp': (int(hpm.group(1)) if hpm else None, s['hp']),
            'speed': (grab(r'\bSpeed (\d+) zones?'), s['speed']),
            'perception': (grab(r'\bPerception \+(\d+)'), s['perception']),
            'sensorRange': (grab(r'Sensor Range (\d+)'), s['sensorRange']),
            'sp': (int(spm.group(1)) if spm else None, s.get('sp')),
            'fortify': (int(spm.group(2)) if spm and spm.group(2) else None, s.get('fortify')),
        }
        for k, (b, c) in checks.items():
            if b != c:
                issues.append(f'ship {s["name"]}.{k}: book {b} vs data {c}')
    for name in sorted({s['name'] for s in ships} - seen):
        issues.append(f'ship {name}: not found in the archive text')
    print(f'ships: {len(seen)}/{len(ships)} cross-checked on 11 fields each')


def check_frames(pdf, issues):
    txt = page_text(pdf, 198, 200)   # printed pp. 197-199
    ts = (REPO / 'src/data/tscFrames.ts').read_text()
    for name, fid in (('BULWARK', 'bulwark'), ('EXPLORER', 'explorer'), ('SKIRMISHER', 'skirmisher')):
        start = txt.index(f'{name} STATISTICS BY LEVEL')
        ends = [txt.index(t) for t in ('EXPLORER STATISTICS BY LEVEL', 'SKIRMISHER STATISTICS BY LEVEL', 'CUSTOMIZING STARSHIPS') if txt.index(t) > start]
        seg = txt[start:min(ends) if ends else len(txt)]
        book = {int(m.group(1)): tuple(int(m.group(k)) for k in range(2, 9))
                for m in re.finditer(r'^\s*(\d{1,2})\s+(\d+)\s+(\d+)\s+(\d+)\s+\+(\d+)\s+\+(\d+)\s+\+(\d+)\s+(\d) zones', seg, re.M)}
        i = ts.index(f'  {fid}: {{')
        cseg = ts[i:]
        cseg = cseg[cseg.index('levels: rows(['):]
        cseg = cseg[:cseg.index(']),')]
        code = {r[0]: r[1:] for r in (tuple(map(int, m.group(1).split(','))) for m in re.finditer(r'\[([\d, ]+)\]', cseg))}
        for lvl in range(1, 21):
            if book.get(lvl) != code.get(lvl):
                issues.append(f'frame {fid} L{lvl}: book {book.get(lvl)} vs data {code.get(lvl)}')
        print(f'frame {fid}: {len(book)}/20 rows cross-checked')


def check_stations(pdf, issues):
    adv = column_text(pdf, 179, 184)   # printed pp. 178-183
    ts = (REPO / 'src/data/tscStations.ts').read_text()
    tracks = {'fast': [1, 2, 4, 10, 12, 16, 19], 'slow': [1, 2, 5, 8, 11, 14, 18]}
    slots = [0, 1, 2, 2, 3, 3, 4]
    tables = {
        'DRONE CONSOLE ADVANCEMENT': ('fast', "'drone console'", lambda r: {'drones': int(r)}),
        'GENERATOR ADVANCEMENT': ('slow', 'generator', lambda r: {'fort': int(r.replace('+', ''))}),
        'GUNNERY ADVANCEMENT': ('fast', 'gunnery', lambda r: {'damageDice': int(r.split()[0]), 'tracking': int(re.search(r'\+(\d)', r).group(1)) if 'Tracking' in r else 0}),
        'MAGIC CONDUIT ADVANCEMENT': ('slow', "'magic conduit'", lambda r: {'will': int(r.replace('+', ''))}),
        'PILOT’S CONSOLE ADVANCEMENT': ('slow', '"pilot\'s console"', lambda r: {'ac': int(r.split()[0].replace('+', '')), 'ref': int(r.split()[1].replace('+', ''))}),
        'SCANNERS ADVANCEMENT': ('slow', 'scanners', lambda r: {'will': int(r.split()[0].replace('+', '')), 'sensorRange': int(re.search(r'\+(\d)', r.split(None, 1)[1]).group(1))}),
    }
    grades = ('Commercial', 'Tactical', 'Advanced', 'Superior', 'Elite', 'Ultimate', 'Paragon')
    for title, (track, key, parse) in tables.items():
        seg = adv[adv.index(title):adv.index(title) + 1500]
        ci = ts.index(f'  {key}: [', ts.index('STATION_HELMED_BONUS'))
        code_rows = [dict(re.findall(r'(\w+): (\d+)', m.group(0))) for m in re.finditer(r'\{[^}]*\}', ts[ci:ts.index('],', ci)])]
        for idx, g in enumerate(grades):
            m = re.search(rf'^\s*{g}\s+(\d+)\s+(\d+)\s+(.*)$', seg, re.M)
            if not m:
                issues.append(f'{title} {g}: row unreadable in book text')
                continue
            if int(m.group(1)) != tracks[track][idx]:
                issues.append(f'{title} {g}: book level {m.group(1)} vs data {tracks[track][idx]}')
            if int(m.group(2)) != slots[idx]:
                issues.append(f'{title} {g}: book upgrades {m.group(2)} vs data {slots[idx]}')
            got = {k: int(v) for k, v in code_rows[idx].items()}
            for k, v in parse(m.group(3).strip()).items():
                if got.get(k, 0) != v:
                    issues.append(f'{title} {g}: {k} book {v} vs data {got.get(k, 0)}')
    print('station advancement: 6 tables × 7 grades cross-checked')


def check_weapons(pdf, issues):
    txt = page_text(pdf, 193, 193)   # printed p. 192
    tw = (REPO / 'src/data/tscWeapons.ts').read_text()
    code = {}
    for m in re.finditer(r"\{ id: '([^']+)', name: '([^']+)', proficiency: '(\w+)', damageDie: '(\w+)', damageType: '(\w+)', range: (\d+), upgrades: (\d+), group: '(\w+)', traits: \[([^\]]*)\]", tw):
        code[m.group(2).lower()] = dict(prof=m.group(3), die=m.group(4), dtype=m.group(5)[0].upper(), rng=int(m.group(6)), ups=int(m.group(7)), group=m.group(8),
                                        traits=sorted(t.strip().strip("'").lower() for t in m.group(9).split(',') if t.strip()))
    seg = txt[txt.index('SIMPLE RANGED STARSHIP WEAPONS'):txt.index('Disruptor Rifle: Too large')]
    lines = seg.split('\n')
    prof, book = None, {}
    for i, line in enumerate(lines):
        if 'SIMPLE RANGED' in line: prof = 'simple'
        elif 'MARTIAL RANGED' in line: prof = 'martial'
        elif 'ADVANCED RANGED' in line: prof = 'advanced'
        m = re.match(r'^\s*([A-Z][a-z][A-Za-z ]+?)\s{2,}(\d)\s+(\d+d\d+) ([A-Z])\s+(\d+) zones\s+(\d)\s+(\w+)\s+(.*?)\s*$', line)
        if m and prof:
            name = m.group(1).strip().lower()
            nxt = lines[i + 1].strip() if i + 1 < len(lines) else ''
            if re.match(r'^[a-z]+$', nxt):
                name += ' ' + nxt
            book[name] = dict(prof=prof, die=m.group(3), dtype=m.group(4), rng=int(m.group(5)), ups=int(m.group(6)), group=m.group(7).lower(),
                              traits=sorted(t.strip().lower().replace('ordinance', 'ordnance') for t in m.group(8).split(',') if t.strip()))
    for name, b in book.items():
        c = code.get(name)
        if not c:
            issues.append(f'weapon {name}: missing from data')
            continue
        for k in b:
            if b[k] != c[k]:
                issues.append(f'weapon {name}.{k}: book {b[k]} vs data {c[k]}')
    for name in code:
        if name not in book:
            issues.append(f'weapon {name}: in data but not in the book table')
    print(f'weapons: {len(book)} book rows vs {len(code)} data rows cross-checked')


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    pdf = sys.argv[1]
    issues = []
    check_ships(pdf, issues)
    check_frames(pdf, issues)
    check_stations(pdf, issues)
    check_weapons(pdf, issues)
    print()
    for i in issues:
        print('DISCREPANCY', i)
    print(f'{len(issues)} discrepancy(ies)')
    sys.exit(1 if issues else 0)


if __name__ == '__main__':
    main()
