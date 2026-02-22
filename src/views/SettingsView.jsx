import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { Globe, AlertTriangle } from 'lucide-react';

export default function SettingsView() {
    const { language, setLanguage, t } = useLanguage();
    const { reset } = useApp();

    const languages = [
        { code: 'en', label: 'English' },
        { code: 'kk', label: 'Қазақша' },
        { code: 'ru', label: 'Русский' }
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Globe size={24} className="text-blue-600" />
                {t('ui.settings.title')}
            </h2>

            <div className="card">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                <th className="p-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4">
                                    Setting
                                </th>
                                <th className="p-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4">
                                    Value
                                </th>
                                <th className="p-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/2">
                                    Description
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <td className="p-3 text-sm font-medium text-slate-700">
                                    {t('ui.settings.language')}
                                </td>
                                <td className="p-3">
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="input-cell w-full max-w-[200px]"
                                    >
                                        {languages.map((lang) => (
                                            <option key={lang.code} value={lang.code}>
                                                {lang.label}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="p-3 text-xs text-slate-500">
                                    Select your preferred interface language. Data content will remain in its original language.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card mt-6 border-red-200 bg-red-50/30">
                <h3 className="text-md font-bold text-red-700 flex items-center gap-2 mb-2">
                    <AlertTriangle size={18} />
                    Danger Zone
                </h3>
                <p className="text-sm text-red-600 mb-4">
                    Resetting the database will permanently delete all installations, activity data, and settings. This action cannot be undone.
                </p>
                <button
                    onClick={() => {
                        if (window.confirm("Are you SURE you want to completely reset the database? All data will be lost.")) {
                            reset();
                        }
                    }}
                    className="btn-icon-danger px-4 py-2 font-semibold bg-white border border-red-200"
                >
                    Reset Database
                </button>
            </div>
        </div>
    );
}
