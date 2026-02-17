// ═══════════════════════════════════════════════════════════════
//  Multi-Gas Emission Engine
//  TJ normalization, per-gas calculations, lineage tracking
//  Replaces the simple calcFuelEmissions() from referenceData.js
// ═══════════════════════════════════════════════════════════════

import { evaluate } from './formulaEvaluator.js';

/**
 * Default emission factors (kg/TJ) — IPCC 2006 / 2019 Refinement
 * These are used when factors aren't in the database yet.
 * Source: IPCC 2006 Guidelines, Volume 2, Chapter 2, Table 2.2
 * 
 * NCV values for unit conversion:
 *   Natural gas — 48.0 GJ/t (mass) or 0.03412 GJ/Nm³ (volume)
 *   Diesel      — 43.0 GJ/t (mass) or  43.0 GJ/kL (volume)
 *   Coke        — 28.2 GJ/t (mass)
 *   LPG         — 47.3 GJ/t (mass)
 *   Fuel Oil    — 40.4 GJ/t (mass)
 */
export const DEFAULT_EMISSION_FACTORS = {
    natural_gas: {
        name: 'Natural Gas',
        ncv: 48.0,        // GJ/t
        ncvUnit: 'GJ/t',
        unitFamily: 'mass',
        defaultUnit: 't',
        efCO2: 56100,     // kg CO₂ per TJ
        efCH4: 5,         // kg CH₄ per TJ
        efN2O: 0.1,       // kg N₂O per TJ
        source: 'IPCC 2006 Vol.2 Ch.2 Table 2.2',
    },
    diesel: {
        name: 'Diesel',
        ncv: 43.0,
        ncvUnit: 'GJ/t',
        unitFamily: 'mass',
        defaultUnit: 't',
        efCO2: 74100,
        efCH4: 3,
        efN2O: 0.6,
        source: 'IPCC 2006 Vol.2 Ch.2 Table 2.2',
    },
    coke: {
        name: 'Coke',
        ncv: 28.2,
        ncvUnit: 'GJ/t',
        unitFamily: 'mass',
        defaultUnit: 't',
        efCO2: 107000,
        efCH4: 1,
        efN2O: 1.5,
        source: 'IPCC 2006 Vol.2 Ch.2 Table 2.3 (anode/carbon)',
    },
    fuel_oil: {
        name: 'Fuel Oil (Heavy)',
        ncv: 40.4,
        ncvUnit: 'GJ/t',
        unitFamily: 'mass',
        defaultUnit: 't',
        efCO2: 77400,
        efCH4: 3,
        efN2O: 0.6,
        source: 'IPCC 2006 Vol.2 Ch.2 Table 2.2',
    },
    lpg: {
        name: 'LPG',
        ncv: 47.3,
        ncvUnit: 'GJ/t',
        unitFamily: 'mass',
        defaultUnit: 't',
        efCO2: 63100,
        efCH4: 1,
        efN2O: 0.1,
        source: 'IPCC 2006 Vol.2 Ch.2 Table 2.2',
    },
    custom: {
        name: 'Other (custom)',
        ncv: 0,
        ncvUnit: 'GJ/t',
        unitFamily: 'mass',
        defaultUnit: 't',
        efCO2: 0,
        efCH4: 0,
        efN2O: 0,
        source: 'User-defined',
    },
};

/**
 * Default GWP values — EU CBAM (Table 6, Annex II, Regulation 2025/2547)
 * Supersedes IPCC AR6 values for CBAM compliance.
 */
export const GWP_AR6 = {
    id: 'EU_CBAM_2025',
    name: 'EU CBAM 2025/2547',
    CO2: 1,
    CH4: 29.8,
    N2O: 265,
    CF4: 6630,
    C2F6: 11100,
};

// ─── Core Calculation Functions ──────────────────────────────

/**
 * Calculate combustion emissions for a single fuel entry.
 * Uses TJ normalization per IPCC methodology.
 * 
 * @param {Object} entry - Fuel entry 
 * @param {Object} factors - Emission factors (or null to use defaults)
 * @param {Object} gwp - GWP set (default: AR6)
 * @returns {Object} { energyTJ, co2, ch4, n2o, co2e, lineage }
 */
