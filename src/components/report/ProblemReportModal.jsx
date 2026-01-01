
import React from 'react';
import { ClipboardCopy, X, Copy, CheckCircle, AlertCircle } from 'lucide-react';

export default function ProblemReportModal({ show, onClose, reportText, reportMetadata, onCopy, copySuccess }) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-modal-entry flex flex-col max-h-[90vh]">

                {/* Header - Red Theme */}
                <div className="p-4 bg-gradient-to-r from-red-900 to-slate-900 border-b border-red-700/50 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <AlertCircle className="text-red-400" size={24} />
                        รายงานจุดที่มีปัญหา
                    </h3>
                    <button onClick={onClose} className="text-red-200 hover:text-white p-1 rounded-full hover:bg-red-800/50 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Text Area */}
                <div className="p-4 flex-1 bg-slate-900">
                    <textarea
                        className="w-full h-[350px] bg-slate-950 text-slate-200 p-4 rounded-lg text-xs font-mono border border-slate-700 focus:outline-none focus:border-red-500 resize-none leading-relaxed"
                        value={reportText}
                        readOnly
                    />
                </div>

                {/* Footer Stats and Copy */}
                <div className="p-4 bg-slate-900 border-t border-slate-700 flex flex-col gap-3">
                    {reportMetadata && (
                        <div className="flex justify-between text-xs text-slate-400 px-1">
                            <span>🔴 ติดขัด: {reportMetadata.congestionCount}</span>
                            <span>🚗 อุบัติเหตุ: {reportMetadata.accidentCount}</span>
                            <span>🟢 ช่องทางพิเศษ: {reportMetadata.activeLaneCount}</span>
                        </div>
                    )}

                    <button
                        onClick={onCopy}
                        className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${copySuccess
                            ? "bg-green-600 text-white hover:bg-green-500"
                            : "bg-red-600 text-white hover:bg-red-500"
                            }`}
                    >
                        {copySuccess ? <CheckCircle size={20} /> : <Copy size={20} />}
                        {copySuccess ? "คัดลอกสำเร็จแล้ว!" : "คัดลอกรายงาน"}
                    </button>
                </div>
            </div>
        </div>
    );
}
