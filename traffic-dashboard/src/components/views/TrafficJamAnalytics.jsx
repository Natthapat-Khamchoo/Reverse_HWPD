import React, { useMemo } from 'react';
import { CarFront, AlertCircle, MapPin } from 'lucide-react';

export default function TrafficJamAnalytics({ rawData }) {
    
    // Process Data
    const congestionStats = useMemo(() => {
        const trafficData = rawData.filter(d => 
            d.category && (d.category.includes('หนาแน่น') || d.category.includes('รถติด') || d.category === 'จราจรหนาแน่น')
        );

        const roadCount = {};
        trafficData.forEach(d => {
            const roadName = d.road && d.road !== '-' ? d.road : 'ไม่ระบุ';
            roadCount[roadName] = (roadCount[roadName] || 0) + 1;
        });

        const sortedRoads = Object.entries(roadCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15); // Top 15

        return {
            total: trafficData.length,
            topRoads: sortedRoads
        };
    }, [rawData]);

    return (
        <div className="p-4 md:p-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-500 mb-6 flex items-center gap-3">
                <CarFront size={28} className="text-orange-500"/>
                สถิติรถติดและจราจรหนาแน่น
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-5">
                       <CarFront size={120} />
                    </div>
                    <div className="text-slate-400 text-sm mb-1 font-medium">ยอดรายงานรถติดสะสม</div>
                    <div className="text-4xl font-bold text-orange-400">{congestionStats.total} <span className="text-lg text-slate-500">ครั้ง</span></div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg md:col-span-2">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="text-yellow-500 mt-1 shrink-0" size={20}/>
                        <div>
                            <h3 className="text-lg font-bold text-slate-200">ข้อควรระวัง</h3>
                            <p className="text-sm text-slate-400 mt-1">
                                ถนนที่มีรายงานรถติดซ้ำซ้อนสูงสุด มักเป็นจุดที่มีคอขวดหรือมีการเปิดช่องทางพิเศษบ่อยครั้ง ควรประสานงานเพื่อจัดการจราจรล่วงหน้าในชั่วโมงเร่งด่วน
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="border-b border-slate-800 p-4 bg-slate-800/50">
                    <h3 className="font-bold flex items-center gap-2 text-slate-200">
                        <MapPin size={18} className="text-orange-400" />
                        15 อันดับเส้นทางที่รถติดบ่อยที่สุด
                    </h3>
                </div>
                <div className="p-4 overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="text-xs uppercase bg-slate-800 text-slate-400">
                            <tr>
                                <th className="px-4 py-3 rounded-tl-lg">อันดับ</th>
                                <th className="px-4 py-3">เส้นทาง (ถนน)</th>
                                <th className="px-4 py-3 text-right">จำนวนครั้งที่รายงาน</th>
                                <th className="px-4 py-3 rounded-tr-lg w-1/3">ความหนาแน่น</th>
                            </tr>
                        </thead>
                        <tbody>
                            {congestionStats.topRoads.map(([road, count], index) => {
                                const maxCount = congestionStats.topRoads[0]?.[1] || 1;
                                const percent = (count / maxCount) * 100;
                                return (
                                    <tr key={index} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 font-mono text-slate-500">#{index + 1}</td>
                                        <td className="px-4 py-3 font-bold text-orange-200">{road}</td>
                                        <td className="px-4 py-3 text-right font-mono text-lg">{count}</td>
                                        <td className="px-4 py-3">
                                            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                                <div 
                                                    className="bg-gradient-to-r from-orange-500 to-red-500 h-2.5 rounded-full" 
                                                    style={{ width: `${Math.max(5, percent)}%` }}
                                                ></div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {congestionStats.topRoads.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center py-8 text-slate-500">ไม่มีข้อมูลรถติดในช่วงเวลานี้</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
