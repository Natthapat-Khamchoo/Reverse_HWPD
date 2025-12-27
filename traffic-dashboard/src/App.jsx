import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  RotateCcw, ListChecks, Monitor, Calendar, Siren, 
  CarFront, ShieldAlert, StopCircle, Activity, 
  ArrowRightCircle, Wine, Filter, ChevronUp, ChevronDown, Map as MapIcon,
  TrendingUp, MousePointerClick, ClipboardCopy, Loader2, X, Copy, CheckCircle,
  ArrowRightLeft, AlertTriangle, MapPin
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
const AUTO_REFRESH_INTERVAL = 60000; // 1 นาที

// ----------------------------------------------------------------------
// 🛠️ Helper Functions
// ----------------------------------------------------------------------

const fallbackCopyTextToClipboard = (text) => {
  var textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try { document.execCommand('copy'); } catch (err) { console.error('Fallback copy failed', err); }
  document.body.removeChild(textArea);
};

const copyToClipboard = async (text) => {
  if (!navigator.clipboard) { fallbackCopyTextToClipboard(text); return; }
  try { await navigator.clipboard.writeText(text); } catch (err) { fallbackCopyTextToClipboard(text); }
};

const analyzeTrafficText = (text) => {
  if (!text) return { emoji: "📝", status: "รายงานทั่วไป" };
  const lowerText = text.toLowerCase();
  if (lowerText.includes("ติดขัด") || lowerText.includes("หยุดนิ่ง") || lowerText.includes("หนาแน่นมาก")) 
    return { emoji: "🔴", status: "หนาแน่น/ติดขัด" };
  if (lowerText.includes("ชะลอตัว") || lowerText.includes("หนาแน่น") || lowerText.includes("รถมาก")) 
    return { emoji: "🟡", status: "ชะลอตัว/หนาแน่น" };
  if (lowerText.includes("คล่องตัว") || lowerText.includes("รถน้อย") || lowerText.includes("เบาบาง")) 
    return { emoji: "✅", status: "คล่องตัว" };
  return { emoji: "📝", status: "รายงานตามข้อความ" };
};

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
      const timeSec = route.interval; 
      const timeHour = timeSec / 3600;
      
      if (timeHour <= 0) return { status: "ตรวจสอบไม่ได้", code: 0 };

      const speed = distanceKm / timeHour; 
      let result = { code: 0, status: "" };

      if (speed >= 60) { result.status = "คล่องตัว"; result.code = 1; }
      else if (speed >= 35) { result.status = "หนาแน่น/ชะลอตัว"; result.code = 2; }
      else if (speed >= 15) { result.status = "ติดขัด"; result.code = 3; }
      else { result.status = "ติดขัดมาก/หยุดนิ่ง 🔴"; result.code = 4; }

      return result;
    }
  } catch (err) {
    console.warn("Traffic API Warning:", err.message);
  }
  return { status: "ตรวจสอบไม่ได้/ปิดถนน", code: 0 }; 
};

