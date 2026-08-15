#!/usr/bin/env python3
# ============================================================
# xslt-align.test.py — the XSLT exporters' tier alignment
# ============================================================
#
# WHY THIS TEST IS PYTHON, breaking the node-only convention
#
# docs/xlingpaper.html and docs/html.html transform the .onestory XML with
# XSLT 1.0 via the browser's XSLTProcessor. They cannot import
# docs/js/interlinear-align.js, so they carry their own copy of the same
# alignment rules — and two implementations of one rule can drift.
#
# node has no XSLT engine. Python's lxml does, so this actually EXECUTES
# the stylesheets rather than eyeballing them. That is worth one dependency
# the repo does not otherwise have, because the alternative is no coverage
# at all on the two exporters most likely to rot.
#
# SKIPS CLEANLY (exit 0) if lxml is unavailable, so it never blocks a
# commit on a machine without it. Install with:  pip3 install lxml
#
#     python3 tools/test/xslt-align.test.py
#
# ALL FIXTURES ARE SYNTHETIC — placeholder language "Alpha", ISO qaa.

import re
import sys
import pathlib

try:
    from lxml import etree
except ImportError:
    print("  SKIP xslt-align: lxml not installed (pip3 install lxml)")
    sys.exit(0)

ROOT = pathlib.Path(__file__).resolve().parents[2]

# Pull the named templates out of the page and drive them directly. Testing
# them in isolation keeps the fixture from having to reproduce the whole
# .onestory document shape, which is not what is under test here.
NEEDED = {"countWords", "tokenizeAndWrap", "tokenizeAndWrapWithGloss", "padGlossSlots"}

DRIVER = """<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="xml" indent="no"/>
<xsl:template match="/t">
 <r><vern><xsl:call-template name="tokenizeAndWrap">
    <xsl:with-param name="text" select="normalize-space(v)"/></xsl:call-template></vern>
 <gl><xsl:variable name="n"><xsl:call-template name="countWords">
    <xsl:with-param name="text" select="normalize-space(v)"/></xsl:call-template></xsl:variable>
   <xsl:call-template name="tokenizeAndWrapWithGloss">
     <xsl:with-param name="text" select="normalize-space(g)"/>
     <xsl:with-param name="remaining" select="number($n)"/></xsl:call-template></gl></r>
</xsl:template>
%s
</xsl:stylesheet>"""

# (label, vernacular, gloss, expected gloss cell contents)
CASES = [
    ("aligned",                 "ka mo si", "g1 g2 g3",    ["g1", "g2", "g3"]),
    ("orphans folded onto last","ka mo",    "g1 g2 g3 g4", ["g1", "g2 g3 g4"]),
    ("short gloss padded",      "ka mo si", "g1",          ["g1", "", ""]),
    ("no gloss at all",         "ka mo si", "",            ["", "", ""]),
    ("hole stays VISIBLE here", "ka mo si", "g1 *** g3",   ["g1", "***", "g3"]),
    ("double space collapsed",  "ka mo",    "g1  g2",      ["g1", "g2"]),
    ("one word, three glosses", "ka",       "g1 g2 g3",    ["g1 g2 g3"]),
]

NS = "{http://www.w3.org/1999/XSL/Transform}"


def templates(path):
    src = path.read_text(encoding="utf-8")
    m = re.search(r"(<xsl:stylesheet[\s\S]*?</xsl:stylesheet>)", src)
    if not m:
        raise SystemExit(f"  FAIL no <xsl:stylesheet> found in {path.name}")
    root = etree.fromstring(m.group(1).encode())
    found = {t.get("name") for t in root.findall(f"{NS}template")}
    missing = NEEDED - found
    if missing:
        raise SystemExit(f"  FAIL {path.name} is missing template(s): {sorted(missing)}")
    return "\n".join(
        etree.tostring(t, encoding="unicode")
        for t in root.findall(f"{NS}template")
        if t.get("name") in NEEDED
    )


fail = 0
for name in ("xlingpaper.html", "html.html"):
    path = ROOT / "docs" / name
    print(f"\n--- {name} ---")
    transform = etree.XSLT(etree.fromstring((DRIVER % templates(path)).encode()))

    for label, vern, gloss, expected in CASES:
        doc = etree.fromstring(f"<t><v>{vern}</v><g>{gloss}</g></t>".encode())
        out = etree.fromstring(str(transform(doc)).encode())
        n_vern = len(out.find("vern"))
        n_gloss = len(out.find("gl"))
        # the innermost element of each slot holds the gloss text
        got = [(list(slot.iter())[-1].text or "") for slot in out.find("gl")]

        if n_vern != n_gloss:
            print(f"  FAIL {label}: baseline={n_vern} gloss={n_gloss} — tiers must match")
            fail += 1
        elif got != expected:
            print(f"  FAIL {label}: expected {expected}, got {got}")
            fail += 1
        else:
            print(f"  ok   {label}")

print(f"\n{fail} FAILURE(S)\n" if fail else "\nall passed\n")
sys.exit(1 if fail else 0)
