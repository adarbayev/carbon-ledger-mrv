// ═══════════════════════════════════════════════════════════════
//  App Context — SQLite-backed state management
//  Thin React wrapper around the Data Access Layer (DAL)
//  Replaces localStorage with sql.js / IndexedDB persistence
// ═══════════════════════════════════════════════════════════════

import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import { initDatabase, persistDatabase, resetDatabase } from '../db/database.js';
import { seedDemoData } from '../db/seed.js';
import * as DAL from '../db/dal.js';
import { getCnCodeInfo, getGridEf } from '../data/referenceData';
import { getDefaultScope } from '../data/cbamReferenceData';
import { getAutoScope } from '../data/cbamDefaultValues';

const AppContext = createContext();

// ─── Build state snapshot from SQLite ────────────────────────
// Reads all tables and builds a state object matching the shape
// that existing views expect.

function buildStateFromDB(installationId = 'default') {
    const installation = DAL.getInstallation(installationId);
    const boundaries = DAL.getBoundaries(installationId);
    const processes = DAL.getProcesses(installationId);
    const fuels = DAL.getFuelEntries(installationId);
    const electricity = DAL.getElectricityEntries(installationId);
    const processEvents = DAL.getProcessEvents(installationId);
    const emissionBlocks = DAL.getEmissionBlocks(installationId);
    const products = DAL.getProducts(installationId);
    const productionOutput = DAL.getProductionOutput(installationId);
    const cbamSettings = DAL.getCbamSettings(installationId);
    const allocSettings = DAL.getAllocationSettings(installationId);

    // Get section workflows for the current period
    // The period is determined by the installation metadata
    const period = installation ? `${installation.period_start}_${installation.period_end}` : '2025-01_2025-03';
    const sectionWorkflowsDb = DAL.getSectionWorkflows(installationId, period) || [];
    const sectionWorkflows = {
        fuels: 'DRAFT',
        electricity: 'DRAFT',
        process_emissions: 'DRAFT'
    };
    sectionWorkflowsDb.forEach(sw => {
        sectionWorkflows[sw.section] = sw.status;
    });

    // Load all installations for the switcher list
    const installationsList = DAL.getInstallations().map(inst => ({
        id: inst.id,
        name: inst.name,
        country: inst.country,
        isFinalProducer: inst.is_final_producer === 1
    }));

    const crossSiteProducts = DAL.getCrossSiteProducts(installationId).map(p => ({
        id: p.id,
        installationId: p.installation_id,
        installationName: p.installation_name,
        name: p.name,
        cnCode: p.cn_code,
        isResidue: !!p.is_residue
    }));

    // Map DB rows to view-compatible shapes
    return {
        activeInstallationId: installationId,
        installationsList: installationsList,
        crossSiteProducts: crossSiteProducts,
        meta: installation ? {
            installationName: installation.name,
            country: installation.country,
            periodStart: installation.period_start,
            periodEnd: installation.period_end,
            isFinalProducer: installation.is_final_producer === 1,
            workflowStatus: installation.workflow_status || 'DRAFT',
            reviewerName: installation.reviewer_name || '',
            reviewDate: installation.review_date || '',
            submitDate: installation.submit_date || '',
            lastSaved: null,
        } : {
            installationName: 'New Installation',
            country: 'KAZ',
            periodStart: '2025-01',
            periodEnd: '2025-03',
            isFinalProducer: true,
            workflowStatus: 'DRAFT',
            reviewerName: '',
            reviewDate: '',
            submitDate: '',
            lastSaved: null,
        },
        boundaries: boundaries.length > 0 ? boundaries.map(b => {
            // Map legacy names to translation keys
            const nameKeyMap = {
                'Electrolysis potlines': 'electrolysis',
                'Casting & ingot line': 'casting',
                'Off-gas collection & dry scrubbing': 'scrubbing',
                'Fuel combustion (boilers/heaters)': 'combustion',
                'Anode baking plant': 'anode',
                'Grid electricity import': 'grid'
            };
            const key = nameKeyMap[b.name];
            return {
                id: b.id,
                key: key,
                name: b.name,
                included: !!b.included,
                notes: b.notes || '',
                evidence: b.evidence || '',
            };
        }) : [
            { id: 'b1', key: 'electrolysis', name: 'Electrolysis potlines', included: true, notes: '', evidence: '' },
            { id: 'b2', key: 'casting', name: 'Casting & ingot line', included: true, notes: '', evidence: '' },
            { id: 'b3', key: 'scrubbing', name: 'Off-gas collection & dry scrubbing', included: true, notes: '', evidence: '' },
            { id: 'b4', key: 'combustion', name: 'Fuel combustion (boilers/heaters)', included: true, notes: '', evidence: '' },
            { id: 'b5', key: 'anode', name: 'Anode baking plant', included: false, notes: 'Not required for CBAM ingots (simple goods)', evidence: '' },
            { id: 'b6', key: 'grid', name: 'Grid electricity import', included: true, notes: '', evidence: '' },
        ],
        processes: processes.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            category: p.category || 'Core',
            active: !!p.active,
        })),
        activity: {
            fuels: fuels.map(f => ({
                id: f.stable_id,
                period: f.period,
                processId: f.process_id,
                fuelTypeId: f.fuel_type_id,
                quantity: f.quantity || 0,
                unit: f.unit || 't',
                evidence: f.evidence || '',
                customNcv: f.custom_ncv || 0,
                customEf: f.custom_ef_co2 || 0,
                customEfCo2: f.custom_ef_co2 || 0,
                customEfCh4: f.custom_ef_ch4 || 0,
                customEfN2o: f.custom_ef_n2o || 0,
                notes: f.notes || '',
                _versionId: f.version_id,
                _versionNumber: f.version_number,
            })),
            electricity: electricity.map(e => ({
                id: e.stable_id,
                period: e.period,
                processId: e.process_id,
                mwh: e.mwh || 0,
                gridCountry: e.grid_country || 'OTHER',
                ef: e.ef || 0,
                efOverride: !!e.ef_override,
                evidence: e.evidence || '',
                notes: e.notes || '',
                _versionId: e.version_id,
                _versionNumber: e.version_number,
            })),
        },
        processEvents: processEvents.map(pe => ({
            id: pe.stable_id,
            period: pe.period,
            processId: pe.process_id,
            eventType: pe.event_type,
            parameter: pe.parameter,
            value: pe.value || 0,
            unit: pe.unit || '',
            dataSource: pe.data_source || '',
            evidence: pe.evidence || '',
            _versionId: pe.version_id,
            _versionNumber: pe.version_number,
        })),
        emissionBlocks: emissionBlocks.map(eb => ({
            id: eb.id,
            period: eb.period,
            processId: eb.process_id,
            templateId: eb.template_id || null,
            name: eb.name,
            outputGas: eb.output_gas || 'CO2',
            formula: eb.formula || '',
            formulaDisplay: eb.formula_display || '',
            parameters: eb.parameters || [],
            source: eb.source || '',
            notes: eb.notes || '',
        })),
        products: products.map(p => {
            const precursors = DAL.getPrecursors(p.id).map(pc => ({
                id: pc.id,
                productId: pc.product_id,
                name: pc.name,
                cnCode: pc.cn_code,
                mass: pc.mass || 0,
                see: pc.see || 0,
                sourceType: pc.source_type || 'actual',
                sourceInstallationId: pc.source_installation_id || null,
                sourceProductId: pc.source_product_id || null
            }));

            return {
                id: p.id,
                name: p.name,
                quantity: 0,  // Will be summed from production output below
                isResidue: !!p.is_residue,
                cnCode: p.cn_code || '',
                precursors: precursors,
            };
        }),
        productionOutput: productionOutput.map(po => ({
            id: po.stable_id,
            period: po.period,
            productId: po.product_id,
            processId: po.process_id,
            quantity: po.quantity || 0,
            dataSource: po.data_source || '',
            _versionId: po.version_id,
        })),
        allocationSettings: {
            method: allocSettings?.method || 'mass',
            treatResidueAsWaste: !!(allocSettings?.treat_residue_as_waste),
        },
        // ... (lines 168-169)
        cbamSettings: cbamSettings ? (() => {
            // Clean CN code for lookup
            const rawCn = cbamSettings?.cn_code || '7601';
            const cleanCn = String(rawCn).replace(/[^0-9]/g, '');
            return {
                basis: cbamSettings.basis || 'ACTUAL',
                scope: getAutoScope(cleanCn),
                certPriceScenario: cbamSettings.cert_price_scenario || 'MID',
                alPriceScenario: cbamSettings.al_price_scenario || 'MID',
                carbonCreditEligible: !!cbamSettings.carbon_credit_eligible,
                carbonCreditScenario: cbamSettings.carbon_credit_scenario || 'HIGH',
                importedQty: cbamSettings.imported_qty || 110000,
                cnCode: rawCn,
                goodCategory: cbamSettings.good_category || 'Aluminium',
            };
        })() : {
            basis: 'ACTUAL', scope: getAutoScope('7601'), certPriceScenario: 'MID',
            alPriceScenario: 'MID', carbonCreditEligible: true, carbonCreditScenario: 'HIGH',
            importedQty: 110000, cnCode: '7601', goodCategory: 'Aluminium',
        },
        isDirty: false,
        activeTab: 'dashboard',
        sectionWorkflows: sectionWorkflows,
    };
}

