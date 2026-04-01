import React, { useState, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';

// Config & Utils
import { ORG_STRUCTURE, CATEGORY_COLORS } from './constants/config';
import { getThaiDateStr, isHolidayPeriod } from './utils/helpers';
import { generateTrafficReport } from './utils/reportGenerator';
import { generateProblemReport } from './utils/problemReportGenerator';

// Hooks
import { useTrafficData } from './hooks/useTrafficData';
import { useFilteredData } from './hooks/useFilteredData';

// Components
import LoadingScreen from './components/common/LoadingScreen';
import SummaryOverlay from './components/common/SummaryOverlay';
import DashboardHeader from './components/dashboard/DashboardHeader';
import FilterSection from './components/dashboard/FilterSection';
import StatCards from './components/dashboard/StatCards';
import MapAndChartSection from './components/dashboard/MapAndChartSection';
import LogTablesSection from './components/dashboard/LogTablesSection';
import TrendChartSection from './components/dashboard/TrendChartSection';
import TimeAnalysisSection from './components/dashboard/TimeAnalysisSection';
import ReportModal from './components/report/ReportModal';
import ProblemReportModal from './components/report/ProblemReportModal';

import Sidebar from './components/layout/Sidebar';
import TrafficJamAnalytics from './components/views/TrafficJamAnalytics';
import AccidentAnalytics from './components/views/AccidentAnalytics';
import Div8AccidentAnalytics from './components/views/Div8AccidentAnalytics';
import SpecialLaneAnalytics from './components/views/SpecialLaneAnalytics';

// ChartJS Registration
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
ChartJS.defaults.color = '#94a3b8';
ChartJS.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
ChartJS.defaults.font.family = "'Sarabun', 'Prompt', sans-serif";
ChartJS.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
ChartJS.defaults.plugins.tooltip.padding = 10;
ChartJS.defaults.plugins.tooltip.cornerRadius = 8;
ChartJS.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

const LONGDO_API_KEY = import.meta.env.VITE_LONGDO_API_KEY;

export default function App() {
  // --- UI/Navigation State ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [appState, setAppState] = useState('loading'); // 'loading' | 'summary' | 'dashboard'
  const [showFilters, setShowFilters] = useState(true);
  
  // --- Report Modal State ---
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatedReportText, setGeneratedReportText] = useState("");
  const [reportMetadata, setReportMetadata] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [reportDirection, setReportDirection] = useState('outbound');

  const [showProblemReportModal, setShowProblemReportModal] = useState(false);
  const [problemReportText, setProblemReportText] = useState("");
  const [problemReportMetadata, setProblemReportMetadata] = useState(null);
  const [copyProblemSuccess, setCopyProblemSuccess] = useState(false);

  const [summaryCopySuccess, setSummaryCopySuccess] = useState(false);

  // --- Manual Override State ---
  const [manuallyClosedIds, setManuallyClosedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('manually_closed_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Manual closure state corrupted, resetting...", e);
      return [];
    }
  });

  // --- Filter Controls ---
  const [dateRangeOption, setDateRangeOption] = useState('today');
  const [customStart, setCustomStart] = useState(getThaiDateStr());
  const [customEnd, setCustomEnd] = useState(getThaiDateStr());
  const [filterDiv, setFilterDiv] = useState('');
  const [filterSt, setFilterSt] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedRoads, setSelectedRoads] = useState([]);

  // Trend Controls
  const defaultTrendStart = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return getThaiDateStr(d);
  }, []);
  const [trendStart, setTrendStart] = useState(defaultTrendStart);
  const [trendEnd, setTrendEnd] = useState(getThaiDateStr());

  // --- External Data Hooks ---
  const { rawData, lastUpdated, loading, error, summaryText, refresh } = useTrafficData();

  // Date Logic for Data Processing
  const { filterStartDate, filterEndDate } = useMemo(() => {
    const today = new Date(); let start = new Date(today); let end = new Date(today);
    if (dateRangeOption === 'yesterday') { start.setDate(today.getDate() - 1); end.setDate(today.getDate() - 1); }
    else if (dateRangeOption === 'last7') { start.setDate(today.getDate() - 6); }
    else if (dateRangeOption === 'all') { return { filterStartDate: null, filterEndDate: null }; }
    else if (dateRangeOption === 'custom') { return { filterStartDate: customStart, filterEndDate: customEnd }; }
    return { filterStartDate: getThaiDateStr(start), filterEndDate: getThaiDateStr(end) };
  }, [dateRangeOption, customStart, customEnd]);

  // Derived Data Hook
  const {
    uniqueRoads,
    stations,
    logData,
    accidentLogData,
    specialLaneLogData,
    processedSpecialLanes,
    visualData,
    mapData,
    stats,
    trendChartConfig
  } = useFilteredData({
    rawData,
    filterStartDate,
    filterEndDate,
    filterDiv,
    filterSt,
    selectedCategories,
    selectedRoads,
    trendStart,
    trendEnd,
    manuallyClosedIds
  });

  // --- Handlers ---
  const handleLoadingComplete = () => setAppState('summary');
  const handleEnterDashboard = () => setAppState('dashboard');

  const handleSummaryCopy = () => {
    navigator.clipboard.writeText(summaryText).then(() => setSummaryCopySuccess(true));
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setCopySuccess(false);
    try {
      const result = await generateTrafficReport(rawData, reportDirection);
      setGeneratedReportText(result.text);
      setReportMetadata(result.metadata);
      setShowReportModal(true);
    } catch (e) {
      console.error(e); alert("❌ เกิดข้อผิดพลาดในการสร้างรายงาน");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleGenerateProblemReport = () => {
    setCopyProblemSuccess(false);
    const result = generateProblemReport(rawData);
    setProblemReportText(result.text);
    setProblemReportMetadata(result.metadata);
    setShowProblemReportModal(true);
  };

  const handleManualCloseId = (id) => {
    if (!id) return;
    setManuallyClosedIds(prev => {
      const next = [...new Set([...prev, id])];
      localStorage.setItem('manually_closed_ids', JSON.stringify(next));
      return next;
    });
  };


  const handleChartClick = useCallback((event, elements) => {
    if (!elements || elements.length === 0) return;
    const dataIndex = elements[0].index;
    const divisions = ["1", "2", "3", "4", "5", "6", "7", "8"];
    const clickedDiv = divisions[dataIndex];
    setFilterDiv(prev => (prev === clickedDiv ? '' : clickedDiv));
    setFilterSt('');
  }, []);

  // --- Exit Transition Logic ---
  // In a real scenario, LoadingScreen handles its own isExiting, but we sync appState here
  // The original App.jsx used a timeout for a "3s loading effect" which we can replicate if desired.
  // For Clean Code, we'll let the hook handle loading state and App handle transitions.

  if ((loading || appState === 'loading') && appState !== 'dashboard') {
    return (
      <LoadingScreen
        isExiting={!loading && appState === 'loading'}
        onComplete={handleLoadingComplete}
      />
    );
  }

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-8">
      <div className="bg-white/5 p-8 rounded-2xl border border-white/10 flex flex-col items-center text-center">
        <div className="text-red-500 mb-4 animate-bounce">⚠️</div>
        <h2 className="text-xl font-bold mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูล</h2>
        <p className="text-slate-400 mb-6">กรุณาลองใหม่อีกครั้ง</p>
        <button onClick={refresh} className="bg-indigo-600 px-6 py-2 rounded-xl">ลองใหม่</button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-950 text-white font-sans overflow-hidden">
      
      {appState === 'dashboard' && (
        <Sidebar 
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          currentView={currentView}
          setCurrentView={setCurrentView}
        />
      )}

      <div className="flex-1 relative overflow-y-auto overflow-x-hidden">
        
        {appState === 'summary' && (
          <SummaryOverlay
            reportText={summaryText}
            onCopy={handleSummaryCopy}
            onEnter={handleEnterDashboard}
            copySuccess={summaryCopySuccess}
          />
        )}

        {/* Ambient Background Effect */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] transform-gpu"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] transform-gpu"></div>
          <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-cyan-500/5 rounded-full blur-[100px] transform-gpu"></div>
        </div>

        <div className="relative z-10 p-4 md:p-6 max-w-[1600px] mx-auto">
          {/* Modals */}
          <ReportModal show={showReportModal} onClose={() => setShowReportModal(false)} isGenerating={isGeneratingReport} reportText={generatedReportText} reportMetadata={reportMetadata} onCopy={() => navigator.clipboard.writeText(generatedReportText).then(()=>setCopySuccess(true))} copySuccess={copySuccess} direction={reportDirection} stats={stats} />
          <ProblemReportModal show={showProblemReportModal} onClose={() => setShowProblemReportModal(false)} reportText={problemReportText} reportMetadata={problemReportMetadata} onCopy={() => navigator.clipboard.writeText(problemReportText).then(()=>setCopyProblemSuccess(true))} copySuccess={copyProblemSuccess} />

          {isHolidayPeriod() && (
            <div className="mb-4 p-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg border-2 border-orange-400 shadow-xl animate-pulse">
              <div className="font-bold text-lg">⚠️ ช่วงเทศกาลปีใหม่ (29 ธ.ค. - 4 ม.ค.)</div>
              <div className="text-sm opacity-90">การจราจรหนาแน่น โปรดติดตามสถานการณ์อย่างใกล้ชิด</div>
            </div>
          )}

          <DashboardHeader 
            lastUpdated={lastUpdated} 
            onRefresh={refresh} 
            onToggleFilter={() => setShowFilters(!showFilters)} 
            showFilters={showFilters} 
            onGenerateReport={handleGenerateReport} 
            onGenerateReportProblem={handleGenerateProblemReport} 
            reportDirection={reportDirection} 
            setReportDirection={setReportDirection} 
          />

          {showFilters && (
            <FilterSection 
              dateRangeOption={dateRangeOption} setDateRangeOption={setDateRangeOption} 
              customStart={customStart} setCustomStart={setCustomStart} 
              customEnd={customEnd} setCustomEnd={setCustomEnd} 
              filterDiv={filterDiv} setFilterDiv={setFilterDiv} 
              filterSt={filterSt} setFilterSt={setFilterSt} 
              stations={stations} 
              selectedCategories={selectedCategories} setSelectedCategories={setSelectedCategories} 
              selectedRoads={selectedRoads} setSelectedRoads={setSelectedRoads} 
              uniqueRoads={uniqueRoads} 
            />
          )}
          
          {currentView === 'dashboard' ? (
            <>
              <StatCards visualData={visualData} stats={stats} />
              <MapAndChartSection 
                mapData={mapData} 
                stats={stats} 
                handleChartClick={handleChartClick} 
                LONGDO_API_KEY={LONGDO_API_KEY} 
                currentView={currentView}
                onManualClose={handleManualCloseId}
              />
              <TimeAnalysisSection filteredData={logData} />
              <LogTablesSection 
                logData={logData} 
                accidentLogData={accidentLogData} 
                specialLaneLogData={processedSpecialLanes} 
                onManualClose={handleManualCloseId}
                manuallyClosedLanes={manuallyClosedIds}
              />
              <TrendChartSection trendChartConfig={trendChartConfig} trendStart={trendStart} setTrendStart={setTrendStart} trendEnd={trendEnd} setTrendEnd={setTrendEnd} />
            </>
          ) : currentView === 'traffic_jam' ? (
            <TrafficJamAnalytics filteredData={logData} />
          ) : currentView === 'accident' ? (
            <>
              <AccidentAnalytics filteredData={accidentLogData} />
              <MapAndChartSection 
        mapData={mapData} 
        stats={stats} 
        handleChartClick={handleChartClick} 
        LONGDO_API_KEY={LONGDO_API_KEY} 
        currentView={currentView}
        onManualClose={handleManualCloseId}
      />
            </>
      ) : currentView === 'div8_accident' ? (
            <Div8AccidentAnalytics filteredData={accidentLogData} />
          ) : currentView === 'special_lane' ? (
            <SpecialLaneAnalytics processedSpecialLanes={processedSpecialLanes} filterStartDate={filterStartDate} filterEndDate={filterEndDate} />
          ) : null}

        </div>
      </div>
    </div>
  );
}