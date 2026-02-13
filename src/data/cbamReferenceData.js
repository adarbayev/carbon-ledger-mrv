// ═══════════════════════════════════════════════════════════════
//  CBAM Reference Data
//  Sources: Excel MRV Model (Tabs 13-19), EU Reg. 2025/2621
// ═══════════════════════════════════════════════════════════════

// ─── 1. CBAM Phase-In Schedule (Tab 13_Ref_CBAM_PhaseIn) ─────
// EU free allocation phase-out from 2026 to 2034
export const CBAM_PHASE_IN = [
    { year: 2026, freeAllocation: 0.975, payableShare: 0.025 },
    { year: 2027, freeAllocation: 0.950, payableShare: 0.050 },
    { year: 2028, freeAllocation: 0.900, payableShare: 0.100 },
    { year: 2029, freeAllocation: 0.825, payableShare: 0.175 },
    { year: 2030, freeAllocation: 0.725, payableShare: 0.275 },
    { year: 2031, freeAllocation: 0.600, payableShare: 0.400 },
    { year: 2032, freeAllocation: 0.450, payableShare: 0.550 },
    { year: 2033, freeAllocation: 0.250, payableShare: 0.750 },
    { year: 2034, freeAllocation: 0.000, payableShare: 1.000 },
];

// ─── 2. EUA Certificate Price Scenarios (Tab 14_Ref_CBAM_CertPrice) ──
// €/tCO₂ — LOW, MID, HIGH projections
export const CBAM_CERT_PRICE = [
    { year: 2026, low: 74.4, mid: 93, high: 111.6 },
    { year: 2027, low: 76.0, mid: 95, high: 114.0 },
    { year: 2028, low: 78.4, mid: 98, high: 117.6 },
    { year: 2029, low: 80.8, mid: 101, high: 121.2 },
    { year: 2030, low: 84.0, mid: 105, high: 126.0 },
    { year: 2031, low: 88.0, mid: 110, high: 132.0 },
    { year: 2032, low: 92.0, mid: 115, high: 138.0 },
    { year: 2033, low: 96.0, mid: 120, high: 144.0 },
    { year: 2034, low: 100.0, mid: 125, high: 150.0 },
];

// ─── 3. KZ ETS Carbon Credit Scenarios (Tab 17_Ref_KAZ_ETS) ─
// €/tCO₂ — deduction price for carbon price paid in KZ
export const KZ_ETS_PRICE = [
    { year: 2026, low: 1, mid: 5, high: 10, quotaShare: 0.0125 },
    { year: 2027, low: 1.5, mid: 5, high: 10, quotaShare: 0.025 },
    { year: 2028, low: 2, mid: 5, high: 10, quotaShare: 0.050 },
    { year: 2029, low: 2.5, mid: 7.5, high: 12.5, quotaShare: 0.100 },
    { year: 2030, low: 3, mid: 10, high: 15, quotaShare: 0.150 },
    { year: 2031, low: 4, mid: 12, high: 18, quotaShare: 0.200 },
    { year: 2032, low: 5, mid: 15, high: 20, quotaShare: 0.250 },
    { year: 2033, low: 6, mid: 18, high: 25, quotaShare: 0.300 },
    { year: 2034, low: 8, mid: 20, high: 30, quotaShare: 0.350 },
];

// ─── 4. Aluminium Price Forecast (Tab 16_Ref_Al_Price) ───────
// $/tonne — LME aluminium price scenarios
export const AL_PRICE_FORECAST = [
    { year: 2026, low: 2125, mid: 2500, high: 2875 },
    { year: 2027, low: 2200, mid: 2600, high: 3000 },
    { year: 2028, low: 2250, mid: 2650, high: 3050 },
    { year: 2029, low: 2300, mid: 2700, high: 3100 },
    { year: 2030, low: 2350, mid: 2800, high: 3250 },
    { year: 2031, low: 2400, mid: 2850, high: 3300 },
    { year: 2032, low: 2450, mid: 2900, high: 3350 },
    { year: 2033, low: 2500, mid: 2950, high: 3400 },
    { year: 2034, low: 2550, mid: 3000, high: 3450 },
];

