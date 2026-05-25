---
name: porting-a-client-design-system
description: Use when pitch deliverables need to read in the client's existing design system rather than the agency's. Covers extracting tokens (fonts, surfaces, accent colour, hairlines, padding, hierarchy) from a brand brain or presentation system, and wiring them into HTML and PPTX outputs so the work ships as a peer document.
---

# Porting a Client Design System

## Why this matters

A pitch that ships in the agency's own design language reads as a sales document. A pitch that ships in the client's design language reads as a peer document. The same strategic content lands harder.

## What to extract from the client's brand materials

Most strong design systems define the same six things. Find each one.

### 1. Typeface

Name, weights, where each weight is used. Note the default weight and the emphasis weight. If the system uses only two weights (Light and Medium, say), the work should too. Do not introduce Bold or Italic.

### 2. Surface colours

The backgrounds of the slides. Most systems have two or three: a light surface, a dark surface, sometimes a third accent surface. Note the exact hex values.

### 3. Accent colour

Usually a single saturated colour used sparingly. Almost always for emphasis runs (highlighted text), structural elements (section numbers), or both. Note where the system uses it and where it never uses it.

### 4. Hairlines

Many strong systems use horizontal rules at fixed positions to structure the page. Note the weight (often 2pt) and the y-positions as % of slide height. Different layouts often use different rule positions (a cover layout vs a divider layout vs a content layout).

### 5. Padding

Usually defined as a % of slide width. Note the horizontal padding and the vertical padding.

### 6. Hierarchy logic

Does the system change size to communicate hierarchy, or weight, or both? Strict systems change size only. If the client's system never bolds within body text, the work should not bold within body text.

See `references/tokens-to-extract.md` for a checklist.

## Wiring into HTML

CSS custom properties at the top of the file. Reference them through the document. The user (or you) can then re-skin the page by changing the values.

```css
:root {
  --client-gray:  #DBE2E0;
  --client-black: #000000;
  --client-green: #00FF00;
  --client-font:  'OM AR+LT', system-ui, sans-serif;
  --pad-x: 6.5%;
  --pad-y: 4.56%;
}
```

## Wiring into PPTX

Use a `cqi()` helper that returns `n% × slide_width`. All metrics route through it. Hairlines, padding, font sizes, all expressed in cqi.

See `exporting-html-hubs-to-keynote` for the full Python pattern.

## A worked example

`references/om-worked-example.md` documents the Onsor Mosha (OM) brand brain in full: one typeface (OM AR+LT, Light + Medium), three surface colours (OM Gray #DBE2E0, OM Black #000000, OM White), one accent (OM Green #00FF00), 6.5 cqi horizontal padding / 4.56 cqi vertical padding, hairlines at 15.4% / 33.2% / 75% of slide height on covers and 15.4% / 66.5% on dividers.

## The test

Drop a finished page of the pitch into the client's own deck. If you can tell it apart from the surrounding slides, the port is incomplete.
