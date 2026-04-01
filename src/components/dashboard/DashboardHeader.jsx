import React, { useState } from 'react';
import { Monitor, RotateCcw, ClipboardCopy, Filter, AlertCircle, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function DashboardHeader({
  lastUpdated,
  onRefresh,
  onToggleFilter,
  showFilters,
  onGenerateReport,
  onGenerateReportProblem,
  reportDirection,
  setReportDirection
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Find the main content area to capture
      const content = document.querySelector('.flex-1.relative.overflow-y-auto');
      if (!content) return;

      const canvas = await html2canvas(content, {
        scale: 2, // Higher quality
        useCORS: true,
        backgroundColor: '#020617', // slate-950
        windowWidth: content.scrollWidth,
        windowHeight: content.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      
      // Calculate PDF dimensions (A4 portrait)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // If content is longer than 1 page, just scale it to fit or let it overflow (usually we just want a single long snapshot)
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      pdf.save(`Traffic_Dashboard_${timestamp}.pdf`);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap justify-between items-center mb-4 border-b border-slate-800 pb-2 gap-2">
      <h1 className="text-xl font-bold text-white flex items-center gap-3">
        <img
          src="https://cib.go.th/backend/uploads/medium_logo_cib_4_2x_9f2da10e9f_a7828c9ca0.png"
          alt="CIB Logo"
          className="h-10 w-auto drop-shadow-md"
        />
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">ศูนย์ปฏิบัติการจราจร บก.ทล.</span>
      </h1>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          {/* Custom Sliding Toggle for Inbound/Outbound */}
          <div className="relative flex bg-slate-800 rounded-lg p-1 border border-slate-700 items-center gap-1 w-36 h-9">
            {/* Sliding Pill Background - Dynamic Color based on state */}
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md transition-all duration-300 ease-custom-bezier shadow-md 
              ${reportDirection === 'outbound'
                  ? 'left-1 bg-gradient-to-r from-blue-600 to-indigo-600'
                  : 'left-[calc(50%+2px)] bg-gradient-to-r from-orange-500 to-red-600'
                }`}
            ></div>

            <button
              onClick={() => setReportDirection('outbound')}
              className={`relative z-10 w-1/2 text-xs font-bold transition-colors duration-300 text-center ${reportDirection === 'outbound' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
            >
              ขาออก
            </button>
            <button
              onClick={() => setReportDirection('inbound')}
              className={`relative z-10 w-1/2 text-xs font-bold transition-colors duration-300 text-center ${reportDirection === 'inbound' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
            >
              ขาเข้า
            </button>
          </div>

          <span className="text-[10px] text-slate-500 hidden xl:block ml-2 border-l border-slate-700 pl-2">Updated: {lastUpdated.toLocaleTimeString('th-TH')}</span>
          
          {/* New Export Button */}
          <button 
            onClick={handleExportPDF} 
            disabled={isExporting}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition-all shadow-sm"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 
            <span className="hidden sm:inline">Export PDF</span>
          </button>

          <button onClick={onGenerateReport} className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition-all shadow-sm"><ClipboardCopy size={14} /> <span className="hidden sm:inline">สร้างรายงาน</span></button>
          <button onClick={onGenerateReportProblem} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition-all shadow-sm"><AlertCircle size={14} /> <span className="hidden sm:inline">จุดปัญหา</span></button>
          <button onClick={onToggleFilter} className={`text-xs px-3 py-1.5 rounded flex items-center gap-2 transition-all ${showFilters ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}><Filter size={14} /></button>
          <button onClick={onRefresh} className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded border border-slate-600 hover:text-yellow-400 flex gap-2 text-xs"><RotateCcw size={14} /></button>
        </div>
      </div>
    </div>
  );
}