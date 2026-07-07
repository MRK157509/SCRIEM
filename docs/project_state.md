## Project State

SCRIEM is a FastAPI + React/Vite SOC workbench with:

- Auth and role-based access control
- Alert feed and alert drawer
- Timeline search and investigation mode
- AI analysis endpoints for alerts
- Agent token auth for event ingestion
- Persistent case management backed by the database

## Current Architecture

- Backend entrypoint: `app/main.py`
- Frontend entrypoint: `scriem-ui/src/main.jsx`
- Backend database: SQLite via SQLAlchemy
- Frontend API calls: proxied through Vite to `http://127.0.0.1:9000`

## Important Note

Case data is no longer frontend-only. It now persists in the backend database.
