import React, { createContext, useContext, useReducer, useEffect } from 'react';

const AppContext = createContext();

const STORAGE_KEY = 'carbon_ledger_react_v1';

const initialState = {
    meta: {
        installationName: "Rotterdam Refinery Unit A (Demo)",
        country: "NL",
        periodStart: "2024-01",
        periodEnd: "2024-12",
        lastSaved: null
    },
    boundaries: [
        { id: "b1", name: "Electrolysis", included: true, notes: "Main production process", evidence: "P&ID-101" },
        { id: "b2", name: "Casting", included: true, notes: "Downstream unit", evidence: "Layout-A" },
        { id: "b3", name: "Anode production", included: true, notes: "Auxiliary unit", evidence: "" },
        { id: "b4", name: "Fuel combustion", included: true, notes: "Scope 1 emissions", evidence: "Gas bills" },
        { id: "b5", name: "Electricity use", included: true, notes: "Scope 2 (Location based)", evidence: "Utility meter" },
        { id: "b6", name: "PFC emissions", included: false, notes: "Not applicable for this technology", evidence: "Process description" },
        { id: "b7", name: "On-site vehicles", included: true, notes: "Forklifts and trucks", evidence: "Fuel log" }
    ],
    processes: [
        { id: "P01", name: "Electrolysis", description: "Primary aluminum production via Hall-Héroult", active: true },
        { id: "P02", name: "Casting", description: "Molten metal casting into ingots", active: true },
        { id: "P03", name: "Auxiliary services", description: "Compressed air, water treatment", active: true },
        { id: "P04", name: "Anode handling", description: "Transport and storage of anodes", active: true }
    ],
    activity: {
        fuels: [
            { id: "f1", period: "2024-01", processId: "P03", fuelTypeId: "natural_gas", quantity: 500, unit: "t", evidence: "Bill #123", customNcv: 0, customEf: 0 },
            { id: "f2", period: "2024-02", processId: "P03", fuelTypeId: "natural_gas", quantity: 520, unit: "t", evidence: "Bill #124", customNcv: 0, customEf: 0 },
            { id: "f3", period: "2024-01", processId: "P04", fuelTypeId: "diesel", quantity: 120, unit: "t", evidence: "Fuel Log", customNcv: 0, customEf: 0 }
        ],
        electricity: [
            { id: "e1", period: "2024-01", processId: "P01", mwh: 14500, gridCountry: "NL", ef: 0.328, efOverride: false, evidence: "Grid Statement Jan" },
            { id: "e2", period: "2024-02", processId: "P01", mwh: 14200, gridCountry: "NL", ef: 0.328, efOverride: false, evidence: "Grid Statement Feb" },
            { id: "e3", period: "2024-01", processId: "P02", mwh: 800, gridCountry: "NL", ef: 0.328, efOverride: false, evidence: "Sub-meter 2" }
        ]
    },
    products: [
        { id: "pr1", name: "INGOT output", quantity: 24000, isResidue: false, cnCode: "7601 10 00", precursors: [] },
        { id: "pr2", name: "DROSS output", quantity: 1500, isResidue: true, cnCode: "", precursors: [] }
    ],
    allocationSettings: {
        method: "mass",
        treatResidueAsWaste: true
    },
    cbamSettings: {
        basis: "ACTUAL",               // ACTUAL | DEFAULT
        scope: "DIRECT_ONLY",          // DIRECT_ONLY | TOTAL
        certPriceScenario: "MID",      // LOW | MID | HIGH
        alPriceScenario: "MID",        // LOW | MID | HIGH
        carbonCreditEligible: true,    // KZ ETS deduction eligible?
        carbonCreditScenario: "HIGH",  // NONE | LOW | MID | HIGH
        importedQty: 110000,           // Annual import volume (tonnes)
        cnCode: "7601",                // CN code for default value lookup
        goodCategory: "Aluminium",     // Sector for scope/markup rules
    },
    isDirty: false,
    activeTab: "boundaries"
};

