import React from 'react';

export default function KPI_Card({ title, value, subtext, icon: Icon, accentColor }) {
  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-md flex items-center justify-between relative overflow-hidden group hover:border-slate-500 transition-all">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`}></div>
      <div>
        <h3 className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">{title}</h3>
        <div className="text-2xl font-bold text-white font-mono group-hover:scale-105 transition-transform origin-left">{value}</div>
        <p className="text-[10px] text-slate-500 mt-1">{subtext}</p>
      </div>
      <div className={`p-2 rounded-lg bg-slate-700/50 text-slate-300 group-hover:text-white transition-colors`}>
        <Icon size={24} />
      </div>
    </div>
  );
}