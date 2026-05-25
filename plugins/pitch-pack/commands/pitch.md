---
description: Start a new pitch project end to end. Walks through the six stages and produces the three HTML deliverables plus a Keynote export.
argument-hint: [optional path to the brief]
---

You are running the **pitch-pack** workflow on a new project.

## Step 1 — Get the brief

If the user has uploaded a brief, RFP, or supporting documents, read them in full. If not, ask:

> "Where is the brief? Drop the file, paste it, or point me at a folder."

Also ask which client and which project so the output files can be named correctly (e.g. `Waha - Strategy Approach.html`).

## Step 2 — Get the client's design system

Ask the user where the client's brand materials are. Most clients have a brand brain, presentation system, or style guide. You need the typeface, surface colours, accent colour, hairlines, padding, and hierarchy rules.

If the user does not have one, default to a clean neutral system (Inter / black / white / no accent) and flag that the work will need re-skinning later.

Use the `porting-a-client-design-system` skill.

## Step 3 — Walk through the six stages

Use the `pitch-pack` skill as the guide.

1. **Read what is in front of you.** Pull every fact. Notice gaps. Write a short "what's in the brief" memo first.
2. **Name what is actually being solved.** One sentence. Test it against two or three alternative diagnoses.
3. **Map the audience.** Two to four concentric rings.
4. **Study comparable launches.** Use the `studying-comparable-launches` skill. Pick five to eight references.
5. **Write what the work has to do.** Five to seven demands on the creative platform.
6. **Pass it to the creative team.** Three filters plus things to avoid.

Pause after each stage and let the user push back before moving to the next.

## Step 4 — Produce the three HTML deliverables

In this order:

1. **Creative Brief Hub** (`[Client] - Creative Brief Hub.html`) — use `writing-the-creative-brief`.
2. **Comparable Launches** (`[Client] - Comparable Launches.html`) — use `studying-comparable-launches`.
3. **Strategy Approach** (`[Client] - Strategy Approach.html`) — use `writing-the-strategy-approach`.

All three in the client's design system.

## Step 5 — Export to Keynote if requested

Use `exporting-html-hubs-to-keynote`. Produces `[Client] - Strategy Approach.pptx` at 1920×1080, native editable, opens in Keynote.

## Step 6 — Cut the AI out of the prose

Run every word through `cutting-the-AI-out-of-the-prose` before delivery. No exceptions.

## Step 7 — Present the files

Use `mcp__cowork__present_files` to surface each finished file. Include short one-line summaries of what each one contains.
