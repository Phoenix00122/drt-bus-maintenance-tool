# DRT Maintenance

A transit-fleet maintenance planning app for Durham Region Transit (DRT). It brings fleet records, preventive-maintenance (PM) planning, parts estimates, service history, and live vehicle-feed data into one operational view. The project was created for the Durham College Hackathon 2026, Challenge #14.

> **Repository note:** This repository contains two implementation tracks. The current Replit **Run** workflow in .replit starts the Python/FastAPI app described first below. A separate React/TypeScript UI and Express/PostgreSQL API are also present in the repository; they are not the target of that Run workflow and use a different database.

## What the app does

### Python app (the configured Run workflow)

- **Dashboard** — summarizes fleet and maintenance status, highlights buses in the shop, and surfaces upcoming PM work.
- **Bus fleet** — searches and filters buses, groups them by vehicle family, and supports adding, editing, and deleting fleet records. Bus records include model/year, odometer, estimated monthly distance, last PM date and odometer, status, and notes.
- **PM forecast** — projects service dates from odometer use over a selected month horizon. The seeded schedule models A/B/C/D services at 10,000 km milestones in an A–B–A–C–A–B–A–D cycle, plus a calendar-based annual CVOR inspection. Forecast results include urgency, estimated labor, and expected parts cost.
- **Parts inventory** — browses the parts catalog by category, including part number, unit cost, stock quantity, and unit.
- **Live fleet** — fetches DRT vehicle positions, route/status details, and compares live vehicle IDs with buses in the maintenance database. The view refreshes automatically every 30 seconds and also has a manual refresh control.
- **Service logs** — records completed work by bus, PM schedule, date, mechanic, odometer, notes, and parts used. The form calculates parts and total costs; saving a log updates the bus's last PM date and odometer when those values are supplied. Recent service history is shown with the parts recorded.

### React/Express implementation also in this repository

The separate React app has dashboard, fleet, PM forecast, parts inventory, live-fleet, service-log, and **parts-bundling** screens. Its bundling endpoint groups nearby PM work, flags optional parts that would be pulled forward, avoids double-counting shared parts, and estimates labor savings against the added parts cost. Its frontend and API use PostgreSQL rather than the Python app's SQLite database.

## Live data

Both implementations use the DRT GTFS-Realtime Vehicle Positions feed:

- Feed: <https://drtonline.durhamregiontransit.com/gtfsrealtime/VehiclePositions>
- The feed is fetched by the server and decoded as Protocol Buffers using GTFS-Realtime bindings.
- Live vehicles are matched against locally stored bus numbers. The tracker reports coverage/matches; it does not replace the maintenance database.
- Live tracking depends on the public feed being reachable. The rest of the local fleet and maintenance views use the app's database.

## Technology

### Configured Python app

- Python 3.11+
- FastAPI and Uvicorn
- Jinja2 server-rendered HTML templates with HTMX partial updates
- SQLite database stored at artifacts/drt-py/drt.db
- Tailwind CSS loaded from its CDN
- httpx, gtfs-realtime-bindings, and Protocol Buffers for the live-feed request and parsing

The Python database initializes its tables at startup and seeds demonstration fleet, PM schedules, and parts when it finds no buses in the database. Existing database contents are left in place. Back up artifacts/drt-py/drt.db to retain local data.

### Additional TypeScript implementation

- pnpm workspace monorepo; Node.js 24 and TypeScript 5.9
- React + Vite, Wouter routing, TanStack Query, Tailwind CSS, and Radix-based UI components
- Recharts for dashboard charts; Framer Motion for UI animation; React Hook Form and Zod for forms/validation
- Express 5 API server
- PostgreSQL through pg and Drizzle ORM
- OpenAPI specification with Orval-generated React Query client hooks and Zod schemas
- gtfs-realtime-bindings for the live vehicle feed

The React/API packages have separate configuration and database requirements. In particular, the API's PostgreSQL connection requires DATABASE_URL; the Python app does not use that connection.

## Run the configured Python app locally

Requires Python 3.11+ and uv (https://docs.astral.sh/uv/).

The default workflow command from .replit:

    cd artifacts/drt-py
    python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

For a local environment managed from the repository's pyproject.toml:

    uv sync
    cd artifacts/drt-py
    uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Then open http://localhost:8000. The server initializes the local SQLite schema and runs the seed routine on startup.

## Repository map

- artifacts/drt-py/ — Python/FastAPI app, Jinja2 templates, and SQLite database; this is what the current Run workflow launches.
- artifacts/drt-maintenance/ — React + TypeScript maintenance frontend.
- artifacts/api-server/ — Express API routes for buses, PM schedules, forecast, parts bundles, live fleet, and service logs.
- lib/db/ — Drizzle PostgreSQL schema and connection.
- lib/api-spec/ — OpenAPI definition and code-generation configuration.
- lib/api-client-react/ and lib/api-zod/ — generated frontend API client and validation schemas.
- scripts/ — workspace utility and seed scripts.

## Notes

- Forecasts are estimates based on the stored odometer, monthly-distance, last-service, interval, and parts-cost data; keep those records current for useful results.
- Live vehicle data is external and may be temporarily unavailable. The app shows an error/empty state rather than treating the feed as the source of maintenance records.
- The Python and React/Express tracks have distinct database schemas and feature differences; changes to one are not automatically reflected in the other.
