#!/usr/bin/env python3
"""
Starfinder Tech Core PDF parser.

Extracts the Starship Archive (NPC starships), Starship Hazards, and Vehicles
chapters into bundled JSON for Damoritosh's Arena:

  src/data/tscStarships.json
  src/data/tscHazards.json
  src/data/vehicles.json
  src/data/tscSharedAbilities.json   (faction "common actions and features")

The book is laid out in two columns with a chapter-nav sidebar, so whole-page
text extraction interleaves the columns. This script uses `pdftohtml -xml`
(poppler) to get positioned text fragments with font metadata: fragments are
assigned to a column by x position, grouped into lines by y position, and
classified by font (body / stat-block header / trait bar / entity name heading
/ section heading / sidebar). Bold runs at the start of a line mark where a
new stat-block entry (field or ability) begins, which is far more reliable
than indentation because text wraps around artwork.

Usage:
  python3 scripts/parse-techcore.py <pdf> [--out-dir src/data] [--validate]
        [--debug-dir DIR] [--archive A-B] [--hazards A-B] [--vehicles A-B]

Page ranges are PDF page numbers (printed page + 1).
"""

import argparse
import html as htmllib
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
INVENTORY_PATH = Path(__file__).resolve().parent / 'techcore-inventory.json'
SOURCE = 'Starfinder Tech Core'

# ---------------------------------------------------------------------------
# Page geometry in pdftohtml units (points * 1.5). Column split and sidebar cut.
# ---------------------------------------------------------------------------
COLUMN_SPLIT_X = 440
SIDEBAR_X = 800
LINE_TOLERANCE = 4
PAGE_HEADER_Y = 50

DEFAULT_RANGES = {
    'archive': (207, 246),   # printed 206-245
    'hazards': (247, 256),   # printed 246-255
    'vehicles': (135, 142),  # printed 134-141
}

# Faction attribution by printed page (archive chapter).
FACTIONS = [
    ('global', 'Common', 206, 209),
    ('azlanti-star-empire', 'Azlanti Star Empire', 210, 213),
    ('corpse-fleet', 'Corpse Fleet', 214, 215),
    ('free-captains', 'Free Captains', 216, 219),
    ('hellknights', 'Hellknights', 220, 221),
    ('knights-of-golarion', 'Knights of Golarion', 222, 223),
    ('pact-worlds', 'Pact Worlds', 224, 229),
    ('stewards', 'Stewards', 230, 231),
    ('swarm', 'Swarm', 232, 233),
    ('veskarium', 'Veskarium', 234, 235),
    ('xenowardens', 'Xenowardens', 236, 237),
    ('near-space', 'Near Space', 238, 241),
    ('the-vast', 'The Vast', 242, 245),
]

GLYPH_COST = {
    'one-action': 1, 'two-actions': 2, 'three-actions': 3,
    'reaction': 'reaction', 'free-action': 'free',
}
RARITIES = {'UNCOMMON': 'uncommon', 'RARE': 'rare', 'UNIQUE': 'unique'}
SIZES = {'TINY': 'tiny', 'SMALL': 'small', 'MEDIUM': 'medium', 'LARGE': 'large', 'HUGE': 'huge', 'GARGANTUAN': 'gargantuan'}
STATION_ALIASES = {'fortify-shields': 'fortify-shield-points'}


def name_matches(name: str, pool) -> bool:
    key = STATION_ALIASES.get(slug(name), slug(name))
    candidates = {key, key.rstrip('s'), key + 's'}
    return any(c in pool for c in candidates)
SIDEBAR_TOKENS = ['INTRODUCTION', 'GM’S ARSENAL', "GM'S ARSENAL", 'GLOSSARY', 'Tech CORE', 'STARSHIP SHEET']

# Rows of the "Starship Hazards by Level" table (p. 247) render as dark body text inside a box.
TABLE_ROW_RE = re.compile(r"^(?:[A-Z][\w'’\- ]+?\s*[–\-]?\d+\s*(?:Simple|Complex)\s*\d{3}\s*)+$")
HEADER_KIND_RE = re.compile(r"\b(?P<kind>STARSHIP|HAZARD|VEHICLE)\s+(?P<level>[–\-]?\d+)\s*$")
OUTCOME_KEYS = ('Critical Success', 'Critical Failure', 'Success', 'Failure')
# Bold inline labels that can start a wrapped line without starting a new entry.
STAT_LABELS = ('Damage', 'Fort', 'Fortitude', 'Ref', 'Reflex', 'Will', 'Dex', 'Con', 'Int', 'Wis', 'Cha', 'SP', 'Passengers')
LIST_LABELS = ('Sensor Range', 'Immunities', 'Weaknesses', 'Resistances')


def is_continuation_label(text: str) -> bool:
    for k in STAT_LABELS:
        if text == k or re.match(re.escape(k) + r' [+\-–]?\d', text):
            return True
    for k in LIST_LABELS:
        if text == k or re.match(re.escape(k) + r' [a-z\d]', text):
            return True
    return False
FIELD_KEYS = ('Frequency', 'Requirements', 'Prerequisites', 'Trigger', 'Effect')
SHARED_REF_RE = re.compile(r"^(?:DC (?P<dc>\d+),?\s*)?(?:(?P<damage>\d+d\d+(?:[+\-]\d+)?) (?P<dtype>[a-z]+) damage,?\s*)?(?P<extra>[A-Za-z][a-z'’\- ]*?(?: \d+)?)?\s*(?:(?:See )?\(?page (?P<page>\d+)\)?|\(see above\))\.?$")
AS_REF_RE = re.compile(r"^As (?:the )?(?P<ship>[A-Z][A-Za-z0-9'’\- ]+?)\.?$")


def slug(name: str) -> str:
    name = name.replace('’', "'")
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def titlecase_name(caps: str) -> str:
    """Convert an ALL-CAPS stat-block heading into display case using the inventory when possible."""
    caps = re.sub(r'\s+', ' ', caps.strip())
    key = slug(caps)
    for table in INVENTORY.values():
        for name in table:
            if slug(name) == key:
                return name
    words = []
    for w in caps.lower().split(' '):
        words.append('-'.join(p.capitalize() for p in w.split('-')))
    return ' '.join(words)


def level_int(s: str) -> int:
    return int(s.replace('–', '-'))


def faction_for_page(printed_page: int):
    for fslug, label, a, b in FACTIONS:
        if a <= printed_page <= b:
            return fslug, label
    return 'global', 'Common'


