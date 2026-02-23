// ═══════════════════════════════════════════════════════════════
//  Demo Data Seed
//  Populates SQLite with data matching the Excel prototype
//  (MRV2_Aluminium_Ingots_Prototype)
// ═══════════════════════════════════════════════════════════════

import { execute, query } from './database.js';
import {
    INSTALLATION_DATA,
    BOUNDARIES_DATA,
    PROCESSES_DATA,
    FUEL_ENTRIES_DATA,
    ELECTRICITY_ENTRIES_DATA,
    PROCESS_EVENTS_MONTHS,
    PRODUCTS_DATA,
    PRODUCTION_OUTPUT_DATA,
    EMISSION_FACTORS_DATA
} from '../data/demoScenario.js';
import { getGridEf } from '../data/referenceData.js';

/**
 * Check if database is already seeded.
 */
function isSeeded() {
    const result = query('SELECT COUNT(*) as cnt FROM installations');
    return result[0]?.cnt > 0;
}

/**
 * Seed the database with demo data.
 * Matches the Excel model's dummy scenario for an aluminium smelter in Kazakhstan.
 */
export function seedDemoData() {
    if (isSeeded()) {
        console.log('[Seed] Database already seeded, skipping');
        return;
    }

    console.log('[Seed] Populating demo data...');

    // ─── Installation ────────────────────────────────
    execute(
        `INSERT INTO installations (id, name, country, period_start, period_end) VALUES (?, ?, ?, ?, ?)`,
        [INSTALLATION_DATA.id, INSTALLATION_DATA.name, INSTALLATION_DATA.country, INSTALLATION_DATA.periodStart, INSTALLATION_DATA.periodEnd]
    );

    // ─── Boundaries ──────────────────────────────────
    BOUNDARIES_DATA.forEach(([id, name, included, notes]) => {
        execute('INSERT INTO boundaries (id, installation_id, name, included, notes) VALUES (?, ?, ?, ?, ?)',
            [id, 'default', name, included, notes]);
    });

    // ─── Processes ───────────────────────────────────
    PROCESSES_DATA.forEach(([id, name, desc, cat]) => {
        execute('INSERT INTO processes (id, installation_id, name, description, category, active) VALUES (?, ?, ?, ?, ?, 1)',
            [id, 'default', name, desc, cat]);
    });

    // ─── Fuel Entries (from Excel Sheet 03) ──────────
    FUEL_ENTRIES_DATA.forEach(([id, period, processId, fuelType, qty, unit, evidence, notes]) => {
        execute(
            `INSERT INTO fuel_entries (version_id, stable_id, version_number, installation_id, period, process_id, fuel_type_id, quantity, unit, evidence, notes) VALUES (?, ?, 1, 'default', ?, ?, ?, ?, ?, ?, ?)`,
            [`${id}_v1`, id, period, processId, fuelType, qty, unit, evidence, notes]
        );
    });

    // ─── Electricity Entries (from Excel Sheet 04) ───
    ELECTRICITY_ENTRIES_DATA.forEach(([id, period, processId, mwh, country, ef, notes]) => {
        // Dynamic EF Lookup: if ef is 0 (or missing), pull from reference data
        const finalEf = (ef === 0) ? getGridEf(country) : ef;

        execute(
            `INSERT INTO electricity_entries (version_id, stable_id, version_number, installation_id, period, process_id, mwh, grid_country, ef, ef_override, evidence, notes) VALUES (?, ?, 1, 'default', ?, ?, ?, ?, ?, 0, ?, ?)`,
            [`${id}_v1`, id, period, processId, mwh, country, finalEf, `Power meter — ${notes}`, notes]
        );
    });

    // ─── Process Events (legacy — from Excel Sheet 03B) ──────
    // The Steel demo doesn't use standard process events yet. All calculations are via emission_blocks.
    // ─── Emission Blocks (formula-based process emissions) ───
    // Creates blocks from templates for the integrated steel demo data
    PROCESS_EVENTS_MONTHS.forEach((m, idx) => {
        const i = idx + 1;
        const ironProd = m.ironProd || 0;

        // P01: Sinter Plant Reducing Agent (Coke breeze proxy)
        execute(
            `INSERT INTO emission_blocks (id, installation_id, period, process_id, template_id, name, output_gas, formula, formula_display, parameters, source)
             VALUES (?, 'default', ?, 'P01', 'steel_reducing_agent', 'Sinter Reducing Agent (Coke)', 'CO2', ?, ?, ?, ?)`,
            [
                `eb_sinter_coke_${i}`, m.period,
                'agent_mass * carbon_content * 44 / 12',
                'Agent Mass × C Content × (44/12)',
                JSON.stringify([
                    { key: 'agent_mass', label: 'Coke Breeze Mass', unit: 't', value: Math.round(ironProd * 0.05) }, // 50kg/t
                    { key: 'carbon_content', label: 'Carbon Content', unit: 'fraction', value: 0.82 },
                ]),
                'IPCC 2006 Vol.3 Ch.4',
            ]
        );

        // P02: Blast Furnace Reducing Agent (Coke + PCI proxy)
        execute(
            `INSERT INTO emission_blocks (id, installation_id, period, process_id, template_id, name, output_gas, formula, formula_display, parameters, source)
             VALUES (?, 'default', ?, 'P02', 'steel_reducing_agent', 'BF Reducing Agent (Coke/Coal)', 'CO2', ?, ?, ?, ?)`,
            [
                `eb_bf_agent_${i}`, m.period,
                'agent_mass * carbon_content * 44 / 12',
                'Agent Mass × C Content × (44/12)',
                JSON.stringify([
                    { key: 'agent_mass', label: 'Coke + Coal Mass', unit: 't', value: Math.round(ironProd * 0.45) }, // 450kg/t
                    { key: 'carbon_content', label: 'Carbon Content', unit: 'fraction', value: 0.85 },
                ]),
                'IPCC 2006 Vol.3 Ch.4',
            ]
        );

        // P02: Blast Furnace Fluxes (Limestone/Dolomite)
        execute(
            `INSERT INTO emission_blocks (id, installation_id, period, process_id, template_id, name, output_gas, formula, formula_display, parameters, source)
             VALUES (?, 'default', ?, 'P02', 'steel_limestone', 'BF Flux Calcination', 'CO2', ?, ?, ?, ?)`,
            [
                `eb_bf_flux_${i}`, m.period,
                'limestone * 0.44 + dolomite * 0.477',
                'Limestone × 0.44 + Dolomite × 0.477',
                JSON.stringify([
                    { key: 'limestone', label: 'Limestone Consumption', unit: 't', value: Math.round(ironProd * 0.1) }, // 100kg/t
                    { key: 'dolomite', label: 'Dolomite Consumption', unit: 't', value: Math.round(ironProd * 0.02) },
                ]),
                'IPCC 2006 Vol.3 Ch.4',
            ]
        );

        // P03: Steelmaking (Carbon Oxidation Proxy)
        execute(
            `INSERT INTO emission_blocks (id, installation_id, period, process_id, template_id, name, output_gas, formula, formula_display, parameters, source)
             VALUES (?, 'default', ?, 'P03', 'steel_reducing_agent', 'BOF Carbon Oxidation', 'CO2', ?, ?, ?, ?)`,
            [
                `eb_bof_carbon_${i}`, m.period,
                'agent_mass * carbon_content * 44 / 12',
                'Agent Mass × C Content × (44/12)',
                JSON.stringify([
                    { key: 'agent_mass', label: 'Hot Metal C Reduction', unit: 't', value: Math.round(ironProd * 1.05) }, // Basis hot metal
                    { key: 'carbon_content', label: 'Change in C Content', unit: 'fraction', value: 0.04 }, // 4% to 0.05%
                ]),
                'IPCC 2006 Vol.3 Ch.4',
            ]
        );
    });

    // ─── Products ────────────────────────────────────
    PRODUCTS_DATA.forEach(([id, installationId, name, cnCode, isResidue]) => {
        execute(
            `INSERT INTO products (id, installation_id, name, cn_code, is_residue) VALUES (?, ?, ?, ?, ?)`,
            [id, installationId, name, cnCode, isResidue]
        );
    });

    // ─── Production Output ───────────────────────────
    PRODUCTION_OUTPUT_DATA.forEach(([id, period, productId, processId, qty]) => {
        execute(
            `INSERT INTO production_output (version_id, stable_id, version_number, installation_id, period, product_id, process_id, quantity, data_source) VALUES (?, ?, 1, 'default', ?, ?, ?, ?, 'Production report')`,
            [`${id}_v1`, id, period, productId, processId, qty]
        );
    });

    // ─── Emission Factor Library ─────────────────────
    EMISSION_FACTORS_DATA.forEach(([id, fuel, gas, val, unit, ncv, ncvUnit, source]) => {
        execute(
            `INSERT INTO emission_factors (id, fuel_type, gas, ef_value, ef_unit, ncv, ncv_unit, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, fuel, gas, val, unit, ncv, ncvUnit, source]
        );
    });

    // ─── GWP Set ─────────────────────────────────────
    execute(
        `INSERT INTO gwp_sets (id, name, co2, ch4, n2o, cf4, c2f6) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['EU_CBAM_2025', 'EU CBAM 2025/2547', 1, 29.8, 265, 6630, 11100]
    );

    // ─── CBAM Settings ───────────────────────────────
    execute(
        `INSERT INTO cbam_settings (id, basis, scope, cert_price_scenario, al_price_scenario, carbon_credit_eligible, carbon_credit_scenario, imported_qty, cn_code, good_category) VALUES ('default', 'ACTUAL', 'DIRECT_ONLY', 'MID', 'MID', 1, 'HIGH', 110000, '7208 39 00', 'Iron and steel')`
    );

    // ─── Allocation Settings ─────────────────────────
    execute(
        `INSERT INTO allocation_settings (id, method, treat_residue_as_waste) VALUES ('default', 'mass', 1)`
    );

    console.log('[Seed] Demo data populated successfully');
}
