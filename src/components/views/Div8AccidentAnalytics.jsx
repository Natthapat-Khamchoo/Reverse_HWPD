import React, { useMemo } from 'react';
import { Target, AlertTriangle, ShieldAlert, Clock, Info, MapPin, Gauge } from 'lucide-react';

const TIME_SLOTS = [
    { label: 'เช้ามืด (00.00-06.00)', range: [0, 6], color: 'from-slate-700 to-slate-900', icon: Clock },
    { label: 'เช้า (06.00-12.00)', range: [6, 12], color: 'from-amber-500 to-orange-600', icon: Clock },
    { label: 'บ่าย (12.00-18.00)', range: [12, 18], color: 'from-orange-500 to-red-600', icon: Clock },
    { label: 'ค่ำ (18.00-00.00)', range: [18, 24], color: 'from-indigo-800 to-slate-950', icon: Clock },
];

export default function Div8AccidentAnalytics({ filteredData }) {

    const div8Stats = useMemo(() => {
        // filter accident for div 8
        const data = (filteredData || []).filter(d =>
            (d.div === '8' || d.div === 8 || d.div === '08') &&
            d.category && d.category.includes('อุบัติเหตุ')
        );

        const stCount = {};
        const roadCount = {};
        const kmCount = {};
        const timeCount = [0, 0, 0, 0]; // 4 slots
        const causes = {};

        const keywords = ['หลับใน', 'ยางแตก', 'เบรก', 'ตัดหน้า', 'เปลี่ยนเลน', 'ความเร็ว', 'เสียหลัก', 'ชนท้าย', 'รถเสีย'];

        data.forEach(d => {
            // Count by Station
            const stName = d.st ? `ส.ทล.${d.st} กก.8` : 'ไม่ระบุ';
            stCount[stName] = (stCount[stName] || 0) + 1;

            // Count by Road + KM
            const roadName = d.road && d.road !== '-' ? d.road : 'ไม่ระบุ';
            roadCount[roadName] = (roadCount[roadName] || 0) + 1;

            if (d.km && d.km !== '-') {
                const kmKey = `ทลพ.${roadName} กม.${d.km}`;
                kmCount[kmKey] = (kmCount[kmKey] || 0) + 1;
            }

            // Time Analysis
            if (d.time) {
                const hour = parseInt(d.time.split(':')[0]);
                if (!isNaN(hour)) {
                    if (hour >= 0 && hour < 6) timeCount[0]++;
                    else if (hour >= 6 && hour < 12) timeCount[1]++;
                    else if (hour >= 12 && hour < 18) timeCount[2]++;
                    else timeCount[3]++;
                }
            }

            // Extract Causes
            const detailText = (d.detail || '').toLowerCase();
            keywords.forEach(kw => {
                if (detailText.includes(kw)) {
                    causes[kw] = (causes[kw] || 0) + 1;
                }
            });
        });

        // --- Hourly Distribution ---
        const timeCounts = [0, 0, 0, 0];
        data.forEach(d => {
            if (d.time) {
                const hour = parseInt(d.time.split(':')[0]);
                if (!isNaN(hour)) {
                    if (hour >= 0 && hour < 6) timeCounts[0]++;
                    else if (hour >= 6 && hour < 12) timeCounts[1]++;
                    else if (hour >= 12 && hour < 18) timeCounts[2]++;
                    else timeCounts[3]++;
                }
            }
        });
        const timeStats = TIME_SLOTS.map((slot, i) => ({ ...slot, count: timeCounts[i] }));

        return {
            total: data.length,
            recentList: data.slice(0, 50), // Latest 50
            topStations: Object.entries(stCount).sort((a, b) => b[1] - a[1]),
            topRoads: Object.entries(roadCount).sort((a, b) => b[1] - a[1]).slice(0, 5),
            topKM: Object.entries(kmCount).sort((a, b) => b[1] - a[1]).slice(0, 10),
            causes: Object.entries(causes).sort((a, b) => b[1] - a[1]).slice(0, 8),
            timeStats
        };
    }, [filteredData]);

    return (
        <div className="p-4 md:p-6 w-full animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-400 flex items-center gap-3">
                        <Target size={28} className="text-teal-400" />
                        วิเคราะห์อุบัติเหตุเฉพาะเจาะจง : กองกำกับการ 8
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-medium">highway police division 8 analytics dashboard</p>
                </div>
                <div className="bg-teal-500/10 border border-teal-500/30 px-6 py-3 rounded-2xl flex flex-col items-end">
                    <span className="text-[10px] text-teal-300 uppercase font-bold">Total Accidents</span>
                    <span className="text-3xl font-bold text-teal-400 font-mono">{div8Stats.total}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                {/* Time Slots Analysis */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm">
                    <h3 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2">
                        <Clock size={16} className="text-blue-400" /> วิเคราะห์ห้วงเวลาที่เกิดเหตุสูงสุด
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {div8Stats.timeStats.map((slot, i) => {
                            const max = Math.max(...div8Stats.timeStats.map(s => s.count)) || 1;
                            const h = (slot.count / max) * 100;
                            const Icon = slot.icon;
                            return (
                                <div key={i} className="flex flex-col items-center gap-3 group">
                                    <div className="w-full bg-slate-800 rounded-xl h-24 relative overflow-hidden flex items-end">
                                        <div
                                            className={`w-full bg-gradient-to-t ${slot.color} transition-all duration-1000 ease-out group-hover:brightness-125`}
                                            style={{ height: `${h}%` }}
                                        ></div>
                                        <span className="absolute inset-x-0 bottom-2 text-center text-xs font-bold text-white drop-shadow-md">
                                            {slot.count}
                                        </span>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">{slot.label}</div>
                                        <Icon size={14} className="mx-auto mt-1 text-slate-600" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Key Causes */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2">
                        <Gauge size={16} className="text-red-400" /> สาเหตุหลัก / ปัจจัยเสี่ยง
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {div8Stats.causes.map(([cause, count], i) => (
                            <div key={i} className="bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                <span className="text-xs text-red-300 font-medium">{cause}</span>
                                <span className="text-xs bg-red-900/50 text-red-400 px-1.5 rounded font-bold">{count}</span>
                            </div>
                        ))}
                        {div8Stats.causes.length === 0 && <p className="text-slate-600 text-xs italic">ไม่มีข้อมูลชี้ชัดสาเหตุ</p>}
                    </div>
                    <div className="mt-6 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                        <p className="text-[10px] text-slate-400 leading-relaxed italic">
                            * วิเคราะห์จากคีย์เวิร์ดในรายงานเบื้องต้น เพื่อระบุสาเหตุของการเกิดอุบัติเหตุใน กก.8
                        </p>
                    </div>
                </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                {/* Hotspots By KM */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="bg-slate-800/50 px-5 py-4 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2 text-slate-200">
                            <MapPin size={18} className="text-orange-400" />
                            จุดสะสมอุบัติเหตุสูงสุด (เส้นหาง + กม.)
                        </h3>
                        <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30">Top 10 Hotspots</span>
                    </div>
                    <div className="p-4">
                        <div className="space-y-2">
                            {div8Stats.topKM.map(([km, count], i) => (
                                <div key={i} className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-lg bg-orange-950 flex items-center justify-center text-[10px] font-bold text-orange-400 border border-orange-800/50">
                                            {i + 1}
                                        </div>
                                        <span className="text-sm text-slate-200 font-mono">{km}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400">{count}</span>
                                        <div className="w-16 bg-slate-800 rounded-full h-1">
                                            <div
                                                className="bg-orange-500 h-1 rounded-full"
                                                style={{ width: `${(count / (div8Stats.topKM[0]?.[1] || 1)) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top Roads Summary */}
                <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2">
                            <AlertTriangle size={16} className="text-amber-400" /> สถานีย่อยในความรับผิดชอบที่เกิดเหตุสูงสุด
                        </h3>
                        <div className="space-y-4">
                            {div8Stats.topStations.slice(0, 5).map(([st, count], i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                                        <span className="text-slate-400">{st}</span>
                                        <span className="text-teal-400">{count} ครั้ง</span>
                                    </div>
                                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                                        <div
                                            className="bg-teal-500 h-1.5 rounded-full"
                                            style={{ width: `${(count / (div8Stats.topStations[0]?.[1] || 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {div8Stats.total > 0 && (
                        <div className="bg-gradient-to-br from-teal-900/40 to-slate-900 border border-teal-500/20 p-6 rounded-2xl relative overflow-hidden group">
                            <div className="absolute -right-4 -bottom-4 text-teal-500/10 transition-transform group-hover:scale-110 duration-500">
                                <ShieldAlert size={120} />
                            </div>
                            <h4 className="text-teal-400 font-bold mb-2">ข้อแนะนำเชิงวิเคราะห์</h4>
                            <p className="text-slate-400 text-xs leading-relaxed max-w-[80%]">
                                อุบัติเหตุใน กก.8 {div8Stats.timeStats.sort((a, b) => b.count - a.count)[0]?.label || '-'} เป็นช่วงเวลาที่วิกฤตที่สุด
                                ควรเพิ่มการลาดตระเวนและเปิดไฟวับวาบในจุด กม. ที่มีการสะสมเหตุบ่อยเพื่อลดความเร็วผู้ขับขี่
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed Table Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="bg-slate-800/50 px-5 py-4 border-b border-slate-800 flex items-center gap-2">
                    <Info size={18} className="text-teal-400" />
                    <h3 className="font-bold text-slate-200">รายการอุบัติเหตุล่าสุดในพื้นที่ กก.8 (50 รายการล่าสุด)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/30 border-b border-slate-700">
                                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase">วัน/เวลา</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase">เส้นทาง/กม.</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase">ลักษณะเหตุ/รายละเอียด</th>
                                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase text-center">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {div8Stats.recentList.map((item, i) => (
                                <tr key={i} className="hover:bg-slate-800/20 transition-colors group">
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="text-xs text-teal-400 font-bold font-mono">{item.time} น.</div>
                                        <div className="text-[10px] text-slate-500">{item.date}</div>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="text-xs text-slate-200 font-bold">ทลพ.{item.road} กม.{item.km}</div>
                                        <div className="text-[10px] text-slate-500">ส.ทล.{item.st} {item.dir}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="text-xs text-slate-300 leading-relaxed font-medium line-clamp-2 max-w-sm group-hover:line-clamp-none transition-all">
                                            {item.detail}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                            รับแจ้ง
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {div8Stats.recentList.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-5 py-10 text-center text-slate-600 italic text-sm">ไม่พบข้อมูลอุบัติเหตุในฐานข้อมูล</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
