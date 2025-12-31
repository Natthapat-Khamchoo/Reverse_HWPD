import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';

// Config & Utils
import { SHEET_TRAFFIC_URL, SHEET_ENFORCE_URL, SHEET_SAFETY_URL, ORG_STRUCTURE, CATEGORY_COLORS } from './constants/config';
import { getThaiDateStr, parseCSV } from './utils/helpers';
import { processSheetData } from './utils/dataProcessor';
import { generateTrafficReport } from './utils/reportGenerator';
import { generateProblemReport } from './utils/problemReportGenerator';

// Components
import SystemLoader from './components/common/SystemLoader';
import DashboardHeader from './components/dashboard/DashboardHeader';
import FilterSection from './components/dashboard/FilterSection';
import StatCards from './components/dashboard/StatCards';
import MapAndChartSection from './components/dashboard/MapAndChartSection';
import LogTablesSection from './components/dashboard/LogTablesSection';
import TrendChartSection from './components/dashboard/TrendChartSection';
import TimeAnalysisSection from './components/dashboard/TimeAnalysisSection';
import ReportModal from './components/report/ReportModal';
import ProblemReportModal from './components/report/ProblemReportModal';

// Registration
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
ChartJS.defaults.color = '#94a3b8';
ChartJS.defaults.borderColor = '#334155';
ChartJS.defaults.font.family = "'Sarabun', 'Prompt', sans-serif";

const LONGDO_API_KEY = import.meta.env.VITE_LONGDO_API_KEY || "43c345d5dae4db42926bd41ae0b5b0fa";
const AUTO_REFRESH_INTERVAL = 60000; // 1 minute (safe for API limits)

// Holiday Period Detection
const isHolidayPeriod = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  return (month === 12 && date >= 29) || (month === 1 && date <= 4);
};


