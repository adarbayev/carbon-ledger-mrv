/**
 * Parse DVs_as_adopted_v20260204.xlsx → src/data/cbamDefaultValues.js
 * 
 * Columns per country sheet:
 *   0: CN Code (or sector header)
 *   1: Description
 *   2: Default Value (direct emissions)
 *   3: Default Value (indirect emissions)
 *   4: Default Value (total emissions)
 *   5: 2026 DV (incl markup)
 *   6: 2027 DV (incl markup)
 *   7: 2028+ DV (incl markup)
 *   8: Production route
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, 'DVs_as_adopted_v20260204.xlsx');
const OUTPUT = path.join(__dirname, 'src', 'data', 'cbamDefaultValues.js');

const wb = XLSX.readFile(INPUT);

const result = {};
let totalEntries = 0;

// Collect all unique CN codes with their indirect applicability (for scope auto-detect)
const cnCodeScopeMap = {};

for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    if (rows.length < 3) continue; // skip tiny sheets

    const countryEntries = [];
    let currentSector = null;

    for (let i = 1; i < rows.length; i++) { // skip row 0 (country name)
        const row = rows[i];
        if (!row || row.length < 3) continue;

        const col0 = row[0];
        const col1 = row[1];
        const col2 = row[2];
        const col3 = row[3];
        const col4 = row[4];
        const col5 = row[5];
        const col6 = row[6];
        const col7 = row[7];
        const col8 = row[8];

        const cnStr = String(col0 || '').trim();

        // Skip the column header row (row 1 in most sheets)
        if (cnStr === 'Product CN Code' || cnStr === 'CN Code') continue;

        // Detect sector headers: col1/col2 are empty AND col5 contains 'mark-up'
        const col5Str = String(col5 || '');
        if (!col1 && !col2 && col5Str.includes('mark-up')) {
            currentSector = cnStr;
            continue;
        }

        // Skip "see below" aggregate rows
        if (col2 === 'see below') continue;

        // Parse CN code — normalize to string, remove spaces
        const cnCode = String(col0 || '').trim().replace(/\s+/g, ' ');
        if (!cnCode) continue;

        // Parse values — handle "–", "N/A", numbers
        const parseDV = (v) => {
            if (v === null || v === undefined) return null;
            if (typeof v === 'number') return Math.round(v * 10000) / 10000;
            const s = String(v).trim();
            if (s === '–' || s === '-' || s === 'N/A' || s === '') return null;
            const n = parseFloat(s);
            return isNaN(n) ? null : Math.round(n * 10000) / 10000;
        };

        const direct = parseDV(col2);
        const indirect = parseDV(col3);
        const total = parseDV(col4);
        const markup2026 = parseDV(col5);
        const markup2027 = parseDV(col6);
        const markup2028 = parseDV(col7);

        // Skip rows where all values are null (no data available)
        if (direct === null && indirect === null && total === null) continue;

        const indirectApplicable = indirect !== null;
        const route = col8 ? String(col8).trim().replace(/[()]/g, '') : null;

        const entry = {
            cn: cnCode,
            desc: String(col1 || '').trim(),
            sector: currentSector,
            d: direct,       // direct
            i: indirect,     // indirect (null = N/A)
            t: total,        // total
            m26: markup2026, // 2026 with markup
            m27: markup2027, // 2027 with markup
            m28: markup2028, // 2028+ with markup
            ia: indirectApplicable, // indirect applicable
        };
        if (route && route !== ' ' && route !== '') entry.rt = route;

        countryEntries.push(entry);
        totalEntries++;

        // Track scope per CN code (across all countries)
        if (!cnCodeScopeMap[cnCode]) {
            cnCodeScopeMap[cnCode] = { indirect: false, sector: currentSector };
        }
        if (indirectApplicable) {
            cnCodeScopeMap[cnCode].indirect = true;
        }
    }

    if (countryEntries.length > 0) {
        result[sheetName] = countryEntries;
    }
}

// Build scope lookup: CN code → TOTAL or DIRECT_ONLY
const scopeLookup = {};
for (const [cn, info] of Object.entries(cnCodeScopeMap)) {
    scopeLookup[cn] = {
        scope: info.indirect ? 'TOTAL' : 'DIRECT_ONLY',
        sector: info.sector,
    };
}

// Generate output JS module
const jsContent = `// ═══════════════════════════════════════════════════════════════
//  AUTO-GENERATED from DVs_as_adopted_v20260204.xlsx
//  Do not edit manually. Re-run parse_cbam_defaults.cjs to update.
//  Generated: ${new Date().toISOString()}
//  Total entries: ${totalEntries} across ${Object.keys(result).length} countries
// ═══════════════════════════════════════════════════════════════

/**
 * Default values per country → CN code.
 * Each entry: { cn, desc, sector, d (direct), i (indirect, null=N/A),
 *   t (total), m26/m27/m28 (with markup), ia (indirect applicable), rt (route) }
 */
export const CBAM_DEFAULT_VALUES = ${JSON.stringify(result)};

/**
 * Scope lookup by CN code.
 * Derived from indirect applicability across all countries.
 * { scope: 'TOTAL' | 'DIRECT_ONLY', sector: string }
 */
export const CN_CODE_SCOPE = ${JSON.stringify(scopeLookup)};

/**
 * Get default values for a specific country and CN code.
 */
export function getDefaultValue(country, cnCode) {
    const entries = CBAM_DEFAULT_VALUES[country];
    if (!entries) return null;
    return entries.find(e => e.cn === cnCode) || null;
}

/**
 * Get all CN codes available for a country, grouped by sector.
 */
export function getCnCodesByCountry(country) {
    const entries = CBAM_DEFAULT_VALUES[country];
    if (!entries) return {};
    const bySector = {};
    entries.forEach(e => {
        if (!bySector[e.sector]) bySector[e.sector] = [];
        bySector[e.sector].push(e);
    });
    return bySector;
}

/**
 * Auto-detect scope (DIRECT_ONLY vs TOTAL) for a CN code.
 * Returns 'TOTAL' if indirect emissions apply, 'DIRECT_ONLY' otherwise.
 */
export function getAutoScope(cnCode) {
    const info = CN_CODE_SCOPE[cnCode];
    return info ? info.scope : 'DIRECT_ONLY';
}

/**
 * Get sector for a CN code.
 */
export function getSectorForCnCode(cnCode) {
    const info = CN_CODE_SCOPE[cnCode];
    return info ? info.sector : null;
}

/**
 * List of all available countries.
 */
export const AVAILABLE_COUNTRIES = ${JSON.stringify(Object.keys(result))};
`;

fs.writeFileSync(OUTPUT, jsContent, 'utf-8');

console.log(`✅ Generated ${OUTPUT}`);
console.log(`   ${Object.keys(result).length} countries, ${totalEntries} total entries`);
console.log(`   ${Object.keys(scopeLookup).length} unique CN codes in scope lookup`);
console.log(`   File size: ${(fs.statSync(OUTPUT).size / 1024).toFixed(0)} KB`);
