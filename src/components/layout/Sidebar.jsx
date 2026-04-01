import { LayoutDashboard, AlertTriangle, CarFront, FileText, ChevronLeft, Menu, Route } from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen, currentView, setCurrentView }) {
  const navItems = [
    { id: 'dashboard', label: 'ภาพรวมทั้งหมด', icon: <LayoutDashboard size={20} /> },
    { id: 'traffic_jam', label: 'สถิติรถติดหนาแน่น', icon: <CarFront size={20} /> },
    { id: 'accident', label: 'สถิติอุบัติเหตุซ้ำซ้อน', icon: <AlertTriangle size={20} /> },
    { id: 'div8_accident', label: 'วิเคราะห์อุบัติเหตุ กก.8', icon: <FileText size={20} /> },
    { id: 'special_lane', label: 'วิเคราะห์ช่องทางพิเศษ', icon: <Route size={20} /> }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed lg:sticky top-0 left-0 h-screen bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 z-50 shadow-2xl ${isOpen ? 'w-64 translate-x-0' : 'w-16 -translate-x-full lg:translate-x-0'} `}>
        
        {/* Header */}
        <div className="flex bg-slate-950 items-center justify-between h-16 px-4 border-b border-white/5">
          <div className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 whitespace-nowrap overflow-hidden transition-all duration-300 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
            MENU
          </div>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {isOpen ? <ChevronLeft size={24} /> : <Menu size={24} className="mx-auto" />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 px-2">
          {navItems.map(item => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  if(window.innerWidth < 1024) setIsOpen(false); // Auto close on mobile
                }}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 group
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-400 border border-blue-500/30' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'}
                `}
                title={!isOpen ? item.label : ''}
              >
                <div className={`${isActive ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'group-hover:text-blue-300'} transition-all`}>
                  {item.icon}
                </div>
                
                <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden lg:block'}`}>
                  {item.label}
                </span>

                {/* Active Indicator Line */}
                {isActive && isOpen && (
                  <div className="ml-auto w-1.5 h-full rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mobile Toggle Button (Visible only when sidebar is closed on mobile) */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="lg:hidden fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg shadow-blue-500/30 z-40 transition-transform active:scale-95"
        >
          <Menu size={24} />
        </button>
      )}
    </>
  );
}
