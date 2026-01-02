import React, { useMemo, useState } from 'react';
import { X, BarChart2 } from 'lucide-react';

export default function RouteStatsModal({ show, onClose, title, items }) {
    if (!show) return null;

    // Filter Logic inside Stats Modal (if needed) or just use all items passed
    // Assuming 'items' passed here are already filtered by the parent or raw?
    // Usually we want to show stats for the SAME set of items as the card.

    // Group Data
    const statsData = useMemo(() => {
        if (!items || items.length === 0) return [];

        const roadCounts = {};
        items.forEach(item => {
            const road = item.meta?.road || 'ไม่ระบุ';
            roadCounts[road] = (roadCounts[road] || 0) + 1;
        });

        const sorted = Object.entries(roadCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([road, count]) => ({
                road: road === 'undefined' ? 'ไม่ระบุ' : road,
                count,
                percent: (count / items.length) * 100
            }));

        return sorted;
    }, [items]);

    return (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-modal-entry flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <BarChart2 className="text-cyan-400" />
                        สถิติแยกตามเส้นทาง
                        <span className="text-sm font-normal text-slate-400">({title})</span>
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-grow bg-slate-950/50">
                    {statsData.length === 0 ? (
                        <div className="text-center text-slate-500 py-10">ไม่มีข้อมูลสำหรับคำนวณสถิติ</div>
                    ) : (
                        <div className="space-y-6">

                            {/* Top Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 text-center">
                                    <div className="text-slate-400 text-sm mb-1">ถนนที่มีรายงานสูงสุด</div>
                                    <div className="text-3xl font-bold text-white mb-1">ทล.{statsData[0]?.road}</div>
                                    <div className="text-cyan-400 text-sm">{statsData[0]?.count} รายการ</div>
                                </div>
                                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 text-center">
                                    <div className="text-slate-400 text-sm mb-1">จำนวนเส้นทางทั้งหมด</div>
                                    <div className="text-3xl font-bold text-white mb-1">{statsData.length}</div>
                                    <div className="text-cyan-400 text-sm">เส้นทาง</div>
                                </div>
                            </div>

                            {/* Bar Chart List */}
                            <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50">
                                <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider text-slate-400">รายละเอียดตามเส้นทาง</h4>
                                <div className="space-y-4">
                                    {statsData.map((stat, idx) => (
                                        <div key={idx} className="relative group">
                                            <div className="flex justify-between items-end mb-1">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${idx < 3 ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-700/50' : 'bg-slate-700 text-slate-400'}`}>
                                                        {idx + 1}
                                                    </div>
                                                    <span className="font-medium text-slate-200">ทล.{stat.road}</span>
                                                </div>
                                                <div className="text-right flex items-baseline gap-2">
                                                    <span className="text-lg font-bold text-white">{stat.count}</span>
                                                    <span className="text-xs text-slate-500 w-12 text-right">({stat.percent.toFixed(1)}%)</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-700/30 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full relative ${idx === 0 ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-slate-600'}`}
                                                    style={{ width: `${stat.percent}%` }}
                                                >
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-800/30">
                    <button onClick={onClose} className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors text-sm font-medium">
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        </div>
    );
}
