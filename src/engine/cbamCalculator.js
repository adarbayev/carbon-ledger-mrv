// ═══════════════════════════════════════════════════════════════
//  CBAM Calculator Engine
//  Replicates Excel Tab 12 (CBAM_Calc) logic
// ═══════════════════════════════════════════════════════════════

import {
    CBAM_PHASE_IN,
    CBAM_CERT_PRICE,
    KZ_ETS_PRICE,
    AL_PRICE_FORECAST,
    getMarkupSchedule,
    getKzDefault,
    getDefaultScope,
} from '../data/cbamReferenceData';

/**
 * Calculate a full CBAM projection (2026-2034).
 *
 * @param {Object} config
 * @param {string} config.basis           — 'ACTUAL' | 'DEFAULT'
 * @param {string} config.scope           — 'DIRECT_ONLY' | 'TOTAL'
 * @param {string} config.certPriceScenario — 'LOW' | 'MID' | 'HIGH'
 * @param {string} config.alPriceScenario   — 'LOW' | 'MID' | 'HIGH'
 * @param {boolean} config.carbonCreditEligible — KZ ETS deduction?
 * @param {string} config.carbonCreditScenario  — 'NONE' | 'LOW' | 'MID' | 'HIGH'
 * @param {number} config.importedQty     — Annual import volume (tonnes)
 * @param {string} config.cnCode          — CN code for default value lookup
 * @param {string} config.goodCategory    — Sector name for scope/markup rules
 * @param {number} config.seeDirect       — Actual direct SEE (t CO₂/t product)
 * @param {number} config.seeIndirect     — Actual indirect SEE
 * @returns {Object} { rows: Array<ProjectionRow>, totals: ProjectionTotals }
 */
export function calculateCBAMProjection(config) {
    const {
        basis = 'ACTUAL',
        scope,
        certPriceScenario = 'MID',
        alPriceScenario = 'MID',
        carbonCreditEligible = true,
        carbonCreditScenario = 'HIGH',
        importedQty = 0,
        cnCode = '',
        goodCategory = 'Aluminium',
        seeDirect = 0,
        seeIndirect = 0,
    } = config;

    const effectiveScope = scope || getDefaultScope(goodCategory);
    const markupSchedule = getMarkupSchedule(goodCategory);
    const defaultEntry = getKzDefault(cnCode);

    const rows = CBAM_PHASE_IN.map((phaseIn, i) => {
        const year = phaseIn.year;

        // Markup for default values
        const markupRow = markupSchedule.find(m => m.year === year);
        const markup = markupRow ? markupRow.rate : 0.30;

        // Emission intensity (t CO₂e / t product)
        let intensity;
        if (basis === 'ACTUAL') {
            intensity = effectiveScope === 'DIRECT_ONLY' ? seeDirect : (seeDirect + seeIndirect);
        } else {
            // DEFAULT — use official EU default values with markup
            if (defaultEntry) {
                const baseValue = effectiveScope === 'DIRECT_ONLY'
                    ? defaultEntry.direct
                    : (defaultEntry.total || defaultEntry.direct);
                intensity = baseValue * (1 + markup);
            } else {
                intensity = 0;
            }
        }

        // Embedded CO₂ in import volume
        const embeddedCO2 = importedQty * intensity;

        // Payable emissions (after free allocation phase-out)
        const payableEmissions = embeddedCO2 * phaseIn.payableShare;

        // Certificate price (€/tCO₂)
        const certPriceRow = CBAM_CERT_PRICE.find(r => r.year === year);
        const certPrice = certPriceRow
            ? certPriceRow[certPriceScenario.toLowerCase()] || certPriceRow.mid
            : 0;

        // Gross CBAM cost
        const grossCost = payableEmissions * certPrice;

        // KZ ETS deduction
        let kzEtsDeduction = 0;
        if (carbonCreditEligible && carbonCreditScenario !== 'NONE') {
            const kzRow = KZ_ETS_PRICE.find(r => r.year === year);
            if (kzRow) {
                const kzPrice = kzRow[carbonCreditScenario.toLowerCase()] || 0;
                const quotaShare = kzRow.quotaShare;
                // Deduction = MIN(certPrice, kzPrice) × (embeddedCO₂ × quotaShare)
                const effectiveKzPrice = Math.min(certPrice, kzPrice);
                kzEtsDeduction = effectiveKzPrice * embeddedCO2 * quotaShare;
            }
        }

        // Net CBAM cost
        const netCost = Math.max(0, grossCost - kzEtsDeduction);

        // Cost per tonne of product
        const costPerTonne = importedQty > 0 ? netCost / importedQty : 0;

        // Aluminium price reference
        const alPriceRow = AL_PRICE_FORECAST.find(r => r.year === year);
        const alPrice = alPriceRow
            ? alPriceRow[alPriceScenario.toLowerCase()] || alPriceRow.mid
            : 0;

        // CBAM cost as % of product price
        const costPctOfPrice = alPrice > 0 ? (costPerTonne / alPrice) * 100 : 0;

        return {
            year,
            importQty: importedQty,
            markup,
            intensity: Math.round(intensity * 1000) / 1000,
            embeddedCO2: Math.round(embeddedCO2),
            payableShare: phaseIn.payableShare,
            payableEmissions: Math.round(payableEmissions),
            certPrice,
            grossCost: Math.round(grossCost),
            kzEtsDeduction: Math.round(kzEtsDeduction),
            netCost: Math.round(netCost),
            costPerTonne: Math.round(costPerTonne * 100) / 100,
            alPrice,
            costPctOfPrice: Math.round(costPctOfPrice * 100) / 100,
        };
    });

    // Totals
    const totals = {
        totalEmbeddedCO2: rows.reduce((s, r) => s + r.embeddedCO2, 0),
        totalPayableEmissions: rows.reduce((s, r) => s + r.payableEmissions, 0),
        totalGrossCost: rows.reduce((s, r) => s + r.grossCost, 0),
        totalKzEtsDeduction: rows.reduce((s, r) => s + r.kzEtsDeduction, 0),
        totalNetCost: rows.reduce((s, r) => s + r.netCost, 0),
    };

    return {
        rows,
        totals,
        metadata: {
            defaultEntry,
            effectiveScope,
            goodCategory
        }
    };
}

/**
 * Compare multiple scenarios side-by-side.
 * Returns projections for each scenario variant.
 *
 * @param {Object} baseConfig — Base CBAM config
 * @param {Array<Object>} scenarios — [{ name, label, color, overrides }]
 * @returns {Array<Object>} — [{ name, label, color, projection }]
 */
export function compareScenarios(baseConfig, scenarios) {
    return scenarios.map(scenario => {
        const config = { ...baseConfig, ...scenario.overrides };
        const projection = calculateCBAMProjection(config);
        return {
            name: scenario.name,
            label: scenario.label,
            color: scenario.color,
            projection,
        };
    });
}

/**
 * Pre-built scenario comparison: LOW / MID / HIGH cert prices.
 * Uses the same base config but varies certPriceScenario.
 */
export function compareCertPriceScenarios(baseConfig) {
    return compareScenarios(baseConfig, [
        { name: 'low', label: 'Low Carbon Price', color: '#22c55e', overrides: { certPriceScenario: 'LOW' } },
        { name: 'mid', label: 'Mid Carbon Price', color: '#f59e0b', overrides: { certPriceScenario: 'MID' } },
        { name: 'high', label: 'High Carbon Price', color: '#ef4444', overrides: { certPriceScenario: 'HIGH' } },
    ]);
}
