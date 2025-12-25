import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  RotateCcw, ListChecks, Monitor, Calendar, Siren, 
  CarFront, ShieldAlert, StopCircle, Activity, 
  ArrowRightCircle, Wine, Filter, ChevronUp, ChevronDown, Map as MapIcon,
  TrendingUp, MousePointerClick, ClipboardCopy, Loader2, X, Copy, CheckCircle
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Config & Utils
import { SHEET_TRAFFIC_URL, SHEET_ENFORCE_URL, SHEET_SAFETY_URL, ORG_STRUCTURE, CATEGORY_COLORS } from './constants/config';
import { TRAFFIC_DATA } from './constants/traffic_nodes'; 
import { getThaiDateStr, parseCSV } from './utils/helpers';
import { processSheetData } from './utils/dataProcessor';

// Components
import SystemLoader from './components/SystemLoader';
import MultiSelectDropdown from './components/MultiSelectDropdown';
import KPI_Card from './components/KPICard';
import LongdoMapViewer from './components/LongdoMapViewer';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
ChartJS.defaults.color = '#94a3b8'; 
ChartJS.defaults.borderColor = '#334155'; 
ChartJS.defaults.font.family = "'Sarabun', 'Prompt', sans-serif";

const LONGDO_API_KEY = "43c345d5dae4db42926bd41ae0b5b0fa"; 

