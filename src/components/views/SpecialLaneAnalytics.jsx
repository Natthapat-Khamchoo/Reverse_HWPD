import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Zap, Clock, TrendingUp } from 'lucide-react';
import { calculateSpecialLaneStats } from '../../utils/dataProcessor';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

export default function SpecialLaneAnalytics({ rawData, dateFilter, filters = {} }) {
    // Pre-process special lane specific data logic
    const stats = useMemo(() => {
        // 1. Filter by Date first
        const filteredLog = rawData.filter(item => {
            let passDate = true;
            if (dateFilter.start && dateFilter.end) {
                passDate = item.date >= dateFilter.start && item.date <= dateFilter.end;
            }

            // 2. Filters
            const passDiv = !filters.div || item.div === filters.div;
            const passSt = !filters.st || item.st === filters.st;
            const passRoad = !filters.roads || filters.roads.length === 0 || filters.roads.includes(item.road);

            return passDate && (item.category === 'ช่องทางพิเศษ' || item.category === 'ปิดช่องทางพิเศษ') && passDiv && passSt && passRoad;
        });

        // 2. Run standard calculation
        return calculateSpecialLaneStats(filteredLog);
    }, [rawData, dateFilter, filters]);

    // Chart: Openings by Division on selected Period
    const divChartData = useMemo(() => {
        const divs = ["1", "2", "3", "4", "5", "6", "7", "8"];
        const counts = divs.map(div => {
            return stats.allEnhancedLanes.filter(l => l.div === div).length;
        });

        return {
            labels: divs.map(d => `กก.${d}`),
            datasets: [{
                label: 'จำนวนการเปิด (ครั้ง)',
                data: counts,
                backgroundColor: '#22c55e', // Green-500
                borderRadius: 6
            }]
        };
    }, [stats]);

    // Chart: Average Duration by Road (Top 5 Active Roads)
    // This helps identify which roads keep lanes open the longest
    const durationChartData = useMemo(() => {
        const roads = {};
        const roadCounts = {};

        stats.allEnhancedLanes.forEach(l => {
            if (l.road === 'ไม่ระบุ' || !l.duration) return;
            const r = l.road;
            roads[r] = (roads[r] || 0) + l.duration;
            roadCounts[r] = (roadCounts[r] || 0) + 1;
        });

        // Calc Average
        const avgData = [];
        Object.keys(roads).forEach(r => {
            avgData.push({ road: r, avg: roads[r] / roadCounts[r] });
        });

        // Sort Top 5 Longest
        avgData.sort((a, b) => b.avg - a.avg);
        const top5 = avgData.slice(0, 5);

        return {
            labels: top5.map(x => `ทล.${x.road}`),
            datasets: [{
                label: 'ระยะเวลาเปิดเฉลี่ย (นาที)',
                data: top5.map(x => Math.round(x.avg)),
                backgroundColor: '#eab308', // Yellow-500
                borderRadius: 6
            }]
        };
    }, [stats]);


    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-500/10 rounded-xl text-green-400">
                    <Zap size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">ช่องทางพิเศษ (Special Lane Analytics)</h2>
                    <p className="text-slate-400 text-sm">วิเคราะห์ประสิทธิภาพการระบายรถ และระยะเวลาการเปิดช่องทางพิเศษ</p>
                </div>
            </div>

            {/* Big Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                    <div className="flex flex-col">
                        <span className="text-slate-400 text-sm font-medium">เปิดใช้งานอยู่ (ขณะนี้)</span>
                        <span className="text-5xl font-bold text-green-400 mt-2">{stats.activeCount} <span className="text-lg text-slate-500">จุด</span></span>
                    </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                    <div className="flex flex-col">
                        <span className="text-slate-400 text-sm font-medium">จำนวนเปิดรวม (ช่วงเวลาที่เลือก)</span>
                        <span className="text-5xl font-bold text-blue-400 mt-2">{stats.openCount} <span className="text-lg text-slate-500">ครั้ง</span></span>
                    </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                    <div className="flex flex-col">
                        <span className="text-slate-400 text-sm font-medium">การปิดช่องทาง</span>
                        <span className="text-5xl font-bold text-slate-400 mt-2">{stats.closeCount} <span className="text-lg text-slate-500">ครั้ง</span></span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Openings by Division */}
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                    <h3 className="text-lg font-bold text-slate-300 mb-4">จำนวนการเปิด แยกตามกองกำกับการ</h3>
                    <div className="h-[300px]">
                        <Bar
                            data={divChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: { display: false },
                                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
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

                {/* Chart 2: Duration Top 5 */}
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                    <h3 className="text-lg font-bold text-slate-300 mb-4">ถนนที่เปิดนานที่สุด (เฉลี่ยนาที/ครั้ง)</h3>
                    <div className="h-[300px]">
                        <Bar
                            data={durationChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                indexAxis: 'y',
                                scales: {
                                    y: { display: true, grid: { display: false }, ticks: { color: '#cbd5e1' } },
                                    x: { display: false }
                                },
                                plugins: {
                                    datalabels: {
                                        color: 'white',
                                        anchor: 'end',
                                        align: 'end',
                                        font: { weight: 'bold' },
                                        formatter: (value) => value > 0 ? value : ''
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
