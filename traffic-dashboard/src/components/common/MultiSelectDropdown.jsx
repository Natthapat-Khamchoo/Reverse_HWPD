import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function MultiSelectDropdown({ label, options, selected, onChange }) {
  const handleChange = (e) => {
    const value = e.target.value;
    if (!value) return;
    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const removeTag = (tag) => {
    onChange(selected.filter(item => item !== tag));
  };

  return (
    <div className="w-full">
      <label className="text-[10px] text-slate-400 font-bold mb-1 block">{label}</label>
      <div className="relative">
        <select 
          className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded h-9 appearance-none outline-none" 
          onChange={handleChange}
          value=""
        >
          <option value="" disabled>-- เลือกรายการ --</option>
          {options.map((opt, i) => (
            <option key={i} value={opt} disabled={selected.includes(opt)}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2 top-2.5 text-slate-500 pointer-events-none"/>
      </div>
      
      {/* Selected Tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selected.map(tag => (
            <span key={tag} className="bg-slate-700 text-slate-200 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 border border-slate-600">
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-red-400">×</button>
            </span>
          ))}
          <button onClick={() => onChange([])} className="text-[10px] text-slate-500 hover:text-white underline px-1">ล้าง</button>
        </div>
      )}
    </div>
  );
}