// ─── 5. Kazakhstan Default Values (EU Reg. 2025/2621) ────────
// Official default emission intensities for goods imported from KZ
// Values in t CO₂e per tonne of product
export const KZ_DEFAULT_VALUES = {
    // Aluminium — route (K) = primary aluminium
    // Note: Indirect = N/A for aluminium (scope = DIRECT_ONLY by default)
    Aluminium: [
        { cnCode: '7601', name: 'Unwrought aluminium', direct: 1.870, indirect: null, total: 1.870, route: 'K' },
        { cnCode: '7603', name: 'Al powders and flakes', direct: 1.990, indirect: null, total: 1.990, route: 'K' },
        { cnCode: '7604 10 10', name: 'Bars and rods', direct: 2.210, indirect: null, total: 2.210, route: 'K' },
        { cnCode: '7604 10 90', name: 'Profiles', direct: 2.230, indirect: null, total: 2.230, route: 'K' },
        { cnCode: '7604 21 00', name: 'Hollow profiles', direct: 2.230, indirect: null, total: 2.230, route: 'K' },
        { cnCode: '7605', name: 'Al wire', direct: 2.210, indirect: null, total: 2.210, route: 'K' },
        { cnCode: '7606', name: 'Al plates/sheets/strip', direct: 2.670, indirect: null, total: 2.670, route: 'K' },
        { cnCode: '7607', name: 'Al foil', direct: 2.670, indirect: null, total: 2.670, route: 'K' },
        { cnCode: '7608', name: 'Al tubes/pipes', direct: 2.230, indirect: null, total: 2.230, route: 'K' },
        { cnCode: '7609 00 00', name: 'Al tube/pipe fittings', direct: 2.230, indirect: null, total: 2.230, route: 'K' },
        { cnCode: '7610', name: 'Al structures', direct: 2.230, indirect: null, total: 2.230, route: 'K' },
        { cnCode: '7611 00 00', name: 'Al reservoirs (>300L)', direct: 2.670, indirect: null, total: 2.670, route: 'K' },
        { cnCode: '7612', name: 'Al containers (≤300L)', direct: 2.670, indirect: null, total: 2.670, route: 'K' },
        { cnCode: '7613 00 00', name: 'Al gas containers', direct: 2.670, indirect: null, total: 2.670, route: 'K' },
        { cnCode: '7614', name: 'Al stranded wire/cables', direct: 2.210, indirect: null, total: 2.210, route: 'K' },
        { cnCode: '7616 10 00', name: 'Al fasteners', direct: 2.670, indirect: null, total: 2.670, route: 'K' },
        { cnCode: '7616 91 00', name: 'Al cloth/grill/netting', direct: 2.670, indirect: null, total: 2.670, route: 'K' },
        { cnCode: '7616 99 10', name: 'Al cast articles', direct: 1.990, indirect: null, total: 1.990, route: 'K' },
        { cnCode: '7616 99 90', name: 'Al other articles', direct: 2.670, indirect: null, total: 2.670, route: 'K' },
    ],
    // Cement
    Cement: [
        { cnCode: '2523 10 00', name: 'Grey clinker', direct: 1.350, indirect: 0.040, total: 1.390, route: 'A' },
        { cnCode: '2523 29 00', name: 'Grey Portland cement', direct: 1.350, indirect: 0.070, total: 1.420, route: null },
        { cnCode: '2523 90 00', name: 'Grey hydraulic cements', direct: 1.280, indirect: 0.070, total: 1.350, route: 'A' },
    ],
    // Fertilisers (1% markup for all years — handled in MARKUP_SCHEDULE)
    Fertilisers: [
        { cnCode: '2808 00 00', name: 'Nitric acid', direct: 2.730, indirect: 0.040, total: 2.770, route: null },
        { cnCode: '2814 10 00', name: 'Anhydrous ammonia', direct: 2.160, indirect: 0.140, total: 2.300, route: null },
        { cnCode: '2814 20 00', name: 'Ammonia in aqueous solution', direct: 0.650, indirect: 0.040, total: 0.690, route: null },
        { cnCode: '3102 10 19', name: 'Urea (>45% N)', direct: 1.470, indirect: 0.110, total: 1.580, route: null },
        { cnCode: '3102 30 90', name: 'Ammonium nitrate', direct: 2.570, indirect: 0.110, total: 2.670, route: null },
        { cnCode: '3102 40 10', name: 'AN/CaCO3 (≤28% N)', direct: 2.200, indirect: 0.100, total: 2.300, route: null },
        { cnCode: '3105 30 00', name: 'DAP', direct: 0.510, indirect: 0.060, total: 0.570, route: null },
    ],
    // Iron & Steel (key products only — route C = BF/BOF)
    'Iron & Steel': [
        { cnCode: '2601 12 00', name: 'Agglomerated iron ore', direct: 0.170, indirect: 0.170, total: 0.340, route: null },
        { cnCode: '7201', name: 'Pig iron', direct: 4.960, indirect: null, total: 4.960, route: null },
        { cnCode: '7202 11', name: 'Ferro-Mn (>2% C)', direct: 1.690, indirect: null, total: 1.690, route: null },
        { cnCode: '7202 41', name: 'Ferro-Cr (>4% C)', direct: 2.350, indirect: null, total: 2.350, route: null },
        { cnCode: '7206 10 00', name: 'Iron/steel ingots', direct: 5.180, indirect: null, total: 5.180, route: 'C' },
        { cnCode: '7207', name: 'Semi-finished products', direct: 5.180, indirect: null, total: 5.180, route: 'C' },
        { cnCode: '7208', name: 'Flat-rolled (≥600mm, HR)', direct: 5.340, indirect: null, total: 5.340, route: 'C' },
        { cnCode: '7209', name: 'Flat-rolled (≥600mm, CR)', direct: 5.420, indirect: null, total: 5.420, route: 'C' },
    ],
    // Hydrogen
    Hydrogen: [
        { cnCode: '2804 10 00', name: 'Hydrogen', direct: 10.820, indirect: null, total: 10.820, route: null },
    ],
};