# ---------------------------------------------------------------------------
# Extraction: pdftohtml -xml -> classified lines
# ---------------------------------------------------------------------------

FONT_RE = re.compile(r'<fontspec id="(\d+)" size="(\d+)" family="(?:[A-Z]+\+)?([^"]+)" color="([^"]+)"')
TEXT_RE = re.compile(r'<page number="(\d+)"|<text top="(\d+)" left="(\d+)" width="(\d+)" height="(\d+)" font="(\d+)">(.*?)</text>')


def font_class(family: str, size: int, color: str) -> str:
    dark = color.lower() == '#231f20'
    if family == 'Pathfinder-Icons':
        return 'icon'
    if family == 'GoodOT' and dark:
        return 'body'
    if family == 'GoodOT-CondBold' and size >= 16 and dark:
        return 'header'
    if family == 'GoodOT-CondBold' and size <= 12 and not dark:
        return 'traits'
    if family.startswith('Sofachrome'):
        return 'section'
    if family == 'Audiowide' and size == 17 and dark is False and color.lower() == '#2d4868':
        return 'name'
    return 'junk'


class Line:
    __slots__ = ('page', 'col', 'top', 'left', 'cls', 'text', 'bold_start', 'bold_prefix')

    def __init__(self, page, col, top, left, cls, text, bold_start, bold_prefix=''):
        self.page, self.col, self.top, self.left, self.cls = page, col, top, left, cls
        self.text, self.bold_start, self.bold_prefix = text, bold_start, bold_prefix

    def __repr__(self):
        return f'<{self.cls} p{self.page}c{self.col}@{self.top} {"*" if self.bold_start else ""}{self.text[:60]!r}>'


def strip_tags(s: str) -> str:
    s = re.sub(r'<[^>]+>', '', s)
    return htmllib.unescape(s).replace('\x08', '')


def extract_lines(pdf: Path, first: int, last: int):
    """Return classified Line objects in reading order (page, column, top)."""
    xml = subprocess.run(['pdftohtml', '-xml', '-i', '-f', str(first), '-l', str(last), '-stdout', str(pdf)],
                         check=True, capture_output=True, text=True).stdout
    fonts = {m.group(1): font_class(m.group(3), int(m.group(2)), m.group(4)) for m in FONT_RE.finditer(xml)}
    frags = []   # (page, col, top, left, cls, html)
    page = 0
    for m in TEXT_RE.finditer(xml):
        if m.group(1):
            page = int(m.group(1))
            continue
        top, left, font, inner = int(m.group(2)), int(m.group(3)), m.group(6), m.group(7)
        cls = fonts.get(font, 'junk')
        if cls == 'junk' or left >= SIDEBAR_X or top < PAGE_HEADER_Y:
            continue
        if cls == 'name' and not strip_tags(inner).strip().isupper():
            continue   # image caption, same font as entity headings but Title Case
        col = 0 if left < COLUMN_SPLIT_X else 1
        frags.append((page, col, top, left, cls, inner))
    frags.sort(key=lambda f: (f[0], f[1], f[2], f[3]))
    # group into lines by vertical proximity, then order fragments left to right
    groups = []
    for f in frags:
        if groups and groups[-1][0][0] == f[0] and groups[-1][0][1] == f[1] and abs(groups[-1][0][2] - f[2]) <= LINE_TOLERANCE:
            groups[-1].append(f)
        else:
            groups.append([f])
    lines = []
    for g in groups:
        g.sort(key=lambda f: f[3])
        page, col, top, left = g[0][0], g[0][1], g[0][2], g[0][3]
        html = ''
        cls = 'icon'
        for f in g:
            piece = strip_tags(f[5]) if f[4] == 'icon' else f[5]
            plain_so_far = strip_tags(html)
            if f[4] == 'icon':
                piece = ' ' + piece.strip() + ' '
            elif plain_so_far and re.search(r'[A-Za-z0-9)]$', plain_so_far) and re.match(r'^(?:<b>)?[A-Z0-9(\[]', piece):
                piece = ' ' + piece
            html += piece
            if f[4] != 'icon' and cls == 'icon':
                cls = f[4]
        text = re.sub(r'\s+', ' ', strip_tags(html)).strip()
        if not text or TABLE_ROW_RE.match(text):
            continue
        mb = re.match(r'^\s*(?:\[[a-z-]+\]\s*)?(?:\([^)]*\)\s*)?((?:<b>[^<]*</b>\s*)+)', html)
        bold_start = bool(mb) and cls == 'body'
        bold_prefix = re.sub(r'\s+', ' ', strip_tags(mb.group(1))).strip() if mb else ''
        # A bold ability name that wraps at the end of a line starts a new entry on its own.
        mt = re.search(r'((?:<b>[^<]*</b>\s*)+)$', html)
        if mt and cls == 'body' and strip_tags(html[:mt.start()]).strip():
            tail = re.sub(r'\s+', ' ', strip_tags(mt.group(1))).strip()
            if tail and text.endswith(tail) and not is_continuation_label(tail):
                head = text[:-len(tail)].strip()
                if head:
                    lines.append(Line(page, col, top, left, cls, head, bold_start, bold_prefix))
                lines.append(Line(page, col, top, left, cls, tail, True, tail))
                continue
        lines.append(Line(page, col, top, left, cls, text, bold_start, bold_prefix))
    return lines


# ---------------------------------------------------------------------------
# Segmentation into stat blocks
# ---------------------------------------------------------------------------

