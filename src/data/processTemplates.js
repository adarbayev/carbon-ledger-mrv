// ═══════════════════════════════════════════════════════════════
//  Process Emission Templates — Sector-Specific Formula Library
//  Each template defines a named formula with typed parameters.
//  Templates can be instantiated as "Emission Blocks" in the UI.
// ═══════════════════════════════════════════════════════════════

export const PROCESS_TEMPLATES = [
    // ─── Aluminium ───────────────────────────────────────────
    {
        id: 'al_anode',
        sector: 'Aluminium',
        name: 'Anode Consumption CO₂',
        outputGas: 'CO2',
        formula: 'production * anode_rate / 1000 * (carbon - sulfur - ash) * 44 / 12',
        formulaDisplay: 'Production × Anode Rate ÷ 1000 × (C − S − Ash) × 44/12',
        source: 'IPCC 2006 Vol.3 Ch.4',
        parameters: [
            { key: 'production', label: 'Metal Production', unit: 't', defaultValue: 0 },
            { key: 'anode_rate', label: 'Net Anode Consumption', unit: 'kg/t Al', defaultValue: 420 },
            { key: 'carbon', label: 'Carbon Fraction', unit: 'fraction', defaultValue: 0.95 },
            { key: 'sulfur', label: 'Sulfur Fraction', unit: 'fraction', defaultValue: 0.02 },
            { key: 'ash', label: 'Ash Fraction', unit: 'fraction', defaultValue: 0.01 },
        ],
    },
    {
        id: 'al_pfc_cf4',
        sector: 'Aluminium',
        name: 'PFC — CF₄ Emissions',
        outputGas: 'CF4',
        formula: 'production * aem * slope',
        formulaDisplay: 'Production × AEM × Slope Factor',
        source: 'IPCC 2006 Vol.3 Ch.4',
        parameters: [
            { key: 'production', label: 'Metal Production', unit: 't', defaultValue: 0 },
            { key: 'aem', label: 'Anode Effect Minutes', unit: 'min/cell·day', defaultValue: 0.25 },
            { key: 'slope', label: 'CF₄ Slope Factor', unit: 't CF₄/(t Al × AEM)', defaultValue: 0.00006 },
        ],
    },
    {
        id: 'al_pfc_c2f6',
        sector: 'Aluminium',
        name: 'PFC — C₂F₆ Emissions',
        outputGas: 'C2F6',
        formula: 'production * aem * slope * ratio',
        formulaDisplay: 'Production × AEM × Slope × C₂F₆/CF₄ Ratio',
        source: 'IPCC 2006 Vol.3 Ch.4',
        parameters: [
            { key: 'production', label: 'Metal Production', unit: 't', defaultValue: 0 },
            { key: 'aem', label: 'Anode Effect Min', unit: 'min/cell·day', defaultValue: 0.25 },
            { key: 'slope', label: 'CF₄ Slope Factor', unit: 't CF₄/(t Al × AEM)', defaultValue: 0.00006 },
            { key: 'ratio', label: 'C₂F₆/CF₄ Ratio', unit: 'ratio', defaultValue: 0.1 },
        ],
    },

    // ─── Cement ──────────────────────────────────────────────
    {
        id: 'cement_calcination',
        sector: 'Cement',
        name: 'Calcination CO₂ (CaCO₃ → CaO)',
        outputGas: 'CO2',
        formula: 'clinker * cao_ratio * 44 / 56',
        formulaDisplay: 'Clinker × CaO Ratio × (44/56)',
        source: 'IPCC 2006 Vol.3 Ch.2 Eq.2.1',
        parameters: [
            { key: 'clinker', label: 'Clinker Production', unit: 't', defaultValue: 0 },
            { key: 'cao_ratio', label: 'CaO Content', unit: 'fraction', defaultValue: 0.65 },
        ],
    },
    {
        id: 'cement_mgo',
        sector: 'Cement',
        name: 'MgCO₃ Decomposition CO₂',
        outputGas: 'CO2',
        formula: 'clinker * mgo_ratio * 44 / 40',
        formulaDisplay: 'Clinker × MgO Ratio × (44/40)',
        source: 'IPCC 2006 Vol.3 Ch.2 Eq.2.1',
        parameters: [
            { key: 'clinker', label: 'Clinker Production', unit: 't', defaultValue: 0 },
            { key: 'mgo_ratio', label: 'MgO Content', unit: 'fraction', defaultValue: 0.015 },
        ],
    },
    {
        id: 'cement_ckd',
        sector: 'Cement',
        name: 'Cement Kiln Dust (CKD) CO₂',
        outputGas: 'CO2',
        formula: 'clinker * ckd_ratio * ef_ckd',
        formulaDisplay: 'Clinker × CKD Ratio × EF_CKD',
        source: 'IPCC 2006 Vol.3 Ch.2',
        parameters: [
            { key: 'clinker', label: 'Clinker Production', unit: 't', defaultValue: 0 },
            { key: 'ckd_ratio', label: 'CKD Fraction', unit: 'fraction', defaultValue: 0.02 },
            { key: 'ef_ckd', label: 'CKD Emission Factor', unit: 'tCO₂/t CKD', defaultValue: 0.525 },
        ],
    },

    // ─── Iron & Steel ────────────────────────────────────────
    {
        id: 'steel_reducing_agent',
        sector: 'Iron & Steel',
        name: 'Reducing Agent CO₂ (Coke/Coal)',
        outputGas: 'CO2',
        formula: 'agent_mass * carbon_content * 44 / 12',
        formulaDisplay: 'Agent Mass × C Content × (44/12)',
        source: 'IPCC 2006 Vol.3 Ch.4',
        parameters: [
            { key: 'agent_mass', label: 'Reducing Agent Mass', unit: 't', defaultValue: 0 },
            { key: 'carbon_content', label: 'Carbon Content', unit: 'fraction', defaultValue: 0.85 },
        ],
    },
    {
        id: 'steel_limestone',
        sector: 'Iron & Steel',
        name: 'Limestone/Dolomite Flux CO₂',
        outputGas: 'CO2',
        formula: 'limestone * 0.44 + dolomite * 0.477',
        formulaDisplay: 'Limestone × 0.44 + Dolomite × 0.477',
        source: 'IPCC 2006 Vol.3 Ch.4',
        parameters: [
            { key: 'limestone', label: 'Limestone Consumption', unit: 't', defaultValue: 0 },
            { key: 'dolomite', label: 'Dolomite Consumption', unit: 't', defaultValue: 0 },
        ],
    },
    {
        id: 'steel_electrode',
        sector: 'Iron & Steel',
        name: 'Electrode Consumption CO₂ (EAF)',
        outputGas: 'CO2',
        formula: 'electrode_mass * carbon_content * 44 / 12',
        formulaDisplay: 'Electrode Mass × C Content × (44/12)',
        source: 'IPCC 2006 Vol.3 Ch.4',
        parameters: [
            { key: 'electrode_mass', label: 'Electrode Consumption', unit: 't', defaultValue: 0 },
            { key: 'carbon_content', label: 'Carbon Content', unit: 'fraction', defaultValue: 0.82 },
        ],
    },

    // ─── Fertilisers ─────────────────────────────────────────
    {
        id: 'fert_n2o_nitric',
        sector: 'Fertilisers',
        name: 'N₂O from Nitric Acid Production',
        outputGas: 'N2O',
        formula: 'hno3_production * ef_n2o / 1000 * (1 - destruction)',
        formulaDisplay: 'HNO₃ Production × EF ÷ 1000 × (1 − Destruction Factor)',
        source: 'IPCC 2006 Vol.3 Ch.3',
        parameters: [
            { key: 'hno3_production', label: 'HNO₃ Production', unit: 't', defaultValue: 0 },
            { key: 'ef_n2o', label: 'N₂O Emission Factor', unit: 'kg/t', defaultValue: 7 },
            { key: 'destruction', label: 'Destruction Factor', unit: 'fraction', defaultValue: 0.9 },
        ],
    },
    {
        id: 'fert_co2_urea',
        sector: 'Fertilisers',
        name: 'CO₂ from Urea Production',
        outputGas: 'CO2',
        formula: 'urea_production * 44 / 60 * purity',
        formulaDisplay: 'Urea Production × (44/60) × Purity',
        source: 'IPCC 2006 Vol.3 Ch.3',
        parameters: [
            { key: 'urea_production', label: 'Urea Production', unit: 't', defaultValue: 0 },
            { key: 'purity', label: 'Urea Purity', unit: 'fraction', defaultValue: 0.97 },
        ],
    },

    // ─── Hydrogen ────────────────────────────────────────────
    {
        id: 'h2_smr',
        sector: 'Hydrogen',
        name: 'Steam Methane Reforming CO₂',
        outputGas: 'CO2',
        formula: 'feedstock * carbon_content * 44 / 12',
        formulaDisplay: 'Feedstock × Carbon Content × (44/12)',
        source: 'IPCC default methodology',
        parameters: [
            { key: 'feedstock', label: 'Natural Gas Feedstock', unit: 't', defaultValue: 0 },
            { key: 'carbon_content', label: 'Carbon Content', unit: 'fraction', defaultValue: 0.75 },
        ],
    },

    // ─── Custom (blank) ──────────────────────────────────────
    {
        id: 'custom',
        sector: 'Custom',
        name: 'Custom Process Emission',
        outputGas: 'CO2',
        formula: '',
        formulaDisplay: '',
        source: 'User-defined',
        parameters: [],
    },
];

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Get all unique sector names.
 */
