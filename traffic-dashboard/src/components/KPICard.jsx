import React from 'react';

const KPI_Card = ({ title, value, subtext, icon: Icon, accentColor }) => (
  <div className={`bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-lg relative overflow-hidden group hover:border-slate-600 transition-all`}>
    <div className={`absolute top-0 left-0 w-1 h-full ${accentColor}`}></div>
    <div className="flex justify-between items-start z-10 relative">
      <div><p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{title}</p><p className="text-2xl font-bold mt-1 text-white font-mono">{value}</p><p className="text-[9px] text-slate-500 mt-1">{subtext}</p></div>
      <div className={`p-2 rounded bg-slate-700/50 text-slate-300 group-hover:text-white transition-colors`}><Icon size={18} /></div>
    </div>
  </div>
);

export default KPI_Card;