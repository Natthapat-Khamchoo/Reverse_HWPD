import React, { useMemo } from 'react';
import { Calendar, Filter, MapPin, AlertCircle, List } from 'lucide-react';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import GroupedMultiSelect from '../common/GroupedMultiSelect';
import CustomSelect from '../common/CustomSelect';
import { ORG_STRUCTURE } from '../../constants/config';
import { TRAFFIC_DATA } from '../../constants/traffic_nodes';

export default function FilterSection({
  dateRangeOption, setDateRangeOption,
  customStart, setCustomStart,
  customEnd, setCustomEnd,
  filterDiv, setFilterDiv, setFilterSt,
  filterSt, stations,
  selectedCategories, setSelectedCategories,
  selectedRoads, setSelectedRoads,
  uniqueRoads // Fallback if needed, but we will use TRAFFIC_DATA
}) {

  const inputClass = "w-full bg-slate-900/50 border border-white/10 text-white text-xs p-2.5 rounded-lg outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm hover:bg-slate-800/80";
  const labelClass = "text-[10px] font-bold mb-1.5 block uppercase tracking-wider flex items-center gap-1.5";

  // Prepare Groups for Routes
  const roadGroups = useMemo(() => {
    return TRAFFIC_DATA.map(region => ({
      label: region.region,
      options: region.roads.map(road => ({
        label: road.name,
        value: road.name // We use name as the key in logic currently
      }))
    }));
  }, []);

  return (
    <div className="glass-panel p-5 rounded-2xl mb-6 flex flex-col gap-4 animate-fade-in-up relative z-50" style={{ animationDelay: '100ms' }}>

      {/* Row 1: Primary Filters (Date, Div, St) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-40">

        {/* Date Filter (Spans 2 cols) */}
        <div className="md:col-span-2">
          <CustomSelect
            label={
              <span className={`${labelClass} text-yellow-400`}>
                <Calendar size={12} /> ช่วงเวลา
              </span>
            }
            value={dateRangeOption}
            onChange={setDateRangeOption}
            options={[
              { value: 'today', label: '📅 วันนี้' },
              { value: 'yesterday', label: '⏪ เมื่อวาน' },
              { value: 'last7', label: '🗓️ 7 วันย้อนหลัง' },
              { value: 'all', label: '♾️ ทั้งหมด' },
              { value: 'custom', label: '✏️ กำหนดเอง' }
            ]}
          />

          {dateRangeOption === 'custom' && (
            <div className="flex gap-2 mt-2 animate-in slide-in-from-left-1 fade-in duration-200">
              <input type="date" className={inputClass} value={customStart} onChange={e => setCustomStart(e.target.value)} />
              <input type="date" className={inputClass} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </div>
          )}
        </div>

        {/* Division Filter */}
        <div className="md:col-span-1">
          <CustomSelect
            label={
              <span className={`${labelClass} text-blue-400`}>
                <MapPin size={12} /> กองกำกับการ
              </span>
            }
            value={filterDiv}
            onChange={(val) => { setFilterDiv(val); setFilterSt(''); }}
            options={[
              { value: '', label: '🏢 ทุก กก.' },
              ...Object.keys(ORG_STRUCTURE).map(k => ({ value: k, label: `กก.${k}` }))
            ]}
          />
        </div>

        {/* Station Filter */}
        <div className="md:col-span-1">
          <CustomSelect
            label={
              <span className={`${labelClass} text-cyan-400`}>
                <MapPin size={12} /> สถานี
              </span>
            }
            value={filterSt}
            onChange={setFilterSt}
            disabled={!filterDiv}
            options={[
              { value: '', label: '🏠 ทุกสถานี' },
              ...stations.map(s => ({ value: s, label: `ส.ทล.${s}` }))
            ]}
          />
        </div>
      </div>

      {/* Row 2: Secondary Content Filters (Category, Road) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-2 relative z-30">

        {/* Category Filter */}
        <div className="relative z-20">
          <label className={`${labelClass} text-red-400`}>
            <AlertCircle size={12} /> ประเภทเหตุการณ์
          </label>
          <MultiSelectDropdown
            options={['อุบัติเหตุ', 'จับกุม', 'ว.43', 'ช่องทางพิเศษ', 'จราจรติดขัด']}
            selected={selectedCategories}
            onChange={setSelectedCategories}
            placeholder="เลือกประเภท..."
          />
        </div>

        {/* Road Filter (Grouped) */}
        <div className="relative z-10">
          <label className={`${labelClass} text-emerald-400`}>
            <List size={12} /> เส้นทางตามภาค
          </label>
          <GroupedMultiSelect
            groups={roadGroups}
            selected={selectedRoads}
            onChange={setSelectedRoads}
            placeholder="เลือกเส้นทาง..."
          />
        </div>
      </div>

    </div>
  );
}