export function getSectors() {
    const sectors = new Set(PROCESS_TEMPLATES.map(t => t.sector));
    return [...sectors];
}

/**
 * Sector → minimum required template IDs for CBAM completeness.
 * An installation in a given sector must have at least one block from each required group.
 */
export const SECTOR_REQUIRED_TEMPLATES = {
    'Aluminium': [
        { ids: ['al_anode'], label: 'Anode Consumption CO₂' },
        { ids: ['al_pfc_cf4', 'al_pfc_c2f6'], label: 'PFC Emissions (CF₄ + C₂F₆)' },
    ],
    'Cement': [
        { ids: ['cement_calcination'], label: 'Calcination CO₂' },
    ],
    'Iron & Steel': [
        { ids: ['steel_reducing_agent'], label: 'Reducing Agent CO₂' },
    ],
    'Fertilisers': [
        { ids: ['fert_n2o_nitric'], label: 'N₂O from Nitric Acid' },
    ],
    // Hydrogen and Custom have no mandatory blocks (fuel-combustion only)
};

/**
 * Check sector completeness for a set of emission blocks.
 * Returns { sectors: string[], missing: { sector, label }[], complete: boolean }
 *
 * @param {Array} emissionBlocks - current emission blocks from state
 */
export function checkSectorCompleteness(emissionBlocks = []) {
    // Infer active sectors from template IDs in use
    const usedTemplateIds = new Set(emissionBlocks.map(b => b.templateId).filter(Boolean));
    const activeSectors = new Set();
    for (const tpl of PROCESS_TEMPLATES) {
        if (usedTemplateIds.has(tpl.id) && tpl.sector !== 'Custom') {
            activeSectors.add(tpl.sector);
        }
    }

    const missing = [];
    for (const sector of activeSectors) {
        const rules = SECTOR_REQUIRED_TEMPLATES[sector] || [];
        for (const rule of rules) {
            const hasAny = rule.ids.some(id => usedTemplateIds.has(id));
            if (!hasAny) {
                missing.push({ sector, label: rule.label });
            }
        }
    }

    return {
        sectors: [...activeSectors],
        missing,
        complete: missing.length === 0,
    };
}

/**
 * Get templates for a specific sector.
 */
export function getTemplatesBySector(sector) {
    return PROCESS_TEMPLATES.filter(t => t.sector === sector);
}

/**
 * Get a single template by ID.
 */
export function getTemplateById(id) {
    return PROCESS_TEMPLATES.find(t => t.id === id) || null;
}

/**
 * Create a fresh emission block from a template, pre-filled with defaults.
 */
export function instantiateTemplate(templateId, period, processId) {
    const tpl = getTemplateById(templateId);
    if (!tpl) return null;

    return {
        id: `eb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        templateId: tpl.id,
        period,
        processId,
        name: tpl.name,
        outputGas: tpl.outputGas,
        formula: tpl.formula,
        formulaDisplay: tpl.formulaDisplay,
        source: tpl.source,
        parameters: tpl.parameters.map(p => ({ ...p, value: p.defaultValue })),
    };
}

/**
 * Group templates by category (sector).
 * Returns { sectorName: [template, ...], ... }
 */
export function getTemplatesByCategory() {
    const groups = {};
    PROCESS_TEMPLATES.forEach(t => {
        if (!groups[t.sector]) groups[t.sector] = [];
        groups[t.sector].push(t);
    });
    return groups;
}
