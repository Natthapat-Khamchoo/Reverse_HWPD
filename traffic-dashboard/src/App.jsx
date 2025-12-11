import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCcw, 
  ListChecks, 
  AlertTriangle, 
  TrafficCone, 
  Activity,
  Monitor,
  Calendar
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// --- ตั้งค่า ChartJS (Dark Theme) ---
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);
ChartJS.defaults.color = '#cbd5e1'; 
ChartJS.defaults.borderColor = '#334155'; 

// --- Configuration ---
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwdOo14pW38cMImXNdEHIH7OTshrYf_6dGpEENgnYTa1kInJgosqeFGcpMpiOrq4Jw0nTJUn-02ogh/pub?output=csv"; 

const DIVISION_COLORS = {
  "1": "#EF4444", "2": "#3B82F6", "3": "#10B981", "4": "#FBBF24",
  "5": "#A78BFA", "6": "#EC4899", "7": "#22D3EE", "8": "#6366F1"
};
const ORG_STRUCTURE = { "1": 6, "2": 6, "3": 5, "4": 5, "5": 6, "6": 6, "7": 5, "8": 4 };

// --- Helper Functions ---
// ฟังก์ชันช่วยดึงวันที่ปัจจุบันแบบโซนเวลาไทย (ป้องกันบั๊ก UTC)
const getThaiDateStr = (date = new Date()) => {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // return YYYY-MM-DD
};

const parseCSV = (text) => {
  const lines = text.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^['"]+|['"]+$/g, ''));
  return lines.slice(1).map(line => {
    const values = [];
    let match;
    const regex = /(?:^|,)(?:"([^"]*)"|([^",]*))/g;
    while ((match = regex.exec(line)) !== null) {
        if (match.index === regex.lastIndex) regex.lastIndex++; 
        if (match[0] === '' && values.length >= headers.length) break;
        let val = match[1] !== undefined ? match[1] : match[2];
        values.push(val ? val.trim() : '');
    }
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index] || '';
      return obj;
    }, {});
  });
};

