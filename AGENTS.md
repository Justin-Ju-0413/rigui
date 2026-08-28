# Agent Guidelines

Rigui is a local-first React, Vite, TypeScript, Dexie and Electron scheduling product.

## Workflow

- Do not push directly to `main`; use a focused branch and Pull Request.
- Preserve IndexedDB schema compatibility and existing JSON/ICS backups.
- Do not commit API keys, real calendars, notification payloads or local database exports.
- Keep changes scoped. New planning systems require a validated user need and must not duplicate existing goal/task scheduling.

## Verification

Before completing a change, run:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

Run `npm run perf` for rendering, animation or performance-sensitive changes. E2E must use mocked providers and must not consume a real API key.

## Product priorities

Prioritize natural-language input accuracy, scheduling correctness, notifications, backups, PWA/Electron stability and data privacy over feature count.
