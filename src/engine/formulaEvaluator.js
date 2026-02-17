// ═══════════════════════════════════════════════════════════════
//  Safe Formula Evaluator — Tokenizer + Recursive Descent Parser
//  Evaluates math expressions without eval().
//  Supports: + - * / ^ ( ) and named variables.
// ═══════════════════════════════════════════════════════════════

// ─── Token Types ─────────────────────────────────────────────
const TOKEN = {
    NUMBER: 'NUMBER',
    IDENT: 'IDENT',
    PLUS: '+',
    MINUS: '-',
    STAR: '*',
    SLASH: '/',
    CARET: '^',
    LPAREN: '(',
    RPAREN: ')',
    EOF: 'EOF',
};

/**
 * Tokenize a formula string into an array of tokens.
 * @param {string} expr - Formula expression
 * @returns {Array<{type: string, value: any}>}
 */
function tokenize(expr) {
    const tokens = [];
    let i = 0;
    const len = expr.length;

    while (i < len) {
        const ch = expr[i];

        // Skip whitespace
        if (/\s/.test(ch)) { i++; continue; }

        // Numbers (including decimals like 0.001 or .5)
        if (/[0-9.]/.test(ch)) {
            let num = '';
            while (i < len && /[0-9.eE]/.test(expr[i])) {
                num += expr[i];
                i++;
            }
            const parsed = parseFloat(num);
            if (isNaN(parsed)) {
                return { tokens: null, error: `Invalid number: "${num}"` };
            }
            tokens.push({ type: TOKEN.NUMBER, value: parsed });
            continue;
        }

        // Identifiers (variable names: letters, digits, underscores)
        if (/[a-zA-Z_]/.test(ch)) {
            let ident = '';
            while (i < len && /[a-zA-Z0-9_]/.test(expr[i])) {
                ident += expr[i];
                i++;
            }
            tokens.push({ type: TOKEN.IDENT, value: ident });
            continue;
        }

        // Operators and parentheses
        if ('+-*/^()'.includes(ch)) {
            tokens.push({ type: ch, value: ch });
            i++;
            continue;
        }

        return { tokens: null, error: `Unexpected character: "${ch}"` };
    }

    tokens.push({ type: TOKEN.EOF, value: null });
    return { tokens, error: null };
}

// ─── Parser (Recursive Descent) ──────────────────────────────
// Grammar:
//   expression = term (('+' | '-') term)*
//   term       = power (('*' | '/') power)*
//   power      = unary ('^' power)?         (right-associative)
//   unary      = ('-')? primary
//   primary    = NUMBER | IDENT | '(' expression ')'

class Parser {
    constructor(tokens, variables) {
        this.tokens = tokens;
        this.variables = variables;
        this.pos = 0;
    }

    peek() { return this.tokens[this.pos]; }

    consume(expectedType) {
        const tok = this.tokens[this.pos];
        if (expectedType && tok.type !== expectedType) {
            throw new Error(`Expected ${expectedType} but got ${tok.type} ("${tok.value}")`);
        }
        this.pos++;
        return tok;
    }

    parse() {
        const result = this.expression();
        if (this.peek().type !== TOKEN.EOF) {
            throw new Error(`Unexpected token: "${this.peek().value}"`);
        }
        return result;
    }

    expression() {
        let left = this.term();
        while (this.peek().type === TOKEN.PLUS || this.peek().type === TOKEN.MINUS) {
            const op = this.consume().type;
            const right = this.term();
            left = op === TOKEN.PLUS ? left + right : left - right;
        }
        return left;
    }

    term() {
        let left = this.power();
        while (this.peek().type === TOKEN.STAR || this.peek().type === TOKEN.SLASH) {
            const op = this.consume().type;
            const right = this.power();
            left = op === TOKEN.STAR ? left * right : left / right;
        }
        return left;
    }

    power() {
        let base = this.unary();
        if (this.peek().type === TOKEN.CARET) {
            this.consume();
            const exp = this.power(); // right-associative
            base = Math.pow(base, exp);
        }
        return base;
    }

    unary() {
        if (this.peek().type === TOKEN.MINUS) {
            this.consume();
            return -this.primary();
        }
        return this.primary();
    }

    primary() {
        const tok = this.peek();

        if (tok.type === TOKEN.NUMBER) {
            this.consume();
            return tok.value;
        }

        if (tok.type === TOKEN.IDENT) {
            this.consume();
            const name = tok.value;
            if (!(name in this.variables)) {
                throw new Error(`Unknown variable: "${name}"`);
            }
            return Number(this.variables[name]) || 0;
        }

        if (tok.type === TOKEN.LPAREN) {
            this.consume(TOKEN.LPAREN);
            const val = this.expression();
            this.consume(TOKEN.RPAREN);
            return val;
        }

        throw new Error(`Unexpected token: "${tok.value}" (${tok.type})`);
    }
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Evaluate a math expression with named variables.
 *
 * @param {string} formula - Math expression (e.g. "a * b / 1000 * (c - d) * 44 / 12")
 * @param {Object} variables - Variable values (e.g. { a: 15200, b: 420, c: 0.95, d: 0.02 })
 * @returns {{ value: number|null, error: string|null }}
 */
export function evaluate(formula, variables = {}) {
    if (!formula || !formula.trim()) {
        return { value: 0, error: null };
    }

    try {
        const { tokens, error } = tokenize(formula);
        if (error) return { value: null, error };

        const parser = new Parser(tokens, variables);
        const value = parser.parse();

        if (!isFinite(value)) {
            return { value: null, error: 'Result is not a finite number (division by zero?)' };
        }

        return { value, error: null };
    } catch (err) {
        return { value: null, error: err.message };
    }
}

/**
 * Validate a formula without evaluating it.
 * Checks for syntax errors and unknown variables.
 *
 * @param {string} formula - Math expression
 * @param {string[]} knownKeys - List of valid variable names
 * @returns {{ valid: boolean, error: string|null, unknownVars: string[] }}
 */
export function validateFormula(formula, knownKeys = []) {
    if (!formula || !formula.trim()) {
        return { valid: true, error: null, unknownVars: [] };
    }

    const { tokens, error } = tokenize(formula);
    if (error) return { valid: false, error, unknownVars: [] };

    // Check for unknown variables
    const usedVars = tokens
        .filter(t => t.type === TOKEN.IDENT)
        .map(t => t.value);
    const knownSet = new Set(knownKeys);
    const unknownVars = [...new Set(usedVars.filter(v => !knownSet.has(v)))];

    if (unknownVars.length > 0) {
        return {
            valid: false,
            error: `Unknown variable(s): ${unknownVars.join(', ')}`,
            unknownVars,
        };
    }

    // Try parsing with dummy values
    const dummyVars = {};
    knownKeys.forEach(k => { dummyVars[k] = 1; });
    try {
        const parser = new Parser(tokens, dummyVars);
        parser.parse();
        return { valid: true, error: null, unknownVars: [] };
    } catch (err) {
        return { valid: false, error: err.message, unknownVars: [] };
    }
}

/**
 * Extract variable names from a formula string.
 *
 * @param {string} formula
 * @returns {string[]} list of variable names used in the formula
 */
export function extractVariables(formula) {
    if (!formula) return [];
    const { tokens } = tokenize(formula);
    if (!tokens) return [];
    return [...new Set(tokens.filter(t => t.type === TOKEN.IDENT).map(t => t.value))];
}
