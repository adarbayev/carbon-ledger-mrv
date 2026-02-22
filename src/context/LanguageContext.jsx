import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from '../locales/en';
import { kk } from '../locales/kk';
import { ru } from '../locales/ru';

const LanguageContext = createContext();

const translations = { en, kk, ru };

export const LanguageProvider = ({ children }) => {
    // Load from localStorage or default to 'en'
    const [language, setLanguage] = useState(() => {
        try {
            return localStorage.getItem('app-language') || 'en';
        } catch {
            return 'en';
        }
    });

    // Persist to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('app-language', language);
        } catch (e) {
            console.warn('Failed to save language preference', e);
        }
    }, [language]);

    // Translation function
    // Supports nested keys: t('ui.sidebar.dashboard')
    const t = (key) => {
        const keys = key.split('.');
        let value = translations[language];

        for (const k of keys) {
            if (value && value[k] !== undefined) {
                value = value[k];
            } else {
                return key; // Fallback to key if not found
            }
        }
        return value;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
