// ═══════════════════════════════════════════════════════════════
//  Data Access Layer (DAL)
//  CRUD with versioning + audit logging
// ═══════════════════════════════════════════════════════════════

import { query, execute, generateId } from './database.js';

// ─── Audit Logging ───────────────────────────────────────────

export function logAudit({ entityType, entityId, action, fieldName = null, oldValue = null, newValue = null, changedBy = 'user', reason = null }) {
    execute(
        `INSERT INTO audit_log (entity_type, entity_id, action, field_name, old_value, new_value, changed_by, change_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [entityType, entityId, action, fieldName, oldValue != null ? String(oldValue) : null, newValue != null ? String(newValue) : null, changedBy, reason]
    );
}

export function getAuditLog({ limit = 100, offset = 0, entityType = null, entityId = null } = {}) {
    let sql = 'SELECT * FROM audit_log WHERE 1=1';
    const params = [];
    if (entityType) { sql += ' AND entity_type = ?'; params.push(entityType); }
    if (entityId) { sql += ' AND entity_id LIKE ?'; params.push(`%${entityId}%`); }
    sql += ' ORDER BY changed_at DESC, id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    return query(sql, params);
}

export function getAuditEntryCount({ entityType = null, entityId = null } = {}) {
    let sql = 'SELECT COUNT(*) as cnt FROM audit_log WHERE 1=1';
    const params = [];
    if (entityType) { sql += ' AND entity_type = ?'; params.push(entityType); }
    if (entityId) { sql += ' AND entity_id LIKE ?'; params.push(`%${entityId}%`); }
    const rows = query(sql, params);
    return rows[0]?.cnt || 0;
}

export function getAuditEntityTypes() {
    return query('SELECT DISTINCT entity_type FROM audit_log ORDER BY entity_type').map(r => r.entity_type);
}

// ─── Generic Versioned Record Helpers ────────────────────────

/**
 * Get the latest version of each record in a versioned table for a period.
 */
function getLatestVersions(table, periodFilter = null) {
    let sql = `
        SELECT t.* FROM ${table} t
        INNER JOIN (
            SELECT stable_id, MAX(version_number) as max_v
            FROM ${table}
            ${periodFilter ? 'WHERE period = ?' : ''}
            GROUP BY stable_id
        ) latest ON t.stable_id = latest.stable_id AND t.version_number = latest.max_v
    `;
    return query(sql, periodFilter ? [periodFilter] : []);
}

/**
 * Get all versions of a specific record.
 */
function getVersionHistory(table, stableId) {
    return query(`SELECT * FROM ${table} WHERE stable_id = ? ORDER BY version_number DESC`, [stableId]);
}

/**
 * Insert a new version of a record, log audit.
 */
function insertVersion(table, entityType, stableId, data, userId = 'user') {
    // Get current max version
    const current = query(
        `SELECT version_id, version_number FROM ${table} WHERE stable_id = ? ORDER BY version_number DESC LIMIT 1`,
        [stableId]
    );

    const prevVersionId = current.length > 0 ? current[0].version_id : null;
    const newVersionNum = current.length > 0 ? current[0].version_number + 1 : 1;
    const versionId = `${stableId}_v${newVersionNum}`;

    return { versionId, versionNumber: newVersionNum, prevVersionId };
}

// ─── Installation ────────────────────────────────────────────

export function getInstallation(id = 'default') {
    const results = query('SELECT * FROM installations WHERE id = ?', [id]);
    return results[0] || null;
}

export function saveInstallation(data) {
    const existing = getInstallation(data.id || 'default');
    if (existing) {
        execute(
            'UPDATE installations SET name = ?, country = ?, period_start = ?, period_end = ? WHERE id = ?',
            [data.name, data.country, data.periodStart, data.periodEnd, data.id || 'default']
        );
        logAudit({ entityType: 'installation', entityId: data.id || 'default', action: 'UPDATE' });
    } else {
        execute(
            'INSERT INTO installations (id, name, country, period_start, period_end) VALUES (?, ?, ?, ?, ?)',
            [data.id || 'default', data.name, data.country, data.periodStart, data.periodEnd]
        );
        logAudit({ entityType: 'installation', entityId: data.id || 'default', action: 'CREATE' });
    }
}

// ─── Boundaries ──────────────────────────────────────────────

export function getBoundaries(installationId = 'default') {
    return query('SELECT * FROM boundaries WHERE installation_id = ?', [installationId]);
}

export function saveBoundary(data) {
    const existing = query('SELECT * FROM boundaries WHERE id = ?', [data.id]);
    if (existing.length > 0) {
        execute(
            'UPDATE boundaries SET name = ?, included = ?, notes = ?, evidence = ? WHERE id = ?',
            [data.name, data.included ? 1 : 0, data.notes, data.evidence, data.id]
        );
        logAudit({ entityType: 'boundary', entityId: data.id, action: 'UPDATE' });
    } else {
        const id = data.id || generateId('b');
        execute(
            'INSERT INTO boundaries (id, installation_id, name, included, notes, evidence) VALUES (?, ?, ?, ?, ?, ?)',
            [id, data.installationId || 'default', data.name, data.included ? 1 : 0, data.notes || '', data.evidence || '']
        );
        logAudit({ entityType: 'boundary', entityId: id, action: 'CREATE' });
        return id;
    }
    return data.id;
}

export function deleteBoundary(id) {
    execute('DELETE FROM boundaries WHERE id = ?', [id]);
    logAudit({ entityType: 'boundary', entityId: id, action: 'DELETE' });
}

// ─── Processes ───────────────────────────────────────────────

export function getProcesses(installationId = 'default') {
    return query('SELECT * FROM processes WHERE installation_id = ?', [installationId]);
}

export function saveProcess(data) {
    const existing = query('SELECT * FROM processes WHERE id = ?', [data.id]);
    if (existing.length > 0) {
        execute(
            'UPDATE processes SET name = ?, description = ?, category = ?, active = ? WHERE id = ?',
            [data.name, data.description, data.category || 'Core', data.active ? 1 : 0, data.id]
        );
        logAudit({ entityType: 'process', entityId: data.id, action: 'UPDATE' });
    } else {
        const id = data.id || generateId('P');
        execute(
            'INSERT INTO processes (id, installation_id, name, description, category, active) VALUES (?, ?, ?, ?, ?, ?)',
            [id, data.installationId || 'default', data.name, data.description || '', data.category || 'Core', data.active !== false ? 1 : 0]
        );
        logAudit({ entityType: 'process', entityId: id, action: 'CREATE' });
        return id;
    }
    return data.id;
}

export function deleteProcess(id) {
    execute('DELETE FROM processes WHERE id = ?', [id]);
    logAudit({ entityType: 'process', entityId: id, action: 'DELETE' });
}

// ─── Fuel Entries (Versioned) ────────────────────────────────

export function getFuelEntries(period = null) {
    if (period) {
        return getLatestVersions('fuel_entries', period);
    }
    // Get latest version of each entry regardless of period
    return query(`
        SELECT t.* FROM fuel_entries t
        INNER JOIN (
            SELECT stable_id, MAX(version_number) as max_v
            FROM fuel_entries GROUP BY stable_id
        ) latest ON t.stable_id = latest.stable_id AND t.version_number = latest.max_v
    `);
}

export function saveFuelEntry(data, userId = 'user') {
    const stableId = data.stableId || data.id || generateId('f');
    const { versionId, versionNumber, prevVersionId } = insertVersion('fuel_entries', 'fuel_entry', stableId, data, userId);

    execute(
        `INSERT INTO fuel_entries (version_id, stable_id, version_number, period, process_id, fuel_type_id, quantity, unit, custom_ncv, custom_ef_co2, custom_ef_ch4, custom_ef_n2o, evidence, notes, created_by, supersedes_version_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [versionId, stableId, versionNumber, data.period, data.processId, data.fuelTypeId, data.quantity || 0, data.unit || 't', data.customNcv || null, data.customEfCo2 || null, data.customEfCh4 || null, data.customEfN2o || null, data.evidence || '', data.notes || '', userId, prevVersionId]
    );

    logAudit({ entityType: 'fuel_entry', entityId: stableId, action: versionNumber === 1 ? 'CREATE' : 'UPDATE', changedBy: userId });
    return { stableId, versionId };
}

export function deleteFuelEntry(stableId) {
    execute('DELETE FROM fuel_entries WHERE stable_id = ?', [stableId]);
    logAudit({ entityType: 'fuel_entry', entityId: stableId, action: 'DELETE' });
}

export function getFuelVersionHistory(stableId) {
    return getVersionHistory('fuel_entries', stableId);
}

// ─── Electricity Entries (Versioned) ─────────────────────────

export function getElectricityEntries(period = null) {
    if (period) {
        return getLatestVersions('electricity_entries', period);
    }
    return query(`
        SELECT t.* FROM electricity_entries t
        INNER JOIN (
            SELECT stable_id, MAX(version_number) as max_v
            FROM electricity_entries GROUP BY stable_id
        ) latest ON t.stable_id = latest.stable_id AND t.version_number = latest.max_v
    `);
}

export function saveElectricityEntry(data, userId = 'user') {
    const stableId = data.stableId || data.id || generateId('e');
    const { versionId, versionNumber, prevVersionId } = insertVersion('electricity_entries', 'electricity_entry', stableId, data, userId);

    execute(
        `INSERT INTO electricity_entries (version_id, stable_id, version_number, period, process_id, mwh, grid_country, ef, ef_override, evidence, notes, created_by, supersedes_version_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [versionId, stableId, versionNumber, data.period, data.processId, data.mwh || 0, data.gridCountry || 'OTHER', data.ef || 0, data.efOverride ? 1 : 0, data.evidence || '', data.notes || '', userId, prevVersionId]
    );

    logAudit({ entityType: 'electricity_entry', entityId: stableId, action: versionNumber === 1 ? 'CREATE' : 'UPDATE', changedBy: userId });
    return { stableId, versionId };
}

export function deleteElectricityEntry(stableId) {
    execute('DELETE FROM electricity_entries WHERE stable_id = ?', [stableId]);
    logAudit({ entityType: 'electricity_entry', entityId: stableId, action: 'DELETE' });
}

// ─── Process Events (Versioned) ──────────────────────────────

export function getProcessEvents(period = null) {
    if (period) {
        return getLatestVersions('process_events', period);
    }
    return query(`
        SELECT t.* FROM process_events t
        INNER JOIN (
            SELECT stable_id, MAX(version_number) as max_v
            FROM process_events GROUP BY stable_id
        ) latest ON t.stable_id = latest.stable_id AND t.version_number = latest.max_v
    `);
}

export function saveProcessEvent(data, userId = 'user') {
    const stableId = data.stableId || data.id || generateId('pe');
    const { versionId, versionNumber, prevVersionId } = insertVersion('process_events', 'process_event', stableId, data, userId);

    execute(
        `INSERT INTO process_events (version_id, stable_id, version_number, period, process_id, event_type, parameter, value, unit, data_source, evidence, created_by, supersedes_version_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [versionId, stableId, versionNumber, data.period, data.processId, data.eventType, data.parameter, data.value || 0, data.unit || '', data.dataSource || '', data.evidence || '', userId, prevVersionId]
    );

    logAudit({ entityType: 'process_event', entityId: stableId, action: versionNumber === 1 ? 'CREATE' : 'UPDATE', changedBy: userId });
    return { stableId, versionId };
}

export function deleteProcessEvent(stableId) {
    execute('DELETE FROM process_events WHERE stable_id = ?', [stableId]);
    logAudit({ entityType: 'process_event', entityId: stableId, action: 'DELETE' });
}

// ─── Emission Blocks (Formula-Based Process Emissions) ───────

export function getEmissionBlocks(installationId = 'default', period = null) {
    let sql = 'SELECT * FROM emission_blocks WHERE installation_id = ?';
    const params = [installationId];
    if (period) { sql += ' AND period = ?'; params.push(period); }
    sql += ' ORDER BY period, created_at';
    const rows = query(sql, params);
    return rows.map(r => ({
        ...r,
        parameters: JSON.parse(r.parameters || '[]'),
    }));
}

export function saveEmissionBlock(data) {
    const id = data.id || generateId('eb');
    execute(
        `INSERT INTO emission_blocks (id, installation_id, period, process_id, template_id, name, output_gas, formula, formula_display, parameters, source, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, data.installationId || 'default', data.period, data.processId || null, data.templateId || null, data.name, data.outputGas || 'CO2', data.formula || '', data.formulaDisplay || '', JSON.stringify(data.parameters || []), data.source || '', data.notes || '', data.createdBy || 'user']
    );
    logAudit({ entityType: 'emission_block', entityId: id, action: 'CREATE' });
    return id;
}

export function updateEmissionBlock(id, data) {
    execute(
        `UPDATE emission_blocks SET name = ?, output_gas = ?, formula = ?, formula_display = ?, parameters = ?, source = ?, notes = ?, process_id = ?, period = ?, template_id = ? WHERE id = ?`,
        [data.name, data.outputGas || 'CO2', data.formula || '', data.formulaDisplay || '', JSON.stringify(data.parameters || []), data.source || '', data.notes || '', data.processId || null, data.period, data.templateId || null, id]
    );
    logAudit({ entityType: 'emission_block', entityId: id, action: 'UPDATE' });
}

export function deleteEmissionBlock(id) {
    execute('DELETE FROM emission_blocks WHERE id = ?', [id]);
    logAudit({ entityType: 'emission_block', entityId: id, action: 'DELETE' });
}

// ─── Products ────────────────────────────────────────────────

export function getProducts(installationId = 'default') {
    return query('SELECT * FROM products WHERE installation_id = ?', [installationId]);
}

export function saveProduct(data) {
    const existing = query('SELECT * FROM products WHERE id = ?', [data.id]);
    if (existing.length > 0) {
        execute(
            'UPDATE products SET name = ?, cn_code = ?, is_residue = ? WHERE id = ?',
            [data.name, data.cnCode || '', data.isResidue ? 1 : 0, data.id]
        );
        logAudit({ entityType: 'product', entityId: data.id, action: 'UPDATE' });
    } else {
        const id = data.id || generateId('pr');
        execute(
            'INSERT INTO products (id, installation_id, name, cn_code, is_residue) VALUES (?, ?, ?, ?, ?)',
            [id, data.installationId || 'default', data.name, data.cnCode || '', data.isResidue ? 1 : 0]
        );
        logAudit({ entityType: 'product', entityId: id, action: 'CREATE' });
        return id;
    }
    return data.id;
}

export function deleteProduct(id) {
    execute('DELETE FROM products WHERE id = ?', [id]);
    logAudit({ entityType: 'product', entityId: id, action: 'DELETE' });
}

// ─── Production Output (Versioned) ──────────────────────────

export function getProductionOutput(period = null) {
    if (period) {
        return getLatestVersions('production_output', period);
    }
    return query(`
        SELECT t.* FROM production_output t
        INNER JOIN (
            SELECT stable_id, MAX(version_number) as max_v
            FROM production_output GROUP BY stable_id
        ) latest ON t.stable_id = latest.stable_id AND t.version_number = latest.max_v
    `);
}

export function saveProductionOutput(data, userId = 'user') {
    const stableId = data.stableId || data.id || generateId('po');
    const { versionId, versionNumber, prevVersionId } = insertVersion('production_output', 'production_output', stableId, data, userId);

    execute(
        `INSERT INTO production_output (version_id, stable_id, version_number, period, product_id, process_id, quantity, data_source, evidence, created_by, supersedes_version_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [versionId, stableId, versionNumber, data.period, data.productId, data.processId, data.quantity || 0, data.dataSource || '', data.evidence || '', userId, prevVersionId]
    );

    logAudit({ entityType: 'production_output', entityId: stableId, action: versionNumber === 1 ? 'CREATE' : 'UPDATE', changedBy: userId });
    return { stableId, versionId };
}

// ─── Emission Factors ────────────────────────────────────────

export function getEmissionFactors(fuelType = null) {
    if (fuelType) {
        return query('SELECT * FROM emission_factors WHERE fuel_type = ?', [fuelType]);
    }
    return query('SELECT * FROM emission_factors');
}

export function getGwpSet(id = 'AR6') {
    const results = query('SELECT * FROM gwp_sets WHERE id = ?', [id]);
    return results[0] || null;
}

// ─── CBAM Settings ───────────────────────────────────────────

export function getCbamSettings() {
    const results = query('SELECT * FROM cbam_settings WHERE id = ?', ['default']);
    return results[0] || null;
}

export function saveCbamSettings(data) {
    const existing = getCbamSettings();
    if (existing) {
        execute(
            `UPDATE cbam_settings SET basis = ?, scope = ?, cert_price_scenario = ?, al_price_scenario = ?, carbon_credit_eligible = ?, carbon_credit_scenario = ?, imported_qty = ?, cn_code = ?, good_category = ? WHERE id = 'default'`,
            [data.basis, data.scope, data.certPriceScenario, data.alPriceScenario, data.carbonCreditEligible ? 1 : 0, data.carbonCreditScenario, data.importedQty, data.cnCode, data.goodCategory]
        );
    } else {
        execute(
            `INSERT INTO cbam_settings (id, basis, scope, cert_price_scenario, al_price_scenario, carbon_credit_eligible, carbon_credit_scenario, imported_qty, cn_code, good_category) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.basis, data.scope, data.certPriceScenario, data.alPriceScenario, data.carbonCreditEligible ? 1 : 0, data.carbonCreditScenario, data.importedQty, data.cnCode, data.goodCategory]
        );
    }
}

// ─── Allocation Settings ─────────────────────────────────────

export function getAllocationSettings() {
    const results = query('SELECT * FROM allocation_settings WHERE id = ?', ['default']);
    return results[0] || { method: 'mass', treat_residue_as_waste: 1 };
}

export function saveAllocationSettings(data) {
    execute(
        `INSERT OR REPLACE INTO allocation_settings (id, method, treat_residue_as_waste) VALUES ('default', ?, ?)`,
        [data.method || 'mass', data.treatResidueAsWaste ? 1 : 0]
    );
}

// ─── Calculation Runs ────────────────────────────────────────

export function saveCalculationRun(run) {
    execute(
        `INSERT INTO calculation_runs (run_id, period_start, period_end, gwp_set_id, created_by, input_snapshot, factor_snapshot, results, lineage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [run.runId, run.periodStart, run.periodEnd, run.gwpSetId || 'AR6', run.createdBy || 'user',
        JSON.stringify(run.inputSnapshot), JSON.stringify(run.factorSnapshot), JSON.stringify(run.results), JSON.stringify(run.lineage)]
    );
    logAudit({ entityType: 'calculation_run', entityId: run.runId, action: 'CREATE' });
}

export function getCalculationRuns() {
    return query('SELECT * FROM calculation_runs ORDER BY created_at DESC');
}

export function getCalculationRun(runId) {
    const results = query('SELECT * FROM calculation_runs WHERE run_id = ?', [runId]);
    if (results.length === 0) return null;
    const run = results[0];
    // Parse JSON blobs
    run.inputSnapshot = JSON.parse(run.input_snapshot || '{}');
    run.factorSnapshot = JSON.parse(run.factor_snapshot || '{}');
    run.results = JSON.parse(run.results || '{}');
    run.lineage = JSON.parse(run.lineage || '{}');
    return run;
}

