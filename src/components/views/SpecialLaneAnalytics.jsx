import React, { useMemo } from 'react';
import { Route, Clock, BarChart3, MapPin, Calendar, ArrowRight, Gauge, Layers } from 'lucide-react';

const TIME_SLOTS = [
    { label: 'เช้ามืด (00.00-06.00)', range: [0, 6], color: 'from-slate-700 to-slate-900', icon: Clock },
    { label: 'เช้า (06.00-12.00)', range: [6, 12], color: 'from-amber-500 to-orange-600', icon: Clock },
    { label: 'บ่าย (12.00-18.00)', range: [12, 18], color: 'from-orange-500 to-red-600', icon: Clock },
    { label: 'ค่ำ (18.00-00.00)', range: [18, 24], color: 'from-indigo-800 to-slate-950', icon: Clock },
];

const OperationalShieldIcon = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
    </svg>
);

export default function SpecialLaneAnalytics({
    processedSpecialLanes,
    filterStartDate,
    filterEndDate
}) {

    const analytics = useMemo(() => {
        if (!processedSpecialLanes || processedSpecialLanes.length === 0) return null;

        const locationMap = {};
        const dates = new Set();

        // 1. Group by Location
        processedSpecialLanes.forEach(lane => {
            const key = lane.locationKey || `${lane.div}-${lane.st}-${lane.road}-${lane.km}-${lane.dir}`;
            if (!locationMap[key]) {
                locationMap[key] = {
                    key,
                    div: lane.div,
                    st: lane.st,
                    road: lane.road,
                    km: lane.km,
                    dir: lane.dir,
                    laneKey: lane.laneKey,
                    totalCount: 0,
                    sessions: [],
                    timeCounts: [0, 0, 0, 0], // 00-06, 06-12, 12-18, 18-00
                };
            }

            locationMap[key].totalCount += 1;
            locationMap[key].sessions.push(lane);
            dates.add(lane.date);

            // Time grouping
            if (lane.time) {
                const hour = parseInt(lane.time.split(':')[0]);
                if (!isNaN(hour)) {
                    if (hour >= 0 && hour < 6) locationMap[key].timeCounts[0]++;
                    else if (hour >= 6 && hour < 12) locationMap[key].timeCounts[1]++;
                    else if (hour >= 12 && hour < 18) locationMap[key].timeCounts[2]++;
                    else locationMap[key].timeCounts[3]++;
                }
            }
        });

        // 2. Daily Frequency Context - Use the selected filter range for accurate averaging
        let numDays = dates.size || 1;
        if (filterStartDate && filterEndDate) {
            const start = new Date(filterStartDate);
            const end = new Date(filterEndDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            numDays = diffDays;
        }

        const hotspots = Object.values(locationMap).map(loc => {
            const avgPerDay = loc.totalCount / numDays;
            const mostFrequentTimeSlot = loc.timeCounts.indexOf(Math.max(...loc.timeCounts));
            const timeLabels = ['เช้ามืด', 'เช้ามืด', 'บ่าย', 'ค่ำ'];

            return {
                ...loc,
                avgPerDay: avgPerDay.toFixed(1),
                peakTimeIdx: mostFrequentTimeSlot
            };
        }).sort((a, b) => b.totalCount - a.totalCount);

        return {
            totalOpenings: processedSpecialLanes.length,
            uniquePoints: hotspots.length,
            hotspots,
            numDays,
            avgTotalPerDay: (processedSpecialLanes.length / numDays).toFixed(1)
        };
    }, [processedSpecialLanes, filterStartDate, filterEndDate]);

    if (!analytics) return (
        <div className="flex flex-col items-center justify-center p-20 text-slate-500 italic">
            <Route size={48} className="mb-4 opacity-20" />
            ไม่พบข้อมูลการเปิดช่องทางพิเศษในช่วงเวลาที่เลือก
        </div>
    );

    return (
        <div className="p-4 md:p-6 w-full animate-in fade-in duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center gap-3">
                        <Route size={28} className="text-blue-400" />
                        วิเคราะห์การเปิดใช้งานช่องทางพิเศษ (Special Lane Usage)
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-medium">real-time special lane analytics engine</p>
                </div>
                <div className="flex gap-3">
                    <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl flex flex-col items-end">
                        <span className="text-[10px] text-blue-300 uppercase font-bold">มีการเปิดใช้ทั้งหมด</span>
                        <span className="text-xl font-bold text-blue-400 font-mono">{analytics.totalOpenings} ครั้ง</span>
                    </div>
                    <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl flex flex-col items-end">
                        <span className="text-[10px] text-indigo-300 uppercase font-bold">เปิดทั้งหมด</span>
                        <span className="text-xl font-bold text-indigo-400 font-mono">{analytics.uniquePoints} จุด</span>
                    </div>
                </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg hover-lift-glow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400"><Layers size={20} /></div>
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 font-bold">Total Count</span>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{analytics.totalOpenings} ครั้ง</div>
                    <div className="text-[11px] text-slate-500">จำนวนครั้งที่มีการเปิดใช้งานทั้งหมด</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg hover-lift-glow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400"><Gauge size={20} /></div>
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30 font-bold">Frequency</span>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{analytics.avgTotalPerDay} <span className="text-sm font-normal text-slate-500">ครั้ง/วัน</span></div>
                    <div className="text-[11px] text-slate-500">ค่าเฉลี่ยความถี่การเปิดต่อวัน</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg hover-lift-glow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-amber-500/20 p-2 rounded-lg text-amber-500"><MapPin size={20} /></div>
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/30 font-bold">Top Location</span>
                    </div>
                    <div className="text-lg font-bold text-white mb-1 uppercase truncate">
                        {analytics.hotspots.length > 0 ? `${analytics.hotspots[0].road} กม.${analytics.hotspots[0].km}` : '-'}
                    </div>
                    <div className="text-[11px] text-slate-500">จุดที่มีการเปิดใช้งานบ่อยที่สุด</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg hover-lift-glow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-teal-500/20 p-2 rounded-lg text-teal-400"><Calendar size={20} /></div>
                        <span className="text-[10px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded border border-teal-500/30 font-bold">Dates</span>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{analytics.numDays} <span className="text-sm font-normal text-slate-500">วัน</span></div>
                    <div className="text-[11px] text-slate-500">จำนวนวันที่ตรวจพบการเปิดใช้งาน</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Hotspots Detailed Table */}
                <div className="lg:col-span-12 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="bg-slate-800/50 px-6 py-4 border-b border-white/5 flex justify-between items-center whitespace-nowrap">
                        <div className="flex items-center gap-2 font-bold text-slate-200">
                            <BarChart3 size={18} className="text-blue-400" /> สถิติการเปิดช่องทางพิเศษ
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-slate-950/50 border-b border-slate-800">
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">ลำดับ</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">จุดที่มีการเปิด (เส้นทาง / กม.)</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">สถานีรับผิดชอบ / กก.</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">จำนวนครั้งรวม</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">ความถี่ (ครั้ง/วัน)</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">ห้วงเวลาที่นิยมเปิด</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">ครั้งล่าสุดที่เปิด</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {analytics.hotspots.map((loc, i) => {
                                    const latest = loc.sessions[0];
                                    const timeLabels = ['เช้ามืด', 'เช้า', 'บ่าย', 'ค่ำ'];
                                    const timeColors = ['text-slate-400', 'text-amber-400', 'text-orange-500', 'text-indigo-400'];

                                    return (
                                        <tr key={i} className="hover:bg-blue-500/[0.02] transition-colors group">
                                            <td className="px-6 py-4 font-mono text-xs text-slate-500">{i + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors uppercase">ทล.{loc.road} กม.{loc.km}</span>
                                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{loc.dir || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-slate-300">ส.ทล.{loc.st} กก.{loc.div}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-slate-800 text-blue-400 px-3 py-1 rounded-full text-xs font-bold border border-blue-500/20 group-hover:border-blue-500/50 transition-all">
                                                    {loc.totalCount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="text-xs font-bold text-white">{loc.avgPerDay}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={12} className={timeColors[loc.peakTimeIdx]} />
                                                    <span className={`text-[11px] font-bold ${timeColors[loc.peakTimeIdx]}`}>{timeLabels[loc.peakTimeIdx]}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <div className="text-xs text-slate-200 font-mono">{latest.time} น.</div>
                                                    <div className="text-[10px] text-slate-500">{latest.date}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {analytics.hotspots.length > 0 && (
                    <div className="lg:col-span-12 bg-gradient-to-br from-blue-900/40 to-slate-950 border border-blue-500/20 p-8 rounded-3xl relative overflow-hidden group">
                        <div className="absolute right-[-2rem] top-[-2rem] text-blue-500/10 rotate-12 transition-transform group-hover:scale-110 duration-1000">
                            <Route size={200} />
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-blue-400 font-bold text-lg mb-4 flex items-center gap-2 underline underline-offset-8 decoration-blue-500/30">
                                <OperationalShieldIcon size={20} /> ข้อแนะนำสำหรับการบริหารจัดการ
                            </h4>
                            <p className="text-slate-300 text-sm leading-relaxed max-w-4xl">
                                ในภาพรวมตรวจพบการเปิดใช้งานช่องทางพิเศษเฉลี่ยที่ <span className="text-blue-400 font-bold">{analytics.avgTotalPerDay} ครั้งต่อวัน</span>
                                โดยจุดที่มีความถี่สูงสุดคือ <span className="text-white font-bold underline decoration-blue-500">ทล.{analytics.hotspots[0]?.road} กม.{analytics.hotspots[0]?.km}</span>
                                แนะนำให้ตรวจสอบปริมาณรถสะสมผ่านกล้อง CCTV ในจุด {analytics.hotspots[0]?.road} ช่วงเวลา {TIME_SLOTS[analytics.hotspots[0]?.peakTimeIdx]?.label || '-'} เป็นพิเศษ
                                เพื่อเตรียมกำลังพลคอยอำนวยการจราจรให้สอดคล้องกับพฤติกรรมการเปิดช่วงเวลาดังกล่าวครับ
                            </p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

