import React, { useState } from 'react';
import { ClipboardCopy, ArrowRightCircle, Terminal, MapPin } from 'lucide-react';

export default function SummaryOverlay({ summaryReports, onCopy, onEnter, copySuccess }) {
    // summaryReports is { inbound: { text, ... }, outbound: { text, ... } }
    const [activeTab, setActiveTab] = useState('outbound'); // 'outbound' | 'inbound'

    const reportObj = activeTab === 'outbound' ? summaryReports.outbound : summaryReports.inbound;
    const currentText = reportObj ? (reportObj.text || reportObj) : "";

    return (
        <div className="fixed inset-0 z-[9000] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-delayed">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-warp-in ring-1 ring-slate-700/50">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden gap-4">
                    {/* Scanline Effect */}
                    <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none"></div>

                    <div className="relative z-10">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <Terminal size={20} className="text-blue-400" />
                            </div>
                            <div>
                                สรุปสถานการณ์จราจรภาพรวม
                                <div className="text-[10px] font-mono text-blue-400/80 tracking-wider">TRAFFIC SITUATION SUMMARY</div>
                            </div>
                        </h2>
                    </div>

                    {/* Tabs */}
                    <div className="relative z-10 flex bg-slate-950 rounded-lg p-1 border border-slate-700/50">
                        <button
                            onClick={() => setActiveTab('outbound')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'outbound'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            <MapPin size={14} className={activeTab === 'outbound' ? 'rotate-90' : ''} />
                            ขาออก
                        </button>
                        <button
                            onClick={() => setActiveTab('inbound')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'inbound'
                                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            <MapPin size={14} className={activeTab === 'inbound' ? '-rotate-90' : ''} />
                            ขาเข้า
                        </button>
                    </div>

                    <span className="hidden md:flex relative z-10 text-xs font-mono text-emerald-400 bg-emerald-950/30 px-3 py-1 rounded border border-emerald-500/20 items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        LIVE
                    </span>
                </div>

                {/* Content (Report Text) */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-950/50 relative">
                    <div className="bg-black/40 p-6 rounded-lg border border-slate-800 text-slate-300 font-mono text-sm whitespace-pre-wrap leading-relaxed shadow-inner min-h-[300px] animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-500 fill-mode-forwards transition-all">
                        {currentText || "กำลังสร้างรายงาน..."}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-800 bg-slate-900 flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => onCopy(currentText)}
                        className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all border ${copySuccess
                            ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:border-slate-600'
                            }`}
                    >
                        <ClipboardCopy size={18} />
                        {copySuccess ? 'COPIED' : 'COPY REPORT'}
                    </button>

                    <button
                        onClick={onEnter}
                        className="flex-[2] group py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transform hover:scale-[1.02] transition-all relative overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            ENTER DASHBOARD <ArrowRightCircle size={20} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                        {/* Shine Effect */}
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 transform skew-x-12"></div>
                    </button>
                </div>

            </div>
        </div>
    );
}
