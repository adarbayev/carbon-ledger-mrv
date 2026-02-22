// ═══════════════════════════════════════════════════════════════
//  Formatting Utilities
//  Standardised number display: space thousands, dot decimal
// ═══════════════════════════════════════════════════════════════

/**
 * Format a number with space thousands separator and dot decimal.
 * @param {number} n - Number to format
 * @param {number} [decimals=2] - Decimal places
 * @returns {string} e.g. "12 345.67"
 */
export function fmtNum(n, decimals = 2) {
    if (n == null || isNaN(n)) return '—';
    const fixed = Number(n).toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');
    const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
    return decPart ? `${withSpaces}.${decPart}` : withSpaces;
}

/**
 * Format an integer with space thousands.
 * @param {number} n
 * @returns {string} e.g. "12 345"
 */
export function fmtInt(n) {
    if (n == null || isNaN(n)) return '—';
    return Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
}

/**
 * Format as percentage.
 * @param {number} n - Already a percentage (e.g. 45.2, not 0.452)
 * @param {number} [decimals=1]
 * @returns {string} e.g. "45.2%"
 */
export function fmtPct(n, decimals = 1) {
    if (n == null || isNaN(n)) return '—';
    return `${Number(n).toFixed(decimals)}%`;
}

/**
 * Format currency with symbol and space thousands.
 * @param {number} n
 * @param {string} [symbol='€']
 * @param {number} [decimals=0]
 * @returns {string} e.g. "€12 345"
 */
export function fmtCurrency(n, symbol = '€', decimals = 0) {
    if (n == null || isNaN(n)) return '—';
    return `${symbol}${fmtNum(n, decimals)}`;
}

/**
 * Format emissions intensity (3 decimals).
 * @param {number} n
 * @returns {string} e.g. "1.350"
 */
export function fmtSEE(n) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toFixed(3);
}

/**
 * Format large currency values in millions.
 * @param {number} n
 * @param {string} [symbol='€']
 * @returns {string} e.g. "€12.3M"
 */
export function fmtMillions(n, symbol = '€') {
    if (n == null || isNaN(n)) return '—';
    return `${symbol}${(Number(n) / 1e6).toFixed(1)}M`;
}