export function calcCombustionEmissions(entry, factors = null, gwp = GWP_AR6) {
    const fuelDef = factors || DEFAULT_EMISSION_FACTORS[entry.fuel_type_id || entry.fuelTypeId] || DEFAULT_EMISSION_FACTORS.custom;

    // Allow custom overrides from the entry itself
    const ncv = entry.custom_ncv || entry.customNcv || fuelDef.ncv;
    const efCO2 = entry.custom_ef_co2 || entry.customEfCo2 || fuelDef.efCO2;
    const efCH4 = entry.custom_ef_ch4 || entry.customEfCh4 || fuelDef.efCH4;
    const efN2O = entry.custom_ef_n2o || entry.customEfN2o || fuelDef.efN2O;

    const quantity = Number(entry.quantity) || 0;

    // Step 1: Normalize to Energy (TJ)
    // Energy_GJ = quantity × NCV
    // Energy_TJ = Energy_GJ / 1000
    const energyGJ = quantity * ncv;
    const energyTJ = energyGJ / 1000;

    // Step 2: Calculate gas masses (tonnes)
    // Mass_t = Energy_TJ × EF_kg_per_TJ / 1000
    const co2Tonnes = energyTJ * efCO2 / 1000;
    const ch4Tonnes = energyTJ * efCH4 / 1000;
    const n2oTonnes = energyTJ * efN2O / 1000;

    // Step 3: Convert to CO₂ equivalent
    const co2e = co2Tonnes * gwp.CO2 + ch4Tonnes * gwp.CH4 + n2oTonnes * gwp.N2O;

    // Build lineage for traceability
    const lineage = {
        type: 'combustion',
        fuelType: fuelDef.name || entry.fuel_type_id || entry.fuelTypeId,
        inputs: {
            quantity: { value: quantity, unit: entry.unit || 't' },
            ncv: { value: ncv, unit: fuelDef.ncvUnit || 'GJ/t', source: entry.custom_ncv ? 'user_override' : 'default' },
        },
        conversion: {
            energyGJ: { value: energyGJ, formula: 'quantity × NCV' },
            energyTJ: { value: energyTJ, formula: 'Energy_GJ / 1000' },
        },
        factors: {
            efCO2: { value: efCO2, unit: 'kg/TJ', source: entry.custom_ef_co2 ? 'user_override' : fuelDef.source },
            efCH4: { value: efCH4, unit: 'kg/TJ', source: entry.custom_ef_ch4 ? 'user_override' : fuelDef.source },
            efN2O: { value: efN2O, unit: 'kg/TJ', source: entry.custom_ef_n2o ? 'user_override' : fuelDef.source },
        },
        gwp: {
            set: gwp.name || gwp.id,
            CH4: gwp.CH4,
            N2O: gwp.N2O,
        },
        outputs: {
            co2: { value: co2Tonnes, unit: 't CO₂' },
            ch4: { value: ch4Tonnes, unit: 't CH₄' },
            n2o: { value: n2oTonnes, unit: 't N₂O' },
            co2e: { value: co2e, unit: 't CO₂e' },
        },
    };

    return {
        energyTJ,
        co2: co2Tonnes,
        ch4: ch4Tonnes,
        n2o: n2oTonnes,
        co2e,
        lineage,
    };
}

/**
 * Calculate electricity (indirect) emissions.
 * 
 * @param {Object} entry - Electricity entry { mwh, ef }
 * @returns {Object} { co2e, lineage }
 */
export function calcElectricityEmissions(entry) {
    const mwh = Number(entry.mwh) || 0;
    const ef = Number(entry.ef) || 0;
    const co2e = mwh * ef;  // tCO₂e/MWh × MWh = tCO₂e

    const lineage = {
        type: 'electricity',
        inputs: {
            mwh: { value: mwh, unit: 'MWh' },
            ef: { value: ef, unit: 'tCO₂e/MWh', source: entry.ef_override || entry.efOverride ? 'user_override' : `grid_default_${entry.grid_country || entry.gridCountry}` },
        },
        outputs: {
            co2e: { value: co2e, unit: 't CO₂e', formula: 'MWh × EF' },
        },
    };

    return { co2e, lineage };
}

