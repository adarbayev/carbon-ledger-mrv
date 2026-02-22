// ═══════════════════════════════════════════════════════════════
//  Demo Scenario Data
//  Excel Prototype: Aluminium Smelter (Kazakhstan)
// ═══════════════════════════════════════════════════════════════

export const INSTALLATION_DATA = {
    id: 'default',
    name: 'KazAluminium Smelter (Demo)',
    country: 'KAZ',
    periodStart: '2025-01',
    periodEnd: '2025-03'
};

export const BOUNDARIES_DATA = [
    ['b1', 'Electrolysis potlines', 1, 'Hall-Heroult cells — primary aluminium reduction'],
    ['b2', 'Casting & ingot line', 1, 'Holding furnaces, casting wheels'],
    ['b3', 'Off-gas collection & dry scrubbing', 1, 'Fans, sorbent, dust handling'],
    ['b4', 'Fuel combustion (boilers/heaters)', 1, 'On-site auxiliary heat'],
    ['b5', 'Anode baking plant', 0, 'Not required for CBAM ingots (simple good)'],
    ['b6', 'Grid electricity import', 1, 'Purchased electricity from national grid'],
    ['b7', 'On-site vehicles', 1, 'Forklifts and trucks'],
];

export const PROCESSES_DATA = [
    ['P01', 'Electrolysis (Hall-Héroult)', 'Primary aluminium production — includes anode consumption + PFC events', 'Core'],
    ['P02', 'Casting & Ingot Production', 'Holding furnaces, casting line, packaging', 'Core'],
    ['P03', 'Off-gas Collection & Dry Scrubbing', 'Fans, sorbent, dust handling', 'Support'],
    ['P04', 'Utilities (site services)', 'Compressed air, pumps, HVAC, lighting', 'Support'],
];

export const FUEL_ENTRIES_DATA = [
    // P02: Natural gas — casting furnaces
    ['f1', '2025-01', 'P02', 'natural_gas', 500, 't', 'Gas meter report', 'Casting furnaces'],
    ['f2', '2025-02', 'P02', 'natural_gas', 500, 't', 'Gas meter report', 'Casting furnaces'],
    ['f3', '2025-03', 'P02', 'natural_gas', 500, 't', 'Gas meter report', 'Casting furnaces'],
    // P04: Diesel — site vehicles / backup genset
    ['f4', '2025-01', 'P04', 'diesel', 80, 't', 'Fuel ledger', 'Site vehicles / backup genset'],
    ['f5', '2025-02', 'P04', 'diesel', 80, 't', 'Fuel ledger', 'Site vehicles / backup genset'],
    ['f6', '2025-03', 'P04', 'diesel', 80, 't', 'Fuel ledger', 'Site vehicles / backup genset'],
];

export const ELECTRICITY_ENTRIES_DATA = [
    ['e1', '2025-01', 'P01', 175482.02, 'KAZ', 0.0, 'Potline DC power'],
    ['e2', '2025-01', 'P02', 7508.5, 'KAZ', 0.0, 'Casting line'],
    ['e3', '2025-01', 'P03', 4509.37, 'KAZ', 0.0, 'Fans/scrubber'],
    ['e4', '2025-01', 'P04', 3435.19, 'KAZ', 0.0, 'Utilities'],
    ['e5', '2025-02', 'P01', 177549.4, 'KAZ', 0.0, 'Potline DC power'],
    ['e6', '2025-02', 'P02', 7615.37, 'KAZ', 0.0, 'Casting line'],
    ['e7', '2025-02', 'P03', 4577.78, 'KAZ', 0.0, 'Fans/scrubber'],
    ['e8', '2025-02', 'P04', 3486.81, 'KAZ', 0.0, 'Utilities'],
    ['e9', '2025-03', 'P01', 179616.3, 'KAZ', 0.0, 'Potline DC power'],
    ['e10', '2025-03', 'P02', 7722.43, 'KAZ', 0.0, 'Casting line'],
    ['e11', '2025-03', 'P03', 4646.36, 'KAZ', 0.0, 'Fans/scrubber'],
    ['e12', '2025-03', 'P04', 3538.55, 'KAZ', 0.0, 'Utilities'],
];

export const PROCESS_EVENTS_MONTHS = [
    { period: '2025-01', metalProd: 15200 },
    { period: '2025-02', metalProd: 15400 },
    { period: '2025-03', metalProd: 15600 },
];

export const PRODUCTS_DATA = [
    ['pr1', 'default', 'Aluminium ingots (unwrought)', '7601 10 00', 0],
    ['pr2', 'default', 'Dross / skimmings', '', 1],
];

export const PRODUCTION_OUTPUT_DATA = [
    ['po1', '2025-01', 'pr1', 'P02', 14980],
    ['po2', '2025-01', 'pr2', 'P02', 245],
    ['po3', '2025-02', 'pr1', 'P02', 15160],
    ['po4', '2025-02', 'pr2', 'P02', 250],
    ['po5', '2025-03', 'pr1', 'P02', 15340],
    ['po6', '2025-03', 'pr2', 'P02', 255],
];

export const EMISSION_FACTORS_DATA = [
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
