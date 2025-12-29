import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';

// Config & Utils
import { SHEET_TRAFFIC_URL, SHEET_ENFORCE_URL, SHEET_SAFETY_URL, ORG_STRUCTURE, CATEGORY_COLORS } from './constants/config';
import { TRAFFIC_DATA } from './constants/traffic_nodes'; 
import { getThaiDateStr, parseCSV } from './utils/helpers';
import { processSheetData } from './utils/dataProcessor';
import { analyzeTrafficText, getTrafficFromCoords } from './utils/trafficUtils';

// Components
import SystemLoader from './components/common/SystemLoader';
import DashboardHeader from './components/dashboard/DashboardHeader';
import FilterSection from './components/dashboard/FilterSection';
import StatCards from './components/dashboard/StatCards';
import MapAndChartSection from './components/dashboard/MapAndChartSection';
import LogTablesSection from './components/dashboard/LogTablesSection';
import TrendChartSection from './components/dashboard/TrendChartSection';
import ReportModal from './components/report/ReportModal';

// Registration
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
ChartJS.defaults.color = '#94a3b8'; 
ChartJS.defaults.borderColor = '#334155'; 
ChartJS.defaults.font.family = "'Sarabun', 'Prompt', sans-serif";

const LONGDO_API_KEY = "43c345d5dae4db42926bd41ae0b5b0fa"; // ควรย้ายไป .env
const AUTO_REFRESH_INTERVAL = 60000;

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

  // 1. Log Data (Filtered)
  const logData = useMemo(() => {
    return rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      
      let passCategory = true;
      if (selectedCategories.length > 0) {
          passCategory = selectedCategories.includes(item.category);
          if (selectedCategories.includes('ช่องทางพิเศษ') && item.category === 'ปิดช่องทางพิเศษ') {
              passCategory = true;
          }
      }

      const passRoad = selectedRoads.length === 0 || selectedRoads.includes(item.road);
      const passDiv = !filterDiv || item.div === filterDiv;
      const passSt = !filterSt || item.st === filterSt;
      return passDate && passCategory && passRoad && passDiv && passSt;
    }).sort((a,b) => b.timestamp - a.timestamp);
  }, [rawData, filterStartDate, filterEndDate, filterDiv, filterSt, selectedCategories, selectedRoads]);

  // 2. Accident Data
  const accidentLogData = useMemo(() => {
    return rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      return passDate && item.category === 'อุบัติเหตุ';
    }).sort((a,b) => b.timestamp - a.timestamp);
  }, [rawData, filterStartDate, filterEndDate]);

  // 3. Visual Data
  const visualData = useMemo(() => {
    return logData.filter(item => {
        if (item.category === 'อุบัติเหตุ') return item.div === '8'; 
        return true; 
    });
  }, [logData]);

  // 4. Map Data
  const mapData = useMemo(() => {
    const dateFilteredData = rawData.filter(d => {
        if (filterStartDate && filterEndDate) return d.date >= filterStartDate && d.date <= filterEndDate;
        return true;
    }).sort((a, b) => a.timestamp - b.timestamp);

    const activeStates = new Map(); 
    const otherEvents = []; 

    dateFilteredData.forEach(row => {
        if (!row.lat || !row.lng) return; 
        
        const locKey = `${row.div}-${row.st}-${row.road}-${row.dir}`;
        const content = `${row.category || ''} ${row.detail || ''} ${row.specialLane || ''} ${row.reportFormat || ''}`.toLowerCase();
        const laneKey = `LANE-${locKey}`;
        const isOpening = content.includes('เปิดช่องทาง') || content.includes('open lane') || content.includes('reverselane') || row.category === 'ช่องทางพิเศษ';
        const isClosing = content.includes('ปิดช่องทาง') || content.includes('ยุติ') || content.includes('ยกเลิก') || row.category === 'ปิดช่องทางพิเศษ';

        if (isOpening) {
            activeStates.set(laneKey, { ...row, pinType: 'lane', status: 'open', category: 'ช่องทางพิเศษ' });
        } else if (isClosing) {
            activeStates.delete(laneKey);
        }

        if (row.category === 'อุบัติเหตุ' && row.div === '8') {
             otherEvents.push({ ...row, pinType: 'event' });
        }

        if (content.includes('เมา') && (content.includes('จับกุม') || row.reportFormat === 'ENFORCE')) {
             otherEvents.push({ ...row, pinType: 'drunk', category: 'จับกุมเมาแล้วขับ' });
        }
    });

    return [...otherEvents, ...activeStates.values()];
  }, [rawData, filterStartDate, filterEndDate]);

  // 📊 STATS
  const stats = useMemo(() => {
    const drunkCount = rawData.filter(item => {
        let passDate = true;
        if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
        const allText = `${item.category} ${item.detail} ${item.reportFormat}`.toLowerCase();
        const isEnforceContext = allText.includes('จับกุม') || item.reportFormat === 'ENFORCE';
        const isDrunk = allText.includes('เมา');
        return passDate && isEnforceContext && isDrunk;
    }).length;

    const activeLaneCount = mapData.filter(d => d.pinType === 'lane').length;
    const openLaneCount = visualData.filter(d => d.category === 'ช่องทางพิเศษ').length;
    const closeLaneCount = visualData.filter(d => d.category === 'ปิดช่องทางพิเศษ').length;

    const divisions = ["1", "2", "3", "4", "5", "6", "7", "8"];
    const mainCats = ['อุบัติเหตุ', 'จับกุม', 'ช่องทางพิเศษ', 'จราจรติดขัด', 'ว.43'];
    const datasets = mainCats.map(cat => ({
        label: cat,
        data: divisions.map(div => visualData.filter(d => d.div === div && d.category === cat).length),
        backgroundColor: CATEGORY_COLORS[cat] || '#cbd5e1',
        stack: 'Stack 0',
    }));
    return { drunkCount, openLaneCount, closeLaneCount, activeLaneCount, divChartConfig: { labels: divisions.map(d => `กก.${d}`), datasets } };
  }, [visualData, rawData, filterStartDate, filterEndDate, mapData]);

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
      // Fallback
      var textArea = document.createElement("textarea");
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
      <ReportModal show={showReportModal} onClose={() => setShowReportModal(false)} isGenerating={isGeneratingReport} reportText={generatedReportText} onCopy={handleCopyText} copySuccess={copySuccess} direction={reportDirection} />
      <DashboardHeader lastUpdated={lastUpdated} onRefresh={() => fetchData(false)} onToggleFilter={() => setShowFilters(!showFilters)} showFilters={showFilters} onGenerateReport={handleGenerateReport} reportDirection={reportDirection} setReportDirection={setReportDirection} />
      {showFilters && (<FilterSection dateRangeOption={dateRangeOption} setDateRangeOption={setDateRangeOption} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} filterDiv={filterDiv} setFilterDiv={setFilterDiv} filterSt={filterSt} setFilterSt={setFilterSt} stations={stations} selectedCategories={selectedCategories} setSelectedCategories={setSelectedCategories} selectedRoads={selectedRoads} setSelectedRoads={setSelectedRoads} uniqueRoads={uniqueRoads} />)}
      <StatCards visualData={visualData} stats={stats} />
      <MapAndChartSection mapData={mapData} stats={stats} handleChartClick={handleChartClick} LONGDO_API_KEY={LONGDO_API_KEY} />
      <LogTablesSection logData={logData} accidentLogData={accidentLogData} />
      <TrendChartSection trendChartConfig={trendChartConfig} trendStart={trendStart} setTrendStart={setTrendStart} trendEnd={trendEnd} setTrendEnd={setTrendEnd} />
    </div>
  );
}