// Sum production output quantities into products
function enrichProductQuantities(state) {
    const outputByProduct = {};
    (state.productionOutput || []).forEach(po => {
        outputByProduct[po.productId] = (outputByProduct[po.productId] || 0) + po.quantity;
    });
    return {
        ...state,
        products: state.products.map(p => ({
            ...p,
            quantity: outputByProduct[p.id] || p.quantity || 0,
        })),
    };
}

// ─── Reducer ─────────────────────────────────────────────────
// Still synchronous for React rendering; DAL writes happen
// in the dispatch wrapper.

const reducer = (state, action) => {
    const markDirty = (s) => ({ ...s, isDirty: true });

    switch (action.type) {
        case 'LOAD_STATE':
            return { ...action.payload, isDirty: false };
        case 'RESET_STATE':
            return { ...action.payload, isDirty: false };
        case 'SET_TAB':
            return { ...state, activeTab: action.payload };
        case 'SET_WORKFLOW_STATUS': {
            const newStatus = action.payload.status;
            const now = new Date().toISOString();
            const updatedMeta = {
                ...state.meta,
                workflowStatus: newStatus,
            };
            if (newStatus === 'APPROVED') {
                updatedMeta.reviewerName = action.payload.reviewer || state.meta.reviewerName;
                updatedMeta.reviewDate = now;
            }
            if (newStatus === 'SUBMITTED') {
                updatedMeta.submitDate = now;
            }
            return markDirty({ ...state, meta: updatedMeta });
        }
        case 'SET_SECTION_WORKFLOW_STATUS': {
            const { period, section, status } = action.payload;
            return markDirty({
                ...state,
                sectionWorkflows: {
                    ...state.sectionWorkflows,
                    [section]: status
                }
            });
        }

        // --- META ---
        case 'UPDATE_META': {
            const newState = markDirty({
                ...state,
                meta: { ...state.meta, [action.payload.field]: action.payload.value }
            });

            // Auto-sync: If country changes, update all electricity entries that haven't been overridden
            if (action.payload.field === 'country') {
                const newCountry = action.payload.value;
                const newEf = getGridEf(newCountry);

                newState.activity = {
                    ...newState.activity,
                    electricity: newState.activity.electricity.map(e => {
                        // Only update if EF hasn't been manually overridden
                        if (!e.efOverride) {
                            return { ...e, gridCountry: newCountry, ef: newEf };
                        }
                        return e;
                    })
                };
            }
            return newState;
        }

        // --- BOUNDARIES ---
        case 'UPDATE_BOUNDARY':
            return markDirty({
                ...state,
                boundaries: state.boundaries.map(b =>
                    b.id === action.payload.id ? { ...b, [action.payload.field]: action.payload.value } : b
                )
            });

        // --- PROCESSES ---
        case 'ADD_PROCESS': {
            const nextNum = state.processes.length + 1;
            const newProcess = action.payload || {
                id: `P${String(nextNum).padStart(2, '0')}`,
                name: `Process ${nextNum}`,
                description: '',
                active: true,
            };
            return markDirty({
                ...state,
                processes: [...state.processes, newProcess]
            });
        }
        case 'UPDATE_PROCESS':
            return markDirty({
                ...state,
                processes: state.processes.map(p =>
                    p.id === action.payload.id ? { ...p, [action.payload.field]: action.payload.value } : p
                )
            });
        case 'DELETE_PROCESS':
            return markDirty({
                ...state,
                processes: state.processes.filter(p => p.id !== action.payload)
            });

        // --- FUELS ---
        case 'ADD_FUEL':
            return markDirty({
                ...state,
                activity: {
                    ...state.activity,
                    fuels: [...state.activity.fuels, action.payload]
                }
            });
        case 'UPDATE_FUEL':
            return markDirty({
                ...state,
                activity: {
                    ...state.activity,
                    fuels: state.activity.fuels.map(f =>
                        f.id === action.payload.id ? {
                            ...f,
                            [action.payload.field]: ['quantity', 'customNcv', 'customEf', 'customEfCo2', 'customEfCh4', 'customEfN2o'].includes(action.payload.field)
                                ? (parseFloat(action.payload.value) || 0) : action.payload.value
                        } : f
                    )
                }
            });
        case 'DELETE_FUEL':
            return markDirty({
                ...state,
                activity: {
                    ...state.activity,
                    fuels: state.activity.fuels.filter(f => f.id !== action.payload)
                }
            });

        // --- ELECTRICITY ---
        case 'ADD_ELEC':
            return markDirty({
                ...state,
                activity: {
                    ...state.activity,
                    electricity: [...state.activity.electricity, action.payload]
                }
            });
        case 'UPDATE_ELEC':
            return markDirty({
                ...state,
                activity: {
                    ...state.activity,
                    electricity: state.activity.electricity.map(e =>
                        e.id === action.payload.id ? {
                            ...e,
                            [action.payload.field]: ['mwh', 'ef'].includes(action.payload.field) ? (parseFloat(action.payload.value) || 0) : action.payload.value
                        } : e
                    )
                }
            });
        case 'DELETE_ELEC':
            return markDirty({
                ...state,
                activity: {
                    ...state.activity,
                    electricity: state.activity.electricity.filter(e => e.id !== action.payload)
                }
            });

        // --- PROCESS EVENTS ---
        case 'ADD_PROCESS_EVENT':
            return markDirty({
                ...state,
                processEvents: [...(state.processEvents || []), action.payload]
            });
        case 'UPDATE_PROCESS_EVENT':
            return markDirty({
                ...state,
                processEvents: (state.processEvents || []).map(pe =>
                    pe.id === action.payload.id ? {
                        ...pe,
                        [action.payload.field]: ['value'].includes(action.payload.field)
                            ? (parseFloat(action.payload.value) || 0) : action.payload.value
                    } : pe
                )
            });
        case 'DELETE_PROCESS_EVENT':
            return markDirty({
                ...state,
                processEvents: (state.processEvents || []).filter(pe => pe.id !== action.payload)
            });

        // --- EMISSION BLOCKS ---
        case 'ADD_EMISSION_BLOCK':
            return markDirty({
                ...state,
                emissionBlocks: [...(state.emissionBlocks || []), action.payload]
            });
        case 'UPDATE_EMISSION_BLOCK':
            return markDirty({
                ...state,
                emissionBlocks: (state.emissionBlocks || []).map(eb =>
                    eb.id === action.payload.id ? { ...eb, ...action.payload.data } : eb
                )
            });
        case 'UPDATE_BLOCK_PARAM': {
            const { blockId, paramKey, value } = action.payload;
            return markDirty({
                ...state,
                emissionBlocks: (state.emissionBlocks || []).map(eb =>
                    eb.id === blockId ? {
                        ...eb,
                        parameters: eb.parameters.map(p =>
                            p.key === paramKey ? { ...p, value: parseFloat(value) || 0 } : p
                        )
                    } : eb
                )
            });
        }
        case 'DELETE_EMISSION_BLOCK':
            return markDirty({
                ...state,
                emissionBlocks: (state.emissionBlocks || []).filter(eb => eb.id !== action.payload)
            });

        // --- PRODUCTS ---
        case 'ADD_PRODUCT':
            return markDirty({
                ...state,
                products: [...state.products, action.payload]
            });
        case 'UPDATE_PRODUCT': {
            const updatedProducts = state.products.map(p =>
                p.id === action.payload.id ? {
                    ...p,
                    [action.payload.field]: action.payload.field === 'quantity' ? (parseFloat(action.payload.value) || 0) : action.payload.value
                } : p
            );
            // Auto-sync: when CN code changes → update CBAM settings
            let newCbamSettings = state.cbamSettings;
            if (action.payload.field === 'cnCode') {
                const product = updatedProducts.find(p => p.id === action.payload.id);
                if (product && !product.isResidue) {
                    const cnInfo = getCnCodeInfo(action.payload.value);
                    if (cnInfo) {
                        const sector = cnInfo.sector;
                        newCbamSettings = {
                            ...state.cbamSettings,
                            cnCode: action.payload.value.replace(/\s/g, '').substring(0, 4),
                            goodCategory: sector,
                            scope: getAutoScope(action.payload.value),
                        };
                    }
                }
            }
            return markDirty({
                ...state,
                products: updatedProducts,
                cbamSettings: newCbamSettings,
            });
        }
        case 'DELETE_PRODUCT':
            return markDirty({
                ...state,
                products: state.products.filter(p => p.id !== action.payload)
            });

        // --- PRECURSORS ---
        case 'ADD_PRECURSOR': {
            const { productId } = action.payload;
            return markDirty({
                ...state,
                products: state.products.map(p =>
                    p.id === productId ? {
                        ...p,
                        precursors: [...(p.precursors || []), {
                            id: `pc${Date.now()}`, name: "", cnCode: "", mass: 0, see: 0, sourceType: "actual"
                        }]
                    } : p
                )
            });
        }
        case 'UPDATE_PRECURSOR': {
            const { productId: pId, precursorId, field, value } = action.payload;
            return markDirty({
                ...state,
                products: state.products.map(p =>
                    p.id === pId ? {
                        ...p,
                        precursors: (p.precursors || []).map(pc =>
                            pc.id === precursorId ? {
                                ...pc,
                                [field]: ['mass', 'see'].includes(field) ? (parseFloat(value) || 0) : value
                            } : pc
                        )
                    } : p
                )
            });
        }
        case 'DELETE_PRECURSOR': {
            const { productId: dpId, precursorId: dpcId } = action.payload;
            return markDirty({
                ...state,
                products: state.products.map(p =>
                    p.id === dpId ? {
                        ...p,
                        precursors: (p.precursors || []).filter(pc => pc.id !== dpcId)
                    } : p
                )
            });
        }

        // --- SETTINGS ---
        case 'UPDATE_ALLOC_SETTINGS':
            return markDirty({
                ...state,
                allocationSettings: { ...state.allocationSettings, [action.payload.field]: action.payload.value }
            });
        case 'UPDATE_CBAM':
            return markDirty({
                ...state,
                cbamSettings: { ...state.cbamSettings, [action.payload.field]: action.payload.value }
            });

        // --- SYSTEM ---
        case 'SAVE_STATE':
            return {
                ...state,
                isDirty: false,
                meta: { ...state.meta, lastSaved: new Date().toISOString() }
            };

        default:
            return state;
    }
};

