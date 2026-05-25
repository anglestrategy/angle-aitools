# Publishing the angle-aitools marketplace

Notes for whoever maintains this repo. Not user-facing.

## First push

From the repo root on your machine:

```bash
git init
git remote add origin git@github.com:anglestrategy/angle-aitools.git
git add .
git commit -m "Initial: pitch-pack v1.0.0"
git branch -M main
git push -u origin main
```

If the repo is private (recommended for now), teammates need to be added as collaborators or be part of the Angle Strategy GitHub org with access.

## Releasing a new plugin version

1. Edit the plugin under `plugins/<plugin-name>/`.
2. Bump `version` in `plugins/<plugin-name>/.claude-plugin/plugin.json`.
3. Commit with a message like `pitch-pack v1.1.0: rewrite the comparable launches template`.
4. Push.
5. Optionally tag the release: `git tag pitch-pack-v1.1.0 && git push --tags`.

Teammates pull updates with:

```
/plugin marketplace update angle-aitools
```

## Adding a second plugin to the marketplace

1. Build the plugin folder under `plugins/<new-plugin-name>/` with the same layout as `pitch-pack`.
2. Add an entry to `.claude-plugin/marketplace.json`:

   ```json
   {
     "name": "new-plugin-name",
     "source": "./plugins/new-plugin-name",
     "description": "What this plugin does in one short sentence."
   }
   ```

3. Commit and push.

## Things to verify before pushing a new release

- The plugin's `.claude-plugin/plugin.json` `version` field is bumped.
- Skills' `description` fields still start with "Use when..." and don't summarise the workflow (a future-Claude-search rule).
- Templates and references work standalone (no broken paths).
- The README for the plugin still describes it accurately.
- AI-tells pass: run any new prose through `cutting-the-AI-out-of-the-prose` first.
