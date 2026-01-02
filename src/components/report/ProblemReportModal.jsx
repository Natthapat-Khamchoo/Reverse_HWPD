import React, { useState } from 'react';
import { ClipboardCopy, X, Copy, CheckCircle, AlertCircle, Files } from 'lucide-react';

export default function ProblemReportModal({ show, onClose, reportText, reportData, reportMetadata, onCopy, copySuccess }) {
    const [copiedIds, setCopiedIds] = useState({});

    if (!show) return null;

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedIds(prev => ({ ...prev, [id]: true }));
        setTimeout(() => {
            setCopiedIds(prev => ({ ...prev, [id]: false }));
        }, 1500);
    };

    const handleCopyCategory = (items, categoryId) => {
        // Construct the text for the category from the displayed item content
        const text = items.map(item => {
            const loc = item.meta.loc;
            const description = item.meta.rawText.split(item.meta.loc).pop().replace(/\[.*?\]/, '').trim();
            const time = item.meta.time;
            const div = item.meta.div ? `กก.${item.meta.div}` : '';
            return `${loc}\n${description}\n🕒 ${time} ${div}`.trim();
        }).join('\n\n');
        handleCopy(text, categoryId);
    };

    // Helper to render individual items
    const renderItem = (item, idx, categoryPrefix) => {
        const uniqueId = `${categoryPrefix}-${idx}`;
        const isCopied = copiedIds[uniqueId];

        // Construct the text for an individual item
        const itemTextToCopy = `${item.meta.loc}\n${item.meta.rawText.split(item.meta.loc).pop().replace(/\[.*?\]/, '').trim()}\n🕒 ${item.meta.time} ${item.meta.div ? `กก.${item.meta.div}` : ''}`.trim();

        const itemClass = item.meta.isOpen
            ? "bg-green-900/20 border border-green-800/50 hover:bg-green-900/30 text-green-100"
            : "bg-slate-800/50 border border-slate-700 hover:bg-slate-800 text-slate-200";

        return (
            <div key={idx} className={`${itemClass} p-3 rounded mb-2 text-xs transition-colors relative group`}>
                <div className="font-bold text-slate-200 mb-1 pr-6">{item.meta.loc}</div>
                <div className="text-slate-400 mb-1">{item.meta.rawText.split(item.meta.loc).pop().replace(/\[.*?\]/, '').trim()}</div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-700/50">
                    <span>🕒 {item.meta.time}</span>
                    <span>{item.meta.div ? `กก.${item.meta.div}` : ''}</span>
                </div>

                {/* Copy Button (Visible on Hover or if Copied) */}
                <button
                    onClick={() => handleCopy(itemTextToCopy, uniqueId)}
                    className={`absolute top-2 right-2 p-1.5 rounded transition-all ${isCopied
                        ? "bg-green-500/20 text-green-400 opacity-100"
                        : "bg-slate-700/50 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-slate-600"
                        }`}
                    title="คัดลอกรายการนี้"
                >
                    {isCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
                </button>
            </div>
        );
    };

    const renderCategoryHeader = (title, count, items, categoryId, colorClass, iconEmoji) => {
        const isCopied = copiedIds[categoryId];

        // Specific logic for Special Lanes to split Copy functions
        if (categoryId === 'cat-lane') {
            const openLanes = items.filter(i => i.meta.isOpen);
            const closedLanes = items.filter(i => !i.meta.isOpen);

            return (
                <div className={`p-3 ${colorClass} text-white font-bold text-sm flex flex-col gap-2 shadow-sm sticky top-0 z-10`}>
                    <div className="flex items-center gap-2">
                        <span>{iconEmoji} {title} ({count})</span>
                    </div>
                    <div className="flex gap-2 w-full">
                        {openLanes.length > 0 && (
                            <button
                                onClick={() => handleCopyCategory(openLanes, 'cat-lane-open')}
                                className="flex-1 flex items-center justify-center gap-1 text-[10px] bg-green-500/30 hover:bg-green-500/50 border border-green-500/50 px-2 py-1.5 rounded transition-colors backdrop-blur-sm"
                                title="คัดลอกเฉพาะจุดที่เปิดอยู่"
                            >
                                {copiedIds['cat-lane-open'] ? <CheckCircle size={12} /> : <Files size={12} />}
                                คัดลอก (เปิดอยู่)
                            </button>
                        )}
                        {closedLanes.length > 0 && (
                            <button
                                onClick={() => handleCopyCategory(closedLanes, 'cat-lane-closed')}
                                className="flex-1 flex items-center justify-center gap-1 text-[10px] bg-black/20 hover:bg-black/40 border border-white/10 px-2 py-1.5 rounded transition-colors backdrop-blur-sm"
                                title="คัดลอกเฉพาะจุดที่ปิดแล้ว"
                            >
                                {copiedIds['cat-lane-closed'] ? <CheckCircle size={12} /> : <Files size={12} />}
                                คัดลอก (ปิดแล้ว)
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className={`p-3 ${colorClass} text-white font-bold text-sm flex items-center justify-between shadow-sm sticky top-0 z-10`}>
                <div className="flex items-center gap-2">
                    <span>{iconEmoji} {title} ({count})</span>
                </div>
                {count > 0 && (
                    <button
                        onClick={() => handleCopyCategory(items, categoryId)}
                        className="flex items-center gap-1 text-[10px] bg-black/20 hover:bg-black/40 px-2 py-1 rounded transition-colors backdrop-blur-sm"
                        title="คัดลอกทั้งหมดในหัวข้อนี้"
                    >
                        {isCopied ? <CheckCircle size={12} /> : <Files size={12} />}
                        {isCopied ? 'คัดลอกแล้ว' : 'คัดลอกกลุ่ม'}
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden animate-modal-entry flex flex-col h-[85vh]">

                {/* Header - Red Theme */}
                <div className="p-4 bg-gradient-to-r from-red-900 to-slate-900 border-b border-red-700/50 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <AlertCircle className="text-red-400" size={24} />
                        รายงานจุดที่มีปัญหา (Problem Report)
                    </h3>
                    <button onClick={onClose} className="text-red-200 hover:text-white p-1 rounded-full hover:bg-red-800/50 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content Area - 3 Columns */}
                <div className="flex-1 overflow-hidden p-4 bg-slate-950">
                    {reportData ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">

                            {/* Column 1: Accidents */}
                            <div className="flex flex-col h-full bg-slate-900/30 rounded-lg overflow-hidden border border-red-900/20">
                                {renderCategoryHeader("อุบัติเหตุ", reportData.accidents.length, reportData.accidents, 'cat-acc', 'bg-red-900/80', '🚗')}
                                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                    {reportData.accidents.length > 0 ? (
                                        reportData.accidents.map((item, idx) => renderItem(item, idx, 'acc'))
                                    ) : (
                                        <div className="text-center text-slate-600 py-8 text-xs">ไม่พบอุบัติเหตุ</div>
                                    )}
                                </div>
                            </div>

                            {/* Column 2: Traffic Jams */}
                            <div className="flex flex-col h-full bg-slate-900/30 rounded-lg overflow-hidden border border-yellow-900/20">
                                {renderCategoryHeader("จราจร/รถติด", reportData.jams.length, reportData.jams, 'cat-jam', 'bg-yellow-700/80', '🟡')}
                                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                    {reportData.jams.length > 0 ? (
                                        reportData.jams.map((item, idx) => renderItem(item, idx, 'jam'))
                                    ) : (
                                        <div className="text-center text-slate-600 py-8 text-xs">การจราจรคล่องตัว</div>
                                    )}
                                </div>
                            </div>

                            {/* Column 3: Special Lanes */}
                            <div className="flex flex-col h-full bg-slate-900/30 rounded-lg overflow-hidden border border-green-900/20">
                                {renderCategoryHeader("ช่องทางพิเศษ", reportData.activeLanes.length, reportData.activeLanes, 'cat-lane', 'bg-green-800/80', '🟢')}
                                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                    {reportData.activeLanes.length > 0 ? (
                                        reportData.activeLanes.map((item, idx) => renderItem(item, idx, 'lane'))
                                    ) : (
                                        <div className="text-center text-slate-600 py-8 text-xs">ไม่มีการเปิดช่องทางพิเศษ</div>
                                    )}
                                </div>
                            </div>

                        </div>
                    ) : (
                        // Fallback Text Area (If data missing)
                        <textarea
                            className="w-full h-full bg-slate-900 text-slate-200 p-4 rounded-lg text-xs font-mono border border-slate-700 resize-none"
                            value={reportText}
                            readOnly
                        />
                    )}
                </div>

                {/* Footer Stats and Copy */}
                <div className="p-4 bg-slate-900 border-t border-slate-700 flex-shrink-0">
                    <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                        <div>📅 ข้อมูล ณ เวลา: {new Date().toLocaleTimeString('th-TH')}</div>
                    </div>

                    <button
                        onClick={onCopy}
                        className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${copySuccess
                            ? "bg-green-600 text-white hover:bg-green-500"
                            : "bg-red-600 text-white hover:bg-red-500"
                            }`}
                    >
                        {copySuccess ? <CheckCircle size={20} /> : <Copy size={20} />}
                        {copySuccess ? "คัดลอกรายงานรวม (All Text) สำเร็จ!" : "คัดลอกรายงานรวม (All Text)"}
                    </button>
                    <div className="text-[10px] text-center text-slate-500 mt-2">
                        * กดปุ่มคัดลอกเพื่อนำข้อความไปวางใน LINE หรือ Word ได้ทันที
                    </div>
                </div>
            </div>
        </div>
    );
}
