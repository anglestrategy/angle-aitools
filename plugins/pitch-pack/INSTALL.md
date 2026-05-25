# Installing pitch-pack

## Option 1 — install each skill one at a time (easiest)

The simplest way to use this is to install the seven skills individually. Each one is shipped as a `.skill` file (a zip of its directory). Drop each into the chat and click **Save skill**.

The seven skills:

1. `pitch-pack.skill`
2. `writing-the-strategy-approach.skill`
3. `writing-the-creative-brief.skill`
4. `studying-comparable-launches.skill`
5. `porting-a-client-design-system.skill`
6. `exporting-html-hubs-to-keynote.skill`
7. `cutting-the-AI-out-of-the-prose.skill`

Once installed, the skills will trigger automatically on the phrases listed in their `description` field, or you can invoke any of them by name.

## Option 2 — install as a plugin (with slash commands)

Move the entire `pitch-pack/` directory into your local Claude plugins folder:

```
~/.claude/plugins/pitch-pack/
```

After restarting the session, the slash commands (`/pitch`, `/pitch-strategy`, etc.) become available, and all seven skills get loaded together.

## Option 3 — keep it in the project folder and reference it

If you do not want to install anything globally, you can keep the `pitch-pack/` directory inside a project folder and point Claude at it by saying:

> "Read the pitch-pack skills in this folder and use them on this brief."

Claude will load the skills on demand.

## Updating

The skills are markdown. Edit them in place. The next session will pick up the changes.
