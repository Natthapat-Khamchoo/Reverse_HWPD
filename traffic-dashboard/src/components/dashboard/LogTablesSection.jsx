import React, { useState } from 'react';
import { Siren, AlertTriangle, MapPin, ArrowRightCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORY_COLORS } from '../../constants/config';

export default function LogTablesSection({ logData, accidentLogData }) {
  // State for toggling closed lanes
  const [showClosedLanes, setShowClosedLanes] = useState(false);

  // Filter and separate special lanes data
  const activeLanes = logData.filter(item => item.category === 'ช่องทางพิเศษ');
  const closedLanes = logData.filter(item => item.category === 'ปิดช่องทางพิเศษ');

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

      {/* Middle: Special Lanes - Grouped by Status */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-md flex flex-col h-[400px] overflow-hidden">
        <div className="px-4 py-3 bg-green-900/20 border-b border-green-900/50 flex justify-between items-center">
          <h3 className="text-green-200 text-sm font-bold flex items-center gap-2">
            <ArrowRightCircle size={16} className="text-green-500" /> ช่องทางพิเศษ
          </h3>
          <span className="text-xs text-green-300 bg-green-900/30 px-2 py-1 rounded border border-green-800">
            เปิด {activeLanes.length} / ปิด {closedLanes.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/30">
          {/* Active Lanes Section */}
          {activeLanes.length > 0 && (
            <div className="mb-2">
              <div className="sticky top-0 z-10 px-3 py-2 bg-green-900/40 border-b border-green-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-green-300">🟢 ช่องทางที่เปิดอยู่</span>
                  <span className="text-[10px] text-green-400 bg-green-900/50 px-1.5 py-0.5 rounded">
                    {activeLanes.length} รายการ
                  </span>
                </div>
              </div>
              <table className="w-full text-xs text-left text-slate-300">
                <tbody className="divide-y divide-green-900/30">
                  {activeLanes.map((item, idx) => (
                    <tr key={idx} className="hover:bg-green-900/20 transition-colors bg-green-950/20">
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        <div className="text-green-300 font-mono font-bold">{item.time} น.</div>
                        <div className="text-[10px] text-slate-500">{item.date}</div>
                      </td>
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        <span className="bg-slate-900 border border-green-700 text-green-200 px-1.5 py-0.5 rounded text-[10px]">
                          กก.{item.div} ส.ทล.{item.st}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="text-slate-200 font-bold flex items-start gap-1">
                          <MapPin size={12} className="mt-0.5 text-green-400 flex-shrink-0" />
                          <span>ทล.{item.road}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 pl-4">กม.{item.km} {item.dir}</div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="text-slate-200 whitespace-pre-wrap leading-relaxed">{item.detail}</div>
                        <div className="mt-1">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-600 text-white shadow-sm">
                            🟢 เปิด
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Closed Lanes Section */}
          {closedLanes.length > 0 && (
            <div className="border-t-2 border-slate-700">
              <button
                onClick={() => setShowClosedLanes(!showClosedLanes)}
                className="sticky top-0 z-10 w-full px-3 py-2 bg-slate-800/95 hover:bg-slate-700/95 border-b border-slate-600 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                  <span className="text-xs font-bold text-slate-400 group-hover:text-slate-300">
                    🔴 ช่องทางที่ปิดแล้ว
                  </span>
                  <span className="text-[10px] text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">
                    {closedLanes.length} รายการ
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
                    {closedLanes.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-700/20 transition-colors opacity-60">
                        <td className="px-3 py-3 align-top whitespace-nowrap">
                          <div className="text-slate-400 font-mono font-bold">{item.time} น.</div>
                          <div className="text-[10px] text-slate-600">{item.date}</div>
                        </td>
                        <td className="px-3 py-3 align-top whitespace-nowrap">
                          <span className="bg-slate-900 border border-slate-600 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">
                            กก.{item.div} ส.ทล.{item.st}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="text-slate-400 font-bold flex items-start gap-1">
                            <MapPin size={12} className="mt-0.5 text-slate-500 flex-shrink-0" />
                            <span>ทล.{item.road}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 pl-4">กม.{item.km} {item.dir}</div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="text-slate-400 whitespace-pre-wrap leading-relaxed">{item.detail}</div>
                          <div className="mt-1">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-700/60 text-slate-300">
                              🔴 ปิด
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Empty State */}
          {activeLanes.length === 0 && closedLanes.length === 0 && (
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
    </div>
  );
}