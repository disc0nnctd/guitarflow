# GuitarFlow agent guidance

Follow the parent workspace guidance in `/home/notdc/projects/AGENTS.md`.

## Project context

Read `README.md`, `docs/phase-1-plan.md`, and `docs/research-baseline.md` before
implementation. The current scope is feasibility; recognition accuracy and
live timing are unverified until measured. Keep private recordings out of git.

## Durable progress tracking

Use project-local Beads for all task status and dependencies. Do not create
Markdown TODO lists or a second status tracker. See `docs/tracking.md`.

```bash
bd where             # Must resolve to this project's .beads directory
bd prime
bd ready
bd show <id>
bd update <id> --claim
```

Only close issues after verifying their acceptance criteria. Put evidence and
newly discovered follow-ups in Beads. Do not claim unfinished implementation
complete simply because planning is complete.

## Finish a session

1. Run checks appropriate to changes made.
2. Close only completed issues, with evidence; leave remaining work open.
3. Run `bd dep cycles` and refresh `bd export -o .beads/issues.jsonl`.
4. Commit project changes and the export, then push and verify remote state.

The Dolt database is live task state; the JSONL snapshot is a review/recovery
export. Never import it over an active database or include unrelated parent
workspace memories. Consult the tracking document before configuring native
Dolt sync or recovering a fresh clone.
