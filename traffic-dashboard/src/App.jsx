import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  RotateCcw, ListChecks, AlertTriangle, TrafficCone, 
  Monitor, Calendar, Siren, CarFront, Route, 
  ShieldAlert, ShieldCheck, CheckCircle2, ChevronDown, MapPin,
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

// URL ข้อมูลจริง
const SHEET_TRAFFIC_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwdOo14pW38cMImXNdEHIH7OTshrYf_6dGpEENgnYTa1kInJgosqeFGcpMpiOrq4Jw0nTJUn-02ogh/pub?gid=617598886&single=true&output=csv"; 
const SHEET_ENFORCE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwdOo14pW38cMImXNdEHIH7OTshrYf_6dGpEENgnYTa1kInJgosqeFGcpMpiOrq4Jw0nTJUn-02ogh/pub?gid=953397811&single=true&output=csv"; 
const SHEET_SAFETY_URL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwdOo14pW38cMImXNdEHIH7OTshrYf_6dGpEENgnYTa1kInJgosqeFGcpMpiOrq4Jw0nTJUn-02ogh/pub?gid=622673756&single=true&output=csv"; 

const DIVISION_COLORS = { "1": "#EF4444", "2": "#3B82F6", "3": "#10B981", "4": "#FBBF24", "5": "#A78BFA", "6": "#EC4899", "7": "#22D3EE", "8": "#6366F1" };
const ORG_STRUCTURE = { "1": 6, "2": 6, "3": 5, "4": 5, "5": 6, "6": 6, "7": 5, "8": 4 };

const EVENT_CATEGORIES = [
  'อุบัติเหตุใหญ่', 'อุบัติเหตุทั่วไป', 'จับกุม', 'ว.43', 'ช่องทางพิเศษ', 'จราจรติดขัด', 'ปิดช่องทางพิเศษ', 'จราจรปกติ'
];

// -----------------------------------------------------------------------------
// UI Component
// -----------------------------------------------------------------------------
const MultiSelectDropdown = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const toggleOption = (option) => {
    if (selected.includes(option)) onChange(selected.filter(item => item !== option));
    else onChange([...selected, option]);
  };
  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="text-[10px] text-slate-400 font-bold mb-1 block">{label}</label>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded flex justify-between items-center hover:border-slate-500 transition-colors">
        <span className="truncate">{selected.length === 0 ? "ทั้งหมด (All)" : `${selected.length} รายการ`}</span>
        <ChevronDown size={14} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded shadow-xl max-h-60 overflow-y-auto">
          {options.length > 0 ? options.map((option) => (
            <div key={option} className="flex items-center px-3 py-2 hover:bg-slate-700 cursor-pointer" onClick={() => toggleOption(option)}>
              <div className={`w-4 h-4 border rounded mr-2 flex items-center justify-center ${selected.includes(option) ? 'bg-yellow-500 border-yellow-500' : 'border-slate-500'}`}>
                {selected.includes(option) && <CheckCircle2 size={12} className="text-slate-900" />}
              </div>
              <span className="text-xs text-slate-200">{option}</span>
            </div>
          )) : <div className="p-2 text-xs text-slate-500 text-center">ไม่มีตัวเลือก</div>}
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Core Logic: CSV Parser & Processor
// -----------------------------------------------------------------------------
const getThaiDateStr = (date = new Date()) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

const parseCSV = (text) => {
  if (!text) return [];
  const rows = []; let currentRow = []; let currentVal = ''; let insideQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]; const nextChar = text[i+1];
    if (char === '"') {
      if (insideQuote && nextChar === '"') { currentVal += '"'; i++; } else { insideQuote = !insideQuote; }
    } else if (char === ',' && !insideQuote) { currentRow.push(currentVal.trim()); currentVal = ''; } 
    else if ((char === '\n' || char === '\r') && !insideQuote) {
      if (currentVal || currentRow.length > 0) currentRow.push(currentVal.trim());
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = []; currentVal = ''; if (char === '\r' && nextChar === '\n') i++;
    } else { currentVal += char; }
  }
  if (currentVal || currentRow.length > 0) { currentRow.push(currentVal.trim()); rows.push(currentRow); }
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.replace(/^"|"$/g, '').toLowerCase());
  return rows.slice(1).map(values => {
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index] ? values[index].replace(/^"|"$/g, '') : '';
      return obj;
    }, {});
  });
};