// ----------------------------------------------------------------------
// 🚀 Main Component
// ----------------------------------------------------------------------
export default function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatedReportText, setGeneratedReportText] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [reportDirection, setReportDirection] = useState('outbound'); 

  // Controls
  const [dateRangeOption, setDateRangeOption] = useState('today');
  const [customStart, setCustomStart] = useState(getThaiDateStr());
  const [customEnd, setCustomEnd] = useState(getThaiDateStr());
  const [filterDiv, setFilterDiv] = useState('');
  const [filterSt, setFilterSt] = useState(''); 
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedRoads, setSelectedRoads] = useState([]);

  // Trend Controls
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

  // 🔄 Fetch Data
  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(false);
    try {
      const timestamp = new Date().getTime();
      const [resTraffic, resEnforce, resSafety] = await Promise.all([
           fetch(`${SHEET_TRAFFIC_URL}&t=${timestamp}`).then(r => r.text()),
           fetch(`${SHEET_ENFORCE_URL}&t=${timestamp}`).then(r => r.text()),
           fetch(`${SHEET_SAFETY_URL}&t=${timestamp}`).then(r => r.text())
      ]);
      const dataTraffic = processSheetData(parseCSV(resTraffic), 'TRAFFIC');
      const dataEnforce = processSheetData(parseCSV(resEnforce), 'ENFORCE');
      const dataSafety = processSheetData(parseCSV(resSafety), 'SAFETY');
      setRawData([...dataTraffic, ...dataEnforce, ...dataSafety]);
      setLastUpdated(new Date());
    } catch (err) { console.error(err); setError(true); } 
    finally { if (!isBackground) setTimeout(() => setLoading(false), 800); }
  }, []);

  useEffect(() => {
    fetchData(false);
    const intervalId = setInterval(() => fetchData(true), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  // --- Data Processing ---
  const uniqueRoads = useMemo(() => Array.from(new Set(rawData.map(d => d.road).filter(r => r && r !== '-' && r.length < 10))).sort(), [rawData]);
  const stations = useMemo(() => (filterDiv && ORG_STRUCTURE[filterDiv]) ? Array.from({ length: ORG_STRUCTURE[filterDiv] }, (_, i) => i + 1) : [], [filterDiv]);

  // -----------------------------------------------------------------------
  // 🌟 DATASETS (แยกถังข้อมูลให้ชัดเจน)
  // -----------------------------------------------------------------------

  // 1. Global Data (กรองแค่วันที่ ไม่สน กก./ส.ทล.) -> ใช้สำหรับ Map, Chart, KPI เมา
  const globalDateData = useMemo(() => {
    return rawData.filter(item => {
      if (filterStartDate && filterEndDate) return item.date >= filterStartDate && item.date <= filterEndDate;
      return true;
    }).sort((a,b) => b.timestamp - a.timestamp);
  }, [rawData, filterStartDate, filterEndDate]);

  // 2. Log Data (กรองวันที่ + กรอง User Selection) -> ใช้สำหรับ Table ซ้าย
  const logData = useMemo(() => {
    return globalDateData.filter(item => {
      let passCategory = true;
      if (selectedCategories.length > 0) {
          passCategory = selectedCategories.includes(item.category);
          // Special Lane Fix: include 'ปิด' when filtering 'ช่องทางพิเศษ'
          if (selectedCategories.includes('ช่องทางพิเศษ') && item.category === 'ปิดช่องทางพิเศษ') passCategory = true;
      }
      const passRoad = selectedRoads.length === 0 || selectedRoads.includes(item.road);
      const passDiv = !filterDiv || item.div === filterDiv;
      const passSt = !filterSt || item.st === filterSt;
      return passCategory && passRoad && passDiv && passSt;
    });
  }, [globalDateData, filterDiv, filterSt, selectedCategories, selectedRoads]);

  // 3. Accident Log (กรองวันที่ + เอาเฉพาะอุบัติเหตุทุกหน่วย) -> ใช้สำหรับ Table ขวา
  const accidentLogData = useMemo(() => {
    return globalDateData.filter(item => item.category === 'อุบัติเหตุ');
  }, [globalDateData]);

  // -----------------------------------------------------------------------
  // 🗺️ MAP DATA (ใช้ Global Data = ไม่สนตัวกรอง กก.)
  // -----------------------------------------------------------------------
  const mapData = useMemo(() => {
    const activeStates = new Map(); 
    const otherEvents = []; 

    // ใช้ globalDateData (เห็นทุกหน่วย)
    globalDateData.forEach(row => {
        if (!row.lat || !row.lng) return; 
        
        const locKey = `${row.div}-${row.st}-${row.road}-${row.dir}`;
        const content = `${row.category || ''} ${row.detail || ''} ${row.specialLane || ''} ${row.reportFormat || ''}`.toLowerCase();

        // 1. ช่องทางพิเศษ (All Units)
        const laneKey = `LANE-${locKey}`;
        const isOpening = content.includes('เปิดช่องทาง') || content.includes('open lane') || content.includes('reverselane') || row.category === 'ช่องทางพิเศษ';
        const isClosing = content.includes('ปิดช่องทาง') || content.includes('ยุติ') || content.includes('ยกเลิก') || row.category === 'ปิดช่องทางพิเศษ';

        if (isOpening) activeStates.set(laneKey, { ...row, pinType: 'lane', status: 'open', category: 'ช่องทางพิเศษ' });
        else if (isClosing) activeStates.delete(laneKey);

        // 2. อุบัติเหตุ (เฉพาะ กก.8 เท่านั้น)
        if (row.category === 'อุบัติเหตุ' && row.div === '8') {
             otherEvents.push({ ...row, pinType: 'event' });
        }

        // 3. เมาแล้วขับ (All Units - ห้ามกรอง)
        // Logic เช็คเมาที่แม่นยำ
        if (content.includes('เมา') && (content.includes('จับกุม') || row.reportFormat === 'ENFORCE')) {
             otherEvents.push({ ...row, pinType: 'drunk', category: 'จับกุมเมาแล้วขับ' });
        }
        
        // * ตัด Logic แสดงจราจรติดขัดออกตามที่ขอ *
    });

    return [...otherEvents, ...activeStates.values()];
  }, [globalDateData]);

  // -----------------------------------------------------------------------
  // 📊 STATS (ใช้ Global Data = ไม่สนตัวกรอง กก.)
  // -----------------------------------------------------------------------
  const stats = useMemo(() => {
    // 1. ยอดจับกุมเมา (All Units)
    const drunkCount = globalDateData.filter(item => {
        const allText = `${item.category} ${item.detail} ${item.reportFormat}`.toLowerCase();
        const isEnforceContext = allText.includes('จับกุม') || item.reportFormat === 'ENFORCE';
        const isDrunk = allText.includes('เมา');
        return isEnforceContext && isDrunk;
    }).length;

    // 2. ยอดช่องทางพิเศษ (All Units)
    const openLaneCount = mapData.filter(d => d.pinType === 'lane').length; // Active from map
    // ปิดช่องทาง (นับจาก Global เพื่อให้เห็นภาพรวม)
    const closeLaneCount = globalDateData.filter(d => d.category === 'ปิดช่องทางพิเศษ').length;
    const activeLaneCount = openLaneCount;

    // 3. กราฟเปรียบเทียบ (All Units - แยกตาม กก.)
    const divisions = ["1", "2", "3", "4", "5", "6", "7", "8"];
    const mainCats = ['อุบัติเหตุ', 'จับกุม', 'ช่องทางพิเศษ', 'จราจรติดขัด', 'ว.43'];
    
    const datasets = mainCats.map(cat => ({
        label: cat,
        data: divisions.map(div => {
            return globalDateData.filter(d => {
                if (d.div !== div) return false;
                
                // Logic รวมเมาเข้าในแท่งจับกุม
                if (cat === 'จับกุม') {
                     const allText = `${d.category} ${d.detail} ${d.reportFormat}`.toLowerCase();
                     const isDrunk = allText.includes('เมา') && (allText.includes('จับกุม') || d.reportFormat === 'ENFORCE');
                     return d.category === 'จับกุม' || isDrunk;
                }
                return d.category === cat;
            }).length;
        }),
        backgroundColor: CATEGORY_COLORS[cat] || '#cbd5e1',
        stack: 'Stack 0',
    }));

    return { drunkCount, openLaneCount, closeLaneCount, activeLaneCount, divChartConfig: { labels: divisions.map(d => `กก.${d}`), datasets } };
  }, [globalDateData, mapData]);

  // Chart Click Handler
  const handleChartClick = useCallback((event, elements) => {
    if (!elements || elements.length === 0) return;
    const dataIndex = elements[0].index;
    const divisions = ["1", "2", "3", "4", "5", "6", "7", "8"];
    const clickedDiv = divisions[dataIndex];
    if (filterDiv === clickedDiv) { setFilterDiv(''); setFilterSt(''); } 
    else { setFilterDiv(clickedDiv); setFilterSt(''); }
  }, [filterDiv]);

  // Trend Chart (ใช้ Global เหมือนกัน แต่กรองตามช่วงเวลา trendStart/End)
  const trendChartConfig = useMemo(() => {
    const trendFiltered = rawData.filter(item => {
        const inDate = item.date >= trendStart && item.date <= trendEnd;
        // Trend เอาเฉพาะอุบัติเหตุ กก.8 ตามโจทย์
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

  // Generate Report
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setCopySuccess(false);
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
      const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const todayFilterStr = getThaiDateStr(now);
      const directionText = reportDirection === 'outbound' ? '(ขาออก)' : '(ขาเข้า)';
      
      let report = `บก.ทล.\nรายงานสภาพการจราจร ${directionText}\nวันที่ ${dateStr} เวลา ${timeStr} น. ดังนี้\n\n`;

      for (const region of TRAFFIC_DATA) {
        let regionHasRoads = false;
        let regionReport = `${region.region}\n`;
        
        for (const road of region.roads) {
          regionHasRoads = true;
          const officerReport = rawData.find(d => 
              d.road === road.id && 
              d.date === todayFilterStr &&
              (d.category === 'จราจรติดขัด' || d.category === 'สภาพจราจร' || d.category === 'ช่องทางพิเศษ' || d.detail.includes('จราจร') || d.detail.includes('รถ'))
          );

          let finalStatus = "";
          let prefixEmoji = "";

          if (officerReport) {
              const analysis = analyzeTrafficText(officerReport.detail);
              const laneInfo = officerReport.category.includes('ช่องทางพิเศษ') || officerReport.detail.includes('เปิดช่องทาง') ? ' (เปิดช่องทางพิเศษ)' : '';
              prefixEmoji = analysis.emoji;
              let cleanDetail = officerReport.detail.replace(/^(สภาพจราจร|รายละเอียด)[:\s-]*/g, '');
              finalStatus = `${prefixEmoji} ${cleanDetail}${laneInfo} (จนท.รายงาน)`;
          } else {
              const segmentPromises = road.segments.map(async (seg) => {
                  let start = seg.start;
                  let end = seg.end;
                  if (reportDirection === 'inbound') { start = seg.end; end = seg.start; }
                  const result = await getTrafficFromCoords(start, end);
                  return { label: seg.label, ...result };
              });
              const results = await Promise.all(segmentPromises);
              const problematic = results.filter(r => r.code >= 2);
              const allGreen = results.every(r => r.code === 1);
              const apiError = results.every(r => r.code === 0);

              if (problematic.length > 0) {
                  prefixEmoji = "🟡"; 
                  if (problematic.some(r => r.code >= 3)) prefixEmoji = "🔴";
                  finalStatus = problematic.map(p => `${p.label} ${p.status}`).join(', ');
                  finalStatus = `${prefixEmoji} ${finalStatus}`;
              } else if (allGreen) {
                  finalStatus = "✅ สภาพการจราจรคล่องตัวตลอดสาย";
              } else if (apiError) {
                  finalStatus = "⚫ อยู่ระหว่างตรวจสอบข้อมูล";
              } else {
                  finalStatus = "✅ สภาพการจราจรเคลื่อนตัวได้ดี";
              }
          }
          regionReport += `- ${road.name} : ${finalStatus}\n`;
        }
        if(regionHasRoads) report += regionReport;
      }
      setGeneratedReportText(report);
      setShowReportModal(true);
    } catch (e) { console.error(e); alert("❌ เกิดข้อผิดพลาดในการสร้างรายงาน"); } 
    finally { setIsGeneratingReport(false); }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generatedReportText).then(() => {
      setCopySuccess(true);
    }).catch(err => {
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
      
      {/* Loading & Modal */}
      {isGeneratingReport && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
           <div className="bg-slate-800 p-6 rounded-xl border border-slate-600 shadow-2xl flex flex-col items-center gap-4">
              <Loader2 size={48} className="text-yellow-400 animate-spin" />
              <div className="text-center"><h3 className="text-white font-bold text-lg">กำลังประมวลผลรายงาน...</h3><p className="text-slate-400 text-sm">ตรวจสอบ: {reportDirection === 'outbound' ? 'ขาออก (จาก กทม.)' : 'ขาเข้า (เข้า กทม.)'}</p><p className="text-slate-500 text-xs mt-1">อาจใช้เวลา 5-10 วินาที</p></div>
           </div>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-800 w-full max-w-lg rounded-xl border border-slate-600 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-white font-bold flex items-center gap-2"><ClipboardCopy className="text-yellow-400" size={20}/> รายงานพร้อมคัดลอก {reportDirection === 'outbound' ? '(ขาออก)' : '(ขาเข้า)'}</h3>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white p-1"><X size={24}/></button>
            </div>
            <div className="p-4 flex-1"><textarea className="w-full h-[300px] bg-slate-950 text-slate-300 p-3 rounded-lg text-xs font-mono border border-slate-700 focus:outline-none resize-none" value={generatedReportText} readOnly /></div>
            <div className="p-4 bg-slate-900 border-t border-slate-700">
              <button onClick={handleCopyText} className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${copySuccess ? "bg-green-600 text-white hover:bg-green-500" : "bg-yellow-500 text-slate-900 hover:bg-yellow-400"}`}>
                {copySuccess ? <CheckCircle size={20}/> : <Copy size={20}/>} {copySuccess ? "คัดลอกสำเร็จแล้ว!" : "แตะเพื่อคัดลอกข้อความ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 border-b border-slate-800 pb-2 gap-2">
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><div className="bg-yellow-400 p-1 rounded text-slate-900"><Monitor size={20} /></div><span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">ศูนย์ปฏิบัติการจราจร บก.ทล.</span></h1>
        <div className="flex items-center gap-2">
             <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 items-center gap-2">
                <span className="text-[10px] text-slate-500 hidden sm:block">Updated: {lastUpdated.toLocaleTimeString('th-TH')}</span>
                <button onClick={() => setReportDirection('outbound')} className={`px-3 py-1 text-xs rounded font-bold transition-all ${reportDirection === 'outbound' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>ขาออก</button>
                <button onClick={() => setReportDirection('inbound')} className={`px-3 py-1 text-xs rounded font-bold transition-all ${reportDirection === 'inbound' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>ขาเข้า</button>
             </div>
             <button onClick={handleGenerateReport} className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition-all shadow-sm"><ClipboardCopy size={14} /> สร้างรายงาน</button>
             <button onClick={() => setShowFilters(!showFilters)} className={`text-xs px-3 py-1.5 rounded flex items-center gap-2 transition-all ${showFilters ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}><Filter size={14} /></button>
             <button onClick={() => fetchData(false)} className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded border border-slate-600 hover:text-yellow-400 flex gap-2 text-xs"><RotateCcw size={14} /></button>
        </div>
      </div>

      {/* Controls (User Filters) */}
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

      {/* KPI Cards (Uses Global Data for Drunk/Accident) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {/* เหตุการณ์ทั้งหมด: ใช้ LogData ที่กรองแล้ว (ตามที่ User อยากดู) */}
        <KPI_Card title="เหตุการณ์ทั้งหมด" value={logData.length} subtext="ตามตัวกรอง" icon={ListChecks} accentColor="bg-slate-200" />
        
        {/* อุบัติเหตุ กก.8: ใช้ Global Data (เพื่อให้เห็นยอดรวม กก.8 เสมอ) */}
        <KPI_Card title="อุบัติเหตุ (กก.8)" value={globalDateData.filter(d => d.category === 'อุบัติเหตุ' && d.div === '8').length} subtext="ยอดรวม กก.8" icon={CarFront} accentColor="bg-red-500" />
        
        {/* เมาแล้วขับ: ใช้ Global Data (ทุกหน่วย) */}
        <KPI_Card title="จับกุมเมาแล้วขับ" value={stats.drunkCount} subtext="คดีเมาสุรา (ทุกหน่วย)" icon={Wine} accentColor="bg-purple-500" />
        
        {/* ช่องทางพิเศษ: ใช้ Global Data */}
        <KPI_Card title="ช่องทางพิเศษ (คงเหลือ)" value={stats.activeLaneCount} subtext={`เปิด ${stats.openLaneCount} / ปิด ${stats.closeLaneCount}`} icon={ArrowRightCircle} accentColor={stats.activeLaneCount > 0 ? "bg-green-500 animate-pulse" : "bg-slate-500"} />
        <KPI_Card title="ปิดช่องทางพิเศษ" value={stats.closeLaneCount} subtext="ยอดปิด (ครั้ง)" icon={StopCircle} accentColor="bg-slate-600" />
      </div>

      {/* Map & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4 h-auto lg:h-[450px]">
         <div className="lg:col-span-8 bg-slate-800 rounded-lg border border-slate-700 relative overflow-hidden shadow-md flex flex-col h-[350px] lg:h-full">
            <div className="absolute top-2 left-2 z-[400] bg-slate-900/90 px-3 py-1.5 rounded border border-slate-600 text-[10px] text-white font-bold flex items-center gap-2 shadow-sm">
                <MapIcon size={12} className="text-yellow-400"/> แผนที่ (อุบัติเหตุ กก.8 + เมาทุกหน่วย)
            </div>
            <div className="flex-1 w-full h-full"><LongdoMapViewer data={mapData} apiKey={LONGDO_API_KEY} /></div>
         </div>
         <div className="lg:col-span-4 bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-md flex flex-col h-[300px] lg:h-full">
             <h3 className="text-sm font-bold text-white mb-2 pb-2 border-b border-slate-600 flex justify-between items-center"><span>สถิติแยกตาม กก. (รวม)</span><div className="flex items-center gap-1 text-[10px] text-yellow-400 bg-slate-900 px-2 py-0.5 rounded"><MousePointerClick size={12}/> กดเพื่อกรอง</div></h3>
             <div className="flex-1 w-full relative"><Bar data={stats.divChartConfig} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', onClick: handleChartClick, onHover: (event, chartElement) => { event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default'; }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 }, color: '#94a3b8' } } }, scales: { x: { stacked: true, grid: { color: '#1e293b' }, ticks: { color: '#64748b' } }, y: { stacked: true, grid: { display: false }, ticks: { color: '#e2e8f0', font: { weight: 'bold' } } } } }} /></div>
         </div>
      </div>

      {/* Logs (Dual Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        
        {/* Left: General Log (กรองตาม User) */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-md flex flex-col h-[400px] overflow-hidden">
             <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-700 flex justify-between items-center"><h3 className="text-white text-sm font-bold flex items-center gap-2"><Siren size={16} className="text-yellow-500"/> รายการเหตุการณ์ (Log)</h3><span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-600">แสดง {logData.length} รายการ</span></div>
             <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="uppercase bg-slate-900 text-slate-500 sticky top-0 z-10"><tr><th className="px-3 py-3 font-semibold">เวลา</th><th className="px-3 py-3 font-semibold">หน่วย</th><th className="px-3 py-3 font-semibold">ประเภท</th><th className="px-3 py-3 font-semibold">รายละเอียด</th></tr></thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {logData.length > 0 ? logData.map((item, idx) => (
                      <tr key={idx} className={`hover:bg-slate-700/30 transition-colors ${item.category.includes('ปิด') ? 'opacity-50' : ''}`}>
                        <td className="px-3 py-3 align-top whitespace-nowrap"><div className="text-yellow-400 font-mono font-bold">{item.time} น.</div><div className="text-[10px] text-slate-500">{item.date}</div></td>
                        <td className="px-3 py-3 align-top whitespace-nowrap"><span className="bg-slate-900 border border-slate-600 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">กก.{item.div} ส.ทล.{item.st}</span></td>
                        <td className="px-3 py-3 align-top whitespace-nowrap"><span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: CATEGORY_COLORS[item.category] || '#64748b' }}>{item.category}</span></td>
                        <td className="px-3 py-3 align-top"><div className="line-clamp-2" title={item.detail}>{item.detail}</div><div className="text-[10px] text-slate-400 mt-1">ทล.{item.road} กม.{item.km} {item.dir}</div></td>
                      </tr>
                    )) : <tr><td colSpan="4" className="p-12 text-center text-slate-500">ไม่พบข้อมูล</td></tr>}
                  </tbody>
                </table>
             </div>
        </div>

        {/* Right: Accident Log (All Units - ไม่กรองตาม User) */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-md flex flex-col h-[400px] overflow-hidden">
             <div className="px-4 py-3 bg-red-900/20 border-b border-red-900/50 flex justify-between items-center"><h3 className="text-red-200 text-sm font-bold flex items-center gap-2"><AlertTriangle size={16} className="text-red-500"/> อุบัติเหตุ (ทุกหน่วยงาน)</h3><span className="text-xs text-red-300 bg-red-900/30 px-2 py-1 rounded border border-red-800">รวม {accidentLogData.length} รายการ</span></div>
             <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/30">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="uppercase bg-slate-900 text-slate-500 sticky top-0 z-10"><tr><th className="px-3 py-3 font-semibold w-[15%]">เวลา</th><th className="px-3 py-3 font-semibold w-[15%]">หน่วย</th><th className="px-3 py-3 font-semibold w-[25%]">จุดเกิดเหตุ</th><th className="px-3 py-3 font-semibold w-[45%]">รายละเอียด</th></tr></thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {accidentLogData.length > 0 ? accidentLogData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-red-900/10 transition-colors">
                        <td className="px-3 py-3 align-top whitespace-nowrap"><div className="text-red-400 font-mono font-bold">{item.time} น.</div><div className="text-[10px] text-slate-500">{item.date}</div></td>
                        <td className="px-3 py-3 align-top whitespace-nowrap"><span className="bg-slate-900 border border-slate-600 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">กก.{item.div} ส.ทล.{item.st}</span></td>
                        <td className="px-3 py-3 align-top"><div className="text-slate-300 font-bold flex items-start gap-1"><MapPin size={12} className="mt-0.5 text-yellow-500 flex-shrink-0"/><span>ทล.{item.road}</span></div><div className="text-[10px] text-slate-400 pl-4">กม.{item.km} {item.dir}</div></td>
                        <td className="px-3 py-3 align-top"><div className="text-slate-200 whitespace-pre-wrap leading-relaxed">{item.detail}</div></td>
                      </tr>
                    )) : <tr><td colSpan="4" className="p-12 text-center text-slate-500">ไม่พบอุบัติเหตุในช่วงเวลานี้</td></tr>}
                  </tbody>
                </table>
             </div>
        </div>
      </div>

      {/* Trend Chart (ใช้ Global + Filter ช่วงเวลา) */}
      <div className="grid grid-cols-1 mb-4">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-md">
            <div className="flex flex-wrap justify-between items-center mb-4 border-b border-slate-700 pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><TrendingUp size={16} className="text-green-400"/> เปรียบเทียบรายวัน (อุบัติเหตุเฉพาะ กก.8)</h3>
                <div className="flex items-center gap-2"><span className="text-[10px] text-slate-400 uppercase tracking-wider">เลือกช่วงเวลา:</span><input type="date" className="bg-slate-900 border border-slate-600 text-white text-[10px] p-1.5 rounded focus:border-yellow-500 outline-none" value={trendStart} onChange={e => setTrendStart(e.target.value)} /><span className="text-slate-500 text-xs">-</span><input type="date" className="bg-slate-900 border border-slate-600 text-white text-[10px] p-1.5 rounded focus:border-yellow-500 outline-none" value={trendEnd} onChange={e => setTrendEnd(e.target.value)} /></div>
            </div>
            <div className="h-[240px] w-full relative"><Bar data={trendChartConfig} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 10, font: { size: 10 } } }, tooltip: { mode: 'index', intersect: false } }, scales: { x: { stacked: true, grid: { display: false }, ticks: { color: '#94a3b8' } }, y: { stacked: true, grid: { color: '#1e293b', borderDash: [5, 5] }, ticks: { color: '#64748b' } } } }} /></div>
        </div>
      </div>
      
    </div>
  );
}