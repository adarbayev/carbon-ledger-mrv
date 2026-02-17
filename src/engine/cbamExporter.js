// ═══════════════════════════════════════════════════════════════
//  CBAM Communication Template Exporter
//  Generates structured data matching EU CBAM declaration format
//  Supports JSON and CSV export
// ═══════════════════════════════════════════════════════════════

import { calculateTotalEmissions, calculatePCF, GWP_AR6 } from './emissionEngine';

/**
 * Build a CBAM communication template object from app state.
 * 
 * @param {Object} state – Full app state
 * @returns {Object} CBAM communication template JSON
 */
export function buildCBAMTemplate(state) {
    const emissions = calculateTotalEmissions({
        fuels: state.activity.fuels,
        electricity: state.activity.electricity,
        processEvents: state.processEvents || [],
        emissionBlocks: state.emissionBlocks || [],
    });

    const pcf = calculatePCF(emissions, state.products, state.allocationSettings);

    const goods = pcf.filter(p => !(p.isResidue || p.isExcluded)).map(product => {
        return {
            productName: product.productName || product.name,
            cnCode: product.cnCode || '',
            productionQuantity: {
                value: product.quantity || 0,
                unit: 'tonnes',
            },
            embeddedEmissions: {
                direct: {
                    specific: round4(product.pcfDirect),
                    total: round2(product.pcfDirect * (product.quantity || 0)),
                    unit: 'tCO₂e/t product',
                },
                indirect: {
                    specific: round4(product.pcfIndirect),
                    total: round2(product.pcfIndirect * (product.quantity || 0)),
                    unit: 'tCO₂e/t product',
                },
                total: {
                    specific: round4(product.pcf),
                    total: round2(product.pcf * (product.quantity || 0)),
                    unit: 'tCO₂e/t product',
                },
            },
        };
    });

    return {
        communicationTemplate: {
            version: '1.0',
            generatedAt: new Date().toISOString(),
            reportingPeriod: {
                start: state.meta.periodStart,
                end: state.meta.periodEnd,
            },
            installation: {
                name: state.meta.installationName,
                country: state.meta.country,
                operatorName: 'Operator (to be filled)',
            },
            methodology: {
                gwpSet: GWP_AR6.id,
                gwpSetName: GWP_AR6.name,
                allocationMethod: state.allocationSettings?.method || 'mass',
                emissionFactorSource: 'IPCC 2006 / EU CBAM Regulation 2025/2547',
            },
            verification: {
                status: state.meta.workflowStatus || 'DRAFT',
                reviewerName: state.meta.reviewerName || '',
                reviewDate: state.meta.reviewDate || '',
                submitDate: state.meta.submitDate || '',
            },
            emissionsSummary: {
                directTotal: round2(emissions.summary.directCO2e),
                indirectTotal: round2(emissions.summary.indirectCO2e),
                grandTotal: round2(emissions.summary.totalCO2e),
                unit: 'tCO₂e',
                byGas: {
                    CO2: round2(emissions.combustion.totals.co2 + (emissions.process?.co2 || 0)),
                    CH4: round2(emissions.combustion.totals.ch4),
                    N2O: round2(emissions.combustion.totals.n2o),
                },
            },
            goods,
            activityData: {
                fuelCombustion: state.activity.fuels.map(f => ({
                    period: f.period,
                    fuelType: f.fuelTypeId,
                    quantity: f.quantity,
                    unit: f.unit,
                    source: f.source || 'manual',
                })),
                electricity: state.activity.electricity.map(e => ({
                    period: e.period,
                    mwh: e.mwh,
                    emissionFactor: e.ef,
                    source: e.source || 'manual',
                })),
                processEmissionBlocks: (state.emissionBlocks || []).map(b => ({
                    name: b.name,
                    outputGas: b.outputGas,
                    formula: b.formula,
                    parameters: b.parameters,
                })),
            },
        },
    };
}

/**
 * Export CBAM template as downloadable JSON file.
 */
export function downloadAsJSON(state) {
    const template = buildCBAMTemplate(state);
    const json = JSON.stringify(template, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    triggerDownload(blob, `cbam_communication_${state.meta.periodStart}_${state.meta.periodEnd}.json`);
}

/**
 * Export CBAM template as downloadable CSV file.
 */
export function downloadAsCSV(state) {
    const template = buildCBAMTemplate(state);
    const t = template.communicationTemplate;

    // Build CSV rows
    const rows = [
        ['CBAM Communication Template'],
        ['Generated', t.generatedAt],
        ['Installation', t.installation.name],
        ['Country', t.installation.country],
        ['Reporting Period', `${t.reportingPeriod.start} to ${t.reportingPeriod.end}`],
        ['Workflow Status', t.verification.status],
        ['GWP Set', t.methodology.gwpSetName],
        ['Allocation Method', t.methodology.allocationMethod],
        [],
        ['EMISSIONS SUMMARY'],
        ['Direct Total (tCO₂e)', t.emissionsSummary.directTotal],
        ['Indirect Total (tCO₂e)', t.emissionsSummary.indirectTotal],
        ['Grand Total (tCO₂e)', t.emissionsSummary.grandTotal],
        [],
        ['GOODS'],
        ['Product', 'CN Code', 'Quantity (t)', 'Direct SEE', 'Indirect SEE', 'Total SEE'],
        ...t.goods.map(g => [
            g.productName, g.cnCode, g.productionQuantity.value,
            g.embeddedEmissions.direct.specific,
            g.embeddedEmissions.indirect.specific,
            g.embeddedEmissions.total.specific,
        ]),
        [],
        ['FUEL COMBUSTION ACTIVITY DATA'],
        ['Period', 'Fuel Type', 'Quantity', 'Unit', 'Data Source'],
        ...t.activityData.fuelCombustion.map(f => [f.period, f.fuelType, f.quantity, f.unit, f.source]),
        [],
        ['ELECTRICITY ACTIVITY DATA'],
        ['Period', 'MWh', 'Emission Factor', 'Data Source'],
        ...t.activityData.electricity.map(e => [e.period, e.mwh, e.emissionFactor, e.source]),
    ];

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    triggerDownload(blob, `cbam_communication_${state.meta.periodStart}_${state.meta.periodEnd}.csv`);
}

// ─── Helpers ─────────────────────────────────────────────────

function round2(n) { return Math.round((n || 0) * 100) / 100; }
function round4(n) { return Math.round((n || 0) * 10000) / 10000; }

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