// ─── 6. Markup Schedule (EU Reg. 2025/2621, Art. 3) ──────────
// For default values: progressively increasing markup
export const MARKUP_SCHEDULE = {
    standard: [ // Cement, Aluminium, Iron & Steel, Hydrogen
        { year: 2026, rate: 0.10 },
        { year: 2027, rate: 0.20 },
        { year: 2028, rate: 0.30 }, // flat 0.30 from 2028 onwards
        { year: 2029, rate: 0.30 },
        { year: 2030, rate: 0.30 },
        { year: 2031, rate: 0.30 },
        { year: 2032, rate: 0.30 },
        { year: 2033, rate: 0.30 },
        { year: 2034, rate: 0.30 },
    ],
    fertilisers: [ // Fertilisers — capped at 1%
        { year: 2026, rate: 0.01 },
        { year: 2027, rate: 0.01 },
        { year: 2028, rate: 0.01 },
        { year: 2029, rate: 0.01 },
        { year: 2030, rate: 0.01 },
        { year: 2031, rate: 0.01 },
        { year: 2032, rate: 0.01 },
        { year: 2033, rate: 0.01 },
        { year: 2034, rate: 0.01 },
    ],
};

// ─── 7. CBAM Scope Rules ─────────────────────────────────────
// Determines whether indirect emissions are included in CBAM scope
export const SCOPE_RULES = {
    'Aluminium': 'DIRECT_ONLY',  // No indirect default values exist
    'Cement': 'TOTAL',        // Both direct + indirect
    'Fertilisers': 'TOTAL',        // Both direct + indirect
    'Iron & Steel': 'DIRECT_ONLY',  // Indirect = N/A for most products
    'Hydrogen': 'DIRECT_ONLY',  // Indirect = N/A
    'Electricity': 'DIRECT_ONLY',
};

// ─── 8. Production Routes ────────────────────────────────────
export const PRODUCTION_ROUTES = {
    A: 'Grey clinker / cement',
    B: 'White clinker / cement',
    C: 'Carbon Steel — BF/BOF',
    D: 'Carbon Steel — DRI/EAF',
    E: 'Carbon Steel — Scrap/EAF',
    F: 'Low-alloy Steel — BF/BOF',
    G: 'Low-alloy Steel — DRI/EAF',
    H: 'Low-alloy Steel — Scrap/EAF',
    J: 'High-alloy Steel — EAF',
    K: 'Primary Aluminium',
    L: 'Secondary Aluminium',
};

// ─── Helpers ─────────────────────────────────────────────────

/** Get the markup schedule for a sector */
export function getMarkupSchedule(sector) {
    return sector === 'Fertilisers' ? MARKUP_SCHEDULE.fertilisers : MARKUP_SCHEDULE.standard;
}

/** Get default value for a specific CN code from KZ defaults */
export function getKzDefault(cnCode) {
    for (const sector of Object.keys(KZ_DEFAULT_VALUES)) {
        const entry = KZ_DEFAULT_VALUES[sector].find(v => v.cnCode === cnCode);
        if (entry) return { ...entry, sector };
    }
    return null;
}

/** Get all CN codes for a sector with their defaults */
export function getDefaultsBySector(sector) {
    return KZ_DEFAULT_VALUES[sector] || [];
}

/** Get the default scope for a sector */
export function getDefaultScope(sector) {
    return SCOPE_RULES[sector] || 'TOTAL';
}

/** Get cert price for year + scenario */
export function getCertPrice(year, scenario) {
    const row = CBAM_CERT_PRICE.find(r => r.year === year);
    return row ? row[scenario.toLowerCase()] || row.mid : 0;
}

/** Get phase-in payable share for year */
export function getPayableShare(year) {
    const row = CBAM_PHASE_IN.find(r => r.year === year);
    return row ? row.payableShare : 1.0;
}

/** Get KZ ETS data for year + scenario */
export function getKzEts(year, scenario) {
    const row = KZ_ETS_PRICE.find(r => r.year === year);
    if (!row) return { price: 0, quotaShare: 0 };
    return { price: row[scenario.toLowerCase()] || 0, quotaShare: row.quotaShare };
}

/** Get aluminium price for year + scenario */
export function getAlPrice(year, scenario) {
    const row = AL_PRICE_FORECAST.find(r => r.year === year);
    return row ? row[scenario.toLowerCase()] || row.mid : 0;
}
