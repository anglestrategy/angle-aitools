---
description: Extract the design tokens from a client's brand brain or presentation system, and write them to a project-local design-tokens file the rest of the workflow can read.
argument-hint: [path to the brand brain folder or files]
---

Use the `porting-a-client-design-system` skill.

## Inputs to gather

- The folder or files that contain the client's brand brain, presentation system, or style guide.
- The client name (used in the output filename).

## Workflow

1. Read the brand brain materials in full. Look for:
   - Typeface name(s) and weights.
   - Surface colours (light, dark, accent surfaces).
   - Accent colour (and where it is used / forbidden).
   - Hairline weight, colour, y-positions on different layouts.
   - Horizontal and vertical padding.
   - Hierarchy logic (size only, or size + weight).
   - Component patterns (cover, divider, content layouts).
   - Things the system actively avoids (non-tokens).

2. If anything is unclear, ask the user before guessing.

3. Write the extracted tokens to two files in the project folder:
   - `design-tokens.md` — human-readable summary using the checklist from `references/tokens-to-extract.md`.
   - `design-tokens.css` — ready-to-paste CSS custom properties for the HTML hubs.

4. If a PPTX export is planned, also write the Python constants block so the `build_deck.py` script can use them.

## Output

- `[Client] - design-tokens.md`
- `[Client] - design-tokens.css`
- (optional) `[Client] - design-tokens.py`

## After writing

Present the files. Note any tokens that were inferred (where the brand brain was incomplete) so the user can review them.
