# Carbon Ledger MRV - Handoff MVP 4

## 1. State of the Project
This document details the current state of the application following the transition from the Aluminium demo to the "Iron and steel" demo, along with several UI bug fixes. The application uses a Vite + React frontend, backed by a local SQLite database using `sql.js` in a Web Worker, and Tailwind CSS for styling.

### Recent Changes (MVP 4 Updates)
*   **Demo Scenario Transition:** The primary demo scenario was successfully transitioned from "Primary Aluminium" to "Iron and steel (BF-BOF route)".
    *   Updated `src/data/demoScenario.js` to define the new steel process boundaries, activities, and product flows.
    *   Updated `src/db/seed.js` to seed the database with the new steel-focused demo data.
    *   Added `coke_oven_gas` to `FUEL_TYPES` in `src/data/referenceData.js` and `DEFAULT_EMISSION_FACTORS` in `src/engine/emissionEngine.js` to support the new fuel requirements.
*   **UI Bug Fixes:**
    *   **Scope 1 Fuel Types:** Fixed an issue where the UI incorrectly applied custom emission factors (0) for new fuel types, requiring a manual dropdown switch.
    *   **Allocation Tab Empty State:** Fixed a fatal SQL constraint error during the seeding process caused by a lingering `process_events` insertion relating to former Aluminium data. This prevented the Allocation view from populating. Users might need to click "Reset" in the dashboard to force a re-seed if they had older data cached.
*   **CBAM Auto-Detection & Logic Fixes:**
    *   **Dynamic Resolution:** The `ResultsView` was modified to dynamically determine the `activeCnCode` and `activeCategory` based on the active `mainProduct`, instead of relying on hardcoded generic database defaults.
    *   **Settings Updates:** Updated the default `cbamSettings` in both `AppContext.jsx` and `seed.js` to reflect the new "Iron and steel" focus (`7208 39 00`).
    *   **Default Value Lookup:** Fixed a bug where default CBAM emission factors displayed as "N/A" for granular CN codes (like `7208 39 00`). Refactored the lookup logic in `src/data/cbamDefaultValues.js` and `src/data/cbamReferenceData.js` to perform prefix-based fallback matching, allowing it to correctly map to the 4-digit code (`7208`).

## 2. Where we left off:
We just completed the demo transition and resolved all immediately apparent UI and logic bugs resulting from the data shift. The application now correctly seeds, displays, and calculates CBAM projections for the "Iron and steel" demo scenario. We also pushed these fixes to the GitHub repository.

## 3. Recommended Next Steps for the New Chat:
To improve application stability and readability, pick one of the following refactoring tasks identified in the original health check:
1. **Split the State Monolith:** Refactor `src/context/AppContext.jsx`. It is currently over 900 lines and houses the *entire* global state (preventing localized UI updates). Break it down into domains like `ActivityContext`, `AllocationContext`, etc.
2. **Modularize the Data Access Layer:** Refactor `src/db/dal.js`. Break the ~600 line file into modular repositories, such as `activityRepo.js` and `allocationRepo.js`.
3. **Refactor Complex Views:** Break down massive views like `AllocationView.jsx` into smaller, reusable child components (e.g., `PrecursorRow`, `ProductCard`).
