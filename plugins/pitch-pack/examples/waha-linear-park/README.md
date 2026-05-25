# Worked example — Waha / Linear Park / New Murabba

The first pitch the pitch-pack was built on. Use this folder as a concrete reference when working a new project.

## What this is

A pitch response for New Murabba Development Company's Linear Park (working title: Waha). The pitch is a Saudi mini-competition to develop a communication strategy for launching the first 3% of the Linear Park system.

The work uses the Onsor Mosha (OM) design system throughout (one typeface, two weights, OM Green accent, hairline-based structure).

## What's in here

- `build_strategy_keynote.py` — the deck generator for this specific project. 43 slides, 10 sections, all OM tokens hard-coded. Run it as-is to produce the .pptx. Read it as a worked example of how the `generator-template.py` in the skill folder gets turned into a real-project script.

## How to read it

Open `build_strategy_keynote.py` and look at the four parts:

1. **Token block at the top** — the OM design system in Python constants. Surface colours, accent, font, padding, hairlines, font sizes.
2. **Helper functions** — `cqi()`, `text()`, `rich_text()`, `set_highlight()`, `add_hairline()`. These map straight onto the CSS patterns in the HTML hubs.
3. **Slide templates** — `slide_cover()`, `slide_divider()`, `slide_statement()`, `slide_two_cards()`, `slide_single_panel()`, `slide_ring()`, `slide_arc()`, `slide_two_col_reading()`, `slide_bench()`, `slide_objectives()`, `slide_filters()`. One template per recurring slide pattern in the deck.
4. **`build()`** — one function call per slide, in order. This is where the deck's content actually lives. The first call is the cover; then ten divider/content blocks, one per section.

## How to adapt it for a new project

1. Copy this file into your new project folder and rename it `build_deck.py`.
2. Edit the token block at the top: replace the OM colours with the client's surface and accent colours, replace the font name, adjust the hairline y-positions if the client's system uses different ones.
3. Edit the `build()` function: replace each `slide_*()` call with content for the new project.
4. Keep the helper functions and slide templates as-is unless the client's system needs new patterns (e.g. a four-column layout instead of three).
5. Run `python3 build_deck.py`.

## Related files

The HTML hubs this script mirrors are in the original project folder, not in this repo:

- `Waha - Strategy Approach.html`
- `Waha - Creative Brief Hub.html`
- `Waha - Benchmarks Deep Dive.html`

Ask Faisal for access if you want to see the full pitch package.
