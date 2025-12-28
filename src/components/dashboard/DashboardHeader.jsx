import React from 'react';
import { Monitor, RotateCcw, ClipboardCopy, Filter } from 'lucide-react';

export default function DashboardHeader({ 
  lastUpdated, 
  onRefresh, 
  onToggleFilter, 
  showFilters, 
  onGenerateReport, 
  reportDirection, 
  setReportDirection 
}) {
  return (
    <div className="flex flex-wrap justify-between items-center mb-4 border-b border-slate-800 pb-2 gap-2">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <div className="bg-yellow-400 p-1 rounded text-slate-900"><Monitor size={20} /></div>
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">ศูนย์ปฏิบัติการจราจร บก.ทล.</span>
      </h1>
      <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 items-center gap-2">
             <span className="text-[10px] text-slate-500 hidden sm:block">Updated: {lastUpdated.toLocaleTimeString('th-TH')}</span>
             <button onClick={() => setReportDirection('outbound')} className={`px-3 py-1 text-xs rounded font-bold transition-all ${reportDirection === 'outbound' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>ขาออก</button>
             <button onClick={() => setReportDirection('inbound')} className={`px-3 py-1 text-xs rounded font-bold transition-all ${reportDirection === 'inbound' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>ขาเข้า</button>
          </div>
          <button onClick={onGenerateReport} className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition-all shadow-sm"><ClipboardCopy size={14} /> สร้างรายงาน</button>
          <button onClick={onToggleFilter} className={`text-xs px-3 py-1.5 rounded flex items-center gap-2 transition-all ${showFilters ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}><Filter size={14} /></button>
          <button onClick={onRefresh} className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded border border-slate-600 hover:text-yellow-400 flex gap-2 text-xs"><RotateCcw size={14} /></button>
      </div>
    </div>
  );
}