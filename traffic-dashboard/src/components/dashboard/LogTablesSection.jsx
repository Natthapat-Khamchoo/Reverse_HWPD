import React from 'react';
import { Siren, AlertTriangle, MapPin } from 'lucide-react';
import { CATEGORY_COLORS } from '../../constants/config';

export default function LogTablesSection({ logData, accidentLogData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      {/* Left: General Log */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-md flex flex-col h-[400px] overflow-hidden">
           <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-700 flex justify-between items-center"><h3 className="text-white text-sm font-bold flex items-center gap-2"><Siren size={16} className="text-yellow-500"/> รายการเหตุการณ์ (Log)</h3><span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-600">แสดง {logData.length} รายการ</span></div>
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
      {/* Right: Accident Log */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-md flex flex-col h-[400px] overflow-hidden">
           <div className="px-4 py-3 bg-red-900/20 border-b border-red-900/50 flex justify-between items-center"><h3 className="text-red-200 text-sm font-bold flex items-center gap-2"><AlertTriangle size={16} className="text-red-500"/> อุบัติเหตุ (ทุกหน่วยงาน)</h3><span className="text-xs text-red-300 bg-red-900/30 px-2 py-1 rounded border border-red-800">รวม {accidentLogData.length} รายการ</span></div>
           <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/30">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="uppercase bg-slate-900 text-slate-500 sticky top-0 z-10"><tr><th className="px-3 py-3 font-semibold w-[15%]">เวลา</th><th className="px-3 py-3 font-semibold w-[15%]">หน่วย</th><th className="px-3 py-3 font-semibold w-[25%]">จุดเกิดเหตุ</th><th className="px-3 py-3 font-semibold w-[45%]">รายละเอียด</th></tr></thead>
                <tbody className="divide-y divide-slate-700/50">
                  {accidentLogData.length > 0 ? accidentLogData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-red-900/10 transition-colors">
                      <td className="px-3 py-3 align-top whitespace-nowrap"><div className="text-red-400 font-mono font-bold">{item.time} น.</div><div className="text-[10px] text-slate-500">{item.date}</div></td>
                      <td className="px-3 py-3 align-top whitespace-nowrap"><span className="bg-slate-900 border border-slate-600 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">กก.{item.div} ส.ทล.{item.st}</span></td>
                      <td className="px-3 py-3 align-top"><div className="text-slate-300 font-bold flex items-start gap-1"><MapPin size={12} className="mt-0.5 text-yellow-500 flex-shrink-0"/><span>ทล.{item.road}</span></div><div className="text-[10px] text-slate-400 pl-4">กม.{item.km} {item.dir}</div></td>
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