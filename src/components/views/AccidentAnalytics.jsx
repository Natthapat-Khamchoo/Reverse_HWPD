import React, { useMemo } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { AlertTriangle, MapPin } from 'lucide-react';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, ChartDataLabels);

// Change Font Default
ChartJS.defaults.font.family = "'Sarabun', 'Prompt', sans-serif";

export default function AccidentAnalytics({ rawData, dateFilter, filters = {} }) {
    // Filter Data
    const accidentData = useMemo(() => {
        return rawData.filter(d => {
            const isAccident = d.category === 'อุบัติเหตุ' || d.reportFormat === 'SAFETY';

            // 1. Date Check
            let passDate = true;
            if (dateFilter.start && dateFilter.end) {
                passDate = d.date >= dateFilter.start && d.date <= dateFilter.end;
            }

            // 2. Additional Filters (Div, St, Road)
            const passDiv = !filters.div || d.div === filters.div;
            const passSt = !filters.st || d.st === filters.st;
            const passRoad = !filters.roads || filters.roads.length === 0 || filters.roads.includes(d.road);

            return isAccident && passDate && passDiv && passSt && passRoad;
        });
    }, [rawData, dateFilter, filters]);

    // 1. Cause Analysis (Pie Chart)
    const causeData = useMemo(() => {
        const causes = {};
        accidentData.forEach(d => {
            let c = d.cause || 'ไม่ระบุ';
            // Clean up common variations
            if (c.includes('หลับใน')) c = 'หลับใน';
            if (c.includes('เร็ว')) c = 'ขับรถเร็ว';
            if (c.includes('ตัดหน้า')) c = 'ตัดหน้ากระชั้นชิด';
            if (c.includes('ยาง')) c = 'ยางระเบิด/ล้อหลุด';

            causes[c] = (causes[c] || 0) + 1;
        });

        // Sort and Top 5
        const sorted = Object.entries(causes).sort((a, b) => b[1] - a[1]);
        const topCauses = sorted.slice(0, 6);
        const otherCount = sorted.slice(6).reduce((sum, item) => sum + item[1], 0);
        if (otherCount > 0) topCauses.push(['อื่นๆ', otherCount]);

        return {
            labels: topCauses.map(x => x[0]),
            datasets: [{
                data: topCauses.map(x => x[1]),
                backgroundColor: [
                    '#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899', '#94a3b8'
                ],
                borderWidth: 0
            }]
        };
    }, [accidentData]);

    // 2. Dangerous Roads (Bar Chart)
    const roadData = useMemo(() => {
        const roads = {};
        accidentData.forEach(d => {
            let r = d.road;
            if (r === 'ไม่ระบุ') return;
            roads[r] = (roads[r] || 0) + 1;
        });

        const sorted = Object.entries(roads).sort((a, b) => b[1] - a[1]).slice(0, 10);

        return {
            labels: sorted.map(x => `ทล.${x[0]}`),
            datasets: [{
                label: 'จำนวนอุบัติเหตุ',
                data: sorted.map(x => x[1]),
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderRadius: 4
            }]
        };
    }, [accidentData]);

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                    <AlertTriangle size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">วิเคราะห์อุบัติเหตุ (Accident Analytics)</h2>
                    <p className="text-slate-400 text-sm">เจาะลึกสาเหตุและพื้นที่เสี่ยงเพื่อการป้องกัน</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cause Chart */}
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-slate-200 mb-6 text-center">สาเหตุหลัก (Top Causes)</h3>
                    <div className="h-[300px] flex justify-center">
                        <Doughnut
                            data={causeData}
                            options={{
                                plugins: {
                                    legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { size: 12 } } },
                                    datalabels: {
                                        color: 'white',
                                        font: { weight: 'bold' },
                                        formatter: (value) => value > 0 ? value : ''
                                    }
                                },
                                maintainAspectRatio: false
                            }}
                        />
                    </div>
                </div>

                {/* Road Ranking */}
                <div className="lg:col-span-2 bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
                        <MapPin size={20} className="text-red-400" />
                        10 อันดับถนนอันตราย (Top Risk Roads)
                    </h3>
                    <div className="h-[300px]">
                        <Bar
                            data={roadData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                indexAxis: 'y',
                                scales: {
                                    x: {
                                        grid: { display: false }, // No Grid
                                        ticks: { display: false } // No specific ticks needed if labels are on bars
                                    },
                                    y: {
                                        grid: { display: false },
                                        ticks: { color: '#cbd5e1', font: { weight: 'bold' } }
                                    }
                                },
                                plugins: {
                                    legend: { display: false },
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

            {/* Detailed Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'มอเตอร์เวย์ M6', road: 'M6', color: 'text-orange-400' },
                    { label: 'มอเตอร์เวย์ M7', road: '7', color: 'text-blue-400' },
                    { label: 'มอเตอร์เวย์ M9', road: '9', color: 'text-yellow-400' },
                    { label: 'มอเตอร์เวย์ M81', road: 'M81', color: 'text-purple-400' },
                ].map(item => (
                    <div key={item.road} className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-xl border border-slate-700 transition-all hover:scale-105 hover:shadow-lg">
                        <div className="text-slate-400 text-sm">{item.label}</div>
                        <div className={`text-3xl font-bold mt-1 ${item.color}`}>
                            {accidentData.filter(d => d.road === item.road).length}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
