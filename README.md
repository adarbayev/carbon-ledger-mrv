# Carbon Ledger MRV

**Installation-level Monitoring, Reporting & Verification tool for EU CBAM compliance.**

> 🔗 **Live Demo:** [adarbayev.github.io/carbon-ledger-mrv](https://adarbayev.github.io/carbon-ledger-mrv/)

## Overview

Carbon Ledger MRV is a client-side web application for industrial installations to calculate, track, and report greenhouse gas emissions under the **EU Carbon Border Adjustment Mechanism (CBAM)**. It implements the full MRV pipeline from activity data entry through product carbon footprint (PCF) allocation to CBAM cost projections.

### Key Features

- **Multi-gas emission engine** — CO₂, CH₄, N₂O, CF₄, C₂F₆ with AR6 GWP factors
- **Flexible emission blocks** — Custom formulas with a visual formula builder
- **Product carbon footprint** — Mass-based allocation with residue/waste treatment
- **CBAM cost projection** — Actual vs EU default values (2026–2034), multi-scenario analysis
- **QA dashboard** — Automated data quality checks and validation
- **Export/Report** — CBAM communication template (JSON/Excel), printable HTML report
- **Audit trail** — Full change history with timestamps and diffs
- **Verification workflow** — Draft → Submitted → Approved → Locked

### CBAM Default Values

Includes **10,932 default emission values** across **120 countries** and **263 CN codes**, parsed from the official EU regulation (Reg. 2025/2621). Automatic scope detection (direct vs direct+indirect) at the CN-code level.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7 |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| Database | SQL.js (SQLite in browser) |
| Animations | Framer Motion |
| Icons | Lucide React |
| Deployment | GitHub Pages via Actions |

## Getting Started

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/      # Reusable UI components
├── context/         # React context (AppContext with reducer)
├── data/            # Reference data (CN codes, emission factors, CBAM defaults)
├── db/              # SQL.js database layer (schema, DAL, seeds)
├── engine/          # Calculation engines (emissions, CBAM, PCF, export)
└── views/           # Page-level view components
```

## Data Pipeline

```
Activity Data → Emission Engine → PCF Allocation → CBAM Projection
     ↓              ↓                  ↓                ↓
  Fuels, MWh    Multi-gas GWP     Mass-based       Actual vs Default
  Process data   AR6 factors       product SEE      Cost forecast
```

## Regenerating CBAM Default Values

If you receive an updated EU regulation xlsx:

```bash
# Place the xlsx in the project root, then:
node parse_cbam_defaults.cjs
```

This reads the xlsx and regenerates `src/data/cbamDefaultValues.js`.

## Deployment

Deployment is automatic via GitHub Actions. Push to `main` triggers:

1. `npm install`
2. `npm run build`
3. Deploy `dist/` to GitHub Pages

See [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