const processSheetData = (rawData) => {
  return rawData.map((row, index) => {
    let dateStr = '', timeStr = '';
    const dateTimeRaw = row['วันที่ เวลา'] || row['Timestamp'] || '';
    
    // พยายามแปลงวันที่ให้ถูกต้องที่สุด
    if (dateTimeRaw) {
      const parts = dateTimeRaw.split(' ');
      if (parts.length >= 2) {
        let dPart = parts[0];
        if (dPart.includes('/')) {
           const [d, m, y] = dPart.split('/');
           // แปลงปี พ.ศ. (ถ้ามากกว่า 2400) เป็น ค.ศ.
           const year = parseInt(y) > 2400 ? parseInt(y) - 543 : y;
           dateStr = `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
        } else { dateStr = dPart; }
        timeStr = parts[1].substring(0, 5);
      } else { 
        // กรณีมาแค่วันที่ หรือรูปแบบอื่น
        dateStr = dateTimeRaw; timeStr = '00:00'; 
      }
    }

    let div = '1', st = '1';
    const unitRaw = row['หน่วยงาน'] || '';
    const divMatch = unitRaw.match(/กก\.?\s*(\d+)/) || unitRaw.match(/\/(\d+)/); 
    if (divMatch) div = divMatch[1];
    const stMatch = unitRaw.match(/ส\.ทล\.?\s*(\d+)/) || unitRaw.match(/^(\d+)\//);
    if (stMatch) st = stMatch[1];

    let lat = parseFloat(row['Latitude']);
    let lng = parseFloat(row['Longitude']);

    // ถ้าไม่มีพิกัด ให้สุ่มจุดในไทยเพื่อไม่ให้ Map Error (แต่ยังเป็นข้อมูลจริงส่วนอื่นๆ)
    if (isNaN(lat) || isNaN(lng)) {
       lat = 13.75 + (Math.random() - 0.5) * 0.1;
       lng = 100.50 + (Math.random() - 0.5) * 0.1;
    }

    return {
      id: index,
      date: dateStr, // YYYY-MM-DD
      time: timeStr || '00:00',
      div: div, st: st,
      type: row['เหตุการณ์'] || 'ทั่วไป',
      road: row['ทล.'] || '-',
      km: row['กม.'] || '-',
      dir: row['ทิศทาง'] || '-',
      traffic: row['สภาพการจราจร'] || '-',
      tailback: row['ท้ายแถวสะสม'] || '-',
      lat: lat, lng: lng
    };
  });
};

const KPI_Card = ({ title, value, subtext, icon: Icon, accentColor }) => (
  <div className={`bg-slate-800 rounded-lg p-5 border border-slate-700 shadow-lg relative overflow-hidden group hover:border-slate-600 transition-all`}>
    <div className={`absolute top-0 left-0 w-1 h-full ${accentColor}`}></div>
    <div className="flex justify-between items-start z-10 relative">
      <div>
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold mt-2 text-white font-mono">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{subtext}</p>
      </div>
      <div className={`p-2 rounded bg-slate-700/50 text-slate-300 group-hover:text-white transition-colors`}>
        <Icon size={24} />
      </div>
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
  return (
    <MapContainer center={[13.75, 100.5]} zoom={6} style={{ height: '100%', width: '100%', background: '#0f172a' }}>
      <TileLayer 
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
        attribution='&copy; CARTO'
      />
      {data.map(item => (
        <CircleMarker key={item.id} center={[item.lat, item.lng]} radius={6} pathOptions={{ color: '#fff', fillColor: DIVISION_COLORS[item.div] || '#9CA3AF', fillOpacity: 1, weight: 1 }}>
          <Popup className="digital-popup">
            <div className="font-sans text-sm min-w-[150px] text-slate-800">
              <strong className="block mb-1 text-base border-b border-slate-200 pb-1" style={{ color: DIVISION_COLORS[item.div] }}>กก.{item.div} ส.ทล.{item.st}</strong>
              <div className="grid grid-cols-[60px_1fr] gap-y-1 mt-2 text-slate-600">
                <span className="text-slate-400">เหตุ:</span><span className="font-bold">{item.type}</span>
                <span className="text-slate-400">จุด:</span><span>{item.road} กม.{item.km}</span>
                <span className="text-slate-400">เวลา:</span><span className="font-mono">{item.time} น.</span>
                <span className="text-slate-400">วันที่:</span><span className="font-mono">{item.date}</span>
                <span className="text-slate-400">จราจร:</span><span className={item.traffic === 'หยุดนิ่ง' ? 'text-red-600 font-bold' : ''}>{item.traffic}</span>
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
// Main Component
// -----------------------------------------------------------------------------
export default function App() {
  const [rawData, setRawData] = useState([]); // เริ่มต้นด้วย Array ว่าง (ไม่ใช้ Mock)
  const [loading, setLoading] = useState(true);
  
  // Date State
  const todayStr = getThaiDateStr();
  const [dateRangeOption, setDateRangeOption] = useState('today'); // Default: วันนี้
  const [customStart, setCustomStart] = useState(todayStr);
  const [customEnd, setCustomEnd] = useState(todayStr);

  // Other Filters
  const [filterDiv, setFilterDiv] = useState('');
  const [filterSt, setFilterSt] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterRoad, setFilterRoad] = useState('');
  const [filterDir, setFilterDir] = useState('');
  const [filterTraffic, setFilterTraffic] = useState('');

  // คำนวณช่วงวัน Start/End
  const { filterStartDate, filterEndDate } = useMemo(() => {
    const today = new Date(); // เวลาปัจจุบัน
    let start = new Date(today);
    let end = new Date(today);

    if (dateRangeOption === 'today') {
      // วันนี้ (ตัดรอบ 00.00 น.) -> ใช้วันที่ปัจจุบันเป็นทั้ง start และ end
      // logic จะไปกรอง string date ที่ตรงกัน
    } else if (dateRangeOption === 'yesterday') {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else if (dateRangeOption === 'last7') {
      start.setDate(today.getDate() - 6);
    } else if (dateRangeOption === 'last30') {
      start.setDate(today.getDate() - 29);
    } else if (dateRangeOption === 'thisMonth') {
      start.setDate(1); 
    } else if (dateRangeOption === 'all') {
      return { filterStartDate: null, filterEndDate: null };
    } else if (dateRangeOption === 'custom') {
      return { filterStartDate: customStart, filterEndDate: customEnd };
    }

    return { 
      filterStartDate: getThaiDateStr(start), 
      filterEndDate: getThaiDateStr(end) 
    };
  }, [dateRangeOption, customStart, customEnd]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        const text = await response.text();
        const mappedData = processSheetData(parseCSV(text)); 
        console.log("Fetched Data Count:", mappedData.length); // เช็คใน Console ได้เลย
        setRawData(mappedData);
      } catch (error) { 
        console.error("Fetch error:", error); 
        setRawData([]); // ถ้า Error ให้เป็นว่างเปล่า ห้ามใช้ Mock
      } finally { 
        setLoading(false); 
      }
    };
    fetchData();
  }, []);

  // Filter Logic
  const tableData = useMemo(() => {
    return rawData.filter(item => {
      // 1. Date Filter
      let passDate = true;
      if (filterStartDate && filterEndDate) {
        passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      }
      
      // 2. Other Filters
      return passDate &&
        (!filterDiv || item.div === filterDiv) &&
        (!filterSt || item.st === filterSt) &&
        (!filterType || item.type === filterType) &&
        (!filterRoad || item.road === filterRoad) &&
        (!filterDir || item.dir === filterDir) &&
        (!filterTraffic || item.traffic === filterTraffic);
    });
  }, [rawData, filterStartDate, filterEndDate, filterDiv, filterSt, filterType, filterRoad, filterDir, filterTraffic]);

  const visualData = useMemo(() => {
    return tableData.filter(item => 
      !item.type.includes('ปกติ') && 
      item.type !== 'เหตุการณ์ปกติ'
    );
  }, [tableData]);

  // Chart Data
  const typeChartData = useMemo(() => {
    const counts = {}; visualData.forEach(d => { counts[d.type] = (counts[d.type] || 0) + 1; });
    return {
      labels: Object.keys(counts),
      datasets: [{ 
        data: Object.values(counts), 
        backgroundColor: ['#FACC15', '#3B82F6', '#94A3B8', '#475569'], 
        borderColor: '#1e293b',
        borderWidth: 2 
      }]
    };
  }, [visualData]);

  const roadChartData = useMemo(() => {
    const counts = {}; visualData.forEach(d => { counts[d.road] = (counts[d.road] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    return {
      labels: sorted.map(i => i[0]),
      datasets: [{ 
        label: 'จำนวนเหตุการณ์', 
        data: sorted.map(i => i[1]), 
        backgroundColor: '#3B82F6', 
        borderRadius: 2 
      }]
    };
  }, [visualData]);

  const stations = useMemo(() => (filterDiv && ORG_STRUCTURE[filterDiv]) ? Array.from({ length: ORG_STRUCTURE[filterDiv] }, (_, i) => i + 1) : [], [filterDiv]);
  const dirOptions = useMemo(() => Array.from(new Set(rawData.map(d => d.dir).filter(Boolean))).sort(), [rawData]);

  const handleReset = () => {
    setDateRangeOption('today'); 
    setFilterDiv(''); setFilterSt(''); setFilterType(''); setFilterRoad(''); setFilterDir(''); setFilterTraffic('');
  };

  const inputStyle = "w-full p-2 text-sm rounded bg-slate-900 border border-slate-700 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all";
  const labelStyle = "text-xs text-slate-400 block mb-1 font-mono tracking-tight";

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6 font-sans text-slate-200">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
             <div className="bg-yellow-400 p-1 rounded text-slate-900"><Monitor size={24} /></div>
             <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
               ศูนย์ปฏิบัติการจราจร บก.ทล.
             </span>
          </h1>
          <p className="text-slate-500 text-xs mt-1 ml-11">CIB HIGHWAY POLICE • DATA INTELLIGENCE</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="bg-slate-800 text-slate-300 px-4 py-2 rounded hover:bg-slate-700 border border-slate-600 shadow-sm transition flex items-center gap-2 text-sm font-medium hover:text-yellow-400">
            <RotateCcw size={16} /> รีเซ็ตค่า (Reset)
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-800 p-5 rounded-lg shadow-lg border border-slate-700 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-slate-700/20 to-transparent pointer-events-none"></div>
        
        <h3 className="text-sm font-bold text-yellow-400 mb-4 flex items-center gap-2">
          <ListChecks size={16} /> ตัวกรองข้อมูล (FILTERS)
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
          
          {/* ✅ ส่วนเลือกช่วงเวลา (Date Range Picker) */}
          <div className="col-span-2 md:col-span-1 xl:col-span-2 bg-slate-700/30 p-2 rounded border border-slate-600/50">
             <label className="text-xs text-yellow-400 block mb-1 font-bold flex items-center gap-1">
               <Calendar size={12}/> ช่วงเวลา (Period)
             </label>
             <select 
               className={`${inputStyle} font-bold text-yellow-400 bg-slate-800`} 
               value={dateRangeOption} 
               onChange={e => setDateRangeOption(e.target.value)}
             >
               <option value="today">วันนี้ (Today)</option>
               <option value="yesterday">เมื่อวาน (Yesterday)</option>
               <option value="last7">7 วันย้อนหลัง</option>
               <option value="last30">30 วันย้อนหลัง</option>
               <option value="thisMonth">เดือนนี้ (This Month)</option>
               <option value="all">ทั้งหมด (All Time)</option>
               <option value="custom">กำหนดเอง (Custom)</option>
             </select>

             {/* แสดงช่องเลือกวันที่เฉพาะเมื่อเลือก "กำหนดเอง" */}
             {dateRangeOption === 'custom' && (
               <div className="flex gap-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                 <div className="flex-1">
                   <label className="text-[10px] text-slate-400">เริ่ม</label>
                   <input type="date" className="w-full p-1 text-xs rounded bg-slate-900 border border-slate-600 text-white" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                 </div>
                 <div className="flex-1">
                   <label className="text-[10px] text-slate-400">สิ้นสุด</label>
                   <input type="date" className="w-full p-1 text-xs rounded bg-slate-900 border border-slate-600 text-white" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                 </div>
               </div>
             )}
          </div>

          <div><label className={labelStyle}>กองกำกับการ</label><select className={inputStyle} value={filterDiv} onChange={e => { setFilterDiv(e.target.value); setFilterSt(''); }}><option value="">ทั้งหมด</option>{Object.keys(ORG_STRUCTURE).map(k => <option key={k} value={k}>กก.{k}</option>)}</select></div>
          <div><label className={labelStyle}>สถานี</label><select className={inputStyle} value={filterSt} onChange={e => setFilterSt(e.target.value)} disabled={!filterDiv}><option value="">ทั้งหมด</option>{stations.map(s => <option key={s} value={s}>ส.ทล.{s}</option>)}</select></div>
          <div><label className={labelStyle}>ประเภทเหตุ</label><select className={inputStyle} value={filterType} onChange={e => setFilterType(e.target.value)}><option value="">ทั้งหมด</option><option value="อุบัติเหตุใหญ่">อุบัติเหตุใหญ่</option><option value="จราจรติดขัด">จราจรติดขัด</option><option value="เปิดช่องทางพิเศษ">เปิดช่องทางพิเศษ</option></select></div>
          <div><label className={labelStyle}>ถนน</label><select className={inputStyle} value={filterRoad} onChange={e => setFilterRoad(e.target.value)}><option value="">ทั้งหมด</option><option value="ทล.1">ทล.1</option><option value="ทล.2">ทล.2</option><option value="ทล.4">ทล.4</option><option value="ทล.9">ทล.9</option><option value="ทล.32">ทล.32</option><option value="ทล.35">ทล.35</option></select></div>
          <div><label className={labelStyle}>ทิศทาง</label><select className={inputStyle} value={filterDir} onChange={e => setFilterDir(e.target.value)}><option value="">ทั้งหมด</option><option value="ขาเข้า">ขาเข้า</option><option value="ขาออก">ขาออก</option>{dirOptions.filter(d=>d!=='ขาเข้า'&&d!=='ขาออก').map(d=><option key={d} value={d}>{d}</option>)}</select></div>
          <div><label className={labelStyle}>สภาพจราจร</label><select className={inputStyle} value={filterTraffic} onChange={e => setFilterTraffic(e.target.value)}><option value="">ทั้งหมด</option><option value="คล่องตัว">คล่องตัว</option><option value="ชะลอตัว">ชะลอตัว</option><option value="หนาแน่น">หนาแน่น</option><option value="หยุดนิ่ง">หยุดนิ่ง</option></select></div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <KPI_Card title="เหตุการณ์ทั้งหมด" value={visualData.length} subtext="รายการ (ตามช่วงเวลา)" icon={ListChecks} accentColor="bg-blue-500" />
        <KPI_Card title="อุบัติเหตุใหญ่" value={visualData.filter(d => d.type === 'อุบัติเหตุใหญ่').length} subtext="จุดที่ต้องเฝ้าระวัง" icon={AlertTriangle} accentColor="bg-red-500" />
        <KPI_Card title="จราจรวิกฤต/หยุดนิ่ง" value={visualData.filter(d => d.traffic === 'หยุดนิ่ง' || d.traffic === 'หนาแน่น').length} subtext="จุดวิกฤต" icon={TrafficCone} accentColor="bg-yellow-400" />
        <KPI_Card title="เปิดช่องทางพิเศษ" value={visualData.filter(d => d.type === 'เปิดช่องทางพิเศษ').length} subtext="จุดปฏิบัติงาน" icon={Activity} accentColor="bg-green-500" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Map Section */}
        <div className="lg:col-span-2 bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden h-[500px] relative z-0">
          <div className="absolute top-4 left-4 z-[400] bg-slate-900/90 px-3 py-1 rounded border border-slate-600 text-xs text-yellow-400 font-mono flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
            </span>
            MAP VIEW: {dateRangeOption === 'today' ? 'TODAY' : dateRangeOption.toUpperCase()}
          </div>
          <LeafletMapComponent data={visualData} />
        </div>

        {/* Charts Section */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-800 p-5 rounded-lg shadow-lg border border-slate-700 flex-1 flex flex-col">
            <h3 className="font-bold text-slate-200 mb-4 text-sm font-mono border-b border-slate-700 pb-2">สัดส่วนประเภทเหตุการณ์</h3>
            <div className="flex-1 relative min-h-[160px]"><Doughnut data={typeChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 6, color: '#cbd5e1' } } } }} /></div>
          </div>
          <div className="bg-slate-800 p-5 rounded-lg shadow-lg border border-slate-700 flex-1 flex flex-col">
             <h3 className="font-bold text-slate-200 mb-4 text-sm font-mono border-b border-slate-700 pb-2">เส้นทางที่เกิดเหตุสูงสุด 5 อันดับ</h3>
             <div className="flex-1 relative min-h-[160px]"><Bar data={roadChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: '#cbd5e1' } }, y: { grid: { color: '#334155' }, ticks: { color: '#cbd5e1' } } } }} /></div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
          <h3 className="font-bold text-white text-sm md:text-base flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
            รายการข้อมูล (Data List)
          </h3>
          <span className="text-xs text-slate-400 font-mono border border-slate-600 px-2 py-1 rounded">
             {filterStartDate || 'เริ่มต้น'} ถึง {filterEndDate || 'ปัจจุบัน'} | จำนวน: {tableData.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 font-mono">วัน/เวลา</th>
                <th className="px-6 py-3">หน่วยงาน</th>
                <th className="px-6 py-3">เหตุการณ์</th>
                <th className="px-6 py-3">สถานที่ / กม.</th>
                <th className="px-6 py-3">สภาพจราจร/ท้ายแถว</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {tableData.length > 0 ? tableData.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 font-mono">
                    <div className="text-yellow-400">{item.time} น.</div>
                    <div className="text-xs text-slate-500">{item.date}</div>
                  </td>
                  <td className="px-6 py-4"><span className="inline-flex items-center bg-slate-900 text-slate-300 text-xs font-medium px-2.5 py-1 rounded border border-slate-600">ส.ทล.{item.st} กก.{item.div}</span></td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded text-xs font-semibold 
                      ${item.type === 'อุบัติเหตุใหญ่' ? 'text-red-400 border border-red-900 bg-red-900/20' : 
                        item.type === 'เปิดช่องทางพิเศษ' ? 'text-green-400 border border-green-900 bg-green-900/20' : 
                        item.type.includes('ปกติ') ? 'text-slate-400 border border-slate-600' :
                        'text-yellow-400 border border-yellow-900 bg-yellow-900/20'}`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300"><div className="font-medium">{item.road} กม.{item.km}</div><div className="text-xs text-slate-500 mt-0.5">{item.dir}</div></td>
                  <td className="px-6 py-4"><div className={`font-medium ${item.traffic === 'หยุดนิ่ง' ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>{item.traffic}</div>{item.tailback && item.tailback !== '-' && (<div className="text-xs text-red-400 mt-0.5 font-mono">ท้ายแถว: {item.tailback}</div>)}</td>
                </tr>
              )) : (<tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500 font-mono">ไม่พบข้อมูล (NO DATA FOUND)</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}