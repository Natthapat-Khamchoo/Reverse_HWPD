import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  RotateCcw, ListChecks, AlertTriangle, TrafficCone, 
  Monitor, Calendar, Siren, CarFront, Route, 
  ShieldAlert, ShieldCheck, CheckCircle2, ChevronDown, MapPin,
  ArrowRightCircle, StopCircle, Server, Activity, AlertOctagon
} from 'lucide-react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, 
  CategoryScale, LinearScale, BarElement, Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// -----------------------------------------------------------------------------
// Config & Setup
// -----------------------------------------------------------------------------
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);
ChartJS.defaults.color = '#94a3b8'; 
ChartJS.defaults.borderColor = '#334155'; 
ChartJS.defaults.font.family = "'Sarabun', 'Prompt', sans-serif"; // แนะนำให้ใช้ font ภาษาไทยถ้ามี

// URL Google Sheets (CSV)
const SHEET_TRAFFIC_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwdOo14pW38cMImXNdEHIH7OTshrYf_6dGpEENgnYTa1kInJgosqeFGcpMpiOrq4Jw0nTJUn-02ogh/pub?gid=617598886&single=true&output=csv"; 
const SHEET_ENFORCE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwdOo14pW38cMImXNdEHIH7OTshrYf_6dGpEENgnYTa1kInJgosqeFGcpMpiOrq4Jw0nTJUn-02ogh/pub?gid=953397811&single=true&output=csv"; 
const SHEET_SAFETY_URL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwdOo14pW38cMImXNdEHIH7OTshrYf_6dGpEENgnYTa1kInJgosqeFGcpMpiOrq4Jw0nTJUn-02ogh/pub?gid=622673756&single=true&output=csv"; 

const DIVISION_COLORS = { "1": "#EF4444", "2": "#3B82F6", "3": "#10B981", "4": "#FBBF24", "5": "#A78BFA", "6": "#EC4899", "7": "#22D3EE", "8": "#6366F1" };
const ORG_STRUCTURE = { "1": 6, "2": 6, "3": 5, "4": 5, "5": 6, "6": 6, "7": 5, "8": 4 };
const EVENT_CATEGORIES = ['อุบัติเหตุใหญ่', 'อุบัติเหตุทั่วไป', 'จับกุม', 'ว.43', 'ช่องทางพิเศษ', 'จราจรติดขัด', 'ปิดช่องทางพิเศษ', 'จราจรปกติ'];

// -----------------------------------------------------------------------------
// Component: System Loading Screen (ภาษาไทย)
// -----------------------------------------------------------------------------
const SystemLoader = () => (
  <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center font-mono">
    <div className="relative">
      {/* Radar Scan Effect */}
      <div className="absolute inset-0 border-4 border-slate-800 rounded-full animate-ping opacity-20"></div>
      <div className="w-24 h-24 border-t-4 border-r-4 border-yellow-500 rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Siren className="text-yellow-500 animate-pulse" size={32} />
      </div>
    </div>
    
    <div className="mt-8 text-center space-y-2">
      <h2 className="text-xl font-bold text-white tracking-[0.1em] animate-pulse">
        กำลังเริ่มต้นระบบปฏิบัติการ
      </h2>
      <div className="flex items-center justify-center gap-2 text-xs text-green-500">
        <Server size={12} />
        <span>กำลังเชื่อมต่อฐานข้อมูลตำรวจทางหลวง...</span>
      </div>
      <div className="flex gap-1 justify-center mt-4">
        <div className="w-1 h-4 bg-yellow-600 animate-[pulse_1s_ease-in-out_infinite]"></div>
        <div className="w-1 h-4 bg-yellow-500 animate-[pulse_1s_ease-in-out_0.2s_infinite]"></div>
        <div className="w-1 h-4 bg-yellow-400 animate-[pulse_1s_ease-in-out_0.4s_infinite]"></div>
      </div>
    </div>
  </div>
);

// -----------------------------------------------------------------------------
// Component: Multi-Select UI
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
        <span className="truncate">{selected.length === 0 ? "เลือกทั้งหมด" : `${selected.length} รายการ`}</span>
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
// Core Logic: Data Processing (เหมือนเดิม)
// -----------------------------------------------------------------------------
const getThaiDateStr = (date = new Date()) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