const processSheetData = (rawData, sourceFormat) => {
  const processed = rawData.map((row, index) => {
    const getVal = (possibleKeys) => {
      const keys = Object.keys(row);
      for (const pk of possibleKeys) {
        const foundKey = keys.find(k => k.includes(pk.toLowerCase()));
        if (foundKey && row[foundKey]) return row[foundKey].trim();
      }
      return '';
    };

    let dateStr = '', timeStr = '00:00';
    const timestampRaw = getVal(['timestamp', 'วันที่ เวลา']);
    const dateRaw = getVal(['วันที่', 'date']);
    const timeRaw = getVal(['เวลา', 'time']);
    
    // Garbage Filter
    if (!timestampRaw && !dateRaw) return null;
    const checkStr = (timestampRaw + dateRaw);
    if (!/\d/.test(checkStr) || checkStr.includes('หน่วย') || checkStr.includes('Date')) return null;

    try {
        if (timestampRaw) {
            const parts = timestampRaw.split(' ');
            if (parts.length >= 1) {
                let dPart = parts[0];
                if (dPart.includes('/')) {
                    const [d, m, y] = dPart.split('/');
                    let yr = parseInt(y); if (yr > 2400) yr -= 543; 
                    dateStr = `${yr}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
                } else if(dPart.includes('-')) { dateStr = dPart; }
                if (parts.length >= 2) timeStr = parts[1].substring(0, 5);
            }
        } else if (dateRaw) {
             if (dateRaw.includes('/')) {
                const [d, m, y] = dateRaw.split('/');
                let yr = parseInt(y); if (yr > 2400) yr -= 543;
                dateStr = `${yr}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
             } else { dateStr = dateRaw; }
             if (timeRaw) timeStr = timeRaw.replace(/[^\d:]/g, '').substring(0, 5);
        }
    } catch (e) { return null; }
    if (!dateStr || dateStr.length < 8) return null;

    let div = '1', st = '1';
    const unitRaw = getVal(['หน่วยงาน', 'unit']);
    const divMatch = unitRaw.match(/กก\.?\s*(\d+)/); if (divMatch) div = divMatch[1];
    const stMatch = unitRaw.match(/ส\.ทล\.?\s*(\d+)/); if (stMatch) st = stMatch[1];

    let road = '-', km = '-', dir = '-';
    const locRaw = getVal(['จุดเกิดเหตุ', 'location', 'สถานที่']);
    const expRoad = getVal(['ทล.', 'ทล', 'road']); if(expRoad) road = expRoad;
    const expKm = getVal(['กม.', 'กม', 'km']); if(expKm) km = expKm;
    const expDir = getVal(['ทิศทาง', 'direction']); if(expDir) dir = expDir;

    if (road === '-' && locRaw) {
        const roadMatch = locRaw.match(/(?:ทล|หมายเลข|no)\.?\s*(\d+)/i) || locRaw.match(/^(\d+)\s*\//);
        if (roadMatch) road = roadMatch[1];
        const kmMatch = locRaw.match(/(?:กม)\.?\s*(\d+)/i);
        if (kmMatch) km = kmMatch[1];
        if (locRaw.includes('ขาเข้า')) dir = 'ขาเข้า';
        else if (locRaw.includes('ขาออก')) dir = 'ขาออก';
    }

    let lat = parseFloat(getVal(['latitude', 'lat']));
    let lng = parseFloat(getVal(['longitude', 'lng']));
    if (isNaN(lat) || lat === 0) lat = 13.75 + (Math.random() - 0.5) * 2;
    if (isNaN(lng) || lng === 0) lng = 100.50 + (Math.random() - 0.5) * 2;

    let mainCategory = 'ทั่วไป', detailText = '', statusColor = 'bg-slate-500';

    if (sourceFormat === 'SAFETY') {
        const major = getVal(['เหตุน่าสนใจ', 'major']);
        const general = getVal(['เหตุทั่วไป', 'general']);
        if (major && major !== '-' && major.length > 1) { 
            mainCategory = 'อุบัติเหตุใหญ่'; detailText = major; statusColor = 'bg-red-600'; 
        } else {
            mainCategory = 'อุบัติเหตุทั่วไป'; detailText = general || '-'; statusColor = 'bg-orange-500';
        }
    } 
    else if (sourceFormat === 'ENFORCE') {
        const arrest = getVal(['ผลการจับกุม', 'จับกุม']);
        const checkpoint = getVal(['จุดตรวจ ว.43', 'ว.43']);
        if (arrest && arrest !== '-' && arrest.length > 1) {
            mainCategory = 'จับกุม'; detailText = arrest; statusColor = 'bg-purple-600';
        } else {
            mainCategory = 'ว.43'; detailText = checkpoint || '-'; statusColor = 'bg-indigo-500';
        }
    }
    else if (sourceFormat === 'TRAFFIC') {
        const specialLane = getVal(['ช่องทางพิเศษ']);
        const traffic = getVal(['สภาพจราจร']);
        const tailback = getVal(['ท้ายแถว']);

        if (specialLane && specialLane !== '-' && specialLane.length > 1) {
             if (specialLane.includes('ปิด') || specialLane.includes('ยกเลิก') || specialLane.includes('สิ้นสุด')) {
                mainCategory = 'ปิดช่องทางพิเศษ';
             } else {
                mainCategory = 'ช่องทางพิเศษ';
             }
             detailText = specialLane; statusColor = 'bg-green-500';
        } else if (traffic) {
             if (traffic.includes('ติดขัด') || traffic.includes('หนาแน่น') || traffic.includes('หยุดนิ่ง')) {
                mainCategory = 'จราจรติดขัด'; detailText = tailback ? `ท้ายแถว ${tailback}` : traffic; statusColor = 'bg-yellow-500';
             } else if (traffic.includes('คล่องตัว') || traffic.includes('ปกติ')) {
                mainCategory = 'จราจรปกติ'; detailText = traffic; statusColor = 'bg-slate-500';
             } else {
                mainCategory = 'สภาพจราจร'; detailText = traffic; statusColor = 'bg-slate-500';
             }
        }
    }

    return {
      id: `${sourceFormat}-${index}`,
      date: dateStr, time: timeStr, div: div, st: st,
      category: mainCategory, detail: detailText,
      road: road, km: km, dir: dir,
      lat: lat, lng: lng, colorClass: statusColor, reportFormat: sourceFormat,
      timestamp: new Date(`${dateStr}T${timeStr}`).getTime() || 0
    };
  });
  return processed.filter(item => item !== null);
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

const LeafletMapComponent = ({ data }) => {
  const getMarkerColor = (cat) => {
    if (cat.includes('อุบัติเหตุใหญ่')) return '#EF4444'; if (cat.includes('อุบัติเหตุ')) return '#F97316'; if (cat.includes('จับกุม')) return '#A855F7'; if (cat.includes('ว.43')) return '#6366F1'; if (cat.includes('ช่องทางพิเศษ')) return '#22C55E'; if (cat.includes('จราจรติดขัด')) return '#EAB308'; return '#94A3B8';
  };
  return (
    <MapContainer center={[13.75, 100.5]} zoom={6} style={{ height: '100%', width: '100%', background: '#0f172a' }}>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
      {data.map(item => (
        <CircleMarker key={item.id} center={[item.lat, item.lng]} radius={6} pathOptions={{ color: '#fff', fillColor: getMarkerColor(item.category), fillOpacity: 0.9, weight: 1.5 }}>
          <Popup className="digital-popup">
            <div className="font-sans text-sm min-w-[200px] text-slate-800">
              <strong className="block mb-2 text-base border-b border-slate-200 pb-1 flex items-center justify-between" style={{ color: DIVISION_COLORS[item.div] }}>
                <span>กก.{item.div} ส.ทล.{item.st}</span> <span className={`text-[10px] text-white px-2 py-0.5 rounded ${item.colorClass}`}>{item.time} น.</span>
              </strong>
              <div className="mb-2"><div className="text-xs font-bold text-slate-500 mb-1">{item.category}</div><div className="text-sm font-medium text-slate-800">{item.detail}</div></div>
              <div className="text-xs text-slate-500 pt-1 border-t border-slate-200 mt-1 flex justify-between items-center"><span className="flex items-center gap-1"><MapPin size={10}/> ทล.{item.road} กม.{item.km}</span><span className="font-bold">{item.dir}</span></div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
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
  
  const [dateRangeOption, setDateRangeOption] = useState('today');
  const [customStart, setCustomStart] = useState(todayStr);
  const [customEnd, setCustomEnd] = useState(todayStr);
  const [filterDiv, setFilterDiv] = useState('');
  const [filterSt, setFilterSt] = useState(''); 
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedRoads, setSelectedRoads] = useState([]);

  const { filterStartDate, filterEndDate } = useMemo(() => {
    const today = new Date(); let start = new Date(today); let end = new Date(today);
    if (dateRangeOption === 'yesterday') { start.setDate(today.getDate() - 1); end.setDate(today.getDate() - 1); }
    else if (dateRangeOption === 'last7') { start.setDate(today.getDate() - 6); }
    else if (dateRangeOption === 'all') { return { filterStartDate: null, filterEndDate: null }; }
    else if (dateRangeOption === 'custom') { return { filterStartDate: customStart, filterEndDate: customEnd }; }
    return { filterStartDate: getThaiDateStr(start), filterEndDate: getThaiDateStr(end) };
  }, [dateRangeOption, customStart, customEnd]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resTraffic, resEnforce, resSafety] = await Promise.all([
             fetch(SHEET_TRAFFIC_URL).then(r => r.text()).catch(e => ''),
             fetch(SHEET_ENFORCE_URL).then(r => r.text()).catch(e => ''),
             fetch(SHEET_SAFETY_URL).then(r => r.text()).catch(e => '')
        ]);
        const dataTraffic = processSheetData(parseCSV(resTraffic), 'TRAFFIC');
        const dataEnforce = processSheetData(parseCSV(resEnforce), 'ENFORCE');
        const dataSafety = processSheetData(parseCSV(resSafety), 'SAFETY');
        setRawData([...dataTraffic, ...dataEnforce, ...dataSafety]);
      } catch (error) { console.error("Fetch Error:", error); setRawData([]); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const uniqueRoads = useMemo(() => {
    const roads = new Set(rawData.map(d => d.road).filter(r => r && r !== '-' && r.length < 10));
    return Array.from(roads).sort();
  }, [rawData]);

  const logTableData = useMemo(() => {
    return rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      const passCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);
      const passRoad = selectedRoads.length === 0 || selectedRoads.includes(item.road);
      return passDate && passCategory && passRoad && (!filterDiv || item.div === filterDiv) && (!filterSt || item.st === filterSt);
    }).sort((a,b) => b.timestamp - a.timestamp);
  }, [rawData, filterStartDate, filterEndDate, filterDiv, filterSt, selectedCategories, selectedRoads]);

  // 🔥 FIXED LOGIC: Active Status Calculation
  const activeVisualData = useMemo(() => {
    const sortedLog = [...rawData].sort((a, b) => a.timestamp - b.timestamp); // Sort by time ascending
    const activeStates = new Map(); 
    const otherEvents = []; 
    
    sortedLog.forEach(row => {
        // Apply Filters first
        const passCategory = selectedCategories.length === 0 || selectedCategories.includes(row.category);
        const passRoad = selectedRoads.length === 0 || selectedRoads.includes(row.road);
        const passDiv = !filterDiv || row.div === filterDiv;
        const passSt = !filterSt || row.st === filterSt;
        if (!passCategory || !passRoad || !passDiv || !passSt) return;

        const locKey = `${row.div}-${row.st}-${row.road}-${row.dir}`;
        
        if (row.category === 'จราจรติดขัด') { activeStates.set(locKey, row); } 
        else if (row.category === 'จราจรปกติ') { activeStates.delete(locKey); } 
        
        // 🟢 SPECIAL LANE LOGIC
        else if (row.category === 'ช่องทางพิเศษ') { 
            activeStates.set(`LANE-${locKey}`, row); 
        } 
        else if (row.category === 'ปิดช่องทางพิเศษ') { 
            activeStates.delete(`LANE-${locKey}`); 
        } 
        
        else { 
            // Check date for non-state events (Accidents/Arrests)
            let passDate = true;
            if (filterStartDate && filterEndDate) passDate = row.date >= filterStartDate && row.date <= filterEndDate;
            if (passDate) otherEvents.push(row);
        }
    });
    return [...otherEvents, ...activeStates.values()];
  }, [rawData, filterStartDate, filterEndDate, filterDiv, filterSt, selectedCategories, selectedRoads]);

  const specialLaneStats = useMemo(() => {
    const openCount = activeVisualData.filter(d => d.category === 'ช่องทางพิเศษ').length;
    const closedCount = logTableData.filter(d => d.category === 'ปิดช่องทางพิเศษ').length;
    return { open: openCount, closed: closedCount };
  }, [activeVisualData, logTableData]);

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
      <div className="flex flex-wrap justify-between items-center mb-4 border-b border-slate-800 pb-2 gap-2">
        <div><h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2"><div className="bg-yellow-400 p-1 rounded text-slate-900"><Monitor size={20} /></div><span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">ศูนย์ปฏิบัติการจราจร บก.ทล.</span></h1></div>
        <div className="flex items-center gap-3"><span className="text-[10px] text-slate-500 font-mono hidden md:inline">DATA FEED: LIVE</span><button onClick={() => window.location.reload()} className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded border border-slate-600 hover:text-yellow-400 flex gap-2 text-xs"><RotateCcw size={14} /> REFRESH</button></div>
      </div>

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
          <div className="col-span-2 md:col-span-1 lg:col-span-1.5 relative"><MultiSelectDropdown label="หมวดหมู่" options={EVENT_CATEGORIES} selected={selectedCategories} onChange={setSelectedCategories} /></div>
          <div className="col-span-2 md:col-span-1 lg:col-span-1.5 relative"><MultiSelectDropdown label="เส้นทาง" options={uniqueRoads} selected={selectedRoads} onChange={setSelectedRoads} /></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        <KPI_Card title="Active Events" value={activeVisualData.length} subtext="เหตุการณ์คงค้าง" icon={ListChecks} accentColor="bg-slate-400" />
        <KPI_Card title="เปิดช่องทาง" value={specialLaneStats.open} subtext="กำลังเปิด (Active)" icon={ArrowRightCircle} accentColor="bg-green-500" />
        <KPI_Card title="ปิดช่องทาง" value={specialLaneStats.closed} subtext="สะสมในรอบวัน" icon={StopCircle} accentColor="bg-slate-600" />
        <KPI_Card title="รถติดขัด" value={activeVisualData.filter(d => d.category === 'จราจรติดขัด').length} subtext="วิกฤต/หนาแน่น" icon={TrafficCone} accentColor="bg-yellow-500" />
        <KPI_Card title="อุบัติเหตุ" value={activeVisualData.filter(d => d.category.includes('อุบัติเหตุ')).length} subtext="ใหญ่+ทั่วไป" icon={CarFront} accentColor="bg-red-500" />
        <KPI_Card title="จับกุม" value={activeVisualData.filter(d => d.category === 'จับกุม').length} subtext="ผู้กระทำผิด" icon={ShieldAlert} accentColor="bg-purple-500" />
      </div>

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