// ═══════════════════════════════════════════════════════════════
//  Demo Data Seed
//  Populates SQLite with data matching the Excel prototype
//  (MRV2_Aluminium_Ingots_Prototype)
// ═══════════════════════════════════════════════════════════════

import { execute, query, generateId } from './database.js';

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
        ['default', 'KazAluminium Smelter (Demo)', 'KZ', '2025-01', '2025-03']
    );

    // ─── Boundaries ──────────────────────────────────
    const boundaries = [
        ['b1', 'Electrolysis potlines', 1, 'Hall-Heroult cells — primary aluminium reduction'],
        ['b2', 'Casting & ingot line', 1, 'Holding furnaces, casting wheels'],
        ['b3', 'Off-gas collection & dry scrubbing', 1, 'Fans, sorbent, dust handling'],
        ['b4', 'Fuel combustion (boilers/heaters)', 1, 'On-site auxiliary heat'],
        ['b5', 'Anode baking plant', 0, 'Not required for CBAM ingots (simple good)'],
        ['b6', 'Grid electricity import', 1, 'Purchased electricity from national grid'],
        ['b7', 'On-site vehicles', 1, 'Forklifts and trucks'],
    ];
    boundaries.forEach(([id, name, included, notes]) => {
        execute('INSERT INTO boundaries (id, installation_id, name, included, notes) VALUES (?, ?, ?, ?, ?)',
            [id, 'default', name, included, notes]);
    });

    // ─── Processes ───────────────────────────────────
    const processes = [
        ['P01', 'Electrolysis (Hall-Héroult)', 'Primary aluminium production — includes anode consumption + PFC events', 'Core'],
        ['P02', 'Casting & Ingot Production', 'Holding furnaces, casting line, packaging', 'Core'],
        ['P03', 'Off-gas Collection & Dry Scrubbing', 'Fans, sorbent, dust handling', 'Support'],
        ['P04', 'Utilities (site services)', 'Compressed air, pumps, HVAC, lighting', 'Support'],
    ];
    processes.forEach(([id, name, desc, cat]) => {
        execute('INSERT INTO processes (id, installation_id, name, description, category, active) VALUES (?, ?, ?, ?, ?, 1)',
            [id, 'default', name, desc, cat]);
    });

    // ─── Fuel Entries (from Excel Sheet 03) ──────────
    // Natural gas: P02 casting furnaces, 120,000 Nm³/month
    // For our model we convert to mass: 120000 Nm³ × 0.717 kg/Nm³ ≈ 86 t
    // But Excel uses Nm³ directly with NCV in GJ/Nm³
    // We'll store in tonnes with NCV in GJ/t for consistency with our engine
    const fuelEntries = [
        // P02: Natural gas — casting furnaces
        ['f1', '2025-01', 'P02', 'natural_gas', 500, 't', 'Gas meter report', 'Casting furnaces'],
        ['f2', '2025-02', 'P02', 'natural_gas', 500, 't', 'Gas meter report', 'Casting furnaces'],
        ['f3', '2025-03', 'P02', 'natural_gas', 500, 't', 'Gas meter report', 'Casting furnaces'],
        // P04: Diesel — site vehicles / backup genset
        ['f4', '2025-01', 'P04', 'diesel', 80, 't', 'Fuel ledger', 'Site vehicles / backup genset'],
        ['f5', '2025-02', 'P04', 'diesel', 80, 't', 'Fuel ledger', 'Site vehicles / backup genset'],
        ['f6', '2025-03', 'P04', 'diesel', 80, 't', 'Fuel ledger', 'Site vehicles / backup genset'],
    ];
    fuelEntries.forEach(([id, period, processId, fuelType, qty, unit, evidence, notes]) => {
        execute(
            `INSERT INTO fuel_entries (version_id, stable_id, version_number, period, process_id, fuel_type_id, quantity, unit, evidence, notes) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
            [`${id}_v1`, id, period, processId, fuelType, qty, unit, evidence, notes]
        );
    });

    // ─── Electricity Entries (from Excel Sheet 04) ───
    // EF for KZ grid: 0.985 tCO₂e/MWh (national default)
    const electricityEntries = [
        ['e1', '2025-01', 'P01', 175482.02, 'KZ', 0.985, 'Potline DC power'],
        ['e2', '2025-01', 'P02', 7508.5, 'KZ', 0.985, 'Casting line'],
        ['e3', '2025-01', 'P03', 4509.37, 'KZ', 0.985, 'Fans/scrubber'],
        ['e4', '2025-01', 'P04', 3435.19, 'KZ', 0.985, 'Utilities'],
        ['e5', '2025-02', 'P01', 177549.4, 'KZ', 0.985, 'Potline DC power'],
        ['e6', '2025-02', 'P02', 7615.37, 'KZ', 0.985, 'Casting line'],
        ['e7', '2025-02', 'P03', 4577.78, 'KZ', 0.985, 'Fans/scrubber'],
        ['e8', '2025-02', 'P04', 3486.81, 'KZ', 0.985, 'Utilities'],
        ['e9', '2025-03', 'P01', 179616.3, 'KZ', 0.985, 'Potline DC power'],
        ['e10', '2025-03', 'P02', 7722.43, 'KZ', 0.985, 'Casting line'],
        ['e11', '2025-03', 'P03', 4646.36, 'KZ', 0.985, 'Fans/scrubber'],
        ['e12', '2025-03', 'P04', 3538.55, 'KZ', 0.985, 'Utilities'],
    ];
    electricityEntries.forEach(([id, period, processId, mwh, country, ef, notes]) => {
        execute(
            `INSERT INTO electricity_entries (version_id, stable_id, version_number, period, process_id, mwh, grid_country, ef, ef_override, evidence, notes) VALUES (?, ?, 1, ?, ?, ?, ?, ?, 0, ?, ?)`,
            [`${id}_v1`, id, period, processId, mwh, country, ef, `Power meter — ${notes}`, notes]
        );
    });

    // ─── Process Events (legacy — from Excel Sheet 03B) ──────
    // Per-month anode consumption + PFC parameters for P01 (Electrolysis)
    const months = [
        { period: '2025-01', metalProd: 15200 },
        { period: '2025-02', metalProd: 15400 },
        { period: '2025-03', metalProd: 15600 },
    ];

    months.forEach((m, idx) => {
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
                `INSERT INTO process_events (version_id, stable_id, version_number, period, process_id, event_type, parameter, value, unit, data_source) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
                [`${id}_v1`, id, period, processId, eventType, param, value, unit, source]
            );
        });
    });

    // ─── Emission Blocks (formula-based process emissions) ───
    // Creates blocks from templates for the same aluminium demo data
    months.forEach((m, idx) => {
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
    execute(
        `INSERT INTO products (id, installation_id, name, cn_code, is_residue) VALUES (?, ?, ?, ?, ?)`,
        ['pr1', 'default', 'Aluminium ingots (unwrought)', '7601 10 00', 0]
    );
    execute(
        `INSERT INTO products (id, installation_id, name, cn_code, is_residue) VALUES (?, ?, ?, ?, ?)`,
        ['pr2', 'default', 'Dross / skimmings', '', 1]
    );

    // ─── Production Output ───────────────────────────
    // From Excel Sheet 08: monthly ingot output
    const prodOutputs = [
        ['po1', '2025-01', 'pr1', 'P02', 14980],
        ['po2', '2025-01', 'pr2', 'P02', 245],
        ['po3', '2025-02', 'pr1', 'P02', 15160],
        ['po4', '2025-02', 'pr2', 'P02', 250],
        ['po5', '2025-03', 'pr1', 'P02', 15340],
        ['po6', '2025-03', 'pr2', 'P02', 255],
    ];
    prodOutputs.forEach(([id, period, productId, processId, qty]) => {
        execute(
            `INSERT INTO production_output (version_id, stable_id, version_number, period, product_id, process_id, quantity, data_source) VALUES (?, ?, 1, ?, ?, ?, ?, 'Production report')`,
            [`${id}_v1`, id, period, productId, processId, qty]
        );
    });

    // ─── Emission Factor Library ─────────────────────
    // Per-gas factors in kg/TJ (IPCC 2006)
    const efData = [
        // Natural Gas
        ['ef_ng_co2', 'natural_gas', 'CO2', 56100, 'kg/TJ', 48.0, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.2'],
        ['ef_ng_ch4', 'natural_gas', 'CH4', 5, 'kg/TJ', 48.0, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.2'],
        ['ef_ng_n2o', 'natural_gas', 'N2O', 0.1, 'kg/TJ', 48.0, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.2'],
        // Diesel
        ['ef_diesel_co2', 'diesel', 'CO2', 74100, 'kg/TJ', 43.0, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.2'],
        ['ef_diesel_ch4', 'diesel', 'CH4', 3, 'kg/TJ', 43.0, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.2'],
        ['ef_diesel_n2o', 'diesel', 'N2O', 0.6, 'kg/TJ', 43.0, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.2'],
        // Coke
        ['ef_coke_co2', 'coke', 'CO2', 107000, 'kg/TJ', 28.2, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.3'],
        ['ef_coke_ch4', 'coke', 'CH4', 1, 'kg/TJ', 28.2, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.3'],
        ['ef_coke_n2o', 'coke', 'N2O', 1.5, 'kg/TJ', 28.2, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.3'],
    ];
    efData.forEach(([id, fuel, gas, val, unit, ncv, ncvUnit, source]) => {
        execute(
            `INSERT INTO emission_factors (id, fuel_type, gas, ef_value, ef_unit, ncv, ncv_unit, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, fuel, gas, val, unit, ncv, ncvUnit, source]
        );
    });

    // ─── GWP Set ─────────────────────────────────────
    execute(
        `INSERT INTO gwp_sets (id, name, co2, ch4, n2o, cf4, c2f6) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['AR6', 'IPCC AR6 (100-yr)', 1, 29.8, 273, 7380, 12400]
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
