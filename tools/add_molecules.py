#!/usr/bin/env python3
"""Add molecules to molecules.js from PubChem 3D conformers.

Usage:
    python3 tools/add_molecules.py batch.json

The batch file is a JSON array; formula and molar mass are fetched from
PubChem, everything editorial is authored by hand:

    [
      {
        "cid": 2519,
        "id": "caffeine",
        "name": { "en": "Caffeine", "es": "Cafeína" },
        "cat": "drugs",
        "tags": ["stimulant", "alkaloid"],
        "geom": { "en": "Fused planar rings", "es": "Anillos planos fusionados" },
        "about": { "en": "…", "es": "…" }
      }
    ]

`geom` is optional. Entries whose id already exists in molecules.js are
skipped, and so are compounds without a PubChem 3D conformer.
PubChem data is in the public domain (U.S. National Library of Medicine).
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

PUG = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}"
MOLECULES_JS = Path(__file__).resolve().parent.parent / "molecules.js"


def fetch(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.read().decode()


def fetch_properties(cid):
    data = json.loads(fetch(PUG.format(cid=cid) + "/property/MolecularFormula,MolecularWeight/JSON"))
    p = data["PropertyTable"]["Properties"][0]
    return p["MolecularFormula"], round(float(p["MolecularWeight"]), 2)


def fetch_conformer(cid):
    """Parse the 3D SDF into atoms/bonds, centred on the centroid."""
    sdf = fetch(PUG.format(cid=cid) + "/record/SDF?record_type=3d")
    lines = sdf.splitlines()
    counts = lines[3]
    na, nb = int(counts[0:3]), int(counts[3:6])
    atoms, bonds = [], []
    for i in range(4, 4 + na):
        p = lines[i].split()
        atoms.append([p[3], float(p[0]), float(p[1]), float(p[2])])
    for i in range(4 + na, 4 + na + nb):
        l = lines[i]
        bonds.append([int(l[0:3]) - 1, int(l[3:6]) - 1, int(l[6:9])])  # 0-indexed
    cx = sum(a[1] for a in atoms) / na
    cy = sum(a[2] for a in atoms) / na
    cz = sum(a[3] for a in atoms) / na
    atoms = [[s, round(x - cx, 3), round(y - cy, 3), round(z - cz, 3)] for s, x, y, z in atoms]
    return atoms, bonds


def formula_html(formula):
    """C8H10N4O2 -> C<sub>8</sub>H<sub>10</sub>N<sub>4</sub>O<sub>2</sub>"""
    return re.sub(r"(\d+)", r"<sub>\1</sub>", formula)


def js_str(s):
    # A JSON string literal is also a valid JS string literal, so json.dumps
    # gives us correct escaping of quotes, backslashes, newlines and unicode.
    return json.dumps(s, ensure_ascii=False)


def js_bilingual(d):
    return f'{{en:{js_str(d["en"])},es:{js_str(d["es"])}}}'


def entry_js(m, formula, mass, atoms, bonds):
    tags = ",".join(js_str(t) for t in m.get("tags", []))
    astr = ",".join(f'[{js_str(s)},{x},{y},{z}]' for s, x, y, z in atoms)
    bstr = ",".join(f"[{a},{b},{o}]" for a, b, o in bonds)
    lines = [
        f'  {{id:{js_str(m["id"])},s:"{formula_html(formula)}",name:{js_bilingual(m["name"])},'
        f'cat:{js_str(m["cat"])},mass:{mass},tags:[{tags}],'
    ]
    if "geom" in m:
        lines.append(f'   geom:{js_bilingual(m["geom"])},')
    lines.append(f'   about:{{en:{js_str(m["about"]["en"])},')
    lines.append(f'          es:{js_str(m["about"]["es"])}}},')
    lines.append(f"   atoms:[{astr}],")
    lines.append(f"   bonds:[{bstr}]}}")
    return "\n".join(lines)


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    batch = json.loads(Path(sys.argv[1]).read_text())
    src = MOLECULES_JS.read_text()
    existing = set(re.findall(r'\{id:"([^"]+)"', src))

    new_entries = []
    for m in batch:
        if m["id"] in existing:
            print(f'skip {m["id"]}: already in molecules.js')
            continue
        try:
            formula, mass = fetch_properties(m["cid"])
            atoms, bonds = fetch_conformer(m["cid"])
        except Exception as e:
            print(f'skip {m["id"]} (cid {m["cid"]}): {e}')
            continue
        new_entries.append(entry_js(m, formula, mass, atoms, bonds))
        print(f'add  {m["id"]}: {formula}, {mass} g/mol, {len(atoms)} atoms')

    if not new_entries:
        print("nothing to add")
        return
    # Append before the closing bracket of the MOLECULES array.
    closing = src.rstrip().rfind("\n];")
    if closing == -1:
        sys.exit("could not find the end of the MOLECULES array")
    src = src[:closing] + ",\n\n" + ",\n\n".join(new_entries) + src[closing:]
    MOLECULES_JS.write_text(src)
    print(f"wrote {len(new_entries)} entries to {MOLECULES_JS.name}")


if __name__ == "__main__":
    main()
