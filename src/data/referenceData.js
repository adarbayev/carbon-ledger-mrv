// ═══════════════════════════════════════════════════════════════
//  Reference Data for Carbon Ledger MRV
//  Sources: IPCC 2006, EU CBAM Reg. 2023/956, EU Reg. 2025/2547, IEA
// ═══════════════════════════════════════════════════════════════

// ─── Global Warming Potentials (EU Reg 2025/2547, Annex II, Table 6) ──
export const GWP = {
    CO2: 1,
    N2O: 265,       // t CO₂e per t N₂O
    CF4: 6630,      // t CO₂e per t CF₄
    C2F6: 11100,    // t CO₂e per t C₂F₆
};

// ─── Fuel Types (IPCC 2006 Guidelines, Vol. 2, Ch. 2) ────────
// efCO2 = t CO₂ / TJ  (same as kg CO₂ / GJ)
// NCV   = GJ / tonne (= TJ / Gg)
// Calculation: tCO₂ = mass_tonnes × NCV × efCO2 / 1000
export const FUEL_TYPES = [
    { id: 'natural_gas', name: 'Natural Gas', ncv: 48.0, efCO2: 56.1, defaultUnit: 't' },
    { id: 'diesel', name: 'Diesel / Gas Oil', ncv: 43.0, efCO2: 74.1, defaultUnit: 't' },
    { id: 'hard_coal', name: 'Hard Coal', ncv: 25.8, efCO2: 94.6, defaultUnit: 't' },
    { id: 'coke', name: 'Coke', ncv: 28.2, efCO2: 107.0, defaultUnit: 't' },
    { id: 'lpg', name: 'LPG', ncv: 47.3, efCO2: 63.1, defaultUnit: 't' },
    { id: 'fuel_oil', name: 'Heavy Fuel Oil', ncv: 40.4, efCO2: 77.4, defaultUnit: 't' },
    { id: 'pet_coke', name: 'Petroleum Coke', ncv: 32.5, efCO2: 97.5, defaultUnit: 't' },
    { id: 'biomass_wood', name: 'Wood / Biomass', ncv: 15.6, efCO2: 112.0, defaultUnit: 't' },
    { id: 'other', name: 'Other (custom)', ncv: 0, efCO2: 0, defaultUnit: 't' },
];

// Helper: calculate tCO₂ from fuel entry
// Returns { co2: number, total: number } — total = co2 for now
// (multi-gas CH₄/N₂O per-fuel to be added in future phase)
export function calcFuelEmissions(fuelEntry) {
    const fuelType = FUEL_TYPES.find(f => f.id === fuelEntry.fuelTypeId);
    let co2;
    if (!fuelType || fuelType.id === 'other') {
        const ncv = fuelEntry.customNcv || 0;
        const ef = fuelEntry.customEf || 0;
        co2 = (parseFloat(fuelEntry.quantity) || 0) * ncv * ef / 1000;
    } else {
        co2 = (parseFloat(fuelEntry.quantity) || 0) * fuelType.ncv * fuelType.efCO2 / 1000;
    }
    return { co2, total: co2 };
}

// Helper: calculate tCO₂ from electricity entry
export function calcElecEmissions(elecEntry) {
    return (parseFloat(elecEntry.mwh) || 0) * (parseFloat(elecEntry.ef) || 0);
}


