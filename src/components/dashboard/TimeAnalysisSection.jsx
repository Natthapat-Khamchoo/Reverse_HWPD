import React, { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';
import { ChevronDown, ChevronUp, Clock, Calendar } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function TimeAnalysisSection({ rawData, filterStartDate, filterEndDate }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter data strictly by global date filter first (if provided)
  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      if (filterStartDate && filterEndDate) {
        return item.date >= filterStartDate && item.date <= filterEndDate;
      }
      return true;
    });
  }, [rawData, filterStartDate, filterEndDate]);

  // Process Data for Hourly Distribution (00 - 23)
  const hourlyData = useMemo(() => {
    const hours = Array(24).fill(0).map((_, i) => i);
    const accidentCounts = Array(24).fill(0);
    const trafficCounts = Array(24).fill(0);

    filteredData.forEach(item => {
      if (!item.time) return;
      const [hStr] = item.time.split(':');
      const hour = parseInt(hStr, 10);

      if (isNaN(hour) || hour < 0 || hour > 23) return;

      if (item.category === 'อุบัติเหตุ') {
        accidentCounts[hour]++;
      } else if (['จราจรติดขัด', 'รถมากเคลื่อนตัวได้ช้า'].some(k => item.category.includes(k) || (item.detail && item.detail.includes(k)))) {
        trafficCounts[hour]++;
      }
    });

    return {
      labels: hours.map(h => `${h.toString().padStart(2, '0')}:00`),
      datasets: [
        {
          label: 'อุบัติเหตุ',
          data: accidentCounts,
          backgroundColor: 'rgba(239, 68, 68, 0.7)', // Red-500
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
        },
        {
          label: 'จราจรติดขัด/รถมาก',
          data: trafficCounts,
          backgroundColor: 'rgba(234, 179, 8, 0.7)', // Yellow-500
          borderColor: 'rgba(234, 179, 8, 1)',
          borderWidth: 1,
        }
      ]
    };
  }, [filteredData]);

  // Process Data for Weekly Distribution (Sun - Sat)
  const weeklyData = useMemo(() => {
    const daysTh = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

    // JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat
    const accidentCounts = Array(7).fill(0);
    const trafficCounts = Array(7).fill(0);

    filteredData.forEach(item => {
      if (!item.date) return;
      const dateObj = new Date(item.date);
      const dayIdx = dateObj.getDay(); // 0 = Sun

      if (isNaN(dayIdx)) return;

      if (item.category === 'อุบัติเหตุ') {
        accidentCounts[dayIdx]++;
      } else if (['จราจรติดขัด', 'รถมากเคลื่อนตัวได้ช้า'].some(k => item.category.includes(k) || (item.detail && item.detail.includes(k)))) {
        trafficCounts[dayIdx]++;
      }
    });

    return {
      labels: daysTh,
      datasets: [
        {
          label: 'อุบัติเหตุ',
          data: accidentCounts,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
        },
        {
          label: 'จราจรติดขัด/รถมาก',
          data: trafficCounts,
          backgroundColor: 'rgba(234, 179, 8, 0.7)',
          borderColor: 'rgba(234, 179, 8, 1)',
          borderWidth: 1,
        }
      ]
    };
  }, [filteredData]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#cbd5e1' } },
      title: { display: false },
    },
    scales: {
      y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
      x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
    }
  };

  return (
    <div className="mb-6 animate-fade-in" id="time-analysis-section">
      {/* Header Toggle Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between bg-slate-800 p-4 rounded-lg border border-slate-700 hover:bg-slate-750 transition-colors mb-2"
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-600/20 p-2 rounded-lg text-blue-400">
            <Clock size={24} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-slate-200">วิเคราะห์ช่วงเวลาและวัน (Time Analysis)</h3>
            <p className="text-xs text-slate-400">กราฟสถิติตามช่วงเวลาของวันและวันในสัปดาห์ (คลิกเพื่อแสดง/ซ่อน)</p>
          </div>
        </div>
        <div className="text-slate-400">
          {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </div>
      </button>

      {/* Chart Content (Collapsible) */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
          {/* Hourly Chart */}
          <div className="bg-slate-800 rounded-lg p-4 shadow-lg border border-slate-700 hover-lift-glow">
            <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-yellow-400" /> สถิติตามช่วงเวลา (Hourly)
            </h3>
            <div className="h-64">
              <Bar data={hourlyData} options={options} />
            </div>
          </div>

          {/* Weekly Chart */}
          <div className="bg-slate-800 rounded-lg p-4 shadow-lg border border-slate-700 hover-lift-glow">
            <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-green-400" /> สถิติตามวันในสัปดาห์ (Weekly)
            </h3>
            <div className="h-64">
              <Bar data={weeklyData} options={options} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
