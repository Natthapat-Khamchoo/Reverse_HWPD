import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({
    label,
    value,
    onChange,
    options,
    placeholder = "เลือกรายการ...",
    disabled = false,
    icon: Icon
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
    };

    // Find selected label
    const selectedOption = options.find(opt => opt.value === value);
    const displayLabel = selectedOption ? selectedOption.label : placeholder;

    return (
        <div className={`w-full relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={containerRef}>
            {label && <label className="text-[10px] text-slate-400 font-bold mb-1 block">{label}</label>}

            {/* Trigger Button */}
            <div
                className="w-full bg-slate-900/50 border border-white/10 text-white text-xs min-h-[38px] px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between hover:bg-slate-800/80 transition-colors"
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 truncate">
                    {Icon && <Icon size={14} className="text-slate-400 flex-shrink-0" />}
                    <span className={`${!selectedOption ? 'text-slate-400 font-light' : 'text-slate-200'}`}>
                        {displayLabel}
                    </span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-yellow-500' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full max-h-60 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 animate-dropdown-enter custom-scrollbar">
                    <div className="p-1">
                        {options.map((opt, i) => {
                            const isSelected = opt.value === value;
                            return (
                                <div
                                    key={i}
                                    className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer rounded-md transition-all ${isSelected
                                            ? 'bg-blue-600/20 text-blue-300'
                                            : 'text-slate-300 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                                        }`}
                                    onClick={() => handleSelect(opt.value)}
                                >
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600 bg-transparent'
                                        }`}>
                                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                    </div>
                                    <span className="truncate">{opt.label}</span>
                                </div>
                            );
                        })}
                        {options.length === 0 && <div className="p-3 text-center text-slate-500">ไม่มีข้อมูล</div>}
                    </div>
                </div>
            )}
        </div>
    );
}
