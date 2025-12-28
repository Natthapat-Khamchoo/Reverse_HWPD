import React from 'react';
import { ListChecks, CarFront, Wine, ArrowRightCircle, StopCircle } from 'lucide-react';
import KPI_Card from '../common/KPICard';

export default function StatCards({ visualData, stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
      <KPI_Card title="เหตุการณ์ทั้งหมด" value={visualData.length} subtext="รวมทุกประเภท" icon={ListChecks} accentColor="bg-slate-200" />
      <KPI_Card title="อุบัติเหตุ" value={visualData.filter(d => d.category === 'อุบัติเหตุ').length} subtext="รวมทั้งหมด" icon={CarFront} accentColor="bg-red-500" />
      <KPI_Card title="จับกุมเมาแล้วขับ" value={stats.drunkCount} subtext="คดีเมาสุรา (ทุกหน่วย)" icon={Wine} accentColor="bg-purple-500" />
      <KPI_Card title="ช่องทางพิเศษ (คงเหลือ)" value={stats.activeLaneCount} subtext={`เปิด ${stats.openLaneCount} / ปิด ${stats.closeLaneCount}`} icon={ArrowRightCircle} accentColor={stats.activeLaneCount > 0 ? "bg-green-500 animate-pulse" : "bg-slate-500"} />
      <KPI_Card title="ปิดช่องทางพิเศษ" value={stats.closeLaneCount} subtext="ยอดปิด (ครั้ง)" icon={StopCircle} accentColor="bg-slate-600" />
    </div>
  );
}