/**
 * Calculate anode consumption CO₂ (aluminium-specific).
 * Formula: production × anode_rate × (C - S - ash) × 44/12
 * 
 * @param {Object} params - Process event parameters for a period
 * @returns {Object} { co2, lineage }
 */
export function calcAnodeEmissions(params) {
    const production = Number(params.metalProduction) || 0;           // t Al
    const anodeRate = Number(params.netAnodeConsumption) || 0;        // kg/t Al → convert to t/t Al
    const carbonFraction = Number(params.anodeCarbonFraction) || 0;   // mass fraction
    const sulfurFraction = Number(params.anodeSulfurFraction) || 0;
    const ashFraction = Number(params.anodeAshFraction) || 0;

    // Anode CO₂ = production(t) × anodeRate(kg/t) / 1000 × (C - S - ash) × 44/12
    const anodeConsumptionT = production * anodeRate / 1000;
    const effectiveCarbon = carbonFraction - sulfurFraction - ashFraction;
    const co2 = anodeConsumptionT * effectiveCarbon * (44 / 12);

    const lineage = {
        type: 'anode_consumption',
        inputs: {
            metalProduction: { value: production, unit: 't' },
            netAnodeConsumption: { value: anodeRate, unit: 'kg/t Al' },
            carbonFraction: { value: carbonFraction, unit: 'fraction' },
            sulfurFraction: { value: sulfurFraction, unit: 'fraction' },
            ashFraction: { value: ashFraction, unit: 'fraction' },
        },
        conversion: {
            anodeConsumptionT: { value: anodeConsumptionT, formula: 'production × anodeRate / 1000' },
            effectiveCarbon: { value: effectiveCarbon, formula: 'C - S - ash' },
        },
        outputs: {
            co2: { value: co2, unit: 't CO₂', formula: 'anodeConsumption × effectiveCarbon × 44/12' },
        },
    };

    return { co2, lineage };
}

/**
 * Calculate PFC emissions (CF₄ and C₂F₆) from anode effects.
 * Formula: CF4 = production × AEM × slopeFactor
 *          C2F6 = CF4 × ratio
 * 
 * @param {Object} params - Process event parameters
 * @param {Object} gwp - GWP set
 * @returns {Object} { cf4, c2f6, co2e, lineage }
 */
export function calcPFCEmissions(params, gwp = GWP_AR6) {
    const production = Number(params.metalProduction) || 0;
    const aem = Number(params.aemMinutes) || 0;           // min/cell-day
    const slopeFactor = Number(params.cf4SlopeFactor) || 0; // t CF4 per (t Al × AEM)
    const ratio = Number(params.c2f6Cf4Ratio) || 0;       // C₂F₆/CF₄ ratio

    const cf4 = production * aem * slopeFactor;
    const c2f6 = cf4 * ratio;
    const co2e = cf4 * gwp.CF4 + c2f6 * gwp.C2F6;

    const lineage = {
        type: 'pfc',
        inputs: {
            metalProduction: { value: production, unit: 't' },
            aemMinutes: { value: aem, unit: 'min/cell-day' },
            cf4SlopeFactor: { value: slopeFactor, unit: 't CF₄ / (t Al × AEM)' },
            c2f6Cf4Ratio: { value: ratio, unit: 'ratio' },
        },
        gwp: {
            set: gwp.name || gwp.id,
            CF4: gwp.CF4,
            C2F6: gwp.C2F6,
        },
        outputs: {
            cf4: { value: cf4, unit: 't CF₄' },
            c2f6: { value: c2f6, unit: 't C₂F₆' },
            co2e: { value: co2e, unit: 't CO₂e', formula: 'CF4×GWP_CF4 + C2F6×GWP_C2F6' },
        },
    };

    return { cf4, c2f6, co2e, lineage };
}

// ─── Generic Emission Block Calculation ──────────────────────

/**
 * Calculate emissions from a formula-based emission block.
 * Uses the safe formula evaluator — no eval().
 * 
 * @param {Object} block - { formula, outputGas, parameters: [{ key, value }] }
 * @param {Object} gwp - GWP set
 * @returns {{ tonnes: number, co2e: number, gas: string, error: string|null, lineage: Object }}
 */
