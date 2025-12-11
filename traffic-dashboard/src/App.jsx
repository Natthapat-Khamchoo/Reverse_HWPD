import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCcw, 
  ListChecks, 
  AlertTriangle, 
  TrafficCone, 
  Activity,
  Monitor,
  Calendar,
  Siren,       // ไอคอนสำหรับจับกุม
  CarFront,    // ไอคอนสำหรับอุบัติเหตุ
  Route        // ไอคอนสำหรับช่องทางพิเศษ
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

// ⚠️ หัวใจสำคัญ: ฟังก์ชันแปลงข้อมูลรายงานรูปแบบใหม่
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

    // 4. Logic จำแนกประเภทเหตุการณ์ (Priority System)
    // CSV Columns ตามรายงานใหม่: 'สภาพจราจร', 'ท้ายแถว', 'ช่องทางพิเศษ', 'จับกุม/เมา', 'ว.43', 'เหตุทั่วไป', 'เหตุน่าสนใจ'
    
    let mainCategory = 'ทั่วไป';
    let detailText = '';
    let statusColor = 'bg-slate-500'; // Default Gray

    const majorAccident = row['เหตุน่าสนใจ (กก.1-7)/ภัยพิบัติ'] || row['เหตุน่าสนใจ'] || '';
    const arrest = row['จับกุม/เมา'] || '';
    const checkpoint = row['ว.43 (จุด/ผล)'] || row['ว.43'] || '';
    const generalAccident = row['เหตุทั่วไป (กก.8)'] || row['เหตุทั่วไป'] || '';
    const specialLane = row['ช่องทางพิเศษ'] || '';
    const traffic = row['สภาพจราจร'] || '';
    const tailback = row['ท้ายแถว'] || '';

    if (majorAccident && majorAccident !== '-') {
      mainCategory = 'อุบัติเหตุใหญ่/ภัยพิบัติ';
      detailText = majorAccident;
      statusColor = 'bg-red-600';
    } else if (arrest && arrest !== '-') {
      mainCategory = 'จับกุม/เมา';
      detailText = arrest;
      statusColor = 'bg-purple-600';
    } else if (checkpoint && checkpoint !== '-') {
      mainCategory = 'ว.43 (ตั้งด่าน)';
      detailText = checkpoint;
      statusColor = 'bg-indigo-500';
    } else if (generalAccident && generalAccident !== '-') {
      mainCategory = 'อุบัติเหตุทั่วไป';
      detailText = generalAccident;
      statusColor = 'bg-orange-500';
    } else if (specialLane && specialLane !== '-') {
      mainCategory = 'เปิดช่องทางพิเศษ';
      detailText = specialLane;
      statusColor = 'bg-green-500';
    } else if (traffic && (traffic.includes('ติดขัด') || traffic.includes('หนาแน่น') || traffic.includes('หยุดนิ่ง'))) {
      mainCategory = 'จราจรติดขัด';
      detailText = `ท้ายแถว: ${tailback}`;
      statusColor = 'bg-yellow-500';
    } else {
      mainCategory = 'สถานการณ์ปกติ';
      detailText = traffic;
      statusColor = 'bg-slate-500';
    }

    return {
      id: index,
      date: dateStr,
      time: timeStr,
      div: div, st: st,
      category: mainCategory, // หมวดหมู่หลักสำหรับกราฟ
      detail: detailText,     // รายละเอียดเจาะจง
      road: row['ทล.'] || '-',
      km: row['กม.'] || '-',
      dir: row['ขา'] || row['ทิศทาง'] || '-',
      traffic_status: traffic,
      tailback: tailback,
      special_lane: specialLane,
      arrest_info: arrest,
      accident_info: generalAccident || majorAccident,
      lat: lat, lng: lng,
      colorClass: statusColor
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
  // ฟังก์ชันเลือกสี Marker ตามประเภท
  const getMarkerColor = (category) => {
    if (category.includes('อุบัติเหตุใหญ่')) return '#EF4444'; // แดง
    if (category.includes('อุบัติเหตุทั่วไป')) return '#F97316'; // ส้ม
    if (category.includes('จับกุม') || category.includes('ว.43')) return '#A855F7'; // ม่วง
    if (category.includes('ช่องทางพิเศษ')) return '#22C55E'; // เขียว
    if (category.includes('จราจร')) return '#EAB308'; // เหลือง
    return '#94A3B8'; // เทา
  };

  return (
    <MapContainer center={[13.75, 100.5]} zoom={6} style={{ height: '100%', width: '100%', background: '#0f172a' }}>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
      {data.map(item => (
        <CircleMarker key={item.id} center={[item.lat, item.lng]} radius={7} pathOptions={{ color: '#fff', fillColor: getMarkerColor(item.category), fillOpacity: 0.9, weight: 1.5 }}>
          <Popup className="digital-popup">
            <div className="font-sans text-sm min-w-[180px] text-slate-800">
              <strong className="block mb-2 text-base border-b border-slate-200 pb-1 flex items-center justify-between" style={{ color: DIVISION_COLORS[item.div] }}>
                <span>กก.{item.div} ส.ทล.{item.st}</span>
                <span className={`text-[10px] text-white px-2 py-0.5 rounded ${item.colorClass}`}>{item.time}</span>
              </strong>
              
              <div className="space-y-2 mt-2">
                {/* Section: Type */}
                <div className="bg-slate-100 p-2 rounded border border-slate-200">
                   <div className="text-xs text-slate-500 font-bold mb-1">ประเภท: {item.category}</div>
                   <div className="text-sm font-medium text-slate-700">{item.detail || '-'}</div>
                </div>

                {/* Section: Location */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                   <div><span className="text-slate-400">ทล:</span> <span className="font-mono font-bold">{item.road}</span></div>
                   <div><span className="text-slate-400">กม:</span> <span className="font-mono font-bold">{item.km}</span></div>
                   <div className="col-span-2"><span className="text-slate-400">ขา:</span> {item.dir}</div>
                </div>

                {/* Section: Specifics */}
                {(item.tailback && item.tailback !== '-') && <div className="text-xs text-red-600 font-bold">ท้ายแถว: {item.tailback}</div>}
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
  const [filterCategory, setFilterCategory] = useState(''); // เปลี่ยนจาก Type เป็น Category รวม

  // คำนวณช่วงวัน
  const { filterStartDate, filterEndDate } = useMemo(() => {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);

    if (dateRangeOption === 'yesterday') { start.setDate(today.getDate() - 1); end.setDate(today.getDate() - 1); }
    else if (dateRangeOption === 'last7') { start.setDate(today.getDate() - 6); }
    else if (dateRangeOption === 'thisMonth') { start.setDate(1); }
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
      return passDate && (!filterDiv || item.div === filterDiv) && (!filterCategory || item.category === filterCategory);
    });
  }, [rawData, filterStartDate, filterEndDate, filterDiv, filterCategory]);

  // Chart Data
  const categoryChartData = useMemo(() => {
    const counts = {}; tableData.forEach(d => { counts[d.category] = (counts[d.category] || 0) + 1; });
    return {
      labels: Object.keys(counts),
      datasets: [{ 
        data: Object.values(counts), 
        backgroundColor: ['#EF4444', '#A855F7', '#F97316', '#22C55E', '#EAB308', '#64748B'], 
        borderColor: '#1e293b', borderWidth: 2 
      }]
    };
  }, [tableData]);

  const stations = useMemo(() => (filterDiv && ORG_STRUCTURE[filterDiv]) ? Array.from({ length: ORG_STRUCTURE[filterDiv] }, (_, i) => i + 1) : [], [filterDiv]);

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6 font-sans text-slate-200">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
             <div className="bg-yellow-400 p-1 rounded text-slate-900"><Monitor size={24} /></div>
             <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">ศูนย์ปฏิบัติการจราจร บก.ทล.</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1 ml-11">INTEGRATED COMMAND CENTER V3.0</p>
        </div>
        <button onClick={() => window.location.reload()} className="bg-slate-800 text-slate-300 px-3 py-2 rounded border border-slate-600 hover:text-yellow-400 flex gap-2 text-xs"><RotateCcw size={14} /> REFRESH</button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6 flex flex-wrap gap-4 items-end">
          <div className="min-w-[200px]">
             <label className="text-[10px] text-yellow-400 font-bold mb-1 block"><Calendar size={10} className="inline mr-1"/> ช่วงเวลา</label>
             <select className="w-full bg-slate-900 border border-slate-600 text-white text-sm p-2 rounded" value={dateRangeOption} onChange={e => setDateRangeOption(e.target.value)}>
               <option value="today">วันนี้ (Today)</option>
               <option value="yesterday">เมื่อวาน</option>
               <option value="last7">7 วันย้อนหลัง</option>
               <option value="all">ทั้งหมด</option>
             </select>
          </div>
          <div className="min-w-[150px]">
             <label className="text-[10px] text-slate-400 font-bold mb-1 block">กองกำกับการ</label>
             <select className="w-full bg-slate-900 border border-slate-600 text-white text-sm p-2 rounded" value={filterDiv} onChange={e => setFilterDiv(e.target.value)}>
               <option value="">ทุกกองกำกับการ</option>
               {Object.keys(ORG_STRUCTURE).map(k => <option key={k} value={k}>กก.{k}</option>)}
             </select>
          </div>
          <div className="min-w-[150px]">
             <label className="text-[10px] text-slate-400 font-bold mb-1 block">หมวดหมู่เหตุการณ์</label>
             <select className="w-full bg-slate-900 border border-slate-600 text-white text-sm p-2 rounded" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
               <option value="">ทั้งหมด</option>
               <option value="อุบัติเหตุใหญ่/ภัยพิบัติ">อุบัติเหตุใหญ่</option>
               <option value="จับกุม/เมา">จับกุม/เมา</option>
               <option value="ว.43 (ตั้งด่าน)">ว.43 (ตั้งด่าน)</option>
               <option value="เปิดช่องทางพิเศษ">เปิดช่องทางพิเศษ</option>
             </select>
          </div>
      </div>

      {/* KPI Cards (New Categories) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPI_Card title="เหตุการณ์ทั้งหมด" value={tableData.length} subtext="รวมทุกประเภท" icon={ListChecks} accentColor="bg-slate-400" />
        <KPI_Card title="อุบัติเหตุ (ทุกประเภท)" value={tableData.filter(d => d.category.includes('อุบัติเหตุ')).length} subtext="ใหญ่ + ทั่วไป" icon={CarFront} accentColor="bg-red-500" />
        <KPI_Card title="ผลจับกุม / ว.43" value={tableData.filter(d => d.category.includes('จับกุม') || d.category.includes('ว.43')).length} subtext="การบังคับใช้กฎหมาย" icon={Siren} accentColor="bg-purple-500" />
        <KPI_Card title="ช่องทางพิเศษ" value={tableData.filter(d => d.category.includes('ช่องทางพิเศษ')).length} subtext="อำนวยความสะดวก" icon={Route} accentColor="bg-green-500" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-slate-800 rounded-lg border border-slate-700 h-[500px] relative overflow-hidden">
          <LeafletMapComponent data={tableData} />
        </div>

        {/* Charts */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col">
          <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-700 pb-2">สัดส่วนตามหมวดหมู่</h3>
          <div className="flex-1 relative"><Doughnut data={categoryChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1', boxWidth: 10 } } } }} /></div>
        </div>
      </div>

      {/* Data Table (Report Format Style) */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-700 flex justify-between">
          <h3 className="text-white text-sm font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span> รายงานสด (Live Feed)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs uppercase bg-slate-900/50 text-slate-400">
              <tr>
                <th className="px-4 py-3 w-[100px]">เวลา</th>
                <th className="px-4 py-3 w-[120px]">หน่วยงาน</th>
                <th className="px-4 py-3 w-[150px]">หมวดหมู่</th>
                <th className="px-4 py-3">รายละเอียด (Detail)</th>
                <th className="px-4 py-3">พิกัด/สถานที่</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {tableData.length > 0 ? tableData.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-yellow-400 align-top">{item.time} น.<div className="text-[10px] text-slate-500">{item.date}</div></td>
                  <td className="px-4 py-3 align-top"><span className="bg-slate-900 border border-slate-600 px-2 py-1 rounded text-xs">ส.ทล.{item.st} กก.{item.div}</span></td>
                  <td className="px-4 py-3 align-top">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold text-white ${item.colorClass}`}>{item.category}</span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-white">{item.detail || '-'}</div>
                    {item.tailback && item.tailback !== '-' && <div className="text-xs text-yellow-500 mt-1">ท้ายแถว: {item.tailback}</div>}
                    {item.special_lane && item.special_lane !== '-' && <div className="text-xs text-green-400 mt-1">เปิดช่องทาง: {item.special_lane}</div>}
                  </td>
                  <td className="px-4 py-3 align-top text-xs font-mono text-slate-400">
                    <div>ทล.{item.road} กม.{item.km}</div>
                    <div>{item.dir}</div>
                  </td>
                </tr>
              )) : <tr><td colSpan="5" className="p-8 text-center text-slate-500">ไม่พบข้อมูลตามเงื่อนไข</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}