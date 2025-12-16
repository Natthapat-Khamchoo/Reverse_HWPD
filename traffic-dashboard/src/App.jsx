import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  RotateCcw, ListChecks, AlertTriangle, TrafficCone, 
  Monitor, Calendar, Siren, CarFront, Route, 
  ShieldAlert, ShieldCheck, CheckCircle2, ChevronDown, X,
  ArrowRightCircle, StopCircle
} from 'lucide-react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, 
  CategoryScale, LinearScale, BarElement, Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// -----------------------------------------------------------------------------
// Config & Setup
// -----------------------------------------------------------------------------
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);
ChartJS.defaults.color = '#cbd5e1'; 
ChartJS.defaults.borderColor = '#334155'; 

const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwdOo14pW38cMImXNdEHIH7OTshrYf_6dGpEENgnYTa1kInJgosqeFGcpMpiOrq4Jw0nTJUn-02ogh/pub?output=csv"; 

const DIVISION_COLORS = { "1": "#EF4444", "2": "#3B82F6", "3": "#10B981", "4": "#FBBF24", "5": "#A78BFA", "6": "#EC4899", "7": "#22D3EE", "8": "#6366F1" };
const ORG_STRUCTURE = { "1": 6, "2": 6, "3": 5, "4": 5, "5": 6, "6": 6, "7": 5, "8": 4 };

const EVENT_CATEGORIES = [
  'อุบัติเหตุใหญ่', 'อุบัติเหตุทั่วไป', 'จับกุม', 'ว.43', 'ช่องทางพิเศษ', 'จราจรติดขัด', 'ปิดช่องทางพิเศษ', 'จราจรปกติ'
];

// -----------------------------------------------------------------------------
// UI Component: MultiSelect Dropdown
// -----------------------------------------------------------------------------
const MultiSelectDropdown = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="text-[10px] text-slate-400 font-bold mb-1 block">{label}</label>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded flex justify-between items-center hover:border-slate-500 transition-colors"
      >
        <span className="truncate">
          {selected.length === 0 ? "ทั้งหมด (All)" : `${selected.length} รายการที่เลือก`}
        </span>
        <ChevronDown size={14} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded shadow-xl max-h-60 overflow-y-auto">
          {options.length > 0 ? (
            options.map((option) => (
              <div 
                key={option} 
                className="flex items-center px-3 py-2 hover:bg-slate-700 cursor-pointer"
                onClick={() => toggleOption(option)}
              >
                <div className={`w-4 h-4 border rounded mr-2 flex items-center justify-center ${selected.includes(option) ? 'bg-yellow-500 border-yellow-500' : 'border-slate-500'}`}>
                  {selected.includes(option) && <CheckCircle2 size={12} className="text-slate-900" />}
                </div>
                <span className="text-xs text-slate-200">{option}</span>
              </div>
            ))
          ) : (
             <div className="p-2 text-xs text-slate-500 text-center">ไม่มีตัวเลือก</div>
          )}
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Helper Logic
// -----------------------------------------------------------------------------
const getThaiDateStr = (date = new Date()) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
const parseCSV = (text) => {
  const lines = text.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^['"]+|['"]+$/g, ''));
  return lines.slice(1).map(line => {
    const values = []; let match; const regex = /(?:^|,)(?:"([^"]*)"|([^",]*))/g;
    while ((match = regex.exec(line)) !== null) { if (match.index === regex.lastIndex) regex.lastIndex++; if (match[0] === '' && values.length >= headers.length) break; let val = match[1] !== undefined ? match[1] : match[2]; values.push(val ? val.trim() : ''); }
    return headers.reduce((obj, header, index) => { obj[header] = values[index] || ''; return obj; }, {});
  });
};

