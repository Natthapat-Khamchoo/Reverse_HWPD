import React, { useState } from 'react';
import { X, Copy, Check, BarChart2 } from 'lucide-react';

export default function CardDetailModal({ show, onClose, title, items, onCopy, onShowStats, options = {} }) {
    const [copied, setCopied] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDiv, setSelectedDiv] = useState('');
    const [selectedSt, setSelectedSt] = useState('');
    const [selectedDate, setSelectedDate] = useState('');

    if (!show) return null;

    const safeItems = Array.isArray(items) ? items : [];

    const filteredItems = safeItems.filter(item => {
        if (!item) return false;

        const meta = item.meta || {};
        const rawText = meta.rawText ? String(meta.rawText).toLowerCase() : '';
        const text = item.text ? String(item.text).toLowerCase() : '';
        const search = searchTerm.toLowerCase();

        const matchSearch = searchTerm === '' || rawText.includes(search) || text.includes(search);

        const matchDiv = selectedDiv === '' || (meta.div && String(meta.div) === selectedDiv);
        const matchSt = selectedSt === '' || (meta.st && String(meta.st) === selectedSt);
        const matchDate = selectedDate === '' || (meta.date && meta.date === selectedDate);

        return matchSearch && matchDiv && matchSt && matchDate;
    });

    const handleCopy = () => {
        const text = filteredItems.map(i => i.text || '').join('\n--------------------------------\n');
        if (onCopy) onCopy(text);
        else navigator.clipboard.writeText(text);

        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-modal-entry flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 shrink-0">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        📝 {title}
                        <span className="text-sm font-normal text-slate-400">({filteredItems.length} / {safeItems.length} รายการ)</span>
                    </h3>
                    <div className="flex items-center gap-3">
                        {onShowStats && (
                            <button
                                onClick={onShowStats}
                                className="flex items-center gap-2 px-3 py-1.5 bg-cyan-900/30 hover:bg-cyan-800/50 text-cyan-300 rounded-lg text-sm border border-cyan-700/50 transition-colors"
                            >
                                <BarChart2 size={16} />
                                ดูสถิติ
                            </button>
                        )}
                        <div className="h-6 w-px bg-slate-700 mx-1"></div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="p-4 bg-slate-800/30 border-b border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="ค้นหา (ถนน, รายละเอียด)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 placeholder:text-slate-500"
                        />
                    </div>
                    <div>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 [color-scheme:dark]"
                        />
                    </div>
                    <div>
                        <select
                            value={selectedDiv}
                            onChange={(e) => { setSelectedDiv(e.target.value); setSelectedSt(''); }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                        >
                            <option value="">ทุกกองกำกับการ</option>
                            {["1", "2", "3", "4", "5", "6", "7", "8"].map(d => <option key={d} value={d}>กก.{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <select
                            value={selectedSt}
                            onChange={(e) => setSelectedSt(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                        >
                            <option value="">ทุกสถานี</option>
                            {["1", "2", "3", "4", "5", "6"].map(s => <option key={s} value={s}>ส.ทล.{s}</option>)}
                        </select>
                    </div>
                </div>

                {/* Content List */}
                <div className="overflow-hidden flex-grow flex flex-col bg-slate-950/30">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 flex flex-col items-center gap-2 h-full justify-center">
                            <div className="text-4xl opacity-50">🔍</div>
                            <div>{safeItems.length === 0 ? "ไม่มีข้อมูลรายการในช่วงเวลานี้" : "ไม่พบข้อมูลที่ค้นหา"}</div>
                        </div>
                    ) : (
                        <div className="p-4 h-full overflow-hidden flex flex-col">
                            <div className="space-y-3 overflow-y-auto custom-scrollbar flex-grow p-1">
                                {filteredItems.map((item, idx) => (
                                    <div key={idx} className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors relative group">
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onCopy) onCopy(item.text);
                                                    else navigator.clipboard.writeText(item.text);
                                                    setCopiedIndex(idx);
                                                    setTimeout(() => setCopiedIndex(null), 2000);
                                                }}
                                                className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300 hover:text-white transition-colors shadow-lg border border-slate-600 cursor-pointer"
                                                title="คัดลอกรายการนี้"
                                            >
                                                {copiedIndex === idx ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                            </button>
                                        </div>

                                        <div className="whitespace-pre-wrap text-slate-300 text-sm leading-relaxed font-mono pr-8">
                                            {item.text || '-'}
                                        </div>

                                        {item.meta && (
                                            <div className="mt-2 text-xs text-slate-500 flex gap-3 flex-wrap items-center border-t border-slate-700/30 pt-2">
                                                {item.meta.road && <span className="bg-slate-800 text-cyan-400 font-semibold p-0.5 px-1.5 rounded">🛣️ ทล.{item.meta.road}</span>}
                                                {item.meta.date && <span className="bg-slate-800 p-0.5 px-1.5 rounded">📅 {item.meta.date}</span>}
                                                {item.meta.time && <span className="bg-slate-800 p-0.5 px-1.5 rounded">🕒 {item.meta.time}</span>}
                                                {item.meta.loc && !item.meta.road && <span className="flex-grow">📍 {item.meta.loc}</span>}
                                                {(item.meta.div || item.meta.st) && (
                                                    <span className="ml-auto opacity-70 font-semibold text-slate-400">
                                                        {item.meta.div ? `กก.${item.meta.div}` : ''} {item.meta.st ? `ส.ทล.${item.meta.st}` : ''}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/30 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors text-sm">
                        ปิดหน้าต่าง
                    </button>
                    <button
                        onClick={handleCopy}
                        disabled={filteredItems.length === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${copied
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                            } ${filteredItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? `คัดลอก ${filteredItems.length} รายการ` : 'คัดลอกรายการที่แสดง'}
                    </button>
                </div>
            </div>
        </div>
    );
}
