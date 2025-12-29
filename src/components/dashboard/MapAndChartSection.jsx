import React from 'react';
import { Map as MapIcon, MousePointerClick } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import LongdoMapViewer from '../common/LongdoMapViewer';

export default function MapAndChartSection({ mapData, stats, handleChartClick, LONGDO_API_KEY }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4 h-auto lg:h-[450px]">
       <div className="lg:col-span-8 bg-slate-800 rounded-lg border border-slate-700 relative overflow-hidden shadow-md flex flex-col h-[350px] lg:h-full">
          <div className="absolute top-2 left-2 z-[400] bg-slate-900/90 px-3 py-1.5 rounded border border-slate-600 text-[10px] text-white font-bold flex items-center gap-2 shadow-sm">
             <MapIcon size={12} className="text-yellow-400"/> ภาพรวม (อุบัติเหตุเฉพาะ กก.8)
          </div>
          <div className="flex-1 w-full h-full"><LongdoMapViewer data={mapData} apiKey={LONGDO_API_KEY} /></div>
       </div>
       <div className="lg:col-span-4 bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-md flex flex-col h-[300px] lg:h-full">
           <h3 className="text-sm font-bold text-white mb-2 pb-2 border-b border-slate-600 flex justify-between items-center"><span>สถิติแยกตาม กก.</span><div className="flex items-center gap-1 text-[10px] text-yellow-400 bg-slate-900 px-2 py-0.5 rounded"><MousePointerClick size={12}/> กดที่กราฟเพื่อกรอง</div></h3>
           <div className="flex-1 w-full relative"><Bar data={stats.divChartConfig} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', onClick: handleChartClick, onHover: (event, chartElement) => { event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default'; }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 }, color: '#94a3b8' } } }, scales: { x: { stacked: true, grid: { color: '#1e293b' }, ticks: { color: '#64748b' } }, y: { stacked: true, grid: { display: false }, ticks: { color: '#e2e8f0', font: { weight: 'bold' } } } } }} /></div>
       </div>
    </div>
  );
}