def segment(lines):
    """Split classified lines into stat blocks, common-ability blocks, and name->description."""
    blocks, commons, descriptions = [], [], {}
    current, mode = None, None       # mode: 'block' | 'common' | 'desc' | None
    header_buf = []                  # accumulated header-font text (name may wrap)
    desc_name = None
    last_cls = None
    for l in lines:
        if l.cls == 'header':
            header_buf.append(l.text)
            joined = ' '.join(header_buf)
            m = HEADER_KIND_RE.search(joined)
            if m:
                name = joined[:m.start()].strip()
                if slug(name) not in INVENTORY_SLUGS and desc_name and slug(desc_name).endswith(slug(name)):
                    name = desc_name   # e.g. "JOLLY ROGER" header under the "SKYSHATTER JOLLY ROGER" heading
                current = {'kind': m.group('kind'), 'nameCaps': name, 'level': level_int(m.group('level')),
                           'page': l.page - 1, 'lines': [], 'traits': ''}
                blocks.append(current)
                mode = 'block'
                header_buf = []
            last_cls = 'header'
            continue
        header_buf = []
        if l.cls == 'traits':
            if current is not None and mode == 'block':
                current['traits'] = (current['traits'] + ' ' + l.text).strip()
            last_cls = 'traits'
            continue
        if l.cls == 'section':
            title = l.text.upper()
            if last_cls == 'section' and mode == 'common':
                current['title'] += ' ' + title
            elif 'COMMON ACTIONS' in title or 'DEFAULT ACTIONS' in title:
                current = {'page': l.page - 1, 'lines': [], 'title': title,
                           'scope': 'default' if 'DEFAULT' in title else None}
                commons.append(current)
                mode = 'common'
            elif last_cls != 'section':
                current, mode = None, None
            last_cls = 'section'
            continue
        if l.cls == 'name':
            title = l.text.upper()
            if 'COMMON ACTIONS' in title or 'DEFAULT ACTIONS' in title:
                current = {'page': l.page - 1, 'lines': [], 'title': title,
                           'scope': 'default' if 'DEFAULT' in title else None}
                commons.append(current)
                mode = 'common'
                last_cls = 'section'
                continue
            if last_cls == 'name' and desc_name:
                descriptions.pop(slug(desc_name), None)
                desc_name = desc_name + ' ' + l.text
            else:
                desc_name = l.text
            descriptions[slug(desc_name)] = ''
            mode = 'desc'
            last_cls = 'name'
            continue
        # body / icon lines
        last_cls = l.cls
        if mode == 'desc':
            descriptions[slug(desc_name)] = (descriptions[slug(desc_name)] + ' ' + l.text).strip()
        elif mode in ('block', 'common') and current is not None:
            current['lines'].append(l)
    for b in blocks:
        b['description'] = descriptions.get(slug(b['nameCaps'])) or None
    return blocks, commons


# ---------------------------------------------------------------------------
# Line-level helpers
# ---------------------------------------------------------------------------

def join_lines(lines):
    out = []
    for l in lines:
        s = l.text.strip() if isinstance(l, Line) else str(l).strip()
        if not s:
            continue
        if out and out[-1].endswith('-') and s[0].islower():
            out[-1] = out[-1] + s
        else:
            out.append(s)
    return ' '.join(out)


def starts_outcome(text: str):
    for k in OUTCOME_KEYS:
        if text.startswith(k + ' ') or text == k:
            return k
    return None


def entries(lines):
    """Group Line objects into entries: a bold-start line begins a new entry, unless it is an
    outcome sub-line (Critical Success / Success / ...) or a field keyword continuation."""
    result = []
    for l in lines:
        s = re.sub(r'^\[[a-z-]+\]\s*', '', l.text)
        cont_keyword = starts_outcome(s) or any(s == k or s.startswith(k + ' ') for k in FIELD_KEYS) or is_continuation_label(s)
        page_ref = bool(re.match(r"^[A-Z][\w'’\- ]+ (?:\[[a-z-]+\] )?.*(?:See page \d+\.?|\(page \d+\)\.?)$", s))
        if (l.bold_start or page_ref) and not cont_keyword:
            result.append([l])
        elif result:
            result[-1].append(l)
        else:
            result.append([l])
    return result


def split_outcomes(lines):
    """Return (main_text, outcomes dict) from an entry's lines."""
    main, outcomes, cur = [], {}, None
    for l in lines:
        s = l.text
        hit = starts_outcome(s)
        if hit and l.bold_start:
            cur = {'Critical Success': 'criticalSuccess', 'Success': 'success',
                   'Failure': 'failure', 'Critical Failure': 'criticalFailure'}[hit]
            outcomes[cur] = s[len(hit):].strip()
        elif cur:
            outcomes[cur] = (outcomes[cur] + ' ' + s).strip()
        else:
            main.append(l)
    return join_lines(main), outcomes


def split_fields(text):
    """Split 'Frequency …; Requirements …; Trigger …; Effect …' into a dict; remainder is 'effect'."""
    pattern = re.compile(r'(?:^|;\s*)(' + '|'.join(FIELD_KEYS) + r')\s*;?\s+')
    parts = pattern.split(text)
    fields = {}
    if len(parts) == 1:
        return {'effect': text.strip()}
    lead = parts[0].strip().rstrip(';').strip()
    if lead:
        fields['lead'] = lead
    for i in range(1, len(parts), 2):
        key = parts[i].lower()
        fields[key] = parts[i + 1].strip().rstrip(';').strip()
    if 'effect' not in fields:
        fields['effect'] = fields.pop('lead', '')
    elif 'lead' in fields:
        fields['effect'] = (fields.pop('lead') + ' ' + fields['effect']).strip()
    return fields


ENTRY_HEAD_RE = re.compile(
    r"^(?:\((?P<station>[^)]+)\)\s*)?"
    r"(?P<name>[A-Z][A-Za-z0-9'’\-\.!/]*(?: (?!See\b|As\b|DC\b|The\b|A\b|An\b)[A-Z][A-Za-z0-9'’\-\.!/]*)*)"
    r"(?:\s*\[(?P<glyph>[a-z-]+)\](?:\s+(?:to|or)\s+\[(?P<glyph2>[a-z-]+)\])?)?"
    r"(?:\s+\((?P<traits>(?!page \d)[a-z][^)]*)\))?"
    r"(?:\s+(?P<rest>.*))?$")


REST_RE = re.compile(
    r"^(?:\s*\[(?P<glyph>[a-z-]+)\](?:\s+(?:to|or)\s+\[(?P<glyph2>[a-z-]+)\])?)?"
    r"(?:\s+\((?P<traits>(?!page \d)[a-z][^)]*)\))?"
    r"\s*(?P<rest>.*)$")


