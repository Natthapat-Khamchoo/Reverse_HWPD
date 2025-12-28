import React from 'react';
import { Calendar } from 'lucide-react';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import { ORG_STRUCTURE } from '../../constants/config'; // ต้องมั่นใจว่ามีไฟล์นี้

export default function FilterSection({
  dateRangeOption, setDateRangeOption,
  customStart, setCustomStart,
  customEnd, setCustomEnd,
  filterDiv, setFilterDiv, setFilterSt,
  filterSt, stations,
  selectedCategories, setSelectedCategories,
  selectedRoads, setSelectedRoads,
  uniqueRoads
}) {
  return (
    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 mb-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end shadow-md animate-in slide-in-from-top-2 duration-300">
        <div className="col-span-2 md:col-span-1">
          <label className="text-[10px] text-yellow-400 font-bold mb-1 block uppercase tracking-wider"><Calendar size={10} className="inline mr-1"/> ช่วงเวลา</label>
          <select className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded outline-none" value={dateRangeOption} onChange={e => setDateRangeOption(e.target.value)}>
            <option value="today">วันนี้</option><option value="yesterday">เมื่อวาน</option><option value="last7">7 วันย้อนหลัง</option><option value="all">ทั้งหมด</option><option value="custom">กำหนดเอง</option>
          </select>
          {dateRangeOption === 'custom' && (<div className="flex gap-1 mt-1"><input type="date" className="w-1/2 bg-slate-900 border border-slate-600 text-white text-[10px] p-1 rounded" value={customStart} onChange={e => setCustomStart(e.target.value)} /><input type="date" className="w-1/2 bg-slate-900 border border-slate-600 text-white text-[10px] p-1 rounded" value={customEnd} onChange={e => setCustomEnd(e.target.value)} /></div>)}
        </div>
        <div className="col-span-1"><label className="text-[10px] text-slate-400 font-bold mb-1 block">กองกำกับการ</label><select className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded" value={filterDiv} onChange={e => { setFilterDiv(e.target.value); setFilterSt(''); }}><option value="">ทุก กก.</option>{Object.keys(ORG_STRUCTURE).map(k => <option key={k} value={k}>กก.{k}</option>)}</select></div>
        <div className="col-span-1"><label className="text-[10px] text-slate-400 font-bold mb-1 block">สถานี</label><select className="w-full bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded" value={filterSt} onChange={e => setFilterSt(e.target.value)} disabled={!filterDiv}><option value="">ทุกสถานี</option>{stations.map(s => <option key={s} value={s}>ส.ทล.{s}</option>)}</select></div>
        <div className="col-span-2 md:col-span-1.5 relative"><MultiSelectDropdown label="ประเภทเหตุการณ์" options={['อุบัติเหตุ', 'จับกุม', 'ว.43', 'ช่องทางพิเศษ', 'จราจรติดขัด']} selected={selectedCategories} onChange={setSelectedCategories} /></div>
        <div className="col-span-2 md:col-span-1.5 relative"><MultiSelectDropdown label="เส้นทาง" options={uniqueRoads} selected={selectedRoads} onChange={setSelectedRoads} /></div>
    </div>
  );
}