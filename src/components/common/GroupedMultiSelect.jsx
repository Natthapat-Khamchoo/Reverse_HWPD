import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export default function GroupedMultiSelect({ groups, selected, onChange, placeholder = "Select..." }) {
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

    const handleSelect = (value) => {
        if (selected.includes(value)) {
            onChange(selected.filter(item => item !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const handleRemove = (e, value) => {
        e.stopPropagation();
        onChange(selected.filter(item => item !== value));
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Trigger Button */}
            <div
                className="w-full bg-slate-900/50 border border-white/10 text-white text-xs min-h-[38px] px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between hover:bg-slate-800/80 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex flex-wrap gap-1.5 max-w-[90%]">
                    {selected.length === 0 ? (
                        <span className="text-slate-400 font-light">{placeholder}</span>
                    ) : (
                        selected.map(val => (
                            <span key={val} className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                                {val}
                                <X
                                    size={10}
                                    className="hover:text-emerald-100 cursor-pointer"
                                    onClick={(e) => handleRemove(e, val)}
                                />
                            </span>
                        ))
                    )}
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full max-h-80 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 animate-dropdown-enter">
                    {groups.map((group, gIdx) => (
                        <div key={gIdx} className="border-b border-slate-800/50 last:border-0">
                            <div className="px-3 py-2 bg-slate-800/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 backdrop-blur-sm">
                                {group.label}
                            </div>
                            <div className="p-1">
                                {group.options.map((option) => {
                                    const isSelected = selected.includes(option.value);
                                    return (
                                        <div
                                            key={option.value}
                                            className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer rounded-md transition-all ${isSelected
                                                ? 'bg-emerald-500/20 text-emerald-300'
                                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                                }`}
                                            onClick={() => handleSelect(option.value)}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 bg-transparent'
                                                }`}>
                                                {isSelected && <Check size={10} className="text-white" />}
                                            </div>
                                            <span className="truncate">{option.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {groups.length === 0 && <div className="p-4 text-center text-slate-500 text-xs">ไม่มีข้อมูล</div>}
                </div>
            )}
        </div>
    );
}