def parse_ability(entry_lines):
    """Parse a named ability entry. Returns dict or None."""
    main, outcomes = split_outcomes(entry_lines)
    prefix = entry_lines[0].bold_prefix
    m = None
    if prefix:
        ms = re.match(r'^\(([^)]+)\)\s*', main)
        station = ms.group(1) if ms else None
        body = main[ms.end():] if ms else main
        if body.startswith(prefix):
            m = REST_RE.match(body[len(prefix):])
            ab = {'name': prefix}
            if station:
                ab['station'] = station.strip().replace('’', "'").lower()
    if m is None:
        m = ENTRY_HEAD_RE.match(main)
        if not m or not m.group('name').strip():
            return None
        ab = {'name': m.group('name').strip()}
        if m.group('station'):
            ab['station'] = m.group('station').strip().replace('’', "'").lower()
    if m.group('glyph'):
        ab['actions'] = GLYPH_COST.get(m.group('glyph'), m.group('glyph'))
        if m.group('glyph2'):
            ab['actionsMax'] = GLYPH_COST.get(m.group('glyph2'), m.group('glyph2'))
    if m.group('traits'):
        ab['traits'] = [t.strip() for t in m.group('traits').split(',') if t.strip()]
    rest = (m.group('rest') or '').strip()
    ref = SHARED_REF_RE.match(rest)
    if ref and not ref.group('page') and not (ref.group('dc') or ref.group('damage')):
        ref = None   # a bare "(see above)" is prose, not a common-action reference
    if rest and ref:
        ab['sharedPage'] = int(ref.group('page')) if ref.group('page') else 0
        params = {}
        if ref.group('dc'):
            params['dc'] = ref.group('dc')
        if ref.group('damage'):
            params['damage'] = f"{ref.group('damage')} {ref.group('dtype')}"
        if ref.group('extra'):
            extra = ref.group('extra').strip()
            mres = re.match(r'^Resistance (\d+)$', extra)
            if mres:
                params['resistance'] = mres.group(1)
            elif extra[0].islower():
                params['weapon'] = extra
            else:
                params['note'] = extra
        if params:
            ab['params'] = params
        ab['effect'] = ''
    else:
        asm = AS_REF_RE.match(rest)
        if asm:
            ab['asRef'] = asm.group('ship')
        # Book typo (Idaran Cantripper, p. 227): "Resistances three times per day" is a Frequency line.
        rest = re.sub(r'^Resistances ((?:once|twice|three times|\w+) per (?:day|hour|round|turn|minute))\b', r'Frequency \1;', rest)
        fields = split_fields(rest)
        for k, v in fields.items():
            ab[k] = v
    if outcomes:
        ab['outcomes'] = outcomes
    return ab


ATTACK_RE = re.compile(
    r"^(?P<mode>Melee|Ranged|Area Fire|Auto[- ]Fire)(?:\s*\[(?P<glyph>[a-z-]+)\])?\s+"
    r"(?P<name>.+?)(?:\s+\+(?P<bonus>\d+))?(?:\s+\((?P<traits>[^)]*)\))?,?\s+Damage\s+(?P<damage>.+)$")


def parse_attack(text):
    m = ATTACK_RE.match(text)
    if not m:
        return None
    mode = {'Melee': 'melee', 'Ranged': 'ranged', 'Area Fire': 'areaFire', 'Auto-Fire': 'autoFire', 'Auto Fire': 'autoFire'}[m.group('mode')]
    atk = {'mode': mode, 'name': m.group('name').strip(),
           'actions': GLYPH_COST.get(m.group('glyph') or '', 2 if mode in ('areaFire', 'autoFire') else 1),
           'traits': []}
    if m.group('bonus'):
        atk['bonus'] = int(m.group('bonus'))
    for t in split_trait_list(m.group('traits') or ''):
        mi = re.match(r'range increment (\d+) zones?', t)
        mr = re.match(r'range (\d+) zones?', t)
        ma = re.match(r'(\d+)-zone (burst|cone|line|emanation)', t)
        if mi:
            atk['rangeIncrement'] = int(mi.group(1))
        elif mr:
            atk['range'] = int(mr.group(1))
        elif ma:
            atk['area'] = t
        else:
            atk['traits'].append(t)
    dmg = m.group('damage').strip()
    ms = re.search(r'\(DC (\d+) (?:basic )?(Fortitude|Reflex|Will) save\)', dmg)
    if ms:
        atk['saveDC'] = int(ms.group(1))
        atk['saveType'] = ms.group(2).lower()
        dmg = (dmg[:ms.start()] + dmg[ms.end():]).strip()
    atk['damage'] = dmg.rstrip('.')
    return atk


def split_comma_list(text):
    """Split on commas that are not inside parentheses, e.g. "starship immunities (except spirit, vitality, void)"."""
    out, depth, cur = [], 0, ''
    for ch in text:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur)
            cur = ''
        else:
            cur += ch
    out.append(cur)
    return [s.strip() for s in out if s.strip()]


def split_trait_list(text):
    """Split a weapon trait list, keeping "versatile A, C, E, or F" together."""
    text = re.sub(r'versatile ((?:[A-Z], )*(?:[A-Z],? )?or [A-Z])', lambda m: 'versatile ' + '/'.join(re.findall(r'[A-Z]', m.group(1))), text)
    return [t.strip() for t in text.split(',') if t.strip()]


def parse_defense_lists(text, rec):
    """Extract Immunities/Weaknesses/Resistances segments from a ';'-joined defense line."""
    for key in ('Immunities', 'Weaknesses', 'Resistances'):
        m = re.search(key + r'\s+(.+?)(?=;\s*(?:Immunities|Weaknesses|Resistances)\b|$)', text)
        if m:
            rec[key.lower()] = split_comma_list(m.group(1).rstrip('.'))


# ---------------------------------------------------------------------------
# Starships
# ---------------------------------------------------------------------------

def parse_trait_line(line, rec):
    tokens = [t for t in re.split(r'\s+', line.strip()) if t]
    traits = []
    rec['rarity'] = 'common'
    for t in tokens:
        if t in RARITIES:
            rec['rarity'] = RARITIES[t]
        elif t in SIZES:
            rec['size'] = SIZES[t]
        else:
            traits.append(t.lower())
    rec['traits'] = traits


def parse_battle_stations(text):
    stations = []
    depth, cur, items = 0, '', []
    for ch in text:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch == ',' and depth == 0:
            items.append(cur)
            cur = ''
        else:
            cur += ch
    if cur.strip():
        items.append(cur)
    for item in items:
        item = item.strip()
        m = re.match(r'^(?P<name>[^()]+?)\s*(?:\((?P<entries>[^)]*)\))?$', item)
        if not m:
            continue
        name = m.group('name').strip().replace('’', "'")
        ents = []
        for e in (m.group('entries') or '').split(','):
            e = e.strip()
            if not e:
                continue
            shared = e.endswith('*')
            e = e.rstrip('*').strip()
            entry = {'name': e, 'shared': shared}
            mc = re.match(r'^(.*?)\s*[×x]\s*(\d+)$', e)
            if mc:
                entry['name'], entry['count'] = mc.group(1).strip(), int(mc.group(2))
            ents.append(entry)
        stations.append({'name': name, 'entries': ents})
    return stations


