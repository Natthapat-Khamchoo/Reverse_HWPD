import React, { useState } from 'react';
import { Siren, AlertTriangle, MapPin, ArrowRightCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORY_COLORS } from '../../constants/config';

export default function LogTablesSection({ logData, accidentLogData }) {
  // State for toggling sections
  const [showClosedLanes, setShowClosedLanes] = useState(false);
  const [showLocationSummary, setShowLocationSummary] = useState(true); // Show by default

  // Enhanced processing for special lanes
  const openLanes = logData.filter(item => item.category === 'ช่องทางพิเศษ');
  const closedLanes = logData.filter(item => item.category === 'ปิดช่องทางพิเศษ');

  // Helper: Format duration in Thai
  const formatDuration = (minutes) => {
    if (!minutes || minutes < 0) return null;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0 && mins > 0) return `${hours} ชม. ${mins} นาที`;
    if (hours > 0) return `${hours} ชม.`;
    return `${mins} นาที`;
  };

  // Enhanced lanes with all features
  const enhancedLanes = openLanes.map(openLane => {
    const key = `${openLane.div}-${openLane.st}-${openLane.road}-${openLane.dir}`;

    // Feature 1 & 2: Find closest close event (handles multiple open/close cycles)
    const matchingCloses = closedLanes.filter(closeLane => {
      const closeKey = `${closeLane.div}-${closeLane.st}-${closeLane.road}-${closeLane.dir}`;
      return closeKey === key && closeLane.timestamp > openLane.timestamp;
    });

    const closestClose = matchingCloses.length > 0
      ? matchingCloses.reduce((closest, current) =>
        current.timestamp < closest.timestamp ? current : closest
      )
      : null;

    // Feature 1: Calculate duration
    const durationMinutes = closestClose
      ? (closestClose.timestamp - openLane.timestamp) / 1000 / 60
      : null;

    // Feature 2: Pattern detection
    const isStillActive = !closestClose; // Never closed
    const isOpenTooLong = durationMinutes && durationMinutes > 240; // >4 hours

    return {
      ...openLane,
      closeInfo: closestClose ? {
        time: closestClose.time,
        date: closestClose.date,
        timestamp: closestClose.timestamp
      } : null,
      duration: durationMinutes,
      durationText: formatDuration(durationMinutes),
      isStillActive,
      isOpenTooLong,
      locationKey: key
    };
  });

  // Feature 4: Usage statistics per location
  const usageStats = {};
  enhancedLanes.forEach(lane => {
    if (!usageStats[lane.locationKey]) {
      usageStats[lane.locationKey] = {
        openCount: 0,
        durations: [],
        location: `ทล.${lane.road} กม.${lane.km} ${lane.dir}`,
        road: lane.road,
        km: lane.km,
        dir: lane.dir,
        units: new Set() // Track unique units
      };
    }
    usageStats[lane.locationKey].openCount++;
    usageStats[lane.locationKey].units.add(`กก.${lane.div} ส.ทล.${lane.st}`);
    if (lane.duration) {
      usageStats[lane.locationKey].durations.push(lane.duration);
    }
  });

  // Calculate averages and convert Set to Array
  Object.keys(usageStats).forEach(key => {
    const stat = usageStats[key];
    stat.units = Array.from(stat.units); // Convert Set to Array
    if (stat.durations.length > 0) {
      stat.avgDuration = stat.durations.reduce((a, b) => a + b, 0) / stat.durations.length;
      stat.maxDuration = Math.max(...stat.durations);
    }
  });

  // Feature 3: Separate still active from closed
  const stillActiveLanes = enhancedLanes.filter(l => l.isStillActive);
  const closedActiveLanes = enhancedLanes.filter(l => !l.isStillActive);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
      {/* Left: General Log */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-md flex flex-col h-[400px] overflow-hidden">
        <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-700 flex justify-between items-center"><h3 className="text-white text-sm font-bold flex items-center gap-2"><Siren size={16} className="text-yellow-500" /> รายการเหตุการณ์ (Log)</h3><span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-600">แสดง {logData.length} รายการ</span></div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="uppercase bg-slate-900 text-slate-500 sticky top-0 z-10"><tr><th className="px-3 py-3 font-semibold">เวลา</th><th className="px-3 py-3 font-semibold">หน่วย</th><th className="px-3 py-3 font-semibold">ประเภท</th><th className="px-3 py-3 font-semibold">รายละเอียด</th></tr></thead>
            <tbody className="divide-y divide-slate-700/50">
              {logData.length > 0 ? logData.map((item, idx) => (
                <tr key={idx} className={`hover:bg-slate-700/30 transition-colors ${item.category.includes('ปิด') ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-3 align-top whitespace-nowrap"><div className="text-yellow-400 font-mono font-bold">{item.time} น.</div><div className="text-[10px] text-slate-500">{item.date}</div></td>
                  <td className="px-3 py-3 align-top whitespace-nowrap"><span className="bg-slate-900 border border-slate-600 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">กก.{item.div} ส.ทล.{item.st}</span></td>
                  <td className="px-3 py-3 align-top whitespace-nowrap"><span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: CATEGORY_COLORS[item.category] || '#64748b' }}>{item.category}</span></td>
                  <td className="px-3 py-3 align-top"><div className="line-clamp-2" title={item.detail}>{item.detail}</div><div className="text-[10px] text-slate-400 mt-1">ทล.{item.road} กม.{item.km} {item.dir}</div></td>
                </tr>
              )) : <tr><td colSpan="4" className="p-12 text-center text-slate-500">ไม่พบข้อมูล</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Middle: Special Lanes - Enhanced with Duration & Statistics */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-md flex flex-col h-[400px] overflow-hidden">
        <div className="px-4 py-3 bg-green-900/20 border-b border-green-900/50 flex justify-between items-center">
          <h3 className="text-green-200 text-sm font-bold flex items-center gap-2">
            <ArrowRightCircle size={16} className="text-green-500" /> ช่องทางพิเศษ (Enhanced)
          </h3>
          <span className="text-xs text-green-300 bg-green-900/30 px-2 py-1 rounded border border-green-800">
            Active {stillActiveLanes.length} / Total {enhancedLanes.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/30">
          {/* Still Active Lanes */}
          {stillActiveLanes.length > 0 && (
            <div className="mb-2">
              <div className="sticky top-0 z-10 px-3 py-2 bg-green-900/40 border-b border-green-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-green-300">🟢 ยังเปิดอยู่</span>
                  <span className="text-[10px] text-green-400 bg-green-900/50 px-1.5 py-0.5 rounded">
                    {stillActiveLanes.length} รายการ
                  </span>
                </div>
              </div>
              <table className="w-full text-xs text-left text-slate-300">
                <tbody className="divide-y divide-green-900/30">
                  {stillActiveLanes.map((lane, idx) => {
                    const stats = usageStats[lane.locationKey];
                    return (
                      <tr key={idx} className="hover:bg-green-900/20 transition-colors bg-green-950/20">
                        <td className="px-3 py-3 align-top whitespace-nowrap">
                          <div className="text-green-300 font-mono font-bold">{lane.time} น.</div>
                          <div className="text-[10px] text-slate-500">{lane.date}</div>
                        </td>
                        <td className="px-3 py-3 align-top whitespace-nowrap">
                          <span className="bg-slate-900 border border-green-700 text-green-200 px-1.5 py-0.5 rounded text-[10px]">
                            กก.{lane.div} ส.ทล.{lane.st}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="text-slate-200 font-bold flex items-start gap-1">
                            <MapPin size={12} className="mt-0.5 text-green-400 flex-shrink-0" />
                            <span>ทล.{lane.road} กม.{lane.km}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{lane.dir}</div>
                          {stats && stats.openCount > 1 && (
                            <div className="text-[9px] text-amber-400 mt-0.5">📍 จุดนี้เปิด {stats.openCount} ครั้ง</div>
                          )}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="text-slate-200 text-[11px] leading-relaxed line-clamp-2">{lane.detail}</div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-600 text-white shadow-sm">
                              🟢 เปิดอยู่
                            </span>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-amber-900/40 text-amber-300 border border-amber-700">
                              ⚠️ ยังไม่ปิด
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Closed Lanes (with duration) */}
          {closedActiveLanes.length > 0 && (
            <div className="border-t-2 border-slate-700">
              <button
                onClick={() => setShowClosedLanes(!showClosedLanes)}
                className="sticky top-0 z-10 w-full px-3 py-2 bg-slate-800/95 hover:bg-slate-700/95 border-b border-slate-600 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                  <span className="text-xs font-bold text-slate-400 group-hover:text-slate-300">
                    ✅ เปิดแล้ว-ปิดแล้ว
                  </span>
                  <span className="text-[10px] text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">
                    {closedActiveLanes.length} รายการ
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="group-hover:text-slate-400">{showClosedLanes ? 'ซ่อน' : 'แสดง'}</span>
                  {showClosedLanes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {showClosedLanes && (
                <table className="w-full text-xs text-left text-slate-300">
                  <tbody className="divide-y divide-slate-700/30">
                    {closedActiveLanes.map((lane, idx) => {
                      const stats = usageStats[lane.locationKey];
                      return (
                        <tr key={idx} className="hover:bg-slate-700/20 transition-colors opacity-75">
                          <td className="px-3 py-3 align-top whitespace-nowrap">
                            <div className="text-slate-400 font-mono font-bold">{lane.time} น.</div>
                            <div className="text-[10px] text-slate-600">{lane.date}</div>
                          </td>
                          <td className="px-3 py-3 align-top whitespace-nowrap">
                            <span className="bg-slate-900 border border-slate-600 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">
                              กก.{lane.div} ส.ทล.{lane.st}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="text-slate-400 font-bold flex items-start gap-1">
                              <MapPin size={12} className="mt-0.5 text-slate-500 flex-shrink-0" />
                              <span>ทล.{lane.road} กม.{lane.km}</span>
                            </div>
                            <div className="text-[10px] text-slate-500">{lane.dir}</div>
                            {stats && stats.openCount > 1 && (
                              <div className="text-[9px] text-slate-500 mt-0.5">📍 จุดนี้เปิด {stats.openCount} ครั้ง</div>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">{lane.detail}</div>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">
                                🔴 ปิดแล้ว {lane.closeInfo.time} น.
                              </span>
                              {lane.durationText && (
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${lane.isOpenTooLong
                                  ? 'bg-red-900/40 text-red-300 border border-red-700'
                                  : 'bg-blue-900/40 text-blue-300 border border-blue-700'
                                  }`}>
                                  {lane.isOpenTooLong && '⚠️ '} เปิด {lane.durationText}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Location Summary Section */}
          {Object.keys(usageStats).length > 0 && (
            <div className="border-t-2 border-slate-700">
              <button
                onClick={() => setShowLocationSummary(!showLocationSummary)}
                className="sticky top-0 z-10 w-full px-3 py-2 bg-indigo-900/20 hover:bg-indigo-900/30 border-b border-indigo-800/50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <span className="text-xs font-bold text-indigo-300 group-hover:text-indigo-200">
                    📊 สรุปตามจุดที่เคยเปิด
                  </span>
                  <span className="text-[10px] text-indigo-400 bg-indigo-900/50 px-1.5 py-0.5 rounded border border-indigo-700">
                    {Object.keys(usageStats).length} จุด
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-indigo-400">
                  <span className="group-hover:text-indigo-300">{showLocationSummary ? 'ซ่อน' : 'แสดง'}</span>
                  {showLocationSummary ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {showLocationSummary && (
                <div className="bg-indigo-950/10">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead className="uppercase bg-indigo-950/30 text-indigo-300 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-[10px]">สถานที่</th>
                        <th className="px-3 py-2 font-semibold text-[10px] text-center">จำนวนครั้ง</th>
                        <th className="px-3 py-2 font-semibold text-[10px]">หน่วยที่เปิด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-900/20">
                      {Object.entries(usageStats)
                        .sort((a, b) => b[1].openCount - a[1].openCount)
                        .map(([key, stat], idx) => (
                          <tr key={idx} className="hover:bg-indigo-900/10 transition-colors">
                            <td className="px-3 py-3 align-top">
                              <div className="flex items-start gap-1">
                                <MapPin size={12} className="mt-0.5 text-indigo-400 flex-shrink-0" />
                                <div>
                                  <div className="text-slate-200 font-bold">ทล.{stat.road} กม.{stat.km}</div>
                                  <div className="text-[10px] text-slate-400">{stat.dir}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top text-center">
                              <div className="inline-flex items-center gap-1 bg-indigo-900/40 border border-indigo-700 px-2 py-1 rounded">
                                <span className="text-lg font-bold text-indigo-200">{stat.openCount}</span>
                                <span className="text-[10px] text-indigo-400">ครั้ง</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="flex flex-wrap gap-1">
                                {stat.units.map((unit, unitIdx) => (
                                  <span key={unitIdx} className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 border border-slate-600">
                                    {unit}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {stillActiveLanes.length === 0 && closedActiveLanes.length === 0 && (
            <div className="p-12 text-center text-slate-500">ไม่มีช่องทางพิเศษในช่วงนี้</div>
          )}
        </div>
      </div>

      {/* Right: Accident Log */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-md flex flex-col h-[400px] overflow-hidden">
        <div className="px-4 py-3 bg-red-900/20 border-b border-red-900/50 flex justify-between items-center"><h3 className="text-red-200 text-sm font-bold flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> อุบัติเหตุ (ทุกหน่วยงาน)</h3><span className="text-xs text-red-300 bg-red-900/30 px-2 py-1 rounded border border-red-800">รวม {accidentLogData.length} รายการ</span></div>
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/30">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="uppercase bg-slate-900 text-slate-500 sticky top-0 z-10"><tr><th className="px-3 py-3 font-semibold w-[15%]">เวลา</th><th className="px-3 py-3 font-semibold w-[15%]">หน่วย</th><th className="px-3 py-3 font-semibold w-[25%]">จุดเกิดเหตุ</th><th className="px-3 py-3 font-semibold w-[45%]">รายละเอียด</th></tr></thead>
            <tbody className="divide-y divide-slate-700/50">
              {accidentLogData.length > 0 ? accidentLogData.map((item, idx) => (
                <tr key={idx} className="hover:bg-red-900/10 transition-colors">
                  <td className="px-3 py-3 align-top whitespace-nowrap"><div className="text-red-400 font-mono font-bold">{item.time} น.</div><div className="text-[10px] text-slate-500">{item.date}</div></td>
                  <td className="px-3 py-3 align-top whitespace-nowrap"><span className="bg-slate-900 border border-slate-600 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">กก.{item.div} ส.ทล.{item.st}</span></td>
                  <td className="px-3 py-3 align-top"><div className="text-slate-300 font-bold flex items-start gap-1"><MapPin size={12} className="mt-0.5 text-yellow-500 flex-shrink-0" /><span>ทล.{item.road}</span></div><div className="text-[10px] text-slate-400 pl-4">กม.{item.km} {item.dir}</div></td>
                  <td className="px-3 py-3 align-top"><div className="text-slate-200 whitespace-pre-wrap leading-relaxed">{item.detail}</div></td>
                </tr>
              )) : <tr><td colSpan="4" className="p-12 text-center text-slate-500">ไม่พบอุบัติเหตุในช่วงเวลานี้</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div >
  );
}