const reducer = (state, action) => {
    // Helper to mark dirty if not already
    const markDirty = (s) => ({ ...s, isDirty: true });

    switch (action.type) {
        case 'LOAD_STATE':
            return { ...action.payload, isDirty: false };
        case 'RESET_STATE':
            return { ...initialState };
        case 'SET_TAB':
            return { ...state, activeTab: action.payload };

        // --- META ---
        case 'UPDATE_META':
            return markDirty({
                ...state,
                meta: { ...state.meta, [action.payload.field]: action.payload.value }
            });

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
            const newId = `P${(state.processes.length + 1).toString().padStart(2, '0')}`;
            return markDirty({
                ...state,
                processes: [...state.processes, { id: newId, name: "New Process", description: "", active: true }]
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
                    fuels: [...state.activity.fuels, {
                        id: `f${Date.now()}`,
                        period: state.meta.periodStart || '2024-01',
                        processId: state.processes[0]?.id || "",
                        fuelTypeId: "natural_gas", quantity: 0, unit: "t", evidence: "",
                        customNcv: 0, customEf: 0
                    }]
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
                            [action.payload.field]: ['quantity', 'customNcv', 'customEf'].includes(action.payload.field)
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
                    electricity: [...state.activity.electricity, {
                        id: `e${Date.now()}`,
                        period: state.meta.periodStart || '2024-01',
                        processId: state.processes[0]?.id || "",
                        mwh: 0, gridCountry: state.meta.country || 'OTHER', ef: 0, efOverride: false, evidence: ""
                    }]
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

        // --- PRODUCTS ---
        case 'ADD_PRODUCT':
            return markDirty({
                ...state,
                products: [...state.products, { id: `pr${Date.now()}`, name: "New Product", quantity: 0, isResidue: false, cnCode: "", precursors: [] }]
            });
        case 'UPDATE_PRODUCT':
            return markDirty({
                ...state,
                products: state.products.map(p =>
                    p.id === action.payload.id ? {
                        ...p,
                        [action.payload.field]: action.payload.field === 'quantity' ? (parseFloat(action.payload.value) || 0) : action.payload.value
                    } : p
                )
            });
        case 'DELETE_PRODUCT':
            return markDirty({
                ...state,
                products: state.products.filter(p => p.id !== action.payload)
            });

        // --- PRECURSORS (nested under products) ---
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

export const AppProvider = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState);

    // Load on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                dispatch({ type: 'LOAD_STATE', payload: parsed });
            } catch (e) {
                console.error("Failed to load state", e);
            }
        }
    }, []);

    // Save Action (Exposed to UI)
    const save = () => {
        dispatch({ type: 'SAVE_STATE' });
        // We need to access the *new* state to save it, but inside this function 'state' is the old closure.
        // However, we can use a side-effect (useEffect) to detect save trigger? 
        // Or simpler: just saving the CURRENT state is technically one tick behind if we just dispatched?
        // Actually, reducer runs synchronously but component state update is async.
        // Better pattern: Persist in useEffect when specific condition met or just save manually passing state.
        // BUT: dispatch is the React way. 
        // Let's use a useEffect that listens to a "lastSaved" change? Or just persist to localStorage in the reducer?
        // Reducer shouldn't have side effects.
        // Let's use a dedicated useEffect for persistence when 'lastSaved' changes.
    };

    // Persistence Effect
    // Persistence Effect
    const lastSavedRef = React.useRef(state.meta.lastSaved);

    useEffect(() => {
        // Only save if lastSaved has changed (explicit save action)
        if (state.meta.lastSaved !== lastSavedRef.current) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            lastSavedRef.current = state.meta.lastSaved;
        }
    }, [state.meta.lastSaved, state]);

    const reset = () => {
        if (confirm("Reset entire demo?")) {
            localStorage.removeItem(STORAGE_KEY);
            dispatch({ type: 'RESET_STATE' });
        }
    };

    return (
        <AppContext.Provider value={{ state, dispatch, save, reset }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