def parse_starship(block):
    lines = block['lines']
    rec = {'id': slug(block['nameCaps']), 'name': titlecase_name(block['nameCaps']), 'level': block['level'],
           'source': SOURCE, 'page': block['page']}
    if block.get('description'):
        rec['description'] = block['description']
    fslug, flabel = faction_for_page(block['page'])
    rec['faction'] = flabel
    rec['factionSlug'] = fslug
    parse_trait_line(block['traits'], rec)
    rec.update({'skills': {}, 'battleStations': [], 'immunities': [], 'weaknesses': [], 'resistances': [],
                'attacks': [], 'specialAbilities': []})
    phase = 'head'
    for ent in entries(lines):
        text = join_lines(ent)
        head = ent[0].text
        if head.startswith('Perception '):
            m = re.match(r'Perception \+?(-?\d+); Sensor Range (\d+) zones?(?:; (.*))?', text)
            if m:
                rec['perception'] = int(m.group(1))
                rec['sensorRange'] = int(m.group(2))
                if m.group(3):
                    rec['senses'] = m.group(3).strip()
            continue
        if head.startswith('Skills '):
            for m in re.finditer(r'([A-Z][A-Za-z ]+?) \+(\d+)', text[7:]):
                rec['skills'][m.group(1).strip()] = int(m.group(2))
            continue
        if head.startswith('Battle Stations'):
            rec['battleStations'] = parse_battle_stations(text[len('Battle Stations'):].strip())
            continue
        if re.match(r'^Str [+\-–]?\d', head):
            abil = {}
            for m in re.finditer(r'(Str|Dex|Con|Int|Wis|Cha) ([+\-–]?\d+)', text):
                abil[m.group(1).lower()] = int(m.group(2).replace('–', '-'))
            rec['abilities'] = abil
            phase = 'passive'
            continue
        if re.match(r'^AC \d', head):
            m = re.match(r'AC (\d+); Fort(?:itude)?\s*\+?(-?\d+), Ref(?:lex)?\s*\+?(-?\d+), Will\s*\+?(-?\d+)', text)
            if m:
                rec['ac'] = int(m.group(1))
                rec['saves'] = {'fort': int(m.group(2)), 'ref': int(m.group(3)), 'will': int(m.group(4))}
            else:
                rec.setdefault('unparsed', []).append(text)
            continue
        if re.match(r'^HP \d', head):
            m = re.match(r'HP (\d+)', text)
            rec['hp'] = int(m.group(1))
            m = re.search(r'SP (\d+)(?: \(fortify (\d+)\))?', text)
            if m:
                rec['sp'] = int(m.group(1))
                if m.group(2):
                    rec['fortify'] = int(m.group(2))
            mh = re.match(r'HP \d+,? ([^;]+?)(?:;|$)', text)
            if mh and not mh.group(1).startswith('SP'):
                rec['hpNotes'] = mh.group(1).strip()
            parse_defense_lists(text, rec)
            phase = 'defense'
            continue
        if re.match(r'^Speed \d', head):
            m = re.match(r'Speed (\d+) zones?(?:[,;] (.*))?', text)
            if m:
                rec['speed'] = int(m.group(1))
                if m.group(2):
                    rec['speedNotes'] = m.group(2).strip()
            phase = 'offense'
            continue
        atk = parse_attack(text)
        if atk:
            rec['attacks'].append(atk)
            continue
        ab = parse_ability(ent)
        if ab:
            ab['placement'] = 'defense' if phase in ('passive', 'defense') else 'offense'
            rec['specialAbilities'].append(ab)
        else:
            rec.setdefault('unparsed', []).append(text)
    attack_names = {slug(a['name']) for a in rec['attacks']}
    ability_names = {slug(a['name']) for a in rec['specialAbilities']}
    for st in rec['battleStations']:
        if st['name'].endswith('organelle') or st['name'] in ('natural senses', 'cluster network', 'seedpod', 'riding adventurers'):
            rec['livingStarship'] = True
        for e in st['entries']:
            if name_matches(e['name'], attack_names) or (not name_matches(e['name'], ability_names) and e['name'][0].islower()):
                e['kind'] = 'weapon'
            else:
                e['kind'] = 'action'
    if any(a['name'].lower() == 'living starship' for a in rec['specialAbilities']):
        rec['livingStarship'] = True
    return rec


# ---------------------------------------------------------------------------
# Shared abilities (common actions and features)
# ---------------------------------------------------------------------------

def parse_commons(commons):
    shared = []
    for c in commons:
        page = c['page']
        scope = c['scope'] or faction_for_page(page)[0]
        for ent in entries(c['lines']):
            if not ent[0].bold_start:
                continue   # intro prose
            ab = parse_ability(ent)
            if not ab or not ab.get('name'):
                continue
            ab['id'] = f"{scope}:{slug(ab['name'])}"
            ab['scope'] = scope
            ab['page'] = page
            shared.append(ab)
    return shared


def resolve_shared(ships, shared):
    index = {}
    for ab in shared:
        index.setdefault(ab['scope'], {})[slug(ab['name'])] = ab
    unresolved = []
    for ship in ships:
        for ab in ship['specialAbilities']:
            if 'sharedPage' not in ab:
                continue
            key = slug(ab['name'])
            src = index.get(ship['factionSlug'], {}).get(key) or index.get('global', {}).get(key) or index.get('default', {}).get(key)
            if not src:
                for sc in index.values():
                    if key in sc:
                        src = sc[key]
                        break
            if not src:
                unresolved.append((ship['name'], ab['name']))
                continue
            params = ab.get('params', {})
            effect = src.get('effect', '')
            if 'dc' in params:
                effect = effect.replace('the listed DC', f"DC {params['dc']}")
            if 'damage' in params:
                effect = re.sub(r'the listed \w+ damage', params['damage'] + ' damage', effect)
            if 'weapon' in params:
                effect = effect.replace('the specified Strike', f"a {params['weapon']} Strike")
            if 'resistance' in params:
                effect = effect.replace('gains resistance against the triggering damage type equal to half its level + 1 (minimum 1)',
                                        f"gains resistance {params['resistance']} against the triggering damage type")
            for k in ('traits', 'frequency', 'requirements', 'trigger', 'outcomes', 'station', 'actions', 'actionsMax'):
                if k in src and k not in ab:
                    ab[k] = src[k]
            ab['effect'] = effect
            ab['sharedRef'] = src['id']
            ab.pop('sharedPage', None)
    # "As <Ship>." references copy the same-named ability from another ship
    by_name = {s['name'].lower(): s for s in ships}
    for ship in ships:
        for ab in ship['specialAbilities']:
            ref = ab.pop('asRef', None)
            if not ref:
                continue
            other = by_name.get(ref.lower())
            src = None
            if other:
                src = next((x for x in other['specialAbilities'] if x['name'].lower() == ab['name'].lower()), None)
            if not src:
                unresolved.append((ship['name'], f"{ab['name']} (as {ref})"))
                continue
            for k, v in src.items():
                if k not in ('placement',) and k not in ab or k == 'effect':
                    ab[k] = v
            ab['asRefShip'] = other['id']
    return unresolved


