import React from 'react';
import { Loader2 } from 'lucide-react';

export default function SystemLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={48} className="animate-spin text-yellow-400" />
        <div className="text-lg font-bold">กำลังโหลดข้อมูล...</div>
      </div>
    </div>
  );
}