const processSheetData = (rawData) => {
  return rawData.map((row, index) => {
    let dateStr = '', timeStr = '';
    const dateTimeRaw = row['วันที่ เวลา'] || row['Timestamp'] || '';
    if (dateTimeRaw) {
      const parts = dateTimeRaw.split(' ');
      if (parts.length >= 2) {
        let dPart = parts[0];
        if (dPart.includes('/')) { const [d, m, y] = dPart.split('/'); const year = parseInt(y) > 2400 ? parseInt(y) - 543 : y; dateStr = `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`; } else { dateStr = dPart; }
        timeStr = parts[1].substring(0, 5);
      } else { dateStr = dateTimeRaw; timeStr = '00:00'; }
    }
    let div = '1', st = '1';
    const unitRaw = row['หน่วยงาน'] || '';
    const divMatch = unitRaw.match(/กก\.?\s*(\d+)/) || unitRaw.match(/\/(\d+)/); if (divMatch) div = divMatch[1];
    const stMatch = unitRaw.match(/ส\.ทล\.?\s*(\d+)/) || unitRaw.match(/^(\d+)\//); if (stMatch) st = stMatch[1];
    
    let lat = parseFloat(row['Latitude'] || row['พิกัด']?.split(',')[0]);
    let lng = parseFloat(row['Longitude'] || row['พิกัด']?.split(',')[1]);
    if (isNaN(lat) || isNaN(lng)) { lat = 13.75 + (Math.random() - 0.5) * 0.1; lng = 100.50 + (Math.random() - 0.5) * 0.1; }

    let mainCategory = 'ทั่วไป', detailText = '', statusColor = 'bg-slate-500';
    let reportFormat = 'TRAFFIC'; // Default format (TRAFFIC, ENFORCE, SAFETY)

    const majorAccident = row['เหตุน่าสนใจ (กก.1-7)/ภัยพิบัติ'] || row['เหตุน่าสนใจ'] || '';
    const arrest = row['จับกุม/เมา'] || '';
    const checkpoint = row['ว.43 (จุด/ผล)'] || row['ว.43'] || '';
    const generalAccident = row['เหตุทั่วไป (กก.8)'] || row['เหตุทั่วไป'] || '';
    const specialLane = row['ช่องทางพิเศษ'] || '';
    const traffic = row['สภาพจราจร'] || '';
    const tailback = row['ท้ายแถว'] || '';

    if (majorAccident && majorAccident !== '-') { 
        mainCategory = 'อุบัติเหตุใหญ่'; detailText = majorAccident; statusColor = 'bg-red-600'; 
        reportFormat = 'SAFETY';
    } else if (arrest && arrest !== '-') { 
        mainCategory = 'จับกุม'; detailText = arrest; statusColor = 'bg-purple-600'; 
        reportFormat = 'ENFORCE';
    } else if (checkpoint && checkpoint !== '-') { 
        mainCategory = 'ว.43'; detailText = checkpoint; statusColor = 'bg-indigo-500'; 
        reportFormat = 'ENFORCE';
    } else if (generalAccident && generalAccident !== '-') { 
        mainCategory = 'อุบัติเหตุทั่วไป'; detailText = generalAccident; statusColor = 'bg-orange-500'; 
        reportFormat = 'SAFETY';
    } else if (specialLane && specialLane !== '-') { 
      if (specialLane.includes('ปิด') || specialLane.includes('ยกเลิก') || specialLane.includes('สิ้นสุด')) {
          mainCategory = 'ปิดช่องทางพิเศษ';
      } else {
          mainCategory = 'ช่องทางพิเศษ';
      }
      detailText = specialLane; statusColor = 'bg-green-500'; 
      reportFormat = 'TRAFFIC';
    } else if (traffic) {
      if (traffic.includes('ติดขัด') || traffic.includes('หนาแน่น') || traffic.includes('หยุดนิ่ง')) { mainCategory = 'จราจรติดขัด'; detailText = `ท้ายแถว: ${tailback}`; statusColor = 'bg-yellow-500'; }
      else if (traffic.includes('คล่องตัว') || traffic.includes('ปกติ')) { mainCategory = 'จราจรปกติ'; detailText = traffic; statusColor = 'bg-slate-500'; }
      else { mainCategory = 'สภาพจราจร'; detailText = traffic; statusColor = 'bg-slate-500'; }
      reportFormat = 'TRAFFIC';
    }

    return {
      id: index, date: dateStr, time: timeStr, div: div, st: st, category: mainCategory, detail: detailText,
      road: row['ทล.'] || '-', km: row['กม.'] || '-', dir: row['ขา'] || row['ทิศทาง'] || '-',
      traffic_status: traffic, tailback: tailback, special_lane: specialLane, 
      lat: lat, lng: lng, colorClass: statusColor, reportFormat: reportFormat,
      timestamp: new Date(`${dateStr}T${timeStr}`).getTime()
    };
  });
};

// -----------------------------------------------------------------------------
// UI Parts
// -----------------------------------------------------------------------------
const KPI_Card = ({ title, value, subtext, icon: Icon, accentColor }) => (
  <div className={`bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-lg relative overflow-hidden group hover:border-slate-600 transition-all`}>
    <div className={`absolute top-0 left-0 w-1 h-full ${accentColor}`}></div>
    <div className="flex justify-between items-start z-10 relative">
      <div><p className="text-slate-400 text-xs font-bold uppercase">{title}</p><p className="text-2xl font-bold mt-1 text-white font-mono">{value}</p><p className="text-[10px] text-slate-500 mt-1">{subtext}</p></div>
      <div className={`p-2 rounded bg-slate-700/50 text-slate-300 group-hover:text-white transition-colors`}><Icon size={20} /></div>
    </div>
  </div>
);

const MapAutoFit = ({ markers }) => {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = markers.map(m => [m.lat, m.lng]);
      const validBounds = bounds.filter(b => !isNaN(b[0]) && !isNaN(b[1]));
      if (validBounds.length > 0) map.fitBounds(validBounds, { padding: [50, 50] });
    }
  }, [markers, map]);
  return null;
};