export function calcEmissionBlock(block, gwp = GWP_AR6) {
    if (!block.formula || !block.formula.trim()) {
        return { tonnes: 0, co2e: 0, gas: block.outputGas || 'CO2', error: null, lineage: {} };
    }

    // Build variable map from parameters
    const variables = {};
    (block.parameters || []).forEach(p => {
        variables[p.key] = p.value ?? p.defaultValue ?? 0;
    });

    const { value, error } = evaluate(block.formula, variables);

    if (error) {
        return { tonnes: 0, co2e: 0, gas: block.outputGas || 'CO2', error, lineage: {} };
    }

    const gas = block.outputGas || 'CO2';
    const gwpFactor = gwp[gas] || 1;
    const tonnes = value || 0;
    const co2e = tonnes * gwpFactor;

    return {
        tonnes,
        co2e,
        gas,
        error: null,
        lineage: {
            formula: block.formula,
            variables,
            rawResult: value,
            gas,
            gwpFactor,
            co2e,
            source: block.source || 'User-defined',
        },
    };
}

// ─── Aggregation ─────────────────────────────────────────────

/**
 * Calculate total emissions for an installation for a given period.
 * Aggregates combustion + electricity + process emissions across all processes.
 * Supports both legacy processEvents AND new emissionBlocks.
 * 
 * @param {Object} data - { fuels, electricity, processEvents, emissionBlocks, gwp }
 * @returns {Object} Comprehensive emissions result with lineage
 */
export function calculateTotalEmissions({ fuels = [], electricity = [], processEvents = [], emissionBlocks = [], gwp = GWP_AR6 }) {
    // ─── Combustion (Scope 1 — Direct) ───
    const combustionResults = fuels.map(entry => ({
        entryId: entry.stable_id || entry.stableId || entry.id,
        processId: entry.process_id || entry.processId,
        period: entry.period,
        ...calcCombustionEmissions(entry, null, gwp),
    }));

    const totalCombustion = {
        energyTJ: combustionResults.reduce((s, r) => s + r.energyTJ, 0),
        co2: combustionResults.reduce((s, r) => s + r.co2, 0),
        ch4: combustionResults.reduce((s, r) => s + r.ch4, 0),
        n2o: combustionResults.reduce((s, r) => s + r.n2o, 0),
        co2e: combustionResults.reduce((s, r) => s + r.co2e, 0),
    };

    // ─── Electricity (Scope 2 — Indirect) ───
    const electricityResults = electricity.map(entry => ({
        entryId: entry.stable_id || entry.stableId || entry.id,
        processId: entry.process_id || entry.processId,
        period: entry.period,
        ...calcElectricityEmissions(entry),
    }));

    const totalElectricity = {
        co2e: electricityResults.reduce((s, r) => s + r.co2e, 0),
    };

    // ─── Process Events (Scope 1 — Direct: Legacy Anode + PFC) ───
    const eventsByPeriod = {};
    processEvents.forEach(evt => {
        const key = `${evt.period}_${evt.process_id || evt.processId}`;
        if (!eventsByPeriod[key]) eventsByPeriod[key] = {};
        eventsByPeriod[key][evt.parameter] = evt.value;
        eventsByPeriod[key]._period = evt.period;
        eventsByPeriod[key]._processId = evt.process_id || evt.processId;
    });

    let totalAnodeCO2 = 0;
    let totalPFCCO2e = 0;
    const anodeResults = [];
    const pfcResults = [];

    Object.values(eventsByPeriod).forEach(params => {
        const mapped = {
            metalProduction: params['metal_production'] || params['metalProduction'] || 0,
            netAnodeConsumption: params['net_anode_consumption'] || params['netAnodeConsumption'] || 0,
            anodeCarbonFraction: params['anode_carbon_fraction'] || params['anodeCarbonFraction'] || 0,
            anodeSulfurFraction: params['anode_sulfur_fraction'] || params['anodeSulfurFraction'] || 0,
            anodeAshFraction: params['anode_ash_fraction'] || params['anodeAshFraction'] || 0,
            aemMinutes: params['aem_minutes'] || params['aemMinutes'] || 0,
            cf4SlopeFactor: params['cf4_slope_factor'] || params['cf4SlopeFactor'] || 0,
            c2f6Cf4Ratio: params['c2f6_cf4_ratio'] || params['c2f6Cf4Ratio'] || 0,
        };

        if (mapped.netAnodeConsumption > 0) {
            const anode = calcAnodeEmissions(mapped);
            totalAnodeCO2 += anode.co2;
            anodeResults.push({ period: params._period, processId: params._processId, ...anode });
        }

        if (mapped.aemMinutes > 0) {
            const pfc = calcPFCEmissions(mapped, gwp);
            totalPFCCO2e += pfc.co2e;
            pfcResults.push({ period: params._period, processId: params._processId, ...pfc });
        }
    });

    // ─── Emission Blocks (Scope 1 — Direct: Generic formula-based) ───
    let totalBlockCO2e = 0;
    const blockResults = emissionBlocks.map(block => {
        const result = calcEmissionBlock(block, gwp);
        totalBlockCO2e += result.co2e;
        return {
            blockId: block.id,
            name: block.name,
            period: block.period,
            processId: block.processId,
            gas: result.gas,
            tonnes: result.tonnes,
            co2e: result.co2e,
            error: result.error,
            lineage: result.lineage,
        };
    });

    // ─── Totals ───
    // Emission blocks replace legacy process events for direct emissions
    // If blocks exist, use them instead of legacy; otherwise fall back to legacy
    const useBlocks = emissionBlocks.length > 0;
    const processDirectCO2e = useBlocks
        ? totalBlockCO2e
        : (totalAnodeCO2 + totalPFCCO2e);

    const totalDirect = totalCombustion.co2e + processDirectCO2e;
    const totalIndirect = totalElectricity.co2e;
    const totalCO2e = totalDirect + totalIndirect;

    return {
        combustion: {
            entries: combustionResults,
            totals: totalCombustion,
        },
        electricity: {
            entries: electricityResults,
            totals: totalElectricity,
        },
        anode: {
            entries: anodeResults,
            totalCO2: useBlocks ? 0 : totalAnodeCO2,
        },
        pfc: {
            entries: pfcResults,
            totalCO2e: useBlocks ? 0 : totalPFCCO2e,
        },
        emissionBlocks: {
            entries: blockResults,
            totalCO2e: totalBlockCO2e,
        },
        summary: {
            directCO2e: totalDirect,
            indirectCO2e: totalIndirect,
            totalCO2e,
            combustionCO2e: totalCombustion.co2e,
            anodeCO2: useBlocks ? 0 : totalAnodeCO2,
            pfcCO2e: useBlocks ? 0 : totalPFCCO2e,
            blocksCO2e: totalBlockCO2e,
            electricityCO2e: totalElectricity.co2e,
        },
        gwpSet: gwp,
    };
}

