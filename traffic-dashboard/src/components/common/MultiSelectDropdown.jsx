import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export default function MultiSelectDropdown({ label, options, selected, onChange, placeholder = "เลือกรายการ..." }) {
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

  const removeTag = (e, tag) => {
    e.stopPropagation(); // Prevent dropdown toggle if clicking remove inside trigger (if strictly inside trigger)
    // However, tags are outside in previous design? No, let's keep previous design of tags BELOW, 
    // BUT usually a custom dropdown puts tags INSIDE or keeps them below.
    // The previous design had tags BELOW. Let's keep that structure for now to fit the layout, 
    // OR migrate to 'tags inside' like GroupedMultiSelect.
    // User wants "animation", so a custom dropdown is needed.
    // I I'll follow GroupedMultiSelect style (Tags inside) for consistency and better UI?
    // Wait, the previous one had labels above and tags below. 
    // I will try to support tags INSIDE the trigger for a cleaner look, matching GroupedMultiSelect.
    onChange(selected.filter(item => item !== tag));
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && <label className="text-[10px] text-slate-400 font-bold mb-1 block">{label}</label>}

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
              <span key={val} className="bg-slate-700 text-slate-200 border border-slate-600 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 animate-in zoom-in duration-200">
                {val}
                <X
                  size={10}
                  className="hover:text-red-400 cursor-pointer"
                  onClick={(e) => removeTag(e, val)}
                />
              </span>
            ))
          )}
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-yellow-500' : ''}`} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full max-h-60 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 animate-dropdown-enter custom-scrollbar">
          <div className="p-1">
            {options.map((opt, i) => {
              const isSelected = selected.includes(opt);
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer rounded-md transition-all ${isSelected
                      ? 'bg-blue-600/20 text-blue-300'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                    }`}
                  onClick={() => handleSelect(opt)}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600 bg-transparent'
                    }`}>
                    {isSelected && <Check size={10} className="text-white" />}
                  </div>
                  <span className="truncate">{opt}</span>
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