# Signal Agent Control Plane: clickable prototype

A front-end prototype of **Agent Control Plane**, the agent layer of Signal's AI management system (AIMS): an operations console for supervising AI agents in a hospital. Named humans onboard an agent, grant it staged privileges (Shadow → Draft → Supervised → Autonomous), supervise it by exception, stop it in one action, and reconstruct anything it did for an auditor. It's built from the **Countersign** design system and runs entirely on mock data for a fictional hospital, Lakeshore Health.

**Status: in progress.** Progress, phases and what's next live in [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md).

## Docs

- [Build plan](docs/BUILD_PLAN.md): phases, checkpoints, frame tracker, decisions
- [Design spec](docs/specs/2026-10-08-agent-control-plane-prototype-design.md): scope, visitor experience, architecture, routes, data model
- [Design handoff](docs/design-handoff.md): Countersign tokens, primitives, the 10 product components, interaction rules
- [`designs/`](designs/): the high-fidelity frames for epics E1–E15

## Viewing the design frames

```bash
cd designs && python3 -m http.server 4599
```

Then open <http://localhost:4599> and pick any `.dc.html` file.