// ─── DAL Write Middleware ─────────────────────────────────────
// Synchronizes React state changes back to SQLite

function syncToDAL(action, state) {
    const instId = state.activeInstallationId || 'default';
    try {
        switch (action.type) {
            case 'UPDATE_META': {
                const meta = { ...state.meta, [action.payload.field]: action.payload.value };
                DAL.saveInstallation({
                    id: instId,
                    name: meta.installationName,
                    country: meta.country,
                    periodStart: meta.periodStart,
                    periodEnd: meta.periodEnd,
                    isFinalProducer: meta.isFinalProducer,
                });
                break;
            }
            case 'SET_SECTION_WORKFLOW_STATUS': {
                DAL.saveSectionWorkflow({
                    installationId: instId,
                    period: action.payload.period,
                    section: action.payload.section,
                    status: action.payload.status,
                    updatedBy: 'user'
                });
                break;
            }
            case 'UPDATE_BOUNDARY':
                DAL.saveBoundary({
                    id: action.payload.id,
                    installationId: instId,
                    [action.payload.field]: action.payload.value,
                    ...state.boundaries.find(b => b.id === action.payload.id),
                });
                break;
            case 'ADD_PROCESS':
                DAL.saveProcess({ ...action.payload, installationId: instId });
                break;
            case 'UPDATE_PROCESS': {
                const proc = state.processes.find(p => p.id === action.payload.id);
                if (proc) DAL.saveProcess({ ...proc, installationId: instId, [action.payload.field]: action.payload.value });
                break;
            }
            case 'DELETE_PROCESS':
                DAL.deleteProcess(action.payload);
                break;
            case 'ADD_FUEL':
                DAL.saveFuelEntry({ ...action.payload, installationId: instId });
                break;
            case 'UPDATE_FUEL': {
                const fuel = state.activity.fuels.find(f => f.id === action.payload.id);
                if (fuel) {
                    const updated = { ...fuel, [action.payload.field]: action.payload.value };
                    DAL.saveFuelEntry({ stableId: updated.id, installationId: instId, ...updated });
                }
                break;
            }
            case 'DELETE_FUEL':
                DAL.deleteFuelEntry(action.payload);
                break;
            case 'ADD_ELEC':
                DAL.saveElectricityEntry({ ...action.payload, installationId: instId });
                break;
            case 'UPDATE_ELEC': {
                const elec = state.activity.electricity.find(e => e.id === action.payload.id);
                if (elec) {
                    const updated = { ...elec, [action.payload.field]: action.payload.value };
                    DAL.saveElectricityEntry({ stableId: updated.id, installationId: instId, ...updated });
                }
                break;
            }
            case 'DELETE_ELEC':
                DAL.deleteElectricityEntry(action.payload);
                break;
            case 'ADD_PROCESS_EVENT':
                DAL.saveProcessEvent({ ...action.payload, installationId: instId });
                break;
            case 'UPDATE_PROCESS_EVENT': {
                const pe = (state.processEvents || []).find(p => p.id === action.payload.id);
                if (pe) {
                    const updated = { ...pe, [action.payload.field]: action.payload.value };
                    DAL.saveProcessEvent({ stableId: updated.id, installationId: instId, ...updated });
                }
                break;
            }
            case 'DELETE_PROCESS_EVENT':
                DAL.deleteProcessEvent(action.payload);
                break;
            case 'ADD_EMISSION_BLOCK':
                DAL.saveEmissionBlock({ ...action.payload, installationId: instId });
                break;
            case 'UPDATE_EMISSION_BLOCK': {
                const eb = (state.emissionBlocks || []).find(b => b.id === action.payload.id);
                if (eb) DAL.updateEmissionBlock(action.payload.id, { ...eb, ...action.payload.data, installationId: instId });
                break;
            }
            case 'UPDATE_BLOCK_PARAM': {
                const blk = (state.emissionBlocks || []).find(b => b.id === action.payload.blockId);
                if (blk) {
                    const updatedParams = blk.parameters.map(p =>
                        p.key === action.payload.paramKey ? { ...p, value: parseFloat(action.payload.value) || 0 } : p
                    );
                    DAL.updateEmissionBlock(blk.id, { ...blk, parameters: updatedParams, installationId: instId });
                }
                break;
            }
            case 'DELETE_EMISSION_BLOCK':
                DAL.deleteEmissionBlock(action.payload);
                break;
            case 'ADD_PRODUCT':
                if (action.payload) DAL.saveProduct({ ...action.payload, installationId: instId });
                break;
            case 'UPDATE_PRODUCT': {
                const prod = state.products.find(p => p.id === action.payload.id);
                if (prod) DAL.saveProduct({ ...prod, installationId: instId, [action.payload.field]: action.payload.value });
                break;
            }
            case 'DELETE_PRODUCT':
                DAL.deleteProduct(action.payload);
                break;
            case 'ADD_PRECURSOR': {
                const { productId, precursorId, name } = action.payload;
                DAL.savePrecursor({
                    id: precursorId,
                    productId: productId,
                    name: name,
                    cnCode: '',
                    mass: 0,
                    see: 0,
                    sourceType: 'actual',
                    sourceInstallationId: null,
                    sourceProductId: null
                });
                break;
            }
            case 'UPDATE_PRECURSOR': {
                const { productId, precursorId, field, value } = action.payload;
                const prod = state.products.find(p => p.id === productId);
                const prec = (prod?.precursors || []).find(pc => pc.id === precursorId);
                if (prec) {
                    const updatedPrec = {
                        ...prec,
                        [field]: ['mass', 'see'].includes(field) ? (parseFloat(value) || 0) : value
                    };
                    DAL.savePrecursor(updatedPrec);
                }
                break;
            }
            case 'DELETE_PRECURSOR': {
                DAL.deletePrecursor(action.payload.precursorId);
                break;
            }
            case 'UPDATE_CBAM':
                DAL.saveCbamSettings({ ...state.cbamSettings, installationId: instId, [action.payload.field]: action.payload.value });
                break;
            case 'UPDATE_ALLOC_SETTINGS':
                DAL.saveAllocationSettings({ ...state.allocationSettings, installationId: instId, [action.payload.field]: action.payload.value });
                break;
        }
    } catch (err) {
        console.warn('[DAL Sync] Error syncing action to SQLite:', action.type, err);
    }
}

