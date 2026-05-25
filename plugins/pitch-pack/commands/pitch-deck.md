---
description: Export a finished HTML hub (usually the Strategy Approach) to an editable Keynote / PowerPoint at 1920×1080, preserving the client's design tokens.
argument-hint: [path to the HTML file to export]
---

Use the `exporting-html-hubs-to-keynote` skill.

## Inputs to gather

- The HTML file to export (usually the Strategy Approach).
- The client's design system tokens (extracted via `porting-a-client-design-system`).
- The client and project name for the output filename.

## Workflow

1. Open the HTML file and walk through every section. Identify how many slides each section needs (each panel becomes one slide).
2. Read the design tokens for the project. If they exist in a file, use them. If not, ask the user to confirm fonts, surface colours, accent colour, padding, hairline positions.
3. Write a `build_deck.py` Python script in the project folder. Use the `generator-template.py` in this skill as the starting point. Edit:
   - The token block at the top to match the client.
   - The slide content (one Python call per slide) to mirror the HTML.
4. Install python-pptx if not present (`pip install python-pptx --break-system-packages`).
5. Run the script. Output goes next to it.
6. Open the .pptx in Keynote to verify (or use a screen-capture preview if Keynote is not accessible).

## Output

- `build_deck.py` — the generator script (re-runnable, version-controllable).
- `[Client] - Strategy Approach.pptx` — the editable deck.

## After writing

1. Present both files.
2. Note that the .pptx opens in Keynote via File → Open, and exports to .key via File → Export To → Keynote.