// ─── CBAM CN Codes (Regulation 2023/956, Annex I) ────────────
// isComplex: true if the good uses other CBAM goods as precursors
export const CBAM_CN_CODES = [
    // Cement
    { code: '2523 10 00', name: 'Cement Clinker', sector: 'Cement', isComplex: false },
    { code: '2523 21 00', name: 'White Portland Cement', sector: 'Cement', isComplex: true },
    { code: '2523 29 00', name: 'Other Portland Cement', sector: 'Cement', isComplex: true },
    { code: '2523 90 00', name: 'Other Hydraulic Cements', sector: 'Cement', isComplex: true },

    // Iron & Steel
    { code: '2601 12 00', name: 'Iron Ore (agglomerated)', sector: 'Iron & Steel', isComplex: false },
    { code: '7201', name: 'Pig Iron', sector: 'Iron & Steel', isComplex: false },
    { code: '7202 1', name: 'Ferro-manganese', sector: 'Iron & Steel', isComplex: false },
    { code: '7202 4', name: 'Ferro-chromium', sector: 'Iron & Steel', isComplex: false },
    { code: '7202 6', name: 'Ferro-nickel', sector: 'Iron & Steel', isComplex: false },
    { code: '7203', name: 'DRI / Sponge Iron', sector: 'Iron & Steel', isComplex: false },
    { code: '7206', name: 'Iron (ingots etc.)', sector: 'Iron & Steel', isComplex: true },
    { code: '7207', name: 'Semi-finished Steel', sector: 'Iron & Steel', isComplex: true },
    { code: '7208', name: 'Hot-rolled Flat Products', sector: 'Iron & Steel', isComplex: true },
    { code: '7209', name: 'Cold-rolled Flat Products', sector: 'Iron & Steel', isComplex: true },
    { code: '7210', name: 'Coated Flat Products', sector: 'Iron & Steel', isComplex: true },
    { code: '7211', name: 'Flat Products < 600mm', sector: 'Iron & Steel', isComplex: true },
    { code: '7213', name: 'Hot-rolled Bars/Rods', sector: 'Iron & Steel', isComplex: true },
    { code: '7214', name: 'Other Bars/Rods', sector: 'Iron & Steel', isComplex: true },
    { code: '7215', name: 'Other Bars (cold-formed)', sector: 'Iron & Steel', isComplex: true },
    { code: '7216', name: 'Angles, Shapes, Sections', sector: 'Iron & Steel', isComplex: true },
    { code: '7217', name: 'Wire of Iron/Steel', sector: 'Iron & Steel', isComplex: true },
    { code: '7218', name: 'Stainless Steel Semi-finished', sector: 'Iron & Steel', isComplex: true },
    { code: '7219', name: 'Stainless Flat Products', sector: 'Iron & Steel', isComplex: true },
    { code: '7220', name: 'Stainless Flat < 600mm', sector: 'Iron & Steel', isComplex: true },
    { code: '7221 00', name: 'Stainless Bars (hot-rolled)', sector: 'Iron & Steel', isComplex: true },
    { code: '7222', name: 'Stainless Other Bars/Angles', sector: 'Iron & Steel', isComplex: true },
    { code: '7223 00', name: 'Stainless Wire', sector: 'Iron & Steel', isComplex: true },
    { code: '7224', name: 'Other Alloy Steel Semi-fin.', sector: 'Iron & Steel', isComplex: true },
    { code: '7225', name: 'Other Alloy Flat Products', sector: 'Iron & Steel', isComplex: true },
    { code: '7226', name: 'Other Alloy Flat < 600mm', sector: 'Iron & Steel', isComplex: true },
    { code: '7228', name: 'Other Alloy Bars/Rods/Wire', sector: 'Iron & Steel', isComplex: true },
    { code: '7229', name: 'Other Alloy Steel Wire', sector: 'Iron & Steel', isComplex: true },
    { code: '7301', name: 'Sheet Piling', sector: 'Iron & Steel', isComplex: true },
    { code: '7302', name: 'Railway Material', sector: 'Iron & Steel', isComplex: true },
    { code: '7303 00', name: 'Cast Iron Tubes', sector: 'Iron & Steel', isComplex: true },
    { code: '7304', name: 'Seamless Tubes/Pipes', sector: 'Iron & Steel', isComplex: true },
    { code: '7305', name: 'Other Tubes > 406mm', sector: 'Iron & Steel', isComplex: true },
    { code: '7306', name: 'Other Tubes/Pipes', sector: 'Iron & Steel', isComplex: true },
    { code: '7307', name: 'Tube Fittings', sector: 'Iron & Steel', isComplex: true },
    { code: '7308', name: 'Structures & Parts', sector: 'Iron & Steel', isComplex: true },
    { code: '7309 00', name: 'Reservoirs/Tanks > 300L', sector: 'Iron & Steel', isComplex: true },
    { code: '7310', name: 'Tanks/Drums < 300L', sector: 'Iron & Steel', isComplex: true },
    { code: '7311 00', name: 'Containers for Compressed Gas', sector: 'Iron & Steel', isComplex: true },
    { code: '7318', name: 'Screws, Bolts, Nuts', sector: 'Iron & Steel', isComplex: true },
    { code: '7326', name: 'Other Articles of Iron/Steel', sector: 'Iron & Steel', isComplex: true },

    // Aluminium
    { code: '7601 10 00', name: 'Unwrought Aluminium (primary)', sector: 'Aluminium', isComplex: false },
    { code: '7601 20 00', name: 'Unwrought Al Alloys', sector: 'Aluminium', isComplex: true },
    { code: '7603', name: 'Aluminium Powders/Flakes', sector: 'Aluminium', isComplex: true },
    { code: '7604', name: 'Aluminium Bars/Profiles', sector: 'Aluminium', isComplex: true },
    { code: '7605', name: 'Aluminium Wire', sector: 'Aluminium', isComplex: true },
    { code: '7606', name: 'Aluminium Plates/Sheets', sector: 'Aluminium', isComplex: true },
    { code: '7607', name: 'Aluminium Foil', sector: 'Aluminium', isComplex: true },
    { code: '7608', name: 'Aluminium Tubes/Pipes', sector: 'Aluminium', isComplex: true },
    { code: '7609 00 00', name: 'Aluminium Tube Fittings', sector: 'Aluminium', isComplex: true },
    { code: '7616', name: 'Other Articles of Aluminium', sector: 'Aluminium', isComplex: true },

    // Fertilisers
    { code: '2808 00 00', name: 'Nitric Acid', sector: 'Fertilisers', isComplex: false },
    { code: '2814', name: 'Ammonia', sector: 'Fertilisers', isComplex: false },
    { code: '2834 21 00', name: 'Potassium Nitrate', sector: 'Fertilisers', isComplex: true },
    { code: '3102', name: 'Mineral Nitrogen Fertilisers', sector: 'Fertilisers', isComplex: true },
    { code: '3105', name: 'Mixed Fertilisers', sector: 'Fertilisers', isComplex: true },

    // Hydrogen
    { code: '2804 10 00', name: 'Hydrogen', sector: 'Hydrogen', isComplex: false },

    // Electricity
    { code: '2716 00 00', name: 'Electrical Energy', sector: 'Electricity', isComplex: false },
];

