#!/usr/bin/env python3
"""Builds index.html from src/ and stamps the version into version.json and sw.js."""
import json, pathlib, re
root = pathlib.Path(__file__).parent
src = root / 'src'
js = ''.join((src / f).read_text() for f in ['data.js', 'muster.js', 'engine.js', 'battle.js', 'shell.js'])
version = re.search(r"GAME_VERSION = '([^']+)'", js).group(1)
kits = (src / 'kit_install.html').read_text().replace("'Crystal Circuit'", "'Iron Dominion'").replace("'cc-install-snooze'", "'idom-install-snooze'")
kits += (src / 'kit_update.html').read_text().replace('NAME="Crystal Circuit",BUILD="1.7.0",CACHES=["cc-"]', f'NAME="Iron Dominion",BUILD="{version}",CACHES=["idom-"]')
assert 'Crystal Circuit' not in kits, 'kit names not replaced'
page = (src / 'page.html').read_text().replace('/*__JS__*/', js).replace('<!--__KITS__-->', kits)
(root / 'index.html').write_text(page)
(root / 'version.json').write_text(json.dumps({'version': version}) + '\n')
sw = (src / 'sw.js').read_text().replace('__VERSION__', version)
(root / 'sw.js').write_text(sw)
print('built', version, len(page), 'bytes')
