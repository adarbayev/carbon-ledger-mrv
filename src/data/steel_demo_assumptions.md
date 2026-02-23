# Steel Demo Scenario: Integrated Works (BF-BOF)

This demo scenario replaces the previous aluminium smelter data with a simplified model of an integrated steel plant using the **Blast Furnace - Basic Oxygen Furnace (BF-BOF)** route, which is a major "CBAM sector" focus.

## Key Assumptions & Mapping

To maintain calculation consistency for testing, the **activity numbers** (MWh, Tonnes) from the original aluminium demo have been preserved but re-contextualized:

1.  **Sintering (P01):**
    *   Electricity consumption (~175 GWh total) is mapped to heavy-duty sinter fans and ore preparation.
    *   Emission Block: `Sinter Reducing Agent` (coke breeze proxy at ~50kg/t iron).
2.  **Blast Furnace (P02):**
    *   Fuel Entry: `Coke Oven Gas` (COG) used for heating stoves.
    *   Emission Blocks:
        *   `BF Reducing Agent`: Represents coke and PCI (coal) injection at a combined rate of ~450kg/t hot metal.
        *   `BF Flux Calcination`: Represents limestone and dolomite fluxes for slag formation.
3.  **Steelmaking & Caster (P03):**
    *   Electricity mapped to secondary metallurgy (ladle furnaces) and continuous casting.
    *   Emission Block: `BOF Carbon Oxidation` proxy, calculating CO₂ released when reducing carbon content of hot metal (~4%) to crude steel (~0.05%).
4.  **Hot Rolling Mill (P04):**
    *   Fuel Entry: `Natural Gas` used in reheating furnaces.
    *   Electricity used for high-power mill drives and finishing lines.

## Products
- **Primary Product:** Hot Rolled Coil (HRC) - CN 7208 39 00.
- **Residue:** Blast Furnace Slag (mapped to residue for allocation testing).

## CBAM Context
This scenario demonstrates:
- Multi-process complex allocation (Hot metal → Steel → HRC).
- Combined fuel combustion and process emission blocks.
- Indirect emission tracking at the process level.
