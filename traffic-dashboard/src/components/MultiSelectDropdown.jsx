import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, CheckCircle2 } from 'lucide-react';

const MultiSelectDropdown = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const toggleOption = (option) => {
    if (selected.includes(option)) onChange(selected.filter(item => item !== option));
    else onChange([...selected, option]);
  };
  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="text-[10px] text-slate-400 font-bold mb-1 block">{label}</label>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded flex justify-between items-center hover:border-slate-500 transition-colors">
        <span className="truncate">{selected.length === 0 ? "เลือกทั้งหมด" : `${selected.length} รายการ`}</span>
        <ChevronDown size={14} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded shadow-xl max-h-60 overflow-y-auto">
          {options.length > 0 ? options.map((option) => (
            <div key={option} className="flex items-center px-3 py-2 hover:bg-slate-700 cursor-pointer" onClick={() => toggleOption(option)}>
              <div className={`w-4 h-4 border rounded mr-2 flex items-center justify-center ${selected.includes(option) ? 'bg-yellow-500 border-yellow-500' : 'border-slate-500'}`}>
                {selected.includes(option) && <CheckCircle2 size={12} className="text-slate-900" />}
              </div>
              <span className="text-xs text-slate-200">{option}</span>
            </div>
          )) : <div className="p-2 text-xs text-slate-500 text-center">ไม่มีตัวเลือก</div>}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;