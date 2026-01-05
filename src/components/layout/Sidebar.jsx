import React from 'react';
import { LayoutDashboard, AlertTriangle, ShieldAlert, Zap, Menu, X, ChevronRight } from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen, currentView, setCurrentView }) {
    const menuItems = [
        { id: 'dashboard', label: 'ภาพรวม (Overview)', icon: <LayoutDashboard size={20} /> },
        { id: 'accident', label: 'วิเคราะห์อุบัติเหตุ', icon: <AlertTriangle size={20} /> },
        { id: 'enforcement', label: 'ผลการจับกุม & วินัย', icon: <ShieldAlert size={20} /> },
        { id: 'special_lane', label: 'ช่องทางพิเศษ', icon: <Zap size={20} /> },
    ];

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg shadow-lg border border-slate-700 md:hidden hover:bg-slate-700 transition"
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar Container */}
            <div className={`fixed top-0 left-0 h-full bg-slate-900 border-r border-slate-800 shadow-2xl z-40 transition-all duration-300 ease-in-out 
                ${isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0 md:w-20'}
            `}>
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
                    <div className={`font-bold text-xl bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 hidden md:block'}`}>
                        Traffic CMD
                    </div>
                    {/* Desktop Toggle Button - Only show on md+ */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        {isOpen ? <ChevronRight size={20} className="rotate-180" /> : <ChevronRight size={20} />}
                    </button>
                    {/* Mobile Logo Fallback (when collapsed on bigger screens or hidden logic) - actually the text above handles it somewhat, but let's keep it simple */}
                </div>

                {/* Menu Items */}
                <div className="p-4 space-y-2">
                    {menuItems.map((item) => {
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setCurrentView(item.id);
                                    if (window.innerWidth < 768) setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group relative overflow-hidden
                  ${isActive
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }
                `}
                            >
                                {/* Icon */}
                                <div className={`transition-transform duration-300 shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                    {item.icon}
                                </div>

                                {/* Label (Hidden on collapsed) */}
                                <span className={`whitespace-nowrap font-medium transition-all duration-300 ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 w-0 overflow-hidden'}`}>
                                    {item.label}
                                </span>

                                {/* Active Indicator Line */}
                                {isActive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/30 rounded-r"></div>
                                )}

                                {/* Tooltip for collapsed mode */}
                                {!isOpen && (
                                    <div className="hidden md:block absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none border border-slate-700">
                                        {item.label}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                ></div>
            )}
        </>
    );
}
