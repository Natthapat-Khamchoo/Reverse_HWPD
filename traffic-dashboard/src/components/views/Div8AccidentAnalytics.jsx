import React, { useMemo } from 'react';
import { Target, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function Div8AccidentAnalytics({ rawData }) {

    const div8Stats = useMemo(() => {
        // filter accident for div 8 (might be string '8' or number 8 or string '08')
        const data = rawData.filter(d => 
            (d.div === '8' || d.div === 8 || d.div === '08') && 
            d.category && d.category.includes('อุบัติเหตุ')
        );
        
        const stCount = {};
        const roadCount = {};

        data.forEach(d => {
            // Count by Station (สถานีย่อย)
            const stName = d.st ? `ส.ทล.${d.st} กก.8` : 'ไม่ระบุสถานี';
            stCount[stName] = (stCount[stName] || 0) + 1;

            // Count by Road
            const roadName = d.road && d.road !== '-' ? d.road : 'ไม่ระบุ';
            roadCount[roadName] = (roadCount[roadName] || 0) + 1;
        });

        return {
            total: data.length,
            topStations: Object.entries(stCount).sort((a,b)=>b[1]-a[1]),
            topRoads: Object.entries(roadCount).sort((a,b)=>b[1]-a[1]).slice(0, 10)
        };
    }, [rawData]);

    return (
        <div className="p-4 md:p-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-500 mb-6 flex items-center gap-3">
                <Target size={28} className="text-teal-400"/>
                วิเคราะห์อุบัติเหตุเฉพาะเจาะจง : กองบังคับการที่ 8 (ทล.8)
            </h2>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.1)] mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-lg text-slate-400 font-medium">รวมอุบัติเหตุในพื้นที่ กก.8 สะสม</h3>
                    <div className="text-5xl font-bold text-teal-400 mt-2 shadow-sm drop-shadow-[0_0_10px_rgba(45,212,191,0.5)]">
                        {div8Stats.total} <span className="text-xl text-slate-500">ครั้ง</span>
                    </div>
                </div>
                <div className="hidden md:block text-teal-900/50">
                    <ShieldAlert size={80} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Top Stations */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg relative overflow-hidden">
                    <div className="border-b border-slate-800 p-4 bg-slate-800/50">
                        <h3 className="font-bold text-slate-200">สถิติแยกตามสถานีย่อย (ส.ทล.)</h3>
                    </div>
                    <div className="p-4">
                        <ul className="space-y-3">
                            {div8Stats.topStations.map(([st, count], index) => {
                                const max = div8Stats.topStations[0]?.[1] || 1;
                                const w = Math.max(5, (count/max)*100);
                                return (
                                    <li key={index} className="flex flex-col gap-1 relative z-10">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-300 font-medium">{st}</span>
                                            <span className="text-teal-400 font-bold">{count} ครั้ง</span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${w}%` }}></div>
                                        </div>
                                    </li>
                                )
                            })}
                            {div8Stats.topStations.length === 0 && (
                                <li className="text-slate-500 text-sm text-center py-4">ไม่มีรายงานในพื้นที่ กก.8</li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Top Roads in Div 8 */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg relative overflow-hidden">
                    <div className="border-b border-slate-800 p-4 bg-slate-800/50">
                        <h3 className="font-bold flex items-center gap-2 text-slate-200">
                            <AlertTriangle size={18} className="text-orange-400" />
                            สายทางอันตรายใน กก.8
                        </h3>
                    </div>
                    <div className="p-4">
                        <ul className="space-y-4">
                            {div8Stats.topRoads.map(([road, count], index) => {
                                return (
                                    <li key={index} className="flex justify-between items-center bg-slate-800/30 p-3 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                                        <span className="text-slate-200 font-medium text-sm w-3/4 truncate">{road}</span>
                                        <span className="bg-slate-800 px-3 py-1 rounded-full text-orange-400 font-bold text-xs border border-orange-500/30">
                                            {count} เหตุ
                                        </span>
                                    </li>
                                );
                            })}
                            {div8Stats.topRoads.length === 0 && (
                                <li className="text-slate-500 text-sm text-center py-4">ไม่มีข้อมูลเส้นทาง</li>
                            )}
                        </ul>
                    </div>
                </div>

            </div>
        </div>
    );
}
