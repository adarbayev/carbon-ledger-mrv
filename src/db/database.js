// ═══════════════════════════════════════════════════════════════
//  SQLite WASM Database Layer
//  Uses sql.js (SQLite compiled to WebAssembly)
//  Persists to IndexedDB as a serialized blob
// ═══════════════════════════════════════════════════════════════

import initSqlJs from 'sql.js';

const DB_NAME = 'carbon_ledger_db';
const DB_STORE = 'databases';
const DB_KEY = 'main';

let dbInstance = null;
let SQL = null;
let initPromise = null;  // Prevents double-init in StrictMode

// ─── Schema ──────────────────────────────────────────────────
import schemaSQL from './schema.sql?raw';

// ─── IndexedDB Helpers ───────────────────────────────────────

function openIDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(DB_STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function loadFromIDB() {
    try {
        const idb = await openIDB();
        return new Promise((resolve, reject) => {
            const tx = idb.transaction(DB_STORE, 'readonly');
            const store = tx.objectStore(DB_STORE);
            const request = store.get(DB_KEY);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch {
        return null;
    }
}

async function saveToIDB(data) {
    const idb = await openIDB();
    return new Promise((resolve, reject) => {
        const tx = idb.transaction(DB_STORE, 'readwrite');
        const store = tx.objectStore(DB_STORE);
        const request = store.put(data, DB_KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ─── Database Initialization ─────────────────────────────────

/**
 * Initialize the SQLite database.
 * Uses a promise lock to prevent double-init in React StrictMode.
 */
export async function initDatabase() {
    // Return existing instance
    if (dbInstance) return dbInstance;

    // If already initializing, wait for that to complete (StrictMode guard)
    if (initPromise) return initPromise;

    initPromise = _doInit();
    try {
        const result = await initPromise;
        return result;
    } finally {
        // Don't clear initPromise — keep it so subsequent calls reuse
    }
}

async function _doInit() {
    // Load sql.js WASM binary from local public folder
    if (!SQL) {
        SQL = await initSqlJs({
            locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm`
        });
    }

    // Try to restore from IndexedDB
    const savedData = await loadFromIDB();
    if (savedData) {
        dbInstance = new SQL.Database(new Uint8Array(savedData));
        console.log('[DB] Restored from IndexedDB');
    } else {
        // Fresh database — run schema
        dbInstance = new SQL.Database();
        dbInstance.run(schemaSQL);
        console.log('[DB] Created fresh database with schema');
    }

    return dbInstance;
}

/**
 * Get the current database instance.
 */
export function getDb() {
    if (!dbInstance) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return dbInstance;
}

/**
 * Persist the current database state to IndexedDB.
 */
export async function persistDatabase() {
    if (!dbInstance) return;
    const data = dbInstance.export();
    await saveToIDB(data.buffer);
    console.log('[DB] Persisted to IndexedDB');
}

/**
 * Reset the database — drop everything, re-run schema.
 */
export async function resetDatabase() {
    if (!SQL) {
        SQL = await initSqlJs({
            locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm`
        });
    }

    // Create fresh database
    dbInstance = new SQL.Database();
    dbInstance.run(schemaSQL);
    await persistDatabase();
    console.log('[DB] Database reset complete');
    return dbInstance;
}

/**
 * Execute a SELECT query and return results as array of objects.
 * Uses prepare/bind/step pattern for reliable parameter binding.
 */
export function query(sql, params = []) {
    const db = getDb();
    const stmt = db.prepare(sql);
    if (params.length > 0) {
        stmt.bind(params);
    }

    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

/**
 * Execute a write statement (INSERT, UPDATE, DELETE).
 * Uses explicit prepare/bind/step/free to avoid db.run() parameter issues.
 */
export function execute(sql, params = []) {
    const db = getDb();
    if (params.length > 0) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        stmt.step();
        stmt.free();
    } else {
        db.run(sql);
    }
    return db.getRowsModified();
}

/**
 * Generate a unique ID (UUID v4).
 */
export function generateId(prefix = '') {
    const id = crypto.randomUUID ? crypto.randomUUID() :
        'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
    return prefix ? `${prefix}_${id}` : id;
}