// Helper: look up CN code object
export function getCnCodeInfo(code) {
    return CBAM_CN_CODES.find(c => c.code === code) || null;
}

// Helper: get all sectors
export function getSectors() {
    return [...new Set(CBAM_CN_CODES.map(c => c.sector))];
}


// ─── Grid Emission Factors (tCO₂/MWh) ───────────────────────
// Sources: IEA 2023, national statistics
export const GRID_EF_BY_COUNTRY = [
    { code: 'KZ', name: 'Kazakhstan', ef: 0.636 },
    { code: 'CN', name: 'China', ef: 0.581 },
    { code: 'IN', name: 'India', ef: 0.708 },
    { code: 'TR', name: 'Turkey', ef: 0.440 },
    { code: 'RU', name: 'Russia', ef: 0.340 },
    { code: 'UA', name: 'Ukraine', ef: 0.345 },
    { code: 'EG', name: 'Egypt', ef: 0.450 },
    { code: 'ZA', name: 'South Africa', ef: 0.928 },
    { code: 'BR', name: 'Brazil', ef: 0.074 },
    { code: 'US', name: 'United States', ef: 0.379 },
    { code: 'GB', name: 'United Kingdom', ef: 0.207 },
    { code: 'DE', name: 'Germany', ef: 0.338 },
    { code: 'FR', name: 'France', ef: 0.052 },
    { code: 'PL', name: 'Poland', ef: 0.681 },
    { code: 'NL', name: 'Netherlands', ef: 0.328 },
    { code: 'IT', name: 'Italy', ef: 0.257 },
    { code: 'ES', name: 'Spain', ef: 0.149 },
    { code: 'JP', name: 'Japan', ef: 0.457 },
    { code: 'KR', name: 'South Korea', ef: 0.415 },
    { code: 'AU', name: 'Australia', ef: 0.656 },
    { code: 'OTHER', name: 'Other (enter manually)', ef: 0 },
];

// Helper: get grid EF for a country code
export function getGridEf(countryCode) {
    const entry = GRID_EF_BY_COUNTRY.find(c => c.code === countryCode);
    return entry ? entry.ef : 0;
}
