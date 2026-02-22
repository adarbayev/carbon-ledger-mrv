import React, { useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function FormattedMonthInput({ value, onChange, className = "" }) {
    const { language } = useLanguage();
    const inputRef = useRef(null);

    // Format the YYYY-MM value into a localized string
    const getFormattedDate = (isoMonth) => {
        if (!isoMonth) return "";
        try {
            const [year, month] = isoMonth.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            // Map our internal codes to BCP 47 codes
            const localeMap = {
                'en': 'en-US',
                'kk': 'kk-KZ',
                'ru': 'ru-RU'
            };
            // Fallback for environments where 'kk' might fail or return English
            const locale = localeMap[language] || 'en-US';

            // Special handling for Kazakh if Intl doesn't support it well in this environment
            if (language === 'kk') {
                const kkMonths = [
                    "Қаңтар", "Ақпан", "Наурыз", "Сәуір", "Мамыр", "Маусым",
                    "Шілде", "Тамыз", "Қыркүйек", "Қазан", "Қараша", "Желтоқсан"
                ];
                return `${kkMonths[parseInt(month) - 1]} ${year}`;
            }

            return new Intl.DateTimeFormat(locale, {
                month: 'long',
                year: 'numeric'
            }).format(date);
        } catch (e) {
            return isoMonth;
        }
    };

    return (
        <div className={`relative group cursor-pointer ${className}`}>
            {/* The visible, formatted text */}
            <div
                className="w-full h-full flex items-center bg-transparent"
                onClick={() => inputRef.current?.showPicker()}
            >
                <span className="truncate">
                    {value ? getFormattedDate(value) : <span className="text-slate-400">-</span>}
                </span>
            </div>

            {/* The actual input, hidden but accessible and triggers the picker */}
            <input
                ref={inputRef}
                type="month"
                value={value}
                onChange={onChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                style={{ zIndex: 10 }}
            />
        </div>
    );
}