# ---------------------------------------------------------------------------
# Hazards
# ---------------------------------------------------------------------------

PROF = r'trained|expert|master|legendary|untrained'
DISABLE_GROUP_RE = re.compile(r"DC (?P<dc>\d+) (?P<body>.*?)(?=(?:,| or|;)? DC \d+ |$)")
DISABLE_SKILL_RE = re.compile(r"(?P<skill>(?:any )?[A-Z][A-Za-z]*(?: [A-Z][A-Za-z]*)*(?: Lore)?)(?: \((?P<prof>" + PROF + r")?(?:; (?P<station>[^)]+))?\))?")


def parse_disable(body):
    """Structured entries for "DC 21 Computers (trained; scanners) to …, or DC 23 Piloting (trained; pilot's console) …".
    A DC may cover several skills ("DC 35 Computers, Crafting, or Thievery (expert)"); a parenthetical applies to the
    skills listed before it since the previous parenthetical."""
    entries = []
    for g in DISABLE_GROUP_RE.finditer(body):
        dc = int(g.group('dc'))
        text = g.group('body')
        # keep only the skill list: cut at " to " / " or Counter Magic" / other prose after the last parenthetical
        pending = []
        pos = 0
        for m in DISABLE_SKILL_RE.finditer(text):
            if m.start() > pos and not re.match(r"^[\s,]*(?:or\s+)?$", text[pos:m.start()]):
                break   # prose began ("to calculate a safe route, or ...")
            skill = m.group('skill').strip()
            if skill.lower() in ('counter', 'counter magic'):
                break
            pending.append(skill)
            if m.group(0).endswith(')'):
                for sk in pending:
                    e = {'dc': dc, 'skill': sk}
                    if m.group('prof'):
                        e['proficiency'] = m.group('prof')
                    if m.group('station'):
                        e['station'] = m.group('station').replace('’', "'")
                    entries.append(e)
                pending = []
            pos = m.end()
        for sk in pending:
            entries.append({'dc': dc, 'skill': sk})
    return entries


def parse_hazard(block):
    lines = block['lines']
    rec = {'id': slug(block['nameCaps']), 'name': titlecase_name(block['nameCaps']), 'level': block['level'],
           'source': SOURCE, 'page': block['page'], 'complexity': 'simple', 'immunities': [], 'weaknesses': [],
           'resistances': [], 'components': [], 'reactions': [], 'abilities': [], 'attacks': []}
    parse_trait_line(block['traits'], rec)
    if 'complex' in rec['traits']:
        rec['complexity'] = 'complex'
        rec['traits'].remove('complex')
    rec['scale'] = 'starship' if 'starship' in rec['traits'] else 'deck'
    for ent in entries(lines):
        text = join_lines(ent)
        head = ent[0].text
        if head.startswith('Stealth '):
            st = {'text': text[len('Stealth '):]}
            m = re.match(r'Stealth (?:DC (\d+)|\+(\d+))(?: \((\w+)\))?', text)
            if m:
                if m.group(1):
                    st['dc'] = int(m.group(1))
                if m.group(2):
                    st['modifier'] = int(m.group(2))
                    st['dc'] = int(m.group(2)) + 10
                if m.group(3):
                    st['proficiency'] = m.group(3)
            rec['stealth'] = st
            continue
        if head.startswith('Description '):
            rec['description'] = text[len('Description '):]
            continue
        if head.startswith('Disable '):
            body = text[len('Disable '):]
            rec['disable'] = parse_disable(body)
            rec['disableText'] = body
            continue
        m = re.match(r'^(?:(?P<label>[A-Z][A-Za-z ]+?) )?AC (?P<ac>\d+); Fort \+?(?P<fort>-?\d+)(?:, Ref \+?(?P<ref>-?\d+))?(?:, Will \+?(?P<will>-?\d+))?', text)
        if m and re.match(r'^(?:[A-Z][A-Za-z ]+ )?AC \d+', head):
            rec['ac'] = int(m.group('ac'))
            rec['saves'] = {'fort': int(m.group('fort'))}
            if m.group('ref'):
                rec['saves']['ref'] = int(m.group('ref'))
            if m.group('will'):
                rec['saves']['will'] = int(m.group('will'))
            if m.group('label'):
                rec['acLabel'] = m.group('label')
            continue
        if re.match(r'^(?:[A-Z][A-Za-z ]+ )?(Hardness|HP) \d+', head):
            for m in re.finditer(r'(?:(?P<label>[A-Z][A-Za-z ]+?) )?Hardness (?P<h>\d+)', text):
                rec['components'].append({'name': (m.group('label') or 'Hazard').strip(), 'hardness': int(m.group('h'))})
            for m in re.finditer(r'(?:(?P<label>[A-Z][A-Za-z ]+?) )?HP (?P<hp>\d+)(?P<each> each)?(?: \(BT (?P<bt>\d+)\))?(?P<each2> each)?', text):
                label = (m.group('label') or 'Hazard').strip()
                comp = next((c for c in rec['components'] if c['name'] == label), None)
                if not comp:
                    comp = {'name': label}
                    rec['components'].append(comp)
                comp['hp'] = int(m.group('hp'))
                if m.group('bt'):
                    comp['bt'] = int(m.group('bt'))
                if m.group('each') or m.group('each2'):
                    comp['each'] = True
            parse_defense_lists(text, rec)
            continue
        if head.startswith('Routine '):
            m = re.match(r'Routine \((\d+) actions?[^)]*\) (.*)', text)
            if m:
                rec['routine'] = {'actions': int(m.group(1)), 'text': m.group(2)}
            else:
                rec['routine'] = {'actions': 1, 'text': text[len('Routine '):]}
            continue
        if head.startswith('Reset '):
            rec['reset'] = text[len('Reset '):]
            continue
        if head.startswith('Special '):
            rec['special'] = text[len('Special '):]
            continue
        atk = parse_attack(text)
        if atk:
            rec['attacks'].append(atk)
            continue
        ab = parse_ability(ent)
        if ab:
            if ab.get('actions') == 'reaction' or (ab.get('actions') == 'free' and ab.get('trigger')):
                rec['reactions'].append(ab)
            else:
                rec['abilities'].append(ab)
        else:
            rec.setdefault('unparsed', []).append(text)
    if len(rec['components']) == 1 and rec['components'][0]['name'] == 'Hazard':
        c = rec['components'].pop()
        for k in ('hardness', 'hp', 'bt'):
            if k in c:
                rec[k] = c[k]
    return rec


