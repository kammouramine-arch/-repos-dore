#!/usr/bin/env python3
"""
RÉVA — theme integrity check.

Runs the validations Shopify performs at import time but that offline
`theme-check` does not cover. A file that fails any of these is silently
DROPPED by Shopify when a theme ZIP is imported, which is how a homepage
goes missing without any error being surfaced.

Usage:  python3 scripts/validate-theme.py
Exit code 0 = ready to upload.
"""

import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

errors = []


def fail(msg):
    errors.append(msg)


# --------------------------------------------------------------------------
# Load
# --------------------------------------------------------------------------

def load_json(path):
    try:
        with open(path, encoding='utf-8') as fh:
            return json.load(fh)
    except Exception as exc:  # noqa: BLE001
        fail(f'{path}: invalid JSON — {exc}')
        return None


json_files = (
    glob.glob('config/*.json')
    + glob.glob('locales/*.json')
    + glob.glob('templates/**/*.json', recursive=True)
    + glob.glob('sections/*.json')
)
for path in json_files:
    load_json(path)

schemas = {}
for path in glob.glob('sections/*.liquid'):
    src = open(path, encoding='utf-8').read()
    match = re.search(r'\{%\s*schema\s*%\}(.*?)\{%\s*endschema\s*%\}', src, re.S)
    if not match:
        fail(f'{path}: no {{% schema %}} block')
        continue
    try:
        schemas[os.path.basename(path)[:-7]] = json.loads(match.group(1))
    except Exception as exc:  # noqa: BLE001
        fail(f'{path}: schema is not valid JSON — {exc}')


# --------------------------------------------------------------------------
# 1. Range settings — Shopify's strictest, least visible rule
# --------------------------------------------------------------------------

def check_range(setting, where):
    lo, hi, step = setting.get('min'), setting.get('max'), setting.get('step', 1)
    sid = setting.get('id', '?')
    if lo is None or hi is None:
        fail(f'{where}: range "{sid}" is missing min or max')
        return
    if step <= 0:
        fail(f'{where}: range "{sid}" has a non-positive step')
        return
    if (hi - lo) % step != 0:
        fail(f'{where}: range "{sid}" — (max - min) is not divisible by step')
    if (hi - lo) / step > 101:
        fail(f'{where}: range "{sid}" — more than 101 steps')
    default = setting.get('default')
    if default is None:
        return
    if not lo <= default <= hi:
        fail(f'{where}: range "{sid}" default {default} is outside {lo}–{hi}')
    elif (default - lo) % step != 0:
        fail(
            f'{where}: range "{sid}" default {default} is not reachable from '
            f'min {lo} with step {step} — Shopify will reject this file'
        )


def walk_settings(settings, where):
    for setting in settings or []:
        if setting.get('type') == 'range':
            check_range(setting, where)


for name, schema in schemas.items():
    walk_settings(schema.get('settings'), f'sections/{name}.liquid')
    for block in schema.get('blocks', []):
        walk_settings(block.get('settings'), f'sections/{name}.liquid (block "{block.get("type")}")')

settings_schema = load_json('config/settings_schema.json') or []
for group in settings_schema:
    walk_settings(group.get('settings'), 'config/settings_schema.json')


# --------------------------------------------------------------------------
# 1b. Braces inside Liquid tags
#     Shopify's Ruby Liquid lexer ends `{{ … }}` at the first `}` it meets,
#     even inside a quoted string. `{{ x | append: '?q={term}' }}` therefore
#     fails on the storefront while the JS parser used by theme-check accepts
#     it — and the file is dropped silently on import.
# --------------------------------------------------------------------------

BRACE_IN_OUTPUT = re.compile(r'\{\{(?:(?!\}\}).)*?[{](?:(?!\}\}).)*?\}\}', re.S)
BRACE_IN_TAG = re.compile(r'\{%(?:(?!%\}).)*?[{](?:(?!%\}).)*?%\}', re.S)

for path in glob.glob('**/*.liquid', recursive=True):
    if path.startswith(('legacy-html', 'node_modules')):
        continue
    src = open(path, encoding='utf-8').read()
    # Ignore {% schema %}/{% javascript %}/{% stylesheet %} bodies and comments.
    body = re.sub(
        r'\{%\s*(schema|javascript|stylesheet|comment)\s*%\}.*?\{%\s*end\1\s*%\}',
        '',
        src,
        flags=re.S,
    )
    body = re.sub(r'\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}', '', body, flags=re.S)
    for pattern in (BRACE_IN_OUTPUT, BRACE_IN_TAG):
        for match in pattern.finditer(body):
            line = body[: match.start()].count('\n') + 1
            fail(
                f'{path}:{line}: a "{{" appears inside a Liquid tag — Shopify\'s '
                f'lexer will not terminate it: {match.group(0)[:70]!r}'
            )


# --------------------------------------------------------------------------
# 2. Templates only reference sections, blocks and settings that exist
# --------------------------------------------------------------------------

setting_ids = {}
for name, schema in schemas.items():
    setting_ids[name] = {s['id'] for s in schema.get('settings', []) if 'id' in s}

template_files = glob.glob('templates/**/*.json', recursive=True) + [
    'sections/header-group.json',
    'sections/footer-group.json',
]

