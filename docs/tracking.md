# Progress tracking with Beads

Run all commands from the repository root. GuitarFlow has its own `.beads`
workspace and `gf-` issue prefix; do not write project issues into a parent
workspace. `bd where` must resolve to this project's `.beads` directory.

```bash
bd where
bd prime
bd ready
bd show <issue-id>
bd update <issue-id> --claim
# Work, verify, and record evidence before closing.
bd close <issue-id> --reason 'Completed; evidence: <path or command>'
bd dep cycles
```

The phase-one epic contains implementation tasks with acceptance criteria and
dependencies. The setup chore records completed repository/planning work;
the feasibility work remains open. Beads is the source of truth for status.

## Persistence

The local Dolt database holds live issue state. `.beads/issues.jsonl` is a
versioned export for review and recovery, not a second editable task database.
Refresh it after changes and commit it alongside relevant project changes:

```bash
bd export -o .beads/issues.jsonl
git add .beads/issues.jsonl
```

The export includes dependencies and acceptance criteria. Do not include
parent-workspace memories, credentials or private audio. Native Dolt remote
sync can be configured later; the initial repository uses the exported issue
snapshot for off-machine recovery.

## Fresh clone or recovery

Install `bd` and Dolt. In a fresh clone with no live database:

```bash
bd bootstrap --dry-run
bd bootstrap --yes
bd where
bd list
bd ready
```

Bootstrap should select the tracked JSONL snapshot when no native Dolt remote
exists. Inspect the dry-run first. Never reinitialize a populated database or
import the snapshot over an active tracker during ordinary work.

This machine uses a dedicated project server on port 3319, because the existing
shared server did not initialize this project correctly. On another machine,
adjust the project server port if occupied. Use `bd dolt status` and `bd doctor`
for diagnostics; do not stop unrelated project servers.
