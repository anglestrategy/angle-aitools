---
description: Run a piece of prose through the AI-tells filter. Removes em dashes, clipped contrast pairs, triadic rhythm, and pitch-deck abstractions.
argument-hint: [file or pasted prose]
---

Use the `cutting-the-AI-out-of-the-prose` skill.

## Inputs to gather

- The prose to clean. Can be a file path, a pasted block, or a whole HTML document.

## Workflow

1. Read the prose.
2. Search for `—`. Replace each one with the right punctuation for the sentence.
3. Scan for clipped "Not X. Y." pairs. Soften by extending into longer sentences, except one strong instance per section.
4. Scan for triadic rhythm ("Direct. Clear. Confident."). Cut.
5. Run the vocabulary check against `references/words-and-patterns-to-cut.md`. Replace each offender.
6. Look for overlong dependent clauses (three or more). Break into two sentences.
7. Read the result aloud (silently is fine, but read every word).

## Output

- The cleaned prose, returned in the same format (file edit, text reply, or HTML rewrite as appropriate).
- A short note listing the categories of edits made (number of em dashes removed, vocabulary replacements, etc.) so the user can verify nothing was over-edited.

## After cleaning

If the prose lives in an HTML or PPTX deliverable, run the full pass on the file in place, then present it.