for path in template_files:
    data = load_json(path)
    if not data:
        continue
    for sid, section in (data.get('sections') or {}).items():
        stype = section.get('type')
        if stype not in schemas:
            fail(f'{path}: section "{sid}" uses type "{stype}" but sections/{stype}.liquid does not exist')
            continue
        allowed_blocks = {b['type'] for b in schemas[stype].get('blocks', [])}
        for bid, block in (section.get('blocks') or {}).items():
            if allowed_blocks and block.get('type') not in allowed_blocks:
                fail(f'{path}: {stype} block "{bid}" has unknown type "{block.get("type")}"')
        for key in (section.get('settings') or {}):
            if key not in setting_ids[stype]:
                fail(f'{path}: {stype} setting "{key}" is not declared in its schema')
    for sid in data.get('order', []):
        if sid not in (data.get('sections') or {}):
            fail(f'{path}: order references missing section "{sid}"')


# --------------------------------------------------------------------------
# 3. Required files
# --------------------------------------------------------------------------

required = [
    'layout/theme.liquid',
    'templates/index.json',
    'templates/product.json',
    'templates/collection.json',
    'templates/cart.json',
    'templates/search.json',
    'templates/page.json',
    'templates/404.json',
    'templates/list-collections.json',
    'config/settings_schema.json',
    'config/settings_data.json',
    'sections/header-group.json',
    'sections/footer-group.json',
]
for path in required:
    if not os.path.exists(path):
        fail(f'missing required file: {path}')


# --------------------------------------------------------------------------
# 4. Translation keys resolve
# --------------------------------------------------------------------------

def lookup(tree, dotted):
    node = tree
    for part in dotted.split('.'):
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node


schema_locale = load_json('locales/fr.default.schema.json') or {}
store_locale = load_json('locales/fr.default.json') or {}

liquid_files = (
    glob.glob('sections/*.liquid')
    + glob.glob('snippets/*.liquid')
    + glob.glob('layout/*.liquid')
    + glob.glob('templates/**/*.liquid', recursive=True)
)

for path in liquid_files + ['config/settings_schema.json']:
    src = open(path, encoding='utf-8').read()
    for key in sorted(set(re.findall(r'"t:([a-zA-Z0-9_.]+)"', src))):
        if lookup(schema_locale, key) is None:
            fail(f'{path}: schema translation "{key}" is missing from locales/fr.default.schema.json')

for path in liquid_files:
    src = re.sub(
        r'\{%\s*schema\s*%\}.*?\{%\s*endschema\s*%\}',
        '',
        open(path, encoding='utf-8').read(),
        flags=re.S,
    )
    keys = set(re.findall(r"'([a-zA-Z0-9_.]+)'\s*\|\s*t\b", src))
    keys |= set(re.findall(r"'([a-zA-Z0-9_.]+)'\s*\|\s*t:", src))
    for key in sorted(keys):
        if key == 'now':
            continue
        if lookup(store_locale, key) is None:
            fail(f'{path}: storefront translation "{key}" is missing from locales/fr.default.json')


# --------------------------------------------------------------------------
# 5. Locale files share the same keys
# --------------------------------------------------------------------------

PLURAL = {'zero', 'one', 'two', 'few', 'many', 'other'}


def leaf_keys(tree, prefix=''):
    out = set()
    for key, value in tree.items():
        path = f'{prefix}.{key}' if prefix else key
        if isinstance(value, dict) and not set(value) <= PLURAL:
            out |= leaf_keys(value, path)
        else:
            out.add(path)
    return out


for base, other in (('fr.default.json', 'en.json'), ('fr.default.schema.json', 'en.schema.json')):
    a, b = load_json(f'locales/{base}'), load_json(f'locales/{other}')
    if a and b:
        for key in sorted(leaf_keys(a) - leaf_keys(b)):
            fail(f'locales/{other}: missing key "{key}"')
        for key in sorted(leaf_keys(b) - leaf_keys(a)):
            fail(f'locales/{base}: missing key "{key}"')


# --------------------------------------------------------------------------
# 6. Every rendered snippet exists
# --------------------------------------------------------------------------

snippets = {os.path.basename(p)[:-7] for p in glob.glob('snippets/*.liquid')}
for path in liquid_files:
    src = open(path, encoding='utf-8').read()
    for name in sorted(set(re.findall(r"\{%-?\s*render\s+'([a-zA-Z0-9_-]+)'", src))):
        if name not in snippets:
            fail(f'{path}: renders "{name}" but snippets/{name}.liquid does not exist')


# --------------------------------------------------------------------------
# 7. settings_data only uses declared settings
# --------------------------------------------------------------------------

declared = set()
for group in settings_schema:
    for setting in group.get('settings', []):
        if 'id' in setting:
            declared.add(setting['id'])

settings_data = load_json('config/settings_data.json') or {}
for scope, values in [('current', settings_data.get('current', {}))] + [
    (f'presets."{k}"', v) for k, v in (settings_data.get('presets') or {}).items()
]:
    for key in values:
        if key != 'sections' and key not in declared:
            fail(f'config/settings_data.json: {scope}."{key}" is not declared in settings_schema.json')


# --------------------------------------------------------------------------

if errors:
    print('\n'.join(f'  ✗ {e}' for e in errors))
    print(f'\n{len(errors)} problem(s) found.')
    sys.exit(1)

print(f'✓ theme is valid — {len(schemas)} sections, {len(snippets)} snippets, '
      f'{len(template_files)} templates/section groups checked.')
