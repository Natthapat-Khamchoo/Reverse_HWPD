import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCcw, 
  ListChecks, 
  AlertTriangle, 
  TrafficCone, 
  Activity,
  Monitor,
  Calendar,
  Siren,       
  CarFront,    
  Route,
  ShieldAlert, // ไอคอนใหม่สำหรับจับกุม
  ShieldCheck  // ไอคอนใหม่สำหรับด่าน
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
const getThaiDateStr = (date = new Date()) => {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
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
    // 1. จัดการวันที่เวลา
    let dateStr = '', timeStr = '';
    const dateTimeRaw = row['วันที่ เวลา'] || row['Timestamp'] || '';
    if (dateTimeRaw) {
      const parts = dateTimeRaw.split(' ');
      if (parts.length >= 2) {
        let dPart = parts[0];
        if (dPart.includes('/')) {
           const [d, m, y] = dPart.split('/');
           const year = parseInt(y) > 2400 ? parseInt(y) - 543 : y;
           dateStr = `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
        } else { dateStr = dPart; }
        timeStr = parts[1].substring(0, 5);
      } else { dateStr = dateTimeRaw; timeStr = '00:00'; }
    }

    // 2. จัดการหน่วยงาน
    let div = '1', st = '1';
    const unitRaw = row['หน่วยงาน'] || '';
    const divMatch = unitRaw.match(/กก\.?\s*(\d+)/) || unitRaw.match(/\/(\d+)/); 
    if (divMatch) div = divMatch[1];
    const stMatch = unitRaw.match(/ส\.ทล\.?\s*(\d+)/) || unitRaw.match(/^(\d+)\//);
    if (stMatch) st = stMatch[1];

    // 3. จัดการพิกัด
    let lat = parseFloat(row['Latitude'] || row['พิกัด']?.split(',')[0]);
    let lng = parseFloat(row['Longitude'] || row['พิกัด']?.split(',')[1]);
    if (isNaN(lat) || isNaN(lng)) {
       lat = 13.75 + (Math.random() - 0.5) * 0.1;
       lng = 100.50 + (Math.random() - 0.5) * 0.1;
    }

    // 4. Logic จำแนกประเภท
    let mainCategory = 'ทั่วไป';
    let detailText = '';
    let statusColor = 'bg-slate-500';

    const majorAccident = row['เหตุน่าสนใจ (กก.1-7)/ภัยพิบัติ'] || row['เหตุน่าสนใจ'] || '';
    const arrest = row['จับกุม/เมา'] || '';
    const checkpoint = row['ว.43 (จุด/ผล)'] || row['ว.43'] || '';
    const generalAccident = row['เหตุทั่วไป (กก.8)'] || row['เหตุทั่วไป'] || '';
    const specialLane = row['ช่องทางพิเศษ'] || '';
    const traffic = row['สภาพจราจร'] || '';
    const tailback = row['ท้ายแถว'] || '';

    if (majorAccident && majorAccident !== '-') {
      mainCategory = 'อุบัติเหตุใหญ่';
      detailText = majorAccident;
      statusColor = 'bg-red-600';
    } else if (arrest && arrest !== '-') {
      mainCategory = 'จับกุม';
      detailText = arrest;
      statusColor = 'bg-purple-600';
    } else if (checkpoint && checkpoint !== '-') {
      mainCategory = 'ว.43';
      detailText = checkpoint;
      statusColor = 'bg-indigo-500';
    } else if (generalAccident && generalAccident !== '-') {
      mainCategory = 'อุบัติเหตุทั่วไป';
      detailText = generalAccident;
      statusColor = 'bg-orange-500';
    } else if (specialLane && specialLane !== '-') {
      mainCategory = 'ช่องทางพิเศษ';
      detailText = specialLane;
      statusColor = 'bg-green-500';
    } else if (traffic && (traffic.includes('ติดขัด') || traffic.includes('หนาแน่น') || traffic.includes('หยุดนิ่ง'))) {
      mainCategory = 'จราจรติดขัด';
      detailText = `ท้ายแถว: ${tailback}`;
      statusColor = 'bg-yellow-500';
    } else {
      mainCategory = 'ปกติ';
      detailText = traffic;
      statusColor = 'bg-slate-500';
    }

    return {
      id: index,
      date: dateStr,
      time: timeStr,
      div: div, st: st,
      category: mainCategory,
      detail: detailText,
      road: row['ทล.'] || '-',
      km: row['กม.'] || '-',
      dir: row['ขา'] || row['ทิศทาง'] || '-',
      traffic_status: traffic,
      tailback: tailback,
      special_lane: specialLane,
      arrest_info: arrest,
      accident_info: generalAccident || majorAccident,
      checkpoint_info: checkpoint,
      lat: lat, lng: lng,
      colorClass: statusColor
    };
  });
};

const KPI_Card = ({ title, value, subtext, icon: Icon, accentColor }) => (
  <div className={`bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-lg relative overflow-hidden group hover:border-slate-600 transition-all`}>
    <div className={`absolute top-0 left-0 w-1 h-full ${accentColor}`}></div>
    <div className="flex justify-between items-start z-10 relative">
      <div>
        <p className="text-slate-400 text-xs font-bold uppercase">{title}</p>
        <p className="text-2xl font-bold mt-1 text-white font-mono">{value}</p>
        <p className="text-[10px] text-slate-500 mt-1">{subtext}</p>
      </div>
      <div className={`p-2 rounded bg-slate-700/50 text-slate-300 group-hover:text-white transition-colors`}>
        <Icon size={20} />
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
  const getMarkerColor = (category) => {
    if (category.includes('อุบัติเหตุใหญ่')) return '#EF4444'; 
    if (category.includes('อุบัติเหตุทั่วไป')) return '#F97316'; 
    if (category.includes('จับกุม')) return '#A855F7';
    if (category.includes('ว.43')) return '#6366F1';
    if (category.includes('ช่องทางพิเศษ')) return '#22C55E'; 
    if (category.includes('จราจร')) return '#EAB308'; 
    return '#94A3B8'; 
  };

  return (
    <MapContainer center={[13.75, 100.5]} zoom={6} style={{ height: '100%', width: '100%', background: '#0f172a' }}>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
      {data.map(item => (
        <CircleMarker key={item.id} center={[item.lat, item.lng]} radius={6} pathOptions={{ color: '#fff', fillColor: getMarkerColor(item.category), fillOpacity: 0.9, weight: 1.5 }}>
          <Popup className="digital-popup">
            <div className="font-sans text-sm min-w-[180px] text-slate-800">
              <strong className="block mb-2 text-base border-b border-slate-200 pb-1 flex items-center justify-between" style={{ color: DIVISION_COLORS[item.div] }}>
                <span>กก.{item.div} ส.ทล.{item.st}</span>
                <span className={`text-[10px] text-white px-2 py-0.5 rounded ${item.colorClass}`}>{item.time}</span>
              </strong>
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-600">ประเภท: {item.category}</div>
                <div className="text-sm text-slate-800">{item.detail || '-'}</div>
                <div className="text-xs text-slate-500 pt-1 border-t border-slate-200 mt-1">
                  ทล.{item.road} กม.{item.km} ({item.dir})
                </div>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
      <MapAutoFit markers={data} />
    </MapContainer>
  );
};

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Date State
  const todayStr = getThaiDateStr();
  const [dateRangeOption, setDateRangeOption] = useState('today');
  const [customStart, setCustomStart] = useState(todayStr);
  const [customEnd, setCustomEnd] = useState(todayStr);

  // Filters
  const [filterDiv, setFilterDiv] = useState('');
  const [filterSt, setFilterSt] = useState(''); // เพิ่ม Filter ส.ทล.
  const [filterCategory, setFilterCategory] = useState('');

  // คำนวณช่วงวัน
  const { filterStartDate, filterEndDate } = useMemo(() => {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);

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
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        const text = await response.text();
        const mappedData = processSheetData(parseCSV(text)); 
        setRawData(mappedData);
      } catch (error) { console.error(error); setRawData([]); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  // Filter Logic
  const tableData = useMemo(() => {
    return rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      return passDate && 
        (!filterDiv || item.div === filterDiv) && 
        (!filterSt || item.st === filterSt) && // กรอง ส.ทล.
        (!filterCategory || item.category === filterCategory);
    });
  }, [rawData, filterStartDate, filterEndDate, filterDiv, filterSt, filterCategory]);

  // --- Statistics for Charts ---
  const divisionStats = useMemo(() => {
    const stats = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0 };
    tableData.forEach(d => { if (stats[d.div] !== undefined) stats[d.div]++; });
    return stats;
  }, [tableData]);

  const categoryStats = useMemo(() => {
    const counts = {}; 
    tableData.forEach(d => { 
      // จัดกลุ่มชื่อให้สั้นลงสำหรับกราฟ
      let key = d.category;
      counts[key] = (counts[key] || 0) + 1; 
    });
    return counts;
  }, [tableData]);

  // Chart Config
  const divChartData = {
    labels: Object.keys(divisionStats).map(k => `กก.${k}`),
    datasets: [{
      label: 'จำนวนเหตุ',
      data: Object.values(divisionStats),
      backgroundColor: '#3B82F6',
      borderRadius: 4,
      barThickness: 15
    }]
  };

  const catChartData = {
    labels: Object.keys(categoryStats),
    datasets: [{
      data: Object.values(categoryStats),
      backgroundColor: ['#EF4444', '#A855F7', '#6366F1', '#F97316', '#22C55E', '#EAB308', '#64748B'],
      borderWidth: 0
    }]
  };

  // Station Options (Updated dynamically)
  const stations = useMemo(() => (filterDiv && ORG_STRUCTURE[filterDiv]) ? Array.from({ length: ORG_STRUCTURE[filterDiv] }, (_, i) => i + 1) : [], [filterDiv]);

  return (
    <div className="min-h-screen bg-slate-900 p-4 font-sans text-slate-200">
      
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 border-b border-slate-800 pb-2 gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
             <div className="bg-yellow-400 p-1 rounded text-slate-900"><Monitor size={20} /></div>
             <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">ศูนย์ปฏิบัติการจราจร บก.ทล.</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
           <span className="text-[10px] text-slate-500 font-mono hidden md:inline">DATA FEED: LIVE</span>
           <button onClick={() => window.location.reload()} className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded border border-slate-600 hover:text-yellow-400 flex gap-2 text-xs"><RotateCcw size={14} /> REFRESH</button>
        </div>
      </div>

      {/* Filters (Compact Row) */}
      <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 mb-4 flex flex-wrap gap-3 items-end">
          <div className="w-full sm:w-auto min-w-[160px]">
             <label className="text-[10px] text-yellow-400 font-bold mb-1 block"><Calendar size={10} className="inline mr-1"/> ช่วงเวลา</label>
             <select className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded" value={dateRangeOption} onChange={e => setDateRangeOption(e.target.value)}>
               <option value="today">วันนี้ (Today)</option>
               <option value="yesterday">เมื่อวาน</option>
               <option value="last7">7 วันย้อนหลัง</option>
               <option value="all">ทั้งหมด</option>
             </select>
          </div>
          <div className="w-1/2 sm:w-auto min-w-[120px]">
             <label className="text-[10px] text-slate-400 font-bold mb-1 block">กองกำกับการ</label>
             <select className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded" value={filterDiv} onChange={e => { setFilterDiv(e.target.value); setFilterSt(''); }}>
               <option value="">ทุกกองฯ</option>
               {Object.keys(ORG_STRUCTURE).map(k => <option key={k} value={k}>กก.{k}</option>)}
             </select>
          </div>
          <div className="w-1/3 sm:w-auto min-w-[100px]">
             <label className="text-[10px] text-slate-400 font-bold mb-1 block">สถานี (ส.ทล.)</label>
             <select className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded" value={filterSt} onChange={e => setFilterSt(e.target.value)} disabled={!filterDiv}>
               <option value="">ทุกสถานี</option>
               {stations.map(s => <option key={s} value={s}>ส.ทล.{s}</option>)}
             </select>
          </div>
          <div className="w-full sm:w-auto min-w-[150px]">
             <label className="text-[10px] text-slate-400 font-bold mb-1 block">หมวดหมู่</label>
             <select className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
               <option value="">ทั้งหมด</option>
               <option value="อุบัติเหตุใหญ่">อุบัติเหตุใหญ่</option>
               <option value="จับกุม">จับกุม/เมา</option>
               <option value="ว.43">ว.43 (ตั้งด่าน)</option>
               <option value="ช่องทางพิเศษ">ช่องทางพิเศษ</option>
             </select>
          </div>
      </div>

      {/* KPI Cards (Split Arrest & Checkpoint) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <KPI_Card title="ทั้งหมด" value={tableData.length} subtext="รายการ" icon={ListChecks} accentColor="bg-slate-400" />
        <KPI_Card title="อุบัติเหตุ" value={tableData.filter(d => d.category.includes('อุบัติเหตุ')).length} subtext="ใหญ่+ทั่วไป" icon={CarFront} accentColor="bg-red-500" />
        <KPI_Card title="จับกุม" value={tableData.filter(d => d.category === 'จับกุม').length} subtext="ผู้กระทำผิด" icon={ShieldAlert} accentColor="bg-purple-500" />
        <KPI_Card title="จุดตรวจ ว.43" value={tableData.filter(d => d.category === 'ว.43').length} subtext="ปฏิบัติงาน" icon={ShieldCheck} accentColor="bg-indigo-500" />
        <KPI_Card title="ช่องทางพิเศษ" value={tableData.filter(d => d.category === 'ช่องทางพิเศษ').length} subtext="อำนวยจราจร" icon={Route} accentColor="bg-green-500" />
      </div>

      {/* Main Content Grid: Map & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 mb-4">
        
        {/* Map Section (Reduced Size: 40% width on large screens) */}
        <div className="lg:col-span-4 bg-slate-800 rounded-lg border border-slate-700 h-[350px] lg:h-[400px] relative overflow-hidden">
          <div className="absolute top-2 left-2 z-[400] bg-slate-900/80 px-2 py-0.5 rounded border border-slate-600 text-[10px] text-yellow-400 font-mono">MAP VIEW</div>
          <LeafletMapComponent data={tableData} />
        </div>

        {/* Charts Section (Expanded: 60% width) */}
        <div className="lg:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Graph 1: Events by Division */}
           <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col h-[200px] md:h-full">
             <h3 className="text-xs font-bold text-white mb-2 pb-1 border-b border-slate-600">สถิติรายกองกำกับการ</h3>
             <div className="flex-1 w-full h-full relative">
               <Bar 
                 data={divChartData} 
                 options={{ 
                   maintainAspectRatio: false, 
                   plugins: { legend: { display: false } }, 
                   scales: { 
                     x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
                     y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#334155' } } 
                   } 
                 }} 
               />
             </div>
           </div>

           {/* Graph 2: Category Breakdown */}
           <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col h-[200px] md:h-full">
             <h3 className="text-xs font-bold text-white mb-2 pb-1 border-b border-slate-600">สัดส่วนประเภทเหตุการณ์</h3>
             <div className="flex-1 w-full h-full relative flex items-center justify-center">
               <Doughnut 
                 data={catChartData} 
                 options={{ 
                   maintainAspectRatio: false, 
                   plugins: { 
                     legend: { position: 'right', labels: { color: '#cbd5e1', boxWidth: 8, font: { size: 10 } } } 
                   } 
                 }} 
               />
             </div>
           </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-white text-xs font-bold flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span> รายงานสด (Live Feed)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="uppercase bg-slate-900/50 text-slate-500">
              <tr>
                <th className="px-4 py-2 w-[100px]">เวลา</th>
                <th className="px-4 py-2 w-[110px]">หน่วยงาน</th>
                <th className="px-4 py-2 w-[120px]">หมวดหมู่</th>
                <th className="px-4 py-2">รายละเอียด</th>
                <th className="px-4 py-2">สถานที่</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {tableData.length > 0 ? tableData.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-2 font-mono text-yellow-400 align-top">{item.time} น.<div className="text-[9px] text-slate-500">{item.date}</div></td>
                  <td className="px-4 py-2 align-top"><span className="bg-slate-900 border border-slate-600 px-1.5 py-0.5 rounded text-[10px]">ส.ทล.{item.st} กก.{item.div}</span></td>
                  <td className="px-4 py-2 align-top">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${item.colorClass}`}>{item.category}</span>
                  </td>
                  <td className="px-4 py-2 align-top">
                    <div className="font-medium text-slate-200">{item.detail || '-'}</div>
                    {item.tailback && item.tailback !== '-' && <div className="text-[10px] text-yellow-500">ท้ายแถว: {item.tailback}</div>}
                  </td>
                  <td className="px-4 py-2 align-top text-[10px] font-mono text-slate-400">
                    <div>ทล.{item.road} กม.{item.km}</div>
                    <div>{item.dir}</div>
                  </td>
                </tr>
              )) : <tr><td colSpan="5" className="p-6 text-center text-slate-500">ไม่พบข้อมูล</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}