const formatTime24 = (rawTime) => {
  if (!rawTime) return '00:00';
  let t = rawTime.toString().replace(/น\.|น/g, '').trim().toUpperCase();
  t = t.replace('.', ':');
  const isPM = t.includes('PM') || t.includes('P.M');
  const isAM = t.includes('AM') || t.includes('A.M');
  const timeOnly = t.replace(/[^\d:]/g, ''); 
  let [h, m] = timeOnly.split(':');
  if (!h) return '00:00';
  if (!m) m = '00';
  let hh = parseInt(h, 10);
  const mm = parseInt(m.substring(0, 2), 10);
  if (isPM && hh < 12) hh += 12;
  if (isAM && hh === 12) hh = 0;
  if (hh > 23) hh = 0;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
};

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

    const timeRaw = getVal(['เวลา', 'time']); 
    const dateRaw = getVal(['วันที่', 'date']);
    const timestampRaw = getVal(['timestamp', 'วันที่ เวลา']);
    
    const checkStr = (timestampRaw + dateRaw);
    if (!/\d/.test(checkStr) || checkStr.includes('หน่วย') || checkStr.includes('Date')) return null;

    let dateStr = '';
    let timeStr = '00:00';

    if (dateRaw && dateRaw.includes('/')) {
        const [d, m, y] = dateRaw.split('/');
        let year = parseInt(y);
        if (year > 2400) year -= 543;
        dateStr = `${year}-${m.toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
    } else if (timestampRaw) {
        const parts = timestampRaw.split(' ');
        if (parts[0].includes('/')) {
            const [d, m, y] = parts[0].split('/');
            let year = parseInt(y); if (year > 2400) year -= 543;
            dateStr = `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
        } else { dateStr = parts[0]; }
    }

    if (timeRaw) { timeStr = formatTime24(timeRaw); } 
    else if (timestampRaw) {
        const parts = timestampRaw.split(' ');
        if (parts.length >= 2) { const tPart = parts.slice(1).join(' '); timeStr = formatTime24(tPart); }
    }

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
    } else if (sourceFormat === 'ENFORCE') {
        const arrest = getVal(['ผลการจับกุม', 'จับกุม']);
        const checkpoint = getVal(['จุดตรวจ ว.43', 'ว.43']);
        if (arrest && arrest !== '-' && arrest.length > 1) {
            mainCategory = 'จับกุม'; detailText = arrest; statusColor = 'bg-purple-600';
        } else {
            mainCategory = 'ว.43'; detailText = checkpoint || '-'; statusColor = 'bg-indigo-500';
        }
    } else if (sourceFormat === 'TRAFFIC') {
        const specialLane = getVal(['ช่องทางพิเศษ']);
        const traffic = getVal(['สภาพจราจร']);
        const tailback = getVal(['ท้ายแถว']);
        if (specialLane && specialLane !== '-' && specialLane.length > 1) {
             if (specialLane.includes('เปิด') || specialLane.includes('เริ่ม')) mainCategory = 'ช่องทางพิเศษ'; 
             else if (specialLane.includes('ปิด') || specialLane.includes('ยกเลิก')) mainCategory = 'ปิดช่องทางพิเศษ'; 
             else mainCategory = 'ช่องทางพิเศษ'; 
             detailText = specialLane; statusColor = 'bg-green-500';
        } else if (traffic) {
             if (traffic.includes('ติดขัด') || traffic.includes('หนาแน่น')) {
                mainCategory = 'จราจรติดขัด'; detailText = tailback ? `ท้ายแถว ${tailback}` : traffic; statusColor = 'bg-yellow-500';
             } else {
                mainCategory = 'จราจรปกติ'; detailText = traffic; statusColor = 'bg-slate-500';
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
      <div><p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{title}</p><p className="text-2xl font-bold mt-1 text-white font-mono">{value}</p><p className="text-[9px] text-slate-500 mt-1">{subtext}</p></div>
      <div className={`p-2 rounded bg-slate-700/50 text-slate-300 group-hover:text-white transition-colors`}><Icon size={18} /></div>
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
  const [error, setError] = useState(false);
  const todayStr = getThaiDateStr();
  
  const [dateRangeOption, setDateRangeOption] = useState('today');
  const [customStart, setCustomStart] = useState(todayStr);
  const [customEnd, setCustomEnd] = useState(todayStr);
  const [filterDiv, setFilterDiv] = useState('');
  const [filterSt, setFilterSt] = useState(''); 
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedRoads, setSelectedRoads] = useState([]);

  // Filter Date Logic
  const { filterStartDate, filterEndDate } = useMemo(() => {
    const today = new Date(); let start = new Date(today); let end = new Date(today);
    if (dateRangeOption === 'yesterday') { start.setDate(today.getDate() - 1); end.setDate(today.getDate() - 1); }
    else if (dateRangeOption === 'last7') { start.setDate(today.getDate() - 6); }
    else if (dateRangeOption === 'all') { return { filterStartDate: null, filterEndDate: null }; }
    else if (dateRangeOption === 'custom') { return { filterStartDate: customStart, filterEndDate: customEnd }; }
    return { filterStartDate: getThaiDateStr(start), filterEndDate: getThaiDateStr(end) };
  }, [dateRangeOption, customStart, customEnd]);

  // Data Fetching
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(false);
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
      } catch (err) { 
          console.error("Critical Error Fetching Data:", err); 
          setError(true);
      } finally { 
          setTimeout(() => setLoading(false), 1200); 
      }
    };
    fetchData();
  }, []);

  // Compute Unique Roads
  const uniqueRoads = useMemo(() => {
    const roads = new Set(rawData.map(d => d.road).filter(r => r && r !== '-' && r.length < 10));
    return Array.from(roads).sort();
  }, [rawData]);

  // Filter Logic
  const logTableData = useMemo(() => {
    return rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      const passCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);
      const passRoad = selectedRoads.length === 0 || selectedRoads.includes(item.road);
      return passDate && passCategory && passRoad && (!filterDiv || item.div === filterDiv) && (!filterSt || item.st === filterSt);
    }).sort((a,b) => b.timestamp - a.timestamp);
  }, [rawData, filterStartDate, filterEndDate, filterDiv, filterSt, selectedCategories, selectedRoads]);

  // Visualization Logic
  const activeVisualData = useMemo(() => {
    const sortedLog = [...rawData].sort((a, b) => a.timestamp - b.timestamp);
    const activeStates = new Map(); 
    const otherEvents = []; 
    sortedLog.forEach(row => {
        const passCategory = selectedCategories.length === 0 || selectedCategories.includes(row.category);
        const passRoad = selectedRoads.length === 0 || selectedRoads.includes(row.road);
        const passDiv = !filterDiv || row.div === filterDiv;
        const passSt = !filterSt || row.st === filterSt;
        if (!passCategory || !passRoad || !passDiv || !passSt) return;

        const locKey = `${row.div}-${row.st}-${row.road}-${row.dir}`;
        if (row.category === 'จราจรติดขัด') { activeStates.set(locKey, row); } 
        else if (row.category === 'จราจรปกติ') { activeStates.delete(locKey); } 
        else if (row.category === 'ช่องทางพิเศษ') { activeStates.set(`LANE-${locKey}`, row); } 
        else if (row.category === 'ปิดช่องทางพิเศษ') { activeStates.delete(`LANE-${locKey}`); } 
        else { 
            let passDate = true;
            if (filterStartDate && filterEndDate) passDate = row.date >= filterStartDate && row.date <= filterEndDate;
            if (passDate) otherEvents.push(row);
        }
    });
    return [...otherEvents, ...activeStates.values()];
  }, [rawData, filterStartDate, filterEndDate, filterDiv, filterSt, selectedCategories, selectedRoads]);

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

  // --------------------------------------------------------------------------
  // Conditional Renders
  // --------------------------------------------------------------------------
  if (loading) return <SystemLoader />;
  
  if (error) return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-6">
          <AlertOctagon size={48} className="text-red-500 mb-4 animate-bounce" />
          <h1 className="text-2xl font-bold text-white mb-2">การเชื่อมต่อล้มเหลว</h1>
          <p className="text-slate-400 mb-6 max-w-md">ไม่สามารถเชื่อมต่อกับฐานข้อมูล Google Sheets ได้ กรุณาตรวจสอบสิทธิ์การเข้าถึง หรือสถานะเครือข่ายของท่าน</p>
          <button onClick={() => window.location.reload()} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg border border-slate-600 flex items-center gap-2 transition-all">
              <RotateCcw size={16}/> เริ่มระบบใหม่
          </button>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 p-4 font-sans text-slate-200">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 border-b border-slate-800 pb-2 gap-2">
        <div><h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2"><div className="bg-yellow-400 p-1 rounded text-slate-900"><Monitor size={20} /></div><span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">ศูนย์ปฏิบัติการจราจร บก.ทล.</span></h1></div>
        <div className="flex items-center gap-3"><span className="text-[10px] text-green-500 font-mono flex items-center gap-1"><Activity size={10} className="animate-pulse"/> ข้อมูลสด (Live)</span><button onClick={() => window.location.reload()} className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded border border-slate-600 hover:text-yellow-400 flex gap-2 text-xs transition-colors"><RotateCcw size={14} /> รีเฟรช</button></div>
      </div>

      {/* Control Panel */}
      <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 mb-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end shadow-md">
          <div className="col-span-2 md:col-span-1 lg:col-span-1">
             <label className="text-[10px] text-yellow-400 font-bold mb-1 block uppercase tracking-wider"><Calendar size={10} className="inline mr-1"/> ช่วงเวลา</label>
             <select className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded mb-1 focus:ring-1 focus:ring-yellow-500 outline-none" value={dateRangeOption} onChange={e => setDateRangeOption(e.target.value)}>
               <option value="today">วันนี้</option><option value="yesterday">เมื่อวาน</option><option value="last7">7 วันย้อนหลัง</option><option value="all">ทั้งหมด</option><option value="custom">กำหนดเอง</option>
             </select>
             {dateRangeOption === 'custom' && (<div className="flex gap-1 animate-in fade-in zoom-in duration-200"><input type="date" className="w-1/2 bg-slate-900 border border-slate-600 text-white text-[10px] p-1 rounded" value={customStart} onChange={e => setCustomStart(e.target.value)} /><input type="date" className="w-1/2 bg-slate-900 border border-slate-600 text-white text-[10px] p-1 rounded" value={customEnd} onChange={e => setCustomEnd(e.target.value)} /></div>)}
          </div>
          <div className="col-span-1"><label className="text-[10px] text-slate-400 font-bold mb-1 block">กองกำกับการ (กก.)</label><select className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded" value={filterDiv} onChange={e => { setFilterDiv(e.target.value); setFilterSt(''); }}><option value="">ทุกกองกำกับการ</option>{Object.keys(ORG_STRUCTURE).map(k => <option key={k} value={k}>กก.{k}</option>)}</select></div>
          <div className="col-span-1"><label className="text-[10px] text-slate-400 font-bold mb-1 block">สถานี (ส.ทล.)</label><select className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded" value={filterSt} onChange={e => setFilterSt(e.target.value)} disabled={!filterDiv}><option value="">ทุกสถานี</option>{stations.map(s => <option key={s} value={s}>ส.ทล.{s}</option>)}</select></div>
          <div className="col-span-2 md:col-span-1 lg:col-span-1.5 relative"><MultiSelectDropdown label="ประเภทเหตุการณ์" options={EVENT_CATEGORIES} selected={selectedCategories} onChange={setSelectedCategories} /></div>
          <div className="col-span-2 md:col-span-1 lg:col-span-1.5 relative"><MultiSelectDropdown label="เส้นทาง (ทล.)" options={uniqueRoads} selected={selectedRoads} onChange={setSelectedRoads} /></div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        <KPI_Card title="เหตุการณ์คงค้าง" value={activeVisualData.length} subtext="ยังไม่ยุติ" icon={ListChecks} accentColor="bg-slate-400" />
        <KPI_Card title="เปิดช่องทางพิเศษ" value={activeVisualData.filter(d => d.category === 'ช่องทางพิเศษ').length} subtext="กำลังเปิดใช้งาน" icon={ArrowRightCircle} accentColor="bg-green-500" />
        <KPI_Card title="ปิดช่องทางพิเศษ" value={logTableData.filter(d => d.category === 'ปิดช่องทางพิเศษ').length} subtext="สะสมวันนี้" icon={StopCircle} accentColor="bg-slate-600" />
        <KPI_Card title="จราจรติดขัด" value={activeVisualData.filter(d => d.category === 'จราจรติดขัด').length} subtext="วิกฤต/หนาแน่น" icon={TrafficCone} accentColor="bg-yellow-500" />
        <KPI_Card title="อุบัติเหตุ" value={activeVisualData.filter(d => d.category.includes('อุบัติเหตุ')).length} subtext="ใหญ่+ทั่วไป" icon={CarFront} accentColor="bg-red-500" />
        <KPI_Card title="จับกุม" value={activeVisualData.filter(d => d.category === 'จับกุม').length} subtext="ผู้กระทำผิด" icon={ShieldAlert} accentColor="bg-purple-500" />
      </div>

      {/* Map & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 mb-4">
        <div className="lg:col-span-4 bg-slate-800 rounded-lg border border-slate-700 h-[350px] lg:h-[400px] relative overflow-hidden shadow-md">
          <div className="absolute top-2 left-2 z-[400] bg-slate-900/90 px-2 py-1 rounded border border-slate-600 text-[10px] text-green-400 font-mono flex items-center gap-2 shadow-sm"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> ระบบแผนที่ทำงานปกติ</div>
          <LeafletMapComponent data={activeVisualData} />
        </div>
        <div className="lg:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col h-[200px] md:h-full shadow-md">
             <h3 className="text-xs font-bold text-white mb-2 pb-1 border-b border-slate-600 flex justify-between"><span>สถิติถนนที่มีเหตุสูงสุด</span> <Route size={14}/></h3>
             <div className="flex-1 w-full h-full relative"><Bar data={roadChartConfig} options={{ indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#64748b', stepSize: 1 }, grid: { color: '#1e293b' } }, y: { ticks: { color: '#e2e8f0', font: { weight: 'bold', size: 10 } }, grid: { display: false } } } }} /></div>
           </div>
           <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col h-[200px] md:h-full shadow-md">
             <h3 className="text-xs font-bold text-white mb-2 pb-1 border-b border-slate-600 flex justify-between"><span>สัดส่วนประเภทเหตุการณ์</span> <ListChecks size={14}/></h3>
             <div className="flex-1 w-full h-full relative flex items-center justify-center"><Doughnut data={catChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94a3b8', boxWidth: 8, font: { size: 10 } } } } }} /></div>
           </div>
        </div>
      </div>

      {/* Data Logs */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden shadow-lg">
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-700 flex justify-between items-center"><h3 className="text-white text-xs font-bold flex items-center gap-2"><Siren size={14} className="text-yellow-500"/> บันทึกเหตุการณ์ทั้งหมด (System Logs)</h3></div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="uppercase bg-slate-900/80 text-slate-500 sticky top-0 z-10 backdrop-blur-sm"><tr><th className="px-4 py-2 w-[100px]">เวลา</th><th className="px-4 py-2 w-[110px]">หน่วยงาน</th><th className="px-4 py-2 w-[120px]">ประเภท</th><th className="px-4 py-2">รายละเอียด</th><th className="px-4 py-2">สถานที่</th></tr></thead>
            <tbody className="divide-y divide-slate-700">
              {logTableData.length > 0 ? logTableData.map((item, idx) => (
                <tr key={idx} className={`hover:bg-slate-700/50 transition-colors ${item.category.includes('ปกติ') || item.category.includes('ปิด') ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2 font-mono text-yellow-400 align-top">{item.time} น.<div className="text-[9px] text-slate-500">{item.date}</div></td>
                  <td className="px-4 py-2 align-top"><span className="bg-slate-900 border border-slate-600 px-1.5 py-0.5 rounded text-[10px]">ส.ทล.{item.st} กก.{item.div}</span></td>
                  <td className="px-4 py-2 align-top"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-sm ${item.colorClass}`}>{item.category === 'จราจรปกติ' ? <span className="flex items-center gap-1"><CheckCircle2 size={10}/> เข้าสู่ภาวะปกติ</span> : item.category}</span></td>
                  <td className="px-4 py-2 align-top">
                      {item.reportFormat === 'TRAFFIC' && <div className="text-slate-200 border-l-2 border-yellow-500 pl-2">{item.detail || '-'}</div>}
                      {item.reportFormat === 'ENFORCE' && <div className="text-purple-200 border-l-2 border-purple-500 pl-2">{item.detail || '-'}</div>}
                      {item.reportFormat === 'SAFETY' && <div className="text-red-200 border-l-2 border-red-500 pl-2">{item.detail || '-'}</div>}
                  </td>
                  <td className="px-4 py-2 align-top text-[10px] font-mono text-slate-400"><div>ทล.{item.road} กม.{item.km}</div><div>{item.dir}</div></td>
                </tr>
              )) : (
                 <tr><td colSpan="5" className="p-12 text-center text-slate-500 flex flex-col items-center gap-2"><AlertTriangle size={24}/><span>ไม่พบข้อมูลตามเงื่อนไข</span></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}