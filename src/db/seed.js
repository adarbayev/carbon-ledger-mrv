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
    // Per-month anode consumption + PFC parameters for P01 (Electrolysis)

    PROCESS_EVENTS_MONTHS.forEach((m, idx) => {
        const base = `pe_${idx + 1}`;
        const events = [
            [`${base}_1`, m.period, 'P01', 'ANODE', 'metal_production', m.metalProd, 't', 'Production report'],
            [`${base}_2`, m.period, 'P01', 'ANODE', 'net_anode_consumption', 420, 'kg/t Al', 'Anode usage log'],
            [`${base}_3`, m.period, 'P01', 'ANODE', 'anode_carbon_fraction', 0.95, 'fraction', 'Lab analysis'],
            [`${base}_4`, m.period, 'P01', 'ANODE', 'anode_sulfur_fraction', 0.02, 'fraction', 'Lab analysis'],
            [`${base}_5`, m.period, 'P01', 'ANODE', 'anode_ash_fraction', 0.01, 'fraction', 'Lab analysis'],
            [`${base}_6`, m.period, 'P01', 'PFC', 'aem_minutes', 0.25, 'min/cell-day', 'Potline system'],
            [`${base}_7`, m.period, 'P01', 'PFC', 'cf4_slope_factor', 0.00006, 't CF4 / (t Al × AEM)', 'IPCC default'],
            [`${base}_8`, m.period, 'P01', 'PFC', 'c2f6_cf4_ratio', 0.1, 'ratio', 'IPCC default'],
        ];
        events.forEach(([id, period, processId, eventType, param, value, unit, source]) => {
            execute(
                `INSERT INTO process_events (version_id, stable_id, version_number, installation_id, period, process_id, event_type, parameter, value, unit, data_source) VALUES (?, ?, 1, 'default', ?, ?, ?, ?, ?, ?, ?)`,
                [`${id}_v1`, id, period, processId, eventType, param, value, unit, source]
            );
        });
    });

    // ─── Emission Blocks (formula-based process emissions) ───
    // Creates blocks from templates for the same aluminium demo data
    PROCESS_EVENTS_MONTHS.forEach((m, idx) => {
        const i = idx + 1;
        // Anode Consumption CO₂
        execute(
            `INSERT INTO emission_blocks (id, installation_id, period, process_id, template_id, name, output_gas, formula, formula_display, parameters, source)
             VALUES (?, 'default', ?, 'P01', 'al_anode', 'Anode Consumption CO₂', 'CO2', ?, ?, ?, ?)`,
            [
                `eb_anode_${i}`, m.period,
                'production * anode_rate / 1000 * (carbon - sulfur - ash) * 44 / 12',
                'Production × Anode Rate ÷ 1000 × (C − S − Ash) × 44/12',
                JSON.stringify([
                    { key: 'production', label: 'Metal Production', unit: 't', value: m.metalProd },
                    { key: 'anode_rate', label: 'Net Anode Consumption', unit: 'kg/t Al', value: 420 },
                    { key: 'carbon', label: 'Carbon Fraction', unit: 'fraction', value: 0.95 },
                    { key: 'sulfur', label: 'Sulfur Fraction', unit: 'fraction', value: 0.02 },
                    { key: 'ash', label: 'Ash Fraction', unit: 'fraction', value: 0.01 },
                ]),
                'IPCC 2006 Vol.3 Ch.4',
            ]
        );
        // PFC — CF₄
        execute(
            `INSERT INTO emission_blocks (id, installation_id, period, process_id, template_id, name, output_gas, formula, formula_display, parameters, source)
             VALUES (?, 'default', ?, 'P01', 'al_pfc_cf4', 'PFC — CF₄ Emissions', 'CF4', ?, ?, ?, ?)`,
            [
                `eb_cf4_${i}`, m.period,
                'production * aem * slope',
                'Production × AEM × Slope Factor',
                JSON.stringify([
                    { key: 'production', label: 'Metal Production', unit: 't', value: m.metalProd },
                    { key: 'aem', label: 'Anode Effect Minutes', unit: 'min/cell·day', value: 0.25 },
                    { key: 'slope', label: 'CF₄ Slope Factor', unit: 't CF₄/(t Al × AEM)', value: 0.00006 },
                ]),
                'IPCC 2006 Vol.3 Ch.4',
            ]
        );
        // PFC — C₂F₆
        execute(
            `INSERT INTO emission_blocks (id, installation_id, period, process_id, template_id, name, output_gas, formula, formula_display, parameters, source)
             VALUES (?, 'default', ?, 'P01', 'al_pfc_c2f6', 'PFC — C₂F₆ Emissions', 'C2F6', ?, ?, ?, ?)`,
            [
                `eb_c2f6_${i}`, m.period,
                'production * aem * slope * ratio',
                'Production × AEM × Slope × C₂F₆/CF₄ Ratio',
                JSON.stringify([
                    { key: 'production', label: 'Metal Production', unit: 't', value: m.metalProd },
                    { key: 'aem', label: 'Anode Effect Min', unit: 'min/cell·day', value: 0.25 },
                    { key: 'slope', label: 'CF₄ Slope Factor', unit: 't CF₄/(t Al × AEM)', value: 0.00006 },
                    { key: 'ratio', label: 'C₂F₆/CF₄ Ratio', unit: 'ratio', value: 0.1 },
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
        `INSERT INTO cbam_settings (id, basis, scope, cert_price_scenario, al_price_scenario, carbon_credit_eligible, carbon_credit_scenario, imported_qty, cn_code, good_category) VALUES ('default', 'ACTUAL', 'DIRECT_ONLY', 'MID', 'MID', 1, 'HIGH', 110000, '7601', 'Aluminium')`
    );

    // ─── Allocation Settings ─────────────────────────
    execute(
        `INSERT INTO allocation_settings (id, method, treat_residue_as_waste) VALUES ('default', 'mass', 1)`
    );

    console.log('[Seed] Demo data populated successfully');
}