// --- Traffic Logic ---
const getTrafficFromCoords = async (start, end) => {
  const [slat, slon] = start.split(',');
  const [elat, elon] = end.split(',');
  const url = `/api/traffic?slat=${slat}&slon=${slon}&elat=${elat}&elon=${elon}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const json = await res.json();
    
    if (json && json.data && json.data.length > 0) {
      const route = json.data[0];
      const distanceKm = route.distance / 1000;
      const timeHour = route.interval / 3600;
      
      if (timeHour <= 0) return { status: "ตรวจสอบไม่ได้", code: 0 };

      const speed = distanceKm / timeHour; 

      if (speed >= 40) return { status: "คล่องตัว", code: 1 };
      if (speed >= 20) return { status: "ชะลอตัว", code: 2 };
      return { status: "หนาแน่น/ติดขัด 🔴", code: 3 };
    }
  } catch (err) {
    console.warn("Traffic API Warning:", err.message);
  }
  return { status: "ตรวจสอบไม่ได้", code: 0 }; 
};

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  
  // State สำหรับ Report Modal
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatedReportText, setGeneratedReportText] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Controls
  const [dateRangeOption, setDateRangeOption] = useState('today');
  const [customStart, setCustomStart] = useState(getThaiDateStr());
  const [customEnd, setCustomEnd] = useState(getThaiDateStr());
  const [filterDiv, setFilterDiv] = useState('');
  const [filterSt, setFilterSt] = useState(''); 
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedRoads, setSelectedRoads] = useState([]);

  // Trend Chart Controls
  const defaultTrendStart = new Date(); defaultTrendStart.setDate(defaultTrendStart.getDate() - 6);
  const [trendStart, setTrendStart] = useState(getThaiDateStr(defaultTrendStart));
  const [trendEnd, setTrendEnd] = useState(getThaiDateStr());

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

  const logData = useMemo(() => {
    return rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      const passCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);
      const passRoad = selectedRoads.length === 0 || selectedRoads.includes(item.road);
      const passDiv = !filterDiv || item.div === filterDiv;
      const passSt = !filterSt || item.st === filterSt;
      return passDate && passCategory && passRoad && passDiv && passSt;
    }).sort((a,b) => b.timestamp - a.timestamp);
  }, [rawData, filterStartDate, filterEndDate, filterDiv, filterSt, selectedCategories, selectedRoads]);

  const visualData = useMemo(() => {
    return logData.filter(item => {
        if (item.category === 'อุบัติเหตุ') return item.div === '8'; 
        return true; 
    });
  }, [logData]);

  const mapData = useMemo(() => {
    const sortedLog = [...visualData].sort((a, b) => a.timestamp - b.timestamp);
    const activeStates = new Map(); 
    const otherEvents = []; 
    sortedLog.forEach(row => {
        if (row.lat === null || row.lng === null) return;
        const locKey = `${row.div}-${row.st}-${row.road}-${row.dir}`;
        if (row.category === 'จราจรติดขัด') { activeStates.set(locKey, row); } 
        else if (row.category === 'จราจรปกติ') { activeStates.delete(locKey); } 
        else if (row.category === 'ช่องทางพิเศษ') { activeStates.set(`LANE-${locKey}`, row); } 
        else if (row.category === 'ปิดช่องทางพิเศษ') { activeStates.delete(`LANE-${locKey}`); } 
        else { otherEvents.push(row); }
    });
    return [...otherEvents, ...activeStates.values()];
  }, [visualData]);

  const stats = useMemo(() => {
    const drunkCount = visualData.filter(d => d.category === 'จับกุม' && d.detail && d.detail.includes('เมา')).length;
    const divisions = ["1", "2", "3", "4", "5", "6", "7", "8"];
    const mainCats = ['อุบัติเหตุ', 'จับกุม', 'ช่องทางพิเศษ', 'จราจรติดขัด', 'ว.43'];
    const datasets = mainCats.map(cat => ({
        label: cat,
        data: divisions.map(div => visualData.filter(d => d.div === div && d.category === cat).length),
        backgroundColor: CATEGORY_COLORS[cat] || '#cbd5e1',
        stack: 'Stack 0',
    }));
    return { drunkCount, divChartConfig: { labels: divisions.map(d => `กก.${d}`), datasets } };
  }, [visualData]);

  const handleChartClick = useCallback((event, elements) => {
    if (!elements || elements.length === 0) return;
    const dataIndex = elements[0].index;
    const divisions = ["1", "2", "3", "4", "5", "6", "7", "8"];
    const clickedDiv = divisions[dataIndex];
    if (filterDiv === clickedDiv) { setFilterDiv(''); setFilterSt(''); } 
    else { setFilterDiv(clickedDiv); setFilterSt(''); }
  }, [filterDiv]);

  const trendChartConfig = useMemo(() => {
    const trendFiltered = rawData.filter(item => {
        const inDate = item.date >= trendStart && item.date <= trendEnd;
        const visualRule = (item.category === 'อุบัติเหตุ') ? (item.div === '8') : true;
        return inDate && visualRule;
    });
    const labels = [];
    let curr = new Date(trendStart);
    const end = new Date(trendEnd);
    while (curr <= end) {
        labels.push(getThaiDateStr(curr));
        curr.setDate(curr.getDate() + 1);
    }
    const categories = ['อุบัติเหตุ', 'จับกุม', 'ช่องทางพิเศษ', 'จราจรติดขัด', 'ว.43'];
    const datasets = categories.map(cat => {
        return {
            label: cat,
            data: labels.map(date => trendFiltered.filter(item => item.date === date && item.category === cat).length),
            backgroundColor: CATEGORY_COLORS[cat] || '#94a3b8',
            stack: 'stack1',
        };
    });
    return { labels: labels.map(d => d.split('-').slice(1).join('/')), datasets: datasets };
  }, [rawData, trendStart, trendEnd]);

  // -----------------------------------------------------------------------
  // 🌟 1. GENERATE REPORT FUNCTION (แค่สร้าง Text แล้วเปิด Modal)
  // -----------------------------------------------------------------------
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setCopySuccess(false); // Reset success state
    
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
      const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const todayFilterStr = getThaiDateStr(now);
      
      let report = `บก.ทล.\nรายงานสภาพการจราจร\nวันที่ ${dateStr} เวลา ${timeStr} น. ดังนี้\n\n`;

      for (const region of TRAFFIC_DATA) {
        report += `${region.region}\n`;
        
        for (const road of region.roads) {
          const manualIssues = rawData.filter(d => 
              d.road === road.id && 
              d.date === todayFilterStr &&
              (d.category === 'จราจรติดขัด' || d.category === 'ช่องทางพิเศษ' || d.category === 'ปิดช่องทางพิเศษ')
          );

          let finalStatus = "";

          if (manualIssues.length > 0) {
              finalStatus = manualIssues.map(i => {
                  const prefix = i.category === 'ช่องทางพิเศษ' ? 'เปิดช่องทางพิเศษ ' : '';
                  return `${prefix}${i.detail}`;
              }).join(', ');
          } else {
              const segmentPromises = road.segments.map(async (seg) => {
                  const result = await getTrafficFromCoords(seg.start, seg.end);
                  return { label: seg.label, ...result };
              });

              const results = await Promise.all(segmentPromises);
              const problematicSegments = results.filter(r => r.code >= 2);
              const errorSegments = results.filter(r => r.code === 0);

              if (problematicSegments.length > 0) {
                  finalStatus = problematicSegments.map(p => `${p.label} ${p.status}`).join(', ');
                  if (errorSegments.length > 0) finalStatus += " (บางช่วงสัญญาณขัดข้อง)";
              } else if (results.every(r => r.code === 0)) {
                  finalStatus = "อยู่ระหว่างตรวจสอบสัญญาณ";
              } else {
                  finalStatus = "✅ สภาพการจราจรคล่องตัวตลอดสาย";
              }
          }
          report += `- ${road.name} : ${finalStatus}\n`;
        }
      }

      // เสร็จแล้วเก็บใส่ State และเปิด Modal
      setGeneratedReportText(report);
      setShowReportModal(true);

    } catch (e) {
      console.error(e);
      alert("❌ เกิดข้อผิดพลาดในการสร้างรายงาน");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // -----------------------------------------------------------------------
  // 🌟 2. EXECUTE COPY FUNCTION (อันนี้ทำงานใน Modal กดปุ๊บติดปั๊บ)
  // -----------------------------------------------------------------------
  const handleCopyText = () => {
    navigator.clipboard.writeText(generatedReportText).then(() => {
      setCopySuccess(true);
      // alert("✅ คัดลอกเรียบร้อย"); // Optional: ไม่ต้อง Alert ก็ได้เพราะมีปุ่มเขียวโชว์
    }).catch(err => {
      // Fallback สำหรับเครื่องเก่าจริงๆ
      const textArea = document.createElement("textarea");
      textArea.value = generatedReportText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
    });
  };

  if (loading) return <SystemLoader />;
  if (error) return <div className="p-10 text-center text-white">Error Loading Data</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-4 font-sans text-slate-200 relative">
      
      {/* --- LOADING OVERLAY --- */}
      {isGeneratingReport && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
           <div className="bg-slate-800 p-6 rounded-xl border border-slate-600 shadow-2xl flex flex-col items-center gap-4">
              <Loader2 size={48} className="text-yellow-400 animate-spin" />
              <div className="text-center">
                 <h3 className="text-white font-bold text-lg">กำลังประมวลผลรายงาน...</h3>
                 <p className="text-slate-400 text-sm">ระบบกำลังตรวจสอบสภาพจราจรทั่วประเทศ</p>
              </div>
           </div>
        </div>
      )}

      {/* --- REPORT RESULT MODAL (พระเอกของเรา) --- */}
      {showReportModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-800 w-full max-w-lg rounded-xl border border-slate-600 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-white font-bold flex items-center gap-2">
                <ClipboardCopy className="text-yellow-400" size={20}/> รายงานพร้อมคัดลอก
              </h3>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white p-1">
                <X size={24}/>
              </button>
            </div>
            
            {/* Modal Body: Text Area */}
            <div className="p-4 flex-1">
              <textarea 
                className="w-full h-[300px] bg-slate-950 text-slate-300 p-3 rounded-lg text-xs font-mono border border-slate-700 focus:outline-none resize-none"
                value={generatedReportText}
                readOnly
              />
            </div>

            {/* Modal Footer: Action Button */}
            <div className="p-4 bg-slate-900 border-t border-slate-700">
              <button 
                onClick={handleCopyText}
                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                  copySuccess 
                    ? "bg-green-600 text-white hover:bg-green-500" 
                    : "bg-yellow-500 text-slate-900 hover:bg-yellow-400"
                }`}
              >
                {copySuccess ? <CheckCircle size={20}/> : <Copy size={20}/>}
                {copySuccess ? "คัดลอกสำเร็จแล้ว!" : "แตะเพื่อคัดลอกข้อความ"}
              </button>
              <p className="text-center text-[10px] text-slate-500 mt-2">
                *หากปุ่มไม่ทำงาน ให้กดค้างที่ข้อความเพื่อเลือกและคัดลอกเอง
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 border-b border-slate-800 pb-2 gap-2">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
           <div className="bg-yellow-400 p-1 rounded text-slate-900"><Monitor size={20} /></div>
           <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">ศูนย์ปฏิบัติการจราจร บก.ทล.</span>
        </h1>
        <div className="flex items-center gap-3">
             <button 
                onClick={handleGenerateReport} 
                className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition-all shadow-sm"
             >
                <ClipboardCopy size={14} /> สร้างรายงาน
             </button>
             <button onClick={() => setShowFilters(!showFilters)} className={`text-xs px-3 py-1.5 rounded flex items-center gap-2 transition-all ${showFilters ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                <Filter size={14} /> {showFilters ? 'ซ่อน' : 'ตัวกรอง'} {showFilters ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
             </button>
             <span className="text-[10px] text-green-500 font-mono flex items-center gap-1"><Activity size={10} className="animate-pulse"/> Live</span>
             <button onClick={() => window.location.reload()} className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded border border-slate-600 hover:text-yellow-400 flex gap-2 text-xs"><RotateCcw size={14} /> รีเฟรช</button>
        </div>
      </div>

      {/* Control Panel */}
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
            <div className="col-span-2 md:col-span-1.5 relative"><MultiSelectDropdown label="ประเภทเหตุการณ์" options={['อุบัติเหตุ', 'จับกุม', 'ว.43', 'ช่องทางพิเศษ', 'จราจรติดขัด']} selected={selectedCategories} onChange={setSelectedCategories} /></div>
            <div className="col-span-2 md:col-span-1.5 relative"><MultiSelectDropdown label="เส้นทาง" options={uniqueRoads} selected={selectedRoads} onChange={setSelectedRoads} /></div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <KPI_Card title="เหตุการณ์ทั้งหมด" value={visualData.length} subtext="กก.8 (เฉพาะอุบัติเหตุ)" icon={ListChecks} accentColor="bg-slate-200" />
        <KPI_Card title="อุบัติเหตุ (กก.8)" value={visualData.filter(d => d.category === 'อุบัติเหตุ').length} subtext="รวมทั้งหมด" icon={CarFront} accentColor="bg-red-500" />
        <KPI_Card title="จับกุมเมาแล้วขับ" value={stats.drunkCount} subtext="คดีเมาสุรา" icon={Wine} accentColor="bg-purple-500" />
        <KPI_Card title="เปิดช่องทางพิเศษ" value={visualData.filter(d => d.category === 'ช่องทางพิเศษ').length} subtext="ยอดเปิด (ครั้ง)" icon={ArrowRightCircle} accentColor="bg-green-500" />
        <KPI_Card title="ปิดช่องทางพิเศษ" value={visualData.filter(d => d.category === 'ปิดช่องทางพิเศษ').length} subtext="ยอดปิด (ครั้ง)" icon={StopCircle} accentColor="bg-slate-600" />
      </div>

      {/* Map & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4 h-auto lg:h-[450px]">
         <div className="lg:col-span-8 bg-slate-800 rounded-lg border border-slate-700 relative overflow-hidden shadow-md flex flex-col h-[350px] lg:h-full">
            <div className="absolute top-2 left-2 z-[400] bg-slate-900/90 px-3 py-1.5 rounded border border-slate-600 text-[10px] text-white font-bold flex items-center gap-2 shadow-sm">
                <MapIcon size={12} className="text-yellow-400"/> ภาพรวม (อุบัติเหตุเฉพาะ กก.8)
            </div>
            <div className="flex-1 w-full h-full">
                <LongdoMapViewer data={mapData} apiKey={LONGDO_API_KEY} />
            </div>
         </div>

         <div className="lg:col-span-4 bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-md flex flex-col h-[300px] lg:h-full">
             <h3 className="text-sm font-bold text-white mb-2 pb-2 border-b border-slate-600 flex justify-between items-center">
                <span>สถิติแยกตาม กก.</span> 
                <div className="flex items-center gap-1 text-[10px] text-yellow-400 bg-slate-900 px-2 py-0.5 rounded">
                   <MousePointerClick size={12}/> กดที่กราฟเพื่อกรอง
                </div>
             </h3>
             <div className="flex-1 w-full relative">
                <Bar 
                  data={stats.divChartConfig} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    indexAxis: 'y', 
                    onClick: handleChartClick,
                    onHover: (event, chartElement) => {
                       event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                    },
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 }, color: '#94a3b8' } } }, 
                    scales: { x: { stacked: true, grid: { color: '#1e293b' }, ticks: { color: '#64748b' } }, y: { stacked: true, grid: { display: false }, ticks: { color: '#e2e8f0', font: { weight: 'bold' } } } } 
                  }} 
                />
             </div>
         </div>
      </div>

      {/* Trend Chart */}
      <div className="grid grid-cols-1 mb-4">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-md">
            <div className="flex flex-wrap justify-between items-center mb-4 border-b border-slate-700 pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp size={16} className="text-green-400"/> เปรียบเทียบรายวัน (อุบัติเหตุเฉพาะ กก.8)
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">เลือกช่วงเวลา:</span>
                    <input type="date" className="bg-slate-900 border border-slate-600 text-white text-[10px] p-1.5 rounded focus:border-yellow-500 outline-none" value={trendStart} onChange={e => setTrendStart(e.target.value)} />
                    <span className="text-slate-500 text-xs">-</span>
                    <input type="date" className="bg-slate-900 border border-slate-600 text-white text-[10px] p-1.5 rounded focus:border-yellow-500 outline-none" value={trendEnd} onChange={e => setTrendEnd(e.target.value)} />
                </div>
            </div>
            <div className="h-[240px] w-full relative">
                 <Bar 
                    data={trendChartConfig} 
                    options={{
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 10, font: { size: 10 } } }, tooltip: { mode: 'index', intersect: false } },
                        scales: { x: { stacked: true, grid: { display: false }, ticks: { color: '#94a3b8' } }, y: { stacked: true, grid: { color: '#1e293b', borderDash: [5, 5] }, ticks: { color: '#64748b' } } }
                    }}
                 />
            </div>
        </div>
      </div>

      {/* Log List */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-md flex flex-col h-[400px] overflow-hidden">
             <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-white text-sm font-bold flex items-center gap-2"><Siren size={16} className="text-yellow-500"/> รายการเหตุการณ์ล่าสุด (Log)</h3>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-600">แสดงทั้งหมด {logData.length} รายการ</span>
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
                    {logData.length > 0 ? logData.map((item, idx) => (
                      <tr key={idx} className={`hover:bg-slate-700/30 transition-colors ${item.category.includes('ปิด') || item.category === 'จราจรปกติ' ? 'opacity-50 grayscale' : ''}`}>
                        <td className="px-4 py-3 align-top">
                            <div className="text-yellow-400 font-mono font-bold text-sm">{item.time} น.</div>
                            <div className="text-[10px] text-slate-500">{item.date}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                            <span className={`border px-2 py-0.5 rounded text-[10px] font-mono ${item.div === '8' ? 'bg-yellow-900/30 border-yellow-600 text-yellow-200' : 'bg-slate-900 border-slate-600 text-slate-300'}`}>
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
                      <tr><td colSpan="5" className="p-12 text-center text-slate-500">ไม่พบข้อมูล</td></tr>
                    )}
                  </tbody>
                </table>
             </div>
      </div>
    </div>
  );
}