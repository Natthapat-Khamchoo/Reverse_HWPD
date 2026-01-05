import React, { useMemo } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ShieldAlert, Users, Beer } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartDataLabels);

export default function EnforcementAnalytics({ rawData, dateFilter, filters = {} }) {
    const enforceData = useMemo(() => {
        return rawData.filter(d => {
            const isEnforce = d.reportFormat === 'ENFORCE' || d.category === 'จับกุม' || d.category === 'ว.43';

            // 1. Date Check
            let passDate = true;
            if (dateFilter.start && dateFilter.end) {
                passDate = d.date >= dateFilter.start && d.date <= dateFilter.end;
            }

            // 2. Filters
            const passDiv = !filters.div || d.div === filters.div;
            const passSt = !filters.st || d.st === filters.st;

            return isEnforce && passDate && passDiv && passSt;
        });
    }, [rawData, dateFilter, filters]);

    // 1. Drunk Driving by Division
    const drunkByDiv = useMemo(() => {
        const divs = ["1", "2", "3", "4", "5", "6", "7", "8"];
        const counts = divs.map(div => {
            return enforceData
                .filter(d => d.div === div)
                .reduce((sum, item) => sum + (item.drunkDriverCount || 0), 0);
        });

        return {
            labels: divs.map(d => `กก.${d}`),
            datasets: [{
                label: 'จำนวนจับกุมเมาแล้วขับ (ราย)',
                data: counts,
                backgroundColor: '#a855f7', // Purple-500
                borderRadius: 6
            }]
        };
    }, [enforceData]);

    // 2. Performance Overview (Total Arrests vs Checkpoints)
    const activityStats = useMemo(() => {
        const totalArrest = enforceData.filter(d => d.category === 'จับกุม').length;
        const totalCheckpoints = enforceData.filter(d => d.category === 'ว.43').length;
        const totalDrunk = enforceData.reduce((sum, d) => sum + (d.drunkDriverCount || 0), 0);
        return { totalArrest, totalCheckpoints, totalDrunk };
    }, [enforceData]);

    // 3. Time Heatmap (Simple Hourly Line)
    const timeTrend = useMemo(() => {
        const hours = Array(24).fill(0).map((_, i) => i);
        const counts = Array(24).fill(0);

        enforceData.filter(d => d.drunkDriverCount > 0).forEach(d => {
            if (!d.time) return;
            const h = parseInt(d.time.split(':')[0]);
            if (!isNaN(h)) counts[h] += d.drunkDriverCount;
        });

        return {
            labels: hours.map(h => `${h}:00`),
            datasets: [{
                label: 'ช่วงเวลาจับกุมเมาแล้วขับ',
                data: counts,
                borderColor: '#f472b6', // Pink
                backgroundColor: 'rgba(244, 114, 182, 0.2)',
                fill: true,
                tension: 0.4
            }]
        };
    }, [enforceData]);

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                    <ShieldAlert size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">ผลการจับกุม (Enforcement Analytics)</h2>
                    <p className="text-slate-400 text-sm">ติดตามผลการปฏิบัติงาน 10 ข้อหาหลักและเมาแล้วขับ</p>
                </div>
            </div>

            {/* Big Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 relative overflow-hidden group">
                    <div className="absolute right-[-20px] top-[-20px] text-slate-700/20 group-hover:text-purple-500/20 transition-colors">
                        <Beer size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="text-slate-400 font-medium">เมาแล้วขับ (ราย)</div>
                        <div className="text-5xl font-bold text-purple-400 mt-2">{activityStats.totalDrunk.toLocaleString()}</div>
                        <div className="text-xs text-slate-500 mt-2">สะสมในช่วงเวลาที่เลือก</div>
                    </div>
                </div>

                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 relative overflow-hidden group">
                    <div className="absolute right-[-20px] top-[-20px] text-slate-700/20 group-hover:text-blue-500/20 transition-colors">
                        <ShieldAlert size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="text-slate-400 font-medium">จับกุมรวม (ครั้ง)</div>
                        <div className="text-5xl font-bold text-blue-400 mt-2">{activityStats.totalArrest.toLocaleString()}</div>
                        <div className="text-xs text-slate-500 mt-2">รวมทุกข้อหา</div>
                    </div>
                </div>

                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 relative overflow-hidden group">
                    <div className="absolute right-[-20px] top-[-20px] text-slate-700/20 group-hover:text-green-500/20 transition-colors">
                        <Users size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="text-slate-400 font-medium">จุดตรวจ ว.43 (จุด)</div>
                        <div className="text-5xl font-bold text-green-400 mt-2">{activityStats.totalCheckpoints.toLocaleString()}</div>
                        <div className="text-xs text-slate-500 mt-2">การตั้งจุดตรวจกวดขันวินัย</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Drunk by Div */}
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                    <h3 className="text-lg font-bold text-slate-300 mb-4">สถิติเมาแล้วขับ แยกตามกองกำกับการ</h3>
                    <div className="h-[300px]">
                        <Bar
                            data={drunkByDiv}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: {
                                        grid: { display: false }, // No Grid
                                        ticks: { color: '#94a3b8' }
                                    },
                                    x: {
                                        grid: { display: false },
                                        ticks: { color: '#94a3b8' }
                                    }
                                },
                                plugins: {
                                    datalabels: {
                                        color: 'white',
                                        anchor: 'end',
                                        align: 'top',
                                        font: { weight: 'bold' },
                                        formatter: (value) => value > 0 ? value : ''
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Chart 2: Time Analysis */}
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                    <h3 className="text-lg font-bold text-slate-300 mb-4">ช่วงเวลาที่พบผู้กระทำผิด (เมาแล้วขับ)</h3>
                    <div className="h-[300px]">
                        <Line
                            data={timeTrend}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: {
                                        grid: { display: false },
                                        ticks: { color: '#94a3b8' }
                                    },
                                    x: {
                                        grid: { display: false },
                                        ticks: { color: '#94a3b8', maxTicksLimit: 12 }
                                    }
                                },
                                plugins: {
                                    datalabels: {
                                        display: false // Too messy for line chart usually, or selective
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
