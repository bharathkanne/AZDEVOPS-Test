# Vehicle Management CMS

A local-first web application for managing company vehicles and assets through their complete lifecycle: ownership, drivers, project assignments, compliance, maintenance, and documents.

## Features

- Dashboard with fleet KPIs, compliance alerts, and recent activity
- Vehicle master list with search, filters, sorting, and CSV export
- Vehicle detail pages with tabs for general info, ownership, assignments, compliance, financials, maintenance, and documents
- Owners, drivers, projects, assets, maintenance, and documents modules
- Reports with CSV export
- Role-based access (Admin, Fleet Manager, Viewer)
- Demo data included — no backend required

## Demo accounts

| Username | Password | Role |
| --- | --- | --- |
| admin | admin123 | Admin |
| manager | manager123 | Fleet Manager |
| viewer | viewer123 | Viewer |

## Getting started

```bash
bun install
bun run dev
```

The app runs at http://localhost:8080. Data is stored in the browser; use Settings → Reset demo data to restore the sample dataset.

## Tech stack

- React 19 + TanStack Start (Vite)
- Tailwind CSS v4 + shadcn/ui
- Recharts
