import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCcw, ListChecks, AlertTriangle, Monitor, Calendar, Siren, 
  CarFront, Route, ShieldAlert, StopCircle, Activity, 
  CheckCircle2, ArrowRightCircle, Wine, Filter, ChevronUp, ChevronDown
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Imports (ตรวจสอบ path ให้ตรงกับเครื่องคุณ)
import { SHEET_TRAFFIC_URL, SHEET_ENFORCE_URL, SHEET_SAFETY_URL, ORG_STRUCTURE, EVENT_CATEGORIES, DIVISION_COLORS, CATEGORY_COLORS } from './constants/config';
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
  
  // UI States
  const [showFilters, setShowFilters] = useState(true); // State สำหรับซ่อน/แสดง Filter

  // Controls
  const [dateRangeOption, setDateRangeOption] = useState('today');
  const [customStart, setCustomStart] = useState(getThaiDateStr());
  const [customEnd, setCustomEnd] = useState(getThaiDateStr());
  const [filterDiv, setFilterDiv] = useState('');
  const [filterSt, setFilterSt] = useState(''); 
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedRoads, setSelectedRoads] = useState([]);

  // 1. Filter Dates
  const { filterStartDate, filterEndDate } = useMemo(() => {
    const today = new Date(); let start = new Date(today); let end = new Date(today);
    if (dateRangeOption === 'yesterday') { start.setDate(today.getDate() - 1); end.setDate(today.getDate() - 1); }
    else if (dateRangeOption === 'last7') { start.setDate(today.getDate() - 6); }
    else if (dateRangeOption === 'all') { return { filterStartDate: null, filterEndDate: null }; }
    else if (dateRangeOption === 'custom') { return { filterStartDate: customStart, filterEndDate: customEnd }; }
    return { filterStartDate: getThaiDateStr(start), filterEndDate: getThaiDateStr(end) };
  }, [dateRangeOption, customStart, customEnd]);

  // 2. Fetch Data
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

  // 3. Unique Lists
  const uniqueRoads = useMemo(() => {
    return Array.from(new Set(rawData.map(d => d.road).filter(r => r && r !== '-' && r.length < 10))).sort();
  }, [rawData]);

  const stations = useMemo(() => (filterDiv && ORG_STRUCTURE[filterDiv]) ? Array.from({ length: ORG_STRUCTURE[filterDiv] }, (_, i) => i + 1) : [], [filterDiv]);

  // 4. Main Data Logic (Logs ทั้งหมดตามช่วงเวลา)
  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      const passCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);
      const passRoad = selectedRoads.length === 0 || selectedRoads.includes(item.road);
      return passDate && passCategory && passRoad && (!filterDiv || item.div === filterDiv) && (!filterSt || item.st === filterSt);
    }).sort((a,b) => b.timestamp - a.timestamp);
  }, [rawData, filterStartDate, filterEndDate, filterDiv, filterSt, selectedCategories, selectedRoads]);

  // 5. Active Visual Data (สำหรับ Map เท่านั้น - คำนวณ Open/Close)
  const activeVisualData = useMemo(() => {
    // ต้อง Sort เก่าไปใหม่ เพื่อไล่สถานะเปิด/ปิด
    const sortedLog = [...filteredData].sort((a, b) => a.timestamp - b.timestamp);
    const activeStates = new Map(); 
    const otherEvents = []; 
    
    sortedLog.forEach(row => {
        const locKey = `${row.div}-${row.st}-${row.road}-${row.dir}`;
        
        // Logic การคัดกรองขึ้น Map
        if (row.category === 'จราจรติดขัด') { activeStates.set(locKey, row); } 
        else if (row.category === 'จราจรปกติ') { activeStates.delete(locKey); } 
        else if (row.category === 'ช่องทางพิเศษ') { activeStates.set(`LANE-${locKey}`, row); } 
        else if (row.category === 'ปิดช่องทางพิเศษ') { activeStates.delete(`LANE-${locKey}`); } // ลบออกจาก Map เมื่อปิด
        else { otherEvents.push(row); }
    });
    return [...otherEvents, ...activeStates.values()];
  }, [filteredData]);

  // 6. Statistics & Chart Configuration
  const stats = useMemo(() => {
    // 6.1 Drunk Driving
    const drunkCount = filteredData.filter(d => d.category === 'จับกุม' && d.detail && d.detail.includes('เมา')).length;

    // 6.2 Stacked Bar Chart Data (Division x Category)
    const divisions = ["1", "2", "3", "4", "5", "6", "7", "8"];
    // เลือก Category หลักๆ ที่จะแสดงในกราฟ
    const mainCats = ['อุบัติเหตุใหญ่', 'อุบัติเหตุทั่วไป', 'จับกุม', 'ช่องทางพิเศษ', 'จราจรติดขัด', 'ว.43'];
    
    const datasets = mainCats.map(cat => ({
        label: cat,
        data: divisions.map(div => filteredData.filter(d => d.div === div && d.category === cat).length),
        backgroundColor: CATEGORY_COLORS[cat] || '#cbd5e1',
        stack: 'Stack 0', // ให้ซ้อนกัน
    }));

    const divChartConfig = {
        labels: divisions.map(d => `กก.${d}`),
        datasets: datasets
    };

    return { drunkCount, divChartConfig };
  }, [filteredData]);

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  if (loading) return <SystemLoader />;
  if (error) return <div className="p-10 text-center text-white">Error Loading Data</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-4 font-sans text-slate-200">
      {/* Header */}
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

      {/* Control Panel (Collapsible) */}
      {showFilters && (
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 mb-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end shadow-md animate-in slide-in-from-top-2 duration-300">
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

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <KPI_Card title="เหตุการณ์ทั้งหมด" value={filteredData.length} subtext="ตามช่วงเวลา" icon={ListChecks} accentColor="bg-slate-200" />
        
        {/* ใช้ filteredData เพื่อนับยอดรวมที่เปิด (ไม่สนว่าปิดหรือยัง) */}
        <KPI_Card title="ช่องทางพิเศษ" value={filteredData.filter(d => d.category === 'ช่องทางพิเศษ').length} subtext="ยอดเปิดใช้ (ครั้ง)" icon={ArrowRightCircle} accentColor="bg-green-500" />
        
        <KPI_Card title="อุบัติเหตุ" value={filteredData.filter(d => d.category.includes('อุบัติเหตุ')).length} subtext="รวม ใหญ่+ทั่วไป" icon={CarFront} accentColor="bg-red-500" />
        <KPI_Card title="จับกุมเมาแล้วขับ" value={stats.drunkCount} subtext="คดีเมาสุรา" icon={Wine} accentColor="bg-purple-500" />
        <KPI_Card title="ปิดช่องทางพิเศษ" value={filteredData.filter(d => d.category === 'ปิดช่องทางพิเศษ').length} subtext="ยอดปิด (ครั้ง)" icon={StopCircle} accentColor="bg-slate-600" />
      </div>

      {/* Map (Reduced Height & using activeVisualData for logic) */}
      <div className="mb-4 bg-slate-800 rounded-lg border border-slate-700 h-[280px] relative overflow-hidden shadow-md transition-all">
         <div className="absolute top-2 left-2 z-[400] bg-slate-900/90 px-2 py-1 rounded border border-slate-600 text-[10px] text-green-400 font-mono flex items-center gap-2 shadow-sm"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> แสดงผลเฉพาะเหตุการณ์ที่ยัง Active</div>
         <MapViewer data={activeVisualData} />
      </div>

      {/* Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[500px]">
        
        {/* LEFT: Stacked Bar Chart */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-md flex flex-col h-full lg:col-span-1">
             <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-slate-600 flex justify-between items-center">
                <span>แยกประเภทตาม กก.</span> <ShieldAlert size={16}/>
             </h3>
             <div className="flex-1 w-full relative">
                <Bar 
                  data={stats.divChartConfig} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    indexAxis: 'y', // แนวนอน
                    plugins: { 
                      legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 }, color: '#94a3b8' } },
                      tooltip: { mode: 'index', intersect: false }
                    }, 
                    scales: { 
                        x: { stacked: true, grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } }, 
                        y: { stacked: true, grid: { display: false }, ticks: { color: '#e2e8f0', font: { weight: 'bold' } } } 
                    } 
                  }} 
                />
             </div>
        </div>

        {/* RIGHT: Log List */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-md flex flex-col h-full lg:col-span-2 overflow-hidden">
             <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-white text-sm font-bold flex items-center gap-2"><Siren size={16} className="text-yellow-500"/> รายการเหตุการณ์ล่าสุด</h3>
                <span className="text-xs text-slate-500">{filteredData.length} รายการ</span>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="uppercase bg-slate-900 text-slate-500 sticky top-0 z-10">
                    <tr>
                        <th className="px-4 py-3 font-semibold">เวลา/วันที่</th>
                        <th className="px-4 py-3 font-semibold">พื้นที่</th>
                        <th className="px-4 py-3 font-semibold">เหตุการณ์</th>
                        <th className="px-4 py-3 font-semibold">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredData.length > 0 ? filteredData.map((item, idx) => (
                      <tr key={idx} className={`hover:bg-slate-700/30 transition-colors ${item.category.includes('ปิด') || item.category === 'จราจรปกติ' ? 'opacity-50 grayscale' : ''}`}>
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                            <div className="text-yellow-400 font-mono font-bold">{item.time} น.</div>
                            <div className="text-[10px] text-slate-500">{item.date}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                            <span className="bg-slate-900 border border-slate-600 px-1.5 py-0.5 rounded text-[10px] text-slate-400 mr-1">กก.{item.div}</span>
                            <span className="text-[10px] block mt-1">ทล.{item.road} กม.{item.km}</span>
                        </td>
                        <td className="px-4 py-3 align-top">
                            <span 
                                className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm"
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
                      </tr>
                    )) : (
                      <tr><td colSpan="4" className="p-10 text-center text-slate-500"><AlertTriangle size={20} className="mx-auto mb-2"/>ไม่พบข้อมูล</td></tr>
                    )}
                  </tbody>
                </table>
             </div>
        </div>
      
      </div>
    </div>
  );
}