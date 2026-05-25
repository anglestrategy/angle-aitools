---
name: exporting-html-hubs-to-keynote
description: Use when a finished HTML hub (Strategy Approach, Creative Brief, or similar) needs to be delivered as an editable Keynote or PowerPoint file at 1920×1080, preserving the client's design tokens (fonts, surfaces, accent colour, hairlines, padding). Produces a .pptx via python-pptx that Keynote opens natively.
---

# Exporting HTML Hubs to Keynote

## What it is

A python-pptx generator that takes the content from an HTML hub and produces a native-editable PowerPoint file at 1920×1080. The file opens in Keynote and exports to .key with one click.

The point is that the deck reads identically to the HTML hub: same tokens, same hairline positions, same green numerals, same accent runs.

## When to use

- The client asked for an editable deck on top of the HTML hub.
- The pitch room is a presentation, not a screen-share.
- The strategy section needs to live inside a longer Keynote deck the client already has.

Not for: replacing the HTML hub. The HTML hub is the better scrolling experience and remains the canonical document.

## How it works

The `generator-template.py` script:

1. Defines the client design tokens at the top (surfaces, accent, font, padding, hairlines, font sizes) using cqi units.
2. Defines slide templates for the recurring patterns (cover, section divider, statement, two-card row, single panel, ring block, arc, comparable launch read, objectives row, filters row).
3. Builds the deck slide by slide, one Python call per slide.
4. Saves as `[Client] - [Hub Name].pptx`.

## Tokens via cqi

Every metric routes through one helper:

```python
def cqi(n):
    return n / 100 * SLIDE_W   # → px (relative to 1920px slide)

def cqi_pt(n):
    return cqi(n) * 0.75       # → pt (96 dpi conversion)
```

Padding, font sizes, and hairline positions are all expressed as cqi. To re-skin for a different client, change `SLIDE_W`, the colour constants, and the font name. The rest scales automatically.

## Inline highlight runs

PowerPoint OOXML supports inline text highlighting via `<a:highlight>`. python-pptx does not expose it directly, so a small helper injects it:

```python
from pptx.oxml.ns import qn
from lxml import etree

def set_highlight(run, hex_color):
    rPr = run._r.get_or_add_rPr()
    highlight = etree.SubElement(rPr, qn('a:highlight'))
    srgb = etree.SubElement(highlight, qn('a:srgbClr'))
    srgb.set('val', hex_color)
```

Use it for the green accent runs inside titles and statements. Keynote renders these correctly on import.

## Hairlines

Each hairline is a `MSO_CONNECTOR.STRAIGHT` connector spanning the slide. Position by y-coordinate (`HL_DIV_TOP = SLIDE_H * 0.154`, etc). Weight in pt.

## Section numbers

The giant green numerals on dividers are a single textbox with `font.color.rgb = ACCENT` and `font.size = Pt(180)`. Light weight, not bold.

## Running the generator

```bash
pip install python-pptx
python3 build_deck.py
```

Output is dropped next to the script.

## Opening in Keynote

File → Open → select the `.pptx`. Keynote converts on import. File → Export To → Keynote saves as `.key`.

## Worked example

`generator-template.py` in this skill is a minimal template. For the full worked example, see `plugins/pitch-pack/examples/waha-linear-park/build_strategy_keynote.py` in the repo: 43 slides, 10 sections, all OM tokens, 1920×1080, native editable. Use it as a reference when adapting the template to a new project.
