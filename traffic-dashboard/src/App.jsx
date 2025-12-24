import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCcw, ListChecks, Monitor, Calendar, Siren, 
  CarFront, ShieldAlert, StopCircle, Activity, 
  ArrowRightCircle, Wine, Filter, ChevronUp, ChevronDown, Map as MapIcon
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { SHEET_TRAFFIC_URL, SHEET_ENFORCE_URL, SHEET_SAFETY_URL, ORG_STRUCTURE, EVENT_CATEGORIES, CATEGORY_COLORS } from './constants/config';
import { getThaiDateStr, parseCSV } from './utils/helpers';
import { processSheetData } from './utils/dataProcessor';
import SystemLoader from './components/SystemLoader';
import MultiSelectDropdown from './components/MultiSelectDropdown';
import KPI_Card from './components/KPICard';
import MapViewer from './components/MapViewer';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
ChartJS.defaults.color = '#94a3b8'; 
ChartJS.defaults.borderColor = '#334155'; 
ChartJS.defaults.font.family = "'Sarabun', 'Prompt', sans-serif";

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Controls
  const [dateRangeOption, setDateRangeOption] = useState('today');
  const [customStart, setCustomStart] = useState(getThaiDateStr());
  const [customEnd, setCustomEnd] = useState(getThaiDateStr());
  const [filterDiv, setFilterDiv] = useState('');
  const [filterSt, setFilterSt] = useState(''); 
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedRoads, setSelectedRoads] = useState([]);

  // Date Logic
  const { filterStartDate, filterEndDate } = useMemo(() => {
    const today = new Date(); let start = new Date(today); let end = new Date(today);
    if (dateRangeOption === 'yesterday') { start.setDate(today.getDate() - 1); end.setDate(today.getDate() - 1); }
    else if (dateRangeOption === 'last7') { start.setDate(today.getDate() - 6); }
    else if (dateRangeOption === 'all') { return { filterStartDate: null, filterEndDate: null }; }
    else if (dateRangeOption === 'custom') { return { filterStartDate: customStart, filterEndDate: customEnd }; }
    return { filterStartDate: getThaiDateStr(start), filterEndDate: getThaiDateStr(end) };
  }, [dateRangeOption, customStart, customEnd]);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); setError(false);
      try {
        const [resTraffic, resEnforce, resSafety] = await Promise.all([
             fetch(SHEET_TRAFFIC_URL).then(r => r.text()),
             fetch(SHEET_ENFORCE_URL).then(r => r.text()),
             fetch(SHEET_SAFETY_URL).then(r => r.text())
        ]);
        const dataTraffic = processSheetData(parseCSV(resTraffic), 'TRAFFIC');
        const dataEnforce = processSheetData(parseCSV(resEnforce), 'ENFORCE');
        const dataSafety = processSheetData(parseCSV(resSafety), 'SAFETY');
        setRawData([...dataTraffic, ...dataEnforce, ...dataSafety]);
      } catch (err) { console.error(err); setError(true); } 
      finally { setTimeout(() => setLoading(false), 1200); }
    };
    fetchData();
  }, []);

  const uniqueRoads = useMemo(() => Array.from(new Set(rawData.map(d => d.road).filter(r => r && r !== '-' && r.length < 10))).sort(), [rawData]);
  const stations = useMemo(() => (filterDiv && ORG_STRUCTURE[filterDiv]) ? Array.from({ length: ORG_STRUCTURE[filterDiv] }, (_, i) => i + 1) : [], [filterDiv]);

  // --- CORE FILTER LOGIC ---
  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      // 1. Date Filter
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      
      // 2. Control Panel Filters
      const passCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);
      const passRoad = selectedRoads.length === 0 || selectedRoads.includes(item.road);
      const passDiv = !filterDiv || item.div === filterDiv;
      const passSt = !filterSt || item.st === filterSt;

      // 3. *** BUSINESS RULE: อุบัติเหตุแสดงเฉพาะ กก.8 เท่านั้น ***
      // ถ้าเป็นหมวดอุบัติเหตุ แต่ไม่ใช่ กก.8 -> ให้ซ่อนทันที (return false)
      if (item.category.includes('อุบัติเหตุ') && item.div !== '8') {
        return false;
      }

      return passDate && passCategory && passRoad && passDiv && passSt;
    }).sort((a,b) => b.timestamp - a.timestamp);
  }, [rawData, filterStartDate, filterEndDate, filterDiv, filterSt, selectedCategories, selectedRoads]);

  // Active Map Data
  const mapData = useMemo(() => {
    const sortedLog = [...filteredData].sort((a, b) => a.timestamp - b.timestamp);
    const activeStates = new Map(); 
    const otherEvents = []; 
    sortedLog.forEach(row => {
        // กรองข้อมูลที่ไม่มีพิกัดออก เพื่อไม่ให้ Map Error หรือแสดงผิด
        if (row.lat === null || row.lng === null) return;

        const locKey = `${row.div}-${row.st}-${row.road}-${row.dir}`;
        if (row.category === 'จราจรติดขัด') { activeStates.set(locKey, row); } 
        else if (row.category === 'จราจรปกติ') { activeStates.delete(locKey); } 
        else if (row.category === 'ช่องทางพิเศษ') { activeStates.set(`LANE-${locKey}`, row); } 
        else if (row.category === 'ปิดช่องทางพิเศษ') { activeStates.delete(`LANE-${locKey}`); } 
        else { otherEvents.push(row); }
    });
    return [...otherEvents, ...activeStates.values()];
  }, [filteredData]);

  // Stats & Chart
  const stats = useMemo(() => {
    const drunkCount = filteredData.filter(d => d.category === 'จับกุม' && d.detail && d.detail.includes('เมา')).length;
    
    // Stacked Bar Data
    const divisions = ["1", "2", "3", "4", "5", "6", "7", "8"];
    const mainCats = ['อุบัติเหตุใหญ่', 'อุบัติเหตุทั่วไป', 'จับกุม', 'ช่องทางพิเศษ', 'จราจรติดขัด', 'ว.43'];
    const datasets = mainCats.map(cat => ({
        label: cat,
        data: divisions.map(div => filteredData.filter(d => d.div === div && d.category === cat).length),
        backgroundColor: CATEGORY_COLORS[cat] || '#cbd5e1',
        stack: 'Stack 0',
    }));

    const divChartConfig = {
        labels: divisions.map(d => `กก.${d}`),
        datasets: datasets
    };
    return { drunkCount, divChartConfig };
  }, [filteredData]);

  if (loading) return <SystemLoader />;
  if (error) return <div className="p-10 text-center text-white">Error Loading Data</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-4 font-sans text-slate-200">
      {/* 1. Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 border-b border-slate-800 pb-2 gap-2">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
           <div className="bg-yellow-400 p-1 rounded text-slate-900"><Monitor size={20} /></div>
           <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">ศูนย์ปฏิบัติการจราจร บก.ทล.</span>
        </h1>
        <div className="flex items-center gap-3">
             <button onClick={() => setShowFilters(!showFilters)} className={`text-xs px-3 py-1.5 rounded flex items-center gap-2 transition-all ${showFilters ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                <Filter size={14} /> {showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'} {showFilters ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
             </button>
             <span className="text-[10px] text-green-500 font-mono flex items-center gap-1"><Activity size={10} className="animate-pulse"/> Live</span>
             <button onClick={() => window.location.reload()} className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded border border-slate-600 hover:text-yellow-400 flex gap-2 text-xs"><RotateCcw size={14} /> รีเฟรช</button>
        </div>
      </div>

      {/* 2. Filters */}
      {showFilters && (
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 mb-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end shadow-md animate-in slide-in-from-top-2 duration-300">
            {/* ... (Keep Filter Inputs same as before) ... */}
            <div className="col-span-2 md:col-span-1">
              <label className="text-[10px] text-yellow-400 font-bold mb-1 block uppercase tracking-wider"><Calendar size={10} className="inline mr-1"/> ช่วงเวลา</label>
              <select className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded outline-none" value={dateRangeOption} onChange={e => setDateRangeOption(e.target.value)}>
                <option value="today">วันนี้</option><option value="yesterday">เมื่อวาน</option><option value="last7">7 วันย้อนหลัง</option><option value="all">ทั้งหมด</option><option value="custom">กำหนดเอง</option>
              </select>
              {dateRangeOption === 'custom' && (<div className="flex gap-1 mt-1"><input type="date" className="w-1/2 bg-slate-900 border border-slate-600 text-white text-[10px] p-1 rounded" value={customStart} onChange={e => setCustomStart(e.target.value)} /><input type="date" className="w-1/2 bg-slate-900 border border-slate-600 text-white text-[10px] p-1 rounded" value={customEnd} onChange={e => setCustomEnd(e.target.value)} /></div>)}
            </div>
            <div className="col-span-1"><label className="text-[10px] text-slate-400 font-bold mb-1 block">กองกำกับการ</label><select className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded" value={filterDiv} onChange={e => { setFilterDiv(e.target.value); setFilterSt(''); }}><option value="">ทุก กก.</option>{Object.keys(ORG_STRUCTURE).map(k => <option key={k} value={k}>กก.{k}</option>)}</select></div>
            <div className="col-span-1"><label className="text-[10px] text-slate-400 font-bold mb-1 block">สถานี</label><select className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded" value={filterSt} onChange={e => setFilterSt(e.target.value)} disabled={!filterDiv}><option value="">ทุกสถานี</option>{stations.map(s => <option key={s} value={s}>ส.ทล.{s}</option>)}</select></div>
            <div className="col-span-2 md:col-span-1.5 relative"><MultiSelectDropdown label="ประเภทเหตุการณ์" options={EVENT_CATEGORIES} selected={selectedCategories} onChange={setSelectedCategories} /></div>
            <div className="col-span-2 md:col-span-1.5 relative"><MultiSelectDropdown label="เส้นทาง" options={uniqueRoads} selected={selectedRoads} onChange={setSelectedRoads} /></div>
        </div>
      )}

      {/* 3. KPI Cards Row (Overview) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <KPI_Card title="เหตุการณ์ทั้งหมด" value={filteredData.length} subtext="ตามตัวกรองปัจจุบัน" icon={ListChecks} accentColor="bg-slate-200" />
        <KPI_Card title="เปิดช่องทางพิเศษ" value={filteredData.filter(d => d.category === 'ช่องทางพิเศษ').length} subtext="ยอดเปิด (ครั้ง)" icon={ArrowRightCircle} accentColor="bg-green-500" />
        <KPI_Card title="อุบัติเหตุ (กก.8)" value={filteredData.filter(d => d.category.includes('อุบัติเหตุ')).length} subtext="เฉพาะพื้นที่ กก.8" icon={CarFront} accentColor="bg-red-500" />
        <KPI_Card title="จับกุมเมาแล้วขับ" value={stats.drunkCount} subtext="คดีเมาสุรา" icon={Wine} accentColor="bg-purple-500" />
        <KPI_Card title="ปิดช่องทางพิเศษ" value={filteredData.filter(d => d.category === 'ปิดช่องทางพิเศษ').length} subtext="ยอดปิด (ครั้ง)" icon={StopCircle} accentColor="bg-slate-600" />
      </div>

      {/* 4. Balanced Visual Row: Map (Left) + Chart (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4 h-[450px]">
         {/* Map Section (Larger) */}
         <div className="lg:col-span-8 bg-slate-800 rounded-lg border border-slate-700 relative overflow-hidden shadow-md flex flex-col">
            <div className="absolute top-2 left-2 z-[400] bg-slate-900/90 px-3 py-1.5 rounded border border-slate-600 text-[10px] text-white font-bold flex items-center gap-2 shadow-sm">
                <MapIcon size={12} className="text-yellow-400"/> ภาพรวมสถานการณ์บนแผนที่
            </div>
            <div className="flex-1 w-full h-full">
                <MapViewer data={mapData} />
            </div>
         </div>

         {/* Chart Section (Smaller) */}
         <div className="lg:col-span-4 bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-md flex flex-col">
             <h3 className="text-sm font-bold text-white mb-2 pb-2 border-b border-slate-600 flex justify-between items-center">
                <span>สถิติแยกตาม กก.</span> <ShieldAlert size={16} className="text-slate-400"/>
             </h3>
             <div className="flex-1 w-full relative">
                <Bar 
                  data={stats.divChartConfig} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    indexAxis: 'y', 
                    plugins: { 
                      legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 }, color: '#94a3b8' } },
                      tooltip: { mode: 'index', intersect: false }
                    }, 
                    scales: { 
                        x: { stacked: true, grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: {size: 9} } }, 
                        y: { stacked: true, grid: { display: false }, ticks: { color: '#e2e8f0', font: { weight: 'bold', size: 10 } } } 
                    } 
                  }} 
                />
             </div>
         </div>
      </div>

      {/* 5. Data Logs (Bottom Full Width) */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-md flex flex-col h-[400px] overflow-hidden">
             <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-white text-sm font-bold flex items-center gap-2"><Siren size={16} className="text-yellow-500"/> รายการเหตุการณ์ล่าสุด (Log)</h3>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-600">{filteredData.length} รายการ</span>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="uppercase bg-slate-900 text-slate-500 sticky top-0 z-10">
                    <tr>
                        <th className="px-4 py-3 font-semibold w-[140px]">เวลา/วันที่</th>
                        <th className="px-4 py-3 font-semibold w-[160px]">พื้นที่รับผิดชอบ</th>
                        <th className="px-4 py-3 font-semibold w-[140px]">ประเภท</th>
                        <th className="px-4 py-3 font-semibold">รายละเอียดเหตุการณ์</th>
                        <th className="px-4 py-3 font-semibold w-[180px]">พิกัด/สถานที่</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredData.length > 0 ? filteredData.map((item, idx) => (
                      <tr key={idx} className={`hover:bg-slate-700/30 transition-colors ${item.category.includes('ปิด') || item.category === 'จราจรปกติ' ? 'opacity-50 grayscale' : ''}`}>
                        <td className="px-4 py-3 align-top">
                            <div className="text-yellow-400 font-mono font-bold text-sm">{item.time} น.</div>
                            <div className="text-[10px] text-slate-500">{item.date}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                            <span className="bg-slate-900 border border-slate-600 px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono">
                                กก.{item.div} ส.ทล.{item.st}
                            </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                            <span 
                                className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm whitespace-nowrap"
                                style={{ backgroundColor: CATEGORY_COLORS[item.category] || CATEGORY_COLORS['ทั่วไป'] }}
                            >
                                {item.category}
                            </span>
                        </td>
                        <td className="px-4 py-3 align-top text-slate-300 relative">
                            <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded ${
                                item.reportFormat === 'SAFETY' ? 'bg-red-500' : 
                                item.reportFormat === 'ENFORCE' ? 'bg-purple-500' : 'bg-green-500'
                            }`}></div>
                            <div className="pl-3">{item.detail}</div>
                        </td>
                        <td className="px-4 py-3 align-top text-[10px] text-slate-400">
                            <div>ทล.{item.road} กม.{item.km}</div>
                            <div>{item.dir}</div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="5" className="p-12 text-center text-slate-500"><div className="flex flex-col items-center gap-2"><div className="bg-slate-800 p-3 rounded-full"><Siren size={24} className="opacity-20"/></div><span>ไม่พบข้อมูลตามเงื่อนไข</span></div></td></tr>
                    )}
                  </tbody>
                </table>
             </div>
      </div>
    </div>
  );
}