import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

export default function CardDetailModal({ show, onClose, title, items, onCopy }) {
    const [copied, setCopied] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDiv, setSelectedDiv] = useState('');
    const [selectedSt, setSelectedSt] = useState('');
    const [selectedDate, setSelectedDate] = useState('');

    if (!show) return null;

    // derived filtered items
    const filteredItems = items.filter(item => {
        if (!item.meta) return true;

        const matchSearch = searchTerm === '' || (item.meta.rawText && item.meta.rawText.includes(searchTerm.toLowerCase())) || item.text.toLowerCase().includes(searchTerm.toLowerCase());
        const matchDiv = selectedDiv === '' || item.meta.div === selectedDiv;
        const matchSt = selectedSt === '' || item.meta.st === selectedSt;
        // Date match: both formats should ideally be YYYY-MM-DD
        const matchDate = selectedDate === '' || (item.meta.date && item.meta.date === selectedDate);

        return matchSearch && matchDiv && matchSt && matchDate;
    });

    const handleCopy = () => {
        const text = filteredItems.map(i => i.text).join('\n--------------------------------\n');
        onCopy ? onCopy(text) : navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-modal-entry flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 shrink-0">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        📝 {title}
                        <span className="text-sm font-normal text-slate-400">({filteredItems.length} / {items.length} รายการ)</span>
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Filters Section */}
                <div className="p-4 bg-slate-800/30 border-b border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0">
                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="ค้นหา (ถนน, รายละเอียด)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 placeholder:text-slate-500"
                        />
                    </div>
                    {/* Filter Date */}
                    <div>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 [color-scheme:dark]"
                        />
                    </div>
                    {/* Filter Div */}
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
                    {/* Filter St */}
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
                <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar flex-grow">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 flex flex-col items-center gap-2">
                            <div className="text-4xl opacity-50">🔍</div>
                            <div>{items.length === 0 ? "ไม่มีข้อมูลรายการในช่วงเวลานี้" : "ไม่พบข้อมูลที่ค้นหา"}</div>
                        </div>
                    ) : (
                        filteredItems.map((item, idx) => (
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
                                    {item.text}
                                </div>
                                {item.meta && (
                                    <div className="mt-2 text-xs text-slate-500 flex gap-3 flex-wrap items-center border-t border-slate-700/30 pt-2">
                                        <span className="bg-slate-800 p-0.5 px-1.5 rounded">📅 {item.meta.date}</span>
                                        <span className="bg-slate-800 p-0.5 px-1.5 rounded">🕒 {item.meta.time}</span>
                                        <span className="flex-grow">📍 {item.meta.loc}</span>
                                        <span className="ml-auto opacity-70 font-semibold text-slate-400">กก.{item.meta.div} ส.ทล.{item.meta.st}</span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-800/30 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors text-sm"
                    >
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