export default function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatedReportText, setGeneratedReportText] = useState("");
  const [reportMetadata, setReportMetadata] = useState(null); // For feedback
  const [copySuccess, setCopySuccess] = useState(false);
  const [reportDirection, setReportDirection] = useState('outbound');

  // Problem Report State
  const [showProblemReportModal, setShowProblemReportModal] = useState(false);
  const [problemReportText, setProblemReportText] = useState("");
  const [problemReportMetadata, setProblemReportMetadata] = useState(null);
  const [copyProblemSuccess, setCopyProblemSuccess] = useState(false);

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
  const uniqueRoads = useMemo(() => Array.from(new Set(rawData.map(d => d.road).filter(r => r && r !== '-' && r.length < 10 && r !== 'ไม่ระบุ'))).sort(), [rawData]);
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
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [rawData, filterStartDate, filterEndDate, filterDiv, filterSt, selectedCategories, selectedRoads]);

  // 2. Accident Data
  const accidentLogData = useMemo(() => {
    return rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      return passDate && item.category === 'อุบัติเหตุ';
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [rawData, filterStartDate, filterEndDate]);

  // 2.5 Special Lane Data (ไม่สนใจ category/division/station filter)
  const specialLaneLogData = useMemo(() => {
    const filtered = rawData.filter(item => {
      // Filter เฉพาะวันที่ (ถ้ามี)
      let passDate = true;
      if (filterStartDate && filterEndDate) {
        passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      }
      // Filter เฉพาะข้อมูลช่องทางพิเศษ (เปิด/ปิด)
      const isSpecialLane = item.category === 'ช่องทางพิเศษ' || item.category === 'ปิดช่องทางพิเศษ';
      return passDate && isSpecialLane;
    });

    // Debug: แสดง categories ทั้งหมดที่มีใน rawData
    const allCategories = [...new Set(rawData.map(x => x.category))];
    const specialCategories = allCategories.filter(c => c && (c.includes('ช่องทาง') || c.includes('พิเศษ')));

    console.log('🔧 App.jsx - specialLaneLogData:', {
      rawDataCount: rawData.length,
      filteredCount: filtered.length,
      filterDates: { start: filterStartDate, end: filterEndDate },
      allCategoriesCount: allCategories.length,
      specialCategories: specialCategories,
      sample: filtered.slice(0, 2)
    });

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
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
    // Sort logData by timestamp to process events chronologically
    const sortedData = [...logData].sort((a, b) => a.timestamp - b.timestamp);

    const activeStates = new Map();
    const otherEvents = [];

    sortedData.forEach(row => {
      if (!row.lat || !row.lng) return;

      const locKey = `${row.div}-${row.st}-${row.road}-${row.dir}`;
      const laneKey = `LANE-${locKey}`;

      // Handle special lanes with state tracking
      if (row.category === 'ช่องทางพิเศษ') {
        activeStates.set(laneKey, { ...row, pinType: 'lane', status: 'open', category: 'ช่องทางพิเศษ' });
      } else if (row.category === 'ปิดช่องทางพิเศษ') {
        activeStates.delete(laneKey);
      }

      // Handle accidents (only kkk.8)
      if (row.category === 'อุบัติเหตุ' && row.div === '8') {
        otherEvents.push({ ...row, pinType: 'event' });
      }

      // Handle drunk driving arrests
      const content = `${row.category || ''} ${row.detail || ''}`.toLowerCase();
      if (content.includes('เมา') && (content.includes('จับกุม') || row.reportFormat === 'ENFORCE')) {
        otherEvents.push({ ...row, pinType: 'drunk', category: 'จับกุมเมาแล้วขับ' });
      }
    });

    return [...otherEvents, ...activeStates.values()];
  }, [logData]);

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

    // Calculate active lanes using state-based logic on filtered data
    const activeLaneStates = new Map();
    const sortedLogData = [...logData].sort((a, b) => a.timestamp - b.timestamp);

    sortedLogData.forEach(row => {
      const locKey = `${row.div}-${row.st}-${row.road}-${row.dir}`;
      const laneKey = `LANE-${locKey}`;

      if (row.category === 'ช่องทางพิเศษ') {
        activeLaneStates.set(laneKey, row);
      } else if (row.category === 'ปิดช่องทางพิเศษ') {
        activeLaneStates.delete(laneKey);
      }
    });

    const activeLaneCount = activeLaneStates.size;
    const openLaneCount = logData.filter(d => d.category === 'ช่องทางพิเศษ').length;
    const closeLaneCount = logData.filter(d => d.category === 'ปิดช่องทางพิเศษ').length;

    const accidentCount = rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      return passDate && item.category === 'อุบัติเหตุ';
    }).length;

    const trafficCount = rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      return passDate && (item.category.includes('จราจรติดขัด') || item.category.includes('รถมาก'));
    }).length;

    const divisions = ["1", "2", "3", "4", "5", "6", "7", "8"];
    const mainCats = ['อุบัติเหตุ', 'จับกุม', 'ช่องทางพิเศษ', 'จราจรติดขัด', 'ว.43'];
    const datasets = mainCats.map(cat => ({
      label: cat,
      data: divisions.map(div => visualData.filter(d => d.div === div && d.category === cat).length),
      backgroundColor: CATEGORY_COLORS[cat] || '#cbd5e1',
      stack: 'Stack 0',
    }));
    return { drunkCount, openLaneCount, closeLaneCount, activeLaneCount, accidentCount, trafficCount, divChartConfig: { labels: divisions.map(d => `กก.${d}`), datasets } };
  }, [visualData, rawData, filterStartDate, filterEndDate, mapData, logData]);

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
      const result = await generateTrafficReport(rawData, reportDirection);
      // New format returns { text, metadata, direction, timestamp }
      setGeneratedReportText(result.text);
      setReportMetadata(result.metadata);
      setShowReportModal(true);
    } catch (e) {
      console.error(e); alert("❌ เกิดข้อผิดพลาดในการสร้างรายงาน");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleCopyText = () => {
    const textToCopy = generatedReportText;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => setCopySuccess(true));
    } else {
      // Fallback
      var textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      try { document.execCommand('copy'); setCopySuccess(true); }
      catch (err) { console.error(err); }
      document.body.removeChild(textArea);
    }
  };

  const handleGenerateProblemReport = () => {
    setCopyProblemSuccess(false);
    const result = generateProblemReport(rawData);
    setProblemReportText(result.text);
    setProblemReportMetadata(result.metadata);
    setShowProblemReportModal(true);
  };

  const handleCopyProblemText = () => {
    const textToCopy = problemReportText;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => setCopyProblemSuccess(true));
    } else {
      // Fallback
      var textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      try { document.execCommand('copy'); setCopyProblemSuccess(true); }
      catch (err) { console.error(err); }
      document.body.removeChild(textArea);
    }
  };

  if (loading) return <SystemLoader />;
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
      <div className="text-xl text-red-400 mb-4">❌ ไม่สามารถโหลดข้อมูลได้</div>
      <button
        onClick={() => fetchData(false)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors"
      >
        ลองใหม่
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 p-4 font-sans text-slate-200 relative">
      <ReportModal show={showReportModal} onClose={() => setShowReportModal(false)} isGenerating={isGeneratingReport} reportText={generatedReportText} reportMetadata={reportMetadata} onCopy={handleCopyText} copySuccess={copySuccess} direction={reportDirection} stats={stats} />
      <ProblemReportModal show={showProblemReportModal} onClose={() => setShowProblemReportModal(false)} reportText={problemReportText} reportMetadata={problemReportMetadata} onCopy={handleCopyProblemText} copySuccess={copyProblemSuccess} />

      {/* Holiday Alert Banner */}
      {isHolidayPeriod() && (
        <div className="mb-4 p-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg border-2 border-orange-400 shadow-xl animate-pulse">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🎊</div>
            <div>
              <div className="font-bold text-lg">⚠️ ช่วงเทศกาลปีใหม่ (29 ธ.ค. - 4 ม.ค.)</div>
              <div className="text-sm mt-1 opacity-90">การจราจรอาจหนาแน่นกว่าปกติมาก โปรดติดตามสถานการณ์อย่างใกล้ชิดและสร้างรายงานบ่อยๆ | ระบบปรับเกณฑ์การทำนายให้เข้มงวดขึ้นอัตโนมัติ</div>
            </div>
          </div>
        </div>
      )}

      <DashboardHeader lastUpdated={lastUpdated} onRefresh={() => fetchData(false)} onToggleFilter={() => setShowFilters(!showFilters)} showFilters={showFilters} onGenerateReport={handleGenerateReport} onGenerateReportProblem={handleGenerateProblemReport} reportDirection={reportDirection} setReportDirection={setReportDirection} />
      {showFilters && (<FilterSection dateRangeOption={dateRangeOption} setDateRangeOption={setDateRangeOption} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} filterDiv={filterDiv} setFilterDiv={setFilterDiv} filterSt={filterSt} setFilterSt={setFilterSt} stations={stations} selectedCategories={selectedCategories} setSelectedCategories={setSelectedCategories} selectedRoads={selectedRoads} setSelectedRoads={setSelectedRoads} uniqueRoads={uniqueRoads} />)}
      <StatCards visualData={visualData} stats={stats} />
      <MapAndChartSection mapData={mapData} stats={stats} handleChartClick={handleChartClick} LONGDO_API_KEY={LONGDO_API_KEY} />

      {/* New Time Analysis Section */}
      <TimeAnalysisSection rawData={rawData} filterStartDate={filterStartDate} filterEndDate={filterEndDate} />

      <LogTablesSection logData={logData} accidentLogData={accidentLogData} specialLaneLogData={specialLaneLogData} />
      <TrendChartSection trendChartConfig={trendChartConfig} trendStart={trendStart} setTrendStart={setTrendStart} trendEnd={trendEnd} setTrendEnd={setTrendEnd} />
    </div>
  );
}