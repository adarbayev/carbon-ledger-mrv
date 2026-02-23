// ═══════════════════════════════════════════════════════════════
//  Demo Scenario Data
//  Context: Integrated Steel Works (BF-BOF Route)
//  Scenario: Central Asian Steel integrated production
// ═══════════════════════════════════════════════════════════════

export const INSTALLATION_DATA = {
    id: 'default',
    name: 'KazSteel Integrated Works (Demo)',
    country: 'KAZ',
    periodStart: '2025-01',
    periodEnd: '2025-03'
};

export const BOUNDARIES_DATA = [
    ['b1', 'Sinter Plant', 1, 'Ore sintering and preparation'],
    ['b2', 'Blast Furnace (BF)', 1, 'Ironmaking — direct and indirect emissions'],
    ['b3', 'Basic Oxygen Furnace (BOF)', 1, 'Steelmaking and secondary metallurgy'],
    ['b4', 'Hot Rolling Mill', 1, 'Continuous casting and final HR product'],
    ['b5', 'Coke Oven Plant', 0, 'Not included in site boundary (purchased coke)'],
    ['b6', 'Grid electricity import', 1, 'Purchased electricity from national grid'],
    ['b7', 'On-site logistics', 1, 'Internal rail and transport'],
];

export const PROCESSES_DATA = [
    ['P01', 'Sintering (Agglomeration)', 'Production of sintered ore for the blast furnace', 'Core'],
    ['P02', 'Blast Furnace / Ironmaking', 'Reduction of iron ore into hot metal (pig iron)', 'Core'],
    ['P03', 'Steelmaking (BOF + CC)', 'Conversion of hot metal into crude steel and slabs', 'Core'],
    ['P04', 'Hot Rolling Mill', 'Heating and rolling slabs into hot rolled coil (HRC)', 'Core'],
];

export const FUEL_ENTRIES_DATA = [
    // P02: Coke Oven Gas — ironmaking heat
    ['f1', '2025-01', 'P02', 'coke_oven_gas', 500, 't', 'Fuel logbook', 'Stoves heating'],
    ['f2', '2025-02', 'P02', 'coke_oven_gas', 500, 't', 'Fuel logbook', 'Stoves heating'],
    ['f3', '2025-03', 'P02', 'coke_oven_gas', 500, 't', 'Fuel logbook', 'Stoves heating'],
    // P04: Natural gas — reheating furnaces
    ['f4', '2025-01', 'P04', 'natural_gas', 80, 't', 'Gas meter report', 'Reheating furnace'],
    ['f5', '2025-02', 'P04', 'natural_gas', 80, 't', 'Gas meter report', 'Reheating furnace'],
    ['f6', '2025-03', 'P04', 'natural_gas', 80, 't', 'Gas meter report', 'Reheating furnace'],
];

export const ELECTRICITY_ENTRIES_DATA = [
    ['e1', '2025-01', 'P01', 175482.02, 'KAZ', 0.0, 'Sinter fans / prep'],
    ['e2', '2025-01', 'P02', 7508.5, 'KAZ', 0.0, 'BF Blowers'],
    ['e3', '2025-01', 'P03', 4509.37, 'KAZ', 0.0, 'Caster / Ladle furnace'],
    ['e4', '2025-01', 'P04', 3435.19, 'KAZ', 0.0, 'Mill drives'],
    ['e5', '2025-02', 'P01', 177549.4, 'KAZ', 0.0, 'Sinter fans / prep'],
    ['e6', '2025-02', 'P02', 7615.37, 'KAZ', 0.0, 'BF Blowers'],
    ['e7', '2025-02', 'P03', 4577.78, 'KAZ', 0.0, 'Caster / Ladle furnace'],
    ['e8', '2025-02', 'P04', 3486.81, 'KAZ', 0.0, 'Mill drives'],
    ['e9', '2025-03', 'P01', 179616.3, 'KAZ', 0.0, 'Sinter fans / prep'],
    ['e10', '2025-03', 'P02', 7722.43, 'KAZ', 0.0, 'BF Blowers'],
    ['e11', '2025-03', 'P03', 4646.36, 'KAZ', 0.0, 'Caster / Ladle furnace'],
    ['e12', '2025-03', 'P04', 3538.55, 'KAZ', 0.0, 'Mill drives'],
];

export const PROCESS_EVENTS_MONTHS = [
    { period: '2025-01', ironProd: 15200 },
    { period: '2025-02', ironProd: 15400 },
    { period: '2025-03', ironProd: 15600 },
];

export const PRODUCTS_DATA = [
    ['pr1', 'default', 'Hot Rolled Coil (HRC)', '7208 39 00', 0],
    ['pr2', 'default', 'Blast Furnace Slag', '', 1],
];

export const PRODUCTION_OUTPUT_DATA = [
    ['po1', '2025-01', 'pr1', 'P04', 14980],
    ['po2', '2025-01', 'pr2', 'P02', 245],
    ['po3', '2025-02', 'pr1', 'P04', 15160],
    ['po4', '2025-02', 'pr2', 'P02', 250],
    ['po5', '2025-03', 'pr1', 'P04', 15340],
    ['po6', '2025-03', 'pr2', 'P02', 255],
];

export const EMISSION_FACTORS_DATA = [
    // Natural Gas
    ['ef_ng_co2', 'natural_gas', 'CO2', 56100, 'kg/TJ', 48.0, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.2'],
    ['ef_ng_ch4', 'natural_gas', 'CH4', 5, 'kg/TJ', 48.0, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.2'],
    ['ef_ng_n2o', 'natural_gas', 'N2O', 0.1, 'kg/TJ', 48.0, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.2'],
    // Coke Oven Gas (as a proxy for industrial gas)
    ['ef_cog_co2', 'coke_oven_gas', 'CO2', 44000, 'kg/TJ', 20.0, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.2'],
    ['ef_cog_ch4', 'coke_oven_gas', 'CH4', 1, 'kg/TJ', 20.0, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.2'],
    ['ef_cog_n2o', 'coke_oven_gas', 'N2O', 0.1, 'kg/TJ', 20.0, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.2'],
    // Coke (Reducing Agent)
    ['ef_coke_co2', 'coke', 'CO2', 107000, 'kg/TJ', 28.2, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.3'],
    ['ef_coke_ch4', 'coke', 'CH4', 1, 'kg/TJ', 28.2, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.3'],
    ['ef_coke_n2o', 'coke', 'N2O', 1.5, 'kg/TJ', 28.2, 'GJ/t', 'IPCC 2006 Vol.2 Table 2.3'],
];
