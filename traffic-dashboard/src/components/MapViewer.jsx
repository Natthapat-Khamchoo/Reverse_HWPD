import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { DIVISION_COLORS, CATEGORY_COLORS } from '../constants/config';

const MapViewer = ({ data }) => {
  return (
    <MapContainer center={[13.75, 100.5]} zoom={6} style={{ height: '100%', width: '100%', background: '#0f172a' }}>
      
      {/* --- เริ่มต้นส่วนแก้ไข: Google Maps Traffic Layer --- */}
      <TileLayer
        // lyrs=m (Map), traffic (Traffic Layer)
        url="https://{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}"
        maxZoom={20}
        subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
        attribution='&copy; Google Maps'
      />
      {/* --- สิ้นสุดส่วนแก้ไข --- */}

      {data.map(item => (
        <CircleMarker 
          key={item.id} 
          center={[item.lat, item.lng]} 
          radius={6} 
          pathOptions={{ 
            color: '#fff', 
            fillColor: CATEGORY_COLORS[item.category] || CATEGORY_COLORS['ทั่วไป'], 
            fillOpacity: 0.9, 
            weight: 1.5 
          }}
        >
          <Popup className="digital-popup">
            <div className="font-sans text-sm min-w-[200px] text-slate-800">
              <strong className="block mb-2 text-base border-b border-slate-200 pb-1 flex items-center justify-between" style={{ color: DIVISION_COLORS[item.div] }}>
                <span>กก.{item.div} ส.ทล.{item.st}</span> <span className={`text-[10px] text-white px-2 py-0.5 rounded bg-slate-600`}>{item.time} น.</span>
              </strong>
              <div className="mb-2"><div className="text-xs font-bold text-slate-500 mb-1">{item.category}</div><div className="text-sm font-medium text-slate-800">{item.detail}</div></div>
              <div className="text-xs text-slate-500 pt-1 border-t border-slate-200 mt-1 flex justify-between items-center"><span className="flex items-center gap-1"><MapPin size={10}/> ทล.{item.road} กม.{item.km}</span><span className="font-bold">{item.dir}</span></div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
};

export default MapViewer;