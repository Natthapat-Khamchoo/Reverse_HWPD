import React from 'react';
import { Siren, Server } from 'lucide-react';

const SystemLoader = () => (
  <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center font-mono">
    <div className="relative">
      <div className="absolute inset-0 border-4 border-slate-800 rounded-full animate-ping opacity-20"></div>
      <div className="w-24 h-24 border-t-4 border-r-4 border-yellow-500 rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Siren className="text-yellow-500 animate-pulse" size={32} />
      </div>
    </div>
    
    <div className="mt-8 text-center space-y-2">
      <h2 className="text-xl font-bold text-white tracking-[0.1em] animate-pulse">
        กำลังเริ่มต้นระบบปฏิบัติการ
      </h2>
      <div className="flex items-center justify-center gap-2 text-xs text-green-500">
        <Server size={12} />
        <span>กำลังเชื่อมต่อฐานข้อมูลตำรวจทางหลวง...</span>
      </div>
      <div className="flex gap-1 justify-center mt-4">
        <div className="w-1 h-4 bg-yellow-600 animate-[pulse_1s_ease-in-out_infinite]"></div>
        <div className="w-1 h-4 bg-yellow-500 animate-[pulse_1s_ease-in-out_0.2s_infinite]"></div>
        <div className="w-1 h-4 bg-yellow-400 animate-[pulse_1s_ease-in-out_0.4s_infinite]"></div>
      </div>
    </div>
  </div>
);

export default SystemLoader;