/**
 * Calculate PCF (Product Carbon Footprint).
 * 
 * @param {Object} emissions - Result from calculateTotalEmissions
 * @param {Array} products - Product list
 * @param {Object} allocationSettings - { method, treatResidueAsWaste }
 * @returns {Object} PCF results per product
 */
export function calculatePCF(emissions, products, allocationSettings = { method: 'mass', treatResidueAsWaste: true }) {
    // Filter non-residue products (or all, depending on settings)
    const allocatableProducts = allocationSettings.treatResidueAsWaste
        ? products.filter(p => !(p.is_residue || p.isResidue))
        : products;

    const totalOutput = allocatableProducts.reduce((s, p) => s + (Number(p.quantity) || 0), 0);

    return allocatableProducts.map(product => {
        const quantity = Number(product.quantity) || 0;
        const share = totalOutput > 0 ? quantity / totalOutput : 0;

        const allocatedDirect = emissions.summary.directCO2e * share;
        const allocatedIndirect = emissions.summary.indirectCO2e * share;
        const allocatedTotal = allocatedDirect + allocatedIndirect;

        const pcf = quantity > 0 ? allocatedTotal / quantity : 0;
        const pcfDirect = quantity > 0 ? allocatedDirect / quantity : 0;
        const pcfIndirect = quantity > 0 ? allocatedIndirect / quantity : 0;

        return {
            productId: product.id,
            productName: product.name,
            cnCode: product.cn_code || product.cnCode,
            quantity,
            share,
            allocatedDirect,
            allocatedIndirect,
            allocatedTotal,
            pcf,
            pcfDirect,
            pcfIndirect,
        };
    });
}
