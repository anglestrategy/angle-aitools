---
name: writing-the-strategy-approach
description: Use when writing the strategy section of a pitch deck, RFP response, or client-facing brief that has to land for a client room and lead into the creative approach without giving the creative work away. The deliverable is an HTML scroll page in the client's design system, structured as a series of slide-sized panels, exportable to an editable Keynote.
---

# Writing the Strategy Approach

## What it is

The strategy section of a pitch. Written as a scrollable HTML page that mirrors a slide deck but ships in the client's design system, so it reads as a peer document rather than an agency output.

It is a **glorified brief.** It brings everyone in the room to the same page before the creative is shown. It does not contain the creative work itself.

## When to use

- A pitch where strategy and creative are separated and strategy is presented first.
- A client deck where the strategic foundation needs to be visible as a stand-alone section.
- Any moment where the answer to "what is the work going to do?" should be on paper, not just in the room.

Not for: the creative platform itself, mood films, casting decks, art direction. Those come after.

## The ten sections

The Strategy Approach is structured as ten numbered sections. Each section has its own opener (a divider panel with a big section number) and one or more content panels underneath.

1. **The moment.** Where the project is starting from. The scale of what is opening, who is watching, what is at stake.
2. **The actual problem.** Diagnosis of what is really being solved, not what the brief states. Usually three problems underneath one strategic question.
3. **Who the work is for.** Audience model. The concentric rings, each with their job.
4. **What the project stands for.** The truths the project is being built to deliver. Usually four (Social, Environmental, Cultural, Economic, or similar lenses).
5. **The journey.** The emotional arc or visitor journey through the project. The shape the work has to follow.
6. **What the creative platform has to do.** Five to seven demands. The briefs underneath the brief.
7. **What we learn from comparable launches.** Tight reads on five to eight reference projects. (See `studying-comparable-launches`.)
8. **What success looks like.** The measurable outcomes the work will be judged against.
9. **What to avoid.** A short list of moves the platform should not make.
10. **Passing it to the creative team.** Three filters to read everything that follows through.

Sections 7 and 9 can be reordered if the client deck flows better that way. The rest hold their order.

## Panel rhythm

Each section is **multiple panels, not one slide.** A section opener is its own panel. A statement is its own panel. A two-card row is its own panel.

Do not dump four ideas into one tight grid. Let each idea have its own scroll-height.

For the spacing pattern and CSS rhythm, see `references/panel-rhythm.md`.

## Voice

Third person throughout. No "you," no direct client address. The text reads as if a senior strategist is walking through it in person.

**Required pass before delivery:** run every word through `cutting-the-AI-out-of-the-prose`. Em dashes, clipped "not X, Y" contrast pairs, and triadic rhythm all get cut.

## Template

`template.html` is the starting point. Fonts, tokens, sticky nav, and the ten-section scaffold are wired up with placeholders. Replace the tokens for the client's design system (see `porting-a-client-design-system`), then fill in the content for the project.

## Worked example

The Waha / Linear Park / New Murabba "Strategy Approach" file in the project folder. Open the HTML in a browser and scroll through to feel the panel rhythm.
