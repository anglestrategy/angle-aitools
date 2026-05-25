# Panel rhythm

The Strategy Approach reads as a scrolled deck. Each conceptual unit gets its own slide-height of vertical space. Three rules.

## Rule 1 — one idea per panel

If you have four cards, split them into two rows of two on two separate panels, not a 2×2 grid on one panel.

A panel is roughly one viewport tall (≈80vh). Generous padding-top and padding-bottom. Each panel has room to breathe.

## Rule 2 — section openers are their own panel

Every section starts with an opener panel:

- A small label band across the top (kicker labels left and right above a hairline)
- A giant numeral (in the accent colour) on the left
- The section title on the right, with one or two words highlighted in the accent
- A short deck paragraph below, under a bottom hairline

The opener does the framing work for the section. It does not also try to deliver content.

## Rule 3 — statements get isolation

A big-type statement (a question, a thesis, a quote) is always its own panel. Surrounded by white space. The point of a statement is that it lands by itself.

## CSS pattern

```css
.pane {
  padding: 80px var(--pad-x) 0;
}
.pane.wide  { padding-top: 112px; }
.pane.tight { padding-top: 48px; }
.pane + .pane { padding-top: 96px; }
```

Each section is a `<section>` tag. The opener is the first block. Each subsequent idea is a `<div class="pane">`. Adjacent panes auto-space.

## What good rhythm looks like

A reader scrolling at a normal pace should encounter one idea at a time. They should never have to choose which corner of the screen to read first. They should not see two unrelated ideas on the same screen.

## What bad rhythm looks like

- A 2×2 grid of cards, all on one screen, with no breathing room.
- Statement plus body plus grid plus footer, stacked together.
- Multiple hairlines on the same viewport competing for attention.

## The test

Resize the browser window to 1440×900. Scroll through the page. Stop at each natural resting point. If you can name a single idea at each stop, the rhythm is right. If you have to name three, split the panel.