# ---------------------------------------------------------------------------
# Vehicles
# ---------------------------------------------------------------------------

def parse_vehicle(block):
    lines = block['lines']
    rec = {'id': slug(block['nameCaps']), 'name': titlecase_name(block['nameCaps']), 'level': block['level'],
           'source': SOURCE, 'page': block['page'], 'immunities': [], 'abilities': []}
    parse_trait_line(block['traits'], rec)
    desc = []
    rest = []
    seen_space = False
    for l in lines:
        s = l.text
        if not seen_space and s.startswith('Price '):
            rec['price'] = s[len('Price '):]
        elif not seen_space and re.match(r'^Space \d', s):
            seen_space = True
            rest.append(l)
        elif not seen_space:
            desc.append(l)
        else:
            rest.append(l)
    rec['description'] = join_lines(desc)
    for ent in entries(rest):
        text = join_lines(ent)
        head = ent[0].text
        if head.startswith('Space '):
            rec['space'] = text[len('Space '):]
        elif head.startswith('Crew '):
            m = re.match(r'Crew (.+?)(?:; Passengers (.+))?$', text[len('Crew '):] and text)
            rec['crew'] = (m.group(1) if m else text[len('Crew '):]).replace('Crew ', '', 1) if m and m.group(1).startswith('Crew ') else (m.group(1) if m else text[len('Crew '):])
            if m and m.group(2):
                ptxt = m.group(2).strip()
                rec['passengersText'] = ptxt
                mp = re.match(r'(\d+)', ptxt)
                if mp:
                    rec['passengers'] = int(mp.group(1))
        elif head.startswith('Piloting Check '):
            body = text[len('Piloting Check '):]
            checks = []
            for m in re.finditer(r'([A-Z][A-Za-z ]+?(?: or [A-Z][A-Za-z ]+?)*) \(DC (\d+)(?:[,;] ([^)]+))?\)', body):
                for sk in re.split(r' or |, ', m.group(1)):
                    e = {'skill': sk.strip(), 'dc': int(m.group(2))}
                    if m.group(3):
                        e['note'] = m.group(3).strip()
                    checks.append(e)
            rec['pilotingChecks'] = checks
            rec['pilotingCheckText'] = body
        elif re.match(r'^AC \d', head):
            m = re.match(r'AC (\d+); Fort \+?(-?\d+)(?:, Ref(?:lex)? \+?(-?\d+))?(?:, Will \+?(-?\d+))?', text)
            if m:
                rec['ac'] = int(m.group(1))
                rec['saves'] = {'fort': int(m.group(2))}
                if m.group(3):
                    rec['saves']['ref'] = int(m.group(3))
                if m.group(4):
                    rec['saves']['will'] = int(m.group(4))
        elif head.startswith('Hardness '):
            m = re.match(r'Hardness (\d+), HP (\d+)(?: \(BT (\d+)\))?', text)
            if m:
                rec['hardness'] = int(m.group(1))
                rec['hp'] = int(m.group(2))
                if m.group(3):
                    rec['bt'] = int(m.group(3))
            parse_defense_lists(text, rec)
        elif head.startswith('Speed '):
            body = text[len('Speed '):]
            rec['speed'] = [{'feet': int(m.group(2)), 'mode': m.group(3), **({'kind': m.group(1)} if m.group(1) else {})}
                            for m in re.finditer(r'(?:\b(fly|swim|climb|burrow|land) )?(\d+) feet \(([^)]+)\)', body)]
            rec['speedText'] = body
        elif head.startswith('Collision '):
            m = re.match(r'Collision (\d+d\d+(?:\+\d+)?)(?: ([A-Za-z]+))? \((?:(\w+); )?DC (\d+)\)', text)
            if m:
                rec['collision'] = {'damage': m.group(1), 'dc': int(m.group(4))}
                if m.group(2) or m.group(3):
                    rec['collision']['type'] = m.group(2) or m.group(3)
            else:
                rec.setdefault('unparsed', []).append(text)
        else:
            ab = parse_ability(ent)
            if ab:
                rec['abilities'].append(ab)
            else:
                rec.setdefault('unparsed', []).append(text)
    return rec


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate(ships, hazards, vehicles, shared, unresolved_shared):
    errors = []

    def check_inventory(records, table, label):
        got = {r['name']: r for r in records}
        for name, lvl in table.items():
            want = lvl[0] if isinstance(lvl, list) else lvl
            if name not in got:
                errors.append(f'{label}: missing "{name}"')
            elif got[name]['level'] != want:
                errors.append(f'{label}: "{name}" level {got[name]["level"]} != {want}')
            elif isinstance(lvl, list) and got[name].get('complexity') != lvl[1]:
                errors.append(f'{label}: "{name}" complexity {got[name].get("complexity")} != {lvl[1]}')
        for name in got:
            if name not in table:
                errors.append(f'{label}: unexpected "{name}"')

    shared_slugs = {slug(a['name']) for a in shared}
    check_inventory(ships, INVENTORY['starships'], 'starships')
    check_inventory(hazards, INVENTORY['hazards'], 'hazards')
    check_inventory(vehicles, INVENTORY['vehicles'], 'vehicles')

    def scan_text(obj, path, label):
        if isinstance(obj, str):
            for tok in SIDEBAR_TOKENS:
                if tok in obj:
                    errors.append(f'{label}: sidebar token "{tok}" in {path}')
            if re.search(r'(?:Simple|Complex)\s*\d{3}\b', obj):
                errors.append(f'{label}: hazard table text in {path}')
        elif isinstance(obj, dict):
            for k, v in obj.items():
                scan_text(v, f'{path}.{k}', label)
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                scan_text(v, f'{path}[{i}]', label)

    for s in ships:
        lbl = f'ship "{s["name"]}"'
        for k in ('ac', 'hp', 'speed', 'sensorRange', 'saves', 'abilities', 'size', 'perception'):
            if k not in s:
                errors.append(f'{lbl}: missing {k}')
        if s.get('abilities') and len(s['abilities']) != 6:
            errors.append(f'{lbl}: attribute mods {s["abilities"]}')
        if not s.get('battleStations'):
            errors.append(f'{lbl}: no battle stations')
        if not s.get('attacks') and not s.get('specialAbilities'):
            errors.append(f'{lbl}: no attacks or abilities')
        if s.get('unparsed'):
            errors.append(f'{lbl}: unparsed lines: {s["unparsed"]}')
        shared_names = {}
        for st in s.get('battleStations', []):
            for e in st['entries']:
                if e['shared']:
                    shared_names[e['name']] = shared_names.get(e['name'], 0) + 1
        for n, c in shared_names.items():
            if c < 2:
                errors.append(f'{lbl}: shared action "{n}" listed under only one station')
        ability_slugs = {slug(a['name']) for a in s.get('specialAbilities', [])}
        attack_slugs = {slug(a['name']) for a in s.get('attacks', [])}
        for st in s.get('battleStations', []):
            for e in st['entries']:
                if e['kind'] == 'weapon':
                    if not name_matches(e['name'], attack_slugs):
                        errors.append(f'{lbl}: station weapon "{e["name"]}" has no attack line')
                elif not name_matches(e['name'], ability_slugs | shared_slugs):
                    errors.append(f'{lbl}: station action "{e["name"]}" not found in abilities')
        for ab in s.get('specialAbilities', []):
            if not ab.get('effect') and not ab.get('outcomes') and not ab.get('trigger'):
                errors.append(f'{lbl}: ability "{ab["name"]}" has no effect text')
            if len(ab['name'].split()) > 6:
                errors.append(f'{lbl}: suspicious ability name "{ab["name"]}"')
            if re.search(r'(?:See )?\(?page \d+\)?\.?$|^(?:DC \d+,? )?(?:\d+d\d+[+\-]?\d* \w+ damage )?\(see above\)\.?$', ab.get('effect', '')):
                errors.append(f'{lbl}: unresolved page reference in "{ab["name"]}" effect')
            if 'sharedRef' in ab and not any(x['id'] == ab['sharedRef'] for x in shared):
                errors.append(f'{lbl}: dangling sharedRef {ab["sharedRef"]}')
            if 'sharedPage' in ab:
                errors.append(f'{lbl}: unresolved page reference in "{ab["name"]}"')
        scan_text(s, '', lbl)
    for h in hazards:
        lbl = f'hazard "{h["name"]}"'
        for k in ('stealth', 'description', 'disable'):
            if k not in h:
                errors.append(f'{lbl}: missing {k}')
        if h.get('unparsed'):
            errors.append(f'{lbl}: unparsed lines: {h["unparsed"]}')
        if h['complexity'] == 'complex' and 'routine' not in h:
            errors.append(f'{lbl}: complex hazard without routine')
        scan_text(h, '', lbl)
    for v in vehicles:
        lbl = f'vehicle "{v["name"]}"'
        for k in ('price', 'space', 'crew', 'pilotingChecks', 'ac', 'hp', 'speed', 'collision'):
            if k not in v:
                errors.append(f'{lbl}: missing {k}')
        if v.get('unparsed'):
            errors.append(f'{lbl}: unparsed lines: {v["unparsed"]}')
        scan_text(v, '', lbl)
    for ship, ab in unresolved_shared:
        errors.append(f'ship "{ship}": unresolved reference "{ab}"')
    ids = [r['id'] for r in ships + hazards + vehicles]
    if len(ids) != len(set(ids)):
        errors.append('duplicate ids')
    return errors


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

