import React from 'react';
import { ClipboardCopy, X, Copy, CheckCircle, Loader2 } from 'lucide-react';

export default function ReportModal({ show, onClose, isGenerating, reportText, onCopy, copySuccess, direction }) {
  if (isGenerating) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
         <div className="bg-slate-800 p-6 rounded-xl border border-slate-600 shadow-2xl flex flex-col items-center gap-4">
            <Loader2 size={48} className="text-yellow-400 animate-spin" />
            <div className="text-center"><h3 className="text-white font-bold text-lg">กำลังประมวลผลรายงาน...</h3><p className="text-slate-400 text-sm">ตรวจสอบ: {direction === 'outbound' ? 'ขาออก (จาก กทม.)' : 'ขาเข้า (เข้า กทม.)'}</p><p className="text-slate-500 text-xs mt-1">อาจใช้เวลา 5-10 วินาที</p></div>
         </div>
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-800 w-full max-w-lg rounded-xl border border-slate-600 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-white font-bold flex items-center gap-2"><ClipboardCopy className="text-yellow-400" size={20}/> รายงานพร้อมคัดลอก {direction === 'outbound' ? '(ขาออก)' : '(ขาเข้า)'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1"><X size={24}/></button>
        </div>
        <div className="p-4 flex-1"><textarea className="w-full h-[300px] bg-slate-950 text-slate-300 p-3 rounded-lg text-xs font-mono border border-slate-700 focus:outline-none resize-none" value={reportText} readOnly /></div>
        <div className="p-4 bg-slate-900 border-t border-slate-700">
          <button onClick={onCopy} className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${copySuccess ? "bg-green-600 text-white hover:bg-green-500" : "bg-yellow-500 text-slate-900 hover:bg-yellow-400"}`}>
            {copySuccess ? <CheckCircle size={20}/> : <Copy size={20}/>} {copySuccess ? "คัดลอกสำเร็จแล้ว!" : "แตะเพื่อคัดลอกข้อความ"}
          </button>
        </div>
      </div>
    </div>
  );
}