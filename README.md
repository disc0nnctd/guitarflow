# GuitarFlow

A personal guitar assistant: record a strumming pattern, choose a compatible
song arrangement, and receive current/next chord cues while playing.

The project starts with a feasibility experiment for rhythm recognition and
chord cues. No application code or trained model exists yet.

## Project documents

- [Phase-one plan](docs/phase-1-plan.md): scope, experiments, data and completion criteria.
- [Research baseline](docs/research-baseline.md): products, open source resources and limitations.
- [Progress tracking](docs/tracking.md): Beads workflow and recovery.

## Find the next task

Install the Beads CLI (`bd`), then run from this directory:

```bash
bd prime
bd ready
bd show <issue-id>
bd update <issue-id> --claim
```

Beads is the source of truth for progress. The plan describes intent; it is not
a second task-status list. The working name overlaps with an existing guitar
app; naming will be revisited before a public release.
