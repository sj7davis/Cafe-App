# Project State

## Current Phase
Phase 1 — Server Infrastructure

## Status
in_progress

## Last Updated
2026-05-23

## Decisions
- Remove Kimi OAuth scaffolding, use standalone JWT auth throughout
- Use mysql2 createPool (not PlanetScale mode) for database connection
- Railway for deployment (railway.json + nixpacks)
- Local MySQL for dev (.env.example with localhost URL)
- Port 3001 for backend, 3000 for Vite frontend in dev (proxy configured)

## Blockers
(none)
