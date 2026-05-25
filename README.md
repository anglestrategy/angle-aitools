# angle-aitools

Angle Strategy's internal Claude plugin marketplace. A small set of tools the studio uses to ship pitches and strategy work faster, all spoken in the client's brand voice.

## Plugins in this marketplace

### pitch-pack

A repeatable way to turn a sparse client brief into a tight pitch package: creative brief hub, comparable launches research, strategy approach in the client's design system, and a native-editable Keynote export. Includes a non-negotiable AI-tells filter before any delivery.

See `plugins/pitch-pack/README.md` for the full breakdown.

## How to install (for teammates)

In Cowork, run:

```
/plugin marketplace add anglestrategy/angle-aitools
```

Then install whichever plugin you want:

```
/plugin install pitch-pack
```

Or use the Cowork settings UI: **Settings → Plugins → Add Marketplace** and paste `anglestrategy/angle-aitools`.

Once installed, the plugin's slash commands (`/pitch`, `/pitch-strategy`, `/pitch-brief`, etc.) and its skills become available in any conversation.

## Updates

Updates push out as soon as the repo updates. Teammates can refresh via:

```
/plugin marketplace update angle-aitools
```

Or the studio publishes a Slack note when a version bump is meaningful.

## Adding a new plugin

1. Build the plugin under `plugins/<plugin-name>/` following the same layout as `pitch-pack`:
   - `.claude-plugin/plugin.json` at the root
   - `commands/` for slash commands
   - `skills/` for skills (each skill is its own directory with `SKILL.md`)
2. Add an entry to `.claude-plugin/marketplace.json`.
3. Commit and push. Teammates' Cowork will pick up the new plugin on next marketplace refresh.

## Repo layout

```
angle-aitools/
├── README.md                       (this file)
├── PUBLISHING.md                   (maintainer notes)
├── .gitignore
├── .claude-plugin/
│   └── marketplace.json            (lists every plugin in this repo)
└── plugins/
    └── pitch-pack/                 (one plugin)
        ├── .claude-plugin/
        │   └── plugin.json
        ├── README.md
        ├── INSTALL.md
        ├── commands/
        ├── skills/
        └── examples/
```
