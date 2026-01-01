import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Bar } from 'react-chartjs-2';

export default function TrendChartSection({ trendChartConfig, trendStart, setTrendStart, trendEnd, setTrendEnd }) {
  return (
    <div className="grid grid-cols-1 mb-4">
      <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-md hover-lift-glow">
        <div className="flex flex-wrap justify-between items-center mb-4 border-b border-slate-700 pb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><TrendingUp size={16} className="text-green-400" /> เปรียบเทียบรายวัน (อุบัติเหตุเฉพาะ กก.8)</h3>
          <div className="flex items-center gap-2"><span className="text-[10px] text-slate-400 uppercase tracking-wider">เลือกช่วงเวลา:</span><input type="date" className="bg-slate-900 border border-slate-600 text-white text-[10px] p-1.5 rounded focus:border-yellow-500 outline-none" value={trendStart} onChange={e => setTrendStart(e.target.value)} /><span className="text-slate-500 text-xs">-</span><input type="date" className="bg-slate-900 border border-slate-600 text-white text-[10px] p-1.5 rounded focus:border-yellow-500 outline-none" value={trendEnd} onChange={e => setTrendEnd(e.target.value)} /></div>
        </div>
        <div className="h-[240px] w-full relative"><Bar data={trendChartConfig} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 10, font: { size: 10 } } }, tooltip: { mode: 'index', intersect: false } }, scales: { x: { stacked: true, grid: { display: false }, ticks: { color: '#94a3b8' } }, y: { stacked: true, grid: { color: '#1e293b', borderDash: [5, 5] }, ticks: { color: '#64748b' } } } }} /></div>
      </div>
    </div>
  );
}