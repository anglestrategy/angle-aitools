# Worked example: Onsor Mosha (OM) brand brain

The OM brand brain is the worked example for this skill. Every token below was extracted from the OM Presentation Brain materials and ported into the Waha / Linear Park / New Murabba pitch package.

## Typography

- Family: `OM AR+LT` (an Arabic + Latin family)
- Weights: Light (300) and Medium (500) only. No Regular, no Bold.
- Default body weight: Light.
- Emphasis weight: Medium.
- Italic: not used.
- Letter-spacing on headlines: -0.02em (slightly tight).
- Letter-spacing on kicker labels: 0.18em–0.20em (uppercase).

## Colour

- OM Gray:  `#DBE2E0` — default light surface
- OM Black: `#000000` — dark surface and primary text
- OM White: `#FFFFFF` — text on dark
- OM Green: `#00FF00` — accent. Used only for:
  - Section numbers on dividers
  - Highlight runs (one or two words inside a title, painted as a green background fill with black text on top)
  - Never used as a large fill, never on photography

## Layout

- Slide: 1920 × 1080
- Horizontal padding: 6.5 cqi  (124.8 px on a 1920 slide)
- Vertical padding:   4.56 cqi (87.55 px)

## Hairlines

- Weight: 2 pt
- Colour: black on light surfaces, white on dark
- Cover layouts: y = 15.4% / 33.2% / 75% of slide height
- Divider layouts: y = 15.4% / 66.5%
- Full-bleed (span the full slide width, not just the padded area)

## Hierarchy (font sizes in pt for a 1920×1080 slide)

- Cover title:      100 pt
- Section number:   180 pt (giant green numerals on dividers)
- Section title:    63 pt   (4.4 cqi)
- Statement:        56 pt
- Statement tall:   70 pt
- Card heading:     32 pt
- Lead / deck:      22 pt
- Body:             19 pt   (1.3 cqi)
- Kicker / label:   11 pt   (uppercase, letter-spaced)

## The non-tokens

- No drop shadows.
- No gradients.
- No body-text bolding (medium weight only used for headings, kickers, and card titles).
- Accent green is structural, never decorative.
- Hairlines are structural, never decorative.
- Hierarchy is communicated through scale, not weight variation.

## Where this lives in code

In CSS (HTML hubs):

```css
:root {
  --om-gray:  #DBE2E0;
  --om-black: #000000;
  --om-green: #00FF00;
  --om-white: #FFFFFF;
  --om-font:  'OM AR+LT', system-ui, sans-serif;
  --om-w-light:  300;
  --om-w-medium: 500;
  --pad-x: 6.5%;
  --pad-y: 4.56%;
  --line: 2px;
}
```

In Python (PPTX builder):

```python
SLIDE_W = 1920
SLIDE_H = 1080
OM_GRAY  = RGBColor(0xDB, 0xE2, 0xE0)
OM_BLACK = RGBColor(0x00, 0x00, 0x00)
OM_GREEN = RGBColor(0x00, 0xFF, 0x00)
FONT = 'OM'
PAD_X = SLIDE_W * 0.065
PAD_Y = SLIDE_W * 0.0456
HL_DIV_TOP = SLIDE_H * 0.154
HL_DIV_BOT = SLIDE_H * 0.665
```

See the `build_strategy_keynote.py` file in the Waha project for the complete generator.
