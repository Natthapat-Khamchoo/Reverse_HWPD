import React, { useState } from 'react';
import { Truck, AlertTriangle, Activity, Cone, Info } from 'lucide-react';
import CardDetailModal from './CardDetailModal'; // Ensure this matches filename
import CountUp from '../common/CountUp';

export default function StatCards({ stats }) {
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalItems, setModalItems] = useState([]);

  // Helper to open modal
  const openDetails = (title, items) => {
    setModalTitle(title);
    setModalItems(items || []);
    setShowModal(true);
  };

  const cards = [
    {
      title: 'จับกุมเมาแล้วขับ',
      value: (
        <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-600 group-hover:scale-110 group-hover:brightness-125 group-hover:drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all duration-300 ease-out inline-block origin-left">
          <CountUp end={stats.drunkCount || 0} />
        </span>
      ),
      icon: Truck,
      color: 'from-purple-500 to-indigo-600',
      textColor: 'text-purple-300',
      glow: 'shadow-purple-500/20',
      delay: '0ms',
      onClick: () => openDetails('รายชื่อจับกุมเมาแล้วขับ', stats?.details?.drunk)
    },
    {
      title: 'อุบัติเหตุ',
      value: (
        <div className="flex flex-col">
          <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-pink-600 group-hover:scale-110 group-hover:brightness-125 group-hover:drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-300 ease-out inline-block origin-left">
            <CountUp end={stats.accidentCount || 0} />
          </span>
          <div className="flex gap-2 text-[10px] text-slate-400 mt-1 font-mono">
            <span className="bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">กก.8: {stats?.details?.accidents?.div8?.length || 0}</span>
            <span className="bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">อื่นๆ: {stats?.details?.accidents?.others?.length || 0}</span>
          </div>
        </div>
      ),
      icon: AlertTriangle,
      color: 'from-red-500 to-pink-600',
      textColor: 'text-red-300',
      glow: 'shadow-red-500/20',
      delay: '100ms',
      onClick: () => openDetails('รายชื่ออุบัติเหตุ', stats?.details?.accidents?.all)
    },
    {
      title: 'ช่องทางพิเศษ',
      value: (
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600 relative group-hover:scale-110 group-hover:brightness-125 group-hover:drop-shadow-[0_0_15px_rgba(74,222,128,0.5)] transition-all duration-300 ease-out inline-block origin-left">
              <CountUp end={stats.activeLaneCount || 0} />
              {/* Pulse Ring for Active Status */}
              {stats.activeLaneCount > 0 && (
                <span className="absolute -top-1 -right-3 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              )}
            </span>
            <span className="text-xs text-green-500/80 font-bold uppercase tracking-wider">Active</span>
          </div>
          <div className="flex gap-2 text-[10px] text-slate-400 mt-1 font-mono">
            <span className="bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded border border-green-800/50">เปิดสะสม: {stats.openLaneCount || 0}</span>
            <span className="bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">ปิดแล้ว: {stats.closeLaneCount || 0}</span>
          </div>
        </div>
      ),
      icon: Activity,
      color: 'from-green-400 to-emerald-600',
      textColor: 'text-green-300',
      glow: 'shadow-green-500/20',
      delay: '200ms',
      // We might want to show Active lanes by default, or all? Let's show Open events logic
      onClick: () => openDetails('รายการช่องทางพิเศษ (เปิด)', stats?.details?.lanes?.open)
    },
    {
      title: 'รถมาก/ติดขัด',
      value: (
        <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 group-hover:scale-110 group-hover:brightness-125 group-hover:drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] transition-all duration-300 ease-out inline-block origin-left">
          <CountUp end={stats.trafficCount || 0} />
        </span>
      ),
      icon: Cone,
      color: 'from-yellow-400 to-orange-500',
      textColor: 'text-yellow-300',
      glow: 'shadow-yellow-500/20',
      delay: '300ms',
      onClick: () => openDetails('จุดจราจรติดขัด/รถมาก', stats?.details?.traffic)
    }
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              onClick={card.onClick}
              className={`glass-panel p-5 rounded-2xl relative overflow-hidden group hover-lift-glow cursor-pointer ${card.glow}`}
              style={{ animationDelay: card.delay }}
            >

              {/* Background Glow Blob */}
              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-2xl bg-gradient-to-br ${card.color} group-hover:opacity-20 transition-opacity duration-500`}></div>

              <div className="flex items-start justify-between relative z-10 h-full">
                <div className="flex flex-col justify-between h-full">
                  <p className="text-slate-400 text-sm font-medium mb-1 flex items-center gap-1">
                    {card.title}
                    <Info size={10} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                  </p>

                  {/* Value Rendering (Text or Component) */}
                  {typeof card.value === 'object' ? card.value : (
                    <h3 className={`text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${card.color} drop-shadow-sm`}>
                      {card.value}
                    </h3>
                  )}
                </div>

                <div className={`p-3 rounded-xl bg-slate-800/50 border border-white/5 group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
                  <Icon size={24} className={`${card.textColor}`} />
                </div>
              </div>

              {/* Bottom Line Indicator */}
              <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${card.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <CardDetailModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={modalTitle}
        items={modalItems}
        onCopy={(text) => navigator.clipboard.writeText(text)}
      />
    </>
  );
}