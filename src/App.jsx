import React, { useState, useEffect, useMemo } from 'react';
import { 
  Map as MapIcon, 
  RotateCcw, 
  FileText, 
  Clock, 
  ListChecks, 
  AlertTriangle, 
  TrafficCone, 
  Activity 
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

// Import GIS Map Libraries (ทำงานได้บน Vercel)
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Register ChartJS
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// --- ⚙️ CONFIGURATION ---
// ⚠️ ใส่ Link CSV จาก Google Sheet ของคุณที่นี่
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwdOo14pW38cMImXNdEHIH7OTshrYf_6dGpEENgnYTa1kInJgosqeFGcpMpiOrq4Jw0nTJUn-02ogh/pub?output=csv"; 

// --- Constants ---
const DIVISION_COLORS = {
  "1": "#EF4444", "2": "#3B82F6", "3": "#10B981", "4": "#F59E0B",
  "5": "#8B5CF6", "6": "#EC4899", "7": "#06B6D4", "8": "#6366F1"
};

const ORG_STRUCTURE = { "1": 6, "2": 6, "3": 5, "4": 5, "5": 6, "6": 6, "7": 5, "8": 4 };

// Mock Data (Backup กรณีไม่มี Link)
// const MOCK_DATA = [
  //{ id: 1, date: '2025-12-12', time: '08:30', div: '1', st: '1', type: 'อุบัติเหตุใหญ่', road: 'ทล.1', km: '55', dir: 'ขาออก', traffic: 'หยุดนิ่ง', tailback: '2 กม.', lat: 14.215, lng: 100.700 },
  //{ id: 2, date: '2025-12-12', time: '09:15', div: '8', st: '2', type: 'จราจรติดขัด', road: 'ทล.9', km: '12', dir: 'มุ่งหน้าบางปะอิน', traffic: 'หนาแน่น', tailback: '500 ม.', lat: 13.980, lng: 100.750 },
  //{ id: 3, date: '2025-12-12', time: '10:00', div: '6', st: '1', type: 'อุบัติเหตุใหญ่', road: 'ทล.2', km: '102', dir: 'ขาเข้า', traffic: 'ชะลอตัว', tailback: '-', lat: 14.850, lng: 101.500 },
//];

// --- Helper Functions ---
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

    let div = '1', st = '1';
    const unitRaw = row['หน่วยงาน'] || '';
    const divMatch = unitRaw.match(/กก\.?\s*(\d+)/) || unitRaw.match(/\/(\d+)/); 
    if (divMatch) div = divMatch[1];
    const stMatch = unitRaw.match(/ส\.ทล\.?\s*(\d+)/) || unitRaw.match(/^(\d+)\//);
    if (stMatch) st = stMatch[1];

    let lat = parseFloat(row['Latitude']);
    let lng = parseFloat(row['Longitude']);

    // Fallback coordinates
    if (isNaN(lat) || isNaN(lng)) {
      const road = row['ทล.'] || '';
      if (road.includes('1')) { lat = 14.5 + Math.random(); lng = 100.8 + Math.random()*0.2; }
      else if (road.includes('2')) { lat = 14.8 + Math.random(); lng = 101.5 + Math.random()*0.2; }
      else if (road.includes('4')) { lat = 13.0 - Math.random(); lng = 99.9 + Math.random()*0.2; }
      else if (road.includes('9')) { lat = 13.9 + Math.random()*0.2; lng = 100.7 + Math.random()*0.2; }
      else { lat = 13.75; lng = 100.50; }
    }

    return {
      id: index,
      date: dateStr || new Date().toISOString().split('T')[0],
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

const KPI_Card = ({ title, value, subtext, icon: Icon, colorClass, bgClass }) => (
  <div className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${colorClass} flex justify-between items-center transition hover:shadow-md`}>
    <div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${colorClass.replace('border-', 'text-')}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtext}</p>
    </div>
    <div className={`p-3 rounded-full ${bgClass}`}>
      <Icon size={24} className={colorClass.replace('border-', 'text-')} />
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

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]); 
  const [filterDiv, setFilterDiv] = useState('');
  const [filterSt, setFilterSt] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterRoad, setFilterRoad] = useState('');
  const [filterDir, setFilterDir] = useState('');
  const [filterTraffic, setFilterTraffic] = useState('');
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (!GOOGLE_SHEET_CSV_URL) {
        setRawData(MOCK_DATA); setFilterDate('2025-12-12'); setLoading(false);
        return;
      }
      try {
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        const text = await response.text();
        const mappedData = processSheetData(parseCSV(text)); 
        if (mappedData.length > 0) {
          setRawData(mappedData);
          const validDates = mappedData.map(d => d.date).filter(d => d && !isNaN(new Date(d).getTime()));
          if(validDates.length > 0) setFilterDate(validDates.sort((a,b) => new Date(b) - new Date(a))[0]);
        } else { setRawData(MOCK_DATA); }
      } catch (error) { console.error("Fetch error:", error); setRawData(MOCK_DATA); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    return rawData.filter(item => 
      (!filterDate || item.date === filterDate) &&
      (!filterDiv || item.div === filterDiv) &&
      (!filterSt || item.st === filterSt) &&
      (!filterType || item.type === filterType) &&
      (!filterRoad || item.road === filterRoad) &&
      (!filterDir || item.dir === filterDir) &&
      (!filterTraffic || item.traffic === filterTraffic)
    );
  }, [rawData, filterDate, filterDiv, filterSt, filterType, filterRoad, filterDir, filterTraffic]);

  const typeChartData = useMemo(() => {
    const counts = {}; filteredData.forEach(d => { counts[d.type] = (counts[d.type] || 0) + 1; });
    return {
      labels: Object.keys(counts),
      datasets: [{ data: Object.values(counts), backgroundColor: ['#EF4444', '#F59E0B', '#10B981', '#64748B'], borderWidth: 0 }]
    };
  }, [filteredData]);

  const roadChartData = useMemo(() => {
    const counts = {}; filteredData.forEach(d => { counts[d.road] = (counts[d.road] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    return {
      labels: sorted.map(i => i[0]),
      datasets: [{ label: 'จำนวนเหตุการณ์', data: sorted.map(i => i[1]), backgroundColor: '#3B82F6', borderRadius: 4 }]
    };
  }, [filteredData]);

  const stations = useMemo(() => (filterDiv && ORG_STRUCTURE[filterDiv]) ? Array.from({ length: ORG_STRUCTURE[filterDiv] }, (_, i) => i + 1) : [], [filterDiv]);
  const dirOptions = useMemo(() => Array.from(new Set(rawData.map(d => d.dir).filter(Boolean))).sort(), [rawData]);

  const handleReset = () => {
    setFilterDiv(''); setFilterSt(''); setFilterType(''); setFilterRoad(''); setFilterDir(''); setFilterTraffic('');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <img className="https://cib.go.th/backend/uploads/medium_logo_cib_4_2x_9f2da10e9f_a7828c9ca0.png" size={32} />
            ศูนย์ปฏิบัติการจราจร บก.ทล. (Reverse Dashboard)
          </h1>
          <p className="text-slate-500 mt-1 text-sm flex items-center gap-2">
            <Clock size={14} /> ข้อมูลล่าสุด: {loading ? 'กำลังโหลด...' : `${rawData.length} รายการ`}
            {!GOOGLE_SHEET_CSV_URL && <span className="text-orange-500 font-medium bg-orange-50 px-2 py-0.5 rounded-full text-xs">Mock Data Mode</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="bg-white text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-100 border border-slate-200 shadow-sm transition flex items-center gap-2 text-sm font-medium">
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><ListChecks size={16} /> ตัวกรองข้อมูล</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
          <div><label className="text-xs text-slate-500 block mb-1">วันที่</label><input type="date" className="w-full p-2 border rounded text-sm" value={filterDate} onChange={e => setFilterDate(e.target.value)} /></div>
          <div><label className="text-xs text-slate-500 block mb-1">กองกำกับการ</label><select className="w-full p-2 border rounded text-sm" value={filterDiv} onChange={e => { setFilterDiv(e.target.value); setFilterSt(''); }}><option value="">ทั้งหมด</option>{Object.keys(ORG_STRUCTURE).map(k => <option key={k} value={k}>กก.{k}</option>)}</select></div>
          <div><label className="text-xs text-slate-500 block mb-1">สถานี</label><select className="w-full p-2 border rounded text-sm" value={filterSt} onChange={e => setFilterSt(e.target.value)} disabled={!filterDiv}><option value="">ทั้งหมด</option>{stations.map(s => <option key={s} value={s}>ส.ทล.{s}</option>)}</select></div>
          <div><label className="text-xs text-slate-500 block mb-1">ประเภทเหตุ</label><select className="w-full p-2 border rounded text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}><option value="">ทั้งหมด</option><option value="อุบัติเหตุใหญ่">อุบัติเหตุใหญ่</option><option value="จราจรติดขัด">จราจรติดขัด</option><option value="เปิดช่องทางพิเศษ">เปิดช่องทางพิเศษ</option></select></div>
          <div><label className="text-xs text-slate-500 block mb-1">ถนน</label><select className="w-full p-2 border rounded text-sm" value={filterRoad} onChange={e => setFilterRoad(e.target.value)}><option value="">ทั้งหมด</option><option value="ทล.1">ทล.1</option><option value="ทล.2">ทล.2</option><option value="ทล.4">ทล.4</option><option value="ทล.9">ทล.9</option><option value="ทล.32">ทล.32</option><option value="ทล.35">ทล.35</option></select></div>
          <div><label className="text-xs text-slate-500 block mb-1">ทิศทาง</label><select className="w-full p-2 border rounded text-sm" value={filterDir} onChange={e => setFilterDir(e.target.value)}><option value="">ทั้งหมด</option><option value="ขาเข้า">ขาเข้า</option><option value="ขาออก">ขาออก</option>{dirOptions.filter(d=>d!=='ขาเข้า'&&d!=='ขาออก').map(d=><option key={d} value={d}>{d}</option>)}</select></div>
          <div><label className="text-xs text-slate-500 block mb-1">สภาพจราจร</label><select className="w-full p-2 border rounded text-sm" value={filterTraffic} onChange={e => setFilterTraffic(e.target.value)}><option value="">ทั้งหมด</option><option value="คล่องตัว">คล่องตัว</option><option value="ชะลอตัว">ชะลอตัว</option><option value="หนาแน่น">หนาแน่น</option><option value="หยุดนิ่ง">หยุดนิ่ง</option></select></div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <KPI_Card title="เหตุการณ์ทั้งหมด" value={filteredData.length} subtext="รายการ" icon={ListChecks} colorClass="border-blue-500" bgClass="bg-blue-50" />
        <KPI_Card title="อุบัติเหตุใหญ่" value={filteredData.filter(d => d.type === 'อุบัติเหตุใหญ่').length} subtext="จุดที่ต้องเฝ้าระวัง" icon={AlertTriangle} colorClass="border-red-500" bgClass="bg-red-50" />
        <KPI_Card title="จราจรวิกฤต/หยุดนิ่ง" value={filteredData.filter(d => d.traffic === 'หยุดนิ่ง' || d.traffic === 'หนาแน่น').length} subtext="จุดวิกฤต" icon={TrafficCone} colorClass="border-orange-500" bgClass="bg-orange-50" />
        <KPI_Card title="เปิดช่องทางพิเศษ" value={filteredData.filter(d => d.type === 'เปิดช่องทางพิเศษ').length} subtext="จุดปฏิบัติงาน" icon={Activity} colorClass="border-green-500" bgClass="bg-green-50" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Map Section - Real Leaflet Map */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[450px] relative z-0">
          <MapContainer center={[13.75, 100.5]} zoom={6} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
            {filteredData.map(item => (
              <CircleMarker key={item.id} center={[item.lat, item.lng]} radius={8} pathOptions={{ color: 'white', fillColor: DIVISION_COLORS[item.div] || '#9CA3AF', fillOpacity: 0.8, weight: 2 }}>
                <Popup>
                  <div className="font-sans text-sm min-w-[150px]">
                    <strong className="block mb-1 text-base border-b pb-1" style={{ color: DIVISION_COLORS[item.div] }}>กก.{item.div} ส.ทล.{item.st}</strong>
                    <div className="grid grid-cols-[60px_1fr] gap-y-1 mt-2 text-slate-700">
                      <span className="text-slate-500">เหตุ:</span><span className="font-medium">{item.type}</span>
                      <span className="text-slate-500">จุด:</span><span className="font-medium">{item.road} กม.{item.km}</span>
                      <span className="text-slate-500">ทิศทาง:</span><span>{item.dir}</span>
                      <span className="text-slate-500">เวลา:</span><span>{item.time} น.</span>
                      <span className="text-slate-500">จราจร:</span><span className={item.traffic === 'หยุดนิ่ง' ? 'text-red-600 font-bold' : ''}>{item.traffic}</span>
                      {item.tailback && item.tailback !== '-' && <><span className="text-slate-500">ท้ายแถว:</span><span className="text-red-600 font-bold">{item.tailback}</span></>}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
            <MapAutoFit markers={filteredData} />
          </MapContainer>
        </div>

        {/* Charts Section */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-4 text-sm">สัดส่วนประเภทเหตุการณ์</h3>
            <div className="flex-1 relative min-h-[160px]"><Doughnut data={typeChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8 } } } }} /></div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
             <h3 className="font-bold text-slate-700 mb-4 text-sm">เส้นทางที่เกิดเหตุสูงสุด 5 อันดับ</h3>
             <div className="flex-1 relative min-h-[160px]"><Bar data={roadChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } } } }} /></div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm md:text-base">รายการข้อมูลอุบัติเหตุและจราจร (Data List)</h3>
          <span className="text-xs text-slate-400">แสดงผล: {filteredData.length} รายการ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr><th className="px-6 py-3 font-semibold">เวลา</th><th className="px-6 py-3 font-semibold">หน่วยงาน</th><th className="px-6 py-3 font-semibold">เหตุการณ์</th><th className="px-6 py-3 font-semibold">สถานที่ / กม.</th><th className="px-6 py-3 font-semibold">สภาพจราจร/ท้ายแถว</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.time} น.</td>
                  <td className="px-6 py-4"><span className="inline-flex items-center bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded border border-slate-200">ส.ทล.{item.st} กก.{item.div}</span></td>
                  <td className="px-6 py-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${item.type === 'อุบัติเหตุใหญ่' ? 'bg-red-50 text-red-700 border border-red-100' : item.type === 'เปิดช่องทางพิเศษ' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>{item.type}</span></td>
                  <td className="px-6 py-4 text-slate-600"><div className="font-medium">{item.road} กม.{item.km}</div><div className="text-xs text-slate-400 mt-0.5">{item.dir}</div></td>
                  <td className="px-6 py-4"><div className={`font-medium ${item.traffic === 'หยุดนิ่ง' ? 'text-red-600' : 'text-slate-600'}`}>{item.traffic}</div>{item.tailback && item.tailback !== '-' && (<div className="text-xs text-red-500 mt-0.5 font-medium">ท้ายแถว: {item.tailback}</div>)}</td>
                </tr>
              )) : (<tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400"><div className="flex flex-col items-center justify-center"><FileText size={48} className="mb-2 opacity-20" /><p>ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p></div></td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