const LeafletMapComponent = ({ data }) => {
  const getMarkerColor = (category) => {
    if (category.includes('อุบัติเหตุใหญ่')) return '#EF4444'; if (category.includes('อุบัติเหตุทั่วไป')) return '#F97316'; if (category.includes('จับกุม')) return '#A855F7'; if (category.includes('ว.43')) return '#6366F1'; if (category.includes('ช่องทางพิเศษ')) return '#22C55E'; if (category.includes('จราจรติดขัด')) return '#EAB308'; return '#94A3B8';
  };
  return (
    <MapContainer center={[13.75, 100.5]} zoom={6} style={{ height: '100%', width: '100%', background: '#0f172a' }}>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
      {data.map(item => (
        <CircleMarker key={item.id} center={[item.lat, item.lng]} radius={6} pathOptions={{ color: '#fff', fillColor: getMarkerColor(item.category), fillOpacity: 0.9, weight: 1.5 }}>
          <Popup className="digital-popup">
            <div className="font-sans text-sm min-w-[200px] text-slate-800">
              <strong className="block mb-2 text-base border-b border-slate-200 pb-1 flex items-center justify-between" style={{ color: DIVISION_COLORS[item.div] }}>
                <span>กก.{item.div} ส.ทล.{item.st}</span> <span className={`text-[10px] text-white px-2 py-0.5 rounded ${item.colorClass}`}>{item.time}</span>
              </strong>
              {/* DISPLAY FORMAT LOGIC */}
              {item.reportFormat === 'SAFETY' && (
                 <div className="bg-red-50 p-2 rounded border border-red-100 mb-2">
                    <div className="text-xs font-bold text-red-600 mb-1 flex items-center gap-1"><AlertTriangle size={12}/> อุบัติเหตุ/ภัยพิบัติ</div>
                    <div className="text-sm text-slate-700">{item.detail}</div>
                 </div>
              )}
              {item.reportFormat === 'ENFORCE' && (
                 <div className="bg-purple-50 p-2 rounded border border-purple-100 mb-2">
                    <div className="text-xs font-bold text-purple-600 mb-1 flex items-center gap-1"><ShieldAlert size={12}/> ผลการจับกุม/ว.43</div>
                    <div className="text-sm text-slate-700">{item.detail}</div>
                 </div>
              )}
              {item.reportFormat === 'TRAFFIC' && (
                 <div className="bg-yellow-50 p-2 rounded border border-yellow-100 mb-2">
                    <div className="text-xs font-bold text-yellow-700 mb-1 flex items-center gap-1"><TrafficCone size={12}/> สภาพจราจร</div>
                    <div className="text-sm text-slate-700">{item.detail}</div>
                 </div>
              )}
              
              <div className="text-xs text-slate-500 pt-1 border-t border-slate-200 mt-1 flex justify-between">
                <span>ทล.{item.road} กม.{item.km}</span>
                <span className="font-bold">{item.dir}</span>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
      <MapAutoFit markers={data} />
    </MapContainer>
  );
};

// -----------------------------------------------------------------------------
// MAIN APP
// -----------------------------------------------------------------------------
export default function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const todayStr = getThaiDateStr();
  
  // State: Filters
  const [dateRangeOption, setDateRangeOption] = useState('today');
  const [customStart, setCustomStart] = useState(todayStr);
  const [customEnd, setCustomEnd] = useState(todayStr);
  const [filterDiv, setFilterDiv] = useState('');
  const [filterSt, setFilterSt] = useState(''); 
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedRoads, setSelectedRoads] = useState([]);

  // Calculate Date Range
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
      setLoading(true);
      try {
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        const text = await response.text();
        const mappedData = processSheetData(parseCSV(text)); 
        setRawData(mappedData);
      } catch (error) { console.error(error); setRawData([]); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  // Unique Roads for Filter Options
  const uniqueRoads = useMemo(() => {
    const roads = new Set(rawData.map(d => d.road).filter(r => r && r !== '-'));
    return Array.from(roads).sort();
  }, [rawData]);

  // 1. Log Data (History)
  const logTableData = useMemo(() => {
    return rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      const passCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);
      const passRoad = selectedRoads.length === 0 || selectedRoads.includes(item.road);
      return passDate && passCategory && passRoad && (!filterDiv || item.div === filterDiv) && (!filterSt || item.st === filterSt);
    }).sort((a,b) => b.timestamp - a.timestamp);
  }, [rawData, filterStartDate, filterEndDate, filterDiv, filterSt, selectedCategories, selectedRoads]);

  // 2. Active State Data
  const activeVisualData = useMemo(() => {
    const sortedLog = [...logTableData].sort((a, b) => a.timestamp - b.timestamp);
    const activeStates = new Map(); 
    const otherEvents = []; 
    sortedLog.forEach(row => {
        const locKey = `${row.div}-${row.st}-${row.road}-${row.dir}`;
        if (row.category === 'จราจรติดขัด') { activeStates.set(locKey, row); } 
        else if (row.category === 'จราจรปกติ') { activeStates.delete(locKey); } 
        else if (row.category === 'ช่องทางพิเศษ') { activeStates.set(`LANE-${locKey}`, row); } 
        else if (row.category === 'ปิดช่องทางพิเศษ') { activeStates.delete(`LANE-${locKey}`); } 
        else { otherEvents.push(row); }
    });
    return [...otherEvents, ...activeStates.values()];
  }, [logTableData]);

  // 3. Special Lane Counts (Separate Logic)
  const specialLaneStats = useMemo(() => {
    // Open: นับจาก Active State ที่เป็น 'ช่องทางพิเศษ'
    const openCount = activeVisualData.filter(d => d.category === 'ช่องทางพิเศษ').length;
    // Closed: นับจาก Log ที่เป็น 'ปิดช่องทางพิเศษ' (Cumulative in period)
    const closedCount = logTableData.filter(d => d.category === 'ปิดช่องทางพิเศษ').length;
    return { open: openCount, closed: closedCount };
  }, [activeVisualData, logTableData]);

  // Chart Data
  const roadChartConfig = useMemo(() => {
    const roadStats = {};
    activeVisualData.forEach(d => {
        if(d.road && d.road !== '-' && d.road !== '') {
           const roadName = `ทล.${d.road}`;
           roadStats[roadName] = (roadStats[roadName] || 0) + 1;
        }
    });
    const sortedRoads = Object.entries(roadStats).sort((a,b) => b[1] - a[1]).slice(0, 7);
    return {
       labels: sortedRoads.map(i => i[0]),
       datasets: [{ label: 'จำนวนจุด', data: sortedRoads.map(i => i[1]), backgroundColor: '#F59E0B', borderRadius: 4, barThickness: 20 }]
    };
  }, [activeVisualData]);

  const catChartData = useMemo(() => {
    const counts = {}; 
    activeVisualData.forEach(d => { 
      let key = d.category;
      if (key.includes('จราจร')) key = 'จราจรติดขัด'; 
      counts[key] = (counts[key] || 0) + 1; 
    });
    return {
      labels: Object.keys(counts),
      datasets: [{ data: Object.values(counts), backgroundColor: ['#EF4444', '#A855F7', '#6366F1', '#F97316', '#22C55E', '#EAB308', '#64748B'], borderWidth: 0 }]
    };
  }, [activeVisualData]);

  const stations = useMemo(() => (filterDiv && ORG_STRUCTURE[filterDiv]) ? Array.from({ length: ORG_STRUCTURE[filterDiv] }, (_, i) => i + 1) : [], [filterDiv]);

  return (
    <div className="min-h-screen bg-slate-900 p-4 font-sans text-slate-200">
      
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 border-b border-slate-800 pb-2 gap-2">
        <div><h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2"><div className="bg-yellow-400 p-1 rounded text-slate-900"><Monitor size={20} /></div><span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">ศูนย์ปฏิบัติการจราจร บก.ทล.</span></h1></div>
        <div className="flex items-center gap-3"><span className="text-[10px] text-slate-500 font-mono hidden md:inline">DATA FEED: LIVE</span><button onClick={() => window.location.reload()} className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded border border-slate-600 hover:text-yellow-400 flex gap-2 text-xs"><RotateCcw size={14} /> REFRESH</button></div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 mb-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
          <div className="col-span-2 md:col-span-1 lg:col-span-1">
             <label className="text-[10px] text-yellow-400 font-bold mb-1 block"><Calendar size={10} className="inline mr-1"/> ช่วงเวลา</label>
             <select className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded mb-1" value={dateRangeOption} onChange={e => setDateRangeOption(e.target.value)}>
               <option value="today">วันนี้ (Today)</option>
               <option value="yesterday">เมื่อวาน</option>
               <option value="last7">7 วันย้อนหลัง</option>
               <option value="all">ทั้งหมด</option>
               <option value="custom">กำหนดเอง (Custom)</option>
             </select>
             {dateRangeOption === 'custom' && (<div className="flex gap-1 animate-in fade-in zoom-in duration-200"><input type="date" className="w-1/2 bg-slate-900 border border-slate-600 text-white text-[10px] p-1 rounded" value={customStart} onChange={e => setCustomStart(e.target.value)} /><input type="date" className="w-1/2 bg-slate-900 border border-slate-600 text-white text-[10px] p-1 rounded" value={customEnd} onChange={e => setCustomEnd(e.target.value)} /></div>)}
          </div>
          <div className="col-span-1"><label className="text-[10px] text-slate-400 font-bold mb-1 block">กองกำกับการ</label><select className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded" value={filterDiv} onChange={e => { setFilterDiv(e.target.value); setFilterSt(''); }}><option value="">ทุกกองฯ</option>{Object.keys(ORG_STRUCTURE).map(k => <option key={k} value={k}>กก.{k}</option>)}</select></div>
          <div className="col-span-1"><label className="text-[10px] text-slate-400 font-bold mb-1 block">สถานี (ส.ทล.)</label><select className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded" value={filterSt} onChange={e => setFilterSt(e.target.value)} disabled={!filterDiv}><option value="">ทุกสถานี</option>{stations.map(s => <option key={s} value={s}>ส.ทล.{s}</option>)}</select></div>
          <div className="col-span-2 md:col-span-1 lg:col-span-1.5 relative"><MultiSelectDropdown label="หมวดหมู่ (เลือกได้หลายข้อ)" options={EVENT_CATEGORIES} selected={selectedCategories} onChange={setSelectedCategories} /></div>
          <div className="col-span-2 md:col-span-1 lg:col-span-1.5 relative"><MultiSelectDropdown label="เส้นทาง (เลือกได้หลายข้อ)" options={uniqueRoads} selected={selectedRoads} onChange={setSelectedRoads} /></div>
      </div>

      {/* KPI Cards (With Split Lane Stats) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        <KPI_Card title="Active Events" value={activeVisualData.length} subtext="เหตุการณ์คงค้าง" icon={ListChecks} accentColor="bg-slate-400" />
        <KPI_Card title="เปิดช่องทาง" value={specialLaneStats.open} subtext="กำลังเปิด (Active)" icon={ArrowRightCircle} accentColor="bg-green-500" />
        <KPI_Card title="ปิดช่องทาง" value={specialLaneStats.closed} subtext="สะสมในรอบวัน" icon={StopCircle} accentColor="bg-slate-600" />
        <KPI_Card title="รถติดขัด" value={activeVisualData.filter(d => d.category === 'จราจรติดขัด').length} subtext="วิกฤต/หนาแน่น" icon={TrafficCone} accentColor="bg-yellow-500" />
        <KPI_Card title="อุบัติเหตุ" value={activeVisualData.filter(d => d.category.includes('อุบัติเหตุ')).length} subtext="ใหญ่+ทั่วไป" icon={CarFront} accentColor="bg-red-500" />
        <KPI_Card title="จับกุม" value={activeVisualData.filter(d => d.category === 'จับกุม').length} subtext="ผู้กระทำผิด" icon={ShieldAlert} accentColor="bg-purple-500" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 mb-4">
        <div className="lg:col-span-4 bg-slate-800 rounded-lg border border-slate-700 h-[350px] lg:h-[400px] relative overflow-hidden">
          <div className="absolute top-2 left-2 z-[400] bg-slate-900/80 px-2 py-0.5 rounded border border-slate-600 text-[10px] text-green-400 font-mono flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> CURRENT STATUS VIEW</div>
          <LeafletMapComponent data={activeVisualData} />
        </div>
        <div className="lg:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col h-[200px] md:h-full">
             <h3 className="text-xs font-bold text-white mb-2 pb-1 border-b border-slate-600">ถนนที่มีเหตุการณ์สูงสุด (Top Roads)</h3>
             <div className="flex-1 w-full h-full relative"><Bar data={roadChartConfig} options={{ indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#334155' } }, y: { ticks: { color: '#fff', font: { weight: 'bold' } }, grid: { display: false } } } }} /></div>
           </div>
           <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col h-[200px] md:h-full">
             <h3 className="text-xs font-bold text-white mb-2 pb-1 border-b border-slate-600">สัดส่วนประเภทเหตุการณ์</h3>
             <div className="flex-1 w-full h-full relative flex items-center justify-center"><Doughnut data={catChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#cbd5e1', boxWidth: 8, font: { size: 10 } } } } }} /></div>
           </div>
        </div>
      </div>

      {/* Log Table (3 Formats) */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-700 flex justify-between items-center"><h3 className="text-white text-xs font-bold flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span> บันทึกเหตุการณ์ทั้งหมด (History Log)</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="uppercase bg-slate-900/50 text-slate-500"><tr><th className="px-4 py-2 w-[100px]">เวลา</th><th className="px-4 py-2 w-[110px]">หน่วยงาน</th><th className="px-4 py-2 w-[120px]">หมวดหมู่</th><th className="px-4 py-2">รายละเอียด</th><th className="px-4 py-2">สถานที่</th></tr></thead>
            <tbody className="divide-y divide-slate-700">
              {logTableData.length > 0 ? logTableData.map((item, idx) => (
                <tr key={idx} className={`hover:bg-slate-700/50 transition-colors ${item.category.includes('ปกติ') || item.category.includes('ปิด') ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2 font-mono text-yellow-400 align-top">{item.time} น.<div className="text-[9px] text-slate-500">{item.date}</div></td>
                  <td className="px-4 py-2 align-top"><span className="bg-slate-900 border border-slate-600 px-1.5 py-0.5 rounded text-[10px]">ส.ทล.{item.st} กก.{item.div}</span></td>
                  <td className="px-4 py-2 align-top"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${item.colorClass}`}>{item.category === 'จราจรปกติ' ? <span className="flex items-center gap-1"><CheckCircle2 size={10}/> เข้าสู่ภาวะปกติ</span> : item.category}</span></td>
                  <td className="px-4 py-2 align-top">
                     {/* 3 FORMAT DISPLAY IN TABLE */}
                     {item.reportFormat === 'TRAFFIC' && <div className="text-slate-200 border-l-2 border-yellow-500 pl-2">{item.detail || '-'}</div>}
                     {item.reportFormat === 'ENFORCE' && <div className="text-purple-200 border-l-2 border-purple-500 pl-2">{item.detail || '-'}</div>}
                     {item.reportFormat === 'SAFETY' && <div className="text-red-200 border-l-2 border-red-500 pl-2">{item.detail || '-'}</div>}
                  </td>
                  <td className="px-4 py-2 align-top text-[10px] font-mono text-slate-400"><div>ทล.{item.road} กม.{item.km}</div><div>{item.dir}</div></td>
                </tr>
              )) : <tr><td colSpan="5" className="p-6 text-center text-slate-500">ไม่พบข้อมูล</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}