// ─── Provider Component ──────────────────────────────────────

const emptyState = {
    meta: { installationName: '', country: '', periodStart: '', periodEnd: '', lastSaved: null },
    boundaries: [],
    processes: [],
    activity: { fuels: [], electricity: [] },
    processEvents: [],
    emissionBlocks: [],
    products: [],
    productionOutput: [],
    allocationSettings: { method: 'mass', treatResidueAsWaste: true },
    cbamSettings: {
        basis: 'ACTUAL', scope: 'DIRECT_ONLY', certPriceScenario: 'MID',
        alPriceScenario: 'MID', carbonCreditEligible: true, carbonCreditScenario: 'HIGH',
        importedQty: 110000, cnCode: '7208 39 00', goodCategory: 'Iron and steel',
    },
    isDirty: false,
    activeTab: 'dashboard',
    sectionWorkflows: { fuels: 'DRAFT', electricity: 'DRAFT', process_emissions: 'DRAFT' }
};

export const AppProvider = ({ children }) => {
    const [state, rawDispatch] = useReducer(reducer, emptyState);
    const [dbReady, setDbReady] = useState(false);
    const [dbError, setDbError] = useState(null);

    // Initialize database on mount
    useEffect(() => {
        let cancelled = false;
        async function init() {
            try {
                await initDatabase();
                seedDemoData();
                if (!cancelled) {
                    const loaded = enrichProductQuantities(buildStateFromDB());
                    rawDispatch({ type: 'LOAD_STATE', payload: loaded });
                    setDbReady(true);
                }
            } catch (err) {
                console.error('[DB] Initialization failed:', err);
                if (!cancelled) setDbError(err.message);
            }
        }
        init();
        return () => { cancelled = true; };
    }, []);

    // Dispatch wrapper that syncs to DAL
    const dispatch = useCallback((action) => {
        if (action.type === 'SET_ACTIVE_INSTALLATION') {
            const loaded = enrichProductQuantities(buildStateFromDB(action.payload));
            rawDispatch({ type: 'LOAD_STATE', payload: loaded });
            return;
        }

        if (action.type === 'ADD_INSTALLATION') {
            const newId = `inst_${Date.now()}`;
            DAL.saveInstallation({
                id: newId,
                name: action.payload.name || 'New Installation',
                country: action.payload.country || 'KAZ',
                periodStart: '2025-01',
                periodEnd: '2025-12'
            });
            const loaded = enrichProductQuantities(buildStateFromDB(newId));
            rawDispatch({ type: 'LOAD_STATE', payload: loaded });
            return;
        }

        rawDispatch(action);
        // Sync to SQLite (after React state update)
        if (dbReady) {
            syncToDAL(action, state);
        }
    }, [dbReady, state]);

    // Save = persist SQLite database to IndexedDB
    const save = useCallback(async () => {
        rawDispatch({ type: 'SAVE_STATE' });
        await persistDatabase();
        console.log('[App] Saved to IndexedDB');
    }, []);

    // Reset = drop and re-seed
    const reset = useCallback(async () => {
        if (confirm("Reset entire demo? This will wipe all data.")) {
            await resetDatabase();
            seedDemoData();
            const loaded = enrichProductQuantities(buildStateFromDB());
            rawDispatch({ type: 'LOAD_STATE', payload: loaded });
            await persistDatabase();
        }
    }, []);

    // Loading screen
    if (!dbReady) {
        return (
            <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                height: '100vh', background: '#0f172a', color: '#94a3b8',
                fontFamily: 'Inter, sans-serif', flexDirection: 'column', gap: '16px'
            }}>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#e2e8f0' }}>
                    Carbon Ledger
                </div>
                {dbError ? (
                    <div style={{ color: '#f87171' }}>
                        Database error: {dbError}
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '16px', height: '16px', border: '2px solid #64748b',
                            borderTopColor: '#3b82f6', borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                        Initializing database...
                    </div>
                )}
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <AppContext.Provider value={{ state, dispatch, save, reset, dbReady }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
