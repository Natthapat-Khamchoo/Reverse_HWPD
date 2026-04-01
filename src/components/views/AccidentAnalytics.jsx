import React, { useMemo } from 'react';
import { AlertTriangle, MapPin, Bone, Activity } from 'lucide-react';

export default function AccidentAnalytics({ filteredData }) {

    const accidentStats = useMemo(() => {
        const accidentData = filteredData || [];
        
        let deadCount = 0;
        let injuredCount = 0;
        const roadCount = {};

        accidentData.forEach(d => {
            const detail = d.detail || '';
            
            // Extract casualties roughly from detail string
            const deadMatch = detail.match(/ตาย\s*(\d+)/) || detail.match(/เสียชีวิต\s*(\d+)/);
            if(deadMatch) deadCount += parseInt(deadMatch[1], 10);
            
            const injuredMatch = detail.match(/เจ็บ\s*(\d+)/) || detail.match(/บาดเจ็บ\s*(\d+)/);
            if(injuredMatch) injuredCount += parseInt(injuredMatch[1], 10);

            const roadName = d.road && d.road !== '-' ? d.road : 'ไม่ระบุ';
            roadCount[roadName] = (roadCount[roadName] || 0) + 1;
        });

        const sortedRoads = Object.entries(roadCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);

        return {
            total: accidentData.length,
            dead: deadCount,
            injured: injuredCount,
            topRoads: sortedRoads
        };
    }, [filteredData]);

    return (
        <div className="p-4 md:p-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-600 mb-6 flex items-center gap-3">
                <AlertTriangle size={28} className="text-red-500"/>
                พื้นที่เสี่ยงอุบัติเหตุซ้ำซ้อน
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-[0_0_15px_rgba(225,29,72,0.1)] relative overflow-hidden">
                    <div className="text-slate-400 text-sm mb-1 font-medium">รวมอุบัติเหตุสะสม</div>
                    <div className="text-4xl font-bold text-red-400">{accidentStats.total} <span className="text-lg text-slate-500">ครั้ง</span></div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg relative overflow-hidden">
                    <div className="absolute top-4 right-4 text-slate-800">
                       <Bone size={40} />
                    </div>
                    <div className="text-slate-400 text-sm mb-1 font-medium">เสียชีวิตรวม</div>
                    <div className="text-4xl font-bold text-rose-500">{accidentStats.dead} <span className="text-lg text-slate-500">ราย</span></div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg relative overflow-hidden">
                    <div className="absolute top-4 right-4 text-slate-800">
                       <Activity size={40} />
                    </div>
                    <div className="text-slate-400 text-sm mb-1 font-medium">บาดเจ็บรวม</div>
                    <div className="text-4xl font-bold text-orange-400">{accidentStats.injured} <span className="text-lg text-slate-500">ราย</span></div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden relative">
                <div className="border-b border-slate-800 p-4 bg-slate-800/50">
                    <h3 className="font-bold flex items-center gap-2 text-slate-200">
                        <MapPin size={18} className="text-red-400" />
                        15 อันดับถนนที่มีอุบัติเหตุสูงสุด (จุดเสี่ยง)
                    </h3>
                </div>
                <div className="p-4 overflow-x-auto relative">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="text-xs uppercase bg-slate-800 text-slate-400">
                            <tr>
                                <th className="px-4 py-3 rounded-tl-lg">อันดับ</th>
                                <th className="px-4 py-3">เส้นทาง (ถนน)</th>
                                <th className="px-4 py-3 text-right">จำนวนครั้ง</th>
                                <th className="px-4 py-3 rounded-tr-lg w-1/3">ระดับความเสี่ยง (Heat)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {accidentStats.topRoads.map(([road, count], index) => {
                                const maxCount = accidentStats.topRoads[0]?.[1] || 1;
                                const percent = (count / maxCount) * 100;
                                return (
                                    <tr key={index} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 font-mono text-slate-500">#{index + 1}</td>
                                        <td className="px-4 py-3 font-bold text-red-200">{road}</td>
                                        <td className="px-4 py-3 text-right font-mono text-lg">{count}</td>
                                        <td className="px-4 py-3">
                                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                                                <div 
                                                    className="bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full relative" 
                                                    style={{ width: `${Math.max(5, percent)}%` }}
                                                >
                                                    <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/30 blur-sm mix-blend-overlay animate-pulse"></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="text-xs text-slate-500 mt-4 px-2 tracking-widest uppercase">
                * Note: Go to 'Overview' map to visually see these hotspots rendered as Heatmaps.
            </p>
        </div>
    );
}