INVENTORY = json.loads(INVENTORY_PATH.read_text())
INVENTORY_SLUGS = {slug(n) for t in INVENTORY.values() for n in t}


def parse_range(s, default):
    if not s:
        return default
    a, b = s.split('-')
    return int(a), int(b)


def block_debug(b):
    d = {k: v for k, v in b.items() if k != 'lines'}
    d['lines'] = [('* ' if l.bold_start else '  ') + l.text for l in b['lines']]
    return d


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('pdf')
    ap.add_argument('--out-dir', default=str(REPO / 'src' / 'data'))
    ap.add_argument('--debug-dir')
    ap.add_argument('--validate', action='store_true')
    ap.add_argument('--archive')
    ap.add_argument('--hazards')
    ap.add_argument('--vehicles')
    args = ap.parse_args()
    pdf = Path(args.pdf)

    ranges = {k: parse_range(getattr(args, k), v) for k, v in DEFAULT_RANGES.items()}
    streams = {k: extract_lines(pdf, *r) for k, r in ranges.items()}
    if args.debug_dir:
        d = Path(args.debug_dir)
        d.mkdir(parents=True, exist_ok=True)
        for k, lines in streams.items():
            (d / f'{k}_lines.txt').write_text('\n'.join(repr(l) for l in lines))

    blocks, commons = segment(streams['archive'])
    hz_blocks, _ = segment(streams['hazards'])
    vh_blocks, _ = segment(streams['vehicles'])
    if args.debug_dir:
        (Path(args.debug_dir) / 'techcore-blocks.json').write_text(json.dumps(
            {'archive': [block_debug(b) for b in blocks], 'commons': [block_debug(c) for c in commons],
             'hazards': [block_debug(b) for b in hz_blocks], 'vehicles': [block_debug(b) for b in vh_blocks]},
            indent=1, ensure_ascii=False))

    shared = parse_commons(commons)
    ships = [parse_starship(b) for b in blocks if b['kind'] == 'STARSHIP']
    unresolved = resolve_shared(ships, shared)
    hazards = [parse_hazard(b) for b in hz_blocks if b['kind'] == 'HAZARD']
    vehicles = [parse_vehicle(b) for b in vh_blocks if b['kind'] == 'VEHICLE']
    for lst in (ships, hazards, vehicles):
        lst.sort(key=lambda r: (r['level'], r['name']))

    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    (out / 'tscStarships.json').write_text(json.dumps(ships, indent=2, ensure_ascii=False) + '\n')
    (out / 'tscHazards.json').write_text(json.dumps(hazards, indent=2, ensure_ascii=False) + '\n')
    (out / 'vehicles.json').write_text(json.dumps(vehicles, indent=2, ensure_ascii=False) + '\n')
    (out / 'tscSharedAbilities.json').write_text(json.dumps(shared, indent=2, ensure_ascii=False) + '\n')
    print(f'ships={len(ships)} hazards={len(hazards)} vehicles={len(vehicles)} shared={len(shared)}')

    if args.validate:
        errors = validate(ships, hazards, vehicles, shared, unresolved)
        for e in errors:
            print('ERROR', e)
        print(f'{len(errors)} validation error(s)')
        sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
