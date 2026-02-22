
import { validateFormula } from './formulaEvaluator';

/**
 * Checks if a value is considered "incomplete" (0, null, undefined, blank, NaN).
 */
export function isIncomplete(val) {
    if (val === null || val === undefined) return true;
    if (typeof val === 'string' && val.trim() === '') return true;
    if (typeof val === 'number' && isNaN(val)) return true;
    return false;
}

/**
 * Calculates the overall data completeness percentage.
 * Returns { total, filled, pct, missingCount }
 */
export function calculateDataCompleteness(state) {
    let total = 0;
    let filled = 0;

    // 1. Fuels
    // Fields: quantity, ncv, ef
    // (If source/type is standard, ncv/ef might be pre-filled, but we check the underlying value)
    const fuels = state.activity?.fuels || [];
    for (const f of fuels) {
        // Quantity is always required
        total++;
        if (!isIncomplete(f.quantity)) filled++;

        // NCV (check if implied or explicit? user said "input fields", so check stored values)
        total++;
        if (!isIncomplete(f.ncv)) filled++;

        // EF
        total++;
        if (!isIncomplete(f.ef)) filled++;
    }

    // 2. Electricity
    // Fields: mwh, ef
    const elec = state.activity?.electricity || [];
    for (const e of elec) {
        // MWh
        total++;
        if (!isIncomplete(e.mwh)) filled++;

        // EF (often auto-filled by country, but if it's 0 it's incomplete)
        total++;
        if (!isIncomplete(e.ef)) filled++;
    }

    // 3. Emission Blocks (Process)
    // Fields: all parameters defined in the block
    const blocks = state.emissionBlocks || [];
    for (const b of blocks) {
        const params = b.parameters || [];
        for (const p of params) {
            total++;
            if (!isIncomplete(p.value)) filled++;
        }
    }

    // Edge case: if no data at all, is it 0% or 100%? 
    // "count how many are not filled out". If 0 total, then 0 not filled?
    // Usually 0% gives a better nudge to start.
    if (total === 0) return { total: 0, filled: 0, pct: 0, missingCount: 0 };

    return {
        total,
        filled,
        pct: Math.round((filled / total) * 100),
        missingCount: total - filled,
    };
}
